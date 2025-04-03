const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score'); // 可能需要為兩個玩家單獨顯示

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20; // 可能需要縮小方塊尺寸以容納兩個棋盤
let calculatedBlockSize = BLOCK_SIZE;
const BOARD_WIDTH_BLOCKS = COLS;
const BOARD_HEIGHT_BLOCKS = ROWS;

// --- 方塊顏色和形狀 (加入垃圾行顏色) ---
const COLORS = [
    null,       // 0: empty
    '#FF0D72',  // 1: I
    '#0DC2FF',  // 2: L
    '#0DFF72',  // 3: J
    '#F538FF',  // 4: O
    '#FF8E0D',  // 5: S
    '#FFE138',  // 6: T
    '#3877FF',  // 7: Z
    '#808080'   // 8: Garbage
];
const SHAPES = [
    [], // Empty
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // L
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // J
    [[4, 4], [4, 4]],                                           // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
];
const GARBAGE_BLOCK_ID = 8;

// --- 遊戲狀態變數 (變為數組或對象管理兩個玩家) ---
let players = [];
let gameLoopTimeout;
let animationStepInterval = 75; // AI 每一步操作的速度 (毫秒) - 可以稍微調快
let isGameRunning = false;
let winner = null; // 記錄獲勝者

const LINE_CLEAR_FLASH_DURATION = 200; // 消行閃爍持續時間 (毫秒)

// 全局變數來存儲從 WE 獲取的屬性值
let currentSchemeColor = 'rgb(26, 26, 46)'; // 預設背景色
let currentFlashColor = 'rgb(255, 255, 255)'; // 預設閃爍色
let currentSpacingBlocks = 4; // 從常量獲取預設值
let currentRestartDelaySeconds = 7; // 預設重啟延遲

// --- 輔助函數 (部分需要修改以接受玩家對象) ---

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function getRandomPiece(player) { // 傳入 player 以便後續可能處理特殊規則
    const typeId = Math.floor(Math.random() * (SHAPES.length - 2)) + 1; // Exclude garbage type
    const shape = SHAPES[typeId];
    player.currentRotation = 0;
    let piece = {
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        shape: shape.map(row => [...row]),
        color: COLORS[typeId],
        typeId: typeId
    };
    // 確保生成時不碰撞 (考慮 player.board)
     while (!isValidMove(piece, player.board) && piece.y < 4) {
         if (piece.typeId === 1 && piece.y === 0) piece.y = -1;
         else piece.y++;
     }
    return piece;
}

function rotate(shapeToRotate) { /* ... 省略，保持健壯版本 ... */
    if (!shapeToRotate || !Array.isArray(shapeToRotate)) return null;
    const originalShape = shapeToRotate.map(row => {
        if (!Array.isArray(row)) return [];
        return [...row];
     });
    if (originalShape.length === 0) return [];
    const N = originalShape.length;
    if (N === 0 || !originalShape[0]) return shapeToRotate;
    const rotatedShape = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
        if (!originalShape[i]) continue;
        for (let j = 0; j < N; j++) {
             if (originalShape[i][j] !== undefined) {
                rotatedShape[j][N - 1 - i] = originalShape[i][j];
             }
        }
    }
    return rotatedShape;
}

function isValidMove(piece, board) { /* ... 省略，保持健壯版本 ... */
    if (!piece || !piece.shape || !board) return false;
    for (let y = 0; y < piece.shape.length; y++) {
        if (!piece.shape[y]) continue;
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] > 0) {
                const boardX = piece.x + x;
                const boardY = piece.y + y;
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return false;
                if (boardY >= 0 && board[boardY] && board[boardY][boardX] > 0) return false;
            }
        }
    }
    return true;
}

function freezePiece(player) { /* ... 省略，使用 player.currentPiece 和 player.board ... */
    const piece = player.currentPiece;
    const board = player.board;
     if (!piece || !piece.shape || !board) return;
    piece.shape.forEach((row, y) => {
        if (!row) return;
        row.forEach((value, x) => {
            if (value > 0) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                   if(board[boardY]) {
                       board[boardY][boardX] = piece.typeId;
                   }
                }
            }
        });
    });
}

