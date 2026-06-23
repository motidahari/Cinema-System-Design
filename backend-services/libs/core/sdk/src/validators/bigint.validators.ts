import { ValidationOptions } from './validation-options';

export function isValidBigInt(value: unknown, options: ValidationOptions = {}): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return typeof value === 'bigint';
}
