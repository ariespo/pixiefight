const ALLOWED_CLASSES = ['knight','archer','cleric','mage','rogue','paladin','berserker','ranger','bard','alchemist','monk','lancer','warlock','captain','inquisitor','swordmaster'];
const ALLOWED_AFFIXES = ['haste', 'holywater', 'shield', 'brave'];
const OBJECTIVES = new Set(['win', 'protectFacility', 'breachLimit', 'protectUnit', 'timeLimit']);

const clamp = (n, lo, hi, fallback = lo) => Math.max(lo, Math.min(hi, Number.isFinite(Number(n)) ? Number(n) : fallback));
const line = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').trim().slice(0, max);

export function freshNovelState() {
  return {
    enabled: false, chapter: 1, phase: 'idle', dailyTurns: 0, page: 0, nextEntry: 1, summarizedThrough: 0,
    entries: [], summary: '', facts: { relations: [], promises: [], threads: [], places: [] },
    choices: [], pendingMission: null, lastResolvedRaid: 0, draft: '', error: '',
  };
}

export function sanitizeNovelState(raw) {
  const base = freshNovelState(), n = raw && typeof raw === 'object' ? raw : {};
  const entries = Array.isArray(n.entries) ? n.entries.slice(-240).filter((entry) => entry && ['player', 'narrator', 'battle'].includes(entry.role))
    .map((entry, i) => ({ id: Math.max(1, Math.round(Number(entry.id) || i + 1)), chapter: Math.max(1, Math.round(Number(entry.chapter) || 1)),
      role: entry.role, text: text(entry.text, 2400), at: Number(entry.at) || Date.now() })) : [];
  const choices = Array.isArray(n.choices) ? n.choices.map((choice) => line(choice, 48)).filter(Boolean).slice(0, 3) : [];
  return {
    ...base, ...n, enabled: !!n.enabled, chapter: Math.max(1, Math.round(Number(n.chapter) || 1)),
    phase: ['idle', 'daily', 'mission', 'ready', 'awaitingResult', 'resolution'].includes(n.phase) ? n.phase : 'idle',
    dailyTurns: Math.max(0, Math.min(3, Math.round(Number(n.dailyTurns) || 0))), entries,
    nextEntry: Math.max(entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1, Math.round(Number(n.nextEntry) || 1)),
    summarizedThrough: Math.max(0, Math.round(Number(n.summarizedThrough) || 0)),
    page: Math.max(0, Math.min(Math.max(0, entries.length - 1), Math.round(Number(n.page) || entries.length - 1))),
    summary: text(n.summary, 6000), facts: sanitizeFacts(n.facts), choices,
    pendingMission: n.pendingMission && typeof n.pendingMission === 'object' ? n.pendingMission : null,
    lastResolvedRaid: Math.max(0, Math.round(Number(n.lastResolvedRaid) || 0)), draft: text(n.draft, 500), error: line(n.error, 120),
  };
}

export function appendNovelEntry(novel, role, body) {
  const entry = { id: novel.nextEntry++, chapter: novel.chapter, role, text: text(body, 2400), at: Date.now() };
  novel.entries.push(entry);
  if (novel.entries.length > 240) novel.entries.splice(0, novel.entries.length - 240);
  novel.page = novel.entries.length - 1;
  return entry;
}

function sanitizeFacts(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const pool = (value, max = 24) => Array.isArray(value) ? [...new Set(value.map((v) => line(v, 80)).filter(Boolean))].slice(-max) : [];
  return { relations: pool(obj.relations), promises: pool(obj.promises), threads: pool(obj.threads), places: pool(obj.places, 16) };
}

export function sanitizeNovelTurn(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const body = text(raw.body, 1400);
  const choices = Array.isArray(raw.choices) ? raw.choices.map((choice) => line(choice, 48)).filter(Boolean).slice(0, 3) : [];
  if (!body || choices.length !== 3) return null;
  return { body, choices, facts: sanitizeFacts(raw.facts) };
}

export function mergeNovelFacts(current, patch) {
  const a = sanitizeFacts(current), b = sanitizeFacts(patch);
  const merge = (x, y, max) => [...new Set([...x, ...y])].slice(-max);
  return { relations: merge(a.relations, b.relations, 24), promises: merge(a.promises, b.promises, 24),
    threads: merge(a.threads, b.threads, 24), places: merge(a.places, b.places, 16) };
}

export function sanitizeNovelSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const summary = text(raw.summary, 6000);
  return summary ? { summary, facts: sanitizeFacts(raw.facts) } : null;
}