function checkGameOver(player) {
    // 檢查新生成的方塊是否有效，或者頂部是否已經有方塊 (非新生成方塊本身)
    if (!isValidMove(player.currentPiece, player.board)) {
         return true;
    }
     // 檢查頂部是否有固定的方塊 (防止方塊生成在已有方塊上方)
    for(let x=0; x<COLS; ++x){
        if(player.board[0] && player.board[0][x] !== 0){
            // 確保這個方塊不是正在生成的方塊的一部分
            let isPartOfCurrentPiece = false;
            if(player.currentPiece && player.currentPiece.shape){
                for(let py=0; py<player.currentPiece.shape.length; ++py){
                    if(!player.currentPiece.shape[py]) continue;
                    for(let px=0; px<player.currentPiece.shape[py].length; ++px){
                        if(player.currentPiece.shape[py][px] > 0){
                            if(player.currentPiece.y + py === 0 && player.currentPiece.x + px === x){
                                isPartOfCurrentPiece = true;
                                break;
                            }
                        }
                    }
                    if(isPartOfCurrentPiece) break;
                }
            }
            if(!isPartOfCurrentPiece) return true; // 頂部有舊方塊
        }
    }
    return false;
}

// --- 垃圾行機制 ---
function calculateGarbageToSend(linesCleared) {
    // 簡單規則：單行不送，雙行送1，三行送2，四行送4
    if (linesCleared === 1) return 0;
    if (linesCleared === 2) return 1;
    if (linesCleared === 3) return 2;
    if (linesCleared >= 4) return 4;
    return 0;
}

function addGarbageToQueue(targetPlayer, numLines) {
    if (numLines > 0 && targetPlayer && !targetPlayer.gameOver) {
        targetPlayer.garbageQueue += numLines;
    }
}

function addGarbageLinesToBoard(player) {
    if (!player || player.garbageQueue <= 0 || !player.board) return;

    const numLines = player.garbageQueue;
    player.garbageQueue = 0; // 清空隊列


    // 創建垃圾行
    const holeX = Math.floor(Math.random() * COLS); // 隨機生成洞的位置
    const garbageLine = Array(COLS).fill(GARBAGE_BLOCK_ID);
    garbageLine[holeX] = 0; // 製造洞

    // 將現有棋盤向上推
    for (let i = 0; i < numLines; i++) {
        if (player.board.length >= ROWS) {
           player.board.shift(); // 移除頂部一行
        }
        player.board.push([...garbageLine]); // 在底部加入垃圾行
    }
}


// --- 消行與動畫 (返回消除的行數) ---
function clearLinesAndAnimate(player) {
    const board = player.board;
    player.linesToClear = []; // 使用 player 內部的變量
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y] && board[y].every(cell => cell > 0)) {
            player.linesToClear.push(y);
        }
    }

    const linesClearedCount = player.linesToClear.length;

    if (linesClearedCount > 0) {
        player.isAnimatingLineClear = true;
        player.aiState = 'ANIMATING_CLEAR';

        player.score += [0, 100, 300, 500, 800][linesClearedCount] || 0;

        clearTimeout(player.lineClearAnimationTimer);
        player.lineClearAnimationTimer = setTimeout(() => {
            for (const y of player.linesToClear.sort((a, b) => a - b)) {
                 if (player.board.length > y) {
                    player.board.splice(y, 1);
                    player.board.unshift(Array(COLS).fill(0));
                 }
            }
            player.isAnimatingLineClear = false;
            player.linesToClear = [];
            player.aiState = 'ADDING_GARBAGE'; // 下一步檢查是否要加垃圾行
             // 不需要設置 timeout，gameLoop 會處理 ADDING_GARBAGE 狀態

        }, LINE_CLEAR_FLASH_DURATION);

        return linesClearedCount; // 返回消除的行數
    }
    return 0; // 沒有行被清除
}

// --- 繪圖 (處理多個玩家和偏移) ---
function drawBlock(x, y, color, ctx = context, blockSize = calculatedBlockSize, offsetX = 0, offsetY = 0) {
    if (color) {
        ctx.fillStyle = color;
        const drawX = (x + offsetX) * blockSize;
        const drawY = (y + offsetY) * blockSize;
        ctx.fillRect(drawX, drawY, blockSize, blockSize);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeRect(drawX, drawY, blockSize, blockSize);
    }
}

