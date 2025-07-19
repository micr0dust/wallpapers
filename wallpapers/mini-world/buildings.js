// 建築基礎類別
class Building {
    constructor(x, y, grid, scene) {
        this.x = x;
        this.y = y;
        this.grid = grid;
        this.scene = scene;
        this.mesh = null;
        this.id = this.generateId();
        
        // 建造進度系統
        this.isUnderConstruction = true;
        this.buildingParts = []; // 存儲建築的各個部分
        this.currentBuildStep = 0; // 當前建造步驟
        this.totalBuildSteps = 0; // 總建造步驟數
        this.lastBuildTime = 0;
        this.buildStepInterval = 1000; // 每1000毫秒（1秒）建造一個部分
        this.isComplete = false; // 建築是否完成
        
        // 建造工人系統
        this.constructionWorkers = []; // 正在建造此建築的村民
        this.requiredWorkers = 1; // 需要的最少工人數（預設1個）
        this.maxWorkers = 3; // 最大工人數（預設3個）
        
        // 建築建構函式，設定基本屬性
    }

    generateId() {
        return `${this.constructor.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 抽象方法，子類別必須實現
    create() {
        throw new Error('create() method must be implemented');
    }

    // 創建建築部分但不立即顯示
    createBuildingParts() {
        throw new Error('createBuildingParts() method must be implemented');
    }

    // 更新建造進度
    updateConstruction(currentTime) {
        if (!this.isUnderConstruction || this.isComplete) return;

        // 檢查當前建造步驟是否有村民在位
        const hasWorker = this.checkWorkerAtCurrentPart();
        
        if (!hasWorker) {
            // 沒有村民在當前建造部件位置，暫停建造
            return;
        }

        // 如果這是第一個部件（currentBuildStep === 0），立即完成建造
        if (this.currentBuildStep === 0) {
            // 第一個部件立即完成建造
            this.completeBuildingCurrentPart();
            this.lastBuildTime = currentTime;
            return;
        }

        // 如果這是第一次調用非第一部件，立即開始建造當前部分
        if (this.currentBuildStep < this.totalBuildSteps && this.lastBuildTime === 0) {
            this.startBuildingCurrentPart();
            this.lastBuildTime = currentTime;
            return;
        }

        // 檢查是否該完成當前部分的建造
        if (currentTime - this.lastBuildTime >= this.buildStepInterval) {
            this.completeBuildingCurrentPart();
            this.lastBuildTime = currentTime;
        }
    }

    // 檢查當前建造部件是否有村民在位
    checkWorkerAtCurrentPart() {
        if (this.currentBuildStep >= this.totalBuildSteps) return false;
        
        const currentPartPosition = this.getPartBuildPosition(this.currentBuildStep);
        if (!currentPartPosition) {
            return false;
        }

        
        // 檢查是否有村民在該位置附近
        const nearbyWorkers = this.constructionWorkers.filter(worker => {
            const workerGridPos = this.grid.worldToGrid(worker.x, worker.z);
            const distance = Math.abs(workerGridPos.x - currentPartPosition.x) + 
                           Math.abs(workerGridPos.y - currentPartPosition.y);
            return distance <= 2; // 允許2格範圍內
        });

        return nearbyWorkers.length > 0;
    }

    // 開始建造當前部分（顯示建造效果）
    startBuildingCurrentPart() {
        // 開始建造下一個建築部分
        // 可以在這裡添加建造視覺效果
    }

    // 完成當前部分的建造
    completeBuildingCurrentPart() {
        // 嘗試完成建築部分
        
        // 顯示當前建造步驟的部分
        const part = this.buildingParts[this.currentBuildStep];
        if (part && part.visible !== undefined) {
            part.visible = true;
        }

        // 完成建造當前部分
        
        this.currentBuildStep++;
        
        // 更新建築進度
        
        // 檢查是否已完成所有步驟
        if (this.currentBuildStep >= this.totalBuildSteps) {
            // 建造完成
            // 建築建造完成！設置完成狀態
            this.isUnderConstruction = false;
            this.isComplete = true;
            this.onConstructionComplete();
            return;
        }

        // 如果還有更多部件要建造，指派村民到下一個位置
        this.assignWorkersToCurrentPart();
    }

    // 獲取特定建造部件的建造位置（需要在子類中重寫）
    getPartBuildPosition(partIndex) {
        // 預設返回建築中心位置
        return {
            x: this.x + Math.floor(this.width / 2),
            y: this.y + Math.floor(this.height / 2),
            z: 0 // 地面高度
        };
    }

    // 指派工人到當前建造部件位置
    assignWorkersToCurrentPart() {
        if (this.currentBuildStep >= this.totalBuildSteps) return;
        
        const buildPosition = this.getPartBuildPosition(this.currentBuildStep);
        if (!buildPosition) {
            return;
        }

        
        // 重新指派所有建造工人到當前建造步驟位置
        for (const worker of this.constructionWorkers) {
            if (worker.state === 'constructing') {
                worker.assignedToPart = this.currentBuildStep;
                worker.targetBuildPosition = buildPosition;
                
                // 讓工人移動到建造位置
                worker.createPath(buildPosition.x, buildPosition.y);
            }
        }
    }

    // 建造完成時的回調
    onConstructionComplete() {
        // 釋放所有建造工人
        this.releaseAllWorkers();
        // 可以在子類中重寫此方法
        // 建築完成通知
    }

    // 建造工人管理
    addWorker(villager) {
        if (this.constructionWorkers.length < this.maxWorkers && !this.constructionWorkers.includes(villager)) {
            this.constructionWorkers.push(villager);
            // 工人開始協助建造
            
            // 立即指派工人到當前建造部件位置
            setTimeout(() => {
                this.assignWorkersToCurrentPart();
            }, 100); // 短延遲確保狀態更新完成
            
            return true;
        }
        return false;
    }

    removeWorker(villager) {
        const index = this.constructionWorkers.indexOf(villager);
        if (index !== -1) {
            this.constructionWorkers.splice(index, 1);
            // 工人停止協助建造
            return true;
        }
        return false;
    }

    releaseAllWorkers() {
        // 通知所有工人建造完成，他們可以回到其他工作
        const workersToRelease = [...this.constructionWorkers]; // 創建副本以避免在遍歷時修改陣列
        
        for (const worker of workersToRelease) {
            if (worker.state === 'constructing') {
                worker.state = 'idle';
                worker.constructionBuilding = null;
                // 清除所有建造相關的屬性
                worker.workPosition = null;
                worker.assignedToPart = null;
                worker.targetBuildPosition = null;
                worker.target = null;
                worker.path = [];
                // 工人建造完成，返回閒置狀態
            }
        }
        
        // 清空工人列表
        this.constructionWorkers = [];
        // 所有工人已釋放，準備重新分配工作
    }

    needsMoreWorkers() {
        const needs = this.isUnderConstruction && this.constructionWorkers.length < this.requiredWorkers;
        return needs;
    }

    canAcceptMoreWorkers() {
        return this.isUnderConstruction && this.constructionWorkers.length < this.maxWorkers;
    }

    getWorkerPositions() {
        // 返回建築周圍的工作位置
        const positions = [];
        const baseX = this.x + Math.floor(this.width / 2);
        const baseY = this.y + Math.floor(this.height / 2);
        
        // 在建築周圍生成工作位置
        for (let i = 0; i < this.maxWorkers; i++) {
            const angle = (i / this.maxWorkers) * Math.PI * 2;
            const radius = Math.max(this.width, this.height) / 2 + 2;
            const x = baseX + Math.cos(angle) * radius;
            const y = baseY + Math.sin(angle) * radius;
            positions.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return positions;
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.buildingParts = [];
    }

    getWorldPosition() {
        return this.grid.gridToWorld(this.x, this.y);
    }
}

// 城堡類別
class Castle extends Building {
    constructor(x, y, grid, scene) {
        super(x, y, grid, scene);
        this.width = 6;
        this.height = 6;
        this.lastVillagerSpawn = 0;
        this.villagerSpawnInterval = 10000; // 10秒
        this.populationSupport = 5; // 支援5人口
        
        // 城堡需要更多工人來建造
        this.requiredWorkers = 2; // 需要至少2個工人
        this.maxWorkers = 4; // 最大4個工人
        
        this.create();
    }

    create() {
        const group = new THREE.Group();
        const worldPos = this.getWorldPosition();

        // 創建建築部分但不顯示
        this.createBuildingParts(group, worldPos);
        
        this.mesh = group;
        this.scene.add(group);

        // 在網格中標記佔用
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts(group, worldPos) {
        this.buildingParts = [];

        // 第1層：底部石頭色立方體 (6x6x2) - 基礎層
        const baseGeometry = new THREE.BoxGeometry(6, 2, 6);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.position.set(worldPos.x, -1.95, worldPos.z); // 稍微抬高避免Z-fighting
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.visible = false;
        group.add(baseMesh);
        this.buildingParts.push(baseMesh);

        // 第2層：中層石頭色立方體 (6x6x2) 
        const midGeometry = new THREE.BoxGeometry(6, 2, 6);
        const midMaterial = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const midMesh = new THREE.Mesh(midGeometry, midMaterial);
        midMesh.position.set(worldPos.x, 0, worldPos.z);
        midMesh.castShadow = true;
        midMesh.receiveShadow = true;
        midMesh.visible = false;
        group.add(midMesh);
        this.buildingParts.push(midMesh);

        // 第3層：頂層石頭色立方體 (6x6x2)
        const topGeometry = new THREE.BoxGeometry(6, 2, 6);
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const topMesh = new THREE.Mesh(topGeometry, topMaterial);
        topMesh.position.set(worldPos.x, 2, worldPos.z);
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        topMesh.visible = false;
        group.add(topMesh);
        this.buildingParts.push(topMesh);

        // 第4層：四個角落的塔樓底部
        const towerPositions = [
            { x: worldPos.x - 2.5, z: worldPos.z - 2.5 },
            { x: worldPos.x + 2.5, z: worldPos.z - 2.5 },
            { x: worldPos.x - 2.5, z: worldPos.z + 2.5 },
            { x: worldPos.x + 2.5, z: worldPos.z + 2.5 }
        ];

        towerPositions.forEach((pos, index) => {
            // 塔樓底部
            const towerBottomGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 12);
            const towerBottomMaterial = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
            const towerBottomMesh = new THREE.Mesh(towerBottomGeometry, towerBottomMaterial);
            towerBottomMesh.position.set(pos.x, -0.5, pos.z);
            towerBottomMesh.castShadow = true;
            towerBottomMesh.receiveShadow = true;
            towerBottomMesh.visible = false;
            group.add(towerBottomMesh);
            this.buildingParts.push(towerBottomMesh);
        });

        // 第5層：四個角落的塔樓頂部
        towerPositions.forEach((pos, index) => {
            // 塔樓頂部
            const towerTopGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 12);
            const towerTopMaterial = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
            const towerTopMesh = new THREE.Mesh(towerTopGeometry, towerTopMaterial);
            towerTopMesh.position.set(pos.x, 2.5, pos.z);
            towerTopMesh.castShadow = true;
            towerTopMesh.receiveShadow = true;
            towerTopMesh.visible = false;
            group.add(towerTopMesh);
            this.buildingParts.push(towerTopMesh);
        });

        // 第6層：主屋頂
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-3, 0);
        roofShape.lineTo(3, 0);
        roofShape.lineTo(0, 2.6);
        roofShape.lineTo(-3, 0);
        
        const extrudeSettings = {
            depth: 6,
            bevelEnabled: false
        };
        
        const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(worldPos.x, 3.5, worldPos.z - 3);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.visible = false;
        group.add(roofMesh);
        this.buildingParts.push(roofMesh);

        // 第7層：塔樓屋頂
        towerPositions.forEach((pos, index) => {
            // 塔樓屋頂
            const towerRoofGeometry = new THREE.ConeGeometry(0.6, 1.5, 12);
            const towerRoofMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            const towerRoofMesh = new THREE.Mesh(towerRoofGeometry, towerRoofMaterial);
            towerRoofMesh.position.set(pos.x, 4.75, pos.z);
            towerRoofMesh.castShadow = true;
            towerRoofMesh.visible = false;
            group.add(towerRoofMesh);
            this.buildingParts.push(towerRoofMesh);
        });

        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0; // 從0開始，讓建造系統立即啟動

        // 稍後添加窗戶（建造完成後）
        this.windowsCreated = false;
    }

    onConstructionComplete() {
        super.onConstructionComplete();
        
        // 建造完成後添加窗戶
        if (!this.windowsCreated) {
            this.createCastleWindows(this.mesh, this.getWorldPosition());
            this.windowsCreated = true;
        }
    }

    // 創建城堡窗戶
    createCastleWindows(group, worldPos) {
        this.windows = [];
        
        // 四面牆的窗戶位置
        const windowConfigs = [
            // 前面 (Z-)
            { x: -1.5, y: 2, z: -3.01, rotY: 0 },
            { x: 1.5, y: 2, z: -3.01, rotY: 0 },
            { x: 0, y: 3.5, z: -3.01, rotY: 0 },
            // 後面 (Z+)
            { x: -1.5, y: 2, z: 3.01, rotY: Math.PI },
            { x: 1.5, y: 2, z: 3.01, rotY: Math.PI },
            { x: 0, y: 3.5, z: 3.01, rotY: Math.PI },
            // 左面 (X-)
            { x: -3.01, y: 2, z: -1.5, rotY: Math.PI/2 },
            { x: -3.01, y: 2, z: 1.5, rotY: Math.PI/2 },
            { x: -3.01, y: 3.5, z: 0, rotY: Math.PI/2 },
            // 右面 (X+)
            { x: 3.01, y: 2, z: -1.5, rotY: -Math.PI/2 },
            { x: 3.01, y: 2, z: 1.5, rotY: -Math.PI/2 },
            { x: 3.01, y: 3.5, z: 0, rotY: -Math.PI/2 }
        ];

        windowConfigs.forEach(config => {
            // 窗戶框架
            const windowGeometry = new THREE.PlaneGeometry(0.6, 0.8);
            const windowMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffff88,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                emissive: 0x000000 // MeshLambertMaterial 支援 emissive
            });
            
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            
            windowMesh.position.set(
                worldPos.x + config.x, 
                config.y, 
                worldPos.z + config.z
            );
            windowMesh.rotation.y = config.rotY;
            
            group.add(windowMesh);
            this.windows.push(windowMesh);
        });
    }

    // 更新窗戶光照（由光照系統調用）
    updateWindowLighting(isNight, lightIntensity) {
        if (this.windows) {
            this.windows.forEach(window => {
                if (window.material) {
                    if (isNight) {
                        window.material.opacity = 1.0;
                        window.material.color.setHex(0xffcc00);
                        window.material.emissive.setHex(0x664400); // 添加自發光
                    } else {
                        window.material.opacity = 0.4;
                        window.material.color.setHex(0x88ccff);
                        window.material.emissive.setHex(0x000000); // 移除自發光
                    }
                }
            });
        }
    }

    // 獲取特定建造部件的建造位置
    getPartBuildPosition(partIndex) {
        const centerX = this.x + 3; // 城堡中心X
        const centerY = this.y + 3; // 城堡中心Y
        
        // 根據建造步驟返回不同的建造位置，所有部件都在地面層（z=0）
        switch(partIndex) {
            case 0: // 第1層：底部石頭色立方體
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 1: // 第2層：中層石頭色立方體
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 2: // 第3層：頂層石頭色立方體
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 3: // 第4層：四個角落的塔樓底部 (第1個塔樓)
                return { x: this.x + 1, y: this.y + 1, z: 0 }; // 地面層
                
            case 4: // 第4層：四個角落的塔樓底部 (第2個塔樓)
                return { x: this.x + 5, y: this.y + 1, z: 0 }; // 地面層
                
            case 5: // 第4層：四個角落的塔樓底部 (第3個塔樓)
                return { x: this.x + 1, y: this.y + 5, z: 0 }; // 地面層
                
            case 6: // 第4層：四個角落的塔樓底部 (第4個塔樓)
                return { x: this.x + 5, y: this.y + 5, z: 0 }; // 地面層
                
            case 7: // 第5層：四個角落的塔樓頂部 (第1個)
                return { x: this.x + 1, y: this.y + 1, z: 0 }; // 地面層
                
            case 8: // 第5層：四個角落的塔樓頂部 (第2個)
                return { x: this.x + 5, y: this.y + 1, z: 0 }; // 地面層
                
            case 9: // 第5層：四個角落的塔樓頂部 (第3個)
                return { x: this.x + 1, y: this.y + 5, z: 0 }; // 地面層
                
            case 10: // 第5層：四個角落的塔樓頂部 (第4個)
                return { x: this.x + 5, y: this.y + 5, z: 0 }; // 地面層
                
            case 11: // 第6層：主屋頂
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 12: // 第7層：塔樓屋頂 (第1個)
                return { x: this.x + 1, y: this.y + 1, z: 0 }; // 地面層
                
            case 13: // 第7層：塔樓屋頂 (第2個)
                return { x: this.x + 5, y: this.y + 1, z: 0 }; // 地面層
                
            case 14: // 第7層：塔樓屋頂 (第3個)
                return { x: this.x + 1, y: this.y + 5, z: 0 }; // 地面層
                
            case 15: // 第7層：塔樓屋頂 (第4個)
                return { x: this.x + 5, y: this.y + 5, z: 0 }; // 地面層
                
            default:
                return { x: centerX, y: centerY, z: 0 };
        }
    }

    // 檢查是否可以生產村民（只有建造完成才能生產）
    canSpawnVillager() {
        return this.isComplete; // 只有建造完成才能生產村民
    }

    // 生產村民（只有建造完成才能生產）
    spawnVillager() {
        if (!this.isComplete) {
            return false; // 建造未完成，無法生產村民
        }
        return true; // 建造完成，可以生產村民
    }

    // 獲取實際人口支援（只有建造完成才提供）
    getPopulationSupport() {
        return this.isComplete ? this.populationSupport : 0;
    }
}

// 塔樓類別
class Tower extends Building {
    constructor(x, y, grid, scene, factionColor = 0xff0000) {
        super(x, y, grid, scene);
        this.width = 2;
        this.height = 2;
        this.factionColor = factionColor;
        
        // 塔樓只需要1個工人
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        
        this.create();
    }

    create() {
        const group = new THREE.Group();
        const worldPos = this.getWorldPosition();

        // 創建建築部分但不顯示
        this.createBuildingParts(group, worldPos);
        
        this.mesh = group;
        this.scene.add(group);

        // 在網格中標記佔用
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts(group, worldPos) {
        this.buildingParts = [];

        // 第1層：塔樓底部
        const towerBottom1Geometry = new THREE.CylinderGeometry(1, 1, 3, 12);
        const towerBottom1Material = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const towerBottom1Mesh = new THREE.Mesh(towerBottom1Geometry, towerBottom1Material);
        towerBottom1Mesh.position.set(worldPos.x, -1.45, worldPos.z); // 稍微抬高避免Z-fighting
        towerBottom1Mesh.castShadow = true;
        towerBottom1Mesh.receiveShadow = true;
        towerBottom1Mesh.visible = false;
        group.add(towerBottom1Mesh);
        this.buildingParts.push(towerBottom1Mesh);

        // 第2層：塔樓中部
        const towerMiddle1Geometry = new THREE.CylinderGeometry(1, 1, 3, 12);
        const towerMiddle1Material = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const towerMiddle1Mesh = new THREE.Mesh(towerMiddle1Geometry, towerMiddle1Material);
        towerMiddle1Mesh.position.set(worldPos.x, 1.5, worldPos.z);
        towerMiddle1Mesh.castShadow = true;
        towerMiddle1Mesh.receiveShadow = true;
        towerMiddle1Mesh.visible = false;
        group.add(towerMiddle1Mesh);
        this.buildingParts.push(towerMiddle1Mesh);

        // 第3層：塔樓頂部
        const towerTop1Geometry = new THREE.CylinderGeometry(1, 1, 3, 12);
        const towerTop1Material = new THREE.MeshLambertMaterial({ color: 0xa6a6a6 });
        const towerTop1Mesh = new THREE.Mesh(towerTop1Geometry, towerTop1Material);
        towerTop1Mesh.position.set(worldPos.x, 4.5, worldPos.z);
        towerTop1Mesh.castShadow = true;
        towerTop1Mesh.receiveShadow = true;
        towerTop1Mesh.visible = false;
        group.add(towerTop1Mesh);
        this.buildingParts.push(towerTop1Mesh);

        // 第4層：紅色圓錐屋頂
        const roofGeometry = new THREE.ConeGeometry(1.5, 2, 12);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(worldPos.x, 7, worldPos.z);
        roofMesh.castShadow = true;
        roofMesh.visible = false;
        group.add(roofMesh);
        this.buildingParts.push(roofMesh);

        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0; // 塔樓修復：從0開始

        // 稍後添加窗戶（建造完成後）
        this.windowsCreated = false;
    }

    onConstructionComplete() {
        super.onConstructionComplete();
        
        // 建造完成後添加窗戶
        if (!this.windowsCreated) {
            this.createTowerWindows(this.mesh, this.getWorldPosition());
            this.windowsCreated = true;
        }
    }

    // 創建塔樓窗戶
    createTowerWindows(group, worldPos) {
        this.windows = [];
        
        // 在圓柱頂部創建4個窗戶（東南西北方向）
        const windowAngles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
        const radius = 1.01; // 稍微超出圓柱表面
        
        windowAngles.forEach(angle => {
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // 窗戶
            const windowGeometry = new THREE.PlaneGeometry(0.4, 0.6);
            const windowMaterial = new THREE.MeshLambertMaterial({
                color: 0xffff88,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                emissive: 0x000000 // MeshLambertMaterial 支援 emissive
            });
            
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            
            windowMesh.position.set(
                worldPos.x + x,
                4.5, // 調整塔樓窗戶高度
                worldPos.z + z
            );
            windowMesh.lookAt(worldPos.x, 4.5, worldPos.z); // 朝向塔樓中心
            
            group.add(windowMesh);
            this.windows.push(windowMesh);
        });
    }

    // 更新窗戶光照
    updateWindowLighting(isNight, lightIntensity) {
        if (this.windows) {
            this.windows.forEach(window => {
                if (window.material) {
                    if (isNight) {
                        window.material.opacity = 1.0;
                        window.material.color.setHex(0xffcc00);
                        window.material.emissive.setHex(0x664400); // 添加自發光
                    } else {
                        window.material.opacity = 0.4;
                        window.material.color.setHex(0x88ccff);
                        window.material.emissive.setHex(0x000000); // 移除自發光
                    }
                }
            });
        }
    }

    // 獲取特定建造部件的建造位置
    getPartBuildPosition(partIndex) {
        const centerX = this.x + 1; // 塔樓中心X
        const centerY = this.y + 1; // 塔樓中心Y
        
        // 根據建造步驟返回不同的建造位置，所有部件都在地面層（z=0）
        switch(partIndex) {
            case 0: // 第1層：塔樓底部
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 1: // 第2層：塔樓中部
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 2: // 第3層：塔樓頂部
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 3: // 第4層：紅色圓錐屋頂
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            default:
                return { x: centerX, y: centerY, z: 0 };
        }
    }
}

// 房舍類別
class House extends Building {
    constructor(x, y, grid, scene) {
        super(x, y, grid, scene);
        this.width = 4;
        this.height = 4;
        this.populationSupport = 5; // 支援5人口
        
        // 房舍只需要1個工人
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        
        this.create();
    }

    // 獲取實際人口支援（只有建造完成才提供）
    getPopulationSupport() {
        return this.isComplete ? this.populationSupport : 0;
    }

    create() {
        const group = new THREE.Group();
        const worldPos = this.getWorldPosition();

        // 創建建築部分但不顯示
        this.createBuildingParts(group, worldPos);
        
        this.mesh = group;
        this.scene.add(group);

        // 在網格中標記佔用
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts(group, worldPos) {
        this.buildingParts = [];

        // 第1層：底部灰色立方體基礎
        const baseGeometry = new THREE.BoxGeometry(4, 1.5, 4);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.position.set(worldPos.x, -0.8, worldPos.z); // 調整位置避免Z-fighting
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.visible = false;
        group.add(baseMesh);
        this.buildingParts.push(baseMesh);

        // 第2層：木頭色立方體主體
        const middleGeometry = new THREE.BoxGeometry(4, 2, 4);
        const middleMaterial = new THREE.MeshLambertMaterial({ color: 0xF0E68C });
        const middleMesh = new THREE.Mesh(middleGeometry, middleMaterial);
        middleMesh.position.set(worldPos.x, 1.25, worldPos.z);
        middleMesh.castShadow = true;
        middleMesh.receiveShadow = true;
        middleMesh.visible = false;
        group.add(middleMesh);
        this.buildingParts.push(middleMesh);

        // 第3層：木頭色正三角柱屋頂
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-2, 0);
        roofShape.lineTo(2, 0);
        roofShape.lineTo(0, 1.73);
        roofShape.lineTo(-2, 0);
        
        const extrudeSettings = {
            depth: 4,
            bevelEnabled: false
        };
        
        const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(worldPos.x, 2.25, worldPos.z - 2);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.visible = false;
        group.add(roofMesh);
        this.buildingParts.push(roofMesh);

        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0; // 房舍修復：從0開始

        // 稍後添加窗戶（建造完成後）
        this.windowsCreated = false;
    }

    onConstructionComplete() {
        super.onConstructionComplete();
        
        // 建造完成後添加窗戶
        if (!this.windowsCreated) {
            this.createHouseWindows(this.mesh, this.getWorldPosition());
            this.windowsCreated = true;
        }
    }

    // 創建房舍窗戶
    createHouseWindows(group, worldPos) {
        this.windows = [];
        
        // 四面牆的窗戶位置
        const windowConfigs = [
            // 前面 (Z-)
            { x: -1, y: 2, z: -2.01, rotY: 0 },
            { x: 1, y: 2, z: -2.01, rotY: 0 },
            // 後面 (Z+)
            { x: -1, y: 2, z: 2.01, rotY: Math.PI },
            { x: 1, y: 2, z: 2.01, rotY: Math.PI },
            // 左面 (X-)
            { x: -2.01, y: 2, z: -1, rotY: Math.PI/2 },
            { x: -2.01, y: 2, z: 1, rotY: Math.PI/2 },
            // 右面 (X+)
            { x: 2.01, y: 2, z: -1, rotY: -Math.PI/2 },
            { x: 2.01, y: 2, z: 1, rotY: -Math.PI/2 }
        ];

        windowConfigs.forEach(config => {
            // 窗戶
            const windowGeometry = new THREE.PlaneGeometry(0.5, 0.6);
            const windowMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffff88,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                emissive: 0x000000 // MeshLambertMaterial 支援 emissive
            });
            
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            
            windowMesh.position.set(
                worldPos.x + config.x, 
                config.y, 
                worldPos.z + config.z
            );
            windowMesh.rotation.y = config.rotY;
            
            group.add(windowMesh);
            this.windows.push(windowMesh);
        });
    }

    // 更新窗戶光照
    updateWindowLighting(isNight, lightIntensity) {
        if (this.windows) {
            this.windows.forEach(window => {
                if (window.material) {
                    if (isNight) {
                        window.material.opacity = 1.0;
                        window.material.color.setHex(0xffcc00);
                        window.material.emissive.setHex(0x664400); // 添加自發光
                    } else {
                        window.material.opacity = 0.4;
                        window.material.color.setHex(0x88ccff);
                        window.material.emissive.setHex(0x000000); // 移除自發光
                    }
                }
            });
        }
    }

    // 獲取特定建造部件的建造位置
    getPartBuildPosition(partIndex) {
        const centerX = this.x + 2; // 房舍中心X
        const centerY = this.y + 2; // 房舍中心Y
        
        // 根據建造步驟返回不同的建造位置，所有部件都在地面層（z=0）
        switch(partIndex) {
            case 0: // 第1層：底部灰色立方體基礎
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 1: // 第2層：木頭色立方體主體
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            case 2: // 第3層：木頭色正三角柱屋頂
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            default:
                return { x: centerX, y: centerY, z: 0 };
        }
    }
}

// 農田類別
class Farm extends Building {
    constructor(x, y, grid, scene) {
        super(x, y, grid, scene);
        this.width = 6;
        this.height = 6;
        this.exhaustion = 50; // 枯竭程度，50滿，0完全枯竭
        this.maxExhaustion = 50;
        // 農田視覺屬性（不再產生食物，僅作視覺效果）
        this.workingVillager = null;
        this.lastUpdate = Date.now();
        this.harvestPoints = []; // 存儲采集點
        
        // 農田只需要1個工人
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        
        this.generateHarvestPoints();
        this.create();
    }

    generateHarvestPoints() {
        // 在6x6農田內生成多個采集點
        this.harvestPoints = [];
        for (let i = 0; i < 12; i++) { // 12個采集點，適合6x6農田
            this.harvestPoints.push({
                x: (Math.random() - 0.5) * 5.5, // -2.75 到 +2.75 範圍內 (6x6的90%)
                z: (Math.random() - 0.5) * 5.5
            });
        }
    }

    getRandomHarvestPoint() {
        // 返回農田內的隨機采集點世界座標
        const worldPos = this.getWorldPosition();
        const point = this.harvestPoints[Math.floor(Math.random() * this.harvestPoints.length)];
        return {
            x: worldPos.x + point.x,
            z: worldPos.z + point.z
        };
    }

    create() {
        const worldPos = this.getWorldPosition();
        // 創建農田位置
        
        // 創建建築部分但不顯示（農田比較簡單，只有一個主要部分）
        this.createBuildingParts(worldPos);
        
        // 同時保留地形著色系統
        this.colorTerrainForFarm(worldPos);
        
        // 農田創建完成

        // 在網格中標記佔用
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts(worldPos) {
        this.buildingParts = [];

        // 農田只有一個部分：彩色方塊
        const farmGeometry = new THREE.BoxGeometry(6, 0.2, 6);
        const farmMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00, // 明亮的綠色
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(farmGeometry, farmMaterial);
        this.mesh.position.set(worldPos.x, 0.1, worldPos.z); // 稍微高於地面
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.visible = false; // 開始時不可見
        this.scene.add(this.mesh);
        
        this.buildingParts.push(this.mesh);
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0; // 農田修復：從0開始
    }

    // 修改地形顏色來表示農田
    colorTerrainForFarm(worldPos) {
        // 需要訪問地形網格來修改顏色
        // 這需要從world.js獲取地形網格的引用
        // 農田區域地形著色
        
        // 暫時存儲農田位置，稍後會由world.js統一處理
        if (!window.farmAreas) {
            window.farmAreas = [];
        }
        
        window.farmAreas.push({
            x: worldPos.x,
            z: worldPos.z,
            size: 6,
            color: this.getCurrentFarmColor(),
            exhaustion: this.exhaustion,
            id: this.id
        });
        
        // 農田區域已添加
        // 農田顏色設定完成
    }

    // 獲取當前農田顏色
    getCurrentFarmColor() {
        const greenRatio = this.exhaustion / this.maxExhaustion;
        
        let red, green, blue;
        if (greenRatio > 0.5) {
            red = 50 + (100 - 50) * (1 - greenRatio);
            green = 200 + (50 - 200) * (1 - greenRatio);
            blue = 50 + (50 - 50) * (1 - greenRatio);
        } else {
            red = 100 + (194 - 100) * (1 - greenRatio * 2);
            green = 200 + (164 - 200) * (1 - greenRatio * 2);
            blue = 50 + (96 - 50) * (1 - greenRatio * 2);
        }
        
        return { r: red / 255, g: green / 255, b: blue / 255 };
    }

    // 讓農田貼合地形
    conformToTerrain() {
        const geometry = this.mesh.geometry;
        const vertices = geometry.attributes.position.array;
        
        // 遍歷每個頂點，根據位置調整高度
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + this.mesh.position.x;
            const z = vertices[i + 2] + this.mesh.position.z;
            
            // 使用簡單的噪聲函數模擬地形高度，並添加小的偏移
            const height = this.getTerrainHeight(x, z);
            vertices[i + 1] = height * 0.1 + 0.05; // 縮放高度變化並添加0.05的偏移
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // 重新計算法線
    }

    // 獲取地形高度（簡化版噪聲函數）
    getTerrainHeight(x, z) {
        return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5 + 
               Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.3;
    }

    update(isNight = false) {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdate;
        
        // 每秒枯竭1點，但在夜晚時暫停枯竭
        if (deltaTime >= 1000 && !isNight) {
            this.exhaustion = Math.max(0, this.exhaustion - 1);
            this.updateFarmColor(); // 更新地形顏色
            this.lastUpdate = currentTime;
            
            // 檢查是否完全荒蕪
            if (this.exhaustion <= 0) {
                this.markForDestruction();
            }
        } else if (isNight && deltaTime >= 1000) {
            // 夜晚時只更新時間戳記，不枯竭
            this.lastUpdate = currentTime;
        }
    }

    // 標記農田需要被銷毀
    markForDestruction() {
        this.shouldDestroy = true;
        // 農田已完全荒蕪，標記為待銷毀
    }

    // 檢查是否需要銷毀
    needsDestruction() {
        return this.shouldDestroy || false;
    }

    // 更新農田顏色（用於地形著色）
    updateFarmColor() {
        // 更新3D方塊的顏色
        if (this.mesh && this.mesh.material) {
            const farmColor = this.getCurrentFarmColor();
            const hexColor = Math.floor(farmColor.r * 255) << 16 | Math.floor(farmColor.g * 255) << 8 | Math.floor(farmColor.b * 255);
            this.mesh.material.color.setHex(hexColor);
        }
        
        // 更新地形著色系統
        if (window.farmAreas) {
            const farmArea = window.farmAreas.find(area => area.id === this.id);
            if (farmArea) {
                farmArea.color = this.getCurrentFarmColor();
                farmArea.exhaustion = this.exhaustion;
                
                // 通知world.js更新地形顏色
                if (window.worldInstance && window.worldInstance.updateFarmColors) {
                    window.worldInstance.updateFarmColors();
                }
            }
        }
    }

    // 設置工作的村民（帶原子性檢查）
    setWorker(villager) {
        if (this.workingVillager !== null) {
            // 農田已經有工人，拒絕分配
            return false; // 已經有工人了
        }
        this.workingVillager = villager;
        // 農田成功分配工人
        return true; // 成功分配
    }

    // 移除工作的村民
    removeWorker() {
        if (this.workingVillager) {
            // 農田移除工人
            this.workingVillager = null;
        }
    }

    // 檢查是否有村民在工作
    hasWorker() {
        return this.workingVillager !== null;
    }

    // 重新種植（純視覺效果）
    replant() {
        this.exhaustion = this.maxExhaustion;
        this.updateFarmColor(); // 更新地形顏色
    }

    // 重寫destroy方法以清理農田相關資源
    destroy() {
        // 調用父類的destroy方法
        super.destroy();
        
        // 從地形著色系統中移除
        if (window.farmAreas) {
            window.farmAreas = window.farmAreas.filter(area => area.id !== this.id);
            
            // 通知world.js更新地形顏色
            if (window.worldInstance && window.worldInstance.updateFarmColors) {
                window.worldInstance.updateFarmColors();
            }
        }
        
        // 農田地形著色已清理
    }

    // 獲取特定建造部件的建造位置
    getPartBuildPosition(partIndex) {
        const centerX = this.x + 3; // 農田中心X
        const centerY = this.y + 3; // 農田中心Y
        
        // 農田只有一個建造步驟
        switch(partIndex) {
            case 0: // 農田彩色方塊
                return { x: centerX, y: centerY, z: 0 }; // 地面層
                
            default:
                return { x: centerX, y: centerY, z: 0 };
        }
    }
}

// 建築管理器
class BuildingManager {
    constructor(grid, scene, treeManager = null) {
        this.grid = grid;
        this.scene = scene;
        this.treeManager = treeManager; // 添加樹木管理器引用
        this.buildings = new Map();
        this.castles = [];
        this.farms = [];
        this.towers = [];
        this.houses = []; // 新增房舍陣列
    }
    
    // 設置樹木管理器引用
    setTreeManager(treeManager) {
        this.treeManager = treeManager;
    }

    // 更新建築狀態（主要處理農田荒蕪）
    update(currentTime, isNight = false) {
        // 更新所有建築的建造進度
        for (const building of this.buildings.values()) {
            if (building.updateConstruction) {
                building.updateConstruction(currentTime);
            }
        }
        
        // 更新所有農田
        for (let i = this.farms.length - 1; i >= 0; i--) {
            const farm = this.farms[i];
            farm.update(isNight);
            
            // 檢查農田是否需要銷毀
            if (farm.needsDestruction()) {
                this.destroyFarm(farm);
            }
        }
    }

    // 銷毀荒蕪的農田
    destroyFarm(farm) {
        // 銷毀荒蕪農田
        
        let needReassignment = false;
        
        // 如果有村民在此農田工作，讓他們回到idle狀態
        if (farm.workingVillager) {
            farm.workingVillager.workingFarm = null;
            farm.workingVillager.state = 'idle';
            farm.workingVillager.target = null;
            farm.workingVillager.path = [];
            needReassignment = true;
            // 農田工人已被重新分配為閒置狀態
        }
        
        // 從場景中移除
        if (farm.mesh) {
            this.scene.remove(farm.mesh);
        }
        
        // 從地形著色系統中移除
        if (window.farmAreas) {
            window.farmAreas = window.farmAreas.filter(area => area.id !== farm.id);
            
            // 通知world.js更新地形顏色
            if (window.worldInstance && window.worldInstance.updateFarmColors) {
                window.worldInstance.updateFarmColors();
            }
        }
        
        // 釋放網格佔用
        this.grid.freeArea(farm.x, farm.y, farm.width, farm.height);
        
        // 從管理器中移除
        this.buildings.delete(farm.id);
        this.farms = this.farms.filter(f => f.id !== farm.id);
        
        // 如果有村民被釋放且有其他可用農田，觸發重新分配
        if (needReassignment && window.worldInstance && window.worldInstance.villagerManager) {
            // 檢查是否有其他農田需要工人
            const availableFarms = this.farms.filter(f => !f.hasWorker());
            if (availableFarms.length > 0) {
                // 觸發村民重新分配到其他農田
                window.worldInstance.villagerManager.reassignVillagersToFarms();
            }
        }
        
        // 農田已完全銷毀，資源已釋放
    }

    // 建造城堡
    buildCastle(x, y) {
        if (!this.grid.canBuild(x, y, 6, 6)) {
            return { success: false, message: '位置被佔用' };
        }

        // 檢查建築間距（城堡不是農田，需要檢查間距）
        if (!this.grid.checkBuildingSpacing(x, y, 6, 6, false)) {
            return { success: false, message: '與其他建築距離太近，需要保持3格距離' };
        }

        // 對於城堡，如果已經有任何建築，則需要檢查條件
        // 但如果沒有建築（第一個建築），則可以建造
        if (this.buildings.size > 0 && !this.grid.checkBuildingCondition(x, y, 6, 6)) {
            return { success: false, message: '附近5格內需要有建築' };
        }

        const castle = new Castle(x, y, this.grid, this.scene);
        this.buildings.set(castle.id, castle);
        this.castles.push(castle);
        
        // 清除城堡附近的樹木
        if (this.treeManager) {
            this.treeManager.clearTreesInArea(x + 3, y + 3, 10);
        }
        
        // 城堡建造成功
        return { success: true, building: castle };
    }

    // 建造塔樓
    buildTower(x, y, factionColor = 0xff0000) {
        if (!this.grid.canBuild(x, y, 2, 2)) {
            return { success: false, message: '位置被佔用' };
        }

        // 檢查建築間距（塔樓不是農田，需要檢查間距）
        if (!this.grid.checkBuildingSpacing(x, y, 2, 2, false)) {
            return { success: false, message: '與其他建築距離太近，需要保持3格距離' };
        }

        if (!this.grid.checkBuildingCondition(x, y, 2, 2)) {
            return { success: false, message: '附近5格內需要有建築' };
        }

        const tower = new Tower(x, y, this.grid, this.scene, factionColor);
        this.buildings.set(tower.id, tower);
        this.towers.push(tower);
        
        // 清除塔樓附近的樹木
        if (this.treeManager) {
            this.treeManager.clearTreesInArea(x, y, 4);
        }
        
        // 塔樓建造成功
        return { success: true, building: tower };
    }

    // 建造房舍
    buildHouse(x, y) {
        if (!this.grid.canBuild(x, y, 4, 4)) {
            return { success: false, message: '位置被佔用' };
        }

        // 檢查建築間距（房舍不是農田，需要檢查間距）
        if (!this.grid.checkBuildingSpacing(x, y, 4, 4, false)) {
            return { success: false, message: '與其他建築距離太近，需要保持3格距離' };
        }

        if (!this.grid.checkBuildingCondition(x, y, 4, 4)) {
            return { success: false, message: '附近5格內需要有建築' };
        }

        const house = new House(x, y, this.grid, this.scene);
        this.buildings.set(house.id, house);
        this.houses.push(house);
        
        // 清除房舍附近的樹木
        if (this.treeManager) {
            this.treeManager.clearTreesInArea(x, y, 5);
        }
        
        // 房舍建造成功
        return { success: true, building: house };
    }

    // 建造農田
    buildFarm(x, y) {
        if (!this.grid.canBuild(x, y, 6, 6)) {
            return { success: false, message: '位置被佔用' };
        }

        if (!this.grid.checkBuildingCondition(x, y, 6, 6)) {
            return { success: false, message: '附近5格內需要有建築' };
        }

        const farm = new Farm(x, y, this.grid, this.scene);
        this.buildings.set(farm.id, farm);
        this.farms.push(farm);
        
        // 清除農田附近的樹木
        if (this.treeManager) {
            this.treeManager.clearTreesInArea(x + 3, y + 3, 8);
        }
        
        // 農田建造成功
        
        return { success: true, building: farm };
    }

    // 更新所有建築
    update(currentTime, isNight = false) {
        // 更新所有建築的建造進度
        this.buildings.forEach(building => {
            if (building.isUnderConstruction) {
                building.updateConstruction(currentTime);
            }
        });

        // 更新所有農田
        for (let i = this.farms.length - 1; i >= 0; i--) {
            const farm = this.farms[i];
            farm.update(isNight);
            
            // 檢查農田是否需要銷毀
            if (farm.needsDestruction()) {
                this.destroyFarm(farm);
            }
        }
    }

    // 更新所有建築的窗戶光照
    updateBuildingLighting(isNight, lightIntensity) {
        // 更新城堡窗戶
        this.castles.forEach(castle => {
            if (castle.updateWindowLighting) {
                castle.updateWindowLighting(isNight, lightIntensity);
            }
        });
        
        // 更新塔樓窗戶
        this.towers.forEach(tower => {
            if (tower.updateWindowLighting) {
                tower.updateWindowLighting(isNight, lightIntensity);
            }
        });
        
        // 更新房舍窗戶
        this.houses.forEach(house => {
            if (house.updateWindowLighting) {
                house.updateWindowLighting(isNight, lightIntensity);
            }
        });
    }

    // 獲取城堡數量
    getCastleCount() {
        return this.castles.length;
    }

    // 銷毀建築
    destroyBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (building) {
            building.destroy();
            this.buildings.delete(buildingId);
            
            // 從對應陣列中移除
            this.castles = this.castles.filter(b => b.id !== buildingId);
            this.farms = this.farms.filter(b => b.id !== buildingId);
            this.towers = this.towers.filter(b => b.id !== buildingId);
            
            // 釋放網格佔用
            this.grid.freeArea(building.x, building.y, building.width, building.height);
        }
    }

    // 獲取所有建築
    getAllBuildings() {
        return Array.from(this.buildings.values());
    }

    // 獲取建築數量統計
    getBuildingCounts() {
        return {
            castles: this.castles.length,
            towers: this.towers.length,
            houses: this.houses.length,
            farms: this.farms.length,
            total: this.buildings.size
        };
    }

    // 獲取建築上限
    getBuildingLimits() {
        const counts = this.getBuildingCounts();
        const limits = {
            castle: 1 + Math.floor(counts.towers / 8), // 每8個塔樓+1城堡上限（初始為1）
            tower: Math.floor(counts.houses / 3),       // 每3個房舍+1塔樓上限（初始為0）
            house: Math.floor(counts.farms / 3),        // 每3個農田+1房舍上限（初始為0）
            farm: Number.MAX_SAFE_INTEGER               // 農田無上限
        };
        
        // 建築上限計算
        return limits;
    }

    // 獲取總人口支援（只計算已完成的建築）
    getTotalPopulationSupport() {
        let totalSupport = 0;
        
        // 城堡支援人口（只有已完成的）
        this.castles.forEach(castle => {
            totalSupport += castle.getPopulationSupport ? castle.getPopulationSupport() : 0;
        });
        
        // 房舍支援人口（只有已完成的）
        this.houses.forEach(house => {
            totalSupport += house.getPopulationSupport ? house.getPopulationSupport() : 0;
        });
        
        return Math.min(totalSupport, 200); // 人口上限200
    }

    // 獲取總人口上限（只計算已完成的建築）
    getPopulationLimit() {
        const castlePopulation = this.castles.reduce((sum, castle) => {
            return sum + (castle.getPopulationSupport ? castle.getPopulationSupport() : 0);
        }, 0);
        
        const housePopulation = this.houses.reduce((sum, house) => {
            return sum + (house.getPopulationSupport ? house.getPopulationSupport() : 0);
        }, 0);
        
        return Math.min(castlePopulation + housePopulation, 200); // 最大200人口
    }

    // 檢查是否可以建造特定類型的建築
    canBuildType(type) {
        const counts = this.getBuildingCounts();
        const limits = this.getBuildingLimits();
        
        switch(type) {
            case 'castle':
                return counts.castles < limits.castle;
            case 'tower':
                return counts.towers < limits.tower;
            case 'house':
                return counts.houses < limits.house;
            case 'farm':
                return true; // 農田無上限
            default:
                return false;
        }
    }
}
