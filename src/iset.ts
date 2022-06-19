
/**
 * A set of natural numbers, represented using the bits of a typed array.
 */
type ISet = Uint32Array

/**
 * A mutable set of natural numbers, represented using the bits of a typed array.
 */
type MutableISet = Uint32Array & {__mutable: true}

/**
 * Helper functions for using a typed array as a set of natural numbers.
 * 
 * Aggregate operations `addAll`, `toArray` and `forEach` are O(N), where N is
 * the domain size; therefore they must not be used in the pattern matching loop.
 */
namespace ISet {
    /**
     * Creates an empty set, which can contain numbers less than `domainSize`.
     */
    export function empty(domainSize: number): MutableISet {
        return new Uint32Array(((domainSize - 1) >> 5) + 1) as MutableISet;
    }
    
    /**
     * Creates a set from an iterable of natural numbers, all of which must be
     * less than `domainSize`.
     */
    export function of(domainSize: number, xs: Iterable<number>): MutableISet {
        const set = empty(domainSize);
        for(const x of xs) { add(set, x); }
        return set;
    }
    
    /**
     * Indicates whether `set` contains the element `x`, in O(1) time.
     */
    export function has(set: ISet, x: number): boolean {
        return (set[x >> 5] & (1 << (x & 31))) !== 0;
    }
    
    /**
     * Adds the element `x` to the set if it not already present, in O(1) time.
     */
    export function add(set: MutableISet, x: number): void {
        set[x >> 5] |= 1 << (x & 31);
    }
    
    /**
     * Adds all the members of `b` to the set `a`, in O(N) time.
     */
    export function addAll(a: MutableISet, b: ISet): void {
        if(a.length < b.length) { throw new Error(); }
        for(let i = 0; i < b.length; ++i) {
            a[i] |= b[i];
        }
    }
    
    /**
     * Converts a set from an array to a `bigint`, in O(N^2) time.
     * 
     * Using a primitive type is convenient for Map keys; `number` would only
     * work for sets with domain sizes of at most 32, and strings are slower.
     */
    export function arrayToBigInt(xs: readonly number[]): bigint {
        let domainSize = 0;
        for(const x of xs) { domainSize = Math.max(domainSize, x + 1); }
        return domainSize > 0 ? toBigInt(of(domainSize, xs)) : 0n;
    }
    
    /**
     * Converts a set to a `bigint`, in O(N^2) time.
     * 
     * Using a primitive type is convenient for Map keys; `number` would only
     * work for sets with domain sizes of at most 32, and strings are slower.
     */
    export function toBigInt(set: ISet): bigint {
        let r = 0n;
        for(let i = set.length - 1; i >= 0; --i) {
            r <<= 32n;
            r |= BigInt(set[i]);
        }
        return r;
    }
    
    /**
     * Returns a new array of the natural numbers in the given set.
     */
    export function toArray(set: ISet): number[] {
        const arr: number[] = [];
        forEach(set, x => arr.push(x));
        return arr;
    }
    
    /**
     * Calls the function `f` for each element of the set, not necessarily in
     * order.
     */
    export function forEach(set: ISet, f: (x: number) => void): void {
        for(let i = 0; i < set.length; ++i) {
            const x = i << 5;
            let setPart = set[i];
            while(setPart !== 0) {
                // position of the highest 1 bit
                const dx = 31 - Math.clz32(setPart);
                f(x ^ dx);
                setPart ^= 1 << dx;
            }
        }
    }
}