function drawBoard(player, ctx = context, blockSize = calculatedBlockSize) {
    const board = player.board;
    const offsetX = player.xOffset;
    board.forEach((row, y) => {
        const isClearing = player.isAnimatingLineClear && player.linesToClear.includes(y);
        if (!row) return;
        row.forEach((value, x) => {
            const color = isClearing ? currentFlashColor : COLORS[value];
            drawBlock(x, y, color, ctx, blockSize, offsetX);
        });
    });
     // 繪製棋盤邊框
     ctx.strokeStyle = '#AAAAAA';
     ctx.lineWidth = 2;
     ctx.strokeRect(offsetX * blockSize, 0, COLS * blockSize, ROWS * blockSize);
}

function drawPiece(player, ctx = context, blockSize = calculatedBlockSize) {
    const piece = player.currentPiece;
    const offsetX = player.xOffset;
    if (!piece || !piece.shape) return;

    ctx.fillStyle = piece.color || '#FFFFFF';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';

    piece.shape.forEach((row, y) => {
        if (!row) return;
        row.forEach((value, x) => {
            if (value > 0) {
                const drawBoardX = piece.x + x;
                const drawBoardY = piece.y + y;
                // 只繪製在棋盤內的部分
                if (drawBoardY >= 0 && drawBoardX >= 0 && drawBoardX < COLS) {
                     drawBlock(drawBoardX, drawBoardY, piece.color, ctx, blockSize, offsetX);
                }
            }
        });
    });
}


function drawUI(players, ctx = context, blockSize = calculatedBlockSize) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${blockSize * 0.9}px Arial`; // 可以稍微縮小字體
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // 設置基線為頂部，更容易控制垂直位置

     players.forEach(player => {
        const offsetX = player.xOffset * blockSize;
        const textX = offsetX;
        // *** 調整垂直位置和間距 ***
        const firstLineY = ROWS * blockSize + blockSize * 0.5; // 稍微往下移一點開始
        const lineHeight = blockSize * 1.1; // 調整行高

        ctx.fillText(`Player ${player.id + 1}`, textX, firstLineY);
        ctx.fillText(`Score: ${player.score}`, textX, firstLineY + lineHeight); // 第二行
     });

    // 顯示獲勝者信息
    if (winner !== null) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - blockSize * 1.5, canvas.width, blockSize * 3);
        ctx.fillStyle = '#00FF00';
        ctx.font = `${blockSize * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`Player ${winner + 1} wins!`, canvas.width / 2, canvas.height / 2 + blockSize / 2);
        ctx.textAlign = 'left'; // Reset alignment
    }
}


function drawGame() {
    // 清除整個 Canvas
    context.fillStyle = currentSchemeColor // 背景色
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製每個玩家的棋盤和方塊
    players.forEach(player => {
        if(player) { // 確保玩家對象存在
            drawBoard(player);
            if (player.currentPiece && !player.isAnimatingLineClear && !player.gameOver) {
                drawPiece(player);
            }
        }
    });

    // 繪製 UI (分數等)
    drawUI(players);
}


