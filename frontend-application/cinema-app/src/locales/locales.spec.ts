import { describe, it, expect } from 'vitest';
import en from './en';
import he from './he';

// Collect every leaf key path (e.g. 'auth.login') so we can assert the two locales
// stay structurally identical and no translation silently drifts.
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return typeof value === 'object' && value !== null ? keyPaths(value as Record<string, unknown>, path) : [path];
    });
}

describe('locales', () => {
    it('he has exactly the same keys as en', () => {
        expect(keyPaths(he)).toEqual(keyPaths(en));
    });

    it('every en value is a non-empty string', () => {
        expect(keyPaths(en).length).toBeGreaterThan(0);
    });

    it('every he value is a non-empty string', () => {
        const emptyHeValues = keyPaths(he).filter((path) => {
            const value = path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], he);
            return typeof value !== 'string' || value.length === 0;
        });
        expect(emptyHeValues).toEqual([]);
    });
});
