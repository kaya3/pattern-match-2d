///<reference path="dfa.ts"/>
///<reference path="display.ts"/>

function runDemo(size: number = 2): void {
    const GRID_SIZE = (1 << 7) * size;
    const SPEED = 16 * size * size;
    const LAKE_SEEDS = 4;
    const LAKE_SIZE = (1 << 12) * size * size;
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
    
    type Rule = {
        readonly rewrites: Record<string, string>,
        limit: number | undefined,
    }
    function rule(p: string, q: string, limit?: number): Rule {
        return {rewrites: Symmetry.generate(p, q), limit};
    }
    
    function applyRule(grid: Grid, rule: Rule): boolean {
        if(rule.limit !== undefined && rule.limit <= 0) { return false; }
        
        const ruleKeys = Object.keys(rule.rewrites);
        const counts = ruleKeys.map(p => grid.countMatches(p));
        const totalCount = counts.reduce((a, b) => a + b, 0);
        if(totalCount === 0) { return false; }
        
        let r = rng(totalCount);
        for(let i = 0; i < counts.length; ++i) {
            r -= counts[i];
            if(r < 0) {
                const key = ruleKeys[i];
                const pos = grid.getRandomMatch(key)!;
                grid.setPattern(pos.x, pos.y, rule.rewrites[key]);
                if(rule.limit !== undefined) { --rule.limit; }
                return true;
            }
        }
        throw new Error();
    }
    function step(grid: Grid, rules: readonly Rule[], k: number): boolean {
        let changed = false;
        for(let i = 0; i < k; ++i) {
            changed = rules.some(r => applyRule(grid, r));
            if(!changed) { break; }
        }
        return changed;
    }
    
    const patterns = [...new Set(rules.flatMap(r => Object.keys(r.rewrites)))];
    const grid = new PatternMatcher(alphabet, patterns).makeGrid(GRID_SIZE, GRID_SIZE);
    
    const scale = Math.max(1, Math.floor(window.innerHeight / grid.height));
    displayGrid(grid, scale);
    
    function frameHandler(): void {
        if(step(grid, rules, SPEED)) {
            requestAnimationFrame(frameHandler);
        }
    }
    requestAnimationFrame(frameHandler);
}
