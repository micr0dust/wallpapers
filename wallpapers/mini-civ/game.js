// 主遊戲類別 - 統一管理整個遊戲循環和UI交互
class Game {
    constructor() {
        this.world = null;
        this.isRunning = false;
        this.animationId = null;
        
        // UI 元素
        this.ui = {
            woodCount: null,
            population: null,
            villagers: null,
            farmWorkers: null,
            timeDisplay: null,
            pauseBtn: null,
            speedUpBtn: null
        };
        
        // 建造模式已移除 - 現在由AI自動控制
    }

    // 初始化遊戲
    init() {
        try {
            this.setupCanvas();
            this.setupWorld();
            this.setupUI();
            this.setupEventListeners();
            this.startGameLoop();
            
            // 遊戲初始化完成
        } catch (error) {
            console.error('遊戲初始化失敗:', error);
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('找不到遊戲畫布元素');
        }
    }

    setupWorld() {
        this.world = new World();
        this.world.init(this.canvas);
    }

    setupUI() {
        // 獲取 UI 元素引用
        this.ui.woodCount = document.getElementById('wood-count');
        this.ui.population = document.getElementById('population');
        this.ui.villagers = document.getElementById('villagers');
        this.ui.farmWorkers = document.getElementById('farm-workers');
        this.ui.timeDisplay = document.getElementById('time-display');
        this.ui.pauseBtn = document.getElementById('pause-btn');
        this.ui.speedUpBtn = document.getElementById('speed-up');

        // 檢查必要的 UI 元素
        for (const [key, element] of Object.entries(this.ui)) {
            if (!element) {
                console.warn(`找不到 UI 元素: ${key}`);
            }
        }
    }

    setupEventListeners() {
        // 窗口大小調整
        window.addEventListener('resize', () => {
            this.world.handleResize();
        });

        // 控制按鈕事件
        if (this.ui.pauseBtn) {
            this.ui.pauseBtn.addEventListener('click', () => {
                const isPaused = this.world.togglePause();
                const pauseSpan = this.ui.pauseBtn.querySelector('span:last-child');
                pauseSpan.textContent = isPaused ? '繼續' : '暫停';
            });
        }

        if (this.ui.speedUpBtn) {
            this.ui.speedUpBtn.addEventListener('click', () => {
                const currentSpeed = this.world.getGameState().gameSpeed;
                const newSpeed = currentSpeed >= 3 ? 0.5 : currentSpeed * 2;
                this.world.setGameSpeed(newSpeed);
                const speedSpan = this.ui.speedUpBtn.querySelector('span:last-child');
                speedSpan.textContent = `${newSpeed.toFixed(1)}x`;
            });
        }

        // 鍵盤事件（僅保留暫停功能）
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                if (this.ui.pauseBtn) {
                    this.ui.pauseBtn.click();
                }
            }
        });
    }

    // 遊戲主循環
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        try {
            // 更新世界
            this.world.update(currentTime);
            
            // 更新 UI
            this.updateUI();
            
            // 渲染
            this.world.render();
            
            // 請求下一幀
            this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        } catch (error) {
            console.error('遊戲循環錯誤:', error);
            this.stop();
        }
    }

    updateUI() {
        const gameState = this.world.getGameState();
        
        // 更新資源顯示
        if (this.ui.woodCount) {
            this.ui.woodCount.textContent = gameState.woodInventory;
        }
        
        if (this.ui.population) {
            this.ui.population.textContent = gameState.population;
        }
        
        if (this.ui.villagers) {
            this.ui.villagers.textContent = gameState.villagers;
        }

        if (this.ui.farmWorkers) {
            this.ui.farmWorkers.textContent = gameState.farmWorkers || 0;
        }

        if (this.ui.timeDisplay) {
            this.ui.timeDisplay.textContent = gameState.timeOfDay || '12:00';
        }
    }

    // 開始遊戲循環
    startGameLoop() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        // 遊戲循環已開始
    }

    // 停止遊戲
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // 遊戲已停止
    }

    // 銷毀遊戲
    destroy() {
        this.stop();
        
        if (this.world) {
            this.world.destroy();
            this.world = null;
        }
        
        // 遊戲已銷毀
    }

    // 獲取遊戲狀態
    getStatus() {
        return {
            isRunning: this.isRunning,
            world: this.world ? this.world.getGameState() : null
        };
    }
    
    // 暫停遊戲（Wallpaper Engine 設定）
    pause() {
        if (this.world && !this.world.isPaused) {
            const isPaused = this.world.togglePause();
            if (this.ui.pauseBtn) {
                const pauseSpan = this.ui.pauseBtn.querySelector('span:last-child');
                if (pauseSpan) {
                    pauseSpan.textContent = isPaused ? '繼續' : '暫停';
                }
            }
            console.log('遊戲已暫停');
        }
    }
    
    // 恢復遊戲（Wallpaper Engine 設定）
    resume() {
        if (this.world && this.world.isPaused) {
            const isPaused = this.world.togglePause();
            if (this.ui.pauseBtn) {
                const pauseSpan = this.ui.pauseBtn.querySelector('span:last-child');
                if (pauseSpan) {
                    pauseSpan.textContent = isPaused ? '繼續' : '暫停';
                }
            }
            console.log('遊戲已恢復');
        }
    }
}
