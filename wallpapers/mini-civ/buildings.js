// 建築 —— 低多邊形模型（合併幾何 + 頂點色）、分段建造動畫、窗戶夜間發光
const BM = {
    _inst: null,
    time: { value: 0 },
    get() {
        if (this._inst) return this._inst;
        const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
        // 夜間窗戶：共用一個材質，全部建築同步發光
        const win = new THREE.MeshLambertMaterial({ color: 0x1d2b3d, emissive: 0x000000, side: THREE.DoubleSide });
        const cloth = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
        cloth.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = BM.time;
            shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>',
                `#include <begin_vertex>
                 float amp = clamp(position.x * 1.6, 0.0, 1.0);
                 transformed.z += sin(uTime * 4.2 + position.x * 5.5) * 0.12 * amp;
                 transformed.y += sin(uTime * 3.1 + position.x * 4.0) * 0.04 * amp;`);
        };
        cloth.customProgramCacheKey = () => 'bmCloth';
        // 夜間地面光暈
        let glowTex = null;
        const cv = Util.canvas(128, 128);
        if (cv) {
            const g = cv.ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
            g.addColorStop(0, 'rgba(255,200,110,1)'); g.addColorStop(0.35, 'rgba(255,170,80,0.45)'); g.addColorStop(1, 'rgba(255,150,60,0)');
            cv.ctx.fillStyle = g; cv.ctx.fillRect(0, 0, 128, 128);
            glowTex = new THREE.CanvasTexture(cv.canvas);
        }
        const glow = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
        const skirt = new THREE.MeshLambertMaterial({ color: Util.color(0x8c877b) });
        this._inst = { solid, win, cloth, glow, skirt, glowGeo: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) };
        return this._inst;
    },
    // 夜晚程度 0..1
    setNight(night) {
        const m = this.get();
        m.win.emissive.setRGB(1.0, 0.62, 0.22).multiplyScalar(Util.smoothstep(0.15, 0.85, night) * 1.15);
        m.win.color.setRGB(0.1, 0.16, 0.24).lerp(new THREE.Color(1, 0.8, 0.45), Util.smoothstep(0.2, 0.9, night) * 0.8);
        m.glow.opacity = Util.smoothstep(0.2, 0.9, night) * 0.5;
    }
};

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

// 建築基礎類別
class Building {
    constructor(x, y, grid, scene) {
        this.x = x;
        this.y = y;
        this.grid = grid;
        this.scene = scene;
        this.mesh = null;
        this.id = this.generateId();

        this.isUnderConstruction = true;
        this.buildingParts = [];
        this.partAnchors = [];
        this.currentBuildStep = 0;
        this.totalBuildSteps = 0;
        this.lastBuildTime = 0;
        this.buildStepInterval = 1000;
        this.isComplete = false;
        this.facing = 0;
        this.createdAt = simNow();
        this.lastProgress = simNow();

        this.constructionWorkers = [];
        this.requiredWorkers = 1;
        this.maxWorkers = 3;

        this.popping = [];
        this.windows = null;
        this.glowSize = 0;
        this.smokeEmitters = [];
    }

