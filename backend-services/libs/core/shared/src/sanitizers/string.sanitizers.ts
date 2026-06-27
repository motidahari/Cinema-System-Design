import { SanitizeOptions } from './sanitize-options';

// Non-whitespace ASCII control characters (incl. null bytes) — never legitimate in
// user-facing input. Standard whitespace (\t \n \v \f \r) is deliberately preserved so
// it is handled by trim/collapseWhitespace rather than deleted (which would merge tokens).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000E-\u001F\u007F]/g;

/**
 * Purifies a string input. Non-string values are returned untouched so that
 * validation (class-validator / domain models) remains responsible for rejecting
 * the wrong type — sanitizers clean, validators reject.
 */
export function sanitizeString(value: unknown, options: SanitizeOptions = {}): unknown {
    const {
        trim = true,
        lowercase = false,
        uppercase = false,
        collapseWhitespace = false,
        stripControlChars = true,
    } = options;

    if (typeof value !== 'string') return value;

    let result = value;
    if (stripControlChars) result = result.replace(CONTROL_CHARS_PATTERN, '');
    if (collapseWhitespace) result = result.replace(/\s+/g, ' ');
    if (trim) result = result.trim();
    if (lowercase) result = result.toLowerCase();
    if (uppercase) result = result.toUpperCase();

    return result;
}
