// What each part of the picture costs: frame rate at 1080p with parts of it switched off in turn, all in one run
// so the numbers can be compared with each other (the graphics card is shared, so not with another run's).
//   node tools/ab.mjs [url]
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const url = process.argv[2] ?? 'http://127.0.0.1:5383/?dpr=1&drift=0';
// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });

const measure = (label, setup) =>
  page
    .evaluate(
      async ([setup]) => {
        const tg = window.__tg;
        // eslint-disable-next-line no-new-func
        new Function('tg', setup)(tg);
        const gl = tg.renderer.getContext();
        const times = [];
        let last = performance.now();
        const end = last + 4000;
        await new Promise((done) => {
          const frame = () => {
            gl.finish();
            const now = performance.now();
            times.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(frame);
            else done();
          };
          requestAnimationFrame(frame);
        });
        times.sort((a, b) => a - b);
        return times[Math.floor(times.length / 2)];
      },
      [setup],
    )
    .then((ms) => console.log(`${label}: ${ms.toFixed(2)} ms a frame (${(1000 / ms).toFixed(0)} fps)`));

await measure('warm-up', '');
await measure('everything', '');
await measure('no far woods, hedges, houses', 'tg.farWoods.group.visible = false');
await measure('and no near trees', 'tg.trees.group.visible = false');
await measure('and no paint finish', 'tg.frame.paint = 0');
await measure('and no grass', 'tg.field.blades.group.visible = false');
await measure('everything again', 'tg.farWoods.group.visible = tg.trees.group.visible = tg.field.blades.group.visible = true; tg.frame.paint = 3');
await browser.close();
