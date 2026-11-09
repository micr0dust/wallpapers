// 遊戲主控 —— 迴圈、影格限制、暫停、縮放
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.world = new World();
        this.running = false;
        this.systemPaused = false;
        this.lastRender = 0;
        this.loop = this.loop.bind(this);
    }

    init() {
        this.world.init(this.canvas);
        window.addEventListener('resize', () => this.world.handleResize());
        document.addEventListener('visibilitychange', () => { this.world.lastNow = null; });
        // 除錯：?ff=秒數 先快轉模擬
        try {
            const q = new URLSearchParams(window.location.search);
            if (q.has('ff')) this.world.fastForward(parseFloat(q.get('ff')) || 0);
        } catch (e) {}
        return true;
    }

    start() {
        if (this.running) return;
        this.running = true;
        requestAnimationFrame(this.loop);
    }

    setSystemPaused(p) { this.systemPaused = p; this.world.lastNow = null; }

    loop(now) {
        if (!this.running) return;
        requestAnimationFrame(this.loop);
        const limit = Config.get('fpsLimit');
        if (limit > 0 && now - this.lastRender < 1000 / limit - 2) return;
        this.lastRender = now;
        if (this.systemPaused) return;
        this.world.update(now);
        this.world.render();
        if (!this.shown) {
            this.shown = true;
            const f = document.getElementById('fade');
            if (f) requestAnimationFrame(() => f.classList.add('gone'));
        }
    }
}
