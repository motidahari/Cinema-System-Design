import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from '@cinema/shared';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const requestId = (req.headers['x-request-id'] as string) || randomUUID();
        res.setHeader('X-Request-Id', requestId);
        requestContext.run({ requestId }, () => next());
    }
}