// --- AI 邏輯 (evaluateBoard, findBestMove 基本不變，但需傳入 player.board) ---
function evaluateBoard(board) { /* ... 省略，使用上次調整好的權重 ... */
    let score = 0;
    let holes = 0;
    let aggregateHeight = 0;
    let bumpiness = 0;
    let completedLines = 0;
    const heights = Array(COLS).fill(0);
    let maxHeight = 0;

    for (let x = 0; x < COLS; x++) {
        let colHeight = 0;
        let blocked = false;
        for (let y = 0; y < ROWS; y++) {
             if (!board[y]) continue; // 安全檢查
            if (board[y][x] > 0 && board[y][x] !== GARBAGE_BLOCK_ID) { // 忽略垃圾塊計算高度? 或計入？ 先計入
                if (!blocked) {
                    colHeight = ROWS - y;
                    heights[x] = colHeight;
                    blocked = true;
                }
            } else if (blocked && board[y][x] === 0) { // 只有空格才算洞
                holes++;
            }
        }
        aggregateHeight += colHeight;
        if (colHeight > maxHeight) maxHeight = colHeight;
    }

    for (let x = 0; x < COLS - 1; x++) {
        bumpiness += Math.abs(heights[x] - heights[x + 1]);
    }

    let linesClearedThisTurn = 0;
    for (let y = 0; y < ROWS; y++) {
        // 檢查是否滿行 (非垃圾行)
        if (board[y] && board[y].every(cell => cell > 0 && cell !== GARBAGE_BLOCK_ID)) {
             linesClearedThisTurn++;
        }
    }

    // 可以考慮增加對垃圾行的處理，例如懲罰靠近垃圾行的洞穴
    // 或者獎勵能夠快速清除垃圾行的放置

    const weightHeight = -0.4;
    const weightLines = 1.8;
    const weightHoles = -0.7;
    const weightBumpiness = -0.15;
    const weightMaxHeight = -0.1;
    const weightGarbageProximityPenalty = -0.2; // 新增：懲罰靠近頂部垃圾行的放置 (可選)

    let lineScoreBonus = 0;
    if (linesClearedThisTurn === 1) lineScoreBonus = weightLines * 1;
    else if (linesClearedThisTurn === 2) lineScoreBonus = weightLines * 3;
    else if (linesClearedThisTurn === 3) lineScoreBonus = weightLines * 6;
    else if (linesClearedThisTurn >= 4) lineScoreBonus = weightLines * 10;

    score = weightHeight * aggregateHeight +
            lineScoreBonus * COLS +
            weightHoles * holes +
            weightBumpiness * bumpiness +
            weightMaxHeight * maxHeight;

    // 可選: 計算垃圾鄰近懲罰
    let garbagePenalty = 0;
    for(let y=0; y < 5; ++y){ // 檢查頂部幾行
        if(!board[y]) continue;
        for(let x=0; x<COLS; ++x){
            if(board[y][x] === GARBAGE_BLOCK_ID){
                garbagePenalty += (ROWS - y); // 越高的垃圾懲罰越大
            }
        }
    }
    score += weightGarbageProximityPenalty * garbagePenalty;


    return score;
}

function findBestMove(player) { /* ... 省略，使用 player.currentPiece 和 player.board ... */
    let bestScore = -Infinity;
    let bestMove = null;
    const piece = player.currentPiece;
    const board = player.board;

    if (!piece || !piece.shape || !board) return null;

    const originalPiece = {
        ...piece,
        shape: piece.shape.map(row => [...row])
    };

    for (let r = 0; r < 4; r++) {
         let currentShape = originalPiece.shape;
         for(let i = 0; i < r; i++) {
             currentShape = rotate(currentShape);
             if (!currentShape) break;
         }
         if (!currentShape) continue;

         const rotatedPieceForEval = { ...originalPiece, shape: currentShape };
         const shapeWidth = currentShape[0] ? currentShape[0].length : 0;
         let shapeHeight = 0;
         for(let row of currentShape) if (row && row.some(cell => cell > 0)) shapeHeight++;

         const minX = -shapeWidth; // 擴大範圍
         const maxX = COLS + shapeWidth; // 擴大範圍

        for (let x = minX; x < maxX; x++) {
            let testPiece = { ...rotatedPieceForEval, x: x, y: -shapeHeight }; // 從更上方開始

            // 尋找有效的起始 Y
            let initialY = testPiece.y;
             while(initialY < ROWS && !isValidMove({...testPiece, y: initialY}, board)) {
                initialY++;
            }
            if(initialY >= ROWS) continue; // 無法找到有效的起始Y

            testPiece.y = initialY;
            if(!isValidMove(testPiece, board)) continue;


            // 模擬下落
            let dropSimPiece = {...testPiece};
            while (isValidMove({ ...dropSimPiece, y: dropSimPiece.y + 1 }, board)) {
                dropSimPiece.y++;
            }
            const finalY = dropSimPiece.y;

            // 創建臨時棋盤並評估
            const tempBoard = board.map(row => [...row]);
            const landedPiece = { ...testPiece, y: finalY, shape: currentShape };
            // 模擬凍結 (用局部函數，避免污染 player)
            landedPiece.shape.forEach((row, py) => {
                if(!row) return;
                row.forEach((val, px) => {
                    if(val > 0){
                        const by = landedPiece.y + py;
                        const bx = landedPiece.x + px;
                        if(by>=0 && by<ROWS && bx>=0 && bx<COLS && tempBoard[by]) tempBoard[by][bx] = landedPiece.typeId;
                    }
                });
            });

            const currentScore = evaluateBoard(tempBoard); // 傳遞臨時棋盤

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMove = {
                    rotationCount: r,
                    x: landedPiece.x,
                    shape: currentShape // 傳遞最終形狀用於旋轉
                };
            }
        }
    }
    return bestMove;
}

