import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../../../src/domain/entities/user.entity';

export function identityTestDataSourceOptions(): DataSourceOptions {
    return {
        type: 'postgres',
        host: process.env.TEST_DB_HOST ?? 'localhost',
        port: Number(process.env.TEST_DB_PORT ?? 5432),
        username: process.env.TEST_DB_USERNAME ?? 'cinema_user',
        password: process.env.TEST_DB_PASSWORD ?? 'cinema_pass',
        database: process.env.TEST_DB_NAME ?? 'cinema_db',
        schema: 'identity',
        entities: [UserEntity],
        synchronize: true,
    };
}
