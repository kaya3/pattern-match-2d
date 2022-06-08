/**
 * An immutable set of natural numbers, represented using the bits of a
 * primitive `bigint`. Using a primitive type is convenient for Map keys;
 * `number` would only work for sets of size <= 32.
 * 
 * Most operations are O(n) where n is the size of the domain, i.e. the maximum
 * element allowed in the set. Therefore, set operations should not be done in
 * the pattern matching loop.
 */
type ISet = bigint

/**
 * Helper functions for treating `bigint` values as immutable sets of natural
 * numbers.
 */
namespace ISet {
    export const EMPTY = 0n as ISet;
    
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
     * Creates a set from an iterable of natural numbers.
     */
    export function of(xs: Iterable<number>): ISet {
        let set = EMPTY;
        for(const x of xs) { set |= singleton(x); }
        return set;
    }
    
    /**
     * Indicates whether `set` contains the element `x`.
     */
    export function has(set: ISet, x: number): boolean {
        return (set & singleton(x)) !== EMPTY;
    }
    
    export function forEach(set: ISet, f: (x: number) => void): void {
        for(let i = 0; set !== EMPTY; ++i, set >>= 1n) {
            if(set & 1n) { f(i); }
        }
    }
    
    export function map<T>(set: ISet, f: (x: number) => T): T[] {
        const arr: T[] = [];
        forEach(set, x => {
            arr.push(f(x));
        });
        return arr;
    }
    
    /**
     * Returns a new array of the natural numbers in the given set.
     */
    export function toArray(set: ISet): number[] {
        return ISet.map(set, x => x);
    }
}
