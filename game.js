import * as PIXI from 'pixi.js';
import { C, VIEW_W, VIEW_H, MONSTERS, HERO_CLASSES, THEMES, TRAPS, RAIDS, AFFIXES, AURAS, LEVEL_MULT, UPGRADE_COST, XP_PER_LEVEL, TEXTURES, HERO_LV_MULT, SYNERGY, synergyOf, kindById, registerKinds, unregisterKind, isCustomKind, isEliteKind } from './data.js';
import { GEARS, GEAR_SLOTS, GEAR_CAP, MELT_MANA, REFORGE_MANA, FRAMES, RUNES, TEMPERS, FORGED_CAP, craftCost, craftKind, craftName, frameById, runeById, runesFor, temperById, planValid, registerForged, gearById, gearEff, gearSet,                                                               } from './gear.js';
                                                                                        
import { createBattle, stepBattle, ROOM_W, affixText, actionProgress, deployUtilityWorker, evacuateUtilityWorker } from './battle.js';
                                                                      
import { CATS, PARTS, AFFIXES as PART_AFFIXES, AFFIX_POWER, AFFIX_BUDGET, PART_BUDGET, DIY_AFFIX_CAP, affixDraftCost, affixPowerById, allLooks, clampAffixDraft, registerDiyAffixes, GRAFT_CAP, GRAFT_MANA, GRAFT_PULL_MANA, graftCostOf, graftKind, legendaryPartCount, AFFIX_CAP, STITCH_MANA, CUSTOM_CAP, DIY_CAP, POWER_MENU, autoName, boneCost, deriveKind, draftCost, partById, registerDiy, affixById, selectedAffixes, unlockedParts, manaCost as affixMana, powerById } from './modules.js';
                                                                                                                          
import { getBackend, hasBackend, llmStatus, loadCfg, loadMode, requestAffix, requestPart, restoreBackend, saveCfg, saveMode, setBackend, requestScene as llmScene } from './llm.js';
                                        
                                           
import { applyEffects, fillText, getProvider, requestScene, sceneById, setProvider, testConds, localProvider, SCENES } from './story.js';
                                                                      
import { READ_PATHS, foldMods, modSummary } from './vars.js';
                                                                        
import { CHAMP_CAP, CHAMP_LV_CAP, CHEM_INFO, HEAL_MANA, HERO_REST_ROUNDS, HERO_SORTIE_LIMIT, POT_MULT, POT_NAME, REROLL_MANA, REST_MANA, RESPEC_MANA,
  REROLL_TRAIT_BONE, REROLL_TRAIT_MANA, TALENTS, TALENT_CAP, TALENT_TIERS, TIER_LV, TRAITS, WOUND_CAP,
  activeTitleOf, auraText, backgroundById, canLevel, champStats, chemOf, chemistry, ensureChampLore, fatigueTier, newChamp, nextTitle, pendingTier, personalityById, randomName, respecCost,
  rerollTraits, rollCands, talentSlots, tickFatigue, titleById, titleOf, unlockedTitles, upCostOf, xpNeed } from './heroes.js';
                                                         
import { TEX, txt, label, labelC, panel, panelF, frame, bar, sprite, Hits, button, setTextRes, FONT,
  boundedText, paginateText, resetBoundedTextAudit, boundedTextAudit } from './ui.js';
import { initAudio, unlockAudio, playSfx, playHit, playMusic, setMuted, audioSnapshot, tickAudio } from './audio.js';

// ---------- 存档 ----------
               
                                                                                          
                                                                     
                                                                     
                     
                                         
  
             
                                                              
                          
                   
                                     
                                 
                               
                    
                                    
                                        
                                  
                                                       
                                                          
                                                                                        
                                      
                                                         
                                                                      
                                                                                                           
  

const SAVE_KEY = 'yqh-save-v2';

const MAX_FLOORS = 6;
const BASE_NEW_FLOORS = 2;
const DEPTH_MULT = [1.30, 1.15, 1, 0.90, 0.85, 0.80];
const UTILITY_KINDS = {
  none:       { id: 'none', name: '空后勤房', desc: '尚未建造经营设施。', bone: 0, mana: 0, color: C.stoneLit },
  'bone-yard': { id: 'bone-yard', name: '骨料场', tex: 'facility-bone-yard', desc: '每轮生产骨币；越靠外层产量越高。', bone: 60, mana: 0, color: C.bone, yields: [10, 17, 26] },
  'mana-well': { id: 'mana-well', name: '魔力井', tex: 'facility-mana-well', desc: '每轮凝聚魔质；失守后会损失待结算产出。', bone: 40, mana: 12, color: C.purple, yields: [3, 5, 8] },
  training:   { id: 'training', name: '训练场', tex: 'facility-training', desc: '让未参战的怪物或英雄稳定获得经验。', bone: 80, mana: 0, color: C.green, xp: [8, 14, 20], slots: [1, 1, 2] },
  vault:      { id: 'vault', name: '宝库', tex: 'facility-vault', desc: '保护被攻破楼层的部分骨币与魔质。', bone: 130, mana: 18, color: C.gold, boneCap: [20, 45, 80], manaCap: [5, 10, 18] },
  healing:    { id: 'healing', name: '疗愈池', tex: 'facility-healing', desc: '提供英雄疗愈资格与每轮服务次数。', bone: 70, mana: 20, color: C.green, charges: [1, 2, 3] },
  workshop:   { id: 'workshop', name: '工坊', tex: 'facility-workshop', desc: '积攒维修点，并降低锻造或全身改造成本。', bone: 110, mana: 10, color: C.steel, repair: [10, 18, 28], discount: [0.05, 0.10, 0.15] },
  hatchery:   { id: 'hatchery', name: '孵化室', tex: 'facility-hatchery', desc: '降低普通怪物招募骨币，并提供本轮优惠次数。', bone: 90, mana: 8, color: C.purple, charges: [1, 1, 2], discount: [0.08, 0.15, 0.20] },
};
const FLOOR_EXPAND = [null, null,
  { bone: 120, mana: 0 }, { bone: 220, mana: 15 },
  { bone: 400, mana: 35 }, { bone: 650, mana: 70 }];

const freshBattleRoom = () => ({ theme: 'stone', trap: 'none', front: null, back: null, leader: null, flank: null });
const freshUtilityRoom = (raw = {}) => ({
  kind: 'none', level: 0, condition: 100, workerUid: null, trainTargets: [],
  persona: '', nickname: '', history: [], damageCount: 0, repairCount: 0, upgradeCount: 0, workCycles: 0,
  ...raw,
});
const freshFloor = (id, battle = freshBattleRoom(), utility = freshUtilityRoom()) => ({ id, battle, utility: freshUtilityRoom(utility) });

function syncRoomAlias() {
  S.rooms = S.floors.map((f) => f.battle);
  S.dungeon.unlockedFloors = S.floors.length;
}

function freshSave()       {
  const floors = Array.from({ length: BASE_NEW_FLOORS }, (_, i) => freshFloor(i + 1));
  return {
    bone: 95, mana: 18, relic: 0, raidNo: 1, uidNext: 1,
    monsters: [],
    floors, rooms: floors.map((f) => f.battle),
    dungeon: {
      unlockedFloors: BASE_NEW_FLOORS, notoriety: 0, healingCharges: 0,
      repairPoints: 0, forgeCharges: 0, forgeDiscount: 0,
      hatcheryCharges: 0, hatcheryDiscount: 0,
      vaultPriority: 'mana', lastEconomy: null, facilityActionRaid: 0,
    },
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
    story: { vars: {}, mods: [], unlocks: [], seen: [], credits: 1, leads: [], archive: [], leadNext: 1,
      relations: {}, exiles: [], exileNext: 1 },
  };
}

