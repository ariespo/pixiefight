import * as PIXI from 'pixi.js';
import { C, VIEW_W, VIEW_H, MONSTERS, HERO_CLASSES, THEMES, TRAPS, RAIDS, AFFIXES, AURAS, LEVEL_MULT, UPGRADE_COST, XP_PER_LEVEL, TEXTURES, HERO_LV_MULT, SYNERGY, synergyOf, kindById, registerKinds, unregisterKind, isCustomKind, isEliteKind } from './data.js';
import { GEARS, GEAR_SLOTS, GEAR_CAP, MELT_MANA, REFORGE_MANA, FRAMES, RUNES, TEMPERS, FORGED_CAP, craftCost, craftKind, craftName, frameById, runeById, runesFor, temperById, planValid, registerForged, gearById, gearEff, gearSet,                                                               } from './gear.js';
                                                                                        
import { createBattle, stepBattle, ROOM_W, affixText } from './battle.js';
                                                                      
import { CATS, PARTS, AFFIXES as PART_AFFIXES, AFFIX_POWER, AFFIX_BUDGET, PART_BUDGET, DIY_AFFIX_CAP, affixDraftCost, affixPowerById, allLooks, clampAffixDraft, registerDiyAffixes, GRAFT_CAP, GRAFT_MANA, GRAFT_PULL_MANA, graftCostOf, graftKind, AFFIX_CAP, STITCH_MANA, CUSTOM_CAP, DIY_CAP, POWER_MENU, autoName, boneCost, deriveKind, draftCost, partById, registerDiy, affixById, selectedAffixes, unlockedParts, manaCost as affixMana, powerById } from './modules.js';
                                                                                                                          
import { getBackend, hasBackend, llmStatus, loadCfg, loadMode, requestAffix, requestPart, restoreBackend, saveCfg, saveMode, setBackend, requestScene as llmScene } from './llm.js';
                                        
                                           
import { applyEffects, fillText, getProvider, requestScene, sceneById, setProvider, testConds, localProvider, SCENES } from './story.js';
                                                                      
import { READ_PATHS, foldMods, modSummary } from './vars.js';
                                                                        
import { CHAMP_CAP, CHAMP_LV_CAP, CHEM_INFO, HEAL_MANA, POT_MULT, POT_NAME, REROLL_MANA, REST_MANA, RESPEC_MANA,
  TALENTS, TALENT_CAP, TALENT_TIERS, TIER_LV, TRAITS, WOUND_CAP,
  auraText, canLevel, champStats, chemOf, chemistry, fatigueTier, newChamp, nextTitle, pendingTier, randomName, respecCost,
  rollCands, talentSlots, tickFatigue, titleOf, upCostOf, xpNeed } from './heroes.js';
                                                         
import { TEX, txt, label, labelC, panel, panelF, frame, bar, sprite, Hits, button, setTextRes, FONT } from './ui.js';
import { initAudio, unlockAudio, playSfx, playHit, playMusic, setMuted, audioSnapshot, tickAudio } from './audio.js';

// ---------- 存档 ----------
               
                                                                                          
                                                                     
                                                                     
                     
                                         
  
             
                                                              
                          
                   
                                     
                                 
                               
                    
                                    
                                        
                                  
                                                       
                                                          
                                                                                        
                                      
                                                         
                                                                      
                                                                                                           
  

const SAVE_KEY = 'yqh-save-v2';

function freshSave()       {
  return {
    bone: 95, mana: 18, raidNo: 1, uidNext: 1,
    monsters: [],
    rooms: [0, 1, 2, 3].map(() => ({ theme: 'stone'           , trap: 'none'          , front: null, back: null, leader: null, flank: null })),
    themes: ['stone'], traps: ['none'],
    sealLv: 0, trapLv: 0,
    best: {}, reports: [],
    overtime: false, otRaid: 13,
    customs: [], cstNext: 1,
    diy: [], diyNext: 1,
    diyAf: [], diyAfNext: 1,
    muted: false, seenClasses: [], tutorial: 0,
    champs: [], champNext: 1, cands: [], candRaid: 0, candNext: 1, champPot: {},
    vault: [], forged: [], fgNext: 1,
    story: { vars: {}, mods: [], unlocks: [], seen: [], credits: 1 },
  };
}

let S       = freshSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw)                 ;
    const base = freshSave();
    S = { ...base, ...p, rooms: p.rooms && p.rooms.length === 4 ? p.rooms : base.rooms };  } catch { /* 存档损坏则用新档 */ }
  sanitizeSave();
  syncDiyAffixes();   // 词缀先注册：图纸清洗要拿最终的 AFFIXES 表判定
  syncDiy();
  syncCustoms();
}

// 自定义词缀与 DIY 部件同一套：存档只存草案，读档重新注册进 AFFIXES
function syncDiyAffixes() {
  const list = (S.diyAf ?? []).filter((d) => d && d.draft && ['core', 'head', 'arm', 'legs'].includes(d.cat)
    && Array.isArray(d.draft.powers) && d.draft.powers.length > 0);
  S.diyAf = list;
  registerDiyAffixes(list);
  // 清掉引用了已消失词缀的图纸槽位，否则 deriveKind 拿不到词缀，数值与文案会不一致
  const ok = new Set(PART_AFFIXES.map((a) => a.id));
  for (const c of S.customs) {
    if (!c.affixes) continue;
    for (const k of ['core', 'head', 'arm', 'legs']             ) {
      const id = c.affixes[k];
      if (id && !ok.has(id)) delete c.affixes[k];
    }
  }
}

// DIY 部件存档只存草案，读档重新注册进 PARTS（与拼接体只存部件选择同一套思路）
function syncDiy() {
  const list = (S.diy ?? []).filter((d) => d && d.draft && ['core', 'head', 'arm', 'legs'].includes(d.cat));
  S.diy = list;
  registerDiy(list);
}

// 自制装备：存档只存图纸（胚体/铭文/淬火），读档时派生成 GearKind 注册进 gearById。
// 必须在校验"统领身上的装备 / 仓库里的 id"之前跑完，否则自制件会被当成失效 id 清掉。
function syncForged() {
  if (!Array.isArray(S.forged)) S.forged = [];
  if (typeof S.fgNext !== 'number') S.fgNext = 1;
  S.forged = S.forged.filter((f) => f && typeof f.id === 'string' && f.plan && !planValid(f.plan)).slice(0, FORGED_CAP);
  registerForged(S.forged);
}

// 旧版本/损坏存档可能带未知陷阱或悬空引用，清洗后再渲染，否则查表会 undefined 白屏
function sanitizeSave() {
  syncForged();
  const uids = new Set(S.monsters.map((m) => m.uid));
  for (const r of S.rooms) {
    if (!(r.trap in TRAPS)) r.trap = 'none';
    if (r.front != null && !uids.has(r.front)) r.front = null;
    if (r.back != null && !uids.has(r.back)) r.back = null;
    // 旧档没有统领/侧翼字段；同时保证统领席只坐传奇、侧翼没统领就清空
    if (r.leader === undefined) r.leader = null;
    if (r.flank === undefined) r.flank = null;
    if (r.leader != null && !S.champs.some((c) => c.uid === r.leader)) r.leader = null;
    if (r.flank != null && !uids.has(r.flank)) r.flank = null;
    if (r.leader == null) r.flank = null;
  }
  // 一只怪只能占一个位；重复引用时保留第一个
  const usedLead = new Set        ();
  for (const r of S.rooms) {
    if (r.leader != null) { if (usedLead.has(r.leader)) { r.leader = null; r.flank = null; } else usedLead.add(r.leader); }
  }
  const used = new Set        ();
  for (const r of S.rooms) {
    for (const w of ['front', 'back', 'flank']         ) {
      const v = r[w];
      if (v == null) continue;
      if (used.has(v)) r[w] = null; else used.add(v);
    }
  }
  S.traps = S.traps.filter((t) => t in TRAPS);
  S.monsters = S.monsters.filter((m) => kindById(m.kind) != null || S.customs.some((d) => d.id === m.kind));
  // 改造件：清掉已不存在的部件 id（拆解 DIY 造件后旧存档里可能残留），并截到上限
  for (const m of S.monsters) {
    if (!Array.isArray(m.graft)) { delete m.graft; continue; }
    const ok = m.graft.filter((id) => typeof id === 'string' && partById(id)).slice(0, GRAFT_CAP);
    if (ok.length) m.graft = ok; else delete m.graft;
  }
  // 旧版存档（章节制）没有这些字段，缺失一律补空；顺便丢掉已不存在的解锁 id
  const st = S.story                                      ;
  S.story = {
    vars: st && typeof st.vars === 'object' && st.vars ? st.vars : {},
    mods: Array.isArray(st?.mods) ? st .mods.filter((m) => m && typeof m.id === 'string') : [],
    unlocks: Array.isArray(st?.unlocks) ? st .unlocks.filter((u) => typeof u === 'string') : [],
    seen: Array.isArray(st?.seen) ? st .seen.filter((x) => typeof x === 'string') : [],
    credits: typeof st?.credits === 'number' ? Math.max(0, Math.min(9, st.credits)) : 1,
  };
  // 英雄名册：等级/经验/专精数量都要自洽，坏档不能把培养页打崩
  if (!Array.isArray(S.champs)) S.champs = [];
  if (typeof S.champNext !== 'number') S.champNext = 1;
  if (!Array.isArray(S.cands)) S.cands = [];
  if (typeof S.candNext !== 'number') S.candNext = 1;
  if (typeof S.candRaid !== 'number') S.candRaid = 0;
  if (!S.champPot || typeof S.champPot !== 'object') S.champPot = {};
  S.champs = S.champs.filter((c) => c && typeof c.uid === 'number' && kindById(c.race)?.legend && typeof c.name === 'string');
  for (const c of S.champs) {
    c.lv = Math.max(1, Math.min(CHAMP_LV_CAP, Math.round(c.lv || 1)));
    c.xp = Math.max(0, Math.round(c.xp || 0));
    c.fatigue = Math.max(0, Math.min(100, Math.round(c.fatigue || 0)));
    c.battles = Math.max(0, Math.round(c.battles || 0));
    c.kills = Math.max(0, Math.round(c.kills || 0));
    c.wounds = Math.max(0, Math.min(WOUND_CAP, Math.round(c.wounds || 0)));
    c.traits = (Array.isArray(c.traits) ? c.traits : []).filter((t) => t in TRAITS).slice(0, 2);
    c.talents = (Array.isArray(c.talents) ? c.talents : []).filter((t) => t in TALENTS).slice(0, talentSlots(c));
    // 装备：旧档没有该字段；槽位与 id 都要有效，且同一件不能同时穿在两处
    const eq           = {};
    const raw = (c.gear && typeof c.gear === 'object' ? c.gear : {})                           ;
    for (const sl of GEAR_SLOTS) {
      const id = raw[sl.id];
      const g = typeof id === 'string' ? gearById(id) : undefined;
      if (g && g.slot === sl.id) eq[sl.id] = g.id;
    }
    c.gear = eq;
  }
  if (!Array.isArray(S.vault)) S.vault = [];
  S.vault = S.vault.filter((id) => typeof id === 'string' && gearById(id)).slice(0, GEAR_CAP);
  if (S.champs.length > CHAMP_CAP) S.champs.length = CHAMP_CAP;
  if (!Array.isArray(S.diy)) S.diy = [];
  if (typeof S.diyNext !== 'number') S.diyNext = 1;
  if (!Array.isArray(S.diyAf)) S.diyAf = [];
  if (typeof S.diyAfNext !== 'number') S.diyAfNext = 1;
  S.story.unlocks = S.story.unlocks.filter((u) => {
    const [kind, id] = u.split(':');
    if (kind === 'part') return !!partById(id);
    if (kind === 'affix') return PART_AFFIXES.some((a) => a.id === id);
    return false;
  });
}

// 拼接体存档只保存部件选择；数值/文案每次重新派生并注册到种类表，改部件表即改全部已造怪物。
function syncCustoms() {
  const list                = [];
  for (const d of S.customs) {
    if (!partById(d.parts.core) || !partById(d.parts.head) || !partById(d.parts.arm) || !partById(d.parts.legs)) continue;
    list.push(deriveKind(d));
  }
  registerKinds(list);
}
let saveFlash = 0;
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); saveFlash = 1.2; } catch { /* 忽略写入失败 */ }
}

// ---------- 派生数据 ----------
const sealMax = () => 100 + S.sealLv * 25;
const trapPower = () => 1 + S.trapLv * 0.25;
const monKind = (id        ) => kindById(id) ?? MONSTERS[0];
const allKinds = () => [...MONSTERS.filter((m) => !m.legend), ...S.customs.map((d) => deriveKind(d))];
const eliteOpen = (k                       ) => S.raidNo >= (k.eliteMin ?? 1) || S.overtime;
const instById = (uid               ) => (uid == null ? undefined : S.monsters.find((m) => m.uid === uid));
// 一只具体怪物的最终形态 = 基础种类 + 它自己的改造件
const instKind = (inst             ) => graftKind(monKind(inst.kind), inst.graft);
                                                     
const SLOT_NAME                          = { leader: '统领', front: '前排', back: '后排', flank: '侧翼' };
function roomOf(uid        ) {
  for (let i = 0; i < 4; i++) {
    const r = S.rooms[i];
    if (r.front === uid || r.back === uid || r.leader === uid || r.flank === uid) return i;
  }
  return -1;
}
// 传奇统领按袭击轮次逐个开放，避免第一轮就能砸出满编统领
const champById = (uid                           ) => (uid == null ? undefined : S.champs.find((c) => c.uid === uid));
const chemMap = () => chemistry(S.champs, seatedChampUids()).map;
const statOf = (c       , chem = chemMap()) => champStats(c, POT_MULT[S.champPot[c.uid] ?? 0], chemOf(chem, c.uid));
function champStatMap() {
  const chem = chemMap();
  const m                                                = {};
  for (const c of S.champs) m[c.uid] = statOf(c, chem);
  return m;
}
const seatedChampUids = () => S.rooms.map((r) => r.leader).filter((u)              => u != null);
const roomOfChamp = (uid        ) => S.rooms.findIndex((r) => r.leader === uid);
function currentRaid()          {
  if (!S.overtime && S.raidNo <= 12) return RAIDS[S.raidNo - 1];
  return makeOvertimeRaid(S.otRaid);
}
function makeOvertimeRaid(no        )          {
  const lv = 8 + (no - 12) * 2;
  const pool = ['knight', 'archer', 'cleric', 'mage', 'rogue', 'paladin', 'berserker', 'ranger', 'bard'];
  const bosses = ['captain', 'inquisitor', 'swordmaster'];
  const members = [{ cls: bosses[(no - 13) % bosses.length], lv: lv + 1 }];
  for (let i = 0; i < 4; i++) members.push({ cls: pool[(no * 3 + i * 2) % pool.length], lv });
  const affPool              = [['haste'], ['brave'], ['shield'], ['holywater', 'brave'], ['haste', 'shield']];
  return {
    no, title: `加班勇者 第${no - 12}批`, members,
    affixes: affPool[(no - 13) % affPool.length],
    reward: { bone: 200 + (no - 12) * 20, mana: 40 + (no - 12) * 4 },
  };
}
function canUpgradeAny() {
  return S.monsters.some((m) => m.lv < 5 && m.xp >= XP_PER_LEVEL[m.lv - 1] && S.bone >= UPGRADE_COST[m.lv - 1]);
}
function shopHasAffordable() {
  const items = shopItems();
  return items.some((it) => !it.owned && S.mana >= it.cost);
}

// ---------- 全局运行状态 ----------
;                                                                              
const TABS                              = [
  { id: 'throne', name: '王座' }, { id: 'dungeon', name: '地牢' },
  { id: 'hero', name: '英雄' }, { id: 'mob', name: '怪群' },
  { id: 'shop', name: '工坊' }, { id: 'report', name: '战报' },
  { id: 'story', name: '秘闻' },
];
let tab      = 'throne';
                                                        
let screen         = 'manage';

let sel                                                                                                                                                                            = null;
let heroSel                = null;          // 当前查看的英雄 uid
let heroTab                       = 'roster';
let heroView                             = 'stat';   // 名册右侧详情的三个视图
let gearSlotSel           = 'crown';                 // 装备页当前编辑的槽
let reportIdx = 0;
let battle                = null;
let speed = 1;
let paused = false;
let toast = { text: '', t: 0 };
let endingT = 0;
let pendingResultRaid = 0;

function say(text        ) { toast = { text, t: 2.2 }; }

// ---------- PIXI 启动 ----------
const app = new PIXI.Application();
const root = new PIXI.Container();
const backdrop = new PIXI.Container();
const uiLayer = new PIXI.Container();
const uiGfx = new PIXI.Graphics();
const battleLayer = new PIXI.Container();
const modalLayer = new PIXI.Container();
const modalGfx = new PIXI.Graphics();
const overlay = new PIXI.Container();
const hits = new Hits();
let viewScale = 1;

async function boot() {
  const host = document.getElementById('app') ;
  await app.init({ background: C.bg, resizeTo: host, antialias: false, roundPixels: true });
  host.appendChild(app.canvas);
  app.canvas.style.imageRendering = 'pixelated';

  try {
    const f = new FontFace(FONT, `url('assets/lib/fusion-pixel/FusionPixel-12px-zh_hans.woff2')`);
    await f.load();
    document.fonts.add(f);
  } catch { /* 字体缺失时退回系统字体 */ }

  for (const name of TEXTURES) {
    try {
      const t = await PIXI.Assets.load(`assets/${name}.png`);
      t.source.scaleMode = 'nearest';
      TEX[name] = t;
    } catch { /* 缺图用白块占位，不阻断 */ }
  }

  app.stage.addChild(backdrop, root);
  root.addChild(battleLayer, uiLayer, modalLayer, overlay);
  uiLayer.addChild(uiGfx);
  modalLayer.addChild(modalGfx);

  loadSave();
  restoreBackend();
  setProvider(hybridProvider);
  setMuted(S.muted);
  initAudio();
  buildBackdrop();
  for (const d of S.customs) buildCustomTex(d);
  layout();
  window.addEventListener('resize', layout);
  bindInput();
  render();

  app.ticker.add((tk) => tick(Math.min(tk.deltaMS / 1000, 0.05)));
  window.__gpReady = true;
}

// 拼接贴图：部件 PNG 是 8× 放大的像素图，缩回 1/8 在 24×24 逻辑画布上拼合（与现有怪物同为24格，
// 保证像素颗度一致），再烘焙成单张纹理供经营页与战斗共用。坐标单位：格。
const PART_SLOT                                            = {
  legs: { x: 4, y: 11 },
  core: { x: 2, y: 4 },
  arm: { x: 10, y: 7 },
  head: { x: 9, y: 0 },
};
const CST_GRID = 24;

const staleTex                       = [];

function buildCustomTex(d           ) {
  const key = `tex-${d.id}`;
  const cont = new PIXI.Container();
  // 部件素材本身朝右，拼接体要和其它怪物一样朝左：整组镜像一次。
  // 逐件 flip 会把臂/头挪到身体另一侧，拼出错位怪。
  const body = new PIXI.Container();
  body.scale.x = -1;
  body.x = CST_GRID;
  cont.addChild(body);
  const order            = ['legs', 'core', 'arm', 'head'];
  const INV = 1 / 8;
  for (const cat of order) {
    const p = partById(d.parts[cat]);
    if (!p) continue;
    const tex = TEX[p.tex];
    if (!tex) continue;
    const s = new PIXI.Sprite(tex);
    s.scale.set(INV);
    s.x = PART_SLOT[cat].x;
    s.y = PART_SLOT[cat].y;
    body.addChild(s);
  }
  const frame = new PIXI.Graphics();
  frame.rect(0, 0, CST_GRID, CST_GRID).fill({ color: 0x000000, alpha: 0 });
  cont.addChildAt(frame, 0);
  try {
    const old = TEX[key];
    const rt = app.renderer.generateTexture({ target: cont, resolution: 8, antialias: false });
    rt.source.scaleMode = 'nearest';
    TEX[key] = rt;
    // 旧纹理可能仍被当前画面上的精灵引用（重组/读档时会重烘），立刻 destroy 会让这些精灵在下一帧炸掉；
    // 推进回收队列，等 clearUi 把旧精灵销毁之后再释放。
    if (old && old !== rt && 'destroy' in old) staleTex.push(old                      );
  } catch { /* 烘焙失败时保留白块占位，不阻断 */ }
  cont.destroy({ children: true });
}

let bdTile                           = null;
let bdFrame = new PIXI.Graphics();
function buildBackdrop() {
  if (TEX['tile-wall']) {
    bdTile = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: 100, height: 100 });
    bdTile.tileScale.set(0.5);
    bdTile.tint = 0x2a2438;
    backdrop.addChild(bdTile);
  }
  backdrop.addChild(bdFrame);
}

function layout() {
  const w = app.screen.width, h = app.screen.height;
  viewScale = Math.min(w / VIEW_W, h / VIEW_H);
  root.scale.set(viewScale);
  root.x = Math.round((w - VIEW_W * viewScale) / 2);
  root.y = Math.round((h - VIEW_H * viewScale) / 2);
  setTextRes(Math.min(4, Math.max(1, Math.ceil(viewScale))));
  if (bdTile) { bdTile.width = w; bdTile.height = h; }
  bdFrame.clear();
  bdFrame.rect(root.x - 2, root.y - 2, VIEW_W * viewScale + 4, VIEW_H * viewScale + 4).stroke({ width: 2, color: C.ink, alignment: 0 });
  portrait = h > w * 1.15;
  positionNameInput();
  positionForgeInput();
  positionStoryInput();
  render();
}
let portrait = false;

function unlockAndPlay() {
  unlockAudio();
  // 启动时调的 playMusic 会因未解锁而空转，首次手势后必须补上
  playMusic(screen === 'battle' ? 'bgm-battle' : 'bgm-manage');
}

