import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// ── Required environment variables ────────────────────────
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];

function validateEnvironment() {
  const logger = new Logger('Bootstrap');
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    logger.error('Please check your .env file');
    process.exit(1);
  }

  // Warn if JWT secret is too short
  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    logger.warn(
      'JWT_SECRET is less than 32 characters. ' +
        'Use a longer secret in production.',
    );
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment before starting
  validateEnvironment();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 LegalFlow AI API running on port ${port}`);
  logger.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(
    `🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
  );
  logger.log(`🏥 Health check: http://localhost:${port}/api/health`);
}

bootstrap();