let S       = freshSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw)                 ;
    const base = freshSave();
    const sourceFloors = Array.isArray(p.floors) && p.floors.length
      ? p.floors
      : Array.isArray(p.rooms) && p.rooms.length
        ? p.rooms.map((room, i) => freshFloor(i + 1, room))
        : base.floors;
    const floors = sourceFloors.slice(0, MAX_FLOORS).map((f, i) => {
      const battle = f?.battle && typeof f.battle === 'object' ? f.battle : f;
      const utility = f?.utility && typeof f.utility === 'object' ? f.utility : freshUtilityRoom();
      return freshFloor(i + 1, battle, utility);
    });
    S = {
      ...base, ...p, floors, rooms: floors.map((f) => f.battle),
      dungeon: { ...base.dungeon, ...(p.dungeon && typeof p.dungeon === 'object' ? p.dungeon : {}), unlockedFloors: floors.length },
    };
  } catch { /* 存档损坏则用新档 */ }
  sanitizeSave();
  syncDiyAffixes();   // 词缀先注册：图纸清洗要拿最终的 AFFIXES 表判定
  syncDiy();
  syncCustoms();
  seedExistingFacilityLeads();
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
  if (!Array.isArray(S.floors) || !S.floors.length) {
    const legacy = Array.isArray(S.rooms) && S.rooms.length ? S.rooms : [freshBattleRoom(), freshBattleRoom()];
    S.floors = legacy.slice(0, MAX_FLOORS).map((room, i) => freshFloor(i + 1, room));
  }
  S.floors = S.floors.slice(0, MAX_FLOORS).map((floor, i) => {
    const battle = floor?.battle && typeof floor.battle === 'object' ? floor.battle : freshBattleRoom();
    const raw = floor?.utility && typeof floor.utility === 'object' ? floor.utility : freshUtilityRoom();
    const kind = raw.kind in UTILITY_KINDS ? raw.kind : 'none';
    const level = kind === 'none' ? 0 : Math.max(1, Math.min(3, Math.round(raw.level || 1)));
    const condition = Math.max(0, Math.min(100, Math.round(raw.condition ?? 100)));
    const workerUid = typeof raw.workerUid === 'number' ? raw.workerUid : null;
    const trainTargets = Array.isArray(raw.trainTargets) ? raw.trainTargets
      .filter((x) => x && (x.type === 'monster' || x.type === 'hero') && typeof x.uid === 'number')
      .slice(0, 2).map((x) => ({ type: x.type, uid: x.uid })) : [];
    const history = Array.isArray(raw.history) ? raw.history.filter((x) => x && typeof x.text === 'string').slice(-24) : [];
    return freshFloor(i + 1, battle, { kind, level, condition, workerUid, trainTargets,
      persona: typeof raw.persona === 'string' ? raw.persona : '', nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 12) : '', history,
      damageCount: Math.max(0, Math.round(raw.damageCount || 0)), repairCount: Math.max(0, Math.round(raw.repairCount || 0)),
      upgradeCount: Math.max(0, Math.round(raw.upgradeCount || 0)), workCycles: Math.max(0, Math.round(raw.workCycles || 0)) });
  });
  if (!S.dungeon || typeof S.dungeon !== 'object') S.dungeon = {};
  S.dungeon = {
    unlockedFloors: S.floors.length,
    notoriety: Math.max(0, Math.round(S.dungeon.notoriety || 0)),
    healingCharges: Math.max(0, Math.min(6, Math.round(S.dungeon.healingCharges || 0))),
    repairPoints: Math.max(0, Math.min(60, Math.round(S.dungeon.repairPoints || 0))),
    forgeCharges: Math.max(0, Math.min(2, Math.round(S.dungeon.forgeCharges || 0))),
    forgeDiscount: Math.max(0, Math.min(0.15, Number(S.dungeon.forgeDiscount) || 0)),
    hatcheryCharges: Math.max(0, Math.min(3, Math.round(S.dungeon.hatcheryCharges || 0))),
    hatcheryDiscount: Math.max(0, Math.min(0.20, Number(S.dungeon.hatcheryDiscount) || 0)),
    vaultPriority: S.dungeon.vaultPriority === 'bone' ? 'bone' : 'mana',
    lastEconomy: S.dungeon.lastEconomy && typeof S.dungeon.lastEconomy === 'object' ? S.dungeon.lastEconomy : null,
    facilityActionRaid: Math.max(0, Math.round(S.dungeon.facilityActionRaid || 0)),
  };
  syncRoomAlias();
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
    leads: Array.isArray(st?.leads) ? st.leads.filter((x) => x && typeof x.id === 'number' && typeof x.sceneId === 'string')
      .slice(0, 24).map((x) => ({ ...x, dueRaid: Math.max(1, Math.round(x.dueRaid ?? x.raidNo ?? 1)), context: x.context && typeof x.context === 'object' ? x.context : {} })) : [],
    archive: Array.isArray(st?.archive) ? st.archive.filter((x) => x && typeof x.sceneId === 'string') : [],
    leadNext: typeof st?.leadNext === 'number' ? Math.max(1, Math.round(st.leadNext)) : 1,
    relations: st?.relations && typeof st.relations === 'object' ? st.relations : {},
    exiles: Array.isArray(st?.exiles) ? st.exiles.filter((x) => x && typeof x.id === 'number' && x.champ) : [],
    exileNext: typeof st?.exileNext === 'number' ? Math.max(1, Math.round(st.exileNext)) : 1,
  };
  S.story.exileNext = Math.max(S.story.exileNext, ...S.story.exiles.map((x) => x.id + 1));
  S.story.leadNext = Math.max(S.story.leadNext,
    ...S.story.leads.map((x) => x.id + 1), ...S.story.archive.map((x) => (x.id ?? 0) + 1));
  // 英雄名册：等级/经验/专精数量都要自洽，坏档不能把培养页打崩
  if (!Array.isArray(S.champs)) S.champs = [];
  if (typeof S.champNext !== 'number') S.champNext = 1;
  if (!Array.isArray(S.cands)) S.cands = [];
  if (typeof S.candNext !== 'number') S.candNext = 1;
  if (typeof S.candRaid !== 'number') S.candRaid = 0;
  if (!S.champPot || typeof S.champPot !== 'object') S.champPot = {};
  S.cands = S.cands.filter((c) => c && typeof c.id === 'number' && kindById(c.race)?.legend && typeof c.name === 'string');
  for (const c of S.cands) ensureChampLore(c);
  S.champs = S.champs.filter((c) => c && typeof c.uid === 'number' && kindById(c.race)?.legend && typeof c.name === 'string');
  for (const c of S.champs) {
    ensureChampLore(c);
    c.lv = Math.max(1, Math.min(CHAMP_LV_CAP, Math.round(c.lv || 1)));
    c.xp = Math.max(0, Math.round(c.xp || 0));
    c.fatigue = Math.max(0, Math.min(100, Math.round(c.fatigue || 0)));
    c.sorties = Math.max(0, Math.min(HERO_SORTIE_LIMIT - 1, Math.round(c.sorties || 0)));
    c.restTurns = Math.max(0, Math.min(HERO_REST_ROUNDS, Math.round(c.restTurns || 0)));
    c.battles = Math.max(0, Math.round(c.battles || 0));
    c.kills = Math.max(0, Math.round(c.kills || 0));
    c.wounds = Math.max(0, Math.min(WOUND_CAP, Math.round(c.wounds || 0)));
    c.activeTitle = c.activeTitle ?? '';
    c.stats = c.stats ?? {};
    c.traits = (Array.isArray(c.traits) ? c.traits : []).filter((t) => t in TRAITS).slice(0, 2);
    c.talents = (Array.isArray(c.talents) ? c.talents : []).filter((t) => t in TALENTS).slice(0, talentSlots(c));
    // 英雄可改造全身四部位；清除旧档中的无效件和重复部位。
    if (Array.isArray(c.graft)) {
      const seen = new Set();
      const ok = c.graft.filter((id) => {
        const p = typeof id === 'string' ? partById(id) : null;
        if (!p || seen.has(p.cat)) return false;
        seen.add(p.cat);
        return true;
      }).slice(0, 4);
      if (ok.length) c.graft = ok; else delete c.graft;
    } else delete c.graft;
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
  S.relic = Math.max(0, Math.round(Number(S.relic) || 0));
  if (typeof S.diyNext !== 'number') S.diyNext = 1;
  if (!Array.isArray(S.diyAf)) S.diyAf = [];
  if (typeof S.diyAfNext !== 'number') S.diyAfNext = 1;
  S.story.unlocks = S.story.unlocks.filter((u) => {
    const [kind, id] = u.split(':');
    if (kind === 'part') return !!partById(id);
    if (kind === 'affix') return PART_AFFIXES.some((a) => a.id === id);
    return false;
  });
  // 后勤岗位与战斗部署、训练目标严格互斥；坏档或旧档中的重复引用只保留最先出现的一处。
  const deployedMonsters = new Set(S.rooms.flatMap((r) => [r.front, r.back, r.flank]).filter((u) => u != null));
  const deployedHeroes = new Set(S.rooms.map((r) => r.leader).filter((u) => u != null));
  const monsterUids = new Set(S.monsters.map((m) => m.uid));
  const heroUids = new Set(S.champs.map((c) => c.uid));
  const occupiedWorkers = new Set();
  const workerKinds = new Set(['bone-yard', 'mana-well', 'workshop', 'hatchery']);
  for (const floor of S.floors) {
    const u = floor.utility;
    if (!workerKinds.has(u.kind) || !monsterUids.has(u.workerUid) || deployedMonsters.has(u.workerUid) || occupiedWorkers.has(u.workerUid)) u.workerUid = null;
    if (u.workerUid != null) occupiedWorkers.add(u.workerUid);
  }
  const occupiedTraining = new Set();
  for (const floor of S.floors) {
    const u = floor.utility;
    if (u.kind !== 'training') { u.trainTargets = []; continue; }
    const slots = utilityDef(u).slots[u.level - 1];
    u.trainTargets = u.trainTargets.filter((x) => {
      const key = `${x.type}:${x.uid}`;
      const exists = x.type === 'monster' ? monsterUids.has(x.uid) : heroUids.has(x.uid);
      const deployed = x.type === 'monster' ? deployedMonsters.has(x.uid) : deployedHeroes.has(x.uid);
      const worker = x.type === 'monster' && occupiedWorkers.has(x.uid);
      if (!exists || deployed || worker || occupiedTraining.has(key)) return false;
      occupiedTraining.add(key);
      return true;
    }).slice(0, slots);
  }
  S.dungeon.healingCharges = Math.min(S.dungeon.healingCharges, healingCapacity());
  const workshopOut = S.floors.map((_, i) => utilityOutput(i)).filter((x, i) => S.floors[i].utility.kind === 'workshop');
  S.dungeon.forgeCharges = Math.min(S.dungeon.forgeCharges, 2, workshopOut.length);
  S.dungeon.forgeDiscount = Math.min(S.dungeon.forgeDiscount, workshopOut.reduce((n, x) => Math.max(n, x.forgeDiscount), 0));
  const hatcheryOut = S.floors.map((_, i) => utilityOutput(i)).filter((x, i) => S.floors[i].utility.kind === 'hatchery');
  S.dungeon.hatcheryCharges = Math.min(S.dungeon.hatcheryCharges, 3, hatcheryOut.reduce((n, x) => n + x.hatcheryCharges, 0));
  S.dungeon.hatcheryDiscount = Math.min(S.dungeon.hatcheryDiscount, hatcheryOut.reduce((n, x) => Math.max(n, x.hatcheryDiscount), 0));
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

function exportSave() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) { say('没有可导出的存档'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `yqh-save-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    say('存档已导出');
  } catch { say('导出失败'); }
}

function importSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.txt,application/json,text/plain';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      localStorage.setItem(SAVE_KEY, text);
      say('存档导入成功，即将刷新');
      setTimeout(() => location.reload(), 800);
    } catch { say('导入失败：文件格式错误'); }
  };
  input.click();
}

// ---------- 派生数据 ----------
const sealMax = () => 100 + S.sealLv * 25;
const trapPower = () => 1 + S.trapLv * 0.25;
const utilityAt = (floor) => S.floors[floor]?.utility;
const utilityDef = (u) => UTILITY_KINDS[u?.kind] ?? UTILITY_KINDS.none;
const conditionEff = (condition) => condition <= 0 ? 0 : condition <= 25 ? 0.4 : condition <= 50 ? 0.7 : condition <= 75 ? 0.9 : 1;
const FACILITY_PERSONAS = {
  scarred: { name: '伤痕累累', desc: '反复遭劫后学会拖慢洗劫，劫掠速度-12%。' },
  steadfast: { name: '百折不挠', desc: '多次修复后结构更稳，低耐久效率提高。' },
  ambitious: { name: '贪长', desc: '连续扩建后产出+10%，但完整劫掠破坏更重。' },
  industrious: { name: '勤作', desc: '长期有人管理，员工效率+10%。' },
};
const FACILITY_NICK = {
  scarred: ['断门', '旧伤', '不倒墙'], steadfast: ['再生室', '铁缝', '复起之所'],
  ambitious: ['深喉', '无尽间', '第七码'], industrious: ['长明房', '夜班所', '不停炉'],
};

function facilityName(u) { return u?.nickname ? `${u.nickname}（${utilityDef(u).name}）` : utilityDef(u).name; }
function addFacilityHistory(floor, type, text) {
  const u = utilityAt(floor);
  if (!u || u.kind === 'none') return;
  if (!Array.isArray(u.history)) u.history = [];
  u.history.push({ raid: S.raidNo, type, text });
  if (u.history.length > 24) u.history.splice(0, u.history.length - 24);
}
function refreshFacilityIdentity(floor) {
  const u = utilityAt(floor);
  if (!u || u.kind === 'none') return;
  const before = u.persona || '';
  const persona = u.damageCount >= 3 ? 'scarred' : u.repairCount >= 2 ? 'steadfast'
    : u.upgradeCount >= 2 ? 'ambitious' : u.workCycles >= 3 ? 'industrious' : '';
  if (!persona || before) return;
  u.persona = persona;
  const names = FACILITY_NICK[persona];
  const seed = (floor + u.kind.length + S.raidNo) % names.length;
  u.nickname = names[seed];
  addFacilityHistory(floor, 'identity', `获得性格“${FACILITY_PERSONAS[persona].name}”，被称作“${u.nickname}”`);
  queueStoryLead(`facility-awakening:${floor}:${u.kind}:${persona}`, 'facility-awakening', '设施异闻', `${u.nickname}第一次回应自己的名字`,
    { ref: `${floor}:${u.kind}`, floor: floor + 1, facility: utilityDef(u).name, nickname: u.nickname, persona: FACILITY_PERSONAS[persona].name });
}
const WORKER_KINDS = new Set(['bone-yard', 'mana-well', 'workshop', 'hatchery']);
const WORKER_APTITUDE = {
  'bone-yard': new Set(['archer', 'lich', 'elite-lich', 'bonedragon', 'elite-bonedragon']),
  'mana-well': new Set(['shaman', 'lich', 'elite-lich', 'beholder', 'elite-beholder', 'mindflayer', 'elite-mindflayer']),
  workshop: new Set(['goblin', 'ogre', 'hundredarm', 'elite-hundredarm', 'magmagolem', 'elite-magmagolem']),
  hatchery: new Set(['slime', 'bat', 'shaman', 'broodqueen', 'elite-broodqueen']),
};

function workerFloorOf(uid) {
  return S.floors.findIndex((f) => f.utility.workerUid === uid);
}

function trainingOf(type, uid) {
  return S.floors.findIndex((f) => f.utility.trainTargets.some((x) => x.type === type && x.uid === uid));
}

function monsterPost(uid) {
  const room = roomOf(uid);
  if (room >= 0) return { text: `${room + 1}房`, busy: true, kind: 'guard' };
  const job = workerFloorOf(uid);
  if (job >= 0) return { text: `${job + 1}层工`, busy: true, kind: 'work' };
  const training = trainingOf('monster', uid);
  if (training >= 0) return { text: `${training + 1}层训`, busy: true, kind: 'training' };
  return { text: '空闲', busy: false, kind: 'free' };
}

function workerEff(u) {
  const inst = instById(u?.workerUid);
  if (!inst) return 0.5;
  const base = inst.lv <= 2 ? 0.9 : inst.lv <= 4 ? 1 : 1.1;
  const aptitude = WORKER_APTITUDE[u.kind]?.has(inst.kind) ? 0.1 : 0;
  return Math.min(1.3, base + aptitude + (u.persona === 'industrious' ? 0.1 : 0));
}

function workerName(u) {
  const inst = instById(u?.workerUid);
  return inst ? instKind(inst).name : '无人';
}

function utilityOutput(floorIndex) {
  const floor = S.floors[floorIndex];
  const u = floor?.utility;
  const d = utilityDef(u);
  if (!u || u.kind === 'none' || u.condition <= 0) return {
    bone: 0, mana: 0, xp: 0, repair: 0, healingCharges: 0, forgeCharges: 0, forgeDiscount: 0,
    hatcheryCharges: 0, hatcheryDiscount: 0, training: [], persona: '', nickname: '', lootResist: 1,
  };
  const lv = Math.max(1, Math.min(3, u.level)) - 1;
  const depth = DEPTH_MULT[floorIndex] ?? 0.8;
  const rawCondition = conditionEff(u.condition);
  const condition = u.persona === 'steadfast' && u.condition <= 50 ? Math.min(1, rawCondition + 0.15) : rawCondition;
  const staffed = workerEff(u);
  const personaYield = u.persona === 'ambitious' ? 1.1 : 1;
  const mult = depth * condition * staffed * personaYield;
  const targets = u.trainTargets.map((x) => ({ ...x }));
  return {
    bone: d.yields && u.kind === 'bone-yard' ? Math.max(0, Math.round(d.yields[lv] * mult)) : 0,
    mana: d.yields && u.kind === 'mana-well' ? Math.max(0, Math.round(d.yields[lv] * mult)) : 0,
    xp: u.kind === 'training' && targets.length ? Math.max(0, Math.round(d.xp[lv] * condition * personaYield)) : 0,
    repair: u.kind === 'workshop' ? Math.max(0, Math.round(d.repair[lv] * condition * staffed * personaYield)) : 0,
    healingCharges: u.kind === 'healing' ? Math.max(1, Math.round(d.charges[lv] * condition * staffed * personaYield)) : 0,
    forgeCharges: u.kind === 'workshop' ? 1 : 0,
    forgeDiscount: u.kind === 'workshop' ? d.discount[lv] * Math.min(1, condition * staffed) : 0,
    hatcheryCharges: u.kind === 'hatchery' ? Math.max(1, Math.round(d.charges[lv] * condition * staffed * personaYield)) : 0,
    hatcheryDiscount: u.kind === 'hatchery' ? d.discount[lv] * Math.min(1, condition * staffed) : 0,
    training: targets, persona: u.persona || '', nickname: u.nickname || '',
    lootResist: u.persona === 'scarred' ? 0.88 : 1,
  };
}

function utilityBuildDetail(kind, floorIndex) {
  const d = UTILITY_KINDS[kind];
  const depth = Math.round((DEPTH_MULT[floorIndex] ?? 0.8) * 100);
  const effect = kind === 'bone-yard' ? `Lv1基础每轮10骨币；本层深度效率${depth}%，可指派员工。`
    : kind === 'mana-well' ? `Lv1基础每轮3魔质；本层深度效率${depth}%，可指派员工。`
      : kind === 'training' ? 'Lv1提供1个训练位，每名未参战单位每轮获得8经验。'
        : kind === 'healing' ? 'Lv1每轮提供1次疗愈资格；没有可用疗愈池时不能疗愈英雄。'
          : kind === 'workshop' ? 'Lv1每轮提供10维修点，并提供1次5%的锻造或改造优惠。'
            : kind === 'hatchery' ? 'Lv1每轮提供1次普通怪物招募优惠，骨币消耗降低8%。'
              : 'Lv1保护20骨币与5魔质；被攻破后保护能力会随损坏下降。';
  return `${d.desc}\n${effect}\n建造成本：${d.bone}骨币${d.mana ? `＋${d.mana}魔质` : ''}。`;
}

function repairQuote(u) {
  const missing = Math.max(0, 100 - u.condition);
  const points = Math.min(S.dungeon.repairPoints, missing);
  return { missing, points, bone: Math.max(0, Math.ceil((missing - points) * 0.8)) };
}

function workshopQuote(bone, mana) {
  const discount = S.dungeon.forgeCharges > 0 ? S.dungeon.forgeDiscount : 0;
  return {
    bone: Math.max(0, Math.ceil(bone * (1 - discount))),
    mana: Math.max(0, Math.ceil(mana * (1 - discount))),
    discount,
  };
}

function consumeWorkshopCharge(quote) {
  if (quote.discount > 0 && S.dungeon.forgeCharges > 0) S.dungeon.forgeCharges--;
}

function recruitQuote(k) {
  const eligible = !isCustomKind(k.id) && !k.legend && S.dungeon.hatcheryCharges > 0;
  const discount = eligible ? S.dungeon.hatcheryDiscount : 0;
  return { cost: Math.max(1, Math.ceil(k.cost * (1 - discount))), discount };
}

function consumeHatcheryCharge(quote) {
  if (quote.discount > 0 && S.dungeon.hatcheryCharges > 0) S.dungeon.hatcheryCharges--;
}

function healingCapacity() {
  return Math.min(6, S.floors.reduce((n, f) => {
    const u = f.utility, d = utilityDef(u);
    return n + (u.kind === 'healing' && u.condition > 0 ? d.charges[u.level - 1] : 0);
  }, 0));
}

function vaultCapacity(broken = null) {
  let bone = 0, mana = 0;
  S.floors.forEach((f, i) => {
    const u = f.utility, d = utilityDef(u);
    if (u.kind !== 'vault' || u.condition <= 0) return;
    const breachMult = broken?.[i] ? 0.5 : 1;
    bone += Math.round(d.boneCap[u.level - 1] * breachMult);
    mana += Math.round(d.manaCap[u.level - 1] * breachMult);
  });
  return { bone: Math.min(180, bone), mana: Math.min(40, mana) };
}

function dungeonEconomyPreview() {
  const rows = S.floors.map((f, i) => ({ floor: i, kind: f.utility.kind, level: f.utility.level,
    condition: f.utility.condition, workerUid: f.utility.workerUid, ...utilityOutput(i) }));
  return {
    rows,
    bone: rows.reduce((n, x) => n + x.bone, 0),
    mana: rows.reduce((n, x) => n + x.mana, 0),
    xp: rows.reduce((n, x) => n + x.xp * x.training.length, 0),
    repair: rows.reduce((n, x) => n + x.repair, 0),
    vault: vaultCapacity(),
  };
}

function utilityUpgradeCost(u) {
  const d = utilityDef(u);
  const mult = u.level === 1 ? 1.5 : 2.5;
  return { bone: Math.round(d.bone * mult), mana: Math.round(d.mana * mult) };
}

function facilityActionAvailable() { return S.dungeon.facilityActionRaid !== S.raidNo; }

function buildUtility(floorIndex, kind) {
  const floor = S.floors[floorIndex], d = UTILITY_KINDS[kind];
  if (!floor || !d || kind === 'none' || floor.utility.kind !== 'none') return;
  if (!facilityActionAvailable()) { say('本轮已经建设过设施，完成下一次袭击后才能继续'); return; }
  if (S.bone < d.bone || S.mana < d.mana) { say('建造资源不足'); return; }
  S.bone -= d.bone; S.mana -= d.mana;
  floor.utility = freshUtilityRoom({ kind, level: 1, condition: 100, workerUid: null, trainTargets: [] });
  S.dungeon.facilityActionRaid = S.raidNo;
  addFacilityHistory(floorIndex, 'built', `${d.name}建成`);
  if (kind === 'healing') S.dungeon.healingCharges = Math.min(6, S.dungeon.healingCharges + 1);
  queueStoryLead(`facility:${floorIndex}:${kind}`, `facility-${kind}`, '设施异闻', `${floorIndex + 1}层・${d.name}`,
    { ref: `${floorIndex}:${kind}`, floor: floorIndex + 1, facility: d.name });
  persist(); playSfx('buy'); say(`${floorIndex + 1}层建成${d.name}`); render();
}

function upgradeUtility(floorIndex) {
  const u = utilityAt(floorIndex);
  if (!u || u.kind === 'none' || u.level >= 3) return;
  if (!facilityActionAvailable()) { say('本轮已经建设过设施，完成下一次袭击后才能继续'); return; }
  const cost = utilityUpgradeCost(u);
  if (S.bone < cost.bone || S.mana < cost.mana) { say('升级资源不足'); return; }
  S.bone -= cost.bone; S.mana -= cost.mana; u.level++;
  S.dungeon.facilityActionRaid = S.raidNo;
  u.upgradeCount = (u.upgradeCount || 0) + 1;
  addFacilityHistory(floorIndex, 'upgrade', `扩建至Lv${u.level}`);
  refreshFacilityIdentity(floorIndex);
  if (u.kind === 'healing') S.dungeon.healingCharges = Math.min(healingCapacity(), S.dungeon.healingCharges + 1);
  const d = utilityDef(u);
  queueStoryLead(`facility-growth:${floorIndex}:${u.kind}:${u.level}`, 'facility-growth', '设施异闻', `${floorIndex + 1}层・${d.name}扩建后的异响`,
    { ref: `${floorIndex}:${u.kind}`, floor: floorIndex + 1, facility: d.name, level: u.level });
  persist(); playSfx('buy'); say(`${utilityDef(u).name}升到${u.level}级`); render();
}

function repairUtility(floorIndex) {
  const u = utilityAt(floorIndex);
  if (!u || u.kind === 'none' || u.condition >= 100) return;
  const quote = repairQuote(u);
  if (S.bone < quote.bone) { say('维修骨币不足'); return; }
  const beforeCondition = u.condition;
  const wasStopped = beforeCondition <= 0;
  S.dungeon.repairPoints -= quote.points;
  S.bone -= quote.bone; u.condition = 100;
  u.repairCount = (u.repairCount || 0) + 1;
  addFacilityHistory(floorIndex, 'repair', `从${beforeCondition}耐久修复至100`);
  refreshFacilityIdentity(floorIndex);
  if (wasStopped && u.kind === 'healing') S.dungeon.healingCharges = Math.min(healingCapacity(), S.dungeon.healingCharges + utilityDef(u).charges[u.level - 1]);
  else S.dungeon.healingCharges = Math.min(S.dungeon.healingCharges, healingCapacity());
  if (wasStopped || beforeCondition <= 35) {
    const d = utilityDef(u);
    queueStoryLead(`facility-repair:${floorIndex}:${u.kind}:${S.raidNo}`, 'facility-repair', '设施异闻', `${floorIndex + 1}层・${d.name}留下的伤痕`,
      { ref: `${floorIndex}:${u.kind}`, floor: floorIndex + 1, facility: d.name, damage: 100 - beforeCondition });
  }
  persist(); playSfx('place'); say(`${utilityDef(u).name}修复完成`); render();
}

function assignWorker(floorIndex, uid) {
  const u = utilityAt(floorIndex);
  const inst = instById(uid);
  if (!u || !WORKER_KINDS.has(u.kind) || !inst) return;
  if (u.workerUid === uid) {
    u.workerUid = null;
    persist(); playSfx('place'); say(`${instKind(inst).name}离开了${utilityDef(u).name}`); render(); return;
  }
  if (roomOf(uid) >= 0) { say('驻守中的怪物不能兼任工作人员'); return; }
  const trainingFloor = trainingOf('monster', uid);
  if (trainingFloor >= 0) { say(`它正在${trainingFloor + 1}层训练，先取消训练`); return; }
  const old = workerFloorOf(uid);
  if (old >= 0) S.floors[old].utility.workerUid = null;
  u.workerUid = uid;
  addFacilityHistory(floorIndex, 'staff', `${instKind(inst).name}开始长期管理`);
  sel = { kind: 'utility', floor: floorIndex };
  persist(); playSfx('place'); say(`${instKind(inst).name}开始管理${utilityDef(u).name}`); render();
}

function toggleTrainingTarget(floorIndex, type, uid) {
  const u = utilityAt(floorIndex);
  if (!u || u.kind !== 'training') return;
  const list = u.trainTargets;
  const at = list.findIndex((x) => x.type === type && x.uid === uid);
  if (at >= 0) {
    list.splice(at, 1); persist(); playSfx('place'); render(); return;
  }
  const d = utilityDef(u);
  if (list.length >= d.slots[u.level - 1]) { say('训练名额已满'); return; }
  if (type === 'monster') {
    const inst = instById(uid);
    if (!inst || roomOf(uid) >= 0) { say('驻守中的怪物不能训练'); return; }
    const job = workerFloorOf(uid);
    if (job >= 0) { say(`它正在${job + 1}层工作，先撤下岗位`); return; }
  } else {
    const c = champById(uid);
    if (!c || roomOfChamp(uid) >= 0) { say('统领席上的英雄不能训练'); return; }
  }
  const old = trainingOf(type, uid);
  if (old >= 0) { say(`该单位已在${old + 1}层训练`); return; }
  const existing = list[0] ? { ...list[0] } : null;
  list.push({ type, uid });
  queueTrainingRelation(floorIndex, { type, uid }, existing);
  persist(); playSfx('place'); render();
}

function demolishUtility(floorIndex) {
  const u = utilityAt(floorIndex);
  if (!u || u.kind === 'none') return;
  if (!(sel?.kind === 'utility' && sel.floor === floorIndex && sel.confirmDemolish)) {
    sel = { kind: 'utility', floor: floorIndex, confirmDemolish: true };
    const lastHealing = u.kind === 'healing' && healingCapacity() <= utilityDef(u).charges[u.level - 1];
    say(lastHealing ? '拆除后将无法使用英雄疗愈；再次点击确认拆除' : `再次点击拆除将返还${Math.round(utilityDef(u).bone * 0.4)}骨币`); render(); return;
  }
  const name = utilityDef(u).name;
  S.bone += Math.round(utilityDef(u).bone * 0.4);
  S.floors[floorIndex].utility = freshUtilityRoom();
  S.dungeon.healingCharges = Math.min(S.dungeon.healingCharges, healingCapacity());
  const workshops = S.floors.map((_, i) => utilityOutput(i)).filter((x, i) => S.floors[i].utility.kind === 'workshop');
  S.dungeon.forgeCharges = Math.min(S.dungeon.forgeCharges, Math.min(2, workshops.length));
  S.dungeon.forgeDiscount = workshops.reduce((n, x) => Math.max(n, x.forgeDiscount), 0);
  const hatcheries = S.floors.map((_, i) => utilityOutput(i)).filter((x, i) => S.floors[i].utility.kind === 'hatchery');
  S.dungeon.hatcheryCharges = Math.min(S.dungeon.hatcheryCharges, Math.min(3, hatcheries.reduce((n, x) => n + x.hatcheryCharges, 0)));
  S.dungeon.hatcheryDiscount = hatcheries.reduce((n, x) => Math.max(n, x.hatcheryDiscount), 0);
  sel = { kind: 'utility', floor: floorIndex };
  persist(); playSfx('break'); say(`${name}已拆除`); render();
}

function expandFloor() {
  if (S.floors.length >= MAX_FLOORS) { say('地牢已达到六层上限'); return; }
  const cost = FLOOR_EXPAND[S.floors.length];
  if (!cost || S.bone < cost.bone || S.mana < cost.mana) { say('扩层资源不足'); return; }
  S.bone -= cost.bone; S.mana -= cost.mana;
  S.floors.push(freshFloor(S.floors.length + 1));
  syncRoomAlias();
  pageState['dungeon-floors'] = Math.floor((S.floors.length - 1) / 3);
  persist(); playSfx('buy'); say(`地牢扩建至${S.floors.length}层，恶名随之上升`); render();
}

function settleDungeonEconomy(b) {
  const snap = b.dungeonEconomy ?? dungeonEconomyPreview();
  const broken = b.rooms.map((r) => !!r.broken);
  const cap = vaultCapacity(broken);
  let boneShield = cap.bone, manaShield = cap.mana;
  const rows = [...snap.rows].reverse().map((row) => {
    const breached = broken[row.floor] ?? false;
    const bone = row.bone ?? 0, mana = row.mana ?? 0, xp = row.xp ?? 0, repair = row.repair ?? 0;
    const training = Array.isArray(row.training) ? row.training : [];
    const realtime = row.realtime;
    let boneLoss = realtime ? realtime.boneLoss : breached ? Math.round(bone * 0.6) : 0;
    let manaLoss = realtime ? realtime.manaLoss : breached ? Math.round(mana * 0.6) : 0;
    const xpLoss = realtime ? realtime.xpLoss : breached ? Math.round(xp * 0.6) : 0;
    const repairLoss = realtime ? realtime.repairLoss : breached ? Math.round(repair * 0.6) : 0;
    const manaProtected = Math.min(manaShield, manaLoss); manaShield -= manaProtected; manaLoss -= manaProtected;
    const boneProtected = Math.min(boneShield, boneLoss); boneShield -= boneProtected; boneLoss -= boneProtected;
    const u = utilityAt(row.floor);
    const conditionDamage = row.kind === 'none' ? 0 : realtime?.conditionDamage ?? (breached ? 15 : 0);
    if (conditionDamage && u && u.kind !== 'none') {
      u.condition = Math.max(0, u.condition - conditionDamage);
      u.damageCount = (u.damageCount || 0) + 1;
      addFacilityHistory(row.floor, 'damage', `第${S.raidNo}轮遭劫，耐久-${conditionDamage}`);
      refreshFacilityIdentity(row.floor);
    }
    if (u?.workerUid && !breached) {
      u.workCycles = (u.workCycles || 0) + 1;
      if (u.workCycles === 3) addFacilityHistory(row.floor, 'staff', '连续三轮有人值守');
      refreshFacilityIdentity(row.floor);
    }
    return { ...row, bone, mana, xp, repair, training, breached, boneLoss, manaLoss, xpLoss, repairLoss, boneProtected, manaProtected,
      boneGot: bone - boneLoss, manaGot: mana - manaLoss,
      xpGot: xp - xpLoss, repairGot: repair - repairLoss, conditionDamage,
      serviceLost: realtime?.serviceLost ?? (breached && row.kind !== 'none' ? (row.healingCharges ?? 0) + (row.forgeCharges ?? 0) + (row.hatcheryCharges ?? 0) : 0),
      lootDuration: realtime?.duration ?? 0, lootProgress: realtime?.progress ?? (breached && row.kind !== 'none' ? 0.6 : 0),
      workerState: realtime?.workerState ?? row.workerState ?? (row.workerUid ? 'working' : 'none'),
      conditionAfter: u?.condition ?? 100 };
  }).reverse();
  const out = {
    rows,
    bone: rows.reduce((n, x) => n + x.boneGot, 0), mana: rows.reduce((n, x) => n + x.manaGot, 0),
    xp: rows.reduce((n, x) => n + x.xpGot * x.training.length, 0),
    repair: rows.reduce((n, x) => n + x.repairGot, 0),
    boneLost: rows.reduce((n, x) => n + x.boneLoss, 0), manaLost: rows.reduce((n, x) => n + x.manaLoss, 0),
    xpLost: rows.reduce((n, x) => n + x.xpLoss * x.training.length, 0),
    repairLost: rows.reduce((n, x) => n + x.repairLoss, 0),
    boneProtected: rows.reduce((n, x) => n + x.boneProtected, 0), manaProtected: rows.reduce((n, x) => n + x.manaProtected, 0),
  };
  S.bone += out.bone; S.mana += out.mana;
  for (const row of rows) {
    if (!row.xpGot) continue;
    for (const target of row.training) {
      const unit = target.type === 'monster' ? instById(target.uid) : champById(target.uid);
      if (!unit) continue;
      const capped = target.type === 'monster' ? unit.lv >= 5 : unit.lv >= CHAMP_LV_CAP;
      if (!capped) unit.xp += row.xpGot;
    }
  }
  S.dungeon.repairPoints = Math.min(60, S.dungeon.repairPoints + out.repair);
  const serviceRows = rows.filter((row) => row.conditionAfter > 0);
  const remainingService = (row, key) => Math.max(0, (row[key] ?? 0) - (row.breached ? row.serviceLost : 0));
  S.dungeon.healingCharges = Math.min(6, serviceRows.reduce((n, row) => n + remainingService(row, 'healingCharges'), 0));
  S.dungeon.forgeCharges = Math.min(2, serviceRows.reduce((n, row) => n + remainingService(row, 'forgeCharges'), 0));
  S.dungeon.forgeDiscount = serviceRows.reduce((n, row) => Math.max(n, remainingService(row, 'forgeCharges') ? (row.forgeDiscount ?? 0) : 0), 0);
  S.dungeon.hatcheryCharges = Math.min(3, serviceRows.reduce((n, row) => n + remainingService(row, 'hatcheryCharges'), 0));
  S.dungeon.hatcheryDiscount = serviceRows.reduce((n, row) => Math.max(n, remainingService(row, 'hatcheryCharges') ? (row.hatcheryDiscount ?? 0) : 0), 0);
  out.services = {
    healing: S.dungeon.healingCharges,
    forge: S.dungeon.forgeCharges,
    forgeDiscount: S.dungeon.forgeDiscount,
    hatchery: S.dungeon.hatcheryCharges,
    hatcheryDiscount: S.dungeon.hatcheryDiscount,
  };
  S.dungeon.lastEconomy = out;
  return out;
}

function dungeonRaidScale() {
  const n = S.floors.length;
  if (n >= 6) return { hp: 1.22, atk: 1.10, reward: 1.15 };
  if (n === 5) return { hp: 1.12, atk: 1.05, reward: 1.08 };
  if (n === 4) return { hp: 1.05, atk: 1, reward: 1.03 };
  return { hp: 1, atk: 1, reward: 1 };
}
const monKind = (id        ) => ensureKindTex(graftKind(kindById(id) ?? MONSTERS[0]));
const allKinds = () => [...MONSTERS.filter((m) => !m.legend), ...S.customs.map((d) => deriveKind(d))];
const eliteOpen = (k                       ) => S.raidNo >= (k.eliteMin ?? 1) || S.overtime;
const instById = (uid               ) => (uid == null ? undefined : S.monsters.find((m) => m.uid === uid));
// 一只具体怪物的最终形态 = 基础种类 + 它自己的改造件
const instKind = (inst             ) => ensureKindTex(graftKind(monKind(inst.kind), inst.graft));

// Reusable portrait feedback: max level uses an animated pixel bloom instead of
// a badge; selection uses one restrained hop followed by a tiny idle hover.
const uiPortraitFx = [];
const battlePortraitFx = [];
let portraitFxClock = 0;

function portraitEffect(s, maxed = false, selected = false, seed = 0, registry = uiPortraitFx) {
  if (!s || (!maxed && !selected)) return s;
  const node = new PIXI.Container();
  node.x = s.x; node.y = s.y;
  s.x = 0; s.y = 0;
  const h = Math.max(12, s.height);
  const w = Math.max(10, Math.abs(s.width));
  let aura = null, glow = null;
  const motes = [];
  if (maxed) {
    aura = new PIXI.Graphics();
    aura.ellipse(0, 0, Math.max(7, w * 0.47), Math.max(2, h * 0.09))
      .fill({ color: C.gold, alpha: 0.18 })
      .stroke({ width: 1, color: C.gold, alpha: 0.72 });
    aura.blendMode = 'add';
    node.addChild(aura);
    glow = new PIXI.Sprite(s.texture);
    glow.anchor.set(s.anchor.x, s.anchor.y);
    glow.scale.set(s.scale.x * 1.09, s.scale.y * 1.09);
    glow.tint = C.gold;
    glow.alpha = 0.16;
    glow.roundPixels = true;
    glow.blendMode = 'add';
    node.addChild(glow);
  }
  node.addChild(s);
  if (maxed) {
    for (let i = 0; i < 3; i++) {
      const mote = new PIXI.Graphics();
      const px = i === 1 ? 2 : 1;
      mote.rect(0, 0, px, px).fill(i === 1 ? 0xfff1a8 : C.gold);
      mote.blendMode = 'add';
      node.addChild(mote);
      motes.push({ node: mote, phase: i / 3, baseX: (i - 1) * w * 0.28 });
    }
  }
  const rec = {
    node, sprite: s, aura, glow, motes, maxed, selected, seed: (Number(seed) || 0) * 0.017,
    age: 0, baseY: node.y, h, glowSX: glow?.scale.x ?? 1, glowSY: glow?.scale.y ?? 1,
  };
  node.__portraitFx = rec;
  registry.push(rec);
  return node;
}

function updatePortraitEffect(rec, dt, time, moveNode = true) {
  if (!rec?.node || rec.node.destroyed) return;
  rec.age += dt;
  const t = time + rec.seed;
  if (rec.maxed) {
    const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;
    rec.aura.alpha = 0.42 + pulse * 0.34;
    rec.aura.scale.set(0.94 + pulse * 0.09, 0.88 + pulse * 0.08);
    rec.glow.alpha = 0.10 + pulse * 0.13;
    const bloom = 1 + pulse * 0.018;
    rec.glow.scale.set(rec.glowSX * bloom, rec.glowSY * bloom);
    for (const m of rec.motes) {
      const p = (t * 0.34 + m.phase) % 1;
      m.node.x = Math.round(m.baseX + Math.sin(t * 2.1 + m.phase * 9) * 2);
      m.node.y = Math.round(-4 - p * rec.h * 0.92);
      m.node.alpha = Math.sin(p * Math.PI) * 0.78;
    }
  }
  if (moveNode && rec.selected) {
    const hop = rec.age < 0.42 ? -Math.sin((rec.age / 0.42) * Math.PI) * 3 : 0;
    const hover = rec.age >= 0.42 ? -0.5 + Math.sin(t * 3.1) * 0.5 : 0;
    rec.node.y = Math.round(rec.baseY + hop + hover);
  }
}

function tickUiPortraitEffects(dt) {
  portraitFxClock += dt;
  for (let i = uiPortraitFx.length - 1; i >= 0; i--) {
    const rec = uiPortraitFx[i];
    if (!rec.node || rec.node.destroyed) uiPortraitFx.splice(i, 1);
    else updatePortraitEffect(rec, dt, portraitFxClock, true);
  }
}
                                                     
const SLOT_NAME                          = { leader: '统领', front: '前排', back: '后排', flank: '侧翼' };
function roomOf(uid        ) {
  for (let i = 0; i < S.rooms.length; i++) {
    const r = S.rooms[i];
    // 怪物与英雄使用独立 uid 计数器；这里不能把 leader uid 当作怪物驻守判断。
    if (r.front === uid || r.back === uid || r.flank === uid) return i;
  }
  return -1;
}
// 传奇统领按袭击轮次逐个开放，避免第一轮就能砸出满编统领
const champById = (uid                           ) => (uid == null ? undefined : S.champs.find((c) => c.uid === uid));
const champKind = (c       ) => ensureKindTex(graftKind(monKind(c.race), c.graft));
const chemMap = () => chemistry(S.champs, seatedChampUids()).map;
const statOf = (c       , chem = chemMap()) => {
  champKind(c);
  return champStats(c, POT_MULT[S.champPot[c.uid] ?? 0], chemOf(chem, c.uid));
};
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
  const pool = ['knight', 'archer', 'cleric', 'mage', 'rogue', 'paladin', 'berserker', 'ranger', 'bard', 'alchemist', 'monk', 'lancer', 'warlock'];
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
let heroView                             = 'stat';   // 名册右侧详情的五个视图
let champTitleExpand                     = '';         // 详情页当前展开的称号 id
let gearSlotSel           = 'crown';                 // 装备页当前编辑的槽
let talentPreview = null;                            // 专精页预览；确认前不写存档
let detailPopup = null;                              // 统一长说明弹层
let relicForgeConfirm = false;                       // 英雄遗物熔铸二次确认
let monDetailMode = false;                             // 已招募魔物卡片默认/详情切换
let lastSelInstUid        = null;                      // 用于切换魔物实例时重置详情模式
let reportIdx = 0;
let battle                = null;
let speed = 1;
let paused = false;
let toast = { text: '', t: 0 };
let endingT = 0;
let pendingResultRaid = 0;

function say(text        ) { toast = { text, t: 2.2 }; }

function openDetailPopup(title, body, color = C.gold) {
  detailPopup = { title: String(title), body: String(body), color };
  pageState['detail-popup'] = 0;
  playSfx('tab');
  render();
}
function closeDetailPopup() {
  detailPopup = null;
  playSfx('tab');
  render();
}

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
const portraitLayer = new PIXI.Container();
const portraitGfx = new PIXI.Graphics();
const portraitHits = new Hits();
const hits = new Hits();
let viewScale = 1;
let smallScreen = false;
let renderResolution = 1;
let portraitContentBottom = 0;
let portraitChromeKey = '';
let portraitLayoutInfo = null;

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

async function boot() {
  const host = document.getElementById('app') ;
  renderResolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  await app.init({ background: C.bg, resizeTo: host, resolution: renderResolution, autoDensity: true, antialias: false, roundPixels: true });
  host.appendChild(app.canvas);
  app.canvas.style.imageRendering = 'pixelated';
  app.canvas.setAttribute('aria-label', '夜曲地牢游戏画面');

  const totalTasks = 1 + TEXTURES.length;
  let doneTasks = 0;

  try {
    const f = new FontFace(FONT, `url('assets/lib/fusion-pixel/FusionPixel-12px-zh_hans.woff2')`);
    await f.load();
    document.fonts.add(f);
  } catch { /* 字体缺失时退回系统字体 */ }
  doneTasks += 1;
  setLoading((doneTasks / totalTasks) * 100);

  // 专属部件显著增加后采用有限并发加载，避免 191 个小 PNG 串行请求拖长冷启动。
  const LOAD_BATCH = 16;
  for (let i = 0; i < TEXTURES.length; i += LOAD_BATCH) {
    await Promise.all(TEXTURES.slice(i, i + LOAD_BATCH).map(async (name) => {
      try {
        const t = await PIXI.Assets.load(`assets/${name}.png`);
        t.source.scaleMode = 'nearest';
        TEX[name] = t;
      } catch { /* 缺图用白块占位，不阻断 */ }
      doneTasks += 1;
      setLoading((doneTasks / totalTasks) * 100);
    }));
  }

  hideLoading();

  app.stage.addChild(backdrop, root, portraitLayer);
  root.addChild(battleLayer, uiLayer, modalLayer, overlay);
  uiLayer.addChild(uiGfx);
  modalLayer.addChild(modalGfx);
  portraitLayer.addChild(portraitGfx);

  loadSave();
  restoreBackend();
  setProvider(hybridProvider);
  setMuted(S.muted);
  initAudio();
  buildBackdrop();
  for (const d of S.customs) buildCustomTex(d);
  layout();
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('orientationchange', scheduleLayout);
  window.visualViewport?.addEventListener('resize', scheduleLayout);
  window.visualViewport?.addEventListener('scroll', scheduleLayout);
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

function partsLayout(parts) {
  const ps = ['legs', 'core', 'arm', 'head'].map((cat) => partById(parts[cat])).filter(Boolean);
  const native = ps.some((p) => p.nativePart);
  return { native, grid: native ? Math.max(32, ...ps.map((p) => p.nativeSize ?? 0)) : CST_GRID };
}

function buildPartsTex(key, parts) {
  const cont = new PIXI.Container();
  const layout = partsLayout(parts);
  // 传统专属件已经按怪物原朝向保存在完整画布上；通用件仍是朝右的小块，混搭时单件翻转并居中。
  const body = layout.native ? cont : new PIXI.Container();
  if (!layout.native) {
    body.scale.x = -1;
    body.x = CST_GRID;
    cont.addChild(body);
  }
  const order            = ['legs', 'core', 'arm', 'head'];
  const INV = 1 / 8;
  for (const cat of order) {
    const p = partById(parts[cat]);
    if (!p) continue;
    const tex = TEX[p.tex];
    if (!tex) continue;
    const s = new PIXI.Sprite(tex);
    if (layout.native && p.nativePart) {
      const size = p.nativeSize ?? 32;
      s.scale.set(INV);
      s.x = (layout.grid - size) / 2;
      s.y = (layout.grid - size) / 2;
    } else if (layout.native) {
      const off = (layout.grid - CST_GRID) / 2;
      s.scale.set(-INV, INV);
      s.x = off + CST_GRID - PART_SLOT[cat].x;
      s.y = off + PART_SLOT[cat].y;
    } else {
      s.scale.set(INV);
      s.x = PART_SLOT[cat].x;
      s.y = PART_SLOT[cat].y;
    }
    body.addChild(s);
  }
  const frame = new PIXI.Graphics();
  frame.rect(0, 0, layout.grid, layout.grid).fill({ color: 0x000000, alpha: 0 });
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

function buildCustomTex(d           ) {
  buildPartsTex(`tex-${d.id}`, d.parts);
}

function ensureKindTex(k) {
  if (k?.parts && !TEX[k.tex]) buildPartsTex(k.tex, k.parts);
  return k;
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
  const host = document.getElementById('app');
  const hostW = Math.max(1, host?.clientWidth ?? app.screen.width);
  const hostH = Math.max(1, host?.clientHeight ?? app.screen.height);
  if (Math.abs(app.screen.width - hostW) > 0.5 || Math.abs(app.screen.height - hostH) > 0.5) {
    app.renderer.resize(hostW, hostH);
  }
  const w = app.screen.width, h = app.screen.height;
  portrait = h > w * 1.15;
  viewScale = portrait
    ? Math.max(0.1, Math.min((w - 8) / VIEW_W, (h * 0.44) / VIEW_H))
    : Math.max(0.1, Math.min(w / VIEW_W, h / VIEW_H));
  smallScreen = w < 720 || h < 420 || viewScale < 1;
  const snap = (v) => Math.round(v * renderResolution) / renderResolution;
  root.scale.set(viewScale);
  root.x = snap((w - VIEW_W * viewScale) / 2);
  root.y = portrait ? snap(4) : snap((h - VIEW_H * viewScale) / 2);
  portraitContentBottom = root.y + VIEW_H * viewScale;
  setTextRes(Math.min(4, Math.max(1, Math.ceil(viewScale))));
  if (bdTile) { bdTile.width = w; bdTile.height = h; }
  bdFrame.clear();
  bdFrame.rect(root.x - 2, root.y - 2, VIEW_W * viewScale + 4, VIEW_H * viewScale + 4).stroke({ width: 2, color: C.ink, alignment: 0 });
  portraitChromeKey = '';
  positionNameInput();
  positionForgeInput();
  positionStoryInput();
  render();
  drawRotateHint();
}
let portrait = false;
let layoutQueued = false;

function scheduleLayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => { layoutQueued = false; layout(); });
}

async function requestLandscapeMode() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  } catch { /* iOS Safari may not expose page fullscreen. */ }
  try {
    if (window.screen.orientation?.lock) await window.screen.orientation.lock('landscape');
  } catch { /* Orientation lock is permission/platform dependent. */ }
}

function unlockAndPlay() {
  unlockAudio();
  // 启动时调的 playMusic 会因未解锁而空转，首次手势后必须补上
  playMusic(screen === 'battle' ? 'bgm-battle' : 'bgm-manage');
}

function bindInput() {
  const canvas = app.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAndPlay();
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (app.screen.width / rect.width);
    const sy = (e.clientY - rect.top) * (app.screen.height / rect.height);
    if (portrait && portraitHits.test(sx, sy, e.pointerType === 'touch' ? 8 : 0)) return;
    const x = (sx - root.x) / viewScale;
    const y = (sy - root.y) / viewScale;
    const touchPad = e.pointerType === 'touch' ? Math.min(10, Math.max(4, 8 / viewScale)) : 0;
    hits.test(x, y, touchPad);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
          } else if (smith.pick === 'temper') {
            const n = Math.max(1, Math.ceil(TEMPERS.length / 6));
            if (n > 1) turnPage('smith-temper', n, d2);
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
        if (relicForgeConfirm) { relicForgeConfirm = false; render(); return; }
        if (tab === 'story' && storyRun) { closeStory(); return; }
        sel = null; render(); return;
      }
    } else if (screen === 'battle') {
      if (e.key === ' ') { paused = !paused; return; }
      if (e.key.toLowerCase() === 's') { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; return; }
    } else if (screen === 'result') {
      if (e.key === 'Enter') { afterResult(); return; }
    } else if (screen === 'ending') {
      if (e.key === 'Enter') { enterOvertime(); return; }
    }
  });
}

function setTab(t     ) {
  pagerFocus = null;
  confirmNew = false;
  if (tab === t) { render(); return; }
  if (stitch) closeStitch();
  if (forge) closeForge();
  if (graft) closeGraft();
  relicForgeConfirm = false;
  tab = t;
  sel = null;
  playSfx('tab');
  render();
}

// ---------- 经营界面渲染 ----------
function clearUi() {
  uiPortraitFx.length = 0;
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
  portraitChromeKey = '';
  if (nameInput) nameInput.style.display = screen === 'manage' && (stitch || smith) && !detailPopup ? 'block' : 'none';
  if (forgeInput) forgeInput.style.display = screen === 'manage' && forge && forge.tab !== 'book' && !detailPopup ? 'block' : 'none';
  const modalOpen = screen === 'manage' && (!!stitch || !!forge || !!graft || !!smith);
  modalLayer.visible = modalOpen || !!detailPopup;
  if (screen !== 'manage') { uiLayer.visible = false; if (storyInput) storyInput.style.display = 'none'; ensurePortraitChrome(); return; }
  uiLayer.visible = true;
  clearUi();
  resetBoundedTextAudit();
  livePagers = [];
  const g = uiGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  // 详情弹层独占画面，避免背后页面或其他模态的文字透过遮罩，与正文叠在一起。
  if (detailPopup) {
    drawDetailPopup();
    syncStoryInput();
    ensurePortraitChrome();
    return;
  }
  // 模态期间不画背后页面：0.88 遮罩压不住 12px 点阵字，两层文字会互相糊成一片
  if (modalOpen) {
    if (stitch) drawStitch();
    else if (graft) drawGraft();
    else if (smith) drawSmith();
    else drawForge();
    syncStoryInput();
    ensurePortraitChrome();
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
  ensurePortraitChrome();
}

function drawDetailPopup() {
  const d = detailPopup;
  if (!d) return;
  const g = modalGfx;
  // 最后注册遮罩热区，Hits 从后向前命中，因此不会点穿到背后页面。
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => closeDetailPopup());
  panelF(g, modalLayer, 'scroll', 96, 48, 288, 170, C.wall);
  hits.add(96, 48, 288, 170, () => { /* 弹层内部不点穿，也不误关闭 */ });
  label(modalLayer, d.title, 110, 60, 12, d.color);
  const pages = paginateText(d.body, 260, 88, 12);
  const page = paged('detail-popup', pages, 1);
  boundedText(modalLayer, page.view[0] ?? '', 110, 82, 260, 88, 12, C.bone);
  pager(g, 'detail-popup', page.pages, 110, 190, 96, '', modalLayer);
  button(g, modalLayer, hits, 310, 192, 60, 18, '关闭', () => closeDetailPopup(),
    { size: 12, border: C.gold, color: C.white });
}

// ---------- 改造台（模态）：给已有单位移植部件 ----------
// 与缝合工坊的区别：不造新怪，改的是"这一只"，保留它的等级与经验。
;                                                           
let graft               = null;

function openGraft(uid        , target = 'monster') {
  const inst = target === 'hero' ? champById(uid) : instById(uid);
  if (!inst) return;
  graft = { uid, target, cat: 'core', picks: [...(inst.graft ?? [])], preview: null };
  stitch = null;
  forge = null;
  smith = null;
  playSfx('tab');
  render();
}
function closeGraft() { graft = null; playSfx('tab'); render(); }

function previewGraftPart(id        ) {
  const gf = graft ;
  gf.preview = id;
  playSfx('tab');
  render();
}

function togglePick(id        ) {
  const gf = graft ;
  const i = gf.picks.indexOf(id);
  if (i >= 0) { gf.picks.splice(i, 1); playSfx('tab'); render(); return; }
  // 同部位只能移植一件：换掉同类的那件（否则派生结果里后者静默覆盖前者）
  const cat = partById(id)?.cat;
  const same = gf.picks.findIndex((x) => partById(x)?.cat === cat);
  if (same >= 0) gf.picks.splice(same, 1);
  const cap = gf.target === 'hero' ? 4 : GRAFT_CAP;
  if (gf.picks.length >= cap) { say(gf.target === 'hero' ? '英雄四个部位都已改造' : `一只怪最多移植 ${GRAFT_CAP} 件`); return; }
  gf.picks.push(id);
  playSfx('place');
  render();
}

function confirmGraft() {
  const gf = graft ;
  const hero = gf.target === 'hero';
  const inst = hero ? champById(gf.uid) : instById(gf.uid);
  if (!inst) { closeGraft(); return; }
  const mult = hero ? 2 : 1;
  const cur = inst.graft ?? [];
  const changed = cur.length !== gf.picks.length || cur.some((id) => !gf.picks.includes(id));
  const rawCost = graftCostOf(cur, gf.picks);
  const cost = { bone: rawCost.bone * mult, mana: rawCost.mana * mult };
  const pulled = cur.filter((id) => !gf.picks.includes(id)).length;
  const mana = cost.mana + pulled * GRAFT_PULL_MANA * mult;
  const quote = workshopQuote(cost.bone, mana);
  const relic = gf.picks.filter((id) => partById(id)?.legendary && !cur.includes(id)).length * mult;
  if (S.bone < quote.bone || S.mana < quote.mana || S.relic < relic) { say(relic && S.relic < relic ? '英雄遗物不足' : '资源不足'); return; }
  S.bone -= quote.bone;
  S.mana -= quote.mana;
  S.relic -= relic;
  consumeWorkshopCharge(quote);
  inst.graft = gf.picks.length ? [...gf.picks] : undefined;
  if (hero && changed && gf.picks.length) {
    const partNames = gf.picks.map((id) => partById(id)?.name).filter(Boolean).join('、');
    const graftScene = gf.picks.some((id) => partById(id)?.legendary) ? 'hero-graft-legendary' : gf.picks.length === 4 ? 'hero-graft-full' : 'hero-graft';
    queueStoryLead(`hero-graft:${inst.uid}:${gf.picks.slice().sort().join(',')}`, graftScene, '英雄秘闻', `${inst.name}醒来后的第一句话`,
      { ref: inst.uid, hero: inst.name, race: champKind(inst).name, parts: partNames, partCount: gf.picks.length });
  }
  // 站位可能被改造改变（比如装了蝠翼变后排）：站错位就先请下场
  const k = hero ? champKind(inst) : instKind(inst);
  const at = hero ? -1 : roomOf(inst.uid);
  if (!hero && at >= 0 && k.row !== 'any') {
    const r = S.rooms[at];
    if (r.front === inst.uid && k.row !== 'front') { r.front = null; say(`${k.name}改造后只能站后排，已撤下`); }
    if (r.back === inst.uid && k.row !== 'back') { r.back = null; say(`${k.name}改造后只能站前排，已撤下`); }
    if (r.flank === inst.uid && k.row === 'back') { r.flank = null; }
  }
  playSfx('buy');
  persist();
  say(gf.picks.length ? (hero ? `${inst.name} 全身改造完成` : `${k.name} 改造完成`) : '已摘除全部移植件');
  closeGraft();
}

function drawGraft() {
  const gf = graft ;
  const hero = gf.target === 'hero';
  const inst = hero ? champById(gf.uid) : instById(gf.uid);
  const g = modalGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  hits.add(0, 0, VIEW_W, VIEW_H, () => { /* 遮罩吃掉背后点击 */ });
  panelF(g, modalLayer, 'arcane', 12, 14, VIEW_W - 24, VIEW_H - 28, C.wall);
  labelC(modalLayer, hero ? '英雄改造 · 全身四部位（消耗×2）' : '改造台 · 移植部件', 240, 18, 12, C.white);
  button(g, modalLayer, hits, VIEW_W - 44, 16, 28, 16, '✕', () => closeGraft(), { size: 12, border: C.red, color: C.red });
  if (!inst) return;
  const base = monKind(hero ? inst.race : inst.kind);
  const now = graftKind(base, gf.picks.length ? gf.picks : undefined);
  const baseStat = hero ? statOf({ ...inst, graft: undefined }) : base;
  const nowStat = hero ? statOf({ ...inst, graft: gf.picks.length ? [...gf.picks] : undefined }) : now;

  // 左上：部位页签
  CATS.forEach((c, i) => {
    const on = gf.cat === c.cat;
    const x = 20 + i * 44;
    g.rect(x, 34, 42, 18).fill(on ? C.purpleDark : C.ink).stroke({ width: 1, color: on ? C.purple : C.stoneLit, alignment: 0 });
    labelC(modalLayer, c.name, x + 21, 37, 12, on ? C.white : C.bone);
    hits.add(x, 34, 42, 18, () => { gf.cat = c.cat; gf.preview = null; playSfx('tab'); render(); });
  });

  // 部件列表（两列，与缝合工坊同一套翻页）
  const all = PARTS.filter((p) => p.cat === gf.cat);
  const pp = paged(`graft-${gf.cat}`, all, 16);
  pp.view.forEach((p, i) => {
    const cx = 20 + Math.floor(i / 8) * 88;
    const y = 56 + (i % 8) * 16;
    const open = partOpen(p);
    const on = gf.picks.includes(p.id);
    const preview = gf.preview === p.id;
    g.rect(cx, y, 84, 14).fill(on ? C.wallLit : preview ? C.purpleDark : C.ink)
      .stroke({ width: 1, color: preview ? C.gold : on ? C.purple : p.diy ? C.purpleDark : open ? C.stoneLit : C.wall, alignment: 0 });
    if (open && TEX[p.tex]) modalLayer.addChild(sprite(p.tex, cx + 8, y + 13, 12));
    label(modalLayer, cut(p.name, 3), cx + 16, y, 12, on ? C.white : p.diy ? C.purple : open ? C.bone : C.wallLit);
    label(modalLayer, open ? `${Math.round(p.bone * 1.2) * (hero ? 2 : 1)}` : `${p.unlockRaid}轮`, cx + 64, y, 12, open ? C.gold : C.wallLit);
    if (open) hits.add(cx, y, 84, 14, () => previewGraftPart(p.id));
  });
  pager(g, `graft-${gf.cat}`, pp.pages, 20, 186, 156, '部件 ', modalLayer);

  // 右：改造前后对照 —— 玩家要的就是"这一改值不值"
  panelF(g, modalLayer, 'inset', 200, 34, 268, 146, C.ink);
  label(modalLayer, cut(now.name, 8), 206, 38, 12, C.purple);
  label(modalLayer, `Lv${inst.lv}`, 206, 56, 12, C.stoneLit);
  const rows                             = [
    ['生命', baseStat.hp, nowStat.hp], ['攻击', baseStat.atk, nowStat.atk],
    ['防御', baseStat.def, nowStat.def],
  ];
  let ry = 54;
  for (const [nm, a, bv] of rows) {
    label(modalLayer, `${nm} ${a}`, 274, ry, 12, C.bone);
    label(modalLayer, bv === a ? '—' : `→ ${bv}`, 334, ry, 12, bv > a ? C.green : bv < a ? C.red : C.stoneLit);
    ry += 15;
  }
  label(modalLayer, `速度 ${baseStat.spd.toFixed(2)}`, 396, 54, 12, C.bone);
  label(modalLayer, nowStat.spd === baseStat.spd ? '—' : `→ ${nowStat.spd.toFixed(2)}`, 396, 69, 12, nowStat.spd > baseStat.spd ? C.green : C.red);
  label(modalLayer, `站位 ${now.row === 'front' ? '前排' : now.row === 'back' ? '后排' : '任意'}`, 396, 84, 12, now.row === base.row ? C.stoneLit : C.gold);
  const previewPart = partById(gf.preview ?? '');
  label(modalLayer, cut(`技能・${now.skill}`, 16), 206, 102, 12, C.purple);
  boundedText(modalLayer, now.skillDesc, 206, 117, 254, 24, 11, C.stoneLit);
  if (previewPart) {
    label(modalLayer, `${previewPart.name}${gf.picks.includes(previewPart.id) ? '・已选用' : '・预览'}`, 206, 140, 11, C.gold);
    boundedText(modalLayer, previewPart.desc, 206, 153, 184, 24, 9, C.bone);
    button(g, modalLayer, hits, 396, 146, 64, 24, gf.picks.includes(previewPart.id) ? '取消选用' : '确认选用',
      () => togglePick(previewPart.id), { size: 10, fill: C.purpleDark, border: C.purple, color: C.white });
  } else {
    label(modalLayer, '先点部件名称预览效果，再确认选用', 206, 151, 11, C.stoneLit);
  }

  // 底部：花费与确认
  const cur = inst.graft ?? [];
  const mult = hero ? 2 : 1;
  const rawCost = graftCostOf(cur, gf.picks);
  const cost = { bone: rawCost.bone * mult, mana: rawCost.mana * mult };
  const pulled = cur.filter((id) => !gf.picks.includes(id)).length;
  const mana = cost.mana + pulled * GRAFT_PULL_MANA * mult;
  const quote = workshopQuote(cost.bone, mana);
  const relic = gf.picks.filter((id) => partById(id)?.legendary && !cur.includes(id)).length * mult;
  const can = (cost.bone > 0 || mana > 0 || relic > 0) && S.bone >= quote.bone && S.mana >= quote.mana && S.relic >= relic;
  const discountText = quote.discount ? `・工坊-${Math.round(quote.discount * 100)}%` : '';
  label(modalLayer, `移植 ${quote.bone}骨 + ${quote.mana}魔${relic ? ` + ${relic}遗物` : ''}${discountText}`, 20, 206, 12, can ? C.gold : C.red);
  label(modalLayer, hero ? `全身 4 部位・每件 ${GRAFT_MANA * 2} 魔・摘除 ${GRAFT_PULL_MANA * 2} 魔・遗物同样×2` : `最多 ${GRAFT_CAP} 件・每件 ${GRAFT_MANA} 魔・摘除 ${GRAFT_PULL_MANA} 魔`, 20, 222, 12, C.stoneLit);
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
  el.style.cssText = 'position:fixed;z-index:9;box-sizing:border-box;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;text-align:center;padding:0;touch-action:manipulation;user-select:text;-webkit-user-select:text;';
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

function positionDomInput(el, box) {
  if (!el) return;
  const rect = app.canvas.getBoundingClientRect();
  const sx = rect.width / app.screen.width;
  const sy = rect.height / app.screen.height;
  const rawX = rect.left + (root.x + box.x * viewScale) * sx;
  const rawY = rect.top + (root.y + box.y * viewScale) * sy;
  const rawW = box.w * viewScale * sx;
  const rawH = box.h * viewScale * sy;
  const cssH = Math.max(smallScreen ? 22 : 18, Math.round(rawH));
  const cssW = Math.min(Math.round(rawW), Math.max(40, rect.right - rawX - 2));
  el.style.left = `${Math.round(Math.max(rect.left, Math.min(rawX, rect.right - cssW)))}px`;
  el.style.top = `${Math.round(Math.max(rect.top, Math.min(rawY - (cssH - rawH) / 2, rect.bottom - cssH)))}px`;
  el.style.width = `${cssW}px`;
  el.style.height = `${cssH}px`;
  // 16 CSS px prevents Safari from zooming the whole page when the keyboard opens.
  el.style.fontSize = `${smallScreen ? 16 : Math.max(12, Math.round(11 * viewScale * sy))}px`;
}

function positionNameInput() {
  if (!nameInput) return;
  const box = smith ? SMITH_NAME : STITCH_NAME;
  positionDomInput(nameInput, box);
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
  pageState['smith-temper'] = 0;
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
  const quote = workshopQuote(payBone, payMana);
  if (!old && S.forged.length >= FORGED_CAP) { say(`自制装备已满（${FORGED_CAP}），先熔掉一张图纸`); return; }
  if (S.bone < quote.bone) { say('骨币不足'); return; }
  if (S.mana < quote.mana) { say('魔质不足'); return; }
  if (!old && S.vault.length >= GEAR_CAP) { say('仓库已满，先熔掉一件'); return; }
  S.bone -= quote.bone;
  S.mana -= quote.mana;
  consumeWorkshopCharge(quote);
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
  label(modalLayer, ['白', '蓝', '金', '红'][k.rank] + '档', 338, 80, 12, RANK_COL[k.rank]);
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
  // 机制文案限制在两行以内，避免压到造价行
  const mech = sm.plan.runes.map((id) => runeById(id)?.desc ?? '').filter(Boolean).join('；') || '没刻铭文：纯数值件';
  boundedText(modalLayer, mech, 303, 158, 148, 30, 12, C.stoneLit);

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
  const quote = workshopQuote(payBone, payMana);
  const full = !old && (S.forged.length >= FORGED_CAP || S.vault.length >= GEAR_CAP);
  const can = !planValid(sm.plan) && S.bone >= quote.bone && S.mana >= quote.mana && !full;
  const quoteText = `${old ? '改锻' : '造价'} ${quote.bone}骨+${quote.mana}魔${quote.discount ? ` -${Math.round(quote.discount * 100)}%` : ''}`;
  label(modalLayer, cut(quoteText, 18), 22, 196, 12, can ? C.gold : C.red);
  const note = full ? (S.forged.length >= FORGED_CAP ? `图纸已满（${FORGED_CAP}）` : '仓库已满')
    : S.bone < quote.bone ? '骨币不足' : S.mana < quote.mana ? '魔质不足' : `自制 ${S.forged.length}/${FORGED_CAP}`;
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
    g.rect(x, y, 130, 16).fill(on ? C.wallLit : C.wall).stroke({ width: 1, color: on ? C.gold : RANK_COL[f.rank], alignment: 0 });
    label(modalLayer, cut(f.name, 3), x + 3, y + 1, 12, on ? C.white : C.bone);
    label(modalLayer, GEAR_SLOTS.find((s2) => s2.id === f.slot) .name, x + 42, y + 1, 12, C.steel);
    label(modalLayer, `${f.slots}文`, x + 56, y + 1, 12, C.purple);
    label(modalLayer, `${f.bone}/${f.mana}`, x + 84, y + 1, 12, C.gold);
    hits.add(x, y, 128, 16, () => smithSetFrame(f.id));
  });
  pager(g, 'smith-frame', fp.pages, 216, 154, 68, '', modalLayer);
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
  pager(g, 'smith-rune', pp.pages, 216, 154, 68, '', modalLayer);
  const picked = sm.plan.runes.map(runeById).filter(Boolean)                                    ;
  label(modalLayer, picked.length ? cut(`已刻 ${picked.map((r) => r.name).join('・')}`, 9) : '还没刻铭文（可只用胚体）',
    24, 154, 12, picked.length ? C.purple : C.wall);
  // 选中铭文的长说明单独一行（列表里只放短标签）
  if (picked.length) label(modalLayer, cut(picked.map((r) => r.desc).join('；'), 21), 26, 172, 12, C.stoneLit);
}

function drawSmithTempers(g               ) {
  const sm = smith ;
  label(modalLayer, '淬火给整件一条偏向，多半带代价', 27, 60, 12, C.stoneLit);
  const pp = paged('smith-temper', TEMPERS, 6);
  pp.view.forEach((t, i) => {
    const y = 78 + i * 17;
    const on = sm.plan.temper === t.id;
    g.rect(24, y, 260, 16).fill(on ? C.purpleDark : C.wall).stroke({ width: 1, color: on ? C.purple : C.ink, alignment: 0 });
    label(modalLayer, t.name, 27, y + 1, 12, on ? C.white : C.bone);
    label(modalLayer, cut(t.desc, 14), 66, y + 1, 12, on ? C.bone : C.stoneLit);
    label(modalLayer, t.mana ? `${t.mana}魔` : '免费', 250, y + 1, 12, on ? C.gold : C.stoneLit);
    hits.add(24, y, 260, 16, () => smithSetTemper(t.id));
  });
  pager(g, 'smith-temper', pp.pages, 120, 174, 68, '', modalLayer);
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
  el.style.cssText = 'position:fixed;z-index:9;box-sizing:border-box;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;padding:0 4px;touch-action:manipulation;user-select:text;-webkit-user-select:text;';
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
  positionDomInput(forgeInput, FORGE_INPUT);
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
  if (S.monsters.some((m) => (m.graft ?? []).includes(id)) || S.champs.some((c) => (c.graft ?? []).includes(id))) { say('有单位身上改造着它'); return; }
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
  pager(g, `stitch-af-${st.cat}`, ap.pages, 302, 214, 82, '', modalLayer);

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
  boundedText(modalLayer, k.skillDesc, 308, 83, 156, 28, 12, C.stoneLit);
  const afs = selectedAffixes(st.affixes);
  const affixSummary = afs.map((a) => `${a.name}：${a.desc}`).join('；');
  label(modalLayer, afs.length ? `词缀 ${afs.map((a) => a.name).join('・')}` : '满级被动', 308, 116, 12, C.gold);
  const stitchDesc = boundedText(modalLayer, afs.length ? affixSummary : k.passive, 308, 131, 118, 28, 10, C.stoneLit);
  if (afs.length) {
    button(g, modalLayer, hits, 430, 131, 34, 24, '详情', () => openDetailPopup('已选怪物词缀', affixSummary, C.purple),
      { size: 10, fill: C.ink, border: stitchDesc.truncated ? C.gold : C.purple, color: C.white });
    hits.add(308, 131, 118, 28, () => openDetailPopup('已选怪物词缀', affixSummary, C.purple));
  } else if (stitchDesc.truncated) {
    hits.add(308, 131, 156, 28, () => openDetailPopup('怪物满级被动', k.passive, C.gold));
  }

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
  const relicCost = st.editUid != null ? Math.max(0, legendaryPartCount(st.parts) - legendaryPartCount(editBaseParts ?? st.parts)) : legendaryPartCount(st.parts);
  const can = S.bone >= payBone && S.mana >= manaCost && S.relic >= relicCost && !capFull && !slotFull;
  label(modalLayer, `${st.editUid != null ? `重组 ${payBone}` : `造价 ${cost}`}骨+${manaCost}魔${relicCost ? `+${relicCost}遗物` : ''}`, 200, 168, 12, can ? C.gold : C.red);
  let note = '';
  if (capFull) note = `图纸已满（${CUSTOM_CAP}）`;
  else if (slotFull) note = '怪物栅已满（10）';
  else if (S.bone < payBone) note = '骨币不足';
  else if (S.mana < manaCost) note = '魔质不足';
  else if (S.relic < relicCost) note = '英雄遗物不足';
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
        + S.monsters.filter((m) => (m.graft ?? []).includes(d.id)).length
        + S.champs.filter((c) => (c.graft ?? []).includes(d.id)).length;
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
  pager(g, 'book', bp.pages, 366, 214, 90, '', modalLayer);
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
  boundedText(modalLayer, d.desc, 66, 140, 176, 44, 12, C.bone);
  label(modalLayer, `生命 ${d.stats.hp}`, 256, 88, 12, C.green);
  label(modalLayer, `攻击 ${d.stats.atk}`, 350, 88, 12, C.red);
  label(modalLayer, `防御 ${d.stats.def}`, 256, 104, 12, C.steel);
  label(modalLayer, `攻速 ${d.stats.spd >= 0 ? '+' : ''}${d.stats.spd}`, 350, 104, 12, C.gold);
  const ps = d.powers.map(powerById).filter(Boolean)                                                  ;
  const pts = ps.reduce((n, x) => n + x.cost, 0);
  label(modalLayer, ps.length ? cut(`能力 ${ps.map((x) => x.name).join('・')}（${pts}/${PART_BUDGET.power}分）`, 20) : '无特殊能力', 256, 120, 12, C.purple);
  boundedText(modalLayer, ps.map((x) => x.desc).join('；') || '只是块料子。', 256, 140, 196, 44, 12, C.stoneLit);
}

function drawAffixDraft(d               ) {
  label(modalLayer, cut(d.name, 6), 30, 88, 12, C.white);
  label(modalLayer, `「${d.word}」字・刻在${CATS.find((c) => c.cat === forge .cat) .name}`, 30, 104, 12, C.stoneLit);
  boundedText(modalLayer, d.desc, 30, 124, 196, 58, 12, C.bone);
  const ps = d.powers.map(affixPowerById).filter(Boolean)                                                  ;
  const pts = ps.reduce((n, x) => n + x.cost, 0);
  label(modalLayer, cut(`效果 ${ps.map((x) => x.name).join('・')}（${pts}/${AFFIX_BUDGET.power}分）`, 22), 240, 88, 12, C.purple);
  let y = 106;
  for (const x of ps) { boundedText(modalLayer, `· ${x.desc}`, 240, y, 210, 26, 12, C.stoneLit); y += 30; }
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
  pager(g, 'forge-look', pp.pages, 372, 240, 88, '', modalLayer);
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
  pager(g, 'forge-power', pp.pages, 372, 240, 88, '', modalLayer);
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
  const layout = partsLayout(st.parts);
  const unit = layout.native ? (CST_GRID * cell) / layout.grid : cell;
  const body = new PIXI.Container();
  body.x = Math.round(left);
  body.y = Math.round(top);
  if (!layout.native) { body.scale.x = -1; body.x += Math.round(CST_GRID * cell); }
  modalLayer.addChild(body);
  const order            = ['legs', 'core', 'arm', 'head'];
  for (const cat of order) {
    const p = partById(st.parts[cat]);
    if (!p) continue;
    const tex = TEX[p.tex];
    if (!tex) continue;
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0, 0);
    if (layout.native && p.nativePart) {
      const size = p.nativeSize ?? 32;
      s.scale.set(unit / 8);
      s.x = Math.round((layout.grid - size) * unit / 2);
      s.y = Math.round((layout.grid - size) * unit / 2);
    } else if (layout.native) {
      const off = (layout.grid - CST_GRID) * unit / 2;
      s.scale.set(-unit / 8, unit / 8);
      s.x = Math.round(off + (CST_GRID - PART_SLOT[cat].x) * unit);
      s.y = Math.round(off + PART_SLOT[cat].y * unit);
    } else {
      s.scale.set(cell / 8);
      s.x = Math.round(PART_SLOT[cat].x * cell);
      s.y = Math.round(PART_SLOT[cat].y * cell);
    }
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
  const relicCost = st.editUid != null
    ? Math.max(0, legendaryPartCount(st.parts) - legendaryPartCount(editBaseParts ?? st.parts))
    : legendaryPartCount(st.parts);
  if (S.bone < payBone || S.mana < manaCost || S.relic < relicCost) { say(relicCost && S.relic < relicCost ? '英雄遗物不足' : '资源不足'); return; }
  const name = (st.name || autoName(st.parts, Date.now(), st.affixes)).slice(0, 8);
  if (st.editUid != null) {
    const inst = instById(st.editUid);
    const def = inst && S.customs.find((d) => d.id === inst.kind);
    if (!def) { closeStitch(); return; }
    S.bone -= payBone;
    S.mana -= manaCost;
    S.relic -= relicCost;
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
  S.relic -= relicCost;
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
  for (let i = 0; i < S.rooms.length; i++) {
    if (S.rooms[i].front === uid) S.rooms[i].front = null;
    if (S.rooms[i].back === uid) S.rooms[i].back = null;
    if (S.rooms[i].flank === uid) S.rooms[i].flank = null;
    if (S.floors[i].utility.workerUid === uid) S.floors[i].utility.workerUid = null;
    S.floors[i].utility.trainTargets = S.floors[i].utility.trainTargets.filter((x) => !(x.type === 'monster' && x.uid === uid));
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

function addTestResources() {
  S.bone += 1000; S.mana += 1000; playSfx('buy'); persist(); say('测试：骨币与魔质各 +1000'); render();
}

function toggleMute() {
  S.muted = !S.muted; setMuted(S.muted); persist(); render();
}

function requestNewGame() {
  if (confirmNew) {
    S = freshSave(); syncCustoms(); persist(); confirmNew = false; sel = null; say('已开启新档'); render();
  } else {
    confirmNew = true; say('再点一次“新档”确认清空存档'); render();
  }
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
  if (saveFlash > 0) label(uiLayer, '已保存', 266, 12, 10, C.green);
  // 测试按钮：一键补资源，方便试各种阵容
  button(g, uiLayer, hits, 306, 6, 36, 22, '+1000', addTestResources, { size: 11, fill: C.greenDark, border: C.green, color: C.white });
  button(g, uiLayer, hits, 344, 6, 30, 22, '导出', exportSave, { size: 10 });
  button(g, uiLayer, hits, 376, 6, 30, 22, '导入', importSave, { size: 10 });
  button(g, uiLayer, hits, 408, 6, 30, 22, S.muted ? '静音' : '音量', toggleMute, { size: 10 });
  button(g, uiLayer, hits, 440, 6, 36, 22, '新档', requestNewGame,
    { size: 12, border: confirmNew ? C.red : C.bone, color: confirmNew ? C.red : C.bone });
}
let confirmNew = false;

function ensurePortraitChrome() {
  const key = [portrait, screen, tab, paused, speed, confirmNew, S.bone, S.mana, S.raidNo, S.overtime, app.screen.width, app.screen.height].join('|');
  if (key === portraitChromeKey) return;
  portraitChromeKey = key;
  portraitHits.clear();
  const kids = portraitLayer.removeChildren();
  for (const kid of kids) if (kid !== portraitGfx) kid.destroy({ children: true });
  portraitLayer.addChild(portraitGfx);
  portraitGfx.clear();
  portraitLayer.visible = portrait;
  portraitLayoutInfo = null;
  if (!portrait) return;

  const w = app.screen.width, h = app.screen.height;
  const top = Math.min(h - 300, Math.ceil(portraitContentBottom + 6));
  portraitGfx.rect(0, top, w, h - top).fill(C.bg).stroke({ width: 2, color: C.wallLit, alignment: 0 });
  panelF(portraitGfx, portraitLayer, 'stone', 6, top + 6, w - 12, 38, C.wall);
  const raid = currentRaid();
  label(portraitLayer, `骨 ${S.bone}　魔 ${S.mana}`, 16, top + 15, 14, C.gold);
  label(portraitLayer, S.overtime ? `加班 ${raid.no - 12}` : `袭击 ${S.raidNo}/12`, w - 94, top + 15, 14, C.bone);

  const gap = 5, margin = 8, cols = 4;
  const bw = Math.floor((w - margin * 2 - gap * (cols - 1)) / cols);
  const tabTop = top + 50;
  TABS.forEach((item, i) => {
    const x = margin + (i % cols) * (bw + gap);
    const y = tabTop + Math.floor(i / cols) * 43;
    button(portraitGfx, portraitLayer, portraitHits, x, y, bw, 38, item.name, () => setTab(item.id), {
      size: 14, enabled: screen === 'manage', fill: tab === item.id ? C.wallLit : C.wall,
      border: tab === item.id ? C.gold : C.stoneLit, color: tab === item.id ? C.white : C.bone,
    });
  });

  const primaryY = tabTop + 91;
  const primaryLabel = screen === 'manage' ? '迎　战' : screen === 'battle' ? (paused ? '继续战斗' : '暂停战斗') : screen === 'result' ? '继续结算' : '进入加班勇者';
  const primaryAction = screen === 'manage' ? startBattle : screen === 'battle'
    ? () => { paused = !paused; portraitChromeKey = ''; }
    : screen === 'result' ? afterResult : enterOvertime;
  button(portraitGfx, portraitLayer, portraitHits, margin, primaryY, w - margin * 2, 44, primaryLabel, primaryAction,
    { size: 17, fill: C.greenDark, border: C.green, color: C.white });

  const actionY = primaryY + 51;
  const aw = Math.floor((w - margin * 2 - gap * 2) / 3);
  button(portraitGfx, portraitLayer, portraitHits, margin, actionY, aw, 38, '导出', exportSave, { size: 14 });
  button(portraitGfx, portraitLayer, portraitHits, margin + aw + gap, actionY, aw, 38, screen === 'manage' ? '导入' : '导入锁定', importSave,
    { size: 13, enabled: screen === 'manage' });
  button(portraitGfx, portraitLayer, portraitHits, margin + (aw + gap) * 2, actionY, aw, 38, S.muted ? '开启声音' : '关闭声音', toggleMute, { size: 13 });

  const newY = actionY + 45;
  const canStartNew = screen === 'manage';
  button(portraitGfx, portraitLayer, portraitHits, margin, newY, w - margin * 2, 42,
    canStartNew ? (confirmNew ? '再次点按：清空并新建' : '开始新档') : '返回经营后可新建', requestNewGame,
    { size: 15, enabled: canStartNew, fill: confirmNew ? C.redDark : C.wall, border: confirmNew ? C.red : C.bone, color: confirmNew ? C.white : C.bone });
  labelC(portraitLayer, '竖屏控制区・横屏可获得完整战场视野', w / 2, Math.min(h - 20, newY + 50), 11, C.stoneLit);
  portraitLayoutInfo = { top, tabTop, primaryY, actionY, newY, margin, gap, buttonWidth: bw };
}

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
  const economy = dungeonEconomyPreview();
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
  const resting = seatedChampUids().filter((u) => (champById(u)?.restTurns || 0) > 0).length;
  const tired = seatedChampUids().filter((u) => { const c = champById(u); return c && fatigueTier(c.fatigue).bad; }).length;
  const hurt = S.champs.filter((c) => seatedChampUids().includes(c.uid) && (c.wounds || 0) > 0).length;
  const warnBits = [resting ? `${resting}名强制休息` : '', tired ? `${tired}名英雄乏力` : '', hurt ? `${hurt}名带伤` : ''].filter(Boolean);
  const warn = warnBits.join('、');
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
  labelC(uiLayer, placed === 0 ? '空防必败' : cut(`待产＋${economy.bone}骨＋${economy.mana}魔`, 14), 405, 163, 11, placed === 0 ? C.red : C.gold);
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

const ROOM_BOX = (i        ) => ({ x: 34, y: 70 + (i % 3) * 48, w: 182, h: 44 });

function pageDungeon(g               ) {
  const eco = dungeonEconomyPreview();
  label(uiLayer, `地牢 ${S.floors.length}层  预计＋${eco.bone}骨＋${eco.mana}魔`, 8, 40, 12, C.white);
  if (S.floors.length < MAX_FLOORS) {
    const cost = FLOOR_EXPAND[S.floors.length];
    button(g, uiLayer, hits, 236, 39, 90, 14, `扩层${cost.bone}骨${cost.mana ? `${cost.mana}魔` : ''}`, () => expandFloor(),
      { size: 10, enabled: S.bone >= cost.bone && S.mana >= cost.mana, border: C.goldDark, color: C.gold });
  } else label(uiLayer, '已达六层', 272, 40, 10, C.gold);
  const pf = paged('dungeon-floors', S.floors, 3);
  const selectedFloor = sel?.kind === 'utility' ? sel.floor : sel?.kind === 'slot' ? sel.room : null;
  if (selectedFloor != null && (selectedFloor < pf.from || selectedFloor >= pf.from + pf.view.length)) sel = null;
  // 地牢剖面：入口沿左侧竖井向下，战斗房在外侧，后勤房在更深的内侧。
  label(uiLayer, pf.from === 0 ? '入口门 ↓' : '继续深入 ↓', 8, 56, 10, C.gold);
  labelC(uiLayer, '外层防线', 124, 56, 9, C.red);
  labelC(uiLayer, '→ 内层经营区', 271, 56, 9, C.green);
  g.rect(19, 68, 3, 146).fill(C.leather);
  g.rect(18, 68, 5, 2).fill(C.goldDark);
  for (let local = 0; local < pf.view.length; local++) {
    const i = pf.from + local;
    const b = ROOM_BOX(i);
    const cfg = S.rooms[i];
    g.rect(20, b.y + 20, 14, 3).fill(C.leather);
    g.rect(16, b.y + 18, 8, 7).fill(C.wallLit).stroke({ width: 1, color: C.goldDark, alignment: 0 });
    labelC(uiLayer, `${i + 1}F`, 20, b.y + 4, 9, C.bone);
    panelF(g, uiLayer, 'stone', b.x, b.y, b.w, b.h, C.wall);
    g.rect(b.x + 1, b.y + 1, b.w - 2, 14).fill(C.wallLit);
    label(uiLayer, `${i + 1}层战斗房`, b.x + 5, b.y + 3, 10, C.white);
    const trapSelected = sel?.kind === 'slot' && sel.room === i && sel.which === 'trap';
    button(g, uiLayer, hits, b.x + 102, b.y + 2, 36, 12, cut(THEMES[cfg.theme].name, 3), () => {
      sel = { kind: 'slot', room: i, which: 'theme' }; playSfx('tab'); render();
    }, { size: 8, fill: C.ink, border: sel?.kind === 'slot' && sel.room === i && sel.which === 'theme' ? C.gold : C.wallLit, color: C.stoneLit });
    button(g, uiLayer, hits, b.x + 140, b.y + 2, 38, 12, cfg.trap === 'none' ? '陷阱' : cut(TRAPS[cfg.trap].name, 3), () => {
      sel = { kind: 'slot', room: i, which: 'trap' }; playSfx('tab'); render();
    }, { size: 8, fill: C.ink, border: trapSelected ? C.gold : C.wallLit, color: cfg.trap === 'none' ? C.stoneLit : C.bone });
    dungeonSlotChip(g, b.x + 5, b.y + 17, 40, 23, cfg.back, i, 'back', '后');
    dungeonSlotChip(g, b.x + 49, b.y + 17, 40, 23, cfg.leader, i, 'leader', '统');
    dungeonSlotChip(g, b.x + 93, b.y + 17, 40, 23, cfg.front, i, 'front', '前');
    dungeonSlotChip(g, b.x + 137, b.y + 17, 40, 23, cfg.flank, i, 'flank', '翼');

    const u = utilityAt(i), ud = utilityDef(u), out = utilityOutput(i);
    const selected = sel?.kind === 'utility' && sel.floor === i;
    const ux = 228, uw = 98;
    g.rect(b.x + b.w, b.y + 20, ux - (b.x + b.w), 3).fill(C.leather);
    g.rect(ux, b.y, uw, b.h).fill(C.ink)
      .stroke({ width: 1, color: selected ? C.gold : u.kind === 'none' ? C.wallLit : ud.color, alignment: 0 });
    g.rect(ux + 1, b.y + 1, 4, b.h - 2).fill(u.kind === 'none' ? C.wallLit : ud.color);
    label(uiLayer, u.kind === 'none' ? '＋ 建资源房' : cut(`${u.nickname ? `${u.nickname}・` : ''}${ud.name} Lv${u.level}`, 13), ux + 9, b.y + 4, 10, u.kind === 'none' ? C.stoneLit : ud.color);
    if (u.kind !== 'none') {
      const facilityIcon = sprite(ud.tex, ux + 84, b.y + b.h - 2, 24);
      facilityIcon.alpha = u.condition <= 0 ? 0.35 : 0.82;
      uiLayer.addChild(facilityIcon);
      const staffText = WORKER_KINDS.has(u.kind) ? `・工${cut(workerName(u), 3)}` : u.kind === 'training' ? `・训${u.trainTargets.length}` : '';
      label(uiLayer, cut(`耐${u.condition}${staffText}`, 7), ux + 9, b.y + 17, 8, u.condition <= 25 ? C.red : C.stoneLit);
      const yieldText = out.bone ? `待产＋${out.bone}骨` : out.mana ? `待产＋${out.mana}魔` : u.kind === 'vault'
        ? `护${ud.boneCap[u.level - 1]}骨/${ud.manaCap[u.level - 1]}魔` : u.kind === 'healing'
          ? `疗愈${ud.charges[u.level - 1]}次` : u.kind === 'training' ? `每人＋${out.xp}经验`
            : u.kind === 'workshop' ? `维修＋${out.repair}点` : `招募-${Math.round(out.hatcheryDiscount * 100)}%`;
      label(uiLayer, cut(yieldText, 7), ux + 9, b.y + 29, 8, C.bone);
    }
    hits.add(ux, b.y, uw, b.h, () => { sel = { kind: 'utility', floor: i }; playSfx('tab'); render(); });
  }
  labelC(uiLayer, pf.from + pf.view.length >= S.floors.length ? '王座↓' : '深层↓', 20, 205, 8, C.purple);
  pager(g, 'dungeon-floors', pf.pages, 8, 219, 318, '楼层 ');
  drawSidePanel(g);
}

function dungeonSlotChip(g               , x        , y        , w        , h        , uid               , room        , which         , shortName        ) {
  const selected = sel?.kind === 'slot' && sel.room === room && sel.which === which;
  const flash = slotFlash.room === room && slotFlash.which === which && slotFlash.t > 0;
  const locked = which === 'flank' && S.rooms[room].leader == null;
  const border = flash ? C.green : selected ? C.gold : which === 'leader' ? C.goldDark : locked ? C.wallLit : C.stoneLit;
  g.rect(x, y, w, h).fill(C.ink).stroke({ width: 1, color: border, alignment: 0 });
  const ch = which === 'leader' ? champById(uid) : undefined;
  const inst = which === 'leader' ? undefined : instById(uid);
  const bounce = flash ? Math.round(Math.sin(slotFlash.t * 18) * 2) : 0;
  if (ch) {
    const k = champKind(ch);
    uiLayer.addChild(portraitEffect(sprite(k.tex, x + 11, y + h - 1 + bounce, 18), ch.lv >= CHAMP_LV_CAP, selected, ch.uid));
    label(uiLayer, ch.restTurns ? `休${ch.restTurns}` : `L${ch.lv}`, x + 22, y + 7, 8, ch.restTurns || ch.wounds ? C.red : C.gold);
  } else if (inst) {
    const k = instKind(inst);
    uiLayer.addChild(portraitEffect(sprite(k.tex, x + 11, y + h - 1 + bounce, 17), inst.lv >= 5, selected, inst.uid));
    label(uiLayer, `L${inst.lv}`, x + 22, y + 7, 8, C.bone);
  } else {
    labelC(uiLayer, locked ? '锁' : shortName, x + w / 2, y + 6, 9, locked ? C.wallLit : which === 'leader' ? C.goldDark : C.stoneLit);
  }
  hits.add(x, y, w, h, () => { sel = { kind: 'slot', room, which }; playSfx('tab'); render(); });
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
    const k = champKind(ch);
    uiLayer.addChild(portraitEffect(sprite(k.tex, x + w / 2, y + h - 11 + bounce, 32), ch.lv >= CHAMP_LV_CAP, selected, ch.uid));
    const ft = fatigueTier(ch.fatigue);
    labelC(uiLayer, ch.restTurns ? `休${ch.restTurns}` : `Lv${ch.lv}`, x + w / 2, y + h - 13, 12, ch.restTurns || ft.bad || ch.wounds ? C.red : C.gold);
    for (let i2 = 0; i2 < (ch.wounds || 0); i2++) g.rect(x + w - 5 - i2 * 4, y + 3, 3, 3).fill(C.red);
  } else if (inst) {
    const k = instKind(inst);
    uiLayer.addChild(portraitEffect(sprite(k.tex, x + w / 2, y + h - 11 + bounce, 25), inst.lv >= 5, selected, inst.uid));
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
    labelC(uiLayer, '选择战斗位或后勤房', 405, 110, 11, C.stoneLit);
    return;
  }
  if (sel.kind === 'utility') {
    const floor = sel.floor;
    const u = utilityAt(floor);
    if (!u) { sel = null; return; }
    const d = utilityDef(u);
    labelC(uiLayer, `${floor + 1}层 后勤房`, 405, 46, 12, C.white);
    if (u.kind === 'none') {
      label(uiLayer, '选择设施（仅预览）：', 340, 62, 10, C.bone);
      const kinds = ['bone-yard', 'mana-well', 'training', 'healing', 'workshop', 'hatchery', 'vault'];
      const pk = paged('utility-build', kinds, 2);
      let y = 76;
      for (const kind of pk.view) {
        const k = UTILITY_KINDS[kind];
        const can = facilityActionAvailable() && S.bone >= k.bone && S.mana >= k.mana;
        const active = sel.buildKind === kind;
        g.rect(340, y, 130, 21).fill(active ? C.wallLit : C.ink)
          .stroke({ width: 1, color: active ? C.gold : can ? k.color : C.wallLit, alignment: 0 });
        label(uiLayer, k.name, 344, y + 4, 10, active ? C.gold : can ? k.color : C.stoneLit);
        label(uiLayer, `${k.bone}骨${k.mana ? `＋${k.mana}魔` : ''}`, 408, y + 4, 9, can ? C.bone : C.redDark);
        hits.add(340, y, 130, 21, () => { sel = { kind: 'utility', floor, buildKind: kind }; playSfx('tab'); render(); });
        y += 23;
      }
      pager(g, 'utility-build', pk.pages, 340, 124, 130, '设施 ');
      const previewKind = sel.buildKind;
      if (!previewKind) {
        boundedText(uiLayer, '点击设施名称查看完整介绍。预选不会消耗资源。', 340, 160, 130, 52, 9, C.stoneLit);
        return;
      }
      const preview = UTILITY_KINDS[previewKind];
      const body = utilityBuildDetail(previewKind, floor);
      const canBuild = facilityActionAvailable() && S.bone >= preview.bone && S.mana >= preview.mana;
      label(uiLayer, `${preview.name}・建造预览`, 340, 146, 10, preview.color);
      boundedText(uiLayer, body, 340, 159, 130, 52, 7, C.bone);
      button(g, uiLayer, hits, 340, 214, 36, 16, '全文', () => openDetailPopup(`${preview.name}・设施介绍`, body, preview.color),
        { size: 9, fill: C.ink, border: preview.color, color: preview.color });
      button(g, uiLayer, hits, 378, 214, 92, 16, canBuild ? '确认建造' : facilityActionAvailable() ? '资源不足' : '本轮已建设', () => buildUtility(floor, previewKind),
        { size: 9, enabled: canBuild, fill: C.greenDark, border: canBuild ? C.green : C.redDark, color: canBuild ? C.white : C.redDark });
      return;
    }
    if (sel.people) {
      button(g, uiLayer, hits, 438, 46, 30, 14, '返回', () => { sel = { kind: 'utility', floor }; playSfx('tab'); render(); }, { size: 9 });
      if (WORKER_KINDS.has(u.kind)) {
        label(uiLayer, `${d.name}・工作人员`, 340, 64, 11, d.color);
        label(uiLayer, `当前：${workerName(u)}・效率${Math.round(workerEff(u) * 100)}%`, 340, 80, 10, C.bone);
        const pool = paged(`utility-worker-${floor}`, S.monsters, 6);
        let y = 98;
        for (const inst of pool.view) {
          const at = roomOf(inst.uid), job = workerFloorOf(inst.uid), train = trainingOf('monster', inst.uid);
          const current = u.workerUid === inst.uid;
          const free = at < 0 && train < 0 && (job < 0 || current);
          g.rect(340, y, 130, 18).fill(current ? C.wallLit : C.ink).stroke({ width: 1, color: current ? C.gold : free ? C.stoneLit : C.wallLit, alignment: 0 });
          label(uiLayer, cut(`${instKind(inst).name} Lv${inst.lv}`, 8), 344, y + 3, 10, current ? C.gold : free ? C.bone : C.stoneLit);
          const state = current ? '撤下' : at >= 0 ? `${at + 1}层守` : train >= 0 ? `${train + 1}层训` : job >= 0 ? `${job + 1}层工` : `${Math.round(workerEff({ ...u, workerUid: inst.uid }) * 100)}%`;
          label(uiLayer, state, 438, y + 3, 9, current ? C.red : free ? C.green : C.stoneLit);
          if (free) hits.add(340, y, 130, 18, () => assignWorker(floor, inst.uid));
          y += 20;
        }
        pager(g, `utility-worker-${floor}`, pool.pages, 340, 220, 130, '员工 ');
      } else {
        label(uiLayer, `训练对象 ${u.trainTargets.length}/${d.slots[u.level - 1]}`, 340, 64, 11, d.color);
        const units = [
          ...S.monsters.map((unit) => ({ type: 'monster', uid: unit.uid, name: instKind(unit).name, lv: unit.lv })),
          ...S.champs.map((unit) => ({ type: 'hero', uid: unit.uid, name: unit.name, lv: unit.lv })),
        ];
        const pool = paged(`utility-training-${floor}`, units, 7);
        let y = 82;
        for (const unit of pool.view) {
          const active = u.trainTargets.some((x) => x.type === unit.type && x.uid === unit.uid);
          const deployed = unit.type === 'monster' ? roomOf(unit.uid) >= 0 : roomOfChamp(unit.uid) >= 0;
          const job = unit.type === 'monster' ? workerFloorOf(unit.uid) : -1;
          const other = trainingOf(unit.type, unit.uid);
          const free = active || (!deployed && job < 0 && other < 0);
          g.rect(340, y, 130, 17).fill(active ? C.wallLit : C.ink).stroke({ width: 1, color: active ? C.gold : free ? C.stoneLit : C.wallLit, alignment: 0 });
          label(uiLayer, cut(`${unit.type === 'hero' ? '英' : '怪'}・${unit.name} Lv${unit.lv}`, 10), 344, y + 2, 10, active ? C.gold : free ? C.bone : C.stoneLit);
          label(uiLayer, active ? '取消' : deployed ? '驻守' : job >= 0 ? '工作' : other >= 0 ? `${other + 1}层` : '选择', 440, y + 2, 9, active ? C.red : free ? C.green : C.stoneLit);
          if (free) hits.add(340, y, 130, 17, () => toggleTrainingTarget(floor, unit.type, unit.uid));
          y += 19;
        }
        pager(g, `utility-training-${floor}`, pool.pages, 340, 220, 130, '学员 ');
      }
      return;
    }
    label(uiLayer, cut(`${facilityName(u)}・Lv${u.level}`, 16), 340, 64, 12, d.color);
    boundedText(uiLayer, d.desc, 340, 82, 130, 26, 10, C.bone);
    if (u.history?.length) hits.add(340, 62, 130, 46, () => {
      const persona = FACILITY_PERSONAS[u.persona];
      const history = u.history.slice().reverse().map((x) => `第${x.raid}轮・${x.text}`).join('\n');
      openDetailPopup(`${facilityName(u)}・设施档案`, `${persona ? `性格：${persona.name}\n${persona.desc}\n\n` : ''}${history}`, d.color);
    });
    label(uiLayer, `设施耐久 ${u.condition}/100`, 340, 110, 11, u.condition <= 25 ? C.red : C.stoneLit);
    bar(g, 340, 126, 130, 6, u.condition / 100, u.condition <= 25 ? C.red : C.green);
    const out = utilityOutput(floor);
    const detail = out.bone ? `本轮预计 ＋${out.bone}骨币` : out.mana ? `本轮预计 ＋${out.mana}魔质`
      : u.kind === 'vault' ? `保护 ${d.boneCap[u.level - 1]}骨/${d.manaCap[u.level - 1]}魔`
        : u.kind === 'healing' ? `疗愈 ${d.charges[u.level - 1]}次・剩${S.dungeon.healingCharges}`
          : u.kind === 'training' ? `每名学员 ＋${out.xp}经验`
            : u.kind === 'workshop' ? `维修＋${out.repair}・锻造-${Math.round(out.forgeDiscount * 100)}%`
              : `优惠${out.hatcheryCharges}次・-${Math.round(out.hatcheryDiscount * 100)}%`;
    label(uiLayer, detail, 340, 138, 10, C.gold);
    if (WORKER_KINDS.has(u.kind)) label(uiLayer, cut(`员工 ${workerName(u)}・效率${Math.round(workerEff(u) * 100)}%${u.persona ? `・${FACILITY_PERSONAS[u.persona].name}` : ''}`, 18), 340, 152, 10, C.stoneLit);
    else if (u.kind === 'training') label(uiLayer, `学员 ${u.trainTargets.length}/${d.slots[u.level - 1]}`, 340, 152, 10, C.stoneLit);
    else label(uiLayer, cut(`深度 ${Math.round((DEPTH_MULT[floor] ?? 0.8) * 100)}%${u.persona ? `・${FACILITY_PERSONAS[u.persona].name}` : ''}`, 18), 340, 152, 10, C.stoneLit);
    if (u.level < 3) {
      const cost = utilityUpgradeCost(u);
      const canUpgrade = facilityActionAvailable() && S.bone >= cost.bone && S.mana >= cost.mana;
      button(g, uiLayer, hits, 340, 168, 130, 18, facilityActionAvailable() ? `升级 ${cost.bone}骨${cost.mana ? `＋${cost.mana}魔` : ''}` : '本轮建设机会已用', () => upgradeUtility(floor),
        { size: 10, enabled: canUpgrade, border: d.color, color: C.white });
    } else labelC(uiLayer, '设施已满级', 405, 170, 10, C.gold);
    const repair = repairQuote(u);
    const repairLabel = u.condition >= 100 ? '无需维修' : repair.points ? `修${repair.points}点+${repair.bone}骨` : `维修${repair.bone}骨`;
    button(g, uiLayer, hits, 340, 190, 64, 18, repairLabel, () => repairUtility(floor),
      { size: 8, enabled: u.condition < 100 && S.bone >= repair.bone, border: C.green, color: C.green });
    button(g, uiLayer, hits, 406, 190, 64, 18, sel.confirmDemolish ? '确认拆除' : '拆除', () => demolishUtility(floor),
      { size: 9, border: C.red, color: C.red });
    const facilityLead = pendingStoryLead('设施异闻', `${floor}:${u.kind}`);
    if (WORKER_KINDS.has(u.kind) || u.kind === 'training') button(g, uiLayer, hits, 340, 212, 76, 16,
      u.kind === 'training' ? '管理训练' : '指派员工', () => { sel = { kind: 'utility', floor, people: true }; playSfx('tab'); render(); },
      { size: 9, border: d.color, color: C.white });
    else if (!facilityLead) label(uiLayer, `维修点 ${S.dungeon.repairPoints}/60`, 340, 214, 10, C.stoneLit);
    button(g, uiLayer, hits, 418, 212, 52, 16, facilityLead ? '设施秘闻' : '秘闻档案', () =>
      facilityLead ? openStoryLead(facilityLead.id) : openChronicle('facility', `${floor}:${u.kind}`),
    { size: 9, fill: facilityLead ? C.purpleDark : C.ink, border: C.purple, color: facilityLead ? C.white : C.purple });
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
        uiLayer.addChild(portraitEffect(sprite(champKind(c).tex, 348, y + 19, 16), c.lv >= CHAMP_LV_CAP, here, c.uid));
        label(uiLayer, cut(c.name.split('·')[0], 4), 358, y + 3, 12, here ? C.white : C.gold);
        label(uiLayer, `${c.lv}`, 410, y + 3, 12, C.bone);
        const state = c.restTurns ? `休${c.restTurns}` : ft.bad ? ft.text.slice(0, 2) : at < 0 ? '待' : `${at + 1}房`;
        label(uiLayer, state, 432, y + 3, 12, c.restTurns || ft.bad ? C.red : at < 0 ? C.green : C.gold);
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
      const s = portraitEffect(sprite(k.tex, 348, y + 17, 15), inst.lv >= 5, here, inst.uid);
      uiLayer.addChild(s);
      label(uiLayer, `${cut(k.name, 4)} Lv${inst.lv}`, 360, y + 3, 12, here ? C.white : C.bone);
      const post = monsterPost(inst.uid);
      const tagCol = here ? C.gold : post.kind === 'free' ? C.green : post.kind === 'guard' ? C.red : C.purple;
      label(uiLayer, post.text, 440, y + 3, 12, tagCol);
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
    if (lastSelInstUid !== sel.uid) {
      lastSelInstUid = sel.uid;
      monDetailMode = false;
    }
    const inst = instById(sel.uid);
    if (!inst) { sel = null; return; }
    const k = instKind(inst);
    if (monDetailMode) {
      drawMonInstDetail(g, inst, k);
    } else {
      drawMonInstCard(g, inst, k);
    }
    return;
  }

  function drawMonInstCard(g, inst, k) {
    labelC(uiLayer, cut(`${k.name} Lv${inst.lv}`, 11), 405, 46, 12, C.white);
    uiLayer.addChild(portraitEffect(sprite(k.tex, 405, 96, 36), inst.lv >= 5, true, inst.uid));
    const mult = LEVEL_MULT[inst.lv - 1];
    label(uiLayer, `生命 ${Math.round(k.hp * mult)}  攻击 ${Math.round(k.atk * mult)}`, 340, 100, 12, C.bone);
    label(uiLayer, `防御 ${Math.round(k.def * mult)}  速度 ${k.spd.toFixed(1)}`, 340, 114, 12, C.bone);
    const post = monsterPost(inst.uid);
    label(uiLayer, `去向：${post.text}`, 340, 128, 12, post.kind === 'free' ? C.stoneLit : post.kind === 'guard' ? C.gold : C.purple);
    // 技能使用统一独占详情层，避免局部卡片压住原页面信息。
    button(g, uiLayer, hits, 340, 142, 130, 14, `技能 ${k.skill}`,
      () => openDetailPopup(`技能・${k.skill}`, k.skillDesc, C.purple),
      { size: 12, fill: C.ink, border: C.purple, color: C.purple });
    if (inst.lv < 5) {
      const need = XP_PER_LEVEL[inst.lv - 1];
      bar(uiGfx, 340, 164, 130, 6, inst.xp / need, C.green);
      label(uiLayer, `经验 ${inst.xp}/${need}`, 340, 170, 12, C.bone);
      const cost = UPGRADE_COST[inst.lv - 1];
      const can = inst.xp >= need && S.bone >= cost;
      button(g, uiLayer, hits, 340, 182, 130, 15, `升级 ${cost}骨币`, () => {
        inst.xp -= need; inst.lv++; S.bone -= cost; playSfx('buy'); persist(); say(`${k.name} 升到 Lv${inst.lv}`); render();
      }, { size: 12, enabled: can, fill: C.greenDark, border: C.green, color: C.white });
    } else {
      label(uiLayer, '已达满级', 340, 170, 12, C.gold);
    }
    button(g, uiLayer, hits, 340, 224, 40, 16, '详情', () => { monDetailMode = true; playSfx('tab'); render(); },
      { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });

    const gcount = (inst.graft ?? []).length;
    if (isCustomKind(inst.kind)) {
      button(g, uiLayer, hits, 382, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
      button(g, uiLayer, hits, 432, 224, 38, 16, '拆', () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
    } else {
      button(g, uiLayer, hits, 382, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
      button(g, uiLayer, hits, 432, 224, 38, 16, '遣散', () => dismantle(inst.uid), { size: 10, border: C.red, color: C.red });
    }
  }

  function drawMonInstDetail(g, inst, k) {
    const gcount = (inst.graft ?? []).length;
    labelC(uiLayer, cut(`${k.name} Lv${inst.lv}`, 11), 405, 46, 12, C.white);
    const mult = LEVEL_MULT[inst.lv - 1];
    label(uiLayer, `生命 ${Math.round(k.hp * mult)}  攻击 ${Math.round(k.atk * mult)}`, 340, 66, 12, C.bone);
    label(uiLayer, `防御 ${Math.round(k.def * mult)}  速度 ${k.spd.toFixed(1)}`, 340, 80, 12, C.bone);
    const post = monsterPost(inst.uid);
    label(uiLayer, `去向：${post.text}`, 340, 94, 12, post.kind === 'free' ? C.stoneLit : post.kind === 'guard' ? C.gold : C.purple);
    label(uiLayer, `技能 ${k.skill}`, 340, 108, 12, C.purple);

    const skillBlock = boundedText(uiLayer, k.skillDesc, 340, 122, 130, 28, 11, C.stoneLit);
    if (skillBlock.truncated) hits.add(340, 108, 130, 42, () => openDetailPopup(`技能・${k.skill}`, k.skillDesc, C.purple));
    let dy = 156;

    const instAfs = selectedAffixes(k.affixes);
    if (instAfs.length) {
      label(uiLayer, '词缀', 340, dy, 12, C.gold);
      const afBody = instAfs.map((a) => `${a.name}：${a.desc}`).join('；');
      const afBlock = boundedText(uiLayer, afBody, 340, dy + 14, 130, 22, 11, C.bone);
      if (afBlock.truncated) hits.add(340, dy, 130, 38, () => openDetailPopup('怪物词缀', afBody, C.gold));
      dy = 194;
    }

    const passiveBody = k.passiveDesc ?? k.passive ?? '无被动说明';
    const passiveTitle = inst.lv < 5 ? '被动・Lv5 解锁' : '被动';
    const passiveH = Math.max(18, 222 - dy);
    g.rect(340, dy, 130, passiveH).fill(C.ink).stroke({ width: 1, color: C.goldDark, alignment: 0 });
    boundedText(uiLayer, `${passiveTitle}：${passiveBody}`, 344, dy + 2, 122, passiveH - 4, passiveH <= 30 ? 8 : 10,
      inst.lv < 5 ? C.stoneLit : C.gold);
    hits.add(340, dy, 130, passiveH, () => openDetailPopup(`${passiveTitle}・${k.name}`, passiveBody, C.gold));
    dy = 222;

    if (gcount && dy < 218) {
      label(uiLayer, `已移植 ${gcount}/${GRAFT_CAP} 件`, 340, dy, 10, C.steel);
    }

    button(g, uiLayer, hits, 340, 224, 40, 16, '返回', () => { monDetailMode = false; playSfx('tab'); render(); },
      { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
    if (isCustomKind(inst.kind)) {
      button(g, uiLayer, hits, 382, 224, 38, 16, '重组', () => openStitch(inst.uid), { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
      button(g, uiLayer, hits, 422, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
    } else {
      button(g, uiLayer, hits, 382, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
      button(g, uiLayer, hits, 432, 224, 38, 16, '遣散', () => dismantle(inst.uid), { size: 10, border: C.red, color: C.red });
    }
  }
  if (sel.kind === 'monkind') {
    const k = monKind(sel.id);
    const rq = recruitQuote(k);
    labelC(uiLayer, k.name, 405, 44, 12, isCustomKind(k.id) ? C.purple : C.white);
    label(uiLayer, `生命 ${k.hp}  攻击 ${k.atk}`, 340, 98, 12, C.bone);
    label(uiLayer, `防御 ${k.def}  速度 ${k.spd.toFixed(1)}`, 340, 117, 12, C.bone);
    label(uiLayer, `站位 ${k.row === 'front' ? '前排' : k.row === 'back' ? '后排' : '任意'}`, 340, 136, 12, C.bone);

    button(g, uiLayer, hits, 340, 155, 130, 14, `技能 ${k.skill}`,
      () => openDetailPopup(`技能・${k.skill}`, k.skillDesc, C.purple),
      { size: 12, fill: C.ink, border: C.purple, color: C.purple });

    button(g, uiLayer, hits, 340, 176, 130, 18, `${isCustomKind(k.id) ? '再缝一只' : '招募'} ${rq.cost}骨${rq.discount ? `(-${Math.round(rq.discount * 100)}%)` : ''}`,
      () => recruit(k.id),
      { size: 11, enabled: S.bone >= rq.cost, fill: C.greenDark, border: C.green, color: C.white });

    const passiveBody = k.passiveDesc ?? k.passive ?? '无被动说明';
    g.rect(340, 197, 130, 27).fill(C.ink).stroke({ width: 1, color: C.goldDark, alignment: 0 });
    boundedText(uiLayer, `被动：${passiveBody}`, 344, 199, 94, 23, 8, C.gold);
    hits.add(340, 197, 130, 27, () => openDetailPopup(`怪物被动・${k.name}`, passiveBody, C.gold));
    button(g, uiLayer, hits, 442, 200, 26, 20, '详', () => openDetailPopup(`怪物被动・${k.name}`, passiveBody, C.gold),
      { size: 10, fill: C.ink, border: C.goldDark, color: C.gold });

    return;
  }
  if (sel.kind === 'shop') {
    const it = shopItems().find((i) => i.id === sel .kind === true ? false : true);
    void it;
    const item = shopItems().find((i) => i.id === (sel                                ).id);
    if (!item) { sel = null; return; }
    labelC(uiLayer, item.name, 405, 46, 12, C.white);
    boundedText(uiLayer, item.desc, 340, 70, 130, 66, 12, C.bone);
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
function pager(g               , key        , pages        , x        , y        , w        , label2 = '', parent = uiLayer) {
  if (pages <= 1) return;
  livePagers.push({ key, pages });
  const focused = pagerFocus === key;
  const page = pageState[key] ?? 0;
  const col = focused ? C.gold : C.bone;
  button(g, parent, hits, x, y, 22, 14, '◀', () => turnPage(key, pages, -1), { size: 12, border: col, color: col });
  labelC(parent, `${label2}${page + 1}/${pages}`, x + w / 2, y, 12, focused ? C.gold : C.stoneLit);
  button(g, parent, hits, x + w - 22, y, 22, 14, '▶', () => turnPage(key, pages, 1), { size: 12, border: col, color: col });
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
let storyView = 'dashboard';
let storyChronicleFilter = 'all';
let storyChronicleRef = null;
let storyChronicleRaid = null;
let storyArchiveSel = null;
const STORY_INPUT = { x: 22, y: 206, w: 296, h: 18 };
const storyRng = () => Math.random();

function storyVars()                         { return S.story.vars; }

const STORY_LEAD_SCENES = new Set([
  'facility-bone-yard', 'facility-mana-well', 'facility-training', 'facility-healing',
  'facility-workshop', 'facility-hatchery', 'facility-vault', 'hero-healing',
  'report-breach', 'report-worker', 'report-revival', 'hero-fatigue',
  'hero-graft', 'hero-talent', 'hero-title', 'facility-growth', 'facility-repair',
  'echo-deep-current', 'echo-hero-trust', 'echo-worker-memorial', 'echo-graft-oath', 'echo-facility-voice',
  'heroes-rivalry', 'heroes-friendship', 'heroes-mentor', 'training-classmates', 'training-mentor',
  'hero-exile-encounter', 'facility-awakening', 'rare-dungeon-memorial', 'rare-living-court', 'rare-returning-company',
  'hero-graft-full', 'hero-graft-legendary', 'hero-talent-offense', 'hero-talent-defense', 'hero-talent-command',
  'hero-title-war', 'hero-title-survivor', 'hero-title-command',
  'echo-merchant-route', 'echo-monster-quarrel', 'echo-rested-shift', 'echo-bone-bed', 'echo-missing-door',
  'echo-lair-name', 'echo-sign-board', 'echo-stray-monster', 'echo-seal-crack', 'echo-trap-salesman',
  'echo-fear-answer', 'echo-lost-blueprint', 'echo-captain-letter', 'echo-room-name', 'echo-leftover-mana', 'echo-quiet-night',
]);

function queueStoryLead(key, sceneId, source, title, context = {}, dueRaid = S.raidNo) {
  if (!STORY_LEAD_SCENES.has(sceneId) || !sceneById(sceneId)) return null;
  const duplicate = S.story.leads.some((x) => x.key === key) || S.story.archive.some((x) => x.key === key);
  if (duplicate) return null;
  const subjects = storyLeadSubjects(source, context);
  const sameSubject = [...S.story.leads, ...S.story.archive].some((x) =>
    (x.raidNo ?? x.resolvedRaid) === S.raidNo && storyLeadSubjects(x.source, x.context, x.subjects).some((token) => subjects.includes(token)));
  if (subjects.length && sameSubject) return null;
  const lead = { id: S.story.leadNext++, key, sceneId, source, title, context, subjects, raidNo: S.raidNo, dueRaid };
  S.story.leads.unshift(lead);
  if (S.story.leads.length > 24) S.story.leads.length = 24;
  return lead;
}

function storyLeadSubjects(source = '', context = {}, stored = null) {
  if (Array.isArray(stored) && stored.length) return [...new Set(stored)];
  const out = [];
  const heroSource = /英雄|同僚|训练|流亡/.test(source);
  const monsterSource = /怪物|魔物/.test(source);
  const add = (type, value) => { if (value !== null && value !== undefined && value !== '') out.push(`${type}:${value}`); };
  add('facility', context.facilityRef);
  add('hero', context.heroRef);
  add('hero', context.heroARef);
  add('hero', context.heroBRef);
  add('monster', context.monsterRef);
  if (typeof context.ref === 'string' && /设施/.test(source)) add('facility', context.ref);
  if (typeof context.ref === 'number') {
    if (heroSource) add('hero', context.ref);
    else if (monsterSource) add('monster', context.ref);
  }
  for (const ref of Array.isArray(context.refs) ? context.refs : []) {
    if (heroSource) add('hero', ref);
    else if (monsterSource) add('monster', ref);
  }
  return [...new Set(out)];
}

function availableStoryLeads() { return S.story.leads.filter((x) => (x.dueRaid ?? 0) <= S.raidNo); }

function seedExistingFacilityLeads() {
  for (let floor = 0; floor < S.floors.length; floor++) {
    const u = utilityAt(floor);
    if (!u || u.kind === 'none') continue;
    const d = utilityDef(u);
    queueStoryLead(`facility:${floor}:${u.kind}`, `facility-${u.kind}`, '设施异闻', `${floor + 1}层・${d.name}`,
      { ref: `${floor}:${u.kind}`, floor: floor + 1, facility: d.name });
  }
}

function pendingStoryLead(source, ref) {
  return availableStoryLeads().find((x) => x.source === source && (ref == null || x.context?.ref === ref || x.context?.refs?.includes(ref))) ?? null;
}

const relationKey = (a, b) => [a, b].sort((x, y) => x - y).join(':');
function recordHeroRelations(uids) {
  const heroes = uids.map((uid) => champById(uid)).filter(Boolean);
  for (let i = 0; i < heroes.length; i++) for (let j = i + 1; j < heroes.length; j++) {
    const a = heroes[i], b = heroes[j], key = relationKey(a.uid, b.uid);
    const rel = S.story.relations[key] ?? { a: a.uid, b: b.uid, battles: 0, friendship: 0, rivalry: 0, mentorship: 0, names: [a.name, b.name] };
    rel.battles++;
    const bothProud = a.traits.includes('proud') && b.traits.includes('proud');
    const sameRace = a.race === b.race;
    const mentor = Math.abs(a.lv - b.lv) >= 4;
    if (bothProud) rel.rivalry++;
    else if (mentor) rel.mentorship++;
    else rel.friendship += sameRace ? 2 : 1;
    S.story.relations[key] = rel;
    const context = { ref: a.uid, refs: [a.uid, b.uid], heroARef: a.uid, heroBRef: b.uid, heroA: a.name, heroB: b.name, relationKey: key };
    if (rel.rivalry === 2) queueStoryLead(`relation:rivalry:${key}`, 'heroes-rivalry', '同僚秘闻', `${a.name}与${b.name}争夺同一场胜利`, context);
    else if (rel.mentorship === 2) queueStoryLead(`relation:mentor:${key}`, 'heroes-mentor', '同僚秘闻', `${a.name}开始纠正${b.name}的站姿`, { ...context, mentor: a.lv > b.lv ? a.name : b.name, student: a.lv > b.lv ? b.name : a.name });
    else if (rel.friendship >= 3 && rel.friendship - (sameRace ? 2 : 1) < 3) queueStoryLead(`relation:friendship:${key}`, 'heroes-friendship', '同僚秘闻', `${a.name}与${b.name}共享战后的沉默`, context);
  }
}

function queueTrainingRelation(floor, added, existing) {
  if (!existing || (added.type !== 'hero' && existing.type !== 'hero')) return;
  const unitOf = (x) => x.type === 'hero' ? champById(x.uid) : instById(x.uid);
  const nameOf = (x, unit) => x.type === 'hero' ? unit?.name : unit ? instKind(unit).name : '无名学员';
  const ua = unitOf(existing), ub = unitOf(added);
  if (!ua || !ub) return;
  const refs = [existing, added].filter((x) => x.type === 'hero').map((x) => x.uid);
  const key = [existing.type[0] + existing.uid, added.type[0] + added.uid].sort().join(':');
  const sceneId = existing.type === 'hero' && added.type === 'hero' ? 'training-classmates' : 'training-mentor';
  queueStoryLead(`training:${floor}:${key}`, sceneId, '训练秘闻', `${nameOf(existing, ua)}与${nameOf(added, ub)}的共同课程`,
    { ref: refs[0], refs, floor: floor + 1, heroARef: refs[0], heroBRef: refs[1], studentA: nameOf(existing, ua), studentB: nameOf(added, ub) });
}

function openStoryLead(id) {
  const lead = S.story.leads.find((x) => x.id === id);
  const sc = lead && sceneById(lead.sceneId);
  if (!lead || !sc || (lead.dueRaid ?? 0) > S.raidNo) return false;
  storyRun = { scene: sc, log: [], pending: null, leadId: lead.id, context: { ...lead.context } };
  tab = 'story';
  openScene(sc, false);
  return true;
}

function archiveStoryLead(reply, effects) {
  const id = storyRun?.leadId;
  if (id == null) return null;
  const at = S.story.leads.findIndex((x) => x.id === id);
  if (at < 0) return null;
  const lead = S.story.leads.splice(at, 1)[0];
  const refs = [...new Set([lead.context?.ref, ...(lead.context?.refs ?? [])].filter((x) => typeof x === 'number'))];
  S.story.archive.unshift({ ...lead, resolvedRaid: S.raidNo, outcome: reply, effects: effects.join('　'), refs, battleRefs: [] });
  return lead;
}

function queueStoryFollowup(lead, followup) {
  if (!lead || !followup) return null;
  const spec = typeof followup === 'string' ? { sceneId: followup } : followup;
  const scene = sceneById(spec.sceneId);
  if (!scene) return null;
  const title = spec.title ? fillText(spec.title, storyBridge) : `${lead.title}・后续`;
  return queueStoryLead(`followup:${lead.key}:${spec.sceneId}`, spec.sceneId, spec.source ?? lead.source,
    title, { ...lead.context, priorTitle: lead.title }, S.raidNo + Math.max(1, spec.after ?? 2));
}

function maybeQueueRareStoryLeads() {
  const v = S.story.vars;
  if (Number(v.keptScars || 0) > 0 && Number(v.workerHonor || 0) > 0 && Number(v.heroTrust || 0) > 0) {
    const heroes = S.champs.slice(0, 2);
    queueStoryLead('rare:dungeon-memorial', 'rare-dungeon-memorial', '稀有秘闻', '地牢决定记住所有伤口',
      { ref: heroes[0]?.uid, refs: heroes.map((x) => x.uid), heroARef: heroes[0]?.uid, heroBRef: heroes[1]?.uid,
        heroA: heroes[0]?.name ?? '一名统领', heroB: heroes[1]?.name ?? '另一名统领' });
  }
  if (Number(v.graftIdentity || 0) > 0 && Number(v.livingFacilities || 0) > 0 && Number(v.livingTitles || 0) > 0) {
    const living = S.floors.findIndex((f) => !!f.utility.persona);
    const u = utilityAt(living);
    queueStoryLead('rare:living-court', 'rare-living-court', '稀有秘闻', '会呼吸的地牢召开第一次廷议',
      { ref: S.champs[0]?.uid, refs: S.champs.slice(0, 3).map((x) => x.uid), heroARef: S.champs[0]?.uid,
        heroA: S.champs[0]?.name ?? '首席统领', facilityRef: living >= 0 ? `${living}:${u.kind}` : '', facility: u ? facilityName(u) : '地牢本身' });
  }
  if (S.story.exiles.length >= 2 && S.reports.filter((r) => !r.win).length >= 2) {
    queueStoryLead('rare:returning-company', 'rare-returning-company', '稀有秘闻', '被遣退者在入口外列成一队',
      { exileId: S.story.exiles[0].id, hero: S.story.exiles[0].champ.name, companion: S.story.exiles[1].champ.name });
  }
}

const storyBridge              = {
  get(path) {
    if (path.startsWith('ctx.')) return storyRun?.context?.[path.slice(4)] ?? '';
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
    S.story.mods.push({ ...m, originLeadId: storyRun?.leadId ?? null, originSceneId: storyRun?.scene?.id ?? null });
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
  alterHero(e) {
    const uid = e.uid ?? (e.contextKey ? storyRun?.context?.[e.contextKey] : storyRun?.context?.ref);
    const c = champById(Number(uid));
    if (!c) return { ok: false, text: '' };
    const parts = [];
    if (e.xp) { c.xp = Math.max(0, c.xp + Math.round(e.xp)); parts.push(`经验${e.xp > 0 ? '+' : ''}${Math.round(e.xp)}`); }
    if (e.rest) { const before = c.restTurns || 0; c.restTurns = Math.max(0, Math.min(HERO_REST_ROUNDS, before + Math.round(e.rest))); if (c.restTurns !== before) parts.push(`休息${c.restTurns - before > 0 ? '+' : ''}${c.restTurns - before}`); }
    if (e.wounds) { const before = c.wounds || 0; c.wounds = Math.max(0, Math.min(WOUND_CAP, before + Math.round(e.wounds))); if (c.wounds !== before) parts.push(`伤势${c.wounds - before > 0 ? '+' : ''}${c.wounds - before}`); }
    return { ok: parts.length > 0, text: parts.length ? `${c.name}：${parts.join('，')}` : '' };
  },
  alterFacility(e) {
    const ref = String(e.ref ?? (e.contextKey ? storyRun?.context?.[e.contextKey] : storyRun?.context?.ref) ?? '');
    const floor = Number(ref.split(':')[0]);
    const u = utilityAt(floor);
    if (!u || u.kind === 'none') return { ok: false, text: '' };
    const parts = [];
    if (e.condition) { const before = u.condition; u.condition = Math.max(0, Math.min(100, before + Math.round(e.condition))); if (u.condition !== before) parts.push(`耐久${u.condition - before > 0 ? '+' : ''}${u.condition - before}`); }
    if (e.repair) { const before = S.dungeon.repairPoints; S.dungeon.repairPoints = Math.max(0, Math.min(60, before + Math.round(e.repair))); if (S.dungeon.repairPoints !== before) parts.push(`维修点${S.dungeon.repairPoints - before > 0 ? '+' : ''}${S.dungeon.repairPoints - before}`); }
    if (e.persona && FACILITY_PERSONAS[e.persona]) { u.persona = e.persona; parts.push(`性格→${FACILITY_PERSONAS[e.persona].name}`); }
    if (e.nickname) { u.nickname = String(e.nickname).slice(0, 12); parts.push(`昵称→${u.nickname}`); }
    if (parts.length) addFacilityHistory(floor, 'story', parts.join('，'));
    return { ok: parts.length > 0, text: parts.length ? `${utilityDef(u).name}：${parts.join('，')}` : '' };
  },
  resolveExile(e) {
    const id = Number(e.id ?? storyRun?.context?.exileId);
    const at = S.story.exiles.findIndex((x) => x.id === id);
    if (at < 0) return { ok: false, text: '' };
    const exile = S.story.exiles[at];
    if (e.action !== 'return') return { ok: false, text: '' };
    if (S.champs.length >= CHAMP_CAP) return { ok: false, text: `${exile.champ.name}回到门前，但英雄名册已满` };
    S.champs.push(exile.champ);
    S.champPot[exile.champ.uid] = exile.potential ?? 1;
    S.story.exiles.splice(at, 1);
    heroSel = exile.champ.uid;
    return { ok: true, text: `${exile.champ.name}带着流亡经历重新加入麾下` };
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
function battleMods() {
  const out = foldMods(S.story.mods);
  const scale = dungeonRaidScale();
  out.heroHpMult *= scale.hp;
  out.heroAtkMult *= scale.atk;
  return out;
}

// 混合事件源：接了外部叙事者就先问它，拿不到（关闭/超时/JSON 坏）立刻回落本地事件池。
// 玩家永远能听到秘闻 —— LLM 只是内容来源之一，不是必需依赖。
const hybridProvider                = {
  id: 'hybrid',
  name: '地牢秘闻＋外部叙事者',
  async next(snap, pick) {
    if (hasBackend()) {
      try {
        const sc = await llmScene(snap, String(S.story.vars.lairName ?? ''));
        if (sc) return sc;
      } catch {
        console.warn('外部叙事者不可用，已自动切换到本地秘闻');
      }
    }
    return localProvider.next(snap, pick);
  },
};

function storyHasNew() { return !storyRun && (availableStoryLeads().length > 0 || S.story.credits > 0); }

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
    const id = S.story.leadNext++;
    const lead = { id, key: `random:${S.raidNo}:${sc.id}:${id}`, sceneId: sc.id, source: '无主传闻',
      title: cut(fillText(sc.text, storyBridge).replace(/\n/g, ' '), 18), context: {}, raidNo: S.raidNo, dueRaid: S.raidNo };
    S.story.leads.unshift(lead);
    openStoryLead(id);
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
  pushStoryLine(fillText(sc.text, storyBridge), sc.who ? fillText(sc.who, storyBridge) : undefined);
  playSfx('tab');
  syncStoryInput();
  persist();
  render();
}

// 出口统一收口：回应文字 + 效果结算 + 续接下一幕
function resolveExit(reply        , effects                      , next                    , followup             ) {
  if (!storyRun) return;
  const filledReply = fillText(reply, storyBridge);
  pushStoryLine(filledReply, undefined, 'reply');
  const lines = applyEffects(storyBridge, effects);
  if (lines.length) {
    pushStoryLine(lines.join('　'), undefined, 'gain');
    playSfx('buy');
  }
  const nx = next ? sceneById(next) : null;
  if (nx) openScene(nx, false);
  else {
    const completedLead = archiveStoryLead(filledReply, lines);
    queueStoryFollowup(completedLead, followup);
    maybeQueueRareStoryLeads();
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
  resolveExit(ex.reply, ex.effects, ex.next, ex.followup ?? storyRun?.scene.followup);
}

function ensureStoryInput() {
  if (storyInput) return;
  const el = document.createElement('input');
  el.type = 'text';
  el.style.cssText = 'position:fixed;z-index:9;box-sizing:border-box;background:#241c33;color:#e7d7a1;border:1px solid #7a7490;outline:none;font-family:inherit;padding:0 4px;touch-action:manipulation;user-select:text;-webkit-user-select:text;';
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
  if (screen === 'manage' && tab === 'story' && spec && !stitch && !forge) {
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
  positionDomInput(storyInput, STORY_INPUT);
}

function openChronicle(filter = 'all', ref = null, raid = null) {
  storyRun = null;
  removeStoryInput();
  storyView = 'chronicle';
  storyChronicleFilter = filter;
  storyChronicleRef = ref;
  storyChronicleRaid = raid;
  storyArchiveSel = null;
  tab = 'story';
  playSfx('tab');
  render();
}

function chronicleKind(item) {
  if (item.source === '稀有秘闻') return 'rare';
  if (item.source?.includes('设施')) return 'facility';
  if (item.source?.includes('战后')) return 'battle';
  if (item.source?.includes('英雄') || item.source?.includes('同僚') || item.source?.includes('训练') || item.source?.includes('流亡')) return 'hero';
  return 'other';
}

function chronicleItems() {
  return S.story.archive.filter((item) => {
    if (storyChronicleFilter !== 'all' && chronicleKind(item) !== storyChronicleFilter) return false;
    if (storyChronicleRef != null) {
      const refs = [item.context?.ref, ...(item.context?.refs ?? []), item.context?.facilityRef].filter((x) => x != null);
      if (!refs.some((x) => String(x) === String(storyChronicleRef))) return false;
    }
    if (storyChronicleRaid != null && item.resolvedRaid !== storyChronicleRaid && item.raidNo !== storyChronicleRaid && !item.battleRefs?.includes(storyChronicleRaid)) return false;
    return true;
  });
}

function drawChronicle(g) {
  label(uiLayer, '地牢编年史', 16, 42, 12, C.gold);
  label(uiLayer, `${S.story.archive.length}条永久记录`, 120, 42, 10, C.stoneLit);
  button(g, uiLayer, hits, 398, 40, 62, 16, '返回线索', () => { storyView = 'dashboard'; storyChronicleRef = null; storyChronicleRaid = null; render(); }, { size: 10, border: C.bone });
  const filters = [['all', '全部'], ['hero', '英雄'], ['facility', '设施'], ['battle', '战后'], ['rare', '稀有']];
  filters.forEach(([id, name], i) => button(g, uiLayer, hits, 16 + i * 60, 60, 56, 16, name, () => {
    storyChronicleFilter = id; storyChronicleRef = null; storyChronicleRaid = null; storyArchiveSel = null; pageState['chronicle-list'] = 0; render();
  }, { size: 9, fill: storyChronicleFilter === id ? C.purpleDark : C.ink, border: storyChronicleFilter === id ? C.purple : C.stoneLit, color: C.white }));
  if (storyChronicleRef != null || storyChronicleRaid != null) {
    const scope = storyChronicleRaid != null ? `第${storyChronicleRaid}轮` : '当前对象';
    button(g, uiLayer, hits, 320, 60, 140, 16, `${scope}筛选中・清除`, () => { storyChronicleRef = null; storyChronicleRaid = null; storyArchiveSel = null; render(); },
      { size: 9, border: C.gold, color: C.gold });
  }
  const items = chronicleItems();
  const pg = paged('chronicle-list', items, 5);
  panelF(g, uiLayer, 'inset', 16, 80, 210, 150, C.ink);
  let y = 86;
  if (!items.length) label(uiLayer, '没有符合条件的记录', 26, y, 10, C.wall);
  for (const item of pg.view) {
    const active = storyArchiveSel === item.id;
    button(g, uiLayer, hits, 22, y, 198, 24, `#${item.resolvedRaid} ${cut(item.title, 14)}`, () => { storyArchiveSel = item.id; render(); },
      { size: 9, fill: active ? C.purpleDark : C.wall, border: active ? C.purple : C.stoneLit, color: active ? C.white : C.bone });
    y += 27;
  }
  pager(g, 'chronicle-list', pg.pages, 24, 214, 94, '档案 ');
  panelF(g, uiLayer, 'stone', 236, 80, 228, 150, C.wall);
  const item = items.find((x) => x.id === storyArchiveSel) ?? items[0];
  if (!item) { labelC(uiLayer, '选择左侧记录', 350, 140, 11, C.stoneLit); return; }
  storyArchiveSel = item.id;
  label(uiLayer, cut(item.title, 18), 246, 88, 11, C.purple);
  label(uiLayer, `${item.source}・触发#${item.raidNo}・解决#${item.resolvedRaid}`, 246, 104, 9, C.stoneLit);
  boundedText(uiLayer, item.outcome, 246, 120, 208, 48, 10, C.bone);
  boundedText(uiLayer, item.effects ? `结果：${item.effects}` : '没有直接数值变化', 246, 170, 208, 24, 9, C.green);
  const battles = item.battleRefs ?? [];
  const reportRaid = battles.find((raidNo) => S.reports.some((r) => r.raidNo === raidNo));
  label(uiLayer, battles.length ? `影响战斗：${battles.map((x) => `#${x}`).join('、')}` : '尚未记录到后续战斗影响', 246, 198, 9, battles.length ? C.gold : C.stoneLit);
  if (reportRaid != null) button(g, uiLayer, hits, 356, 210, 98, 16, `查看战报 #${reportRaid}`, () => {
    const at = S.reports.findIndex((r) => r.raidNo === reportRaid);
    if (at >= 0) { reportIdx = at; tab = 'report'; storyView = 'dashboard'; playSfx('tab'); render(); }
  }, { size: 9, border: C.gold, color: C.gold });
}

