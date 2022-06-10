/**
 * Builds a pair of DFAs which can be used to match 2D patterns. The `rowDFA`
 * recognises pattern rows, and the `colDFA` recognises sequences of pattern
 * rows matched by the `rowDFA`.
 * 
 * The DFAs recognise the patterns in reverse order, for convenience so that
 * matches are reported where the patterns start rather than where they end.
 */
class PatternMatcher {
    /**
     * The alphabet of symbols which can appear in patterns recognised by this matcher.
     */
    public readonly alphabet: IDMap<string>;
    
    /**
     * The number of patterns recognised by this matcher.
     */
    public readonly numPatterns: number;
    
    /**
     * The DFA which recognises rows of patterns.
     */
    public readonly rowDFA: DFA<string>;
    
    /**
     * The alphabet used in `colDFA`; each symbol represents a set of rows which
     * can be simultaneously matched by `rowDFA`.
     */
    public readonly colAlphabet: IDMap<ISet>;
    
    /**
     * The DFA which recognises sequences of matches from `rowDFA`.
     */
    public readonly colDFA: DFA<string>;
    
    private readonly acceptSetMapSize: number;
    private readonly acceptSetDiffs: readonly (readonly number[])[];
    
    public constructor(alphabet: string, patterns: readonly string[]) {
        this.alphabet = IDMap.of(alphabet);
        this.numPatterns = patterns.length;
        
        const rowPatterns = [...new Set(patterns.flatMap(p => p.split('/')))];
        const rowRegex = Regex.concat<string, string>([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(
                rowPatterns.map(row => Regex.concat([
                    Regex.concat([...row].reverse().map(c => c === '*' ? Regex.wildcard() : Regex.letters([c]))),
                    Regex.accept(row),
                ]))
            ),
        ]);
        this.rowDFA = Regex.compile(this.alphabet, rowRegex);
        
        this.colAlphabet = this.rowDFA.acceptSetMap;
        const colRegex = Regex.concat<ISet, string>([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(
                patterns.map(pattern => Regex.concat([
                    Regex.concat(pattern.split('/').reverse().map(row => {
                        const acceptID = this.rowDFA.acceptMap.getID(row);
                        return Regex.letters(this.colAlphabet.filter(acceptSet => ISet.has(acceptSet, acceptID)));
                    })),
                    Regex.accept(pattern),
                ]))
            ),
        ]);
        this.colDFA = Regex.compile(this.colAlphabet, colRegex);
        
        // precompute set differences, so that new/broken matches can be iterated in O(1) time per match
        const {acceptSetMap} = this.colDFA;
        const k = this.acceptSetMapSize = acceptSetMap.size();
        this.acceptSetDiffs = makeArray(k * k, index => {
            const p = acceptSetMap.getByID(index % k);
            const q = acceptSetMap.getByID(Math.floor(index / k));
            return ISet.toArray(p & ~q);
        });
    }
    
    public getAcceptSetDiff(pState: number, qState: number): readonly number[] {
        const {colDFA, acceptSetMapSize: k} = this;
        const pID = colDFA.getAcceptSetID(pState), qID = colDFA.getAcceptSetID(qState);
        return this.acceptSetDiffs[pID + k * qID];
    }
    
    public makeGrid(width: number, height: number): Grid {
        return new Grid(this, width, height);
    }
}

type GridChangeListener = (minX: number, minY: number, maxX: number, maxY: number) => void

class Grid {
    /**
     * Maps each index `(x + width * y)` to the ID of the symbol at (x, y).
     */
    private readonly grid: UintArray;
    /**
     * Maps each index `(x + width * y)` to the row-DFA state at (x, y).
     */
    private readonly rowStates: UintArray;
    /**
     * Maps each index `(x + width * y)` to the column-DFA state at (x, y).
     */
    private readonly colStates: UintArray;
    
    /**
     * Maps each pattern ID to the set of indices `(x + width * y)` where that pattern is matched at (x, y).
     * 
     * Invariant: `matchIndices[p].has(i)` if and only if `matcher.colDFA` accepts `p` at state `colStates[i]`
     */
    private readonly matchIndices: SampleableSet<number>[];
    
    /**
     * Array of listeners which will be notified after any area of the grid has changed.
     */
    private readonly onChange: GridChangeListener[] = [];
    
    public constructor(
        public readonly matcher: PatternMatcher,
        public readonly width: number,
        public readonly height: number,
    ) {
        const n = width * height;
        this.grid = makeUintArray(n, matcher.alphabet.size());
        this.rowStates = makeUintArray(n, matcher.rowDFA.size());
        this.colStates = makeUintArray(n, matcher.colDFA.size());
        this.matchIndices = makeArray(matcher.numPatterns, () => new SampleableSet());
        
        this.recompute(0, 0, width, height);
    }
    
