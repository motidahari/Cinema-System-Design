import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import { Reservation } from '../models/Reservation';
import type { CancelDto, ConfirmDto, MyReservationsResponse, ReservationDto, ReserveDto } from '../types';

// Reservation lifecycle calls against cinema-service. All mutating calls carry the
// X-CSRF-Token header automatically (added by BaseHttpService); `reserve` additionally
// sends an `Idempotency-Key` so a double-submit or a transparent 401-retry can never
// create a second reservation (ADR-11). The same axios config object is reused on
// retry, so the key is stable for the lifetime of one logical request.
//
// Every raw payload is hydrated into a Reservation domain model before returning, so
// the store always receives a domain object it can work with.
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

    async cancel(dto: CancelDto): Promise<void> {
        await this.http.delete(`/reservations/${dto.reservationId}`);
    }

    async getMyReservations(): Promise<{ reservations: Reservation[] }> {
        const res = await this.http.get<MyReservationsResponse>('/reservations/my');
        return { reservations: res.data.reservations.map((reservation) => new Reservation(reservation)) };
    }
}

export const reservationService = new ReservationService();
