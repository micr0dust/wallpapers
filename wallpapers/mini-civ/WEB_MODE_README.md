# 微小文明 - 網頁模式運行指南

## 🌐 在網頁瀏覽器中運行

此 Wallpaper Engine 壁紙同時支持在網頁瀏覽器中運行，所有參數都會從 `project.json` 中讀取。

### 🚀 快速啟動

1. **使用 Python HTTP 服務器**（推薦）：
   ```bash
   # 在項目目錄中運行
   python -m http.server 8000
   # 然後訪問 http://localhost:8000
   ```

2. **使用 Node.js**：
   ```bash
   npx http-server -p 8000
   # 然後訪問 http://localhost:8000
   ```

3. **使用其他本地服務器**：
   - Live Server（VS Code 擴展）
   - Nginx
   - Apache

### ⚠️ 重要注意事項

- **不要**直接用瀏覽器打開 `index.html`（file:// 協議）
- **必須**通過 HTTP 服務器運行以支持 JSON 文件載入
- 確保 `project.json` 文件存在於同一目錄

### 🎮 網頁模式特色

- ✅ 完全讀取 `project.json` 中的所有設定
- ✅ 遊戲速度、相機設定、樹木數量等完全相同
- ✅ 與 Wallpaper Engine 模式行為一致
- ✅ 適合開發和調試
- ✅ 支持所有遊戲功能

### 🔧 配置參數

網頁模式會自動應用以下來自 `project.json` 的默認值：

| 參數 | 描述 |
|------|------|
| `gameSpeed` | 遊戲速度（影響村民移動、建造） |
| `treeCount` | 樹木數量 |
| `cameraHeight` | 相機高度 |
| `cameraRadius` | 相機距離 |
| `rotationSpeed` | 旋轉速度 |
| `fogEnabled` | 霧效果開關 |
| `autoPlay` | 自動遊戲開關 |

### 🐛 故障排除

如果遇到載入問題：

1. **檢查控制台**：按 F12 查看詳細錯誤信息
2. **確認文件存在**：檢查 `project.json` 是否在正確位置
3. **使用 HTTP 服務器**：不要用 `file://` 協議
4. **檢查 JSON 格式**：確保 `project.json` 格式正確

### 💡 開發提示

- 修改 `project.json` 後需要重新載入頁面
- 使用瀏覽器開發工具可以即時調試
- 控制台會顯示詳細的載入和配置信息
