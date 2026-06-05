import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ── POST /api/ai/analyze/:caseId ───────────────────────────
  // PROTECTED - ADMIN only
  // Re-runs AI analysis on an existing case
  // Useful when case description is updated or
  // when staff wants a fresh assessment
  @Post('analyze/:caseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reAnalyze(
    @Param('caseId') caseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiService.analyzeCase(caseId, user.sub);
  }

  // ── GET /api/ai/analysis/:caseId ───────────────────────────
  // PROTECTED - ADMIN and REVIEWER
  // Gets the current AI analysis for a case
  @Get('analysis/:caseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async getAnalysis(@Param('caseId') caseId: string) {
    return this.aiService.getAnalysisByCaseId(caseId);
  }
}
