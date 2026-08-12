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
  // 精英身份由金色边框与解锁轮次表达，名字保持物种本名，避免列表里反复堆“精英”前缀。
  name: `${l.name.length > 3 ? l.name.slice(0, 2) : l.name}`,
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
  alchemist: { id: 'alchemist', name: '炼金术师', tex: 'hero-alchemist', hp: 61, atk: 11, def: 2, spd: 0.95, role: '毒袭', intel: '向全体守军投掷毒瓶，持续侵蚀生命。' },
  monk: { id: 'monk', name: '武僧', tex: 'hero-monk', hp: 91, atk: 14, def: 5, spd: 1.15, role: '援护', intel: '治疗最虚弱的同伴，并为自己凝聚护盾。' },
  lancer: { id: 'lancer', name: '枪骑兵', tex: 'hero-lancer', hp: 82, atk: 19, def: 5, spd: 0.92, role: '贯穿', intel: '长枪贯穿前后两名守军，并无视部分防御。' },
  warlock: { id: 'warlock', name: '咒术师', tex: 'hero-warlock', hp: 58, atk: 13, def: 2, spd: 0.82, role: '诅咒', intel: '以咒火灼烧全体守军，并延缓其技能。' },
  paladin: { id: 'paladin', name: '圣骑士', tex: 'hero-paladin', hp: 132, atk: 13, def: 11, spd: 0.75, role: '铁壁', intel: '为全队分摊30%伤害，前排最难啃的一块。' },
  berserker: { id: 'berserker', name: '狂战士', tex: 'hero-berserker', hp: 84, atk: 22, def: 2, spd: 1.15, role: '嗜血', intel: '血量越低攻击越高（最多+80%），但不吃治疗。' },
  ranger: { id: 'ranger', name: '游侠', tex: 'hero-ranger', hp: 72, atk: 16, def: 3, spd: 1.05, role: '猎手', intel: '专杀后排，并标记目标使其受伤+25%。' },
  bard: { id: 'bard', name: '吟游诗人', tex: 'hero-bard', hp: 66, atk: 9, def: 3, spd: 0.9, role: '增益', intel: '轮流为全队加攻速与净化中毒，不直接输出。' },
  captain: { id: 'captain', name: '勇者队长', tex: 'hero-captain', hp: 390, atk: 25, def: 8, spd: 1.0, role: '首领', intel: '三阶段：50%击碎陷阱，25%全队加速。' },
  inquisitor: { id: 'inquisitor', name: '审判官', tex: 'hero-inquisitor', hp: 268, atk: 21, def: 7, spd: 0.85, role: '首领', intel: '三阶段：50%全房沉默并净化，25%持续灼烧全体怪物。' },
  swordmaster: { id: 'swordmaster', name: '剑圣', tex: 'hero-swordmaster', hp: 246, atk: 30, def: 6, spd: 1.25, role: '首领', intel: '三阶段：50%起每次普攻追加一次斩击，25%必定破防。' },
};

                                                                 
export const AFFIXES                                                  = {
  haste: { name: '急行', desc: '压缩每个房间的作战时限。', values: ['15秒', '14秒', '13秒', '12秒'] },
  holywater: { name: '圣水', desc: '缩短勇者受到的中毒持续时间。', values: ['缩短20%', '缩短35%', '缩短50%', '缩短65%'] },
  shield: { name: '群体护盾', desc: '勇者进入地牢时获得生命上限比例的护盾。', values: ['12%', '18%', '25%', '33%'] },
  brave: { name: '悍勇', desc: '提高全体勇者的攻击力。', values: ['+8%', '+15%', '+24%', '+35%'] },
};

export const AFFIX_ROMAN = ['I', 'II', 'III', 'IV'];
export function raidAffixLevel(raid, id) {
  const explicit = Number(raid?.affixLevels?.[id]);
  if (Number.isFinite(explicit)) return Math.max(1, Math.min(4, Math.round(explicit)));
  const no = Math.max(1, Number(raid?.no) || 1);
  return no <= 10 ? 1 : no <= 14 ? 2 : no <= 17 ? 3 : 4;
}
export function raidAffixInfo(raid, id) {
  const def = AFFIXES[id], level = raidAffixLevel(raid, id);
  return def ? { id, ...def, level, roman: AFFIX_ROMAN[level - 1], value: def.values[level - 1] } : null;
}

                       
             
                
                                         
                     
                                         
  

const m = (cls        , lv        , n = 1) => Array.from({ length: n }, () => ({ cls, lv }));

