namespace AST {
    const enum Kind {
        RULE,
        ONE,
        PRL,
        LIMITED,
        SEQUENCE,
        MARKOV,
    }

    export type Rule = Readonly<{kind: Kind.RULE, in: Pattern, out: Pattern}>
    
    export type One = Readonly<{kind: Kind.ONE, rules: readonly Rule[]}>
    export type Prl = Readonly<{kind: Kind.PRL, rules: readonly Rule[]}>
    export type Limited = Readonly<{kind: Kind.LIMITED, child: Node}>
    export type Sequence = Readonly<{kind: Kind.SEQUENCE, children: readonly Node[]}>
    export type Markov = Readonly<{kind: Kind.LIMITED, children: readonly Node[]}>
    
    export type Node = One | Prl | Limited | Sequence | Markov
}
