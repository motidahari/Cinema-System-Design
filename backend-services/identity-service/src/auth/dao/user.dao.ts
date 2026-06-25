import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BaseDao } from '@cinema/shared';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserModel } from '../domain-model/user';

@Injectable()
export class UserDao extends BaseDao<UserEntity, UserModel> {
    constructor(
        @InjectRepository(UserEntity)
        protected readonly repo: Repository<UserEntity>
    ) {
        super();
    }

    protected toDomain(entity: UserEntity): UserModel {
        return new UserModel({
            id: entity.id,
            email: entity.email,
            passwordHash: entity.passwordHash,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        });
    }

    protected toEntity(user: UserModel): DeepPartial<UserEntity> {
        return {
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async create(attrs: { email: string; passwordHash: string }, manager?: EntityManager): Promise<UserModel> {
        const repo = manager ? manager.getRepository(UserEntity) : this.repo;
        const entity = repo.create({
            email: attrs.email.toLowerCase().trim(),
            passwordHash: attrs.passwordHash,
        });
        const saved = await repo.save(entity);
        return this.toDomain(saved);
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const normalized = email.toLowerCase().trim();
        return this.findOneBy({ email: normalized } as FindOptionsWhere<UserEntity>);
    }

    async getByEmail(email: string): Promise<UserModel> {
        const user = await this.findByEmail(email);
        if (!user) throw this.notFoundError(email);
        return user;
    }
}