function pageStory(g               ) {
  if (!storyRun) {
    if (storyView === 'chronicle') { drawChronicle(g); return; }
    label(uiLayer, '秘闻线索与档案', 20, 42, 12, C.white);
    const readyLeads = availableStoryLeads();
    const dormant = S.story.leads.length - readyLeads.length;
    label(uiLayer, `待处理 ${readyLeads.length}${dormant ? `・酝酿 ${dormant}` : ''}・已归档 ${S.story.archive.length}`, 278, 42, 10, C.stoneLit);
    panelF(g, uiLayer, 'inset', 16, 58, 218, 112, C.ink);
    label(uiLayer, '来自经营现场', 26, 62, 12, C.purple);
    const pl = paged('story-leads', readyLeads, 3);
    let vy = 78;
    if (!readyLeads.length) label(uiLayer, dormant ? '后续正在酝酿，完成袭击后再来' : '暂无线索；经营与战斗会留下痕迹', 26, vy, 10, C.wall);
    for (const lead of pl.view) {
      button(g, uiLayer, hits, 24, vy, 202, 25, `${lead.source}・${cut(lead.title, 11)}`, () => openStoryLead(lead.id),
        { size: 10, fill: C.wall, border: C.purple, color: C.bone });
      vy += 27;
    }
    pager(g, 'story-leads', pl.pages, 26, 154, 90);
    panelF(g, uiLayer, 'inset', 244, 58, 220, 112, C.ink);
    label(uiLayer, '已经发生', 254, 62, 12, C.purple);
    const pa = paged('story-archive', S.story.archive, 3);
    let my = 78;
    if (!S.story.archive.length) label(uiLayer, '（尚无归档）', 254, my, 11, C.wall);
    for (const item of pa.view) {
      button(g, uiLayer, hits, 252, my, 204, 25, `${item.source}・${cut(item.title, 11)}`, () =>
        openDetailPopup(item.title, `${item.outcome}${item.effects ? `\n\n结果：${item.effects}` : ''}`, C.purple),
      { size: 10, fill: C.wall, border: C.stoneLit, color: C.stoneLit });
      my += 27;
    }
    pager(g, 'story-archive', pa.pages, 254, 154, 90);
    const can = S.story.credits > 0;
    label(uiLayer, `战场变化 ${S.story.mods.length}・剧情记录 ${Object.keys(S.story.vars).length}`, 20, 180, 11, C.stoneLit);
    label(uiLayer, can ? `另有 ${S.story.credits} 次无主传闻可追查` : '无主传闻会在下一场袭击后补充', 20, 194, 11, can ? C.gold : C.wall);
    button(g, uiLayer, hits, 20, 210, 200, 22, storyBusy ? '正在追查…' : can ? '追查无主传闻' : '暂无次数・查看说明', () => {
      if (can) void drawStoryScene();
      else openDetailPopup('暂无无主秘闻', '当前可追查次数为 0。\n\n每场袭击结束后都会补充：守住地牢 +2 次，失守 +1 次。英雄、设施和战报产生的具体线索不消耗次数。', C.purple);
    }, { enabled: !storyBusy, fill: can ? C.purpleDark : C.ink, border: can ? C.purple : C.stoneLit, color: can ? C.white : C.stoneLit });
    label(uiLayer, '具体线索不消耗次数', 232, 216, 10, C.stoneLit);
    button(g, uiLayer, hits, 356, 210, 100, 22, '打开地牢编年史', () => openChronicle(), { size: 9, border: C.gold, color: C.gold });
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
      button(g, uiLayer, hits, bx, 186, bw, 40, c.label, () => resolveExit(c.reply, c.effects, c.next, c.followup ?? sc.followup),
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
  if ((c.restTurns || 0) > 0) { say(`${c.name} 仍需休息 ${c.restTurns} 回合`); return; }
  const trainingFloor = trainingOf('hero', uid);
  if (trainingFloor >= 0) { say(`${c.name}正在${trainingFloor + 1}层训练，先取消训练`); return; }
  for (let i = 0; i < S.rooms.length; i++) if (S.rooms[i].leader === uid) { S.rooms[i].leader = null; S.rooms[i].flank = null; }
  S.rooms[room].leader = uid;
  slotFlash = { room, which: 'leader', t: 0.45 };
  const bx = ROOM_BOX(room);
  spawnDust(bx.x + 69, bx.y + 39);
  playSfx('place');
  persist();
  say(`${c.name} 就位于 ${room + 1}房`);
  render();
}

function assign(room        , which         , uid        ) {
  if (which === 'leader') { seatChamp(room, uid); return; }
  const inst = instById(uid);
  if (!inst) return;
  const job = workerFloorOf(uid);
  if (job >= 0) { say(`${instKind(inst).name}正在${job + 1}层工作，先撤下岗位`); return; }
  const trainingFloor = trainingOf('monster', uid);
  if (trainingFloor >= 0) { say(`${instKind(inst).name}正在${trainingFloor + 1}层训练，先取消训练`); return; }
  const k = instKind(inst);
  if (which === 'flank' && S.rooms[room].leader == null) { say('侧翼位要先在本房安置统领'); return; }
  if (which === 'front' || which === 'back') {
    if (k.row !== 'any' && k.row !== which) { say(`${k.name}只能驻守${k.row === 'front' ? '前排' : '后排'}`); return; }
  }
  for (let i = 0; i < S.rooms.length; i++) {
    for (const w of ['front', 'back', 'flank']             ) if (S.rooms[i][w] === uid) S.rooms[i][w] = null;
  }
  S.rooms[room][which] = uid;
  slotFlash = { room, which, t: 0.45 };
  const bx = ROOM_BOX(room);
  const slotX = which === 'back' ? 25 : which === 'leader' ? 69 : which === 'front' ? 113 : 157;
  spawnDust(bx.x + slotX, bx.y + 39);
  playSfx('place');
  persist();
  render();
}

function recruit(kindId        ) {
  const k = monKind(kindId);
  const quote = recruitQuote(k);
  if (S.bone < quote.cost) { say('骨币不足'); return; }
  if (S.monsters.length >= 10) { say('怪物栏已满（10）'); return; }
  S.bone -= quote.cost;
  consumeHatcheryCharge(quote);
  const inst              = { uid: S.uidNext++, kind: k.id, lv: 1, xp: 0 };
  S.monsters.push(inst);
  sel = { kind: 'inst', uid: inst.uid };
  playSfx('buy');
  persist();
  say(`招募了${k.name}${quote.discount ? `，孵化室节省${k.cost - quote.cost}骨币` : ''}`);
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
  const td = TALENTS[id].desc;
  const talentScene = /光环|同房|全体|队友/.test(td) ? 'hero-talent-command' : /生命|防御|治疗|复活|减伤|护盾/.test(td) ? 'hero-talent-defense' : 'hero-talent-offense';
  queueStoryLead(`hero-talent:${c.uid}:${id}`, talentScene, '英雄秘闻', `${c.name}选择了「${TALENTS[id].name}」`,
    { ref: c.uid, hero: c.name, talent: TALENTS[id].name, talentDesc: TALENTS[id].desc, tier: TALENTS[id].tier });
  playSfx('place');
  persist();
  say(`${c.name} 习得「${TALENTS[id].name}」`);
  render();
}

function previewTalent(c, id) {
  const tier = TALENTS[id]?.tier;
  if (!tier || tier > talentSlots(c)) return;
  const owned = c.talents[tier - 1];
  if (!owned && pendingTier(c) !== tier) return;
  talentPreview = { uid: c.uid, id: owned || id };
  playSfx('tab');
  render();
}

function confirmTalent(c) {
  const id = talentPreview?.uid === c.uid ? talentPreview.id : null;
  if (!id || TALENTS[id]?.tier !== pendingTier(c)) return;
  talentPreview = null;
  pickTalent(c, id);
}

function restChamp(c       ) {
  if ((c.restTurns || 0) <= 0) { say(`${c.name} 当前不需要疗愈`); return; }
  const capacity = healingCapacity();
  if (capacity <= 0) { say('需要先建造并修复一座疗愈池'); return; }
  if (S.dungeon.healingCharges <= 0) { say('疗愈池本轮服务次数已用完'); return; }
  if (S.mana < REST_MANA) { say('魔质不足'); return; }
  S.mana -= REST_MANA;
  S.dungeon.healingCharges--;
  c.restTurns--;
  queueStoryLead(`hero-healing:${c.uid}`, 'hero-healing', '英雄秘闻', `${c.name}在疗愈池的低语`,
    { ref: c.uid, hero: c.name, race: champKind(c).name });
  playSfx('place');
  persist();
  say(`${c.name} 接受疗愈，休息缩短至 ${c.restTurns} 回合`);
  render();
}

function healChamp(c       ) {
  if (!c.wounds) { say(`${c.name} 身上没有伤`); return; }
  if (S.mana < HEAL_MANA) { say('魔质不足'); return; }
  S.mana -= HEAL_MANA;
  c.wounds--;
  queueStoryLead(`hero-healing:${c.uid}`, 'hero-healing', '英雄秘闻', `${c.name}没有合拢的伤口`,
    { ref: c.uid, hero: c.name, race: champKind(c).name });
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
  if (talentPreview?.uid === c.uid) talentPreview = null;
  playSfx('place');
  persist();
  say(`${c.name} 的专精已清空，可重新选择`);
  render();
}

function dismissChamp(c       ) {
  const exile = { id: S.story.exileNext++, champ: JSON.parse(JSON.stringify(c)), potential: S.champPot[c.uid] ?? 1, leftRaid: S.raidNo };
  S.story.exiles.push(exile);
  queueStoryLead(`exile:${exile.id}`, 'hero-exile-encounter', '流亡传闻', `${c.name}离开后的第二封信`,
    { exileId: exile.id, hero: c.name, race: champKind(c).name, title: activeTitleOf(c)?.name ?? '无称号', battles: c.battles, kills: c.kills }, S.raidNo + 2);
  maybeQueueRareStoryLeads();
  S.champs = S.champs.filter((x) => x.uid !== c.uid);
  for (const r of S.rooms) if (r.leader === c.uid) { r.leader = null; r.flank = null; }
  for (const floor of S.floors) floor.utility.trainTargets = floor.utility.trainTargets.filter((x) => !(x.type === 'hero' && x.uid === c.uid));
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
    boundedText(uiLayer, '麾下还没有英雄。去「征召」选一位传奇族个体：它们有名字、会升级，坐统领席带兵。', 12, 70, 142, 70, 12, C.stoneLit);
  }
  const pr = paged('roster', S.champs, 5);
  let y = 64;
  for (const c of pr.view) {
    const on = heroSel === c.uid;
    const at = roomOfChamp(c.uid);
    const training = trainingOf('hero', c.uid);
    const ft = fatigueTier(c.fatigue);
    g.rect(8, y, 150, 26).fill(on ? C.wallLit : C.ink).stroke({ width: 1, color: on ? C.gold : C.goldDark, alignment: 0 });
    uiLayer.addChild(portraitEffect(sprite(champKind(c).tex, 20, y + 25, 24), c.lv >= CHAMP_LV_CAP, on, c.uid));
    const nm = c.name.split('·')[0];
    label(uiLayer, nm.length > 4 ? `${nm.slice(0, 4)}…` : nm, 34, y + 6, 12, on ? C.white : C.gold);
    label(uiLayer, `${c.lv}`, 86, y + 6, 12, C.bone);
    label(uiLayer, at >= 0 ? `${at + 1}房` : training >= 0 ? `${training + 1}训` : '待', 102, y + 6, 12, at >= 0 ? C.gold : training >= 0 ? C.purple : C.green);
    label(uiLayer, c.restTurns ? `休${c.restTurns}` : ft.text.slice(0, 2), 128, y + 6, 12, c.restTurns || ft.bad ? C.red : C.steel);
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

function traitColor(t        ) {
  const r = TRAITS[t]?.rarity ?? 'common';
  switch (r) {
    case 'legend': return C.gold;
    case 'epic':   return C.purple;
    case 'rare':   return C.blue;
    case 'curse':  return C.red;
    default:       return C.bone;
  }
}

function effDetailText(e        ) {
  const out = [];
  if (e.thorns)        out.push(`反伤 ${Math.round(e.thorns * 100)}%`);
  if (e.splash)        out.push(`溅射 ${Math.round(e.splash * 100)}%`);
  if (e.lifestealPct)  out.push(`吸血 ${Math.round(e.lifestealPct * 100)}%`);
  if (e.hpRegen)       out.push(`回血 ${e.hpRegen}/秒`);
  if (e.execute)       out.push(`残血 ${Math.round(e.execute * 100)}% 斩杀`);
  if (e.markHit)       out.push(`普攻叠易伤 ${Math.round(e.markHit * 100)}%`);
  if (e.cunning)       out.push(`普攻 ${Math.round(e.cunning * 100)}% 暴击，倍率 ${e.cunningMult ?? 1.5}`);
  if (e.skillCdMult && e.skillCdMult !== 1)
                       out.push(`技能冷却 ${Math.round(e.skillCdMult * 100)}%`);
  if (e.skillDmg && e.skillDmg !== 1)
                       out.push(`技能伤害 ${Math.round(e.skillDmg * 100)}%`);
  if (e.dmgToHero && e.dmgToHero !== 1)
                       out.push(`对勇者伤害 ${Math.round(e.dmgToHero * 100)}%`);
  if (e.frenzy)        out.push('越打越快');
  if (e.reach)         out.push('普攻直击后排');
  if (e.anchorHold)    out.push('嘲讽近战勇者');
  if (e.rageAura && e.rageAura !== 1)
                       out.push(`同房攻击 +${Math.round((e.rageAura - 1) * 100)}%`);
  if (e.bulwarkAura && e.bulwarkAura !== 1)
                       out.push(`同房减伤 ${Math.round((1 - e.bulwarkAura) * 100)}%`);
  if (e.allyAtk && e.allyAtk !== 1)
                       out.push(`同房攻击 +${Math.round((e.allyAtk - 1) * 100)}%`);
  if (e.allySpd && e.allySpd !== 1)
                       out.push(`同房攻速 +${Math.round((e.allySpd - 1) * 100)}%`);
  if (e.allyHp && e.allyHp !== 1)
                       out.push(`同房生命 +${Math.round((e.allyHp - 1) * 100)}%`);
  if (e.allyDef)       out.push(`同房防御 +${e.allyDef}`);
  if (e.undyingTrait)  out.push(`不灭：首次倒下以 ${Math.round(e.undyingTrait * 100)}% 生命复活`);
  if (e.divineFavor)   out.push(`神恩：致死伤害 ${Math.round(e.divineFavor * 100)}% 概率保留 1 点生命`);
  if (e.passive === 'revive')
                       out.push(`不朽：首次倒下复活${e.reviveAlly ? '并拉起同伴' : ''}`);
  if (e.reviveHp)      out.push(`复活生命 +${Math.round(e.reviveHp * 100)}%`);
  if (e.vengeful)      out.push(`倒下反弹 ${Math.round(e.vengeful * 100)}% 攻击伤害`);
  if (e.deathBurst)    out.push(`亡语：全场勇者受 ${e.deathBurst} 伤害`);
  if (e.bloodthirsty)  out.push(`击杀回血 ${Math.round(e.bloodthirsty * 100)}%`);
  if (e.soulDevour)    out.push('噬魂：每击倒勇者永久 +1 攻击');
  if (e.onHit === 'sunder')      out.push('普攻破防 3');
  if (e.onHit === 'weaken')      out.push('普攻减速');
  if (e.onHit === 'delay')       out.push('普攻延迟技能冷却');
  if (e.burnHit)       out.push(`普攻点燃 ${e.burnHit}`);
  if (e.venomHit)      out.push(`普攻中毒 ${e.venomHit}`);
  if (e.chillHit)      out.push(`普攻减速 ${Math.round(e.chillHit * 100)}%`);
  if (e.stunHit)       out.push(`普攻眩晕概率 ${Math.round(e.stunHit * 100)}%`);
  if (e.manaEcho)      out.push(`战后产魔 ${e.manaEcho}`);
  if (e.boneEcho)      out.push(`战后产骨 ${e.boneEcho}`);
  return out;
}

function drawChampStat(g, c) {
  const ti = activeTitleOf(c);
  label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);
  label(uiLayer, `${champKind(c).name}・Lv${c.lv}/${CHAMP_LV_CAP}`, 174, 80, 12, C.bone);
  const pot = S.champPot[c.uid] ?? 0;
  label(uiLayer, `资质${POT_NAME[pot]}`, 174, 96, 12, C.bone);
  const ft = fatigueTier(c.fatigue);
  label(uiLayer, `轮值 ${c.sorties || 0}/${HERO_SORTIE_LIMIT}・疲劳 ${c.fatigue} ${ft.text}`, 174, 112, 12, c.restTurns || ft.bad ? C.red : C.steel);
  const wd = c.wounds || 0;
  const healthState = `${c.restTurns ? `休息 ${c.restTurns}回合` : '可出战'}・${wd ? `伤 ${wd}道 属性-${wd * 8}%` : '无伤'}`;
  label(uiLayer, healthState, 174, 128, 12, c.restTurns || wd ? C.red : C.green);
  const chem = chemistry(S.champs, seatedChampUids());
  const at = roomOfChamp(c.uid);
  const training = trainingOf('hero', c.uid);
  const tags = chemOf(chem.map, c.uid).tags;
  label(uiLayer, at >= 0 ? cut(`${at + 1}房统领 ${tags.length ? tags.join('・') : '无同僚效应'}`, 20)
    : training >= 0 ? `第${training + 1}层训练中` : '未上阵（休息及疲劳随战斗恢复）',
    174, 144, 12, at >= 0 ? C.steel : training >= 0 ? C.purple : C.stoneLit);
  const nt = nextTitle(c);
  label(uiLayer, cut(`${c.battles}战${c.kills}杀${nt ? `→${nt.t.name}` : '・满'}`, 14), 174, 160, 12, C.stoneLit);

  if (c.lv < CHAMP_LV_CAP) {
    const need = xpNeed(c.lv);
    label(uiLayer, `经验 ${c.xp}/${need}`, 174, 176, 12, C.bone);
    bar(uiGfx, 262, 180, 88, 5, Math.min(1, c.xp / need), C.green);
    const cost = upCostOf(c);
    button(g, uiLayer, hits, 362, 176, 106, 15, `升级 ${cost}骨`, () => levelChamp(c),
      { size: 12, enabled: canLevel(c) && S.bone >= cost, fill: C.greenDark, border: C.green, color: C.white });
  } else {
    label(uiLayer, '已达顶级 专精已满', 174, 176, 12, C.gold);
  }
  button(g, uiLayer, hits, 174, 195, 130, 15, `重随特质 ${REROLL_TRAIT_BONE}骨+${REROLL_TRAIT_MANA}魔`, () => rerollChampTraits(c),
    { size: 10, enabled: S.bone >= REROLL_TRAIT_BONE && S.mana >= REROLL_TRAIT_MANA, border: C.purple, color: C.white });
  const healCap = healingCapacity();
  const healEnabled = c.restTurns > 0 && healCap > 0 && S.dungeon.healingCharges > 0 && S.mana >= REST_MANA;
  const healLabel = healCap <= 0 ? '需疗愈池' : S.dungeon.healingCharges <= 0 ? '疗愈用尽' : `疗愈${REST_MANA}魔`;
  button(g, uiLayer, hits, 306, 195, 48, 15, healLabel, () => restChamp(c),
    { size: 9, enabled: healEnabled, border: healEnabled ? C.purple : C.stoneLit, color: healEnabled ? C.white : C.stoneLit });
  button(g, uiLayer, hits, 356, 195, 50, 15, `疗伤 ${HEAL_MANA}魔`, () => healChamp(c),
    { size: 10, enabled: wd > 0 && S.mana >= HEAL_MANA, border: wd ? C.red : C.stoneLit, color: wd ? C.white : C.stoneLit });
  const heroLead = pendingStoryLead('英雄秘闻', c.uid);
  const relationLead = pendingStoryLead('同僚秘闻', c.uid) ?? pendingStoryLead('训练秘闻', c.uid);
  const directLead = heroLead ?? relationLead;
  button(g, uiLayer, hits, 408, 195, 52, 15, directLead ? (relationLead ? '同僚秘闻' : '个人秘闻') : '秘闻档案', () =>
    directLead ? openStoryLead(directLead.id) : openChronicle('hero', c.uid),
  { size: 9, fill: directLead ? C.purpleDark : C.ink, border: C.purple, color: directLead ? C.white : C.purple });
  button(g, uiLayer, hits, 174, 214, 70, 15, '同僚关系', () => sayChem(chem.lines), { size: 10, border: C.purple, color: C.purple });
  button(g, uiLayer, hits, 246, 214, 100, 15, (c.graft ?? []).length ? `全身改造 ${(c.graft ?? []).length}/4` : '全身改造', () => openGraft(c.uid, 'hero'),
    { size: 10, border: (c.graft ?? []).length ? C.gold : C.purple, color: (c.graft ?? []).length ? C.gold : C.white });
  button(g, uiLayer, hits, 348, 214, 112, 15, '遣退英雄', () => dismissChamp(c), { size: 10, border: C.red, color: C.red });
}

function drawChampTitles(g, c) {
  const x = 174, y = 80, w = 286;
  label(uiLayer, `${c.name.split('·')[0]} 的称号`, 174, 64, 12, C.gold);
  const unlocked = unlockedTitles(c);
  if (!unlocked.length) {
    label(uiLayer, '暂无已解锁称号', x, y, 12, C.stoneLit);
    const nt = nextTitle(c);
    if (nt) boundedText(uiLayer, `最近目标：${nt.t.name}（${nt.at}）`, x, y + 20, w, 34, 11, C.bone);
    return;
  }
  const activeId = activeTitleOf(c)?.id ?? '';
  if (!champTitleExpand || !unlocked.includes(champTitleExpand)) champTitleExpand = activeId || unlocked[0];
  const selectedId = champTitleExpand;
  const pg = paged(`champ-titles-${c.uid}`, unlocked, 8);
  const cols = 2;
  pg.view.forEach((id, i) => {
    const t = titleById(id);
    const bx = x + (i % cols) * 142;
    const by = y + Math.floor(i / cols) * 18;
    const active = activeId === id;
    const selected = selectedId === id;
    button(g, uiLayer, hits, bx, by, 138, 16, `${active ? '★' : '·'}${cut(t.name, 8)}`, () => {
      champTitleExpand = id;
      playSfx('tab'); render();
    }, { size: 10, fill: active ? C.goldDark : selected ? C.purpleDark : C.ink,
      border: active ? C.gold : selected ? C.purple : C.stoneLit, color: active || selected ? C.white : C.steel });
  });
  pager(g, `champ-titles-${c.uid}`, pg.pages, 174, 153, 286, '称号 ');

  const t = titleById(selectedId);
  panel(g, 174, 172, 286, 38, C.ink, activeId === selectedId ? C.gold : C.purple);
  if (t) {
    label(uiLayer, `${t.name}${activeId === t.id ? '・当前生效' : '・已解锁'}`, 180, 175, 11, activeId === t.id ? C.gold : C.purple);
    boundedText(uiLayer, `效果：${t.desc}`, 180, 190, 204, 18, 10, C.bone);
    button(g, uiLayer, hits, 390, 180, 62, 22, activeId === t.id ? '使用中' : '启用称号', () => {
      if (activeId === t.id) return;
      c.activeTitle = t.id;
      champTitleExpand = t.id;
      const titleScene = /光环|同房|全体|队友/.test(t.desc) ? 'hero-title-command' : /攻击|击倒|伤害|暴击/.test(t.desc) ? 'hero-title-war' : 'hero-title-survivor';
      queueStoryLead(`hero-title:${c.uid}:${t.id}`, titleScene, '英雄秘闻', `${c.name}第一次被称作「${t.name}」`,
        { ref: c.uid, hero: c.name, title: t.name, titleDesc: t.desc });
      playSfx('place'); persist(); render();
    }, { size: 11, enabled: activeId !== t.id, fill: C.purpleDark, border: activeId === t.id ? C.gold : C.purple, color: C.white });
  }
  const nt = nextTitle(c);
  label(uiLayer, nt ? cut(`下一目标：${nt.t.name}・${nt.at}`, 32) : '所有称号均已解锁', 174, 216, 10, nt ? C.stoneLit : C.gold);
}

function drawChampInfo(g, c) {
  const chem = chemistry(S.champs, seatedChampUids());
  const st = statOf(c, chem.map);
  const ti = activeTitleOf(c);
  label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);

  // 左列：基础属性
  label(uiLayer, '基础属性', 174, 80, 12, C.gold);
  label(uiLayer, `生命 ${st.hp}`, 174, 96, 12, C.bone);
  label(uiLayer, `攻击 ${st.atk}`, 174, 112, 12, C.bone);
  label(uiLayer, `防御 ${st.def}`, 174, 128, 12, C.bone);
  label(uiLayer, `攻速 ${st.spd.toFixed(2)}`, 174, 144, 12, C.bone);
  label(uiLayer, `受伤 ${Math.round(st.dmgTakenMult * 100)}%`, 250, 96, 12, C.bone);
  label(uiLayer, `经验 ${Math.round(st.xpMult * 100)}%`, 250, 112, 12, C.bone);
  label(uiLayer, `冷却 ${Math.round(st.eff.skillCdMult * 100)}%`, 250, 128, 12, C.bone);
  const auraFull = auraText(st.auraId, st.auraPow);
  const auraBlock = boundedText(uiLayer, auraFull, 250, 144, 66, 15, 10, C.gold);
  if (auraBlock.truncated) hits.add(248, 142, 70, 18, () => openDetailPopup('英雄被动', auraFull, C.gold));

  // 左列：特质
  let ty = 162;
  label(uiLayer, '特质', 174, ty, 12, C.gold); ty += 16;
  if (c.traits.length) {
    for (const t of c.traits) {
      const text = `${TRAITS[t].name}：${TRAITS[t].desc}`;
      const rowH = 26;
      g.rect(174, ty, 130, rowH).fill(C.ink).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
      const block = boundedText(uiLayer, text, 178, ty + 2, 126, 22, 11, traitColor(t));
      if (block.truncated) hits.add(174, ty, 130, rowH, () => openDetailPopup(`特质・${TRAITS[t].name}`, TRAITS[t].desc, traitColor(t)));
      ty += rowH + 2;
    }
  } else {
    label(uiLayer, '无', 174, ty, 12, C.stoneLit); ty += 14;
  }

  // 右列：战斗机制
  label(uiLayer, '战斗机制', 320, 80, 12, C.gold);
  const mechs = effDetailText(st.eff);
  let my = 96;
  if (mechs.length) {
    const allMechs = mechs.join('；');
    g.rect(320, my, 140, 48).fill(C.ink).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
    const block = boundedText(uiLayer, allMechs, 324, my + 3, 132, 42, 10, C.steel);
    if (block.truncated || mechs.length > 1) hits.add(320, my, 140, 48, () => openDetailPopup('战斗机制', mechs.join('\n'), C.steel));
    my += 52;
  } else {
    label(uiLayer, '无特殊机制', 320, my, 12, C.stoneLit); my += 14;
  }

  // 右列：英雄档案。完整背景可点击查看，避免和机制说明抢高度。
  const personality = personalityById(c.personality);
  const background = backgroundById(c.background);
  const loreY = Math.min(Math.max(my + 4, 150), 174);
  label(uiLayer, '英雄档案', 320, loreY, 12, C.gold);
  button(g, uiLayer, hits, 320, loreY + 15, 140, 16, `性格・${personality.name}`,
    () => openDetailPopup(`性格・${personality.name}`, personality.desc, C.purple),
    { size: 11, fill: C.ink, border: C.purpleDark, color: C.purple });
  button(g, uiLayer, hits, 320, loreY + 34, 140, 16, `背景・${background.name}`,
    () => openDetailPopup(`背景故事・${background.name}`, background.story, C.gold),
    { size: 11, fill: C.ink, border: C.goldDark, color: C.gold });
}

function drawChampDetail(g, c) {
  panelF(g, uiLayer, 'gold', 166, 58, 310, 176, C.wall);
  const pend = pendingTier(c);
  if (pend && heroView === 'stat') heroView = 'talent';
  const vaultDot = S.vault.length > 0;
  const tabs = [['stat', '状态'], ['info', '详情'], ['talent', pend ? '专精●' : '专精'], ['gear', vaultDot ? '装备●' : '装备'], ['title', '称号']];
  for (const [i, v] of tabs.entries()) {
    const on = heroView === v[0];
    button(g, uiLayer, hits, 326 + i * 30, 60, 28, 14, v[1], () => {
      heroView = v[0];
      if (heroView !== 'talent') talentPreview = null;
      playSfx('tab'); render();
    },
      { size: 10, fill: on ? C.wallLit : C.ink, border: on ? C.gold : C.stoneLit, color: on ? C.white : C.stoneLit });
  }
  if (heroView === 'info') { drawChampInfo(g, c); return; }
  if (heroView === 'talent') { drawChampTalents(g, c); return; }
  if (heroView === 'gear') { drawChampGear(g, c); return; }
  if (heroView === 'title') { drawChampTitles(g, c); return; }
  drawChampStat(g, c);
}

function rerollChampTraits(c) {
  if (S.bone < REROLL_TRAIT_BONE || S.mana < REROLL_TRAIT_MANA) { say('资源不足'); return; }
  S.bone -= REROLL_TRAIT_BONE;
  S.mana -= REROLL_TRAIT_MANA;
  rerollTraits(c, Math.random);
  playSfx('buy');
  say(`重随为：${c.traits.map((t) => TRAITS[t].name).join('、')}`);
  persist();
  render();
}

const cut = (t        , n        ) => (t.length > n ? `${t.slice(0, n)}…` : t);
function openGearDetail(k) {
  if (!k) return;
  const slot = GEAR_SLOTS.find((s) => s.id === k.slot)?.name ?? '未知';
  const rank = ['普通', '精良', '传奇', '神话'][k.rank] ?? `阶级${k.rank}`;
  openDetailPopup(`装备・${k.name}`, `槽位：${slot}\n品质：${rank}${k.forged ? '・自制装备' : '・缴获装备'}\n\n完整效果：${k.desc}\n\n以上数值会在穿戴后直接计入英雄最终属性与战斗机制。`, RANK_COL[k.rank] ?? C.gold);
}
function sayChem(lines          ) {
  say(lines.length ? cut(lines.join(' / '), 40) : `同僚效应：${CHEM_INFO[0].desc.split('：')[0]}等，需多名英雄同时上阵`);
}

function drawChampTalents(g               , c       ) {
  const pend = pendingTier(c);
  if (talentPreview && talentPreview.uid !== c.uid) talentPreview = null;
  if (talentPreview && TALENTS[talentPreview.id]?.tier > talentSlots(c)) talentPreview = null;
  label(uiLayer, `${c.name} 的专精 ${c.talents.length}/${TALENT_CAP}`, 174, 62, 12, C.gold);
  const previewId = talentPreview?.uid === c.uid ? talentPreview.id : null;
  TALENT_TIERS.forEach((tier, i) => {
    const y = 79 + i * 21;
    const own = c.talents[i];
    const open = c.lv >= TIER_LV[i];
    const isPend = pend === i + 1;
    label(uiLayer, `Lv${TIER_LV[i]}`, 174, y + 1, 10, own ? C.white : isPend ? C.purple : C.stoneLit);
    tier.forEach((id, j) => {
      const chosen = own === id;
      const preview = previewId === id;
      const enabled = chosen || isPend;
      button(g, uiLayer, hits, 204 + j * 52, y, 49, 15, TALENTS[id].name,
        () => previewTalent(c, id),
        { size: 10, enabled, fill: chosen || preview ? C.purpleDark : C.ink,
          border: preview ? C.gold : chosen ? C.purple : open ? C.wallLit : C.wall,
          color: chosen ? C.white : isPend ? C.bone : C.stoneLit });
    });
  });
  panel(g, 172, 166, 296, 44, C.ink, previewId ? C.purple : C.wall);
  if (previewId) {
    const t = TALENTS[previewId];
    label(uiLayer, `${t.name}${c.talents[t.tier - 1] === previewId ? '・已学习' : '・待确认'}`, 178, 169, 11, C.gold);
    boundedText(uiLayer, t.desc, 178, 184, 204, 22, 11, C.bone);
  } else {
    label(uiLayer, pend ? '点击本层专精名称查看效果' : '点击已学习专精查看效果', 178, 181, 11, C.stoneLit);
  }
  const canConfirm = !!previewId && TALENTS[previewId].tier === pend && !c.talents[pend - 1];
  button(g, uiLayer, hits, 392, 178, 68, 20, '确认', () => confirmTalent(c),
    { size: 12, enabled: canConfirm, fill: C.purpleDark, border: C.purple, color: C.white });
  const rc = respecCost(c);
  button(g, uiLayer, hits, 174, 214, 116, 15, rc ? `洗点 ${rc}魔` : '无专精可洗', () => respecChamp(c),
    { size: 12, enabled: rc > 0 && S.mana >= rc, border: C.purple, color: C.white });
  label(uiLayer, `洗点单价 ${RESPEC_MANA}魔/个`, 300, 216, 12, C.stoneLit);
}

// ---------- 装备页 ----------
// 左：三个槽（点选后右侧列出仓库里同槽的备选）；右：仓库列表 + 熔/重铸
function drawChampGear(g               , c       ) {
  const eq           = c.gear ?? {};
  const ge = gearEff(c.gear);
  const set = gearSet(c.gear);
  label(uiLayer, cut(`${c.name.split('·')[0]} 的装备`, 9), 174, 64, 12, C.gold);
  // 三个槽：压成 36px 节奏，底部给当前装备效果留下完整两行摘要。
  GEAR_SLOTS.forEach((sl, i) => {
    const y = 80 + i * 36;
    const cur = gearById(eq[sl.id] ?? '');
    const on = gearSlotSel === sl.id;
    g.rect(174, y, 150, 32).fill(on ? C.wallLit : C.ink)
      .stroke({ width: 1, color: on ? C.gold : cur ? C.purple : C.stoneLit, alignment: 0 });
    // The whole visible slot card selects the slot. Register this first so the
    // explicit detail button drawn below keeps priority in Hits.test().
    hits.add(174, y, 150, 32, () => { gearSlotSel = sl.id; playSfx('tab'); render(); });
    label(uiLayer, sl.name, 178, y + 1, 12, C.stoneLit);
    if (cur) {
      uiLayer.addChild(sprite(cur.tex, 313, y + 17, 18));
      label(uiLayer, cut(cur.name, 5), 196, y + 1, 12, RANK_COL[cur.rank]);
      const desc = boundedText(uiLayer, cur.desc, 178, y + 18, 112, 14, 10, C.steel);
      button(g, uiLayer, hits, 292, y + 1, 24, 13, '详', () => openGearDetail(cur),
        { size: 10, border: desc.truncated ? C.gold : C.stoneLit, color: desc.truncated ? C.gold : C.stoneLit });
    } else {
      label(uiLayer, '空', 196, y + 1, 12, C.wallLit);
      label(uiLayer, '从右侧装上', 178, y + 18, 12, C.wallLit);
    }
  });
  // 卸下 / 重铸 / 锻造台
  const curSel = gearById(eq[gearSlotSel] ?? '');
  const summary = curSel ? curSel.desc : set ? `${set.name}：${set.desc}` : `仓库 ${S.vault.length}/${GEAR_CAP}・自制 ${S.forged.length}/${FORGED_CAP}`;
  boundedText(uiLayer, summary, 174, 187, 116, 24, 10, curSel ? C.steel : set ? C.gold : C.stoneLit);
  if (curSel) button(g, uiLayer, hits, 292, 190, 30, 16, '详情', () => openGearDetail(curSel),
    { size: 10, border: C.goldDark, color: C.gold });
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
    // Card body equips; action buttons are registered afterwards and therefore
    // override this broad target instead of accidentally equipping underneath.
    hits.add(332, y, 140, 32, () => equipGear(c, it.idx));
    uiLayer.addChild(sprite(it.k.tex, 342, y + 16, 16));
    label(uiLayer, cut(it.k.name, 4), 352, y + 1, 12, RANK_COL[it.k.rank]);
    if (it.k.forged) {
      button(g, uiLayer, hits, 400, y + 1, 32, 13, '改锻', () => openSmith(it.id), { size: 12, border: C.gold, color: C.gold });
      button(g, uiLayer, hits, 434, y + 1, 34, 13, '熔', () => meltForged(it.id), { size: 12, border: C.red, color: C.red });
    } else {
      button(g, uiLayer, hits, 424, y + 1, 44, 13, `熔${MELT_MANA[it.k.rank]}`, () => meltGear(it.idx),
        { size: 12, border: C.purple, color: C.purple });
    }
    boundedText(uiLayer, it.k.desc, 336, y + 18, 94, 13, 10, C.stoneLit);
    button(g, uiLayer, hits, 432, y + 17, 36, 13, '详情', () => openGearDetail(it.k),
      { size: 10, border: C.goldDark, color: C.gold });
    y += 34;
  }
  pager(g, `vault-${gearSlotSel}`, pv.pages, 332, 214, 140);
}
const RANK_COL = [C.bone, C.steel, C.gold, C.red];

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
    const traitW = c.traits.length > 1 ? 65 : 136;
    c.traits.forEach((t, ti) => {
      const tr = TRAITS[t];
      button(g, uiLayer, hits, x + 6 + ti * 69, 158, traitW, 15, tr.name,
        () => openDetailPopup(`特质・${tr.name}`, tr.desc, traitColor(t)),
        { size: 11, fill: C.wall, border: traitColor(t), color: traitColor(t) });
    });
    const aura = AURAS[k.aura ?? 'atk'];
    button(g, uiLayer, hits, x + 6, 178, 136, 18, cut(`被动・${aura.name}`, 10),
      () => openDetailPopup(`英雄被动・${aura.name}`, aura.desc, C.gold),
      { size: 11, fill: C.ink, border: C.goldDark, color: C.gold });
    const personality = personalityById(c.personality);
    const background = backgroundById(c.background);
    button(g, uiLayer, hits, x + 6, 198, 136, 11, cut(`性格・${personality.name}｜${background.name}`, 14),
      () => openDetailPopup(`${c.name}・英雄档案`, `性格：${personality.name}\n${personality.desc}\n\n背景：${background.name}\n${background.story}`, C.purple),
      { size: 9, fill: C.ink, border: C.purpleDark, color: C.steel });
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
    const rq = recruitQuote(k);
    const selected = sel?.kind === 'monkind' && sel.id === k.id;
    const cst = isCustomKind(k.id);
    const el = isEliteKind(k.id);
    const open = !el || eliteOpen(k);
    g.rect(6, y, 152, 20).fill(selected ? C.wallLit : C.wall)
      .stroke({ width: 1, color: selected ? C.gold : cst ? C.purpleDark : el ? C.goldDark : C.ink, alignment: 0 });
    uiLayer.addChild(portraitEffect(sprite(k.tex, 18, y + 19, 18), false, selected, k.id.length * 13));
    label(uiLayer, cut(k.name, 4), 30, y + 4, 12, cst ? C.purple : el ? C.gold : C.bone);
    label(uiLayer, open ? `${rq.cost}骨${rq.discount ? '↓' : ''}` : `第${k.eliteMin}轮`, 92, y + 4, 12,
      !open ? C.stoneLit : S.bone >= rq.cost ? C.gold : C.redDark);
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
    uiLayer.addChild(portraitEffect(sprite(k.tex, 178, y2 + 17, 16), inst.lv >= 5, selected, inst.uid));
    label(uiLayer, `${cut(k.name, 4)} Lv${inst.lv}`, 190, y2 + 2, 12,
      isCustomKind(inst.kind) ? C.purple : isEliteKind(inst.kind) ? C.gold : C.bone);
    const post = monsterPost(inst.uid);
    label(uiLayer, post.text, 278, y2 + 2, 12, post.kind === 'free' ? C.stoneLit : post.kind === 'guard' ? C.gold : C.purple);
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
  label(uiLayer, `工坊：解锁与强化・英雄遗物 ${S.relic}`, 10, 40, 12, C.white);
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
    hits.add(x, y, 158, 20, () => { relicForgeConfirm = false; sel = { kind: 'shop', id: it.id }; playSfx('tab'); render(); });
  });
  pager(g, 'shop', ps.pages, 6, 146, 158, '解锁 ');
  const canForgeRelic = S.bone >= 5000 && S.mana >= 5000;
  if (!relicForgeConfirm) {
    button(g, uiLayer, hits, 170, 146, 158, 18, '熔铸遗物 5000骨+5000魔', () => beginRelicForge(),
      { size: 10, enabled: canForgeRelic, fill: C.purpleDark, border: C.gold, color: C.gold });
  } else {
    button(g, uiLayer, hits, 170, 146, 104, 18, '确认熔铸', () => confirmRelicForge(),
      { size: 10, fill: C.redDark, border: C.red, color: C.white });
    button(g, uiLayer, hits, 276, 146, 52, 18, '取消', () => { relicForgeConfirm = false; playSfx('tab'); render(); },
      { size: 10, fill: C.wall, border: C.bone, color: C.bone });
    label(uiLayer, '将扣除5000骨币＋5000魔质', 170, 166, 9, C.red);
  }
  drawSidePanel(g);
}

