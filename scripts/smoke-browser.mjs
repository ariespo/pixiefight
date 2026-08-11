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

  const onboarding = await page.evaluate(() => {
    const initial = __debug.progression;
    __debug.setTab('hero');
    const hiddenRouteBlocked = __debug.currentTab === 'throne';
    __debug.setTab('mob');
    __debug.devBuyMonster('slime');
    const afterSlime = __debug.progression;
    __debug.devBuyMonster('archer');
    const slime = __debug.monsters.find((m) => m.kind === 'slime');
    const archer = __debug.monsters.find((m) => m.kind === 'archer');
    __debug.setTab('dungeon');
    __debug.devAssign(0, 'front', slime.uid);
    __debug.devAssign(0, 'back', archer.uid);
    __debug.setTab('throne');
    const ready = __debug.progression;
    __debug.startBattle();
    const battle = __debug.battle;
    __debug.backManage();
    const unlocks = {};
    for (const raid of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      __debug.forceRaid(raid);
      const before = __debug.progression;
      while (!__debug.progression.teachingComplete) {
        const target = __debug.progression.guide?.[0];
        const taskPage = ['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(target) ? target
          : __debug.currentTab;
        if (taskPage !== __debug.currentTab) __debug.setTab(taskPage);
        __debug.ackGuide();
      }
      unlocks[raid] = { tabs: before.visibleTabs, kinds: before.recruitKinds, guide: before.guide, features: before.features,
        heroGift: before.heroGift, complete: __debug.progression.teachingComplete };
    }
    return { initial, hiddenRouteBlocked, afterSlime, ready, battle, unlocks };
  });
  assert(JSON.stringify(onboarding.initial.visibleTabs) === JSON.stringify(['throne', 'dungeon', 'mob']), 'First raid exposed locked pages.');
  assert(onboarding.initial.enemyClasses.length === 1 && onboarding.initial.enemyClasses[0] === 'knight', 'First raid is not a single swordsman.');
  assert(onboarding.hiddenRouteBlocked, 'A hidden page was still reachable directly.');
  assert(onboarding.afterSlime.tutorialStep === 2 && onboarding.ready.tutorialStep === 6 && onboarding.ready.deploymentReady, 'Guided recruitment/deployment did not advance.');
  assert(onboarding.battle?.heroesAlive === 1, 'Guided battle did not start against one enemy.');
  assert(onboarding.unlocks[2].tabs.includes('report') && !onboarding.unlocks[2].tabs.includes('hero'), 'Raid 2 unlock schedule is incorrect.');
  assert(!onboarding.unlocks[3].tabs.includes('hero') && !onboarding.unlocks[3].tabs.includes('shop'), 'Raid 3 unlock schedule is incorrect.');
  assert(onboarding.unlocks[4].tabs.includes('shop') && !onboarding.unlocks[4].tabs.includes('story') && !onboarding.unlocks[4].tabs.includes('hero'), 'Raid 4 unlock schedule is incorrect.');
  assert(onboarding.unlocks[5].tabs.includes('story') && !onboarding.unlocks[5].tabs.includes('hero'), 'Raid 5 unlock schedule is incorrect.');
  assert(onboarding.unlocks[6].tabs.includes('hero') && onboarding.unlocks[6].guide?.[0] === 'hero', 'Raid 6 did not introduce the hero page.');
  assert(onboarding.unlocks[2].kinds.includes('goblin') && onboarding.unlocks[2].kinds.includes('bat') && !onboarding.unlocks[2].kinds.includes('shaman'), 'Raid 2 troop unlocks are incorrect.');
  assert(onboarding.unlocks[3].kinds.includes('shaman') && !onboarding.unlocks[3].kinds.includes('ogre'), 'Raid 3 troop unlocks are incorrect.');
  assert(onboarding.unlocks[4].kinds.includes('ogre') && !onboarding.unlocks[4].kinds.includes('lich'), 'Raid 4 troop unlocks are incorrect.');
  assert(onboarding.unlocks[5].kinds.includes('elite-lich') && Object.values(onboarding.unlocks).every((x) => x.complete && x.guide), 'Round teaching did not complete or lacked guidance.');
  assert(onboarding.unlocks[6].heroGift?.race === 'lich' && onboarding.unlocks[6].heroGift?.potential === 0, 'Raid 6 did not grant the potential-C lich hero.');
  assert(!onboarding.unlocks[6].features.equipmentForge && !onboarding.unlocks[6].features.heroTalent && !onboarding.unlocks[6].features.heroGraft, 'Raid 6 exposed advanced hero systems too early.');
  assert(onboarding.unlocks[7].features.equipmentForge && !onboarding.unlocks[7].features.heroTalent, 'Raid 7 forge unlock is incorrect.');
  assert(onboarding.unlocks[8].features.heroTalent && !onboarding.unlocks[8].features.heroGraft, 'Raid 8 talent unlock is incorrect.');
  assert(onboarding.unlocks[9].features.heroGraft, 'Raid 9 hero graft did not unlock.');

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
  await page.evaluate(() => { __debug.storyLeave(); __debug.forceRaid(5); __debug.setTab('story'); });
  const noCreditPoint = await page.evaluate(() => __debug.toScreen(120, 221));
  await page.mouse.click(noCreditPoint.x, noCreditPoint.y);
  await page.waitForTimeout(50);
  const noCreditDetail = await page.evaluate(() => __debug.detail);
  assert(noCreditDetail?.title === '暂无无主秘闻' && noCreditDetail.body.includes('失守 +1 次'), 'Zero-credit random-story button gave no actionable feedback.');
  const closePoint = await page.evaluate(() => __debug.toScreen(470, 250));
  await page.mouse.click(closePoint.x, closePoint.y);

  const skillPoint = await page.evaluate(() => {
    const uid = __debug.monsters[0]?.uid ?? __debug.devRecruit('slime');
    __debug.setTab('mob');
    __debug.devSelInst(uid);
    return __debug.toScreen(405, 149);
  });
  await page.mouse.click(skillPoint.x, skillPoint.y);
  await page.waitForTimeout(50);
  const skillDetail = await page.evaluate(() => ({ detail: __debug.detail, layers: __debug.layerText() }));
  assert(skillDetail.detail?.title.startsWith('技能・'), 'Monster skill did not open the shared detail layer.');
  assert(skillDetail.layers.ui.length === 0 && skillDetail.layers.modal.some((text) => text.startsWith('技能・')), 'Detail layer still rendered underlying page text.');
  await page.mouse.click(closePoint.x, closePoint.y);

  const result = await page.evaluate(() => {
    __debug.giveResources(20000, 20000);
    const heroA = __debug.devChamp('lich', 8, []);
    const heroB = __debug.devChamp('lich', 2, []);
    __debug.devHeroRelations([heroA, heroB]);
    __debug.devHeroRelations([heroA, heroB]);
    const relationLead = __debug.story.leads.find((x) => x.sceneId === 'heroes-mentor');
    const sameSubjectBlocked = !__debug.storyLeadQueue('smoke:same-subject', 'hero-talent-offense', '英雄秘闻', '同轮重复主体', { ref: heroA, hero: '测试英雄', talent: '重复', talentDesc: '不应出现' });

    __debug.devUtility(0, 'bone-yard', 1, 100);
    __debug.devEconomySettle([0]);
    __debug.devEconomySettle([0]);
    __debug.devEconomySettle([0]);
    const facility = __debug.floors[0].utility;

    // 同一主体同轮只保留一条线索；下一轮才允许该英雄产生新的专精秘闻。
    __debug.forceRaid(6);
    while (!__debug.progression.teachingComplete) {
      const target = __debug.progression.guide?.[0];
      if (['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(target) && target !== __debug.currentTab) __debug.setTab(target);
      __debug.ackGuide();
    }
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
    const returned = __debug.returnResult();
    const returnAdvanced = returned.screen === 'manage' && returned.raid === report.raidNo + 1;

    __debug.devDismissHero(heroB);
    const exileLead = __debug.story.leads.find((x) => x.sceneId === 'hero-exile-encounter');
    __debug.devUtility(1, 'none');
    __debug.forceRaid(30);
    const built = __debug.confirmUtilityBuild(1, 'mana-well');
    const blockedUpgrade = __debug.devUpgradeUtility(1);
    __debug.forceRaid(31);
    const nextRoundUpgrade = __debug.devUpgradeUtility(1);
    const facilityActionLock = built.level === 1 && blockedUpgrade.level === 1 && nextRoundUpgrade.level === 2;
    const audit = __debug.uiBounds();
    return { relationLead: !!relationLead, sameSubjectBlocked, facilityActionLock, facility, archive: !!archive, exactImpact: impactText.includes('怪物攻击+12%') && impactText.includes('3轮'), chronicle: chronicleIds.includes(archive?.id),
      battleDone: battleRun?.screen === 'result', returnAdvanced, reportLinked: report?.storyRefs?.includes(archive?.id) && linkedArchive?.battleRefs?.includes(report.raidNo),
      exileLead: !!exileLead, exiles: __debug.story.exiles.length, violations: audit.violations };
  });
  assert(result.relationLead, 'Multi-hero relationship lead was not generated.');
  assert(result.sameSubjectBlocked, 'The same hero generated more than one lead in a single raid.');
  assert(result.facilityActionLock, 'Facility build/upgrade was not limited to one action per raid.');
  assert(result.facility.persona === 'scarred' && result.facility.nickname, 'Facility personality did not awaken after repeated damage.');
  assert(result.archive && result.chronicle, 'Story archive or hero chronicle filtering failed.');
  assert(result.exactImpact, 'Resolved story choice did not display its exact numeric battle effect and duration.');
  assert(result.battleDone && result.reportLinked, 'Battle completion or report/story bidirectional linking failed.');
  assert(result.returnAdvanced, 'Returning to management after a win did not advance exactly one raid.');
  assert(result.exileLead && result.exiles === 1, 'Dismissed hero encounter was not retained.');
  assert(result.violations.length === 0, `Bounded text overflow: ${JSON.stringify(result.violations)}`);

  await page.evaluate(() => __debug.backManage());
  for (const viewport of [{ width: 640, height: 360 }, { width: 568, height: 320 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => __debug.viewport());
    assert(Math.abs(metrics.width - viewport.width) <= 1 && Math.abs(metrics.height - viewport.height) <= 1, `Renderer did not follow ${viewport.width}x${viewport.height}.`);
    assert(metrics.scale > 0, 'Logical canvas scaling is invalid.');
    assert(metrics.smallScreen, `Small-screen mode was not enabled at ${viewport.width}x${viewport.height}.`);
    assert(!metrics.rotateHint, 'Legacy portrait rotation blocker is still visible.');
    assert(metrics.portraitChrome === (viewport.height > viewport.width * 1.15), 'Portrait control console visibility is inconsistent.');
    assert(metrics.safeRect?.width > 0 && metrics.safeRect?.height > 0, 'Safe viewport was not measurable.');
    if (viewport.width > viewport.height) {
      assert(metrics.scale <= Math.min(viewport.width / 480, viewport.height / 270) + 0.01, 'Landscape logical canvas scaling is invalid.');
      const point = await page.evaluate(() => __debug.toScreen(458, 17));
      assert(point.x < viewport.width && point.y < viewport.height, 'Landscape new-game button is outside the viewport.');
      await page.mouse.click(point.x, point.y);
      assert(await page.evaluate(() => __debug.newGameConfirm), 'Landscape new-game button did not receive the click.');
      await page.evaluate(() => __debug.cancelNewGame());
    } else {
      assert(metrics.portraitLayout?.top >= metrics.portraitContentBottom - 1, 'Portrait controls overlap the game view.');
      assert(metrics.portraitLayout?.pane === 0 && metrics.portraitLayout?.logicalLeft === 0 && metrics.portraitLayout?.logicalWidth === 480,
        'Portrait overview does not expose the complete game width.');
      assert(metrics.scale >= (viewport.width - 12) / 480 - 0.02, 'Portrait overview did not fit the complete game width.');
      assert(metrics.portraitLayout?.contentTop >= 35, 'Portrait game composition was not vertically centered.');
      assert(metrics.portraitLayout?.bottom <= viewport.height, 'Portrait console exceeds the visible viewport.');
      assert(metrics.portraitLayout?.actionY + 38 <= viewport.height, 'Portrait controls exceed the visible viewport.');
      const dungeonX = metrics.portraitLayout.margin + metrics.portraitLayout.buttonWidth + metrics.portraitLayout.gap + metrics.portraitLayout.buttonWidth / 2;
      await page.mouse.click(dungeonX, metrics.portraitLayout.tabTop + 19);
      assert(await page.evaluate(() => __debug.currentTab === 'dungeon'), 'Portrait tab navigation did not receive the click.');
      const overviewScale = metrics.scale;
      await page.mouse.click(metrics.portraitLayout.margin + (metrics.portraitLayout.paneWidth + metrics.portraitLayout.gap) * 2 + metrics.portraitLayout.paneWidth / 2, metrics.portraitLayout.paneY + 18);
      await page.waitForTimeout(100);
      const focused = await page.evaluate(() => __debug.viewport());
      assert(focused.portraitLayout.pane === 2 && focused.portraitLayout.logicalLeft === 240 && focused.portraitLayout.logicalWidth === 240,
        'Portrait right-column control did not expose the complete right half.');
      assert(focused.scale > overviewScale * 1.8, 'Portrait focused column was not meaningfully enlarged.');
      await page.mouse.click(metrics.portraitLayout.margin + metrics.portraitLayout.paneWidth / 2, focused.portraitLayout.paneY + 18);
      await page.waitForTimeout(100);
      assert((await page.evaluate(() => __debug.viewport())).portraitLayout.pane === 0, 'Portrait overview control did not restore the complete page.');
      await page.mouse.click(metrics.portraitLayout.newX + metrics.portraitLayout.utilityWidth / 2, metrics.portraitLayout.newY + 19);
      assert(await page.evaluate(() => __debug.newGameConfirm), 'Portrait new-game button did not receive the click.');
      await page.evaluate(() => __debug.cancelNewGame());
    }
  }

  assert(errors.length === 0, `Browser errors:\n${errors.join('\n')}`);
  console.log('Browser smoke passed: boot, legacy save, story/facility flows, battle/report links, constrained text, landscape touch targets and portrait controls.');
} finally {
  await browser?.close();
  server.kill();
}
