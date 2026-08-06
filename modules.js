// 怪物部件表与拼接派生。纯数据 + 纯函数，无 pixi 依赖（可用 node 直接跑平衡校验）。
                                                     

                                                       

                    
             
               
               
              
               
             
              
              
              
                     
               
                         
                                                  
                                                        
                                         
                                                    
                                        
  

// 部件数值按已调平的怪物数值区间给（史莱姆 108/17/3、食人魔 153/50/5）：
// 拼接体比同价位固定怪物更贵，换来自由组合的技能/被动搭配。
export const PARTS         = [
  // 核心：血量与被动来源
  { id: 'jelly', cat: 'core', name: '黏胶核', tex: 'part-core-jelly', bone: 26, hp: 100, atk: 5, def: 3, spd: -0.1, unlockRaid: 1, word: '黏', desc: '满级被动·弹性体：受到的重击伤害-25%' },
  { id: 'bone', cat: 'core', name: '骸骨架', tex: 'part-core-bone', bone: 30, hp: 62, atk: 12, def: 1, spd: 0.1, unlockRaid: 1, word: '骨', desc: '满级被动·不朽骨：首次被击倒时以20%生命复活' },
  { id: 'rock', cat: 'core', name: '岩石胎', tex: 'part-core-rock', bone: 36, hp: 92, atk: 8, def: 6, spd: -0.25, unlockRaid: 4, word: '岩', desc: '满级被动·硬壳：每次受到的伤害额外-4' },
  { id: 'fungus', cat: 'core', name: '菌伞体', tex: 'part-core-fungus', bone: 32, hp: 70, atk: 8, def: 2, spd: 0, unlockRaid: 8, word: '菌', desc: '满级被动·孢子：自身造成的中毒伤害+30%' },
  { id: 'slag', cat: 'core', name: '熔渣胎', tex: 'part-core-slag', bone: 34, hp: 78, atk: 14, def: 2, spd: -0.05, unlockRaid: 3, word: '渣', desc: '满级被动·余烬：被近战攻击时点燃对手（5点/秒，3秒）' },
  { id: 'moss', cat: 'core', name: '苔藓胎', tex: 'part-core-moss', bone: 32, hp: 96, atk: 8, def: 3, spd: -0.05, unlockRaid: 5, word: '苔', desc: '满级被动·生息：每秒回复4点生命' },
  { id: 'crystal', cat: 'core', name: '晶簇胎', tex: 'part-core-crystal', bone: 38, hp: 74, atk: 9, def: 4, spd: -0.1, unlockRaid: 6, word: '晶', desc: '满级被动·余晶：战后若存活额外产出5魔质' },
  { id: 'wrath', cat: 'core', name: '暴怒胎', tex: 'part-core-wrath', bone: 36, hp: 88, atk: 13, def: 1, spd: 0.05, unlockRaid: 7, word: '怒', desc: '满级被动·暴怒：生命低于一半时攻击+35%' },
  { id: 'plague', cat: 'core', name: '疫囊体', tex: 'part-core-plague', bone: 34, hp: 84, atk: 10, def: 2, spd: 0, unlockRaid: 2, word: '疫', desc: '满级被动·疫源：本房勇者身上的中毒每秒+2点' },
  { id: 'cage', cat: 'core', name: '囚笼胎', tex: 'part-core-cage', bone: 38, hp: 104, atk: 7, def: 5, spd: -0.2, unlockRaid: 5, word: '囚', desc: '满级被动·囚牢：被击倒时拉起一名已倒下的同房怪物（20%生命）' },
  { id: 'void', cat: 'core', name: '虚空胎', tex: 'part-core-void', bone: 40, hp: 72, atk: 12, def: 2, spd: 0.1, unlockRaid: 6, word: '虚', desc: '满级被动·虚蚀：普攻使目标易伤+8%（本房累积）' },
  { id: 'hive', cat: 'core', name: '蜂巢体', tex: 'part-core-hive', bone: 36, hp: 80, atk: 9, def: 3, spd: 0, unlockRaid: 4, word: '巢', desc: '满级被动·分蜂：普攻溅射30%伤害到另一名勇者' },
  { id: 'clock', cat: 'core', name: '钟表胎', tex: 'part-core-clock', bone: 42, hp: 76, atk: 11, def: 3, spd: 0.05, unlockRaid: 7, word: '钟', desc: '满级被动·上弦：技能冷却-20%，战后若存活多得8骨币' },
  { id: 'tomb', cat: 'core', name: '石棺胎', tex: 'part-core-tomb', bone: 40, hp: 112, atk: 6, def: 6, spd: -0.25, unlockRaid: 8, word: '棺', desc: '满级被动·镇棺：站场时同房怪物受到伤害-12%' },
  // 头：普攻附带效果
  { id: 'skull', cat: 'head', name: '骷髅头', tex: 'part-head-skull', bone: 12, hp: 6, atk: 7, def: 1, spd: 0, unlockRaid: 1, word: '髅', desc: '普攻使目标攻速-12%，持续3秒' },
  { id: 'eye', cat: 'head', name: '独眼', tex: 'part-head-eye', bone: 16, hp: 4, atk: 11, def: 0, spd: 0, unlockRaid: 1, word: '瞳', desc: '普攻无视目标25%防御' },
  { id: 'maw', cat: 'head', name: '巨口', tex: 'part-head-maw', bone: 20, hp: 10, atk: 14, def: 0, spd: -0.05, unlockRaid: 4, word: '噬', desc: '普攻回复所造成伤害的25%生命' },
  { id: 'horn', cat: 'head', name: '魔角', tex: 'part-head-horn', bone: 22, hp: 8, atk: 10, def: 2, spd: 0, unlockRaid: 8, word: '角', desc: '每房首次普攻造成1.6倍伤害并眩晕0.6秒' },
  { id: 'mask', cat: 'head', name: '铁面', tex: 'part-head-mask', bone: 16, hp: 12, atk: 8, def: 3, spd: -0.05, unlockRaid: 3, word: '面', desc: '普攻使目标防御-3（本房内累积）' },
  { id: 'lantern', cat: 'head', name: '提灯首', tex: 'part-head-lantern', bone: 18, hp: 6, atk: 9, def: 0, spd: 0, unlockRaid: 5, word: '灯', desc: '普攻使目标技能冷却延后1.5秒' },
  { id: 'tongue', cat: 'head', name: '蛙舌首', tex: 'part-head-tongue', bone: 22, hp: 8, atk: 10, def: 0, spd: 0.05, unlockRaid: 6, word: '舌', desc: '普攻30%概率把一名后排勇者拽到前排' },
  { id: 'mirror', cat: 'head', name: '镜面首', tex: 'part-head-mirror', bone: 20, hp: 10, atk: 8, def: 2, spd: 0, unlockRaid: 7, word: '镜', desc: '普攻击碎目标护盾，并把护盾值转为伤害' },
  { id: 'beak', cat: 'head', name: '疫喙', tex: 'part-head-beak', bone: 18, hp: 6, atk: 10, def: 0, spd: 0.05, unlockRaid: 2, word: '喙', desc: '普攻使目标中毒（9点/秒，4秒）并使其受治疗-30%' },
  { id: 'crown', cat: 'head', name: '王冠首', tex: 'part-head-crown', bone: 24, hp: 8, atk: 9, def: 2, spd: 0, unlockRaid: 5, word: '冠', desc: '站场时同房怪物攻击+12%；普攻额外造成4点真实伤害' },
  { id: 'swarm', cat: 'head', name: '虫群首', tex: 'part-head-swarm', bone: 20, hp: 4, atk: 12, def: 0, spd: 0.1, unlockRaid: 3, word: '虫', desc: '普攻同时啄咬两名勇者（第二名 50% 伤害）' },
  { id: 'thorn', cat: 'head', name: '棘首', tex: 'part-head-thorn', bone: 18, hp: 10, atk: 9, def: 1, spd: 0, unlockRaid: 4, word: '棘', desc: '普攻留下倒刺：目标每次攻击都会自伤5点（本房内）' },
  { id: 'choir', cat: 'head', name: '哀号首', tex: 'part-head-choir', bone: 22, hp: 6, atk: 8, def: 0, spd: 0, unlockRaid: 6, word: '哀', desc: '普攻使目标攻击-10%（本房累积，最多五层）' },
  { id: 'frost', cat: 'head', name: '霜首', tex: 'part-head-frost', bone: 22, hp: 8, atk: 10, def: 1, spd: -0.05, unlockRaid: 7, word: '霜', desc: '普攻使目标攻速-22%（4秒），血量低于30%时伤害翻倍' },
  // 臂：主动技能来源
  { id: 'claw', cat: 'arm', name: '利爪', tex: 'part-arm-claw', bone: 14, hp: 0, atk: 9, def: 0, spd: 0.3, unlockRaid: 1, word: '爪', desc: '技能·连抓：对当前目标连续两次70%攻击' },
  { id: 'club', cat: 'arm', name: '巨棒', tex: 'part-arm-club', bone: 22, hp: 0, atk: 17, def: 0, spd: -0.2, unlockRaid: 1, word: '棒', desc: '技能·横扫：对全体勇者造成90%重击伤害' },
  { id: 'bow', cat: 'arm', name: '骨弓', tex: 'part-arm-bow', bone: 20, hp: 0, atk: 12, def: 0, spd: 0, unlockRaid: 4, word: '弓', desc: '技能·穿刺：射击最后排勇者，无视一半防御' },
  { id: 'staff', cat: 'arm', name: '咒杖', tex: 'part-arm-staff', bone: 26, hp: 6, atk: 6, def: 0, spd: 0, unlockRaid: 8, word: '咒', desc: '技能·咒缚：全体勇者中毒，并沉默其首次治疗或法术' },
  { id: 'chain', cat: 'arm', name: '锁链', tex: 'part-arm-chain', bone: 22, hp: 0, atk: 11, def: 0, spd: 0.05, unlockRaid: 3, word: '链', desc: '技能·拖拽：把最后排勇者拽到前排并造成80%伤害' },
  { id: 'shield', cat: 'arm', name: '塔盾', tex: 'part-arm-shield', bone: 26, hp: 10, atk: 11, def: 3, spd: -0.15, unlockRaid: 5, word: '盾', desc: '技能·护壁：给本房怪物各一层护盾（自身生命25%）' },
  { id: 'censer', cat: 'arm', name: '香炉', tex: 'part-arm-censer', bone: 24, hp: 4, atk: 8, def: 0, spd: 0, unlockRaid: 6, word: '炉', desc: '技能·焚香：点燃全体勇者（7点/秒，5秒，圣水无效）' },
  { id: 'drill', cat: 'arm', name: '钻臂', tex: 'part-arm-drill', bone: 34, hp: 0, atk: 14, def: 0, spd: -0.15, unlockRaid: 7, word: '钻', desc: '技能·钻凿：对前排单体造成220%无视防御伤害' },
  { id: 'scythe', cat: 'arm', name: '骨镰', tex: 'part-arm-scythe', bone: 28, hp: 0, atk: 16, def: 0, spd: 0.05, unlockRaid: 3, word: '镰', desc: '技能·收割：对全体造成70%伤害，对残血（<35%）目标翻倍' },
  { id: 'cannon', cat: 'arm', name: '铁炮', tex: 'part-arm-cannon', bone: 32, hp: 4, atk: 13, def: 0, spd: -0.2, unlockRaid: 5, word: '炮', desc: '技能·齐射：轰击后排全体，造成110%伤害并眩晕0.8秒' },
  { id: 'whip', cat: 'arm', name: '倒刺鞭', tex: 'part-arm-whip', bone: 26, hp: 0, atk: 12, def: 0, spd: 0.15, unlockRaid: 2, word: '鞭', desc: '技能·抽笞：连抽三名勇者各60%伤害并各减速25%' },
  { id: 'grail', cat: 'arm', name: '毒圣杯', tex: 'part-arm-grail', bone: 30, hp: 8, atk: 7, def: 1, spd: 0, unlockRaid: 6, word: '杯', desc: '技能·调剂：本房怪物各回复18%生命，勇者全体中毒（7点/秒）' },
  { id: 'banner', cat: 'arm', name: '战旗', tex: 'part-arm-banner', bone: 30, hp: 6, atk: 9, def: 1, spd: 0, unlockRaid: 4, word: '旗', desc: '技能·督战：本房怪物攻速+35%、攻击+20%，持续6秒' },
  { id: 'syringe', cat: 'arm', name: '巨针', tex: 'part-arm-syringe', bone: 34, hp: 0, atk: 15, def: 0, spd: -0.1, unlockRaid: 8, word: '针', desc: '技能·注毒：对单体240%伤害并使其治疗完全失效5秒' },
  // 足：站位与机动
  { id: 'stump', cat: 'legs', name: '短足', tex: 'part-legs-stump', bone: 10, hp: 14, atk: 0, def: 1, spd: 0, unlockRaid: 1, word: '墩', desc: '前排站位' },
  { id: 'hoof', cat: 'legs', name: '蹄足', tex: 'part-legs-hoof', bone: 16, hp: 10, atk: 5, def: 0, spd: 0.2, unlockRaid: 1, word: '蹄', desc: '前排站位，攻速更快' },
  { id: 'wing', cat: 'legs', name: '蝠翼', tex: 'part-legs-wing', bone: 18, hp: 4, atk: 2, def: 0, spd: 0.45, unlockRaid: 4, word: '翼', desc: '后排站位，20%概率完全闪避' },
  { id: 'tentacle', cat: 'legs', name: '触须', tex: 'part-legs-tentacle', bone: 22, hp: 12, atk: 0, def: 2, spd: -0.05, unlockRaid: 8, word: '触', desc: '任意站位，普攻附带减速20%（3秒）' },
  { id: 'wheel', cat: 'legs', name: '轮座', tex: 'part-legs-wheel', bone: 18, hp: 12, atk: 3, def: 1, spd: 0.15, unlockRaid: 3, word: '轮', desc: '前排站位，入场即撞击首名勇者（22点）' },
  { id: 'root', cat: 'legs', name: '根足', tex: 'part-legs-root', bone: 20, hp: 18, atk: 0, def: 3, spd: -0.15, unlockRaid: 5, word: '根', desc: '任意站位，入场使全体勇者攻速-25%（4秒）' },
  { id: 'spider', cat: 'legs', name: '蛛足', tex: 'part-legs-spider', bone: 20, hp: 8, atk: 4, def: 1, spd: 0.25, unlockRaid: 6, word: '蛛', desc: '任意站位，12%闪避；在后排时受到伤害-25%' },
  { id: 'cloud', cat: 'legs', name: '雾座', tex: 'part-legs-cloud', bone: 22, hp: 6, atk: 2, def: 0, spd: 0.3, unlockRaid: 7, word: '雾', desc: '后排站位，被击倒时雾爆，对全体勇者造成18点伤害' },
  { id: 'coil', cat: 'legs', name: '蛇尾', tex: 'part-legs-coil', bone: 20, hp: 14, atk: 3, def: 1, spd: 0.1, unlockRaid: 2, word: '蛇', desc: '任意站位，入场缠住首名勇者：减速40%（5秒）' },
  { id: 'tread', cat: 'legs', name: '履带', tex: 'part-legs-tread', bone: 24, hp: 20, atk: 4, def: 3, spd: -0.2, unlockRaid: 4, word: '履', desc: '前排站位，入场碾压前排全体（16点）并眩晕0.6秒' },
  { id: 'stilt', cat: 'legs', name: '高跷足', tex: 'part-legs-stilt', bone: 20, hp: 6, atk: 2, def: 0, spd: 0.2, unlockRaid: 3, word: '跷', desc: '后排站位，普攻可越过前排直击后排勇者' },
  { id: 'swarmlet', cat: 'legs', name: '蛆群座', tex: 'part-legs-swarmlet', bone: 22, hp: 16, atk: 3, def: 1, spd: 0.05, unlockRaid: 5, word: '蛆', desc: '任意站位，每秒回复3点生命；被击倒时对全体造成12点伤害' },
  { id: 'anchor', cat: 'legs', name: '铁锚座', tex: 'part-legs-anchor', bone: 26, hp: 24, atk: 0, def: 4, spd: -0.25, unlockRaid: 6, word: '锚', desc: '前排站位，吸引近战勇者优先攻击自己，受到伤害-15%' },
  { id: 'flame', cat: 'legs', name: '焰座', tex: 'part-legs-flame', bone: 26, hp: 8, atk: 6, def: 0, spd: 0.25, unlockRaid: 7, word: '焰', desc: '任意站位，入场点燃全体勇者（5点/秒，4秒）' },
];

