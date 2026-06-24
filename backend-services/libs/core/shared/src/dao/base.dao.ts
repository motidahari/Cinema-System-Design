import { Repository, FindOptionsWhere, DeepPartial, FindManyOptions, In, QueryRunner } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RecordNotFoundException } from './exceptions';

/**
 * Convention:
 *   findBy*  — returns null when not found (caller decides if it's an error)
 *   getBy*   — throws when not found (auto-handled by BaseDao)
 *
 * Subclasses must implement toDomain and toEntity.
 * Override notFoundError() to throw a domain-specific exception instead of RecordNotFoundException.
 */
export abstract class BaseDao<TEntity extends { id: string }, TDomain> {
    protected abstract readonly repo: Repository<TEntity>;

    /** DB row → domain model (all fields) */
    protected abstract toDomain(entity: TEntity): TDomain;

    /** Domain model → DB row (all fields) — used for update/upsert */
    protected abstract toEntity(domain: TDomain): DeepPartial<TEntity>;

    protected notFoundError(id: string): Error {
        return new RecordNotFoundException(id);
    }

    async findById(id: string, relations?: string[]): Promise<TDomain | null> {
        const entity = await this.repo.findOne({ where: { id } as FindOptionsWhere<TEntity>, relations });
        return entity ? this.toDomain(entity) : null;
    }

    async getById(id: string): Promise<TDomain> {
        const result = await this.findById(id);
        if (!result) throw this.notFoundError(id);
        return result;
    }

    protected async findOneBy(where: FindOptionsWhere<TEntity>): Promise<TDomain | null> {
        const entity = await this.repo.findOne({ where });
        return entity ? this.toDomain(entity) : null;
    }

    async findAll(options?: FindManyOptions<TEntity>): Promise<TDomain[]> {
        const entities = await this.repo.find(options);
        return entities.map((e) => this.toDomain(e));
    }

    async findByIds(ids: string[], options?: FindManyOptions<TEntity>): Promise<TDomain[]> {
        if (ids.length === 0) return [];

        const idCondition = { id: In(ids) } as FindOptionsWhere<TEntity>;
        const baseWhere = options?.where;
        let where: FindOptionsWhere<TEntity> | FindOptionsWhere<TEntity>[];
        if (Array.isArray(baseWhere)) {
            where = baseWhere.map((w) => ({ ...w, ...idCondition }));
        } else if (baseWhere) {
            where = { ...baseWhere, ...idCondition };
        } else {
            where = idCondition;
        }

        const entities = await this.repo.find({ ...options, where });
        return entities.map((e) => this.toDomain(e));
    }

    async save(domain: TDomain): Promise<TDomain> {
        const entity = this.toEntity(domain);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved as TEntity);
    }

    async update(domain: TDomain): Promise<TDomain> {
        const entity = this.toEntity(domain);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved as TEntity);
    }

    async updateInTx(qr: QueryRunner, id: string, partial: QueryDeepPartialEntity<TEntity>): Promise<void> {
        await qr.manager.update(this.repo.target, id, partial);
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }
}
