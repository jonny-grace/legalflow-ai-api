import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditLogsService,
  AuditAction,
} from '../audit-logs/audit-logs.service';
import { AiService } from '../ai/ai.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly aiService: AiService,
  ) {}

  // ── Create a new case intake ───────────────────────────────
  async create(dto: CreateCaseDto) {
    this.logger.log(`Creating new case for: ${dto.email}`);

    // Save the case to database first
    // We save before AI analysis so the case is never lost
    // even if AI fails
    const newCase = await this.prisma.case.create({
      data: {
        clientName: dto.clientName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() ?? null,
        description: dto.description.trim(),
      },
    });

    // Create audit log for case creation
    await this.auditLogsService.create({
      caseId: newCase.id,
      userId: undefined,
      action: AuditAction.CASE_CREATED,
      metadata: {
        clientEmail: dto.email,
        submittedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Case saved: ${newCase.id}. Triggering AI analysis...`);

    // Trigger AI analysis
    // We run this after saving the case
    // If AI fails, the case still exists — we just won't have analysis yet
    let aiAnalysis = null;

    try {
      aiAnalysis = await this.aiService.analyzeCase(newCase.id);
    } catch (error) {
      // AI failure does NOT fail the intake submission
      // The case is already saved — client gets confirmation
      // Staff will see the case without AI analysis
      this.logger.error(
        `AI analysis failed for case ${newCase.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Case saved successfully without analysis.`,
      );
    }

    // Return case with analysis if available
    return {
      ...newCase,
      aiAnalysis,
    };
  }

  // ── Get paginated case list with filters ───────────────────
  async findAll(query: QueryCasesDto) {
    const { page = 1, limit = 20, status, priority, caseType, search } = query;

    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: Prisma.CaseWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          clientName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (priority || caseType) {
      where.aiAnalysis = {};

      if (priority) {
        where.aiAnalysis.priority = priority;
      }

      if (caseType) {
        where.aiAnalysis.caseType = {
          contains: caseType,
          mode: 'insensitive',
        };
      }
    }

    // Run count and data queries in parallel
    const [total, cases] = await Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          aiAnalysis: {
            select: {
              caseType: true,
              priority: true,
              summary: true,
              confidenceScore: true,
            },
          },
        },
      }),
    ]);

    return {
      data: cases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get single case with full details ──────────────────────
  async findOne(id: string) {
    const foundCase = await this.prisma.case.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!foundCase) {
      throw new NotFoundException(`Case with ID ${id} was not found`);
    }

    return foundCase;
  }

  // ── Update case status ─────────────────────────────────────
  async updateStatus(id: string, dto: UpdateStatusDto, userId: string) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingCase) {
      throw new NotFoundException(`Case with ID ${id} was not found`);
    }

    const previousStatus = existingCase.status;
    const newStatus = dto.status;

    const updatedCase = await this.prisma.case.update({
      where: { id },
      data: {
        status: newStatus,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.auditLogsService.create({
      caseId: id,
      userId,
      action: AuditAction.STATUS_CHANGED,
      metadata: {
        previousStatus,
        newStatus,
      },
    });

    this.logger.log(
      `Case ${id} status changed: ${previousStatus} → ${newStatus} by user ${userId}`,
    );

    return updatedCase;
  }

  // ── Get dashboard metrics ──────────────────────────────────
  async getMetrics() {
    const [
      totalCases,
      newCases,
      reviewingCases,
      contactedCases,
      closedCases,
      highPriorityCases,
      caseTypeBreakdown,
    ] = await Promise.all([
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: 'NEW' } }),
      this.prisma.case.count({ where: { status: 'REVIEWING' } }),
      this.prisma.case.count({ where: { status: 'CONTACTED' } }),
      this.prisma.case.count({ where: { status: 'CLOSED' } }),
      this.prisma.case.count({
        where: {
          aiAnalysis: {
            priority: 'HIGH',
          },
        },
      }),
      this.prisma.aiAnalysis.groupBy({
        by: ['caseType'],
        _count: {
          caseType: true,
        },
        orderBy: {
          _count: {
            caseType: 'desc',
          },
        },
      }),
    ]);

    const byCaseType = caseTypeBreakdown.reduce(
      (acc, item) => {
        acc[item.caseType] = item._count.caseType;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalCases,
      newCases,
      highPriorityCases,
      closedCases,
      byStatus: {
        NEW: newCases,
        REVIEWING: reviewingCases,
        CONTACTED: contactedCases,
        CLOSED: closedCases,
      },
      byCaseType,
    };
  }
}
