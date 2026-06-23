import { DataSourceOptions } from 'typeorm';
import { DatabaseLogger } from '@cinema/shared';
import { SeatEntity } from '../../domain/entities/seat.entity';
import { AppConfig } from './app.config';

// Entities are registered per-domain as branches land (seats in B16, reservations in B17+).
export const createDataSourceOptions = (appConfig: AppConfig): DataSourceOptions => ({
    type: 'postgres',
    host: appConfig.dbHost,
    port: appConfig.dbPort,
    username: appConfig.dbUsername,
    password: appConfig.dbPassword,
    database: appConfig.dbName,
    schema: 'cinema',
    entities: [SeatEntity],
    synchronize: appConfig.isLocal,
    migrations: ['dist/migrations/*.js'],
    logger: new DatabaseLogger(),
    logging: ['query', 'error', 'warn', 'schema', 'migration'],
    extra: {
        max: 10,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 30_000,
    },
});
