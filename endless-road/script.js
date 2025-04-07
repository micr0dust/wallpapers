// === 基本設定 ===
let scene, camera, renderer, clock;
let roadSegments = []; let terrainSegments = []; let pillars = []; let embankmentSegments = [];
let guardrailSegments = [];
let treeInstances = [];
const segmentLength = 40; const roadWidth = 8; const numSegments = 30;
const terrainWidth = 600; const terrainDetail = 38;
let driveSpeed = 15.0; let currentPathDistance = 0;
let isPaused = false; // 全局暫停狀態
let animationFrameId = null; // requestAnimationFrame ID

// === 新增：音效相關變數 ===
let audioContext;
let engineSoundBuffer = null, musicSoundBuffer = null, ambientSoundBuffer = null;
let engineSourceNode = null, musicSourceNode = null, ambientSourceNode = null;
let engineGainNode = null, musicGainNode = null, ambientGainNode = null;
let isEngineReady = false, isMusicReady = false, isAmbientReady = false;
let currentEnginePitch = 1.0;
let currentEngineVolume = 0.8; // 引擎目標音量
const baseEngineVolume = 0.8; // 基礎引擎音量
const musicVolume = 0.4;      // 音樂目標音量
const ambientVolume = 0.6;    // 環境聲目標音量
const pitchChangeSpeed = 1.5; // 音高變化平滑因子
const volumeChangeSpeed = 2.0; // 音量變化平滑因子
let hasAudioStarted = false; // 是否已由用戶交互啟動

// === 從外部 JS 獲取 Base64 數據 ===
const engineBase64 = typeof ENGINE_LOOP_BASE64 !== 'undefined' ? ENGINE_LOOP_BASE64 : null;
const musicBase64 = typeof BACK_GROUHND_MUSIC_BASE64 !== 'undefined' ? BACK_GROUHND_MUSIC_BASE64 : null;
const ambientBase64 = typeof STRONG_WIND_BASE64 !== 'undefined' ? STRONG_WIND_BASE64 : null;

// --- 噪音生成器 ---
const simplex = new SimplexNoise();
const baseTerrainHeightFreq = 0.003; const baseTerrainHeightAmp = 60;
const roadHeightVariationFreq = 0.015; const roadHeightVariationAmp = 8;
const curveFrequency = 0.005; const curveAmplitude = 80;
const terrainFrequency = 0.008; const terrainAmplitude = 55;

// --- 相機參數 ---
const cameraHeight = 3.5; const cameraLookDistance = 45; const cameraFollowSpeed = 0.06;
const rightLaneOffset = roadWidth * 0.25;
let targetCameraPosition = new THREE.Vector3(); let targetLookAtPosition = new THREE.Vector3();

// --- 高架橋參數 ---
const pillarCheckThreshold = 4.0; const pillarSpacing = 8.0; const pillarRadius = 0.5;
const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

// --- 路基參數 ---
const roadBedOffset = -2.0;
const roadForceRadius = roadWidth * 0.7;
const roadBlendRadius = roadWidth * 3.8;
const finalTerrainMaxHeightNearRoad = -0.5;

// --- 土堆/路基網格參數 ---
const embankmentMaterial = new THREE.MeshStandardMaterial({ color: 0xc2b280, side: THREE.DoubleSide, flatShading: false });
const embankmentSideExtendDistance = 8.0;
let lastSegmentNeededEmbankment = false;

// --- 地形顏色和裙邊 ---
const terrainColor = 0x6a9a6a; // 地形基礎色
const skyColor = 0xa0c0f0; // 天空/清除色
const fogNear = 60;
const fogFar = 150;
const terrainSkirtDrop = 30;

// --- 樹木參數 ---
const treesPerSegment = 80; // 已廢棄，改用叢生
let treeGeometryTrunk, treeGeometryCanopy;
let treeMaterialTrunk, treeMaterialCanopy;
const treeScaleMin = 0.8; const treeScaleMax = 1.5;
const clusterProbability = 0.35; // 每個地形塊生成叢集的概率
const numTreesInCluster = 15;    // 每個叢集的大致樹木數量
const clusterRadius = 18;        // 叢集範圍半徑
const flatnessThreshold = 0.6;   // 生成樹木所需的地形平坦度閾值
const treeAvoidRoadRadius = roadWidth * 2.5; // 樹木與道路中心的最小距離

// --- 護欄參數 ---
const guardrailHeight = 1.0;
const postRadius = 0.1;
const railHeight = 0.15;
const railSpacing = 0.3;
const guardrailMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, metalness: 0.4 });
const guardrailThreshold = 2.5; // 高度差超過此值且無路基時生成護欄

// === 新增：音頻輔助函數 ===

// Base64 轉 ArrayBuffer
function base64ToArrayBuffer(base64) {
    try {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return byteArray.buffer;
    } catch (e) {
        console.error("Base64 解碼失敗:", e);
        throw e;
    }
}

// 創建並啟動音頻源 (用於首次啟動)
function createAndStartSource(buffer, gainNode, isLoop = true) {
    if (!audioContext || !buffer || !gainNode) {
        console.error("無法創建源：缺少 context, buffer, 或 gain node。");
        return null;
    }
    // 確保 Context 在運行狀態
    if (audioContext.state !== 'running') {
        console.warn(`AudioContext 狀態為 ${audioContext.state}，無法創建/啟動源。`);
        return null;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = isLoop;

    try {
        source.connect(gainNode); // 連接到對應的 GainNode
        source.start(0); // 立即開始播放
        console.log("Source node 創建並啟動成功。");
        return source;
    } catch (e) {
        console.error("連接或啟動 source node 失敗:", e);
        try { source.disconnect(); } catch (err) {} // 清理
        return null;
    }
}

// === 修改：動畫暫停/恢復函數 (核心改動) ===

function pauseAnimation() {
    if (!isPaused) {
        console.log("[PAUSE] 請求暫停。isPaused 設為 true。");
        isPaused = true;

        // **策略：不銷毀 SourceNode，僅降低音量，依賴瀏覽器/WE自動掛起 AudioContext**
        if (audioContext && audioContext.state === 'running') {
            const now = audioContext.currentTime;
            const fadeOutTime = 0.1; // 快速淡出時間
            console.log("[PAUSE] AudioContext 正在運行，嘗試淡出音量。");
            if (engineGainNode) engineGainNode.gain.setTargetAtTime(0, now, fadeOutTime / 3); // 除以3更快
            if (musicGainNode) musicGainNode.gain.setTargetAtTime(0, now, fadeOutTime / 3);
            if (ambientGainNode) ambientGainNode.gain.setTargetAtTime(0, now, fadeOutTime / 3);
        } else {
             console.log("[PAUSE] AudioContext 未運行或不存在，不執行音量淡出。");
        }
        // 注意：我們不再調用 sourceNode.stop() 或 disconnect()
    } else {
        console.log("[PAUSE] 已經處於暫停狀態，忽略請求。");
    }
}

function resumeAnimation() {
    if (isPaused) { // 只有在確實是暫停狀態時才執行恢復
        console.log(`[RESUME] 請求恢復。當前 AudioContext 狀態: ${audioContext ? audioContext.state : 'N/A'}`);

        const resumeLogic = () => {
            // 再次確認在異步回調執行時，仍然需要恢復 (防止快速的 pause -> resume -> pause)
            if (!isPaused) {
                console.log("[RESUME] resumeLogic 執行時發現 isPaused 已為 false，取消恢復。");
                return;
            }

            console.log("[RESUME] 執行恢復邏輯...");
            if (clock) clock.getDelta(); // 重置時鐘 delta，避免恢復後跳幀

            // **策略：恢復音量，讓現有 SourceNode 繼續播放**
            if (audioContext && audioContext.state === 'running') {
                const now = audioContext.currentTime;
                const fadeInTime = 0.1; // 快速淡入
                console.log("[RESUME] AudioContext 已運行，恢復目標音量。");
                if (engineGainNode) engineGainNode.gain.setTargetAtTime(currentEngineVolume, now, fadeInTime / 3);
                if (musicGainNode) musicGainNode.gain.setTargetAtTime(musicVolume, now, fadeInTime / 3);
                if (ambientGainNode) ambientGainNode.gain.setTargetAtTime(ambientVolume, now, fadeInTime / 3);
                // 確保音高也恢復
                if (engineSourceNode) engineSourceNode.playbackRate.setTargetAtTime(currentEnginePitch, now, 0.01);

            } else {
                 console.log("[RESUME] AudioContext 未運行或不存在，無法恢復音量。");
            }

            isPaused = false; // 解除暫停標誌，允許 animate 循環繼續
            console.log("[RESUME] isPaused 設為 false。動畫將繼續。");
        };

        // 檢查並嘗試恢復 AudioContext
        if (audioContext && audioContext.state === 'suspended') {
            console.log("[RESUME] AudioContext 處於 suspended 狀態，嘗試 resume()...");
            audioContext.resume().then(() => {
                console.log("[RESUME] AudioContext resume() 成功。稍後執行 resumeLogic。");
                // 稍微延遲，給 AudioContext 一點時間完全穩定
                setTimeout(resumeLogic, 50);
            }).catch(err => {
                console.error("[RESUME] AudioContext resume() 失敗:", err);
                // 即使恢復失敗，也允許視覺部分解除暫停，避免畫面卡死
                isPaused = false;
                console.warn("[RESUME] AudioContext 恢復失敗，但 isPaused 已設為 false 以允許視覺恢復。");
            });
        } else if (audioContext && audioContext.state === 'running') {
            console.log("[RESUME] AudioContext 已經在運行狀態。直接執行 resumeLogic。");
            resumeLogic(); // 直接執行恢復邏輯
        } else {
            console.log("[RESUME] AudioContext 不可用或狀態未知。直接解除 isPaused。");
            isPaused = false; // 解除 isPaused
        }
    } else {
        console.log("[RESUME] 未處於暫停狀態，忽略請求。");
    }
}


// --- 輔助函數：Smoothstep --- (不變)
function smoothstep(edge0, edge1, x) { const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); }

