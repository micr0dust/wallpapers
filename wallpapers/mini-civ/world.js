// 世界管理器 - 統一管理所有遊戲對象
class World {
    constructor() {
        // Three.js 核心組件
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cameraController = null;
        
        // 遊戲系統
        this.grid = null;
        this.buildingManager = null;
        this.villagerManager = null;
        this.treeManager = null;
        
        // 遊戲狀態
        this.isPaused = false;
        
        // 從配置管理器讀取默認遊戲速度，如果失敗則使用安全默認值
        let gameSpeed = 1.0; // 安全默認值
        try {
            if (window.configManager) {
                const defaults = window.configManager.getDefaults();
                gameSpeed = defaults.gameSpeed || 1.0;
            }
        } catch (error) {
            console.warn('⚠️ 無法獲取遊戲速度配置，使用默認值:', error.message);
        }
        
        this.gameSpeed = gameSpeed;
        this.lastUpdateTime = 0;
        
        // AI建造策略
        this.aiBuilder = {
            lastBuildAttempt: 0,
            buildInterval: 1000, // 每1秒檢查一次建造
        };
        
        // 燈光和光影系統
        this.lights = [];
        this.lightingSystem = {
            timeOfDay: 0.25, // 從早上6:00開始（0.25 = 6:00）
            dayDuration: 60000, // 一天的長度（毫秒），1分鐘一個循環
            sunLight: null,
            moonLight: null,
            ambientLight: null,
            skyColor: new THREE.Color(),
            fogColor: new THREE.Color()
        };
    }

    // 初始化世界
    init(canvas) {
        console.log('World 初始化，使用配置:', {
            gameSpeed: this.gameSpeed
        });
        
        this.setupRenderer(canvas);
        this.setupScene();
        this.setupCamera();
        this.setupLighting();
        this.setupGameSystems();
        this.setupInitialBuildings();
        
        // 設置全局引用，讓農田可以調用更新方法
        window.worldInstance = this;
    }

    setupRenderer(canvas) {
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // 天藍色背景
        
        // 啟用高質量陰影
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 啟用色調映射以獲得更好的光照效果
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // 啟用伽馬校正
        this.renderer.gammaOutput = true;
        this.renderer.gammaFactor = 2.2;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // 添加地面
        this.createGround();
    }

    createGround() {
        const groundSize = 400; // 適應200x200網格（200*2=400）
        const segments = 200; // 增加地面分段數以支持地形起伏
        
        // 創建帶有更多頂點的地面幾何體
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
        
        // 使用簡單的噪聲函數生成地形高度
        this.generateTerrain(groundGeometry, segments);
        
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x90EE90, // 淡綠色草地
            vertexColors: true // 啟用頂點著色以增強地形效果
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    // 生成地形顏色變化（平坦地形，僅視覺起伏）
    generateTerrain(geometry, segments) {
        const vertices = geometry.attributes.position.array;
        const colors = new Float32Array(vertices.length);
        
        // 地形參數
        const noiseScale = 0.015; // 噪聲縮放（調整地形頻率）
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 1];
            
            // 保持地形完全平坦
            vertices[i + 2] = 0; // Y座標固定為0
            
            // 檢查是否在農田區域內
            const farmColor = this.getFarmColorAtPosition(x, z);
            if (farmColor) {
                colors[i] = farmColor.r;
                colors[i + 1] = farmColor.g;
                colors[i + 2] = farmColor.b;
            } else {
                // 使用多層噪聲生成視覺上的「高度」差異（僅影響顏色）
                let visualHeight = 0;
                
                // 大尺度地形特徵
                visualHeight += this.noise(x * noiseScale * 0.5, z * noiseScale * 0.5) * 0.8;
                
                // 中等尺度細節
                visualHeight += this.noise(x * noiseScale * 1.5, z * noiseScale * 1.5) * 0.3;
                
                // 小尺度細節
                visualHeight += this.noise(x * noiseScale * 4, z * noiseScale * 4) * 0.15;
                
                // 微細節
                visualHeight += this.noise(x * noiseScale * 8, z * noiseScale * 8) * 0.05;
                
                // 根據視覺高度設置顏色變化
                const normalizedHeight = Math.max(0, Math.min(1, (visualHeight + 1) / 2));
                
                // 創建更自然的顏色漸變
                let r, g, b;
                
                if (normalizedHeight < 0.3) {
                    // 低地：深綠色
                    r = 0.2 + normalizedHeight * 0.3;
                    g = 0.5 + normalizedHeight * 0.2;
                    b = 0.1 + normalizedHeight * 0.1;
                } else if (normalizedHeight < 0.7) {
                    // 中地：淺綠色
                    r = 0.3 + (normalizedHeight - 0.3) * 0.4;
                    g = 0.6 + (normalizedHeight - 0.3) * 0.2;
                    b = 0.2 + (normalizedHeight - 0.3) * 0.1;
                } else {
                    // 高地：黃綠色/土色
                    r = 0.5 + (normalizedHeight - 0.7) * 0.3;
                    g = 0.7 + (normalizedHeight - 0.7) * 0.1;
                    b = 0.3 + (normalizedHeight - 0.7) * 0.2;
                }
                
                colors[i] = r;     // R
                colors[i + 1] = g; // G
                colors[i + 2] = b; // B
            }
        }
        
