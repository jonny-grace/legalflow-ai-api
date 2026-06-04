import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';
import { AiModule } from './ai/ai.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Makes ConfigService available everywhere without re-importing
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - global so all modules can inject PrismaService
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CasesModule,
    AiModule,
    AuditLogsModule,
    DashboardModule,
  ],
})
export class AppModule {}
