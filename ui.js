// 共享 UI 原语：像素文字工厂、面板绘制、点击热区表、纹理登记。
import * as PIXI from 'pixi.js';
import { C } from './data.js';

export const FONT = 'FusionPixel-12px-zh_hans';
export const TEX                               = {};

let textRes = 3;
const liveTexts              = [];
const boundedTextRecords = [];

export function setTextRes(r        ) {
  textRes = Math.max(1, Math.round(r));
  for (const t of liveTexts) t.resolution = textRes;
}

export function txt(str        , size = 12, color = C.bone)            {
  const t = new PIXI.Text({ text: str, style: { fontFamily: FONT, fontSize: size, fill: color, lineHeight: size + 3 } });
  t.resolution = textRes;
  t.roundPixels = true;
  liveTexts.push(t);
  return t;
}

// 固定尺寸卡片必须通过这个原语画长文本：先按真实 PIXI 字体度量换行，
// 超出最大高度时二分截断并补省略号，避免“布局按限制高度走、文字却继续往下画”。
export function boundedText(parent, str, x, y, w, maxHeight, size = 12, color = C.bone) {
  const full = String(str ?? '');
  const t = txt(full, size, color);
  t.style.wordWrap = true;
  t.style.wordWrapWidth = Math.max(1, w);
  t.style.breakWords = true;
  t.x = Math.round(x);
  t.y = Math.round(y);
  let truncated = false;
  if (maxHeight > 0 && t.height > maxHeight) {
    const chars = Array.from(full);
    let lo = 0;
    let hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      t.text = `${chars.slice(0, mid).join('').replace(/[\s，。；：、]+$/u, '')}…`;
      if (t.height <= maxHeight) lo = mid;
      else hi = mid - 1;
    }
    t.text = `${chars.slice(0, lo).join('').replace(/[\s，。；：、]+$/u, '')}…`;
    // 极窄区域也必须服从硬边界。
    while (lo > 0 && t.height > maxHeight) {
      lo--;
      t.text = `${chars.slice(0, lo).join('').replace(/[\s，。；：、]+$/u, '')}…`;
    }
    if (t.height > maxHeight) t.text = '';
    truncated = true;
  }
  parent.addChild(t);
  boundedTextRecords.push({
    text: full, displayed: t.text, x: t.x, y: t.y, width: w, maxHeight,
    actualWidth: t.width, actualHeight: t.height, truncated,
  });
  return { text: t, height: Math.min(t.height, maxHeight || t.height), truncated };
}

export function paginateText(str, w, maxHeight, size = 12) {
  const pages = [];
  let rest = Array.from(String(str ?? ''));
  const probe = new PIXI.Text({ text: '', style: {
    fontFamily: FONT, fontSize: size, lineHeight: size + 3, wordWrap: true,
    wordWrapWidth: Math.max(1, w), breakWords: true,
  } });
  while (rest.length) {
    probe.text = rest.join('');
    if (probe.height <= maxHeight) { pages.push(rest.join('')); break; }
    let lo = 1, hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      probe.text = rest.slice(0, mid).join('');
      if (probe.height <= maxHeight) lo = mid;
      else hi = mid - 1;
    }
    const take = Math.max(1, lo);
    pages.push(rest.slice(0, take).join('').replace(/^\s+|\s+$/gu, ''));
    rest = rest.slice(take);
  }
  probe.destroy();
  return pages.length ? pages : [''];
}

export function resetBoundedTextAudit() { boundedTextRecords.length = 0; }
export function boundedTextAudit() {
  return {
    records: boundedTextRecords.map((r) => ({ ...r })),
    violations: boundedTextRecords.filter((r) => r.actualHeight > r.maxHeight + 0.01 || r.actualWidth > r.width + 1)
      .map((r) => ({ ...r })),
  };
}

export function label(parent                , str        , x        , y        , size = 12, color = C.bone) {
  const t = txt(str, size, color);
  t.x = Math.round(x);
  t.y = Math.round(y);
  parent.addChild(t);
  return t;
}

export function labelC(parent                , str        , cx        , y        , size = 12, color = C.bone) {
  const t = label(parent, str, 0, y, size, color);
  t.x = Math.round(cx - t.width / 2);
  return t;
}

export function panel(g               , x        , y        , w        , h        , fill = C.wall, border = C.wallLit) {
  g.rect(x, y, w, h).fill(fill).stroke({ width: 1, color: border, alignment: 0 });
}

// 带素材边框的面板：内部底色画在 Graphics 上（位于层底），边框作为 9-slice 精灵盖在上方，
// 因此进度条/高亮等动态图元仍能画在面板内而不被遮住。
export function panelF(g               , parent                , kind           ,
                       x        , y        , w        , h        , fill                = C.wall) {
  if (fill != null) g.rect(x, y, w, h).fill(fill);
  const f = frame(parent, kind, x, y, w, h);
  if (!f) g.rect(x, y, w, h).stroke({ width: 1, color: C.wallLit, alignment: 0 });
}

