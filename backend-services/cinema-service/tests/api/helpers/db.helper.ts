import { DataSourceOptions, DataSource } from 'typeorm';
import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { SeatEntity } from '../../../src/domain/entities/seat.entity';
import { ReservationEntity } from '../../../src/domain/entities/reservation.entity';
import { ReservationSeatEntity } from '../../../src/domain/entities/reservation-seat.entity';
import { SeatDao } from '../../../src/seats/dao/seat.dao';
import { SeatsService } from '../../../src/seats/service/seats.service';
import { SeatsController } from '../../../src/seats/seats.controller';
import { SeatSeederService } from '../../../src/seed/seat-seeder.service';
import { ReservationDao } from '../../../src/reservations/dao/reservation.dao';
import { ReservationSeatDao } from '../../../src/reservations/dao/reservation-seat.dao';
import { ReservationsService } from '../../../src/reservations/service/reservations.service';
import { ReservationsController } from '../../../src/reservations/reservations.controller';
import { TransactionManager } from '@cinema/internal-sdk';
import { AppConfig } from '../../../src/infrastructure/config/app.config';
import { RemoteAuthGuard } from '../../../src/infrastructure/guards/remote-auth.guard';
import { HttpExceptionFilter } from '../../../src/infrastructure/filters/http-exception.filter';

export const TEST_USER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
export const TEST_USER = { userId: TEST_USER_ID, email: 'tester@cinema.test' };

export type AuthMode = 'authenticated' | 'missing-token' | 'invalid-token';

/**
 * Mutable auth state read by the stubbed RemoteAuthGuard. Tests flip `mode` to exercise
 * the documented 401s and set `userId` to act as a specific (or different) user — all
 * without reaching out to identity-service over HTTP.
 */
export const authState: { mode: AuthMode; userId: string } = { mode: 'authenticated', userId: TEST_USER_ID };

export function resetAuthState(): void {
    authState.mode = 'authenticated';
    authState.userId = TEST_USER_ID;
}

class StubRemoteAuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        if (authState.mode === 'missing-token') throw new UnauthorizedException('Missing authentication');
        if (authState.mode === 'invalid-token') throw new UnauthorizedException('Invalid or expired token');
        (ctx.switchToHttp().getRequest() as { user: { userId: string; email: string } }).user = {
            userId: authState.userId,
            email: 'tester@cinema.test',
        };
        return true;
    }
}

export function cinemaTestDataSourceOptions(): DataSourceOptions {
    return {
        type: 'postgres',
        host: process.env.TEST_DB_HOST ?? 'localhost',
        port: Number(process.env.TEST_DB_PORT ?? 5432),
        username: process.env.TEST_DB_USERNAME ?? 'cinema_user',
        password: process.env.TEST_DB_PASSWORD ?? 'cinema_pass',
        database: process.env.TEST_DB_NAME ?? 'cinema_db',
        schema: 'cinema',
        entities: [SeatEntity, ReservationEntity, ReservationSeatEntity],
        synchronize: true,
    };
}

function applyMiddleware(app: INestApplication): void {
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
}

/** Seats stack wired to the real test DB; RemoteAuthGuard replaced by a stub. */
export async function buildSeatsTestApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [TypeOrmModule.forRoot(cinemaTestDataSourceOptions()), TypeOrmModule.forFeature([SeatEntity])],
        controllers: [SeatsController],
        providers: [SeatDao, SeatsService, SeatSeederService],
    })
        .overrideGuard(RemoteAuthGuard)
        .useClass(StubRemoteAuthGuard)
        .compile();

    const app = moduleRef.createNestApplication();
    applyMiddleware(app);
    await app.init();
    return app;
}

/** Reservations stack wired to the real test DB; RemoteAuthGuard replaced by a stub. */
export async function buildReservationsTestApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [
            TypeOrmModule.forRoot(cinemaTestDataSourceOptions()),
            TypeOrmModule.forFeature([SeatEntity, ReservationEntity, ReservationSeatEntity]),
        ],
        controllers: [ReservationsController],
        providers: [
            SeatDao,
            SeatSeederService,
            ReservationDao,
            ReservationSeatDao,
            ReservationsService,
            TransactionManager,
            { provide: AppConfig, useValue: { reservationHoldMins: 15 } },
        ],
    })
        .overrideGuard(RemoteAuthGuard)
        .useClass(StubRemoteAuthGuard)
        .compile();

    const app = moduleRef.createNestApplication();
    applyMiddleware(app);
    await app.init();
    return app;
}

/** Seeds the full 115-seat map (idempotent). */
export async function seedSeats(app: INestApplication): Promise<void> {
    await app.get(SeatSeederService).seedIfEmpty();
}

/** Looks up a seat id by its `${row}${number}` label. */
export async function getSeatId(app: INestApplication, label: string): Promise<string> {
    const row = label[0];
    const number = Number(label.slice(1));
    const seat = await app.get(DataSource).getRepository(SeatEntity).findOneByOrFail({ row, number });
    return seat.id;
}

/** Removes all seats (seats app only). */
export async function clearSeats(app: INestApplication): Promise<void> {
    await app.get(DataSource).query(`DELETE FROM cinema.seats`);
}

/** FK-safe wipe of all cinema tables (reservations app). */
export async function clearAll(app: INestApplication): Promise<void> {
    const ds = app.get(DataSource);
    await ds.query(`DELETE FROM cinema.reservation_seats`);
    await ds.query(`DELETE FROM cinema.reservations`);
    await ds.query(`DELETE FROM cinema.seats`);
}
