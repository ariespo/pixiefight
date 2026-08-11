import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SCENES } from '../story.js';
import { TEXTURES, RAIDS, RAID_BRIEFINGS, NORMAL_RAID_COUNT } from '../data.js';
import { createBattle, stepBattle, effectiveThorns, effectiveMitigationMultiplier, armorMultiplier } from '../battle.js';
import { newChamp, champStats } from '../heroes.js';
import { WORKSHOP_RESEARCH, researchDirectMultiplier, researchEffects, researchPoisonApplication, researchTrapThroughput } from '../research.js';

const core = ['game.js', 'battle.js', 'story.js', 'vars.js', 'ui.js', 'heroes.js', 'modules.js', 'gear.js', 'data.js', 'llm.js', 'audio.js', 'research.js'];
for (const file of core) {
  const out = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`${file} syntax failed\n${out.stderr}`);
}

const ids = new Set();
for (const scene of SCENES) {
  if (!scene.id || ids.has(scene.id)) throw new Error(`Duplicate or missing scene id: ${scene.id}`);
  ids.add(scene.id);
}
const followups = [];
for (const scene of SCENES) {
  if (scene.followup) followups.push(scene.followup.sceneId ?? scene.followup);
  for (const choice of scene.choices ?? []) if (choice.followup) followups.push(choice.followup.sceneId ?? choice.followup);
  for (const rule of scene.input?.rules ?? []) if (rule.followup) followups.push(rule.followup.sceneId ?? rule.followup);
  if (scene.input?.fallback?.followup) followups.push(scene.input.fallback.followup.sceneId ?? scene.input.fallback.followup);
}
for (const id of followups) if (!ids.has(id)) throw new Error(`Missing follow-up scene: ${id}`);

