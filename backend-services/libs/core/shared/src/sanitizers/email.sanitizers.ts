import { sanitizeString } from './string.sanitizers';

/**
 * Purifies an email input: trims, lower-cases and strips control characters.
 * Validation of the actual email shape stays with the validators / DTO decorators.
 */
export function sanitizeEmail(value: unknown): unknown {
    return sanitizeString(value, { trim: true, lowercase: true });
}
