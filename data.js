// 调色板与全部数据表。颜色一律取自 ART_DIRECTION.md 的 Palette。
export const C = {
  bg: 0x171425,
  ink: 0x241c33,
  wall: 0x343047,
  floor: 0x3e3752,
  wallLit: 0x555064,
  stoneLit: 0x7a7490,
  bone: 0xe7d7a1,
  white: 0xf4f0e4,
  gold: 0xe6b84a,
  goldDark: 0xb07a22,
  red: 0xd95763,
  redDark: 0x8a2b3a,
  green: 0x77b255,
  greenDark: 0x3e7a34,
  purple: 0x9b5de5,
  purpleDark: 0x5b3a9b,
  steel: 0x6c81c7,
  blue: 0x3b5dc9,
  skin: 0xe0a878,
  leather: 0x8a5b34,
}         ;

export const hex = (n        ) => '#' + n.toString(16).padStart(6, '0');

export const VIEW_W = 480;
export const VIEW_H = 270;

                      
                                                                       
                                                          
                                                         
                 
                                                              
                          
                                          
                    
                                                         
                                             
                 
                                                                
                                     
                 
                 
                                                                                   
                                             
                 
                                                                    
                                              
               
                                                                                 
                                                
                                        
                                         
                                               
                  
                    
                      
                   
                       
                        
                                          
                                     
                                   
                                                     
                                 
                                        
                       
                                        
                                              
                                          
                                           
                                           
                                               
                                                        
                                           
                                        
  

// 统领光环：只有传奇怪物有，作用于同房的普通兵种
                                                                   
                                         
                                
export const AURAS                                                                = {
  atk: { name: '骸骨号令', desc: '同房兵种攻击 +25%', short: '兵攻+25%' },
  guard: { name: '万臂庇护', desc: '同房兵种受到伤害 -20%', short: '兵减伤20%' },
  haste: { name: '心灵共鸣', desc: '同房兵种攻速 +20%', short: '兵攻速+20%' },
  undying: { name: '亡者不休', desc: '同房兵种首次被击倒时以30%生命复活', short: '兵复活一次' },
  gaze: { name: '凝视压制', desc: '本房勇者技能冷却慢25%', short: '勇者技能-25%' },
  tithe: { name: '瘟疫什一', desc: '本房勇者持续中毒，且受治疗-35%', short: '勇者中毒/治疗-35%' },
  forge: { name: '熔炉共鸣', desc: '同房兵种普攻附带点燃，自身反弹20%伤害', short: '兵点燃+反伤' },
  brood: { name: '子嗣潮涌', desc: '同房兵种生命+18%、每秒回血3', short: '兵生命+18%/回血' },
};

                           
             
               
              
               
             
              
              
                                
                
                    
                  
                                
               
              
                                          
                
                                            
                                          
                                            
                                                                    
                                                                          
  