export const RAIDS            = [
  { no: 1, title: '迷路的剑士', members: [...m('knight', 1)], affixes: [], reward: { bone: 45, mana: 8 } },
  { no: 2, title: '谨慎的斥候', members: [...m('knight', 1), ...m('archer', 1)], affixes: [], reward: { bone: 55, mana: 10 } },
  { no: 3, title: '临时救援队', members: [...m('knight', 1), ...m('cleric', 1), ...m('archer', 1)], affixes: [], reward: { bone: 65, mana: 12 } },
  { no: 4, title: '杂牌探险队', members: [...m('rogue', 1), ...m('knight', 1), ...m('alchemist', 1)], affixes: [], reward: { bone: 75, mana: 14 } },
  { no: 5, title: '初成编制', members: [...m('knight', 2, 2), ...m('archer', 2), ...m('cleric', 2)], affixes: [], reward: { bone: 90, mana: 16 } },
  { no: 6, title: '苦修先行', members: [...m('monk', 2), ...m('berserker', 2), ...m('cleric', 2), ...m('mage', 2)], affixes: [], reward: { bone: 105, mana: 18 } },
  { no: 7, title: '长枪猎队', members: [...m('lancer', 3), ...m('ranger', 3), ...m('rogue', 3), ...m('cleric', 3)], affixes: ['brave'], reward: { bone: 120, mana: 20 } },
  { no: 8, title: '圣殿铁壁', members: [...m('paladin', 4), ...m('knight', 4), ...m('cleric', 3), ...m('mage', 3)], affixes: ['shield'], reward: { bone: 140, mana: 24 } },
  { no: 9, title: '歌与咒火', members: [...m('bard', 4), ...m('berserker', 4), ...m('warlock', 5), ...m('lancer', 4)], affixes: ['haste'], reward: { bone: 160, mana: 28 } },
  { no: 10, title: '审判官', members: [...m('inquisitor', 5), ...m('paladin', 5), ...m('cleric', 5), ...m('mage', 5), ...m('rogue', 4)], affixes: ['holywater'], reward: { bone: 180, mana: 35 } },
  { no: 11, title: '剑圣试锋', members: [...m('swordmaster', 6), ...m('bard', 7), ...m('ranger', 7), ...m('paladin', 6), ...m('cleric', 6)], affixes: ['haste', 'brave'], reward: { bone: 160, mana: 45 } },
  { no: 12, title: '队长督战', members: [...m('captain', 8), ...m('paladin', 8), ...m('bard', 8), ...m('berserker', 8), ...m('ranger', 8)], affixes: ['shield'], reward: { bone: 170, mana: 55 } },
  { no: 13, title: '破城先锋', members: [...m('lancer', 9, 2), ...m('berserker', 9), ...m('ranger', 9), ...m('cleric', 9), ...m('rogue', 9)], affixes: ['brave'], reward: { bone: 180, mana: 65 } },
  { no: 14, title: '净化远征', members: [...m('paladin', 10, 2), ...m('inquisitor', 10), ...m('cleric', 10), ...m('mage', 10), ...m('monk', 10)], affixes: ['shield', 'holywater'], reward: { bone: 190, mana: 75 } },
  { no: 15, title: '双首战团', members: [...m('swordmaster', 11), ...m('captain', 11), ...m('bard', 11), ...m('warlock', 11), ...m('ranger', 11), ...m('cleric', 11)], affixes: ['haste', 'brave'], reward: { bone: 200, mana: 90 } },
  { no: 16, title: '王国讨伐军', members: [...m('captain', 12), ...m('paladin', 12, 2), ...m('lancer', 12), ...m('cleric', 12), ...m('mage', 12)], affixes: ['shield', 'brave'], reward: { bone: 210, mana: 105 } },
  { no: 17, title: '白银远征军', members: [...m('swordmaster', 13), ...m('monk', 13), ...m('paladin', 13), ...m('ranger', 13), ...m('bard', 13), ...m('warlock', 13), ...m('cleric', 13)], affixes: ['haste', 'holywater'], reward: { bone: 220, mana: 120 } },
  { no: 18, title: '圣堂联军', members: [...m('inquisitor', 14), ...m('captain', 14), ...m('paladin', 14), ...m('lancer', 14), ...m('mage', 14), ...m('ranger', 14), ...m('cleric', 14)], affixes: ['shield', 'brave', 'holywater'], reward: { bone: 235, mana: 140 } },
  { no: 19, title: '王冠近卫', members: [...m('swordmaster', 15), ...m('captain', 15), ...m('paladin', 15), ...m('berserker', 15), ...m('ranger', 15), ...m('bard', 15), ...m('warlock', 15), ...m('cleric', 15)], affixes: ['haste', 'shield', 'brave'], reward: { bone: 250, mana: 165 } },
  { no: 20, title: '黎明总攻', members: [...m('captain', 18), ...m('swordmaster', 17), ...m('inquisitor', 17), ...m('paladin', 16), ...m('cleric', 16), ...m('bard', 16), ...m('ranger', 16), ...m('warlock', 16)], affixes: ['haste', 'shield', 'brave', 'holywater'], reward: { bone: 280, mana: 200 } },
];

