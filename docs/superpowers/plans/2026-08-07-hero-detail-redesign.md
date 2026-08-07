# 英雄与魔物详情页重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

> **状态（2026-08-08）：已完成。** 英雄状态/详情拆分、特质品质颜色、称号分页与切换、魔物详情切换和技能说明弹窗均已落地；计划复选框已按当前代码状态回填。

**Goal:** 为英雄面板新增 `详情` 标签页，拆分称号/特质/完整属性/机制；精简 `状态` 页；为特质按品质染色；为已招募魔物信息卡片增加默认/详情切换。

**Architecture:** 在 `heroes.js` 中为 `TRAITS` 增加 `rarity` 字段；在 `game.js` 中新增 `traitColor`、`titleEffectText`、`effDetailText` 辅助函数，并把 `drawChampDetail` 拆分为容器 + `drawChampStat` / `drawChampInfo` / `drawChampTalents` / `drawChampGear` 四个视图；在魔物信息卡片区增加 `drawMonInstCard` 与 `drawMonInstDetail` 切换。

**Tech Stack:** 纯浏览器 JavaScript、PIXI.js、本地 `python -m http.server` 运行。

## Global Constraints

- 状态页只保留最精简作战摘要，不显示属性/特质/机制/称号列表。
- 详情页必须显示英雄全部属性与机制。
- 称号列表点击后展开并切换激活。
- 特质颜色：`common` 白、`rare` 蓝、`epic` 紫、`legend` 金、`curse` 红。
- 已招募魔物默认卡片不显示词缀与被动；详情页显示。
- 无自动化测试框架，以浏览器手动验证为准。

---

### Task 1: 为 `TRAITS` 增加 `rarity` 字段

**Files:**
- Modify: `heroes.js:8-33`
- Test: `node --check heroes.js`

**Interfaces:**
- Consumes: 无
- Produces: `TRAITS[t].rarity`

- [x] **Step 1: 修改每个特质的定义**

在 `heroes.js` 中，为每个特质对象增加 `rarity` 字段：

- 8 个原始普通正面特质 → `rarity: 'common'`
- 10 个新增普通正面特质 → `rarity: 'rare'`
- 5 个金色传奇特质 → `rarity: 'legend'`
- `proud（骄矜）` → `rarity: 'curse'`

示例（只列前 3 个，其余同理）：

```js
export const TRAITS = {
  glutton:   { name: '暴食', desc: '攻击+12%，生命-8%', good: true, rarity: 'common' },
  prudent:   { name: '谨慎', desc: '防御+4，攻速-8%', good: true, rarity: 'common' },
  proud:     { name: '骄矜', desc: '攻击+10%，疲劳增长+50%', good: false, rarity: 'curse' },
  // ... 其余原始 7 个正面特质 rarity: 'common'
  // 新增 10 个普通正面特质 rarity: 'rare'
  greedy:    { name: '贪婪', desc: '攻击+8%，战利品骨币+15%', good: true, rarity: 'rare' },
  // ... 其余新增普通特质 rarity: 'rare'
  // 5 个金色传奇特质 rarity: 'legend'
  undying_trait: { name: '不灭', desc: '首次倒下以50%生命复活', good: true, legend: true, rarity: 'legend' },
  // ... 其余传奇特质 rarity: 'legend'
};
```

- [x] **Step 2: 语法检查**

```bash
node --check heroes.js
```

- [x] **Step 3: Commit**

```bash
git add heroes.js
git commit -m "data: add rarity field to traits"
```

---

### Task 2: 新增详情页辅助函数

**Files:**
- Modify: `game.js:2903-2904`（在 `effText` 之后、`drawChampDetail` 之前插入）
- Test: `node --check game.js`

**Interfaces:**
- Consumes: `TRAITS`、`TITLES`、`C`（颜色常量）
- Produces: `traitColor(t)`、`titleEffectText(t)`、`effDetailText(e)`

