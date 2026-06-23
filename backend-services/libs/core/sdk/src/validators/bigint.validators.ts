export interface BigIntValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
}

export function isValidBigInt(value: unknown, options: BigIntValidationOptions = {}): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return typeof value === 'bigint';
}
