import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CasesModule } from '../cases/cases.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // CasesModule provides CasesService for metrics
    CasesModule,
    // AuthModule provides guards
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
