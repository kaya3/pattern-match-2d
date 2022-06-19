///<reference path="matcher.ts"/>

type GridChangeListener = (minX: number, minY: number, maxX: number, maxY: number) => void

class Grid {
    /**
     * Maps each `index(x, y)` to the ID of the symbol at (x, y).
     */
    public readonly grid: UintArray;
    
    /**
     * Array of listeners which will be notified after any area of the grid has changed.
     */
    private readonly onChange: GridChangeListener[] = [];
    
    public constructor(
        public readonly alphabet: IDMap<string>,
        public readonly width: number,
        public readonly height: number,
    ) {
        this.grid = makeUintArray(width * height, alphabet.size());
    }
    
    public index(x: number, y: number): number {
        if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error(`Out of bounds: ${x},${y}`);
        }
        return x + y * this.width;
    }
    
    public get(x: number, y: number): string {
        const c = this.grid[this.index(x, y)];
        return this.alphabet.getByID(c);
    }
    public set(x: number, y: number, value: string): void {
        this.grid[this.index(x, y)] = this.alphabet.getID(value);
        this.notify(x, y, x + 1, y + 1);
    }
    
    /**
     * Writes a pattern into the grid, starting at the coordinates (x, y).
     */
    public setPattern(x: number, y: number, pattern: Pattern): void {
        const {grid} = this;
        const {vectorData, minX, minY, maxX, maxY} = pattern;
        
        for(let i = 0; i < vectorData.length; i += 3) {
            const dx = vectorData[i];
            const dy = vectorData[i + 1];
            const c = vectorData[i + 2];
            grid[this.index(x + dx, y + dy)] = c;
        }
        
        this.notify(x + minX, y + minY, x + maxX, y + maxY);
    }
    
    /**
     * Registers a callback function, which will be called whenever the grid's
     * contents change.
     */
    public listen(f: GridChangeListener): void {
        this.onChange.push(f);
    }
    
    /**
     * Notifies listeners of changes in the rectangular area from startX/Y
     * (inclusive) to endX/Y (exclusive).
     */
    private notify(startX: number, startY: number, endX: number, endY: number): void {
        for(const f of this.onChange) {
            f(startX, startY, endX, endY);
        }
    }
}
