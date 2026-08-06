// 剧情（秘闻）：自由事件流，不再有章节。
// 一个「场景」= 一段文字 + 若干选项/自由输入，每个出口挂 Effect[]（写入游戏数据）与 Cond[]（准入条件）。
// 场景由 SceneProvider 供给：本地规则池是默认实现，后续接 LLM 只需再实现一个 provider ——
// 它拿到 StorySnapshot（游戏当前状态 + 剧情变量），产出同样结构的 Scene JSON 即可。

                                                                   
import { applyEffects, testConds } from './vars.js';

                           
                
                                   
                                   
                                      
                     
                                                 
  

                         
                 
                
                     
                
  

                         
                 
                      
              
                                        
                     
                                                                 
  

                     
             
               
                                                        
                  
                                  
                                              
                
                          
                    
  

                             
                                                     
                                          
                                                
  

                             
             
               
                                                                                                         
  

// ---------- 文本插值 ----------
export function fillText(s        , b             )         {
  return s.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_m, path        ) => {
    const v = b.get(path);
    return v === '' || v == null ? '？' : String(v);
  });
}

// ---------- 本地场景池 ----------
// 都是短事件（1–2 幕），条件写得宽松，让任何存档状态都有得抽。
export const SCENES          = [
  {
    id: 'name-lair',
    once: true,
    weight: 3,
    who: '记账兵',
    text: '一个被队伍丢下的辅助兵蹲在门口记账。他抬头问：“大人，这地方总得有个名号吧？勇者进门前会先读到它。”',
    input: {
      prompt: '给地牢起个名号', placeholder: '例如：不归洞', max: 10, store: 'lairName',
      rules: [
        { keys: ['不归', '无回', '别回', '回'], reply: '“{var.lairName}。”\n名字传出去，公会把派单价涨了三成——勇者开始为你的名字要加班费。来的人更肥，也更硬。',
          effects: [{ t: 'res', mana: 8 }, { t: 'mod', mod: { id: 'fame-doom', name: '恶名在外', raids: 3, heroHpMult: 1.08, heroAtkMult: 1.05 } }, { t: 'var', key: 'fame', add: 2 }] },
        { keys: ['家', '窝', '宅', '客栈', '旅店', '温'], reply: '“{var.lairName}。”\n商队把它当落脚点，卸下一批便宜骨料。勇者也放松了警惕。',
          effects: [{ t: 'res', bone: 60 }, { t: 'mod', mod: { id: 'fame-cozy', name: '毫无威胁的传闻', raids: 3, heroAtkMult: 0.9 } }] },
        { keys: ['骨', '血', '尸', '死', '狱', '渊', '暗'], reply: '“{var.lairName}。”\n名字太腥，附近的野怪自己搬了过来。',
          effects: [{ t: 'monster', kind: 'bat' }, { t: 'var', key: 'fame', add: 1 }] },
      ],
      fallback: { reply: '“{var.lairName}。”\n不吓人也不温柔。他照样刻上门楣——反正读得懂的人活不了多久。', effects: [{ t: 'res', bone: 25 }] },
    },
  },
  {
    id: 'scribe-hire',
    once: true,
    weight: 3,
    text: '石门缝里塞着一个人：不是勇者，是被自己队伍抛下的辅助兵。他举起双手：“我不打，我记账。”',
    choices: [
      { label: '收编他', reply: '他在墙上刻下第一行账。从此你的库房数字对得上了。',
        effects: [{ t: 'var', key: 'scribe', set: 1 }, { t: 'res', bone: 30 }], next: 'scribe-hire-2' },
      { label: '扔进骨坑', reply: '第二天坑边多出一堆分类整齐的骨头——他到死都在整理。',
        effects: [{ t: 'res', bone: 55 }, { t: 'var', key: 'scribe', set: 0 }] },
      { label: '先问勇者的事', reply: '“他们按公会派单进来。我知道下一队走哪条路。”\n情报钉在墙上，你第一次比勇者更清楚地形。',
        effects: [{ t: 'res', bone: 15 }, { t: 'mod', mod: { id: 'intel', name: '路线情报', raids: 2, roomLimitAdd: 4 } }] },
    ],
  },
  {
    id: 'scribe-hire-2',
    chained: true,
    who: '记账兵',
    text: '“既然我管账了——库房里那批闲置骨料，是熔成封印材料，还是留着招募？”',
    choices: [
      { label: '熔进封印', reply: '封印的纹路又密了一层。', effects: [{ t: 'dev', seal: 1 }] },
      { label: '留着招募', reply: '骨料整整齐齐码回架子上。', effects: [{ t: 'res', bone: 45 }] },
    ],
  },
  {
    id: 'sign-board',
    once: true,
    weight: 2,
    when: [{ path: 'raidNo', cmp: '>=', value: 2 }],
    who: '记账兵',
    text: '他递来一块空木牌：“入口该挂个牌子。勇者进门第一眼就看它。”',
    input: {
      prompt: '写下入口木牌上的话', placeholder: '例如：勇者请回', max: 14, store: 'signText',
      rules: [
        { keys: ['请回', '回去', '别进', '勿进', '止步'], reply: '木牌写着“{var.signText}”。\n有礼貌的警告比咆哮更让人不安——两支小队在门口调头，省下的陷阱耗材折成了骨料。',
          effects: [{ t: 'res', bone: 40, mana: 6 }] },
        { keys: ['死', '杀', '葬', '骨', '不留'], reply: '木牌写着“{var.signText}”。\n血字招牌招来了赏金猎人：装备更好，骨料也更重。',
          effects: [{ t: 'mod', mod: { id: 'sign-cruel', name: '血字招牌', raids: 4, heroHpMult: 1.12, monAtkMult: 1.16 } }, { t: 'var', key: 'fame', add: 2 }] },
        { keys: ['欢迎', '请进', '免费', '打折', '优惠'], reply: '木牌写着“{var.signText}”。\n贪心的人比勇敢的人来得多，而且走得更靠前——正好踩在第一间房的机关上。',
          effects: [{ t: 'dev', trap: 1 }, { t: 'res', bone: 20 }] },
      ],
      fallback: { reply: '木牌写着“{var.signText}”。\n看不懂的句子让勇者在门口停了两秒。两秒，够第一只怪物就位。',
        effects: [{ t: 'mod', mod: { id: 'sign-odd', name: '看不懂的牌子', raids: 2, roomLimitAdd: 3 } }] },
    },
  },
  {
    id: 'workshop-whisper',
    weight: 2,
    when: [{ path: 'customs', cmp: '>=', value: 1 }],
    text: '你半夜路过缝合工坊，听见台上那只自己缝的东西在小声说话：“大人……我少了点什么。”',
    choices: [
      { label: '问它缺什么', reply: '“不是骨，不是肉。是理由。”\n你给了它一个。它把关节自己缝紧了两圈。',
        effects: [{ t: 'levelup', sel: 'strongest', add: 1 }, { t: 'var', key: 'creed', set: 'live' }], next: 'workshop-whisper-2' },
      { label: '拆掉重做', reply: '部件全拆回料箱。第二天早上它们又摆成了同一个形状。',
        effects: [{ t: 'res', bone: 40, mana: 8 }] },
      { label: '什么都不说', reply: '你转身离开。那天之后，工坊的灯自己会在深夜亮起来。',
        effects: [{ t: 'res', mana: 10 }, { t: 'var', key: 'creed', set: 'silent' }] },
    ],
  },
  {
    id: 'workshop-whisper-2',
    chained: true,
    who: '台上的低语',
    text: '“既然给了理由——那规矩呢？万一守不住，我们该做什么？”',
    input: {
      prompt: '写下地牢的规矩', placeholder: '例如：一个都别放过去', max: 16, store: 'creedText',
      rules: [
        { keys: ['退', '撤', '活', '保命', '逃'], reply: '墙上刻着“{var.creedText}”。\n怪物学会了在倒下之前退到后排，修补的骨料省了一大笔。',
          effects: [{ t: 'res', bone: 70 }, { t: 'mod', mod: { id: 'creed-retreat', name: '保命规矩', raids: -1, monHpMult: 1.14 } }] },
        { keys: ['一个', '别放', '拖', '守', '死守', '不许'], reply: '墙上刻着“{var.creedText}”。\n它们不再计算胜负，只计算时间。',
          effects: [{ t: 'mod', mod: { id: 'creed-hold', name: '死守规矩', raids: -1, roomLimitAdd: 3, monSpdAdd: 0.12 } }] },
        { keys: ['吃', '饭', '肉', '饱'], reply: '墙上刻着“{var.creedText}”。\n战后的地牢像个食堂：骨料入库快了，走廊没人打扫。',
          effects: [{ t: 'mod', mod: { id: 'creed-feast', name: '开饭规矩', raids: -1, monAtkMult: 1.16, monHpMult: 0.95 } }] },
      ],
      fallback: { reply: '墙上刻着“{var.creedText}”。\n怪物们各自理解成了不同的意思——反正它们本来也不齐。',
        effects: [{ t: 'res', mana: 12 }] },
    },
  },
  {
    id: 'merchant',
    weight: 3,
    when: [{ path: 'bone', cmp: '>=', value: 60 }],
    who: '兜帽商人',
    text: '一个兜帽商人从没人守的侧道钻进来，把一块碎晶推到你面前：“骨料换魔质，一次性，不讲价。”',
    choices: [
      { label: '换（-60骨 +22魔）', when: [{ path: 'bone', cmp: '>=', value: 60 }], lockText: '骨币不足',
        reply: '碎晶在你手里发热。他数完骨料就消失在侧道里。', effects: [{ t: 'res', bone: -60, mana: 22 }] },
      { label: '抢了他', reply: '兜帽下什么都没有。骨料撒了一地，魔质碎晶碎成了粉——但侧道从此没人再走。',
        effects: [{ t: 'res', bone: 35, mana: -4 }, { t: 'var', key: 'greedy', add: 1 }] },
      { label: '让他走', reply: '他行了个礼。下次他会带更好的东西来。', effects: [{ t: 'var', key: 'trade', add: 1 }, { t: 'res', mana: 5 }] },
    ],
  },
  {
    id: 'stray-monster',
    weight: 3,
    text: '走廊尽头蹲着一只没人认领的野怪，正在啃你的储备骨料。',
    choices: [
      { label: '收下它', reply: '它蹭了蹭你的手，然后继续啃骨料。编制上多了一张嘴。',
        effects: [{ t: 'monster', kind: 'slime' }, { t: 'res', bone: -10 }] },
      { label: '轰走', reply: '它叼着一根骨头跑了。走廊安静下来。', effects: [{ t: 'res', bone: 20 }] },
      { label: '喂饱了再说', reply: '吃饱的野怪把同伙也带来了——但储备见了底。',
        effects: [{ t: 'res', bone: -45 }, { t: 'monster', kind: 'bat' }, { t: 'xp', sel: 'all', add: 6 }] },
    ],
  },
  {
    id: 'hero-captive',
    weight: 3,
    when: [{ path: 'raidNo', cmp: '>=', value: 3 }],
    text: '库房角落绑着一个没死透的勇者。徽章被刮掉一半。他说：“你的地牢标价太低了。”',
    choices: [
      { label: '让他说下去', reply: '“公会按危险度派单。你这里没传闻，来的都是新手——赏金低，装备烂。想赚，就得让他们怕。”',
        next: 'hero-captive-2' },
      { label: '审问路线', reply: '他吐出三条路线、两个补给点，和牧师的换班时间。',
        effects: [{ t: 'res', bone: 30 }, { t: 'mod', mod: { id: 'intel', name: '路线情报', raids: 2, roomLimitAdd: 4 } }] },
      { label: '交给怪物练手', reply: '铠甲被拆成整齐的零件，堆在库房门口。怪物们学到了点东西。',
        effects: [{ t: 'res', bone: 60 }, { t: 'xp', sel: 'all', add: 10 }] },
    ],
  },
  {
    id: 'hero-captive-2',
    chained: true,
    who: '俘虏',
    text: '“放我回去。我把这里说成三倍难。来的人变强，你的怪物也吃得更饱。当然，我要抽成。”',
    choices: [
      { label: '成交', reply: '他一瘸一拐地出门，回头行了个正规军的礼。三天后你的地牢在派单上升了一档。',
        effects: [{ t: 'mod', mod: { id: 'rumor-deal', name: '被吹大的传闻', raids: 4, heroHpMult: 1.15, monAtkMult: 1.18 } }, { t: 'res', mana: 18 }, { t: 'var', key: 'fame', add: 3 }] },
      { label: '留下当劳工', reply: '他被派去搬骨料，搬了半个月，把库房整理得能看懂。',
        effects: [{ t: 'res', bone: 80 }, { t: 'var', key: 'scribe', set: 1 }] },
    ],
  },
  {
    id: 'seal-crack',
    weight: 2,
    when: [{ path: 'raidNo', cmp: '>=', value: 4 }],
    text: '王座后的封印裂了一道细缝，缝里往外渗魔质。',
    choices: [
      { label: '补起来', reply: '缝补好了，封印比原来更厚。', effects: [{ t: 'dev', seal: 1 }] },
      { label: '让它漏', reply: '你接了一整桶渗出来的魔质。封印薄了，但工坊有活干了。',
        effects: [{ t: 'res', mana: 30 }, { t: 'mod', mod: { id: 'leak', name: '渗漏的封印', raids: 3, sealAdd: -35 } }] },
      { label: '把手伸进去', reply: '缝里有东西咬了你一口，也留下了一点不该属于这个世界的知识。',
        effects: [{ t: 'res', mana: 16 }, { t: 'unlock', what: 'affix:thorns' }] },
    ],
  },
  {
    id: 'trap-salesman',
    weight: 2,
    when: [{ path: 'mana', cmp: '>=', value: 25 }],
    who: '地精工程师',
    text: '一个地精拖着半台机械爬进来：“魔质给我，我给你的走廊装点‘惊喜’。”',
    choices: [
      { label: '交给他（-25魔）', when: [{ path: 'mana', cmp: '>=', value: 25 }], lockText: '魔质不足',
        reply: '走廊里多了几处看不见的机簧。他拿着魔质走了，边走边算下一单。',
        effects: [{ t: 'res', mana: -25 }, { t: 'dev', trap: 1 }] },
      { label: '让他免费演示', reply: '演示炸掉了他自己的半台机械，也炸出了一份图纸。',
        effects: [{ t: 'unlock', what: 'trap:spike' }] },
      { label: '赶出去', reply: '他骂了一路。走廊维持原样。', effects: [{ t: 'res', bone: 10 }] },
    ],
  },
  {
    id: 'monster-quarrel',
    weight: 3,
    when: [{ path: 'monsters', cmp: '>=', value: 3 }],
    text: '两只怪物为了走廊的站位打起来了。旁边的同伴在下注。',
    choices: [
      { label: '让它们打完', reply: '赢的那只更凶了，输的那只在角落里养伤。',
        effects: [{ t: 'levelup', sel: 'strongest', add: 1 }, { t: 'xp', sel: 'random', add: -4 }] },
      { label: '各打一顿', reply: '两只都老实了。地牢的纪律换来了效率。',
        effects: [{ t: 'mod', mod: { id: 'drill', name: '被操练过', raids: 2, monSpdAdd: 0.14 } }] },
      { label: '重排站位', reply: '你亲手把它们摆回位置。它们记住了顺序。',
        effects: [{ t: 'xp', sel: 'all', add: 8 }] },
    ],
  },
  {
    id: 'overworked',
    weight: 2,
    when: [{ path: 'raidNo', cmp: '>=', value: 6 }],
    who: '记账兵',
    text: '“大人，怪物们连续值了六班。有的开始在岗上睡觉了。”',
    choices: [
      { label: '休一轮', reply: '你让下一波晚点来。走廊里第一次有了呼噜声。',
        effects: [{ t: 'raid', add: -1 }, { t: 'xp', sel: 'all', add: 12 }] },
      { label: '加骨料继续值班', reply: '骨料堆到走廊上。没人再睡了，但也没人再说话。',
        effects: [{ t: 'res', bone: -50 }, { t: 'mod', mod: { id: 'overtime-shift', name: '连班加骨料', raids: 2, monAtkMult: 1.2, monHpMult: 0.94 } }] },
      { label: '你自己守一班', reply: '你在王座上坐了一整夜。什么都没来，但怪物们看你的眼神变了。',
        effects: [{ t: 'var', key: 'respect', add: 1 }, { t: 'mod', mod: { id: 'lord-watch', name: '主上亲自值夜', raids: 3, monHpMult: 1.16 } }] },
    ],
  },
  {
    id: 'ask-fear',
    weight: 2,
    when: [{ path: 'raidNo', cmp: '>=', value: 5 }],
    text: '一只年轻的怪物挡在你面前，问了个不该问的问题：“大人，我们到底在怕什么？”',
    input: {
      prompt: '回答它', placeholder: '随便写点什么', max: 18, store: 'fearAnswer',
      rules: [
        { keys: ['不怕', '没有', '无', '谁怕'], reply: '“……{var.fearAnswer}。”\n它把这句话学去了，讲给了所有同伴听。全地牢的胆子都大了一圈。',
          effects: [{ t: 'mod', mod: { id: 'fearless', name: '什么都不怕', raids: 3, monAtkMult: 1.22, monHpMult: 0.92 } }, { t: 'var', key: 'morale', add: 2 }] },
        { keys: ['勇者', '人类', '公会', '英雄'], reply: '“{var.fearAnswer}。”\n它点头，然后去把走廊每个拐角都重新看了一遍。',
          effects: [{ t: 'mod', mod: { id: 'wary', name: '警惕勇者', raids: 3, monHpMult: 1.18 } }] },
        { keys: ['你', '我', '大人', '主上'], reply: '“……{var.fearAnswer}。”\n它退了一步，深深低下头。地牢的秩序比以前更硬了。',
          effects: [{ t: 'var', key: 'respect', add: 2 }, { t: 'dev', seal: 1 }] },
      ],
      fallback: { reply: '“{var.fearAnswer}？”它没听懂，但认真记下了。年轻的怪物就是这样。',
        effects: [{ t: 'xp', sel: 'all', add: 10 }] },
    },
  },
  {
    id: 'lost-blueprint',
    weight: 2,
    when: [{ path: 'raidNo', cmp: '>=', value: 4 }],
    text: '骨料堆里翻出一张被血糊住的图纸，画的是某种从没见过的部件接法。',
    choices: [
      { label: '照着做一个', reply: '接法成立了。工坊多出一种可能。', effects: [{ t: 'unlock', what: 'part:rock' }] },
      { label: '卖给商人', reply: '兜帽商人出的价比你想的高。', effects: [{ t: 'res', mana: 26 }] },
      { label: '烧掉', reply: '有些接法不该存在。火光里你好像听见了一声道谢。',
        effects: [{ t: 'res', bone: 30 }, { t: 'var', key: 'restraint', add: 1 }] },
    ],
  },
  {
    id: 'captain-letter',
    once: true,
    weight: 4,
    when: [{ path: 'raidNo', cmp: '>=', value: 9 }],
    text: '一支箭把信钉在门楣上。落款：勇者队长。信里只有一句：“最后一次，我亲自来。”\n下面留着一行空白，等你回话。',
    input: {
      prompt: '写下你的回信', placeholder: '例如：位置给你留着', max: 20, store: 'letter',
      rules: [
        { keys: ['留', '等', '位置', '座', '来'], reply: '你写：“{var.letter}”。\n信被原路射回去。据说他看完后把庆功宴推迟了一周——也把装备换成了最好的那套。',
          effects: [{ t: 'res', mana: 24 }, { t: 'mod', mod: { id: 'duel-calm', name: '双方都认真了', raids: 2, heroAtkMult: 1.08, monHpMult: 1.18 } }] },
        { keys: ['死', '葬', '别回', '不归', '骨'], reply: '你写：“{var.letter}”。\n公会把这封信裱起来当招募海报。来的人更多，也更凶。',
          effects: [{ t: 'res', bone: 120 }, { t: 'mod', mod: { id: 'duel-hard', name: '被当成招募海报', raids: 3, heroHpMult: 1.15, heroAtkMult: 1.08 } }, { t: 'var', key: 'fame', add: 4 }] },
        { keys: ['谢', '辛苦', '加班', '退役', '账'], reply: '你写：“{var.letter}”。\n他只回了两个字：“同感。”\n两边都清楚，这是一份要交差的工作。',
          effects: [{ t: 'res', bone: 60, mana: 14 }, { t: 'mod', mod: { id: 'duel-soft', name: '心照不宣', raids: 2, heroAtkMult: 0.94 } }] },
      ],
      fallback: { reply: '你写：“{var.letter}”。\n他没看懂，但他会来。该来的都会来。', effects: [{ t: 'res', bone: 40 }] },
    },
  },
  {
    id: 'bone-sorting',
    weight: 3,
    text: '骨料堆到了走廊拐角，挡住了一只怪物的岗位。得决定怎么处理这批库存。',
    choices: [
      { label: '码整齐', reply: '走廊通了，岗位也宽敞了。怪物站得更舒服。',
        effects: [{ t: 'xp', sel: 'all', add: 8 }] },
      { label: '熔成材料', reply: '骨料在坑里烧了一夜，剩下一小块能用的东西。', effects: [{ t: 'res', bone: -30, mana: 12 }] },
      { label: '当床垫用', reply: '怪物们睡在骨料上，睡得意外地好。',
        effects: [{ t: 'mod', mod: { id: 'good-sleep', name: '睡得好', raids: 2, monHpMult: 1.12 } }] },
    ],
  },
  {
    id: 'door-repair',
    weight: 3,
    text: '第一间房的门轴上次被撞歪了，关起来会卡半秒。',
    choices: [
      { label: '修好它', reply: '门重新严丝合缝。勇者要多花点时间才能推开。',
        effects: [{ t: 'res', bone: -20 }, { t: 'mod', mod: { id: 'tight-door', name: '门轴修好了', raids: 3, roomLimitAdd: 3 } }] },
      { label: '干脆卸掉', reply: '没有门的房间省了维护，也少了一道拖延。',
        effects: [{ t: 'res', bone: 35 }, { t: 'mod', mod: { id: 'no-door', name: '拆了门', raids: 3, roomLimitAdd: -2, monSpdAdd: 0.08 } }] },
      { label: '就这么卡着', reply: '半秒的卡顿谁也没注意。至少现在没有。', effects: [{ t: 'var', key: 'sloppy', add: 1 }] },
    ],
  },
  {
    id: 'name-a-room',
    weight: 2,
    text: '怪物们想给自己守的那间房起个称号，好在同伴之间报位置。',
    input: {
      prompt: '给第一间房起个名字', placeholder: '例如：断骨廊', max: 12, store: 'roomName',
      rules: [
        { keys: ['骨', '断', '血', '碎'], reply: '“{var.roomName}”传开之后，守在那儿的怪物开始互相攀比战绩。',
          effects: [{ t: 'xp', sel: 'all', add: 10 }, { t: 'mod', mod: { id: 'room-pride', name: '争强好胜', raids: 2, monAtkMult: 1.14 } }] },
        { keys: ['安', '静', '睡', '休'], reply: '“{var.roomName}”。守在那儿的怪物真的放松了下来，恢复得更快。',
          effects: [{ t: 'mod', mod: { id: 'room-calm', name: '休息得好', raids: 2, monHpMult: 1.14 } }] },
      ],
      fallback: { reply: '“{var.roomName}”。名字被刻在门框上，报位置时方便多了。',
        effects: [{ t: 'res', bone: 20 }, { t: 'xp', sel: 'all', add: 6 }] },
    },
  },
  {
    id: 'leftover-mana',
    weight: 2,
    text: '工坊的坩埚底剩了一点凝住的魔质，倒不出来也刮不干净。',
    choices: [
      { label: '砸开坩埚取出来', reply: '魔质取到了，坩埚废了一个。', effects: [{ t: 'res', mana: 14, bone: -15 }] },
      { label: '兑水继续用', reply: '稀释后的魔质效力差了些，但省下了一个坩埚。', effects: [{ t: 'res', mana: 6 }] },
      { label: '给怪物尝一口', reply: '一只怪物舔了坩埚底，之后整天在原地转圈——但明显更结实了。',
        effects: [{ t: 'levelup', sel: 'weakest', add: 1 }] },
    ],
  },
  {
    id: 'quiet-night',
    weight: 2,
    text: '什么都没发生的一夜。走廊里只有滴水声，和某只怪物翻身的动静。',
    choices: [
      { label: '巡视一圈', reply: '你把每间房都走了一遍，顺手补了两处松掉的机簧。', effects: [{ t: 'res', bone: 15 }, { t: 'xp', sel: 'all', add: 5 }] },
      { label: '在王座上坐到天亮', reply: '天亮时你想清楚了一件事，但说不出是什么。', effects: [{ t: 'res', mana: 8 }] },
    ],
  },
];

