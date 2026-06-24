import request from 'supertest';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SeatEntity } from '../../src/domain/entities/seat.entity';
import { buildReservationsTestApp, seedSeats, clearAll, getSeatId, resetAuthState } from './helpers/db.helper';

describe('ReservationsController (concurrency)', () => {
    let app: INestApplication;

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

    describe('POST /api/v1/reservations, Given:N concurrent requests for the same seat, When:All arrive simultaneously', () => {
        it('should allow exactly 1 reservation and return 409 for the rest', async () => {
            const N = 10;
            const seatId = await getSeatId(app, 'A1');

            const responses = await Promise.all(
                Array.from({ length: N }, () =>
                    request(app.getHttpServer())
                        .post('/api/v1/reservations')
                        .set('Idempotency-Key', randomUUID())
                        .send({ seatIds: [seatId] })
                )
            );

            const statuses = responses.map((r) => r.status);
            const created = statuses.filter((s) => s === 201);
            const conflicts = statuses.filter((s) => s === 409);
            const unexpected = statuses.filter((s) => s !== 201 && s !== 409);

            expect(created).toHaveLength(1);
            expect(conflicts).toHaveLength(N - 1);
            expect(unexpected).toHaveLength(0);

            const ds = app.get(DataSource);
            const seat = await ds.getRepository(SeatEntity).findOneByOrFail({ row: 'A', number: 1 });
            const [{ count }] = await ds.query<[{ count: string }]>(
                `SELECT COUNT(*) AS count FROM cinema.reservation_seats rs
                 JOIN cinema.reservations r ON r.id = rs.reservation_id
                 WHERE rs.seat_id = $1 AND r.status IN ('PENDING', 'CONFIRMED')`,
                [seat.id]
            );
            expect(Number(count)).toBe(1);
        });
    });
});
