# 加载进度条设计文档

## Goal

为游戏初始加载阶段添加一个像素风格的进度条覆盖层，缓解资源（贴图、字体）加载时的白屏/黑屏等待感，并让用户感知到加载进度。

## Architecture

采用 **HTML/CSS 覆盖层** 方案：

- 在 `index.html` 中新增 `#loading` 覆盖层，使用 CSS 模拟像素边框和填充条。
- 在 `game.js` 的 `boot()` 函数里，每完成一项资源加载就更新进度条宽度和百分比文字。
- 所有资源加载完成后，隐藏覆盖层并继续原有的游戏初始化流程。

## Components

### 1. HTML 结构（`index.html`）

```html
<div id="loading">
  <div id="loading-panel">
    <div id="loading-text">Loading 0%</div>
    <div id="loading-bar"><div id="loading-fill"></div></div>
  </div>
</div>
```

### 2. CSS 样式（`index.html` 内 `<style>`）

- `#loading`：fixed 全屏，居中 flex，背景 `#0b0d12`（与游戏背景一致）。
- `#loading-panel`：深色面板，像素边框（使用 `box-shadow` 或实线边框模拟），内边距。
- `#loading-bar`：固定宽度（如 240px），高度 12px，边框。
- `#loading-fill`：像素填充色（如 `#d4a017`），宽度从 0% 过渡到当前百分比。
- `#loading-text`：等宽字体，白色，显示 `Loading 0%`。

### 3. JS 更新逻辑（`game.js`）

- 在 `boot()` 中计算总任务数：
  - 字体加载 = 1
  - `TEXTURES` 数组长度 = N
  - `total = 1 + N`
- 每完成一项加载，`done++`，调用 `updateLoading(done, total)`：
  - 更新 `#loading-fill` 宽度。
  - 更新 `#loading-text` 为 `Loading X%`。
- 全部完成后调用 `hideLoading()`：
  - 直接隐藏或淡隐 `#loading`，露出下方的 `app.canvas`。

## Data Flow

```
页面打开
  → 显示 #loading（HTML/CSS 立刻渲染）
  → boot() 初始化 PIXI.Application
  → 加载字体（done++）
  → 循环加载 TEXTURES（每完成一个 done++）
  → 更新进度条
  → 全部完成
  → 隐藏 #loading
  → 继续 loadSave / render / ticker
```

## Error Handling

- 单个贴图加载失败时仍计入进度，游戏继续运行（与现有 `catch {}` 行为一致）。
- 字体加载失败同样计入进度，避免进度条卡死。
- 无论加载成功或失败，覆盖层都会在资源遍历结束后隐藏，保证用户能进入游戏。

## Testing

- 打开游戏页面，确认进度条从 0% 平滑增长到 100%。
- 加载完成后进度条消失，游戏主界面正常显示。
- 浏览器控制台无新报错。
- 检查窗口缩放时进度条仍居中。
