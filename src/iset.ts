/**
 * An immutable set of natural numbers, represented using the bits of a
 * primitive `bigint`. Using a primitive type is convenient for Map keys, and
 * for bitwise operations to compute unions, intersections and differences;
 * `number` would only work for sets with domain sizes of at most 32.
 * 
 * Bitwise operations are O(n), albeit with a small factor, where n is the size
 * of the domain. Unfortunately this also means `toArray` and `map` are O(n^2).
 * Therefore, ISet values should not be used in the pattern matching loop.
 */
type ISet = bigint

/**
 * Helper functions for treating `bigint` values as immutable sets of natural
 * numbers.
 */
namespace ISet {
    export const EMPTY: ISet = 0n;
    
    /**
     * Creates a set of one element.
     */
    export function singleton(x: number): ISet {
        return 1n << BigInt(x);
    }
    
    /**
     * Creates a set of all natural numbers from 0 to n - 1.
     */
    export function full(n: number): ISet {
        return (1n << BigInt(n)) - 1n;
    }
    
    /**
     * Creates a set from an iterable of natural numbers, all of which must be
     * less than `domainSize`.
     */
    export function of(domainSize: number, xs: Iterable<number>): ISet {
        // deal with 32 bits at a time; int32 operations are much faster than bigint
        const arr = new Uint32Array(((domainSize - 1) >> 5) + 1);
        for(const x of xs) {
            arr[x >> 5] |= 1 << (x & 31);
        }
        
        let set = BigInt(arr[arr.length - 1]);
        for(let i = arr.length - 2; i >= 0; --i) {
            set <<= 32n;
            set |= BigInt(arr[i]);
        }
        return set;
    }
    
    /**
     * Indicates whether `set` contains the element `x`.
     */
    export function has(set: ISet, x: number): boolean {
        return (set & singleton(x)) !== EMPTY;
    }
    
    /**
     * Returns a new array of the natural numbers in the given set.
     */
    export function toArray(set: ISet): number[] {
        return map(set, x => x);
    }
    
    export function map<T>(set: ISet, f: (x: number) => T): T[] {
        const arr: T[] = [];
        for(let x = 0; set !== 0n; x += 32, set >>= 32n) {
            // deal with 32 bits at a time; int32 operations are much faster than bigint
            let setPart = Number(BigInt.asIntN(32, set)) | 0;
            while(setPart !== 0) {
                // position of the highest 1 bit
                const dx = 31 - Math.clz32(setPart);
                arr.push(f(x + dx));
                setPart ^= 1 << dx;
            }
        }
        return arr;
    }
}
