import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import { Reservation } from '../models/Reservation';
import type { CancelDto, ConfirmDto, MyReservationsResponse, ReservationDto, ReserveDto } from '../types';

// `reserve` sends an Idempotency-Key so a double-submit or transparent 401-retry
// can never create a second reservation. The same config object is reused on retry,
// keeping the key stable for the lifetime of one logical request.
export class ReservationService extends BaseHttpService {
    constructor() {
        super(appConfig.cinemaApiUrl);
    }

    async reserve(dto: ReserveDto): Promise<Reservation> {
        const res = await this.http.post<ReservationDto>('/reservations', dto, {
            headers: { 'Idempotency-Key': crypto.randomUUID() },
        });
        return new Reservation(res.data);
    }

    async confirm(dto: ConfirmDto): Promise<Reservation> {
        const res = await this.http.post<ReservationDto>(`/reservations/${dto.reservationId}/confirm`);
        return new Reservation(res.data);
    }

    // Cancels every active reservation the caller owns; the server resolves the user from
    // the auth context, so no id is sent. `_dto` keeps the store/service signature aligned.
    async cancel(_dto: CancelDto): Promise<void> {
        await this.http.delete('/reservations');
    }

    async getReservations(): Promise<{ reservations: Reservation[] }> {
        const res = await this.http.get<MyReservationsResponse>('/reservations');
        return { reservations: res.data.reservations.map((reservation) => new Reservation(reservation)) };
    }
}

export const reservationService = new ReservationService();
