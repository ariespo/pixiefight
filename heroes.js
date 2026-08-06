// 麾下英雄：五个传奇种族的「具体个体」。有名字、等级(1-10)、特质、专精、疲劳与履历。
// 纯逻辑，不依赖 pixi —— 可以 node 直跑做数值平衡（.tmp/sim/champ*.mjs）。
import { kindById, LEGENDS, AURAS,                          } from './data.js';
import { gearEff, gearSet, mergeEff, NO_GEAR,                             } from './gear.js';

                                                                                                           
export const TRAITS                                                                 = {
  glutton: { name: '暴食', desc: '攻击+12%，生命-8%', good: true },
  prudent: { name: '谨慎', desc: '防御+4，攻速-8%', good: true },
  proud: { name: '骄矜', desc: '攻击+10%，疲劳增长+50%', good: false },
  loyal: { name: '忠拙', desc: '生命+14%，攻击-5%', good: true },
  swift: { name: '疾影', desc: '攻速+12%', good: true },
  grim: { name: '阴郁', desc: '光环强度+20%，生命-6%', good: true },
  diligent: { name: '勤恳', desc: '疲劳增长-40%', good: true },
  gifted: { name: '天资', desc: '全属性+6%，升级骨币+30%', good: true },
  // 新增普通
  greedy: { name: '贪婪', desc: '攻击+8%，战利品骨币+15%', good: true },
  tenacious: { name: '坚韧', desc: '生命+10%，受伤-5%', good: true },
  fanatic: { name: '狂热', desc: '攻速+10%，防御-3%', good: true },
  cunning: { name: '狡猾', desc: '普攻20%概率1.5倍伤害', good: true },
  calm: { name: '沉稳', desc: '技能冷却-10%', good: true },
  feral: { name: '野性', desc: '生命低于30%时攻击+20%', good: true },
  vengeful: { name: '复仇', desc: '倒下时反弹30%攻击伤害', good: true },
  guardian: { name: '护主', desc: '同房怪物生命+5%', good: true },
  bloodthirsty: { name: '嗜血', desc: '击杀回复5%生命', good: true },
  farsighted: { name: '远见', desc: '经验获取+20%', good: true },
  // 新增金色传奇
  undying_trait: { name: '不灭', desc: '首次倒下以50%生命复活', good: true, legend: true },
  demonblood: { name: '魔王之血', desc: '全属性+12%，光环+15%', good: true, legend: true },
  souldevour: { name: '噬魂', desc: '每击倒勇者永久+1攻击（上限30）', good: true, legend: true },
  divinefavor: { name: '神恩', desc: '受到致命伤害25%概率保留1点生命', good: true, legend: true },
  overlord: { name: '统御', desc: '同房怪物攻击+10%，攻速+10%', good: true, legend: true },
};

// 专精：Lv3/5/7/10 各开一个槽，每槽五选一。跨种族共用（数值取向不同，读起来一眼明白）
                      
                               
                                
                                  
                                    
