// script.js (Refactored for LogicalPlayer and PlayerCell with Background Music using Web Audio API)

// --- Canvas and DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const leaderboardElement = document.getElementById('leaderboard');
const gameContainer = document.getElementById('game-container');
const gameElementToFade = gameContainer || canvas;

// --- Global Data Structures ---
let players = []; // Holds LogicalPlayer instances
let foods = [];
let viruses = [];
let feedPellets = [];
let nameList = NAME_LIST; // Assumes NAME_LIST is loaded from NAME_LIST.js
let currentNameIndex = 0;
let nextPlayerId = 0; // Simple ID generator for LogicalPlayers

// --- Configuration Constants (Agar.io Specific) ---
const MIN_ACTIVE_PLAYERS = 20;
const initialPlayerCount = MIN_ACTIVE_PLAYERS;
const maxFoodCount = 300;
const foodRadius = 3;
const initialVirusCount = 5;
const virusRadius = 35;
const virusColor = '#33ff33';
const virusSpikeCount = 10;
const virusSplitMassThresholdMultiplier = 1.15;
const playerSplitPieces = 7;
const playerSplitMinMassPerPiece = 300;
const playerSplitBurstSpeed = 1;
const respawnDelay = 5000;
const MAX_DELTA_TIME = 50;
const LEADERBOARD_UPDATE_INTERVAL = 300;
const MERGE_COOLDOWN = 12000;
const FLEE_EDGE_DISTANCE_THRESHOLD = 25;
const PLAYER_EAT_DISTANCE_FACTOR = 0.4;
const VIRUS_SPLIT_DISTANCE_FACTOR = 0.4;
const MERGE_OVERLAP_FACTOR = 0.8;
const INTRA_PLAYER_REPULSION_ENABLED = true;
const REPULSION_FORCE_MULTIPLIER = 0.2;
const REPULSION_EFFECTIVE_DISTANCE_FACTOR = 1.4;
const REPULSION_MIN_FORCE_FACTOR = 0.05;
const REPULSION_FADE_WINDOW_MS = 3000;
const AI_CAN_FEED_VIRUS = true;
const MIN_MASS_TO_FEED_VIRUS = 10000;
const VIRUS_FEED_MASS_COST = 1000;
const VIRUS_MAX_FEED_COUNT = 7;
const FEED_VIRUS_RANGE_FACTOR = 0.8;
const FEED_TARGET_MAX_MASS_FACTOR = 100;
const FEED_EDGE_PROXIMITY_THRESHOLD = 50;
const AI_FEED_VIRUS_PROBABILITY = 0.3;
const AI_FEED_VIRUS_COOLDOWN_DURATION = 20000;
const PELLET_SPEED = 10;
const PELLET_LIFESPAN = 800;
const PELLET_RADIUS = 15;
const MAX_SPAWN_ATTEMPTS = 100;
const SPAWN_SAFETY_BUFFER = 15;
let cellBaseSpeedMultiplier = 6.0; // Default, can be updated by WE
const CELL_SPEED_MASS_FACTOR = 1.1;
const RESET_ON_MAP_COVERAGE = true;
const MAP_COVERAGE_RADIUS_FACTOR = 0.9;
const INTRA_PLAYER_COLLISION_ENABLED = true; // Keep this if you still want the logic below
const FADE_DURATION = 7000;
const BLACK_SCREEN_DURATION = 500;
let debug_draw_ai_view = false;
// const MINIMUM_CELL_MASS_AFTER_SHRINK = 10; // Add if using intra-player collision shrink
// const INTRA_PLAYER_SHRINK_RATE = 0.005;    // Add if using intra-player collision shrink

// --- Game State Variables ---
let leaderboardUpdateCooldown = LEADERBOARD_UPDATE_INTERVAL;
let lastTime = 0;
let isPausedForFade = false;
let isResettingGame = false;
let isGameRunning = false; // Added to track overall game state for audio resume

// --- Web Audio API Variables ---
let audioContext = null;
let backgroundMusicBuffer = null;
let backgroundMusicSource = null; // Reference to the playing source node

// --- Wallpaper Engine Property Listener ---
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        if (properties.cellbasespeed) {
            cellBaseSpeedMultiplier = properties.cellbasespeed.value;
            console.log("Cell Base Speed Multiplier updated to:", cellBaseSpeedMultiplier);
        }
        if (properties.debugdrawaiview) {
            debug_draw_ai_view = properties.debugdrawaiview.value;
            console.log("Debug Draw AI View updated to:", debug_draw_ai_view);
        }
        // Add other properties if needed
        // Example: Volume control
        // if (properties.backgroundvolume) {
        //     const newVolume = properties.backgroundvolume.value / 100;
        //     // Need to implement volume control using a GainNode for Web Audio API
        //     console.log("Volume property changed to:", newVolume);
        //     // setBackgroundMusicVolume(newVolume); // Implement this function if needed
        // }
    },
};

