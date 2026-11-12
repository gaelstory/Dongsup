// Real-time frame rate of the built valley at 1080p, headless on this PC's GPU, standing and walking.
//   node tools/fps.mjs [--query "quality=medium"]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const query = args.includes('--query') ? args[args.indexOf('--query') + 1] : '';
const root = resolve(here, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
// vsync off, so the number is what the GPU can do and not the screen's refresh
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${server.address().port}/?dpr=1&${query}`);
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
console.log(`ready in ${Date.now() - t0} ms`);
const measure = (label, seconds) =>
  page
    .evaluate(async (seconds) => {
      const gl = window.__tg.renderer.getContext();
      const times = [];
      let last = performance.now();
      const end = last + seconds * 1000;
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
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      return { fps: 1000 / mean, p99: times[Math.floor(times.length * 0.99)], worst: times[times.length - 1], frames: times.length, tris: window.__tg.renderer.info.render.triangles };
    }, seconds)
    .then((r) => console.log(`${label}: ${r.fps.toFixed(1)} fps, p99 ${r.p99.toFixed(1)} ms, worst ${r.worst.toFixed(1)} ms, ${r.frames} frames`));
await measure('warm-up', 2);
await measure('standing at the start', 5);
await page.evaluate(() => window.__tg.keys.add('KeyW'));
await measure('walking down the path', 8);
await page.evaluate(() => {
  window.__tg.keys.delete('KeyW');
  const [x, z] = window.__tg.fromValley(6, -8);
  Object.assign(window.__tg.player, { x, z, pitch: 0.9 });
});
await measure('under the great tree, looking up', 5);
await browser.close();
server.close();
