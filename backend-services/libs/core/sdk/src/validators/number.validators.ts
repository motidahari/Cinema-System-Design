export interface NumberValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
    /** Value must be strictly greater than 0. Default: false */
    positive?: boolean;
    /** Minimum value (inclusive) */
    min?: number;
    /** Maximum value (inclusive) */
    max?: number;
    /** Value must be an integer. Default: false */
    integer?: boolean;
}

export function isValidNumber(value: unknown, options: NumberValidationOptions = {}): boolean {
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
