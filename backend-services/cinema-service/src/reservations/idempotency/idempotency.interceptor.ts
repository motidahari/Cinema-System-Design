import { createHash } from 'crypto';
import {
    CallHandler,
    ConflictException,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/guards/remote-auth.guard';
import { AppConfig } from '../../infrastructure/config/app.config';
import { IdempotencyDao } from './idempotency.dao';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(
        private readonly dao: IdempotencyDao,
        private readonly cfg: AppConfig
    ) {}

    async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        const key = req.headers['idempotency-key'] as string | undefined;
        if (!key) return next.handle();

        const userId = req.user.userId;
        const requestHash = createHash('sha256')
            .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`)
            .digest('hex');

        const claimed = await this.dao.tryClaim({
            userId,
            idempotencyKey: key,
            requestHash,
            expiresAt: new Date(Date.now() + this.cfg.idempotencyTtlHours * 3_600_000),
        });

        if (!claimed) {
            const existing = await this.dao.find(userId, key);

            if (existing.requestHash !== requestHash) {
                throw new UnprocessableEntityException('Idempotency-Key reused with a different request body');
            }
            if (existing.responseStatus == null) {
                // First request still in-flight — the row was claimed but not yet completed.
                throw new ConflictException('A request with this Idempotency-Key is still processing');
            }
            // Replay the cached response verbatim.
            const res = ctx.switchToHttp().getResponse<Response>();
            res.status(existing.responseStatus);
            return of(existing.responseBody);
        }

        // We own the key — run the handler, then persist its result for future replays.
        return next.handle().pipe(
            tap(async (body) => {
                await this.dao.complete(userId, key, {
                    status: HttpStatus.CREATED,
                    body,
                    reservationId: (body as { id?: string })?.id,
                });
            })
        );
    }
}
