import { Logger } from '../src/logger/logger';
import { runWithContext } from '../src/logger/request-context';

describe('Logger', () => {
    let lines: string[];

    beforeEach(() => {
        lines = [];
        jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
            lines.push(String(chunk));
            return true;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('emits structured JSON for info level', () => {
        Logger.info('hello', { key: 'val' });
        const entry = JSON.parse(lines[0]);
        expect(entry.level).toBe('info');
        expect(entry.message).toBe('hello');
        expect(entry.key).toBe('val');
        expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('emits warning level', () => {
        Logger.warning('warn msg');
        expect(JSON.parse(lines[0]).level).toBe('warning');
    });

    it('emits error level', () => {
        Logger.error('err msg');
        expect(JSON.parse(lines[0]).level).toBe('error');
    });

    it('includes requestId when inside runWithContext', () => {
        runWithContext('req-abc-123', () => {
            Logger.info('inside context');
        });
        expect(JSON.parse(lines[0]).requestId).toBe('req-abc-123');
    });

    it('requestId is undefined outside context', () => {
        Logger.info('outside context');
        expect(JSON.parse(lines[0]).requestId).toBeUndefined();
    });

    it('isolates requestId per async context', () => {
        runWithContext('req-1', () => Logger.info('first'));
        runWithContext('req-2', () => Logger.info('second'));
        expect(JSON.parse(lines[0]).requestId).toBe('req-1');
        expect(JSON.parse(lines[1]).requestId).toBe('req-2');
    });
});