// 词缀：挂在某个部位上的强化，只收魔质，最多同时挂 2 个。
// 数值型词缀直接改派生数值；行为型词缀写进 MonEff，由 battle.ts 统一执行。
// ---- 统领级部件（第18轮）----
// 定位：比普通部件贵 2-3 倍、解锁在第 9 波之后，机制强度对齐统领光环，
// 让"拼接体/改造精英"到后期也有能追上英雄的上限（而不是靠堆数值）。
PARTS.push(
  { id: 'throne', cat: 'core', name: '王座胎', tex: 'part-core-throne', bone: 78, hp: 144, atk: 20, def: 7, spd: -0.1, unlockRaid: 9, word: '座', elite: true,
    desc: '满级被动·君临：站场时同房怪物攻击+18%、受伤-10%',
    eff: { passive: 'sovereign', rageAura: 1.18, bulwarkAura: 0.9 } },
  { id: 'magma', cat: 'core', name: '熔核胎', tex: 'part-core-magma', bone: 82, hp: 125, atk: 30, def: 6, spd: -0.05, unlockRaid: 10, word: '熔', elite: true,
    desc: '满级被动·熔壳：反弹20%伤害，被近战攻击时点燃对手',
    eff: { passive: 'coreMagma', thorns: 0.2 } },
  { id: 'brood', cat: 'core', name: '孵巢体', tex: 'part-core-brood', bone: 76, hp: 158, atk: 15, def: 6, spd: -0.1, unlockRaid: 11, word: '孵', elite: true,
    desc: '满级被动·孵育：每秒回复5点生命，被击倒时拉起一名同房怪物',
    eff: { passive: 'coreBrood', hpRegen: 5, reviveAlly: true } },
  { id: 'diadem', cat: 'head', name: '冕首', tex: 'part-head-diadem', bone: 52, hp: 14, atk: 22, def: 4, spd: 0, unlockRaid: 9, word: '冕', elite: true,
    desc: '普攻造成8点真实伤害并叠易伤+10%；站场时同房怪物攻击+12%',
    eff: { onHit: 'command', markHit: 0.1, rageAura: 1.12 } },
  { id: 'bell', cat: 'head', name: '丧钟首', tex: 'part-head-bell', bone: 50, hp: 19, atk: 18, def: 3, spd: -0.05, unlockRaid: 10, word: '钟', elite: true,
    desc: '普攻使目标中毒（12点/秒）、受治疗-35%，并延后其技能1.5秒',
    eff: { onHit: 'tithe' } },
  { id: 'eightfold', cat: 'head', name: '八目首', tex: 'part-head-eightfold', bone: 54, hp: 12, atk: 20, def: 2, spd: 0.1, unlockRaid: 11, word: '目', elite: true,
    desc: '普攻同时命中两名勇者（第二名60%），并使目标攻速-25%',
    eff: { onHit: 'ensnare', splash: 0.6 } },
  { id: 'sceptre', cat: 'arm', name: '权杖', tex: 'part-arm-sceptre', bone: 74, hp: 10, atk: 25, def: 3, spd: 0, unlockRaid: 9, word: '权', elite: true,
    desc: '技能·敕令：全体勇者受100%伤害，本房怪物攻击+25%持续6秒' },
  { id: 'magmafist', cat: 'arm', name: '熔岩拳', tex: 'part-arm-magmafist', bone: 80, hp: 5, atk: 35, def: 1, spd: -0.15, unlockRaid: 10, word: '熔', elite: true,
    desc: '技能·熔喷：全体勇者受130%重击并被点燃8秒（圣水无效）' },
  { id: 'reaper', cat: 'arm', name: '死神镰', tex: 'part-arm-reaper', bone: 78, hp: 0, atk: 32, def: 1, spd: 0.1, unlockRaid: 11, word: '殁', elite: true,
    desc: '技能·收魂：对全体造成90%伤害，残血（<45%）目标直接斩杀' },
  { id: 'palanquin', cat: 'legs', name: '御辇', tex: 'part-legs-palanquin', bone: 56, hp: 31, atk: 8, def: 5, spd: -0.05, unlockRaid: 9, word: '辇', elite: true,
    desc: '任意站位，入场时本房怪物各获得一层护盾（自身生命20%）',
    eff: { entry: 'courtEntry' } },
  { id: 'molten', cat: 'legs', name: '熔足', tex: 'part-legs-molten', bone: 58, hp: 26, atk: 12, def: 4, spd: 0, unlockRaid: 10, word: '烙', elite: true,
    desc: '前排站位，入场点燃全体勇者（6点/秒，6秒），被击倒时爆出30点伤害',
    eff: { entry: 'moltenEntry', deathBurst: 30 } },
  { id: 'broodleg', cat: 'legs', name: '孵足', tex: 'part-legs-broodleg', bone: 56, hp: 24, atk: 5, def: 4, spd: 0.15, unlockRaid: 11, word: '丝', elite: true,
    desc: '任意站位，入场使全体勇者攻速-30%（5秒），自身18%闪避',
    eff: { entry: 'webEntry', dodge: 0.18 } },
);

                     
             
               
               
               
               
                     
               
                  
                   
                  
                  
                        
                                         
  

