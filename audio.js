// WebAudio 播放：SFX 一次性解码缓存，BGM 循环带交叉淡入。首个 pointerdown 后才启动。
                                                   

const SFX = ['tab', 'buy', 'place', 'hit', 'heavy', 'heal', 'trap', 'break', 'throne', 'coin', 'win', 'lose']         ;
                                         

let ctx             = null;
const buffers = new Map                     ();
let master                  = null;
let musicGain                  = null;
let sfxGain                  = null;
let currentTrack = '';
let currentSrc                               = null;
let unlocked = false;
export let muted = false;

async function loadInto(path        , key        ) {
  if (!ctx || buffers.has(key)) return;
  try {
    const res = await fetch(path);
    if (!res.ok) return;
    const arr = await res.arrayBuffer();
    buffers.set(key, await ctx.decodeAudioData(arr));
  } catch {
    /* 缺失音频不应阻断游戏 */
  }
}

export function initAudio() {
  if (ctx) return;
  const AC                      = (window.AudioContext || (window                                                          ).webkitAudioContext);
  ctx = new AC()       ;
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(master);
  for (const id of SFX) void loadInto(`assets/sfx-${id}.wav`, `sfx-${id}`);
  void loadInto('assets/lib/oga-music/audio/dungeon/crystal-cave-chiptune.mp3', 'bgm-manage');
  void loadInto('assets/lib/oga-nes-shooter/audio/boss/nes-shooter-boss.mp3', 'bgm-battle');
}

export function unlockAudio() {
  if (!ctx) initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  unlocked = true;
}

export function playSfx(id       , rate = 1) {
  if (!ctx || !unlocked || muted || !sfxGain) return;
  const buf = buffers.get(`sfx-${id}`);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(sfxGain);
  src.start();
}

let hitStep = 0;
export function playHit(heavy         ) {
  const rates = [0.94, 1.0, 1.07];
  hitStep = (hitStep + 1) % 3;
  playSfx(heavy ? 'heavy' : 'hit', rates[hitStep]);
}

let pendingTrack                                     = null;

export function playMusic(name                             ) {
  if (!ctx || !unlocked || !musicGain) { pendingTrack = name; return; }
  if (currentTrack === name && currentSrc) return;
  const buf = buffers.get(name);
  if (currentSrc) {
    try { currentSrc.stop(ctx.currentTime + 0.35); } catch { /* already stopped */ }
    currentSrc = null;
  }
  currentTrack = name;
  if (!buf) {
    // mp3 还在解码：记下待播曲目，tickAudio 会重试（否则首屏乐曲永远不会响）
    pendingTrack = name;
    return;
  }
  pendingTrack = null;
  if (muted) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4);
  src.connect(g);
  g.connect(musicGain);
  src.start();
  currentSrc = src;
}

export function setMuted(v         ) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.9;
}

// 每帧轻量重试：解锁时或解码完成前请求的曲目补上
export function tickAudio() {
  if (!pendingTrack || !unlocked || !ctx) return;
  if (!buffers.has(pendingTrack)) return;
  const t = pendingTrack;
  pendingTrack = null;
  currentTrack = '';
  playMusic(t);
}

export function audioReady() {
  return unlocked;
}

// 自测用只读快照：无头环境听不到声，只能验证解锁与曲目路由
export function audioSnapshot() {
  return {
    unlocked,
    muted,
    track: currentTrack,
    playing: !!currentSrc,
    decoded: [...buffers.keys()].sort(),
  };
}
