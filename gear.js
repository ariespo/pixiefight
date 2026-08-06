// 英雄装备：三个槽（冠/身/持），战后从勇者身上缴获，也能在锻造台自己打。纯逻辑，无 pixi，可 node 直跑平衡。
// 设计意图：掉落装备奖励"把勇者真的杀掉"；锻造装备奖励"攒资源做规划" —— 两条来源互补，都不能用骨币直接买成品。
                                        

                                                 
export const GEAR_SLOTS                                   = [
  { id: 'crown', name: '冠' },
  { id: 'body', name: '身' },
  { id: 'hand', name: '持' },
];

                       
                                                                         
                                                                     
                                                                   
                                                                     
                                                                     
                                                                     
                                                                     
                                                     
                        
  

// MonEff 的合并规则：数值类相加、乘数类相乘、开关类取或。
// 单列一份是因为"装备叠词缀"会走两次合并，两边规则必须完全一致，否则同一条铭文在不同来源下强度不同。
const EFF_MULT = new Set(['rageAura', 'bulwarkAura', 'skillCdMult', 'dmgTakenMult']);
const EFF_FLAG = new Set(['frenzy', 'reach', 'anchorHold', 'reviveAlly', 'grip']);
export function mergeEff(dst                 , src                             ) {
  if (!src) return dst;
  for (const [k, v] of Object.entries(src)) {
    if (v == null) continue;
    if (EFF_FLAG.has(k)) { if (v) (dst                           )[k] = true; continue; }
    if (typeof v !== 'number') continue;
    const cur = (dst                                      )[k];
    (dst                          )[k] = EFF_MULT.has(k) ? (cur ?? 1) * v : (cur ?? 0) + v;
  }
  return dst;
}

;                       
                                                        
                                               
               
               
                                                  
  

