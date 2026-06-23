import { DataSourceOptions } from 'typeorm';
import { SeatEntity } from '../../../src/domain/entities/seat.entity';

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
        entities: [SeatEntity],
        synchronize: true,
    };
}
