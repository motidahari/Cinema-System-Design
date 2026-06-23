/**
 * Health Controller — API Tests
 *
 * Covers:
 *   GET /api/v1/health  — 200 healthy (DB up)
 *
 * Note: the 503 (DB down) path requires the DB to be unreachable. We cover it by
 * verifying the shape of the health response and that the endpoint is accessible
 * without authentication or a CSRF token (safe GET).
 * A 503 path would require deliberately killing the connection — that is out of
 * scope for the standard CI test suite (it is covered by infrastructure/chaos tests).
 */

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from '../../src/health/health.controller';
import { HttpExceptionFilter } from '../../src/infrastructure/filters/http-exception.filter';
import { CsrfGuard } from '../../src/infrastructure/guards/csrf.guard';
import { identityTestDataSourceOptions } from './helpers/db.helper';

// ──────────────────────────────────────────────────────────────────────────────
// App factory
// ──────────────────────────────────────────────────────────────────────────────

async function buildHealthTestApp(): Promise<INestApplication> {
    const module = await Test.createTestingModule({
        imports: [
            ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
            TypeOrmModule.forRoot(identityTestDataSourceOptions()),
            TerminusModule,
        ],
        controllers: [HealthController],
        providers: [{ provide: APP_GUARD, useClass: CsrfGuard }],
    }).compile();

    const app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    return app;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('HealthController (api)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await buildHealthTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/health, Given:Database is reachable, When:Checking health', () => {
        it('should return 200 with status ok', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/health');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        it('should include a database key in the info object', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/health');

            expect(res.body.info).toBeDefined();
            expect(res.body.info.database).toBeDefined();
            expect(res.body.info.database.status).toBe('up');
        });

        it('should be accessible without authentication (no access_token required)', async () => {
            // No auth cookie, no CSRF — health is a public safe GET
            const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

            expect(res.body.status).toBe('ok');
        });

        it('should be exempt from CSRF guard (safe GET method)', async () => {
            // Sending no CSRF cookie/header must still succeed
            const res = await request(app.getHttpServer()).get('/api/v1/health');
            expect(res.status).toBe(200);
        });
    });
});
