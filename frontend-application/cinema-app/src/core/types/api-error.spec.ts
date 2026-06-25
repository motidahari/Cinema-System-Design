import { describe, it, expect } from 'vitest';
import { isApiError } from './api-error';

describe('isApiError', () => {
    describe('when given an axios-style error', () => {
        it('returns true for an object carrying a response payload', () => {
            const err = { response: { status: 409, data: { errorCode: 409, errorMessage: 'Email taken' } } };
            expect(isApiError(err)).toBe(true);
        });

        it('narrows so the errorMessage is readable', () => {
            const err: unknown = { response: { data: { errorMessage: 'boom' } } };
            expect(isApiError(err) ? err.response?.data?.errorMessage : null).toBe('boom');
        });
    });

    describe('when given a non-api error', () => {
        it('returns false for a plain Error', () => {
            expect(isApiError(new Error('network'))).toBe(false);
        });

        it.each([null, undefined, 'string', 42, {}])('returns false for %s', (value) => {
            expect(isApiError(value)).toBe(false);
        });
    });
});