export const AFFIXES          = [
  { id: 'huge', cat: 'core', name: '巨硕', word: '巨', mana: 8, unlockRaid: 2, hpMult: 1.3, spdAdd: -0.1, desc: '生命+30%，攻速略降' },
  { id: 'thorns', cat: 'core', name: '荆棘', word: '棘', mana: 10, unlockRaid: 5, eff: { thorns: 0.2 }, desc: '被勇者攻击时反弹20%伤害' },
  { id: 'venom', cat: 'head', name: '猛毒', word: '毒', mana: 9, unlockRaid: 3, eff: { venomHit: 8 }, desc: '普攻使目标持续中毒（8点/秒，4秒）' },
  { id: 'cruel', cat: 'head', name: '残暴', word: '暴', mana: 11, unlockRaid: 6, atkMult: 1.2, eff: { frenzy: true }, desc: '攻击+20%，击倒勇者后攻速+25%' },
  { id: 'tainted', cat: 'arm', name: '淬毒', word: '淬', mana: 9, unlockRaid: 2, eff: { venomSkill: 6 }, desc: '技能命中的勇者中毒（6点/秒，5秒）' },
  { id: 'swift', cat: 'arm', name: '迅捷', word: '迅', mana: 14, unlockRaid: 7, eff: { skillCdMult: 0.85 }, desc: '技能冷却-15%' },
  { id: 'fleet', cat: 'legs', name: '疾行', word: '疾', mana: 10, unlockRaid: 3, spdAdd: 0.2, desc: '攻速+0.2' },
  { id: 'bulwark', cat: 'legs', name: '铁壁', word: '壁', mana: 10, unlockRaid: 5, defAdd: 3, eff: { dmgTakenMult: 0.9 }, desc: '防御+3，受到伤害-10%' },
  // 第15轮扩充：每个部位补到 5 条，覆盖"数值/持续/光环/终结"四种取向
  { id: 'undying', cat: 'core', name: '不倒', word: '倒', mana: 13, unlockRaid: 4, hpMult: 1.12, eff: { hpRegen: 4 }, desc: '生命+12%，每秒回复4点' },
  { id: 'crystalline', cat: 'core', name: '晶化', word: '晶', mana: 9, unlockRaid: 4, defAdd: 2, eff: { manaEcho: 6 }, desc: '防御+2，战后若存活多得6魔质' },
  { id: 'coffin', cat: 'core', name: '镇场', word: '镇', mana: 15, unlockRaid: 8, eff: { bulwarkAura: 0.9 }, desc: '站场时同房怪物受到伤害-10%' },
  { id: 'blight', cat: 'head', name: '腐蚀', word: '腐', mana: 12, unlockRaid: 5, eff: { onHit: 'plague' }, desc: '普攻使目标中毒并受治疗-30%' },
  { id: 'sovereign', cat: 'head', name: '号令', word: '令', mana: 15, unlockRaid: 8, eff: { rageAura: 1.1 }, desc: '站场时同房怪物攻击+10%' },
  { id: 'hollow', cat: 'head', name: '虚蚀', word: '蚀', mana: 12, unlockRaid: 6, eff: { markHit: 0.07 }, desc: '普攻使目标易伤+7%（本房累积）' },
  { id: 'reaper', cat: 'arm', name: '断罪', word: '断', mana: 14, unlockRaid: 6, eff: { execute: 0.3 }, desc: '目标血量低于30%时这一击翻倍' },
  { id: 'volleyed', cat: 'arm', name: '连发', word: '连', mana: 12, unlockRaid: 4, atkMult: 1.12, eff: { splash: 0.25 }, desc: '攻击+12%，普攻溅射25%到另一名勇者' },
  { id: 'rallying', cat: 'arm', name: '鼓噪', word: '鼓', mana: 13, unlockRaid: 5, eff: { skillCdMult: 0.9, boneEcho: 6 }, desc: '技能冷却-10%，战后若存活多得6骨币' },
  { id: 'anchored', cat: 'legs', name: '铁锚', word: '锚', mana: 12, unlockRaid: 6, eff: { anchorHold: true, dmgTakenMult: 0.92 }, desc: '吸引近战勇者优先攻击自己，受到伤害-8%' },
  { id: 'vaulting', cat: 'legs', name: '越阵', word: '越', mana: 13, unlockRaid: 5, eff: { reach: true }, desc: '普攻可越过前排直击后排勇者' },
  { id: 'searing', cat: 'legs', name: '焰迹', word: '迹', mana: 11, unlockRaid: 4, eff: { entry: 'flameWake' }, desc: '入场点燃全体勇者（5点/秒，4秒）' },
];

