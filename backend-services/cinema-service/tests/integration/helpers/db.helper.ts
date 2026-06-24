import { DataSource, DataSourceOptions, QueryRunner } from 'typeorm';
import { SeatEntity } from '../../../src/domain/entities/seat.entity';
import { ReservationEntity } from '../../../src/domain/entities/reservation.entity';
import { ReservationSeatEntity } from '../../../src/domain/entities/reservation-seat.entity';
import { IdempotencyKeyEntity } from '../../../src/domain/entities/idempotency-key.entity';

/** DataSource options for the cinema-service integration-test suite. */
export function cinemaTestDataSourceOptions(): DataSourceOptions {
    return {
        type: 'postgres',
        host: process.env.TEST_DB_HOST ?? 'localhost',
        port: Number(process.env.TEST_DB_PORT ?? 5432),
        username: process.env.TEST_DB_USERNAME ?? 'cinema_user',
        password: process.env.TEST_DB_PASSWORD ?? 'cinema_pass',
        database: process.env.TEST_DB_NAME ?? 'cinema_db',
        schema: 'cinema',
        entities: [SeatEntity, ReservationEntity, ReservationSeatEntity, IdempotencyKeyEntity],
        synchronize: true,
    };
}

/** Deletes all cinema rows in FK-safe order (join → reservations → seats → idempotency). */
export async function clearCinemaTables(dataSource: DataSource): Promise<void> {
    await dataSource.query(`DELETE FROM cinema.reservation_seats`);
    await dataSource.query(`DELETE FROM cinema.reservations`);
    await dataSource.query(`DELETE FROM cinema.seats`);
    await dataSource.query(`DELETE FROM cinema.idempotency_keys`);
}

/** Inserts seats and returns their generated ids keyed by `${row}${number}`. */
export async function seedSeats(
    dataSource: DataSource,
    seats: Array<{ row: string; number: number }>
): Promise<Map<string, string>> {
    const repo = dataSource.getRepository(SeatEntity);
    const saved = await repo.save(seats.map((s) => repo.create(s)));
    return new Map(saved.map((s) => [`${s.row}${s.number}`, s.id]));
}

/** Runs `work` inside a committed transaction — for exercising QueryRunner-based DAO methods. */
export async function inTransaction<T>(dataSource: DataSource, work: (qr: QueryRunner) => Promise<T>): Promise<T> {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
        const result = await work(qr);
        await qr.commitTransaction();
        return result;
    } catch (err) {
        await qr.rollbackTransaction();
        throw err;
    } finally {
        await qr.release();
    }
}
