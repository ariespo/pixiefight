// 全自动战斗模拟：房间逐间推进，产出可解释事件流与战报。
import { kindById, HERO_CLASSES, LEVEL_MULT, HERO_LV_MULT, TRAPS, AFFIXES, AURAS, synergyOf } from './data.js';
import { graftKind } from './modules.js';
import { rollLoot, gearById } from './gear.js';
                                             
                                                                                   

export const ROOM_W = 400;

                
                                                                                               
                                                                                
                                                       
                                                                    
                                                            
                                                                   
                                                       
                                                                
                                
                                
                                   

                                  

                    
             
               
               
              
             
                      
                                                         
                                               
                        
               
                
             
              
              
              
             
            
            
                
                 
             
                  
                
                  
                   
                  
                    
                                      
                  
                                 
                
                 
                    
                  
                   
                    
                   
                 
                 
                
                   
                 
                
               
                                                
                                                
                             
                      
                                       
                                    
            
                                                    
                     
                                            
                                           
                                       
  

                           
                
                 
               
                    
                        
                  
                                                
                                     
                     
                                            
                                                       
                      
                                          
                                        
                  
                       
                     
                    
  

                                                                                               

                            
               
                
                
               
                 
                    
               
               
                                    
                                                                       
                                                
                     
  

                      
                       
                 
                
                     
                    
                                                                   
                 
                    
                    
               
               
                     
               
                 
                              
                    
                  
                    
                    
  

const MON_FRONT_X = 296;
const MON_BACK_X = 348;
const MON_LEAD_X = 324;   // 统领席：前后排之间，视觉上"压阵"
const MON_FLANK_X = 268;  // 侧翼兵：统领解锁后才开的第三个兵位
const LEAD_Y = -8;
const HERO_FRONT_X = [232, 204];
const HERO_BACK_X = [166, 132, 98];
const BACK_Y = -18;

function mulberry(seed        ) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

;                                                                                                 
;                                                                                                                                                

function makeMonUnit(inst             , row       , roomIdx        , mod             = NO_MODS, leaderSeat = false)       {
  const k = graftKind(kindById(inst.kind) , inst.graft);
  const mult = LEVEL_MULT[inst.lv - 1];
  const hp = Math.max(1, Math.round(k.hp * mult * mod.monHpMult));
  const slotX = leaderSeat ? MON_LEAD_X : row === 0 ? MON_FRONT_X : MON_BACK_X;
  return {
    side: 'mon', kind: k.id, name: k.name, tex: k.tex, lv: inst.lv, monsterUid: inst.uid, eff: k.eff,
    maxHp: hp, hp, atk: Math.max(1, Math.round(k.atk * mult * mod.monAtkMult)), def: Math.round(k.def * mult),
    spd: Math.max(0.15, k.spd + mod.monSpdAdd),
    row, x: slotX, y: leaderSeat ? LEAD_Y : row === 0 ? 0 : BACK_Y,
    homeX: slotX,
    alive: true, cd: 0.6 + Math.random() * 0.3, skillCd: k.eff.skill === 'alt' ? 2.5 : 4,
    skillCdMax: k.eff.skill === 'alt' ? 2.5 : 4,
    slowT: 0, slowAmt: 0, hasteAmt: 0, poisonT: 0, poisonDps: 0, burnT: 0, burnDps: 0, burstDone: false, stunT: 0, shield: 0,
    silenced: false, disarmT: 0, revived: false, killBoost: 0, charged: false,
    flashT: 0, lungeT: 0, deadT: 0, dmgDealt: 0, healed: 0, phase: 0, room: roomIdx,
    marked: 1, guardT: 0, healCutT: 0, healCutPct: 1, barbT: 0, atkCut: 1, rallyT: 0,
    legend: !!k.legend, aura: k.aura ?? null, charmT: 0, auraRevived: false,
  };
}

// 统领席：数值由 heroes.ts 的 champStats 算好（等级/特质/专精/疲劳都折进去了），
// battle.ts 只负责把它变成一个战斗单位 —— 战斗逻辑不认识"英雄培养"这件事。
function makeChampUnit(st           , uid        , roomIdx        , mod             = NO_MODS)       {
  const hp = Math.max(1, Math.round(st.hp * mod.monHpMult));
  return {
    side: 'mon', kind: st.race, name: st.name, tex: st.tex, lv: st.lv, champUid: uid, eff: st.eff,
    maxHp: hp, hp, atk: Math.max(1, Math.round(st.atk * mod.monAtkMult)), def: st.def,
    spd: Math.max(0.15, st.spd + mod.monSpdAdd),
    row: 0, x: MON_LEAD_X, y: LEAD_Y, homeX: MON_LEAD_X,
    alive: true, cd: 0.6 + Math.random() * 0.3, skillCd: 4, skillCdMax: 4,
    slowT: 0, slowAmt: 0, hasteAmt: 0, poisonT: 0, poisonDps: 0, burnT: 0, burnDps: 0, burstDone: false, stunT: 0, shield: 0,
    silenced: false, disarmT: 0, revived: false, killBoost: 0, charged: false,
    flashT: 0, lungeT: 0, deadT: 0, dmgDealt: 0, healed: 0, phase: 0, room: roomIdx,
    marked: 1, guardT: 0, healCutT: 0, healCutPct: 1, barbT: 0, atkCut: 1, rallyT: 0,
    legend: true, aura: st.auraId, auraPow: st.auraPow, dmgTakenMult: st.dmgTakenMult, charmT: 0, auraRevived: false,
    __battleAttacks: 0, __battleThornDmg: 0, __battleRevives: 0, __soulAtk: 0,
  };
}

function makeHeroUnit(cls        , lv        , idx        , total        , mod             = NO_MODS)       {
  const c = HERO_CLASSES[cls];
  const mult = HERO_LV_MULT(lv);
  const hp = Math.max(1, Math.round(c.hp * mult * mod.heroHpMult));
  const frontCount = Math.min(2, total);
  const row        = idx < frontCount ? 0 : 1;
  const slot = row === 0 ? HERO_FRONT_X[idx] : HERO_BACK_X[Math.min(2, idx - frontCount)];
  return {
    side: 'hero', kind: c.id, name: c.name, tex: c.tex, lv,
    maxHp: hp, hp, atk: Math.max(1, Math.round(c.atk * mult * mod.heroAtkMult)), def: Math.round(c.def * mult), spd: c.spd,
    row, x: slot - 260, y: row === 0 ? 0 : BACK_Y, homeX: slot,
    alive: true, cd: 0.8, skillCd: 3, skillCdMax: 3,
    slowT: 0, slowAmt: 0, hasteAmt: 0, poisonT: 0, poisonDps: 0, burnT: 0, burnDps: 0, burstDone: false, stunT: 0, shield: 0,
    silenced: false, disarmT: 0, revived: false, killBoost: 0, charged: false,
    flashT: 0, lungeT: 0, deadT: 0, dmgDealt: 0, healed: 0, phase: 0, room: 0,
    marked: 1, guardT: 0, healCutT: 0, healCutPct: 1, barbT: 0, atkCut: 1, rallyT: 0,
    legend: false, aura: null, charmT: 0, auraRevived: false,
  };
}

// 剧情修正：由 vars.ts 的 foldMods 折叠后传进来，所有战斗数值都在建单位时一次性吃进去
;                         
                                                           
                                                                                                   
  
export const NO_MODS             = {
  monHpMult: 1, monAtkMult: 1, monSpdAdd: 0,
  heroHpMult: 1, heroAtkMult: 1, sealAdd: 0, trapMult: 1, roomLimitAdd: 0,
};

export function createBattle(raid         , rooms           , insts               ,
                            opts                                                                                                  = {})         {
  const mod = opts.mods ?? NO_MODS;
  const rt                = rooms.map((r, i) => {
    const mons         = [];
    if (r.front != null) {
      const inst = insts.find((m) => m.uid === r.front);
      if (inst) mons.push(makeMonUnit(inst, 0, i, mod));
    }
    if (r.back != null) {
      const inst = insts.find((m) => m.uid === r.back);
      if (inst) mons.push(makeMonUnit(inst, 1, i, mod));
    }
    // 侧翼兵位只在该房有统领时生效（UI 也这么锁）
    let leader              = null;
    if (r.leader != null) {
      const st = opts.champs?.[r.leader];
      if (st) {
        leader = makeChampUnit(st, r.leader, i, mod);
        mons.push(leader);
      }
    }
    if (leader && r.flank != null) {
      const inst = insts.find((m) => m.uid === r.flank);
      if (inst) {
        const u = makeMonUnit(inst, 0, i, mod);
        u.x = MON_FLANK_X; u.homeX = MON_FLANK_X;
        mons.push(u);
      }
    }
    return {
      index: i, theme: r.theme, trap: r.trap, trapUsed: false, trapDisarmed: false,
      trapArm: 0, spellLock: 0, reflectLeft: 0, reflectPct: 0, synergy: synergyOf(r.theme, r.trap)?.name ?? '',
      mons, leader, routed: false, heroKills: 0, broken: false, breachReason: '', breachTime: 0, doorShake: 0,
    };
  });
  const heroes = raid.members.map((mm, i) => makeHeroUnit(mm.cls, mm.lv, i, raid.members.length, mod));
  // 护主/统御等领袖特质：开场给同房非英雄单位加生命上限
  for (const r of rt) {
    const ld = r.leader;
    if (ld?.eff?.allyHp) {
      for (const m of r.mons) {
        if (m.legend) continue;
        const mult = ld.eff.allyHp;
        m.maxHp = Math.max(1, Math.round(m.maxHp * mult));
        m.hp = Math.min(m.maxHp, Math.round(m.hp * mult));
      }
    }
  }
  const affixes = raid.affixes;
  if (affixes.includes('brave')) heroes.forEach((h) => (h.atk = Math.round(h.atk * 1.15)));
  if (affixes.includes('shield')) heroes.forEach((h) => (h.shield = Math.round(h.maxHp * 0.25)));
  const limit = Math.max(8, (affixes.includes('haste') ? 12 : 18) + mod.roomLimitAdd);
  const sealCap = Math.max(25, (opts.sealMax ?? 100) + mod.sealAdd);
  const b         = {
    rooms: rt, heroes, raid, affixes,
    roomIndex: 0, phase: 'enter', phaseT: 0,
    roomLimit: limit,
    roomTimer: limit,
    seal: sealCap, time: 0, moraleMult: 1,
    events: [], log: [], result: null, throneIdx: 0,
    sealMax: sealCap, trapPower: (opts.trapPower ?? 1) * mod.trapMult,
    rng: mulberry(raid.no * 9176 + 13),
  };
  enterRoom(b);
  return b;
}

function log(b        , text        , tone                 ) {
  b.log.push({ room: b.roomIndex, t: b.time, text, tone });
}

function speak(b, u, text, kind = 'skill') {
  if (!u || !u.alive || !text) return;
  b.events.push({ k: 'speech', room: u.room, x: u.x, y: u.y, text, side: u.side, unit: u, kind });
}

function impactText(dmg        , tgt      )          {
  const ratio = dmg / Math.max(1, tgt.maxHp);
  if (ratio >= 0.55) return '造成了毁灭性伤害';
  if (ratio >= 0.3) return '造成了重创';
  if (ratio >= 0.12) return '造成了可观伤害';
  if (ratio >= 0.04) return '只是轻伤';
  return '几乎没造成伤害';
}

