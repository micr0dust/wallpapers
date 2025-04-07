// --- Constants & Global Vars ---
// No boardElement or visContainer needed
// No statusOverlay needed
const backgroundBoardElement = document.getElementById('background-board');
const canvas = document.getElementById('visualization-canvas');
const ctx = canvas.getContext('2d');

// --- Colors & Constants ---
const PLAYER_O = 'O';
const PLAYER_X = 'X';
const O_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--o-color').trim();
const X_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--x-color').trim();
const LINE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--line-color').trim();
const DOT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--dot-color').trim();
const NODE_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--node-bg-color').trim();
const PRUNED_DOT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--pruned-dot-color').trim();

// --- Wallpaper Engine Controlled Variables ---
let STEP_DELAY = 40;
let ACTIVE_NODE_COLOR = 'rgb(152, 195, 121)';
let PATH_NODE_COLOR = 'rgb(97, 175, 239)';

// --- Layout & Canvas Size ---
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
const NODE_SIZE = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--node-size')) || 45;
const MINI_CELL_SIZE = NODE_SIZE / 3;
const DOT_RADIUS = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dot-radius')) || 3;
const LEVEL_HEIGHT = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--level-height')) || 65;
const SIBLING_SPACING = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sibling-spacing')) || 15;
const TARGET_CENTER_X_RATIO = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--target-center-x-ratio')) || 0.5;
let TARGET_CENTER_X = CANVAS_WIDTH * TARGET_CENTER_X_RATIO;
const RESTART_DELAY = 3000;

// --- Global State Variables ---
let currentPlayer;
let board = [];
let isGameOver;
let gameRunning = false;
let currentTreeRoot = null;
let visitedNodes = new Set();
let activePath = [];
let currentPanOffset = 0;

// --- Utility --- (Unchanged)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function weColorToCSS(weColorString) { /* ... identical ... */ if (!weColorString) return 'rgb(255, 255, 255)'; const parts = weColorString.split(' ').map(Number); if (parts.length !== 3) return 'rgb(255, 255, 255)'; const r = Math.round(parts[0] * 255); const g = Math.round(parts[1] * 255); const b = Math.round(parts[2] * 255); return `rgb(${r}, ${g}, ${b})`; }

// --- Wallpaper Engine Property Listener --- (Unchanged)
 window.wallpaperPropertyListener = {
     applyUserProperties: function(properties) {
         console.log("WE properties:", properties);
         let needsRedraw = false;
         if (properties.dfsSpeed) { STEP_DELAY = Math.max(5, properties.dfsSpeed.value); console.log("Updated STEP_DELAY:", STEP_DELAY); }
         if (properties.themeColor) { const newColor = weColorToCSS(properties.themeColor.value); if (newColor !== ACTIVE_NODE_COLOR) { ACTIVE_NODE_COLOR = newColor; console.log("Updated ACTIVE_NODE_COLOR:", ACTIVE_NODE_COLOR); needsRedraw = true; } }
         if (properties.pathColor) { const newColor = weColorToCSS(properties.pathColor.value); if (newColor !== PATH_NODE_COLOR) { PATH_NODE_COLOR = newColor; console.log("Updated PATH_NODE_COLOR:", PATH_NODE_COLOR); needsRedraw = true; } }
         if (needsRedraw && gameRunning && currentTreeRoot && visitedNodes.size > 0) { console.log("Redrawing for color change."); try { drawVisitedTree(ctx, visitedNodes, activePath, currentPanOffset); } catch(e) { console.error("Error during redraw on property change:", e); } }
     }
 };

