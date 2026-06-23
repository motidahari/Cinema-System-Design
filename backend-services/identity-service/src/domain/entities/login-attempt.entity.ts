import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'login_attempts', schema: 'identity' })
@Unique('UQ_login_attempts_email_ip', ['email', 'ip'])
@Index('IDX_login_attempts_locked_until', ['lockedUntil'])
export class LoginAttemptEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    email!: string;

    @Column({ type: 'varchar', length: 64 })
    ip!: string;

    @Column({ type: 'integer', name: 'failed_count', default: 0 })
    failedCount!: number;

    @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
    lockedUntil!: Date | null;

    @Column({ type: 'timestamptz', name: 'last_failed_at', nullable: true })
    lastFailedAt!: Date | null;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
