import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, MoreThan, QueryRunner, Repository } from 'typeorm';
import { BaseDao } from '@cinema/shared';
import { ReservationEntity } from '../../domain/entities/reservation.entity';
import { ReservationModel } from '../domain-model/reservation';
import { ReservationStatus } from '../enum/reservation-status.enum';

@Injectable()
export class ReservationDao extends BaseDao<ReservationEntity, ReservationModel> {
    constructor(
        @InjectRepository(ReservationEntity)
        protected readonly repo: Repository<ReservationEntity>
    ) {
        super();
    }

    protected toDomain(entity: ReservationEntity): ReservationModel {
        const seatIds = entity.reservationSeats?.map((rs) => rs.seatId) ?? [];
        return new ReservationModel({
            id: entity.id,
            userId: entity.userId,
            status: entity.status,
            expiresAt: entity.expiresAt,
            seatIds,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        });
    }

    protected toEntity(domain: ReservationModel): DeepPartial<ReservationEntity> {
        return {
            id: domain.id,
            userId: domain.userId,
            status: domain.status,
            expiresAt: domain.expiresAt,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt,
        };
    }

    /**
     * Creates a PENDING reservation plus its reservation_seats rows (is_active = true
     * by default) in one cascaded insert, inside the caller's transaction.
     */
    async createWithSeats(
        qr: QueryRunner,
        userId: string,
        seatIds: string[],
        expiresAt: Date
    ): Promise<ReservationModel> {
        const reservation = qr.manager.create(ReservationEntity, {
            userId,
            status: ReservationStatus.PENDING,
            expiresAt,
            reservationSeats: seatIds.map((seatId) => ({ seatId })),
        });
        const saved = await qr.manager.save(ReservationEntity, reservation);
        saved.reservationSeats = reservation.reservationSeats;
        return this.toDomain(saved);
    }

    /** Loads a reservation with its seat ids populated. */
    async findById(id: string): Promise<ReservationModel | null> {
        const entity = await this.repo.findOne({ where: { id }, relations: ['reservationSeats'] });
        return entity ? this.toDomain(entity) : null;
    }

    /**
     * The user's single active (PENDING, not-yet-expired) reservation, if any. Read on
     * the reserve transaction's QueryRunner so concurrent reserves can't both pass the
     * one-active-per-user check (DECISIONS ADR-2).
     */
    async findActivePendingByUser(qr: QueryRunner, userId: string): Promise<ReservationModel | null> {
        const entity = await qr.manager.findOne(ReservationEntity, {
            where: { userId, status: ReservationStatus.PENDING, expiresAt: MoreThan(new Date()) },
            relations: ['reservationSeats'],
        });
        return entity ? this.toDomain(entity) : null;
    }

    /** All PENDING reservations for a user, newest first. */
    async findPendingByUser(userId: string): Promise<ReservationModel[]> {
        const entities = await this.repo.find({
            where: { userId, status: ReservationStatus.PENDING },
            relations: ['reservationSeats'],
            order: { createdAt: 'DESC' },
        });
        return entities.map((e) => this.toDomain(e));
    }

    async updateStatus(qr: QueryRunner, id: string, status: ReservationStatus): Promise<void> {
        await qr.manager.update(ReservationEntity, id, { status });
    }
}
