import { sanitizeArray } from '../../src/sanitizers/array.sanitizers';
import { sanitizeUuid } from '../../src/sanitizers/uuid.sanitizers';

describe('sanitizeArray', () => {
    it('applies the item sanitizer to every element', () => {
        expect(sanitizeArray(['  A  ', 'B '], (item) => sanitizeUuid(item))).toEqual(['a', 'b']);
    });

    it('removes duplicates when unique is set (after sanitizing each item)', () => {
        const input = ['3FA85F64-5717-4562-B3FC-2C963F66AFA6', '3fa85f64-5717-4562-b3fc-2c963f66afa6'];
        expect(sanitizeArray(input, (item) => sanitizeUuid(item), { unique: true })).toEqual([
            '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        ]);
    });

    it('returns a shallow copy when no item sanitizer is given', () => {
        const input = ['a', 'b'];
        const result = sanitizeArray(input) as string[];
        expect(result).toEqual(['a', 'b']);
        expect(result).not.toBe(input);
    });

    it.each([null, undefined, 'not-an-array', 42])('returns non-array values untouched: %p', (value) => {
        expect(sanitizeArray(value)).toBe(value);
    });
});