function bindInput() {
  const canvas = app.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    unlockAndPlay();
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (app.screen.width / rect.width);
    const sy = (e.clientY - rect.top) * (app.screen.height / rect.height);
    const x = (sx - root.x) / viewScale;
    const y = (sy - root.y) / viewScale;
    hits.test(x, y);
  });
  window.addEventListener('keydown', (e) => {
    unlockAndPlay();
    if (screen === 'manage') {
      if (smith) {
        if (e.key === 'Escape') { closeSmith(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const d2 = e.key === 'ArrowLeft' ? -1 : 1;
          if (smith.pick === 'rune') {
            const fr = frameById(smith.plan.frame) ;
            const n = Math.max(1, Math.ceil(runesFor(fr.slot).length / 8));
            if (n > 1) turnPage('smith-rune', n, d2);
          } else if (smith.pick === 'frame') {
            const n = Math.max(1, Math.ceil(FRAMES.length / 8));
            if (n > 1) turnPage('smith-frame', n, d2);
          }
        }
        if (e.key === 'Enter') { confirmSmith(); return; }
        return;
      }
      if (forge) {
        if (e.key === 'Escape') { closeForge(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // 造型/能力面板展开时，左右键翻它的页（面板没开就不响应）
          const key = forge.pick === 'look' ? 'forge-look' : forge.pick === 'power' ? 'forge-power' : null;
          if (key) {
            const n = forgePages(key);
            if (n > 1) turnPage(key, n, e.key === 'ArrowLeft' ? -1 : 1);
          }
          return;
        }
        return;
      }
      if (graft) {
        if (e.key === 'Escape') { closeGraft(); return; }
        if (e.key === 'Enter') { confirmGraft(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const k = `graft-${graft.cat}`, n = stitchPages(graft.cat);
          if (n > 1) turnPage(k, n, e.key === 'ArrowLeft' ? -1 : 1);
          return;
        }
        return;
      }
      if (stitch) {
        if (e.key === 'Escape') { closeStitch(); return; }
        if (e.key === 'Enter') { confirmStitch(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const k = `stitch-${stitch.cat}`, n = stitchPages(stitch.cat);
          if (n > 1) turnPage(k, n, e.key === 'ArrowLeft' ? -1 : 1);
          return;
        }
        return;
      }
      const i = ['1', '2', '3', '4', '5', '6', '7'].indexOf(e.key);
      if (i >= 0) { setTab(TABS[i].id); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (tab === 'story' && storyRun) return;   // 剧情选项里方向键留给剧情
        if (pagerKey(e.key === 'ArrowLeft' ? -1 : 1)) return;
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); pagerNextFocus(); return; }
      if (e.key === 'Enter') {
        // 秘闻页阅读中：Enter 推进剧情而不是开战（输入框自己处理回车）
        if (tab === 'story') {
          // 秘闻页回车推进剧情而不是开战（输入框自己处理回车）
          if (!storyRun) { void drawStoryScene(); return; }
          const sc = storyRun.scene;
          if (!sc.choices && !sc.input) { if (S.story.credits > 0) void drawStoryScene(); else closeStory(); }
          return;
        }
        startBattle();
        return;
      }
      if (e.key === 'Escape') {
        if (tab === 'story' && storyRun) { closeStory(); return; }
        sel = null; render(); return;
      }
    } else if (screen === 'battle') {
      if (e.key === ' ') { paused = !paused; return; }
      if (e.key.toLowerCase() === 's') { speed = speed === 1 ? 2 : 1; return; }
    } else if (screen === 'result') {
      if (e.key === 'Enter') { afterResult(); return; }
    } else if (screen === 'ending') {
      if (e.key === 'Enter') { enterOvertime(); return; }
    }
  });
}

function setTab(t     ) {
  pagerFocus = null;
  if (tab === t) return;
  if (stitch) closeStitch();
  if (forge) closeForge();
  if (graft) closeGraft();
  tab = t;
  sel = null;
  playSfx('tab');
  render();
}

// ---------- 经营界面渲染 ----------
function clearUi() {
  const kids = uiLayer.removeChildren();
  for (const k of kids) if (k !== uiGfx) k.destroy({ children: true });
  while (staleTex.length) { const t = staleTex.pop() ; try { t.destroy(true); } catch { /* 已释放 */ } }
  uiLayer.addChild(uiGfx);
  uiGfx.clear();
  for (const k of modalLayer.removeChildren()) if (k !== modalGfx) k.destroy({ children: true });
  modalLayer.addChild(modalGfx);
  modalGfx.clear();
  hits.clear();
}

function render() {
  if (nameInput) nameInput.style.display = screen === 'manage' && (stitch || smith) && !portrait ? 'block' : 'none';
  if (forgeInput) forgeInput.style.display = screen === 'manage' && forge && forge.tab !== 'book' && !portrait ? 'block' : 'none';
  const modalOpen = screen === 'manage' && (!!stitch || !!forge || !!graft || !!smith);
  modalLayer.visible = modalOpen;
  if (screen !== 'manage') { uiLayer.visible = false; if (storyInput) storyInput.style.display = 'none'; return; }
  uiLayer.visible = true;
  clearUi();
  livePagers = [];
  const g = uiGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  // 模态期间不画背后页面：0.88 遮罩压不住 12px 点阵字，两层文字会互相糊成一片
  if (modalOpen) {
    if (stitch) drawStitch();
    else if (graft) drawGraft();
    else if (smith) drawSmith();
    else drawForge();
    syncStoryInput();
    return;
  }
  drawTopBar(g);
  drawTabs(g);
  g.rect(2, 36, VIEW_W - 4, 200).fill(C.bg).stroke({ width: 1, color: C.wall, alignment: 0 });
  if (tab === 'throne') pageThrone(g);
  else if (tab === 'dungeon') pageDungeon(g);
  else if (tab === 'hero') pageHero(g);
  else if (tab === 'mob') pageMob(g);
  else if (tab === 'shop') pageShop(g);
  else if (tab === 'story') pageStory(g);
  else pageReport(g);
  syncStoryInput();
}

// ---------- 改造台（模态）：给已有单位移植部件 ----------
// 与缝合工坊的区别：不造新怪，改的是"这一只"，保留它的等级与经验。
;                                                           
let graft               = null;

function openGraft(uid        ) {
  const inst = instById(uid);
  if (!inst) return;
  graft = { uid, cat: 'core', picks: [...(inst.graft ?? [])] };
  stitch = null;
  forge = null;
  smith = null;
  playSfx('tab');
  render();
}
function closeGraft() { graft = null; playSfx('tab'); render(); }

function togglePick(id        ) {
  const gf = graft ;
  const i = gf.picks.indexOf(id);
  if (i >= 0) { gf.picks.splice(i, 1); playSfx('tab'); render(); return; }
  // 同部位只能移植一件：换掉同类的那件（否则派生结果里后者静默覆盖前者）
  const cat = partById(id)?.cat;
  const same = gf.picks.findIndex((x) => partById(x)?.cat === cat);
  if (same >= 0) gf.picks.splice(same, 1);
  if (gf.picks.length >= GRAFT_CAP) { say(`一只怪最多移植 ${GRAFT_CAP} 件`); return; }
  gf.picks.push(id);
  playSfx('place');
  render();
}

function confirmGraft() {
  const gf = graft ;
  const inst = instById(gf.uid);
  if (!inst) { closeGraft(); return; }
  const cur = inst.graft ?? [];
  const cost = graftCostOf(cur, gf.picks);
  const pulled = cur.filter((id) => !gf.picks.includes(id)).length;
  const mana = cost.mana + pulled * GRAFT_PULL_MANA;
  if (S.bone < cost.bone || S.mana < mana) { say('资源不足'); return; }
  S.bone -= cost.bone;
  S.mana -= mana;
  inst.graft = gf.picks.length ? [...gf.picks] : undefined;
  // 站位可能被改造改变（比如装了蝠翼变后排）：站错位就先请下场
  const k = instKind(inst);
  const at = roomOf(inst.uid);
  if (at >= 0 && k.row !== 'any') {
    const r = S.rooms[at];
    if (r.front === inst.uid && k.row !== 'front') { r.front = null; say(`${k.name}改造后只能站后排，已撤下`); }
    if (r.back === inst.uid && k.row !== 'back') { r.back = null; say(`${k.name}改造后只能站前排，已撤下`); }
    if (r.flank === inst.uid && k.row === 'back') { r.flank = null; }
  }
  playSfx('buy');
  persist();
  say(gf.picks.length ? `${k.name} 改造完成` : '已摘除全部移植件');
  closeGraft();
}

function drawGraft() {
  const gf = graft ;
  const inst = instById(gf.uid);
  const g = modalGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => { /* 遮罩吃掉背后点击 */ });
  panelF(g, modalLayer, 'arcane', 12, 14, VIEW_W - 24, VIEW_H - 28, C.wall);
  labelC(modalLayer, '改造台 · 移植部件', 240, 18, 12, C.white);
  button(g, modalLayer, hits, VIEW_W - 44, 16, 28, 16, '✕', () => closeGraft(), { size: 12, border: C.red, color: C.red });
  if (!inst) return;
  const base = monKind(inst.kind);
  const now = graftKind(base, gf.picks.length ? gf.picks : undefined);

  // 左上：部位页签
  CATS.forEach((c, i) => {
    const on = gf.cat === c.cat;
    const x = 20 + i * 44;
    g.rect(x, 34, 42, 18).fill(on ? C.purpleDark : C.ink).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, c.name, x + 21, 37, 12, on ? C.white : C.bone);
    hits.add(x, 34, 42, 18, () => { gf.cat = c.cat; playSfx('tab'); render(); });
  });

  // 部件列表（两列，与缝合工坊同一套翻页）
  const all = PARTS.filter((p) => p.cat === gf.cat);
  const pp = paged(`graft-${gf.cat}`, all, 16);
  pp.view.forEach((p, i) => {
    const cx = 20 + Math.floor(i / 8) * 88;
    const y = 56 + (i % 8) * 16;
    const open = partOpen(p);
    const on = gf.picks.includes(p.id);
    g.rect(cx, y, 84, 14).fill(on ? C.wallLit : C.ink)
      .stroke({ width: 1, color: on ? C.gold : p.diy ? C.purpleDark : open ? C.stoneLit : C.wall, alignment: 0 });
    if (open && TEX[p.tex]) modalLayer.addChild(sprite(p.tex, cx + 8, y + 13, 12));
    label(modalLayer, cut(p.name, 3), cx + 16, y, 12, on ? C.white : p.diy ? C.purple : open ? C.bone : C.wallLit);
    label(modalLayer, open ? `${Math.round(p.bone * 1.2)}` : `${p.unlockRaid}轮`, cx + 64, y, 12, open ? C.gold : C.wallLit);
    if (open) hits.add(cx, y, 84, 14, () => togglePick(p.id));
  });
  pager(g, `graft-${gf.cat}`, pp.pages, 20, 186, 84);

  // 右：改造前后对照 —— 玩家要的就是"这一改值不值"
  panelF(g, modalLayer, 'inset', 200, 34, 268, 146, C.ink);
  modalLayer.addChild(sprite(base.tex, 232, 96, 40));
  label(modalLayer, cut(now.name, 8), 206, 38, 12, C.purple);
  label(modalLayer, `Lv${inst.lv}（等级与经验保留）`, 206, 100, 12, C.stoneLit);
  const rows                             = [
    ['生命', base.hp, now.hp], ['攻击', base.atk, now.atk],
    ['防御', base.def, now.def],
  ];
  let ry = 54;
  for (const [nm, a, bv] of rows) {
    label(modalLayer, `${nm} ${a}`, 274, ry, 12, C.bone);
    label(modalLayer, bv === a ? '—' : `→ ${bv}`, 334, ry, 12, bv > a ? C.green : bv < a ? C.red : C.stoneLit);
    ry += 15;
  }
  label(modalLayer, `速度 ${base.spd.toFixed(2)}`, 396, 54, 12, C.bone);
  label(modalLayer, now.spd === base.spd ? '—' : `→ ${now.spd.toFixed(2)}`, 396, 69, 12, now.spd > base.spd ? C.green : C.red);
  label(modalLayer, `站位 ${now.row === 'front' ? '前排' : now.row === 'back' ? '后排' : '任意'}`, 396, 84, 12, now.row === base.row ? C.stoneLit : C.gold);
  label(modalLayer, cut(`技能・${now.skill}`, 16), 206, 118, 12, C.purple);
  wrapText(modalLayer, cut(now.skillDesc, 42), 206, 133, 254, 12, C.stoneLit);
  label(modalLayer, cut(gf.picks.length ? `移植：${gf.picks.map((id) => partById(id)?.name ?? '').join('、')}` : '尚未选择移植件', 30), 206, 164, 12, gf.picks.length ? C.gold : C.stoneLit);

  // 底部：花费与确认
  const cur = inst.graft ?? [];
  const cost = graftCostOf(cur, gf.picks);
  const pulled = cur.filter((id) => !gf.picks.includes(id)).length;
  const mana = cost.mana + pulled * GRAFT_PULL_MANA;
  const can = (cost.bone > 0 || mana > 0) && S.bone >= cost.bone && S.mana >= mana;
  label(modalLayer, `移植 ${cost.bone}骨 + ${mana}魔${pulled ? `（含摘除${pulled}件）` : ''}`, 20, 206, 12, can ? C.gold : C.red);
  label(modalLayer, `最多 ${GRAFT_CAP} 件・每件 ${GRAFT_MANA} 魔・摘除 ${GRAFT_PULL_MANA} 魔`, 20, 222, 12, C.stoneLit);
  button(g, modalLayer, hits, 372, 204, 96, 20, '动手改造', () => confirmGraft(),
    { size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white });
}

// ---------- 缝合工坊（模态） ----------
;                                                                                                                      
let stitch                = null;
let editBaseParts                 = null;
let editBaseAffixes                  = null;
let nameInput                          = null;

function maxUnlockRaid() {
  return S.overtime ? 99 : Math.max(1, S.raidNo);
}

function openStitch(editUid                = null) {
  const avail = (cat         ) => { const l = PARTS.filter((p) => p.cat === cat && partOpen(p)); return l.length ? l : unlockedParts(cat, 1); };
  let parts          = {
    core: avail('core')[0].id, head: avail('head')[0].id,
    arm: avail('arm')[0].id, legs: avail('legs')[0].id,
  };
  let name = '';
  let affixes           = {};
  editBaseParts = null;
  editBaseAffixes = null;
  if (editUid != null) {
    const inst = instById(editUid);
    const def = inst && S.customs.find((d) => d.id === inst.kind);
    if (def) {
      parts = { ...def.parts };
      affixes = { ...(def.affixes ?? {}) };
      name = def.name;
      editBaseParts = { ...def.parts };
      editBaseAffixes = { ...affixes };
    }
  }
  smith = null; forge = null; graft = null;
  stitch = { parts, affixes, name, auto: !name, cat: 'core', editUid };
  if (stitch.auto) stitch.name = autoName(parts, Date.now(), affixes);
  playSfx('tab');
  ensureNameInput();
  render();
}

function closeStitch() {
  stitch = null;
  removeNameInput();
  playSfx('tab');
  render();
}

// 名字用原生 input：中文输入法/手机键盘只能由 DOM 接管，canvas 自绘输入框做不到。
function ensureNameInput() {
  if (nameInput) return;
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = 8;
  el.value = stitch?.name ?? smith?.plan.name ?? '';
  el.placeholder = '给它起个名字';
  el.style.cssText = 'position:fixed;z-index:9;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;text-align:center;padding:0;';
  el.addEventListener('input', () => {
    if (smith) { smith.plan.name = el.value; smith.auto = false; render(); return; }
    if (!stitch) return;
    stitch.name = el.value;
    stitch.auto = false;
  });
  el.addEventListener('keydown', (e) => e.stopPropagation());
  document.body.appendChild(el);
  nameInput = el;
  positionNameInput();
}

function removeNameInput() {
  if (nameInput) { nameInput.remove(); nameInput = null; }
}

function positionNameInput() {
  if (!nameInput) return;
  const rect = app.canvas.getBoundingClientRect();
  const sx = rect.width / app.screen.width;
  const sy = rect.height / app.screen.height;
  const box = smith ? SMITH_NAME : STITCH_NAME;
  const px = rect.left + (root.x + box.x * viewScale) * sx;
  const py = rect.top + (root.y + box.y * viewScale) * sy;
  nameInput.style.left = `${Math.round(px)}px`;
  nameInput.style.top = `${Math.round(py)}px`;
  nameInput.style.width = `${Math.round(box.w * viewScale * sx)}px`;
  nameInput.style.height = `${Math.round(box.h * viewScale * sy)}px`;
  nameInput.style.fontSize = `${Math.max(11, Math.round(11 * viewScale * sy))}px`;
}

const STITCH_NAME = { x: 96, y: 200, w: 128, h: 18 };
const SMITH_NAME = { x: 62, y: 218, w: 104, h: 16 };

// ---------- 锻造台（模态）：模块化打造装备 ----------
// 胚体（槽位+基础数值+铭文位）× 铭文（机制）× 淬火（整体偏向），和缝合怪物同一套"选模块看派生"的手感。
// 打出来的图纸永久存档，装上/卸下随意，不会因为卸下而消失（这点和掉落装备一致）。
                                                                                                          
let smith               = null;

function openSmith(editId                = null) {
  const old = editId ? S.forged.find((f) => f.id === editId) : null;
  smith = old
    ? { plan: { ...old.plan, runes: [...old.plan.runes] }, pick: 'rune', auto: false, editId }
    : { plan: { frame: FRAMES[0].id, runes: [], temper: 'tp-none', name: '' }, pick: 'frame', auto: true, editId: null };
  if (smith.auto) smith.plan.name = craftName(smith.plan);
  stitch = null; forge = null; graft = null;
  pageState['smith-rune'] = 0;
  pageState['smith-frame'] = 0;
  ensureNameInput();
  if (nameInput) nameInput.value = smith.plan.name;
  playSfx('tab');
  render();
}

function closeSmith() {
  smith = null;
  removeNameInput();
  playSfx('tab');
  render();
}

function smithSetFrame(id        ) {
  const sm = smith ;
  const fr = frameById(id);
  if (!fr) return;
  const prev = frameById(sm.plan.frame);
  sm.plan.frame = id;
  // 换胚体可能换了槽位或缩了铭文位 → 清掉刻不上的铭文，避免图纸处于无效状态
  sm.plan.runes = sm.plan.runes.filter((r) => {
    const rn = runeById(r);
    return rn && (rn.slots === 'any' || rn.slots.includes(fr.slot));
  }).slice(0, fr.slots);
  if (prev && prev.slot !== fr.slot) pageState['smith-rune'] = 0;
  if (sm.auto) sm.plan.name = craftName(sm.plan);
  if (nameInput && sm.auto) nameInput.value = sm.plan.name;
  playSfx('place');
  render();
}

function smithToggleRune(id        ) {
  const sm = smith ;
  const fr = frameById(sm.plan.frame) ;
  const rn = runeById(id);
  if (!rn) return;
  if (sm.plan.runes.includes(id)) {
    sm.plan.runes = sm.plan.runes.filter((x) => x !== id);
    playSfx('tab');
  } else {
    if (rn.slots !== 'any' && !rn.slots.includes(fr.slot)) { say(`${rn.name}刻不到这个部位`); return; }
    if (sm.plan.runes.length >= fr.slots) { say(`这个胚体只有 ${fr.slots} 个铭文位`); return; }
    sm.plan.runes = [...sm.plan.runes, id];
    playSfx('place');
  }
  if (sm.auto) sm.plan.name = craftName(sm.plan);
  if (nameInput && sm.auto) nameInput.value = sm.plan.name;
  render();
}

function smithSetTemper(id        ) {
  const sm = smith ;
  if (!temperById(id)) return;
  sm.plan.temper = id;
  if (sm.auto) sm.plan.name = craftName(sm.plan);
  if (nameInput && sm.auto) nameInput.value = sm.plan.name;
  playSfx('place');
  render();
}

function confirmSmith() {
  const sm = smith ;
  const bad = planValid(sm.plan);
  if (bad) { say(bad); return; }
  const cost = craftCost(sm.plan);
  const old = sm.editId ? S.forged.find((f) => f.id === sm.editId) : null;
  const oldCost = old ? craftCost(old.plan) : { bone: 0, mana: 0 };
  const payBone = old ? Math.max(0, cost.bone - oldCost.bone) : cost.bone;
  const payMana = old ? Math.max(0, cost.mana - oldCost.mana) : cost.mana;
  if (!old && S.forged.length >= FORGED_CAP) { say(`自制装备已满（${FORGED_CAP}），先熔掉一张图纸`); return; }
  if (S.bone < payBone) { say('骨币不足'); return; }
  if (S.mana < payMana) { say('魔质不足'); return; }
  if (!old && S.vault.length >= GEAR_CAP) { say('仓库已满，先熔掉一件'); return; }
  S.bone -= payBone;
  S.mana -= payMana;
  const name = (sm.plan.name || craftName(sm.plan)).slice(0, 5);
  if (old) {
    old.plan = { ...sm.plan, name };
    syncForged();
    say(`${name} 已改锻`);
  } else {
    const id = `fg${S.fgNext++}`;
    S.forged.push({ id, plan: { ...sm.plan, name } });
    syncForged();
    S.vault.push(id);
    say(`${name} 打好了，进了装备仓库`);
  }
  playSfx('buy');
  persist();
  closeSmith();
}

// 熔掉一张自制图纸：连带把它从仓库与统领身上摘掉（否则会留下悬空 id）
function meltForged(id        ) {
  const f = S.forged.find((x) => x.id === id);
  if (!f) return;
  const cost = craftCost(f.plan);
  S.forged = S.forged.filter((x) => x.id !== id);
  S.vault = S.vault.filter((v) => v !== id);
  for (const c of S.champs) {
    for (const sl of GEAR_SLOTS) if (c.gear?.[sl.id] === id) delete c.gear [sl.id];
  }
  syncForged();
  S.bone += Math.round(cost.bone * 0.5);
  S.mana += Math.round(cost.mana * 0.5);
  playSfx('tab');
  say(`${f.plan.name} 已熔回一半材料`);
  persist();
  render();
}

function drawSmith() {
  const sm = smith ;
  const g = modalGfx;
  const fr = frameById(sm.plan.frame) ;
  const k = craftKind(sm.plan) ;
  const cost = craftCost(sm.plan);
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => { /* 模态遮罩 */ });
  panelF(g, modalLayer, 'arcane', 12, 14, VIEW_W - 24, VIEW_H - 28, C.wall);
  labelC(modalLayer, sm.editId ? '改锻' : '锻造台', 240, 18, 12, C.white);
  button(g, modalLayer, hits, VIEW_W - 44, 16, 28, 16, '✕', () => closeSmith(), { size: 12, border: C.red, color: C.red });

  // 三段模块页签
  ([['frame', '胚体'], ['rune', `铭文${sm.plan.runes.length}/${fr.slots}`], ['temper', '淬火']]         ).forEach(([id, name], i) => {
    const on = sm.pick === id;
    const x = 20 + i * 62;
    g.rect(x, 34, 60, 18).fill(on ? C.purpleDark : C.ink).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, name, x + 30, 37, 12, on ? C.white : C.bone);
    hits.add(x, 34, 60, 18, () => { sm.pick = id; playSfx('tab'); render(); });
  });
  label(modalLayer, cut(`${GEAR_SLOTS.find((s2) => s2.id === fr.slot) .name}位・${fr.name}`, 12), 210, 37, 12, C.gold);

  // 左：模块列表（面板内自带详情行与翻页器，别越出 y=190 —— 190 以下归造价/命名行）
  panelF(g, modalLayer, 'inset', 20, 54, 268, 138, C.ink);
  if (sm.pick === 'frame') drawSmithFrames(g);
  else if (sm.pick === 'rune') drawSmithRunes(g, fr);
  else drawSmithTempers(g);

  // 右：派生结果
  panelF(g, modalLayer, 'inset', 296, 54, 164, 138, C.ink);
  modalLayer.addChild(sprite(k.tex, 318, 88, 24));
  label(modalLayer, cut(k.name, 5), 338, 62, 12, RANK_COL[k.rank]);
  label(modalLayer, ['白', '蓝', '金'][k.rank] + '档', 338, 80, 12, RANK_COL[k.rank]);
  const m = k.mod;
  const rows           = [];
  if ((m.hp ?? 1) !== 1) rows.push(`生命 ${pct(m.hp )}`);
  if ((m.atk ?? 1) !== 1) rows.push(`攻击 ${pct(m.atk )}`);
  if ((m.def ?? 0) !== 0) rows.push(`防御 ${m.def  > 0 ? '+' : ''}${m.def}`);
  if ((m.spd ?? 1) !== 1) rows.push(`攻速 ${pct(m.spd )}`);
  if ((m.aura ?? 1) !== 1) rows.push(`光环 ${pct(m.aura )}`);
  if ((m.dmgTaken ?? 1) !== 1) rows.push(`受伤 ${pct(m.dmgTaken )}`);
  if ((m.cd ?? 1) !== 1) rows.push(`冷却 ${pct(m.cd )}`);
  if ((m.fatigue ?? 1) !== 1) rows.push(`疲劳 ${pct(m.fatigue )}`);
  if ((m.xp ?? 1) !== 1) rows.push(`经验 ${pct(m.xp )}`);
  if (m.woundGuard) rows.push('倒下不留伤');
  rows.slice(0, 4).forEach((t, i) => label(modalLayer, cut(t, 8), 303 + (i % 2) * 80, 104 + Math.floor(i / 2) * 17, 12, C.bone));
  if (rows.length > 4) label(modalLayer, cut(rows.slice(4).join('・'), 16), 303, 138, 12, C.bone);
  // 机制文案最多两行（面板底 192），超出直接截断 —— wrapText 不会自己停，越界就压到造价行
  const mech = sm.plan.runes.map((id) => runeById(id)?.desc ?? '').filter(Boolean).join('；') || '没刻铭文：纯数值件';
  wrapText(modalLayer, cut(mech, 19), 303, 158, 148, 12, C.stoneLit);

  // 底部：命名 + 造价 + 确认
  label(modalLayer, '名字', 22, 220, 12, C.bone);
  g.rect(SMITH_NAME.x - 1, SMITH_NAME.y - 1, SMITH_NAME.w + 2, SMITH_NAME.h + 2).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
  button(g, modalLayer, hits, 172, 218, 36, 16, '随机', () => {
    sm.auto = true;
    sm.plan.name = craftName(sm.plan);
    if (nameInput) nameInput.value = sm.plan.name;
    playSfx('tab');
    render();
  }, { size: 12 });
  const old = sm.editId ? S.forged.find((f) => f.id === sm.editId) : null;
  const oldCost = old ? craftCost(old.plan) : { bone: 0, mana: 0 };
  const payBone = old ? Math.max(0, cost.bone - oldCost.bone) : cost.bone;
  const payMana = old ? Math.max(0, cost.mana - oldCost.mana) : cost.mana;
  const full = !old && (S.forged.length >= FORGED_CAP || S.vault.length >= GEAR_CAP);
  const can = !planValid(sm.plan) && S.bone >= payBone && S.mana >= payMana && !full;
  label(modalLayer, cut(`${old ? '改锻' : '造价'} ${payBone}骨+${payMana}魔`, 13), 22, 196, 12, can ? C.gold : C.red);
  const note = full ? (S.forged.length >= FORGED_CAP ? `图纸已满（${FORGED_CAP}）` : '仓库已满')
    : S.bone < payBone ? '骨币不足' : S.mana < payMana ? '魔质不足' : `自制 ${S.forged.length}/${FORGED_CAP}`;
  label(modalLayer, cut(note, 12), 216, 196, 12, can ? C.wall : C.red);
  button(g, modalLayer, hits, 340, 214, 116, 20, old ? '改锻' : '开锻！', () => confirmSmith(),
    { size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white });
}
const pct = (v        ) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;

function drawSmithFrames(g               ) {
  const sm = smith ;
  label(modalLayer, '胚体：定部位/基础数值/铭文位（骨/魔）', 27, 60, 12, C.stoneLit);
  const fp = paged('smith-frame', FRAMES, 8);
  fp.view.forEach((f, i) => {
    const x = 24 + (i % 2) * 132;
    const y = 80 + Math.floor(i / 2) * 17;
    const on = sm.plan.frame === f.id;
    g.rect(x, y, 130, 16).fill(on ? C.wallLit : C.wall).stroke({ width: 1, color: on ? C.gold : C.ink, alignment: 0 });
    label(modalLayer, cut(f.name, 3), x + 3, y + 1, 12, on ? C.white : C.bone);
    label(modalLayer, GEAR_SLOTS.find((s2) => s2.id === f.slot) .name, x + 42, y + 1, 12, C.steel);
    label(modalLayer, `${f.slots}文`, x + 56, y + 1, 12, C.purple);
    label(modalLayer, `${f.bone}/${f.mana}`, x + 84, y + 1, 12, C.gold);
    hits.add(x, y, 128, 16, () => smithSetFrame(f.id));
  });
  pager(g, 'smith-frame', fp.pages, 216, 154, 68);
  const cur = frameById(sm.plan.frame);
  if (cur) label(modalLayer, cut(`${cur.name}：${cur.desc}`, 15), 26, 154, 12, C.stoneLit);
}

function drawSmithRunes(g               , fr                                   ) {
  const sm = smith ;
  const pool = runesFor(fr.slot);
  const pp = paged('smith-rune', pool, 8);
  label(modalLayer, cut(`铭文：这个胚体能刻 ${fr.slots} 条（骨/魔）`, 20), 27, 60, 12, C.stoneLit);
  // 一行只放「字 + 短标签 + 价格」：12px 点阵字下长文案必压价格列，长说明留给下方详情行
  pp.view.forEach((r, i) => {
    const x = 24 + (i % 2) * 132;
    const y = 80 + Math.floor(i / 2) * 17;
    const on = sm.plan.runes.includes(r.id);
    g.rect(x, y, 128, 16).fill(on ? C.purpleDark : C.wall).stroke({ width: 1, color: on ? C.purple : C.ink, alignment: 0 });
    label(modalLayer, r.name, x + 3, y + 1, 12, on ? C.white : C.purple);
    label(modalLayer, cut(r.tag, 5), x + 18, y + 1, 12, on ? C.white : C.bone);
    label(modalLayer, `${r.bone}/${r.mana}`, x + 94, y + 1, 12, on ? C.gold : C.stoneLit);
    hits.add(x, y, 128, 16, () => smithToggleRune(r.id));
  });
  pager(g, 'smith-rune', pp.pages, 216, 154, 68);
  const picked = sm.plan.runes.map(runeById).filter(Boolean)                                    ;
  label(modalLayer, picked.length ? cut(`已刻 ${picked.map((r) => r.name).join('・')}`, 9) : '还没刻铭文（可只用胚体）',
    24, 154, 12, picked.length ? C.purple : C.wall);
  // 选中铭文的长说明单独一行（列表里只放短标签）
  if (picked.length) label(modalLayer, cut(picked.map((r) => r.desc).join('；'), 21), 26, 172, 12, C.stoneLit);
}

function drawSmithTempers(g               ) {
  const sm = smith ;
  label(modalLayer, '淬火给整件一条偏向，多半带代价', 27, 60, 12, C.stoneLit);
  TEMPERS.forEach((t, i) => {
    const y = 78 + i * 17;
    const on = sm.plan.temper === t.id;
    g.rect(24, y, 260, 16).fill(on ? C.purpleDark : C.wall).stroke({ width: 1, color: on ? C.purple : C.ink, alignment: 0 });
    label(modalLayer, t.name, 27, y + 1, 12, on ? C.white : C.bone);
    label(modalLayer, cut(t.desc, 14), 66, y + 1, 12, on ? C.bone : C.stoneLit);
    label(modalLayer, t.mana ? `${t.mana}魔` : '免费', 250, y + 1, 12, on ? C.gold : C.stoneLit);
    hits.add(24, y, 260, 16, () => smithSetTemper(t.id));
  });
}

// ---------- 造件工坊（LLM DIY 部件） ----------
// 玩家用一句话描述想要的部件，外部叙事者（或本地回声）产出草案，
// 草案经 modules.clampDraft 夹进设计区间后才变成真部件 —— 所以"随便写"不会打崩数值。
;             
                                                                      
               
                
                             
                           
              
                
              
                                                    
  
let forge               = null;
let forgeInput                          = null;
const FORGE_INPUT = { x: 108, y: 58, w: 250, h: 18 };

// 三档：关闭 / 本地回声（离线可用的参考实现） / 外部模型（玩家自填接口）
function setLlmMode(mode         ) {
  if (mode === 'http') {
    const cur = loadCfg();
    const url = window.prompt('外部模型接口地址（OpenAI 兼容的 /chat/completions）', cur?.url ?? '');
    if (url == null) return;
    if (!url.trim()) { saveMode('gp'); restoreBackend(); render(); return; }
    const key = window.prompt('API Key（留空表示接口不需要）', cur?.key ?? '') ?? '';
    const model = window.prompt('模型名', cur?.model ?? 'gpt-4o-mini') ?? '';
    saveCfg({ url: url.trim(), key: key.trim(), model: model.trim() });
  }
  saveMode(mode);
  restoreBackend();
  playSfx('tab');
  say(mode === 'off' ? '已关闭叙事者' : mode === 'gp' ? '已用平台内置的地牢叙事者' : mode === 'echo' ? '已切到本地回声（离线可用）' : '已接入外部模型');
  render();
}

function openForge(tab                            = 'part') {
  smith = null; stitch = null; graft = null;
  forge = { tab, cat: 'core', brief: '', draft: null, af: null, via: '', busy: false, err: '', pick: 'none' };
  pageState['forge-look'] = 0;
  pageState['forge-power'] = 0;
  ensureForgeInput();
  syncForgePlaceholder();
  playSfx('tab');
  render();
}

function closeForge() {
  forge = null;
  removeForgeInput();
  playSfx('tab');
  render();
}

function ensureForgeInput() {
  if (forgeInput) return;
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = 24;
  el.placeholder = '例如：会喷火的胖家伙 / 剧毒的黏液';
  el.autocomplete = 'off';
  el.style.cssText = 'position:fixed;z-index:9;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;padding:0 4px;';
  el.addEventListener('input', () => { if (forge) forge.brief = el.value; });
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') void askForge();
  });
  document.body.appendChild(el);
  forgeInput = el;
  positionForgeInput();
}

function removeForgeInput() {
  if (forgeInput) { forgeInput.remove(); forgeInput = null; }
}

function syncForgePlaceholder() {
  if (!forgeInput || !forge) return;
  forgeInput.placeholder = forge.tab === 'part'
    ? '例如：会喷火的胖家伙 / 剧毒的黏液'
    : '例如：见血就更凶 / 挨打时反弹尖刺';
}