// --- Helper Functions (Agar.io Specific) ---
function getRandomColor() {
    let color = '#';
    let r, g, b;
    const minBrightnessSum = 380; // 閾值 (0-765)，越高越亮

    do {
        color = '#';
        const letters = '0123456789ABCDEF';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        // 計算 RGB 值的總和來判斷亮度
        r = parseInt(color.substring(1, 3), 16);
        g = parseInt(color.substring(3, 5), 16);
        b = parseInt(color.substring(5, 7), 16);
        // 確保顏色不會太暗 (RGB 總和低於閾值)
    } while (r + g + b < minBrightnessSum);
    return color;
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function distanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}
function shuffleArray(array) {
     if (!array || array.length === 0) return; // Safety check
     for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function getNextName() {
     if (!nameList || nameList.length === 0) {
        return `Cell_${Math.floor(Math.random() * 1000)}`;
    }
    const name = nameList[currentNameIndex];
    currentNameIndex = (currentNameIndex + 1) % nameList.length;
    return name;
}

// --- Audio Helper Functions (Web Audio API) ---

async function base64ToArrayBuffer(base64) {
    try {
        const base64WithoutPrefix = base64.split(',')[1] || base64;
        const binaryString = window.atob(base64WithoutPrefix);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (error) {
        console.error("Error decoding base64 string:", base64.substring(0, 30) + "...", error);
        throw error;
    }
}

async function loadAudio(base64Data) {
    if (!audioContext) {
        console.warn("loadAudio called before AudioContext initialized.");
        return null;
    }
    if (!base64Data) {
        console.warn("loadAudio called with empty base64Data.");
        return null;
    }
    try {
        const arrayBuffer = await base64ToArrayBuffer(base64Data);
        console.log(`Decoding audio data (ArrayBuffer size: ${arrayBuffer.byteLength})...`);
        // Use decodeAudioData promise-based syntax
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("Audio data decoded successfully.");
        return audioBuffer;
    } catch (error) {
        console.error('Error decoding audio data:', error);
        return null;
    }
}

function startBackgroundMusic() {
    if (!audioContext) { console.warn("Cannot start music, AudioContext not ready."); return; }
    // Check if context is suspended and try to resume
    if (audioContext.state === 'suspended') {
        console.log("AudioContext suspended, attempting resume (music will start if successful)...");
        audioContext.resume().catch(e => console.warn("Could not resume audio context:", e));
        // Music start is handled by the resume handler in initAudioContext
        return;
    }
     // Check if buffer is loaded
    if (!backgroundMusicBuffer) { console.warn("Cannot start music, buffer not loaded yet."); return; }
    // Stop existing source if it's playing
    if (backgroundMusicSource) {
        try { backgroundMusicSource.stop(); } catch(e) {/* ignore */}
        try { backgroundMusicSource.disconnect(); } catch(e) {/* ignore */}
        backgroundMusicSource = null;
    }

    try {
        console.log("Creating and starting background music source node...");
        backgroundMusicSource = audioContext.createBufferSource();
        backgroundMusicSource.buffer = backgroundMusicBuffer;
        backgroundMusicSource.loop = true;
        // Connect to destination (speakers)
        backgroundMusicSource.connect(audioContext.destination);
        backgroundMusicSource.start(0); // Start playing immediately
        console.log("Background music source started.");
    } catch(error) {
        console.error('Error starting background music source:', error);
        backgroundMusicSource = null; // Ensure it's null if starting failed
    }
}

function stopBackgroundMusic() {
    if (backgroundMusicSource) {
        try {
           console.log("Stopping background music source node...");
           backgroundMusicSource.stop();
           backgroundMusicSource.disconnect(); // Important to disconnect node
        } catch(e) {
           // It might have already stopped or been disconnected, which is fine
           console.warn("Could not stop/disconnect background music source (may already be stopped):", e);
        }
        backgroundMusicSource = null; // Clear the reference
    } else {
        // console.log("Stop background music called, but no source node was active.");
    }
}

function initAudioContext() {
    if (audioContext) return; // Already initialized
    try {
        console.log("Initializing AudioContext...");
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === 'suspended') {
             console.log("AudioContext is suspended. Adding interaction listeners to resume.");
             // Need a flag to avoid adding listeners multiple times if init is called again
             let listenersAdded = false;
             const resumeAudio = () => {
                 if (!listenersAdded) return; // Prevent running if already resumed/removed
                 if (audioContext && audioContext.state === 'suspended') {
                     console.log("User interaction detected, attempting to resume AudioContext...");
                     audioContext.resume().then(() => {
                         console.log("AudioContext resumed successfully by user interaction.");
                         // Now that context is running, try starting music if buffer is ready
                         if (isGameRunning && backgroundMusicBuffer && !backgroundMusicSource) {
                            console.log("Attempting to start background music after context resume.");
                            startBackgroundMusic();
                         }
                     }).catch(e => console.error("Error resuming AudioContext on interaction:", e));
                 }
                 // Clean up listeners
                 document.body.removeEventListener('click', resumeAudio);
                 document.body.removeEventListener('keydown', resumeAudio);
                 listenersAdded = false;
             };

             // Add listeners only once
             if (!listenersAdded) {
                 document.body.addEventListener('click', resumeAudio, { once: true });
                 document.body.addEventListener('keydown', resumeAudio, { once: true });
                 listenersAdded = true;
                 console.log("Interaction listeners for audio resume added.");
             }

        } else {
            console.log("AudioContext initialized and in state:", audioContext.state);
        }
    } catch (e) {
        console.error("Web Audio API is not supported or context could not be created.", e);
        audioContext = null; // Ensure context is null if creation failed
    }
}


// --- Classes (Agar.io Specific: FeedPellet, LogicalPlayer, PlayerCell, Food, Virus) ---

class FeedPellet {
    constructor(startX, startY, targetX, targetY, radius, color) {
        this.x = startX;
        this.y = startY;
        this.radius = radius;
        this.color = color;
        // this.lifeTimer = PELLET_LIFESPAN; // REMOVED: Fixed lifespan

        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate time to reach target based on speed
        // Assuming PELLET_SPEED is pixels per 16.67ms tick
        const timeToTargetMs = dist > 0.1 ? (dist / PELLET_SPEED) * 16.67 : 100; // Add a small minimum time
        this.lifeTimer = timeToTargetMs; // ADDED: Dynamic lifespan

        if (dist > 0.1) {
            this.vx = (dx / dist) * PELLET_SPEED;
            this.vy = (dy / dist) * PELLET_SPEED;
        } else {
            // Start with minimal velocity if already at target (shouldn't happen often)
            this.vx = (Math.random() - 0.5) * PELLET_SPEED * 0.1;
            this.vy = (Math.random() - 0.5) * PELLET_SPEED * 0.1;
            this.lifeTimer = 100; // Give it a very short lifespan if starting at target
        }
    }

    update(deltaTime) {
        // Check if lifespan expired before moving
        this.lifeTimer -= deltaTime;
        if (this.lifeTimer <= 0) {
            return false; // Pellet expires
        }

        const timeFactor = deltaTime / 16.67;
        this.x += this.vx * timeFactor;
        this.y += this.vy * timeFactor;

        // Return true if still alive
        return true;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

class LogicalPlayer {
    constructor(name, color) {
        this.id = nextPlayerId++;
        this.name = name || getNextName();
        this.color = color || getRandomColor();
        this.cells = [];
        this.totalMass = 0;
        this.isEaten = false;
        this.respawnTimer = 0;
        this.isSplitting = false; // Track splitting state

        this.aiTarget = null;
        this.aiUpdateCooldown = Math.random() * 200;
        this.aiUpdateInterval = 200 + Math.random() * 150;
        this.aiFeedVirusCooldown = 0
        this.currentViewRadius = 0;

        this.createInitialCell();
    }

    isSplitState(maxCellsConsideredConsolidated = 2, minMassRatioForLargest = 0.7) {
        if (this.cells.length <= maxCellsConsideredConsolidated) {
            return false;
        }
        const largestMass = this.findLargestCellMass();
        if (this.totalMass > 0 && (largestMass / this.totalMass) < minMassRatioForLargest) {
            return true;
        }
        return false;
    }

    findNearestVulnerableCellToThreat(threatPosition, threatLargestMass) {
        let nearestVulnerableCell = null;
        let minDistSq = Infinity;

        for (const cell of this.cells) {
            if (threatLargestMass > cell.mass * 1.15) { // Assume 15% larger to eat
                const dSq = distanceSq(cell.x, cell.y, threatPosition.x, threatPosition.y);
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    nearestVulnerableCell = cell;
                }
            }
        }
        return { cell: nearestVulnerableCell, distSq: minDistSq };
    }

    createInitialCell() {
        let attempts = 0;
        let safeX, safeY, isSafe = false;
        let initialRadius = 0;

        // Ensure canvas dimensions are available
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;

        do {
            attempts++;
            initialRadius = getRandomInt(12, 18);
            // Ensure spawn is within bounds, considering radius
            safeX = getRandomInt(0, canvasWidth);
            safeY = getRandomInt(0, canvasHeight);
            isSafe = true;

            // Check vs other players
            for (const player of players) {
                if (player === this || player.isEaten || player.cells.length === 0) continue;
                for (const cell of player.cells) {
                    const dSq = distanceSq(safeX, safeY, cell.x, cell.y);
                    const minSafeDistSq = (cell.radius + initialRadius + SPAWN_SAFETY_BUFFER) ** 2;
                    if (dSq < minSafeDistSq) {
                        isSafe = false; break;
                    }
                }
                if (!isSafe) break;
            }

            // Check vs viruses
            if (isSafe) {
                for (const virus of viruses) {
                    const dSq = distanceSq(safeX, safeY, virus.x, virus.y);
                    const minSafeDistSq = (virus.radius + initialRadius + SPAWN_SAFETY_BUFFER) ** 2;
                    if (dSq < minSafeDistSq) {
                        isSafe = false; break;
                    }
                }
            }

        } while (!isSafe && attempts < MAX_SPAWN_ATTEMPTS);

        if (!isSafe) {
            const reason = `LogicalPlayer ${this.name}: Could not find a safe spawn location after ${attempts} attempts. Map too crowded.`;
            console.warn(reason);
            // Avoid immediate reset if game hasn't fully started or is already resetting
            if (isGameRunning && !isResettingGame) {
                 triggerGameReset(reason);
            }
            return; // Prevent cell creation if no safe spot
        } else {
            const initialCell = new PlayerCell(safeX, safeY, initialRadius, this);
            this.addCell(initialCell);
            this.calculateTotalMass(); // Calculate mass after adding the cell
        }
    }

    addCell(cell) {
        this.cells.push(cell);
        // Don't calculate mass here, do it explicitly or in calculateTotalMass
    }

    removeCell(cellToRemove) {
        const index = this.cells.indexOf(cellToRemove);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
        this.calculateTotalMass(); // Recalculate after removal

        // Check if player is now dead
        if (this.cells.length === 0 && !this.isEaten && !this.isSplitting) {
             this.markAsEaten();
        }
    }


    findLargestCellMass() {
        if (this.cells.length === 0) return 0;
        return this.cells.reduce((maxMass, cell) => Math.max(maxMass, cell.mass), 0);
    }

    calculateTotalMass() {
        this.totalMass = this.cells.reduce((sum, cell) => sum + cell.mass, 0);
    }

    findCenterOfMass() {
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;
        if (this.cells.length === 0 || this.totalMass <= 0) return { x: canvasWidth / 2, y: canvasHeight / 2 };

        let totalX = 0, totalY = 0;
        this.cells.forEach(cell => {
            totalX += cell.x * cell.mass;
            totalY += cell.y * cell.mass;
        });

        // Avoid division by zero if totalMass somehow became zero with cells present
        const centerX = this.totalMass > 0 ? totalX / this.totalMass : (this.cells[0]?.x || canvasWidth / 2);
        const centerY = this.totalMass > 0 ? totalY / this.totalMass : (this.cells[0]?.y || canvasHeight / 2);
        return { x: centerX, y: centerY };
    }

    // --- ADVANCED AI DECISION MAKING ---
    findAITarget() {
        this.aiUpdateCooldown = this.aiUpdateInterval; // Reset cooldown

        if (this.cells.length === 0) {
            this.aiTarget = null;
            return;
        }

        const center = this.findCenterOfMass();
        const viewRadius = 50 + Math.sqrt(this.totalMass*5); // Dynamic view radius based on mass
        this.currentViewRadius = viewRadius;
        const viewRadiusSq = viewRadius * viewRadius;

        // Perception variables
        let nearestFood = null, minDistFoodSq = viewRadiusSq * 1.2;
        let nearestThreatPlayerCenter = null, minDistThreatSq = Infinity;
        // let nearestPreyPlayerCenter = null, minDistPreySq = viewRadiusSq; // REMOVED - Replaced by targetLargestPreyCell logic
        let targetLargestPreyCell = null; // ADDED: Stores the best eligible prey cell
        let maxEligiblePreyMass = 0;      // ADDED: Tracks the mass of the best eligible prey cell
        let nearestSafeVirus = null, minDistSafeVirusSq = viewRadiusSq * 0.5;
        let nearestOpportunityTarget = null, minDistOpportunitySq = viewRadiusSq;
        let nearestThreatToMyFragmentsCenter = null, minDistThreatToFragSq = viewRadiusSq;
        let targetVulnerableCell = null;
        let nearestDangerousVirus = null, minDistDangerousVirusSq = viewRadiusSq * 0.3;
        let targetToFeedVirus = null;
        let virusToFeed = null;
        let isHighPriorityFeed = false;
        let minDistToFeedableTargetSq = viewRadiusSq * (FEED_VIRUS_RANGE_FACTOR ** 2);

        const largestOwnCell = this.getLargestCell();
        if (!largestOwnCell) return; // Safety check
        const largestOwnCellMass = largestOwnCell.mass;
        const largestOwnCellRadius = largestOwnCell.radius;
        const ownSplitState = this.isSplitState();

        const canBeSplitMassThreshold = virusRadius * virusRadius * Math.PI * virusSplitMassThresholdMultiplier;
        const isSmallEnoughToHide = largestOwnCellMass < canBeSplitMassThreshold * 0.95;
        const isBigEnoughToSplit = largestOwnCellMass > canBeSplitMassThreshold;

        let foundUnblockedThreat = false;

        // --- Perception Loop (Other Players) ---
        for (const other of players) {
            if (other === this || other.isEaten || other.cells.length === 0) continue;

            const otherCenter = other.findCenterOfMass();
            const dSqToCenter = distanceSq(center.x, center.y, otherCenter.x, otherCenter.y);

            if (dSqToCenter < viewRadiusSq) { // Player is in view
                const largestOtherCell = other.getLargestCell(); // Get the other player's largest cell
                if (!largestOtherCell) continue; // Skip if other player has no cells somehow

                const largestOtherCellMass = largestOtherCell.mass; // Use specific cell mass
                const otherLargestRadius = largestOtherCell.radius; // Use specific cell radius
                const otherSplitState = other.isSplitState();
                let isVirusBlockingThisThreat = false;
                let specificBlockingVirus = null;

                // --- A: Threat Assessment ---
                if (largestOwnCellMass > 0 && largestOtherCellMass / largestOwnCellMass > 1.25) { // Is 'other' a threat? (Based on largest cells)
                    const isThreatBigEnoughToSplit = largestOtherCellMass > canBeSplitMassThreshold * 1.1;

                    // A1: Check for Blocking Virus (if hiding is viable)
                    if (isSmallEnoughToHide && isThreatBigEnoughToSplit) {
                        for (const virus of viruses) {
                            // Simplified line check (center-virus-center)
                            const distSqAtoV = distanceSq(center.x, center.y, virus.x, virus.y);
                            const distSqVtoT = distanceSq(virus.x, virus.y, otherCenter.x, otherCenter.y);
                            if (distSqAtoV + distSqVtoT < dSqToCenter * 1.3) { // Check if virus is roughly between
                                // More precise line distance check (optional, for accuracy)
                                const Ax = center.x, Ay = center.y, Tx = otherCenter.x, Ty = otherCenter.y, Vx = virus.x, Vy = virus.y;
                                const dx = Tx - Ax, dy = Ty - Ay; const lineLenSq = dx*dx + dy*dy;
                                let distSqToLine = Infinity;
                                if (lineLenSq > 0.01) {
                                    const t = ((Vx - Ax) * dx + (Vy - Ay) * dy) / lineLenSq;
                                    if (t >= -0.1 && t <= 1.1) { // Check projection is near segment
                                        distSqToLine = distanceSq(Vx, Vy, Ax + t * dx, Ay + t * dy);
                                    }
                                } else { distSqToLine = distSqAtoV; }
                                if (distSqToLine < (virus.radius * 2.0) ** 2) { // Virus close to line
                                    isVirusBlockingThisThreat = true;
                                    specificBlockingVirus = virus;
                                    break;
                                }
                            }
                        }
                    }

                    // A2: Evaluate Flee Distance (if NOT blocked)
                    // Use distance between largest cells for flee trigger
                    const dSqLargestCells = distanceSq(largestOwnCell.x, largestOwnCell.y, largestOtherCell.x, largestOtherCell.y);
                    const edgeTriggerDistSq = (largestOwnCellRadius + otherLargestRadius + FLEE_EDGE_DISTANCE_THRESHOLD) ** 2;
                    if (!isVirusBlockingThisThreat) {
                         foundUnblockedThreat = true;
                         // Trigger flee based on distance between largest cells or centers, whichever is smaller
                         const effectiveThreatDistSq = Math.min(dSqLargestCells, dSqToCenter);
                         if (effectiveThreatDistSq < edgeTriggerDistSq && effectiveThreatDistSq < minDistThreatSq) {
                            minDistThreatSq = effectiveThreatDistSq;
                            nearestThreatPlayerCenter = otherCenter; // Still flee from center for simplicity
                         }
                    }

                    // --- B: Feeding Opportunity Assessment ---
                    const canFeed = AI_CAN_FEED_VIRUS && largestOwnCellMass >= MIN_MASS_TO_FEED_VIRUS && !ownSplitState;
                    // Use distance between largest cells for feed trigger proximity
                    const feedEdgeTriggerDistSq = (largestOwnCellRadius + otherLargestRadius + FEED_EDGE_PROXIMITY_THRESHOLD) ** 2;
                    const isInCenterRange = dSqToCenter < minDistToFeedableTargetSq; // Keep center range check
                    const areEdgesClose = dSqLargestCells < feedEdgeTriggerDistSq; // Check edge proximity
                    const isValidFeedTarget = largestOtherCellMass > canBeSplitMassThreshold * 1.1 &&
                                        largestOtherCellMass > largestOwnCellMass * 0.7 &&
                                        largestOtherCellMass < largestOwnCellMass * FEED_TARGET_MAX_MASS_FACTOR &&
                                        (isInCenterRange || areEdgesClose);

                    if (canFeed && isValidFeedTarget) {
                        // B1: High Priority Feed (Blocked Threat)
                        if (isVirusBlockingThisThreat && specificBlockingVirus) {
                            const dSqLargestToBlockingVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, specificBlockingVirus.x, specificBlockingVirus.y);
                            const minSafeDistSq = (largestOwnCell.radius + specificBlockingVirus.radius + 5)**2;
                            if (dSqLargestToBlockingVirus > minSafeDistSq && dSqToCenter < minDistToFeedableTargetSq) {
                                targetToFeedVirus = otherCenter;
                                virusToFeed = specificBlockingVirus;
                                isHighPriorityFeed = true;
                                minDistToFeedableTargetSq = dSqToCenter;
                            }
                        }
                        // B2: Regular Feed (Unblocked Threat, Suitable Virus)
                        else if (!isHighPriorityFeed && virusToFeed == null) {
                            for (const virus of viruses) {
                                if (isVirusBlockingThisThreat && virus === specificBlockingVirus) continue; // Skip already checked blocker

                                const dSqLargestToVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y);
                                const minSafeDistSq = (largestOwnCell.radius + virus.radius + 15)**2;
                                const isInRangeToShoot = dSqLargestToVirus < viewRadiusSq * (FEED_VIRUS_RANGE_FACTOR**2) * 0.9;

                                if (dSqLargestToVirus > minSafeDistSq && isInRangeToShoot) { // Safe & in range
                                    // --- NEW: Check if the line segment from AI center to Target center intersects the virus circle ---
                                    const Ax = center.x, Ay = center.y;
                                    const Tx = otherCenter.x, Ty = otherCenter.y;
                                    const Vx = virus.x, Vy = virus.y;
                                    const virusRadiusSq = virus.radius * virus.radius;
                                    let intersectsVirus = false;

                                    const dx = Tx - Ax;
                                    const dy = Ty - Ay;
                                    const segmentLenSq = dx * dx + dy * dy;

                                    if (segmentLenSq < 0.001) { // AI and Target are basically at the same point
                                        intersectsVirus = distanceSq(Ax, Ay, Vx, Vy) <= virusRadiusSq;
                                    } else {
                                        // Project virus center onto the line defined by A and T
                                        const t = ((Vx - Ax) * dx + (Vy - Ay) * dy) / segmentLenSq;

                                        let closestX, closestY;
                                        if (t < 0) { // Closest point on line is A
                                            closestX = Ax; closestY = Ay;
                                        } else if (t > 1) { // Closest point on line is T
                                            closestX = Tx; closestY = Ty;
                                        } else { // Closest point is on the segment AT
                                            closestX = Ax + t * dx;
                                            closestY = Ay + t * dy;
                                        }

                                        // Check distance from virus center to the closest point on the segment
                                        const distSqToClosestPointOnSegment = distanceSq(Vx, Vy, closestX, closestY);

                                        if (distSqToClosestPointOnSegment <= virusRadiusSq) {
                                            intersectsVirus = true;
                                        }
                                    }
                                    // --- END NEW ---

                                    // Check distance from target's *largest cell* to virus (Keep this check)
                                    const distSqTargetLargestToVirus = distanceSq(largestOtherCell.x, largestOtherCell.y, Vx, Vy);
                                    const isTargetEdgeNear = distSqTargetLargestToVirus < (virus.radius + otherLargestRadius * 0.8) ** 2;

                                    // Use the new intersection check instead of isVirusOnLine
                                    if (intersectsVirus && isTargetEdgeNear && dSqToCenter < minDistToFeedableTargetSq) {
                                        targetToFeedVirus = otherCenter;
                                        virusToFeed = virus;
                                        minDistToFeedableTargetSq = dSqToCenter;
                                        break; // Found suitable regular virus
                                    }
                                }
                            } // End regular virus search
                        } // End regular feed check
                    } // End master feed check
                } // End Threat Check

                // --- C: Other Assessments (Prey, Opportunity, Fragment Threats) ---
                if (virusToFeed == null && nearestThreatPlayerCenter == null) { // Only if not fleeing or feeding

                    // MODIFIED: Check Prey - Target largest cell < 70% own mass
                    if (largestOwnCellMass > largestOtherCellMass / 0.7) { // Check if other's largest cell is eligible prey
                        const dSqToLargestOtherCell = distanceSq(largestOwnCell.x, largestOwnCell.y, largestOtherCell.x, largestOtherCell.y);
                        if (dSqToLargestOtherCell < viewRadiusSq*2) { // Check if the specific cell is in view range
                            if (largestOtherCellMass > maxEligiblePreyMass) { // Is this the largest eligible prey cell found so far?
                                maxEligiblePreyMass = largestOtherCellMass;
                                targetLargestPreyCell = largestOtherCell; // Target this specific cell
                            }
                        }
                    }

                    // Check Opportunity (Small cells of split player) - Keep this for now
                    if (otherSplitState) {
                         for (const otherCell of other.cells) {
                             if (largestOwnCellMass > otherCell.mass * 1.15) {
                                 const dSqToOtherCell = distanceSq(largestOwnCell.x, largestOwnCell.y, otherCell.x, otherCell.y);
                                 // Prioritize closer opportunities, but maybe less than the largest prey cell target
                                 if (dSqToOtherCell < minDistOpportunitySq && (!targetLargestPreyCell || dSqToOtherCell < distanceSq(largestOwnCell.x, largestOwnCell.y, targetLargestPreyCell.x, targetLargestPreyCell.y) * 0.8)) {
                                     minDistOpportunitySq = dSqToOtherCell;
                                     nearestOpportunityTarget = { x: otherCell.x, y: otherCell.y };
                                 }
                             }
                         }
                     }
                    // Check Threats to Own Fragments
                    if (ownSplitState) {
                        const vulnerableResult = this.findNearestVulnerableCellToThreat(otherCenter, largestOtherCellMass);
                        if (vulnerableResult.cell) {
                            const threatToFragDistSq = (otherLargestRadius * 1.5)**2;
                            if (vulnerableResult.distSq < threatToFragDistSq && vulnerableResult.distSq < minDistThreatToFragSq) {
                                minDistThreatToFragSq = vulnerableResult.distSq;
                                nearestThreatToMyFragmentsCenter = otherCenter;
                                targetVulnerableCell = vulnerableResult.cell;
                            }
                        }
                    }
                } // End Other Assessments Check
            } // End Player in View Check
        } // --- End Player Perception Loop ---

        // --- Check Food (If no better targets) ---
        // MODIFIED: Check food only if no threat, no feed target, AND no largest prey cell target
        if (virusToFeed == null && nearestThreatPlayerCenter == null && targetLargestPreyCell == null && nearestOpportunityTarget == null) {
            for (const food of foods) {
                 const dSq = distanceSq(largestOwnCell.x, largestOwnCell.y, food.x, food.y);
                 if (dSq < viewRadiusSq && dSq < minDistFoodSq) {
                     minDistFoodSq = dSq;
                     nearestFood = food;
                 }
            }
        }

        // --- Check Viruses (Hiding/Avoiding) ---
        if (isBigEnoughToSplit) { // Avoid if large
             for (const virus of viruses) {
                 if (virus === virusToFeed) continue;
                 const dSq = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y);
                 const dangerDistSq = (largestOwnCellRadius + virus.radius + 10)**2;
                 if (dSq < dangerDistSq && dSq < minDistDangerousVirusSq) {
                     minDistDangerousVirusSq = dSq;
                     nearestDangerousVirus = virus;
                 }
             }
         } else if (foundUnblockedThreat) { // Hide if small and fleeing
             for (const virus of viruses) {
                 const dSqCenterToVirus = distanceSq(center.x, center.y, virus.x, virus.y);
                 if (dSqCenterToVirus < viewRadiusSq * 0.8 && dSqCenterToVirus < minDistSafeVirusSq) {
                    const dSqLargestToSafeVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y);
                    if (dSqLargestToSafeVirus > (largestOwnCellRadius + virus.radius + 5)**2) { // Ensure not too close
                        minDistSafeVirusSq = dSqCenterToVirus;
                        nearestSafeVirus = virus;
                    }
                 }
             }
         }

        // --- FINAL DECISION MAKING (Priority Order) ---

        // 1. Fleeing
        if (nearestThreatPlayerCenter) {
            const EDGE_FLEE_THRESHOLD = largestOwnCellRadius * 1.5; // How close to edge to trigger alternative flee
            const canvasWidth = canvas ? canvas.width : 800;
            const canvasHeight = canvas ? canvas.height : 600;
            let isNearEdge = false;
            let pushDirectionX = center.x - nearestThreatPlayerCenter.x;
            let pushDirectionY = center.y - nearestThreatPlayerCenter.y;
            const pushMagnitude = Math.sqrt(pushDirectionX * pushDirectionX + pushDirectionY * pushDirectionY);
            if (pushMagnitude > 0.1) {
                pushDirectionX /= pushMagnitude; // Normalized direction AI is being pushed
                pushDirectionY /= pushMagnitude;
            }

            // Check proximity to edges and if being pushed towards them
            if ((largestOwnCell.x < EDGE_FLEE_THRESHOLD && pushDirectionX < -0.5) || // Near left edge, pushed left
                (largestOwnCell.x > canvasWidth - EDGE_FLEE_THRESHOLD && pushDirectionX > 0.5) || // Near right edge, pushed right
                (largestOwnCell.y < EDGE_FLEE_THRESHOLD && pushDirectionY < -0.5) || // Near top edge, pushed up
                (largestOwnCell.y > canvasHeight - EDGE_FLEE_THRESHOLD && pushDirectionY > 0.5)) // Near bottom edge, pushed down
            {
                isNearEdge = true;
            }

            // A. Try Hiding First (if applicable and near edge or not)
            if (isSmallEnoughToHide && nearestSafeVirus) {
                const distToVirusSq = minDistSafeVirusSq;
                const distToThreatSq = minDistThreatSq;
                 if (distToVirusSq < distToThreatSq * 1.2) { // Prioritize hiding if virus is reasonably close
                     const vX = nearestSafeVirus.x - center.x, vY = nearestSafeVirus.y - center.y;
                     const tX = center.x - nearestThreatPlayerCenter.x, tY = center.y - nearestThreatPlayerCenter.y;
                     // Check if virus is generally away from the threat direction
                     if (vX * tX + vY * tY > 0) {
                         this.aiTarget = { x: nearestSafeVirus.x, y: nearestSafeVirus.y, type: 'hiding' }; return;
                     }
                 }
            }

            // B. Edge Flee Logic (if hiding wasn't chosen and near edge)
            if (isNearEdge) {
                const fleeAngle = Math.atan2(pushDirectionY, pushDirectionX); // Angle AI is being pushed
                const angle1 = fleeAngle + Math.PI / 2; // Perpendicular direction 1
                const angle2 = fleeAngle - Math.PI / 2; // Perpendicular direction 2
                const fleeDistance = viewRadius * 0.8; // Flee distance along the edge

                const target1X = center.x + Math.cos(angle1) * fleeDistance;
                const target1Y = center.y + Math.sin(angle1) * fleeDistance;
                const target2X = center.x + Math.cos(angle2) * fleeDistance;
                const target2Y = center.y + Math.sin(angle2) * fleeDistance;

                // Simple check: which target is further from the center of the canvas?
                // This tends to move away from corners.
                const distSqToCenter1 = distanceSq(target1X, target1Y, canvasWidth / 2, canvasHeight / 2);
                const distSqToCenter2 = distanceSq(target2X, target2Y, canvasWidth / 2, canvasHeight / 2);

                let chosenTargetX, chosenTargetY;
                if (distSqToCenter1 >= distSqToCenter2) { // Prefer target further from center
                    chosenTargetX = target1X;
                    chosenTargetY = target1Y;
                } else {
                    chosenTargetX = target2X;
                    chosenTargetY = target2Y;
                }

                // Clamp chosen target to canvas bounds (with a small buffer)
                chosenTargetX = Math.max(largestOwnCellRadius, Math.min(chosenTargetX, canvasWidth - largestOwnCellRadius));
                chosenTargetY = Math.max(largestOwnCellRadius, Math.min(chosenTargetY, canvasHeight - largestOwnCellRadius));

                this.aiTarget = { x: chosenTargetX, y: chosenTargetY, type: 'edgeFleeing' };
                return; // Exit after setting edge flee target
            }

            // C. Default Flee (if not hiding and not edge fleeing)
            const fleeAngle = Math.atan2(center.y - nearestThreatPlayerCenter.y, center.x - nearestThreatPlayerCenter.x);
            const fleeDistance = viewRadius * 1.1;
            let fleeTargetX = center.x + Math.cos(fleeAngle) * fleeDistance;
            let fleeTargetY = center.y + Math.sin(fleeAngle) * fleeDistance;
            // Clamp slightly outside bounds to encourage moving away
            fleeTargetX = Math.max(-50, Math.min(fleeTargetX, canvasWidth + 50));
            fleeTargetY = Math.max(-50, Math.min(fleeTargetY, canvasHeight + 50));
            this.aiTarget = { x: fleeTargetX, y: fleeTargetY, type: 'fleeing' }; return;
        }

        // 2. Avoid Dangerous Virus
        if (nearestDangerousVirus) {
            const avoidAngle = Math.atan2(largestOwnCell.y - nearestDangerousVirus.y, largestOwnCell.x - nearestDangerousVirus.x);
            let targetX = largestOwnCell.x + Math.cos(avoidAngle) * largestOwnCellRadius * 1.5;
            let targetY = largestOwnCell.y + Math.sin(avoidAngle) * largestOwnCellRadius * 1.5;
            targetX = Math.max(largestOwnCellRadius, Math.min(targetX, canvas.width - largestOwnCellRadius));
            targetY = Math.max(largestOwnCellRadius, Math.min(targetY, canvas.height - largestOwnCellRadius));
            this.aiTarget = { x: targetX, y: targetY, type: 'avoidingVirus' }; return;
        }

        // --- MODIFIED: 3. Proximity Virus Feeding (No Target Needed) ---
        const MIN_FEED_MASS_ABSOLUTE = 20;
        const canFeedNow = AI_CAN_FEED_VIRUS &&
                        largestOwnCell.mass >= MIN_MASS_TO_FEED_VIRUS &&
                        !ownSplitState &&
                        this.aiFeedVirusCooldown <= 0 &&
                        virusToFeed == null; // ADDED: Only do proximity feed if no targeted feed is planned

        if (canFeedNow) {
            let bestDirectionalVirus = null;
            let maxDotProduct = -1.1; // Start below possible dot product range [-1, 1]
            const safeDistSqThreshold = (largestOwnCellRadius + virusRadius + 15)**2;
            const maxDistSqThreshold = (largestOwnCellRadius + virusRadius + 100)**2; // Don't feed viruses too far away

            // Determine intended direction (if AI has a target)
            let targetDirX = 0, targetDirY = 0, hasTargetDirection = false;
            if (this.aiTarget) {
                const dxTarget = this.aiTarget.x - largestOwnCell.x;
                const dyTarget = this.aiTarget.y - largestOwnCell.y;
                const distTargetSq = dxTarget * dxTarget + dyTarget * dyTarget;
                if (distTargetSq > 1) {
                    const distTarget = Math.sqrt(distTargetSq);
                    targetDirX = dxTarget / distTarget;
                    targetDirY = dyTarget / distTarget;
                    hasTargetDirection = true;
                }
            }

            for (const virus of viruses) {
                const dSqLargestToVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y);

                // Check if virus is within safe and reasonable feeding distance
                if (dSqLargestToVirus > safeDistSqThreshold && dSqLargestToVirus < maxDistSqThreshold) {

                    // If AI has no specific target, any close virus is potentially valid (original behavior)
                    if (!hasTargetDirection) {
                         // Simple proximity check (choose the absolute closest in range)
                         // Note: This part might need refinement if you want wandering AI to feed more strategically.
                         // For now, it picks the closest valid one.
                         if (bestDirectionalVirus === null || dSqLargestToVirus < distanceSq(largestOwnCell.x, largestOwnCell.y, bestDirectionalVirus.x, bestDirectionalVirus.y)) {
                             bestDirectionalVirus = virus;
                         }
                         continue; // Skip dot product check if no target direction
                    }

                    // Calculate direction to virus
                    const dxVirus = virus.x - largestOwnCell.x;
                    const dyVirus = virus.y - largestOwnCell.y;
                    const distVirus = Math.sqrt(dSqLargestToVirus);
                    const virusDirX = dxVirus / distVirus;
                    const virusDirY = dyVirus / distVirus;

                    // Calculate dot product
                    const dotProduct = targetDirX * virusDirX + targetDirY * virusDirY;

                    // Check if this virus is more aligned with the target direction than previous best
                    // Use a threshold (e.g., > 0.5) to ensure it's generally in the right direction
                    const DOT_PRODUCT_THRESHOLD = 0.6; // Virus must be somewhat in front (adjust as needed)
                    if (dotProduct > DOT_PRODUCT_THRESHOLD && dotProduct > maxDotProduct) {
                        maxDotProduct = dotProduct;
                        bestDirectionalVirus = virus;
                    }
                }
            } // End virus loop for proximity check

            // Feed the best virus found (if any)
            if (bestDirectionalVirus) {
                const feedMassCost = largestOwnCell.mass * 0.05; // Calculate 5% cost

                // Check if 5% cost is meaningful and doesn't make cell too small
                if (feedMassCost >= MIN_FEED_MASS_ABSOLUTE && largestOwnCell.mass - feedMassCost > playerSplitMinMassPerPiece * 0.5) {
                    if (Math.random() < AI_FEED_VIRUS_PROBABILITY) { // Still keep the probability check
                        // Execute feed & split
                        bestDirectionalVirus.triggerFlash();

                        feedPellets.push(new FeedPellet(largestOwnCell.x, largestOwnCell.y, bestDirectionalVirus.x, bestDirectionalVirus.y, PELLET_RADIUS, this.color));

                        largestOwnCell.setMass(largestOwnCell.mass - feedMassCost);
                        this.calculateTotalMass();

                        // Split the virus away from the feeding cell (or towards target if preferred)
                        const splitAngle = Math.atan2(bestDirectionalVirus.y - largestOwnCell.y, bestDirectionalVirus.x - largestOwnCell.x);
                        // Option 2: Split towards AI target (if it exists)
                        // const splitAngle = hasTargetDirection ? Math.atan2(targetDirY, targetDirX) : Math.atan2(bestDirectionalVirus.y - largestOwnCell.y, bestDirectionalVirus.x - largestOwnCell.x);

                        // REMOVED: Spawn a new virus moving in the calculated direction (original virus remains)
                        // const splitTargetX = bestDirectionalVirus.x + Math.cos(splitAngle) * 100;
                        // const splitTargetY = bestDirectionalVirus.y + Math.sin(splitAngle) * 100;
                        // spawnNewVirusAt(bestDirectionalVirus.x, bestDirectionalVirus.y, splitTargetX, splitTargetY);

                        // --- ADDED: Make the existing virus move ---
                        const burstSpeed = virusRadius * 0.4; // Use the same speed as spawnNewVirusAt
                        bestDirectionalVirus.vx = Math.cos(splitAngle) * burstSpeed;
                        bestDirectionalVirus.vy = Math.sin(splitAngle) * burstSpeed;
                        // --- END ADDED ---

                        // Set cooldown and force re-evaluation
                        this.aiFeedVirusCooldown = AI_FEED_VIRUS_COOLDOWN_DURATION;
                        this.aiTarget = null;
                        this.aiUpdateCooldown = 0;
                        return; // Feeding takes priority
                    }
                }
            }
        }
        // --- END NEW FEEDING LOGIC ---

        // --- MODIFIED: 4. Execute Targeted Virus Feeding ---
        // Note: Priority is now lower than proximity feeding due to reordering
        if (virusToFeed && targetToFeedVirus) {
            const feedMassCost = largestOwnCell.mass * 0.05; // Calculate 5% cost
            // Check if cell has enough mass and the cost is meaningful
            if (largestOwnCell.mass >= MIN_MASS_TO_FEED_VIRUS && feedMassCost >= MIN_FEED_MASS_ABSOLUTE && largestOwnCell.mass - feedMassCost > playerSplitMinMassPerPiece * 0.5) {
                virusToFeed.triggerFlash(); // Keep flash

                // Create pellet (optional visual)
                feedPellets.push(new FeedPellet(largestOwnCell.x, largestOwnCell.y, virusToFeed.x, virusToFeed.y, PELLET_RADIUS, this.color));

                // Reduce mass
                largestOwnCell.setMass(largestOwnCell.mass - feedMassCost);
                this.calculateTotalMass();

                // --- Directly trigger split towards target ---
                // REMOVED: Remove original virus
                // const index = viruses.indexOf(virusToFeed);
                // if (index > -1) {
                //     viruses.splice(index, 1); // Remove original
                //     // Spawn a new virus moving towards the target player's center
                //     spawnNewVirusAt(virusToFeed.x, virusToFeed.y, targetToFeedVirus.x, targetToFeedVirus.y);
                // }

                // --- ADDED: Make the existing virus move towards target ---
                const angle = Math.atan2(targetToFeedVirus.y - virusToFeed.y, targetToFeedVirus.x - virusToFeed.x);
                const burstSpeed = virusRadius * 0.4; // Use the same speed as spawnNewVirusAt
                virusToFeed.vx = Math.cos(angle) * burstSpeed;
                virusToFeed.vy = Math.sin(angle) * burstSpeed;
                // --- END ADDED ---

                // --- End split trigger ---
            }
            // Force re-evaluation even if feed didn't happen (target might become invalid)
            this.aiTarget = null;
            this.aiUpdateCooldown = 0;
            return;
        }

        // 4. Protect Fragments
        if (ownSplitState && nearestThreatToMyFragmentsCenter && targetVulnerableCell) {
            this.aiTarget = { x: targetVulnerableCell.x, y: targetVulnerableCell.y, type: 'protecting' }; return;
        }

        // 5. Hunt Largest Eligible Prey Cell (NEW)
        if (targetLargestPreyCell) {
            this.aiTarget = { x: targetLargestPreyCell.x, y: targetLargestPreyCell.y, type: 'huntingLargestPreyCell' }; return;
        }

        // 6. Hunt Opportunity Target (Existing, now lower priority than largest prey)
        if (nearestOpportunityTarget) {
            this.aiTarget = { x: nearestOpportunityTarget.x, y: nearestOpportunityTarget.y, type: 'opportunisticHunt' }; return;
        }

        // 7. Hunt Regular Prey (REMOVED - Replaced by huntingLargestPreyCell)
        // if (nearestPreyPlayerCenter) {
        //     this.aiTarget = { x: nearestPreyPlayerCenter.x, y: nearestPreyPlayerCenter.y, type: 'hunting' }; return;
        // }

        // 8. Seek Food (Now priority 7)
        if (nearestFood) {
            this.aiTarget = { x: nearestFood.x, y: nearestFood.y, type: 'seekingFood' }; return;
        }

        // 9. Assist Merging (Now priority 8)
        if (ownSplitState && this.cells.length > 1) {
            const ownCenter = this.findCenterOfMass();
            this.aiTarget = { x: ownCenter.x, y: ownCenter.y, type: 'mergingAssist' }; return;
        }

        if (!this.aiTarget || (this.aiTarget.type !== 'fleeing' && this.aiTarget.type !== 'edgeFleeing' && this.aiTarget.type !== 'avoidingVirus' && this.aiTarget.type !== 'protecting' && this.aiTarget.type !== 'huntingLargestPreyCell' && this.aiTarget.type !== 'opportunisticHunt' && this.aiTarget.type !== 'seekingFood' && this.aiTarget.type !== 'mergingAssist')) {
            this.aiTarget = null; // Explicitly set to null if no action decided
       }
    } // --- End of findAITarget ---

    getLargestCell() {
        if (this.cells.length === 0) return null;
        return this.cells.reduce((largest, cell) => (cell.mass > largest.mass ? cell : largest), this.cells[0]);
    }

    findLargestCellRadius() {
        const largestCell = this.getLargestCell();
        return largestCell ? largestCell.radius : 0;
    }

    checkForMerges() {
        for (let i = this.cells.length - 1; i > 0; i--) {
            for (let j = i - 1; j >= 0; j--) {
                if (i >= this.cells.length || j >= this.cells.length) continue;
                const cellA = this.cells[i]; const cellB = this.cells[j];
                if (!cellA || !cellB) continue;

                if (cellA.canMerge && cellB.canMerge) {
                    const dSq = distanceSq(cellA.x, cellA.y, cellB.x, cellB.y);
                    const mergeDist = (cellA.radius + cellB.radius) * MERGE_OVERLAP_FACTOR;
                    if (dSq < mergeDist * mergeDist) {
                        const bigger = cellA.mass >= cellB.mass ? cellA : cellB;
                        const smaller = cellA.mass < cellB.mass ? cellA : cellB;
                        bigger.setMass(bigger.mass + smaller.mass);
                        bigger.resetMergeTimer();
                        this.removeCell(smaller);
                        if (smaller === cellA) break; // Exit inner loop if A was removed
                    }
                }
            }
        }
    }

    splitCell(cellToSplit) {
        if (!this.cells.includes(cellToSplit) || this.isSplitting || this.isEaten) return;
        const numPieces = Math.min(playerSplitPieces, Math.max(2, Math.floor(cellToSplit.mass / playerSplitMinMassPerPiece)));
        if (numPieces < 2 || cellToSplit.mass <= 0) return;
        const massPerPiece = cellToSplit.mass / numPieces;
        if (massPerPiece <= 0) return;
        const radiusPerPiece = Math.sqrt(massPerPiece / Math.PI);

        this.isSplitting = true;
        const splitX = cellToSplit.x; const splitY = cellToSplit.y;
        const originalRadius = cellToSplit.radius;
        this.removeCell(cellToSplit);

        const newCells = [];
        for (let k = 0; k < numPieces; k++) {
            const angle = (k / numPieces) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const burstMagnitude = originalRadius * 0.1 + Math.random() * playerSplitBurstSpeed;
            const offsetX = Math.cos(angle) * (radiusPerPiece * 0.5 + 1);
            const offsetY = Math.sin(angle) * (radiusPerPiece * 0.5 + 1);
            let newX = splitX + offsetX; let newY = splitY + offsetY;
            newX = Math.max(radiusPerPiece, Math.min(newX, canvas.width - radiusPerPiece));
            newY = Math.max(radiusPerPiece, Math.min(newY, canvas.height - radiusPerPiece));

            const newPiece = new PlayerCell(newX, newY, radiusPerPiece, this);
            newPiece.setMass(massPerPiece);
            newPiece.vx = Math.cos(angle) * burstMagnitude;
            newPiece.vy = Math.sin(angle) * burstMagnitude;
            newPiece.resetMergeTimer();
            newCells.push(newPiece);
        }
        this.cells.push(...newCells);
        this.isSplitting = false;
        this.calculateTotalMass();
    }

    // --- Intra-player physics (Optional, keep if needed) ---
    applyIntraPlayerRepulsion() {
        if (!INTRA_PLAYER_REPULSION_ENABLED || this.cells.length < 2) return;
        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cellA = this.cells[i]; const cellB = this.cells[j];
                if (!cellA || !cellB || (cellA.canMerge && cellB.canMerge)) continue;

                const dx = cellB.x - cellA.x; const dy = cellB.y - cellA.y;
                const distSq = dx * dx + dy * dy;
                const effectiveDist = (cellA.radius + cellB.radius) * REPULSION_EFFECTIVE_DISTANCE_FACTOR;

                if (distSq < effectiveDist * effectiveDist && distSq > 0.001) {
                    const distance = Math.sqrt(distSq);
                    const proximity = Math.max(0, 1 - (distance / effectiveDist));
                    let forceMagnitude = REPULSION_FORCE_MULTIPLIER * proximity * proximity;

                    const minMergeTimer = Math.min(cellA.mergeTimer, cellB.mergeTimer);
                    let timeFadeFactor = 1.0;
                    if (minMergeTimer <= REPULSION_FADE_WINDOW_MS && minMergeTimer > 0) {
                        const fadeProgress = 1.0 - (minMergeTimer / REPULSION_FADE_WINDOW_MS);
                        timeFadeFactor = 1.0 - fadeProgress * (1.0 - REPULSION_MIN_FORCE_FACTOR);
                        timeFadeFactor = Math.max(REPULSION_MIN_FORCE_FACTOR, timeFadeFactor);
                    } else if (minMergeTimer <= 0) {
                         timeFadeFactor = REPULSION_MIN_FORCE_FACTOR;
                    }
                    forceMagnitude *= timeFadeFactor;

                    const nx = dx / distance; const ny = dy / distance;
                    const accelerationFactor = forceMagnitude; // Simple application
                    cellB.vx += nx * accelerationFactor; cellB.vy += ny * accelerationFactor;
                    cellA.vx -= nx * accelerationFactor; cellA.vy -= ny * accelerationFactor;
                }
            }
        }
    }

    update(deltaTime) {
        if (this.isEaten) {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) this.respawn();
            return;
        }
        if (this.cells.length === 0 && !this.isSplitting) {
             this.markAsEaten(); return;
        }

        // 更新 AI 目標和餵食冷卻
        this.aiUpdateCooldown -= deltaTime;
        if (this.aiUpdateCooldown <= 0) this.findAITarget();
        if (this.aiFeedVirusCooldown > 0) this.aiFeedVirusCooldown -= deltaTime; // <--- 新增：更新冷卻

        // Apply repulsion before movement update
        this.applyIntraPlayerRepulsion();

        const currentTarget = this.aiTarget;
        this.cells.forEach(cell => cell.update(deltaTime, currentTarget));

        if (this.cells.length > 1) this.checkForMerges();

        this.calculateTotalMass(); // Ensure mass is consistent
    }


    draw() {
        const sortedCells = [...this.cells].sort((a, b) => a.radius - b.radius);
        sortedCells.forEach(cell => cell.draw());

        // --- ADD DEBUG DRAWING BLOCK HERE ---
        if (debug_draw_ai_view && this.currentViewRadius && this.currentViewRadius > 0 && !this.isEaten) {
            const center = this.findCenterOfMass();

            // Draw View Radius Circle
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // Semi-transparent yellow
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(center.x, center.y, this.currentViewRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();

            // Draw AI Target Line
            if (this.aiTarget) {
                 ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)'; // Semi-transparent magenta
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(center.x, center.y);
                 ctx.lineTo(this.aiTarget.x, this.aiTarget.y);
                 ctx.stroke();
                 ctx.closePath();
            }
        }
        // --- END DEBUG DRAWING BLOCK ---
    }

    markAsEaten() {
       if (!this.isEaten) {
           this.isEaten = true;
           this.respawnTimer = respawnDelay;
           this.cells = [];
           this.totalMass = 0;
       }
    }

    respawn() {
        this.isEaten = false;
        this.isSplitting = false;
        this.name = getNextName();
        this.color = getRandomColor();
        this.aiTarget = null;
        this.totalMass = 0;
        this.cells = [];
        this.createInitialCell();
    }
 }

