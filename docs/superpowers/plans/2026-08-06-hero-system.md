# 英雄系统扩展实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

> **状态（2026-08-08）：已完成。** 特质与重随、五选一专精、称号系统、UI 集成、存档兼容和战后统计均已落地；计划复选框已按当前代码状态回填。

**Goal:** 在现有英雄系统上扩展 10 个普通特质 + 5 个金色传奇特质、重随特质功能、每层 5 选 1 的专精分支、以及多维度可切换的称号系统。

**Architecture:** 在 `heroes.js` 中扩展数据与纯逻辑函数（特质、专精、称号、重随）；在 `game.js` 中扩展 UI 与交互（详情页、专精页、称号切换）；通过 `sanitizeSave` 保证旧存档兼容。无测试框架，以浏览器手动验证为主。

**Tech Stack:** 纯浏览器 JavaScript（ES modules），PIXI.js 渲染，本地 `python -m http.server` 运行。

## Global Constraints

- 保留现有 8 个普通特质不变。
- 金色传奇特质只通过「重随特质」出现，出现概率约 10%。
- 一个英雄最多 2 个特质槽位。
- 重随特质成本：200 魔 + 200 骨。
- 称号加成「仅当前生效」：一次只能激活一个称号。
- 每个维度设计 5 个称号，共 4 个高要求传奇称号。
- 旧存档读取不报错，缺失字段自动补默认值。

## 文件结构

| 文件 | 职责 |
|------|------|
| `heroes.js` | 扩展 `TRAITS`、`TALENTS`、`TITLES`；新增 `rerollTraits`、`unlockedTitles`、`activeTitleOf`；修改 `champStats`、`newChamp`、`sanitizeSave`（在 `game.js` 中） |
| `game.js` | 导入新函数；在 `drawChampDetail` 添加重随按钮和称号切换；在 `drawChampTalents` 扩展为 5 选 1 并显示效果描述；处理称号面板状态 |
| `battle.js` | 战后统计写入英雄 `stats` 字段（healDone、revives、thornDmg、attacks、dmgDealt） |

## Task 1: 扩展特质数据与重随功能

**Files:**
- Modify: `heroes.js:7-16`（TRAITS 常量）
- Modify: `heroes.js:200-204`（newChamp）
- Modify: `heroes.js:75-94`（TITLES 区域附近添加新函数）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: 无
- Produces: `rerollTraits(c, rng)`, `REROLL_TRAIT_BONE`, `REROLL_TRAIT_MANA`

- [x] **Step 1: 在 `heroes.js` 扩展 `TRAITS`**

在现有 8 个特质后追加 10 个普通特质和 5 个金色传奇特质：

```js
export const TRAITS = {
  // 现有 8 个不变
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
```

- [x] **Step 2: 添加重随特质常量和函数**

在 `heroes.js` 中 TITLES 区域之前添加：

```js
export const REROLL_TRAIT_BONE = 200;
export const REROLL_TRAIT_MANA = 200;

export function rerollTraits(c, rng) {
  const keys = Object.keys(TRAITS);
  const normal = keys.filter((k) => !TRAITS[k].legend);
  const legend = keys.filter((k) => TRAITS[k].legend);
  const slots = Math.min(2, c.traits.length + (c.traits.length < 2 && rng() < 0.3 ? 1 : 0));
  const out = [];
  for (let i = 0; i < slots; i++) {
    const isLegend = rng() < 0.10;
    const pool = isLegend ? legend : normal;
    out.push(pool[Math.floor(rng() * pool.length)]);
  }
  c.traits = out;
}
```

- [x] **Step 3: 修改 `newChamp` 初始化统计字段**

```js
export function newChamp(uid, c) {
  return {
    uid, race: c.race, name: c.name, lv: 1, xp: 0,
    traits: [...c.traits], talents: [], fatigue: 0,
    battles: 0, kills: 0, wounds: 0, gear: {},
    activeTitle: '',
    stats: {},
  };
}
```

