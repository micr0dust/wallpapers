// 幾何與數學工具 —— 低多邊形模型建構器（頂點色、合併、假環境光遮蔽）
const Util = {
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
    rand(a, b) { return a + Math.random() * (b - a); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    // 以 sRGB 十六進位建立「線性」顏色（配合 sRGB 輸出）
    color(hex) { return new THREE.Color(hex).convertSRGBToLinear(); },
    hash2(x, y) {
        let h = (x * 374761393 + y * 668265263) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h & 0x7fffffff) / 0x7fffffff;
    },
    // 平滑值噪聲 0..1
    noise2(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const s = t => t * t * (3 - 2 * t);
        const a = Util.hash2(ix, iy), b = Util.hash2(ix + 1, iy), c = Util.hash2(ix, iy + 1), d = Util.hash2(ix + 1, iy + 1);
        const u = s(fx), v = s(fy);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    },
    fbm(x, y, oct = 3) {
        let amp = 0.5, f = 1, sum = 0, norm = 0;
        for (let i = 0; i < oct; i++) { sum += Util.noise2(x * f + i * 17.3, y * f - i * 9.1) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
        return sum / norm;
    },
    // 建立 canvas；無 DOM（無頭測試）時回傳 null
    canvas(w, h) {
        try {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            if (!ctx || !ctx.fillRect) return null;
            return { canvas: c, ctx };
        } catch (e) { return null; }
    }
};

const Geo = {
    _m: new THREE.Matrix4(), _q: new THREE.Quaternion(), _e: new THREE.Euler(), _p: new THREE.Vector3(), _s: new THREE.Vector3(),

    // 把一個 THREE 幾何轉成「非索引 + 頂點色」的零件
    // t: { x,y,z, rx,ry,rz, sx,sy,sz, jitter(亮度抖動), flat(是否平面著色) }
    part(geom, hex, t) {
        t = t || {};
        let g = geom.index ? geom.toNonIndexed() : geom.clone();
        if (g.attributes.uv) g.deleteAttribute('uv');
        const e = Geo._e.set(t.rx || 0, t.ry || 0, t.rz || 0);
        Geo._q.setFromEuler(e);
        Geo._p.set(t.x || 0, t.y || 0, t.z || 0);
        Geo._s.set(t.sx === undefined ? 1 : t.sx, t.sy === undefined ? 1 : t.sy, t.sz === undefined ? 1 : t.sz);
        Geo._m.compose(Geo._p, Geo._q, Geo._s);
        g.applyMatrix4(Geo._m);
        if (t.flat) g.computeVertexNormals();
        const c = Util.color(hex);
        const j = t.jitter === undefined ? 0.05 : t.jitter;
        const k = 1 + (Math.random() - 0.5) * 2 * j;
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
    },

    box(w, h, d, hex, t) { return Geo.part(new THREE.BoxGeometry(w, h, d), hex, t); },
    cyl(rt, rb, h, seg, hex, t) { return Geo.part(new THREE.CylinderGeometry(rt, rb, h, seg || 12), hex, t); },
    cone(r, h, seg, hex, t) { return Geo.part(new THREE.ConeGeometry(r, h, seg || 12), hex, t); },
    // 凹凸的低多邊形球（樹冠、灌木、雲）
    blob(r, detail, hex, t, bump) {
        const ico = new THREE.IcosahedronGeometry(r, detail === undefined ? 1 : detail);
        const pos = ico.attributes.position;
        const b = bump === undefined ? 0.14 : bump;
        // 以位置為種子的穩定抖動（相同頂點得到相同位移，避免裂縫）
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const k = 1 + (Util.hash2(Math.round(x * 97) + Math.round(z * 53), Math.round(y * 71)) - 0.5) * 2 * b;
            pos.setXYZ(i, x * k, y * k, z * k);
        }
        return Geo.part(ico, hex, Object.assign({ flat: true }, t));
    },
    // 三角稜柱屋頂：沿 z 軸延伸，脊線在 y=h；寬 w（x 方向），長 d（z 方向）
    gable(w, h, d, hex, hex2, t) {
        const hw = w / 2, hd = d / 2;
        const P = (x, y, z) => [x, y, z];
        const tris = [];
        // 兩側坡面
        tris.push([P(-hw, 0, -hd), P(0, h, -hd), P(0, h, hd)], [P(-hw, 0, -hd), P(0, h, hd), P(-hw, 0, hd)]);
        tris.push([P(hw, 0, hd), P(0, h, hd), P(0, h, -hd)], [P(hw, 0, hd), P(0, h, -hd), P(hw, 0, -hd)]);
        // 山牆（前後三角）
        const gab = [];
        gab.push([P(-hw, 0, hd), P(0, h, hd), P(hw, 0, hd)]);
        gab.push([P(hw, 0, -hd), P(0, h, -hd), P(-hw, 0, -hd)]);
        const build = (list, color) => {
            const arr = new Float32Array(list.length * 9);
            list.forEach((tri, i) => [tri[0], tri[2], tri[1]].forEach((v, j) => { arr[i * 9 + j * 3] = v[0]; arr[i * 9 + j * 3 + 1] = v[1]; arr[i * 9 + j * 3 + 2] = v[2]; }));
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
            return Geo.part(g, color, Object.assign({ flat: true }, t));
        };
        return Geo.merge([build(tris, hex), build(gab, hex2 || hex)]);
    },
    // 四角錐屋頂
    pyramid(w, h, d, hex, t) {
        const g = new THREE.ConeGeometry(1, h, 4);
        g.rotateY(Math.PI / 4);
        const s = Object.assign({ sx: w / Math.SQRT2, sz: d / Math.SQRT2, flat: true }, t);
        return Geo.part(g, hex, s);
    },

    merge(list) {
        let n = 0;
        for (const g of list) n += g.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
        let o = 0;
        for (const g of list) {
            pos.set(g.attributes.position.array, o * 3);
            nor.set(g.attributes.normal.array, o * 3);
            col.set(g.attributes.color.array, o * 3);
            o += g.attributes.position.count;
        }
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        out.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return out;
    },

    // 假環境光遮蔽：y 在 [y0,y1] 之間由 minK 漸變到 1（越靠近地面越暗）
    shade(g, y0, y1, minK) {
        const p = g.attributes.position, c = g.attributes.color;
        for (let i = 0; i < p.count; i++) {
            const k = Util.lerp(minK, 1, Util.smoothstep(y0, y1, p.getY(i)));
            c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
        }
        return g;
    },
    // 把整個幾何整體上移/下移（用於建造零件以底部為軸心）
    lift(g, dy) { g.translate(0, dy, 0); return g; },

    // 平面窗戶（朝 +z 的小四邊形），含自身位置/朝向
    quad(w, h, x, y, z, ry) {
        const g = Geo.part(new THREE.PlaneGeometry(w, h), 0xffffff, { x, y, z, ry: ry || 0, jitter: 0 });
        return g;
    }
};
