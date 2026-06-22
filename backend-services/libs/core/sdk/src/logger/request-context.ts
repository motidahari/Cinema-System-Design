import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
    requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithContext(requestId: string, fn: () => void): void {
    requestContext.run({ requestId }, fn);
}
