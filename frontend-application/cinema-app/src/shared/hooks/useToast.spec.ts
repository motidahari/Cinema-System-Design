import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
    it('starts closed with an empty info toast', () => {
        const { result } = renderHook(() => useToast());
        expect(result.current.toast).toEqual({ open: false, message: '', severity: 'info' });
    });

    describe('showToast', () => {
        it('opens the toast with the given message and severity', () => {
            const { result } = renderHook(() => useToast());
            act(() => result.current.showToast('Saved!', 'success'));
            expect(result.current.toast).toEqual({ open: true, message: 'Saved!', severity: 'success' });
        });

        it('defaults the severity to info', () => {
            const { result } = renderHook(() => useToast());
            act(() => result.current.showToast('Heads up'));
            expect(result.current.toast.severity).toBe('info');
        });
    });

    describe('closeToast', () => {
        it('closes the toast but keeps the last message', () => {
            const { result } = renderHook(() => useToast());
            act(() => result.current.showToast('Oops', 'error'));
            act(() => result.current.closeToast());
            expect(result.current.toast).toEqual({ open: false, message: 'Oops', severity: 'error' });
        });
    });
});
