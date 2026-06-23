import { ValidationException } from '../exceptions/validation.exception';

export function assertString(
    value: string | undefined,
    field: string,
    opts: { optional?: boolean; minLength?: number } = {}
): string | undefined {
    if (value === undefined) {
        if (!opts.optional) throw new ValidationException(`${field} is required, received: undefined`);
        return undefined;
    }
    const minLen = opts.minLength ?? 1;
    if (typeof value !== 'string' || value.trim().length < minLen)
        throw new ValidationException(`${field} must be a non-empty string, received: "${value}"`);
    return value;
}

export function assertDate(
    value: Date | undefined,
    field: string,
    opts: { optional?: boolean } = {}
): Date | undefined {
    if (value === undefined) {
        if (!opts.optional) throw new ValidationException(`${field} is required, received: undefined`);
        return undefined;
    }
    if (!(value instanceof Date) || isNaN(value.getTime()))
        throw new ValidationException(`${field} must be a valid Date, received: ${String(value)}`);
    return value;
}

export function assertNullableString(value: string | null | undefined, field: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value !== null && (typeof value !== 'string' || value.trim().length === 0))
        throw new ValidationException(`${field} must be a non-empty string or null, received: "${value}"`);
    return value;
}

export function assertNullableDate(value: Date | null | undefined, field: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value !== null && (!(value instanceof Date) || isNaN(value.getTime())))
        throw new ValidationException(`${field} must be a valid Date or null, received: ${String(value)}`);
    return value;
}
