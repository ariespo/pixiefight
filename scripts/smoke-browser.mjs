import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const port = Number(process.env.DARK_PORT || 4173);
const url = `http://127.0.0.1:${port}`;
const chrome = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
if (!chrome) throw new Error('Chrome or Edge was not found. Set CHROME_PATH.');

const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, DARK_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Local server did not start.');
};
const assert = (value, message) => { if (!value) throw new Error(message); };

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 20000 });

  // A deliberately sparse legacy save must be upgraded, not rejected.
  await page.evaluate(() => localStorage.setItem('yqh-save-v2', JSON.stringify({ bone: 321, mana: 17, raidNo: 4, story: { archive: [] } })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 20000 });
  const legacy = await page.evaluate(() => ({ bone: __debug.bone, mana: __debug.mana, floors: __debug.floors.length, story: __debug.story }));
  assert(legacy.bone === 321 && legacy.mana === 17, 'Legacy resources were not preserved.');
  assert(legacy.floors > 0 && legacy.story.relations && Array.isArray(legacy.story.exiles), 'Legacy save was not upgraded to the current schema.');

  const randomArchived = await page.evaluate(async () => {
    const before = __debug.story.archive.length;
    __debug.storyCredits(1);
    await __debug.storyDraw();
    for (let i = 0; i < 4 && __debug.storyScene?.kind !== 'done'; i++) {
      const scene = __debug.storyScene;
      if (scene.kind === 'input') __debug.storySay('守住这里');
      else __debug.storyChoose(Math.max(0, scene.choices.findIndex((x) => x.open)));
    }
    return __debug.story.archive.length > before && __debug.story.archive[0]?.source === '无主传闻';
  });
  assert(randomArchived, 'A random story was not recorded in the permanent chronicle.');
  await page.evaluate(() => { __debug.storyLeave(); __debug.setTab('story'); });
  const noCreditPoint = await page.evaluate(() => __debug.toScreen(120, 221));
  await page.mouse.click(noCreditPoint.x, noCreditPoint.y);
  await page.waitForTimeout(50);
  const noCreditDetail = await page.evaluate(() => __debug.detail);
  assert(noCreditDetail?.title === '暂无无主秘闻' && noCreditDetail.body.includes('失守 +1 次'), 'Zero-credit random-story button gave no actionable feedback.');
  const closePoint = await page.evaluate(() => __debug.toScreen(470, 250));
  await page.mouse.click(closePoint.x, closePoint.y);

  const result = await page.evaluate(() => {
    __debug.giveResources(20000, 20000);
    const heroA = __debug.devChamp('lich', 8, []);
    const heroB = __debug.devChamp('lich', 2, []);
    __debug.devHeroRelations([heroA, heroB]);
    __debug.devHeroRelations([heroA, heroB]);
    const relationLead = __debug.story.leads.find((x) => x.sceneId === 'heroes-mentor');

    __debug.devUtility(0, 'bone-yard', 1, 100);
    __debug.devEconomySettle([0]);
    __debug.devEconomySettle([0]);
    __debug.devEconomySettle([0]);
    const facility = __debug.floors[0].utility;

    const lead = __debug.storyLeadQueue('smoke:talent', 'hero-talent-offense', '英雄秘闻', '烟雾测试专精', { ref: heroA, hero: '测试英雄', talent: '破阵', talentDesc: '攻击强化' });
    __debug.storyLeadOpen(lead.id);
    __debug.storyChoose(0);
    const impactText = __debug.storyScene.log.map((x) => x.text).join(' ');
    const archive = __debug.story.archive.find((x) => x.key === 'smoke:talent');
    const chronicleIds = __debug.storyChronicle('hero', heroA, null);

    const guardA = __debug.devRecruit('bonedragon');
    const guardB = __debug.devRecruit('lich');
    __debug.devLevel(guardA, 5);
    __debug.devLevel(guardB, 5);
    __debug.devAssign(0, 'front', guardA);
    __debug.devAssign(0, 'back', guardB);
    __debug.devDev(8, 8);
    __debug.startBattle();
    const battleRun = __debug.runBattleToEnd();
    const report = __debug.reports[0];
    const linkedArchive = __debug.story.archive.find((x) => x.id === archive?.id);

    __debug.devDismissHero(heroB);
    const exileLead = __debug.story.leads.find((x) => x.sceneId === 'hero-exile-encounter');
    const audit = __debug.uiBounds();
    return { relationLead: !!relationLead, facility, archive: !!archive, exactImpact: impactText.includes('怪物攻击+12%') && impactText.includes('3轮'), chronicle: chronicleIds.includes(archive?.id),
      battleDone: battleRun?.screen === 'result', reportLinked: report?.storyRefs?.includes(archive?.id) && linkedArchive?.battleRefs?.includes(report.raidNo),
      exileLead: !!exileLead, exiles: __debug.story.exiles.length, violations: audit.violations };
  });
  assert(result.relationLead, 'Multi-hero relationship lead was not generated.');
  assert(result.facility.persona === 'scarred' && result.facility.nickname, 'Facility personality did not awaken after repeated damage.');
  assert(result.archive && result.chronicle, 'Story archive or hero chronicle filtering failed.');
  assert(result.exactImpact, 'Resolved story choice did not display its exact numeric battle effect and duration.');
  assert(result.battleDone && result.reportLinked, 'Battle completion or report/story bidirectional linking failed.');
  assert(result.exileLead && result.exiles === 1, 'Dismissed hero encounter was not retained.');
  assert(result.violations.length === 0, `Bounded text overflow: ${JSON.stringify(result.violations)}`);

  for (const viewport of [{ width: 640, height: 360 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => __debug.viewport());
    assert(Math.abs(metrics.width - viewport.width) <= 1 && Math.abs(metrics.height - viewport.height) <= 1, `Renderer did not follow ${viewport.width}x${viewport.height}.`);
    assert(metrics.scale > 0 && metrics.scale <= Math.min(viewport.width / 480, viewport.height / 270) + 0.01, 'Logical canvas scaling is invalid.');
    assert(metrics.smallScreen, `Small-screen mode was not enabled at ${viewport.width}x${viewport.height}.`);
    assert(metrics.rotateHint === (viewport.height > viewport.width * 1.15), 'Portrait rotation guidance is inconsistent.');
    assert(metrics.safeRect?.width > 0 && metrics.safeRect?.height > 0, 'Safe viewport was not measurable.');
  }

  assert(errors.length === 0, `Browser errors:\n${errors.join('\n')}`);
  console.log('Browser smoke passed: boot, legacy save, random-story archive, relationships, facility personality, battle/report links, exile, constrained text, desktop and small-screen layouts.');
} finally {
  await browser?.close();
  server.kill();
}