class PlayerCell {
    constructor(x, y, radius, parentPlayer) {
        this.parentPlayer = parentPlayer;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.canMerge = false;
        this.mergeTimer = MERGE_COOLDOWN;
        this.mass = 0;
        this.radius = 0;
        this.setRadius(radius); // Init mass/radius via setter
    }

    setRadius(newRadius) {
        this.radius = Math.max(0, newRadius);
        this.mass = Math.PI * this.radius * this.radius;
    }

    setMass(newMass) {
        this.mass = Math.max(0, newMass);
        this.radius = this.mass > 0 ? Math.sqrt(this.mass / Math.PI) : 0;
    }

    setRadiusFromMass() { // Keep for clarity
        this.radius = this.mass > 0 ? Math.sqrt(this.mass / Math.PI) : 0;
    }

    calculateSpeed() {
        // Use global multiplier potentially set by WE
        return Math.max(0.2, cellBaseSpeedMultiplier - Math.log1p(this.radius * CELL_SPEED_MASS_FACTOR));
    }

    resetMergeTimer() {
        this.canMerge = false;
        this.mergeTimer = MERGE_COOLDOWN;
    }

    update(deltaTime, parentTarget) {
        if (this.mass <= 0 || !this.parentPlayer || this.parentPlayer.isEaten) {
            if (this.parentPlayer && !this.parentPlayer.isEaten) {
                this.parentPlayer.removeCell(this);
            }
            return;
        }

        if (!this.canMerge) {
             this.mergeTimer -= deltaTime;
             if (this.mergeTimer <= 0) this.canMerge = true;
        }

        const timeFactor = deltaTime / 16.67;
        const currentSpeed = this.calculateSpeed();
        let targetX, targetY;

        if (parentTarget) {
            targetX = parentTarget.x; targetY = parentTarget.y;
        } else {
            targetX = this.x + this.vx; targetY = this.y + this.vy; // Drift
        }

        const dx = targetX - this.x; const dy = targetY - this.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 1) { // Move towards target
            const angle = Math.atan2(dy, dx);
            const desiredVX = Math.cos(angle) * currentSpeed;
            const desiredVY = Math.sin(angle) * currentSpeed;
            const steerFactor = 0.1;
            this.vx += (desiredVX - this.vx) * steerFactor;
            this.vy += (desiredVY - this.vy) * steerFactor;
        }

