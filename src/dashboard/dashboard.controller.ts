import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ── GET /api/dashboard/metrics ─────────────────────────────
  // PROTECTED - Requires JWT
  // Returns aggregate statistics for dashboard overview
  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