function positionForgeInput() {
  if (!forgeInput) return;
  const rect = app.canvas.getBoundingClientRect();
  const sx = rect.width / app.screen.width;
  const sy = rect.height / app.screen.height;
  forgeInput.style.left = `${Math.round(rect.left + (root.x + FORGE_INPUT.x * viewScale) * sx)}px`;
  forgeInput.style.top = `${Math.round(rect.top + (root.y + FORGE_INPUT.y * viewScale) * sy)}px`;
  forgeInput.style.width = `${Math.round(FORGE_INPUT.w * viewScale * sx)}px`;
  forgeInput.style.height = `${Math.round(FORGE_INPUT.h * viewScale * sy)}px`;
  forgeInput.style.fontSize = `${Math.max(11, Math.round(11 * viewScale * sy))}px`;
}

async function askForge() {
  const f = forge;
  if (!f || f.busy) return;
  const brief = (forgeInput?.value ?? f.brief).trim();
  if (!brief) { say(f.tab === 'part' ? '先写一句你想要的部件' : '先写一句你想要的词缀'); return; }
  if (!hasBackend()) { say('先在工坊页接入叙事者'); return; }
  f.brief = brief;
  f.busy = true;
  f.err = '';
  f.pick = 'none';
  render();
  try {
    if (f.tab === 'part') {
      const r = await requestPart(f.cat, brief, storySnapshot());
      if (!r) { f.err = llmStatus().note || '这次没造出来，换个说法再试'; f.draft = null; }
      else { f.draft = r.draft; f.via = r.via; playSfx('buy'); }
    } else {
      const r = await requestAffix(f.cat, brief, storySnapshot());
      if (!r) { f.err = llmStatus().note || '这次没刻出来，换个说法再试'; f.af = null; }
      else { f.af = r.draft; f.via = r.via; playSfx('buy'); }
    }
  } catch (e) {
    f.err = (e         ).message || '调用失败';
  } finally {
    f.busy = false;
    render();
  }
}

// 草案出来之后玩家还能手改：换造型（56 张贴图任选）／换能力（在预算内自由勾）
function forgeSetLook(id        ) {
  const f = forge;
  if (!f?.draft) return;
  f.draft = { ...f.draft, look: id };
  playSfx('place');
  render();
}

function forgeTogglePower(id        ) {
  const f = forge;
  if (!f) return;
  if (f.tab === 'part' && f.draft) {
    const cur = f.draft.powers;
    const p = powerById(id);
    if (!p) return;
    if (cur.includes(id)) { f.draft = { ...f.draft, powers: cur.filter((x) => x !== id) }; playSfx('tab'); render(); return; }
    const spent = cur.map(powerById).reduce((n, x) => n + (x?.cost ?? 0), 0);
    if (cur.length >= 2) { say('最多两项能力'); return; }
    if (spent + p.cost > PART_BUDGET.power) { say(`能力分超了（上限 ${PART_BUDGET.power}）`); return; }
    f.draft = { ...f.draft, powers: [...cur, id] };
    playSfx('place');
    render();
  } else if (f.tab === 'affix' && f.af) {
    const cur = f.af.powers;
    const p = affixPowerById(id);
    if (!p) return;
    if (cur.includes(id)) {
      if (cur.length <= 1) { say('词缀至少要有一项效果'); return; }
      f.af = { ...f.af, powers: cur.filter((x) => x !== id) };
      playSfx('tab'); render(); return;
    }
    const spent = cur.map(affixPowerById).reduce((n, x) => n + (x?.cost ?? 0), 0);
    if (cur.length >= 2) { say('最多两项效果'); return; }
    if (spent + p.cost > AFFIX_BUDGET.power) { say(`效果分超了（上限 ${AFFIX_BUDGET.power}）`); return; }
    f.af = { ...f.af, powers: [...cur, id] };
    playSfx('place');
    render();
  }
}

function confirmAffix() {
  const f = forge;
  if (!f?.af) return;
  if (S.diyAf.length >= DIY_AFFIX_CAP) { say(`自定义词缀已满（${DIY_AFFIX_CAP}），先拆掉一个`); return; }
  const cost = affixDraftCost(f.af);
  if (S.mana < cost.mana) { say('魔质不足'); return; }
  S.mana -= cost.mana;
  const id = `dfx${S.diyAfNext++}`;
  S.diyAf.push({ id, cat: f.cat, draft: f.af, brief: f.brief, via: f.via });
  syncDiyAffixes();
  playSfx('buy');
  persist();
  say(`${f.af.name} 已入册，可在缝合工坊挂到${CATS.find((c) => c.cat === f.cat) .name}上`);
  closeForge();
}

function dropDiyAffix(id        ) {
  const d = S.diyAf.find((x) => x.id === id);
  if (!d) return;
  if (S.customs.some((c) => c.affixes && Object.values(c.affixes).includes(id))) { say('有缝合图纸正在用它'); return; }
  S.diyAf = S.diyAf.filter((x) => x.id !== id);
  S.mana += Math.round(affixDraftCost(d.draft).mana * 0.5);
  syncDiyAffixes();
  persist();
  playSfx('tab');
  say(`${d.draft.name} 已拆解`);
  render();
}

function confirmForge() {
  const f = forge;
  if (!f || !f.draft) return;
  if (S.diy.length >= DIY_CAP) { say(`造件已满（${DIY_CAP}），先拆掉一个`); return; }
  const cost = draftCost(f.cat, f.draft);
  if (S.mana < cost.mana) { say('魔质不足'); return; }
  S.mana -= cost.mana;
  const id = `diy${S.diyNext++}`;
  S.diy.push({ id, cat: f.cat, draft: f.draft, brief: f.brief, via: f.via });
  syncDiy();
  playSfx('buy');
  persist();
  say(`${f.draft.name} 已入册，可在缝合工坊使用`);
  closeForge();
}

function dropDiy(id        ) {
  const d = S.diy.find((x) => x.id === id);
  if (!d) return;
  // 已被图纸引用的部件不能拆，否则拼接体会失去派生来源；改造装上去的同理
  if (S.customs.some((c) => Object.values(c.parts).includes(id))) { say('有缝合图纸正在用它'); return; }
  if (S.monsters.some((m) => (m.graft ?? []).includes(id))) { say('有怪物身上改造着它'); return; }
  S.diy = S.diy.filter((x) => x.id !== id);
  S.mana += Math.round(draftCost(d.cat, d.draft).mana * 0.5);
  syncDiy();
  persist();
  playSfx('tab');
  say(`${d.draft.name} 已拆解`);
  render();
}

// 造件模态里两个面板的页数（键盘翻页要在绘制之外算得出来）
function forgePages(key                              ) {
  const f = forge;
  if (!f) return 1;
  if (key === 'forge-look') return Math.max(1, Math.ceil(allLooks().length / 24));
  const pool = f.tab === 'part' ? POWER_MENU.filter((p) => p.cats.includes(f.cat)) : AFFIX_POWER.filter((p) => p.cats.includes(f.cat));
  return Math.max(1, Math.ceil(pool.length / 12));
}

// 部件表页数：键盘左右键在模态里也要能翻，页数得能在绘制之外算出来
function stitchPages(cat         ) {
  return Math.max(1, Math.ceil(PARTS.filter((p) => p.cat === cat).length / 16));
}

function drawStitch() {
  const st = stitch ;
  const g = modalGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => { /* 模态遮罩：吐掉落在背后页面的点击 */ });
  panelF(g, modalLayer, 'arcane', 12, 14, VIEW_W - 24, VIEW_H - 28, C.wall);
  labelC(modalLayer, st.editUid != null ? '重新缝合' : '缝合工坊', 240, 18, 12, C.white);
  button(g, modalLayer, hits, VIEW_W - 44, 16, 28, 16, '✕', () => closeStitch(), { size: 12, border: C.red, color: C.red });

  // 左：四个部位页签
  CATS.forEach((c, i) => {
    const active = st.cat === c.cat;
    const x = 20 + i * 44;
    g.rect(x, 34, 42, 18).fill(active ? C.purpleDark : C.ink).stroke({ width: 1, color: active ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, c.name, x + 21, 37, 12, active ? C.white : C.bone);
    hits.add(x, 34, 42, 18, () => { st.cat = c.cat; playSfx('tab'); render(); });
  });

  // 部件列表：每部位 8 个原生 + 玩家造件，两列 16px 行（造件用紫色标出）
  const all = PARTS.filter((p) => p.cat === st.cat);
  const ROW_H = 16, COL_W = 88, PER_COL = 8;
  const pp = paged(`stitch-${st.cat}`, all, 2 * PER_COL);
  pp.view.forEach((p, i) => {
    const cx = 20 + Math.floor(i / PER_COL) * COL_W;
    const y = 56 + (i % PER_COL) * ROW_H;
    const open = partOpen(p);
    const on = open && st.parts[st.cat] === p.id;
    g.rect(cx, y, COL_W - 4, ROW_H - 2).fill(on ? C.wallLit : C.ink)
      .stroke({ width: 1, color: on ? C.gold : p.diy ? C.purpleDark : open ? C.stoneLit : C.wall, alignment: 0 });
    if (open && TEX[p.tex]) {
      const sp = sprite(p.tex, cx + 8, y + ROW_H - 3, 12);
      modalLayer.addChild(sp);
    }
    label(modalLayer, cut(p.name, 3), cx + 16, y + 1, 12, on ? C.white : p.diy ? C.purple : open ? C.bone : C.wallLit);
    label(modalLayer, open ? `${p.bone}` : `${p.unlockRaid}轮`, cx + 64, y + 1, 12, open ? C.gold : C.wallLit);
    if (open) {
      hits.add(cx, y, COL_W - 4, ROW_H - 2, () => {
        st.parts[st.cat] = p.id;
        if (st.auto) st.name = autoName(st.parts, Date.now(), st.affixes);
        if (nameInput && st.auto) nameInput.value = st.name;
        playSfx('place');
        render();
      });
    }
  });
  // 当前选中部件的说明（列表行里挤不进长文案，单独一行放在列表下方）
  if (pp.pages > 1) {
    const key = `stitch-${st.cat}`;
    button(g, modalLayer, hits, 20, 186, 20, 14, '◀', () => turnPage(key, pp.pages, -1), { size: 12, border: C.gold, color: C.gold });
    labelC(modalLayer, `${pp.page + 1}/${pp.pages}`, 62, 187, 12, C.gold);
    button(g, modalLayer, hits, 84, 186, 20, 14, '▶', () => turnPage(key, pp.pages, 1), { size: 12, border: C.gold, color: C.gold });
  }
  const curPart = partById(st.parts[st.cat]);

  // 该部位可挂的词缀：现在每部位 5 条固定 + 玩家自定义，一行放不下 → 走统一翻页（每页 4 条）
  const afList = PART_AFFIXES.filter((a) => a.cat === st.cat);
  const chosen = (['core', 'head', 'arm', 'legs']             ).filter((c) => st.affixes[c]).length;
  const curAf = affixById(st.affixes[st.cat]);
  label(modalLayer, cut(`词缀（选一・全身${chosen}/${AFFIX_CAP}）${curAf ? `：${curAf.name}` : ''}`, 22), 302, 166, 12, C.purple);
  const ap = paged(`stitch-af-${st.cat}`, afList, 4);
  ap.view.forEach((a, i) => {
    const open = affixOpen(a);
    const on = st.affixes[st.cat] === a.id;
    const bx = 302 + (i % 2) * 84;
    const by = 180 + Math.floor(i / 2) * 17;
    const blocked = !on && chosen >= AFFIX_CAP;
    g.rect(bx, by, 82, 15).fill(on ? C.purpleDark : C.ink)
      .stroke({ width: 1, color: on ? C.purple : a.diy ? C.purpleDark : open && !blocked ? C.stoneLit : C.wall, alignment: 0 });
    label(modalLayer, cut(a.name, 4), bx + 4, by + 1, 12, on ? C.white : a.diy ? C.purple : open && !blocked ? C.bone : C.wallLit);
    label(modalLayer, open ? `${a.mana}魔` : `${a.unlockRaid}轮`, bx + 54, by + 1, 12, open && !blocked ? C.purple : C.wallLit);
    if (open && (on || !blocked)) {
      hits.add(bx, by, 82, 15, () => {
        st.affixes[st.cat] = on ? undefined : a.id;
        if (st.auto) st.name = autoName(st.parts, Date.now(), st.affixes);
        if (nameInput && st.auto) nameInput.value = st.name;
        playSfx(on ? 'tab' : 'place');
        render();
      });
    }
  });
  pager(g, `stitch-af-${st.cat}`, ap.pages, 302, 214, 82);

  // 中：拼接预览
  const k = deriveKind({ id: 'preview', name: st.name || '无名', parts: st.parts, affixes: st.affixes });
  panelF(g, modalLayer, 'inset', 200, 34, 96, 130, C.ink);
  drawStitchPreview(202, 38, 4);
  labelC(modalLayer, k.row === 'front' ? '前排' : k.row === 'back' ? '后排' : '任意排', 248, 146, 12, C.steel);

  // 右：数值与说明
  panelF(g, modalLayer, 'inset', 302, 34, 166, 130, C.ink);
  label(modalLayer, `生命 ${k.hp}`, 308, 38, 12, C.green);
  label(modalLayer, `攻击 ${k.atk}`, 390, 38, 12, C.red);
  label(modalLayer, `防御 ${k.def}`, 308, 52, 12, C.steel);
  label(modalLayer, `速度 ${k.spd.toFixed(2)}`, 390, 52, 12, C.gold);
  label(modalLayer, `技能・${k.skill}`, 308, 68, 12, C.purple);
  wrapText(modalLayer, cut(k.skillDesc, 24), 308, 83, 156, 12, C.stoneLit);
  const afs = selectedAffixes(st.affixes);
  label(modalLayer, afs.length ? `词缀 ${afs.map((a) => a.name).join('・')}` : '满级被动', 308, 112, 12, C.gold);
  wrapText(modalLayer, cut(afs.length ? afs.map((a) => `${a.name}：${a.desc}`).join('；') : k.passive, 24), 308, 127, 156, 12, C.stoneLit);

  // 底部：命名与确认
  label(modalLayer, '名字', 62, 202, 12, C.bone);
  g.rect(STITCH_NAME.x - 1, STITCH_NAME.y - 1, STITCH_NAME.w + 2, STITCH_NAME.h + 2).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
  button(g, modalLayer, hits, 232, 200, 40, 18, '随机', () => {
    st.auto = true;
    st.name = autoName(st.parts, Date.now() + Math.random() * 1e4, st.affixes);
    if (nameInput) nameInput.value = st.name;
    playSfx('tab');
    render();
  }, { size: 12 });

  const cost = boneCost(st.parts);
  const afMana = affixMana(st.affixes);
  const oldAfMana = st.editUid != null ? affixMana(editBaseAffixes ?? st.affixes) : 0;
  const manaCost = st.editUid != null ? Math.max(0, afMana - oldAfMana) : STITCH_MANA + afMana;
  const oldCost = st.editUid != null ? boneCost(editBaseParts ?? st.parts) : 0;
  const payBone = st.editUid != null ? Math.max(0, cost - oldCost) : cost;
  const capFull = st.editUid == null && S.customs.length >= CUSTOM_CAP;
  const slotFull = st.editUid == null && S.monsters.length >= 10;
  const can = S.bone >= payBone && S.mana >= manaCost && !capFull && !slotFull;
  label(modalLayer, st.editUid != null ? `重组 ${payBone}骨+${manaCost}魔` : `造价 ${cost}骨+${manaCost}魔`, 200, 168, 12, can ? C.gold : C.red);
  let note = '';
  if (capFull) note = `图纸已满（${CUSTOM_CAP}）`;
  else if (slotFull) note = '怪物栅已满（10）';
  else if (S.bone < payBone) note = '骨币不足';
  else if (S.mana < manaCost) note = '魔质不足';
  if (note) label(modalLayer, note, 200, 184, 12, C.red);
  button(g, modalLayer, hits, 380, 216, 88, 20, st.editUid != null ? '重组' : '缝合！', () => confirmStitch(), {
    size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white,
  });
  if (curPart) label(modalLayer, cut(`${curPart.name}：${curPart.desc}`, 27), 20, 232, 12, curPart.diy ? C.purple : C.stoneLit);
  else label(modalLayer, '词缀只收魔质，最多两个；拼接体满级解锁被动', 20, 232, 12, C.stoneLit);
}

function drawForge() {
  const f = forge ;
  const g = modalGfx;
  const isPart = f.tab === 'part';
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => { /* 模态遮罩 */ });
  panelF(g, modalLayer, 'arcane', 12, 14, VIEW_W - 24, VIEW_H - 28, C.wall);
  button(g, modalLayer, hits, VIEW_W - 44, 16, 28, 16, '✕', () => closeForge(), { size: 12, border: C.red, color: C.red });

  // 顶部：造件 / 造词缀 两个模式
  ([['part', '造部件'], ['affix', '造词缀'], ['book', '图鉴']]         ).forEach(([id, name], i2) => {
    const on = f.tab === id;
    const x = 20 + i2 * 50;
    g.rect(x, 16, 48, 17).fill(on ? C.purpleDark : C.ink).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, name, x + 24, 18, 12, on ? C.white : C.bone);
    hits.add(x, 16, 48, 17, () => {
      f.tab = id; f.pick = 'none'; f.err = '';
      pageState['book'] = 0;
      syncForgePlaceholder(); playSfx('tab'); render();
    });
  });
  if (f.tab === 'book') { drawForgeBook(g); return; }
  label(modalLayer, hasBackend() ? cut(`叙事者 ${getBackend() .name}`, 12) : '未接入叙事者', 176, 18, 12, hasBackend() ? C.green : C.red);

  // 部位
  label(modalLayer, '部位', 22, 38, 12, C.bone);
  CATS.forEach((c, i2) => {
    const on = f.cat === c.cat;
    const x = 56 + i2 * 44;
    g.rect(x, 34, 42, 18).fill(on ? C.purpleDark : C.ink).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, c.name, x + 21, 37, 12, on ? C.white : C.bone);
    hits.add(x, 34, 42, 18, () => { f.cat = c.cat; f.draft = null; f.af = null; f.pick = 'none'; playSfx('tab'); render(); });
  });
  label(modalLayer, isPart ? '决定数值与机制' : '刻在该部位上', 240, 38, 12, C.wall);

  // 愿望输入
  label(modalLayer, '你想要', 22, 60, 12, C.bone);
  g.rect(FORGE_INPUT.x - 1, FORGE_INPUT.y - 1, FORGE_INPUT.w + 2, FORGE_INPUT.h + 2).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
  button(g, modalLayer, hits, 366, 57, 92, 20, f.busy ? '缝制中…' : '交给叙事者', () => void askForge(),
    { size: 12, enabled: !f.busy && hasBackend(), fill: C.purpleDark, border: C.purple, color: C.white });

  const draft = isPart ? f.draft : f.af;
  panelF(g, modalLayer, 'inset', 20, 84, 440, isPart ? 92 : 84, C.ink);
  if (f.busy) {
    labelC(modalLayer, isPart ? '骨料在坩埚里翻滚……' : '刻刀在骨面上游走……', 240, 124, 12, C.purple);
  } else if (f.err) {
    labelC(modalLayer, cut(f.err, 30), 240, 118, 12, C.red);
    labelC(modalLayer, '换个说法，或在工坊页切到本地回声', 240, 136, 12, C.stoneLit);
  } else if (!draft) {
    drawForgeHelp(g, isPart);
  } else if (isPart) {
    drawPartDraft(f.draft );
  } else {
    drawAffixDraft(f.af );
  }

  // 草案存在时：造型 / 能力两个编辑入口 + 展开面板
  if (draft && !f.busy) {
    const py = isPart ? 180 : 172;
    if (isPart) {
      button(g, modalLayer, hits, 22, py, 62, 17, f.pick === 'look' ? '造型 ▲' : '造型 ▼',
        () => { f.pick = f.pick === 'look' ? 'none' : 'look'; playSfx('tab'); render(); }, { size: 12, border: C.gold, color: C.gold });
    }
    button(g, modalLayer, hits, isPart ? 88 : 22, py, 62, 17, f.pick === 'power' ? '能力 ▲' : '能力 ▼',
      () => { f.pick = f.pick === 'power' ? 'none' : 'power'; playSfx('tab'); render(); }, { size: 12, border: C.purple, color: C.purple });
    if (f.pick === 'look') drawLookPicker(g);
    else if (f.pick === 'power') drawPowerPicker(g, isPart);
    else drawForgeFooter(g, isPart);
  }
}

// 图鉴：已入册的自制部件与词缀都永久留在存档里，可反复用在任意图纸上；这里能看清每一条并按需拆解。
function drawForgeBook(g               ) {
                                                                                         
  const rows        = [
    ...S.diy.map((d) => {
      const p = partById(d.id);
      const usedBy = S.customs.filter((c) => Object.values(c.parts).includes(d.id)).length
        + S.monsters.filter((m) => (m.graft ?? []).includes(d.id)).length;
      return {
        name: d.draft.name,
        tag: `部件・${CATS.find((c) => c.cat === d.cat) .name}・${p?.bone ?? 0}骨`,
        desc: `${p?.skillName ?? ''} ${d.draft.desc}`.trim(),
        used: usedBy ? `在用 ${usedBy}` : '闲置',
        drop: () => dropDiy(d.id),
      };
    }),
    ...S.diyAf.map((d) => {
      const a2 = PART_AFFIXES.find((x) => x.id === d.id);
      const usedBy = S.customs.filter((c) => c.affixes && Object.values(c.affixes).includes(d.id)).length;
      return {
        name: d.draft.name,
        tag: `词缀・${CATS.find((c) => c.cat === d.cat) .name}・${a2?.mana ?? 0}魔`,
        desc: d.draft.desc,
        used: usedBy ? `在用 ${usedBy}` : '闲置',
        drop: () => dropDiyAffix(d.id),
      };
    }),
  ];
  label(modalLayer, `自制部件 ${S.diy.length}/${DIY_CAP}・自制词缀 ${S.diyAf.length}/${DIY_AFFIX_CAP}`, 22, 38, 12, C.purple);
  label(modalLayer, '入册后永久保存，可反复用在任意图纸上', 22, 56, 12, C.stoneLit);
  panelF(g, modalLayer, 'inset', 20, 72, 440, 138, C.ink);
  if (!rows.length) {
    labelC(modalLayer, '还没有自制内容 —— 去「造部件」或「造词缀」口述一个', 240, 134, 12, C.stoneLit);
    return;
  }
  const bp = paged('book', rows, 3);
  bp.view.forEach((r, i) => {
    const y = 78 + i * 40;
    g.rect(24, y, 432, 36).fill(C.wall).stroke({ width: 1, color: C.ink, alignment: 0 });
    label(modalLayer, cut(r.name, 5), 28, y + 1, 12, C.white);
    label(modalLayer, cut(r.tag, 11), 96, y + 1, 12, C.gold);
    label(modalLayer, r.used, 250, y + 1, 12, r.used === '闲置' ? C.stoneLit : C.green);
    button(g, modalLayer, hits, 404, y + 1, 46, 14, '拆解', r.drop, { size: 12, border: C.red, color: C.red });
    label(modalLayer, cut(r.desc || '—', 34), 28, y + 19, 12, C.stoneLit);
  });
  pager(g, 'book', bp.pages, 366, 214, 90);
  label(modalLayer, '拆解返还一半魔质；被图纸或改造占用的拆不掉', 22, 214, 12, C.stoneLit);
}

function drawForgeHelp(g               , isPart         ) {
  // 左侧说明列宽度按"是否有已入册列表"变化：有列表时必须缩短，否则两列文字互压
  const listed = isPart ? S.diy.length : S.diyAf.length;
  const w = listed ? 16 : 30;
  const rows = isPart
    ? ['口述一个部件，叙事者翻成真部件：',
       cut('· 数值与能力都夹进设计区间，不会破坏平衡', w),
       cut('· 草案可手改造型（56 张贴图任选）与能力', w),
       `· 上限 ${DIY_CAP} 个，现有 ${S.diy.length} 个`]
    : ['口述一个词缀，刻到所选部位上：',
       cut('· 只改数值与机制，不新增贴图', w),
       cut('· 草案可手改效果（预算内勾两项）', w),
       `· 上限 ${DIY_AFFIX_CAP} 个，现有 ${S.diyAf.length} 个`];
  rows.forEach((t, i2) => label(modalLayer, cut(t, listed ? 18 : 32), 30, 90 + i2 * 16, 12, i2 === 0 ? C.stoneLit : C.wall));
  const list                                                    = isPart
    ? S.diy.slice(0, 4).map((d) => ({ name: d.draft.name, sub: `${CATS.find((c) => c.cat === d.cat) .name}・${partById(d.id)?.bone ?? 0}骨`, drop: () => dropDiy(d.id) }))
    : S.diyAf.slice(0, 4).map((d) => ({ name: d.draft.name, sub: `${CATS.find((c) => c.cat === d.cat) .name}・${affixDraftCost(d.draft).mana}魔`, drop: () => dropDiyAffix(d.id) }));
  if (!list.length) return;
  label(modalLayer, '已入册', 306, 90, 12, C.purple);
  let dy = 106;
  for (const it of list) {
    label(modalLayer, cut(`${it.name}・${it.sub}`, 10), 306, dy, 12, C.bone);
    button(g, modalLayer, hits, 420, dy - 2, 32, 14, '拆', it.drop, { size: 12, border: C.red, color: C.red });
    dy += 17;
  }
}

function drawPartDraft(d              ) {
  const look = partById(d.look) ?? allLooks()[0];
  if (look) modalLayer.addChild(sprite(look.tex, 46, 122, 24));
  label(modalLayer, cut(d.name, 6), 66, 88, 12, C.white);
  label(modalLayer, `「${d.word}」字`, 66, 104, 12, C.stoneLit);
  label(modalLayer, cut(`造型 ${look?.name ?? '—'}`, 10), 66, 120, 12, C.gold);
  wrapText(modalLayer, cut(d.desc, 22), 66, 140, 176, 12, C.bone);
  label(modalLayer, `生命 ${d.stats.hp}`, 256, 88, 12, C.green);
  label(modalLayer, `攻击 ${d.stats.atk}`, 350, 88, 12, C.red);
  label(modalLayer, `防御 ${d.stats.def}`, 256, 104, 12, C.steel);
  label(modalLayer, `攻速 ${d.stats.spd >= 0 ? '+' : ''}${d.stats.spd}`, 350, 104, 12, C.gold);
  const ps = d.powers.map(powerById).filter(Boolean)                                                  ;
  const pts = ps.reduce((n, x) => n + x.cost, 0);
  label(modalLayer, ps.length ? cut(`能力 ${ps.map((x) => x.name).join('・')}（${pts}/${PART_BUDGET.power}分）`, 20) : '无特殊能力', 256, 120, 12, C.purple);
  wrapText(modalLayer, cut(ps.map((x) => x.desc).join('；') || '只是块料子。', 40), 256, 140, 196, 12, C.stoneLit);
}

function drawAffixDraft(d               ) {
  label(modalLayer, cut(d.name, 6), 30, 88, 12, C.white);
  label(modalLayer, `「${d.word}」字・刻在${CATS.find((c) => c.cat === forge .cat) .name}`, 30, 104, 12, C.stoneLit);
  wrapText(modalLayer, cut(d.desc, 24), 30, 124, 196, 12, C.bone);
  const ps = d.powers.map(affixPowerById).filter(Boolean)                                                  ;
  const pts = ps.reduce((n, x) => n + x.cost, 0);
  label(modalLayer, cut(`效果 ${ps.map((x) => x.name).join('・')}（${pts}/${AFFIX_BUDGET.power}分）`, 22), 240, 88, 12, C.purple);
  let y = 106;
  for (const x of ps) { wrapText(modalLayer, cut(`· ${x.desc}`, 26), 240, y, 210, 12, C.stoneLit); y += 30; }
}

// 造型库：全部 56 张部件贴图任选，与部位无关（长相自由，站位仍由部位决定）
function drawLookPicker(g               ) {
  const f = forge ;
  const looks = allLooks();
  const pp = paged('forge-look', looks, 24);
  panelF(g, modalLayer, 'inset', 20, 200, 440, 40, C.ink);
  pp.view.forEach((p, i2) => {
    const x = 24 + (i2 % 12) * 36;
    const y = 202 + Math.floor(i2 / 12) * 18;
    const on = f.draft?.look === p.id;
    g.rect(x, y, 34, 16).fill(on ? C.wallLit : C.wall).stroke({ width: 1, color: on ? C.gold : C.ink, alignment: 0 });
    if (TEX[p.tex]) modalLayer.addChild(sprite(p.tex, x + 8, y + 15, 12));
    label(modalLayer, p.word, x + 18, y + 1, 12, on ? C.gold : C.bone);
    hits.add(x, y, 34, 16, () => forgeSetLook(p.id));
  });
  pager(g, 'forge-look', pp.pages, 372, 240, 88);
  label(modalLayer, `造型 ${pp.page + 1}/${pp.pages}・点选即换（贴图与部位无关）`, 22, 240, 12, C.wall);
}

