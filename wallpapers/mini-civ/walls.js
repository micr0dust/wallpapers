// 城牆系統 —— 城牆段 / 角樓 / 規劃演算法（把整座城市圍成城邦）
// 規劃概念（不規則城牆）：
//   1. 以所有「非農田」建築為種子，做距離膨脹 → 形態學閉運算（填平凹陷）→ 填洞 → 取最大連通區
//   2. 追蹤區域邊界（Moore 追蹤）→ Douglas-Peucker 簡化成多邊形 → 切成 ≤5 格的任意角度牆段
//   3. 轉折大的頂點／長直牆每隔一段蓋 3x3 角樓；依東南西北四個方向各挑一段牆留作城門
//   4. 沿著城牆一圈依序排隊建造；牆線擋到的農田會被拆除重建在牆外；城門前後保留通道
//   5. 城內蓋滿時，規劃能完整包住舊牆的新城牆；新牆完工後再逐段拆除舊牆
//   地形接口：world.terrain.wallCost / blocked 之後可接入山川河流
const WALL_STONE = 0xb9b1a2, WALL_STONE_D = 0x948c7e, WALL_ROOF = 0x8c3a30;
const KEEP_STONE = 0xa7adb6, KEEP_STONE_D = 0x7d838d, KEEP_ROOF = 0x3d5f93;   // 內城牆（要塞）：較深的灰藍石材、藍色屋頂
const WALL_PAL = { stone: WALL_STONE, stoneD: WALL_STONE_D, roof: WALL_ROOF };
const KEEP_PAL = { stone: KEEP_STONE, stoneD: KEEP_STONE_D, roof: KEEP_ROOF };

