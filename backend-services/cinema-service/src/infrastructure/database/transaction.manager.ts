import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * Centralises atomic DB work. `runInTransaction` opens a dedicated QueryRunner,
 * starts a transaction, runs the callback, then commits — rolling back on any error
 * and always releasing the runner. Callers receive the active QueryRunner and pass it
 * to DAO methods so every statement participates in the same transaction.
 */
@Injectable()
export class TransactionManager {
    constructor(private readonly dataSource: DataSource) {}

    async runInTransaction<T>(work: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const result = await work(queryRunner);
            await queryRunner.commitTransaction();
            return result;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
