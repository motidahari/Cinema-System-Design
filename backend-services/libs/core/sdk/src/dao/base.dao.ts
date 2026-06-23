import { Repository, FindOptionsWhere } from 'typeorm';

/**
 * Convention:
 *   findBy*  — returns null when not found (caller decides if it's an error)
 *   getBy*   — throws when not found (record must exist)
 */
export abstract class BaseDao<TEntity extends { id: string }, TDomain> {
    protected abstract readonly repo: Repository<TEntity>;

    /** Map a DB row to a domain model instance. */
    protected abstract toDomain(entity: TEntity): TDomain;

    /** Error to throw when a getBy* lookup finds no row. */
    protected abstract notFoundError(id: string): Error;

    async findById(id: string): Promise<TDomain | null> {
        const entity = await this.repo.findOne({
            where: { id } as FindOptionsWhere<TEntity>,
        });
        return entity ? this.toDomain(entity) : null;
    }

    async getById(id: string): Promise<TDomain> {
        const result = await this.findById(id);
        if (!result) throw this.notFoundError(id);
        return result;
    }
}