- [x] **Step 4: 浏览器验证**

运行本地服务器：
```bash
python -m http.server 5122
```

打开 `http://localhost:5122/index.html`，进入英雄招募页，确认：
- 新英雄仍然只有 1-2 个普通特质，没有金色传奇特质。
- 浏览器控制台无报错。

## Task 2: 扩展专精分支

**Files:**
- Modify: `heroes.js:26-45`（TALENTS 和 TALENT_TIERS）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: 无
- Produces: 扩展后的 `TALENTS`、`TALENT_TIERS`

- [x] **Step 1: 扩展 `TALENTS` 和 `TALENT_TIERS`**

将现有 12 个专精保留，每层从 3 选 1 扩展到 5 选 1：

```js
export const TALENTS = {
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
export const TALENT_TIERS = [
  ['t1hp', 't1atk', 't1aura', 't1thorn', 't1hunter'],
  ['t2def', 't2spd', 't2aura', 't2bulwark', 't2inspire'],
  ['t3cd', 't3revive', 't3aura', 't3abyss', 't3regen'],
  ['t4exec', 't4blood', 't4lord', 't4ruin', 't4warden'],
];
```

- [x] **Step 2: 在 `champStats` 中应用新增专精效果**

在现有 `for (const t of c.talents)` 分支中追加新专精处理：

```js
if (t === 't1thorn') { hp *= 1.1; eff.thorns = (eff.thorns ?? 0) + 0.15; }
if (t === 't1hunter') { eff.dmgToHero = (eff.dmgToHero ?? 1) * 1.12; }
if (t === 't2bulwark') { eff.allyDef = (eff.allyDef ?? 0) + 4; }
if (t === 't2inspire') { eff.allySpd = (eff.allySpd ?? 1) * 1.10; }
if (t === 't3abyss') { eff.skillDmg = (eff.skillDmg ?? 1) * 1.25; }
if (t === 't3regen') { eff.hpRegen = (eff.hpRegen ?? 0) + 6; }
if (t === 't4ruin') { atk *= 1.30; hp *= 0.9; }
if (t === 't4warden') { hp *= 1.25; def += 5; }
```

- [x] **Step 3: 浏览器验证**

打开游戏，招募英雄并升级，确认：
- 专精页每层显示 5 个选项。
- 选择新增专精后属性变化正确。
- UI 不溢出面板。

## Task 3: 重构称号系统

**Files:**
- Modify: `heroes.js:75-94`（TITLES、titleOf、nextTitle）
- Modify: `heroes.js:235-282`（champStats 称号计算）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: 英雄对象 `c`（含 `battles`, `kills`, `stats`, `activeTitle`）
- Produces: `TITLES`, `unlockedTitles(c)`, `titleById(id)`, `activeTitleOf(c)`

- [x] **Step 1: 替换 `TITLES` 为称号库**

