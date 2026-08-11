// 高端工坊研究：每一组只能永久选择一项。这里保持为纯数据与纯函数，
// 让游戏、存档迁移和数值校验共享同一套规则。
export const WORKSHOP_RESEARCH = [
  {
    id: 'medium', name: '第一组・伤害媒介', unlockRaid: 10, workshopLevel: 1, cost: 55,
    options: [
      { id: 'plague-vat', name: '瘟疫增压釜', tag: '叠毒',
        desc: '毒素施加量 +150%，同一目标最多累积 4 层（后续层按 30% 效能叠加）；代价：所有怪物直出伤害 -30%。',
        effects: { poisonApplyMult: 2.5, poisonStackCap: 4, poisonStackFalloff: 0.30, monDirectDamageMult: 0.70 } },
      { id: 'wound-mill', name: '创口研磨机', tag: '收割',
        desc: '对生命低于 40% 的勇者伤害 +70%；代价：对健康目标的直出伤害 -20%。',
        effects: { woundedDamageMult: 1.70, healthyDirectDamageMult: 0.80 } },
      { id: 'clean-bore', name: '无菌直膛炉', tag: '直伤',
        desc: '怪物直出伤害 +30%；代价：毒与燃烧的施加量 -60%。',
        effects: { monDirectDamageMult: 1.30, poisonApplyMult: 0.40, burnApplyMult: 0.40 } },
    ],
  },
  {
    id: 'formation', name: '第二组・阵列武装', unlockRaid: 12, workshopLevel: 2, cost: 75,
    options: [
      { id: 'rear-battery', name: '后排炮列', tag: '后排核心',
        desc: '后排怪物造成伤害 +50%；代价：前排怪物造成伤害 -80%。',
        effects: { backRowDamageMult: 1.50, frontRowDamageMult: 0.20 } },
      { id: 'vanguard-press', name: '前线冲压机', tag: '前排核心',
        desc: '前排怪物造成伤害 +45%、生命 +20%；代价：后排怪物造成伤害 -45%。',
        effects: { frontRowDamageMult: 1.45, frontRowHpMult: 1.20, backRowDamageMult: 0.55 } },
      { id: 'command-rail', name: '统领传动轴', tag: '统领侧翼',
        desc: '统领与侧翼造成伤害 +40%；代价：普通前后排造成伤害 -15%。',
        effects: { commandSlotDamageMult: 1.40, regularSlotDamageMult: 0.85 } },
    ],
  },
  {
    id: 'traps', name: '第三组・陷阱工程', unlockRaid: 14, workshopLevel: 2, cost: 95,
    options: [
      { id: 'double-rail', name: '双轨机关槽', tag: '双陷阱',
        desc: '每个战斗房可安装并依次触发两个陷阱；为防止翻倍失控，每枚陷阱只有 72% 功率。',
        effects: { dualTraps: true, trapPowerMult: 0.72 } },
      { id: 'overclock-trap', name: '超压单发机', tag: '爆发陷阱',
        desc: '每房仍限一个陷阱，陷阱功率 +80%；代价：该房怪物生命 -15%。',
        effects: { trapPowerMult: 1.80, monHpMult: 0.85 } },
      { id: 'sealed-trigger', name: '封闭式扳机', tag: '反拆除',
        desc: '陷阱无法被盗贼或队长拆除，且功率 +25%；代价：怪物直出伤害 -10%。',
        effects: { trapPowerMult: 1.25, trapDisarmImmune: true, monDirectDamageMult: 0.90 } },
    ],
  },
  {
    id: 'chassis', name: '第四组・军团底盘', unlockRaid: 16, workshopLevel: 3, cost: 125,
    options: [
      { id: 'blood-engine', name: '血液回收管', tag: '吸血',
        desc: '怪物造成直出伤害时回复伤害量的 18%；代价：怪物最大生命 -15%。',
        effects: { directLifesteal: 0.18, monHpMult: 0.85 } },
      { id: 'iron-chassis', name: '铸铁承重架', tag: '厚甲',
        desc: '怪物最大生命 +35%；代价：攻击速度 -25%。',
        effects: { monHpMult: 1.35, monSpeedMult: 0.75 } },
      { id: 'quick-gear', name: '越级齿轮箱', tag: '高速',
        desc: '怪物攻击速度 +35%；代价：怪物最大生命 -22%。',
        effects: { monSpeedMult: 1.35, monHpMult: 0.78 } },
    ],
  },
  {
    id: 'keystone', name: '第五组・终局母机', unlockRaid: 18, workshopLevel: 3, cost: 160,
    options: [
      { id: 'glass-foundry', name: '玻璃铸军炉', tag: '极限输出',
        desc: '怪物直出伤害 +60%；代价：怪物最大生命 -35%。',
        effects: { monDirectDamageMult: 1.60, monHpMult: 0.65 } },
      { id: 'black-bastion', name: '黑堡铸模', tag: '极限生存',
        desc: '怪物最大生命 +55%；代价：怪物直出伤害 -25%、攻击速度 -10%。',
        effects: { monHpMult: 1.55, monDirectDamageMult: 0.75, monSpeedMult: 0.90 } },
      { id: 'chain-reaction', name: '连锁反应堆', tag: '状态机关',
        desc: '毒素施加量与陷阱功率 +50%；代价：怪物直出伤害 -25%。',
        effects: { poisonApplyMult: 1.50, burnApplyMult: 1.50, trapPowerMult: 1.50, monDirectDamageMult: 0.75 } },
    ],
  },
];

