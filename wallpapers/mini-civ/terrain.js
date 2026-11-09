// 地形 —— 高度函數（中央平原 + 起伏丘陵 + 三座山脈 + 一條蜿蜒河流與淺灘）
// 座標皆為世界座標；格子 (i,j) 的中心 = (i+0.5-100, j+0.5-100)。
// 這個類別只提供「純數學」：高度、坡度、水深、可建／可走格，渲染與建築擺放由其他模組使用。
class Terrain {
    constructor() {
        const R = Math.random;
        this.wl = -0.3;                       // 水面高度
        this.C = { x: -3, z: -3 };            // 起始城堡位置（中央平原中心）
        this.off = [R() * 90, R() * 90, R() * 90, R() * 90];
        // --- 山脈：三座，環繞在平原外 ---
        const base = R() * Math.PI * 2;
        this.massifs = [];
        for (let k = 0; k < 3; k++) {
            const a = base + k * 2.0944 + (R() - 0.5) * 0.6, r = 78 + R() * 10;
            this.massifs.push({ x: this.C.x + Math.cos(a) * r, z: this.C.z + Math.sin(a) * r, R: 30 + R() * 8, H: 20 + R() * 10, s: R() * 60, a });
        }
        this._buildRiver(this.massifs[0].a);
        this._bake();
    }

    // ---------- 河流 ----------
    _buildRiver(a0) {
        const C = this.C, R = Math.random;
        const side = R() < 0.5 ? 1 : -1;
        const S = { x: C.x + Math.cos(a0) * 150, z: C.z + Math.sin(a0) * 150 };
        const E = { x: C.x + Math.cos(a0 + Math.PI + (R() - 0.5) * 0.5) * 150, z: C.z + Math.sin(a0 + Math.PI + (R() - 0.5) * 0.5) * 150 };
        const ph = R() * 6.28, amp = 4 + R() * 3;
        let dist = 60, pts;
        for (let iter = 0; iter < 8; iter++) {
            const ctl = { x: C.x + Math.cos(a0 + side * Math.PI / 2) * dist, z: C.z + Math.sin(a0 + side * Math.PI / 2) * dist };
            pts = [];
            const N = 140;
            for (let i = 0; i <= N; i++) {
                const t = i / N, u = 1 - t;
                let x = u * u * S.x + 2 * u * t * ctl.x + t * t * E.x, z = u * u * S.z + 2 * u * t * ctl.z + t * t * E.z;
                pts.push({ x, z, t });
            }
            // 蜿蜒
            for (let i = 0; i <= N; i++) {
                const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
                let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
                const m = amp * Math.sin(pts[i].t * Math.PI * 6 + ph) * (0.5 + 0.7 * Util.noise2(pts[i].t * 5 + this.off[0], 3.3));
                pts[i].mx = -tz * m; pts[i].mz = tx * m;
            }
            for (const p of pts) { p.x += p.mx; p.z += p.mz; }
            let mn = 1e9; for (const p of pts) mn = Math.min(mn, Math.hypot(p.x - C.x, p.z - C.z));
            if (mn >= 27 && mn <= 38) break;
            dist += (31 - mn) * 1.6;
        }
        this.river = pts;
        // 與城市最近的位置（淺灘設在這裡附近，以及上下游各一處）
        let bi = 0, bd = 1e9;
        pts.forEach((p, i) => { const d = Math.hypot(p.x - C.x, p.z - C.z); if (d < bd) { bd = d; bi = i; } });
        this.riverClosest = pts[bi];
        const tc = pts[bi].t;
        this.fords = [tc, Math.min(0.9, tc + 0.2 + R() * 0.05), Math.max(0.12, tc - 0.2 - Math.random() * 0.05)];
    }

    _halfW(t) { return (2.1 + 0.9 * Util.noise2(t * 7 + this.off[1], 1.7)) * (0.8 + 0.5 * t); }
    _depth(t) {
        let f = 0; for (const c of this.fords) f = Math.max(f, Math.exp(-Math.pow((t - c) / 0.032, 2)));
        return 0.95 - 0.78 * f;
    }
    _nearRiver(x, z) {
        const P = this.river; let bd = 1e18, bt = 0;
        for (let i = 0; i < P.length - 1; i++) {
            const a = P[i], b = P[i + 1], dx = b.x - a.x, dz = b.z - a.z;
            const l2 = dx * dx + dz * dz || 1e-9;
            let u = ((x - a.x) * dx + (z - a.z) * dz) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
            const px = a.x + dx * u - x, pz = a.z + dz * u - z, d2 = px * px + pz * pz;
            if (d2 < bd) { bd = d2; bt = a.t + (b.t - a.t) * u; }
        }
        return { d: Math.sqrt(bd), t: bt };
    }