        // Apply velocity and drag
        this.x += this.vx * timeFactor;
        this.y += this.vy * timeFactor;
        const dragFactor = 0.98;
        this.vx *= dragFactor; this.vy *= dragFactor;
        if (Math.abs(this.vx) < 0.01 && Math.abs(this.vy) < 0.01) { this.vx = 0; this.vy = 0; }

        // Boundary Clamp
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;
        this.x = Math.max(0, Math.min(this.x, canvasWidth));  // Clamp center X between 0 and width
        this.y = Math.max(0, Math.min(this.y, canvasHeight)); // Clamp center Y between 0 and height

        this.setRadiusFromMass(); // Ensure radius matches mass if changed externally
    }

    draw() {
        if (this.radius <= 0.5 || !this.parentPlayer) return;

        ctx.fillStyle = this.parentPlayer.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        const parentName = this.parentPlayer.name;
        if (parentName && this.radius > 15) {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const baseFontSize = this.radius * 0.4;
            const fontSize = Math.max(10, Math.min(baseFontSize, 24));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(1, fontSize * 0.1);
            ctx.strokeText(parentName, this.x, this.y);
            ctx.fillText(parentName, this.x, this.y);
        }
    }
}

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = foodRadius;
        this.color = getRandomColor();
        this.mass = Math.PI * this.radius * this.radius;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class Virus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = virusRadius;
        this.originalColor = virusColor;
        this.color = this.originalColor;
        this.mass = Math.PI * this.radius * this.radius;
        this.spikeLength = this.radius * 0.2;
        this.spikeCount = virusSpikeCount;
        this.vx = 0;
        this.vy = 0;
        this.isFlashing = false;
        this.flashTimer = 0;
        this.flashDuration = 150;
        this.flashColor = '#FFFFFF';
        this.flashInterval = 50;
        this._flashCycleTimer = 0;
    }

    triggerFlash() {
        if (!this.isFlashing) {
            this.isFlashing = true;
            this.flashTimer = this.flashDuration;
            this._flashCycleTimer = this.flashInterval;
            this.color = this.flashColor;
        }
    }

    draw() {
        const drawRadius = this.radius + this.spikeLength;
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;
        if (this.x + drawRadius < 0 || this.x - drawRadius > canvasWidth ||
            this.y + drawRadius < 0 || this.y - drawRadius > canvasHeight) {
            return; // Cull if off-screen
        }

        ctx.fillStyle = this.color; // Use potentially flashing color
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#2ca32c'; // Spikes always dark green
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.spikeCount; i++) {
            const angle = (i / this.spikeCount) * Math.PI * 2;
            const startX = this.x + Math.cos(angle) * this.radius * 0.9;
            const startY = this.y + Math.sin(angle) * this.radius * 0.9;
            const endX = this.x + Math.cos(angle) * (this.radius + this.spikeLength);
            const endY = this.y + Math.sin(angle) * (this.radius + this.spikeLength);
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
        }
        ctx.stroke();
    }

    splitTowards(targetX, targetY) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const burstSpeed = virusRadius * 0.3;
        const newRadius = virusRadius * 0.8;
        const offset = (this.radius + newRadius) * 0.5;
        let newX = this.x + Math.cos(angle) * offset;
        let newY = this.y + Math.sin(angle) * offset;
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;
        newX = Math.max(newRadius, Math.min(newX, canvasWidth - newRadius));
        newY = Math.max(newRadius, Math.min(newY, canvasHeight - newRadius));

        const newVirus = new Virus(newX, newY);
        newVirus.radius = newRadius;
        newVirus.mass = Math.PI * newRadius * newRadius;
        newVirus.vx = Math.cos(angle) * burstSpeed;
        newVirus.vy = Math.sin(angle) * burstSpeed;
        viruses.push(newVirus);
        return true; // Indicate success
   }

    update(deltaTime) {
        if (this.isFlashing) {
            this.flashTimer -= deltaTime;
            this._flashCycleTimer -= deltaTime;
            if (this._flashCycleTimer <= 0) {
                this.color = (this.color === this.originalColor) ? this.flashColor : this.originalColor;
                this._flashCycleTimer = this.flashInterval;
            }
            if (this.flashTimer <= 0) {
                this.isFlashing = false; this.color = this.originalColor;
            }
        }

        // --- ADDED: Update position based on velocity ---
        if (this.vx !== 0 || this.vy !== 0) {
            const timeFactor = deltaTime / 16.67;
            this.x += this.vx * timeFactor;
            this.y += this.vy * timeFactor;
            const dragFactor = 0.95; // Virus slows down over time
            this.vx *= dragFactor;
            this.vy *= dragFactor;
            if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
                this.vx = 0; this.vy = 0;
            }
            // Clamp to bounds
            const canvasWidth = canvas ? canvas.width : 800;
            const canvasHeight = canvas ? canvas.height : 600;
            this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));
        }
    // --- END ADDED ---
    }
}

