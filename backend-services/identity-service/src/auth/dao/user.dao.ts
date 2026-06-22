import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserModel } from '../domain-model/user';

@Injectable()
export class UserDao {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>
    ) {}

    async findById(id: string): Promise<UserModel | null> {
        const entity = await this.repository.findOneBy({ id });
        return entity ? this.toDomainModel(entity) : null;
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const entity = await this.repository.findOneBy({ email: email.toLowerCase().trim() });
        return entity ? this.toDomainModel(entity) : null;
    }

    async create(attrs: { email: string; passwordHash: string }): Promise<UserModel> {
        const entity = this.repository.create({
            email: attrs.email.toLowerCase().trim(),
            passwordHash: attrs.passwordHash,
        });
        const saved = await this.repository.save(entity);
        return this.toDomainModel(saved);
    }

    private toDomainModel(entity: UserEntity): UserModel {
        return new UserModel({
            id: entity.id,
            email: entity.email,
            passwordHash: entity.passwordHash,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        });
    }
}
