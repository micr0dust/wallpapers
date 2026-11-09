// 相機控制器 —— 緩慢電影式環繞，隨城市擴張自動拉遠；瀏覽器中可拖曳/滾輪（WE 中無影響）
class CameraController {
    constructor(camera, scene, renderer) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.angle = Math.PI * 0.2;
        this.time = 0;
        this.paused = false;
        this.target = new THREE.Vector3(0, 1.5, 0);
        this.frameScale = 1;
        this.userZoom = 1;
        this.lastInteract = -999;
        this._look = new THREE.Vector3();
        this.bindPointer();
        this.radius = Config.get('cameraRadius');
        this.height = Config.get('cameraHeight');
    }

    bindPointer() {
        // 不提供滑鼠拖曳旋轉（桌面框選時會誤轉）；僅保留滾輪縮放
        const el = window;
        el.addEventListener('wheel', e => {
            this.userZoom = Util.clamp(this.userZoom * (1 + Math.sign(e.deltaY) * 0.08), 0.45, 2.2);
            this.lastInteract = this.time;
        }, { passive: true });
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }
    updateFogColor() {}
    setRadius(r) { this.radius = r; }
    setHeight(h) { this.height = h; }

    // dt: 秒；center/extent: 城市中心與半徑
    update(dt, center, extent) {
        if (this.paused) return;
        this.time += dt;
        const cfg = Config.values;
        this.angle += cfg.rotationSpeed * 0.01 * dt;

        // 自動取景：城市越大，鏡頭越遠
        const wantScale = cfg.autoFrame ? Util.clamp(0.6 + extent / 26, 1, 2.8) : 1;
        const k = 1 - Math.exp(-dt / 3.5);
        this.frameScale += (wantScale - this.frameScale) * k;
        if (this.time - this.lastInteract > 12) this.userZoom += (1 - this.userZoom) * (1 - Math.exp(-dt / 5));

        if (window.__look) center = window.__look;   // 除錯用
        // 視線目標緩慢追隨城市中心
        this.target.x += (center.x - this.target.x) * k;
        this.target.z += (center.z - this.target.z) * k;
        this.target.y = groundY(this.target.x, this.target.z) + 1.5 + this.frameScale * 0.5;

        // 呼吸般的緩慢起伏
        const breathe = 1 + Math.sin(this.time * 0.045) * 0.07;
        const R = cfg.cameraRadius * this.frameScale * this.userZoom * breathe;
        const H = cfg.cameraHeight * this.frameScale * this.userZoom * (1 + Math.sin(this.time * 0.031 + 1.3) * 0.06);
        const cx = this.target.x + Math.cos(this.angle) * R, cz = this.target.z + Math.sin(this.angle) * R;
        const cy = Math.max(this.target.y - 1.5 - this.frameScale * 0.5 + H, groundY(cx, cz) + 5);   // 不鑽進山裡
        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(this.target);
        if (Math.abs(this.camera.fov - cfg.cameraFov) > 0.01) { this.camera.fov = cfg.cameraFov; this.camera.updateProjectionMatrix(); }
    }
}
