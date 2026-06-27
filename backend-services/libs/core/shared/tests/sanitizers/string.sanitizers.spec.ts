import { sanitizeString } from '../../src/sanitizers/string.sanitizers';

describe('sanitizeString', () => {
    it('trims surrounding whitespace by default', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('strips ASCII control characters and null bytes by default', () => {
        expect(sanitizeString('a\u0000b\u001Fc\u007Fd')).toBe('abcd');
    });

    it('lower-cases when requested', () => {
        expect(sanitizeString('HeLLo', { lowercase: true })).toBe('hello');
    });

    it('upper-cases when requested', () => {
        expect(sanitizeString('hello', { uppercase: true })).toBe('HELLO');
    });

    it('collapses internal whitespace then trims', () => {
        expect(sanitizeString('  a   b\tc  ', { collapseWhitespace: true })).toBe('a b c');
    });

    it('can disable trimming', () => {
        expect(sanitizeString('  hello  ', { trim: false })).toBe('  hello  ');
    });

    it('can disable control-char stripping', () => {
        expect(sanitizeString('a\u0000b', { stripControlChars: false })).toBe('a\u0000b');
    });

    it.each([42, null, undefined, {}, []])('returns non-string values untouched: %p', (value) => {
        expect(sanitizeString(value)).toBe(value);
    });
});