    generateId() { return `${this.constructor.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }

    // 足跡中心（世界座標）
    getCenterWorld() {
        const w = this.grid.gridToWorld(this.x, this.y);
        return { x: w.x + this.width / 2, z: w.z + this.height / 2 };
    }

    create() { throw new Error('create() method must be implemented'); }
    createBuildingParts() { throw new Error('createBuildingParts() method must be implemented'); }

    // ---- 視覺：零件 ----
    // geoms: 幾何陣列；baseY: 零件底部高度（動畫以此為軸心）；anchor: 工人站位（本地座標）
    addPart(geoms, baseY, anchor, opts) {
        opts = opts || {};
        const geo = Geo.merge(Array.isArray(geoms) ? geoms : [geoms]);
        geo.translate(0, -baseY, 0);
        const mesh = new THREE.Mesh(geo, opts.material || BM.get().solid);
        mesh.position.y = baseY;
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        mesh.visible = false;
        this.group.add(mesh);
        this.buildingParts.push(mesh);
        this.partAnchors.push(anchor || { x: 0, z: 0 });
        return mesh;
    }

    // 建立施工現場（夯土地基 + 木樁 + 木料堆）
    createSite() {
        const g = new THREE.Group();
        const sz = this.siteSize ? this.siteSize() : { w: this.width - 0.4, h: this.height - 0.4 };
        const w = sz.w, h = sz.h;
        const parts = [Geo.box(w, 0.08, h, 0x8a7352, { y: 0.04, jitter: 0.03 })];
        const post = (x, z) => parts.push(Geo.box(0.12, 0.9, 0.12, 0x6a4a2c, { x, z, y: 0.45 }));
        post(-w / 2, -h / 2); post(w / 2, -h / 2); post(-w / 2, h / 2); post(w / 2, h / 2);
        // 圍繩（細長橫桿）
        parts.push(Geo.box(w, 0.05, 0.05, 0xcdbb94, { y: 0.8, z: -h / 2 }));
        parts.push(Geo.box(w, 0.05, 0.05, 0xcdbb94, { y: 0.8, z: h / 2 }));
        parts.push(Geo.box(0.05, 0.05, h, 0xcdbb94, { y: 0.8, x: -w / 2 }));
        parts.push(Geo.box(0.05, 0.05, h, 0xcdbb94, { y: 0.8, x: w / 2 }));
        // 木料堆
        for (let i = 0; i < 4; i++) parts.push(Geo.cyl(0.12, 0.12, 1.1, 6, 0xa57a48, { x: w / 2 - 0.6 + (i % 2) * 0.28, y: 0.14 + Math.floor(i / 2) * 0.22, z: h / 2 - 0.7, rz: Math.PI / 2 }));
        const mesh = new THREE.Mesh(Geo.merge(parts), BM.get().solid);
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);
        this.site = g;
        this.group.add(g);
    }

    // ---- 建造進度 ----
    updateConstruction(currentTime) {
        if (!this.isUnderConstruction || this.isComplete) return;
        if (!this.checkWorkerAtCurrentPart()) return;

        if (this.currentBuildStep === 0) {
            this.completeBuildingCurrentPart();
            this.lastBuildTime = currentTime;
            return;
        }
        if (this.currentBuildStep < this.totalBuildSteps && this.lastBuildTime === 0) {
            this.lastBuildTime = currentTime;
            return;
        }
        if (currentTime - this.lastBuildTime >= this.buildStepInterval) {
            this.completeBuildingCurrentPart();
            this.lastBuildTime = currentTime;
        }
    }

    checkWorkerAtCurrentPart() {
        if (this.currentBuildStep >= this.totalBuildSteps) return false;
        const pos = this.getPartBuildPosition(this.currentBuildStep);
        if (!pos) return false;
        return this.constructionWorkers.some(worker => {
            const g = this.grid.worldToGrid(worker.x, worker.z);
            return Math.max(Math.abs(g.x - pos.x), Math.abs(g.y - pos.y)) <= 2;
        });
    }

    startBuildingCurrentPart() {}

    completeBuildingCurrentPart() {
        const part = this.buildingParts[this.currentBuildStep];
        if (part) {
            part.visible = true;
            // 彈出動畫：以底部為軸心向上長出來
            part.scale.set(0.9, 0.02, 0.9);
            part.userData.pop = 0;
            this.popping.push(part);
            const fx = window.worldInstance && window.worldInstance.fx;
            if (fx) {
                const a = this.partAnchors[this.currentBuildStep] || { x: 0, z: 0 };
                const v = new THREE.Vector3(a.x, 0.2, a.z);
                this.group.localToWorld(v);
                fx.dust(v.x, 0.1, v.z, 7);
            }
        }
        this.currentBuildStep++;
        this.lastProgress = simNow();

        if (this.currentBuildStep >= this.totalBuildSteps) {
            this.isUnderConstruction = false;
            this.isComplete = true;
            this.onConstructionComplete();
            return;
        }
        this.assignWorkersToCurrentPart();
    }

    // 建造部件的工人站位：足跡外圍一圈（工人站在牆外敲打）
    getPartBuildPosition(partIndex) {
        const a = this.partAnchors[partIndex] || { x: 0, z: 0 };
        const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
        const c = Math.cos(this.facing), s = Math.sin(this.facing);
        let dx = a.x * c + a.z * s, dz = -a.x * s + a.z * c;
        const hw = this.width / 2 + 0.8, hh = this.height / 2 + 0.8;
        if (Math.abs(dx) < hw && Math.abs(dz) < hh) {
            const px = hw - Math.abs(dx), pz = hh - Math.abs(dz);
            if (px < pz) dx = (dx >= 0 ? 1 : -1) * hw; else dz = (dz >= 0 ? 1 : -1) * hh;
        }
        const gx = Util.clamp(Math.floor(cx + dx), Math.max(0, this.x - 1), Math.min(this.grid.size - 1, this.x + this.width));
        const gy = Util.clamp(Math.floor(cy + dz), Math.max(0, this.y - 1), Math.min(this.grid.size - 1, this.y + this.height));
        return { x: gx, y: gy, z: 0 };
    }

    assignWorkersToCurrentPart() {
        if (this.currentBuildStep >= this.totalBuildSteps) return;
        const buildPosition = this.getPartBuildPosition(this.currentBuildStep);
        if (!buildPosition) return;
        for (const worker of this.constructionWorkers) {
            if (worker.state === 'constructing') {
                worker.assignedToPart = this.currentBuildStep;
                worker.targetBuildPosition = buildPosition;
                worker.createPath(buildPosition.x, buildPosition.y);
            }
        }
    }

    onConstructionComplete() {
        this.releaseAllWorkers();
        if (this.site) this.site.visible = false;
        this.buildWindows();
        this.addGlowDecal();
        const fx = window.worldInstance && window.worldInstance.fx;
        if (fx) {
            const c = this.getCenterWorld();
            fx.sparkle(c.x, 2.0, c.z);
            fx.dust(c.x, 0.1, c.z, 14);
        }
    }

    // ---- 窗戶與夜間光暈 ----
    buildWindows() {
        const quads = this.windowQuads ? this.windowQuads() : [];
        if (!quads.length) return;
        const parts = quads.map(q => Geo.quad(q.w, q.h, q.x, q.y, q.z, q.ry));
        const m = new THREE.Mesh(Geo.merge(parts), BM.get().win);
        m.receiveShadow = false; m.castShadow = false;
        this.group.add(m);
        this.windows = m;
    }

    addGlowDecal() {
        if (!this.glowSize) return;
        const m = new THREE.Mesh(BM.get().glowGeo, BM.get().glow);
        m.scale.set(this.glowSize, 1, this.glowSize);
        m.position.set(0, 0.09, 0.4);
        m.renderOrder = 5;
        this.group.add(m);
        this.glowMesh = m;
    }

    // 逐幀動畫（秒）
    animate(dt) {
        for (let i = this.popping.length - 1; i >= 0; i--) {
            const p = this.popping[i];
            p.userData.pop += dt / 0.55;
            const t = Math.min(1, p.userData.pop);
            const e = easeOutBack(t);
            p.scale.set(0.9 + 0.1 * t, Math.max(0.02, e), 0.9 + 0.1 * t);
            if (t >= 1) { p.scale.set(1, 1, 1); this.popping.splice(i, 1); }
        }
    }

    // 建造工人管理
    addWorker(villager) {
        if (this.constructionWorkers.length < this.maxWorkers && !this.constructionWorkers.includes(villager)) {
            this.constructionWorkers.push(villager);
            setTimeout(() => { this.assignWorkersToCurrentPart(); }, 100);
            return true;
        }
        return false;
    }

    removeWorker(villager) {
        const index = this.constructionWorkers.indexOf(villager);
        if (index !== -1) { this.constructionWorkers.splice(index, 1); return true; }
        return false;
    }

    releaseAllWorkers() {
        const workersToRelease = [...this.constructionWorkers];
        for (const worker of workersToRelease) {
            if (worker.state === 'constructing') {
                worker.state = 'idle';
                worker.constructionBuilding = null;
                worker.workPosition = null;
                worker.assignedToPart = null;
                worker.targetBuildPosition = null;
                worker.target = null;
                worker.path = [];
            }
        }
        this.constructionWorkers = [];
    }

    needsMoreWorkers() { return this.isUnderConstruction && this.constructionWorkers.length < this.requiredWorkers; }
    canAcceptMoreWorkers() { return this.isUnderConstruction && this.constructionWorkers.length < this.maxWorkers; }

    getWorkerPositions() {
        const positions = [];
        const baseX = this.x + Math.floor(this.width / 2), baseY = this.y + Math.floor(this.height / 2);
        for (let i = 0; i < this.maxWorkers; i++) {
            const angle = (i / this.maxWorkers) * Math.PI * 2;
            const radius = Math.max(this.width, this.height) / 2 + 2;
            positions.push({ x: Math.round(baseX + Math.cos(angle) * radius), y: Math.round(baseY + Math.sin(angle) * radius) });
        }
        return positions;
    }

    destroy() {
        if (this.group) {
            this.scene.remove(this.group);
            this.group.traverse(o => { if (o.geometry && o.geometry !== BM.get().glowGeo) o.geometry.dispose(); });
            this.group = null;
        }
        this.mesh = null;
        this.buildingParts = [];
    }

    getWorldPosition() { return this.grid.gridToWorld(this.x, this.y); }

    // 村民躲進建築時的可見性判斷：點是否在足跡內
    containsWorld(wx, wz, margin) {
        const w = this.grid.gridToWorld(this.x, this.y);
        const m = margin || 0;
        return wx >= w.x - m && wx <= w.x + this.width + m && wz >= w.z - m && wz <= w.z + this.height + m;
    }

    // 建築基準高度：足跡中心與四角的平均地面高度
    groundLevel(c) {
        const hw = this.width / 2, hh = this.height / 2;
        return (groundY(c.x, c.z) + groundY(c.x - hw, c.z - hh) + groundY(c.x + hw, c.z - hh) + groundY(c.x - hw, c.z + hh) + groundY(c.x + hw, c.z + hh)) / 5;
    }

    makeGroup() {
        const g = new THREE.Group();
        const c = this.getCenterWorld();
        g.position.set(c.x, this.groundLevel(c), c.z);
        g.rotation.y = this.facing;
        this.group = g;
        this.mesh = g;
        this.scene.add(g);
        // 地基裙：坡地上把落差遮住（平地時埋在地面下看不到）
        if (!this.isWall) {
            const sk = new THREE.Mesh(new THREE.BoxGeometry(this.width - 0.15, 2.4, this.height - 0.15), BM.get().skirt);
            sk.position.y = -1.2 + 0.02; sk.receiveShadow = true;
            g.add(sk);
        }
        return g;
    }
}

// ---------- 城堡 ----------
class Castle extends Building {
    constructor(x, y, grid, scene) {
        super(x, y, grid, scene);
        this.width = 6;
        this.height = 6;
        this.lastVillagerSpawn = 0;
        this.villagerSpawnInterval = 10000;
        this.level = 0;
        this.populationSupport = 5;
        this.type = 'castle';
        this.requiredWorkers = 2;
        this.maxWorkers = 4;
        this.glowSize = 13;
        this.create();
    }

    create() {
        this.facing = Math.floor(Math.random() * 4) * Math.PI / 2;
        this.makeGroup();
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    // 城堡升級：加高角塔與主堡（level 0/1/2）
    upgrade(level) {
        if (!this.group || level === this.level) return;
        for (const m of this.buildingParts) { this.group.remove(m); m.traverse && m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
        if (this.windows) { this.group.remove(this.windows); this.windows.geometry.dispose(); this.windows = null; }
        this.popping = [];
        this.level = level;
        this.populationSupport = [5, 7, 9][level];
        this.createBuildingParts();
        this.currentBuildStep = this.totalBuildSteps;
        for (const m of this.buildingParts) { m.visible = true; m.scale.set(0.92, 0.02, 0.92); m.userData.pop = -Math.random() * 0.4; this.popping.push(m); }
        this.buildWindows();
        const fx = window.worldInstance && window.worldInstance.fx;
        if (fx) { const c = this.getCenterWorld(); fx.dust(c.x, 0.2, c.z, 22); fx.sparkle(c.x, 5, c.z); }
    }

    createBuildingParts() {
        const G = Geo, stone = 0xb8b2a4, stoneD = 0x9a9486, roof = 0xa63f31;
        const Et = [0, 2.0, 3.6][this.level || 0], Ek = [0, 3.0, 6.2][this.level || 0];   // 角塔 / 主堡加高量
        this.buildingParts = []; this.partAnchors = [];

        // 0 地基與庭院
        this.addPart([G.box(6.0, 0.3, 6.0, 0x8f897d, { y: 0.15 }), G.box(5.0, 0.04, 5.0, 0x6f6a60, { y: 0.31 })], 0, { x: 0, z: 3.3 });

        // 1 城牆（含垛口，正面留城門缺口）
        {
            const p = [];
            const T = 0.6, H = 2.4, y = 0.3 + H / 2;
            p.push(G.box(2.2, H, T, stone, { x: -1.9, y, z: 2.55 }), G.box(2.2, H, T, stone, { x: 1.9, y, z: 2.55 }));     // 前（門兩側）
            p.push(G.box(4.4, H, T, stone, { y, z: -2.55 }));                                                           // 後
            p.push(G.box(T, H, 4.4, stone, { x: -2.55, y }), G.box(T, H, 4.4, stone, { x: 2.55, y }));                  // 左右
            // 垛口
            const crenel = (x, z, ry) => p.push(G.box(0.42, 0.42, 0.66, stoneD, { x, z, y: 0.3 + H + 0.21, ry: ry || 0 }));
            for (let i = -2; i <= 2; i++) crenel(i * 0.95, -2.55);
            for (let i = -2; i <= 2; i++) crenel(-2.55, i * 0.95, Math.PI / 2);
            for (let i = -2; i <= 2; i++) crenel(2.55, i * 0.95, Math.PI / 2);
            crenel(-2.0, 2.55); crenel(-1.2, 2.55); crenel(2.0, 2.55); crenel(1.2, 2.55);
            this.addPart(p, 0.3, { x: -2.0, z: 3.2 });
        }
        // 2 城門樓
        {
            const p = [G.box(2.0, 3.0, 0.9, stone, { y: 0.3 + 1.5, z: 2.55 })];
            p.push(G.box(1.0, 1.5, 0.12, 0x3b2a1c, { y: 0.3 + 0.75, z: 3.03 }));
            p.push(G.cyl(0.5, 0.5, 0.12, 12, 0x3b2a1c, { y: 0.3 + 1.5, z: 3.03, rx: Math.PI / 2 }));
            for (let i = -1; i <= 1; i++) p.push(G.box(0.45, 0.4, 0.8, stoneD, { x: i * 0.7, y: 0.3 + 3.2, z: 2.55 }));
            p.push(G.box(1.2, 0.1, 0.5, 0x6a4a2c, { y: 0.35, z: 3.35 })); // 踏階
            this.addPart(p, 0.3, { x: 0, z: 3.3 });
        }
        // 3-6 四座角塔
        const corners = [[-2.55, -2.55], [2.55, -2.55], [-2.55, 2.55], [2.55, 2.55]];
        corners.forEach(([x, z]) => {
            const p = [G.cyl(0.92, 1.02, 3.7 + Et, 12, stone, { x, z, y: 0.3 + (3.7 + Et) / 2 }), G.cyl(1.12, 1.0, 0.35, 12, stoneD, { x, z, y: 0.3 + 3.7 + Et + 0.17 })];
            if (Et > 0) p.push(G.cyl(1.04, 1.04, 0.18, 12, stoneD, { x, z, y: 0.3 + (3.7 + Et) * 0.55 }));
            this.addPart(p, 0.3, { x: x * 1.1, z: z * 1.1 });
        });
        // 7-8 主堡
        this.addPart([G.box(2.8, 2.6, 2.8, 0xc4bdae, { y: 0.3 + 1.3 }), G.box(3.0, 0.2, 3.0, stoneD, { y: 0.3 + 2.7 })], 0.3, { x: -2.2, z: 0 });
        {
            const p = [G.box(2.4, 1.6 + Ek, 2.4, 0xcbc4b5, { y: 3.2 + (1.6 + Ek) / 2 })];
            for (let i = -1; i <= 1; i++) { p.push(G.box(0.5, 0.4, 0.5, stoneD, { x: i * 0.95, y: 4.8 + Ek + 0.2, z: 1.0 }), G.box(0.5, 0.4, 0.5, stoneD, { x: i * 0.95, y: 4.8 + Ek + 0.2, z: -1.0 })); }
            if (Ek > 0) for (let k = 1; k <= (this.level === 2 ? 2 : 1); k++) p.push(G.box(2.55, 0.16, 2.55, stoneD, { y: 3.2 + k * (1.6 + Ek) / (this.level === 2 ? 3 : 2) }));
            this.addPart(p, 3.2, { x: 2.2, z: 0 });
        }
        // 9-12 角塔屋頂
        corners.forEach(([x, z]) => {
            this.addPart([G.cone(1.3, 2.1, 12, roof, { x, z, y: 4.3 + Et + 1.05 })], 4.3 + Et, { x: x * 1.1, z: z * 1.1 });
        });
        // 13 主堡屋頂
        this.addPart([G.pyramid(3.0, 2.2 + Ek * 0.25, 3.0, roof, { y: 4.8 + Ek + 1.1 + Ek * 0.125 }), G.cyl(0.07, 0.07, 1.5, 6, 0x4a3a2a, { y: 7.0 + Ek + Ek * 0.25 + 0.75 })], 4.8 + Ek, { x: 0, z: 2.8 });
        // 14 旗幟
        this.addFlags();
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    addFlags() {
        // 旗幟（獨立材質，風吹飄動）：最後一個零件
        const G = Geo, p = [], cloth = [];
        const poleTop = (x, y, z, h, color, w) => {
            p.push(G.cyl(0.045, 0.045, h, 5, 0x4a3a2a, { x, y: y + h / 2, z }));
            cloth.push(G.part(new THREE.PlaneGeometry(w, w * 0.62, 6, 2), color, { x: x + w / 2 + 0.03, y: y + h - w * 0.35, z, jitter: 0 }));
        };
        const Et = [0, 2.0, 3.6][this.level || 0], Ek = [0, 3.0, 6.2][this.level || 0];
        poleTop(0, 7.0 + Ek * 1.25, 0, 1.5, 0xd8452f, 1.15);
        poleTop(-2.55, 5.4 + Et, 2.55, 1.2, 0xd8452f, 0.8);
        poleTop(2.55, 5.4 + Et, 2.55, 1.2, 0xd8452f, 0.8);
        // 旗杆用一般材質，旗面用布料材質 —— 合成一個零件（兩個 mesh 放進 Group）
        const g = new THREE.Group();
        const mp = new THREE.Mesh(Geo.merge(p), BM.get().solid); mp.castShadow = true;
        const mc = new THREE.Mesh(Geo.merge(cloth), BM.get().cloth); mc.castShadow = true;
        g.add(mp, mc);
        g.visible = false;
        this.group.add(g);
        this.buildingParts.push(g);
        this.partAnchors.push({ x: 0, z: 3.2 });
    }

    windowQuads() {
        const q = [];
        // 主堡下層
        [[0.7, 0], [-0.7, 0]].forEach(([x]) => {
            q.push({ w: 0.5, h: 0.75, x, y: 1.9, z: 1.43, ry: 0 }, { w: 0.5, h: 0.75, x, y: 1.9, z: -1.43, ry: Math.PI });
            q.push({ w: 0.5, h: 0.75, x: 1.43, y: 1.9, z: x, ry: Math.PI / 2 }, { w: 0.5, h: 0.75, x: -1.43, y: 1.9, z: x, ry: -Math.PI / 2 });
        });
        // 主堡上層（升級後多幾排）
        const rows = this.level === 2 ? [4.0, 5.9, 7.8, 9.6] : (this.level === 1 ? [4.0, 5.6] : [4.0]);
        for (const y of rows) {
            q.push({ w: 0.5, h: 0.7, x: 0, y, z: 1.23, ry: 0 }, { w: 0.5, h: 0.7, x: 0, y, z: -1.23, ry: Math.PI });
            q.push({ w: 0.5, h: 0.7, x: 1.23, y, z: 0, ry: Math.PI / 2 }, { w: 0.5, h: 0.7, x: -1.23, y, z: 0, ry: -Math.PI / 2 });
        }
        // 角塔箭窗（朝外）
        [[-2.55, -2.55], [2.55, -2.55], [-2.55, 2.55], [2.55, 2.55]].forEach(([x, z]) => {
            const sx = Math.sign(x), sz = Math.sign(z);
            q.push({ w: 0.2, h: 0.7, x: x + sx * 0.72, y: 2.6, z: z + sz * 0.72, ry: Math.atan2(sx, sz) });
        });
        // 城門內燈火
        q.push({ w: 0.5, h: 0.8, x: 0, y: 1.0, z: 3.1, ry: 0 });
        return q;
    }

    getPopulationSupport() { return this.isComplete ? this.populationSupport : 0; }
    canSpawnVillager() { return this.isComplete; }
    spawnVillager() { return this.isComplete; }
    updateWindowLighting() {}
}

// ---------- 塔樓 ----------
class Tower extends Building {
    constructor(x, y, grid, scene, factionColor = 0xff0000) {
        super(x, y, grid, scene);
        this.width = 2;
        this.height = 2;
        this.factionColor = factionColor;
        this.type = 'tower';
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        this.glowSize = 6;
        this.create();
    }

    create() {
        this.facing = Math.random() * Math.PI * 2;
        this.makeGroup();
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts() {
        const G = Geo, stone = 0xaaa498, stoneD = 0x8e887b, roof = 0x3d63a0;
        this.buildingParts = []; this.partAnchors = [];
        this.addPart([G.cyl(1.2, 1.3, 0.7, 12, stoneD, { y: 0.35 }), G.cyl(1.0, 1.1, 0.5, 12, stone, { y: 0.95 })], 0, { x: 1.5, z: 0 });
        this.addPart([G.cyl(0.9, 1.0, 2.4, 12, stone, { y: 0.7 + 1.2 })], 0.7, { x: -1.5, z: 0 });
        {
            const p = [G.cyl(0.85, 0.9, 2.2, 12, stone, { y: 3.1 + 1.1 }), G.cyl(1.15, 1.0, 0.4, 12, stoneD, { y: 5.3 + 0.2 })];
            for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.push(G.box(0.38, 0.4, 0.38, stoneD, { x: Math.cos(a) * 1.08, z: Math.sin(a) * 1.08, y: 5.7 + 0.2, ry: -a })); }
            this.addPart(p, 3.1, { x: 0, z: 1.5 });
        }
        {
            const cloth = [G.part(new THREE.PlaneGeometry(0.9, 0.55, 6, 2), 0xe0b13a, { x: 0.48, y: 8.35 + 1.05 - 0.4, jitter: 0 })];
            const solid = [G.cone(1.3, 2.7, 12, roof, { y: 6.1 + 1.35 }), G.cyl(0.04, 0.04, 1.4, 5, 0x4a3a2a, { y: 8.8 + 0.7 - 0.0 })];
            const g = new THREE.Group();
            const m1 = new THREE.Mesh(Geo.merge(solid), BM.get().solid); m1.castShadow = true;
            const m2 = new THREE.Mesh(Geo.merge(cloth), BM.get().cloth); m2.castShadow = true;
            g.add(m1, m2);
            g.position.y = 6.1;
            m1.position.y = -6.1; m2.position.y = -6.1;
            g.visible = false;
            this.group.add(g);
            this.buildingParts.push(g); this.partAnchors.push({ x: 0, z: -1.5 });
        }
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    windowQuads() {
        const q = [];
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + 0.4;
            const r = 0.93;
            q.push({ w: 0.2, h: 0.65, x: Math.sin(a) * r, y: 2.2, z: Math.cos(a) * r, ry: a });
            q.push({ w: 0.26, h: 0.7, x: Math.sin(a) * 0.88, y: 4.4, z: Math.cos(a) * 0.88, ry: a });
        }
        return q;
    }

    updateWindowLighting() {}
}

// ---------- 房舍 ----------
class House extends Building {
    // tier 0 = 茅草小屋（郊區）、1 = 木構房（市區）、2 = 石造樓房（城堡周邊）
    constructor(x, y, grid, scene, tier = 1) {
        super(x, y, grid, scene);
        this.width = 4;
        this.height = 4;
        this.tier = tier;
        this.populationSupport = House.POP[tier];
        this.type = 'house';
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        this.glowSize = [6.5, 7.5, 8.2][tier];
        this.create();
    }

    getPopulationSupport() { return this.isComplete ? this.populationSupport : 0; }

    // 原地升級：換成更高級的外觀（以彈出動畫長出新模型）
    upgrade(tier) {
        if (!this.group || tier === this.tier) return;
        for (const m of this.buildingParts) { this.group.remove(m); m.traverse && m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
        if (this.windows) { this.group.remove(this.windows); this.windows.geometry.dispose(); this.windows = null; }
        this.popping = [];
        this.tier = tier;
        this.populationSupport = House.POP[tier];
        this.glowSize = [6.5, 7.5, 8.2][tier];
        if (this.glowMesh) this.glowMesh.scale.set(this.glowSize, 1, this.glowSize);
        this.createBuildingParts();
        this.currentBuildStep = this.totalBuildSteps;
        for (const m of this.buildingParts) {
            m.visible = true; m.scale.set(0.9, 0.02, 0.9); m.userData.pop = -Math.random() * 0.3;
            this.popping.push(m);
        }
        this.buildWindows();
        const fx = window.worldInstance && window.worldInstance.fx;
        if (fx) { const c = this.getCenterWorld(); fx.dust(c.x, 0.2, c.z, 12); fx.sparkle(c.x, 2.5, c.z); }
    }

    setFacing(angle) {
        // 吸附到最近的 90 度，使大門朝向指定方向（+z 為門）
        this.facing = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        if (this.group) this.group.rotation.y = this.facing;
    }

    create() {
        this.makeGroup();
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts() {
        if (this.tier === 0) return this.partsCottage();
        if (this.tier === 2) return this.partsStone();
        return this.partsTimber();
    }

    partsCottage() {
        const G = Geo;
        const wall = Util.pick([0xd8c49a, 0xcdb88f, 0xc2ab80, 0xb89c72]);
        const straw = Util.pick([0xc9a65a, 0xbf9b52, 0xd0b068]);
        const wood = 0x6a4a2c;
        this.buildingParts = []; this.partAnchors = [];
        this.addPart([G.box(3.0, 0.3, 3.2, 0x8d8a82, { y: 0.15 })], 0, { x: 0, z: 2.2 });
        {
            const p = [G.box(2.6, 1.5, 2.8, wall, { y: 0.3 + 0.75 })];
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(G.box(0.16, 1.55, 0.16, wood, { x: sx * 1.3, z: sz * 1.4, y: 0.3 + 0.77 }));
            p.push(G.box(2.7, 0.1, 2.9, wood, { y: 1.8 }));
            p.push(G.box(0.65, 1.15, 0.1, 0x5a3a22, { y: 0.3 + 0.58, z: 1.43 }));
            p.push(G.box(0.5, 0.6, 0.08, wood, { x: -0.8, y: 1.15, z: 1.42 }));
            p.push(G.box(0.5, 0.6, 0.08, wood, { x: 1.31, y: 1.15, z: 0, ry: Math.PI / 2 }));
            p.push(G.box(0.7, 0.1, 0.35, 0x6a4a2c, { x: 1.0, y: 0.5, z: 1.55 }), G.blob(0.18, 0, 0xc9a23a, { x: 1.0, y: 0.7, z: 1.55, sx: 1.6 }));
            this.addPart(p, 0.3, { x: -2.0, z: 0 });
        }
        {
            const p = [G.gable(3.5, 1.35, 3.5, straw, wall, { y: 1.85 })];
            p.push(G.box(0.14, 0.12, 3.6, 0x8b6f3a, { y: 1.85 + 1.35 }));
            p.push(G.box(0.4, 1.2, 0.4, 0x8a7f74, { x: -0.8, y: 1.85 + 1.15, z: -0.7 }));
            this.addPart(p, 1.85, { x: 2.0, z: 0 });
        }
        this.smokeEmitters = [{ x: -0.8, y: 3.4, z: -0.7 }];
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    // 高木屋：三層木構架樓房（逐層微微外挑），紅磚煙囪、陡峭屋頂
    partsStone() {
        const G = Geo;
        const plaster = Util.pick([0xf0e6cf, 0xe8dcc0, 0xeee2c8]);
        const roof = Util.pick([0xa83a2c, 0x7a3b2e, 0x8c4a32, 0x5e4a3a]);
        const beam = 0x4a3222, brick = 0x9a5a48, wood = 0x6e5236;
        this.buildingParts = []; this.partAnchors = [];
        this.roofColor = roof;
        const floor = (w, h, y, withDoor) => {
            const p = [G.box(w, h, w, plaster, { y: y + h / 2 }), G.box(w + 0.12, 0.16, w + 0.12, beam, { y }), G.box(w + 0.12, 0.16, w + 0.12, beam, { y: y + h })];
            const e = w / 2 + 0.01;
            for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) p.push(G.box(0.16, h, 0.16, beam, { x: sx * (w / 2 - 0.02), z: sz * (w / 2 - 0.02), y: y + h / 2 }));
            for (const sz of [-1, 1]) for (const sx of [-1, 1]) p.push(G.box(0.16, h, 0.16, beam, { x: sx * (w / 2 - 0.02), z: sz * 0.0, y: y + h / 2 }));
            // 斜撐
            for (const sx of [-1, 1]) p.push(G.box(0.12, h * 1.08, 0.1, beam, { x: sx * w * 0.25, z: e, y: y + h / 2, rz: sx * 0.7 }));
            if (withDoor) p.push(G.box(0.95, 1.4, 0.14, 0x4e3220, { y: y + 0.72, z: e + 0.02 }), G.box(1.2, 0.16, 0.22, beam, { y: y + 1.5, z: e + 0.02 }));
            return p;
        };
        this.addPart([G.box(3.5, 0.45, 3.5, wood, { y: 0.225 }), G.box(1.3, 0.2, 0.8, 0x6a5a48, { y: 0.1, z: 2.0 })], 0, { x: 0, z: 2.5 });
        this.addPart(floor(3.2, 1.7, 0.45, true), 0.45, { x: -2.4, z: 0 });
        this.addPart(floor(3.45, 1.65, 2.15, false), 2.15, { x: 2.4, z: 0 });
        this.addPart(floor(3.3, 1.55, 3.8, false), 3.8, { x: -2.4, z: 1 });
        {
            const y0 = 5.35;
            const p = [G.gable(4.0, 2.4, 3.9, roof, plaster, { y: y0 }), G.box(0.16, 0.12, 4.05, 0x3d2a1c, { y: y0 + 2.4 })];
            p.push(G.box(0.5, 2.0, 0.5, brick, { x: 1.0, y: y0 + 1.6, z: -0.9 }), G.box(0.68, 0.12, 0.68, 0x7a4a3a, { x: 1.0, y: y0 + 2.65, z: -0.9 }));
            // 屋簷下的小閣樓窗
            p.push(G.box(0.8, 0.7, 0.5, plaster, { y: y0 + 0.75, z: 1.35 }), G.gable(1.0, 0.55, 0.7, roof, plaster, { y: y0 + 1.1, z: 1.35 }));
            this.addPart(p, y0, { x: 0, z: -2.5 });
        }
        this.smokeEmitters = [{ x: 1.0, y: 8.2, z: -0.9 }];
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    partsTimber() {
        const G = Geo;
        const plaster = Util.pick([0xeadfc6, 0xe4d3ae, 0xd9cdb8, 0xefe6d2, 0xe0c9a6]);
        const roof = Util.pick([0xb5442f, 0x944030, 0x5c7391, 0x7a5f45, 0x6f8a55]);
        const beam = 0x5a3d28;
        this.buildingParts = []; this.partAnchors = [];
        this.roofColor = roof;

        this.addPart([G.box(3.5, 0.5, 3.5, 0x8d8a82, { y: 0.25 }), G.box(1.2, 0.18, 0.7, 0x77746d, { y: 0.09, z: 1.95 })], 0, { x: 0, z: 2.4 });

        {
            const p = [G.box(3.1, 1.9, 3.1, plaster, { y: 0.5 + 0.95 })];
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(G.box(0.2, 1.95, 0.2, beam, { x: sx * 1.55, z: sz * 1.55, y: 0.5 + 0.97 }));
            p.push(G.box(3.2, 0.13, 3.2, beam, { y: 1.55 }));
            p.push(G.box(3.2, 0.13, 3.2, beam, { y: 2.3 }));
            // 門與窗框
            p.push(G.box(0.8, 1.35, 0.12, 0x5a3a22, { y: 0.5 + 0.68, z: 1.56 }));
            p.push(G.box(0.95, 0.12, 0.16, beam, { y: 0.5 + 1.38, z: 1.56 }));
            const frame = (x, y, z, ry) => p.push(G.box(0.7, 0.85, 0.1, beam, { x, y, z, ry: ry || 0 }));
            frame(-1.0, 1.55, 1.56); frame(1.0, 1.55, 1.56);
            frame(0, 1.55, -1.56, Math.PI);
            frame(1.56, 1.55, 0, Math.PI / 2); frame(-1.56, 1.55, 0, Math.PI / 2);
            // 窗台花箱
            p.push(G.box(0.6, 0.14, 0.2, 0x6a4a2c, { x: -1.0, y: 1.05, z: 1.66 }), G.blob(0.22, 0, 0x5aa04a, { x: -1.0, y: 1.2, z: 1.66, sx: 1.6, sy: 0.7 }));
            this.addPart(p, 0.5, { x: -2.3, z: 0 });
        }
        {
            const p = [G.gable(3.9, 1.7, 3.8, roof, plaster, { y: 2.4 })];
            p.push(G.box(0.16, 0.12, 3.9, 0x3d2a1c, { y: 2.4 + 1.7 }));
            p.push(G.box(0.45, 1.5, 0.45, 0x8a7f74, { x: 0.85, y: 2.4 + 1.5, z: -0.7 }), G.box(0.6, 0.12, 0.6, 0x6e655c, { x: 0.85, y: 2.4 + 2.28, z: -0.7 }));
            this.addPart(p, 2.4, { x: 2.3, z: 0 });
        }
        this.smokeEmitters = [{ x: 0.85, y: 4.8, z: -0.7 }];
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }

    windowQuads() {
        const q = [];
        if (this.tier === 0) {
            q.push({ w: 0.38, h: 0.48, x: -0.8, y: 1.15, z: 1.48, ry: 0 }, { w: 0.38, h: 0.48, x: 1.36, y: 1.15, z: 0, ry: Math.PI / 2 }, { w: 0.38, h: 0.48, x: 0, y: 1.15, z: -1.46, ry: Math.PI });
            return q;
        }
        if (this.tier === 2) {
            const rows = [[0.45, 3.2, 1.7], [2.15, 3.45, 1.65], [3.8, 3.3, 1.55]];   // [底, 寬, 高]
            rows.forEach(([y0, w, h], r) => {
                const e = w / 2 + 0.03, wy = y0 + h * 0.58;
                const xs = r === 0 ? [-1.0, 1.0] : [-1.0, 0, 1.0];
                for (const x of xs) q.push({ w: 0.46, h: 0.6, x, y: wy, z: e, ry: 0 });
                q.push({ w: 0.46, h: 0.6, x: -0.7, y: wy, z: -e, ry: Math.PI }, { w: 0.46, h: 0.6, x: 0.7, y: wy, z: -e, ry: Math.PI });
                q.push({ w: 0.46, h: 0.6, x: e, y: wy, z: 0.0, ry: Math.PI / 2 }, { w: 0.46, h: 0.6, x: -e, y: wy, z: 0.0, ry: -Math.PI / 2 });
            });
            q.push({ w: 0.34, h: 0.4, x: 0, y: 6.4, z: 1.62, ry: 0 });
            return q;
        }
        q.push({ w: 0.46, h: 0.62, x: -1.0, y: 1.55, z: 1.62, ry: 0 }, { w: 0.46, h: 0.62, x: 1.0, y: 1.55, z: 1.62, ry: 0 });
        q.push({ w: 0.46, h: 0.62, x: 0, y: 1.55, z: -1.62, ry: Math.PI });
        q.push({ w: 0.46, h: 0.62, x: 1.62, y: 1.55, z: 0, ry: Math.PI / 2 }, { w: 0.46, h: 0.62, x: -1.62, y: 1.55, z: 0, ry: -Math.PI / 2 });
        q.push({ w: 0.5, h: 0.5, x: 0, y: 3.15, z: 1.93, ry: 0 });   // 閣樓圓窗
        return q;
    }

    updateWindowLighting() {}
}
House.POP = [4, 5, 7];

// ---------- 水車磨坊（只會蓋在河邊，水車朝向河面） ----------
class Mill extends Building {
    constructor(x, y, grid, scene, facing) {
        super(x, y, grid, scene);
        this.width = 5; this.height = 5;
        this.type = 'mill';
        this.requiredWorkers = 1;
        this.maxWorkers = 2;
        this.buildStepInterval = 1100;
        this.glowSize = 6;
        this.waterFacing = facing || 0;
        this.create();
    }
    create() {
        this.facing = this.waterFacing;
        this.makeGroup();
        this.createSite();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }
    createBuildingParts() {
        const G = Geo, wood = 0x7a5a38, plaster = 0xe8dcc0, roof = 0x7a3b2e, stone = 0x9a9486;
        this.buildingParts = []; this.partAnchors = [];
        this.addPart([G.box(4.6, 0.5, 4.6, stone, { y: 0.25 }), G.box(1.6, 0.12, 2.4, 0x6a4a2c, { x: 2.9, y: 0.12 })], 0, { x: -2.6, z: 0 });
        {
            const p = [G.box(3.0, 2.5, 3.2, plaster, { x: -0.4, y: 0.5 + 1.25 }), G.box(3.15, 0.16, 3.35, wood, { x: -0.4, y: 0.52 }), G.box(3.15, 0.16, 3.35, wood, { x: -0.4, y: 3.0 })];
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(G.box(0.16, 2.5, 0.16, wood, { x: -0.4 + sx * 1.5, z: sz * 1.6, y: 1.75 }));
            p.push(G.box(0.8, 1.3, 0.12, 0x4e3220, { x: -0.4, y: 1.15, z: 1.62 }));
            this.addPart(p, 0.5, { x: 0, z: 2.6 });
        }
        this.addPart([G.gable(3.7, 1.8, 3.9, roof, plaster, { x: -0.4, y: 3.05, ry: Math.PI / 2 }), G.box(0.5, 1.4, 0.5, 0x9a5a48, { x: -1.1, y: 3.05 + 1.2, z: -0.8 })], 3.0, { x: 0, z: -2.6 });
        // 水車（獨立可旋轉的零件）：輪軸沿局部 x 軸，位於 +x 側（面向河）
        {
            const parts = [G.cyl(0.18, 0.18, 0.9, 8, wood, { rz: Math.PI / 2 })];
            for (let k = 0; k < 4; k++) parts.push(G.box(0.1, 2.7, 0.1, wood, { rx: k * Math.PI / 4 }));
            for (let k = 0; k < 10; k++) {
                const a = k / 10 * Math.PI * 2;
                parts.push(G.box(0.55, 0.62, 0.1, 0x8a6a42, { y: Math.cos(a) * 1.4, z: Math.sin(a) * 1.4, rx: a }));
            }
            const g = new THREE.Group(), mesh = new THREE.Mesh(Geo.merge(parts), BM.get().solid);
            mesh.castShadow = true; g.add(mesh);
            g.position.set(1.75, 1.35, 0); g.visible = false;
            this.group.add(g);
            this.wheel = mesh;
            this.buildingParts.push(g); this.partAnchors.push({ x: 2.6, z: 0 });
        }
        this.smokeEmitters = [{ x: -1.1, y: 5.0, z: -0.8 }];
        this.totalBuildSteps = this.buildingParts.length;
        this.lastBuildTime = 0;
    }
    windowQuads() { return [{ w: 0.5, h: 0.6, x: -1.2, y: 1.7, z: 1.66, ry: 0 }, { w: 0.5, h: 0.6, x: 0.4, y: 1.7, z: 1.66, ry: 0 }]; }
    spin(dt) { if (this.wheel && this.isComplete) this.wheel.rotation.x += dt * 0.7; }
}

// ---------- 農田 ----------
class Farm extends Building {
    constructor(x, y, grid, scene, suburb = false) {
        super(x, y, grid, scene);
        this.suburb = suburb;
        this.width = 6;
        this.height = 6;
        this.exhaustion = 50;
        this.maxExhaustion = 50;
        this.lifeSeconds = 85;     // 從種下到成熟收成的時間（遊戲秒，只計白天）
        this.type = 'farm';
        this.workingVillager = null;
        this.lastUpdate = simNow();
        this.harvestPoints = [];
        this.requiredWorkers = 1;
        this.maxWorkers = 1;
        this.generateHarvestPoints();
        this.create();
    }

    generateHarvestPoints() {
        this.harvestPoints = [];
        for (let i = 0; i < 12; i++) this.harvestPoints.push({ x: (Math.random() - 0.5) * 5.0, z: (Math.random() - 0.5) * 5.0 });
    }

    getRandomHarvestPoint() {
        const c = this.getCenterWorld();
        const p = this.harvestPoints[Math.floor(Math.random() * this.harvestPoints.length)];
        return { x: c.x + p.x, z: c.z + p.z };
    }

    create() {
        this.facing = Math.floor(Math.random() * 2) * Math.PI / 2;
        this.makeGroup();
        this.createBuildingParts();
        this.grid.occupyArea(this.x, this.y, this.width, this.height, this.id);
    }

    createBuildingParts() {
        const G = Geo;
        this.buildingParts = []; this.partAnchors = [];
        const base = [G.box(5.7, 0.14, 5.7, 0x5b4330, { y: 0.07, jitter: 0.03 })];
        // 田壟
        for (let i = 0; i < 6; i++) base.push(G.box(5.2, 0.13, 0.46, 0x4a3524, { y: 0.17, z: -2.2 + i * 0.88, jitter: 0.06 }));
        // 木欄與角柱
        const rail = (w, d, x, z) => base.push(G.box(w, 0.1, d, 0x7a5a3a, { x, z, y: 0.35 }));
        rail(5.9, 0.08, 0, -2.9); rail(5.9, 0.08, 0, 2.9); rail(0.08, 5.9, -2.9, 0); rail(0.08, 5.9, 2.9, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) base.push(G.box(0.14, 0.55, 0.14, 0x6a4a2c, { x: sx * 2.9, z: sz * 2.9, y: 0.28 }));
        // 稻草人
        base.push(G.cyl(0.05, 0.05, 1.5, 5, 0x6a4a2c, { x: 2.0, z: 2.0, y: 0.75 }), G.box(1.0, 0.07, 0.07, 0x6a4a2c, { x: 2.0, z: 2.0, y: 1.2 }));
        base.push(G.blob(0.17, 0, 0xe6cf8a, { x: 2.0, z: 2.0, y: 1.6 }), G.cone(0.28, 0.26, 8, 0x8a5a2a, { x: 2.0, z: 2.0, y: 1.85 }));
        // 郊區農田：乾草堆與小穀倉
        if (this.suburb) {
            for (const [hx, hz, hs] of [[-2.1, 2.1, 1], [-1.4, 2.3, 0.75]]) base.push(G.cone(0.5 * hs, 1.0 * hs, 7, 0xd9b95c, { x: hx, z: hz, y: 0.5 * hs }), G.cyl(0.5 * hs, 0.5 * hs, 0.2, 7, 0xc9a84c, { x: hx, z: hz, y: 0.1 }));
            base.push(G.box(1.1, 0.8, 0.9, 0x8a5a3a, { x: -2.0, z: -2.3, y: 0.45 }), G.gable(1.4, 0.5, 1.2, 0x6a4a35, 0x8a5a3a, { x: -2.0, z: -2.3, y: 0.85 }));
        }
        // 作物
        const crops = [];
        for (let r = 0; r < 6; r++) for (let k = 0; k < 9; k++) {
            crops.push(G.blob(0.26, 0, 0xffffff, { x: -2.3 + k * 0.575 + Util.rand(-0.06, 0.06), z: -2.2 + r * 0.88 + Util.rand(-0.06, 0.06), y: 0.38, sy: Util.rand(1.1, 1.6), jitter: 0.12 }, 0.18));
        }
        const group = new THREE.Group();
        const baseMesh = new THREE.Mesh(Geo.merge(base), BM.get().solid);
        baseMesh.castShadow = true; baseMesh.receiveShadow = true;
        this.cropMat = new THREE.MeshLambertMaterial({ vertexColors: true, color: Util.color(0x5fae3f) });
        const cropMesh = new THREE.Mesh(Geo.merge(crops), this.cropMat);
        cropMesh.castShadow = true; cropMesh.receiveShadow = true;
        group.add(baseMesh, cropMesh);
        this.cropMesh = cropMesh;
        group.visible = false;
        this.group.add(group);
        this.buildingParts.push(group);
        this.partAnchors.push({ x: 0, z: 3.5 });
        this.totalBuildSteps = 1;
        this.lastBuildTime = 0;
        this.updateFarmColor();
    }

    // 農田成熟度（作物顏色由綠到金黃，並逐漸長高）
    getCurrentFarmColor() {
        const ratio = this.exhaustion / this.maxExhaustion;     // 1 = 剛種下
        const a = Util.color(0x5fae3f), b = Util.color(0xd8b548);
        return a.lerp(b, 1 - ratio);
    }

    updateFarmColor() {
        if (!this.cropMat) return;
        const ripe = 1 - this.exhaustion / this.maxExhaustion;
        this.cropMat.color.copy(this.getCurrentFarmColor());
        if (this.cropMesh) this.cropMesh.scale.y = 0.45 + 0.75 * Math.min(1, ripe * 1.4);
    }

    update(isNight = false) {
        const now = simNow();
        const dt = (now - this.lastUpdate) / 1000;
        if (dt < 1) return;
        this.lastUpdate = now;
        if (!this.isComplete) return;           // 還沒蓋好的農田不會枯萎
        if (isNight) return;
        this.exhaustion = Math.max(0, this.exhaustion - dt * this.maxExhaustion / this.lifeSeconds);
        this.updateFarmColor();
        if (this.exhaustion <= 0) this.markForDestruction();
    }

    markForDestruction() { this.shouldDestroy = true; }
    needsDestruction() { return this.shouldDestroy || false; }

    setWorker(villager) {
        if (this.workingVillager !== null) return false;
        this.workingVillager = villager;
        return true;
    }
    removeWorker() { if (this.workingVillager) this.workingVillager = null; }
    hasWorker() { return this.workingVillager !== null; }
    replant() { this.exhaustion = this.maxExhaustion; this.updateFarmColor(); }

    onConstructionComplete() {
        this.releaseAllWorkers();
        this.lastUpdate = simNow();
    }

    destroy() {
        if (this.cropMat) this.cropMat.dispose();
        super.destroy();
    }
}

// ---------- 建築管理器 ----------
class BuildingManager {
    constructor(grid, scene, treeManager = null) {
        this.grid = grid;
        this.scene = scene;
        this.treeManager = treeManager;
        this.buildings = new Map();
        this.castles = [];
        this.farms = [];
        this.towers = [];
        this.houses = [];
        this.walls = [];
        this.mills = [];
        this.smokeTimer = 0;
    }

    setTreeManager(treeManager) { this.treeManager = treeManager; }

    _wear(b, strength, margin) {
        const w = window.worldInstance;
        if (w && w.pathWear) w.pathWear.stampRect(b.x, b.y, b.width, b.height, strength, margin);
    }

    _register(b, list) {
        this.buildings.set(b.id, b);
        list.push(b);
    }

    buildCastle(x, y) {
        if (!this.grid.canBuildIgnoreTrees(x, y, 6, 6)) return { success: false, message: '位置被佔用' };
        if (!this.grid.checkBuildingSpacing(x, y, 6, 6, false)) return { success: false, message: '與其他建築距離太近' };
        if (this.buildings.size > 0 && !this.grid.checkBuildingCondition(x, y, 6, 6)) return { success: false, message: '附近5格內需要有建築' };
        if (this.treeManager) this.treeManager.clearTreesInArea(x + 3, y + 3, 9);
        const castle = new Castle(x, y, this.grid, this.scene);
        this._register(castle, this.castles);
        this._wear(castle, 0.9, 2);
        return { success: true, building: castle };
    }

    buildTower(x, y, factionColor = 0xff0000) {
        if (!this.grid.canBuildIgnoreTrees(x, y, 2, 2)) return { success: false, message: '位置被佔用' };
        if (!this.grid.checkBuildingSpacing(x, y, 2, 2, false)) return { success: false, message: '與其他建築距離太近' };
        if (!this.grid.checkBuildingCondition(x, y, 2, 2)) return { success: false, message: '附近5格內需要有建築' };
        if (this.treeManager) this.treeManager.clearTreesInArea(x + 1, y + 1, 4);
        const tower = new Tower(x, y, this.grid, this.scene, factionColor);
        this._register(tower, this.towers);
        this._wear(tower, 0.8, 1);
        return { success: true, building: tower };
    }

    buildHouse(x, y) {
        if (!this.grid.canBuildIgnoreTrees(x, y, 4, 4)) return { success: false, message: '位置被佔用' };
        if (!this.grid.checkBuildingSpacing(x, y, 4, 4, false)) return { success: false, message: '與其他建築距離太近' };
        if (!this.grid.checkBuildingCondition(x, y, 4, 4)) return { success: false, message: '附近5格內需要有建築' };
        if (this.treeManager) this.treeManager.clearTreesInArea(x + 2, y + 2, 5);
        const w0 = window.worldInstance;
        const house = new House(x, y, this.grid, this.scene, 0);  // 新屋一律先蓋基礎屋，之後依 8:2 配額升級
        // 大門朝向最近的城堡
        let best = null, bd = Infinity;
        for (const c of this.castles) {
            const d = Math.hypot(c.x - x, c.y - y);
            if (d < bd) { bd = d; best = c; }
        }
        if (best) {
            const dx = (best.x + 3) - (x + 2), dz = (best.y + 3) - (y + 2);
            house.setFacing(Math.atan2(dx, dz));
        } else house.setFacing(Math.random() * 6.28);
        this._register(house, this.houses);
        this._wear(house, 0.75, 1);
        return { success: true, building: house };
    }

    // 城牆段 / 角樓（由 WallPlanner 規劃）；位置被佔用時回傳 null
    buildWall(spec) {
        if (spec.kind === 'tower') { if (!this.grid.canBuildIgnoreTrees(spec.x, spec.y, 3, 3)) return null; }
        else if (!this.grid.canOccupyCells(spec.cells)) return null;
        const b = spec.kind === 'tower' ? new WallTower(spec.x, spec.y, this.grid, this.scene, !!spec.keep)
            : new WallPiece(spec, this.grid, this.scene);
        this._register(b, this.walls);
        return b;
    }

    buildMill(x, y, facing) {
        if (!this.grid.canBuildIgnoreTrees(x, y, 5, 5, true)) return { success: false, message: '位置被佔用' };
        if (this.treeManager) this.treeManager.clearTreesInArea(x + 2.5, y + 2.5, 5);
        const mill = new Mill(x, y, this.grid, this.scene, facing);
        this._register(mill, this.mills);
        this._wear(mill, 0.8, 1);
        return { success: true, building: mill };
    }

    buildFarm(x, y) {
        if (!this.grid.canBuildIgnoreTrees(x, y, 6, 6)) return { success: false, message: '位置被佔用' };
        if (!this.grid.checkBuildingCondition(x, y, 6, 6)) return { success: false, message: '附近5格內需要有建築' };
        if (this.treeManager) this.treeManager.clearTreesInArea(x + 3, y + 3, 7);
        const w0 = window.worldInstance;
        const farm = new Farm(x, y, this.grid, this.scene, !!(w0 && w0.districtDist(x + 3, y + 3) > 34));
        this._register(farm, this.farms);
        return { success: true, building: farm };
    }

    // 遊戲邏輯更新（currentTime = 遊戲毫秒）
    update(currentTime, isNight = false) {
        this.buildings.forEach(b => { if (b.isUnderConstruction) b.updateConstruction(currentTime); });
        // 城市成熟 / 靠近城堡 → 房屋逐步升級（每次一棟）
        if (!isNight && currentTime - (this.lastTierCheck || 0) > 5000) {
            this.lastTierCheck = currentTime;
            const w = window.worldInstance;
            if (w) {
                // 8:2 法則：全部房屋中「升級屋」至多 20%（高級石木屋至多約 7%），其餘維持基礎屋
                const hs = this.houses.filter(h => h.isComplete && h.group);
                const N = this.houses.length;
                const capUp = Math.floor(N * 0.2), cap2 = Math.floor(N * 0.07);
                let nUp = 0, n2 = 0;
                for (const h of this.houses) { if (h.tier >= 1) nUp++; if (h.tier >= 2) n2++; }
                hs.sort((a, b) => w.districtDist(a.x + 2, a.y + 2) - w.districtDist(b.x + 2, b.y + 2));
                for (const h of hs) {
                    const t = w.districtTier(h.x + 2, h.y + 2);
                    if (t <= h.tier) continue;
                    const nt = h.tier + 1;
                    if (h.tier === 0 && nUp >= capUp) continue;
                    if (nt === 2 && n2 >= cap2) continue;
                    h.upgrade(nt); break;
                }
            }
            if (w) for (const c of this.castles) {
                if (!c.isComplete || !c.group) continue;
                if (w.castleLevel() > c.level) { c.upgrade(c.level + 1); break; }
            }
        }
        for (let i = this.farms.length - 1; i >= 0; i--) {
            const farm = this.farms[i];
            farm.update(isNight);
            if (farm.needsDestruction()) this.destroyFarm(farm);
        }
    }

    // 視覺動畫（真實秒）
    animate(dt, state, fx) {
        BM.time.value += dt;
        this.buildings.forEach(b => b.animate(dt));
        for (const m of this.mills) m.spin(dt);
        // 煙囪冒煙（白天與夜晚都有，夜晚更多）
        this.smokeTimer += dt;
        if (fx && this.smokeTimer > 0.4) {
            this.smokeTimer = 0;
            for (const h of this.houses) {
                if (!h.isComplete || !h.group) continue;
                if (Math.random() < 0.55 + state.night * 0.35) {
                    const e = h.smokeEmitters[0];
                    const v = new THREE.Vector3(e.x, e.y, e.z);
                    h.group.localToWorld(v);
                    fx.smoke(v.x, v.y, v.z);
                }
            }
        }
    }

    destroyFarm(farm) {
        let needReassignment = false;
        if (farm.workingVillager) {
            const v = farm.workingVillager;
            v.workingFarm = null; v.state = 'idle'; v.target = null; v.path = [];
            needReassignment = true;
        }
        const fx = window.worldInstance && window.worldInstance.fx;
        if (fx && farm.group) { const c = farm.getCenterWorld(); fx.dust(c.x, 0.2, c.z, 12); }
        farm.destroy();
        this.grid.freeArea(farm.x, farm.y, farm.width, farm.height);
        this.buildings.delete(farm.id);
        this.farms = this.farms.filter(f => f.id !== farm.id);
        if (needReassignment && window.worldInstance && window.worldInstance.villagerManager) {
            if (this.farms.some(f => !f.hasWorker())) window.worldInstance.villagerManager.reassignVillagersToFarms();
        }
    }

    // 夜晚程度 0..1 → 窗戶 / 光暈
    updateBuildingLighting(isNight, nightIntensity) { BM.setNight(nightIntensity); }

    getCastleCount() { return this.castles.length; }

    destroyBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (building) {
            building.destroy();
            this.buildings.delete(buildingId);
            this.castles = this.castles.filter(b => b.id !== buildingId);
            this.farms = this.farms.filter(b => b.id !== buildingId);
            this.towers = this.towers.filter(b => b.id !== buildingId);
            this.houses = this.houses.filter(b => b.id !== buildingId);
            this.walls = this.walls.filter(b => b.id !== buildingId);
            this.mills = this.mills.filter(b => b.id !== buildingId);
            if (building.isWall) this.grid.freeById(buildingId); else this.grid.freeArea(building.x, building.y, building.width, building.height);
        }
    }

    getAllBuildings() { return Array.from(this.buildings.values()); }

    getBuildingCounts() {
        return { castles: this.castles.length, towers: this.towers.length, houses: this.houses.length, farms: this.farms.length, walls: this.walls.length, mills: this.mills.length, total: this.buildings.size };
    }

    getBuildingLimits() {
        const counts = this.getBuildingCounts();
        return {
            castle: 1 + Math.floor(counts.houses / 12),
            tower: Math.floor(counts.houses / 3),
            house: Number.MAX_SAFE_INTEGER,
            farm: Number.MAX_SAFE_INTEGER
        };
    }

    getTotalPopulationSupport() {
        let total = 0;
        this.castles.forEach(c => { total += c.getPopulationSupport(); });
        this.houses.forEach(h => { total += h.getPopulationSupport(); });
        return Math.min(total, 200);
    }

    getPopulationLimit() { return this.getTotalPopulationSupport(); }

    canBuildType(type) {
        const counts = this.getBuildingCounts(), limits = this.getBuildingLimits();
        switch (type) {
            case 'castle': return counts.castles < limits.castle;
            case 'tower': return counts.towers < limits.tower;
            case 'house': return true;
            case 'farm': return true;
            default: return false;
        }
    }
}
