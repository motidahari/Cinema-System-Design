import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
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

    async findById(id: string): Promise<TDomain | null> {
        return this.findOneBy({ id } as FindOptionsWhere<TEntity>);
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
}