// 每层三选一，且每一层都给"真机制"（复用 battle.ts 已实现的 MonEff 字段）——
// 英雄贵在稀有（名册 6、统领席 4、还会疲劳留伤），所以成长必须压过改造过的精英。
export const TALENTS                                                                        = {
  // 第一层
  t1hp: { name: '壮骨', desc: '生命 +20%，每秒回血 2', tier: 1 },
  t1atk: { name: '利爪', desc: '攻击 +20%，普攻破防 3', tier: 1 },
  t1aura: { name: '号令', desc: '光环 +25%，同房怪物攻击 +8%', tier: 1 },
  t1thorn: { name: '荆棘', desc: '反伤 +15%，生命 +10%', tier: 1 },
  t1hunter: { name: '猎手', desc: '对勇者伤害 +12%', tier: 1 },
  // 第二层
  t2def: { name: '铁皮', desc: '防御 +6，受伤 -12%，反弹 14% 伤害', tier: 2 },
  t2spd: { name: '迅捷', desc: '攻速 +20%，普攻溅射 30%', tier: 2 },
  t2aura: { name: '传令', desc: '光环 +25%，同房怪物受伤 -8%', tier: 2 },
  t2bulwark: { name: '盾墙', desc: '同房怪物防御 +4', tier: 2 },
  t2inspire: { name: '鼓舞', desc: '同房怪物攻速 +10%', tier: 2 },
  // 第三层
  t3cd: { name: '暴怒', desc: '技能冷却 -25%，越打越快', tier: 3 },
  t3revive: { name: '不朽', desc: '首次倒下以30%生命复活，并拉起一名同房怪物', tier: 3 },
  t3aura: { name: '统御', desc: '光环 +40%，嘲讽近战勇者', tier: 3 },
  t3abyss: { name: '深渊', desc: '技能伤害 +25%', tier: 3 },
  t3regen: { name: '再生', desc: '每秒回血 +6', tier: 3 },
  // 第四层
  t4exec: { name: '斩首', desc: '勇者残血40%以下伤害翻倍，普攻叠易伤', tier: 4 },
  t4blood: { name: '饮血', desc: '普攻吸血 30%，每秒回血 4', tier: 4 },
  t4lord: { name: '暴君', desc: '攻击 +25%，倒下时全场勇者受 40 伤害', tier: 4 },
  t4ruin: { name: '毁灭', desc: '攻击 +30%，生命 -10%', tier: 4 },
  t4warden: { name: '守护', desc: '生命 +25%，防御 +5', tier: 4 },
};
export const TALENT_TIERS               = [
  ['t1hp', 't1atk', 't1aura', 't1thorn', 't1hunter'],
  ['t2def', 't2spd', 't2aura', 't2bulwark', 't2inspire'],
  ['t3cd', 't3revive', 't3aura', 't3abyss', 't3regen'],
  ['t4exec', 't4blood', 't4lord', 't4ruin', 't4warden'],
];
export const TIER_LV = [3, 5, 7, 10];

                     
              
                                                                                            
               
                                 
             
                                            
                                
                                          
                              
                
                                                    
                                           
  

export const CHAMP_LV_CAP = 10;
export const CHAMP_XP = [40, 70, 110, 160, 220, 300, 400, 520, 660];
export const TALENT_CAP = TALENT_TIERS.length;
export const CHAMP_UP_COST = [30, 50, 75, 105, 140, 185, 240, 310, 400];
export const CHAMP_CAP = 6;   // 名册上限：比 4 个统领席多，才有轮换疲劳的余地
export const REST_MANA = 6;
export const REROLL_MANA = 5;
export const HEAL_MANA = 16;      // 疗一道伤
export const WOUND_CAP = 3;
export const WOUND_MULT = 0.08;   // 每道伤压 8% 属性
export const RESPEC_MANA = 14;    // 每个已选专精的洗点单价

export const REROLL_TRAIT_BONE = 200;
export const REROLL_TRAIT_MANA = 200;

export function rerollTraits(c, rng) {
  const keys = Object.keys(TRAITS);
  const normal = keys.filter((k) => !TRAITS[k].legend);
  const legend = keys.filter((k) => TRAITS[k].legend);
  const slots = Math.min(2, Math.max(1, c.traits.length) + (c.traits.length === 1 && rng() < 0.3 ? 1 : 0));
  const out = [];
  for (let i = 0; i < slots; i++) {
    const isLegend = rng() < 0.10;
    const pool = isLegend ? legend : normal;
    out.push(pool[Math.floor(rng() * pool.length)]);
  }
  c.traits = out;
}

// ---------- 称号：长期履历的读数，只取最高一档 ----------
                                                                                                          
