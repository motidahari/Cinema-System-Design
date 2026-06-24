import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'idempotency_keys', schema: 'cinema' })
@Unique('UQ_idempotency_keys_user_key', ['userId', 'idempotencyKey'])
@Index('IDX_idempotency_keys_expires_at', ['expiresAt'])
export class IdempotencyKeyEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, name: 'idempotency_key' })
    idempotencyKey!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @Column({ type: 'varchar', length: 64, name: 'request_hash' })
    requestHash!: string;

    @Column({ type: 'integer', name: 'response_status', nullable: true })
    responseStatus!: number | null;

    @Column({ type: 'jsonb', name: 'response_body', nullable: true })
    responseBody!: unknown | null;

    @Column({ type: 'uuid', name: 'reservation_id', nullable: true })
    reservationId!: string | null;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt!: Date;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;
}
