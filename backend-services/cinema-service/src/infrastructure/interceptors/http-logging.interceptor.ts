import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { Logger } from '@cinema/shared';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const { method, url } = req;
        const start = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const res = ctx.switchToHttp().getResponse<Response>();
                    Logger.info('HTTP response', { method, url, status: res.statusCode, ms: Date.now() - start });
                },
                error: () => {
                    Logger.warning('HTTP error', { method, url, ms: Date.now() - start });
                },
            })
        );
    }
}
