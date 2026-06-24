import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryRunner, Repository } from 'typeorm';
import { BaseDao } from '@cinema/shared';
import { ReservationSeatEntity } from '../../domain/entities/reservation-seat.entity';
import { ReservationSeatModel } from '../domain-model/reservation-seat';

/**
 * Owns the `reservation_seats` join table. The `is_active` flag is the DB-level
 * anti-double-booking backstop (DECISIONS ADR-9): a partial unique index allows only
 * one active holder per seat, so releasing a seat means flipping its row inactive in
 * the same transaction as the seat-status change.
 */
@Injectable()
export class ReservationSeatDao extends BaseDao<ReservationSeatEntity, ReservationSeatModel> {
    constructor(
        @InjectRepository(ReservationSeatEntity)
        protected readonly repo: Repository<ReservationSeatEntity>
    ) {
        super();
    }

    protected toDomain(entity: ReservationSeatEntity): ReservationSeatModel {
        return new ReservationSeatModel({
            id: entity.id,
            reservationId: entity.reservationId,
            seatId: entity.seatId,
            isActive: entity.isActive,
        });
    }

    protected toEntity(domain: ReservationSeatModel): DeepPartial<ReservationSeatEntity> {
        return {
            id: domain.id,
            reservationId: domain.reservationId,
            seatId: domain.seatId,
            isActive: domain.isActive,
        };
    }

    /**
     * Releases a reservation's DB-level seat-holder slots: sets is_active = false for
     * all of its rows. Called on cancel and expire — NOT on confirm (a BOOKED seat
     * stays actively held). Must run in the same transaction as the seat-status change.
     */
    async deactivateByReservation(queryRunner: QueryRunner, reservationId: string): Promise<void> {
        await queryRunner.manager.update(ReservationSeatEntity, { reservationId }, { isActive: false });
    }

    /** Seat ids currently linked to a reservation (any active state). */
    async findSeatIdsByReservation(reservationId: string): Promise<string[]> {
        const rows = await this.repo.find({ where: { reservationId } });
        return rows.map((r) => r.seatId);
    }
}
