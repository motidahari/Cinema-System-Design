import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import type { MyReservationsResponse, Reservation, ReserveDto } from '../types';

// Reservation lifecycle calls against cinema-service. All mutating calls carry the
// X-CSRF-Token header automatically (added by BaseHttpService); `reserve` additionally
// sends an `Idempotency-Key` so a double-submit or a transparent 401-retry can never
// create a second reservation (ADR-11). The same axios config object is reused on
// retry, so the key is stable for the lifetime of one logical request.
export class ReservationService extends BaseHttpService {
    constructor() {
        super(appConfig.cinemaApiUrl);
    }

    async reserve(dto: ReserveDto): Promise<Reservation> {
        const res = await this.http.post<Reservation>('/reservations', dto, {
            headers: { 'Idempotency-Key': crypto.randomUUID() },
        });
        return res.data;
    }

    async confirm(reservationId: string): Promise<Reservation> {
        const res = await this.http.post<Reservation>(`/reservations/${reservationId}/confirm`);
        return res.data;
    }

    async cancel(reservationId: string): Promise<void> {
        await this.http.delete(`/reservations/${reservationId}`);
    }

    async getMyReservations(): Promise<MyReservationsResponse> {
        const res = await this.http.get<MyReservationsResponse>('/reservations/my');
        return res.data;
    }
}

export const reservationService = new ReservationService();
