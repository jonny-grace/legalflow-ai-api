import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogData {
  caseId: string;
  userId?: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}

export enum AuditAction {
  CASE_CREATED = 'CASE_CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ANALYSIS_GENERATED = 'ANALYSIS_GENERATED',
  ANALYSIS_REGENERATED = 'ANALYSIS_REGENERATED',
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Create audit log entry ─────────────────────────────────
  async create(data: CreateAuditLogData) {
    try {
      const log = await this.prisma.auditLog.create({
        data: {
          caseId: data.caseId,
          userId: data.userId ?? null,
          action: data.action,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Audit log created: ${data.action} for case ${data.caseId}`,
      );

      return log;
    } catch (error) {
      // Audit log failure should never break the main operation
      // Log the error but do not throw
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Get all logs for a case ────────────────────────────────
  async findByCaseId(caseId: string) {
    return this.prisma.auditLog.findMany({
      where: { caseId },
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
    });
  }
}
