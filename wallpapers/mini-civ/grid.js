// 網格系統 —— 200x200 座標、佔用狀態、建築登記、A* 尋路
class Grid {
    constructor(size = 200) {
        this.size = size;
        this.occupancy = Array(size).fill().map(() => Array(size).fill(false));
        this.buildings = new Map();      // "x,y" -> buildingId（逐格）
        this.reserved = new Set();       // 城門通道等保留格（不可蓋房／種樹）
        this.footprints = new Map();     // buildingId -> { id, type, x, y, w, h, solid }
        this.trees = new Set();          // "x,y"

        // A* 重用緩衝區
        this._n = size * size;
        this._g = new Float32Array(this._n);
        this._parent = new Int32Array(this._n);
        this._stamp = new Int32Array(this._n);
        this._closed = new Int32Array(this._n);
        this._curStamp = 0;
    }

    // 地形：深水／峭壁不可通行；坡度大或水邊不可蓋；只能在起始城堡所在的連通區蓋房
    setTerrain(terrain, startX, startY) {
        const S = this.size, m = terrain.cellMasks(S);
        this.terrain = terrain;
        this.terr = m;
        this.region = terrain.regions(m.blocked, S);
        this.mainRegion = this.region[startY * S + startX] || 1;
    }
    _terrOK(x, y) {
        if (!this.terr) return true;
        const k = y * this.size + x;
        return !this.terr.noBuild[k] && this.region[k] === this.mainRegion;
    }
    // 磨坊等河岸建築可建在較低的河岸上（水面以上、坡度不陡）
    _terrOKBank(x, y) {
        if (!this.terr) return true;
        const k = y * this.size + x;
        if (this.terr.blocked[k] || this.region[k] !== this.mainRegion) return false;
        const wx = x + 0.5 - this.size / 2, wz = y + 0.5 - this.size / 2;
        return this.terrain.height(wx, wz) > this.terrain.wl + 0.04 && this.terrain.slope(wx, wz) < 0.45;
    }
    regionAt(x, y) { return this.terr && this.isValidPosition(x, y) ? this.region[y * this.size + x] : 1; }
    // 地基落差過大不能蓋
    _footprintFlat(x, y, w, h) {
        if (!this.terrain) return true;
        const S = this.size;
        return this.terrain.heightRange(x - S / 2, y - S / 2, w, h) <= (Math.max(w, h) >= 6 ? 1.35 : 1.0);
    }

    isValidPosition(x, y) { return x >= 0 && x < this.size && y >= 0 && y < this.size; }

    isOccupied(x, y) {
        if (!this.isValidPosition(x, y)) return true;
        return this.occupancy[x][y];
    }

    canBuild(x, y, width, height) {
        if (!this.isValidPosition(x, y) || !this.isValidPosition(x + width - 1, y + height - 1)) return false;
        for (let i = x; i < x + width; i++)
            for (let j = y; j < y + height; j++)
                if (this.occupancy[i][j] || !this._terrOK(i, j)) return false;
        return this._footprintFlat(x, y, width, height);
    }

    // 與 canBuild 相同，但樹木不算障礙（建造時會清除）
    canBuildIgnoreTrees(x, y, width, height, bank) {
        if (!this.isValidPosition(x, y) || !this.isValidPosition(x + width - 1, y + height - 1)) return false;
        for (let i = x; i < x + width; i++)
            for (let j = y; j < y + height; j++)
                { if (this.occupancy[i][j] && !this.trees.has(`${i},${j}`)) return false; if (this.reserved.size && this.reserved.has(`${i},${j}`)) return false; if (!(bank ? this._terrOKBank(i, j) : this._terrOK(i, j))) return false; }
        return this._footprintFlat(x, y, width, height);
    }

    // 附近 5 格內要有建築（第一棟除外）
    checkBuildingCondition(x, y, width, height, excludeFirstBuilding = false) {
        if (excludeFirstBuilding && this.buildings.size === 0) return true;
        const range = 5;
        for (const fp of this.footprints.values()) {
            if (fp.x - range <= x + width - 1 && fp.x + fp.w - 1 + range >= x &&
                fp.y - range <= y + height - 1 && fp.y + fp.h - 1 + range >= y) return true;
        }
        return false;
    }

    // 非農田建築與其他建築保持 3 格距離
    checkBuildingSpacing(x, y, width, height, isFarm = false) {
        if (isFarm) return true;
        const m = 3;
        for (const fp of this.footprints.values()) {
            if (fp.x - m < x + width && fp.x + fp.w + m > x &&
                fp.y - m < y + height && fp.y + fp.h + m > y) {
                if (!fp.cells) return false;
                for (const c of fp.cells) if (c.x - m < x + width && c.x + 1 + m > x && c.y - m < y + height && c.y + 1 + m > y) return false;
            }
        }
        return true;
    }