    // ---------- 高度 ----------
    _land(x, z) {
        const C = this.C, o = this.off;
        const dc = Math.hypot(x - C.x, z - C.z);
        // 中央平原 → 緩丘
        const w = Util.smoothstep(24, 54, dc);
        let h = w * (Util.fbm(x * 0.022 + o[0], z * 0.022 + o[1], 3) * 3.2 + Util.fbm(x * 0.07 + o[2], z * 0.07 + o[3], 2) * 0.8);
        // 山脈（脊線噪聲）
        for (const m of this.massifs) {
            const u = Math.hypot(x - m.x, z - m.z) / m.R;
            if (u >= 1) continue;
            const bump = Math.pow(1 - Util.smoothstep(0.05, 1, u), 1.5);
            const n = Util.fbm((x + m.s) * 0.05, (z - m.s) * 0.05, 4);
            const ridge = 1 - Math.abs(2 * n - 1);
            h += m.H * bump * (0.5 + 0.7 * ridge);
        }
        // 外圍遠山（背景）
        const d = Math.max(Math.abs(x), Math.abs(z));
        const mo = Util.smoothstep(106, 175, d);
        if (mo > 0) {
            h += mo * (6 + 34 * Util.fbm(x * 0.011 + 40, z * 0.011 - 12, 4)) + Util.smoothstep(170, 360, d) * 55 * Util.fbm(x * 0.006 - 5, z * 0.006 + 9, 3);
        }
        return h;
    }

    _raw(x, z) {
        let land = this._land(x, z);
        const r = this._nearRiver(x, z), hw = this._halfW(r.t), wl = this.wl;
        const reach = hw + 4.4;
        if (r.d < reach) {
            if (r.d < hw) {
                const q = r.d / hw;
                return wl - this._depth(r.t) * (1 - q * q);
            }
            const k = Util.smoothstep(hw, reach, r.d);
            const target = Math.max(land, wl + 0.25);
            return wl + 0.06 + (target - wl - 0.06) * k;
        }
        return Math.max(land, wl + 0.2);
    }

    _bake() {
        const H = 112, res = 0.5, N = Math.round(2 * H / res) + 1;
        this.bk = { H, res, N, data: new Float32Array(N * N) };
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) this.bk.data[j * N + i] = this._raw(-H + i * res, -H + j * res);
    }

    height(x, z) {
        const b = this.bk;
        if (x < -b.H || x > b.H - 1e-3 || z < -b.H || z > b.H - 1e-3) return this._raw(x, z);
        const fx = (x + b.H) / b.res, fz = (z + b.H) / b.res;
        const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, N = b.N, d = b.data;
        const a = d[j * N + i], bb = d[j * N + i + 1], c = d[(j + 1) * N + i], e = d[(j + 1) * N + i + 1];
        return a + (bb - a) * u + (c - a) * v + (a - bb - c + e) * u * v;
    }
    slope(x, z) {
        const e = 0.6;
        const gx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e), gz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
        return Math.hypot(gx, gz);
    }
    waterDepth(x, z) { return Math.max(0, this.wl - this.height(x, z)); }

    // 區域內高度的最大落差（取 3x3 取樣）：建築地基用
    heightRange(wx, wz, w, h) {
        let mn = 1e9, mx = -1e9;
        for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
            const y = this.height(wx + w * i / 2, wz + h * j / 2);
            mn = Math.min(mn, y); mx = Math.max(mx, y);
        }
        return mx - mn;
    }

    // ---------- 格子屬性（供 Grid 使用） ----------
    // blocked：深水或峭壁（不可通行）；noBuild：不可建；noTree：水中不可種樹
    cellMasks(S) {
        const blocked = new Uint8Array(S * S), noBuild = new Uint8Array(S * S), noTree = new Uint8Array(S * S), cliff = new Uint8Array(S * S), water = new Uint8Array(S * S);
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
            const wx = i + 0.5 - S / 2, wz = j + 0.5 - S / 2, h = this.height(wx, wz), sl = this.slope(wx, wz), k = j * S + i;
            const deep = this.wl - h > 0.32, wet = h < this.wl + 0.05;
            const isCliff = sl > 0.85;
            blocked[k] = deep || isCliff ? 1 : 0;
            cliff[k] = isCliff ? 1 : 0;
            water[k] = deep ? 1 : 0;
            noBuild[k] = (h < this.wl + 0.22 || sl > 0.3 || blocked[k]) ? 1 : 0;
            noTree[k] = (wet || h < this.wl + 0.12) ? 1 : 0;
        }
        return { blocked, noBuild, noTree, cliff, water };
    }

    // 連通區標記（4 連通、只看 blocked）
    regions(blocked, S) {
        const reg = new Int32Array(S * S); let n = 0;
        for (let s = 0; s < S * S; s++) {
            if (blocked[s] || reg[s]) continue;
            n++; const st = [s]; reg[s] = n;
            while (st.length) {
                const i = st.pop(), x = i % S, y = (i / S) | 0;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
                    const j = ny * S + nx; if (!blocked[j] && !reg[j]) { reg[j] = n; st.push(j); }
                }
            }
        }
        return reg;
    }
}

// 任一處的地面高度（沒有地形時為 0）
function groundY(x, z) {
    const w = window.worldInstance;
    return w && w.terrain ? w.terrain.height(x, z) : 0;
}
