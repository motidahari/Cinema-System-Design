import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('IDX_refresh_tokens_family_id', ['familyId'])
@Index('IDX_refresh_tokens_user_id', ['userId'])
@Entity({ name: 'refresh_tokens', schema: 'identity' })
export class RefreshTokenEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @Column({ type: 'uuid', name: 'family_id' })
    familyId!: string;

    @Column({ type: 'varchar', length: 64, name: 'token_hash', unique: true })
    tokenHash!: string;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt!: Date;

    @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
    revokedAt!: Date | null;

    @Column({ type: 'uuid', name: 'replaced_by', nullable: true })
    replacedBy!: string | null;

    @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
    userAgent!: string | null;

    @Column({ type: 'varchar', length: 64, name: 'ip', nullable: true })
    ip!: string | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;
}
