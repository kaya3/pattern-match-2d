///<reference path="pattern.ts"/>

namespace Symmetry {
    type SymmetryFunction = (p: Pattern) => Pattern
    
    const GENERATING_SET: readonly SymmetryFunction[] = [Pattern.rotate, Pattern.reflect];
    
    export function generate(patternIn: Pattern, patternOut: Pattern, symmetries: readonly SymmetryFunction[] = GENERATING_SET): [Pattern, Pattern][] {
        // depth-first search
        const stack: [Pattern, Pattern][] = [[patternIn, patternOut]];
        const entries = new Map<string, [Pattern, Pattern]>();
        entries.set(Pattern.key(patternIn), [patternIn, patternOut]);
        while(stack.length > 0) {
            const [p, q] = stack.pop()!;
            for(const f of symmetries) {
                const pSym = f(p);
                const key = Pattern.key(pSym);
                if(!entries.has(key)) {
                    const pair: [Pattern, Pattern] = [pSym, f(q)];
                    entries.set(key, pair);
                    stack.push(pair);
                }
            }
        }
        return [...entries.values()];
    }
}
