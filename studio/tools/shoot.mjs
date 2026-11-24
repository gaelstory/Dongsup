// Screenshot and sanity-check pages of the studio site.
//
//   node studio/tools/shoot.mjs [--out DIR] [--thumbs] [page ...]
//
// page is a path under studio/ such as "index.html" or "work/harbor/index.html";
// with none given, the homepage and every work/*/index.html are checked.
// For each page it writes desktop (1440x900) and phone (390x844) screenshots taken
// while scrolling down the page, plus one reduced-motion shot, and a report.json listing
// console errors, page errors, failed requests and horizontal overflow.
// --thumbs instead writes assets/thumbs/<slug>.jpg (first screen at 1440x900) for each work page.

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Playwright is usually installed globally, which ESM `import` cannot see; require() can.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = path.resolve(outIdx >= 0 ? args.splice(outIdx, 2)[1] : path.join(ROOT, '.shots'));
const THUMBS = args.includes('--thumbs');
const pages = args.filter((a) => !a.startsWith('--'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.glsl': 'text/plain', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function listPages() {
  if (pages.length) return pages;
  const work = path.join(ROOT, 'work');
  const slugs = fs.existsSync(work) ? fs.readdirSync(work).filter((d) => fs.existsSync(path.join(work, d, 'index.html'))).sort() : [];
  return [...(THUMBS ? [] : ['index.html']), ...slugs.map((s) => `work/${s}/index.html`)];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollShots(page, dir, prefix, vh, max) {
  const total = await page.evaluate(() => document.scrollingElement.scrollHeight);
  const step = Math.round(vh * 0.85);
  const shots = [];
  for (let y = 0, i = 0; i < max && y < total; y += step, i++) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    // also dispatch wheel-free scroll for libraries that listen on scroll only
    await sleep(i === 0 ? 300 : 900);
    const f = path.join(dir, `${prefix}-${String(i).padStart(2, '0')}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 72 });
    shots.push(path.relative(OUT, f));
  }
  return { total, shots };
}

async function checkPage(browser, base, rel) {
  const slug = rel === 'index.html' ? 'home' : rel.split('/')[1];
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const report = { page: rel, consoleErrors: [], pageErrors: [], failedRequests: [], views: {} };

  for (const view of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, max: 14 },
    { name: 'phone', viewport: { width: 390, height: 844 }, max: 14, isMobile: true, hasTouch: true },
  ]) {
    const ctx = await browser.newContext({ viewport: view.viewport, deviceScaleFactor: 1, isMobile: !!view.isMobile, hasTouch: !!view.hasTouch, locale: 'ko-KR' });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`[${view.name}] ${m.text()}`); });
    page.on('pageerror', (e) => report.pageErrors.push(`[${view.name}] ${e.message}`));
    page.on('requestfailed', (r) => report.failedRequests.push(`[${view.name}] ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(`[${view.name}] ${r.status()} ${r.url()}`); });
    await page.goto(base + rel, { waitUntil: 'load', timeout: 120000 });
    await sleep(500);
    await page.screenshot({ path: path.join(dir, `${view.name}-load-0.5s.jpg`), type: 'jpeg', quality: 72 });
    await sleep(2000);
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const sw = document.scrollingElement.scrollWidth;
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 8).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`);
      return { clientWidth: w, scrollWidth: sw, overflowing: sw > w + 1, widestElements: wide };
    });
    const res = await scrollShots(page, dir, view.name, view.viewport.height, view.max);
    report.views[view.name] = { overflow, pageHeight: res.total, shots: [`${slug}/${view.name}-load-0.5s.jpg`, ...res.shots] };
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.pageErrors.push(`[reduced-motion] ${e.message}`));
  await page.goto(base + rel, { waitUntil: 'load', timeout: 120000 });
  await sleep(800);
  await page.screenshot({ path: path.join(dir, 'reduced-motion.jpg'), type: 'jpeg', quality: 72 });
  report.views.reducedMotion = { shots: [`${slug}/reduced-motion.jpg`] };
  await ctx.close();
  return report;
}

async function thumb(browser, base, rel) {
  const slug = rel.split('/')[1];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  const page = await ctx.newPage();
  // ?shot=1 makes each mockup skip its intro and show its designed still frame (PLAN.md 4.3)
  await page.goto(base + rel + '?shot=1', { waitUntil: 'load', timeout: 120000 });
  await sleep(3500);
  await page.addStyleTag({ content: '.concept-badge{display:none!important}' });
  const dir = path.join(ROOT, 'assets', 'thumbs');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${slug}.jpg`), type: 'jpeg', quality: 80 });
  await ctx.close();
  return slug;
}

// Several builders share a 4-core machine and software-rendered WebGL is heavy, so at most
// SLOTS runs take screenshots at once; the rest wait their turn (stale locks expire after 10 min).
const SLOTS = Number(process.env.SHOOT_SLOTS || 2);
const LOCK_DIR = '/tmp/studio-shoot-locks';
fs.mkdirSync(LOCK_DIR, { recursive: true });
async function acquireSlot() {
  for (let waited = 0; ; waited += 2000) {
    for (let i = 0; i < SLOTS; i++) {
      const lock = path.join(LOCK_DIR, `slot-${i}`);
      try {
        fs.mkdirSync(lock);
        return lock;
      } catch {
        try { if (Date.now() - fs.statSync(lock).mtimeMs > 600000) fs.rmSync(lock, { recursive: true, force: true }); } catch {}
      }
    }
    if (waited % 30000 === 0) console.log(`waiting for a screenshot slot (${waited / 1000}s)...`);
    await sleep(2000);
  }
}
const slot = await acquireSlot();
const releaseSlot = () => { try { fs.rmSync(slot, { recursive: true, force: true }); } catch {} };
process.on('exit', releaseSlot);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const list = listPages();
const reports = [];
try {
  for (const rel of list) {
    if (THUMBS) { console.log('thumb', await thumb(browser, base, rel)); continue; }
    const r = await checkPage(browser, base, rel);
    reports.push(r);
    const v = r.views;
    console.log(`${rel}: console ${r.consoleErrors.length}, pageerror ${r.pageErrors.length}, failed ${r.failedRequests.length}, overflow desktop ${v.desktop.overflow.overflowing} phone ${v.phone.overflow.overflowing}`);
  }
} finally {
  await browser.close();
  server.close();
}
if (!THUMBS) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(reports, null, 2));
  console.log('report:', path.join(OUT, 'report.json'));
}
