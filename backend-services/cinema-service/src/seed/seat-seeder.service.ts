import { Injectable } from '@nestjs/common';
import { Logger } from '@cinema/shared';
import { SeatDao } from '../seats/dao/seat.dao';

@Injectable()
export class SeatSeederService {
    constructor(private readonly seatDao: SeatDao) {}

    async seedIfEmpty(): Promise<void> {
        const count = await this.seatDao.countAll();
        if (count > 0) {
            Logger.info('Seats already seeded', { count });
            return;
        }

        const seeds: Array<{ row: string; number: number }> = [];

        // Section A: rows A–J, seats 1–10
        for (const row of 'ABCDEFGHIJ') {
            for (let n = 1; n <= 10; n++) {
                seeds.push({ row, number: n });
            }
        }

        // Section B: rows K–M, seats 1–5
        for (const row of 'KLM') {
            for (let n = 1; n <= 5; n++) {
                seeds.push({ row, number: n });
            }
        }

        await this.seatDao.insertMany(seeds);
        Logger.info('Seats seeded', { count: seeds.length });
    }
}
