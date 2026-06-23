import { JwtStrategy, JwtPayload } from '../../src/infrastructure/guards/jwt.strategy';
import { AppConfig } from '../../src/infrastructure/config/app.config';

const mockAppConfig = {
    jwtSecret: 'test-cinema-jwt-secret-minimum-32-chars!!',
} as AppConfig;

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
        strategy = new JwtStrategy(mockAppConfig);
    });

    describe('validate, Given:A decoded JWT payload, When:Validating', () => {
        it('should return the payload unchanged', () => {
            const payload: JwtPayload = { userId: 'abc-123', email: 'alice@cinema.test' };
            expect(strategy.validate(payload)).toEqual(payload);
        });

        it('should pass through userId and email as-is', () => {
            const payload: JwtPayload = { userId: 'user-456', email: 'bob@cinema.test' };
            const result = strategy.validate(payload);
            expect(result.userId).toBe('user-456');
            expect(result.email).toBe('bob@cinema.test');
        });
    });
});