function reactionText(tgt      , rng           )          {
  const r = tgt.hp / Math.max(1, tgt.maxHp);
  const hero = tgt.side === 'hero';
  const pools = hero ? {
    high: ['哈哈，根本不痛', '就这点本事？', '软弱无力', '阵形别乱，继续推进', '盔甲替我挡住了', '这种攻击吓不到我', '离王座还远着呢', '保持呼吸，别停下', '它们在试探我们', '我连热身都算不上', '别把背后露出来', '下一击就轮到我了'],
    mid: ['可恶…', '还能撑住', '小伤而已', '这地方比情报里危险', '别停，我还能走', '治疗留给更需要的人', '它抓住了我的破绽', '重新列阵！', '我低估这些守军了', '小心，它们会配合', '伤口不深，继续', '别让它再来一次'],
    low: ['呃啊！', '好痛…', '该死…', '护住侧翼！', '我快撑不住了', '谁来压住那只怪物', '药剂，快！', '别管我，先破门', '视线开始模糊了', '这不是普通守军', '再中一下就危险了', '队长，换我到后排'],
    crit: ['难道我就会在这里…', '不、不可能…', '还没…结束…', '别让远征停在这里', '我听不见号令了…', '至少把同伴送出去', '王座就在前面…', '我的手已经握不住了', '告诉他们，我没有后退', '光啊，再借我一次力量', '这座地牢记住我了', '最后一口气，也要挥剑'],
  } : {
    high: ['哼，软弱', '再来啊', '不够看', '地牢的门还在我身后', '你打碎的只是灰尘', '勇者都这么没力气吗', '再靠近一步试试', '主人在看着这场战斗', '我的骨头比城墙还硬', '这点伤只会让我清醒', '轮到我还手了', '你们走不到下一间房'],
    mid: ['嘶…有点意思', '不过如此', '有点疼', '守住门口！', '它们比上一队难缠', '别让牧师抬手', '盯紧那个拿盾的', '血的味道让我兴奋', '阵脚还没有乱', '我记住你的气味了', '把它们拖进陷阱', '统领，我还能战'],
    low: ['吼！', '该死…', '你会后悔的', '不许碰王座！', '我的甲壳裂开了', '快封住缺口', '地牢不会交给你们', '就算爬也要拦住他们', '先杀治疗者', '墙后还有我们的同伴', '别让旗帜倒下', '我需要一点时间'],
    crit: ['不…我的地牢…', '我…倒下…', '不可能…', '替我守住下一道门', '别踩过我的影子', '主人，我尽力了', '至少留下一个勇者', '把我的部件带回工坊', '门闩还没有断…', '我会在骨坑里再醒来', '王座不能落到他们手里', '下一批守军会替我复仇'],
  };
  const pool = r > 0.7 ? pools.high : r > 0.4 ? pools.mid : r > 0.15 ? pools.low : pools.crit;
  return pool[Math.floor(rng() * pool.length)];
}

function logHit(b        , src      , tgt      , dmg        , action        , heavy         , rng           ) {
  if (!tgt.alive) return;
  const tone = src.side === 'mon' ? 'good' : 'bad';
  if (dmg <= 0) {
    log(b, `${tgt.name}闪避了${src.name}的${action}`, tone);
    return;
  }
  const imp = impactText(dmg, tgt);
  log(b, `${src.name}对${tgt.name}${action}，造成${dmg}点伤害（${imp}）`, tone);
  if (dmg / Math.max(1, tgt.maxHp) >= 0.05 || tgt.hp / Math.max(1, tgt.maxHp) < 0.35) {
    const line = reactionText(tgt, rng ?? b.rng);
    log(b, `　${tgt.name}：${line}`, tone);
    speak(b, tgt, line, 'reaction');
  }
}

const HERO_ROOM_LINES = [
  '检查墙角，陷阱通常藏在最安静的地方。', '保持队形，谁也别独自追出去。', '前面有动静，盾先举起来。',
  '这里的守军换过布置，小心脚下。', '别被那些怪物的外表骗了。', '王座的气息更近了，继续推进。',
  '照明往前送，我看不清门后。', '先确认退路，再准备破门。', '听见了吗？它们正在等我们。',
  '伤员站中间，前排跟我上。', '这间房交给我们，速战速决。', '不要分散火力，逐个击破。',
];
const MON_ROOM_LINES = [
  '门后就是我们的地盘，一步也别让。', '勇者来了，把灯灭掉。', '陷阱已经醒了，等他们再近一点。',
  '盯住治疗者，别让他念完咒语。', '守住这间房，后面还有同伴。', '它们的盔甲有缝，往关节打。',
  '别急着冲，等统领的号令。', '让墙壁记住他们的惨叫。', '王座不会欢迎活着的勇者。',
  '把前排拖住，后排交给我。', '就算倒下，也要咬掉一块甲。', '地牢养了我们，现在轮到我们守它。',
];
const BREACH_LINES = [
  '门闩断了，退到下一道防线！', '这一间守不住了，把伤员带走！', '别让勇者趁乱追上来！',
  '熄掉火把，撤进暗道！', '记住他们的阵形，通知后面的守军！', '门已经开了，但战斗还没有结束！',
];

function enterRoom(b        ) {
  const room = b.rooms[b.roomIndex];
  b.heroes.forEach((h) => {
    if (!h.alive) return;
    h.room = b.roomIndex;
    h.x = h.homeX - 260;
    h.cd = 0.9;
    h.skillCd = h.kind === 'cleric' ? 2 : 3.2;
    h.disarmT = 0;
    h.guardT = 0;
    if (room.theme === 'bonepit') { h.slowT = 3; h.slowAmt = 0.3; }
  });
  if (room.theme === 'bonepit') log(b, `骨坑减速：勇者入场速度下降3秒`, 'good');
  if (room.theme === 'forge') log(b, `熔炉炙烤：前排怪物攻击提升，房内所有人持续受热`, 'good');
  if (room.theme === 'mirror') log(b, `镜厅：勇者的法术与治疗被折走两成`, 'good');
  if (room.theme === 'mire') {
    b.heroes.forEach((h) => { if (h.alive) { h.slowT = Math.max(h.slowT, 999); h.slowAmt = Math.max(h.slowAmt, 0.08); } });
    log(b, `沼室：泥水拖慢了勇者的动作`, 'good');
  }
  if (room.synergy) log(b, `${room.synergy}：${room.theme}与${TRAPS[room.trap].name}同源生效`, 'good');
  room.mons.forEach((m) => { m.charged = false; });
  const heroSpeaker = b.heroes.find((h) => h.alive);
  const monSpeaker = room.leader?.alive ? room.leader : room.mons.find((m) => m.alive);
  log(b, `—— 第${b.roomIndex + 1}房交战：${room.mons.length ? `${room.mons.length}名守军列阵` : '房间无人驻守'} ——`, room.mons.length ? 'good' : 'bad');
  if (heroSpeaker) log(b, `　${heroSpeaker.name}：${HERO_ROOM_LINES[Math.floor(b.rng() * HERO_ROOM_LINES.length)]}`, 'bad');
  if (monSpeaker) log(b, `　${monSpeaker.name}：${MON_ROOM_LINES[Math.floor(b.rng() * MON_ROOM_LINES.length)]}`, 'good');
  // 足部件的入场效果：进房瞬间结算一次
  for (const m of room.mons) {
    if (!m.alive || !m.eff?.entry) continue;
    if (m.eff.entry === 'ram') {
      const first = b.heroes.find((h) => h.alive);
      if (first) {
        const amt = 22;
        first.hp -= amt;
        first.flashT = 0.12;
        m.dmgDealt += amt;
        b.events.push({ k: 'hit', room: b.roomIndex, x: first.x, y: first.y, dmg: amt, heavy: true, target: first });
        b.events.push({ k: 'shake', amount: 2 });
        log(b, `${m.name}入场撞击${first.name}`, 'good');
        if (first.hp <= 0) {
          first.alive = false; first.hp = 0; first.deadT = 0;
          b.events.push({ k: 'die', room: b.roomIndex, x: first.x, y: first.y, side: 'hero' });
        }
      }
    } else if (m.eff.entry === 'mire') {
      b.heroes.forEach((h) => { if (h.alive) { h.slowT = Math.max(h.slowT, 4); h.slowAmt = Math.max(h.slowAmt, 0.25); } });
      log(b, `${m.name}的根须缠住了整队勇者`, 'good');
    } else if (m.eff.entry === 'coilBind') {
      const first = b.heroes.find((h) => h.alive);
      if (first) {
        first.slowT = Math.max(first.slowT, 5);
        first.slowAmt = Math.max(first.slowAmt, 0.4);
        log(b, `${m.name}的蛇尾缠住${first.name}`, 'good');
      }
    } else if (m.eff.entry === 'treadCrush') {
      const front = b.heroes.filter((h) => h.alive && h.row === 0);
      for (const h of front) {
        h.hp -= 16;
        h.flashT = 0.12;
        m.dmgDealt += 16;
        b.events.push({ k: 'hit', room: b.roomIndex, x: h.x, y: h.y, dmg: 16, heavy: true, target: h });
        h.stunT = Math.max(h.stunT, 0.6);
        if (h.hp <= 0) { h.alive = false; h.hp = 0; h.deadT = 0; b.events.push({ k: 'die', room: b.roomIndex, x: h.x, y: h.y, side: 'hero' }); }
      }
      if (front.length) { b.events.push({ k: 'shake', amount: 3 }); log(b, `${m.name}履带碾过前排`, 'good'); }
    } else if (m.eff.entry === 'flameWake') {
      b.heroes.forEach((h) => { if (h.alive) applyBurn(h, 5, 4); });
      log(b, `${m.name}的焰座点燃了整队勇者`, 'good');
    } else if (m.eff.entry === 'courtEntry') {
      for (const o of room.mons) if (o.alive) o.shield += Math.round(o.maxHp * 0.2);
      log(b, `${m.name}的御辇升起，本房守军各得一层护盾`, 'good');
    } else if (m.eff.entry === 'moltenEntry') {
      b.heroes.forEach((h) => { if (h.alive) applyBurn(h, 6, 6); });
      log(b, `${m.name}的熔足在地上烙出火痕`, 'good');
    } else if (m.eff.entry === 'webEntry') {
      b.heroes.forEach((h) => {
        if (!h.alive) return;
        h.slowT = Math.max(h.slowT, 5); h.slowAmt = Math.max(h.slowAmt, 0.3);
      });
      log(b, `${m.name}结的网黏住了整队勇者`, 'good');
    } else if (m.eff.entry === 'stiltReach') {
      log(b, `${m.name}居高临下，能越过前排直取后排`, 'good');
    }
  }
  if (room.trap === 'rune' && !room.trapUsed) b.heroes.forEach((h) => (h.silenced = true));
  room.trapArm = 1.2;
  const rogue = b.heroes.find((h) => h.alive && h.kind === 'rogue');
  if (rogue && room.trap !== 'none' && !room.trapUsed && !room.trapDisarmed) rogue.disarmT = 2.0;
  b.phase = 'enter';
  b.phaseT = 0;
  b.roomTimer = b.roomLimit;
}

const aliveMons = (b        ) => b.rooms[b.roomIndex].mons.filter((m) => m.alive);
// 统领光环：统领必须活着，且只作用于同房的非统领兵种
function auraOf(b        , u      )                {
  if (u.side !== 'mon' || u.legend) return null;
  const ld = b.rooms[u.room]?.leader;
  return ld && ld.alive ? ld.aura : null;
}
// 光环强度：英雄的特质/专精把基准值放大，所有吃光环的地方都乘这个系数
function auraPow(b        , roomIdx        ) {
  const ld = b.rooms[roomIdx]?.leader;
  return ld && ld.alive ? (ld.auraPow ?? 1) : 1;
}
function roomAura(b        , roomIdx        )                {
  const ld = b.rooms[roomIdx]?.leader;
  return ld && ld.alive ? ld.aura : null;
}
const aliveHeroes = (b        ) => b.heroes.filter((h) => h.alive);
// 镜厅：勇者一侧的"法术类"输出与治疗被削弱（普攻不受影响，否则等于全局减伤）
const mirrorMult = (b        ) => (b.rooms[b.roomIndex]?.theme === 'mirror' ? 0.8 : 1);

export function interval(u      , b         ) {
  const slow = u.slowT > 0 ? 1 - u.slowAmt : 1;
  const aura = b && auraOf(b, u) === 'haste' ? 1 + 0.2 * auraPow(b, u.room) : 1;
  const rally = u.rallyT > 0 ? 1.35 : 1;
  const allySpd = (u.side === 'mon' && !u.legend && b && b.rooms[u.room]?.leader?.alive && b.rooms[u.room].leader.eff?.allySpd)
    ? b.rooms[u.room].leader.eff.allySpd : 1;
  const spd = u.spd * slow * (1 + u.hasteAmt) * (1 + u.killBoost) * aura * rally * allySpd;
  return 1.6 / Math.max(0.15, spd);
}