// --- Game Logic ---

function initGame() {
    console.log("Init: Starting game initialization.");
    isGameRunning = true; // Mark game as actively running

    // 1. Initialize Audio Context
    initAudioContext(); // Safe to call multiple times

    // 2. Start Loading Background Music (asynchronously)
    // Check if Base64 data exists
    if (typeof BACK_GROUHND_MUSIC_BASE64 !== 'undefined' && BACK_GROUHND_MUSIC_BASE64) {
        // Only load if buffer doesn't exist or context was potentially recreated
        if (!backgroundMusicBuffer || (audioContext && !backgroundMusicBuffer.sampleRate)) {
            console.log("Init: Loading background music buffer...");
            loadAudio(BACK_GROUHND_MUSIC_BASE64).then(buffer => {
                if (buffer) {
                    backgroundMusicBuffer = buffer;
                    console.log("Init: Background music buffer loaded successfully.");
                    // Attempt to start music now if context is running
                    if (audioContext && audioContext.state === 'running') {
                        startBackgroundMusic();
                    } else {
                        console.log("Init: AudioContext not running, music start deferred until resume.");
                    }
                } else {
                    console.error("Init: Failed to load background music buffer (decode failed?).");
                }
            }).catch(error => {
                 console.error("Init: Error during background music loading promise:", error);
            });
        } else if (audioContext && audioContext.state === 'running' && !backgroundMusicSource) {
            // Buffer exists, context running, but source isn't playing -> start it
             console.log("Init: Buffer exists, starting background music.");
             startBackgroundMusic();
        }
    } else {
        console.warn("Init: Background music Base64 data (BACK_GROUHND_MUSIC_BASE64) not found or empty.");
    }

    // 3. Visual Reset & Fade-in
    document.body.classList.remove('black-background');
    gameElementToFade.classList.remove('fade-out');
    leaderboardElement.classList.remove('fade-out');
    console.log("Init: Visuals reset, fade-in triggered.");

    // 4. Reset State Flags
    setTimeout(() => {
        isPausedForFade = false;
        console.log("Init: Game logic unpaused.");
    }, 50); // Short delay after visual changes
    isResettingGame = false;

    // 5. Game Data Initialization
    resizeCanvas(); // Set initial canvas size based on window
    players = [];
    foods = [];
    viruses = [];
    feedPellets = [];
    currentNameIndex = 0;
    nextPlayerId = 0;

    for (let i = 0; i < initialPlayerCount; i++) {
        players.push(new LogicalPlayer());
    }

    spawnFood(maxFoodCount);
    spawnVirus(initialVirusCount);

    lastTime = performance.now(); // Reset game loop timer
    requestAnimationFrame(gameLoop); // Start the game loop
    console.log("Init: Game data setup complete, loop requested.");
}