class WallPiece extends Building {
    // spec: { P:{x,y}, Q:{x,y}（連續格座標，格中心 = 整數+0.5）, len, cells, gateP, gateQ }
    // gateP / gateQ：P 端／Q 端緊鄰城門 → 蓋門柱與燈籠
    constructor(spec, grid, scene) {
        const cells = spec.cells;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const c of cells) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); }
        super(x0, y0, grid, scene);
        this.type = 'wall';
        this.isWall = true;
        this.cells = cells;
        this.width = x1 - x0 + 1; this.height = y1 - y0 + 1;
        this.P = spec.P; this.Q = spec.Q;
        this.len = Math.max(1.2, spec.len);
        this.gateP = !!spec.gateP; this.gateQ = !!spec.gateQ;
        this.keep = !!spec.keep; this.pal = this.keep ? KEEP_PAL : WALL_PAL;
        this.dir = { x: (spec.Q.x - spec.P.x) / this.len, y: (spec.Q.y - spec.P.y) / this.len };
        this.requiredWorkers = 1;
        this.maxWorkers = 2;
        this.buildStepInterval = 700;
        this.create();
    }

    getCenterWorld() {
        const S = this.grid.size;
        return { x: (this.P.x + this.Q.x) / 2 - S / 2, z: (this.P.y + this.Q.y) / 2 - S / 2 };
    }
    siteSize() { return { w: this.len, h: 1.5 }; }
    groundLevel(c) {
        const S = this.grid.size;
        this.hP = groundY(this.P.x - S / 2, this.P.y - S / 2); this.hQ = groundY(this.Q.x - S / 2, this.Q.y - S / 2);
        return (this.hP + this.hQ) / 2;
    }

    create() {
        // 局部 +x = 由 P 指向 Q（世界座標 dz 方向 = 格座標 y 方向）
        this.facing = Math.atan2(-this.dir.y, this.dir.x);
        this.makeGroup();
        // 順著坡度傾斜（繞局部 z 軸俯仰）
        this.group.rotation.order = 'YZX';
        this.group.rotation.z = Math.atan2(this.hQ - this.hP, this.len);
        if (this.keep) this.group.scale.y = 1.4;
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyCells(this.cells, this.id);
    }

    // 工人站在牆的兩側（偶數零件在一側、奇數零件在另一側），並沿牆長錯開
    getPartBuildPosition(partIndex) {
        const mx = (this.P.x + this.Q.x) / 2, my = (this.P.y + this.Q.y) / 2;
        const nx = -this.dir.y, ny = this.dir.x;
        const along = (partIndex % 2 === 0 ? -1 : 1) * this.len / 4;
        const tryCell = (side) => {
            const gx = Math.floor(mx + this.dir.x * along + nx * side * 1.7), gy = Math.floor(my + this.dir.y * along + ny * side * 1.7);
            if (!this.grid.isValidPosition(gx, gy)) return null;
            const id = this.grid.buildings.get(`${gx},${gy}`);
            if (id) { const fp = this.grid.footprints.get(id); if (fp && fp.solid) return null; }
            return { x: gx, y: gy, z: 0 };
        };
        const s = partIndex % 2 === 0 ? 1 : -1;
        return tryCell(s) || tryCell(-s) || { x: Math.floor(mx), y: Math.floor(my), z: 0 };
    }

    createBuildingParts() {
        const G = Geo, L = this.len, n = Math.max(1, Math.round(L)), bl = L / n;
        this.buildingParts = []; this.partAnchors = [];
        // 1. 基座與牆身（逐塊顏色略異，看起來像石磚）
        const body = [G.box(L, 2.7, 1.12, this.pal.stoneD, { y: -0.85 })];
        for (let i = 0; i < n; i++) body.push(G.box(bl * 0.99, 1.9, 0.92, this.pal.stone, { x: -L / 2 + bl * (i + 0.5), y: 0.5 + 0.95, jitter: 0.07 }));
        this.addPart(body, 0, { x: 0, z: 0 });
        // 2. 牆頂走道與垛口
        const top = [G.box(L, 0.22, 1.16, this.pal.stoneD, { y: 2.4 + 0.11 })];
        for (let i = 0; i < n; i++)
            for (const s of [-1, 1]) top.push(G.box(bl * 0.6, 0.5, 0.24, this.pal.stone, { x: -L / 2 + bl * (i + 0.5), y: 2.62 + 0.25, z: s * 0.46, jitter: 0.06 }));
        this.addPart(top, 2.4, { x: 0, z: 0 });
        // 3. 端柱：城門兩側是高門柱，其餘接縫是圓柱（遮住斜接的縫隙）
        const posts = [];
        const gatePost = (lx) => posts.push(G.box(1.3, 3.5, 1.3, this.pal.stone, { x: lx, y: 1.75 }), G.box(1.5, 0.22, 1.5, this.pal.stoneD, { x: lx, y: 3.6 }),
            G.pyramid(1.5, 1.0, 1.5, this.pal.roof, { x: lx, y: 3.71 + 0.5 }));
        const joint = (lx) => posts.push(G.cyl(0.62, 0.7, 2.7, 8, this.pal.stone, { x: lx, y: 1.35 }), G.cyl(0.78, 0.7, 0.24, 8, this.pal.stoneD, { x: lx, y: 2.78 }));
        if (this.gateP) gatePost(-L / 2); else joint(-L / 2);
        if (this.gateQ) gatePost(L / 2); else joint(L / 2);
        this.addPart(posts, 0, { x: 0, z: 0 });
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    windowQuads() {
        const q = [], L = this.len;
        if (this.gateP) q.push({ w: 0.3, h: 0.5, x: -L / 2 - 0.66, y: 2.7, z: 0, ry: -Math.PI / 2 });
        if (this.gateQ) q.push({ w: 0.3, h: 0.5, x: L / 2 + 0.66, y: 2.7, z: 0, ry: Math.PI / 2 });
        return q;
    }
}

class WallTower extends Building {
    constructor(x, y, grid, scene, keep = false) {
        super(x, y, grid, scene);
        this.keep = keep; this.pal = keep ? KEEP_PAL : WALL_PAL;
        this.type = 'walltower';
        this.isWall = true;
        this.width = 3; this.height = 3;
        this.requiredWorkers = 1;
        this.maxWorkers = 2;
        this.buildStepInterval = 900;
        this.create();
    }

