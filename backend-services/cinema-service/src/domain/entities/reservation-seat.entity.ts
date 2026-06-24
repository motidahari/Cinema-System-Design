import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SeatEntity } from './seat.entity';
import { ReservationEntity } from './reservation.entity';

/**
 * Join row linking a reservation to a held seat. `isActive` is `true` while the
 * reservation currently holds the seat (RESERVED or BOOKED); the partial unique
 * index enforces a single active holder per seat at the DB level — the
 * anti-double-booking backstop (DATABASE-DESIGN §4.4, DECISIONS ADR-9).
 */
@Entity({ name: 'reservation_seats', schema: 'cinema' })
@Index('IDX_reservation_seats_reservation_id', ['reservationId'])
@Index('IDX_reservation_seats_seat_id', ['seatId'])
@Index('UQ_reservation_seats_active_seat', ['seatId'], { unique: true, where: '"is_active" = true' })
export class ReservationSeatEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'reservation_id' })
    reservationId!: string;

    @ManyToOne(() => ReservationEntity, (r) => r.reservationSeats, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reservation_id' })
    reservation!: ReservationEntity;

    @Column({ type: 'uuid', name: 'seat_id' })
    seatId!: string;

    @ManyToOne(() => SeatEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'seat_id' })
    seat!: SeatEntity;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive!: boolean;
}