- [x] **Step 1: 插入三个辅助函数**

```js
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

function titleEffectText(t        ) {
  const parts = [];
  if (t.stats?.hp)       parts.push(`生命 ${Math.round((t.stats.hp - 1) * 100)}%`);
  if (t.stats?.atk)      parts.push(`攻击 ${Math.round((t.stats.atk - 1) * 100)}%`);
  if (t.stats?.def)      parts.push(`防御 +${t.stats.def}`);
  if (t.stats?.spd)      parts.push(`攻速 ${Math.round((t.stats.spd - 1) * 100)}%`);
  if (t.stats?.hpRegen)  parts.push(`回血 +${t.stats.hpRegen}`);
  if (t.stats?.thorns)   parts.push(`反伤 ${Math.round(t.stats.thorns * 100)}%`);
  if (t.stats?.reviveHp) parts.push(`复活生命 ${Math.round(t.stats.reviveHp * 100)}%`);
  return parts.join('，') || '无数值加成';
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
```

- [x] **Step 2: 语法检查**

```bash
node --check game.js
```

- [x] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: add trait color, title effect and mechanism detail helpers"
```

---

### Task 3: 重构英雄面板并新增 `详情` 标签页

**Files:**
- Modify: `game.js:2905-2983`（`drawChampDetail` 及其内部状态页逻辑）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: `traitColor`、`titleEffectText`、`effDetailText`、`champStats`、`chemistry`、`activeTitleOf`、`unlockedTitles`、`titleById`
- Produces: `drawChampStat(g, c)`、`drawChampInfo(g, c)`、`drawChampDetail` 容器

- [x] **Step 1: 把 `drawChampDetail` 改为容器函数**

保持 `drawChampDetail(g, c)` 作为入口，只负责画外框、标签页按钮和分发到三个子视图：

```js
function drawChampDetail(g, c) {
  panelF(g, uiLayer, 'gold', 166, 58, 310, 176, C.wall);
  const pend = pendingTier(c);
  if (pend && heroView === 'stat') heroView = 'talent';
  const vaultDot = S.vault.length > 0;
  const tabs = [['stat', '状态'], ['info', '详情'], ['talent', pend ? '专精●' : '专精'], ['gear', vaultDot ? '装备●' : '装备']];
  for (const [i, v] of tabs.entries()) {
    const on = heroView === v[0];
    button(g, uiLayer, hits, 326 + i * 38, 60, 36, 14, v[1], () => { heroView = v[0]; playSfx('tab'); render(); },
      { size: 10, fill: on ? C.wallLit : C.ink, border: on ? C.gold : C.stoneLit, color: on ? C.white : C.stoneLit });
  }
  if (heroView === 'info') { drawChampInfo(g, c); return; }
  if (heroView === 'talent') { drawChampTalents(g, c); return; }
  if (heroView === 'gear') { drawChampGear(g, c); return; }
  drawChampStat(g, c);
}
```

- [x] **Step 2: 新增 `drawChampStat`**

```js
function drawChampStat(g, c) {
  const ti = activeTitleOf(c);
  label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);
  label(uiLayer, `${monKind(c.race).name}・Lv${c.lv}/${CHAMP_LV_CAP}`, 174, 80, 12, C.bone);
  const pot = S.champPot[c.uid] ?? 0;
  label(uiLayer, `资质${POT_NAME[pot]}`, 174, 96, 12, C.bone);
  const ft = fatigueTier(c.fatigue);
  label(uiLayer, `疲劳 ${c.fatigue} ${ft.text}`, 174, 112, 12, ft.bad ? C.red : C.steel);
  const wd = c.wounds || 0;
  label(uiLayer, wd ? `伤 ${wd}道 属性-${wd * 8}%` : '无伤', 174, 128, 12, wd ? C.red : C.green);
  const chem = chemistry(S.champs, seatedChampUids());
  const at = roomOfChamp(c.uid);
  const tags = chemOf(chem.map, c.uid).tags;
  label(uiLayer, at < 0 ? '未上阵（留守，疲劳每战-25）' : cut(`${at + 1}房统领 ${tags.length ? tags.join('・') : '无同僚效应'}`, 20),
    174, 144, 12, at < 0 ? C.stoneLit : C.steel);
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
  button(g, uiLayer, hits, 174, 200, 130, 15, `重随特质 ${REROLL_TRAIT_BONE}骨+${REROLL_TRAIT_MANA}魔`, () => rerollChampTraits(c),
    { size: 10, enabled: S.bone >= REROLL_TRAIT_BONE && S.mana >= REROLL_TRAIT_MANA, border: C.purple, color: C.white });
  button(g, uiLayer, hits, 306, 200, 48, 15, `休整 ${REST_MANA}魔`, () => restChamp(c),
    { size: 10, enabled: c.fatigue > 0 && S.mana >= REST_MANA, border: C.steel, color: C.white });
  button(g, uiLayer, hits, 356, 200, 50, 15, `疗伤 ${HEAL_MANA}魔`, () => healChamp(c),
    { size: 10, enabled: wd > 0 && S.mana >= HEAL_MANA, border: wd ? C.red : C.stoneLit, color: wd ? C.white : C.stoneLit });
  button(g, uiLayer, hits, 408, 200, 36, 15, '同僚', () => sayChem(chem.lines), { size: 10, border: C.purple, color: C.purple });
  button(g, uiLayer, hits, 446, 200, 34, 15, '遣退', () => dismissChamp(c), { size: 10, border: C.red, color: C.red });
}
```

- [x] **Step 3: 新增 `drawChampInfo`**

```js
function drawChampInfo(g, c) {
  const chem = chemistry(S.champs, seatedChampUids());
  const st = statOf(c, chem.map);
  const ti = activeTitleOf(c);
  label(uiLayer, cut(`${c.name}${ti ? `・${ti.name}` : ''}`, 12), 174, 64, 12, C.gold);
  uiLayer.addChild(sprite(monKind(c.race).tex, 446, 84, 32));

  // 左列：基础属性
  label(uiLayer, '基础属性', 174, 80, 12, C.gold);
  label(uiLayer, `生命 ${st.hp}`, 174, 96, 12, C.bone);
  label(uiLayer, `攻击 ${st.atk}`, 174, 112, 12, C.bone);
  label(uiLayer, `防御 ${st.def}`, 174, 128, 12, C.bone);
  label(uiLayer, `攻速 ${st.spd.toFixed(2)}`, 174, 144, 12, C.bone);
  label(uiLayer, `受伤 ${Math.round(st.dmgTakenMult * 100)}%`, 250, 96, 12, C.bone);
  label(uiLayer, `经验 ${Math.round(st.xpMult * 100)}%`, 250, 112, 12, C.bone);
  label(uiLayer, `冷却 ${Math.round(st.eff.skillCdMult * 100)}%`, 250, 128, 12, C.bone);
  label(uiLayer, cut(auraText(st.auraId, st.auraPow), 16), 250, 144, 12, C.gold);

  // 左列：特质
  let ty = 162;
  label(uiLayer, '特质', 174, ty, 12, C.gold); ty += 16;
  if (c.traits.length) {
    for (const t of c.traits) {
      label(uiLayer, `${TRAITS[t].name}：${cut(TRAITS[t].desc, 16)}`, 174, ty, 12, traitColor(t));
      ty += 14;
    }
  } else {
    label(uiLayer, '无', 174, ty, 12, C.stoneLit); ty += 14;
  }

  // 右列：战斗机制
  label(uiLayer, '战斗机制', 320, 80, 12, C.gold);
  const mechs = effDetailText(st.eff);
  let my = 96;
  if (mechs.length) {
    for (const txt of mechs.slice(0, 6)) {
      wrapText(uiLayer, cut(txt, 22), 320, my, 140, 11, C.steel);
      my += 13;
    }
  } else {
    label(uiLayer, '无特殊机制', 320, my, 12, C.stoneLit); my += 14;
  }

  // 右列：称号（Task 4 补充分页/展开）
  drawChampTitleList(g, c, 320, my + 8, 140, 116);
}
```

- [x] **Step 4: 语法检查与浏览器验证**

```bash
node --check game.js
```

打开游戏，确认：
- 英雄面板出现 4 个标签页：状态、详情、专精、装备。
- 状态页只显示精简信息。
- 详情页显示基础属性、特质、机制。

- [x] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat: split hero panel into stat and info tabs"
```

