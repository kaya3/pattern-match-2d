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
    readonly letters: ISet,
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
    }
    
    private makeNode(epsilons: number[]): number;
    private makeNode(epsilons: number[], letters: ISet, nextID: number): number;
    private makeNode(epsilons: number[], letters: ISet = ISet.EMPTY, nextID: number = -1): number {
        const {nodes} = this;
        const id = nodes.length;
        nodes.push({epsilons, letters, nextID, acceptSet: ISet.EMPTY});
        return id;
    }
    
    private makeFromRegex(regex: Regex.Node<S, T>, outID: number): number {
        // https://en.wikipedia.org/wiki/Thompson's_construction
        switch(regex.kind) {
            case Regex.Kind.LETTERS: {
                const lettersSet = this.alphabet.toIDSet(regex.letters);
                return this.makeNode([], lettersSet, outID);
            }
            case Regex.Kind.WILDCARD: {
                return this.makeNode([], ISet.full(this.alphabet.size()), outID);
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
        const nfaStates = new IDMap<ISet>();
        const dfaNodes: DFANode[] = [];
        const {acceptMap} = this;
        
        function getNodeID(nfaState: ISet): number {
            // epsilon closure
            let arr = ISet.toArray(nfaState);
            // this loop iterates over `arr`, while pushing to it
            for(let i = 0; i < arr.length; ++i) {
                const nfaNodeID = arr[i];
                for(const eps of nfaNodes[nfaNodeID].epsilons) {
                    if(!ISet.has(nfaState, eps)) {
                        nfaState |= ISet.singleton(eps);
                        arr.push(eps);
                    }
                }
            }
            
            return nfaStates.getOrCreateID(nfaState);
        }
        
        const startID = getNodeID(ISet.singleton(this.startID));
        // sanity check
        if(startID !== 0) { throw new Error(); }
        
        const acceptSetMap = new IDMap<ISet>();
        
        // this loop iterates over `nfaStates`, while pushing to it via `getNodeID`
        for(let nfaStateID = 0; nfaStateID < nfaStates.size(); ++nfaStateID) {
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
    ) {}
    
    public go(stateID: number, letterID: number): number {
        const {nodes} = this;
        if(stateID >= 0 && stateID < nodes.length) {
            const t = this.nodes[stateID].transitions;
            return letterID >= 0 && letterID < t.length ? t[letterID] : -1;
        } else {
            return -1;
        }
    }
    
    public getAcceptIDs(stateID: number): readonly number[] {
        return this.nodes[stateID].acceptIDs;
    }
    public getAcceptSetID(stateID: number): number {
        return this.nodes[stateID].acceptSetID;
    }
    
    /**
     * Returns an array mapping each acceptID to the set of node IDs which accept it.
     */
    private computeAcceptingStates(): readonly ISet[] {
        const {nodes, acceptMap} = this;
        const table = emptyArray(acceptMap.size(), ISet.EMPTY);
        for(let id = 0; id < nodes.length; ++id) {
            for(const acceptID of this.getAcceptIDs(id)) {
                table[acceptID] |= ISet.singleton(id);
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
                partition.refine(x);
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