    create() {
        this.facing = 0;
        this.makeGroup();
        if (this.keep) this.group.scale.set(1.12, 1.3, 1.12);
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts() {
        const G = Geo;
        this.buildingParts = []; this.partAnchors = [];
        this.addPart([G.cyl(1.9, 1.9, 2.2, 12, this.pal.stoneD, { y: -0.9 }), G.cyl(1.75, 1.95, 0.6, 12, this.pal.stoneD, { y: 0.3 }), G.cyl(1.55, 1.7, 2.6, 12, this.pal.stone, { y: 0.6 + 1.3 })], 0, { x: 2.2, z: 0 });
        {
            const p = [G.cyl(1.4, 1.5, 2.2, 12, this.pal.stone, { y: 3.2 + 1.1 }), G.cyl(1.85, 1.55, 0.45, 12, this.pal.stoneD, { y: 5.4 + 0.22 })];
            for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; p.push(G.box(0.46, 0.46, 0.4, this.pal.stone, { x: Math.cos(a) * 1.72, z: Math.sin(a) * 1.72, y: 5.85 + 0.23, ry: -a + Math.PI / 2 })); }
            this.addPart(p, 3.2, { x: -2.2, z: 0 });
        }
        {
            const cloth = [G.part(new THREE.PlaneGeometry(1.0, 0.6, 6, 2), 0xc9382f, { x: 0.5, y: 9.1, jitter: 0 })];
            const solid = [G.cone(1.75, 2.5, 12, this.pal.roof, { y: 6.3 + 1.25 }), G.cyl(0.04, 0.04, 1.6, 5, 0x4a3a2a, { y: 8.8 + 0.8 })];
            const g = new THREE.Group();
            const m1 = new THREE.Mesh(Geo.merge(solid), BM.get().solid); m1.castShadow = true;
            const m2 = new THREE.Mesh(Geo.merge(cloth), BM.get().cloth); m2.castShadow = true;
            g.add(m1, m2);
            g.position.y = 6.3; m1.position.y = -6.3; m2.position.y = -6.3;
            g.visible = false;
            this.group.add(g);
            this.buildingParts.push(g); this.partAnchors.push({ x: 0, z: 2.2 });
        }
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    windowQuads() {
        const q = [], r = 1.55, y = 4.0;
        q.push({ w: 0.22, h: 0.55, x: 0, y, z: r, ry: 0 }, { w: 0.22, h: 0.55, x: 0, y, z: -r, ry: Math.PI },
            { w: 0.22, h: 0.55, x: r, y, z: 0, ry: Math.PI / 2 }, { w: 0.22, h: 0.55, x: -r, y, z: 0, ry: -Math.PI / 2 });
        return q;
    }
}

// ---------- 影像處理小工具（200x200 格） ----------
const WallGeo = {
    // 兩段式 chamfer 距離轉換（正交 3、斜向 4）；src[i]=1 為來源
    chamfer(src, S) {
        const INF = 1e7, d = new Int32Array(S * S);
        for (let i = 0; i < S * S; i++) d[i] = src[i] ? 0 : INF;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
            const i = y * S + x; let v = d[i];
            if (x > 0) v = Math.min(v, d[i - 1] + 3);
            if (y > 0) { v = Math.min(v, d[i - S] + 3); if (x > 0) v = Math.min(v, d[i - S - 1] + 4); if (x < S - 1) v = Math.min(v, d[i - S + 1] + 4); }
            d[i] = v;
        }
        for (let y = S - 1; y >= 0; y--) for (let x = S - 1; x >= 0; x--) {
            const i = y * S + x; let v = d[i];
            if (x < S - 1) v = Math.min(v, d[i + 1] + 3);
            if (y < S - 1) { v = Math.min(v, d[i + S] + 3); if (x < S - 1) v = Math.min(v, d[i + S + 1] + 4); if (x > 0) v = Math.min(v, d[i + S - 1] + 4); }
            d[i] = v;
        }
        return d;
    },
    dilate(m, r, S) { const d = WallGeo.chamfer(m, S), o = new Uint8Array(S * S); const t = r * 3; for (let i = 0; i < S * S; i++) o[i] = d[i] <= t ? 1 : 0; return o; },
    erode(m, r, S) { const inv = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) inv[i] = m[i] ? 0 : 1; const d = WallGeo.dilate(inv, r, S); for (let i = 0; i < S * S; i++) d[i] = d[i] ? 0 : 1; return d; },
    // 填洞（從邊界洪水填色，沒被填到的 0 變 1）
    fill(m, S) {
        const vis = new Uint8Array(S * S), st = [];
        const push = (x, y) => { if (x < 0 || y < 0 || x >= S || y >= S) return; const i = y * S + x; if (m[i] || vis[i]) return; vis[i] = 1; st.push(i); };
        for (let k = 0; k < S; k++) { push(k, 0); push(k, S - 1); push(0, k); push(S - 1, k); }
        while (st.length) { const i = st.pop(), x = i % S, y = (i / S) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
        const o = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) o[i] = vis[i] ? 0 : 1; return o;
    },
    // 最大連通區
    largest(m, S) {
        const lab = new Int32Array(S * S), sizes = [0]; let n = 0;
        for (let s = 0; s < S * S; s++) {
            if (!m[s] || lab[s]) continue;
            n++; let cnt = 0; const st = [s]; lab[s] = n;
            while (st.length) {
                const i = st.pop(); cnt++; const x = i % S, y = (i / S) | 0;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
                    const j = ny * S + nx; if (m[j] && !lab[j]) { lab[j] = n; st.push(j); }
                }
            }
            sizes[n] = cnt;
        }
        let best = 0; for (let k = 1; k <= n; k++) if (sizes[k] > sizes[best]) best = k;
        const o = new Uint8Array(S * S); if (best) for (let i = 0; i < S * S; i++) o[i] = lab[i] === best ? 1 : 0; return o;
    },
    // Moore 邊界追蹤：回傳有序的邊界格 [{x,y}]
    trace(m, S) {
        const at = (x, y) => x >= 0 && y >= 0 && x < S && y < S && m[y * S + x] === 1;
        let sx = -1, sy = -1;
        outer: for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (at(x, y)) { sx = x; sy = y; break outer; }
        if (sx < 0) return [];
        const ring = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
        const path = [{ x: sx, y: sy }];
        let cx = sx, cy = sy, bx = sx - 1, by = sy;
        for (let iter = 0; iter < S * S * 2; iter++) {
            let bi = 0; for (let k = 0; k < 8; k++) if (cx + ring[k][0] === bx && cy + ring[k][1] === by) { bi = k; break; }
            let nx = -1, ny = -1, lx = bx, ly = by;
            for (let k = 1; k <= 8; k++) {
                const r = ring[(bi + k) % 8], px = cx + r[0], py = cy + r[1];
                if (at(px, py)) { nx = px; ny = py; break; } lx = px; ly = py;
            }
            if (nx < 0) break;
            bx = lx; by = ly; cx = nx; cy = ny;
            if (cx === sx && cy === sy) break;
            path.push({ x: cx, y: cy });
        }
        return path;
    },
    // Douglas-Peucker（開放折線）
    dp(pts, a, b, eps, keep) {
        let md = -1, mi = -1;
        const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1e-6;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs((pts[i].x - A.x) * dy - (pts[i].y - A.y) * dx) / L;
            if (d > md) { md = d; mi = i; }
        }
        if (md > eps) { keep[mi] = 1; WallGeo.dp(pts, a, mi, eps, keep); WallGeo.dp(pts, mi, b, eps, keep); }
    },
    simplifyClosed(pts, eps) {
        const n = pts.length; if (n < 8) return pts.slice();
        let far = 0, fd = -1; for (let i = 0; i < n; i++) { const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y); if (d > fd) { fd = d; far = i; } }
        const keep = new Uint8Array(n + 1); keep[0] = 1; keep[far] = 1;
        const ext = pts.concat([pts[0]]);
        WallGeo.dp(ext, 0, far, eps, keep); WallGeo.dp(ext, far, n, eps, keep);
        const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]); return out;
    },
    // 線段經過的格子（4 連通，不會留下可以斜著鑽過去的縫）
    line(P, Q) {
        const out = [], seen = new Set();
        const add = (x, y) => { const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); out.push({ x, y }); } };
        const L = Math.hypot(Q.x - P.x, Q.y - P.y), n = Math.max(1, Math.ceil(L * 6));
        let prev = null;
        for (let i = 0; i <= n; i++) {
            const t = i / n, x = Math.floor(P.x + (Q.x - P.x) * t + 1e-4), y = Math.floor(P.y + (Q.y - P.y) * t + 1e-4);
            if (prev && prev.x !== x && prev.y !== y) add(x, prev.y);
            add(x, y); prev = { x, y };
        }
        return out;
    },
    // 多邊形填色（格中心）→ Uint8
    rasterize(poly, S) {
        const m = new Uint8Array(S * S);
        let y0 = 1e9, y1 = -1e9; for (const p of poly) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
        for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(S - 1, Math.ceil(y1)); y++) {
            const cy = y + 0.5, xs = [];
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i], b = poly[(i + 1) % poly.length];
                if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) xs.push(a.x + (cy - a.y) / (b.y - a.y) * (b.x - a.x));
            }
            xs.sort((p, q) => p - q);
            for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(S - 1, Math.floor(xs[k + 1] - 0.5)); x++) m[y * S + x] = 1;
        }
        return m;
    }
};

