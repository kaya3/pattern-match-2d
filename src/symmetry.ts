namespace Symmetry {
    type SymmetryFunction = (p: string) => string
    
    /**
     * Rotates a pattern clockwise by 90 degrees.
     */
    export const rotate: SymmetryFunction = p => {
        const rows = p.split('/');
        return makeArray(
            rows[0].length,
            i => rows.map(row => row[i]).join(''),
        ).join('/');
    };
    
    /**
     * Reflects a pattern from top to bottom.
     */
    export const reflect: SymmetryFunction = p => {
        return p.split('/').reverse().join('/');
    };
    
    const GENERATING_SET = [rotate, reflect];
    
    export function generate(patternIn: string, patternOut: string, symmetries: readonly SymmetryFunction[] = GENERATING_SET): Record<string, string> {
        // depth-first search
        const entries: [string, string][] = [[patternIn, patternOut]];
        const rewrites: Record<string, string> = {};
        while(entries.length > 0) {
            const [p, q] = entries.pop()!;
            rewrites[p] = q;
            for(const f of symmetries) {
                const pSym = f(p);
                if(!(pSym in rewrites)) {
                    const qSym = f(q);
                    rewrites[pSym] = qSym;
                    entries.push([pSym, qSym]);
                }
            }
        }
        return rewrites;
    }
}
