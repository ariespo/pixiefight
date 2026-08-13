import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const key = process.env.DARK_AI_KEY;
const target = process.env.DARK_AI_URL || 'https://pixiefight.vercel.app/';
if (!key) throw new Error('Set DARK_AI_KEY for the opt-in live AI smoke test.');
const chrome = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
if (!chrome) throw new Error('Chrome or Edge was not found.');

const browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--disable-gpu-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
  await page.addInitScript(({ apiKey }) => {
    localStorage.setItem('yqh-llm-cfg', JSON.stringify({ provider: 'deepseek', protocol: 'openai',
      baseUrl: 'https://api.deepseek.com/v1', key: apiKey, model: 'deepseek-v4-flash', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] }));
  }, { apiKey: key });
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gpReady && window.__debug, null, { timeout: 30000 });
  await page.evaluate(async () => {
    __debug.titleNew();
    await __debug.identityStart('Live AI Tester', 'Live API Dungeon');
    __debug.introContinue();
    __debug.uiTourSkip();
    __debug.forceRaid(5);
    while (!__debug.progression.teachingComplete) {
      const targetPage = __debug.progression.guide?.[0];
      if (['throne', 'dungeon', 'hero', 'mob', 'shop', 'report', 'story'].includes(targetPage) && targetPage !== __debug.currentTab) __debug.setTab(targetPage);
      __debug.ackGuide();
    }
    const front = __debug.devRecruit('slime'), back = __debug.devRecruit('archer');
    __debug.devAssign(0, 'front', front); __debug.devAssign(0, 'back', back); __debug.setTab('throne');
    await __debug.startBattle();
    if (__debug.raidBriefing) await __debug.confirmRaidBriefing();
  });
  await page.waitForFunction(() => __debug.screen === 'battle', null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const result = await page.evaluate(() => ({
    mode: __debug.llm.mode,
    status: __debug.llm.status,
    screen: __debug.screen,
    stats: __debug.battle?.dialoguePack?.stats ?? null,
    aiDialogueUsed: __debug.battle?.aiDialogueUsed ?? 0,
    dialogueCount: __debug.battle?.dialogue?.length ?? 0,
  }));
  if (result.mode !== 'http' || result.screen !== 'battle' || !result.stats
    || result.stats.covered !== result.stats.expected || result.stats.coreCovered !== result.stats.expected
    || result.aiDialogueUsed <= 0) throw new Error(`Live AI battle dialogue failed: ${JSON.stringify(result)}`);
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
