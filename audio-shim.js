/*__gpAudioShim*/
// 音频解锁垫片 —— 治 iOS Safari「游戏没声音」三件套:
// ① AudioContext 在 iOS 上默认 suspended,必须在真实用户手势回调里 resume() 才出声。
//    生成游戏/模板普遍没有手势驱动的解锁(fps 模板只在发声时顺手 resume,定时器触发的首发声
//    在 iOS 上会被拒),这里统一兜底:包住构造器追踪所有实例,首个手势里全量 resume。
// ② 来电/Siri/切后台会把 ctx 打成 interrupted/suspended 且不自动恢复 → visibilitychange 补 resume。
// ③ 侧边静音拨键默认静掉 WebAudio → audioSession 声明 playback(Safari 16.4+),游戏与视频同待遇。
// 注入方式与 player-shim 相同:index.html 模板自带 + serve/快照追补(lib/agent/workspace.ts
// injectAudioShim)。外链 classic script:发布快照 HTML 不可变,脚本本体仍可演进;classic
// 跨域加载不要求 CORS,opaque origin 下直接可用。必须先于 game.js(module,天然后执行)运行,
// 否则包不住构造器。
// ④ 宿主静音开关:parent postMessage {t:"gp.audio.mute"} → suspend 全部 ctx + 拦 resume()
//    (游戏手势里常自带 ctx.resume(),不拦会自己「解除静音」)+ HTMLMedia 兜底 muted。
// ⑤ speechSynthesis(语音播报)是独立于 WebAudio 的第三条通路,iOS 上同样要手势解锁,
//    上面几条全罩不住它 —— 见下方 speech 段。
(function () {
  "use strict";
  if (window.__gpAudio) return; // 幂等:重复注入零效果
  var state = { unlocked: false, muted: false, ctxs: [] };
  window.__gpAudio = state;

  // 静音拨键规避:games 归 playback 类(同 YouTube),而非默认的「随铃声静音」。
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch (_) {}

  // 包构造器追踪实例。prototype 共享 → instanceof/子类均不受影响;实例数是个位数,数组不设上限。
  function wrap(name) {
    var Orig = window[name];
    if (typeof Orig !== "function") return;
    var Patched = function (opts) {
      var ctx = opts === undefined ? new Orig() : new Orig(opts);
      state.ctxs.push(ctx);
      // 解锁后才创建的 ctx(如懒初始化的音频管理器):文档已有用户激活,直接 resume 通常成功
      if (state.unlocked && !state.muted && ctx.state !== "running") ctx.resume().catch(function () {});
      // 静音期间新建的 ctx:有用户激活时浏览器让它直接 running 起跑 → 就地按住
      if (state.muted && ctx.state === "running") ctx.suspend().catch(function () {});
      return ctx;
    };
    Patched.prototype = Orig.prototype;
    window[name] = Patched;
    // 拦 resume:游戏自己的手势回调普遍带 ctx.resume(),静音期间放行等于自行解除静音。
    // __gpResumePatched 防重:Safari 下 webkitAudioContext 与 AudioContext 可能共享 prototype。
    if (!Orig.prototype.__gpResumePatched) {
      Orig.prototype.__gpResumePatched = true;
      var origResume = Orig.prototype.resume;
      Orig.prototype.resume = function () {
        if (state.muted) return Promise.resolve(); // 假装成功:游戏逻辑不受影响,解除静音时统一补 resume
        return origResume.apply(this);
      };
    }
  }
  wrap("AudioContext");
  wrap("webkitAudioContext");

  // ── speechSynthesis 通路 ── 四个坑,与 WebAudio 三件套一一对应:
  // ⑤ 首次 speak() 必须在用户手势调用栈内(iOS Safari;桌面 Chrome 同样拦),否则静默丢弃
  //    不报错 → 解锁前缓存 utterance,首个手势里回放;缓存为空则踢一发空白 utterance 占坑,
  //    此后定时器/游戏事件里的播报即可直达。
  // ⑥ getVoices() 首次为空,要等 voiceschanged;init/手势各摸一次触发预热(游戏按 lang 挑
  //    voice 的写法在 iOS 上才有得挑)。
  // ⑦ 切后台/来电后卡 paused 不自恢复 → 手势/回前台里补 resume(),但尊重游戏自己调过的
  //    pause()(gamePaused 标记),别替它解除暂停。
  // ⑧ 宿主静音:speech 没有音量旋钮,静音瞬间 cancel() 掐掉在播的(引擎自然补发 end/error,
  //    游戏对话链不断);静音期间吞掉 speak 并按文本长度估时补发 end 事件,onend 队列不悬挂。
  var speech = (function () {
    var sp = window.speechSynthesis;
    if (!sp || typeof sp.speak !== "function" || typeof window.SpeechSynthesisUtterance !== "function") return null;
    var st = { kicked: false, gamePaused: false, buf: [] };
    var origSpeak = sp.speak.bind(sp);
    var origCancel = sp.cancel.bind(sp);
    var origPause = sp.pause.bind(sp);
    var origResume = sp.resume.bind(sp);
    try { sp.getVoices(); } catch (_) {}

    // 吞掉的 utterance 补发 end:时长按 ~60ms/字符估,对话队列节奏不失真也不机关枪
    function fakeEnd(u) {
      var ms = Math.min(8000, 300 + String(u.text || "").length * 60);
      setTimeout(function () {
        try {
          var ev;
          try { ev = new SpeechSynthesisEvent("end", { utterance: u }); }
          catch (_) { ev = new Event("end"); } // 老引擎构造器缺席:裸 end 事件,onend 照样触发
          u.dispatchEvent(ev);
        } catch (_) {}
      }, ms);
    }

    // 实例方法就地盖(games 拿到的都是同一个 window.speechSynthesis 单例)
    sp.speak = function (u) {
      if (!u) return;
      if (state.muted) { fakeEnd(u); return; }
      if (!st.kicked) {
        // 未解锁:缓存回放。封顶 16,溢出挤掉最老的并补 end(播报密集的多半是循环旁白,保新弃旧)
        if (st.buf.length >= 16) fakeEnd(st.buf.shift());
        st.buf.push(u);
        return;
      }
      origSpeak(u);
    };
    sp.cancel = function () {
      st.buf.length = 0; // 游戏意图是「全部闭嘴」:未播的缓存一并清掉
      st.gamePaused = false;
      origCancel();
    };
    sp.pause = function () { st.gamePaused = true; origPause(); };
    sp.resume = function () { st.gamePaused = false; origResume(); };

    return {
      // 手势栈内调用:回放缓存或踢空白占坑。静音期间不解锁(kicked 不置位,继续缓存),
      // 解除静音后的下一个手势再补 —— 解锁必须发生在手势里,unmute 的 postMessage 不算。
      unlock: function () {
        if (state.muted) return;
        try { sp.getVoices(); } catch (_) {}
        if (st.buf.length) {
          st.kicked = true;
          var q = st.buf.splice(0);
          for (var i = 0; i < q.length; i++) { try { origSpeak(q[i]); } catch (_) {} }
        } else if (!st.kicked) {
          st.kicked = true;
          try {
            var u = new window.SpeechSynthesisUtterance(" ");
            u.volume = 0;
            origSpeak(u);
          } catch (_) {}
        }
      },
      resume: function () {
        if (!st.gamePaused) { try { origResume(); } catch (_) {} }
      },
      mute: function () {
        var q = st.buf.splice(0);
        for (var i = 0; i < q.length; i++) fakeEnd(q[i]);
        try { origCancel(); } catch (_) {}
      },
    };
  })();

  function resumeAll() {
    if (state.muted) return; // 静音期间解锁/回前台都不出声;解除静音时会统一补
    for (var i = 0; i < state.ctxs.length; i++) {
      var ctx = state.ctxs[i];
      // iOS 特有 "interrupted" 态也归这里:resume() 是幂等的,running 之外一律试
      if (ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(function () {});
    }
    if (speech) speech.resume(); // 卡 paused 兜底(坑⑦):非 paused 时是幂等空操作
  }

  function unlock() {
    state.unlocked = true;
    resumeAll();
    if (speech) speech.unlock();
    // 老 WebKit 解锁输出通道还要真播过一次:每个 ctx 踢一发 1 帧静音 buffer(一次性,几乎零开销)
    for (var i = 0; i < state.ctxs.length; i++) {
      var ctx = state.ctxs[i];
      if (ctx.__gpKicked) continue;
      ctx.__gpKicked = true;
      try {
        var src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch (_) {}
    }
  }

  // 监听常驻不摘:打断(来电/Siri)后的恢复同样需要手势,常驻 resume 是幂等兜底,每次手势开销 ~0。
  // capture+passive:游戏层 stopPropagation/preventDefault 都拦不住、也不被拖慢。
  var evs = ["pointerdown", "touchend", "keydown"];
  for (var i = 0; i < evs.length; i++) {
    document.addEventListener(evs[i], unlock, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") resumeAll();
  });

  // ── 宿主静音通道 ──
  // HTMLMedia 兜底:政策是 WebAudio-first,`new Audio()` 是少数——包构造器登记(封顶防泄漏),
  // 切静音时连同 DOM 里的 audio/video 一起设 muted。
  var mediaEls = [];
  var OrigAudio = window.Audio;
  if (typeof OrigAudio === "function") {
    var PatchedAudio = function (src) {
      var el = src === undefined ? new OrigAudio() : new OrigAudio(src);
      if (mediaEls.length < 256) mediaEls.push(el);
      if (state.muted) el.muted = true;
      return el;
    };
    PatchedAudio.prototype = OrigAudio.prototype;
    window.Audio = PatchedAudio;
  }
  function setMuted(m) {
    state.muted = m;
    if (m && speech) speech.mute();
    var els = mediaEls.concat([].slice.call(document.querySelectorAll("audio,video")));
    for (var i = 0; i < els.length; i++) {
      try { els[i].muted = m; } catch (_) {}
    }
    for (var j = 0; j < state.ctxs.length; j++) {
      var ctx = state.ctxs[j];
      try {
        if (m && ctx.state === "running") ctx.suspend().catch(function () {});
      } catch (_) {}
    }
    if (!m) resumeAll(); // 解除静音:静音前在跑的、以及静音期间被拦掉 resume 的,一并补上
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    // 只认 parent(宿主 Studio/分享页);游戏自身/嵌套 iframe 的消息不碰
    if (!d || d.t !== "gp.audio.mute" || e.source !== window.parent) return;
    setMuted(!!d.muted);
  });
})();