export const MONSTERS                = [
  {
    id: 'slime', name: '史莱姆', tex: 'mon-slime', cost: 30,
    hp: 108, atk: 17, def: 3, spd: 0.7,
    skill: '黏附', skillDesc: '命中时使目标攻速降低20%，持续4秒',
    passive: '弹性体：受到的重击伤害-25%',
    row: 'front', desc: '高生命的肉盾，专职拖时间。',
    eff: { skill: 'slow', skillName: '黏附', passive: 'tough' },
  },
  {
    id: 'goblin', name: '哥布林', tex: 'mon-goblin', cost: 35,
    hp: 61, atk: 31, def: 2, spd: 1.5,
    skill: '连刺', skillDesc: '每6秒对当前目标连续两次快速攻击',
    passive: '嗜血：击倒敌人后攻速+30%',
    row: 'front', desc: '脆但快，负责补刀。',
    eff: { skill: 'multi', skillName: '连刺', passive: 'bloodlust' },
  },
  {
    id: 'archer', name: '骷髅弓手', tex: 'mon-archer', cost: 45,
    hp: 54, atk: 36, def: 1, spd: 1.0,
    skill: '穿刺箭', skillDesc: '每7秒射击最后排勇者，无视一半防御',
    passive: '不朽骨：首次被击倒时以20%生命复活一次',
    row: 'back', desc: '越过前排打后排治疗与法师。',
    eff: { skill: 'pierce', skillName: '穿刺箭', passive: 'revive' },
  },
  {
    id: 'bat', name: '蝙蝠', tex: 'mon-bat', cost: 40,
    hp: 47, atk: 22, def: 0, spd: 1.8,
    skill: '扰袭', skillDesc: '优先攻击后排；每5秒使目标技能冷却延后2秒',
    passive: '疾影：25%概率完全闪避一次攻击',
    row: 'back', desc: '骚扰型，专治慢速施法者。',
    eff: { skill: 'harass', skillName: '扰袭', passive: 'evade' },
  },
  {
    id: 'shaman', name: '蘑菇巫医', tex: 'mon-shaman', cost: 55,
    hp: 68, atk: 14, def: 2, spd: 0.9,
    skill: '毒雾/回春', skillDesc: '每5秒交替：给全体勇者上中毒，或治疗生命最低的同伴',
    passive: '孢子：中毒伤害+30%',
    row: 'back', desc: '持续伤害与续航核心。',
    eff: { skill: 'alt', skillName: '毒雾/回春', passive: 'spore' },
  },
  {
    id: 'ogre', name: '食人魔', tex: 'mon-ogre', cost: 70,
    hp: 153, atk: 50, def: 5, spd: 0.5,
    skill: '横扫', skillDesc: '每8秒对全体勇者造成重击伤害',
    passive: '巨力：重击附带1秒眩晕',
    row: 'front', desc: '慢速范围重击，克多人小队。',
    eff: { skill: 'aoe', skillName: '横扫', passive: 'brute' },
  },
  // ---- 传奇统领：贵、占一个统领席，靠光环带兵 ----
  {
    id: 'bonedragon', name: '骨龙', tex: 'mon-bonedragon', cost: 205,
    hp: 210, atk: 40, def: 6, spd: 0.6,
    skill: '骨焰吐息', skillDesc: '每9秒对全体勇者造成重击并点燃6秒',
    passive: '巨力：重击附带1秒眩晕',
    row: 'any', desc: '统领：以号令拉高全房兵种的攻击。',
    eff: { skill: 'breath', skillName: '骨焰吐息', passive: 'brute' },
    legend: true, aura: 'atk', legendMin: 1,
  },
  {
    id: 'hundredarm', name: '百臂巨人', tex: 'mon-hundredarm', cost: 200,
    hp: 260, atk: 28, def: 9, spd: 0.55,
    skill: '万手连击', skillDesc: '每8秒随机连打4次勇者',
    passive: '弹性体：受到的重击伤害-25%',
    row: 'any', desc: '统领：用无数手臂替同房兵种挡下伤害。',
    eff: { skill: 'flurry', skillName: '万手连击', passive: 'tough' },
    legend: true, aura: 'guard', legendMin: 2,
  },
  {
    id: 'lich', name: '巫妖', tex: 'mon-lich', cost: 185,
    hp: 150, atk: 24, def: 4, spd: 0.85,
    skill: '死灵之握', skillDesc: '每7秒抽取全体勇者生命，并治疗同房兵种',
    passive: '不朽骨：首次被击倒时以20%生命复活一次',
    row: 'any', desc: '统领：让倒下的兵种再站起来一次。',
    eff: { skill: 'necro', skillName: '死灵之握', passive: 'revive' },
    legend: true, aura: 'undying', legendMin: 1,
  },
  {
    id: 'beholder', name: '眼魔', tex: 'mon-beholder', cost: 190,
    hp: 140, atk: 22, def: 3, spd: 0.9,
    skill: '石化凝视', skillDesc: '每6秒眩晕一名勇者2秒并造成伤害',
    passive: '晶化：受到的伤害固定减免',
    row: 'any', desc: '统领：凝视拖慢闯入者的技能节奏。',
    eff: { skill: 'petrify', skillName: '石化凝视', passive: 'crystal' },
    legend: true, aura: 'gaze', legendMin: 3,
  },
  {
    id: 'mindflayer', name: '灵吸怪', tex: 'mon-mindflayer', cost: 195,
    hp: 145, atk: 20, def: 3, spd: 0.95,
    skill: '心灵支配', skillDesc: '每8秒支配一名勇者4秒，使其攻击自己的队友',
    passive: '疾影：25%概率完全闪避一次攻击',
    row: 'any', desc: '统领：把勇者的刀调转过来对着他们自己。',
    eff: { skill: 'charm', skillName: '心灵支配', passive: 'evade' },
    legend: true, aura: 'haste', legendMin: 4,
  },
  // 第18轮新增三名统领：光环走"资源压制/持续伤害/群体续航"，与前五名不重叠。
  // 数值仍按"靠光环带兵"的低攻区间定（英雄侧另有 CHAMP_BASE 名号加成补个体强度）。
  {
    id: 'plaguelord', name: '疫主', tex: 'mon-plaguelord', cost: 200,
    hp: 175, atk: 26, def: 5, spd: 0.7,
    skill: '丧钟敕令', skillDesc: '每7秒对全体勇者造成伤害，并把他们身上的中毒层数翻倍',
    passive: '疫源：本房勇者身上的中毒每秒+2点',
    row: 'any', desc: '统领：钟声一响，闯入者的伤口就不再愈合。',
    eff: { skill: 'decree', skillName: '丧钟敕令', passive: 'plagueCore', onHit: 'tithe' },
    legend: true, aura: 'tithe', legendMin: 5,
  },
  {
    id: 'magmagolem', name: '熔岩巨像', tex: 'mon-magmagolem', cost: 215,
    hp: 245, atk: 34, def: 10, spd: 0.5,
    skill: '熔喷', skillDesc: '每9秒喷发岩浆：全体勇者受重击并被点燃8秒（圣水无效）',
    passive: '熔壳：受到近战攻击时反弹20%伤害并点燃对手',
    row: 'front', desc: '统领：站在门口就是一座会还手的炉子。',
    eff: { skill: 'eruption', skillName: '熔喷', passive: 'coreMagma', thorns: 0.2, onHit: 'scorch' },
    legend: true, aura: 'forge', legendMin: 6,
  },
  {
    id: 'broodqueen', name: '孵母', tex: 'mon-broodqueen', cost: 205,
    hp: 190, atk: 24, def: 6, spd: 0.8,
    skill: '织巢', skillDesc: '每8秒结网：全体勇者攻速-30%（5秒），并治疗本房怪物',
    passive: '孵育：每秒回复5点生命；被击倒时拉起一名同房怪物',
    row: 'any', desc: '统领：她不亲自动手，她让房间自己长出守卫。',
    eff: { skill: 'broodcall', skillName: '织巢', passive: 'coreBrood', hpRegen: 5, reviveAlly: true, onHit: 'ensnare' },
    legend: true, aura: 'brood', legendMin: 7,
  },
];

