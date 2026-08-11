// 麾下英雄：五个传奇种族的「具体个体」。有名字、等级(1-10)、特质、专精、疲劳与履历。
// 纯逻辑，不依赖 pixi —— 可以 node 直跑做数值平衡（.tmp/sim/champ*.mjs）。
import { kindById, LEGENDS, AURAS,                          } from './data.js';
import { graftKind } from './modules.js';
import { gearEff, gearSet, mergeEff, NO_GEAR,                             } from './gear.js';

                                                                                                           
export const TRAITS                                                                 = {
  glutton: { name: '暴食', desc: '攻击+12%，生命-8%', good: true, rarity: 'common' },
  prudent: { name: '谨慎', desc: '防御+4，攻速-8%', good: true, rarity: 'common' },
  proud: { name: '骄矜', desc: '攻击+10%，疲劳增长+50%', good: false, rarity: 'curse' },
  loyal: { name: '忠拙', desc: '生命+14%，攻击-5%', good: true, rarity: 'common' },
  swift: { name: '疾影', desc: '攻速+12%', good: true, rarity: 'common' },
  grim: { name: '阴郁', desc: '光环强度+20%，生命-6%', good: true, rarity: 'common' },
  diligent: { name: '勤恳', desc: '疲劳增长-40%', good: true, rarity: 'common' },
  gifted: { name: '天资', desc: '全属性+6%，升级骨币+30%', good: true, rarity: 'common' },
  // 新增普通
  greedy: { name: '贪婪', desc: '攻击+8%，战利品骨币+15%', good: true, rarity: 'rare' },
  tenacious: { name: '坚韧', desc: '生命+10%，受伤-5%', good: true, rarity: 'rare' },
  fanatic: { name: '狂热', desc: '攻速+10%，防御-3%', good: true, rarity: 'rare' },
  cunning: { name: '狡猾', desc: '普攻20%概率1.5倍伤害', good: true, rarity: 'rare' },
  calm: { name: '沉稳', desc: '技能冷却-10%', good: true, rarity: 'rare' },
  feral: { name: '野性', desc: '生命低于30%时攻击+20%', good: true, rarity: 'rare' },
  vengeful: { name: '复仇', desc: '倒下时反弹30%攻击伤害', good: true, rarity: 'rare' },
  guardian: { name: '护主', desc: '同房怪物生命+5%', good: true, rarity: 'rare' },
  bloodthirsty: { name: '嗜血', desc: '击杀回复5%生命', good: true, rarity: 'rare' },
  farsighted: { name: '远见', desc: '经验获取+20%', good: true, rarity: 'rare' },
  // 新增金色传奇
  undying_trait: { name: '不灭', desc: '首次倒下以50%生命复活', good: true, legend: true, rarity: 'legend' },
  demonblood: { name: '魔王之血', desc: '全属性+12%，光环+15%', good: true, legend: true, rarity: 'legend' },
  souldevour: { name: '噬魂', desc: '每击倒勇者永久+1攻击（上限30）', good: true, legend: true, rarity: 'legend' },
  divinefavor: { name: '神恩', desc: '受到致命伤害25%概率保留1点生命', good: true, legend: true, rarity: 'legend' },
  overlord: { name: '统御', desc: '同房怪物攻击+10%，攻速+10%', good: true, legend: true, rarity: 'legend' },
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
export const HERO_SORTIE_LIMIT = 4;
export const HERO_REST_ROUNDS = 3;
export const REST_MANA = 20;
export const REROLL_MANA = 5;
export const HEAL_MANA = 16;      // 疗一道伤
export const WOUND_CAP = 3;
export const WOUND_MULT = 0.08;   // 每道伤压 8% 属性
export const RESPEC_MANA = 14;    // 每个已选专精的洗点单价

export const REROLL_TRAIT_BONE = 200;
export const REROLL_TRAIT_MANA = 200;

// 英雄档案只提供叙事身份，不额外叠加数值，避免旧存档因补档案而改变强度。
export const PERSONALITIES = [
  { id: 'quiet', name: '寡言', desc: '习惯先观察再行动，很少把判断说出口。' },
  { id: 'bold', name: '果敢', desc: '面对强敌会主动迎上去，相信迟疑比受伤更危险。' },
  { id: 'cunning', name: '机敏', desc: '擅长从规则缝隙里找机会，也乐于给敌人布下误判。' },
  { id: 'loyal', name: '重诺', desc: '把承诺看得比战利品重要，从不抛下同阵的伙伴。' },
  { id: 'curious', name: '好奇', desc: '对地牢机关与陌生魔法充满兴趣，常在战后做记录。' },
  { id: 'stern', name: '严谨', desc: '凡事讲究次序和准备，对草率的计划没有耐心。' },
  { id: 'warm', name: '温厚', desc: '善于照顾伤员，也能让脾气古怪的同伴安静下来。' },
  { id: 'proud', name: '自负', desc: '确信自己能扭转败局，不愿让任何人看见软弱。' },
  { id: 'restless', name: '躁动', desc: '无法忍受漫长等待，总想率先试探未知的道路。' },
  { id: 'melancholy', name: '忧郁', desc: '记得每一次失败与离别，因此比旁人更珍惜胜利。' },
  { id: 'wry', name: '诙谐', desc: '越是危险越爱说冷笑话，用轻松掩饰紧张。' },
  { id: 'devout', name: '虔执', desc: '遵循一套只属于自己的仪式，并从中获得坚定。' },
];

export const BACKGROUNDS = [
  { id: 'gravewatch', name: '墓园守夜者', story: '曾独自在荒废墓园守过七十个夜晚。后来墓碑开始回答问题，它便循着低语来到地牢，想找到声音真正的主人。' },
  { id: 'caravan', name: '失散商队', story: '原本替一支地下商队护送货物。一次塌方吞没了队伍与道路，只留下它和一张写满欠账的旧清单。' },
  { id: 'arena', name: '斗场余生', story: '在黑市斗场里活过许多轮厮杀，学会从观众的呼吸判断危险。逃出铁笼后，它决定只为自己认可的统领战斗。' },
  { id: 'archive', name: '禁书抄写员', story: '曾为一座修道院誊写禁书，因为偷偷保留了一页会自行改写的手稿而被放逐。那一页至今仍藏在行囊深处。' },
  { id: 'border', name: '边境遗民', story: '故乡在勇者远征中化为焦土。它记不清村庄原来的名字，却记得每一面参与围攻的旗帜。' },
  { id: 'pilgrim', name: '逆行朝圣者', story: '与朝圣队伍背道而行，专门前往被祝福之地的阴影。它相信真正的答案总藏在光照不到的角落。' },
  { id: 'workshop', name: '废炉学徒', story: '在一座废弃锻造厂里长大，能凭敲击声判断金属的裂纹。它来地牢寻找足够古老、值得重新点燃的炉火。' },
  { id: 'deserter', name: '勇者逃兵', story: '曾短暂加入勇者军，却在第一次清剿中放走了幼小怪物。从那以后，它的名字同时出现在通缉令和怪物酒馆的账本上。' },
  { id: 'dreamer', name: '梦境漂流者', story: '醒来时身边只有一枚陌生钥匙和不属于自己的记忆。每深入地牢一层，那段记忆就会变得更清晰。' },
  { id: 'undertaker', name: '无名收殓人', story: '替敌我双方收敛遗骸多年，从尸骨上的伤痕学会战斗。它不敬畏死亡，只厌恶毫无意义的牺牲。' },
  { id: 'exile', name: '王庭放逐者', story: '因拒绝执行一次屠村命令被逐出旧王庭。它保留着断裂的徽记，等待有一天证明忠诚不等于服从。' },
  { id: 'deepborn', name: '深层原住民', story: '出生在地图尚未标出的地底深处，熟悉岩层移动的声音。它说这座地牢正在醒来，而勇者只是最先听见动静的人。' },
];

export const personalityById = (id) => PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
export const backgroundById = (id) => BACKGROUNDS.find((p) => p.id === id) ?? BACKGROUNDS[0];

function loreSeed(c) {
  const text = `${c.race ?? ''}|${c.name ?? ''}|${c.id ?? c.uid ?? 0}`;
  let h = 2166136261;
  for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function ensureChampLore(c) {
  const seed = loreSeed(c);
  if (!PERSONALITIES.some((p) => p.id === c.personality)) c.personality = PERSONALITIES[seed % PERSONALITIES.length].id;
  if (!BACKGROUNDS.some((p) => p.id === c.background)) c.background = BACKGROUNDS[Math.floor(seed / 17) % BACKGROUNDS.length].id;
  return c;
}

export function rerollTraits(c, rng) {
  const keys = Object.keys(TRAITS);
  const normal = keys.filter((k) => !TRAITS[k].legend);
  const legend = keys.filter((k) => TRAITS[k].legend);
  const slots = Math.min(2, Math.max(1, c.traits.length) + (c.traits.length === 1 && rng() < 0.3 ? 1 : 0));
  const out = [];
  for (let i = 0; i < slots; i++) {
    const isLegend = rng() < 0.10;
    const pool = isLegend ? legend : normal;
    let pick;
    do { pick = pool[Math.floor(rng() * pool.length)]; } while (i > 0 && pick === out[0]);
    out.push(pick);
  }
  c.traits = out;
}

// ---------- 称号：长期履历的读数，可切换已解锁称号 ----------
function reqValue(c, s, key) {
  if (key === 'battles') return c.battles ?? 0;
  if (key === 'kills') return c.kills ?? 0;
  return s[key] ?? 0;
}
function reqMet(c, s, req) {
  return Object.entries(req).every(([k, v]) => reqValue(c, s, k) >= v);
}
const REQ_NAME = {
  battles: '场战斗',
  kills: '次击杀',
  healDone: '点治疗',
  revives: '次复活',
  thornDmg: '点反伤',
  attacks: '次普攻',
  dmgDealt: '点输出',
};
function reqGap(c, s, req) {
  let max = 0;
  const parts = [];
  for (const [k, v] of Object.entries(req)) {
    const left = Math.max(0, v - reqValue(c, s, k));
    if (left > 0) parts.push({ k, left });
    if (left > max) max = left;
  }
  return { max, parts };
}

export const TITLES = [
  // 参战维度
  { id: 'gatekeeper', name: '守门人', desc: '生命 +4%', stats: { hp: 1.04 }, req: { battles: 4 } },
  { id: 'veteran', name: '老兵', desc: '生命 +8% 防御 +2', stats: { hp: 1.08, def: 2 }, req: { battles: 10 } },
  { id: 'warmaster', name: '战争大师', desc: '生命 +12% 防御 +4', stats: { hp: 1.12, def: 4 }, req: { battles: 25 } },
  { id: 'immortal', name: '不灭传说', desc: '生命 +18% 防御 +6 攻速 +5%', stats: { hp: 1.18, def: 6, spd: 1.05 }, req: { battles: 40 } },
  { id: 'champion', name: '斗场冠军', desc: '生命 +10% 攻击 +5%', stats: { hp: 1.10, atk: 1.05 }, req: { battles: 60 } },
  // 击杀维度
  { id: 'hunter', name: '猎首', desc: '攻击 +7%', stats: { atk: 1.07 }, req: { kills: 10 } },
  { id: 'slayer', name: '勇者克星', desc: '生命 +6% 攻击 +10%', stats: { hp: 1.06, atk: 1.10 }, req: { kills: 20 } },
  { id: 'executioner', name: '处刑人', desc: '攻击 +15%', stats: { atk: 1.15 }, req: { kills: 50 } },
  { id: 'reaper', name: '死神', desc: '攻击 +20% 攻速 +5%', stats: { atk: 1.20, spd: 1.05 }, req: { kills: 100 } },
  { id: 'legend_slayer', name: '传奇猎杀者', desc: '攻击 +25% 生命 +8%', stats: { atk: 1.25, hp: 1.08 }, req: { kills: 200 } },
  // 回复维度
  { id: 'healer', name: '愈者', desc: '每秒回血 +2', stats: { hpRegen: 2 }, req: { healDone: 500 } },
  { id: 'mender', name: '修复师', desc: '每秒回血 +4', stats: { hpRegen: 4 }, req: { healDone: 2000 } },
  { id: 'restorer', name: '复苏者', desc: '每秒回血 +6 生命 +5%', stats: { hpRegen: 6, hp: 1.05 }, req: { healDone: 5000 } },
  { id: 'lifegiver', name: '生命之源', desc: '每秒回血 +8 生命 +10%', stats: { hpRegen: 8, hp: 1.10 }, req: { healDone: 10000 } },
  { id: 'legend_healer', name: '不朽医者', desc: '每秒回血 +12 生命 +12%', stats: { hpRegen: 12, hp: 1.12 }, req: { healDone: 20000 } },
  // 复活维度
  { id: 'reviver', name: '还魂者', desc: '复活生命 +10%', stats: { reviveHp: 0.10 }, req: { revives: 3 } },
  { id: 'resurrector', name: '复活者', desc: '复活生命 +20%', stats: { reviveHp: 0.20 }, req: { revives: 10 } },
  { id: 'phoenix', name: '凤凰', desc: '复活生命 +30% 攻击 +5%', stats: { reviveHp: 0.30, atk: 1.05 }, req: { revives: 25 } },
  { id: 'undying', name: '不死者', desc: '复活生命 +40% 生命 +5%', stats: { reviveHp: 0.40, hp: 1.05 }, req: { revives: 50 } },
  { id: 'legend_reviver', name: '轮回之主', desc: '复活生命 +50% 生命 +10% 攻击 +10%', stats: { reviveHp: 0.50, hp: 1.10, atk: 1.10 }, req: { revives: 100 } },
  // 反伤维度
  { id: 'thorn', name: '荆棘', desc: '反伤 +5%', stats: { thorns: 0.05 }, req: { thornDmg: 200 } },
  { id: 'spiker', name: '尖刺', desc: '反伤 +10%', stats: { thorns: 0.10 }, req: { thornDmg: 800 } },
  { id: 'porcupine', name: '猬甲', desc: '反伤 +15% 防御 +2', stats: { thorns: 0.15, def: 2 }, req: { thornDmg: 2000 } },
  { id: 'mirror', name: '镜反', desc: '反伤 +20% 防御 +4', stats: { thorns: 0.20, def: 4 }, req: { thornDmg: 5000 } },
  { id: 'legend_thorn', name: '荆棘王座', desc: '反伤 +30% 防御 +6 生命 +8%', stats: { thorns: 0.30, def: 6, hp: 1.08 }, req: { thornDmg: 10000 } },
  // 攻速维度
  { id: 'quick', name: '快手', desc: '攻速 +5%', stats: { spd: 1.05 }, req: { attacks: 100 } },
  { id: 'agile', name: '敏捷', desc: '攻速 +10%', stats: { spd: 1.10 }, req: { attacks: 500 } },
  { id: 'swiftlord', name: '迅捷领主', desc: '攻速 +15% 攻击 +3%', stats: { spd: 1.15, atk: 1.03 }, req: { attacks: 1500 } },
  { id: 'blitz', name: '闪电', desc: '攻速 +20% 攻击 +5%', stats: { spd: 1.20, atk: 1.05 }, req: { attacks: 4000 } },
  { id: 'legend_speed', name: '风暴化身', desc: '攻速 +25% 攻击 +10%', stats: { spd: 1.25, atk: 1.10 }, req: { attacks: 8000 } },
  // 攻击维度
  { id: 'bruiser', name: '碎骨者', desc: '攻击 +5%', stats: { atk: 1.05 }, req: { dmgDealt: 1000 } },
  { id: 'brute', name: '蛮力', desc: '攻击 +10%', stats: { atk: 1.10 }, req: { dmgDealt: 5000 } },
  { id: 'destroyer', name: '毁灭者', desc: '攻击 +15% 生命 +3%', stats: { atk: 1.15, hp: 1.03 }, req: { dmgDealt: 15000 } },
  { id: 'annihilator', name: '湮灭者', desc: '攻击 +20% 生命 +5%', stats: { atk: 1.20, hp: 1.05 }, req: { dmgDealt: 40000 } },
  { id: 'legend_power', name: '天灾', desc: '攻击 +30% 生命 +10%', stats: { atk: 1.30, hp: 1.10 }, req: { dmgDealt: 100000 } },
  // 4 个高要求传奇称号
  { id: 'legend_war', name: '战争神话', desc: '全属性 +10%', stats: { hp: 1.10, atk: 1.10, def: 5, spd: 1.10 }, req: { battles: 40, kills: 200 } },
  { id: 'legend_tank', name: '不朽壁垒', desc: '生命 +25% 防御 +10 反伤 +10%', stats: { hp: 1.25, def: 10, thorns: 0.10 }, req: { thornDmg: 10000, healDone: 20000 } },
  { id: 'legend_dps', name: '毁灭风暴', desc: '攻击 +25% 攻速 +15%', stats: { atk: 1.25, spd: 1.15 }, req: { dmgDealt: 100000, attacks: 8000 } },
  { id: 'legend_rebirth', name: '轮回帝君', desc: '生命 +15% 攻击 +15% 复活生命 +30%', stats: { hp: 1.15, atk: 1.15, reviveHp: 0.30 }, req: { revives: 100, kills: 200 } },
];

for (const t of TITLES) t.need = (c, s) => reqMet(c, s, t.req);

export function unlockedTitles(c) {
  return TITLES.filter((t) => t.need(c, c.stats ?? {})).map((t) => t.id);
}
export function titleById(id) {
  return TITLES.find((t) => t.id === id) ?? null;
}
export function activeTitleOf(c) {
  const unlocked = unlockedTitles(c);
  if (unlocked.includes(c.activeTitle)) return titleById(c.activeTitle);
  const best = TITLES.filter((t) => unlocked.includes(t.id)).pop();
  return best ?? null;
}
// 兼容旧调用：用 activeTitleOf 替代 titleOf
export function titleOf(c) { return activeTitleOf(c); }
export function nextTitle(c) {
  const s = c.stats ?? {};
  const unlocked = unlockedTitles(c);
  const locked = TITLES.filter((t) => !unlocked.includes(t.id));
  if (!locked.length) return null;
  let best = locked[0];
  let bestGap = reqGap(c, s, best.req);
  for (const t of locked.slice(1)) {
    const g = reqGap(c, s, t.req);
    if (g.max < bestGap.max) { best = t; bestGap = g; }
  }
  const hint = bestGap.parts
    .sort((a, b) => a.left - b.left)
    .slice(0, 2)
    .map((p) => `差${p.left}${REQ_NAME[p.k] ?? p.k}`)
    .join('／');
  return { t: best, at: hint || '继续战斗解锁更多称号' };
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
    out.push(ensureChampLore({ id: idBase + i, race, name: randomName(race, rng), traits, potential: r < 0.12 ? 2 : r < 0.42 ? 1 : 0 }));
  }
  return out;
}

export function newChamp(uid        , c      )        {
  return ensureChampLore({
    uid, race: c.race, name: c.name, lv: 1, xp: 0,
    traits: [...c.traits], talents: [], fatigue: 0,
    personality: c.personality, background: c.background,
    battles: 0, kills: 0, wounds: 0, sorties: 0, restTurns: 0, gear: {},
    activeTitle: '',
    stats: {},
  });
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
  // 英雄与怪物共用四部位派生规则；培养加成叠在改造后的种族底模上。
  const k = graftKind(kindById(c.race) , c.graft);
  const ge = gearEff(c.gear);
  const set = gearSet(c.gear);
  const wound = 1 - WOUND_MULT * Math.min(WOUND_CAP, c.wounds || 0);
  const m = champMult(c.lv) * potentialMult * fatigueTier(c.fatigue).mult * wound;
  let hp = k.hp * CHAMP_BASE.hp * m, atk = k.atk * CHAMP_BASE.atk * m,
      def = k.def * CHAMP_BASE.def * champMult(c.lv), spd = k.spd * CHAMP_BASE.spd * champSpdMult(c.lv);
  let auraPow = 1, dmgTaken = 1, xpMult = 1;
  const eff         = { ...k.eff };
  for (const t of c.traits) {
    if (t === 'glutton') { atk *= 1.12; hp *= 0.92; }
    if (t === 'prudent') { def += 4; spd *= 0.92; }
    if (t === 'proud') atk *= 1.1;
    if (t === 'loyal') { hp *= 1.14; atk *= 0.95; }
    if (t === 'swift') spd *= 1.12;
    if (t === 'grim') { auraPow *= 1.2; hp *= 0.94; }
    if (t === 'gifted') { hp *= 1.06; atk *= 1.06; def += 1; }
    if (t === 'greedy') atk *= 1.08;
    if (t === 'tenacious') { hp *= 1.10; dmgTaken *= 0.95; }
    if (t === 'fanatic') { spd *= 1.10; def -= 3; }
    if (t === 'cunning') { eff.cunning = 0.20; eff.cunningMult = 1.5; }
    if (t === 'calm') eff.skillCdMult = (eff.skillCdMult ?? 1) * 0.90;
    if (t === 'feral') atk *= 1.10; // 简化：常驻 +10%（战斗外无当前血量）
    if (t === 'vengeful') eff.vengeful = 0.30;
    if (t === 'guardian') eff.allyHp = 1.05;
    if (t === 'bloodthirsty') eff.bloodthirsty = 0.05;
    if (t === 'farsighted') xpMult *= 1.20;
    if (t === 'undying_trait') { eff.undyingTrait = 0.50; }
    if (t === 'demonblood') { hp *= 1.12; atk *= 1.12; def *= 1.12; spd *= 1.12; auraPow *= 1.15; }
    if (t === 'souldevour') { eff.soulDevour = true; }
    if (t === 'divinefavor') eff.divineFavor = 0.25;
    if (t === 'overlord') { eff.allyAtk = 1.10; eff.allySpd = 1.10; }
  }
  atk += Math.min(30, c.soulAtk ?? 0);
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
  const ti = activeTitleOf(c);
  if (ti?.stats) {
    if (ti.stats.hp) hp *= ti.stats.hp;
    if (ti.stats.atk) atk *= ti.stats.atk;
    if (ti.stats.def) def += ti.stats.def;
    if (ti.stats.spd) spd *= ti.stats.spd;
    if (ti.stats.aura) auraPow *= ti.stats.aura;
    if (ti.stats.hpRegen) eff.hpRegen = (eff.hpRegen ?? 0) + ti.stats.hpRegen;
    if (ti.stats.thorns) eff.thorns = (eff.thorns ?? 0) + ti.stats.thorns;
    if (ti.stats.reviveHp) eff.reviveHp = (eff.reviveHp ?? 0) + ti.stats.reviveHp;
  }
  // 装备与套装：和特质/专精同层相乘，最后再叠同僚效应
  hp *= ge.hp * (set?.hp ?? 1); atk *= ge.atk; def += ge.def; spd *= ge.spd;
  auraPow *= ge.aura * (set?.aura ?? 1); dmgTaken *= ge.dmgTaken;
  if (ge.cd !== 1) eff.skillCdMult = (eff.skillCdMult ?? 1) * ge.cd;
  mergeEff(eff, ge.eff);        // 铭文机制（反伤/吸血/嘲讽…）与词缀走同一套 MonEff 字段
  atk *= chem.atk; hp *= chem.hp; auraPow *= chem.aura;
  // “法则审计”是写在角色身上的永久印记：对应极端属性被压回安全区，
  // 同时补偿另一条成长路线。每次重算都应用，换装/洗点也无法绕过处罚。
  for (const mark of c.lawMarks ?? []) {
    if (mark === 'thorns') { eff.thorns = Math.min(0.55, eff.thorns ?? 0); atk *= 1.18; }
    if (mark === 'mitigation') { dmgTaken = Math.max(0.35, dmgTaken); eff.lawMitigationFloor = 0.35; hp *= 1.20; }
    if (mark === 'defense') { def *= 0.70; atk *= 1.15; spd *= 1.06; }
    if (mark === 'lifesteal') { eff.lifestealPct = Math.min(0.45, eff.lifestealPct ?? 0); spd *= 1.12; }
  }
  return {
    name: c.name, race: c.race, tex: k.tex, lv: c.lv,
    hp: Math.max(1, Math.round(hp)), atk: Math.max(1, Math.round(atk)), def: Math.round(def),
    spd: Math.max(0.15, +spd.toFixed(3)),
    auraId: k.aura ?? 'atk', auraPow: +auraPow.toFixed(3), dmgTakenMult: +dmgTaken.toFixed(3), eff, xpMult,
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

// 战后轮值与疲劳结算：出战次数跨留守累计；第四场结束后强制休息三轮。
export function tickFatigue(champs         , seated          ) {
  const newlyResting = [];
  for (const c of champs) {
    if (seated.includes(c.uid)) {
      const base = c.traits.includes('proud') ? 45 : c.traits.includes('diligent') ? 18 : 30;
      // 带伤上阵更容易累：伤和疲劳互相放大，这是"该轮换了"的信号
      const g = (base + 8 * Math.min(WOUND_CAP, c.wounds || 0)) * gearEff(c.gear).fatigue;
      c.fatigue = Math.min(100, c.fatigue + g);
      c.battles++;
      c.sorties = Math.max(0, Math.round(c.sorties || 0)) + 1;
      if (c.sorties >= HERO_SORTIE_LIMIT) {
        c.sorties = 0;
        c.restTurns = HERO_REST_ROUNDS;
        newlyResting.push(c.uid);
      }
    } else {
      c.fatigue = Math.max(0, c.fatigue - 25);
      if ((c.restTurns || 0) > 0) c.restTurns--;
    }
  }
  return newlyResting;
}