    private _index(x: number, y: number): number {
        if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error(`Out of bounds: ${x},${y}`);
        }
        return x + y * this.width;
    }
    
    public get(x: number, y: number): string {
        const c = this.grid[this._index(x, y)];
        return this.matcher.alphabet.getByID(c);
    }
    public set(x: number, y: number, value: string): void {
        this.grid[this._index(x, y)] = this.matcher.alphabet.getID(value);
        this.recompute(x, y, x + 1, y + 1);
    }
    
    /**
     * Writes a pattern into the grid, starting at the coordinates (x, y).
     * 
     * The pattern is a string with rows separated by `/`; wildcards `*` in the
     * pattern do not write anything to the grid.
     */
    public setPattern(x: number, y: number, pattern: string): void {
        const {grid, matcher: {alphabet}} = this;
        const split = pattern.split('/');
        
        let startX = this.width, endX = 0, startY = this.height, endY = 0;
        for(let j = 0, yj = y; j < split.length; ++j, ++yj) {
            let row = split[j];
            for(let i = 0, xi = x; i < row.length; ++i, ++xi) {
                const c = row[i] === '*' ? -1 : alphabet.getID(row[i]);
                const index = this._index(xi, yj);
                if(c >= 0 && c !== grid[index]) {
                    grid[index] = c;
                    startX = Math.min(startX, xi);
                    endX = Math.max(endX, xi + 1);
                    startY = Math.min(startY, yj);
                    endY = Math.max(endY, yj + 1);
                }
            }
        }
        this.recompute(startX, startY, endX, endY);
    }
    
    /**
     * Registers a callback function, which will be called whenever the grid's
     * contents change.
     */
    public listen(f: GridChangeListener): void {
        this.onChange.push(f);
    }
    
    /**
     * Returns the number of times the given pattern matches this grid, in O(1) time.
     */
    public countMatches(pattern: string): number {
        const patternID = this.matcher.colDFA.acceptMap.getID(pattern);
        return this.matchIndices[patternID].size();
    }
    
    /**
     * Returns the coordinates of a random match of the given pattern, in O(1) time,
     * or `undefined` if there are no matches.
     */
    public getRandomMatch(pattern: string): {x: number, y: number} | undefined {
        const {width, matcher: {colDFA}} = this;
        const patternID = colDFA.acceptMap.getID(pattern);
        const index = this.matchIndices[patternID].sample();
        if(index !== undefined) {
            return {
                x: index % width,
                y: Math.floor(index / width),
            };
        } else {
            return undefined;
        }
    }
    
    /**
     * Updates the state to account for changes in the rectangular area from
     * startX/Y (inclusive) to endX/Y (exclusive).
     */
    private recompute(startX: number, startY: number, endX: number, endY: number): void {
        for(const f of this.onChange) {
            f(startX, startY, endX, endY);
        }
        
        // TODO: move this to PatternMatcher class, using `listen`
        const {width, height, matcher, grid, rowStates, colStates, matchIndices} = this;
        const {rowDFA, colDFA} = matcher;
        
        // the pattern matching is done in reverse, for convenience so that
        // matches are accepted where the patterns start rather than where they end
        
        // recompute rowStates
        let minChangedX = startX;
        for(let y = startY; y < endY; ++y) {
            let state = endX === width ? 0 : rowStates[this._index(endX, y)];
            for(let x = endX - 1; x >= 0; --x) {
                // O(1) time per iteration
                
                const index = this._index(x, y);
                state = rowDFA.go(state, grid[index]);
                if(state !== rowStates[index]) {
                    rowStates[index] = state;
                    minChangedX = Math.min(minChangedX, x);
                } else if(x < startX) {
                    break;
                }
            }
        }
        
        // recompute colStates
        for(let x = minChangedX; x < endX; ++x) {
            let state = endY === height ? 0 : colStates[this._index(x, endY)];
            for(let y = endY - 1; y >= 0; --y) {
                // O(m) time per iteration, where m is the number of new + broken matches
                
                const index = this._index(x, y);
                const acceptSetID = rowDFA.getAcceptSetID(rowStates[index]);
                state = colDFA.go(state, acceptSetID);
                const oldState = colStates[index];
                if(state !== oldState) {
                    colStates[index] = state;
                    
                    // remove broken matches
                    for(const acceptID of matcher.getAcceptSetDiff(oldState, state)) {
                        matchIndices[acceptID].delete(index);
                    }
                    // add new matches
                    for(const acceptID of matcher.getAcceptSetDiff(state, oldState)) {
                        matchIndices[acceptID].add(index);
                    }
                } else if(y < startY) {
                    break;
                }
            }
        }
    }
}
