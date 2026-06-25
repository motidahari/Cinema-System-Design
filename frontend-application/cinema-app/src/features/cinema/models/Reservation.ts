import type { ReservationDto, ReservationStatus } from '../types';

// Reservation domain model. Services hydrate the raw ReservationDto into this class so
// consumers get lifecycle predicates instead of inspecting the status string directly.
export class Reservation {
    readonly id: string;
    readonly status: ReservationStatus;
    readonly expiresAt: string;
    readonly expiresInSeconds: number;
    readonly seatIds: string[];

    constructor(data: ReservationDto) {
        this.id = data.id;
        this.status = data.status;
        this.expiresAt = data.expiresAt;
        this.expiresInSeconds = data.expiresInSeconds;
        this.seatIds = data.seatIds;
    }

    get isPending(): boolean {
        return this.status === 'PENDING';
    }

    get isConfirmed(): boolean {
        return this.status === 'CONFIRMED';
    }

    get isExpired(): boolean {
        return this.status === 'EXPIRED';
    }

    get isCancelled(): boolean {
        return this.status === 'CANCELLED';
    }

    get seatCount(): number {
        return this.seatIds.length;
    }
}
