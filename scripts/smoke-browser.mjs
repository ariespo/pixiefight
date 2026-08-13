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
  assert(await page.evaluate(() => __debug.identityOpen), 'First new game did not request the lord and dungeon names.');
  await page.click('[data-roll="lord"]');
  await page.click('[data-roll="lair"]');
  await page.fill('[data-id="lord"]', '测试魔王');
  await page.fill('[data-id="lair"]', '自动化地牢');
  await page.click('[data-confirm]');
  await page.waitForFunction(() => __debug.screen === 'intro', null, { timeout: 10000 });
  assert(await page.evaluate(() => __debug.screen === 'intro' && __debug.save.playerName === '测试魔王' && __debug.save.lairName === '自动化地牢'), 'Named new game did not open its personalized intro.');
  await page.evaluate(() => __debug.introContinue());
  assert(await page.evaluate(() => __debug.screen === 'manage'), 'Opening story did not enter management mode.');

  // 长期事件链：六场临时战斗逐段升级，结算不推进主线，终局写入永久路线效果。
  const eventChain = await page.evaluate(async () => {
    const original = __debug.rawSave;
    __debug.forceRaid(5); __debug.giveResources(9999, 9999);
    while (!__debug.progression.teachingComplete) {
      const target = __debug.progression.guide?.[0];
      if (['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(target) && target !== __debug.currentTab) __debug.setTab(target);
      __debug.ackGuide();
    }
    const guard = __debug.devRecruit('slime'); __debug.devAssign(0, 'front', guard); __debug.setTab('throne');
    const startRaid = __debug.save.raidNo;
    const stages = [];
    for (const [stage, route] of [[1, 'shelter'], [2, 'names'], [3, 'strike'], [4, 'burnLedger'], [5, 'protect'], [6, 'freedom']]) {
      const issued = __debug.devStoryEncounter('death', stage, route);
      const encounter = __debug.storyEncounter;
      await __debug.startBattle(); if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
      __debug.devSettleWin(3); const wonTitle = __debug.save.reports[0]?.title; __debug.returnResult();
      if (__debug.detail) __debug.closeDetail();
      stages.push({ issued, encounter, wonTitle, raid: __debug.save.raidNo, chain: __debug.storyChains.death });
    }
    const result = { startRaid, stages, finalBone: __debug.save.bone, finalMana: __debug.save.mana,
      permanent: __debug.save.story.mods.find((mod) => mod.id === 'death-freed'), encounter: __debug.storyEncounter };
    const legacy = JSON.parse(original);
    legacy.raidNo = 10;
    legacy.story.chains = { death: { id: 'death', stage: 3, status: 'complete', ending: 'freedom', completedRaid: 8, history: [] } };
    await __debug.restoreRaw(JSON.stringify(legacy));
    result.legacyExtension = { chain: __debug.storyChains.death,
      fourth: __debug.save.story.leads.find((lead) => lead.key === 'campaign:death:4') };
    await __debug.restoreRaw(original);
    return result;
  });
  assert(eventChain.stages.every((stage) => stage.issued.ok && stage.encounter && stage.raid === eventChain.startRaid)
    && eventChain.stages[0].encounter.reward.bone === 106 && eventChain.stages[0].encounter.reward.mana === 22
    && eventChain.stages.every((stage) => stage.encounter.rewardLevel < 20)
    && eventChain.stages[0].chain.nextDueRaid === eventChain.startRaid + 1
    && eventChain.stages[1].chain.nextDueRaid === eventChain.startRaid + 2
    && eventChain.stages[2].chain.nextDueRaid === eventChain.startRaid + 1
    && eventChain.stages[3].chain.nextDueRaid === eventChain.startRaid + 2
    && eventChain.stages[4].chain.nextDueRaid === eventChain.startRaid + 1
    && eventChain.stages[5].chain.status === 'complete' && eventChain.stages[5].chain.ending === 'freedom'
    && eventChain.legacyExtension.chain?.status === 'waiting' && eventChain.legacyExtension.chain?.legacyEnding === 'freedom'
    && eventChain.legacyExtension.fourth?.dueRaid === 10
    && eventChain.permanent?.raids === -1 && !eventChain.encounter,
  `Long-term event chain did not settle six temporary battles safely: ${JSON.stringify(eventChain)}`);

  // AI 设置必须走“地址/Key → 刷新模型 → 选择模型 → 保存”的完整链路。
  let requestedModel = '';
  let requestedPrompt = '';
  let dialogueApiCalls = 0;
  const dialogueTokenBudgets = [];
  await page.route('https://api.example.test/v1/models', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'test-model-a' }, { id: 'test-model-b' }] }) });
  });
  await page.route('https://api.example.test/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON() ?? {};
    requestedModel = body.model ?? '';
    const prompt = body.messages?.at(-1)?.content ?? '';
    requestedPrompt = prompt;
    let content;
    if (prompt.includes('小说战役签发下一场')) content = { title: '会计骑士催缴队', body: '王国会计发现地下城从未申报活体报表，决定带队现场核销。',
      members: [{ cls: 'captain', lv: 23 }, { cls: 'knight', lv: 22 }, { cls: 'cleric', lv: 22 }, { cls: 'mage', lv: 22 }, { cls: 'rogue', lv: 22 }],
      affixes: ['brave'], objective: { type: 'breachLimit', maxBreaches: 1 }, rewardMult: 1.4, penalty: 'resource' };
    else if (prompt.includes('小说战役叙事者')) content = { body: '战后的账房里，巫妖把伤亡名单订成了员工手册。新来的幽灵坚持要求补发入职日期。',
      choices: ['补签昨天的入职日期，并要求账房逐字记录这份跨越死亡与欠薪的正式声明', '承认工龄', '把手册埋回去'], facts: { relations: ['幽灵开始信任巫妖'], promises: [], threads: ['员工手册仍会翻页'], places: ['战后账房'] } };
    else if (prompt.includes('维护小说战役的长期记忆')) content = { summary: '地牢的员工手册开始自行记录伤亡。', facts: { relations: ['幽灵开始信任巫妖'], promises: [], threads: ['员工手册仍会翻页'], places: ['战后账房'] } };
    else if (prompt.includes('生成极短战斗台词')) {
      dialogueApiCalls++;
      dialogueTokenBudgets.push(body.max_tokens);
      content = { opening: [{ key: 'hero:剑士', text: '这次差旅没有返程票。' }], units: [
        { key: 'hero:剑士', a: '剑先替我问路。', s: '这一剑不留遗言。', r: '伤口比地图诚实。' },
        { key: 'mon:史莱姆', a: '黏糊糊地问好。', s: '整桶一起撞过去。', r: '漏一点还能爬。' },
        { key: 'mon:骷髅弓手', a: '箭从骨缝里走。', s: '后排也能送葬。', r: '那根骨头本就松。' },
      ] };
    }
    else if (prompt.includes('战地书记')) content = { title: '门轴与加班费', summary: '剑士按规定入侵，按事故离场。',
      chronicle: '门轴响了第一声，守军便开始计算抚恤。\n\n战斗结束时，账本比剑士完整。', highlights: ['所有数字仍由原始战报作证。'] };
    else if (prompt.includes('地牢编年史作者')) content = { who: '旧档案员', text: '旧账从柜底爬出来，准确叫出了当事人的名字。',
      choices: [{ index: 0, label: '照旧办理', reply: '印章落下，原有效果一项不少。' }] };
    else if (prompt.includes('重构一名英雄档案')) content = { personalityName: '账簿式冷静',
      personalityDesc: '越危险越先核对伤亡与欠款，仿佛死亡只是一张填错栏目的表。',
      backgroundName: '欠薪墓园', backgroundStory: '他曾替一座墓园守夜，领到的薪水只有逝者留下的道歉。后来账本自行补上了地牢地址，他便带着旧钥匙来讨一份不会拖欠的差事。' };
    else if (prompt.includes('全新的随机短事件')) content = { title: '自动售后窗口', who: '窗口职员', text: '一扇窗口要求地牢证明自己仍在营业。',
      choices: [{ label: '交表', reply: '表格收走了。', effects: [{ t: 'res', bone: -5 }] }, { label: '关窗', reply: '窗口失业了。', effects: [{ t: 'res', bone: 5 }] }, { label: '招人', reply: '窗口开始收费。', effects: [{ t: 'res', mana: 2 }] }] };
    else if (prompt.includes('亲自写下处理方式')) content = { reply: '窗口接受了玩家的即兴行政命令，并开出一张有损耗的收据。', effects: [{ t: 'res', bone: 12, mana: -2 }] };
    else if (prompt.includes('无尽模式下一批勇者')) content = { title: '线上报销远征', body: '六名勇者为争夺同一张差旅报销单来到地牢。', reply: '请按死亡顺序排队。',
      members: [{ cls: 'captain', lv: 23 }, { cls: 'knight', lv: 22 }, { cls: 'cleric', lv: 22 }, { cls: 'mage', lv: 22 }, { cls: 'rogue', lv: 22 }], affixes: ['brave', 'shield'] };
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
  const firstApiTour = await page.evaluate(() => __debug.onlineModeTour);
  assert(firstApiTour.open && firstApiTour.count === 1 && firstApiTour.step === '0',
    `First successful API connection did not open the online-mode tutorial: ${JSON.stringify(firstApiTour)}`);
  for (let i = 0; i < 6; i++) await page.click('#online-mode-tour [data-tour="next"]');
  const completedApiTour = await page.evaluate(() => __debug.onlineModeTour);
  assert(!completedApiTour.open && completedApiTour.step === 'done', 'Online-mode tutorial did not complete and persist its one-time state.');
  await page.evaluate(() => __debug.aiSettingsOpen());
  await page.click('[data-ai="enabled"]');
  const disabledAi = await page.evaluate(() => __debug.llm);
  await page.click('[data-ai="enabled"]');
  const reenabledAi = await page.evaluate(() => __debug.llm);
  await page.click('[data-ai="close"]');
  assert(disabledAi.mode === 'echo' && disabledAi.cfg?.enabled === false && reenabledAi.mode === 'http' && reenabledAi.cfg?.enabled === true,
    `AI master switch did not preserve and restore the saved connection: ${JSON.stringify({ disabledAi, reenabledAi })}`);
  const customDeletion = await page.evaluate(async () => {
    const original = __debug.rawSave;
    const fixture = JSON.parse(original);
    fixture.raidNo = 5; fixture.bone = 9999; fixture.mana = 9999; fixture.relic = 99; fixture.monsterCap = 14;
    await __debug.restoreRaw(fixture);
    __debug.openStitch(); __debug.setStitchName('待删图纸'); __debug.confirmStitch();
    const custom = __debug.customs.at(-1);
    const unit = __debug.monsters.find((monster) => monster.kind === custom?.id);
    const blockedWhileOwned = custom ? !__debug.deleteCustomKind(custom.id) : false;
    if (unit) __debug.dismantle(unit.uid);
    const blueprintKeptAfterDismissal = !!__debug.customs.find((item) => item.id === custom?.id);
    const firstDeleteIsConfirmation = custom ? !__debug.deleteCustomKind(custom.id) : false;
    const secondDeleteRemoves = custom ? __debug.deleteCustomKind(custom.id) : false;
    const removed = !__debug.customs.some((item) => item.id === custom?.id);
    await __debug.restoreRaw(original);
    return { blockedWhileOwned, blueprintKeptAfterDismissal, firstDeleteIsConfirmation, secondDeleteRemoves, removed };
  });
  assert(customDeletion.blockedWhileOwned && customDeletion.blueprintKeptAfterDismissal && customDeletion.firstDeleteIsConfirmation
    && customDeletion.secondDeleteRemoves && customDeletion.removed, `Custom recruit blueprint deletion is unsafe or incomplete: ${JSON.stringify(customDeletion)}`);
  await page.evaluate(() => __debug.novelPromptsOpen());
  assert(await page.locator('#novel-prompt-manager nav button').count() === 3, 'Novel prompt manager did not separate daily, mission and memory pipelines.');
  await page.click('#novel-prompt-manager .npm-add');
  const lastNovelEntry = page.locator('#novel-prompt-manager .npm-entry').last();
  await lastNovelEntry.locator('[data-name]').fill('自动化风格条目');
  await lastNovelEntry.locator('[data-content]').fill('小说自动化测试：每次提到报表时保持严肃。');
  await lastNovelEntry.locator('[data-up]').click();
  await page.click('#novel-prompt-manager [data-npm="save"]');
  const novelPromptStructure = await page.evaluate(() => __debug.novelPrompts.novelTurn);
  assert(novelPromptStructure.some((entry) => entry.name === '自动化风格条目')
    && novelPromptStructure.at(-2)?.name === '自动化风格条目', `Novel prompt entry was not added/reordered: ${JSON.stringify(novelPromptStructure)}`);
  await page.click('#novel-prompt-manager [data-npm="close"]');
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
  const aiRumor = await page.evaluate(async () => {
    __debug.closeForge(); __debug.storyCredits(1); await __debug.storyDraw();
    const opened = __debug.storyScene;
    await __debug.storySay('把窗口改成怪物食堂的取餐口');
    return { opened, archived: __debug.story.archive[0], bone: __debug.bone, mana: __debug.mana };
  });
  assert(aiRumor.opened?.kind === 'input' && aiRumor.archived?.title === '自动售后窗口'
    && aiRumor.archived?.outcome.includes('即兴行政命令'), `AI free-response rumor did not resolve: ${JSON.stringify(aiRumor)}`);
  const beforeOnlineSave = await page.evaluate(() => __debug.rawSave);
  const onlineRaid = await page.evaluate(async () => {
    __debug.storyLeave();
    const uid = __debug.monsters[0]?.uid ?? __debug.devRecruit('slime');
    __debug.devAssign(0, 'front', uid);
    __debug.devOvertime(21); await __debug.startBattle();
    return { briefing: __debug.raidBriefing, raid: __debug.currentRaid, mode: __debug.llm.mode, tasks: __debug.uiTasks, screen: __debug.screen };
  });
  assert(onlineRaid.briefing?.title === '线上报销远征' && onlineRaid.briefing.body.includes('差旅报销单')
    && onlineRaid.raid.affixes.includes('brave'), `AI overtime raid was not generated before battle: ${JSON.stringify(onlineRaid)}`);
  await page.evaluate(async (raw) => { await __debug.restoreRaw(raw); }, beforeOnlineSave);
  await page.evaluate(() => __debug.backManage());
  await page.evaluate(() => __debug.closeForge());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => __debug.aiSettingsOpen());
  const aiPanelBox = await page.locator('#ai-settings-overlay > div').boundingBox();
  assert(aiPanelBox && aiPanelBox.x >= 0 && aiPanelBox.y >= 0 && aiPanelBox.x + aiPanelBox.width <= 390
    && aiPanelBox.y + aiPanelBox.height <= 844, 'AI settings panel exceeds the portrait viewport.');
  await page.evaluate(() => __debug.aiSettingsClose());
  await page.evaluate(() => __debug.novelPromptsOpen());
  const novelPromptBox = await page.locator('#novel-prompt-manager .npm-card').boundingBox();
  assert(novelPromptBox && novelPromptBox.x >= 0 && novelPromptBox.y >= 0 && novelPromptBox.x + novelPromptBox.width <= 390
    && novelPromptBox.y + novelPromptBox.height <= 844, 'Novel prompt manager exceeds the portrait viewport.');
  await page.evaluate(() => __debug.novelPromptsClose());
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
    const initialBattle = __debug.battle;
    const beforeAbort = { raidNo: __debug.save.raidNo, bone: __debug.save.bone, mana: __debug.save.mana, reports: __debug.reports.length };
    const liveDialogue = __debug.stepBattleForTest(240);
    const battle = { ...initialBattle, liveDialogue };
    const abort = __debug.abortBattle();
    const unlocks = {};
    for (const raid of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
      __debug.forceRaid(raid);
      const before = __debug.progression;
      while (!__debug.progression.teachingComplete) {
        const target = __debug.progression.guide?.[0];
        const taskPage = ['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(target) ? target
          : __debug.currentTab;
        if (taskPage !== __debug.currentTab) __debug.setTab(taskPage);
        __debug.ackGuide();
      }
      unlocks[raid] = { tabs: before.visibleTabs, pages: before.visiblePages, kinds: before.recruitKinds, guide: before.guide, features: before.features,
        heroGift: before.heroGift, tutorialTotal: before.roundTutorialTotal, complete: __debug.progression.teachingComplete };
    }
    return { initial, hiddenRouteBlocked, afterSlime, ready, briefing, briefingArchived, battle, beforeAbort, abort, unlocks };
  });
  assert(onboarding.abort.ok && onboarding.abort.screen === 'manage'
    && onboarding.abort.raidNo === onboarding.beforeAbort.raidNo
    && onboarding.abort.bone === onboarding.beforeAbort.bone && onboarding.abort.mana === onboarding.beforeAbort.mana
    && onboarding.abort.reports === onboarding.beforeAbort.reports,
  `Exiting battle did not restore the pre-settlement management state: ${JSON.stringify(onboarding)}`);
  assert(onboarding.abort.failure?.count === 1, `Mid-battle exit was not recorded as a failed attempt: ${JSON.stringify(onboarding.abort)}`);
  assert(JSON.stringify(onboarding.initial.visibleTabs) === JSON.stringify(['throne', 'dungeon', 'army'])
    && JSON.stringify(onboarding.initial.visiblePages) === JSON.stringify(['throne', 'dungeon', 'mob']),
  `First raid exposed locked pages: ${JSON.stringify(onboarding.initial)}`);
  assert(onboarding.initial.enemyClasses.length === 1 && onboarding.initial.enemyClasses[0] === 'knight', 'First raid is not a single swordsman.');
  assert(onboarding.hiddenRouteBlocked, 'A hidden page was still reachable directly.');
  assert(onboarding.afterSlime.tutorialStep === 2 && onboarding.ready.tutorialStep === 6 && onboarding.ready.deploymentReady, 'Guided recruitment/deployment did not advance.');
  assert(onboarding.briefing?.no === 1 && onboarding.briefing.body.includes('地牢'),
    `First raid did not show its pre-battle campaign story: ${JSON.stringify({ briefing: onboarding.briefing, ready: onboarding.ready, battle: onboarding.battle })}`);
  assert(onboarding.briefingArchived, 'Confirmed campaign briefing was not added to the chronicle.');
  assert(onboarding.battle?.heroesAlive === 1, 'Guided battle did not start against one enemy.');
  assert(onboarding.battle?.dialoguePack?.opening?.[0]?.text === '这次差旅没有返程票。',
    'The selected AI model did not provide the pre-battle dialogue pack.');
  assert(onboarding.battle?.dialoguePack?.stats?.coreCovered === onboarding.battle?.dialoguePack?.stats?.expected
    && onboarding.battle?.dialogue?.some((line) => line.text === '这次差旅没有返程票。') && onboarding.battle?.aiDialogueUsed > 0
    && onboarding.battle?.liveDialogue?.dialogue.some((line) => ['剑先替我问路。', '这一剑不留遗言。', '伤口比地图诚实。', '黏糊糊地问好。', '整桶一起撞过去。', '漏一点还能爬。'].includes(line.text)),
  `AI dialogue was parsed but did not enter the live battle dialogue stream: ${JSON.stringify(onboarding.battle?.dialoguePack)}`);
  assert(dialogueApiCalls === 1 && dialogueTokenBudgets[0] <= 1600,
    `Battle dialogue did not stay within the single-call lightweight budget: ${JSON.stringify({ dialogueApiCalls, dialogueTokenBudgets })}`);
  assert(onboarding.unlocks[2].tabs.includes('archive') && onboarding.unlocks[2].pages.includes('report') && !onboarding.unlocks[2].pages.includes('hero'), 'Raid 2 unlock schedule is incorrect.');
  assert(!onboarding.unlocks[3].pages.includes('hero') && !onboarding.unlocks[3].tabs.includes('shop'), 'Raid 3 unlock schedule is incorrect.');
  assert(onboarding.unlocks[4].tabs.includes('shop') && !onboarding.unlocks[4].pages.includes('story') && !onboarding.unlocks[4].pages.includes('hero'), 'Raid 4 unlock schedule is incorrect.');
  assert(onboarding.unlocks[5].pages.includes('story') && !onboarding.unlocks[5].pages.includes('hero'), 'Raid 5 unlock schedule is incorrect.');
  assert(onboarding.unlocks[6].tabs.includes('army') && onboarding.unlocks[6].pages.includes('hero') && onboarding.unlocks[6].guide?.[0] === 'hero', 'Raid 6 did not introduce the hero page.');
  assert(onboarding.unlocks[2].kinds.includes('goblin') && onboarding.unlocks[2].kinds.includes('bat') && !onboarding.unlocks[2].kinds.includes('shaman'), 'Raid 2 troop unlocks are incorrect.');
  assert(onboarding.unlocks[3].kinds.includes('shaman') && !onboarding.unlocks[3].kinds.includes('ogre'), 'Raid 3 troop unlocks are incorrect.');
  assert(onboarding.unlocks[4].kinds.includes('ogre') && !onboarding.unlocks[4].kinds.includes('lich'), 'Raid 4 troop unlocks are incorrect.');
  assert(onboarding.unlocks[5].kinds.includes('elite-lich') && Object.values(onboarding.unlocks).every((x) => x.complete && x.guide), 'Round teaching did not complete or lacked guidance.');
  assert(onboarding.unlocks[6].heroGift?.race === 'lich' && onboarding.unlocks[6].heroGift?.potential === 0, 'Raid 6 did not grant the potential-C lich hero.');
  assert(!onboarding.unlocks[6].features.equipmentForge && !onboarding.unlocks[6].features.heroTalent && !onboarding.unlocks[6].features.heroGraft, 'Raid 6 exposed advanced hero systems too early.');
  assert(onboarding.unlocks[7].features.equipmentForge && !onboarding.unlocks[7].features.heroTalent, 'Raid 7 forge unlock is incorrect.');
  assert(onboarding.unlocks[8].features.heroTalent && !onboarding.unlocks[8].features.heroGraft, 'Raid 8 talent unlock is incorrect.');
  assert(onboarding.unlocks[9].features.heroGraft, 'Raid 9 hero graft did not unlock.');
  assert([11, 12, 13, 14, 15, 16, 17, 18, 19, 20].every((raid) => onboarding.unlocks[raid].tutorialTotal > 0
    && onboarding.unlocks[raid].guide && onboarding.unlocks[raid].complete),
  `Mid/late-game tutorials are incomplete: ${JSON.stringify(onboarding.unlocks)}`);

  const rawBeforeFailedBattle = await page.evaluate(() => __debug.rawSave);
  const failedRollback = await page.evaluate(async () => {
    __debug.setTab('throne');
    const before = {
      raidNo: __debug.save.raidNo, bone: __debug.save.bone, mana: __debug.save.mana, relic: __debug.save.relic,
      monster: __debug.save.monsters[0] ? structuredClone(__debug.save.monsters[0]) : null,
      hero: __debug.save.champs[0] ? structuredClone(__debug.save.champs[0]) : null,
      floors: structuredClone(__debug.save.floors), credits: __debug.save.story.credits, mods: structuredClone(__debug.save.story.mods), reports: __debug.reports.length,
    };
    await __debug.startBattle(); if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
    const settled = __debug.devSettleLoss();
    const after = {
      raidNo: __debug.save.raidNo, bone: __debug.save.bone, mana: __debug.save.mana, relic: __debug.save.relic,
      monster: __debug.save.monsters[0] ? structuredClone(__debug.save.monsters[0]) : null,
      hero: __debug.save.champs[0] ? structuredClone(__debug.save.champs[0]) : null,
      floors: structuredClone(__debug.save.floors), credits: __debug.save.story.credits, mods: structuredClone(__debug.save.story.mods), reports: __debug.reports.length,
    };
    __debug.returnResult();
    return { before, after, settled, screen: __debug.screen };
  });
  assert(failedRollback.settled?.rolledBack && failedRollback.screen === 'manage'
    && failedRollback.after.reports === failedRollback.before.reports + 1
    && failedRollback.after.raidNo === failedRollback.before.raidNo
    && failedRollback.after.bone === failedRollback.before.bone && failedRollback.after.mana === failedRollback.before.mana
    && failedRollback.after.relic === failedRollback.before.relic
    && JSON.stringify(failedRollback.after.monster) === JSON.stringify(failedRollback.before.monster)
    && JSON.stringify(failedRollback.after.hero) === JSON.stringify(failedRollback.before.hero)
    && JSON.stringify(failedRollback.after.floors) === JSON.stringify(failedRollback.before.floors)
    && failedRollback.after.credits === failedRollback.before.credits
    && JSON.stringify(failedRollback.after.mods) === JSON.stringify(failedRollback.before.mods),
  `Failed battle leaked settlement damage into management: ${JSON.stringify(failedRollback)}`);
  await page.evaluate(async (raw) => { await __debug.restoreRaw(raw); }, rawBeforeFailedBattle);

  const reliefFlow = await page.evaluate(async () => {
    __debug.forceRaid(20);
    const hero = __debug.save.champs[0];
    if (hero) { __debug.devFatigue(hero.uid, 88); __debug.devRotation(hero.uid, 3, 2); }
    const initial = { bone: __debug.save.bone, mana: __debug.save.mana, heroXp: hero?.xp ?? 0 };
    const attempts = [];
    for (let i = 1; i <= 5; i++) {
      await __debug.startBattle(); if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
      if (i === 1) __debug.devSettleWin(2); else __debug.devSettleLoss();
      __debug.returnResult();
      attempts.push({ i, state: structuredClone(__debug.failureRelief), bone: __debug.save.bone, mana: __debug.save.mana,
        hero: __debug.save.champs[0] ? { xp: __debug.save.champs[0].xp, fatigue: __debug.save.champs[0].fatigue,
          restTurns: __debug.save.champs[0].restTurns, sorties: __debug.save.champs[0].sorties } : null });
      if (__debug.detail) __debug.closeDetail();
    }
    return { initial, attempts, raidNo: __debug.save.raidNo };
  });
  const aid2 = reliefFlow.attempts[1], aid5 = reliefFlow.attempts[4];
  assert(reliefFlow.attempts[0].state.states['campaign:20']?.count === 1
    && reliefFlow.attempts[0].state.detail?.title === undefined
    && aid2.state.states['campaign:20']?.count === 2 && aid2.state.states['campaign:20']?.aid2
    && aid2.state.detail?.title === '魔神的第一次围观'
    && aid2.bone > reliefFlow.initial.bone && aid2.mana > reliefFlow.initial.mana,
  `Two-failure resource relief did not trigger from a partial victory plus defeat: ${JSON.stringify(reliefFlow)}`);
  assert(aid5.state.states['campaign:20']?.count === 5 && aid5.state.states['campaign:20']?.aid5
    && aid5.state.detail?.title === '魔神终于看不下去了'
    && (!aid5.hero || (aid5.hero.fatigue === 0 && aid5.hero.restTurns === 0 && aid5.hero.sorties === 0
      && aid5.hero.xp >= reliefFlow.initial.heroXp + 1000)),
  `Five-failure hero relief did not clear fatigue and grant XP: ${JSON.stringify(reliefFlow)}`);

  const restFatigue = await page.evaluate(async () => {
    const original = __debug.rawSave;
    const uid = __debug.champs[0]?.uid ?? __debug.devChamp('lich', 2, []);
    __debug.giveResources(0, 100);
    __debug.devUtility(0, 'healing', 1, 100);
    __debug.devFatigue(uid, 75); __debug.devRotation(uid, 0, 1);
    const manaBefore = __debug.mana;
    __debug.devRest(uid);
    const healed = structuredClone(__debug.champs.find((hero) => hero.uid === uid));
    const manaAfter = __debug.mana;
    __debug.devFatigue(uid, 75); __debug.devRotation(uid, 0, 1);
    __debug.devTickFatigue([]);
    const rested = structuredClone(__debug.champs.find((hero) => hero.uid === uid));
    await __debug.restoreRaw(original);
    return { manaBefore, manaAfter, healed, rested };
  });
  assert(restFatigue.healed?.restTurns === 0 && restFatigue.healed?.fatigue === 0 && restFatigue.healed?.sorties === 0
    && restFatigue.manaAfter === restFatigue.manaBefore - 20
    && restFatigue.rested?.restTurns === 0 && restFatigue.rested?.fatigue === 0 && restFatigue.rested?.sorties === 0,
  `Completed healing/rest rotation did not clear fatigue: ${JSON.stringify(restFatigue)}`);

  const uiArchitecture = await page.evaluate(() => {
    __debug.uiTourSkip();
    __debug.setTab('mob');
    const armyFromLegacy = __debug.uiRoute;
    __debug.setTab('army');
    const armyFromZone = __debug.uiRoute;
    __debug.setTab('report');
    const archiveFromLegacy = __debug.uiRoute;
    const rawBeforeDensity = __debug.rawSave;
    __debug.uiDensity('expert');
    const expert = { route: __debug.uiRoute, stored: localStorage.getItem('yqh-ui-density-v1'), raw: __debug.rawSave };
    __debug.uiDensity('standard');
    __debug.save.rooms.forEach((room) => { room.front = null; room.back = null; room.leader = null; room.flank = null; });
    __debug.forceRaid(20);
    const blockedTasks = __debug.uiTasks;
    const blockerRoute = __debug.uiTaskOpen('empty-defense');
    const monster = __debug.monsters[0] ?? { uid: __debug.devRecruit('slime') };
    __debug.devAssign(0, 'front', monster.uid);
    const unblockedTasks = __debug.uiTasks;
    return { armyFromLegacy, armyFromZone, archiveFromLegacy, rawBeforeDensity, expert, blockedTasks, blockerRoute, unblockedTasks };
  });
  assert(uiArchitecture.armyFromLegacy.zone === 'army' && uiArchitecture.armyFromLegacy.section === 'mob'
    && uiArchitecture.armyFromZone.zone === 'army', 'Legacy and five-zone army routes are not compatible.');
  assert(uiArchitecture.archiveFromLegacy.zone === 'archive' && uiArchitecture.archiveFromLegacy.section === 'report',
    'Legacy report route did not map into the archive zone.');
  assert(uiArchitecture.expert.route.density === 'expert' && uiArchitecture.expert.stored === 'expert'
    && uiArchitecture.expert.raw === uiArchitecture.rawBeforeDensity, 'Expert density was not local-only or did not persist.');
  assert(uiArchitecture.blockedTasks.some((task) => task.id === 'empty-defense' && task.blocking)
    && uiArchitecture.blockerRoute === 'dungeon' && !uiArchitecture.unblockedTasks.some((task) => task.id === 'empty-defense'),
  `UI task blocking or direct navigation is incorrect: ${JSON.stringify(uiArchitecture)}`);
  const exchange = await page.evaluate(() => {
    const before = { bone: __debug.bone, mana: __debug.mana };
    __debug.exchange('bone-to-mana');
    const middle = { bone: __debug.bone, mana: __debug.mana };
    __debug.exchange('mana-to-bone');
    return { before, middle, after: { bone: __debug.bone, mana: __debug.mana } };
  });
  assert(exchange.middle.bone === exchange.before.bone - 25 && exchange.middle.mana === exchange.before.mana + 4
    && exchange.after.bone === exchange.middle.bone + 20 && exchange.after.mana === exchange.middle.mana - 5,
  `Lossy bone/mana exchange drifted from the 5:1, 20% design: ${JSON.stringify(exchange)}`);

  await page.evaluate(() => { __debug.setTab('throne'); __debug.forceRaid(20); });
  const affixPoint = await page.evaluate(() => __debug.toScreen(147, 46));
  await page.mouse.click(affixPoint.x, affixPoint.y);
  await page.waitForTimeout(50);
  const raidAffixDetail = await page.evaluate(() => ({ detail: __debug.detail, raid: __debug.currentRaid }));
  assert(raidAffixDetail.detail?.title === '急行 IV' && raidAffixDetail.detail.body.includes('本轮效果：12秒')
    && raidAffixDetail.raid.affixDetails.every((affix) => affix.level === 4 && affix.roman === 'IV'),
  `Raid affix cards or level details are incorrect: ${JSON.stringify(raidAffixDetail)}`);
  await page.evaluate(() => __debug.closeDetail());

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
  await page.evaluate(async () => { await __debug.restoreRaw({ bone: 321, mana: 17, raidNo: 4, story: { archive: [] } }); });
  const legacy = await page.evaluate(() => ({ bone: __debug.bone, mana: __debug.mana, floors: __debug.floors.length, story: __debug.story }));
  assert(legacy.bone === 321 && legacy.mana === 17, 'Legacy resources were not preserved.');
  assert(legacy.floors > 0 && legacy.story.relations && Array.isArray(legacy.story.exiles), 'Legacy save was not upgraded to the current schema.');
  const snapshotRoundTrip = await page.evaluate(async () => {
    await __debug.saveSnapshot(1); const before = __debug.bone; __debug.giveResources(77, 0); await __debug.loadSnapshot(1);
    return { before, after: __debug.bone, slots: await __debug.saveSlotsRefresh() };
  });
  assert(snapshotRoundTrip.after === snapshotRoundTrip.before && snapshotRoundTrip.slots[0].snapshots[0].exists,
    `Manual snapshot was overwritten or could not restore the active auto save: ${JSON.stringify(snapshotRoundTrip)}`);

  const randomArchived = await page.evaluate(async () => {
    const before = __debug.story.archive.length;
    __debug.storyCredits(1);
    await __debug.storyDrawOffline();
    const fixedChoices = __debug.storyScene?.choices?.length;
    for (let i = 0; i < 4 && __debug.storyScene?.kind !== 'done'; i++) {
      const scene = __debug.storyScene;
      if (scene.kind === 'input') __debug.storySay('守住这里');
      else __debug.storyChoose(Math.max(0, scene.choices.findIndex((x) => x.open)));
    }
    return { archived: __debug.story.archive.length > before && __debug.story.archive[0]?.source === '无主传闻', fixedChoices };
  });
  assert(randomArchived.archived && randomArchived.fixedChoices === 3, `Offline rumor did not expose three fixed choices and archive: ${JSON.stringify(randomArchived)}`);

  const repairedLegacyLead = await page.evaluate(() => {
    const id = __debug.save.story.leadNext++;
    __debug.save.story.leads.unshift({ id, key: `legacy-ai:${id}`, sceneId: 'missing-ai-scene', source: '无主传闻',
      title: '旧版本遗失正文的无主秘闻', context: {}, raidNo: __debug.save.raidNo, dueRaid: __debug.save.raidNo });
    const opened = __debug.storyLeadOpen(id);
    const scene = __debug.storyScene;
    __debug.storyLeave();
    return { opened, scene };
  });
  assert(repairedLegacyLead.opened && repairedLegacyLead.scene?.id !== 'missing-ai-scene',
    `Legacy unowned story lead was not repaired: ${JSON.stringify(repairedLegacyLead)}`);
  await page.evaluate(() => { __debug.storyLeave(); __debug.forceRaid(5); __debug.setTab('story'); });
  const noCreditPoint = await page.evaluate(() => __debug.toScreen(397, 191));
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
    const boostedBoneYield = __debug.floors[0].output.bone;
    __debug.devUtility(1, 'mana-well', 1, 100);
    const boostedManaYield = __debug.floors[1].output.mana;
    __debug.devUtility(1, 'vault', 1, 100);
    const vaultBoostedBoneYield = __debug.floors[0].output.bone;
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
    return { relationLead: !!relationLead, sameSubjectBlocked, optimizedLore, facilityActionLock, facility, boostedBoneYield, boostedManaYield, vaultBoostedBoneYield, forcePaid, firstForceClick, secondForceClick, forcedHero, archive: !!archive, exactImpact: impactText.includes('怪物攻击+12%') && impactText.includes('3轮'), chronicle: chronicleIds.includes(archive?.id),
      battleDone: battleRun?.screen === 'result', facilityVisual, returnAdvanced, reportLinked: report?.storyRefs?.includes(archive?.id) && linkedArchive?.battleRefs?.includes(report.raidNo),
      exileLead: !!exileLead, exiles: __debug.story.exiles.length, violations: audit.violations };
  });
  assert(result.relationLead, 'Multi-hero relationship lead was not generated.');
  assert(result.sameSubjectBlocked, 'The same hero generated more than one lead in a single raid.');
  assert(result.optimizedLore?.personalityName === '账簿式冷静' && result.optimizedLore?.backgroundName === '欠薪墓园',
    'AI hero archive reconstruction did not persist its sanitized result.');
  assert(result.facilityActionLock, 'Facility build/upgrade was not limited to one action per raid.');
  assert(result.boostedBoneYield === 65 && result.boostedManaYield === 17,
    'Resource facilities did not apply the tenfold base-yield rebalance through real output multipliers.');
  assert(result.vaultBoostedBoneYield === 98,
    'Vault did not increase all resource-facility production by its level-one 50% bonus.');
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
      const point = await page.evaluate(() => __debug.toScreen(438, 17));
      assert(point.x < viewport.width && point.y < viewport.height, 'Landscape system-menu button is outside the viewport.');
      await page.mouse.click(point.x, point.y);
      const newPoint = await page.evaluate(() => __debug.toScreen(403, 235));
      await page.mouse.click(newPoint.x, newPoint.y);
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

  const portraitGuideAudit = [];
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const audit = await page.evaluate(() => {
      __debug.uiTourSkip();
      const rows = [];
      for (let raid = 2; raid <= 20; raid++) {
        __debug.forceRaid(raid);
        const total = __debug.progression.roundTutorialTotal;
        for (let step = 0; step < total; step++) {
          __debug.save.tutorial.roundSteps[raid] = step;
          __debug.forceRaid(raid);
          const before = __debug.progression.guide;
          if (before && !before[2]) __debug.setTab(before[0]);
          const layout = __debug.viewport().portraitLayout;
          const guide = layout?.guide;
          const record = __debug.uiBounds().records.find((item) => item.text === guide?.message);
          rows.push({ raid, step, guide, primaryY: layout?.primaryY, record });
        }
        __debug.save.tutorial.roundSteps[raid] = total;
      }
      return rows;
    });
    portraitGuideAudit.push({ viewport, audit });
  }
  for (const group of portraitGuideAudit) {
    assert(group.audit.length > 0 && group.audit.every((item) => item.guide && !item.guide.truncated
      && item.record && !item.record.truncated && item.guide.y + item.guide.h < item.primaryY),
    `Portrait tutorial text was clipped at ${group.viewport.width}x${group.viewport.height}: ${JSON.stringify(group.audit.filter((item) => !item.guide || item.guide.truncated || !item.record || item.record.truncated || item.guide.y + item.guide.h >= item.primaryY).slice(0, 3))}`);
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
  const preexistingHeroBack = await page.evaluate(() => __debug.viewport().portraitActions.heroRosterBack ?? null);
  if (preexistingHeroBack) {
    await page.mouse.click(preexistingHeroBack.x + preexistingHeroBack.w / 2, preexistingHeroBack.y + preexistingHeroBack.h / 2);
    await page.waitForTimeout(80);
  }
  const portraitHeroUid = await page.evaluate(() => __debug.save.champs[0]?.uid);
  assert(portraitHeroUid, 'Raid-ten portrait test has no hero to open.');
  const portraitHeroOpen = await page.evaluate((uid) => __debug.viewport().portraitActions[`hero-open-${uid}`] ?? null, portraitHeroUid);
  assert(portraitHeroOpen, `Portrait hero roster has no working detail action: ${JSON.stringify(await page.evaluate(() => ({
    tab: __debug.currentTab, guide: __debug.progression.guide, actions: Object.keys(__debug.viewport().portraitActions), champs: __debug.save.champs.length,
  })))}`);
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
  const overtimeFacilityReset = await page.evaluate(() => {
    __debug.giveResources(5000, 5000);
    __debug.devUtility(0, 'none');
    __debug.devOvertime(21);
    const built = __debug.confirmUtilityBuild(0, 'mana-well');
    const blocked = __debug.devUpgradeUtility(0);
    __debug.devOvertime(22);
    const nextBatch = __debug.devUpgradeUtility(0);
    return { built: built.level, blocked: blocked.level, nextBatch: nextBatch.level, action: nextBatch.facilityActionRaid };
  });
  assert(overtimeFacilityReset.built === 1 && overtimeFacilityReset.blocked === 1 && overtimeFacilityReset.nextBatch === 2
    && overtimeFacilityReset.action === 22, `Facility action did not reset on the next overtime raid: ${JSON.stringify(overtimeFacilityReset)}`);

  // API-only novel campaign: immutable daily prose signs a locally constrained raid contract and blocks bypassing it.
  await page.evaluate(() => { __debug.novelOpen(); __debug.novelEnable(); __debug.novelEnable(); });
  await page.waitForFunction(() => __debug.novel.enabled && __debug.novel.entries.length > 0, null, { timeout: 20000 });
  const novelDaily = await page.evaluate(() => ({ novel: __debug.novel, tasks: __debug.uiTasks }));
  assert(novelDaily.novel.choices.length === 3 && novelDaily.tasks.some((task) => task.id === 'novel-mission' && task.blocking),
    `Novel daily chapter did not expose three choices or block unsigned battle: ${JSON.stringify(novelDaily)}`);
  assert(requestedPrompt.includes('小说自动化测试') && requestedPrompt.indexOf('小说自动化测试') < requestedPrompt.indexOf('互动选项'),
    'Novel request did not use the independently ordered prompt entries.');
  const longNovelChoice = novelDaily.novel.choices[0];
  assert(longNovelChoice.length > 30 && await page.evaluate(() => __debug.novelChoiceOpen(0)), 'Long novel option did not open its confirmation card.');
  assert(await page.locator('#novel-decision-card [data-choice-text]').textContent() === longNovelChoice,
    'Novel option confirmation card did not show the full untruncated text.');
  await page.click('#novel-decision-card [data-novel-card="cancel"]');
  await page.evaluate(() => __debug.novelInputOpen());
  const longDraft = '我要求账房把所有欠薪、伤亡、设施损坏与幽灵工龄逐项列出，然后当着全体守军的面重新宣读并允许他们提出异议。';
  await page.fill('#novel-decision-card textarea', longDraft);
  await page.setViewportSize({ width: 390, height: 844 });
  const novelInputBox = await page.locator('#novel-decision-card .novel-decision-card-inner').boundingBox();
  assert(novelInputBox && novelInputBox.x >= 0 && novelInputBox.y >= 0 && novelInputBox.x + novelInputBox.width <= 390
    && novelInputBox.y + novelInputBox.height <= 844, 'Novel free-input card exceeds the portrait viewport.');
  await page.click('#novel-decision-card [data-novel-card="cancel"]');
  assert(await page.evaluate((draft) => __debug.novelDecision.draft === draft, longDraft), 'Closing the novel input card did not preserve the full draft.');
  await page.evaluate(() => __debug.novelInputOpen());
  assert(await page.inputValue('#novel-decision-card textarea') === longDraft, 'Reopening the novel input card did not restore the editable draft.');
  await page.click('#novel-decision-card [data-novel-card="cancel"]');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await __debug.novelSay(__debug.novel.choices[0]);
  });
  assert(await page.evaluate(() => __debug.novel.dailyTurns === 3), 'Novel chapter did not enforce the three-turn daily limit.');
  const novelMission = await page.evaluate(async () => await __debug.novelIssue());
  assert(novelMission?.members.length === 5 && novelMission?.objective.type === 'breachLimit' && novelMission.rewardMult === 1.4,
    `Novel mission was not generated through the local contract: ${JSON.stringify(novelMission)}`);
  assert(await page.evaluate(() => !__debug.uiTasks.some((task) => task.id === 'novel-mission')),
    'A signed novel mission still blocked the battle.' );
  await page.evaluate(async () => { __debug.setTab('throne'); await __debug.startBattle(); __debug.devSettleWin(); });
  const novelSettlement = await page.evaluate(() => ({ report: __debug.reports[0]?.novel, novel: __debug.novel }));
  assert(novelSettlement.report?.missionId === novelMission.id && novelSettlement.novel.phase === 'resolution'
    && novelSettlement.novel.chapter === 2 && novelSettlement.novel.entries.some((entry) => entry.role === 'battle'),
  `Novel battle result did not return to the next chapter: ${JSON.stringify(novelSettlement)}`);

  // Native portrait onboarding must be playable without exposing or clicking the hidden desktop canvas.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => { await __debug.switchSlot(2); await __debug.clearActiveSlot(); });
  await page.reload();
  await page.waitForFunction(() => window.__gpReady && window.__debug?.viewport()?.portrait);
  const clickPortraitAction = async (name) => {
    const rect = await page.evaluate((key) => __debug.viewport().portraitActions[key] ?? null, name);
    assert(rect, `Missing native portrait action: ${name}`);
    await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
    await page.waitForTimeout(80);
  };
  await clickPortraitAction('titleNew');
  assert(await page.evaluate(() => __debug.identityOpen), 'Portrait new game did not open identity registration.');
  await page.evaluate(async () => { await __debug.identityStart('竖屏魔王', '竖屏地牢'); __debug.introContinue(); });
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
  assert(portraitBattle.portraitActions?.battleExit, 'Portrait battle does not expose a dedicated exit action.');
  await clickPortraitAction('battleExit');
  assert(await page.evaluate(() => __debug.screen === 'manage' && __debug.save.raidNo === 1),
    'Portrait battle exit did not return to the same pre-battle round.');

  // The permanent clear marker must unlock exactly four doctrines on future new games.
  await page.evaluate(() => {
    localStorage.setItem('yqh-meta-v1', JSON.stringify({ clears: 1 }));
  });
  await page.evaluate(async () => { await __debug.switchSlot(3); await __debug.clearActiveSlot(); });
  await page.reload();
  await page.waitForFunction(() => window.__gpReady && window.__debug?.screen === 'title');
  await page.evaluate(() => __debug.titleNew());
  const doctrineTitle = await page.evaluate(() => ({ title: __debug.title, actions: __debug.viewport().portraitActions }));
  assert(doctrineTitle.title.mode === 'doctrine'
    && ['default', 'swarm', 'elite', 'economy'].every((id) => doctrineTitle.actions[`doctrine-${id}`]),
  'A permanent clear did not unlock all four starting doctrines.');
  const doctrineTutorialSafety = await page.evaluate(async () => {
    const out = {};
    for (const id of ['default', 'swarm', 'elite', 'economy']) {
      __debug.titlePick(id);
      await __debug.titleConfirm();
      const startBone = __debug.bone;
      const slime = __debug.economyQuotes(0, 0, 'slime').recruit;
      __debug.devBuyMonster('slime');
      const archer = __debug.economyQuotes(0, 0, 'archer').recruit;
      __debug.devBuyMonster('archer');
      const units = __debug.monsters;
      const recruitState = { startBone, slime, archer, bone: __debug.bone, monsters: units.length,
        regularSlime: __debug.economyQuotes(0, 0, 'slime').recruit };
      __debug.introContinue();
      __debug.devAssign(0, 'front', units.find((unit) => unit.kind === 'slime').uid);
      __debug.devAssign(0, 'back', units.find((unit) => unit.kind === 'archer').uid);
      __debug.setTab('throne');
      await __debug.startBattle();
      if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
      const battle = __debug.runBattleToEnd();
      out[id] = { ...recruitState, deploymentReady: __debug.progression.deploymentReady, win: battle?.result?.win === true };
      __debug.returnResult();
    }
    return out;
  });
  assert(Object.values(doctrineTutorialSafety).every((entry) => entry.monsters === 2 && entry.bone >= 0 && entry.deploymentReady && entry.win)
    && doctrineTutorialSafety.elite.slime.cost === 30 && doctrineTutorialSafety.elite.archer.cost === 45
    && doctrineTutorialSafety.elite.regularSlime.cost === 39,
  `A starting doctrine can still make the mandatory first-round recruits unaffordable: ${JSON.stringify(doctrineTutorialSafety)}`);
  assert(await page.evaluate(() => __debug.screen === 'manage' && __debug.save.doctrine === 'economy'),
    'The selected starting doctrine was not persisted into the new run.');

  // Large desktop canvases use bounded integer pixel scaling. The opening CTA must remain
  // comfortably inside the viewport and respond to a real physical click at 2K size.
  const largeContext = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1.25 });
  const largePage = await largeContext.newPage();
  const largeErrors = [];
  largePage.on('pageerror', (error) => largeErrors.push(error.stack || error.message));
  largePage.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('favicon')) largeErrors.push(msg.text()); });
  await largePage.goto(url, { waitUntil: 'domcontentloaded' });
  await largePage.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 60000 });
  await largePage.evaluate(() => __debug.titleNew());
  await largePage.evaluate(async () => { await __debug.identityStart('大屏魔王测试名', '边境超长地下创业试验地牢'); });
  const introLarge = await largePage.evaluate(() => ({
    screen: __debug.screen, viewport: __debug.viewport(),
    text: document.querySelector('#intro-screen [data-intro-copy]')?.textContent,
    nativeCta: document.querySelector('#intro-screen [data-intro-enter]')?.getBoundingClientRect().toJSON(),
  }));
  assert(introLarge.screen === 'intro' && introLarge.viewport.scale === 3
    && introLarge.viewport.logicalFrame.x >= 0 && introLarge.viewport.logicalFrame.y >= 0
    && introLarge.viewport.logicalFrame.right <= 2560 && introLarge.viewport.logicalFrame.bottom <= 1440
    && introLarge.text?.includes('职业生涯中最后一次考核') && !introLarge.text.includes('…')
    && introLarge.nativeCta?.left >= 0 && introLarge.nativeCta?.top >= 0
    && introLarge.nativeCta?.right <= 2560 && introLarge.nativeCta?.bottom <= 1440,
  `2K opening screen is not centered at a bounded scale: ${JSON.stringify(introLarge)}`);
  await largePage.locator('#intro-screen [data-intro-enter]').click();
  await largePage.waitForFunction(() => __debug.screen === 'manage', null, { timeout: 5000 });
  const introExit = await largePage.evaluate(() => __debug.viewport());
  assert(introExit.uiVisible && !introExit.introDomVisible && introExit.overlayBlockers === 0,
    `Opening action changed state but left a black intro layer above management: ${JSON.stringify(introExit)}`);
  const largeViewportAudit = [];
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 2048, height: 1152 }, { width: 2560, height: 1440 },
    { width: 3440, height: 1440 }, { width: 3840, height: 2160 }]) {
    await largePage.setViewportSize(viewport); await largePage.waitForTimeout(80);
    const metrics = await largePage.evaluate(() => __debug.viewport());
    const expectedCap = viewport.height >= 1800 ? 4 : 3;
    assert(metrics.scale <= expectedCap && metrics.logicalFrame.x >= 0 && metrics.logicalFrame.y >= 0
      && metrics.logicalFrame.right <= metrics.width && metrics.logicalFrame.bottom <= metrics.height,
    `Large viewport frame overflow at ${viewport.width}x${viewport.height}: ${JSON.stringify(metrics)}`);
    largeViewportAudit.push({ ...viewport, scale: metrics.scale, frame: metrics.logicalFrame });
  }
  await largePage.setViewportSize({ width: 2560, height: 1440 });
  const largePages = await largePage.evaluate(() => {
    __debug.forceRaid(10);
    const out = {};
    for (const target of ['throne', 'dungeon', 'mob', 'hero', 'shop', 'report', 'story']) {
      __debug.setTab(target); out[target] = __debug.uiBounds().violations;
    }
    __debug.openDetail('大屏百科检查', '大屏详情必须保持完整边界，同时不能改变背后页面的点击映射。'.repeat(12));
    out.detail = __debug.uiBounds().violations;
    __debug.closeDetail();
    __debug.openStitch(); out.stitch = __debug.uiBounds().violations; __debug.closeStitch();
    __debug.forgeOpen('part'); out.forge = __debug.uiBounds().violations; __debug.closeForge();
    __debug.smithOpen(); out.smith = __debug.uiBounds().violations; __debug.smithClose();
    return out;
  });
  assert(Object.values(largePages).every((items) => items.length === 0), `Large-screen page overflow: ${JSON.stringify({ largeViewportAudit, largePages })}`);
  const largeBattle = await largePage.evaluate(async () => {
    while (!__debug.progression.teachingComplete) {
      const target = __debug.progression.guide?.[0];
      if (['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(target) && target !== __debug.currentTab) __debug.setTab(target);
      __debug.ackGuide();
    }
    __debug.devOvertime(21); __debug.giveResources(9999, 9999);
    const guard = __debug.devRecruit('slime'); __debug.devAssign(0, 'front', guard); __debug.setTab('throne');
    const setup = { guard, rooms: __debug.rooms, tasks: __debug.uiTasks };
    await __debug.startBattle(); if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
    const started = { screen: __debug.screen, viewport: __debug.viewport() };
    __debug.runBattleToEnd();
    const result = { screen: __debug.screen, viewport: __debug.viewport() };
    return { setup, started, result };
  });
  await largePage.evaluate(() => __debug.devEnding()); await largePage.waitForTimeout(100);
  largeBattle.ending = await largePage.evaluate(() => __debug.endingLayout);
  largeBattle.endingViewport = await largePage.evaluate(() => __debug.viewport());
  assert(largeBattle.started.screen === 'battle' && largeBattle.result.screen === 'result'
    && largeBattle.started.viewport.logicalFrame.bottom <= 1440 && largeBattle.result.viewport.logicalFrame.bottom <= 1440
    && largeBattle.ending?.bounds?.right <= 480 && largeBattle.ending?.bounds?.bottom <= 270,
  `Large-screen battle/result/ending audit failed: ${JSON.stringify(largeBattle)}`);
  assert(largeErrors.length === 0, `Large-screen browser errors:\n${largeErrors.join('\n')}`);
  await largeContext.close();

  // A clean browser profile migrates the former localStorage singleton into slot 1 without deleting the source key.
  const migrationContext = await browser.newContext({ viewport: { width: 800, height: 450 } });
  const migrationPage = await migrationContext.newPage();
  await migrationPage.addInitScript(() => {
    localStorage.setItem('yqh-save-v2', JSON.stringify({ bone: 456, mana: 23, raidNo: 7, playerName: '迁移魔王', lairName: '迁移地牢', story: { archive: [] } }));
  });
  await migrationPage.goto(url, { waitUntil: 'domcontentloaded' });
  await migrationPage.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 20000 });
  const migrated = await migrationPage.evaluate(() => ({ save: __debug.save, slots: __debug.saves, legacy: localStorage.getItem('yqh-save-v2') }));
  assert(migrated.save.bone === 456 && migrated.save.mana === 23 && migrated.slots.active === 1
    && migrated.slots.slots[0]?.exists && migrated.legacy, `Legacy singleton was not safely copied into slot 1: ${JSON.stringify(migrated)}`);
  await migrationContext.close();

  assert(errors.length === 0, `Browser errors:\n${errors.join('\n')}`);
  console.log('Browser smoke passed: boot, legacy save, story/facility flows, battle/report links, constrained text, 1080P/2K/ultrawide/4K scaling, landscape touch targets and portrait controls.');
} finally {
  await browser?.close();
  server.kill();
}