export const LEGENDS = MONSTERS.filter((m) => m.legend);

// 精英怪物：和英雄同族，但是"无名个体" —— 买来当兵种用，没有光环、进不了统领席。
// 数值介于普通兵种与英雄之间，代价是很贵，而且占普通兵位。
const ELITE_MIN                         = { lich: 2, bonedragon: 3, hundredarm: 4, beholder: 5, mindflayer: 6, plaguelord: 7, magmagolem: 8, broodqueen: 9 };
export const ELITES                = LEGENDS.map((l) => ({
  ...l,
  id: `elite-${l.id}`,
  name: `精英${l.name.length > 3 ? l.name.slice(0, 2) : l.name}`,
  cost: Math.round(l.cost * 0.72),
  hp: Math.round(l.hp * 0.92),
  // 统领的攻击数值本来是"靠光环带兵"的低值；精英没有光环，必须自己打得动，
  // 否则花两倍骨币换来的是更弱的兵。攻击拉到普通兵上限之上、攻速略提。
  atk: Math.round(l.atk * 1.5),
  def: l.def,
  spd: +(l.spd * 1.15).toFixed(2),
  legend: false,
  aura: undefined,
  legendMin: undefined,
  eliteMin: ELITE_MIN[l.id] ?? 2,
  row: 'any',
  desc: `精英个体：${l.skill}的威力尚在，但没有统领的号令。`,
}));
MONSTERS.push(...ELITES);
export const isEliteKind = (id        ) => id.startsWith('elite-');
export const isLegendKind = (id        ) => !!kindById(id)?.legend;

// 拼接体在运行时注册进来（game.ts 读存档后调用），battle.ts 只面对这张表查种类。
const REG                              = {};
for (const m of MONSTERS) REG[m.id] = m;

