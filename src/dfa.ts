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
    
    export type Node = Readonly<
        | {kind: Kind.LETTERS, letterIDs: readonly number[]}
        | {kind: Kind.WILDCARD}
        | {kind: Kind.CONCAT, children: readonly Node[]}
        | {kind: Kind.UNION, children: readonly Node[]}
        | {kind: Kind.KLEENESTAR, child: Node}
        | {kind: Kind.ACCEPT, accept: number}
    >
    
    export function letters(letterIDs: readonly number[]): Node {
        return {kind: Kind.LETTERS, letterIDs};
    }
    export function wildcard(): Node {
        return {kind: Kind.WILDCARD};
    }
    export function concat(children: Node[]): Node {
        return {kind: Kind.CONCAT, children};
    }
    export function union(children: Node[]): Node {
        return {kind: Kind.UNION, children};
    }
    export function kleeneStar(child: Node): Node {
        return {kind: Kind.KLEENESTAR, child};
    }
    export function accept(accept: number): Node {
        return {kind: Kind.ACCEPT, accept};
    }
    
    export function compile(alphabetSize: number, acceptCount: number, regex: Node): DFA {
        return new NFA(alphabetSize, acceptCount, regex).toDFA().minimise();
    }
}

type NFANode = Readonly<{
    epsilons: number[],
    letters: readonly number[],
    nextID: number,
    acceptSet: number[],
}>

class NFA {
    private readonly nodes: NFANode[] = [];
    private readonly startID: number;
    public constructor(
        private readonly alphabetSize: number,
        private readonly acceptCount: number,
        regex: Regex.Node,
    ) {
        this.startID = this.makeFromRegex(regex, this.makeNode([]));
        //console.log(`NFA with ${this.nodes.length} nodes on alphabet of size ${alphabetSize}`);
    }
    
    private makeNode(epsilons: number[]): number;
    private makeNode(epsilons: number[], letters: readonly number[], nextID: number): number;
    private makeNode(epsilons: number[], letters: readonly number[] = [], nextID: number = -1): number {
        const {nodes} = this;
        const id = nodes.length;
        nodes.push({epsilons, letters, nextID, acceptSet: []});
        return id;
    }
    
    private makeFromRegex(regex: Regex.Node, outID: number): number {
        // https://en.wikipedia.org/wiki/Thompson's_construction
        switch(regex.kind) {
            case Regex.Kind.LETTERS: {
                return this.makeNode([], regex.letterIDs, outID);
            }
            case Regex.Kind.WILDCARD: {
                return this.makeNode([], makeArray(this.alphabetSize, i => i), outID);
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
                node.acceptSet.push(regex.accept);
                return outID;
            }
        }
    }
    
    public toDFA(): DFA {
        // https://en.wikipedia.org/wiki/Powerset_construction
        
        const {alphabetSize, nodes} = this;
        // need to use a primitive key which will be compared by value; bigint is faster than sorting and joining as a string
        const nfaStates: IDMap<ISet> = IDMap.withKey(ISet.toBigInt);
        const dfaNodes: DFANode[] = [];
        
        function getNodeID(nfaState: MutableISet): number {
            // epsilon closure, by depth-first search
            // use ISet instead of Set<number> or bigint for the state, for performance
            const stack = ISet.toArray(nfaState);
            while(stack.length > 0) {
                const nfaNodeID = stack.pop()!;
                for(const eps of nodes[nfaNodeID].epsilons) {
                    if(!ISet.has(nfaState, eps)) {
                        ISet.add(nfaState, eps);
                        stack.push(eps);
                    }
                }
            }
            
            return nfaStates.getOrCreateID(nfaState);
        }
        
        const startID = getNodeID(ISet.of(nodes.length, [this.startID]));
        // sanity check
        if(startID !== 0) { throw new Error(); }
        
        const acceptSetMap: IDMap<readonly number[]> = IDMap.withKey(ISet.arrayToBigInt);
        
        // this loop iterates over `nfaStates`, while adding to it via `getNodeID`
        for(let nfaStateID = 0; nfaStateID < nfaStates.size(); ++nfaStateID) {
            const transitionStates = makeArray(alphabetSize, () => ISet.empty(nodes.length));
            const acceptIDs: number[] = [];
            ISet.forEach(nfaStates.getByID(nfaStateID), nfaNodeID => {
                const nfaNode = nodes[nfaNodeID];
                for(const letterID of nfaNode.letters) {
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

type DFANode = Readonly<{
    transitions: readonly number[],
    acceptSetID: number,
    acceptIDs: readonly number[],
}>

class DFA {
    public constructor(
        private readonly alphabetSize: number,
        public readonly acceptCount: number,
        public readonly acceptSetMap: IDMap<readonly number[]>,
        private readonly nodes: readonly DFANode[],
    ) {
        //console.log(`DFA with ${nodes.length} nodes on alphabet of size ${alphabetSize}, ${acceptCount} accepts and ${acceptSetMap.size()} accept sets`);
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
    private computeAcceptingStates(): Iterable<ISet> {
        const {nodes, acceptCount} = this;
        const n = nodes.length;
        const table: MutableISet[] = makeArray(acceptCount, () => ISet.empty(n));
        for(let id = 0; id < n; ++id) {
            for(const acceptID of nodes[id].acceptIDs) {
                ISet.add(table[acceptID], id);
            }
        }
        return table;
    }
    
    /**
     * Returns an equivalent DFA with the minimum possible number of states.
     */
    public minimise(): DFA {
        // https://en.wikipedia.org/wiki/DFA_minimization#Hopcroft's_algorithm
        
        const {alphabetSize, nodes} = this;
        
        const n = nodes.length;
        const inverseTransitions = makeArray(alphabetSize * n, () => ISet.empty(n));
        for(let id = 0; id < n; ++id) {
            const {transitions} = nodes[id];
            for(let c = 0; c < alphabetSize; ++c) {
                ISet.add(inverseTransitions[c * n + transitions[c]], id);
            }
        }
        
        const partition = new Partition(n);
        for(const d of this.computeAcceptingStates()) { partition.refine(d); }
        
        while(true) {
            const a = partition.pollUnprocessed();
            if(a === undefined) { break; }
            
            for(let c = 0; c < alphabetSize; ++c) {
                const x = ISet.empty(n);
                for(const id of a) {
                    ISet.addAll(x, inverseTransitions[c * n + id]);
                }
                partition.refine(x);
                
                // shortcut if the DFA cannot be minimised
                if(partition.countSubsets() === n) { return this; }
            }
        }
        
        const reps: IDMap<number> = IDMap.withKey(id => partition.getRepresentative(id));
        // ensure id(rep(0)) === 0, so that 0 is still the starting state
        reps.getOrCreateID(0);
        partition.forEachRepresentative(x => reps.getOrCreateID(x));
        
        const repNodes: DFANode[] = reps.map(rep => {
            const {transitions, acceptSetID, acceptIDs} = this.nodes[rep];
            return {
                transitions: transitions.map(nodeID => reps.getID(nodeID)),
                acceptSetID,
                acceptIDs,
            };
        });
        return new DFA(alphabetSize, this.acceptCount, this.acceptSetMap, repNodes);
    }
}