// --- Canvas Resize Logic ---
function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth; // Use window dimensions
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    TARGET_CENTER_X = CANVAS_WIDTH * TARGET_CENTER_X_RATIO;
    console.log(`Canvas resized to: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
    if (gameRunning && currentTreeRoot && visitedNodes.size > 0) {
        console.log("Redrawing after resize.");
        drawVisitedTree(ctx, visitedNodes, activePath, currentPanOffset);
    }
}
// Listen for window resize instead of observing container
let resizeTimeout;
window.addEventListener('resize', () => {
     clearTimeout(resizeTimeout);
     resizeTimeout = setTimeout(resizeCanvas, 100); // Debounce
});


// --- Game Logic ---
function initializeGame() {
    console.log("Initializing game...");
    board = Array(9).fill('');
    isGameOver = false;
    currentPlayer = PLAYER_O;
    renderBackgroundBoard();
    // statusOverlay.textContent = `${PLAYER_O}'s Turn`; // Removed status overlay
    clearCanvas(ctx);
    currentTreeRoot = null;
    visitedNodes.clear();
    activePath = [];
    currentPanOffset = 0;
    gameRunning = true;
    resizeCanvas(); // Ensure correct size before first turn
    setTimeout(aiTurn, 500);
}
function renderBackgroundBoard() { // Renders background grid and marks
     backgroundBoardElement.innerHTML = '';
     board.forEach((mark, index) => {
         const cell = document.createElement('div');
         cell.classList.add('bg-cell');
         if (mark) {
             cell.textContent = mark;
             cell.classList.add(mark);
         }
         backgroundBoardElement.appendChild(cell);
     });
}
function checkWinner(cb) { /* ... identical ... */ const p = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for (const [a,b,c] of p) { if(cb[a]&&cb[a]===cb[b]&&cb[a]===cb[c]) return cb[a]; } if(cb.every(c=>c!=='')) return 'Draw'; return null; }
function getAvailableMoves(cb) { /* ... identical ... */ return cb.map((c,i)=>c===''?i:null).filter(i=>i!==null); }
function makeMove(index) { // Updates background board
    if (isGameOver || board[index] !== '') return; console.log(`Making move: ${currentPlayer} at index ${index}`); board[index] = currentPlayer; renderBackgroundBoard(); const winner = checkWinner(board); if (winner) { endGame(winner); } else { switchPlayer(); setTimeout(aiTurn, STEP_DELAY * 2); }
}
function switchPlayer() { // No status overlay update needed
    currentPlayer = (currentPlayer === PLAYER_O) ? PLAYER_X : PLAYER_O;
    // statusOverlay.textContent = `${currentPlayer}'s Turn`;
    console.log(`Switched player to: ${currentPlayer}`);
}
function endGame(winner) { // No status overlay update needed
    console.log(`Game Over. Winner: ${winner}`); isGameOver = true; gameRunning = false;
    // statusOverlay.textContent = winner === 'Draw' ? "Draw!" : `${winner} Wins!`;
    // Add a visual cue for game end? Maybe flash background? (Optional)
    setTimeout(initializeGame, RESTART_DELAY);
}

