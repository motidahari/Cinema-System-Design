import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { SeatStatus } from '../../seats/enum/seat-status.enum';

@Entity({ name: 'seats', schema: 'cinema' })
@Index('IDX_seats_status', ['status'])
@Unique('UQ_seats_row_number', ['row', 'number'])
export class SeatEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 1 })
    row!: string; // 'A' through 'M'

    @Column({ type: 'integer' })
    number!: number; // 1–10 for A–J; 1–5 for K–M

    @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
    status!: SeatStatus;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