// 共用行动条读取同一份战斗计时：0 在左端（马上行动），1 在右端（刚行动完）。
export function actionProgress(u, b) {
  const basic = Math.max(0, Math.min(1, u.cd / Math.max(0.01, interval(u, b))));
  if (u.skillCd > (u.skillCdMax ?? 0)) u.skillCdMax = u.skillCd;
  const room = b.rooms[b.roomIndex];
  const skillBlocked = u.side === 'hero' ? room?.spellLock > 0 : !!u.silenced;
  const skill = skillBlocked ? 1 : Math.max(0, Math.min(1, u.skillCd / Math.max(0.01, u.skillCdMax ?? u.skillCd ?? 1)));
  return Math.min(basic, skill);
}

// 部件光环：只在"同房、活着、非自己"的携带者存在时生效（与统领光环是两条独立线）
function roomEffAura(b        , u      , key                            ) {
  const room = b.rooms[u.room];
  if (!room) return 1;
  let v = 1;
  for (const m of room.mons) {
    if (!m.alive || !m.eff) continue;
    const k = m.eff[key];
    if (k) v = key === 'bulwarkAura' ? Math.min(v, k) : Math.max(v, k);
  }
  return v;
}
const bulwarkMult = (b        , u      ) => roomEffAura(b, u, 'bulwarkAura');
// 怪物出手的攻击乘数：王冠光环 + 督战buff（勇者侧用 atkCut 反向削弱）
function atkMult(b        , u      ) {
  if (u.side !== 'mon') return u.atkCut;
  let mult = roomEffAura(b, u, 'rageAura');
  const ld = b.rooms[u.room]?.leader;
  if (ld?.alive && ld.eff?.allyAtk && !u.legend) mult *= ld.eff.allyAtk;
  return mult * (u.rallyT > 0 ? 1.2 : 1);
}

function damage(b        , src      , tgt      , raw        , heavy         , pierce = 0) {
  if (!tgt.alive) return;
  const dodge = tgt.side === 'mon' ? dodgeChance(tgt) : 0;
  if (dodge > 0 && b.rng() < dodge) {
    b.events.push({ k: 'hit', room: b.roomIndex, x: tgt.x, y: tgt.y, dmg: 0, heavy: false, target: tgt });
    return;
  }
  let dmg = Math.max(1, Math.round(raw - tgt.def * (1 - pierce) * 0.6));
  if (tgt.side === 'mon' && tgt.eff) {
    if (heavy && tgt.eff.passive === 'tough' && tgt.lv >= 5) dmg = Math.round(dmg * 0.75);
    if (tgt.eff.passive === 'stone' && tgt.lv >= 5) dmg = Math.max(1, dmg - 4);
    if (tgt.eff.dmgTakenMult) dmg = Math.max(1, Math.round(dmg * tgt.eff.dmgTakenMult));
    if (tgt.eff.backGuard && tgt.row === 1) dmg = Math.max(1, Math.round(dmg * tgt.eff.backGuard));
    // 余烬：被近战打到就点燃对手（满级）
    if (tgt.eff.passive === 'ember' && tgt.lv >= 5 && src.side === 'hero' && src.alive) applyBurn(src, 5, 3);
    // 熔壳：反弹一部分伤害并点燃对手（thorns 走既有通路，这里只补点燃）
    if (tgt.eff.passive === 'coreMagma' && tgt.lv >= 5 && src.side === 'hero' && src.alive) applyBurn(src, 6, 3);
  }
  // 熔炉共鸣（统领光环）：同房兵种被近战打到时也反弹并点燃
  if (tgt.side === 'mon' && !tgt.legend && auraOf(b, tgt) === 'forge' && src.side === 'hero' && src.alive) {
    const back = Math.max(1, Math.round(dmg * 0.2 * auraPow(b, tgt.room)));
    src.hp -= back;
    src.flashT = 0.1;
    b.events.push({ k: 'hit', room: b.roomIndex, x: src.x, y: src.y, dmg: back, heavy: false, target: src });
    applyBurn(src, 4, 3);
    if (src.hp <= 0) {
      src.alive = false; src.hp = 0; src.deadT = 0;
      b.events.push({ k: 'die', room: b.roomIndex, x: src.x, y: src.y, side: 'hero' });
      const rm = b.rooms[b.roomIndex]; if (rm) rm.heroKills++;
      log(b, `熔炉共鸣把 ${src.name} 自己烧倒了`, 'good');
    }
  }
  // 暴怒：残血加攻（每次结算时按当前血量判定，避免额外状态位）
  if (src.side === 'mon' && src.eff?.passive === 'wrath' && src.lv >= 5 && src.hp < src.maxHp * 0.5) {
    dmg = Math.max(1, Math.round(dmg * 1.35));
  }
  // 统领光环：骸骨号令加兵种攻击、万臂庇护给兵种减伤
  // 熔炉：前排怪物打得更狠
  if (src.side === 'mon' && src.row === 0 && b.rooms[src.room]?.theme === 'forge') dmg = Math.max(1, Math.round(dmg * 1.12));
  if (src.side === 'mon' && auraOf(b, src) === 'atk') dmg = Math.max(1, Math.round(dmg * (1 + 0.25 * auraPow(b, src.room))));
  // 失去带领：统领阵亡后，本房兵种士气下降
  if (src.side === 'mon' && !src.legend && b.rooms[src.room]?.routed) dmg = Math.max(1, Math.round(dmg * 0.85));
  if (tgt.side === 'mon' && auraOf(b, tgt) === 'guard') dmg = Math.max(1, Math.round(dmg * Math.max(0.4, 1 - 0.2 * auraPow(b, tgt.room))));
  if (tgt.dmgTakenMult && tgt.dmgTakenMult !== 1) dmg = Math.max(1, Math.round(dmg * tgt.dmgTakenMult));
  // 狂战士：血越少打得越狠（最多 +80%），代价是吃不到治疗
  if (src.side === 'hero' && src.kind === 'berserker') {
    dmg = Math.max(1, Math.round(dmg * (1 + 0.8 * (1 - src.hp / src.maxHp))));
  }
  // 游侠标记
  if (tgt.marked > 1) dmg = Math.max(1, Math.round(dmg * tgt.marked));
  // 镇棺（石棺胎）：同房有它站着，本房怪物集体减伤
  if (tgt.side === 'mon' && tgt.lv >= 1) {
    const bul = bulwarkMult(b, tgt);
    if (bul < 1) dmg = Math.max(1, Math.round(dmg * bul));
  }
  // 圣骑士护佑：把 30% 伤害转给场上还活着的圣骑士自己
  if (tgt.side === 'hero' && tgt.guardT > 0 && tgt.kind !== 'paladin') {
    const pal = b.heroes.find((h) => h.alive && h.kind === 'paladin' && h.room === tgt.room);
    if (pal && pal !== tgt) {
      const share = Math.max(1, Math.round(dmg * 0.3));
      dmg = Math.max(1, dmg - share);
      pal.hp -= share;
      pal.flashT = 0.12;
      b.events.push({ k: 'hit', room: b.roomIndex, x: pal.x, y: pal.y, dmg: share, heavy: false, target: pal });
      if (pal.hp <= 0) { pal.alive = false; pal.hp = 0; pal.deadT = 0; b.events.push({ k: 'die', room: b.roomIndex, x: pal.x, y: pal.y, side: 'hero' }); log(b, `圣骑士替队友挡下最后一击，倒地`, 'good'); }
    }
  }
  if (tgt.shield > 0) {
    const absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    dmg -= absorbed;
    if (tgt.shield <= 0) {
      b.events.push({ k: 'shieldbreak', room: b.roomIndex, x: tgt.x, y: tgt.y });
      log(b, `${tgt.name}的护盾被击碎`, tgt.side === 'hero' ? 'good' : 'bad');
    }
    if (dmg <= 0) return;
  }
  // 神恩：致命伤害有机会保留 1 点生命
  if (tgt.eff?.divineFavor && !tgt.divineFavorUsed && tgt.hp - dmg <= 0 && b.rng() < tgt.eff.divineFavor) {
    dmg = Math.max(0, tgt.hp - 1);
    tgt.divineFavorUsed = true;
    log(b, `神恩：${tgt.name}以1点生命幸存`, 'good');
  }
  tgt.hp -= dmg;
  tgt.flashT = 0.12;
  src.dmgDealt += dmg;
  b.events.push({ k: 'hit', room: b.roomIndex, x: tgt.x, y: tgt.y, dmg, heavy, target: tgt });
  if (heavy) b.events.push({ k: 'shake', amount: 2 });
  if (tgt.hp <= 0) {
    // 不灭（英雄特质）：首次倒下以 50% 生命复活
    if (tgt.side === 'mon' && tgt.eff?.undyingTrait && !tgt.revived) {
      tgt.revived = true;
      tgt.hp = Math.max(1, Math.round(tgt.maxHp * tgt.eff.undyingTrait));
      if (tgt.champUid) tgt.__battleRevives++;
      log(b, `不灭：${tgt.name}以${Math.round(tgt.eff.undyingTrait * 100)}%生命站起`, 'good');
      return;
    }
    if (tgt.side === 'mon' && tgt.eff?.passive === 'revive' && tgt.lv >= 5 && !tgt.revived) {
      tgt.revived = true;
      tgt.hp = Math.round(tgt.maxHp * 0.2);
      if (tgt.champUid) tgt.__battleRevives++;
      log(b, `不朽骨：${tgt.name}以20%生命复活`, 'good');
      return;
    }
    // 巫妖光环：兵种首次倒下时被拉起来（每场每兵一次）
    if (tgt.side === 'mon' && auraOf(b, tgt) === 'undying' && !tgt.auraRevived) {
      tgt.auraRevived = true;
      tgt.hp = Math.max(1, Math.round(tgt.maxHp * Math.min(0.9, 0.3 * auraPow(b, tgt.room))));
      if (tgt.champUid) tgt.__battleRevives++;
      b.events.push({ k: 'cast', room: b.roomIndex, x: tgt.x, y: tgt.y, color: 0x9b5de5 });
      log(b, `亡者不休：${tgt.name}被${b.rooms[tgt.room]?.leader?.name ?? '巫妖'}拽了回来`, 'good');
      return;
    }
    tgt.alive = false;
    tgt.hp = 0;
    tgt.deadT = 0;
    b.events.push({ k: 'die', room: b.roomIndex, x: tgt.x, y: tgt.y, side: tgt.side });
    if (tgt.legend) {
      b.events.push({ k: 'shake', amount: 5 });
      const rm = b.rooms[tgt.room];
      if (rm && rm.leader === tgt && !rm.routed) {
        rm.routed = true;
        const troops = rm.mons.filter((m) => m.alive && !m.legend).length;
        log(b, `统领${tgt.name}倒下：${AURAS[tgt.aura ?? 'atk'].name}消失${troops ? '，兵种溃散' : ''}`, 'bad');
      }
    }
    deathBurst(b, tgt);
    // 囚牢（囚笼胎）：自己碎了，笼里关着的东西被放出来
    if (tgt.side === 'mon' && tgt.eff?.reviveAlly && tgt.lv >= 5) {
      const rm = b.rooms[tgt.room];
      const fallen = rm?.mons.find((m) => !m.alive && m !== tgt && !m.legend && m.deadT >= 0 && m.hp <= 0 && !m.revived);
      if (fallen) {
        fallen.revived = true;
        fallen.alive = true;
        fallen.hp = Math.max(1, Math.round(fallen.maxHp * 0.2));
        fallen.deadT = 0;
        fallen.cd = 0.5;
        b.events.push({ k: 'cast', room: b.roomIndex, x: fallen.x, y: fallen.y, color: 0xd95763 });
        log(b, `囚笼碎裂：${fallen.name}被放了出来`, 'good');
      }
    }
    if (tgt.side === 'hero') { const rm = b.rooms[b.roomIndex]; if (rm) rm.heroKills++; }
    if (src.side === 'mon' && src.eff?.passive === 'bloodlust' && src.lv >= 5) src.killBoost = 0.3;
    if (src.side === 'mon' && src.eff?.frenzy && tgt.side === 'hero') src.killBoost = Math.max(src.killBoost, 0.25);
    // 嗜血：击杀回血
    if (src.side === 'mon' && src.eff?.bloodthirsty && tgt.side === 'hero') {
      const amt = Math.max(1, Math.round(src.maxHp * src.eff.bloodthirsty));
      const before = src.hp;
      src.hp = Math.min(src.maxHp, src.hp + amt);
      const got = src.hp - before;
      if (got > 0) {
        src.healed += got;
        b.events.push({ k: 'heal', room: b.roomIndex, x: src.x, y: src.y, amt: got, target: src });
        log(b, `嗜血：${src.name}回复${got}生命`, 'good');
      }
    }
    // 噬魂：击杀勇者永久+1攻击（本场累计，战后写入英雄）
    if (src.champUid && src.eff?.soulDevour && tgt.side === 'hero') {
      src.__soulAtk = Math.min(30, (src.__soulAtk ?? 0) + 1);
      log(b, `噬魂：${src.name}吞噬灵魂，攻击成长`, 'good');
    }
    log(b, `${tgt.name} 被 ${src.name} 击倒`, tgt.side === 'hero' ? 'good' : 'bad');
  }
  // 复仇：倒下时向房内所有勇者反弹 30% 攻击伤害
  if (tgt.side === 'mon' && tgt.eff?.vengeful && tgt.hp <= 0) {
    const amt = Math.max(1, Math.round(tgt.atk * tgt.eff.vengeful));
    let any = false;
    for (const h of b.heroes) {
      if (!h.alive || h.room !== tgt.room) continue;
      h.hp -= amt;
      h.flashT = 0.12;
      tgt.dmgDealt += amt;
      b.events.push({ k: 'hit', room: b.roomIndex, x: h.x, y: h.y, dmg: amt, heavy: false, target: h });
      any = true;
      if (h.hp <= 0) {
        h.alive = false; h.hp = 0; h.deadT = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: h.x, y: h.y, side: 'hero' });
        const rm = b.rooms[b.roomIndex]; if (rm) rm.heroKills++;
      }
    }
    if (any) log(b, `复仇：${tgt.name}倒下时反噬房内勇者`, 'good');
  }
  // 映照阵：勇者打出的伤害按比例折回自身。和荆棘一样不走 damage() 避免递归。
  if (src.side === 'hero' && tgt.side === 'mon' && dmg > 0) {
    const rm = b.rooms[b.roomIndex];
    if (rm && rm.reflectLeft > 0 && src.alive) {
      rm.reflectLeft--;
      const back = Math.max(1, Math.round(dmg * rm.reflectPct));
      src.hp -= back;
      src.flashT = 0.12;
      b.events.push({ k: 'hit', room: b.roomIndex, x: src.x, y: src.y, dmg: back, heavy: false, target: src });
      b.events.push({ k: 'cast', room: b.roomIndex, x: src.x, y: src.y, color: 0x9b5de5 });
      if (src.hp <= 0) {
        src.alive = false; src.hp = 0; src.deadT = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: src.x, y: src.y, side: 'hero' });
        rm.heroKills++;
        log(b, `映照阵把 ${src.name} 自己的攻击折了回去`, 'good');
      }
    }
  }
  // 荆棘词缀：反伤不走 damage()，避免与对方效果互相递归
  if (tgt.side === 'mon' && tgt.eff?.thorns && src.side === 'hero' && src.alive && dmg > 0) {
    const back = Math.max(1, Math.round(dmg * tgt.eff.thorns));
    src.hp -= back;
    src.flashT = 0.12;
    tgt.dmgDealt += back;
    if (tgt.champUid) tgt.__battleThornDmg += back;
    b.events.push({ k: 'hit', room: b.roomIndex, x: src.x, y: src.y, dmg: back, heavy: false, target: src });
    if (src.hp <= 0) {
      src.alive = false; src.hp = 0; src.deadT = 0;
      b.events.push({ k: 'die', room: b.roomIndex, x: src.x, y: src.y, side: 'hero' });
      log(b, `荆棘反弹击倒了 ${src.name}`, 'good');
    }
  }
}