export const TITLES          = [
  { name: '勇者克星', desc: '生命+6% 攻击+10%', hp: 1.06, atk: 1.1, need: '击倒20名勇者' },
  { name: '猎首', desc: '攻击+7%', atk: 1.07, need: '击倒10名勇者' },
  { name: '老兵', desc: '生命+8% 防御+2', hp: 1.08, def: 2, need: '参战10场' },
  { name: '守门', desc: '生命+4%', hp: 1.04, need: '参战4场' },
];
export function titleOf(c       )               {
  if (c.kills >= 20) return TITLES[0];
  if (c.kills >= 10) return TITLES[1];
  if (c.battles >= 10) return TITLES[2];
  if (c.battles >= 4) return TITLES[3];
  return null;
}
export function nextTitle(c       )                                  {
  if (c.kills < 10) return { t: TITLES[1], at: `再击倒${10 - c.kills}名勇者` };
  if (c.kills < 20) return { t: TITLES[0], at: `再击倒${20 - c.kills}名勇者` };
  return null;
}

// ---------- 同僚关系：由"谁和谁同时上阵"决定，是布阵层面的取舍 ----------
;                                                                                           
const NO_CHEM          = { atk: 1, hp: 1, aura: 1, xp: 1, tags: [] };
export const CHEM_INFO = [
  { name: '同族共鸣', desc: '同族英雄同时上阵：光环 +12%' },
  { name: '争功', desc: '两名骄矜同时上阵：攻击 -10%' },
  { name: '老带新', desc: 'Lv7+ 与 Lv3- 同阵：新人经验 +50%、生命 +8%' },
  { name: '孤高', desc: '全场只派一名英雄：该英雄攻击 +12%' },
];

export function chemistry(champs         , seated          )                                                    {
  const map                          = {};
  const lines           = [];
  const on = champs.filter((c) => seated.includes(c.uid));
  for (const c of on) map[c.uid] = { atk: 1, hp: 1, aura: 1, xp: 1, tags: [] };
  if (!on.length) return { map, lines };
  const add = (c       , k                              , v        , tag        ) => {
    const e = map[c.uid]; e[k] *= v; if (!e.tags.includes(tag)) e.tags.push(tag);
  };
  // 同族共鸣
  for (const c of on) {
    if (on.some((o) => o !== c && o.race === c.race)) add(c, 'aura', 1.12, '同族共鸣');
  }
  if (on.some((c) => map[c.uid].tags.includes('同族共鸣'))) lines.push('同族共鸣：光环 +12%');
  // 争功
  const proud = on.filter((c) => c.traits.includes('proud'));
  if (proud.length >= 2) {
    for (const c of proud) add(c, 'atk', 0.9, '争功');
    lines.push('争功：两名骄矜互相较劲，攻击 -10%');
  }
  // 老带新
  const vets = on.filter((c) => c.lv >= 7);
  const rookies = on.filter((c) => c.lv <= 3);
  if (vets.length && rookies.length) {
    for (const c of rookies) { add(c, 'xp', 1.5, '老带新'); add(c, 'hp', 1.08, '老带新'); }
    for (const c of vets) add(c, 'aura', 1, '带新人');
    lines.push('老带新：新人经验 +50%、生命 +8%');
  }
  // 孤高
  if (on.length === 1) { add(on[0], 'atk', 1.12, '孤高'); lines.push('孤高：独自上阵，攻击 +12%'); }
  return { map, lines };
}
export const chemOf = (map                         , uid        ) => map[uid] ?? NO_CHEM;

export const xpNeed = (lv        ) => CHAMP_XP[Math.min(CHAMP_XP.length - 1, lv - 1)];
export const upCostOf = (c       ) =>
  Math.round(CHAMP_UP_COST[Math.min(CHAMP_UP_COST.length - 1, c.lv - 1)] * (c.traits.includes('gifted') ? 1.3 : 1));
export const canLevel = (c       ) => c.lv < CHAMP_LV_CAP && c.xp >= xpNeed(c.lv);
export const talentSlots = (c       ) => TIER_LV.filter((lv) => c.lv >= lv).length;
export const pendingTier = (c       ) => (c.talents.length < talentSlots(c) ? c.talents.length + 1 : 0);

