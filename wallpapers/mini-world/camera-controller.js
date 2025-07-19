// 相機控制器 - 以市中心為中心旋轉，遠處用霧來模糊
class CameraController {
    constructor(camera, scene, renderer) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        
        // 相機參數
        this.radius = 35;  // 旋轉半徑（稍微增加以更好觀察地形）
        this.height = 25;   // 相機高度（適當提高以看到地形起伏）
        this.angle = 0;     // 旋轉角度
        this.rotationSpeed = 0.002; // 旋轉速度（保持緩慢）
        
        // 市中心位置
        this.centerX = 0;
        this.centerZ = 0;
        
        this.setupFog();
        this.setupCamera();
    }

    setupFog() {
        // 設置霧效果，遠處變模糊（調整以適應地形）
        this.scene.fog = new THREE.Fog(0x87CEEB, 60, 250); // 稍微調近霧的開始距離以突出地形細節
        this.renderer.setClearColor(0x87CEEB); // 設置背景色為天藍色
    }

    setupCamera() {
        // 設置相機初始位置
        this.updateCameraPosition();
        
        // 相機總是看向市中心
        this.camera.lookAt(this.centerX, 0, this.centerZ);
    }

    updateCameraPosition() {
        // 計算相機位置（圍繞市中心旋轉）
        this.camera.position.x = this.centerX + Math.cos(this.angle) * this.radius;
        this.camera.position.y = this.height;
        this.camera.position.z = this.centerZ + Math.sin(this.angle) * this.radius;
    }

    update() {
        // 更新旋轉角度
        this.angle += this.rotationSpeed;
        
        // 保持角度在 0-2π 範圍內
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
        
        // 更新相機位置
        this.updateCameraPosition();
        
        // 相機總是看向市中心
        this.camera.lookAt(this.centerX, 0, this.centerZ);
    }

    // 設置新的市中心位置
    setCenterPosition(x, z) {
        this.centerX = x;
        this.centerZ = z;
    }

    // 調整旋轉半徑
    setRadius(radius) {
        this.radius = Math.max(50, Math.min(500, radius)); // 限制半徑範圍
    }

    // 調整相機高度
    setHeight(height) {
        this.height = Math.max(20, Math.min(200, height)); // 限制高度範圍
    }

    // 調整旋轉速度
    setRotationSpeed(speed) {
        this.rotationSpeed = Math.max(0, Math.min(0.02, speed)); // 限制速度範圍
    }

    // 暫停/恢復旋轉
    pause() {
        this.rotationSpeed = 0;
    }

    resume(speed = 0.002) {
        this.rotationSpeed = speed;
    }

    // 獲取當前相機狀態
    getStatus() {
        return {
            angle: this.angle,
            radius: this.radius,
            height: this.height,
            speed: this.rotationSpeed,
            center: { x: this.centerX, z: this.centerZ }
        };
    }

    // 更新霧的顏色（由光照系統調用）
    updateFogColor(color) {
        if (this.scene.fog) {
            this.scene.fog.color.copy(color);
        }
        this.renderer.setClearColor(color);
    }
}
