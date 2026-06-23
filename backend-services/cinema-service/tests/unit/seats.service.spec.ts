import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SeatsService } from '../../src/seats/service/seats.service';
import { SeatDao } from '../../src/seats/dao/seat.dao';
import { SeatModel } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';

const makeSeat = (row: string, number: number, status = SeatStatus.AVAILABLE): SeatModel =>
    new SeatModel({
        id: randomUUID(),
        row,
        number,
        status,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

describe('SeatsService', () => {
    let service: SeatsService;
    let seatDao: { findAll: jest.Mock };

    beforeEach(async () => {
        seatDao = { findAll: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [SeatsService, { provide: SeatDao, useValue: seatDao }],
        }).compile();

        service = module.get(SeatsService);
    });

    describe('getSeatingMap, Given:Seats exist, When:Fetching the map', () => {
        it('should return all seats from the DAO', async () => {
            const seats = [makeSeat('A', 1), makeSeat('A', 2, SeatStatus.RESERVED)];
            seatDao.findAll.mockResolvedValue(seats);

            const result = await service.getSeatingMap();

            expect(result).toBe(seats);
            expect(seatDao.findAll).toHaveBeenCalledTimes(1);
        });
    });

    describe('getSeatingMap, Given:No seats, When:Fetching the map', () => {
        it('should return an empty array', async () => {
            seatDao.findAll.mockResolvedValue([]);

            const result = await service.getSeatingMap();

            expect(result).toEqual([]);
        });
    });
});
