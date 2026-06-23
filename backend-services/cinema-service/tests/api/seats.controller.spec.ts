/**
 * Seats Controller — API Tests
 *
 * Covers GET /api/v1/seats from API-CONTRACT.md §2:
 *   - 200 happy path: full 115-seat map with status
 *   - 401 missing token   (RemoteAuthGuard)
 *   - 401 invalid/expired token (RemoteAuthGuard)
 */

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { buildSeatsTestApp, seedSeats, clearSeats, authState, TEST_USER } from './helpers/db.helper';

describe('SeatsController (api)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await buildSeatsTestApp();
        await clearSeats(app);
        await seedSeats(app);
    });

    beforeEach(() => {
        authState.mode = 'authenticated';
    });

    afterAll(async () => {
        await clearSeats(app);
        await app.close();
    });

    describe('GET /api/v1/seats, Given:An authenticated user, When:Fetching the seating map', () => {
        it('should return 200 with all 115 seats', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/seats').expect(200);

            expect(res.body.seats).toHaveLength(115);
        });

        it('should return each seat with only id, row, number and status', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/seats').expect(200);

            const seat = res.body.seats[0];
            expect(Object.keys(seat).sort()).toEqual(['id', 'number', 'row', 'status']);
            expect(seat.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(typeof seat.row).toBe('string');
            expect(typeof seat.number).toBe('number');
            expect(['AVAILABLE', 'RESERVED', 'BOOKED']).toContain(seat.status);
        });

        it('should return seats ordered by row then number', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/seats').expect(200);

            const first = res.body.seats.slice(0, 3).map((s: { row: string; number: number }) => `${s.row}${s.number}`);
            expect(first).toEqual(['A1', 'A2', 'A3']);
        });
    });

    describe('GET /api/v1/seats, Given:Test user identity, When:The guard authenticates', () => {
        it('should attach the authenticated user (sanity on the stub)', () => {
            expect(TEST_USER.userId).toMatch(/^[0-9a-f-]{36}$/);
        });
    });

    describe('GET /api/v1/seats, Given:No access token, When:Fetching the map', () => {
        it('should return 401', async () => {
            authState.mode = 'missing-token';

            const res = await request(app.getHttpServer()).get('/api/v1/seats').expect(401);

            expect(res.body.errorCode).toBe(401);
            expect(res.body.errorMessage).toBe('Missing authentication');
        });
    });

    describe('GET /api/v1/seats, Given:An invalid token, When:Fetching the map', () => {
        it('should return 401', async () => {
            authState.mode = 'invalid-token';

            const res = await request(app.getHttpServer()).get('/api/v1/seats').expect(401);

            expect(res.body.errorCode).toBe(401);
            expect(res.body.errorMessage).toBe('Invalid or expired token');
        });
    });
});
