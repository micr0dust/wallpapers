// 設定管理器 —— 統一管理 Wallpaper Engine 屬性 / 網址參數 / 預設值
// 規則：任何環境（WE、瀏覽器、file://）都不需要 fetch project.json，預設值直接內建。
(function () {
    const DEFAULTS = {
        gameSpeed: 1.0,        // 遊戲速度倍率
        dayLength: 240,        // 一天的長度（秒，遊戲速度 1x 時）
        timeMode: 'auto',      // auto | day | sunset | night
        cameraHeight: 25,      // 相機高度
        cameraRadius: 35,      // 相機距離
        rotationSpeed: 2,      // 旋轉速度（×0.01 rad/s）
        cameraFov: 50,         // 視角
        autoFrame: true,       // 城市變大時，鏡頭自動拉遠
        fogEnabled: true,      // 霧效果
        autoPlay: true,        // 自動遊戲（false = 暫停）
        shadowQuality: 2,      // 0 關 / 1 低 / 2 中 / 3 高
        renderScale: 1.0,      // 渲染解析度倍率
        fpsLimit: 60,          // 影格上限
        treeDensity: 1.0,      // 樹木密度
        clouds: true,          // 雲
        particles: true,       // 粒子（煙、塵土、螢火蟲）
        showHud: false         // 顯示資訊面板
    };

    const Config = {
        values: Object.assign({}, DEFAULTS),
        listeners: [],
        defaults: DEFAULTS,

        // 取得當前值
        get(key) { return this.values[key]; },
        getDefaults() { return Object.assign({}, this.values); },

        // 訂閱變更；fn(key, value, allValues)
        onChange(fn) { this.listeners.push(fn); },

        set(key, value) {
            if (!(key in DEFAULTS)) return;
            const def = DEFAULTS[key];
            if (typeof def === 'number') value = Number(value);
            else if (typeof def === 'boolean') value = (value === true || value === 'true' || value === 1 || value === '1');
            else value = String(value);
            if (typeof def === 'number' && !isFinite(value)) return;
            if (this.values[key] === value) return;
            this.values[key] = value;
            for (const fn of this.listeners) {
                try { fn(key, value, this.values); } catch (e) { console.error('Config listener error', e); }
            }
        },

        // 由 Wallpaper Engine 呼叫：{ key: { value } }
        applyProperties(props) {
            if (!props) return;
            for (const key of Object.keys(props)) {
                const p = props[key];
                if (p && p.value !== undefined) this.set(key, p.value);
            }
        },

        // 網址參數（瀏覽器除錯用）  ?speed=2&day=60&time=night&hud=1&shadow=3
        applyQuery() {
            let q;
            try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
            const map = {
                speed: 'gameSpeed', day: 'dayLength', time: 'timeMode', height: 'cameraHeight', radius: 'cameraRadius',
                rot: 'rotationSpeed', fov: 'cameraFov', frame: 'autoFrame', fog: 'fogEnabled', shadow: 'shadowQuality',
                scale: 'renderScale', fps: 'fpsLimit', trees: 'treeDensity', clouds: 'clouds', particles: 'particles', hud: 'showHud'
            };
            for (const k of Object.keys(map)) if (q.has(k)) this.set(map[k], q.get(k));
        }
    };

    window.Config = Config;
    window.configManager = Config; // 舊名稱相容

    // Wallpaper Engine 屬性監聽器：必須在頁面載入時就存在
    window.wallpaperPropertyListener = {
        applyUserProperties: function (props) { Config.applyProperties(props); },
        setPaused: function (isPaused) { if (window.game) window.game.setSystemPaused(!!isPaused); }
    };
})();
