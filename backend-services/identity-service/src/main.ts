import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './infrastructure/config/app.config';

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

    app.enableShutdownHooks();
    await app.listen(appConfig.port);
}

bootstrap();
