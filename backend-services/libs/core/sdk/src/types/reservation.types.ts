import { ReservationStatus } from '../enums/reservation-status.enum';

export interface Reservation {
    id: string;
    status: ReservationStatus;
    expiresAt: string;
    expiresInSeconds: number;
    seatIds: string[];
}