// 能力面板：预算内自由勾选，越预算直接拒绝并提示
function drawPowerPicker(g               , isPart         ) {
  const f = forge ;
  const pool = isPart ? POWER_MENU.filter((p) => p.cats.includes(f.cat)) : AFFIX_POWER.filter((p) => p.cats.includes(f.cat));
  const picked = isPart ? (f.draft?.powers ?? []) : (f.af?.powers ?? []);
  const cap = isPart ? PART_BUDGET.power : AFFIX_BUDGET.power;
  const pp = paged('forge-power', pool, 12);
  panelF(g, modalLayer, 'inset', 20, 200, 440, 40, C.ink);
  pp.view.forEach((p, i2) => {
    const x = 24 + (i2 % 6) * 73;
    const y = 202 + Math.floor(i2 / 6) * 18;
    const on = picked.includes(p.id);
    g.rect(x, y, 71, 16).fill(on ? C.purpleDark : C.wall).stroke({ width: 1, color: on ? C.purple : C.ink, alignment: 0 });
    label(modalLayer, cut(`${p.name}${p.cost}`, 5), x + 3, y + 1, 12, on ? C.white : C.bone);
    hits.add(x, y, 71, 16, () => forgeTogglePower(p.id));
  });
  pager(g, 'forge-power', pp.pages, 372, 240, 88);
  const spent = picked.map((id) => (isPart ? powerById(id)?.cost : affixPowerById(id)?.cost) ?? 0).reduce((a        , b        ) => a + b, 0);
  label(modalLayer, `已用 ${spent}/${cap} 分・最多两项・点已选可取消`, 22, 240, 12, spent > cap ? C.red : C.wall);
}

function drawForgeFooter(g               , isPart         ) {
  const f = forge ;
  if (isPart) {
    const cost = draftCost(f.cat, f.draft );
    const can = S.mana >= cost.mana && S.diy.length < DIY_CAP;
    label(modalLayer, `入册 ${cost.mana} 魔・部件造价 ${cost.bone} 骨`, 22, 204, 12, can ? C.gold : C.red);
    label(modalLayer, S.diy.length >= DIY_CAP ? `造件已满（${DIY_CAP}）` : S.mana < cost.mana ? '魔质不足' : cut(`由 ${f.via} 缝制`, 16), 22, 220, 12,
      can ? C.wall : C.red);
    button(g, modalLayer, hits, 246, 204, 96, 20, '重新口述', () => { f.draft = null; f.err = ''; f.pick = 'none'; render(); }, { size: 12 });
    button(g, modalLayer, hits, 350, 204, 108, 20, '入册', () => confirmForge(),
      { size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white });
  } else {
    const cost = affixDraftCost(f.af );
    const can = S.mana >= cost.mana && S.diyAf.length < DIY_AFFIX_CAP;
    label(modalLayer, `入册 ${cost.mana} 魔・之后每次挂上也收 ${cost.mana} 魔`, 22, 204, 12, can ? C.gold : C.red);
    label(modalLayer, S.diyAf.length >= DIY_AFFIX_CAP ? `词缀已满（${DIY_AFFIX_CAP}）` : S.mana < cost.mana ? '魔质不足' : cut(`由 ${f.via} 刻成`, 16), 22, 220, 12,
      can ? C.wall : C.red);
    button(g, modalLayer, hits, 246, 204, 96, 20, '重新口述', () => { f.af = null; f.err = ''; f.pick = 'none'; render(); }, { size: 12 });
    button(g, modalLayer, hits, 350, 204, 108, 20, '入册', () => confirmAffix(),
      { size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white });
  }
}

function drawStitchPreview(left        , top        , cell        ) {
  const st = stitch ;
  // 与烘焙贴图同一套镜像：预览里看到的朝向就是上场时的朝向（朝左，面向入口）
  const body = new PIXI.Container();
  body.scale.x = -1;
  body.x = Math.round(left + CST_GRID * cell);
  modalLayer.addChild(body);
  const order            = ['legs', 'core', 'arm', 'head'];
  for (const cat of order) {
    const p = partById(st.parts[cat]);
    if (!p) continue;
    const tex = TEX[p.tex];
    if (!tex) continue;
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0, 0);
    s.scale.set(cell / 8); // 部件 PNG 为 8× 放大图，除以 8 回到逻辑格
    s.x = Math.round(PART_SLOT[cat].x * cell);
    s.y = Math.round(top + PART_SLOT[cat].y * cell);
    s.roundPixels = true;
    body.addChild(s);
  }
}

function confirmStitch() {
  const st = stitch ;
  const cost = boneCost(st.parts);
  const afMana = affixMana(st.affixes);
  const manaCost = st.editUid != null
    ? Math.max(0, afMana - affixMana(editBaseAffixes ?? st.affixes))
    : STITCH_MANA + afMana;
  const payBone = st.editUid != null ? Math.max(0, cost - boneCost(editBaseParts ?? st.parts)) : cost;
  if (S.bone < payBone || S.mana < manaCost) { say('资源不足'); return; }
  const name = (st.name || autoName(st.parts, Date.now(), st.affixes)).slice(0, 8);
  if (st.editUid != null) {
    const inst = instById(st.editUid);
    const def = inst && S.customs.find((d) => d.id === inst.kind);
    if (!def) { closeStitch(); return; }
    S.bone -= payBone;
    S.mana -= manaCost;
    def.parts = { ...st.parts };
    def.affixes = { ...st.affixes };
    def.name = name;
    syncCustoms();
    buildCustomTex(def);
    playSfx('buy');
    persist();
    say(`${name} 已重组`);
    closeStitch();
    return;
  }
  if (S.customs.length >= CUSTOM_CAP) { say('图纸已满'); return; }
  if (S.monsters.length >= 10) { say('怪物栅已满（10）'); return; }
  S.bone -= cost;
  S.mana -= manaCost;
  const def            = { id: `cst${S.cstNext++}`, name, parts: { ...st.parts }, affixes: { ...st.affixes } };
  S.customs.push(def);
  syncCustoms();
  buildCustomTex(def);
  const inst              = { uid: S.uidNext++, kind: def.id, lv: 1, xp: 0 };
  S.monsters.push(inst);
  sel = { kind: 'inst', uid: inst.uid };
  playSfx('buy');
  persist();
  say(`${name} 缝合完成，已加入怪物栅`);
  closeStitch();
}

function dismantle(uid        ) {
  const inst = instById(uid);
  if (!inst) return;
  const k = instKind(inst);
  const refund = Math.round(k.cost * 0.5);
  for (let i = 0; i < 4; i++) {
    if (S.rooms[i].front === uid) S.rooms[i].front = null;
    if (S.rooms[i].back === uid) S.rooms[i].back = null;
  }
  S.monsters = S.monsters.filter((m) => m.uid !== uid);
  S.bone += refund;
  if (isCustomKind(inst.kind) && !S.monsters.some((m) => m.kind === inst.kind)) {
    S.customs = S.customs.filter((d) => d.id !== inst.kind);
    unregisterKind(inst.kind);
    syncCustoms();
  }
  sel = null;
  playSfx('break');
  persist();
  say(`拆解${k.name}，返还${refund}骨币`);
  render();
}

function drawTopBar(g               ) {
  panelF(g, uiLayer, 'stone', 0, 0, VIEW_W, 34, C.wall);
  const ico = (name        , x        , size = 14) => {
    const s = sprite(name, x, 24, size);
    s.anchor.set(0, 1);
    uiLayer.addChild(s);
  };
  ico('icon-bone', 8);
  label(uiLayer, `${S.bone}`, 26, 12, 12, C.gold);
  ico('icon-mana', 78);
  label(uiLayer, `${S.mana}`, 96, 12, 12, C.purple);
  const raid = currentRaid();
  label(uiLayer, S.overtime ? `加班勇者 第${raid.no - 12}批` : `袭击 ${S.raidNo}/12`, 150, 12, 12, C.bone);
  label(uiLayer, '勇者请回', 240, 12, 12, C.stoneLit);
  if (saveFlash > 0) label(uiLayer, '已保存', 300, 12, 12, C.green);
  // 测试按钮：一键补资源，方便试各种阵容
  button(g, uiLayer, hits, 348, 6, 46, 22, '+1000', () => {
    S.bone += 1000; S.mana += 1000; playSfx('buy'); persist(); say('测试：骨币与魔质各 +1000'); render();
  }, { size: 12, fill: C.greenDark, border: C.green, color: C.white });
  button(g, uiLayer, hits, 398, 6, 34, 22, S.muted ? '静音' : '音量', () => {
    S.muted = !S.muted; setMuted(S.muted); persist(); render();
  }, { size: 12 });
  button(g, uiLayer, hits, 436, 6, 38, 22, '新档', () => {
    if (confirmNew) { S = freshSave(); syncCustoms(); persist(); confirmNew = false; sel = null; say('已开启新档'); render(); }
    else { confirmNew = true; say('再点一次“新档”确认清空存档'); render(); }
  }, { size: 12, border: confirmNew ? C.red : C.bone, color: confirmNew ? C.red : C.bone });
}
let confirmNew = false;

function drawTabs(g               ) {
  const w = VIEW_W / TABS.length;
  TABS.forEach((t, i) => {
    const active = t.id === tab;
    const x = i * w;
    g.rect(x, 238, w, 32).fill(active ? C.wallLit : C.wall);
    frame(uiLayer, 'tab-fill', x, 238, w, 32, { tint: active ? C.wallLit : C.wall });
    frame(uiLayer, 'tab', x, 238, w, 32, { tint: active ? C.gold : C.ink });
    const label1 = txt(`${i + 1} ${t.name}`, 12, active ? C.white : C.bone);
    label1.x = Math.round(x + (w - label1.width) / 2);
    label1.y = 248;
    uiLayer.addChild(label1);
    const dot = (t.id === 'mob' && canUpgradeAny()) || (t.id === 'shop' && shopHasAffordable()) || (t.id === 'story' && storyHasNew())
      || (t.id === 'hero' && heroHasNew());
    if (dot) g.circle(x + w - 10, 248, 3).fill(C.red);
    hits.add(x, 238, w, 32, () => setTab(t.id));
  });
}

function skullRow(g               , x        , y        , n        ) {
  for (let i = 0; i < 3; i++) {
    const s = sprite('icon-skull', x + i * 14, y + 12, 12);
    s.anchor.set(0, 1);
    s.alpha = i < n ? 1 : 0.22;
    uiLayer.addChild(s);
  }
  void g;
}

function pageThrone(g               ) {
  const raid = currentRaid();
  label(uiLayer, `下一波：${raid.title}`, 10, 42, 12, C.white);
  label(uiLayer, `${raid.members.length}名勇者`, 240, 42, 12, C.bone);
  // 勇者队列
  panelF(g, uiLayer, 'inset', 8, 60, 320, 96, C.ink);
  raid.members.forEach((m, i) => {
    const cls = HERO_CLASSES[m.cls];
    const x = 26 + i * 62;
    const s = sprite(cls.tex, x, 130, 30);
    uiLayer.addChild(s);
    // 名字在精灵上方、等级在下方：12px 点阵字的文本包围盒高约 19px，同侧两行必判重叠
    labelC(uiLayer, cls.name, x, 82, 12, cls.role === '首领' ? C.gold : C.bone);
    labelC(uiLayer, `Lv${m.lv}`, x, 132, 12, C.stoneLit);
    hits.add(x - 24, 80, 48, 68, () => { sel = null; say(`${cls.name}：${cls.intel}`); render(); });
  });
  label(uiLayer, '行进顺序 →', 236, 64, 12, C.stoneLit);
  const affRaw = raid.affixes.length ? affixText(raid.affixes) : '无特殊词缀';
  const aff = affRaw.length > 20 ? `${affRaw.slice(0, 20)}…` : affRaw;
  label(uiLayer, `词缀：${aff}`, 10, 158, 12, raid.affixes.length ? C.red : C.stoneLit);

  const placed = countPlaced();
  const traps = S.rooms.filter((r) => r.trap !== 'none').length;
  const leads = S.rooms.filter((r) => r.leader != null).length;
  const tired = seatedChampUids().filter((u) => { const c = champById(u); return c && fatigueTier(c.fatigue).bad; }).length;
  const hurt = S.champs.filter((c) => seatedChampUids().includes(c.uid) && (c.wounds || 0) > 0).length;
  const warn = tired || hurt ? `${tired ? `${tired}名英雄乏力` : ''}${tired && hurt ? '、' : ''}${hurt ? `${hurt}名带伤` : ''}` : '';
  label(uiLayer, cut(`已布防 ${placed}怪 / ${leads}英雄 / ${traps}陷阱${warn ? `  ${warn}` : ''}`, 36), 10, 177, 12, warn ? C.red : C.bone);
  const best = S.best[raid.no] || 0;
  label(uiLayer, '最佳评价', 10, 195, 12, C.stoneLit);
  skullRow(g, 74, 195, best);

  // 剧情修正：本波会真的吃到，所以在开战前摊开给玩家看
  if (S.story.mods.length) {
    const f = battleMods();
    const bits           = [];
    if (f.monHpMult !== 1) bits.push(`怪血${f.monHpMult > 1 ? '+' : ''}${Math.round((f.monHpMult - 1) * 100)}%`);
    if (f.monAtkMult !== 1) bits.push(`怪攻${f.monAtkMult > 1 ? '+' : ''}${Math.round((f.monAtkMult - 1) * 100)}%`);
    if (f.heroHpMult !== 1) bits.push(`勇血${f.heroHpMult > 1 ? '+' : ''}${Math.round((f.heroHpMult - 1) * 100)}%`);
    if (f.heroAtkMult !== 1) bits.push(`勇攻${f.heroAtkMult > 1 ? '+' : ''}${Math.round((f.heroAtkMult - 1) * 100)}%`);
    if (f.sealAdd) bits.push(`封印${f.sealAdd > 0 ? '+' : ''}${f.sealAdd}`);
    if (f.trapMult !== 1) bits.push(`陷阱${f.trapMult > 1 ? '+' : ''}${Math.round((f.trapMult - 1) * 100)}%`);
    if (f.roomLimitAdd) bits.push(`限时${f.roomLimitAdd > 0 ? '+' : ''}${f.roomLimitAdd}s`);
    if (f.monSpdAdd) bits.push(`怪速${f.monSpdAdd > 0 ? '+' : ''}${f.monSpdAdd.toFixed(2)}`);
    // 修正读数横排在"最佳评价"右侧那行之下，只留一行；名字与数值分左右，避免与骷髅行叠
    label(uiLayer, cut(`秘闻影响：${S.story.mods.map((m) => m.name).join('、')}`, 14), 10, 217, 12, C.purple);
    label(uiLayer, cut(bits.join(' ') || '无直接影响', 14), 180, 217, 12, C.gold);
  } else {
    const hint = tutorialHint();
    if (hint) label(uiLayer, cut(hint, 30), 10, 217, 12, C.gold);
  }

  // 右侧迎战
  panelF(g, uiLayer, 'stone', 334, 40, 142, 194, C.wall);
  labelC(uiLayer, '王座', 405, 46, 12, C.white);
  const th = sprite('icon-throne', 405, 120, 46);
  uiLayer.addChild(th);
  const sealW = 110;
  bar(g, 350, 122, sealW, 8, 1, C.purple);
  const sealEff = Math.max(25, sealMax() + battleMods().sealAdd);
  labelC(uiLayer, sealEff === sealMax() ? `封印 ${sealEff}` : `封印 ${sealEff}（${sealMax()}）`, 405, 133, 12,
    sealEff < sealMax() ? C.red : C.purple);
  labelC(uiLayer, '突围勇者每名 -25', 405, 148, 12, C.stoneLit);
  labelC(uiLayer, placed === 0 ? '空防必败' : '守军已就位', 405, 163, 12, placed === 0 ? C.red : C.green);
  button(g, uiLayer, hits, 344, 181, 122, 30, '迎 战', () => startBattle(), { fill: C.redDark, border: C.red, color: C.white });
  labelC(uiLayer, 'Enter 开战', 405, 215, 12, C.stoneLit);
}

function tutorialHint()         {
  if (S.monsters.length === 0) return '提示：去“怪群”页招募一只史莱姆（30骨币）';
  const placed = countPlaced();
  if (placed === 0) return '提示：去“地牢”页把怪物放进入口房前排';
  if (S.raidNo === 1 && !S.reports.length) return '提示：布防完成，点右侧“迎战”看它们自动作战';
  return '';
}

const ROOM_BOX = (i        ) => ({ x: 6 + i * 82, y: 56, w: 76, h: 146 });

function pageDungeon(g               ) {
  label(uiLayer, '地牢剖面  入口→', 8, 40, 12, C.white);
  label(uiLayer, '→王座', 292, 40, 12, C.purple);
  for (let i = 0; i < 4; i++) {
    const b = ROOM_BOX(i);
    const cfg = S.rooms[i];
    panelF(g, uiLayer, 'stone', b.x, b.y, b.w, b.h, C.wall);
    g.rect(b.x + 1, b.y + 1, b.w - 2, 12).fill(C.wallLit);
    labelC(uiLayer, `${i + 1}房 ${THEMES[cfg.theme].name}`, b.x + b.w / 2, b.y + 1, 12, C.white);
    if (THEMES[cfg.theme].prop) {
      const p = sprite(THEMES[cfg.theme].prop , b.x + 6, b.y + 100, 12);
      uiLayer.addChild(p);
    }
    slotBox(g, b.x + 3, b.y + 15, 34, 38, cfg.back, i, 'back', '后排');
    slotBox(g, b.x + 39, b.y + 15, 34, 38, cfg.leader, i, 'leader', '统领');
    slotBox(g, b.x + 3, b.y + 55, 34, 38, cfg.front, i, 'front', '前排');
    slotBox(g, b.x + 39, b.y + 55, 34, 38, cfg.flank, i, 'flank', '侧翼');
    // 本房统领光环提示：这是"带兵"这件事在经营页唯一的读数
    const ld = champById(cfg.leader);
    label(uiLayer, ld ? cut(ld.name.split('·')[0], 4) : '无统领', b.x + 6, b.y + 95, 12, ld ? C.gold : C.stoneLit);
    // 陷阱位
    const trapSelected = sel?.kind === 'slot' && sel.room === i && sel.which === 'trap';
    g.rect(b.x + 3, b.y + 110, b.w - 6, 20).fill(C.ink).stroke({ width: 1, color: trapSelected ? C.gold : C.stoneLit, alignment: 0 });
    if (cfg.trap !== 'none' && TRAPS[cfg.trap].tex) {
      const ts = sprite(TRAPS[cfg.trap].tex , b.x + 13, b.y + 129, 14);
      uiLayer.addChild(ts);
      label(uiLayer, TRAPS[cfg.trap].name, b.x + 24, b.y + 113, 12, C.bone);
    } else {
      label(uiLayer, '＋陷阱', b.x + 14, b.y + 113, 12, C.stoneLit);
    }
    hits.add(b.x + 3, b.y + 110, b.w - 6, 20, () => { sel = { kind: 'slot', room: i, which: 'trap' }; playSfx('tab'); render(); });
    const themeSel = sel?.kind === 'slot' && sel.room === i && sel.which === 'theme';
    button(g, uiLayer, hits, b.x + 3, b.y + 132, b.w - 6, 14, '改主题', () => {
      sel = { kind: 'slot', room: i, which: 'theme' }; playSfx('tab'); render();
    }, { size: 12, fill: themeSel ? C.wallLit : C.wall, border: themeSel ? C.gold : C.stoneLit });
  }
  const chem = chemistry(S.champs, seatedChampUids());
  label(uiLayer, chem.lines.length ? cut(`同僚：${chem.lines.join(' / ')}`, 44) : '统领席坐英雄，其光环加持同房兵种；统领在位才开侧翼',
    8, 210, 12, chem.lines.length ? C.purple : C.stoneLit);
  drawSidePanel(g);
}

function slotBox(g               , x        , y        , w        , h        , uid               , room        , which         , name        ) {
  const selected = sel?.kind === 'slot' && sel.room === room && sel.which === which;
  const flash = slotFlash.room === room && slotFlash.which === which && slotFlash.t > 0;
  const locked = which === 'flank' && S.rooms[room].leader == null;
  const border = flash ? C.green : selected ? C.gold : which === 'leader' ? C.goldDark : locked ? C.wall : C.stoneLit;
  g.rect(x, y, w, h).fill(C.ink).stroke({ width: 1, color: border, alignment: 0 });
  const bounce = flash ? Math.round(Math.sin(slotFlash.t * 18) * 2) : 0;
  const ch = which === 'leader' ? champById(uid) : undefined;
  const inst = which === 'leader' ? undefined : instById(uid);
  if (ch) {
    const k = monKind(ch.race);
    uiLayer.addChild(sprite(k.tex, x + w / 2, y + h - 11 + bounce, 32));
    const ft = fatigueTier(ch.fatigue);
    labelC(uiLayer, `Lv${ch.lv}`, x + w / 2, y + h - 13, 12, ft.bad || ch.wounds ? C.red : C.gold);
    for (let i2 = 0; i2 < (ch.wounds || 0); i2++) g.rect(x + w - 5 - i2 * 4, y + 3, 3, 3).fill(C.red);
  } else if (inst) {
    const k = instKind(inst);
    uiLayer.addChild(sprite(k.tex, x + w / 2, y + h - 11 + bounce, 25));
    labelC(uiLayer, `Lv${inst.lv}`, x + w / 2, y + h - 13, 12, C.bone);
  } else {
    labelC(uiLayer, locked ? '锁' : name, x + w / 2, y + h / 2 - 7, 12, which === 'leader' ? C.goldDark : C.stoneLit);
  }
  hits.add(x, y, w, h, () => {
    sel = { kind: 'slot', room, which };
    playSfx('tab');
    render();
  });
}
let slotFlash = { room: -1, which: ''          , t: 0 };

