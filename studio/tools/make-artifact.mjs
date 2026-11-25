// Stage the studio site for publishing as a Claude Artifact.
//
//   node studio/tools/make-artifact.mjs <out-dir>
//
// The artifact host wraps the main page in its own <!doctype>/<html>/<head>/<body>, so the staged
// index.html keeps only what goes inside them (title, meta, links, styles, body content, scripts),
// and restores <html>/<body> attributes with a tiny script. Every other page (work/<slug>/index.html)
// is published as its own complete document, unchanged. Planning notes, tools and screenshots are left out.
// Prints the list of files to pass to the Artifact tool's `files` parameter.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.artifact'));
const SKIP = new Set(['tools', '.shots', '.artifact', 'reviews', 'PLAN.md', 'BUILD-CONTRACT.md', 'README.md']);

fs.rmSync(OUT, { recursive: true, force: true });
const files = [];
(function copy(rel) {
  for (const name of fs.readdirSync(path.join(ROOT, rel))) {
    const r = rel ? `${rel}/${name}` : name;
    if (!rel && (SKIP.has(name) || /^PLAN.*\.md$/.test(name))) continue;
    if (name.startsWith('.') || name.endsWith('.map')) continue;
    // a mockup's readable sources (work/<slug>/src/) are for editing, not for the published page
    if (name === 'src' && /^work\/[^/]+$/.test(rel)) continue;
    const src = path.join(ROOT, r);
    if (fs.statSync(src).isDirectory()) { copy(r); continue; }
    fs.mkdirSync(path.dirname(path.join(OUT, r)), { recursive: true });
    fs.copyFileSync(src, path.join(OUT, r));
    if (r !== 'index.html') files.push(r);
  }
})('');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const attrs = (tag) => {
  const m = html.match(new RegExp(`<${tag}\\b([^>]*)>`, 'i'));
  const out = {};
  if (m) for (const a of m[1].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[a[1]] = a[3] ?? a[4];
  return out;
};
const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [, ''])[1]
  .replace(/<meta\s+charset[^>]*>/i, '')
  .replace(/<meta\s+name=["']viewport["'][^>]*>/i, '');
const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
const htmlAttrs = attrs('html');
const bodyAttrs = attrs('body');
const restore = [
  ...Object.entries(htmlAttrs).map(([k, v]) => `document.documentElement.setAttribute(${JSON.stringify(k)}, ${JSON.stringify(v)});`),
  ...Object.entries(bodyAttrs).map(([k, v]) => `document.body.setAttribute(${JSON.stringify(k)}, ${JSON.stringify(v)});`),
].join('');

// <title> must sit in the first 8KB, so it goes first.
const title = (head.match(/<title>[\s\S]*?<\/title>/i) || [''])[0];
const staged = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  head.replace(title, '').trim(),
  restore ? `<script>${restore}</script>` : '',
  body.trim(),
].filter(Boolean).join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), staged + '\n');

console.log(JSON.stringify({ page: path.join(OUT, 'index.html'), root: OUT, files }, null, 2));
