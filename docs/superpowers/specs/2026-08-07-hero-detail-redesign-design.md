# 英雄详情页重构设计文档

## Goal

为英雄面板新增 `详情` 标签页，把称号、特质、完整属性与战斗机制从拥挤的 `状态` 页中拆出来；同时精简 `状态` 页，为特质添加按品质区分的颜色；为已招募魔物的信息卡片增加“详情/收起”切换，默认卡片不再显示词缀与被动。

## Architecture

- 在 `game.js` 中把现有 `drawChampDetail`（容器）重命名为 `drawChampPanel`，新增三个视图函数：
  - `drawChampStat(g, c)`：精简后的状态页。
  - `drawChampInfo(g, c)`：新增的详情页。
  - 保留现有 `drawChampTalents(g, c)` 与 `drawChampGear(g, c)`。
- 在 `game.js` 中为已招募魔物信息卡片增加默认视图与详情视图的切换逻辑。
- 在 `heroes.js` 中为 `TRAITS` 增加 `rarity` 字段，用于 UI 染色。
- 在 `game.js` 中新增辅助函数：
  - `traitColor(t)`：根据 `rarity` 返回颜色。
  - `titleEffectText(t)`：把称号的 `stats` 格式化为中文数值说明。
  - `effDetailText(e)`：把 `champStats` 返回的 `eff` 展开为带具体数值的机制列表。

## UI 改动

### 标签页顺序

`状态` → `详情` → `专精` → `装备`

### 状态页（`drawChampStat`）

只保留最精简的作战摘要：
- 名称 + 当前激活称号名（仅名字）。
- 种族、等级、资质。
- 疲劳、伤势。
- 同僚/上阵状态。
- 经验条与升级按钮。
- 底部操作按钮（重随特质、休整、疗伤、同僚、遣退）。

去掉：生命/攻击/防御/攻速数值、特质说明、机制说明、称号列表。

### 详情页（`drawChampInfo`）

在 310×176 的面板内分区块显示：

#### 1. 基础属性
- 生命 `hp`
- 攻击 `atk`
- 防御 `def`
- 攻速 `spd`
- 受伤倍率 `dmgTakenMult`
- 经验倍率 `xpMult`
- 光环类型 + 强度 `auraId / auraPow`
- 技能冷却倍率 `skillCdMult`

#### 2. 战斗机制

把 `champStats` 返回的 `eff` 展开为带数值的中文列表，每项一行。至少覆盖：
- 反伤 `thorns`
- 溅射 `splash`
- 吸血 `lifestealPct`
- 回血 `hpRegen`
- 斩杀 `execute`
- 易伤 `markHit`
- 暴击 `cunning / cunningMult`
- 冷却 `skillCdMult`
- 对勇者增伤 `dmgToHero`
- 技能增伤 `skillDmg`
- 越打越快 `frenzy`
- 直击后排 `reach`
- 嘲讽 `anchorHold`
- 同房加攻/加攻速/加生命/加防御/减伤
- 不灭复活 `undyingTrait`
- 神恩免死 `divineFavor`
- 不朽复活 `passive === 'revive'` + `reviveAlly` + `reviveHp`
- 倒下反弹 `vengeful`
- 亡语伤害 `deathBurst`
- 击杀回血 `bloodthirsty`
- 普攻破防/减速/点燃/中毒等 `onHit` 相关

#### 3. 特质

每行一个已拥有的特质：
- 名称按 `rarity` 染色。
- 后接描述。

#### 4. 称号

纵向列表显示所有已解锁称号：
- 每行显示称号名 + 激活指示（当前激活的称号高亮）。
- 点击某一行：
  1. 展开该行，显示称号描述和具体数值加成。
  2. 同时把该称号设为当前激活称号。
- 称号数量超过面板可显示行数时，提供上下滚动按钮或分页按钮。

## 数据改动

### `heroes.js`：为 `TRAITS` 增加 `rarity`

新增字段 `rarity`，取值：
- `'common'` 普通（白色）
- `'rare'` 稀有（蓝色）
- `'epic'` 史诗（紫色）
- `'legend'` 传奇（金色）
- `'curse'` 负面/诅咒（红色）

映射规则（初版）：
- 8 个原始普通正面特质 → `common`
- 10 个新增普通正面特质 → `rare`
- 5 个金色传奇特质 → `legend`
- `proud（骄矜）` → `curse`

### `game.js`：新增辅助函数

```js
function traitColor(t) {
  switch (TRAITS[t].rarity) {
    case 'legend': return C.gold;
    case 'epic':   return C.purple;
    case 'rare':   return C.blue;
    case 'curse':  return C.red;
    default:       return C.bone;
  }
}
```

```js
function titleEffectText(t) {
  const parts = [];
  if (t.stats.hp) parts.push(`生命 ${Math.round((t.stats.hp - 1) * 100)}%`);
  if (t.stats.atk) parts.push(`攻击 ${Math.round((t.stats.atk - 1) * 100)}%`);
  if (t.stats.def) parts.push(`防御 +${t.stats.def}`);
  if (t.stats.spd) parts.push(`攻速 ${Math.round((t.stats.spd - 1) * 100)}%`);
  if (t.stats.hpRegen) parts.push(`回血 +${t.stats.hpRegen}`);
  if (t.stats.thorns) parts.push(`反伤 ${Math.round(t.stats.thorns * 100)}%`);
  if (t.stats.reviveHp) parts.push(`复活生命 ${Math.round(t.stats.reviveHp * 100)}%`);
  return parts.join('，');
}
```

