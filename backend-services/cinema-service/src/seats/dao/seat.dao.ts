import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BaseDao } from '@cinema/shared';
import { SeatEntity } from '../../domain/entities/seat.entity';
import { SeatModel } from '../domain-model/seat';

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
        return super.findAll({ order: { row: 'ASC', number: 'ASC' } });
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
}
