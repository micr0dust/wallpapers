// 天空系統 —— 漸層天空穹頂（太陽、月亮、星空）、日夜光照、雲
const SKY_KEYS = [
    // e = 太陽高度 sin(elevation)
    { e: -0.35, zenith: 0x050914, horizon: 0x0e1a38, fog: 0x0e1a38 },
    { e: -0.12, zenith: 0x0d1640, horizon: 0x2b3566, fog: 0x2b3566 },
    { e: -0.02, zenith: 0x25357a, horizon: 0xe58a5c, fog: 0xd9906a },
    { e: 0.08, zenith: 0x3a68b8, horizon: 0xffc58f, fog: 0xf0c9a2 },
    { e: 0.30, zenith: 0x3d83d8, horizon: 0xb9ddf2, fog: 0xb4d8ee },
    { e: 1.00, zenith: 0x2f78d6, horizon: 0xc4e4f6, fog: 0xbcdff2 }
];

class SkySystem {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.time = 0;
        this.state = { night: 0, day: 1, sunElev: 1, hour: 12, isNight: false, fogColor: new THREE.Color() };
        this.focus = new THREE.Vector3();
        this.shadowHalf = 60;

        this._tmpA = new THREE.Color(); this._tmpB = new THREE.Color();
        this.cKeys = SKY_KEYS.map(k => ({ e: k.e, zenith: Util.color(k.zenith), horizon: Util.color(k.horizon), fog: Util.color(k.fog) }));

