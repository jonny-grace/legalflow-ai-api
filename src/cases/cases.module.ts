import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // AuditLogsModule provides AuditLogsService
    AuditLogsModule,
    // AuthModule provides JwtAuthGuard and RolesGuard
    AuthModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  // Export CasesService so DashboardModule can use it
  exports: [CasesService],
})
export class CasesModule {}
