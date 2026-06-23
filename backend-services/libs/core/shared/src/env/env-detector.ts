export type AppEnvironment = 'local' | 'sandbox' | 'production';

export function detectEnvironment(): AppEnvironment {
    const env = process.env.NODE_ENV;
    if (env === 'production') return 'production';
    if (env === 'sandbox') return 'sandbox';
    return 'local';
}