export function registerKinds(list               ) {
  for (const k of list) REG[k.id] = k;
}
export function unregisterKind(id        ) {
  if (!MONSTERS.some((m) => m.id === id)) delete REG[id];
}
export function kindById(id        )                          {
  return REG[id];
}
export const isCustomKind = (id        ) => id.startsWith('cst');

export const LEVEL_MULT = [1, 1.18, 1.38, 1.6, 1.85];
export const UPGRADE_COST = [40, 70, 110, 170];
export const XP_PER_LEVEL = [30, 70, 130, 220];

                         
             
               
              
             
              
              
              
               
                
  

export const HERO_CLASSES                            = {
  knight: { id: 'knight', name: '剑士', tex: 'hero-knight', hp: 105, atk: 15, def: 6, spd: 0.9, role: '前排', intel: '承伤主力，优先攻击前排怪物。' },
  archer: { id: 'archer', name: '弓手', tex: 'hero-archer', hp: 63, atk: 18, def: 2, spd: 1.1, role: '后排', intel: '越过前排直击后排怪物。' },
  cleric: { id: 'cleric', name: '牧师', tex: 'hero-cleric', hp: 69, atk: 8, def: 3, spd: 0.8, role: '治疗', intel: '每5秒治疗生命最低的队友。' },
  mage: { id: 'mage', name: '法师', tex: 'hero-mage', hp: 57, atk: 12, def: 1, spd: 0.8, role: '范围', intel: '每6秒对全体怪物造成火球伤害。' },
  rogue: { id: 'rogue', name: '盗贼', tex: 'hero-rogue', hp: 66, atk: 14, def: 3, spd: 1.3, role: '拆陷阱', intel: '入场先花2秒拆除本房陷阱。' },
  paladin: { id: 'paladin', name: '圣骑士', tex: 'hero-paladin', hp: 132, atk: 13, def: 11, spd: 0.75, role: '铁壁', intel: '为全队分摊30%伤害，前排最难啃的一块。' },
  berserker: { id: 'berserker', name: '狂战士', tex: 'hero-berserker', hp: 84, atk: 22, def: 2, spd: 1.15, role: '嗜血', intel: '血量越低攻击越高（最多+80%），但不吃治疗。' },
  ranger: { id: 'ranger', name: '游侠', tex: 'hero-ranger', hp: 72, atk: 16, def: 3, spd: 1.05, role: '猎手', intel: '专杀后排，并标记目标使其受伤+25%。' },
  bard: { id: 'bard', name: '吟游诗人', tex: 'hero-bard', hp: 66, atk: 9, def: 3, spd: 0.9, role: '增益', intel: '轮流为全队加攻速与净化中毒，不直接输出。' },
  captain: { id: 'captain', name: '勇者队长', tex: 'hero-captain', hp: 390, atk: 25, def: 8, spd: 1.0, role: '首领', intel: '三阶段：50%击碎陷阱，25%全队加速。' },
  inquisitor: { id: 'inquisitor', name: '审判官', tex: 'hero-inquisitor', hp: 268, atk: 21, def: 7, spd: 0.85, role: '首领', intel: '三阶段：50%全房沉默并净化，25%持续灼烧全体怪物。' },
  swordmaster: { id: 'swordmaster', name: '剑圣', tex: 'hero-swordmaster', hp: 246, atk: 30, def: 6, spd: 1.25, role: '首领', intel: '三阶段：50%起每次普攻追加一次斩击，25%必定破防。' },
};

                                                                 
export const AFFIXES                                                  = {
  haste: { name: '急行', desc: '每房战斗时限缩短至12秒' },
  holywater: { name: '圣水', desc: '中毒持续时间减半' },
  shield: { name: '群体护盾', desc: '入场时全队获得一次护盾' },
  brave: { name: '悍勇', desc: '全队攻击+15%' },
};

                       
             
                
                                         
                     
                                         
  

const m = (cls        , lv        , n = 1) => Array.from({ length: n }, () => ({ cls, lv }));

