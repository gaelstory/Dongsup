// Stills of the wanderer, headless and muted (build first: npm run build). It drives the demo's own clock: lets him
// stand, then holds keys and takes a picture at each moment asked for.
//
//   node tools/walk.mjs [--out shots/walk] [--query "hour=19"] [--size 1920x1080] [--script "<steps>"] [--before file.js]
//
// --before runs a file of JavaScript in the page first, with tg in scope: somewhere to define what 'js' steps call.
//
// A script is steps separated by ';'. Each step is one of:
//   wait <frames>            let time pass
//   keys <codes,...>|none    hold these keys from now on (KeyW, ShiftLeft, AltLeft, Space ...)
//   look <yaw°> [pitch°]     turn the camera round him by this much
//   zoom <metres>            how far behind him the eye wants to be
//   at <u> <v> [yaw°]        stand him at a place in valley coordinates
//   js <code>                run this with tg in scope
//   shot <name>              take a picture
// Without a script: standing, walking and running from behind, then standing seen from the front.
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(here, flag('out', 'shots/walk'));
const [width, height] = flag('size', '1920x1080').split('x').map(Number);
const script = flag('script', 'wait 90; shot stand; keys KeyW,AltLeft; wait 70; shot walk; keys KeyW; wait 60; shot run; keys none; wait 80; look 180 4; wait 40; shot front; look -110; wait 40; shot side');
mkdirSync(out, { recursive: true });

const root = resolve(here, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/?step&dpr=1&nopad&${flag('query', '')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`error: ${m.text().slice(0, 1500)}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const t0 = Date.now();
await page.goto(url);
try {
  await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
} catch {
  console.log(`never ready\n${problems.join('\n')}`);
  await browser.close();
  server.close();
  process.exit(1);
}
console.log(`ready in ${Date.now() - t0} ms`, JSON.stringify(await page.evaluate(() => window.__tg.timings)));
await page.addStyleTag({ content: '#start, #hint { display: none !important; }' });
if (flag('before', '')) await page.evaluate((code) => new Function('tg', code)(window.__tg), readFileSync(resolve(flag('before', '')), 'utf8'));

for (const step of script.split(';').map((s) => s.trim()).filter(Boolean)) {
  const [word, ...rest] = step.split(/\s+/);
  if (word === 'shot') {
    await page.evaluate(() => {
      window.__tg.tick(1 / 60);
      window.__tg.renderer.getContext().finish();
    });
    await page.screenshot({ path: join(out, `${rest[0]}.png`) });
    console.log(`shot ${rest[0]}`, await page.evaluate(() => JSON.stringify({ at: [window.__tg.walker.feet.x, window.__tg.walker.feet.z].map((n) => Math.round(n * 10) / 10), speed: Math.round(window.__tg.walker.speed * 10) / 10, mode: window.__tg.walker.mode })));
    continue;
  }
  await page.evaluate(
    ({ word, rest, step }) => {
      const tg = window.__tg;
      if (word === 'wait') for (let i = 0; i < Number(rest[0]); i++) tg.tick(1 / 60);
      else if (word === 'keys') {
        tg.input.keys.clear();
        if (rest[0] !== 'none') for (const code of rest[0].split(',')) tg.input.keys.add(code);
      } else if (word === 'look') {
        tg.follow.yaw += (Number(rest[0]) * Math.PI) / 180;
        if (rest[1] !== undefined) tg.follow.pitch = (Number(rest[1]) * Math.PI) / 180;
      } else if (word === 'zoom') tg.follow.want = Number(rest[0]);
      else if (word === 'at') {
        const [x, z] = tg.fromValley(Number(rest[0]), Number(rest[1]));
        tg.standAt(x, z, rest[2] !== undefined ? (Number(rest[2]) * Math.PI) / 180 : tg.walker.yaw);
        tg.follow.pivot.set(0, 0, 0);
      } else if (word === 'js') new Function('tg', step.slice(3))(tg);
    },
    { word, rest, step },
  );
}
if (problems.length) console.log(problems.join('\n'));
await browser.close();
server.close();