// ---------- 名字 ----------
// 每族一套姓氏/名词根，拼出来的名字有种族味道，不用外部资源。
const NAME_PARTS                                                         = {
  lich: { given: ['瓦兹', '尼赫', '莫尔金', '塞卡', '阿兹拉', '费恩', '柯洛斯'], epithet: ['低语者', '守碑人', '寒烛', '灰誓', '数骨者'] },
  bonedragon: { given: ['卡尔戈', '恩塔', '瑟兰', '德罗姆', '奥格瑞', '维斯克'], epithet: ['霜牙', '断翼', '余烬', '深喉', '碎壁者', '旧灾'] },
  hundredarm: { given: ['戈莫', '塔恩', '布鲁德', '海姆', '奥卡', '朗迦'], epithet: ['举山者', '不动', '千掌', '石背', '闷雷', '拦路'] },
  beholder: { given: ['扎克斯', '缪缇', '欧尔', '瑟维', '格拉兹', '伊什'], epithet: ['多疑', '不眠', '窥隙', '定影', '斜视', '看客'] },
  mindflayer: { given: ['伊尔哈', '努祖', '瓦尔缇', '克瑟', '梅洛', '希兰'], epithet: ['吮忆者', '空壳', '牵线人', '低频', '换声', '拾梦'] },
  plaguelord: { given: ['莫尔本', '格利姆', '瓦沙', '恺撒尔', '腓恩', '奥兹曼'], epithet: ['敲钟人', '不愈', '第九疫', '掘坑者', '收殓', '慢腐'] },
  magmagolem: { given: ['铎鲁', '恩伯', '卡兰姆', '斯拉格', '沃恩', '铁基'], epithet: ['未熄', '炉心', '压门', '红纹', '钝锤', '不退'] },
  broodqueen: { given: ['阿拉赫', '缇丝', '沃芙', '涅斯特', '莉盖', '希缇'], epithet: ['结网者', '八目', '织巢', '产房', '悬丝', '守卵'] },
};

export function randomName(race        , rng              , taken           = [])         {
  const p = NAME_PARTS[race] ?? NAME_PARTS.lich;
  for (let i = 0; i < 30; i++) {
    const g = p.given[Math.floor(rng() * p.given.length)];
    const e = p.epithet[Math.floor(rng() * p.epithet.length)];
    const n = `${g}·${e}`;
    if (!taken.includes(n)) return n;
  }
  return `${p.given[0]}·${Math.floor(rng() * 900 + 100)}`;
}

// ---------- 候选（征召池） ----------
;                                                                                                      
export const POT_NAME = ['丙', '乙', '甲'];
export const POT_MULT = [1, 1.06, 1.13];   // 资质：属性小幅上浮

export function rollCands(raidNo        , unlocked          , rng              , idBase        , n = 3)         {
  let pool = LEGENDS.filter((l) => raidNo >= (l.legendMin ?? 1) || unlocked.includes(l.id));
  // 第1轮就要能征召到第一位英雄：池空时放开门槛最低的一族
  if (!pool.length) {
    const first = [...LEGENDS].sort((a, b2) => (a.legendMin ?? 1) - (b2.legendMin ?? 1))[0];
    pool = first ? [first] : [];
  }
  const out         = [];
  if (!pool.length) return out;
  const keys = Object.keys(TRAITS).filter((k) => !TRAITS[k].legend);
  // 种族轮转：把可选族洗牌后按顺序发，池子够大时同批不重复族
  const bag = pool.map((l) => l.id);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  for (let i = 0; i < n; i++) {
    const race = bag[i % bag.length];
    const traits            = [keys[Math.floor(rng() * keys.length)]];
    if (rng() < 0.45) {
      const t2 = keys[Math.floor(rng() * keys.length)];
      if (t2 !== traits[0]) traits.push(t2);
    }
    const r = rng();
    out.push({ id: idBase + i, race, name: randomName(race, rng), traits, potential: r < 0.12 ? 2 : r < 0.42 ? 1 : 0 });
  }
  return out;
}

