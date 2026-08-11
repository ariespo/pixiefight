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
  assert(await page.evaluate(() => __debug.screen === 'title' && __debug.title.mode === 'main'), 'Game did not open on the title screen.');
  await page.evaluate(() => __debug.titleNew());
  assert(await page.evaluate(() => __debug.screen === 'manage'), 'First new game did not leave the title screen.');

  // AI 设置必须走“地址/Key → 刷新模型 → 选择模型 → 保存”的完整链路。
  let requestedModel = '';
  let requestedPrompt = '';
  await page.route('https://api.example.test/v1/models', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'test-model-a' }, { id: 'test-model-b' }] }) });
  });
  await page.route('https://api.example.test/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON() ?? {};
    requestedModel = body.model ?? '';
    const prompt = body.messages?.at(-1)?.content ?? '';
    requestedPrompt = prompt;
    let content;
    if (prompt.includes('战前台词包')) content = { opening: [{ key: 'hero:剑士', text: '这次差旅没有返程票。' }], units: [
      { key: 'hero:剑士', attack: ['报销单先斩了。'], skill: ['为了最低工资！'], reaction: ['这不在保险范围。'], heal: [], special: [] },
      { key: 'mon:史莱姆', attack: ['黏住再算账。'], skill: [], reaction: ['桶又要漏了。'], heal: [], special: [] },
    ] };
    else if (prompt.includes('战地书记')) content = { title: '门轴与加班费', summary: '剑士按规定入侵，按事故离场。',
      chronicle: '门轴响了第一声，守军便开始计算抚恤。\n\n战斗结束时，账本比剑士完整。', highlights: ['所有数字仍由原始战报作证。'] };
    else if (prompt.includes('地牢编年史作者')) content = { who: '旧档案员', text: '旧账从柜底爬出来，准确叫出了当事人的名字。',
      choices: [{ index: 0, label: '照旧办理', reply: '印章落下，原有效果一项不少。' }] };
    else if (prompt.includes('重构一名英雄档案')) content = { personalityName: '账簿式冷静',
      personalityDesc: '越危险越先核对伤亡与欠款，仿佛死亡只是一张填错栏目的表。',
      backgroundName: '欠薪墓园', backgroundStory: '他曾替一座墓园守夜，领到的薪水只有逝者留下的道歉。后来账本自行补上了地牢地址，他便带着旧钥匙来讨一份不会拖欠的差事。' };
    else if (prompt.includes('怪物词缀')) content = { name: '试作毒纹', word: '毒', desc: '模型词缀链路测试。', powers: ['venom', 'healCut'] };
    else content = { name: '试作毒躯', word: '毒', desc: '模型选择链路测试。', look: 'rock', stats: { hp: 60, atk: 4, def: 1, spd: 0 }, powers: ['poisonSkill'] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }) });
  });
  await page.evaluate(() => __debug.aiSettingsOpen());
  await page.selectOption('[data-ai="provider"]', 'custom');
  await page.fill('[data-ai="url"]', 'https://api.example.test/v1/chat/completions');
  await page.fill('[data-ai="key"]', 'test-browser-key');
  await page.click('[data-ai="refresh"]');
  await page.waitForFunction(() => document.querySelector('[data-ai="model"]')?.options.length === 2);
  await page.selectOption('[data-ai="model"]', 'test-model-b');
  await page.click('[data-ai="save"]');
  const aiCfg = await page.evaluate(() => __debug.llm);
  assert(aiCfg.mode === 'http' && aiCfg.cfg?.provider === 'custom' && aiCfg.cfg?.baseUrl === 'https://api.example.test/v1'
    && aiCfg.cfg?.model === 'test-model-b' && aiCfg.cfg?.models.length === 2, 'AI settings did not persist the refreshed model selection.');
  await page.evaluate(() => __debug.aiSettingsOpen());
  await page.click('[data-ai="tab-prompts"]');
  await page.selectOption('[data-ai="prompt-task"]', 'part');
  await page.fill('[data-ai="prompt-text"]', '测试定制提示：优先写成账房风格。');
  await page.click('[data-ai="prompt-save"]');
  await page.click('[data-ai="close"]');
  await page.evaluate(() => __debug.forgeOpen('part'));
  const aiDraft = await page.evaluate(async () => await __debug.forgeAsk('测试毒物'));
  assert(aiDraft?.draft?.name === '试作毒躯' && requestedModel === 'test-model-b' && requestedPrompt.includes('测试定制提示'),
    'AI generation did not use the selected model and editable task prompt.');
  const preservedForge = await page.evaluate(async () => {
    __debug.forgeTab('affix');
    __debug.forgeCat('head');
    const affix = await __debug.forgeAsk('测试毒纹');
    __debug.forgeTab('part');
    const part = __debug.forge;
    __debug.forgeTab('affix');
    return { affix, part, restoredAffix: __debug.forge };
  });
  assert(preservedForge.part.draft?.name === '试作毒躯' && preservedForge.part.brief === '测试毒物'
    && preservedForge.restoredAffix.af?.name === '试作毒纹' && preservedForge.restoredAffix.brief === '测试毒纹',
  `DIY part/affix tabs did not preserve their independent drafts and input: ${JSON.stringify(preservedForge)}`);
  await page.evaluate(() => __debug.closeForge());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => __debug.aiSettingsOpen());
  const aiPanelBox = await page.locator('#ai-settings-overlay > div').boundingBox();
  assert(aiPanelBox && aiPanelBox.x >= 0 && aiPanelBox.y >= 0 && aiPanelBox.x + aiPanelBox.width <= 390
    && aiPanelBox.y + aiPanelBox.height <= 844, 'AI settings panel exceeds the portrait viewport.');
  await page.evaluate(() => __debug.aiSettingsClose());
  await page.setViewportSize({ width: 1280, height: 720 });

  const onboarding = await page.evaluate(async () => {
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
    await __debug.startBattle();
    const briefing = __debug.raidBriefing;
    await __debug.confirmRaidBriefing();
    const briefingArchived = __debug.story.archive.some((x) => x.key === 'raid-briefing:1');
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
    return { initial, hiddenRouteBlocked, afterSlime, ready, briefing, briefingArchived, battle, unlocks };
  });
  assert(JSON.stringify(onboarding.initial.visibleTabs) === JSON.stringify(['throne', 'dungeon', 'mob']), 'First raid exposed locked pages.');
  assert(onboarding.initial.enemyClasses.length === 1 && onboarding.initial.enemyClasses[0] === 'knight', 'First raid is not a single swordsman.');
  assert(onboarding.hiddenRouteBlocked, 'A hidden page was still reachable directly.');
  assert(onboarding.afterSlime.tutorialStep === 2 && onboarding.ready.tutorialStep === 6 && onboarding.ready.deploymentReady, 'Guided recruitment/deployment did not advance.');
  assert(onboarding.briefing?.no === 1 && onboarding.briefing.body.includes('地牢'),
    `First raid did not show its pre-battle campaign story: ${JSON.stringify({ briefing: onboarding.briefing, ready: onboarding.ready, battle: onboarding.battle })}`);
  assert(onboarding.briefingArchived, 'Confirmed campaign briefing was not added to the chronicle.');
  assert(onboarding.battle?.heroesAlive === 1, 'Guided battle did not start against one enemy.');
  assert(onboarding.battle?.dialoguePack?.opening?.[0]?.text === '这次差旅没有返程票。',
    'The selected AI model did not provide the pre-battle dialogue pack.');
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

  const workshopResearch = await page.evaluate(() => {
    __debug.giveResources(0, 1000);
    __debug.devUtility(0, 'workshop', 3, 100);
    __debug.forceRaid(14);
    __debug.researchOpen();
    __debug.researchGroup('traps');
    __debug.researchPreview('double-rail');
    const before = { research: __debug.workshopResearch, modalText: __debug.layerText().modal };
    const confirmed = __debug.researchConfirm();
    __debug.researchPreview('overclock-trap');
    const overwrite = __debug.researchConfirm();
    __debug.devTrap(0, 'slime', 0);
    __debug.devTrap(0, 'net', 1);
    const after = { research: __debug.workshopResearch, room: __debug.rooms[0], modalText: __debug.layerText().modal };
    __debug.forceRaid(16);
    __debug.researchGroup('artisan');
    __debug.researchPreview('elite-craft');
    const eliteCraft = __debug.researchConfirm();
    __debug.researchClose();
    __debug.forgeOpen('part');
    const diyRules = __debug.forge.rules;
    __debug.closeForge();
    return { before, confirmed, overwrite, after, eliteCraft, diyRules };
  });
  assert(!workshopResearch.before.research.picks.traps && workshopResearch.before.research.modal.previewId === 'double-rail',
    'Workshop research preview wrote the permanent pick before confirmation.');
  assert(workshopResearch.confirmed.ok && workshopResearch.after.research.picks.traps === 'double-rail'
    && workshopResearch.after.research.effects.dualTraps, 'Workshop research confirmation did not persist the selected route.');
  assert(!workshopResearch.overwrite.ok, 'A locked workshop research group could be overwritten.');
  assert(workshopResearch.after.room.trap === 'slime' && workshopResearch.after.room.trap2 === 'net'
    && workshopResearch.after.modalText.some((text) => text.includes('其余封锁')), 'Dual-trap route did not expose two persistent trap slots or its locked state.');
  assert(workshopResearch.eliteCraft.ok && workshopResearch.diyRules.powerCap === 10 && workshopResearch.diyRules.maxPowers === 3,
    'Elite-craft research did not expand the live DIY budget to 10 points and three abilities.');

  const lawAudit = await page.evaluate(() => {
    const uid = __debug.monsters[0].uid;
    __debug.devLawAudit('monster', uid, 'thorns');
    const forced = __debug.lawAudit;
    __debug.acceptLawAudit();
    return { forced, marks: __debug.monsters.find((m) => m.uid === uid)?.lawMarks,
      archived: __debug.story.archive.some((x) => x.sceneId === 'law-audit-thorns') };
  });
  assert(lawAudit.forced?.penalty.includes('55%') && lawAudit.marks?.includes('thorns') && lawAudit.archived,
    'Forced law-limit story did not apply and archive its permanent tradeoff.');

  // A deliberately sparse legacy save must be upgraded, not rejected.
  await page.evaluate(() => localStorage.setItem('yqh-save-v2', JSON.stringify({ bone: 321, mana: 17, raidNo: 4, story: { archive: [] } })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 20000 });
  assert(await page.evaluate(() => __debug.screen === 'title' && __debug.title.saveExists), 'Existing save did not expose Continue on the title screen.');
  await page.evaluate(() => __debug.titleContinue());
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

  const result = await page.evaluate(async () => {
    __debug.giveResources(20000, 20000);
    const heroA = __debug.devChamp('lich', 8, []);
    const heroB = __debug.devChamp('lich', 2, []);
    const optimizedLore = await __debug.heroLoreOptimize(heroA);
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
    await __debug.startBattle();
    if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
    const facilityVisual = __debug.battle.utilityVisual;
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
    __debug.devRotation(heroA, 0, 3);
    const forceBefore = { bone: __debug.bone, mana: __debug.mana };
    const firstForceClick = __debug.forceHero(heroA);
    const secondForceClick = __debug.forceHero(heroA);
    __debug.devAssign(0, 'leader', heroA);
    const forcedHero = __debug.champs.find((hero) => hero.uid === heroA);
    const forcePaid = __debug.bone === forceBefore.bone - 300 && __debug.mana === forceBefore.mana - 100;
    const audit = __debug.uiBounds();
    return { relationLead: !!relationLead, sameSubjectBlocked, optimizedLore, facilityActionLock, facility, forcePaid, firstForceClick, secondForceClick, forcedHero, archive: !!archive, exactImpact: impactText.includes('怪物攻击+12%') && impactText.includes('3轮'), chronicle: chronicleIds.includes(archive?.id),
      battleDone: battleRun?.screen === 'result', facilityVisual, returnAdvanced, reportLinked: report?.storyRefs?.includes(archive?.id) && linkedArchive?.battleRefs?.includes(report.raidNo),
      exileLead: !!exileLead, exiles: __debug.story.exiles.length, violations: audit.violations };
  });
  assert(result.relationLead, 'Multi-hero relationship lead was not generated.');
  assert(result.sameSubjectBlocked, 'The same hero generated more than one lead in a single raid.');
  assert(result.optimizedLore?.personalityName === '账簿式冷静' && result.optimizedLore?.backgroundName === '欠薪墓园',
    'AI hero archive reconstruction did not persist its sanitized result.');
  assert(result.facilityActionLock, 'Facility build/upgrade was not limited to one action per raid.');
  assert(!result.firstForceClick && result.secondForceClick && result.forcePaid && result.forcedHero?.room === 0
    && result.forcedHero?.restTurns === 3, 'Resting hero force-deployment did not require confirmation, charge 300 bone/100 mana, or preserve rest.');
  assert(result.facility.persona === 'scarred' && result.facility.nickname, 'Facility personality did not awaken after repeated damage.');
  assert(result.archive && result.chronicle, 'Story archive or hero chronicle filtering failed.');
  assert(result.exactImpact, 'Resolved story choice did not display its exact numeric battle effect and duration.');
  assert(result.battleDone && result.reportLinked, 'Battle completion or report/story bidirectional linking failed.');
  assert(result.facilityVisual?.direct && result.facilityVisual.width === 92 && result.facilityVisual.height === 69,
    `Battle facility art is not a direct 92x69 transparent sprite: ${JSON.stringify(result.facilityVisual)}`);
  assert(result.returnAdvanced, 'Returning to management after a win did not advance exactly one raid.');
  assert(result.exileLead && result.exiles === 1, 'Dismissed hero encounter was not retained.');
  assert(result.violations.length === 0, `Bounded text overflow: ${JSON.stringify(result.violations)}`);

  await page.waitForFunction(() => __debug.reports[0]?.aiState === 'done', null, { timeout: 10000 });
  const literaryReport = await page.evaluate(() => __debug.reports[0]?.literary);
  assert(literaryReport?.title === '门轴与加班费' && literaryReport.chronicle.includes('账本比剑士完整'),
    'The literary battle report was not attached to the exact local battle record.');

  const contextualLead = await page.evaluate(() => {
    __debug.forceRaid(32);
    const hero = __debug.champs[0];
    return __debug.storyLeadQueue('smoke:ai-context', 'hero-talent-offense', '英雄秘闻', '旧档案重审',
      { ref: hero.uid, hero: hero.name, talent: '旧式破阵', talentDesc: '攻击强化' });
  });
  assert(contextualLead?.id, 'Could not queue the contextual-story fixture.');
  await page.evaluate((id) => __debug.storyLeadOpen(id), contextualLead.id);
  await page.waitForFunction(() => __debug.storyScene?.log?.[0]?.text.includes('旧账从柜底爬出来'), null, { timeout: 10000 });
  const contextualStory = await page.evaluate(() => ({
    scene: __debug.storyScene,
    chosen: __debug.storyChoose(0),
  }));
  assert(contextualStory.scene.who === '旧档案员' && contextualStory.scene.choices[0].label === '照旧办理'
    && contextualStory.chosen, 'Contextual story prose did not update while preserving a valid local choice.');

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
      assert(metrics.nativePortrait && metrics.portraitLayout?.native && !metrics.rootVisible, 'Portrait mode still renders the scaled desktop page.');
      assert(metrics.portraitLayout?.contentTop >= 56 && metrics.portraitLayout?.contentBottom < metrics.portraitLayout?.primaryY,
        'Native portrait content does not occupy its dedicated vertical region.');
      assert(metrics.portraitLayout?.bottom <= viewport.height, 'Portrait console exceeds the visible viewport.');
      const dungeonX = metrics.portraitLayout.margin + metrics.portraitLayout.buttonWidth + metrics.portraitLayout.gap + metrics.portraitLayout.buttonWidth / 2;
      await page.mouse.click(dungeonX, metrics.portraitLayout.tabTop + 19);
      assert(await page.evaluate(() => __debug.currentTab === 'dungeon'), 'Portrait tab navigation did not receive the click.');
      const dungeonMetrics = await page.evaluate(() => __debug.viewport());
      await page.mouse.click(dungeonMetrics.portraitLayout.menuButton.x + dungeonMetrics.portraitLayout.menuButton.w / 2,
        dungeonMetrics.portraitLayout.menuButton.y + dungeonMetrics.portraitLayout.menuButton.h / 2);
      const menuMetrics = await page.evaluate(() => __debug.viewport());
      assert(menuMetrics.portraitLayout.menuOpen && menuMetrics.portraitLayout.menuNew, 'Portrait system menu did not open.');
      await page.mouse.click(menuMetrics.portraitLayout.menuNew.x + menuMetrics.portraitLayout.menuNew.w / 2,
        menuMetrics.portraitLayout.menuNew.y + menuMetrics.portraitLayout.menuNew.h / 2);
      assert(await page.evaluate(() => __debug.newGameConfirm), 'Portrait new-game button did not receive the click.');
      await page.evaluate(() => __debug.cancelNewGame());
      const closeMetrics = await page.evaluate(() => __debug.viewport());
      await page.mouse.click(closeMetrics.portraitLayout.menuButton.x + closeMetrics.portraitLayout.menuButton.w / 2,
        closeMetrics.portraitLayout.menuButton.y + closeMetrics.portraitLayout.menuButton.h / 2);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => __debug.forceRaid(10));
  for (const targetTab of ['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story']) {
    await page.evaluate((id) => __debug.setTab(id), targetTab);
    await page.waitForTimeout(80);
    const nativePage = await page.evaluate(() => __debug.viewport());
    assert(nativePage.nativePortrait && nativePage.portraitLayout?.native && !nativePage.rootVisible,
      `Raid-ten portrait page ${targetTab} fell back to the desktop canvas.`);
  }
  await page.evaluate(() => __debug.setTab('hero'));
  await page.waitForTimeout(80);
  const portraitHeroUid = await page.evaluate(() => __debug.save.champs[0]?.uid);
  assert(portraitHeroUid, 'Raid-ten portrait test has no hero to open.');
  const portraitHeroOpen = await page.evaluate((uid) => __debug.viewport().portraitActions[`hero-open-${uid}`] ?? null, portraitHeroUid);
  assert(portraitHeroOpen, 'Portrait hero roster has no working detail action.');
  await page.mouse.click(portraitHeroOpen.x + portraitHeroOpen.w / 2, portraitHeroOpen.y + portraitHeroOpen.h / 2);
  await page.waitForTimeout(80);
  const portraitHeroDetail = await page.evaluate(() => __debug.viewport());
  assert(portraitHeroDetail.portraitActions.heroRosterBack, 'Portrait hero detail did not expose the roster back action.');
  await page.mouse.click(portraitHeroDetail.portraitActions.heroRosterBack.x + portraitHeroDetail.portraitActions.heroRosterBack.w / 2,
    portraitHeroDetail.portraitActions.heroRosterBack.y + portraitHeroDetail.portraitActions.heroRosterBack.h / 2);
  await page.waitForTimeout(80);
  const portraitHeroRoster = await page.evaluate((uid) => ({
    back: __debug.viewport().portraitActions.heroRosterBack ?? null,
    open: __debug.viewport().portraitActions[`hero-open-${uid}`] ?? null,
  }), portraitHeroUid);
  assert(!portraitHeroRoster.back && portraitHeroRoster.open, 'Portrait hero roster back action did not return to the roster.');
  await page.evaluate(() => __debug.openDetail('竖屏详情', '这是一段用于确认原生竖屏详情卡片和关闭操作的测试文本。'));
  await page.waitForTimeout(80);
  const nativeDetail = await page.evaluate(() => __debug.viewport());
  assert(nativeDetail.nativePortrait && nativeDetail.portraitActions.primary, 'Portrait detail popup fell back to the desktop canvas.');
  await page.mouse.click(nativeDetail.portraitActions.primary.x + nativeDetail.portraitActions.primary.w / 2,
    nativeDetail.portraitActions.primary.y + nativeDetail.portraitActions.primary.h / 2);
  await page.evaluate(() => __debug.smithOpen());
  await page.waitForTimeout(100);
  const portraitWorkbench = await page.evaluate(() => __debug.viewport());
  assert(portraitWorkbench.portraitLayout?.nativeModal && portraitWorkbench.portraitActions.modalClose,
    'Portrait equipment workbench did not open as a complete centered modal.');
  await page.mouse.click(portraitWorkbench.portraitActions.modalClose.x + portraitWorkbench.portraitActions.modalClose.w / 2,
    portraitWorkbench.portraitActions.modalClose.y + portraitWorkbench.portraitActions.modalClose.h / 2);

  // The post-clear overtime screen must remain fully inside its logical canvas
  // before large-screen scaling, and its primary action must still be clickable.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => __debug.devEnding());
  await page.waitForTimeout(100);
  const endingLayout = await page.evaluate(() => __debug.endingLayout);
  assert(endingLayout?.action && endingLayout?.rebirth && endingLayout.bounds.x >= 0 && endingLayout.bounds.y >= 0
    && endingLayout.bounds.right <= 480 && endingLayout.bounds.bottom <= 270,
  `Overtime ending screen exceeds the 480x270 logical viewport: ${JSON.stringify(endingLayout)}`);
  const endingButton = await page.evaluate((action) => __debug.toScreen(action.x + action.w / 2, action.y + action.h / 2), endingLayout.action);
  await page.mouse.click(endingButton.x, endingButton.y);
  await page.waitForTimeout(80);
  assert(await page.evaluate(() => __debug.overtime.on && __debug.screen === 'manage'), 'Large-screen overtime action did not receive the click.');

  // Native portrait onboarding must be playable without exposing or clicking the hidden desktop canvas.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.removeItem('yqh-save-v2'));
  await page.reload();
  await page.waitForFunction(() => window.__gpReady && window.__debug?.viewport()?.portrait);
  const clickPortraitAction = async (name) => {
    const rect = await page.evaluate((key) => __debug.viewport().portraitActions[key] ?? null, name);
    assert(rect, `Missing native portrait action: ${name}`);
    await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
    await page.waitForTimeout(80);
  };
  await clickPortraitAction('titleNew');
  assert(await page.evaluate(() => __debug.viewport().nativePortrait), 'Portrait new game did not enter the native management layout.');
  await clickPortraitAction('nav-mob');
  await clickPortraitAction('recruit-slime');
  await clickPortraitAction('recruit-archer');
  await clickPortraitAction('nav-dungeon');
  const portraitUnits = await page.evaluate(() => ({
    slime: __debug.monsters.find((unit) => unit.kind === 'slime')?.uid,
    archer: __debug.monsters.find((unit) => unit.kind === 'archer')?.uid,
  }));
  await clickPortraitAction(`deploy-front-${portraitUnits.slime}`);
  await clickPortraitAction(`deploy-back-${portraitUnits.archer}`);
  await clickPortraitAction('nav-throne');
  assert(await page.evaluate(() => __debug.progression.deploymentReady && __debug.progression.tutorialStep >= 6), 'Native portrait deployment did not complete the tutorial state.');
  await clickPortraitAction('primary');
  assert(await page.evaluate(() => __debug.raidBriefing?.no === 1), 'Portrait onboarding did not open the first raid briefing.');
  await clickPortraitAction('raidBriefingFight');
  assert(await page.evaluate(() => __debug.screen === 'battle' && __debug.battle?.heroesAlive === 1), 'Native portrait flow did not start the one-enemy teaching battle.');
  const portraitBattle = await page.evaluate(() => __debug.viewport());
  assert(portraitBattle.portraitLayout?.logicalLeft === 0 && portraitBattle.portraitLayout?.logicalWidth === 480,
    'Portrait battle still crops the sides of the combat viewport.');

  // The permanent clear marker must unlock exactly four doctrines on future new games.
  await page.evaluate(() => {
    localStorage.setItem('yqh-meta-v1', JSON.stringify({ clears: 1 }));
    localStorage.removeItem('yqh-save-v2');
  });
  await page.reload();
  await page.waitForFunction(() => window.__gpReady && window.__debug?.screen === 'title');
  await page.evaluate(() => __debug.titleNew());
  const doctrineTitle = await page.evaluate(() => ({ title: __debug.title, actions: __debug.viewport().portraitActions }));
  assert(doctrineTitle.title.mode === 'doctrine'
    && ['default', 'swarm', 'elite', 'economy'].every((id) => doctrineTitle.actions[`doctrine-${id}`]),
  'A permanent clear did not unlock all four starting doctrines.');
  await page.evaluate(() => { __debug.titlePick('economy'); __debug.titleConfirm(); });
  assert(await page.evaluate(() => __debug.screen === 'manage' && __debug.save.doctrine === 'economy'),
    'The selected starting doctrine was not persisted into the new run.');

  assert(errors.length === 0, `Browser errors:\n${errors.join('\n')}`);
  console.log('Browser smoke passed: boot, legacy save, story/facility flows, battle/report links, constrained text, landscape touch targets and portrait controls.');
} finally {
  await browser?.close();
  server.kill();
}
