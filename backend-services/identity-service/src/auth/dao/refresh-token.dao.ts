import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BaseDao } from '@cinema/shared';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenModel } from '../domain-model/refresh-token';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokenDao extends BaseDao<RefreshTokenEntity, RefreshTokenModel> {
    constructor(
        @InjectRepository(RefreshTokenEntity)
        protected readonly repo: Repository<RefreshTokenEntity>
    ) {
        super();
    }

    protected toDomain(entity: RefreshTokenEntity): RefreshTokenModel {
        return new RefreshTokenModel({
            id: entity.id,
            userId: entity.userId,
            familyId: entity.familyId,
            tokenHash: entity.tokenHash,
            expiresAt: entity.expiresAt,
            revokedAt: entity.revokedAt,
            replacedBy: entity.replacedBy,
            userAgent: entity.userAgent,
            ip: entity.ip,
            createdAt: entity.createdAt,
        });
    }

    protected toEntity(model: RefreshTokenModel): DeepPartial<RefreshTokenEntity> {
        return {
            id: model.id,
            userId: model.userId,
            familyId: model.familyId,
            tokenHash: model.tokenHash,
            expiresAt: model.expiresAt,
            revokedAt: model.revokedAt ?? undefined,
            replacedBy: model.replacedBy ?? undefined,
            userAgent: model.userAgent ?? undefined,
            ip: model.ip ?? undefined,
        };
    }

    async findByTokenHash(tokenHash: string): Promise<RefreshTokenModel | null> {
        const entity = await this.repo.findOne({ where: { tokenHash } });
        return entity ? this.toDomain(entity) : null;
    }

    async create(attrs: {
        userId: string;
        familyId: string;
        tokenHash: string;
        userAgent: string | null;
        ip: string | null;
    }): Promise<RefreshTokenModel> {
        const entity = this.repo.create({
            userId: attrs.userId,
            familyId: attrs.familyId,
            tokenHash: attrs.tokenHash,
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
            revokedAt: null,
            userAgent: attrs.userAgent,
            ip: attrs.ip,
        });
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }

    async revokeFamily(familyId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .update()
            .set({ revokedAt: new Date() })
            .where('family_id = :familyId AND revoked_at IS NULL', { familyId })
            .execute();
    }

    async rotateToken(id: string, replacedById: string): Promise<void> {
        await this.repo.update(id, { revokedAt: new Date(), replacedBy: replacedById });
    }
}