```js
export const TITLES = [
  // 参战维度
  { id: 'gatekeeper', name: '守门人', desc: '生命 +4%', stats: { hp: 1.04 }, need: (c, s) => c.battles >= 4 },
  { id: 'veteran', name: '老兵', desc: '生命 +8% 防御 +2', stats: { hp: 1.08, def: 2 }, need: (c, s) => c.battles >= 10 },
  { id: 'warmaster', name: '战争大师', desc: '生命 +12% 防御 +4', stats: { hp: 1.12, def: 4 }, need: (c, s) => c.battles >= 25 },
  { id: 'immortal', name: '不灭传说', desc: '生命 +18% 防御 +6 攻速 +5%', stats: { hp: 1.18, def: 6, spd: 1.05 }, need: (c, s) => c.battles >= 40 },
  { id: 'champion', name: '斗场冠军', desc: '生命 +10% 攻击 +5%', stats: { hp: 1.10, atk: 1.05 }, need: (c, s) => c.battles >= 60 },
  // 击杀维度
  { id: 'hunter', name: '猎首', desc: '攻击 +7%', stats: { atk: 1.07 }, need: (c, s) => c.kills >= 10 },
  { id: 'slayer', name: '勇者克星', desc: '生命 +6% 攻击 +10%', stats: { hp: 1.06, atk: 1.10 }, need: (c, s) => c.kills >= 20 },
  { id: 'executioner', name: '处刑人', desc: '攻击 +15%', stats: { atk: 1.15 }, need: (c, s) => c.kills >= 50 },
  { id: 'reaper', name: '死神', desc: '攻击 +20% 攻速 +5%', stats: { atk: 1.20, spd: 1.05 }, need: (c, s) => c.kills >= 100 },
  { id: 'legend_slayer', name: '传奇猎杀者', desc: '攻击 +25% 生命 +8%', stats: { atk: 1.25, hp: 1.08 }, need: (c, s) => c.kills >= 200 },
  // 回复维度
  { id: 'healer', name: '愈者', desc: '每秒回血 +2', stats: { hpRegen: 2 }, need: (c, s) => (s.healDone ?? 0) >= 500 },
  { id: 'mender', name: '修复师', desc: '每秒回血 +4', stats: { hpRegen: 4 }, need: (c, s) => (s.healDone ?? 0) >= 2000 },
  { id: 'restorer', name: '复苏者', desc: '每秒回血 +6 生命 +5%', stats: { hpRegen: 6, hp: 1.05 }, need: (c, s) => (s.healDone ?? 0) >= 5000 },
  { id: 'lifegiver', name: '生命之源', desc: '每秒回血 +8 生命 +10%', stats: { hpRegen: 8, hp: 1.10 }, need: (c, s) => (s.healDone ?? 0) >= 10000 },
  { id: 'legend_healer', name: '不朽医者', desc: '每秒回血 +12 生命 +12%', stats: { hpRegen: 12, hp: 1.12 }, need: (c, s) => (s.healDone ?? 0) >= 20000 },
  // 复活维度
  { id: 'reviver', name: '还魂者', desc: '复活生命 +10%', stats: { reviveHp: 0.10 }, need: (c, s) => (s.revives ?? 0) >= 3 },
  { id: 'resurrector', name: '复活者', desc: '复活生命 +20%', stats: { reviveHp: 0.20 }, need: (c, s) => (s.revives ?? 0) >= 10 },
  { id: 'phoenix', name: '凤凰', desc: '复活生命 +30% 攻击 +5%', stats: { reviveHp: 0.30, atk: 1.05 }, need: (c, s) => (s.revives ?? 0) >= 25 },
  { id: 'undying', name: '不死者', desc: '复活生命 +40% 生命 +5%', stats: { reviveHp: 0.40, hp: 1.05 }, need: (c, s) => (s.revives ?? 0) >= 50 },
  { id: 'legend_reviver', name: '轮回之主', desc: '复活生命 +50% 生命 +10% 攻击 +10%', stats: { reviveHp: 0.50, hp: 1.10, atk: 1.10 }, need: (c, s) => (s.revives ?? 0) >= 100 },
  // 反伤维度
  { id: 'thorn', name: '荆棘', desc: '反伤 +5%', stats: { thorns: 0.05 }, need: (c, s) => (s.thornDmg ?? 0) >= 200 },
  { id: 'spiker', name: '尖刺', desc: '反伤 +10%', stats: { thorns: 0.10 }, need: (c, s) => (s.thornDmg ?? 0) >= 800 },
  { id: 'porcupine', name: '猬甲', desc: '反伤 +15% 防御 +2', stats: { thorns: 0.15, def: 2 }, need: (c, s) => (s.thornDmg ?? 0) >= 2000 },
  { id: 'mirror', name: '镜反', desc: '反伤 +20% 防御 +4', stats: { thorns: 0.20, def: 4 }, need: (c, s) => (s.thornDmg ?? 0) >= 5000 },
  { id: 'legend_thorn', name: '荆棘王座', desc: '反伤 +30% 防御 +6 生命 +8%', stats: { thorns: 0.30, def: 6, hp: 1.08 }, need: (c, s) => (s.thornDmg ?? 0) >= 10000 },
  // 攻速维度
  { id: 'quick', name: '快手', desc: '攻速 +5%', stats: { spd: 1.05 }, need: (c, s) => (s.attacks ?? 0) >= 100 },
  { id: 'agile', name: '敏捷', desc: '攻速 +10%', stats: { spd: 1.10 }, need: (c, s) => (s.attacks ?? 0) >= 500 },
  { id: 'swiftlord', name: '迅捷领主', desc: '攻速 +15% 攻击 +3%', stats: { spd: 1.15, atk: 1.03 }, need: (c, s) => (s.attacks ?? 0) >= 1500 },
  { id: 'blitz', name: '闪电', desc: '攻速 +20% 攻击 +5%', stats: { spd: 1.20, atk: 1.05 }, need: (c, s) => (s.attacks ?? 0) >= 4000 },
  { id: 'legend_speed', name: '风暴化身', desc: '攻速 +25% 攻击 +10%', stats: { spd: 1.25, atk: 1.10 }, need: (c, s) => (s.attacks ?? 0) >= 8000 },
  // 攻击维度
  { id: 'bruiser', name: '碎骨者', desc: '攻击 +5%', stats: { atk: 1.05 }, need: (c, s) => (s.dmgDealt ?? 0) >= 1000 },
  { id: 'brute', name: '蛮力', desc: '攻击 +10%', stats: { atk: 1.10 }, need: (c, s) => (s.dmgDealt ?? 0) >= 5000 },
  { id: 'destroyer', name: '毁灭者', desc: '攻击 +15% 生命 +3%', stats: { atk: 1.15, hp: 1.03 }, need: (c, s) => (s.dmgDealt ?? 0) >= 15000 },
  { id: 'annihilator', name: '湮灭者', desc: '攻击 +20% 生命 +5%', stats: { atk: 1.20, hp: 1.05 }, need: (c, s) => (s.dmgDealt ?? 0) >= 40000 },
  { id: 'legend_power', name: '天灾', desc: '攻击 +30% 生命 +10%', stats: { atk: 1.30, hp: 1.10 }, need: (c, s) => (s.dmgDealt ?? 0) >= 100000 },
  // 4 个高要求传奇称号
  { id: 'legend_war', name: '战争神话', desc: '全属性 +10%', stats: { hp: 1.10, atk: 1.10, def: 5, spd: 1.10 }, need: (c, s) => c.battles >= 40 && c.kills >= 200 },
  { id: 'legend_tank', name: '不朽壁垒', desc: '生命 +25% 防御 +10 反伤 +10%', stats: { hp: 1.25, def: 10, thorns: 0.10 }, need: (c, s) => (s.thornDmg ?? 0) >= 10000 && (s.healDone ?? 0) >= 20000 },
  { id: 'legend_dps', name: '毁灭风暴', desc: '攻击 +25% 攻速 +15%', stats: { atk: 1.25, spd: 1.15 }, need: (c, s) => (s.dmgDealt ?? 0) >= 100000 && (s.attacks ?? 0) >= 8000 },
  { id: 'legend_rebirth', name: '轮回帝君', desc: '生命 +15% 攻击 +15% 复活生命 +30%', stats: { hp: 1.15, atk: 1.15, reviveHp: 0.30 }, need: (c, s) => (s.revives ?? 0) >= 100 && c.kills >= 200 },
];
```

