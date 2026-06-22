import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from '@cinema/internal-sdk';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorMessage = 'An unexpected error occurred';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                errorMessage = res;
            } else {
                const resObj = res as { message?: string | string[] };
                errorMessage = Array.isArray(resObj.message)
                    ? resObj.message.join('; ')
                    : (resObj.message ?? errorMessage);
            }
        }

        if (status >= 500) {
            Logger.error('Internal server error', { status, errorMessage, path: request.url });
        } else {
            Logger.warning('HTTP exception', { status, errorMessage, path: request.url });
        }

        response.status(status).json({ errorCode: status, errorMessage });
    }
}