function triggerGameReset(reason) {
    if (isResettingGame) return; // Already resetting

    isResettingGame = true;
    isPausedForFade = true;
    isGameRunning = false; // Mark game as stopped during reset
    console.log(`****** ${reason} - Triggering Game Reset ******`);
    console.log("Reset: Pausing game logic.");

    stopBackgroundMusic(); // Stop music

    // Fade out elements
    gameElementToFade.classList.add('fade-out');
    leaderboardElement.classList.add('fade-out');
    console.log("Reset: Fade-out started.");

    setTimeout(() => {
        console.log("Reset: Fade-out complete.");
        document.body.classList.add('black-background');
        console.log("Reset: Black screen active.");

        setTimeout(() => {
            console.log("Reset: Black screen ended. Re-initializing game...");
            initGame(); // Call initGame to restart everything
        }, BLACK_SCREEN_DURATION);

    }, FADE_DURATION);
}

function spawnFood(count) {
    let spawned = 0;
    const canvasWidth = canvas ? canvas.width : 800;
    const canvasHeight = canvas ? canvas.height : 600;
    for (let i = 0; i < count; i++) {
        if (foods.length >= maxFoodCount) break;
        let x, y, tooClose, attempts = 0;
        do {
            tooClose = false; attempts++;
            x = getRandomInt(foodRadius, Math.max(foodRadius, canvasWidth - foodRadius));
            y = getRandomInt(foodRadius, Math.max(foodRadius, canvasHeight - foodRadius));
            for(const v of viruses) { // Check vs viruses
                if (distanceSq(x, y, v.x, v.y) < (v.radius + foodRadius + 10)**2) { tooClose = true; break; }
            }
            // Add check vs players if needed
        } while (tooClose && attempts < 20);
        if (!tooClose) { foods.push(new Food(x, y)); spawned++; }
    }
}

