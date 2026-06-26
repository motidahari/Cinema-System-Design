import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './infrastructure/config/app.config';
import { SeatSeederService } from './seed/seat-seeder.service';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './infrastructure/interceptors/http-logging.interceptor';
import { RedisIoAdapter } from './gateway/redis-io.adapter';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.use(helmet());
    app.use(cookieParser());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    const appConfig = app.get(AppConfig);
    const corsOrigins = appConfig.corsOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    app.enableCors({ origin: corsOrigins, credentials: true });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableShutdownHooks();

    // Horizontal scaling (ADR-10): when REDIS_URL is set, fan Socket.io broadcasts across
    // replicas via the Redis adapter. Single-instance local runs leave it unset and keep
    // the default in-memory adapter.
    if (appConfig.redisUrl) {
        const redisIoAdapter = new RedisIoAdapter(app, appConfig.redisUrl);
        await redisIoAdapter.connectToRedis();
        app.useWebSocketAdapter(redisIoAdapter);
    }

    const seeder = app.get(SeatSeederService);
    await seeder.seedIfEmpty();

    await app.listen(appConfig.port);
}

bootstrap();
