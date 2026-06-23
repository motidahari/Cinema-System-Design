import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';

/**
 * Convention:
 *   findBy*  — returns null when not found (caller decides if it's an error)
 *   getBy*   — throws when not found (record must exist)
 *
 * Subclasses implement toDomain, toEntity, and notFoundError.
 * All conversion calls happen inside BaseDao — public DAO methods stay clean.
 */
export abstract class BaseDao<TEntity extends { id: string }, TDomain, TCreateAttrs> {
    protected abstract readonly repo: Repository<TEntity>;

    /** DB row → domain model */
    protected abstract toDomain(entity: TEntity): TDomain;

    /** Domain create attrs → partial entity for repo.create() */
    protected abstract toEntity(attrs: TCreateAttrs): DeepPartial<TEntity>;

    /** Error to throw when a getBy* lookup finds no row */
    protected abstract notFoundError(id: string): Error;

    async create(attrs: TCreateAttrs): Promise<TDomain> {
        const entity = this.repo.create(this.toEntity(attrs) as TEntity);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
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
