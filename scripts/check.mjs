import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SCENES } from '../story.js';
import { TEXTURES, RAIDS, NORMAL_RAID_COUNT } from '../data.js';
import { createBattle, stepBattle } from '../battle.js';
import { newChamp, champStats } from '../heroes.js';

const core = ['game.js', 'battle.js', 'story.js', 'vars.js', 'ui.js', 'heroes.js', 'modules.js', 'gear.js', 'data.js', 'llm.js', 'audio.js'];
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
const setBody = source.match(/const STORY_LEAD_SCENES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
const leadIds = [...setBody.matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const id of leadIds) if (!ids.has(id)) throw new Error(`Lead references missing scene: ${id}`);

for (const name of TEXTURES) if (!existsSync(`assets/${name}.png`)) throw new Error(`Missing texture asset: assets/${name}.png`);

if (NORMAL_RAID_COUNT !== 20 || RAIDS.length !== 20) throw new Error('The standard campaign must contain exactly 20 raids.');
if (RAIDS[0].reward.bone >= RAIDS[9].reward.bone || RAIDS[9].reward.mana >= RAIDS[19].reward.mana)
  throw new Error('The 20-round bone/mana economy curve is not progressive.');
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

console.log(`Static check passed: ${core.length} scripts, ${TEXTURES.length} textures, 20 raids, calibrated final formation, 4 new enemy skills, ${SCENES.length} scenes, ${followups.length} follow-up links, ${leadIds.length} contextual leads.`);
