import { sanitizeEmail } from '../../src/sanitizers/email.sanitizers';

describe('sanitizeEmail', () => {
    it('trims and lower-cases the address', () => {
        expect(sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('leaves an already-clean address unchanged', () => {
        expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    });

    it.each([null, undefined, 123])('returns non-string values untouched: %p', (value) => {
        expect(sanitizeEmail(value)).toBe(value);
    });
});
