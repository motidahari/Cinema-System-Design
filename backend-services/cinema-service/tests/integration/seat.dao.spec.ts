import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SeatDao } from '../../src/seats/dao/seat.dao';
import { SeatEntity } from '../../src/domain/entities/seat.entity';
import { SeatModel } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';
import { cinemaTestDataSourceOptions } from './helpers/db.helper';

describe('SeatDao (integration)', () => {
    let module: TestingModule;
    let dao: SeatDao;
    let dataSource: DataSource;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [TypeOrmModule.forRoot(cinemaTestDataSourceOptions()), TypeOrmModule.forFeature([SeatEntity])],
            providers: [SeatDao],
        }).compile();

        dao = module.get(SeatDao);
        dataSource = module.get(DataSource);
    });

    afterEach(async () => {
        await dataSource.query(`DELETE FROM cinema.seats`);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('insertMany, Given:A list of seats, When:Inserting', () => {
        it('should persist every seat with a generated UUID and AVAILABLE default', async () => {
            await dao.insertMany([
                { row: 'A', number: 1 },
                { row: 'A', number: 2 },
            ]);

            const seats = await dao.findAll();
            expect(seats).toHaveLength(2);
            expect(seats[0]).toBeInstanceOf(SeatModel);
            expect(seats[0].id).toMatch(/^[0-9a-f-]{36}$/);
            expect(seats[0].status).toBe(SeatStatus.AVAILABLE);
        });

        it('should be a no-op for an empty list', async () => {
            await dao.insertMany([]);
            expect(await dao.countAll()).toBe(0);
        });

        it('should reject a duplicate (row, number) position', async () => {
            await dao.insertMany([{ row: 'B', number: 1 }]);
            await expect(dao.insertMany([{ row: 'B', number: 1 }])).rejects.toThrow();
        });
    });

    describe('findAll, Given:Seats out of order, When:Fetching all', () => {
        it('should return seats ordered by row then number', async () => {
            await dao.insertMany([
                { row: 'B', number: 2 },
                { row: 'A', number: 10 },
                { row: 'A', number: 1 },
            ]);

            const seats = await dao.findAll();

            expect(seats.map((s) => `${s.row}${s.number}`)).toEqual(['A1', 'A10', 'B2']);
        });

        it('should return an empty array when there are no seats', async () => {
            expect(await dao.findAll()).toEqual([]);
        });
    });

    describe('findByIds, Given:Existing seats, When:Looking up by ids', () => {
        it('should return only the matching seats', async () => {
            await dao.insertMany([
                { row: 'A', number: 1 },
                { row: 'A', number: 2 },
                { row: 'A', number: 3 },
            ]);
            const all = await dao.findAll();
            const wanted = [all[0].id, all[2].id];

            const found = await dao.findByIds(wanted);

            expect(found.map((s) => s.id).sort()).toEqual([...wanted].sort());
        });

        it('should return an empty array for an empty id list', async () => {
            await dao.insertMany([{ row: 'A', number: 1 }]);
            expect(await dao.findByIds([])).toEqual([]);
        });
    });

    describe('countAll, Given:Seeded seats, When:Counting', () => {
        it('should return the number of rows', async () => {
            await dao.insertMany([
                { row: 'A', number: 1 },
                { row: 'A', number: 2 },
            ]);
            expect(await dao.countAll()).toBe(2);
        });
    });

    describe('findById, Given:An existing seat, When:Looking up by id', () => {
        it('should return the matching SeatModel', async () => {
            await dao.insertMany([{ row: 'C', number: 4 }]);
            const [seat] = await dao.findAll();

            const found = await dao.findById(seat.id);

            expect(found).not.toBeNull();
            expect(found!.row).toBe('C');
            expect(found!.number).toBe(4);
        });

        it('should return null for a non-existent id', async () => {
            expect(await dao.findById('aaaaaaaa-0000-4000-8000-000000000099')).toBeNull();
        });
    });
});
