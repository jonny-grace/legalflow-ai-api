import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditLogsService,
  AuditAction,
} from '../audit-logs/audit-logs.service';
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
  ) {}

  // ── Create a new case intake ───────────────────────────────
  async create(dto: CreateCaseDto) {
    this.logger.log(`Creating new case for: ${dto.email}`);

    // Save the case to database
    const newCase = await this.prisma.case.create({
      data: {
        clientName: dto.clientName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() ?? null,
        description: dto.description.trim(),
      },
    });

    // Create audit log entry
    // userId is null because no staff member is logged in
    // This action is performed by the public client
    await this.auditLogsService.create({
      caseId: newCase.id,
      userId: undefined,
      action: AuditAction.CASE_CREATED,
      metadata: {
        clientEmail: dto.email,
        submittedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Case created successfully: ${newCase.id}`);

    return newCase;
  }

  // ── Get paginated case list with filters ───────────────────
  async findAll(query: QueryCasesDto) {
    const { page = 1, limit = 20, status, priority, caseType, search } = query;

    const skip = (page - 1) * limit;

    // Build dynamic where clause
    // Only add filters that were actually provided
    const where: Prisma.CaseWhereInput = {};

    // Status filter
    if (status) {
      where.status = status;
    }

    // Search by name or email
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

    // Priority and caseType filters go through the
    // related AiAnalysis table
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

    // Run count and data queries in parallel for performance
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
          // Include only the fields we need for the list view
          // Not the full description or audit logs
          aiAnalysis: {
            select: {
              caseType: true,
              priority: true,
              summary: true,
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
        // Full AI analysis
        aiAnalysis: true,
        // Full audit log with user details
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
    // First verify the case exists
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

    // Update the case status
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

    // Create audit log with status transition details
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
    // Run all count queries in parallel
    const [
      totalCases,
      newCases,
      reviewingCases,
      contactedCases,
      closedCases,
      highPriorityCases,
      caseTypeBreakdown,
    ] = await Promise.all([
      // Total cases
      this.prisma.case.count(),

      // By status
      this.prisma.case.count({ where: { status: 'NEW' } }),
      this.prisma.case.count({ where: { status: 'REVIEWING' } }),
      this.prisma.case.count({ where: { status: 'CONTACTED' } }),
      this.prisma.case.count({ where: { status: 'CLOSED' } }),

      // High priority
      this.prisma.case.count({
        where: {
          aiAnalysis: {
            priority: 'HIGH',
          },
        },
      }),

      // Case type breakdown via AI analysis
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

    // Format case type breakdown into a clean object
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