function drawSidePanel(g               ) {
  panelF(g, uiLayer, 'stone', 334, 40, 142, 194, C.wall);
  if (!sel) {
    labelC(uiLayer, '选中一个位置', 405, 110, 12, C.stoneLit);
    return;
  }
  if (sel.kind === 'slot' && sel.which !== 'trap' && sel.which !== 'theme') {
    const room = sel.room, which = sel.which           ;
    labelC(uiLayer, `${room + 1}房 ${SLOT_NAME[which]}`, 405, 46, 12, which === 'leader' ? C.gold : C.white);
    const cur = S.rooms[room][which];
    let y = 62;
    if (which === 'flank' && S.rooms[room].leader == null) {
      label(uiLayer, '侧翼位未开启：', 340, y, 12, C.red);
      label(uiLayer, '先在本房统领席安置', 340, y + 15, 12, C.stoneLit);
      label(uiLayer, '一只传奇怪物。', 340, y + 30, 12, C.stoneLit);
      return;
    }
    if (cur != null) {
      button(g, uiLayer, hits, 340, y, 130, 18, '撤下', () => {
        S.rooms[room][which] = null;
        if (which === 'leader') S.rooms[room].flank = null;
        persist(); playSfx('place'); render();
      }, { size: 12, border: C.red, color: C.red });
      y += 22;
    }
    if (which === 'leader') {
      if (!S.champs.length) {
        label(uiLayer, '麾下还没有英雄', 340, y, 12, C.stoneLit);
        label(uiLayer, '去“英雄”页征召', 340, y + 19, 12, C.stoneLit);
        return;
      }
      const pc = paged('side-champ', S.champs, 5);
      label(uiLayer, '安置英雄：', 340, y, 12, C.bone);
      y += 16;
      for (const c of pc.view) {
        const at = roomOfChamp(c.uid);
        const here = at === room;
        const ft = fatigueTier(c.fatigue);
        // 一行式：名字/等级/状态同基线，20px 行里两行必压字（点阵盒 15px）
        g.rect(340, y, 130, 20).fill(here ? C.wallLit : C.ink).stroke({ width: 1, color: here ? C.gold : C.goldDark, alignment: 0 });
        uiLayer.addChild(sprite(monKind(c.race).tex, 348, y + 19, 16));
        label(uiLayer, cut(c.name.split('·')[0], 4), 358, y + 3, 12, here ? C.white : C.gold);
        label(uiLayer, `${c.lv}`, 410, y + 3, 12, C.bone);
        label(uiLayer, ft.bad ? ft.text.slice(0, 2) : at < 0 ? '待' : `${at + 1}房`, 432, y + 3, 12, ft.bad ? C.red : at < 0 ? C.green : C.gold);
        hits.add(340, y, 130, 20, () => assign(room, which, c.uid));
        y += 22;
      }
      pager(g, 'side-champ', pc.pages, 340, 216, 130);
      return;
    }
    const pool = S.monsters.filter((i) => !monKind(i.kind).legend);
    if (!pool.length) {
      label(uiLayer, '还没有兵种怪物', 340, y, 12, C.stoneLit);
      label(uiLayer, '去“怪群”招募', 340, y + 19, 12, C.stoneLit);
      return;
    }
    const pi = paged('side-inst', pool, 5);
    label(uiLayer, '指派兵种：', 340, y, 12, C.bone);
    y += 16;
    for (const inst of pi.view) {
      const k = instKind(inst);
      const at = roomOf(inst.uid);
      const here = at === room && S.rooms[room][which] === inst.uid;
      g.rect(340, y, 130, 18).fill(here ? C.wallLit : C.ink).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
      const s = sprite(k.tex, 348, y + 17, 15);
      uiLayer.addChild(s);
      label(uiLayer, `${cut(k.name, 4)} Lv${inst.lv}`, 360, y + 3, 12, here ? C.white : C.bone);
      const tagCol = at < 0 ? C.green : here ? C.gold : C.red;
      label(uiLayer, at < 0 ? '空闲' : `${at + 1}房`, 440, y + 3, 12, tagCol);
      hits.add(340, y, 130, 18, () => assign(room, which, inst.uid));
      y += 20;
    }
    pager(g, 'side-inst', pi.pages, 340, 216, 130);
    return;
  }
  if (sel.kind === 'slot' && sel.which === 'trap') {
    const room = sel.room;
    labelC(uiLayer, `${room + 1}房 陷阱位`, 405, 46, 12, C.white);
    const list = ['none', 'spike', 'slime', 'rune', 'blade', 'net', 'mirror']            ;
    const pt = paged('side-trap', list, 4);
    let y = 62;
    for (const id of pt.view) {
      const t = TRAPS[id];
      const owned = S.traps.includes(id);
      const active = S.rooms[room].trap === id;
      const syn = synergyOf(S.rooms[room].theme, id);
      g.rect(340, y, 130, 34).fill(active ? C.wallLit : C.ink)
        .stroke({ width: 1, color: active ? C.gold : syn && owned ? C.purple : owned ? C.stoneLit : C.wall, alignment: 0 });
      label(uiLayer, cut(owned ? t.name : `${t.name}·未解锁`, 9), 344, y + 1, 12, owned ? (active ? C.white : C.bone) : C.stoneLit);
      if (syn) label(uiLayer, '共鸣', 440, y + 1, 12, C.purple);
      label(uiLayer, cut(syn ? syn.desc : t.desc, 15), 344, y + 18, 12, syn ? C.purple : C.stoneLit);
      if (owned) hits.add(340, y, 130, 34, () => {
        S.rooms[room].trap = id; persist(); playSfx('place'); say(`${room + 1}房安装${t.name}`); render();
      });
      y += 38;
    }
    pager(g, 'side-trap', pt.pages, 340, 216, 130);
    return;
  }
  if (sel.kind === 'slot' && sel.which === 'theme') {
    const room = sel.room;
    labelC(uiLayer, `${room + 1}房 主题`, 405, 46, 12, C.white);
    const tlist = ['stone', 'poison', 'bonepit', 'curse', 'forge', 'mirror', 'mire']             ;
    const pth = paged('side-theme', tlist, 4);
    let y = 62;
    for (const id of pth.view) {
      const t = THEMES[id];
      const owned = S.themes.includes(id);
      const active = S.rooms[room].theme === id;
      const usedCount = S.rooms.filter((r, i) => r.theme === id && i !== room).length;
      const capped = id !== 'stone' && usedCount >= 2;
      const syn = synergyOf(id, S.rooms[room].trap);
      g.rect(340, y, 130, 34).fill(active ? C.wallLit : C.ink)
        .stroke({ width: 1, color: active ? C.gold : syn && owned ? C.purple : owned ? C.stoneLit : C.wall, alignment: 0 });
      label(uiLayer, cut(owned ? t.name : `${t.name}·未解锁`, 9), 344, y + 1, 12, owned ? (active ? C.white : C.bone) : C.stoneLit);
      if (syn) label(uiLayer, '共鸣', 440, y + 1, 12, C.purple);
      label(uiLayer, cut(capped ? '同主题最多两间' : syn ? syn.desc : t.desc, 15), 344, y + 18, 12, capped ? C.red : syn ? C.purple : C.stoneLit);
      if (owned && !capped) hits.add(340, y, 130, 34, () => {
        S.rooms[room].theme = id; persist(); playSfx('place'); render();
      });
      y += 38;
    }
    pager(g, 'side-theme', pth.pages, 340, 216, 130);
    return;
  }
  if (sel.kind === 'inst') {
    const inst = instById(sel.uid);
    if (!inst) { sel = null; return; }
    const k = instKind(inst);
    labelC(uiLayer, cut(`${k.name} Lv${inst.lv}`, 11), 405, 46, 12, C.white);
    const s = sprite(k.tex, 405, 96, 36);
    uiLayer.addChild(s);
    const mult = LEVEL_MULT[inst.lv - 1];
    label(uiLayer, `生命 ${Math.round(k.hp * mult)}  攻击 ${Math.round(k.atk * mult)}`, 340, 100, 12, C.bone);
    label(uiLayer, `防御 ${Math.round(k.def * mult)}  速度 ${k.spd.toFixed(1)}`, 340, 114, 12, C.bone);
    const at = roomOf(inst.uid);
    label(uiLayer, at < 0 ? '驻守：空闲' : `驻守：${at + 1}房`, 340, 128, 12, at < 0 ? C.stoneLit : C.gold);
    label(uiLayer, `技能 ${k.skill}`, 340, 142, 12, C.purple);
    wrapText(uiLayer, cut(k.skillDesc, 20), 340, 161, 130, 12, C.stoneLit);
    const instAfs = selectedAffixes(k.affixes);
    if (instAfs.length) label(uiLayer, `词缀 ${instAfs.map((a) => a.name).join('・')}`, 340, 176, 12, C.gold);
    if (inst.lv < 5) {
      const need = XP_PER_LEVEL[inst.lv - 1];
      // 经验行与升级按钮之间只有 18px：文字包围盒高 16，行 y 必须 ≤192 才不压到按钮标签
      bar(uiGfx, 340, 186, 130, 6, inst.xp / need, C.green);
      label(uiLayer, `经验 ${inst.xp}/${need}`, 340, 192, 12, C.bone);
      const cost = UPGRADE_COST[inst.lv - 1];
      const can = inst.xp >= need && S.bone >= cost;
      button(g, uiLayer, hits, 340, 205, 130, 15, `升级 ${cost}骨币`, () => {
        inst.xp -= need; inst.lv++; S.bone -= cost; playSfx('buy'); persist(); say(`${k.name} 升到 Lv${inst.lv}`); render();
      }, { size: 12, enabled: can, fill: C.greenDark, border: C.green, color: C.white });
    } else {
      label(uiLayer, instAfs.length ? `被动 ${k.passive}` : `满级被动：${k.passive}`, 340, 190, 12, C.gold);
    }
    const gcount = (inst.graft ?? []).length;
    if (isCustomKind(inst.kind)) {
      button(g, uiLayer, hits, 340, 224, 42, 16, '重组', () => openStitch(inst.uid), { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
      button(g, uiLayer, hits, 386, 224, 46, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
      button(g, uiLayer, hits, 436, 224, 34, 16, '拆', () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
    } else {
      button(g, uiLayer, hits, 340, 224, 62, 16, gcount ? `改造 ${gcount}/${GRAFT_CAP}` : '改造', () => openGraft(inst.uid), { size: 12, fill: C.purpleDark, border: gcount ? C.gold : C.purple, color: C.white });
      button(g, uiLayer, hits, 406, 224, 64, 16, `遣散+${Math.round(k.cost * 0.5)}`, () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
    }
    return;
  }
  if (sel.kind === 'monkind') {
    const k = monKind(sel.id);
    labelC(uiLayer, k.name, 405, 44, 12, isCustomKind(k.id) ? C.purple : C.white);
    uiLayer.addChild(sprite(k.tex, 405, 94, 36));
    label(uiLayer, `生命 ${k.hp}  攻击 ${k.atk}`, 340, 98, 12, C.bone);
    label(uiLayer, `防御 ${k.def}  速度 ${k.spd.toFixed(1)}`, 340, 117, 12, C.bone);
    label(uiLayer, `站位 ${k.row === 'front' ? '前排' : k.row === 'back' ? '后排' : '任意'}`, 340, 136, 12, C.bone);
    label(uiLayer, `技能 ${k.skill}`, 340, 155, 12, C.purple);
    wrapText(uiLayer, cut(k.skillDesc, 30), 340, 174, 130, 12, C.stoneLit);
    button(g, uiLayer, hits, 340, 214, 130, 18, `${isCustomKind(k.id) ? '再缝一只' : '招募'} ${k.cost}骨币`,
      () => recruit(k.id),
      { size: 12, enabled: S.bone >= k.cost, fill: C.greenDark, border: C.green, color: C.white });
    return;
  }
  if (sel.kind === 'shop') {
    const it = shopItems().find((i) => i.id === sel .kind === true ? false : true);
    void it;
    const item = shopItems().find((i) => i.id === (sel                                ).id);
    if (!item) { sel = null; return; }
    labelC(uiLayer, item.name, 405, 46, 12, C.white);
    wrapText(uiLayer, item.desc, 340, 70, 130, 12, C.bone);
    label(uiLayer, item.owned ? '已拥有' : `价格 ${item.cost} 魔质`, 340, 150, 12, item.owned ? C.green : C.purple);
    if (!item.owned) {
      button(g, uiLayer, hits, 340, 200, 130, 22, '购买', () => {
        if (S.mana < item.cost) { say('魔质不足'); return; }
        S.mana -= item.cost; item.buy(); playSfx('buy'); persist(); say(`${item.name} 已解锁`); render();
      }, { size: 12, enabled: S.mana >= item.cost, fill: C.purpleDark, border: C.purple, color: C.white });
    }
  }
}

// ---------- 统一翻页 ----------
// 页码按 key 存表：换页只动这里，页面绘制只管"这一页该画哪几条"。
const pageState                         = {};
// 本帧画出来的翻页控件（按绘制顺序）＋键盘焦点：左右键翻的是"高亮那一个"
let livePagers                                   = [];
let pagerFocus                = null;
function paged   (key        , items     , per        )                                                           {
  const pages = Math.max(1, Math.ceil(items.length / per));
  const page = Math.min(pageState[key] ?? 0, pages - 1);
  pageState[key] = page;
  return { view: items.slice(page * per, page * per + per), page, pages, from: page * per };
}
function turnPage(key        , pages        , d        ) {
  pageState[key] = ((pageState[key] ?? 0) + pages + d) % pages;
  pagerFocus = key;
  playSfx('tab');
  render();
}
function pager(g               , key        , pages        , x        , y        , w        , label2 = '') {
  if (pages <= 1) return;
  livePagers.push({ key, pages });
  const focused = pagerFocus === key;
  const page = pageState[key] ?? 0;
  const col = focused ? C.gold : C.bone;
  button(g, uiLayer, hits, x, y, 22, 14, '◀', () => turnPage(key, pages, -1), { size: 12, border: col, color: col });
  labelC(uiLayer, `${label2}${page + 1}/${pages}`, x + w / 2, y, 12, focused ? C.gold : C.stoneLit);
  button(g, uiLayer, hits, x + w - 22, y, 22, 14, '▶', () => turnPage(key, pages, 1), { size: 12, border: col, color: col });
}
// 左右键翻页；Tab 在多个列表之间换焦点
function pagerKey(dir        ) {
  if (!livePagers.length) return false;
  let cur = livePagers.find((p) => p.key === pagerFocus) ?? livePagers[0];
  turnPage(cur.key, cur.pages, dir);
  return true;
}
function pagerNextFocus() {
  if (livePagers.length < 2) return false;
  const i = livePagers.findIndex((p) => p.key === pagerFocus);
  pagerFocus = livePagers[(i + 1) % livePagers.length].key;
  playSfx('tab');
  render();
  return true;
}

function wrapText(parent                , str        , x        , y        , w        , size = 12, color = C.bone) {
  const t = txt(str, size, color);
  t.style.wordWrap = true;
  t.style.wordWrapWidth = w;
  t.style.breakWords = true;
  t.x = Math.round(x);
  t.y = Math.round(y);
  parent.addChild(t);
  return t;
}

// ---------- 秘闻（自由事件流 + 变量系统） ----------
// 剧情不再有章节：每次「听取秘闻」由 provider 抽一个场景（本地事件池；接 LLM 只需换 provider）。
// 出口挂 Effect[]，全部通过 storyBridge 落到存档 —— 资源/怪群/工坊解锁/封印/战场修正都能被剧情改写。
;                                                                                                                        
let storyRun                  = null;
let storyBusy = false;
let storyInput                          = null;
const STORY_INPUT = { x: 22, y: 206, w: 296, h: 18 };
const storyRng = () => Math.random();

function storyVars()                         { return S.story.vars; }

const storyBridge              = {
  get(path) {
    if (path.startsWith('var.')) return S.story.vars[path.slice(4)] ?? 0;
    if (path.startsWith('has.')) {
      const w = path.slice(4);
      return hasUnlock(w) ? 1 : 0;
    }
    switch (path) {
      case 'bone': return S.bone;
      case 'mana': return S.mana;
      case 'raidNo': return S.raidNo;
      case 'overtime': return S.overtime ? 1 : 0;
      case 'monsters': return S.monsters.length;
      case 'maxLv': return S.monsters.reduce((n, m) => Math.max(n, m.lv), 0);
      case 'sumLv': return S.monsters.reduce((n, m) => n + m.lv, 0);
      case 'customs': return S.customs.length;
      case 'traps': return S.traps.filter((t) => t !== 'none').length;
      case 'themes': return S.themes.length;
      case 'sealLv': return S.sealLv;
      case 'trapLv': return S.trapLv;
      case 'sealMax': return sealMax();
      case 'trapPower': return Math.round(trapPower() * 100);
      case 'rooms.filled': return S.rooms.filter((r) => r.front != null || r.back != null).length;
      case 'parts': return unlockedPartCount();
      case 'affixes': return unlockedAffixCount();
      case 'mods': return S.story.mods.length;
      case 'reports': return S.reports.length;
      case 'wins': return S.reports.filter((r) => r.win).length;
      case 'losses': return S.reports.filter((r) => !r.win).length;
      case 'budget': return S.bone + S.mana * 3;
      default: return 0;
    }
  },
  addRes(bone, mana) {
    S.bone = Math.max(0, S.bone + bone);
    S.mana = Math.max(0, S.mana + mana);
  },
  setVar(key, v) { S.story.vars[key] = v; },
  addVar(key, n) { S.story.vars[key] = Number(S.story.vars[key] ?? 0) + n; },
  grantMonster(kind, lv) {
    const lk = kindById(kind);
    if (lk?.legend) {
      // 剧情要送传奇族 → 送一名"具体英雄"进名册，而不是一只无名兵种
      if (S.champs.length >= CHAMP_CAP) return { ok: false, text: '麾下英雄已满，它在门外徘徊' };
      const c = newChamp(S.champNext++, {
        id: 0, race: lk.id, name: randomName(lk.id, storyRng, S.champs.map((x) => x.name)),
        traits: ['loyal'], potential: 1,
      });
      c.lv = Math.max(1, Math.min(CHAMP_LV_CAP, lv * 2));
      S.champs.push(c); S.champPot[c.uid] = 1;
      return { ok: true, text: `${c.name}（${lk.name}）加入麾下（Lv${c.lv}）` };
    }
    if (S.monsters.length >= 10) return { ok: false, text: '怪物栏已满，它只能在走廊里晃' };
    const k = lk ?? MONSTERS[0];
    S.monsters.push({ uid: S.uidNext++, kind: k.id, lv, xp: 0 });
    return { ok: true, text: `${k.name} 加入编制（Lv${lv}）` };
  },
  levelMonster(sel, add) {
    if (!S.monsters.length) return { ok: false, text: '' };
    const list = [...S.monsters];
    let m             ;
    if (typeof sel === 'number') m = S.monsters.find((x) => x.uid === sel) ?? list[0];
    else if (sel === 'strongest') m = list.sort((a, b) => b.lv - a.lv)[0];
    else if (sel === 'weakest') m = list.sort((a, b) => a.lv - b.lv)[0];
    else m = list[Math.floor(storyRng() * list.length)];
    const before = m.lv;
    m.lv = Math.max(1, Math.min(5, m.lv + add));
    if (m.lv === before) return { ok: false, text: `${monKind(m.kind).name} 已经到顶了` };
    return { ok: true, text: `${monKind(m.kind).name} Lv${before}→Lv${m.lv}` };
  },
  loseMonster(sel) {
    if (!S.monsters.length) return { ok: false, text: '' };
    const list = [...S.monsters];
    let m             ;
    if (typeof sel === 'number') m = S.monsters.find((x) => x.uid === sel) ?? list[0];
    else if (sel === 'weakest') m = list.sort((a, b) => a.lv - b.lv)[0];
    else m = list[Math.floor(storyRng() * list.length)];
    S.monsters = S.monsters.filter((x) => x.uid !== m.uid);
    for (const r of S.rooms) {
      if (r.front === m.uid) r.front = null;
      if (r.back === m.uid) r.back = null;
    }
    return { ok: true, text: `失去了 ${monKind(m.kind).name}` };
  },
  unlock(what) {
    if (hasUnlock(what)) return { ok: false, text: '' };
    const [kind, id] = what.split(':');
    if (kind === 'theme' && id in THEMES) { S.themes.push(id           ); return { ok: true, text: `解锁主题·${THEMES[id           ].name}` }; }
    if (kind === 'trap' && id in TRAPS) { S.traps.push(id          ); return { ok: true, text: `解锁陷阱·${TRAPS[id          ].name}` }; }
    if (kind === 'part') {
      const p = partById(id);
      if (!p) return { ok: false, text: '' };
      S.story.unlocks.push(what);
      return { ok: true, text: `工坊解锁部件·${p.name}` };
    }
    if (kind === 'affix') {
      const a = PART_AFFIXES.find((x) => x.id === id);
      if (!a) return { ok: false, text: '' };
      S.story.unlocks.push(what);
      return { ok: true, text: `工坊解锁词缀·${a.name}` };
    }
    return { ok: false, text: '' };
  },
  addDev(seal, trap) {
    const s0 = S.sealLv, t0 = S.trapLv;
    S.sealLv = Math.max(0, Math.min(3, S.sealLv + seal));
    S.trapLv = Math.max(0, Math.min(3, S.trapLv + trap));
    const p           = [];
    if (S.sealLv !== s0) p.push(`封印上限→${sealMax()}`);
    if (S.trapLv !== t0) p.push(`陷阱效果→${Math.round(trapPower() * 100)}%`);
    return { ok: p.length > 0, text: p.join('，') };
  },
  addMod(m) {
    S.story.mods = S.story.mods.filter((x) => x.id !== m.id);
    S.story.mods.push({ ...m });
  },
  shiftRaid(n) {
    // 负数=推迟下一波（把当前轮次往回拨），正数=提前
    const before = S.raidNo;
    S.raidNo = Math.max(1, S.raidNo + n);
    if (S.raidNo === before) return { ok: false, text: '' };
    return { ok: true, text: n < 0 ? `下一波推迟到第${S.raidNo}轮` : `袭击提前到第${S.raidNo}轮` };
  },
  addXp(sel, add) {
    if (!S.monsters.length) return { ok: false, text: '' };
    if (sel === 'all') {
      S.monsters.forEach((m) => { m.xp = Math.max(0, m.xp + add); });
      return { ok: true, text: `全体经验${add > 0 ? '+' : ''}${add}` };
    }
    const m = S.monsters[Math.floor(storyRng() * S.monsters.length)];
    m.xp = Math.max(0, m.xp + add);
    return { ok: true, text: `${monKind(m.kind).name} 经验${add > 0 ? '+' : ''}${add}` };
  },
};

function hasUnlock(what        ) {
  const [kind, id] = what.split(':');
  if (kind === 'theme') return S.themes.includes(id           );
  if (kind === 'trap') return S.traps.includes(id          );
  return S.story.unlocks.includes(what);
}
// 剧情解锁能越过轮次门槛：工坊里判定「可用」时两者取或
function partOpen(p                                    ) {
  return p.unlockRaid <= maxUnlockRaid() || S.story.unlocks.includes(`part:${p.id}`);
}
function affixOpen(a                                    ) {
  return a.unlockRaid <= maxUnlockRaid() || S.story.unlocks.includes(`affix:${a.id}`);
}
const unlockedPartCount = () => PARTS.filter(partOpen).length;
const unlockedAffixCount = () => PART_AFFIXES.filter(affixOpen).length;

// 剧情修正在每场战斗后倒计时；raids<0 为永久
function tickStoryMods() {
  S.story.mods = S.story.mods.filter((m) => {
    if (m.raids < 0) return true;
    m.raids -= 1;
    return m.raids > 0;
  });
}
function battleMods() { return foldMods(S.story.mods); }

// 混合事件源：接了外部叙事者就先问它，拿不到（关闭/超时/JSON 坏）立刻回落本地事件池。
// 玩家永远能听到秘闻 —— LLM 只是内容来源之一，不是必需依赖。
const hybridProvider                = {
  id: 'hybrid',
  name: '地牢秘闻＋外部叙事者',
  async next(snap, pick) {
    if (hasBackend()) {
      const sc = await llmScene(snap, String(S.story.vars.lairName ?? ''));
      if (sc) return sc;
    }
    return localProvider.next(snap, pick);
  },
};

function storyHasNew() { return !storyRun && S.story.credits > 0; }

function storySnapshot()                {
  const reads                         = {};
  for (const k of READ_PATHS) reads[k] = storyBridge.get(k);
  return { reads, vars: { ...S.story.vars }, seen: [...S.story.seen] };
}

function pushStoryLine(text        , who         , tone                   ) {
  if (!storyRun) return;
  storyRun.log.push({ who, text, tone });
}

async function drawStoryScene() {
  if (storyBusy) return;
  if (S.story.credits <= 0) { say('暂时没有新的秘闻，打完下一波再来'); return; }
  storyBusy = true;
  render();
  try {
    const sc = await requestScene(storyBridge, storySnapshot(), storyRng);
    if (!sc) { say('地牢今夜无事发生'); return; }
    S.story.credits -= 1;
    openScene(sc, true);
  } finally {
    storyBusy = false;
    persist();
    render();
  }
}

function openScene(sc       , fresh         ) {
  if (fresh || !storyRun) storyRun = { scene: sc, log: [], pending: null };
  else storyRun.scene = sc;
  if (!S.story.seen.includes(sc.id)) S.story.seen.push(sc.id);
  if (S.story.seen.length > 40) S.story.seen.splice(0, S.story.seen.length - 40);
  pushStoryLine(fillText(sc.text, storyBridge), sc.who);
  playSfx('tab');
  syncStoryInput();
  persist();
  render();
}

// 出口统一收口：回应文字 + 效果结算 + 续接下一幕
function resolveExit(reply        , effects                      , next                    ) {
  if (!storyRun) return;
  pushStoryLine(fillText(reply, storyBridge), undefined, 'reply');
  const lines = applyEffects(storyBridge, effects);
  if (lines.length) {
    pushStoryLine(lines.join('　'), undefined, 'gain');
    playSfx('buy');
  }
  const nx = next ? sceneById(next) : null;
  if (nx) openScene(nx, false);
  else {
    storyRun.scene = { ...storyRun.scene, choices: undefined, input: undefined };
    storyRun.pending = 'done';
    syncStoryInput();
    persist();
    render();
  }
}

function closeStory() {
  storyRun = null;
  removeStoryInput();
  persist();
  render();
}

function submitStoryInput() {
  const run = storyRun;
  const spec = run?.scene.input;
  if (!run || !spec) return;
  const raw = (storyInput?.value ?? '').slice(0, spec.max).trim();
  if (spec.store) S.story.vars[spec.store] = raw || '（沉默）';
  const rule = spec.rules.find((r) => r.keys.some((k) => raw.includes(k)));
  if (storyInput) storyInput.value = '';
  const ex = rule ?? spec.fallback;
  resolveExit(ex.reply, ex.effects, ex.next);
}

function ensureStoryInput() {
  if (storyInput) return;
  const el = document.createElement('input');
  el.type = 'text';
  el.style.cssText = 'position:fixed;z-index:9;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;padding:0 4px;';
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submitStoryInput();
  });
  document.body.appendChild(el);
  storyInput = el;
  positionStoryInput();
}

function removeStoryInput() {
  if (storyInput) { storyInput.remove(); storyInput = null; }
}

function syncStoryInput() {
  const spec = storyRun?.scene.input;
  // 竖屏只显示旋转提示，此时 DOM 输入框不能浮在提示上面
  if (screen === 'manage' && tab === 'story' && spec && !stitch && !forge && !portrait) {
    ensureStoryInput();
    if (storyInput) {
      storyInput.maxLength = spec.max;
      storyInput.placeholder = spec.placeholder;
      storyInput.style.display = 'block';
      positionStoryInput();
    }
  } else if (storyInput) {
    storyInput.style.display = 'none';
  }
}

function positionStoryInput() {
  if (!storyInput) return;
  const rect = app.canvas.getBoundingClientRect();
  const sx = rect.width / app.screen.width;
  const sy = rect.height / app.screen.height;
  storyInput.style.left = `${Math.round(rect.left + (root.x + STORY_INPUT.x * viewScale) * sx)}px`;
  storyInput.style.top = `${Math.round(rect.top + (root.y + STORY_INPUT.y * viewScale) * sy)}px`;
  storyInput.style.width = `${Math.round(STORY_INPUT.w * viewScale * sx)}px`;
  storyInput.style.height = `${Math.round(STORY_INPUT.h * viewScale * sy)}px`;
  storyInput.style.fontSize = `${Math.max(11, Math.round(11 * viewScale * sy))}px`;
}

function pageStory(g               ) {
  if (!storyRun) {
    label(uiLayer, '地牢秘闻', 20, 42, 12, C.white);
    label(uiLayer, `事件源：${getProvider().name}`, 300, 42, 12, C.stoneLit);
    panelF(g, uiLayer, 'inset', 16, 58, 218, 112, C.ink);
    label(uiLayer, '剧情变量', 26, 62, 12, C.purple);
    const all = Object.entries(S.story.vars);
    const pv = paged('story-vars', all, 5);
    label(uiLayer, `${all.length}`, 208, 62, 12, C.stoneLit);
    let vy = 78;
    if (!all.length) label(uiLayer, '（还没有任何记录）', 26, vy, 12, C.wall);
    for (const [k, v] of pv.view) {
      label(uiLayer, cut(k, 8), 26, vy, 12, C.bone);
      label(uiLayer, cut(String(v), 6), 140, vy, 12, C.gold);
      vy += 15;
    }
    pager(g, 'story-vars', pv.pages, 26, 154, 90);
    panelF(g, uiLayer, 'inset', 244, 58, 220, 112, C.ink);
    label(uiLayer, '生效中的战场变化', 254, 62, 12, C.purple);
    const pmd = paged('story-mods', S.story.mods, 2);
    let my = 78;
    if (!S.story.mods.length) label(uiLayer, '（无）', 254, my, 12, C.wall);
    for (const m of pmd.view) {
      label(uiLayer, cut(`${m.name}·${m.raids < 0 ? '永久' : `${m.raids}轮`}`, 17), 254, my, 12, C.gold);
      label(uiLayer, cut(modSummary(m), 17), 254, my + 19, 12, C.stoneLit);
      my += 40;
    }
    pager(g, 'story-mods', pmd.pages, 254, 154, 90);
    const can = S.story.credits > 0;
    label(uiLayer, can ? `可听取的秘闻：${S.story.credits} 次` : '打完下一波袭击会有新的秘闻', 20, 178, 12, can ? C.gold : C.stoneLit);
    label(uiLayer, '选择与你写下的话会写进变量，并改动资源、怪群、工坊与战场。', 20, 192, 12, C.wall);
    button(g, uiLayer, hits, 20, 206, 200, 26, storyBusy ? '正在发生…' : '听取秘闻', () => { void drawStoryScene(); },
      { enabled: can && !storyBusy, fill: C.purpleDark, border: C.purple, color: C.white });
    label(uiLayer, `已见事件 ${S.story.seen.length}`, 232, 212, 12, C.stoneLit);
    return;
  }

  const run = storyRun;
  label(uiLayer, '地牢秘闻', 20, 42, 12, C.gold);
  button(g, uiLayer, hits, 400, 40, 56, 16, '离开', () => closeStory(), { size: 12, border: C.red, color: C.red });

  // 羊皮卷正文：从最新一段往回收，真实测量 pixi 文本高度，装不下的旧段直接丢掉
  // （字号 12 的中文点阵换行位置受标点影响，按字数估算会低估行数、压到下方按钮）。
  const SCROLL = { x: 16, y: 60, w: 448, h: 116 };
  panelF(g, uiLayer, 'scroll', SCROLL.x, SCROLL.y, SCROLL.w, SCROLL.h, 0xE7D7A1);
  const room = SCROLL.h - 14;
  const built                                                    = [];
  let used = 0;
  for (let i = run.log.length - 1; i >= 0; i--) {
    const entry = run.log[i];
    const last = i === run.log.length - 1;
    const col = entry.tone === 'gain' ? 0x2E6B34 : last ? 0x241C33 : 0x8A5B34;
    const body = wrapText(uiLayer, entry.text, 26, 0, SCROLL.w - 24, 12, col);
    const who = entry.who ? label(uiLayer, `【${entry.who}】`, 26, 0, 12, last ? 0x5B3A9B : 0x8A5B34) : undefined;
    const h = Math.ceil(body.height) + (who ? 14 : 0) + 6;
    if (used + h > room && built.length > 0) {
      body.destroy();
      who?.destroy();
      run.log.splice(0, i + 1);
      break;
    }
    used += h;
    built.unshift({ who, body, h });
  }
  let y = SCROLL.y + 8;
  for (const b of built) {
    if (b.who) { b.who.y = Math.round(y); y += 14; }
    b.body.y = Math.round(y);
    y += b.h - (b.who ? 14 : 0);
  }

  const sc = run.scene;
  if (sc.input) {
    const spec = sc.input;
    label(uiLayer, spec.prompt, 22, 182, 12, C.purple);
    label(uiLayer, `最多${spec.max}字·回车提交`, 200, 182, 12, C.wall);
    // 输入框用原生 DOM（中文输入法/手机键盘），这里只画它的槽
    frame(uiLayer, 'inset', STORY_INPUT.x - 2, STORY_INPUT.y - 2, STORY_INPUT.w + 4, STORY_INPUT.h + 4, { tint: C.stoneLit });
    button(g, uiLayer, hits, 326, 204, 62, 22, '说出口', () => submitStoryInput(),
      { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
    button(g, uiLayer, hits, 394, 204, 62, 22, '不说话', () => { if (storyInput) storyInput.value = ''; submitStoryInput(); },
      { size: 12, border: C.stoneLit, color: C.stoneLit });
    return;
  }
  if (sc.choices && sc.choices.length) {
    const list = sc.choices;
    list.forEach((c, i) => {
      const open = testConds(storyBridge, c.when);
      const bw = 440 / list.length - 6;
      const bx = 20 + i * (bw + 6);
      button(g, uiLayer, hits, bx, 186, bw, 40, c.label, () => resolveExit(c.reply, c.effects, c.next),
        { size: 12, enabled: open, fill: C.wallLit, border: C.bone, color: C.white });
      if (!open && c.lockText) label(uiLayer, c.lockText, bx + 4, 228, 12, C.red);
    });
    return;
  }
  const more = S.story.credits > 0;
  button(g, uiLayer, hits, 20, 196, 210, 26, more ? '再听一个秘闻' : '就到这里', () => { if (more) void drawStoryScene(); else closeStory(); },
    { fill: more ? C.purpleDark : C.wallLit, border: more ? C.purple : C.bone, color: C.white });
  if (more) button(g, uiLayer, hits, 244, 196, 210, 26, '回去经营', () => closeStory(), { border: C.bone, color: C.bone });
}

// 统领席坐的是「英雄名册里的具体个体」，和兵位是两套 uid 空间
function seatChamp(room        , uid        ) {
  const c = champById(uid);
  if (!c) return;
  for (let i = 0; i < 4; i++) if (S.rooms[i].leader === uid) { S.rooms[i].leader = null; S.rooms[i].flank = null; }
  S.rooms[room].leader = uid;
  slotFlash = { room, which: 'leader', t: 0.45 };
  const bx = ROOM_BOX(room);
  spawnDust(bx.x + 56, bx.y + 54);
  playSfx('place');
  persist();
  say(`${c.name} 就位于 ${room + 1}房`);
  render();
}

function assign(room        , which         , uid        ) {
  if (which === 'leader') { seatChamp(room, uid); return; }
  const inst = instById(uid);
  if (!inst) return;
  const k = instKind(inst);
  if (which === 'flank' && S.rooms[room].leader == null) { say('侧翼位要先在本房安置统领'); return; }
  if (which === 'front' || which === 'back') {
    if (k.row !== 'any' && k.row !== which) { say(`${k.name}只能驻守${k.row === 'front' ? '前排' : '后排'}`); return; }
  }
  for (let i = 0; i < 4; i++) {
    for (const w of ['front', 'back', 'flank']             ) if (S.rooms[i][w] === uid) S.rooms[i][w] = null;
  }
  S.rooms[room][which] = uid;
  slotFlash = { room, which, t: 0.45 };
  const bx = ROOM_BOX(room);
  spawnDust(bx.x + (which === 'front' ? 20 : which === 'back' ? 56 : which === 'leader' ? 56 : 20), bx.y + (which === 'front' || which === 'flank' ? 96 : 54));
  playSfx('place');
  persist();
  render();
}

function recruit(kindId        ) {
  const k = monKind(kindId);
  if (S.bone < k.cost) { say('骨币不足'); return; }
  if (S.monsters.length >= 10) { say('怪物栏已满（10）'); return; }
  S.bone -= k.cost;
  const inst              = { uid: S.uidNext++, kind: k.id, lv: 1, xp: 0 };
  S.monsters.push(inst);
  sel = { kind: 'inst', uid: inst.uid };
  playSfx('buy');
  persist();
  say(`招募了${k.name}`);
  render();
}

const countPlaced = () => S.rooms.reduce((n, r) =>
  n + (r.front != null ? 1 : 0) + (r.back != null ? 1 : 0) + (r.flank != null ? 1 : 0), 0)
  + S.rooms.filter((r) => r.leader != null).length;
let mobPage = 0;

// ---------- 英雄（麾下统领的具体个体：征召、培养、专精、疲劳轮换） ----------
const heroHasNew = () => S.champs.some((c) => canLevel(c) && S.bone >= upCostOf(c)) || S.champs.some((c) => pendingTier(c) > 0);

function refreshCands(force = false) {
  // 候选池每轮袭击刷新一次；玩家也能花魔质手动重掷
  if (!force && S.candRaid === S.raidNo && S.cands.length) return;
  const seed = S.raidNo * 7919 + S.candNext * 131 + (force ? Date.now() % 9973 : 0);
  let t = seed >>> 0;
  const rng = () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  S.cands = rollCands(S.raidNo, S.story.unlocks.map((u) => u.split(':')[1]), rng, S.candNext, 6);
  S.candNext += 6;
  pageState['cands'] = 0;
  S.candRaid = S.raidNo;
}

function recruitChamp(c      ) {
  if (S.champs.length >= CHAMP_CAP) { say(`麾下已满（${CHAMP_CAP}名英雄）`); return; }
  const cost = candCostOf(c);
  if (S.bone < cost) { say('骨币不足'); return; }
  S.bone -= cost;
  const ch = newChamp(S.champNext++, c);
  S.champs.push(ch);
  S.champPot[ch.uid] = c.potential;
  S.cands = S.cands.filter((x) => x.id !== c.id);
  heroSel = ch.uid;
  heroTab = 'roster';
  playSfx('buy');
  persist();
  say(`${ch.name} 加入了麾下`);
  render();
}
const candCostOf = (c      ) => Math.round((monKind(c.race).cost) * (1 + c.potential * 0.18));

function levelChamp(c       ) {
  if (!canLevel(c)) return;
  const cost = upCostOf(c);
  if (S.bone < cost) { say('骨币不足'); return; }
  S.bone -= cost;
  c.xp -= xpNeed(c.lv);
  c.lv++;
  playSfx('buy');
  persist();
  say(`${c.name} 升到 Lv${c.lv}${pendingTier(c) ? '，可选新专精' : ''}`);
  render();
}

function pickTalent(c       , id          ) {
  const tier = pendingTier(c);
  if (!tier) return;
  if (TALENTS[id].tier !== tier) return;
  c.talents.push(id);
  playSfx('place');
  persist();
  say(`${c.name} 习得「${TALENTS[id].name}」`);
  render();
}

function restChamp(c       ) {
  if (c.fatigue <= 0) { say(`${c.name} 已经很精神了`); return; }
  if (S.mana < REST_MANA) { say('魔质不足'); return; }
  S.mana -= REST_MANA;
  c.fatigue = Math.max(0, c.fatigue - 55);
  playSfx('place');
  persist();
  say(`${c.name} 在孵化池里泡了一夜`);
  render();
}

function healChamp(c       ) {
  if (!c.wounds) { say(`${c.name} 身上没有伤`); return; }
  if (S.mana < HEAL_MANA) { say('魔质不足'); return; }
  S.mana -= HEAL_MANA;
  c.wounds--;
  playSfx('place');
  persist();
  say(`${c.name} 的伤合上了一道（余${c.wounds}）`);
  render();
}

function respecChamp(c       ) {
  const cost = respecCost(c);
  if (!cost) { say('还没有专精可洗'); return; }
  if (S.mana < cost) { say('魔质不足'); return; }
  S.mana -= cost;
  c.talents = [];
  playSfx('place');
  persist();
  say(`${c.name} 的专精已清空，可重新选择`);
  render();
}

function dismissChamp(c       ) {
  S.champs = S.champs.filter((x) => x.uid !== c.uid);
  for (const r of S.rooms) if (r.leader === c.uid) { r.leader = null; r.flank = null; }
  delete S.champPot[c.uid];
  S.bone += Math.round(monKind(c.race).cost * 0.4);
  if (heroSel === c.uid) heroSel = null;
  playSfx('place');
  persist();
  say(`${c.name} 离开了地牢`);
  render();
}

function pageHero(g               ) {
  refreshCands();
  if (heroSel != null && !champById(heroSel)) heroSel = null;
  if (heroSel == null && S.champs.length) heroSel = S.champs[0].uid;
  for (const [i, tb] of ([['roster', `麾下 ${S.champs.length}/${CHAMP_CAP}`], ['recruit', '征召']]         ).entries()) {
    const on = heroTab === tb[0];
    button(g, uiLayer, hits, 6 + i * 82, 38, 78, 16, tb[1], () => { heroTab = tb[0]; playSfx('tab'); render(); },
      { size: 12, fill: on ? C.wallLit : C.ink, border: on ? C.gold : C.stoneLit, color: on ? C.white : C.stoneLit });
  }
  if (heroTab === 'roster') drawRoster(g); else drawRecruit(g);
}

function drawRoster(g               ) {
  panelF(g, uiLayer, 'stone', 4, 58, 158, 176, C.wall);
  if (!S.champs.length) {
    wrapText(uiLayer, '麾下还没有英雄。去「征召」选一位传奇族个体：它们有名字、会升级，坐统领席带兵。', 12, 70, 142, 12, C.stoneLit);
  }
  const pr = paged('roster', S.champs, 5);
  let y = 64;
  for (const c of pr.view) {
    const on = heroSel === c.uid;
    const at = roomOfChamp(c.uid);
    const ft = fatigueTier(c.fatigue);
    g.rect(8, y, 150, 26).fill(on ? C.wallLit : C.ink).stroke({ width: 1, color: on ? C.gold : C.goldDark, alignment: 0 });
    uiLayer.addChild(sprite(monKind(c.race).tex, 20, y + 25, 24));
    const nm = c.name.split('·')[0];
    label(uiLayer, nm.length > 4 ? `${nm.slice(0, 4)}…` : nm, 34, y + 6, 12, on ? C.white : C.gold);
    label(uiLayer, `${c.lv}`, 86, y + 6, 12, C.bone);
    label(uiLayer, at < 0 ? '待' : `${at + 1}房`, 102, y + 6, 12, at < 0 ? C.green : C.gold);
    label(uiLayer, ft.text.slice(0, 2), 128, y + 6, 12, ft.bad ? C.red : C.steel);
    if (canLevel(c) && S.bone >= upCostOf(c)) g.circle(151, y + 6, 3).fill(C.red);
    else if (pendingTier(c)) g.circle(151, y + 6, 3).fill(C.purple);
    for (let w = 0; w < (c.wounds || 0); w++) g.rect(140 + w * 5, y + 18, 4, 3).fill(C.red);
    hits.add(8, y, 150, 26, () => { heroSel = c.uid; playSfx('tab'); render(); });
    y += 28;
  }
  pager(g, 'roster', pr.pages, 8, 214, 150);
  const c = champById(heroSel);
  if (!c) { label(uiLayer, '先在「征召」里选一位英雄', 176, 70, 12, C.stoneLit); return; }
  drawChampDetail(g, c);
}

// 把 MonEff 里"由专精/装备/词缀写入的机制字段"翻成人话 —— 新专精大半给机制不给数值，
// 不显示的话玩家在状态页看不到自己点了什么。
function effText(e        )         {
  const out           = [];
  if (e.hpRegen) out.push(`回血${e.hpRegen}/秒`);
  if (e.thorns) out.push(`反伤${Math.round(e.thorns * 100)}%`);
  if (e.lifestealPct) out.push(`吸血${Math.round(e.lifestealPct * 100)}%`);
  if (e.splash) out.push(`溅射${Math.round(e.splash * 100)}%`);
  if (e.execute) out.push(`残血${Math.round(e.execute * 100)}%斩杀`);
  if (e.markHit) out.push('叠易伤');
  if (e.deathBurst) out.push(`亡爆${e.deathBurst}`);
  if (e.frenzy) out.push('越打越快');
  if (e.anchorHold) out.push('嘲讽');
  if (e.reviveAlly) out.push('拉起同伴');
  if (e.passive === 'revive') out.push('不朽');
  if (e.rageAura && e.rageAura !== 1) out.push(`同房加攻${Math.round((e.rageAura - 1) * 100)}%`);
  if (e.bulwarkAura && e.bulwarkAura !== 1) out.push(`同房减伤${Math.round((1 - e.bulwarkAura) * 100)}%`);
  if (e.skillCdMult && e.skillCdMult !== 1) out.push(`冷却${Math.round((e.skillCdMult - 1) * 100)}%`);
  if (e.onHit === 'sunder') out.push('普攻破防');
  return out.join('・');
}

function drawChampDetail(g               , c       ) {
  panelF(g, uiLayer, 'gold', 166, 58, 310, 176, C.wall);
  const pend = pendingTier(c);
  // 有待选专精时直接把详情切到专精页：这是玩家此刻最该做的决定
  if (pend && heroView === 'stat') heroView = 'talent';
  const vaultDot = S.vault.length > 0;
  for (const [i, v] of ([['stat', '状态'], ['talent', pend ? '专精●' : '专精'], ['gear', vaultDot ? '装备●' : '装备']]         ).entries()) {
    const on = heroView === v[0];
    button(g, uiLayer, hits, 352 + i * 40, 60, 38, 14, v[1], () => { heroView = v[0]; playSfx('tab'); render(); },
      { size: 12, fill: on ? C.wallLit : C.ink, border: on ? C.gold : C.stoneLit, color: on ? C.white : C.stoneLit });
  }
  if (heroView === 'talent') { drawChampTalents(g, c); return; }
  if (heroView === 'gear') { drawChampGear(g, c); return; }

  const chem = chemistry(S.champs, seatedChampUids());
  const st = statOf(c, chem.map);
  const pot = S.champPot[c.uid] ?? 0;
  const ti = titleOf(c);
  label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);
  label(uiLayer, `${monKind(c.race).name}・Lv${c.lv}/${CHAMP_LV_CAP}・资质${POT_NAME[pot]}`, 174, 79, 12, C.bone);
  uiLayer.addChild(sprite(monKind(c.race).tex, 446, 104, 40));
  const ft = fatigueTier(c.fatigue);
  label(uiLayer, `生命 ${st.hp}`, 174, 96, 12, C.bone);
  label(uiLayer, `攻击 ${st.atk}`, 248, 96, 12, C.bone);
  label(uiLayer, `防御 ${st.def}`, 316, 96, 12, C.bone);
  label(uiLayer, `攻速 ${st.spd.toFixed(2)}`, 384, 96, 12, C.bone);
  label(uiLayer, `疲劳 ${c.fatigue} ${ft.text}${ft.mult < 1 ? `×${ft.mult}` : ''}`, 174, 111, 12, ft.bad ? C.red : C.steel);
  const wd = c.wounds || 0;
  label(uiLayer, wd ? `伤 ${wd}道 属性-${wd * 8}%` : '无伤', 296, 111, 12, wd ? C.red : C.green);
  label(uiLayer, cut(auraText(st.auraId, st.auraPow), 22), 174, 126, 12, C.gold);
  const ge = gearEff(c.gear);
  label(uiLayer, `装备 ${ge.names.length}/3`, 392, 126, 12, ge.names.length ? C.purple : C.stoneLit);
  const traitTxt = c.traits.map((t) => `${TRAITS[t].name}（${TRAITS[t].desc}）`).join('；');
  label(uiLayer, cut(`特质 ${traitTxt || '无'}`, 34), 174, 141, 12, C.purple);
  const tags = chemOf(chem.map, c.uid).tags;
  const at = roomOfChamp(c.uid);
  label(uiLayer, at < 0 ? '未上阵（留守，疲劳每战-25）' : cut(`${at + 1}房统领 ${tags.length ? tags.join('・') : '无同僚效应'}`, 20),
    174, 156, 12, at < 0 ? C.stoneLit : C.steel);
  const nt = nextTitle(c);
  label(uiLayer, cut(`${c.battles}战${c.kills}杀${nt ? `→${nt.t.name}` : '・满'}`, 10), 400, 156, 12, C.stoneLit);
  // 机制行独占一行并可点开看全文（专精点满后这串会超过一行能放的字数）
  const mech = effText(st.eff);
  const mechTxt = mech ? `机制 ${mech}` : '机制 无（点专精拿战斗机制）';
  label(uiLayer, cut(mechTxt, 22), 174, 171, 12, mech ? C.green : C.stoneLit);
  if (mechTxt.length > 22) hits.add(174, 171, 292, 15, () => say(cut(mechTxt, 40)));
  if (c.lv < CHAMP_LV_CAP) {
    const need = xpNeed(c.lv);
    label(uiLayer, `经验 ${c.xp}/${need}`, 174, 186, 12, C.bone);
    bar(uiGfx, 262, 190, 88, 5, Math.min(1, c.xp / need), C.green);
    const cost = upCostOf(c);
    button(g, uiLayer, hits, 362, 184, 106, 15, `升级 ${cost}骨`, () => levelChamp(c),
      { size: 12, enabled: canLevel(c) && S.bone >= cost, fill: C.greenDark, border: C.green, color: C.white });
  } else {
    label(uiLayer, '已达顶级 专精已满', 174, 186, 12, C.gold);
  }
  // 底部按钮行：下沿不过 222，给 224 的提示条留位置
  button(g, uiLayer, hits, 174, 206, 78, 15, `休整 ${REST_MANA}魔`, () => restChamp(c),
    { size: 12, enabled: c.fatigue > 0 && S.mana >= REST_MANA, border: C.steel, color: C.white });
  button(g, uiLayer, hits, 258, 206, 80, 15, `疗伤 ${HEAL_MANA}魔`, () => healChamp(c),
    { size: 12, enabled: wd > 0 && S.mana >= HEAL_MANA, border: wd ? C.red : C.stoneLit, color: wd ? C.white : C.stoneLit });
  button(g, uiLayer, hits, 344, 206, 60, 15, '同僚', () => sayChem(chem.lines), { size: 12, border: C.purple, color: C.purple });
  button(g, uiLayer, hits, 410, 206, 58, 15, '遣退', () => dismissChamp(c), { size: 12, border: C.red, color: C.red });
}

const cut = (t        , n        ) => (t.length > n ? `${t.slice(0, n)}…` : t);
function sayChem(lines          ) {
  say(lines.length ? cut(lines.join(' / '), 40) : `同僚效应：${CHEM_INFO[0].desc.split('：')[0]}等，需多名英雄同时上阵`);
}

function drawChampTalents(g               , c       ) {
  const pend = pendingTier(c);
  label(uiLayer, `${c.name} 的专精 ${c.talents.length}/${TALENT_CAP}`, 174, 62, 12, C.gold);
  TALENT_TIERS.forEach((tier, i) => {
    const y = 78 + i * 34;
    const own = c.talents[i];
    const open = c.lv >= TIER_LV[i];
    const isPend = pend === i + 1;
    if (own) {
      label(uiLayer, `Lv${TIER_LV[i]} ${TALENTS[own].name}`, 174, y, 12, C.white);
      label(uiLayer, cut(TALENTS[own].desc, 22), 174, y + 17, 12, C.steel);
    } else if (isPend) {
      label(uiLayer, `Lv${TIER_LV[i]} 三选一`, 174, y, 12, C.purple);
      tier.forEach((id, j) => {
        button(g, uiLayer, hits, 254 + j * 72, y - 2, 70, 15, TALENTS[id].name, () => pickTalent(c, id),
          { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
      });
      label(uiLayer, cut(tier.map((t) => TALENTS[t].name).join('／'), 22), 174, y + 17, 12, C.stoneLit);
    } else {
      label(uiLayer, `Lv${TIER_LV[i]} ${open ? '待上一层选完' : '未开启'}`, 174, y, 12, C.stoneLit);
      label(uiLayer, cut(tier.map((t) => TALENTS[t].name).join('／'), 22), 174, y + 17, 12, C.wallLit);
    }
  });
  const rc = respecCost(c);
  button(g, uiLayer, hits, 174, 218, 116, 15, rc ? `洗点 ${rc}魔` : '无专精可洗', () => respecChamp(c),
    { size: 12, enabled: rc > 0 && S.mana >= rc, border: C.purple, color: C.white });
  label(uiLayer, `洗点单价 ${RESPEC_MANA}魔/个`, 300, 220, 12, C.stoneLit);
}

// ---------- 装备页 ----------
// 左：三个槽（点选后右侧列出仓库里同槽的备选）；右：仓库列表 + 熔/重铸
function drawChampGear(g               , c       ) {
  const eq           = c.gear ?? {};
  const ge = gearEff(c.gear);
  const set = gearSet(c.gear);
  label(uiLayer, cut(`${c.name.split('·')[0]} 的装备`, 9), 174, 64, 12, C.gold);
  // 三个槽：每格 38px，名字与说明分两行（行距 18），说明在左、图标压右不占文字位
  GEAR_SLOTS.forEach((sl, i) => {
    const y = 80 + i * 38;
    const cur = gearById(eq[sl.id] ?? '');
    const on = gearSlotSel === sl.id;
    g.rect(174, y, 150, 34).fill(on ? C.wallLit : C.ink)
      .stroke({ width: 1, color: on ? C.gold : cur ? C.purple : C.stoneLit, alignment: 0 });
    label(uiLayer, sl.name, 178, y + 1, 12, C.stoneLit);
    if (cur) {
      uiLayer.addChild(sprite(cur.tex, 313, y + 17, 18));
      label(uiLayer, cut(cur.name, 5), 196, y + 1, 12, RANK_COL[cur.rank]);
      label(uiLayer, cut(cur.desc, 12), 178, y + 18, 12, C.steel);
    } else {
      label(uiLayer, '空', 196, y + 1, 12, C.wallLit);
      label(uiLayer, '从右侧装上', 178, y + 18, 12, C.wallLit);
    }
    hits.add(174, y, 150, 34, () => { gearSlotSel = sl.id; playSfx('tab'); render(); });
  });
  label(uiLayer, set ? cut(`${set.name}：${set.desc}`, 15) : `仓库 ${S.vault.length}/${GEAR_CAP}・自制 ${S.forged.length}/${FORGED_CAP}`, 174, 196, 12, set ? C.gold : C.stoneLit);
  // 卸下 / 重铸 / 锻造台
  const curSel = gearById(eq[gearSlotSel] ?? '');
  button(g, uiLayer, hits, 174, 214, 46, 15, '卸下', () => unequipGear(c, gearSlotSel),
    { size: 12, enabled: !!curSel, border: C.red, color: curSel ? C.white : C.stoneLit });
  const rf = curSel ? REFORGE_MANA : 0;
  button(g, uiLayer, hits, 224, 214, 46, 15, `重铸${REFORGE_MANA}`, () => reforgeGear(c, gearSlotSel),
    { size: 12, enabled: !!curSel && !curSel.forged && S.mana >= rf, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 274, 214, 50, 15, '锻造台', () => openSmith(),
    { size: 12, fill: C.purpleDark, border: C.gold, color: C.white });
  // 仓库：只列当前槽能穿的
  const slotName = GEAR_SLOTS.find((x) => x.id === gearSlotSel) .name;
  const pool = S.vault.map((id, idx) => ({ id, idx, k: gearById(id)  })).filter((x) => x.k.slot === gearSlotSel);
  const pv = paged(`vault-${gearSlotSel}`, pool, 3);
  label(uiLayer, `${slotName}位 ${pool.length}件`, 334, 80, 12, C.bone);
  let y = 98;
  if (!pool.length) label(uiLayer, '（这一位没有存货）', 334, y, 12, C.wallLit);
  for (const it of pv.view) {
    g.rect(332, y, 140, 32).fill(C.ink).stroke({ width: 1, color: it.k.forged ? C.gold : RANK_COL[it.k.rank], alignment: 0 });
    uiLayer.addChild(sprite(it.k.tex, 342, y + 16, 16));
    label(uiLayer, cut(it.k.name, 4), 352, y + 1, 12, RANK_COL[it.k.rank]);
    if (it.k.forged) {
      button(g, uiLayer, hits, 400, y + 1, 32, 13, '改锻', () => openSmith(it.id), { size: 12, border: C.gold, color: C.gold });
      button(g, uiLayer, hits, 434, y + 1, 34, 13, '熔', () => meltForged(it.id), { size: 12, border: C.red, color: C.red });
    } else {
      button(g, uiLayer, hits, 424, y + 1, 44, 13, `熔${MELT_MANA[it.k.rank]}`, () => meltGear(it.idx),
        { size: 12, border: C.purple, color: C.purple });
    }
    label(uiLayer, cut(it.k.desc, 15), 336, y + 18, 12, C.stoneLit);
    hits.add(332, y, 66, 16, () => equipGear(c, it.idx));
    hits.add(332, y + 17, 140, 15, () => equipGear(c, it.idx));
    y += 34;
  }
  pager(g, `vault-${gearSlotSel}`, pv.pages, 332, 214, 140);
}
const RANK_COL = [C.bone, C.steel, C.gold]         ;

function equipGear(c       , vaultIdx        ) {
  const id = S.vault[vaultIdx];
  const k = gearById(id);
  if (!k) return;
  if (!c.gear) c.gear = {};
  const old = c.gear[k.slot];
  c.gear[k.slot] = id;
  S.vault.splice(vaultIdx, 1);
  if (old) S.vault.push(old);          // 换下来的自动回仓，不会凭空消失
  playSfx('place');
  say(`${cut(c.name.split('·')[0], 4)} 装上${k.name}`);
  persist();
  render();
}
function unequipGear(c       , slot          ) {
  const id = c.gear?.[slot];
  if (!id) return;
  if (S.vault.length >= GEAR_CAP) { say('仓库已满，先熔掉一件'); return; }
  delete c.gear [slot];
  S.vault.push(id);
  playSfx('tab');
  persist();
  render();
}
function meltGear(vaultIdx        ) {
  const k = gearById(S.vault[vaultIdx]);
  if (!k) return;
  S.vault.splice(vaultIdx, 1);
  const got = MELT_MANA[k.rank];
  S.mana += got;
  playSfx('buy');
  say(`熔掉${k.name}，得到 ${got} 魔质`);
  persist();
  render();
}
// 重铸：换成同槽同档的另一件（档内随机，但不会重铸成原来那件）
function reforgeGear(c       , slot          ) {
  const cur = gearById(c.gear?.[slot] ?? '');
  if (!cur) return;
  if (S.mana < REFORGE_MANA) { say('魔质不足'); return; }
  const pool = GEARS.filter((x) => x.slot === slot && x.rank === cur.rank && x.id !== cur.id);
  if (!pool.length) { say('这一档没有别的选择'); return; }
  S.mana -= REFORGE_MANA;
  const nx = pool[Math.floor(Math.random() * pool.length)];
  c.gear [slot] = nx.id;
  playSfx('buy');
  say(`重铸成${nx.name}`);
  persist();
  render();
}

function drawRecruit(g               ) {
  panelF(g, uiLayer, 'stone', 4, 58, 472, 176, C.wall);
  label(uiLayer, `候选每轮刷新  麾下 ${S.champs.length}/${CHAMP_CAP}`, 12, 64, 12, C.stoneLit);
  button(g, uiLayer, hits, 366, 62, 102, 16, `重掷 ${REROLL_MANA}魔质`, () => {
    if (S.mana < REROLL_MANA) { say('魔质不足'); return; }
    S.mana -= REROLL_MANA; refreshCands(true); playSfx('tab'); persist(); render();
  }, { size: 12, enabled: S.mana >= REROLL_MANA, border: C.purple, color: C.white });
  if (!S.cands.length) {
    label(uiLayer, '暂无候选，重掷或等下一轮袭击。', 12, 100, 12, C.stoneLit);
    return;
  }
  const pc = paged('cands', S.cands, 3);
  pc.view.forEach((c, i) => {
    const x = 10 + i * 155;
    const k = monKind(c.race);
    const cost = candCostOf(c);
    const afford = S.bone >= cost && S.champs.length < CHAMP_CAP;
    g.rect(x, 82, 148, 146).fill(C.ink).stroke({ width: 1, color: C.goldDark, alignment: 0 });
    labelC(uiLayer, c.name, x + 74, 86, 12, C.gold);
    labelC(uiLayer, `${k.name}・资质${POT_NAME[c.potential]}`, x + 74, 108, 12, c.potential === 2 ? C.purple : C.bone);
    uiLayer.addChild(sprite(k.tex, x + 74, 150, 34));
    let ty = 152;
    for (const t of c.traits) {
      const d = TRAITS[t].desc.length > 9 ? `${TRAITS[t].desc.slice(0, 9)}…` : TRAITS[t].desc;
      label(uiLayer, `${TRAITS[t].name}：${d}`, x + 6, ty, 12, TRAITS[t].good ? C.steel : C.redDark);
      ty += 22;
    }
    label(uiLayer, AURAS[k.aura ?? 'atk'].short, x + 6, 196, 12, C.gold);
    button(g, uiLayer, hits, x + 6, 210, 136, 15, `征召 ${cost}骨`, () => recruitChamp(c),
      { size: 12, enabled: afford, fill: C.goldDark, border: C.gold, color: C.white });
  });
  pager(g, 'cands', pc.pages, 248, 62, 100, '候选 ');
}

function pageMob(g               ) {
  const kinds = allKinds();
  const PER = 6;
  const pg = paged('mob-kinds', kinds, PER);
  label(uiLayer, '可招募兵种', 10, 40, 12, C.white);
  let y = 56;
  for (const k of pg.view) {
    const selected = sel?.kind === 'monkind' && sel.id === k.id;
    const cst = isCustomKind(k.id);
    const el = isEliteKind(k.id);
    const open = !el || eliteOpen(k);
    g.rect(6, y, 152, 20).fill(selected ? C.wallLit : C.wall)
      .stroke({ width: 1, color: selected ? C.gold : cst ? C.purpleDark : el ? C.goldDark : C.ink, alignment: 0 });
    uiLayer.addChild(sprite(k.tex, 18, y + 19, 18));
    label(uiLayer, cut(k.name, 4), 30, y + 4, 12, cst ? C.purple : el ? C.gold : C.bone);
    label(uiLayer, open ? `${k.cost}骨` : `第${k.eliteMin}轮`, 92, y + 4, 12,
      !open ? C.stoneLit : S.bone >= k.cost ? C.gold : C.redDark);
    label(uiLayer, k.row === 'front' ? '前' : k.row === 'back' ? '后' : '任', 142, y + 4, 12, C.stoneLit);
    hits.add(6, y, 152, 20, () => { sel = { kind: 'monkind', id: k.id }; playSfx('tab'); render(); });
    y += 22;
  }
  pager(g, 'mob-kinds', pg.pages, 6, 190, 152);
  button(g, uiLayer, hits, 6, 208, 152, 16, '✦ 创造怪物', () => openStitch(), {
    size: 12, fill: C.purpleDark, border: C.purple, color: C.white,
  });
  const pm = paged('mob-owned', S.monsters, 7);
  label(uiLayer, `已拥有 ${S.monsters.length}/10`, 172, 40, 12, C.white);
  if (!S.monsters.length) label(uiLayer, '（还没有怪物）', 172, 58, 12, C.stoneLit);
  let y2 = 54;
  for (const inst of pm.view) {
    const k = instKind(inst);
    const selected = sel?.kind === 'inst' && sel.uid === inst.uid;
    const ready = inst.lv < 5 && inst.xp >= XP_PER_LEVEL[inst.lv - 1];
    g.rect(168, y2, 160, 18).fill(selected ? C.wallLit : C.wall).stroke({ width: 1, color: selected ? C.gold : C.ink, alignment: 0 });
    uiLayer.addChild(sprite(k.tex, 178, y2 + 17, 16));
    label(uiLayer, `${cut(k.name, 4)} Lv${inst.lv}`, 190, y2 + 2, 12,
      isCustomKind(inst.kind) ? C.purple : isEliteKind(inst.kind) ? C.gold : C.bone);
    const at = roomOf(inst.uid);
    label(uiLayer, at < 0 ? '空闲' : `${at + 1}房`, 278, y2 + 2, 12, at < 0 ? C.stoneLit : C.gold);
    if (ready) g.circle(324, y2 + 9, 3).fill(C.red);
    hits.add(168, y2, 160, 18, () => { sel = { kind: 'inst', uid: inst.uid }; playSfx('tab'); render(); });
    y2 += 20;
  }
  pager(g, 'mob-owned', pm.pages, 168, 208, 160);
  drawSidePanel(g);
}

;                                                                                                         
function shopItems()             {
  const items             = [];
  for (const id of ['poison', 'bonepit', 'curse', 'forge', 'mirror', 'mire']             ) {
    const t = THEMES[id];
    items.push({
      id: `theme-${id}`, name: `主题·${t.name}`, desc: `${t.desc}。解锁后可在地牢页为任意房间（同主题最多两间）设置。`,
      cost: t.cost, owned: S.themes.includes(id), buy: () => S.themes.push(id),
    });
  }
  for (const id of ['spike', 'slime', 'rune', 'blade', 'net', 'mirror']            ) {
    const t = TRAPS[id];
    items.push({
      id: `trap-${id}`, name: `陷阱·${t.name}`, desc: `${t.desc}。每房每场触发一次，可被盗贼拆除。`,
      cost: t.cost, owned: S.traps.includes(id), buy: () => S.traps.push(id),
    });
  }
  for (let i = 0; i < 3; i++) {
    items.push({
      id: `seal-${i}`, name: `封印强化 ${i + 1}`, desc: `王座封印上限 +25（当前 ${sealMax()}）。勇者每次冲击固定造成25点。`,
      cost: 30 + i * 20, owned: S.sealLv > i, buy: () => { S.sealLv = i + 1; },
    });
  }
  for (let i = 0; i < 3; i++) {
    items.push({
      id: `trapup-${i}`, name: `陷阱强化 ${i + 1}`, desc: `所有陷阱效果 +25%（当前 ${Math.round(trapPower() * 100)}%）。`,
      cost: 35 + i * 25, owned: S.trapLv > i, buy: () => { S.trapLv = i + 1; },
    });
  }
  return items;
}

function pageShop(g               ) {
  label(uiLayer, '工坊：解锁与强化（消耗魔质）', 10, 40, 12, C.white);
  // 叙事者（LLM）接入：三档模式 + 造件入口
  const mode = loadMode();
  const MODES                                  = [
    { id: 'gp', name: '内置' }, { id: 'echo', name: '回声' }, { id: 'http', name: '外部' }, { id: 'off', name: '关' },
  ];
  panelF(g, uiLayer, 'inset', 6, 188, 322, 46, C.ink);
  label(uiLayer, '外部叙事者', 12, 192, 12, C.purple);
  MODES.forEach((m, i) => {
    const on = mode === m.id;
    const x = 78 + i * 34;
    g.rect(x, 191, 32, 15).fill(on ? C.purpleDark : C.wall).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(uiLayer, m.name, x + 16, 192, 12, on ? C.white : C.bone);
    hits.add(x, 191, 32, 15, () => setLlmMode(m.id));
  });
  const st = llmStatus();
  const line = st.state === 'error' ? st.note
    : hasBackend() ? `${getBackend() .name}・造件 ${S.diy.length}/${DIY_CAP}・词缀 ${S.diyAf.length}/${DIY_AFFIX_CAP}`
    : '未接入：自定义部件与词缀不可用';
  label(uiLayer, cut(line, 25), 12, 210, 12, st.state === 'error' ? C.red : hasBackend() ? C.green : C.stoneLit);
  button(g, uiLayer, hits, 216, 189, 36, 19, '造部件', () => openForge('part'),
    { size: 12, enabled: hasBackend(), fill: C.purpleDark, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 254, 189, 36, 19, '造词缀', () => openForge('affix'),
    { size: 12, enabled: hasBackend(), fill: C.purpleDark, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 292, 189, 34, 19, '图鉴', () => openForge('book'),
    { size: 12, fill: C.wall, border: C.gold, color: C.gold });
  label(uiLayer, '一句话口述，叙事者翻成部件或词缀；图鉴查已入册的', 12, 224, 12, C.wall);
  const items = shopItems();
  const ps = paged('shop', items, 8);
  ps.view.forEach((it, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const x = 6 + col * 164;
    const y = 54 + row * 22;
    const selected = sel?.kind === 'shop' && sel.id === it.id;
    const canBuy = !it.owned && S.mana >= it.cost;
    g.rect(x, y, 158, 20).fill(selected ? C.wallLit : C.wall).stroke({ width: 1, color: selected ? C.gold : C.ink, alignment: 0 });
    label(uiLayer, it.name, x + 4, y + 4, 12, it.owned ? C.green : C.bone);
    label(uiLayer, it.owned ? '已拥有' : `${it.cost}魔`, x + 116, y + 4, 12, it.owned ? C.stoneLit : canBuy ? C.purple : C.redDark);
    hits.add(x, y, 158, 20, () => { sel = { kind: 'shop', id: it.id }; playSfx('tab'); render(); });
  });
  pager(g, 'shop', ps.pages, 6, 146, 158, '解锁 ');
  drawSidePanel(g);
}

function pageReport(g               ) {
  if (!S.reports.length) {
    label(uiLayer, '还没有战报，先打一场袭击', 10, 44, 12, C.stoneLit);
    return;
  }
  reportIdx = Math.min(reportIdx, S.reports.length - 1);
  const r = S.reports[reportIdx];
  const lkey0 = `rep-logs-${reportIdx}`;
  if (pageState[lkey0] === undefined) pageState[lkey0] = Math.max(0, Math.ceil(r.logs.length / 10) - 1);
  S.reports.forEach((rp, i) => {
    const x = 8 + i * 44;
    button(g, uiLayer, hits, x, 40, 40, 18, `#${rp.raidNo}`, () => { reportIdx = i; playSfx('tab'); render(); },
      { size: 12, fill: i === reportIdx ? C.wallLit : C.wall, border: rp.win ? C.green : C.red, color: rp.win ? C.green : C.red });
  });
  label(uiLayer, `${r.title}：${r.win ? '守住' : '失守'}  封印${r.seal}  ${r.time.toFixed(1)}s`, 8, 64, 12, r.win ? C.green : C.red);
  skullRow(g, 250, 62, r.skulls);
  let y = 82;
  for (const rr of r.rooms) {
    g.rect(8, y, 200, 16).fill(C.wall);
    label(uiLayer, `${rr.i + 1}房 ${rr.broken ? `失守 ${rr.t.toFixed(1)}s` : '守住'}`, 12, y + 2, 12, rr.broken ? C.red : C.green);
    label(uiLayer, rr.broken ? rr.reason : '—', 96, y + 2, 12, C.stoneLit);
    y += 18;
  }
  label(uiLayer, '关键败因/结论：', 8, y + 4, 12, C.gold);
  wrapText(uiLayer, r.firstCause, 8, y + 18, 200, 12, C.bone);
  const pu = paged(`rep-units-${reportIdx}`, r.units, 5);
  label(uiLayer, `单位战绩 ${r.units.length}`, 216, 82, 12, C.white);
  let y2 = 98;
  for (const u of pu.view) {
    label(uiLayer, cut(u.name.split('·')[0], 5), 216, y2, 12, u.side === 'mon' ? C.green : C.red);
    label(uiLayer, `伤${u.dmg}`, 288, y2, 12, C.bone);
    y2 += 22;
  }
  pager(g, `rep-units-${reportIdx}`, pu.pages, 216, 212, 106);
  panelF(g, uiLayer, 'stone', 334, 40, 142, 194, C.wall);
  // 日志分页：一页 10 条，最新一页在最后 —— 想看开局就往前翻
  const lkey = `rep-logs-${reportIdx}`;
  const pl = paged(lkey, r.logs, 10);
  labelC(uiLayer, '战斗日志', 392, 46, 12, C.white);
  // 日志行会折行（统领溃散等长句），按固定行距步进必压字 → 用实测 Text.height 累加，填满即停
  let y3 = 62;
  const LOG_BOTTOM = 210;
  for (const l of pl.view) {
    if (y3 >= LOG_BOTTOM) break;
    const t = wrapText(uiLayer, l.text, 340, y3, 130, 12, l.tone === 'good' ? C.green : l.tone === 'bad' ? C.red : C.stoneLit);
    const h = Math.max(15, Math.round(t.height));
    if (y3 + h > LOG_BOTTOM) { t.destroy(); break; }
    y3 += h;
  }
  pager(g, lkey, pl.pages, 340, 214, 130);
}

// ---------- 战斗 ----------
const FLOOR_Y = 196;
let camX = 0, camTargetX = 0;
let shakeT = 0, shakeAmt = 0, flashT = 0, flashCol = C.red;
const battleWorld = new PIXI.Container();
const bgLayer = new PIXI.Container();
const unitLayer = new PIXI.Container();
const fxLayer = new PIXI.Container();
const battleGfx = new PIXI.Graphics();
const hudLayer = new PIXI.Container();
const hudGfx = new PIXI.Graphics();
const unitSprites = new Map                   ();
                                                                                  
let roomVis            = [];
let sealQuarters                       = null;

                                                                                                    
const parts             = [];
                                                            
const floats              = [];

function initBattleLayers() {
  if (battleLayer.children.length) return;
  battleWorld.addChild(bgLayer, unitLayer, battleGfx, fxLayer);
  hudLayer.addChild(hudGfx);
  battleLayer.addChild(battleWorld, hudLayer);
}

function startBattle() {
  if (screen !== 'manage') return;
  if (stitch) closeStitch();
  const raid = currentRaid();
  battle = createBattle(raid, S.rooms, S.monsters,
    { sealMax: sealMax(), trapPower: trapPower(), mods: battleMods(), champs: champStatMap() });
  pendingResultRaid = raid.no;
  screen = 'battle';
  speed = 1;
  paused = false;
  camX = camTargetX = -40;
  buildBattleScene();
  render();
  playMusic('bgm-battle');
  say('');
}

function buildBattleScene() {
  initBattleLayers();
  for (const c of bgLayer.removeChildren()) c.destroy({ children: true });
  for (const c of unitLayer.removeChildren()) c.destroy({ children: true });
  unitSprites.clear();
  roomVis = [];
  battleLayer.visible = true;
  const b = battle ;

  for (let i = 0; i < b.rooms.length; i++) {
    const rx = i * ROOM_W;
    if (TEX['tile-wall']) {
      const wall = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: ROOM_W - 6, height: 150 });
      wall.tileScale.set(0.75);
      wall.x = rx + 3; wall.y = 40;
      wall.tint = i % 2 ? 0x413a58 : 0x4a4360;
      bgLayer.addChild(wall);
    }
    if (TEX['tile-floor']) {
      const fl = new PIXI.TilingSprite({ texture: TEX['tile-floor'], width: ROOM_W - 6, height: 74 });
      fl.tileScale.set(0.75);
      fl.x = rx + 3; fl.y = FLOOR_Y;
      fl.tint = 0xa49cba;
      bgLayer.addChild(fl);
    }
    const themeProp = THEMES[b.rooms[i].theme].prop;
    if (themeProp) {
      const p = sprite(themeProp, rx + 40, FLOOR_Y, 26);
      bgLayer.addChild(p);
      const p2 = sprite(themeProp, rx + 70, FLOOR_Y - 2, 18);
      p2.alpha = 0.8;
      bgLayer.addChild(p2);
    }
    const g = new PIXI.Graphics();
    bgLayer.addChild(g);
    g.rect(rx + ROOM_W - 8, FLOOR_Y - 66, 8, 66).fill(C.leather).stroke({ width: 1, color: C.ink, alignment: 0 });
    g.rect(rx + ROOM_W - 6, FLOOR_Y - 44, 4, 4).fill(C.gold);
    const roomLabel = txt(`${i + 1}房 ${THEMES[b.rooms[i].theme].name}`, 12, C.stoneLit);
    roomLabel.x = rx + 12; roomLabel.y = 46;
    bgLayer.addChild(roomLabel);
    let trapSp                     = null;
    const trapId = b.rooms[i].trap;
    if (trapId !== 'none' && TRAPS[trapId].tex) {
      trapSp = sprite(TRAPS[trapId].tex , rx + 250, FLOOR_Y + 2, 22);
      bgLayer.addChild(trapSp);
    }
    roomVis.push({ door: g, trap: trapSp, broken: false });
  }
  // 王座
  const tx = b.rooms.length * ROOM_W;
  if (TEX['tile-wall']) {
    const wall = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: 240, height: 150 });
    wall.tileScale.set(0.75);
    wall.x = tx; wall.y = 40; wall.tint = 0x554472;
    bgLayer.addChild(wall);
  }
  if (TEX['tile-floor']) {
    const fl = new PIXI.TilingSprite({ texture: TEX['tile-floor'], width: 240, height: 74 });
    fl.tileScale.set(0.75);
    fl.x = tx; fl.y = FLOOR_Y;
    fl.tint = 0xa49cba;
    bgLayer.addChild(fl);
  }
  const throne = sprite('icon-throne', tx + 110, FLOOR_Y, 64);
  bgLayer.addChild(throne);
  sealQuarters = new PIXI.Graphics();
  bgLayer.addChild(sealQuarters);
  const tl = txt('王座', 12, C.purple);
  tl.x = tx + 96; tl.y = 50;
  bgLayer.addChild(tl);

  for (const h of b.heroes) ensureSprite(h);
  for (const r of b.rooms) for (const m of r.mons) ensureSprite(m);
}

function ensureSprite(u      ) {
  if (unitSprites.has(u)) return;
  // 素材本身已统一朝向：怪物朝左（面向入口）、勇者朝右（面向王座），画的时候不翻转
  const s = sprite(u.tex, 0, 0, u.legend ? 40 : 30);
  unitLayer.addChild(s);
  unitSprites.set(u, s);
}

function spawnParticles(x        , y        , n        , color        , spread = 40, layer = fxLayer) {
  for (let i = 0; i < n && parts.length < 60; i++) {
    const s = new PIXI.Sprite(PIXI.Texture.WHITE);
    s.tint = color;
    s.width = 2; s.height = 2;
    s.x = x; s.y = y;
    layer.addChild(s);
    parts.push({ s, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * spread * 0.8 - 10, life: 0.5, max: 0.5, grav: 120 });
  }
}
function spawnDust(x        , y        ) {
  for (let i = 0; i < 3 && parts.length < 60; i++) {
    const s = new PIXI.Sprite(PIXI.Texture.WHITE);
    s.tint = C.stoneLit;
    s.width = 2; s.height = 2;
    s.x = x + (i - 1) * 4; s.y = y;
    overlay.addChild(s);
    parts.push({ s, vx: (i - 1) * 8, vy: -14, life: 0.4, max: 0.4, grav: 60 });
  }
}
function spawnFloat(x        , y        , text        , color        , layer = fxLayer) {
  if (floats.length > 14) return;
  const t = txt(text, 12, color);
  t.x = Math.round(x - t.width / 2); t.y = Math.round(y);
  layer.addChild(t);
  floats.push({ t, vy: -26, life: 0.75 });
}

function consumeEvents() {
  const b = battle ;
  for (const e of b.events) {
    if (e.k === 'hit') {
      const wx = e.room * ROOM_W + e.x, wy = FLOOR_Y + e.y;
      if (e.dmg <= 0) { spawnFloat(wx, wy - 34, '闪避', C.stoneLit); continue; }
      spawnFloat(wx, wy - 34, `${e.dmg}`, e.heavy ? C.gold : C.white);
      spawnParticles(wx, wy - 14, e.heavy ? 6 : 3, e.heavy ? C.gold : C.bone);
      playHit(e.heavy);
      if (e.heavy) { shakeT = 0.1; shakeAmt = 2; }
    } else if (e.k === 'heal') {
      const wx = e.room * ROOM_W + e.x, wy = FLOOR_Y + e.y;
      spawnFloat(wx, wy - 34, `+${e.amt}`, C.green);
      spawnParticles(wx, wy - 10, 4, C.green, 18);
      playSfx('heal');
    } else if (e.k === 'poison') {
      for (let i = 0; i < 5; i++) spawnParticles(e.room * ROOM_W + 120 + i * 30, FLOOR_Y - 12, 2, C.greenDark, 16);
      playSfx('heal', 0.7);
    } else if (e.k === 'cast') {
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y + e.y - 40, 5, e.color, 14);
    } else if (e.k === 'shieldbreak') {
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y + e.y - 18, 8, C.steel, 50);
      playSfx('break', 1.3);
    } else if (e.k === 'trap') {
      const wx = e.room * ROOM_W + e.x;
      spawnParticles(wx, FLOOR_Y - 6, 8, e.kind === 'rune' ? C.purple : e.kind === 'slime' ? C.green : C.white, 50);
      spawnFloat(wx, FLOOR_Y - 46, TRAPS[e.kind].name, C.gold);
      playSfx('trap');
      flashT = 0.08; flashCol = C.white;
    } else if (e.k === 'disarm') {
      const rv = roomVis[e.room];
      if (rv?.trap) { rv.trap.tint = 0x555064; rv.trap.alpha = 0.6; }
      spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 46, '陷阱被拆除', C.red);
      playSfx('break', 0.8);
    } else if (e.k === 'die') {
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y + e.y - 12, 8, e.side === 'hero' ? C.red : C.green, 60);
      playSfx('heavy', 0.8);
      if (e.side === 'hero') {
        spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y + e.y - 12, 3, C.gold, 40);
        playSfx('coin', 1.1);
      }
    } else if (e.k === 'break') {
      const rv = roomVis[e.room];
      if (rv) {
        rv.broken = true;
        rv.door.clear();
        for (let i = 0; i < 8; i++) spawnParticles(e.room * ROOM_W + ROOM_W - 6, FLOOR_Y - 20 - i * 5, 1, C.leather, 90);
      }
      spawnFloat(e.room * ROOM_W + ROOM_W - 60, FLOOR_Y - 70, '失守', C.red);
      playSfx('break');
      flashT = 0.1; flashCol = C.redDark;
    } else if (e.k === 'throne') {
      playSfx('throne');
      flashT = 0.14; flashCol = C.redDark;
      spawnParticles(b.rooms.length * ROOM_W + 110, FLOOR_Y - 30, 8, C.purple, 60);
    } else if (e.k === 'shake') {
      shakeT = Math.max(shakeT, 0.12);
      shakeAmt = Math.max(shakeAmt, e.amount);
    }
  }
  b.events.length = 0;
}

