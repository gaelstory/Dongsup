// 서리재 시안 빌드: src/*.js(읽기용 원본) → ../main.js, ../jacket.js, ../scenes.js(terser로 줄인 것).
// ../main.js 맨 위의 PHOTOS 블록(사진 설정)은 손대지 않고 그대로 남긴다. 사진 경로는 거기서만 고친다.
// 사용: node src/build.mjs   (terser 5가 필요하다: npm i -D terser@5, 또는 NODE_PATH로 설치 위치 지정)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const req = createRequire(import.meta.url);
let terser;
try { terser = req('terser'); } catch (e) { console.error('terser 5가 필요합니다: npm i -D terser@5'); process.exit(1); }

const SRC = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(SRC, '..');
const OPTS = { compress: { passes: 2 }, mangle: true, format: { comments: false, ascii_only: false } };
const NOTE = (f) => `/* 서리재 SEORIJAE 시안 · 줄인 파일. 읽기용 원본은 src/${f}, 고친 뒤 node src/build.mjs 로 다시 만든다. */\n`;

for (const f of ['jacket.js', 'scenes.js', 'main.js']) {
  const code = fs.readFileSync(path.join(SRC, f), 'utf8');
  const min = (await terser.minify(code, OPTS)).code;
  let head = '';
  if (f === 'main.js') {
    const cur = fs.readFileSync(path.join(OUT, f), 'utf8');
    const end = cur.indexOf('\n};\n');
    if (!cur.includes('const PHOTOS') || end < 0) throw new Error('../main.js 맨 위에서 PHOTOS 블록을 찾지 못했습니다');
    head = cur.slice(0, end + 4) + '\n';
  }
  fs.writeFileSync(path.join(OUT, f), head + NOTE(f) + min + '\n');
  console.log(f, code.length, '→', Buffer.byteLength(head + NOTE(f) + min + '\n'));
}