// --- 計算原始地形估算高度 --- (不變)
function getEstimatedTerrainHeight(worldX, worldZ) { const baseHeight = simplex.noise2D(5, -worldZ * baseTerrainHeightFreq) * baseTerrainHeightAmp; const terrainNoise = simplex.noise2D(worldX * terrainFrequency * 0.5, -worldZ * terrainFrequency) * terrainAmplitude; return baseHeight + terrainNoise; }

// --- 計算路徑點、高度和方向 --- (不變)
function getPathPoint(distance) { const curve = simplex.noise2D(0, -distance * curveFrequency) * curveAmplitude; const baseHeight = simplex.noise2D(5, -distance * baseTerrainHeightFreq) * baseTerrainHeightAmp; const roadVariation = simplex.noise2D(10, -distance * roadHeightVariationFreq) * roadHeightVariationAmp; const height = baseHeight + roadVariation; const position = new THREE.Vector3(curve, height, -distance); const aheadDistance = distance + 0.1; const curveAhead = simplex.noise2D(0, -aheadDistance * curveFrequency) * curveAmplitude; const baseHeightAhead = simplex.noise2D(5, -aheadDistance * baseTerrainHeightFreq) * baseTerrainHeightAmp; const roadVariationAhead = simplex.noise2D(10, -aheadDistance * roadHeightVariationFreq) * roadHeightVariationAmp; const heightAhead = baseHeightAhead + roadVariationAhead; const positionAhead = new THREE.Vector3(curveAhead, heightAhead, -aheadDistance); const tangent = positionAhead.clone().sub(position).normalize(); return { position, tangent }; }

// --- 輔助函數：獲取修正後的地形高度 (考慮道路平整化) --- (不變)
function getModifiedTerrainHeight(worldX, worldZ) { const originalTerrainY = getEstimatedTerrainHeight(worldX, worldZ); const roadPathData = getPathPoint(-worldZ); const roadCenterX = roadPathData.position.x; const roadCenterY = roadPathData.position.y; const distToRoadCenter = Math.abs(worldX - roadCenterX); const targetBedY = roadCenterY + roadBedOffset; let finalY; if (distToRoadCenter <= roadBlendRadius) { const flattenFactor = 1.0 - smoothstep(roadForceRadius, roadBlendRadius, distToRoadCenter); const interpolatedBedY = THREE.MathUtils.lerp(targetBedY, roadCenterY + finalTerrainMaxHeightNearRoad, 1.0 - flattenFactor); finalY = Math.min(originalTerrainY, interpolatedBedY); finalY = Math.min(finalY, roadCenterY + finalTerrainMaxHeightNearRoad); } else { finalY = originalTerrainY; } return finalY; }

async function init() {
    console.log("--- 初始化開始 ---");
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(skyColor, fogNear, fogFar); // 使用天空色作為霧色

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 初始相機位置稍微靠後，避免看到生成過程
    const initialPathData = getPathPoint(segmentLength * 2); // 看向稍遠處
    const initialCamPos = initialPathData.position.clone().add(new THREE.Vector3(0, cameraHeight, 0));
     const initialLookAt = initialPathData.position.clone().add(initialPathData.tangent.multiplyScalar(cameraLookDistance));
    camera.position.copy(initialCamPos);
    targetCameraPosition.copy(initialCamPos); // 初始化目標位置
    targetLookAtPosition.copy(initialLookAt);  // 初始化目標注視點
    camera.lookAt(initialLookAt);


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(skyColor); // 設置渲染器清除色
    document.body.appendChild(renderer.domElement);

    // --- 光照 ---
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8); // 環境光稍微調亮
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 平行光也調亮一點
    directionalLight.position.set(35, 50, 25); // 調整光源位置
    directionalLight.castShadow = false; // 暫時禁用陰影以提高性能
    scene.add(directionalLight);

    // --- 材質 ---
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 線條用基礎材質即可
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: terrainColor,
        //flatShading: true, // 可選：開啟平面著色獲得低多邊形風格
        flatShading: false,
        side: THREE.DoubleSide // 確保背面可見（雖然裙邊應該能覆蓋）
    });

    // --- 創建樹木基礎幾何體和材質 (只創建一次) ---
    treeGeometryTrunk = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 5); // 樹幹
    treeGeometryCanopy = new THREE.ConeGeometry(0.8, 2.5, 6);      // 樹冠
    treeMaterialTrunk = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // 棕色樹幹
    treeMaterialCanopy = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // 深綠色樹冠

    // --- 創建初始場景元素 ---
    console.log("創建初始地形...");
    // 多創建一些地形塊，確保視野遠處有內容
    for (let i = 0; i < numSegments + 10; i++) {
        addTerrainSegment(i * segmentLength, terrainMaterial);
    }
     console.log("創建初始道路...");
    for (let i = 0; i < numSegments; i++) {
        addRoadSegment(i * segmentLength, roadMaterial, lineMaterial);
    }

    // --- 初始化音頻 ---
    console.log("初始化音頻...");
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) {
             throw new Error("瀏覽器不支持 Web Audio API");
        }
        audioContext = new AudioContext();
        console.log(`AudioContext 創建成功，初始狀態: ${audioContext.state}`);

        // 並行加載所有音頻文件
         const audioPromises = [];
         if (engineBase64) audioPromises.push(loadEngineSound());
         else console.warn("未找到引擎聲音 Base64 數據 (ENGINE_LOOP_BASE64)");

         if (musicBase64) audioPromises.push(loadMusicSound());
         else console.warn("未找到背景音樂 Base64 數據 (BACK_GROUHND_MUSIC_BASE64)");

         if (ambientBase64) audioPromises.push(loadAmbientSound());
         else console.warn("未找到環境聲 Base64 數據 (STRONG_WIND_BASE64)");

         if (audioPromises.length > 0) {
             await Promise.all(audioPromises);
             console.log("所有音頻文件嘗試加載完成。");
         } else {
             console.warn("沒有配置任何音頻文件。");
         }

    } catch (e) {
        console.error("初始化音頻失敗:", e);
        // 可以在頁面上顯示錯誤提示
         displayError("無法初始化音頻功能。請檢查瀏覽器兼容性或控制台錯誤。");
    }

    // --- 設置事件監聽器 ---
    console.log("設置事件監聽器...");
    setupVisibilityListeners(); // 包含 WE 和瀏覽器事件
    setupAudioInteraction();    // 等待用戶交互以啟動音頻

    window.addEventListener('resize', onWindowResize, false);

    console.log("--- 初始化完成 ---");
    animate(); // 啟動動畫循環
}

// === 音頻加載函數 ===
async function loadEngineSound() {
    if (!audioContext || !engineBase64) return;
    try {
        console.log("解碼引擎聲音...");
        const arrayBuffer = base64ToArrayBuffer(engineBase64);
        engineSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("引擎聲音解碼成功！");
        setupEngineAudioNodes();
        isEngineReady = true;
    } catch (error) {
        console.error("解碼引擎聲音失敗:", error);
        engineSoundBuffer = null; isEngineReady = false;
    }
}

