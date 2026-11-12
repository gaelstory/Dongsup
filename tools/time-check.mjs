// The time-of-day keys, tried on the served page, headless and muted: presses T four times, then 2, then 0, and
// reports the hour, the label and how long each change held the page up.
//   node tools/time-check.mjs [url]
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const url = process.argv[2] ?? 'http://127.0.0.1:5383/';
// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(m.text().slice(0, 300)));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
await page.mouse.click(960, 540);
await page.waitForTimeout(1500);
// the longest gap between frames from now on
await page.evaluate(() => {
  window.__gap = 0;
  let last = performance.now();
  const frame = () => {
    const now = performance.now();
    window.__gap = Math.max(window.__gap, now - last);
    last = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});
for (const key of ['KeyT', 'KeyT', 'KeyT', 'KeyT', 'Digit2', 'Digit0']) {
  await page.evaluate(() => (window.__gap = 0));
  await page.keyboard.press(key);
  await page.waitForTimeout(900);
  const now = await page.evaluate(() => ({ hour: window.__tg.sky.hour, label: document.getElementById('note').textContent, gap: window.__gap }));
  console.log(`${key}: hour ${now.hour.toFixed(2)}, "${now.label}", longest frame ${now.gap.toFixed(0)} ms`);
  if (key === 'KeyT' && now.label === 'Sunset') await page.screenshot({ path: 'shots/work/time-sunset.png' });
}
const a = await page.evaluate(() => window.__tg.sky.hour);
await page.waitForTimeout(3000);
const b = await page.evaluate(() => window.__tg.sky.hour);
console.log(`after 0, three seconds on: ${a.toFixed(3)} -> ${b.toFixed(3)}`);
console.log(problems.length ? `problems:\n${problems.join('\n')}` : 'no errors');
await browser.close();
