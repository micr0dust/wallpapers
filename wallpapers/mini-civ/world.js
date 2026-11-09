// 世界管理器 —— 渲染、地形、日夜、AI 建造策略、主更新迴圈

// 地面磨損：村民走過的路徑會慢慢變成泥土小徑；建築周圍有夯土廣場
class PathWear {
    constructor(scene, size) {
        this.size = size; this.res = 2; this.n = size * this.res;
        this.data = new Float32Array(this.n * this.n);
        this.pixels = new Uint8Array(this.n * this.n * 4);
        const c = Util.color(0x8b6a44);
        // 貼圖是 sRGB 編碼，直接寫 sRGB 值
        this.rgb = [0x8b, 0x6a, 0x44];
        for (let i = 0; i < this.n * this.n; i++) { this.pixels[i * 4] = this.rgb[0]; this.pixels[i * 4 + 1] = this.rgb[1]; this.pixels[i * 4 + 2] = this.rgb[2]; }
        this.tex = new THREE.DataTexture(this.pixels, this.n, this.n, THREE.RGBAFormat);
        this.tex.encoding = THREE.sRGBEncoding;
        this.tex.magFilter = THREE.LinearFilter; this.tex.minFilter = THREE.LinearFilter;
        this.tex.generateMipmaps = false; this.tex.needsUpdate = true;
        const mat = new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const SEG = 100, geo = new THREE.PlaneGeometry(size, size, SEG, SEG).rotateX(-Math.PI / 2);
        const T = window.worldInstance && window.worldInstance.terrain;
        if (T) { const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, T.height(pa.getX(i), pa.getZ(i)) + 0.05); }
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.y = 0.0; this.mesh.receiveShadow = true; this.mesh.renderOrder = 1;
        scene.add(this.mesh);
        this.dirty = false; this.timer = 0;
    }
    idx(wx, wz) {
        const col = Math.floor((wx + this.size / 2) * this.res), row = Math.floor((this.size / 2 - wz) * this.res);
        if (col < 1 || row < 1 || col >= this.n - 1 || row >= this.n - 1) return -1;
        return row * this.n + col;
    }
    step(wx, wz) {
        const i = this.idx(wx, wz);
        if (i < 0) return;
        const T = window.worldInstance && window.worldInstance.terrain;
        if (T && T.height(wx, wz) < T.wl + 0.1) return;     // 水中不磨損
        const d = this.data, n = this.n;
        d[i] = Math.min(1, d[i] + 0.035);
        for (const o of [1, -1, n, -n]) d[i + o] = Math.min(1, d[i + o] + 0.015);
        this.dirty = true;
    }
    stampRect(gx, gy, w, h, strength, margin) {
        const ws = this.size / 2;
        const x0 = gx - ws - margin, x1 = gx - ws + w + margin, z0 = gy - ws - margin, z1 = gy - ws + h + margin;
        for (let wz = z0; wz < z1; wz += 1 / this.res) for (let wx = x0; wx < x1; wx += 1 / this.res) {
            const i = this.idx(wx, wz); if (i < 0) continue;
            const ex = Math.min(wx - x0, x1 - wx) / (margin + 0.001), ez = Math.min(wz - z0, z1 - wz) / (margin + 0.001);
            const edge = Util.clamp(Math.min(ex, ez), 0, 1);
            const v = strength * (0.55 + 0.45 * edge) * (0.8 + 0.2 * Util.noise2(wx * 1.7, wz * 1.7));
            if (v > this.data[i]) this.data[i] = v;
        }
        this.dirty = true;
    }
    update(dt) {
        this.timer += dt;
        if (this.timer < 1.5) return;
        const decayStep = this.timer * 0.0012; this.timer = 0;
        const d = this.data, p = this.pixels;
        for (let i = 0; i < d.length; i++) {
            if (d[i] > 0) { d[i] = Math.max(0, d[i] - decayStep * (d[i] > 0.7 ? 0.0 : 1)); }
            p[i * 4 + 3] = Math.min(235, Math.pow(d[i], 0.8) * 235);
        }
        this.tex.needsUpdate = true;
    }
}

class World {
    constructor() {
        this.scene = null; this.camera = null; this.renderer = null; this.cameraController = null;
        this.grid = null; this.buildingManager = null; this.villagerManager = null; this.treeManager = null;
        this.sky = null; this.fx = null; this.pathWear = null;
        this.isPaused = false;
        this.gameSpeed = Config.get('gameSpeed');
        this.simTime = 0;          // 遊戲毫秒
        this.lastNow = null;
        this.startHour = 7;
        this.aiBuilder = { lastBuildAttempt: 0, buildInterval: 1000 };
        this.lastSpawnCheck = 0;
        this.cityCenter = new THREE.Vector3();
        this.cityExtent = 14;
        this.lastCityScan = -99999;
        this.hudTimer = 0;
        this.skyState = null;
        window.worldInstance = this;
    }

