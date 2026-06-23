import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
    private static readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (CsrfGuard.SAFE_METHODS.has(req.method)) return true;

        const cookieToken = (req.cookies as Record<string, string> | undefined)?.['csrf_token'];
        const headerToken = req.headers['x-csrf-token'];

        if (!cookieToken || cookieToken !== headerToken) {
            throw new ForbiddenException('CSRF token mismatch');
        }
        return true;
    }
}
