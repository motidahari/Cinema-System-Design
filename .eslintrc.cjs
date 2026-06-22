'use strict';

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
    },
    overrides: [
        {
            files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts'],
            env: { jest: true },
        },
        {
            files: ['frontend-application/**/*.tsx'],
            extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
            settings: {
                react: { version: 'detect' },
            },
        },
    ],
    env: {
        node: true,
        es2021: true,
    },
    ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
};