// ---------- 本地规则 provider ----------
export const localProvider                = {
  id: 'local',
  name: '地牢秘闻',
  next(snap, pick) {
    const pool = SCENES.filter((s) => !s.chained && !(s.once && snap.seen.includes(s.id)));
    return pick(pool);
  },
};

let provider                = localProvider;
export function setProvider(p               ) { provider = p; }
export function getProvider() { return provider; }
export function sceneById(id        ) { return SCENES.find((s) => s.id === id) ?? null; }

// 抽取：条件过滤 + 权重随机；最近出现过的场景权重压低，避免连着重复
export function pickScene(b             , pool         , seen          , rnd              )               {
  const ok = pool.filter((s) => testConds(b, s.when));
  if (!ok.length) return null;
  // 池子小的时候（早期大量场景被轮次门槛挡住）容易连着抽同一个：
  // 越近出现过压得越狠，只有池里实在没别的可抽时才会重复。
  const idx = (id        ) => seen.lastIndexOf(id);
  const weights = ok.map((s) => {
    let w = s.weight ?? 1;
    const at = idx(s.id);
    if (at >= 0) {
      const ago = seen.length - at;              // 1 = 上一次就是它
      w *= ago <= 2 ? 0.02 : ago <= 5 ? 0.12 : 0.45;
    }
    return Math.max(0.01, w);
  });
  const total = weights.reduce((a, c) => a + c, 0);
  let r = rnd() * total;
  for (let i = 0; i < ok.length; i++) {
    r -= weights[i];
    if (r <= 0) return ok[i];
  }
  return ok[ok.length - 1];
}

export async function requestScene(b             , snap               , rnd              )                        {
  const p = provider;
  const s = await p.next(snap, (list) => pickScene(b, list, snap.seen, rnd));
  return s ?? null;
}

export { applyEffects, testConds };
