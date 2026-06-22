type Level = 'info' | 'warning' | 'error';

function emit(level: Level, message: string, meta: Record<string, unknown> = {}): void {
    process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }) + '\n');
}

export const Logger = {
    info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
    warning: (message: string, meta?: Record<string, unknown>) => emit('warning', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
