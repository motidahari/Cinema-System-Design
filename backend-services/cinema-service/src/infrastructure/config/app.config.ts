import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
    readonly port: number;
    readonly nodeEnv: string;
    readonly isLocal: boolean;
    readonly isSandbox: boolean;
    readonly isProduction: boolean;
    readonly dbHost: string;
    readonly dbPort: number;
    readonly dbUsername: string;
    readonly dbPassword: string;
    readonly dbName: string;
    readonly identityServiceUrl: string;
    readonly corsOrigins: string;
    readonly socketCorsOrigins: string;
    readonly reservationHoldMins: number;
    readonly cookieDomain?: string;
    readonly cookieSecure: boolean;
    readonly cookieSameSite: 'lax' | 'strict' | 'none';
    readonly idempotencyTtlHours: number;
    readonly redisUrl?: string;

    constructor(configService: ConfigService) {
        this.port = configService.get<number>('PORT')!;
        this.nodeEnv = configService.get<string>('NODE_ENV')!;
        this.isLocal = this.nodeEnv === 'local';
        this.isSandbox = this.nodeEnv === 'sandbox';
        this.isProduction = this.nodeEnv === 'production';
        this.dbHost = configService.get<string>('DB_HOST')!;
        this.dbPort = configService.get<number>('DB_PORT')!;
        this.dbUsername = configService.get<string>('DB_USERNAME')!;
        this.dbPassword = configService.get<string>('DB_PASSWORD')!;
        this.dbName = configService.get<string>('DB_NAME')!;
        this.identityServiceUrl = configService.get<string>('IDENTITY_SERVICE_URL')!;
        this.corsOrigins = configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173';
        this.socketCorsOrigins = configService.get<string>('SOCKET_CORS_ORIGINS') ?? 'http://localhost:5173';
        this.reservationHoldMins = configService.get<number>('RESERVATION_HOLD_MINS') ?? 15;
        this.cookieDomain = configService.get<string>('COOKIE_DOMAIN') || undefined;
        this.cookieSecure = configService.get<boolean>('COOKIE_SECURE') ?? false;
        this.cookieSameSite = configService.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE') ?? 'lax';
        this.idempotencyTtlHours = configService.get<number>('IDEMPOTENCY_TTL_HOURS') ?? 24;
        this.redisUrl = configService.get<string>('REDIS_URL') || undefined;
    }
}
