/**
 * Creates an empty array of length `n`, filled with the given value.
 */
function emptyArray<T>(n: number, value: T): T[] {
    return makeArray(n, () => value);
}

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
