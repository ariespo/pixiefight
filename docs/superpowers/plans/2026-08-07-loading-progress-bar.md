# 加载进度条实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为游戏初始加载阶段添加一个像素风格的 HTML/CSS 进度条覆盖层，并在 `game.js` 的 `boot()` 中根据资源加载进度实时更新。

**Architecture:** 在 `index.html` 中新增 `#loading` 覆盖层与像素风样式；在 `game.js` 中新增 `setLoading`/`hideLoading` 辅助函数，在字体和贴图加载过程中更新进度，加载完成后移除覆盖层。

**Tech Stack:** 纯浏览器 JavaScript、PIXI.js、内联 CSS。

## Global Constraints

- 进度条必须在页面打开后立刻可见，不依赖 PIXI 初始化。
- 单个资源加载失败不得阻塞进度条或中断启动流程。
- 样式需与游戏深色像素 UI 保持一致。
- 无自动化测试框架，以浏览器手动验证为准。

---

### Task 1: 在 `index.html` 中添加加载覆盖层与像素风样式

**Files:**
- Modify: `index.html:1`（在 `#app` 后插入 HTML）
- Modify: `index.html:1`（在现有 `<style>` 中追加 CSS）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: 无
- Produces: `#loading`、`#loading-panel`、`#loading-text`、`#loading-bar`、`#loading-fill` DOM 元素与 `.hidden` 类

- [ ] **Step 1: 在 `#app` 后插入加载覆盖层 HTML**

在 `<body>` 中，把下面的 DOM 放在 `<div id="app"></div>` 之后：

```html
<div id="loading">
  <div id="loading-panel">
    <div id="loading-text">Loading 0%</div>
    <div id="loading-bar"><div id="loading-fill"></div></div>
  </div>
</div>
```

- [ ] **Step 2: 在 `<style>` 中添加进度条样式**

在现有 `<style>` 块末尾追加：

```css
#loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b0d12;
  z-index: 9999;
  transition: opacity 0.3s ease;
}
#loading.hidden {
  opacity: 0;
  pointer-events: none;
}
#loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: #14161d;
  border: 2px solid #5a4a30;
  box-shadow: 4px 4px 0 #000;
}
#loading-text {
  font-family: monospace;
  font-size: 14px;
  color: #e8dcc0;
}
#loading-bar {
  width: 240px;
  height: 12px;
  background: #0b0d12;
  border: 2px solid #5a4a30;
}
#loading-fill {
  width: 0%;
  height: 100%;
  background: #d4a017;
  transition: width 0.1s linear;
}
```

- [ ] **Step 3: 浏览器验证覆盖层可见**

启动本地服务器，打开页面。在 `game.js` 未加载完成前，应能看到居中的 "Loading 0%" 与空进度条。

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "ui: add pixel-style loading overlay"
```

---

### Task 2: 在 `game.js` 中根据资源加载进度更新并隐藏进度条

**Files:**
- Modify: `game.js:317-318`（在 `viewScale` 变量后添加辅助函数）
- Modify: `game.js:319-358`（修改 `boot()` 函数）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: `TEXTURES`（从 `data.js` 导入的贴图列表）
- Produces: `setLoading(percent, label?)`、`hideLoading()`

- [ ] **Step 1: 添加进度条更新辅助函数**

在 `let viewScale = 1;` 之后、`async function boot()` 之前插入：

```js
const loadingEl   = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const loadingFill = document.getElementById('loading-fill');

function setLoading(percent, label) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  if (loadingFill) loadingFill.style.width = `${pct}%`;
  if (loadingText) loadingText.textContent = label ?? `Loading ${pct}%`;
}

function hideLoading() {
  if (!loadingEl) return;
  loadingEl.classList.add('hidden');
  setTimeout(() => loadingEl.remove(), 350);
}
```

- [ ] **Step 2: 修改 `boot()` 以更新进度**

把 `boot()` 中的字体加载与贴图循环改成如下形式（其余代码保持不变）：

```js
async function boot() {
  const host = document.getElementById('app') ;
  await app.init({ background: C.bg, resizeTo: host, antialias: false, roundPixels: true });
  host.appendChild(app.canvas);
  app.canvas.style.imageRendering = 'pixelated';

  const totalTasks = 1 + TEXTURES.length;
  let doneTasks = 0;

  try {
    const f = new FontFace(FONT, `url('assets/lib/fusion-pixel/FusionPixel-12px-zh_hans.woff2')`);
    await f.load();
    document.fonts.add(f);
  } catch { /* 字体缺失时退回系统字体 */ }
  doneTasks += 1;
  setLoading((doneTasks / totalTasks) * 100);

  for (const name of TEXTURES) {
    try {
      const t = await PIXI.Assets.load(`assets/${name}.png`);
      t.source.scaleMode = 'nearest';
      TEX[name] = t;
    } catch { /* 缺图用白块占位，不阻断 */ }
    doneTasks += 1;
    setLoading((doneTasks / totalTasks) * 100);
  }

  hideLoading();

  app.stage.addChild(backdrop, root);
  // ... 后续原有代码不变 ...
}
```

- [ ] **Step 3: 运行语法检查**

```bash
node --check game.js
```

- [ ] **Step 4: 浏览器验证加载过程**

打开游戏，确认：
- 进度条从 0% 平滑增长到 100%。
- 加载完成后进度条消失，游戏主界面正常显示。
- 控制台无新报错。

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat: wire loading progress bar to asset loading"
```

---

## Self-Review

1. **Spec coverage：** 设计文档中的 HTML 覆盖层、CSS 像素样式、JS 更新、错误处理、测试均已有对应任务/步骤覆盖。
2. **Placeholder scan：** 无 TBD/TODO/模糊描述。
3. **Type一致性：** 新函数签名在 Task 2 中定义并自用，无跨任务引用问题。