function applyBurn(tgt      , dps        , dur        ) {
  tgt.burnDps = Math.max(tgt.burnDps, dps);
  tgt.burnT = Math.max(tgt.burnT, dur);
}

function applyPoison(b        , tgt      , dps        , dur        ) {
  const holy = b.affixes.includes('holywater') ? 0.5 : 1;
  tgt.poisonDps = Math.max(tgt.poisonDps, dps);
  tgt.poisonT = Math.max(tgt.poisonT, dur * holy);
}

// 雾座/临终爆：怪物被击倒时炸一下全体勇者。不走 damage() 递归，直接扣血。
function deathBurst(b        , u      ) {
  if (u.side !== 'mon' || !u.eff?.deathBurst || u.burstDone) return;
  u.burstDone = true;
  const amt = u.eff.deathBurst;
  b.events.push({ k: 'poison', room: b.roomIndex, x: u.x, y: u.y });
  b.events.push({ k: 'shake', amount: 2 });
  let any = false;
  for (const h of b.heroes) {
    if (!h.alive) continue;
    h.hp -= amt;
    h.flashT = 0.12;
    u.dmgDealt += amt;
    b.events.push({ k: 'hit', room: b.roomIndex, x: h.x, y: h.y, dmg: amt, heavy: false, target: h });
    any = true;
    if (h.hp <= 0) {
      h.alive = false; h.hp = 0; h.deadT = 0;
      b.events.push({ k: 'die', room: b.roomIndex, x: h.x, y: h.y, side: 'hero' });
    }
  }
  if (any) log(b, `${u.name}倒下时炸开一团雾`, 'good');
}

// 把一名后排勇者拽到前排：改 row/homeX 让它进入前排承伤序列
function yankHero(b        , tgt             ) {
  if (!tgt || tgt.row !== 1 || !tgt.alive) return false;
  tgt.row = 0;
  tgt.homeX = HERO_FRONT_X[1];
  tgt.x = tgt.homeX;
  tgt.y = 0;
  tgt.stunT = Math.max(tgt.stunT, 0.4);
  log(b, `${tgt.name}被拽到了前排`, 'good');
  return true;
}

// 被支配时的目标：血最多的其他勇者（打治疗/坦克更有观感，也不至于秒掉残血队友）
function charmTarget(b        , u      )              {
  const others = b.heroes.filter((h) => h.alive && h !== u && h.room === u.room);
  if (!others.length) return null;
  return others.reduce((a, z) => (z.hp > a.hp ? z : a));
}

function heroTarget(b        , h      )              {
  const mons = aliveMons(b);
  if (!mons.length) return null;
  // 铁锚座嘲讽：前排的锚会把近战火力吸过去（弓手仍然专打后排）
  if (h.kind !== 'archer') {
    const anchor = mons.find((m) => m.eff?.anchorHold && m.row === 0);
    if (anchor) return anchor;
  }
  if (h.kind === 'archer') {
    const back = mons.find((m) => m.row === 1);
    return back || mons[0];
  }
  const front = mons.find((m) => m.row === 0);
  return front || mons[0];
}

function monTarget(b        , m      )              {
  const hs = aliveHeroes(b);
  if (!hs.length) return null;
  if (m.eff?.reach) {
    // 高跷足：优先越过前排直取后排（后排全清了才回头打前排）
    const back = [...hs].reverse().find((h) => h.row === 1);
    if (back) return back;
  }
  if (m.eff?.skill === 'pierce' || m.eff?.skill === 'harass' || m.eff?.dodge) {
    const back = [...hs].reverse().find((h) => h.row === 1);
    return back || hs[hs.length - 1];
  }
  const front = hs.find((h) => h.row === 0);
  return front || hs[0];
}

function dodgeChance(u      ) {
  if (u.side !== 'mon' || !u.eff) return 0;
  if (u.eff.passive === 'evade' && u.lv >= 5) return 0.25;
  return u.eff.dodge ?? 0;
}

// 头部部件的普攻附加效果（拼接体与固定怪物共用一条路径）
function onHitEffect(b        , u      , tgt      , dealt        ) {
  const eff = u.eff;
  if (!eff) return;
  if (eff.grip) { tgt.slowT = Math.max(tgt.slowT, 3); tgt.slowAmt = Math.max(tgt.slowAmt, 0.2); }
  if (eff.onHit === 'weaken') { tgt.slowT = Math.max(tgt.slowT, 3); tgt.slowAmt = Math.max(tgt.slowAmt, 0.12); }
  if (eff.venomHit && tgt.side === 'hero' && tgt.alive) {
    applyPoison(b, tgt, eff.venomHit * (eff.passive === 'spore' && u.lv >= 5 ? 1.3 : 1), 4);
  }
  if (eff.burnHit && tgt.side === 'hero' && tgt.alive) applyBurn(tgt, eff.burnHit, 3);
  if (eff.chillHit) { tgt.slowT = Math.max(tgt.slowT, 3); tgt.slowAmt = Math.max(tgt.slowAmt, eff.chillHit); }
  if (eff.stunHit && b.rng() < eff.stunHit) tgt.stunT = Math.max(tgt.stunT, 0.7);
  if (eff.onHit === 'sunder') { tgt.def = Math.max(0, tgt.def - 3); }
  if (eff.onHit === 'delay') { tgt.skillCd += 1.5; }
  if (eff.onHit === 'yank' && b.rng() < 0.3) {
    const back = [...aliveHeroes(b)].reverse().find((h) => h.row === 1);
    yankHero(b, back ?? null);
  }
  if (eff.onHit === 'shatter' && tgt.shield > 0) {
    const sh = tgt.shield;
    tgt.shield = 0;
    tgt.hp -= sh;
    u.dmgDealt += sh;
    b.events.push({ k: 'shieldbreak', room: b.roomIndex, x: tgt.x, y: tgt.y });
    b.events.push({ k: 'hit', room: b.roomIndex, x: tgt.x, y: tgt.y, dmg: sh, heavy: true, target: tgt });
    log(b, `镜面首击碎护盾并反射${sh}点伤害`, 'good');
    if (tgt.hp <= 0) {
      tgt.alive = false; tgt.hp = 0; tgt.deadT = 0;
      b.events.push({ k: 'die', room: b.roomIndex, x: tgt.x, y: tgt.y, side: tgt.side });
    }
  }
  // 疫喙：中毒 + 治疗折扣（毒本身走 venomHit 之外的独立数值，别和词缀叠成两条毒）
  if (eff.onHit === 'plague' && tgt.side === 'hero' && tgt.alive) {
    applyPoison(b, tgt, 9 * (eff.passive === 'spore' && u.lv >= 5 ? 1.3 : 1), 4);
    tgt.healCutT = Math.max(tgt.healCutT, 6);
    tgt.healCutPct = Math.min(tgt.healCutPct, 0.7);
  }
  if (eff.onHit === 'command' && tgt.alive) {
    tgt.hp -= 4;                                  // 真实伤害：不吃防御也不吃减伤
    u.dmgDealt += 4;
    if (tgt.hp <= 0) { tgt.alive = false; tgt.hp = 0; tgt.deadT = 0; b.events.push({ k: 'die', room: b.roomIndex, x: tgt.x, y: tgt.y, side: tgt.side }); }
  }
  if (eff.onHit === 'barb' && tgt.side === 'hero') tgt.barbT = Math.max(tgt.barbT, 8);
  if (eff.onHit === 'wail' && tgt.side === 'hero') tgt.atkCut = Math.max(0.5, tgt.atkCut - 0.1);
  if (eff.onHit === 'freeze') { tgt.slowT = Math.max(tgt.slowT, 4); tgt.slowAmt = Math.max(tgt.slowAmt, 0.22); }
  // 丧钟首/疫主：重毒 + 治疗大幅折扣 + 技能延后（专打治疗队）
  if (eff.onHit === 'tithe' && tgt.side === 'hero' && tgt.alive) {
    applyPoison(b, tgt, 12 * (eff.passive === 'spore' && u.lv >= 5 ? 1.3 : 1), 4);
    tgt.healCutT = Math.max(tgt.healCutT, 6);
    tgt.healCutPct = Math.min(tgt.healCutPct, 0.35);
    tgt.skillCd += 1.5;
  }
  // 熔核系：普攻点燃（burn 无视圣水）
  if (eff.onHit === 'scorch' && tgt.side === 'hero' && tgt.alive) applyBurn(tgt, 6, 4);
  // 八目首/孵母：黏网减速
  if (eff.onHit === 'ensnare') { tgt.slowT = Math.max(tgt.slowT, 4); tgt.slowAmt = Math.max(tgt.slowAmt, 0.25); }
  // 虚蚀：叠易伤
  if (eff.markHit && tgt.side === 'hero') tgt.marked = Math.min(1.6, tgt.marked + eff.markHit);
  // 分蜂/虫群：溅射到另一名勇者
  if (eff.splash && dealt > 0 && tgt.side === 'hero') {
    const other = aliveHeroes(b).find((h) => h !== tgt);
    if (other) damage(b, u, other, Math.max(1, dealt * eff.splash), false);
  }
  const steal = eff.lifestealPct ?? (eff.onHit === 'lifesteal' ? 0.25 : 0);
  if (steal > 0 && dealt > 0) {
    const amt = Math.max(1, Math.round(dealt * steal));
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amt);
    const got = u.hp - before;
    if (got > 0) {
      u.healed += got;
      b.events.push({ k: 'heal', room: b.roomIndex, x: u.x, y: u.y, amt: got, target: u });
    }
  }
}

