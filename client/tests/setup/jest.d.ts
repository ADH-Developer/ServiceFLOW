/// <reference types="jest" />
/// <reference types="@jest/globals" />

declare module '@jest/globals' {
    export const jest: typeof import('@jest/globals').jest;
    export const expect: typeof import('@jest/globals').expect;
    export const test: typeof import('@jest/globals').test;
    export const describe: typeof import('@jest/globals').describe;
    export const beforeAll: typeof import('@jest/globals').beforeAll;
    export const afterAll: typeof import('@jest/globals').afterAll;
    export const beforeEach: typeof import('@jest/globals').beforeEach;
    export const afterEach: typeof import('@jest/globals').afterEach;
}

declare global {
    const jest: typeof import('@jest/globals').jest;
    const expect: typeof import('@jest/globals').expect;
    const test: typeof import('@jest/globals').test;
    const describe: typeof import('@jest/globals').describe;
    const beforeAll: typeof import('@jest/globals').beforeAll;
    const afterAll: typeof import('@jest/globals').afterAll;
    const beforeEach: typeof import('@jest/globals').beforeEach;
    const afterEach: typeof import('@jest/globals').afterEach;
} 