import { Logger } from '../logger/logger';

export abstract class BaseCronJob {
    private running = false;

    protected async runWithGuard(name: string, fn: () => Promise<void>): Promise<void> {
        if (this.running) {
            Logger.warning(`${name}: skipping tick — previous run still in progress`);
            return;
        }
        this.running = true;
        try {
            await fn();
        } catch (err) {
            Logger.error(`${name}: unhandled error in cron tick`, { error: String(err) });
        } finally {
            this.running = false;
        }
    }
}
