export interface EnumValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
}

export function isValidEnum<T extends Record<string, string | number>>(
    value: unknown,
    enumObj: T,
    options: EnumValidationOptions = {}
): boolean {
    const { optional = false, nullable = false } = options;

    if (value === undefined) return optional;
    if (value === null) return nullable;
    return Object.values(enumObj).includes(value as T[keyof T]);
}