export function newChamp(uid        , c      )        {
  return {
    uid, race: c.race, name: c.name, lv: 1, xp: 0,
    traits: [...c.traits], talents: [], fatigue: 0,
    battles: 0, kills: 0, wounds: 0, gear: {},
    activeTitle: '',
    stats: {},
  };
}
export const champGear = (c       )          => gearEff(c.gear);
export const woundGuarded = (c       ) => gearEff(c.gear).woundGuard;
export const xpMultOf = (c       ) => gearEff(c.gear).xp;
export { NO_GEAR };
export const respecCost = (c       ) => c.talents.length * RESPEC_MANA;

// ---------- 数值 ----------
                         
                                                      
                                                    
                                                      
                                          
              
  

// 等级成长：Lv10 ≈ Lv1 的 2.9 倍（兵种 Lv5 封顶 1.85），英雄要能压过改造精英
export const champMult = (lv        ) => 1 + 0.21 * (lv - 1);
// 攻速也随等级长：原先恒定 0.6，导致"改造精英攻速 1.19"直接把高级英雄的 DPS 比下去
export const champSpdMult = (lv        ) => 1 + 0.06 * (lv - 1);
// 名号加成：LEGENDS 的基础数值是按"光环载体"定的（骨龙 atk40 < 精英骨龙 atk60），
// 直接拿来当英雄必然被改造精英碾压。一个有名有姓的个体本就比同族杂兵强 —— 这一层补差。
export const CHAMP_BASE = { hp: 1.2, atk: 1.45, def: 1.2, spd: 1.15 };

export function fatigueTier(f        ) {
  if (f >= 85) return { mult: 0.7, text: '力竭', bad: true };
  if (f >= 60) return { mult: 0.85, text: '疲惫', bad: true };
  if (f >= 35) return { mult: 1, text: '略乏', bad: false };
  return { mult: 1, text: '充沛', bad: false };
}