function spawnVirus(count) {
     let spawned = 0;
     const canvasWidth = canvas ? canvas.width : 800;
     const canvasHeight = canvas ? canvas.height : 600;
     for (let i = 0; i < count; i++) {
        let x, y, tooClose, attempts = 0;
        const safeRadius = virusRadius + SPAWN_SAFETY_BUFFER;
        do {
            tooClose = false; attempts++;
            x = getRandomInt(safeRadius, Math.max(safeRadius, canvasWidth - safeRadius));
            y = getRandomInt(safeRadius, Math.max(safeRadius, canvasHeight - safeRadius));
            for (const v of viruses) { // Check vs other viruses
                if (distanceSq(x, y, v.x, v.y) < (virusRadius * 2 + SPAWN_SAFETY_BUFFER)**2) { tooClose = true; break; }
            }
            if (!tooClose) { // Check vs players
                 for (const lp of players) {
                     if (lp.isEaten) continue;
                     for (const pc of lp.cells) {
                         if (distanceSq(x,y,pc.x,pc.y) < (virusRadius + pc.radius + SPAWN_SAFETY_BUFFER)**2) { tooClose = true; break; }
                     }
                     if (tooClose) break;
                 }
            }
        } while (tooClose && attempts < 30);
        if (!tooClose) { viruses.push(new Virus(x, y)); spawned++; }
    }
}

