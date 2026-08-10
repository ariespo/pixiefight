import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SCENES } from '../story.js';
import { TEXTURES } from '../data.js';
import { createBattle, stepBattle } from '../battle.js';

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

console.log(`Static check passed: ${core.length} scripts, ${TEXTURES.length} textures, 4 new enemy skills, ${SCENES.length} scenes, ${followups.length} follow-up links, ${leadIds.length} contextual leads.`);