class WallPlanner {
    constructor(world, opts) {
        this.world = world;
        this.keepOf = (opts && opts.keepOf) || null;   // 內城牆：只保護這座城堡
        this.isKeep = !!this.keepOf;
        this.active = null;      // 已完工的城牆資料 {ins, dw, poly}
        this.next = null;        // 施工中的新城牆資料
        this.queue = [];
        this.ring = [];          // 生效城牆的零件
        this.newRing = [];       // 施工中城牆的零件
        this.demolish = [];
        this.reserved = [];
        this.expandRequested = false;
        this.capped = false;
        this.lastUpdate = 0;
        this.lastDemolish = 0;
        this.generation = 0;
        this.MAX_SIDE = 110;
    }

    get bm() { return this.world.buildingManager; }
    get grid() { return this.world.grid; }
    get vm() { return this.world.villagerManager; }
    get rect() { return this.active; }   // 相容舊程式：是否已有城牆

    // ---------- 供 AI 查詢 ----------
    constraint() { return this.next || this.active; }
    hasWall() { return !!(this.next || this.active); }
    _corners(x, y, size) { const e = size - 1; return [[x, y], [x + e, y], [x, y + e], [x + e, y + e], [x + (e >> 1), y + (e >> 1)]]; }
    // 房屋 / 塔 / 城堡必須蓋在牆內（離牆至少 4 格）
    inside(x, y, size) {
        const c = this.constraint();
        if (!c || (this.capped && !this.next)) return true;
        const S = this.grid.size;
        for (const [px, py] of this._corners(x, y, size)) {
            if (px < 0 || py < 0 || px >= S || py >= S) return false;
            const i = py * S + px;
            if (!c.ins[i] || c.dw[i] < 4 * 3) return false;
        }
        return true;
    }
    // 農田必須在牆外（離牆至少 2 格）
    outsideForFarm(x, y, size) {
        const c = this.constraint();
        if (!c) return true;
        const S = this.grid.size;
        for (const [px, py] of this._corners(x, y, size)) {
            if (px < 0 || py < 0 || px >= S || py >= S) return false;
            const i = py * S + px;
            if (c.ins[i] || c.dw[i] < 2 * 3) return false;
        }
        return true;
    }
    requestExpand() { if (this.active && !this.next && !this.capped) this.expandRequested = true; }

