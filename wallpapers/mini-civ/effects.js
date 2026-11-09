// 粒子特效 —— 煙、塵土、木屑、落葉（一般混合）＋ 螢火蟲（加色混合）
class Effects {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.enabled = true;
        this.light = 1;          // 環境亮度（夜晚粒子變暗）
        this.night = 0;
        this.time = 0;
        this.focus = new THREE.Vector3();

        // ---- 一般粒子池 ----
        this.N = 1400;
        this.p = this._makePool(this.N, false);
        this.cursor = 0;

        // ---- 螢火蟲 ----
        this.F = 110;
        this.f = this._makePool(this.F, true);
        this.fly = [];
        for (let i = 0; i < this.F; i++) {
            this.fly.push({ a: Math.random() * 6.28, r: 8 + Math.random() * 48, y: 0.5 + Math.random() * 2.6, s: 0.08 + Math.random() * 0.2, ph: Math.random() * 100, bob: Math.random() * 6.28 });
        }
    }

    _makePool(n, additive) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
        for (let i = 0; i < n; i++) pos[i * 3 + 1] = -1000;
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(col, 4));
        geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
        const mat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
            uniforms: { uScale: { value: 600 }, uLight: { value: 1 } },
            vertexShader: `
                attribute float aSize; attribute vec4 aColor; varying vec4 vColor;
                uniform float uScale;
                void main(){
                    vColor = aColor;
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = max(aSize * uScale / max(-mv.z, 0.1), 0.0);
                    vColor.a *= 1.0 - smoothstep(110.0, 260.0, -mv.z);
                    gl_Position = projectionMatrix * mv;
                }`,
            fragmentShader: `
                varying vec4 vColor; uniform float uLight;
                void main(){
                    float d = length(gl_PointCoord - 0.5);
                    float a = smoothstep(0.5, ${additive ? '0.0' : '0.18'}, d);
                    ${additive ? 'a *= a;' : ''}
                    vec3 c = vColor.rgb * ${additive ? '1.0' : 'uLight'};
                    gl_FragColor = vec4(c, vColor.a * a);
                    #include <encodings_fragment>
                }`
        });
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        pts.renderOrder = additive ? 11 : 10;
        this.scene.add(pts);
        const data = {
            pts, geo, mat, n, pos, col, size,
            vx: new Float32Array(n), vy: new Float32Array(n), vz: new Float32Array(n),
            life: new Float32Array(n), max: new Float32Array(n), s0: new Float32Array(n), s1: new Float32Array(n),
            a0: new Float32Array(n), grav: new Float32Array(n), drag: new Float32Array(n),
            r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), swirl: new Float32Array(n)
        };
        return data;
    }

    setEnabled(on) {
        this.enabled = on;
        if (!on) {
            for (let i = 0; i < this.N; i++) { this.p.life[i] = 0; this.p.pos[i * 3 + 1] = -1000; this.p.col[i * 4 + 3] = 0; }
            this.p.geo.attributes.position.needsUpdate = true; this.p.geo.attributes.aColor.needsUpdate = true;
        }
        this.f.pts.visible = on;
    }

    setViewport(height, fovDeg) {
        const s = height / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
        this.p.mat.uniforms.uScale.value = s;
        this.f.mat.uniforms.uScale.value = s;
    }

    _emit(x, y, z, vx, vy, vz, life, s0, s1, hex, a0, grav, drag, swirl) {
        if (!this.enabled) return;
        const P = this.p, i = this.cursor;
        this.cursor = (this.cursor + 1) % this.N;
        const c = Util.color(hex);
        P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
        P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
        P.life[i] = life; P.max[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.a0[i] = a0;
        P.grav[i] = grav; P.drag[i] = drag; P.swirl[i] = swirl || 0;
        P.r[i] = c.r; P.g[i] = c.g; P.b[i] = c.b;
    }

    // 煙囪的煙
    smoke(x, y, z) {
        this._emit(x + (Math.random() - 0.5) * 0.12, y, z + (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.3) * 0.15, 0.7 + Math.random() * 0.3, (Math.random() - 0.5) * 0.15,
            3.6 + Math.random() * 1.8, 0.35, 1.5, 0xd8d6d2, 0.42, 0, 0.1, 1);
    }
    // 建造/砍樹揚塵
    dust(x, y, z, n) {
        y += groundY(x, z);
        for (let i = 0; i < (n || 6); i++) {
            const a = Math.random() * 6.28, sp = 0.4 + Math.random() * 1.0;
            this._emit(x + Math.cos(a) * 0.5, y + 0.1, z + Math.sin(a) * 0.5,
                Math.cos(a) * sp, 0.3 + Math.random() * 0.6, Math.sin(a) * sp,
                0.8 + Math.random() * 0.7, 0.4, 1.6, 0xc9b79a, 0.55, 0, 2.2);
        }
    }
    // 木屑
    chips(x, y, z, n) {
        y += groundY(x, z);
        for (let i = 0; i < (n || 4); i++) {
            const a = Math.random() * 6.28, sp = 0.8 + Math.random() * 1.6;
            this._emit(x, y, z, Math.cos(a) * sp, 1.5 + Math.random() * 1.8, Math.sin(a) * sp,
                0.7 + Math.random() * 0.5, 0.16, 0.12, Util.pick([0xb98a55, 0xa0703f, 0xd1a468]), 0.95, 9, 0.8);
        }
    }
    // 落葉
    leaves(x, y, z, n, species) {
        y += groundY(x, z);
        const pal = species === 'maple' ? [0xd9822b, 0xc9552a, 0xe0a83a] : (species === 'pine' ? [0x2d6a47, 0x327450] : [0x4a9b40, 0x3f8f3a, 0x86b94a]);
        for (let i = 0; i < (n || 8); i++) {
            const a = Math.random() * 6.28, sp = Math.random() * 1.2;
            this._emit(x + (Math.random() - 0.5) * 1.6, y + Math.random() * 1.2, z + (Math.random() - 0.5) * 1.6,
                Math.cos(a) * sp, 0.4 + Math.random() * 0.8, Math.sin(a) * sp,
                2.0 + Math.random() * 1.4, 0.22, 0.2, Util.pick(pal), 0.95, 1.8, 1.2, 1);
        }
    }
    // 成長/完成的閃光
    sparkle(x, y, z) {
        y += groundY(x, z);
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * 6.28, sp = 0.6 + Math.random() * 1.4;
            this._emit(x, y, z, Math.cos(a) * sp, 1 + Math.random() * 1.5, Math.sin(a) * sp, 0.9 + Math.random() * 0.6, 0.2, 0.06, 0xfff2b0, 0.9, 1.5, 1.4);
        }
    }

    update(dt, night, light, focus, windSign) {
        this.time += dt;
        this.light = light; this.night = night;
        if (focus) this.focus.copy(focus);
        const P = this.p;
        P.mat.uniforms.uLight.value = 0.28 + 0.72 * light;
        // 更新活動粒子
        for (let i = 0; i < this.N; i++) {
            if (P.life[i] <= 0) { if (P.col[i * 4 + 3] !== 0) { P.col[i * 4 + 3] = 0; P.pos[i * 3 + 1] = -1000; } continue; }
            P.life[i] -= dt;
            const t = 1 - Math.max(P.life[i], 0) / P.max[i];
            const drag = Math.exp(-P.drag[i] * dt);
            P.vx[i] *= drag; P.vz[i] *= drag; P.vy[i] = P.vy[i] * (P.grav[i] > 0 ? 1 : drag) - P.grav[i] * dt;
            if (P.swirl[i]) { P.vx[i] += Math.sin(this.time * 1.7 + i) * 0.5 * dt + 0.25 * dt; P.vz[i] += Math.cos(this.time * 1.3 + i * 1.3) * 0.5 * dt; }
            P.pos[i * 3] += P.vx[i] * dt; P.pos[i * 3 + 1] += P.vy[i] * dt; P.pos[i * 3 + 2] += P.vz[i] * dt;
            if (P.pos[i * 3 + 1] < 0.05 && P.grav[i] > 0) { P.pos[i * 3 + 1] = 0.05; P.vx[i] *= 0.4; P.vz[i] *= 0.4; P.vy[i] = 0; }
            P.size[i] = P.s0[i] + (P.s1[i] - P.s0[i]) * t;
            const fadeIn = Math.min(1, t * 8), fadeOut = 1 - Math.pow(t, 2);
            P.col[i * 4] = P.r[i]; P.col[i * 4 + 1] = P.g[i]; P.col[i * 4 + 2] = P.b[i];
            P.col[i * 4 + 3] = P.a0[i] * fadeIn * fadeOut;
        }
        P.geo.attributes.position.needsUpdate = true; P.geo.attributes.aColor.needsUpdate = true; P.geo.attributes.aSize.needsUpdate = true;

        // 螢火蟲：夜間出現在城市周圍
        const F = this.f, vis = this.enabled && night > 0.25;
        F.pts.visible = vis;
        if (vis) {
            const cx = this.focus.x, cz = this.focus.z;
            for (let i = 0; i < this.F; i++) {
                const q = this.fly[i];
                q.a += q.s * dt * 0.6;
                const r = q.r + Math.sin(this.time * 0.3 + q.ph) * 4;
                const x = cx + Math.cos(q.a) * r + Math.sin(this.time * 0.9 + q.ph) * 1.5;
                const z = cz + Math.sin(q.a) * r + Math.cos(this.time * 0.7 + q.ph) * 1.5;
                const y = q.y + Math.sin(this.time * 1.3 + q.bob) * 0.5;
                F.pos[i * 3] = x; F.pos[i * 3 + 1] = y; F.pos[i * 3 + 2] = z;
                const tw = 0.5 + 0.5 * Math.sin(this.time * (2 + q.s * 6) + q.ph);
                F.size[i] = 0.22 + tw * 0.1;
                const k = night * (0.25 + 0.75 * tw);
                F.col[i * 4] = 0.55 * k; F.col[i * 4 + 1] = 0.85 * k; F.col[i * 4 + 2] = 0.25 * k; F.col[i * 4 + 3] = 1;
            }
            F.geo.attributes.position.needsUpdate = true; F.geo.attributes.aColor.needsUpdate = true; F.geo.attributes.aSize.needsUpdate = true;
        }
    }
}