// 棘首留下的倒刺：勇者每次出手扎自己一下（不致死判定走统一出口）
function barbBite(b        , h      ) {
  if (h.barbT <= 0 || !h.alive) return;
  h.hp -= 5;
  b.events.push({ k: 'hit', room: b.roomIndex, x: h.x, y: h.y, dmg: 5, heavy: false, target: h });
  if (h.hp <= 0) {
    h.alive = false; h.hp = 0; h.deadT = 0;
    b.events.push({ k: 'die', room: b.roomIndex, x: h.x, y: h.y, side: 'hero' });
    log(b, `${h.name}被自己身上的倒刺放倒`, 'good');
  }
}

function lowest(us        ) {
  let best              = null;
  for (const u of us) if (u.alive && (!best || u.hp / u.maxHp < best.hp / best.maxHp)) best = u;
  return best;
}

function basicAttack(b        , u      ) {
  // 被灵吸怪支配的勇者转而攻击自己的队友
  const charmed = u.side === 'hero' && u.charmT > 0;
  const tgt = charmed ? charmTarget(b, u) : u.side === 'hero' ? heroTarget(b, u) : monTarget(b, u);
  if (!tgt) return;
  u.lungeT = 0.22;
  if (u.champUid) u.__battleAttacks++;
  const mult = u.side === 'hero' ? b.moraleMult * u.atkCut : atkMult(b, u);
  if (u.side === 'hero') barbBite(b, u);
  if (u.side !== 'mon' || !u.eff) {
    const before = tgt.hp + tgt.shield;
    damage(b, u, tgt, u.atk * mult, false);
    logHit(b, u, tgt, before - (tgt.hp + tgt.shield), '发动攻击', false, b.rng);
    return;
  }
  const eff = u.eff;
  const pierce = eff.onHit === 'pierceDef' ? 0.25 : 0;
  let raw = u.atk;
  let heavy = false;
  let action = '发动攻击';
  if (eff.onHit === 'charge' && !u.charged) {
    u.charged = true;
    raw *= 1.6;
    heavy = true;
    tgt.stunT = Math.max(tgt.stunT, 0.6);
    action = '蓄力撞击';
    log(b, `${u.name}的蓄力撞击命中${tgt.name}`, 'good');
  }
  // 狡猾：普攻有概率造成 1.5 倍伤害
  if (eff.cunning && b.rng() < eff.cunning) {
    raw *= eff.cunningMult ?? 1.5;
    heavy = true;
  }
  // 霜首处决：目标残血时这一击翻倍
  if (eff.execute && tgt.side === 'hero' && tgt.hp < tgt.maxHp * eff.execute) { raw *= 2; heavy = true; }
  const before = tgt.hp + tgt.shield;
  damage(b, u, tgt, raw * mult, heavy, pierce);
  const dealt = before - (tgt.hp + tgt.shield);
  if (dealt > 0) logHit(b, u, tgt, dealt, action, heavy, b.rng);
  onHitEffect(b, u, tgt, dealt);
}

function monSkill(b        , u      ) {
  const room = b.rooms[b.roomIndex];
  const boost = u.lv >= 3 ? 1.3 : 1;
  const cdMult = (room.theme === 'curse' && u.row === 1 ? 0.85 : 1) * (u.eff?.skillCdMult ?? 1);
  b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0x9b5de5 });
  const eff = u.eff;
  const name = eff?.skillName ?? '技能';
  const action = `使用${name}`;
  speak(b, u, `${name}！`);
  // 淬毒词缀：给"这次技能实际打到的人"上毒，靠打前/打后血量差判定，不必逐技能改写
  const venom = eff?.venomSkill ?? 0;
  const before = venom ? b.heroes.map((h) => h.hp + h.shield) : null;
  switch (eff?.skill) {
    case 'slow': {
      const t = monTarget(b, u);
      if (t) { t.slowT = 4; t.slowAmt = 0.2 * boost; log(b, `${name}：${t.name}攻速下降`, 'good'); }
      u.skillCd = 6 * cdMult;
      break;
    }
    case 'multi': {
      const t = monTarget(b, u);
      if (t) {
        for (let i = 0; i < 2; i++) {
          const bf = t.hp + t.shield;
          damage(b, u, t, u.atk * 0.75 * boost, false);
          logHit(b, u, t, bf - (t.hp + t.shield), action, false, b.rng);
        }
        log(b, `${name}：${u.name}连击${t.name}`, 'good');
      }
      u.skillCd = 6 * cdMult;
      break;
    }
    case 'pierce': {
      const hs = aliveHeroes(b);
      const t = [...hs].reverse().find((h) => h.row === 1) || hs[hs.length - 1];
      if (t) {
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 1.4 * boost, false, 0.5);
        logHit(b, u, t, bf - (t.hp + t.shield), action, false, b.rng);
        log(b, `${name}命中后排${t.name}`, 'good');
      }
      u.skillCd = 7 * cdMult;
      break;
    }
    case 'harass': {
      const t = monTarget(b, u);
      if (t) {
        t.skillCd += 2 * boost;
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 0.9, false);
        logHit(b, u, t, bf - (t.hp + t.shield), action, false, b.rng);
        log(b, `${name}：${t.name}技能延后`, 'good');
      }
      u.skillCd = 5 * cdMult;
      break;
    }
    case 'alt': {
      if (u.phase === 0) {
        const dps = 3 * boost * (u.eff?.passive === 'spore' && u.lv >= 5 ? 1.3 : 1) * (room.theme === 'poison' ? 1.25 : 1);
        aliveHeroes(b).forEach((h) => applyPoison(b, h, dps, 5));
        b.events.push({ k: 'poison', room: b.roomIndex, x: 200, y: 0 });
        log(b, `毒雾：勇者全体中毒`, 'good');
        u.phase = 1;
      } else {
        const t = lowest(room.mons);
        if (t) {
          const amt = Math.round(10 * boost);
          t.hp = Math.min(t.maxHp, t.hp + amt);
          t.healed += amt;
          b.events.push({ k: 'heal', room: b.roomIndex, x: t.x, y: t.y, amt, target: t });
          log(b, `回春：${t.name}恢复${amt}`, 'good');
        }
        u.phase = 0;
      }
      u.skillCd = 5 * cdMult;
      break;
    }
    case 'aoe': {
      aliveHeroes(b).forEach((h) => {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 0.9 * boost, true);
        logHit(b, u, h, bf - (h.hp + h.shield), action, true, b.rng);
        if (u.eff?.passive === 'brute' && u.lv >= 5) h.stunT = Math.max(h.stunT, 1);
      });
      log(b, `${name}：${u.name}重击全体勇者`, 'good');
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'drag': {
      const hs = aliveHeroes(b);
      const back = [...hs].reverse().find((h) => h.row === 1);
      const t = back ?? hs[hs.length - 1];
      if (t) {
        yankHero(b, back ?? null);
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 0.8 * boost, false);
        logHit(b, u, t, bf - (t.hp + t.shield), action, false, b.rng);
        log(b, `${name}：${u.name}把${t.name}拖了过来`, 'good');
      }
      u.skillCd = 7 * cdMult;
      break;
    }
    case 'wall': {
      const amt = Math.round(u.maxHp * 0.25 * boost);
      let n = 0;
      for (const m of b.rooms[b.roomIndex].mons) {
        if (!m.alive) continue;
        m.shield = Math.max(m.shield, amt);
        n++;
      }
      if (n) log(b, `${name}：本房${n}只怪物获得${amt}点护盾`, 'good');
      u.skillCd = 9 * cdMult;
      break;
    }
    case 'incense': {
      const dps = 7 * boost;
      aliveHeroes(b).forEach((h) => applyBurn(h, dps, 5));
      b.events.push({ k: 'poison', room: b.roomIndex, x: 200, y: 0 });
      log(b, `${name}：勇者全体被点燃`, 'good');
      u.skillCd = 7 * cdMult;
      break;
    }
    case 'bore': {
      const t = monTarget(b, u);
      if (t) {
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 2.2 * boost, true, 1);
        logHit(b, u, t, bf - (t.hp + t.shield), action, true, b.rng);
        log(b, `${name}：钻穿${t.name}的护甲`, 'good');
      }
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'reap': {
      // 收割：全体 70%，残血目标翻倍 —— 清扫被磨过的队伍
      let fin = 0;
      for (const h of aliveHeroes(b)) {
        const low = h.hp < h.maxHp * 0.35;
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * (low ? 1.4 : 0.7) * boost, low);
        logHit(b, u, h, bf - (h.hp + h.shield), action, low, b.rng);
        if (low) fin++;
      }
      b.events.push({ k: 'shake', amount: 3 });
      log(b, fin ? `${name}：镰刃扫过，${fin}名残血勇者被重创` : `${name}：镰刃扫过全队`, 'good');
      u.skillCd = 7 * cdMult;
      break;
    }
    case 'volley': {
      // 齐射：专打后排（治疗/法术都在后排），并短暂眩晕
      const back = aliveHeroes(b).filter((h) => h.row === 1);
      const targets = back.length ? back : aliveHeroes(b);
      for (const h of targets) {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 1.1 * boost, true);
        logHit(b, u, h, bf - (h.hp + h.shield), action, true, b.rng);
        if (h.alive) h.stunT = Math.max(h.stunT, 0.8);
      }
      b.events.push({ k: 'shake', amount: 3 });
      log(b, `${name}：炮火笼罩后排 ${targets.length} 人`, 'good');
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'lash': {
      const hs = aliveHeroes(b).slice(0, 3);
      for (const h of hs) {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 0.6 * boost, false);
        logHit(b, u, h, bf - (h.hp + h.shield), action, false, b.rng);
        if (h.alive) { h.slowT = Math.max(h.slowT, 4); h.slowAmt = Math.max(h.slowAmt, 0.25); }
      }
      log(b, `${name}：鞭子连抽${hs.length}人并拖慢他们`, 'good');
      u.skillCd = 6 * cdMult;
      break;
    }
    case 'brew': {
      for (const m of room.mons) {
        if (!m.alive) continue;
        const amt = Math.round(m.maxHp * 0.18 * boost);
        const bf = m.hp;
        m.hp = Math.min(m.maxHp, m.hp + amt);
        u.healed += m.hp - bf;
        if (m.hp > bf) b.events.push({ k: 'heal', room: b.roomIndex, x: m.x, y: m.y, amt: m.hp - bf, target: m });
      }
      const dps = 7 * boost * (room.theme === 'poison' ? 1.25 : 1);
      aliveHeroes(b).forEach((h) => applyPoison(b, h, dps, 5));
      b.events.push({ k: 'poison', room: b.roomIndex, x: 200, y: 0 });
      log(b, `${name}：守军饮下毒剂回血，勇者吸入毒雾`, 'good');
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'rally': {
      for (const m of room.mons) if (m.alive) m.rallyT = Math.max(m.rallyT, 6);
      b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xd95763 });
      log(b, `${name}：战旗一挥，本房守军攻速与攻击暴涨6秒`, 'good');
      u.skillCd = 11 * cdMult;
      break;
    }
    // 敕令：全场伤害 + 本房加攻（统领/权杖共用，等价于"打一下再督战"）
    case 'decree': {
      let hit = 0;
      for (const h of aliveHeroes(b)) {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 1.0 * boost, false);
        logHit(b, u, h, bf - (h.hp + h.shield), action, false, b.rng);
        hit++;
      }
      for (const m of room.mons) if (m.alive) m.rallyT = Math.max(m.rallyT, 6);
      b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xe6b84a });
      log(b, `${name}：钟声压过${hit}名勇者，本房守军攻势上扬6秒`, 'good');
      u.skillCd = 8 * cdMult;
      break;
    }
    // 熔喷：全场重击 + 长时间点燃（burn 不吃圣水，是对治疗队的针对手段）
    case 'eruption': {
      for (const h of aliveHeroes(b)) {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 1.3 * boost, true);
        logHit(b, u, h, bf - (h.hp + h.shield), action, true, b.rng);
        if (h.alive) applyBurn(h, 7, 8);
      }
      b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xd95763 });
      b.events.push({ k: 'shake', amount: 4 });
      log(b, `${name}：岩浆喷了满屋，火要烧上8秒`, 'good');
      u.skillCd = 10 * cdMult;
      break;
    }
    // 收魂：全场中等伤害，残血直接斩杀（对"被打残但被治疗拉回"的队伍收尾）
    // 收魂：全场中等伤害；残血目标伤害拉到必杀量级（走 damage() 让击倒记账/亡爆/日志统一）
    case 'broodcall': {
      let slain = 0;
      for (const h of aliveHeroes(b)) {
        const low = h.hp + h.shield <= h.maxHp * 0.45;
        const bf = h.hp + h.shield;
        if (low) {
          damage(b, u, h, h.hp + h.shield + h.def * 3 + 999, true);
          if (!h.alive) slain++;
        } else {
          damage(b, u, h, u.atk * 0.9 * boost, false);
        }
        logHit(b, u, h, bf - (h.hp + h.shield), action, low, b.rng);
      }
      b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0x9b5de5 });
      log(b, slain ? `${name}：${slain}名残血勇者被直接收走` : `${name}：镰影扫过全场`, 'good');
      u.skillCd = 9 * cdMult;
      break;
    }
    case 'inject': {
      const t = monTarget(b, u);
      if (t) {
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 2.4 * boost, true);
        logHit(b, u, t, bf - (t.hp + t.shield), action, true, b.rng);
        if (t.alive) { t.healCutT = Math.max(t.healCutT, 5); t.healCutPct = 0; }
        log(b, `${name}：${t.name}被注入毒液，5秒内无法被治疗`, 'good');
      }
      u.skillCd = 9 * cdMult;
      break;
    }
    case 'shieldSkill': {
      const amt = Math.round(u.maxHp * 0.25 * boost);
      for (const m of b.rooms[b.roomIndex].mons) if (m.alive) m.shield = Math.max(m.shield, amt);
      log(b, `${name}：本房怪物获得护盾`, 'good');
      u.skillCd = 9 * cdMult;
      break;
    }
    case 'breath': {
      // 骨焰吐息：全体重击 + 点燃
      aliveHeroes(b).forEach((h) => {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 0.95 * boost, true);
        logHit(b, u, h, bf - (h.hp + h.shield), action, true, b.rng);
        if (h.alive) applyBurn(h, 5 * boost, 6);
      });
      b.events.push({ k: 'shake', amount: 4 });
      log(b, `${name}：全体勇者被骨焰灼烧`, 'good');
      u.skillCd = 9 * cdMult;
      break;
    }
    case 'flurry': {
      // 万手连击：随机连打 4 次（每次重新选目标，能把残血的收掉）
      for (let i = 0; i < 4; i++) {
        const hs = aliveHeroes(b);
        if (!hs.length) break;
        const t = hs[Math.floor(b.rng() * hs.length)];
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 0.6 * boost, i === 3);
        logHit(b, u, t, bf - (t.hp + t.shield), action, i === 3, b.rng);
      }
      log(b, `${name}：无数拳头砸进勇者队列`, 'good');
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'necro': {
      // 死灵之握：抽全体勇者的血，回同房兵种
      let drained = 0;
      aliveHeroes(b).forEach((h) => {
        const bf = h.hp + h.shield;
        damage(b, u, h, u.atk * 0.7 * boost, false);
        drained += Math.max(0, bf - (h.hp + h.shield));
        logHit(b, u, h, bf - (h.hp + h.shield), action, false, b.rng);
      });
      const heal = Math.round(drained * 0.5);
      if (heal > 0) {
        for (const m of aliveMons(b)) {
          const bf = m.hp;
          m.hp = Math.min(m.maxHp, m.hp + heal);
          u.healed += m.hp - bf;
          if (m.hp > bf) b.events.push({ k: 'heal', room: b.roomIndex, x: m.x, y: m.y, amt: m.hp - bf, target: m });
        }
      }
      log(b, `${name}：抽取${Math.round(drained)}点生命回馈守军`, 'good');
      u.skillCd = 7 * cdMult;
      break;
    }
    case 'petrify': {
      const t = monTarget(b, u);
      if (t) {
        t.stunT = Math.max(t.stunT, 2);
        const bf = t.hp + t.shield;
        damage(b, u, t, u.atk * 1.1 * boost, true);
        logHit(b, u, t, bf - (t.hp + t.shield), action, true, b.rng);
        log(b, `${name}：${t.name}被石化2秒`, 'good');
      }
      u.skillCd = 6 * cdMult;
      break;
    }
    case 'charm': {
      // 心灵支配：把勇者转成打自己队友（charmT 在 basicAttack 里改目标阵营）
      const hs = aliveHeroes(b).filter((h) => h.charmT <= 0);
      const t = hs.length ? hs[Math.floor(b.rng() * hs.length)] : null;
      if (t) {
        t.charmT = 4;
        b.events.push({ k: 'cast', room: b.roomIndex, x: t.x, y: t.y, color: 0x9b5de5 });
        log(b, `${name}：${t.name}被支配，转身攻击队友`, 'good');
      }
      u.skillCd = 8 * cdMult;
      break;
    }
    case 'hex': {
      const dps = 3.4 * boost * (u.eff?.passive === 'spore' && u.lv >= 5 ? 1.3 : 1) * (room.theme === 'poison' ? 1.25 : 1);
      aliveHeroes(b).forEach((h) => { applyPoison(b, h, dps, 5); h.silenced = true; });
      b.events.push({ k: 'poison', room: b.roomIndex, x: 200, y: 0 });
      log(b, `${name}：全体中毒并被沉默一次`, 'good');
      u.skillCd = 7 * cdMult;
      break;
    }
  }
  if (venom && before) {
    const dps = venom * (eff?.passive === 'spore' && u.lv >= 5 ? 1.3 : 1);
    // 无伤害类技能（减速/咕咒）没有血量差，改为全体上毒，否则词缀对它们彻底失效
    const noDamage = eff?.skill === 'slow' || eff?.skill === 'hex' || eff?.skill === 'alt';
    let any = false;
    b.heroes.forEach((h, i) => {
      if (!h.alive) return;
      if (noDamage || h.hp + h.shield < before[i]) { applyPoison(b, h, dps, 5); any = true; }
    });
    if (any) log(b, `淬毒：${u.name}的技能附带毒素`, 'good');
  }
}

