import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // AuditLogsModule provides AuditLogsService
    AuditLogsModule,
    // AuthModule provides guards
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService, GeminiService],
  // Export AiService so CasesModule can trigger analysis
  exports: [AiService],
})
export class AiModule {}
