import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/configuration';
import * as dns from 'dns';
// Use public DNS resolvers for SRV lookups (mongodb+srv://).
// Some routers refuse SRV queries, causing querySrv ECONNREFUSED.
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const { port, corsOrigins } = configService.getOrThrow<AppConfig>('app');

  // Every route lives under /api/v1, matching the paths the client already calls.
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      // Drop properties that no DTO declares, so a client cannot smuggle in `role`.
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);

  new Logger('Bootstrap').log(`Server running on http://localhost:${port}/api/v1`);
}

void bootstrap();