async function loadMusicSound() {
    if (!audioContext || !musicBase64) return;
    try {
        console.log("解碼背景音樂...");
        const arrayBuffer = base64ToArrayBuffer(musicBase64);
        musicSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("背景音樂解碼成功！");
        setupMusicAudioNodes();
        isMusicReady = true;
    } catch (error) {
        console.error("解碼背景音樂失敗:", error);
        musicSoundBuffer = null; isMusicReady = false;
    }
}

async function loadAmbientSound() {
     if (!audioContext || !ambientBase64) return;
    try {
        console.log("解碼環境聲音...");
        const arrayBuffer = base64ToArrayBuffer(ambientBase64);
        ambientSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("環境聲音解碼成功！");
        setupAmbientAudioNodes();
        isAmbientReady = true;
    } catch (error) {
        console.error("解碼環境聲音失敗:", error);
        ambientSoundBuffer = null; isAmbientReady = false;
    }
}

// === 音頻節點設置 ===
 function setupEngineAudioNodes() {
    if (!audioContext || !engineSoundBuffer || engineGainNode) return; // 防止重複創建
    engineGainNode = audioContext.createGain();
    engineGainNode.gain.setValueAtTime(0, audioContext.currentTime); // 初始音量為 0
    engineGainNode.connect(audioContext.destination);
    console.log("引擎 GainNode 設置完成。");
}

function setupMusicAudioNodes() {
    if (!audioContext || !musicSoundBuffer || musicGainNode) return;
    musicGainNode = audioContext.createGain();
    musicGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    musicGainNode.connect(audioContext.destination);
    console.log("音樂 GainNode 設置完成。");
}

function setupAmbientAudioNodes() {
    if (!audioContext || !ambientSoundBuffer || ambientGainNode) return;
    ambientGainNode = audioContext.createGain();
    ambientGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    ambientGainNode.connect(audioContext.destination);
    console.log("環境聲 GainNode 設置完成。");
}

// === 用戶交互啟動音頻 ===
function setupAudioInteraction() {
    const startAudio = async () => {
        if (hasAudioStarted || !audioContext) return; // 防止重複啟動或 Context 未準備好

        console.log("[Audio Interaction] 檢測到用戶交互，嘗試啟動音頻。");
        console.log(`[Audio Interaction] 當前 AudioContext 狀態: ${audioContext.state}`);

        // 最重要的步驟：如果 AudioContext 是 suspended，嘗試恢復它
        if (audioContext.state === 'suspended') {
            try {
                 console.log("[Audio Interaction] AudioContext suspended，嘗試 resume()...");
                await audioContext.resume();
                console.log(`[Audio Interaction] AudioContext resume() 成功！ 新狀態: ${audioContext.state}`);
            } catch (err) {
                console.error("[Audio Interaction] AudioContext resume() 失敗:", err);
                displayError("無法自動啟動音頻。請嘗試刷新頁面或檢查瀏覽器設置。");
                return; // 如果恢復失敗，則不繼續
            }
        }

        // 再次檢查狀態，確保是 running
        if (audioContext.state !== 'running') {
            console.error(`[Audio Interaction] AudioContext 狀態不是 'running' (${audioContext.state})，無法啟動音頻。`);
             displayError(`無法啟動音頻 (狀態: ${audioContext.state})`);
            return;
        }

        console.log("[Audio Interaction] AudioContext 處於 running 狀態，開始創建並啟動 SourceNodes...");
        const now = audioContext.currentTime;

        // 創建並啟動各個音源
        if (isEngineReady && engineSoundBuffer && engineGainNode && !engineSourceNode) { // 檢查 SourceNode 是否已存在
            engineGainNode.gain.setValueAtTime(currentEngineVolume, now); // 設置初始音量
            engineSourceNode = createAndStartSource(engineSoundBuffer, engineGainNode, true);
            if (engineSourceNode) {
                engineSourceNode.playbackRate.setValueAtTime(currentEnginePitch, now); // 設置初始音高
                console.log("[Audio Interaction] 引擎聲音源已啟動。");
            } else {
                 console.error("[Audio Interaction] 引擎聲音源創建失敗。");
            }
        }
         if (isMusicReady && musicSoundBuffer && musicGainNode && !musicSourceNode) {
            musicGainNode.gain.setValueAtTime(musicVolume, now);
            musicSourceNode = createAndStartSource(musicSoundBuffer, musicGainNode, true);
             if(musicSourceNode) console.log("[Audio Interaction] 背景音樂源已啟動。");
             else console.error("[Audio Interaction] 背景音樂源創建失敗。");
        }
         if (isAmbientReady && ambientSoundBuffer && ambientGainNode && !ambientSourceNode) {
            ambientGainNode.gain.setValueAtTime(ambientVolume, now);
            ambientSourceNode = createAndStartSource(ambientSoundBuffer, ambientGainNode, true);
             if(ambientSourceNode) console.log("[Audio Interaction] 環境聲源已啟動。");
             else console.error("[Audio Interaction] 環境聲源創建失敗。");
        }

        hasAudioStarted = true; // 標記音頻已由用戶啟動
        console.log("[Audio Interaction] 音頻啟動流程完成。hasAudioStarted = true。");

        // 移除提示信息和監聽器
        const prompt = document.getElementById('audio-prompt');
        if (prompt) prompt.remove();
        document.body.removeEventListener('click', startAudio);
        document.body.removeEventListener('keydown', startAudio);
    };

    // 添加交互提示
    let infoDiv = document.getElementById('audio-prompt');
    if (!infoDiv && (!isEngineReady || !isMusicReady || !isAmbientReady)) { // 如果還沒創建過提示，且有音頻未加載完，可能需要等待
        setTimeout(() => setupAudioInteraction(), 500); // 稍後重試，給音頻加載留時間
        return;
    }

    if (!infoDiv && (isEngineReady || isMusicReady || isAmbientReady)) { // 確保至少有一個音頻準備好了再顯示提示
        infoDiv = document.createElement('div');
        infoDiv.id = 'audio-prompt';
        infoDiv.textContent = "點擊或按任意鍵以啟動聲音";
        document.body.appendChild(infoDiv);

        // 添加一次性事件監聽器
        document.body.addEventListener('click', startAudio, { once: true });
        document.body.addEventListener('keydown', startAudio, { once: true });
        console.log("等待用戶交互以啟動音頻...");
    } else if (infoDiv && hasAudioStarted) {
        // 如果音頻已啟動，但提示還在，移除它
         prompt.remove();
    }
}

// === 顯示錯誤信息 ===
function displayError(message) {
     let errorDiv = document.getElementById('error-message');
     if (!errorDiv) {
         errorDiv = document.createElement('div');
         errorDiv.id = 'error-message';
         errorDiv.style.position = 'absolute';
         errorDiv.style.bottom = '10px';
         errorDiv.style.left = '10px';
         errorDiv.style.padding = '10px';
         errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
         errorDiv.style.color = 'white';
         errorDiv.style.zIndex = '101';
         errorDiv.style.borderRadius = '5px';
         document.body.appendChild(errorDiv);
     }
     errorDiv.textContent = message;
 }


// --- 創建路段等幾何體函數 (基本不變，僅格式化和註釋) ---

