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
    readonly jwtSecret: string;
    readonly accessTokenTtl: string;
    readonly refreshTokenTtl: string;
    readonly cookieDomain?: string;
    readonly cookieSecure: boolean;
    readonly cookieSameSite: 'lax' | 'strict' | 'none';
    readonly loginLockThreshold: number;
    readonly loginLockWindowMin: number;
    readonly corsOrigins: string;

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
        this.jwtSecret = configService.get<string>('JWT_SECRET')!;
        this.accessTokenTtl = configService.get<string>('ACCESS_TOKEN_TTL') ?? '15m';
        this.refreshTokenTtl = configService.get<string>('REFRESH_TOKEN_TTL') ?? '7d';
        this.cookieDomain = configService.get<string>('COOKIE_DOMAIN') || undefined;
        this.cookieSecure = configService.get<boolean>('COOKIE_SECURE') ?? false;
        this.cookieSameSite = configService.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE') ?? 'lax';
        this.loginLockThreshold = configService.get<number>('LOGIN_LOCK_THRESHOLD') ?? 5;
        this.loginLockWindowMin = configService.get<number>('LOGIN_LOCK_WINDOW_MIN') ?? 15;
        this.corsOrigins = configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173';
    }
}