    init(canvas) {
        this.setupRenderer(canvas);
        this.setupScene();
        this.setupCamera();
        this.setupSky();
        this.terrain = new Terrain();
        this.createGround();
        this.setupGameSystems();
        this.setupInitialBuildings();
        this.applyAllConfig();
        Config.onChange((k, v) => this.onConfig(k, v));
        // 先把時間推進一次，讓第一幀就有正確的光照
        this.updateTime(0);
        this.sky.update(0, this.currentHour(), this.cityCenter, this.camera.position);
    }

    // ---------- 渲染器 / 場景 ----------
    setupRenderer(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.applyPixelRatio();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    applyPixelRatio() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.renderer.setPixelRatio(Math.max(0.4, dpr * Config.get('renderScale')));
        if (this.fx) this.fx.setViewport(window.innerHeight * this.renderer.getPixelRatio(), Config.get('cameraFov'));
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xbcdff2, 90, 380);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(Config.get('cameraFov'), window.innerWidth / window.innerHeight, 0.5, 1200);
        this.camera.position.set(25, 25, 25);
        this.cameraController = new CameraController(this.camera, this.scene, this.renderer);
    }

    setupSky() {
        this.sky = new SkySystem(this.scene, this.camera, this.renderer);
        this.fx = new Effects(this.scene, this.renderer);
        this.fx.setViewport(window.innerHeight * this.renderer.getPixelRatio(), Config.get('cameraFov'));
    }

    // ---------- 地形：高度由 Terrain 提供；頂點色（草地／沙岸／岩石／雪）+ 草地噪點貼圖；河流水面為獨立網格 ----------
    terrainHeight(x, z) { return this.terrain.height(x, z); }

    createGround() {
        const T = this.terrain;
        // 非等距網格：中央 ±110 每格 1 單位，往外逐漸變疏（遠景）
        const half = [];
        for (let v = 0; v <= 110; v += 1) half.push(v);
        { let v = 110, st = 2; while (v < 450) { v = Math.min(450, v + st); half.push(v); st = Math.min(st * 1.3, 40); } }
        const axis = []; for (let i = half.length - 1; i > 0; i--) axis.push(-half[i]); for (const v of half) axis.push(v);
        const NA = axis.length, n = NA * NA;
        const posA = new Float32Array(n * 3), uvA = new Float32Array(n * 2), col = new Float32Array(n * 3), hts = new Float32Array(n);
        const lightG = Util.color(0x86b64f), midG = Util.color(0x62a042), darkG = Util.color(0x3f7f3d), hillG = Util.color(0x3a6f40), rock = Util.color(0x8b8a80), meadow = Util.color(0x9cc45a);
        const sand = Util.color(0xcdbf8c), mud = Util.color(0x5f5c47), cliffC = Util.color(0x7d7b72), snow = Util.color(0xf1f4f7), alpine = Util.color(0x9aa079);
        const c = new THREE.Color();
        for (let jz = 0; jz < NA; jz++) for (let ix = 0; ix < NA; ix++) {
            const i = jz * NA + ix, x = axis[ix], z = axis[jz];
            const h = T.height(x, z); hts[i] = h;
            posA[i * 3] = x; posA[i * 3 + 1] = h; posA[i * 3 + 2] = z;
            uvA[i * 2] = x / 14; uvA[i * 2 + 1] = z / 14;
            const sl = T.slope(x, z);
            const patch = Util.fbm(x * 0.045 + 7, z * 0.045 + 3, 3);
            c.copy(midG).lerp(lightG, Util.smoothstep(0.45, 0.7, patch)).lerp(darkG, Util.smoothstep(0.5, 0.25, patch) * 0.8);
            c.lerp(meadow, Util.smoothstep(0.55, 0.75, Util.fbm(x * 0.09 - 20, z * 0.09 + 11, 2)) * 0.35);
            const hh = Util.smoothstep(2, 14, h);
            c.lerp(hillG, hh * 0.8).lerp(alpine, Util.smoothstep(8, 15, h) * 0.7);
            c.lerp(cliffC, Util.smoothstep(0.42, 0.85, sl) * 0.95);
            c.lerp(rock, Util.smoothstep(20, 40, h) * 0.8);
            c.lerp(snow, Util.smoothstep(17.5, 21, h + (Util.noise2(x * 0.2, z * 0.2) - 0.5) * 3) * (1 - Util.smoothstep(0.5, 1.0, sl) * 0.7));
            // 河岸：沙灘與河床
            c.lerp(sand, (1 - Util.smoothstep(T.wl + 0.03, T.wl + 0.2, h)) * 0.9);
            c.lerp(mud, Util.smoothstep(T.wl - 0.05, T.wl - 0.5, h));
            const j = 1 + (Util.hash2(i, 7) - 0.5) * 0.05;
            col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j;
        }
        const idx = new Uint32Array((NA - 1) * (NA - 1) * 6); let k = 0;
        for (let jz = 0; jz < NA - 1; jz++) for (let ix = 0; ix < NA - 1; ix++) {
            const a = jz * NA + ix, b = a + 1, d = a + NA, e = d + 1;
            idx[k++] = a; idx[k++] = d; idx[k++] = b; idx[k++] = b; idx[k++] = d; idx[k++] = e;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
        geo.computeVertexNormals();
        const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
        const tex = this.makeGrassTexture();
        if (tex) { mat.map = tex; }
        this.ground = new THREE.Mesh(geo, mat);
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        this.createWater(axis, hts, NA);
        this.pathWear = new PathWear(this.scene, 200);
    }

    // 河流水面：只在低於水面的格子附近生成面片；深度做成頂點屬性（深色 / 淺色 / 透明度）
    createWater(axis, hts, NA) {
        const T = this.terrain, wl = T.wl;
        const pos = [], dep = [], idx = [], map = new Map();
        const vid = (ix, jz) => {
            const key = jz * NA + ix;
            let v = map.get(key);
            if (v === undefined) { v = pos.length / 3; map.set(key, v); pos.push(axis[ix], wl, axis[jz]); dep.push(Math.max(0, wl - hts[key])); }
            return v;
        };
        for (let jz = 0; jz < NA - 1; jz++) for (let ix = 0; ix < NA - 1; ix++) {
            if (Math.abs(axis[ix]) > 230 || Math.abs(axis[jz]) > 230) continue;
            const a = jz * NA + ix;
            if (hts[a] > wl + 0.3 && hts[a + 1] > wl + 0.3 && hts[a + NA] > wl + 0.3 && hts[a + NA + 1] > wl + 0.3) continue;
            const A = vid(ix, jz), B = vid(ix + 1, jz), D = vid(ix, jz + 1), E = vid(ix + 1, jz + 1);
            idx.push(A, D, B, B, D, E);
        }
        if (!idx.length) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
        geo.setIndex(idx);
        const fog = this.scene.fog;
        this.waterMat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: {
                uTime: { value: 0 }, uDay: { value: 1 },
                uDeep: { value: Util.color(0x1f6f8f) }, uShallow: { value: Util.color(0x5fb8b0) }, uSky: { value: new THREE.Color(0xbcdff2) },
                uFogColor: { value: fog.color.clone() }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far }
            },
            vertexShader: `
                attribute float aDepth; varying float vDepth; varying vec3 vW; varying float vView;
                void main(){ vDepth=aDepth; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vView=-mv.z; gl_Position=projectionMatrix*mv; }`,
            fragmentShader: `
                uniform float uTime, uDay, uFogNear, uFogFar; uniform vec3 uDeep, uShallow, uSky, uFogColor;
                varying float vDepth; varying vec3 vW; varying float vView;
                void main(){
                    vec2 p = vW.xz;
                    float r = sin(p.x*1.3+uTime*1.1)*sin(p.y*1.7-uTime*0.9) + sin((p.x*0.7-p.y*1.1)+uTime*0.6) ;
                    float flow = sin((p.x+p.y)*0.55 - uTime*0.8 + sin(p.y*0.8)*1.5);
                    float d = smoothstep(0.0, 0.85, vDepth);
                    vec3 col = mix(uShallow, uDeep, d);
                    col += (r*0.035 + flow*0.02);
                    vec3 V = normalize(cameraPosition - vW);
                    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
                    col = mix(col, uSky, fres*0.55);
                    float sp = pow(max(0.0, r*0.5+0.5), 40.0) * 0.18;
                    col += sp * uDay;
                    col *= mix(0.2, 1.0, uDay);
                    float edge = smoothstep(0.0, 0.14, vDepth);
                    float a = mix(0.28, 0.93, smoothstep(0.0, 0.5, vDepth)) * (0.55+0.45*edge);
                    float f = smoothstep(uFogNear, uFogFar, vView);
                    col = mix(col, uFogColor, f);
                    gl_FragColor = vec4(col, a);
                    #include <encodings_fragment>
                }`
        });
        this.water = new THREE.Mesh(geo, this.waterMat);
        this.water.renderOrder = 2;
        this.scene.add(this.water);
    }

    makeGrassTexture() {
        const cv = Util.canvas(256, 256);
        if (!cv) return null;
        const { ctx, canvas } = cv;
        ctx.fillStyle = '#e4e4e4'; ctx.fillRect(0, 0, 256, 256);
        const wrap = (fn) => { for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) fn(ox, oy); };
        // 大塊明暗斑
        for (let i = 0; i < 70; i++) {
            const x = Math.random() * 256, y = Math.random() * 256, r = 14 + Math.random() * 34, l = 205 + Math.random() * 50;
            wrap((ox, oy) => { const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, `rgba(${l},${l},${l},0.5)`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); });
        }
        // 草葉短筆觸
        for (let i = 0; i < 2600; i++) {
            const x = Math.random() * 256, y = Math.random() * 256, l = 170 + Math.random() * 85;
            ctx.strokeStyle = `rgba(${l},${l},${l},0.55)`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 4); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.encoding = THREE.sRGBEncoding;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1);
        return tex;
    }

    // ---------- 遊戲系統 ----------
    setupGameSystems() {
        this.grid = new Grid(200);
        this.grid.setTerrain(this.terrain, 97, 97);
        this.buildingManager = new BuildingManager(this.grid, this.scene);
        this.wallPlanner = new WallPlanner(this);
        this.villagerManager = new VillagerManager(this.grid, this.scene, this.buildingManager);
        this.treeManager = new TreeManager(this.grid, this.scene);
        this.treeManager.fx = this.fx;
        this.buildingManager.setTreeManager(this.treeManager);
    }

    setupInitialBuildings() {
        const cx = 100, cy = 100;
        this.treeManager.clearTreesInArea(cx, cy, 9);
        let result = this.buildingManager.buildCastle(cx - 3, cy - 3);
        for (let r = 15; !result.success && r <= 50; r += 10) {
            this.treeManager.clearTreesInArea(cx, cy, r);
            result = this.buildingManager.buildCastle(cx - 3, cy - 3);
        }
        if (!result.success) return;
        this.villagerManager.firstCastle = result.building;
        this.villagerManager.firstCastleBeingBuilt = true;
        this.ensureTreesAroundCastle(cx, cy);
        const p = result.building.getWorldPosition();
        for (let i = 0; i < 5; i++) {
            this.villagerManager.createVillager(Math.floor(p.x + 3 + (Math.random() - 0.5) * 10), Math.floor(p.z + 3 + (Math.random() - 0.5) * 10));
        }
        this.villagerManager.startFirstCastleConstruction();
        this.cityCenter.set(0, 0, 0);
    }

    // 確保城堡周圍 15–45 格內有足夠的樹木（初期木材來源）
    ensureTreesAroundCastle(cx, cy) {
        let count = 0;
        for (let x = cx - 45; x <= cx + 45; x++) for (let y = cy - 45; y <= cy + 45; y++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d >= 14 && d <= 45 && this.treeManager.byCell.has(`${x},${y}`)) count++;
        }
        let need = 140 - count, tries = 0;
        while (need > 0 && tries++ < 4000) {
            const a = Math.random() * 6.283, r = 14 + Math.random() * 30;
            const px = Math.floor(cx + Math.cos(a) * r), py = Math.floor(cy + Math.sin(a) * r);
            if (this.treeManager.addTreeAt(px, py)) need--;
        }
    }

    // ---------- 時間 ----------
    currentHour() {
        const mode = Config.get('timeMode');
        if (mode === 'day') return 12.5;
        if (mode === 'sunset') return 18.4;
        if (mode === 'night') return 23.2;
        return this.gameHour;
    }

    updateTime(simDtMs) {
        const dayMs = Math.max(20, Config.get('dayLength')) * 1000;
        this.simTime += simDtMs;
        window.simTimeMs = this.simTime;
        this.dayProgress = (this.startHour / 24 + this.simTime / dayMs);
        this.gameHour = (this.dayProgress % 1) * 24;
        this.dayNumber = Math.floor(this.dayProgress - this.startHour / 24) + 1;
        const h = this.gameHour;
        const isNight = h >= 20 || h < 4.5;
        window.gameTime = { currentHour: h, timeOfDay: h / 24, isNight, day: this.dayNumber };
        return isNight;
    }

    // ---------- 主更新（nowMs：時間戳記）----------
    update(nowMs) {
        if (this.lastNow === null) this.lastNow = nowMs;
        let dtMs = Math.min(100, Math.max(0, nowMs - this.lastNow));
        this.lastNow = nowMs;
        this.step(dtMs);
    }

    step(dtMs) {
        const dt = dtMs / 1000;
        if (!this.isPaused) {
            const simDt = dtMs * this.gameSpeed;
            const isNight = this.updateTime(simDt);
            this.scanCity();
            const S = this.sky.update(dt * this.gameSpeed, this.currentHour(), this.cityCenter, this.camera.position);
            this.skyState = S;
            BM.setNight(S.night);
            if (this.waterMat) { const u = this.waterMat.uniforms; u.uTime.value += dt; u.uDay.value = S.day; u.uFogColor.value.copy(S.fogColor); u.uSky.value.copy(S.fogColor); }
            this.cameraController.update(dt, this.cityCenter, this.cityExtent);

            this.buildingManager.update(this.simTime, isNight);
            this.villagerManager.update(this.simTime, this.treeManager, isNight, 1);
            this.treeManager.update(dt * this.gameSpeed, this.simTime);
            this.updateAIBuilder(this.simTime, isNight);
            if (this.wallPlanner) this.wallPlanner.update(this.simTime, isNight);
            this.updateKeeps(this.simTime, isNight);
            this.updateMill(this.simTime, isNight);
            this.handleVillagerSpawning(this.simTime);

            const vdt = dt * Math.min(this.gameSpeed, 3);
            this.buildingManager.animate(vdt, S, this.fx);
            this.villagerManager.animate(vdt, this.simTime);
            this.fx.update(dt, S.night, S.light, this.cityCenter);
            this.pathWear.update(dt);
        }
        this.hudTimer += dt;
        if (this.hudTimer > 0.25) { this.hudTimer = 0; this.updateHud(); }
    }

    // 估算城市中心與範圍（供相機與陰影使用）
    scanCity() {
        if (this.simTime - this.lastCityScan < 2000) return;
        this.lastCityScan = this.simTime;
        let sx = 0, sz = 0, wsum = 0;
        const list = [];
        for (const b of this.buildingManager.buildings.values()) {
            if (b.type === 'farm' || !b.group) continue;
            const c = b.getCenterWorld();
            if (b.isWall) { if (b.type === 'walltower') list.push(c); continue; }
            const w = b.type === 'castle' ? 3 : 1;
            sx += c.x * w; sz += c.z * w; wsum += w; list.push(c);
        }
        if (!wsum) return;
        const cx = sx / wsum, cz = sz / wsum;
        let ext = 8;
        for (const c of list) ext = Math.max(ext, Math.hypot(c.x - cx, c.z - cz) + 6);
        this.cityCenter.set(cx, 0, cz);
        this.cityExtent = ext;
        const half = Util.clamp(40 + ext * 1.25, 55, 120);
        if (Math.abs(half - this.sky.shadowHalf) > 6) this.sky.setShadowExtent(half);
    }

    // ---------- 村民生產 ----------
    handleVillagerSpawning(now) {
        if (now - this.lastSpawnCheck < 500) return;
        this.lastSpawnCheck = now;
        const maxPop = this.buildingManager.getTotalPopulationSupport();
        if (this.villagerManager.getVillagerCount() >= maxPop) return;
        this.buildingManager.castles.forEach(castle => {
            if (!castle.isComplete) return;
            if (now - castle.lastVillagerSpawn >= castle.villagerSpawnInterval) {
                castle.lastVillagerSpawn = now;
                const sp = this.findSpawnPositionNearCastle(castle);
                if (sp) {
                    const v = this.villagerManager.createVillager(sp.x, sp.z);
                    if (this.fx && v) this.fx.sparkle(sp.x + 0.5, 0.8, sp.z + 0.5);
                }
            }
        });
    }

    findSpawnPositionNearCastle(castle) {
        // 從城門前方開始找空位
        const c = castle.getCenterWorld();
        for (let r = 4; r <= 9; r++) {
            for (let a = 0; a < 8; a++) {
                const ang = castle.facing + Math.PI / 2 * 0 + a * Math.PI / 4;
                const x = Math.floor(c.x + Math.sin(ang) * r), z = Math.floor(c.z + Math.cos(ang) * r);
                const g = this.grid.worldToGrid(x, z);
                if (this.grid.isValidPosition(g.x, g.y) && !this.grid.buildings.has(`${g.x},${g.y}`)) return { x, z };
            }
        }
        return null;
    }

    // ---------- 城區分級 ----------
    // 到最近（已完工）城堡中心的距離（格）；之後地形可在此加入「路徑距離」
    districtDist(gx, gy) {
        let best = Infinity;
        for (const c of this.buildingManager.castles) {
            if (!c.isComplete) continue;
            const d = Math.hypot(c.x + 3 - gx, c.y + 3 - gy);
            if (d < best) best = d;
        }
        return best;
    }
    // 0 茅草 / 1 木構 / 2 石造：取「城市成熟度」與「離城堡距離」兩者較低者
    districtTier(gx, gy) {
        const pop = this.villagerManager ? this.villagerManager.getVillagerCount() : 0;
        const maturity = pop < 14 ? 0 : (pop < 34 ? 1 : 2);
        const d = this.districtDist(gx, gy);
        const byDist = d < 17 ? 2 : (d < 32 ? 1 : 0);
        return Math.min(maturity, byDist);
    }

    _millSpacing(x, y) {
        for (const fp of this.grid.footprints.values()) {
            const m = fp.type.indexOf('wall') === 0 ? 1 : 3;
            if (fp.x - m < x + 5 && fp.x + fp.w + m > x && fp.y - m < y + 5 && fp.y + fp.h + m > y) {
                if (!fp.cells) return false;
                for (const c of fp.cells) if (c.x - m < x + 5 && c.x + 1 + m > x && c.y - m < y + 5 && c.y + 1 + m > y) return false;
            }
        }
        return true;
    }

    // 河邊水車磨坊：人口夠了、有河、木材夠就蓋在離城堡最近的河岸，水車朝向河面
    updateMill(now, isNight) {
        if (isNight || now - (this._millT || 0) < 4000) return;
        this._millT = now;
        const bm = this.buildingManager, vm = this.villagerManager, g = this.grid;
        if (!g.terr) return;
        const pop = vm.getVillagerCount();
        const want = pop >= 140 ? 2 : (pop >= 40 ? 1 : 0);

        if (bm.mills.length >= want || bm.mills.some(m => m.isUnderConstruction) || vm.getWoodInventory() < 90) return;
        const castles = bm.castles.filter(c => c.isComplete);
        if (!castles.length) return;
        const ref = castles[0], rx = ref.x + 3, ry = ref.y + 3, S = g.size;
        let best = null, bd = 1e9;
        for (let y = Math.max(0, ry - 52); y < Math.min(S, ry + 52); y++) for (let x = Math.max(0, rx - 52); x < Math.min(S, rx + 52); x++) {
            if (!g.terr.water[y * S + x]) continue;
            for (let k = 0; k < 16; k++) for (const off of [3.8, 4.6, 5.4]) {
                const a = k * Math.PI / 8, dx = Math.cos(a), dy = Math.sin(a);
                const gx = Math.round(x - dx * off - 2), gy = Math.round(y - dy * off - 2);
                const d = Math.hypot(gx + 2.5 - rx, gy + 2.5 - ry);
                if (d < 12 || d > 52 || d >= bd) continue;
                if (!g.canBuildIgnoreTrees(gx, gy, 5, 5, true)) continue; if (!this._millSpacing(gx, gy)) continue;
                bd = d; best = { x: gx, y: gy, facing: Math.atan2(-dy, dx) };
            }
        }
        if (!best) { this._millT = now + 30000; return; }
        const r = bm.buildMill(best.x, best.y, best.facing);
        if (r.success) vm.consumeWood(90);
    }

    // 城堡等級：隨人口成熟度升高（越成熟越高聳）
    castleLevel() {
        const pop = this.villagerManager ? this.villagerManager.getVillagerCount() : 0;
        return pop < 30 ? 0 : (pop < 70 ? 1 : 2);
    }

    updateKeeps(now, isNight) {
        if (!this.keeps) this.keeps = new Map();
        for (const c of this.buildingManager.castles) {
            if (!this.keeps.has(c.id)) this.keeps.set(c.id, new WallPlanner(this, { keepOf: c }));
        }
        for (const k of this.keeps.values()) k.update(now, isNight);
    }

    // ---------- AI 建造策略 ----------
    updateAIBuilder(now, isNight) {
        if (isNight) return;
        if (now - this.aiBuilder.lastBuildAttempt < this.aiBuilder.buildInterval) return;
        this.aiBuilder.lastBuildAttempt = now;
        const bm = this.buildingManager, vm = this.villagerManager;
        if (!bm.castles.some(c => c.isComplete)) return;

        const wood = vm.getWoodInventory(), pop = vm.getVillagerCount(), cap = bm.getTotalPopulationSupport();
        const counts = bm.getBuildingCounts();
        let sites = 0;
        for (const b of bm.buildings.values()) if (b.isUnderConstruction && !b.isWall) sites++;
        if (sites >= Math.min(5, 1 + Math.floor(pop / 10))) return;

        const farmsDesired = Math.min(12, 2 + Math.floor(pop / 8));
        const wantHouse = pop >= cap - 2 && cap < 200;
        const wantTower = counts.towers < Math.floor(counts.houses / 3);
        const wantCastle = counts.castles < Math.min(6, 1 + Math.floor(counts.houses / 10)) && cap < 200;

        if (counts.farms < Math.min(2, farmsDesired) && wood >= 3 && this.aiBuildFarm()) return;
        if (wantHouse && wood >= 10 && this.aiBuildHouse()) return;
        if (wantCastle) { if (wood >= 100) { if (this.aiBuildCastle()) return; } else return; }
        if (wantTower && wood >= 10 && this.aiBuildTower()) return;
        if (counts.farms < farmsDesired && wood >= 3 && this.aiBuildFarm()) return;
    }

    aiBuildCastle() { return this._aiBuild(6, 'castle', 100); }
    aiBuildTower() { return this._aiBuild(2, 'tower', 10); }
    aiBuildHouse() { return this._aiBuild(4, 'house', 10); }
    aiBuildFarm() {
        const ok = this._aiBuild(6, 'farm', 3);
        if (ok) this.villagerManager.reassignVillagersToFarms();
        return ok;
    }

    _aiBuild(size, kind, cost) {
        const pos = this.findBuildPosition(size, kind);
        if (!pos) { if (kind !== 'farm' && this.wallPlanner) this.wallPlanner.requestExpand(); return false; }
        const bm = this.buildingManager;
        const r = kind === 'castle' ? bm.buildCastle(pos.x, pos.y) : kind === 'tower' ? bm.buildTower(pos.x, pos.y) :
            kind === 'house' ? bm.buildHouse(pos.x, pos.y) : bm.buildFarm(pos.x, pos.y);
        if (r.success) {
            this.villagerManager.consumeWood(cost);
            if (kind === 'castle' && this.wallPlanner) this.wallPlanner.requestExpand();
            return true;
        }
        return false;
    }

    _wallOk(kind, x, y, size) {
        const wp = this.wallPlanner;
        if (!wp || !wp.hasWall()) return true;
        if (kind === 'castle') return !wp.next;      // 新城堡可蓋在牆外（之後由擴建的城牆包進來）；施工中的新牆範圍已定，先等它完工
        return kind === 'farm' ? wp.outsideForFarm(x, y, size) : wp.inside(x, y, size);
    }

    // 在某座城堡周圍由內而外找建造位置
    findBuildPosition(size, kind) {
        const castles = this.buildingManager.castles.filter(c => c.isComplete);
        if (!castles.length) return null;
        const counts = this.buildingManager.getBuildingCounts();
        let ref;
        if (kind === 'castle') ref = castles[castles.length - 1];
        else ref = Math.random() < 0.6 ? castles[castles.length - 1] : castles[Math.floor(Math.random() * castles.length)];
        const c = { x: ref.x + 3, y: ref.y + 3 };
        let minR = 8, maxR = 48;
        if (kind === 'castle') { minR = 15; maxR = 55; }
        else if (kind === 'tower') { minR = 9; }
        else if (kind === 'farm') { minR = counts.houses < 2 ? 8 : Math.min(30, 11 + Math.floor(counts.houses * 0.5)); maxR = 46; }
        const g = this.grid, isFarm = kind === 'farm';
        const wp = this.wallPlanner, cr = wp && wp.constraint();
        if (cr) {
            // 有城牆：蓋在牆內（農田在牆外），搜尋範圍隨牆放大
            const half = 55;
            if (kind === 'farm') { minR = 6; maxR = half + 30; } else maxR = Math.max(maxR, half + 4);
            if (kind !== 'farm') minR = Math.min(minR, 8);
        }
        for (let r = minR; r <= maxR; r++) {
            const steps = Math.max(36, Math.round(r * 2.4));
            const start = Math.random() * Math.PI * 2;
            for (let i = 0; i < steps; i++) {
                const a = start + i * Math.PI * 2 / steps;
                const x = Math.floor(c.x + Math.cos(a) * r - size / 2 + 0.5), y = Math.floor(c.y + Math.sin(a) * r - size / 2 + 0.5);
                if (x < 2 || y < 2 || x >= g.size - size - 2 || y >= g.size - size - 2) continue;
                if (g.canBuildIgnoreTrees(x, y, size, size) && g.checkBuildingCondition(x, y, size, size) && g.checkBuildingSpacing(x, y, size, size, isFarm) && this._wallOk(kind, x, y, size) && (kind !== 'castle' || !g.hasBuildingNear(x, y, size, size, 9))) return { x, y };
            }
        }
        return null;
    }

    // ---------- 設定 ----------
    applyAllConfig() {
        for (const k of Object.keys(Config.values)) this.onConfig(k, Config.values[k]);
    }

    onConfig(key, value) {
        switch (key) {
            case 'gameSpeed': this.gameSpeed = Util.clamp(value, 0.1, 8); break;
            case 'fogEnabled':
                if (this.scene.fog) { this.scene.fog.near = value ? 90 : 1e5; this.scene.fog.far = value ? 380 : 2e5; }
                break;
            case 'autoPlay': this.isPaused = !value; value ? this.cameraController.resume() : this.cameraController.pause(); break;
            case 'shadowQuality': this.sky.setShadowQuality(value); if (this.treeManager) this.treeManager.setShadows(value > 0); break;
            case 'renderScale': this.applyPixelRatio(); this.handleResize(); break;
            case 'treeDensity': if (this.treeManager) this.treeManager.setTargetTreeCount(Math.round(this.treeManager.totalTrees * Util.clamp(value, 0.2, 1.6))); break;
            case 'clouds': this.sky.setCloudsVisible(value); break;
            case 'particles': this.fx.setEnabled(value); break;
            case 'cameraFov': this.fx.setViewport(window.innerHeight * this.renderer.getPixelRatio(), value); break;
            case 'showHud': { const el = document.getElementById('hud'); if (el) el.style.display = value ? 'block' : 'none'; break; }
        }
    }

    updateHud() {
        if (!Config.get('showHud')) return;
        const el = document.getElementById('hud');
        if (!el) return;
        const h = this.gameHour, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
        const b = this.buildingManager.getBuildingCounts();
        const icon = h >= 5.5 && h < 19 ? '☀' : '☾';
        el.innerHTML = `<div class="t">${icon} 第 ${this.dayNumber} 天 · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</div>` +
            `<div>居民 ${this.villagerManager.getVillagerCount()} / ${this.buildingManager.getTotalPopulationSupport()}</div>` +
            `<div>木材 ${this.villagerManager.getWoodInventory()}</div>` +
            `<div>城堡 ${b.castles} · 塔 ${b.towers} · 房 ${b.houses} · 田 ${b.farms}</div>`;
    }

    // ---------- 其他 ----------
    render() { this.renderer.render(this.scene, this.camera); }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.fx) this.fx.setViewport(window.innerHeight * this.renderer.getPixelRatio(), this.camera.fov);
    }

    getGameState() {
        const h = this.gameHour || 0, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
        return {
            woodInventory: this.villagerManager.getWoodInventory(),
            population: this.villagerManager.getVillagerCount(),
            villagers: this.villagerManager.getVillagerCount(),
            farmWorkers: this.villagerManager.getFarmWorkerCount(),
            timeOfDay: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
            day: this.dayNumber,
            buildings: { castles: this.buildingManager.castles.length, towers: this.buildingManager.towers.length, houses: this.buildingManager.houses.length, farms: this.buildingManager.farms.length },
            trees: { active: this.treeManager.getActiveTreeCount(), destroyed: this.treeManager.getDestroyedTreeCount() },
            isPaused: this.isPaused, gameSpeed: this.gameSpeed
        };
    }

    togglePause() { this.isPaused = !this.isPaused; this.isPaused ? this.cameraController.pause() : this.cameraController.resume(); return this.isPaused; }
    setGameSpeed(s) { this.gameSpeed = Util.clamp(s, 0.1, 8); return this.gameSpeed; }

    // 快轉（除錯/截圖用）：不渲染，僅推進模擬
    fastForward(simSeconds) {
        const steps = Math.floor(simSeconds * 1000 / 50);
        const saved = this.gameSpeed; this.gameSpeed = 1;
        for (let i = 0; i < steps; i++) this.step(50);
        this.gameSpeed = saved;
    }

    destroy() {
        if (this.treeManager) this.treeManager.destroyAll();
        if (this.renderer) this.renderer.dispose();
    }
}
