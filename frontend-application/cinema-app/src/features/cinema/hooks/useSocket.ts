import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { appConfig } from '@/core/config/app.config';
import { useCinemaStore } from '../stores/useCinemaStore';
import { SeatStatus } from '../enums';
import type { SeatDto } from '../types';

interface SeatEventPayload {
    seats: SeatDto[];
}

// Realtime seating updates. No token argument — the browser sends the access_token
// cookie on the WS upgrade because we pass withCredentials, and the connection is
// gated by `isAuthenticated`. Incoming seat events patch the cinema store in place;
// on every reconnect we resync the full map since broadcasts may have been missed
// while disconnected.
export function useSocket(isAuthenticated: boolean) {
    const socketRef = useRef<Socket | null>(null);
    const updateSeatsStatus = useCinemaStore((s) => s.updateSeatsStatus);
    const getSeatingMap = useCinemaStore((s) => s.getSeatingMap);

    useEffect(() => {
        if (!isAuthenticated) return;

        const socket = io(appConfig.socketUrl, {
            withCredentials: true, // send access_token cookie on the upgrade
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => console.info('[Socket] Connected', socket.id));
        socket.on('disconnect', (reason) => console.warn('[Socket] Disconnected', reason));
        socket.on('connect_error', (err) => console.error('[Socket] Connection error', err.message));

        // Reconnect re-fetch: resync the authoritative map after any (re)connect.
        socket.io.on('reconnect', () => {
            console.info('[Socket] Reconnected — resyncing seating map');
            void getSeatingMap();
        });

        socket.on('seat:reserved', ({ seats }: SeatEventPayload) => {
            updateSeatsStatus(
                seats.map((s) => s.id),
                SeatStatus.RESERVED
            );
        });
        socket.on('seat:booked', ({ seats }: SeatEventPayload) => {
            updateSeatsStatus(
                seats.map((s) => s.id),
                SeatStatus.BOOKED
            );
        });
        socket.on('seat:released', ({ seats }: SeatEventPayload) => {
            updateSeatsStatus(
                seats.map((s) => s.id),
                SeatStatus.AVAILABLE
            );
        });

        return () => {
            socket.io.off('reconnect');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, updateSeatsStatus, getSeatingMap]);

    return { socket: socketRef.current };
}
