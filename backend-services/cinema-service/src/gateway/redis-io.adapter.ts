import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server, ServerOptions } from 'socket.io';
import { Logger } from '@cinema/shared';

/**
 * Socket.io adapter backed by Redis pub/sub (ADR-10). With more than one cinema-service
 * replica, a local `server.emit()` only reaches sockets on the same process; the Redis
 * adapter fans every broadcast out across all replicas so `seat:reserved/booked/released`
 * reach every connected client regardless of which instance they're attached to.
 *
 * Only used when `REDIS_URL` is set (see main.ts) — single-instance local runs keep the
 * default in-memory adapter and need no Redis.
 */
export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor?: ReturnType<typeof createAdapter>;

    constructor(
        app: INestApplicationContext,
        private readonly redisUrl: string
    ) {
        super(app);
    }

    async connectToRedis(): Promise<void> {
        const pubClient = createClient({ url: this.redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        this.adapterConstructor = createAdapter(pubClient, subClient);
        Logger.info('Socket.io Redis adapter connected', { redisUrl: this.redisUrl });
    }

    createIOServer(port: number, options?: ServerOptions): Server {
        const server = super.createIOServer(port, options) as Server;
        if (this.adapterConstructor) server.adapter(this.adapterConstructor);
        return server;
    }
}
