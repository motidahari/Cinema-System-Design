import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoginAttemptDao } from '../../src/auth/dao/login-attempt.dao';
import { LoginAttemptEntity } from '../../src/domain/entities/login-attempt.entity';
import { identityTestDataSourceOptions } from './helpers/db.helper';

const RUN = randomUUID().slice(0, 8);
const EMAIL = `lockout-${RUN}@cinema.test`;
const IP = '10.0.0.1';
const THRESHOLD = 3;
const WINDOW_MIN = 15;

describe('LoginAttemptDao (integration)', () => {
    let module: TestingModule;
    let dao: LoginAttemptDao;
    let dataSource: DataSource;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(identityTestDataSourceOptions()),
                TypeOrmModule.forFeature([LoginAttemptEntity]),
            ],
            providers: [LoginAttemptDao],
        }).compile();

        dao = module.get(LoginAttemptDao);
        dataSource = module.get(DataSource);
    });

    afterEach(async () => {
        await dataSource.query(`DELETE FROM identity.login_attempts WHERE email LIKE $1`, [`%-${RUN}@cinema.test`]);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('isLocked, Given:No prior attempts, When:Checking lock status', () => {
        it('should return false', async () => {
            expect(await dao.isLocked(EMAIL, IP)).toBe(false);
        });
    });

    describe('recordFailure, Given:Failures below threshold, When:Recording', () => {
        it('should not lock the account', async () => {
            await dao.recordFailure(EMAIL, IP, THRESHOLD, WINDOW_MIN);
            await dao.recordFailure(EMAIL, IP, THRESHOLD, WINDOW_MIN);

            expect(await dao.isLocked(EMAIL, IP)).toBe(false);
        });
    });

    describe('recordFailure, Given:Failures reaching threshold, When:Recording the Nth failure', () => {
        it('should lock the account', async () => {
            for (let i = 0; i < THRESHOLD; i++) {
                await dao.recordFailure(EMAIL, IP, THRESHOLD, WINDOW_MIN);
            }

            expect(await dao.isLocked(EMAIL, IP)).toBe(true);
        });
    });

    describe('recordFailure, Given:Different (email, ip) pairs, When:Recording', () => {
        it('should track counters independently', async () => {
            for (let i = 0; i < THRESHOLD; i++) {
                await dao.recordFailure(EMAIL, IP, THRESHOLD, WINDOW_MIN);
            }

            expect(await dao.isLocked(EMAIL, '10.0.0.2')).toBe(false);
            expect(await dao.isLocked(`other-${RUN}@cinema.test`, IP)).toBe(false);
        });
    });

    describe('clear, Given:A locked account, When:Clearing after success', () => {
        it('should remove the lockout so isLocked returns false', async () => {
            for (let i = 0; i < THRESHOLD; i++) {
                await dao.recordFailure(EMAIL, IP, THRESHOLD, WINDOW_MIN);
            }
            expect(await dao.isLocked(EMAIL, IP)).toBe(true);

            await dao.clear(EMAIL, IP);

            expect(await dao.isLocked(EMAIL, IP)).toBe(false);
        });
    });

    describe('clear, Given:No existing row, When:Clearing', () => {
        it('should complete without error', async () => {
            await expect(dao.clear(`nobody-${RUN}@cinema.test`, IP)).resolves.toBeUndefined();
        });
    });
});