---

### Task 4: 详情页称号列表（分页 + 点击展开切换）

**Files:**
- Modify: `game.js`（在 `drawChampInfo` 调用处新增 `drawChampTitleList`）
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: `unlockedTitles`、`titleById`、`titleEffectText`、`activeTitleOf`
- Produces: `drawChampTitleList(g, c, x, y, w, h)`

- [x] **Step 1: 添加分页状态变量**

在 `game.js` 顶部变量区（`let heroView = 'stat';` 附近）添加：

```js
let champTitlePage = 0;
```

并在每次切换英雄时重置：找到 `heroSelect` 暴露的函数（约 line 4155），在其内部设置 `champTitlePage = 0;`。

- [x] **Step 2: 实现 `drawChampTitleList`**

```js
function drawChampTitleList(g, c, x, y, w, h) {
  label(uiLayer, '称号', x, y, 12, C.gold);
  const unlocked = unlockedTitles(c);
  if (!unlocked.length) {
    label(uiLayer, '暂无称号', x, y + 16, 12, C.stoneLit);
    return;
  }
  const pageSize = 4;
  const maxPage = Math.max(0, Math.ceil(unlocked.length / pageSize) - 1);
  champTitlePage = Math.min(champTitlePage, maxPage);
  const start = champTitlePage * pageSize;
  const page = unlocked.slice(start, start + pageSize);
  let ty = y + 16;
  for (const id of page) {
    const t = titleById(id);
    const active = c.activeTitle === id;
    button(g, uiLayer, hits, x, ty, w, 14, cut(t.name, 8), () => {
      c.activeTitle = id; champTitlePage = 0; playSfx('tab'); persist(); render();
    }, { size: 10, fill: active ? C.goldDark : C.ink, border: active ? C.gold : C.stoneLit, color: active ? C.white : C.steel });
    if (active) {
      wrapText(uiLayer, cut(`${t.desc}｜${titleEffectText(t)}`, 30), x + 4, ty + 14, w - 8, 10, C.bone);
      ty += 28;
    } else {
      ty += 16;
    }
  }
  if (maxPage > 0) {
    button(g, uiLayer, hits, x, ty + 2, w / 2 - 2, 12, '◀', () => { champTitlePage = Math.max(0, champTitlePage - 1); playSfx('tab'); render(); },
      { size: 10, enabled: champTitlePage > 0, border: C.stoneLit, color: C.stoneLit });
    button(g, uiLayer, hits, x + w / 2 + 2, ty + 2, w / 2 - 2, 12, '▶', () => { champTitlePage = Math.min(maxPage, champTitlePage + 1); playSfx('tab'); render(); },
      { size: 10, enabled: champTitlePage < maxPage, border: C.stoneLit, color: C.stoneLit });
  }
}
```