// --- 玩家初始化與重置 ---
function createPlayer(id, xOffset) {
    return {
        id: id,
        board: createBoard(),
        score: 0,
        currentPiece: null,
        nextPiece: null,
        aiState: 'SPAWNING',
        bestMove: null,
        currentRotation: 0,
        garbageQueue: 0,
        gameOver: false,
        xOffset: xOffset, // 用於繪圖
        isAnimatingLineClear: false,
        linesToClear: [],
        lineClearAnimationTimer: null
    };
}

function resetGame() {
    clearTimeout(gameLoopTimeout);
    players = [
        createPlayer(0, 0), // 玩家1在左側 (偏移0)
        createPlayer(1, COLS + currentSpacingBlocks) // 玩家2在右側 (偏移 COLS + 間隔)
    ];
    players.forEach(p => {
         p.nextPiece = getRandomPiece(p); // 初始化 nextPiece
    });
    winner = null;
    isGameRunning = false; // 重置運行狀態
}

function startGame() {
    if (isGameRunning) {
         clearTimeout(gameLoopTimeout);
         players.forEach(p => clearTimeout(p.lineClearAnimationTimer));
    }
    resetGame();
    resizeCanvas(); // 計算畫布和方塊大小
    isGameRunning = true;
    gameLoop();
}

// --- 生成新方塊與計算 (針對特定玩家) ---
function spawnNewPieceAndCalculateAI(player) {
    player.currentPiece = player.nextPiece;
    if (!player.currentPiece) {
         player.nextPiece = getRandomPiece(player);
         player.currentPiece = player.nextPiece;
         if (!player.currentPiece) { player.gameOver = true; player.aiState = 'GAME_OVER'; return; }
    }
    player.nextPiece = getRandomPiece(player);
    player.currentRotation = 0;

    if (checkGameOver(player)) {
        player.gameOver = true;
        player.aiState = 'GAME_OVER';
        return;
    }

    player.bestMove = findBestMove(player);

    if (player.bestMove) {
        if (player.currentRotation !== player.bestMove.rotationCount) player.aiState = 'ROTATING';
        else if (player.currentPiece.x !== player.bestMove.x) player.aiState = 'MOVING_HORIZONTALLY';
        else player.aiState = 'DROPPING';
    } else {
        player.aiState = 'DROPPING'; // 預設下降
    }
}

