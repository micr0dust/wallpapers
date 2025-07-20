// 村民類別
class Villager {
    constructor(x, z, grid, scene, buildingManager, villagerManager = null) {
        this.x = x;
        this.z = z;
        this.grid = grid;
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.villagerManager = villagerManager; // 引用villagerManager來更新資源庫存
        
        // 村民狀態
        this.wood = 0; // 攜帶的木材數量
        this.food = 0; // 攜帶的食物數量
        this.state = 'idle'; // idle, movingToTree, chopping, movingToCastle, movingToFarm, farming, harvestingFarm, hiding, movingToShelter, movingToConstruction, constructing
        this.target = null;
        this.path = [];
        this.moveSpeed = 0.5; // 每2tick走一步
        this.lastMoveTime = 0;
        this.moveInterval = 1000 / 30; // 每2tick (2/60秒) = 1000/30毫秒
        
        // 工作狀態
        this.workingFarm = null;
        this.choppingTree = null;
        this.choppingProgress = 0;
        this.harvestProgress = 0;
        this.constructionBuilding = null; // 正在建造的建築
        
        // 夜晚躲避狀態
        this.shelterBuilding = null; // 躲避的建築
        this.isNight = false; // 夜晚標記
        this.wasDaytime = true; // 上次是否為白天
        
        // 第一棟城堡建造模式
        this.firstCastleMode = false; // 是否在第一棟城堡建造模式
        this.castleCenter = null; // 城堡中心位置
        this.lastRandomMoveTime = 0; // 上次隨機移動時間
        this.randomMoveInterval = 3000; // 隨機移動間隔（3秒）
        
        this.id = this.generateId();
        this.create();
    }