export const RESEARCH_EFFECT_DEFAULTS = Object.freeze({
  poisonApplyMult: 1, poisonStackCap: 1, poisonStackFalloff: 1, burnApplyMult: 1,
  monDirectDamageMult: 1, healthyDirectDamageMult: 1, woundedDamageMult: 1,
  frontRowDamageMult: 1, backRowDamageMult: 1, commandSlotDamageMult: 1, regularSlotDamageMult: 1,
  frontRowHpMult: 1, monHpMult: 1, monSpeedMult: 1,
  trapPowerMult: 1, dualTraps: false, trapDisarmImmune: false, directLifesteal: 0,
});

export function researchOption(id) {
  for (const group of WORKSHOP_RESEARCH) {
    const option = group.options.find((item) => item.id === id);
    if (option) return { group, option };
  }
  return null;
}

export function normalizeResearchPicks(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const group of WORKSHOP_RESEARCH) {
    const id = typeof source[group.id] === 'string' ? source[group.id] : '';
    if (group.options.some((item) => item.id === id)) out[group.id] = id;
  }
  return out;
}

export function researchEffects(picks) {
  const out = { ...RESEARCH_EFFECT_DEFAULTS };
  const normalized = normalizeResearchPicks(picks);
  for (const id of Object.values(normalized)) {
    const effects = researchOption(id)?.option.effects ?? {};
    for (const [key, value] of Object.entries(effects)) {
      if (typeof value === 'boolean') out[key] = out[key] || value;
      else if (key === 'poisonStackCap') out[key] = Math.max(out[key], value);
      else if (key === 'directLifesteal') out[key] = Math.max(out[key], value);
      else out[key] *= value;
    }
  }
  return out;
}

export function researchAvailability(group, raidNo, workshopLevel) {
  if (raidNo < group.unlockRaid) return { open: false, reason: `第${group.unlockRaid}轮开放` };
  if (workshopLevel < group.workshopLevel) return { open: false, reason: `需要工坊 Lv${group.workshopLevel}` };
  return { open: true, reason: '' };
}

export function researchDirectMultiplier(effects, row, slot, targetHpRatio = 1) {
  let mult = effects.monDirectDamageMult;
  mult *= row === 1 ? effects.backRowDamageMult : effects.frontRowDamageMult;
  mult *= slot === 'leader' || slot === 'flank' ? effects.commandSlotDamageMult : effects.regularSlotDamageMult;
  mult *= targetHpRatio < 0.4 ? effects.woundedDamageMult : effects.healthyDirectDamageMult;
  return mult;
}

export function researchPoisonApplication(current, stacks, incoming, effects) {
  const scaled = Math.max(0, incoming) * effects.poisonApplyMult;
  if (effects.poisonStackCap <= 1) return { dps: Math.max(current, scaled), stacks: Math.max(stacks, 1) };
  if (stacks <= 0) return { dps: scaled, stacks: 1 };
  if (stacks >= effects.poisonStackCap) return { dps: current, stacks };
  return { dps: current + scaled * effects.poisonStackFalloff, stacks: stacks + 1 };
}

export function researchTrapThroughput(effects, installed) {
  return Math.min(effects.dualTraps ? 2 : 1, Math.max(0, installed)) * effects.trapPowerMult;
}
