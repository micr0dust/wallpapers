// 網格系統類別 - 管理500x500的座標系統
class Grid {
    constructor(size = 500) {
        this.size = size;
        // 使用二維陣列來追蹤每個位置的佔用狀態
        this.occupancy = Array(size).fill().map(() => Array(size).fill(false));
        // 儲存建築物的參考
        this.buildings = new Map();
        // 儲存樹木的位置
        this.trees = new Set();
    }

    // 檢查座標是否有效
    isValidPosition(x, y) {
        return x >= 0 && x < this.size && y >= 0 && y < this.size;
    }

    // 檢查指定位置是否被佔用
    isOccupied(x, y) {
        if (!this.isValidPosition(x, y)) {
            return true; // 超出邊界視為被佔用
        }
        return this.occupancy[x][y];
    }

    // 檢查指定區域是否可以建造
    canBuild(x, y, width, height) {
        if (!this.isValidPosition(x, y) || !this.isValidPosition(x + width - 1, y + height - 1)) {
            return false;
        }

        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                if (this.occupancy[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    // 檢查建築建造條件：附近5格要有自己的建築
    checkBuildingCondition(x, y, width, height, excludeFirstBuilding = false) {
        if (excludeFirstBuilding && this.buildings.size === 0) {
            return true; // 第一個建築可以隨意建造
        }

        const range = 5;
        for (let i = Math.max(0, x - range); i <= Math.min(this.size - 1, x + width + range - 1); i++) {
            for (let j = Math.max(0, y - range); j <= Math.min(this.size - 1, y + height + range - 1); j++) {
                if (this.buildings.has(`${i},${j}`)) {
                    return true;
                }
            }
        }
        return false;
    }

    // 檢查建築間距：確保非農田建築與其他建築保持3格距離
    checkBuildingSpacing(x, y, width, height, isFarm = false) {
        if (isFarm) {
            return true; // 農田不需要檢查間距
        }

        const minDistance = 3;
        
        // 遍歷新建築的所有位置
        for (let newX = x; newX < x + width; newX++) {
            for (let newY = y; newY < y + height; newY++) {
                
                // 檢查這個位置周圍minDistance範圍內是否有其他建築
                for (let checkX = newX - minDistance; checkX <= newX + minDistance; checkX++) {
                    for (let checkY = newY - minDistance; checkY <= newY + minDistance; checkY++) {
                        
                        // 跳過新建築自己的位置
                        if (checkX >= x && checkX < x + width && checkY >= y && checkY < y + height) {
                            continue;
                        }
                        
                        // 檢查這個位置是否有建築
                        if (this.isValidPosition(checkX, checkY) && this.buildings.has(`${checkX},${checkY}`)) {
                            return false; // 距離太近
                        }
                    }
                }
            }
        }
        
        return true;
    }

    // 佔用指定區域
    occupyArea(x, y, width, height, buildingId) {
        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                this.occupancy[i][j] = true;
                this.buildings.set(`${i},${j}`, buildingId);
            }
        }
    }

    // 釋放指定區域
    freeArea(x, y, width, height) {
        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                this.occupancy[i][j] = false;
                this.buildings.delete(`${i},${j}`);
            }
        }
    }

    // 添加樹木
    addTree(x, y) {
        if (this.isValidPosition(x, y) && !this.occupancy[x][y]) {
            this.trees.add(`${x},${y}`);
            this.occupancy[x][y] = true;
            return true;
        }
        return false;
    }

    // 移除樹木
    removeTree(x, y) {
        const key = `${x},${y}`;
        if (this.trees.has(key)) {
            this.trees.delete(key);
            this.occupancy[x][y] = false;
            return true;
        }
        return false;
    }

    // 檢查樹木生成位置：5格內不得有任何建築（讓樹木更密集）
    canPlaceTree(x, y) {
        if (!this.isValidPosition(x, y) || this.occupancy[x][y]) {
            return false;
        }

        const range = 5; // 原本是10，改為5讓樹木更密集
        for (let i = Math.max(0, x - range); i <= Math.min(this.size - 1, x + range); i++) {
            for (let j = Math.max(0, y - range); j <= Math.min(this.size - 1, y + range); j++) {
                if (this.buildings.has(`${i},${j}`)) {
                    return false;
                }
            }
        }
        return true;
    }

    // 找到最近的樹木
    findNearestTree(x, y, maxDistance = 50) {
        let nearest = null;
        let minDistance = maxDistance;

        for (const treePos of this.trees) {
            const [treeX, treeY] = treePos.split(',').map(Number);
            const distance = Math.sqrt((x - treeX) ** 2 + (y - treeY) ** 2);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { x: treeX, y: treeY, distance };
            }
        }

        return nearest;
    }

    // 找到最近的城堡
    findNearestCastle(x, y, buildingManager = null) {
        let nearest = null;
        let minDistance = Infinity;

        for (const [pos, buildingId] of this.buildings) {
            if (buildingId.startsWith('castle')) {
                const [buildingX, buildingY] = pos.split(',').map(Number);
                const distance = Math.sqrt((x - buildingX) ** 2 + (y - buildingY) ** 2);
                
                // 如果有buildingManager，檢查城堡是否完成
                if (buildingManager) {
                    const castle = buildingManager.buildings.get(buildingId);
                    if (castle && !castle.isComplete) {
                        continue; // 跳過未完成的城堡
                    }
                }
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { x: buildingX, y: buildingY, distance };
                }
            }
        }

        return nearest;
    }

    // 獲取指定位置的建築ID
    getBuildingAt(x, y) {
        return this.buildings.get(`${x},${y}`);
    }

    // 將世界座標轉換為網格座標
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.floor((worldX + this.size * 0.5)),
            y: Math.floor((worldZ + this.size * 0.5))
        };
    }

    // 將網格座標轉換為世界座標
    gridToWorld(gridX, gridY) {
        return {
            x: gridX - this.size * 0.5,
            z: gridY - this.size * 0.5
        };
    }
}
