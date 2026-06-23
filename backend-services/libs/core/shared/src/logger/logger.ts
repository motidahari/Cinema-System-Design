import { requestContext } from './request-context';

type Level = 'info' | 'warning' | 'error';

function emit(level: Level, message: string, meta: Record<string, unknown> = {}): void {
    const requestId = requestContext.getStore()?.requestId;
    process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, message, requestId, ...meta }) + '\n');
}

export const Logger = {
    info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
    warning: (message: string, meta?: Record<string, unknown>) => emit('warning', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
