export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TICKER_PATTERN = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;
export const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface StringValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
    /** Reject empty or whitespace-only strings. Default: true */
    required?: boolean;
    /** Minimum string length (inclusive) */
    min?: number;
    /** Maximum string length (inclusive) */
    max?: number;
    /** Regex pattern the string must match */
    pattern?: RegExp;
}

export function isValidString(value: unknown, options: StringValidationOptions = {}): boolean {
    const { optional = false, nullable = false, required = true, min, max, pattern } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    if (typeof value !== 'string') return false;
    if (required && value.trim().length === 0) return false;
    if (min !== undefined && value.length < min) return false;
    if (max !== undefined && value.length > max) return false;
    if (pattern !== undefined && !pattern.test(value)) return false;

    return true;
}