        this.createDome();
        this.createLights();
        this.clouds = new CloudLayer(scene);
    }

    createDome() {
        this.domeUniforms = {
            uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
            uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(1, 0.9, 0.7) },
            uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uNight: { value: 0 }, uTime: { value: 0 }, uSunAmt: { value: 1 }
        };
        const mat = new THREE.ShaderMaterial({
            uniforms: this.domeUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
            vertexShader: `
                varying vec3 vDir;
                void main(){
                    vDir = normalize(position);
                    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_Position = p.xyww;
                }`,
            fragmentShader: `
                uniform vec3 uZenith, uHorizon, uSunDir, uSunColor, uMoonDir;
                uniform float uNight, uTime, uSunAmt;
                varying vec3 vDir;
                float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
                void main(){
                    vec3 d = normalize(vDir);
                    float h = max(d.y, 0.0);
                    vec3 col = mix(uHorizon, uZenith, pow(h, 0.5));
                    col = mix(col, uHorizon, exp(-h * 9.0) * 0.4);
                    // 太陽光暈
                    float sd = max(dot(d, uSunDir), 0.0);
                    col += uSunColor * (pow(sd, 900.0) * 3.0 + pow(sd, 90.0) * 0.45 + pow(sd, 7.0) * 0.16) * uSunAmt;
                    // 月亮
                    float md = max(dot(d, uMoonDir), 0.0);
                    float disc = smoothstep(0.99955, 0.99975, md);
                    col = mix(col, vec3(0.86, 0.9, 1.0), disc * uNight);
                    col += vec3(0.25, 0.32, 0.55) * pow(md, 160.0) * 0.5 * uNight;
                    // 星星
                    if (uNight > 0.02 && d.y > 0.02) {
                        vec3 sp = d * 380.0;
                        vec3 cell = floor(sp);
                        float r = hash(cell);
                        vec3 f = fract(sp) - 0.5;
                        float s = step(0.992, r) * smoothstep(0.55, 0.05, length(f));
                        float tw = 0.55 + 0.45 * sin(uTime * 1.7 + r * 90.0);
                        col += vec3(0.85, 0.9, 1.0) * s * tw * uNight * smoothstep(0.02, 0.25, d.y);
                    }
                    gl_FragColor = vec4(col, 1.0);
                    #include <encodings_fragment>
                }`
        });
        this.dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 20), mat);
        this.dome.frustumCulled = false;
        this.dome.renderOrder = -1000;
        this.scene.add(this.dome);
    }

    createLights() {
        this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a3a, 0.6);
        this.scene.add(this.hemi);

        // 主光源（白天 = 太陽，夜晚 = 月亮）—— 唯一投射陰影的光源
        this.key = new THREE.DirectionalLight(0xffffff, 1);
        this.key.castShadow = true;
        this.key.shadow.mapSize.set(2048, 2048);
        this.key.shadow.bias = -0.0004;
        this.key.shadow.normalBias = 0.04;
        this.scene.add(this.key);
        this.scene.add(this.key.target);
        this.setShadowExtent(60);
    }

    setShadowExtent(half) {
        this.shadowHalf = half;
        const c = this.key.shadow.camera;
        c.left = -half; c.right = half; c.top = half; c.bottom = -half;
        c.near = 10; c.far = 420;
        c.updateProjectionMatrix();
    }

    setShadowQuality(q) {
        const sizes = [0, 1024, 2048, 4096];
        const on = q > 0;
        this.renderer.shadowMap.enabled = on;
        this.key.castShadow = on;
        if (on) {
            const s = sizes[Util.clamp(q, 1, 3)];
            if (this.key.shadow.mapSize.x !== s) {
                this.key.shadow.mapSize.set(s, s);
                if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; }
            }
        }
        this.scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
    }

    // 以太陽高度插值天空色
    sample(e) {
        const K = this.cKeys;
        let i = 0;
        while (i < K.length - 2 && e > K[i + 1].e) i++;
        const a = K[i], b = K[i + 1];
        const t = Util.clamp((e - a.e) / (b.e - a.e), 0, 1);
        return {
            zenith: this._tmpA.copy(a.zenith).lerp(b.zenith, t).clone(),
            horizon: this._tmpA.copy(a.horizon).lerp(b.horizon, t).clone(),
            fog: this._tmpA.copy(a.fog).lerp(b.fog, t).clone()
        };
    }

    // hour: 0-24；focus: 相機注視點
    update(dt, hour, focus, cameraPos) {
        this.time += dt;
        this.focus.copy(focus);
        // 日出 5:30、日落 19:00
        const SR = 5.5, SS = 19.0;
        let ang;
        if (hour >= SR && hour <= SS) ang = (hour - SR) / (SS - SR) * Math.PI;
        else {
            const h = hour < SR ? hour + 24 : hour;
            ang = Math.PI + (h - SS) / (24 - (SS - SR)) * Math.PI;
        }
        const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang) * 0.82, 0.38).normalize();
        const e = sunDir.y;
        const moonDir = new THREE.Vector3(-sunDir.x * 0.9, -sunDir.y * 0.9 + 0.05, -0.3).normalize();
        const night = 1 - Util.smoothstep(-0.16, 0.06, e);
        const sunAmt = Util.smoothstep(-0.06, 0.1, e);

        const pal = this.sample(e);
        const U = this.domeUniforms;
        U.uZenith.value.copy(pal.zenith); U.uHorizon.value.copy(pal.horizon);
        U.uSunDir.value.copy(sunDir); U.uMoonDir.value.copy(moonDir);
        U.uNight.value = night; U.uTime.value = this.time; U.uSunAmt.value = sunAmt;

        // 太陽顏色：低角度偏橘，高角度偏白
        const sunCol = this._tmpB.setRGB(1, 0.42, 0.18).lerp(new THREE.Color(1, 0.93, 0.8), Util.smoothstep(0.02, 0.45, e));
        U.uSunColor.value.copy(sunCol);

        // 霧與背景
        this.state.fogColor.copy(pal.fog);
        this.renderer.setClearColor(pal.horizon);
        if (this.scene.fog) this.scene.fog.color.copy(pal.fog);

        // 主光源
        const sunI = Util.smoothstep(-0.02, 0.22, e);
        const moonI = night * 0.5;
        const useSun = e > -0.04;
        const dir = useSun ? sunDir : moonDir;
        this.key.position.copy(this.focus).addScaledVector(dir, 180);
        this.key.target.position.copy(this.focus);
        this.key.target.updateMatrixWorld();
        // 以紋素大小對齊陰影鏡頭，避免陰影閃爍
        const texel = (this.shadowHalf * 2) / this.key.shadow.mapSize.x;
        this.key.position.x = Math.round(this.key.position.x / texel) * texel;
        this.key.position.z = Math.round(this.key.position.z / texel) * texel;
        if (useSun) {
            this.key.color.copy(sunCol);
            this.key.intensity = 1.15 * sunI + 0.001;
        } else {
            this.key.color.setRGB(0.55, 0.66, 1.0);
            this.key.intensity = moonI;
        }
        // 日落時主光源由太陽平滑過渡到月亮（兩者都很弱，不會突兀）

        // 半球光（天空漫射）
        this.hemi.color.copy(pal.zenith).lerp(pal.horizon, 0.55);
        this.hemi.groundColor.setRGB(0.24, 0.2, 0.12).lerp(new THREE.Color(0.05, 0.06, 0.1), night);
        this.hemi.intensity = 0.28 + 0.62 * Util.smoothstep(-0.1, 0.4, e) + 0.0 * night;
        if (night > 0.5) this.hemi.intensity = Math.max(this.hemi.intensity, 0.36 * night);

        // 狀態
        const S = this.state;
        S.night = night; S.day = 1 - night; S.sunElev = e; S.hour = hour;
        S.sunAmt = sunAmt;
        S.light = Util.clamp(sunI + 0.18, 0.18, 1);

        // 穹頂跟隨相機
        this.dome.position.copy(cameraPos);
        this.clouds.update(dt, S, sunCol, pal.horizon);
        return S;
    }

    setCloudsVisible(v) { this.clouds.group.visible = v; }
}