export function champStats(c       , potentialMult = 1, chem          = NO_CHEM)            {
  const k = kindById(c.race) ;
  const ge = gearEff(c.gear);
  const set = gearSet(c.gear);
  const wound = 1 - WOUND_MULT * Math.min(WOUND_CAP, c.wounds || 0);
  const m = champMult(c.lv) * potentialMult * fatigueTier(c.fatigue).mult * wound;
  let hp = k.hp * CHAMP_BASE.hp * m, atk = k.atk * CHAMP_BASE.atk * m,
      def = k.def * CHAMP_BASE.def * champMult(c.lv), spd = k.spd * CHAMP_BASE.spd * champSpdMult(c.lv);
  let auraPow = 1, dmgTaken = 1;
  const eff         = { ...k.eff };
  for (const t of c.traits) {
    if (t === 'glutton') { atk *= 1.12; hp *= 0.92; }
    if (t === 'prudent') { def += 4; spd *= 0.92; }
    if (t === 'proud') atk *= 1.1;
    if (t === 'loyal') { hp *= 1.14; atk *= 0.95; }
    if (t === 'swift') spd *= 1.12;
    if (t === 'grim') { auraPow *= 1.2; hp *= 0.94; }
    if (t === 'gifted') { hp *= 1.06; atk *= 1.06; def += 1; }
  }
  for (const t of c.talents) {
    if (t === 't1hp') { hp *= 1.2; eff.hpRegen = (eff.hpRegen ?? 0) + 2; }
    if (t === 't1atk') { atk *= 1.2; eff.onHit = eff.onHit ?? 'sunder'; }
    if (t === 't1aura') { auraPow *= 1.25; eff.rageAura = (eff.rageAura ?? 1) * 1.08; }
    if (t === 't2def') { def += 6; dmgTaken *= 0.88; eff.thorns = (eff.thorns ?? 0) + 0.14; }
    if (t === 't2spd') { spd *= 1.2; eff.splash = Math.max(eff.splash ?? 0, 0.3); }
    if (t === 't2aura') { auraPow *= 1.25; eff.bulwarkAura = (eff.bulwarkAura ?? 1) * 0.92; }
    if (t === 't3cd') { eff.skillCdMult = (eff.skillCdMult ?? 1) * 0.75; eff.frenzy = true; }
    if (t === 't3revive') { eff.passive = 'revive'; eff.reviveAlly = true; }
    if (t === 't3aura') { auraPow *= 1.4; eff.anchorHold = true; }
    if (t === 't4exec') { eff.execute = Math.max(eff.execute ?? 0, 0.4); eff.markHit = (eff.markHit ?? 0) + 0.08; }
    if (t === 't4blood') { eff.lifestealPct = Math.max(eff.lifestealPct ?? 0, 0.3); eff.hpRegen = (eff.hpRegen ?? 0) + 4; }
    if (t === 't4lord') { atk *= 1.25; eff.deathBurst = Math.max(eff.deathBurst ?? 0, 40); }
    if (t === 't1thorn') { hp *= 1.1; eff.thorns = (eff.thorns ?? 0) + 0.15; }
    if (t === 't1hunter') { eff.dmgToHero = (eff.dmgToHero ?? 1) * 1.12; }
    if (t === 't2bulwark') { eff.allyDef = (eff.allyDef ?? 0) + 4; }
    if (t === 't2inspire') { eff.allySpd = (eff.allySpd ?? 1) * 1.10; }
    if (t === 't3abyss') { eff.skillDmg = (eff.skillDmg ?? 1) * 1.25; }
    if (t === 't3regen') { eff.hpRegen = (eff.hpRegen ?? 0) + 6; }
    if (t === 't4ruin') { atk *= 1.30; hp *= 0.9; }
    if (t === 't4warden') { hp *= 1.25; def += 5; }
  }
  const ti = titleOf(c);
  if (ti) { hp *= ti.hp ?? 1; atk *= ti.atk ?? 1; def += ti.def ?? 0; }
  // 装备与套装：和特质/专精同层相乘，最后再叠同僚效应
  hp *= ge.hp * (set?.hp ?? 1); atk *= ge.atk; def += ge.def; spd *= ge.spd;
  auraPow *= ge.aura * (set?.aura ?? 1); dmgTaken *= ge.dmgTaken;
  if (ge.cd !== 1) eff.skillCdMult = (eff.skillCdMult ?? 1) * ge.cd;
  mergeEff(eff, ge.eff);        // 铭文机制（反伤/吸血/嘲讽…）与词缀走同一套 MonEff 字段
  atk *= chem.atk; hp *= chem.hp; auraPow *= chem.aura;
  return {
    name: c.name, race: c.race, tex: k.tex, lv: c.lv,
    hp: Math.max(1, Math.round(hp)), atk: Math.max(1, Math.round(atk)), def: Math.round(def),
    spd: Math.max(0.15, +spd.toFixed(3)),
    auraId: k.aura ?? 'atk', auraPow: +auraPow.toFixed(3), dmgTakenMult: +dmgTaken.toFixed(3), eff,
  };
}

export const auraText = (id        , pow        ) => {
  const a = AURAS[id];
  const pct = (base        ) => `${Math.round(base * pow * 100)}%`;
  switch (id) {
    case 'atk': return `同房兵种攻击 +${pct(0.25)}`;
    case 'guard': return `同房兵种受伤 -${pct(0.2)}`;
    case 'haste': return `同房兵种攻速 +${pct(0.2)}`;
    case 'gaze': return `本房勇者技能冷却慢 ${pct(0.25)}`;
    case 'undying': return `兵种复活生命 ${pct(0.3)}`;
    default: return a.desc;
  }
};

// 战后疲劳结算：参战涨、留守降
export function tickFatigue(champs         , seated          ) {
  for (const c of champs) {
    if (seated.includes(c.uid)) {
      const base = c.traits.includes('proud') ? 45 : c.traits.includes('diligent') ? 18 : 30;
      // 带伤上阵更容易累：伤和疲劳互相放大，这是"该轮换了"的信号
      const g = (base + 8 * Math.min(WOUND_CAP, c.wounds || 0)) * gearEff(c.gear).fatigue;
      c.fatigue = Math.min(100, c.fatigue + g);
      c.battles++;
    } else {
      c.fatigue = Math.max(0, c.fatigue - 25);
    }
  }
}
