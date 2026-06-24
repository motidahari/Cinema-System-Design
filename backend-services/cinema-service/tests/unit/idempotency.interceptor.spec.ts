import { createHash } from 'crypto';
import { ConflictException, ExecutionContext, HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import { CallHandler } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { randomUUID } from 'crypto';
import { IdempotencyInterceptor } from '../../src/reservations/idempotency/idempotency.interceptor';
import { IdempotencyDao } from '../../src/reservations/idempotency/idempotency.dao';
import { IdempotencyKeyEntity } from '../../src/domain/entities/idempotency-key.entity';
import { AppConfig } from '../../src/infrastructure/config/app.config';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = randomUUID();
const IDEM_KEY = randomUUID();

const METHOD = 'POST';
const URL = '/api/v1/reservations';
const BODY = { seatIds: [randomUUID()] };

function computeHash(method: string, url: string, body: unknown): string {
    return createHash('sha256')
        .update(`${method}:${url}:${JSON.stringify(body)}`)
        .digest('hex');
}

function makeCtx(headers: Record<string, string | undefined> = {}): ExecutionContext {
    const mockResponse = { status: jest.fn().mockReturnThis() };
    return {
        switchToHttp: () => ({
            getRequest: () => ({
                method: METHOD,
                originalUrl: URL,
                body: BODY,
                headers: { 'idempotency-key': IDEM_KEY, ...headers },
                user: { userId: USER_ID },
            }),
            getResponse: () => mockResponse,
        }),
    } as unknown as ExecutionContext;
}

function makeHandler(value: unknown = { id: randomUUID() }): CallHandler {
    return { handle: () => of(value) };
}

function makeEntity(overrides: Partial<IdempotencyKeyEntity> = {}): IdempotencyKeyEntity {
    return {
        id: randomUUID(),
        userId: USER_ID,
        idempotencyKey: IDEM_KEY,
        requestHash: computeHash(METHOD, URL, BODY),
        responseStatus: HttpStatus.CREATED,
        responseBody: { id: randomUUID() },
        reservationId: randomUUID(),
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        ...overrides,
    } as IdempotencyKeyEntity;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IdempotencyInterceptor', () => {
    let interceptor: IdempotencyInterceptor;
    let dao: { tryClaim: jest.Mock; find: jest.Mock; complete: jest.Mock };

    beforeEach(() => {
        dao = {
            tryClaim: jest.fn().mockResolvedValue(true),
            find: jest.fn(),
            complete: jest.fn().mockResolvedValue(undefined),
        };
        interceptor = new IdempotencyInterceptor(
            dao as unknown as IdempotencyDao,
            { idempotencyTtlHours: 24 } as AppConfig
        );
    });

    describe('intercept, Given:No Idempotency-Key header, When:Intercepting', () => {
        it('should pass through to the handler without touching the DAO', async () => {
            const ctx = makeCtx({ 'idempotency-key': undefined });
            const handler = makeHandler();
            const stream$ = await interceptor.intercept(ctx, handler);
            await lastValueFrom(stream$);
            expect(dao.tryClaim).not.toHaveBeenCalled();
        });
    });

    describe('intercept, Given:A fresh key (first request), When:Intercepting', () => {
        it('should claim the key, run the handler, and persist the response', async () => {
            const reservationId = randomUUID();
            const body = { id: reservationId };
            const handler = makeHandler(body);
            dao.tryClaim.mockResolvedValue(true);

            const stream$ = await interceptor.intercept(makeCtx(), handler);
            const result = await lastValueFrom(stream$);
            // flush the tap async callback
            await new Promise(process.nextTick);

            expect(result).toEqual(body);
            expect(dao.tryClaim).toHaveBeenCalledWith(
                expect.objectContaining({ userId: USER_ID, idempotencyKey: IDEM_KEY })
            );
            expect(dao.complete).toHaveBeenCalledWith(USER_ID, IDEM_KEY, {
                status: HttpStatus.CREATED,
                body,
                reservationId,
            });
        });
    });

    describe('intercept, Given:Same key + same body (retry), When:Intercepting', () => {
        it('should replay the cached response without running the handler', async () => {
            dao.tryClaim.mockResolvedValue(false);
            const cached = makeEntity();
            dao.find.mockResolvedValue(cached);

            const handler = { handle: jest.fn() };
            const ctx = makeCtx();
            const mockRes = ctx.switchToHttp().getResponse() as { status: jest.Mock };

            const stream$ = await interceptor.intercept(ctx, handler as unknown as CallHandler);
            const result = await lastValueFrom(stream$);

            expect(result).toBe(cached.responseBody);
            expect(mockRes.status).toHaveBeenCalledWith(cached.responseStatus);
            expect(handler.handle).not.toHaveBeenCalled();
        });
    });

    describe('intercept, Given:Same key + different body, When:Intercepting', () => {
        it('should throw UnprocessableEntityException (422)', async () => {
            dao.tryClaim.mockResolvedValue(false);
            dao.find.mockResolvedValue(makeEntity({ requestHash: 'different-hash' }));

            await expect(interceptor.intercept(makeCtx(), makeHandler())).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('intercept, Given:Same key + in-flight original request, When:Intercepting', () => {
        it('should throw ConflictException (409) when responseStatus is null', async () => {
            dao.tryClaim.mockResolvedValue(false);
            dao.find.mockResolvedValue(makeEntity({ responseStatus: null }));

            await expect(interceptor.intercept(makeCtx(), makeHandler())).rejects.toThrow(ConflictException);
        });
    });

    describe('intercept, Given:A fresh key and TTL config, When:Intercepting', () => {
        it('should compute expiresAt as now + idempotencyTtlHours', async () => {
            const beforeCall = Date.now();
            await interceptor.intercept(makeCtx(), makeHandler());
            const afterCall = Date.now();

            const { expiresAt } = dao.tryClaim.mock.calls[0][0] as { expiresAt: Date };
            const ttlMs = 24 * 3_600_000;
            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeCall + ttlMs);
            expect(expiresAt.getTime()).toBeLessThanOrEqual(afterCall + ttlMs);
        });
    });
});
