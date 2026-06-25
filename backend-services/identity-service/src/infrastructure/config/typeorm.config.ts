import { DataSourceOptions } from 'typeorm';
import { DatabaseLogger } from '@cinema/shared';
import { LoginAttemptEntity } from '../../domain/entities/login-attempt.entity';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { AppConfig } from './app.config';

export const createDataSourceOptions = (appConfig: AppConfig): DataSourceOptions => ({
    type: 'postgres',
    host: appConfig.dbHost,
    port: appConfig.dbPort,
    username: appConfig.dbUsername,
    password: appConfig.dbPassword,
    database: appConfig.dbName,
    schema: 'identity',
    entities: [UserEntity, RefreshTokenEntity, LoginAttemptEntity],
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
