import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReservationStatus } from '../../reservations/enum/reservation-status.enum';
import { ReservationSeatEntity } from './reservation-seat.entity';

@Entity({ name: 'reservations', schema: 'cinema' })
@Index('IDX_reservations_user_id', ['userId'])
@Index('IDX_reservations_expires_status', ['expiresAt', 'status'])
export class ReservationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
    status!: ReservationStatus;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt!: Date;

    @OneToMany(() => ReservationSeatEntity, (rs) => rs.reservation, { cascade: true })
    reservationSeats!: ReservationSeatEntity[];

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
