import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseDao } from '@cinema/internal-sdk';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserModel } from '../domain-model/user';
import { UserNotFoundException } from '../exception/user-not-found.exception';

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

    protected notFoundError(id: string): Error {
        return new UserNotFoundException(id);
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
        const entity = await this.repo.findOneBy({ email: email.toLowerCase().trim() });
        return entity ? this.toDomain(entity) : null;
    }

    async getByEmail(email: string): Promise<UserModel> {
        const user = await this.findByEmail(email);
        if (!user) throw this.notFoundError(email);
        return user;
    }
}
