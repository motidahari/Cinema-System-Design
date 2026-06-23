import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { z } from 'zod';
import { AppConfigModule } from './infrastructure/config/app-config.module';
import { AppConfig } from './infrastructure/config/app.config';
import { createDataSourceOptions } from './infrastructure/config/typeorm.config';
import { RequestIdMiddleware } from './infrastructure/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

const envSchema = z.object({
    PORT: z.coerce.number().default(3002),
    NODE_ENV: z.enum(['local', 'sandbox', 'production']).default('local'),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(5432),
    DB_USERNAME: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    IDENTITY_SERVICE_URL: z.string().url(),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    SOCKET_CORS_ORIGINS: z.string().default('http://localhost:5173'),
    RESERVATION_HOLD_MINS: z.coerce.number().default(15),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: z.coerce.boolean().default(false),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    REDIS_URL: z.string().url().optional(),
    IDEMPOTENCY_TTL_HOURS: z.coerce.number().default(24),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: (c) => envSchema.parse(c) }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        AppConfigModule,
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            useFactory: (cfg: AppConfig) => createDataSourceOptions(cfg),
            inject: [AppConfig],
        }),
        HealthModule,
        MetricsModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestIdMiddleware).forRoutes('*');
    }
}
