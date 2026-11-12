// Stills of the built valley, headless and muted, with the clock stepped by hand.
//   node tools/shots.mjs [names...] [--out shots/work] [--query "hour=17"] [--size 1920x1080]
// With no names it takes them all. Each view is metres down the valley (u) and to the right of it (v), the eye's
// height, and which way it looks: `turn` degrees right of the valley's line, `pitch` degrees up.
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

const VIEWS = {
  opening: { u: 0, v: 0, turn: 0, pitch: 2 },
  wide: { u: -6, v: 4, turn: 8, pitch: 5, fov: 80 },
  tower: { u: 0, v: 0, turn: 14, pitch: 17 },
  left: { u: 40, v: -10, turn: -70, pitch: 6 },
  right: { u: 40, v: 10, turn: 75, pitch: 6 },
  behind: { u: 0, v: 0, turn: 180, pitch: 6 },
  up: { u: 30, v: 0, turn: 20, pitch: 62 },
  feet: { u: 60, v: 6, turn: 10, pitch: -38 },
  low: { u: 90, v: -30, turn: -15, pitch: 14, y: 0.45 },
  slope: { u: 150, v: -60, turn: 30, pitch: 0 },
  tarn: { u: 368, v: 30, turn: 5, pitch: -4 },
  back: { u: 330, v: 40, turn: 178, pitch: 8 },
  sun: { u: 60, v: 0, turn: -60, pitch: 30 },
  // the far country, through a long lens
  peaks: { u: 0, v: 0, turn: -6, pitch: 6, fov: 26 },
  peaksLeft: { u: 0, v: 0, turn: -38, pitch: 5, fov: 26 },
  peaksRight: { u: 0, v: 0, turn: 30, pitch: 6, fov: 26 },
  floor: { u: 300, v: 20, turn: -4, pitch: -1, fov: 34 },
  beyond: { u: 396, v: -70, turn: 6, pitch: 1 },
  village: { u: 430, v: -120, turn: -15, pitch: 1, fov: 30 },
  valley: { u: 0, v: 0, turn: -4, pitch: -2, fov: 34 },
};

guard(chromium);
const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const names = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) i++;
  else names.push(args[i]);
}
const out = resolve(here, flag('out', 'shots/work'));
const [width, height] = flag('size', '1920x1080').split('x').map(Number);
mkdirSync(out, { recursive: true });

const root = resolve(here, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ogg': 'audio/ogg' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/?step&dpr=1&${flag('query', '')}`;

// a Chromium of your own in CHROME; without it, Playwright's
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text().slice(0, 1500)}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const t0 = Date.now();
await page.goto(url);
try {
  await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
} catch {
  console.log('never ready\n' + problems.join('\n'));
  await browser.close();
  server.close();
  process.exit(1);
}
console.log(`ready in ${Date.now() - t0} ms`, JSON.stringify(await page.evaluate(() => window.__tg.timings)));
await page.addStyleTag({ content: '#start { display: none !important; }' });

for (const name of names.length ? names : Object.keys(VIEWS)) {
  const view = VIEWS[name];
  if (!view) {
    console.log(`no view called ${name}`);
    continue;
  }
  const ms = await page.evaluate((v) => {
    const tg = window.__tg;
    const [x, z] = tg.fromValley(v.u, v.v);
    const base = Math.atan2(-0.6, -0.8);
    tg.view = { x, z, y: v.y ?? 1.68, yaw: base - (v.turn * Math.PI) / 180, pitch: (v.pitch * Math.PI) / 180, fov: v.fov ?? 68 };
    // let the wind and the grass settle into the new place
    for (let i = 0; i < 40; i++) tg.tick(1 / 30);
    const gl = tg.renderer.getContext();
    gl.finish();
    const a = performance.now();
    for (let i = 0; i < 10; i++) tg.tick(1 / 60);
    gl.finish();
    return (performance.now() - a) / 10;
  }, view);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`shot ${name} (${ms.toFixed(1)} ms a frame)`);
}
if (problems.length) console.log(problems.join('\n'));
await browser.close();
server.close();
