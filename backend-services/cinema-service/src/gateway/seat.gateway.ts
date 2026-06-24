import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { IdentityClient } from '@cinema/internal-sdk';
import { Logger } from '@cinema/shared';
import { AppConfig } from '../infrastructure/config/app.config';
import { SeatModel } from '../seats/domain-model/seat';
import { createWsAuthMiddleware } from './ws-auth.middleware';

@WebSocketGateway({
    cors: { origin: true, credentials: true },
    namespace: '/',
})
export class SeatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private readonly server!: Server;

    private readonly identityClient: IdentityClient;

    constructor(appConfig: AppConfig) {
        this.identityClient = new IdentityClient(appConfig.identityServiceUrl);
    }

    afterInit(server: Server): void {
        server.use(createWsAuthMiddleware(this.identityClient));
    }

    handleConnection(client: Socket): void {
        Logger.info('WS client connected', { socketId: client.id });
    }

    handleDisconnect(client: Socket): void {
        Logger.info('WS client disconnected', { socketId: client.id });
    }

    emitSeatReserved(seats: SeatModel[]): void {
        this.server.emit('seat:reserved', { seats: seats.map((s) => this.toPayload(s)) });
    }

    emitSeatBooked(seats: SeatModel[]): void {
        this.server.emit('seat:booked', { seats: seats.map((s) => this.toPayload(s)) });
    }

    emitSeatReleased(seats: SeatModel[]): void {
        this.server.emit('seat:released', { seats: seats.map((s) => this.toPayload(s)) });
    }

    private toPayload(s: SeatModel) {
        return { id: s.id, row: s.row, number: s.number, status: s.status };
    }
}
