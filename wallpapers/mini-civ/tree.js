// 樹木 —— InstancedMesh 森林（4 個 draw call 取代原本的 3200 個），含風吹擺動、砍伐搖晃、倒下、重新長大
const TreeVisual = {
    timeUniform: { value: 0 },
    cache: null,

    // 建立各樹種的幾何（頂點色）
    build() {
        if (this.cache) return this.cache;
        const G = Geo;
        const oak = () => {
            const parts = [G.cyl(0.2, 0.34, 2.4, 7, 0x6a4a30, { y: 1.2 })];
            const greens = [0x3f8f3a, 0x4a9b40, 0x368232];
            parts.push(G.blob(1.75, 1, Util.pick(greens), { y: 3.7, sy: 0.9 }));
            parts.push(G.blob(1.25, 1, Util.pick(greens), { x: 1.0, y: 3.1, z: 0.45, sy: 0.85 }));
            parts.push(G.blob(1.2, 1, Util.pick(greens), { x: -0.9, y: 3.2, z: -0.5, sy: 0.85 }));
            parts.push(G.blob(1.0, 1, Util.pick(greens), { x: 0.1, y: 4.55, z: -0.2 }));
            return G.shade(G.merge(parts), 1.8, 4.2, 0.62);
        };
        const pine = () => {
            const parts = [G.cyl(0.16, 0.26, 1.6, 6, 0x5b3f2a, { y: 0.8 })];
            const cols = [0x2d6a47, 0x2a6140, 0x327450];
            [[1.55, 2.1, 1.9], [1.25, 1.9, 3.0], [0.95, 1.7, 4.0], [0.6, 1.5, 4.95]].forEach(([r, h, y], i) => {
                parts.push(G.cone(r, h, 8, cols[i % 3], { y, flat: true }));
            });
            return G.shade(G.merge(parts), 1.0, 4.4, 0.6);
        };
        const birch = () => {
            const parts = [G.cyl(0.13, 0.2, 2.8, 6, 0xdcd6c6, { y: 1.4 })];
            parts.push(G.blob(1.15, 1, 0x86b94a, { y: 3.5, sy: 1.1 }));
            parts.push(G.blob(0.85, 1, 0x93c452, { x: 0.55, y: 2.9, z: 0.3 }));
            parts.push(G.blob(0.8, 1, 0x7fb044, { x: -0.5, y: 4.2, z: -0.25 }));
            return G.shade(G.merge(parts), 1.8, 4.2, 0.68);
        };
        const maple = () => {
            const parts = [G.cyl(0.16, 0.26, 2.2, 6, 0x66452c, { y: 1.1 })];
            const cs = [0xd9822b, 0xc9552a, 0xe0a83a];
            parts.push(G.blob(1.5, 1, Util.pick(cs), { y: 3.3, sy: 0.9 }));
            parts.push(G.blob(1.0, 1, Util.pick(cs), { x: 0.9, y: 2.9, z: 0.4 }));
            parts.push(G.blob(0.95, 1, Util.pick(cs), { x: -0.8, y: 3.0, z: -0.4 }));
            return G.shade(G.merge(parts), 1.6, 4.0, 0.65);
        };
        // 每種樹準備兩個變體，增加多樣性
        this.cache = {
            oak: { geoms: [oak(), oak()], heightHint: 5.3 },
            pine: { geoms: [pine(), pine()], heightHint: 6.0 },
            birch: { geoms: [birch(), birch()], heightHint: 4.8 },
            maple: { geoms: [maple(), maple()], heightHint: 4.6 }
        };
        return this.cache;
    },

    material() {
        const m = new THREE.MeshLambertMaterial({ vertexColors: true });
        m.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = TreeVisual.timeUniform;
            shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 float sw = smoothstep(0.9, 6.0, position.y);
                 float ph = uTime * 1.25 + instanceMatrix[3][0] * 0.11 + instanceMatrix[3][2] * 0.09;
                 transformed.x += (sin(ph) * 0.11 + sin(ph * 2.3 + 1.7) * 0.035) * sw;
                 transformed.z += cos(ph * 0.9 + 0.5) * 0.08 * sw;`);
        };
        m.customProgramCacheKey = () => 'treeSway';
        return m;
    }
};

class Tree {
    constructor(x, y, grid, scene, manager) {
        this.x = x;
        this.y = y;
        this.grid = grid;
        this.scene = scene;
        this.manager = manager;
        this.choppedCount = 0;
        this.maxChops = 5;            // 5 次砍伐後倒下
        this.isDestroyed = false;
        this.respawnTime = 70000;     // 倒下後 70 秒（遊戲時間）重生
        this.destroyedAt = null;
        this.id = `tree_${Tree._seq++}`;
        this.anim = null;             // { type: 'shake'|'fall'|'grow', t, dur, dirX, dirZ }
        this.scaleMul = 1;
        this.visual = null;           // { species, variant, slot }
        this.pickVisual();
        this.create();
    }

    pickVisual() {
        // 以低頻噪聲決定樹種，讓同一片林子樹種相近
        const n = Util.fbm(this.x * 0.045 + 11.7, this.y * 0.045 - 4.3, 2);
        const r = Math.random();
        let species = 'oak';
        if (n > 0.56) species = r < 0.82 ? 'pine' : 'oak';
        else if (n < 0.40) species = r < 0.30 ? 'birch' : (r < 0.40 ? 'maple' : 'oak');
        else species = r < 0.12 ? 'birch' : (r < 0.16 ? 'maple' : (r < 0.30 ? 'pine' : 'oak'));
        this.species = species;
        this.variant = Math.random() < 0.5 ? 0 : 1;
        this.baseScale = Util.rand(0.8, 1.3);
        this.rotY = Math.random() * Math.PI * 2;
        this.tiltX = (Math.random() - 0.5) * 0.08;
        this.tiltZ = (Math.random() - 0.5) * 0.08;
        this.ox = (Math.random() - 0.5) * 0.5;   // 視覺位置微偏移
        this.oz = (Math.random() - 0.5) * 0.5;
        const b = 0.88 + Math.random() * 0.24;
        this.tint = new THREE.Color(b * (0.95 + Math.random() * 0.1), b, b * (0.95 + Math.random() * 0.1));
    }

    create() {
        if (this.isDestroyed) return;
        this.manager.attach(this);
        this.manager.writeInstance(this);
    }

    // 被砍一次；回傳 true 表示樹倒了
    chop() {
        if (this.isDestroyed) return false;
        this.choppedCount++;
        if (this.choppedCount >= this.maxChops) {
            this.destroy(true);
            return true;
        }
        this.anim = { type: 'shake', t: 0, dur: 0.7 };
        this.manager.markAnimating(this);
        if (this.manager.fx) this.manager.fx.chips(this.x - this.grid.size / 2 + 0.5 + this.ox, 1.2, this.y - this.grid.size / 2 + 0.5 + this.oz, 5);
        return false;
    }

    // 銷毀（animated=true 時播放倒下動畫）
    destroy(animated) {
        this.isDestroyed = true;
        this.destroyedAt = simNow();
        this.grid.removeTree(this.x, this.y);
        if (animated && this.visual) {
            const a = Math.random() * Math.PI * 2;
            this.anim = { type: 'fall', t: 0, dur: 1.3, dirX: Math.cos(a), dirZ: Math.sin(a) };
            this.manager.markAnimating(this);
            if (this.manager.fx) this.manager.fx.leaves(this.x - this.grid.size / 2 + 0.5 + this.ox, 3.5, this.y - this.grid.size / 2 + 0.5 + this.oz, 10, this.species);
        } else {
            this.anim = null;
            this.manager.detach(this);
        }
    }

    canRespawn() {
        return this.isDestroyed && this.destroyedAt !== null && (simNow() - this.destroyedAt) >= this.respawnTime;
    }

    respawn() {
        if (!this.canRespawn()) return false;
        if (this.grid.canPlaceTree(this.x, this.y)) {
            this.isDestroyed = false;
            this.choppedCount = 0;
            this.destroyedAt = null;
            this.grid.addTree(this.x, this.y);
            this.pickVisual();
            this.anim = { type: 'grow', t: 0, dur: 25 };
            this.manager.attach(this);
            this.manager.markAnimating(this);
            return true;
        }
        return false;
    }

    getStatus() {
        return { id: this.id, position: { x: this.x, y: this.y }, choppedCount: this.choppedCount, maxChops: this.maxChops, isDestroyed: this.isDestroyed, canRespawn: this.canRespawn() };
    }
}
Tree._seq = 1;

class TreeManager {
    constructor(grid, scene) {
        this.grid = grid;
        this.scene = scene;
        this.fx = null;
        this.trees = new Map();          // id -> Tree（活動）
        this.destroyedTrees = new Map(); // id -> Tree（待重生）
        this.byCell = new Map();         // "x,y" -> Tree（活動）
        this.animating = new Set();
        this.dummy = new THREE.Object3D();
        this.capacity = 2600;
        this.meshes = {};
        this.slots = {};                 // species -> { free: [], next: 0 }
        this.dirty = new Set();
        this.shadows = true;
        this.lastRespawnCheck = 0;

        const mat = TreeVisual.material();
        const lib = TreeVisual.build();
        for (const sp of Object.keys(lib)) {
            // 每個樹種 2 個變體 → 2 個 InstancedMesh
            this.meshes[sp] = lib[sp].geoms.map(g => {
                const m = new THREE.InstancedMesh(g, mat, this.capacity);
                m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3).fill(1), 3);
                m.instanceColor.setUsage(THREE.DynamicDrawUsage);
                m.count = 0;
                m.frustumCulled = false;     // 實例分佈很廣，不能以單一幾何的包圍球裁切
                m.castShadow = true;
                m.receiveShadow = true;
                m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                this.scene.add(m);
                return m;
            });
            this.slots[sp] = [{ free: [], next: 0 }, { free: [], next: 0 }];
        }

        this.totalTrees = Math.floor(grid.size / 5) * Math.floor(grid.size / 5);   // 1600
        this.generateForest(this.totalTrees);
    }

    // ---- 實例管理 ----
    attach(tree) {
        if (tree.visual) return;
        const s = this.slots[tree.species][tree.variant];
        const slot = s.free.length ? s.free.pop() : s.next++;
        tree.visual = { species: tree.species, variant: tree.variant, slot };
        this.meshes[tree.species][tree.variant].count = Math.max(this.meshes[tree.species][tree.variant].count, slot + 1);
        this.trees.set(tree.id, tree);
        this.byCell.set(`${tree.x},${tree.y}`, tree);
    }

    detach(tree) {
        if (!tree.visual) return;
        const { species, variant, slot } = tree.visual;
        const mesh = this.meshes[species][variant];
        this.dummy.position.set(0, -50, 0);
        this.dummy.scale.setScalar(0.0001);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(slot, this.dummy.matrix);
        mesh.instanceMatrix.needsUpdate = true;
        this.slots[species][variant].free.push(slot);
        tree.visual = null;
        this.animating.delete(tree);
    }

    markAnimating(tree) { this.animating.add(tree); }

    // 寫入某棵樹的實例矩陣（含動畫）
    writeInstance(tree) {
        if (!tree.visual) return;
        const d = this.dummy, a = tree.anim;
        const ws = this.grid.size / 2;
        let sc = tree.baseScale, rx = tree.tiltX, rz = tree.tiltZ, py = 0;
        let px = tree.x - ws + 0.5 + tree.ox, pz = tree.y - ws + 0.5 + tree.oz;
        if (a) {
            const p = Math.min(1, a.t / a.dur);
            if (a.type === 'shake') {
                const amp = (1 - p) * 0.09;
                rz += Math.sin(a.t * 38) * amp;
                rx += Math.cos(a.t * 31) * amp * 0.6;
            } else if (a.type === 'fall') {
                const fallP = Math.min(1, p / 0.7);
                const ang = (fallP * fallP) * (Math.PI / 2 - 0.1);
                rx += a.dirZ * ang;
                rz += -a.dirX * ang;
                if (p > 0.7) sc *= 1 - Util.smoothstep(0.7, 1, p);
            } else if (a.type === 'grow') {
                sc *= 0.12 + 0.88 * (1 - Math.pow(1 - p, 2));
            }
        }
        d.position.set(px, py + groundY(px, pz), pz);
        d.rotation.set(rx, tree.rotY, rz, 'YXZ');
        d.scale.setScalar(sc);
        d.updateMatrix();
        const mesh = this.meshes[tree.visual.species][tree.visual.variant];
        mesh.setMatrixAt(tree.visual.slot, d.matrix);
        mesh.setColorAt(tree.visual.slot, tree.tint);
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    setShadows(on) {
        this.shadows = on;
        for (const sp of Object.keys(this.meshes)) for (const m of this.meshes[sp]) m.castShadow = on;
    }

    // ---- 森林生成：以噪聲決定林地與空地 ----
    generateForest(count) {
        const g = this.grid, N = g.size;
        let placed = 0, attempts = 0;
        const maxAttempts = count * 40;
        while (placed < count && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
            const dc = Math.hypot(x - N / 2, y - N / 2);
            if (dc < 24) continue;
            // 林地密度場：噪聲高 → 密林；噪聲低 → 草地
            const dens = Util.smoothstep(0.38, 0.62, Util.fbm(x * 0.03 + 3.1, y * 0.03 + 7.7, 3));
            if (Math.random() > 0.06 + dens * 0.94) continue;
            // 林地邊緣不要太規則：降低中心附近密度
            if (dc < 40 && Math.random() < (40 - dc) / 40 * 0.7) continue;
            if (!g.canPlaceTree(x, y)) continue;
            if (this.addTreeAt(x, y)) placed++;
        }
    }

    clearTreesInArea(centerX, centerY, radius) {
        const remove = [];
        for (const [id, tree] of this.trees) {
            if (Math.hypot(tree.x - centerX, tree.y - centerY) <= radius) remove.push(tree);
        }
        for (const tree of remove) {
            this.removeTree(tree, true);
        }
        // 同時清掉待重生中、位於區域內的樹
        for (const [id, tree] of this.destroyedTrees) {
            if (Math.hypot(tree.x - centerX, tree.y - centerY) <= radius) { this.destroyedTrees.delete(id); }
        }
    }

    // 移除樹（清地時：倒下動畫但不重生）
    removeTree(tree, animated) {
        this.trees.delete(tree.id);
        this.byCell.delete(`${tree.x},${tree.y}`);
        if (animated && tree.visual && !tree.isDestroyed) {
            tree.isDestroyed = true;
            tree.destroyedAt = simNow();
            this.grid.removeTree(tree.x, tree.y);
            const a = Math.random() * Math.PI * 2;
            tree.anim = { type: 'fall', t: 0, dur: 1.0 + Math.random() * 0.8, dirX: Math.cos(a), dirZ: Math.sin(a), removing: true };
            this.markAnimating(tree);
        } else {
            tree.destroy(false);
        }
    }

    // 砍樹動作的視覺搖晃（不計入砍伐次數）
    pulse(x, y) {
        const t = this.byCell.get(`${x},${y}`);
        if (t && !t.isDestroyed && (!t.anim || t.anim.type === 'shake')) { t.anim = { type: 'shake', t: 0, dur: 0.45 }; this.markAnimating(t); }
    }

    chopTree(x, y) {
        const tree = this.byCell.get(`${x},${y}`);
        if (!tree || tree.isDestroyed) return false;
        const felled = tree.chop();
        if (felled) {
            this.trees.delete(tree.id);
            this.byCell.delete(`${x},${y}`);
            this.destroyedTrees.set(tree.id, tree);
        }
        return felled;
    }

    // 逐幀更新：動畫 + 重生檢查
    update(dtSec, now) {
        TreeVisual.timeUniform.value += dtSec;
        if (this.animating.size) {
            for (const tree of Array.from(this.animating)) {
                const a = tree.anim;
                if (!a) { this.animating.delete(tree); continue; }
                a.t += dtSec;
                if (a.t >= a.dur) {
                    if (a.type === 'fall') {
                        tree.anim = null;
                        this.detach(tree);
                        continue;
                    }
                    tree.anim = null;
                    this.animating.delete(tree);
                }
                this.writeInstance(tree);
            }
        }
        if (now - this.lastRespawnCheck > 2000) {
            this.lastRespawnCheck = now;
            this.processRespawns();
        }
    }

    processRespawns() {
        const done = [];
        let budget = 6;
        for (const [id, tree] of this.destroyedTrees) {
            if (budget <= 0) break;
            if (tree.canRespawn() && !tree.visual) {
                budget--;
                if (tree.respawn()) done.push(id);
                else {
                    const np = this.findNearbySpawnPosition(tree.x, tree.y, 20);
                    if (np) { tree.x = np.x; tree.y = np.y; if (tree.respawn()) done.push(id); }
                }
            }
        }
        for (const id of done) {
            const tree = this.destroyedTrees.get(id);
            this.destroyedTrees.delete(id);
            this.trees.set(id, tree);
            this.byCell.set(`${tree.x},${tree.y}`, tree);
        }
    }

    findNearbySpawnPosition(centerX, centerY, radius) {
        for (let attempts = 0; attempts < 50; attempts++) {
            const angle = Math.random() * Math.PI * 2, distance = Math.random() * radius;
            const x = Math.floor(centerX + Math.cos(angle) * distance), y = Math.floor(centerY + Math.sin(angle) * distance);
            if (this.grid.canPlaceTree(x, y)) return { x, y };
        }
        return null;
    }

    getActiveTreeCount() { return this.trees.size; }
    getDestroyedTreeCount() { return this.destroyedTrees.size; }
    getTotalTreeCount() { return this.trees.size + this.destroyedTrees.size; }
    getAllTreeStatus() {
        const active = Array.from(this.trees.values()).map(t => t.getStatus());
        const destroyed = Array.from(this.destroyedTrees.values()).map(t => t.getStatus());
        return { active, destroyed, total: active.length + destroyed.length };
    }

    generateTreesInArea(centerX, centerY, radius, count) {
        let generated = 0;
        for (let attempts = 0; attempts < count * 5 && generated < count; attempts++) {
            const angle = Math.random() * Math.PI * 2, distance = Math.random() * radius;
            const x = Math.floor(centerX + Math.cos(angle) * distance), y = Math.floor(centerY + Math.sin(angle) * distance);
            if (this.grid.canPlaceTree(x, y) && this.addTreeAt(x, y)) generated++;
        }
        return generated;
    }

    destroyAll() {
        for (const tree of Array.from(this.trees.values())) tree.destroy(false);
        this.trees.clear(); this.destroyedTrees.clear(); this.byCell.clear();
    }

    addTreeAt(x, y) {
        if (!this.grid.isValidPosition(x, y) || !this.grid.canPlaceTree(x, y)) return false;
        const tree = new Tree(x, y, this.grid, this.scene, this);
        this.grid.addTree(x, y);
        this.trees.set(tree.id, tree);
        this.byCell.set(`${x},${y}`, tree);
        return true;
    }

    hasTreeAt(x, y) {
        if (this.byCell.has(`${x},${y}`)) return true;
        for (const tree of this.destroyedTrees.values()) if (tree.x === x && tree.y === y) return true;
        return false;
    }

    // 依樹木密度設定調整總數
    setTargetTreeCount(targetCount) {
        const current = this.getTotalTreeCount();
        if (targetCount > current) this.addRandomTrees(targetCount - current);
        else if (targetCount < current) this.removeRandomTrees(current - targetCount);
    }

    addRandomTrees(count) {
        let added = 0;
        const N = this.grid.size;
        for (let attempt = 0; attempt < count * 20 && added < count; attempt++) {
            const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
            const dens = Util.smoothstep(0.38, 0.62, Util.fbm(x * 0.03 + 3.1, y * 0.03 + 7.7, 3));
            if (Math.random() > 0.1 + dens * 0.9) continue;
            if (Math.hypot(x - N / 2, y - N / 2) > 30 && this.addTreeAt(x, y)) added++;
        }
        return added;
    }

    removeRandomTrees(count) {
        const arr = Array.from(this.trees.values());
        let removed = 0;
        // 先移除離中心最遠的？—— 為了看起來自然，隨機移除
        for (let i = 0; i < count && arr.length; i++) {
            const idx = Math.floor(Math.random() * arr.length);
            const tree = arr.splice(idx, 1)[0];
            this.trees.delete(tree.id);
            this.byCell.delete(`${tree.x},${tree.y}`);
            tree.destroy(false);
            removed++;
        }
        return removed;
    }
}

// 全域「遊戲時間」（毫秒）—— 由 World 每幀更新，讓樹木重生、農田枯竭等都與遊戲速度/暫停同步
function simNow() { return window.simTimeMs || 0; }