- [x] **Step 2: 替换 `titleOf` / `nextTitle` 为新的称号查询函数**

```js
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
  const unlocked = unlockedTitles(c);
  const next = TITLES.find((t) => !unlocked.includes(t.id));
  return next ? { t: next, at: '继续战斗解锁更多称号' } : null;
}
```

- [x] **Step 3: 在 `champStats` 中应用称号加成**

在 `champStats` 末尾找到 `const ti = titleOf(c);` 处，改为：

```js
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
```

- [x] **Step 4: 浏览器验证**

通过 dev 工具或临时修改英雄数据，确认：
- 参战 4 场解锁「守门人」。
- 切换 `activeTitle` 后属性变化正确。

## Task 4: UI 集成（重随按钮、称号切换、专精效果显示）

**Files:**
- Modify: `game.js:17-19`（import 新函数）
- Modify: `game.js:181-182`（sanitizeSave）
- Modify: `game.js:2882-2922`（drawChampDetail）
- Modify: `game.js:2947-2974`（drawChampTalents）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: `rerollTraits`, `REROLL_TRAIT_BONE`, `REROLL_TRAIT_MANA`, `activeTitleOf`, `titleById`, `unlockedTitles`
- Produces: 重随按钮、称号面板、5 选 1 专精 UI

- [x] **Step 1: 导入新函数**

