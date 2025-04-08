// --- AI 邏輯 (evaluateBoard - 修改版，考慮消除後狀態) ---
function evaluateBoard(board) { // 'board' here is the temporary board after piece placement
    let score = 0;
    let completedLines = 0;

    // --- Step 1: Calculate completed lines based on the initial placement ---
    const initialLinesToClearIndices = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        // Ensure row exists and check if it's full
        if (board[y] && board[y].every(cell => cell > 0)) {
            initialLinesToClearIndices.push(y);
        }
    }
    completedLines = initialLinesToClearIndices.length;

    // --- Step 2: Simulate the line clear if lines were completed ---
    let boardAfterClear = board; // Default to original board if no lines cleared
    if (completedLines > 0) {
        // IMPORTANT: Create a deep copy to simulate the clear without affecting the original
        let tempBoardCopy = board.map(row => [...row]);

        // Sort indices descending to remove from bottom up correctly
        initialLinesToClearIndices.sort((a, b) => b - a);

        // Remove the completed lines
        initialLinesToClearIndices.forEach(y => {
             if (tempBoardCopy.length > y) {
                tempBoardCopy.splice(y, 1);
             }
        });

        // Add empty lines at the top
        for (let i = 0; i < completedLines; i++) {
            tempBoardCopy.unshift(Array(COLS).fill(0));
        }

        // Use this cleared board for metric calculations
        boardAfterClear = tempBoardCopy;
    }

    // --- Step 3: Calculate metrics based on the state *after* potential line clears ---
    // Now, all metrics (except the line clear bonus itself) are calculated on 'boardAfterClear'
    let holes = 0;
    let coveredHoles = 0;
    let aggregateHeight = 0;
    let bumpiness = 0;
    const heights = Array(COLS).fill(0);
    let maxHeight = 0;
    let wellSums = 0;

    // Calculate Heights, Aggregate Height, Max Height, Holes, Covered Holes on boardAfterClear
    for (let x = 0; x < COLS; x++) {
        let colHeight = 0;
        let blocked = false;
        for (let y = 0; y < ROWS; y++) {
             // Use boardAfterClear for all checks
             if (!boardAfterClear[y]) continue;

            if (boardAfterClear[y][x] > 0) {
                if (!blocked) {
                    colHeight = ROWS - y;
                    heights[x] = colHeight;
                    blocked = true;
                }
            } else if (blocked && boardAfterClear[y][x] === 0) { // Found a hole
                holes++;
                // Check if this hole is covered (block directly above in the post-clear state)
                if (y > 0 && boardAfterClear[y-1]?.[x] > 0) {
                     coveredHoles++;
                }
            }
        }
        aggregateHeight += colHeight;
        if (colHeight > maxHeight) maxHeight = colHeight;
    }

    // Calculate Bumpiness on boardAfterClear heights
    for (let x = 0; x < COLS - 1; x++) {
        bumpiness += Math.abs(heights[x] - heights[x + 1]);
    }

    // Calculate Well Sums on boardAfterClear
     for (let x = 0; x < COLS; x++) {
        for (let y = 1; y < ROWS; y++) {
            // Use boardAfterClear
            if (boardAfterClear[y]?.[x] === 0) {
                const leftWall = (x === 0) || (boardAfterClear[y]?.[x - 1] > 0);
                const rightWall = (x === COLS - 1) || (boardAfterClear[y]?.[x + 1] > 0);
                if (leftWall && rightWall) {
                    let wellDepth = 0;
                    for (let wy = y; wy < ROWS; wy++) {
                        if (boardAfterClear[wy]?.[x] === 0 &&
                            ((x === 0) || (boardAfterClear[wy]?.[x - 1] > 0)) &&
                            ((x === COLS - 1) || (boardAfterClear[wy]?.[x + 1] > 0))) {
                            wellDepth++;
                        } else {
                            break;
                        }
                    }
                    if (wellDepth > 0) {
                        wellSums += wellDepth * (wellDepth + 1) / 2;
                        y += wellDepth - 1;
                    }
                }
            }
        }
    }

    // --- Step 4: Calculate Score using post-clear metrics and initial line clear bonus ---

    // --- Weights (IMPORTANT: These might need significant re-tuning!) ---
    // Since metrics now reflect the post-clear state, the impact of temporary holes is gone.
    // The penalty for 'coveredHoles' might need adjustment, or the focus might shift more to 'holes'.
    // Let's start with slightly adjusted weights from the previous version.

    const weightHeight = -0.45;
    const weightLines = 1.0 * COLS;      // Base weight for the line clear *bonus*
    const weightHoles = -1.0;            // Increase penalty for holes remaining *after* clear
    const weightCoveredHoles = -8.0;     // Penalty for covered holes remaining *after* clear (might be less critical now, or redundant with 'holes')
    const weightBumpiness = -0.25;
    const weightMaxHeight = -0.2;
    const weightWellSums = -0.40;        // Slightly increase well penalty for post-clear state
    const weightGarbageProximityPenalty = -0.1; // Penalty for blocks near top garbage (calculated on post-clear board)


    // --- Line Clear Bonus (Based on the *initial* number of lines cleared) ---
    // This bonus should reward the action of clearing lines, regardless of the final board state metrics.
    let lineScoreBonus = 0;
    // Keep the strong bias towards multi-line clears
    if (completedLines === 1) lineScoreBonus = maxHeight > 12 ? 1 : -1; // Single clear bonus (using post-clear max height for context)
    else if (completedLines === 2) lineScoreBonus = maxHeight > 8 ? 5 : -0.5;
    else if (completedLines === 3) lineScoreBonus = 12;
    else if (completedLines >= 4) lineScoreBonus = 40; // Tetris!

    // --- Final Score Calculation ---
    // Combine the bonus for the action (clearing lines) with penalties for the resulting board state.
    score = weightHeight * aggregateHeight +          // Penalty based on post-clear height
            weightLines * lineScoreBonus +          // Bonus based on *initial* lines cleared count
            weightHoles * holes +                   // Penalty based on post-clear holes
            weightCoveredHoles * coveredHoles +     // Penalty based on post-clear covered holes
            weightBumpiness * bumpiness +           // Penalty based on post-clear bumpiness
            weightMaxHeight * maxHeight * maxHeight + // Penalty based on post-clear max height
            weightWellSums * wellSums;              // Penalty based on post-clear wells

    // Optional: Garbage proximity penalty (calculated on post-clear board)
    let garbagePenalty = 0;
    const checkRows = Math.min(5, ROWS);
    for(let y=0; y < checkRows; ++y){
         // Use boardAfterClear
        if(!boardAfterClear[y]) continue;
        for(let x=0; x<COLS; ++x){
            if(boardAfterClear[y][x] === GARBAGE_BLOCK_ID){
                garbagePenalty += (ROWS - y); // Higher penalty for garbage near the top
            }
        }
    }
    score += weightGarbageProximityPenalty * garbagePenalty;

    // Debug log (optional)
    // if (completedLines > 0) {
    //     console.log(`Eval (Post-Clear): L=${completedLines}, H=${aggregateHeight.toFixed(1)}, Holes=${holes}, Covered=${coveredHoles}, Bump=${bumpiness.toFixed(1)}, Wells=${wellSums.toFixed(1)} -> Score=${score.toFixed(2)}`);
    // }

    return score;
}