function updateBattleVisuals(dt        ) {
  const b = battle ;
  camTargetX = b.roomIndex * ROOM_W - 40;
  if (b.phase === 'throne') camTargetX = b.rooms.length * ROOM_W - 120;
  camX += (camTargetX - camX) * Math.min(1, dt * 7);
  let ox = -Math.round(camX), oy = 0;
  if (shakeT > 0) {
    shakeT -= dt;
    ox += Math.round((Math.random() - 0.5) * shakeAmt * 2);
    oy += Math.round((Math.random() - 0.5) * shakeAmt * 2);
  }
  battleWorld.x = ox;
  battleWorld.y = oy;

  battleGfx.clear();
  const drawUnit = (u      ) => {
    const s = unitSprites.get(u);
    if (!s) return;
    const wx = u.room * ROOM_W + u.x;
    const lunge = u.lungeT > 0 ? Math.round(Math.sin((1 - u.lungeT / 0.22) * Math.PI) * 4) : 0;
    const dir = u.side === 'hero' ? 1 : -1;
    const bobY = u.alive ? Math.round(Math.sin(b.time * 6 + u.homeX) * 1) : 0;
    s.x = Math.round(wx + lunge * dir);
    s.y = Math.round(FLOOR_Y + u.y + bobY);
    s.visible = u.alive || u.deadT < 1.2;
    if (!u.alive) {
      s.alpha = Math.max(0, 1 - u.deadT / 1.2);
      s.rotation = Math.min(1.4, u.deadT * 2.5) * dir;
      s.y = Math.round(FLOOR_Y + u.y + Math.min(8, u.deadT * 20));
    } else {
      s.alpha = 1;
      s.rotation = 0;
      s.tint = u.flashT > 0 ? 0xffffff : 0xffffff;
      if (u.flashT > 0) s.tint = C.white;
      if (u.poisonT > 0) s.tint = 0xbfe08a;
      else if (u.slowT > 0) s.tint = 0xa8d0ff;
      else s.tint = 0xffffff;
    }
    if (!u.alive) return;
    // 统领脚下的光环圈：兵种"在谁的加持下"必须一眼可见
    if (u.legend) {
      const pulse = 0.5 + 0.5 * Math.sin(b.time * 3);
      battleGfx.ellipse(Math.round(wx), Math.round(FLOOR_Y + u.y + 1), 22, 6)
        .stroke({ width: 1, color: C.gold, alpha: 0.35 + pulse * 0.4 });
    }
    // 血条
    const bw = u.legend ? 34 : 26;
    bar(battleGfx, Math.round(wx - bw / 2), Math.round(FLOOR_Y + u.y - 34), bw, 3, u.hp / u.maxHp, u.side === 'hero' ? C.red : C.green);
    if (u.shield > 0) bar(battleGfx, Math.round(wx - bw / 2), Math.round(FLOOR_Y + u.y - 38), bw, 2, u.shield / (u.maxHp * 0.25), C.steel);
    if (u.disarmT > 0) {
      const p = 1 - u.disarmT / 2;
      bar(battleGfx, Math.round(wx - 10), Math.round(FLOOR_Y + u.y - 44), 20, 3, p, C.gold);
    }
  };
  b.heroes.forEach(drawUnit);
  b.rooms[b.roomIndex].mons.forEach(drawUnit);
  for (let i = 0; i < b.rooms.length; i++) {
    if (i === b.roomIndex) continue;
    b.rooms[i].mons.forEach((m) => {
      const s = unitSprites.get(m);
      if (s) s.visible = m.alive && i > b.roomIndex;
      if (s && s.visible) {
        s.x = Math.round(i * ROOM_W + m.x);
        s.y = Math.round(FLOOR_Y + m.y);
        s.alpha = 0.85;
      }
    });
  }
  // 门抖动
  b.rooms.forEach((r, i) => {
    const rv = roomVis[i];
    if (!rv || rv.broken) return;
    rv.door.x = r.doorShake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
  });
  // 封印四分格
  if (sealQuarters) {
    sealQuarters.clear();
    const tx = b.rooms.length * ROOM_W + 110;
    const frac = b.seal / b.sealMax;
    for (let i = 0; i < 4; i++) {
      const on = frac > i / 4;
      const ang = -Math.PI / 2 + (i * Math.PI) / 2;
      const px = tx + Math.cos(ang) * 30;
      const py = FLOOR_Y - 34 + Math.sin(ang) * 30;
      sealQuarters.rect(Math.round(px - 3), Math.round(py - 3), 6, 6).fill(on ? C.purple : C.ink);
    }
  }

  // 粒子/跳字
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    p.vy += p.grav * dt;
    p.s.x += p.vx * dt;
    p.s.y += p.vy * dt;
    p.s.alpha = Math.max(0, p.life / p.max);
    if (p.life <= 0) { p.s.destroy(); parts.splice(i, 1); }
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    f.t.y += f.vy * dt;
    f.t.alpha = Math.max(0, f.life / 0.75);
    if (f.life <= 0) { f.t.destroy(); floats.splice(i, 1); }
  }

  drawBattleHud();
}