在 `game.js` 顶部 import 中追加：

```js
REROLL_TRAIT_BONE, REROLL_TRAIT_MANA, rerollTraits,
activeTitleOf, titleById, unlockedTitles,
```

- [x] **Step 2: 存档兼容性处理**

在 `game.js` 的 sanitize 逻辑（约第 181 行）中，对每位英雄补充默认值：

```js
c.activeTitle = c.activeTitle ?? '';
c.stats = c.stats ?? {};
```

- [x] **Step 3: 在 `drawChampDetail` 添加重随特质按钮和称号显示**

在名称显示行使用 `activeTitleOf`：

```js
const ti = activeTitleOf(c);
label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);
```

在特质行下方新增重随按钮（放在同僚按钮左侧或新一行）：

```js
button(g, uiLayer, hits, 174, 222, 116, 15, `重随特质 ${REROLL_TRAIT_BONE}骨+${REROLL_TRAIT_MANA}魔`, () => rerollChampTraits(c),
  { size: 12, enabled: S.bone >= REROLL_TRAIT_BONE && S.mana >= REROLL_TRAIT_MANA, border: C.purple, color: C.white });
```

由于底部按钮行空间紧张，可将休整/疗伤/同僚/遣退按钮上移或缩窄，为重随按钮腾出位置。

新增重随函数：

```js
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
```

- [x] **Step 4: 在 `drawChampDetail` 添加称号切换面板**

在名称行或机制行下方新增称号条：

```js
const unlocked = unlockedTitles(c);
if (unlocked.length > 0) {
  let tx = 174;
  label(uiLayer, '称号', tx, 174, 12, C.gold);
  tx += 30;
  for (const id of unlocked.slice(0, 6)) {
    const t = titleById(id);
    const active = c.activeTitle === id;
    button(g, uiLayer, hits, tx, 172, 58, 15, t.name, () => { c.activeTitle = id; playSfx('tab'); persist(); render(); },
      { size: 11, fill: active ? C.goldDark : C.ink, border: active ? C.gold : C.stoneLit, color: active ? C.white : C.steel });
    tx += 62;
  }
}
```

- [x] **Step 5: 修改 `drawChampTalents` 为 5 选 1 并显示效果描述**

将每层选项按钮从 3 个改为 5 个，宽度从 72 改为 44，X 起始位置调整：

```js
tier.forEach((id, j) => {
  button(g, uiLayer, hits, 200 + j * 48, y - 2, 46, 15, TALENTS[id].name, () => pickTalent(c, id),
    { size: 10, fill: C.purpleDark, border: C.purple, color: C.white });
});
label(uiLayer, cut(tier.map((t) => `${TALENTS[t].name}：${TALENTS[t].desc}`).join('／'), 30), 174, y + 17, 11, C.stoneLit);
```

已选专精时也要显示描述：

```js
if (own) {
  label(uiLayer, `Lv${TIER_LV[i]} ${TALENTS[own].name}`, 174, y, 12, C.white);
  label(uiLayer, cut(TALENTS[own].desc, 30), 174, y + 17, 11, C.steel);
}
```