// -------------------------------------------------------------------------
// 其他所有代碼 (findBestMove, gameLoop, drawing, etc.) 保持不變
// findBestMove 會自動將放置後的 tempBoard 傳遞給這個新版 evaluateBoard
// -------------------------------------------------------------------------
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

// --- 音訊相關 ---
let audioContext;
let dropSoundBuffer = null;
let clearSoundBuffer = null;
let backgroundMusicBuffer = null;
let backgroundMusicSource = null; // 保持對背景音樂源的引用以便停止

// 異步函數: 將 Base64 解碼為 ArrayBuffer
async function base64ToArrayBuffer(base64) {
    try {
        const base64WithoutPrefix = base64.split(',')[1] || base64; // Handle potential data URI prefix
        const binaryString = window.atob(base64WithoutPrefix);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (error) {
        console.error("Error decoding base64 string:", base64.substring(0, 30) + "...", error);
        throw error; // Re-throw the error to be caught by the caller
    }
}


// 異步函數: 加載並解碼音頻數據
async function loadAudio(base64Data) {
    if (!audioContext) return null; // 如果音頻上下文未初始化，則無法加載
    try {
        const arrayBuffer = await base64ToArrayBuffer(base64Data);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Error decoding audio data:', error);
        return null;
    }
}

// 播放音效 (一次性)
function playSound(buffer) {
    if (!audioContext || audioContext.state === 'suspended') {
        audioContext?.resume().catch(e => console.warn("Could not resume audio context:", e));
    }
    if (!buffer || !audioContext || audioContext.state !== 'running') return; // 確保 buffer 和 context 存在且運行
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// 開始播放背景音樂（循環）
function startBackgroundMusic() {
     if (!audioContext || audioContext.state === 'suspended') {
        audioContext?.resume().catch(e => console.warn("Could not resume audio context:", e));;
    }
    if (!backgroundMusicBuffer || !audioContext || audioContext.state !== 'running') return;
    if (backgroundMusicSource) {
        try { backgroundMusicSource.stop(); } catch(e) {/* ignore */}
        backgroundMusicSource = null;
    }
    try {
        backgroundMusicSource = audioContext.createBufferSource();
        backgroundMusicSource.buffer = backgroundMusicBuffer;
        backgroundMusicSource.loop = true;
        backgroundMusicSource.connect(audioContext.destination);
        backgroundMusicSource.start(0);
    } catch(error) {
        console.error('Error starting background music:', error);
        backgroundMusicSource = null;
    }
}

// 停止播放背景音樂
function stopBackgroundMusic() {
    if (backgroundMusicSource) {
        try {
           backgroundMusicSource.stop();
        } catch(e) {
           console.warn("Could not stop background music (already stopped?)", e);
        }
        backgroundMusicSource.disconnect(); // Disconnect node
        backgroundMusicSource = null;
    }
}

// 初始化音頻上下文
function initAudioContext() {
    if (audioContext) return; // Already initialized
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // If suspended, it needs user interaction to resume.
        if (audioContext.state === 'suspended') {
             console.log("AudioContext is suspended. Needs user interaction to resume.");
             // Add a global event listener to resume on first interaction
             const resumeAudio = () => {
                 if (audioContext && audioContext.state === 'suspended') {
                     audioContext.resume().then(() => {
                         console.log("AudioContext resumed on user interaction.");
                         // Try starting music again if needed
                         if (isGameRunning && backgroundMusicBuffer && !backgroundMusicSource) {
                            startBackgroundMusic();
                         }
                     }).catch(e => console.error("Error resuming AudioContext:", e));
                 }
                 // Remove listener after first interaction
                 document.body.removeEventListener('click', resumeAudio);
                 document.body.removeEventListener('keydown', resumeAudio);
             };
             document.body.addEventListener('click', resumeAudio, { once: true });
             document.body.addEventListener('keydown', resumeAudio, { once: true });
        }
    } catch (e) {
        console.error("Web Audio API is not supported or context could not be created.", e);
        audioContext = null; // Ensure it's null if failed
    }
}


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
    const typeId = Math.floor(Math.random() * (SHAPES.length - 2)) + 1; // Exclude garbage type and empty
    const shape = SHAPES[typeId];
    if (!shape || shape.length === 0) { // 安全檢查
        console.error("Failed to get valid shape for typeId:", typeId);
        const fallbackTypeId = 1;
        const fallbackShape = SHAPES[fallbackTypeId];
        // player might not be fully initialized yet, handle null access
        if (player) player.currentRotation = 0;
        let piece = {
            x: Math.floor(COLS / 2) - Math.floor(fallbackShape[0]?.length / 2),
            y: 0,
            shape: fallbackShape.map(row => [...row]),
            color: COLORS[fallbackTypeId],
            typeId: fallbackTypeId
        };
        // Need player.board, ensure player exists
         if (player && player.board) {
            while (!isValidMove(piece, player.board) && piece.y < 4) {
                 if (piece.typeId === 1 && piece.y === 0) piece.y = -1;
                 else piece.y++;
             }
         }
        return piece;
    }
    if (player) player.currentRotation = 0;
    let piece = {
        x: Math.floor(COLS / 2) - Math.floor(shape[0]?.length / 2), // 安全訪問 length
        y: 0,
        shape: shape.map(row => [...row]),
        color: COLORS[typeId],
        typeId: typeId
    };
    // 確保生成時不碰撞 (考慮 player.board)
     if (player && player.board) {
         while (!isValidMove(piece, player.board) && piece.y < 4) {
             if (piece.typeId === 1 && piece.y === 0) piece.y = -1; // I 形特殊處理
             else piece.y++;
         }
     }
    return piece;
}

