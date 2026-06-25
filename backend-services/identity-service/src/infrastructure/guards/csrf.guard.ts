import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
    private static readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
    // These endpoints establish the session — the user has no cookie yet, so CSRF cannot apply.
    private static readonly PRE_AUTH_PATHS = new Set(['/api/v1/auth/register', '/api/v1/auth/login']);

    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (CsrfGuard.SAFE_METHODS.has(req.method)) return true;
        if (CsrfGuard.PRE_AUTH_PATHS.has(req.path)) return true;

        const cookieToken = (req.cookies as Record<string, string> | undefined)?.['csrf_token'];
        const headerToken = req.headers['x-csrf-token'];

        if (!cookieToken || cookieToken !== headerToken) {
            throw new ForbiddenException('CSRF token mismatch');
        }
        return true;
    }
}
