import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpStatus } from '@nestjs/common';
import { DataSource, EntityNotFoundError } from 'typeorm';
import { randomUUID } from 'crypto';
import { IdempotencyDao } from '../../src/reservations/idempotency/idempotency.dao';
import { IdempotencyKeyEntity } from '../../src/domain/entities/idempotency-key.entity';
import { cinemaTestDataSourceOptions, clearCinemaTables } from './helpers/db.helper';

describe('IdempotencyDao (integration)', () => {
    let module: TestingModule;
    let dao: IdempotencyDao;
    let dataSource: DataSource;

    const USER = randomUUID();
    const KEY = randomUUID();
    const HASH = 'a'.repeat(64);
    const future = () => new Date(Date.now() + 86_400_000);

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(cinemaTestDataSourceOptions()),
                TypeOrmModule.forFeature([IdempotencyKeyEntity]),
            ],
            providers: [IdempotencyDao],
        }).compile();

        dao = module.get(IdempotencyDao);
        dataSource = module.get(DataSource);
    });

    beforeEach(async () => {
        await clearCinemaTables(dataSource);
    });

    afterAll(async () => {
        await clearCinemaTables(dataSource);
        await module.close();
    });

    const claim = (userId = USER, key = KEY, hash = HASH, expiresAt = future()) =>
        dao.tryClaim({ userId, idempotencyKey: key, requestHash: hash, expiresAt });

    // ── tryClaim ──────────────────────────────────────────────────────────────

    describe('tryClaim, Given:A new (userId, idempotencyKey) pair, When:Claiming', () => {
        it('should insert the row and return true', async () => {
            expect(await claim()).toBe(true);
        });
    });

    describe('tryClaim, Given:An already-claimed (userId, idempotencyKey) pair, When:Claiming again', () => {
        it('should return false without throwing (ON CONFLICT DO NOTHING)', async () => {
            await claim();
            expect(await claim()).toBe(false);
        });
    });

    describe('tryClaim, Given:The same idempotencyKey value but a different userId, When:Claiming', () => {
        it('should return true — uniqueness is scoped per (userId, idempotencyKey)', async () => {
            await claim(USER, KEY);
            expect(await claim(randomUUID(), KEY)).toBe(true);
        });
    });

    // ── find ──────────────────────────────────────────────────────────────────

    describe('find, Given:A claimed key, When:Looking up', () => {
        it('should return the persisted entity with responseStatus null (in-flight)', async () => {
            await claim();
            const entity = await dao.find(USER, KEY);

            expect(entity.userId).toBe(USER);
            expect(entity.idempotencyKey).toBe(KEY);
            expect(entity.requestHash).toBe(HASH);
            expect(entity.responseStatus).toBeNull();
            expect(entity.responseBody).toBeNull();
        });
    });

    describe('find, Given:An unknown (userId, idempotencyKey) pair, When:Looking up', () => {
        it('should throw EntityNotFoundError', async () => {
            await expect(dao.find(randomUUID(), randomUUID())).rejects.toThrow(EntityNotFoundError);
        });
    });

    // ── complete ──────────────────────────────────────────────────────────────

    describe('complete, Given:A claimed key, When:Completing with a reservationId', () => {
        it('should persist responseStatus, responseBody, and reservationId', async () => {
            await claim();
            const reservationId = randomUUID();
            const body = { id: reservationId, status: 'PENDING' };

            await dao.complete(USER, KEY, { status: HttpStatus.CREATED, body, reservationId });

            const entity = await dao.find(USER, KEY);
            expect(entity.responseStatus).toBe(HttpStatus.CREATED);
            expect(entity.responseBody).toStrictEqual(body);
            expect(entity.reservationId).toBe(reservationId);
        });
    });

    describe('complete, Given:A claimed key, When:Completing without a reservationId', () => {
        it('should store null for reservationId', async () => {
            await claim();
            await dao.complete(USER, KEY, { status: HttpStatus.CREATED, body: {} });

            const entity = await dao.find(USER, KEY);
            expect(entity.reservationId).toBeNull();
        });
    });

    // ── tryClaim + complete round-trip ────────────────────────────────────────

    describe('tryClaim → complete → tryClaim, Given:A fully completed key, When:Retrying', () => {
        it('should still return false on retry (the row persists after completion)', async () => {
            await claim();
            await dao.complete(USER, KEY, { status: HttpStatus.CREATED, body: { id: randomUUID() } });

            expect(await claim()).toBe(false);
        });
    });
});
