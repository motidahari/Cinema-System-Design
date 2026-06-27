import { sanitizeUuid } from '../../src/sanitizers/uuid.sanitizers';

describe('sanitizeUuid', () => {
    it('trims and lower-cases the uuid to its canonical form', () => {
        expect(sanitizeUuid('  3FA85F64-5717-4562-B3FC-2C963F66AFA6  ')).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    });

    it('leaves an already-canonical uuid unchanged', () => {
        expect(sanitizeUuid('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    });

    it.each([null, undefined, 0])('returns non-string values untouched: %p', (value) => {
        expect(sanitizeUuid(value)).toBe(value);
    });
});