```js
function effDetailText(e) {
  const out = [];
  if (e.thorns) out.push(`反伤 ${Math.round(e.thorns * 100)}%`);
  if (e.splash) out.push(`溅射 ${Math.round(e.splash * 100)}%`);
  if (e.lifestealPct) out.push(`吸血 ${Math.round(e.lifestealPct * 100)}%`);
  if (e.hpRegen) out.push(`回血 ${e.hpRegen}/秒`);
  if (e.execute) out.push(`残血 ${Math.round(e.execute * 100)}% 斩杀`);
  if (e.markHit) out.push(`普攻叠易伤 ${Math.round(e.markHit * 100)}%`);
  if (e.cunning) out.push(`普攻 ${Math.round(e.cunning * 100)}% 暴击，倍率 ${e.cunningMult ?? 1.5}`);
  if (e.skillCdMult && e.skillCdMult !== 1) out.push(`技能冷却 ${Math.round(e.skillCdMult * 100)}%`);
  if (e.skillDmg && e.skillDmg !== 1) out.push(`技能伤害 ${Math.round(e.skillDmg * 100)}%`);
  if (e.dmgToHero && e.dmgToHero !== 1) out.push(`对勇者伤害 ${Math.round(e.dmgToHero * 100)}%`);
  if (e.frenzy) out.push('越打越快');
  if (e.reach) out.push('普攻直击后排');
  if (e.anchorHold) out.push('嘲讽近战勇者');
  if (e.rageAura && e.rageAura !== 1) out.push(`同房怪物攻击 +${Math.round((e.rageAura - 1) * 100)}%`);
  if (e.bulwarkAura && e.bulwarkAura !== 1) out.push(`同房怪物受伤 -${Math.round((1 - e.bulwarkAura) * 100)}%`);
  if (e.allyAtk && e.allyAtk !== 1) out.push(`同房怪物攻击 +${Math.round((e.allyAtk - 1) * 100)}%`);
  if (e.allySpd && e.allySpd !== 1) out.push(`同房怪物攻速 +${Math.round((e.allySpd - 1) * 100)}%`);
  if (e.allyHp && e.allyHp !== 1) out.push(`同房怪物生命 +${Math.round((e.allyHp - 1) * 100)}%`);
  if (e.allyDef) out.push(`同房怪物防御 +${e.allyDef}`);
  if (e.undyingTrait) out.push(`不灭：首次倒下以 ${Math.round(e.undyingTrait * 100)}% 生命复活`);
  if (e.divineFavor) out.push(`神恩：致死伤害 ${Math.round(e.divineFavor * 100)}% 概率保留 1 点生命`);
  if (e.passive === 'revive') out.push(`不朽：首次倒下复活，${e.reviveAlly ? '并拉起同伴' : ''}`);
  if (e.reviveHp) out.push(`复活生命 +${Math.round(e.reviveHp * 100)}%`);
  if (e.vengeful) out.push(`倒下反弹 ${Math.round(e.vengeful * 100)}% 攻击伤害`);
  if (e.deathBurst) out.push(`亡语：全场勇者受 ${e.deathBurst} 伤害`);
  if (e.bloodthirsty) out.push(`击杀回血 ${Math.round(e.bloodthirsty * 100)}%`);
  if (e.soulDevour) out.push('噬魂：每击倒勇者永久 +1 攻击');
  if (e.onHit === 'sunder') out.push('普攻破防 3');
  // burnHit / venomHit / chillHit / stunHit 等同理
  return out;
}
```

## 魔物详情页

已招募魔物的信息卡片（`sel.kind === 'inst'`）也增加“详情/收起”切换：

### 默认信息卡片

显示：
- 名称、等级、形象
- 基础四维（生命、攻击、防御、速度）
- 驻守房间状态
- 技能名称与简短说明
- 经验条与升级按钮
- 改造/重组/遣散按钮

去掉：词缀列表、被动说明。

### 详情视图

点击“详情”按钮后切换到详情视图，显示：
- 名称、等级、形象、基础四维
- 完整技能描述
- 词缀列表：每条词缀名称 + 效果说明
- 被动说明：满级前显示“Lv5 解锁：被动名”，满级后显示完整被动效果
- 改造次数/重组次数等改造信息
- 一个“返回”按钮切回默认卡片

### 交互

- 默认卡片右下角增加一个“详情”小按钮。
- 点击“详情”→渲染详情视图。
- 点击详情视图中的“返回”→渲染默认卡片。
- 状态用局部变量 `monDetailMode`（或复用现有 `sel` 字段）保存，刷新时保持。

## 错误处理

- 旧存档没有 `rarity` 字段：通过 `TRAITS[t].rarity ?? 'common'` 兜底。
- 称号列表为空时显示“暂无称号”。
- 机制列表为空时显示“无特殊机制”。

## 测试

- 打开英雄面板，确认标签页顺序正确。
- 状态页只显示精简信息，无属性/特质/机制。
- 详情页显示全部属性、机制、特质、称号。
- 点击称号可展开并切换激活，高亮状态正确。
- 特质名称颜色与 `rarity` 一致。
- 打开魔物信息卡片，默认不显示词缀和被动。
- 点击“详情”切换到详情视图，能看到词缀、被动、完整技能描述。
- 点击“返回”回到默认卡片。
- 控制台无报错。