// 疫喙/巨针会压住勇者受到的治疗；所有治疗勇者的写法都过这个闸
function healHero(b        , src      , t      , amt        ) {
  const cut = t.healCutT > 0 ? t.healCutPct : 1;
  const real = Math.max(0, Math.round(amt * cut));
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + real);
  const got = Math.round(t.hp - before);   // hp 会被 dt 型伤害带上小数，日志里必须取整
  src.healed += got;
  if (got > 0) b.events.push({ k: 'heal', room: b.roomIndex, x: t.x, y: t.y, amt: got, target: t });
  return { got, blocked: cut < 1 };
}

function heroSkill(b        , u      ) {
  const room = b.rooms[b.roomIndex];
  const skillLines = {
    cleric: '治愈术！', mage: '火球术！', knight: '重斩！', captain: '圣裁！', archer: '穿云箭！',
    rogue: '背刺！', paladin: '护佑！', berserker: '血怒斩！', ranger: '猎标！', bard: '战歌！',
    inquisitor: '审判！', swordmaster: '连斩！',
  };
  if (!u.silenced) speak(b, u, skillLines[u.kind] ?? '技能！');
  if (u.kind === 'cleric') {
    if (u.silenced) {
      u.silenced = false;
      u.skillCd = 5;
      log(b, `沉默符生效：牧师首次治疗失效`, 'good');
      return;
    }
    // 狂战士拒绝治疗（设定：越痛越强），所以从治疗候选里排除
    const t = lowest(b.heroes.filter((h) => h.kind !== 'berserker'));
    if (t) {
      const amt = Math.round(14 * HERO_LV_MULT(u.lv) * mirrorMult(b));
      const r = healHero(b, u, t, amt);
      if (r.blocked) log(b, `${t.name}的伤口被毒素侵蚀，治疗只回了${r.got}`, 'good');
      else if (r.got < amt * 0.4) log(b, `牧师治疗过量：${t.name}仅回复${r.got}`, 'bad');
      else log(b, `牧师治疗${t.name} +${r.got}`, 'bad');
    }
    u.skillCd = 5;
    return;
  }
  if (u.kind === 'mage') {
    if (u.silenced) {
      u.silenced = false;
      u.skillCd = 6;
      log(b, `沉默符生效：法师首次法术失效`, 'good');
      return;
    }
    b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xd95763 });
    aliveMons(b).forEach((m) => {
      const bf = m.hp + m.shield;
      damage(b, u, m, u.atk * 1.1 * b.moraleMult * mirrorMult(b), true);
      logHit(b, u, m, bf - (m.hp + m.shield), '使用火球术', true, b.rng);
    });
    log(b, mirrorMult(b) < 1 ? `镜厅削弱了法师的火球` : `法师火球轰击全房怪物`, 'bad');
    u.skillCd = 6;
    return;
  }
  if (u.kind === 'knight' || u.kind === 'captain') {
    const t = heroTarget(b, u);
    if (t) {
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.6 * b.moraleMult, true);
      logHit(b, u, t, bf - (t.hp + t.shield), u.kind === 'captain' ? '使用圣裁' : '使用重斩', true, b.rng);
    }
    u.skillCd = u.kind === 'captain' ? 4 : 7;
    return;
  }
  if (u.kind === 'archer') {
    const mons = aliveMons(b);
    const t = mons.find((mm) => mm.row === 1) || mons[0];
    if (t) {
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.5 * b.moraleMult, false, 0.5);
      logHit(b, u, t, bf - (t.hp + t.shield), '使用穿云箭', false, b.rng);
      log(b, `弓手瞄准后排${t.name}`, 'bad');
    }
    u.skillCd = 6;
    return;
  }
  if (u.kind === 'rogue') {
    const t = heroTarget(b, u);
    if (t) {
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.3 * b.moraleMult, false);
      logHit(b, u, t, bf - (t.hp + t.shield), '使用背刺', false, b.rng);
    }
    u.skillCd = 5;
    return;
  }
  if (u.kind === 'paladin') {
    // 护佑：本房全体勇者接下来 8 秒受伤转 30% 给圣骑士自己
    b.heroes.forEach((h) => { if (h.alive) h.guardT = Math.max(h.guardT, 8); });
    b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xe6b84a });
    log(b, `圣骑士张开护佑：全队伤害由他分摊`, 'bad');
    u.skillCd = 9;
    return;
  }
  if (u.kind === 'berserker') {
    // 血怒斩：自伤换一次重击，血越少越痛
    const t = heroTarget(b, u);
    const self = Math.max(1, Math.round(u.maxHp * 0.08));
    u.hp = Math.max(1, u.hp - self);
    u.flashT = 0.12;
    if (t) {
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.9 * b.moraleMult, true);
      logHit(b, u, t, bf - (t.hp + t.shield), '使用血怒斩', true, b.rng);
    }
    log(b, `狂战士自伤${self}换出血怒斩`, 'bad');
    u.skillCd = 6;
    return;
  }
  if (u.kind === 'ranger') {
    // 猎标：优先钉后排，被标记的怪物受伤 +25%
    const mons = aliveMons(b);
    const t = mons.find((mm) => mm.row === 1) || mons[0];
    if (t) {
      t.marked = 1.25;
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.35 * b.moraleMult, false, 0.35);
      logHit(b, u, t, bf - (t.hp + t.shield), '使用猎标', false, b.rng);
      log(b, `游侠标记${t.name}：受到伤害提升`, 'bad');
    }
    u.skillCd = 6;
    return;
  }
  if (u.kind === 'bard') {
    if (u.silenced) {
      u.silenced = false;
      u.skillCd = 6;
      log(b, `沉默符生效：诗人的第一段曲子哑了`, 'good');
      return;
    }
    b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0x9b5de5 });
    if (u.phase === 0) {
      b.heroes.forEach((h) => { if (h.alive) h.hasteAmt += 0.18; });
      log(b, `战歌：勇者全队攻速提升`, 'bad');
      u.phase = 1;
    } else {
      let cured = 0;
      b.heroes.forEach((h) => { if (h.alive && h.poisonT > 0) { h.poisonT = 0; h.poisonDps = 0; cured++; } });
      log(b, cured ? `净化曲：${cured}名勇者的毒被洗掉` : `净化曲：无毒可解，士气略振`, 'bad');
      if (!cured) b.heroes.forEach((h) => { if (h.alive) h.shield += 8; });
      u.phase = 0;
    }
    u.skillCd = 6;
    return;
  }
  if (u.kind === 'inquisitor') {
    const t = heroTarget(b, u);
    if (t) {
      const bf = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.5 * b.moraleMult, true);
      logHit(b, u, t, bf - (t.hp + t.shield), '使用审判', true, b.rng);
    }
    u.skillCd = 5;
    return;
  }
  if (u.kind === 'swordmaster') {
    // 连斩：25% 阶段后必定破防
    const t = heroTarget(b, u);
    const pierce = u.phase >= 2 ? 1 : 0.3;
    if (t) {
      const bf1 = t.hp + t.shield;
      damage(b, u, t, u.atk * 1.3 * b.moraleMult, true, pierce);
      const dealt1 = bf1 - (t.hp + t.shield);
      if (dealt1 > 0) logHit(b, u, t, dealt1, '使用连斩', true, b.rng);
      if (u.phase >= 1 && t.alive) {
        const bf2 = t.hp + t.shield;
        damage(b, u, t, u.atk * 0.9 * b.moraleMult, false, pierce);
        logHit(b, u, t, bf2 - (t.hp + t.shield), '追加一斩', false, b.rng);
      }
    }
    u.skillCd = 4;
    return;
  }
  void room;
}