// 固定装备：三槽 × 三档 × 三件 = 27 件。金档必带一条"代价"，蓝档小幅偏向，白档纯数值。
export const GEARS             = [
  // ── 冠：光环与统御向 —— 统领的定位是"带兵"，冠位强化这件事
  { id: 'crown-gold', name: '缴获王冠', slot: 'crown', tex: 'gear-crown', rank: 2,
    desc: '光环 +45%，疲劳增长 +20%', mod: { aura: 1.45, fatigue: 1.2 } },
  { id: 'crown-mask', name: '空脸面具', slot: 'crown', tex: 'gear-mask', rank: 2,
    desc: '同房怪物加攻 +18%，自身生命 -10%', mod: { hp: 0.9, eff: { rageAura: 1.18 } } },
  { id: 'crown-lantern', name: '幽照提灯', slot: 'crown', tex: 'gear-lantern', rank: 2,
    desc: '普攻叠易伤 8%，攻速 -8%', mod: { spd: 0.92, eff: { markHit: 0.08 } } },
  { id: 'crown-orb', name: '窥心之球', slot: 'crown', tex: 'gear-orb', rank: 1,
    desc: '技能冷却 -15%，光环 +10%', mod: { cd: 0.85, aura: 1.1 } },
  { id: 'crown-helm', name: '凹陷战盔', slot: 'crown', tex: 'gear-helm', rank: 1,
    desc: '防御 +4，受伤 -6%', mod: { def: 4, dmgTaken: 0.94 } },
  { id: 'crown-tome', name: '残页手册', slot: 'crown', tex: 'gear-tome', rank: 1,
    desc: '战后经验 +25%，光环 +6%', mod: { xp: 1.25, aura: 1.06 } },
  { id: 'crown-banner', name: '断裂军旗', slot: 'crown', tex: 'gear-banner', rank: 0,
    desc: '光环 +12%', mod: { aura: 1.12 } },
  { id: 'crown-hood', name: '粗布头巾', slot: 'crown', tex: 'gear-robe', rank: 0,
    desc: '疲劳增长 -10%', mod: { fatigue: 0.9 } },
  { id: 'crown-ring', name: '铜环指戒', slot: 'crown', tex: 'gear-ring', rank: 0,
    desc: '技能冷却 -7%', mod: { cd: 0.93 } },
  // ── 身：耐久向
  { id: 'body-cloak', name: '圣职长袍', slot: 'body', tex: 'gear-robe', rank: 2,
    desc: '生命 +26%，倒下不留伤，攻击 -12%', mod: { hp: 1.26, atk: 0.88, woundGuard: true } },
  { id: 'body-anchor', name: '铁锚重铠', slot: 'body', tex: 'gear-plate', rank: 2,
    desc: '嘲讽近战、受伤 -18%，攻速 -14%', mod: { dmgTaken: 0.82, spd: 0.86, eff: { anchorHold: true } } },
  { id: 'body-thorn', name: '倒刺胸衣', slot: 'body', tex: 'gear-shield', rank: 2,
    desc: '被打时反弹 22% 伤害，生命 -8%', mod: { hp: 0.92, eff: { thorns: 0.22 } } },
  { id: 'body-plate', name: '骑士胸甲', slot: 'body', tex: 'gear-plate', rank: 1,
    desc: '防御 +5，受伤 -8%，攻速 -6%', mod: { def: 5, dmgTaken: 0.92, spd: 0.94 } },
  { id: 'body-scale', name: '鳞叠软甲', slot: 'body', tex: 'gear-shield', rank: 1,
    desc: '生命 +14%，防御 +2', mod: { hp: 1.14, def: 2 } },
  { id: 'body-vest', name: '缝合内衬', slot: 'body', tex: 'gear-robe', rank: 1,
    desc: '每秒回复 1.6，疲劳增长 -8%', mod: { fatigue: 0.92, eff: { hpRegen: 1.6 } } },
  { id: 'body-hide', name: '粗缝革衣', slot: 'body', tex: 'gear-plate', rank: 0,
    desc: '生命 +10%', mod: { hp: 1.1 } },
  { id: 'body-buckler', name: '木制小盾', slot: 'body', tex: 'gear-shield', rank: 0,
    desc: '防御 +3', mod: { def: 3 } },
  { id: 'body-rag', name: '破旧罩衫', slot: 'body', tex: 'gear-robe', rank: 0,
    desc: '受伤 -5%', mod: { dmgTaken: 0.95 } },
  // ── 持：输出与机动向
  { id: 'hand-fang', name: '勇者獠牙', slot: 'hand', tex: 'gear-fang', rank: 2,
    desc: '攻击 +32%，生命 -6%', mod: { atk: 1.32, hp: 0.94 } },
  { id: 'hand-axe', name: '裂颅巨斧', slot: 'hand', tex: 'gear-axe', rank: 2,
    desc: '残血目标伤害翻倍，攻速 -12%', mod: { spd: 0.88, eff: { execute: 0.3 } } },
  { id: 'hand-reach', name: '长柄刺钩', slot: 'hand', tex: 'gear-axe', rank: 2,
    desc: '普攻可越前排直击后排，攻击 -8%', mod: { atk: 0.92, eff: { reach: true } } },
  { id: 'hand-boots', name: '疾行靴', slot: 'hand', tex: 'gear-boots', rank: 1,
    desc: '攻速 +15%，战后经验 +20%', mod: { spd: 1.15, xp: 1.2 } },
  { id: 'hand-torch', name: '火漆短杖', slot: 'hand', tex: 'gear-lantern', rank: 1,
    desc: '普攻点燃 3，攻击 +6%', mod: { atk: 1.06, eff: { burnHit: 3 } } },
  { id: 'hand-chalice', name: '饮血圣杯', slot: 'hand', tex: 'gear-orb', rank: 1,
    desc: '普攻吸血 15%', mod: { eff: { lifestealPct: 0.15 } } },
  { id: 'hand-fang-worn', name: '缺口短刃', slot: 'hand', tex: 'gear-fang', rank: 0,
    desc: '攻击 +11%', mod: { atk: 1.11 } },
  { id: 'hand-sling', name: '皮索投石', slot: 'hand', tex: 'gear-boots', rank: 0,
    desc: '普攻溅射 20%', mod: { eff: { splash: 0.2 } } },
  { id: 'hand-whet', name: '磨石护手', slot: 'hand', tex: 'gear-axe', rank: 0,
    desc: '攻速 +8%', mod: { spd: 1.08 } },
];

// 自制装备的运行时注册表：读档时把图纸派生成 GearKind 塞进来，
// 于是 gearById 对固定件和自制件是同一个入口 —— champStats/UI/掉落都不需要知道区别。
let FORGED             = [];
export function registerForged(list              ) {
  FORGED = [];
  for (const f of list) {
    const k = craftKind(f.plan, f.id);
    if (k) FORGED.push({ ...k, forged: true });
  }
}
export const forgedKinds = () => FORGED.slice();
export const gearById = (id        )                       =>
  GEARS.find((g) => g.id === id) ?? FORGED.find((g) => g.id === id);
