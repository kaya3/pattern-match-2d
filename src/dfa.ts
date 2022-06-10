///<reference path="partition.ts"/>

namespace Regex {
    export const enum Kind {
        LETTERS,
        WILDCARD,
        CONCAT,
        UNION,
        KLEENESTAR,
        ACCEPT,
    }
    
    export type Node<S, T> = Readonly<
        | {kind: Kind.LETTERS, letters: readonly S[]}
        | {kind: Kind.WILDCARD}
        | {kind: Kind.CONCAT, children: readonly Node<S, T>[]}
        | {kind: Kind.UNION, children: readonly Node<S, T>[]}
        | {kind: Kind.KLEENESTAR, child: Node<S, T>}
        | {kind: Kind.ACCEPT, accept: T}
    >
    
    export function letters<S, T>(letters: S[]): Node<S, T> {
        return {kind: Kind.LETTERS, letters};
    }
    export function wildcard<S, T>(): Node<S, T> {
        return {kind: Kind.WILDCARD};
    }
    export function concat<S, T>(children: Node<S, T>[]): Node<S, T> {
        return {kind: Kind.CONCAT, children};
    }
    export function union<S, T>(children: Node<S, T>[]): Node<S, T> {
        return {kind: Kind.UNION, children};
    }
    export function kleeneStar<S, T>(child: Node<S, T>): Node<S, T> {
        return {kind: Kind.KLEENESTAR, child};
    }
    export function accept<S, T>(accept: T): Node<S, T> {
        return {kind: Kind.ACCEPT, accept};
    }
    
    export function compile<S, T>(alphabet: IDMap<S>, regex: Node<S, T>): DFA<T> {
        return new NFA(alphabet, regex).toDFA().minimise();
    }
}

type NFANode = {
    readonly epsilons: number[],
    readonly letters: readonly number[],
    readonly nextID: number,
    acceptSet: ISet,
}

class NFA<S, T> {
    readonly nodes: NFANode[] = [];
    readonly acceptMap = new IDMap<T>();
    readonly startID: number;
    public constructor(
        readonly alphabet: IDMap<S>,
        regex: Regex.Node<S, T>,
    ) {
        this.startID = this.makeFromRegex(regex, this.makeNode([]));
        //console.log(`NFA with ${this.nodes.length} nodes on alphabet of size ${alphabet.size()}`);
    }
    
    private makeNode(epsilons: number[]): number;
    private makeNode(epsilons: number[], letters: readonly number[], nextID: number): number;
    private makeNode(epsilons: number[], letters: readonly number[] = [], nextID: number = -1): number {
        const {nodes} = this;
        const id = nodes.length;
        nodes.push({epsilons, letters, nextID, acceptSet: ISet.EMPTY});
        return id;
    }
    
    private makeFromRegex(regex: Regex.Node<S, T>, outID: number): number {
        // https://en.wikipedia.org/wiki/Thompson's_construction
        switch(regex.kind) {
            case Regex.Kind.LETTERS: {
                const lettersSet = this.alphabet.toIDs(regex.letters);
                return this.makeNode([], lettersSet, outID);
            }
            case Regex.Kind.WILDCARD: {
                return this.makeNode([], makeArray(this.alphabet.size(), i => i), outID);
            }
            case Regex.Kind.CONCAT: {
                const {children} = regex;
                for(let i = children.length - 1; i >= 0; --i) {
                    outID = this.makeFromRegex(children[i], outID);
                }
                return outID;
            }
            case Regex.Kind.UNION: {
                const epsilons = regex.children.map(child => this.makeFromRegex(child, this.makeNode([outID])));
                return this.makeNode(epsilons);
            }
            case Regex.Kind.KLEENESTAR: {
                const childOutID = this.makeNode([outID]);
                const childInID = this.makeFromRegex(regex.child, childOutID);
                this.nodes[childOutID].epsilons.push(childInID);
                return this.makeNode([childInID, outID]);
            }
            case Regex.Kind.ACCEPT: {
                const node = this.nodes[outID];
                node.acceptSet |= ISet.singleton(this.acceptMap.getOrCreateID(regex.accept));
                return outID;
            }
        }
    }
    
