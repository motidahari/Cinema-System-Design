import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import type { SeatingMapResponse } from '../types';

// Read-only access to the cinema-service seating map. Cookies are sent automatically
// by BaseHttpService (withCredentials); a 401 transparently triggers a single refresh.
export class CinemaService extends BaseHttpService {
    constructor() {
        super(appConfig.cinemaApiUrl);
    }

    async getSeatingMap(): Promise<SeatingMapResponse> {
        const res = await this.http.get<SeatingMapResponse>('/seats');
        return res.data;
    }
}

export const cinemaService = new CinemaService();
