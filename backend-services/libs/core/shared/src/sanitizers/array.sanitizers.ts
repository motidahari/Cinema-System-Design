import { SanitizeOptions } from './sanitize-options';

/**
 * Purifies an array input by applying `itemSanitizer` to every element and,
 * when `unique` is set, removing duplicate entries. Non-array values are
 * returned untouched so validation remains responsible for rejecting the type.
 */
export function sanitizeArray(
    value: unknown,
    itemSanitizer?: (item: unknown) => unknown,
    options: SanitizeOptions = {}
): unknown {
    if (!Array.isArray(value)) return value;

    let result: unknown[] = itemSanitizer ? value.map(itemSanitizer) : [...value];
    if (options.unique) result = Array.from(new Set(result));

    return result;
}