    // 附近 margin 格內是否有「非農田」建築（城堡預留內城牆空間用）
    hasBuildingNear(x, y, width, height, margin) {
        for (const fp of this.footprints.values()) {
            if (fp.type === 'farm') continue;
            if (fp.x - margin < x + width && fp.x + fp.w + margin > x && fp.y - margin < y + height && fp.y + fp.h + margin > y) return true;
        }
        return false;
    }

    // 任意形狀（格子清單）的佔用：用於斜向城牆
    canOccupyCells(cells) {
        for (const c of cells) {
            if (!this.isValidPosition(c.x, c.y)) return false;
            if (this.occupancy[c.x][c.y] && !this.trees.has(`${c.x},${c.y}`)) return false;
            if (this.reserved.size && this.reserved.has(`${c.x},${c.y}`)) return false;
        }
        return true;
    }
    occupyCells(cells, buildingId) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const c of cells) {
            this.occupancy[c.x][c.y] = true;
            this.buildings.set(`${c.x},${c.y}`, buildingId);
            x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y);
        }
        const type = String(buildingId).split('_')[0];
        this.footprints.set(buildingId, { id: buildingId, type, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, solid: true, cells });
    }
    freeById(id) {
        const fp = this.footprints.get(id);
        if (!fp) return;
        if (fp.cells) for (const c of fp.cells) { this.occupancy[c.x][c.y] = false; this.buildings.delete(`${c.x},${c.y}`); }
        else this.freeArea(fp.x, fp.y, fp.w, fp.h);
        this.footprints.delete(id);
    }

    occupyArea(x, y, width, height, buildingId) {
        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                this.occupancy[i][j] = true;
                this.buildings.set(`${i},${j}`, buildingId);
            }
        }
        const type = String(buildingId).split('_')[0];
        this.footprints.set(buildingId, { id: buildingId, type, x, y, w: width, h: height, solid: type !== 'farm' });
    }

    freeArea(x, y, width, height) {
        const id = this.buildings.get(`${x},${y}`);
        if (id) this.footprints.delete(id);
        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                this.occupancy[i][j] = false;
                this.buildings.delete(`${i},${j}`);
            }
        }
    }

    addTree(x, y) {
        if (this.isValidPosition(x, y) && !this.occupancy[x][y]) {
            this.trees.add(`${x},${y}`);
            this.occupancy[x][y] = true;
            return true;
        }
        return false;
    }

    removeTree(x, y) {
        const key = `${x},${y}`;
        if (this.trees.has(key)) {
            this.trees.delete(key);
            this.occupancy[x][y] = false;
            return true;
        }
        return false;
    }

    // 樹木生成：5 格內不得有建築
    canPlaceTree(x, y) {
        if (!this.isValidPosition(x, y) || this.occupancy[x][y]) return false;
        if (this.reserved.has(`${x},${y}`)) return false;
        if (this.terr && this.terr.noTree[y * this.size + x]) return false;
        for (const fp of this.footprints.values()) {
            const range = fp.type.indexOf('wall') === 0 ? 1 : 5;
            if (fp.x - range <= x && fp.x + fp.w - 1 + range >= x &&
                fp.y - range <= y && fp.y + fp.h - 1 + range >= y) {
                if (!fp.cells) return false;
                for (const c of fp.cells) if (Math.abs(c.x - x) <= range && Math.abs(c.y - y) <= range) return false;
            }
        }
        return true;
    }

    // 由近到遠（方形環狀）尋找最近的樹木
    findNearestTree(x, y, maxDistance = 50) {
        if (this.trees.size === 0) return null;
        let best = null, bestD2 = Infinity;
        const myRegion = this.regionAt(x, y);
        const maxR = Math.min(Math.ceil(maxDistance), this.size);
        for (let r = 0; r <= maxR; r++) {
            if (best && r > Math.sqrt(bestD2) + 1) break;
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const tx = x + dx, ty = y + dy;
                    if (this.trees.has(`${tx},${ty}`) && this.regionAt(tx, ty) === myRegion) {
                        const d2 = dx * dx + dy * dy;
                        if (d2 < bestD2) { bestD2 = d2; best = { x: tx, y: ty }; }
                    }
                }
            }
        }
        if (best && bestD2 <= maxDistance * maxDistance) { best.distance = Math.sqrt(bestD2); return best; }
        return null;
    }

    // 最近的（已完成）城堡：回傳足跡上離查詢點最近的格子
    findNearestCastle(x, y, buildingManager = null) {
        let nearest = null, minDistance = Infinity;
        for (const fp of this.footprints.values()) {
            if (fp.type !== 'castle') continue;
            if (buildingManager) {
                const castle = buildingManager.buildings.get(fp.id);
                if (castle && !castle.isComplete) continue;
            }
            const cx = Math.max(fp.x, Math.min(fp.x + fp.w - 1, x));
            const cy = Math.max(fp.y, Math.min(fp.y + fp.h - 1, y));
            const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            if (d < minDistance) { minDistance = d; nearest = { x: cx, y: cy, distance: d }; }
        }
        return nearest;
    }

    getBuildingAt(x, y) { return this.buildings.get(`${x},${y}`); }

    getFootprintAt(x, y) {
        const id = this.buildings.get(`${x},${y}`);
        return id ? this.footprints.get(id) : null;
    }

    worldToGrid(worldX, worldZ) {
        return { x: Math.floor(worldX + this.size * 0.5), y: Math.floor(worldZ + this.size * 0.5) };
    }

    gridToWorld(gridX, gridY) {
        return { x: gridX - this.size * 0.5, z: gridY - this.size * 0.5 };
    }

    // ---------- 尋路 ----------
    // 格子是否會擋路（城堡/塔樓/房舍的牆；農田可以穿越）
    _blocked(x, y, allowA, allowB) {
        if (this.terr && this.terr.blocked[y * this.size + x]) return true;
        const id = this.buildings.get(`${x},${y}`);
        if (!id || id === allowA || id === allowB) return false;
        const fp = this.footprints.get(id);
        return !!(fp && fp.solid);
    }

    // 直線是否暢通（不穿過建築）
    _lineClear(sx, sy, tx, ty, allowA, allowB) {
        const steps = Math.max(Math.abs(tx - sx), Math.abs(ty - sy));
        for (let i = 1; i <= steps; i++) {
            const gx = Math.round(sx + (tx - sx) * i / steps);
            const gy = Math.round(sy + (ty - sy) * i / steps);
            if (this._blocked(gx, gy, allowA, allowB)) return false;
        }
        return true;
    }

    // 回傳 null 表示「直線即可」；回傳陣列表示繞路後的格子序列（不含起點）；回傳 undefined 表示找不到
    findPath(sx, sy, tx, ty) {
        const allowA = this.buildings.get(`${sx},${sy}`);
        const allowB = this.buildings.get(`${tx},${ty}`);
        if (this._lineClear(sx, sy, tx, ty, allowA, allowB)) return null;

        const size = this.size;
        const stamp = ++this._curStamp;
        const G = this._g, P = this._parent, S = this._stamp, C = this._closed;
        const startI = sy * size + sx, goalI = ty * size + tx;
        const heap = [];   // [f, idx]
        const push = (f, i) => {
            heap.push([f, i]);
            let c = heap.length - 1;
            while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p; }
        };
        const pop = () => {
            const top = heap[0], last = heap.pop();
            if (heap.length) {
                heap[0] = last; let c = 0;
                for (;;) {
                    const l = c * 2 + 1, r = l + 1; let m = c;
                    if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                    if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                    if (m === c) break; const t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m;
                }
            }
            return top;
        };
        const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };

        G[startI] = 0; S[startI] = stamp; P[startI] = -1;
        push(h(sx, sy), startI);
        let expansions = 0;
        const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        while (heap.length && expansions < 14000) {
            const [, cur] = pop();
            if (C[cur] === stamp) continue;
            C[cur] = stamp; expansions++;
            if (cur === goalI) {
                const out = [];
                for (let i = cur; i !== startI; i = P[i]) out.push({ x: i % size, y: (i / size) | 0 });
                out.reverse();
                return out;
            }
            const cx = cur % size, cy = (cur / size) | 0;
            for (const [dx, dy] of DIRS) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                if (this._blocked(nx, ny, allowA, allowB)) continue;
                if (dx !== 0 && dy !== 0 && (this._blocked(cx + dx, cy, allowA, allowB) || this._blocked(cx, cy + dy, allowA, allowB))) continue; // 不切角
                const ni = ny * size + nx;
                const ng = G[cur] + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
                if (S[ni] !== stamp || ng < G[ni]) {
                    S[ni] = stamp; G[ni] = ng; P[ni] = cur;
                    push(ng + h(nx, ny), ni);
                }
            }
        }
        return undefined;
    }
}