    // ---------- 規劃 ----------
    // 地形接口：回傳 true 表示該格不可建牆（之後由 world.terrain 提供）
    terrainBlocked(x, y) { const t = this.world.terrain; return !!(t && t.blocked && t.blocked(x, y)); }

    buildMask(growth) {
        const S = this.grid.size, seeds = new Uint8Array(S * S);
        let n = 0;
        if (this.isKeep) {
            const c = this.keepOf;
            for (let i = c.x; i < c.x + c.width; i++) for (let j = c.y; j < c.y + c.height; j++) seeds[j * S + i] = 1;
            let m = WallGeo.dilate(seeds, 6 + Math.floor((growth - 5) / 3), S);
            m = WallGeo.fill(m, S);
            return WallGeo.largest(m, S);
        }
        for (const b of this.bm.buildings.values()) {
            if (b.type === 'farm' || b.isWall) continue;
            for (let i = b.x; i < b.x + b.width; i++) for (let j = b.y; j < b.y + b.height; j++) seeds[j * S + i] = 1;
            n++;
        }
        if (!n) return null;
        let m = WallGeo.dilate(seeds, 8 + growth, S);
        m = WallGeo.dilate(m, 8, S); m = WallGeo.erode(m, 8, S);              // 閉運算：填平凹陷、合併相近的聚落
        if (this.active) { const o = WallGeo.dilate(this.active.ins, 8, S); for (let i = 0; i < S * S; i++) if (o[i]) m[i] = 1; }
        m = WallGeo.fill(m, S);
        m = WallGeo.largest(m, S);
        return m;
    }