// --- 遊戲主循環 (處理所有活躍玩家) ---
function gameLoop() {
    clearTimeout(gameLoopTimeout); // 清除上一個超時

    let activePlayers = players.filter(p => p && !p.gameOver);

    // 檢查遊戲是否結束
    if (activePlayers.length <= 1 && isGameRunning) {
        isGameRunning = false; // 標記遊戲邏輯停止
        winner = activePlayers.length === 1 ? activePlayers[0].id : null; // 確定獲勝者
        drawGame(); // 繪製最終畫面
        setTimeout(startGame, currentRestartDelaySeconds * 1000); // 安排 7 秒後重啟
        return; // 結束當前 gameLoop 調用
    }

    // --- 遍歷處理每個活躍玩家的狀態 ---
    activePlayers.forEach(player => {
        const opponent = players.find(p => p && p.id !== player.id);

        // 根據玩家當前狀態執行一步操作
        switch (player.aiState) {
            case 'SPAWNING':
                spawnNewPieceAndCalculateAI(player);
                // spawn 會設置好下一個狀態 (ROTATING/MOVING/DROPPING/GAME_OVER)
                // 等待下一個 gameLoop tick 來處理新狀態
                break;

            case 'ADDING_GARBAGE':
                if (player.garbageQueue > 0) {
                    addGarbageLinesToBoard(player); // 添加垃圾行
                    // 添加垃圾後可能直接遊戲結束，下一輪 gameLoop 會檢測到
                    if (player.gameOver) break; // 如果添加垃圾導致結束，停止當前玩家處理
                }
                player.aiState = 'SPAWNING'; // 處理完垃圾（或隊列為空），準備生成新塊
                // 等待下一個 gameLoop tick 來處理 SPAWNING
                break;

            case 'ROTATING':
                 if (!player.currentPiece || !player.bestMove) { player.aiState = 'ADDING_GARBAGE'; break; } // 恢復

                if (player.currentRotation !== player.bestMove.rotationCount) {
                    const rotatedShape = rotate(player.currentPiece.shape);
                    const tempPiece = { ...player.currentPiece, shape: rotatedShape };
                    if (rotatedShape && isValidMove(tempPiece, player.board)) {
                        player.currentPiece.shape = rotatedShape;
                        player.currentRotation = (player.currentRotation + 1) % 4;
                    } else { // 旋轉失敗/被阻擋，直接轉入下一步
                        if (player.currentPiece.x !== player.bestMove.x) player.aiState = 'MOVING_HORIZONTALLY';
                        else player.aiState = 'DROPPING';
                    }
                }
                 // 檢查是否旋轉到位 (無論是否在本輪旋轉成功)
                 if (player.currentRotation === player.bestMove.rotationCount) {
                     if (player.currentPiece.x !== player.bestMove.x) player.aiState = 'MOVING_HORIZONTALLY';
                     else player.aiState = 'DROPPING';
                 }
                 // 狀態轉換會在下一輪 gameLoop tick 中執行
                break;

            case 'MOVING_HORIZONTALLY':
                if (!player.currentPiece || !player.bestMove) { player.aiState = 'ADDING_GARBAGE'; break; } // 恢復

                if (player.currentPiece.x !== player.bestMove.x) {
                    const direction = player.currentPiece.x < player.bestMove.x ? 1 : -1;
                    const nextX = player.currentPiece.x + direction;
                    const tempPiece = { ...player.currentPiece, x: nextX };
                    if (isValidMove(tempPiece, player.board)) {
                        player.currentPiece.x = nextX;
                    } else { // 移動失敗/被阻擋
                        player.aiState = 'DROPPING'; // 強制下降
                    }
                }
                 // 檢查是否移動到位 (無論是否在本輪移動成功)
                 if (player.currentPiece.x === player.bestMove.x) {
                    player.aiState = 'DROPPING'; // 到達目標，開始下降
                 }
                 // 狀態轉換會在下一輪 gameLoop tick 中執行
                break;

            case 'DROPPING':
                if (!player.currentPiece) { player.aiState = 'ADDING_GARBAGE'; break; } // 恢復
                const nextY = player.currentPiece.y + 1;
                const tempPiece = { ...player.currentPiece, y: nextY };
                if (isValidMove(tempPiece, player.board)) {
                    player.currentPiece.y = nextY; // 執行下降
                } else { // 無法下降 -> 落地
                    freezePiece(player);
                    player.currentPiece = null; // 清除當前活動塊
                    player.aiState = 'LANDED'; // 進入落地處理狀態
                }
                // 狀態轉換會在下一輪 gameLoop tick 中執行
                break;

            case 'LANDED':
                // 觸發消行檢查和動畫（如果需要），此函數會設置 ANIMATING_CLEAR 狀態
                const linesClearedCount = clearLinesAndAnimate(player);

                // 發送垃圾（如果消行了）
                if (linesClearedCount > 0 && opponent) {
                    const garbageToSend = calculateGarbageToSend(linesClearedCount);
                    if (garbageToSend > 0) {
                        addGarbageToQueue(opponent, garbageToSend);
                    }
                }

                // **關鍵：無論是否消行，落地後下一步都是檢查垃圾**
                // 如果消行了，狀態已是 ANIMATING_CLEAR，動畫回調會轉到 ADDING_GARBAGE
                // 如果沒消行，我們直接設置狀態為 ADDING_GARBAGE
                if (linesClearedCount === 0) {
                     player.aiState = 'ADDING_GARBAGE';
                }
                // 下一輪 gameLoop 會處理新狀態 (ANIMATING_CLEAR 或 ADDING_GARBAGE)
                break;

            case 'ANIMATING_CLEAR':
                // 此狀態下，玩家不執行動作，等待動畫計時器回調觸發狀態轉換
                // 主循環繼續，其他玩家不受影響
                break;

            case 'GAME_OVER':
                // 玩家已結束遊戲，不執行任何動作
                break;

            default:
                console.error(`Player ${player.id} in unknown state: ${player.aiState}`);
                player.aiState = 'ADDING_GARBAGE'; // 嘗試恢復
        }

    }); // 結束 activePlayers.forEach

    // --- 繪製當前所有玩家的狀態 ---
    drawGame();

    // --- 設置下一次循環 ---
    if (isGameRunning) {
        // **始終使用固定的 animationStepInterval**
        gameLoopTimeout = setTimeout(gameLoop, animationStepInterval);
    }
    // 如果 isGameRunning 為 false (遊戲已結束)，則不安排下一次循環
}