// ---------- 玩家自定义词缀（LLM 起草，游戏侧夹紧） ----------
// 与部件 DIY 同一套思路：模型只能在 AFFIX_POWER 菜单里挑效果、在预算内给数值，
// 越界一律夹回。存档只存草案，读档重新注册进 AFFIXES。
                                                                                                    
                                                                                               

export const AFFIX_POWER                  = [
  { id: 'hp', name: '厚实', cost: 2, cats: ['core', 'legs'], desc: '生命+18%', hpMult: 1.18 },
  { id: 'atk', name: '锋锐', cost: 2, cats: ['core', 'head', 'arm'], desc: '攻击+16%', atkMult: 1.16 },
  { id: 'def', name: '硬甲', cost: 2, cats: ['core', 'head', 'legs'], desc: '防御+3', defAdd: 3 },
  { id: 'spd', name: '轻捷', cost: 2, cats: ['arm', 'legs'], desc: '攻速+0.18', spdAdd: 0.18 },
  { id: 'guard', name: '御铸', cost: 3, cats: ['core', 'legs'], desc: '受到伤害-10%', eff: { dmgTakenMult: 0.9 } },
  { id: 'venom', name: '猛毒', cost: 3, cats: ['head', 'arm'], desc: '普攻使目标中毒（8点/秒，4秒）', eff: { venomHit: 8 } },
  { id: 'burn', name: '灼烧', cost: 3, cats: ['head', 'arm'], desc: '普攻点燃目标（6点/秒，3秒）', eff: { burnHit: 6 } },
  { id: 'chill', name: '寒滞', cost: 2, cats: ['head', 'legs'], desc: '普攻使目标攻速-18%（3秒）', eff: { chillHit: 0.18 } },
  { id: 'stun', name: '震慑', cost: 3, cats: ['head', 'arm'], desc: '普攻20%概率眩晕0.7秒', eff: { stunHit: 0.2 } },
  { id: 'steal', name: '汲血', cost: 3, cats: ['core', 'head'], desc: '普攻回复所造成伤害的22%生命', eff: { lifestealPct: 0.22 } },
  { id: 'thorns', name: '倒刺', cost: 3, cats: ['core', 'legs'], desc: '被攻击时反弹18%伤害', eff: { thorns: 0.18 } },
  { id: 'regen', name: '生息', cost: 3, cats: ['core', 'legs'], desc: '每秒回复4点生命', eff: { hpRegen: 4 } },
  { id: 'dodge', name: '虚影', cost: 3, cats: ['legs', 'head'], desc: '15%概率完全闪避', eff: { dodge: 0.15 } },
  { id: 'frenzy', name: '狂热', cost: 3, cats: ['core', 'head'], desc: '击倒勇者后攻速+25%', eff: { frenzy: true } },
  { id: 'burst', name: '临终爆', cost: 3, cats: ['core', 'legs'], desc: '被击倒时对全体勇者造成16点伤害', eff: { deathBurst: 16 } },
  { id: 'cdcut', name: '迅捷', cost: 3, cats: ['arm'], desc: '技能冷却-15%', eff: { skillCdMult: 0.85 } },
  { id: 'venomSkill', name: '淬毒', cost: 3, cats: ['arm', 'core'], desc: '技能命中的勇者中毒（6点/秒，5秒）', eff: { venomSkill: 6 } },
  { id: 'mark', name: '虚蚀', cost: 3, cats: ['core', 'head'], desc: '普攻使目标易伤+7%（本房累积）', eff: { markHit: 0.07 } },
  { id: 'splash', name: '分蜂', cost: 3, cats: ['core', 'head', 'arm'], desc: '普攻溅射25%伤害到另一名勇者', eff: { splash: 0.25 } },
  { id: 'execute', name: '断罪', cost: 4, cats: ['head', 'arm'], desc: '目标血量低于30%时这一击翻倍', eff: { execute: 0.3 } },
  { id: 'healCut', name: '腐蚀', cost: 3, cats: ['head', 'arm'], desc: '普攻使目标受到的治疗-30%（6秒）', eff: { onHit: 'plague' } },
  { id: 'barb', name: '棘刺', cost: 3, cats: ['head'], desc: '普攻留下倒刺：目标每次攻击自伤5点', eff: { onHit: 'barb' } },
  { id: 'wail', name: '哀号', cost: 3, cats: ['head'], desc: '普攻使目标攻击-10%（本房累积）', eff: { onHit: 'wail' } },
  { id: 'guardAura', name: '镇场', cost: 4, cats: ['core', 'legs'], desc: '站场时同房怪物受到伤害-10%', eff: { bulwarkAura: 0.9 } },
  { id: 'rageAura', name: '号令', cost: 4, cats: ['core', 'head'], desc: '站场时同房怪物攻击+10%', eff: { rageAura: 1.1 } },
  { id: 'reach', name: '越阵', cost: 3, cats: ['legs', 'arm'], desc: '普攻可越过前排直击后排勇者', eff: { reach: true } },
  { id: 'anchor', name: '铁锚', cost: 3, cats: ['legs'], desc: '吸引近战勇者优先攻击自己', eff: { anchorHold: true } },
  { id: 'manaEcho', name: '余晶', cost: 2, cats: ['core', 'head'], desc: '战后若存活额外产出6魔质', eff: { manaEcho: 6 } },
  { id: 'boneEcho', name: '上弦', cost: 2, cats: ['core', 'arm'], desc: '战后若存活额外产出8骨币', eff: { boneEcho: 8 } },
  { id: 'entryMire', name: '缠根', cost: 3, cats: ['legs'], desc: '入场使全体勇者攻速-25%（4秒）', eff: { entry: 'mire' } },
  { id: 'entryFlame', name: '焰迹', cost: 3, cats: ['legs'], desc: '入场点燃全体勇者（5点/秒，4秒）', eff: { entry: 'flameWake' } },
];
export const affixPowerById = (id        ) => AFFIX_POWER.find((p) => p.id === id);
export const affixPowersOf = (cat         ) => AFFIX_POWER.filter((p) => p.cats.includes(cat));

