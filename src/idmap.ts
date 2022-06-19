type PrimitiveKey = string | number | bigint

/**
 * Assigns unique, incremental IDs to a set of values.
 */
class IDMap<T> {
    public static empty<T extends PrimitiveKey>(): IDMap<T> {
        return new IDMap(x => x);
    }
    
    public static withKey<T>(keyFunc: (x: T) => PrimitiveKey): IDMap<T> {
        return new IDMap(keyFunc);
    }
    
    /**
     * Creates a new IDMap with the distinct elements from `iterable`, with IDs
     * in order of first occurrence.
     */
    public static of<T extends PrimitiveKey>(iterable: Iterable<T>): IDMap<T> {
        const map = new IDMap<T>(x => x);
        for(const x of iterable) { map.getOrCreateID(x); }
        return map;
    }
    
    /**
     * The distinct elements in this map, in insertion order.
     */
    private readonly arr: T[] = [];
    
    /**
     * Maps elements to their indices in `arr`.
     * 
     * Invariant: `ids.get(keyFunc(x)) === i` if and only if `arr[i] === x`
     */
    private readonly ids = new Map<PrimitiveKey, number>();
    
    private constructor(private readonly keyFunc: (x: T) => PrimitiveKey) {}
    
    /**
     * Returns the number of elements in the map.
     */
    public size(): number {
        return this.arr.length;
    }
    
    /**
     * Adds an element to the map if it is not already present, and returns the
     * element's ID, in O(1) time.
     */
    public getOrCreateID(x: T): number {
        const key = this.keyFunc(x);
        let id = this.ids.get(key);
        if(id === undefined) {
            id = this.arr.length;
            this.arr.push(x);
            this.ids.set(key, id);
        }
        return id;
    }
    
    /**
     * Returns the ID of the given element, in O(1) time.
     */
    public getID(x: T): number {
        const id = this.ids.get(this.keyFunc(x));
        if(id === undefined) { throw new Error(); }
        return id;
    }
    
    /**
     * Returns the element associated with the given ID, in O(1) time.
     */
    public getByID(id: number): T {
        if(id < 0 || id >= this.arr.length) { throw new Error() }
        return this.arr[id];
    }
    
    public forEach(f: (x: T, id: number) => void): void {
        this.arr.forEach(f);
    }
    public map<S>(f: (x: T, id: number) => S): S[] {
        return this.arr.map(f);
    }
}

/**
 * A mutable set which can be randomly sampled in O(1) time.
 */
class SampleableSet<T> {
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
