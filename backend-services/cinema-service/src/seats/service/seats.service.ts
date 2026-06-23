import { Injectable } from '@nestjs/common';
import { Logger } from '@cinema/shared';
import { SeatDao } from '../dao/seat.dao';
import { SeatModel } from '../domain-model/seat';

@Injectable()
export class SeatsService {
    constructor(private readonly seatDao: SeatDao) {}

    async getSeatingMap(): Promise<SeatModel[]> {
        Logger.info('Fetching full seating map');
        return this.seatDao.findAll();
    }
}
