///<reference path="dfa.ts"/>
///<reference path="display.ts"/>

function runDemo(size: number = 2): void {
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
    
    type RuleSpec = {
        patternIn: string,
        patternOut: string,
        limit: number | undefined,
    }
    function rule(patternIn: string, patternOut: string, limit?: number): RuleSpec {
        return {patternIn, patternOut, limit};
    }
    
    type Rule = {
        readonly rewrites: readonly [number, number][],
        limit: number | undefined,
    }
    const patternsIn = IDMap.withKey(Pattern.key);
    const patternsOut = IDMap.withKey(Pattern.key);
    const compiledRules = rules.map(spec => {
        const rewrites: [number, number][] = Symmetry.generate(
            Pattern.of(alphabet, spec.patternIn),
            Pattern.of(alphabet, spec.patternOut),
        ).map(([p, q]) => [
            patternsIn.getOrCreateID(p),
            patternsOut.getOrCreateID(q),
        ]);
        return {rewrites, limit: spec.limit};
    });
    
    function applyRule(state: MatcherState, rule: Rule): boolean {
        if(rule.limit !== undefined && rule.limit <= 0) { return false; }
        
        const {rewrites} = rule;
        const counts = rewrites.map(pair => state.countMatches(pair[0]));
        const totalCount = counts.reduce((a, b) => a + b, 0);
        
        if(totalCount === 0) { return false; }
        
        let r = rng(totalCount);
        for(let i = 0; i < counts.length; ++i) {
            r -= counts[i];
            if(r < 0) {
                const [pID, qID] = rewrites[i];
                const pos = state.getRandomMatch(pID)!;
                state.grid.setPattern(pos.x, pos.y, patternsOut.getByID(qID));
                if(rule.limit !== undefined) { --rule.limit; }
                return true;
            }
        }
        throw new Error();
    }
    function step(state: MatcherState, rules: readonly Rule[], k: number): boolean {
        let changed = false;
        for(let i = 0; i < k; ++i) {
            changed = rules.some(r => applyRule(state, r));
            if(!changed) { break; }
        }
        return changed;
    }
    
    const state = new PatternMatcher(alphabet, patternsIn).makeState(GRID_SIZE, GRID_SIZE);
    
    const scale = Math.max(1, Math.floor(window.innerHeight / state.grid.height));
    displayGrid(state.grid, scale);
    
    function frameHandler(): void {
        if(step(state, compiledRules, SPEED)) {
            requestAnimationFrame(frameHandler);
        }
    }
    requestAnimationFrame(frameHandler);
}