export const GEAR_CAP = 12;            // 仓库上限，满了掉落会被顶掉（提示玩家熔掉）
export const MELT_MANA = [4, 7, 12];   // 熔掉一件返还的魔质，按档
export const REFORGE_MANA = 20;        // 重铸：把一件装备换成同槽同档的另一件

// 掉落：本场击倒数与被击倒的最高勇者等级决定件数与档次。
// 只有真的杀掉勇者才掉 —— 靠封印硬扛赢下来不给战利品。
export function rollLoot(kills        , maxLv        , rng              )           {
  if (kills <= 0) return [];
  const out           = [];
  const n = kills >= 5 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const r = rng();
    // 勇者等级越高，金装机会越大；档次概率随 maxLv 平滑上移
    const goldP = Math.min(0.22, 0.03 + maxLv * 0.016);
    const blueP = goldP + Math.min(0.45, 0.2 + maxLv * 0.02);
    const rank = r < goldP ? 2 : r < blueP ? 1 : 0;
    const pool = GEARS.filter((g) => g.rank === rank);   // 只掉固定件；自制装备只能自己打
    out.push(pool[Math.floor(rng() * pool.length)].id);
  }
  return out;
}

;                                                        

// 把已装备的效果折成一组乘数，champStats 只吃这个结果（和特质/专精同层相乘）
;                      
                                                    
                                                                          
                                       
                                                                      
  
export const NO_GEAR          = { hp: 1, atk: 1, def: 0, spd: 1, aura: 1, dmgTaken: 1, cd: 1, fatigue: 1, xp: 1, woundGuard: false, names: [], eff: {} };

export function gearEff(eq                      )          {
  const e          = { ...NO_GEAR, names: [], eff: {} };
  if (!eq) return e;
  for (const slot of GEAR_SLOTS) {
    const g = gearById(eq[slot.id] ?? '');
    if (!g) continue;
    const m = g.mod;
    e.hp *= m.hp ?? 1; e.atk *= m.atk ?? 1; e.def += m.def ?? 0; e.spd *= m.spd ?? 1;
    e.aura *= m.aura ?? 1; e.dmgTaken *= m.dmgTaken ?? 1; e.cd *= m.cd ?? 1;
    e.fatigue *= m.fatigue ?? 1; e.xp *= m.xp ?? 1;
    if (m.woundGuard) e.woundGuard = true;
    mergeEff(e.eff, m.eff);
    e.names.push(g.name);
  }
  return e;
}

// 套装：三槽都来自同一"来源阵营"没有意义（装备是缴获的杂物），
// 改成按档次给共鸣 —— 三件同档才算一套，鼓励玩家挑而不是无脑穿最高档。
export function gearSet(eq                      )                                                                  {
  if (!eq) return null;
  const gs = GEAR_SLOTS.map((s) => gearById(eq[s.id] ?? '')).filter(Boolean)              ;
  if (gs.length < 3) return null;
  if (gs.every((g) => g.rank === 2)) return { name: '王者三件', desc: '生命 +12%、光环 +15%', hp: 1.12, aura: 1.15 };
  if (gs.every((g) => g.rank === gs[0].rank)) return { name: '成套装束', desc: '生命 +5%', hp: 1.05, aura: 1 };
  return null;
}

// ============ 锻造台：模块化装备打造 ============
// 三段式：胚体（决定槽位与基础数值）× 铭文（决定机制，最多 2 条）× 淬火（一条整体偏向）。
// 与"缝合怪物"刻意同构：都是选模块 → 看派生 → 付资源，玩家学一次规则用两处。
// 平衡口径：造出来的装备大致等于蓝档，堆满好铭文能接近金档，但淬火的代价一定会咬回来。

;                        
                                                        
                             
               
                                           
                                        
  