function drawBattleHud() {
  const b = battle ;
  const interactive = screen === 'battle';
  for (const c of hudLayer.removeChildren()) if (c !== hudGfx) c.destroy({ children: true });
  hudLayer.addChild(hudGfx);
  hudGfx.clear();
  // 结算屏时不能清热区：结算按钮已注册在同一张 hits 表上
  if (interactive) hits.clear();
  hudGfx.rect(0, 0, VIEW_W, 22).fill(C.ink);
  label(hudLayer, '封印', 6, 5, 12, C.purple);
  bar(hudGfx, 38, 8, 90, 8, b.seal / b.sealMax, C.purple);
  label(hudLayer, `${b.seal}/${b.sealMax}`, 132, 5, 12, C.bone);
  label(hudLayer, b.phase === 'throne' ? '勇者已抵达王座' : `第${b.roomIndex + 1}房`, 186, 5, 12, C.white);
  if (b.phase === 'fight') label(hudLayer, `剩余 ${Math.max(0, b.roomTimer).toFixed(1)}s`, 240, 5, 12, b.roomTimer < 5 ? C.red : C.bone);
  const alive = b.heroes.filter((h) => h.alive).length;
  label(hudLayer, `勇者 ${alive}/${b.heroes.length}`, 316, 5, 12, C.red);
  const ld = b.rooms[b.roomIndex]?.leader;
  if (ld && ld.aura) {
    // 统领读数单独占顶栏下的一条窄带：和"第N房"同行会压字
    const on = ld.alive;
    const t = on ? `${ld.name} ${AURAS[ld.aura].short}` : `${ld.name} 已倒 · 光环已散`;
    const tw = t.length * 12 + 8;
    hudGfx.rect(4, 23, tw, 17).fill({ color: C.ink, alpha: 0.85 }).stroke({ width: 1, color: on ? C.goldDark : C.redDark, alignment: 0 });
    label(hudLayer, t, 8, 25, 12, on ? C.gold : C.redDark);
  }
  if (interactive) {
    button(hudGfx, hudLayer, hits, 384, 2, 42, 18, paused ? '继续' : '暂停', () => { paused = !paused; }, { size: 12 });
    button(hudGfx, hudLayer, hits, 430, 2, 42, 18, `${speed}×`, () => { speed = speed === 1 ? 2 : 1; }, { size: 12 });
  }
  // 最近日志两行（底部压暗条保证可读）
  const logs = b.log.slice(-2);
  if (logs.length) hudGfx.rect(0, 230, VIEW_W, 40).fill({ color: C.ink, alpha: 0.85 });
  logs.forEach((l, i) => {
    const t = txt(l.text, 12, l.tone === 'good' ? C.green : l.tone === 'bad' ? C.red : C.stoneLit);
    t.x = 6; t.y = 232 + i * 15;
    hudLayer.addChild(t);
  });
  if (flashT > 0) hudGfx.rect(0, 0, VIEW_W, VIEW_H).fill({ color: flashCol, alpha: Math.min(0.5, flashT * 4) });
  if (paused) {
    hudGfx.rect(0, 0, VIEW_W, VIEW_H).fill({ color: C.bg, alpha: 0.5 });
    labelC(hudLayer, '已暂停（空格继续）', VIEW_W / 2, 120, 12, C.white);
  }
}

