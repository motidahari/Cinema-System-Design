import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserDao } from '../../src/auth/dao/user.dao';
import { UserEntity } from '../../src/domain/entities/user.entity';
import { RecordNotFoundException } from '@cinema/shared';
import { identityTestDataSourceOptions } from './helpers/db.helper';

const RUN = randomUUID().slice(0, 8);
const u = (name: string) => `${name}-${RUN}@cinema.test`;

describe('UserDao (integration)', () => {
    let module: TestingModule;
    let dao: UserDao;
    let dataSource: DataSource;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [TypeOrmModule.forRoot(identityTestDataSourceOptions()), TypeOrmModule.forFeature([UserEntity])],
            providers: [UserDao],
        }).compile();

        dao = module.get(UserDao);
        dataSource = module.get(DataSource);
    });

    afterEach(async () => {
        await dataSource.query(`DELETE FROM identity.users WHERE email LIKE $1`, [`%-${RUN}@cinema.test`]);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('create, Given:Valid email and passwordHash, When:Creating', () => {
        it('should persist the user and return a UserModel with a generated UUID', async () => {
            const user = await dao.create({ email: u('alice'), passwordHash: 'hashed-pw' });

            expect(user.id).toBeDefined();
            expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(user.email).toBe(u('alice'));
            expect(user.passwordHash).toBe('hashed-pw');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should normalize email to lowercase before persisting', async () => {
            const user = await dao.create({ email: `Bob-${RUN}@Cinema.TEST`, passwordHash: 'hashed-pw' });
            expect(user.email).toBe(u('bob'));
        });
    });

    describe('create, Given:Duplicate email, When:Creating a second user', () => {
        it('should throw a unique constraint violation', async () => {
            await dao.create({ email: u('dup'), passwordHash: 'h1' });
            await expect(dao.create({ email: u('dup'), passwordHash: 'h2' })).rejects.toThrow();
        });
    });

    describe('findByEmail, Given:An existing user, When:Looking up by exact email', () => {
        it('should return the matching UserModel', async () => {
            await dao.create({ email: u('carol'), passwordHash: 'hashed' });

            const found = await dao.findByEmail(u('carol'));

            expect(found).not.toBeNull();
            expect(found!.email).toBe(u('carol'));
        });
    });

    describe('findByEmail, Given:An existing user, When:Looking up with mixed case', () => {
        it('should find the user via case-insensitive normalization', async () => {
            await dao.create({ email: u('dave'), passwordHash: 'hashed' });

            const found = await dao.findByEmail(`Dave-${RUN}@Cinema.TEST`);

            expect(found).not.toBeNull();
            expect(found!.email).toBe(u('dave'));
        });
    });

    describe('findByEmail, Given:No matching user, When:Looking up', () => {
        it('should return null', async () => {
            const found = await dao.findByEmail(u('nobody'));
            expect(found).toBeNull();
        });
    });

    describe('findById, Given:An existing user, When:Looking up by id', () => {
        it('should return the matching UserModel', async () => {
            const created = await dao.create({ email: u('eve'), passwordHash: 'hashed' });

            const found = await dao.findById(created.id);

            expect(found).not.toBeNull();
            expect(found!.id).toBe(created.id);
            expect(found!.email).toBe(u('eve'));
        });
    });

    describe('findById, Given:A non-existent id, When:Looking up', () => {
        it('should return null', async () => {
            const found = await dao.findById('aaaaaaaa-0000-4000-8000-000000000099');
            expect(found).toBeNull();
        });
    });

    describe('getById, Given:An existing user, When:Looking up by id', () => {
        it('should return the matching UserModel', async () => {
            const created = await dao.create({ email: u('frank'), passwordHash: 'hashed' });

            const found = await dao.getById(created.id);

            expect(found.id).toBe(created.id);
            expect(found.email).toBe(u('frank'));
        });
    });

    describe('getById, Given:A non-existent id, When:Looking up', () => {
        it('should throw RecordNotFoundException', async () => {
            await expect(dao.getById('aaaaaaaa-0000-4000-8000-000000000099')).rejects.toThrow(RecordNotFoundException);
        });
    });
});
