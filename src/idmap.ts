type PrimitiveKey = string | number | bigint

/**
 * Assigns unique, incremental IDs to a set of values.
 */
class IDMap<T> {
    private static readonly IDENTITY = (x: unknown) => x as PrimitiveKey;
    
    public static empty<T extends PrimitiveKey>(): IDMap<T> {
        return new IDMap<T>(IDMap.IDENTITY);
    }
    
    public static withKey<T>(keyFunc: (x: T) => PrimitiveKey): IDMap<T> {
        return new IDMap(keyFunc);
    }
    
    /**
     * Creates a new IDMap with the distinct elements from `iterable`, with IDs
     * in order of first occurrence.
     */
    public static of<T extends PrimitiveKey>(iterable: Iterable<T>): IDMap<T> {
        return IDMap.ofWithKey(iterable, IDMap.IDENTITY);
    }
    
    public static ofWithKey<T>(iterable: Iterable<T>, keyFunc: (x: T) => PrimitiveKey): IDMap<T> {
        const map = new IDMap<T>(keyFunc);
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
        if(id < 0 || id >= this.arr.length) { throw new Error(); }
        return this.arr[id];
    }
    
    public forEach(f: (x: T, id: number) => void): void {
        this.arr.forEach(f);
    }
    public map<S>(f: (x: T, id: number) => S): S[] {
        return this.arr.map(f);
    }
}
