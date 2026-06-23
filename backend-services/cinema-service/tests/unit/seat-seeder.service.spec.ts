import { Test, TestingModule } from '@nestjs/testing';
import { SeatSeederService } from '../../src/seed/seat-seeder.service';
import { SeatDao } from '../../src/seats/dao/seat.dao';

describe('SeatSeederService', () => {
    let service: SeatSeederService;
    let seatDao: { countAll: jest.Mock; insertMany: jest.Mock };

    beforeEach(async () => {
        seatDao = { countAll: jest.fn(), insertMany: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [SeatSeederService, { provide: SeatDao, useValue: seatDao }],
        }).compile();

        service = module.get(SeatSeederService);
    });

    describe('seedIfEmpty, Given:An empty seats table, When:Seeding', () => {
        beforeEach(() => seatDao.countAll.mockResolvedValue(0));

        it('should insert exactly 115 seats', async () => {
            await service.seedIfEmpty();

            expect(seatDao.insertMany).toHaveBeenCalledTimes(1);
            const seeds = seatDao.insertMany.mock.calls[0][0] as Array<{ row: string; number: number }>;
            expect(seeds).toHaveLength(115);
        });

        it('should generate 100 Section A seats (A–J × 1–10)', async () => {
            await service.seedIfEmpty();

            const seeds = seatDao.insertMany.mock.calls[0][0] as Array<{ row: string; number: number }>;
            const sectionA = seeds.filter((s) => 'ABCDEFGHIJ'.includes(s.row));
            expect(sectionA).toHaveLength(100);
            expect(sectionA.every((s) => s.number >= 1 && s.number <= 10)).toBe(true);
        });

        it('should generate 15 Section B seats (K–M × 1–5)', async () => {
            await service.seedIfEmpty();

            const seeds = seatDao.insertMany.mock.calls[0][0] as Array<{ row: string; number: number }>;
            const sectionB = seeds.filter((s) => 'KLM'.includes(s.row));
            expect(sectionB).toHaveLength(15);
            expect(sectionB.every((s) => s.number >= 1 && s.number <= 5)).toBe(true);
        });

        it('should not produce duplicate (row, number) positions', async () => {
            await service.seedIfEmpty();

            const seeds = seatDao.insertMany.mock.calls[0][0] as Array<{ row: string; number: number }>;
            const keys = new Set(seeds.map((s) => `${s.row}${s.number}`));
            expect(keys.size).toBe(115);
        });
    });

    describe('seedIfEmpty, Given:Seats already exist, When:Seeding', () => {
        it('should be idempotent and not insert anything', async () => {
            seatDao.countAll.mockResolvedValue(115);

            await service.seedIfEmpty();

            expect(seatDao.insertMany).not.toHaveBeenCalled();
        });
    });
});
