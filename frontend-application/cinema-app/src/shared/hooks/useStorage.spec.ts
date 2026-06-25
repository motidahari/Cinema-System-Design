import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStorage } from './useStorage';

// jsdom in this environment doesn't ship a usable Storage, so back the hook with a
// minimal in-memory localStorage for the duration of these tests.
function installMemoryStorage() {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
        clear: () => data.clear(),
    });
}

describe('useStorage', () => {
    beforeEach(() => {
        installMemoryStorage();
    });

    it('returns null for a missing key', () => {
        const { result } = renderHook(() => useStorage());
        expect(result.current.get('theme')).toBeNull();
    });

    it('persists and reads back a value', () => {
        const { result } = renderHook(() => useStorage());
        result.current.set('theme', 'dark');
        expect(result.current.get('theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('removes a stored value', () => {
        const { result } = renderHook(() => useStorage());
        result.current.set('lastSection', 'cinema');
        result.current.remove('lastSection');
        expect(result.current.get('lastSection')).toBeNull();
    });
});