// --- 初始化和視窗大小調整 ---
function resizeCanvas() {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    // 計算一個方塊的最大可能尺寸，同時容納兩個棋盤和間隔
    const totalBlocksWidth = COLS * 2 + currentSpacingBlocks;
    const blockSizeW = Math.floor((screenWidth * 0.95) / totalBlocksWidth); // 留一點邊距
    const blockSizeH = Math.floor((screenHeight * 0.9) / (ROWS + 3)); // 底部留出 UI 空間

    calculatedBlockSize = Math.min(blockSizeW, blockSizeH, 30); // 限制最大尺寸

    canvas.width = totalBlocksWidth * calculatedBlockSize;
    canvas.height = (ROWS + 3) * calculatedBlockSize; // 增加底部空間

     // 更新玩家的 X 偏移量 (像素)
     if(players.length > 0) {
         players[0].xOffset = 0; // 玩家1 緊貼左邊
         if (players.length > 1) {
             players[1].xOffset = COLS + currentSpacingBlocks; // 玩家2 在間隔之後
         }
     }

    // 居中 Canvas (可選)
     canvas.style.position = 'absolute';
     canvas.style.left = `${(screenWidth - canvas.width) / 2}px`;
     canvas.style.top = `${(screenHeight - canvas.height) / 2}px`;


    // 如果遊戲已運行，重繪一次
    if (isGameRunning) {
        drawGame();
    }
}
window.addEventListener('resize', resizeCanvas);

// --- 啟動遊戲 ---
document.addEventListener('DOMContentLoaded', (event) => {
    if (canvas) {
        startGame();
    } else {
        console.error("Canvas element not found!");
    }
});

// --- Wallpaper Engine Property Listener ---

// 輔助函數：將 WE 的顏色字符串 (e.g., "0.1 0.1 0.17") 轉換為 CSS rgb() 格式
function weColorToRGB(colorString) {
    let rgb = colorString.split(' ').map(function(c) {
        return Math.ceil(parseFloat(c) * 255);
    });
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {

        if (properties.schemecolor) {
            currentSchemeColor = weColorToRGB(properties.schemecolor.value);
            // 直接應用背景色可能效果不好，因為 canvas 會覆蓋
            // 我們主要在 drawGame 的清除步驟中使用這個顏色
             // document.body.style.backgroundColor = currentSchemeColor; // 可以嘗試，但效果有限
            // console.log("Scheme color updated:", currentSchemeColor);
        }
        if (properties.speed) {
            // 直接更新全局變數，gameLoop 下次調用 setTimeout 時會使用新值
            animationStepInterval = properties.speed.value;
            //  console.log("Animation speed updated:", animationStepInterval);
        }
        if (properties.flashcolor) {
            currentFlashColor = weColorToRGB(properties.flashcolor.value);
             // 更新用於繪製閃爍的常量值 (或者使用全局變量)
             // 我們將在 drawBoard 中直接使用 currentFlashColor
            //  console.log("Flash color updated:", currentFlashColor);
        }
        if (properties.spacing) {
            const newSpacing = properties.spacing.value;
            // 只有在值改變時才更新並觸發 resize
            if (currentSpacingBlocks !== newSpacing) {
                currentSpacingBlocks = newSpacing;
                 console.log("Spacing updated:", currentSpacingBlocks);
                // 間距改變需要重新計算佈局
                resizeCanvas(); // 調用 resize 更新佈局和重繪
            }
        }
         if (properties.restartdelay) {
             currentRestartDelaySeconds = properties.restartdelay.value;
            //  console.log("Restart delay updated:", currentRestartDelaySeconds);
             // 這個值會在遊戲結束設置 setTimeout 時被使用
         }

        // 屬性應用後，可能需要立即重繪一次以反映顏色等變化
        if (isGameRunning) {
            drawGame();
        }
    }
};