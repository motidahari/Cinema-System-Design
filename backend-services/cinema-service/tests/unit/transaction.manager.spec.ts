import { DataSource, QueryRunner } from 'typeorm';
import { TransactionManager } from '@cinema/internal-sdk';

describe('TransactionManager', () => {
    let manager: TransactionManager;
    let qr: {
        connect: jest.Mock;
        startTransaction: jest.Mock;
        commitTransaction: jest.Mock;
        rollbackTransaction: jest.Mock;
        release: jest.Mock;
    };
    let dataSource: { createQueryRunner: jest.Mock };

    beforeEach(() => {
        qr = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
        };
        dataSource = { createQueryRunner: jest.fn().mockReturnValue(qr) };
        manager = new TransactionManager(dataSource as unknown as DataSource);
    });

    describe('runInTransaction, Given:The callback resolves, When:Running', () => {
        it('should connect, start, commit and release, returning the result', async () => {
            const result = await manager.runInTransaction(async () => 'ok');

            expect(result).toBe('ok');
            expect(qr.connect).toHaveBeenCalledTimes(1);
            expect(qr.startTransaction).toHaveBeenCalledTimes(1);
            expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
            expect(qr.rollbackTransaction).not.toHaveBeenCalled();
            expect(qr.release).toHaveBeenCalledTimes(1);
        });

        it('should pass the active QueryRunner to the callback', async () => {
            let received: QueryRunner | undefined;
            await manager.runInTransaction(async (runner) => {
                received = runner;
            });
            expect(received).toBe(qr);
        });
    });

    describe('runInTransaction, Given:The callback throws, When:Running', () => {
        it('should rollback, release and rethrow without committing', async () => {
            const boom = new Error('boom');

            await expect(
                manager.runInTransaction(async () => {
                    throw boom;
                })
            ).rejects.toBe(boom);

            expect(qr.commitTransaction).not.toHaveBeenCalled();
            expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(qr.release).toHaveBeenCalledTimes(1);
        });
    });
});