function triggerTrap(b        ) {
  const room = b.rooms[b.roomIndex];
  if (room.trap === 'none' || room.trapUsed || room.trapDisarmed) return;
  room.trapUsed = true;
  const first = aliveHeroes(b)[0];
  b.events.push({ k: 'trap', room: b.roomIndex, x: first ? first.x : 200, y: 0, kind: room.trap });
  b.events.push({ k: 'shake', amount: 3 });
  const syn = !!room.synergy;
  // 沼室主题额外放大所有陷阱（和 trapPower 相乘，不是替换）
  const pw = b.trapPower * (room.theme === 'mire' ? 1.3 : 1);
  if (room.trap === 'spike' && first) {
    if (syn) {
      // 骨刺共鸣：骨堆里的尖刺连成一片，全队都要踩过去
      for (const h of aliveHeroes(b)) {
        const amt = (28 + h.def * 0.6) * pw * (h === first ? 1.9 : 0.85);
        damage(b, { ...h, name: '骨刺', side: 'mon' }        , h, amt, h === first);
      }
      first.stunT = Math.max(first.stunT, 2.5);
      log(b, `骨刺共鸣：全队踩进骨刺，${first.name} 被钉住`, 'good');
    } else {
      damage(b, { ...first, name: '尖刺', side: 'mon' }        , first, (28 + first.def * 0.6) * pw, true);
      log(b, `尖刺触发：${first.name} 受到爆发伤害`, 'good');
    }
  } else if (room.trap === 'slime') {
    const dur = 6 * pw * (syn ? 2 : 1);
    aliveHeroes(b).forEach((h) => {
      h.slowT = dur; h.slowAmt = 0.3;
      if (syn) applyPoison(b, h, 4 * pw, 5);   // 毒沼共鸣
    });
    log(b, syn ? `毒沼共鸣：黏液带毒，减速时长翻倍` : `黏液陷阱：勇者全队攻速-30%`, 'good');
  } else if (room.trap === 'rune') {
    aliveHeroes(b).forEach((h) => (h.silenced = true));
    if (syn) {
      room.spellLock = 9;
      aliveHeroes(b).forEach((h) => { h.skillCd = Math.max(h.skillCd, 9); });
      log(b, `禁咒共鸣：本房法术被封禁 9 秒`, 'good');
    } else log(b, `沉默符已就位：勇者首次治疗/法术将失效`, 'good');
  } else if (room.trap === 'blade') {
    const hs = aliveHeroes(b);
    const boost = syn ? 1.4 : 1;
    let low = hs[0];
    for (const h of hs) if (h.hp / h.maxHp < low.hp / low.maxHp) low = h;
    for (const h of hs) {
      const amt = 14 * pw * boost * (h === low ? 2 : 1);
      damage(b, { ...h, name: '摆刃', side: 'mon' }        , h, amt, h === low);
      if (syn && h.alive) applyBurn(h, 4 * pw, 4);   // 赤刃共鸣
    }
    log(b, syn ? `赤刃共鸣：烧红的摆刃扫过全队` : `摆刃扫过：全队受伤，最虚弱者受双倍`, 'good');
  } else if (room.trap === 'net') {
    const hs = aliveHeroes(b);
    // 常态只缚后两名（前排还能打，是"拖时间"而不是"清场"）；陷淖共鸣缚全队
    const targets = syn ? hs : hs.slice(-2);
    const dur = (syn ? 6 : 4) * pw;
    for (const h of targets) h.stunT = Math.max(h.stunT, dur);
    log(b, syn ? `陷淖共鸣：全队被绳网拖入泥沼` : `绳网收紧：后队 ${targets.length} 人被缚住`, 'good');
  } else if (room.trap === 'mirror') {
    room.reflectLeft = syn ? 6 : 3;
    room.reflectPct = (syn ? 0.6 : 0.4) * Math.min(1.6, pw);
    log(b, syn ? `重影共鸣：镜面重叠，六次伤害将被折回` : `映照阵展开：勇者接下来的伤害会被折回`, 'good');
  }
}

function captainPhases(b        , u      ) {
  const r = u.hp / u.maxHp;
  if (u.phase === 0 && r <= 0.5) {
    u.phase = 1;
    const room = b.rooms[b.roomIndex];
    if (room.trap !== 'none' && !room.trapUsed) {
      room.trapDisarmed = true;
      room.trapUsed = true;
      b.events.push({ k: 'disarm', room: b.roomIndex, x: 250, y: 0 });
      log(b, `勇者队长击碎了本房陷阱`, 'bad');
    }
    b.events.push({ k: 'shake', amount: 4 });
  } else if (u.phase === 1 && r <= 0.25) {
    u.phase = 2;
    aliveHeroes(b).forEach((h) => (h.hasteAmt += 0.25));
    log(b, `勇者队长鼓舞全队：攻速提升`, 'bad');
    b.events.push({ k: 'shake', amount: 4 });
  }
}

// 审判官：靠沉默与灼烧压制地牢的持续能力
function inquisitorPhases(b        , u      ) {
  const r = u.hp / u.maxHp;
  if (u.phase === 0 && r <= 0.5) {
    u.phase = 1;
    aliveMons(b).forEach((m) => { m.silenced = true; m.skillCd = Math.max(m.skillCd, 3); });
    b.heroes.forEach((h) => { if (h.alive) { h.poisonT = 0; h.poisonDps = 0; h.burnT = 0; } });
    b.events.push({ k: 'cast', room: b.roomIndex, x: u.x, y: u.y, color: 0xf4f0e4 });
    b.events.push({ k: 'shake', amount: 4 });
    log(b, `审判官宣读圣言：全房怪物被沉默，勇者身上的毒被净化`, 'bad');
  } else if (u.phase === 1 && r <= 0.25) {
    u.phase = 2;
    aliveMons(b).forEach((m) => applyBurn(m, 6, 12));
    b.events.push({ k: 'shake', amount: 4 });
    log(b, `审判官点燃香炉：全房怪物持续灼烧`, 'bad');
  }
}

// 剑圣：纯输出型首领，阶段推进直接改写它的普攻与技能
function swordmasterPhases(b        , u      ) {
  const r = u.hp / u.maxHp;
  if (u.phase === 0 && r <= 0.5) {
    u.phase = 1;
    u.hasteAmt += 0.2;
    b.events.push({ k: 'shake', amount: 4 });
    log(b, `剑圣拔出第二段架势：每次挥击追加一斩`, 'bad');
  } else if (u.phase === 1 && r <= 0.25) {
    u.phase = 2;
    u.hasteAmt += 0.25;
    b.events.push({ k: 'shake', amount: 5 });
    log(b, `剑圣入无形之势：攻击无视防御`, 'bad');
  }
}