        // 添加顏色屬性到幾何體
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // 重新計算法線以獲得正確的光照
        geometry.computeVertexNormals();
    }

    // 檢查指定位置是否在農田區域內
    getFarmColorAtPosition(x, z) {
        if (!window.farmAreas) return null;
        
        for (let farm of window.farmAreas) {
            const dx = x - farm.x;
            const dz = z - farm.z;
            
            // 如果在農田範圍內 (正方形區域)
            if (Math.abs(dx) <= farm.size / 2 && Math.abs(dz) <= farm.size / 2) {
                return farm.color;
            }
        }
        
        return null;
    }

    // 更新農田區域的地形顏色
    updateFarmColors() {
        if (!window.farmAreas || !this.ground) return;
        
        // 重新生成整個地形以包含農田顏色
        this.generateTerrain(this.ground.geometry, 200);
    }

    // 檢查是否為夜晚時間（18:00後）
    isNightTime() {
        // 從全局或場景中獲取當前時間
        if (window.gameTime && window.gameTime.currentHour !== undefined) {
            return window.gameTime.currentHour >= 18 || window.gameTime.currentHour < 6;
        }
        
        // 備用方案：檢查是否當前為夜晚（通過光照判斷）
        return this.isNight;
    }

    // 改進的2D噪聲函數（更接近Perlin噪聲的效果）
    noise(x, y) {
        // 添加種子值以獲得可重複的結果
        const seed = 1234;
        
        // 整數部分
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        
        // 小數部分
        const fx = x - ix;
        const fy = y - iy;
        
        // 平滑插值函數
        const smooth = (t) => t * t * (3 - 2 * t);
        
        // 在四個角點獲取噪聲值
        const a = this.hash(ix, iy, seed);
        const b = this.hash(ix + 1, iy, seed);
        const c = this.hash(ix, iy + 1, seed);
        const d = this.hash(ix + 1, iy + 1, seed);
        
        // 雙線性插值
        const i1 = this.lerp(a, b, smooth(fx));
        const i2 = this.lerp(c, d, smooth(fx));
        
        return this.lerp(i1, i2, smooth(fy));
    }

    // 哈希函數，生成偽隨機值
    hash(x, y, seed) {
        let h = seed + x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        h = h ^ (h >> 16);
        return (h & 0x7fffffff) / 0x7fffffff * 2 - 1; // 歸一化到 -1 到 1
    }

    // 線性插值
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        
        // 創建相機控制器
        this.cameraController = new CameraController(this.camera, this.scene, this.renderer);
    }

    setupLighting() {
        // 環境光（會根據時間動態調整）
        this.lightingSystem.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(this.lightingSystem.ambientLight);
        this.lights.push(this.lightingSystem.ambientLight);

        // 太陽光（主要方向光）
        this.lightingSystem.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.lightingSystem.sunLight.castShadow = true;
        
        // 設置高質量陰影參數（適應200x200地圖和濃密霧效果）
        this.lightingSystem.sunLight.shadow.mapSize.width = 4096;
        this.lightingSystem.sunLight.shadow.mapSize.height = 4096;
        this.lightingSystem.sunLight.shadow.camera.near = 0.5;
        this.lightingSystem.sunLight.shadow.camera.far = 400; // 減少遠距離以配合霧效果
        this.lightingSystem.sunLight.shadow.camera.left = -200; // 適應較小地圖
        this.lightingSystem.sunLight.shadow.camera.right = 200;
        this.lightingSystem.sunLight.shadow.camera.top = 200;
        this.lightingSystem.sunLight.shadow.camera.bottom = -200;
        this.lightingSystem.sunLight.shadow.bias = -0.0005;
        
        this.scene.add(this.lightingSystem.sunLight);
        this.lights.push(this.lightingSystem.sunLight);

        // 月光（夜間光源）
        this.lightingSystem.moonLight = new THREE.DirectionalLight(0x9db4ff, 0.2);
        this.lightingSystem.moonLight.castShadow = false; // 月光不投射陰影
        
        this.scene.add(this.lightingSystem.moonLight);
        this.lights.push(this.lightingSystem.moonLight);

        // 初始化光照狀態（從早上6:00開始）
        this.updateLighting(0);
    }

    // 更新動態光照系統
    updateLighting(currentTime) {
        // 計算當前時間（0-1，其中0=午夜，0.25=6:00，0.5=正午，0.75=18:00）
        // 添加0.25的偏移量，讓遊戲從6:00開始
        const timeOffset = 0.25; // 6:00開始的偏移
        // 應用遊戲速度到時間計算
        const adjustedTime = currentTime * this.gameSpeed;
        this.lightingSystem.timeOfDay = ((adjustedTime % this.lightingSystem.dayDuration) / this.lightingSystem.dayDuration + timeOffset) % 1;
        
        // 將時間轉換為小時（0-24）
        const gameHour = this.lightingSystem.timeOfDay * 24;
        
        // 計算太陽角度：6:00為日出（-90度），12:00為正午（0度），18:00為日落（90度）
        let sunAngle;
        if (gameHour >= 6 && gameHour <= 18) {
            // 白天：從6:00到18:00，太陽從東到西
            const dayProgress = (gameHour - 6) / 12; // 0到1
            sunAngle = (dayProgress - 0.5) * Math.PI; // -π/2到π/2
        } else {
            // 夜晚：太陽在地平線以下
            if (gameHour < 6) {
                // 午夜到黎明
                sunAngle = Math.PI + (gameHour / 6) * Math.PI; // π到2π
            } else {
                // 黃昏到午夜
                sunAngle = Math.PI + ((gameHour - 18) / 6) * Math.PI; // π到2π
            }
        }
        
        // 太陽高度（-1到1，0是地平線）
        const sunHeight = Math.sin(sunAngle);
        
        // 計算太陽位置
        const sunDistance = 400;
        let sunX, sunY, sunZ;
        
        if (gameHour >= 6 && gameHour <= 18) {
            // 白天：太陽在天空中
            const dayProgress = (gameHour - 6) / 12; // 0到1
            sunX = Math.cos(dayProgress * Math.PI) * sunDistance; // 從東到西
            sunY = Math.max(50, Math.sin(dayProgress * Math.PI) * 200 + 100); // 弧形軌跡
            sunZ = 0; // 保持在南北中線
        } else {
            // 夜晚：太陽在地平線以下
            sunX = 0;
            sunY = -100; // 地平線以下
            sunZ = 0;
        }
        
        this.lightingSystem.sunLight.position.set(sunX, sunY, sunZ);
        
        // 計算月亮位置（與太陽相對）
        const moonX = -sunX * 0.7;
        const moonY = Math.max(20, 150 - sunY * 0.5);
        const moonZ = 0;
        
        this.lightingSystem.moonLight.position.set(moonX, moonY, moonZ);
        
        // 計算光照強度：統一的光照計算系統
        let dayIntensity = 0;
        let nightIntensity = 0;
        
        if (gameHour >= 5 && gameHour <= 19) {
            // 從5:00開始的過渡期到19:00結束的過渡期
            if (gameHour >= 6 && gameHour <= 18) {
                // 主要白天時段：6:00-18:00
                const hoursSinceSunrise = gameHour - 6;
                const dayProgress = hoursSinceSunrise / 12; // 0到1
                dayIntensity = Math.sin(dayProgress * Math.PI) * 0.8 + 0.2; // 0.2到1.0
                nightIntensity = 0;
            } else if (gameHour >= 5 && gameHour < 6) {
                // 黎明過渡：5:00-6:00，確保光照強度不會低於夜晚
                const transition = (gameHour - 5) / 1; // 0到1
                // 使用更好的過渡函數，確保總光照至少為0.3
                dayIntensity = transition * 0.5; // 從0到0.5
                nightIntensity = Math.max(0.3 - dayIntensity, 0); // 確保總光照≥0.3
            } else if (gameHour > 18 && gameHour <= 19) {
                // 黃昏過渡：18:00-19:00，確保光照強度不會低於夜晚
                const transition = (19 - gameHour) / 1; // 1到0
                dayIntensity = transition * 0.5; // 從0.5到0
                nightIntensity = Math.max(0.3 - dayIntensity, 0); // 確保總光照≥0.3
            }
        } else {
            // 完全夜晚時段：19:00-5:00
            dayIntensity = 0;
            nightIntensity = 0.3;
        }
        
        // 設置太陽光強度和顏色
        if (dayIntensity > 0) {
            this.lightingSystem.sunLight.intensity = dayIntensity * 1.2;
            // 只有白天才投射陰影
            this.lightingSystem.sunLight.castShadow = true;
            
            // 根據時間調整顏色溫度
            if (gameHour >= 10 && gameHour <= 14) {
                // 正午：白色光
                this.lightingSystem.sunLight.color.setHex(0xffffff);
            } else if (gameHour >= 8 && gameHour <= 16) {
                // 早晨/下午：暖白光
                this.lightingSystem.sunLight.color.setHex(0xfff4e6);
            } else {
                // 黃昏/黎明：橙色光
                this.lightingSystem.sunLight.color.setHex(0xffb366);
            }
        } else {
            this.lightingSystem.sunLight.intensity = 0;
            // 夜晚時關閉太陽光陰影
            this.lightingSystem.sunLight.castShadow = false;
        }
        
        // 設置月光強度
        this.lightingSystem.moonLight.intensity = nightIntensity;
        
        // 環境光強度調整
        const ambientIntensity = 0.2 + dayIntensity * 0.3 + nightIntensity * 0.1;
        this.lightingSystem.ambientLight.intensity = ambientIntensity;
        
        // 環境光顏色調整
        if (dayIntensity > 0.3) {
            // 白天：暖色調環境光
            this.lightingSystem.ambientLight.color.setHex(0x404040);
        } else if (nightIntensity > 0.1) {
            // 夜晚：冷色調環境光
            this.lightingSystem.ambientLight.color.setHex(0x1a1a2e);
        } else {
            // 黃昏/黎明：紫色調環境光
            this.lightingSystem.ambientLight.color.setHex(0x2d1b69);
        }
        
        // 判斷是否為夜晚
        const isNight = nightIntensity > 0.1;
        
        // 更新建築窗戶光照
        if (this.buildingManager && this.buildingManager.updateBuildingLighting) {
            this.buildingManager.updateBuildingLighting(isNight, nightIntensity);
        }
        
        // 更新村民夜晚狀態
        if (this.villagerManager) {
            this.villagerManager.isNight = isNight;
        }
        
        // 更新天空和霧的顏色
        this.updateSkyAndFog(sunHeight, dayIntensity, nightIntensity);
    }

    // 更新天空和霧的顏色
    updateSkyAndFog(sunHeight, dayIntensity, nightIntensity) {
        const gameHour = this.lightingSystem.timeOfDay * 24;
        let skyColor, fogColor;
        
        if (gameHour >= 7 && gameHour <= 17) {
            // 白天：藍色天空
            skyColor = new THREE.Color(0x87CEEB);
            fogColor = new THREE.Color(0x87CEEB);
        } else if ((gameHour >= 5 && gameHour <= 7) || (gameHour >= 17 && gameHour <= 19)) {
            // 黃昏/黎明：橙紅色天空
            if (gameHour >= 5 && gameHour <= 7) {
                // 黎明：5:00-7:00
                if (gameHour <= 6) {
                    // 5:00-6:00：從夜晚深藍到橙紅
                    const progress = (gameHour - 5) / 1;
                    skyColor = new THREE.Color().lerpColors(
                        new THREE.Color(0x0f0f23), // 深藍色（夜晚）
                        new THREE.Color(0xff7f50), // 橙紅色（黃昏）
                        progress
                    );
                } else {
                    // 6:00-7:00：從橙紅到藍天
                    const progress = (gameHour - 6) / 1;
                    skyColor = new THREE.Color().lerpColors(
                        new THREE.Color(0xff7f50), // 橙紅色（黃昏）
                        new THREE.Color(0x87CEEB), // 藍色（白天）
                        progress
                    );
                }
            } else {
                // 黃昏：17:00-19:00，平滑過渡從藍天到夜晚
                const progress = (gameHour - 17) / 2; // 0到1，總共2小時
                
                if (progress <= 0.5) {
                    // 17:00-18:00：從藍天到橙紅（前半段）
                    const halfProgress = progress * 2; // 0到1
                    skyColor = new THREE.Color().lerpColors(
                        new THREE.Color(0x87CEEB), // 藍色（白天）
                        new THREE.Color(0xff7f50), // 橙紅色（黃昏）
                        halfProgress
                    );
                } else {
                    // 18:00-19:00：從橙紅到深藍（後半段）
                    const halfProgress = (progress - 0.5) * 2; // 0到1
                    skyColor = new THREE.Color().lerpColors(
                        new THREE.Color(0xff7f50), // 橙紅色（黃昏）
                        new THREE.Color(0x0f0f23), // 深藍色（夜晚）
                        halfProgress
                    );
                }
            }
            fogColor = skyColor.clone();
        } else {
            // 夜晚：深藍色天空
            skyColor = new THREE.Color(0x0f0f23);
            fogColor = new THREE.Color(0x0f0f23);
        }
        
        // 更新渲染器背景色
        this.renderer.setClearColor(skyColor);
        
        // 更新霧的顏色
        if (this.scene.fog) {
            this.scene.fog.color.copy(fogColor);
        }
        
        // 通知相機控制器更新霧的顏色
        if (this.cameraController && this.cameraController.updateFogColor) {
            this.cameraController.updateFogColor(fogColor);
        }
    }

    setupGameSystems() {
        // 初始化遊戲系統
        this.grid = new Grid(200); // 改為200x200網格
        this.buildingManager = new BuildingManager(this.grid, this.scene);
        this.villagerManager = new VillagerManager(this.grid, this.scene, this.buildingManager);
        this.treeManager = new TreeManager(this.grid, this.scene); // 移除樹木數量參數，改為自動計算
        
        // 設置建築管理器的樹木管理器引用
        this.buildingManager.setTreeManager(this.treeManager);
    }

    setupInitialBuildings() {
        // 在世界中心建造第一個城堡（適應200x200網格）
        const centerX = 100;
        const centerY = 100;
        
        // 清除城堡建造位置的樹木（較小範圍，只清理建築本身需要的空間）
        this.treeManager.clearTreesInArea(centerX, centerY, 8);
        
        const result = this.buildingManager.buildCastle(centerX - 3, centerY - 3);
        if (result.success) {
            // 立即設置第一棟城堡
            this.villagerManager.firstCastle = result.building;
            this.villagerManager.firstCastleBeingBuilt = true;
            
            // 立即確保城堡周圍有足夠的樹木資源
            this.ensureTreesAroundCastle(centerX, centerY);
            
            // 生成初始村民（增加到5個，確保有足夠的工人建造城堡）
            const castlePos = result.building.getWorldPosition();
            for (let i = 0; i < 5; i++) {
                const villagerX = castlePos.x + (Math.random() - 0.5) * 10;
                const villagerZ = castlePos.z + (Math.random() - 0.5) * 10;
                this.villagerManager.createVillager(villagerX, villagerZ);
            }
            
            // 在村民創建後立即啟動第一棟城堡建造模式
            this.villagerManager.startFirstCastleConstruction();
        } else {
            // 如果失敗，逐步擴大清理範圍並重試
            for (let clearRadius = 15; clearRadius <= 50; clearRadius += 10) {
                this.treeManager.clearTreesInArea(centerX, centerY, clearRadius);
                
                const retryResult = this.buildingManager.buildCastle(centerX - 3, centerY - 3);
                if (retryResult.success) {
                    // 立即設置第一棟城堡
                    this.villagerManager.firstCastle = retryResult.building;
                    this.villagerManager.firstCastleBeingBuilt = true;
                    
                    this.ensureTreesAroundCastle(centerX, centerY);
                    
                    // 生成初始村民（增加到5個，確保有足夠的工人建造城堡）
                    const castlePos = retryResult.building.getWorldPosition();
                    for (let i = 0; i < 5; i++) {
                        const villagerX = castlePos.x + (Math.random() - 0.5) * 10;
                        const villagerZ = castlePos.z + (Math.random() - 0.5) * 10;
                        this.villagerManager.createVillager(villagerX, villagerZ);
                    }
                    
                    // 在村民創建後立即啟動第一棟城堡建造模式
                    this.villagerManager.startFirstCastleConstruction();
                    
                    return; // 成功後退出
                }
            }
        }
    }

    // 確保城堡周圍有足夠的樹木資源
    ensureTreesAroundCastle(centerX, centerY) {
        const minRadius = 15; // 內圈半徑，避免太靠近城堡
        const maxRadius = 60; // 外圈半徑，擴大搜索範圍
        const targetTreeCount = 80; // 增加目標樹木數量，確保有足夠資源
        
        // 計算現有樹木數量
        let currentTreeCount = 0;
        for (let x = centerX - maxRadius; x <= centerX + maxRadius; x++) {
            for (let y = centerY - maxRadius; y <= centerY + maxRadius; y++) {
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (distance >= minRadius && distance <= maxRadius) {
                    if (this.grid.isValidPosition(x, y) && this.treeManager.hasTreeAt(x, y)) {
                        currentTreeCount++;
                    }
                }
            }
        }
        
        // 如果樹木不足，按聚集方式補充樹木
        if (currentTreeCount < targetTreeCount) {
            const treesToAdd = targetTreeCount - currentTreeCount;
            let addedTrees = 0;
            
            // 生成3-5個聚集點
            const numClusters = Math.min(5, Math.max(3, Math.ceil(treesToAdd / 15)));
            const treesPerCluster = Math.ceil(treesToAdd / numClusters);
            
            for (let cluster = 0; cluster < numClusters && addedTrees < treesToAdd; cluster++) {
                // 為每個聚集點選擇位置（避開城堡中心）
                let clusterCenterX, clusterCenterY;
                let attempts = 0;
                
                do {
                    const angle = (cluster / numClusters) * Math.PI * 2 + Math.random() * 0.5; // 均勻分佈 + 隨機偏移
                    const radius = minRadius + Math.random() * (maxRadius - minRadius);
                    clusterCenterX = Math.floor(centerX + Math.cos(angle) * radius);
                    clusterCenterY = Math.floor(centerY + Math.sin(angle) * radius);
                    attempts++;
                } while ((!this.grid.isValidPosition(clusterCenterX, clusterCenterY) || 
                         this.grid.isOccupied(clusterCenterX, clusterCenterY)) && attempts < 10);
                
                if (attempts >= 10) continue; // 跳過無法找到合適位置的聚集點
                
                // 在聚集點周圍生成樹木
                let clusterTrees = 0;
                let clusterAttempts = 0;
                const maxClusterAttempts = treesPerCluster * 3;
                
                while (clusterTrees < treesPerCluster && 
                       clusterAttempts < maxClusterAttempts && 
                       addedTrees < treesToAdd) {
                    
                    // 使用較小的聚集半徑，讓樹木更密集
                    const clusterRadius = 3 + Math.random() * 8; // 3-11格的聚集半徑
                    const clusterAngle = Math.random() * Math.PI * 2;
                    
                    const x = Math.floor(clusterCenterX + Math.cos(clusterAngle) * clusterRadius);
                    const y = Math.floor(clusterCenterY + Math.sin(clusterAngle) * clusterRadius);
                    
                    // 確保在指定範圍內
                    const distanceFromCastle = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (distanceFromCastle >= minRadius && distanceFromCastle <= maxRadius) {
                        if (this.grid.isValidPosition(x, y) && 
                            !this.grid.isOccupied(x, y) && 
                            !this.treeManager.hasTreeAt(x, y)) {
                            
                            if (this.treeManager.addTreeAt(x, y)) {
                                clusterTrees++;
                                addedTrees++;
                            }
                        }
                    }
                    clusterAttempts++;
                }
                
            }
        }
    }

    // 更新世界
    update(currentTime) {
        if (this.isPaused) return;
        
        const deltaTime = currentTime - this.lastUpdateTime;
        const adjustedDeltaTime = deltaTime * this.gameSpeed;
        
        // 更新光影系統
        this.updateLighting(currentTime);
        
        // 計算是否為夜晚
        const gameHour = this.lightingSystem.timeOfDay * 24;
        const isNight = gameHour < 5 || gameHour > 19;
        
        // 設定全局遊戲時間供村民系統使用
        window.gameTime = {
            currentHour: gameHour,
            timeOfDay: this.lightingSystem.timeOfDay,
            isNight: isNight
        };
        
        // 更新相機
        this.cameraController.update();
        
        // 計算調整後的時間（考慮遊戲速度）
        const adjustedCurrentTime = currentTime * this.gameSpeed;
        
        // 更新遊戲系統
        this.buildingManager.update(adjustedCurrentTime, isNight);
        this.villagerManager.update(adjustedCurrentTime, this.treeManager, isNight, this.gameSpeed);
        this.treeManager.update();
        
        // AI建造策略
        this.updateAIBuilder(adjustedCurrentTime);
        
        // 檢查村民生產
        this.handleVillagerSpawning(adjustedCurrentTime);
        
        this.lastUpdateTime = currentTime;
    }

    // 處理村民生產
    handleVillagerSpawning(currentTime) {
        const maxPopulation = this.buildingManager.getTotalPopulationSupport();
        const currentPopulation = this.villagerManager.getVillagerCount();
        
        if (currentPopulation >= maxPopulation) {
            return; // 人口已滿
        }
        
        // 簡化村民生產：每10秒自動生產一個村民（不消耗食物）
        // 但只有建造完成的城堡才能生產村民
        this.buildingManager.castles.forEach(castle => {
            // 檢查城堡是否建造完成
            if (!castle.isComplete) {
                return; // 城堡還在建造中，無法生產村民
            }
            
            if (currentTime - castle.lastVillagerSpawn >= 10000) { // 10秒間隔
                castle.lastVillagerSpawn = currentTime;
                
                // 在城堡附近生成村民
                const castleWorldPos = castle.getWorldPosition();
                const spawnPos = this.findSpawnPositionNearCastle(castleWorldPos);
                
                if (spawnPos) {
                    this.villagerManager.createVillager(spawnPos.x, spawnPos.z);
                    // 已建造完成的城堡生產了新村民
                }
            }
        });
    }

    // 在城堡附近找到生成位置
    findSpawnPositionNearCastle(castlePos) {
        for (let radius = 2; radius <= 8; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const x = castlePos.x + Math.cos(angle) * radius;
                const z = castlePos.z + Math.sin(angle) * radius;
                
                // 檢查位置是否可用
                const gridPos = this.grid.worldToGrid(x, z);
                if (this.grid.isValidPosition(gridPos.x, gridPos.y) && 
                    !this.grid.isOccupied(gridPos.x, gridPos.y)) {
                    return { x, z };
                }
            }
        }
        return null;
    }

    // 渲染世界
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // 嘗試建造建築
    tryBuildBuilding(type, worldX, worldZ) {
        const gridPos = this.grid.worldToGrid(worldX, worldZ);
        let result;
        let cost;

        switch (type) {
            case 'castle':
                cost = 100;
                if (!this.villagerManager.consumeWood(cost)) {
                    return { success: false, message: '木材不足' };
                }
                result = this.buildingManager.buildCastle(gridPos.x - 3, gridPos.y - 3);
                break;

            case 'tower':
                cost = 10;
                if (!this.villagerManager.consumeWood(cost)) {
                    return { success: false, message: '木材不足' };
                }
                result = this.buildingManager.buildTower(gridPos.x - 1, gridPos.y - 1);
                break;

            case 'house':
                cost = 10;
                if (!this.villagerManager.consumeWood(cost)) {
                    return { success: false, message: '木材不足' };
                }
                result = this.buildingManager.buildHouse(gridPos.x - 2, gridPos.y - 2);
                break;

            case 'farm':
                cost = 3;
                if (!this.villagerManager.consumeWood(cost)) {
                    return { success: false, message: '木材不足' };
                }
                result = this.buildingManager.buildFarm(gridPos.x - 3, gridPos.y - 3);
                break;

            default:
                return { success: false, message: '未知的建築類型' };
        }

        if (!result.success) {
            // 建造失敗，退還木材
            this.villagerManager.woodInventory += cost;
        } else if (type === 'farm') {
            // 農田建造成功，重新分配村民
            this.villagerManager.reassignVillagersToFarms();
        }

        return result;
    }

    // 獲取遊戲狀態
    getGameState() {
        // 計算遊戲內時間
        const hours = Math.floor(this.lightingSystem.timeOfDay * 24);
        const minutes = Math.floor((this.lightingSystem.timeOfDay * 24 - hours) * 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        return {
            woodInventory: this.villagerManager.getWoodInventory(),
            population: this.villagerManager.getVillagerCount(),
            villagers: this.villagerManager.getVillagerCount(),
            farmWorkers: this.villagerManager.getFarmWorkerCount(),
            timeOfDay: timeString,
            buildings: {
                castles: this.buildingManager.castles.length,
                towers: this.buildingManager.towers.length,
                houses: this.buildingManager.houses.length,
                farms: this.buildingManager.farms.length
            },
            trees: {
                active: this.treeManager.getActiveTreeCount(),
                destroyed: this.treeManager.getDestroyedTreeCount()
            },
            isPaused: this.isPaused,
            gameSpeed: this.gameSpeed
        };
    }

    // 暫停/恢復遊戲
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.cameraController.pause();
        } else {
            this.cameraController.resume();
        }
        
        return this.isPaused;
    }

    // 調整遊戲速度
    setGameSpeed(speed) {
        this.gameSpeed = Math.max(0.1, Math.min(5, speed));
        return this.gameSpeed;
    }
    
    // 調試函數：檢查村民狀態
    debugVillagers() {
        if (this.villagerManager) {
            this.villagerManager.debugPrintAllVillagers();
            
            // 同時檢查建築狀態
            this.villagerManager.debugPrintAllBuildings();
            
            // 強制檢查村民可見性
            const isNight = this.lightingSystem.timeOfDay > 0.75 || this.lightingSystem.timeOfDay < 0.25;
            this.villagerManager.checkVillagerVisibility(isNight);
        } else {
            console.log('村民管理器尚未初始化');
        }
    }
    
    // 強制修復停滯的建築
    forceFixBuildings() {
        if (this.villagerManager) {
            return this.villagerManager.forceFixStuckBuildings();
        } else {
            console.log('村民管理器尚未初始化');
            return 0;
        }
    }

    // 調試工具：創建村民位置標記
    debugCreateMarkers() {
        if (this.villagerManager) {
            return this.villagerManager.debugCreateVillagerMarkers();
        } else {
            console.log('村民管理器尚未初始化');
            return 0;
        }
    }

    // 調試工具：移除村民標記
    debugRemoveMarkers() {
        if (this.villagerManager) {
            return this.villagerManager.debugRemoveVillagerMarkers();
        } else {
            console.log('村民管理器尚未初始化');
        }
    }

    // 修復村民材質問題
    debugFixMaterials() {
        if (this.villagerManager) {
            return this.villagerManager.debugFixVillagerMaterials();
        } else {
            console.log('村民管理器尚未初始化');
            return 0;
        }
    }

    // 重新創建問題村民
    debugRecreateVillagers() {
        if (this.villagerManager) {
            return this.villagerManager.debugRecreateVillagers();
        } else {
            console.log('村民管理器尚未初始化');
            return 0;
        }
    }

    // 調試工具：清理超界建築和修復被困村民
    debugCleanupOutOfBounds() {
        if (this.villagerManager) {
            return this.villagerManager.debugCleanupOutOfBoundsBuildings();
        } else {
            console.log('村民管理器尚未初始化');
            return { removedBuildings: 0, rescuedWorkers: 0 };
        }
    }

    // 調試工具：強制修復所有問題
    debugFixAll() {
        console.log('=== 執行全面修復 ===');
        
        if (!this.villagerManager) {
            console.log('村民管理器尚未初始化');
            return;
        }
        
        // 1. 清理超界建築
        const cleanupResult = this.villagerManager.debugCleanupOutOfBoundsBuildings();
        
        // 2. 修復建築狀態
        this.villagerManager.fixBrokenBuildings();
        
        // 3. 修復村民材質
        const materialsFixed = this.villagerManager.debugFixVillagerMaterials();
        
        // 4. 重新創建問題村民
        const villagersRecreated = this.villagerManager.debugRecreateVillagers();
        
        // 5. 強制修復停滯建築
        const stuckBuildingsFixed = this.villagerManager.forceFixStuckBuildings();
        
        // 6. 修復卡住的砍樹村民
        const stuckTreeVillagersFixed = this.villagerManager.debugFixStuckTreeVillagers();
        
        // 7. 重新檢查可見性
        this.villagerManager.checkVillagerVisibility(false);
        
        console.log('=== 全面修復完成 ===');
        console.log(`清理建築: ${cleanupResult.removedBuildings}, 拯救工人: ${cleanupResult.rescuedWorkers}`);
        console.log(`修復材質: ${materialsFixed}, 重建村民: ${villagersRecreated}, 修復停滯建築工人: ${stuckBuildingsFixed}`);
        console.log(`修復卡住砍樹村民: ${stuckTreeVillagersFixed}`);
        
        return {
            cleanupResult,
            materialsFixed,
            villagersRecreated,
            stuckBuildingsFixed,
            stuckTreeVillagersFixed
        };
    }

    // 調試工具：修復卡住的砍樹村民
    debugFixStuckTreeVillagers() {
        if (this.villagerManager) {
            return this.villagerManager.debugFixStuckTreeVillagers();
        } else {
            console.log('村民管理器尚未初始化');
            return 0;
        }
    }

    // 處理窗口大小變化
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // 銷毀世界
    destroy() {
        // 銷毀所有遊戲對象
        if (this.treeManager) {
            this.treeManager.destroyAll();
        }
        
        if (this.villagerManager) {
            for (const villager of this.villagerManager.getAllVillagers()) {
                villager.destroy();
            }
        }
        
        if (this.buildingManager) {
            for (const building of this.buildingManager.getAllBuildings()) {
                building.destroy();
            }
        }
        
        // 清理場景
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }
        
        // 清理渲染器
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
    
    // AI建造策略更新
    updateAIBuilder(currentTime) {
        // 檢查是否為夜晚時間（18:00後），如果是則禁止AI建造
        if (this.isNightTime()) {
            return;
        }
        
        // 檢查是否到了建造時間
        if (currentTime - this.aiBuilder.lastBuildAttempt < this.aiBuilder.buildInterval) {
            return;
        }
        
        this.aiBuilder.lastBuildAttempt = currentTime;
        
        // 獲取當前資源和建築數量
        const wood = this.villagerManager.getWoodInventory();
        const currentBuildings = this.buildingManager.getBuildingCounts();
        const limits = this.buildingManager.getBuildingLimits();
        
        // 建造優先級策略：城堡 > 塔樓 > 房舍 > 農田
        // 但如果高優先級建築被上限阻擋，就先建低級建築解鎖上限
        let buildSuccess = false;
        
        // 1. 優先檢查城堡：未達上限就等100木材建造城堡
        if (currentBuildings.castles < limits.castle) {
            if (wood >= 100) {
                buildSuccess = this.aiBuildCastle();
            } else {
                return; // 等待更多木材，不建造其他建築
            }
        } 
        // 2. 城堡已達上限，檢查塔樓：未達上限就等10木材建造塔樓
        else if (currentBuildings.towers < limits.tower) {
            if (wood >= 10) {
                buildSuccess = this.aiBuildTower();
            } else {
                return; // 等待更多木材，不建造其他建築
            }
        }
        // 3. 塔樓被上限阻擋，檢查房舍：未達上限就等10木材建造房舍來解鎖塔樓
        else if (currentBuildings.houses < limits.house) {
            if (wood >= 10) {
                buildSuccess = this.aiBuildHouse();
            } else {
                return; // 等待更多木材，不建造其他建築
            }
        } 
        // 4. 房舍也被上限阻擋，建造農田來解鎖房舍（3木材）
        else if (wood >= 3) {
            buildSuccess = this.aiBuildFarm();
        } 
        else {
            return; // 木材不足，等待更多資源
        }
        
        // 如果建造失敗，調整建造間隔避免過於頻繁的嘗試
        if (!buildSuccess && (wood >= 5)) {
            this.aiBuilder.buildInterval = Math.min(5000, this.aiBuilder.buildInterval * 1.2); // 逐漸增加間隔
        } else if (buildSuccess) {
            this.aiBuilder.buildInterval = 1000; // 建造成功後重置間隔
        }
    }

    // AI建造城堡
    aiBuildCastle() {
        const castles = this.buildingManager.castles;
        let buildPos = null;
        
        if (castles.length === 0) {
            // 第一個城堡在中心
            buildPos = { x: 97, y: 97 }; // 200x200網格的中心附近
        } else {
            // 找到距離現有城堡較遠的位置
            buildPos = this.findBuildPositionNearCastle(6, false); // 城堡6x6，不是農田
        }
        
        if (buildPos) {
            const result = this.buildingManager.buildCastle(buildPos.x, buildPos.y);
            if (result.success) {
                this.villagerManager.consumeWood(100);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // AI建造塔樓
    aiBuildTower() {
        const buildPos = this.findBuildPositionNearCastle(2, false); // 塔樓2x2，不是農田
        
        if (buildPos) {
            const result = this.buildingManager.buildTower(buildPos.x, buildPos.y);
            if (result.success) {
                this.villagerManager.consumeWood(10);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // AI建造房舍
    aiBuildHouse() {
        const buildPos = this.findBuildPositionNearCastle(4, false); // 房舍4x4，不是農田
        
        if (buildPos) {
            const result = this.buildingManager.buildHouse(buildPos.x, buildPos.y);
            if (result.success) {
                this.villagerManager.consumeWood(10);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // AI建造農田
    aiBuildFarm() {
        const buildPos = this.findBuildPositionNearCastle(6, true); // 農田6x6，是農田
        
        if (buildPos) {
            const result = this.buildingManager.buildFarm(buildPos.x, buildPos.y);
            if (result.success) {
                this.villagerManager.consumeWood(3);
                
                // 重新分配村民到新建造的農田
                this.villagerManager.reassignVillagersToFarms();
                
                // 更新地形顏色以顯示農田
                setTimeout(() => {
                    this.updateFarmColors();
                }, 100);
                
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // 找到靠近城堡的建造位置
    findBuildPositionNearCastle(buildingSize = 1, isFarm = false, customMaxRadius = null) {
        const castles = this.buildingManager.castles;
        if (castles.length === 0) return null;
        
        // 選擇最新的城堡作為參考點
        const referenceCastle = castles[castles.length - 1];
        const castlePos = { x: referenceCastle.x + 3, y: referenceCastle.y + 3 }; // 城堡中心
        
        // 在城堡周圍螺旋搜索合適的建造位置
        // 對於非農田建築，需要更大的搜索範圍以滿足間距要求
        const maxRadius = customMaxRadius || (isFarm ? 30 : 60); // 增加非農田建築的搜索範圍
        const minRadius = isFarm ? 8 : 12; // 非農田建築從更遠處開始搜索
        
        // 先嘗試較近的位置，再嘗試較遠的位置
        for (let radius = minRadius; radius <= maxRadius; radius += 1) {
            // 在每個半徑上嘗試多個角度
            const angleStep = Math.PI / 24; // 更細的角度步進，15度一步
            const numAngles = Math.floor(2 * Math.PI / angleStep);
            
            // 隨機化角度起始點，避免總是從同一方向開始
            const startAngle = Math.random() * angleStep;
            
            for (let i = 0; i < numAngles; i++) {
                const angle = startAngle + i * angleStep;
                const x = Math.floor(castlePos.x + Math.cos(angle) * radius);
                const y = Math.floor(castlePos.y + Math.sin(angle) * radius);
                
                // 檢查位置是否在網格範圍內
                if (x >= 0 && y >= 0 && x < this.grid.size - buildingSize && y < this.grid.size - buildingSize) {
                    // 檢查指定大小的建築位置
                    const canBuild = this.grid.canBuild(x, y, buildingSize, buildingSize);
                    const hasNearbyBuilding = this.grid.checkBuildingCondition(x, y, buildingSize, buildingSize);
                    const hasProperSpacing = this.grid.checkBuildingSpacing(x, y, buildingSize, buildingSize, isFarm);
                    
                    if (canBuild && hasNearbyBuilding && hasProperSpacing) {
                        return { x, y };
                    }
                }
            }
        }
        
        // 如果找不到位置，嘗試在更大的範圍內搜索（僅限農田）
        if (isFarm && !customMaxRadius && maxRadius < 50) {
            return this.findBuildPositionNearCastle(buildingSize, isFarm, 50);
        }
        
        return null;
    }
}
