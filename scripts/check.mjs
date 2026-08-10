import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SCENES } from '../story.js';

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

console.log(`Static check passed: ${core.length} scripts, ${SCENES.length} scenes, ${followups.length} follow-up links, ${leadIds.length} contextual leads.`);