// 自定义词缀的硬预算：能力分 ≤6（最多两项），魔质在 8~18 之间随能力分走
export const AFFIX_BUDGET = { power: 6, manaLo: 8, manaHi: 18 }         ;
                                                                                           
                                                                                                      
export const DIY_AFFIX_CAP = 16;

export function affixDraftCost(d               ) {
  const pts = d.powers.map(affixPowerById).filter(Boolean).reduce((n, p) => n + p .cost, 0);
  return { mana: Math.min(AFFIX_BUDGET.manaHi, AFFIX_BUDGET.manaLo + pts * 2), pts };
}

export function clampAffixDraft(cat         , raw                        , brief        )                       {
  const name = cleanCn(raw.name, 4) || `${cleanCn(brief, 2) || '无名'}缀`;
  const word = cleanCn(raw.word, 1) || name[0] || '奇';
  const desc = cleanCn(raw.desc, 24) || '来历不明的刻纹。';
  const seen = new Set        ();
  const powers           = [];
  let spent = 0;
  for (const id of Array.isArray(raw.powers) ? raw.powers : []) {
    const p = affixPowerById(String(id));
    if (!p || seen.has(p.id) || !p.cats.includes(cat)) continue;
    if (powers.length >= 2 || spent + p.cost > AFFIX_BUDGET.power) continue;
    seen.add(p.id); powers.push(p.id); spent += p.cost;
  }
  if (!powers.length) return null;     // 词缀没有效果就不是词缀
  return { name, word, desc, powers };
}

// 草案 → Affix（注册后与固定词缀走完全相同的派生路径）
export function draftToAffix(id        , cat         , d               )        {
  const ps = d.powers.map(affixPowerById).filter(Boolean)                   ;
  const eff                  = {};
  let hpMult = 1, atkMult = 1, defAdd = 0, spdAdd = 0;
  for (const p of ps) {
    Object.assign(eff, p.eff ?? {});
    hpMult *= p.hpMult ?? 1;
    atkMult *= p.atkMult ?? 1;
    defAdd += p.defAdd ?? 0;
    spdAdd += p.spdAdd ?? 0;
  }
  return {
    id, cat, name: d.name, word: d.word, mana: affixDraftCost(d).mana, unlockRaid: 0,
    desc: `${d.desc}（${ps.map((p) => p.desc).join('；')}）`.slice(0, 60),
    hpMult: hpMult === 1 ? undefined : hpMult,
    atkMult: atkMult === 1 ? undefined : atkMult,
    defAdd: defAdd || undefined,
    spdAdd: spdAdd || undefined,
    eff: Object.keys(eff).length ? eff : undefined,
    diy: true,
  };
}

export function registerDiyAffixes(list            ) {
  for (let i = AFFIXES.length - 1; i >= 0; i--) if (AFFIXES[i].diy) AFFIXES.splice(i, 1);
  for (const d of list) AFFIXES.push(draftToAffix(d.id, d.cat, d.draft));
}

export const AFFIX_CAP = 2;
                                                                                     
export const affixById = (id                    ) => (id ? AFFIXES.find((a) => a.id === id) : undefined);
export const affixesOf = (cat         , maxRaid        ) => AFFIXES.filter((a) => a.cat === cat && a.unlockRaid <= maxRaid);
export const selectedAffixes = (s                      )          =>
  s ? (['core', 'head', 'arm', 'legs']             ).map((c) => affixById(s[c])).filter(Boolean)            : [];
export const manaCost = (s                      ) => selectedAffixes(s).reduce((n, a) => n + a.mana, 0);

export const CATS                                   = [
  { cat: 'core', name: '核心' }, { cat: 'head', name: '头部' },
  { cat: 'arm', name: '肢臂' }, { cat: 'legs', name: '足部' },
];

export const partsOf = (cat         ) => PARTS.filter((p) => p.cat === cat);
export const partById = (id        ) => PARTS.find((p) => p.id === id);

                                                                                
                                                                                         

export const STITCH_MANA = 15;
export const CUSTOM_CAP = 6;
export const BASE_SPD = 0.9;

function sel(p         )         {
  return [partById(p.core), partById(p.head), partById(p.arm), partById(p.legs)].filter(Boolean)          ;
}

export function boneCost(p         ) {
  return sel(p).reduce((n, x) => n + x.bone, 0);
}

const SKILL_BY_ARM                                                           = {
  claw: { skill: 'multi', name: '连抓' },
  club: { skill: 'aoe', name: '横扫' },
  bow: { skill: 'pierce', name: '穿刺' },
  staff: { skill: 'hex', name: '咒缚' },
  chain: { skill: 'drag', name: '拖拽' },
  shield: { skill: 'wall', name: '护壁' },
  censer: { skill: 'incense', name: '焚香' },
  drill: { skill: 'bore', name: '钻凿' },
  scythe: { skill: 'reap', name: '收割' },
  cannon: { skill: 'volley', name: '齐射' },
  whip: { skill: 'lash', name: '抽笞' },
  grail: { skill: 'brew', name: '调剂' },
  banner: { skill: 'rally', name: '督战' },
  syringe: { skill: 'inject', name: '注毒' },
  // 统领级臂
  sceptre: { skill: 'decree', name: '敕令' },
  magmafist: { skill: 'eruption', name: '熔喷' },
  reaper: { skill: 'broodcall', name: '收魂' },
};
const ONHIT_BY_HEAD                                  = {
  skull: 'weaken', eye: 'pierceDef', maw: 'lifesteal', horn: 'charge',
  mask: 'sunder', lantern: 'delay', tongue: 'yank', mirror: 'shatter',
  beak: 'plague', crown: 'command', swarm: 'bite', thorn: 'barb', choir: 'wail', frost: 'freeze',
  diadem: 'command', bell: 'tithe', eightfold: 'ensnare',
};
// 头部件除 onHit 之外的附带机制
const HEAD_EXTRA                                  = {
  crown: { rageAura: 1.12 },
  swarm: { splash: 0.5 },
  frost: { chillHit: 0.22, execute: 0.3 },
  diadem: { markHit: 0.1, rageAura: 1.12 },
  eightfold: { splash: 0.6 },
};
const PASSIVE_BY_CORE                                    = {
  jelly: 'tough', bone: 'revive', rock: 'stone', fungus: 'spore',
  slag: 'ember', moss: 'regen', crystal: 'crystal', wrath: 'wrath',
  plague: 'plagueCore', cage: 'cage', void: 'voidCore', hive: 'hive', clock: 'clock', tomb: 'tomb',
  throne: 'sovereign', magma: 'coreMagma', brood: 'coreBrood',
};
// 核心件除被动之外的附带机制
const CORE_EXTRA                                  = {
  cage: { reviveAlly: true },
  void: { markHit: 0.08 },
  hive: { splash: 0.3 },
  clock: { skillCdMult: 0.8, boneEcho: 8 },
  tomb: { bulwarkAura: 0.88 },
  throne: { rageAura: 1.18, bulwarkAura: 0.9 },
  magma: { thorns: 0.2 },
  brood: { hpRegen: 5, reviveAlly: true },
};
// 足部件的额外效果（站位之外的机制）
const LEGS_EXTRA                                  = {
  wheel: { entry: 'ram' },
  root: { entry: 'mire' },
  spider: { dodge: 0.12, backGuard: 0.75 },
  cloud: { deathBurst: 18 },
  coil: { entry: 'coilBind' },
  tread: { entry: 'treadCrush' },
  stilt: { entry: 'stiltReach' },
  swarmlet: { hpRegen: 3, deathBurst: 12 },
  anchor: { anchorHold: true, dmgTakenMult: 0.85 },
  flame: { entry: 'flameWake' },
  palanquin: { entry: 'courtEntry' },
  molten: { entry: 'moltenEntry', deathBurst: 30 },
  broodleg: { entry: 'webEntry', dodge: 0.18 },
};

