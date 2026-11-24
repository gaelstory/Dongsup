// Procedural house for the hero drawing. Pure geometry with no WebGL calls, so the live scene
// and the Node script that renders the static SVG fallback build exactly the same house.
// Units are metres. North is -z, so the living room and the gable face the road on +z.

export const PAL = {
  chalk: [242 / 255, 245 / 255, 252 / 255],
  tracing: [169 / 255, 190 / 255, 240 / 255],
  marker: [1, 122 / 255, 31 / 255],
};

const T = 0.2;              // wall thickness
const F0 = 0.3;             // top of foundation = 1F floor
const H1 = 2.8;             // 1F wall height
const S1 = 0.25;            // 1F slab thickness
const F1 = F0 + H1 + S1;    // 2F floor
const H2 = 2.65;            // 2F eave height
const RISE = 2.17;          // gable rise above the eave line (about 35 degrees)
const SLOPE = Math.atan(RISE / 3.1);

export const LEVELS = { F0, F1, H1, H2, RISE, SLOPE };

export function buildModel(THREE, opts = {}) {
  const small = !!opts.small;
  const parts = [];
  const glass = [];
  const anchors = {};

  // Transform nodes. Walls get their pivot at the floor they stand on so scale.y "raises" them.
  const groups = {
    site: { parent: null },
    sun: { parent: null },
    lower: { parent: null },
    wall1: { parent: 'lower', y: F0 },
    upper: { parent: null },
    slab1: { parent: 'upper' },
    wall2: { parent: 'upper', y: F1 },
    roof: { parent: null },
    roofL: { parent: 'roof' },
    roofR: { parent: 'roof' },
    treeA: { parent: null, x: 7.4, z: 4.6 },
    treeB: { parent: null, x: -7.0, z: -1.2 },
    ghost: { parent: null },
  };

  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function edges(geo, thresh = 20) {
    const e = new THREE.EdgesGeometry(geo, thresh);
    const a = Array.from(e.attributes.position.array);
    e.dispose();
    return a;
  }
  function flat(geo) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    return Array.from(g.attributes.position.array);
  }
  function faceGeo(arr) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }
  function box(x0, y0, z0, x1, y1, z1) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return g;
  }
  function seg(out, a, b) { out.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  function poly(out, pts, closed) {
    for (let i = 0; i < pts.length - 1; i++) seg(out, pts[i], pts[i + 1]);
    if (closed) seg(out, pts[pts.length - 1], pts[0]);
  }
  function ring(out, cx, cy, cz, r, n, plane = 'xz') {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      if (plane === 'xz') pts.push([cx + c, cy, cz + s]);
      else if (plane === 'xy') pts.push([cx + c, cy + s, cz]);
      else pts.push([cx, cy + s, cz + c]);
    }
    poly(out, pts, true);
  }
  // L-shaped footprint used by the foundation and the slab, optionally grown by `g` metres.
  function lShape(g, holes = []) {
    // shape y = -world z (see rotateX below)
    const s = new THREE.Shape();
    s.moveTo(-4.5 - g, 3.5 + g);
    s.lineTo(1.5 + g, 3.5 + g);
    s.lineTo(1.5 + g, 0.5 + g);
    s.lineTo(4.5 + g, 0.5 + g);
    s.lineTo(4.5 + g, -3.5 - g);
    s.lineTo(-4.5 - g, -3.5 - g);
    const sh = new THREE.Shape(s.getPoints().map((p) => new THREE.Vector2(p.x, -p.y)));
    for (const h of holes) {
      const p = new THREE.Path();
      p.moveTo(h[0], -h[1]); p.lineTo(h[2], -h[1]); p.lineTo(h[2], -h[3]); p.lineTo(h[0], -h[3]);
      sh.holes.push(p);
    }
    return sh;
  }
  function slabGeo(shape, y0, th) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return g;
  }

  // A straight wall with door notches (openings that touch the floor) and window holes.
  // axis 'x': runs along x at z = c; axis 'z': runs along z at x = c. a..b is its extent.
  function wall(spec, frames, glassList, glassGroup) {
    const { axis, c, a, b, h, ops = [], peak } = spec;
    const len = b - a;
    const doors = ops.filter((o) => o.y0 <= 0.001).map((o) => ({ ...o, u0: o.at - o.w / 2 - a })).sort((p, q) => p.u0 - q.u0);
    const wins = ops.filter((o) => o.y0 > 0.001).map((o) => ({ ...o, u0: o.at - o.w / 2 - a }));
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    for (const d of doors) { s.lineTo(d.u0, 0); s.lineTo(d.u0, d.h); s.lineTo(d.u0 + d.w, d.h); s.lineTo(d.u0 + d.w, 0); }
    s.lineTo(len, 0);
    s.lineTo(len, h);
    if (peak) s.lineTo(peak.at - a, peak.h);
    s.lineTo(0, h);
    for (const w of wins) {
      const p = new THREE.Path();
      p.moveTo(w.u0, w.y0); p.lineTo(w.u0 + w.w, w.y0); p.lineTo(w.u0 + w.w, w.y0 + w.h); p.lineTo(w.u0, w.y0 + w.h);
      s.holes.push(p);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
    const m = new THREE.Matrix4();
    if (axis === 'x') m.makeTranslation(a, 0, c - T / 2);
    else { m.makeRotationY(-Math.PI / 2); m.setPosition(c + T / 2, 0, a); }
    geo.applyMatrix4(m);
    // frames sit on the wall's centre plane
    const P = (u, v) => v3(u, v, T / 2).applyMatrix4(m).toArray();
    for (const o of [...doors, ...wins]) {
      const i = 0.05, u0 = o.u0 + i, u1 = o.u0 + o.w - i, y0 = o.y0 + (o.y0 > 0 ? i : 0), y1 = o.y0 + o.h - i;
      poly(frames, [P(u0, y0), P(u1, y0), P(u1, y1), P(u0, y1)], true);
      const n = o.w > 2.4 ? 3 : o.w > 1.1 ? 2 : 1;
      for (let k = 1; k < n; k++) { const u = u0 + ((u1 - u0) * k) / n; seg(frames, P(u, y0), P(u, y1)); }
      if (o.y0 > 0 && o.h > 1.1) { const y = y0 + (y1 - y0) * 0.72; seg(frames, P(u0, y), P(u1, y)); }
      const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
      g.translate((u0 + u1) / 2, (y0 + y1) / 2, T / 2);
      g.applyMatrix4(m);
      glassList.push(...flat(g));
    }
    return geo;
  }

  // ---------- site ----------
  {
    const R = small ? 12 : 14;
    const minor = [], major = [];
    for (let x = -R; x <= R; x += small ? 2 : 1) (x % 5 === 0 ? major : minor).push(x, 0, -R * 0.78, x, 0, R * 0.78);
    for (let z = -Math.floor(R * 0.78); z <= R * 0.78; z += small ? 2 : 1) (z % 5 === 0 ? major : minor).push(-R, 0, z, R, 0, z);
    parts.push({ id: 'gridMinor', group: 'site', segs: minor, color: 'chalk', alpha: 0.14, width: 1, order: 'seq', spread: 3, tip: false, fade: [6.5, 12.5], depth: true });
    parts.push({ id: 'gridMajor', group: 'site', segs: major, color: 'tracing', alpha: 0.42, width: 1, order: 'seq', spread: 2, tip: true, fade: [7, 13.5], depth: true });

    // lot line, road and north arrow
    const lot = [], road = [], north = [];
    poly(lot, [[-10, 0, -7], [10, 0, -7], [10, 0, 7.6], [-10, 0, 7.6]], true);
    road.push(-14, 0, 8.6, 14, 0, 8.6, -14, 0, 12.6, 14, 0, 12.6);
    const nx = -7.8, nz = 5.0;
    ring(north, nx, 0.01, nz, 0.85, 36);
    seg(north, [nx, 0.01, nz + 0.85], [nx, 0.01, nz - 1.35]);
    seg(north, [nx, 0.01, nz - 1.35], [nx - 0.32, 0.01, nz - 0.55]);
    seg(north, [nx, 0.01, nz - 1.35], [nx + 0.32, 0.01, nz - 0.55]);
    // the letter N, drawn on the ground north of the arrow
    const lz = nz - 1.75;
    poly(north, [[nx - 0.22, 0.01, lz + 0.0], [nx - 0.22, 0.01, lz - 0.5], [nx + 0.22, 0.01, lz + 0.0], [nx + 0.22, 0.01, lz - 0.5]], false);
    parts.push({ id: 'lot', group: 'site', segs: lot, color: 'tracing', alpha: 0.75, width: 1.2, order: 'seq', spread: 0.6, tip: true, dash: 2, depth: true });
    parts.push({ id: 'road', group: 'site', segs: road, color: 'tracing', alpha: 0.5, width: 1, order: 'seq', spread: 0.5, tip: false, fade: [10, 15], depth: true });
    parts.push({ id: 'north', group: 'site', segs: north, color: 'chalk', alpha: 0.9, width: 1.3, order: 'seq', spread: 1.5, tip: true, depth: true });
    anchors.north = { group: 'site', p: [nx, 0, nz] };
  }

  // ---------- sun path ----------
  {
    const arc = [], R = 10.5, alt = (56 * Math.PI) / 180, pts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI;
      pts.push([R * Math.cos(th), R * Math.sin(th) * Math.sin(alt), R * Math.sin(th) * Math.cos(alt)]);
    }
    poly(arc, pts, false);
    // short hour ticks along the arc
    for (let k = 1; k < 8; k++) {
      const th = (k / 8) * Math.PI;
      const p = [R * Math.cos(th), R * Math.sin(th) * Math.sin(alt), R * Math.sin(th) * Math.cos(alt)];
      const q = [p[0] * 0.95, p[1] * 0.95, p[2] * 0.95];
      seg(arc, p, q);
    }
    parts.push({ id: 'sunArc', group: 'sun', segs: arc, color: 'marker', alpha: 0.95, width: 1.4, order: 'seq', spread: 0.2, tip: false, dash: 1, depth: true });
    const disc = [];
    ring(disc, 0, 0, 0, 0.62, 28, 'xy');
    ring(disc, 0, 0, 0, 0.62, 28, 'yz');
    parts.push({ id: 'sunRing', group: 'sunBody', segs: disc, color: 'marker', alpha: 1, width: 1.2, order: 'seq', spread: 0, tip: false, depth: false });
    groups.sunBody = { parent: 'sun' };
    anchors.sunApex = { group: 'sun', p: [0, R * Math.sin(alt) + 0.9, R * Math.cos(alt)] };
  }

  // ---------- foundation ----------
  {
    const g = slabGeo(lShape(0.2), 0, F0);
    parts.push({ id: 'found', group: 'lower', segs: edges(g), faces: faceGeo(flat(g)), color: 'chalk', alpha: 1, width: 1.5, order: 'seq', spread: 0.8, tip: true, hidden: true, depth: true, over: 0.09 });
  }

  // ---------- floor plan lines drawn on the 1F floor ----------
  {
    const pl = [], y = F0 + 0.01;
    // partition lines and the stair outline as they would read on a plan
    seg(pl, [1.6, y, -0.9], [4.4, y, -0.9]);        // entry hall / kitchen
    seg(pl, [-4.4, y, 0.0], [-1.9, y, 0.0]);        // living / dining
    seg(pl, [-4.4, y, -2.2], [-1.2, y, -2.2]);      // stair edge
    // entrance door swing and terrace door swing
    const arcPts = (cx, cz, r, a0, a1) => { const p = []; for (let i = 0; i <= 14; i++) { const a = a0 + ((a1 - a0) * i) / 14; p.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); } return p; };
    poly(pl, arcPts(2.2, 0.5, 1.0, -Math.PI / 2, 0), false);
    seg(pl, [2.2, y, 0.5], [2.2, y, -0.5]);
    poly(pl, arcPts(-0.1, 0.0, 0.9, 0, Math.PI / 2), false);
    // kitchen counter outline on the floor
    poly(pl, [[3.7, y, -0.9], [3.7, y, -2.9], [2.1, y, -2.9]], false);
    parts.push({ id: 'plan', group: 'lower', segs: pl, color: 'tracing', alpha: 0.85, width: 1, order: 'seq', spread: 1.2, tip: true, depth: true });
  }

  // ---------- 1F walls ----------
  const frames1 = [], glass1 = [];
  {
    const h = H1;
    const W = [
      { axis: 'x', c: -3.5, a: -4.6, b: 4.6, h, ops: [{ at: 3.0, w: 1.6, y0: 1.05, h: 1.0 }, { at: -3.0, w: 1.2, y0: 0.9, h: 1.2 }, { at: 0.2, w: 0.8, y0: 1.2, h: 0.8 }] },
      { axis: 'z', c: 4.5, a: -3.4, b: 0.4, h, ops: [{ at: -1.6, w: 1.4, y0: 0.9, h: 1.2 }] },
      { axis: 'x', c: 0.5, a: 1.4, b: 4.6, h, ops: [{ at: 2.7, w: 1.0, y0: 0, h: 2.2 }, { at: 3.95, w: 0.6, y0: 1.0, h: 1.0 }] },
      { axis: 'z', c: 1.5, a: 0.6, b: 3.4, h, ops: [{ at: 2.0, w: 2.0, y0: 0, h: 2.3 }] },
      { axis: 'x', c: 3.5, a: -4.6, b: 1.6, h, ops: [{ at: -1.25, w: 3.0, y0: 0, h: 2.3 }, { at: -3.75, w: 1.0, y0: 0.9, h: 1.2 }] },
      { axis: 'z', c: -4.5, a: -3.4, b: 3.4, h, ops: [{ at: 0.9, w: 1.6, y0: 0.9, h: 1.2 }] },
    ];
    const segs = [], faces = [];
    for (const w of W) { const g = wall(w, frames1, glass1); segs.push(...edges(g)); faces.push(...flat(g)); g.dispose(); }
    parts.push({ id: 'wall1', group: 'wall1', segs, faces: faceGeo(faces), color: 'chalk', alpha: 1, width: 1.6, order: 'y', spread: 1.2, tip: true, hidden: true, depth: true, over: 0.09 });
    parts.push({ id: 'frames1', group: 'wall1', segs: frames1, color: 'tracing', alpha: 1, width: 1, order: 'seq', spread: 1.5, tip: true, hidden: true, depth: true });
    glass.push({ id: 'glass1', group: 'wall1', pos: glass1 });
  }

  // ---------- stairs (one sawtooth profile, extruded across its width) ----------
  {
    const n = 14, x0 = -1.3, run = 3.0 / n, rise = (F1 - F0) / n;
    const s = new THREE.Shape();
    s.moveTo(x0, F0);
    for (let i = 0; i < n; i++) { s.lineTo(x0 - i * run, F0 + (i + 1) * rise); s.lineTo(x0 - (i + 1) * run, F0 + (i + 1) * rise); }
    s.lineTo(x0 - n * run, F0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false });
    g.translate(0, 0, -3.3);
    parts.push({ id: 'stairs', group: 'lower', segs: edges(g), faces: faceGeo(flat(g)), color: 'chalk', alpha: 0.95, width: 1.2, order: 'x', spread: 1.5, tip: true, hidden: true, depth: true });
  }

  // ---------- 1F slab (2F floor and the roof terrace over the wing) ----------
  {
    const g = slabGeo(lShape(0.1, [[-4.3, -2.2, -1.2, -3.3]]), F0 + H1, S1);
    parts.push({ id: 'slab1', group: 'slab1', segs: edges(g), faces: faceGeo(flat(g)), color: 'chalk', alpha: 1, width: 1.5, order: 'seq', spread: 0.8, tip: true, hidden: true, depth: true, over: 0.09 });
  }

  // ---------- 2F walls with gables ----------
  const frames2 = [], glass2 = [];
  {
    const h = H2, peak = { at: -1.5, h: H2 + RISE };
    const W = [
      { axis: 'x', c: -3.5, a: -4.6, b: 1.6, h, peak, ops: [{ at: -3.1, w: 1.2, y0: 0.9, h: 1.2 }, { at: 0.2, w: 0.8, y0: 1.1, h: 0.9 }] },
      { axis: 'x', c: 3.5, a: -4.6, b: 1.6, h, peak, ops: [{ at: -3.25, w: 1.2, y0: 0.9, h: 1.3 }, { at: 0.15, w: 1.2, y0: 0.9, h: 1.3 }, { at: -1.5, w: 0.7, y0: 2.95, h: 0.7 }] },
      { axis: 'z', c: 1.5, a: -3.4, b: 3.4, h, ops: [{ at: -1.6, w: 0.9, y0: 0, h: 2.1 }, { at: 1.6, w: 1.6, y0: 0.9, h: 1.2 }] },
      { axis: 'z', c: -4.5, a: -3.4, b: 3.4, h, ops: [{ at: 1.0, w: 1.4, y0: 0.9, h: 1.2 }] },
    ];
    const segs = [], faces = [];
    for (const w of W) { const g = wall(w, frames2, glass2); segs.push(...edges(g)); faces.push(...flat(g)); g.dispose(); }
    // terrace railing on the wing roof (relative to the 2F floor pivot)
    const ry = 0.95, rail = [[1.6, ry, -3.6], [4.6, ry, -3.6], [4.6, ry, 0.6], [1.6, ry, 0.6]];
    poly(frames2, rail, false);
    for (const p of [[2.6, -3.6], [3.6, -3.6], [4.6, -3.6], [4.6, -2.1], [4.6, -0.7], [4.6, 0.6], [3.6, 0.6], [2.6, 0.6]]) seg(frames2, [p[0], 0, p[1]], [p[0], ry, p[1]]);
    parts.push({ id: 'wall2', group: 'wall2', segs, faces: faceGeo(faces), color: 'chalk', alpha: 1, width: 1.6, order: 'y', spread: 1.2, tip: true, hidden: true, depth: true, over: 0.09 });
    parts.push({ id: 'frames2', group: 'wall2', segs: frames2, color: 'tracing', alpha: 1, width: 1, order: 'seq', spread: 1.5, tip: true, hidden: true, depth: true });
    glass.push({ id: 'glass2', group: 'wall2', pos: glass2 });
  }

  // ---------- roof: two planes meeting at a ridge over x = -1.5 ----------
  {
    const th = 0.18, over = 0.55, eaveY = F1 + H2, ridgeY = eaveY + RISE;
    const L = Math.hypot(3.1 + over, (3.1 + over) * Math.tan(SLOPE)) + 0.12;
    const mk = (side) => {
      const g = new THREE.BoxGeometry(L, th, 7 + 2 * 0.5);
      // local box: x along the slope from ridge (0) to eave (L)
      g.translate(L / 2 - 0.12, th / 2, 0);
      g.rotateZ(-SLOPE);
      if (side < 0) g.scale(-1, 1, 1);
      g.translate(-1.5, ridgeY, 0);
      return g;
    };
    const gr = mk(1), gl = mk(-1);
    parts.push({ id: 'roofR', group: 'roofR', segs: edges(gr), faces: faceGeo(flat(gr)), color: 'chalk', alpha: 1, width: 1.6, order: 'seq', spread: 0.8, tip: true, hidden: true, depth: true, over: 0.09 });
    parts.push({ id: 'roofL', group: 'roofL', segs: edges(gl), faces: faceGeo(flat(gl)), color: 'chalk', alpha: 1, width: 1.6, order: 'seq', spread: 0.8, tip: true, hidden: true, depth: true, over: 0.09 });
    // roof sheet seams on the visible east plane
    const seams = [], n = 9;
    const top = (d) => [-1.5 + d * Math.cos(SLOPE) + (th + 0.004) * Math.sin(SLOPE), ridgeY - d * Math.sin(SLOPE) + (th + 0.004) * Math.cos(SLOPE)];
    for (let i = 1; i < n; i++) {
      const z = -4 + (8 * i) / n, a = top(0.12), b = top(L - 0.3);
      seg(seams, [a[0], a[1], z], [b[0], b[1], z]);
    }
    parts.push({ id: 'seams', group: 'roofR', segs: seams, color: 'tracing', alpha: 0.7, width: 1, order: 'seq', spread: 1.5, tip: false, hidden: false, depth: true });
    anchors.roof = { group: 'roofR', p: [0.9, ridgeY - 1.2, 4.4] };
  }

  // ---------- trees: wire crown + trunk ----------
  for (const [id, r, cy, trunk] of [['treeA', 1.55, 3.7, 2.3], ['treeB', 1.15, 2.9, 1.8]]) {
    const s = [];
    const lat = 5, lon = 8;
    for (let i = 1; i < lat; i++) {
      const phi = (i / lat) * Math.PI;
      ring(s, 0, cy + Math.cos(phi) * r, 0, Math.sin(phi) * r, 24, 'xz');
    }
    for (let j = 0; j < lon; j++) {
      const th = (j / lon) * Math.PI * 2, pts = [];
      for (let i = 0; i <= 12; i++) { const phi = (i / 12) * Math.PI; pts.push([Math.sin(phi) * Math.cos(th) * r, cy + Math.cos(phi) * r, Math.sin(phi) * Math.sin(th) * r]); }
      poly(s, pts, false);
    }
    seg(s, [-0.07, 0, 0], [-0.05, trunk + 0.2, 0]);
    seg(s, [0.07, 0, 0], [0.05, trunk + 0.2, 0]);
    seg(s, [0, trunk - 0.4, 0], [0.5, trunk + 0.15, 0.2]);
    ring(s, 0, 0.01, 0, 0.55, 20, 'xz');
    parts.push({ id, group: id, segs: s, color: 'chalk', alpha: 0.92, width: 1.1, order: 'y', spread: 1.6, tip: true, depth: true });
  }

  // ---------- furniture ----------
  {
    const f1 = [box(-3.6, F0, 0.55, -1.4, F0 + 0.42, 1.45), box(-3.6, F0 + 0.42, 0.55, -1.4, F0 + 0.85, 0.78),
      box(-2.9, F0, 1.95, -2.1, F0 + 0.36, 2.55), box(-0.9, F0 + 0.7, -2.0, 0.7, F0 + 0.75, -1.1),
      box(3.75, F0, -2.95, 4.35, F0 + 0.88, -1.0), box(2.0, F0, -3.35, 3.75, F0 + 0.88, -2.95)];
    const segs = [], faces = [];
    for (const g of f1) { segs.push(...edges(g)); faces.push(...flat(g)); g.dispose(); }
    for (const [x, z] of [[-0.8, -1.9], [0.6, -1.9], [-0.8, -1.2], [0.6, -1.2]]) seg(segs, [x, F0, z], [x, F0 + 0.7, z]);
    // four chairs as simple outlines
    for (const [x, z] of [[-0.45, -2.35], [0.3, -2.35], [-0.45, -0.75], [0.3, -0.75]]) { const g = box(x - 0.22, F0 + 0.42, z - 0.2, x + 0.22, F0 + 0.46, z + 0.2); segs.push(...edges(g)); g.dispose(); }
    parts.push({ id: 'furn1', group: 'lower', segs, faces: faceGeo(faces), color: 'chalk', alpha: 0.95, width: 1.1, order: 'y', spread: 1.4, tip: true, hidden: true, depth: true });
    const f2 = [box(-4.25, F1, 1.0, -2.15, F1 + 0.48, 2.6), box(-4.38, F1, 0.9, -4.25, F1 + 1.0, 2.7),
      box(-0.6, F1, -1.6, 1.3, F1 + 0.42, -0.7), box(0.1, F1 + 0.7, -3.35, 1.3, F1 + 0.75, -2.75)];
    const s2 = [], fc2 = [];
    for (const g of f2) { s2.push(...edges(g)); fc2.push(...flat(g)); g.dispose(); }
    // pillows
    for (const z of [1.2, 1.9]) { const g = box(-4.15, F1 + 0.48, z, -3.7, F1 + 0.58, z + 0.5); s2.push(...edges(g)); g.dispose(); }
    parts.push({ id: 'furn2', group: 'upper', segs: s2, faces: faceGeo(fc2), color: 'chalk', alpha: 0.95, width: 1.1, order: 'y', spread: 1.4, tip: true, hidden: true, depth: true });
  }

  // ---------- route from the gate to the kitchen ----------
  {
    const p = [], yo = 0.04, yi = F0 + 0.04;
    const pts = [[2.7, yo, 7.6], [2.7, yo, 1.0], [2.7, yi, 0.8], [2.7, yi, -1.35], [3.35, yi, -1.35], [3.35, yi, -2.25]];
    poly(p, pts, false);
    const e = pts[pts.length - 1];
    seg(p, e, [e[0] - 0.2, e[1], e[2] + 0.32]);
    seg(p, e, [e[0] + 0.2, e[1], e[2] + 0.32]);
    ring(p, 2.7, yo, 7.6, 0.18, 14, 'xz');
    parts.push({ id: 'route', group: 'lower', segs: p, color: 'marker', alpha: 1, width: 2.4, order: 'seq', spread: 0.05, tip: false, depth: false });
    anchors.route = { group: 'lower', p: [3.0, yi, -0.3] };
  }

  // ---------- human scale figure and 1,700 bar ----------
  {
    const s = [], x = 3.7, z = 2.5, d = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    const P = (u, y) => [x + d[0] * u, y, z + d[2] * u];
    const head = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; head.push(P(Math.cos(a) * 0.12, 1.58 + Math.sin(a) * 0.12)); }
    poly(s, head, true);
    seg(s, P(0, 1.46), P(0, 0.88));
    seg(s, P(0, 0.88), P(-0.13, 0));
    seg(s, P(0, 0.88), P(0.13, 0));
    seg(s, P(0, 1.36), P(-0.22, 0.86));
    seg(s, P(0, 1.36), P(0.22, 0.86));
    const bx = 0.55;
    seg(s, P(bx, 0), P(bx, 1.7));
    seg(s, P(bx - 0.1, 0), P(bx + 0.1, 0));
    seg(s, P(bx - 0.1, 1.7), P(bx + 0.1, 1.7));
    seg(s, P(bx - 0.06, 0.85), P(bx + 0.06, 0.85));
    parts.push({ id: 'person', group: 'site', segs: s, color: 'chalk', alpha: 0.95, width: 1.2, order: 'y', spread: 1, tip: true, depth: true });
    anchors.person = { group: 'site', p: P(bx, 1.95) };
  }

  // ---------- dimension lines ----------
  {
    const s = [], y = 0.02, k = 0.2;
    // 9,000 along the front
    const zf = 5.3;
    seg(s, [-4.5, y, zf], [4.5, y, zf]);
    seg(s, [-4.5, y, 3.85], [-4.5, y, zf + 0.35]);
    seg(s, [4.5, y, 0.85], [4.5, y, zf + 0.35]);
    seg(s, [-4.5 - k, y, zf + k], [-4.5 + k, y, zf - k]);
    seg(s, [4.5 - k, y, zf + k], [4.5 + k, y, zf - k]);
    // 7,000 along the east side
    const xe = 6.3;
    seg(s, [xe, y, -3.5], [xe, y, 3.5]);
    seg(s, [4.85, y, -3.5], [xe + 0.35, y, -3.5]);
    seg(s, [1.85, y, 3.5], [xe + 0.35, y, 3.5]);
    seg(s, [xe - k, y, -3.5 + k], [xe + k, y, -3.5 - k]);
    seg(s, [xe - k, y, 3.5 + k], [xe + k, y, 3.5 - k]);
    parts.push({ id: 'dims', group: 'site', segs: s, color: 'tracing', alpha: 1, width: 1.1, order: 'seq', spread: 1, tip: true, depth: true });
    anchors.w9 = { group: 'site', p: [0, 0, zf] };
    anchors.d7 = { group: 'site', p: [xe, 0, 0] };
  }

  anchors.living = { group: 'lower', p: [-2.2, F0 + 0.2, 2.6] };
  anchors.bedroom = { group: 'upper', p: [-2.1, F1 + 0.6, 1.3] };

  return { parts, glass, groups, anchors };
}

// World-space copy of the shell (walls, slabs, roof) for the faint dashed "underlay" that shows
// the finished house before it is built.
export function ghostSegments(model) {
  const off = { lower: 0, wall1: F0, slab1: 0, wall2: F1, roofL: 0, roofR: 0 };
  const out = [];
  for (const p of model.parts) {
    if (!['found', 'wall1', 'slab1', 'wall2', 'roofL', 'roofR'].includes(p.id)) continue;
    const dy = off[p.group] || 0;
    for (let i = 0; i < p.segs.length; i += 3) out.push(p.segs[i], p.segs[i + 1] + dy, p.segs[i + 2]);
  }
  return out;
}
