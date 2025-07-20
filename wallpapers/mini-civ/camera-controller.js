// 相機控制器 - 以市中心為中心旋轉，遠處用霧來模糊
class CameraController {
    constructor(camera, scene, renderer) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        
        // 從配置管理器讀取默認值，如果失敗則使用安全的默認值
        let defaults = {};
        try {
            if (window.configManager) {
                defaults = window.configManager.getDefaults();
            }
        } catch (error) {
            console.warn('⚠️ 無法獲取配置，使用內建默認值:', error.message);
            // Wallpaper Engine 安全默認值（與 project.json 一致）
            defaults = {
                cameraRadius: 35,
                cameraHeight: 25,
                rotationSpeed: 0.002,
                fogEnabled: true
            };
        }
        
        // 相機參數 - 從配置或使用默認值
        this.radius = defaults.cameraRadius;  // 旋轉半徑
        this.height = defaults.cameraHeight;   // 相機高度
        this.angle = 0;     // 旋轉角度
        this.rotationSpeed = defaults.rotationSpeed; // 旋轉速度
        
        // 市中心位置
        this.centerX = 0;
        this.centerZ = 0;
        
        this.setupFog(defaults.fogEnabled !== false);
        this.setupCamera();
        
        console.log('相機控制器初始化，使用配置:', {
            radius: this.radius,
            height: this.height,
            rotationSpeed: this.rotationSpeed,
            fogEnabled: defaults.fogEnabled !== false
        });
    }

    setupFog(enabled) {
        // 設置霧效果，使用指數霧創造更濃密的效果（適應200x200地圖）
        if (enabled) {
            this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015); // 使用指數霧，密度0.015平衡可見度和遮蔽效果
        } else {
            this.scene.fog = null;
        }
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
        this.radius = Math.max(30, Math.min(300, radius)); // 限制半徑範圍（適應200x200地圖）
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
