// 村民外觀 —— 低多邊形小人（身體、頭、帽子、手腳擺動、工具、背負木材）
const VillagerRig = {
    geo: null, mats: new Map(),
    tunics: [0xb5533c, 0x3f6fb0, 0x4f8a4a, 0xd1a23c, 0x8a4fa0, 0xc86a8a, 0x3a8c8c, 0x7a5a3a],
    skins: [0xf1c9a5, 0xe0ac86, 0xc58c64, 0x8d5a3b],
    hats: [0x6b4a2a, 0x8a3a2a, 0x3a4a6a, 0x2f2f2f, 0xc9a24a],

    material(hex) {
        let m = this.mats.get(hex);
        if (!m) { m = new THREE.MeshLambertMaterial({ color: Util.color(hex) }); this.mats.set(hex, m); }
        return m;
    },
    init() {
        if (this.geo) return;
        const arm = new THREE.BoxGeometry(0.11, 0.46, 0.11); arm.translate(0, -0.21, 0);
        const leg = new THREE.BoxGeometry(0.15, 0.5, 0.15); leg.translate(0, -0.25, 0);
        const body = new THREE.CylinderGeometry(0.19, 0.26, 0.6, 8); body.translate(0, 0.3, 0);
        this.geo = {
            arm, leg, body,
            head: new THREE.SphereGeometry(0.18, 8, 6),
            hat: new THREE.ConeGeometry(0.25, 0.26, 8),
            cap: new THREE.CylinderGeometry(0.2, 0.21, 0.09, 8),
            handle: new THREE.CylinderGeometry(0.025, 0.025, 0.62, 5),
            axeHead: new THREE.BoxGeometry(0.22, 0.14, 0.04),
            hammerHead: new THREE.BoxGeometry(0.2, 0.1, 0.1),
            hoeHead: new THREE.BoxGeometry(0.2, 0.04, 0.09),
            log: new THREE.CylinderGeometry(0.075, 0.075, 0.58, 6),
            sheaf: new THREE.ConeGeometry(0.16, 0.4, 6)
        };
    },
    build() {
        this.init();
        const G = this.geo, M = (h) => this.material(h);
        const tunic = Util.pick(this.tunics), skin = Util.pick(this.skins), pants = 0x4a3f36;
        const root = new THREE.Group();     // 整體（傾身、彈跳）
        const mk = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; root.add(o); return o; };
        const legL = mk(G.leg, M(pants), -0.09, 0.5, 0), legR = mk(G.leg, M(pants), 0.09, 0.5, 0);
        const torso = mk(G.body, M(tunic), 0, 0.5, 0);
        const head = mk(G.head, M(skin), 0, 1.28, 0);
        const hatKind = Math.random();
        let hat = null;
        if (hatKind < 0.4) hat = mk(G.hat, M(Util.pick(this.hats)), 0, 1.5, 0);
        else if (hatKind < 0.75) hat = mk(G.cap, M(Util.pick(this.hats)), 0, 1.43, 0);
        const armL = new THREE.Group(), armR = new THREE.Group();
        armL.position.set(-0.27, 1.05, 0); armR.position.set(0.27, 1.05, 0);
        const aL = new THREE.Mesh(G.arm, M(tunic)); aL.castShadow = true; armL.add(aL);
        const aR = new THREE.Mesh(G.arm, M(tunic)); aR.castShadow = true; armR.add(aR);
        root.add(armL, armR);
        // 工具（掛在右手）
        const tools = {};
        const handle = (len) => { const h = new THREE.Mesh(G.handle, M(0x7a5a3a)); h.position.y = -0.4; return h; };
        tools.axe = new THREE.Group(); { const h = handle(); const hd = new THREE.Mesh(G.axeHead, M(0x9aa0a6)); hd.position.set(0.1, -0.68, 0); tools.axe.add(h, hd); }
        tools.hammer = new THREE.Group(); { const h = handle(); const hd = new THREE.Mesh(G.hammerHead, M(0x6c6f73)); hd.position.set(0, -0.7, 0); tools.hammer.add(h, hd); }
        tools.hoe = new THREE.Group(); { const h = handle(); const hd = new THREE.Mesh(G.hoeHead, M(0x8a8f94)); hd.position.set(0, -0.72, 0.08); tools.hoe.add(h, hd); }
        for (const k of Object.keys(tools)) { tools[k].visible = false; tools[k].rotation.x = Math.PI / 2 * 0.0; armR.add(tools[k]); tools[k].position.set(0, -0.4, 0.05); tools[k].rotation.x = -1.2; }
        // 背負物
        const log = new THREE.Mesh(G.log, M(0xa57a48)); log.rotation.z = Math.PI / 2 - 0.35; log.position.set(0.0, 1.0, -0.2); log.visible = false; root.add(log);
        const log2 = new THREE.Mesh(G.log, M(0x94693a)); log2.rotation.z = Math.PI / 2 - 0.2; log2.position.set(0.02, 1.12, -0.22); log2.visible = false; root.add(log2);
        const sheaf = new THREE.Mesh(G.sheaf, M(0xe2c050)); sheaf.position.set(0.0, 0.95, -0.28); sheaf.visible = false; root.add(sheaf);
        const scale = 0.92 + Math.random() * 0.2;
        root.scale.setScalar(scale);
        return { root, legL, legR, armL, armR, head, torso, tools, log, log2, sheaf };
    }
};
