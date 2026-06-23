import { ValidationOptions } from './validation-options';

export function isValidEnum<T extends Record<string, string | number>>(
    value: unknown,
    enumObj: T,
    options: ValidationOptions = {}
): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return Object.values(enumObj).includes(value as T[keyof T]);
}