    // 建立多邊形、牆段、角樓、城門
    plan(growth) {
        const S = this.grid.size, m = this.buildMask(growth);
        if (!m) return null;
        let minx = S, miny = S, maxx = 0, maxy = 0;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (m[y * S + x]) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
        if (minx < 4 || miny < 4 || maxx > S - 5 || maxy > S - 5 || maxx - minx > this.MAX_SIDE || maxy - miny > this.MAX_SIDE) return null;
        const trace = WallGeo.trace(m, S);
        if (trace.length < 20) return null;
        let poly = WallGeo.simplifyClosed(trace.map(c => ({ x: c.x + 0.5, y: c.y + 0.5 })), this.isKeep ? 1.4 : 2.2);
        if (poly.length < 5) return null;

        // 沿周長產生牆段：每個邊切成 ≤5 長的段；頂點轉折大或距離上一座塔太遠就蓋角樓
        const nv = poly.length, edges = [];
        for (let i = 0; i < nv; i++) {
            const A = poly[i], B = poly[(i + 1) % nv];
            edges.push({ A, B, L: Math.hypot(B.x - A.x, B.y - A.y) });
        }
        const turn = (i) => {
            const e0 = edges[(i + nv - 1) % nv], e1 = edges[i];
            const a0 = Math.atan2(e0.B.y - e0.A.y, e0.B.x - e0.A.x), a1 = Math.atan2(e1.B.y - e1.A.y, e1.B.x - e1.A.x);
            let d = Math.abs(a1 - a0); if (d > Math.PI) d = 2 * Math.PI - d; return d;
        };
        const nodes = [];     // 沿周長的節點：{x,y,tower}
        let since = 99;
        for (let i = 0; i < nv; i++) {
            const e = edges[i];
            const isTower = turn(i) > 0.5 || since > 26;
            nodes.push({ x: e.A.x, y: e.A.y, tower: isTower });
            since = isTower ? 0 : since;
            const k = Math.max(1, Math.ceil(e.L / 5));
            for (let s = 1; s < k; s++) {
                const t = s / k; since += e.L / k;
                const tw = since > 26; if (tw) since = 0;
                nodes.push({ x: e.A.x + (e.B.x - e.A.x) * t, y: e.A.y + (e.B.y - e.A.y) * t, tower: tw });
            }
            since += e.L / k;
        }
        const N = nodes.length;
        if (N < 6) return null;
        // 角樓（3x3，以節點所在格為中心）先佔格
        const claimed = new Set(), specs = [], towerAt = new Map();
        nodes.forEach((nd, i) => {
            if (!nd.tower) return;
            const cx = Math.floor(nd.x), cy = Math.floor(nd.y);
            const x = cx - 1, y = cy - 1;
            for (let a = x; a < x + 3; a++) for (let b = y; b < y + 3; b++) claimed.add(a + ',' + b);
            towerAt.set(i, { kind: 'tower', keep: this.isKeep, x, y, cost: 14, nodeIndex: i });
        });
        // 牆段
        const pieces = [];
        for (let i = 0; i < N; i++) {
            const A = nodes[i], B = nodes[(i + 1) % N];
            const L = Math.hypot(B.x - A.x, B.y - A.y);
            pieces.push({ i, A, B, L, towerA: A.tower, towerB: B.tower });
        }
        // 城門：依東、南、西、北挑 4 段（兩端都不是角樓、長度 ≥3.2）
        let cx = 0, cy = 0; for (const nd of nodes) { cx += nd.x; cy += nd.y; } cx /= N; cy /= N;
        const gateSet = new Set();
        const cand = pieces.filter(p => !p.towerA && !p.towerB && p.L >= 3.2);
        const nGate = this.isKeep ? 2 : (N * 3 > 70 ? 4 : 3);
        for (let g = 0; g < nGate; g++) {
            const ang = g * (Math.PI * 2 / nGate) + 0.0;
            let best = null, bs = 1e9;
            for (const p of cand) {
                if (gateSet.has(p.i) || gateSet.has((p.i + 1) % N) || gateSet.has((p.i + N - 1) % N)) continue;
                const mx = (p.A.x + p.B.x) / 2 - cx, my = (p.A.y + p.B.y) / 2 - cy;
                let d = Math.abs(Math.atan2(my, mx) - ang); if (d > Math.PI) d = 2 * Math.PI - d;
                // 偏好離城中心遠一點（外圍）且角度接近
                if (d < bs) { bs = d; best = p; }
            }
            if (best) gateSet.add(best.i);
        }
        const gates = [];
        // 依序輸出建造規格
        for (let i = 0; i < N; i++) {
            if (towerAt.has(i)) specs.push(towerAt.get(i));
            const p = pieces[i];
            if (gateSet.has(p.i)) { gates.push(p); continue; }
            const nextGate = gateSet.has((i + 1) % N), prevGate = gateSet.has((i + N - 1) % N);
            // 牆段兩端縮短一點避開角樓覆蓋的格子（由 claimed 去重處理格子）
            let cells = WallGeo.line(p.A, p.B).filter(c => !claimed.has(c.x + ',' + c.y));
            // 天然屏障：牆段大半落在深水／峭壁上就不蓋（河與山自己就是城牆）
            if (cells.length && this.grid.terr) {
                const nb = cells.filter(c => this.grid.terr.blocked[c.y * S + c.x]).length;
                if (nb / cells.length >= 0.55) { this.naturalBarrier = (this.naturalBarrier || 0) + 1; continue; }
                cells = cells.filter(c => !this.grid.terr.blocked[c.y * S + c.x]);
            }
            for (const c of cells) claimed.add(c.x + ',' + c.y);
            if (!cells.length) continue;
            specs.push({ kind: 'piece', keep: this.isKeep, P: p.A, Q: p.B, len: p.L, cells, gateP: prevGate, gateQ: nextGate, cost: Math.max(2, Math.round(2 * p.L)) });
        }
        // 把塔格也納入 wallCells 計算
        const wallCells = new Uint8Array(S * S);
        for (const k of claimed) { const [a, b] = k.split(',').map(Number); wallCells[b * S + a] = 1; }
        // 城門通道格
        const corridors = [];
        for (const p of gates) {
            const dx = (p.B.x - p.A.x) / p.L, dy = (p.B.y - p.A.y) / p.L, nx = -dy, ny = dx;
            const mx = (p.A.x + p.B.x) / 2, my = (p.A.y + p.B.y) / 2;
            for (let t = -6; t <= 6; t += 0.5) for (let s = -p.L / 2 + 0.5; s <= p.L / 2 - 0.5; s += 0.5) {
                corridors.push({ x: Math.floor(mx + dx * s + nx * t), y: Math.floor(my + dy * s + ny * t) });
            }
            corridors.center = corridors.center || [];
            corridors.center.push({ x: mx, y: my });
        }
        const ins = WallGeo.rasterize(poly, S);
        const dw = WallGeo.chamfer(wallCells, S);
        // 牆本身算在牆內（距離 0），確保房屋離牆 ≥4 格
        return { poly, ins, dw, specs, corridors, wallCells, mask: m };
    }

