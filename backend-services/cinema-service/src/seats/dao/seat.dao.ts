import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryRunner, Repository } from 'typeorm';
import { BaseDao, SortOrder } from '@cinema/shared';
import { SeatEntity } from '../../domain/entities/seat.entity';
import { SeatModel } from '../domain-model/seat';
import { SeatStatus } from '../enum/seat-status.enum';

@Injectable()
export class SeatDao extends BaseDao<SeatEntity, SeatModel> {
    constructor(
        @InjectRepository(SeatEntity)
        protected readonly repo: Repository<SeatEntity>
    ) {
        super();
    }

    protected toDomain(entity: SeatEntity): SeatModel {
        return new SeatModel({
            id: entity.id,
            row: entity.row,
            number: entity.number,
            status: entity.status,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        });
    }

    protected toEntity(seat: SeatModel): DeepPartial<SeatEntity> {
        return {
            id: seat.id,
            row: seat.row,
            number: seat.number,
            status: seat.status,
            createdAt: seat.createdAt,
            updatedAt: seat.updatedAt,
        };
    }

    /** Full seating map, ordered by row then seat number. */
    async findAll(): Promise<SeatModel[]> {
        return super.findAll({ order: { row: SortOrder.ASC, number: SortOrder.ASC } });
    }

    async findByIds(ids: string[]): Promise<SeatModel[]> {
        return super.findByIds(ids);
    }

    async countAll(): Promise<number> {
        return this.repo.count();
    }

    /** Bulk insert used by the startup seeder. */
    async insertMany(seats: Array<{ row: string; number: number }>): Promise<void> {
        if (seats.length === 0) return;
        const entities = seats.map((s) => this.repo.create({ row: s.row, number: s.number }));
        await this.repo.save(entities);
    }

    /**
     * Acquires row-level locks on the given seats for the duration of the caller's
     * transaction — a blocking `SELECT ... FOR UPDATE` (no SKIP LOCKED, DECISIONS ADR-6).
     * Must be called inside an active QueryRunner transaction.
     */
    async lockForUpdate(qr: QueryRunner, ids: string[]): Promise<SeatModel[]> {
        if (ids.length === 0) return [];
        const entities = await qr.manager
            .getRepository(SeatEntity)
            .createQueryBuilder('seat')
            .where('seat.id IN (:...ids)', { ids })
            .setLock('pessimistic_write')
            .getMany();
        return entities.map((e) => this.toDomain(e));
    }

    /** Sets the status of every given seat in one statement, inside the caller's transaction. */
    async updateStatusBatch(qr: QueryRunner, ids: string[], status: SeatStatus): Promise<void> {
        if (ids.length === 0) return;
        await qr.manager
            .getRepository(SeatEntity)
            .createQueryBuilder()
            .update(SeatEntity)
            .set({ status })
            .where('id IN (:...ids)', { ids })
            .execute();
    }

    /** All seats in a row, ordered by number — provides Rule 2 context for the validator. */
    async findByRow(qr: QueryRunner, row: string): Promise<SeatModel[]> {
        const entities = await qr.manager.getRepository(SeatEntity).find({
            where: { row },
            order: { number: SortOrder.ASC },
        });
        return entities.map((e) => this.toDomain(e));
    }
}