function rotate(shapeToRotate) {
    if (!shapeToRotate || !Array.isArray(shapeToRotate)) return null;
    const originalShape = shapeToRotate.map(row => {
        if (!Array.isArray(row)) return [];
        return [...row];
     });
    if (originalShape.length === 0) return [];
    const N = originalShape.length;
    if (N === 0 || !originalShape[0]) return shapeToRotate;
    const M = originalShape[0].length; // 可以不是 N x N
    const rotatedShape = Array.from({ length: M }, () => Array(N).fill(0)); // 結果維度是 M x N
    for (let i = 0; i < N; i++) {
        if (!originalShape[i]) continue;
        for (let j = 0; j < M; j++) {
             if (originalShape[i][j] !== undefined) {
                rotatedShape[j][N - 1 - i] = originalShape[i][j];
             }
        }
    }
    return rotatedShape;
}


function isValidMove(piece, board) {
    if (!piece || !piece.shape || !board) return false;
    for (let y = 0; y < piece.shape.length; y++) {
        if (!piece.shape[y]) continue;
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] > 0) {
                const boardX = piece.x + x;
                const boardY = piece.y + y;

                // Boundary check
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    // Optional Log: Focus on when y is small
                    if (piece.y <= 1) console.log(`isValidMove=false (Boundary): p.y=${piece.y}, bX=${boardX}, bY=${boardY}`);
                    return false;
                }

                // Collision check (only for y >= 0)
                if (boardY >= 0) {
                     // Check if the board row itself exists before accessing the cell
                    if (!board[boardY]) {
                         // THIS SHOULD NOT HAPPEN if boardY < ROWS, indicates board structure issue
                        if (piece.y <= 1) console.error(`isValidMove=false (Row Undefined!): p.y=${piece.y}, bY=${boardY}`);
                        return false; // Treat as invalid if row doesn't exist
                    }
                    if (board[boardY][boardX] > 0) {
                        // Optional Log: Focus on when y is small
                         if (piece.y <= 1) console.log(`isValidMove=false (Collision): p.y=${piece.y}, bX=${boardX}, bY=${boardY}, cell=${board[boardY][boardX]}`);
                        return false;
                    }
                }
            }
        }
    }
    return true;
}


function freezePiece(player) {
    const piece = player.currentPiece;
    const board = player.board;
     if (!piece || !piece.shape || !board) return;
    piece.shape.forEach((row, y) => {
        if (!row) return;
        row.forEach((value, x) => {
            if (value > 0) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                // Ensure row exists before assigning
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS && board[boardY]) {
                   board[boardY][boardX] = piece.typeId; // 凍結時使用 typeId
                }
            }
        });
    });
}

