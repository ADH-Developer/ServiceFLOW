module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests'],
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup/jest.setup.ts',
        '<rootDir>/tests/setup/api.ts',
        '<rootDir>/tests/setup/websocket.ts'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testMatch: [
        '**/tests/api/**/*.test.ts'
    ],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
            diagnostics: {
                warnOnly: true
            }
        }
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['<rootDir>/tests/setup/jest.d.ts']
}; 