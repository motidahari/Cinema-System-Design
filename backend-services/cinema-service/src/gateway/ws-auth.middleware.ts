import * as cookie from 'cookie';
import type { Socket } from 'socket.io';
import { IdentityClient } from '@cinema/internal-sdk';
import { Logger } from '@cinema/shared';

export interface ExtendedSocket extends Socket {
    user: { userId: string; email: string };
}

export function createWsAuthMiddleware(identityClient: IdentityClient) {
    return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
        try {
            const raw = socket.handshake.headers.cookie ?? '';
            const token = cookie.parse(raw)['access_token'];
            if (!token) return next(new Error('Unauthorized'));
            const user = await identityClient.validate(token);
            (socket as ExtendedSocket).user = user;
            next();
        } catch {
            Logger.warning('WS handshake auth failed', { socketId: socket.id });
            next(new Error('Unauthorized'));
        }
    };
}