// 每槽 4 种胚体：1 条铭文的便宜款 / 2 条铭文的贵款，各两种数值取向
export const FRAMES              = [
  { id: 'fr-crown-iron', name: '铁盔胚', slot: 'crown', tex: 'gear-helm', bone: 40, mana: 10, slots: 1,
    desc: '防御 +3', mod: { def: 3 } },
  { id: 'fr-crown-bone', name: '骨冠胚', slot: 'crown', tex: 'gear-mask', bone: 55, mana: 14, slots: 1,
    desc: '光环 +14%', mod: { aura: 1.14 } },
  { id: 'fr-crown-crest', name: '王冠胚', slot: 'crown', tex: 'gear-crown', bone: 95, mana: 26, slots: 2,
    desc: '光环 +18%，疲劳 +8%', mod: { aura: 1.18, fatigue: 1.08 } },
  { id: 'fr-crown-tome', name: '典册胚', slot: 'crown', tex: 'gear-tome', bone: 90, mana: 30, slots: 2,
    desc: '技能冷却 -12%，经验 +12%', mod: { cd: 0.88, xp: 1.12 } },
  { id: 'fr-body-hide', name: '革衣胚', slot: 'body', tex: 'gear-robe', bone: 40, mana: 10, slots: 1,
    desc: '生命 +9%', mod: { hp: 1.09 } },
  { id: 'fr-body-buckler', name: '木盾胚', slot: 'body', tex: 'gear-shield', bone: 52, mana: 12, slots: 1,
    desc: '防御 +4', mod: { def: 4 } },
  { id: 'fr-body-plate', name: '重甲胚', slot: 'body', tex: 'gear-plate', bone: 100, mana: 24, slots: 2,
    desc: '生命 +16%、受伤 -7%，攻速 -6%', mod: { hp: 1.16, dmgTaken: 0.93, spd: 0.94 } },
  { id: 'fr-body-shroud', name: '长袍胚', slot: 'body', tex: 'gear-robe', bone: 88, mana: 32, slots: 2,
    desc: '生命 +12%，光环 +8%', mod: { hp: 1.12, aura: 1.08 } },
  { id: 'fr-hand-blade', name: '短刃胚', slot: 'hand', tex: 'gear-fang', bone: 42, mana: 10, slots: 1,
    desc: '攻击 +10%', mod: { atk: 1.1 } },
  { id: 'fr-hand-boot', name: '靴履胚', slot: 'hand', tex: 'gear-boots', bone: 46, mana: 12, slots: 1,
    desc: '攻速 +9%', mod: { spd: 1.09 } },
  { id: 'fr-hand-axe', name: '巨斧胚', slot: 'hand', tex: 'gear-axe', bone: 104, mana: 22, slots: 2,
    desc: '攻击 +16%，攻速 -8%', mod: { atk: 1.16, spd: 0.92 } },
  { id: 'fr-hand-staff', name: '法杖胚', slot: 'hand', tex: 'gear-lantern', bone: 92, mana: 34, slots: 2,
    desc: '攻击 +12%，技能冷却 -10%', mod: { atk: 1.12, cd: 0.9 } },
];
export const frameById = (id        ) => FRAMES.find((f) => f.id === id);

// 铭文：装备的"词缀"。slots 限制了同一件上能刻几条；每条有骨/魔成本与适用槽位。
                        
                                                                     
                            
               
                                                           
               
  