function checkGameOver(player) {
    // Ensure currentPiece exists before checking
    if (!player.currentPiece) {
         console.warn(`checkGameOver called without a currentPiece for Player ${player.id}`);
         // This might indicate another logic error, but treat it as game over for safety
         return true;
    }

    // Check 1: Is the spawn position itself invalid (overlaps existing blocks)?
    if (!isValidMove(player.currentPiece, player.board)) {
         console.log(`Player ${player.id} game over condition 1: Invalid spawn spot.`);
         return true;
    }

    // Check 2: Is the spawn position valid, BUT it cannot move down even one step?
    // This means it spawns and instantly lands against blocks below or the floor (if ROWS is small).
    const tempPieceDown = { ...player.currentPiece, y: player.currentPiece.y + 1 };
    if (!isValidMove(tempPieceDown, player.board)) {
        // The piece is placed validly but has instantly "landed". This means the game should end.
         console.log(`Player ${player.id} game over condition 2: Spawned with no room to drop.`);
        // We return true here. The calling function will handle freezing the piece visually.
        return true;
    }

    // Check 3: (Optional but good fallback) Check if the top row has *settled* blocks
    // This catches scenarios where the top row is blocked even if the current piece fits initially.
    // This might be slightly redundant with Check 1 & 2 but adds safety.
    for(let x=0; x<COLS; ++x){
        if(player.board[0] && player.board[0][x] !== 0){
            // Make sure the block isn't part of the piece that just spawned
            let isPartOfCurrentPiece = false;
            if(player.currentPiece.shape){ // currentPiece is guaranteed to exist here
                for(let py=0; py<player.currentPiece.shape.length; ++py){
                    if(!player.currentPiece.shape[py]) continue;
                    for(let px=0; px<player.currentPiece.shape[py].length; ++px){
                        if(player.currentPiece.shape[py][px] > 0){
                            // Check if the block at (x, 0) corresponds to a part of the current piece
                            if(player.currentPiece.y + py === 0 && player.currentPiece.x + px === x){
                                isPartOfCurrentPiece = true;
                                break;
                            }
                        }
                    }
                    if(isPartOfCurrentPiece) break;
                }
            }
            // If the block at (x, 0) is not part of the piece we just spawned, it's game over
            if(!isPartOfCurrentPiece) {
                console.log(`Player ${player.id} game over condition 3: Top row blocked by existing piece.`);
                return true;
            }
        }
    }


    // If none of the above conditions are met, the game continues
    return false;
}


// --- 垃圾行機制 ---
function calculateGarbageToSend(linesCleared) {
    // Aggressive garbage rules for faster games
    if (linesCleared === 1) return 0; // Singles send nothing (common rule)
    if (linesCleared === 2) return 1; // Doubles send 1
    if (linesCleared === 3) return 2; // Triples send 2
    if (linesCleared >= 4) return 4; // Tetris sends 4
    // Add T-Spin detection later if needed (would send more)
    return 0;
}

function addGarbageToQueue(targetPlayer, numLines) {
    if (numLines > 0 && targetPlayer && !targetPlayer.gameOver) {
        targetPlayer.garbageQueue += numLines;
    }
}

function addGarbageLinesToBoard(player) {
    if (!player || player.garbageQueue <= 0 || !player.board) return;

    const numLinesToAdd = Math.min(player.garbageQueue, ROWS - 2); // Leave some buffer, don't fill instantly
    if (numLinesToAdd <= 0) return; // Don't add if queue is small or board too full

    player.garbageQueue -= numLinesToAdd; // Subtract added lines

    const holeX = Math.floor(Math.random() * COLS);
    const garbageLine = Array(COLS).fill(GARBAGE_BLOCK_ID);
    garbageLine[holeX] = 0;

    // Push existing board up
    for (let i = 0; i < numLinesToAdd; i++) {
        player.board.shift(); // Remove top row
        player.board.push([...garbageLine]); // Add garbage at bottom
    }

     // Check if the current piece is now invalid due to the push
     if (player.currentPiece && !isValidMove(player.currentPiece, player.board)) {
         // Try moving the piece up by the number of garbage lines added
         const tempPieceUp = { ...player.currentPiece, y: player.currentPiece.y - numLinesToAdd};
         if (isValidMove(tempPieceUp, player.board)) {
             player.currentPiece.y = tempPieceUp.y;
         } else {
             // If moving up doesn't work, it's likely pushed into overlap or off-screen.
             // Freeze it immediately if possible. checkGameOver will likely trigger soon.
             freezePiece(player); // Try to freeze in place
             player.currentPiece = null; // Piece is dealt with
             console.log(`Player ${player.id}'s piece collided after garbage insertion.`);
             // Transition state appropriately, likely back to checking for clears/game over
             player.aiState = 'LANDED'; // Re-evaluate state after freezing
         }
     }
}


// --- 消行與動畫 (返回消除的行數) ---
function clearLinesAndAnimate(player) {
    const board = player.board;
    player.linesToClear = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        // Ensure row exists and is full
        if (board[y] && board[y].every(cell => cell > 0)) {
            player.linesToClear.push(y);
        }
    }

    const linesClearedCount = player.linesToClear.length;

    if (linesClearedCount > 0) {
        playSound(clearSoundBuffer);
        player.isAnimatingLineClear = true;
        player.aiState = 'ANIMATING_CLEAR';

        // Score calculation (adjust points as desired)
        const basePoints = [0, 100, 300, 500, 800];
        player.score += (basePoints[linesClearedCount] || 0) * (player.level || 1); // Optional: Add level multiplier

        clearTimeout(player.lineClearAnimationTimer);
        player.lineClearAnimationTimer = setTimeout(() => {
            if (!player.board) return; // Guard against player reset during timeout

            // Remove cleared lines from bottom up
            player.linesToClear.sort((a, b) => b - a).forEach(y => {
                 if (player.board.length > y) {
                    player.board.splice(y, 1);
                 }
            });
            // Add new empty lines at the top
            for (let i = 0; i < linesClearedCount; i++) {
                player.board.unshift(Array(COLS).fill(0));
            }

            player.isAnimatingLineClear = false;
            player.linesToClear = [];
            // After animation, check for pending garbage *before* spawning next piece
            if (player.garbageQueue > 0) {
                 // Transition to SPAWNING, which handles garbage check first now
                 player.aiState = 'SPAWNING';
            } else {
                 player.aiState = 'SPAWNING'; // Ready for next piece
            }

        }, LINE_CLEAR_FLASH_DURATION);

        return linesClearedCount;
    }
    return 0; // No lines cleared
}

