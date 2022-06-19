/**
 * A small rectangular pattern which can be matched in a grid, or written to it.
 * Patterns may contain wildcards, which match any symbol and do not write
 * anything to the grid.
 */
class Pattern {
    /**
     * Creates a pattern from a string.
     * 
     * The pattern is specified by a string with rows separated by `/`; wildcards
     * `*` in the pattern match any symbol and do not write anything to the grid.
     */
    public static of(alphabet: IDMap<string>, pattern: string): Pattern {
        const rows = pattern.split('/');
        const width = rows[0].length;
        const height = rows.length;
        
        if(rows.some(row => row.length !== width)) { throw new Error(pattern); }
        
        function symbolToID(c: string): number {
            return c === '*' ? -1 : alphabet.getID(c);
        }
        const rasterData = rows.flatMap(row => [...row].map(symbolToID));
        return new Pattern(width, height, rasterData);
    }
    
    /**
     * Rotates a pattern clockwise by 90 degrees.
     */
    public static rotate(pattern: Pattern): Pattern {
        const {width, height, rasterData} = pattern;
        const newData: number[] = [];
        for(let x = 0; x < width; ++x) {
            for(let y = height - 1; y >= 0; --y) {
                newData.push(rasterData[x + width * y]);
            }
        }
        return new Pattern(height, width, newData);
    }
    
    /**
     * Reflects a pattern from top to bottom.
     */
    public static reflect(pattern: Pattern): Pattern {
        const {width, height, rasterData} = pattern;
        const newData: number[] = [];
        for(let y = height - 1; y >= 0; --y) {
            for(let x = 0; x < width; ++x) {
                newData.push(rasterData[x + width * y]);
            }
        }
        return new Pattern(width, height, newData);
    }
    
    /**
     * Returns a string representation of a pattern, for use as a Map key.
     */
    public static key(pattern: Pattern): string {
        return pattern._key ??= `${pattern.width}:${pattern.height}:${pattern.rasterData.join(',')}`;
    }
    
    /**
     * The cached key; see `Pattern.key`.
     */
    private _key: string | undefined = undefined;
    
    /**
     * A flat array of (x, y, c) triples for each occurrence of a non-wildcard
     * symbol `c` at a position (x, y) in this pattern.
     */
    public readonly vectorData: readonly number[];
    
    public readonly minX: number;
    public readonly minY: number;
    public readonly maxX: number;
    public readonly maxY: number;
    
    private constructor(
        /**
         * The width of the pattern.
         */
        public readonly width: number,
        /** 
         * The height of the pattern.
         */
        public readonly height: number,
        /**
         * The cells of the pattern. A value of -1 indicates a wildcard.
         */
        public readonly rasterData: readonly number[],
    ) {
        let minX = width, minY = height, maxX = 0, maxY = 0;
        const vectorData: number[] = this.vectorData = [];
        
        for(let y = 0; y < height; ++y) {
            for(let x = 0; x < width; ++x) {
                const c = rasterData[x + width * y];
                if(c >= 0) {
                    vectorData.push(x, y, c);
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + 1);
                    maxY = Math.max(maxY, y + 1);
                }
            }
        }
        
        this.minX = Math.min(minX, maxX);
        this.minY = Math.min(minY, maxY);
        this.maxX = maxX;
        this.maxY = maxY;
    }
    
    /**
     * Returns the rows of this pattern as an array of (width * 1) patterns.
     */
    public rows(): Pattern[] {
        const {width, height, rasterData} = this;
        const out: Pattern[] = []
        for(let y = 0; y < height; ++y) {
            const row = rasterData.slice(y * width, (y + 1) * width);
            out.push(new Pattern(width, 1, row));
        }
        return out;
    }
}
