import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKeyEntity } from '../../domain/entities/idempotency-key.entity';

export interface IdempotencyClaimParams {
    userId: string;
    idempotencyKey: string;
    requestHash: string;
    expiresAt: Date;
}

export interface IdempotencyCompleteParams {
    status: number;
    body: unknown;
    reservationId?: string;
}

@Injectable()
export class IdempotencyDao {
    constructor(
        @InjectRepository(IdempotencyKeyEntity)
        private readonly repo: Repository<IdempotencyKeyEntity>
    ) {}

    /**
     * Atomically claims the key via INSERT … ON CONFLICT DO NOTHING.
     * Returns true if this call inserted the row (we own it), false if it already existed.
     */
    async tryClaim(params: IdempotencyClaimParams): Promise<boolean> {
        const result = await this.repo
            .createQueryBuilder()
            .insert()
            .into(IdempotencyKeyEntity)
            .values({
                userId: params.userId,
                idempotencyKey: params.idempotencyKey,
                requestHash: params.requestHash,
                expiresAt: params.expiresAt,
            })
            .orIgnore()
            .returning('id')
            .execute();
        return (result.raw as unknown[]).length > 0;
    }

    /** Loads an existing record for a (userId, idempotencyKey) pair. */
    async find(userId: string, idempotencyKey: string): Promise<IdempotencyKeyEntity> {
        return this.repo.findOneOrFail({ where: { userId, idempotencyKey } });
    }

    /** Persists the resolved response so future retries can replay it. */
    async complete(userId: string, idempotencyKey: string, params: IdempotencyCompleteParams): Promise<void> {
        await this.repo.update(
            { userId, idempotencyKey },
            {
                responseStatus: params.status,
                responseBody: params.body as object,
                reservationId: params.reservationId ?? null,
            }
        );
    }
}