function addRoadSegment(startDistance, roadMat, lineMat) {
    const segmentDetail = 15; // 路段細分數
    const points = [];
    const tangents = [];
    const normals = [];
    const up = new THREE.Vector3(0, 1, 0);

    // 1. 計算路段上的點、切線
    for (let i = 0; i <= segmentDetail; i++) {
        const d = startDistance + (i / segmentDetail) * segmentLength;
        const pathData = getPathPoint(d);
        points.push(pathData.position);
        tangents.push(pathData.tangent);
    }

    // 2. 計算每個點的法線 (指向道路右側)
    for (let i = 0; i <= segmentDetail; i++) {
        const currentTangent = tangents[i];
        let normal = new THREE.Vector3().crossVectors(currentTangent, up).normalize();
         // 處理接近垂直的情況
        if (Math.abs(currentTangent.y) > 0.98) {
            normal.crossVectors(currentTangent, new THREE.Vector3(1, 0, 0)).normalize();
            if (normal.lengthSq() < 0.1) { // 如果與 X 軸平行
                normal.crossVectors(currentTangent, new THREE.Vector3(0, 0, 1)).normalize();
            }
        }
        normals.push(normal);
    }

    // 3. 構建頂點數據
    const roadVertices = [];
    const lineVertices = [];
    const embankmentVertices = [];
    const leftGuardrailVertices = [];
    const rightGuardrailVertices = [];

    const halfWidth = roadWidth / 2;
    let distanceAlongSegment = 0; // 當前處理到路段的哪個位置
    let lastPillarPos = -Infinity; // 上一個柱子的 Z 坐標，用於控制間距
    let needsEmbankmentMesh = false; // 本段是否需要生成路基網格
    let needsGuardrailMesh = false;  // 本段是否需要生成護欄網格
    let first_v1 = null, first_v2 = null, first_eb1 = null, first_eb2 = null; // 用於路基起始斜面

    const prevHadEmbankment = lastSegmentNeededEmbankment; // 記錄上一個路段是否有路基

    for (let i = 0; i < segmentDetail; i++) {
        const p1 = points[i]; const p2 = points[i + 1]; // 當前小段的起點和終點
        const n1 = normals[i]; const n2 = normals[i + 1]; // 對應的法線

        // 計算道路四個角的頂點
        const v1 = p1.clone().add(n1.clone().multiplyScalar(-halfWidth)); // 左後
        const v2 = p1.clone().add(n1.clone().multiplyScalar(halfWidth));  // 右後
        const v3 = p2.clone().add(n2.clone().multiplyScalar(halfWidth));  // 右前
        const v4 = p2.clone().add(n2.clone().multiplyScalar(-halfWidth)); // 左前

        // 添加道路面片的兩個三角形頂點
        roadVertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v4.x, v4.y, v4.z);
        roadVertices.push(v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);

        const segmentPartLength = p1.distanceTo(p2); // 這個小段的長度

        // 計算中間虛線 (邏輯不變)
        let segmentPartTraversed = 0;
        const dashLength = 2; const dashGap = 2;
        let currentDashPosLocal = 0; let inDashLocal = true;
        let totalDistStartOfPart = startDistance + distanceAlongSegment;
        inDashLocal = (Math.floor(totalDistStartOfPart / (dashLength + dashGap)) % 2 === 0);
        currentDashPosLocal = totalDistStartOfPart % (dashLength + dashGap);
        if (!inDashLocal) currentDashPosLocal -= dashLength;
        while (segmentPartTraversed < segmentPartLength) {
            const remainingInPart = segmentPartLength - segmentPartTraversed;
            const currentPhaseLength = inDashLocal ? dashLength : dashGap;
            const stepLength = Math.min(remainingInPart, currentPhaseLength - currentDashPosLocal);
            if (inDashLocal) {
                const startLerp = segmentPartTraversed / segmentPartLength;
                const endLerp = (segmentPartTraversed + stepLength) / segmentPartLength;
                const dashStart = p1.clone().lerp(p2, startLerp);
                const dashEnd = p1.clone().lerp(p2, endLerp);
                lineVertices.push(dashStart.x, dashStart.y + 0.05, dashStart.z); // Y稍抬高避免 Z-fighting
                lineVertices.push(dashEnd.x, dashEnd.y + 0.05, dashEnd.z);
            }
            currentDashPosLocal += stepLength;
            segmentPartTraversed += stepLength;
            if (currentDashPosLocal >= currentPhaseLength) {
                inDashLocal = !inDashLocal;
                currentDashPosLocal = 0;
            }
        }

        // --- 檢查是否需要柱子、路基或護欄 ---
        const checkPoint = p1.clone().lerp(p2, 0.5); // 在小段中間進行檢查
        const currentTotalDistance = startDistance + distanceAlongSegment + segmentPartLength * 0.5;
        const terrainRawY = getEstimatedTerrainHeight(checkPoint.x, checkPoint.z); // 地形原始高度
        const roadY = checkPoint.y; // 道路中心高度
        const heightDiff = roadY - terrainRawY; // 道路與地形的高度差
        let segmentNeedsPillar = false; // 本小段是否需要柱子支撐

        // 1. 檢查柱子
        if (heightDiff > pillarCheckThreshold) {
            segmentNeedsPillar = true;
            if (currentTotalDistance - lastPillarPos >= pillarSpacing) {
                addPillar(checkPoint, roadY, terrainRawY, startDistance);
                lastPillarPos = currentTotalDistance;
            }
        }

        // 2. 檢查路基 (不需要柱子，且地形高於預期路基底部)
        const targetBedLevel = roadY + roadBedOffset; // 預期路基底部 Y
        const currentPieceNeedsEmbankment = !segmentNeedsPillar && terrainRawY > targetBedLevel + 0.1; // 加一點容差
        if (currentPieceNeedsEmbankment) {
            needsEmbankmentMesh = true;
            // 計算路基側面頂點 (邏輯不變)
            const eb1_xz_vec = n1.clone().multiplyScalar(-embankmentSideExtendDistance);
            const eb2_xz_vec = n1.clone().multiplyScalar(embankmentSideExtendDistance);
            const eb3_xz_vec = n2.clone().multiplyScalar(embankmentSideExtendDistance);
            const eb4_xz_vec = n2.clone().multiplyScalar(-embankmentSideExtendDistance);
            const eb1_x = v1.x + eb1_xz_vec.x; const eb1_z = v1.z + eb1_xz_vec.z;
            const eb2_x = v2.x + eb2_xz_vec.x; const eb2_z = v2.z + eb2_xz_vec.z;
            const eb3_x = v3.x + eb3_xz_vec.x; const eb3_z = v3.z + eb3_xz_vec.z;
            const eb4_x = v4.x + eb4_xz_vec.x; const eb4_z = v4.z + eb4_xz_vec.z;
            const terrain_eb1_y = getModifiedTerrainHeight(eb1_x, eb1_z);
            const terrain_eb2_y = getModifiedTerrainHeight(eb2_x, eb2_z);
            const terrain_eb3_y = getModifiedTerrainHeight(eb3_x, eb3_z);
            const terrain_eb4_y = getModifiedTerrainHeight(eb4_x, eb4_z);
            // 路基底部 Y 取地形高度和路沿 Y 的較小值，再稍微降低一點點
            const eb1_y = Math.min(terrain_eb1_y, v1.y) - 1.0;
            const eb2_y = Math.min(terrain_eb2_y, v2.y) - 1.0;
            const eb3_y = Math.min(terrain_eb3_y, v3.y) - 1.0;
            const eb4_y = Math.min(terrain_eb4_y, v4.y) - 1.0;
            const eb1 = new THREE.Vector3(eb1_x, eb1_y, eb1_z);
            const eb2 = new THREE.Vector3(eb2_x, eb2_y, eb2_z);
            const eb3 = new THREE.Vector3(eb3_x, eb3_y, eb3_z);
            const eb4 = new THREE.Vector3(eb4_x, eb4_y, eb4_z);
            // 添加路基側面和底面的三角形頂點
            embankmentVertices.push(v1.x, v1.y, v1.z, v4.x, v4.y, v4.z, eb1.x, eb1.y, eb1.z); // Left Top Triangle
            embankmentVertices.push(v4.x, v4.y, v4.z, eb4.x, eb4.y, eb4.z, eb1.x, eb1.y, eb1.z); // Left Bottom Triangle
            embankmentVertices.push(v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, eb2.x, eb2.y, eb2.z); // Right Top Triangle
            embankmentVertices.push(v3.x, v3.y, v3.z, eb3.x, eb3.y, eb3.z, eb2.x, eb2.y, eb2.z); // Right Bottom Triangle
            embankmentVertices.push(eb1.x, eb1.y, eb1.z, eb4.x, eb4.y, eb4.z, eb2.x, eb2.y, eb2.z); // Bottom Triangle 1
            embankmentVertices.push(eb4.x, eb4.y, eb4.z, eb3.x, eb3.y, eb3.z, eb2.x, eb2.y, eb2.z); // Bottom Triangle 2
            // 記錄第一個路基段的頂點，用於封閉開頭
            if (first_v1 === null) {
                first_v1 = v1.clone(); first_v2 = v2.clone();
                first_eb1 = eb1.clone(); first_eb2 = eb2.clone();
            }
        }

        // 3. 檢查護欄 (高度差大於閾值，且 *不* 需要路基)
        if (heightDiff > guardrailThreshold && !currentPieceNeedsEmbankment) {
            needsGuardrailMesh = true;
            const postOffset = 0.1; // 護欄柱子稍微向內偏移
            // --- 左側護欄頂點 (邏輯不變) ---
            const post1_base = v1.clone().add(n1.clone().multiplyScalar(postOffset)); // 後柱底部
            const post4_base = v4.clone().add(n2.clone().multiplyScalar(postOffset)); // 前柱底部
            const post1_top = post1_base.clone().add(up.clone().multiplyScalar(guardrailHeight)); // 後柱頂部
            const post4_top = post4_base.clone().add(up.clone().multiplyScalar(guardrailHeight)); // 前柱頂部
            // 柱子 (近似為方塊)
            leftGuardrailVertices.push(post1_base.x - postRadius, post1_base.y, post1_base.z, post1_base.x + postRadius, post1_base.y, post1_base.z, post1_top.x - postRadius, post1_top.y, post1_top.z);
            leftGuardrailVertices.push(post1_base.x + postRadius, post1_base.y, post1_base.z, post1_top.x + postRadius, post1_top.y, post1_top.z, post1_top.x - postRadius, post1_top.y, post1_top.z);
            // 頂部橫杆
            const rail1_bl = post1_top.clone().sub(up.clone().multiplyScalar(railHeight)); // 後下
            const rail1_br = post4_top.clone().sub(up.clone().multiplyScalar(railHeight)); // 前下
            leftGuardrailVertices.push(rail1_bl.x, rail1_bl.y, rail1_bl.z, rail1_br.x, rail1_br.y, rail1_br.z, post1_top.x, post1_top.y, post1_top.z); // 上三角
            leftGuardrailVertices.push(rail1_br.x, rail1_br.y, rail1_br.z, post4_top.x, post4_top.y, post4_top.z, post1_top.x, post1_top.y, post1_top.z); // 下三角
             // 中部橫杆
            const rail2_tl = rail1_bl.clone().sub(up.clone().multiplyScalar(railSpacing)); // 後上
            const rail2_tr = rail1_br.clone().sub(up.clone().multiplyScalar(railSpacing)); // 前上
            const rail2_bl = rail2_tl.clone().sub(up.clone().multiplyScalar(railHeight)); // 後下
            const rail2_br = rail2_tr.clone().sub(up.clone().multiplyScalar(railHeight)); // 前下
            leftGuardrailVertices.push(rail2_bl.x, rail2_bl.y, rail2_bl.z, rail2_br.x, rail2_br.y, rail2_br.z, rail2_tl.x, rail2_tl.y, rail2_tl.z);
            leftGuardrailVertices.push(rail2_br.x, rail2_br.y, rail2_br.z, rail2_tr.x, rail2_tr.y, rail2_tr.z, rail2_tl.x, rail2_tl.y, rail2_tl.z);

            // --- 右側護欄頂點 (邏輯類似，方向相反) ---
             const post2_base = v2.clone().add(n1.clone().multiplyScalar(-postOffset));
             const post3_base = v3.clone().add(n2.clone().multiplyScalar(-postOffset));
             const post2_top = post2_base.clone().add(up.clone().multiplyScalar(guardrailHeight));
             const post3_top = post3_base.clone().add(up.clone().multiplyScalar(guardrailHeight));
             // 柱子
             rightGuardrailVertices.push(post2_base.x - postRadius, post2_base.y, post2_base.z, post2_base.x + postRadius, post2_base.y, post2_base.z, post2_top.x - postRadius, post2_top.y, post2_top.z);
             rightGuardrailVertices.push(post2_base.x + postRadius, post2_base.y, post2_base.z, post2_top.x + postRadius, post2_top.y, post2_top.z, post2_top.x - postRadius, post2_top.y, post2_top.z);
             // 頂部橫杆
             const r_rail1_bl = post2_top.clone().sub(up.clone().multiplyScalar(railHeight));
             const r_rail1_br = post3_top.clone().sub(up.clone().multiplyScalar(railHeight));
             rightGuardrailVertices.push(r_rail1_bl.x, r_rail1_bl.y, r_rail1_bl.z, post2_top.x, post2_top.y, post2_top.z, r_rail1_br.x, r_rail1_br.y, r_rail1_br.z); // 順序調整以匹配面朝外
             rightGuardrailVertices.push(r_rail1_br.x, r_rail1_br.y, r_rail1_br.z, post2_top.x, post2_top.y, post2_top.z, post3_top.x, post3_top.y, post3_top.z);
             // 中部橫杆
             const r_rail2_tl = r_rail1_bl.clone().sub(up.clone().multiplyScalar(railSpacing));
             const r_rail2_tr = r_rail1_br.clone().sub(up.clone().multiplyScalar(railSpacing));
             const r_rail2_bl = r_rail2_tl.clone().sub(up.clone().multiplyScalar(railHeight));
             const r_rail2_br = r_rail2_tr.clone().sub(up.clone().multiplyScalar(railHeight));
             rightGuardrailVertices.push(r_rail2_bl.x, r_rail2_bl.y, r_rail2_bl.z, r_rail2_tl.x, r_rail2_tl.y, r_rail2_tl.z, r_rail2_br.x, r_rail2_br.y, r_rail2_br.z);
             rightGuardrailVertices.push(r_rail2_br.x, r_rail2_br.y, r_rail2_br.z, r_rail2_tl.x, r_rail2_tl.y, r_rail2_tl.z, r_rail2_tr.x, r_rail2_tr.y, r_rail2_tr.z);
        }

        distanceAlongSegment += segmentPartLength; // 累加處理過的小段長度
    } // End for loop (segmentDetail)

    // --- 檢查路段起點和終點是否需要柱子 (補邊) ---
    const startPoint = points[0];
    const startTerrainRawY = getEstimatedTerrainHeight(startPoint.x, startPoint.z);
    if (startPoint.y - startTerrainRawY > pillarCheckThreshold) {
        addPillar(startPoint, startPoint.y, startTerrainRawY, startDistance);
    }
    const endPoint = points[segmentDetail];
    const endTerrainRawY = getEstimatedTerrainHeight(endPoint.x, endPoint.z);
     // 終點柱子需要判斷是否離上一個柱子太近
    if (endPoint.y - endTerrainRawY > pillarCheckThreshold && (startDistance + segmentLength) - lastPillarPos >= pillarSpacing / 2) {
        addPillar(endPoint, endPoint.y, endTerrainRawY, startDistance);
    }

    // --- 創建 Mesh ---
    // 1. 道路
    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeometry.computeVertexNormals(); // 計算頂點法線以獲得平滑光照
    const roadMesh = new THREE.Mesh(roadGeometry, roadMat);
    roadMesh.userData = { type: 'road', distance: startDistance }; // 存儲距離用於回收
    scene.add(roadMesh);
    roadSegments.push(roadMesh);

    // 2. 道路中線 (如果是虛線)
    if (lineVertices.length > 0) {
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
        const lineMesh = new THREE.LineSegments(lineGeometry, lineMat); // 使用 LineSegments 繪製線段
        lineMesh.userData = { type: 'line', distance: startDistance };
        scene.add(lineMesh);
        roadSegments.push(lineMesh); // 也加入 roadSegments 以便一起回收
    }

    // 3. 路基 (如果需要)
    if (needsEmbankmentMesh && embankmentVertices.length > 0) {
        // 如果上一個路段 *沒有* 路基，而這一段 *有*，則需要封閉開頭
        if (!prevHadEmbankment && first_v1 !== null) {
             embankmentVertices.push(
                 first_v1.x, first_v1.y, first_v1.z,
                 first_eb1.x, first_eb1.y, first_eb1.z,
                 first_eb2.x, first_eb2.y, first_eb2.z
             );
             embankmentVertices.push(
                 first_v1.x, first_v1.y, first_v1.z,
                 first_eb2.x, first_eb2.y, first_eb2.z,
                 first_v2.x, first_v2.y, first_v2.z
             );
         }
        const embankmentGeometry = new THREE.BufferGeometry();
        embankmentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(embankmentVertices, 3));
        embankmentGeometry.computeVertexNormals();
        const embankmentMesh = new THREE.Mesh(embankmentGeometry, embankmentMaterial);
        embankmentMesh.userData = { type: 'embankment', distance: startDistance };
        scene.add(embankmentMesh);
        embankmentSegments.push(embankmentMesh);
    }

    // 4. 護欄 (如果需要)
    if (needsGuardrailMesh) {
        if (leftGuardrailVertices.length > 0) {
            const leftGuardrailGeom = new THREE.BufferGeometry();
            leftGuardrailGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftGuardrailVertices, 3));
            leftGuardrailGeom.computeVertexNormals();
            const leftGuardrailMesh = new THREE.Mesh(leftGuardrailGeom, guardrailMaterial);
            leftGuardrailMesh.userData = { type: 'guardrail', distance: startDistance };
            scene.add(leftGuardrailMesh);
            guardrailSegments.push(leftGuardrailMesh);
        }
        if (rightGuardrailVertices.length > 0) {
             const rightGuardrailGeom = new THREE.BufferGeometry();
             rightGuardrailGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightGuardrailVertices, 3));
             rightGuardrailGeom.computeVertexNormals();
             const rightGuardrailMesh = new THREE.Mesh(rightGuardrailGeom, guardrailMaterial);
             rightGuardrailMesh.userData = { type: 'guardrail', distance: startDistance };
             scene.add(rightGuardrailMesh);
             guardrailSegments.push(rightGuardrailMesh);
        }
    }

    lastSegmentNeededEmbankment = needsEmbankmentMesh; // 更新全局狀態，供下一個路段使用
}