// --- 繪圖 (處理多個玩家和偏移) ---
function drawBlock(x, y, color, ctx = context, blockSize = calculatedBlockSize, offsetX = 0, offsetY = 0) {
    if (color) {
        ctx.fillStyle = color;
        const drawX = (x + offsetX) * blockSize;
        const drawY = (y + offsetY) * blockSize;
        ctx.fillRect(drawX, drawY, blockSize, blockSize);

        // Subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX + 0.5, drawY + 0.5, blockSize - 1, blockSize - 1);
    }
}


function drawBoard(player, ctx = context, blockSize = calculatedBlockSize) {
    const board = player.board;
    const offsetX = player.xOffset;
    board.forEach((row, y) => {
        const isClearing = player.isAnimatingLineClear && player.linesToClear.includes(y);
        if (!row) return;
        row.forEach((value, x) => {
            if (value !== 0) {
                 const color = isClearing ? currentFlashColor : COLORS[value];
                 drawBlock(x, y, color, ctx, blockSize, offsetX);
            }
        });
    });
     // Draw board border
     ctx.strokeStyle = '#AAAAAA';
     ctx.lineWidth = 2;
     ctx.strokeRect(offsetX * blockSize, 0, COLS * blockSize, ROWS * blockSize);
}

function drawPiece(player, ctx = context, blockSize = calculatedBlockSize) {
    const piece = player.currentPiece;
    const offsetX = player.xOffset;
    if (!piece || !piece.shape) return;

    piece.shape.forEach((row, y) => {
        if (!row) return;
        row.forEach((value, x) => {
            if (value > 0) {
                const drawBoardX = piece.x + x;
                const drawBoardY = piece.y + y;
                if (drawBoardY >= 0 && drawBoardX >= 0 && drawBoardX < COLS) {
                     drawBlock(drawBoardX, drawBoardY, piece.color, ctx, blockSize, offsetX);
                }
            }
        });
    });
}


