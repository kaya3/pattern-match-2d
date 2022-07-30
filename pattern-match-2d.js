"use strict";
/**
 * Data structure representing a partition of the natural numbers from 0 to n - 1,
 * for use in the `DFA.minimise` algorithm. The main operations are `refine` and
 * `pollUnprocessed`.
 *
 * https://en.wikipedia.org/wiki/Partition_refinement#Data_structure
 */
class Partition {
    /**
     * The numbers from 0 to n - 1, ordered so that each subset in the partition
     * is a contiguous range.
     *
     * Invariant: `arr` is a permutation of the numbers from 0 to n - 1
     */
    arr;
    /**
     * Maps the numbers from 0 to n - 1 to their indices in `arr`.
     *
     * Invariant: `arr[i] === x` if and only if `indices[x] === i`
     */
    indices;
    /**
     * The boundaries in `arr` for each subset in the partition.
     *
     * Invariant: `subsets[i].index === i`
     * Invariant: `subsets[i].start < subsets[i].end`
     * Invariant: `subsets[i].start === 0` or there is a unique `j` such that `subsets[i].start === subsets[j].end`
     * Invariant: `subsets[i].end === n` or there is a unique `j` such that `subsets[i].end === subsets[j].start`
     */
    subsets = [];
    /**
     * The subsets which have yet to be processed by the `DFA.minimise` algorithm,
     * plus possibly some empty subsets which do not need to be processed.
     *
     * Invariant: if `subset.isUnprocessed` then `unprocessed.includes(subset)`
     * Invariant: if `unprocessed.includes(subset)` and not `subset.isUnprocessed`, then `subset.start === subset.end`
     */
    unprocessed = [];
    /**
     * Maps each number from 0 to n - 1 to the subset it is a member of.
     *
     * Invariant: `map[x].start <= indices[x] && indices[x] < map[x].end`
     */
    map;
    /**
     * Constructs a new instance representing a partition of the numbers from
     * 0 to n - 1. The partition initially contains only a single subset (the
     * whole range).
     */
    constructor(n) {
        this.arr = makeArray(n, i => i);
        this.indices = makeArray(n, i => i);
        const initialSubset = this.makeSubset(0, n, true);
        this.map = emptyArray(n, initialSubset);
    }
    /**
     * Returns the number of subsets in this partition.
     */
    countSubsets() {
        return this.subsets.length;
    }
    makeSubset(start, end, isUnprocessed) {
        const { subsets } = this;
        const subset = {
            index: subsets.length,
            start,
            end,
            isUnprocessed,
            sibling: undefined,
        };
        subsets.push(subset);
        if (isUnprocessed) {
            this.unprocessed.push(subset);
        }
        return subset;
    }
    deleteSubset(subset) {
        // sanity check
        if (subset.start !== subset.end) {
            throw new Error();
        }
        const { index } = subset;
        const removed = this.subsets.pop();
        if (removed.index !== index) {
            this.subsets[removed.index = index] = removed;
        }
        subset.isUnprocessed = false;
    }
    /**
     * Returns a subset which needs to be processed, and marks it as processed.
     * The elements are in no particular order.
     *
     * If no subsets remain to be processed, `undefined` is returned.
     */
    pollUnprocessed() {
        const { unprocessed } = this;
        while (unprocessed.length > 0) {
            const subset = unprocessed.pop();
            // have to check `isUnprocessed` because deleted subsets may still be in the stack
            if (subset.isUnprocessed) {
                subset.isUnprocessed = false;
                return this.arr.slice(subset.start, subset.end);
            }
        }
        return undefined;
    }
    /**
     * Returns a representative element from the subset in the partition which
     * contains the number `x`.
     */
    getRepresentative(x) {
        return this.arr[this.map[x].start];
    }
    /**
     * Calls the provided callback function with a representative element
     * from each subset in the partition.
     */
    forEachRepresentative(f) {
        const { arr } = this;
        for (const subset of this.subsets) {
            f(arr[subset.start]);
        }
    }
    /**
     * Refines this partition by splitting any subsets which partly intersect
     * with the given set. If an unprocessed subset is split, both parts are
     * marked unprocessed; otherwise, the smaller part is marked.
     */
    refine(set) {
        const { unprocessed, map } = this;
        const splits = [];
        ISet.forEach(set, x => {
            const subset = map[x];
            if (subset.sibling === undefined) {
                splits.push(subset);
                subset.sibling = this.makeSubset(subset.end, subset.end, subset.isUnprocessed);
            }
            this.moveToSibling(x, subset);
        });
        for (const subset of splits) {
            if (subset.start === subset.end) {
                this.deleteSubset(subset);
            }
            else if (!subset.isUnprocessed) {
                const sibling = subset.sibling;
                const min = subset.end - subset.start <= sibling.end - sibling.start ? subset : sibling;
                min.isUnprocessed = true;
                unprocessed.push(min);
            }
            subset.sibling = undefined;
        }
    }
    /**
     * Moves the element x from `subset` to `subset.sibling`, in O(1) time. The
     * sibling appears immediately afterwards in `arr`, so `x` is swapped with
     * the last member of `subset` and then the boundary is adjusted.
     */
    moveToSibling(x, subset) {
        const { arr, map, indices } = this;
        const sibling = subset.sibling;
        const i = indices[x];
        const j = subset.end = --sibling.start;
        const y = arr[j];
        arr[i] = y;
        indices[y] = i;
        arr[j] = x;
        indices[x] = j;
        map[x] = sibling;
    }
}
///<reference path="partition.ts"/>
var Regex;
(function (Regex) {
    function letters(letterIDs) {
        return { kind: 0 /* Kind.LETTERS */, letterIDs };
    }
    Regex.letters = letters;
    function wildcard() {
        return { kind: 1 /* Kind.WILDCARD */ };
    }
    Regex.wildcard = wildcard;
    function concat(children) {
        return { kind: 2 /* Kind.CONCAT */, children };
    }
    Regex.concat = concat;
    function union(children) {
        return { kind: 3 /* Kind.UNION */, children };
    }
    Regex.union = union;
    function kleeneStar(child) {
        return { kind: 4 /* Kind.KLEENESTAR */, child };
    }
    Regex.kleeneStar = kleeneStar;
    function accept(accept) {
        return { kind: 5 /* Kind.ACCEPT */, accept };
    }
    Regex.accept = accept;
    function compile(alphabetSize, acceptCount, regex) {
        return new NFA(alphabetSize, acceptCount, regex).toDFA().minimise();
    }
    Regex.compile = compile;
})(Regex || (Regex = {}));
class NFA {
    alphabetSize;
    acceptCount;
    nodes = [];
    startID;
    constructor(alphabetSize, acceptCount, regex) {
        this.alphabetSize = alphabetSize;
        this.acceptCount = acceptCount;
        this.startID = this.makeFromRegex(regex, this.makeNode([]));
        //console.log(`NFA with ${this.nodes.length} nodes on alphabet of size ${alphabetSize}`);
    }
    makeNode(epsilons, letters = [], nextID = -1) {
        const { nodes } = this;
        const id = nodes.length;
        nodes.push({ epsilons, letters, nextID, acceptSet: [] });
        return id;
    }
    makeFromRegex(regex, outID) {
        // https://en.wikipedia.org/wiki/Thompson's_construction
        switch (regex.kind) {
            case 0 /* Regex.Kind.LETTERS */: {
                return this.makeNode([], regex.letterIDs, outID);
            }
            case 1 /* Regex.Kind.WILDCARD */: {
                return this.makeNode([], makeArray(this.alphabetSize, i => i), outID);
            }
            case 2 /* Regex.Kind.CONCAT */: {
                const { children } = regex;
                for (let i = children.length - 1; i >= 0; --i) {
                    outID = this.makeFromRegex(children[i], outID);
                }
                return outID;
            }
            case 3 /* Regex.Kind.UNION */: {
                const epsilons = regex.children.map(child => this.makeFromRegex(child, this.makeNode([outID])));
                return this.makeNode(epsilons);
            }
            case 4 /* Regex.Kind.KLEENESTAR */: {
                const childOutID = this.makeNode([outID]);
                const childInID = this.makeFromRegex(regex.child, childOutID);
                this.nodes[childOutID].epsilons.push(childInID);
                return this.makeNode([childInID, outID]);
            }
            case 5 /* Regex.Kind.ACCEPT */: {
                const node = this.nodes[outID];
                node.acceptSet.push(regex.accept);
                return outID;
            }
        }
    }
    toDFA() {
        // https://en.wikipedia.org/wiki/Powerset_construction
        const { alphabetSize, nodes } = this;
        // need to use a primitive key which will be compared by value; bigint is faster than sorting and joining as a string
        const nfaStates = IDMap.withKey(ISet.toBigInt);
        const dfaNodes = [];
        function getNodeID(nfaState) {
            // epsilon closure, by depth-first search
            // use ISet instead of Set<number> or bigint for the state, for performance
            const stack = ISet.toArray(nfaState);
            while (stack.length > 0) {
                const nfaNodeID = stack.pop();
                for (const eps of nodes[nfaNodeID].epsilons) {
                    if (!ISet.has(nfaState, eps)) {
                        ISet.add(nfaState, eps);
                        stack.push(eps);
                    }
                }
            }
            return nfaStates.getOrCreateID(nfaState);
        }
        const startID = getNodeID(ISet.of(nodes.length, [this.startID]));
        // sanity check
        if (startID !== 0) {
            throw new Error();
        }
        const acceptSetMap = IDMap.withKey(ISet.arrayToBigInt);
        // this loop iterates over `nfaStates`, while adding to it via `getNodeID`
        for (let nfaStateID = 0; nfaStateID < nfaStates.size(); ++nfaStateID) {
            const transitionStates = makeArray(alphabetSize, () => ISet.empty(nodes.length));
            const acceptIDs = [];
            ISet.forEach(nfaStates.getByID(nfaStateID), nfaNodeID => {
                const nfaNode = nodes[nfaNodeID];
                for (const letterID of nfaNode.letters) {
                    ISet.add(transitionStates[letterID], nfaNode.nextID);
                }
                acceptIDs.push(...nfaNode.acceptSet);
            });
            dfaNodes.push({
                transitions: transitionStates.map(getNodeID),
                acceptSetID: acceptSetMap.getOrCreateID(acceptIDs),
                acceptIDs,
            });
        }
        return new DFA(alphabetSize, this.acceptCount, acceptSetMap, dfaNodes);
    }
}
class DFA {
    alphabetSize;
    acceptCount;
    acceptSetMap;
    nodes;
    constructor(alphabetSize, acceptCount, acceptSetMap, nodes) {
        this.alphabetSize = alphabetSize;
        this.acceptCount = acceptCount;
        this.acceptSetMap = acceptSetMap;
        this.nodes = nodes;
        //console.log(`DFA with ${nodes.length} nodes on alphabet of size ${alphabetSize}, ${acceptCount} accepts and ${acceptSetMap.size()} accept sets`);
    }
    /**
     * Returns the number of distinct states of this DFA.
     */
    size() {
        return this.nodes.length;
    }
    go(state, letterID) {
        const { nodes, alphabetSize } = this;
        if (state >= 0 && state < nodes.length && letterID >= 0 && letterID < alphabetSize) {
            return nodes[state].transitions[letterID];
        }
        else {
            throw new Error();
        }
    }
    getAcceptIDs(state) {
        return this.nodes[state].acceptIDs;
    }
    getAcceptSetID(state) {
        return this.nodes[state].acceptSetID;
    }
    /**
     * Returns an array mapping each acceptID to the set of node IDs which accept it.
     */
    computeAcceptingStates() {
        const { nodes, acceptCount } = this;
        const n = nodes.length;
        const table = makeArray(acceptCount, () => ISet.empty(n));
        for (let id = 0; id < n; ++id) {
            for (const acceptID of nodes[id].acceptIDs) {
                ISet.add(table[acceptID], id);
            }
        }
        return table;
    }
    /**
     * Returns an equivalent DFA with the minimum possible number of states.
     */
    minimise() {
        // https://en.wikipedia.org/wiki/DFA_minimization#Hopcroft's_algorithm
        const { alphabetSize, nodes } = this;
        const n = nodes.length;
        const inverseTransitions = makeArray(alphabetSize * n, () => ISet.empty(n));
        for (let id = 0; id < n; ++id) {
            const { transitions } = nodes[id];
            for (let c = 0; c < alphabetSize; ++c) {
                ISet.add(inverseTransitions[c * n + transitions[c]], id);
            }
        }
        const partition = new Partition(n);
        for (const d of this.computeAcceptingStates()) {
            partition.refine(d);
        }
        while (true) {
            const a = partition.pollUnprocessed();
            if (a === undefined) {
                break;
            }
            for (let c = 0; c < alphabetSize; ++c) {
                const x = ISet.empty(n);
                for (const id of a) {
                    ISet.addAll(x, inverseTransitions[c * n + id]);
                }
                partition.refine(x);
                // shortcut if the DFA cannot be minimised
                if (partition.countSubsets() === n) {
                    return this;
                }
            }
        }
        const reps = IDMap.withKey(id => partition.getRepresentative(id));
        // ensure id(rep(0)) === 0, so that 0 is still the starting state
        reps.getOrCreateID(0);
        partition.forEachRepresentative(x => reps.getOrCreateID(x));
        const repNodes = reps.map(rep => {
            const { transitions, acceptSetID, acceptIDs } = this.nodes[rep];
            return {
                transitions: transitions.map(nodeID => reps.getID(nodeID)),
                acceptSetID,
                acceptIDs,
            };
        });
        return new DFA(alphabetSize, this.acceptCount, this.acceptSetMap, repNodes);
    }
}
// https://lospec.com/palette-list/pico-8
const PICO8_PALETTE = {
    B: '#000000',
    I: '#1D2B53',
    P: '#7E2553',
    E: '#008751',
    N: '#AB5236',
    D: '#5F574F',
    A: '#C2C3C7',
    W: '#FFF1E8',
    R: '#FF004D',
    O: '#FFA300',
    Y: '#FFEC27',
    G: '#00E436',
    U: '#29ADFF',
    S: '#83769C',
    K: '#FF77A8',
    F: '#FFCCAA',
};
function displayGrid(grid, scale = 8) {
    const canvasElem = document.createElement('canvas');
    canvasElem.width = grid.width * scale;
    canvasElem.height = grid.height * scale;
    document.body.appendChild(canvasElem);
    const ctx = canvasElem.getContext('2d');
    ctx.fillStyle = PICO8_PALETTE[grid.alphabet.getByID(0)];
    ctx.fillRect(0, 0, grid.width * scale, grid.height * scale);
    grid.listen((minX, minY, maxX, maxY) => {
        for (let y = minY; y < maxY; ++y) {
            for (let x = minX; x < maxX; ++x) {
                ctx.fillStyle = PICO8_PALETTE[grid.get(x, y)] ?? 'black';
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    });
}
/**
 * Builds a pair of DFAs which can be used to match 2D patterns. The `rowDFA`
 * recognises pattern rows, and the `colDFA` recognises sequences of pattern
 * rows matched by the `rowDFA`.
 *
 * The DFAs recognise the patterns in reverse order, for convenience so that
 * matches are reported where the patterns start rather than where they end.
 */
class PatternMatcher {
    alphabet;
    /**
     * The number of patterns recognised by this matcher.
     */
    numPatterns;
    /**
     * The DFA which recognises rows of patterns.
     */
    rowDFA;
    /**
     * The DFA which recognises sequences of matches from `rowDFA`.
     */
    colDFA;
    acceptSetMapSize;
    acceptSetDiffs;
    constructor(
    /**
     * The alphabet of symbols which can appear in patterns recognised by this matcher.
     */
    alphabet, patterns) {
        this.alphabet = alphabet;
        const numPatterns = this.numPatterns = patterns.size();
        const rowPatterns = IDMap.ofWithKey(patterns.map(p => p.rows()).flat(), Pattern.key);
        const rowRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(rowPatterns.map((row, rowID) => Regex.concat([
                Regex.concat(row.rasterData.map(c => c < 0 ? Regex.wildcard() : Regex.letters([c])).reverse()),
                Regex.accept(rowID),
            ]))),
        ]);
        this.rowDFA = Regex.compile(alphabet.size(), rowPatterns.size(), rowRegex);
        const acceptingSets = makeArray(rowPatterns.size(), () => []);
        this.rowDFA.acceptSetMap.forEach((xs, id) => {
            for (const x of xs) {
                acceptingSets[x].push(id);
            }
        });
        const colRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(patterns.map((pattern, patternID) => Regex.concat([
                Regex.concat(pattern.rows().map(row => {
                    const rowID = rowPatterns.getID(row);
                    return Regex.letters(acceptingSets[rowID]);
                }).reverse()),
                Regex.accept(patternID),
            ]))),
        ]);
        this.colDFA = Regex.compile(this.rowDFA.acceptSetMap.size(), numPatterns, colRegex);
        // precompute set differences, so that new/broken matches can be iterated in O(1) time per match
        const { acceptSetMap } = this.colDFA;
        this.acceptSetMapSize = acceptSetMap.size();
        const diffs = this.acceptSetDiffs = [];
        acceptSetMap.forEach(q => {
            const qSet = ISet.of(numPatterns, q);
            acceptSetMap.forEach(p => {
                const arr = p.filter(x => !ISet.has(qSet, x));
                diffs.push(arr);
            });
        });
    }
    getAcceptSetDiff(pState, qState) {
        const { colDFA, acceptSetMapSize: k } = this;
        const pID = colDFA.getAcceptSetID(pState), qID = colDFA.getAcceptSetID(qState);
        return this.acceptSetDiffs[pID + k * qID];
    }
    makeState(width, height) {
        return new MatcherState(this, width, height);
    }
}
class MatcherState {
    matcher;
    grid;
    /**
     * Maps each `grid.index(x, y)` to the row-DFA state at (x, y).
     */
    rowStates;
    /**
     * Maps each `grid.index(x, y)` to the column-DFA state at (x, y).
     */
    colStates;
    /**
     * Maps each pattern ID to the set of indices `grid.index(x, y)` where that pattern is matched at (x, y).
     *
     * Invariant: `matchIndices[p].has(i)` if and only if `matcher.colDFA` accepts `p` at state `colStates[i]`
     */
    matchIndices;
    constructor(matcher, width, height) {
        this.matcher = matcher;
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
    countMatches(patternID) {
        return this.matchIndices[patternID].size();
    }
    /**
     * Returns the coordinates of a random match of the given pattern, in O(1) time,
     * or `undefined` if there are no matches.
     */
    getRandomMatch(patternID) {
        const index = this.matchIndices[patternID].sample();
        if (index !== undefined) {
            const { width } = this.grid;
            return {
                x: index % width,
                y: Math.floor(index / width),
            };
        }
        else {
            return undefined;
        }
    }
    /**
     * Updates the state to account for changes in the rectangular area from
     * startX/Y (inclusive) to endX/Y (exclusive).
     */
    recompute(startX, startY, endX, endY) {
        const { matcher, grid, rowStates, colStates, matchIndices } = this;
        const { rowDFA, colDFA } = matcher;
        const { width, height } = grid;
        // the pattern matching is done in reverse, for convenience so that
        // matches are accepted where the patterns start rather than where they end
        // recompute rowStates
        let minChangedX = startX;
        for (let y = startY; y < endY; ++y) {
            let state = endX === width ? 0 : rowStates[grid.index(endX, y)];
            for (let x = endX - 1; x >= 0; --x) {
                // O(1) time per iteration
                const index = grid.index(x, y);
                state = rowDFA.go(state, grid.grid[index]);
                if (state !== rowStates[index]) {
                    rowStates[index] = state;
                    minChangedX = Math.min(minChangedX, x);
                }
                else if (x < startX) {
                    break;
                }
            }
        }
        // recompute colStates
        for (let x = minChangedX; x < endX; ++x) {
            let state = endY === height ? 0 : colStates[grid.index(x, endY)];
            for (let y = endY - 1; y >= 0; --y) {
                // O(m + 1) time per iteration, where m is the number of new + broken matches
                const index = grid.index(x, y);
                const acceptSetID = rowDFA.getAcceptSetID(rowStates[index]);
                state = colDFA.go(state, acceptSetID);
                const oldState = colStates[index];
                if (state !== oldState) {
                    colStates[index] = state;
                    // remove broken matches
                    for (const acceptID of matcher.getAcceptSetDiff(oldState, state)) {
                        matchIndices[acceptID].delete(index);
                    }
                    // add new matches
                    for (const acceptID of matcher.getAcceptSetDiff(state, oldState)) {
                        matchIndices[acceptID].add(index);
                    }
                }
                else if (y < startY) {
                    break;
                }
            }
        }
    }
}
///<reference path="matcher.ts"/>
class Grid {
    alphabet;
    width;
    height;
    /**
     * Maps each `index(x, y)` to the ID of the symbol at (x, y).
     */
    grid;
    /**
     * Array of listeners which will be notified after any area of the grid has changed.
     */
    onChange = [];
    constructor(alphabet, width, height) {
        this.alphabet = alphabet;
        this.width = width;
        this.height = height;
        this.grid = makeUintArray(width * height, alphabet.size());
    }
    index(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error(`Out of bounds: ${x},${y}`);
        }
        return x + y * this.width;
    }
    get(x, y) {
        const c = this.grid[this.index(x, y)];
        return this.alphabet.getByID(c);
    }
    set(x, y, value) {
        this.grid[this.index(x, y)] = this.alphabet.getID(value);
        this.notify(x, y, x + 1, y + 1);
    }
    /**
     * Writes a pattern into the grid, starting at the coordinates (x, y).
     */
    setPattern(x, y, pattern) {
        const { grid } = this;
        const { vectorData, minX, minY, maxX, maxY } = pattern;
        for (let i = 0; i < vectorData.length; i += 3) {
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
    listen(f) {
        this.onChange.push(f);
    }
    /**
     * Notifies listeners of changes in the rectangular area from startX/Y
     * (inclusive) to endX/Y (exclusive).
     */
    notify(startX, startY, endX, endY) {
        for (const f of this.onChange) {
            f(startX, startY, endX, endY);
        }
    }
}
/**
 * Assigns unique, incremental IDs to a set of values.
 */
class IDMap {
    keyFunc;
    static IDENTITY = (x) => x;
    static empty() {
        return new IDMap(IDMap.IDENTITY);
    }
    static withKey(keyFunc) {
        return new IDMap(keyFunc);
    }
    /**
     * Creates a new IDMap with the distinct elements from `iterable`, with IDs
     * in order of first occurrence.
     */
    static of(iterable) {
        return IDMap.ofWithKey(iterable, IDMap.IDENTITY);
    }
    static ofWithKey(iterable, keyFunc) {
        const map = new IDMap(keyFunc);
        for (const x of iterable) {
            map.getOrCreateID(x);
        }
        return map;
    }
    /**
     * Returns a new array of the distinct elements from `iterable`, in order
     * of first occurrence.
     */
    static distinct(iterable) {
        return IDMap.of(iterable).arr;
    }
    /**
     * Returns a new array of the elements from `iterable`, deduplicated using
     * the given key function, in order of first occurrence. If multiple values
     * have the same key, only the first is included.
     */
    static distinctByKey(iterable, keyFunc) {
        return IDMap.ofWithKey(iterable, keyFunc).arr;
    }
    /**
     * The distinct elements in this map, in insertion order.
     */
    arr = [];
    /**
     * Maps elements to their indices in `arr`.
     *
     * Invariant: `ids.get(keyFunc(x)) === i` if and only if `arr[i] === x`
     */
    ids = new Map();
    constructor(keyFunc) {
        this.keyFunc = keyFunc;
    }
    /**
     * Returns the number of elements in the map.
     */
    size() {
        return this.arr.length;
    }
    /**
     * Adds an element to the map if it is not already present, and returns the
     * element's ID, in O(1) time.
     */
    getOrCreateID(x) {
        const key = this.keyFunc(x);
        let id = this.ids.get(key);
        if (id === undefined) {
            id = this.arr.length;
            this.arr.push(x);
            this.ids.set(key, id);
        }
        return id;
    }
    /**
     * Indicates whether the given element is associated with an ID, in O(1)
     * time.
     */
    has(x) {
        return this.ids.has(this.keyFunc(x));
    }
    /**
     * Returns the ID of the given element, in O(1) time. An error is thrown if
     * the element is not associated with an ID.
     */
    getID(x) {
        const id = this.ids.get(this.keyFunc(x));
        if (id === undefined) {
            throw new Error();
        }
        return id;
    }
    /**
     * Returns the ID of the given element, or -1 if the given element is not
     * associated with an ID, in O(1) time.
     */
    getIDOrDefault(x) {
        return this.ids.get(this.keyFunc(x)) ?? -1;
    }
    /**
     * Returns the element associated with the given ID, in O(1) time. An error
     * is thrown if there is no element with the given ID.
     */
    getByID(id) {
        if (id < 0 || id >= this.arr.length) {
            throw new Error();
        }
        return this.arr[id];
    }
    forEach(f) {
        this.arr.forEach(f);
    }
    map(f) {
        return this.arr.map(f);
    }
}
/**
 * Helper functions for using a typed array as a set of natural numbers.
 *
 * Aggregate operations `addAll`, `toArray` and `forEach` are O(N), where N is
 * the domain size; therefore they must not be used in the pattern matching loop.
 */
var ISet;
(function (ISet) {
    /**
     * Creates an empty set, which can contain numbers `0 <= x < domainSize`.
     */
    function empty(domainSize) {
        return new Uint32Array(((domainSize - 1) >> 5) + 1);
    }
    ISet.empty = empty;
    /**
     * Creates a set containing the whole domain `0 <= x < domainSize`.
     */
    function full(domainSize) {
        const set = empty(domainSize);
        set.fill(-1);
        if ((domainSize & 31) !== 0) {
            set[set.length - 1] = (1 << (domainSize & 31)) - 1;
        }
        return set;
    }
    ISet.full = full;
    /**
     * Creates a set from an iterable of natural numbers, all of which must be
     * less than `domainSize`.
     */
    function of(domainSize, xs) {
        const set = empty(domainSize);
        for (const x of xs) {
            add(set, x);
        }
        return set;
    }
    ISet.of = of;
    /**
     * Indicates whether `set` contains the element `x`, in O(1) time.
     */
    function has(set, x) {
        return (set[x >> 5] & (1 << (x & 31))) !== 0;
    }
    ISet.has = has;
    /**
     * Returns the size of the set, in O(N) time.
     */
    function size(set) {
        let count = 0;
        for (let x of set) {
            while (x !== 0) {
                x &= x - 1;
                ++count;
            }
        }
        return count;
    }
    ISet.size = size;
    /**
     * Adds the element `x` to the set if it not already present, in O(1) time.
     */
    function add(set, x) {
        set[x >> 5] |= 1 << (x & 31);
    }
    ISet.add = add;
    /**
     * Adds all the members of the set `b` to the set `a`, in O(N) time.
     */
    function addAll(a, b) {
        if (a.length < b.length) {
            throw new Error();
        }
        for (let i = 0; i < b.length; ++i) {
            a[i] |= b[i];
        }
    }
    ISet.addAll = addAll;
    /**
     * Converts a set from an array to a `bigint`, in O(N^2) time.
     *
     * Using a primitive type is convenient for Map keys; `number` would only
     * work for sets with domain sizes of at most 32, and strings are slower.
     */
    function arrayToBigInt(xs) {
        let domainSize = 0;
        for (const x of xs) {
            domainSize = Math.max(domainSize, x + 1);
        }
        return domainSize > 0 ? toBigInt(of(domainSize, xs)) : 0n;
    }
    ISet.arrayToBigInt = arrayToBigInt;
    /**
     * Converts a set to a `bigint`, in O(N^2) time.
     *
     * Using a primitive type is convenient for Map keys; `number` would only
     * work for sets with domain sizes of at most 32, and strings are slower.
     */
    function toBigInt(set) {
        let r = 0n;
        for (let i = set.length - 1; i >= 0; --i) {
            r <<= 32n;
            r |= BigInt(set[i]);
        }
        return r;
    }
    ISet.toBigInt = toBigInt;
    /**
     * Returns a new array of the natural numbers in the given set, not
     * necessarily in order.
     */
    function toArray(set) {
        const arr = [];
        forEach(set, x => arr.push(x));
        return arr;
    }
    ISet.toArray = toArray;
    /**
     * Calls the function `f` for each element of the set, not necessarily in
     * order.
     */
    function forEach(set, f) {
        for (let i = 0; i < set.length; ++i) {
            const x = i << 5;
            let setPart = set[i];
            while (setPart !== 0) {
                // position of the highest 1 bit
                const dx = 31 - Math.clz32(setPart);
                // 'x ^ dx' is equivalent to `x + dx` here
                f(x ^ dx);
                // clear this bit
                setPart ^= 1 << dx;
            }
        }
    }
    ISet.forEach = forEach;
})(ISet || (ISet = {}));
///<reference path="dfa.ts"/>
///<reference path="display.ts"/>
function runDemo(size = 2) {
    const GRID_SIZE = (1 << 7) * size;
    const SPEED = 16 * size * size;
    const LAKE_SEEDS = 4;
    const LAKE_SIZE = (1 << 12) * size * size;
    const LAND_SEEDS = 32;
    const alphabet = IDMap.of('BWREI');
    const rules = [
        // make a few lakes by random growth
        rule('B', 'I', LAKE_SEEDS),
        rule('IB', '*I', LAKE_SIZE - LAKE_SEEDS),
        // make some land by a self-avoiding random walk with backtracking
        rule('B', 'R', LAND_SEEDS),
        rule('RBB', 'WWR'),
        rule('RWW', 'EER'),
        rule('R', 'E'),
        // erode narrow sections of land
        rule('BBWBB', '**B**'),
        // replace the solid lakes with isolated pixels
        rule('II', 'BB', LAKE_SIZE / 2),
        // fill unused space with a water texture
        rule('BB*/BBB/*B*', '***/*I*/***'),
        rule('*I*/IBI/*I*', '***/*I*/***'),
        // delete water pixels at random, for an animated effect
        rule('I', 'B'),
    ];
    function rule(patternIn, patternOut, limit) {
        return { patternIn, patternOut, limit };
    }
    const patternsIn = IDMap.withKey(Pattern.key);
    const patternsOut = IDMap.withKey(Pattern.key);
    const compiledRules = rules.map(spec => {
        const rewrites = Symmetry.generate(Pattern.of(alphabet, spec.patternIn), Pattern.of(alphabet, spec.patternOut)).map(([p, q]) => [
            patternsIn.getOrCreateID(p),
            patternsOut.getOrCreateID(q),
        ]);
        return { rewrites, limit: spec.limit };
    });
    function applyRule(state, rule) {
        if (rule.limit !== undefined && rule.limit <= 0) {
            return false;
        }
        const { rewrites } = rule;
        const counts = rewrites.map(pair => state.countMatches(pair[0]));
        const totalCount = counts.reduce((a, b) => a + b, 0);
        if (totalCount === 0) {
            return false;
        }
        let r = rng(totalCount);
        for (let i = 0; i < counts.length; ++i) {
            r -= counts[i];
            if (r < 0) {
                const [pID, qID] = rewrites[i];
                const pos = state.getRandomMatch(pID);
                state.grid.setPattern(pos.x, pos.y, patternsOut.getByID(qID));
                if (rule.limit !== undefined) {
                    --rule.limit;
                }
                return true;
            }
        }
        throw new Error();
    }
    function step(state, rules, k) {
        let changed = false;
        for (let i = 0; i < k; ++i) {
            changed = rules.some(r => applyRule(state, r));
            if (!changed) {
                break;
            }
        }
        return changed;
    }
    const state = new PatternMatcher(alphabet, patternsIn).makeState(GRID_SIZE, GRID_SIZE);
    const scale = Math.max(1, Math.floor(window.innerHeight / state.grid.height));
    displayGrid(state.grid, scale);
    function frameHandler() {
        if (step(state, compiledRules, SPEED)) {
            requestAnimationFrame(frameHandler);
        }
    }
    requestAnimationFrame(frameHandler);
}
/**
 * Creates an empty array of length `n`, which can hold unsigned integers less
 * than `domainSize` (exclusive). The array is initially filled with zeroes.
 */
function makeUintArray(n, domainSize) {
    if (domainSize <= (1 << 8)) {
        return new Uint8Array(n);
    }
    else if (domainSize <= (1 << 16)) {
        return new Uint16Array(n);
    }
    else {
        return new Uint32Array(n);
    }
}
/**
 * Creates an empty array of length `n`, filled with the given value.
 */
function emptyArray(n, value) {
    return makeArray(n, () => value);
}
/**
 * Creates an array of length `n`, initialised using the given callback function.
 */
function makeArray(n, f) {
    // equivalent to `Array(n).map((_, i) => f(i))`, but guarantees an array without holes, which may be more performant to use
    const arr = [];
    for (let i = 0; i < n; ++i) {
        arr.push(f(i));
    }
    return arr;
}
/**
 * Returns a random integer from 0 to n - 1.
 */
function rng(n) {
    return Math.floor(Math.random() * n);
}
/**
 * A small rectangular pattern which can be matched in a grid, or written to it.
 * Patterns may contain wildcards, which match any symbol and do not write
 * anything to the grid.
 */
class Pattern {
    width;
    height;
    rasterData;
    /**
     * Creates a pattern from a string.
     *
     * The pattern is specified by a string with rows separated by `/`; wildcards
     * `*` in the pattern match any symbol and do not write anything to the grid.
     */
    static of(alphabet, pattern) {
        const rows = pattern.split('/');
        const width = rows[0].length;
        const height = rows.length;
        if (rows.some(row => row.length !== width)) {
            throw new Error(pattern);
        }
        function symbolToID(c) {
            return c === '*' ? -1 : alphabet.getID(c);
        }
        const rasterData = rows.flatMap(row => [...row].map(symbolToID));
        return new Pattern(width, height, rasterData);
    }
    /**
     * Rotates a pattern clockwise by 90 degrees.
     */
    static rotate(pattern) {
        const { width, height, rasterData } = pattern;
        const newData = [];
        for (let x = 0; x < width; ++x) {
            for (let y = height - 1; y >= 0; --y) {
                newData.push(rasterData[x + width * y]);
            }
        }
        return new Pattern(height, width, newData);
    }
    /**
     * Reflects a pattern from top to bottom.
     */
    static reflect(pattern) {
        const { width, height, rasterData } = pattern;
        const newData = [];
        for (let y = height - 1; y >= 0; --y) {
            for (let x = 0; x < width; ++x) {
                newData.push(rasterData[x + width * y]);
            }
        }
        return new Pattern(width, height, newData);
    }
    /**
     * Returns a string representation of a pattern, for use as a Map key.
     */
    static key(pattern) {
        return pattern._key ??= `${pattern.width}:${pattern.height}:${pattern.rasterData.join(',')}`;
    }
    /**
     * The cached key; see `Pattern.key`.
     */
    _key = undefined;
    /**
     * A flat array of (x, y, c) triples for each occurrence of a non-wildcard
     * symbol `c` at a position (x, y) in this pattern.
     */
    vectorData;
    minX;
    minY;
    maxX;
    maxY;
    constructor(
    /**
     * The width of the pattern.
     */
    width, 
    /**
     * The height of the pattern.
     */
    height, 
    /**
     * The cells of the pattern. A value of -1 indicates a wildcard.
     */
    rasterData) {
        this.width = width;
        this.height = height;
        this.rasterData = rasterData;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        const vectorData = this.vectorData = [];
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                const c = rasterData[x + width * y];
                if (c >= 0) {
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
    rows() {
        const { width, height, rasterData } = this;
        const out = [];
        for (let y = 0; y < height; ++y) {
            const row = rasterData.slice(y * width, (y + 1) * width);
            out.push(new Pattern(width, 1, row));
        }
        return out;
    }
}
/**
 * A mutable set which can be randomly sampled in O(1) time.
 */
class SampleableSet {
    constructor(domainSize) { }
    /**
     * An unordered array of the set's members.
     */
    arr = [];
    /**
     * Maps the set's members to their indices in `arr`.
     *
     * Invariant: `arr[i] === x` if and only if `indices.get(x) === i`
     */
    indices = new Map();
    /**
     * Returns the number of elements in the set.
     */
    size() {
        return this.arr.length;
    }
    /**
     * Indicates whether the given value is a member of the set, in O(1) time.
     */
    has(x) {
        return this.indices.has(x);
    }
    /**
     * Adds an element to the set, if it is not already present, in O(1) time.
     */
    add(x) {
        const { arr, indices } = this;
        if (!indices.has(x)) {
            indices.set(x, arr.length);
            arr.push(x);
        }
    }
    /**
     * Deletes an element from the set, if it is present, in O(1) time.
     */
    delete(x) {
        const { arr, indices } = this;
        const i = indices.get(x);
        if (i !== undefined) {
            const j = arr.length - 1;
            if (i !== j) {
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
    sample() {
        const { arr } = this;
        return arr.length > 0 ? arr[rng(arr.length)] : undefined;
    }
}
///<reference path="pattern.ts"/>
var Symmetry;
(function (Symmetry) {
    const GENERATING_SET = [Pattern.rotate, Pattern.reflect];
    function generate(patternIn, patternOut, symmetries = GENERATING_SET) {
        // depth-first search
        const stack = [[patternIn, patternOut]];
        const entries = new Map();
        // TODO: key should include patternOut
        entries.set(Pattern.key(patternIn), [patternIn, patternOut]);
        while (stack.length > 0) {
            const [p, q] = stack.pop();
            for (const f of symmetries) {
                const pSym = f(p);
                const key = Pattern.key(pSym);
                if (!entries.has(key)) {
                    const pair = [pSym, f(q)];
                    entries.set(key, pair);
                    stack.push(pair);
                }
            }
        }
        return [...entries.values()];
    }
    Symmetry.generate = generate;
})(Symmetry || (Symmetry = {}));
