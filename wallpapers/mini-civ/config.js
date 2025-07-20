// 配置管理器 - 從 project.json 讀取默認值
class ConfigManager {
    constructor() {
        this.config = null;
        this.defaultValues = null;
    }

    // 檢測是否為 Wallpaper Engine 環境
    isWallpaperEngine() {
        // 多重檢測方式確保準確性
        const hasWPListener = typeof window.wallpaperPropertyListener !== 'undefined';
        const hasWPProtocol = window.location.protocol === 'wallpaper-engine:';
        const hasWPUserAgent = navigator.userAgent.includes('Wallpaper Engine') || navigator.userAgent.includes('WebKit');
        const isFileProtocol = window.location.protocol === 'file:';
        
        // 在 WE 環境中通常是 file:// 協議且沒有 localhost
        const likelyWE = isFileProtocol && !window.location.href.includes('localhost');
        
        return hasWPListener || hasWPProtocol || hasWPUserAgent || likelyWE;
    }

    // 異步載入配置
    async loadConfig() {
        console.log('🔄 開始載入配置...');
        console.log('環境檢測:', {
            isWallpaperEngine: this.isWallpaperEngine(),
            isBrowser: !this.isWallpaperEngine(),
            location: window.location?.href || 'unknown'
        });
        
        // 在 Wallpaper Engine 環境中，直接使用內建默認值
        if (this.isWallpaperEngine()) {
            console.log('🎯 Wallpaper Engine 環境：使用內建默認值');
            this.defaultValues = {
                gameSpeed: 1.0,
                cameraHeight: 80,
                cameraRadius: 150,
                rotationSpeed: 0.002,
                fogEnabled: true,
                autoPlay: true
            };
            console.log('✅ Wallpaper Engine 配置載入成功:', this.defaultValues);
            return this.defaultValues;
        }
        
        // 在網頁環境中，嘗試載入 project.json
        try {
            const response = await fetch('./project.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.config = data;
            
            // 從 project.json 提取默認值
            if (data.general && data.general.properties) {
                const props = data.general.properties;
                
                this.defaultValues = {
                    gameSpeed: props.gameSpeed?.value,
                    cameraHeight: props.cameraHeight?.value,
                    cameraRadius: props.cameraRadius?.value,
                    rotationSpeed: props.rotationSpeed?.value,
                    fogEnabled: props.fogEnabled?.value,
                    autoPlay: props.autoPlay?.value
                };
                
                console.log('✅ 網頁環境配置載入成功:', this.defaultValues);
                console.log('🌐 網頁環境同樣支持 project.json 參數讀取');
                return this.defaultValues;
            } else {
                throw new Error('project.json 格式錯誤：找不到 general.properties');
            }
        } catch (error) {
            console.error('❌ 無法載入 project.json:', error.message);
            
            // 為網頁環境提供更詳細的錯誤信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('💡 網頁環境提示：請確保:');
                console.error('   1. project.json 文件存在於同一目錄');
                console.error('   2. 使用 HTTP 服務器運行（不是 file:// 協議）');
                console.error('   3. 服務器支持 .json 文件類型');
            }
            
            throw error;
        }
    }

    // 同步獲取默認值（提供後備方案）
    getDefaults() {
        if (!this.defaultValues) {
            // 如果沒有載入配置，使用硬編碼的默認值
            console.warn('⚠️ 配置未載入，使用硬編碼默認值');
            return {
                gameSpeed: 1.0,
                cameraHeight: 25,
                cameraRadius: 35,
                rotationSpeed: 0.002,
                fogEnabled: true,
                autoPlay: true
            };
        }
        return this.defaultValues;
    }

    // 獲取特定屬性的默認值
    getDefault(propertyName) {
        if (!this.defaultValues) {
            throw new Error('配置尚未載入，請先調用 loadConfig()');
        }
        return this.defaultValues[propertyName];
    }

    // 獲取完整的 project.json 配置
    getFullConfig() {
        return this.config;
    }
}

// 全域配置管理器實例
window.configManager = new ConfigManager();
