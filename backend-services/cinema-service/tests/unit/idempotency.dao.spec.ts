import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IdempotencyDao } from '../../src/reservations/idempotency/idempotency.dao';
import { IdempotencyKeyEntity } from '../../src/domain/entities/idempotency-key.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = randomUUID();
const IDEM_KEY = randomUUID();
const REQUEST_HASH = 'a'.repeat(64);

function makeEntity(overrides: Partial<IdempotencyKeyEntity> = {}): IdempotencyKeyEntity {
    return {
        id: randomUUID(),
        userId: USER_ID,
        idempotencyKey: IDEM_KEY,
        requestHash: REQUEST_HASH,
        responseStatus: null,
        responseBody: null,
        reservationId: null,
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        ...overrides,
    } as IdempotencyKeyEntity;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IdempotencyDao', () => {
    let dao: IdempotencyDao;
    let repo: {
        createQueryBuilder: jest.Mock;
        findOneOrFail: jest.Mock;
        update: jest.Mock;
    };
    let qb: {
        insert: jest.Mock;
        into: jest.Mock;
        values: jest.Mock;
        orIgnore: jest.Mock;
        returning: jest.Mock;
        execute: jest.Mock;
    };

    beforeEach(async () => {
        qb = {
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            orIgnore: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ raw: [{ id: randomUUID() }] }),
        };
        repo = {
            createQueryBuilder: jest.fn().mockReturnValue(qb),
            findOneOrFail: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [IdempotencyDao, { provide: getRepositoryToken(IdempotencyKeyEntity), useValue: repo }],
        }).compile();

        dao = module.get(IdempotencyDao);
    });

    // ── tryClaim ──────────────────────────────────────────────────────────────

    describe('tryClaim, Given:A new (userId, idempotencyKey) pair, When:Claiming', () => {
        it('should insert the row and return true', async () => {
            qb.execute.mockResolvedValue({ raw: [{ id: randomUUID() }] });

            const result = await dao.tryClaim({
                userId: USER_ID,
                idempotencyKey: IDEM_KEY,
                requestHash: REQUEST_HASH,
                expiresAt: new Date(Date.now() + 86_400_000),
            });

            expect(result).toBe(true);
            expect(qb.orIgnore).toHaveBeenCalled();
            expect(qb.returning).toHaveBeenCalledWith('id');
        });
    });

    describe('tryClaim, Given:An existing (userId, idempotencyKey) pair, When:Claiming', () => {
        it('should return false when the insert is ignored due to conflict', async () => {
            qb.execute.mockResolvedValue({ raw: [] });

            const result = await dao.tryClaim({
                userId: USER_ID,
                idempotencyKey: IDEM_KEY,
                requestHash: REQUEST_HASH,
                expiresAt: new Date(Date.now() + 86_400_000),
            });

            expect(result).toBe(false);
        });
    });

    describe('tryClaim, Given:A tryClaim call, When:Inserting', () => {
        it('should pass all claim params to the query builder', async () => {
            const expiresAt = new Date(Date.now() + 86_400_000);

            await dao.tryClaim({ userId: USER_ID, idempotencyKey: IDEM_KEY, requestHash: REQUEST_HASH, expiresAt });

            expect(qb.values).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: USER_ID,
                    idempotencyKey: IDEM_KEY,
                    requestHash: REQUEST_HASH,
                    expiresAt,
                })
            );
        });
    });

    // ── find ──────────────────────────────────────────────────────────────────

    describe('find, Given:An existing key record, When:Looking up', () => {
        it('should delegate to findOneOrFail with (userId, idempotencyKey)', async () => {
            const entity = makeEntity({ responseStatus: HttpStatus.CREATED });
            repo.findOneOrFail.mockResolvedValue(entity);

            const result = await dao.find(USER_ID, IDEM_KEY);

            expect(result).toBe(entity);
            expect(repo.findOneOrFail).toHaveBeenCalledWith({
                where: { userId: USER_ID, idempotencyKey: IDEM_KEY },
            });
        });
    });

    // ── complete ──────────────────────────────────────────────────────────────

    describe('complete, Given:A claimed key, When:Completing', () => {
        it('should update responseStatus, responseBody, and reservationId', async () => {
            const reservationId = randomUUID();
            const body = { id: reservationId };

            await dao.complete(USER_ID, IDEM_KEY, {
                status: HttpStatus.CREATED,
                body,
                reservationId,
            });

            expect(repo.update).toHaveBeenCalledWith(
                { userId: USER_ID, idempotencyKey: IDEM_KEY },
                { responseStatus: HttpStatus.CREATED, responseBody: body, reservationId }
            );
        });
    });

    describe('complete, Given:No reservationId in params, When:Completing', () => {
        it('should store null for reservationId', async () => {
            await dao.complete(USER_ID, IDEM_KEY, { status: HttpStatus.CREATED, body: {} });

            expect(repo.update).toHaveBeenCalledWith(
                { userId: USER_ID, idempotencyKey: IDEM_KEY },
                expect.objectContaining({ reservationId: null })
            );
        });
    });
});