    // 牆線上是否與非農田建築衝突
    conflicts(plan) {
        const g = this.grid, S = g.size;
        for (let i = 0; i < S * S; i++) {
            if (!plan.wallCells[i]) continue;
            const x = i % S, y = (i / S) | 0;
            const id = g.buildings.get(`${x},${y}`);
            if (!id) { if (this.terrainBlocked(x, y)) return true; continue; }
            const fp = g.footprints.get(id);
            if (!(fp && fp.type === 'farm')) return true;
        }
        return false;
    }

    planWithRetries() {
        for (let g = 5; g <= 14; g += 3) {
            const p = this.plan(g);
            if (!p) return null;
            if (!this.conflicts(p)) return p;
        }
        return null;
    }

    reserveGates(plan, tag) {
        const cells = [];
        for (const c of plan.corridors) { const k = `${c.x},${c.y}`; cells.push(k); this.grid.reserved.add(k); }
        const tm = this.world.treeManager;
        if (tm && plan.corridors.center) for (const c of plan.corridors.center) tm.clearTreesInArea(c.x - 0.5, c.y - 0.5, 6);
        this.reserved.push({ tag, cells });
    }
    releaseGates(tag) {
        for (const e of this.reserved.filter(r => r.tag === tag)) for (const k of e.cells) this.grid.reserved.delete(k);
        this.reserved = this.reserved.filter(r => r.tag !== tag);
    }

    startPlan(plan) {
        this.next = plan;
        this.generation++;
        this.tag = 'g' + this.generation;
        this.queue = plan.specs.slice();
        this.newRing = [];
        this.reserveGates(plan, this.tag);
        if (this.isKeep) {   // 內城（城堡庭院）保留：不蓋房、不長樹
            const S = this.grid.size, cells = [];
            for (let i = 0; i < S * S; i++) if (plan.ins[i] && plan.dw[i] >= 2 * 3) { const k = `${i % S},${(i / S) | 0}`; cells.push(k); this.grid.reserved.add(k); }
            this.reserved.push({ tag: this.tag, cells });
        }
        console.log(`[${this.isKeep ? '內城' : ''}城牆] 規劃第 ${this.generation} 圈城牆：${plan.poly.length} 個頂點，共 ${plan.specs.length} 段`);
    }

