// LLM 外壳：把游戏状态拼成提示词、调用一个「文本进文本出」的后端、校验并夹紧返回的 JSON。
// 这一层不认识 pixi、不认识存档结构，只认识两种契约产物：
//   1) Scene（秘闻场景，结构见 story.ts）
//   2) PartDraft（玩家 DIY 的部件草案，结构见 modules.ts 的 Part/PartPower）
// 没有配置后端时 callLLM 返回 null，调用方一律回落到本地内容 —— 断网/没 key 都不该让游戏卡住。

                                                           
import { READ_PATHS } from './vars.js';
                                                                    
                                                                         
import { AFFIX_BUDGET, AFFIX_POWER, PART_BUDGET, POWER_MENU, allLooks, clampAffixDraft, clampDraft, lookOptions } from './modules.js';

                                                                                  
let status            = { state: 'idle', note: '未接入外部叙事者' };
export function llmStatus()            { return { ...status }; }
function setStatus(state                    , note        ) { status = { state, note }; }

// 玩家自带 Key 的常用服务商。除 Claude 官方接口外，其余均走 OpenAI 兼容协议。
// 自定义地址填写 Base URL；同时兼容玩家直接粘贴 /chat/completions 或 /models 地址。
export const AI_PRESETS = [
  { id: 'openai', name: 'GPT', protocol: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Claude', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'deepseek', name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com' },
  { id: 'glm', name: 'GLM', protocol: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'kimi', name: 'Kimi', protocol: 'openai', baseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'custom', name: '自定义', protocol: 'openai', baseUrl: '' },
];

export function presetById(id) {
  return AI_PRESETS.find((item) => item.id === id) ?? AI_PRESETS[AI_PRESETS.length - 1];
}

export function normalizeBaseUrl(raw) {
  return String(raw ?? '').trim().replace(/\/+$/, '')
    .replace(/\/(?:chat\/completions|models)$/i, '');
}

function endpoint(baseUrl, path) { return `${normalizeBaseUrl(baseUrl)}/${path.replace(/^\//, '')}`; }

