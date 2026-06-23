import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { BaseDao } from '@cinema/internal-sdk';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserModel } from '../domain-model/user';
import { UserNotFoundException } from '../exception/user-not-found.exception';

type CreateUserAttrs = Pick<UserModel, 'email' | 'passwordHash'>;

@Injectable()
export class UserDao extends BaseDao<UserEntity, UserModel, CreateUserAttrs> {
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

    protected toEntity(attrs: CreateUserAttrs): DeepPartial<UserEntity> {
        return {
            email: attrs.email.toLowerCase().trim(),
            passwordHash: attrs.passwordHash,
        };
    }

    protected notFoundError(id: string): Error {
        return new UserNotFoundException(id);
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
