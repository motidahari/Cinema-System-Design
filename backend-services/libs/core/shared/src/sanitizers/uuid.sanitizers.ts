import { sanitizeString } from './string.sanitizers';

/**
 * Purifies a UUID input: trims and lower-cases (UUIDs are case-insensitive, the
 * canonical form is lower-case). Validation of the UUID shape stays with the
 * validators / DTO decorators.
 */
export function sanitizeUuid(value: unknown): unknown {
    return sanitizeString(value, { trim: true, lowercase: true });
}
