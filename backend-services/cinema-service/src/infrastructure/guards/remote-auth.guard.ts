import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { IdentityClient } from '@cinema/internal-sdk';
import { AppConfig } from '../config/app.config';

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

/**
 * cinema-service is a resource server: it does not own the JWT secret. This guard
 * reads the `access_token` cookie (Bearer as fallback) and forwards it as a cookie
 * to identity-service's `/api/v1/auth/validate` to authenticate the request.
 */
@Injectable()
export class RemoteAuthGuard implements CanActivate {
    private readonly identityClient: IdentityClient;

    constructor(appConfig: AppConfig) {
        this.identityClient = new IdentityClient(appConfig.identityServiceUrl);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const cookieToken = (request.cookies as Record<string, string> | undefined)?.['access_token'];
        const bearer = request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.substring(7)
            : undefined;
        const token = cookieToken ?? bearer;

        if (!token) {
            throw new UnauthorizedException('Missing authentication');
        }

        try {
            (request as AuthenticatedRequest).user = await this.identityClient.validate(token);
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
