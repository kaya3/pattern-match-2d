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
        const arr = [];
        for (let i = 0; i < n; ++i) {
            arr.push(i);
        }
        this.arr = arr;
        this.indices = arr.slice();
        const initialSubset = this.makeSubset(0, n, true);
        this.map = emptyArray(n, initialSubset);
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
            const subset = this.unprocessed.pop();
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
     *
     * The time complexity is linear in the size of the given set.
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
    function letters(letters) {
        return { kind: 0 /* LETTERS */, letters };
    }
    Regex.letters = letters;
    function wildcard() {
        return { kind: 1 /* WILDCARD */ };
    }
    Regex.wildcard = wildcard;
    function concat(children) {
        return { kind: 2 /* CONCAT */, children };
    }
    Regex.concat = concat;
    function union(children) {
        return { kind: 3 /* UNION */, children };
    }
    Regex.union = union;
    function kleeneStar(child) {
        return { kind: 4 /* KLEENESTAR */, child };
    }
    Regex.kleeneStar = kleeneStar;
    function accept(accept) {
        return { kind: 5 /* ACCEPT */, accept };
    }
    Regex.accept = accept;
    function compile(alphabet, regex) {
        return new NFA(alphabet, regex).toDFA().minimise();
    }
    Regex.compile = compile;
})(Regex || (Regex = {}));
class NFA {
    alphabet;
    nodes = [];
    acceptMap = new IDMap();
    startID;
    constructor(alphabet, regex) {
        this.alphabet = alphabet;
        this.startID = this.makeFromRegex(regex, this.makeNode([]));
    }
    makeNode(epsilons, letters = ISet.EMPTY, nextID = -1) {
        const { nodes } = this;
        const id = nodes.length;
        nodes.push({ epsilons, letters, nextID, acceptSet: ISet.EMPTY });
        return id;
    }
    makeFromRegex(regex, outID) {
        // https://en.wikipedia.org/wiki/Thompson's_construction
        switch (regex.kind) {
            case 0 /* LETTERS */: {
                const lettersSet = this.alphabet.toIDSet(regex.letters);
                return this.makeNode([], lettersSet, outID);
            }
            case 1 /* WILDCARD */: {
                return this.makeNode([], ISet.full(this.alphabet.size()), outID);
            }
            case 2 /* CONCAT */: {
                const { children } = regex;
                for (let i = children.length - 1; i >= 0; --i) {
                    outID = this.makeFromRegex(children[i], outID);
                }
                return outID;
            }
            case 3 /* UNION */: {
                const epsilons = regex.children.map(child => this.makeFromRegex(child, this.makeNode([outID])));
                return this.makeNode(epsilons);
            }
            case 4 /* KLEENESTAR */: {
                const childOutID = this.makeNode([outID]);
                const childInID = this.makeFromRegex(regex.child, childOutID);
                this.nodes[childOutID].epsilons.push(childInID);
                return this.makeNode([childInID, outID]);
            }
            case 5 /* ACCEPT */: {
                const node = this.nodes[outID];
                node.acceptSet |= ISet.singleton(this.acceptMap.getOrCreateID(regex.accept));
                return outID;
            }
        }
    }
    toDFA() {
        // https://en.wikipedia.org/wiki/Powerset_construction
        const alphabetSize = this.alphabet.size();
        const nfaNodes = this.nodes;
        const nfaStates = new IDMap();
        const dfaNodes = [];
        const { acceptMap } = this;
        function getNodeID(nfaState) {
            // epsilon closure
            let arr = ISet.toArray(nfaState);
            // this loop iterates over `arr`, while pushing to it
            for (let i = 0; i < arr.length; ++i) {
                const nfaNodeID = arr[i];
                for (const eps of nfaNodes[nfaNodeID].epsilons) {
                    if (!ISet.has(nfaState, eps)) {
                        nfaState |= ISet.singleton(eps);
                        arr.push(eps);
                    }
                }
            }
            return nfaStates.getOrCreateID(nfaState);
        }
        const startID = getNodeID(ISet.singleton(this.startID));
        // sanity check
        if (startID !== 0) {
            throw new Error();
        }
        const acceptSetMap = new IDMap();
        // this loop iterates over `nfaStates`, while pushing to it via `getNodeID`
        for (let nfaStateID = 0; nfaStateID < nfaStates.size(); ++nfaStateID) {
            const transitionStates = emptyArray(alphabetSize, ISet.EMPTY);
            let acceptSet = ISet.EMPTY;
            ISet.forEach(nfaStates.getByID(nfaStateID), nfaNodeID => {
                const nfaNode = nfaNodes[nfaNodeID];
                ISet.forEach(nfaNode.letters, letterID => {
                    transitionStates[letterID] |= ISet.singleton(nfaNode.nextID);
                });
                acceptSet |= nfaNode.acceptSet;
            });
            const acceptSetID = acceptSetMap.getOrCreateID(acceptSet);
            const transitions = transitionStates.map(getNodeID);
            dfaNodes.push({
                transitions,
                acceptSetID,
                acceptIDs: ISet.toArray(acceptSet)
            });
        }
        return new DFA(alphabetSize, acceptMap, acceptSetMap, dfaNodes);
    }
}
class DFA {
    alphabetSize;
    acceptMap;
    acceptSetMap;
    nodes;
    constructor(alphabetSize, acceptMap, acceptSetMap, nodes) {
        this.alphabetSize = alphabetSize;
        this.acceptMap = acceptMap;
        this.acceptSetMap = acceptSetMap;
        this.nodes = nodes;
    }
    go(stateID, letterID) {
        const { nodes } = this;
        if (stateID >= 0 && stateID < nodes.length) {
            const t = this.nodes[stateID].transitions;
            return letterID >= 0 && letterID < t.length ? t[letterID] : -1;
        }
        else {
            return -1;
        }
    }
    getAcceptIDs(stateID) {
        return this.nodes[stateID].acceptIDs;
    }
    getAcceptSetID(stateID) {
        return this.nodes[stateID].acceptSetID;
    }
    /**
     * Returns an array mapping each acceptID to the set of node IDs which accept it.
     */
    computeAcceptingStates() {
        const { nodes, acceptMap } = this;
        const table = emptyArray(acceptMap.size(), ISet.EMPTY);
        for (let id = 0; id < nodes.length; ++id) {
            for (const acceptID of this.getAcceptIDs(id)) {
                table[acceptID] |= ISet.singleton(id);
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
        const inverseTransitions = emptyArray(alphabetSize * nodes.length, ISet.EMPTY);
        for (let id = 0; id < nodes.length; ++id) {
            const { transitions } = nodes[id];
            const idSingleton = ISet.singleton(id);
            for (let c = 0; c < alphabetSize; ++c) {
                inverseTransitions[c + transitions[c] * alphabetSize] |= idSingleton;
            }
        }
        const partition = new Partition(nodes.length);
        for (const d of this.computeAcceptingStates()) {
            partition.refine(d);
        }
        while (true) {
            const a = partition.pollUnprocessed();
            if (a === undefined) {
                break;
            }
            for (let c = 0; c < alphabetSize; ++c) {
                let x = ISet.EMPTY;
                for (const id of a) {
                    x |= inverseTransitions[c + id * alphabetSize];
                }
                partition.refine(x);
            }
        }
        const reps = new IDMap();
        // ensure id(rep(0)) === 0, so that 0 is still the starting state
        reps.getOrCreateID(partition.getRepresentative(0));
        partition.forEachRepresentative(x => reps.getOrCreateID(x));
        const repNodes = reps.map(rep => {
            const { transitions, acceptSetID, acceptIDs } = this.nodes[rep];
            return {
                transitions: transitions.map(id => reps.getID(partition.getRepresentative(id))),
                acceptSetID,
                acceptIDs,
            };
        });
        return new DFA(alphabetSize, this.acceptMap, this.acceptSetMap, repNodes);
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
    document.getElementsByTagName('body')[0].appendChild(canvasElem);
    const ctx = canvasElem.getContext('2d');
    ctx.fillStyle = PICO8_PALETTE[grid.matcher.alphabet.getByID(0)];
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
    /**
     * The alphabet of symbols which can appear in patterns recognised by this matcher.
     */
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
     * The alphabet used in `colDFA`; each symbol represents a set of rows which
     * can be simultaneously matched by `rowDFA`.
     */
    colAlphabet;
    /**
     * The DFA which recognises sequences of matches from `rowDFA`.
     */
    colDFA;
    acceptSetMapSize;
    acceptSetDiffs;
    constructor(alphabet, patterns) {
        this.alphabet = IDMap.of(alphabet);
        this.numPatterns = patterns.length;
        const rowPatterns = [...new Set(patterns.flatMap(p => p.split('/')))];
        const rowRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(rowPatterns.map(row => Regex.concat([
                Regex.concat([...row].reverse().map(c => c === '*' ? Regex.wildcard() : Regex.letters([c]))),
                Regex.accept(row),
            ]))),
        ]);
        this.rowDFA = Regex.compile(this.alphabet, rowRegex);
        this.colAlphabet = this.rowDFA.acceptSetMap;
        const colRegex = Regex.concat([
            Regex.kleeneStar(Regex.wildcard()),
            Regex.union(patterns.map(pattern => Regex.concat([
                Regex.concat(pattern.split('/').reverse().map(row => {
                    const acceptID = this.rowDFA.acceptMap.getID(row);
                    return Regex.letters(this.colAlphabet.filter(acceptSet => ISet.has(acceptSet, acceptID)));
                })),
                Regex.accept(pattern),
            ]))),
        ]);
        this.colDFA = Regex.compile(this.colAlphabet, colRegex);
        // precompute set differences, so that new/broken matches can be iterated in O(1) time per match
        const { acceptSetMap } = this.colDFA;
        const k = this.acceptSetMapSize = acceptSetMap.size();
        this.acceptSetDiffs = makeArray(k * k, index => {
            const p = acceptSetMap.getByID(index % k);
            const q = acceptSetMap.getByID(Math.floor(index / k));
            return ISet.toArray(p & ~q);
        });
    }
    getAcceptSetDiff(pStateID, qStateID) {
        const { colDFA, acceptSetMapSize: k } = this;
        const pID = colDFA.getAcceptSetID(pStateID), qID = colDFA.getAcceptSetID(qStateID);
        return this.acceptSetDiffs[pID + k * qID];
    }
    makeGrid(width, height) {
        return new Grid(this, width, height);
    }
}
class Grid {
    matcher;
    width;
    height;
    /**
     * Maps each index `(x + width * y)` to the ID of the symbol at (x, y).
     */
    grid;
    /**
     * Maps each index `(x + width * y)` to the row-DFA state at (x, y).
     */
    rowStates;
    /**
     * Maps each index `(x + width * y)` to the column-DFA state at (x, y).
     */
    colStates;
    /**
     * Maps each pattern ID to the set of indices `(x + width * y)` where that pattern is matched at (x, y).
     *
     * Invariant: `matchIndices[p].has(i)` if and only if `matcher.colDFA` accepts `p` at state `colStates[i]`
     */
    matchIndices;
    /**
     * Array of listeners which will be notified after any area of the grid has changed.
     */
    onChange = [];
    constructor(matcher, width, height) {
        this.matcher = matcher;
        this.width = width;
        this.height = height;
        const n = width * height;
        // TODO: use Uint8Array/Uint16Array where possible
        this.grid = emptyArray(n, 0);
        this.rowStates = emptyArray(n, 0);
        this.colStates = emptyArray(n, 0);
        this.matchIndices = makeArray(matcher.numPatterns, () => new SampleableSet());
        this.recompute(0, 0, width, height);
    }
    _index(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error(`Out of bounds: ${x},${y}`);
        }
        return x + y * this.width;
    }
    get(x, y) {
        const c = this.grid[this._index(x, y)];
        return this.matcher.alphabet.getByID(c);
    }
    set(x, y, value) {
        this.grid[this._index(x, y)] = this.matcher.alphabet.getID(value);
        this.recompute(x, y, x + 1, y + 1);
    }
    /**
     * Writes a pattern into the grid, starting at the coordinates (x, y).
     *
     * The pattern is a string with rows separated by `/`; wildcards `*` in the
     * pattern do not write anything to the grid.
     */
    setPattern(x, y, pattern) {
        const { grid, matcher: { alphabet } } = this;
        const split = pattern.split('/');
        let startX = this.width, endX = 0, startY = this.height, endY = 0;
        for (let j = 0, yj = y; j < split.length; ++j, ++yj) {
            let row = split[j];
            for (let i = 0, xi = x; i < row.length; ++i, ++xi) {
                const c = row[i] === '*' ? -1 : alphabet.getID(row[i]);
                const index = this._index(xi, yj);
                if (c >= 0 && c !== grid[index]) {
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
    listen(f) {
        this.onChange.push(f);
    }
    /**
     * Returns the number of times the given pattern matches this grid, in O(1) time.
     */
    countMatches(pattern) {
        const patternID = this.matcher.colDFA.acceptMap.getID(pattern);
        return this.matchIndices[patternID].size();
    }
    /**
     * Returns the coordinates of a random match of the given pattern, in O(1) time,
     * or `undefined` if there are no matches.
     */
    getRandomMatch(pattern) {
        const { width, matcher: { colDFA } } = this;
        const patternID = colDFA.acceptMap.getID(pattern);
        const index = this.matchIndices[patternID].sample();
        if (index !== undefined) {
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
        for (const f of this.onChange) {
            f(startX, startY, endX, endY);
        }
        // TODO: move this to PatternMatcher class, using `listen`
        const { width, height, matcher, grid, rowStates, colStates, matchIndices } = this;
        const { rowDFA, colDFA } = matcher;
        // the pattern matching is done in reverse, for convenience so that
        // matches are accepted where the patterns start rather than where they end
        // recompute rowStates
        let minChangedX = startX;
        for (let y = startY; y < endY; ++y) {
            let stateID = endX === width ? 0 : rowStates[this._index(endX, y)];
            for (let x = endX - 1; x >= 0; --x) {
                // O(1) time per iteration
                const index = this._index(x, y);
                stateID = rowDFA.go(stateID, grid[index]);
                if (stateID !== rowStates[index]) {
                    rowStates[index] = stateID;
                    minChangedX = Math.min(minChangedX, x);
                }
                else if (x < startX) {
                    break;
                }
            }
        }
        // recompute colStates
        for (let x = minChangedX; x < endX; ++x) {
            let stateID = endY === height ? 0 : colStates[this._index(x, endY)];
            for (let y = endY - 1; y >= 0; --y) {
                // O(m) time per iteration, where m is the number of new + broken matches
                const index = this._index(x, y);
                const acceptSetID = rowDFA.getAcceptSetID(rowStates[index]);
                stateID = colDFA.go(stateID, acceptSetID);
                const oldStateID = colStates[index];
                if (stateID !== oldStateID) {
                    colStates[index] = stateID;
                    // remove broken matches
                    for (const acceptID of matcher.getAcceptSetDiff(oldStateID, stateID)) {
                        matchIndices[acceptID].delete(index);
                    }
                    // add new matches
                    for (const acceptID of matcher.getAcceptSetDiff(stateID, oldStateID)) {
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
/**
 * Assigns unique, incremental IDs to a set of values.
 */
class IDMap {
    static of(iterable) {
        const map = new IDMap();
        for (const x of iterable) {
            map.getOrCreateID(x);
        }
        return map;
    }
    /**
     * The distinct elements in this map, in insertion order.
     */
    arr = [];
    /**
     * Maps elements to their indices in `arr`.
     *
     * Invariant: `ids.get(x) === i` if and only if `arr[i] === x`
     */
    ids = new Map();
    size() {
        return this.arr.length;
    }
    getOrCreateID(x, ifNew) {
        let id = this.ids.get(x);
        if (id === undefined) {
            id = this.arr.length;
            this.arr.push(x);
            this.ids.set(x, id);
            ifNew?.(id);
        }
        return id;
    }
    getID(x) {
        const r = this.ids.get(x);
        if (r === undefined) {
            throw new Error();
        }
        return r;
    }
    getByID(i) {
        return this.arr[i];
    }
    getByIDs(ids) {
        return ISet.map(ids, id => this.getByID(id));
    }
    toIDSet(arr) {
        return ISet.of(arr.map(x => this.getID(x)));
    }
    forEach(f) {
        this.arr.forEach(f);
    }
    map(f) {
        return this.arr.map(f);
    }
    filter(f) {
        return this.arr.filter(f);
    }
}
/**
 * A mutable set which can be randomly sampled in O(1) time.
 */
class SampleableSet {
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
    size() {
        return this.arr.length;
    }
    has(x) {
        return this.indices.has(x);
    }
    add(x) {
        const { arr, indices } = this;
        if (!indices.has(x)) {
            indices.set(x, arr.length);
            arr.push(x);
        }
    }
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
/**
 * Helper functions for treating `bigint` values as immutable sets of natural
 * numbers.
 */
var ISet;
(function (ISet) {
    ISet.EMPTY = 0n;
    /**
     * Creates a set of one element.
     */
    function singleton(x) {
        return 1n << BigInt(x);
    }
    ISet.singleton = singleton;
    /**
     * Creates a set of all natural numbers from 0 to n - 1.
     */
    function full(n) {
        return (1n << BigInt(n)) - 1n;
    }
    ISet.full = full;
    /**
     * Creates a set from an iterable of natural numbers.
     */
    function of(xs) {
        let set = ISet.EMPTY;
        for (const x of xs) {
            set |= singleton(x);
        }
        return set;
    }
    ISet.of = of;
    /**
     * Indicates whether `set` contains the element `x`.
     */
    function has(set, x) {
        return (set & singleton(x)) !== ISet.EMPTY;
    }
    ISet.has = has;
    function forEach(set, f) {
        for (let i = 0; set !== ISet.EMPTY; ++i, set >>= 1n) {
            if (set & 1n) {
                f(i);
            }
        }
    }
    ISet.forEach = forEach;
    function map(set, f) {
        const arr = [];
        forEach(set, x => {
            arr.push(f(x));
        });
        return arr;
    }
    ISet.map = map;
    /**
     * Returns a new array of the natural numbers in the given set.
     */
    function toArray(set) {
        return ISet.map(set, x => x);
    }
    ISet.toArray = toArray;
})(ISet || (ISet = {}));
///<reference path="dfa.ts"/>
///<reference path="display.ts"/>
function demo() {
    const GRID_SIZE = 256;
    const SPEED = 1 << 6;
    const LAKE_SEEDS = 4;
    const LAKE_SIZE = 128 * 128;
    const LAND_SEEDS = 32;
    const alphabet = 'BWREI';
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
    function rule(p, q, limit) {
        return { rewrites: Symmetry.generate(p, q), limit };
    }
    function applyRule(grid, rule) {
        if (rule.limit !== undefined && rule.limit <= 0) {
            return false;
        }
        const ruleKeys = Object.keys(rule.rewrites);
        const counts = ruleKeys.map(p => grid.countMatches(p));
        const totalCount = counts.reduce((a, b) => a + b, 0);
        if (totalCount === 0) {
            return false;
        }
        let r = rng(totalCount);
        for (let i = 0; i < counts.length; ++i) {
            r -= counts[i];
            if (r < 0) {
                const key = ruleKeys[i];
                const pos = grid.getRandomMatch(key);
                grid.setPattern(pos.x, pos.y, rule.rewrites[key]);
                if (rule.limit !== undefined) {
                    --rule.limit;
                }
                return true;
            }
        }
        throw new Error();
    }
    function step(grid, rules, k) {
        let changed = false;
        for (let i = 0; i < k; ++i) {
            changed = rules.some(r => applyRule(grid, r));
            if (!changed) {
                break;
            }
        }
        return changed;
    }
    const patterns = [...new Set(rules.flatMap(r => Object.keys(r.rewrites)))];
    const grid = new PatternMatcher(alphabet, patterns).makeGrid(GRID_SIZE, GRID_SIZE);
    console.log(window.innerHeight);
    const scale = Math.max(1, Math.floor(window.innerHeight / grid.height));
    displayGrid(grid, scale);
    function frameHandler() {
        if (step(grid, rules, SPEED)) {
            requestAnimationFrame(frameHandler);
        }
    }
    requestAnimationFrame(frameHandler);
}
/**
 * Creates an empty array of length `n`, filled with the given value.
 */
function emptyArray(n, value) {
    return makeArray(n, () => value);
}
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
var Symmetry;
(function (Symmetry) {
    /**
     * Rotates a pattern clockwise by 90 degrees.
     */
    Symmetry.rotate = p => {
        const rows = p.split('/');
        const out = [];
        for (let i = 0; i < rows[0].length; ++i) {
            out.push(rows.map(row => row[i]).join(''));
        }
        return out.join('/');
    };
    /**
     * Reflects a pattern from top to bottom.
     */
    Symmetry.reflect = p => {
        return p.split('/').reverse().join('/');
    };
    const GENERATING_SET = [Symmetry.rotate, Symmetry.reflect];
    function generate(patternIn, patternOut, symmetries = GENERATING_SET) {
        // depth-first search
        const entries = [[patternIn, patternOut]];
        const rewrites = {};
        while (entries.length > 0) {
            const [p, q] = entries.pop();
            rewrites[p] = q;
            for (const f of symmetries) {
                const pSym = f(p);
                if (!(pSym in rewrites)) {
                    const qSym = f(q);
                    rewrites[pSym] = qSym;
                    entries.push([pSym, qSym]);
                }
            }
        }
        return rewrites;
    }
    Symmetry.generate = generate;
})(Symmetry || (Symmetry = {}));
