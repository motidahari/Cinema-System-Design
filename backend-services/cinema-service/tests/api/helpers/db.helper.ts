import { DataSourceOptions, DataSource } from 'typeorm';
import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { SeatEntity } from '../../../src/domain/entities/seat.entity';
import { SeatDao } from '../../../src/seats/dao/seat.dao';
import { SeatsService } from '../../../src/seats/service/seats.service';
import { SeatsController } from '../../../src/seats/seats.controller';
import { SeatSeederService } from '../../../src/seed/seat-seeder.service';
import { RemoteAuthGuard } from '../../../src/infrastructure/guards/remote-auth.guard';
import { HttpExceptionFilter } from '../../../src/infrastructure/filters/http-exception.filter';

export const TEST_USER = { userId: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'tester@cinema.test' };

export type AuthMode = 'authenticated' | 'missing-token' | 'invalid-token';

/**
 * Mutable auth state read by the stubbed RemoteAuthGuard. Tests flip this to
 * exercise the happy path and each documented 401, without reaching out to
 * identity-service over HTTP.
 */
export const authState: { mode: AuthMode } = { mode: 'authenticated' };

class StubRemoteAuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        if (authState.mode === 'missing-token') throw new UnauthorizedException('Missing authentication');
        if (authState.mode === 'invalid-token') throw new UnauthorizedException('Invalid or expired token');
        (ctx.switchToHttp().getRequest() as { user: typeof TEST_USER }).user = TEST_USER;
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
        entities: [SeatEntity],
        synchronize: true,
    };
}

/**
 * Builds a Nest application with the seats stack wired to a real PostgreSQL test
 * DB. RemoteAuthGuard is replaced by a stub controlled via `authState`.
 */
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
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    return app;
}

/** Seeds the full 115-seat map (idempotent). */
export async function seedSeats(app: INestApplication): Promise<void> {
    await app.get(SeatSeederService).seedIfEmpty();
}

/** Removes all seats so each suite starts from a clean slate. */
export async function clearSeats(app: INestApplication): Promise<void> {
    const dataSource = app.get(DataSource);
    await dataSource.query(`DELETE FROM cinema.seats`);
}