function beginRelicForge() {
  if (S.bone < 5000 || S.mana < 5000) { say('熔铸英雄遗物需要5000骨币与5000魔质'); return false; }
  relicForgeConfirm = true;
  playSfx('tab'); say('高额消耗：再次确认才会熔铸英雄遗物'); render();
  return true;
}

function confirmRelicForge() {
  if (!relicForgeConfirm) return false;
  if (S.bone < 5000 || S.mana < 5000) {
    relicForgeConfirm = false; say('熔铸英雄遗物需要5000骨币与5000魔质'); render(); return false;
  }
  S.bone -= 5000; S.mana -= 5000; S.relic += 1; relicForgeConfirm = false;
  playSfx('buy'); persist(); say('英雄遗物熔铸完成'); render();
  return true;
}

function pageReport(g               ) {
  if (!S.reports.length) {
    label(uiLayer, '还没有战报，先打一场袭击', 10, 44, 12, C.stoneLit);
    return;
  }
  reportIdx = Math.min(reportIdx, S.reports.length - 1);
  const r = S.reports[reportIdx];
  const lkey0 = `rep-logs-${reportIdx}`;
  if (pageState[lkey0] === undefined) pageState[lkey0] = Math.max(0, Math.ceil(r.logs.length / 5) - 1);
  S.reports.forEach((rp, i) => {
    const x = 8 + i * 44;
    button(g, uiLayer, hits, x, 40, 40, 18, `#${rp.raidNo}`, () => { reportIdx = i; playSfx('tab'); render(); },
      { size: 12, fill: i === reportIdx ? C.wallLit : C.wall, border: rp.win ? C.green : C.red, color: rp.win ? C.green : C.red });
  });
  const reportLead = pendingStoryLead('战后线索', r.raidNo);
  if (reportLead) button(g, uiLayer, hits, 252, 40, 74, 18, '战后秘闻', () => openStoryLead(reportLead.id),
    { size: 10, fill: C.purpleDark, border: C.purple, color: C.white });
  else if ((r.storyConsequences?.length ?? 0) || (r.storyEchoes?.length ?? 0)) button(g, uiLayer, hits, 252, 40, 74, 18, '追溯秘闻', () =>
    openChronicle('all', null, r.raidNo), { size: 10, fill: C.ink, border: C.purple, color: C.purple });
  label(uiLayer, `${r.title}：${r.win ? '守住' : '失守'}  封印${r.seal}  ${r.time.toFixed(1)}s`, 8, 64, 12, r.win ? C.green : C.red);
  skullRow(g, 250, 62, r.skulls);
  const prooms = paged(`rep-rooms-${reportIdx}`, r.rooms, 3);
  let y = 82;
  for (const rr of prooms.view) {
    g.rect(8, y, 200, 16).fill(C.wall);
    label(uiLayer, `${rr.i + 1}层 ${rr.broken ? `失守${rr.lootDuration ? `・劫${rr.lootDuration.toFixed(1)}s` : ''}` : '守住'}`, 12, y + 3, 10, rr.broken ? C.red : C.green);
    label(uiLayer, rr.broken ? cut(rr.reason, 7) : '—', 128, y + 3, 9, C.stoneLit);
    y += 18;
  }
  pager(g, `rep-rooms-${reportIdx}`, prooms.pages, 8, 138, 200, '楼层 ');
  y = 158;
  label(uiLayer, '关键败因/结论：', 8, y + 4, 12, C.gold);
  button(g, uiLayer, hits, 132, y + 2, 76, 15, '完整战术复盘', () => {
    const review = Array.isArray(r.review) && r.review.length ? r.review : [r.firstCause];
    const economy = r.economy;
    const economyText = economy
      ? `\n\n经营损益：结算${economy.bone}骨币、${economy.mana}魔质、${economy.xp ?? 0}训练经验与${economy.repair ?? 0}维修点；损失${economy.boneLost}骨币、${economy.manaLost}魔质、${economy.xpLost ?? 0}训练经验与${economy.repairLost ?? 0}维修点；宝库保护${economy.boneProtected}骨币、${economy.manaProtected}魔质。\n功能储备：疗愈${economy.services?.healing ?? 0}次，工坊${economy.services?.forge ?? 0}次（-${Math.round((economy.services?.forgeDiscount ?? 0) * 100)}%），孵化优惠${economy.services?.hatchery ?? 0}次（-${Math.round((economy.services?.hatcheryDiscount ?? 0) * 100)}%）。\n${economy.rows.filter((x) => x.kind !== 'none').map((x) => `第${x.floor + 1}层 ${utilityDef({ kind: x.kind }).name}：${x.breached ? `遭劫${(x.lootDuration ?? 0).toFixed(1)}秒、设施-${x.conditionDamage ?? 0}耐久、功能损失${x.serviceLost ?? 0}次、员工${x.workerState === 'evacuated' ? '撤离' : x.workerState === 'fallen' ? '抵抗倒下' : x.workerState === 'reinforced' ? '参战' : x.workerUid ? '留守' : '无人'}` : '安全'}，结算${x.boneGot}骨/${x.manaGot}魔/${(x.xpGot ?? 0) * (x.training?.length ?? 0)}经验/${x.repairGot ?? 0}维修点，耐久${x.conditionAfter}`).join('\n')}`
      : '';
    const quotes = Array.isArray(r.dialogue) && r.dialogue.length
      ? r.dialogue.slice(-18).map((d) => `${d.name}：${d.text}`)
      : r.logs.filter((l) => /^　/.test(l.text)).slice(0, 12).map((l) => l.text.trim());
    const storyText = (r.storyConsequences?.length ?? 0) || (r.storyEchoes?.length ?? 0)
      ? `\n\n秘闻留下的影响：\n${(r.storyConsequences ?? []).map((x) => `· ${x.name}：${x.summary}`).join('\n')}${r.storyEchoes?.length ? `\n${r.storyEchoes.map((x) => `· ${x.title}：${x.outcome}`).join('\n')}` : ''}` : '';
    openDetailPopup(`#${r.raidNo} 战术复盘`, `${review.join('\n\n')}${economyText}${storyText}${quotes.length ? `\n\n战场对白摘录：\n${quotes.join('\n')}` : ''}`, r.win ? C.green : C.red);
  }, { size: 9, fill: C.ink, border: C.goldDark, color: C.gold });
  boundedText(uiLayer, r.firstCause, 8, y + 20, 200, Math.max(15, 210 - (y + 20)), 11, C.bone);
  const pu = paged(`rep-units-${reportIdx}`, r.units, 4);
  label(uiLayer, `单位战绩 ${r.units.length}`, 216, 82, 12, C.white);
  let y2 = 98;
  for (const u of pu.view) {
    label(uiLayer, cut(u.name.split('·')[0], 3), 216, y2, 12, u.side === 'mon' ? C.green : C.red);
    label(uiLayer, `伤${u.dmg}`, 274, y2, 11, C.bone);
    label(uiLayer, `治${u.heal ?? 0}・倒${u.kills ?? 0}`, 218, y2 + 12, 9, C.stoneLit);
    y2 += 28;
  }
  pager(g, `rep-units-${reportIdx}`, pu.pages, 216, 212, 106);
  panelF(g, uiLayer, 'stone', 334, 40, 142, 194, C.wall);
  // 日志分页：扩充台词后每页固定 5 条，避免长对白被下边界吞掉。
  const lkey = `rep-logs-${reportIdx}`;
  const pl = paged(lkey, r.logs, 5);
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
const unitPortraitNodes = new Map();
                                                                                  
let roomVis            = [];
let sealQuarters                       = null;

                                                                                                    
const parts             = [];
                                                            
const floats              = [];
const speechBubbles = new Map();

function clearSpeechBubbles() {
  for (const b of speechBubbles.values()) b.node.destroy({ children: true });
  speechBubbles.clear();
}

function spawnSpeechBubble(e) {
  const unit = e.unit;
  if (!unit) return;
  const old = speechBubbles.get(unit);
  if (old) old.node.destroy({ children: true });
  const node = new PIXI.Container();
  const textColor = e.side === 'hero' ? C.red : C.green;
  const block = boundedText(node, e.text, 5, 4, 92, 28, 10, textColor);
  const plate = new PIXI.Graphics();
  const w = Math.max(34, Math.min(102, Math.ceil(block.text.width) + 10));
  const h = Math.max(18, Math.ceil(block.height) + 8);
  plate.rect(0, 0, w, h).fill({ color: C.ink, alpha: 0.94 }).stroke({ width: 1, color: textColor, alignment: 0 });
  plate.moveTo(w / 2 - 3, h).lineTo(w / 2, h + 4).lineTo(w / 2 + 3, h).fill(textColor);
  node.addChildAt(plate, 0);
  fxLayer.addChild(node);
  speechBubbles.set(unit, { node, unit, room: e.room, kind: e.kind ?? 'skill', w, h, life: 1.6, max: 1.6 });
}

function initBattleLayers() {
  if (battleLayer.children.length) return;
  battleWorld.addChild(bgLayer, unitLayer, battleGfx, fxLayer);
  hudLayer.addChild(hudGfx);
  battleLayer.addChild(battleWorld, hudLayer);
}

function startBattle() {
  if (screen !== 'manage') return;
  confirmNew = false;
  if (stitch) closeStitch();
  const unavailable = seatedChampUids().map(champById).filter((c) => c && (c.restTurns || 0) > 0);
  if (unavailable.length) {
    say(`${unavailable.map((c) => c.name).join('、')}仍在强制休息，请先更换统领`);
    return;
  }
  // 战斗逻辑只携带纹理 key；开战前先烘焙固定怪物/精英怪物的四部位组合与当前改造外观。
  for (const m of S.monsters) instKind(m);
  for (const c of S.champs) champKind(c);
  const raid = currentRaid();
  const dungeonEconomy = dungeonEconomyPreview();
  battle = createBattle(raid, S.rooms, S.monsters,
    { sealMax: sealMax(), trapPower: trapPower(), mods: battleMods(), champs: champStatMap(), dungeonEconomy });
  pendingResultRaid = raid.no;
  screen = 'battle';
  uiPortraitFx.length = 0;
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
  unitPortraitNodes.clear();
  battlePortraitFx.length = 0;
  clearSpeechBubbles();
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
    let utilityGfx = null, utilityLabel = null, utilitySprite = null;
    const utility = b.rooms[i].utility;
    if (utility && utility.kind !== 'none' && utility.condition > 0) {
      utilityGfx = new PIXI.Graphics();
      utilityGfx.rect(rx + 307, FLOOR_Y - 57, 72, 55).fill({ color: C.wall, alpha: 0.76 })
        .stroke({ width: 2, color: C.goldDark, alignment: 0 });
      bgLayer.addChild(utilityGfx);
      const facility = UTILITY_KINDS[utility.kind];
      utilitySprite = sprite(facility?.tex, rx + 343, FLOOR_Y - 3, 48);
      utilitySprite.alpha = Math.max(0.42, utility.condition / 100);
      bgLayer.addChild(utilitySprite);
      utilityLabel = txt(UTILITY_KINDS[utility.kind]?.name ?? '后勤房', 10, C.gold);
      utilityLabel.x = rx + 314; utilityLabel.y = FLOOR_Y - 51;
      bgLayer.addChild(utilityLabel);
    }
    roomVis.push({ door: g, trap: trapSp, broken: false, utilityGfx, utilityLabel, utilitySprite });
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
  for (const r of b.rooms) if (r.utility?.worker) ensureSprite(r.utility.worker);
}

function ensureSprite(u      ) {
  if (unitSprites.has(u)) return;
  // 角色源图已统一朝向，战斗绘制无需运行时翻转。
  const s = sprite(u.tex, 0, 0, u.legend ? 40 : 30);
  const node = portraitEffect(s, u.side === 'hero' ? u.lv >= CHAMP_LV_CAP : u.lv >= 5, false, u.homeX, battlePortraitFx);
  unitLayer.addChild(node);
  unitSprites.set(u, s);
  unitPortraitNodes.set(u, node);
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
    } else if (e.k === 'loot-start') {
      spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 74, '勇者开始劫掠', C.red);
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y - 26, 8, C.goldDark, 42);
      playSfx('break', 0.9);
      flashT = 0.07; flashCol = C.goldDark;
    } else if (e.k === 'loot-tick') {
      const loss = [e.boneLoss ? `骨-${e.boneLoss}` : '', e.manaLoss ? `魔-${e.manaLoss}` : ''].filter(Boolean).join(' ');
      if (loss) spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 62, loss, C.red);
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y - 22, 4, C.leather, 55);
      const rv = roomVis[e.room];
      if (rv?.utilityGfx) rv.utilityGfx.alpha = 0.55 + (1 - e.progress) * 0.45;
      if (rv?.utilitySprite) rv.utilitySprite.alpha = 0.45 + (1 - e.progress) * 0.55;
      playSfx('heavy', 0.45);
    } else if (e.k === 'utility-break') {
      const rv = roomVis[e.room];
      if (rv?.utilityGfx) { rv.utilityGfx.tint = e.complete ? 0x7a3d46 : 0xb18468; rv.utilityGfx.alpha = 0.72; }
      if (rv?.utilitySprite) { rv.utilitySprite.tint = e.complete ? 0x74505a : 0xc69b7a; rv.utilitySprite.alpha = e.complete ? 0.38 : 0.68; }
      if (rv?.utilityLabel) rv.utilityLabel.text = e.complete ? '设施被毁' : '设施受损';
      spawnParticles(e.room * ROOM_W + 342, FLOOR_Y - 22, e.complete ? 12 : 7, C.redDark, 85);
      spawnFloat(e.room * ROOM_W + 342, FLOOR_Y - 82, e.complete ? '设施被砸毁' : '劫掠中断', e.complete ? C.red : C.green);
      playSfx('break', 1.2);
      shakeT = 0.14; shakeAmt = 3;
    } else if (e.k === 'worker-deploy') {
      ensureSprite(e.unit);
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y - 10, 8, C.green, 45);
      spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 60, '工作人员增援', C.green);
      playSfx('trap', 0.9);
    } else if (e.k === 'worker-evacuate') {
      spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 60, '工作人员撤离', C.gold);
      spawnParticles(e.room * ROOM_W + e.x, FLOOR_Y - 10, 5, C.stoneLit, 30);
      playSfx('coin', 0.8);
    } else if (e.k === 'worker-fall') {
      spawnFloat(e.room * ROOM_W + e.x, FLOOR_Y - 60, '抵抗失败', C.red);
      flashT = 0.08; flashCol = C.redDark;
    } else if (e.k === 'throne') {
      playSfx('throne');
      flashT = 0.14; flashCol = C.redDark;
      spawnParticles(b.rooms.length * ROOM_W + 110, FLOOR_Y - 30, 8, C.purple, 60);
    } else if (e.k === 'shake') {
      shakeT = Math.max(shakeT, 0.12);
      shakeAmt = Math.max(shakeAmt, e.amount);
    } else if (e.k === 'speech') {
      spawnSpeechBubble(e);
    }
  }
  b.events.length = 0;
}

