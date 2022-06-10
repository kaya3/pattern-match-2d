/**
 * Assigns unique, incremental IDs to a set of values.
 */
class IDMap<T> {
    /**
     * Creates a new IDMap with the distinct elements from `iterable`, with IDs
     * in order of first occurrence.
     */
    public static of<T>(iterable: Iterable<T>): IDMap<T> {
        const map = new IDMap<T>();
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
     * Invariant: `ids.get(x) === i` if and only if `arr[i] === x`
     */
    private readonly ids = new Map<T, number>();
    
    /**
     * Returns the number of elements in the map.
     */
    public size(): number {
        return this.arr.length;
    }
    
    /**
     * Adds an element to the map if it is not already present, and returns the
     * element's ID, in O(1) time.
     * 
     * The callback function `ifNew` is called if the element was not already
     * present in the map.
     */
    public getOrCreateID(x: T, ifNew?: (id: number) => void): number {
        let id = this.ids.get(x);
        if(id === undefined) {
            id = this.arr.length;
            this.arr.push(x);
            this.ids.set(x, id);
            ifNew?.(id);
        }
        return id;
    }
    
    /**
     * Returns the ID of the given element, in O(1) time.
     */
    public getID(x: T): number {
        const r = this.ids.get(x);
        if(r === undefined) { throw new Error(); }
        return r;
    }
    
    /**
     * Returns the element associated with the given ID, in O(1) time.
     */
    public getByID(id: number): T {
        if(id < 0 || id >= this.arr.length) { throw new Error() }
        return this.arr[id];
    }
    
    /**
     * Returns an array of elements whose IDs are present in the given set.
     */
    public getByIDs(ids: ISet): T[] {
        return ISet.map(ids, id => this.getByID(id));
    }
    
    /**
     * Returns an array containing the IDs of the given elements.
     */
    public toIDs(arr: readonly T[]): number[] {
        return arr.map(x => this.getID(x));
    }
    
    public forEach(f: (x: T, id: number) => void): void {
        this.arr.forEach(f);
    }
    public map<S>(f: (x: T, id: number) => S): S[] {
        return this.arr.map(f);
    }
    public filter(f: (x: T) => boolean): T[] {
        return this.arr.filter(f);
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
