import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserDao } from '../../src/auth/dao/user.dao';
import { UserEntity } from '../../src/domain/entities/user.entity';
import { identityTestDataSourceOptions } from './helpers/db.helper';

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
        await dataSource.query(`DELETE FROM identity.users`);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('create, Given:Valid email and passwordHash, When:Creating', () => {
        it('should persist the user and return a UserModel with a generated UUID', async () => {
            const user = await dao.create({ email: 'alice@cinema.test', passwordHash: 'hashed-pw' });

            expect(user.id).toBeDefined();
            expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(user.email).toBe('alice@cinema.test');
            expect(user.passwordHash).toBe('hashed-pw');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should normalize email to lowercase before persisting', async () => {
            const user = await dao.create({ email: 'Bob@Cinema.TEST', passwordHash: 'hashed-pw' });
            expect(user.email).toBe('bob@cinema.test');
        });
    });

    describe('create, Given:Duplicate email, When:Creating a second user', () => {
        it('should throw a unique constraint violation', async () => {
            await dao.create({ email: 'dup@cinema.test', passwordHash: 'h1' });
            await expect(dao.create({ email: 'dup@cinema.test', passwordHash: 'h2' })).rejects.toThrow();
        });
    });

    describe('findByEmail, Given:An existing user, When:Looking up by exact email', () => {
        it('should return the matching UserModel', async () => {
            await dao.create({ email: 'carol@cinema.test', passwordHash: 'hashed' });

            const found = await dao.findByEmail('carol@cinema.test');

            expect(found).not.toBeNull();
            expect(found!.email).toBe('carol@cinema.test');
        });
    });

    describe('findByEmail, Given:An existing user, When:Looking up with mixed case', () => {
        it('should find the user via case-insensitive normalization', async () => {
            await dao.create({ email: 'dave@cinema.test', passwordHash: 'hashed' });

            const found = await dao.findByEmail('Dave@Cinema.TEST');

            expect(found).not.toBeNull();
            expect(found!.email).toBe('dave@cinema.test');
        });
    });

    describe('findByEmail, Given:No matching user, When:Looking up', () => {
        it('should return null', async () => {
            const found = await dao.findByEmail('nobody@cinema.test');
            expect(found).toBeNull();
        });
    });

    describe('findById, Given:An existing user, When:Looking up by id', () => {
        it('should return the matching UserModel', async () => {
            const created = await dao.create({ email: 'eve@cinema.test', passwordHash: 'hashed' });

            const found = await dao.findById(created.id);

            expect(found).not.toBeNull();
            expect(found!.id).toBe(created.id);
            expect(found!.email).toBe('eve@cinema.test');
        });
    });

    describe('findById, Given:A non-existent id, When:Looking up', () => {
        it('should return null', async () => {
            const found = await dao.findById('aaaaaaaa-0000-4000-8000-000000000099');
            expect(found).toBeNull();
        });
    });
});