// --- Canvas Drawing Functions --- (Unchanged)
function clearCanvas(context) { context.clearRect(0, 0, context.canvas.width, context.canvas.height); }
function drawLine(context, x1, y1, x2, y2) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.strokeStyle = LINE_COLOR; context.lineWidth = 1; context.stroke(); }
function drawDot(context, x, y, isPruned = false) { context.beginPath(); context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2); context.fillStyle = isPruned ? PRUNED_DOT_COLOR : DOT_COLOR; context.fill(); }
function drawMiniBoard(context, x, y, boardState, borderColor = LINE_COLOR) { const sX = x - NODE_SIZE / 2; const sY = y - NODE_SIZE / 2; context.fillStyle = borderColor; context.fillRect(sX - 1, sY - 1, NODE_SIZE + 2, NODE_SIZE + 2); context.fillStyle = NODE_BG_COLOR; context.fillRect(sX, sY, NODE_SIZE, NODE_SIZE); for (let i = 0; i < 9; i++) { const r = Math.floor(i / 3); const c = i % 3; const cX = sX + c * MINI_CELL_SIZE; const cY = sY + r * MINI_CELL_SIZE; if (c > 0) { context.beginPath(); context.moveTo(cX, cY); context.lineTo(cX, cY + MINI_CELL_SIZE); context.strokeStyle = LINE_COLOR; context.lineWidth = 0.5; context.stroke(); } if (r > 0) { context.beginPath(); context.moveTo(cX, cY); context.lineTo(cX + MINI_CELL_SIZE, cY); context.strokeStyle = LINE_COLOR; context.lineWidth = 0.5; context.stroke(); } const mark = boardState[i]; if (mark) { context.fillStyle = (mark === PLAYER_O) ? O_COLOR : X_COLOR; context.font = `bold ${MINI_CELL_SIZE * 0.7}px sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(mark, cX + MINI_CELL_SIZE / 2, cY + MINI_CELL_SIZE / 2 + 1); } } }
function drawVisitedTree(context, nodesToDraw, currentActivePath, panOffsetX) { clearCanvas(context); context.save(); context.translate(panOffsetX, 0); nodesToDraw.forEach(node => { if (node.parent && nodesToDraw.has(node.parent) && node.x !== undefined && node.parent.x !== undefined) { drawLine(context, node.parent.x, node.parent.y, node.x, node.y); } }); const activeNode = currentActivePath.length > 0 ? currentActivePath[currentActivePath.length - 1] : null; nodesToDraw.forEach(node => { if (node.x === undefined || node.y === undefined) return; const isOnPath = currentActivePath.includes(node); if (isOnPath) { const borderColor = (node === activeNode) ? ACTIVE_NODE_COLOR : PATH_NODE_COLOR; drawMiniBoard(context, node.x, node.y, node.boardState, borderColor); } else { drawDot(context, node.x, node.y, node.isPruned); } }); context.restore(); }

// --- Visualization Tree Node --- (Unchanged)
class VisNode { constructor(bs, p=null, m=null){this.boardState=[...bs];this.parent=p;this.move=m;this.children=[];this.score=null;this.alpha=-Infinity;this.beta=Infinity;this.isPruned=false;this.x=undefined;this.y=undefined;this.width=0;this.depth=p?p.depth+1:0;this.calculatedBounds=null;} }

// --- Layout Algorithm (Hanging Vine / Layered) --- (Unchanged)
function calculateLayoutHanging(node, depth, parentX) { if (!node) return; node.y = (depth * LEVEL_HEIGHT) + (LEVEL_HEIGHT / 2); if (depth === 0) { node.x = parentX; } if (node.children && node.children.length > 0) { const numChildren = node.children.length; const totalSpread = (numChildren - 1) * SIBLING_SPACING; const startOffset = -totalSpread / 2; node.children.forEach((child, index) => { const childX = node.x + startOffset + (index * SIBLING_SPACING); child.x = childX; calculateLayoutHanging(child, depth + 1, child.x); }); } node.calculatedBounds = null; }
function centerTreeHanging(rootNode, canvasWidth, canvasHeight) { if (!rootNode) return; let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; function findBounds(node) { if (!node || node.x === undefined || node.y === undefined) return; const nodeHalfWidth = NODE_SIZE / 2; minX = Math.min(minX, node.x - nodeHalfWidth); maxX = Math.max(maxX, node.x + nodeHalfWidth); minY = Math.min(minY, node.y - nodeHalfWidth); maxY = Math.max(maxY, node.y + nodeHalfWidth); if (node.children) node.children.forEach(findBounds); } findBounds(rootNode); if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY)) { console.warn("Could not determine tree bounds for centering."); return; } const treeWidth = maxX - minX; const treeHeight = maxY - minY; const offsetX = (canvasWidth / 2) - (minX + treeWidth / 2); const offsetY = LEVEL_HEIGHT * 0.5 - minY; function applyOffset(node) { if (!node || node.x === undefined) return; node.x += offsetX; node.y += offsetY; if (node.children) node.children.forEach(applyOffset); } applyOffset(rootNode); }

// --- AI Logic (Minimax - Unchanged) ---
function minimaxBuildTree(cb, d, a, b, maxP, aiP, pN=null, m=null) { const opp = aiP === PLAYER_X ? PLAYER_O : PLAYER_X; const W = checkWinner(cb); const node = new VisNode(cb, pN, m); node.depth = d; let S; if (W === aiP) S=10-d; else if (W === opp) S=-10+d; else if (W === 'Draw') S=0; else if (d > 7) S=0; if (S !== undefined) { node.score = S; return { score: S, node }; } let bestS = maxP ? -Infinity : Infinity; const moves = getAvailableMoves(cb); for (const cM of moves) { const nB = [...cb]; nB[cM] = maxP ? aiP : opp; const result = minimaxBuildTree(nB, d+1, a, b, !maxP, aiP, node, cM); node.children.push(result.node); if (maxP) { bestS = Math.max(bestS, result.score); a = Math.max(a, bestS); node.alpha=a; node.beta=b; } else { bestS = Math.min(bestS, result.score); b = Math.min(b, bestS); node.alpha=a; node.beta=b; } if (b <= a) { node.isPruned = true; result.node.isPruned = true; break; } } node.score = bestS; return { score: bestS, node }; }

// --- Animation Function (Unchanged) ---
async function animateDFSTraversalAndPan(context, node, currentActivePath, visitedNodesSet) {
     if (!node || !gameRunning || node.x === undefined) return;
     visitedNodesSet.add(node); currentActivePath.push(node);
     TARGET_CENTER_X = CANVAS_WIDTH * TARGET_CENTER_X_RATIO; // Use current width
     currentPanOffset = TARGET_CENTER_X - node.x;
     drawVisitedTree(context, visitedNodesSet, currentActivePath, currentPanOffset);
     await sleep(STEP_DELAY);
     if (!node.children || node.children.length === 0 || node.isPruned) { await sleep(STEP_DELAY * 1.5); }
     else { for (const child of node.children) { if (!gameRunning) return; if (node.isPruned) break; await animateDFSTraversalAndPan(context, child, currentActivePath, visitedNodesSet); if (!gameRunning) return; } }
     currentActivePath.pop();
     if (gameRunning) { const parentNode = currentActivePath.length > 0 ? currentActivePath[currentActivePath.length - 1] : null; TARGET_CENTER_X = CANVAS_WIDTH * TARGET_CENTER_X_RATIO; if (parentNode && parentNode.x !== undefined) { currentPanOffset = TARGET_CENTER_X - parentNode.x; } else if (currentTreeRoot && currentTreeRoot.x !== undefined) { currentPanOffset = TARGET_CENTER_X - currentTreeRoot.x; } else { currentPanOffset = 0; } drawVisitedTree(context, visitedNodesSet, currentActivePath, currentPanOffset); await sleep(STEP_DELAY / 2); }
 }

// --- AI Turn Orchestration --- (Uses window dimensions)
 async function aiTurn() {
     if (isGameOver || !gameRunning) return; const aiPlayer = currentPlayer;
     // No title update needed
     // statusOverlay.textContent = `${aiPlayer} is thinking...`; // Optional: Keep status overlay? Let's disable for full screen focus.
     activePath = []; visitedNodes.clear(); currentPanOffset = 0;
     await sleep(50);
     try {
         // 1. Build Tree & Find Move
         const { score: bestScore, node: treeRoot } = minimaxBuildTree(board, 0, -Infinity, Infinity, true, aiPlayer); currentTreeRoot = treeRoot;
         let bestMove = -1; if (currentTreeRoot && currentTreeRoot.children.length > 0) { let cbs = -Infinity; currentTreeRoot.children.forEach(cn => { if (cn.score > cbs) { cbs = cn.score; bestMove = cn.move; } }); if (bestMove === -1) bestMove = currentTreeRoot.children[0].move; if (getAvailableMoves(board).length === 9) { bestMove = [4,0,2,6,8][Math.floor(Math.random() * 5)]; } } else { const av = getAvailableMoves(board); if(av.length > 0) bestMove = av[0]; }
         console.log(`AI ${aiPlayer} calculated best move: ${bestMove} (score: ${bestScore})`);

         // 2. Calculate Layout using current window dimensions
         if (currentTreeRoot) {
             resizeCanvas(); // Ensure CANVAS_WIDTH/HEIGHT are up-to-date
             calculateLayoutHanging(currentTreeRoot, 0, CANVAS_WIDTH / 2);
             centerTreeHanging(currentTreeRoot, CANVAS_WIDTH, CANVAS_HEIGHT);
             TARGET_CENTER_X = CANVAS_WIDTH * TARGET_CENTER_X_RATIO;
             currentPanOffset = TARGET_CENTER_X - (currentTreeRoot.x || CANVAS_WIDTH / 2);
         } else { currentPanOffset = 0; }

         // 3. Animate Traversal
         if (currentTreeRoot) { await animateDFSTraversalAndPan(ctx, currentTreeRoot, activePath, visitedNodes); }

         // 4. Make Move
         if (!isGameOver && gameRunning && bestMove !== -1) { makeMove(bestMove); }
         else if (!isGameOver && gameRunning) { console.warn("AI failed..."); const av = getAvailableMoves(board); if (av.length > 0) makeMove(av[0]); }
     } catch (error) { console.error("Error during AI turn:", error); if (!isGameOver && gameRunning) { const av = getAvailableMoves(board); if (av.length > 0) makeMove(av[Math.floor(Math.random() * av.length)]); }
     } finally { /* No cleanup needed */ }
 }

// --- Start Game ---
resizeCanvas(); // Initial size calculation
initializeGame(); // Start the first game
