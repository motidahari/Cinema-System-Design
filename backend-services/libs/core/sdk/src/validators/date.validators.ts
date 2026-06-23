export interface DateValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
}

export function isValidDate(value: unknown, options: DateValidationOptions = {}): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return value instanceof Date && !isNaN(value.getTime());
}