export const RUNES             = [
  // 纯数值（任意槽）
  { id: 'rn-hp', name: '厚', word: '厚', bone: 24, mana: 6, slots: 'any', desc: '生命 +12%', tag: '生命+12%', mod: { hp: 1.12 } },
  { id: 'rn-atk', name: '锐', word: '锐', bone: 26, mana: 6, slots: 'any', desc: '攻击 +10%', tag: '攻击+10%', mod: { atk: 1.1 } },
  { id: 'rn-def', name: '坚', word: '坚', bone: 22, mana: 6, slots: 'any', desc: '防御 +4', tag: '防御+4', mod: { def: 4 } },
  { id: 'rn-spd', name: '疾', word: '疾', bone: 26, mana: 8, slots: 'any', desc: '攻速 +10%', tag: '攻速+10%', mod: { spd: 1.1 } },
  { id: 'rn-guard', name: '钝', word: '钝', bone: 30, mana: 10, slots: 'any', desc: '受伤 -9%', tag: '受伤-9%', mod: { dmgTaken: 0.91 } },
  // 机制类（写 MonEff，和词缀同一套战斗字段）
  { id: 'rn-thorn', name: '刺', word: '刺', bone: 34, mana: 12, slots: ['body', 'crown'], desc: '被打时反弹 16% 伤害', tag: '反伤16%', mod: { eff: { thorns: 0.16 } } },
  { id: 'rn-venom', name: '毒', word: '毒', bone: 30, mana: 12, slots: ['hand', 'crown'], desc: '普攻附毒 4', tag: '附毒4', mod: { eff: { venomHit: 4 } } },
  { id: 'rn-burn', name: '燃', word: '燃', bone: 32, mana: 12, slots: ['hand', 'crown'], desc: '普攻点燃 3', tag: '点燃3', mod: { eff: { burnHit: 3 } } },
  { id: 'rn-chill', name: '霜', word: '霜', bone: 30, mana: 12, slots: ['hand', 'body'], desc: '普攻减速 12%', tag: '减速12%', mod: { eff: { chillHit: 0.12 } } },
  { id: 'rn-steal', name: '饮', word: '饮', bone: 36, mana: 14, slots: ['hand'], desc: '普攻吸血 12%', tag: '吸血12%', mod: { eff: { lifestealPct: 0.12 } } },
  { id: 'rn-splash', name: '溅', word: '溅', bone: 34, mana: 14, slots: ['hand'], desc: '普攻溅射 18%', tag: '溅射18%', mod: { eff: { splash: 0.18 } } },
  { id: 'rn-mark', name: '蚀', word: '蚀', bone: 38, mana: 16, slots: ['hand', 'crown'], desc: '普攻叠易伤 6%', tag: '易伤6%', mod: { eff: { markHit: 0.06 } } },
  { id: 'rn-exec', name: '决', word: '决', bone: 40, mana: 18, slots: ['hand'], desc: '目标残血（<28%）伤害翻倍', tag: '残血斩', mod: { eff: { execute: 0.28 } } },
  { id: 'rn-reach', name: '越', word: '越', bone: 44, mana: 20, slots: ['hand'], desc: '普攻越过前排直击后排', tag: '越排打后', mod: { eff: { reach: true } } },
  { id: 'rn-regen', name: '愈', word: '愈', bone: 32, mana: 14, slots: ['body'], desc: '每秒回复 1.5', tag: '回复1.5', mod: { eff: { hpRegen: 1.5 } } },
  { id: 'rn-anchor', name: '锚', word: '锚', bone: 36, mana: 16, slots: ['body'], desc: '嘲讽近战勇者', tag: '嘲讽', mod: { eff: { anchorHold: true } } },
  { id: 'rn-rage', name: '怒', word: '怒', bone: 38, mana: 18, slots: ['crown'], desc: '同房怪物加攻 +12%', tag: '群攻+12%', mod: { eff: { rageAura: 1.12 } } },
  { id: 'rn-bulwark', name: '庇', word: '庇', bone: 38, mana: 18, slots: ['crown'], desc: '同房怪物受伤 -10%', tag: '群防+10%', mod: { eff: { bulwarkAura: 0.9 } } },
  { id: 'rn-echo', name: '溢', word: '溢', bone: 26, mana: 10, slots: 'any', desc: '战后存活额外产 3 魔质', tag: '产魔3', mod: { eff: { manaEcho: 3 } } },
  { id: 'rn-bone', name: '积', word: '积', bone: 26, mana: 10, slots: 'any', desc: '战后存活额外产 6 骨币', tag: '产骨6', mod: { eff: { boneEcho: 6 } } },
  { id: 'rn-xp', name: '悟', word: '悟', bone: 28, mana: 10, slots: 'any', desc: '战后经验 +22%', tag: '经验+22%', mod: { xp: 1.22 } },
  { id: 'rn-ward', name: '护', word: '护', bone: 42, mana: 20, slots: ['body', 'crown'], desc: '倒下不留伤', tag: '免留伤', mod: { woundGuard: true } },
];
export const runeById = (id        ) => RUNES.find((r) => r.id === id);
export const runesFor = (slot          ) => RUNES.filter((r) => r.slots === 'any' || r.slots.includes(slot));

// 淬火：一条整体偏向，必带代价。零成本的"不淬火"也是正当选择。
                                                                                                
export const TEMPERS               = [
  { id: 'tp-none', name: '不淬', mana: 0, desc: '保持原样', mod: {} },
  { id: 'tp-blood', name: '血淬', mana: 16, desc: '攻击 +10%，生命 -8%', mod: { atk: 1.1, hp: 0.92 } },
  { id: 'tp-stone', name: '石淬', mana: 16, desc: '受伤 -10%，攻速 -8%', mod: { dmgTaken: 0.9, spd: 0.92 } },
  { id: 'tp-wind', name: '风淬', mana: 18, desc: '攻速 +12%，防御 -2', mod: { spd: 1.12, def: -2 } },
  { id: 'tp-soul', name: '魂淬', mana: 22, desc: '光环 +16%，疲劳 +14%', mod: { aura: 1.16, fatigue: 1.14 } },
  { id: 'tp-still', name: '静淬', mana: 20, desc: '疲劳 -16%，攻击 -6%', mod: { fatigue: 0.84, atk: 0.94 } },
];
export const temperById = (id        ) => TEMPERS.find((t) => t.id === id);