    public toDFA(): DFA<T> {
        // https://en.wikipedia.org/wiki/Powerset_construction
        
        const alphabetSize = this.alphabet.size();
        const nfaNodes = this.nodes;
        const nfaStates: ReadonlySet<number>[] = [];
        const nfaStateMap = new Map<ISet, number>();
        const dfaNodes: DFANode[] = [];
        const {acceptMap} = this;
        
        function getNodeID(nfaState: Set<number>): number {
            // epsilon closure, by depth-first search
            // use Set<number> instead of ISet for the state, for performance
            const stack = [...nfaState];
            while(stack.length > 0) {
                const nfaNodeID = stack.pop()!;
                for(const eps of nfaNodes[nfaNodeID].epsilons) {
                    if(!nfaState.has(eps)) {
                        nfaState.add(eps);
                        stack.push(eps);
                    }
                }
            }
            
            // need to use a primitive key which will be compared by value
            // surprisingly, this is the most expensive part; ISet is faster than sorting and joining as a string
            const key = ISet.of(nfaNodes.length, nfaState);
            
            let index = nfaStateMap.get(key);
            if(index === undefined) {
                index = nfaStates.length;
                nfaStates.push(nfaState);
                nfaStateMap.set(key, index);
            }
            return index;
        }
        
        const startID = getNodeID(new Set([this.startID]));
        // sanity check
        if(startID !== 0) { throw new Error(); }
        
        const acceptSetMap = new IDMap<ISet>();
        
        // this loop iterates over `nfaStates`, while pushing to it via `getNodeID`
        for(let nfaStateID = 0; nfaStateID < nfaStates.length; ++nfaStateID) {
            const transitionStates: Set<number>[] = makeArray(alphabetSize, () => new Set());
            let acceptSet = ISet.EMPTY;
            for(const nfaNodeID of nfaStates[nfaStateID]) {
                const nfaNode = nfaNodes[nfaNodeID];
                for(const letterID of nfaNode.letters) {
                    transitionStates[letterID].add(nfaNode.nextID);
                }
                acceptSet |= nfaNode.acceptSet;
            }
            
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

type DFANode = Readonly<{
    transitions: readonly number[],
    acceptSetID: number,
    acceptIDs: readonly number[],
}>

class DFA<T> {
    public constructor(
        private readonly alphabetSize: number,
        public readonly acceptMap: IDMap<T>,
        public readonly acceptSetMap: IDMap<ISet>,
        private readonly nodes: readonly DFANode[],
    ) {
        //console.log(`DFA with ${nodes.length} nodes on alphabet of size ${alphabetSize}, ${acceptMap.size()} accepts and ${acceptSetMap.size()} accept sets`);
    }
    
    /**
     * Returns the number of distinct states of this DFA.
     */
    public size(): number {
        return this.nodes.length;
    }
    
    public go(state: number, letterID: number): number {
        const {nodes, alphabetSize} = this;
        if(state >= 0 && state < nodes.length && letterID >= 0 && letterID < alphabetSize) {
            return nodes[state].transitions[letterID];
        } else {
            throw new Error();
        }
    }
    
    public getAcceptIDs(state: number): readonly number[] {
        return this.nodes[state].acceptIDs;
    }
    
    public getAcceptSetID(state: number): number {
        return this.nodes[state].acceptSetID;
    }
    
    /**
     * Returns an array mapping each acceptID to the set of node IDs which accept it.
     */
    private computeAcceptingStates(): Iterable<readonly number[]> {
        const {nodes, acceptMap} = this;
        const table: number[][] = makeArray(acceptMap.size(), () => []);
        for(let id = 0; id < nodes.length; ++id) {
            for(const acceptID of nodes[id].acceptIDs) {
                table[acceptID].push(id);
            }
        }
        return table;
    }
    
    /**
     * Returns an equivalent DFA with the minimum possible number of states.
     */
    public minimise(): DFA<T> {
        // https://en.wikipedia.org/wiki/DFA_minimization#Hopcroft's_algorithm
        
        const {alphabetSize, nodes} = this;
        
        const inverseTransitions = emptyArray(alphabetSize * nodes.length, ISet.EMPTY);
        for(let id = 0; id < nodes.length; ++id) {
            const {transitions} = nodes[id];
            const idSingleton = ISet.singleton(id);
            for(let c = 0; c < alphabetSize; ++c) {
                inverseTransitions[c + transitions[c] * alphabetSize] |= idSingleton;
            }
        }
        
        const partition = new Partition(nodes.length);
        for(const d of this.computeAcceptingStates()) { partition.refine(d); }
        
        while(true) {
            const a = partition.pollUnprocessed();
            if(a === undefined) { break; }
            
            for(let c = 0; c < alphabetSize; ++c) {
                let x = ISet.EMPTY;
                for(const id of a) { x |= inverseTransitions[c + id * alphabetSize]; }
                partition.refine(ISet.toArray(x));
                
                // shortcut if the DFA cannot be minimised
                if(partition.countSubsets() === nodes.length) { return this; }
            }
        }
        
        const reps = new IDMap<number>();
        // ensure id(rep(0)) === 0, so that 0 is still the starting state
        reps.getOrCreateID(partition.getRepresentative(0));
        partition.forEachRepresentative(x => reps.getOrCreateID(x));
        
        const repNodes: DFANode[] = reps.map(rep => {
            const {transitions, acceptSetID, acceptIDs} = this.nodes[rep];
            return {
                transitions: transitions.map(id => reps.getID(partition.getRepresentative(id))),
                acceptSetID,
                acceptIDs,
            };
        });
        return new DFA(alphabetSize, this.acceptMap, this.acceptSetMap, repNodes);
    }
}