export function stepBattle(b        , dt        ) {
  if (b.phase === 'done') return;
  b.time += dt;

  const forgeRoom = b.rooms[b.roomIndex]?.theme === 'forge';
  const tickStatus = (u      ) => {
    if (!u.alive) { u.deadT += dt; return; }
    // 熔炉炙烤：本房双方持续掉血。守方也吃，所以熔炉是"抢速度"的房间而不是白拿加成
    if (forgeRoom && u.room === b.roomIndex && b.phase !== 'enter') {
      u.hp -= 1 * dt;
      if (u.hp <= 0) {
        u.alive = false; u.hp = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: u.x, y: u.y, side: u.side });
        log(b, `${u.name} 在熔炉的高温里倒下`, u.side === 'hero' ? 'good' : 'bad');
        deathBurst(b, u);
        return;
      }
    }
    if (u.slowT > 0) u.slowT -= dt;
    if (u.stunT > 0) u.stunT -= dt;
    if (u.guardT > 0) u.guardT -= dt;
    if (u.charmT > 0) u.charmT -= dt;
    if (u.healCutT > 0) { u.healCutT -= dt; if (u.healCutT <= 0) u.healCutPct = 1; }
    if (u.barbT > 0) u.barbT -= dt;
    if (u.rallyT > 0) u.rallyT -= dt;
    if (u.flashT > 0) u.flashT -= dt;
    if (u.lungeT > 0) u.lungeT -= dt;
    if (u.poisonT > 0) {
      u.poisonT -= dt;
      // 疫源（疫囊体）：本房只要有携带者活着，勇者身上的毒更烈
      const plague = u.side === 'hero' && b.rooms[u.room]?.mons.some((m) => m.alive && m.eff?.passive === 'plagueCore' && m.lv >= 5) ? 2 : 0;
      u.hp -= (u.poisonDps + plague) * dt;
      if (u.hp <= 0) {
        u.alive = false; u.hp = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: u.x, y: u.y, side: u.side });
        log(b, `${u.name} 因中毒倒下`, u.side === 'hero' ? 'good' : 'bad');
        deathBurst(b, u);
      }
    }
    if (u.burnT > 0) {
      u.burnT -= dt;
      u.hp -= u.burnDps * dt;
      if (u.hp <= 0) {
        u.alive = false; u.hp = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: u.x, y: u.y, side: u.side });
        log(b, `${u.name} 被烧倒了`, u.side === 'hero' ? 'good' : 'bad');
        deathBurst(b, u);
      }
    }
    // 生息/回复：只作用于怪物，且不超过上限
    let rg = u.side === 'mon' ? ((u.eff?.hpRegen ?? 0) + (u.eff?.passive === 'regen' && u.lv >= 5 ? 4 : 0)
      + (u.eff?.passive === 'coreBrood' && u.lv >= 5 ? 5 : 0)) : 0;
    // 子嗣潮涌（统领光环）：同房兵种持续回血
    if (u.side === 'mon' && !u.legend && auraOf(b, u) === 'brood') rg += 3 * auraPow(b, u.room);
    if (rg > 0 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + rg * dt);
    // 瘟疫什一（统领光环）：本房勇者持续中毒且受治疗大打折扣
    if (u.side === 'hero' && u.room === b.roomIndex && b.phase === 'fight'
        && roomAura(b, b.roomIndex) === 'tithe') {
      const pw = auraPow(b, b.roomIndex);
      u.hp -= 3 * pw * dt;
      u.healCutT = Math.max(u.healCutT, 1);
      u.healCutPct = Math.min(u.healCutPct, 0.65);
      if (u.hp <= 0) {
        u.alive = false; u.hp = 0;
        b.events.push({ k: 'die', room: b.roomIndex, x: u.x, y: u.y, side: u.side });
        const rm = b.rooms[b.roomIndex]; if (rm) rm.heroKills++;
        log(b, `${u.name} 在瘟疫里烂掉了`, 'good');
        deathBurst(b, u);
        return;
      }
    }
  };
  b.heroes.forEach(tickStatus);
  b.rooms[b.roomIndex].mons.forEach(tickStatus);

  if (b.phase === 'enter') {
    b.phaseT += dt;
    const p = Math.min(1, b.phaseT / 1.2);
    b.heroes.forEach((h) => { if (h.alive) h.x = Math.round(h.homeX - 260 * (1 - p)); });
    b.heroes.forEach((h) => { if (h.alive && h.disarmT > 0) h.disarmT -= dt; });
    if (b.phaseT >= 1.2) { b.phase = 'fight'; b.phaseT = 0; }
    return;
  }

  if (b.phase === 'fight') {
    b.phaseT += dt;
    b.roomTimer -= dt;
    const room = b.rooms[b.roomIndex];

    if (room.spellLock > 0) room.spellLock -= dt;
    if (room.trapArm > 0) {
      room.trapArm -= dt;
      if (room.trapArm <= 0) triggerTrap(b);
    }

    for (const h of b.heroes) {
      if (!h.alive || h.room !== b.roomIndex) continue;
      if (h.disarmT > 0) {
        h.disarmT -= dt;
        if (h.disarmT <= 0 && !room.trapUsed && room.trap !== 'none') {
          room.trapDisarmed = true;
          room.trapUsed = true;
          b.events.push({ k: 'disarm', room: b.roomIndex, x: h.x, y: h.y });
          log(b, `盗贼拆除了${TRAPS[room.trap].name}`, 'bad');
        }
        continue;
      }
      if (h.stunT > 0) continue;
      if (h.kind === 'captain') captainPhases(b, h);
      else if (h.kind === 'inquisitor') inquisitorPhases(b, h);
      else if (h.kind === 'swordmaster') swordmasterPhases(b, h);
      // 眼魔凝视光环：勇者技能冷却推进变慢
      h.skillCd -= dt * (roomAura(b, b.roomIndex) === 'gaze' ? Math.max(0.4, 1 - 0.25 * auraPow(b, b.roomIndex)) : 1);
      // 禁咒共鸣期间技能整体压住（冷却照走，锁一解就会连放，是刻意的节奏）
      if (h.skillCd <= 0 && room.spellLock <= 0) { heroSkill(b, h); continue; }
      h.cd -= dt;
      if (h.cd <= 0) { basicAttack(b, h); h.cd = interval(h, b); }
    }
    for (const m of room.mons) {
      if (!m.alive) continue;
      if (m.stunT > 0) continue;
      m.skillCd -= dt;
      if (m.skillCd <= 0) { monSkill(b, m); continue; }
      m.cd -= dt;
      if (m.cd <= 0) { basicAttack(b, m); m.cd = interval(m, b); }
    }

    if (!aliveHeroes(b).length) { finish(b); return; }
    if (!aliveMons(b).length) {
      room.breachReason = room.mons.length ? '守军全灭' : '无人驻守';
      breach(b);
      return;
    }
    if (b.roomTimer <= 0) {
      room.breachReason = '战斗超时（勇者士气下降）';
      b.moraleMult *= 0.9;
      log(b, `第${b.roomIndex + 1}房超时：勇者攻击-10%`, 'good');
      breach(b);
      return;
    }
    return;
  }

  if (b.phase === 'break') {
    b.phaseT += dt;
    const room = b.rooms[b.roomIndex];
    room.doorShake = b.phaseT < 0.3 ? 2 : 0;
    if (b.phaseT >= 0.65) {
      if (b.roomIndex >= b.rooms.length - 1) { b.phase = 'throne'; b.phaseT = 0; b.throneIdx = 0; }
      else { b.phase = 'march'; b.phaseT = 0; }
    }
    return;
  }

  if (b.phase === 'march') {
    b.phaseT += dt;
    if (b.phaseT >= 0.45) { b.roomIndex++; enterRoom(b); }
    return;
  }

  if (b.phase === 'throne') {
    b.phaseT += dt;
    const survivors = aliveHeroes(b);
    const strikes = survivors.length;
    if (b.throneIdx < strikes) {
      if (b.phaseT >= 0.55) {
        b.phaseT = 0;
        b.throneIdx++;
        b.seal = Math.max(0, b.seal - 25);
        b.events.push({ k: 'throne', dmg: 25 });
        b.events.push({ k: 'shake', amount: 4 });
        log(b, `王座封印受击 -25（剩余${b.seal}）`, 'bad');
        if (b.seal <= 0) { finish(b); return; }
      }
      return;
    }
    finish(b);
    return;
  }
}

function breach(b        ) {
  const room = b.rooms[b.roomIndex];
  room.broken = true;
  room.breachTime = b.time;
  b.events.push({ k: 'break', room: b.roomIndex });
  b.events.push({ k: 'shake', amount: 3 });
  log(b, `第${b.roomIndex + 1}房失守：${room.breachReason}（${b.time.toFixed(1)}s）`, 'bad');
  const speaker = room.mons.find((m) => m.alive) ?? room.mons[0];
  if (speaker) log(b, `　${speaker.name}：${BREACH_LINES[Math.floor(b.rng() * BREACH_LINES.length)]}`, 'bad');
  b.phase = 'break';
  b.phaseT = 0;
}

function finish(b        ) {
  b.phase = 'done';
  const total = b.heroes.length;
  const kills = b.heroes.filter((h) => !h.alive).length;
  // 一个勇者都没击倒＝地牢完败（堆封印而不布防的漏洞堵子）
  if (kills === 0) b.seal = 0;
  const win = b.seal > 0;
  const seal = Math.round((b.seal / b.sealMax) * 100);
  const skulls = !win ? 0 : seal >= 75 ? 3 : seal >= 25 ? 2 : 1;
  const roomsHeld = b.rooms.filter((r) => !r.broken).length;
  const killBone = kills * Math.round(8 + b.raid.no * 1.5);
  // 上弦（钟表胎）：战后存活的怪物额外产骨币
  let boneEcho = 0;
  for (const r of b.rooms) for (const m of r.mons) if (m.alive) boneEcho += m.eff?.boneEcho ?? 0;
  const bone = (win ? killBone + b.raid.reward.bone : Math.round(killBone * 0.5) + 15) + boneEcho;
  // 余晶（晶簇胎满级 / DIY 余晶能力）：战后存活的怪物额外产魔质
  let echo = 0;
  for (const r of b.rooms) {
    for (const m of r.mons) {
      if (!m.alive) continue;
      echo += m.eff?.manaEcho ?? 0;
      if (m.eff?.passive === 'crystal' && m.lv >= 5) echo += 5;
    }
  }
  const mana = (win ? b.raid.reward.mana : Math.max(2, Math.round(b.raid.reward.mana * 0.25))) + echo;
  const xpMap = new Map                ();
  const champXp = new Map                                                      ();
  for (const r of b.rooms) {
    for (const m of r.mons) {
      const gain = Math.round(10 + m.dmgDealt * 0.12 + (win ? 8 : 0));
      if (m.champUid) {
        const cur = champXp.get(m.champUid) ?? { xp: 0, kills: 0, fell: false };
        // 统领经验按房间战果给：站着挨打也算历练，但主要来自输出
        cur.xp += Math.round(gain * 1.35) + (m.alive ? 6 : 0);
        cur.kills += r.heroKills;
        if (!m.alive) cur.fell = true;
        champXp.set(m.champUid, cur);
      } else if (m.monsterUid) {
        xpMap.set(m.monsterUid, (xpMap.get(m.monsterUid) || 0) + gain);
      }
    }
  }
  const champStats = new Map();
  for (const r of b.rooms) {
    for (const m of r.mons) {
      if (!m.champUid) continue;
      champStats.set(m.champUid, {
        attacks: m.__battleAttacks ?? 0,
        dmgDealt: Math.round(m.dmgDealt),
        thornDmg: Math.round(m.__battleThornDmg ?? 0),
        healDone: Math.round(m.healed),
        revives: m.__battleRevives ?? 0,
        soulAtk: m.__soulAtk ?? 0,
      });
    }
  }

  let firstCause = '地牢守住了防线';
  if (!win) {
    if (kills === 0) firstCause = '全队勇者毫无损伤地走到王座：地牢得先有守军';
    const firstBroken = b.rooms.find((r) => r.broken);
    if (firstBroken && kills > 0) firstCause = `第${firstBroken.index + 1}房最先失守：${firstBroken.breachReason}`;
    const badLine = b.log.find((l) => l.tone === 'bad' && /击倒|拆除|治疗/.test(l.text));
    if (badLine) firstCause += ` · ${badLine.text}`;
  }
  if (echo > 0) log(b, `余晶：存活的缝合体额外析出${echo}魔质`, 'good');
  const allUnits = [...b.heroes, ...b.rooms.flatMap((room) => room.mons)];
  const topDamage = [...allUnits].sort((a, z) => z.dmgDealt - a.dmgDealt)[0];
  const firstBroken = b.rooms.find((room) => room.broken);
  const review = [
    win
      ? `守军最终保住了${roomsHeld}间房，王座封印剩余${seal}%，勇者队伍有${kills}/${total}人倒下。`
      : `勇者突破了${b.rooms.filter((room) => room.broken).length}间房，王座封印归零；守军击倒${kills}/${total}名勇者。`,
    topDamage
      ? `本场最高输出是${topDamage.name}，累计造成${Math.round(topDamage.dmgDealt)}点伤害。`
      : '本场没有形成有效伤害记录。',
    firstBroken
      ? `最早出现缺口的是第${firstBroken.index + 1}房，原因是“${firstBroken.breachReason}”，发生在${firstBroken.breachTime.toFixed(1)}秒。`
      : '四道房门均未被突破，布防节奏完整。',
    kills === 0
      ? '改进建议：至少安排一支能稳定造成伤害的守军，单靠封印无法获得胜利。'
      : !win
        ? '改进建议：把高耐久单位前移，并让控制、治疗或光环覆盖最早失守的房间。'
        : seal < 35
          ? '改进建议：本次虽胜但封印已接近极限，可加强后两房的持续作战能力。'
          : '战术结论：当前布防能形成连续消耗，建议保留核心组合并针对下一批勇者词缀微调。',
  ];
  // 战利品：从被击倒的勇者身上剥下来的东西，用他们的等级决定档次
  const fallen = b.heroes.filter((h) => !h.alive);
  const maxLv = fallen.reduce((m, h) => Math.max(m, h.lv), 0);
  const loot = rollLoot(kills, maxLv, b.rng);
  for (const id of loot) log(b, `缴获：${gearById(id)?.name ?? id}`, 'good');
  b.result = {
    win, kills, total, seal, skulls, roomsHeld, bone, mana, loot,
    xp: [...xpMap.entries()].map(([uid, xp]) => ({ uid, xp })),
    champXp: [...champXp.entries()].map(([uid, v]) => ({ uid, xp: v.xp, kills: v.kills, fell: v.fell })),
    champStats: [...champStats.entries()].map(([uid, v]) => ({ uid, ...v })),
    firstCause, review,
  };
  log(b, win ? `守住地牢！封印剩余${seal}` : `封印被击破，勇者攻入王座`, win ? 'good' : 'bad');
}

export function affixText(ids           ) {
  return ids.map((a) => `${AFFIXES[a].name}（${AFFIXES[a].desc}）`).join('，');
}