// 一张打造图纸（存档里就存这个；打出来的实体装备 id 形如 fg3）
                                                                                         
                                                         

export const FORGED_CAP = 10;      // 自制装备图纸上限（仓库另有 GEAR_CAP）

// 把胚体+铭文+淬火折成一件 GearKind，UI 与 champStats 都读这个结果 —— 派生只有这一处，不会两边算出不同的数
export function craftKind(plan           , id = 'craft-preview')                  {
  const fr = frameById(plan.frame);
  if (!fr) return null;
  const runes = plan.runes.map(runeById).filter(Boolean)              ;
  const tp = temperById(plan.temper) ?? TEMPERS[0];
  const mod          = { hp: 1, atk: 1, def: 0, spd: 1, aura: 1, dmgTaken: 1, cd: 1, fatigue: 1, xp: 1 };
  const eff                  = {};
  for (const m of [fr.mod, ...runes.map((r) => r.mod), tp.mod]) {
    mod.hp = (mod.hp ?? 1) * (m.hp ?? 1);
    mod.atk = (mod.atk ?? 1) * (m.atk ?? 1);
    mod.def = (mod.def ?? 0) + (m.def ?? 0);
    mod.spd = (mod.spd ?? 1) * (m.spd ?? 1);
    mod.aura = (mod.aura ?? 1) * (m.aura ?? 1);
    mod.dmgTaken = (mod.dmgTaken ?? 1) * (m.dmgTaken ?? 1);
    mod.cd = (mod.cd ?? 1) * (m.cd ?? 1);
    mod.fatigue = (mod.fatigue ?? 1) * (m.fatigue ?? 1);
    mod.xp = (mod.xp ?? 1) * (m.xp ?? 1);
    if (m.woundGuard) mod.woundGuard = true;
    mergeEff(eff, m.eff);
  }
  if (Object.keys(eff).length) mod.eff = eff;
  // 档次由投入决定（看总成本），只影响熔化返还与套装判定，不额外加数值
  const c = craftCost(plan);
  const rank            = c.bone + c.mana * 3 >= 210 ? 2 : c.bone + c.mana * 3 >= 130 ? 1 : 0;
  const parts = [...runes.map((r) => r.desc), tp.id === 'tp-none' ? '' : tp.desc].filter(Boolean);
  return {
    id, name: plan.name || craftName(plan), slot: fr.slot, tex: fr.tex, rank,
    desc: parts.join('，') || fr.desc, mod,
  };
}

export function craftCost(plan           )                                 {
  const fr = frameById(plan.frame);
  if (!fr) return { bone: 0, mana: 0 };
  let bone = fr.bone, mana = fr.mana;
  for (const id of plan.runes) { const r = runeById(id); if (r) { bone += r.bone; mana += r.mana; } }
  mana += temperById(plan.temper)?.mana ?? 0;
  return { bone, mana };
}

// 自动命名：铭文的"字" + 胚体名去掉"胚"，玩家可覆盖
export function craftName(plan           )         {
  const fr = frameById(plan.frame);
  if (!fr) return '无名';
  const words = plan.runes.map((id) => runeById(id)?.word ?? '').join('');
  const base = fr.name.replace('胚', '');
  const tp = temperById(plan.temper);
  const pre = tp && tp.id !== 'tp-none' ? tp.name[0] : '';
  return `${pre}${words}${base}`.slice(0, 5) || base;
}

export function planValid(plan           )         {
  const fr = frameById(plan.frame);
  if (!fr) return '先选胚体';
  if (plan.runes.length > fr.slots) return `这个胚体只能刻 ${fr.slots} 条铭文`;
  if (new Set(plan.runes).size !== plan.runes.length) return '同一条铭文不能刻两次';
  for (const id of plan.runes) {
    const r = runeById(id);
    if (!r) return '铭文无效';
    if (r.slots !== 'any' && !r.slots.includes(fr.slot)) return `${r.name}刻不到${GEAR_SLOTS.find((s) => s.id === fr.slot) .name}位上`;
  }
  if (!temperById(plan.temper)) return '淬火无效';
  return '';
}