// 9-slice 像素边框：素材为 12×12（border 4）或 10×10（border 2）手绘砖框，
// 角块不拉伸、边块整像素平铺 —— 面板尺寸再变也不会出现斜边或模糊。
;                                                                                                                  
const FRAME_TEX                                                = {
  stone: { tex: 'ui-frame-stone', b: 4 },
  inset: { tex: 'ui-frame-inset', b: 4 },
  gold: { tex: 'ui-frame-gold', b: 4 },
  arcane: { tex: 'ui-frame-arcane', b: 4 },
  scroll: { tex: 'ui-frame-scroll', b: 4 },
  btn: { tex: 'ui-btn', b: 2 },
  'btn-fill': { tex: 'ui-btn-fill', b: 2 },
  tab: { tex: 'ui-tab', b: 2 },
  'tab-fill': { tex: 'ui-tab-fill', b: 2 },
};

export function frame(parent                , kind           , x        , y        , w        , h        ,
                      opts                                    = {}) {
  const def = FRAME_TEX[kind];
  const tex = TEX[def.tex];
  if (!tex) { return null; }
  const s = new PIXI.NineSliceSprite({
    texture: tex,
    leftWidth: def.b, rightWidth: def.b, topHeight: def.b, bottomHeight: def.b,
    width: Math.max(def.b * 2, Math.round(w)), height: Math.max(def.b * 2, Math.round(h)),
  });
  s.x = Math.round(x);
  s.y = Math.round(y);
  s.roundPixels = true;
  if (opts.tint != null) s.tint = opts.tint;
  if (opts.alpha != null) s.alpha = opts.alpha;
  parent.addChild(s);
  return s;
}

export function bar(g               , x        , y        , w        , h        , p        , col        , back = C.ink) {
  g.rect(x, y, w, h).fill(back);
  const fw = Math.max(0, Math.round(w * Math.min(1, Math.max(0, p))));
  if (fw > 0) g.rect(x, y, fw, h).fill(col);
}

export function sprite(name        , x        , y        , size         , flip = false) {
  const tex = TEX[name];
  const s = new PIXI.Sprite(tex || PIXI.Texture.WHITE);
  s.anchor.set(0.5, 1);
  if (size && tex) s.scale.set(size / tex.width);
  if (flip) s.scale.x *= -1;
  s.x = Math.round(x);
  s.y = Math.round(y);
  s.roundPixels = true;
  return s;
}

;                                                                                

export class Hits {
  list        = [];
  clear() { this.list.length = 0; }
  add(x        , y        , w        , h        , fn            ) { this.list.push({ x, y, w, h, fn }); }
  test(px        , py        , pad = 0)          {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) { h.fn(); return true; }
    }
    // On a coarse pointer, allow a small nearest-target halo around compact
    // pixel controls. Large blockers/panels are deliberately excluded.
    if (pad > 0) {
      let best = null, bestScore = Infinity, bestIndex = -1;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const h = this.list[i];
        if (h.w * h.h > 4000) continue;
        const dx = px < h.x ? h.x - px : px > h.x + h.w ? px - (h.x + h.w) : 0;
        const dy = py < h.y ? h.y - py : py > h.y + h.h ? py - (h.y + h.h) : 0;
        if (dx > pad || dy > pad) continue;
        const score = dx * dx + dy * dy;
        if (score < bestScore || (score === bestScore && i > bestIndex)) {
          best = h; bestScore = score; bestIndex = i;
        }
      }
      if (best) { best.fn(); return true; }
    }
    return false;
  }
}

// 像素按钮：9-slice 实心底 + 描边环（两张均可 tint；无素材时退回 1px 矩形）
export function button(g               , parent                , hits      , x        , y        , w        , h        ,
                      text        , fn            , opts                                                                                                              = {}) {
  const enabled = opts.enabled !== false;
  const fill = enabled ? (opts.fill ?? C.wallLit) : C.wall;
  const border = enabled ? (opts.border ?? C.bone) : C.stoneLit;
  const color = enabled ? (opts.color ?? C.bone) : C.stoneLit;
  const kind = opts.frame ?? 'btn';
  const base = frame(parent, (kind === 'tab' ? 'tab-fill' : 'btn-fill')             , x, y, w, h, { tint: fill });
  if (base) frame(parent, kind             , x, y, w, h, { tint: border });
  else g.rect(x, y, w, h).fill(fill).stroke({ width: 1, color: border, alignment: 0 });
  const t = txt(text, opts.size ?? 12, color);
  t.x = Math.round(x + (w - t.width) / 2);
  t.y = Math.round(y + (h - t.height) / 2);
  parent.addChild(t);
  if (enabled) hits.add(x, y, w, h, fn);
}
