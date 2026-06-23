import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from '../../src/infrastructure/guards/csrf.guard';

function makeCtx(opts: {
    method: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
}): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({
                method: opts.method,
                cookies: opts.cookies ?? {},
                headers: opts.headers ?? {},
            }),
        }),
    } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
    let guard: CsrfGuard;

    beforeEach(() => {
        guard = new CsrfGuard();
    });

    describe('safe methods, Given:Any request, When:Using GET/HEAD/OPTIONS', () => {
        it.each(['GET', 'HEAD', 'OPTIONS'])('should pass %s without inspecting CSRF tokens', (method) => {
            const ctx = makeCtx({ method });
            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    describe('mutating methods, Given:Matching tokens, When:Using POST', () => {
        it('should pass when csrf_token cookie equals X-CSRF-Token header', () => {
            const ctx = makeCtx({
                method: 'POST',
                cookies: { csrf_token: 'secret-token' },
                headers: { 'x-csrf-token': 'secret-token' },
            });
            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    describe('mutating methods, Given:Mismatched tokens, When:Using POST', () => {
        it('should throw ForbiddenException when header does not match cookie', () => {
            const ctx = makeCtx({
                method: 'POST',
                cookies: { csrf_token: 'real-token' },
                headers: { 'x-csrf-token': 'attacker-token' },
            });
            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });
    });

    describe('mutating methods, Given:Missing csrf_token cookie, When:Using POST', () => {
        it('should throw ForbiddenException', () => {
            const ctx = makeCtx({
                method: 'POST',
                cookies: {},
                headers: { 'x-csrf-token': 'abc' },
            });
            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });
    });

    describe('mutating methods, Given:Missing X-CSRF-Token header, When:Using POST', () => {
        it('should throw ForbiddenException', () => {
            const ctx = makeCtx({
                method: 'POST',
                cookies: { csrf_token: 'abc' },
                headers: {},
            });
            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });
    });

    describe('mutating methods, Given:Matching tokens, When:Using PUT/PATCH/DELETE', () => {
        it.each(['PUT', 'PATCH', 'DELETE'])('should pass %s when tokens match', (method) => {
            const ctx = makeCtx({
                method,
                cookies: { csrf_token: 'tok' },
                headers: { 'x-csrf-token': 'tok' },
            });
            expect(guard.canActivate(ctx)).toBe(true);
        });
    });
});
