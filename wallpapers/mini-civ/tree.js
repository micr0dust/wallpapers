// 樹木類別
class Tree {
    constructor(x, y, grid, scene) {
        this.x = x;
        this.y = y;
        this.grid = grid;
        this.scene = scene;
        this.choppedCount = 0;
        this.maxChops = 10; // 改為10次砍伐
        this.isDestroyed = false;
        this.respawnTime = 10000; // 10秒重生
        this.destroyedAt = null;
        
        this.id = this.generateId();
        this.create();
    }

    generateId() {
        return `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    create() {
        if (this.isDestroyed) return;
        
        const group = new THREE.Group();
        const worldPos = this.grid.gridToWorld(this.x, this.y);

        // 樹幹
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunkMesh.position.set(worldPos.x, 1.5, worldPos.z);
        group.add(trunkMesh);

        // 樹冠
        const crownGeometry = new THREE.SphereGeometry(2, 12, 8);
        const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const crownMesh = new THREE.Mesh(crownGeometry, crownMaterial);
        crownMesh.position.set(worldPos.x, 4, worldPos.z);
        group.add(crownMesh);

        this.mesh = group;
        this.scene.add(group);
    }

    // 被砍伐
    chop() {
        if (this.isDestroyed) return false;
        
        this.choppedCount++;
        
        if (this.choppedCount >= this.maxChops) {
            this.destroy();
            return true; // 樹木被完全砍伐
        }
        
        return false;
    }

    // 銷毀樹木
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        
        this.isDestroyed = true;
        this.destroyedAt = Date.now();
        this.grid.removeTree(this.x, this.y);
    }

    // 檢查是否可以重生
    canRespawn() {
        return this.isDestroyed && 
               this.destroyedAt && 
               (Date.now() - this.destroyedAt) >= this.respawnTime;
    }

    // 重生樹木
    respawn() {
        if (!this.canRespawn()) return false;
        
        // 檢查位置是否仍然可用
        if (this.grid.canPlaceTree(this.x, this.y)) {
            this.isDestroyed = false;
            this.choppedCount = 0;
            this.destroyedAt = null;
            this.grid.addTree(this.x, this.y);
            this.create();
            return true;
        }
        
        return false;
    }

    // 獲取樹木狀態
    getStatus() {
        return {
            id: this.id,
            position: { x: this.x, y: this.y },
            choppedCount: this.choppedCount,
            maxChops: this.maxChops,
            isDestroyed: this.isDestroyed,
            canRespawn: this.canRespawn()
        };
    }
}

// 樹木管理器
class TreeManager {
    constructor(grid, scene) {
        this.grid = grid;
        this.scene = scene;
        
        // 計算樹木數量：M = (N/10) * (N/10)
        const N = grid.size;
        this.totalTrees = Math.floor(N / 5) * Math.floor(N / 5);
        
        // 計算聚集點數量：M/(N/10)
        this.clusterPoints = Math.floor(this.totalTrees / (N / 5));
        
        this.trees = new Map();
        this.destroyedTrees = new Map();
        
        this.generateClusteredTrees();
    }

    // 生成聚集式樹木分佈
    generateClusteredTrees() {
        let generatedTrees = 0;
        const treesPerCluster = Math.floor(this.totalTrees / this.clusterPoints);
        
        // 樹木分佈計劃
        
        // 生成聚集點
        for (let cluster = 0; cluster < this.clusterPoints; cluster++) {
            // 隨機選擇聚集中心點，但避開地圖中心區域（為城堡預留空間）
            let centerX, centerY, distanceFromCenter;
            let attempts = 0;
            
            do {
                centerX = Math.floor(Math.random() * this.grid.size);
                centerY = Math.floor(Math.random() * this.grid.size);
                
                // 避開地圖中心50x50的區域
                distanceFromCenter = Math.sqrt((centerX - this.grid.size/2) ** 2 + (centerY - this.grid.size/2) ** 2);
                
                attempts++;
            } while (distanceFromCenter < 30 && attempts < 20); // 避開中心30格半徑的區域
            
            // 設定聚集點中心位置
            
            // 在每個聚集點周圍生成樹木
            let clusterTrees = 0;
            let clusterAttempts = 0;
            const maxAttempts = treesPerCluster * 5; // 防止無限循環
            
            while (clusterTrees < treesPerCluster && clusterAttempts < maxAttempts && generatedTrees < this.totalTrees) {
                clusterAttempts++;
                
                // 使用高斯分佈在聚集中心周圍生成樹木
                const radius = Math.abs(this.gaussianRandom()) * 12 + 3; // 聚集半徑 3-25
                const angle = Math.random() * Math.PI * 2;
                
                const x = Math.floor(centerX + Math.cos(angle) * radius);
                const y = Math.floor(centerY + Math.sin(angle) * radius);
                
                // 檢查位置是否有效並且可以放置樹木
                if (this.grid.isValidPosition(x, y) && this.grid.canPlaceTree(x, y)) {
                    const tree = new Tree(x, y, this.grid, this.scene);
                    this.trees.set(tree.id, tree);
                    this.grid.addTree(x, y);
                    clusterTrees++;
                    generatedTrees++;
                }
            }
            
            // 聚集點樹木生成完成
        }
        
        // 樹木生成完成
        
        // 如果生成的樹木數量不足，補充一些隨機分佈的樹木
        if (generatedTrees < this.totalTrees * 0.8) {
            const remainingTrees = Math.floor(this.totalTrees * 0.8) - generatedTrees;
            // 補充隨機分佈樹木
            
            let randomTrees = 0;
            let randomAttempts = 0;
            const maxRandomAttempts = remainingTrees * 10;
            
            while (randomTrees < remainingTrees && randomAttempts < maxRandomAttempts) {
                const x = Math.floor(Math.random() * this.grid.size);
                const y = Math.floor(Math.random() * this.grid.size);
                
                // 避開中心區域
                const distanceFromCenter = Math.sqrt((x - this.grid.size/2) ** 2 + (y - this.grid.size/2) ** 2);
                
                if (distanceFromCenter >= 25 && 
                    this.grid.isValidPosition(x, y) && 
                    this.grid.canPlaceTree(x, y)) {
                    
                    const tree = new Tree(x, y, this.grid, this.scene);
                    this.trees.set(tree.id, tree);
                    this.grid.addTree(x, y);
                    randomTrees++;
                    generatedTrees++;
                }
                randomAttempts++;
            }
            
            // 隨機樹木補充完成
        }
    }
    
    // 高斯隨機數生成器（Box-Muller變換）
    gaussianRandom() {
        if (this.spare !== undefined) {
            const temp = this.spare;
            delete this.spare;
            return temp;
        }
        
        const u = Math.random();
        const v = Math.random();
        const mag = Math.sqrt(-2 * Math.log(u));
        
        this.spare = mag * Math.cos(2 * Math.PI * v);
        return mag * Math.sin(2 * Math.PI * v);
    }
    
    // 清除指定區域的樹木
    clearTreesInArea(centerX, centerY, radius) {
        const treesToRemove = [];
        
        for (const [treeId, tree] of this.trees) {
            const distance = Math.sqrt((tree.x - centerX) ** 2 + (tree.y - centerY) ** 2);
            if (distance <= radius) {
                treesToRemove.push(treeId);
            }
        }
        
        for (const treeId of treesToRemove) {
            const tree = this.trees.get(treeId);
            if (tree) {
                tree.destroy();
                this.trees.delete(treeId);
            }
        }
    }

    // 砍伐樹木
    chopTree(x, y) {
        const treeKey = `${x},${y}`;
        
        // 找到對應位置的樹木
        for (const [treeId, tree] of this.trees) {
            if (tree.x === x && tree.y === y && !tree.isDestroyed) {
                const isDestroyed = tree.chop();
                
                if (isDestroyed) {
                    // 樹木被完全砍伐，移到待重生列表
                    this.destroyedTrees.set(treeId, tree);
                    this.trees.delete(treeId);
                }
                
                return isDestroyed;
            }
        }
        
        return false;
    }

    // 更新樹木（處理重生）
    update() {
        const toRespawn = [];
        
        // 檢查待重生的樹木
        for (const [treeId, tree] of this.destroyedTrees) {
            if (tree.canRespawn()) {
                if (tree.respawn()) {
                    toRespawn.push(treeId);
                } else {
                    // 如果原位置無法重生，嘗試在附近找新位置
                    const newPosition = this.findNearbySpawnPosition(tree.x, tree.y, 20);
                    if (newPosition) {
                        tree.x = newPosition.x;
                        tree.y = newPosition.y;
                        if (tree.respawn()) {
                            toRespawn.push(treeId);
                        }
                    }
                }
            }
        }
        
        // 將重生的樹木移回活動列表
        for (const treeId of toRespawn) {
            const tree = this.destroyedTrees.get(treeId);
            this.trees.set(treeId, tree);
            this.destroyedTrees.delete(treeId);
        }
    }

    // 在指定位置附近尋找可以生成樹木的位置
    findNearbySpawnPosition(centerX, centerY, radius) {
        for (let attempts = 0; attempts < 50; attempts++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            
            const x = Math.floor(centerX + Math.cos(angle) * distance);
            const y = Math.floor(centerY + Math.sin(angle) * distance);
            
            if (this.grid.canPlaceTree(x, y)) {
                return { x, y };
            }
        }
        
        return null;
    }

    // 獲取活動樹木數量
    getActiveTreeCount() {
        return this.trees.size;
    }

    // 獲取待重生樹木數量
    getDestroyedTreeCount() {
        return this.destroyedTrees.size;
    }

    // 獲取總樹木數量
    getTotalTreeCount() {
        return this.trees.size + this.destroyedTrees.size;
    }

    // 獲取所有樹木狀態
    getAllTreeStatus() {
        const active = Array.from(this.trees.values()).map(tree => tree.getStatus());
        const destroyed = Array.from(this.destroyedTrees.values()).map(tree => tree.getStatus());
        
        return {
            active,
            destroyed,
            total: active.length + destroyed.length
        };
    }

    // 在指定範圍內隨機生成新樹木
    generateTreesInArea(centerX, centerY, radius, count) {
        let generated = 0;
        
        for (let attempts = 0; attempts < count * 5 && generated < count; attempts++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            
            const x = Math.floor(centerX + Math.cos(angle) * distance);
            const y = Math.floor(centerY + Math.sin(angle) * distance);
            
            if (this.grid.canPlaceTree(x, y)) {
                const tree = new Tree(x, y, this.grid, this.scene);
                this.trees.set(tree.id, tree);
                this.grid.addTree(x, y);
                generated++;
            }
        }
        
        return generated;
    }

    // 銷毀所有樹木
    destroyAll() {
        for (const tree of this.trees.values()) {
            tree.destroy();
        }
        for (const tree of this.destroyedTrees.values()) {
            tree.destroy();
        }
        
        this.trees.clear();
        this.destroyedTrees.clear();
    }

    // 在指定位置添加樹木
    addTreeAt(x, y) {
        if (!this.grid.isValidPosition(x, y) || !this.grid.canPlaceTree(x, y)) {
            return false;
        }
        
        const tree = new Tree(x, y, this.grid, this.scene);
        this.trees.set(tree.id, tree);
        this.grid.addTree(x, y);
        return true;
    }

    // 檢查指定位置是否有樹木
    hasTreeAt(x, y) {
        // 檢查活動樹木
        for (const tree of this.trees.values()) {
            if (tree.x === x && tree.y === y && !tree.isDestroyed) {
                return true;
            }
        }
        
        // 檢查待重生樹木（雖然被砍伐，但位置仍被佔用）
        for (const tree of this.destroyedTrees.values()) {
            if (tree.x === x && tree.y === y) {
                return true;
            }
        }
        
        return false;
    }
    
    // 設定目標樹木數量（Wallpaper Engine 設定）
    setTargetTreeCount(targetCount) {
        const currentTreeCount = this.getActiveTreeCount() + this.getDestroyedTreeCount();
        
        if (targetCount > currentTreeCount) {
            // 需要增加樹木
            const treesToAdd = targetCount - currentTreeCount;
            this.addRandomTrees(treesToAdd);
            console.log(`增加了 ${treesToAdd} 棵樹木，目前總數: ${this.getActiveTreeCount() + this.getDestroyedTreeCount()}`);
        } else if (targetCount < currentTreeCount) {
            // 需要移除樹木
            const treesToRemove = currentTreeCount - targetCount;
            this.removeRandomTrees(treesToRemove);
            console.log(`移除了 ${treesToRemove} 棵樹木，目前總數: ${this.getActiveTreeCount() + this.getDestroyedTreeCount()}`);
        }
    }
    
    // 隨機添加樹木
    addRandomTrees(count) {
        let added = 0;
        const maxAttempts = count * 10; // 避免無限循環
        
        for (let attempt = 0; attempt < maxAttempts && added < count; attempt++) {
            const x = Math.floor(Math.random() * this.grid.size);
            const y = Math.floor(Math.random() * this.grid.size);
            
            // 避開中心區域
            const centerX = this.grid.size / 2;
            const centerY = this.grid.size / 2;
            const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distanceFromCenter > 30 && this.addTreeAt(x, y)) {
                added++;
            }
        }
        
        return added;
    }
    
    // 隨機移除樹木
    removeRandomTrees(count) {
        const allTrees = [...this.trees.values(), ...this.destroyedTrees.values()];
        const treesToRemove = allTrees.slice(0, Math.min(count, allTrees.length));
        
        let removed = 0;
        for (const tree of treesToRemove) {
            if (this.trees.has(tree.id)) {
                this.trees.delete(tree.id);
                tree.destroy();
                this.grid.removeTree(tree.x, tree.y);
                removed++;
            } else if (this.destroyedTrees.has(tree.id)) {
                this.destroyedTrees.delete(tree.id);
                tree.destroy();
                removed++;
            }
        }
        
        return removed;
    }
}
