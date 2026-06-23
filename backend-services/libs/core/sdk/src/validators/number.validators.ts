import { ValidationOptions } from './validation-options';

export function isValidNumber(value: unknown, options: ValidationOptions = {}): boolean {
    const { optional = false, nullable = false, positive = false, min, max, integer = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    if (typeof value !== 'number' || !isFinite(value)) return false;
    if (positive && value <= 0) return false;
    if (integer && !Number.isInteger(value)) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;

    return true;
}
