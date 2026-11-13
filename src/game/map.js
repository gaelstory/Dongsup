// The map. A small round one sits at the top right of the screen and shows what is about you; pressed, it opens
// the whole valley. Only where you have been is drawn: the rest lies under mist, which clears as you walk. Your
// camp is marked on both, and pressing it on the big map sends you running home.
import { fromValley, TARN, tarnDistance } from '../valley/world.js';
import { HOME } from './data.js';
import { SPIRIT_LOOKS } from './models.js';

const SIZE = 640; // the map's picture, pixels across
const CELLS = 72; // the mist is kept on a grid this many cells across
const SEEN = 58; // how far you see about you, metres

/** The parts of the valley that have names: found when you first come near. [u, v] down and across the valley. */
export const REGIONS = [
  { id: 'hill', name: '큰 나무 언덕', at: [4, -4], r: 60 },
  { id: 'slope', name: '꽃 비탈', at: [150, -70], r: 70 },
  { id: 'tarn', name: '고요한 못', at: [415, 38], r: 85 },
  { id: 'east', name: '해 뜨는 숲', at: [236, 215], r: 80 },
  { id: 'west', name: '그늘 숲', at: [200, -230], r: 85 },
  { id: 'road', name: '마을 가는 길', at: [505, -95], r: 70 },
  { id: 'back', name: '뒷동산', at: [-210, 10], r: 100 },
  { id: 'wind', name: '바람 언덕', at: [40, 330], r: 90 },
  { id: 'far', name: '먼 풀밭', at: [360, -330], r: 90 },
];

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const rgb = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})`;

/**
 * @param o.field, o.trees, o.stones; o.reach how far the walk goes
 * @param o.seen what is kept of where you have been: { cells: base64, regions: [id] } (written to as you walk)
 * @param o.root the game's page; o.ui its panels; o.touch
 * @param o.on { home(): run to the camp, found(region): a named place has been found }
 */
export function createMap({ field, trees, stones, reach, seen, root, ui, touch, on }) {
  const extent = reach + 36; // metres from the middle to the map's edge
  const toMap = (x, z) => [((x + extent) / (2 * extent)) * SIZE, ((z + extent) / (2 * extent)) * SIZE];
  const scale = SIZE / (2 * extent);

  // ---- the picture of the land, painted once ---------------------------------------------------------------------
  const land = document.createElement('canvas');
  land.width = land.height = SIZE;
  {
    const HALF = SIZE / 2;
    const small = document.createElement('canvas');
    small.width = small.height = HALF;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(HALF, HALF);
    const step = (2 * extent) / HALF;
    const [tx, tz] = TARN.at;
    for (let j = 0, k = 0; j < HALF; j++) {
      const z = -extent + (j + 0.5) * step;
      for (let i = 0; i < HALF; i++, k += 4) {
        const x = -extent + (i + 0.5) * step;
        const r = Math.hypot(x, z);
        const h = field.heightAt(x, z);
        // light from the upper left, as on a drawn map: slopes that face it are pale, those turned away are deep
        const lit = Math.max(-1, Math.min(1, ((field.heightAt(x - 5, z - 5) - field.heightAt(x + 5, z + 5)) / 10) * 2.6));
        let c = [126 + lit * 34 + h * 0.5, 176 + lit * 30 + h * 0.3, 96 + lit * 18];
        // dry shoulders are straw, bare earth is a path
        const dry = field.dryAt(x, z);
        c = [c[0] + dry * 46, c[1] + dry * 14, c[2] - dry * 8];
        const growth = field.growthAt(x, z);
        if (growth < 0.6) {
          const bare = 1 - growth / 0.6;
          c = [c[0] + (226 - c[0]) * bare, c[1] + (204 - c[1]) * bare, c[2] + (158 - c[2]) * bare];
        }
        if (Math.abs(x - tx) < 90 && Math.abs(z - tz) < 90) {
          const t = tarnDistance(x, z);
          if (t < 0.9) c = t > 0.8 ? [196, 226, 232] : [108 + t * 40, 172 + t * 30, 214];
        }
        // past where the walk goes, the map is only sketched
        const out = Math.min(1, Math.max(0, (r - reach) / 26));
        c = [c[0] + (232 - c[0]) * out * 0.75, c[1] + (222 - c[1]) * out * 0.75, c[2] + (190 - c[2]) * out * 0.75];
        img.data[k] = c[0];
        img.data[k + 1] = c[1];
        img.data[k + 2] = c[2];
        img.data[k + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
    const ctx = land.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, SIZE, SIZE);
    // stones, then trees over them: a crown is a dark round with a paler one inside it, up and to the left
    ctx.fillStyle = 'rgba(120, 122, 124, 0.9)';
    for (const [x, z, gap] of stones.solid) {
      const [mx, mz] = toMap(x, z);
      ctx.beginPath();
      ctx.arc(mx, mz, Math.max(1.2, gap * scale * 1.4), 0, Math.PI * 2);
      ctx.fill();
    }
    const crowns = trees.trees.filter(([x, z]) => Math.abs(x) < extent && Math.abs(z) < extent).sort((a, b) => a[1] - b[1]);
    for (const [x, z, kind, s] of crowns) {
      const [mx, mz] = toMap(x, z);
      const bush = kind >= 7;
      const far = kind > 3 && !bush;
      const cr = (kind === 0 ? 11 : bush ? 1.6 : far ? 4.4 : 5) * s * scale + (bush ? 0.6 : 1);
      ctx.globalAlpha = far ? 0.55 : 1;
      ctx.fillStyle = 'rgba(40, 70, 44, 0.35)';
      ctx.beginPath();
      ctx.arc(mx + cr * 0.3, mz + cr * 0.35, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bush ? '#5f9a4c' : '#3f7d43';
      ctx.beginPath();
      ctx.arc(mx, mz, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bush ? '#7db45c' : '#5c9c50';
      ctx.beginPath();
      ctx.arc(mx - cr * 0.25, mz - cr * 0.28, cr * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the edge of the walk, and the edge of your own land
    ctx.strokeStyle = 'rgba(110, 86, 60, 0.5)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, reach * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 80, 60, 0.75)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(...toMap(HOME.x, HOME.z), HOME.r * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- the mist -------------------------------------------------------------------------------------------------
  const cells = new Uint8Array(CELLS * CELLS);
  if (seen.cells) {
    try {
      const raw = atob(seen.cells);
      for (let i = 0; i < cells.length; i++) cells[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
    } catch {
      // a map that can't be read is a blank one
    }
  }
  seen.regions ??= [];
  const cell = (2 * extent) / CELLS;
  const mistGrid = document.createElement('canvas');
  mistGrid.width = mistGrid.height = CELLS;
  const mist = document.createElement('canvas');
  mist.width = mist.height = SIZE;
  // what the mist is made of: pale, with soft shapes in it
  const cloud = document.createElement('canvas');
  cloud.width = cloud.height = SIZE;
  {
    const ctx = cloud.getContext('2d');
    ctx.fillStyle = '#e4e9ea';
    ctx.fillRect(0, 0, SIZE, SIZE);
    let a = 7;
    const random = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 420; i++) {
      const x = random() * SIZE;
      const y = random() * SIZE;
      const r = 14 + random() * 42;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = random() < 0.5 ? '255, 255, 255' : '196, 208, 216';
      g.addColorStop(0, `rgba(${tone}, 0.32)`);
      g.addColorStop(1, `rgba(${tone}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  const whole = document.createElement('canvas'); // the land with the mist over it
  whole.width = whole.height = SIZE;
  function compose() {
    const gctx = mistGrid.getContext('2d');
    const img = gctx.createImageData(CELLS, CELLS);
    for (let i = 0; i < cells.length; i++) img.data[i * 4 + 3] = cells[i] ? 0 : 255;
    gctx.putImageData(img, 0, 0);
    const mctx = mist.getContext('2d');
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, SIZE, SIZE);
    // (the grid drawn large and blurred is the mist's shape; the cloud is what shows through it)
    mctx.filter = `blur(${Math.round((SIZE / CELLS) * 0.9)}px)`;
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(mistGrid, 0, 0, SIZE, SIZE);
    mctx.filter = 'none';
    mctx.globalCompositeOperation = 'source-in';
    mctx.drawImage(cloud, 0, 0);
    const ctx = whole.getContext('2d');
    ctx.drawImage(land, 0, 0);
    ctx.drawImage(mist, 0, 0);
  }
  const keep = () => {
    const bytes = new Uint8Array(Math.ceil(cells.length / 8));
    for (let i = 0; i < cells.length; i++) if (cells[i]) bytes[i >> 3] |= 1 << (i & 7);
    seen.cells = btoa(String.fromCharCode(...bytes));
  };
  /** Clears the mist round (x, z). True if anything new was seen. */
  function see(x, z, radius = SEEN) {
    let fresh = false;
    const i0 = Math.max(0, Math.floor((x - radius + extent) / cell));
    const i1 = Math.min(CELLS - 1, Math.floor((x + radius + extent) / cell));
    const j0 = Math.max(0, Math.floor((z - radius + extent) / cell));
    const j1 = Math.min(CELLS - 1, Math.floor((z + radius + extent) / cell));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (cells[i + j * CELLS]) continue;
        if (Math.hypot(-extent + (i + 0.5) * cell - x, -extent + (j + 0.5) * cell - z) > radius) continue;
        cells[i + j * CELLS] = 1;
        fresh = true;
      }
    }
    return fresh;
  }
  const isSeen = (x, z) => {
    const i = Math.floor((x + extent) / cell);
    const j = Math.floor((z + extent) / cell);
    return i >= 0 && j >= 0 && i < CELLS && j < CELLS && cells[i + j * CELLS] === 1;
  };
  see(HOME.x, HOME.z, HOME.r + 14);
  compose();

  // ---- the small map --------------------------------------------------------------------------------------------
  const MINI = touch ? 92 : 132;
  const VIEW = 105; // metres from you to its edge
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const mini = el('button');
  mini.id = 'minimap';
  mini.title = '지도';
  const miniCanvas = document.createElement('canvas');
  miniCanvas.width = miniCanvas.height = Math.round(MINI * dpr);
  mini.appendChild(miniCanvas);
  mini.appendChild(el('span', 'tag', touch ? '지도' : '<kbd>M</kbd>지도'));
  root.appendChild(mini);
  mini.addEventListener('click', () => on.open());

  const things = { x: 0, z: 0, yaw: 0, spirits: [], animals: [], going: false };
  function arrow(ctx, x, y, yaw, size) {
    ctx.save();
    ctx.translate(x, y);
    // (yaw 0 looks along +z, which is down the map)
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size * 0.72, -size * 0.8);
    ctx.lineTo(0, -size * 0.36);
    ctx.lineTo(-size * 0.72, -size * 0.8);
    ctx.closePath();
    ctx.fillStyle = '#fff8e0';
    ctx.strokeStyle = '#3b2f27';
    ctx.lineWidth = Math.max(1.5, size * 0.22);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  function tent(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, size * 0.2);
    ctx.strokeStyle = '#3b2f27';
    ctx.fillStyle = '#e9573f';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, size * 0.8);
    ctx.lineTo(-size, size * 0.8);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.15);
    ctx.lineTo(size * 0.36, size * 0.8);
    ctx.lineTo(-size * 0.36, size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawMini() {
    const ctx = miniCanvas.getContext('2d');
    const W = miniCanvas.width;
    const k = W / (2 * VIEW); // canvas pixels to a metre
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath();
    ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e4e9ea';
    ctx.fillRect(0, 0, W, W);
    const [mx, mz] = toMap(things.x, things.z);
    const src = VIEW * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(whole, mx - src, mz - src, 2 * src, 2 * src, 0, 0, W, W);
    const place = (x, z) => [W / 2 + (x - things.x) * k, W / 2 + (z - things.z) * k];
    for (const s of things.spirits) {
      if (!isSeen(s.x, s.z)) continue;
      const [x, y] = place(s.x, s.z);
      ctx.beginPath();
      ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = rgb(SPIRIT_LOOKS[s.kind][s.sort % 3][0]);
      ctx.strokeStyle = s.friend ? '#3b2f27' : '#ffffff';
      ctx.lineWidth = 1.4 * dpr;
      ctx.fill();
      ctx.stroke();
    }
    // the camp: where it is, or at the rim the way it lies
    let [hx, hy] = place(HOME.x, HOME.z);
    const off = Math.hypot(hx - W / 2, hy - W / 2);
    const rim = W / 2 - 9 * dpr;
    if (off > rim) {
      hx = W / 2 + ((hx - W / 2) / off) * rim;
      hy = W / 2 + ((hy - W / 2) / off) * rim;
    }
    tent(ctx, hx, hy, 6 * dpr);
    arrow(ctx, W / 2, W / 2, things.yaw, 6.5 * dpr);
    ctx.restore();
  }

  // ---- the whole map, in a panel ----------------------------------------------------------------------------------
  let big = null;
  function open() {
    ui.openPanel('map', '골짜기 지도', () => `${seen.regions.length} / ${REGIONS.length}곳 발견 · 안개는 걸어간 만큼 걷혀요`, (into) => {
      const wrap = el('div', 'bigmap');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      wrap.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(whole, 0, 0);
      const pct = (x, z) => {
        const [mx, mz] = toMap(x, z);
        return [`${(mx / SIZE) * 100}%`, `${(mz / SIZE) * 100}%`];
      };
      for (const region of REGIONS) {
        if (!seen.regions.includes(region.id)) continue;
        const label = el('span', 'place', region.name);
        [label.style.left, label.style.top] = pct(...fromValley(...region.at));
        wrap.appendChild(label);
      }
      for (const s of things.spirits) {
        if (s.friend || !isSeen(s.x, s.z)) continue;
        const dot = el('i', 'spirit');
        dot.style.background = rgb(SPIRIT_LOOKS[s.kind][s.sort % 3][0]);
        [dot.style.left, dot.style.top] = pct(s.x, s.z);
        wrap.appendChild(dot);
      }
      const you = el('i', 'you');
      [you.style.left, you.style.top] = pct(things.x, things.z);
      you.style.transform = `translate(-50%, -50%) rotate(${-things.yaw}rad)`;
      wrap.appendChild(you);
      const camp = el('button', 'camp', '<i></i><b>베이스캠프</b>');
      [camp.style.left, camp.style.top] = pct(HOME.x, HOME.z);
      camp.addEventListener('click', () => {
        ui.close();
        on.home();
      });
      wrap.appendChild(camp);
      into.appendChild(wrap);
      const foot = el('p', 'note');
      foot.style.margin = '10px 0 0';
      const go = el('button', 'on', '⛺ 베이스캠프로 달려가기');
      go.addEventListener('click', () => {
        ui.close();
        on.home();
      });
      foot.append(go, ' 지도의 베이스캠프 표시를 눌러도 돼요. 가는 동안 직접 움직이면 멈춥니다.');
      into.appendChild(foot);
      big = { you, pct };
    });
  }

  let tick = 0;
  let dirty = false;
  return {
    open,
    isSeen,
    /** How much of the valley has been seen, 0 to 1 (of what can be walked). */
    get share() {
      let n = 0;
      let of = 0;
      for (let j = 0; j < CELLS; j++) {
        for (let i = 0; i < CELLS; i++) {
          if (Math.hypot(-extent + (i + 0.5) * cell, -extent + (j + 0.5) * cell) > reach) continue;
          of++;
          n += cells[i + j * CELLS];
        }
      }
      return n / of;
    },
    /**
     * @param dt seconds
     * @param now { x, z, yaw (0 looks along +z), spirits: [{ x, z, kind, sort, friend }] }
     */
    update(dt, now) {
      Object.assign(things, now);
      if (see(now.x, now.z)) dirty = true;
      for (const region of REGIONS) {
        if (seen.regions.includes(region.id)) continue;
        const [x, z] = fromValley(...region.at);
        if (Math.hypot(x - now.x, z - now.z) > region.r) continue;
        seen.regions.push(region.id);
        on.found(region);
      }
      tick -= dt;
      if (tick > 0) return;
      tick = 0.12;
      if (dirty) {
        dirty = false;
        compose();
        keep();
        on.changed?.();
      }
      drawMini();
      if (big && ui.open === 'map') {
        [big.you.style.left, big.you.style.top] = big.pct(things.x, things.z);
        big.you.style.transform = `translate(-50%, -50%) rotate(${-things.yaw}rad)`;
      } else big = null;
    },
  };
}
