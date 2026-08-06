/*__gpInputShim*/
// 键鼠防御垫片:游戏 iframe 里的键盘/鼠标默认行为会跟浏览器打架 ——
// Tab 把焦点走出 iframe(后续按键全打到宿主页)、空格/方向键滚动、拖拽 img/canvas
// 触发原生 drag ghost、右键/长按弹菜单、中键自动滚屏、ctrl+滚轮/触板捏合缩放整页。
// 这里统一 preventDefault;从不 stopPropagation —— 游戏照常收到所有事件。
// 触屏侧的对应防御是 CSS(touch-action/user-select/touch-callout,见 INDEX_HTML 模板)。
// 注入方式同 audio-shim/player-shim:模板自带 + serve/快照追补(workspace.ts injectInputShim)。
// 外链 classic script:快照 HTML 不可变但脚本可演进;classic 跨域不要求 CORS,opaque origin 可用。
(function () {
  "use strict";
  if (window.__gpInputShim) return; // 幂等:重复注入零效果
  window.__gpInputShim = true;

  // 游戏内偶有真输入框(如聊天/昵称)—— 编辑态放行,别把打字废了
  function editable(t) {
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable === true);
  }

  // capture 在最外层兜住;preventDefault 不拦截派发,游戏自己的监听不受影响
  var SCROLL_KEYS = { " ": 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };
  window.addEventListener(
    "keydown",
    function (e) {
      if (editable(e.target)) return;
      // Tab:焦点串出 iframe 是主害;方向键顺带挡 alt+←/→ 历史导航,空格挡滚动
      if (e.key === "Tab" || SCROLL_KEYS[e.key] === 1) e.preventDefault();
    },
    { capture: true }
  );

  // 原生 HTML5 拖拽(img/canvas/选区幽灵图)对游戏只有害
  window.addEventListener("dragstart", function (e) { e.preventDefault(); }, { capture: true });

  // 右键菜单(桌面)+ 长按菜单(Android;iOS 走 CSS touch-callout)
  window.addEventListener("contextmenu", function (e) { e.preventDefault(); }, { capture: true });

  // 中键:自动滚屏(win)/粘贴选区(linux)
  window.addEventListener(
    "mousedown",
    function (e) { if (e.button === 1 && !editable(e.target)) e.preventDefault(); },
    { capture: true }
  );

  // ctrl+滚轮 / 触板捏合(浏览器把捏合报成 ctrlKey wheel)= 整页缩放;必须非 passive 才拦得住
  window.addEventListener(
    "wheel",
    function (e) { if (e.ctrlKey) e.preventDefault(); },
    { capture: true, passive: false }
  );
})();
