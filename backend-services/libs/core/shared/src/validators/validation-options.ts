export interface ValidationOptions {
    /** Allow undefined as a valid value. Default: false */
    optional?: boolean;
    /** Allow null as a valid value. Default: false */
    nullable?: boolean;
    /** Reject empty or whitespace-only strings. Default: true */
    required?: boolean;
    /** Minimum numeric value or minimum string length (inclusive) */
    min?: number;
    /** Maximum numeric value or maximum string length (inclusive) */
    max?: number;
    /** Regex pattern the string must match */
    pattern?: RegExp;
    /** Value must be strictly greater than 0 (numbers). Default: false */
    positive?: boolean;
    /** Value must be an integer (numbers). Default: false */
    integer?: boolean;
    /** Allow arrays to count as valid objects. Default: false */
    allowArray?: boolean;
}