function objectiveText(objective, snap) {
  if (objective.type === 'protectFacility') return `取胜且第${objective.floor + 1}层设施不得失守`;
  if (objective.type === 'breachLimit') return `取胜且最多失守${objective.maxBreaches}层`;
  if (objective.type === 'protectUnit') return `取胜且让${objective.name}存活`;
  if (objective.type === 'timeLimit') return `在${objective.seconds}秒内取胜`;
  return '击退本次入侵';
}

export function sanitizeNovelMission(raw, snap) {
  if (!raw || typeof raw !== 'object') return null;
  const minLevel = Math.max(1, Math.round(snap.minLevel)), maxLevel = Math.max(minLevel, Math.round(snap.maxLevel));
  const members = (Array.isArray(raw.members) ? raw.members : []).slice(0, 8).map((row) => ({
    cls: String(row?.cls ?? ''), lv: Math.round(clamp(row?.lv, minLevel, maxLevel, minLevel)),
  })).filter((row) => ALLOWED_CLASSES.includes(row.cls));
  if (members.length < 5) return null;
  const affixes = [...new Set((Array.isArray(raw.affixes) ? raw.affixes : []).map(String).filter((id) => ALLOWED_AFFIXES.includes(id)))].slice(0, 4);
  const candidate = raw.objective && typeof raw.objective === 'object' ? raw.objective : {};
  let type = OBJECTIVES.has(candidate.type) ? candidate.type : 'win';
  let objective = { type };
  if (type === 'protectFacility') {
    const floors = Array.isArray(snap.facilityFloors) ? snap.facilityFloors : [];
    const floor = Math.round(Number(candidate.floor));
    if (!floors.includes(floor)) type = 'win'; else objective = { type, floor };
  } else if (type === 'breachLimit') objective = { type, maxBreaches: Math.round(clamp(candidate.maxBreaches, 0, Math.max(0, snap.floors - 1), 1)) };
  else if (type === 'protectUnit') {
    const defenders = Array.isArray(snap.defenders) ? snap.defenders : [];
    const found = defenders.find((unit) => String(unit.key) === String(candidate.key));
    if (!found) type = 'win'; else objective = { type, key: found.key, name: found.name };
  } else if (type === 'timeLimit') objective = { type, seconds: Math.round(clamp(candidate.seconds, 45, 180, 100)) };
  if (type === 'win') objective = { type: 'win' };
  const rewardMult = Number(clamp(raw.rewardMult, 1.15, 1.60, 1.3).toFixed(2));
  const penalty = raw.penalty === 'temporary' ? 'temporary' : 'resource';
  const title = line(raw.title, 28) || `小说远征第${snap.batch}批`;
  return {
    id: `novel-${snap.no}-${Date.now().toString(36)}`, issuedRaid: snap.no, title,
    body: text(raw.body, 1000) || '王国终于找到了正确的报销单，于是派人来送死。',
    members, affixes, objective, objectiveText: objectiveText(objective, snap), rewardMult, penalty,
    resolved: false,
  };
}

export function evaluateNovelMission(mission, report) {
  if (!mission || !report) return { complete: false, reason: '任务记录缺失' };
  const breaches = (report.rooms ?? []).filter((room) => room.broken).length;
  let complete = !!report.win, reason = report.win ? '成功击退入侵' : '地牢防线失守';
  const o = mission.objective ?? { type: 'win' };
  if (complete && o.type === 'protectFacility') {
    complete = !(report.rooms ?? []).find((room) => room.i === o.floor)?.broken;
    reason = complete ? `第${o.floor + 1}层设施安然无恙` : `第${o.floor + 1}层设施遭到劫掠`;
  } else if (complete && o.type === 'breachLimit') {
    complete = breaches <= o.maxBreaches; reason = complete ? `仅失守${breaches}层` : `失守${breaches}层，超过上限`;
  } else if (complete && o.type === 'protectUnit') {
    const unit = (report.defenders ?? []).find((item) => item.key === o.key);
    complete = !!unit?.alive; reason = complete ? `${o.name}存活` : `${o.name}在战斗中倒下`;
  } else if (complete && o.type === 'timeLimit') {
    complete = Number(report.time) <= o.seconds; reason = complete ? `${Math.round(report.time)}秒内结束战斗` : `耗时${Math.round(report.time)}秒，超过限制`;
  }
  return { complete, reason, breaches };
}

export function recentNovelContext(novel) {
  const current = novel.chapter;
  const recent = novel.entries.filter((entry) => entry.chapter >= current - 2)
    .map((entry) => ({ chapter: entry.chapter, role: entry.role, text: entry.text }));
  return { summary: novel.summary, facts: novel.facts, recent };
}