// 拼接体的最终数值/文案全部由部件派生：改部件表即改全部已造怪物，存档只存部件选择。
export function deriveKind(def           )              {
  const ps = sel(def.parts);
  const core = partById(def.parts.core) ;
  const head = partById(def.parts.head) ;
  const arm = partById(def.parts.arm) ;
  const legs = partById(def.parts.legs) ;
  const afs = selectedAffixes(def.affixes);
  const hpMult = afs.reduce((n, a) => n * (a.hpMult ?? 1), 1);
  const atkMult = afs.reduce((n, a) => n * (a.atkMult ?? 1), 1);
  const hp = Math.round(ps.reduce((n, x) => n + x.hp, 0) * hpMult);
  const atk = Math.round(ps.reduce((n, x) => n + x.atk, 0) * atkMult);
  const def2 = ps.reduce((n, x) => n + x.def, 0) + afs.reduce((n, a) => n + (a.defAdd ?? 0), 0);
  const spd = Math.max(0.35, Math.min(1.9, BASE_SPD + ps.reduce((n, x) => n + x.spd, 0)
    + afs.reduce((n, a) => n + (a.spdAdd ?? 0), 0)));
  const ranged = arm.id === 'bow' || arm.id === 'staff' || arm.id === 'censer' || arm.id === 'cannon';
  const ANYROW = ['tentacle', 'root', 'spider', 'coil', 'swarmlet', 'flame', 'palanquin', 'broodleg'];
  const BACKROW = ['wing', 'cloud', 'stilt'];
  const FRONTROW = ['tread', 'anchor', 'molten'];
  const row                     = FRONTROW.includes(legs.id) ? 'front'
    : BACKROW.includes(legs.id) ? 'back'
    : ANYROW.includes(legs.id) ? 'any' : ranged ? 'any' : 'front';
  const sk = SKILL_BY_ARM[arm.id] ?? { skill: 'multi'         , name: '乱击' };
  const eff         = {
    skill: sk.skill,
    skillName: sk.name,
    onHit: ONHIT_BY_HEAD[head.id],
    grip: legs.id === 'tentacle',
    dodge: legs.id === 'wing' ? 0.2 : 0,
    passive: PASSIVE_BY_CORE[core.id] ?? 'tough',
  };
  Object.assign(eff, CORE_EXTRA[core.id] ?? {});
  Object.assign(eff, HEAD_EXTRA[head.id] ?? {});
  Object.assign(eff, LEGS_EXTRA[legs.id] ?? {});
  // 高跷足只在"没有别的射程手段"时才把普攻拉到后排（避免与远程臂重复描述）
  if (legs.id === 'stilt') eff.reach = true;
  // DIY 部件的能力（powers）与固定部件的机制走同一个 MonEff，battle.ts 不区分来源
  for (const p of ps) if (p.eff) Object.assign(eff, p.eff);
  for (const a of afs) Object.assign(eff, a.eff ?? {});
  const pn = (cat         , p      ) => {
    const a = affixById(def.affixes?.[cat]);
    return a ? `${a.name}的${p.name}` : p.name;
  };
  const extra = afs.length ? ` 词缀：${afs.map((a) => `${a.name}（${a.desc}）`).join('；')}` : '';
  const SKILL_TEXT                         = {
    multi: '对当前目标连续两次攻击', aoe: '对全体勇者造成90%重击伤害',
    pierce: '射击最后排勇者，无视一半防御', hex: '全体勇者中毒并沉默一次',
    slow: '使目标攻速下降', harass: '延后目标技能并造成伤害',
    alt: '交替施放毒雾与回春', drag: '把最后排勇者拽到前排并造成80%伤害',
    wall: '给本房怪物各一层护盾', incense: '点燃全体勇者（圣水无效）',
    bore: '对单体造成220%无视防御伤害', shieldSkill: '给本房怪物各一层护盾',
    reap: '对全体造成70%伤害，残血目标翻倍', volley: '轰击后排全体并眩晕',
    lash: '连抽三名勇者并减速', brew: '本房怪物回血、勇者全体中毒',
    rally: '本房怪物攻速与攻击大幅提升6秒', inject: '单体240%伤害并封住其治疗5秒',
    decree: '全体勇者受伤，本房怪物攻击提升6秒', eruption: '全体重击并长时间点燃（圣水无效）',
    broodcall: '全体90%伤害，残血目标直接斩杀',
  };
  return {
    id: def.id, name: def.name, tex: `tex-${def.id}`, cost: boneCost(def.parts),
    hp, atk, def: def2, spd,
    skill: eff.skillName,
    skillDesc: arm.diy || eff.skill !== sk.skill
      ? (SKILL_TEXT[eff.skill] ?? '来历不明的攻击方式')
      : arm.desc.replace(/^技能·\S+：/, ''),
    passive: core.diy
      ? core.desc
      : core.desc.replace(/^满级被动·/, ''),
    row, desc: `${pn('core', core)}＋${pn('head', head)}＋${pn('arm', arm)}＋${pn('legs', legs)} 缝合而成。${extra}`,
    eff, parts: def.parts, affixes: def.affixes,
  };
}

const PREFIX = ['小', '大', '古', '暗', '腐', '狂'];
const SUFFIX = ['兽', '仆', '卫', '魔', '妖', '偶'];
export function autoName(p         , seed = Date.now(), af           ) {
  const a = partById(p.core), b = partById(p.arm);
  const r = (n        ) => Math.floor((Math.sin(seed * 0.937 + n * 12.9898) * 0.5 + 0.5) * 1e4);
  const afs = selectedAffixes(af);
  const pre = afs.length ? afs[r(3) % afs.length].word : PREFIX[r(1) % PREFIX.length];
  const suf = SUFFIX[r(2) % SUFFIX.length];
  return `${pre}${a ? a.word : ''}${b ? b.word : ''}${suf}`;
}

export function unlockedParts(cat         , maxRaid        ) {
  return partsOf(cat).filter((p) => p.unlockRaid <= maxRaid);
}

// ================= 玩家 DIY 部件（LLM 造件） =================
// 设计约束：LLM 只能从这张「能力菜单」里挑（最多两项、能力分有上限），数值也一律夹紧。
// 这样玩家的自由发挥落在文本（名字/说明/愿望）和能力组合上，战斗数值不会被一句话打崩。
;                       
             
               
                                   
                                         
               
                        
                                                                                 
  