function addPillar(roadCenterPos, roadY, terrainRawY, segmentStartDistance) {
    const height = roadY - terrainRawY;
    if (height <= 0.1) return; // 高度差太小不需要柱子

    const pillarBottomY = terrainRawY;
    const pillarTopY = roadY - 0.1; // 柱子頂部比路面稍低一點
    const actualHeight = pillarTopY - pillarBottomY;
    if (actualHeight <= 0.1) return; // 實際高度太小

    const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, actualHeight, 8); // 8邊形近似圓柱
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    // 柱子中心點在底部和頂部中間
    pillar.position.set(roadCenterPos.x, pillarBottomY + actualHeight / 2, roadCenterPos.z);
    pillar.userData = { type: 'pillar', distance: segmentStartDistance }; // 記錄距離
    scene.add(pillar);
    pillars.push(pillar);
}

function addTerrainSegment(startDistance, terrainMat) {
    const planeDetailX = terrainDetail; // X 方向細分
    const planeDetailY = Math.max(1, Math.floor(segmentLength / 5)); // Z 方向細分，不用太高
    const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, segmentLength, planeDetailX, planeDetailY);
    const vertices = terrainGeometry.attributes.position;
    const vertexCount = vertices.count;
    const worldPositions = new Float32Array(vertexCount * 3); // 存儲世界坐標

    // 計算該地形塊中心點的世界坐標，用於後續頂點位置計算
    const centerPathPoint = getPathPoint(startDistance + segmentLength / 2);
    const tolerance = 0.01; // 用於判斷邊界頂點的容差

    const treeMatrices = []; // 存儲此地形塊上所有樹的變換矩陣
    const dummy = new THREE.Object3D(); // 用於計算矩陣的輔助對象

    // 1. 計算所有地形頂點的世界坐標和高度 (應用道路平整化)
    for (let i = 0; i < vertexCount; i++) {
        const localX = vertices.getX(i); // PlaneGeometry 局部坐標 X
        const localY = vertices.getY(i); // PlaneGeometry 局部坐標 Y (對應世界 Z)
        // 將局部坐標轉換為世界坐標
        const worldZ = centerPathPoint.position.z - localY; // Y 越大，Z 越小 (越遠)
        const worldX = centerPathPoint.position.x + localX;
        const finalY = getModifiedTerrainHeight(worldX, worldZ); // 獲取修正後的高度
        worldPositions[i * 3] = worldX;
        worldPositions[i * 3 + 1] = finalY;
        worldPositions[i * 3 + 2] = worldZ;
    }

    // 2. 嘗試生成樹木叢集 (邏輯不變)
    if (Math.random() < clusterProbability) { // 按概率決定是否生成叢集
         const clusterLocalX = Math.random() * terrainWidth - terrainWidth / 2;
         const clusterLocalY = Math.random() * segmentLength - segmentLength / 2;
         const clusterWorldX = centerPathPoint.position.x + clusterLocalX;
         const clusterWorldZ = centerPathPoint.position.z - clusterLocalY;

         // 檢查叢集中心是否離道路太近
         const roadPathDataCenter = getPathPoint(-clusterWorldZ); // Z 軸反轉
         const roadCenterX = roadPathDataCenter.position.x;
         const distToRoadCenter = Math.abs(clusterWorldX - roadCenterX);

         if (distToRoadCenter > treeAvoidRoadRadius) {
             // 檢查地形是否足夠平坦
             const hCenter = getEstimatedTerrainHeight(clusterWorldX, clusterWorldZ);
             const hOffsetX = getEstimatedTerrainHeight(clusterWorldX + 1.0, clusterWorldZ);
             const hOffsetZ = getEstimatedTerrainHeight(clusterWorldX, clusterWorldZ + 1.0);
             if (Math.abs(hCenter - hOffsetX) < flatnessThreshold && Math.abs(hCenter - hOffsetZ) < flatnessThreshold) {
                 // 生成叢集內的樹木
                 const actualTrees = Math.round(numTreesInCluster * (0.75 + Math.random() * 0.5)); // 數量隨機浮動
                 for (let j = 0; j < actualTrees; j++) {
                     const angle = Math.random() * Math.PI * 2;
                     const radius = Math.random() * clusterRadius;
                     const treeX = clusterWorldX + Math.cos(angle) * radius;
                     const treeZ = clusterWorldZ + Math.sin(angle) * radius;
                     const treeY = getModifiedTerrainHeight(treeX, treeZ); // 樹木底部貼合 *修正後* 的地形

                     dummy.position.set(treeX, treeY, treeZ);
                     dummy.rotation.y = Math.random() * Math.PI * 2; // 隨機旋轉 Y 軸
                     const scale = THREE.MathUtils.randFloat(treeScaleMin, treeScaleMax); // 隨機縮放
                     dummy.scale.set(scale, scale, scale);
                     dummy.updateMatrix(); // 計算變換矩陣
                     treeMatrices.push(dummy.matrix.clone()); // 存儲矩陣
                 }
             }
         }
     }


    // 3. 修改邊界頂點創建裙邊 (防止看到地形邊緣)
    for (let i = 0; i < vertexCount; i++) {
        const localX = vertices.getX(i);
        const localY = vertices.getY(i);
        // 判斷是否為 X 或 Y 方向的邊界頂點
        const isBoundary = Math.abs(localX - (-terrainWidth / 2)) < tolerance ||
                           Math.abs(localX - (terrainWidth / 2)) < tolerance ||
                           Math.abs(localY - (-segmentLength / 2)) < tolerance ||
                           Math.abs(localY - (segmentLength / 2)) < tolerance;
        if (isBoundary) {
            worldPositions[i * 3 + 1] -= terrainSkirtDrop; // 將邊界頂點的 Y 向下移動
        }
    }

    // 4. 創建最終的地形 Mesh
    const finalTerrainGeo = new THREE.BufferGeometry();
    finalTerrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(worldPositions, 3));
    // 複用 PlaneGeometry 的索引，因為頂點順序和拓撲結構沒變
    finalTerrainGeo.setIndex(terrainGeometry.index);
    finalTerrainGeo.computeVertexNormals(); // 計算平滑法線
    const finalTerrainMesh = new THREE.Mesh(finalTerrainGeo, terrainMat);
    finalTerrainMesh.userData = { type: 'terrain', distance: startDistance };
    scene.add(finalTerrainMesh);
    terrainSegments.push(finalTerrainMesh);

     // 5. 創建樹木 InstancedMesh (如果生成了樹)
    if (treeMatrices.length > 0) {
        const treeCount = treeMatrices.length;
        // 創建 InstancedMesh (樹幹和樹冠)
        const instancedTrunk = new THREE.InstancedMesh(treeGeometryTrunk, treeMaterialTrunk, treeCount);
        const instancedCanopy = new THREE.InstancedMesh(treeGeometryCanopy, treeMaterialCanopy, treeCount);

        const canopyOffset = 1.3; // 樹冠相對於樹幹底部的位置偏移量 (需根據模型調整)

        for (let i = 0; i < treeCount; i++) {
            const trunkMatrix = treeMatrices[i]; // 樹幹的矩陣
            const canopyMatrix = trunkMatrix.clone(); // 複製給樹冠

            // 從矩陣分解出位置、旋轉、縮放，以便調整樹冠位置
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            trunkMatrix.decompose(position, quaternion, scale);

            // 將樹冠位置在 Y 軸上抬 (考慮縮放影響)
            position.y += canopyOffset * scale.y;
            // 重新組合樹冠的矩陣
            canopyMatrix.compose(position, quaternion, scale);

            instancedTrunk.setMatrixAt(i, trunkMatrix);
            instancedCanopy.setMatrixAt(i, canopyMatrix);
        }

        instancedTrunk.instanceMatrix.needsUpdate = true; // 必須設置為 true 才能應用矩陣
        instancedCanopy.instanceMatrix.needsUpdate = true;
        instancedTrunk.userData = { type: 'trees', distance: startDistance };
        instancedCanopy.userData = { type: 'trees', distance: startDistance };

        scene.add(instancedTrunk);
        scene.add(instancedCanopy);
        treeInstances.push(instancedTrunk); // 加入回收列表
        treeInstances.push(instancedCanopy);
    }
     // 釋放臨时的 PlaneGeometry 资源
    terrainGeometry.dispose();
}


