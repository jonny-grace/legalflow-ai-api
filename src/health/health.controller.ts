import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    // Test database connection
    let databaseStatus = 'healthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'unhealthy';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      services: {
        database: databaseStatus,
        api: 'healthy',
      },
    };
  }
}
