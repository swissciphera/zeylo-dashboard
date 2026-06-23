import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // API lives under /api (frontend nginx proxies /api -> backend)
  app.setGlobalPrefix('api');

  app.use(
    helmet({
      // Allow inline file preview (PDF/image) to be served from the API origin
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.BACKEND_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Zeylo API running on port ${port}`, 'Bootstrap');
}

bootstrap();
