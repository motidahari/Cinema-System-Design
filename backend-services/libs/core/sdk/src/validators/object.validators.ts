import { ValidationOptions } from './validation-options';

export function isValidObject(value: unknown, options: ValidationOptions = {}): boolean {
    const { optional = false, nullable = false, allowArray = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return allowArray;
    return true;
}
