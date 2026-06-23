import { ValidationOptions } from './validation-options';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown, options: ValidationOptions = {}): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return typeof value === 'string' && UUID_PATTERN.test(value);
}