export const RAIDS            = [
  { no: 1, title: '新手冒险队', members: [...m('knight', 1, 2), ...m('cleric', 1)], affixes: [], reward: { bone: 45, mana: 8 } },
  { no: 2, title: '弓箭小队', members: [...m('knight', 1), ...m('archer', 1, 2)], affixes: [], reward: { bone: 55, mana: 10 } },
  { no: 3, title: '神殿巡礼', members: [...m('knight', 2), ...m('cleric', 1), ...m('archer', 1, 2)], affixes: [], reward: { bone: 65, mana: 12 } },
  { no: 4, title: '盗贼小队长', members: [...m('rogue', 2), ...m('knight', 2), ...m('archer', 2)], affixes: [], reward: { bone: 75, mana: 16 } },
  { no: 5, title: '四职混编', members: [...m('knight', 3), ...m('archer', 3), ...m('cleric', 3), ...m('mage', 2)], affixes: [], reward: { bone: 85, mana: 18 } },
  { no: 6, title: '狂战先行', members: [...m('knight', 4), ...m('berserker', 3), ...m('cleric', 3), ...m('mage', 3)], affixes: [], reward: { bone: 95, mana: 20 } },
  { no: 7, title: '游侠猎队', members: [...m('knight', 4), ...m('ranger', 4), ...m('rogue', 4), ...m('cleric', 4)], affixes: ['brave'], reward: { bone: 105, mana: 22 } },
  { no: 8, title: '圣殿铁壁', members: [...m('paladin', 5), ...m('knight', 5), ...m('cleric', 5), ...m('mage', 4)], affixes: ['shield'], reward: { bone: 120, mana: 26 } },
  { no: 9, title: '歌与刃', members: [...m('bard', 5), ...m('berserker', 5), ...m('knight', 6), ...m('ranger', 5)], affixes: ['haste'], reward: { bone: 135, mana: 28 } },
  { no: 10, title: '审判官', members: [...m('inquisitor', 6), ...m('paladin', 6), ...m('cleric', 6), ...m('mage', 6), ...m('rogue', 5)], affixes: ['holywater'], reward: { bone: 155, mana: 32 } },
  { no: 11, title: '剑圣', members: [...m('swordmaster', 6), ...m('bard', 7), ...m('ranger', 7), ...m('paladin', 6), ...m('cleric', 6)], affixes: ['haste', 'brave'], reward: { bone: 180, mana: 36 } },
  { no: 12, title: '勇者队长', members: [...m('captain', 8), ...m('paladin', 8), ...m('bard', 8), ...m('berserker', 8), ...m('ranger', 8)], affixes: ['shield'], reward: { bone: 220, mana: 50 } },
];

export const HERO_LV_MULT = (lv        ) => 1 + (lv - 1) * 0.2;

                                                                                             
export const THEMES                                                                                     = {
  stone: { name: '石牢', desc: '无修正', cost: 0, prop: null },
  poison: { name: '毒窖', desc: '房内中毒伤害+25%', cost: 25, prop: 'prop-barrel' },
  bonepit: { name: '骨坑', desc: '勇者入场减速3秒', cost: 30, prop: 'prop-bones' },
  curse: { name: '咒库', desc: '后排怪物技能冷却-15%', cost: 35, prop: 'prop-shelf' },
  forge: { name: '熔炉', desc: '前排怪物攻击+12%，自身每秒受1点炙烤', cost: 45, prop: 'prop-forge' },
  mirror: { name: '镜厅', desc: '勇者法术与治疗效果-20%', cost: 55, prop: 'prop-mirror' },
  mire: { name: '沼室', desc: '陷阱效果+30%，勇者攻速-8%', cost: 60, prop: 'prop-mire' },
};

                                                                                      
export const TRAPS                                                                                   = {
  none: { name: '空', desc: '未安装陷阱', cost: 0, tex: null },
  spike: { name: '尖刺', desc: '对首名勇者造成28点爆发伤害', cost: 20, tex: 'trap-spike' },
  slime: { name: '黏液', desc: '全队攻速-30%，持续6秒', cost: 24, tex: 'trap-slime' },
  rune: { name: '沉默符', desc: '使勇者首次治疗或法术失效', cost: 30, tex: 'trap-rune' },
  blade: { name: '摆刃', desc: '对全体勇者造成14点伤害，血量最低者受双倍', cost: 45, tex: 'trap-blade' },
  net: { name: '绳网', desc: '缚住后两名勇者6秒（无法行动）', cost: 50, tex: 'trap-net' },
  mirror: { name: '映照阵', desc: '勇者本房前3次伤害有40%被反射回自身', cost: 65, tex: 'trap-mirror' },
};