export const NORMAL_RAID_COUNT = RAIDS.length;

// 正式战役的战前章回。它们使用与秘闻相同的“叙述＋回应”结构，但只负责交代
// 王国为何一轮比一轮认真，不修改随机秘闻额度，也不向存档写入战斗数值。
export const RAID_BRIEFINGS = [
  { no: 1, title: '一名迷路者的重大贡献', speaker: '地下城门卫的便条', body: '王国剑士罗文追一只偷面包的山羊时，误把地牢入口当成了公共厕所。他点亮火把，看见骷髅、王座和一张写着“闲人免进”的牌子，于是决定履行骑士义务：先闯进去，再考虑识字。', reply: '让他成为第一份口碑。' },
  { no: 2, title: '失踪人口开始产生预算', speaker: '王国治安所通告', body: '罗文没有回去。治安所原本准备登记为“自愿离职”，但他的剑是公物。于是王国派出一名剑士和一名弓手寻找那把剑，顺便寻找罗文——如果携带方便的话。', reply: '剑可以留下，人也一样。' },
  { no: 3, title: '救援队需要被救援', speaker: '冒险者公会柜台', body: '第二支队伍也没回来。公会把事件从“迷路”升级为“稳定就业机会”，并附赠一名牧师。牧师负责救人，弓手负责指路，剑士负责证明前两项都不可靠。', reply: '给他们安排团体入住。' },
  { no: 4, title: '悬赏终于学会走路', speaker: '贴歪的悬赏令', body: '连续失踪让地牢有了第一笔悬赏。盗贼、炼金术士和临时剑士组成了队伍；他们互不信任，但一致相信奖金会在其他两人阵亡后自动变多。', reply: '纠正他们的收益预期。' },
  { no: 5, title: '王国发现统计数字会咬人', speaker: '内务厅第七码表格', body: '失踪人数终于超过表格预留的四行。官员无法再把人名写在页边，于是批准一支正式小队。王国第一次承认地下城存在，主要因为重新印表格比派兵更贵。', reply: '让他们申请第二张表。' },
  { no: 6, title: '教会承包了善后业务', speaker: '圣堂募捐箱背面', body: '教会宣布远征是“净化行动”，佣兵则称它为“按日结算”。修士、狂战士、牧师与法师同行，分别携带信仰、怒气、绷带和一份免责协议。', reply: '免责协议不免死。' },
  { no: 7, title: '长枪适合隔着同伴作战', speaker: '边防军调令', body: '王国决定采用先进战术：让长枪兵站得离怪物更远，让游侠站得离责任更远。队伍被告知这是一次侦察；他们看到随行牧师时，已经没人相信这句话。', reply: '让侦察报告由幸存者口述。' },
  { no: 8, title: '圣殿带来了更昂贵的遗体', speaker: '军需官的损耗预算', body: '圣骑士带着新盾牌抵达。军需官保证它们“足以抵御任何已知怪物”，并拒绝回答地下城里的怪物是否接受过登记。牧师已提前为盾牌而不是持盾者祝福。', reply: '检验一下保修条款。' },
  { no: 9, title: '战歌主要用于盖住惨叫', speaker: '吟游诗人的巡演海报', body: '吟游诗人把前几次惨败改编成英雄史诗，门票卖得很好。王国于是让他亲自来采风。同行者很高兴，因为只要他继续唱，谁也听不见队伍正在后悔。', reply: '给副歌加一点火。' },
  { no: 10, title: '审判官发现流程不够神圣', speaker: '异端审判庭公函', body: '审判庭裁定：失败不是因为敌人太强，而是前线祷告格式不规范。审判官带来圣水、印章和三十七页正确格式。地下城被列为异端，理由是从未按时缴纳宗教税。', reply: '请他现场补办手续。' },
  { no: 11, title: '剑圣拒绝承认门会反击', speaker: '武术协会荣誉榜', body: '剑圣看完战报，只说了一句“他们不会用剑”。协会立刻把这句话印成教材并收取学费。现在他亲自前来证明：只要挥得足够快，陷阱、毒和会复活的尸体都属于剑术问题。', reply: '让墙壁旁听大师课。' },
  { no: 12, title: '队长开始给失败排班', speaker: '远征军晨会纪要', body: '勇者队长接管行动，首先取消了“各自发挥”，然后新增早会、晚会与阵亡复盘。士兵的士气显著提升，因为他们终于发现死亡可以免去晚会。', reply: '给他们安排永久散会。' },
  { no: 13, title: '破城锤没有阅读房产证', speaker: '皇家工程团验收单', body: '王国把地下城正式定义为“违章建筑”，这样攻打它就不必宣战。长枪与狂战士护送工程团前来拆迁；工程团唯一的测量结果是：门很硬，里面的业主更硬。', reply: '拒绝强制拆迁。' },
  { no: 14, title: '净化服务按面积收费', speaker: '圣堂项目报价书', body: '两名圣骑士带队执行全域净化。报价按地牢层数计算，所以教会坚称这里至少有十二层。财务人员已经在地图上补画了六层，信仰因此增长了一倍。', reply: '按真实面积埋葬。' },
  { no: 15, title: '两个队长等于三套命令', speaker: '联合战团指挥频道', body: '剑圣与勇者队长共同指挥。一个要求冲锋，一个要求保持队形，吟游诗人把两道命令押成了韵。队伍最终决定边保持队形边冲锋，成功同时违抗了所有人。', reply: '奖励他们统一的结局。' },
  { no: 16, title: '王国终于承认这是战争', speaker: '国王的战争演说草稿', body: '第十六次远征前，国王宣布国家进入战争状态。书记官提醒他战争其实已经持续很久，国王便把此前十五次统一归档为“收费勘探”。讨伐军领到了真盔甲，也领到了补发的恐惧。', reply: '欢迎正式客户。' },
  { no: 17, title: '白银可以买到更亮的失败', speaker: '白银远征军军旗题词', body: '贵族们组建白银远征军，每一套盔甲都能照见持有者的遗容。士兵被承诺胜利后封爵；阵亡后也会获得称号，只是刻在尺寸更小的石头上。', reply: '替石匠提前量尺寸。' },
  { no: 18, title: '圣堂联军携带统一口径', speaker: '联军新闻稿', body: '圣堂、王军和审判庭终于联合。他们尚未统一指挥、补给或地图，但已统一新闻口径：本次行动不可能失败。随军记者因此只带了胜利稿，背面恰好可以写遗书。', reply: '给记者提供现场素材。' },
  { no: 19, title: '王冠近卫保护的是王冠', speaker: '王室保险契约', body: '国王派出近卫，却本人留在城里。保险公司解释，王冠属于国家重要资产，戴王冠的人属于可替换配件。近卫们听完十分振奋，因为他们甚至不属于配件清单。', reply: '把清单退回并附上实物。' },
  { no: 20, title: '黎明总攻与黄昏预算', speaker: '王国最后动员令', body: '所有活着的名将、所有没报废的圣水，以及所有还愿意赊账的牧师都被送到地牢门口。王国称它为“黎明总攻”，因为如果拖到黄昏，军费就要再算一天。门外号角响起，财政大臣比任何人都希望今天结束。', reply: '那就替他们结束今天。' },
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
  ...MONSTERS.filter((m) => !m.id.startsWith('elite-')).flatMap((m) => [
    `part-native-${m.id}-core`, `part-native-${m.id}-head`,
    `part-native-${m.id}-arm`, `part-native-${m.id}-legs`,
  ]),
  'hero-knight', 'hero-archer', 'hero-cleric', 'hero-mage', 'hero-rogue', 'hero-captain',
  'hero-paladin', 'hero-berserker', 'hero-ranger', 'hero-bard', 'hero-inquisitor', 'hero-swordmaster',
  'hero-alchemist', 'hero-monk', 'hero-lancer', 'hero-warlock',
  'tile-wall', 'tile-floor', 'prop-barrel', 'prop-bones', 'prop-shelf',
  'trap-spike', 'trap-slime', 'trap-rune', 'trap-blade', 'trap-net', 'trap-mirror',
  'prop-forge', 'prop-mirror', 'prop-mire',
  'facility-bone-yard', 'facility-mana-well', 'facility-training', 'facility-vault',
  'facility-healing', 'facility-workshop', 'facility-hatchery',
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
