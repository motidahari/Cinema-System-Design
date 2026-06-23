import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { BaseDao } from '@cinema/internal-sdk';
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

    async create(attrs: Pick<UserModel, 'email' | 'passwordHash'>): Promise<UserModel> {
        const entity = this.repo.create({
            email: attrs.email.toLowerCase().trim(),
            passwordHash: attrs.passwordHash,
        });
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        return this.findOneBy({ email: email.toLowerCase().trim() } as FindOptionsWhere<UserEntity>);
    }

    async getByEmail(email: string): Promise<UserModel> {
        const user = await this.findByEmail(email);
        if (!user) throw this.notFoundError(email);
        return user;
    }
}
