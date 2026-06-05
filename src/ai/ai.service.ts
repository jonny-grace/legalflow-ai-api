import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import {
  AuditLogsService,
  AuditAction,
} from '../audit-logs/audit-logs.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Analyze a case and save result ────────────────────────
  // Called automatically after case creation
  // Also called when staff re-runs analysis
  async analyzeCase(caseId: string, triggeredByUserId?: string) {
    this.logger.log(`Starting analysis for case: ${caseId}`);

    // Fetch the case
    const foundCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        clientName: true,
        description: true,
      },
    });

    if (!foundCase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    // Check if analysis already exists
    const existingAnalysis = await this.prisma.aiAnalysis.findUnique({
      where: { caseId },
    });

    const isRegeneration = !!existingAnalysis;

    // Call Gemini for analysis
    let analysisResult;

    try {
      analysisResult = await this.geminiService.analyzeLegalCase(
        foundCase.description,
        foundCase.clientName,
      );
    } catch (error) {
      this.logger.error(
        `AI analysis failed for case ${caseId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      // Re-throw so the caller can handle appropriately
      throw error;
    }

    // Save or update the analysis
    // upsert: create if not exists, update if exists
    const savedAnalysis = await this.prisma.aiAnalysis.upsert({
      where: { caseId },
      create: {
        caseId,
        caseType: analysisResult.caseType,
        priority: analysisResult.priority,
        summary: analysisResult.summary,
        missingInformation: analysisResult.missingInformation,
        recommendedAction: analysisResult.recommendedAction,
        confidenceScore: analysisResult.confidenceScore,
      },
      update: {
        caseType: analysisResult.caseType,
        priority: analysisResult.priority,
        summary: analysisResult.summary,
        missingInformation: analysisResult.missingInformation,
        recommendedAction: analysisResult.recommendedAction,
        confidenceScore: analysisResult.confidenceScore,
        // Note: createdAt stays the same, only data updates
      },
    });

    // Create appropriate audit log
    const auditAction = isRegeneration
      ? AuditAction.ANALYSIS_REGENERATED
      : AuditAction.ANALYSIS_GENERATED;

    await this.auditLogsService.create({
      caseId,
      userId: triggeredByUserId,
      action: auditAction,
      metadata: {
        caseType: analysisResult.caseType,
        priority: analysisResult.priority,
        confidenceScore: analysisResult.confidenceScore,
        isRegeneration,
      },
    });

    this.logger.log(
      `Analysis ${isRegeneration ? 'regenerated' : 'generated'} ` +
        `for case ${caseId}: ${analysisResult.caseType} | ${analysisResult.priority}`,
    );

    return savedAnalysis;
  }

  // ── Get analysis for a case ────────────────────────────────
  async getAnalysisByCaseId(caseId: string) {
    const analysis = await this.prisma.aiAnalysis.findUnique({
      where: { caseId },
    });

    if (!analysis) {
      throw new NotFoundException(`No AI analysis found for case ${caseId}`);
    }

    return analysis;
  }
}
