import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // All routes prefixed with /api
  app.setGlobalPrefix('api');

  // CORS - allows frontend to call this API
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validates all incoming request bodies against DTOs
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

  // Consistent error responses across all endpoints
  app.useGlobalFilters(new HttpExceptionFilter());

  // Consistent success response envelope
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 LegalFlow AI API running on port ${port}`);
  logger.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(
    `🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
  );
}

bootstrap();