// === 可見性/焦點監聽器 (來自新版本，調用新的 pause/resume) ===
function setupVisibilityListeners() {
    // --- 標準瀏覽器可見性 API ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log("[Visibility] 瀏覽器標籤頁隱藏。");
            pauseAnimation();
        } else {
            console.log("[Visibility] 瀏覽器標籤頁可見。");
            resumeAnimation();
        }
    });

    // --- 焦點 / 失去焦點事件 (可選) ---
    // 在 WE 環境下，visibilitychange 和 WE 的屬性通常足夠
    // window.addEventListener('blur', () => {
    //     console.log("[Focus] 窗口失去焦點。");
    //     // pauseAnimation(); // 根據需要取消註釋
    // });
    // window.addEventListener('focus', () => {
    //     console.log("[Focus] 窗口獲得焦點。");
    //     // resumeAnimation(); // 根據需要取消註釋
    // });

    // --- Wallpaper Engine 可見性與暫停處理 ---
    if (window.wallpaperPropertyListener) {
        console.log("[WE Listener]檢測到 Wallpaper Engine API。設置監聽器。");
        window.wallpaperPropertyListener.applyUserProperties = function(properties) {
            console.log("[WE Listener]收到屬性:", JSON.stringify(properties));

            let shouldBePaused = false; // 判斷最終是否應該暫停

            // 檢查 WE 標準的 'visibility' 屬性 (WE 2.1+?)
            if (properties.visibility && typeof properties.visibility.value === 'boolean') {
                 if (properties.visibility.value === false) {
                     console.log("[WE Listener]屬性 'visibility' 為 false。");
                     shouldBePaused = true;
                 } else {
                     console.log("[WE Listener]屬性 'visibility' 為 true。");
                     // 初始設為不暫停，但可能被下面的 'pause' 覆蓋
                 }
             } else if (properties.visibility) {
                  console.log("[WE Listener]收到 'visibility' 屬性，但值不是預期的布爾值:", properties.visibility.value);
             }

            // 檢查可能的自定義 'pause' 屬性 (需要與 project.json 匹配)
            if (properties.pause && typeof properties.pause.value === 'boolean') {
                 if (properties.pause.value === true) {
                     console.log("[WE Listener]屬性 'pause' 為 true。");
                     shouldBePaused = true; // 強制暫停
                 } else {
                     console.log("[WE Listener]屬性 'pause' 為 false。");
                     // 如果 pause 為 false，通常意味著要恢復，除非 visibility 也為 false
                     if (shouldBePaused) { // 如果之前因為 visibility=false 判斷要暫停
                        console.warn("[WE Listener]收到 pause=false 但 visibility=false，維持暫停狀態。");
                     } else {
                        // 如果 visibility 不是 false，且 pause 是 false，則不應該暫停
                        // shouldBePaused 維持 false
                     }
                 }
             } else if (properties.pause) {
                 console.log("[WE Listener]收到 'pause' 屬性，但值不是預期的布爾值:", properties.pause.value);
             }

            // 根據最終判斷執行動作
             console.log(`[WE Listener]最終判斷 shouldBePaused: ${shouldBePaused}`);
            if (shouldBePaused) {
                // 如果需要暫停，且當前未暫停，則調用 pause
                 if (!isPaused) {
                      console.log("[WE Listener]調用 pauseAnimation()");
                      pauseAnimation();
                 } else {
                      console.log("[WE Listener]已經是暫停狀態，無需再次調用 pauseAnimation()");
                 }
            } else {
                // 如果不需要暫停，且當前是暫停狀態，則調用 resume
                 if (isPaused) {
                     console.log("[WE Listener]調用 resumeAnimation()");
                     resumeAnimation();
                 } else {
                      console.log("[WE Listener]已經是運行狀態，無需再次調用 resumeAnimation()");
                 }
            }
        };

        // 嘗試請求 WE 發送一次當前屬性狀態 (非標準，但有時有用)
        if (window.wallpaperRequestUserProperties) {
            console.log("[WE Listener]嘗試請求初始屬性...");
            try {
                 window.wallpaperRequestUserProperties();
                 console.log("[WE Listener]初始屬性請求已發送。");
            } catch (e) {
                 console.warn("[WE Listener]請求初始屬性失敗:", e);
            }
        } else {
            console.log("[WE Listener]不支持 window.wallpaperRequestUserProperties。等待屬性自動推送。");
        }

    } else {
        console.log("[WE Listener]未檢測到 Wallpaper Engine API。僅依賴瀏覽器事件。");
    }
}

