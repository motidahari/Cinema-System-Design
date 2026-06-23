import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './infrastructure/config/app.config';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './infrastructure/interceptors/http-logging.interceptor';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:'],
                    connectSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                },
            },
            crossOriginEmbedderPolicy: false,
        })
    );
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
    await app.listen(appConfig.port);
}

bootstrap();
