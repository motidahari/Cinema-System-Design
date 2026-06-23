import { Logger } from '../logger/logger';

/**
 * Implements the TypeORM Logger interface (duck-typed — no typeorm import required
 * in the SDK itself, so the SDK stays infra-agnostic).
 */
export class DatabaseLogger {
    logQuery(query: string, parameters?: unknown[]): void {
        Logger.info('DB query', { query, parameters });
    }

    logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
        Logger.error('DB query error', { error: String(error), query, parameters });
    }

    logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
        Logger.warning('DB slow query', { time, query, parameters });
    }

    logSchemaBuild(message: string): void {
        Logger.info('DB schema build', { message });
    }

    logMigration(message: string): void {
        Logger.info('DB migration', { message });
    }

    log(level: 'log' | 'info' | 'warn', message: unknown): void {
        if (level === 'warn') {
            Logger.warning('DB log', { message });
        } else {
            Logger.info('DB log', { message });
        }
    }
}
