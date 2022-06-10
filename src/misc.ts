type UintArray = Uint8Array | Uint16Array | Uint32Array

/**
 * Creates an empty array of length `n`, which can hold unsigned integers less
 * than `domainSize` (exclusive). The array is initially filled with zeroes.
 */
function makeUintArray(n: number, domainSize: number): UintArray {
    if(domainSize <= (1 << 8)) {
        return new Uint8Array(n);
    } else if(domainSize <= (1 << 16)) {
        return new Uint16Array(n);
    } else {
        return new Uint32Array(n);
    }
}

/**
 * Creates an empty array of length `n`, filled with the given value.
 */
function emptyArray<T>(n: number, value: T): T[] {
    return makeArray(n, () => value);
}

/**
 * Creates an array of length `n`, initialised using the given callback function.
 */
function makeArray<T>(n: number, f: (i: number) => T): T[] {
    // equivalent to `Array(n).map((_, i) => f(i))`, but guarantees an array without holes, which may be more performant to use
    const arr: T[] = [];
    for(let i = 0; i < n; ++i) { arr.push(f(i)); }
    return arr;
}

/**
 * Returns a random integer from 0 to n - 1.
 */
function rng(n: number): number {
    return Math.floor(Math.random() * n);
}
