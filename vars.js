// 变量系统：剧情用 JSON 可序列化的「效果/条件」DSL 读写游戏数据。
// 这一层不认识 pixi 也不认识存档结构 —— 全部通过 StoryBridge 落地，
// 所以既能给本地规则剧情用，也能直接喂给未来的 LLM（它只需产出这些 JSON）。

                                               
                                                                         

// 条件：统一走「读取路径 + 比较」，路径见 READ_PATHS
                                                             

// 战斗修正：挂在存档上，按袭击轮次倒计时，createBattle 时喂进去
                   
             
               
                                                
                     
                      
                     
                      
                       
                   
                    
                        
  

                    
                                              
                                                         
                                               
                                                                                    
                                                      
                                                                                                       
                                                              
                          
                                                                   
                                                     

// 剧情能读到的全部游戏数据路径（LLM 提示词里也用这份清单）
export const READ_PATHS = [
  'bone', 'mana', 'raidNo', 'overtime', 'monsters', 'maxLv', 'sumLv', 'customs',
  'traps', 'themes', 'sealLv', 'trapLv', 'sealMax', 'trapPower', 'rooms.filled',
  'parts', 'affixes', 'mods', 'reports', 'wins', 'losses', 'budget',
  // 另外支持 var.<键> 读剧情变量，has.<解锁物> 判断是否已解锁
]         ;

                           
                            
                                           
                                       
                                       
                                                                        
                                                                                                             
                                                                                 
                                                      
                                                                    
                       
                                                      
                                                                           
  

function num(v        )         {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function testCond(b             , c      )          {
  const left = b.get(c.path);
  switch (c.cmp) {
    case '==': return String(left) === String(c.value);
    case '!=': return String(left) !== String(c.value);
    case '>=': return num(left) >= num(c.value);
    case '<=': return num(left) <= num(c.value);
    case '>': return num(left) > num(c.value);
    case '<': return num(left) < num(c.value);
    case 'has': return num(b.get(`has.${String(c.value)}`)) === 1;
    case '!has': return num(b.get(`has.${String(c.value)}`)) === 0;
  }
}

export function testConds(b             , list                    )          {
  return !list || list.every((c) => testCond(b, c));
}

// 结算一串效果，返回给玩家看的结果行（空数组＝什么都没变）
export function applyEffects(b             , list                      )           {
  const out           = [];
  if (!list) return out;
  for (const e of list) {
    switch (e.t) {
      case 'res': {
        const bone = Math.round(e.bone ?? 0), mana = Math.round(e.mana ?? 0);
        if (!bone && !mana) break;
        b.addRes(bone, mana);
        const parts           = [];
        if (bone) parts.push(`${bone > 0 ? '+' : ''}${bone} 骨币`);
        if (mana) parts.push(`${mana > 0 ? '+' : ''}${mana} 魔质`);
        out.push(parts.join('，'));
        break;
      }
      case 'var': {
        if (e.add != null) { b.addVar(e.key, e.add); out.push(`【${e.key}】${e.add > 0 ? '+' : ''}${e.add}`); }
        else if (e.set != null) { b.setVar(e.key, e.set); out.push(`【${e.key}】= ${e.set}`); }
        break;
      }
      case 'monster': {
        const r = b.grantMonster(e.kind, Math.max(1, Math.min(5, e.lv ?? 1)));
        if (r.text) out.push(r.text);
        break;
      }
      case 'levelup': {
        const r = b.levelMonster(e.sel ?? 'random', e.add);
        if (r.text) out.push(r.text);
        break;
      }
      case 'lose': {
        const r = b.loseMonster(e.sel ?? 'weakest');
        if (r.text) out.push(r.text);
        break;
      }
      case 'unlock': {
        const r = b.unlock(e.what);
        if (r.text) out.push(r.text);
        break;
      }
      case 'dev': {
        const r = b.addDev(e.seal ?? 0, e.trap ?? 0);
        if (r.text) out.push(r.text);
        break;
      }
      case 'mod': {
        b.addMod(e.mod);
        out.push(`战场变化：${e.mod.name}（${e.mod.raids < 0 ? '永久' : `${e.mod.raids}轮`}）`);
        break;
      }
      case 'raid': {
        const r = b.shiftRaid(e.add);
        if (r.text) out.push(r.text);
        break;
      }
      case 'xp': {
        const r = b.addXp(e.sel ?? 'all', e.add);
        if (r.text) out.push(r.text);
        break;
      }
    }
  }
  return out;
}

// 把一段修正折叠成 createBattle 需要的乘数（多条同时生效则相乘/相加）
export function foldMods(mods       ) {
  const o = {
    monHpMult: 1, monAtkMult: 1, monSpdAdd: 0,
    heroHpMult: 1, heroAtkMult: 1, sealAdd: 0, trapMult: 1, roomLimitAdd: 0,
  };
  for (const m of mods) {
    o.monHpMult *= m.monHpMult ?? 1;
    o.monAtkMult *= m.monAtkMult ?? 1;
    o.monSpdAdd += m.monSpdAdd ?? 0;
    o.heroHpMult *= m.heroHpMult ?? 1;
    o.heroAtkMult *= m.heroAtkMult ?? 1;
    o.sealAdd += m.sealAdd ?? 0;
    o.trapMult *= m.trapMult ?? 1;
    o.roomLimitAdd += m.roomLimitAdd ?? 0;
  }
  return o;
}

export function modSummary(m     )         {
  const p           = [];
  const pct = (v        ) => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
  if (m.monHpMult) p.push(`怪物生命${pct(m.monHpMult)}`);
  if (m.monAtkMult) p.push(`怪物攻击${pct(m.monAtkMult)}`);
  if (m.monSpdAdd) p.push(`怪物攻速${m.monSpdAdd > 0 ? '+' : ''}${m.monSpdAdd.toFixed(2)}`);
  if (m.heroHpMult) p.push(`勇者生命${pct(m.heroHpMult)}`);
  if (m.heroAtkMult) p.push(`勇者攻击${pct(m.heroAtkMult)}`);
  if (m.sealAdd) p.push(`封印${m.sealAdd > 0 ? '+' : ''}${m.sealAdd}`);
  if (m.trapMult) p.push(`陷阱${pct(m.trapMult)}`);
  if (m.roomLimitAdd) p.push(`房间限时${m.roomLimitAdd > 0 ? '+' : ''}${m.roomLimitAdd}s`);
  return p.join('，') || '无直接战斗影响';
}
