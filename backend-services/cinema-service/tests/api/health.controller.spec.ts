import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule, TypeOrmHealthIndicator, HealthCheckError } from '@nestjs/terminus';
import { HealthController } from '../../../src/health/health.controller';
import { buildHealthTestApp, cinemaTestDataSourceOptions } from './helpers/db.helper';

describe('HealthController (api)', () => {
    describe('GET /api/v1/health, Given:A healthy database connection, When:Checking health', () => {
        let app: INestApplication;

        beforeAll(async () => {
            app = await buildHealthTestApp();
        });

        afterAll(async () => {
            await app.close();
        });

        it('should return 200 with status ok', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('GET /api/v1/health, Given:A failing database connection, When:Checking health', () => {
        let app: INestApplication;

        beforeAll(async () => {
            const moduleRef = await Test.createTestingModule({
                imports: [TypeOrmModule.forRoot(cinemaTestDataSourceOptions()), TerminusModule],
                controllers: [HealthController],
                providers: [
                    {
                        provide: TypeOrmHealthIndicator,
                        useValue: {
                            pingCheck: jest.fn().mockImplementation(() => {
                                throw new HealthCheckError('database', { database: { status: 'down' } });
                            }),
                        },
                    },
                ],
            }).compile();

            app = moduleRef.createNestApplication();
            await app.init();
        });

        afterAll(async () => {
            await app.close();
        });

        it('should return 503 with status error', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/health').expect(503);
            expect(res.body.status).toBe('error');
        });
    });
});