// --- 動畫循環 (修改) ---
function animate() {
    animationFrameId = requestAnimationFrame(animate); // 請求下一幀

    // **如果處於暫停狀態，則跳過所有更新和渲染**
    if (isPaused) {
        // console.log("Paused, skipping frame."); // 可以取消註釋以調試
        return;
    }

    // --- 如果未暫停，則繼續動畫 ---
    let deltaTime = clock.getDelta(); // 獲取自上一*渲染*幀以來的時間差

    // **修改 MAX_DELTA_TIME 處理：限制 deltaTime 而不是強制暫停**
    const MAX_DELTA_TIME = 0.5; // 最大允許的時間差 (秒)
    if (deltaTime > MAX_DELTA_TIME) {
         console.warn(`[Animate] DeltaTime 過大 (${deltaTime.toFixed(3)}s)，限制為 ${MAX_DELTA_TIME}s。可能發生在恢復後或卡頓。`);
         deltaTime = MAX_DELTA_TIME; // 將時間差限制在最大值
         // 不再調用 pauseAnimation()
    }

    // **僅當時間實際流逝時才更新遊戲狀態** (避免 deltaTime 為 0 時的計算)
    if (deltaTime > 0) {
        // 1. 更新路徑距離
        currentPathDistance += driveSpeed * deltaTime;

        // 2. 更新相機位置和朝向
        const cameraPathData = getPathPoint(currentPathDistance);
        const camPos = cameraPathData.position;
        const camTangent = cameraPathData.tangent;
        const up = new THREE.Vector3(0, 1, 0);
        const rightNormal = new THREE.Vector3().crossVectors(camTangent, up).normalize(); // 相機右側方向

        // 計算目標相機位置 (在道路右側車道上方)
        const targetPos = camPos.clone()
                              .add(up.multiplyScalar(cameraHeight))
                              .add(rightNormal.multiplyScalar(rightLaneOffset));
        // 計算目標注視點 (在前方道路中心)
        const lookAtPos = camPos.clone().add(camTangent.multiplyScalar(cameraLookDistance));

        // 使用 lerp 平滑移動相機和注視點
        camera.position.lerp(targetPos, cameraFollowSpeed);
        targetLookAtPosition.lerp(lookAtPos, cameraFollowSpeed);
        camera.lookAt(targetLookAtPosition);

        // 3. 更新引擎音效參數 (音高和音量)
        if (isEngineReady && engineSourceNode && engineGainNode && audioContext?.state === 'running') {
            const currentTime = audioContext.currentTime;
            const volTransitionConst = 0.05; // 音量過渡平滑度 (越小越快)
            const pitchTransitionConst = 0.05; // 音高過渡平滑度

            // a. 計算目標音高 (基於速度和坡度)
            const basePitch = 0.6 + (driveSpeed / 25.0) * 1.4; // 基礎音高隨速度變化
            const slope = getPathPoint(currentPathDistance).tangent.y; // 當前位置的坡度
            let targetPitch = basePitch;
            let targetVolume = baseEngineVolume; // 目標音量從基礎音量開始

            const slopeThreshold = 0.02; // 觸發音效變化的坡度閾值
            const pitchSlopeFactor = 0.4;  // 坡度對音高的影響因子
            const volumeSlopeFactor = 0.3; // 坡度對音量的影響因子

            if (slope > slopeThreshold) { // 上坡
                targetPitch += slope * pitchSlopeFactor;    // 音調升高
                targetVolume += slope * volumeSlopeFactor; // 音量增大
            } else if (slope < -slopeThreshold) { // 下坡
                targetPitch += slope * pitchSlopeFactor * 0.8; // 音調降低 (幅度稍小)
                targetVolume += slope * volumeSlopeFactor * 0.5; // 音量減小 (幅度更小)
            }
            // 限制音高和音量的範圍
            targetPitch = Math.max(0.4, Math.min(targetPitch, 2.5));
            targetVolume = Math.max(0.3, Math.min(targetVolume, 1.0));

            // b. 平滑過渡到目標值 (使用 lerp)
            // 注意：lerp 的第三個參數不是時間，而是插值因子。deltaTime * speed 提供了基於時間的平滑。
            currentEnginePitch = THREE.MathUtils.lerp(currentEnginePitch, targetPitch, deltaTime * pitchChangeSpeed);
            currentEngineVolume = THREE.MathUtils.lerp(currentEngineVolume, targetVolume, deltaTime * volumeChangeSpeed);

            // c. 應用到 Web Audio 節點 (使用 setTargetAtTime 以獲得 Web Audio 內部的平滑)
            try {
                // 再次檢查節點是否存在，因為它們可能在其他地方被意外斷開
                if (engineSourceNode && engineGainNode) {
                     engineSourceNode.playbackRate.setTargetAtTime(currentEnginePitch, currentTime, pitchTransitionConst);
                     engineGainNode.gain.setTargetAtTime(currentEngineVolume, currentTime, volTransitionConst);
                } else {
                     // console.warn("[Animate] 嘗試更新音頻參數時，節點不存在。");
                }
            } catch (e) {
                 console.error("[Animate] 更新音頻參數時出錯:", e);
                 // 在此處可以添加更複雜的錯誤處理，例如嘗試重新連接節點
            }
        } else if (isEngineReady && audioContext?.state !== 'running') {
             // 如果引擎準備好了，但 AudioContext 沒在運行，可以記錄一下
             // console.warn(`[Animate] Engine ready, but AudioContext state is ${audioContext?.state}. Skipping audio update.`);
        }


        // 4. 管理場景元素 (回收與生成)
        const recycleThreshold = 80; // 相機後方多遠的物體被回收
        const generateThreshold = (numSegments - 4) * segmentLength; // 需要生成前方多遠的內容

        // 回收遠處的物體 (樹木、護欄、路基、道路、地形、柱子)
        // 使用反向循環安全地從數組中移除元素
        // --- 回收樹木 ---
        const treesToRemove = [];
        for (let i = treeInstances.length - 1; i >= 0; i--) {
            const t = treeInstances[i];
            // 物體的 Z 坐標在其 userData.distance (負數) 加上自身長度
            if ((-t.userData.distance - segmentLength) > camera.position.z + recycleThreshold) {
                treesToRemove.push(i);
                scene.remove(t);
                // InstancedMesh 不需要單獨 dispose geometry/material，因為它們是共享的
                // 但如果確定不再使用共享的 geometry/material，可以在某個時刻 dispose
            }
        }
        treesToRemove.forEach(index => treeInstances.splice(index, 1));

        // --- 回收護欄 ---
        const guardrailsToRemove = [];
        for (let i = guardrailSegments.length - 1; i >= 0; i--) {
            const g = guardrailSegments[i];
            if ((-g.userData.distance - segmentLength) > camera.position.z + recycleThreshold) {
                guardrailsToRemove.push(i);
                scene.remove(g);
                if (g.geometry) g.geometry.dispose(); // 釋放幾何體
                // 共享材質無需每次釋放
            }
        }
         guardrailsToRemove.forEach(index => guardrailSegments.splice(index, 1));


        // --- 回收路基 ---
        const embankmentToRemove = [];
        for (let i = embankmentSegments.length - 1; i >= 0; i--) {
            const e = embankmentSegments[i];
            if ((-e.userData.distance - segmentLength) > camera.position.z + recycleThreshold) {
                embankmentToRemove.push(i);
                scene.remove(e);
                if (e.geometry) e.geometry.dispose();
            }
        }
        embankmentToRemove.forEach(index => embankmentSegments.splice(index, 1));

        // --- 回收道路和線條 ---
        const segmentsToRemove = [];
        for (let i = roadSegments.length - 1; i >= 0; i--) {
            const s = roadSegments[i];
            if ((-s.userData.distance - segmentLength) > camera.position.z + recycleThreshold) {
                segmentsToRemove.push(i);
                scene.remove(s);
                 if (s.geometry) s.geometry.dispose();
                 // LineSegments 的材質是共享的 basic material，無需釋放
                 // Road 的材質是共享的 standard material，無需釋放
            }
        }
         segmentsToRemove.forEach(index => roadSegments.splice(index, 1));


        // --- 回收地形 ---
        const terrainToRemove = [];
        for (let i = terrainSegments.length - 1; i >= 0; i--) {
            const s = terrainSegments[i];
            if ((-s.userData.distance - segmentLength) > camera.position.z + recycleThreshold) {
                terrainToRemove.push(i);
                scene.remove(s);
                 if (s.geometry) s.geometry.dispose();
                 // 地形材質共享，無需釋放
            }
        }
        terrainToRemove.forEach(index => terrainSegments.splice(index, 1));

        // --- 回收柱子 ---
         const pillarsToRemove = [];
         for (let i = pillars.length - 1; i >= 0; i--) {
             const p = pillars[i];
             // 柱子沒有 userData.distance，直接用 position.z 判斷
             // 柱子是在道路中心創建的，其 Z 坐標為負數
             // 回收條件應為柱子 Z 坐標 > 相機 Z + 閾值 (因為都是負數，越小越遠)
             // 或者判斷 柱子 Z < 相機 Z - 閾值 (更直觀)
             if (p.position.z > camera.position.z + recycleThreshold + segmentLength) { // 稍微放寬一點
                 pillarsToRemove.push(i);
                 scene.remove(p);
                 if (p.geometry) p.geometry.dispose();
                 // 柱子材質共享
             }
         }
          pillarsToRemove.forEach(index => pillars.splice(index, 1));


        // 生成前方的內容
        // 找到當前最遠的路段和地形塊的距離
        let maxRoadDistance = 0;
        roadSegments.forEach(s => maxRoadDistance = Math.max(maxRoadDistance, s.userData.distance));
        let maxTerrainDistance = 0;
        terrainSegments.forEach(s => maxTerrainDistance = Math.max(maxTerrainDistance, s.userData.distance));

        // 計算需要生成到的最遠距離
        const furthestPointRequired = currentPathDistance + generateThreshold;

        // 生成地形塊，直到達到所需距離 (多生成一些以備用)
         while (maxTerrainDistance < furthestPointRequired + segmentLength * 3) {
            const nextTerrainStart = maxTerrainDistance + segmentLength;
            // 獲取現有地形塊的材質來創建新的
            const existingTerrainMaterial = terrainSegments.length > 0 ? terrainSegments[0].material : null;
            if (existingTerrainMaterial) {
                 addTerrainSegment(nextTerrainStart, existingTerrainMaterial);
                 maxTerrainDistance = nextTerrainStart;
            } else {
                 console.warn("[Animate] 無法找到地形材質來生成新塊。停止生成地形。");
                 break; // 如果找不到材質，停止生成
            }
         }

        // 生成道路塊，直到達到所需距離
         while (maxRoadDistance < furthestPointRequired) {
            const nextSegmentStart = maxRoadDistance + segmentLength;
            // 獲取現有路段和線條的材質
            const existingRoadMat = roadSegments.length > 0 ? roadSegments.find(s => s.userData.type === 'road')?.material : null;
            const existingLineMat = roadSegments.length > 0 ? roadSegments.find(s => s.userData.type === 'line')?.material : null;

             if (existingRoadMat && existingLineMat) {
                 addRoadSegment(nextSegmentStart, existingRoadMat, existingLineMat);
                 maxRoadDistance = nextSegmentStart;
             } else {
                 console.warn("[Animate] 無法找到道路/線條材質來生成新塊。停止生成道路。");
                 break; // 找不到材質則停止
             }
         }

    } // End of (deltaTime > 0) check

    // --- 渲染場景 ---
    if (renderer && scene && camera) { // 安全檢查
        renderer.render(scene, camera);
    } else {
         console.error("[Animate] Renderer, Scene 或 Camera 未定義！無法渲染。");
         // 在這種情況下，可能需要停止動畫循環
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }

} // End animate()

// --- 窗口大小調整 --- (不變)
function onWindowResize() {
    if (camera && renderer) {
         camera.aspect = window.innerWidth / window.innerHeight;
         camera.updateProjectionMatrix();
         renderer.setSize(window.innerWidth, window.innerHeight);
         console.log("窗口大小已調整。");
    }
}

// --- 啟動 ---
try {
    init(); // 調用初始化函數
} catch (error) {
    console.error("初始化過程中發生頂層錯誤:", error);
    displayError("載入時發生嚴重錯誤，請檢查控制台。");
}