function drawUI(players, ctx = context, blockSize = calculatedBlockSize) {
    ctx.fillStyle = '#FFFFFF';
    const fontSize = Math.max(10, Math.floor(blockSize * 0.7));
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

     players.forEach(player => {
        if (!player) return;
        const offsetX = player.xOffset * blockSize;
        const textX = offsetX + blockSize * 0.5;
        const uiStartY = ROWS * blockSize + blockSize * 0.5;
        const lineHeight = fontSize * 1.4;

        ctx.fillText(`P ${player.id + 1}`, textX, uiStartY);
        ctx.fillText(`Score: ${player.score}`, textX, uiStartY + lineHeight);
        if (player.garbageQueue > 0) {
            ctx.fillStyle = '#FF8080';
            ctx.fillText(`+ ${player.garbageQueue}`, textX + blockSize * 4, uiStartY + lineHeight);
            ctx.fillStyle = '#FFFFFF';
        }
     });

    // Display winner message
    if (winner !== null) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const winnerBoxY = canvas.height / 2 - blockSize * 2.5;
        const winnerBoxHeight = blockSize * 5;
        ctx.fillRect(0, winnerBoxY, canvas.width, winnerBoxHeight);

        ctx.fillStyle = '#00FF00';
        const winnerFontSize = Math.max(16, Math.floor(blockSize * 1.5));
        ctx.font = `bold ${winnerFontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let winnerText = winner === 'DRAW' ? 'DRAW!' : `Player ${winner + 1} wins!`;
        winnerText += ` Restarting...`;
        ctx.fillText(winnerText, canvas.width / 2, winnerBoxY + winnerBoxHeight / 2);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
    }
}


function drawGame() {
    context.fillStyle = currentSchemeColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    players.forEach(player => {
        if(player) {
            drawBoard(player);
            if (player.currentPiece && !player.isAnimatingLineClear && !player.gameOver) {
                drawPiece(player);
            }
            // drawNextPiecePreview(player); // TODO
        }
    });

    drawUI(players);
}

function findBestMove(player) {
    let bestScore = -Infinity;
    let bestMove = null;
    const piece = player.currentPiece;
    const board = player.board;
    const MAX_ITERATIONS = ROWS * 2;

    if (!piece || !piece.shape || !board) return null;

     const originalShape = piece.shape.map(row => Array.isArray(row) ? [...row] : row);

    let currentShape = originalShape;
    for (let r = 0; r < 4; r++) {
         if (!currentShape) continue;

         let minPieceX = COLS, maxPieceX = -1;
         for(let y=0; y<currentShape.length; ++y){
             if(!currentShape[y]) continue;
             for(let x=0; x<currentShape[y].length; ++x){
                 if(currentShape[y][x] > 0) {
                     minPieceX = Math.min(minPieceX, x);
                     maxPieceX = Math.max(maxPieceX, x);
                    }
                }
            }
            if (maxPieceX === -1) {
                currentShape = rotate(currentShape);
                continue;
            }
            const startX = -minPieceX;
            const endX = COLS - 1 - maxPieceX; // Corrected calculation for endX

            if (startX > endX) {
                    // This rotation might not fit on the board at all
                    currentShape = rotate(currentShape); // Prepare for next rotation
                    continue; // Skip to next rotation
            }
            
            for (let x = startX; x <= endX; x++) { // Use <= to include endX
                let testPiece = {
                    ...piece,
                    shape: currentShape,
                    x: x,
                    y: -1
                };
                
            let placementIterations = 0;
            let initialY = -2;
            while (!isValidMove({ ...testPiece, y: initialY }, board)) {
                initialY++;
                placementIterations++;
                if (initialY > 1 || placementIterations > MAX_ITERATIONS) { // <--- 檢查上限
                    console.error(`Infinite loop detected in findBestMove initial placement? R=${r}, X=${x}, StartY=${initialY}`);
                    initialY = ROWS; // Force break condition or handle error
                    break; // <--- 強制跳出
                }
            }
            if(initialY > 1 && placementIterations > MAX_ITERATIONS) continue;
            if (initialY > 1 || !isValidMove({ ...testPiece, y: initialY }, board)) {
                continue;
            }
            testPiece.y = initialY;

            let dropSimPiece = {...testPiece};
            let dropIterations = 0;
            while (isValidMove({ ...dropSimPiece, y: dropSimPiece.y + 1 }, board)) {
                dropSimPiece.y++;
                dropIterations++;
                if (dropIterations > MAX_ITERATIONS) { // <--- 檢查上限
                    console.error(`Infinite loop detected in findBestMove drop simulation? R=${r}, X=${x}, CurrentY=${dropSimPiece.y}`);
                    // 可能需要將 dropSimPiece.y 設為一個表示錯誤的值或強制停止
                    dropSimPiece.y = player.currentPiece.y; // 回退到原始 Y 或其他安全值
                    break; // <--- 強制跳出
                }
            }
            const finalY = dropSimPiece.y;

            const tempBoard = board.map(row => [...row]);
            const landedPiece = { ...testPiece, y: finalY, shape: currentShape, typeId: piece.typeId };

            let isValidPlacement = true;
            landedPiece.shape.forEach((row, py) => {
                if(!row || !isValidPlacement) return; // Exit early if already invalid
                row.forEach((val, px) => {
                    if(val > 0){
                        const by = landedPiece.y + py;
                        const bx = landedPiece.x + px;
                        if(by>=0 && by<ROWS && bx>=0 && bx<COLS && tempBoard[by]) {
                            if(tempBoard[by][bx] !== 0) isValidPlacement = false;
                            tempBoard[by][bx] = landedPiece.typeId;
                        } else if (by >= ROWS || bx < 0 || bx >= COLS) {
                            isValidPlacement = false;
                        } // else: piece part is above board (y < 0), which is fine for landing calc
                    }
                });
            });

            if(isValidPlacement) {
                // **** Pass the potentially modified tempBoard to evaluateBoard ****
                const currentScore = evaluateBoard(tempBoard); // evaluateBoard now handles internal clearing

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestMove = {
                        rotationCount: r,
                        x: landedPiece.x,
                        score: currentScore
                    };
                }
            }
        } // end for x

        currentShape = rotate(currentShape);
    } // end for r

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
        xOffset: xOffset,
        isAnimatingLineClear: false,
        linesToClear: [],
        lineClearAnimationTimer: null,
        level: 1
    };
}

function resetGame() {
    clearTimeout(gameLoopTimeout);
    stopBackgroundMusic();
    players.forEach(p => clearTimeout(p?.lineClearAnimationTimer));

    players = [
        createPlayer(0, 0),
        createPlayer(1, COLS + currentSpacingBlocks)
    ];
    players.forEach(p => {
         if(p) {
             p.nextPiece = getRandomPiece(p);
         }
    });
    winner = null;
    isGameRunning = false;
}

function startGame() {
    initAudioContext();

    if (isGameRunning) {
         clearTimeout(gameLoopTimeout);
         players.forEach(p => clearTimeout(p?.lineClearAnimationTimer));
         stopBackgroundMusic();
    }
    resetGame();
    resizeCanvas();

     Promise.all([
        loadAudio(DROP_BASE64).then(buffer => dropSoundBuffer = buffer),
        loadAudio(CLEAR_BASE64).then(buffer => clearSoundBuffer = buffer),
        loadAudio(BACK_GROUHND_MUSIC_BASE64).then(buffer => backgroundMusicBuffer = buffer)
    ]).then(() => {
        console.log("Audio assets loaded.");
        if (audioContext && audioContext.state === 'running') {
             startBackgroundMusic();
        } else {
            console.log("AudioContext not running, background music deferred.");
        }
    }).catch(error => {
        console.error("Error loading one or more audio assets:", error);
    });

    isGameRunning = true;
    gameLoop();
}

// --- 生成新方塊與計算 (針對特定玩家) ---
// --- 生成新方塊與計算 (針對特定玩家) ---
function spawnNewPieceAndCalculateAI(player) {
    // Handle pending garbage first
    if (player.garbageQueue > 0) {
         addGarbageLinesToBoard(player);
         // Check if garbage insertion immediately ended the game or caused collision
         if (player.gameOver) return; // Game ended due to garbage push
         if (player.aiState === 'LANDED') { // Piece collided and was force-frozen by garbage logic
            // Don't spawn a new piece yet, the 'LANDED' state needs processing in the main loop
            // This might involve checking for clears from the forced freeze.
            // Let the main game loop handle the 'LANDED' state transition.
            return;
         }
    }

    // Assign the next piece
    player.currentPiece = player.nextPiece;
    player.nextPiece = getRandomPiece(player); // Generate the piece after next
    player.currentRotation = 0;

    // *** Call the enhanced checkGameOver ***
    if (checkGameOver(player)) {
        console.log(`Player ${player.id} game over triggered immediately on spawn.`);

        // *** IMPORTANT: Freeze the piece visually in its final spot before setting gameOver ***
        // This ensures the player sees the piece that caused the game over.
        // Only freeze if currentPiece still exists (it should, checkGameOver doesn't null it)
        if(player.currentPiece) {
            console.log(`Freezing piece for Player ${player.id} before ending game.`);
            freezePiece(player);
        } else {
             console.warn(`Tried to freeze piece on game over for Player ${player.id}, but currentPiece was null.`);
        }

        // Now set the game over state
        player.currentPiece = null; // Clear the active piece reference
        player.gameOver = true;
        player.aiState = 'GAME_OVER';
        return; // Stop further processing for this player in this tick
    }

    // --- If game is not over, proceed to calculate AI move ---
    player.bestMove = findBestMove(player);

    if (player.bestMove) {
        if (player.currentRotation !== player.bestMove.rotationCount) {
            player.aiState = 'ROTATING';
        } else if (player.currentPiece.x !== player.bestMove.x) {
            player.aiState = 'MOVING_HORIZONTALLY';
        } else {
            player.aiState = 'DROPPING';
        }
    } else {
        // This case (no best move found) might also happen in near game-over states.
        // The checkGameOver should ideally catch it earlier, but dropping is a safe default.
        console.warn(`Player ${player.id}: AI could not find a best move after spawn. Defaulting to drop.`);
        player.aiState = 'DROPPING';
    }
}

// --- 遊戲主循環 (處理所有活躍玩家) ---
function gameLoop() {
    clearTimeout(gameLoopTimeout);

    let activePlayers = players.filter(p => p && !p.gameOver);

    // --- Check Game End Condition ---
    if (activePlayers.length <= 1 && isGameRunning) {
        isGameRunning = false;
        stopBackgroundMusic();

        if (activePlayers.length === 1) {
            winner = activePlayers[0].id;
        } else {
             const nonGameOverPlayers = players.filter(p => p && !p.gameOver);
             if (nonGameOverPlayers.length === 1) { // Should not happen if activePlayers is 0, but safety check
                 winner = nonGameOverPlayers[0].id;
             } else {
                  winner = 'DRAW';
                  console.log("Game ended possibly in a draw.");
             }
        }

        drawGame();
        console.log(`Game over. Winner: ${winner === 'DRAW' ? 'Draw' : `Player ${winner + 1}`}. Restarting in ${currentRestartDelaySeconds}s`);
        gameLoopTimeout = setTimeout(startGame, currentRestartDelaySeconds * 1000);
        return;
    }

    // --- Process Each Active Player ---
    activePlayers.forEach(player => {
        const opponent = players.find(p => p && p.id !== player.id);

        if (player.aiState === 'ANIMATING_CLEAR') {
            return;
        }

        // --- Player State Machine ---
        switch (player.aiState) {
            case 'SPAWNING':
                // Handles garbage addition internally now
                spawnNewPieceAndCalculateAI(player);
                break;

            case 'ROTATING':
                 if (!player.currentPiece || !player.bestMove) {
                     console.warn(`Player ${player.id} invalid state in ROTATING. Resetting.`);
                     player.aiState = 'SPAWNING';
                     break;
                 }
                if (player.currentRotation !== player.bestMove.rotationCount) {
                    const rotatedShape = rotate(player.currentPiece.shape);
                    const tempPiece = { ...player.currentPiece, shape: rotatedShape };
                    if (rotatedShape && isValidMove(tempPiece, player.board)) {
                        player.currentPiece.shape = rotatedShape;
                        player.currentRotation = (player.currentRotation + 1) % 4;
                    } else {
                         if (player.currentPiece.x !== player.bestMove.x) player.aiState = 'MOVING_HORIZONTALLY';
                         else player.aiState = 'DROPPING';
                    }
                }
                 if (player.currentRotation === player.bestMove.rotationCount) {
                     if (player.currentPiece.x !== player.bestMove.x) player.aiState = 'MOVING_HORIZONTALLY';
                     else player.aiState = 'DROPPING';
                 }
                break;

            case 'MOVING_HORIZONTALLY':
                if (!player.currentPiece || !player.bestMove) {
                     console.warn(`Player ${player.id} invalid state in MOVING. Resetting.`);
                    player.aiState = 'SPAWNING'; break;
                 }
                if (player.currentPiece.x !== player.bestMove.x) {
                    const direction = player.currentPiece.x < player.bestMove.x ? 1 : -1;
                    const nextX = player.currentPiece.x + direction;
                    const tempPiece = { ...player.currentPiece, x: nextX };
                    if (isValidMove(tempPiece, player.board)) {
                        player.currentPiece.x = nextX;
                    } else {
                        player.aiState = 'DROPPING';
                    }
                }
                 if (player.currentPiece.x === player.bestMove.x) {
                    player.aiState = 'DROPPING';
                 }
                break;

            case 'DROPPING':
                if (!player.currentPiece) {
                    player.aiState = 'SPAWNING';
                    break;
                 }
                const nextY = player.currentPiece.y + 1;
                const tempPieceDrop = { ...player.currentPiece, y: nextY };
                if (isValidMove(tempPieceDrop, player.board)) {
                    player.currentPiece.y = nextY;
                } else {
                    playSound(dropSoundBuffer);
                    freezePiece(player);
                    player.currentPiece = null;
                    player.aiState = 'LANDED';
                }
                break;

            case 'LANDED':
                const linesClearedCount = clearLinesAndAnimate(player); // Handles state change if animating

                if (linesClearedCount === 0) {
                    // No lines cleared, move directly to spawning (which checks garbage)
                    player.aiState = 'SPAWNING';
                } else {
                     // Lines were cleared, send garbage
                     if (opponent && !opponent.gameOver) {
                        const garbageToSend = calculateGarbageToSend(linesClearedCount);
                        if (garbageToSend > 0) {
                            addGarbageToQueue(opponent, garbageToSend);
                        }
                    }
                     // State is now ANIMATING_CLEAR, waiting for timeout in clearLinesAndAnimate
                }
                break;

            case 'GAME_OVER':
                break;

            default:
                console.error(`Player ${player.id} unknown state: ${player.aiState}. Resetting.`);
                player.aiState = 'SPAWNING';
        }

    }); // End activePlayers.forEach

    // --- Draw Current State ---
    drawGame();

    // --- Schedule Next Loop ---
    if (isGameRunning) {
        gameLoopTimeout = setTimeout(gameLoop, animationStepInterval);
    }
}


// --- 初始化和視窗大小調整 ---
function resizeCanvas() {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const totalBlocksWidth = COLS * 2 + currentSpacingBlocks;
    const uiReservedBlocksHeight = 4;
    const availableWidth = screenWidth * 0.95;
    const availableHeight = screenHeight * 0.95;
    const blockSizeW = Math.floor(availableWidth / totalBlocksWidth);
    const blockSizeH = Math.floor(availableHeight / (ROWS + uiReservedBlocksHeight));
    calculatedBlockSize = Math.max(8, Math.min(blockSizeW, blockSizeH, 35));
    canvas.width = totalBlocksWidth * calculatedBlockSize;
    canvas.height = (ROWS + uiReservedBlocksHeight) * calculatedBlockSize;

     if(players.length > 0 && players[0]) {
         players[0].xOffset = 0;
         if (players.length > 1 && players[1]) {
             players[1].xOffset = COLS + currentSpacingBlocks;
         }
     }

     canvas.style.position = 'absolute';
     canvas.style.left = `max(0px, ${(screenWidth - canvas.width) / 2}px)`;
     canvas.style.top = `max(0px, ${(screenHeight - canvas.height) / 2}px)`;

    drawGame();
}
window.addEventListener('resize', resizeCanvas);

// --- 啟動遊戲 ---
document.addEventListener('DOMContentLoaded', (event) => {
    if (canvas) {
        initAudioContext();
        startGame();
    } else {
        console.error("Canvas element not found!");
    }
});

// --- Wallpaper Engine Property Listener ---
function weColorToRGB(colorString) {
    if (typeof colorString !== 'string') return 'rgb(0,0,0)';
    try {
        let rgb = colorString.split(' ').map(c => Math.ceil(parseFloat(c) * 255));
        rgb = rgb.map(c => Math.max(0, Math.min(255, c)));
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    } catch (e) {
        console.error("Error parsing WE color:", colorString, e);
        return 'rgb(0,0,0)';
    }
}

window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        let needsResize = false;
        let needsRedraw = false;

        if (properties.schemecolor) {
            const newColor = weColorToRGB(properties.schemecolor.value);
            if (currentSchemeColor !== newColor) {
                currentSchemeColor = newColor;
                needsRedraw = true;
            }
        }
        if (properties.speed) {
             const weSpeed = properties.speed.value;
             const minInterval = 20;
             const maxInterval = 250;
             const minWeSpeed = 10;
             const maxWeSpeed = 200;
             let newInterval = maxInterval - ((weSpeed - minWeSpeed) / (maxWeSpeed - minWeSpeed)) * (maxInterval - minInterval);
             newInterval = Math.max(minInterval, Math.min(maxInterval, Math.round(newInterval)));

             if (animationStepInterval !== newInterval) {
                 animationStepInterval = newInterval;
                  console.log("AI Speed Interval updated:", animationStepInterval);
             }
        }
        if (properties.flashcolor) {
             const newFlashColor = weColorToRGB(properties.flashcolor.value);
             if (currentFlashColor !== newFlashColor) {
                currentFlashColor = newFlashColor;
                if (players.some(p => p?.isAnimatingLineClear)) {
                    needsRedraw = true;
                }
             }
        }
        if (properties.spacing) {
            const newSpacing = parseInt(properties.spacing.value, 10);
            if (!isNaN(newSpacing) && newSpacing >= 0 && currentSpacingBlocks !== newSpacing) {
                currentSpacingBlocks = newSpacing;
                needsResize = true;
                 console.log("Spacing updated:", currentSpacingBlocks);
            }
        }
         if (properties.restartdelay) {
             const newDelay = parseInt(properties.restartdelay.value, 10);
             if (!isNaN(newDelay) && newDelay >= 1 && currentRestartDelaySeconds !== newDelay) {
                currentRestartDelaySeconds = newDelay;
                console.log("Restart delay updated:", currentRestartDelaySeconds);
             }
         }

        if (needsResize) {
            resizeCanvas();
        } else if (needsRedraw) {
            drawGame();
        }
    }
};