// 低多邊形雲：合併的壓扁球體，隨風緩慢飄移
class CloudLayer {
    constructor(scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
        this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, emissive: 0x000000 });
        this.clouds = [];
        const N = 20;
        for (let i = 0; i < N; i++) {
            const parts = [];
            const n = 4 + Math.floor(Math.random() * 4);
            const w = Util.rand(14, 30);
            for (let k = 0; k < n; k++) {
                const r = Util.rand(5, 9);
                parts.push(Geo.blob(r, 1, 0xffffff, { x: (k / (n - 1) - 0.5) * w + Util.rand(-3, 3), y: Util.rand(-1, 2), z: Util.rand(-4, 4), sy: 0.5, jitter: 0.02 }, 0.1));
            }
            const geo = Geo.merge(parts);
            geo.deleteAttribute('color');
            const mesh = new THREE.Mesh(geo, this.mat);
            const a = (i / N) * Math.PI * 2 + Math.random() * 0.6;
            const r = Util.rand(120, 380);
            mesh.position.set(Math.cos(a) * r, Util.rand(85, 130), Math.sin(a) * r);
            mesh.rotation.y = Math.random() * 6.28;
            mesh.scale.setScalar(Util.rand(0.9, 1.6));
            this.group.add(mesh);
            this.clouds.push({ mesh, speed: Util.rand(1.2, 3.0) });
        }
    }

    update(dt, S, sunCol, horizon) {
        for (const c of this.clouds) {
            c.mesh.position.x += c.speed * dt;
            if (c.mesh.position.x > 420) c.mesh.position.x = -420;
        }
        // 日間為白色；夜晚偏深藍；晨昏帶有暖色
        const day = new THREE.Color(1, 1, 1);
        const warm = sunCol.clone().lerp(new THREE.Color(1, 1, 1), 0.55);
        const col = day.lerp(warm, 1 - Util.smoothstep(0.05, 0.5, S.sunElev));
        this.mat.color.copy(col).multiplyScalar(0.35 + 0.65 * (1 - S.night));
        this.mat.emissive.copy(col).multiplyScalar(0.22 * (1 - S.night) + 0.04);
        this.mat.opacity = 0.92 - 0.25 * S.night;
    }
}