// ---------- 结算 ----------
let resultLayerBuilt = false;
function finishBattle() {
  const b = battle ;
  const r = b.result ;
  screen = 'result';
  resultLayerBuilt = false;
  S.bone += r.bone;
  S.mana += r.mana;
  for (const x of r.xp) {
    const inst = instById(x.uid);
    if (inst && inst.lv < 5) inst.xp += x.xp;
  }
  // 英雄结算：经验/战功归到具体个体，疲劳按"上没上场"分别涨落
  const chemBefore = chemistry(S.champs, seatedChampUids()).map;
  for (const x of r.champXp ?? []) {
    const c = champById(x.uid);
    if (!c) continue;
    if (c.lv < CHAMP_LV_CAP) c.xp += Math.round(x.xp * chemOf(chemBefore, c.uid).xp);
    c.kills += x.kills;
    // 被打倒不会永久死亡，但会留一道伤：压属性、更容易累，得花魔质疗
    // 圣职长袍（woundGuard）能免掉这道伤 —— 这是金装身位最实在的价值
    if (x.fell && !gearEff(c.gear).woundGuard) c.wounds = Math.min(WOUND_CAP, (c.wounds || 0) + 1);
  }
  // 战利品入库；满了先顶掉档次最低的一件（提示玩家去熔）
  for (const id of r.loot ?? []) {
    if (S.vault.length >= GEAR_CAP) {
      let worst = 0;
      for (let i = 1; i < S.vault.length; i++) {
        if ((gearById(S.vault[i])?.rank ?? 0) < (gearById(S.vault[worst])?.rank ?? 0)) worst = i;
      }
      S.vault.splice(worst, 1);
    }
    S.vault.push(id);
  }
  tickFatigue(S.champs, seatedChampUids());
  const units = [...b.heroes.map((h) => ({ name: h.name, dmg: Math.round(h.dmgDealt), heal: Math.round(h.healed), side: 'hero' })),
    ...b.rooms.flatMap((rm) => rm.mons.map((m) => ({ name: m.name, dmg: Math.round(m.dmgDealt), heal: Math.round(m.healed), side: 'mon' })))]
    .sort((a, z) => z.dmg - a.dmg);
  const report         = {
    raidNo: b.raid.no, title: b.raid.title, win: r.win, skulls: r.skulls, seal: r.seal, time: b.time,
    rooms: b.rooms.map((rm) => ({ i: rm.index, broken: rm.broken, t: rm.breachTime, reason: rm.breachReason })),
    units, firstCause: r.firstCause,
    logs: b.log.map((l) => ({ text: l.text, tone: l.tone })),
  };
  S.reports.unshift(report);
  if (S.reports.length > 5) S.reports.length = 5;
  reportIdx = 0;
  if (r.win) {
    const prev = S.best[b.raid.no] || 0;
    if (r.skulls > prev) {
      S.best[b.raid.no] = r.skulls;
      if (prev === 0) S.mana += 5;
    }
  }
  // 每场结束发一次「秘闻」听取次数（胜局多一次），并让剧情修正走一轮倒计时
  tickStoryMods();
  S.story.credits = Math.min(5, S.story.credits + (r.win ? 2 : 1));
  playSfx(r.win ? 'win' : 'lose');
  persist();
  playMusic('bgm-manage');
}

function buildResultOverlay() {
  resultLayerBuilt = true;
  const b = battle ;
  const r = b.result ;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  const g = new PIXI.Graphics();
  overlay.addChild(g);
  g.rect(0, 0, VIEW_W, VIEW_H).fill({ color: C.bg, alpha: 0.86 });
  panelF(g, overlay, r.win ? 'gold' : 'stone', 70, 30, 340, 210, C.wall);
  labelC(overlay, r.win ? '地牢守住了！' : '封印被击破…', 240, 40, 12, r.win ? C.green : C.red);
  labelC(overlay, `${b.raid.title}  击倒 ${r.kills}/${r.total}  封印剩余 ${r.seal}`, 240, 58, 12, C.bone);
  if (r.win) {
    for (let i = 0; i < 3; i++) {
      const s = sprite('icon-skull', 210 + i * 22, 96, 18);
      s.alpha = i < r.skulls ? 1 : 0.2;
      overlay.addChild(s);
    }
  }
  labelC(overlay, `骨币 +${r.bone}   魔质 +${r.mana}`, 240, 104, 12, C.gold);
  let y = 122;
  labelC(overlay, r.firstCause, 240, y, 12, r.win ? C.stoneLit : C.gold);
  y += 20;
  const xpLines = r.xp.map((x) => {
    const inst = instById(x.uid);
    return inst ? `${instKind(inst).name} +${x.xp}xp` : '';
  }).filter(Boolean).slice(0, 4);
  labelC(overlay, xpLines.length ? xpLines.join('  ') : '本场无怪物参战', 240, y, 12, C.green);
  y += 19;
  // 英雄的成长单独一行：这是玩家最在意的长期读数
  const champLines = (r.champXp ?? []).map((x) => {
    const c = champById(x.uid);
    return c ? `${c.name} +${x.xp}xp${x.kills ? `/${x.kills}杀` : ''}${x.fell ? '（受伤）' : ''}` : '';
  }).filter(Boolean).slice(0, 2);
  if (champLines.length) labelC(overlay, champLines.join('  '), 240, y, 12, C.gold);
  y += 19;
  const loot = (r.loot ?? []).map((id) => gearById(id)?.name ?? '').filter(Boolean);
  labelC(overlay, loot.length ? `缴获：${cut(loot.join('、'), 20)}` : '无缴获（需击倒勇者）', 240, y, 12, loot.length ? C.purple : C.stoneLit);
  const isFinal = r.win && !S.overtime && b.raid.no === 12;
  button(g, overlay, hits, 100, 196, 130, 28, r.win ? (isFinal ? '观看结局' : '继续') : '重试本轮', () => afterResult(), { fill: C.greenDark, border: C.green, color: C.white });
  button(g, overlay, hits, 250, 196, 130, 28, '返回经营', () => { backToManage(); }, { fill: C.wallLit, border: C.bone });
  labelC(overlay, 'Enter 继续', 240, 228, 12, C.stoneLit);
}

function afterResult() {
  const b = battle ;
  const r = b.result ;
  if (r.win) {
    if (!S.overtime && b.raid.no === 12) {
      screen = 'ending';
      endingT = 0;
      for (const c of overlay.removeChildren()) c.destroy({ children: true });
      hits.clear();
      playSfx('win');
      persist();
      return;
    }
    if (S.overtime) S.otRaid++;
    else S.raidNo++;
    persist();
  }
  backToManage();
}

function backToManage() {
  screen = 'manage';
  battle = null;
  battleLayer.visible = false;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  for (const p of parts) p.s.destroy();
  parts.length = 0;
  for (const f of floats) f.t.destroy();
  floats.length = 0;
  tab = pendingResultRaid && S.reports.length ? 'throne' : tab;
  sel = null;
  playMusic('bgm-manage');
  render();
}

function buildEnding() {
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  const g = new PIXI.Graphics();
  overlay.addChild(g);
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  if (TEX['tile-wall']) {
    const wall = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: VIEW_W, height: 190 });
    wall.tileScale.set(0.75);
    wall.y = 30;
    wall.tint = 0x3b2f4d;
    overlay.addChild(wall);
  }
  const th = sprite('icon-throne', 240, 210, 70);
  overlay.addChild(th);
  // 缴获旗帜
  const flags = new PIXI.Graphics();
  overlay.addChild(flags);
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 62;
    flags.rect(x, 120, 2, 90).fill(C.leather);
    flags.rect(x + 2, 122, 20, 14).fill(i % 2 ? C.blue : C.gold);
  }
  const crew = ['mon-slime', 'mon-goblin', 'mon-archer', 'mon-bat', 'mon-shaman', 'mon-ogre'];
  crew.forEach((c2, i) => {
    const s = sprite(c2, 70 + i * 62, 212, 30);
    overlay.addChild(s);
  });
  labelC(overlay, '勇者队长退场了。地牢开庆功宴。', 240, 40, 12, C.gold);
  labelC(overlay, '解锁：加班勇者（循环词缀 · 等级持续增长）', 240, 60, 12, C.purple);
  const g2 = new PIXI.Graphics();
  overlay.addChild(g2);
  labelC(overlay, 'Enter 进入', 240, 262, 12, C.stoneLit);
  button(g2, overlay, hits, 165, 232, 150, 26, '进入加班勇者', () => enterOvertime(), { fill: C.purpleDark, border: C.purple, color: C.white });
}

function enterOvertime() {
  S.overtime = true;
  S.otRaid = Math.max(13, S.otRaid);
  persist();
  screen = 'manage';
  battle = null;
  battleLayer.visible = false;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  endingBuilt = false;
  tab = 'throne';
  playMusic('bgm-manage');
  render();
}

// ---------- 主循环 ----------
let endingBuilt = false;
function tick(dt        ) {
  tickAudio();
  if (saveFlash > 0) {
    saveFlash -= dt;
    if (saveFlash <= 0 && screen === 'manage') render();
  }
  if (slotFlash.t > 0) {
    slotFlash.t -= dt;
    if (screen === 'manage' && tab === 'dungeon') render();
  }
  if (toast.t > 0) {
    toast.t -= dt;
    drawToast();
  }
  if (flashT > 0) flashT -= dt;

  // 屏幕外粒子（经营页灰尘）
  if (screen === 'manage' && parts.length) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      p.vy += p.grav * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.alpha = Math.max(0, p.life / p.max);
      if (p.life <= 0) { p.s.destroy(); parts.splice(i, 1); }
    }
  }

  if (screen === 'battle' && battle) {
    if (!paused) {
      const steps = speed === 2 ? 2 : 1;
      for (let i = 0; i < steps; i++) stepBattle(battle, dt);
      consumeEvents();
    }
    updateBattleVisuals(dt);
    if (battle.phase === 'done' && battle.result) finishBattle();
    return;
  }
  if (screen === 'result') {
    if (!resultLayerBuilt) buildResultOverlay();
    updateBattleVisuals(dt);
    return;
  }
  if (screen === 'ending') {
    endingT += dt;
    if (!endingBuilt) { buildEnding(); endingBuilt = true; }
    return;
  }
  endingBuilt = false;
  if (portrait) drawRotateHint();
}

let toastNode                   = null;
let toastPlate                       = null;
function drawToast() {
  if (!toast.text) { if (toastNode) { toastNode.visible = false; } if (toastPlate) toastPlate.visible = false; return; }
  if (!toastPlate || toastPlate.destroyed) { toastPlate = new PIXI.Graphics(); overlay.addChild(toastPlate); }
  if (!toastNode || toastNode.destroyed) {
    toastNode = txt('', 12, C.white);
    overlay.addChild(toastNode);
  }
  toastNode.visible = true;
  toastNode.text = toast.text;
  toastNode.x = Math.round((VIEW_W - toastNode.width) / 2);
  toastNode.y = 224;
  toastNode.alpha = Math.min(1, toast.t);
  // 底板不透明：半透明压不住底下的 12px 点阵字
  toastPlate.visible = true;
  toastPlate.clear();
  toastPlate.rect(toastNode.x - 5, 221, toastNode.width + 10, 20).fill(C.ink).stroke({ width: 1, color: C.wall, alignment: 0 });
  toastPlate.alpha = toastNode.alpha;
  if (toast.t <= 0) { toastNode.visible = false; toastPlate.visible = false; }
}

let rotateNode                        = null;
function drawRotateHint() {
  if (!portrait) {
    if (rotateNode) rotateNode.visible = false;
    return;
  }
  if (!rotateNode) {
    rotateNode = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.rect(0, 0, VIEW_W, VIEW_H).fill({ color: C.bg, alpha: 0.92 });
    rotateNode.addChild(g);
    const t = txt('请把设备横过来玩', 12, C.gold);
    t.x = Math.round((VIEW_W - t.width) / 2);
    t.y = 120;
    rotateNode.addChild(t);
    const t2 = txt('地牢面板需要横屏空间', 12, C.stoneLit);
    t2.x = Math.round((VIEW_W - t2.width) / 2);
    t2.y = 140;
    rotateNode.addChild(t2);
    overlay.addChild(rotateNode);
  }
  rotateNode.visible = true;
}

// 只读调试钩子（自测用）
window.__debug = {
  get screen() { return screen; },
  get tab() { return tab; },
  get save() { return S; },
  get bone() { return S.bone; },
  get mana() { return S.mana; },
  get monsters() { return S.monsters.map((m) => ({ ...m, room: roomOf(m.uid) })); },
  get rooms() { return S.rooms; },
  get battle() {
    if (!battle) return null;
    return {
      phase: battle.phase, seal: battle.seal, roomIndex: battle.roomIndex, time: battle.time,
      heroesAlive: battle.heroes.filter((h) => h.alive).length,
      heroHp: battle.heroes.map((h) => Math.round(h.hp)),
      monHp: battle.rooms.map((r) => r.mons.map((m) => Math.round(m.hp))),
      logs: battle.log.length,
    };
  },
  get result() { return battle?.result ?? null; },
  get reports() { return S.reports; },
  get audio() { return audioSnapshot(); },
  get endingT() { return endingT; },
  setTab: (t     ) => setTab(t),
  pagers: () => livePagers.map((p) => ({ ...p, page: pageState[p.key] ?? 0, focus: pagerFocus === p.key })),
  giveResources: (b        , m        ) => { S.bone += b; S.mana += m; render(); },
  forceRaid: (n        ) => { S.raidNo = n; persist(); render(); },
  devRecruit: (kind        ) => { const inst              = { uid: S.uidNext++, kind, lv: 1, xp: 0 }; S.monsters.push(inst); render(); return inst.uid; },
  devPlace: (room        , which         , uid        ) => { S.rooms[room][which] = uid; persist(); render(); },
  devLeader: (room        , uid               ) => { S.rooms[room].leader = uid; if (uid == null) S.rooms[room].flank = null; persist(); render(); },
  devSelKind: (id        ) => { sel = { kind: 'monkind', id }; render(); },
  slots: (room        ) => ({ ...S.rooms[room] }),
  // 锻造台自测钩子
  get smith() { return smith ? { plan: { ...smith.plan, runes: [...smith.plan.runes] }, pick: smith.pick, editId: smith.editId,
    kind: craftKind(smith.plan), cost: craftCost(smith.plan), bad: planValid(smith.plan) } : null; },
  smithOpen: (id                = null) => { openSmith(id); return !!smith; },
  smithClose: () => { closeSmith(); return true; },
  smithTab: (p                             ) => { if (smith) { smith.pick = p; render(); } return smith?.pick ?? null; },
  smithFrame: (id        ) => { smithSetFrame(id); return smith?.plan.frame ?? null; },
  smithRune: (id        ) => { smithToggleRune(id); return smith ? [...smith.plan.runes] : null; },
  smithTemper: (id        ) => { smithSetTemper(id); return smith?.plan.temper ?? null; },
  smithGo: () => { confirmSmith(); return S.forged.length; },
  forgedList: () => S.forged.map((f) => ({ id: f.id, plan: f.plan, kind: gearById(f.id) })),
  meltForged: (id        ) => { meltForged(id); return S.forged.length; },
  gearTables: () => ({ gears: GEARS.length, frames: FRAMES.length, runes: RUNES.length, tempers: TEMPERS.length,
    perSlot: GEAR_SLOTS.map((s2) => ({ slot: s2.id, n: GEARS.filter((x) => x.slot === s2.id).length })) }),
  // 造件/造词缀自测钩子
  get forge() {
    return forge ? { tab: forge.tab, cat: forge.cat, busy: forge.busy, err: forge.err, pick: forge.pick,
      draft: forge.draft, af: forge.af, via: forge.via } : null;
  },
  forgeOpen: (tab                           ) => { openForge(tab); return forge != null; },
  forgeCat: (c         ) => { if (forge) { forge.cat = c; forge.draft = null; forge.af = null; render(); } },
  forgeAsk: async (brief        ) => {
    if (!forge) return null;
    forge.brief = brief;
    if (forgeInput) forgeInput.value = brief;
    await askForge();
    return { draft: forge.draft, af: forge.af, err: forge.err, via: forge.via };
  },
  forgePanel: (p                           ) => { if (forge) { forge.pick = p; render(); } return forge?.pick ?? null; },
  forgeLook: (id        ) => { forgeSetLook(id); return forge?.draft?.look ?? null; },
  forgePower: (id        ) => { forgeTogglePower(id); return forge?.tab === 'part' ? forge?.draft?.powers : forge?.af?.powers; },
  forgeGo: () => { if (!forge) return null; if (forge.tab === 'part') confirmForge(); else confirmAffix(); return true; },
  looks: () => allLooks().map((p) => p.id),
  affixList: (cat         ) => PART_AFFIXES.filter((a) => a.cat === cat).map((a) => ({ id: a.id, name: a.name, mana: a.mana, diy: !!a.diy })),
  setLlm: (m                       ) => { saveMode(m); restoreBackend(); render(); return loadMode(); },
  // 改造台自测钩子
  get graft() { return graft ? { uid: graft.uid, cat: graft.cat, picks: [...graft.picks] } : null; },
  graftOpen: (uid        ) => { openGraft(uid); return graft != null; },
  graftPick: (id        ) => { if (!graft) return null; togglePick(id); return [...graft.picks]; },
  graftCat: (c         ) => { if (graft) { graft.cat = c; render(); } },
  graftGo: () => { if (!graft) return null; confirmGraft(); return true; },
  // 朝向自检：素材已统一朝向，画面上任何单位精灵的 scale.x 都必须为正（不再有运行时翻转）
  facing: () => {
    const out                                               = [];
    unitSprites.forEach((sp, u) => out.push({ name: u.name, side: u.side, sx: Math.sign(sp.scale.x) }));
    return out;
  },
  auraOf: (room        ) => { const c = champById(S.rooms[room].leader); return c ? monKind(c.race).aura ?? null : null; },
  // 英雄名册（培养页自测用）
  get champs() {
    const chem = chemistry(S.champs, seatedChampUids());
    return S.champs.map((c) => ({
      ...c, stat: statOf(c, chem.map), rest: fatigueTier(c.fatigue).text, room: roomOfChamp(c.uid),
      pendingTier: pendingTier(c), title: titleOf(c)?.name ?? null, chem: chemOf(chem.map, c.uid).tags,
    }));
  },
  get chem() { return chemistry(S.champs, seatedChampUids()).lines; },
  heroView: (v                            ) => { heroView = v; render(); },
  get vault() { return [...S.vault]; },
  gearOf: (uid        ) => ({ ...(champById(uid)?.gear ?? {}) }),
  champStatOf: (uid        ) => { const c = champById(uid); return c ? statOf(c) : null; },
  devLoot: (id        ) => { if (gearById(id)) { S.vault.push(id); persist(); render(); } return S.vault.length; },
  devEquip: (uid        , id        ) => {
    const c = champById(uid); const k = gearById(id);
    if (!c || !k) return false;
    if (!c.gear) c.gear = {};
    c.gear[k.slot] = id; persist(); render(); return true;
  },
  synergyAt: (room        ) => synergyOf(S.rooms[room].theme, S.rooms[room].trap)?.name ?? null,
  gearSlot: (sl          ) => { gearSlotSel = sl; render(); },
  // 逻辑坐标 → 屏幕坐标（自测点按真实按钮用，含黑边偏移）
  toScreen: (x        , y        ) => {
    const rect = app.canvas.getBoundingClientRect();
    const kx = rect.width / app.screen.width, ky = rect.height / app.screen.height;
    return { x: rect.left + (root.x + x * viewScale) * kx, y: rect.top + (root.y + y * viewScale) * ky };
  },
  devWound: (uid        , n        ) => { const c = champById(uid); if (c) c.wounds = n; persist(); render(); return c?.wounds; },
  devHeal: (uid        ) => { const c = champById(uid); if (c) healChamp(c); return champById(uid)?.wounds; },
  devRespec: (uid        ) => { const c = champById(uid); if (c) respecChamp(c); return champById(uid)?.talents; },
  devKills: (uid        , k        , b = 0) => { const c = champById(uid); if (c) { c.kills = k; c.battles = b || c.battles; } persist(); render(); return titleOf(c )?.name ?? null; },
  get cands() { return S.cands.map((c) => ({ ...c, cost: candCostOf(c) })); },
  devChamp: (race        , lv = 1, traits           = []) => {
    const c = newChamp(S.champNext++, { id: 0, race, name: randomName(race, Math.random, S.champs.map((x) => x.name)), traits: traits           , potential: 1 });
    c.lv = Math.max(1, Math.min(CHAMP_LV_CAP, lv));
    S.champs.push(c); S.champPot[c.uid] = 1; persist(); render(); return c.uid;
  },
  devSeat: (room        , uid        ) => { seatChamp(room, uid); return S.rooms[room].leader; },
  heroSelect: (uid        ) => { heroSel = uid; heroTab = 'roster'; render(); },
  heroTabSet: (t                      ) => { heroTab = t; render(); },
  devChampXp: (uid        , xp        ) => { const c = champById(uid); if (c) c.xp += xp; persist(); render(); },
  devLevelChamp: (uid        ) => { const c = champById(uid); if (c) levelChamp(c); return c ? c.lv : 0; },
  devPickTalent: (uid        , id        ) => { const c = champById(uid); if (c) pickTalent(c, id            ); return c ? [...c.talents] : []; },
  devFatigue: (uid        , f        ) => { const c = champById(uid); if (c) c.fatigue = f; persist(); render(); },
  devRest: (uid        ) => { const c = champById(uid); if (c) restChamp(c); return c ? c.fatigue : -1; },
  devRecruitChamp: (i = 0) => { const c = S.cands[i]; if (c) recruitChamp(c); return S.champs.length; },
  devTrap: (room        , id        ) => { if (!(id in TRAPS)) return false; if (!S.traps.includes(id)) S.traps.push(id); S.rooms[room].trap = id; persist(); render(); return true; },
  devTheme: (room        , id         ) => { if (!(id in THEMES)) return false; if (!S.themes.includes(id)) S.themes.push(id); S.rooms[room].theme = id; persist(); render(); return true; },
  devLevel: (uid        , lv        ) => { const m = S.monsters.find((x) => x.uid === uid); if (m) m.lv = lv; persist(); render(); },
  get overtime() { return { on: S.overtime, otRaid: S.otRaid }; },
  get currentRaid() { const r = currentRaid(); return { no: r.no, title: r.title, members: r.members.length, affixes: r.affixes }; },
  devDev: (sealLv        , trapLv        ) => { S.sealLv = sealLv; S.trapLv = trapLv; persist(); render(); return { sealMax: sealMax(), trapPower: trapPower() }; },
  get customs() { return S.customs.map((d) => ({ ...d, derived: deriveKind(d) })); },
  get stitch() { return stitch ? { parts: { ...stitch.parts }, affixes: { ...stitch.affixes }, name: stitch.name, cat: stitch.cat, editUid: stitch.editUid } : null; },
  openStitch: (uid                = null) => openStitch(uid),
  closeStitch: () => closeStitch(),
  setPart: (cat         , id        ) => { if (stitch) { stitch.parts[cat] = id; render(); } },
  setAffix: (cat         , id                    ) => { if (stitch) { stitch.affixes[cat] = id; render(); } },
  setStitchName: (n        ) => { if (stitch) { stitch.name = n; stitch.auto = false; if (nameInput) nameInput.value = n; render(); } },
  confirmStitch: () => confirmStitch(),
  dismantle: (uid        ) => dismantle(uid),
  reloadSave: () => { S = freshSave(); loadSave(); for (const d of S.customs) buildCustomTex(d); sel = null; render(); },
  get story() {
    return {
      vars: { ...S.story.vars }, mods: S.story.mods.map((m) => ({ ...m, summary: modSummary(m) })),
      unlocks: [...S.story.unlocks], seen: [...S.story.seen], credits: S.story.credits,
      provider: getProvider().id, folded: battleMods(),
    };
  },
  get storyScene() {
    if (!storyRun) return null;
    const sc = storyRun.scene;
    return {
      id: sc.id, who: sc.who ?? null,
      kind: sc.input ? 'input' : sc.choices && sc.choices.length ? 'choice' : 'done',
      choices: (sc.choices ?? []).map((c) => ({ label: c.label, open: testConds(storyBridge, c.when) })),
      inputPrompt: sc.input?.prompt ?? null,
      log: storyRun.log.map((l) => ({ who: l.who ?? null, text: l.text, tone: l.tone ?? null })),
    };
  },
  storyDraw: async () => { await drawStoryScene(); return window.__debug.storyScene; },
  storyOpen: (id        ) => { const sc = sceneById(id); if (!sc) return false; S.story.credits = Math.max(1, S.story.credits); S.story.credits -= 1; openScene(sc, true); return true; },
  storyChoose: (i        ) => {
    const c = storyRun?.scene.choices?.[i];
    if (!c || !testConds(storyBridge, c.when)) return false;
    resolveExit(c.reply, c.effects, c.next);
    return true;
  },
  storySay: (text        ) => { if (storyInput) storyInput.value = text; submitStoryInput(); return true; },
  storyLeave: () => closeStory(),
  storyCredits: (n        ) => { S.story.credits = n; persist(); render(); },
  storyRead: (path        ) => storyBridge.get(path),
  storyApply: (effects          ) => { const out = applyEffects(storyBridge, effects); persist(); render(); return out; },
  storySetProvider: (p                      ) => { setProvider(p ?? hybridProvider); render(); return getProvider().id; },
  // ---- LLM 外壳 / DIY 造件 ----
  get llm() { return { mode: loadMode(), backend: getBackend()?.name ?? null, status: llmStatus(), cfg: loadCfg() }; },
  llmSetBackend: (b                   ) => { setBackend(b); render(); return getBackend()?.name ?? null; },
  llmEcho: () => { saveMode('echo'); restoreBackend(); render(); return getBackend()?.name ?? null; },
  llmOff: () => { saveMode('off'); restoreBackend(); render(); return getBackend()?.name ?? null; },
  get diy() { return S.diy.map((d) => ({ id: d.id, cat: d.cat, brief: d.brief, via: d.via, draft: d.draft, part: partById(d.id) })); },
  get diyAf() { return S.diyAf.map((d) => ({ id: d.id, cat: d.cat, brief: d.brief, via: d.via, draft: d.draft, affix: PART_AFFIXES.find((a) => a.id === d.id) })); },
  closeForge: () => { closeForge(); return true; },
  forgeConfirm: () => { confirmForge(); return S.diy.length; },
  diyDrop: (id        ) => { dropDiy(id); return S.diy.length; },
  diyAfDrop: (id        ) => { dropDiyAffix(id); return S.diyAf.length; },
  // 版面自检：把当前帧所有 Text 的包围盒两两求交，报重叠像素 —— 文字压字/压按钮靠这个机械发现，别靠肉眼看截图
  // 量真实包围盒（局部坐标 + 高度），排版时按这个数排而不是猜
  boxes: () => {
    const out                                        = [];
    const walk = (c                ) => {
      for (const k of c.children) {
        if (k instanceof PIXI.Text && k.visible && k.text.trim()) out.push({ t: k.text.slice(0, 10), y: Math.round(k.y), h: +k.height.toFixed(2) });
        if (k instanceof PIXI.Container && k.visible) walk(k);
      }
    };
    walk(root);
    return out;
  },
  overlaps: (minArea = 12) => {
    const boxes                                                              = [];
    const walk = (c                ) => {
      for (const k of c.children) {
        if (k === toastNode) continue;
        if (k instanceof PIXI.Text && k.visible && k.alpha > 0.2 && k.text.trim()) {
          const b = k.getBounds();
          boxes.push({ t: k.text.slice(0, 14), x: b.x, y: b.y, w: b.width, h: b.height });
        }
        if (k instanceof PIXI.Container && k.visible) walk(k);
      }
    };
    walk(root);
    const out           = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ow = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ow > 1 && oh > 3 && ow * oh >= minArea) out.push(`「${a.t}」×「${b.t}」 ${Math.round(ow)}x${Math.round(oh)}`);
      }
    }
    return out;
  },
  get partList() { return PARTS.map((p) => ({ id: p.id, cat: p.cat, name: p.name, bone: p.bone, unlockRaid: p.unlockRaid, diy: !!p.diy, tex: p.tex })); },
  get powerMenu() { return POWER_MENU.map((p) => ({ id: p.id, name: p.name, cost: p.cost, cats: p.cats })); },
  get storyScenes() { return SCENES.map((x) => ({ id: x.id, once: !!x.once, chained: !!x.chained, kind: x.input ? 'input' : 'choice' })); },
};

boot().catch((err) => {
  console.error(err);
  const d = document.createElement('div');
  d.style.cssText = 'color:#E7D7A1;font:14px monospace;padding:16px';
  d.textContent = '启动失败：' + String(err);
  document.getElementById('app') .appendChild(d);
});