export const POWER_MENU             = [
  { id: 'hpUp', name: '厚重', cost: 2, cats: ['core', 'legs'], desc: '生命+22%', stat: { hpMult: 1.22 } },
  { id: 'atkUp', name: '凶悍', cost: 2, cats: ['core', 'head', 'arm'], desc: '攻击+18%', stat: { atkMult: 1.18 } },
  { id: 'defUp', name: '坚甲', cost: 2, cats: ['core', 'head', 'legs'], desc: '防御+3，受到伤害-8%', stat: { defAdd: 3 }, eff: { dmgTakenMult: 0.92 } },
  { id: 'spdUp', name: '轻捷', cost: 2, cats: ['arm', 'legs'], desc: '攻速+0.18', stat: { spdAdd: 0.18 } },
  { id: 'burn', name: '灼烧', cost: 3, cats: ['core', 'head', 'arm'], desc: '普攻点燃目标（6点/秒，3秒，圣水无效）', eff: { burnHit: 6 } },
  { id: 'poisonHit', name: '毒牙', cost: 3, cats: ['head', 'arm'], desc: '普攻使目标中毒（7点/秒，4秒）', eff: { venomHit: 7 } },
  { id: 'poisonSkill', name: '毒技', cost: 3, cats: ['arm', 'core'], desc: '技能命中的勇者中毒（6点/秒，5秒）', eff: { venomSkill: 6 } },
  { id: 'chill', name: '寒滞', cost: 2, cats: ['head', 'legs'], desc: '普攻使目标攻速-18%（3秒）', eff: { chillHit: 0.18 } },
  { id: 'slowHit', name: '缠滞', cost: 2, cats: ['head', 'legs', 'arm'], desc: '普攻附带减速20%（3秒）', eff: { grip: true } },
  { id: 'stunHit', name: '震慑', cost: 3, cats: ['head', 'arm'], desc: '普攻20%概率眩晕目标0.7秒', eff: { stunHit: 0.2 } },
  { id: 'lifesteal', name: '汲血', cost: 3, cats: ['core', 'head'], desc: '普攻回复所造成伤害的22%生命', eff: { lifestealPct: 0.22 } },
  { id: 'thorns', name: '倒刺', cost: 3, cats: ['core', 'legs'], desc: '被攻击时反弹18%伤害', eff: { thorns: 0.18 } },
  { id: 'regen', name: '生息', cost: 3, cats: ['core', 'legs'], desc: '每秒回复4点生命', eff: { hpRegen: 4 } },
  { id: 'dodge', name: '虚影', cost: 3, cats: ['legs', 'head'], desc: '15%概率完全闪避', eff: { dodge: 0.15 } },
  { id: 'backRow', name: '远置', cost: 1, cats: ['legs'], desc: '可站后排', eff: {} },
  { id: 'frenzy', name: '狂热', cost: 3, cats: ['core', 'head'], desc: '击倒勇者后攻速+25%', eff: { frenzy: true } },
  { id: 'aoeSkill', name: '横扫技', cost: 4, cats: ['arm'], desc: '技能改为对全体勇者造成90%重击', eff: { skill: 'aoe', skillName: '横扫' } },
  { id: 'multiSkill', name: '连击技', cost: 3, cats: ['arm'], desc: '技能改为对单体连续两次75%攻击', eff: { skill: 'multi', skillName: '连击' } },
  { id: 'shieldSkill', name: '护壁技', cost: 3, cats: ['arm'], desc: '技能改为给本房怪物各一层护盾', eff: { skill: 'wall', skillName: '护壁' } },
  { id: 'silenceSkill', name: '沉默技', cost: 4, cats: ['arm'], desc: '技能改为全体中毒并沉默一次', eff: { skill: 'hex', skillName: '咒缚' } },
  { id: 'quickSkill', name: '速发', cost: 3, cats: ['arm'], desc: '技能冷却-15%', eff: { skillCdMult: 0.85 } },
  { id: 'deathBurst', name: '临终爆', cost: 3, cats: ['core', 'legs'], desc: '被击倒时对全体勇者造成16点伤害', eff: { deathBurst: 16 } },
  { id: 'manaEcho', name: '余晶', cost: 2, cats: ['core', 'head'], desc: '战后若存活额外产出5魔质', eff: { manaEcho: 5 } },
  // 第15轮开放：第14轮新部件的机制也进 DIY 菜单，玩家能自由组出同级效果
  { id: 'boneEcho', name: '上弦', cost: 2, cats: ['core', 'arm'], desc: '战后若存活额外产出8骨币', eff: { boneEcho: 8 } },
  { id: 'markHit', name: '虚蚀', cost: 3, cats: ['core', 'head'], desc: '普攻使目标易伤+8%（本房累积）', eff: { markHit: 0.08 } },
  { id: 'splash', name: '分蜂', cost: 3, cats: ['core', 'head', 'arm'], desc: '普攻溅射30%伤害到另一名勇者', eff: { splash: 0.3 } },
  { id: 'bulwarkAura', name: '镇棺', cost: 4, cats: ['core', 'legs'], desc: '站场时同房怪物受到伤害-12%', eff: { bulwarkAura: 0.88 } },
  { id: 'rageAura', name: '号令', cost: 4, cats: ['core', 'head'], desc: '站场时同房怪物攻击+12%', eff: { rageAura: 1.12 } },
  { id: 'reviveAlly', name: '囚牢', cost: 4, cats: ['core'], desc: '满级后被击倒时拉起一名已倒下的同房怪物', eff: { reviveAlly: true } },
  { id: 'anchorHold', name: '铁锚', cost: 3, cats: ['legs'], desc: '吸引近战勇者优先攻击自己', eff: { anchorHold: true } },
  { id: 'execute', name: '处决', cost: 4, cats: ['head', 'arm'], desc: '目标血量低于30%时这一击伤害翻倍', eff: { execute: 0.3 } },
  { id: 'reach', name: '越阵', cost: 3, cats: ['legs', 'arm'], desc: '普攻可越过前排直击后排勇者', eff: { reach: true } },
  { id: 'plagueCore', name: '疫源', cost: 3, cats: ['core'], desc: '满级后本房勇者身上的中毒每秒+2点', eff: { passive: 'plagueCore' } },
  { id: 'healCut', name: '腐蚀', cost: 3, cats: ['head', 'arm'], desc: '普攻使目标受到的治疗-30%（6秒）', eff: { onHit: 'plague' } },
  { id: 'barb', name: '棘刺', cost: 3, cats: ['head'], desc: '普攻留下倒刺：目标每次攻击自伤5点', eff: { onHit: 'barb' } },
  { id: 'wail', name: '哀号', cost: 3, cats: ['head'], desc: '普攻使目标攻击-10%（本房累积）', eff: { onHit: 'wail' } },
  { id: 'reapSkill', name: '收割技', cost: 4, cats: ['arm'], desc: '技能改为全体70%伤害，残血目标翻倍', eff: { skill: 'reap', skillName: '收割' } },
  { id: 'volleySkill', name: '齐射技', cost: 4, cats: ['arm'], desc: '技能改为轰击后排全体并眩晕0.8秒', eff: { skill: 'volley', skillName: '齐射' } },
  { id: 'lashSkill', name: '抽笞技', cost: 3, cats: ['arm'], desc: '技能改为连抽三人各60%伤害并减速', eff: { skill: 'lash', skillName: '抽笞' } },
  { id: 'brewSkill', name: '调剂技', cost: 4, cats: ['arm'], desc: '技能改为本房怪物回血18%、勇者全体中毒', eff: { skill: 'brew', skillName: '调剂' } },
  { id: 'rallySkill', name: '督战技', cost: 4, cats: ['arm'], desc: '技能改为本房怪物攻速+35%、攻击+20%（6秒）', eff: { skill: 'rally', skillName: '督战' } },
  { id: 'injectSkill', name: '注毒技', cost: 4, cats: ['arm'], desc: '技能改为单体240%伤害并封锁治疗5秒', eff: { skill: 'inject', skillName: '注毒' } },
  { id: 'entryMire', name: '缠根', cost: 3, cats: ['legs'], desc: '入场使全体勇者攻速-25%（4秒）', eff: { entry: 'mire' } },
  { id: 'entryCrush', name: '碾压', cost: 3, cats: ['legs'], desc: '入场碾压前排全体（16点）并眩晕0.6秒', eff: { entry: 'treadCrush' } },
  { id: 'entryFlame', name: '焰迹', cost: 3, cats: ['legs'], desc: '入场点燃全体勇者（5点/秒，4秒）', eff: { entry: 'flameWake' } },
];

export const powerById = (id        ) => POWER_MENU.find((p) => p.id === id);

// DIY 部件的硬上限：LLM 越界一律夹回来
export const PART_BUDGET = { hp: 120, atk: 20, def: 5, power: 6, mana: 20 }         ;

                            
               
               
               
                                              
                                                               
                   
  

// DIY 件不生成新贴图：从同部位的原生部件里挑一张最贴近的复用，
// 保证拼接体永远由同一批手绘素材组成（风格一致优先于"每件都独一无二"）。
// 造型库：默认给同部位的贴图（拼出来位置最合理），但玩家可以自由挑全部 56 张 ——
// 贴图只决定长相，数值与能力由草案决定，所以跨部位取用不会破坏平衡。
export const lookOptions = (cat         ) => PARTS.filter((p) => p.cat === cat && !p.diy);
export const allLooks = () => PARTS.filter((p) => !p.diy);
export const lookById = (id        ) => allLooks().find((p) => p.id === id);