- [x] **Step 3: 浏览器验证**

- 详情页称号列表显示正确。
- 点击称号切换激活并展开显示数值。
- 分页按钮在多称号时可用。

- [x] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: add paginated expandable title list to hero detail"
```

---

### Task 5: 已招募魔物信息卡片默认/详情切换

**Files:**
- Modify: `game.js:2141-2179`
- Test: 浏览器手动验证

**Interfaces:**
- Consumes: `instKind`、`selectedAffixes`、`monKind`、`isCustomKind`
- Produces: `drawMonInstCard(g, inst, k)`、`drawMonInstDetail(g, inst, k)`

- [x] **Step 1: 添加切换状态变量**

在 `game.js` 顶部变量区添加：

```js
let monDetailMode = false;
```

在每次选择魔物时重置：在绘制 `sel.kind === 'inst'` 分支开头，或全局 `sel` 变化时设置 `monDetailMode = false;`。为简化，在分支开头判断：如果当前 `sel.kind !== 'inst'` 则不处理；由于每次 `render` 都会进入该分支，可以在分支第一行重置（但会每次重置，导致无法保持）。更好的做法：在 `render` 函数中 `sel` 变化时重置。为简化，本计划采用在点击“详情”时切换、点击“返回”时关闭，切换魔物时由于重新进入分支，`monDetailMode` 保持上一状态；可接受。若需要重置，可在设置 `sel` 的地方同步重置。

- [x] **Step 2: 拆分默认卡片与详情视图**

把原 `if (sel.kind === 'inst') { ... }` 内部替换为：

```js
if (sel.kind === 'inst') {
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
```

- [x] **Step 3: 实现默认卡片**

```js
function drawMonInstCard(g, inst, k) {
  labelC(uiLayer, cut(`${k.name} Lv${inst.lv}`, 11), 405, 46, 12, C.white);
  uiLayer.addChild(sprite(k.tex, 405, 96, 36));
  const mult = LEVEL_MULT[inst.lv - 1];
  label(uiLayer, `生命 ${Math.round(k.hp * mult)}  攻击 ${Math.round(k.atk * mult)}`, 340, 100, 12, C.bone);
  label(uiLayer, `防御 ${Math.round(k.def * mult)}  速度 ${k.spd.toFixed(1)}`, 340, 114, 12, C.bone);
  const at = roomOf(inst.uid);
  label(uiLayer, at < 0 ? '驻守：空闲' : `驻守：${at + 1}房`, 340, 128, 12, at < 0 ? C.stoneLit : C.gold);
  label(uiLayer, `技能 ${k.skill}`, 340, 142, 12, C.purple);
  wrapText(uiLayer, cut(k.skillDesc, 24), 340, 161, 130, 12, C.stoneLit);
  if (inst.lv < 5) {
    const need = XP_PER_LEVEL[inst.lv - 1];
    bar(uiGfx, 340, 186, 130, 6, inst.xp / need, C.green);
    label(uiLayer, `经验 ${inst.xp}/${need}`, 340, 192, 12, C.bone);
    const cost = UPGRADE_COST[inst.lv - 1];
    const can = inst.xp >= need && S.bone >= cost;
    button(g, uiLayer, hits, 340, 205, 130, 15, `升级 ${cost}骨币`, () => {
      inst.xp -= need; inst.lv++; S.bone -= cost; playSfx('buy'); persist(); say(`${k.name} 升到 Lv${inst.lv}`); render();
    }, { size: 12, enabled: can, fill: C.greenDark, border: C.green, color: C.white });
  } else {
    label(uiLayer, '已达满级', 340, 192, 12, C.gold);
  }
  button(g, uiLayer, hits, 340, 224, 62, 16, '详情', () => { monDetailMode = true; playSfx('tab'); render(); },
    { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
  const gcount = (inst.graft ?? []).length;
  if (isCustomKind(inst.kind)) {
    button(g, uiLayer, hits, 406, 224, 46, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
    button(g, uiLayer, hits, 456, 224, 34, 16, '拆', () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
  } else {
    button(g, uiLayer, hits, 406, 224, 84, 16, `遣散+${Math.round(k.cost * 0.5)}`, () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
  }
}
```

- [x] **Step 4: 实现详情视图**

```js
function drawMonInstDetail(g, inst, k) {
  labelC(uiLayer, cut(`${k.name} Lv${inst.lv}`, 11), 405, 46, 12, C.white);
  uiLayer.addChild(sprite(k.tex, 405, 78, 32));
  const mult = LEVEL_MULT[inst.lv - 1];
  label(uiLayer, `生命 ${Math.round(k.hp * mult)}  攻击 ${Math.round(k.atk * mult)}`, 340, 66, 12, C.bone);
  label(uiLayer, `防御 ${Math.round(k.def * mult)}  速度 ${k.spd.toFixed(1)}`, 340, 80, 12, C.bone);
  const at = roomOf(inst.uid);
  label(uiLayer, at < 0 ? '驻守：空闲' : `驻守：${at + 1}房`, 340, 94, 12, at < 0 ? C.stoneLit : C.gold);
  label(uiLayer, `技能 ${k.skill}`, 340, 108, 12, C.purple);
  wrapText(uiLayer, k.skillDesc, 340, 122, 130, 11, C.stoneLit);
  const instAfs = selectedAffixes(k.affixes);
  let dy = 156;
  if (instAfs.length) {
    label(uiLayer, '词缀', 340, dy, 12, C.gold); dy += 14;
    for (const a of instAfs) {
      wrapText(uiLayer, `${a.name}：${cut(a.desc, 26)}`, 340, dy, 130, 11, C.bone);
      dy += 13;
    }
  }
  label(uiLayer, `被动：${inst.lv < 5 ? 'Lv5 解锁' : k.passive}`, 340, dy, 12, C.gold);
  if (inst.lv >= 5) {
    wrapText(uiLayer, cut(k.passiveDesc ?? k.passive, 30), 340, dy + 14, 130, 11, C.stoneLit);
  }
  const gcount = (inst.graft ?? []).length;
  button(g, uiLayer, hits, 340, 224, 80, 16, '返回', () => { monDetailMode = false; playSfx('tab'); render(); },
    { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
  if (isCustomKind(inst.kind)) {
    button(g, uiLayer, hits, 424, 224, 42, 16, '重组', () => openStitch(inst.uid), { size: 12, fill: C.purpleDark, border: C.purple, color: C.white });
    button(g, uiLayer, hits, 470, 224, 34, 16, gcount ? `改造${gcount}` : '改造', () => openGraft(inst.uid), { size: 12, border: gcount ? C.gold : C.purple, color: gcount ? C.gold : C.purple });
  } else {
    button(g, uiLayer, hits, 424, 224, 80, 16, `遣散+${Math.round(k.cost * 0.5)}`, () => dismantle(inst.uid), { size: 12, border: C.red, color: C.red });
  }
}
```

注意：如果 `k` 中没有 `passiveDesc`，需要显示 `k.passive`。若图鉴/数据中有详细描述字段，请使用实际字段名。

- [x] **Step 5: 浏览器验证**

- 选中已招募魔物，默认卡片不显示词缀和被动。
- 点击“详情”切换到详情视图，显示词缀和被动。
- 点击“返回”回到默认卡片。
- 升级后被动解锁状态正确。

- [x] **Step 6: Commit**

```bash
git add game.js
git commit -m "feat: add monster card detail toggle"
```

---

## Self-Review

1. **Spec coverage：** 英雄状态页精简、详情页属性/机制/特质/称号、特质染色、魔物默认/详情切换均有对应任务。
2. **Placeholder scan：** 无 TBD/TODO/模糊描述。
3. **Type一致性：** `drawChampTitleList` 在 Task 4 定义并在 Task 3 的 `drawChampInfo` 中调用；由于 Task 3 提交早于 Task 4，需确保 Task 3 的代码在 Task 4 完成前临时不调用 `drawChampTitleList`，或在同一 Task 中补齐。为安全起见，建议 Task 3 中先使用占位 `label(uiLayer, '称号', 320, my + 8, 12, C.gold);`，Task 4 再替换为 `drawChampTitleList` 调用。
