import { DataSourceOptions } from 'typeorm';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../../src/domain/entities/user.entity';
import { RefreshTokenEntity } from '../../../src/domain/entities/refresh-token.entity';
import { LoginAttemptEntity } from '../../../src/domain/entities/login-attempt.entity';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/service/auth.service';
import { UserDao } from '../../../src/auth/dao/user.dao';
import { RefreshTokenDao } from '../../../src/auth/dao/refresh-token.dao';
import { LoginAttemptDao } from '../../../src/auth/dao/login-attempt.dao';
import { JwtStrategy } from '../../../src/infrastructure/guards/jwt.strategy';
import { JwtAuthGuard } from '../../../src/infrastructure/guards/jwt-auth.guard';
import { CsrfGuard } from '../../../src/infrastructure/guards/csrf.guard';
import { CookieService } from '../../../src/infrastructure/cookies/cookie.service';
import { AppConfig } from '../../../src/infrastructure/config/app.config';
import { HttpExceptionFilter } from '../../../src/infrastructure/filters/http-exception.filter';
import { APP_GUARD } from '@nestjs/core';

export const TEST_JWT_SECRET = 'test-identity-jwt-secret-minimum-32-chars!!';

/** DataSource options used for both the API-test and the integration-test suites. */
export function identityTestDataSourceOptions(): DataSourceOptions {
    return {
        type: 'postgres',
        host: process.env.TEST_DB_HOST ?? 'localhost',
        port: Number(process.env.TEST_DB_PORT ?? 5432),
        username: process.env.TEST_DB_USERNAME ?? 'cinema_user',
        password: process.env.TEST_DB_PASSWORD ?? 'cinema_pass',
        database: process.env.TEST_DB_NAME ?? 'cinema_db',
        schema: 'identity',
        entities: [UserEntity, RefreshTokenEntity, LoginAttemptEntity],
        synchronize: true,
    };
}

/**
 * A concrete AppConfig instance for tests that bypasses ConfigModule/Zod validation.
 * JwtStrategy and CookieService both inject AppConfig, so we must provide it.
 */
function buildTestAppConfig(): AppConfig {
    // AppConfig reads from ConfigService in its constructor.
    // We mock it by constructing a plain object that satisfies the interface.
    const cfg = Object.create(AppConfig.prototype) as AppConfig;
    Object.assign(cfg, {
        port: 3001,
        nodeEnv: 'local',
        isLocal: true,
        isSandbox: false,
        isProduction: false,
        dbHost: process.env.TEST_DB_HOST ?? 'localhost',
        dbPort: Number(process.env.TEST_DB_PORT ?? 5432),
        dbUsername: process.env.TEST_DB_USERNAME ?? 'cinema_user',
        dbPassword: process.env.TEST_DB_PASSWORD ?? 'cinema_pass',
        dbName: process.env.TEST_DB_NAME ?? 'cinema_db',
        jwtSecret: TEST_JWT_SECRET,
        accessTokenTtl: '15m',
        refreshTokenTtl: '7d',
        cookieDomain: undefined,
        cookieSecure: false,
        cookieSameSite: 'lax' as const,
        loginLockThreshold: 5,
        loginLockWindowMin: 15,
        corsOrigins: 'http://localhost:5173',
    });
    return cfg;
}

/**
 * Builds a full Nest application with:
 *   - Real PostgreSQL test DB (TypeORM synchronize)
 *   - All production middleware: cookie-parser, ValidationPipe, HttpExceptionFilter
 *   - CSRF guard wired as APP_GUARD (same as production)
 *   - ThrottlerModule disabled for tests (limit=10000 to avoid rate-limiting)
 */
export async function buildAuthTestApp(): Promise<INestApplication> {
    const testAppConfig = buildTestAppConfig();

    const module = await Test.createTestingModule({
        imports: [
            ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
            TypeOrmModule.forRoot(identityTestDataSourceOptions()),
            TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, LoginAttemptEntity]),
            PassportModule,
            JwtModule.register({
                secret: TEST_JWT_SECRET,
                signOptions: { expiresIn: '15m' },
            }),
        ],
        controllers: [AuthController],
        providers: [
            AuthService,
            UserDao,
            RefreshTokenDao,
            LoginAttemptDao,
            JwtAuthGuard,
            CookieService,
            { provide: AppConfig, useValue: testAppConfig },
            // JwtStrategy needs AppConfig — but it calls super() in its constructor,
            // so we must let NestJS build it via DI after providing AppConfig.
            JwtStrategy,
            { provide: APP_GUARD, useClass: CsrfGuard },
        ],
    }).compile();

    const app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    return app;
}

/**
 * Cleans identity tables between tests.
 * Pass `runPattern` (e.g. `'%-abc123@cinema.test'`) to scope deletes to a single
 * test-file run and avoid clobbering rows written by parallel test workers.
 * Omit it only when you intentionally want a full wipe.
 */
export async function truncateIdentityTables(app: INestApplication, runPattern?: string): Promise<void> {
    const ds = app.get(DataSource);
    if (runPattern) {
        await ds.query(`DELETE FROM identity.login_attempts WHERE email LIKE $1`, [runPattern]);
        await ds.query(
            `DELETE FROM identity.refresh_tokens WHERE user_id IN (SELECT id FROM identity.users WHERE email LIKE $1)`,
            [runPattern]
        );
        await ds.query(`DELETE FROM identity.users WHERE email LIKE $1`, [runPattern]);
    } else {
        await ds.query(`DELETE FROM identity.login_attempts`);
        await ds.query(`DELETE FROM identity.refresh_tokens`);
        await ds.query(`DELETE FROM identity.users`);
    }
}
