import * as PIXI from 'pixi.js';
import { C, VIEW_W, VIEW_H, MONSTERS, HERO_CLASSES, THEMES, TRAPS, RAIDS, RAID_BRIEFINGS, NORMAL_RAID_COUNT, AFFIXES, AURAS, LEVEL_MULT, UPGRADE_COST, XP_PER_LEVEL, TEXTURES, HERO_LV_MULT, SYNERGY, synergyOf, kindById, registerKinds, unregisterKind, isCustomKind, isEliteKind, raidAffixInfo } from './data.js';
import { GEARS, GEAR_SLOTS, GEAR_CAP, MELT_MANA, REFORGE_MANA, FRAMES, RUNES, TEMPERS, FORGED_CAP, craftCost, craftKind, craftName, frameById, runeById, runesFor, temperById, planValid, registerForged, gearById, gearEff, gearSet,                                                               } from './gear.js';
                                                                                        
import { createBattle, stepBattle, ROOM_W, affixText, actionProgress, deployUtilityWorker, evacuateUtilityWorker,
  effectiveThorns, effectiveMitigationMultiplier } from './battle.js';
                                                                      
import { CATS, PARTS, AFFIXES as PART_AFFIXES, AFFIX_POWER, PART_BUDGET, DIY_AFFIX_CAP, affixDraftCost, affixPowerById, allLooks, registerDiyAffixes, GRAFT_CAP, GRAFT_MANA, GRAFT_PULL_MANA, graftCostOf, graftKind, legendaryPartCount, AFFIX_CAP, STITCH_MANA, CUSTOM_CAP, DIY_CAP, POWER_MENU, autoName, boneCost, deriveKind, draftCost, partById, registerDiy, affixById, selectedAffixes, unlockedParts, manaCost as affixMana, powerById } from './modules.js';
                                                                                                                          
import { AI_PRESETS, AI_PROMPT_TASKS, NOVEL_PROMPT_PIPELINES, getBackend, hasBackend, llmStatus, loadCfg, loadMode, loadPromptOverrides, loadNovelPromptStructure, normalizeBaseUrl, presetById, refreshModels,
  requestAffix, requestBattleDialogue, requestContextStory, requestHeroLore, requestLiteraryReport, requestPart,
  requestStoryReply, requestOvertimeRaid, requestNovelTurn, requestNovelMission, requestNovelSummary,
  resetNovelPromptStructure, restoreBackend, saveCfg, saveMode, saveNovelPromptStructure, savePromptOverrides, setBackend, requestScene as llmScene } from './llm.js';
                                        
                                           
import { applyEffects, fillText, getProvider, requestScene, sceneById, setProvider, testConds, localProvider, SCENES } from './story.js';
                                                                      
import { READ_PATHS, foldMods, modSummary } from './vars.js';
import { appendNovelEntry, evaluateNovelMission, freshNovelState, mergeNovelFacts, recentNovelContext,
  sanitizeNovelMission, sanitizeNovelState, sanitizeNovelSummary, sanitizeNovelTurn } from './novel.js';
import { clearSlot, exportSlot, flushAutosave, getActiveSlot, importIntoSlot, initSaveStore, listSlots,
  loadSlot, loadSnapshot, queueAutosave, saveSnapshot, setActiveSlot } from './save-store.js';
                                                                        
import { CHAMP_CAP, CHAMP_LV_CAP, CHEM_INFO, HEAL_MANA, HERO_REST_ROUNDS, HERO_SORTIE_LIMIT, POT_MULT, POT_NAME, REROLL_MANA, REST_MANA, RESPEC_MANA,
  REROLL_TRAIT_BONE, REROLL_TRAIT_MANA, TALENTS, TALENT_CAP, TALENT_TIERS, TIER_LV, TRAITS, WOUND_CAP,
  activeTitleOf, auraText, backgroundById, canLevel, champStats, chemOf, chemistry, ensureChampLore, fatigueTier, newChamp, nextTitle, pendingTier, personalityById, randomName, respecCost,
  rerollTraits, rollCands, talentSlots, tickFatigue, titleById, titleOf, unlockedTitles, upCostOf, xpNeed } from './heroes.js';
                                                         
import { TEX, txt, label, labelC, panel, panelF, frame, bar, sprite, Hits, button, setTextRes, FONT,
  boundedText, paginateText, measureWrappedText, resetBoundedTextAudit, boundedTextAudit } from './ui.js';
import { initAudio, unlockAudio, playSfx, playHit, playMusic, setMuted, audioSnapshot, tickAudio } from './audio.js';
import { WORKSHOP_RESEARCH, normalizeResearchPicks, researchAvailability, researchEffects, researchOption } from './research.js';

const GAME_NAME = '勇者去死！';
document.title = GAME_NAME;
for (const name of ['application-name', 'apple-mobile-web-app-title']) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.appendChild(meta); }
  meta.content = GAME_NAME;
}

// ---------- 存档 ----------
               
                                                                                          
                                                                     
                                                                     
                     
                                         
  
             
                                                              
                          
                   
                                     
                                 
                               
                    
                                    
                                        
                                  
                                                       
                                                          
                                                                                        
                                      
                                                         
                                                                      
                                                                                                           
  

const SAVE_KEY = 'yqh-save-v2';
const META_KEY = 'yqh-meta-v1';
const BONE_PER_MANA = 5;
const EXCHANGE_EFFICIENCY = 0.8;
const BONE_EXCHANGE_LOT = 25;
const MANA_EXCHANGE_LOT = 5;
const LORD_NAMES = ['莫老板', '骨德纲', '冥小满', '赫尔加班', '维克多欠薪', '黛西灭灯'];
const LAIR_NAMES = ['亏损堡', '不归乡办事处', '骨头湾分部', '黑灯地牢', '最后一笔矿坑', '偏远王座'];

const DOCTRINES = {
  default: { id: 'default', name: '守成王座', tag: '标准', desc: '封印上限+25%。经济与兵力保持标准规则，容错最高，适合稳步构筑四层防线。' },
  swarm: { id: 'swarm', name: '群巢敕令', tag: '扩军', desc: '怪群编制+4；招募与扩编费用-40%。代价：怪物生命和攻击-15%，升级费用+30%。以数量、轮换和多房消耗取胜。' },
  elite: { id: 'elite', name: '精兵誓约', tag: '精锐', desc: '怪物与英雄生命、攻击+30%，战后经验+75%，升级费用-25%。代价：怪群编制-2，招募费用+30%。' },
  economy: { id: 'economy', name: '深层经营', tag: '设施', desc: '设施产出+100%，设施与扩层费用-35%。代价：战斗奖励-40%、封印上限-20%。用经营滚起后期优势。' },
};
const MONSTER_CAP_TIERS = [4, 6, 8, 10, 12, 14];
const MONSTER_CAP_UNLOCK = [1, 4, 7, 10, 14, 18];
const MONSTER_CAP_COST = [null, { bone: 80, mana: 0 }, { bone: 180, mana: 0 }, { bone: 340, mana: 0 },
  { bone: 520, mana: 20 }, { bone: 760, mana: 50 }];

function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    return { clears: Math.max(0, Math.round(raw?.clears || 0)) };
  } catch { return { clears: 0 }; }
}
function persistMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function doctrine() { return DOCTRINES[S.doctrine] ?? DOCTRINES.default; }
function monsterCap() { return Math.max(2, Math.round(S.monsterCap || MONSTER_CAP_TIERS[0]) + (S.doctrine === 'swarm' ? 4 : S.doctrine === 'elite' ? -2 : 0)); }
function nextMonsterCapTier() {
  const baseCap = Math.round(S.monsterCap || MONSTER_CAP_TIERS[0]);
  const index = MONSTER_CAP_TIERS.findIndex((n) => n > baseCap);
  if (index < 0) return null;
  const raw = MONSTER_CAP_COST[index];
  const discount = S.doctrine === 'swarm' ? 0.6 : 1;
  return { index, cap: MONSTER_CAP_TIERS[index] + (S.doctrine === 'swarm' ? 4 : S.doctrine === 'elite' ? -2 : 0), unlock: MONSTER_CAP_UNLOCK[index],
    bone: Math.round(raw.bone * discount), mana: raw.mana };
}

function doctrineCost(kind, bone, mana = 0) {
  let mult = 1;
  if (kind === 'facility' && S.doctrine === 'economy') mult = 0.65;
  if (kind === 'floor' && S.doctrine === 'economy') mult = 0.65;
  if (kind === 'recruit' && S.doctrine === 'swarm') mult = 0.60;
  if (kind === 'recruit' && S.doctrine === 'elite') mult = 1.30;
  if (kind === 'upgrade' && S.doctrine === 'swarm') mult = 1.30;
  if (kind === 'upgrade' && S.doctrine === 'elite') mult = 0.75;
  return { bone: Math.max(0, Math.ceil(bone * mult)), mana: Math.max(0, Math.ceil(mana * mult)) };
}

function exchangeQuote(direction) {
  return direction === 'bone-to-mana'
    ? { payBone: BONE_EXCHANGE_LOT, payMana: 0, getBone: 0, getMana: Math.floor(BONE_EXCHANGE_LOT / BONE_PER_MANA * EXCHANGE_EFFICIENCY) }
    : { payBone: 0, payMana: MANA_EXCHANGE_LOT, getBone: Math.floor(MANA_EXCHANGE_LOT * BONE_PER_MANA * EXCHANGE_EFFICIENCY), getMana: 0 };
}

function exchangeResource(direction) {
  const q = exchangeQuote(direction);
  if (exchangeConfirm !== direction) { exchangeConfirm = direction; say(`再次点击确认兑换：${q.payBone ? `${q.payBone}骨币` : `${q.payMana}魔质`} → ${q.getBone ? `${q.getBone}骨币` : `${q.getMana}魔质`}`); render(); return false; }
  exchangeConfirm = '';
  if (S.bone < q.payBone || S.mana < q.payMana) { say('兑换资源不足'); render(); return false; }
  S.bone += q.getBone - q.payBone; S.mana += q.getMana - q.payMana;
  persist(); playSfx('buy'); say(`兑换完成：获得${q.getBone ? `${q.getBone}骨币` : `${q.getMana}魔质`}`); render(); return true;
}

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

const freshBattleRoom = () => ({ theme: 'stone', trap: 'none', trap2: 'none', front: null, back: null, leader: null, flank: null });
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

function freshSave(selectedDoctrine = 'default')       {
  const floors = Array.from({ length: BASE_NEW_FLOORS }, (_, i) => freshFloor(i + 1));
  return {
    bone: 95, mana: 18, relic: 0, raidNo: 1, uidNext: 1, campaignVersion: 2,
    playerName: LORD_NAMES[0], lairName: LAIR_NAMES[0], introSeen: false, onlineRaids: {},
    doctrine: selectedDoctrine in DOCTRINES ? selectedDoctrine : 'default', monsterCap: MONSTER_CAP_TIERS[0],
    monsters: [],
    floors, rooms: floors.map((f) => f.battle),
    dungeon: {
      unlockedFloors: BASE_NEW_FLOORS, notoriety: 0, healingCharges: 0,
      repairPoints: 0, forgeCharges: 0, forgeDiscount: 0,
      hatcheryCharges: 0, hatcheryDiscount: 0,
      vaultPriority: 'mana', lastEconomy: null, facilityActionRaid: 0,
    },
    themes: ['stone'], traps: ['none'],
    workshopResearch: {},
    sealLv: 0, trapLv: 0,
    best: {}, reports: [],
    failureRelief: {}, reliefNotices: [],
    overtime: false, otRaid: NORMAL_RAID_COUNT + 1, clearRecorded: false,
    raidBriefingsSeen: [],
    customs: [], cstNext: 1,
    diy: [], diyNext: 1,
    diyAf: [], diyAfNext: 1,
    muted: false, seenClasses: [], tutorial: { step: 0, visited: {}, roundSteps: {}, heroGift: false },
    champs: [], champNext: 1, cands: [], candRaid: 0, candNext: 1, champPot: {},
    vault: [], forged: [], fgNext: 1,
    story: { vars: {}, mods: [], unlocks: [], seen: [], credits: 1, leads: [], archive: [], leadNext: 1,
      relations: {}, exiles: [], exileNext: 1 },
    novel: freshNovelState(),
  };
}

let S       = freshSave();
let meta = loadMeta();
let saveExists = false;
let saveSlots = [];

function installSave(raw) {
  try {
    if (!raw) return;
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
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

async function loadSave() {
  const raw = await loadSlot(getActiveSlot());
  if (raw) installSave(raw);
  saveSlots = await listSlots();
  saveExists = !!saveSlots.find((slot) => slot.slot === getActiveSlot())?.exists;
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
  S.playerName = String(S.playerName || S.story?.vars?.playerName || LORD_NAMES[0]).trim().slice(0, 12) || LORD_NAMES[0];
  S.lairName = String(S.lairName || S.story?.vars?.lairName || LAIR_NAMES[0]).trim().slice(0, 16) || LAIR_NAMES[0];
  S.onlineRaids = S.onlineRaids && typeof S.onlineRaids === 'object' ? S.onlineRaids : {};
  S.novel = sanitizeNovelState(S.novel);
  S.introSeen = !!S.introSeen || S.raidNo > 1 || S.overtime;
  S.reports = Array.isArray(S.reports) ? S.reports.filter((report) => report && typeof report.raidNo === 'number').slice(0, 5) : [];
  S.failureRelief = S.failureRelief && typeof S.failureRelief === 'object' ? S.failureRelief : {};
  S.reliefNotices = Array.isArray(S.reliefNotices) ? S.reliefNotices.filter((notice) => notice && typeof notice.title === 'string' && typeof notice.body === 'string').slice(-4) : [];
  for (const report of S.reports) if (report.aiState === 'pending') report.aiState = report.literary ? 'done' : 'fallback';
  if (Math.round(S.campaignVersion || 0) < 2 && S.overtime) S.otRaid = Math.max(NORMAL_RAID_COUNT + 1, Math.round(S.otRaid || 13) + 8);
  S.campaignVersion = 2;
  S.doctrine = S.doctrine in DOCTRINES ? S.doctrine : 'default';
  S.workshopResearch = normalizeResearchPicks(S.workshopResearch);
  S.raidBriefingsSeen = Array.isArray(S.raidBriefingsSeen)
    ? [...new Set(S.raidBriefingsSeen.map((n) => Math.round(n)).filter((n) => n >= 1 && n <= NORMAL_RAID_COUNT))] : [];
  const legacyCap = MONSTER_CAP_TIERS.find((n) => n >= Math.max(MONSTER_CAP_TIERS[0], S.monsters?.length || 0))
    ?? MONSTER_CAP_TIERS.at(-1);
  S.monsterCap = MONSTER_CAP_TIERS.includes(Math.round(S.monsterCap)) ? Math.round(S.monsterCap) : legacyCap;
  if (S.overtime) {
    meta.clears = Math.max(1, meta.clears);
    S.clearRecorded = true;
    persistMeta();
  }
  const legacyTutorial = typeof S.tutorial === 'number' ? S.tutorial : 0;
  if (!S.tutorial || typeof S.tutorial !== 'object') S.tutorial = { step: legacyTutorial, visited: {} };
  S.tutorial.step = Math.max(0, Math.min(8, Math.round(S.tutorial.step || 0)));
  if (!S.tutorial.visited || typeof S.tutorial.visited !== 'object') S.tutorial.visited = {};
  if (!S.tutorial.roundSteps || typeof S.tutorial.roundSteps !== 'object') S.tutorial.roundSteps = {};
  S.tutorial.heroGift = !!S.tutorial.heroGift;
  // 旧档已越过第一轮时不重新触发强制新手流程。
  if (S.raidNo > 1) S.tutorial.step = 8;
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
    if (!(r.trap2 in TRAPS)) r.trap2 = 'none';
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
  applyProgressionGrants();
  S.monsters = S.monsters.filter((m) => kindById(m.kind) != null || S.customs.some((d) => d.id === m.kind));
  // 改造件：清掉已不存在的部件 id（拆解 DIY 造件后旧存档里可能残留），并截到上限
  for (const m of S.monsters) {
    m.lawMarks = Array.isArray(m.lawMarks) ? [...new Set(m.lawMarks.filter((x) => x in LAW_AUDIT_TEXT))] : [];
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
    c.forcedRaid = Number.isFinite(Number(c.forcedRaid)) && Math.round(Number(c.forcedRaid)) === (S.overtime ? S.otRaid : S.raidNo)
      ? Math.round(Number(c.forcedRaid)) : undefined;
    c.battles = Math.max(0, Math.round(c.battles || 0));
    c.kills = Math.max(0, Math.round(c.kills || 0));
    c.wounds = Math.max(0, Math.min(WOUND_CAP, Math.round(c.wounds || 0)));
    c.activeTitle = c.activeTitle ?? '';
    c.stats = c.stats ?? {};
    c.lawMarks = Array.isArray(c.lawMarks) ? [...new Set(c.lawMarks.filter((x) => x in LAW_AUDIT_TEXT))] : [];
    c.traits = (Array.isArray(c.traits) ? c.traits : []).filter((t) => t in TRAITS).slice(0, 2);
    c.talents = (Array.isArray(c.talents) ? c.talents : []).filter((t) => t in TALENTS).slice(0, talentSlots(c));
    const lore = c.aiLore;
    if (lore && typeof lore === 'object' && ['personalityName', 'personalityDesc', 'backgroundName', 'backgroundStory']
      .every((key) => typeof lore[key] === 'string' && lore[key].trim())) {
      c.aiLore = {
        personalityName: lore.personalityName.trim().slice(0, 8), personalityDesc: lore.personalityDesc.trim().slice(0, 140),
        backgroundName: lore.backgroundName.trim().slice(0, 14), backgroundStory: lore.backgroundStory.trim().slice(0, 360),
        via: String(lore.via ?? 'AI').slice(0, 80), updatedRaid: Math.max(1, Math.round(lore.updatedRaid || 1)),
      };
    } else delete c.aiLore;
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
  saveExists = true; saveFlash = 1.2;
  void queueAutosave(S).catch(() => { say('自动存档写入失败，请检查浏览器存储空间'); });
}

async function exportSave() {
  try {
    const data = await exportSlot();
    if (!data) { say('没有可导出的存档'); return; }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
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
      const text = await file.text(), parsed = JSON.parse(text);
      await importIntoSlot(parsed);
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
  const doctrineYield = S.doctrine === 'economy' ? 2 : 1;
  const mult = depth * condition * staffed * personaYield * doctrineYield;
  const targets = u.trainTargets.map((x) => ({ ...x }));
  return {
    bone: d.yields && u.kind === 'bone-yard' ? Math.max(0, Math.round(d.yields[lv] * mult)) : 0,
    mana: d.yields && u.kind === 'mana-well' ? Math.max(0, Math.round(d.yields[lv] * mult)) : 0,
    xp: u.kind === 'training' && targets.length ? Math.max(0, Math.round(d.xp[lv] * condition * personaYield * doctrineYield)) : 0,
    repair: u.kind === 'workshop' ? Math.max(0, Math.round(d.repair[lv] * condition * staffed * personaYield * doctrineYield)) : 0,
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
  const cost = doctrineCost('facility', d.bone, d.mana);
  const depth = Math.round((DEPTH_MULT[floorIndex] ?? 0.8) * 100);
  const effect = kind === 'bone-yard' ? `Lv1基础每轮10骨币；本层深度效率${depth}%，可指派员工。`
    : kind === 'mana-well' ? `Lv1基础每轮3魔质；本层深度效率${depth}%，可指派员工。`
      : kind === 'training' ? 'Lv1提供1个训练位，每名未参战单位每轮获得8经验。'
        : kind === 'healing' ? 'Lv1每轮提供1次疗愈资格；没有可用疗愈池时不能疗愈英雄。'
          : kind === 'workshop' ? 'Lv1每轮提供10维修点，并提供1次5%的锻造或改造优惠。'
            : kind === 'hatchery' ? 'Lv1每轮提供1次普通怪物招募优惠，骨币消耗降低8%。'
              : 'Lv1保护20骨币与5魔质；被攻破后保护能力会随损坏下降。';
  return `${d.desc}\n${effect}\n建造成本：${cost.bone}骨币${cost.mana ? `＋${cost.mana}魔质` : ''}。`;
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
  const doctrineBase = doctrineCost('recruit', k.cost).bone;
  // 第一轮的史莱姆与骷髅弓手是强制教学步骤。方针可以给优惠，但不能把这两笔
  // 必需消费抬到基础价以上，否则“精兵誓约”等未来价格倍率会锁死新手流程。
  const protectedByTutorial = !S.overtime && S.raidNo === 1 && (k.id === 'slime' || k.id === 'archer')
    && !S.monsters.some((monster) => monster.kind === k.id);
  const base = protectedByTutorial ? Math.min(doctrineBase, k.cost) : doctrineBase;
  return { cost: Math.max(1, Math.ceil(base * (1 - discount))), discount, base,
    tutorialPrice: protectedByTutorial && base < doctrineBase };
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
  return doctrineCost('facility', Math.round(d.bone * mult), Math.round(d.mana * mult));
}

// 正式战役以 raidNo 计轮；加班模式只推进 otRaid。设施行动必须跟随真实的
// 下一场入侵编号，否则通关后 S.raidNo 固定为 20，会永久显示“本轮已建设”。
function facilityActionAvailable() { return S.dungeon.facilityActionRaid !== currentRaidIdentity(); }

function buildUtility(floorIndex, kind) {
  const floor = S.floors[floorIndex], d = UTILITY_KINDS[kind];
  if (!floor || !d || kind === 'none' || floor.utility.kind !== 'none') return;
  if (!facilityActionAvailable()) { say('本轮已经建设过设施，完成下一次袭击后才能继续'); return; }
  const cost = doctrineCost('facility', d.bone, d.mana);
  if (S.bone < cost.bone || S.mana < cost.mana) { say('建造资源不足'); return; }
  S.bone -= cost.bone; S.mana -= cost.mana;
  floor.utility = freshUtilityRoom({ kind, level: 1, condition: 100, workerUid: null, trainTargets: [] });
  S.dungeon.facilityActionRaid = currentRaidIdentity();
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
  S.dungeon.facilityActionRaid = currentRaidIdentity();
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
  const raw = FLOOR_EXPAND[S.floors.length];
  const cost = raw && doctrineCost('floor', raw.bone, raw.mana);
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
  const active = seatedChampUids().filter((uid) => { const c = champById(uid); return c && (!(c.restTurns || 0) || heroForcedThisRaid(c)); });
  const chem = chemistry(S.champs, active).map;
  const m                                                = {};
  for (const c of S.champs) if (!(c.restTurns || 0) || heroForcedThisRaid(c)) m[c.uid] = statOf(c, chem);
  return m;
}
const seatedChampUids = () => S.rooms.map((r) => r.leader).filter((u)              => u != null);
const roomOfChamp = (uid        ) => S.rooms.findIndex((r) => r.leader === uid);
function currentRaid()          {
  if (!S.overtime && S.raidNo <= NORMAL_RAID_COUNT) return RAIDS[S.raidNo - 1];
  if (S.novel?.enabled && S.novel.pendingMission && !S.novel.pendingMission.resolved
    && S.novel.pendingMission.issuedRaid === S.otRaid) {
    const mission = S.novel.pendingMission;
    const base = makeOvertimeRaid(S.otRaid);
    return { no: S.otRaid, title: mission.title, members: mission.members, affixes: mission.affixes,
      reward: base.reward, novel: true, missionId: mission.id, briefing: { body: mission.body, reply: `${S.playerName}批准了这张不太吉利的出差单。` } };
  }
  if (S.onlineRaids?.[S.otRaid]) return S.onlineRaids[S.otRaid];
  return makeOvertimeRaid(S.otRaid);
}
function makeOvertimeRaid(no        )          {
  const batch = Math.max(1, no - NORMAL_RAID_COUNT);
  const lv = 18 + batch * 2;
  const pool = ['knight', 'archer', 'cleric', 'mage', 'rogue', 'paladin', 'berserker', 'ranger', 'bard', 'alchemist', 'monk', 'lancer', 'warlock'];
  const bosses = ['captain', 'inquisitor', 'swordmaster'];
  const members = [{ cls: bosses[(batch - 1) % bosses.length], lv: lv + 1 }];
  for (let i = 0; i < 4; i++) members.push({ cls: pool[(no * 3 + i * 2) % pool.length], lv });
  const affPool              = [['haste'], ['brave'], ['shield'], ['holywater', 'brave'], ['haste', 'shield']];
  return {
    no, title: `加班勇者 第${batch}批`, members,
    affixes: affPool[(batch - 1) % affPool.length],
    reward: { bone: 280 + batch * 24, mana: 180 + batch * 12 },
  };
}

async function prepareOnlineOvertimeRaid() {
  if (!S.overtime || S.novel?.enabled || loadMode() !== 'http' || S.onlineRaids?.[S.otRaid]) return null;
  const batch = Math.max(1, S.otRaid - NORMAL_RAID_COUNT), fallback = makeOvertimeRaid(S.otRaid);
  battlePrepBusy = true; say('线上叙事者正在签发本批勇者的出差单…'); render();
  try {
    const generated = await requestOvertimeRaid({ batch, no: S.otRaid, minLevel: 18 + batch * 2, maxLevel: 21 + batch * 2,
      playerName: S.playerName, lairName: S.lairName, recent: Object.values(S.onlineRaids ?? {}).slice(-3).map((raid) => raid.title),
      defense: { floors: S.rooms.length, monsters: countPlaced(), heroes: seatedChampUids().length } });
    if (!generated) return null;
    const raid = { no: S.otRaid, title: generated.title, members: generated.members, affixes: generated.affixes,
      reward: fallback.reward, online: true, briefing: { body: generated.body, reply: generated.reply } };
    S.onlineRaids[S.otRaid] = raid; persist(); return raid;
  } finally { battlePrepBusy = false; render(); }
}
const MONSTER_UPGRADE_MANA = [0, 0, 12, 28];
function monsterUpgradeQuote(inst) {
  const index = Math.max(0, Math.min(UPGRADE_COST.length - 1, inst.lv - 1));
  return doctrineCost('upgrade', UPGRADE_COST[index], MONSTER_UPGRADE_MANA[index]);
}
function upgradeMonster(inst) {
  if (!inst || inst.lv >= 5) return false;
  const need = XP_PER_LEVEL[inst.lv - 1], q = monsterUpgradeQuote(inst);
  if (inst.xp < need || S.bone < q.bone || S.mana < q.mana) return false;
  inst.xp -= need; S.bone -= q.bone; S.mana -= q.mana; inst.lv++;
  playSfx('buy'); persist(); say(`${instKind(inst).name} 升到 Lv${inst.lv}`); render();
  return true;
}
function heroUpgradeQuote(c) {
  const mana = c.lv < 5 ? 0 : [10, 15, 20, 30, 45][Math.min(4, c.lv - 5)];
  return doctrineCost('upgrade', upCostOf(c), mana);
}
function heroUpgradeMana(c) { return heroUpgradeQuote(c).mana; }
function heroUpgradeBone(c) { return heroUpgradeQuote(c).bone; }
function expandMonsterCap() {
  const next = nextMonsterCapTier();
  if (!next) { say('怪群编制已经扩至上限'); return; }
  if (!S.overtime && S.raidNo < next.unlock) { say(`第${next.unlock}回合开放下一次扩编`); return; }
  if (S.bone < next.bone || S.mana < next.mana) { say('扩编资源不足'); return; }
  S.bone -= next.bone; S.mana -= next.mana;
  S.monsterCap = MONSTER_CAP_TIERS[next.index];
  playSfx('buy'); persist(); say(`怪群编制扩充至 ${monsterCap()}`); render();
}
function canUpgradeAny() {
  return S.monsters.some((m) => {
    const q = monsterUpgradeQuote(m);
    return m.lv < 5 && m.xp >= XP_PER_LEVEL[m.lv - 1] && S.bone >= q.bone && S.mana >= q.mana;
  });
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
const NAV_ZONES = [
  { id: 'throne', name: '王座' }, { id: 'dungeon', name: '地牢' },
  { id: 'army', name: '军团' }, { id: 'shop', name: '工坊' }, { id: 'archive', name: '档案' },
];
const PAGE_ZONE = { throne: 'throne', dungeon: 'dungeon', hero: 'army', mob: 'army', shop: 'shop', report: 'archive', story: 'archive' };
const UI_DENSITY_KEY = 'yqh-ui-density-v1';
const UI_SHELL_TOUR_KEY = 'yqh-ui-shell-tour-v1';
const API_CONNECT_COUNT_KEY = 'yqh-ai-connect-count-v1';
const ONLINE_MODE_TOUR_KEY = 'yqh-online-mode-tour-v1';
let armySection = 'mob';
let archiveSection = 'report';
let novelBusy = false;
let novelEnableConfirm = false;
let novelInputRect = null;
let novelDecisionRoot = null;
let selectedEntity = null;
let inspectorView = 'summary';
let desktopSystemMenu = false;
let uiDensity = localStorage.getItem(UI_DENSITY_KEY) === 'expert' ? 'expert' : 'standard';
let uiShellTourStep = localStorage.getItem(UI_SHELL_TOUR_KEY) === 'done' ? 4 : 0;
let onlineTourPending = false;
const activeZone = () => PAGE_ZONE[tab] ?? 'throne';
const novelAvailable = () => !!S.overtime && loadMode() === 'http';
const pageName = (page) => NAV_ZONES.find((item) => item.id === (PAGE_ZONE[page] ?? page))?.name
  ?? TABS.find((item) => item.id === page)?.name ?? page;
const zoneOpen = (id) => id === 'army' ? featureOpen('mob') : id === 'archive' ? featureOpen('report') : featureOpen(id);
const visibleZones = () => NAV_ZONES.filter((item) => zoneOpen(item.id));
const FEATURE_RAID = {
  throne: 1, dungeon: 1, mob: 1,
  report: 2, dungeonTools: 2,
  hero: 6,
  shop: 4, facilities: 4,
  monsterCreation: 5,
  story: 5,
  equipmentForge: 7,
  heroTalent: 8,
  heroGraft: 9,
};
const featureOpen = (id) => S.overtime || S.raidNo >= (FEATURE_RAID[id] ?? 1);
const visibleTabs = () => TABS.filter((item) => featureOpen(item.id));
function applyProgressionGrants() {
  if ((S.overtime || S.raidNo >= 2) && !S.traps.includes('spike')) S.traps.push('spike');
  const t = tutorialData();
  if ((S.overtime || S.raidNo >= 6) && !t.heroGift && S.champs.length < CHAMP_CAP) {
    const gift = newChamp(S.champNext++, {
      id: -6, race: 'lich', name: randomName('lich', () => 0.36, S.champs.map((c) => c.name)), traits: ['loyal'], potential: 0,
    });
    gift.introGift = true;
    S.champs.push(gift);
    S.champPot[gift.uid] = 0;
    t.heroGift = true;
  }
}
const tutorialData = () => {
  if (!S.tutorial || typeof S.tutorial !== 'object') S.tutorial = { step: 0, visited: {}, roundSteps: {}, heroGift: false };
  if (!S.tutorial.visited || typeof S.tutorial.visited !== 'object') S.tutorial.visited = {};
  if (!S.tutorial.roundSteps || typeof S.tutorial.roundSteps !== 'object') S.tutorial.roundSteps = {};
  return S.tutorial;
};
const monsterOfKind = (kind) => S.monsters.find((m) => m.kind === kind);
const tutorialDeploymentReady = () => {
  const slime = monsterOfKind('slime');
  const archer = monsterOfKind('archer');
  return !!slime && !!archer && S.rooms.some((room) => room.front === slime.uid && room.back === archer.uid);
};
function syncTutorialProgress() {
  const t = tutorialData();
  if (S.raidNo > 1 || S.overtime) { t.step = 8; return t.step; }
  if (t.step < 1 && tab === 'mob') t.step = 1;
  if (monsterOfKind('slime')) t.step = Math.max(t.step, 2);
  if (monsterOfKind('slime') && monsterOfKind('archer')) t.step = Math.max(t.step, 3);
  if (t.step >= 3 && tab === 'dungeon') t.step = Math.max(t.step, 4);
  if (tutorialDeploymentReady()) t.step = Math.max(t.step, 5);
  if (t.step >= 5 && tab === 'throne') t.step = Math.max(t.step, 6);
  return t.step;
}
function markTabVisited(id) {
  tutorialData().visited[`${S.raidNo}:${id}`] = true;
}
function firstRaidRecruitKinds() {
  const step = syncTutorialProgress();
  if (S.raidNo !== 1 || step >= 8) return null;
  if (step < 2) return ['slime'];
  if (step < 3) return ['archer'];
  return ['slime', 'archer'];
}
function recruitKindOpen(k) {
  if (S.overtime) return true;
  if (isCustomKind(k.id)) return featureOpen('monsterCreation');
  if (isEliteKind(k.id)) return S.raidNo >= Math.max(5, k.eliteMin ?? 5);
  if (k.legend) return S.raidNo >= Math.max(5, k.legendMin ?? 5);
  const raid = { slime: 1, archer: 1, goblin: 2, bat: 2, shaman: 3, ogre: 4 }[k.id] ?? 5;
  return S.raidNo >= raid;
}
const ROUND_TUTORIALS = {
  2: [
    { page: 'report', target: 'reportPanel', title: '战报开放', detail: '战报会说明胜负原因、逐房表现和每个单位的贡献，先复盘再调整阵容。' },
    { page: 'dungeon', target: 'dungeonTools', title: '房间机关开放', detail: '战斗房现在可以设置主题与陷阱；本轮赠送“尖刺”，让它成为另一种过关办法。' },
    { page: 'mob', target: 'mobRoster', title: '新兵种开放', detail: '哥布林擅长快速补刀，蝙蝠能骚扰后排；也可以不招兵，保留资源升级旧部。' },
  ],
  3: [
    { page: 'mob', target: 'mobRoster', title: '支援兵种开放', detail: '蘑菇巫医能在毒雾与治疗间轮换；也可以继续升级旧部，用成长代替扩编。' },
    { page: 'dungeon', target: 'frontSlot', title: '多房防线', detail: '勇者会逐层深入。可以集中守住入口，也可以把前后排分配到不同楼层消耗敌人。' },
  ],
  4: [
    { page: 'dungeon', target: 'facilityArea', title: '资源房开放', detail: '每层内侧可建资源房：生产、训练、疗愈或保护资源。每轮最多建造或升级一次。' },
    { page: 'shop', target: 'shopArea', title: '工坊开放', detail: '工坊出售主题、陷阱和永久强化。购买强化、扩充守军或培养英雄都能应对本轮。' },
  ],
  5: [
    { page: 'mob', target: 'monsterCreation', title: '怪物创造开放', detail: '可以用四个部件创造或全身改造单位；这是高自由度方案，不是本轮强制消费。' },
    { page: 'story', target: 'storyArea', title: '秘闻开放', detail: '经营与战斗会产生秘闻线索，选择会明确改变后续数轮的战斗或经营效果。' },
  ],
  6: [
    { page: 'hero', target: 'heroRoster', title: '获赠巫妖英雄', detail: '地牢获赠一名资质丙的巫妖英雄。英雄是有名字的长期个体，资质影响基础成长，但培养方向更重要。' },
    { page: 'hero', target: 'heroTraits', title: '特性与档案', detail: '详情页记录英雄特性、性格和背景；特性会改变战斗方式，也可以支付资源重新随机。' },
    { page: 'hero', target: 'heroGear', title: '装备系统', detail: '英雄有冠、铠、饰三个装备槽。战斗会掉落装备，第7轮才开放主动锻造。' },
    { page: 'hero', target: 'heroTitle', title: '称号系统', detail: '称号由战斗履历解锁，可反复切换并提供不同加成；未达成的称号会显示下一目标。' },
    { page: 'hero', target: 'heroStat', title: '等级与成长', detail: '英雄获得经验后需要消耗骨币升级；专精将在第8轮开放。第6轮暂不开放英雄全身改造。' },
    { page: 'dungeon', target: 'leaderSlot', title: '统领与侧翼开放', detail: '把英雄放入统领席即可带领本房守军并开启侧翼位；本轮也可以继续使用纯怪物阵容。' },
  ],
  7: [
    { page: 'throne', target: 'raidPanel', title: '勇者词缀・无畏', detail: '从本轮起勇者会携带团队词缀。“无畏”会强化进攻，战前应先在王座确认敌方规则。' },
    { page: 'report', target: 'reportPanel', title: '装备缴获', detail: '战报会列出本轮缴获的装备；品质与词条不同，先看完整效果再决定给谁穿戴。' },
    { page: 'hero', target: 'heroGear', title: '装备锻造开放', detail: '装备页现在开放锻造台，可以组合胚体、铭文与淬火；直接使用战利品同样是可行路线。' },
  ],
  8: [
    { page: 'throne', target: 'raidPanel', title: '勇者词缀・护盾', detail: '本轮勇者携带护盾词缀，爆发会被吸收；持续伤害、快速攻击或更长防线更有效。' },
    { page: 'hero', target: 'heroStat', title: '英雄升级', detail: '检查经验并升级英雄。升级提高基础属性，并在3、5、7、10级依次获得专精选择。' },
    { page: 'hero', target: 'heroTalent', title: '英雄专精开放', detail: '点击专精名称只会预览效果，确认后才学习；每层五选一，可塑造输出、防守或指挥路线。' },
  ],
  9: [
    { page: 'throne', target: 'raidPanel', title: '勇者词缀・迅捷', detail: '本轮勇者行动更快。减速、控制、前排拖延和多房分层都能抵消速度优势。' },
    { page: 'hero', target: 'heroGraft', title: '英雄全身改造开放', detail: '英雄现在可以替换核心、头部、肢臂和足部，消耗为怪物改造的两倍；预览不会立即扣费。' },
    { page: 'dungeon', target: 'leaderSlot', title: '改造后的统领', detail: '英雄改造后的外观与属性会同步用于名册、地牢部署和战斗，不会回退成原始立绘。' },
  ],
  10: [
    { page: 'throne', target: 'raidPanel', title: '勇者词缀・圣水', detail: '圣水会削弱部分持续伤害效果，检查战报并准备物理输出或控制作为替代方案。' },
    { page: 'hero', target: 'heroRest', title: '四战轮休', detail: '英雄累计出战4场后必须休息3回合。轮换统领能避免关键房间在下一轮突然空缺。' },
    { page: 'dungeon', target: 'facilityArea', title: '疗愈与轮换', detail: '建造疗愈池后，英雄页可花20魔质减少1回合休息；没有疗愈池时按钮不会开放。' },
  ],
  11: [
    { page: 'shop', target: 'workshopResearch', title: '高端路线开放', detail: '每组研究三选一且永久锁定其余选项。先预览即可，本轮不要求购买或定型。' },
    { page: 'report', target: 'reportPanel', title: '文学化战报', detail: '战报保留真实数字与逐房复盘，也可由已接入的AI润色叙述；AI失败时仍使用本地版本。' },
  ],
  12: [
    { page: 'shop', target: 'workshopResearch', title: '阵列武装开放', detail: '后排炮列、前线冲压机和统领传动轴会重写站位收益。根据常用阵型选择，不必立刻消费。' },
    { page: 'story', target: 'storyArea', title: '上下文秘闻', detail: '秘闻会引用相关英雄、设施、旧档案与战报；选项效果仍由本地规则锁定并明确显示。' },
  ],
  13: [
    { page: 'shop', target: 'diyWorkshop', title: 'DIY能力扩展', detail: '造部件与造词缀可组合复活、碎盾、贯穿、护盾等能力，分数预算会约束强度。' },
    { page: 'shop', target: 'diyWorkshop', title: '草案独立保存', detail: '部件、词缀和图鉴各自保留未完成内容；切换标签不会清空部位、愿望或能力选择。' },
  ],
  14: [
    { page: 'shop', target: 'workshopResearch', title: '陷阱工程开放', detail: '可选双陷阱、单发超压或防拆路线。每项都有代价，先结合房间数量比较。' },
    { page: 'dungeon', target: 'dungeonTools', title: '陷阱成为流派', detail: '双轨路线允许每房两个独立陷阱但单枚降功率；其他路线继续保留单槽并强化质量。' },
  ],
  15: [
    { page: 'hero', target: 'heroLore', title: 'AI英雄档案', detail: '详情页可让AI结合战绩、称号与秘闻重构性格背景；只改文字，不修改任何战斗数值。' },
    { page: 'story', target: 'storyArea', title: '档案回链', detail: '英雄、设施、战报与秘闻已互相引用。可从具体对象进入编年史，追踪一条长期故事。' },
  ],
  16: [
    { page: 'shop', target: 'workshopResearch', title: '军团底盘开放', detail: '吸血、厚甲和高速路线会改变整支怪物军团的生存节奏，并各自附带明确弱点。' },
    { page: 'shop', target: 'workshopResearch', title: '兵员铸造开放', detail: '精兵强将提高DIY预算与能力槽；巨构强化数值上限；流水目录偏向低价量产。' },
  ],
  17: [
    { page: 'hero', target: 'heroForce', title: '强制驱使', detail: '休息英雄可二次确认支付300骨币与100魔质参加本场，但本场不会减少休息回合。' },
    { page: 'hero', target: 'heroRest', title: '疗愈还是强征', detail: '疗愈便宜但需要疗愈池并逐回合缩短休息；强征昂贵，只适合关键防线救急。' },
  ],
  18: [
    { page: 'shop', target: 'workshopResearch', title: '终局母机开放', detail: '极限输出、极限生存和状态机关三选一，会完成本局核心构筑；确认后不可改选。' },
    { page: 'throne', target: 'raidPanel', title: '终盘强度上升', detail: '第16轮后敌军明显增强。先读职业与词缀，再用房间、陷阱和研究补齐短板。' },
  ],
  19: [
    { page: 'shop', target: 'settings', title: '提示词可以编辑', detail: '桌面点顶部设置，手机从系统菜单进入“提示词”，可分别调整七类AI任务的创作方向。' },
    { page: 'shop', target: 'aiWorkshop', title: 'AI始终可选', detail: 'AI用于叙事和创作，不负责结算。未接入、超时或返回异常时，核心玩法继续使用本地内容。' },
  ],
  20: [
    { page: 'throne', target: 'raidPanel', title: '终局整备', detail: '四层满编、5级精英与四名8级英雄是参考线，不是硬门槛；专精陷阱与研究也能过关。' },
    { page: 'report', target: 'reportPanel', title: '为下一局留证', detail: '战前用最近战报检查阵容瓶颈；通关会开放新开局方针，鼓励用另一套构筑重试。' },
  ],
};
function prepareRoundGuideView() {
  const list = ROUND_TUTORIALS[S.raidNo] ?? [];
  const step = Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0));
  const item = list[step];
  if (!item || item.page !== 'hero' || tab !== 'hero') return;
  if (item.target === 'heroForce') heroSel = S.champs.find((c) => (c.restTurns || 0) > 0)?.uid ?? heroSel;
  if (heroSel == null && S.champs.length) heroSel = S.champs[0].uid;
  if (item.target === 'heroTraits' || item.target === 'heroLore') heroView = 'info';
  else if (item.target === 'heroGear') heroView = 'gear';
  else if (item.target === 'heroTitle') heroView = 'title';
  else if (item.target === 'heroTalent') heroView = 'talent';
  else heroView = 'stat';
  if (portrait && heroSel != null) {
    portraitHeroMode = 'roster';
    portraitHeroDetail = true;
    portraitHeroSection = item.target === 'heroLore' ? 'lore'
      : item.target === 'heroTraits' ? 'traits'
        : item.target === 'heroGear' ? 'gear'
          : item.target === 'heroTalent' ? 'talent' : 'status';
  }
}
function acknowledgeRoundGuide() {
  if (uiShellTourStep < 4) {
    uiShellTourStep++;
    if (uiShellTourStep >= 4) localStorage.setItem(UI_SHELL_TOUR_KEY, 'done');
    playSfx('tab'); render(); return;
  }
  const t = tutorialData();
  const list = ROUND_TUTORIALS[S.raidNo] ?? [];
  const step = Math.max(0, Math.round(t.roundSteps[S.raidNo] || 0));
  if (!list[step] || tab !== list[step].page) return;
  t.roundSteps[S.raidNo] = step + 1;
  prepareRoundGuideView();
  playSfx('tab');
  persist();
  render();
}
function skipUiShellTour() {
  uiShellTourStep = 4;
  localStorage.setItem(UI_SHELL_TOUR_KEY, 'done');
  playSfx('tab'); render();
}
const roundTeachingComplete = () => {
  const list = ROUND_TUTORIALS[S.raidNo] ?? [];
  return Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0)) >= list.length;
};
const UI_TASK_TONE = { block: C.red, warning: C.gold, opportunity: C.purple };
function uiTasks() {
  const tasks = [];
  const add = (severity, id, title, summary, reason, page, target = {}) => tasks.push({
    id, severity, title, summary, reason, page, target, blocking: severity === 'block',
  });
  if (!roundTeachingComplete()) add('block', 'teaching', '完成本轮教学', '阅读当前高光步骤后才可迎战。', '新机制尚未确认', ROUND_TUTORIALS[S.raidNo]?.[Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0))]?.page ?? 'throne');
  if (S.overtime && S.novel?.enabled && loadMode() !== 'http')
    add('block', 'novel-api', '小说战役等待叙事者', '重新接入有效API后才能继续签发任务与迎战。', '小说战役已经接管本档，但当前外部模型不可用', 'story', { type: 'novel' });
  else if (S.overtime && S.novel?.enabled && (!S.novel.pendingMission || S.novel.pendingMission.resolved))
    add('block', 'novel-mission', '尚未签发小说任务', '进入档案的小说页，完成日常或直接签发下一次入侵。', '小说战役要求每场战斗都有对应章节', 'story', { type: 'novel' });
  const activeDefense = S.rooms.reduce((n, room) => n + [room.front, room.back, room.flank].filter((uid) => uid != null).length
    + (room.leader != null && (!(champById(room.leader)?.restTurns || 0) || heroForcedThisRaid(champById(room.leader))) ? 1 : 0), 0);
  if (activeDefense <= 0) add('block', 'empty-defense', '地牢完全空防', '至少部署一名可出战守军，否则入侵者会直达王座。', '当前有效布防为0', 'dungeon', { kind: 'slot', room: 0, which: 'front' });
  const resting = seatedChampUids().map(champById).filter((c) => c && (c.restTurns || 0) > 0 && !heroForcedThisRaid(c));
  if (resting.length) add('warning', 'resting-hero', `${resting.length}名统领正在休息`, '轮换统领、疗愈，或支付高额费用强制驱使。', '休息英雄无法正常出战', 'hero', { type: 'hero', uid: resting[0].uid, view: 'stat' });
  const wounded = S.champs.filter((c) => seatedChampUids().includes(c.uid) && (c.wounds || 0) > 0);
  if (wounded.length) add('warning', 'wounded-hero', `${wounded.length}名上阵英雄带伤`, '伤势会削弱属性；可在英雄状态页疗伤。', '上阵英雄存在永久伤势', 'hero', { type: 'hero', uid: wounded[0].uid, view: 'stat' });
  const damagedFloor = S.floors.findIndex((floor) => floor.utility.kind !== 'none' && floor.utility.condition < 40);
  if (damagedFloor >= 0) add('warning', 'damaged-facility', `${damagedFloor + 1}层设施严重受损`, '维修后可恢复产出与服务能力。', `设施耐久${S.floors[damagedFloor].utility.condition}`, 'dungeon', { kind: 'utility', floor: damagedFloor });
  const thinFloor = S.rooms.findIndex((room) => [room.front, room.back, room.leader, room.flank].filter((uid) => uid != null).length === 0);
  if (thinFloor >= 0 && countPlaced() > 0) add('warning', 'empty-floor', `${thinFloor + 1}层没有守军`, '敌人会无消耗穿过该层；可部署单位或接受风险。', '防线存在空层', 'dungeon', { kind: 'slot', room: thinFloor, which: 'front' });
  const talentHero = S.champs.find((c) => pendingTier(c) > 0);
  if (talentHero) add('opportunity', 'hero-talent', '有英雄可学习专精', '专精无需随机，先预览五个方向再确认。', `${talentHero.name}有未分配专精`, 'hero', { type: 'hero', uid: talentHero.uid, view: 'talent' });
  else {
    const levelHero = S.champs.find((c) => canLevel(c) && S.bone >= heroUpgradeBone(c) && S.mana >= heroUpgradeMana(c));
    if (levelHero) add('opportunity', 'hero-level', '有英雄可以升级', '升级会提高基础属性并推进专精层级。', `${levelHero.name}经验和资源充足`, 'hero', { type: 'hero', uid: levelHero.uid, view: 'stat' });
  }
  const lead = availableStoryLeads()[0];
  if (lead) add('opportunity', 'story-lead', '有待处理秘闻', '选择会明确显示持续时间和具体影响。', `${lead.source}产生了新线索`, 'story', { type: 'story', id: lead.id });
  if (featureOpen('shop')) {
    const group = WORKSHOP_RESEARCH.find((item) => !S.workshopResearch[item.id]
      && researchAvailability(item, S.overtime ? 999 : S.raidNo, workshopResearchLevel()).open && S.mana >= item.cost);
    if (group) add('opportunity', 'research', '高端路线可以定型', '每组永久三选一，建议比较收益和代价后再确认。', `${group.name}已开放且资源充足`, 'shop', { type: 'research', id: group.id });
    else if (shopHasAffordable()) add('opportunity', 'shop', '工坊有可负担强化', '可购买永久强化，也可以保留魔质用于英雄成长。', '当前资源足以购买至少一项', 'shop', { type: 'shop' });
  }
  return tasks.sort((a, b) => ['block', 'warning', 'opportunity'].indexOf(a.severity) - ['block', 'warning', 'opportunity'].indexOf(b.severity));
}
function navigateUiTask(task) {
  if (!task) return;
  selectedEntity = task.target?.type ? { ...task.target } : null;
  inspectorView = 'summary';
  if (task.target?.type === 'hero') {
    heroSel = task.target.uid;
    heroTab = 'roster';
    heroView = task.target.view ?? 'stat';
    portraitHeroMode = 'roster'; portraitHeroDetail = true;
    portraitHeroSection = heroView === 'talent' ? 'talent' : 'status';
  } else if (task.target?.kind) sel = { ...task.target };
  if (task.target?.type === 'research') {
    setTab('shop'); openWorkshopResearch(); chooseResearchGroup(task.target.id); return;
  }
  if (task.target?.type === 'novel') { setArchiveSection('novel'); return; }
  setTab(task.page);
}
const uiBattleBlocked = () => uiTasks().some((task) => task.blocking);
function roundGuide() {
  if (uiShellTourStep < 4) {
    const steps = [
      ['zoneNav', '新版界面：底部只保留王座、地牢、军团、工坊、档案五个区域。'],
      ['taskCenter', '本轮事务：阻止、警告和机会集中在王座；点击即可前往处理。'],
      ['inspector', '上下文检查器：点击对象只更新详情区，不会让列表丢失位置。'],
      ['encyclopedia', '完整百科：长说明、公式与历史按需打开，主画面只保留决策摘要。'],
    ];
    if (tab !== 'throne') return ['throne', '新版界面导览：请先进入“王座”。', false];
    return [steps[uiShellTourStep][0], steps[uiShellTourStep][1], true];
  }
  if (S.raidNo === 1 && !S.overtime) {
    const step = syncTutorialProgress();
    const room = S.rooms.findIndex((r) => {
      const slime = monsterOfKind('slime');
      return slime && r.front === slime.uid;
    });
    const messages = [
      ['mob', '进入怪群，建立你的第一支守军'],
      ['mobRecruit', '选择并招募史莱姆：它负责前排承伤'],
      ['mobRecruit', '继续招募骷髅弓箭手：它负责后排输出'],
      ['dungeon', '进入地牢，学习前排与后排部署'],
      [monsterOfKind('slime') && S.rooms.some((r) => r.front === monsterOfKind('slime').uid) ? 'backSlot' : 'frontSlot',
        room >= 0 ? '再把骷髅弓箭手部署到同一房间的后排' : '先把史莱姆部署到第一层前排，再部署骷髅弓箭手到后排'],
      ['throne', '守军就位：返回王座查看入侵者'],
      ['battle', '准备完成，点击迎战'],
    ];
    return messages[Math.min(step, messages.length - 1)];
  }
  const list = ROUND_TUTORIALS[S.raidNo] ?? [];
  const step = Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0));
  const item = list[step];
  if (item) {
    if (tab !== item.page) return [item.page, `新教学：${item.title}，请进入“${pageName(item.page)}”`, false];
    return [item.target, `${item.title}：${item.detail}`, true];
  }
  return null;
}
let tab      = 'throne';
                                                        
let screen         = 'title';
let titleMode = 'main';
let titleDoctrinePick = 'default';
let titleNewConfirm = false;
let titleActionRects = {};
let identityRoot = null;
let pendingDoctrine = 'default';
let exchangeConfirm = '';

let sel                                                                                                                                                                            = null;
let heroSel                = null;          // 当前查看的英雄 uid
let heroTab                       = 'roster';
let heroView                             = 'stat';   // 名册右侧详情的五个视图
let champTitleExpand                     = '';         // 详情页当前展开的称号 id
let gearSlotSel           = 'crown';                 // 装备页当前编辑的槽
let talentPreview = null;                            // 专精页预览；确认前不写存档
let detailPopup = null;                              // 统一长说明弹层
let researchModal = null;                            // 高端工坊路线；确认前不写存档
let raidBriefing = null;                             // 正式战役战前章回；确认后才真正开战
let lawAudit = null;                                 // 属性触及法则极限时强制触发的永久处罚秘闻
let relicForgeConfirm = false;                       // 英雄遗物熔铸二次确认
let monDetailMode = false;                             // 已招募魔物卡片默认/详情切换
let customDeleteConfirm = '';                         // 自定义兵种图纸删除二次确认
let lastSelInstUid        = null;                      // 用于切换魔物实例时重置详情模式
let reportIdx = 0;
let battle                = null;
let speed = 1;
let paused = false;
let toast = { text: '', t: 0 };
let endingT = 0;
let pendingResultRaid = 0;
let battlePrepBusy = false;
let battleCheckpoint = null;                         // 迎战前经营状态；败战与主动退出均从这里恢复
let heroLoreBusyUid = null;
let heroForceConfirmUid = null;
const battleDialogueCache = new Map();
const BATTLE_DIALOGUE_SCHEMA = 2;

const failureKey = (raidNo = currentRaidIdentity()) => `${S.overtime ? 'overtime' : 'campaign'}:${raidNo}`;

function recordFailedAttempt(raidNo, reason = '战斗失败') {
  const key = failureKey(raidNo);
  const state = S.failureRelief[key] ?? { count: 0, aid2: false, aid5: false };
  state.count = Math.max(0, Math.round(state.count || 0)) + 1;
  S.failureRelief[key] = state;
  if (state.count >= 2 && !state.aid2) {
    state.aid2 = true;
    const bone = Math.max(180, Math.min(S.overtime ? 600 : 480, 140 + raidNo * 20));
    const mana = Math.max(24, Math.min(S.overtime ? 140 : 100, 15 + raidNo * 5));
    S.bone += bone; S.mana += mana;
    S.reliefNotices.push({
      title: '魔神的第一次围观',
      body: `你在同一场入侵里第二次失败。云层裂开一只眼睛，魔神看了看勇者，又看了看你的防线。\n\n“我原以为你在布置战术，后来发现你只是在给勇者演示入口。”\n\n他笑够以后大手一挥。${bone}骨币和${mana}魔质从天而降，其中几块骨头还带着上一位失败者的名字。\n\n获得：${bone}骨币、${mana}魔质。`,
    });
  }
  if (state.count >= 5 && !state.aid5) {
    state.aid5 = true;
    for (const champ of S.champs) {
      champ.fatigue = 0; champ.restTurns = 0; champ.sorties = 0; champ.xp = Math.max(0, (champ.xp || 0) + 1000);
      delete champ.forcedRaid;
    }
    S.reliefNotices.push({
      title: '魔神终于看不下去了',
      body: `第五次失败以后，魔神沉默了很久。\n\n“失败不可耻。把同一场失败完整排练五遍，多少有点追求艺术性。”\n\n他打了个响指。所有英雄从床上、疗愈池和自我怀疑中一起弹了起来；没人知道这算祝福还是不允许请假。\n\n所有英雄疲劳与休息清零，并各获得1000经验。`,
    });
  }
  S.reliefNotices = S.reliefNotices.slice(-4);
  return { key, count: state.count, reason };
}

function clearFailedAttempts(raidNo) { delete S.failureRelief[failureKey(raidNo)]; }

function showPendingReliefNotice() {
  const notice = S.reliefNotices.shift();
  if (!notice) return false;
  persist();
  openDetailPopup(notice.title, notice.body, C.purple);
  return true;
}

const FORCE_HERO_BONE = 300;
const FORCE_HERO_MANA = 100;
const currentRaidIdentity = () => S.overtime ? Math.max(NORMAL_RAID_COUNT + 1, S.otRaid || NORMAL_RAID_COUNT + 1) : S.raidNo;
const heroForcedThisRaid = (c) => c?.forcedRaid === currentRaidIdentity();

function forceRestingHero(c) {
  if (!c || (c.restTurns || 0) <= 0 || heroForcedThisRaid(c)) return false;
  if (heroForceConfirmUid !== c.uid) {
    heroForceConfirmUid = c.uid;
    say(`再次点击确认：支付 ${FORCE_HERO_BONE}骨+${FORCE_HERO_MANA}魔，强制${c.name}仅出战本场`);
    render(); return false;
  }
  heroForceConfirmUid = null;
  if (S.bone < FORCE_HERO_BONE || S.mana < FORCE_HERO_MANA) { say('强制驱使所需资源不足'); render(); return false; }
  S.bone -= FORCE_HERO_BONE; S.mana -= FORCE_HERO_MANA;
  c.forcedRaid = currentRaidIdentity();
  persist(); playSfx('buy'); say(`${c.name}已被强制征召；本场结束后休息回合不会减少`); render();
  return true;
}

function say(text        ) { toast = { text, t: 2.2 }; }

function heroLoreOf(c) {
  const personality = personalityById(c.personality), background = backgroundById(c.background);
  const ai = c.aiLore;
  return ai?.personalityName && ai?.personalityDesc && ai?.backgroundName && ai?.backgroundStory
    ? { personalityName: ai.personalityName, personalityDesc: ai.personalityDesc,
      backgroundName: ai.backgroundName, backgroundStory: ai.backgroundStory, via: ai.via ?? 'AI' }
    : { personalityName: personality.name, personalityDesc: personality.desc,
      backgroundName: background.name, backgroundStory: background.story, via: '' };
}

function heroLoreSnapshot(c) {
  const base = heroLoreOf(c), kind = champKind(c);
  return {
    name: c.name, race: kind.name, level: c.lv, potential: POT_NAME[S.champPot[c.uid] ?? c.potential ?? 0],
    traits: c.traits.map((id) => ({ name: TRAITS[id]?.name, description: TRAITS[id]?.desc })).filter((item) => item.name),
    title: titleOf(c)?.name ?? '', battles: c.battles, kills: c.kills, wounds: c.wounds ?? 0,
    restTurns: c.restTurns ?? 0, oldPersonality: `${base.personalityName}：${base.personalityDesc}`,
    oldBackground: `${base.backgroundName}：${base.backgroundStory}`,
    history: S.story.archive.filter((item) => item.refs?.includes(c.uid) || item.context?.ref === c.uid)
      .slice(0, 6).map((item) => ({ title: item.title, outcome: item.outcome ?? item.summary, raid: item.resolvedRaid })),
  };
}

async function optimizeHeroLore(c) {
  if (!c?.uid || heroLoreBusyUid != null) return false;
  if (!hasBackend()) { say('请先在设置中接入并选择 AI 模型'); return false; }
  heroLoreBusyUid = c.uid;
  say(`AI 正在重构${c.name}的档案…`);
  render();
  try {
    const result = await requestHeroLore(heroLoreSnapshot(c));
    const live = champById(c.uid);
    if (!result || !live) { say(llmStatus().note || 'AI 没有交回有效档案'); return false; }
    live.aiLore = { ...result.lore, via: result.via, updatedRaid: S.raidNo };
    persist();
    playSfx('tab');
    say(`${live.name}的档案已由 AI 重构`);
    return true;
  } catch (error) {
    say(error?.message || 'AI 档案重构失败');
    return false;
  } finally {
    heroLoreBusyUid = null;
    render();
  }
}

function aiGenerationEnabled() {
  const mode = loadMode();
  return hasBackend() && (mode === 'http' || (mode === 'gp' && window.parent !== window));
}

function battleDialogueSnapshot(raid) {
  const units = new Map();
  const add = (unit) => { if (unit?.key && !units.has(unit.key)) units.set(unit.key, unit); };
  raid.members.forEach((member) => {
    const cls = HERO_CLASSES[member.cls];
    add({ key: `hero:${cls.name}`, side: '入侵勇者', name: cls.name, kind: cls.role, level: member.lv,
      skill: cls.skill, description: cls.intel });
  });
  const slotNames = { front: '前排', back: '后排', flank: '侧翼' };
  S.rooms.forEach((room, floor) => {
    for (const slot of ['front', 'back', 'flank']) {
      const inst = instById(room[slot]);
      if (!inst) continue;
      const kind = instKind(inst);
      add({ key: `mon:${kind.name}`, side: '地牢守军', name: kind.name, kind: kind.role, level: inst.lv,
        position: `${floor + 1}层${slotNames[slot]}`, skill: kind.skill, description: kind.passive });
    }
    const champ = champById(room.leader);
    if (champ) {
      const kind = champKind(champ), stats = statOf(champ);
      add({ key: `mon:${champ.name}`, side: '地牢英雄', name: champ.name, kind: kind.name, level: champ.lv,
        position: `${floor + 1}层统领`, skill: kind.skill, title: titleOf(champ)?.name ?? '',
        traits: champ.traits.map((id) => TRAITS[id]?.name).filter(Boolean), personality: heroLoreOf(champ).personalityName,
        stats: { hp: stats.hp, atk: stats.atk, def: stats.def, thorns: stats.eff?.thorns ?? 0 } });
    }
  });
  return {
    raid: { no: raid.no, title: raid.title, affixes: raid.affixes.map((id) => AFFIXES[id]?.name).filter(Boolean) },
    doctrine: doctrine().name,
    rooms: S.rooms.map((room, index) => ({ floor: index + 1, theme: THEMES[room.theme]?.name,
      traps: [room.trap, room.trap2].filter((id) => id && id !== 'none').map((id) => TRAPS[id]?.name),
      facility: utilityAt(index)?.kind === 'none' ? '' : utilityDef(utilityAt(index)).name })),
    recentHistory: S.story.archive.slice(0, 3).map((item) => `${item.title}：${item.outcome ?? item.summary ?? ''}`),
    units: [...units.values()],
  };
}

async function prepareBattleDialogue(raid) {
  if (!aiGenerationEnabled()) return null;
  const snap = battleDialogueSnapshot(raid);
  const dialoguePrompt = loadPromptOverrides().dialogue ?? '';
  const key = JSON.stringify([BATTLE_DIALOGUE_SCHEMA, getBackend()?.name, dialoguePrompt, snap.raid, snap.units, snap.rooms]);
  if (battleDialogueCache.has(key)) return battleDialogueCache.get(key);
  try {
    const pack = await requestBattleDialogue(snap);
    if (pack) {
      battleDialogueCache.set(key, pack);
      while (battleDialogueCache.size > 6) battleDialogueCache.delete(battleDialogueCache.keys().next().value);
    }
    return pack;
  } catch (error) {
    console.warn('战前台词生成失败，已使用本地台词包', error);
    return null;
  }
}

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

function workshopResearchLevel() {
  return S.floors.reduce((best, floor) => floor.utility.kind === 'workshop' && floor.utility.condition > 0
    ? Math.max(best, floor.utility.level || 0) : best, 0);
}

function diyRules() {
  const effects = researchEffects(S.workshopResearch);
  return {
    powerCap: Math.max(PART_BUDGET.power, Math.round(effects.diyPowerCap || PART_BUDGET.power)),
    maxPowers: Math.max(2, Math.round(effects.diyPowerSlots || 2)),
    statMult: Math.max(1, effects.diyPartStatMult || 1),
    manaMult: Math.max(0.5, effects.diyManaCostMult || 1),
    capacityBonus: Math.max(0, Math.round(effects.diyCapacityBonus || 0)),
  };
}

const diyPartCap = () => DIY_CAP + diyRules().capacityBonus;
const diyAffixCap = () => DIY_AFFIX_CAP + diyRules().capacityBonus;
function currentDraftCost(cat, draft) {
  const cost = draftCost(cat, draft), mult = diyRules().manaMult;
  return { ...cost, mana: Math.max(1, Math.round(cost.mana * mult)) };
}
function currentAffixCost(draft) {
  const cost = affixDraftCost(draft), mult = diyRules().manaMult;
  return { ...cost, mana: Math.max(1, Math.round(cost.mana * mult)) };
}

function openWorkshopResearch() {
  const first = WORKSHOP_RESEARCH.find((group) => !S.workshopResearch[group.id]) ?? WORKSHOP_RESEARCH[0];
  researchModal = { groupId: first.id, previewId: S.workshopResearch[first.id] ?? '' };
  detailPopup = null; stitch = null; forge = null; graft = null; smith = null;
  if (portrait) portraitNativeBypass = true;
  playSfx('tab'); render(); if (portrait) scheduleLayout();
}

function closeWorkshopResearch() {
  researchModal = null; portraitNativeBypass = false; playSfx('tab'); render(); if (portrait) scheduleLayout();
}

function chooseResearchGroup(groupId) {
  const group = WORKSHOP_RESEARCH.find((item) => item.id === groupId);
  if (!group || !researchModal) return;
  researchModal.groupId = groupId;
  researchModal.previewId = S.workshopResearch[groupId] ?? '';
  playSfx('tab'); render();
}

function previewResearch(optionId) {
  if (!researchModal) return;
  const found = researchOption(optionId);
  if (!found || found.group.id !== researchModal.groupId || S.workshopResearch[found.group.id]) return;
  researchModal.previewId = optionId; playSfx('tab'); render();
}

function confirmResearch() {
  if (!researchModal?.previewId) return false;
  const found = researchOption(researchModal.previewId);
  if (!found || found.group.id !== researchModal.groupId || S.workshopResearch[found.group.id]) return false;
  const availability = researchAvailability(found.group, S.overtime ? 999 : S.raidNo, workshopResearchLevel());
  if (!availability.open) { say(availability.reason); return false; }
  if (S.mana < found.group.cost) { say(`需要 ${found.group.cost} 魔质才能定型`); return false; }
  S.mana -= found.group.cost;
  S.workshopResearch[found.group.id] = found.option.id;
  researchModal.previewId = found.option.id;
  persist(); playSfx('buy'); say(`${found.option.name} 已定型，同组路线永久封锁`); render();
  return true;
}

const LAW_AUDIT_TEXT = {
  thorns: { title: '反伤超过了工伤保险范围', penalty: '原始反伤永久压至55%', boon: '攻击永久提高18%',
    body: '法则审计员发现该角色只要站着就能让攻击者先死。这会导致战斗部门失去存在意义，也会让保险部门获得存在意义。经紧急表决，尖刺被磨钝一部分；作为补偿，磨下来的铁被铸进了武器。' },
  mitigation: { title: '伤害拒绝进入当事人账户', penalty: '受伤倍率永久不得低于35%', boon: '生命永久提高20%',
    body: '伤害连续三次投递失败后向法则管理处投诉。审计结果显示，该角色已接近“概念上存在、物理上不收件”。管理处强制打开一条伤害通道，并补发一条更长的血条，方便损失看起来仍然体面。' },
  defense: { title: '盔甲被认定为违章建筑', penalty: '防御永久削减30%', boon: '攻击提高15%，速度提高6%',
    body: '工程署测量后确认，这已经不是盔甲，而是一座未经许可、还能自行走动的城堡。拆迁队削掉了最厚的外墙；角色因此终于能弯腰，也第一次发现武器原来可以挥得这么快。' },
  lifesteal: { title: '生命回收形成市场垄断', penalty: '吸血永久压至45%', boon: '速度永久提高12%',
    body: '该角色吸走的生命已经超过战场自然死亡总额。死神工会以恶性竞争为由发起仲裁。抽成比例被强制下调，但获准更频繁地出手——这样每一口少一点，总量看起来就不那么可疑。' },
};

function lawKindOf(stats) {
  if ((stats.eff?.thorns ?? 0) >= 0.75) return 'thorns';
  if ((stats.dmgTakenMult ?? 1) * (stats.eff?.dmgTakenMult ?? 1) <= 0.25) return 'mitigation';
  if ((stats.def ?? 0) >= 100) return 'defense';
  if ((stats.eff?.lifestealPct ?? 0) >= 0.75) return 'lifesteal';
  return null;
}
function lawMarkSummary(marks = []) {
  return marks.map((kind) => LAW_AUDIT_TEXT[kind] ? `${LAW_AUDIT_TEXT[kind].penalty}；${LAW_AUDIT_TEXT[kind].boon}` : '').filter(Boolean).join('；');
}

function findLawAudit() {
  const chem = chemMap();
  for (const c of S.champs) {
    const kind = lawKindOf(statOf(c, chem));
    if (kind && !(c.lawMarks ?? []).includes(kind)) return { type: 'hero', uid: c.uid, name: c.name, kind, ...LAW_AUDIT_TEXT[kind] };
  }
  for (const inst of S.monsters) {
    const k = instKind(inst), mult = LEVEL_MULT[inst.lv - 1] ?? 1;
    const stats = { hp: k.hp * mult, atk: k.atk * mult, def: k.def * mult, spd: k.spd,
      dmgTakenMult: k.eff?.dmgTakenMult ?? 1, eff: k.eff ?? {} };
    const kind = lawKindOf(stats);
    if (kind && !(inst.lawMarks ?? []).includes(kind)) return { type: 'monster', uid: inst.uid, name: k.name, kind, ...LAW_AUDIT_TEXT[kind] };
  }
  return null;
}

function acceptLawAudit() {
  if (!lawAudit) return;
  const target = lawAudit.type === 'hero' ? champById(lawAudit.uid) : instById(lawAudit.uid);
  if (target) {
    target.lawMarks = [...new Set([...(target.lawMarks ?? []), lawAudit.kind])];
    S.story.archive.unshift({ id: S.story.leadNext++, sceneId: `law-audit-${lawAudit.kind}`, source: '强制秘闻・法则审计',
      title: `${lawAudit.name}・${lawAudit.title}`, summary: lawAudit.body, resolvedRaid: S.raidNo,
      outcome: `${lawAudit.penalty}；${lawAudit.boon}`, effects: '永久生效', refs: [], battleRefs: [] });
  }
  lawAudit = null;
  persist(); playSfx('break'); say('法则处罚已经永久写入角色档案'); scheduleLayout(); render();
}

// ---------- PIXI 启动 ----------
const app = new PIXI.Application();
const root = new PIXI.Container();
const backdrop = new PIXI.Container();
const uiLayer = new PIXI.Container();
const uiGfx = new PIXI.Graphics();
const battleLayer = new PIXI.Container();
const guideLayer = new PIXI.Container();
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
let portraitActionMap = {};
let portraitStoryInputRect = null;
let guidePulseNodes = [];
const LARGE_SCREEN_SCALE = 3;
const UHD_SCREEN_SCALE = 4;

const loadingEl   = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const loadingFill = document.getElementById('loading-fill');
let introDomRoot = null;

function syncIntroDom() {
  if (screen !== 'intro') {
    if (introDomRoot) introDomRoot.style.display = 'none';
    return;
  }
  if (!introDomRoot) {
    introDomRoot = document.createElement('section');
    introDomRoot.id = 'intro-screen';
    introDomRoot.setAttribute('role', 'dialog');
    introDomRoot.setAttribute('aria-modal', 'true');
    introDomRoot.innerHTML = `<style>
      #intro-screen{position:fixed;inset:0;z-index:80;display:grid;place-items:center;box-sizing:border-box;padding:clamp(12px,3vw,48px);background:#050408f2;color:#f1e5bd;font-family:${FONT},monospace;overflow:auto}
      #intro-screen .intro-wrap{width:min(960px,100%);display:grid;gap:clamp(14px,2.2vh,28px)}
      #intro-screen h1{margin:0;color:#e2bd64;font-size:clamp(24px,3vw,46px);font-weight:400;line-height:1.2}
      #intro-screen .intro-copy{box-sizing:border-box;padding:clamp(18px,3vw,34px);border:3px solid #e2bd64;box-shadow:0 0 0 4px #21172d;background:#383248;font-size:clamp(16px,1.45vw,25px);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
      #intro-screen .intro-actions{display:flex;justify-content:flex-end}
      #intro-screen button{min-width:min(300px,100%);min-height:64px;box-sizing:border-box;padding:12px 28px;border:3px solid #e2bd64;box-shadow:0 0 0 3px #21172d;background:#2b0d16;color:#fff;font:clamp(20px,2vw,34px) ${FONT},monospace;cursor:pointer;touch-action:manipulation}
      #intro-screen button:hover,#intro-screen button:focus-visible{background:#4a1725;outline:3px solid #fff;outline-offset:3px}
      @media(max-width:600px),(max-height:560px){#intro-screen{place-items:start center;padding:12px}#intro-screen .intro-wrap{gap:12px}#intro-screen h1{font-size:22px}#intro-screen .intro-copy{font-size:15px;line-height:1.5;padding:16px}#intro-screen button{width:100%;min-height:54px;font-size:21px}}
    </style><div class="intro-wrap"><h1 data-intro-title></h1><div class="intro-copy" data-intro-copy></div><div class="intro-actions"><button type="button" data-intro-enter>开门营业</button></div></div>`;
    const enter = introDomRoot.querySelector('[data-intro-enter]');
    enter.addEventListener('pointerdown', (event) => event.stopPropagation());
    enter.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (screen !== 'intro') return;
      unlockAndPlay();
      finishIntro();
    });
    document.body.appendChild(introDomRoot);
  }
  introDomRoot.style.display = 'grid';
  introDomRoot.querySelector('[data-intro-title]').textContent = `${S.playerName}的创业说明会`;
  introDomRoot.querySelector('[data-intro-copy]').textContent = introStoryText();
}

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
  app.canvas.setAttribute('aria-label', `${GAME_NAME}游戏画面`);

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
  root.addChild(battleLayer, uiLayer, guideLayer, modalLayer, overlay);
  uiLayer.addChild(uiGfx);
  modalLayer.addChild(modalGfx);
  portraitLayer.addChild(portraitGfx);

  await initSaveStore();
  await loadSave();
  restoreBackend();
  bootstrapOnlineModeTour();
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushAutosave(); });
  window.addEventListener('pagehide', () => { void flushAutosave(); });
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
  const portraitManage = portrait && screen === 'manage' && !portraitModalOpen();
  const portraitLogicalWidth = portraitManage ? (portraitPane === 0 ? VIEW_W : VIEW_W / 2) : VIEW_W;
  const portraitSceneHeight = portraitManage ? 202 : VIEW_H;
  const portraitControlsHeight = portrait ? portraitConsoleHeight() : 0;
  // 横屏不能无限追随窗口高度放大：2K 浏览器下接近 4× 的界面会让文字和
  // 底部操作贴边，也更容易受浏览器工具栏/页面缩放影响。像素画面优先采用
  // 稳定的整数档位；仅在真正的 4K 高度上允许 4×。
  const landscapeScaleCap = h >= 1800 ? UHD_SCREEN_SCALE : LARGE_SCREEN_SCALE;
  viewScale = portrait
    ? Math.max(0.1, Math.min((w - 12) / portraitLogicalWidth, (h - portraitControlsHeight - 8) / portraitSceneHeight))
    : Math.max(0.1, Math.min(landscapeScaleCap, w / VIEW_W, h / VIEW_H));
  smallScreen = w < 720 || h < 420 || viewScale < 1;
  const snap = (v) => Math.round(v * renderResolution) / renderResolution;
  root.scale.set(viewScale);
  const portraitFocusX = portraitManage ? (portraitPane === 2 ? VIEW_W / 2 : 0) : 0;
  root.x = portrait ? snap((w - portraitLogicalWidth * viewScale) / 2 - portraitFocusX * viewScale) : snap((w - VIEW_W * viewScale) / 2);
  // 竖屏经营页只展示横屏画布中真正的页面区域（y=36..238）。顶部 HUD 与底部标签
  // 由下方触控控制台统一承接，避免同一组资源、导航和存档操作重复出现两次。
  const portraitCompositionHeight = portraitSceneHeight * viewScale + portraitControlsHeight;
  const portraitSceneTop = portrait ? Math.max(4, (h - portraitCompositionHeight) / 2) : 0;
  root.y = portraitManage ? snap(portraitSceneTop - 36 * viewScale) : portrait ? snap(portraitSceneTop) : snap((h - VIEW_H * viewScale) / 2);
  portraitContentBottom = portraitManage ? root.y + 238 * viewScale : root.y + VIEW_H * viewScale;
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
// 0=完整全景，1=左栏放大，2=右栏放大。竖屏默认始终展示完整页面，避免裁掉两侧内容。
let portraitPane = 0;
let portraitMobView = 'recruit';
let portraitNativeBypass = false;
let portraitMobileMenu = false;
let layoutQueued = false;

const PORTRAIT_NATIVE_TABS = new Set(['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story']);
let portraitStoryView = 'leads';
let portraitHeroMode = 'roster';
let portraitHeroSection = 'status';
let portraitHeroDetail = false;
function portraitNativeManage() {
  return portrait && screen === 'manage' && PORTRAIT_NATIVE_TABS.has(tab)
    && !portraitNativeBypass && !lawAudit && !raidBriefing && !researchModal && !stitch && !forge && !graft && !smith;
}
function portraitModalOpen() { return portrait && screen === 'manage' && (!!lawAudit || !!raidBriefing || !!researchModal || !!stitch || !!forge || !!graft || !!smith); }
function closePortraitModal() {
  if (researchModal) closeWorkshopResearch(); else if (stitch) closeStitch(); else if (forge) closeForge(); else if (graft) closeGraft(); else if (smith) closeSmith();
  portraitNativeBypass = false;
  scheduleLayout();
}

function portraitConsoleHeight() {
  if (portraitModalOpen()) return 64;
  if (screen !== 'manage') return screen === 'battle' ? 153 : 58;
  const rows = Math.max(1, Math.ceil(visibleZones().length / 5));
  return 186 + rows * 43;
}

function setPortraitPane(value) {
  portraitPane = Math.max(0, Math.min(2, Math.round(value)));
  portraitChromeKey = '';
  scheduleLayout();
}

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
    if (screen === 'title') {
      if (e.key === 'Escape' && titleMode === 'doctrine') { titleMode = 'main'; titleNewConfirm = false; render(); return; }
      if (e.key === 'Enter') {
        if (titleMode === 'doctrine') openIdentitySetup(titleDoctrinePick);
        else if (saveExists) continueGame();
        else startFromTitle();
      }
      return;
    } else if (screen === 'intro') {
      if (e.key === 'Enter' || e.key === ' ') finishIntro();
      return;
    } else if (screen === 'manage') {
      if (lawAudit || raidBriefing) {
        if (e.key === 'Enter') { if (lawAudit) acceptLawAudit(); else confirmRaidBriefing(); }
        return;
      }
      if (researchModal) {
        if (e.key === 'Escape') { closeWorkshopResearch(); return; }
        if (e.key === 'Enter') { confirmResearch(); return; }
        return;
      }
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
      const openTabs = visibleZones();
      if (i >= 0 && openTabs[i]) { setZone(openTabs[i].id); return; }
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
      if (e.key === 'Escape') { abortBattle(); return; }
    } else if (screen === 'result') {
      if (e.key === 'Enter') { afterResult(); return; }
    } else if (screen === 'ending') {
      if (e.key === 'Enter') { enterOvertime(); return; }
    }
  });
}

function pageForZone(zone) {
  const guidePage = roundGuide()?.[0];
  if (zone === 'army') {
    if (guidePage === 'hero' || guidePage === 'mob') return featureOpen(guidePage) ? guidePage : 'mob';
    return armySection === 'hero' && featureOpen('hero') ? 'hero' : 'mob';
  }
  if (zone === 'archive') {
    if (guidePage === 'story' || guidePage === 'report') return featureOpen(guidePage) ? guidePage : 'report';
    return ['story', 'chronicle', 'novel'].includes(archiveSection) && featureOpen('story') ? 'story' : 'report';
  }
  return zone;
}
function setZone(zone) { setTab(pageForZone(zone)); }
function setArchiveSection(section) {
  if (section === 'novel' && !novelAvailable()) {
    if (S.novel?.enabled) { say('小说战役需要重新接入外部API'); openAISettings(); }
    return;
  }
  archiveSection = section;
  if (section === 'report') setTab('report');
  else {
    storyView = section === 'chronicle' ? 'chronicle' : 'dashboard';
    portraitStoryView = section === 'chronicle' ? 'archive' : section === 'novel' ? 'novel' : 'leads';
    setTab('story');
    if (section === 'novel' && S.novel?.enabled && (S.novel.phase === 'resolution' || (!S.novel.entries.length && S.novel.phase === 'idle'))) void runNovelTurn();
  }
}
function setTab(t     ) {
  if (NAV_ZONES.some((item) => item.id === t)) t = pageForZone(t);
  if (!featureOpen(t)) return;
  pagerFocus = null;
  confirmNew = false;
  desktopSystemMenu = false;
  if (stitch) closeStitch();
  if (forge) closeForge();
  if (graft) closeGraft();
  relicForgeConfirm = false;
  customDeleteConfirm = '';
  closeNovelDecisionCard(true);
  tab = t;
  const guideItem = (ROUND_TUTORIALS[S.raidNo] ?? [])[Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0))];
  if (t === 'story' && guideItem?.page === 'story' && guideItem.target === 'storyArea') storyView = 'dashboard';
  if (t === 'hero' || t === 'mob') armySection = t;
  if (t === 'report') archiveSection = 'report';
  if (t === 'story' && archiveSection === 'report') archiveSection = storyView === 'chronicle' ? 'chronicle' : 'story';
  if (portrait) portraitPane = 0;
  portraitNativeBypass = false;
  portraitMobileMenu = false;
  if (portrait && t === 'mob' && S.raidNo === 1) portraitMobView = 'recruit';
  sel = null;
  markTabVisited(t);
  markTabVisited(activeZone());
  syncTutorialProgress();
  if (S.raidNo === 1 && t === 'mob') {
    const required = tutorialData().step < 2 ? 'slime' : tutorialData().step < 3 ? 'archer' : null;
    if (required) sel = { kind: 'monkind', id: required };
  }
  if (S.raidNo === 1 && t === 'dungeon' && !tutorialDeploymentReady()) {
    const slime = monsterOfKind('slime');
    const hasFront = slime && S.rooms[0].front === slime.uid;
    sel = { kind: 'slot', room: 0, which: hasFront ? 'back' : 'front' };
  }
  prepareRoundGuideView();
  playSfx('tab');
  persist();
  render();
  if (portrait) scheduleLayout();
}

// ---------- 经营界面渲染 ----------
function clearUi() {
  uiPortraitFx.length = 0;
  guidePulseNodes = [];
  for (const k of guideLayer.removeChildren()) k.destroy({ children: true });
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
  novelInputRect = null;
  portraitChromeKey = '';
  if (screen !== 'intro') syncIntroDom();
  if (nameInput) nameInput.style.display = screen === 'manage' && (stitch || smith) && !detailPopup ? 'block' : 'none';
  if (forgeInput) forgeInput.style.display = screen === 'manage' && forge && forge.tab !== 'book' && !detailPopup ? 'block' : 'none';
  if (screen === 'manage' && !lawAudit && !raidBriefing && !detailPopup && !researchModal && !stitch && !forge && !graft && !smith) {
    lawAudit = findLawAudit();
    if (lawAudit && portrait) scheduleLayout();
  }
  const modalOpen = screen === 'manage' && (!!lawAudit || !!raidBriefing || !!researchModal || !!stitch || !!forge || !!graft || !!smith);
  if (portrait && screen === 'manage' && (modalOpen || detailPopup) && portraitPane !== 0) {
    portraitPane = 0;
    scheduleLayout();
  }
  modalLayer.visible = modalOpen || !!detailPopup;
  if (screen !== 'manage') {
    uiLayer.visible = false;
    guideLayer.visible = false;
    if (storyInput) storyInput.style.display = 'none';
    if (screen === 'title') buildTitle();
    else if (screen === 'intro') buildIntro();
    ensurePortraitChrome();
    return;
  }
  if (!featureOpen(tab)) tab = 'throne';
  if (archiveSection === 'novel' && !novelAvailable()) { archiveSection = 'report'; tab = 'report'; }
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
    if (lawAudit) drawLawAudit();
    else if (raidBriefing) drawRaidBriefing();
    else if (researchModal) drawWorkshopResearch();
    else if (stitch) drawStitch();
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
  drawDesktopSystemMenu(g);
  drawProgressGuide();
  syncStoryInput();
  ensurePortraitChrome();
}

function introStoryText() {
  return `你原本也是一位体面的魔王——至少名片上这么写。后来同行嫌你穷，王国嫌你偏，债主则认为两者都是优点，于是把你发配到边境乡下。\n\n这里唯一的产业，是一座漏风、欠税、尚未被勇者正式发现的地下城：${S.lairName}。你带着95骨币、18魔质和一份无法报销的雄心抵达。\n\n从今天起，${S.playerName}要招募怪物、经营房间、应付英雄，并说服一批批勇者：死亡不是失败，只是他们职业生涯中最后一次考核。`;
}

function buildIntro() {
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  syncIntroDom();
}

function drawWorkshopResearch() {
  if (!researchModal) return;
  const g = modalGfx;
  const group = WORKSHOP_RESEARCH.find((item) => item.id === researchModal.groupId) ?? WORKSHOP_RESEARCH[0];
  const level = workshopResearchLevel();
  const availability = researchAvailability(group, S.overtime ? 999 : S.raidNo, level);
  const pickedId = S.workshopResearch[group.id] ?? '';
  const preview = researchOption(researchModal.previewId)?.option ?? null;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  panelF(g, modalLayer, 'arcane', 8, 8, VIEW_W - 16, VIEW_H - 16, C.wall);
  label(modalLayer, `高端工坊路线・工坊 Lv${level}・魔质 ${S.mana}`, 20, 16, 13, C.gold);
  label(modalLayer, '每组永久三选一；确认后同组封锁', 246, 17, 10, C.red);
  button(g, modalLayer, hits, 444, 12, 24, 17, '✕', closeWorkshopResearch, { size: 11, border: C.red, color: C.red });

  panelF(g, modalLayer, 'inset', 18, 38, 124, 196, C.ink);
  WORKSHOP_RESEARCH.forEach((item, i) => {
    const y = 44 + i * 30, active = item.id === group.id, chosen = S.workshopResearch[item.id];
    const gate = researchAvailability(item, S.overtime ? 999 : S.raidNo, level);
    button(g, modalLayer, hits, 24, y, 112, 26,
      `${chosen ? '◆' : gate.open ? '◇' : '×'} ${item.name.replace(/^第.组・/, '')}`,
      () => chooseResearchGroup(item.id), { size: 10, fill: active ? C.wallLit : C.wall,
        border: active ? C.gold : chosen ? C.green : gate.open ? C.purple : C.wallLit,
        color: chosen ? C.green : gate.open ? C.bone : C.stoneLit });
  });

  panelF(g, modalLayer, 'inset', 150, 38, 142, 196, C.ink);
  label(modalLayer, group.name, 158, 46, 11, availability.open ? C.white : C.stoneLit);
  label(modalLayer, pickedId ? '已定型・其余封锁' : availability.open ? `定型费 ${group.cost} 魔` : availability.reason,
    158, 62, 9, pickedId ? C.green : availability.open ? C.purple : C.red);
  group.options.forEach((option, i) => {
    const y = 82 + i * 45, selected = researchModal.previewId === option.id, owned = pickedId === option.id;
    const locked = !!pickedId && !owned;
    button(g, modalLayer, hits, 158, y, 126, 38, locked ? `× ${option.name}` : `${owned ? '◆' : selected ? '◇' : '·'} ${option.name}`,
      () => previewResearch(option.id), { size: 10, enabled: !locked && !owned, fill: selected ? C.wallLit : C.wall,
        border: owned ? C.green : selected ? C.gold : locked ? C.wallLit : C.purple,
        color: owned ? C.green : selected ? C.gold : locked ? C.stoneLit : C.bone });
  });

  panelF(g, modalLayer, 'stone', 300, 38, 162, 196, C.wall);
  if (preview) {
    label(modalLayer, preview.name, 310, 48, 12, pickedId === preview.id ? C.green : C.gold);
    label(modalLayer, `【${preview.tag}】`, 310, 66, 10, C.purple);
    boundedText(modalLayer, preview.desc, 310, 86, 142, 88, 11, C.bone);
    const can = !pickedId && availability.open && S.mana >= group.cost;
    label(modalLayer, `已完成 ${Object.keys(S.workshopResearch).length}/${WORKSHOP_RESEARCH.length} 组`, 310, 177, 9, C.stoneLit);
    button(g, modalLayer, hits, 310, 198, 142, 26, pickedId === preview.id ? '已永久定型' : '确认选择并封锁同组', confirmResearch,
      { size: 10, enabled: can, fill: C.purpleDark, border: can ? C.gold : C.stoneLit, color: can ? C.white : C.stoneLit });
  } else {
    boundedText(modalLayer, availability.open ? '点击左侧具体路线名称，先查看完整收益与代价；只有点击确认才会扣除魔质。'
      : `本组尚未开放：${availability.reason}。已选择的早期路线仍可随时回来查看。`, 310, 58, 142, 116, 11, C.stoneLit);
  }
  if (!preview) label(modalLayer, `已完成 ${Object.keys(S.workshopResearch).length}/${WORKSHOP_RESEARCH.length} 组`, 310, 204, 10, C.stoneLit);
}

function drawRaidBriefing() {
  const scene = raidBriefing;
  if (!scene) return;
  const g = modalGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  if (TEX['tile-wall']) {
    const wall = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: VIEW_W, height: VIEW_H });
    wall.tileScale.set(0.72); wall.tint = 0x292039; wall.alpha = 0.54; modalLayer.addChildAt(wall, 1);
  }
  panelF(g, modalLayer, 'scroll', 44, 24, 392, 222, C.wall);
  labelC(modalLayer, `第${scene.no}轮・${scene.title}`, 240, 38, 15, C.gold);
  labelC(modalLayer, scene.speaker || `${S.lairName}门口的临时书记`, 240, 62, 10, C.purple);
  boundedText(modalLayer, `${S.playerName}，${scene.body}`, 72, 84, 336, 82, 12, C.bone);
  panelF(g, modalLayer, 'stone', 68, 172, 344, 35, C.wall);
  boundedText(modalLayer, `王座回应：${scene.reply}`, 82, 182, 316, 17, 10, C.stoneLit);
  hits.add(44, 24, 392, 222, () => { /* 战前章回不可点穿，也不可跳过 */ });
  button(g, modalLayer, hits, 146, 214, 188, 26, '迎战吧', confirmRaidBriefing,
    { size: 13, fill: C.redDark, border: C.gold, color: C.white });
}

function drawLawAudit() {
  const scene = lawAudit;
  if (!scene) return;
  const g = modalGfx;
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  panelF(g, modalLayer, 'scroll', 42, 18, 396, 234, C.red);
  labelC(modalLayer, '强制秘闻・法则审计', 240, 31, 14, C.red);
  labelC(modalLayer, `${scene.name}：${scene.title}`, 240, 55, 12, C.gold);
  boundedText(modalLayer, scene.body, 68, 78, 344, 78, 11, C.bone);
  panelF(g, modalLayer, 'stone', 66, 162, 348, 47, C.wall);
  label(modalLayer, `处罚：${scene.penalty}`, 78, 173, 10, C.red);
  label(modalLayer, `补偿：${scene.boon}`, 78, 190, 10, C.green);
  hits.add(42, 18, 396, 234, () => { /* 强制秘闻必须确认，不允许点背景跳过 */ });
  button(g, modalLayer, hits, 136, 218, 208, 27, '接受处罚并归档', acceptLawAudit,
    { size: 12, fill: C.redDark, border: C.gold, color: C.white });
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
  if (target === 'hero' && !featureOpen('heroGraft')) { say('英雄全身改造将在第9轮开放'); return; }
  const inst = target === 'hero' ? champById(uid) : instById(uid);
  if (!inst) return;
  graft = { uid, target, cat: 'core', picks: [...(inst.graft ?? [])], preview: null };
  stitch = null;
  forge = null;
  smith = null;
  playSfx('tab');
  render();
  if (portrait) scheduleLayout();
}
function closeGraft() { graft = null; playSfx('tab'); render(); if (portrait) scheduleLayout(); }

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
  if (portrait) scheduleLayout();
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
  if (portrait) scheduleLayout();
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

let aiSettingsRoot = null;
let saveManagerRoot = null;
let novelPromptRoot = null;
let onlineModeTourRoot = null;

const ONLINE_MODE_TOUR_STEPS = [
  {
    title: '外部叙事者已接通',
    body: '从现在起，带有“AI”标记的创作会请求你选择的模型。接口失败不会吞掉操作次数，也不会让半截回复进入存档。',
    points: ['每次请求可能产生服务商费用', '断网时经营与战斗仍可继续，依赖 AI 的操作会明确提示重试'],
  },
  {
    title: '秘闻变成双向调查',
    body: '追查无主秘闻时，你可以自己写处理方式；叙事者会回应，但真正的资源和状态变化仍由本地白名单校验。',
    points: ['未接入 API 时仍提供三个固定选项', '接入后开放自由输入与 AI 随机事件'],
  },
  {
    title: '战斗开始记住上下文',
    body: '战前台词、文学化战报和上下文秘闻会参考当前地牢、参战角色与近期历史，让同一支队伍逐渐拥有自己的口吻。',
    points: ['战斗数值与胜负仍由本地规则决定', '英雄档案可用“AI 来重构优化”润色性格与背景'],
  },
  {
    title: '工坊开放创作协助',
    body: 'DIY 部件与词缀可以让模型先给出草案。能力、预算、分数上限和可写入字段仍由游戏校验，模型不能凭一句话造出无敌部件。',
    points: ['切换 DIY 标签会保留各自草稿', '普通任务提示词可在“设置 → 提示词”中调整'],
  },
  {
    title: '通关后的线上远征',
    body: '进入加班阶段后，叙事者会为每次迎战包装新敌人与剧情；敌人职业、数量、等级和奖励都会经过本地平衡器。',
    points: ['没有有效的在线任务时不会直接开战', 'API 失效时会引导你重新接入，而不是生成空白敌人'],
  },
  {
    title: '小说战役与提示词管理',
    body: '通关后，“档案 → 小说”会开放任务—经营—战斗闭环。小说的日常、任务和记忆拥有独立的结构化提示词管理器。',
    points: ['API Key 只保存在当前浏览器，不进入存档导出', 'AI 只能写叙事草案，不能直接删除角色、设施或改写战斗结果'],
  },
];

function apiConnectCount() {
  try { return Math.max(0, Math.round(Number(localStorage.getItem(API_CONNECT_COUNT_KEY)) || 0)); }
  catch { return 0; }
}

function recordSuccessfulApiConnection() {
  const count = apiConnectCount();
  try { localStorage.setItem(API_CONNECT_COUNT_KEY, String(count + 1)); } catch { /* 浏览器禁用存储时仅跳过一次性检测 */ }
  if (count !== 0) return false;
  try { if (localStorage.getItem(ONLINE_MODE_TOUR_KEY) !== 'done') localStorage.setItem(ONLINE_MODE_TOUR_KEY, '0'); } catch { /* 同上 */ }
  onlineTourPending = true;
  return true;
}

function bootstrapOnlineModeTour() {
  if (loadMode() !== 'http' || apiConnectCount() > 0) return;
  recordSuccessfulApiConnection();
}

function closeOnlineModeTour(complete = false) {
  if (onlineModeTourRoot) onlineModeTourRoot.remove();
  onlineModeTourRoot = null;
  if (complete) {
    onlineTourPending = false;
    try { localStorage.setItem(ONLINE_MODE_TOUR_KEY, 'done'); } catch { /* 无本地存储时本次会话仍可关闭 */ }
  }
}

function openOnlineModeTour(stepOverride = null) {
  if (screen !== 'manage' || loadMode() !== 'http') { onlineTourPending = true; return false; }
  closeOnlineModeTour(false);
  let stored = 0;
  try {
    const raw = localStorage.getItem(ONLINE_MODE_TOUR_KEY);
    if (raw === 'done') { onlineTourPending = false; return false; }
    stored = Math.max(0, Math.min(ONLINE_MODE_TOUR_STEPS.length - 1, Math.round(Number(raw) || 0)));
  } catch { /* 从第一步开始 */ }
  let step = stepOverride == null ? stored : Math.max(0, Math.min(ONLINE_MODE_TOUR_STEPS.length - 1, stepOverride));
  const rootNode = document.createElement('div');
  rootNode.id = 'online-mode-tour';
  rootNode.style.cssText = 'position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(3,2,8,.91);font-family:monospace;color:#eadcae';
  const card = document.createElement('div');
  card.style.cssText = 'width:min(520px,96vw);max-height:calc(100vh - 28px);overflow:auto;box-sizing:border-box;padding:20px;border:3px solid #e2bd64;background:#191423;box-shadow:0 0 0 3px #3a2b18,0 0 30px rgba(226,189,100,.3),0 16px 50px #000;animation:online-tour-pulse 1.5s ease-in-out infinite alternate';
  const css = document.createElement('style');
  css.textContent = '@keyframes online-tour-pulse{from{border-color:#9b7932}to{border-color:#ffe49a}}#online-mode-tour button{box-sizing:border-box;min-height:42px;border:1px solid #76698a;background:#272033;color:#f1e5bd;font:14px monospace;padding:8px;cursor:pointer}#online-mode-tour button:focus{outline:1px solid #e2bd64;border-color:#e2bd64}';
  const paint = () => {
    const item = ONLINE_MODE_TOUR_STEPS[step];
    const dots = ONLINE_MODE_TOUR_STEPS.map((_, i) => `<span style="display:inline-block;width:${i === step ? 18 : 7}px;height:7px;margin-right:5px;background:${i <= step ? '#e2bd64' : '#484054'}"></span>`).join('');
    card.innerHTML = `<div style="font-size:12px;color:#918aa0">首次接入导览 · ${step + 1}/${ONLINE_MODE_TOUR_STEPS.length}</div>
      <div style="margin:8px 0 12px">${dots}</div>
      <div style="font-size:22px;color:#e2bd64;margin-bottom:12px">${item.title}</div>
      <div style="font-size:14px;line-height:1.75;color:#eadcae">${item.body}</div>
      <div style="margin:14px 0;padding:10px 12px;border-left:3px solid #8f6fc4;background:#100d17;font-size:13px;line-height:1.7;color:#bca9d3">${item.points.map((point) => `◆ ${point}`).join('<br>')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px;margin-top:16px">
        <button data-tour="skip">跳过导览</button><button data-tour="back" ${step === 0 ? 'disabled' : ''}>上一步</button>
        <button data-tour="next" style="border-color:#e2bd64;background:#59451f">${step === ONLINE_MODE_TOUR_STEPS.length - 1 ? '完成导览' : '下一步'}</button>
      </div>`;
    card.querySelector('[data-tour="skip"]').onclick = () => closeOnlineModeTour(true);
    card.querySelector('[data-tour="back"]').onclick = () => { step = Math.max(0, step - 1); try { localStorage.setItem(ONLINE_MODE_TOUR_KEY, String(step)); } catch { /* 忽略 */ } paint(); };
    card.querySelector('[data-tour="next"]').onclick = () => {
      if (step >= ONLINE_MODE_TOUR_STEPS.length - 1) { closeOnlineModeTour(true); return; }
      step++;
      try { localStorage.setItem(ONLINE_MODE_TOUR_KEY, String(step)); } catch { /* 忽略 */ }
      paint();
    };
    card.querySelector('[data-tour="next"]').focus();
  };
  rootNode.append(css, card);
  document.body.appendChild(rootNode);
  onlineModeTourRoot = rootNode;
  onlineTourPending = true;
  paint();
  return true;
}

function maybeOpenOnlineModeTour() {
  if (!onlineTourPending) {
    try { onlineTourPending = apiConnectCount() > 0 && localStorage.getItem(ONLINE_MODE_TOUR_KEY) !== 'done'; } catch { /* 忽略 */ }
  }
  if (onlineTourPending && screen === 'manage') setTimeout(() => openOnlineModeTour(), 0);
}

function closeSaveManager() {
  if (saveManagerRoot) saveManagerRoot.remove();
  saveManagerRoot = null;
  render();
}

function saveTime(value) {
  if (!value) return '空';
  try { return new Date(value).toLocaleString('zh-CN', { hour12: false }); } catch { return '已有记录'; }
}

async function openSaveManager() {
  closeSaveManager();
  await flushAutosave();
  saveSlots = await listSlots();
  const active = getActiveSlot();
  const root = document.createElement('div');
  root.id = 'save-manager-overlay';
  root.style.cssText = 'position:fixed;inset:0;z-index:82;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(8,6,14,.9);font-family:monospace;color:#eadcae;';
  const card = document.createElement('div');
  card.style.cssText = 'width:min(720px,96vw);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;padding:16px;border:3px solid #b28a43;box-shadow:0 0 0 3px #21172d,0 12px 40px #000;background:#191423;';
  card.innerHTML = `<div class="sm-head"><div><b>地下城档案柜</b><small>3个战役档 · 每档3个手动快照</small></div><button data-sm="close">关闭</button></div><div class="sm-slots"></div><div class="sm-note">自动档会持续更新；手动快照只有明确点击保存才会覆盖。读取快照会恢复当前自动进度。</div>`;
  const css = document.createElement('style');
  css.textContent = '#save-manager-overlay button{box-sizing:border-box;border:1px solid #76698a;border-radius:0;background:#272033;color:#f1e5bd;font:13px monospace;min-height:34px;padding:6px 9px;cursor:pointer}#save-manager-overlay button:disabled{opacity:.4;cursor:default}#save-manager-overlay .sm-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}#save-manager-overlay .sm-head b{display:block;color:#e2bd64;font-size:20px}#save-manager-overlay .sm-head small{display:block;color:#918aa0;margin-top:4px}#save-manager-overlay .sm-slot{border:1px solid #484054;background:#100d17;padding:10px;margin:8px 0}#save-manager-overlay .sm-slot.active{border-color:#e2bd64}#save-manager-overlay .sm-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}#save-manager-overlay .sm-title{font-size:15px;color:#e2bd64}#save-manager-overlay .sm-meta{font-size:12px;color:#aaa0b5;margin:5px 0 9px;line-height:1.5}#save-manager-overlay .sm-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#save-manager-overlay .sm-shot{border:1px solid #36303f;padding:7px;min-width:0}#save-manager-overlay .sm-shot div{font-size:11px;color:#918aa0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}#save-manager-overlay .sm-shot-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}#save-manager-overlay .sm-note{font-size:12px;color:#918aa0;line-height:1.5;margin-top:10px}@media(max-width:540px){#save-manager-overlay .sm-shots{grid-template-columns:1fr}#save-manager-overlay .sm-shot{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}#save-manager-overlay .sm-shot div{margin:0}}';
  const slotsRoot = card.querySelector('.sm-slots');
  for (const slot of saveSlots) {
    const row = document.createElement('div'); row.className = `sm-slot${slot.slot === active ? ' active' : ''}`;
    const progress = slot.exists ? `${slot.playerName} · ${slot.lairName} · ${slot.overtime ? `加班${slot.otRaid - NORMAL_RAID_COUNT}` : `第${slot.raidNo}轮`}${slot.novel ? ' · 小说战役' : ''}` : '空档位';
    row.innerHTML = `<div class="sm-row"><span class="sm-title">${slot.slot === active ? '◆ ' : ''}档位 ${slot.slot}</span><button data-slot="${slot.slot}">${slot.slot === active ? '当前档' : slot.exists ? '读取自动档' : '选为新档'}</button></div><div class="sm-meta">${progress}<br>${saveTime(slot.updatedAt)}</div><div class="sm-shots"></div>`;
    const select = row.querySelector('[data-slot]'); select.disabled = slot.slot === active;
    select.addEventListener('click', async () => {
      if (slot.exists && !confirm(`读取档位${slot.slot}的自动档？当前档未做手动快照的未来进度将不会保留。`)) return;
      setActiveSlot(slot.slot); await flushAutosave(); location.reload();
    });
    const shots = row.querySelector('.sm-shots');
    for (const shot of slot.snapshots) {
      const box = document.createElement('div'); box.className = 'sm-shot';
      box.innerHTML = `<div>快照${shot.index} · ${shot.exists ? `${shot.overtime ? `加班${shot.otRaid - NORMAL_RAID_COUNT}` : `第${shot.raidNo}轮`} · ${saveTime(shot.updatedAt)}` : '空'}</div><span class="sm-shot-actions"><button data-save>保存</button><button data-load ${shot.exists ? '' : 'disabled'}>读取</button></span>`;
      const canWrite = slot.slot === active && screen === 'manage' && !battlePrepBusy && !novelBusy;
      box.querySelector('[data-save]').disabled = !canWrite;
      box.querySelector('[data-save]').addEventListener('click', async () => {
        if (shot.exists && !confirm(`覆盖档位${slot.slot}的快照${shot.index}？`)) return;
        await saveSnapshot(shot.index, S, slot.slot); say(`已写入快照${shot.index}`); closeSaveManager(); void openSaveManager();
      });
      box.querySelector('[data-load]').addEventListener('click', async () => {
        if (!confirm(`读取快照${shot.index}？它会成为档位${slot.slot}当前的自动进度。`)) return;
        const state = await loadSnapshot(shot.index, slot.slot); if (!state) return;
        setActiveSlot(slot.slot); await queueAutosave(state, slot.slot); await flushAutosave(); location.reload();
      });
      shots.appendChild(box);
    }
    slotsRoot.appendChild(row);
  }
  root.append(css, card); document.body.appendChild(root); saveManagerRoot = root;
  card.querySelector('[data-sm="close"]').addEventListener('click', closeSaveManager);
  root.addEventListener('click', (event) => { if (event.target === root) closeSaveManager(); });
  root.addEventListener('keydown', (event) => { event.stopPropagation(); if (event.key === 'Escape') closeSaveManager(); });
}

function closeNovelPromptManager() {
  if (novelPromptRoot) novelPromptRoot.remove();
  novelPromptRoot = null; render();
}

function openNovelPromptManager() {
  closeNovelPromptManager();
  const draft = loadNovelPromptStructure();
  let active = NOVEL_PROMPT_PIPELINES[0].id;
  const root = document.createElement('div'); root.id = 'novel-prompt-manager';
  root.style.cssText = 'position:fixed;inset:0;z-index:84;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(7,5,12,.92);font-family:monospace;color:#eadcae;';
  const card = document.createElement('div'); card.className = 'npm-card';
  card.innerHTML = `<header><div><b>小说提示词编排器</b><small>按顺序组合多个独立条目；只影响之后的新生成内容</small></div><button data-npm="close">关闭</button></header><div class="npm-locked"><b>锁定核心规则</b>　玩家代理权、事实边界、JSON契约、职业/词缀白名单与数值上限始终优先，不能在这里删除或覆盖。</div><nav></nav><main></main><footer><button data-npm="reset">恢复全部默认</button><span data-npm="status"></span><button data-npm="save">保存结构</button></footer>`;
  const css = document.createElement('style');
  css.textContent = '#novel-prompt-manager .npm-card{width:min(820px,97vw);max-height:calc(100vh - 24px);overflow:hidden;display:grid;grid-template-rows:auto auto auto minmax(180px,1fr) auto;box-sizing:border-box;padding:16px;border:3px solid #8f6fc4;box-shadow:0 0 0 3px #21172d,0 12px 40px #000;background:#191423}#novel-prompt-manager button,#novel-prompt-manager input,#novel-prompt-manager textarea{box-sizing:border-box;border:1px solid #76698a;border-radius:0;background:#272033;color:#f1e5bd;font:13px monospace;padding:7px;outline:none}#novel-prompt-manager button{cursor:pointer;min-height:34px}#novel-prompt-manager button:disabled{opacity:.38;cursor:default}#novel-prompt-manager header{display:flex;align-items:center;justify-content:space-between;gap:12px}#novel-prompt-manager header b{display:block;color:#e2bd64;font-size:20px}#novel-prompt-manager header small{display:block;color:#918aa0;margin-top:4px}#novel-prompt-manager .npm-locked{font-size:12px;line-height:1.5;color:#c5b9cf;border:1px solid #55466d;background:#100d17;padding:8px;margin:10px 0}#novel-prompt-manager nav{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:9px}#novel-prompt-manager nav button.active{border-color:#e2bd64;color:#e2bd64}#novel-prompt-manager main{overflow:auto;padding-right:3px}#novel-prompt-manager .npm-entry{display:grid;grid-template-columns:38px minmax(120px,190px) 1fr auto;gap:7px;align-items:start;border:1px solid #484054;background:#100d17;padding:8px;margin-bottom:7px}#novel-prompt-manager .npm-order{color:#e2bd64;text-align:center;padding-top:9px}#novel-prompt-manager input{width:100%;height:38px}#novel-prompt-manager textarea{width:100%;min-height:72px;resize:vertical;line-height:1.45}#novel-prompt-manager .npm-actions{display:grid;grid-template-columns:38px 38px;gap:5px}#novel-prompt-manager .npm-actions .wide{grid-column:1/3}#novel-prompt-manager .npm-add{width:100%;border-style:dashed;color:#b89be1;margin-bottom:5px}#novel-prompt-manager footer{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:10px}#novel-prompt-manager footer span{font-size:12px;color:#918aa0;text-align:center}@media(max-width:600px){#novel-prompt-manager{padding:6px}#novel-prompt-manager .npm-card{max-height:calc(100vh - 12px);padding:10px}#novel-prompt-manager header b{font-size:17px}#novel-prompt-manager .npm-entry{grid-template-columns:28px 1fr auto}#novel-prompt-manager .npm-entry textarea{grid-column:2/4}#novel-prompt-manager footer{grid-template-columns:1fr 1fr}#novel-prompt-manager footer span{grid-column:1/3;grid-row:1}#novel-prompt-manager nav button{font-size:12px;padding:5px}}';
  const nav = card.querySelector('nav'), main = card.querySelector('main'), status = card.querySelector('[data-npm="status"]');
  const stash = () => {
    const entries = draft[active] ?? [];
    main.querySelectorAll('.npm-entry').forEach((row, index) => {
      if (!entries[index]) return;
      entries[index].name = row.querySelector('[data-name]').value.slice(0, 24);
      entries[index].content = row.querySelector('[data-content]').value.slice(0, 2000);
    });
  };
  const draw = () => {
    nav.replaceChildren();
    for (const pipeline of NOVEL_PROMPT_PIPELINES) {
      const buttonNode = document.createElement('button'); buttonNode.textContent = `${pipeline.name} · ${(draft[pipeline.id] ?? []).length}`;
      buttonNode.className = pipeline.id === active ? 'active' : '';
      buttonNode.onclick = () => { stash(); active = pipeline.id; draw(); }; nav.appendChild(buttonNode);
    }
    main.replaceChildren(); const entries = draft[active] ?? (draft[active] = []);
    entries.forEach((entry, index) => {
      const row = document.createElement('div'); row.className = 'npm-entry';
      row.innerHTML = `<div class="npm-order">${index + 1}</div><input data-name maxlength="24" aria-label="条目名称"><textarea data-content maxlength="2000" aria-label="提示词内容"></textarea><div class="npm-actions"><button data-up title="上移">↑</button><button data-down title="下移">↓</button><button class="wide" data-toggle>${entry.enabled === false ? '已停用' : '已启用'}</button><button class="wide" data-delete>${entry.custom ? '删除条目' : '移除条目'}</button></div>`;
      row.querySelector('[data-name]').value = entry.name; row.querySelector('[data-content]').value = entry.content;
      row.querySelector('[data-up]').disabled = index === 0; row.querySelector('[data-down]').disabled = index === entries.length - 1;
      row.querySelector('[data-up]').onclick = () => { stash(); [entries[index - 1], entries[index]] = [entries[index], entries[index - 1]]; draw(); };
      row.querySelector('[data-down]').onclick = () => { stash(); [entries[index + 1], entries[index]] = [entries[index], entries[index + 1]]; draw(); };
      row.querySelector('[data-toggle]').onclick = () => { stash(); entry.enabled = entry.enabled === false; draw(); };
      row.querySelector('[data-delete]').onclick = () => { stash(); entries.splice(index, 1); draw(); };
      main.appendChild(row);
    });
    const add = document.createElement('button'); add.className = 'npm-add'; add.textContent = '＋ 新增提示词条目';
    add.onclick = () => { stash(); entries.push({ id: `custom-${Date.now().toString(36)}`, name: '新条目', content: '写下这一段提示词的职责和要求。', enabled: true, custom: true }); draw(); main.scrollTop = main.scrollHeight; };
    main.appendChild(add);
  };
  card.querySelector('[data-npm="save"]').onclick = () => { stash(); const ok = saveNovelPromptStructure(draft); status.textContent = ok ? '已保存；下一次生成按当前顺序组合。' : '保存失败，请检查浏览器存储权限。'; status.style.color = ok ? '#67d391' : '#ed6b6b'; };
  card.querySelector('[data-npm="reset"]').onclick = () => {
    if (!confirm('恢复三类小说提示词的默认结构？自定义条目也会被清除。')) return;
    const reset = resetNovelPromptStructure(); for (const key of Object.keys(draft)) delete draft[key]; Object.assign(draft, reset); active = NOVEL_PROMPT_PIPELINES[0].id; status.textContent = '已恢复默认结构。'; draw();
  };
  card.querySelector('[data-npm="close"]').onclick = closeNovelPromptManager;
  root.addEventListener('click', (event) => { if (event.target === root) closeNovelPromptManager(); });
  root.addEventListener('keydown', (event) => { event.stopPropagation(); if (event.key === 'Escape') closeNovelPromptManager(); });
  root.append(css, card); document.body.appendChild(root); novelPromptRoot = root; draw();
}

function toggleUiDensity() {
  uiDensity = uiDensity === 'expert' ? 'standard' : 'expert';
  localStorage.setItem(UI_DENSITY_KEY, uiDensity);
  playSfx('tab');
  say(`信息密度已切换为${uiDensity === 'expert' ? '专家' : '标准'}模式`);
  render();
}

function closeAISettings() {
  if (aiSettingsRoot) aiSettingsRoot.remove();
  aiSettingsRoot = null;
  render();
}

function openAISettings() {
  closeAISettings();
  const saved = loadCfg();
  const initial = saved ?? { provider: 'openai', protocol: 'openai', baseUrl: presetById('openai').baseUrl, key: '', model: '', models: [] };
  const root = document.createElement('div');
  root.id = 'ai-settings-overlay';
  root.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(8,6,14,.86);font-family:monospace;color:#eadcae;';
  const card = document.createElement('div');
  card.style.cssText = 'width:min(560px,96vw);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;padding:18px;border:3px solid #8f6fc4;box-shadow:0 0 0 3px #21172d,0 12px 40px #000;background:#191423;image-rendering:pixelated;';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
      <div><div style="font-size:20px;color:#e2bd64">游戏设置</div><div style="margin-top:4px;font-size:12px;color:#918aa0">界面、AI 接入与创作提示词</div></div>
      <button data-ai="close" style="width:42px;height:34px">关闭</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px"><button data-ai="tab-connection" type="button">接口</button><button data-ai="tab-prompts" type="button">提示词</button><button data-ai="tab-interface" type="button">界面</button></div>
    <div data-ai="panel-connection">
      <label>服务商预设<select data-ai="provider"></select></label>
      <label data-ai="protocol-row">接口协议<select data-ai="protocol"><option value="openai">OpenAI 兼容</option><option value="anthropic">Anthropic</option></select></label>
      <label>接口 Base URL<input data-ai="url" type="url" autocomplete="off" spellcheck="false"></label>
      <label>API Key<div style="display:flex;gap:8px"><input data-ai="key" type="password" autocomplete="new-password" spellcheck="false" style="flex:1"><button data-ai="show-key" type="button" style="width:72px">显示</button></div></label>
      <button data-ai="refresh" type="button" style="width:100%;height:40px;margin:4px 0 10px">刷新模型</button>
      <label>可用模型<select data-ai="model" disabled><option value="">请先刷新模型</option></select></label>
      <div data-ai="status" style="min-height:34px;padding:8px;border:1px solid #484054;background:#100d17;color:#918aa0;box-sizing:border-box">修改地址或 Key 后，需要重新刷新模型。</div>
      <div style="margin-top:10px;font-size:12px;line-height:1.5;color:#918aa0">Key 只保存在这个浏览器中，不进入游戏存档或上传到部署文件。自定义服务需允许浏览器跨域访问。</div>
      <div style="margin-top:10px;padding:8px;border:1px solid #484054;color:#918aa0">未配置有效接口时自动使用本地回声；刷新模型并保存后自动使用外部 AI，无需另设模式开关。</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
        <button data-ai="sound" type="button">${S.muted ? '开启声音' : '关闭声音'}</button><button data-ai="save" type="button" disabled>保存并启用</button>
      </div>
    </div>
    <div data-ai="panel-prompts" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border:1px solid #55466d;background:#100d17"><span style="font-size:12px;color:#bca9d3">小说战役使用独立的多条目编排器。</span><button data-ai="novel-prompts" type="button">打开小说编排器</button></div>
      <label>AI 任务<select data-ai="prompt-task"></select></label>
      <label>任务提示词<textarea data-ai="prompt-text" maxlength="2000" rows="10" spellcheck="false"></textarea></label>
      <div style="font-size:12px;line-height:1.55;color:#918aa0">这里控制文风、侧重点和创作偏好。JSON 格式、字段白名单、事实边界与数值上限由游戏锁定，不能通过提示词绕过。</div>
      <div data-ai="prompt-status" style="min-height:34px;margin-top:10px;padding:8px;border:1px solid #484054;background:#100d17;color:#918aa0;box-sizing:border-box">每个任务分别保存，只影响本浏览器之后的新生成内容。</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px"><button data-ai="prompt-reset" type="button">恢复本项</button><button data-ai="prompt-reset-all" type="button">全部恢复</button><button data-ai="prompt-save" type="button">保存提示词</button></div>
    </div>
    <div data-ai="panel-interface" style="display:none">
      <div style="font-size:16px;color:#e2bd64;margin:6px 0 12px">信息密度</div>
      <div style="padding:12px;border:1px solid #484054;background:#100d17;line-height:1.65">标准摘要只显示结论、风险和关键变化；专家模式额外显示倍率、公式来源和机制标签，不改变任何战斗数值。</div>
      <button data-ai="density" type="button" style="width:100%;height:44px;margin-top:14px">当前：${uiDensity === 'expert' ? '专家信息' : '标准摘要'}</button>
      <div style="font-size:12px;line-height:1.55;color:#918aa0;margin-top:10px">设置只保存在当前浏览器，不进入游戏存档。</div>
    </div>`;
  const css = document.createElement('style');
  css.textContent = '#ai-settings-overlay label{display:block;margin:10px 0 5px;font-size:13px;color:#cbbd91}#ai-settings-overlay input,#ai-settings-overlay select,#ai-settings-overlay textarea,#ai-settings-overlay button{box-sizing:border-box;border:1px solid #76698a;border-radius:0;background:#272033;color:#f1e5bd;font:14px monospace;min-height:36px;padding:7px 9px;outline:none}#ai-settings-overlay input,#ai-settings-overlay select,#ai-settings-overlay textarea{display:block;width:100%;margin-top:5px}#ai-settings-overlay textarea{resize:vertical;line-height:1.5;min-height:190px}#ai-settings-overlay button:not(:disabled){cursor:pointer}#ai-settings-overlay button:disabled{opacity:.42}#ai-settings-overlay input:focus,#ai-settings-overlay select:focus,#ai-settings-overlay textarea:focus,#ai-settings-overlay button:focus{border-color:#e2bd64;box-shadow:0 0 0 1px #e2bd64}';
  root.append(css, card);
  document.body.appendChild(root);
  aiSettingsRoot = root;

  const el = (name) => card.querySelector(`[data-ai="${name}"]`);
  const provider = el('provider'), protocol = el('protocol'), url = el('url'), key = el('key');
  const model = el('model'), refresh = el('refresh'), save = el('save'), status = el('status');
  const connectionPanel = el('panel-connection'), promptsPanel = el('panel-prompts'), interfacePanel = el('panel-interface');
  const promptTask = el('prompt-task'), promptText = el('prompt-text'), promptStatus = el('prompt-status');
  const storedPrompts = loadPromptOverrides();
  const promptValues = Object.fromEntries(AI_PROMPT_TASKS.map((task) => [task.id, storedPrompts[task.id] || task.defaultPrompt]));
  for (const task of AI_PROMPT_TASKS) {
    const option = document.createElement('option'); option.value = task.id; option.textContent = task.name; promptTask.appendChild(option);
  }
  promptTask.value = AI_PROMPT_TASKS[0].id;
  promptText.value = promptValues[promptTask.value];
  const stashPrompt = () => { promptValues[promptTask.value] = promptText.value.slice(0, 2000); };
  const showSettingsTab = (tabName) => {
    const prompts = tabName === 'prompts', interfaceTab = tabName === 'interface';
    connectionPanel.style.display = !prompts && !interfaceTab ? 'block' : 'none';
    promptsPanel.style.display = prompts ? 'block' : 'none'; interfacePanel.style.display = interfaceTab ? 'block' : 'none';
    el('tab-connection').style.borderColor = !prompts && !interfaceTab ? '#e2bd64' : '#76698a';
    el('tab-prompts').style.borderColor = prompts ? '#e2bd64' : '#76698a';
    el('tab-interface').style.borderColor = interfaceTab ? '#e2bd64' : '#76698a';
    (prompts ? promptText : interfaceTab ? el('density') : url).focus();
  };
  el('tab-connection').addEventListener('click', () => { stashPrompt(); showSettingsTab('connection'); });
  el('tab-prompts').addEventListener('click', () => showSettingsTab('prompts'));
  el('tab-interface').addEventListener('click', () => { stashPrompt(); showSettingsTab('interface'); });
  el('novel-prompts').addEventListener('click', () => { closeAISettings(); openNovelPromptManager(); });
  el('density').addEventListener('click', () => { toggleUiDensity(); el('density').textContent = `当前：${uiDensity === 'expert' ? '专家信息' : '标准摘要'}`; });
  promptTask.addEventListener('change', (event) => {
    const prior = event.target.dataset.prior;
    if (prior) promptValues[prior] = promptText.value.slice(0, 2000);
    promptText.value = promptValues[promptTask.value];
    event.target.dataset.prior = promptTask.value;
  });
  promptTask.dataset.prior = promptTask.value;
  el('prompt-reset').addEventListener('click', () => {
    const task = AI_PROMPT_TASKS.find((item) => item.id === promptTask.value);
    promptText.value = task?.defaultPrompt ?? ''; promptValues[promptTask.value] = promptText.value;
    promptStatus.textContent = '当前任务已恢复默认，点击“保存提示词”后生效。';
  });
  el('prompt-reset-all').addEventListener('click', () => {
    for (const task of AI_PROMPT_TASKS) promptValues[task.id] = task.defaultPrompt;
    promptText.value = promptValues[promptTask.value];
    promptStatus.textContent = '全部任务已恢复默认，点击“保存提示词”后生效。';
  });
  el('prompt-save').addEventListener('click', () => {
    stashPrompt();
    const ok = savePromptOverrides(promptValues);
    promptStatus.textContent = ok ? '提示词已保存；下一次对应 AI 任务立即使用。' : '保存失败，请检查浏览器存储权限。';
    promptStatus.style.color = ok ? '#67d391' : '#ed6b6b';
  });
  for (const item of AI_PRESETS) {
    const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; provider.appendChild(option);
  }
  provider.value = initial.provider;
  protocol.value = initial.protocol;
  url.value = initial.baseUrl;
  key.value = initial.key;
  let refreshedSignature = initial.models?.length ? `${initial.protocol}|${normalizeBaseUrl(initial.baseUrl)}|${initial.key}` : '';

  const signature = () => `${protocol.value}|${normalizeBaseUrl(url.value)}|${key.value}`;
  const setStatusText = (text, tone = 'idle') => {
    status.textContent = text;
    status.style.color = tone === 'ok' ? '#67d391' : tone === 'error' ? '#ed6b6b' : '#918aa0';
  };
  const fillModels = (models, picked = '') => {
    model.replaceChildren();
    for (const id of models) { const option = document.createElement('option'); option.value = id; option.textContent = id; model.appendChild(option); }
    model.disabled = !models.length;
    model.value = models.includes(picked) ? picked : (models[0] ?? '');
    save.disabled = !models.length || refreshedSignature !== signature();
  };
  const invalidate = () => {
    refreshedSignature = '';
    fillModels([], '');
    setStatusText('地址或 Key 已改变，请点击“刷新模型”。');
  };
  const syncPreset = (replaceUrl = false) => {
    const item = presetById(provider.value);
    el('protocol-row').style.display = item.id === 'custom' ? 'block' : 'none';
    if (item.id !== 'custom') protocol.value = item.protocol;
    if (replaceUrl && item.baseUrl) url.value = item.baseUrl;
  };
  syncPreset(false);
  fillModels(initial.models ?? [], initial.model);
  if (initial.models?.length) setStatusText(`已保存 ${initial.models.length} 个模型；修改连接信息后需重新刷新。`, 'ok');

  provider.addEventListener('change', () => { syncPreset(true); invalidate(); });
  protocol.addEventListener('change', invalidate);
  url.addEventListener('input', invalidate);
  key.addEventListener('input', invalidate);
  model.addEventListener('change', () => { save.disabled = !model.value || refreshedSignature !== signature(); });
  el('show-key').addEventListener('click', () => { key.type = key.type === 'password' ? 'text' : 'password'; el('show-key').textContent = key.type === 'password' ? '显示' : '隐藏'; });
  refresh.addEventListener('click', async () => {
    refresh.disabled = true; save.disabled = true; model.disabled = true;
    refresh.textContent = '刷新中…'; setStatusText('正在连接接口并读取模型列表…');
    try {
      const cfg = { provider: provider.value, protocol: protocol.value, baseUrl: url.value, key: key.value, model: '', models: [] };
      const models = await refreshModels(cfg);
      refreshedSignature = signature();
      fillModels(models, initial.model);
      setStatusText(`连接成功，发现 ${models.length} 个可用模型。`, 'ok');
    } catch (error) {
      fillModels([], '');
      setStatusText(`${error.message || '刷新失败'}。请检查地址、Key 与浏览器跨域权限。`, 'error');
    } finally {
      refresh.disabled = false; refresh.textContent = '刷新模型';
    }
  });
  save.addEventListener('click', () => {
    const models = [...model.options].map((option) => option.value).filter(Boolean);
    if (!model.value || refreshedSignature !== signature()) { invalidate(); return; }
    const ok = saveCfg({ provider: provider.value, protocol: protocol.value, baseUrl: url.value, key: key.value, model: model.value, models });
    if (!ok) { setStatusText('保存失败，请检查浏览器存储权限。', 'error'); return; }
    const firstConnection = recordSuccessfulApiConnection();
    restoreBackend(); playSfx('buy'); closeAISettings(); say(`AI 已启用：${model.value}`);
    if (firstConnection) maybeOpenOnlineModeTour();
  });
  el('sound').addEventListener('click', () => { toggleMute(); el('sound').textContent = S.muted ? '开启声音' : '关闭声音'; });
  el('close').addEventListener('click', closeAISettings);
  root.addEventListener('click', (event) => { if (event.target === root) closeAISettings(); });
  root.addEventListener('keydown', (event) => { event.stopPropagation(); if (event.key === 'Escape') closeAISettings(); });
  url.focus();
}

function setLlmMode(mode         ) {
  if (mode === 'http') { openAISettings(); return; }
  saveMode(mode);
  restoreBackend();
  playSfx('tab');
  say(mode === 'off' ? '已关闭 AI' : mode === 'gp' ? '已用平台内置的地牢叙事者' : '已切到本地回声（离线可用）');
  render();
}

function openForge(tab                            = 'part') {
  smith = null; stitch = null; graft = null;
  forge = { tab, cat: 'core', brief: '', draft: null, af: null, via: '', busy: false, err: '', pick: 'none', lastCraftTab: tab === 'affix' ? 'affix' : 'part',
    views: { part: { cat: 'core', brief: '', draft: null, af: null, via: '', err: '', pick: 'none' },
      affix: { cat: 'core', brief: '', draft: null, af: null, via: '', err: '', pick: 'none' } } };
  pageState['forge-look'] = 0;
  pageState['forge-power'] = 0;
  ensureForgeInput();
  syncForgePlaceholder();
  playSfx('tab');
  render();
  if (portrait) scheduleLayout();
}

function closeForge() {
  forge = null;
  removeForgeInput();
  playSfx('tab');
  render();
  if (portrait) scheduleLayout();
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

function switchForgeTab(next) {
  const f = forge;
  if (!f || f.busy || !['part', 'affix', 'book'].includes(next)) return;
  if (f.tab === 'part' || f.tab === 'affix') {
    f.views[f.tab] = { cat: f.cat, brief: forgeInput?.value ?? f.brief, draft: f.draft, af: f.af,
      via: f.via, err: f.err, pick: f.pick };
    f.lastCraftTab = f.tab;
  }
  f.tab = next;
  if (next === 'part' || next === 'affix') {
    const view = f.views[next];
    Object.assign(f, view);
    f.tab = next; f.lastCraftTab = next;
    if (forgeInput) forgeInput.value = f.brief;
  }
  f.pick = next === 'book' ? 'none' : f.pick;
  pageState['book'] = 0;
  syncForgePlaceholder(); playSfx('tab'); render();
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
      const r = await requestPart(f.cat, brief, storySnapshot(), diyRules());
      if (!r) { f.err = llmStatus().note || '这次没造出来，换个说法再试'; f.draft = null; }
      else { f.draft = r.draft; f.via = r.via; playSfx('buy'); }
    } else {
      const r = await requestAffix(f.cat, brief, storySnapshot(), diyRules());
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
  const rules = diyRules();
  if (f.tab === 'part' && f.draft) {
    const cur = f.draft.powers;
    const p = powerById(id);
    if (!p) return;
    if (cur.includes(id)) { f.draft = { ...f.draft, powers: cur.filter((x) => x !== id) }; playSfx('tab'); render(); return; }
    const spent = cur.map(powerById).reduce((n, x) => n + (x?.cost ?? 0), 0);
    if (cur.length >= rules.maxPowers) { say(`最多${rules.maxPowers}项能力`); return; }
    if (spent + p.cost > rules.powerCap) { say(`能力分超了（上限 ${rules.powerCap}）`); return; }
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
    if (cur.length >= rules.maxPowers) { say(`最多${rules.maxPowers}项效果`); return; }
    if (spent + p.cost > rules.powerCap) { say(`效果分超了（上限 ${rules.powerCap}）`); return; }
    f.af = { ...f.af, powers: [...cur, id] };
    playSfx('place');
    render();
  }
}

function confirmAffix() {
  const f = forge;
  if (!f?.af) return;
  if (S.diyAf.length >= diyAffixCap()) { say(`自定义词缀已满（${diyAffixCap()}），先拆掉一个`); return; }
  const cost = currentAffixCost(f.af);
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
  S.mana += Math.round(currentAffixCost(d.draft).mana * 0.5);
  syncDiyAffixes();
  persist();
  playSfx('tab');
  say(`${d.draft.name} 已拆解`);
  render();
}

function confirmForge() {
  const f = forge;
  if (!f || !f.draft) return;
  if (S.diy.length >= diyPartCap()) { say(`造件已满（${diyPartCap()}），先拆掉一个`); return; }
  const cost = currentDraftCost(f.cat, f.draft);
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
  S.mana += Math.round(currentDraftCost(d.cat, d.draft).mana * 0.5);
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
  const slotFull = st.editUid == null && S.monsters.length >= monsterCap();
  const relicCost = st.editUid != null ? Math.max(0, legendaryPartCount(st.parts) - legendaryPartCount(editBaseParts ?? st.parts)) : legendaryPartCount(st.parts);
  const can = S.bone >= payBone && S.mana >= manaCost && S.relic >= relicCost && !capFull && !slotFull;
  label(modalLayer, `${st.editUid != null ? `重组 ${payBone}` : `造价 ${cost}`}骨+${manaCost}魔${relicCost ? `+${relicCost}遗物` : ''}`, 200, 168, 12, can ? C.gold : C.red);
  let note = '';
  if (capFull) note = `图纸已满（${CUSTOM_CAP}）`;
  else if (slotFull) note = `怪物栅已满（${monsterCap()}）`;
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
    hits.add(x, 16, 48, 17, () => switchForgeTab(id));
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
    hits.add(x, 34, 42, 18, () => { f.cat = c.cat; if (isPart) f.draft = null; else f.af = null;
      f.brief = ''; if (forgeInput) forgeInput.value = ''; f.pick = 'none'; playSfx('tab'); render(); });
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
  label(modalLayer, `自制部件 ${S.diy.length}/${diyPartCap()}・自制词缀 ${S.diyAf.length}/${diyAffixCap()}`, 22, 38, 12, C.purple);
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
       `· 上限 ${diyPartCap()} 个，现有 ${S.diy.length} 个`]
    : ['口述一个词缀，刻到所选部位上：',
       cut('· 只改数值与机制，不新增贴图', w),
       cut('· 草案可手改效果（预算内勾两项）', w),
       `· 上限 ${diyAffixCap()} 个，现有 ${S.diyAf.length} 个`];
  rows.forEach((t, i2) => label(modalLayer, cut(t, listed ? 18 : 32), 30, 90 + i2 * 16, 12, i2 === 0 ? C.stoneLit : C.wall));
  const list                                                    = isPart
    ? S.diy.slice(0, 4).map((d) => ({ name: d.draft.name, sub: `${CATS.find((c) => c.cat === d.cat) .name}・${partById(d.id)?.bone ?? 0}骨`, drop: () => dropDiy(d.id) }))
    : S.diyAf.slice(0, 4).map((d) => ({ name: d.draft.name, sub: `${CATS.find((c) => c.cat === d.cat) .name}・${currentAffixCost(d.draft).mana}魔`, drop: () => dropDiyAffix(d.id) }));
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
  label(modalLayer, ps.length ? cut(`能力 ${ps.map((x) => x.name).join('・')}（${pts}/${diyRules().powerCap}分）`, 20) : '无特殊能力', 256, 120, 12, C.purple);
  boundedText(modalLayer, ps.map((x) => x.desc).join('；') || '只是块料子。', 256, 140, 196, 44, 12, C.stoneLit);
}

function drawAffixDraft(d               ) {
  label(modalLayer, cut(d.name, 6), 30, 88, 12, C.white);
  label(modalLayer, `「${d.word}」字・刻在${CATS.find((c) => c.cat === forge .cat) .name}`, 30, 104, 12, C.stoneLit);
  boundedText(modalLayer, d.desc, 30, 124, 196, 58, 12, C.bone);
  const ps = d.powers.map(affixPowerById).filter(Boolean)                                                  ;
  const pts = ps.reduce((n, x) => n + x.cost, 0);
  label(modalLayer, cut(`效果 ${ps.map((x) => x.name).join('・')}（${pts}/${diyRules().powerCap}分）`, 22), 240, 88, 12, C.purple);
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
  const rules = diyRules(), cap = rules.powerCap;
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
  label(modalLayer, `已用 ${spent}/${cap} 分・最多${rules.maxPowers}项・点已选可取消`, 22, 240, 12, spent > cap ? C.red : C.wall);
}

function drawForgeFooter(g               , isPart         ) {
  const f = forge ;
  if (isPart) {
    const cost = currentDraftCost(f.cat, f.draft );
    const can = S.mana >= cost.mana && S.diy.length < diyPartCap();
    label(modalLayer, `入册 ${cost.mana} 魔・部件造价 ${cost.bone} 骨`, 22, 204, 12, can ? C.gold : C.red);
    label(modalLayer, S.diy.length >= diyPartCap() ? `造件已满（${diyPartCap()}）` : S.mana < cost.mana ? '魔质不足' : cut(`由 ${f.via} 缝制`, 16), 22, 220, 12,
      can ? C.wall : C.red);
    button(g, modalLayer, hits, 246, 204, 96, 20, '重新口述', () => { f.draft = null; f.err = ''; f.pick = 'none'; render(); }, { size: 12 });
    button(g, modalLayer, hits, 350, 204, 108, 20, '入册', () => confirmForge(),
      { size: 12, enabled: can, fill: C.purpleDark, border: C.purple, color: C.white });
  } else {
    const cost = currentAffixCost(f.af );
    const can = S.mana >= cost.mana && S.diyAf.length < diyAffixCap();
    label(modalLayer, `入册 ${cost.mana} 魔・之后每次挂上也收 ${cost.mana} 魔`, 22, 204, 12, can ? C.gold : C.red);
    label(modalLayer, S.diyAf.length >= diyAffixCap() ? `词缀已满（${diyAffixCap()}）` : S.mana < cost.mana ? '魔质不足' : cut(`由 ${f.via} 刻成`, 16), 22, 220, 12,
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
  if (S.monsters.length >= monsterCap()) { say(`怪物栅已满（${monsterCap()}）`); return; }
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
  sel = null;
  playSfx('break');
  persist();
  say(`拆解${k.name}，返还${refund}骨币`);
  render();
}

function deleteCustomKind(kindId        ) {
  const def = S.customs.find((item) => item.id === kindId);
  if (!def || !isCustomKind(kindId)) return false;
  const owned = S.monsters.filter((item) => item.kind === kindId).length;
  if (owned > 0) {
    customDeleteConfirm = '';
    say(`仍有${owned}只${def.name}在编制中；请先遣散，图纸不会再随最后一只怪物自动消失`);
    render();
    return false;
  }
  if (customDeleteConfirm !== kindId) {
    customDeleteConfirm = kindId;
    say(`再次点击“确认删除”，永久移除${def.name}的招募图纸`);
    render();
    return false;
  }
  customDeleteConfirm = '';
  S.customs = S.customs.filter((item) => item.id !== kindId);
  unregisterKind(kindId);
  syncCustoms();
  const texKey = `tex-${kindId}`;
  const old = TEX[texKey];
  if (old && 'destroy' in old) staleTex.push(old);
  delete TEX[texKey];
  if (sel?.kind === 'monkind' && sel.id === kindId) sel = null;
  if (selectedEntity?.type === 'monster-kind' && selectedEntity.id === kindId) selectedEntity = null;
  pageState['mob-kinds'] = 0;
  pageState['portrait-mob-recruit'] = 0;
  playSfx('break');
  persist();
  say(`已删除${def.name}的招募图纸`);
  render();
  return true;
}

function addTestResources() {
  S.bone += 1000; S.mana += 1000; playSfx('buy'); persist(); say('测试：骨币与魔质各 +1000'); render();
}

function toggleMute() {
  S.muted = !S.muted; setMuted(S.muted); persist(); render();
}

function clearTransientUi() {
  closeOnlineModeTour(false);
  closeNovelDecisionCard(true);
  sel = null; heroSel = null; detailPopup = null; researchModal = null; raidBriefing = null; lawAudit = null; stitch = null; forge = null; graft = null; smith = null;
  selectedEntity = null; inspectorView = 'summary'; desktopSystemMenu = false;
  armySection = 'mob'; archiveSection = 'report';
  battle = null; battleCheckpoint = null; battleLayer.visible = false; confirmNew = false; titleNewConfirm = false;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear(); endingBuilt = false; endingActionRect = null; endingRebirthRect = null;
}

function closeIdentitySetup() { if (identityRoot) identityRoot.remove(); identityRoot = null; }
function randomIdentity(kind) {
  const pool = kind === 'lord' ? LORD_NAMES : LAIR_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
function openIdentitySetup(doctrineId = 'default') {
  closeIdentitySetup(); pendingDoctrine = doctrineId;
  const rootNode = document.createElement('div'); rootNode.id = 'identity-setup';
  rootNode.style.cssText = 'position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(4,3,8,.93);font-family:monospace;color:#eadcae';
  rootNode.innerHTML = `<div style="width:min(460px,96vw);box-sizing:border-box;padding:20px;border:3px solid #e2bd64;background:#191423;box-shadow:0 0 0 3px #21172d">
    <div style="font-size:22px;color:#e2bd64;margin-bottom:8px">登记偏远地区创业主体</div>
    <div style="font-size:13px;line-height:1.55;color:#918aa0;margin-bottom:16px">王国要求每一位魔王和每一处地牢都有名字，主要方便寄送讨伐通知与欠税单。</div>
    <label style="display:block;margin:10px 0">魔王姓名<div style="display:flex;gap:8px;margin-top:6px"><input data-id="lord" maxlength="12"><button data-roll="lord" title="随机姓名">🎲</button></div></label>
    <label style="display:block;margin:10px 0">地牢名称<div style="display:flex;gap:8px;margin-top:6px"><input data-id="lair" maxlength="16"><button data-roll="lair" title="随机地牢名">🎲</button></div></label>
    <div data-error style="min-height:20px;color:#ed6b6b;font-size:12px"></div>
    <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:10px;margin-top:8px"><button data-cancel>返回</button><button data-confirm>提交创业备案</button></div></div>`;
  const css = document.createElement('style'); css.textContent = '#identity-setup input,#identity-setup button{box-sizing:border-box;min-height:44px;border:1px solid #76698a;background:#272033;color:#f1e5bd;font:16px monospace;padding:8px}#identity-setup input{width:100%;flex:1}#identity-setup button{cursor:pointer}#identity-setup button:focus,#identity-setup input:focus{outline:1px solid #e2bd64;border-color:#e2bd64}';
  rootNode.prepend(css); document.body.appendChild(rootNode); identityRoot = rootNode;
  const lord = rootNode.querySelector('[data-id="lord"]'), lair = rootNode.querySelector('[data-id="lair"]');
  lord.value = randomIdentity('lord'); lair.value = randomIdentity('lair');
  rootNode.querySelector('[data-roll="lord"]').onclick = () => { lord.value = randomIdentity('lord'); };
  rootNode.querySelector('[data-roll="lair"]').onclick = () => { lair.value = randomIdentity('lair'); };
  rootNode.querySelector('[data-cancel]').onclick = () => { closeIdentitySetup(); render(); };
  rootNode.querySelector('[data-confirm]').onclick = () => {
    const identity = { playerName: lord.value.trim().slice(0, 12), lairName: lair.value.trim().slice(0, 16) };
    if (!identity.playerName || !identity.lairName) { rootNode.querySelector('[data-error]').textContent = '姓名和地牢名都不能留空——欠税单需要收件人。'; return; }
    closeIdentitySetup(); beginNewRun(pendingDoctrine, identity);
  };
  lord.focus();
}

async function beginNewRun(doctrineId = 'default', identity = null) {
  await clearSlot(getActiveSlot());
  S = freshSave(doctrineId);
  S.playerName = identity?.playerName || randomIdentity('lord');
  S.lairName = identity?.lairName || randomIdentity('lair');
  S.story.vars.playerName = S.playerName; S.story.vars.lairName = S.lairName;
  syncDiyAffixes(); syncDiy(); syncCustoms();
  clearTransientUi();
  tab = 'throne'; screen = 'intro'; portraitPane = 0;
  persist();
  playMusic('bgm-manage');
  scheduleLayout(); render();
  say(`${S.playerName}已接管${S.lairName}`);
}

function finishIntro() {
  if (screen !== 'intro') return;
  S.introSeen = true;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  screen = 'manage';
  syncIntroDom();
  persist(); playMusic('bgm-manage'); scheduleLayout(); render(); maybeOpenOnlineModeTour();
}

function continueGame() {
  if (!saveExists) { titleMode = meta.clears > 0 ? 'doctrine' : 'main'; render(); return; }
  closeIdentitySetup();
  clearTransientUi();
  screen = 'manage'; tab = featureOpen(tab) ? tab : 'throne'; portraitPane = 0;
  playMusic('bgm-manage'); scheduleLayout(); render();
  maybeOpenOnlineModeTour();
}

function startFromTitle() {
  if (saveExists && !titleNewConfirm) {
    titleNewConfirm = true;
    say('再次点击开始新游戏，将覆盖当前进度');
    render();
    return;
  }
  titleNewConfirm = false;
  if (meta.clears > 0) { titleMode = 'doctrine'; titleDoctrinePick = 'default'; render(); }
  else openIdentitySetup('default');
}

function openNewCycle() {
  clearTransientUi();
  screen = 'title'; titleMode = 'doctrine'; titleDoctrinePick = 'default';
  scheduleLayout(); render();
}

function buildTitle() {
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear(); titleActionRects = {};
  const g = new PIXI.Graphics(); overlay.addChild(g);
  g.rect(0, 0, VIEW_W, VIEW_H).fill(C.bg);
  if (TEX['tile-wall']) {
    const wall = new PIXI.TilingSprite({ texture: TEX['tile-wall'], width: VIEW_W, height: VIEW_H });
    wall.tileScale.set(0.72); wall.tint = 0x31273f; wall.alpha = 0.72; overlay.addChild(wall);
  }
  const shade = new PIXI.Graphics(); overlay.addChild(shade);
  shade.rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x08070d, alpha: 0.36 });
  const throne = sprite('icon-throne', 240, titleMode === 'main' ? 156 : 60, titleMode === 'main' ? 92 : 52);
  throne.alpha = 0.72; overlay.addChild(throne);
  labelC(overlay, GAME_NAME, 240, 20, 25, C.gold);
  labelC(overlay, '经营黑暗 · 守住王座', 240, 50, 11, C.bone);
  button(g, overlay, hits, 390, 8, 82, 22, `档位 ${getActiveSlot()}`, () => void openSaveManager(), { size: 10, border: C.gold, color: C.gold });
  const bg = new PIXI.Graphics(); overlay.addChild(bg);
  if (titleMode === 'main') {
    panelF(bg, overlay, 'scroll', 132, 80, 216, 160, C.wall);
    boundedText(overlay, saveExists ? `存档进度：第 ${S.overtime ? `加班 ${S.otRaid - NORMAL_RAID_COUNT}` : `${S.raidNo}/${NORMAL_RAID_COUNT}`} 轮` : '王座空悬，等待新的地下城主。', 154, 94, 172, 32, 10, C.stoneLit, { align: 'center' });
    if (saveExists) {
      titleActionRects.continue = { x: 164, y: 137, w: 152, h: 34 };
      button(bg, overlay, hits, 164, 137, 152, 34, '继续游戏', continueGame, { size: 15, fill: C.greenDark, border: C.green, color: C.white });
    }
    titleActionRects.new = { x: 164, y: saveExists ? 181 : 153, w: 152, h: 34 };
    button(bg, overlay, hits, titleActionRects.new.x, titleActionRects.new.y, 152, 34,
      titleNewConfirm ? '确认覆盖并开始' : '开始新游戏', startFromTitle,
      { size: 15, fill: titleNewConfirm ? C.redDark : C.wallLit, border: titleNewConfirm ? C.red : C.gold, color: C.white });
    if (meta.clears > 0) labelC(overlay, `轮回方针已解锁 · 通关 ${meta.clears} 次`, 240, 224, 9, C.purple);
    return;
  }
  labelC(overlay, '选择本轮开局方针', 240, 69, 13, C.white);
  Object.values(DOCTRINES).forEach((d, i) => {
    const x = 12 + i * 116, y = 88, selected = titleDoctrinePick === d.id;
    titleActionRects[`doctrine-${d.id}`] = { x, y, w: 108, h: 65 };
    panelF(bg, overlay, 'stone', x, y, 108, 65, selected ? C.gold : C.wall);
    labelC(overlay, d.name, x + 54, y + 11, 11, selected ? C.ink : C.bone);
    labelC(overlay, `【${d.tag}】`, x + 54, y + 31, 9, selected ? C.white : C.stoneLit);
    hits.add(x, y, 108, 65, () => { titleDoctrinePick = d.id; playSfx('tab'); render(); });
  });
  const picked = DOCTRINES[titleDoctrinePick] ?? DOCTRINES.default;
  panelF(bg, overlay, 'scroll', 42, 160, 396, 54, C.wall);
  boundedText(overlay, picked.desc, 58, 171, 364, 38, 9, C.bone);
  titleActionRects.back = { x: 82, y: 224, w: 120, h: 30 };
  titleActionRects.confirm = { x: 278, y: 224, w: 120, h: 30 };
  button(bg, overlay, hits, 82, 224, 120, 30, '返回', () => { titleMode = 'main'; titleNewConfirm = false; render(); }, { size: 12 });
  button(bg, overlay, hits, 278, 224, 120, 30, '以此方针开局', () => openIdentitySetup(titleDoctrinePick),
    { size: 12, fill: C.purpleDark, border: C.gold, color: C.white });
}

function requestNewGame() {
  if (confirmNew) {
    confirmNew = false;
    screen = 'title'; titleMode = meta.clears > 0 ? 'doctrine' : 'main'; titleNewConfirm = false;
    clearTransientUi(); scheduleLayout(); render();
  } else {
    confirmNew = true; say('再点一次“新档”返回标题并选择新开局'); render();
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
  ico('icon-mana', 74);
  label(uiLayer, `${S.mana}`, 92, 12, 12, C.purple);
  const raid = currentRaid();
  label(uiLayer, S.overtime ? `加班${raid.no - NORMAL_RAID_COUNT}` : `${S.raidNo}/${NORMAL_RAID_COUNT}轮`, 144, 12, 12, C.bone);
  if (activeZone() === 'army') {
    button(g, uiLayer, hits, 204, 6, 56, 22, '怪物', () => setTab('mob'), { size: 11, fill: tab === 'mob' ? C.wallLit : C.wall, border: tab === 'mob' ? C.gold : C.stoneLit, color: C.white });
    if (featureOpen('hero')) button(g, uiLayer, hits, 262, 6, 56, 22, '英雄', () => setTab('hero'), { size: 11, fill: tab === 'hero' ? C.wallLit : C.wall, border: tab === 'hero' ? C.gold : C.stoneLit, color: C.white });
  } else if (activeZone() === 'archive') {
    const sections = featureOpen('story') ? [['report', '战报'], ['story', '秘闻'], ['chronicle', '编年'], ...(novelAvailable() ? [['novel', '小说']] : [])] : [['report', '战报']];
    const start = sections.length === 4 ? 188 : 204, sw = sections.length === 4 ? 31 : 36;
    sections.forEach(([id, name], i) => button(g, uiLayer, hits, start + i * (sw + 2), 6, sw, 22, name, () => setArchiveSection(id),
      { size: 10, fill: archiveSection === id ? C.wallLit : C.wall, border: archiveSection === id ? C.gold : C.stoneLit, color: C.white }));
  } else label(uiLayer, NAV_ZONES.find((item) => item.id === activeZone())?.name ?? '', 224, 12, 12, C.stoneLit);
  const tasks = uiTasks(), blocked = tasks.some((task) => task.blocking);
  button(g, uiLayer, hits, 324, 6, 70, 22, `事务 ${tasks.length}`, () => { selectedEntity = { type: 'tasks' }; setZone('throne'); },
    { size: 11, fill: blocked ? C.redDark : C.ink, border: blocked ? C.red : tasks.length ? C.gold : C.green, color: blocked ? C.white : tasks.length ? C.gold : C.green });
  button(g, uiLayer, hits, 398, 6, 78, 22, desktopSystemMenu ? '关闭菜单' : '系统菜单', () => { desktopSystemMenu = !desktopSystemMenu; render(); },
    { size: 11, fill: desktopSystemMenu ? C.wallLit : C.wall, border: desktopSystemMenu ? C.gold : C.stoneLit, color: C.white });
  if (saveFlash > 0) label(uiLayer, '已保存', 174, 12, 9, C.green);
}
let confirmNew = false;

function drawDesktopSystemMenu(g) {
  if (!desktopSystemMenu) return;
  panelF(g, uiLayer, 'stone', 330, 36, 146, 225, C.wall);
  label(uiLayer, '系统菜单', 342, 44, 12, C.gold);
  const actions = [
    ['档位与主动存档', () => void openSaveManager(), C.gold],
    ['导出存档', exportSave, C.bone], ['导入存档', importSave, C.bone],
    [S.muted ? '开启声音' : '关闭声音', toggleMute, C.purple],
    [`信息：${uiDensity === 'expert' ? '专家' : '标准'}`, toggleUiDensity, C.gold],
    ['AI与提示词设置', openAISettings, C.purple],
    [confirmNew ? '确认开始新档' : '开始新档', requestNewGame, confirmNew ? C.red : C.gold],
  ];
  actions.forEach(([name, action, color], i) => button(g, uiLayer, hits, 340, 62 + i * 27, 126, 23, name, action,
    { size: 11, fill: i === 6 && confirmNew ? C.redDark : C.ink, border: color, color: i === 6 && confirmNew ? C.white : color }));
}

function portraitPage(items, key, per) {
  const pages = Math.max(1, Math.ceil(items.length / per));
  const page = Math.max(0, Math.min(pages - 1, Math.round(pageState[key] || 0)));
  pageState[key] = page;
  return { view: items.slice(page * per, page * per + per), page, pages };
}

function portraitPager(key, page, pages, x, y, w) {
  if (pages <= 1) return;
  button(portraitGfx, portraitLayer, portraitHits, x, y, 42, 34, '◀', () => {
    pageState[key] = (page - 1 + pages) % pages; playSfx('tab'); render();
  }, { size: 16, border: C.stoneLit, color: C.bone });
  labelC(portraitLayer, `${page + 1}/${pages}`, x + w / 2, y + 7, 14, C.stoneLit);
  button(portraitGfx, portraitLayer, portraitHits, x + w - 42, y, 42, 34, '▶', () => {
    pageState[key] = (page + 1) % pages; playSfx('tab'); render();
  }, { size: 16, border: C.stoneLit, color: C.bone });
}

function portraitGuideBanner(x, y, w) {
  const guide = roundGuide();
  if (!guide) return null;
  const textX = x + 12, textY = y + 31, textW = w - 24;
  const measured = measureWrappedText(guide[1], textW, 12);
  const textH = Math.ceil(measured.height);
  const height = Math.max(66, 31 + textH + 10);
  portraitGfx.roundRect(x, y, w, height, 4).fill(C.ink).stroke({ width: 2, color: C.gold, alignment: 0 });
  label(portraitLayer, guide[2] ? '当前教学・阅读后确认' : '当前引导・前往高光区域', x + 12, y + 8, 12, C.gold);
  const block = boundedText(portraitLayer, guide[1], textX, textY, textW, textH + 1, 12, C.white);
  return { x, y, w, h: height, textHeight: textH, truncated: block.truncated, message: guide[1] };
}

function raidAffixBody(raid, id) {
  const info = raidAffixInfo(raid, id);
  if (!info) return '未知词缀。';
  const levels = info.values.map((value, index) => `${['I', 'II', 'III', 'IV'][index]}　${value}${index + 1 === info.level ? '　← 本轮' : ''}`).join('\n');
  return `${info.desc}\n\n本轮等级：${info.roman}\n本轮效果：${info.value}\n\n等级变化\n${levels}`;
}

function openRaidAffix(raid, id) {
  const info = raidAffixInfo(raid, id);
  if (info) openDetailPopup(`${info.name} ${info.roman}`, raidAffixBody(raid, id), C.red);
}

function drawPortraitThrone(x, y, w, h) {
  const raid = currentRaid();
  const economy = dungeonEconomyPreview();
  const tasks = uiTasks();
  const selectedTask = selectedEntity?.type === 'task' ? tasks.find((task) => task.id === selectedEntity.id) : null;
  const selectedEnemy = selectedEntity?.type === 'enemy' ? raid.members[selectedEntity.index] : null;
  if (selectedTask || selectedEnemy) {
    button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 76, 38, '← 返回', () => { selectedEntity = null; inspectorView = 'summary'; render(); }, { size: 14 });
    label(portraitLayer, '上下文检查器', x + 96, y + 12, 18, C.gold);
    const bodyY = y + 52;
    panelF(portraitGfx, portraitLayer, 'stone', x + 8, bodyY, w - 16, h - 58, C.wall);
    if (selectedTask) {
      const color = UI_TASK_TONE[selectedTask.severity];
      label(portraitLayer, selectedTask.title, x + 24, bodyY + 18, 19, color);
      label(portraitLayer, selectedTask.severity === 'block' ? '阻止迎战' : selectedTask.severity === 'warning' ? '风险提示' : '发展机会', x + 24, bodyY + 48, 14, color);
      boundedText(portraitLayer, `${selectedTask.summary}\n\n原因：${selectedTask.reason}`, x + 24, bodyY + 76, w - 48, Math.max(90, h - 210), 14, C.bone);
      button(portraitGfx, portraitLayer, portraitHits, x + 20, bodyY + h - 160, w - 40, 44, '前往处理', () => navigateUiTask(selectedTask), { size: 16, fill: C.wallLit, border: color, color: C.white });
      button(portraitGfx, portraitLayer, portraitHits, x + 20, bodyY + h - 108, w - 40, 40, '查看完整说明', () => openDetailPopup(selectedTask.title, `${selectedTask.summary}\n\n触发原因：${selectedTask.reason}\n\n该事务不会自动消费资源，前往后仍需手动确认操作。`, color), { size: 14, border: C.gold, color: C.gold });
    } else {
      const cls = HERO_CLASSES[selectedEnemy.cls];
      label(portraitLayer, `${cls.name}・Lv${selectedEnemy.lv}`, x + 24, bodyY + 18, 19, cls.role === '首领' ? C.gold : C.white);
      label(portraitLayer, `战场定位：${cls.role}`, x + 24, bodyY + 48, 14, C.red);
      boundedText(portraitLayer, cls.intel, x + 24, bodyY + 76, w - 48, Math.max(120, h - 190), 14, C.bone);
      button(portraitGfx, portraitLayer, portraitHits, x + 20, bodyY + h - 108, w - 40, 40, '完整敌情百科', () => openDetailPopup(`${cls.name}・敌情`, `${cls.intel}\n\n等级：${selectedEnemy.lv}\n定位：${cls.role}\n本轮词缀：${raid.affixes.length ? affixText(raid.affixes, raid) : '无'}`, C.red), { size: 14, border: C.red, color: C.red });
    }
    return;
  }
  label(portraitLayer, `作战台・${raid.title}`, x + 8, y + 4, 17, C.white);
  label(portraitLayer, `${raid.members.length}名勇者`, x + w - 92, y + 6, 13, C.bone);
  const cols = Math.min(3, Math.max(1, raid.members.length));
  const cardW = Math.floor((w - 16 - (cols - 1) * 6) / cols);
  raid.members.forEach((member, i) => {
    const cls = HERO_CLASSES[member.cls];
    const cx = x + 8 + (i % cols) * (cardW + 6);
    const cy = y + 32 + Math.floor(i / cols) * 82;
    portraitGfx.roundRect(cx, cy, cardW, 76, 4).fill(C.wall).stroke({ width: 1, color: cls.role === '首领' ? C.gold : C.stoneLit, alignment: 0 });
    const s = sprite(cls.tex, cx + 28, cy + 61, 42); portraitLayer.addChild(s);
    label(portraitLayer, cut(cls.name, 6), cx + 54, cy + 14, 14, cls.role === '首领' ? C.gold : C.white);
    label(portraitLayer, `Lv${member.lv}`, cx + 54, cy + 36, 13, C.stoneLit);
    portraitHits.add(cx, cy, cardW, 76, () => { selectedEntity = { type: 'enemy', index: i }; inspectorView = 'summary'; render(); });
  });
  const rows = Math.ceil(raid.members.length / cols);
  let infoY = y + 38 + rows * 82;
  if (raid.affixes.length) {
    label(portraitLayer, '本轮词缀・点击查看规则', x + 8, infoY, 14, C.red);
    const affixW = Math.floor((w - 16 - (raid.affixes.length - 1) * 6) / raid.affixes.length);
    raid.affixes.forEach((id, i) => {
      const info = raidAffixInfo(raid, id);
      button(portraitGfx, portraitLayer, portraitHits, x + 8 + i * (affixW + 6), infoY + 24, affixW, 38,
        `${info?.name ?? id} ${info?.roman ?? ''}`, () => openRaidAffix(raid, id), { size: 13, fill: C.redDark, border: C.red, color: C.white });
    });
    infoY += 72;
  }
  label(portraitLayer, `本轮事务 ${tasks.length}`, x + 8, infoY, 16, tasks.some((task) => task.blocking) ? C.red : tasks.length ? C.gold : C.green);
  const pg = portraitPage(tasks, 'portrait-ui-tasks', Math.max(2, Math.min(4, Math.floor((h - (infoY - y) - 44) / 58))));
  pg.view.forEach((task, i) => {
    const cy = infoY + 28 + i * 58, color = UI_TASK_TONE[task.severity];
    portraitGfx.roundRect(x + 8, cy, w - 16, 52, 4).fill(C.wall).stroke({ width: 1, color, alignment: 0 });
    label(portraitLayer, `${task.severity === 'block' ? '阻止' : task.severity === 'warning' ? '警告' : '机会'}・${cut(task.title, 15)}`, x + 18, cy + 8, 14, color);
    label(portraitLayer, cut(task.summary, 24), x + 18, cy + 30, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 86, cy + 9, 70, 34, '查看', () => { selectedEntity = { type: 'task', id: task.id }; render(); }, { size: 13, border: color, color });
  });
  if (!tasks.length) {
    panelF(portraitGfx, portraitLayer, 'stone', x + 8, infoY + 28, w - 16, 82, C.wall);
    label(portraitLayer, '✓ 防线没有显著问题', x + 20, infoY + 42, 15, C.green);
    label(portraitLayer, `布防${countPlaced()}・封印${Math.max(25, sealMax() + battleMods().sealAdd)}・待产${economy.bone}骨${economy.mana}魔`, x + 20, infoY + 70, 12, C.bone);
  }
  portraitPager('portrait-ui-tasks', pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitMob(x, y, w, h) {
  const selectedInst = sel?.kind === 'inst' ? instById(sel.uid) : null;
  if (portraitMobView === 'owned' && selectedInst) {
    const k = instKind(selectedInst), mult = LEVEL_MULT[selectedInst.lv - 1];
    button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 76, 36, '← 列表', () => { sel = null; render(); }, { size: 14 });
    portraitLayer.addChild(portraitEffect(sprite(k.tex, x + 116, y + 76, 64), selectedInst.lv >= 5, true, selectedInst.uid));
    label(portraitLayer, `${k.name}　Lv${selectedInst.lv}`, x + 162, y + 16, 18, C.gold);
    label(portraitLayer, `生命 ${Math.round(k.hp * mult)}　攻击 ${Math.round(k.atk * mult)}`, x + 162, y + 48, 14, C.bone);
    label(portraitLayer, `防御 ${Math.round(k.def * mult)}　速度 ${k.spd.toFixed(1)}`, x + 162, y + 73, 14, C.bone);
    panelF(portraitGfx, portraitLayer, 'stone', x + 8, y + 100, w - 16, 112, C.wall);
    label(portraitLayer, `技能・${k.skill}`, x + 20, y + 112, 15, C.purple);
    boundedText(portraitLayer, k.skillDesc, x + 20, y + 138, w - 40, 60, 12, C.bone);
    if (selectedInst.lv < 5) {
      const need = XP_PER_LEVEL[selectedInst.lv - 1], cost = monsterUpgradeQuote(selectedInst);
      button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 224, w - 16, 42,
        `升级 ${cost.bone}骨${cost.mana ? ` ${cost.mana}魔` : ''}・经验${selectedInst.xp}/${need}`, () => upgradeMonster(selectedInst),
      { size: 14, enabled: selectedInst.xp >= need && S.bone >= cost.bone && S.mana >= cost.mana, fill: C.greenDark, border: C.green, color: C.white });
    }
    if (featureOpen('monsterCreation')) {
      button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 274, Math.floor((w - 22) / 2), 42, '全身改造', () => openGraft(selectedInst.uid),
        { size: 14, border: C.purple, color: C.purple });
      button(portraitGfx, portraitLayer, portraitHits, x + 14 + Math.floor((w - 22) / 2), y + 274, Math.floor((w - 22) / 2), 42, '遣散怪物', () => dismantle(selectedInst.uid),
        { size: 14, border: C.red, color: C.red });
    }
    return;
  }
  const tabW = Math.floor((w - 22) / 2);
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, tabW, 38, '招募兵种', () => { portraitMobView = 'recruit'; render(); },
    { size: 15, fill: portraitMobView === 'recruit' ? C.wallLit : C.wall, border: portraitMobView === 'recruit' ? C.gold : C.stoneLit, color: C.white });
  button(portraitGfx, portraitLayer, portraitHits, x + 14 + tabW, y + 2, tabW, 38, `编制 ${S.monsters.length}/${monsterCap()}`, () => { portraitMobView = 'owned'; render(); },
    { size: 15, fill: portraitMobView === 'owned' ? C.wallLit : C.wall, border: portraitMobView === 'owned' ? C.gold : C.stoneLit, color: C.white });
  const listY = y + 48;
  if (portraitMobView === 'recruit') {
    const guided = firstRaidRecruitKinds();
    const kinds = guided ? guided.map((id) => monKind(id)) : allKinds().filter(recruitKindOpen);
    const per = Math.max(2, Math.min(5, Math.floor((h - 96) / 66)));
    const pg = portraitPage(kinds, 'portrait-mob-recruit', per);
    pg.view.forEach((k, i) => {
      const cy = listY + i * 66;
      const rq = recruitQuote(k), eliteLocked = isEliteKind(k.id) && !eliteOpen(k);
      portraitGfx.roundRect(x + 8, cy, w - 16, 60, 4).fill(C.wall).stroke({ width: 1, color: k.id === sel?.id ? C.gold : C.ink, alignment: 0 });
      portraitLayer.addChild(portraitEffect(sprite(k.tex, x + 38, cy + 55, 44), false, k.id === sel?.id, k.id.length * 13));
      label(portraitLayer, k.name, x + 70, cy + 8, 15, isEliteKind(k.id) ? C.gold : C.white);
      label(portraitLayer, `${k.row === 'front' ? '前排' : k.row === 'back' ? '后排' : '任意排'}・${cut(k.skill, 10)}`, x + 70, cy + 31, 12, C.stoneLit);
      const custom = isCustomKind(k.id);
      const recruitX = custom ? x + w - 128 : x + w - 112;
      const recruitW = custom ? 68 : 96;
      button(portraitGfx, portraitLayer, portraitHits, recruitX, cy + 11, recruitW, 38,
        eliteLocked ? `第${k.eliteMin}轮` : custom ? `招 ${rq.cost}骨` : rq.tutorialPrice ? `教程价 ${rq.cost}骨` : `招募 ${rq.cost}骨`, () => recruit(k.id),
        { size: custom ? 11 : 13, enabled: !eliteLocked && S.bone >= rq.cost && S.monsters.length < monsterCap(), fill: C.greenDark, border: C.green, color: C.white });
      portraitActionMap[`recruit-${k.id}`] = { x: recruitX, y: cy + 11, w: recruitW, h: 38 };
      if (custom) {
        button(portraitGfx, portraitLayer, portraitHits, x + w - 56, cy + 11, 42, 38,
          customDeleteConfirm === k.id ? '确认' : '删除', () => deleteCustomKind(k.id),
          { size: 11, fill: C.ink, border: C.red, color: C.red });
        portraitActionMap[`delete-${k.id}`] = { x: x + w - 56, y: cy + 11, w: 42, h: 38 };
      }
    });
    portraitPager('portrait-mob-recruit', pg.page, pg.pages, x + 8, y + h - 38, w - 16);
  } else {
    const per = Math.max(2, Math.min(5, Math.floor((h - 96) / 66)));
    const pg = portraitPage(S.monsters, 'portrait-mob-owned', per);
    if (!S.monsters.length) labelC(portraitLayer, '还没有怪物，先去招募一只吧', x + w / 2, listY + 60, 15, C.stoneLit);
    pg.view.forEach((inst, i) => {
      const k = instKind(inst), cy = listY + i * 66, post = monsterPost(inst.uid);
      portraitGfx.roundRect(x + 8, cy, w - 16, 60, 4).fill(C.wall).stroke({ width: 1, color: C.ink, alignment: 0 });
      portraitLayer.addChild(portraitEffect(sprite(k.tex, x + 38, cy + 55, 44), inst.lv >= 5, false, inst.uid));
      label(portraitLayer, `${k.name}　Lv${inst.lv}`, x + 70, cy + 8, 15, C.white);
      label(portraitLayer, `位置：${post.text}　技能：${cut(k.skill, 8)}`, x + 70, cy + 31, 12, post.kind === 'free' ? C.stoneLit : C.gold);
      button(portraitGfx, portraitLayer, portraitHits, x + w - 88, cy + 13, 72, 34, '详情', () => { sel = { kind: 'inst', uid: inst.uid }; selectedEntity = { type: 'monster', uid: inst.uid }; inspectorView = 'summary'; render(); },
        { size: 13, border: C.purple, color: C.purple });
    });
    const next = nextMonsterCapTier();
    portraitPager('portrait-mob-owned', pg.page, pg.pages, x + 8, y + h - 38, next ? Math.max(120, w - 164) : w - 16);
    if (next) {
      const open = S.overtime || S.raidNo >= next.unlock;
      button(portraitGfx, portraitLayer, portraitHits, x + w - 146, y + h - 40, 138, 36,
        open ? `扩编至${next.cap}・${next.bone}骨${next.mana ? ` ${next.mana}魔` : ''}` : `第${next.unlock}轮开放扩编`, expandMonsterCap,
        { size: 11, enabled: open && S.bone >= next.bone && S.mana >= next.mana, fill: C.goldDark, border: C.gold, color: C.white });
      portraitActionMap.expandRoster = { x: x + w - 146, y: y + h - 40, w: 138, h: 36 };
    }
  }
  if (portraitMobView === 'recruit' && featureOpen('monsterCreation')) button(portraitGfx, portraitLayer, portraitHits, x + w - 118, y + h - 40, 110, 36,
    '创造怪物', () => openStitch(), { size: 13, fill: C.purpleDark, border: C.purple, color: C.white });
}

function portraitSlotName(uid, which) {
  if (uid == null) return which === 'leader' ? '统领空缺' : which === 'front' ? '前排空缺' : which === 'back' ? '后排空缺' : '侧翼空缺';
  if (which === 'leader') return champById(uid)?.name ?? '未知英雄';
  const inst = instById(uid);
  return inst ? instKind(inst).name : '未知怪物';
}

function drawPortraitDungeonAssign(x, y, w, h, room, which) {
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 72, 36, '← 楼层', () => { sel = null; render(); }, { size: 14 });
  label(portraitLayer, `${room + 1}层・${SLOT_NAME[which]}`, x + 94, y + 10, 16, which === 'leader' ? C.gold : C.white);
  const current = S.rooms[room]?.[which];
  if (current != null) button(portraitGfx, portraitLayer, portraitHits, x + w - 88, y + 2, 80, 36, '撤下', () => {
    S.rooms[room][which] = null; if (which === 'leader') S.rooms[room].flank = null; persist(); render();
  }, { size: 14, border: C.red, color: C.red });
  const candidates = which === 'leader' ? S.champs : S.monsters.filter((inst) => {
    const k = instKind(inst); return !k.legend && (!(which === 'front' || which === 'back') || k.row === 'any' || k.row === which);
  });
  const pg = portraitPage(candidates, `portrait-slot-${which}`, Math.max(2, Math.min(5, Math.floor((h - 96) / 62))));
  if (!candidates.length) labelC(portraitLayer, which === 'leader' ? '还没有可部署的英雄' : '还没有适合该位置的怪物', x + w / 2, y + 90, 15, C.stoneLit);
  pg.view.forEach((unit, i) => {
    const cy = y + 48 + i * 62;
    const isHero = which === 'leader';
    const k = isHero ? champKind(unit) : instKind(unit);
    const at = isHero ? roomOfChamp(unit.uid) : roomOf(unit.uid);
    portraitGfx.roundRect(x + 8, cy, w - 16, 56, 4).fill(C.wall).stroke({ width: 1, color: current === unit.uid ? C.gold : C.ink, alignment: 0 });
    portraitLayer.addChild(sprite(k.tex, x + 38, cy + 52, 40));
    label(portraitLayer, `${isHero ? unit.name : k.name}　Lv${unit.lv}`, x + 70, cy + 8, 15, C.white);
    label(portraitLayer, at < 0 ? '当前待命' : `当前位于第${at + 1}层`, x + 70, cy + 31, 12, at < 0 ? C.green : C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 92, cy + 10, 76, 36, current === unit.uid ? '已部署' : '部署',
      () => isHero ? seatChamp(room, unit.uid) : assign(room, which, unit.uid),
      { size: 14, fill: C.greenDark, border: current === unit.uid ? C.gold : C.green, color: C.white });
    portraitActionMap[`deploy-${which}-${unit.uid}`] = { x: x + w - 92, y: cy + 10, w: 76, h: 36 };
  });
  portraitPager(`portrait-slot-${which}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitTrapAssign(x, y, w, h, room, slot = 0) {
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 72, 36, '← 楼层', () => { sel = null; render(); }, { size: 14 });
  label(portraitLayer, `${room + 1}层・陷阱位${slot + 1}`, x + 94, y + 10, 16, C.gold);
  const list = ['none', 'spike', 'slime', 'rune', 'blade', 'net', 'mirror'];
  const pg = portraitPage(list, `portrait-trap-${slot}`, Math.max(3, Math.min(6, Math.floor((h - 70) / 62))));
  pg.view.forEach((id, i) => {
    const trap = TRAPS[id], cy = y + 48 + i * 62, owned = S.traps.includes(id);
    const field = slot === 0 ? 'trap' : 'trap2', active = S.rooms[room][field] === id;
    portraitGfx.roundRect(x + 8, cy, w - 16, 56, 4).fill(active ? C.wallLit : C.wall)
      .stroke({ width: 1, color: active ? C.gold : owned ? C.stoneLit : C.wallLit, alignment: 0 });
    label(portraitLayer, trap.name, x + 20, cy + 8, 15, owned ? C.white : C.stoneLit);
    label(portraitLayer, cut(trap.desc, 25), x + 20, cy + 31, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 92, cy + 10, 76, 36, active ? '已安装' : owned ? '安装' : '未解锁', () => {
      if (!owned) return;
      S.rooms[room][field] = id; persist(); playSfx('place'); render();
    }, { size: 12, enabled: owned && !active, border: active ? C.gold : C.green, color: active ? C.gold : owned ? C.green : C.stoneLit });
  });
  portraitPager(`portrait-trap-${slot}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitFacilityPeople(x, y, w, h, floor, u, d) {
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 72, 36, '← 设施', () => { sel = { kind: 'utility', floor }; render(); }, { size: 14 });
  label(portraitLayer, u.kind === 'training' ? '管理训练对象' : '指派工作人员', x + 94, y + 10, 16, d.color);
  const units = u.kind === 'training'
    ? [...S.monsters.map((unit) => ({ type: 'monster', uid: unit.uid, name: instKind(unit).name, lv: unit.lv })),
      ...S.champs.map((unit) => ({ type: 'hero', uid: unit.uid, name: unit.name, lv: unit.lv }))]
    : S.monsters.map((unit) => ({ type: 'monster', uid: unit.uid, name: instKind(unit).name, lv: unit.lv }));
  const pg = portraitPage(units, `portrait-facility-people-${floor}`, Math.max(2, Math.min(6, Math.floor((h - 84) / 58))));
  pg.view.forEach((unit, i) => {
    const cy = y + 48 + i * 58;
    const active = u.kind === 'training' ? u.trainTargets.some((item) => item.type === unit.type && item.uid === unit.uid) : u.workerUid === unit.uid;
    const deployed = unit.type === 'hero' ? roomOfChamp(unit.uid) >= 0 : roomOf(unit.uid) >= 0;
    portraitGfx.roundRect(x + 8, cy, w - 16, 52, 4).fill(active ? C.wallLit : C.wall)
      .stroke({ width: 1, color: active ? C.gold : C.stoneLit, alignment: 0 });
    label(portraitLayer, `${unit.type === 'hero' ? '英雄・' : ''}${unit.name}　Lv${unit.lv}`, x + 20, cy + 8, 14, active ? C.gold : C.white);
    label(portraitLayer, active ? '当前已指派' : deployed ? '正在驻守，无法指派' : '当前待命', x + 20, cy + 29, 11, active ? C.gold : deployed ? C.red : C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 94, cy + 8, 78, 36, active ? '撤下' : '指派', () => {
      if (u.kind === 'training') toggleTrainingTarget(floor, unit.type, unit.uid); else assignWorker(floor, unit.uid);
    }, { size: 13, enabled: active || !deployed, border: active ? C.red : C.green, color: active ? C.red : C.green });
  });
  portraitPager(`portrait-facility-people-${floor}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitFacility(x, y, w, h, floor) {
  const u = utilityAt(floor), d = utilityDef(u);
  if (!u) { sel = null; return; }
  if (sel.people) { drawPortraitFacilityPeople(x, y, w, h, floor, u, d); return; }
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 72, 36, '← 楼层', () => { sel = null; render(); }, { size: 14 });
  label(portraitLayer, `${floor + 1}层・${u.kind === 'none' ? '空资源房' : facilityName(u)}`, x + 94, y + 10, 16, u.kind === 'none' ? C.white : d.color);
  if (u.kind === 'none') {
    const kinds = ['bone-yard', 'mana-well', 'training', 'healing', 'workshop', 'hatchery', 'vault'];
    const pg = portraitPage(kinds, `portrait-facility-build-${floor}`, Math.max(2, Math.min(5, Math.floor((h - 98) / 64))));
    pg.view.forEach((kind, i) => {
      const def = UTILITY_KINDS[kind], cy = y + 48 + i * 64, active = sel.buildKind === kind;
      const buildCost = doctrineCost('facility', def.bone, def.mana);
      portraitGfx.roundRect(x + 8, cy, w - 16, 58, 4).fill(active ? C.wallLit : C.wall)
        .stroke({ width: 1, color: active ? C.gold : def.color, alignment: 0 });
      label(portraitLayer, def.name, x + 20, cy + 7, 15, active ? C.gold : def.color);
      label(portraitLayer, cut(def.desc, 22), x + 20, cy + 31, 11, C.stoneLit);
      button(portraitGfx, portraitLayer, portraitHits, x + w - 112, cy + 10, 96, 38, `${buildCost.bone}骨${buildCost.mana ? ` ${buildCost.mana}魔` : ''}`, () => {
        if (sel.buildKind === kind) buildUtility(floor, kind); else { sel = { kind: 'utility', floor, buildKind: kind }; playSfx('tab'); render(); }
      }, { size: 12, enabled: sel.buildKind !== kind || (facilityActionAvailable() && S.bone >= buildCost.bone && S.mana >= buildCost.mana),
        fill: active ? C.greenDark : C.ink, border: active ? C.green : def.color, color: active ? C.white : def.color });
    });
    labelC(portraitLayer, sel.buildKind ? '再次点击价格按钮确认建造' : '先选择设施，再次点击确认建造', x + w / 2, y + h - 58, 12, sel.buildKind ? C.gold : C.stoneLit);
    portraitPager(`portrait-facility-build-${floor}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
    return;
  }
  const out = utilityOutput(floor);
  panelF(portraitGfx, portraitLayer, 'stone', x + 8, y + 50, w - 16, 112, C.wall);
  label(portraitLayer, `${facilityName(u)}　Lv${u.level}`, x + 20, y + 62, 17, d.color);
  boundedText(portraitLayer, d.desc, x + 20, y + 88, w - 40, 36, 12, C.bone);
  label(portraitLayer, `耐久 ${u.condition}/100　${out.bone ? `待产${out.bone}骨` : out.mana ? `待产${out.mana}魔` : '服务设施'}`, x + 20, y + 135, 13, u.condition <= 25 ? C.red : C.gold);
  const cost = u.level < 3 ? utilityUpgradeCost(u) : null;
  const repair = repairQuote(u);
  const actions = [
    [u.level < 3 ? `升级 ${cost.bone}骨${cost.mana ? ` ${cost.mana}魔` : ''}` : '已满级', () => upgradeUtility(floor), u.level < 3 ? C.gold : C.stoneLit, u.level < 3],
    [u.condition < 100 ? `维修 ${repair.bone}骨` : '无需维修', () => repairUtility(floor), C.green, u.condition < 100],
    [sel.confirmDemolish ? '确认拆除' : '拆除设施', () => demolishUtility(floor), C.red, true],
  ];
  const actionStart = 164, actionGap = 44;
  actions.forEach(([name, action, color, enabled], i) => button(portraitGfx, portraitLayer, portraitHits, x + 8, y + actionStart + i * actionGap, w - 16, 40, name, action,
    { size: 15, enabled, fill: C.wall, border: color, color }));
  if (WORKER_KINDS.has(u.kind) || u.kind === 'training') button(portraitGfx, portraitLayer, portraitHits, x + 8, y + actionStart + 3 * actionGap, w - 16, 40,
    u.kind === 'training' ? `训练对象 ${u.trainTargets.length}/${d.slots[u.level - 1]}` : `工作人员・${workerName(u)}`,
    () => { sel = { kind: 'utility', floor, people: true }; render(); }, { size: 15, border: d.color, color: d.color });
}

function drawPortraitDungeon(x, y, w, h) {
  if (sel?.kind === 'utility') { drawPortraitFacility(x, y, w, h, sel.floor); return; }
  if (sel?.kind === 'slot' && sel.which === 'trap') { drawPortraitTrapAssign(x, y, w, h, sel.room, sel.slot ?? 0); return; }
  if (sel?.kind === 'slot' && ['front', 'back', 'leader', 'flank'].includes(sel.which)) {
    drawPortraitDungeonAssign(x, y, w, h, sel.room, sel.which); return;
  }
  const eco = dungeonEconomyPreview();
  label(portraitLayer, `地牢 ${S.floors.length}层`, x + 8, y + 5, 17, C.white);
  label(portraitLayer, `预计＋${eco.bone}骨＋${eco.mana}魔`, x + w - 150, y + 8, 13, C.gold);
  const pg = portraitPage(S.floors.map((_, i) => i), 'portrait-dungeon-floors', Math.max(1, Math.min(3, Math.floor((h - 80) / 116))));
  pg.view.forEach((floor, i) => {
    const cy = y + 34 + i * 116, room = S.rooms[floor], util = utilityAt(floor), ud = utilityDef(util);
    panelF(portraitGfx, portraitLayer, 'stone', x + 8, cy, w - 16, 108, C.wall);
    label(portraitLayer, `${floor + 1}层・战斗房`, x + 18, cy + 8, 15, C.white);
    if (featureOpen('dungeonTools')) {
      const dual = researchEffects(S.workshopResearch).dualTraps;
      const trapW = dual ? 72 : 112;
      button(portraitGfx, portraitLayer, portraitHits, x + w - (dual ? 158 : 128), cy + 5, trapW, 24,
        room.trap === 'none' ? '陷阱1' : `1・${cut(TRAPS[room.trap].name, 5)}`,
        () => { sel = { kind: 'slot', room: floor, which: 'trap', slot: 0 }; render(); }, { size: 10, border: C.goldDark, color: C.bone });
      if (dual) button(portraitGfx, portraitLayer, portraitHits, x + w - 80, cy + 5, 72, 24,
        room.trap2 === 'none' ? '陷阱2' : `2・${cut(TRAPS[room.trap2].name, 5)}`,
        () => { sel = { kind: 'slot', room: floor, which: 'trap', slot: 1 }; render(); }, { size: 10, border: C.purple, color: C.bone });
    }
    const slots = featureOpen('hero') ? ['back', 'leader', 'front', 'flank'] : ['back', 'front'];
    const sw = Math.floor((w - 28 - (slots.length - 1) * 6) / slots.length);
    slots.forEach((which, j) => {
      const sx = x + 14 + j * (sw + 6), uid = room[which];
      button(portraitGfx, portraitLayer, portraitHits, sx, cy + 34, sw, 42, cut(portraitSlotName(uid, which), 7), () => {
        sel = { kind: 'slot', room: floor, which }; playSfx('tab'); render();
      }, { size: 12, fill: uid == null ? C.ink : C.wallLit, border: which === 'leader' ? C.goldDark : C.stoneLit, color: uid == null ? C.stoneLit : C.white });
    });
    if (featureOpen('facilities')) {
      button(portraitGfx, portraitLayer, portraitHits, x + 14, cy + 80, w - 28, 20,
        util.kind === 'none' ? '＋ 建造资源房' : `${ud.name} Lv${util.level}・耐久${util.condition}`,
        () => { sel = { kind: 'utility', floor }; render(); },
        { size: 11, border: util.kind === 'none' ? C.green : ud.color, color: util.kind === 'none' ? C.green : ud.color });
    }
  });
  portraitPager('portrait-dungeon-floors', pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitShop(x, y, w, h) {
  label(portraitLayer, `工坊・魔质 ${S.mana}・遗物 ${S.relic}`, x + 8, y + 5, 17, C.white);
  const items = shopItems();
  const per = Math.max(2, Math.min(6, Math.floor((h - 92) / 64)));
  const pg = portraitPage(items, 'portrait-shop', per);
  pg.view.forEach((item, i) => {
    const cy = y + 36 + i * 64;
    portraitGfx.roundRect(x + 8, cy, w - 16, 58, 4).fill(C.wall).stroke({ width: 1, color: item.owned ? C.green : C.purple, alignment: 0 });
    label(portraitLayer, item.name, x + 20, cy + 7, 14, item.owned ? C.green : C.white);
    label(portraitLayer, cut(item.desc, 24), x + 20, cy + 31, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 104, cy + 10, 88, 38, item.owned ? '已拥有' : `${item.cost}魔`, () => {
      if (item.owned || S.mana < item.cost) return;
      S.mana -= item.cost; item.buy(); playSfx('buy'); persist(); say(`${item.name} 已解锁`); render();
    }, { size: 13, enabled: !item.owned && S.mana >= item.cost, fill: C.purpleDark, border: item.owned ? C.green : C.purple, color: item.owned ? C.green : C.white });
  });
  const bottomY = y + h - 84;
  portraitPager('portrait-shop', pg.page, pg.pages, x + 8, bottomY, Math.min(150, w - 180));
  button(portraitGfx, portraitLayer, portraitHits, x + w - 252, bottomY, 76, 36, '高端路线', () => { portraitNativeBypass = true; openWorkshopResearch(); scheduleLayout(); },
    { size: 11, enabled: S.overtime || S.raidNo >= 10, border: C.gold, color: C.gold });
  button(portraitGfx, portraitLayer, portraitHits, x + w - 170, bottomY, 74, 36, '造部件', () => { portraitNativeBypass = true; openForge('part'); scheduleLayout(); },
    { size: 12, enabled: hasBackend(), border: C.purple, color: C.purple });
  button(portraitGfx, portraitLayer, portraitHits, x + w - 90, bottomY, 74, 36, '造词缀', () => { portraitNativeBypass = true; openForge('affix'); scheduleLayout(); },
    { size: 12, enabled: hasBackend(), border: C.purple, color: C.purple });
  const q1 = exchangeQuote('bone-to-mana'), q2 = exchangeQuote('mana-to-bone'), ew = Math.floor((w - 22) / 2);
  button(portraitGfx, portraitLayer, portraitHits, x + 8, bottomY + 42, ew, 36,
    exchangeConfirm === 'bone-to-mana' ? '确认：25骨→4魔' : `${q1.payBone}骨→${q1.getMana}魔`, () => exchangeResource('bone-to-mana'),
    { size: 12, enabled: S.bone >= q1.payBone, border: C.purple, color: C.purple });
  button(portraitGfx, portraitLayer, portraitHits, x + 14 + ew, bottomY + 42, ew, 36,
    exchangeConfirm === 'mana-to-bone' ? '确认：5魔→20骨' : `${q2.payMana}魔→${q2.getBone}骨`, () => exchangeResource('mana-to-bone'),
    { size: 12, enabled: S.mana >= q2.payMana, border: C.gold, color: C.gold });
}

function drawPortraitHeroStatus(x, y, w, h, c) {
  const st = statOf(c, chemistry(S.champs, seatedChampUids()).map);
  const lines = [`生命 ${st.hp}　攻击 ${st.atk}`, `防御 ${st.def}　攻速 ${st.spd.toFixed(2)}`,
    `出战 ${c.battles}　击倒 ${c.kills}${c.lawMarks?.length ? `　法则印记${c.lawMarks.length}` : ''}`,
    c.restTurns ? `强制休息还需 ${c.restTurns} 回合` : `出战计数 ${c.sortiesSinceRest || 0}/${HERO_SORTIE_LIMIT}`];
  lines.forEach((line, i) => label(portraitLayer, line, x + 14, y + 12 + i * 25, 14, i === 3 && c.restTurns ? C.red : C.bone));
  if (c.lv < CHAMP_LV_CAP) {
    label(portraitLayer, `经验 ${c.xp}/${xpNeed(c.lv)}　升级 ${heroUpgradeBone(c)}骨${heroUpgradeMana(c) ? ` ${heroUpgradeMana(c)}魔` : ''}`, x + 14, y + 118, 13, C.gold);
    button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 146, w - 16, 40, '升级英雄', () => levelChamp(c),
      { size: 15, enabled: canLevel(c) && S.bone >= heroUpgradeBone(c) && S.mana >= heroUpgradeMana(c), fill: C.greenDark, border: C.green, color: C.white });
  }
  if (c.restTurns) button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 194, w - 16, 40, `疗愈 ${REST_MANA}魔・休息-1`, () => restChamp(c),
    { size: 14, enabled: healingCapacity() > 0 && S.dungeon.healingCharges > 0 && S.mana >= REST_MANA, border: C.green, color: C.green });
  if (c.restTurns) button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 242, w - 16, 40,
    heroForcedThisRaid(c) ? '本场已强制征召' : heroForceConfirmUid === c.uid ? `确认支付 ${FORCE_HERO_BONE}骨+${FORCE_HERO_MANA}魔` : '强制驱使参加本场', () => forceRestingHero(c),
    { size: 13, enabled: !heroForcedThisRaid(c) && S.bone >= FORCE_HERO_BONE && S.mana >= FORCE_HERO_MANA, border: C.red, color: C.red });
  if (c.wounds) button(portraitGfx, portraitLayer, portraitHits, x + 8, y + (c.restTurns ? 290 : 242), w - 16, 40, `疗伤 ${HEAL_MANA}魔・伤势-1`, () => healChamp(c),
    { size: 14, enabled: S.mana >= HEAL_MANA, border: C.red, color: C.red });
  void h;
}

function drawPortraitHeroTraits(x, y, w, h, c) {
  const entries = c.traits.map((id) => ({ id, ...TRAITS[id] }));
  entries.forEach((trait, i) => {
    const cy = y + i * 86;
    portraitGfx.roundRect(x + 8, cy, w - 16, 78, 4).fill(C.wall).stroke({ width: 1, color: traitColor(trait.id), alignment: 0 });
    label(portraitLayer, trait.name, x + 20, cy + 9, 15, traitColor(trait.id));
    boundedText(portraitLayer, trait.desc, x + 20, cy + 34, w - 40, 35, 12, C.bone);
  });
  const cost = REROLL_TRAIT_BONE + REROLL_TRAIT_MANA;
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + Math.min(h - 46, entries.length * 86 + 4), w - 16, 40, `重随特质 ${REROLL_TRAIT_BONE}骨 ${REROLL_TRAIT_MANA}魔`, () => rerollChampTraits(c),
    { size: 14, enabled: S.bone >= REROLL_TRAIT_BONE && S.mana >= REROLL_TRAIT_MANA, border: C.purple, color: C.purple });
  void cost;
}

function drawPortraitHeroLore(x, y, w, h, c) {
  const lore = heroLoreOf(c), busy = heroLoreBusyUid === c.uid;
  panelF(portraitGfx, portraitLayer, 'stone', x + 8, y + 2, w - 16, 100, C.wall);
  label(portraitLayer, `性格・${lore.personalityName}`, x + 20, y + 13, 15, C.purple);
  boundedText(portraitLayer, lore.personalityDesc, x + 20, y + 40, w - 40, 50, 13, C.bone);
  portraitHits.add(x + 8, y + 2, w - 16, 100,
    () => openDetailPopup(`性格・${lore.personalityName}`, lore.personalityDesc, C.purple));
  const bgH = Math.max(100, h - 160);
  panelF(portraitGfx, portraitLayer, 'gold', x + 8, y + 110, w - 16, bgH, C.wall);
  label(portraitLayer, `背景・${lore.backgroundName}`, x + 20, y + 121, 15, C.gold);
  boundedText(portraitLayer, lore.backgroundStory, x + 20, y + 148, w - 40, bgH - 40, 13, C.bone);
  portraitHits.add(x + 8, y + 110, w - 16, bgH,
    () => openDetailPopup(`背景故事・${lore.backgroundName}`, lore.backgroundStory, C.gold));
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + h - 44, w - 16, 40,
    busy ? 'AI 正在重构档案…' : lore.via ? 'AI 再次重构优化' : 'AI 来重构优化', () => void optimizeHeroLore(c),
    { size: 14, enabled: hasBackend() && heroLoreBusyUid == null, fill: C.purpleDark, border: C.purple, color: C.white });
}

function drawPortraitHeroGear(x, y, w, h, c) {
  const slotW = Math.floor((w - 28) / 3);
  GEAR_SLOTS.forEach((slot, i) => {
    const id = c.gear?.[slot.id], item = gearById(id ?? '');
    button(portraitGfx, portraitLayer, portraitHits, x + 8 + i * (slotW + 6), y + 2, slotW, 52, item ? `${slot.name}\n${cut(item.name, 6)}` : `${slot.name}\n空`, () => { gearSlotSel = slot.id; render(); },
      { size: 12, fill: gearSlotSel === slot.id ? C.wallLit : C.wall, border: gearSlotSel === slot.id ? C.gold : C.stoneLit, color: item ? C.white : C.stoneLit });
  });
  const equipped = c.gear?.[gearSlotSel];
  if (equipped) button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 62, w - 16, 36, `卸下 ${gearById(equipped)?.name ?? ''}`, () => unequipGear(c, gearSlotSel),
    { size: 13, border: C.red, color: C.red });
  const pool = S.vault.map((id, idx) => ({ id, idx, item: gearById(id) })).filter((entry) => entry.item?.slot === gearSlotSel);
  const pg = portraitPage(pool, `portrait-gear-${gearSlotSel}`, Math.max(2, Math.min(5, Math.floor((h - 150) / 62))));
  pg.view.forEach((entry, i) => {
    const cy = y + 108 + i * 62;
    portraitGfx.roundRect(x + 8, cy, w - 16, 56, 4).fill(C.wall).stroke({ width: 1, color: C.steel, alignment: 0 });
    label(portraitLayer, entry.item.name, x + 20, cy + 7, 14, C.steel);
    label(portraitLayer, cut(entry.item.desc, 22), x + 20, cy + 31, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 88, cy + 10, 72, 36, '装备', () => equipGear(c, entry.idx), { size: 13, border: C.green, color: C.green });
  });
  portraitPager(`portrait-gear-${gearSlotSel}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitHeroTalent(x, y, w, h, c) {
  const pending = pendingTier(c);
  const owned = c.talents.map((id) => TALENTS[id]).filter(Boolean);
  if (!pending) {
    label(portraitLayer, owned.length ? '已学习专精' : '升级后将获得专精选择', x + 12, y + 8, 15, owned.length ? C.gold : C.stoneLit);
    owned.forEach((talent, i) => {
      const cy = y + 38 + i * 68;
      portraitGfx.roundRect(x + 8, cy, w - 16, 62, 4).fill(C.wall).stroke({ width: 1, color: C.goldDark, alignment: 0 });
      label(portraitLayer, talent.name, x + 20, cy + 8, 14, C.gold);
      boundedText(portraitLayer, talent.desc, x + 20, cy + 31, w - 40, 24, 11, C.bone);
    });
    return;
  }
  const choices = Object.entries(TALENTS).filter(([, talent]) => talent.tier === pending).map(([id, talent]) => ({ id, ...talent }));
  const pg = portraitPage(choices, `portrait-talents-${pending}`, 5);
  pg.view.forEach((talent, i) => {
    const cy = y + i * 66, selected = talentPreview?.uid === c.uid && talentPreview.id === talent.id;
    portraitGfx.roundRect(x + 8, cy, w - 16, 60, 4).fill(selected ? C.wallLit : C.wall).stroke({ width: 1, color: selected ? C.gold : C.purple, alignment: 0 });
    label(portraitLayer, talent.name, x + 20, cy + 7, 14, selected ? C.gold : C.white);
    label(portraitLayer, cut(talent.desc, 24), x + 20, cy + 31, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 86, cy + 10, 70, 36, selected ? '已预选' : '预选', () => previewTalent(c, talent.id),
      { size: 12, border: selected ? C.gold : C.purple, color: selected ? C.gold : C.purple });
  });
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + h - 44, w - 16, 40, '确认学习所选专精', () => confirmTalent(c),
    { size: 14, enabled: talentPreview?.uid === c.uid, fill: C.purpleDark, border: C.gold, color: C.white });
}

function drawPortraitHeroTitles(x, y, w, h, c) {
  const titles = unlockedTitles(c).map((id) => titleById(id)).filter(Boolean);
  const pg = portraitPage(titles, `portrait-titles-${c.uid}`, Math.max(3, Math.min(6, Math.floor((h - 56) / 62))));
  pg.view.forEach((title, i) => {
    const cy = y + i * 62, active = c.activeTitle === title.id;
    portraitGfx.roundRect(x + 8, cy, w - 16, 56, 4).fill(active ? C.wallLit : C.wall).stroke({ width: 1, color: active ? C.gold : C.purple, alignment: 0 });
    label(portraitLayer, title.name, x + 20, cy + 7, 14, active ? C.gold : C.white);
    label(portraitLayer, cut(title.desc, 23), x + 20, cy + 31, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 86, cy + 10, 70, 36, active ? '使用中' : '启用', () => {
      c.activeTitle = title.id; persist(); playSfx('place'); render();
    }, { size: 12, enabled: !active, border: active ? C.gold : C.purple, color: active ? C.gold : C.purple });
  });
  portraitPager(`portrait-titles-${c.uid}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitHeroDetail(x, y, w, h, c) {
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, 68, 36, '← 名册', () => { portraitHeroDetail = false; render(); }, { size: 13 });
  portraitActionMap.heroRosterBack = { x: x + 8, y: y + 2, w: 68, h: 36 };
  portraitLayer.addChild(portraitEffect(sprite(champKind(c).tex, x + 104, y + 40, 34), c.lv >= CHAMP_LV_CAP, true, c.uid));
  label(portraitLayer, `${c.name}　Lv${c.lv}　资质${POT_NAME[S.champPot[c.uid] ?? c.potential ?? 0]}`, x + 128, y + 11, 15, C.gold);
  const sections = [['status', '状态'], ['traits', '特质'], ['lore', '档案'], ['gear', '装备'], ['talent', '专精'], ['titles', '称号']];
  const sw = Math.floor((w - 16 - 5 * 5) / 6);
  sections.forEach(([id, name], i) => button(portraitGfx, portraitLayer, portraitHits, x + 8 + i * (sw + 5), y + 50, sw, 34, name, () => { portraitHeroSection = id; render(); },
    { size: 12, fill: portraitHeroSection === id ? C.wallLit : C.wall, border: portraitHeroSection === id ? C.gold : C.stoneLit, color: C.white }));
  const bodyY = y + 92, bodyH = h - 92;
  if (portraitHeroSection === 'status') drawPortraitHeroStatus(x, bodyY, w, bodyH, c);
  else if (portraitHeroSection === 'traits') drawPortraitHeroTraits(x, bodyY, w, bodyH, c);
  else if (portraitHeroSection === 'lore') drawPortraitHeroLore(x, bodyY, w, bodyH, c);
  else if (portraitHeroSection === 'gear') drawPortraitHeroGear(x, bodyY, w, bodyH, c);
  else if (portraitHeroSection === 'talent') drawPortraitHeroTalent(x, bodyY, w, bodyH, c);
  else drawPortraitHeroTitles(x, bodyY, w, bodyH, c);
}

function drawPortraitHero(x, y, w, h) {
  refreshCands();
  const selected = champById(heroSel);
  if (selected && portraitHeroMode === 'roster' && portraitHeroDetail) { drawPortraitHeroDetail(x, y, w, h, selected); return; }
  const tabW = Math.floor((w - 22) / 2);
  button(portraitGfx, portraitLayer, portraitHits, x + 8, y + 2, tabW, 38, `麾下 ${S.champs.length}/${CHAMP_CAP}`, () => { portraitHeroMode = 'roster'; portraitHeroDetail = false; render(); },
    { size: 14, fill: portraitHeroMode === 'roster' ? C.wallLit : C.wall, border: portraitHeroMode === 'roster' ? C.gold : C.stoneLit, color: C.white });
  button(portraitGfx, portraitLayer, portraitHits, x + 14 + tabW, y + 2, tabW, 38, '征召英雄', () => { portraitHeroMode = 'recruit'; heroSel = null; render(); },
    { size: 14, fill: portraitHeroMode === 'recruit' ? C.wallLit : C.wall, border: portraitHeroMode === 'recruit' ? C.gold : C.stoneLit, color: C.white });
  const items = portraitHeroMode === 'roster' ? S.champs : S.cands;
  const pg = portraitPage(items, `portrait-hero-${portraitHeroMode}`, Math.max(3, Math.min(6, Math.floor((h - 90) / 70))));
  if (!items.length) labelC(portraitLayer, portraitHeroMode === 'roster' ? '尚无英雄，前往征召' : '暂无候选英雄', x + w / 2, y + 100, 15, C.stoneLit);
  pg.view.forEach((unit, i) => {
    const cy = y + 50 + i * 70, recruitMode = portraitHeroMode === 'recruit';
    const k = recruitMode ? monKind(unit.race) : champKind(unit), cost = recruitMode ? candCostOf(unit) : 0;
    portraitGfx.roundRect(x + 8, cy, w - 16, 64, 4).fill(C.wall).stroke({ width: 1, color: C.goldDark, alignment: 0 });
    portraitLayer.addChild(portraitEffect(sprite(k.tex, x + 40, cy + 59, 46), !recruitMode && unit.lv >= CHAMP_LV_CAP, false, unit.uid ?? unit.id));
    label(portraitLayer, recruitMode ? unit.name : `${unit.name}　Lv${unit.lv}`, x + 76, cy + 8, 15, C.gold);
    label(portraitLayer, recruitMode ? `${k.name}・资质${POT_NAME[unit.potential]}` : `${roomOfChamp(unit.uid) >= 0 ? `${roomOfChamp(unit.uid) + 1}层统领` : '待命'}・${fatigueTier(unit.fatigue).text}`,
      x + 76, cy + 34, 12, C.stoneLit);
    const actionX = x + w - 94;
    button(portraitGfx, portraitLayer, portraitHits, actionX, cy + 13, 78, 38, recruitMode ? `${cost}骨` : '详情', () => {
      if (recruitMode) { portraitHeroMode = 'roster'; portraitHeroDetail = true; recruitChamp(unit); }
      else { heroSel = unit.uid; selectedEntity = { type: 'hero', uid: unit.uid }; inspectorView = 'summary'; portraitHeroSection = 'status'; portraitHeroDetail = true; render(); }
    }, { size: 13, enabled: !recruitMode || S.bone >= cost, fill: recruitMode ? C.greenDark : C.wallLit, border: recruitMode ? C.green : C.gold, color: C.white });
    if (!recruitMode) portraitActionMap[`hero-open-${unit.uid}`] = { x: actionX, y: cy + 13, w: 78, h: 38 };
  });
  portraitPager(`portrait-hero-${portraitHeroMode}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function reportDetailBody(r) {
  const review = Array.isArray(r.review) && r.review.length ? r.review : [r.firstCause];
  const literary = r.literary
    ? `${r.literary.title}\n\n${r.literary.chronicle}${r.literary.highlights?.length ? `\n\n书记摘录：\n${r.literary.highlights.map((line) => `· ${line}`).join('\n')}` : ''}\n\n—— 原始战术记录 ——\n`
    : r.aiState === 'pending' ? 'AI 战地书记正在补录，以下为原始战术记录。\n\n' : '';
  const economy = r.economy;
  const economyText = economy
    ? `\n\n经营损益：结算${economy.bone}骨币、${economy.mana}魔质、${economy.xp ?? 0}训练经验与${economy.repair ?? 0}维修点；损失${economy.boneLost}骨币、${economy.manaLost}魔质、${economy.xpLost ?? 0}训练经验与${economy.repairLost ?? 0}维修点；宝库保护${economy.boneProtected}骨币、${economy.manaProtected}魔质。\n功能储备：疗愈${economy.services?.healing ?? 0}次，工坊${economy.services?.forge ?? 0}次（-${Math.round((economy.services?.forgeDiscount ?? 0) * 100)}%），孵化优惠${economy.services?.hatchery ?? 0}次（-${Math.round((economy.services?.hatcheryDiscount ?? 0) * 100)}%）。\n${economy.rows.filter((x) => x.kind !== 'none').map((x) => `第${x.floor + 1}层 ${utilityDef({ kind: x.kind }).name}：${x.breached ? `遭劫${(x.lootDuration ?? 0).toFixed(1)}秒、设施-${x.conditionDamage ?? 0}耐久、功能损失${x.serviceLost ?? 0}次、员工${x.workerState === 'evacuated' ? '撤离' : x.workerState === 'fallen' ? '抵抗倒下' : x.workerState === 'reinforced' ? '参战' : x.workerUid ? '留守' : '无人'}` : '安全'}，结算${x.boneGot}骨/${x.manaGot}魔/${(x.xpGot ?? 0) * (x.training?.length ?? 0)}经验/${x.repairGot ?? 0}维修点，耐久${x.conditionAfter}`).join('\n')}`
    : '';
  const quotes = Array.isArray(r.dialogue) && r.dialogue.length
    ? r.dialogue.slice(-18).map((d) => `${d.name}：${d.text}`)
    : r.logs.filter((line) => /^　/.test(line.text)).slice(0, 12).map((line) => line.text.trim());
  const storyText = (r.storyConsequences?.length ?? 0) || (r.storyEchoes?.length ?? 0)
    ? `\n\n秘闻留下的影响：\n${(r.storyConsequences ?? []).map((item) => `· ${item.name}：${item.summary}`).join('\n')}${r.storyEchoes?.length ? `\n${r.storyEchoes.map((item) => `· ${item.title}：${item.outcome}`).join('\n')}` : ''}` : '';
  return `${literary}${review.join('\n\n')}${economyText}${storyText}${quotes.length ? `\n\n战场对白摘录：\n${quotes.join('\n')}` : ''}`;
}

function drawPortraitReport(x, y, w, h) {
  if (!S.reports.length) { labelC(portraitLayer, '还没有战报，先打一场袭击', x + w / 2, y + 80, 16, C.stoneLit); return; }
  reportIdx = Math.min(reportIdx, S.reports.length - 1);
  const tabs = portraitPage(S.reports.map((_, i) => i), 'portrait-report-tabs', Math.min(5, S.reports.length));
  const tw = Math.floor((w - 16 - (tabs.view.length - 1) * 5) / Math.max(1, tabs.view.length));
  tabs.view.forEach((idx, i) => {
    const report = S.reports[idx];
    button(portraitGfx, portraitLayer, portraitHits, x + 8 + i * (tw + 5), y + 2, tw, 36, `#${report.raidNo}`, () => { reportIdx = idx; selectedEntity = { type: 'report', raidNo: report.raidNo }; inspectorView = 'summary'; render(); },
      { size: 13, fill: idx === reportIdx ? C.wallLit : C.wall, border: report.win ? C.green : C.red, color: report.win ? C.green : C.red });
  });
  const r = S.reports[reportIdx];
  panelF(portraitGfx, portraitLayer, 'stone', x + 8, y + 46, w - 16, 82, C.wall);
  label(portraitLayer, `${cut(r.literary?.title ?? r.title, 10)}・${r.win ? '守住' : '失守'}`, x + 20, y + 58, 17, r.win ? C.green : C.red);
  button(portraitGfx, portraitLayer, portraitHits, x + w - 92, y + 52, 76, 30, r.aiState === 'pending' ? 'AI补录中' : r.literary ? '文学全文' : '完整复盘',
    () => openDetailPopup(`#${r.raidNo} ${r.literary?.title ?? '战术复盘'}`, reportDetailBody(r), r.win ? C.green : C.red),
    { size: 11, enabled: r.aiState !== 'pending', border: r.literary ? C.purple : C.gold, color: r.literary ? C.purple : C.gold });
  label(portraitLayer, `封印 ${r.seal}　耗时 ${r.time.toFixed(1)}秒　评价 ${'★'.repeat(r.skulls) || '无'}`, x + 20, y + 84, 13, C.bone);
  label(portraitLayer, `资源 ${r.bone >= 0 ? '+' : ''}${r.bone}骨　${r.mana >= 0 ? '+' : ''}${r.mana}魔`, x + 20, y + 106, 13, C.gold);
  const rows = [
    ...(r.literary ? [`书记：${r.literary.summary}`, ...r.literary.highlights.map((line) => `摘录：${line}`)] : r.aiState === 'pending' ? ['AI战地书记正在补录…'] : []),
    ...(r.rooms ?? []).map((room) => `${room.i + 1}层：${room.broken ? `失守・${room.reason}` : '守住'}`),
    ...(r.review ?? []).map((line) => `复盘：${line}`),
    ...(r.logs ?? []).slice(-8).map((line) => `战况：${line}`),
  ];
  const pg = portraitPage(rows, `portrait-report-${reportIdx}`, Math.max(3, Math.min(8, Math.floor((h - 190) / 42))));
  pg.view.forEach((line, i) => {
    const cy = y + 140 + i * 42;
    portraitGfx.roundRect(x + 8, cy, w - 16, 36, 3).fill(C.ink).stroke({ width: 1, color: C.wallLit, alignment: 0 });
    boundedText(portraitLayer, line, x + 16, cy + 7, w - 32, 24, 11, C.bone);
  });
  portraitPager(`portrait-report-${reportIdx}`, pg.page, pg.pages, x + 8, y + h - 38, w - 16);
}

function drawPortraitStoryRun(x, y, w, h) {
  const run = storyRun;
  button(portraitGfx, portraitLayer, portraitHits, x + w - 84, y + 2, 76, 36, '离开', closeStory, { size: 14, border: C.red, color: C.red });
  label(portraitLayer, run.scene?.title ?? '地牢秘闻', x + 8, y + 10, 17, C.gold);
  if (run.aiState === 'pending') label(portraitLayer, 'AI 正在结合旧档案润色…', x + 8, y + 32, 11, C.purple);
  const latest = run.log.slice(-5);
  let cy = y + 50;
  latest.forEach((entry) => {
    const text = `${entry.who ? `【${entry.who}】` : ''}${entry.text}`;
    const block = boundedText(portraitLayer, text, x + 14, cy + 8, w - 28, 54, 12, entry.tone === 'gain' ? C.green : entry.tone === 'reply' ? C.purple : C.bone);
    const bh = Math.max(48, Math.min(64, block.height + 16));
    portraitGfx.roundRect(x + 8, cy, w - 16, bh, 4).fill(C.ink).stroke({ width: 1, color: C.wallLit, alignment: 0 });
    cy += bh + 6;
  });
  const sc = run.scene;
  if (sc?.choices?.length) {
    const choices = sc.choices.filter((choice) => testConds(storyBridge, choice.when));
    const by = Math.max(cy + 4, y + h - choices.length * 50 - 4);
    choices.forEach((choice, i) => button(portraitGfx, portraitLayer, portraitHits, x + 8, by + i * 50, w - 16, 44, choice.label,
      () => resolveExit(choice.reply, choice.effects, choice.next, choice.followup ?? sc.followup),
      { size: 14, fill: C.wallLit, border: C.bone, color: C.white }));
  } else if (sc?.input) {
    label(portraitLayer, sc.input.prompt, x + 10, y + h - 104, 13, C.purple);
    portraitStoryInputRect = { x: x + 8, y: y + h - 78, w: w - 122, h: 42 };
    portraitGfx.roundRect(portraitStoryInputRect.x, portraitStoryInputRect.y, portraitStoryInputRect.w, portraitStoryInputRect.h, 4)
      .fill(C.ink).stroke({ width: 1, color: C.purple, alignment: 0 });
    button(portraitGfx, portraitLayer, portraitHits, x + w - 106, y + h - 78, 98, 42, '提交', submitStoryInput,
      { size: 14, fill: C.purpleDark, border: C.purple, color: C.white });
  } else {
    button(portraitGfx, portraitLayer, portraitHits, x + 8, y + h - 48, w - 16, 42, S.story.credits > 0 ? '再听一个秘闻' : '返回经营',
      () => S.story.credits > 0 ? void drawStoryScene() : closeStory(), { size: 14, border: C.purple, color: C.purple });
  }
}

function drawPortraitNovel(x, y, w, h) {
  const n = S.novel;
  button(portraitGfx, portraitLayer, portraitHits, x + w - 136, y + 2, 124, 36, '提示词编排', openNovelPromptManager, { size: 13, border: C.purple, color: C.purple });
  if (!n.enabled) {
    labelC(portraitLayer, '小说战役', x + w / 2, y + 16, 20, C.gold);
    panelF(portraitGfx, portraitLayer, 'scroll', x + 8, y + 54, w - 16, Math.max(150, h - 122), 0xE7D7A1);
    boundedText(portraitLayer, '开启后，叙事者会把这座地牢写成长篇互动故事。每章最多三次日常对话，随后签发一场真实入侵；战果成为下一章不可修改的事实。\n\n本模式将接管当前加班档。', x + 26, y + 74, w - 52, Math.max(100, h - 170), 14, C.ink);
    button(portraitGfx, portraitLayer, portraitHits, x + 20, y + h - 56, w - 40, 46,
      novelEnableConfirm ? '确认开启并接管加班档' : '开启小说战役', enableNovelCampaign,
      { size: 16, fill: novelEnableConfirm ? C.redDark : C.purpleDark, border: novelEnableConfirm ? C.red : C.purple, color: C.white });
    return;
  }
  const entries = n.entries, latest = Math.max(0, entries.length - 1); n.page = Math.max(0, Math.min(latest, n.page));
  const entry = entries[n.page], current = n.page >= latest;
  label(portraitLayer, `第${entry?.chapter ?? n.chapter}章`, x + 14, y + 8, 17, C.gold);
  label(portraitLayer, `第${n.page + 1}/${Math.max(1, entries.length)}页 · 日常${n.dailyTurns}/3`, x + w - 162, y + 12, 13, C.stoneLit);
  const decisionH = current && !n.pendingMission ? (n.dailyTurns < 3 ? 244 : 62) : n.pendingMission ? 112 : 58;
  const storyH = Math.max(118, h - decisionH - 50);
  panelF(portraitGfx, portraitLayer, 'scroll', x + 8, y + 42, w - 16, storyH, 0xE7D7A1);
  if (entry) {
    label(portraitLayer, entry.role === 'player' ? `【${S.playerName}】` : entry.role === 'battle' ? '【战斗记录】' : '【地牢叙事者】', x + 24, y + 58, 14,
      entry.role === 'player' ? C.purple : entry.role === 'battle' ? C.redDark : C.ink);
    const pages = paginateText(entry.text, w - 52, storyH - 48, 14);
    const inner = portraitPage(pages, `novel-entry-${entry.id}`, 1);
    boundedText(portraitLayer, inner.view[0] ?? '', x + 24, y + 84, w - 48, storyH - 52, 14, C.ink);
    if (inner.pages > 1) portraitPager(`novel-entry-${entry.id}`, inner.page, inner.pages, x + 18, y + storyH - 2, w - 36);
  } else labelC(portraitLayer, novelBusy ? '叙事者正在落笔…' : '等待第一章', x + w / 2, y + 100, 15, C.ink);
  const navY = y + 46 + storyH;
  button(portraitGfx, portraitLayer, portraitHits, x + 8, navY, 52, 38, '◀', () => { n.page = Math.max(0, n.page - 1); render(); }, { enabled: n.page > 0, size: 16 });
  button(portraitGfx, portraitLayer, portraitHits, x + w - 60, navY, 52, 38, '▶', () => { n.page = Math.min(latest, n.page + 1); render(); }, { enabled: n.page < latest, size: 16 });
  if (!current) button(portraitGfx, portraitLayer, portraitHits, x + 70, navY, w - 140, 38, '返回最新页', () => { n.page = latest; render(); }, { size: 14, border: C.gold, color: C.gold });
  else if (n.pendingMission && !n.pendingMission.resolved) {
    boundedText(portraitLayer, `${n.pendingMission.title}：${n.pendingMission.objectiveText} · 奖励×${n.pendingMission.rewardMult.toFixed(2)}`, x + 72, navY + 2, w - 144, 34, 13, C.red);
    button(portraitGfx, portraitLayer, portraitHits, x + 8, navY + 48, w - 16, 46, '前往王座备战', () => setTab('throne'), { size: 16, fill: C.greenDark, border: C.green, color: C.white });
  } else if (n.dailyTurns < 3) {
    const actionable = n.phase === 'daily' && !novelBusy;
    n.choices.slice(0, 3).forEach((choice, i) => button(portraitGfx, portraitLayer, portraitHits, x + 8, navY + 46 + i * 44, w - 16, 38, `${i + 1}. ${cut(choice, 29)}  ›`, () => openNovelChoiceCard(choice),
      { size: 13, enabled: actionable, fill: C.wallLit, border: C.purple, color: C.white }));
    novelInputRect = null;
    button(portraitGfx, portraitLayer, portraitHits, x + 8, navY + 180, w - 16, 42,
      n.draft ? `✎ 继续编辑：${cut(n.draft, 22)}` : '✎ 打开自由输入卡片', openNovelInputCard,
      { size: 14, enabled: actionable, fill: C.purpleDark, border: C.purple, color: C.white });
    button(portraitGfx, portraitLayer, portraitHits, x + 8, navY + 228, w - 16, 42, '签发新任务', () => void issueNovelMission(), { size: 15, enabled: !novelBusy && entries.length > 0, fill: C.redDark, border: C.red, color: C.white });
  } else {
    novelInputRect = null;
    button(portraitGfx, portraitLayer, portraitHits, x + 8, navY + 46, w - 16, 46, '日常结束 · 必须签发新任务', () => void issueNovelMission(),
      { size: 15, enabled: !novelBusy, fill: C.redDark, border: C.red, color: C.white });
  }
  if (n.error) boundedText(portraitLayer, n.error, x + 16, y + h - 24, w - 32, 20, 11, C.red);
}

function drawPortraitStory(x, y, w, h) {
  if (archiveSection === 'novel') { drawPortraitNovel(x, y, w, h); return; }
  if (storyRun) { drawPortraitStoryRun(x, y, w, h); return; }
  const leads = availableStoryLeads(), archive = S.story.archive;
  const isArchive = archiveSection === 'chronicle';
  const items = isArchive ? archive : leads;
  label(portraitLayer, isArchive ? `永久档案 ${archive.length}` : `待处理线索 ${leads.length}`, x + 10, y + 8, 16, isArchive ? C.gold : C.purple);
  const pg = portraitPage(items, `portrait-story-${isArchive ? 'archive' : 'leads'}`, Math.max(3, Math.min(7, Math.floor((h - 62) / 58))));
  pg.view.forEach((item, i) => {
    const cy = y + 32 + i * 58;
    portraitGfx.roundRect(x + 8, cy, w - 16, 52, 4).fill(C.wall).stroke({ width: 1, color: isArchive ? C.stoneLit : C.purple, alignment: 0 });
    label(portraitLayer, `${item.source}・${cut(item.title, 18)}`, x + 18, cy + 8, 14, isArchive ? C.bone : C.purple);
    label(portraitLayer, isArchive ? cut(item.effects || item.outcome || '已归档', 24) : `产生于第${item.raidNo}轮`, x + 18, cy + 30, 11, C.stoneLit);
    button(portraitGfx, portraitLayer, portraitHits, x + w - 88, cy + 9, 72, 34, isArchive ? '查看' : '处理', () => {
      if (!isArchive) openStoryLead(item.id);
      else openDetailPopup(item.title, `${item.outcome}${item.effects ? `\n\n结果：${item.effects}` : ''}`, C.purple);
    }, { size: 13, border: C.purple, color: C.purple });
  });
  portraitPager(`portrait-story-${isArchive ? 'archive' : 'leads'}`, pg.page, pg.pages, x + 8, y + h - 40, w - 16);
  if (!isArchive) button(portraitGfx, portraitLayer, portraitHits, x + 96, y + h - 40, w - 192, 36,
    S.story.credits > 0 ? `追查无主传闻 ${S.story.credits}` : '暂无无主传闻', () => { if (S.story.credits > 0) void drawStoryScene(); },
    { size: 13, enabled: S.story.credits > 0 && !storyBusy, border: C.gold, color: C.gold });
}

function drawPortraitNativeDetail(x, y, w, h) {
  const d = detailPopup;
  label(portraitLayer, d.title, x + 14, y + 10, 18, d.color);
  const pages = paginateText(d.body, w - 36, h - 92, 14);
  const pg = portraitPage(pages, 'portrait-detail', 1);
  panelF(portraitGfx, portraitLayer, 'scroll', x + 8, y + 44, w - 16, h - 96, 0xE7D7A1);
  boundedText(portraitLayer, pg.view[0] ?? '', x + 20, y + 58, w - 40, h - 124, 14, C.ink);
  portraitPager('portrait-detail', pg.page, pg.pages, x + 8, y + h - 42, w - 16);
}

function drawPortraitNativeManage() {
  const w = app.screen.width, h = app.screen.height;
  const tasksNow = uiTasks();
  portraitGfx.rect(0, 0, w, h).fill({ color: C.bg, alpha: 0.18 });
  panelF(portraitGfx, portraitLayer, 'stone', 8, 8, w - 16, 44, C.wall);
  label(portraitLayer, `骨 ${S.bone}　魔 ${S.mana}`, 20, 20, 15, C.gold);
  labelC(portraitLayer, NAV_ZONES.find((item) => item.id === activeZone())?.name ?? '', w / 2, 20, 16, C.white);
  label(portraitLayer, S.overtime ? `班${currentRaid().no - NORMAL_RAID_COUNT}` : `${S.raidNo}/${NORMAL_RAID_COUNT}`, 112, 21, 13, C.bone);
  button(portraitGfx, portraitLayer, portraitHits, w - 132, 12, 62, 34, `事务${tasksNow.length}`, () => { selectedEntity = { type: 'tasks' }; setZone('throne'); },
    { size: 12, border: tasksNow.some((task) => task.blocking) ? C.red : tasksNow.length ? C.gold : C.green, color: tasksNow.some((task) => task.blocking) ? C.red : tasksNow.length ? C.gold : C.green });
  button(portraitGfx, portraitLayer, portraitHits, w - 66, 12, 52, 34, '菜单', () => { portraitMobileMenu = !portraitMobileMenu; render(); },
    { size: 13, fill: portraitMobileMenu ? C.wallLit : C.wall, border: portraitMobileMenu ? C.gold : C.stoneLit, color: C.white });

  const tabs = visibleZones(), cols = tabs.length, rows = 1;
  const navH = rows * 46 + 8, navTop = h - navH - 4;
  const guide = roundGuide();
  const primaryY = navTop - 54;
  const contentX = 8, contentY = 60, contentW = w - 16, contentH = primaryY - contentY - 8;
  portraitGfx.roundRect(contentX, contentY, contentW, contentH, 5).fill(C.bg).stroke({ width: 2, color: C.wallLit, alignment: 0 });
  let pageY = contentY + 8;
  let guideLayout = null;
  let menuNewY = null;
  if (detailPopup) {
    drawPortraitNativeDetail(contentX, pageY, contentW, contentY + contentH - pageY - 6);
  } else if (portraitMobileMenu) {
    label(portraitLayer, '系统菜单', contentX + 18, pageY + 4, 18, C.gold);
    const menuItems = [
      ['档位与主动存档', () => void openSaveManager(), C.gold],
      ['导出存档', exportSave, C.bone], ['导入存档', importSave, C.bone],
      [S.muted ? '开启声音' : '关闭声音', toggleMute, C.purple],
      [`信息密度：${uiDensity === 'expert' ? '专家' : '标准'}`, toggleUiDensity, C.gold],
      ['AI 接入设置', openAISettings, C.purple],
      [confirmNew ? '确认清空并开始新档' : '开始新档', requestNewGame, confirmNew ? C.red : C.gold],
    ];
    menuItems.forEach(([name, action, color], i) => {
      const by = pageY + 38 + i * 54;
      if (i === 6) menuNewY = by;
      button(portraitGfx, portraitLayer, portraitHits, contentX + 18, by, contentW - 36, 46, name, action,
        { size: 16, fill: i === 6 && confirmNew ? C.redDark : C.wall, border: color, color: i === 6 && confirmNew ? C.white : color });
    });
  } else {
    if (guide) {
      guideLayout = portraitGuideBanner(contentX + 6, pageY, contentW - 12);
      pageY += (guideLayout?.h ?? 0) + 6;
    }
    if (activeZone() === 'army') {
      const sections = featureOpen('hero') ? [['mob', '怪物'], ['hero', '英雄']] : [['mob', '怪物']];
      const sw = Math.floor((contentW - 18 - (sections.length - 1) * 6) / sections.length);
      sections.forEach(([id, name], i) => button(portraitGfx, portraitLayer, portraitHits, contentX + 6 + i * (sw + 6), pageY, sw, 36, name,
        () => setTab(id), { size: 14, fill: tab === id ? C.wallLit : C.wall, border: tab === id ? C.gold : C.stoneLit, color: C.white }));
      pageY += 42;
    } else if (activeZone() === 'archive') {
      const sections = featureOpen('story') ? [['report', '战报'], ['story', '秘闻'], ['chronicle', '编年史'], ...(novelAvailable() ? [['novel', '小说']] : [])] : [['report', '战报']];
      const sw = Math.floor((contentW - 18 - (sections.length - 1) * 6) / sections.length);
      sections.forEach(([id, name], i) => button(portraitGfx, portraitLayer, portraitHits, contentX + 6 + i * (sw + 6), pageY, sw, 36, name,
        () => setArchiveSection(id), { size: 14, fill: archiveSection === id ? C.wallLit : C.wall, border: archiveSection === id ? C.gold : C.stoneLit, color: C.white }));
      pageY += 42;
    }
    const pageH = contentY + contentH - pageY - 6;
    if (tab === 'throne') drawPortraitThrone(contentX, pageY, contentW, pageH);
    else if (tab === 'dungeon') drawPortraitDungeon(contentX, pageY, contentW, pageH);
    else if (tab === 'hero') drawPortraitHero(contentX, pageY, contentW, pageH);
    else if (tab === 'mob') drawPortraitMob(contentX, pageY, contentW, pageH);
    else if (tab === 'shop') drawPortraitShop(contentX, pageY, contentW, pageH);
    else if (tab === 'report') drawPortraitReport(contentX, pageY, contentW, pageH);
    else drawPortraitStory(contentX, pageY, contentW, pageH);
  }

  const ack = guide?.[2];
  const battleReady = activeZone() === 'throne' && (!guide || guide[0] === 'battle');
  const blocked = uiBattleBlocked();
  const primaryLabel = detailPopup ? '关闭详情' : portraitMobileMenu ? '关闭菜单' : ack ? '明白，继续' : battlePrepBusy ? 'AI 正在编排战前台词…' : battleReady ? blocked ? '先处理阻止事务' : '迎战' : guide ? '按引导完成当前步骤' : activeZone() === 'throne' ? blocked ? '先处理阻止事务' : '迎战' : '返回王座';
  const primaryAction = detailPopup ? closeDetailPopup : portraitMobileMenu ? () => { portraitMobileMenu = false; confirmNew = false; render(); }
    : ack ? acknowledgeRoundGuide : battleReady || activeZone() === 'throne' ? startBattle : guide ? () => {} : () => setZone('throne');
  button(portraitGfx, portraitLayer, portraitHits, 8, primaryY, w - 16, 46, primaryLabel, primaryAction,
    { size: 17, enabled: !battlePrepBusy && !((battleReady || activeZone() === 'throne') && blocked) && (!!detailPopup || portraitMobileMenu || ack || battleReady || activeZone() === 'throne' || !guide), fill: ack ? C.goldDark : C.greenDark, border: blocked ? C.red : ack ? C.gold : C.green, color: C.white });
  portraitActionMap.primary = { x: 8, y: primaryY, w: w - 16, h: 46 };

  const gap = 5, bw = Math.floor((w - 16 - gap * (cols - 1)) / cols);
  tabs.forEach((item, i) => {
    const bx = 8 + (i % cols) * (bw + gap), by = navTop + Math.floor(i / cols) * 46;
    const guided = guide && (PAGE_ZONE[guide[0]] === item.id || guide[0] === item.id);
    button(portraitGfx, portraitLayer, portraitHits, bx, by, bw, 40, item.name, () => setZone(item.id), {
      size: 14, fill: activeZone() === item.id ? C.wallLit : C.wall, border: guided || activeZone() === item.id ? C.gold : C.stoneLit,
      color: guided || activeZone() === item.id ? C.white : C.bone,
    });
    portraitActionMap[`nav-${item.id}`] = { x: bx, y: by, w: bw, h: 40 };
    if (item.id === 'army') {
      portraitActionMap['nav-mob'] = portraitActionMap[`nav-${item.id}`];
      portraitActionMap['nav-hero'] = portraitActionMap[`nav-${item.id}`];
    } else if (item.id === 'archive') {
      portraitActionMap['nav-report'] = portraitActionMap[`nav-${item.id}`];
      portraitActionMap['nav-story'] = portraitActionMap[`nav-${item.id}`];
    }
  });
  portraitLayoutInfo = { native: true, contentTop: contentY, contentBottom: contentY + contentH, primaryY, navTop, bottom: h, tabTop: navTop,
    margin: 8, gap, buttonWidth: bw, menuButton: { x: w - 66, y: 12, w: 52, h: 34 }, menuOpen: portraitMobileMenu,
    menuNew: menuNewY == null ? null : { x: contentX + 18, y: menuNewY, w: contentW - 36, h: 46 }, guide: guideLayout };
  syncStoryInput();
}

function drawPortraitModalChrome() {
  const w = app.screen.width, h = app.screen.height;
  const top = Math.max(0, Math.ceil(portraitContentBottom));
  portraitGfx.rect(0, top, w, Math.min(64, h - top)).fill(C.bg).stroke({ width: 2, color: C.wallLit, alignment: 0 });
  const forced = lawAudit || raidBriefing;
  const name = lawAudit ? '法则审计' : raidBriefing ? `第${raidBriefing.no}轮战前剧情` : researchModal ? '高端工坊路线' : stitch ? '怪物创造' : graft ? '部件改造' : smith ? '装备锻造' : '叙事工坊';
  label(portraitLayer, forced ? name : `${name}・完整工作台`, 14, top + 17, 15, forced && lawAudit ? C.red : C.gold);
  const action = lawAudit ? acceptLawAudit : raidBriefing ? confirmRaidBriefing : researchModal ? closeWorkshopResearch : closePortraitModal;
  const actionName = lawAudit ? '接受处罚' : raidBriefing ? '迎战吧' : '关闭工作台';
  button(portraitGfx, portraitLayer, portraitHits, w - 128, top + 8, 114, 44, actionName, action,
    { size: 15, border: forced ? C.gold : C.red, color: forced ? C.white : C.red, fill: forced ? C.redDark : C.wall });
  portraitActionMap[lawAudit ? 'lawAuditAccept' : raidBriefing ? 'raidBriefingFight' : 'modalClose'] = { x: w - 128, y: top + 8, w: 114, h: 44 };
  portraitLayoutInfo = { nativeModal: true, contentTop: root.y, contentBottom: portraitContentBottom, primaryY: top + 8, bottom: Math.min(h, top + 64) };
}

function drawPortraitTitle() {
  const w = app.screen.width, h = app.screen.height;
  portraitGfx.rect(0, 0, w, h).fill(C.bg);
  for (let y = 0; y < h; y += 48) portraitGfx.rect(0, y, w, 1).fill({ color: C.wall, alpha: 0.42 });
  const artTop = Math.max(18, Math.round(h * 0.055));
  const throne = sprite('icon-throne', w / 2, artTop + Math.min(150, h * 0.18), Math.min(128, w * 0.32));
  throne.alpha = 0.65; portraitLayer.addChild(throne);
  labelC(portraitLayer, GAME_NAME, w / 2, artTop, Math.max(25, Math.min(36, w * 0.085)), C.gold);
  labelC(portraitLayer, '经营黑暗 · 守住王座', w / 2, artTop + 45, 14, C.bone);
  button(portraitGfx, portraitLayer, portraitHits, w - 104, artTop + 78, 86, 38, `档位 ${getActiveSlot()}`, () => void openSaveManager(), { size: 14, border: C.gold, color: C.gold });
  const margin = 18;
  if (titleMode === 'main') {
    const panelY = Math.max(255, Math.round(h * 0.36));
    const panelH = Math.min(330, h - panelY - 42);
    panelF(portraitGfx, portraitLayer, 'scroll', margin, panelY, w - margin * 2, panelH, C.wall);
    const status = saveExists ? `存档进度：第 ${S.overtime ? `加班 ${S.otRaid - NORMAL_RAID_COUNT}` : `${S.raidNo}/${NORMAL_RAID_COUNT}`} 轮` : '王座空悬，等待新的地下城主。';
    boundedText(portraitLayer, status, margin + 24, panelY + 28, w - margin * 2 - 48, 54, 15, C.stoneLit);
    let by = panelY + 102;
    if (saveExists) {
      portraitActionMap.titleContinue = { x: margin + 24, y: by, w: w - margin * 2 - 48, h: 54 };
      button(portraitGfx, portraitLayer, portraitHits, margin + 24, by, w - margin * 2 - 48, 54, '继续游戏', continueGame,
        { size: 20, fill: C.greenDark, border: C.green, color: C.white });
      by += 70;
    }
    portraitActionMap.titleNew = { x: margin + 24, y: by, w: w - margin * 2 - 48, h: 54 };
    button(portraitGfx, portraitLayer, portraitHits, margin + 24, by, w - margin * 2 - 48, 54,
      titleNewConfirm ? '确认覆盖并开始' : '开始新游戏', startFromTitle,
      { size: 20, fill: titleNewConfirm ? C.redDark : C.wallLit, border: titleNewConfirm ? C.red : C.gold, color: C.white });
    if (meta.clears > 0) labelC(portraitLayer, `轮回方针已解锁 · 通关 ${meta.clears} 次`, w / 2, panelY + panelH - 35, 13, C.purple);
    return;
  }
  const listY = Math.max(215, Math.round(h * 0.27));
  labelC(portraitLayer, '选择本轮开局方针', w / 2, listY - 34, 18, C.white);
  const cardH = Math.max(68, Math.min(86, (h - listY - 210) / 4));
  Object.values(DOCTRINES).forEach((d, i) => {
    const x = margin, y = listY + i * (cardH + 8), selected = titleDoctrinePick === d.id;
    panelF(portraitGfx, portraitLayer, 'stone', x, y, w - margin * 2, cardH, selected ? C.gold : C.wall);
    label(portraitLayer, d.name, x + 18, y + 14, 17, selected ? C.ink : C.bone);
    label(portraitLayer, `【${d.tag}】`, w - margin - 78, y + 15, 13, selected ? C.white : C.stoneLit);
    portraitHits.add(x, y, w - margin * 2, cardH, () => { titleDoctrinePick = d.id; playSfx('tab'); render(); });
    portraitActionMap[`doctrine-${d.id}`] = { x, y, w: w - margin * 2, h: cardH };
  });
  const detailY = listY + 4 * (cardH + 8) + 4;
  panelF(portraitGfx, portraitLayer, 'scroll', margin, detailY, w - margin * 2, 98, C.wall);
  boundedText(portraitLayer, (DOCTRINES[titleDoctrinePick] ?? DOCTRINES.default).desc, margin + 18, detailY + 13, w - margin * 2 - 36, 72, 13, C.bone);
  const bottomY = Math.min(h - 70, detailY + 110), bw = Math.floor((w - margin * 2 - 10) / 2);
  button(portraitGfx, portraitLayer, portraitHits, margin, bottomY, bw, 52, '返回', () => { titleMode = 'main'; titleNewConfirm = false; render(); }, { size: 17 });
  button(portraitGfx, portraitLayer, portraitHits, margin + bw + 10, bottomY, bw, 52, '以此方针开局', () => openIdentitySetup(titleDoctrinePick),
    { size: 16, fill: C.purpleDark, border: C.gold, color: C.white });
  portraitActionMap.doctrineBack = { x: margin, y: bottomY, w: bw, h: 52 };
  portraitActionMap.doctrineConfirm = { x: margin + bw + 10, y: bottomY, w: bw, h: 52 };
}

function ensurePortraitChrome() {
  const key = [portrait, screen, titleMode, titleNewConfirm, saveExists, meta.clears, tab, paused, speed, confirmNew, S.bone, S.mana, S.raidNo, S.overtime,
    tutorialData().step, Object.keys(tutorialData().visited).length, app.screen.width, app.screen.height].join('|');
  if (key === portraitChromeKey) return;
  portraitChromeKey = key;
  portraitHits.clear();
  portraitActionMap = {};
  portraitStoryInputRect = null;
  const kids = portraitLayer.removeChildren();
  for (const kid of kids) if (kid !== portraitGfx) kid.destroy({ children: true });
  portraitLayer.addChild(portraitGfx);
  portraitGfx.clear();
  portraitLayer.visible = portrait;
  portraitLayoutInfo = null;
  root.visible = screen !== 'title' && !portraitNativeManage();
  if (!portrait) { root.visible = true; return; }
  if (screen === 'title') { drawPortraitTitle(); return; }
  if (screen === 'intro') { portraitLayer.visible = false; root.visible = true; return; }
  if (portraitNativeManage()) { drawPortraitNativeManage(); return; }
  if (portraitModalOpen()) { drawPortraitModalChrome(); return; }

  const w = app.screen.width, h = app.screen.height;
  const top = Math.max(0, Math.ceil(portraitContentBottom));
  const consoleHeight = Math.min(h - top, portraitConsoleHeight());
  portraitGfx.rect(0, top, w, consoleHeight).fill(C.bg).stroke({ width: 2, color: C.wallLit, alignment: 0 });
  const gap = 5, margin = 8, cols = 4;
  const bw = Math.floor((w - margin * 2 - gap * (cols - 1)) / cols);
  let cursorY = top + 7;
  let tabTop = cursorY;
    const tabs = visibleZones();
  const currentGuide = roundGuide();
  if (screen === 'manage') {
    panelF(portraitGfx, portraitLayer, 'stone', 6, cursorY, w - 12, 36, C.wall);
    const raid = currentRaid();
    label(portraitLayer, `骨 ${S.bone}　魔 ${S.mana}`, 16, cursorY + 10, 14, C.gold);
    label(portraitLayer, S.overtime ? `加班 ${raid.no - NORMAL_RAID_COUNT}` : `袭击 ${S.raidNo}/${NORMAL_RAID_COUNT}`, w - 94, cursorY + 10, 14, C.bone);
    cursorY += 42;
    tabTop = cursorY;
    tabs.forEach((item, i) => {
      const x = margin + (i % cols) * (bw + gap);
      const y = tabTop + Math.floor(i / cols) * 43;
      const guided = PAGE_ZONE[currentGuide?.[0]] === item.id || currentGuide?.[0] === item.id;
      button(portraitGfx, portraitLayer, portraitHits, x, y, bw, 38, item.name, () => setZone(item.id), {
        size: 14, fill: activeZone() === item.id ? C.wallLit : C.wall,
        border: guided || activeZone() === item.id ? C.gold : C.stoneLit, color: guided || activeZone() === item.id ? C.white : C.bone,
      });
      if (guided) {
        const pulse = new PIXI.Graphics().roundRect(x - 2, y - 2, bw + 4, 42, 4)
          .stroke({ width: 2, color: C.white, alignment: 0 });
        portraitLayer.addChild(pulse); guidePulseNodes.push(pulse);
      }
    });
    cursorY = tabTop + Math.ceil(tabs.length / cols) * 43 + 5;

    const paneY = cursorY;
    const pw = Math.floor((w - margin * 2 - gap * 2) / 3);
    ['完整全景', '左栏放大', '右栏放大'].forEach((name, i) => button(portraitGfx, portraitLayer, portraitHits,
      margin + i * (pw + gap), paneY, pw, 36, name, () => setPortraitPane(i), {
        size: 13, fill: portraitPane === i ? C.wallLit : C.wall,
        border: portraitPane === i ? C.gold : C.stoneLit, color: portraitPane === i ? C.white : C.bone,
      }));
    cursorY += 43;
  } else if (screen === 'battle' && battle) {
    panelF(portraitGfx, portraitLayer, 'stone', 6, cursorY, w - 12, 44, C.wall);
    const invaders = battle.heroes.filter((unit) => unit.alive).length;
    const defenders = battle.rooms.flatMap((room) => room.mons).filter((unit) => unit.alive).length;
    label(portraitLayer, `第${battle.roomIndex + 1}层`, 16, cursorY + 12, 14, C.gold);
    labelC(portraitLayer, `守军 ${defenders}　勇者 ${invaders}`, w / 2, cursorY + 12, 14, C.bone);
    label(portraitLayer, `封印 ${Math.max(0, Math.round(battle.seal))}`, w - 102, cursorY + 12, 14, battle.seal <= 25 ? C.red : C.purple);
    cursorY += 50;
  }

  const primaryY = cursorY;
  if (screen === 'ending') {
    const bw2 = Math.floor((w - margin * 2 - gap) / 2);
    button(portraitGfx, portraitLayer, portraitHits, margin, primaryY, bw2, 46, '进入加班勇者', enterOvertime,
      { size: 15, fill: C.purpleDark, border: C.purple, color: C.white });
    button(portraitGfx, portraitLayer, portraitHits, margin + bw2 + gap, primaryY, bw2, 46, '开启新轮回', openNewCycle,
      { size: 15, fill: C.goldDark, border: C.gold, color: C.white });
    portraitActionMap.endingOvertime = { x: margin, y: primaryY, w: bw2, h: 46 };
    portraitActionMap.endingRebirth = { x: margin + bw2 + gap, y: primaryY, w: bw2, h: 46 };
    portraitLayoutInfo = { top, bottom: top + consoleHeight, primaryY, margin, gap };
    return;
  }
  const guideAck = screen === 'manage' && currentGuide?.[2];
  const primaryLabel = screen === 'manage' ? (guideAck ? '明白，继续教学' : battlePrepBusy ? 'AI 编排中…' : '迎　战') : screen === 'battle' ? (paused ? '继续战斗' : '暂停战斗') : screen === 'result' ? '继续结算' : '进入加班勇者';
  const primaryAction = screen === 'manage' ? (guideAck ? acknowledgeRoundGuide : startBattle) : screen === 'battle'
    ? () => { paused = !paused; portraitChromeKey = ''; }
    : screen === 'result' ? afterResult : enterOvertime;
  if (screen === 'battle') {
    const quitW = Math.max(92, Math.floor((w - margin * 2) * 0.32));
    button(portraitGfx, portraitLayer, portraitHits, margin, primaryY, w - margin * 2 - quitW - gap, 44, primaryLabel, primaryAction,
      { size: 17, fill: C.greenDark, border: C.green, color: C.white });
    button(portraitGfx, portraitLayer, portraitHits, w - margin - quitW, primaryY, quitW, 44, '退出战斗', abortBattle,
      { size: 15, fill: C.redDark, border: C.red, color: C.white });
    portraitActionMap.battleExit = { x: w - margin - quitW, y: primaryY, w: quitW, h: 44 };
  } else button(portraitGfx, portraitLayer, portraitHits, margin, primaryY, w - margin * 2, 44, primaryLabel, primaryAction,
    { size: 17, enabled: !battlePrepBusy, fill: guideAck ? C.goldDark : C.greenDark, border: guideAck ? C.gold : C.green, color: C.white });
  if (screen === 'manage' && currentGuide?.[0] === 'battle') {
    const pulse = new PIXI.Graphics().roundRect(margin - 2, primaryY - 2, w - margin * 2 + 4, 48, 4)
      .stroke({ width: 2, color: C.gold, alignment: 0 });
    portraitLayer.addChild(pulse); guidePulseNodes.push(pulse);
  }

  const actionY = primaryY + 51;
  let newY = actionY;
  let newX = margin;
  let utilityWidth = 0;
  if (screen === 'manage') {
    const aw = Math.floor((w - margin * 2 - gap * 3) / 4);
    utilityWidth = aw;
    newX = margin + (aw + gap) * 3;
    button(portraitGfx, portraitLayer, portraitHits, margin, actionY, aw, 38, '导出', exportSave, { size: 13 });
    button(portraitGfx, portraitLayer, portraitHits, margin + aw + gap, actionY, aw, 38, '导入', importSave, { size: 13 });
    button(portraitGfx, portraitLayer, portraitHits, margin + (aw + gap) * 2, actionY, aw, 38, S.muted ? '开声音' : '关声音', toggleMute, { size: 12 });
    button(portraitGfx, portraitLayer, portraitHits, newX, actionY, aw, 38,
      confirmNew ? '确认新档' : '新档', requestNewGame,
      { size: 13, fill: confirmNew ? C.redDark : C.wall, border: confirmNew ? C.red : C.bone, color: confirmNew ? C.white : C.bone });
  } else if (screen === 'battle') {
    const sw = Math.floor((w - margin * 2 - gap * 2) / 3);
    [1, 2, 4].forEach((value, i) => button(portraitGfx, portraitLayer, portraitHits, margin + i * (sw + gap), actionY, sw, 38,
      `${value}倍速`, () => { speed = value; portraitChromeKey = ''; },
      { size: 14, fill: speed === value ? C.wallLit : C.wall, border: speed === value ? C.gold : C.stoneLit, color: speed === value ? C.white : C.bone }));
  }
  portraitLayoutInfo = { top, bottom: top + consoleHeight, tabTop, primaryY, actionY, newY, newX, utilityWidth, margin, gap, buttonWidth: bw,
    paneY: screen === 'manage' ? primaryY - 43 : null, paneWidth: Math.floor((w - margin * 2 - gap * 2) / 3), pane: portraitPane,
    contentTop: screen === 'manage' ? root.y + 36 * viewScale : root.y, contentBottom: portraitContentBottom,
    logicalLeft: screen === 'manage' ? (portraitPane === 2 ? VIEW_W / 2 : 0) : 0,
    logicalWidth: screen === 'manage' ? (portraitPane === 0 ? VIEW_W : VIEW_W / 2) : VIEW_W };
}

function drawTabs(g               ) {
  const tabs = visibleZones();
  const w = VIEW_W / tabs.length;
  tabs.forEach((t, i) => {
    const active = t.id === activeZone();
    const x = i * w;
    g.rect(x, 238, w, 32).fill(active ? C.wallLit : C.wall);
    frame(uiLayer, 'tab-fill', x, 238, w, 32, { tint: active ? C.wallLit : C.wall });
    frame(uiLayer, 'tab', x, 238, w, 32, { tint: active ? C.gold : C.ink });
    const label1 = txt(`${i + 1} ${t.name}`, 12, active ? C.white : C.bone);
    label1.x = Math.round(x + (w - label1.width) / 2);
    label1.y = 248;
    uiLayer.addChild(label1);
    const dot = (t.id === 'army' && (canUpgradeAny() || heroHasNew())) || (t.id === 'shop' && shopHasAffordable()) || (t.id === 'archive' && storyHasNew());
    if (dot) g.circle(x + w - 10, 248, 3).fill(C.red);
    hits.add(x, 238, w, 32, () => setZone(t.id));
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
  const tasks = uiTasks(), topTasks = tasks.slice(0, 3), blocked = tasks.some((task) => task.blocking);
  const placed = countPlaced();
  const dualTraps = researchEffects(S.workshopResearch).dualTraps;
  const trapCount = S.rooms.reduce((n, r) => n + (r.trap !== 'none' ? 1 : 0) + (dualTraps && r.trap2 !== 'none' ? 1 : 0), 0);
  label(uiLayer, `敌情・${raid.title}`, 10, 42, 12, C.white);
  if (raid.affixes.length) {
    const width = Math.floor((184 - (raid.affixes.length - 1) * 3) / raid.affixes.length);
    raid.affixes.forEach((id, i) => {
      const info = raidAffixInfo(raid, id);
      button(g, uiLayer, hits, 126 + i * (width + 3), 38, width, 17, `${info?.name ?? id} ${info?.roman ?? ''}`,
        () => openRaidAffix(raid, id), { size: raid.affixes.length >= 4 ? 8 : 9, fill: C.redDark, border: C.red, color: C.white });
    });
  } else label(uiLayer, `${raid.members.length}名・无词缀`, 214, 42, 10, C.stoneLit);
  panelF(g, uiLayer, 'inset', 8, 56, 306, 76, C.ink);
  const gap = Math.min(56, Math.floor(286 / Math.max(1, raid.members.length)));
  raid.members.forEach((m, i) => {
    const cls = HERO_CLASSES[m.cls];
    const x = 28 + i * gap;
    const s = sprite(cls.tex, x, 111, 27);
    uiLayer.addChild(s);
    labelC(uiLayer, cut(cls.name, 4), x, 62, 10, cls.role === '首领' ? C.gold : C.bone);
    labelC(uiLayer, `Lv${m.lv} ${cut(cls.role, 3)}`, x, 113, 9, C.stoneLit);
    hits.add(x - 22, 58, 44, 66, () => { selectedEntity = { type: 'enemy', index: i }; inspectorView = 'summary'; playSfx('tab'); render(); });
  });
  label(uiLayer, `本轮事务 ${tasks.length}`, 10, 138, 12, blocked ? C.red : tasks.length ? C.gold : C.green);
  if (!topTasks.length) label(uiLayer, '✓ 防线没有需要处理的显著问题', 14, 161, 11, C.green);
  topTasks.forEach((task, i) => {
    const y = 154 + i * 25, color = UI_TASK_TONE[task.severity];
    g.rect(8, y, 306, 22).fill(C.wall).stroke({ width: 1, color, alignment: 0 });
    label(uiLayer, task.severity === 'block' ? '阻止' : task.severity === 'warning' ? '警告' : '机会', 13, y + 4, 9, color);
    label(uiLayer, cut(task.title, 12), 49, y + 3, 11, C.bone);
    button(g, uiLayer, hits, 258, y + 2, 52, 18, '前往', () => navigateUiTask(task), { size: 10, border: color, color });
    hits.add(8, y, 246, 22, () => { selectedEntity = { type: 'task', id: task.id }; inspectorView = 'summary'; playSfx('tab'); render(); });
  });

  panelF(g, uiLayer, 'stone', 318, 38, 158, 196, C.wall);
  label(uiLayer, '上下文检查器', 328, 45, 11, C.gold);
  const selectedTask = selectedEntity?.type === 'task' ? tasks.find((task) => task.id === selectedEntity.id) : null;
  const selectedEnemy = selectedEntity?.type === 'enemy' ? raid.members[selectedEntity.index] : null;
  if (selectedTask) {
    label(uiLayer, selectedTask.severity === 'block' ? '【阻止】' : selectedTask.severity === 'warning' ? '【警告】' : '【机会】', 328, 65, 11, UI_TASK_TONE[selectedTask.severity]);
    boundedText(uiLayer, selectedTask.title, 328, 82, 138, 24, 12, C.white, { maxLines: 2 });
    boundedText(uiLayer, selectedTask.summary, 328, 108, 138, 47, 10, C.bone, { maxLines: 4 });
    label(uiLayer, cut(`原因：${selectedTask.reason}`, 18), 328, 158, 9, C.stoneLit);
    button(g, uiLayer, hits, 328, 177, 138, 22, '前往处理', () => navigateUiTask(selectedTask), { size: 11, border: UI_TASK_TONE[selectedTask.severity], color: C.white });
  } else if (selectedEnemy) {
    const cls = HERO_CLASSES[selectedEnemy.cls];
    label(uiLayer, `${cls.name}・Lv${selectedEnemy.lv}`, 328, 65, 12, cls.role === '首领' ? C.gold : C.white);
    label(uiLayer, `定位：${cls.role}`, 328, 84, 10, C.red);
    boundedText(uiLayer, cls.intel, 328, 101, 138, 70, 10, C.bone, { maxLines: uiDensity === 'expert' ? 6 : 4 });
    button(g, uiLayer, hits, 328, 177, 138, 22, '完整敌情', () => openDetailPopup(`${cls.name}・完整敌情`, `${cls.intel}\n\n等级：${selectedEnemy.lv}\n定位：${cls.role}\n本轮词缀：${raid.affixes.length ? affixText(raid.affixes, raid) : '无'}`, C.red), { size: 11, border: C.red, color: C.red });
  } else {
    const doctrineSeal = S.doctrine === 'default' ? 1.25 : S.doctrine === 'economy' ? 0.8 : 1;
    const sealEff = Math.max(25, Math.round((sealMax() + battleMods().sealAdd) * doctrineSeal));
    label(uiLayer, blocked ? '结论：尚不可迎战' : tasks.some((task) => task.severity === 'warning') ? '结论：有风险，可迎战' : '结论：防线可用', 328, 65, 11, blocked ? C.red : tasks.length ? C.gold : C.green);
    label(uiLayer, `布防 ${placed}・陷阱 ${trapCount}`, 328, 84, 10, C.bone);
    label(uiLayer, `封印 ${sealEff}・待产 ${economy.bone}骨${economy.mana}魔`, 328, 100, 10, C.purple);
    boundedText(uiLayer, tasks[0]?.summary ?? '可以直接迎战；也可以继续优化阵容。', 328, 119, 138, 48, 10, C.stoneLit, { maxLines: 4 });
    if (uiDensity === 'expert') label(uiLayer, `秘闻修正 ${S.story.mods.length}・评价 ${S.best[raid.no] || 0}/3`, 328, 168, 9, C.gold);
  }
  button(g, uiLayer, hits, 328, 202, 66, 24, '完整百科', () => openDetailPopup('本轮作战百科', `敌军：${raid.members.map((m) => `${HERO_CLASSES[m.cls].name} Lv${m.lv}`).join('、')}\n词缀：${raid.affixes.length ? affixText(raid.affixes, raid) : '无'}\n\n布防：${placed}名守军，${trapCount}个陷阱\n预计产出：${economy.bone}骨币、${economy.mana}魔质\n\n本轮事务：\n${tasks.map((task) => `【${task.title}】${task.summary} 原因：${task.reason}`).join('\n') || '无'}`, C.gold), { size: 10, border: C.gold, color: C.gold });
  const doctrineSeal = S.doctrine === 'default' ? 1.25 : S.doctrine === 'economy' ? 0.8 : 1;
  void doctrineSeal;
  button(g, uiLayer, hits, 398, 202, 68, 24, blocked ? '先处理' : battlePrepBusy ? '准备中' : '迎战', () => void startBattle(),
    { enabled: !battlePrepBusy && !blocked, fill: blocked ? C.wall : C.redDark, border: blocked ? C.red : C.green, color: C.white });
}

function tutorialHint()         {
  if (S.raidNo === 1 && !S.overtime) return roundGuide()?.[1] ?? '';
  return '';
}

const ROOM_BOX = (i        ) => ({ x: 34, y: 70 + (i % 3) * 48, w: 182, h: 44 });

function pageDungeon(g               ) {
  const eco = dungeonEconomyPreview();
  label(uiLayer, `地牢 ${S.floors.length}层  预计＋${eco.bone}骨＋${eco.mana}魔`, 8, 40, 12, C.white);
  if (featureOpen('dungeonTools') && S.floors.length < MAX_FLOORS) {
    const raw = FLOOR_EXPAND[S.floors.length];
    const cost = doctrineCost('floor', raw.bone, raw.mana);
    button(g, uiLayer, hits, 236, 39, 90, 14, `扩层${cost.bone}骨${cost.mana ? `${cost.mana}魔` : ''}`, () => expandFloor(),
      { size: 10, enabled: S.bone >= cost.bone && S.mana >= cost.mana, border: C.goldDark, color: C.gold });
  } else if (featureOpen('dungeonTools')) label(uiLayer, '已达六层', 272, 40, 10, C.gold);
  const pf = paged('dungeon-floors', S.floors, 3);
  const selectedFloor = sel?.kind === 'utility' ? sel.floor : sel?.kind === 'slot' ? sel.room : null;
  if (selectedFloor != null && (selectedFloor < pf.from || selectedFloor >= pf.from + pf.view.length)) sel = null;
  // 地牢剖面：入口沿左侧竖井向下，战斗房在外侧，后勤房在更深的内侧。
  label(uiLayer, pf.from === 0 ? '入口门 ↓' : '继续深入 ↓', 8, 56, 10, C.gold);
  labelC(uiLayer, '外层防线', 124, 56, 9, C.red);
  if (featureOpen('facilities')) labelC(uiLayer, '→ 内层经营区', 271, 56, 9, C.green);
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
    if (featureOpen('dungeonTools')) {
      const trapSelected = sel?.kind === 'slot' && sel.room === i && sel.which === 'trap';
      const dual = researchEffects(S.workshopResearch).dualTraps;
      button(g, uiLayer, hits, b.x + 102, b.y + 2, 36, 12, cut(THEMES[cfg.theme].name, 3), () => {
        sel = { kind: 'slot', room: i, which: 'theme' }; playSfx('tab'); render();
      }, { size: 8, fill: C.ink, border: sel?.kind === 'slot' && sel.room === i && sel.which === 'theme' ? C.gold : C.wallLit, color: C.stoneLit });
      button(g, uiLayer, hits, b.x + 140, b.y + 2, dual ? 18 : 38, 12, cfg.trap === 'none' ? (dual ? '阱1' : '陷阱') : cut(TRAPS[cfg.trap].name, dual ? 1 : 3), () => {
        sel = { kind: 'slot', room: i, which: 'trap', slot: 0 }; playSfx('tab'); render();
      }, { size: 8, fill: C.ink, border: trapSelected && (sel.slot ?? 0) === 0 ? C.gold : C.wallLit, color: cfg.trap === 'none' ? C.stoneLit : C.bone });
      if (dual) button(g, uiLayer, hits, b.x + 160, b.y + 2, 18, 12, cfg.trap2 === 'none' ? '阱2' : cut(TRAPS[cfg.trap2].name, 1), () => {
        sel = { kind: 'slot', room: i, which: 'trap', slot: 1 }; playSfx('tab'); render();
      }, { size: 8, fill: C.ink, border: trapSelected && sel.slot === 1 ? C.gold : C.wallLit, color: cfg.trap2 === 'none' ? C.stoneLit : C.bone });
    }
    dungeonSlotChip(g, b.x + 5, b.y + 17, 40, 23, cfg.back, i, 'back', '后');
    dungeonSlotChip(g, b.x + 93, b.y + 17, 40, 23, cfg.front, i, 'front', '前');
    if (featureOpen('hero')) dungeonSlotChip(g, b.x + 49, b.y + 17, 40, 23, cfg.leader, i, 'leader', '统');
    if (featureOpen('hero')) dungeonSlotChip(g, b.x + 137, b.y + 17, 40, 23, cfg.flank, i, 'flank', '翼');

    const u = utilityAt(i), ud = utilityDef(u), out = utilityOutput(i);
    if (!featureOpen('facilities')) continue;
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
    hits.add(ux, b.y, uw, b.h, () => { sel = { kind: 'utility', floor: i }; selectedEntity = { type: 'facility', floor: i }; inspectorView = 'summary'; playSfx('tab'); render(); });
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
  hits.add(x, y, w, h, () => { sel = { kind: 'slot', room, which }; selectedEntity = { type: 'room-slot', room, which }; inspectorView = 'summary'; playSfx('tab'); render(); });
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
        const buildCost = doctrineCost('facility', k.bone, k.mana);
        const can = facilityActionAvailable() && S.bone >= buildCost.bone && S.mana >= buildCost.mana;
        const active = sel.buildKind === kind;
        g.rect(340, y, 130, 21).fill(active ? C.wallLit : C.ink)
          .stroke({ width: 1, color: active ? C.gold : can ? k.color : C.wallLit, alignment: 0 });
        label(uiLayer, k.name, 344, y + 4, 10, active ? C.gold : can ? k.color : C.stoneLit);
        label(uiLayer, `${buildCost.bone}骨${buildCost.mana ? `＋${buildCost.mana}魔` : ''}`, 408, y + 4, 9, can ? C.bone : C.redDark);
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
      const buildCost = doctrineCost('facility', preview.bone, preview.mana);
      const body = utilityBuildDetail(previewKind, floor);
      const canBuild = facilityActionAvailable() && S.bone >= buildCost.bone && S.mana >= buildCost.mana;
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
    const room = sel.room, slot = sel.slot ?? 0, field = slot === 0 ? 'trap' : 'trap2';
    labelC(uiLayer, `${room + 1}房 陷阱位${slot + 1}`, 405, 46, 12, C.white);
    const list = ['none', 'spike', 'slime', 'rune', 'blade', 'net', 'mirror']            ;
    const pt = paged('side-trap', list, 4);
    let y = 62;
    for (const id of pt.view) {
      const t = TRAPS[id];
      const owned = S.traps.includes(id);
      const active = S.rooms[room][field] === id;
      const syn = synergyOf(S.rooms[room].theme, id);
      g.rect(340, y, 130, 34).fill(active ? C.wallLit : C.ink)
        .stroke({ width: 1, color: active ? C.gold : syn && owned ? C.purple : owned ? C.stoneLit : C.wall, alignment: 0 });
      label(uiLayer, cut(owned ? t.name : `${t.name}·未解锁`, 9), 344, y + 1, 12, owned ? (active ? C.white : C.bone) : C.stoneLit);
      if (syn) label(uiLayer, '共鸣', 440, y + 1, 12, C.purple);
      label(uiLayer, cut(syn ? syn.desc : t.desc, 15), 344, y + 18, 12, syn ? C.purple : C.stoneLit);
      if (owned) hits.add(340, y, 130, 34, () => {
        S.rooms[room][field] = id; persist(); playSfx('place'); say(`${room + 1}房陷阱位${slot + 1}安装${t.name}`); render();
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
      const cost = monsterUpgradeQuote(inst);
      const can = inst.xp >= need && S.bone >= cost.bone && S.mana >= cost.mana;
      button(g, uiLayer, hits, 340, 182, 130, 15, `升级 ${cost.bone}骨${cost.mana ? ` ${cost.mana}魔` : ''}`, () => upgradeMonster(inst),
        { size: 11, enabled: can, fill: C.greenDark, border: C.green, color: C.white });
    } else {
      label(uiLayer, '已达满级', 340, 170, 12, C.gold);
    }
    if (inst.lawMarks?.length) label(uiLayer, cut(`法则印记：${lawMarkSummary(inst.lawMarks)}`, 20), 340, 202, 9, C.red);
    button(g, uiLayer, hits, 340, 224, 40, 16, '详情', () => { monDetailMode = true; playSfx('tab'); render(); },
      { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });

    const gcount = (inst.graft ?? []).length;
    if (isCustomKind(inst.kind) && featureOpen('monsterCreation')) {
      button(g, uiLayer, hits, 382, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
      button(g, uiLayer, hits, 432, 224, 38, 16, '拆', () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
    } else if (featureOpen('monsterCreation')) {
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

    const lawBody = inst.lawMarks?.length ? `\n法则印记：${lawMarkSummary(inst.lawMarks)}` : '';
    const passiveBody = `${k.passiveDesc ?? k.passive ?? '无被动说明'}${lawBody}`;
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
    if (isCustomKind(inst.kind) && featureOpen('monsterCreation')) {
      button(g, uiLayer, hits, 382, 224, 38, 16, '重组', () => openStitch(inst.uid), { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
      button(g, uiLayer, hits, 422, 224, 48, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
    } else if (featureOpen('monsterCreation')) {
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

    const custom = isCustomKind(k.id);
    button(g, uiLayer, hits, 340, 176, custom ? 82 : 130, 18, `${custom ? '再缝' : rq.tutorialPrice ? '教程招募' : '招募'} ${rq.cost}骨${rq.discount ? `(-${Math.round(rq.discount * 100)}%)` : ''}`,
      () => recruit(k.id),
      { size: custom ? 10 : 11, enabled: S.bone >= rq.cost, fill: C.greenDark, border: C.green, color: C.white });
    if (custom) button(g, uiLayer, hits, 424, 176, 46, 18, customDeleteConfirm === k.id ? '确认删' : '删图纸', () => deleteCustomKind(k.id),
      { size: 9, fill: C.ink, border: C.red, color: C.red });

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

function contextualStorySnapshot(lead, sc) {
  const subjects = storyLeadSubjects(lead.source, lead.context, lead.subjects);
  const heroIds = subjects.filter((token) => token.startsWith('hero:')).map((token) => Number(token.slice(5))).filter(Number.isFinite);
  const heroes = heroIds.map(champById).filter(Boolean).map((champ) => ({
    name: champ.name, race: champKind(champ).name, level: champ.lv, title: titleOf(champ)?.name ?? '',
    personality: heroLoreOf(champ).personalityName, background: heroLoreOf(champ).backgroundName,
    traits: champ.traits.map((id) => TRAITS[id]?.name).filter(Boolean),
    battles: champ.battles, kills: champ.kills, wounds: champ.wounds ?? 0, restTurns: champ.restTurns ?? 0,
  }));
  const facilityRefs = subjects.filter((token) => token.startsWith('facility:')).map((token) => token.slice(9));
  const facilities = facilityRefs.map((ref) => {
    const floor = Number(ref.split(':')[0]), facility = utilityAt(floor);
    if (!facility || facility.kind === 'none') return null;
    return { floor: floor + 1, name: utilityDef(facility).name, level: facility.level, condition: facility.condition,
      nickname: facility.nickname ?? '', persona: facility.persona ? FACILITY_PERSONAS[facility.persona]?.name : '',
      history: (facility.history ?? []).slice(-4).map((item) => item.text ?? item) };
  }).filter(Boolean);
  const related = S.story.archive.filter((item) => storyLeadSubjects(item.source, item.context, item.subjects)
    .some((token) => subjects.includes(token))).slice(0, 6)
    .map((item) => ({ title: item.title, outcome: item.outcome, effects: item.effects, raid: item.resolvedRaid }));
  const base = {
    id: sc.id,
    who: sc.who ? fillText(sc.who, storyBridge) : '',
    text: fillText(sc.text, storyBridge),
    choices: (sc.choices ?? []).map((choice) => ({ ...choice,
      label: fillText(choice.label, storyBridge), reply: fillText(choice.reply, storyBridge) })),
  };
  return {
    lead: { source: lead.source, title: lead.title, raid: lead.raidNo, context: lead.context },
    current: { raid: S.raidNo, bone: S.bone, mana: S.mana, doctrine: doctrine().name },
    heroes, facilities, related,
    recentBattle: S.reports[0] ? { raid: S.reports[0].raidNo, title: S.reports[0].title, win: S.reports[0].win,
      summary: S.reports[0].literary?.summary ?? S.reports[0].firstCause } : null,
    base,
  };
}

async function enrichContextStory(run, lead, sc) {
  if (!aiGenerationEnabled() || lead.source === '无主传闻') return;
  run.aiState = 'pending';
  render();
  try {
    const patch = await requestContextStory(contextualStorySnapshot(lead, sc));
    if (!patch || storyRun !== run || run.pending === 'done') return;
    run.scene = { ...sc, who: patch.who, text: patch.text, choices: patch.choices };
    if (run.log[0]) {
      run.log[0].who = patch.who;
      run.log[0].text = patch.text;
    }
    run.aiState = 'done';
    render();
  } catch (error) {
    if (storyRun === run) { run.aiState = 'fallback'; render(); }
    console.warn('上下文秘闻生成失败，已保留本地事件', error);
  }
}

function openStoryLead(id) {
  const lead = S.story.leads.find((x) => x.id === id);
  let sc = lead && (lead.scene ?? sceneById(lead.sceneId));
  // 早期版本只保存 AI 无主秘闻的临时 id，刷新后无法在本地剧情表找回正文。
  // 对这类旧线索就地补成一条当前条件可用的本地秘闻，避免“处理”静默无响应。
  if (lead && !sc && lead.source === '无主传闻') {
    const pool = SCENES.filter((scene) => !scene.chained && !(scene.once && S.story.seen.includes(scene.id)) && testConds(storyBridge, scene.when));
    sc = pool[Math.floor(storyRng() * pool.length)] ?? null;
    if (sc) { lead.sceneId = sc.id; lead.title = cut(fillText(sc.text, storyBridge).replace(/\n/g, ' '), 18); persist(); }
  }
  if (!lead || !sc || (lead.dueRaid ?? 0) > S.raidNo) return false;
  storyRun = { scene: sc, log: [], pending: null, leadId: lead.id, context: { ...lead.context } };
  const run = storyRun;
  archiveSection = 'story';
  tab = 'story';
  openScene(sc, false);
  void enrichContextStory(run, lead, sc);
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
    if (S.monsters.length >= monsterCap()) return { ok: false, text: '怪物栏已满，它只能在走廊里晃' };
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
  if (S.doctrine === 'swarm') { out.monHpMult *= 0.85; out.monAtkMult *= 0.85; }
  if (S.doctrine === 'elite') { out.monHpMult *= 1.30; out.monAtkMult *= 1.30; }
  return out;
}

// 混合事件源：接了外部叙事者就先问它，拿不到（关闭/超时/JSON 坏）立刻回落本地事件池。
// 玩家永远能听到秘闻 —— LLM 只是内容来源之一，不是必需依赖。
const hybridProvider                = {
  id: 'hybrid',
  name: '地牢秘闻＋外部叙事者',
  async next(snap, pick) {
    if (loadMode() === 'http') {
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

function offlineRumorScene() {
  const variants = [
    { id: 'offline-ledger', title: '会走路的欠账', who: '骨头会计', text: '一本欠账簿从门缝里爬进来，声称自己不是催债，只是来确认你是否仍有被催的价值。',
      choices: [
        { label: '当场还账', reply: '账簿吃掉骨币，留下几粒品质可疑的魔质作为收据。', effects: [{ t: 'res', bone: -25, mana: 4 }] },
        { label: '雇它记账', reply: '它开始替地牢记账。数字更清楚了，亏损也因此显得更专业。', effects: [{ t: 'mod', mod: { id: 'ledger-discipline', name: '账簿纪律', raids: 3, monHpMult: 1.1, heroAtkMult: 1.04 } }] },
        { label: '塞回门外', reply: '门外传来纸张被勇者踩碎的声音。至少废纸还能卖钱。', effects: [{ t: 'res', bone: 20 }] },
      ] },
    { id: 'offline-inspector', title: '乡镇安全检查', who: '无证检查员', text: '一名检查员要求查看地牢的消防出口。你指出这里只有勇者入口，他在表格上勾选了“经营理念先进”。',
      choices: [
        { label: '补办手续', reply: '手续齐了，钱包薄了。怪物们第一次知道自己属于高危服务业。', effects: [{ t: 'res', bone: -20 }, { t: 'mod', mod: { id: 'safety-drill', name: '安全演练', raids: 2, monHpMult: 1.12 } }] },
        { label: '贿赂检查', reply: '检查员收下魔质，郑重宣布火灾今后不归他管。', effects: [{ t: 'res', mana: -5, bone: 28 }] },
        { label: '让他入职', reply: '他负责监督勇者遵守死亡流程，守军因此打得更有章法。', effects: [{ t: 'mod', mod: { id: 'hostile-compliance', name: '敌意合规', raids: 3, monAtkMult: 1.1, roomLimitAdd: -1 } }] },
      ] },
  ];
  return structuredClone(variants[(S.raidNo + S.story.seen.length) % variants.length]);
}

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

async function drawStoryScene(forceOffline = false) {
  if (storyBusy) return;
  if (S.story.credits <= 0) { say('暂时没有新的秘闻，打完下一波再来'); return; }
  storyBusy = true;
  render();
  try {
    const external = !forceOffline && loadMode() === 'http';
    const generated = external ? await llmScene(storySnapshot(), '') : offlineRumorScene();
    const sc = generated && external ? { ...generated, input: { prompt: '写下你打算如何处理', placeholder: '输入你的处理方式，让世界承担后果…', max: 120, ai: true, sourceScene: generated }, choices: undefined } : generated;
    if (!sc) { say('地牢今夜无事发生'); return; }
    S.story.credits -= 1;
    const id = S.story.leadNext++;
    const lead = { id, key: `random:${S.raidNo}:${sc.id}:${id}`, sceneId: sc.id, source: '无主传闻',
      context: {}, raidNo: S.raidNo, dueRaid: S.raidNo, title: sc.title || cut(fillText(sc.text, storyBridge).replace(/\n/g, ' '), 18),
      ...(sceneById(sc.id) ? {} : { scene: structuredClone(sc) }) };
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

async function submitStoryInput() {
  const run = storyRun;
  const spec = run?.scene.input;
  if (!run || !spec) return;
  const raw = (storyInput?.value ?? '').slice(0, spec.max).trim();
  if (spec.ai) {
    if (!raw) { say('至少写一句你打算怎么处理'); return; }
    if (storyBusy) return;
    storyBusy = true;
    if (storyInput) storyInput.disabled = true;
    render();
    try {
      const outcome = await requestStoryReply(storySnapshot(), spec.sourceScene ?? run.scene, raw);
      if (!outcome) { say('外部叙事者没有给出可结算的回应，请重试'); return; }
      if (storyInput) storyInput.value = '';
      resolveExit(outcome.reply, outcome.effects, null, storyRun?.scene.followup);
    } finally {
      storyBusy = false;
      if (storyInput) storyInput.disabled = false;
      render();
    }
    return;
  }
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
    if (e.key === 'Enter') {
      if (archiveSection === 'novel') submitNovelInput();
      else submitStoryInput();
    }
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
  if (screen === 'manage' && tab === 'story' && archiveSection !== 'novel' && spec && !stitch && !forge) {
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
  if (archiveSection === 'novel' && novelInputRect) {
    if (portraitNativeManage()) {
      const canvasRect = app.canvas.getBoundingClientRect(), sx = canvasRect.width / app.screen.width, sy = canvasRect.height / app.screen.height;
      storyInput.style.left = `${Math.round(canvasRect.left + novelInputRect.x * sx)}px`;
      storyInput.style.top = `${Math.round(canvasRect.top + novelInputRect.y * sy)}px`;
      storyInput.style.width = `${Math.round(novelInputRect.w * sx)}px`; storyInput.style.height = `${Math.max(38, Math.round(novelInputRect.h * sy))}px`;
      storyInput.style.fontSize = '16px'; return;
    }
    positionDomInput(storyInput, novelInputRect); return;
  }
  if (portraitNativeManage() && portraitStoryInputRect) {
    const canvasRect = app.canvas.getBoundingClientRect();
    const sx = canvasRect.width / app.screen.width, sy = canvasRect.height / app.screen.height;
    storyInput.style.left = `${Math.round(canvasRect.left + portraitStoryInputRect.x * sx)}px`;
    storyInput.style.top = `${Math.round(canvasRect.top + portraitStoryInputRect.y * sy)}px`;
    storyInput.style.width = `${Math.round(portraitStoryInputRect.w * sx)}px`;
    storyInput.style.height = `${Math.max(42, Math.round(portraitStoryInputRect.h * sy))}px`;
    storyInput.style.fontSize = '16px';
    return;
  }
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
  archiveSection = 'chronicle';
  portraitStoryView = 'archive';
  tab = 'story';
  playSfx('tab');
  render();
  if (portrait) scheduleLayout();
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

function guideTargetRect(target) {
  const tabs = visibleZones();
  const targetZone = PAGE_ZONE[target] ?? target;
  const tabIndex = tabs.findIndex((item) => item.id === targetZone);
  if (tabIndex >= 0) return { x: tabIndex * (VIEW_W / tabs.length), y: 238, w: VIEW_W / tabs.length, h: 32 };
  if (target === 'zoneNav') return { x: 0, y: 238, w: VIEW_W, h: 32 };
  if (target === 'taskCenter') return { x: 6, y: 134, w: 310, h: 96 };
  if (target === 'inspector') return { x: 318, y: 38, w: 158, h: 196 };
  if (target === 'encyclopedia') return { x: 338, y: 202, w: 128, h: 24 };
  if (target === 'mobRecruit') return { x: 338, y: 174, w: 134, h: 22 };
  if (target === 'frontSlot') return { x: 125, y: 85, w: 44, h: 27 };
  if (target === 'backSlot') return { x: 37, y: 85, w: 44, h: 27 };
  if (target === 'battle') return { x: 342, y: 179, w: 126, h: 34 };
  if (target === 'raidPanel') return { x: 6, y: 58, w: 324, h: 100 };
  if (target === 'reportPanel') return { x: 4, y: 38, w: 324, h: 196 };
  if (target === 'dungeonTools') return { x: 134, y: 68, w: 82, h: 20 };
  if (target === 'mobRoster') return { x: 4, y: 54, w: 156, h: 136 };
  if (target === 'heroRecruitTab') return { x: 86, y: 36, w: 82, h: 20 };
  if (target === 'heroRoster') return { x: 164, y: 56, w: 314, h: 180 };
  if (target === 'heroTraits') return { x: 354, y: 58, w: 34, h: 18 };
  if (target === 'heroStat') return { x: 324, y: 58, w: 34, h: 18 };
  if (target === 'heroTalent') return { x: 384, y: 58, w: 34, h: 18 };
  if (target === 'heroGear') return { x: featureOpen('heroTalent') ? 414 : 384, y: 58, w: 34, h: 18 };
  if (target === 'heroTitle') return { x: featureOpen('heroTalent') ? 444 : 414, y: 58, w: 34, h: 18 };
  if (target === 'heroGraft') return { x: 244, y: 212, w: 104, h: 19 };
  if (target === 'heroRest') return { x: 172, y: 108, w: 188, h: 104 };
  if (target === 'heroLore') return { x: 316, y: 146, w: 148, h: 76 };
  if (target === 'heroForce') return (champById(heroSel)?.restTurns || 0) > 0
    ? { x: 344, y: 208, w: 120, h: 25 } : { x: 170, y: 104, w: 194, h: 110 };
  if (target === 'leaderSlot') return { x: 81, y: 85, w: 44, h: 27 };
  if (target === 'facilityArea') return { x: 226, y: 68, w: 102, h: 48 };
  if (target === 'shopArea') return { x: 4, y: 38, w: 324, h: 148 };
  if (target === 'workshopResearch') return { x: 4, y: 164, w: 164, h: 26 };
  if (target === 'diyWorkshop') return { x: 210, y: 184, w: 120, h: 30 };
  if (target === 'aiWorkshop') return { x: 4, y: 186, w: 326, h: 50 };
  if (target === 'settings') return { x: 404, y: 2, w: 38, h: 30 };
  if (target === 'monsterCreation') return { x: 4, y: 206, w: 156, h: 20 };
  if (target === 'storyArea') return { x: 4, y: 38, w: 324, h: 190 };
  return null;
}

function drawProgressGuide() {
  const guide = roundGuide();
  guideLayer.visible = !!guide;
  if (!guide) return;
  const [target, message, acknowledge] = guide;
  const rect = guideTargetRect(target);
  const pulse = new PIXI.Graphics();
  if (rect) {
    pulse.roundRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4, 3)
      .stroke({ width: 2, color: C.gold, alignment: 0 });
    pulse.roundRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10, 5)
      .stroke({ width: 1, color: C.white, alignment: 0 });
  }
  guideLayer.addChild(pulse);
  guidePulseNodes.push(pulse);

  const plate = new PIXI.Graphics();
  plate.roundRect(20, 36, 440, acknowledge ? 48 : 24, 4).fill(C.ink).stroke({ width: 2, color: C.gold, alignment: 0 });
  guideLayer.addChild(plate);
  const touring = uiShellTourStep < 4;
  boundedText(guideLayer, `◆ ${message}`, 28, acknowledge ? 40 : 41, acknowledge ? (touring ? 292 : 350) : 424, acknowledge ? 40 : 17, acknowledge ? 9 : 11, C.white);
  if (acknowledge) {
    if (touring) {
      plate.roundRect(326, 49, 54, 24, 3).fill(C.wall).stroke({ width: 1, color: C.stoneLit, alignment: 0 });
      const skip = txt('跳过导览', 9, C.stoneLit); skip.x = 333; skip.y = 56; guideLayer.addChild(skip);
      hits.add(326, 49, 54, 24, skipUiShellTour);
    }
    plate.roundRect(386, 49, 66, 24, 3).fill(C.goldDark).stroke({ width: 1, color: C.gold, alignment: 0 });
    const ok = txt('明白，继续', 10, C.white);
    ok.x = 394; ok.y = 56; guideLayer.addChild(ok);
    hits.add(386, 49, 66, 24, acknowledgeRoundGuide);
  }
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
    if (at >= 0) { reportIdx = at; archiveSection = 'report'; tab = 'report'; storyView = 'dashboard'; playSfx('tab'); render(); }
  }, { size: 9, border: C.gold, color: C.gold });
}

function novelGameSnapshot() {
  const chem = chemistry(S.champs, seatedChampUids()).map;
  return {
    playerName: S.playerName, lairName: S.lairName, chapter: S.novel.chapter, raid: S.otRaid,
    resources: { bone: S.bone, mana: S.mana, relic: S.relic }, doctrine: doctrine().name,
    dungeon: S.floors.map((floor, i) => ({ floor: i + 1, theme: floor.battle.theme, trap: floor.battle.trap,
      facility: utilityDef(floor.utility).name, facilityLevel: floor.utility.level, condition: floor.utility.condition,
      defenders: [['front', floor.battle.front], ['back', floor.battle.back], ['flank', floor.battle.flank]].map(([row, uid]) => {
        const inst = instById(uid); return inst ? { row, name: instKind(inst).name, level: inst.lv } : null;
      }).filter(Boolean), leader: champById(floor.battle.leader)?.name ?? null })),
    monsters: S.monsters.map((inst) => { const kind = instKind(inst); return { key: `monster:${inst.uid}`, name: kind.name, level: inst.lv,
      deployedFloor: S.rooms.findIndex((room) => [room.front, room.back, room.flank].includes(inst.uid)) + 1,
      hp: kind.hp, atk: kind.atk, def: kind.def, speed: kind.spd, skill: kind.skill, passive: kind.passive ?? '' }; }),
    heroes: S.champs.map((champ) => { const stat = statOf(champ, chem); return { key: `hero:${champ.uid}`, name: champ.name, race: champ.race,
      level: champ.lv, hp: stat.hp, atk: stat.atk, def: stat.def, speed: stat.spd, traits: champ.traits, talents: champ.talents,
      gear: champ.gear, title: titleOf(champ)?.name ?? '', restTurns: champ.restTurns ?? 0, wounds: champ.wounds ?? 0,
      personality: champ.aiLore?.personality ?? champ.personality ?? '', background: champ.aiLore?.background ?? champ.background ?? '' }; }),
    recentReports: S.reports.slice(0, 3).map((report) => ({ raid: report.raidNo, title: report.title, win: report.win,
      time: Math.round(report.time), breaches: report.rooms.filter((room) => room.broken).length, summary: report.literary?.summary ?? report.firstCause })),
  };
}

function novelRequestSnapshot() { return { game: novelGameSnapshot(), history: recentNovelContext(S.novel) }; }

function novelMissionSnapshot() {
  const batch = Math.max(1, S.otRaid - NORMAL_RAID_COUNT), game = novelGameSnapshot();
  return {
    ...novelRequestSnapshot(), batch, no: S.otRaid, minLevel: 18 + batch * 2, maxLevel: 21 + batch * 2,
    floors: S.floors.length,
    facilityFloors: S.floors.map((floor, index) => floor.utility.kind !== 'none' && floor.utility.condition > 0 ? index : null).filter((x) => x != null),
    defenders: [...S.monsters.map((inst) => ({ key: `monster:${inst.uid}`, name: instKind(inst).name })),
      ...S.champs.map((champ) => ({ key: `hero:${champ.uid}`, name: champ.name }))],
    allowedClasses: ['knight','archer','cleric','mage','rogue','paladin','berserker','ranger','bard','alchemist','monk','lancer','warlock','captain','inquisitor','swordmaster'],
    allowedAffixes: ['haste', 'holywater', 'shield', 'brave'],
    objectives: ['win', 'protectFacility', 'breachLimit', 'protectUnit', 'timeLimit'],
    baseReward: makeOvertimeRaid(S.otRaid).reward, game,
  };
}

async function refreshNovelSummary() {
  const old = S.novel.entries.filter((entry) => entry.chapter > (S.novel.summarizedThrough ?? 0) && entry.chapter < S.novel.chapter - 2);
  if (!old.length) return;
  try {
    const result = sanitizeNovelSummary(await requestNovelSummary({ summary: S.novel.summary, facts: S.novel.facts,
      entries: old.slice(-36).map((entry) => ({ chapter: entry.chapter, role: entry.role, text: entry.text })) }));
    if (!result) return;
    S.novel.summary = result.summary; S.novel.facts = mergeNovelFacts(S.novel.facts, result.facts);
    S.novel.summarizedThrough = old.reduce((max, entry) => Math.max(max, entry.chapter), S.novel.summarizedThrough ?? 0); persist();
  } catch (error) { console.warn('小说旧章摘要失败，保留原文', error); }
}

async function runNovelTurn(action = '') {
  if (novelBusy || !novelAvailable()) return;
  if (action && S.novel.dailyTurns >= 3) { say('本章日常已经结束，只能签发新任务'); return; }
  const resolving = !action && S.novel.phase === 'resolution';
  novelBusy = true; S.novel.error = ''; S.novel.draft = action;
  if (resolving) S.novel.pendingMission = null;
  persist(); render();
  try {
    const result = sanitizeNovelTurn(await requestNovelTurn(novelRequestSnapshot(), action));
    if (!result) { S.novel.error = '叙事者没有返回完整正文与三个选项，请重试。'; say(S.novel.error); return; }
    if (action) { appendNovelEntry(S.novel, 'player', action); S.novel.dailyTurns = Math.min(3, S.novel.dailyTurns + 1); }
    appendNovelEntry(S.novel, 'narrator', result.body);
    S.novel.facts = mergeNovelFacts(S.novel.facts, result.facts); S.novel.choices = result.choices;
    S.novel.phase = 'daily'; S.novel.draft = ''; S.novel.error = ''; persist(); playSfx('tab');
    if (S.novel.chapter > 3) void refreshNovelSummary();
  } catch (error) {
    if (resolving) S.novel.phase = 'resolution';
    S.novel.error = `叙事者暂时失联：${String(error?.message ?? error).slice(0, 80)}`; say(S.novel.error);
  } finally { novelBusy = false; render(); }
}

function enableNovelCampaign() {
  if (!novelAvailable() || S.novel.enabled) return;
  if (!novelEnableConfirm) { novelEnableConfirm = true; say('再次点击确认：小说战役将接管当前加班档的所有后续迎战'); render(); return; }
  novelEnableConfirm = false; S.novel = { ...freshNovelState(), enabled: true, phase: 'idle' }; persist();
  void runNovelTurn();
}

async function issueNovelMission() {
  if (novelBusy || !S.novel.enabled || !novelAvailable()) return;
  novelBusy = true; S.novel.phase = 'mission'; S.novel.error = ''; persist(); render();
  try {
    const snap = novelMissionSnapshot();
    const mission = sanitizeNovelMission(await requestNovelMission(snap), snap);
    if (!mission) { S.novel.phase = 'daily'; S.novel.error = '任务公文不完整或越过数值边界，请重新签发。'; say(S.novel.error); return; }
    S.novel.pendingMission = mission; S.novel.phase = 'ready'; S.novel.choices = [];
    appendNovelEntry(S.novel, 'narrator', `【任务签发：${mission.title}】\n${mission.body}\n\n任务目标：${mission.objectiveText}`);
    persist(); playSfx('buy'); setTab('throne'); selectedEntity = null; say(`任务已签发：${mission.objectiveText}`);
  } catch (error) {
    S.novel.phase = 'daily'; S.novel.error = `签发失败：${String(error?.message ?? error).slice(0, 80)}`; say(S.novel.error);
  } finally { novelBusy = false; render(); }
}

function novelDecisionActionable() {
  const n = S.novel, latest = Math.max(0, n.entries.length - 1);
  return !!n.enabled && n.page >= latest && n.phase === 'daily' && n.dailyTurns < 3 && !novelBusy && !n.pendingMission;
}

function closeNovelDecisionCard(saveDraft = true, redraw = false) {
  if (!novelDecisionRoot) return;
  if (saveDraft && novelDecisionRoot.dataset.mode === 'input') {
    const area = novelDecisionRoot.querySelector('textarea');
    if (area) { S.novel.draft = area.value.slice(0, 500); persist(); }
  }
  novelDecisionRoot.remove();
  novelDecisionRoot = null;
  if (redraw) render();
}

function createNovelDecisionCard(mode, text = '') {
  if (!novelDecisionActionable()) { say('当前章节不能继续提交内容'); return null; }
  closeNovelDecisionCard(true, false);
  if (storyInput) storyInput.style.display = 'none';
  const rootNode = document.createElement('div');
  rootNode.id = 'novel-decision-card'; rootNode.dataset.mode = mode;
  rootNode.style.cssText = 'position:fixed;inset:0;z-index:108;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(3,2,8,.9);font-family:monospace;color:#eadcae';
  const card = document.createElement('div');
  card.className = 'novel-decision-card-inner';
  card.style.cssText = 'width:min(600px,96vw);max-height:calc(100vh - 28px);overflow:auto;box-sizing:border-box;padding:18px;border:3px solid #8f6fc4;background:#191423;box-shadow:0 0 0 3px #21172d,0 16px 52px #000';
  const css = document.createElement('style');
  css.textContent = '#novel-decision-card button,#novel-decision-card textarea{box-sizing:border-box;border:1px solid #76698a;border-radius:0;background:#272033;color:#f1e5bd;font:14px monospace;padding:9px;outline:none}#novel-decision-card button{min-height:44px;cursor:pointer}#novel-decision-card textarea{display:block;width:100%;min-height:min(42vh,300px);resize:vertical;line-height:1.65;user-select:text;-webkit-user-select:text}#novel-decision-card button:focus,#novel-decision-card textarea:focus{border-color:#e2bd64;box-shadow:0 0 0 1px #e2bd64}';
  rootNode.append(css, card); document.body.appendChild(rootNode); novelDecisionRoot = rootNode;
  return { rootNode, card };
}

function openNovelChoiceCard(choice) {
  const value = String(choice ?? '').trim();
  if (!value) return false;
  const shell = createNovelDecisionCard('choice', value);
  if (!shell) return false;
  shell.card.innerHTML = `<div style="font-size:12px;color:#918aa0">小说战役 · 完整选项</div>
    <div style="font-size:20px;color:#e2bd64;margin:7px 0 12px">确认你的行动</div>
    <div data-choice-text style="max-height:48vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border:1px solid #55466d;background:#100d17;font-size:15px;line-height:1.75;color:#f1e5bd"></div>
    <div style="margin-top:10px;font-size:12px;line-height:1.5;color:#918aa0">点击确认后才会把这段完整文本写入历史并发送给叙事者。</div>
    <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:16px"><button data-novel-card="cancel">返回修改</button><button data-novel-card="confirm" style="border-color:#e2bd64;background:#59451f">采用这个选项</button></div>`;
  shell.card.querySelector('[data-choice-text]').textContent = value;
  shell.card.querySelector('[data-novel-card="cancel"]').onclick = () => closeNovelDecisionCard(false, true);
  shell.card.querySelector('[data-novel-card="confirm"]').onclick = () => { closeNovelDecisionCard(false, false); submitNovelInput(value); };
  shell.rootNode.onclick = (event) => { if (event.target === shell.rootNode) closeNovelDecisionCard(false, true); };
  shell.rootNode.onkeydown = (event) => { event.stopPropagation(); if (event.key === 'Escape') closeNovelDecisionCard(false, true); };
  shell.card.querySelector('[data-novel-card="confirm"]').focus();
  return true;
}

function openNovelInputCard() {
  const shell = createNovelDecisionCard('input');
  if (!shell) return false;
  shell.card.innerHTML = `<div style="font-size:12px;color:#918aa0">小说战役 · 自由输入</div>
    <div style="font-size:20px;color:#e2bd64;margin:7px 0 12px">写下完整行动</div>
    <textarea maxlength="500" spellcheck="false" placeholder="写下你的行动、回答或命令……"></textarea>
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:7px;font-size:12px;color:#918aa0"><span data-input-status>关闭卡片也会保留草稿</span><span data-input-count>0/500</span></div>
    <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:14px"><button data-novel-card="cancel">保存草稿并返回</button><button data-novel-card="confirm" style="border-color:#8f6fc4;background:#3d2855">发送给叙事者</button></div>`;
  const area = shell.card.querySelector('textarea'), count = shell.card.querySelector('[data-input-count]'), status = shell.card.querySelector('[data-input-status]');
  area.value = String(S.novel.draft ?? '').slice(0, 500);
  const updateCount = () => { count.textContent = `${area.value.length}/500`; S.novel.draft = area.value.slice(0, 500); };
  area.oninput = updateCount; updateCount();
  shell.card.querySelector('[data-novel-card="cancel"]').onclick = () => closeNovelDecisionCard(true, true);
  shell.card.querySelector('[data-novel-card="confirm"]').onclick = () => {
    const value = area.value.trim().slice(0, 500);
    if (!value) { status.textContent = '至少写下一句行动或回答'; status.style.color = '#ed6b6b'; area.focus(); return; }
    S.novel.draft = value; persist(); closeNovelDecisionCard(false, false); submitNovelInput(value);
  };
  shell.rootNode.onclick = (event) => { if (event.target === shell.rootNode) closeNovelDecisionCard(true, true); };
  shell.rootNode.onkeydown = (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') closeNovelDecisionCard(true, true);
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') shell.card.querySelector('[data-novel-card="confirm"]').click();
  };
  area.focus(); area.setSelectionRange(area.value.length, area.value.length);
  return true;
}

function submitNovelInput(value = null) {
  const raw = String(value ?? S.novel.draft ?? storyInput?.value ?? '').trim().slice(0, 500);
  if (!raw) { say('至少写下一句行动或回答'); return; }
  S.novel.draft = raw; persist(); void runNovelTurn(raw);
}

function pageNovel(g) {
  const n = S.novel;
  button(g, uiLayer, hits, 380, 40, 82, 18, '提示词编排', openNovelPromptManager, { size: 9, border: C.purple, color: C.purple });
  if (!n.enabled) {
    panelF(g, uiLayer, 'scroll', 22, 56, 436, 154, 0xE7D7A1);
    labelC(uiLayer, '小说战役', 240, 70, 17, C.ink);
    boundedText(uiLayer, '开启后，叙事者会把这座地牢的英雄、魔物、设施和战绩写成长篇互动故事。每章最多三次日常对话，随后必须签发一场真实入侵；战果会成为下一章无法涂改的事实。\n\n本模式将接管当前加班档，断开API时无法迎战。', 42, 100, 396, 88, 11, C.ink);
    button(g, uiLayer, hits, 132, 214, 216, 20, novelEnableConfirm ? '确认开启并接管加班档' : '开启小说战役', enableNovelCampaign,
      { size: 11, fill: novelEnableConfirm ? C.redDark : C.purpleDark, border: novelEnableConfirm ? C.red : C.purple, color: C.white });
    return;
  }
  const entries = n.entries, latest = Math.max(0, entries.length - 1); n.page = Math.max(0, Math.min(latest, n.page));
  const entry = entries[n.page];
  panelF(g, uiLayer, 'scroll', 8, 56, 304, 142, 0xE7D7A1);
  label(uiLayer, `第${entry?.chapter ?? n.chapter}章 · 第${n.page + 1}/${Math.max(1, entries.length)}页`, 18, 42, 10, C.gold);
  if (entry) {
    label(uiLayer, entry.role === 'player' ? `【${S.playerName}】` : entry.role === 'battle' ? '【战斗记录】' : '【地牢叙事者】', 20, 66, 10,
      entry.role === 'player' ? C.purple : entry.role === 'battle' ? C.redDark : C.ink);
    const textPages = paginateText(entry.text, 280, 86, 10), key = `novel-desktop-${entry.id}`;
    const subPage = Math.max(0, Math.min(textPages.length - 1, Math.round(pageState[key] || 0))); pageState[key] = subPage;
    boundedText(uiLayer, textPages[subPage] ?? '', 20, 82, 280, 86, 10, C.ink);
    pager(g, key, textPages.length, 96, 179, 128, '段 ');
  } else labelC(uiLayer, novelBusy ? '叙事者正在翻开第一章…' : '等待第一章', 160, 118, 11, C.ink);
  button(g, uiLayer, hits, 16, 202, 42, 20, '◀', () => { n.page = Math.max(0, n.page - 1); render(); }, { enabled: n.page > 0, size: 12 });
  button(g, uiLayer, hits, 264, 202, 42, 20, '▶', () => { n.page = Math.min(latest, n.page + 1); render(); }, { enabled: n.page < latest, size: 12 });
  if (n.page < latest) button(g, uiLayer, hits, 92, 202, 138, 20, '返回最新页', () => { n.page = latest; render(); }, { size: 10, border: C.gold, color: C.gold });
  panelF(g, uiLayer, 'stone', 318, 38, 158, 196, C.wall);
  label(uiLayer, `第${n.chapter}章 · 日常${n.dailyTurns}/3`, 328, 46, 11, C.gold);
  const actionable = n.page >= latest && n.phase === 'daily' && n.dailyTurns < 3 && !novelBusy && !n.pendingMission;
  if (n.pendingMission && !n.pendingMission.resolved) {
    label(uiLayer, cut(n.pendingMission.title, 14), 328, 68, 11, C.red);
    boundedText(uiLayer, `目标：${n.pendingMission.objectiveText}\n奖励倍率：×${n.pendingMission.rewardMult.toFixed(2)}`, 328, 88, 138, 52, 10, C.bone);
    button(g, uiLayer, hits, 328, 172, 138, 26, '前往王座备战', () => setTab('throne'), { size: 11, fill: C.greenDark, border: C.green, color: C.white });
  } else if (n.page < latest) boundedText(uiLayer, '正在翻阅已经发生的内容。历史不可编辑；回溯请读取手动快照。', 328, 74, 138, 70, 10, C.stoneLit);
  else {
    n.choices.slice(0, 3).forEach((choice, i) => button(g, uiLayer, hits, 328, 66 + i * 28, 138, 24, `${i + 1}. ${cut(choice, 14)} ›`, () => openNovelChoiceCard(choice),
      { size: 9, enabled: actionable, fill: C.wallLit, border: C.purple, color: C.white }));
    if (actionable) {
      novelInputRect = null;
      button(g, uiLayer, hits, 328, 152, 138, 24, n.draft ? `✎ ${cut(n.draft, 14)}` : '✎ 打开自由输入', openNovelInputCard,
        { size: 9, fill: C.purpleDark, border: C.purple, color: C.white });
    } else novelInputRect = null;
    if (novelBusy) label(uiLayer, n.phase === 'mission' ? '正在签发任务…' : '叙事者正在写…', 328, 154, 10, C.purple);
    if (n.error) boundedText(uiLayer, n.error, 328, 178, 138, 22, 9, C.red);
    button(g, uiLayer, hits, 328, 202, 138, 24, n.dailyTurns >= 3 ? '必须签发新任务' : '签发新任务', () => void issueNovelMission(),
      { size: 10, enabled: !novelBusy && n.entries.length > 0, fill: C.redDark, border: C.red, color: C.white });
  }
}

function pageStory(g               ) {
  if (archiveSection === 'novel') { pageNovel(g); return; }
  if (!storyRun) {
    if (storyView === 'chronicle') { drawChronicle(g); return; }
    label(uiLayer, '秘闻线索', 10, 42, 12, C.white);
    const readyLeads = availableStoryLeads();
    const dormant = S.story.leads.length - readyLeads.length;
    label(uiLayer, `待处理${readyLeads.length}${dormant ? `・酝酿${dormant}` : ''}`, 224, 42, 10, C.stoneLit);
    panelF(g, uiLayer, 'inset', 8, 58, 306, 176, C.ink);
    const pl = paged('story-leads', readyLeads, 5);
    let vy = 66;
    if (!readyLeads.length) label(uiLayer, dormant ? '后续正在酝酿，完成袭击后再来' : '暂无线索；经营与战斗会留下痕迹', 18, vy, 10, C.wall);
    for (const lead of pl.view) {
      const active = selectedEntity?.type === 'story' && selectedEntity.id === lead.id;
      g.rect(14, vy, 294, 28).fill(active ? C.wallLit : C.wall).stroke({ width: 1, color: active ? C.gold : C.purple, alignment: 0 });
      label(uiLayer, `${lead.source}・${cut(lead.title, 16)}`, 20, vy + 4, 11, active ? C.white : C.bone);
      label(uiLayer, `第${lead.raidNo}轮`, 255, vy + 4, 9, C.stoneLit);
      hits.add(14, vy, 294, 28, () => { selectedEntity = { type: 'story', id: lead.id }; inspectorView = 'summary'; playSfx('tab'); render(); });
      vy += 31;
    }
    pager(g, 'story-leads', pl.pages, 14, 214, 120);
    panelF(g, uiLayer, 'stone', 318, 38, 158, 196, C.wall);
    label(uiLayer, '上下文检查器', 328, 45, 11, C.gold);
    const selectedLead = selectedEntity?.type === 'story' ? readyLeads.find((lead) => lead.id === selectedEntity.id) : null;
    if (selectedLead) {
      label(uiLayer, cut(selectedLead.title, 16), 328, 65, 12, C.purple);
      label(uiLayer, `${selectedLead.source}・第${selectedLead.raidNo}轮`, 328, 84, 9, C.stoneLit);
      boundedText(uiLayer, selectedLead.summary ?? selectedLead.title, 328, 101, 138, 62, 10, C.bone, { maxLines: uiDensity === 'expert' ? 5 : 4 });
      button(g, uiLayer, hits, 328, 170, 138, 24, '处理这条线索', () => openStoryLead(selectedLead.id), { size: 11, fill: C.purpleDark, border: C.purple, color: C.white });
      button(g, uiLayer, hits, 328, 200, 138, 24, '完整说明', () => openDetailPopup(selectedLead.title, `来源：${selectedLead.source}\n产生于第${selectedLead.raidNo}轮\n\n${selectedLead.summary ?? '选择后将明确显示实际影响。'}`, C.purple), { size: 11, border: C.gold, color: C.gold });
    } else {
      label(uiLayer, `待处理 ${readyLeads.length}`, 328, 65, 12, C.purple);
      label(uiLayer, `永久档案 ${S.story.archive.length}`, 328, 84, 10, C.bone);
      label(uiLayer, `战场变化 ${S.story.mods.length}`, 328, 101, 10, C.gold);
      boundedText(uiLayer, readyLeads.length ? '从左侧选择一条线索，查看来源后再决定是否处理。' : '经营与战斗会产生带对象和结果的线索。', 328, 122, 138, 50, 10, C.stoneLit);
    }
    const can = S.story.credits > 0;
    if (!selectedLead) button(g, uiLayer, hits, 328, 180, 138, 22, storyBusy ? '正在追查…' : can ? `追查无主传闻 ${S.story.credits}` : '暂无次数・说明', () => {
      if (can) void drawStoryScene();
      else openDetailPopup('暂无无主秘闻', '当前可追查次数为 0。\n\n每场袭击结束后都会补充：守住地牢 +2 次，失守 +1 次。英雄、设施和战报产生的具体线索不消耗次数。', C.purple);
    }, { enabled: !storyBusy, fill: can ? C.purpleDark : C.ink, border: can ? C.purple : C.stoneLit, color: can ? C.white : C.stoneLit });
    if (!selectedLead) button(g, uiLayer, hits, 328, 206, 138, 18, '前往编年史', () => setArchiveSection('chronicle'), { size: 10, border: C.gold, color: C.gold });
    return;
  }

  const run = storyRun;
  label(uiLayer, cut(run.scene?.title ?? '地牢秘闻', 18), 20, 42, 12, C.gold);
  if (run.aiState === 'pending') label(uiLayer, 'AI 正在结合角色与旧档案润色…', 226, 42, 10, C.purple);
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
  if ((c.restTurns || 0) > 0 && !heroForcedThisRaid(c)) { say(`${c.name}仍需休息；先在英雄档案支付强制驱使费用`); return; }
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
  syncTutorialProgress();
  if (S.raidNo === 1 && room === 0 && which === 'front' && !tutorialDeploymentReady()) {
    sel = { kind: 'slot', room: 0, which: 'back' };
  }
  persist();
  render();
}

function recruit(kindId        ) {
  const k = monKind(kindId);
  const quote = recruitQuote(k);
  if (S.bone < quote.cost) { say('骨币不足'); return; }
  if (S.monsters.length >= monsterCap()) { say(`怪物栏已满（${monsterCap()}）`); return; }
  S.bone -= quote.cost;
  consumeHatcheryCharge(quote);
  const inst              = { uid: S.uidNext++, kind: k.id, lv: 1, xp: 0 };
  S.monsters.push(inst);
  syncTutorialProgress();
  sel = S.raidNo === 1 && tutorialData().step === 2
    ? { kind: 'monkind', id: 'archer' }
    : { kind: 'inst', uid: inst.uid };
  playSfx('buy');
  persist();
  say(`招募了${k.name}${quote.tutorialPrice ? '，采用首轮教程保护价' : quote.discount ? `，孵化室节省${k.cost - quote.cost}骨币` : ''}`);
  render();
}

const countPlaced = () => S.rooms.reduce((n, r) =>
  n + (r.front != null ? 1 : 0) + (r.back != null ? 1 : 0) + (r.flank != null ? 1 : 0), 0)
  + S.rooms.filter((r) => r.leader != null).length;
let mobPage = 0;

// ---------- 英雄（麾下统领的具体个体：征召、培养、专精、疲劳轮换） ----------
const heroHasNew = () => S.champs.some((c) => canLevel(c) && S.bone >= heroUpgradeBone(c) && S.mana >= heroUpgradeMana(c)) || S.champs.some((c) => pendingTier(c) > 0);

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
const candCostOf = (c      ) => doctrineCost('recruit', Math.round((monKind(c.race).cost) * (1 + c.potential * 0.18))).bone;

function levelChamp(c       ) {
  if (!canLevel(c)) return;
  const cost = heroUpgradeBone(c), mana = heroUpgradeMana(c);
  if (S.bone < cost || S.mana < mana) { say('英雄升级资源不足'); return; }
  S.bone -= cost; S.mana -= mana;
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
  if (portrait) scheduleLayout();
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
    if (canLevel(c) && S.bone >= heroUpgradeBone(c) && S.mana >= heroUpgradeMana(c)) g.circle(151, y + 6, 3).fill(C.red);
    else if (pendingTier(c)) g.circle(151, y + 6, 3).fill(C.purple);
    for (let w = 0; w < (c.wounds || 0); w++) g.rect(140 + w * 5, y + 18, 4, 3).fill(C.red);
    hits.add(8, y, 150, 26, () => { heroSel = c.uid; selectedEntity = { type: 'hero', uid: c.uid }; inspectorView = 'summary'; playSfx('tab'); render(); });
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
  if (e.thorns) out.push(`反伤${Math.round(effectiveThorns(e.thorns) * 100)}%${e.thorns > 0.4 ? '（软上限）' : ''}`);
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
  if (e.thorns)        out.push(`反伤 ${Math.round(effectiveThorns(e.thorns) * 100)}%${e.thorns > 0.4 ? '（递减）' : ''}`);
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
  const lawTag = c.lawMarks?.length ? `・法则${c.lawMarks.length}` : '';
  label(uiLayer, cut(`${c.battles}战${c.kills}杀${nt ? `→${nt.t.name}` : '・满'}${lawTag}`, 18), 174, 160, 12, c.lawMarks?.length ? C.red : C.stoneLit);

  if (c.lv < CHAMP_LV_CAP) {
    const need = xpNeed(c.lv);
    label(uiLayer, `经验 ${c.xp}/${need}`, 174, 176, 12, C.bone);
    bar(uiGfx, 262, 180, 88, 5, Math.min(1, c.xp / need), C.green);
    const cost = heroUpgradeBone(c), mana = heroUpgradeMana(c);
    button(g, uiLayer, hits, 362, 176, 106, 15, `升级 ${cost}骨${mana ? ` ${mana}魔` : ''}`, () => levelChamp(c),
      { size: 10, enabled: canLevel(c) && S.bone >= cost && S.mana >= mana, fill: C.greenDark, border: C.green, color: C.white });
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
  if (featureOpen('heroGraft')) button(g, uiLayer, hits, 246, 214, 100, 15, (c.graft ?? []).length ? `全身改造 ${(c.graft ?? []).length}/4` : '全身改造', () => openGraft(c.uid, 'hero'),
    { size: 10, border: (c.graft ?? []).length ? C.gold : C.purple, color: (c.graft ?? []).length ? C.gold : C.white });
  button(g, uiLayer, hits, 348, 214, 112, 15,
    c.restTurns ? heroForcedThisRaid(c) ? '本场已强制征召' : heroForceConfirmUid === c.uid ? '确认强制驱使' : `强驱${FORCE_HERO_BONE}骨${FORCE_HERO_MANA}魔` : '遣退英雄',
    () => c.restTurns ? forceRestingHero(c) : dismissChamp(c),
    { size: 9, enabled: !c.restTurns || (!heroForcedThisRaid(c) && S.bone >= FORCE_HERO_BONE && S.mana >= FORCE_HERO_MANA), border: C.red, color: C.red });
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
  label(uiLayer, `受伤 ${Math.round(effectiveMitigationMultiplier(st.dmgTakenMult) * 100)}%`, 250, 96, 12, C.bone);
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
  const lore = heroLoreOf(c);
  const loreY = Math.min(Math.max(my + 4, 150), 174);
  label(uiLayer, '英雄档案', 320, loreY, 12, C.gold);
  button(g, uiLayer, hits, 406, loreY - 2, 54, 15, heroLoreBusyUid === c.uid ? '重构中…' : lore.via ? 'AI再优化' : 'AI优化',
    () => void optimizeHeroLore(c), { size: 9, enabled: hasBackend() && heroLoreBusyUid == null, fill: C.purpleDark, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 320, loreY + 15, 140, 16, `性格・${lore.personalityName}`,
    () => openDetailPopup(`性格・${lore.personalityName}`, lore.personalityDesc, C.purple),
    { size: 11, fill: C.ink, border: C.purpleDark, color: C.purple });
  button(g, uiLayer, hits, 320, loreY + 34, 140, 16, `背景・${lore.backgroundName}`,
    () => openDetailPopup(`背景故事・${lore.backgroundName}`, lore.backgroundStory, C.gold),
    { size: 11, fill: C.ink, border: C.goldDark, color: C.gold });
}

function drawChampDetail(g, c) {
  panelF(g, uiLayer, 'gold', 166, 58, 310, 176, C.wall);
  const pend = pendingTier(c);
  if (pend && heroView === 'stat' && featureOpen('heroTalent')) heroView = 'talent';
  if (heroView === 'talent' && !featureOpen('heroTalent')) heroView = 'stat';
  const vaultDot = S.vault.length > 0;
  const tabs = [['stat', '状态'], ['info', '详情']];
  if (featureOpen('heroTalent')) tabs.push(['talent', pend ? '专精●' : '专精']);
  tabs.push(['gear', vaultDot ? '装备●' : '装备'], ['title', '称号']);
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
  if (featureOpen('equipmentForge')) button(g, uiLayer, hits, 274, 214, 50, 15, '锻造台', () => openSmith(),
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
  const guidedKinds = firstRaidRecruitKinds();
  const kinds = guidedKinds ? guidedKinds.map((id) => monKind(id)) : allKinds().filter(recruitKindOpen);
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
    label(uiLayer, open ? `${rq.cost}骨${rq.tutorialPrice ? '◆' : rq.discount ? '↓' : ''}` : `第${k.eliteMin}轮`, 92, y + 4, 12,
      !open ? C.stoneLit : S.bone >= rq.cost ? C.gold : C.redDark);
    label(uiLayer, k.row === 'front' ? '前' : k.row === 'back' ? '后' : '任', 142, y + 4, 12, C.stoneLit);
    hits.add(6, y, 152, 20, () => { if (customDeleteConfirm !== k.id) customDeleteConfirm = ''; sel = { kind: 'monkind', id: k.id }; selectedEntity = { type: 'monster-kind', id: k.id }; inspectorView = 'summary'; playSfx('tab'); render(); });
    y += 22;
  }
  pager(g, 'mob-kinds', pg.pages, 6, 190, 152);
  if (featureOpen('monsterCreation')) button(g, uiLayer, hits, 6, 208, 152, 16, '✦ 创造怪物', () => openStitch(), {
    size: 12, fill: C.purpleDark, border: C.purple, color: C.white,
  });
  const pm = paged('mob-owned', S.monsters, 7);
  label(uiLayer, `怪群编制 ${S.monsters.length}/${monsterCap()}`, 172, 40, 12, C.white);
  const nextCap = nextMonsterCapTier();
  if (nextCap) {
    const open = S.overtime || S.raidNo >= nextCap.unlock;
    button(g, uiLayer, hits, 252, 38, 76, 15, open ? `扩编 ${nextCap.bone}骨${nextCap.mana ? `+${nextCap.mana}魔` : ''}` : `${nextCap.unlock}轮扩编`, expandMonsterCap,
      { size: 9, enabled: open && S.bone >= nextCap.bone && S.mana >= nextCap.mana, border: C.gold, color: C.gold });
  }
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
    hits.add(168, y2, 160, 18, () => { sel = { kind: 'inst', uid: inst.uid }; selectedEntity = { type: 'monster', uid: inst.uid }; inspectorView = 'summary'; playSfx('tab'); render(); });
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
  // AI 连接统一由系统设置管理；工坊这里只保留创作入口与资源兑换。
  panelF(g, uiLayer, 'inset', 6, 188, 322, 46, C.ink);
  label(uiLayer, '资源精炼・基准 5骨＝1魔・损耗20%', 12, 192, 10, C.purple);
  const b2m = exchangeQuote('bone-to-mana'), m2b = exchangeQuote('mana-to-bone');
  button(g, uiLayer, hits, 12, 208, 92, 19, exchangeConfirm === 'bone-to-mana' ? '确认25骨→4魔' : `${b2m.payBone}骨→${b2m.getMana}魔`, () => exchangeResource('bone-to-mana'),
    { size: 10, enabled: S.bone >= b2m.payBone, border: C.purple, color: C.purple });
  button(g, uiLayer, hits, 108, 208, 92, 19, exchangeConfirm === 'mana-to-bone' ? '确认5魔→20骨' : `${m2b.payMana}魔→${m2b.getBone}骨`, () => exchangeResource('mana-to-bone'),
    { size: 10, enabled: S.mana >= m2b.payMana, border: C.gold, color: C.gold });
  const st = llmStatus();
  button(g, uiLayer, hits, 204, 208, 40, 19, '造部件', () => openForge('part'),
    { size: 12, enabled: hasBackend(), fill: C.purpleDark, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 246, 208, 40, 19, '造词缀', () => openForge('affix'),
    { size: 12, enabled: hasBackend(), fill: C.purpleDark, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 288, 208, 34, 19, '图鉴', () => openForge('book'),
    { size: 12, fill: C.wall, border: C.gold, color: C.gold });
  label(uiLayer, cut(st.state === 'error' ? st.note : `${getBackend()?.name ?? '地牢回声'}自动待命`, 24), 204, 192, 9, st.state === 'error' ? C.red : C.green);
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
    hits.add(x, y, 158, 20, () => { relicForgeConfirm = false; sel = { kind: 'shop', id: it.id }; selectedEntity = { type: 'shop', id: it.id }; inspectorView = 'summary'; playSfx('tab'); render(); });
  });
  pager(g, 'shop', ps.pages, 6, 146, 158, '解锁 ');
  button(g, uiLayer, hits, 6, 168, 158, 18,
    `${S.overtime || S.raidNo >= 10 ? '高端路线' : '高端路线・第10轮'} ${Object.keys(S.workshopResearch).length}/${WORKSHOP_RESEARCH.length}`,
    openWorkshopResearch, { size: 10, enabled: S.overtime || S.raidNo >= 10, fill: C.ink, border: C.gold, color: C.gold });
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
    button(g, uiLayer, hits, x, 40, 40, 18, `#${rp.raidNo}`, () => { reportIdx = i; selectedEntity = { type: 'report', raidNo: rp.raidNo }; inspectorView = 'summary'; playSfx('tab'); render(); },
      { size: 12, fill: i === reportIdx ? C.wallLit : C.wall, border: rp.win ? C.green : C.red, color: rp.win ? C.green : C.red });
  });
  const reportLead = pendingStoryLead('战后线索', r.raidNo);
  if (reportLead) button(g, uiLayer, hits, 252, 40, 74, 18, '战后秘闻', () => openStoryLead(reportLead.id),
    { size: 10, fill: C.purpleDark, border: C.purple, color: C.white });
  else if ((r.storyConsequences?.length ?? 0) || (r.storyEchoes?.length ?? 0)) button(g, uiLayer, hits, 252, 40, 74, 18, '追溯秘闻', () =>
    openChronicle('all', null, r.raidNo), { size: 10, fill: C.ink, border: C.purple, color: C.purple });
  label(uiLayer, `${cut(r.literary?.title ?? r.title, 18)}：${r.win ? '守住' : '失守'}  封印${r.seal}  ${r.time.toFixed(1)}s`, 8, 64, 12, r.win ? C.green : C.red);
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
  button(g, uiLayer, hits, 132, y + 2, 76, 15, r.aiState === 'pending' ? 'AI补录中…' : r.literary ? '文学战报' : '完整战术复盘', () => {
    openDetailPopup(`#${r.raidNo} ${r.literary?.title ?? '战术复盘'}`, reportDetailBody(r), r.win ? C.green : C.red);
  }, { size: 9, enabled: r.aiState !== 'pending', fill: C.ink, border: r.literary ? C.purple : C.goldDark, color: r.literary ? C.purple : C.gold });
  boundedText(uiLayer, r.literary?.summary ?? (r.aiState === 'pending' ? 'AI战地书记正在依据真实战斗记录补写文学战报…' : r.firstCause),
    8, y + 20, 200, Math.max(15, 210 - (y + 20)), 11, r.aiState === 'pending' ? C.purple : C.bone);
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

function confirmRaidBriefing() {
  if (!raidBriefing) return;
  const scene = raidBriefing;
  const no = scene.no;
  if (!S.raidBriefingsSeen.includes(no)) S.raidBriefingsSeen.push(no);
  const key = `raid-briefing:${no}`;
  if (!S.story.archive.some((x) => x.key === key)) {
    S.story.archive.unshift({ id: S.story.leadNext++, key, sceneId: key, source: '正式战役',
      title: `第${no}轮・${scene.title}`, summary: `${S.playerName}在${S.lairName}收到来报：${scene.body}`, resolvedRaid: no,
      outcome: `${S.playerName}的王座回应：${scene.reply}`, effects: '迎战', refs: [], battleRefs: [] });
  }
  raidBriefing = null;
  persist(); playSfx('tab');
  return startBattle();
}

async function startBattle() {
  if (screen !== 'manage') return;
  if (battlePrepBusy) { say('叙事者正在整理战前台词…'); return; }
  confirmNew = false;
  if (S.raidNo === 1 && !S.overtime) {
    const step = syncTutorialProgress();
    if (step < 6 || !tutorialDeploymentReady()) {
      if (step < 3) setTab('mob');
      else if (step < 5 || !tutorialDeploymentReady()) setTab('dungeon');
      else setTab('throne');
      say(roundGuide()?.[1] ?? '先完成新手部署再迎战');
      return;
    }
    tutorialData().step = 7;
    persist();
  }
  if (!S.overtime && !roundTeachingComplete()) {
    const guide = roundGuide();
    const requiredPage = (ROUND_TUTORIALS[S.raidNo] ?? [])[Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0))]?.page;
    if (requiredPage && tab !== requiredPage) setTab(requiredPage);
    say(guide?.[2] ? '先阅读高光区域的说明，并点击“明白，继续”' : guide?.[1] ?? '请先完成本轮教学');
    return;
  }
  const hardTask = uiTasks().find((task) => task.blocking);
  if (hardTask) {
    selectedEntity = { type: 'task', id: hardTask.id };
    setZone('throne');
    say(`${hardTask.title}：${hardTask.summary}`);
    return;
  }
  await flushAutosave();
  if (S.overtime && !S.novel?.enabled && loadMode() === 'http' && !S.onlineRaids?.[S.otRaid]) {
    const onlineRaid = await prepareOnlineOvertimeRaid();
    if (onlineRaid?.briefing?.body) {
      raidBriefing = { no: onlineRaid.no, title: onlineRaid.title,
        body: onlineRaid.briefing.body,
        reply: onlineRaid.briefing.reply || `${S.lairName}今天照常营业。` };
      playSfx('tab'); render(); return;
    }
    say('线上远征生成失败，本批改用本地加班勇者');
  }
  if (stitch) closeStitch();
  if (!S.overtime && !S.raidBriefingsSeen.includes(S.raidNo)) {
    raidBriefing = RAID_BRIEFINGS[S.raidNo - 1] ?? null;
    if (raidBriefing) { playSfx('tab'); scheduleLayout(); render(); return; }
  }
  // 战斗逻辑只携带纹理 key；开战前先烘焙固定怪物/精英怪物的四部位组合与当前改造外观。
  for (const m of S.monsters) instKind(m);
  for (const c of S.champs) champKind(c);
  const raid = currentRaid();
  let dialoguePack = null;
  if (aiGenerationEnabled()) {
    battlePrepBusy = true;
    say('叙事者正在为本场编排战前台词…');
    render();
    try {
      dialoguePack = await prepareBattleDialogue(raid);
    } finally {
      battlePrepBusy = false;
    }
    if (screen !== 'manage' || currentRaid().no !== raid.no) return;
  }
  const dungeonEconomy = dungeonEconomyPreview();
  const doctrineSeal = S.doctrine === 'default' ? 1.25 : S.doctrine === 'economy' ? 0.8 : 1;
  battleCheckpoint = structuredClone(S);
  battle = createBattle(raid, S.rooms, S.monsters,
    { sealMax: Math.round(sealMax() * doctrineSeal), trapPower: trapPower(), mods: battleMods(), research: researchEffects(S.workshopResearch), champs: champStatMap(), dungeonEconomy, dialoguePack });
  pendingResultRaid = raid.no;
  screen = 'battle';
  scheduleLayout();
  uiPortraitFx.length = 0;
  speed = 1;
  paused = false;
  camX = camTargetX = -40;
  buildBattleScene();
  render();
  playMusic('bgm-battle');
  if (dialoguePack?.stats) {
    const s = dialoguePack.stats;
    say(`AI台词已装载：${s.covered}/${s.expected}名角色、核心分类${s.coreCovered}/${s.expected}，共${s.lines}句`);
  } else if (aiGenerationEnabled()) say('AI台词未返回有效内容，本场已使用本地台词包');
  else say('');
}

function abortBattle() {
  if (screen !== 'battle' || !battle) return false;
  // 战斗模拟只使用开战时创建的瞬态副本；在 finishBattle 之前丢弃它，资源、经验、
  // 伤势、设施损失、战报和轮次均不会结算，经营存档保持在本次迎战之前。
  const raidNo = battle.raid.no;
  if (battleCheckpoint) S = structuredClone(battleCheckpoint);
  recordFailedAttempt(raidNo, '中途退出');
  battleCheckpoint = null;
  pendingResultRaid = 0;
  paused = false;
  speed = 1;
  persist();
  backToManage();
  say('已退出本次战斗：状态已回退，并记为一次失败');
  return true;
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
    const trapSprites = [];
    for (const trapState of b.rooms[i].trapStates ?? []) {
      if (!TRAPS[trapState.id]?.tex) continue;
      const trapSp = sprite(TRAPS[trapState.id].tex, rx + 242 + trapState.slot * 28, FLOOR_Y + 2, 22);
      bgLayer.addChild(trapSp);
      trapSprites.push({ slot: trapState.slot, sprite: trapSp });
    }
    let utilitySprite = null;
    const utility = b.rooms[i].utility;
    if (utility && utility.kind !== 'none' && utility.condition > 0) {
      const facility = UTILITY_KINDS[utility.kind];
      // Facility art already has a clean transparent background. Place the
      // full silhouette directly on the room floor instead of shrinking it
      // into a second UI card inside the battlefield.
      utilitySprite = sprite(facility?.tex, rx + 338, FLOOR_Y + 1, 92);
      utilitySprite.alpha = Math.max(0.42, utility.condition / 100);
      bgLayer.addChild(utilitySprite);
    }
    roomVis.push({ door: g, traps: trapSprites, trap: trapSprites[0]?.sprite ?? null, broken: false, utilitySprite });
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
      const trapSprite = rv?.traps?.find((item) => item.slot === (e.slot ?? 0))?.sprite ?? rv?.trap;
      if (trapSprite) { trapSprite.tint = 0x555064; trapSprite.alpha = 0.6; }
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
      if (rv?.utilitySprite) rv.utilitySprite.alpha = 0.45 + (1 - e.progress) * 0.55;
      playSfx('heavy', 0.45);
    } else if (e.k === 'utility-break') {
      const rv = roomVis[e.room];
      if (rv?.utilitySprite) { rv.utilitySprite.tint = e.complete ? 0x74505a : 0xc69b7a; rv.utilitySprite.alpha = e.complete ? 0.38 : 0.68; }
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
    button(hudGfx, hudLayer, hits, 338, 2, 42, 18, '退出', abortBattle, { size: 11, fill: C.redDark, border: C.red, color: C.white });
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

function literaryReportSnapshot(report) {
  return {
    raid: { no: report.raidNo, title: report.title, win: report.win, seal: report.seal, time: Number(report.time.toFixed(1)), skulls: report.skulls },
    rooms: report.rooms.map((room) => ({ floor: room.i + 1, broken: room.broken, breachTime: Number((room.t ?? 0).toFixed(1)),
      reason: room.reason, lootDuration: Number((room.lootDuration ?? 0).toFixed(1)), workerState: room.workerState })),
    units: report.units.slice(0, 10),
    metrics: report.metrics,
    economy: report.economy ? { bone: report.economy.bone, mana: report.economy.mana, xp: report.economy.xp, repair: report.economy.repair,
      losses: report.economy.rows?.filter((row) => row.breached).map((row) => ({ floor: row.floor + 1, boneLoss: row.boneLoss, manaLoss: row.manaLoss,
        conditionDamage: row.conditionDamage, workerState: row.workerState })) } : null,
    tacticalReview: report.review,
    dialogue: report.dialogue.filter((line) => ['banter', 'skill', 'reaction', 'heal', 'revive', 'allyRevive', 'loot'].includes(line.kind)).slice(-18)
      .map((line) => `${line.name}：${line.text}`),
    story: [...report.storyConsequences.map((item) => `${item.name}：${item.summary}`),
      ...report.storyEchoes.map((item) => `${item.title}：${item.outcome}`)].slice(0, 6),
  };
}

async function enrichLiteraryReport(report) {
  if (!aiGenerationEnabled()) { report.aiState = 'local'; return; }
  report.aiState = 'pending';
  persist();
  try {
    const literary = await requestLiteraryReport(literaryReportSnapshot(report));
    if (!literary || !S.reports.includes(report)) return;
    report.literary = literary;
    report.aiState = 'done';
    persist();
    render();
  } catch (error) {
    if (S.reports.includes(report)) { report.aiState = 'fallback'; persist(); render(); }
    console.warn('文学战报生成失败，已保留本地战术复盘', error);
  }
}

function settleNovelMission(report, battleResult) {
  const n = S.novel, mission = n?.pendingMission;
  if (!n?.enabled || !mission || mission.resolved || mission.issuedRaid !== report.raidNo) return null;
  const outcome = evaluateNovelMission(mission, report);
  let bonusBone = 0, bonusMana = 0, lostBone = 0, lostMana = 0, temporary = false;
  if (outcome.complete) {
    bonusBone = Math.max(0, Math.round((battleResult.bone ?? 0) * (mission.rewardMult - 1)));
    bonusMana = Math.max(0, Math.round((battleResult.mana ?? 0) * (mission.rewardMult - 1)));
    S.bone += bonusBone; S.mana += bonusMana; battleResult.bone += bonusBone; battleResult.mana += bonusMana;
  } else if (mission.penalty === 'temporary') {
    temporary = true;
    S.story.mods.push({ id: `novel-penalty-${report.raidNo}`, name: '任务违约金', raids: 2,
      monHpMult: 0.95, monAtkMult: 0.95, monSpdAdd: 0, heroHpMult: 1.05, heroAtkMult: 1.08,
      sealAdd: 0, trapMult: 1, roomLimitAdd: 0 });
  } else {
    lostBone = Math.min(120, Math.floor(S.bone * 0.10)); lostMana = Math.min(40, Math.floor(S.mana * 0.10));
    S.bone -= lostBone; S.mana -= lostMana;
  }
  mission.resolved = true; mission.outcome = { ...outcome, bonusBone, bonusMana, lostBone, lostMana, temporary };
  n.lastResolvedRaid = report.raidNo; n.phase = 'resolution'; n.dailyTurns = 0; n.choices = []; n.draft = ''; n.error = '';
  const resultText = outcome.complete
    ? `【任务完成：${mission.title}】\n${outcome.reason}。额外结算${bonusBone}骨币、${bonusMana}魔质。`
    : `【任务失败：${mission.title}】\n${outcome.reason}。${temporary ? '违约记录令未来两次入侵更难处理。' : `损失${lostBone}骨币、${lostMana}魔质。`}`;
  appendNovelEntry(n, 'battle', resultText); n.chapter += 1;
  report.novel = { missionId: mission.id, title: mission.title, objective: mission.objectiveText, ...mission.outcome };
  return report.novel;
}

function finishBattle() {
  const b = battle ;
  const r = b.result ;
  const fullVictory = !!r.win && (r.skulls ?? 0) >= 3;
  screen = 'result';
  scheduleLayout();
  resultLayerBuilt = false;
  if (!fullVictory) {
    // 败战是一次可复盘的失败尝试，而不是第二套惩罚经济。恢复迎战前的完整经营
    // 状态，只额外保留一份不参与结算的战术记录，供玩家判断卡点。
    if (battleCheckpoint) S = structuredClone(battleCheckpoint);
    battleCheckpoint = null;
    r.partialVictory = !!r.win;
    r.win = false;
    r.bone = 0; r.mana = 0; r.relicLoot = 0; r.loot = []; r.economy = null; r.rolledBack = true;
    const failure = recordFailedAttempt(b.raid.no, r.partialVictory ? '未达成全胜' : '封印失守');
    const units = [...b.heroes.map((unit) => ({ name: unit.name, dmg: Math.round(unit.dmgDealt), heal: Math.round(unit.healed), kills: unit.kills ?? 0, side: 'hero' })),
      ...b.rooms.flatMap((room) => room.mons.map((unit) => ({ name: unit.name, dmg: Math.round(unit.dmgDealt), heal: Math.round(unit.healed), kills: unit.kills ?? 0, side: 'mon' })))]
      .sort((a, z) => z.dmg - a.dmg);
    const report = {
      raidNo: b.raid.no, title: b.raid.title, win: false, partialVictory: r.partialVictory, rolledBack: true, failureCount: failure.count,
      skulls: r.partialVictory ? r.skulls : 0, seal: r.seal, time: b.time,
      bone: 0, mana: 0, relicLoot: 0,
      rooms: b.rooms.map((room) => ({ i: room.index, broken: room.broken, t: room.breachTime, reason: room.breachReason,
        lootDuration: room.utility?.row?.realtime?.duration ?? 0, lootProgress: room.utility?.row?.realtime?.progress ?? 0,
        workerState: room.utility?.workerState ?? 'none' })),
      units, firstCause: r.firstCause, review: r.review ?? [], metrics: r.metrics ?? {}, economy: null, aiState: 'local',
      dialogue: (b.dialogue ?? []).map((line) => ({ name: line.name, text: line.text, kind: line.kind, side: line.side, room: line.room, t: line.t })),
      logs: b.log.map((line) => ({ text: line.text, tone: line.tone })), storyConsequences: [], storyEchoes: [], storyRefs: [], storyLeadIds: [],
    };
    S.reports.unshift(report);
    if (S.reports.length > 5) S.reports.length = 5;
    reportIdx = 0;
    playSfx('lose');
    persist();
    void enrichLiteraryReport(report);
    playMusic('bgm-manage');
    return;
  }
  clearFailedAttempts(b.raid.no);
  const rewardMult = dungeonRaidScale().reward;
  const directReward = S.doctrine === 'economy' ? 0.60 : 1;
  r.bone = Math.round(r.bone * rewardMult * directReward);
  r.mana = Math.round(r.mana * rewardMult * directReward);
  S.bone += r.bone;
  S.mana += r.mana;
  S.relic += r.relicLoot ?? 0;
  for (const x of r.xp) {
    const inst = instById(x.uid);
    if (inst && inst.lv < 5) inst.xp += Math.round(x.xp * (S.doctrine === 'elite' ? 1.75 : 1));
  }
  // 英雄结算：经验/战功归到具体个体，疲劳按"上没上场"分别涨落
  const deployedChampUids = seatedChampUids();
  const chemBefore = chemistry(S.champs, deployedChampUids).map;
  for (const x of r.champXp ?? []) {
    const c = champById(x.uid);
    if (!c) continue;
    if (c.lv < CHAMP_LV_CAP) {
      const st = statOf(c, chemBefore);
      c.xp += Math.round(x.xp * chemOf(chemBefore, c.uid).xp * (st.xpMult ?? 1) * (S.doctrine === 'elite' ? 1.75 : 1));
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
  const forcedHeroes = new Set(deployedChampUids.filter((uid) => heroForcedThisRaid(champById(uid))));
  const newlyResting = tickFatigue(S.champs, deployedChampUids, forcedHeroes);
  for (const c of S.champs) if (c.forcedRaid === currentRaidIdentity()) delete c.forcedRaid;
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
    bone: r.bone, mana: r.mana, relicLoot: r.relicLoot ?? 0,
    rooms: b.rooms.map((rm) => ({ i: rm.index, broken: rm.broken, t: rm.breachTime, reason: rm.breachReason,
      lootDuration: rm.utility?.row?.realtime?.duration ?? 0, lootProgress: rm.utility?.row?.realtime?.progress ?? 0,
      workerState: rm.utility?.row?.realtime?.workerState ?? rm.utility?.workerState ?? 'none' })),
    units, firstCause: r.firstCause, review: r.review ?? [], metrics: r.metrics ?? {}, economy,
    aiState: aiGenerationEnabled() ? 'pending' : 'local',
    dialogue: (b.dialogue ?? []).map((d) => ({ name: d.name, text: d.text, kind: d.kind, side: d.side, room: d.room, t: d.t })),
    logs: b.log.map((l) => ({ text: l.text, tone: l.tone })),
    storyConsequences: S.story.mods.map((m) => ({ id: m.id, name: m.name, summary: modSummary(m), originLeadId: m.originLeadId ?? null })),
    storyEchoes: S.story.archive.filter((x) => x.resolvedRaid === b.raid.no).slice(0, 3)
      .map((x) => ({ id: x.id, sceneId: x.sceneId, title: x.title, outcome: x.outcome })),
  };
  report.defenders = b.rooms.flatMap((room) => room.mons.map((unit) => ({
    key: unit.champUid ? `hero:${unit.champUid}` : `monster:${unit.monsterUid}`, name: unit.name, alive: !!unit.alive,
  }))).filter((unit) => !unit.key.endsWith('undefined'));
  settleNovelMission(report, r);
  report.bone = r.bone; report.mana = r.mana;
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
    if (!S.overtime && b.raid.no === 1) tutorialData().step = 8;
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
  void enrichLiteraryReport(report);
  playMusic('bgm-manage');
  battleCheckpoint = null;
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
  labelC(overlay, r.win ? '地牢全胜！' : r.partialVictory ? '守住了，但未能全胜…' : '封印被击破…', 240, 40, 12, r.win ? C.green : r.partialVictory ? C.gold : C.red);
  labelC(overlay, `${b.raid.title}  击倒 ${r.kills}/${r.total}  封印剩余 ${r.seal}`, 240, 58, 12, C.bone);
  if (r.win) {
    for (let i = 0; i < 3; i++) {
      const s = sprite('icon-skull', 210 + i * 22, 96, 18);
      s.alpha = i < r.skulls ? 1 : 0.2;
      overlay.addChild(s);
    }
  }
  const eco = r.economy;
  labelC(overlay, r.rolledBack ? '败战未结算：收益、损害与消耗均已回退'
    : eco ? `战利＋${r.bone}骨/${r.mana}魔・经营＋${eco.bone}骨/${eco.mana}魔・训${eco.xp ?? 0}/修${eco.repair ?? 0}`
      : `骨币 +${r.bone}   魔质 +${r.mana}`, 240, 104, 9, r.rolledBack ? C.green : C.gold);
  boundedText(overlay, r.firstCause, 90, 120, 300, 26, 9, r.win ? C.stoneLit : C.gold);
  let y = 148;
  const xpLines = r.xp.map((x) => {
    const inst = instById(x.uid);
    return inst ? `${instKind(inst).name} +${x.xp}xp` : '';
  }).filter(Boolean).slice(0, 4);
  labelC(overlay, r.rolledBack ? '保留战术复盘，不保留任何战斗结算' : xpLines.length ? xpLines.join('  ') : '本场无怪物参战', 240, y, 12, C.green);
  y += 16;
  // 英雄的成长单独一行：这是玩家最在意的长期读数
  const champLines = (r.champXp ?? []).map((x) => {
    const c = champById(x.uid);
    return c ? `${c.name} +${x.xp}xp${x.kills ? `/${x.kills}杀` : ''}${x.fell ? '（受伤）' : ''}` : '';
  }).filter(Boolean).slice(0, 2);
  if (!r.rolledBack && champLines.length) labelC(overlay, champLines.join('  '), 240, y, 12, C.gold);
  y += 16;
  const loot = (r.loot ?? []).map((id) => gearById(id)?.name ?? '').filter(Boolean);
  const lootLine = r.rolledBack ? '可调整阵容、部署和消费后再次迎战'
    : `${loot.length ? `缴获：${cut(loot.join('、'), 16)}` : '无装备缴获'}${r.relicLoot ? '・英雄遗物×1' : ''}`;
  labelC(overlay, lootLine, 240, y, 12, loot.length || r.relicLoot ? C.purple : C.stoneLit);
  const isFinal = r.win && !S.overtime && b.raid.no === NORMAL_RAID_COUNT;
  button(g, overlay, hits, 100, 196, 130, 28, r.win ? (isFinal ? '观看结局' : '继续') : '立即重试', r.win ? afterResult : retryFailedBattle, { fill: C.greenDark, border: C.green, color: C.white });
  button(g, overlay, hits, 250, 196, 130, 28, isFinal ? '观看结局' : '返回经营', returnFromResult, { fill: C.wallLit, border: C.bone });
  labelC(overlay, 'Enter 继续', 240, 228, 12, C.stoneLit);
}

function advanceWonResult() {
  const b = battle;
  if (!b?.result?.win) return false;
  let changed = false;
  if (S.overtime) {
    if (S.otRaid <= b.raid.no) { S.otRaid = b.raid.no + 1; changed = true; }
  } else if (S.raidNo <= b.raid.no) {
    S.raidNo = b.raid.no + 1;
    changed = true;
  }
  if (changed) {
    applyProgressionGrants();
    persist();
  }
  return changed;
}

function returnFromResult() {
  const b = battle;
  if (!b?.result) return;
  if (b.result.win && !S.overtime && b.raid.no === NORMAL_RAID_COUNT) { afterResult(); return; }
  if (b.result.win) advanceWonResult();
  backToManage();
}

function retryFailedBattle() {
  if (!battle?.result || battle.result.win) return;
  backToManage();
  if (!detailPopup) void startBattle();
}

function afterResult() {
  const b = battle ;
  const r = b.result ;
  if (r.win) {
    if (!S.overtime && b.raid.no === NORMAL_RAID_COUNT) {
      if (!S.clearRecorded) {
        S.clearRecorded = true;
        meta.clears += 1;
        persistMeta();
      }
      screen = 'ending';
      scheduleLayout();
      endingT = 0;
      for (const c of overlay.removeChildren()) c.destroy({ children: true });
      hits.clear();
      playSfx('win');
      persist();
      return;
    }
    advanceWonResult();
  }
  backToManage();
}

function backToManage() {
  screen = 'manage';
  portraitPane = 0;
  scheduleLayout();
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
  showPendingReliefNotice();
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
  labelC(overlay, '二十轮入侵终结。王座仍在黑暗中燃烧。', 240, 35, 12, C.gold);
  labelC(overlay, '此后可挑战加班勇者，或携方针开启新的轮回。', 240, 55, 11, C.purple);
  const g2 = new PIXI.Graphics();
  overlay.addChild(g2);
  // Keep the complete action cluster inside the 480x270 logical viewport.
  // The old hint started at y=262 and its measured font height was clipped
  // before large-screen scaling, so increasing the display size could never
  // reveal the missing bottom pixels.
  labelC(overlay, '选择下一段统治', 240, 215, 11, C.stoneLit);
  endingActionRect = { x: 70, y: 232, w: 155, h: 28 };
  endingRebirthRect = { x: 255, y: 232, w: 155, h: 28 };
  button(g2, overlay, hits, endingActionRect.x, endingActionRect.y, endingActionRect.w, endingActionRect.h,
    '进入加班勇者', () => enterOvertime(), { size: 13, fill: C.purpleDark, border: C.purple, color: C.white });
  button(g2, overlay, hits, endingRebirthRect.x, endingRebirthRect.y, endingRebirthRect.w, endingRebirthRect.h,
    '开启新轮回', () => openNewCycle(), { size: 13, fill: C.goldDark, border: C.gold, color: C.white });
}

function enterOvertime() {
  S.overtime = true;
  S.otRaid = Math.max(NORMAL_RAID_COUNT + 1, S.otRaid);
  persist();
  screen = 'manage';
  scheduleLayout();
  battle = null;
  battleLayer.visible = false;
  for (const c of overlay.removeChildren()) c.destroy({ children: true });
  hits.clear();
  endingBuilt = false;
  endingActionRect = null;
  endingRebirthRect = null;
  tab = 'throne';
  playMusic('bgm-manage');
  render();
}

// ---------- 主循环 ----------
let endingBuilt = false;
let endingActionRect = null;
let endingRebirthRect = null;
function tick(dt        ) {
  tickAudio();
  ensurePortraitChrome();
  if (screen === 'manage') tickUiPortraitEffects(dt);
  if (guidePulseNodes.length) {
    const glow = 0.42 + (Math.sin(portraitFxClock * 5) + 1) * 0.29;
    for (const node of guidePulseNodes) if (node && !node.destroyed) node.alpha = glow;
  }
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
  get rawSave() { return JSON.stringify(S); },
  get screen() { return screen; },
  get paused() { return paused; },
  get battleSpeed() { return speed; },
  setBattleSpeed: (v) => { if ([1, 2, 4].includes(v)) speed = v; return speed; },
  get tab() { return tab; },
  get save() { return S; },
  get meta() { return { ...meta }; },
  get title() { return { mode: titleMode, pick: titleDoctrinePick, saveExists, actions: { ...titleActionRects } }; },
  titleNew: () => { startFromTitle(); return screen; },
  get identityOpen() { return !!identityRoot; },
  identityStart: async (playerName = '测试魔王', lairName = '测试地牢') => { closeIdentitySetup(); await beginNewRun(pendingDoctrine, { playerName, lairName }); return screen; },
  introContinue: () => { finishIntro(); return screen; },
  titleContinue: () => { continueGame(); return screen; },
  titlePick: (id) => { if (DOCTRINES[id]) { titleDoctrinePick = id; render(); } return titleDoctrinePick; },
  titleConfirm: async () => { await beginNewRun(titleDoctrinePick); return screen; },
  get progression() { return { raid: S.raidNo, tutorialStep: tutorialData().step,
    visibleTabs: visibleZones().map((item) => item.id), visiblePages: visibleTabs().map((item) => item.id), guide: roundGuide(), deploymentReady: tutorialDeploymentReady(),
    enemyClasses: currentRaid().members.map((member) => member.cls), teachingComplete: roundTeachingComplete(),
    roundStep: Math.max(0, Math.round(tutorialData().roundSteps[S.raidNo] || 0)),
    roundTutorialTotal: (ROUND_TUTORIALS[S.raidNo] ?? []).length,
    recruitKinds: allKinds().filter(recruitKindOpen).map((kind) => kind.id),
    features: { hero: featureOpen('hero'), equipmentForge: featureOpen('equipmentForge'), heroTalent: featureOpen('heroTalent'), heroGraft: featureOpen('heroGraft') },
    heroGift: S.champs.find((c) => c.introGift) ? { uid: S.champs.find((c) => c.introGift).uid,
      race: S.champs.find((c) => c.introGift).race, potential: S.champPot[S.champs.find((c) => c.introGift).uid] ?? 0 } : null }; },
  get bone() { return S.bone; },
  get mana() { return S.mana; },
  exchange: (direction) => { exchangeConfirm = direction; return exchangeResource(direction); },
  devOvertime: (no = NORMAL_RAID_COUNT + 1) => { S.overtime = true; S.otRaid = Math.max(NORMAL_RAID_COUNT + 1, Math.round(no)); S.onlineRaids = {}; persist(); render(); return currentRaid(); },
  get detail() { return detailPopup ? { ...detailPopup } : null; },
  openDetail: (title, body) => { openDetailPopup(title, body); return true; },
  closeDetail: () => { closeDetailPopup(); return true; },
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
      nativePortrait: portraitNativeManage(), rootVisible: root.visible, uiVisible: uiLayer.visible,
      introDomVisible: !!introDomRoot && getComputedStyle(introDomRoot).display !== 'none', overlayChildren: overlay.children.length,
      overlayBlockers: overlay.children.map((node) => node.getLocalBounds()).filter((bounds) => bounds.width >= VIEW_W - 4 && bounds.height >= VIEW_H - 4).length,
      logicalFrame: { x: root.x, y: root.y, width: VIEW_W * viewScale, height: VIEW_H * viewScale,
        right: root.x + VIEW_W * viewScale, bottom: root.y + VIEW_H * viewScale },
      portraitActions: { ...portraitActionMap },
      resolution: renderResolution, dpr: window.devicePixelRatio || 1,
      safeRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null };
  },
  get currentTab() { return tab; },
  get uiRoute() { return { zone: activeZone(), section: tab, selectedEntity: selectedEntity ? { ...selectedEntity } : null, inspectorView, density: uiDensity, tourStep: uiShellTourStep }; },
  get uiTasks() { return uiTasks().map((task) => ({ ...task, target: { ...task.target } })); },
  uiTaskOpen: (id) => { const task = uiTasks().find((item) => item.id === id); if (task) navigateUiTask(task); return activeZone(); },
  uiDensity: (mode) => { if (mode === 'expert' || mode === 'standard') { uiDensity = mode; localStorage.setItem(UI_DENSITY_KEY, mode); render(); } return uiDensity; },
  uiTourSkip: () => { skipUiShellTour(); return uiShellTourStep; },
  get newGameConfirm() { return confirmNew; },
  cancelNewGame: () => { confirmNew = false; desktopSystemMenu = false; render(); return true; },
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
  get workshopResearch() { return { picks: { ...S.workshopResearch }, level: workshopResearchLevel(), effects: researchEffects(S.workshopResearch), modal: researchModal ? { ...researchModal } : null }; },
  researchOpen: () => { openWorkshopResearch(); return !!researchModal; },
  researchGroup: (id) => { chooseResearchGroup(id); return researchModal ? { ...researchModal } : null; },
  researchPreview: (id) => { previewResearch(id); return researchModal ? { ...researchModal } : null; },
  researchConfirm: () => ({ ok: confirmResearch(), mana: S.mana, picks: { ...S.workshopResearch } }),
  researchClose: () => { closeWorkshopResearch(); return !researchModal; },
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
      dialoguePack: battle.dialoguePack,
      dialogue: battle.dialogue.map((line) => ({ ...line })),
      aiDialogueUsed: battle.__aiDialogueUsed ?? 0,
      heroHp: battle.heroes.map((h) => Math.round(h.hp)),
      monHp: battle.rooms.map((r) => r.mons.map((m) => Math.round(m.hp))),
      loot: battle.rooms[battle.roomIndex]?.utility?.loot ? { ...battle.rooms[battle.roomIndex].utility.loot } : null,
      utility: battle.rooms[battle.roomIndex]?.utility ? {
        kind: battle.rooms[battle.roomIndex].utility.kind,
        workerState: battle.rooms[battle.roomIndex].utility.workerState,
        realtime: battle.rooms[battle.roomIndex].utility.row.realtime ?? null,
      } : null,
      utilityVisual: roomVis[battle.roomIndex]?.utilitySprite ? {
        width: Math.round(roomVis[battle.roomIndex].utilitySprite.width),
        height: Math.round(roomVis[battle.roomIndex].utilitySprite.height),
        direct: !roomVis[battle.roomIndex].utilityGfx && !roomVis[battle.roomIndex].utilityLabel,
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
  startBattle: async () => { await startBattle(); return screen; },
  abortBattle: () => ({ ok: abortBattle(), screen, raidNo: S.raidNo, bone: S.bone, mana: S.mana, reports: S.reports.length,
    failure: structuredClone(S.failureRelief[failureKey()] ?? null), relief: detailPopup ? { ...detailPopup } : null }),
  get failureRelief() { return { states: structuredClone(S.failureRelief), notices: structuredClone(S.reliefNotices), detail: detailPopup ? { ...detailPopup } : null }; },
  get raidBriefing() { return raidBriefing ? { ...raidBriefing } : null; },
  confirmRaidBriefing: async () => { await confirmRaidBriefing(); return screen; },
  get lawAudit() { return lawAudit ? { ...lawAudit } : null; },
  acceptLawAudit: () => { acceptLawAudit(); return lawAudit; },
  devLawAudit: (type, uid, kind = 'thorns') => {
    const target = type === 'hero' ? champById(uid) : instById(uid);
    if (!target || !LAW_AUDIT_TEXT[kind]) return false;
    lawAudit = { type, uid, name: type === 'hero' ? target.name : instKind(target).name, kind, ...LAW_AUDIT_TEXT[kind] };
    render(); return true;
  },
  runBattleToEnd: (maxSteps = 20000) => {
    if (!battle || screen !== 'battle') return null;
    let steps = 0;
    while (battle.phase !== 'done' && steps++ < maxSteps) stepBattle(battle, 0.05);
    consumeEvents();
    if (battle.phase === 'done' && battle.result) finishBattle();
    return { screen, steps, result: battle.result };
  },
  devSettleLoss: () => {
    if (!battle || screen !== 'battle') return null;
    const mon = S.monsters[0], champ = S.champs[0];
    if (battle.rooms[0]) battle.rooms[0].broken = true;
    battle.result = { win: false, skulls: 0, seal: 0, kills: 0, total: battle.heroes.length, firstCause: '测试封印击破', review: ['测试败战回滚'], metrics: {},
      bone: 90, mana: 30, relicLoot: 1, loot: [], xp: mon ? [{ uid: mon.uid, xp: 99 }] : [],
      champXp: champ ? [{ uid: champ.uid, xp: 99, kills: 0, fell: true }] : [], champStats: [] };
    battle.phase = 'done';
    finishBattle();
    return { screen, rolledBack: battle.result.rolledBack, report: S.reports[0] };
  },
  devSettleWin: (skulls = 3) => {
    if (!battle || screen !== 'battle') return null;
    const monXp = S.monsters.slice(0, 2).map((unit) => ({ uid: unit.uid, xp: 5 }));
    battle.result = { win: true, skulls: Math.max(0, Math.min(3, Math.round(skulls))), seal: Math.max(1, Math.round(battle.seal)), kills: battle.heroes.length, total: battle.heroes.length,
      firstCause: '测试守住封印', review: ['测试胜利结算'], metrics: {}, bone: battle.raid.reward?.bone ?? 0, mana: battle.raid.reward?.mana ?? 0,
      relicLoot: 0, loot: [], xp: monXp, champXp: [], champStats: [] };
    battle.phase = 'done';
    finishBattle();
    return { screen, result: battle.result, report: S.reports[0] };
  },
  stepBattleForTest: (steps = 120) => {
    if (!battle || screen !== 'battle') return null;
    for (let i = 0; i < Math.max(1, Math.min(2000, Math.round(steps))); i++) {
      if (battle.phase === 'done') break;
      stepBattle(battle, 0.05);
    }
    consumeEvents();
    return { dialogue: battle.dialogue.map((line) => ({ ...line })), aiDialogueUsed: battle.__aiDialogueUsed ?? 0, phase: battle.phase };
  },
  returnResult: () => { returnFromResult(); return { screen, raid: S.raidNo, overtimeRaid: S.otRaid }; },
  get result() { return battle?.result ?? null; },
  get reports() { return S.reports; },
  get audio() { return audioSnapshot(); },
  get endingT() { return endingT; },
  get endingLayout() {
    if (screen !== 'ending') return null;
    const b = overlay.getLocalBounds();
    return {
      bounds: { x: b.x, y: b.y, width: b.width, height: b.height, right: b.x + b.width, bottom: b.y + b.height },
      action: endingActionRect ? { ...endingActionRect } : null,
      rebirth: endingRebirthRect ? { ...endingRebirthRect } : null,
    };
  },
  devEnding: () => {
    screen = 'ending';
    endingT = 0;
    endingBuilt = false;
    battleLayer.visible = false;
    for (const c of overlay.removeChildren()) c.destroy({ children: true });
    hits.clear();
    scheduleLayout();
    return screen;
  },
  setTab: (t     ) => setTab(t),
  ackGuide: () => { acknowledgeRoundGuide(); return window.__debug.progression; },
  backManage: () => { backToManage(); return screen; },
  pagers: () => livePagers.map((p) => ({ ...p, page: pageState[p.key] ?? 0, focus: pagerFocus === p.key })),
  giveResources: (b        , m        ) => { S.bone += b; S.mana += m; render(); },
  forceRaid: (n        ) => { S.raidNo = n; applyProgressionGrants(); persist(); render(); },
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
      draft: forge.draft, af: forge.af, via: forge.via, brief: forge.brief, rules: diyRules() } : null;
  },
  forgeOpen: (tab                           ) => { openForge(tab); return forge != null; },
  forgeTab: (tab) => { switchForgeTab(tab); return forge?.tab ?? null; },
  forgeCat: (c         ) => { if (forge) { forge.cat = c; if (forge.tab === 'part') forge.draft = null; else forge.af = null;
    forge.brief = ''; if (forgeInput) forgeInput.value = ''; render(); } },
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
  forceHero: (uid) => { const c = champById(uid); return c ? forceRestingHero(c) : false; },
  heroLoreOptimize: async (uid) => {
    const c = champById(uid);
    if (!c) return null;
    await optimizeHeroLore(c);
    return champById(uid)?.aiLore ?? null;
  },
  devRest: (uid        ) => { const c = champById(uid); if (c) restChamp(c); return c ? c.restTurns : -1; },
  devRecruitChamp: (i = 0) => { const c = S.cands[i]; if (c) recruitChamp(c); return S.champs.length; },
  devTrap: (room        , id        , slot = 0) => { if (!(id in TRAPS)) return false; if (!S.traps.includes(id)) S.traps.push(id); S.rooms[room][slot === 1 ? 'trap2' : 'trap'] = id; persist(); render(); return true; },
  devTheme: (room        , id         ) => { if (!(id in THEMES)) return false; if (!S.themes.includes(id)) S.themes.push(id); S.rooms[room].theme = id; persist(); render(); return true; },
  devLevel: (uid        , lv        ) => { const m = S.monsters.find((x) => x.uid === uid); if (m) m.lv = lv; persist(); render(); },
  get overtime() { return { on: S.overtime, otRaid: S.otRaid }; },
  get currentRaid() { const r = currentRaid(); return { no: r.no, title: r.title, members: r.members.length, affixes: [...r.affixes],
    affixDetails: r.affixes.map((id) => raidAffixInfo(r, id)) }; },
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
  deleteCustomKind: (id        ) => deleteCustomKind(id),
  reloadSave: async () => { S = freshSave(); await loadSave(); for (const d of S.customs) buildCustomTex(d); sel = null; render(); return true; },
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
  storyDrawOffline: async () => { await drawStoryScene(true); return window.__debug.storyScene; },
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
  storySay: async (text        ) => { if (storyInput) storyInput.value = text; await submitStoryInput(); return true; },
  storyLeave: () => closeStory(),
  storyCredits: (n        ) => { S.story.credits = n; persist(); render(); },
  storyRead: (path        ) => storyBridge.get(path),
  storyApply: (effects          ) => { const out = applyEffects(storyBridge, effects); persist(); render(); return out; },
  storySetProvider: (p                      ) => { setProvider(p ?? hybridProvider); render(); return getProvider().id; },
  // ---- LLM 外壳 / DIY 造件 ----
  get llm() { return { mode: loadMode(), backend: getBackend()?.name ?? null, status: llmStatus(), cfg: loadCfg() }; },
  get saves() { return { active: getActiveSlot(), slots: saveSlots }; },
  saveSlotsRefresh: async () => { saveSlots = await listSlots(); return saveSlots; },
  saveSnapshot: async (index) => saveSnapshot(index, S),
  loadSnapshot: async (index) => { const state = await loadSnapshot(index); if (!state) return false; await queueAutosave(state); await flushAutosave(); installSave(state); render(); return true; },
  switchSlot: async (slot) => { await flushAutosave(); setActiveSlot(slot); const state = await loadSlot(slot); S = freshSave(); if (state) installSave(state); saveSlots = await listSlots(); saveExists = !!state; render(); return getActiveSlot(); },
  clearActiveSlot: async () => { await clearSlot(getActiveSlot()); S = freshSave(); saveExists = false; saveSlots = await listSlots(); screen = 'title'; titleMode = meta.clears > 0 ? 'doctrine' : 'main'; render(); return true; },
  restoreRaw: async (raw) => { const state = typeof raw === 'string' ? JSON.parse(raw) : raw; await queueAutosave(state); await flushAutosave(); installSave(state); render(); return true; },
  aiSettingsOpen: () => { openAISettings(); return !!aiSettingsRoot; },
  aiSettingsClose: () => { closeAISettings(); return !aiSettingsRoot; },
  get onlineModeTour() { return { open: !!onlineModeTourRoot, pending: onlineTourPending, count: apiConnectCount(), step: localStorage.getItem(ONLINE_MODE_TOUR_KEY) }; },
  onlineModeTourOpen: (step = null) => openOnlineModeTour(step),
  onlineModeTourClose: (complete = true) => { closeOnlineModeTour(complete); return !onlineModeTourRoot; },
  get aiPrompts() { return { tasks: AI_PROMPT_TASKS.map((task) => ({ ...task })), overrides: loadPromptOverrides() }; },
  llmSetBackend: (b                   ) => { setBackend(b); render(); return getBackend()?.name ?? null; },
  llmEcho: () => { saveMode('echo'); restoreBackend(); render(); return getBackend()?.name ?? null; },
  llmOff: () => { saveMode('off'); restoreBackend(); render(); return getBackend()?.name ?? null; },
  llmClearConfig: () => { saveCfg(null); restoreBackend(); render(); return loadMode(); },
  get novel() { return structuredClone(S.novel); },
  novelOpen: () => { setArchiveSection('novel'); return archiveSection; },
  novelEnable: () => { enableNovelCampaign(); return S.novel.enabled; },
  novelSay: async (value) => { await runNovelTurn(value); return structuredClone(S.novel); },
  novelIssue: async () => { await issueNovelMission(); return structuredClone(S.novel.pendingMission); },
  novelChoiceOpen: (index = 0) => openNovelChoiceCard(S.novel.choices[index]),
  novelInputOpen: () => openNovelInputCard(),
  novelDecisionClose: (saveDraft = true) => { closeNovelDecisionCard(saveDraft, true); return !novelDecisionRoot; },
  get novelDecision() { return { open: !!novelDecisionRoot, mode: novelDecisionRoot?.dataset.mode ?? null, draft: S.novel.draft }; },
  get novelPrompts() { return loadNovelPromptStructure(); },
  novelPromptsOpen: () => { openNovelPromptManager(); return !!novelPromptRoot; },
  novelPromptsClose: () => { closeNovelPromptManager(); return !novelPromptRoot; },
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