    generateId() {
        return `villager_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    create() {
        // 創建簡單的村民外觀（圓柱體加球體）
        const group = new THREE.Group();
        
        // 身體（圓柱體）
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.75;
        group.add(bodyMesh);
        
        // 頭部（球體）
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB3 });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.y = 1.8;
        group.add(headMesh);
        
        this.mesh = group;
        this.mesh.position.set(this.x, 0, this.z);
        this.mesh.visible = true; // 確保初始狀態是可見的
        this.scene.add(this.mesh);
    }

    update(currentTime, treeManager, isNight = false) {
        // 更新夜晚狀態
        this.updateNightState(isNight);
        
        // 安全檢查：確保白天時村民是可見的（除非在躲避狀態）
        // 增強檢查：所有非躲避狀態的村民在白天都應該可見
        if (!isNight && this.state !== 'hiding' && this.state !== 'movingToShelter' && this.mesh) {
            if (!this.mesh.visible) {
                this.setVisibility(true);
            }
        }
        
        // 處理第一棟城堡建造模式的隨機移動
        if (this.firstCastleMode && this.castleCenter) {
            this.updateFirstCastleMovement(currentTime);
        }
        
        // 移動邏輯
        if (currentTime - this.lastMoveTime >= this.moveInterval) {
            this.move();
            this.lastMoveTime = currentTime;
        }
        
        // 狀態機邏輯
        this.updateStateMachine(treeManager);
    }

    move() {
        if (this.path && this.path.length > 0) {
            const nextPos = this.path.shift();
            this.x = nextPos.x;
            this.z = nextPos.z;
            
            // 計算村民的高度位置
            let yPosition = 0; // 預設地面高度
            
            // 只有在村民已經到達建造位置且靜止時才調整高度
            // 移動過程中保持在地面，避免漂浮效果
            if (this.state === 'constructing' && this.targetBuildPosition && (!this.path || this.path.length === 0)) {
                // 檢查是否已到達目標位置
                const currentGridPos = this.grid.worldToGrid(this.x, this.z);
                const targetDistance = Math.abs(currentGridPos.x - this.targetBuildPosition.x) + 
                                     Math.abs(currentGridPos.y - this.targetBuildPosition.y);
                
                if (targetDistance <= 1) {
                    // 已到達建造位置，調整高度
                    yPosition = this.targetBuildPosition.z * 3; // 每層高度3單位
                }
            }
            
            this.mesh.position.set(this.x, yPosition, this.z);
            
            // 如果到達目標
            if (!this.path || this.path.length === 0) {
                this.onReachTarget();
            }
        } else if (this.target) {
            // 沒有路徑但有目標，檢查是否已經在目標附近
            const distance = Math.sqrt(
                Math.pow(this.x - this.target.x, 2) +
                Math.pow(this.z - this.target.z, 2)
            );
            
            // 如果距離很近，直接觸發到達目標
            if (distance < 1.5) {
                this.onReachTarget();
            }
        }
    }

    updateStateMachine(treeManager) {
        switch (this.state) {
            case 'idle':
                this.handleIdleState(treeManager);
                break;
            case 'movingToTree':
                // 移動邏輯在move()中處理，但添加安全檢查確保狀態轉換
                if (this.target && (!this.path || this.path.length === 0)) {
                    // 檢查是否已經到達樹的附近
                    const distance = Math.sqrt(
                        Math.pow(this.x - this.target.x, 2) +
                        Math.pow(this.z - this.target.z, 2)
                    );
                    
                    if (distance < 2.0) { // 在樹的2格範圍內就開始砍樹
                        // 使用保存的樹木位置創建砍樹目標
                        this.choppingTree = {
                            x: this.target.treeX || this.target.x,
                            y: this.target.treeY || this.target.y
                        };
                        this.state = 'chopping';
                        this.choppingProgress = 0;
                        console.log(`村民 ${this.id.slice(-8)} 到達砍樹位置，開始砍樹 at (${this.choppingTree.x}, ${this.choppingTree.y})`);
                    }
                }
                break;
            case 'chopping':
                this.handleChoppingState(treeManager);
                break;
            case 'movingToCastle':
                // 檢查是否已經到達城堡但沒有正確觸發狀態轉換
                if (this.target && (!this.path || this.path.length === 0)) {
                    const distance = Math.sqrt(
                        Math.pow(this.x - this.target.x, 2) +
                        Math.pow(this.z - this.target.z, 2)
                    );
                    
                    if (distance < 3.0) {
                        // 已經到達城堡，手動觸發狀態轉換
                        this.onReachTarget();
                    } else {
                        // 重新尋找最近的城堡
                        const gridPos = this.grid.worldToGrid(this.x, this.z);
                        const nearestCastle = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
                        if (nearestCastle) {
                            this.target = nearestCastle;
                            this.createPath(nearestCastle.x, nearestCastle.y);
                        } else {
                            this.state = 'idle';
                            this.target = null;
                        }
                    }
                }
                break;
            case 'movingToFarm':
                // 檢查是否已經到達農田但沒有正確觸發狀態轉換
                if (this.target && this.path.length === 0) {
                    const distance = Math.sqrt(
                        Math.pow(this.x - this.target.x, 2) +
                        Math.pow(this.z - this.target.z, 2)
                    );
                    
                    if (distance < 2.0) {
                        // 已經到達農田，手動觸發狀態轉換
                        this.onReachTarget();
                    } else if (this.workingFarm && this.workingFarm.isComplete) {
                        // 距離較遠但農田有效，重新創建路徑
                        const worldPos = this.workingFarm.getWorldPosition();
                        const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
                        this.createPath(gridPos.x, gridPos.y);
                    } else {
                        // 農田無效，重置為idle
                        if (this.workingFarm) {
                            this.workingFarm.removeWorker?.(this);
                            this.workingFarm = null;
                        }
                        this.state = 'idle';
                        this.target = null;
                    }
                }
                break;
            case 'farming':
                this.handleFarmingState();
                break;
            case 'harvestingFarm':
                this.handleHarvestingState();
                break;
            case 'movingToShelter':
                // 檢查是否失去目標或路徑
                if (!this.target || this.path.length === 0) {
                    // 重新尋找避難所或直接躲避
                    if (this.shelterBuilding && this.shelterBuilding.isComplete) {
                        const centerX = this.shelterBuilding.x + Math.floor(this.shelterBuilding.width / 2);
                        const centerY = this.shelterBuilding.y + Math.floor(this.shelterBuilding.height / 2);
                        this.target = this.grid.gridToWorld(centerX, centerY);
                        this.createPath(centerX, centerY);
                    } else {
                        this.findNearestShelter();
                    }
                }
                break;
            case 'hiding':
                this.handleHidingState();
                break;
            case 'movingToConstruction':
                // 檢查建築是否還存在且未完成
                if (!this.constructionBuilding || this.constructionBuilding.isComplete) {
                    this.constructionBuilding = null;
                    this.target = null;
                    this.path = [];
                    this.state = 'idle';
                } else if (this.path.length === 0 && this.target) {
                    // 如果失去路徑但有目標，重新創建路徑
                    const worldPos = this.constructionBuilding.getWorldPosition();
                    const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
                    this.createPath(gridPos.x, gridPos.y);
                }
                break;
            case 'constructing':
                this.handleConstructingState();
                break;
        }
        
        // 安全檢查：如果村民處於 idle 狀態但有目標或路徑，可能是狀態不一致，需要清理
        if (this.state === 'idle' && (this.target || this.path.length > 0)) {
            // 特殊情況：如果是在進行隨機移動，允許保持目標和路徑
            // 但如果目標距離過遠或其他異常情況，清理狀態
            if (this.target) {
                const distance = Math.sqrt(
                    Math.pow(this.x - this.target.x, 2) +
                    Math.pow(this.z - this.target.z, 2)
                );
                
                // 如果目標距離過遠（可能是錯誤的狀態），清理它
                if (distance > 20) {
                    this.target = null;
                    this.path = [];
                }
            }
        }
    }

    // 檢查是否為夜晚時間（18:00後）
    isNightTime() {
        // 如果已經明確標記為夜晚
        if (this.isNight) {
            return true;
        }
        
        // 從全局或場景中獲取當前時間
        if (window.gameTime && window.gameTime.currentHour !== undefined) {
            return window.gameTime.currentHour >= 18 || window.gameTime.currentHour < 6;
        }
        
        // 備用方案：使用isNight標記
        return this.isNight;
    }

    // 更新夜晚狀態
    updateNightState(isNight) {
        const wasNight = this.isNight;
        this.isNight = isNight;
        
        // 如果剛剛變成夜晚
        if (isNight && !wasNight) {
            this.handleNightfall();
        }
        // 如果剛剛變成白天
        else if (!isNight && wasNight) {
            this.handleDaybreak();
        }
    }

    // 處理夜晚來臨
    handleNightfall() {
        // 如果不是在躲避狀態，則尋找最近的建築躲避
        if (this.state !== 'hiding' && this.state !== 'movingToShelter') {
            this.findNearestShelter();
        }
    }

    // 處理白天來臨
    handleDaybreak() {
        // 如果在躲避狀態，恢復到idle狀態
        if (this.state === 'hiding') {
            this.state = 'idle';
            this.shelterBuilding = null;
            // 讓村民重新可見，造成從屋內走出的視覺效果
            this.setVisibility(true);
        }
    }

    // 尋找最近的避難所（不含農田）
    findNearestShelter() {
        const gridPos = this.grid.worldToGrid(this.x, this.z);
        let nearestBuilding = null;
        let nearestDistance = Infinity;
        
        // 檢查城堡
        this.buildingManager.castles.forEach(castle => {
            if (castle.isComplete) { // 只檢查完成的建築
                const distance = Math.abs(castle.x - gridPos.x) + Math.abs(castle.y - gridPos.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestBuilding = castle;
                }
            }
        });
        
        // 檢查塔樓
        this.buildingManager.towers.forEach(tower => {
            if (tower.isComplete) { // 只檢查完成的建築
                const distance = Math.abs(tower.x - gridPos.x) + Math.abs(tower.y - gridPos.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestBuilding = tower;
                }
            }
        });
        
        // 檢查房舍
        this.buildingManager.houses.forEach(house => {
            if (house.isComplete) { // 只檢查完成的建築
                const distance = Math.abs(house.x - gridPos.x) + Math.abs(house.y - gridPos.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestBuilding = house;
                }
            }
        });
        
        if (nearestBuilding) {
            this.shelterBuilding = nearestBuilding;
            this.state = 'movingToShelter';
            // 移動到建築中心
            const centerX = nearestBuilding.x + Math.floor(nearestBuilding.width / 2);
            const centerY = nearestBuilding.y + Math.floor(nearestBuilding.height / 2);
            
            // 設置目標點，方便追蹤
            this.target = this.grid.gridToWorld(centerX, centerY);
            this.createPath(centerX, centerY);
            
        } else {
            // 找不到可躲避的建築，保持當前狀態但不移動
            this.state = 'hiding'; // 直接進入躲避狀態，就地躲避
        }
    }

    // 處理躲避狀態
    handleHidingState() {
        // 在躲避狀態下，村民什麼都不做，只是等待天亮
        // 可以在這裡添加一些動畫效果或者其他邏輯
    }

    // 處理第一棟城堡建造模式
    handleFirstCastleConstruction() {
        // 在第一棟城堡建造模式下，村民會圍繞城堡隨機走動
        // 如果村民沒有移動路徑，立即開始新的隨機移動
        if (this.path.length === 0) {
            this.startRandomCastleMovement();
        }
    }

    // 更新第一棟城堡建造模式的移動
    updateFirstCastleMovement(currentTime) {
        // 如果村民正在建造工作，不要打斷
        if (this.state === 'constructing') {
            return;
        }
        
        // 如果村民沒有移動路徑，立即開始新的隨機移動
        if (!this.path || this.path.length === 0) {
            this.startRandomCastleMovement();
        }
    }

    // 開始圍繞城堡的隨機移動
    startRandomCastleMovement() {
        if (!this.castleCenter) return;
        
        // 在城堡周圍的假想圓弧上隨機選擇一個點
        const radius = 5 + Math.random() * 3; // 5-8格的隨機半徑，形成圓弧範圍
        const angle = Math.random() * Math.PI * 2; // 完整圓周的隨機角度
        
        const targetX = this.castleCenter.x + Math.cos(angle) * radius;
        const targetY = this.castleCenter.y + Math.sin(angle) * radius;
        
        // 確保目標位置在地圖範圍內
        const clampedX = Math.max(0, Math.min(this.grid.size - 1, Math.round(targetX)));
        const clampedY = Math.max(0, Math.min(this.grid.size - 1, Math.round(targetY)));
        
        // 直接創建直線路徑到目標位置（會穿過城堡）
        this.createPath(clampedX, clampedY);
    }

    handleIdleState(treeManager) {
        // 如果是夜晚，不進行任何工作活動
        if (this.isNight) {
            return;
        }
        
        // 調試日誌：打印村民狀態
        console.log(`村民 ${this.id.slice(-8)} 進入閒置狀態檢查: 木材=${this.wood}, 食物=${this.food}, 建築分配=${this.constructionBuilding ? this.constructionBuilding.type : '無'}`);
        
        // 最高優先級：檢查是否已分配到未完成的建築工作
        if (this.constructionBuilding && !this.constructionBuilding.isComplete) {

            // 確保建築的工人列表中有這個村民
            if (!this.constructionBuilding.constructionWorkers.includes(this)) {
                this.constructionBuilding.addWorker(this);
            }
            
            console.log(`村民 ${this.id.slice(-8)} 繼續已分配的建築工作: ${this.constructionBuilding.type}`);
            this.state = 'constructing';
            return;
        }
        
        // 特殊處理：第一棟城堡建造模式
        if (this.firstCastleMode && this.castleCenter) {
            // 在第一棟城堡模式下，優先嘗試建造工作
            if (this.tryFindConstructionWork()) {
                console.log(`村民 ${this.id.slice(-8)} 找到第一城堡建造工作`);
                return; // 找到建造工作，結束
            }
            // 如果沒有找到建造工作，就隨機走動
            this.handleFirstCastleConstruction();
            return;
        }
        
        // 第二優先級：檢查是否有未完成的建築需要建造（會強制打斷其他工作）
        if (this.tryFindConstructionWorkWithHighestPriority()) {
            console.log(`村民 ${this.id.slice(-8)} 找到最高優先級建造工作`);
            return; // 成功找到建造工作，結束
        }
        
        // 檢查是否有完成的城堡（一次檢查，多次使用）
        const gridPos = this.grid.worldToGrid(this.x, this.z);
        const nearestCastleForWork = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
        const hasCompletedCastle = nearestCastleForWork !== null;
        
        // 正確的優先級順序：建造 > 種田 > 資源上繳 > 伐木
        
        // 優先級1：檢查是否有建築需要建造（即使攜帶資源也優先建造）
        if (this.tryFindConstructionWork()) {
            console.log(`村民 ${this.id.slice(-8)} 找到一般建造工作（攜帶資源: ${this.wood > 0 || this.food > 0}）`);
            return; // 成功找到建造工作，結束
        }
        
        // 優先級2：嘗試找農田工作（即使攜帶資源也優先種田）
        if (this.tryFindFarmWork()) {
            console.log(`村民 ${this.id.slice(-8)} 找到農田工作（攜帶資源: ${this.wood > 0 || this.food > 0}）`);
            return; // 成功找到農田工作，結束
        }
        
        // 優先級3：如果攜帶了資源且沒有建造/種田工作，才上繳到城堡
        if (this.wood > 0 || this.food > 0) {
            console.log(`村民 ${this.id.slice(-8)} 攜帶資源，準備上繳到城堡`);
            const nearestCastle = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
            
            if (nearestCastle) {
                if (nearestCastle.distance <= 10) {
                    // 已經在城堡附近，直接上繳資源
                    console.log(`村民 ${this.id.slice(-8)} 在城堡附近，直接上繳資源`);
                    this.deliverResources();
                    return;
                } else {
                    // 需要移動到城堡 - 修復座標格式
                    console.log(`村民 ${this.id.slice(-8)} 前往城堡上繳資源`);
                    const worldPos = this.grid.gridToWorld(nearestCastle.x, nearestCastle.y);
                    this.target = { x: worldPos.x, z: worldPos.z };
                    this.state = 'movingToCastle';
                    this.createPath(nearestCastle.x, nearestCastle.y);
                }
            }
            return;
        }
        
        // 最後，如果有完成的城堡且沒有農田可種，才去砍樹（優先度4）
        if (hasCompletedCastle) {
            // 檢查是否在資源上繳冷卻期內（防止立即重新砍樹）
            const currentTime = Date.now();
            const cooldownTime = this.lastResourceDeliveryTime ? (currentTime - this.lastResourceDeliveryTime) : 9999;
            
            console.log(`村民 ${this.id.slice(-8)} 檢查砍樹冷卻期: 時間差=${cooldownTime}ms, 冷卻期=${cooldownTime < 2000 ? '進行中' : '已結束'}`);
            
            if (this.lastResourceDeliveryTime && cooldownTime < 2000) {
                console.log(`村民 ${this.id.slice(-8)} 在冷卻期內，隨機移動`);
                // 冷卻期內，進行隨機移動
                if (this.path.length === 0) {
                    this.startRandomMovement();
                }
                return;
            }
            
            const nearestTree = this.grid.findNearestTree(gridPos.x, gridPos.y);
            
            if (nearestTree) {
                console.log(`村民 ${this.id.slice(-8)} 開始新的砍樹任務 at (${nearestTree.x}, ${nearestTree.y})`);
                
                // 計算樹旁邊的砍樹位置（避免重疊）
                const choppingPosition = this.calculateChoppingPosition(nearestTree.x, nearestTree.y);
                
                // 將grid座標轉換為world座標，並確保target格式正確
                const worldPos = this.grid.gridToWorld(choppingPosition.x, choppingPosition.y);
                this.target = { 
                    x: worldPos.x, 
                    z: worldPos.z,
                    treeX: nearestTree.x,  // 保存原始樹木位置用於砍樹
                    treeY: nearestTree.y
                };
                this.state = 'movingToTree';
                
                this.createPath(choppingPosition.x, choppingPosition.y);
                return; // 成功找到砍樹工作，結束
            } else {
                console.log(`村民 ${this.id.slice(-8)} 找不到樹木`);
            }
        } else {
            console.log(`村民 ${this.id.slice(-8)} 沒有完成的城堡，無法砍樹`);
        }
        
        // 如果既沒有建造、砍樹、農田工作，且不是夜晚，讓村民進行隨機移動避免站著不動
        if (!this.isNight && this.path.length === 0) {
            this.startRandomMovement();
        }
    }
    
    // 開始隨機移動（用於無工作時的閒置狀態）
    startRandomMovement() {
        const gridPos = this.grid.worldToGrid(this.x, this.z);
        
        // 在村民周圍3-8格範圍內隨機選擇一個點
        const radius = 3 + Math.random() * 5; // 3-8格的隨機半徑
        const angle = Math.random() * Math.PI * 2; // 完整圓周的隨機角度
        
        const targetX = gridPos.x + Math.cos(angle) * radius;
        const targetY = gridPos.y + Math.sin(angle) * radius;
        
        // 確保目標位置在地圖範圍內
        const clampedX = Math.max(0, Math.min(this.grid.size - 1, Math.round(targetX)));
        const clampedY = Math.max(0, Math.min(this.grid.size - 1, Math.round(targetY)));
        
        // 只有當目標位置與當前位置不同時才創建路徑
        if (clampedX !== gridPos.x || clampedY !== gridPos.y) {
            this.createPath(clampedX, clampedY);
        }
    }

    handleChoppingState(treeManager) {
        if (this.choppingTree) {
            // 村民現在在樹的旁邊砍樹，不會重疊遮擋
            this.choppingProgress++;
            console.log(`村民 ${this.id.slice(-8)} 砍樹進度: ${this.choppingProgress}/10`);
            
            // 修改：每砍一下就獲得木材並立即上繳，而不是等10次
            console.log(`村民 ${this.id.slice(-8)} 砍樹一次前: 木材=${this.wood}`);
            this.wood = 1; // 每砍一下就獲得1木材
            console.log(`村民 ${this.id.slice(-8)} 砍樹一次後: 木材=${this.wood}`);
            
            // 每10次採伐後樹木才會消失
            if (this.choppingProgress >= 10) {
                treeManager.chopTree(this.choppingTree.x, this.choppingTree.y);
                console.log(`村民 ${this.id.slice(-8)} 砍樹10次，樹木消失`);
            }
            
            console.log(`村民 ${this.id.slice(-8)} 獲得木材，立即前往城堡上繳`);
            
            // 清理砍樹相關狀態
            this.choppingTree = null;
            this.choppingProgress = 0;
            this.target = null; // 清除目標
            this.path = []; // 清除路徑
            
            console.log(`村民 ${this.id.slice(-8)} 清理砍樹狀態後: 木材=${this.wood}, 狀態將變為movingToCastle`);
            
            // 直接前往城堡，而不是變成閒置狀態
            const gridPos = this.grid.worldToGrid(this.x, this.z);
            const nearestCastle = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
            
            if (nearestCastle && nearestCastle.distance <= 50) {
                const worldPos = this.grid.gridToWorld(nearestCastle.x, nearestCastle.y);
                this.target = { x: worldPos.x, z: worldPos.z };
                this.state = 'movingToCastle';
                this.createPath(nearestCastle.x, nearestCastle.y);
                console.log(`村民 ${this.id.slice(-8)} 開始前往城堡，攜帶木材: ${this.wood}`);
            } else {
                // 如果找不到城堡，才設為閒置
                console.log(`村民 ${this.id.slice(-8)} 找不到城堡，設為閒置狀態，攜帶木材: ${this.wood}`);
                this.state = 'idle';
            }
        } else {
            // 如果沒有砍樹目標，強制重置為閒置狀態
            console.warn(`村民 ${this.id.slice(-8)} 處於砍樹狀態但沒有砍樹目標，重置為閒置`);
            this.state = 'idle';
            this.choppingProgress = 0;
            this.target = null;
            this.path = [];
        }
    }

    handleFarmingState() {
        // 檢查農田是否還存在且已完成建造
        if (!this.workingFarm || this.workingFarm.needsDestruction?.() || !this.workingFarm.isComplete) {
            if (this.workingFarm) {
                this.workingFarm.removeWorker(this);
            }
            this.workingFarm = null;
            this.state = 'idle';
            this.target = null;
            this.path = [];
            return;
        }
        
        // 選擇隨機采集點並移動
        if (this.workingFarm) {
            try {
                const harvestPoint = this.workingFarm.getRandomHarvestPoint();
                if (!harvestPoint) {
                    this.state = 'idle';
                    return;
                }
                
                this.target = harvestPoint;
                this.state = 'harvestingFarm';
                this.harvestProgress = 0; // 重置收割進度，確保不會立即完成
                
                
                // 移動到采集點
                const gridPos = this.grid.worldToGrid(harvestPoint.x, harvestPoint.z);
                
                // 確保坐標有效
                if (gridPos.x >= 0 && gridPos.x < this.grid.size && gridPos.y >= 0 && gridPos.y < this.grid.size) {
                    this.createPath(gridPos.x, gridPos.y);
                } else {
                    // 使用農田中心作為備用
                    const farmCenter = this.workingFarm.getWorldPosition();
                    const farmCenterGrid = this.grid.worldToGrid(farmCenter.x, farmCenter.z);
                    this.target = { x: farmCenter.x, z: farmCenter.z };
                    this.createPath(farmCenterGrid.x, farmCenterGrid.y);
                }
            } catch (error) {
                this.state = 'idle';
                this.target = null;
                this.path = [];
            }
        } else {
            this.state = 'idle';
            this.target = null;
            this.path = [];
        }
    }

    handleHarvestingState() {
        // 檢查農田是否還存在且已完成建造
        if (!this.workingFarm || this.workingFarm.needsDestruction?.() || !this.workingFarm.isComplete) {
            if (this.workingFarm) {
                this.workingFarm.removeWorker(this);
            }
            this.workingFarm = null;
            this.state = 'idle';
            this.harvestProgress = 0;
            this.target = null;
            this.path = [];
            return;
        }

        // 檢查是否有目標位置
        if (!this.target) {
            // 如果沒有目標，重新選擇采集點
            try {
                const harvestPoint = this.workingFarm.getRandomHarvestPoint();
                if (!harvestPoint) {
                    this.state = 'farming'; // 回到farming狀態重新嘗試
                    return;
                }
                this.target = harvestPoint;
                
                const gridPos = this.grid.worldToGrid(harvestPoint.x, harvestPoint.z);
                if (gridPos.x >= 0 && gridPos.x < this.grid.size && gridPos.y >= 0 && gridPos.y < this.grid.size) {
                    this.createPath(gridPos.x, gridPos.y);
                }
            } catch (error) {
                this.state = 'idle';
            }
            return;
        }

        // 檢查是否到達目標位置
        if (!this.target || typeof this.target.x !== 'number' || typeof this.target.z !== 'number') {
            this.target = null;
            this.state = 'farming';
            return;
        }
        
        const distance = Math.sqrt(
            Math.pow(this.x - this.target.x, 2) +
            Math.pow(this.z - this.target.z, 2)
        );

        if (distance < 1.5) {
            this.harvestProgress++;
            
            if (this.harvestProgress >= 5) {
                // 采集完成，讓村民攜帶食物去上繳，但保持農田分配
                this.food = 1; // 攜帶食物作為視覺效果
                this.harvestProgress = 0;
                
                // 注意：不要移除 workingFarm 分配，讓村民上繳完食物後能回來
                // this.workingFarm.removeWorker(this); // 暫時註釋掉
                // this.workingFarm = null; // 暫時註釋掉
                this.target = null;
                this.path = [];
                this.state = 'idle'; // 設為idle，讓村民去上繳食物
            }
        } else if (this.path.length === 0) {
            // 如果距離目標還很遠但沒有路徑，重新創建路徑
            const gridPos = this.grid.worldToGrid(this.target.x, this.target.z);
            if (gridPos.x >= 0 && gridPos.x < this.grid.size && gridPos.y >= 0 && gridPos.y < this.grid.size) {
                this.createPath(gridPos.x, gridPos.y);
            } else {
                this.target = null; // 清除無效目標，下次會重新選擇
            }
        }
    }

    tryFindFarmWork() {
        // 如果在第一棟城堡建造模式，不分配農田工作
        if (this.firstCastleMode) {
            return false;
        }
        
        // 首先檢查是否已經分配到農田且需要回到農田工作
        if (this.workingFarm && this.workingFarm.isComplete) {
            // 確保農田知道這個村民是它的工人
            if (this.workingFarm.workingVillager !== this) {
                this.workingFarm.setWorker(this);
            }
            const worldPos = this.workingFarm.getWorldPosition();
            this.target = { x: worldPos.x, z: worldPos.z };
            this.state = 'movingToFarm';
            
            const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
            this.createPath(gridPos.x, gridPos.y);
            return true;
        }
        
        // 尋找需要工人的已完成農田
        const availableFarms = this.buildingManager.farms.filter(farm => {
            return farm.isComplete && !farm.hasWorker();
        });
        
        if (availableFarms.length > 0) {
            const farm = availableFarms[0];
            
            // 嘗試分配到農田
            if (!farm.setWorker(this)) {
                return false;
            }
            
            const worldPos = farm.getWorldPosition();
            this.target = { x: worldPos.x, z: worldPos.z };
            this.state = 'movingToFarm';
            this.workingFarm = farm;
            
            const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
            this.createPath(gridPos.x, gridPos.y);
            
            return true;
        }
        
        return false;
    }

    // 嘗試找到建造工作（最高優先級，會強制打斷其他工作）
    tryFindConstructionWorkWithHighestPriority() {
        // 檢查是否為夜晚時間（18:00後），如果是則禁止開始新建造
        if (this.isNightTime()) {
            return false;
        }
        
        // 找出所有需要工人的建築
        const buildingsNeedingWorkers = [];
        
        // 檢查所有建築類型（但排除已完成的農田，因為它們有獨立的耕種系統）
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms.filter(farm => farm.isUnderConstruction) // 只包含建造中的農田
        ];
        
        allBuildings.forEach(building => {
            // 檢查建築是否需要更多工人，或者工人數不足但仍在建造中
            if (building.isUnderConstruction && building.constructionWorkers.length < building.maxWorkers) {
                const worldPos = building.getWorldPosition();
                const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
                const distance = Math.abs(this.grid.worldToGrid(this.x, this.z).x - gridPos.x) + 
                               Math.abs(this.grid.worldToGrid(this.x, this.z).y - gridPos.y);
                buildingsNeedingWorkers.push({ building, distance });
            }
        });
        
        if (buildingsNeedingWorkers.length > 0) {
            // 找到最近的需要工人的建築
            buildingsNeedingWorkers.sort((a, b) => a.distance - b.distance);
            const building = buildingsNeedingWorkers[0].building;
            
            // 如果村民在農田工作，先離開農田
            if (this.workingFarm) {
                this.workingFarm.removeWorker?.(this);
                this.workingFarm = null;
            }
            
            // 清理當前工作狀態
            this.choppingTree = null;
            this.choppingProgress = 0;
            this.path = [];
            this.target = null;
            
            if (building.addWorker(this)) {
                this.constructionBuilding = building;
                this.state = 'constructing';
                return true;
            }
        }
        
        return false; // 沒有可用的建造工作
    }

    // 嘗試找到建造工作
    tryFindConstructionWork() {
        // 檢查是否為夜晚時間（18:00後），如果是則禁止開始新建造
        if (this.isNightTime()) {
            return false;
        }
        
        // 特殊處理：如果有第一棟城堡且正在特殊模式下
        if (this.villagerManager && this.villagerManager.firstCastle) {
            const firstCastle = this.villagerManager.firstCastle;
            
            // 檢查第一棟城堡是否需要工人
            if (firstCastle.needsMoreWorkers && firstCastle.needsMoreWorkers()) {
                if (firstCastle.addWorker(this)) {
                    this.constructionBuilding = firstCastle;
                    this.state = 'constructing';
                    return true;
                }
            }
            
            // 如果在第一棟城堡模式下，但第一棟城堡不需要工人，就隨機走動
            if (this.firstCastleMode) {
                return false;
            }
        }
        
        // 正常模式下尋找需要工人的建築
        const buildingsNeedingWorkers = [];
        
        // 檢查所有建築類型（但排除已完成的農田，因為它們有獨立的耕種系統）
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms.filter(farm => farm.isUnderConstruction) // 只包含建造中的農田
        ];
        
        allBuildings.forEach(building => {
            if (building.needsMoreWorkers && building.needsMoreWorkers()) {
                const worldPos = building.getWorldPosition();
                const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
                const distance = Math.abs(this.grid.worldToGrid(this.x, this.z).x - gridPos.x) + 
                               Math.abs(this.grid.worldToGrid(this.x, this.z).y - gridPos.y);
                buildingsNeedingWorkers.push({ building, distance });
            }
        });
        
        if (buildingsNeedingWorkers.length > 0) {
            // 找到最近的需要工人的建築
            buildingsNeedingWorkers.sort((a, b) => a.distance - b.distance);
            const building = buildingsNeedingWorkers[0].building;
            
            if (building.addWorker(this)) {
                this.constructionBuilding = building;
                this.state = 'constructing';
                
                return true;
            }
        }
        
        return false; // 沒有可用的建造工作
    }

    // 處理建造狀態
    handleConstructingState() {
        // 檢查是否進入夜晚時間，如果是則停止建造並準備躲避
        if (this.isNightTime()) {
            // 只清理建造相關的臨時狀態，不清理建築分配
            // 注意：不清理 this.constructionBuilding，讓夜晚重置邏輯處理
            this.workPosition = null;
            this.assignedToPart = null;
            this.targetBuildPosition = null;
            this.target = null;
            this.path = [];
            this.state = 'idle'; // 設為idle，讓夜晚處理邏輯接管
            
            return;
        }
        
        // 檢查建築是否已完成或不存在
        if (!this.constructionBuilding || this.constructionBuilding.isComplete) {
            // 清理建造相關狀態
            if (this.constructionBuilding) {
                this.constructionBuilding.removeWorker?.(this);
            }
            this.constructionBuilding = null;
            this.workPosition = null;
            this.assignedToPart = null;
            this.targetBuildPosition = null;
            this.target = null;
            this.path = [];
            this.state = 'idle';
            
            return;
        }
        
        // 檢查是否需要移動到新的建造位置
        if (this.targetBuildPosition) {
            const currentGridPos = this.grid.worldToGrid(this.x, this.z);
            const targetDistance = Math.abs(currentGridPos.x - this.targetBuildPosition.x) + 
                                 Math.abs(currentGridPos.y - this.targetBuildPosition.y);
            
            if (targetDistance > 1) {
                // 還未到達目標位置，繼續移動
                if (this.path.length === 0) {
                    this.createPath(this.targetBuildPosition.x, this.targetBuildPosition.y);
                }
                return;
            } else {
                // 已到達建造位置
                this.targetBuildPosition = null; // 清除目標位置
            }
        }
        
        // 在建造位置等待建造完成，實際的建造邏輯在建築的updateConstruction方法中處理
    }

    // 個別村民上繳資源到城堡
    deliverResources() {
        // 檢查村民是否在城堡附近
        const gridPos = this.grid.worldToGrid(this.x, this.z);
        const nearestCastle = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
        
        console.log(`村民 ${this.id.slice(-8)} 嘗試上繳資源: 木材=${this.wood}, 食物=${this.food}, 最近城堡距離=${nearestCastle ? nearestCastle.distance : '無'}`);
        
        if (nearestCastle && nearestCastle.distance <= 10) {
            // 找到對應的城堡建築對象 - 擴大搜尋範圍
            const castle = this.buildingManager.castles.find(c => {
                const manhattanDistance = Math.abs(c.x - nearestCastle.x) + Math.abs(c.y - nearestCastle.y);
                return manhattanDistance <= 10; // 使用曼哈頓距離，擴大到 10
            });
            
            if (this.wood > 0) {
                // 需要通過villagerManager來更新木材庫存
                if (this.villagerManager) {
                    this.villagerManager.woodInventory += this.wood;
                }
                console.log(`村民 ${this.id.slice(-8)} 上繳 ${this.wood} 木材`);
                this.wood = 0;
            }
            
            if (this.food > 0) {
                console.log(`村民 ${this.id.slice(-8)} 上繳 ${this.food} 食物`);
                this.food = 0; // 清空攜帶的食物
            }
            
            // 如果村民有分配的農田，讓他們立即回到農田繼續工作
            if (this.workingFarm && this.workingFarm.isComplete) {
                console.log(`村民 ${this.id.slice(-8)} 上繳資源完成，返回農田工作`);
                // 直接移動到農田，不要變成idle
                const worldPos = this.workingFarm.getWorldPosition();
                this.target = { x: worldPos.x, z: worldPos.z };
                this.state = 'movingToFarm';
                
                const gridPos = this.grid.worldToGrid(worldPos.x, worldPos.z);
                this.createPath(gridPos.x, gridPos.y);
            } else {
                console.log(`村民 ${this.id.slice(-8)} 上繳資源完成，設定冷卻期並等待下次任務分配`);
                // 設定一個短暫的冷卻期，避免立即重新砍樹
                this.state = 'idle';
                this.target = null;
                this.lastResourceDeliveryTime = Date.now(); // 記錄上繳時間
                console.log(`村民 ${this.id.slice(-8)} 冷卻期開始，時間戳: ${this.lastResourceDeliveryTime}`);
            }
        } else {
            console.log(`村民 ${this.id.slice(-8)} 找不到城堡或距離太遠，重置為閒置狀態`);
            // 如果找不到城堡，強制重設為閒置狀態，避免卡住
            this.state = 'idle';
            this.target = null;
            
            // 清空資源，避免一直嘗試上繳
            if (this.wood > 0 || this.food > 0) {
                console.log(`村民 ${this.id.slice(-8)} 清空資源: 木材=${this.wood}, 食物=${this.food}`);
                this.wood = 0;
                this.food = 0;
            }
        }
    }

    createPath(targetGridX, targetGridY) {
        // 簡單的直線路徑（可以後續改進為A*尋路）
        const currentGridPos = this.grid.worldToGrid(this.x, this.z);
        const startX = currentGridPos.x;
        const startY = currentGridPos.y;
        
        const dx = targetGridX - startX;
        const dy = targetGridY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return;
        }
        
        const steps = Math.ceil(distance);
        this.path = [];
        
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const gridX = Math.round(startX + dx * progress);
            const gridY = Math.round(startY + dy * progress);
            const worldPos = this.grid.gridToWorld(gridX, gridY);
            
            this.path.push({ x: worldPos.x, z: worldPos.z });
        }
    }

    // 計算砍樹位置（在樹的旁邊而不是重疊）
    calculateChoppingPosition(treeX, treeY) {
        // 嘗試不同的相鄰位置，優先選擇可到達且不重疊的位置
        const offsets = [
            { x: 1, y: 0 },   // 右邊
            { x: -1, y: 0 },  // 左邊
            { x: 0, y: 1 },   // 上邊
            { x: 0, y: -1 },  // 下邊
            { x: 1, y: 1 },   // 右上
            { x: -1, y: 1 },  // 左上
            { x: 1, y: -1 },  // 右下
            { x: -1, y: -1 }  // 左下
        ];
        
        for (const offset of offsets) {
            const posX = treeX + offset.x;
            const posY = treeY + offset.y;
            
            // 檢查位置是否在地圖範圍內
            if (posX >= 0 && posX < this.grid.size && 
                posY >= 0 && posY < this.grid.size) {
                
                // 檢查位置是否可到達（不是建築物或其他障礙物）
                // 這裡可以添加更多障礙物檢查
                return { x: posX, y: posY };
            }
        }
        
        // 如果沒有找到合適的位置，回退到樹的位置（但這應該很少發生）
        return { x: treeX, y: treeY };
    }

    onReachTarget() {
        const gridPos = this.grid.worldToGrid(this.x, this.z);
        
        switch (this.state) {
            case 'movingToTree':
                if (this.target) {
                    // 使用保存的樹木位置創建砍樹目標
                    this.choppingTree = {
                        x: this.target.treeX || this.target.x,
                        y: this.target.treeY || this.target.y
                    };
                    this.state = 'chopping';
                    this.choppingProgress = 0;
                    
                    // 村民現在在樹旁邊，不需要額外移動
                    // 砍樹時村民會待在當前位置（樹的旁邊）
                }
                break;
                
            case 'movingToCastle':
                // 到達城堡，上繳攜帶的資源
                
                // 調用個別村民資源上繳邏輯
                this.deliverResources();
                // 注意：不在這裡設定 state，讓 deliverResources 方法負責狀態管理
                break;
                
            case 'movingToFarm':
                // 到達農田，檢查農田是否完成建造後開始尋找採集點
                if (this.workingFarm && this.workingFarm.isComplete) {
                    this.state = 'farming';
                } else {
                    if (this.workingFarm) {
                        this.workingFarm.removeWorker(this);
                        this.workingFarm = null;
                    }
                    this.state = 'idle';
                }
                break;
                
            case 'harvestingFarm':
                // 到達新的采集點，繼續采集狀態
                break;
                
            case 'movingToShelter':
                // 到達避難所，開始躲避
                this.state = 'hiding';
                // 讓村民隱形，造成走進屋內的視覺效果
                this.setVisibility(false);
                break;
                
            case 'movingToConstruction':
                // 到達建築工地，開始建造
                if (this.constructionBuilding && !this.constructionBuilding.isComplete) {
                    this.state = 'constructing';
                } else {
                    this.constructionBuilding = null;
                    this.target = null;
                    this.state = 'idle';
                }
                break;
                
            case 'idle':
                // 處理隨機移動結束的情況 - 清除目標並保持idle狀態
                this.target = null;
                break;
                
            default:
                // 處理其他未明確定義的狀態 - 重設為idle
                this.target = null;
                this.state = 'idle';
                break;
        }
    }

    // 銷毀村民
    destroy() {
        if (this.workingFarm) {
            this.workingFarm.removeWorker();
        }
        
        if (this.constructionBuilding) {
            this.constructionBuilding.removeWorker(this);
        }
        
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        
        // 清理躲避狀態
        this.shelterBuilding = null;
        this.state = 'idle';
        
        // 清理第一棟城堡模式
        this.firstCastleMode = false;
        this.castleCenter = null;
    }

    // 設置村民可見性
    setVisibility(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    // 獲取村民狀態信息
    getStatus() {
        return {
            id: this.id,
            position: { x: this.x, z: this.z },
            state: this.state,
            wood: this.wood,
            workingFarm: this.workingFarm ? this.workingFarm.id : null
        };
    }
}

// 村民管理器
class VillagerManager {
    constructor(grid, scene, buildingManager) {
        this.grid = grid;
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.villagers = new Map();
        this.woodInventory = 0;
        this.wasNight = false; // 追蹤上一次的夜晚狀態
        this.firstCastleBeingBuilt = false; // 追蹤第一棟城堡建造狀態
        this.firstCastle = null; // 第一棟城堡的引用
    }

    // 檢查是否為夜晚時間（18:00後）
    isNightTime() {
        // 從全局或場景中獲取當前時間
        if (window.gameTime && window.gameTime.currentHour !== undefined) {
            return window.gameTime.currentHour >= 18 || window.gameTime.currentHour < 6;
        }
        
        // 備用方案：使用wasNight標記
        return this.wasNight;
    }

    // 創建村民
    createVillager(x, z) {
        const villager = new Villager(x, z, this.grid, this.scene, this.buildingManager, this);
        this.villagers.set(villager.id, villager);
        return villager;
    }

    // 更新所有村民
    update(currentTime, treeManager, isNight = false) {
        // 檢查第一棟城堡的建造狀態
        this.updateFirstCastleStatus();
        
        // 定期檢查並確保建造工人分配（每5秒檢查一次）
        if (!this.lastConstructionCheck || currentTime - this.lastConstructionCheck >= 5000) {
            this.ensureConstructionWorkersAssigned();
            this.lastConstructionCheck = currentTime;
        }
        
        // 定期檢查村民可見性（每10秒檢查一次，防止村民意外消失）
        if (!this.lastVisibilityCheck || currentTime - this.lastVisibilityCheck >= 10000) {
            this.checkVillagerVisibility(isNight);
            this.lastVisibilityCheck = currentTime;
        }

        
        // 檢查是否剛進入夜晚狀態
        if (isNight && !this.wasNight) {
            this.resetAllVillagersForNight();
        }
        
        // 檢查是否剛從夜晚轉為白天
        if (!isNight && this.wasNight) {
            this.reassignVillagersAfterDawn();
        }
        
        this.wasNight = isNight;
        
        for (const villager of this.villagers.values()) {
            villager.update(currentTime, treeManager, isNight);
        }
        
        // 移除自動收集邏輯，改由個別村民在到達城堡時直接上繳
        // this.collectWood();
    }

    collectWood() {
        for (const villager of this.villagers.values()) {
            if (villager.state === 'idle' && (villager.wood > 0 || villager.food > 0)) {
                
                // 檢查村民是否在城堡附近（傳遞buildingManager以檢查城堡完成狀態）
                const gridPos = this.grid.worldToGrid(villager.x, villager.z);
                const nearestCastle = this.grid.findNearestCastle(gridPos.x, gridPos.y, this.buildingManager);
                
                if (nearestCastle && nearestCastle.distance <= 10) {
                    // 找到對應的城堡建築對象（修正坐標匹配）
                    const castle = this.buildingManager.castles.find(c => {
                        return Math.abs(c.x - nearestCastle.x) <= 3 && 
                               Math.abs(c.y - nearestCastle.y) <= 3;
                    });
                    
                    if (villager.wood > 0) {
                        this.woodInventory += villager.wood;
                        villager.wood = 0;
                    }
                    // 上繳食物（只做視覺效果，不實際增加食物資源）
                    if (villager.food > 0 && castle) {
                        villager.food = 0; // 清空攜帶的食物
                        // 注意：不調用 castle.addFood()，因為我們移除了食物資源系統
                    }
                    
                    // 資源上繳完成
                    if (villager.wood === 0 && villager.food === 0) {
                        villager.state = 'idle';
                        villager.target = null;
                        villager.path = [];
                        
                        // 如果村民有分配的農田，讓他們立即回到農田繼續工作
                        if (villager.workingFarm && villager.workingFarm.isComplete) {
                            // 讓村民在下一輪idle處理時直接找到他們的農田工作
                        } else {
                            // 重設為閒置狀態
                        }
                    }
                } else {
                    // 無法找到附近的完成城堡來上繳資源
                }
            }
        }
    }

    // 夜晚時重置所有村民狀態
    resetAllVillagersForNight() {
        for (const villager of this.villagers.values()) {
            // 保存重要的持久性數據
            const savedWorkingFarm = villager.workingFarm;
            const savedWood = villager.wood;
            const savedFood = villager.food;
            const savedConstructionBuilding = villager.constructionBuilding;
            const wasHiding = (villager.state === 'hiding' || villager.state === 'movingToShelter');
            
            // 清理可能導致卡住的臨時狀態（包括躲避狀態的村民）
            villager.path = [];
            villager.target = null;
            villager.choppingTree = null;
            villager.choppingProgress = 0;
            villager.harvestProgress = 0;
            
            // 清理建造相關的臨時狀態，但保持建築分配
            villager.workPosition = null;
            villager.assignedToPart = null;
            villager.targetBuildPosition = null;
            
            // 恢復重要數據 - 確保建築分配在所有情況下都被保存
            villager.workingFarm = savedWorkingFarm;
            villager.wood = savedWood;
            villager.food = savedFood;
            // 只要建築還未完成，就保持分配關係
            if (savedConstructionBuilding && !savedConstructionBuilding.isComplete) {
                villager.constructionBuilding = savedConstructionBuilding;
            } else if (savedConstructionBuilding && savedConstructionBuilding.isComplete) {
                // 建築已完成，清理分配
                villager.constructionBuilding = null;
            } else {
                villager.constructionBuilding = null;
            }
            
            // 設置為閒置狀態，讓村民在白天時重新尋找工作
            villager.state = 'idle';
            
            // 確保村民在地面上（清理任何高度偏移）
            if (villager.mesh) {
                villager.mesh.position.y = 0;
            }
            
            // 確保所有村民都是可見的（修正村民消失問題）
            villager.setVisibility(true);
        }
    }

    // 白天時重新分配村民工作
    reassignVillagersAfterDawn() {
        // 等待片刻讓所有村民完成從躲避狀態的轉換
        setTimeout(() => {
            // 首先確保所有村民都是可見的（修正隱形村民問題）
            for (const villager of this.villagers.values()) {
                villager.setVisibility(true);
            }
            
            // 檢查並修復建築狀態問題
            this.fixBrokenBuildings();
            
            // 最高優先級：立即完成前一晚未完成的建築工作
            this.prioritizeUnfinishedBuildings();
            
            // 首先確保所有未完成建築有足夠工人（最高優先級）
            this.ensureConstructionWorkersAssigned();
            
            // 重新驗證和清理農田分配
            this.validateFarmAssignments();
            
            // 重新分配閒置村民到農田
            this.reassignVillagersToFarms();
            
            // 確保所有村民狀態正常
            for (const villager of this.villagers.values()) {
                if (villager.state === 'idle' && !villager.target && villager.path.length === 0) {
                    // 強制觸發一次狀態檢查，傳遞null作為treeManager參數
                    // 由於我們主要關注農田和建造分配，treeManager在這個階段不是必需的
                }
            }
        }, 100); // 延遲100毫秒確保狀態轉換完成
    }

    // 確保所有未完成建築都有足夠工人（最高優先級）
    ensureConstructionWorkersAssigned() {
        // 檢查是否為夜晚時間，如果是則不分配新的建造工作
        if (this.isNightTime()) {
            return;
        }
        
        // 第一步：重新激活已經分配給未完成建築的村民
        let reactivatedWorkers = 0;
        for (const villager of this.villagers.values()) {
            if (villager.constructionBuilding && 
                !villager.constructionBuilding.isComplete && 
                villager.state === 'idle') {
                
                // 確保建築記錄中有這個工人
                if (!villager.constructionBuilding.constructionWorkers.includes(villager)) {
                    villager.constructionBuilding.addWorker(villager);
                }
                
                villager.state = 'constructing';
                reactivatedWorkers++;
            }
        }
        
        // 第二步：找出所有需要工人的建築，按優先級排序
        const buildingsNeedingWorkers = [];
        
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms.filter(farm => farm.isUnderConstruction)
        ];
        
        allBuildings.forEach(building => {
            if (building.isUnderConstruction && building.constructionWorkers.length < building.maxWorkers) {
                const shortfall = building.maxWorkers - building.constructionWorkers.length;
                const progress = building.constructionProgress || 0;
                const maxProgress = building.constructionRequired || 100;
                
                buildingsNeedingWorkers.push({ 
                    building, 
                    shortfall, 
                    progress,
                    progressPercent: (progress / maxProgress) * 100,
                    priority: this.getBuildingPriority(building, progress, maxProgress)
                });
            }
        });
        
        // 按優先級排序：已經開工的建築 > 新建築，進度越高優先級越高
        buildingsNeedingWorkers.sort((a, b) => {
            // 優先完成已經開工的建築
            if (a.progress > 0 && b.progress === 0) return -1;
            if (a.progress === 0 && b.progress > 0) return 1;
            
            // 在已經開工的建築中，優先完成進度更高的
            if (a.progress > 0 && b.progress > 0) {
                return b.progressPercent - a.progressPercent;
            }
            
            // 在新建築中，按類型優先級排序
            return b.priority - a.priority;
        });
        
        let totalAssignedWorkers = 0;
        for (const { building, shortfall, progressPercent } of buildingsNeedingWorkers) {
            let workersAssigned = 0;
            
            // 從其他工作中調派村民，對於已開工建築更加積極
            const isPartiallyBuilt = progressPercent > 0;
            for (const villager of this.villagers.values()) {
                if (workersAssigned >= shortfall) break;
                
                // 對於已經開工的建築，更積極地調派村民（但不打斷正在砍樹的村民）
                const canReassign = isPartiallyBuilt ? 
                    (villager.state === 'farming' || villager.state === 'harvestingFarm' || 
                     villager.state === 'movingToTree' ||  // 可以打斷正在前往樹木的村民
                     villager.state === 'movingToFarm' || villager.state === 'idle') :
                    (villager.state === 'movingToTree' || villager.state === 'idle');  // 一般情況下不打斷砍樹
                
                if (canReassign && !villager.constructionBuilding && !villager.firstCastleMode) {
                    console.log(`重新分配村民 ${villager.id.slice(-8)} 到建造工作，當前狀態: ${villager.state}, 木材: ${villager.wood}`);
                    
                    // 清理當前工作（但保留資源）
                    if (villager.workingFarm) {
                        villager.workingFarm.removeWorker?.(villager);
                        villager.workingFarm = null;
                    }
                    
                    // 重要：保存村民的資源，清理砍樹狀態時不要清空wood和food
                    const savedWood = villager.wood;
                    const savedFood = villager.food;
                    
                    villager.choppingTree = null;
                    villager.choppingProgress = 0;
                    villager.path = [];
                    villager.target = null;
                    
                    // 恢復資源
                    villager.wood = savedWood;
                    villager.food = savedFood;
                    
                    console.log(`村民 ${villager.id.slice(-8)} 狀態清理完成，保留資源 - 木材: ${villager.wood}, 食物: ${villager.food}`);
                    
                    // 分配到建造工作
                    if (building.addWorker(villager)) {
                        villager.constructionBuilding = building;
                        villager.state = 'constructing';
                        workersAssigned++;
                        totalAssignedWorkers++;
                        console.log(`村民 ${villager.id.slice(-8)} 成功分配到建造工作: ${building.type}`);
                    }
                }
            }
        }
    }
    
    // 獲取建築優先級
    getBuildingPriority(building, progress, maxProgress) {
        // 已經開工的建築總是優先
        if (progress > 0) {
            return 1000 + (progress / maxProgress) * 100;
        }
        
        // 新建築按類型優先級
        switch (building.type) {
            case 'castle': return 100;
            case 'house': return 80;
            case 'tower': return 60;
            case 'farm': return 40;
            default: return 20;
        }
    }
    
    // 優先處理未完成的建築（白天第一件事）
    prioritizeUnfinishedBuildings() {
        const unfinishedBuildings = [];
        
        // 收集所有未完成的建築
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms.filter(farm => farm.isUnderConstruction)
        ];
        
        allBuildings.forEach(building => {
            if (building.isUnderConstruction) {
                const progress = building.constructionProgress || 0;
                const maxProgress = building.constructionRequired || 100;
                const progressPercent = (progress / maxProgress) * 100;
                
                unfinishedBuildings.push({
                    building,
                    progress,
                    progressPercent,
                    currentWorkers: building.constructionWorkers.length,
                    maxWorkers: building.maxWorkers
                });
            }
        });
        
        if (unfinishedBuildings.length > 0) {
            // 按進度降序排序，優先完成進度最高的建築
            unfinishedBuildings.sort((a, b) => b.progressPercent - a.progressPercent);
            
            // 為進度最高的建築分配足夠的工人
            const topBuilding = unfinishedBuildings[0];
            if (topBuilding.currentWorkers < topBuilding.maxWorkers) {
                const needed = topBuilding.maxWorkers - topBuilding.currentWorkers;
                
                this.assignWorkersToBuilding(topBuilding.building, needed, true); // true = 高優先級
            }
        }
    }
    
    // 為特定建築分配工人
    assignWorkersToBuilding(building, needed, highPriority = false) {
        let assigned = 0;
        
        for (const villager of this.villagers.values()) {
            if (assigned >= needed) break;
            
            // 高優先級模式：可以從農田調派工人
            const canAssign = highPriority ?
                (villager.state === 'idle' || villager.state === 'farming' || 
                 villager.state === 'harvestingFarm' || villager.state === 'movingToFarm' ||
                 villager.state === 'chopping' || villager.state === 'movingToTree') :
                (villager.state === 'idle' || villager.state === 'chopping' || 
                 villager.state === 'movingToTree');
                
            if (canAssign && !villager.constructionBuilding && !villager.firstCastleMode) {
                console.log(`assignWorkersToBuilding: 重新分配村民 ${villager.id.slice(-8)}, 當前狀態: ${villager.state}, 木材: ${villager.wood}`);
                
                // 清理現有工作（但保留資源）
                if (villager.workingFarm) {
                    villager.workingFarm.removeWorker?.(villager);
                    villager.workingFarm = null;
                }
                
                // 重要：保存村民的資源
                const savedWood = villager.wood;
                const savedFood = villager.food;
                
                villager.choppingTree = null;
                villager.choppingProgress = 0;
                villager.path = [];
                villager.target = null;
                
                // 恢復資源
                villager.wood = savedWood;
                villager.food = savedFood;
                
                console.log(`assignWorkersToBuilding: 村民 ${villager.id.slice(-8)} 狀態清理完成，保留資源 - 木材: ${villager.wood}`);
                
                // 分配到建築工作
                if (building.addWorker(villager)) {
                    villager.constructionBuilding = building;
                    villager.state = 'constructing';
                    assigned++;
                    console.log(`assignWorkersToBuilding: 村民 ${villager.id.slice(-8)} 成功分配到 ${building.type}`);
                }
            }
        }
        
        return assigned;
    }

    // 驗證農田分配的正確性
    validateFarmAssignments() {
        for (const villager of this.villagers.values()) {
            if (villager.workingFarm) {
                // 檢查農田是否還存在且完整
                if (villager.workingFarm.needsDestruction?.() || !villager.workingFarm.isComplete) {
                    villager.workingFarm.removeWorker?.(villager);
                    villager.workingFarm = null;
                }
                // 檢查農田是否認識這個村民
                else if (villager.workingFarm.workingVillager !== villager) {
                    villager.workingFarm.setWorker?.(villager);
                }
            }
        }
    }

    // 檢查第一棟城堡的建造狀態
    updateFirstCastleStatus() {
        const castles = this.buildingManager.castles;
        
        // 如果還沒有找到第一棟城堡，嘗試找到它
        if (!this.firstCastle && castles.length > 0) {
            this.firstCastle = castles[0]; // 假設第一個城堡就是第一棟城堡
            // 一旦找到第一棟城堡，立即啟動特殊建造模式
            if (!this.firstCastleBeingBuilt) {
                this.firstCastleBeingBuilt = true;
                this.startFirstCastleConstruction();
            }
        }
        
        if (this.firstCastle) {
            // 如果城堡完成建造，結束特殊模式
            if (this.firstCastle.isComplete && this.firstCastleBeingBuilt) {
                this.firstCastleBeingBuilt = false;
                this.finishFirstCastleConstruction();
            }
        }
    }

    // 開始第一棟城堡建造 - 讓所有村民圍繞城堡隨機走動
    startFirstCastleConstruction() {
        if (!this.firstCastle) return;
        
        // 獲取城堡中心位置
        const castleCenter = {
            x: this.firstCastle.x + Math.floor(this.firstCastle.width / 2),
            y: this.firstCastle.y + Math.floor(this.firstCastle.height / 2)
        };
        
        // 讓所有村民圍繞城堡隨機走動
        for (const villager of this.villagers.values()) {
            // 清理村民當前的工作狀態
            this.clearVillagerWorkState(villager);
            
            // 設置為城堡建造模式
            villager.firstCastleMode = true;
            villager.castleCenter = castleCenter;
            villager.state = 'idle'; // 設為idle讓他們重新尋找工作
        }
    }

    // 完成第一棟城堡建造 - 重置所有村民
    finishFirstCastleConstruction() {
        // 重置所有村民狀態
        this.resetAllVillagers();
        
        // 重新分配村民到正常工作
        setTimeout(() => {
            this.reassignVillagersToFarms();
        }, 200); // 延遲一點時間確保重置完成
    }

    // 清理村民的工作狀態
    clearVillagerWorkState(villager) {
        // 清理農田工作
        if (villager.workingFarm) {
            villager.workingFarm.removeWorker?.(villager);
            villager.workingFarm = null;
        }
        
        // 清理建造工作（除了第一棟城堡）
        if (villager.constructionBuilding && villager.constructionBuilding !== this.firstCastle) {
            villager.constructionBuilding.removeWorker?.(villager);
            villager.constructionBuilding = null;
        }
        
        // 清理移動和目標（但保留正在建造第一棟城堡的村民的目標）
        if (villager.constructionBuilding !== this.firstCastle) {
            villager.path = [];
            villager.target = null;
        }
        
        villager.choppingTree = null;
        villager.choppingProgress = 0;
        villager.harvestProgress = 0;
    }

    // 完全重置所有村民（用於第一棟城堡完成後）
    resetAllVillagers() {
        for (const villager of this.villagers.values()) {
            // 清理第一棟城堡模式
            villager.firstCastleMode = false;
            villager.castleCenter = null;
            
            // 清理所有工作狀態
            this.clearVillagerWorkState(villager);
            
            // 清理建造相關狀態
            villager.workPosition = null;
            villager.assignedToPart = null;
            villager.targetBuildPosition = null;
            
            // 設置為閒置狀態
            villager.state = 'idle';
            
            // 確保村民在地面上並且可見
            if (villager.mesh) {
                villager.mesh.position.y = 0;
            }
            villager.setVisibility(true);
        }
    }

    // 消耗木材
    consumeWood(amount) {
        if (this.woodInventory >= amount) {
            this.woodInventory -= amount;
            return true;
        }
        return false;
    }

    // 獲取木材庫存
    getWoodInventory() {
        return this.woodInventory;
    }

    // 獲取村民數量
    getVillagerCount() {
        return this.villagers.size;
    }

    // 檢查村民可見性，防止村民意外消失
    checkVillagerVisibility(isNight) {
        let hiddenCount = 0;
        let fixedCount = 0;
        let visibleCount = 0;
        const positionMap = new Map(); // 檢查位置重疊
        
        for (const villager of this.villagers.values()) {
            if (villager.mesh) {
                // 白天時，除了躲避和移動到避難所的村民，其他都應該可見
                const shouldBeVisible = !isNight && villager.state !== 'hiding' && villager.state !== 'movingToShelter';
                
                if (shouldBeVisible && !villager.mesh.visible) {
                    villager.setVisibility(true);
                    fixedCount++;
                }
                
                if (villager.mesh.visible) {
                    visibleCount++;
                    
                    // 檢查位置重疊
                    const posKey = `${Math.round(villager.mesh.position.x)},${Math.round(villager.mesh.position.z)}`;
                    if (!positionMap.has(posKey)) {
                        positionMap.set(posKey, []);
                    }
                    positionMap.get(posKey).push(villager.id);
                } else {
                    hiddenCount++;
                }
            }
        }
        
        // 檢查位置重疊
        let overlapCount = 0;
        for (const [pos, villagerIds] of positionMap) {
            if (villagerIds.length > 1) {
                overlapCount += villagerIds.length - 1;
                
                // 自動分離重疊的村民
                this.separateOverlappingVillagers(villagerIds);
            }
        }
        
        if (fixedCount > 0) {
            // 修復了一些隱形村民
        }
    }
    
    // 分離重疊的村民
    separateOverlappingVillagers(villagerIds) {
        for (let i = 1; i < villagerIds.length; i++) {
            const villager = this.villagers.get(villagerIds[i]);
            if (villager && villager.mesh) {
                // 在原位置周圍尋找新位置
                const newPos = this.findNearbyPosition(villager.mesh.position.x, villager.mesh.position.z, 3);
                if (newPos) {
                    villager.mesh.position.set(newPos.x, 0, newPos.z);
                    villager.x = newPos.x;
                    villager.z = newPos.z;
                    
                    // 重置村民狀態，讓他們重新尋找任務
                    villager.state = 'idle';
                    villager.target = null;
                    villager.workingFarm = null;
                    villager.constructionBuilding = null;
                    
                    // 清除移動路徑
                    villager.path = []; // 使用空數組而不是 null
                    villager.pathIndex = 0;
                }
            }
        }
        
        // 給分離的村民一些時間穩定，然後重新分配任務
        setTimeout(() => {
            this.reassignAllVillagers();
            
            // 再次顯示狀態，確認任務分配成功
            setTimeout(() => {
                // 任務重新分配完成
            }, 2000);
        }, 1000);
    }
    
    // 在指定位置附近尋找空閒位置
    findNearbyPosition(centerX, centerZ, radius) {
        for (let attempts = 0; attempts < 20; attempts++) {
            const angle = (Math.PI * 2 * attempts) / 20; // 均勻分佈
            const distance = 1 + (attempts % 3); // 1-3的距離
            
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            
            // 檢查新位置是否與其他村民重疊
            let overlaps = false;
            for (const otherVillager of this.villagers.values()) {
                if (otherVillager.mesh) {
                    const dist = Math.sqrt(
                        (otherVillager.mesh.position.x - x) ** 2 + 
                        (otherVillager.mesh.position.z - z) ** 2
                    );
                    if (dist < 1.5) { // 最小距離1.5單位
                        overlaps = true;
                        break;
                    }
                }
            }
            
            if (!overlaps) {
                return { x: Math.round(x), z: Math.round(z) };
            }
        }
        
        return null;
    }

    // 銷毀村民
    destroyVillager(villagerId) {
        const villager = this.villagers.get(villagerId);
        if (villager) {
            villager.destroy();
            this.villagers.delete(villagerId);
        }
    }

    // 調試：打印所有村民的詳細狀態
    debugPrintAllVillagers() {
        console.log('=== 村民狀態調試報告 ===');
        console.log(`總村民數: ${this.villagers.size}`);
        
        let visibleCount = 0;
        let hiddenCount = 0;
        const positionMap = new Map();
        
        for (const villager of this.villagers.values()) {
            const visible = villager.mesh ? villager.mesh.visible : '無mesh';
            const position = villager.mesh ? 
                `(${Math.round(villager.mesh.position.x)}, ${Math.round(villager.mesh.position.z)})` : 
                '無位置';
            
            console.log(`ID: ${villager.id}, 狀態: ${villager.state}, 可見: ${visible}, 位置: ${position}`);
            
            if (villager.mesh && villager.mesh.visible) {
                visibleCount++;
                
                // 檢查重疊
                const posKey = `${Math.round(villager.mesh.position.x)},${Math.round(villager.mesh.position.z)}`;
                if (!positionMap.has(posKey)) {
                    positionMap.set(posKey, []);
                }
                positionMap.get(posKey).push(villager.id);
            } else {
                hiddenCount++;
            }
        }
        
        // 檢查並修復重疊
        for (const [pos, villagerIds] of positionMap) {
            if (villagerIds.length > 1) {
                console.warn(`發現重疊位置 ${pos}: ${villagerIds.join(', ')}`);
                this.separateOverlappingVillagers(villagerIds);
            }
        }
        
        console.log(`可見村民: ${visibleCount}, 隱藏村民: ${hiddenCount}`);
        console.log('=== 報告結束 ===');
    }
    
    // 調試：打印所有建築的詳細狀態
    debugPrintAllBuildings() {
        console.log('=== 建築狀態調試報告 ===');
        
        const allBuildings = [
            ...this.buildingManager.castles.map(b => ({...b, type: 'castle'})), 
            ...this.buildingManager.towers.map(b => ({...b, type: 'tower'})), 
            ...this.buildingManager.houses.map(b => ({...b, type: 'house'})), 
            ...this.buildingManager.farms.map(b => ({...b, type: 'farm'}))
        ];
        
        const underConstruction = allBuildings.filter(b => b.isUnderConstruction);
        const completed = allBuildings.filter(b => b.isComplete);
        
        console.log(`總建築數: ${allBuildings.length} (建設中: ${underConstruction.length}, 已完成: ${completed.length})`);
        
        if (underConstruction.length > 0) {
            console.log('=== 建設中的建築 ===');
            underConstruction.forEach(building => {
                const progress = building.constructionProgress || 0;
                const maxProgress = building.constructionRequired || building.totalBuildSteps || 100;
                const progressPercent = (progress / maxProgress) * 100;
                const workers = building.constructionWorkers?.length || 0;
                const maxWorkers = building.maxWorkers || building.requiredWorkers || 1;
                
                console.log(`${building.type} at (${building.x}, ${building.z}):`);
                console.log(`  進度: ${progress}/${maxProgress} (${progressPercent.toFixed(1)}%)`);
                console.log(`  工人: ${workers}/${maxWorkers}`);
                console.log(`  狀態: isUnderConstruction=${building.isUnderConstruction}, isComplete=${building.isComplete}`);
                
                // 檢查工人狀態
                if (building.constructionWorkers && building.constructionWorkers.length > 0) {
                    console.log(`  工人詳情:`);
                    building.constructionWorkers.forEach(worker => {
                        console.log(`    - ${worker.id}: 狀態=${worker.state}, 建築目標=${worker.constructionBuilding ? worker.constructionBuilding.type : '無'}`);
                    });
                }
                
                // 檢查是否需要修復
                if (building.isUnderConstruction && workers === 0) {
                    console.warn(`  ⚠️ 警告: 建築需要工人但沒有分配！`);
                } else if (!building.isUnderConstruction && !building.isComplete) {
                    console.warn(`  ⚠️ 警告: 建築狀態異常 - 既不在建設中也未完成！`);
                }
            });
        }
        
        console.log('=== 建築報告結束 ===');
        
        // 檢查並修復問題建築
        this.fixBrokenBuildings();
    }
    
    // 修復狀態異常的建築
    fixBrokenBuildings() {
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms
        ];
        
        let fixedCount = 0;
        let removedCount = 0;
        const buildingsToRemove = [];
        
        allBuildings.forEach(building => {
            // 檢查建築位置是否在地圖範圍內 (0-199)
            const isOutOfBounds = building.x < 0 || building.x >= this.grid.size || 
                                 building.y < 0 || building.y >= this.grid.size ||
                                 building.z < 0 || building.z >= this.grid.size;
            
            if (isOutOfBounds) {
                console.warn(`發現超出邊界的建築 ${building.type} at (${building.x}, ${building.y || building.z})`);
                buildingsToRemove.push(building);
                
                // 釋放被困的工人
                if (building.constructionWorkers) {
                    building.constructionWorkers.forEach(worker => {
                        console.log(`釋放被困工人 ${worker.id.slice(-8)} 從超界建築`);
                        worker.constructionBuilding = null;
                        worker.state = 'idle';
                        worker.target = null;
                        worker.path = [];
                        worker.workPosition = null;
                        worker.assignedToPart = null;
                        worker.targetBuildPosition = null;
                    });
                    building.constructionWorkers = [];
                }
                
                removedCount++;
                return;
            }
            
            // 檢查建築位置是否有效
            if (building.z === undefined || building.z === null || isNaN(building.z)) {
                console.warn(`修復建築 ${building.type}: 無效的z坐標 ${building.z}，重新設定為x坐標值`);
                building.z = building.x || 0; // 使用x坐標或預設值0
                fixedCount++;
            }
            
            // 修復狀態異常的建築
            if (!building.isUnderConstruction && !building.isComplete) {
                const progress = building.constructionProgress || 0;
                const maxProgress = building.constructionRequired || building.totalBuildSteps || 100;
                
                if (progress >= maxProgress) {
                    // 進度已滿但未標記為完成
                    console.warn(`修復建築 ${building.type}: 進度已滿但未標記為完成`);
                    building.isComplete = true;
                    building.isUnderConstruction = false;
                    building.onConstructionComplete?.();
                    fixedCount++;
                } else {
                    // 進度未滿，應該標記為建設中
                    console.warn(`修復建築 ${building.type}: 進度未滿但未標記為建設中`);
                    building.isUnderConstruction = true;
                    building.isComplete = false;
                    fixedCount++;
                }
            }
            
            // 修復工人與建築的關聯問題
            if (building.isUnderConstruction && building.constructionWorkers) {
                let invalidWorkers = [];
                building.constructionWorkers.forEach(worker => {
                    if (!worker || !worker.constructionBuilding || worker.constructionBuilding !== building) {
                        invalidWorkers.push(worker);
                    }
                });
                
                // 移除無效工人
                if (invalidWorkers.length > 0) {
                    console.warn(`建築 ${building.type} 有 ${invalidWorkers.length} 個無效工人引用，正在清理...`);
                    building.constructionWorkers = building.constructionWorkers.filter(worker => 
                        worker && worker.constructionBuilding === building
                    );
                    fixedCount++;
                }
                
                // 重新同步村民的建築引用
                building.constructionWorkers.forEach(worker => {
                    if (worker.constructionBuilding !== building) {
                        console.warn(`修復村民 ${worker.id} 的建築引用`);
                        worker.constructionBuilding = building;
                        worker.state = 'constructing';
                        fixedCount++;
                    }
                });
            }
            
            // 檢查工人分配問題
            if (building.isUnderConstruction && (!building.constructionWorkers || building.constructionWorkers.length === 0)) {
                console.warn(`建築 ${building.type} 需要重新分配工人`);
                setTimeout(() => {
                    this.ensureConstructionWorkersAssigned();
                }, 100);
            }
            
            // 檢查停滯的建築（有工人但進度為0且持續一段時間）
            if (building.isUnderConstruction && 
                building.constructionWorkers && 
                building.constructionWorkers.length > 0 && 
                (building.constructionProgress || 0) === 0) {
                
                console.warn(`建築 ${building.type} 有工人但進度停滯，重新啟動建造...`);
                // 重新觸發建造邏輯
                building.constructionWorkers.forEach(worker => {
                    worker.state = 'idle'; // 重置狀態
                    worker.target = null;
                    worker.path = [];
                    setTimeout(() => {
                        worker.state = 'constructing'; // 重新開始建造
                    }, 200);
                });
                fixedCount++;
            }
        });
        
        // 從建築管理器中移除超界建築
        if (buildingsToRemove.length > 0) {
            buildingsToRemove.forEach(building => {
                // 從對應的建築數組中移除
                if (building.type === 'castle') {
                    this.buildingManager.castles = this.buildingManager.castles.filter(b => b !== building);
                } else if (building.type === 'tower') {
                    this.buildingManager.towers = this.buildingManager.towers.filter(b => b !== building);
                } else if (building.type === 'house') {
                    this.buildingManager.houses = this.buildingManager.houses.filter(b => b !== building);
                } else if (building.type === 'farm') {
                    this.buildingManager.farms = this.buildingManager.farms.filter(b => b !== building);
                }
                
                // 從場景中移除3D物件
                if (building.mesh) {
                    this.scene.remove(building.mesh);
                }
                if (building.group) {
                    this.scene.remove(building.group);
                }
                
                console.log(`已移除超界建築 ${building.type} from (${building.x}, ${building.y || building.z})`);
            });
        }
        
        if (removedCount > 0 || fixedCount > 0) {
            console.log(`建築修復完成 - 移除: ${removedCount}, 修復: ${fixedCount}`);
        }
        
        // 修復完成，fixedCount: ${fixedCount}
    }

    // 獲取所有村民
    getAllVillagers() {
        return Array.from(this.villagers.values());
    }

    // 重新分配閒置村民到農田（當有新農田建造時調用）
    reassignVillagersToFarms() {
        // 找到所有沒有攜帶木材且不在農田工作的村民
        const availableVillagers = Array.from(this.villagers.values()).filter(villager => 
            villager.wood === 0 && 
            villager.food === 0 &&
            villager.state !== 'movingToFarm' &&
            villager.state !== 'farming' && 
            villager.state !== 'harvestingFarm' &&
            villager.state !== 'movingToCastle' &&
            !villager.workingFarm
        );
        
        // 找到需要工人的已完成農田
        const availableFarms = this.buildingManager.farms.filter(farm => 
            farm.isComplete && !farm.hasWorker()
        );
        
        // 分配村民到農田
        const maxAssignments = Math.min(availableVillagers.length, availableFarms.length);
        for (let i = 0; i < maxAssignments; i++) {
            const villager = availableVillagers[i];
            const farm = availableFarms[i];
            
            // 如果村民正在砍樹，打斷砍樹去農田
            if (villager.state === 'chopping' || villager.state === 'movingToTree') {
                villager.choppingTree = null;
                villager.choppingProgress = 0;
                villager.path = []; // 清空移動路徑
            }
            
            // 分配到農田
            const worldPos = farm.getWorldPosition();
            villager.target = { x: worldPos.x, z: worldPos.z };
            villager.state = 'movingToFarm';
            villager.workingFarm = farm;
            farm.setWorker(villager);
            
            // 移動到農田
            const gridPos = villager.grid.worldToGrid(worldPos.x, worldPos.z);
            villager.createPath(gridPos.x, gridPos.y);
        }
    }

    // 獲取農田工人數量
    getFarmWorkerCount() {
        let farmWorkers = 0;
        for (const villager of this.villagers.values()) {
            if (villager.workingFarm || 
                villager.state === 'movingToFarm' || 
                villager.state === 'farming' || 
                villager.state === 'harvestingFarm') {
                farmWorkers++;
            }
        }
        return farmWorkers;
    }
    
    // 重新分配所有空閒村民的任務
    reassignAllVillagers() {
        let idleCount = 0;
        for (const villager of this.villagers.values()) {
            if (villager.state === 'idle' && !villager.target) {
                idleCount++;
                
                // 優先分配到農田工作
                const availableFarms = this.buildingManager.farms.filter(farm => 
                    farm.isComplete && !farm.hasWorker()
                );
                
                if (availableFarms.length > 0) {
                    const farm = availableFarms[0];
                    const worldPos = farm.getWorldPosition();
                    villager.target = { x: worldPos.x, z: worldPos.z };
                    villager.state = 'movingToFarm';
                    villager.workingFarm = farm;
                    farm.setWorker(villager);
                    
                    const gridPos = villager.grid.worldToGrid(worldPos.x, worldPos.z);
                    villager.createPath(gridPos.x, gridPos.y);
                } else {
                    // 沒有空閒農田，去砍樹
                    villager.state = 'idle'; // 讓村民在下次更新時自動尋找樹木
                }
            }
        }
    }
    
    // 強制修復停滯的建築
    forceFixStuckBuildings() {
        console.log('=== 強制修復停滯建築 ===');
        
        const allBuildings = [
            ...this.buildingManager.castles, 
            ...this.buildingManager.towers, 
            ...this.buildingManager.houses, 
            ...this.buildingManager.farms
        ];
        
        let fixedCount = 0;
        allBuildings.forEach(building => {
            if (building.isUnderConstruction && 
                building.constructionWorkers && 
                building.constructionWorkers.length > 0) {
                
                console.log(`檢查建築 ${building.type} at (${building.x}, ${building.z})`);
                
                // 清理並重新分配工人
                const workers = [...building.constructionWorkers];
                building.constructionWorkers = [];
                
                workers.forEach(worker => {
                    if (worker && this.villagers.has(worker.id)) {
                        console.log(`重新分配工人 ${worker.id}`);
                        
                        // 清理工人狀態
                        worker.constructionBuilding = null;
                        worker.state = 'idle';
                        worker.target = null;
                        worker.path = [];
                        worker.choppingTree = null;
                        worker.choppingProgress = 0;
                        
                        // 重新分配到建築
                        setTimeout(() => {
                            if (building.addWorker(worker)) {
                                worker.constructionBuilding = building;
                                worker.state = 'constructing';
                                console.log(`成功重新分配工人 ${worker.id} 到建築 ${building.type}`);
                            }
                        }, 100);
                        
                        fixedCount++;
                    }
                });
            }
        });
        
        console.log(`強制修復完成，處理了 ${fixedCount} 個工人重新分配`);
        return fixedCount;
    }

    // 調試工具：為村民創建發光標記
    debugCreateVillagerMarkers() {
        console.log('=== 創建村民位置標記 ===');
        
        // 清除舊的標記
        if (this.debugMarkers) {
            this.debugMarkers.forEach(marker => {
                this.scene.remove(marker);
            });
        }
        this.debugMarkers = [];
        
        let markerCount = 0;
        for (const villager of this.villagers.values()) {
            if (villager.mesh) {
                // 創建超高發光標記 - 高度8個單位，確保能看到
                const geometry = new THREE.BoxGeometry(0.4, 8, 0.4); // 高度8個單位，寬度0.4
                const material = new THREE.MeshBasicMaterial({ 
                    color: villager.mesh.visible ? 0x00ff00 : 0xff0000,
                    transparent: true,
                    opacity: 1.0, // 完全不透明，更明顯
                    emissive: villager.mesh.visible ? 0x004400 : 0x440000 // 更亮的發光效果
                });
                
                const marker = new THREE.Mesh(geometry, material);
                marker.position.set(
                    villager.mesh.position.x,
                    4.0, // 高度4.0，讓標記底部在地面上，頂部高達8個單位
                    villager.mesh.position.z
                );
                
                // 添加文字標籤（簡化的ID）
                marker.userData = {
                    type: 'villager_marker',
                    villagerId: villager.id,
                    shortId: villager.id.slice(-8),
                    visible: villager.mesh.visible,
                    state: villager.state
                };
                
                this.scene.add(marker);
                this.debugMarkers.push(marker);
                markerCount++;
                
                console.log(`標記村民 ${villager.id.slice(-8)}: 位置(${Math.round(villager.mesh.position.x)}, ${Math.round(villager.mesh.position.z)}) 可見:${villager.mesh.visible} 狀態:${villager.state}`);
            }
        }
        
        console.log(`創建了 ${markerCount} 個村民標記`);
        return markerCount;
    }

    // 調試工具：移除村民標記
    debugRemoveVillagerMarkers() {
        if (this.debugMarkers) {
            this.debugMarkers.forEach(marker => {
                this.scene.remove(marker);
            });
            this.debugMarkers = [];
            console.log('已移除所有村民標記');
        }
    }

    // 修復村民材質問題
    debugFixVillagerMaterials() {
        console.log('=== 修復村民材質 ===');
        
        let fixedCount = 0;
        for (const villager of this.villagers.values()) {
            if (villager.mesh && !villager.mesh.material) {
                // 重新創建村民材質
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0x8B4513,
                    transparent: false
                });
                villager.mesh.material = material;
                fixedCount++;
                console.log(`修復村民 ${villager.id.slice(-8)} 的材質`);
            }
        }
        
        console.log(`修復了 ${fixedCount} 個村民的材質問題`);
        return fixedCount;
    }

    // 強制重新創建所有村民
    debugRecreateVillagers() {
        console.log('=== 重新創建問題村民 ===');
        
        const brokenVillagers = [];
        for (const villager of this.villagers.values()) {
            if (!villager.mesh || !villager.mesh.material) {
                brokenVillagers.push({
                    id: villager.id,
                    x: villager.x,
                    z: villager.z,
                    state: villager.state
                });
            }
        }
        
        brokenVillagers.forEach(info => {
            const villager = this.villagers.get(info.id);
            if (villager) {
                // 移除舊的 mesh
                if (villager.mesh) {
                    this.scene.remove(villager.mesh);
                }
                
                // 重新創建 mesh
                const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0x8B4513,
                    transparent: false
                });
                
                villager.mesh = new THREE.Mesh(geometry, material);
                villager.mesh.position.set(villager.x, 0, villager.z);
                villager.mesh.visible = true;
                
                this.scene.add(villager.mesh);
                
                console.log(`重新創建村民 ${info.id.slice(-8)} 在位置 (${info.x}, ${info.z})`);
            }
        });
        
        console.log(`重新創建了 ${brokenVillagers.length} 個村民`);
        return brokenVillagers.length;
    }
    
    // 調試工具：清理超界建築和修復被困村民
    debugCleanupOutOfBoundsBuildings() {
        console.log('=== 清理超界建築和修復被困村民 ===');
        
        const allBuildings = [
            ...this.buildingManager.castles.map(b => ({...b, type: 'castle', array: this.buildingManager.castles})), 
            ...this.buildingManager.towers.map(b => ({...b, type: 'tower', array: this.buildingManager.towers})), 
            ...this.buildingManager.houses.map(b => ({...b, type: 'house', array: this.buildingManager.houses})), 
            ...this.buildingManager.farms.map(b => ({...b, type: 'farm', array: this.buildingManager.farms}))
        ];
        
        let removedCount = 0;
        let rescuedWorkers = 0;
        const buildingsToRemove = [];
        
        allBuildings.forEach(building => {
            // 檢查建築位置是否在地圖範圍內 (0-199)
            const isOutOfBounds = building.x < 0 || building.x >= this.grid.size || 
                                 (building.y !== undefined && (building.y < 0 || building.y >= this.grid.size)) ||
                                 (building.z !== undefined && (building.z < 0 || building.z >= this.grid.size));
            
            if (isOutOfBounds) {
                console.log(`發現超界建築: ${building.type} at (${building.x}, ${building.y || building.z})`);
                buildingsToRemove.push(building);
                
                // 釋放被困的工人
                if (building.constructionWorkers && building.constructionWorkers.length > 0) {
                    building.constructionWorkers.forEach(worker => {
                        if (worker && this.villagers.has(worker.id)) {
                            console.log(`  - 釋放被困工人 ${worker.id.slice(-8)}`);
                            worker.constructionBuilding = null;
                            worker.state = 'idle';
                            worker.target = null;
                            worker.path = [];
                            worker.workPosition = null;
                            worker.assignedToPart = null;
                            worker.targetBuildPosition = null;
                            rescuedWorkers++;
                        }
                    });
                }
                
                // 從建築數組中移除
                building.array.splice(building.array.indexOf(building), 1);
                
                // 從場景中移除3D物件
                if (building.mesh) {
                    this.scene.remove(building.mesh);
                }
                if (building.group) {
                    this.scene.remove(building.group);
                }
                
                removedCount++;
            }
        });
        
        console.log(`清理完成 - 移除建築: ${removedCount}, 拯救工人: ${rescuedWorkers}`);
        
        // 重新分配被拯救的村民
        if (rescuedWorkers > 0) {
            setTimeout(() => {
                console.log('重新分配被拯救的村民...');
                this.ensureConstructionWorkersAssigned();
                this.reassignVillagersToFarms();
            }, 500);
        }
        
        return { removedBuildings: removedCount, rescuedWorkers };
    }
    
    // 調試工具：修復卡住的砍樹村民
    debugFixStuckTreeVillagers() {
        console.log('=== 修復卡住的砍樹村民 ===');
        
        let fixedCount = 0;
        for (const villager of this.villagers.values()) {
            if (villager.state === 'movingToTree') {
                console.log(`發現卡在砍樹的村民 ${villager.id.slice(-8)} at (${Math.round(villager.x)}, ${Math.round(villager.z)})`);
                
                // 檢查是否有砍樹目標
                if (villager.target) {
                    // 修復座標檢查，確保使用正確的z座標
                    const targetZ = villager.target.z !== undefined ? villager.target.z : villager.target.y;
                    const distance = Math.sqrt(
                        Math.pow(villager.x - villager.target.x, 2) +
                        Math.pow(villager.z - targetZ, 2)
                    );
                    
                    console.log(`  - 距離目標: ${distance.toFixed(2)}`);
                    
                    if (distance < 2.0) {
                        // 強制轉換為砍樹狀態，使用正確的樹木座標
                        villager.choppingTree = {
                            x: villager.target.treeX || villager.target.x,
                            y: villager.target.treeY || villager.target.y || targetZ
                        };
                        villager.state = 'chopping';
                        villager.choppingProgress = 0;
                        console.log(`  - 強制轉換為砍樹狀態`);
                        fixedCount++;
                    } else {
                        // 距離太遠，重新計算路徑
                        const treeX = villager.target.treeX || villager.target.x;
                        const treeY = villager.target.treeY || villager.target.y || targetZ;
                        const choppingPos = villager.calculateChoppingPosition(treeX, treeY);
                        villager.createPath(choppingPos.x, choppingPos.y);
                        console.log(`  - 重新計算路徑到 (${choppingPos.x}, ${choppingPos.y})`);
                        fixedCount++;
                    }
                } else {
                    // 沒有砍樹目標，重置為閒置狀態
                    villager.state = 'idle';
                    villager.target = null;
                    villager.path = [];
                    console.log(`  - 重置為閒置狀態`);
                    fixedCount++;
                }
            } else if (villager.state === 'chopping' && villager.choppingProgress >= 10) {
                // 砍樹完成但狀態沒有更新
                console.log(`發現砍樹完成但狀態未更新的村民 ${villager.id.slice(-8)}`);
                villager.wood = 1;
                villager.choppingTree = null;
                villager.choppingProgress = 0;
                villager.target = null;
                villager.path = [];
                villager.state = 'idle';
                console.log(`  - 強制完成砍樹並設為閒置狀態`);
                fixedCount++;
            }
        }
        
        console.log(`修復了 ${fixedCount} 個卡住的砍樹村民`);
        return fixedCount;
    }
}