- [x] **Step 6: 浏览器验证**

- 打开英雄详情页，确认重随特质按钮可点击、资源扣除正确。
- 确认称号条显示已解锁称号，点击可切换。
- 确认专精页每层 5 个按钮，描述可见。

## Task 5: 战后统计写入与最终验证

**Files:**
- Modify: `battle.js`（战后统计逻辑）
- Modify: `game.js`（`devKills` 等调试接口保持同步）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: 英雄对象 `c.stats`
- Produces: 更新后的 `c.stats` 字段

- [x] **Step 1: 在战后结算中更新 `stats` 字段**

在 `battle.js` 战后逻辑中（搜索 `tickFatigue` 或战斗结束处理），对每位参战英雄更新：

```js
for (const c of champs) {
  if (seated.includes(c.uid)) {
    c.stats = c.stats ?? {};
    c.stats.attacks = (c.stats.attacks ?? 0) + (c.__battleAttacks ?? 0);
    c.stats.dmgDealt = (c.stats.dmgDealt ?? 0) + (c.__battleDmgDealt ?? 0);
    c.stats.thornDmg = (c.stats.thornDmg ?? 0) + (c.__battleThornDmg ?? 0);
    c.stats.healDone = (c.stats.healDone ?? 0) + (c.__battleHealDone ?? 0);
    c.stats.revives = (c.stats.revives ?? 0) + (c.__battleRevives ?? 0);
  }
}
```

注意：如果 `battle.js` 目前没有记录这些战斗内统计，需要先在战斗过程中记录。若战斗系统未暴露这些细节，可以先用 `kills` 和 `battles` 维度验证称号系统，其他维度后续补充。

- [x] **Step 2: 更新 `game.js` 调试接口 `devKills`**

确保通过 dev 接口修改 kills/battles 后称号正确刷新：

```js
devKills: (uid, k, b = 0) => {
  const c = champById(uid); if (c) { c.kills = k; c.battles = b || c.battles; } persist(); render();
  return activeTitleOf(c)?.name ?? null;
},
```

- [x] **Step 3: 最终浏览器验证**

- 完成一场战斗，确认参战英雄 `battles` 增加，称号解锁。
- 通过浏览器控制台调用 `devKills(uid, 200, 40)`，确认传奇称号「战争神话」解锁。
- 检查旧存档读取：清除 `localStorage` 中的 `yqh-save-v2`，刷新页面后新游戏正常。
- 检查控制台无报错。

## 提交记录建议

每个 Task 完成后单独提交：

```bash
git add heroes.js game.js battle.js
git commit -m "feat(heroes): 扩展特质与重随功能"
git commit -m "feat(heroes): 扩展专精分支到每层5选1"
git commit -m "feat(heroes): 重构多维度称号系统"
git commit -m "feat(ui): 英雄详情页重随、称号切换、专精描述"
git commit -m "feat(battle): 战后统计写入英雄维度数据"
```

## Self-Review

**Spec coverage:**
- 10 普通 + 5 金色特质 → Task 1
- 重随特质 200魔+200骨 → Task 1、Task 4
- 每层 5 选 1 专精 → Task 2
- 称号多维度、切换、加成 → Task 3、Task 4
- 存档兼容 → Task 4
- 测试 → 每个 Task 的浏览器验证

**Placeholder scan:**
- 无 TBD/TODO。
- 战斗内统计（`__battleAttacks` 等）若 battle.js 未实现，Task 5 中需先确认可行性；若不可行则先用 kills/battles 维度测试，其他维度 deferred。

**Type consistency:**
- `activeTitle` 为字符串 ID，与 `titleById` 一致。
- `stats` 为对象，与称号 `need` 函数签名 `(c, s)` 一致。
- `titleOf` 保留为 `activeTitleOf` 的别名，兼容现有调用。
