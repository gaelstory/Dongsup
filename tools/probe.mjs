// A still of one view with something switched on or off first, for hunting down what draws a thing.
//   node tools/probe.mjs <out.png> "<js run with tg in scope>" [u v turn pitch fov]
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const [out, code = '', u = '396', v = '-70', turn = '6', pitch = '1', fov = '68'] = process.argv.slice(2);
// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
await page.goto('http://127.0.0.1:5383/?step&dpr=1');
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
await page.addStyleTag({ content: '#start { display: none !important; }' });
const said = await page.evaluate(
  ([code, u, v, turn, pitch, fov]) => {
    const tg = window.__tg;
    const [x, z] = tg.fromValley(u, v);
    tg.view = { x, z, y: 1.68, yaw: Math.atan2(-0.6, -0.8) - (turn * Math.PI) / 180, pitch: (pitch * Math.PI) / 180, fov };
    // eslint-disable-next-line no-new-func
    const result = new Function('tg', code)(tg);
    for (let i = 0; i < 40; i++) tg.tick(1 / 30);
    return result === undefined ? '' : JSON.stringify(result);
  },
  [code, Number(u), Number(v), Number(turn), Number(pitch), Number(fov)],
);
if (said) console.log(said);
await page.screenshot({ path: out });
await browser.close();
