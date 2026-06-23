/** @type {import('jest').Config} */
module.exports = {
    projects: [
        {
            displayName: 'unit',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
            transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }] },
        },
        {
            displayName: 'integration',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
            transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }] },
        },
        {
            displayName: 'api',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/api/**/*.spec.ts'],
            transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }] },
        },
    ],
    // Scope grows per branch: B13c adds controllers/services, B14+ adds the rest
    collectCoverageFrom: ['src/auth/dao/**/*.ts', 'src/auth/domain-model/**/*.ts', '!src/**/*.entity.ts'],
    coverageThreshold: {
        global: { lines: 80, functions: 80 },
    },
};
