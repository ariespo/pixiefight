/*__gpPlayerShim*/
// 玩家桥 · 游戏侧薄垫片(设计:仓库根 10-player-identity-and-data.md;协议常量与
// packages/contracts/src/player-bridge.ts 保持一致 —— 改协议两边一起动)。
// 注入方式:index.html 模板自带 + serve/快照追补(lib/agent/workspace.ts injectPlayerShim)。
// 职责:① 暴露 window.gp.player(身份/排行榜/登录引导) ② 把 localStorage 变更异步同步给
// 宿主(透明云存档 —— 游戏代码只管用 localStorage,不需要知道本文件存在)。
// 无宿主(顶层直开 / 宿主没挂桥)→ 数秒后以游客态就绪,游戏照常可玩:身份是增强,不是依赖。
// 这是外链 classic script:发布快照 HTML 不可变,脚本本体仍可演进;classic script 跨域
// 加载不要求 CORS(module 才要求),opaque origin 下直接可用。
(function () {
  "use strict";
  if (window.gp && window.gp.player) return; // 幂等:重复注入零效果

  var isTop = true;
  try { isTop = window.parent === window; } catch (_) { isTop = true; }

  var seq = 0;
  var pending = {};
  var user = null;
  var resolved = false;
  var readyResolve;
  var ready = new Promise(function (res) { readyResolve = res; });
  var listeners = [];
  var t0 = Date.now();

  function rpc(method, params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (isTop) return reject(new Error("gp: no host"));
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      try {
        window.parent.postMessage({ t: "gp:rpc", id: id, method: method, params: params || {} }, "*");
      } catch (e) {
        delete pending[id];
        return reject(e);
      }
      setTimeout(function () {
        if (pending[id]) {
          delete pending[id];
          reject(new Error("gp: rpc timeout"));
        }
      }, timeoutMs || 10000);
    });
  }

  // ---- localStorage 同步层(透明云存档的游戏侧半边) ----
  // STORAGE_SHIM(内存版兜底)按注入顺序先于本脚本运行;这里在其上再包一层变更追踪。
  // 防御:若注入顺序异常导致原生 localStorage 直接抛 SecurityError,落内部 map,游戏不崩。
  var base = null;
  try {
    var probe = window.localStorage;
    probe.getItem("__gp");
    base = probe;
  } catch (_) {
    base = null;
  }
  var memKeys = {};
  function rawGet(k) {
    if (base) { try { return base.getItem(k); } catch (_) {} }
    return Object.prototype.hasOwnProperty.call(memKeys, k) ? memKeys[k] : null;
  }
  function rawSet(k, v) {
    if (base) { try { base.setItem(k, v); return; } catch (_) {} }
    memKeys[k] = String(v);
  }
  function rawRemove(k) {
    if (base) { try { base.removeItem(k); return; } catch (_) {} }
    delete memKeys[k];
  }
  function rawKeys() {
    if (base) {
      try {
        var out = [];
        for (var i = 0; i < base.length; i++) out.push(base.key(i));
        return out;
      } catch (_) {}
    }
    return Object.keys(memKeys);
  }
  function snapshot() {
    var out = {};
    var keys = rawKeys();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k != null) {
        var v = rawGet(k);
        if (v != null) out[k] = v;
      }
    }
    return out;
  }

  var flushTimer = null;
  var dirty = false;
  function scheduleFlush() {
    dirty = true;
    if (isTop || flushTimer) return;
    // 水合(hello)完成前绝不上行:游戏 boot 抢跑写的"新开局 0 态"若被 flush,会覆盖云端旧档
    // (饼干局实测教训)。dirty 保留,finishReady 后补一次 flush(此时快照已远端优先合并)。
    if (!resolved) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      if (!dirty) return;
      dirty = false;
      rpc("storage.flush", { data: snapshot() }).catch(function () {});
    }, 500);
  }
  // 关页兜底:pagehide 时尽力再推一把(postMessage 同步入队,父页此刻通常还活着)。
  // 同样 gate 在水合后 —— 水合前的状态宁可丢也不能覆盖云档。
  window.addEventListener("pagehide", function () {
    if (isTop || !dirty || !resolved) return;
    dirty = false;
    try {
      window.parent.postMessage({ t: "gp:rpc", id: ++seq, method: "storage.flush", params: { data: snapshot() } }, "*");
    } catch (_) {}
  });

  var wrapped = {
    getItem: function (k) { return rawGet(String(k)); },
    setItem: function (k, v) { rawSet(String(k), String(v)); scheduleFlush(); },
    removeItem: function (k) { rawRemove(String(k)); scheduleFlush(); },
    clear: function () {
      var ks = rawKeys();
      for (var i = 0; i < ks.length; i++) if (ks[i] != null) rawRemove(ks[i]);
      scheduleFlush();
    },
    key: function (i) {
      var ks = rawKeys();
      return i >= 0 && i < ks.length ? ks[i] : null;
    }
  };
  try {
    Object.defineProperty(wrapped, "length", { get: function () { return rawKeys().length; } });
  } catch (_) {}
  try {
    Object.defineProperty(window, "localStorage", { value: wrapped, configurable: true });
  } catch (_) {}

  // 远端快照优先合并(boot 早期本地写入少;冲突模型 = last-write-wins,见设计 §3)
  function hydrate(remote) {
    if (!remote || typeof remote !== "object") return;
    for (var k in remote) {
      if (Object.prototype.hasOwnProperty.call(remote, k) && typeof remote[k] === "string") rawSet(k, remote[k]);
    }
    try { window.dispatchEvent(new Event("storage")); } catch (_) {}
  }

  function finishReady(u) {
    if (resolved) return;
    resolved = true;
    user = u || null;
    readyResolve({ user: user });
    if (dirty) scheduleFlush(); // 水合前被压下的写入,现在(合并后)补上行
  }

  window.addEventListener("message", function (e) {
    if (isTop) return;
    var parentWin = null;
    try { parentWin = window.parent; } catch (_) {}
    if (e.source !== parentWin) return; // opaque origin 下 e.origin 恒 "null",只认 source
    var d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.t === "gp:rpc:result") {
      var p = pending[d.id];
      if (!p) return;
      delete pending[d.id];
      if (d.ok) p.resolve(d.data);
      else p.reject(new Error(d.error || "gp: rpc error"));
    } else if (d.t === "gp:player:update") {
      user = d.user || null;
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](user); } catch (_) {}
      }
    }
  });

  // 握手:shim 主动 hello(宿主 render iframe 前就挂好 listener,这里仍防御性重试);
  // 约 4 秒无宿主回应 → 游客态就绪。宿主侧对 hello 有预热缓存,正常一来一回毫秒级。
  if (isTop) {
    finishReady(null);
  } else {
    var tries = 0;
    (function hello() {
      if (resolved) return;
      if (tries++ >= 4) return finishReady(null);
      rpc("hello", { proto: 1 }, 1000).then(
        function (r) {
          if (resolved) return;
          if (r && r.storage) hydrate(r.storage);
          finishReady(r && r.user);
        },
        function () { setTimeout(hello, 250); }
      );
    })();
  }

  window.gp = window.gp || {};
  window.gp.player = {
    /** Promise<{user}>:身份与云存档快照就绪(永不 reject;无宿主 → 游客态)。 */
    ready: ready,
    get user() { return user; },
    onChange: function (cb) {
      if (typeof cb === "function") listeners.push(cb);
      return function () {
        var i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    submitScore: function (score) {
      var s = Number(score);
      if (!isFinite(s)) return Promise.resolve({ error: "score must be a finite number" });
      return rpc("score.submit", { score: s, sessionMs: Date.now() - t0 }).catch(function () {
        return { offline: true };
      });
    },
    topScores: function (limit) {
      return rpc("score.top", { limit: Number(limit) || 20 }).then(
        function (r) { return (r && r.entries) || []; },
        function () { return []; }
      );
    },
    requestLogin: function () { rpc("login.request").catch(function () {}); }
  };

  // 激励广告(16 号文档 §3):宿主代播 Ad Placement API rewarded;无宿主/拦截/冷却/未开通
  // 一律 resolve false/不给奖励,游戏侧只要判返回值即可优雅降级。
  // breakId = 每次调用的幂等键,贯穿宿主 beacon(服务端唯一约束去重)。
  var breakSeq = 0;
  function newBreakId() {
    return "gb" + Date.now().toString(36) + (++breakSeq).toString(36) + Math.random().toString(36).slice(2, 8);
  }
  window.gp.ads = {
    /** Promise<boolean>:现在调用 showRewarded 是否有意义(拦截/冷却/未开通 → false)。 */
    isAvailable: function () {
      return rpc("ads.isAvailable", {}, 5000).then(
        function (r) { return !!(r && r.available); },
        function () { return false; }
      );
    },
    /** Promise<{available, reason?, retryInSec?}>:isAvailable 的详情版。
     *  reason: blocked(拦截环境,建议藏掉广告入口) | cooldown(retryInSec 秒后可再试) |
     *          session_cap | busy | loading | not_enabled。 */
    status: function () {
      return rpc("ads.isAvailable", {}, 5000).then(
        function (r) {
          if (!r) return { available: false };
          return { available: !!r.available, reason: r.reason, retryInSec: r.retryInSec };
        },
        function () { return { available: false }; }
      );
    },
    /** Promise<{rewarded, reason?, retryInSec?}>:看完 true;失败时 reason 同 status(外加
     *  dismissed=中途关闭 / no_ad=无填充 / unresponsive=被拦截 / timeout)。90s 兜底不挂死游戏。 */
    showRewarded: function (placement) {
      return rpc("ads.showRewarded", { placement: placement || null, breakId: newBreakId() }, 90000).then(
        function (r) {
          if (!r) return { rewarded: false };
          return { rewarded: !!r.rewarded, reason: r.reason, retryInSec: r.retryInSec };
        },
        function () { return { rewarded: false }; }
      );
    }
  };

  // 游戏内 AI 对话(21 号文档):宿主转发平台端点(平台钉死 system 前缀+按身份限流),
  // 游戏侧永远拿到结构化结果不抛异常 —— {ok:false} 分支必须写(限流/过载/未开通/无宿主)。
  window.gp.ai = {
    /** chat({system?, context?, messages, temperature?, maxTokens?}) →
     *  Promise<{ok:true, text, usage:{in,out}} | {ok:false, error, retryAfterMs?}>
     *  system = 游戏自己的 system prompt,平台原样透传(不追加不覆盖)—— 想要什么口吻、多长、
     *  甚至结构化输出(自己写"最后一行输出 JSON"),都由游戏说了算。
     *  error: need_login(匿名撞限,引导 gp.player.requestLogin())| rate_limited(带 retryAfterMs)
     *       | busy(过载,稍后重试)| too_long(裁剪 messages 历史)| bad_request(调用形状不对,改代码)
     *       | disabled | offline。永不 reject。 */
    chat: function (opts) {
      opts = opts || {};
      var msgs = Array.isArray(opts.messages) ? opts.messages : [];
      return rpc("ai.chat", {
        system: typeof opts.system === "string" ? opts.system : "",
        context: typeof opts.context === "string" ? opts.context : "",
        messages: msgs,
        temperature: typeof opts.temperature === "number" ? opts.temperature : undefined,
        maxTokens: typeof opts.maxTokens === "number" ? opts.maxTokens : undefined
      }, 30000).then(
        function (r) { return r && typeof r === "object" ? r : { ok: false, error: "offline" }; },
        function () { return { ok: false, error: "offline" }; }
      );
    }
  };
})();