function updateBattleVisuals(dt        ) {
  const b = battle ;
  camTargetX = b.roomIndex * ROOM_W - ((b.phase === 'loot' || b.phase === 'workerFight') ? 10 : 40);
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
    const node = unitPortraitNodes.get(u) ?? s;
    const wx = u.room * ROOM_W + u.x;
    const lunge = u.lungeT > 0 ? Math.round(Math.sin((1 - u.lungeT / 0.22) * Math.PI) * 4) : 0;
    const actBob = u.lungeT > 0 ? Math.round(Math.sin((1 - u.lungeT / 0.22) * Math.PI) * 3) : 0;
    const dir = u.side === 'hero' ? 1 : -1;
    const idleBob = u.alive ? Math.round(Math.sin(b.time * 6 + u.homeX) * 1) : 0;
    const bobY = idleBob - actBob;
    node.x = Math.round(wx + lunge * dir);
    node.y = Math.round(FLOOR_Y + u.y + bobY);
    node.visible = u.alive || u.deadT < 1.2;
    if (!u.alive) {
      node.alpha = Math.max(0, 1 - u.deadT / 1.2);
      node.rotation = Math.min(1.4, u.deadT * 2.5) * dir;
      node.y = Math.round(FLOOR_Y + u.y + Math.min(8, u.deadT * 20));
    } else {
      node.alpha = 1;
      node.rotation = 0;
      if (u.flashT > 0) s.tint = C.red;
      else if (u.burnT > 0) s.tint = 0xff8844;
      else if (u.poisonT > 0) s.tint = 0x77b255;
      else if (u.stunT > 0 || u.charmT > 0 || u.silenced) s.tint = 0x9b5de5;
      else if (u.slowT > 0) s.tint = 0xa8d0ff;
      else s.tint = 0xffffff;
    }
    if (node.__portraitFx) updatePortraitEffect(node.__portraitFx, dt, b.time, false);
    if (!u.alive) return;
    // 状态图标：减速/束缚/魅惑/沉默
    const iconY = FLOOR_Y + u.y - 40;
    if (u.slowT > 0) {
      battleGfx.circle(wx - 4, iconY, 2).fill(C.blue);
      battleGfx.circle(wx - 6, iconY - 2, 1.5).fill(C.blue);
    }
    if (u.stunT > 0) {
      battleGfx.circle(wx + 4, iconY, 2).fill(C.purple);
      battleGfx.rect(wx + 2, iconY - 3, 4, 1).fill(C.purple);
    }
    if (u.charmT > 0 || u.silenced) {
      battleGfx.circle(wx, iconY - 5, 2).fill(C.purple);
    }
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
  for (const r of b.rooms) {
    const worker = r.utility?.worker;
    if (!worker || r.mons.includes(worker)) continue;
    const node = unitPortraitNodes.get(worker);
    if (!node) continue;
    const show = r.index === b.roomIndex && r.utility.workerState === 'working'
      && ['enter', 'fight', 'break', 'loot'].includes(b.phase);
    node.visible = show;
    if (show) {
      node.x = Math.round(r.index * ROOM_W + 356);
      node.y = Math.round(FLOOR_Y - 6 + Math.sin(b.time * 5) * 1.5);
      node.alpha = b.phase === 'loot' ? 1 : 0.78;
    }
  }
  for (let i = 0; i < b.rooms.length; i++) {
    if (i === b.roomIndex) continue;
    b.rooms[i].mons.forEach((m) => {
      const s = unitSprites.get(m);
      const node = unitPortraitNodes.get(m) ?? s;
      if (node) node.visible = m.alive && i > b.roomIndex;
      if (node && node.visible) {
        node.x = Math.round(i * ROOM_W + m.x);
        node.y = Math.round(FLOOR_Y + m.y);
        node.alpha = 0.85;
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
    if (!p.s || p.s.destroyed) { parts.splice(i, 1); continue; }
    p.life -= dt;
    p.vy += p.grav * dt;
    p.s.x += p.vx * dt;
    p.s.y += p.vy * dt;
    p.s.alpha = Math.max(0, p.life / p.max);
    if (p.life <= 0) { p.s.destroy(); parts.splice(i, 1); }
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    if (!f.t || f.t.destroyed) { floats.splice(i, 1); continue; }
    f.life -= dt;
    f.t.y += f.vy * dt;
    f.t.alpha = Math.max(0, f.life / 0.75);
    if (f.life <= 0) { f.t.destroy(); floats.splice(i, 1); }
  }

  // 台词跟随角色，并在同屏气泡相撞时逐级上移；暂停时寿命不推进。
  const placed = [];
  const speechDt = paused ? 0 : dt;
  for (const [unit, bubble] of [...speechBubbles.entries()].sort((a, z) => a[0].x - z[0].x)) {
    bubble.life -= speechDt;
    if (bubble.life <= 0 || !unit.alive) {
      bubble.node.destroy({ children: true });
      speechBubbles.delete(unit);
      continue;
    }
    bubble.node.visible = bubble.room === b.roomIndex;
    if (!bubble.node.visible) continue;
    const wx = unit.room * ROOM_W + unit.x;
    const minX = camX + 4;
    const maxX = camX + VIEW_W - bubble.w - 4;
    let bx = Math.max(minX, Math.min(maxX, wx - bubble.w / 2));
    let by = Math.max(42, FLOOR_Y + unit.y - 70);
    for (const other of placed) {
      const overlapX = bx < other.x + other.w + 2 && bx + bubble.w + 2 > other.x;
      const overlapY = by < other.y + other.h + 2 && by + bubble.h + 2 > other.y;
      if (overlapX && overlapY) by = Math.max(42, other.y - bubble.h - 4);
    }
    bubble.node.x = Math.round(bx);
    bubble.node.y = Math.round(by);
    bubble.node.alpha = Math.min(1, bubble.life / 0.3);
    placed.push({ x: bx, y: by, w: bubble.w, h: bubble.h });
  }

  drawBattleHud();
}

function drawBattleTimeline(b        , g               , parent                ) {
  if (b.phase !== 'fight' && b.phase !== 'workerFight') return;
  const units = [
    ...b.heroes.filter((h) => h.alive && h.room === b.roomIndex),
    ...b.rooms[b.roomIndex].mons.filter((m) => m.alive),
  ].map((u) => ({ u, p: actionProgress(u, b) })).sort((a, z) => a.p - z.p);
  if (!units.length) return;
  const x = 92, y = 207, w = 286;
  g.rect(x - 4, y - 8, w + 8, 28).fill({ color: C.ink, alpha: 0.82 }).stroke({ width: 1, color: C.wallLit, alignment: 0 });
  g.rect(x, y + 4, w, 3).fill(C.wallLit);
  g.rect(x, y + 3, 2, 5).fill(C.gold);
  label(parent, '行动', 62, y, 10, C.gold);
  label(parent, '等待', x + w + 14, y, 10, C.stoneLit);
  const occupied = [];
  units.forEach((item, i) => {
    const u = item.u;
    const col = u.side === 'hero' ? C.red : C.green;
    const rawX = x + Math.round(item.p * w);
    const near = occupied.filter((px) => Math.abs(px - rawX) < 13).length;
    occupied.push(rawX);
    const iconY = y + 3 + (near % 2) * 5;
    const controlled = u.stunT > 0 || u.disarmT > 0 || u.charmT > 0 || u.silenced;
    g.rect(rawX - 10, iconY - 10, 20, 20).fill(C.wall)
      .stroke({ width: i === 0 ? 2 : 1, color: i === 0 ? C.gold : col, alignment: 0 });
    const portrait = sprite(u.tex, rawX, iconY + 9, 18);
    portrait.alpha = controlled ? 0.45 : 1;
    parent.addChild(portrait);
    if (u.slowT > 0) g.circle(rawX + 7, iconY - 7, 2).fill(C.blue);
    if (controlled) g.circle(rawX + 7, iconY - 2, 2).fill(C.purple);
    if (u.poisonT > 0 || u.burnT > 0) g.circle(rawX + 7, iconY + 3, 2).fill(C.green);
  });
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
  label(hudLayer, b.phase === 'throne' ? '勇者已抵达王座'
    : b.phase === 'loot' ? `第${b.roomIndex + 1}层劫掠`
      : b.phase === 'workerFight' ? `第${b.roomIndex + 1}层后勤抵抗` : `第${b.roomIndex + 1}房`, 186, 5, 12, C.white);
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
    button(hudGfx, hudLayer, hits, 430, 2, 42, 18, `${speed}×`, () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; }, { size: 12 });
    const utility = b.rooms[b.roomIndex]?.utility;
    if (utility?.worker && utility.workerState === 'working' && ['enter', 'fight', 'loot'].includes(b.phase)) {
      if (b.phase === 'loot') {
        button(hudGfx, hudLayer, hits, 348, 29, 58, 18, '留下抵抗', () => deployUtilityWorker(b), { size: 10, fill: C.greenDark, border: C.green });
        button(hudGfx, hudLayer, hits, 410, 29, 58, 18, '立即撤离', () => evacuateUtilityWorker(b), { size: 10, fill: C.wall, border: C.gold });
      } else {
        button(hudGfx, hudLayer, hits, 394, 29, 74, 18, '后勤增援', () => deployUtilityWorker(b), { size: 10, fill: C.greenDark, border: C.green });
      }
    }
  }
  const utility = b.rooms[b.roomIndex]?.utility;
  if (b.phase === 'loot' && utility?.loot) {
    const loot = utility.loot;
    hudGfx.rect(70, 192, 340, 30).fill({ color: C.ink, alpha: 0.9 }).stroke({ width: 1, color: C.redDark, alignment: 0 });
    label(hudLayer, `劫掠 ${loot.t.toFixed(1)}/5.0秒`, 78, 195, 10, C.red);
    const losses = `骨-${loot.boneLoss} 魔-${loot.manaLoss} 经验-${loot.xpLoss} 维修-${loot.repairLoss}`;
    label(hudLayer, losses, 188, 195, 10, C.bone);
    bar(hudGfx, 78, 211, 324, 5, loot.progress, C.red);
  }
  // 行动时间轴：本房所有可行动单位按 cd 排序，右到左为行动先后
  drawBattleTimeline(b, hudGfx, hudLayer);
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
  const rewardMult = dungeonRaidScale().reward;
  r.bone = Math.round(r.bone * rewardMult);
  r.mana = Math.round(r.mana * rewardMult);
  S.bone += r.bone;
  S.mana += r.mana;
  S.relic += r.relicLoot ?? 0;
  for (const x of r.xp) {
    const inst = instById(x.uid);
    if (inst && inst.lv < 5) inst.xp += x.xp;
  }
  // 英雄结算：经验/战功归到具体个体，疲劳按"上没上场"分别涨落
  const deployedChampUids = seatedChampUids();
  const chemBefore = chemistry(S.champs, deployedChampUids).map;
  for (const x of r.champXp ?? []) {
    const c = champById(x.uid);
    if (!c) continue;
    if (c.lv < CHAMP_LV_CAP) {
      const st = statOf(c, chemBefore);
      c.xp += Math.round(x.xp * chemOf(chemBefore, c.uid).xp * (st.xpMult ?? 1));
    }
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
  const newlyResting = tickFatigue(S.champs, deployedChampUids);
  recordHeroRelations(deployedChampUids);
  if (newlyResting.length) {
    const ids = new Set(newlyResting);
    for (let roomIndex = 0; roomIndex < S.rooms.length; roomIndex++) {
      const room = S.rooms[roomIndex];
      if (room.leader != null && ids.has(room.leader)) {
        const c = champById(room.leader);
        if (c) queueStoryLead(`hero-fatigue:${c.uid}`, 'hero-fatigue', '英雄秘闻', `${c.name}的第四道划痕`,
          { ref: c.uid, hero: c.name, floor: roomIndex + 1 });
        room.leader = null;
        room.flank = null;
      }
    }
  }
  // 战后维度统计写入英雄长期 stats，供称号解锁/切换读取
  for (const x of r.champStats ?? []) {
    const c = champById(x.uid);
    if (!c) continue;
    c.stats = c.stats ?? {};
    c.stats.attacks = (c.stats.attacks ?? 0) + (x.attacks ?? 0);
    c.stats.dmgDealt = (c.stats.dmgDealt ?? 0) + (x.dmgDealt ?? 0);
    c.stats.thornDmg = (c.stats.thornDmg ?? 0) + (x.thornDmg ?? 0);
    c.stats.healDone = (c.stats.healDone ?? 0) + (x.healDone ?? 0);
    c.stats.revives = (c.stats.revives ?? 0) + (x.revives ?? 0);
    if (x.soulAtk) c.soulAtk = Math.min(30, (c.soulAtk ?? 0) + x.soulAtk);
  }
  const units = [...b.heroes.map((h) => ({ name: h.name, dmg: Math.round(h.dmgDealt), heal: Math.round(h.healed), kills: h.kills ?? 0, side: 'hero' })),
    ...b.rooms.flatMap((rm) => rm.mons.map((m) => ({ name: m.name, dmg: Math.round(m.dmgDealt), heal: Math.round(m.healed), kills: m.kills ?? 0, side: 'mon' })))]
    .sort((a, z) => z.dmg - a.dmg);
  const economy = settleDungeonEconomy(b);
  r.economy = economy;
  const report         = {
    raidNo: b.raid.no, title: b.raid.title, win: r.win, skulls: r.skulls, seal: r.seal, time: b.time,
    rooms: b.rooms.map((rm) => ({ i: rm.index, broken: rm.broken, t: rm.breachTime, reason: rm.breachReason,
      lootDuration: rm.utility?.row?.realtime?.duration ?? 0, lootProgress: rm.utility?.row?.realtime?.progress ?? 0,
      workerState: rm.utility?.row?.realtime?.workerState ?? rm.utility?.workerState ?? 'none' })),
    units, firstCause: r.firstCause, review: r.review ?? [], metrics: r.metrics ?? {}, economy,
    dialogue: (b.dialogue ?? []).map((d) => ({ name: d.name, text: d.text, kind: d.kind, side: d.side, room: d.room, t: d.t })),
    logs: b.log.map((l) => ({ text: l.text, tone: l.tone })),
    storyConsequences: S.story.mods.map((m) => ({ id: m.id, name: m.name, summary: modSummary(m), originLeadId: m.originLeadId ?? null })),
    storyEchoes: S.story.archive.filter((x) => x.resolvedRaid === b.raid.no).slice(0, 3)
      .map((x) => ({ id: x.id, sceneId: x.sceneId, title: x.title, outcome: x.outcome })),
  };
  report.storyRefs = [...new Set([
    ...report.storyConsequences.map((x) => x.originLeadId), ...report.storyEchoes.map((x) => x.id),
  ].filter((x) => typeof x === 'number'))];
  for (const id of report.storyRefs) {
    const item = S.story.archive.find((x) => x.id === id);
    if (item) {
      if (!Array.isArray(item.battleRefs)) item.battleRefs = [];
      if (!item.battleRefs.includes(b.raid.no)) item.battleRefs.push(b.raid.no);
    }
  }
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
  const reportLeadIds = [];
  const fallen = economy.rows.find((x) => x.kind !== 'none' && x.workerState === 'fallen');
  if (fallen) {
    const worker = instById(fallen.workerUid);
    const lead = queueStoryLead(`report-worker:${b.raid.no}`, 'report-worker', '战后线索', `${utilityDef({ kind: fallen.kind }).name}的留守工具`,
      { ref: b.raid.no, facilityRef: `${fallen.floor}:${fallen.kind}`, floor: fallen.floor + 1, raidNo: b.raid.no, facility: utilityDef({ kind: fallen.kind }).name, worker: worker ? instKind(worker).name : '一名工作人员' });
    if (lead) reportLeadIds.push(lead.id);
  }
  const breached = economy.rows.find((x) => x.kind !== 'none' && x.breached);
  if (breached) {
    const lead = queueStoryLead(`report-breach:${b.raid.no}`, 'report-breach', '战后线索', `${breached.floor + 1}层劫掠路线图`,
      { ref: b.raid.no, facilityRef: `${breached.floor}:${breached.kind}`, raidNo: b.raid.no, floor: breached.floor + 1, facility: utilityDef({ kind: breached.kind }).name });
    if (lead) reportLeadIds.push(lead.id);
  }
  const revived = (r.champStats ?? []).find((x) => (x.revives ?? 0) > 0);
  if (revived) {
    const c = champById(revived.uid);
    const lead = queueStoryLead(`report-revival:${b.raid.no}`, 'report-revival', '战后线索', `${c?.name ?? '一名英雄'}被写回名册`,
      { ref: b.raid.no, heroRef: c?.uid, raidNo: b.raid.no, hero: c?.name ?? '一名英雄' });
    if (lead) reportLeadIds.push(lead.id);
  }
  report.storyLeadIds = reportLeadIds;
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
  const eco = r.economy;
  labelC(overlay, eco ? `战利＋${r.bone}骨/${r.mana}魔・经营＋${eco.bone}骨/${eco.mana}魔・训${eco.xp ?? 0}/修${eco.repair ?? 0}` : `骨币 +${r.bone}   魔质 +${r.mana}`, 240, 104, 9, C.gold);
  boundedText(overlay, r.firstCause, 90, 120, 300, 26, 9, r.win ? C.stoneLit : C.gold);
  let y = 148;
  const xpLines = r.xp.map((x) => {
    const inst = instById(x.uid);
    return inst ? `${instKind(inst).name} +${x.xp}xp` : '';
  }).filter(Boolean).slice(0, 4);
  labelC(overlay, xpLines.length ? xpLines.join('  ') : '本场无怪物参战', 240, y, 12, C.green);
  y += 16;
  // 英雄的成长单独一行：这是玩家最在意的长期读数
  const champLines = (r.champXp ?? []).map((x) => {
    const c = champById(x.uid);
    return c ? `${c.name} +${x.xp}xp${x.kills ? `/${x.kills}杀` : ''}${x.fell ? '（受伤）' : ''}` : '';
  }).filter(Boolean).slice(0, 2);
  if (champLines.length) labelC(overlay, champLines.join('  '), 240, y, 12, C.gold);
  y += 16;
  const loot = (r.loot ?? []).map((id) => gearById(id)?.name ?? '').filter(Boolean);
  const lootLine = `${loot.length ? `缴获：${cut(loot.join('、'), 16)}` : '无装备缴获'}${r.relicLoot ? '・英雄遗物×1' : ''}`;
  labelC(overlay, lootLine, 240, y, 12, loot.length || r.relicLoot ? C.purple : C.stoneLit);
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
  clearSpeechBubbles();
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
  ensurePortraitChrome();
  if (screen === 'manage') tickUiPortraitEffects(dt);
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
      if (!p.s || p.s.destroyed) { parts.splice(i, 1); continue; }
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
      // 新的 1× 是旧版速度的 50%；2× 对应旧版常速，4× 对应旧版双速。
      for (let i = 0; i < speed; i++) stepBattle(battle, dt * 0.5);
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
  drawRotateHint();
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
  if (rotateNode) rotateNode.visible = false;
  ensurePortraitChrome();
}

// 只读调试钩子（自测用）
window.__debug = {
  get rawSave() { return localStorage.getItem(SAVE_KEY); },
  get screen() { return screen; },
  get paused() { return paused; },
  get battleSpeed() { return speed; },
  setBattleSpeed: (v) => { if ([1, 2, 4].includes(v)) speed = v; return speed; },
  get tab() { return tab; },
  get save() { return S; },
  get bone() { return S.bone; },
  get mana() { return S.mana; },
  get detail() { return detailPopup ? { ...detailPopup } : null; },
  openDetail: (title, body) => { openDetailPopup(title, body); return true; },
  uiBounds: () => boundedTextAudit(),
  layerText: () => ({
    ui: uiLayer.children.filter((node) => node instanceof PIXI.Text).map((node) => node.text),
    modal: modalLayer.children.filter((node) => node instanceof PIXI.Text).map((node) => node.text),
  }),
  portraitFx: () => ({
    ui: uiPortraitFx.filter((r) => !r.node.destroyed).map((r) => ({ maxed: r.maxed, selected: r.selected, y: r.node.y, baseY: r.baseY, glow: r.glow?.alpha ?? 0, motes: r.motes.length })),
    battle: battlePortraitFx.filter((r) => !r.node.destroyed).map((r) => ({ maxed: r.maxed, glow: r.glow?.alpha ?? 0, motes: r.motes.length })),
  }),
  viewport: () => {
    const host = document.getElementById('app');
    const rect = host?.getBoundingClientRect();
    return { width: app.screen.width, height: app.screen.height, scale: viewScale, portrait, smallScreen, rotateHint: !!rotateNode?.visible,
      portraitChrome: portraitLayer.visible, portraitContentBottom, portraitLayout: portraitLayoutInfo ? { ...portraitLayoutInfo } : null,
      resolution: renderResolution, dpr: window.devicePixelRatio || 1,
      safeRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null };
  },
  get currentTab() { return tab; },
  get newGameConfirm() { return confirmNew; },
  cancelNewGame: () => { confirmNew = false; render(); return true; },
  get monsters() { return S.monsters.map((m) => ({ ...m, room: roomOf(m.uid) })); },
  get rooms() { return S.rooms; },
  get floors() { return S.floors.map((f, i) => ({ id: f.id, battle: { ...f.battle }, utility: { ...f.utility }, output: utilityOutput(i) })); },
  get dungeon() { return { ...S.dungeon, preview: dungeonEconomyPreview(), healingCapacity: healingCapacity() }; },
  enemyClasses: () => Object.values(HERO_CLASSES).map((c) => ({ id: c.id, name: c.name, tex: c.tex, role: c.role })),
  textureNames: () => [...TEXTURES],
  devUtility: (floor, kind, level = 1, condition = 100) => {
    if (!S.floors[floor] || !(kind in UTILITY_KINDS)) return null;
    S.floors[floor].utility = freshUtilityRoom({
      kind, level: kind === 'none' ? 0 : Math.max(1, Math.min(3, Math.round(level))),
      condition: kind === 'none' ? 100 : Math.max(0, Math.min(100, Math.round(condition))),
    });
    S.dungeon.healingCharges = healingCapacity(); persist(); render();
    return { ...S.floors[floor].utility };
  },
  previewUtilityBuild: (floor, kind) => {
    if (!S.floors[floor] || S.floors[floor].utility.kind !== 'none' || !(kind in UTILITY_KINDS) || kind === 'none') return null;
    tab = 'dungeon'; sel = { kind: 'utility', floor, buildKind: kind }; render();
    return { kind, detail: utilityBuildDetail(kind, floor), bone: S.bone, mana: S.mana };
  },
  confirmUtilityBuild: (floor, kind) => { buildUtility(floor, kind); return { ...S.floors[floor]?.utility, bone: S.bone, mana: S.mana }; },
  devUpgradeUtility: (floor) => { upgradeUtility(floor); return { ...S.floors[floor]?.utility, facilityActionRaid: S.dungeon.facilityActionRaid }; },
  devExpandFloor: () => { expandFloor(); return S.floors.length; },
  devEconomySettle: (broken = []) => {
    const snap = dungeonEconomyPreview();
    const out = settleDungeonEconomy({ dungeonEconomy: snap, rooms: S.rooms.map((_, i) => ({ broken: broken.includes(i) })) });
    persist(); render(); return out;
  },
  devWorker: (floor, uid) => { assignWorker(floor, uid); return utilityAt(floor)?.workerUid ?? null; },
  devTrain: (floor, type, uid) => { toggleTrainingTarget(floor, type, uid); return utilityAt(floor)?.trainTargets ?? []; },
  devRepairUtility: (floor) => { repairUtility(floor); return { utility: { ...utilityAt(floor) }, repairPoints: S.dungeon.repairPoints, bone: S.bone }; },
  economyQuotes: (bone = 100, mana = 20, kind = 'slime') => ({ workshop: workshopQuote(bone, mana), recruit: recruitQuote(monKind(kind)) }),
  get relicConfirm() { return relicForgeConfirm; },
  previewRelicForge: () => { tab = 'shop'; render(); return { armed: beginRelicForge(), bone: S.bone, mana: S.mana, relic: S.relic }; },
  confirmRelicForge: () => ({ ok: confirmRelicForge(), bone: S.bone, mana: S.mana, relic: S.relic }),
  devBuyMonster: (kind = 'slime') => { const before = { bone: S.bone, charges: S.dungeon.hatcheryCharges }; recruit(kind); return { before, bone: S.bone, charges: S.dungeon.hatcheryCharges, count: S.monsters.length }; },
  devSelectUtility: (floor, people = false) => { tab = 'dungeon'; sel = { kind: 'utility', floor, people }; render(); return true; },
  devPage: (key, page) => { pageState[key] = Math.max(0, Math.round(page || 0)); render(); return pageState[key]; },
  get battle() {
    if (!battle) return null;
    return {
      phase: battle.phase, seal: battle.seal, roomIndex: battle.roomIndex, time: battle.time,
      heroesAlive: battle.heroes.filter((h) => h.alive).length,
      heroHp: battle.heroes.map((h) => Math.round(h.hp)),
      monHp: battle.rooms.map((r) => r.mons.map((m) => Math.round(m.hp))),
      loot: battle.rooms[battle.roomIndex]?.utility?.loot ? { ...battle.rooms[battle.roomIndex].utility.loot } : null,
      utility: battle.rooms[battle.roomIndex]?.utility ? {
        kind: battle.rooms[battle.roomIndex].utility.kind,
        workerState: battle.rooms[battle.roomIndex].utility.workerState,
        realtime: battle.rooms[battle.roomIndex].utility.row.realtime ?? null,
      } : null,
      logs: battle.log.length,
    };
  },
  battleUi: () => battle ? {
    speech: [...speechBubbles.values()].map((s) => ({ text: s.node.children.find((c) => c instanceof PIXI.Text)?.text ?? '', kind: s.kind, life: s.life })),
    timeline: [
      ...battle.heroes.filter((h) => h.alive && h.room === battle.roomIndex),
      ...battle.rooms[battle.roomIndex].mons.filter((m) => m.alive),
    ].map((u) => ({ name: u.name, tex: u.tex, progress: actionProgress(u, battle) })),
  } : null,
  deployWorker: () => battle ? deployUtilityWorker(battle) : false,
  evacuateWorker: () => battle ? evacuateUtilityWorker(battle) : false,
  startBattle: () => { startBattle(); return screen; },
  runBattleToEnd: (maxSteps = 20000) => {
    if (!battle || screen !== 'battle') return null;
    let steps = 0;
    while (battle.phase !== 'done' && steps++ < maxSteps) stepBattle(battle, 0.05);
    consumeEvents();
    if (battle.phase === 'done' && battle.result) finishBattle();
    return { screen, steps, result: battle.result };
  },
  get result() { return battle?.result ?? null; },
  get reports() { return S.reports; },
  get audio() { return audioSnapshot(); },
  get endingT() { return endingT; },
  setTab: (t     ) => setTab(t),
  backManage: () => { backToManage(); return screen; },
  pagers: () => livePagers.map((p) => ({ ...p, page: pageState[p.key] ?? 0, focus: pagerFocus === p.key })),
  giveResources: (b        , m        ) => { S.bone += b; S.mana += m; render(); },
  forceRaid: (n        ) => { S.raidNo = n; persist(); render(); },
  devRecruit: (kind        ) => { const inst              = { uid: S.uidNext++, kind, lv: 1, xp: 0 }; S.monsters.push(inst); render(); return inst.uid; },
  devAssign: (room, slot, uid) => { assign(room, slot, uid); return S.rooms[room]?.[slot] ?? null; },
  devPlace: (room        , which         , uid        ) => { S.rooms[room][which] = uid; persist(); render(); },
  devLeader: (room        , uid               ) => { S.rooms[room].leader = uid; if (uid == null) S.rooms[room].flank = null; persist(); render(); },
  devSelKind: (id        ) => { sel = { kind: 'monkind', id }; render(); },
  devSelInst: (uid) => { sel = { kind: 'inst', uid }; render(); },
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
  get graft() { return graft ? { uid: graft.uid, target: graft.target, cat: graft.cat, picks: [...graft.picks], preview: graft.preview } : null; },
  graftOpen: (uid        , target = 'monster') => { openGraft(uid, target); return graft != null; },
  graftPreview: (id        ) => { if (!graft) return null; previewGraftPart(id); return graft.preview; },
  graftPick: (id        ) => { if (!graft) return null; togglePick(id); return [...graft.picks]; },
  graftCat: (c         ) => { if (graft) { graft.cat = c; render(); } },
  graftGo: () => { if (!graft) return null; confirmGraft(); return true; },
  // 朝向自检：角色源图已统一朝向，所有战斗精灵保持正 scale。
  facing: () => {
    const out                                               = [];
    unitSprites.forEach((sp, u) => out.push({ name: u.name, tex: u.tex, side: u.side, sx: Math.sign(sp.scale.x), expected: 1 }));
    return out;
  },
  auraOf: (room        ) => { const c = champById(S.rooms[room].leader); return c ? champKind(c).aura ?? null : null; },
  // 英雄名册（培养页自测用）
  get champs() {
    const chem = chemistry(S.champs, seatedChampUids());
    return S.champs.map((c) => ({
      ...c, stat: statOf(c, chem.map), rest: c.restTurns ? `休息${c.restTurns}回合` : fatigueTier(c.fatigue).text, room: roomOfChamp(c.uid),
      pendingTier: pendingTier(c), title: titleOf(c)?.name ?? null, chem: chemOf(chem.map, c.uid).tags,
    }));
  },
  get chem() { return chemistry(S.champs, seatedChampUids()).lines; },
  heroView: (v                            ) => { heroView = v; render(); },
  titlePreview: (uid, id) => { const c = champById(uid); if (c && unlockedTitles(c).includes(id)) { heroSel = uid; heroView = 'title'; champTitleExpand = id; render(); } return champTitleExpand; },
  titleActivate: (uid, id) => { const c = champById(uid); if (c && unlockedTitles(c).includes(id)) { c.activeTitle = id; champTitleExpand = id; persist(); render(); } return c?.activeTitle ?? null; },
  get vault() { return [...S.vault]; },
  get relic() { return S.relic; },
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
  gearSlot: (sl          ) => { if (GEAR_SLOTS.some((x) => x.id === sl)) { gearSlotSel = sl; render(); } return gearSlotSel; },
  // 逻辑坐标 → 屏幕坐标（自测点按真实按钮用，含黑边偏移）
  toScreen: (x        , y        ) => {
    const rect = app.canvas.getBoundingClientRect();
    const kx = rect.width / app.screen.width, ky = rect.height / app.screen.height;
    return { x: rect.left + (root.x + x * viewScale) * kx, y: rect.top + (root.y + y * viewScale) * ky };
  },
  devWound: (uid        , n        ) => { const c = champById(uid); if (c) c.wounds = n; persist(); render(); return c?.wounds; },
  devHeal: (uid        ) => { const c = champById(uid); if (c) healChamp(c); return champById(uid)?.wounds; },
  devRespec: (uid        ) => { const c = champById(uid); if (c) respecChamp(c); return champById(uid)?.talents; },
  devKills: (uid        , k        , b = 0) => { const c = champById(uid); if (c) { c.kills = k; c.battles = b || c.battles; } persist(); render(); return activeTitleOf(c)?.name ?? null; },
  get cands() { return S.cands.map((c) => ({ ...c, cost: candCostOf(c) })); },
  devChamp: (race        , lv = 1, traits           = []) => {
    const c = newChamp(S.champNext++, { id: 0, race, name: randomName(race, Math.random, S.champs.map((x) => x.name)), traits: traits           , potential: 1 });
    c.lv = Math.max(1, Math.min(CHAMP_LV_CAP, lv));
    S.champs.push(c); S.champPot[c.uid] = 1; persist(); render(); return c.uid;
  },
  devSeat: (room        , uid        ) => { seatChamp(room, uid); return S.rooms[room].leader; },
  heroSelect: (uid        ) => { heroSel = uid; heroTab = 'roster'; champTitleExpand = ''; render(); },
  heroTabSet: (t                      ) => { heroTab = t; render(); },
  devChampXp: (uid        , xp        ) => { const c = champById(uid); if (c) c.xp += xp; persist(); render(); },
  devLevelChamp: (uid        ) => { const c = champById(uid); if (c) levelChamp(c); return c ? c.lv : 0; },
  devPickTalent: (uid        , id        ) => { const c = champById(uid); if (c) pickTalent(c, id            ); return c ? [...c.talents] : []; },
  previewTalent: (uid, id) => { const c = champById(uid); if (c) previewTalent(c, id); return talentPreview ? { ...talentPreview } : null; },
  confirmTalent: (uid) => { const c = champById(uid); if (c) confirmTalent(c); return c ? [...c.talents] : []; },
  devFatigue: (uid        , f        ) => { const c = champById(uid); if (c) c.fatigue = f; persist(); render(); },
  devRotation: (uid, sorties, restTurns) => {
    const c = champById(uid);
    if (!c) return null;
    c.sorties = Math.max(0, Math.min(HERO_SORTIE_LIMIT - 1, Math.round(sorties || 0)));
    c.restTurns = Math.max(0, Math.min(HERO_REST_ROUNDS, Math.round(restTurns || 0)));
    persist(); render();
    return { sorties: c.sorties, restTurns: c.restTurns };
  },
  devRest: (uid        ) => { const c = champById(uid); if (c) restChamp(c); return c ? c.restTurns : -1; },
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
      leads: S.story.leads.map((x) => ({ ...x, context: { ...x.context } })), archive: S.story.archive.map((x) => ({ ...x })),
      relations: { ...S.story.relations }, exiles: S.story.exiles.map((x) => ({ ...x })),
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
  storyLeadOpen: (id        ) => openStoryLead(id),
  storyChronicle: (filter = 'all', ref = null, raid = null) => { openChronicle(filter, ref, raid); return chronicleItems().map((x) => x.id); },
  devHeroRelations: (uids) => { recordHeroRelations(uids); persist(); render(); return { ...S.story.relations }; },
  devDismissHero: (uid) => { const c = champById(uid); if (c) dismissChamp(c); return S.story.exiles.map((x) => x.uid); },
  storyLeadQueue: (key        , sceneId        , source = '测试线索', title = '测试秘闻', context = {}) => {
    const lead = queueStoryLead(key, sceneId, source, title, context); persist(); render(); return lead;
  },
  storyOpen: (id        ) => { const sc = sceneById(id); if (!sc) return false; S.story.credits = Math.max(1, S.story.credits); S.story.credits -= 1; openScene(sc, true); return true; },
  storyChoose: (i        ) => {
    const c = storyRun?.scene.choices?.[i];
    if (!c || !testConds(storyBridge, c.when)) return false;
    resolveExit(c.reply, c.effects, c.next, c.followup ?? storyRun?.scene.followup);
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
  get partList() { return PARTS.map((p) => ({ id: p.id, cat: p.cat, name: p.name, bone: p.bone, unlockRaid: p.unlockRaid, diy: !!p.diy, legendary: !!p.legendary, nativePart: !!p.nativePart, nativeSource: p.nativeSource, tex: p.tex })); },
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