const clamp = (v         , lo        , hi        , dflt        ) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};
const cleanCn = (v         , max        ) =>
  String(v ?? '').replace(/[\s<>{}"'\\]/g, '').slice(0, max);

// 把模型返回的草案夹紧成合法部件草案；返回 null 表示完全不可用
export function clampDraft(cat         , raw                       , brief        )                      {
  const name = cleanCn(raw.name, 4) || `${cleanCn(brief, 2) || '无名'}件`;
  const word = (cleanCn(raw.word, 1) || name[0] || '奇');
  const desc = cleanCn(raw.desc, 24) || '来历不明的缝合部件。';
  const seen = new Set        ();
  const powers           = [];
  let spent = 0;
  for (const id of Array.isArray(raw.powers) ? raw.powers : []) {
    const p = powerById(String(id));
    if (!p || seen.has(p.id) || !p.cats.includes(cat)) continue;
    if (powers.length >= 2 || spent + p.cost > PART_BUDGET.power) continue;
    seen.add(p.id); powers.push(p.id); spent += p.cost;
  }
  // look 允许跨部位取用（玩家可在造件页手动改）；给不出合法值时回落到同部位第一张
  const look = allLooks().some((p) => p.id === raw.look) ? String(raw.look) : lookOptions(cat)[0].id;
  const st = raw.stats ?? ({}                         );
  const hpCap = cat === 'core' ? PART_BUDGET.hp : 24;
  const atkCap = cat === 'arm' || cat === 'head' ? PART_BUDGET.atk : 10;
  const stats = {
    hp: Math.round(clamp(st.hp, 0, hpCap, cat === 'core' ? 70 : 8)),
    atk: Math.round(clamp(st.atk, 0, atkCap, cat === 'arm' ? 12 : 5)),
    def: Math.round(clamp(st.def, 0, PART_BUDGET.def, 1)),
    spd: Math.round(clamp(st.spd, -0.3, 0.35, 0) * 100) / 100,
  };
  if (!powers.length && stats.hp === 0 && stats.atk === 0) return null;
  return { name, word, desc, look, stats, powers };
}

// 造价：数值折骨币，能力折魔质。故意比同档固定部件贵一点 —— 自由度要付溢价。
export function draftCost(cat         , d              ) {
  const powers = d.powers.map(powerById).filter(Boolean)              ;
  const pts = powers.reduce((n, p) => n + p.cost, 0);
  const bone = Math.round(12 + d.stats.hp * 0.22 + d.stats.atk * 1.1 + d.stats.def * 2.4 + Math.max(0, d.stats.spd) * 30);
  const mana = Math.min(PART_BUDGET.mana, 6 + pts * 3);
  void cat;
  return { bone, mana, pts };
}

// 草案 → Part（注册进 PARTS，之后与固定部件走完全相同的派生/存档路径）
export function draftToPart(id        , cat         , d              , brief        )       {
  const powers = d.powers.map(powerById).filter(Boolean)              ;
  const eff                  = {};
  let hpMult = 1, atkMult = 1, defAdd = 0, spdAdd = 0;
  for (const p of powers) {
    Object.assign(eff, p.eff ?? {});
    hpMult *= p.stat?.hpMult ?? 1;
    atkMult *= p.stat?.atkMult ?? 1;
    defAdd += p.stat?.defAdd ?? 0;
    spdAdd += p.stat?.spdAdd ?? 0;
  }
  const cost = draftCost(cat, d);
  const look = partById(d.look);
  return {
    id, cat, name: d.name, tex: look && !look.diy ? look.tex : lookOptions(cat)[0].tex, bone: cost.bone,
    hp: Math.round(d.stats.hp * hpMult), atk: Math.round(d.stats.atk * atkMult),
    def: d.stats.def + defAdd, spd: Math.round((d.stats.spd + spdAdd) * 100) / 100,
    unlockRaid: 0, word: d.word,
    desc: `${d.desc}${powers.length ? ` 能力：${powers.map((p) => p.name).join('・')}` : ''}`,
    eff, diy: true, powers: d.powers, brief,
  };
}

// DIY 部件在运行时注册进 PARTS（存档只存草案，读档重新注册）
;                                                                                                   

export function registerDiy(list           ) {
  for (let i = PARTS.length - 1; i >= 0; i--) if (PARTS[i].diy) PARTS.splice(i, 1);
  for (const d of list) PARTS.push(draftToPart(d.id, d.cat, d.draft, d.brief));
}
export const DIY_CAP = 16;
export const diyManaCost = (cat         , d              ) => draftCost(cat, d).mana;

// ================= 改造：把部件移植到已有单位上 =================
// 设计要点：不改 inst.kind（同种怪物仍是同种），改造只存在实例上（inst.graft），
// 派生时把部件数值/机制叠到基础 MonsterKind 上 —— 原生兵、精英、拼接体三类都能改造。
export const GRAFT_CAP = 2;
export const GRAFT_MANA = 10;        // 每次移植的魔质
export const GRAFT_PULL_MANA = 6;    // 摘除一件的魔质

export function graftBone(ids          ) {
  // 移植比新造贵两成：改造的价值是"保留等级与经验"，得付溢价
  return Math.round(ids.reduce((n, id) => n + (partById(id)?.bone ?? 0), 0) * 1.2);
}
export function graftCostOf(cur          , next          ) {
  const added = next.filter((id) => !cur.includes(id));
  return { bone: graftBone(added), mana: added.length * GRAFT_MANA };
}

// 已改造单位的最终数值：基础 kind + 移植件
export function graftKind(k             , ids                      )              {
  if (!ids || !ids.length) return k;
  const ps = ids.map(partById).filter(Boolean)          ;
  if (!ps.length) return k;
  const eff         = { ...k.eff };
  let row = k.row;
  let skill = k.skill;
  let skillDesc = k.skillDesc;
  for (const p of ps) {
    // 每类部件按它本来的职责改写：核心→被动、头→普攻效果、臂→技能、足→站位
    if (p.cat === 'core') {
      const pas = GRAFT_PASSIVE[p.id];
      if (pas) eff.passive = pas;
      Object.assign(eff, GRAFT_CORE_EXTRA[p.id] ?? {});
    } else if (p.cat === 'head') {
      const oh = GRAFT_ONHIT[p.id];
      if (oh) eff.onHit = oh;
      Object.assign(eff, GRAFT_HEAD_EXTRA[p.id] ?? {});
    } else if (p.cat === 'arm') {
      const sk = GRAFT_SKILL[p.id];
      if (sk) {
        eff.skill = sk.skill;
        eff.skillName = sk.name;
        skill = sk.name;
        skillDesc = p.desc.replace(/^技能·\S+：/, '');
      }
    } else {
      if (GRAFT_BACK.includes(p.id)) row = 'back';
      else if (GRAFT_ANY.includes(p.id)) row = 'any';
      else if (GRAFT_FRONT.includes(p.id)) row = 'front';
      Object.assign(eff, GRAFT_LEGS_EXTRA[p.id] ?? {});
    }
    if (p.eff) Object.assign(eff, p.eff);   // DIY 造件的能力
  }
  const hp = k.hp + ps.reduce((n, p) => n + p.hp, 0);
  const atk = k.atk + ps.reduce((n, p) => n + p.atk, 0);
  const def = k.def + ps.reduce((n, p) => n + p.def, 0);
  const spd = Math.max(0.35, Math.min(1.9, k.spd + ps.reduce((n, p) => n + p.spd, 0)));
  return {
    ...k,
    name: `${ps.map((p) => p.word).join('')}${k.name}`,
    hp, atk, def, spd, row, skill, skillDesc, eff,
    desc: `${k.desc} 已移植：${ps.map((p) => p.name).join('、')}。`,
    graft: ids,
  };
}

// 改造用的映射表与 deriveKind 共用同一批常量（改一处即两处生效）
const GRAFT_SKILL                                                           = SKILL_BY_ARM;
const GRAFT_ONHIT                                  = ONHIT_BY_HEAD;
const GRAFT_PASSIVE                                    = PASSIVE_BY_CORE;
const GRAFT_CORE_EXTRA = CORE_EXTRA;
const GRAFT_HEAD_EXTRA = HEAD_EXTRA;
const GRAFT_LEGS_EXTRA = LEGS_EXTRA;
const GRAFT_BACK = ['wing', 'cloud', 'stilt'];
const GRAFT_ANY = ['tentacle', 'root', 'spider', 'coil', 'swarmlet', 'flame', 'palanquin', 'broodleg'];
const GRAFT_FRONT = ['tread', 'anchor', 'molten'];