function checkCollisions() {
    const eatenFoodIndices = new Set();
    const virusesToRemoveIndices = new Set();
    const cellsToSplitDueToVirus = [];
    const cellsEatenThisFrame = new Set();

    const allActiveCells = [];
    players.forEach(p => { if (!p.isEaten) p.cells.forEach(c => { if(c && c.mass > 0) allActiveCells.push(c); }); });

    // 1. Cell vs Food
    for (let i = allActiveCells.length - 1; i >= 0; i--) {
        const cell = allActiveCells[i];
        if (!cell || cellsEatenThisFrame.has(cell)) continue;
        const cellRadiusSq = cell.radius * cell.radius;
        for (let j = foods.length - 1; j >= 0; j--) {
            if (eatenFoodIndices.has(j)) continue;
            const food = foods[j];
            if (distanceSq(cell.x, cell.y, food.x, food.y) < cellRadiusSq) {
                cell.setMass(cell.mass + food.mass);
                eatenFoodIndices.add(j);
            }
        }
    }

    // 2. Cell vs Virus (Split)
    const virusMassThreshold = virusRadius * virusRadius * Math.PI * virusSplitMassThresholdMultiplier;
    for (let i = allActiveCells.length - 1; i >= 0; i--) {
        const cell = allActiveCells[i];
        if (!cell || cellsEatenThisFrame.has(cell) || cell.mass <= virusMassThreshold) continue;
        for (let j = viruses.length - 1; j >= 0; j--) {
            if (virusesToRemoveIndices.has(j)) continue;
            const virus = viruses[j];
            const dSq = distanceSq(cell.x, cell.y, virus.x, virus.y);
            const splitDist = Math.max(0, cell.radius - virus.radius * VIRUS_SPLIT_DISTANCE_FACTOR);
            if (dSq < splitDist * splitDist) {
                cellsToSplitDueToVirus.push({ cell: cell, virus: virus });
                virusesToRemoveIndices.add(j);
            }
        }
    }

    // 3. Cell vs Cell (Eat)
    for (let i = 0; i < allActiveCells.length; i++) {
        const cellA = allActiveCells[i];
        if (!cellA || cellsEatenThisFrame.has(cellA) || !cellA.parentPlayer) continue;
        for (let j = i + 1; j < allActiveCells.length; j++) {
            const cellB = allActiveCells[j];
            if (!cellB || cellsEatenThisFrame.has(cellB) || !cellB.parentPlayer || cellA.parentPlayer.id === cellB.parentPlayer.id) continue;

            const dSq = distanceSq(cellA.x, cellA.y, cellB.x, cellB.y);
            const rA = cellA.radius; const rB = cellB.radius;

            // A eats B
            if (cellA.mass > cellB.mass * 1.15) {
                const eatDistA = Math.max(0, rA - rB * PLAYER_EAT_DISTANCE_FACTOR);
                if (dSq < eatDistA * eatDistA) {
                    cellA.setMass(cellA.mass + cellB.mass);
                    cellsEatenThisFrame.add(cellB);
                    cellB.parentPlayer.removeCell(cellB);
                    continue; // B eaten, check A vs next cell
                }
            }
            // B eats A
            if (cellB.mass > cellA.mass * 1.15) {
                 const eatDistB = Math.max(0, rB - rA * PLAYER_EAT_DISTANCE_FACTOR);
                 if (dSq < eatDistB * eatDistB) {
                    cellB.setMass(cellB.mass + cellA.mass);
                    cellsEatenThisFrame.add(cellA);
                    cellA.parentPlayer.removeCell(cellA);
                    break; // A eaten, stop checking A in inner loop
                 }
            }
        }
    }

    // Apply removals and splits
    if (eatenFoodIndices.size > 0) foods = foods.filter((_, index) => !eatenFoodIndices.has(index));
    if (virusesToRemoveIndices.size > 0) viruses = viruses.filter((_, index) => !virusesToRemoveIndices.has(index));
    cellsToSplitDueToVirus.forEach(item => {
        if (item.cell && !cellsEatenThisFrame.has(item.cell) && item.cell.parentPlayer && !item.cell.parentPlayer.isEaten && item.cell.parentPlayer.cells.includes(item.cell)) {
             item.cell.parentPlayer.splitCell(item.cell);
        }
    });
}

function updateLeaderboard() {
    if (!leaderboardElement) return;
    try {
        const topPlayers = players
            .filter(p => p && !p.isEaten && p.totalMass > 0)
            .sort((a, b) => b.totalMass - a.totalMass)
            .slice(0, 10);

        let html = '<h3>Leaderboard</h3><ol>';
        if (topPlayers.length === 0) {
            html += '<li>Waiting for players...</li>';
        } else {
            topPlayers.forEach((player, index) => {
                const displayMass = Math.round(player.totalMass);
                const safeName = (player.name || '').replace(/</g, "<").replace(/>/g, ">");
                html += `<li><span class="leaderboard-rank">${index + 1}.</span> <span class="leaderboard-name">${safeName}</span> <span class="leaderboard-mass">${displayMass}</span></li>`;
            });
        }
        html += '</ol>';
        leaderboardElement.innerHTML = html;
    } catch (e) {
        console.error("Error updating leaderboard:", e);
    }
}

function resizeCanvas() {
    try {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Optional: Recalculate things based on new size if needed
        drawGame(); // Redraw after resize
    } catch (e) {
        console.error("Error during resizeCanvas:", e);
    }
}

function drawGame() {
    try {
        // Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Objects
        foods.forEach(food => food.draw());
        viruses.forEach(virus => virus.draw());
        feedPellets.forEach(pellet => pellet.draw());

        // Draw active players
        players.forEach(player => {
            if (player && !player.isEaten) {
                player.draw();
            }
        });
    } catch(e) {
        console.error("Error in drawGame:", e);
        // Consider stopping the loop or showing an error message visually
        // requestAnimationFrame might stop if an error is thrown repeatedly
    }
}

// --- Main Game Loop ---
function gameLoop(timestamp) {
    // Handle Paused/Resetting states
    if (isPausedForFade || isResettingGame) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calculate Delta Time
    timestamp = timestamp || performance.now();
    let deltaTime = timestamp - lastTime;
    if (deltaTime <= 0) { deltaTime = 16; } // Provide a fallback delta if timestamp issue
    deltaTime = Math.min(deltaTime, MAX_DELTA_TIME); // Clamp delta
    lastTime = timestamp;

    try { // Wrap main game logic in try/catch
        // 1. Spawning Food & Viruses
        if (foods.length < maxFoodCount && Math.random() < 0.15) spawnFood(getRandomInt(2, 5)); // Example: Spawn more frequently and in larger batches
        if (viruses.length < initialVirusCount && Math.random() < 0.01) spawnVirus(1);

        // 2. Update Game Objects
        players.forEach(player => player.update(deltaTime));
        viruses.forEach(virus => virus.update(deltaTime));
        feedPellets = feedPellets.filter(pellet => pellet.update(deltaTime));

        // 3. Check Collisions
        checkCollisions();

        // 4. Check Map Coverage Reset
        if (RESET_ON_MAP_COVERAGE && !isResettingGame) {
            const smallerDim = Math.min(canvas.width, canvas.height);
            const maxRadius = smallerDim * MAP_COVERAGE_RADIUS_FACTOR;
            let winnerFound = false;
            for (const p of players) {
                if (p && !p.isEaten) {
                    for (const c of p.cells) {
                        if (c.radius > maxRadius) {
                            triggerGameReset(`Map Coverage! ${p.name} grew too large!`);
                            winnerFound = true; break;
                        }
                    }
                }
                if (winnerFound) break;
            }
            if(winnerFound) return; // Exit loop if reset triggered
        }

        // 5. Maintain Minimum Player Count
        const activePlayerCount = players.filter(p => p && !p.isEaten).length;
        const needed = MIN_ACTIVE_PLAYERS - activePlayerCount;
        if (needed > 0 && !isResettingGame) {
            for (let i = 0; i < needed; i++) players.push(new LogicalPlayer());
        }

        // 6. Update Leaderboard
        leaderboardUpdateCooldown -= deltaTime;
        if (leaderboardUpdateCooldown <= 0) {
            updateLeaderboard();
            leaderboardUpdateCooldown = LEADERBOARD_UPDATE_INTERVAL;
        }

        // 7. Draw Everything
        drawGame();

    } catch (error) {
        console.error("Error in game loop:", error);
        isGameRunning = false; // Stop the loop on critical error
        // Optionally display an error message on canvas
        ctx.fillStyle = 'red';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("An error occurred. See console.", canvas.width / 2, canvas.height / 2);
        return; // Stop requesting frames
    }

    // 8. Request Next Frame only if game is still running
    if (isGameRunning) {
        requestAnimationFrame(gameLoop);
    }
}


// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing game setup...");
    // Ensure name list is available and shuffled
    if (typeof nameList !== 'undefined' && Array.isArray(nameList)) {
        shuffleArray(nameList);
        console.log("Name list shuffled.");
    } else {
        console.warn("NAME_LIST not found or is not an array. Using default names.");
        nameList = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];
    }
    // Call initGame to start audio context, load assets, and setup game data
    initGame();
});

// --- END OF FILE script.js ---