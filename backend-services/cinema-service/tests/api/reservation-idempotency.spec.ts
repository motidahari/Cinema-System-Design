import request from 'supertest';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { buildReservationsTestApp, seedSeats, clearAll, getSeatId, resetAuthState } from './helpers/db.helper';

describe('ReservationsController (idempotency)', () => {
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

    describe('POST /api/v1/reservations, Given:Same Idempotency-Key and same body on retry, When:Reserving twice', () => {
        it('should return 201 both times with the same reservation id and only one reservation exists', async () => {
            const key = randomUUID();
            const seatIds = [await getSeatId(app, 'A1'), await getSeatId(app, 'A2')];

            const first = await request(app.getHttpServer())
                .post('/api/v1/reservations')
                .set('Idempotency-Key', key)
                .send({ seatIds })
                .expect(201);

            const second = await request(app.getHttpServer())
                .post('/api/v1/reservations')
                .set('Idempotency-Key', key)
                .send({ seatIds })
                .expect(201);

            expect(second.body.id).toBe(first.body.id);

            const res = await request(app.getHttpServer()).get('/api/v1/reservations').expect(200);
            expect(res.body.reservations).toHaveLength(1);
        });
    });

    describe('POST /api/v1/reservations, Given:Same Idempotency-Key but a different body on retry, When:Reserving', () => {
        it('should return 422', async () => {
            const key = randomUUID();
            const seatA = await getSeatId(app, 'A1');
            const seatB = await getSeatId(app, 'A2');
            const seatC = await getSeatId(app, 'A3');

            await request(app.getHttpServer())
                .post('/api/v1/reservations')
                .set('Idempotency-Key', key)
                .send({ seatIds: [seatA] })
                .expect(201);

            await request(app.getHttpServer())
                .post('/api/v1/reservations')
                .set('Idempotency-Key', key)
                .send({ seatIds: [seatB, seatC] })
                .expect(422);
        });
    });
});