const source = readFileSync('game.js', 'utf8');
if (!source.includes("const GAME_NAME = '勇者去死！'")) throw new Error('The unified player-visible game name is missing.');
if (/夜曲地牢|夜 曲 地 牢/.test(source)) throw new Error('A legacy game title remains in game.js.');
const llmSource = readFileSync('llm.js', 'utf8');
for (const provider of ['openai', 'anthropic', 'deepseek', 'glm', 'kimi', 'custom']) {
  if (!llmSource.includes(`id: '${provider}'`)) throw new Error(`Missing AI provider preset: ${provider}`);
}
if (!llmSource.includes("endpoint(clean.baseUrl, 'models')")) throw new Error('AI model refresh endpoint is missing.');
const setBody = source.match(/const STORY_LEAD_SCENES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
const leadIds = [...setBody.matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const id of leadIds) if (!ids.has(id)) throw new Error(`Lead references missing scene: ${id}`);

for (const name of TEXTURES) if (!existsSync(`assets/${name}.png`)) throw new Error(`Missing texture asset: assets/${name}.png`);

if (NORMAL_RAID_COUNT !== 20 || RAIDS.length !== 20) throw new Error('The standard campaign must contain exactly 20 raids.');
if (RAID_BRIEFINGS.length !== 20 || new Set(RAID_BRIEFINGS.map((x) => x.no)).size !== 20)
  throw new Error('Every standard raid must have one unique pre-battle briefing.');
if (!(effectiveThorns(2) < 0.85 && effectiveThorns(2) > effectiveThorns(1) && effectiveThorns(1) < 1))
  throw new Error('Thorns diminishing returns are not monotonic and safely capped.');
if (!(effectiveMitigationMultiplier(0) > 0.14 && armorMultiplier(1000000) > 0.20))
  throw new Error('Mitigation/armor can still reach mathematical invulnerability.');
if (RAIDS[0].reward.bone >= RAIDS[9].reward.bone || RAIDS[9].reward.mana >= RAIDS[19].reward.mana)
  throw new Error('The 20-round bone/mana economy curve is not progressive.');

if (WORKSHOP_RESEARCH.length !== 5 || WORKSHOP_RESEARCH.some((group) => group.options.length !== 3))
  throw new Error('Workshop research must provide five mutually-exclusive groups of three options.');
const optionIds = WORKSHOP_RESEARCH.flatMap((group) => group.options.map((option) => option.id));
if (new Set(optionIds).size !== optionIds.length) throw new Error('Workshop research option ids must be globally unique.');
const plague = researchEffects({ medium: 'plague-vat' });
if (Math.abs(researchDirectMultiplier(plague, 0, 'front', 1) - 0.70) > 1e-9)
  throw new Error('Plague route direct-damage tradeoff drifted from -30%.');
let poison = { dps: 0, stacks: 0 };
for (let i = 0; i < 6; i++) poison = researchPoisonApplication(poison.dps, poison.stacks, 10, plague);
if (poison.stacks !== 4 || Math.abs(poison.dps - 47.5) > 1e-9)
  throw new Error(`Plague stacking is not capped/diminishing as designed: ${JSON.stringify(poison)}`);
const rear = researchEffects({ formation: 'rear-battery' });
if (researchDirectMultiplier(rear, 1, 'back', 1) !== 1.5 || researchDirectMultiplier(rear, 0, 'front', 1) !== 0.2)
  throw new Error('Rear-battery row modifiers do not match the promised +50%/-80%.');
const dual = researchEffects({ traps: 'double-rail' });
if (Math.abs(researchTrapThroughput(dual, 2) - 1.44) > 1e-9 || researchTrapThroughput(dual, 3) > 1.44)
  throw new Error('Dual traps must cap at two 72% triggers (144% total throughput).');

const builds = [{}];
for (const group of WORKSHOP_RESEARCH) {
  const prior = builds.splice(0);
  for (const picks of prior) for (const option of group.options) builds.push({ ...picks, [group.id]: option.id });
}
for (const picks of builds) {
  const effects = researchEffects(picks);
  const values = Object.values(effects).filter((value) => typeof value === 'number');
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error(`Invalid research build: ${JSON.stringify(picks)}`);
  const front = researchDirectMultiplier(effects, 0, 'front', 1);
  const back = researchDirectMultiplier(effects, 1, 'back', 1);
  if (Math.min(front, back) < 0.08 || Math.max(front, back) > 3.20)
    throw new Error(`Research direct-damage envelope escaped 8%..320%: ${front}/${back}`);
  if (effects.monHpMult * effects.frontRowHpMult < 0.40 || effects.monHpMult * effects.frontRowHpMult > 2.55)
    throw new Error(`Research HP envelope escaped 40%..255%: ${JSON.stringify(picks)}`);
  if (effects.monSpeedMult < 0.65 || effects.monSpeedMult > 1.40)
    throw new Error(`Research speed envelope escaped 65%..140%: ${JSON.stringify(picks)}`);
  if (researchTrapThroughput(effects, 2) > 2.71)
    throw new Error(`Research trap throughput exceeded the calibrated ceiling: ${JSON.stringify(picks)}`);
}
for (let i = 16; i < RAIDS.length; i++) {
  const prevPower = RAIDS[i - 1].members.reduce((n, m) => n + m.lv, 0) + RAIDS[i - 1].affixes.length * 8;
  const power = RAIDS[i].members.reduce((n, m) => n + m.lv, 0) + RAIDS[i].affixes.length * 8;
  if (power < prevPower) throw new Error(`Raid ${i + 1} regressed during the final difficulty ramp.`);
}

function runToEnd(battle) {
  let steps = 0;
  while (battle.phase !== 'done' && steps++ < 50000) stepBattle(battle, 0.05);
  if (!battle.result) throw new Error('Endgame benchmark did not finish.');
  return battle.result;
}

function endgameBenchmark() {
  const elite = ['elite-magmagolem', 'elite-broodqueen', 'elite-plaguelord', 'elite-bonedragon',
    'elite-hundredarm', 'elite-beholder', 'elite-mindflayer', 'elite-lich'];
  const races = ['magmagolem', 'broodqueen', 'plaguelord', 'bonedragon'];
  const themes = ['mirror', 'mire', 'curse', 'forge'];
  const traps = ['mirror', 'net', 'rune', 'blade'];
  let uid = 1;
  const insts = [], champs = {};
  const rooms = Array.from({ length: 4 }, (_, room) => {
    const ids = Array.from({ length: 3 }, (_, slot) => {
      const inst = { uid: uid++, kind: elite[(room * 3 + slot) % elite.length], lv: 5, xp: 0 };
      insts.push(inst); return inst.uid;
    });
    const champ = newChamp(100 + room, { race: races[room], name: `终局守将${room + 1}`,
      traits: ['gifted', 'tenacious'], personality: '', background: '' });
    champ.lv = 8; champ.talents = ['t1hp', 't2def', 't3regen'];
    champs[champ.uid] = champStats(champ, 1.1);
    return { theme: themes[room], trap: traps[room], front: ids[0], back: ids[1], flank: ids[2], leader: champ.uid };
  });
  return runToEnd(createBattle(RAIDS[19], rooms, insts, { champs, sealMax: 175, trapPower: 1.6 }));
}

function underbuiltBenchmark() {
  let uid = 1;
  const insts = [], rooms = [];
  for (let room = 0; room < 3; room++) {
    const ids = ['elite-lich', 'elite-beholder'].map((kind) => {
      const inst = { uid: uid++, kind, lv: 4, xp: 0 }; insts.push(inst); return inst.uid;
    });
    rooms.push({ theme: 'stone', trap: 'spike', front: ids[0], back: ids[1], leader: null, flank: null });
  }
  return runToEnd(createBattle(RAIDS[19], rooms, insts, { sealMax: 120, trapPower: 1 }));
}

const benchmark = endgameBenchmark();
if (!benchmark.win || benchmark.kills !== benchmark.total) throw new Error(`Intended round-20 formation failed: ${JSON.stringify(benchmark)}`);
const underbuilt = underbuiltBenchmark();
if (underbuilt.win) throw new Error('An underbuilt three-floor formation should not clear round 20.');

const dualTrapBattle = createBattle(
  { no: 97, title: 'dual trap integration', members: [{ cls: 'knight', lv: 1 }], affixes: [], reward: { bone: 0, mana: 0 } },
  [{ theme: 'stone', trap: 'slime', trap2: 'net', front: 1, back: null, leader: null, flank: null }],
  [{ uid: 1, kind: 'magmagolem', lv: 5, xp: 0 }], { research: dual, seed: 2468 },
);
for (let i = 0; i < 160 && dualTrapBattle.events.filter((event) => event.k === 'trap').length < 2; i++) stepBattle(dualTrapBattle, 0.05);
const dualTrapEvents = dualTrapBattle.events.filter((event) => event.k === 'trap');
if (dualTrapEvents.length !== 2 || dualTrapEvents[0].slot !== 0 || dualTrapEvents[1].slot !== 1)
  throw new Error(`Dual traps did not trigger sequentially: ${JSON.stringify(dualTrapEvents)}`);

const skillRoom = { theme: 'stone', trap: 'none', front: 1, back: 2, leader: null, flank: null,
  utility: { kind: 'none', level: 0, condition: 100 } };
const skillInsts = [{ uid: 1, kind: 'slime', lv: 1 }, { uid: 2, kind: 'goblin', lv: 1 }];
function triggerNewEnemySkill(cls) {
  const raid = { no: 99, title: cls, members: [{ cls, lv: 5 }], affixes: [], reward: { bone: 0, mana: 0 } };
  const battle = createBattle(raid, [structuredClone(skillRoom)], structuredClone(skillInsts), { seed: 1234 });
  for (let i = 0; i < 100 && battle.phase !== 'fight'; i++) stepBattle(battle, 0.05);
  if (battle.phase !== 'fight') throw new Error(`${cls} did not enter combat.`);
  const hero = battle.heroes[0];
  for (const monster of battle.rooms[0].mons) { monster.hp = monster.maxHp = 9999; monster.atk = 0; monster.cd = 999; }
  hero.skillCd = 0;
  stepBattle(battle, 0.05);
  return { hero, monsters: battle.rooms[0].mons };
}
const alchemist = triggerNewEnemySkill('alchemist');
if (!alchemist.monsters.every((m) => m.poisonT > 0)) throw new Error('Alchemist poison skill did not trigger.');
const monk = triggerNewEnemySkill('monk');
if (monk.hero.shield <= 0) throw new Error('Monk shield skill did not trigger.');
const lancer = triggerNewEnemySkill('lancer');
if (!lancer.monsters.every((m) => m.hp < 9999)) throw new Error('Lancer did not pierce both monster rows.');
const warlock = triggerNewEnemySkill('warlock');
if (!warlock.monsters.every((m) => m.burnT > 0)) throw new Error('Warlock curse-fire skill did not trigger.');

const statRoom = { theme: 'stone', trap: 'none', front: null, back: null, flank: null, leader: 99,
  utility: { kind: 'none', level: 0, condition: 100 } };
const statBattle = createBattle({ no: 98, title: 'attribute speech', members: [{ cls: 'knight', lv: 16 }], affixes: [], reward: { bone: 0, mana: 0 } },
  [statRoom], [], { champs: { 99: { name: '法则测试员', race: 'lich', tex: 'mon-lich', lv: 10,
    hp: 600, atk: 100, def: 40, spd: 1, auraId: 'undying', auraPow: 1, dmgTakenMult: 1, eff: { thorns: 0.8 } } } });
if (!statBattle.dialogue.some((x) => x.kind === 'stat-thorns') || !statBattle.dialogue.some((x) => x.kind === 'stat-max'))
  throw new Error('High-stat or max-level battle dialogue did not trigger for both sides.');

console.log(`Static check passed: ${core.length} scripts, ${TEXTURES.length} textures, 20 raid stories, 243 workshop builds, sequential dual traps, diminishing defenses, attribute dialogue, calibrated final formation, 4 new enemy skills, ${SCENES.length} scenes, ${followups.length} follow-up links, ${leadIds.length} contextual leads.`);
