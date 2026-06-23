export interface ObjectValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
    /** Allow arrays to count as valid objects. Default: false */
    allowArray?: boolean;
}

/**
 * Validates a plain object value (e.g. `Record<string, unknown>` payloads).
 * Arrays are rejected by default; enable `allowArray` to accept them.
 */
export function isValidObject(value: unknown, options: ObjectValidationOptions = {}): boolean {
    const { optional = false, nullable = false, allowArray = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return allowArray;
    return true;
}
