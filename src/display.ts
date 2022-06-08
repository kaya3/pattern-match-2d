// https://lospec.com/palette-list/pico-8
const PICO8_PALETTE: Record<string, string> = {
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
} as const;

function displayGrid(grid: Grid, scale: number = 8) {
    const canvasElem = document.createElement('canvas');
    canvasElem.width = grid.width * scale;
    canvasElem.height = grid.height * scale;
    document.getElementsByTagName('body')[0].appendChild(canvasElem);
    const ctx = canvasElem.getContext('2d')!;
    ctx.fillStyle = PICO8_PALETTE[grid.matcher.alphabet.getByID(0)];
    ctx.fillRect(0, 0, grid.width * scale, grid.height * scale);
    
    grid.listen((minX, minY, maxX, maxY) => {
        for(let y = minY; y < maxY; ++y) {
            for(let x = minX; x < maxX; ++x) {
                ctx.fillStyle = PICO8_PALETTE[grid.get(x, y)] ?? 'black';
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    });
}
