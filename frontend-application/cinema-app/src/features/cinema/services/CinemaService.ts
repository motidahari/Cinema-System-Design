import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import { Seat } from '../models/Seat';
import type { SeatingMapResponse } from '../types';

// Read-only access to the cinema-service seating map. Cookies are sent automatically
// by BaseHttpService (withCredentials); a 401 transparently triggers a single refresh.
// The raw SeatDto payload is hydrated into Seat domain models before returning, so the
// store always receives domain objects it can work with.
export class CinemaService extends BaseHttpService {
    constructor() {
        super(appConfig.cinemaApiUrl);
    }

    async getSeatingMap(): Promise<{ seats: Seat[] }> {
        const res = await this.http.get<SeatingMapResponse>('/seats');
        return { seats: res.data.seats.map((seat) => new Seat(seat)) };
    }
}

export const cinemaService = new CinemaService();
