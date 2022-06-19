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
     * The number of patterns recognised by this matcher.
     */
    public readonly numPatterns: number;
    
    /**
     * The DFA which recognises rows of patterns.
     */
    public readonly rowDFA: DFA;
    
    /**
     * The DFA which recognises sequences of matches from `rowDFA`.
     */
    public readonly colDFA: DFA;
    
    private readonly acceptSetMapSize: number;
    private readonly acceptSetDiffs: readonly (readonly number[])[];
    
    public constructor(
        /**
         * The alphabet of symbols which can appear in patterns recognised by this matcher.
         */
        public readonly alphabet: IDMap<string>,
        patterns: IDMap<Pattern>,
    ) {
        const numPatterns = this.numPatterns = patterns.size();
        
        const rowPatterns = IDMap.ofWithKey(patterns.map(p => p.rows()).flat(), Pattern.key);
        const rowRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(
                rowPatterns.map((row, rowID) => Regex.concat([
                    Regex.concat(row.rasterData.map(c => c < 0 ? Regex.wildcard() : Regex.letters([c])).reverse()),
                    Regex.accept(rowID),
                ]))
            ),
        ]);
        this.rowDFA = Regex.compile(alphabet.size(), rowPatterns.size(), rowRegex);
        
        const acceptingSets: number[][] = makeArray(rowPatterns.size(), () => []);
        this.rowDFA.acceptSetMap.forEach((xs, id) => {
            for(const x of xs) {
                acceptingSets[x].push(id);
            }
        });
        
        const colRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(
                patterns.map((pattern, patternID) => Regex.concat([
                    Regex.concat(pattern.rows().map(row => {
                        const rowID = rowPatterns.getID(row);
                        return Regex.letters(acceptingSets[rowID]);
                    }).reverse()),
                    Regex.accept(patternID),
                ]))
            ),
        ]);
        this.colDFA = Regex.compile(this.rowDFA.acceptSetMap.size(), numPatterns, colRegex);
        
        // precompute set differences, so that new/broken matches can be iterated in O(1) time per match
        const {acceptSetMap} = this.colDFA;
        this.acceptSetMapSize = acceptSetMap.size();
        const diffs: (readonly number[])[] = this.acceptSetDiffs = [];
        acceptSetMap.forEach(q => {
            const qSet = ISet.of(numPatterns, q);
            acceptSetMap.forEach(p => {
                const arr = p.filter(x => !ISet.has(qSet, x));
                diffs.push(arr);
            });
        });
    }
    
    public getAcceptSetDiff(pState: number, qState: number): readonly number[] {
        const {colDFA, acceptSetMapSize: k} = this;
        const pID = colDFA.getAcceptSetID(pState), qID = colDFA.getAcceptSetID(qState);
        return this.acceptSetDiffs[pID + k * qID];
    }
    
    public makeState(width: number, height: number): MatcherState {
        return new MatcherState(this, width, height);
    }
}

class MatcherState {
    public readonly grid: Grid;
    
    /**
     * Maps each `grid.index(x, y)` to the row-DFA state at (x, y).
     */
    private readonly rowStates: UintArray;
    /**
     * Maps each `grid.index(x, y)` to the column-DFA state at (x, y).
     */
    private readonly colStates: UintArray;
    
    /**
     * Maps each pattern ID to the set of indices `grid.index(x, y)` where that pattern is matched at (x, y).
     * 
     * Invariant: `matchIndices[p].has(i)` if and only if `matcher.colDFA` accepts `p` at state `colStates[i]`
     */
    private readonly matchIndices: SampleableSet<number>[];
    
    public constructor(
        public readonly matcher: PatternMatcher,
        width: number,
        height: number,
    ) {
        const n = width * height;
        this.rowStates = makeUintArray(n, matcher.rowDFA.size());
        this.colStates = makeUintArray(n, matcher.colDFA.size());
        this.matchIndices = makeArray(matcher.numPatterns, () => new SampleableSet(n));
        
        const grid = this.grid = new Grid(matcher.alphabet, width, height);
        grid.listen(this.recompute.bind(this));
        this.recompute(0, 0, width, height);
    }
    
    /**
     * Returns the number of times the given pattern matches this grid, in O(1) time.
     */
    public countMatches(patternID: number): number {
        return this.matchIndices[patternID].size();
    }
    
    /**
     * Returns the coordinates of a random match of the given pattern, in O(1) time,
     * or `undefined` if there are no matches.
     */
    public getRandomMatch(patternID: number): {x: number, y: number} | undefined {
        const index = this.matchIndices[patternID].sample();
        if(index !== undefined) {
            const {width} = this.grid;
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
        const {matcher, grid, rowStates, colStates, matchIndices} = this;
        const {rowDFA, colDFA} = matcher;
        const {width, height} = grid;
        
        // the pattern matching is done in reverse, for convenience so that
        // matches are accepted where the patterns start rather than where they end
        
        // recompute rowStates
        let minChangedX = startX;
        for(let y = startY; y < endY; ++y) {
            let state = endX === width ? 0 : rowStates[grid.index(endX, y)];
            for(let x = endX - 1; x >= 0; --x) {
                // O(1) time per iteration
                
                const index = grid.index(x, y);
                state = rowDFA.go(state, grid.grid[index]);
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
            let state = endY === height ? 0 : colStates[grid.index(x, endY)];
            for(let y = endY - 1; y >= 0; --y) {
                // O(m + 1) time per iteration, where m is the number of new + broken matches
                
                const index = grid.index(x, y);
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