    clearFarmsOn(cells) {
        const seen = new Set();
        for (const c of cells) {
            const id = this.grid.buildings.get(`${c.x},${c.y}`);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            const b = this.bm.buildings.get(id);
            if (b && b.type === 'farm') {
                if (b.constructionWorkers && b.constructionWorkers.length) b.releaseAllWorkers();
                this.bm.destroyFarm(b);
            }
        }
    }

    spawn(spec) {
        const cells = spec.kind === 'tower' ? (() => { const a = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a.push({ x: spec.x + i, y: spec.y + j }); return a; })() : spec.cells;
        this.clearFarmsOn(cells);
        const tm = this.world.treeManager;
        if (tm) {
            if (spec.kind === 'tower') tm.clearTreesInArea(spec.x + 1, spec.y + 1, 3);
            else tm.clearTreesInArea((spec.P.x + spec.Q.x) / 2 - 0.5, (spec.P.y + spec.Q.y) / 2 - 0.5, spec.len / 2 + 1.6);
        }
        const piece = this.bm.buildWall(spec);
        if (piece) this.newRing.push(piece);
        return !!piece;
    }

    // ---------- 主迴圈 ----------
    update(now, isNight) {
        if (now - this.lastUpdate < 500) return;
        this.lastUpdate = now;
        const vm = this.vm, bm = this.bm;

        if (this.isKeep) {   // 內城牆：城堡一出現就規劃並保留庭院；城堡完工、人口夠了才動工
            if (!this.planned) {
                this.planned = true;
                const p = this.planWithRetries();
                if (p) { this.startPlan(p); const c = this.keepOf; if (this.world.treeManager) this.world.treeManager.clearTreesInArea(c.x + 3, c.y + 3, 12); }
                else { this.capped = true; console.log('[內城] 無法規劃內城牆（周圍已有建築）'); }
            }
            if (!this.next || isNight) return this._demolishStep(now);
            if (!this.keepOf.isComplete || vm.getVillagerCount() < 20 || vm.getWoodInventory() < 60) return;
            return this._pump();
        }

        if (!bm.castles.some(c => c.isComplete)) return;
        this._demolishStep(now);
        if (isNight) return;

        if (!this.next && !this.capped) {
            const counts = bm.getBuildingCounts(), pop = vm.getVillagerCount(), wood = vm.getWoodInventory();
            if (!this.active) {
                if (counts.houses >= 6 && pop >= 22 && wood >= 120) {
                    const p = this.planWithRetries();
                    if (p) this.startPlan(p); else { this.capped = true; console.log('[城牆] 無法規劃城牆'); }
                }
            } else if (this.expandRequested && wood >= 200) {
                this.expandRequested = false;
                const p = this.planWithRetries();
                if (p) this.startPlan(p); else { this.capped = true; console.log('[城牆] 已達最大規模，不再擴建'); }
            }
        }
        if (!this.next) return;
        this._pump();
    }

    _demolishStep(now) {
        if (!this.demolish.length || now - this.lastDemolish <= 160) return;
        this.lastDemolish = now;
        const p = this.demolish.shift();
        const fx = this.world.fx;
        if (fx && p.group) { const c = p.getCenterWorld(); fx.dust(c.x, 0.3, c.z, p.type === 'walltower' ? 14 : 6); }
        this.bm.destroyBuilding(p.id);
        if (!this.demolish.length && this.oldTag) { this.releaseGates(this.oldTag); this.oldTag = null; }
    }

    // 依序開工、偵測完工
    _pump() {
        const vm = this.vm;
        const pop = vm.getVillagerCount();
        const maxSites = Util.clamp(Math.floor(pop / 10), 2, 6);
        let sites = this.newRing.filter(p => p.isUnderConstruction).length;
        while (this.queue.length && sites < maxSites) {
            const spec = this.queue[0];
            if (vm.getWoodInventory() < spec.cost) break;
            this.queue.shift();
            vm.consumeWood(spec.cost);
            if (this.spawn(spec)) sites++;
        }
        if (!this.queue.length && this.newRing.every(p => p.isComplete)) {
            const old = this.ring;
            this.ring = this.newRing; this.newRing = [];
            this.active = this.next; this.next = null;
            if (old.length) { this.demolish.push(...old); this.oldTag = this.oldTag || ('g' + (this.generation - 1)); }
            if (this.isKeep) this.capped = true;
            console.log(`[${this.isKeep ? '內城' : ''}城牆] 第 ${this.generation} 圈城牆完工`);
        }
    }
}
