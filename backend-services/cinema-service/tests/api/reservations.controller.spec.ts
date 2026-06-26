/**
 * Reservations Controller — API Tests
 *
 * Covers API-CONTRACT.md §2:
 *   POST   /api/v1/reservations         201 + 400 (bad body) + 400 (not consecutive)
 *                                       + 404 (unknown seat) + 409 (unavailable) + 409 (active exists) + 401
 *   POST   /api/v1/reservations/:id/confirm  200 + 404 + 403 + 401
 *   DELETE /api/v1/reservations              204 (cancels all active) + 404 + 401
 *   GET    /api/v1/reservations               200 (active reservations)
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import {
    buildReservationsTestApp,
    seedSeats,
    clearAll,
    getSeatId,
    resetAuthState,
    authState,
} from './helpers/db.helper';

describe('ReservationsController (api)', () => {
    let app: INestApplication;

    const reserve = (seatIds: string[]) => request(app.getHttpServer()).post('/api/v1/reservations').send({ seatIds });

    beforeAll(async () => {
        app = await buildReservationsTestApp();
    });

    beforeEach(async () => {
        resetAuthState();
        await clearAll(app);
        await seedSeats(app);
    });

    afterAll(async () => {
        await clearAll(app);
        await app.close();
    });

    // ── reserve ───────────────────────────────────────────────────────────────
    describe('POST /api/v1/reservations, Given:Valid consecutive seats, When:Reserving', () => {
        it('should return 201 with a PENDING reservation', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            const res = await reserve(seatIds).expect(201);

            expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(res.body.status).toBe('PENDING');
            expect(res.body.seatIds.sort()).toEqual([...seatIds].sort());
            expect(res.body.expiresInSeconds).toBeGreaterThan(0);
            expect(typeof res.body.expiresAt).toBe('string');
        });
    });

    describe('POST /api/v1/reservations, Given:An invalid body, When:Reserving', () => {
        it('should return 400 for an empty seat list', async () => {
            await reserve([]).expect(400);
        });

        it('should return 400 for a non-UUID seat id', async () => {
            const res = await reserve(['not-a-uuid']).expect(400);
            expect(res.body.errorCode).toBe(400);
        });
    });

    describe('POST /api/v1/reservations, Given:Non-consecutive seats, When:Reserving', () => {
        it('should return 400', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A3')];
            const res = await reserve(seatIds).expect(400);
            expect(res.body.errorMessage).toContain('Gap detected');
        });
    });

    describe('POST /api/v1/reservations, Given:Selection would leave a seat isolated, When:Reserving', () => {
        it('should return 400', async () => {
            await reserve([await getSeatId(app, 'A1')]).expect(201);

            authState.userId = randomUUID();
            const seatIds = [await getSeatId(app, 'A3'), await getSeatId(app, 'A4')];
            const res = await reserve(seatIds).expect(400);
            expect(res.body.errorMessage).toContain('isolated');
        });
    });

    describe('POST /api/v1/reservations, Given:An unknown seat id, When:Reserving', () => {
        it('should return 404', async () => {
            await reserve([randomUUID()]).expect(404);
        });
    });

    describe('POST /api/v1/reservations, Given:A seat already reserved by another user, When:Reserving', () => {
        it('should return 409 unavailable', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            await reserve(seatIds).expect(201);

            authState.userId = randomUUID(); // a different user
            const res = await reserve(seatIds).expect(409);
            expect(res.body.errorMessage).toContain('not available');
        });
    });

    describe('POST /api/v1/reservations, Given:The user already holds an active reservation, When:Reserving again', () => {
        it('should return 409 active-exists', async () => {
            await reserve([await getSeatId(app, 'A1'), await getSeatId(app, 'A2')]).expect(201);

            const res = await reserve([await getSeatId(app, 'A4'), await getSeatId(app, 'A5')]).expect(409);
            expect(res.body.errorMessage).toContain('already have an active reservation');
        });
    });

    describe('POST /api/v1/reservations, Given:No token, When:Reserving', () => {
        it('should return 401', async () => {
            authState.mode = 'missing-token';
            await reserve([await getSeatId(app, 'A1')]).expect(401);
        });
    });

    // ── confirm ─────────────────────────────────────────────────────────────
    describe('POST /api/v1/reservations/:id/confirm', () => {
        it('Given:An owned PENDING reservation, should return 200 CONFIRMED', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            const { body } = await reserve(seatIds).expect(201);

            const res = await request(app.getHttpServer()).post(`/api/v1/reservations/${body.id}/confirm`).expect(200);
            expect(res.body.status).toBe('CONFIRMED');
        });

        it('Given:An unknown reservation, should return 404', async () => {
            await request(app.getHttpServer()).post(`/api/v1/reservations/${randomUUID()}/confirm`).expect(404);
        });

        it("Given:Another user's reservation, should return 403", async () => {
            const { body } = await reserve([await getSeatId(app, 'A1')]).expect(201);

            authState.userId = randomUUID();
            const res = await request(app.getHttpServer()).post(`/api/v1/reservations/${body.id}/confirm`).expect(403);
            expect(res.body.errorMessage).toContain('does not belong to you');
        });
    });

    // ── cancel ──────────────────────────────────────────────────────────────
    describe('DELETE /api/v1/reservations', () => {
        it('Given:An owned PENDING reservation, should return 204 and release the seats', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            await reserve(seatIds).expect(201);

            await request(app.getHttpServer()).delete('/api/v1/reservations').expect(204);

            // Seats are AVAILABLE again, so the same user can reserve them anew.
            await reserve(seatIds).expect(201);
        });

        it('Given:An owned CONFIRMED booking, should return 204 and free the booked seats', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            const { body } = await reserve(seatIds).expect(201);
            await request(app.getHttpServer()).post(`/api/v1/reservations/${body.id}/confirm`).expect(200);

            await request(app.getHttpServer()).delete('/api/v1/reservations').expect(204);

            // The booked seats are released, so they can be reserved again.
            await reserve(seatIds).expect(201);
        });

        it('Given:No active reservation, should return 404', async () => {
            await request(app.getHttpServer()).delete('/api/v1/reservations').expect(404);
        });
    });

    // ── my ────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/reservations', () => {
        it('should return the active reservations for the authenticated user', async () => {
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];
            await reserve(seatIds).expect(201);

            const res = await request(app.getHttpServer()).get('/api/v1/reservations').expect(200);
            expect(res.body.reservations).toHaveLength(1);
            expect(res.body.reservations[0].seatIds.sort()).toEqual([...seatIds].sort());
        });

        it('should return 401 without a token', async () => {
            authState.mode = 'missing-token';
            await request(app.getHttpServer()).get('/api/v1/reservations').expect(401);
        });
    });
});