// 主题×陷阱共鸣：同源搭配额外生效一层，是"布阵"这件事的第二层深度。
// 只在两者同时装上才触发；文案在地牢页与战报里都会摊开给玩家看。
export const SYNERGY                                                                 = [
  { theme: 'poison', trap: 'slime', name: '毒沼共鸣', desc: '黏液附带中毒，减速时长翻倍' },
  { theme: 'bonepit', trap: 'spike', name: '骨刺共鸣', desc: '尖刺伤害 +60%' },
  { theme: 'curse', trap: 'rune', name: '禁咒共鸣', desc: '沉默改为封禁全队法术 8 秒' },
  { theme: 'forge', trap: 'blade', name: '赤刃共鸣', desc: '摆刃附带灼烧，伤害 +40%' },
  { theme: 'mire', trap: 'net', name: '陷淖共鸣', desc: '绳网改为缚住全部勇者' },
  { theme: 'mirror', trap: 'mirror', name: '重影共鸣', desc: '反射次数 3→6 次，反射比例 +20%' },
];
export const synergyOf = (theme         , trap        ) =>
  SYNERGY.find((s) => s.theme === theme && s.trap === trap) ?? null;

export const TEXTURES = [
  'mon-slime', 'mon-goblin', 'mon-archer', 'mon-bat', 'mon-shaman', 'mon-ogre',
  'mon-lich', 'mon-bonedragon', 'mon-hundredarm', 'mon-beholder', 'mon-mindflayer',
  'mon-plaguelord', 'mon-magmagolem', 'mon-broodqueen',
  'hero-knight', 'hero-archer', 'hero-cleric', 'hero-mage', 'hero-rogue', 'hero-captain',
  'hero-paladin', 'hero-berserker', 'hero-ranger', 'hero-bard', 'hero-inquisitor', 'hero-swordmaster',
  'tile-wall', 'tile-floor', 'prop-barrel', 'prop-bones', 'prop-shelf',
  'trap-spike', 'trap-slime', 'trap-rune', 'trap-blade', 'trap-net', 'trap-mirror',
  'prop-forge', 'prop-mirror', 'prop-mire',
  'gear-crown', 'gear-fang', 'gear-plate', 'gear-banner', 'gear-orb', 'gear-boots',
  'gear-helm', 'gear-shield', 'gear-ring', 'gear-tome', 'gear-mask', 'gear-axe', 'gear-lantern', 'gear-robe',
  'icon-bone', 'icon-mana', 'icon-skull', 'icon-throne',
  'part-core-jelly', 'part-core-bone', 'part-core-rock', 'part-core-fungus',
  'part-head-skull', 'part-head-eye', 'part-head-maw', 'part-head-horn',
  'part-arm-claw', 'part-arm-club', 'part-arm-bow', 'part-arm-staff',
  'part-legs-stump', 'part-legs-hoof', 'part-legs-wing', 'part-legs-tentacle',
  'part-core-slag', 'part-core-moss', 'part-core-crystal', 'part-core-wrath',
  'part-head-mask', 'part-head-lantern', 'part-head-tongue', 'part-head-mirror',
  'part-arm-chain', 'part-arm-shield', 'part-arm-censer', 'part-arm-drill',
  'part-legs-wheel', 'part-legs-root', 'part-legs-spider', 'part-legs-cloud',
  'part-core-plague', 'part-core-cage', 'part-core-void', 'part-core-hive', 'part-core-clock', 'part-core-tomb',
  'part-head-beak', 'part-head-crown', 'part-head-swarm', 'part-head-thorn', 'part-head-choir', 'part-head-frost',
  'part-arm-scythe', 'part-arm-cannon', 'part-arm-whip', 'part-arm-grail', 'part-arm-banner', 'part-arm-syringe',
  'part-legs-coil', 'part-legs-tread', 'part-legs-stilt', 'part-legs-swarmlet', 'part-legs-anchor', 'part-legs-flame',
  'part-core-throne', 'part-core-magma', 'part-core-brood',
  'part-head-diadem', 'part-head-bell', 'part-head-eightfold',
  'part-arm-sceptre', 'part-arm-magmafist', 'part-arm-reaper',
  'part-legs-palanquin', 'part-legs-molten', 'part-legs-broodleg',
  'ui-frame-stone', 'ui-frame-inset', 'ui-frame-gold', 'ui-frame-arcane', 'ui-frame-scroll',
  'ui-btn', 'ui-btn-fill', 'ui-tab', 'ui-tab-fill',
];
