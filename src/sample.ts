/**
 * A mutable set which can be randomly sampled in O(1) time.
 */
class SampleableSet<T> {
    public constructor(domainSize: number) {}
    
    /**
     * An unordered array of the set's members.
     */
    private readonly arr: T[] = [];
    
    /**
     * Maps the set's members to their indices in `arr`.
     * 
     * Invariant: `arr[i] === x` if and only if `indices.get(x) === i`
     */
    private readonly indices = new Map<T, number>();
    
    /**
     * Returns the number of elements in the set.
     */
    public size(): number {
        return this.arr.length;
    }
    
    /**
     * Indicates whether the given value is a member of the set, in O(1) time.
     */
    public has(x: T): boolean {
        return this.indices.has(x);
    }
    
    /**
     * Adds an element to the set, if it is not already present, in O(1) time.
     */
    public add(x: T): void {
        const {arr, indices} = this;
        if(!indices.has(x)) {
            indices.set(x, arr.length);
            arr.push(x);
        }
    }
    
    /**
     * Deletes an element from the set, if it is present, in O(1) time.
     */
    public delete(x: T): void {
        const {arr, indices} = this;
        const i = indices.get(x);
        if(i !== undefined) {
            const j = arr.length - 1;
            if(i !== j) {
                const y = arr[j];
                arr[i] = y;
                indices.set(y, i);
            }
            arr.pop();
            indices.delete(x);
        }
    }
    
    /**
     * Returns a random element from the set in O(1) time, or `undefined` if
     * the set is empty.
     */
    public sample(): T | undefined {
        const {arr} = this;
        return arr.length > 0 ? arr[rng(arr.length)] : undefined;
    }
}
