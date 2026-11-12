// A minute of the real thing, headless and muted: loads the served page as a player would, clicks to start, walks,
// and reports whether the hour moves, the sounds arrive and anything complains.
//   node tools/live-check.mjs [url]
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const url = process.argv[2] ?? 'http://127.0.0.1:5383/';
// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const problems = [];
const audio = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text().slice(0, 300));
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  if (r.url().includes('/audio/')) audio.push(`${r.status()} ${r.url().split('/').pop()}`);
});
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
console.log(`ready in ${Date.now() - t0} ms`);
const before = await page.evaluate(() => ({ hour: window.__tg.sky.hour, x: window.__tg.player.x, z: window.__tg.player.z }));
await page.mouse.click(960, 540);
await page.keyboard.down('KeyW');
await page.waitForTimeout(12000);
await page.keyboard.up('KeyW');
const after = await page.evaluate(() => ({ hour: window.__tg.sky.hour, x: window.__tg.player.x, z: window.__tg.player.z, playing: document.body.classList.contains('playing') }));
console.log(`hour ${before.hour.toFixed(3)} -> ${after.hour.toFixed(3)}; walked ${Math.hypot(after.x - before.x, after.z - before.z).toFixed(1)} m; playing ${after.playing}`);
console.log(`audio: ${audio.sort().join(', ')}`);
console.log(problems.length ? `problems:\n${problems.join('\n')}` : 'no errors');
await browser.close();