function authHeaders(cfg) {
  if (cfg.protocol === 'anthropic') return {
    'x-api-key': cfg.key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  return cfg.key ? { authorization: `Bearer ${cfg.key}` } : {};
}

export async function refreshModels(cfg, timeoutMs = 12000) {
  const clean = normalizeCfg(cfg);
  if (!clean?.baseUrl) throw new Error('请先填写接口地址');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  setStatus('busy', '正在刷新可用模型…');
  try {
    const res = await fetch(endpoint(clean.baseUrl, 'models'), {
      headers: { accept: 'application/json', ...authHeaders(clean) },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`模型列表请求失败（HTTP ${res.status}）`);
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : Array.isArray(json) ? json : [];
    const models = [...new Set(rows.map((item) => typeof item === 'string' ? item : item?.id ?? item?.name)
      .filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))].sort((a, b) => a.localeCompare(b));
    if (!models.length) throw new Error('接口没有返回可用模型');
    setStatus('ok', `已发现 ${models.length} 个模型`);
    return models;
  } catch (error) {
    const note = error?.name === 'AbortError' ? '刷新模型超时' : (error?.message || '刷新模型失败');
    setStatus('error', note);
    throw new Error(note);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 后端接口 ----------
// 玩家/开发者只需提供一个 complete(prompt) => 文本。默认没有后端。
;                         
             
               
                                                                                                           
  

let backend                    = null;
export function setBackend(b                   ) {
  backend = b;
  setStatus('idle', b ? `${b.name} 待命` : '未接入外部叙事者');
}
export function getBackend() { return backend; }
export const hasBackend = () => backend != null;

// 本地假后端：把玩家写的一句话按关键词编成部件/场景，用来在没有真后端时也能跑通整条链路。
// 它不是"模拟 AI"，而是这套契约的参考实现 —— 换成真模型只要替换 complete()。
export function makeEchoBackend()             {
  return {
    id: 'echo',
    name: '地牢回声（本地）',
    async complete(prompt, opts) {
      await new Promise((r) => setTimeout(r, 260));
      if (opts.kind === 'part') return JSON.stringify(echoPart(prompt));
      if (opts.kind === 'affix') return JSON.stringify(echoAffix(prompt));
      return JSON.stringify(echoScene(prompt));
    },
  };
}

function briefOf(prompt        )         {
  const m = prompt.match(/<玩家愿望>([\s\S]*?)<\/玩家愿望>/);
  return (m ? m[1] : '').trim();
}
function catOf(prompt        )          {
  const m = prompt.match(/<部位>(\w+)<\/部位>/);
  const c = (m ? m[1] : 'core')           ;
  return (['core', 'head', 'arm', 'legs']             ).includes(c) ? c : 'core';
}

const ECHO_WORDS                                                                     = [
  { keys: ['火', '炎', '烧', '熔', '爆'], word: '焰', name: '焰', powers: ['burn', 'aoeSkill', 'atkUp'] },
  { keys: ['冰', '冻', '寒', '霜'], word: '霜', name: '霜', powers: ['chill', 'slowHit', 'defUp'] },
  { keys: ['毒', '腐', '菌', '瘟'], word: '毒', name: '毒', powers: ['poisonHit', 'poisonSkill', 'hpUp'] },
  { keys: ['雷', '电', '闪'], word: '雷', name: '雷', powers: ['spdUp', 'multiSkill', 'stunHit'] },
  { keys: ['血', '吸', '啖', '噬'], word: '噬', name: '噬', powers: ['lifesteal', 'atkUp', 'frenzy'] },
  { keys: ['铁', '钢', '甲', '盾', '壁'], word: '铁', name: '铁', powers: ['defUp', 'shieldSkill', 'hpUp'] },
  { keys: ['影', '暗', '隐', '闪避', '躲'], word: '影', name: '影', powers: ['dodge', 'spdUp', 'backRow'] },
  { keys: ['咒', '魔', '法', '术', '符'], word: '咒', name: '咒', powers: ['silenceSkill', 'poisonSkill', 'manaEcho'] },
  { keys: ['巨', '大', '厚', '硬', '重'], word: '巨', name: '巨', powers: ['hpUp', 'stunHit', 'defUp'] },
  { keys: ['快', '疾', '迅', '速'], word: '疾', name: '疾', powers: ['spdUp', 'multiSkill', 'dodge'] },
];

function echoPart(prompt        )               {
  const brief = briefOf(prompt);
  const cat = catOf(prompt);
  const hit = ECHO_WORDS.find((w) => w.keys.some((k) => brief.includes(k)));
  const seed = [...brief].reduce((n, ch) => (n * 31 + ch.codePointAt(0) ) % 99991, 7) || 7;
  const pool = POWER_MENU.filter((p) => p.cats.includes(cat));
  const picks           = [];
  for (const id of hit?.powers ?? []) if (pool.some((p) => p.id === id) && picks.length < 2) picks.push(id);
  while (picks.length < 1 && pool.length) {
    const p = pool[(seed + picks.length * 7) % pool.length];
    if (!picks.includes(p.id)) picks.push(p.id);
  }
  const tag = hit?.name ?? (brief ? brief.slice(0, 1) : '奇');
  const CATN                          = { core: '躯', head: '首', arm: '肢', legs: '足' };
  const looks = lookOptions(cat);
  return {
    name: `${tag}${CATN[cat]}`,
    word: hit?.word ?? tag,
    desc: brief ? `依「${brief.slice(0, 12)}」缝制而成。` : '来历不明的缝合部件。',
    look: looks[seed % looks.length].id,
    stats: {
      hp: cat === 'core' ? 70 + (seed % 40) : 4 + (seed % 12),
      atk: cat === 'arm' ? 10 + (seed % 8) : cat === 'head' ? 7 + (seed % 7) : 2 + (seed % 5),
      def: (seed % 4),
      spd: [-0.15, 0, 0.1, 0.2][seed % 4],
    },
    powers: picks,
  };
}

// 回声词缀：与 echoPart 同一套关键词，但挑的是词缀能力菜单里的项
const ECHO_AFFIX                                                                     = [
  { keys: ['火', '炎', '烧', '熔', '爆'], word: '焰', name: '焰纹', powers: ['burn', 'atk'] },
  { keys: ['冰', '冻', '寒', '霜'], word: '霜', name: '霜纹', powers: ['chill', 'def'] },
  { keys: ['毒', '腐', '菌', '瘟'], word: '毒', name: '毒纹', powers: ['venom', 'healCut'] },
  { keys: ['雷', '电', '闪'], word: '雷', name: '雷纹', powers: ['stun', 'spd'] },
  { keys: ['血', '吸', '啖', '噬'], word: '噬', name: '血纹', powers: ['steal', 'frenzy'] },
  { keys: ['铁', '钢', '甲', '盾', '壁'], word: '铁', name: '铁纹', powers: ['guard', 'def'] },
  { keys: ['影', '暗', '隐', '闪避', '躲'], word: '影', name: '影纹', powers: ['dodge', 'spd'] },
  { keys: ['王', '令', '号', '统', '军'], word: '令', name: '令纹', powers: ['rageAura', 'atk'] },
  { keys: ['镇', '守', '护', '庇'], word: '镇', name: '镇纹', powers: ['guardAura', 'hp'] },
  { keys: ['斩', '杀', '决', '终', '断'], word: '断', name: '断纹', powers: ['execute', 'atk'] },
];

function echoAffix(prompt        )                {
  const brief = briefOf(prompt);
  const cat = catOf(prompt);
  const hit = ECHO_AFFIX.find((w) => w.keys.some((k) => brief.includes(k)));
  const seed = [...brief].reduce((n, ch) => (n * 31 + ch.codePointAt(0) ) % 99991, 11) || 11;
  const pool = AFFIX_POWER.filter((p) => p.cats.includes(cat));
  const picks           = [];
  let spent = 0;
  for (const id of hit?.powers ?? []) {
    const p = pool.find((x) => x.id === id);
    if (p && picks.length < 2 && spent + p.cost <= AFFIX_BUDGET.power) { picks.push(p.id); spent += p.cost; }
  }
  while (!picks.length && pool.length) {
    const p = pool[(seed + picks.length * 5) % pool.length];
    if (!picks.includes(p.id)) { picks.push(p.id); spent += p.cost; }
  }
  const tag = hit?.name ?? `${brief ? brief.slice(0, 1) : '奇'}纹`;
  return {
    name: tag.slice(0, 4),
    word: hit?.word ?? tag[0],
    desc: brief ? `照「${brief.slice(0, 12)}」刻上的纹路。` : '来历不明的刻纹。',
    powers: picks,
  };
}

function echoScene(prompt        )        {
  const brief = briefOf(prompt) || '走廊尽头有点动静';
  const mk = (label        , reply        , effects          )              => ({ label, reply, effects });
  return {
    id: 'llm-echo',
    who: '地牢回声',
    text: `${brief}。\n地牢自己给出了三种处理方式。`,
    choices: [
      mk('照做', '事情按你想的发生了，代价是一批骨料。', [{ t: 'res', bone: -25, mana: 10 }]),
      mk('反着来', '你偏要反着做。怪物们没听懂，但更凶了。', [{ t: 'mod', mod: { id: 'echo-def', name: '逆着来', raids: 2, monAtkMult: 1.14 } }]),
      mk('不理它', '你转身走了。地牢安静下来。', [{ t: 'res', bone: 20 }]),
    ],
  };
}

// ---------- 提示词 ----------
export function partPrompt(cat         , brief        , snap               )         {
  const menu = POWER_MENU.filter((p) => p.cats.includes(cat))
    .map((p) => `- ${p.id}（${p.cost}分）：${p.desc}`).join('\n');
  const CATN                          = { core: '核心（决定血量与被动）', head: '头部（决定普攻附带效果）', arm: '肢臂（决定主动技能）', legs: '足部（决定站位与机动）' };
  const same = lookOptions(cat).map((p) => `${p.id}（${p.name}）`).join('、');
  const other = allLooks().filter((p) => p.cat !== cat).map((p) => p.id).join('、');
  return [
    '你在为一款 8-bit 地牢经营游戏设计一个「怪物缝合部件」。只输出 JSON，不要解释、不要 markdown 代码块。',
    `<部位>${cat}</部位>  含义：${CATN[cat]}`,
    `<玩家愿望>${brief}</玩家愿望>`,
    `当前进度：第 ${snap.reads.raidNo} 波袭击，怪物 ${snap.reads.monsters} 只，骨币 ${snap.reads.bone}，魔质 ${snap.reads.mana}。`,
    '',
    '可选能力（powers 最多两项，能力分合计不得超过 ' + PART_BUDGET.power + '）：',
    menu,
    '',
    '数值上限：hp ≤ ' + PART_BUDGET.hp + '，atk ≤ ' + PART_BUDGET.atk + '，def ≤ ' + PART_BUDGET.def + '，spd 在 -0.3 ~ 0.35 之间。',
    '名字 2–4 个汉字，word 是一个汉字（用于自动命名），desc 一句中文（≤24 字，地牢守方视角，冷幽默）。',
    `look 从已有贴图里挑一个最像的（不新增美术）。同部位优选：${same}`,
    `也可以跨部位取用（长相自由，位置由部位决定）：${other}`,
    '',
    '输出格式：',
    '{"name":"焰躯","word":"焰","desc":"一句话","look":"rock","stats":{"hp":90,"atk":6,"def":2,"spd":0},"powers":["burn","hpUp"]}',
  ].join('\n');
}

export function affixPrompt(cat         , brief        , snap               )         {
  const menu = AFFIX_POWER.filter((p) => p.cats.includes(cat))
    .map((p) => `- ${p.id}（${p.cost}分）：${p.desc}`).join('\n');
  const CATN                          = { core: '核心', head: '头部', arm: '肢臂', legs: '足部' };
  return [
    '你在为一款 8-bit 地牢经营游戏设计一个「怪物词缀」（刻在某个部位上的强化纹路）。只输出 JSON，不要解释、不要 markdown 代码块。',
    `<部位>${cat}</部位>  这条词缀只能刻在${CATN[cat]}上`,
    `<玩家愿望>${brief}</玩家愿望>`,
    `当前进度：第 ${snap.reads.raidNo} 波袭击，魔质 ${snap.reads.mana}。`,
    '',
    `可选效果（powers 最多两项，效果分合计不得超过 ${AFFIX_BUDGET.power}）：`,
    menu,
    '',
    '名字 2–4 个汉字（像"猛毒""铁壁"这样的强化名），word 是一个汉字（会用于自动命名怪物），desc 一句中文（≤24 字，地牢守方视角，冷幽默，不要复述数值）。',
    '',
    '输出格式：',
    '{"name":"焰纹","word":"焰","desc":"一句话","powers":["burn","atk"]}',
  ].join('\n');
}

export function scenePrompt(snap               , brief = '')         {
  const reads = READ_PATHS.map((p) => `${p}=${snap.reads[p]}`).join(' ');
  const vars = Object.entries(snap.vars).map(([k, v]) => `${k}=${String(v)}`).join(' ') || '（无）';
  return [
    '你是一款 8-bit 地牢经营游戏的叙事者。玩家是地牢主人，勇者是入侵者。只输出 JSON，不要解释。',
    '写一个短事件：一段正文 + 2~3 个选项，每个选项有回应文字和效果。语气冷幽默、守方视角、避免热血。',
    brief ? `<玩家愿望>${brief}</玩家愿望>` : '',
    `游戏状态：${reads}`,
    `剧情变量：${vars}`,
    `最近出现过的事件：${snap.seen.slice(-6).join(', ') || '（无）'}`,
    '',
    '效果类型（effects 数组，每项二至三个字段）：',
    '{"t":"res","bone":±整数,"mana":±整数} 资源；{"t":"var","key":"名","add":整数|"set":值} 剧情变量；',
    '{"t":"monster","kind":"slime|goblin|archer|bat|shaman|ogre"} 送怪；{"t":"levelup","sel":"strongest|weakest|random","add":1}；',
    '{"t":"xp","sel":"all|random","add":整数}；{"t":"dev","seal":0|1,"trap":0|1}；{"t":"raid","add":-1|1}；',
    '{"t":"mod","mod":{"id":"英文id","name":"中文名","raids":2,"monHpMult":1.15,"monAtkMult":1,"heroHpMult":1,"heroAtkMult":1,"monSpdAdd":0,"sealAdd":0,"trapMult":1,"roomLimitAdd":0}} 战场修正',
    '',
    '数值纪律：资源单次 ±120 以内；monHpMult/monAtkMult 在 0.9~1.25；heroAtkMult 在 0.9~1.12（对玩家很敏感）；raids 取 2~4。',
    '',
    '输出格式：',
    '{"who":"说话者或省略","text":"正文，可用\\n换行","choices":[{"label":"按钮字（≤6字）","reply":"回应文字","effects":[{"t":"res","bone":30}]}]}',
  ].filter(Boolean).join('\n');
}

// ---------- 调用 + 解析 ----------
function extractJson(raw        )             {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = s.search(/[[{]/);
  if (start < 0) return null;
  // 从第一个 { 起做括号配平，容忍模型在后面多写解释
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function ask(prompt        , kind                            , timeoutMs        )                      {
  if (!backend) { setStatus('idle', '未接入外部叙事者'); return null; }
  setStatus('busy', `${backend.name} 正在编写…`);
  try {
    const raw = await Promise.race([
      backend.complete(prompt, { kind, timeoutMs }),
      new Promise        ((_r, rej) => setTimeout(() => rej(new Error('超时')), timeoutMs)),
    ]);
    const j = extractJson(raw);
    if (!j) { setStatus('error', '返回的内容不是 JSON，已回落本地'); return null; }
    setStatus('ok', `${backend.name} 已回应`);
    return j;
  } catch (e) {
    setStatus('error', `${(e         ).message || '调用失败'}，已回落本地`);
    return null;
  }
}

// ---------- 部件草案 ----------
export async function requestPart(cat         , brief        , snap               )                                                       {
  const j = await ask(partPrompt(cat, brief, snap), 'part', 9000);
  if (!j || typeof j !== 'object') return null;
  const draft = clampDraft(cat, j                         , brief);
  return draft ? { draft, via: backend?.name ?? 'llm' } : null;
}

export async function requestAffix(cat         , brief        , snap               )                                                        {
  const j = await ask(affixPrompt(cat, brief, snap), 'affix', 9000);
  if (!j || typeof j !== 'object') return null;
  const draft = clampAffixDraft(cat, j                          , brief);
  return draft ? { draft, via: backend?.name ?? 'llm' } : null;
}

// ---------- 场景 ----------
const MON_KINDS = ['slime', 'goblin', 'archer', 'bat', 'shaman', 'ogre'];
const clampNum = (v         , lo        , hi        , dflt        ) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

// 模型给的效果一律夹紧到设计区间：数值系统的安全边界由游戏方守，不指望提示词自觉。
export function sanitizeEffects(raw         , tag        )           {
  if (!Array.isArray(raw)) return [];
  const out           = [];
  for (const e of raw.slice(0, 4)) {
    if (!e || typeof e !== 'object') continue;
    const t = (e       ).t;
    if (t === 'res') {
      const bone = Math.round(clampNum((e       ).bone, -120, 120, 0));
      const mana = Math.round(clampNum((e       ).mana, -40, 40, 0));
      if (bone || mana) out.push({ t: 'res', bone, mana });
    } else if (t === 'var') {
      const key = String((e       ).key ?? '').slice(0, 16).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
      if (!key) continue;
      if ((e       ).add != null) out.push({ t: 'var', key, add: Math.round(clampNum((e       ).add, -5, 5, 1)) });
      else out.push({ t: 'var', key, set: String((e       ).set ?? 1).slice(0, 20)           });
    } else if (t === 'monster') {
      const kind = String((e       ).kind ?? '');
      if (MON_KINDS.includes(kind)) out.push({ t: 'monster', kind, lv: Math.round(clampNum((e       ).lv, 1, 3, 1)) });
    } else if (t === 'levelup') {
      const sel = ['strongest', 'weakest', 'random'].includes((e       ).sel) ? (e       ).sel : 'random';
      out.push({ t: 'levelup', sel, add: Math.round(clampNum((e       ).add, 1, 1, 1)) });
    } else if (t === 'lose') {
      out.push({ t: 'lose', sel: 'weakest' });
    } else if (t === 'xp') {
      const sel = (e       ).sel === 'random' ? 'random' : 'all';
      out.push({ t: 'xp', sel, add: Math.round(clampNum((e       ).add, -10, 16, 6)) });
    } else if (t === 'dev') {
      out.push({ t: 'dev', seal: Math.round(clampNum((e       ).seal, 0, 1, 0)), trap: Math.round(clampNum((e       ).trap, 0, 1, 0)) });
    } else if (t === 'raid') {
      out.push({ t: 'raid', add: Math.round(clampNum((e       ).add, -1, 1, -1)) });
    } else if (t === 'mod') {
      const m = (e       ).mod;
      if (!m || typeof m !== 'object') continue;
      const mod      = {
        id: (String(m.id ?? '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16) || `llm-${tag}`),
        name: String(m.name ?? '外部干涉').slice(0, 8),
        raids: Math.round(clampNum(m.raids, 1, 4, 2)),
        monHpMult: clampNum(m.monHpMult, 0.85, 1.3, 1),
        monAtkMult: clampNum(m.monAtkMult, 0.85, 1.3, 1),
        monSpdAdd: clampNum(m.monSpdAdd, -0.15, 0.2, 0),
        heroHpMult: clampNum(m.heroHpMult, 0.85, 1.25, 1),
        heroAtkMult: clampNum(m.heroAtkMult, 0.9, 1.12, 1),
        sealAdd: Math.round(clampNum(m.sealAdd, -40, 40, 0)),
        trapMult: clampNum(m.trapMult, 0.8, 1.6, 1),
        roomLimitAdd: Math.round(clampNum(m.roomLimitAdd, -3, 5, 0)),
      };
      out.push({ t: 'mod', mod });
    }
  }
  return out;
}

function sanitizeConds(raw         )                     {
  if (!Array.isArray(raw)) return undefined;
  const paths = new Set        (READ_PATHS                     );
  const out         = [];
  for (const c of raw.slice(0, 3)) {
    if (!c || typeof c !== 'object') continue;
    const path = String((c       ).path ?? '');
    if (!paths.has(path) && !path.startsWith('var.')) continue;
    const cmp = (c       ).cmp;
    if (!['>=', '<=', '>', '<', '==', '!='].includes(cmp)) continue;
    out.push({ path, cmp, value: (c       ).value           });
  }
  return out.length ? out : undefined;
}

export function sanitizeScene(j     , idHint        )               {
  if (!j || typeof j !== 'object') return null;
  const text = String(j.text ?? '').slice(0, 220).trim();
  if (!text) return null;
  const rawChoices = Array.isArray(j.choices) ? j.choices : [];
  const choices                = [];
  for (let i = 0; i < Math.min(3, rawChoices.length); i++) {
    const c = rawChoices[i];
    if (!c || typeof c !== 'object') continue;
    const label = String(c.label ?? '').slice(0, 8).trim();
    if (!label) continue;
    choices.push({
      label,
      reply: String(c.reply ?? '……').slice(0, 160),
      when: sanitizeConds(c.when),
      lockText: c.lockText ? String(c.lockText).slice(0, 10) : undefined,
      effects: sanitizeEffects(c.effects, `${idHint}${i}`),
    });
  }
  if (!choices.length) return null;
  return {
    id: `llm-${idHint}`,
    who: j.who ? String(j.who).slice(0, 8) : undefined,
    text,
    choices,
  };
}

export async function requestScene(snap               , brief = '')                        {
  const j = await ask(scenePrompt(snap, brief), 'scene', 12000);
  if (!j) return null;
  return sanitizeScene(j, String(Date.now() % 100000));
}

// ---------- 战前台词包 ----------
const cleanLine = (value, max = 24) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export function battleDialoguePrompt(snap) {
  return [
    '你为中文像素风地牢经营游戏《勇者去死！》编写一场战前台词包。只输出 JSON，不要解释。',
    '语气是地牢守方视角的黑色幽默。台词必须短、能在人物头顶两行内读完，不要描述伤害数值。',
    '只使用输入中给出的 key；根据角色阵营、职业/种族、技能、性格、属性特征写出有辨识度的句子。',
    '每个单位可写 attack、skill、reaction、heal、special，每类0至3句；opening写2至4句开场交锋。',
    `<战斗事实>${JSON.stringify(snap)}</战斗事实>`,
    '输出格式：{"opening":[{"key":"hero:王国剑士","text":"门后有动静。"}],"units":[{"key":"mon:骨头书记","attack":["留下加班费。"],"skill":[],"reaction":[],"heal":[],"special":[]}]}',
  ].join('\n');
}

export function sanitizeBattleDialogue(raw, snap) {
  if (!raw || typeof raw !== 'object') return null;
  const allowed = new Set((snap?.units ?? []).map((unit) => unit.key));
  const cleanPool = (value) => Array.isArray(value)
    ? [...new Set(value.map((line) => cleanLine(line, 22)).filter((line) => line.length >= 2))].slice(0, 3) : [];
  const units = {};
  for (const item of Array.isArray(raw.units) ? raw.units.slice(0, 16) : []) {
    const key = String(item?.key ?? '');
    if (!allowed.has(key)) continue;
    const entry = {
      attack: cleanPool(item.attack), skill: cleanPool(item.skill), reaction: cleanPool(item.reaction),
      heal: cleanPool(item.heal), special: cleanPool(item.special),
    };
    if (Object.values(entry).some((pool) => pool.length)) units[key] = entry;
  }
  const opening = [];
  for (const item of Array.isArray(raw.opening) ? raw.opening.slice(0, 4) : []) {
    const key = String(item?.key ?? ''), text = cleanLine(item?.text, 24);
    if (allowed.has(key) && text.length >= 2) opening.push({ key, text });
  }
  return opening.length || Object.keys(units).length ? { opening, units } : null;
}

export async function requestBattleDialogue(snap) {
  const j = await ask(battleDialoguePrompt(snap), 'dialogue', 8000);
  return sanitizeBattleDialogue(j, snap);
}

// ---------- 文学化战报 ----------
export function literaryReportPrompt(snap) {
  return [
    '你是《勇者去死！》地牢档案室的战地书记。只输出 JSON，不要解释。',
    '根据给定战斗事实写黑色幽默但准确的文学战报。不得创造未发生的击杀、技能、人物、资源或房间结果。',
    'summary是一段结论；chronicle是完整纪事，分2至4个短段落；highlights是2至4条短句。',
    '数字必须与输入一致。失败可以尖刻，但必须给出可理解的转折原因。',
    `<战报事实>${JSON.stringify(snap)}</战报事实>`,
    '输出格式：{"title":"档案标题","summary":"短结论","chronicle":"第一段\\n\\n第二段","highlights":["关键事实一","关键事实二"]}',
  ].join('\n');
}

export function sanitizeLiteraryReport(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = cleanLine(raw.title, 24);
  const summary = String(raw.summary ?? '').trim().slice(0, 180);
  const chronicle = String(raw.chronicle ?? '').trim().slice(0, 900);
  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights.map((line) => cleanLine(line, 80)).filter(Boolean).slice(0, 4) : [];
  if (!summary || !chronicle) return null;
  return { title: title || '战地书记补录', summary, chronicle, highlights };
}

export async function requestLiteraryReport(snap) {
  const j = await ask(literaryReportPrompt(snap), 'report', 12000);
  return sanitizeLiteraryReport(j);
}

// ---------- 上下文秘闻润色 ----------
export function contextStoryPrompt(snap) {
  const choiceShape = (snap.base?.choices ?? []).map((choice, index) => ({ index, label: choice.label, reply: choice.reply }));
  return [
    '你是《勇者去死！》的地牢编年史作者。只输出 JSON，不要解释。',
    '根据人物、设施、既往档案与本地事件底稿，改写一则上下文秘闻。保持黑色幽默和守方视角。',
    '不得改变选项数量、顺序、事实或任何游戏效果；只润色正文、说话者、按钮短标签与选择后的回应。',
    'text不超过220字，who不超过8字，label不超过8字，reply不超过160字。',
    `<秘闻上下文>${JSON.stringify({ ...snap, base: { ...snap.base, choices: choiceShape } })}</秘闻上下文>`,
    '输出格式：{"who":"说话者","text":"事件正文","choices":[{"index":0,"label":"选项","reply":"结果叙述"}]}',
  ].join('\n');
}

export function sanitizeContextStory(raw, base) {
  if (!raw || typeof raw !== 'object' || !base) return null;
  const text = String(raw.text ?? '').trim().slice(0, 220);
  if (!text) return null;
  const patches = new Map();
  for (const item of Array.isArray(raw.choices) ? raw.choices : []) {
    const index = Math.round(Number(item?.index));
    if (index < 0 || index >= (base.choices?.length ?? 0) || patches.has(index)) continue;
    const label = cleanLine(item.label, 8), reply = String(item.reply ?? '').trim().slice(0, 160);
    if (label && reply) patches.set(index, { label, reply });
  }
  return {
    who: cleanLine(raw.who, 8) || base.who,
    text,
    choices: (base.choices ?? []).map((choice, index) => ({ ...choice, ...(patches.get(index) ?? {}) })),
  };
}

export async function requestContextStory(snap) {
  const j = await ask(contextStoryPrompt(snap), 'context', 10000);
  return sanitizeContextStory(j, snap.base);
}

// ---------- 自定义 HTTP 后端（OpenAI 兼容的 chat/completions 形状） ----------
// 玩家自己填接口地址与密钥；不内置任何服务商，也不代发请求。
;                                                                 

// 平台自带的托管模型：玩家不用填任何接口就能用 —— 这是默认叙事者。
// gp.ai 从不 reject，一律看 r.ok；不可用时抛错让调用方回落本地回声。
export function makePlatformBackend()             {
  return {
    id: 'gp',
    name: '地牢叙事者',
    async complete(prompt, opts) {
      const r = await gp.ai.chat({
        system: '你是一款中文 8-bit 地牢经营游戏的设计助手。严格只输出一个 JSON 对象，不要解释、不要 markdown 代码块。',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        maxTokens: ({ scene: 700, dialogue: 800, report: 1100, context: 800 })[opts.kind] ?? 320,
      });
      if (!r.ok) {
        const MSG                         = {
          need_login: '登录后才能用地牢叙事者',
          rate_limited: '叙事者今天说得太多了，稍后再试',
          busy: '叙事者正忙，稍后再试',
          too_long: '这次的请求太长了',
          disabled: '本局没有开放叙事者',
          offline: '连不上叙事者',
        };
        throw new Error(MSG[r.error] ?? '叙事者没有回应');
      }
      return r.text;
    },
  };
}

export function makeHttpBackend(cfg         )             {
  const clean = normalizeCfg(cfg);
  return {
    id: 'http',
    name: clean?.model ? `${presetById(clean.provider).name}・${clean.model}` : '外部模型',
    async complete(prompt, opts) {
      if (!clean?.baseUrl || !clean.model) throw new Error('请先刷新并选择模型');
      const maxTokens = ({ scene: 700, dialogue: 800, report: 1100, context: 800 })[opts.kind] ?? 320;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
      try {
        const anthropic = clean.protocol === 'anthropic';
        const res = await fetch(endpoint(clean.baseUrl, anthropic ? 'messages' : 'chat/completions'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...authHeaders(clean),
          },
          body: JSON.stringify(anthropic ? {
            model: clean.model,
            system: '你是一款中文 8-bit 地牢经营游戏的设计助手。严格只输出一个 JSON 对象，不要解释、不要 markdown 代码块。',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: maxTokens,
          } : {
            model: clean.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: maxTokens,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const anthropicText = Array.isArray(j?.content)
          ? j.content.filter((item) => item?.type === 'text').map((item) => item.text).join('') : '';
        const txt = j?.choices?.[0]?.message?.content || anthropicText || j?.content || j?.output_text || '';
        if (!txt) throw new Error('返回为空');
        return String(txt);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const CFG_KEY = 'yqh-llm-cfg';
export function normalizeCfg(value) {
  if (!value || typeof value !== 'object') return null;
  const provider = presetById(String(value.provider ?? 'custom')).id;
  const preset = presetById(provider);
  const baseUrl = normalizeBaseUrl(value.baseUrl ?? value.url ?? preset.baseUrl);
  if (!baseUrl) return null;
  return {
    provider,
    protocol: provider === 'custom' ? (value.protocol === 'anthropic' ? 'anthropic' : 'openai') : preset.protocol,
    baseUrl,
    key: String(value.key ?? ''),
    model: String(value.model ?? ''),
    models: Array.isArray(value.models) ? [...new Set(value.models.map(String).filter(Boolean))].slice(0, 500) : [],
  };
}
export function loadCfg()                 {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    return normalizeCfg(JSON.parse(raw));
  } catch { return null; }
}
export function saveCfg(c                ) {
  try {
    if (c) {
      const clean = normalizeCfg(c);
      if (!clean) return false;
      localStorage.setItem(CFG_KEY, JSON.stringify(clean));
    }
    else localStorage.removeItem(CFG_KEY);
    return true;
  } catch { /* 忽略 */ }
  return false;
}

;                                                    
// 默认档是平台叙事者：玩家开箱即用，不必填接口，也不必先去开关里点一下。
export function restoreBackend()          {
  const mode = loadMode();
  if (mode === 'gp') { setBackend(makePlatformBackend()); return 'gp'; }
  if (mode === 'echo') { setBackend(makeEchoBackend()); return 'echo'; }
  if (mode === 'http') {
    const c = loadCfg();
    if (c?.model && c.models.includes(c.model)) { setBackend(makeHttpBackend(c)); return 'http'; }
    setBackend(makePlatformBackend());
    return 'gp';
  }
  setBackend(null);
  return 'off';
}
export function saveMode(mode         ) {
  try { localStorage.setItem('yqh-llm-mode', mode); } catch { /* 忽略 */ }
}
export function loadMode()          {
  try {
    const m = localStorage.getItem('yqh-llm-mode');
    return m === 'echo' || m === 'http' || m === 'off' || m === 'gp' ? m : 'gp';
  } catch { return 'gp'; }
}
