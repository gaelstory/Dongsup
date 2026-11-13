// What the game's things look like, each built from a few plain solids with a paint apiece. Everything stands on
// y = 0 at its own middle and faces +z.
import * as THREE from 'three';
import { MAT, Shape } from './paint.js';

const TAU = Math.PI * 2;
const WOOD = [0.56, 0.39, 0.23];
const BARK = [0.38, 0.27, 0.18];
const CUT = [0.84, 0.7, 0.46];
const STONE = [0.62, 0.61, 0.57];
const STONE2 = [0.52, 0.53, 0.52];
const CANVAS = [0.94, 0.87, 0.68];
const THATCH = [0.84, 0.69, 0.36];
const RED = [0.8, 0.32, 0.22];
const SOIL = [0.38, 0.27, 0.19];
const LEAF = [0.3, 0.52, 0.2];
const LEAF2 = [0.2, 0.4, 0.2];
const LAMP = [1.0, 0.84, 0.48];
const DARK = [0.16, 0.12, 0.13];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A log lying along x. */
const log = (s, len, r, at, rot = [0, 0, 0], color = WOOD, mat = MAT.plain) => s.cyl(r, r, len, 12, { at, rot: [rot[0], rot[1], rot[2] + Math.PI / 2], color, mat });

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
/** A round stick from a to b: r0 thick at a, r1 at b. */
function stick(s, a, b, r0, r1, o = {}, sides = 8) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  _e.setFromQuaternion(_q.setFromUnitVectors(_up, _d.normalize()), 'XYZ');
  return s.cyl(r1, r0, len, sides, { at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [_e.x, _e.y, _e.z], ...o });
}
/** A flower on a stem with two leaves: h tall from (x, y, z), petals of a colour. k makes all of it bigger. */
function bloom(s, x, y, z, h, color, k = 1, petals = 6) {
  const tx = x + 0.02 * k;
  const tz = z + 0.01 * k;
  stick(s, [x, y, z], [tx, y + h, tz], 0.013 * k, 0.009 * k, { color: LEAF }, 5);
  s.leaf([x, y + h * 0.3, z], [x + 0.13 * k, y + h * 0.52, z + 0.05 * k], 0.07 * k, { color: LEAF });
  s.leaf([x, y + h * 0.45, z], [x - 0.12 * k, y + h * 0.64, z - 0.04 * k], 0.06 * k, { color: LEAF2 });
  for (let p = 0; p < petals; p++) {
    const b = (p / petals) * TAU + x * 7;
    s.leaf([tx, y + h, tz], [tx + Math.cos(b) * 0.1 * k, y + h + 0.03 * k, tz + Math.sin(b) * 0.1 * k], 0.078 * k, { color });
  }
  s.ball(0.034 * k, { at: [tx, y + h + 0.016 * k, tz], scale: [1, 0.7, 1], color: [1.0, 0.82, 0.25] }, 1);
}
const PETALS = [[1.0, 0.56, 0.72], [1.0, 0.84, 0.3], [0.99, 0.97, 0.92], [0.72, 0.56, 0.98], [0.98, 0.48, 0.34], [0.5, 0.66, 1.0]];

// ---- buildings ------------------------------------------------------------------------------------------------
const build = {
  campfire() {
    const s = new Shape();
    const random = rng(3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + random() * 0.2;
      const r = 0.15 + random() * 0.06;
      s.rock(r, 10 + i, { at: [Math.cos(a) * 0.56, r * 0.3, Math.sin(a) * 0.56], scale: [1, 0.82, 1], rot: [0, a * 3, 0], color: i % 3 ? STONE : [0.7, 0.68, 0.63] });
    }
    s.cyl(0.44, 0.47, 0.05, 16, { at: [0, 0.03, 0], color: [0.26, 0.24, 0.24], mat: MAT.soil });
    // embers in the ash, and the logs leaning together over them
    for (let i = 0; i < 6; i++) s.ball(0.045, { at: [Math.cos(i * 2.3) * 0.2, 0.07, Math.sin(i * 2.3) * 0.2], scale: [1, 0.5, 1], color: [1.0, 0.5, 0.18], shade: [1.0, 0.4, 0.12], ink: 1 }, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      stick(s, [Math.cos(a) * 0.34, 0.05, Math.sin(a) * 0.34], [Math.cos(a + 2.6) * 0.07, 0.62, Math.sin(a + 2.6) * 0.07], 0.06, 0.048, { color: i % 2 ? BARK : [0.47, 0.33, 0.21], mat: MAT.bark }, 10);
    }
    // three poles tied over the fire, and a pot hung from them
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.9;
      stick(s, [Math.cos(a) * 0.78, 0, Math.sin(a) * 0.78], [Math.cos(a) * -0.06, 1.5, Math.sin(a) * -0.06], 0.026, 0.02, { color: [0.36, 0.26, 0.2], mat: MAT.bark }, 7);
    }
    s.torus(0.045, 0.014, { at: [0, 1.4, 0], rot: [Math.PI / 2, 0, 0], color: [0.78, 0.7, 0.5] }, 10);
    stick(s, [0, 1.38, 0], [0, 1.08, 0], 0.008, 0.008, { color: DARK }, 5);
    s.lathe([[0.0, 0.82], [0.1, 0.83], [0.155, 0.9], [0.16, 1.0], [0.14, 1.04], [0.15, 1.06]], 14, { color: [0.24, 0.23, 0.27] });
    s.add(new THREE.TorusGeometry(0.13, 0.01, 5, 12, Math.PI), { at: [0, 1.05, 0], color: DARK });
    return s;
  },
  tent() {
    const s = new Shape();
    const W = 1.2;
    const H = 1.75;
    const D = 1.5;
    const cloth = { color: CANVAS, mat: MAT.cloth };
    s.box(2.2, 0.05, 2.8, { at: [0, 0.03, 0], color: [0.6, 0.45, 0.32], mat: MAT.weave });
    s.quad([-W, 0, -D], [-W, 0, D], [0, H, D], [0, H, -D], cloth);
    s.quad([W, 0, D], [W, 0, -D], [0, H, -D], [0, H, D], cloth);
    s.tri([-W, 0, -D], [0, H, -D], [W, 0, -D], cloth);
    // the flaps, drawn back from a dark doorway and tied
    s.tri([-W, 0, D], [-0.36, 0, D], [0, H, D], cloth);
    s.tri([0.36, 0, D], [W, 0, D], [0, H, D], cloth);
    s.tri([-0.36, 0, D - 0.04], [0.36, 0, D - 0.04], [0, H, D - 0.04], { color: [0.2, 0.15, 0.16], shade: DARK });
    for (const side of [-1, 1]) s.ball(0.035, { at: [side * 0.3, 0.62, D + 0.02], color: RED }, 1);
    // a band of red along the foot of each side
    const t = 0.2;
    for (const side of [-1, 1]) {
      const o = 0.012;
      const a = [side * (W + o * 0.82), o * 0.57];
      const b = [side * (W * (1 - t) + o * 0.82), H * t + o * 0.57];
      const corners = [[a[0], a[1], -D], [a[0], a[1], D], [b[0], b[1], D], [b[0], b[1], -D]];
      s.quad(...(side < 0 ? corners : corners.reverse()), { color: RED });
    }
    // ridge, poles, a pennant, and the lines that hold it down
    log(s, 3.3, 0.04, [0, H + 0.02, 0], [0, Math.PI / 2, 0], BARK);
    stick(s, [0, 0, D + 0.06], [0, H + 0.42, D + 0.06], 0.042, 0.03, { color: BARK }, 8);
    stick(s, [0, 0, -D - 0.06], [0, H + 0.1, -D - 0.06], 0.042, 0.034, { color: BARK }, 8);
    s.leaf([0, H + 0.4, D + 0.06], [0.42, H + 0.3, D + 0.1], 0.2, { color: RED }, [0, 0.2, 1]);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const peg = [sx * 1.75, 0, sz * (D + 0.5)];
      stick(s, [0, H, sz * (D + 0.06)], [peg[0], 0.1, peg[2]], 0.007, 0.007, { color: [0.86, 0.8, 0.64] }, 4);
      stick(s, [peg[0] - sx * 0.05, 0, peg[2]], [peg[0] + sx * 0.04, 0.2, peg[2]], 0.022, 0.018, { color: CUT }, 6);
    }
    // inside: a bedroll, and a little lamp hung from the ridge
    s.cyl(0.14, 0.14, 0.95, 12, { at: [0.25, 0.19, D - 0.55], rot: [0, 0.3, Math.PI / 2], color: [0.36, 0.52, 0.76] });
    s.box(0.5, 0.1, 0.34, { at: [-0.4, 0.1, D - 0.5], rot: [0, 0.2, 0], color: [0.92, 0.88, 0.8] });
    s.ball(0.06, { at: [0, H - 0.32, D - 0.12], color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 }, 1);
    return s;
  },
  bench() {
    const s = new Shape();
    s.cyl(0.21, 0.21, 1.66, 12, { at: [0, 0.4, 0], rot: [0, 0, Math.PI / 2], scale: [0.5, 1, 1], color: BARK, mat: MAT.bark });
    s.box(1.7, 0.07, 0.42, { at: [0, 0.48, 0], round: 0.03, color: CUT, mat: MAT.boards });
    for (const x of [-0.58, 0.58]) s.lathe([[0.2, 0], [0.16, 0.08], [0.15, 0.4]], 10, { at: [x, 0, 0], color: BARK, mat: MAT.ROUND + MAT.bark });
    // a back to lean on
    for (const x of [-0.7, 0.7]) stick(s, [x, 0.42, -0.18], [x * 1.04, 1.02, -0.32], 0.04, 0.034, { color: WOOD }, 8);
    log(s, 1.7, 0.06, [0, 0.95, -0.305], [0, 0, 0], [0.6, 0.42, 0.26], MAT.bark);
    log(s, 1.5, 0.04, [0, 0.72, -0.25], [0, 0, 0], WOOD);
    return s;
  },
  table() {
    const s = new Shape();
    s.box(1.9, 0.07, 0.9, { at: [0, 0.79, 0], round: 0.025, color: CUT, mat: MAT.boards });
    for (const x of [-0.72, 0.72]) {
      stick(s, [x, 0, -0.36], [x, 0.76, 0.34], 0.05, 0.045, { color: WOOD }, 8);
      stick(s, [x, 0, 0.36], [x, 0.76, -0.34], 0.05, 0.045, { color: WOOD }, 8);
    }
    log(s, 1.44, 0.04, [0, 0.38, 0], [0, 0, 0], BARK);
    for (const z of [-0.8, 0.8]) {
      s.box(1.9, 0.06, 0.3, { at: [0, 0.46, z], round: 0.025, color: [0.74, 0.58, 0.36], mat: MAT.boards });
      for (const x of [-0.7, 0.7]) s.cyl(0.085, 0.1, 0.44, 10, { at: [x, 0.22, z], color: BARK, mat: MAT.ROUND + MAT.bark });
    }
    // laid for two: a plate of berries, cups, a kettle, a jar of flowers
    s.cyl(0.15, 0.12, 0.02, 16, { at: [-0.45, 0.835, 0.08], color: [0.96, 0.93, 0.86] });
    for (let i = 0; i < 6; i++) s.ball(0.035, { at: [-0.45 + Math.cos(i * 1.1) * 0.06, 0.865 + (i % 2) * 0.03, 0.08 + Math.sin(i * 1.1) * 0.06], color: i % 3 ? [0.5, 0.32, 0.9] : [0.9, 0.24, 0.32] }, 1);
    for (const [x, z] of [[-0.1, -0.2], [0.42, 0.22]]) s.lathe([[0.0, 0.826], [0.045, 0.826], [0.055, 0.92], [0.045, 0.92], [0.04, 0.85]], 10, { at: [x, 0, z], color: [0.74, 0.5, 0.32] });
    s.ball(0.11, { at: [0.22, 0.92, -0.14], scale: [1, 0.85, 1], color: [0.36, 0.5, 0.62] });
    stick(s, [0.3, 0.92, -0.14], [0.42, 1.0, -0.14], 0.024, 0.014, { color: [0.36, 0.5, 0.62] }, 6);
    s.add(new THREE.TorusGeometry(0.07, 0.012, 5, 10, Math.PI), { at: [0.22, 1.0, -0.14], color: DARK });
    s.cyl(0.05, 0.04, 0.12, 10, { at: [0.72, 0.885, -0.18], color: [0.7, 0.86, 0.9] });
    bloom(s, 0.72, 0.9, -0.18, 0.2, PETALS[0], 0.8);
    bloom(s, 0.7, 0.9, -0.16, 0.26, PETALS[1], 0.7);
    return s;
  },
  lantern() {
    const s = new Shape();
    for (let i = 0; i < 4; i++) s.rock(0.13, 30 + i, { at: [Math.cos(i * 1.6) * 0.15, 0.04, Math.sin(i * 1.6) * 0.15], scale: [1, 0.7, 1], color: i % 2 ? STONE : STONE2 });
    stick(s, [0, 0, 0], [0, 2.02, 0], 0.07, 0.05, { color: BARK, mat: MAT.ROUND + MAT.bark }, 10);
    // an iron hook, and the lamp hung from it: a light in a cage under a little hat
    s.add(new THREE.TorusGeometry(0.28, 0.018, 6, 12, Math.PI / 2), { at: [0.28, 2.0, 0], rot: [0, 0, Math.PI / 2], color: DARK });
    stick(s, [0.28, 2.28, 0], [0.3, 2.1, 0], 0.008, 0.008, { color: DARK }, 5);
    s.cone(0.17, 0.13, 4, { at: [0.3, 2.06, 0], rot: [0, Math.PI / 4, 0], color: [0.3, 0.27, 0.3] });
    s.box(0.15, 0.24, 0.15, { at: [0.3, 1.87, 0], round: 0.02, color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.box(0.02, 0.27, 0.02, { at: [0.3 + x * 0.085, 1.87, z * 0.085], round: 0, color: DARK });
    s.box(0.21, 0.03, 0.21, { at: [0.3, 1.735, 0], color: [0.3, 0.27, 0.3] });
    s.ball(0.022, { at: [0.3, 1.71, 0], color: DARK }, 1);
    return s;
  },
  fence() {
    const s = new Shape();
    for (const x of [-0.95, 0.95]) {
      stick(s, [x, 0, 0], [x, 1.02, 0], 0.062, 0.052, { color: WOOD, mat: MAT.ROUND + MAT.bark }, 10);
      s.ball(0.06, { at: [x, 1.04, 0], scale: [1, 0.8, 1], color: [0.62, 0.44, 0.27] }, 1);
    }
    stick(s, [-1.04, 0.44, 0.02], [1.04, 0.47, 0.02], 0.042, 0.038, { color: CUT }, 8);
    stick(s, [-1.04, 0.82, 0.02], [1.04, 0.79, 0.02], 0.038, 0.042, { color: [0.78, 0.63, 0.4] }, 8);
    // a vine has found one post
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      s.leaf([-0.95 + Math.cos(a) * 0.06, 0.25 + i * 0.2, Math.sin(a) * 0.06], [-0.95 + Math.cos(a) * 0.22, 0.34 + i * 0.2, Math.sin(a) * 0.22], 0.11, { color: i % 2 ? LEAF : [0.36, 0.6, 0.26] });
    }
    s.ball(0.035, { at: [-0.86, 0.96, 0.08], color: PETALS[0] }, 1);
    return s;
  },
  path() {
    const s = new Shape();
    const spots = [[-0.3, -0.2, 0.3], [0.27, 0.0, 0.35], [-0.1, 0.36, 0.25], [0.3, -0.42, 0.2]];
    spots.forEach(([x, z, r], i) => s.rock(r, 50 + i, { at: [x, 0.02, z], scale: [1, 0.2, 1], rot: [0, i * 1.9, 0], color: i % 2 ? STONE : [0.72, 0.7, 0.64] }));
    return s;
  },
  hut() {
    const s = new Shape();
    const plaster = [0.95, 0.89, 0.75];
    s.cyl(1.04, 1.08, 0.24, 18, { at: [0, 0.12, 0], color: STONE, mat: MAT.ROUND + MAT.stonework });
    s.lathe([[1.0, 0.22], [1.02, 0.7], [0.95, 1.14]], 20, { color: plaster });
    for (let i = 0; i < 7; i++) {
      // (timbers standing in the wall, none where the door is)
      const a = (i / 7) * TAU + 0.45;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.4) continue;
      stick(s, [Math.sin(a) * 1.01, 0.22, Math.cos(a) * 1.01], [Math.sin(a) * 0.96, 1.12, Math.cos(a) * 0.96], 0.045, 0.04, { color: BARK }, 6);
    }
    // the roof: thatch in a tall soft cone, its underside in shade
    s.lathe([[1.0, 1.12], [1.58, 1.0]], 20, { color: [0.62, 0.47, 0.26], shade: [0.34, 0.26, 0.2] });
    s.lathe([[1.58, 1.0], [1.54, 1.1], [1.1, 1.72], [0.62, 2.28], [0.22, 2.62], [0.0, 2.7]], 22, { color: THATCH, mat: MAT.ROUND + MAT.thatch });
    s.ball(0.13, { at: [0, 2.72, 0], color: RED });
    s.leaf([0, 2.8, 0], [0.3, 3.04, 0.02], 0.17, { color: [0.42, 0.72, 0.28], steps: 4 }, [0, 0.4, 1]);
    s.leaf([0, 2.8, 0], [-0.22, 2.98, 0.02], 0.13, { color: LEAF, steps: 4 }, [0, 0.4, 1]);
    // a round-topped door with a stone before it, and a round window with a light in it
    s.box(0.5, 0.62, 0.09, { at: [0, 0.55, 0.985], round: 0.02, color: [0.5, 0.33, 0.2], mat: MAT.boards });
    s.cyl(0.25, 0.25, 0.09, 14, { at: [0, 0.86, 0.985], rot: [Math.PI / 2, 0, 0], color: [0.5, 0.33, 0.2], mat: MAT.boards });
    s.add(new THREE.TorusGeometry(0.27, 0.035, 6, 12, Math.PI), { at: [0, 0.86, 1.0], color: BARK });
    for (const x of [-0.275, 0.275]) s.box(0.06, 0.64, 0.1, { at: [x, 0.55, 1.0], color: BARK });
    s.ball(0.03, { at: [0.15, 0.6, 1.04], color: LAMP, shade: LAMP });
    s.rock(0.36, 61, { at: [0, 0.02, 1.36], scale: [1.2, 0.22, 0.8], color: STONE });
    const w = [Math.sin(0.8) * 0.985, 0.74, Math.cos(0.8) * 0.985];
    s.cyl(0.17, 0.17, 0.07, 14, { at: w, rot: [Math.PI / 2, 0.8, 0, 'YXZ'], color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 });
    s.torus(0.18, 0.03, { at: [w[0] * 1.02, w[1], w[2] * 1.02], rot: [0, 0.8, 0], color: BARK }, 14);
    s.box(0.36, 0.025, 0.03, { at: [w[0] * 1.04, w[1], w[2] * 1.04], rot: [0, 0.8, 0], round: 0, color: BARK });
    s.box(0.025, 0.36, 0.03, { at: [w[0] * 1.04, w[1], w[2] * 1.04], rot: [0, 0.8, 0], round: 0, color: BARK });
    // a pot of flowers by the door
    s.lathe([[0.09, 0.2], [0.13, 0.42], [0.14, 0.44], [0.11, 0.44]], 10, { at: [-0.62, 0.02, 1.02], color: [0.8, 0.46, 0.32] });
    bloom(s, -0.62, 0.44, 1.02, 0.24, PETALS[3], 0.9);
    bloom(s, -0.56, 0.44, 1.06, 0.18, PETALS[1], 0.8);
    return s;
  },
  flowerbed() {
    const s = new Shape();
    const random = rng(7);
    s.ball(1.0, { at: [0, 0.04, 0], scale: [1, 0.16, 1], color: SOIL, mat: MAT.soil });
    for (const [x, z, w, d] of [[0, 1.04, 2.24, 0.12], [0, -1.04, 2.24, 0.12], [1.04, 0, 0.12, 2.2], [-1.04, 0, 0.12, 2.2]]) s.box(w, 0.24, d, { at: [x, 0.12, z], round: 0.03, color: [0.66, 0.48, 0.3], mat: MAT.boards });
    for (const [x, z] of [[-1.04, -1.04], [1.04, -1.04], [-1.04, 1.04], [1.04, 1.04]]) {
      s.box(0.14, 0.4, 0.14, { at: [x, 0.2, z], round: 0.03, color: WOOD });
      s.ball(0.075, { at: [x, 0.43, z], color: [0.62, 0.44, 0.27] }, 1);
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = -0.62 + i * 0.62 + (random() - 0.5) * 0.2;
        const z = -0.62 + j * 0.62 + (random() - 0.5) * 0.2;
        bloom(s, x, 0.14, z, 0.4 + random() * 0.3, PETALS[(i * 2 + j * 3) % PETALS.length], 1.5, 6);
        s.leaf([x, 0.14, z], [x + 0.2, 0.3, z - 0.14], 0.1, { color: LEAF2 });
      }
    }
    // a little label on a stake
    s.box(0.03, 0.4, 0.03, { at: [0.86, 0.3, 0.86], round: 0, color: WOOD });
    s.box(0.22, 0.14, 0.025, { at: [0.86, 0.5, 0.86], rot: [0, -0.6, 0], color: CUT });
    return s;
  },
  garden() {
    const s = new Shape();
    const random = rng(11);
    s.box(2.6, 0.14, 2.6, { at: [0, 0.05, 0], round: 0.05, color: SOIL, mat: MAT.soil });
    for (const x of [-0.65, 0.65]) s.cyl(0.3, 0.3, 2.4, 10, { at: [x, 0.1, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45], color: [0.44, 0.31, 0.22], mat: MAT.soil });
    for (const x of [-0.65, 0.65]) {
      for (const z of [-0.65, 0.65]) {
        s.ball(0.4, { at: [x, 0.5, z], scale: [1, 0.85, 1], color: [0.16, 0.36, 0.14] });
        s.ball(0.26, { at: [x + 0.18, 0.74, z - 0.1], color: [0.22, 0.44, 0.16] });
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4 + x;
          const up = 0.4 + (i % 4) * 0.14;
          const r = 0.38 - Math.abs(up - 0.55) * 0.2;
          s.leaf([x + Math.cos(a) * r, up, z + Math.sin(a) * r], [x + Math.cos(a) * (r + 0.2), up + 0.12, z + Math.sin(a) * (r + 0.2)], 0.13, { color: i % 2 ? [0.3, 0.54, 0.18] : [0.22, 0.44, 0.16] }, [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3]);
        }
        for (let i = 0; i < 7; i++) {
          const a = random() * TAU;
          const up = 0.32 + random() * 0.5;
          s.ball(0.06, { at: [x + Math.cos(a) * 0.4, up + 0.1, z + Math.sin(a) * 0.4], color: [0.5, 0.32, 0.92], shade: [0.26, 0.14, 0.6] }, 1);
        }
      }
    }
    // stakes at the corners with a line between them
    const corners = [[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]];
    corners.forEach(([x, z], i) => {
      stick(s, [x, 0, z], [x, 0.78, z], 0.045, 0.035, { color: WOOD }, 7);
      const [nx, nz] = corners[(i + 1) % 4];
      stick(s, [x, 0.66, z], [nx, 0.66, nz], 0.007, 0.007, { color: [0.86, 0.8, 0.64] }, 4);
    });
    return s;
  },
  feeder() {
    const s = new Shape();
    stick(s, [0, 0, 0], [0, 1.1, 0], 0.075, 0.06, { color: BARK, mat: MAT.ROUND + MAT.bark }, 10);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stick(s, [0, 0.72, 0], [x * 0.3, 1.08, z * 0.3], 0.025, 0.025, { color: WOOD }, 6);
    s.box(0.84, 0.05, 0.84, { at: [0, 1.12, 0], round: 0.02, color: CUT, mat: MAT.boards });
    for (const [x, z, w, d] of [[0, 0.41, 0.86, 0.05], [0, -0.41, 0.86, 0.05], [0.41, 0, 0.05, 0.86], [-0.41, 0, 0.05, 0.86]]) s.box(w, 0.1, d, { at: [x, 1.18, z], round: 0.02, color: WOOD });
    for (const [x, z] of [[-0.37, -0.37], [0.37, -0.37], [-0.37, 0.37], [0.37, 0.37]]) stick(s, [x, 1.14, z], [x, 1.66, z], 0.022, 0.022, { color: WOOD }, 6);
    // a little shingled roof over it
    for (const side of [-1, 1]) s.box(0.66, 0.04, 1.08, { at: [side * 0.27, 1.8, 0], rot: [0, 0, -side * 0.55], round: 0.012, color: [0.74, 0.34, 0.25], mat: MAT.shingles });
    log(s, 1.12, 0.03, [0, 1.98, 0], [0, Math.PI / 2, 0], [0.56, 0.26, 0.2]);
    // what is put out: a heap of berries
    for (let i = 0; i < 9; i++) s.ball(0.05, { at: [Math.cos(i * 2.1) * 0.13 * (i % 3), 1.19 + (i % 3 === 0 ? 0.07 : 0), Math.sin(i * 2.1) * 0.13 * (i % 3)], color: i % 2 ? [0.5, 0.32, 0.92] : [0.88, 0.24, 0.34] }, 1);
    stick(s, [0.4, 1.14, 0.2], [0.72, 1.16, 0.2], 0.014, 0.012, { color: WOOD }, 5);
    return s;
  },
  well() {
    const s = new Shape();
    s.lathe([[0.94, 0], [0.9, 0.74], [0.86, 0.82], [0.7, 0.82], [0.68, 0.36]], 18, { color: STONE, mat: MAT.ROUND + MAT.stonework });
    s.cyl(0.68, 0.68, 0.02, 16, { at: [0, 0.52, 0], color: [0.32, 0.58, 0.78], shade: [0.12, 0.26, 0.46] });
    for (const x of [-0.82, 0.82]) s.box(0.12, 1.42, 0.12, { at: [x, 1.46, 0], round: 0.02, color: WOOD, mat: MAT.boards });
    // the roller with its rope and handle, and the bucket
    log(s, 1.74, 0.055, [0, 1.74, 0], [0, 0, 0], BARK);
    for (let i = 0; i < 5; i++) s.torus(0.062, 0.012, { at: [-0.12 + i * 0.035, 1.74, 0], rot: [0, Math.PI / 2, 0], color: [0.86, 0.8, 0.62] }, 8);
    stick(s, [0.9, 1.74, 0], [1.02, 1.74, 0], 0.02, 0.02, { color: DARK }, 5);
    stick(s, [1.02, 1.74, 0], [1.02, 1.5, 0], 0.02, 0.02, { color: DARK }, 5);
    stick(s, [1.02, 1.5, 0], [1.16, 1.5, 0], 0.024, 0.024, { color: WOOD }, 6);
    stick(s, [0.02, 1.7, 0], [0.02, 1.22, 0], 0.008, 0.008, { color: [0.86, 0.8, 0.62] }, 4);
    s.lathe([[0.0, 0.98], [0.1, 0.98], [0.135, 1.2], [0.115, 1.2], [0.09, 1.02]], 12, { at: [0.02, 0, 0], color: WOOD, mat: MAT.ROUND + MAT.boards });
    s.torus(0.125, 0.012, { at: [0.02, 1.14, 0], rot: [Math.PI / 2, 0, 0], color: DARK }, 12);
    // a shingled roof over all
    for (const side of [-1, 1]) s.box(2.3, 0.05, 0.92, { at: [0, 2.3, side * 0.36], rot: [side * 0.55, 0, 0], round: 0.015, color: [0.74, 0.34, 0.25], mat: MAT.shingles });
    for (const x of [-0.98, 0.98]) s.tri([x, 2.1, -0.66], [x, 2.1, 0.66], [x, 2.5, 0], { color: [0.7, 0.52, 0.32], mat: MAT.boards });
    log(s, 2.36, 0.04, [0, 2.54, 0], [0, 0, 0], [0.56, 0.26, 0.2]);
    return s;
  },
  cabin() {
    const s = new Shape();
    const X = 2.2;
    const Z = 1.8;
    const F = 0.22; // the floor: the top of the footing
    const logs = [0.63, 0.45, 0.28];
    const roof = [0.76, 0.35, 0.26];
    s.box(2 * X + 0.3, 0.5, 2 * Z + 0.3, { at: [0, F - 0.25, 0], round: 0.04, color: STONE2, mat: MAT.stonework });
    s.box(2 * X, 2.3, 2 * Z, { at: [0, F + 1.15, 0], round: 0.02, color: logs, mat: MAT.logs });
    // the ends of the logs, crossing at each corner
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const y = F + 0.2 + i * 0.31;
          if (i % 2) {
            s.cyl(0.14, 0.14, 0.36, 10, { at: [sx * (X + 0.08), y, sz * (Z - 0.02)], rot: [0, 0, Math.PI / 2], color: logs });
            s.cyl(0.11, 0.11, 0.012, 10, { at: [sx * (X + 0.262), y, sz * (Z - 0.02)], rot: [0, 0, Math.PI / 2], color: CUT });
          } else {
            s.cyl(0.14, 0.14, 0.36, 10, { at: [sx * (X - 0.02), y, sz * (Z + 0.08)], rot: [Math.PI / 2, 0, 0], color: logs });
            s.cyl(0.11, 0.11, 0.012, 10, { at: [sx * (X - 0.02), y, sz * (Z + 0.262)], rot: [Math.PI / 2, 0, 0], color: CUT });
          }
        }
      }
    }
    // gables boarded upright, and the roof: two thick slopes of shingle with a ridge log along the top
    const E = F + 2.3;
    const R = E + 1.5;
    for (const x of [-X, X]) s.tri([x, E, -Z], [x, E, Z], [x, R, 0], { color: [0.72, 0.54, 0.33], mat: MAT.boards });
    const run = Z + 0.48;
    const rise = R + 0.1 - (E - 0.2);
    const slope = Math.atan2(rise, run);
    const long = Math.hypot(rise, run);
    for (const side of [-1, 1]) {
      s.box(2 * X + 0.9, 0.1, long, { at: [0, (E - 0.2 + R + 0.1) / 2, (side * run) / 2], rot: [side * slope, 0, 0], round: 0.03, color: roof, mat: MAT.shingles });
      for (const x of [-X - 0.42, X + 0.42]) stick(s, [x, E - 0.24, side * (run + 0.03)], [x, R + 0.08, 0], 0.05, 0.05, { color: CUT }, 6);
    }
    log(s, 2 * X + 1.0, 0.09, [0, R + 0.14, 0], [0, 0, 0], [0.56, 0.26, 0.2]);
    // a stone chimney
    s.box(0.62, 2.0, 0.62, { at: [1.35, R - 0.3, -0.8], round: 0.03, color: STONE, mat: MAT.stonework });
    s.box(0.76, 0.12, 0.76, { at: [1.35, R + 0.74, -0.8], round: 0.03, color: STONE2 });
    s.cyl(0.13, 0.15, 0.24, 10, { at: [1.35, R + 0.9, -0.8], color: [0.8, 0.46, 0.32] });
    // the door, under a porch of its own, with a lamp beside it and a stone step
    const dx = -0.78;
    s.box(1.02, 1.86, 0.06, { at: [dx, F + 0.93, Z + 0.01], round: 0.02, color: BARK });
    s.box(0.86, 1.72, 0.07, { at: [dx, F + 0.88, Z + 0.035], round: 0.02, color: [0.47, 0.31, 0.2], mat: MAT.boards });
    for (const y of [0.4, 1.4]) s.box(0.5, 0.05, 0.02, { at: [dx - 0.17, F + y, Z + 0.075], round: 0, color: DARK });
    s.ball(0.045, { at: [dx + 0.3, F + 0.9, Z + 0.09], color: [0.9, 0.74, 0.36] }, 1);
    s.box(1.5, 0.2, 0.7, { at: [dx, F - 0.1, Z + 0.48], round: 0.04, color: STONE, mat: MAT.stonework });
    s.box(1.7, 0.07, 0.95, { at: [dx, F + 2.16, Z + 0.4], rot: [0.36, 0, 0], round: 0.02, color: roof, mat: MAT.shingles });
    for (const x of [dx - 0.74, dx + 0.74]) stick(s, [x, F, Z + 0.76], [x, F + 2.0, Z + 0.76], 0.055, 0.05, { color: WOOD, mat: MAT.ROUND + MAT.bark }, 8);
    s.box(0.1, 0.16, 0.1, { at: [dx + 0.62, F + 1.62, Z + 0.1], round: 0.02, color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 });
    s.cone(0.1, 0.08, 4, { at: [dx + 0.62, F + 1.74, Z + 0.1], rot: [0, Math.PI / 4, 0], color: DARK });
    // the window: four lit panes, shutters, and a box of flowers under it
    const wx = 1.0;
    const wy = F + 1.4;
    s.box(0.92, 0.8, 0.05, { at: [wx, wy, Z + 0.015], round: 0, color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 });
    for (const [x, y, w, h] of [[0, 0.43, 1.06, 0.08], [0, -0.43, 1.12, 0.09], [-0.49, 0, 0.08, 0.86], [0.49, 0, 0.08, 0.86], [0, 0, 0.045, 0.8], [0, 0, 0.92, 0.045]]) s.box(w, h, 0.09, { at: [wx + x, wy + y, Z + 0.04], round: 0.015, color: CUT });
    for (const side of [-1, 1]) s.box(0.32, 0.86, 0.045, { at: [wx + side * 0.7, wy, Z + 0.03], round: 0.015, color: [0.36, 0.56, 0.5], mat: MAT.boards });
    s.box(1.0, 0.16, 0.2, { at: [wx, wy - 0.56, Z + 0.13], round: 0.03, color: WOOD, mat: MAT.boards });
    for (let i = 0; i < 5; i++) bloom(s, wx - 0.38 + i * 0.19, wy - 0.48, Z + 0.14, 0.14 + (i % 2) * 0.06, PETALS[(i * 2) % PETALS.length], 0.75, 5);
    // a window in the side wall, firewood stacked against the other, a barrel at the corner
    s.box(0.05, 0.62, 0.72, { at: [X + 0.015, wy + 0.05, 0.35], round: 0, color: LAMP, shade: [0.95, 0.66, 0.3], ink: 1 });
    for (const [y, z, h, d] of [[0.34, 0, 0.07, 0.84], [-0.34, 0, 0.08, 0.88], [0, -0.39, 0.7, 0.07], [0, 0.39, 0.7, 0.07], [0, 0, 0.62, 0.04]]) s.box(0.09, h, d, { at: [X + 0.04, wy + 0.05 + y, 0.35 + z], round: 0.015, color: CUT });
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - (row % 2); i++) {
        const y = F + 0.12 + row * 0.21;
        const z = -1.2 + i * 0.24 + (row % 2) * 0.12;
        s.cyl(0.11, 0.11, 0.6, 9, { at: [-X - 0.36, y, z], rot: [0, 0, Math.PI / 2], color: (i + row) % 2 ? BARK : [0.5, 0.35, 0.22], mat: MAT.bark });
        s.cyl(0.095, 0.095, 0.012, 9, { at: [-X - 0.665, y, z], rot: [0, 0, Math.PI / 2], color: CUT });
      }
    }
    s.lathe([[0.25, 0], [0.32, 0.36], [0.25, 0.72]], 14, { at: [X + 0.46, F - 0.2, 1.3], color: WOOD, mat: MAT.ROUND + MAT.boards });
    for (const y of [0.16, 0.56]) s.torus(0.3, 0.016, { at: [X + 0.46, F - 0.2 + y, 1.3], rot: [Math.PI / 2, 0, 0], color: DARK }, 14);
    return s;
  },
  cairn() {
    const s = new Shape();
    const stack = [[0.72, 0.28], [0.58, 0.78], [0.45, 1.2], [0.34, 1.53], [0.24, 1.79]];
    stack.forEach(([r, y], i) => s.rock(r, 70 + i, { at: [(i % 2 ? 0.04 : -0.03) * i, y, (i % 3 ? -0.03 : 0.04) * i], scale: [1, 0.62, 1], rot: [0, i * 1.3, 0], color: i % 2 ? STONE : [0.72, 0.71, 0.67] }));
    // the light it was raised for: crystals standing out of the top stone
    const crystal = { color: [1.0, 0.95, 0.62], shade: [1.0, 0.8, 0.45], ink: 1 };
    s.add(new THREE.OctahedronGeometry(1, 0), { at: [0, 2.2, 0], scale: [0.13, 0.34, 0.13], rot: [0, 0.5, 0], ...crystal });
    s.add(new THREE.OctahedronGeometry(1, 0), { at: [0.13, 2.02, 0.03], scale: [0.07, 0.18, 0.07], rot: [0, 0.2, -0.5], ...crystal });
    s.add(new THREE.OctahedronGeometry(1, 0), { at: [-0.11, 2.0, -0.04], scale: [0.06, 0.15, 0.06], rot: [0.2, 0, 0.55], ...crystal });
    s.ball(0.3, { at: [-0.3, 0.52, 0.42], scale: [1, 0.3, 1], color: [0.38, 0.58, 0.24] }, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      s.rock(0.15, 80 + i, { at: [Math.cos(a) * 1.06, 0.05, Math.sin(a) * 1.06], scale: [1, 0.66, 1], color: STONE2 });
      if (i % 2) bloom(s, Math.cos(a + 0.45) * 1.02, 0, Math.sin(a + 0.45) * 1.02, 0.3, PETALS[i % PETALS.length], 1.1);
    }
    return s;
  },
  /** What stands in the middle of your land from the first day: a signpost, and the basket the spirits fill. */
  basket() {
    const s = new Shape();
    const cane = [0.84, 0.66, 0.4];
    s.lathe([[0.0, 0.01], [0.3, 0.01], [0.36, 0.06], [0.45, 0.5], [0.47, 0.55], [0.43, 0.56], [0.39, 0.5]], 16, { color: cane, mat: MAT.ROUND + MAT.weave });
    s.torus(0.45, 0.035, { at: [0, 0.55, 0], rot: [Math.PI / 2, 0, 0], color: [0.68, 0.5, 0.3] }, 16);
    s.add(new THREE.TorusGeometry(0.42, 0.028, 6, 16, Math.PI), { at: [0, 0.55, 0], color: [0.68, 0.5, 0.3] });
    s.cyl(0.4, 0.4, 0.02, 14, { at: [0, 0.44, 0], color: DARK, shade: DARK });
    return s;
  },
  sign() {
    const s = new Shape();
    stick(s, [0, 0, 0], [0, 1.62, 0], 0.07, 0.055, { color: BARK, mat: MAT.ROUND + MAT.bark }, 10);
    s.box(1.05, 0.46, 0.07, { at: [0.06, 1.34, 0.06], rot: [0, 0, 0.04], round: 0.03, color: CUT, mat: MAT.boards });
    s.box(0.7, 0.24, 0.06, { at: [-0.1, 0.94, 0.06], rot: [0, 0, -0.06], round: 0.03, color: [0.76, 0.6, 0.38], mat: MAT.boards });
    s.cone(0.11, 0.14, 4, { at: [0, 1.68, 0], rot: [0, Math.PI / 4, 0], color: BARK });
    // carved on it: a tent and a leaf
    s.tri([-0.26, 1.2, 0.1], [0.02, 1.2, 0.1], [-0.12, 1.46, 0.1], { color: RED });
    s.leaf([0.16, 1.24, 0.1], [0.42, 1.44, 0.1], 0.16, { color: LEAF, steps: 4 }, [0, 0, 1]);
    s.leaf([0.1, 0.3, 0.05], [0.3, 0.52, 0.12], 0.12, { color: LEAF });
    s.leaf([-0.05, 0.5, 0.05], [-0.26, 0.7, 0.1], 0.11, { color: [0.36, 0.6, 0.26] });
    return s;
  },
  /** A stake with a ribbon: the edge of your land. */
  marker() {
    const s = new Shape();
    stick(s, [0, 0, 0], [0, 1.25, 0], 0.045, 0.035, { color: CUT }, 7);
    s.ball(0.045, { at: [0, 1.27, 0], color: [0.78, 0.62, 0.4] }, 1);
    s.leaf([0.02, 1.16, 0], [0.42, 1.08, 0.03], 0.2, { color: RED, steps: 4 }, [0, 0.2, 1]);
    s.leaf([0.02, 1.08, 0], [0.3, 0.9, -0.02], 0.12, { color: [0.95, 0.8, 0.4], steps: 3 }, [0, 0.2, 1]);
    return s;
  },
};

// ---- what you gather --------------------------------------------------------------------------------------------
// (plants are painted to lean with the wind: `ink` there is how stiff a part stands, 1 for not moving at all.
// What is painted pure white takes each plant's own tint, so one drift of flowers is not one flower many times.)
const WHITE = [1, 1, 1];
const STIFF = 1;
const node = {
  branch() {
    // a few cut sticks lying across one another, and a forked one standing among them so it shows over the grass
    const s = new Shape();
    const pale = [0.76, 0.56, 0.34];
    const dark = [0.54, 0.38, 0.24];
    log(s, 0.95, 0.06, [0, 0.1, 0], [0, 0.2, 0], pale);
    log(s, 0.85, 0.055, [0.05, 0.19, 0.06], [0, 1.3, 0.1], dark);
    log(s, 0.8, 0.05, [-0.05, 0.28, -0.02], [0, 2.3, -0.08], pale);
    for (const [x, z, yaw] of [[0.48, 0.1, 0.2], [-0.47, -0.1, 0.2]]) s.cyl(0.058, 0.058, 0.012, 10, { at: [x, 0.1, z], rot: [0, yaw, Math.PI / 2], color: CUT });
    s.cyl(0.03, 0.045, 0.9, 8, { at: [0.1, 0.6, 0], rot: [0.12, 0, -0.22], color: dark });
    s.cyl(0.02, 0.028, 0.42, 8, { at: [0.33, 1.08, 0.06], rot: [0.2, 0, -0.95], color: dark });
    s.cyl(0.02, 0.028, 0.36, 8, { at: [0.14, 1.18, -0.06], rot: [-0.3, 0, 0.35], color: dark });
    s.leaf([0.5, 1.2, 0.08], [0.72, 1.38, 0.1], 0.14, { color: [0.86, 0.68, 0.24] }, [0, 0.5, 1]);
    s.leaf([0.05, 1.32, -0.1], [-0.1, 1.5, -0.14], 0.12, { color: [0.62, 0.72, 0.28] }, [0, 0.5, 1]);
    return s;
  },
  pebble() {
    const s = new Shape();
    const pale = [0.8, 0.78, 0.73];
    s.rock(0.3, 101, { at: [0, 0.16, 0], scale: [1.1, 0.72, 1], color: pale });
    s.rock(0.24, 102, { at: [0.3, 0.13, 0.14], scale: [1, 0.72, 1.1], rot: [0, 1, 0], color: [0.7, 0.69, 0.68] });
    s.rock(0.2, 103, { at: [-0.22, 0.11, 0.22], scale: [1, 0.72, 1], rot: [0, 2, 0], color: [0.74, 0.73, 0.72] });
    s.rock(0.2, 104, { at: [0.06, 0.47, 0.04], scale: [1, 0.72, 1], rot: [0, 3, 0], color: pale });
    s.rock(0.13, 105, { at: [0.05, 0.69, 0.02], scale: [1, 0.76, 1], color: [0.86, 0.84, 0.8] });
    return s;
  },
  bush() {
    const s = new Shape();
    const stiff = 0.55;
    const deep = [0.13, 0.33, 0.13];
    const mid = [0.19, 0.42, 0.15];
    const top = [0.28, 0.52, 0.17];
    s.ball(0.55, { at: [0, 0.5, 0], scale: [1, 0.85, 1], color: deep, ink: stiff });
    s.ball(0.42, { at: [0.36, 0.72, 0.1], color: mid, ink: stiff });
    s.ball(0.4, { at: [-0.34, 0.66, -0.12], color: mid, ink: stiff });
    s.ball(0.3, { at: [0.02, 1.0, 0.02], color: top, ink: stiff });
    s.ball(0.24, { at: [0.1, 0.62, 0.46], color: top, ink: stiff });
    // a few leaves standing out of the mass, so its edge is leaves and not a ball's
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const up = 0.45 + (i % 4) * 0.2;
      const r = 0.52 - Math.abs(up - 0.6) * 0.25;
      s.leaf([Math.cos(a) * r, up, Math.sin(a) * r], [Math.cos(a) * (r + 0.26), up + 0.16, Math.sin(a) * (r + 0.26)], 0.16, { color: i % 2 ? top : mid, ink: stiff }, [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3]);
    }
    return s;
  },
  berries() {
    const s = new Shape();
    const random = rng(5);
    for (let i = 0; i < 12; i++) {
      const a = random() * TAU;
      const up = 0.35 + random() * 0.75;
      const r = 0.6 - Math.abs(up - 0.6) * 0.4;
      // (white, so each bush's berries take its own colour: blue, red, gold)
      s.ball(0.075, { at: [Math.cos(a) * r, up, Math.sin(a) * r], color: WHITE, ink: 0.55 }, 0);
    }
    return s;
  },
  mushroom() {
    const s = new Shape();
    const one = (x, z, k) => {
      s.lathe([[0.1 * k, 0], [0.085 * k, 0.2 * k], [0.065 * k, 0.5 * k], [0.07 * k, 0.6 * k]], 10, { at: [x, 0, z], color: [0.96, 0.91, 0.8], ink: STIFF });
      // the cap: a dome with its rim turned under
      s.lathe([[0.02, 0.5 * k], [0.24 * k, 0.5 * k], [0.31 * k, 0.56 * k], [0.3 * k, 0.66 * k], [0.22 * k, 0.79 * k], [0.1 * k, 0.86 * k], [0.0, 0.88 * k]], 14, { at: [x, 0, z], color: WHITE, ink: STIFF });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1 + k * 3;
        const r = (0.1 + 0.11 * (i % 2)) * k;
        s.ball(0.04 * k, { at: [x + Math.cos(a) * r, (0.83 - 0.1 * (i % 2)) * k, z + Math.sin(a) * r], scale: [1, 0.5, 1], color: [0.99, 0.97, 0.88], shade: [0.8, 0.76, 0.78], ink: STIFF }, 0);
      }
    };
    one(0, 0, 1.25);
    one(0.36, 0.16, 0.8);
    return s;
  },
  flower() {
    const s = new Shape();
    for (let i = 0; i < 5; i++) {
      const a = i * 1.9;
      const x = Math.cos(a) * (i ? 0.2 : 0);
      const z = Math.sin(a) * (i ? 0.2 : 0);
      const h = 0.85 + (i % 3) * 0.14;
      const tx = x * 1.2;
      const tz = z * 1.2;
      s.cyl(0.014, 0.02, h, 5, { at: [(x + tx) / 2, h / 2, (z + tz) / 2], rot: [(tz - z) / h, 0, -(tx - x) / h], color: LEAF });
      s.leaf([x, h * 0.3, z], [x + Math.cos(a + 1) * 0.2, h * 0.5, z + Math.sin(a + 1) * 0.2], 0.09, { color: LEAF });
      for (let p = 0; p < 6; p++) {
        const b = (p / 6) * TAU + i;
        s.leaf([tx, h, tz], [tx + Math.cos(b) * 0.15, h + 0.035, tz + Math.sin(b) * 0.15], 0.1, { color: WHITE });
      }
      s.ball(0.05, { at: [tx, h + 0.02, tz], scale: [1, 0.7, 1], color: [1.0, 0.82, 0.25] }, 1);
    }
    return s;
  },
  reed() {
    const s = new Shape();
    const random = rng(9);
    for (let i = 0; i < 8; i++) {
      const x = (random() - 0.5) * 0.5;
      const z = (random() - 0.5) * 0.5;
      const h = 1.3 + random() * 0.6;
      const lean = [(random() - 0.5) * 0.24, 0, (random() - 0.5) * 0.24];
      s.cyl(0.012, 0.022, h, 5, { at: [x, h / 2, z], rot: lean, color: [0.55, 0.66, 0.3] });
      if (i < 4) s.capsule(0.05, 0.2, { at: [x - lean[2] * h * 0.5, h + 0.02, z + lean[0] * h * 0.5], rot: lean, color: [0.5, 0.32, 0.2] });
      else s.leaf([x, 0.1, z], [x + lean[2] * 2.5, h * 0.8, z - lean[0] * 2.5], 0.07, { color: [0.48, 0.62, 0.28] }, [1, 0, 0.3]);
    }
    return s;
  },
  tuft() {
    const s = new Shape();
    const random = rng(13);
    for (let i = 0; i < 7; i++) {
      const a = random() * TAU;
      const lean = 0.12 + random() * 0.2;
      const h = 1.2 + random() * 0.4;
      const rot = [Math.sin(a) * lean, 0, -Math.cos(a) * lean];
      const top = [Math.cos(a) * lean * h, h * 0.98, Math.sin(a) * lean * h];
      s.cyl(0.01, 0.018, h, 5, { at: [top[0] / 2, h / 2, top[2] / 2], rot, color: [0.72, 0.7, 0.36] });
      s.drop(0.075, 0.55, 7, { at: [top[0], top[1] - 0.08, top[2]], rot, rings: 7, color: [0.98, 0.94, 0.8], shade: [0.74, 0.7, 0.72] });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      s.leaf([0, 0, 0], [Math.cos(a) * 0.5, 0.55, Math.sin(a) * 0.5], 0.06, { color: [0.5, 0.64, 0.28] }, [Math.cos(a), 1.5, Math.sin(a)]);
    }
    return s;
  },
  clay() {
    const s = new Shape();
    const c = [0.82, 0.53, 0.37];
    s.rock(0.45, 111, { at: [0, 0.1, 0], scale: [1.1, 0.5, 1], color: c, mat: MAT.soil });
    s.rock(0.28, 112, { at: [0.3, 0.16, 0.2], scale: [1, 0.6, 1], color: [0.74, 0.46, 0.32], mat: MAT.soil });
    s.rock(0.2, 113, { at: [-0.05, 0.32, -0.05], scale: [1, 0.6, 1], color: [0.88, 0.6, 0.43], mat: MAT.soil });
    s.rock(0.12, 114, { at: [-0.34, 0.08, 0.2], scale: [1, 0.6, 1], color: [0.78, 0.5, 0.35], mat: MAT.soil });
    return s;
  },
};

// ---- plants that are only there to be looked at ----------------------------------------------------------------
const flora = {
  fern() {
    const s = new Shape();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + (i % 2) * 0.3;
      const reach = 0.5 + 0.14 * (i % 3);
      const mid = [Math.cos(a) * reach * 0.55, 0.42 + 0.06 * (i % 2), Math.sin(a) * reach * 0.55];
      const tip = [Math.cos(a) * reach, 0.24, Math.sin(a) * reach];
      const green = i % 2 ? [0.26, 0.5, 0.2] : [0.34, 0.58, 0.22];
      s.leaf([0, 0.02, 0], mid, 0.2, { color: green }, [Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4]);
      s.leaf(mid, tip, 0.16, { color: green }, [Math.cos(a), 1, Math.sin(a)]);
    }
    return s;
  },
  /** A stand of spires: lupin, lavender, foxglove, by its tint. */
  spire() {
    const s = new Shape();
    const stems = [[0, 0, 1.0], [0.16, 0.08, 0.8], [-0.12, 0.14, 0.9], [0.04, -0.17, 0.7], [-0.17, -0.08, 0.62]];
    stems.forEach(([x, z, h], k) => {
      s.cyl(0.012, 0.018, h * 0.6, 5, { at: [x * 1.2, h * 0.3, z * 1.2], rot: [z * 0.5, 0, -x * 0.5], color: LEAF });
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        s.ball(0.062 * (1 - t * 0.6), { at: [x * (1.2 + t * 0.5), h * (0.55 + 0.5 * t), z * (1.2 + t * 0.5)], scale: [1, 1.25, 1], color: WHITE }, 0);
      }
      const a = k * 1.7;
      s.leaf([x, 0.02, z], [x + Math.cos(a) * 0.26, 0.3, z + Math.sin(a) * 0.26], 0.1, { color: [0.3, 0.52, 0.24] });
    });
    return s;
  },
  /** Open cups on thin stems: poppies, buttercups, anemones, by their tint. */
  cup() {
    const s = new Shape();
    const stems = [[0, 0, 0.7], [0.2, 0.1, 0.56], [-0.16, 0.16, 0.62], [0.06, -0.2, 0.5]];
    stems.forEach(([x, z, h], k) => {
      s.cyl(0.01, 0.014, h, 5, { at: [x, h / 2, z], rot: [z * 0.25, 0, -x * 0.25], color: [0.4, 0.58, 0.26] });
      const tx = x * 1.12;
      const tz = z * 1.12;
      for (let p = 0; p < 5; p++) {
        const b = (p / 5) * TAU + k;
        s.leaf([tx, h - 0.01, tz], [tx + Math.cos(b) * 0.1, h + 0.09, tz + Math.sin(b) * 0.1], 0.13, { color: WHITE }, [-Math.cos(b), 0.6, -Math.sin(b)]);
      }
      s.ball(0.032, { at: [tx, h + 0.02, tz], color: [0.2, 0.16, 0.12] }, 0);
    });
    return s;
  },
  /** Flat white heads on branching stems: cow parsley, yarrow. */
  umbel() {
    const s = new Shape();
    s.cyl(0.014, 0.022, 0.95, 5, { at: [0, 0.47, 0], color: [0.42, 0.58, 0.28] });
    const heads = [[0, 1.02, 0, 0.17], [0.22, 0.86, 0.1, 0.13], [-0.2, 0.9, 0.12, 0.12], [0.06, 0.8, -0.22, 0.12], [-0.14, 0.74, -0.14, 0.1]];
    for (const [x, y, z, r] of heads) {
      s.cyl(0.008, 0.01, Math.hypot(x, z, y - 0.6), 4, { at: [x / 2, (y + 0.6) / 2, z / 2], rot: [z * 0.9, 0, -x * 0.9], color: [0.42, 0.58, 0.28] });
      s.ball(r, { at: [x, y, z], scale: [1, 0.22, 1], color: WHITE }, 0);
    }
    s.leaf([0, 0.1, 0], [0.3, 0.36, 0.1], 0.14, { color: [0.34, 0.54, 0.24] });
    s.leaf([0, 0.1, 0], [-0.26, 0.3, -0.16], 0.14, { color: [0.34, 0.54, 0.24] });
    return s;
  },
  /** Low and broad: clover, with a few round heads. */
  clover() {
    const s = new Shape();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const r = 0.16 + 0.2 * ((i * 7) % 3) * 0.5;
      const at = [Math.cos(a) * r, 0.16 + 0.06 * (i % 2), Math.sin(a) * r];
      for (let l = 0; l < 3; l++) {
        const b = a + (l / 3) * TAU;
        s.leaf(at, [at[0] + Math.cos(b) * 0.11, at[1] + 0.02, at[2] + Math.sin(b) * 0.11], 0.11, { color: i % 2 ? [0.22, 0.46, 0.22] : [0.28, 0.54, 0.24] });
      }
    }
    for (const [x, z] of [[0.1, 0.05], [-0.16, 0.12], [0.02, -0.2]]) {
      s.cyl(0.008, 0.01, 0.32, 4, { at: [x, 0.16, z], color: LEAF });
      s.ball(0.055, { at: [x, 0.34, z], color: WHITE }, 1);
    }
    return s;
  },
  /** A tall daisy or two with a great many petals: ox-eye, sunflower, by its tint. */
  daisy() {
    const s = new Shape();
    const stems = [[0, 0, 1.15], [0.2, -0.1, 0.85], [-0.16, 0.14, 0.95]];
    stems.forEach(([x, z, h], k) => {
      s.cyl(0.014, 0.02, h, 5, { at: [x, h / 2, z], rot: [z * 0.2, 0, -x * 0.2], color: LEAF });
      s.leaf([x, h * 0.35, z], [x + 0.2, h * 0.5, z + 0.1 * (k - 1)], 0.1, { color: LEAF });
      const tx = x * 1.1;
      const tz = z * 1.1;
      for (let p = 0; p < 10; p++) {
        const b = (p / 10) * TAU;
        s.leaf([tx, h, tz], [tx + Math.cos(b) * 0.17, h + 0.02, tz + Math.sin(b) * 0.17], 0.075, { color: WHITE });
      }
      s.ball(0.06, { at: [tx, h + 0.015, tz], scale: [1, 0.6, 1], color: [0.86, 0.6, 0.12] }, 1);
    });
    return s;
  },
  /** Bells hanging along an arched stem. */
  bell() {
    const s = new Shape();
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      s.cyl(0.01, 0.014, 0.5, 4, { at: [dx * 0.06, 0.25, dz * 0.06], rot: [dz * 0.25, 0, -dx * 0.25], color: [0.36, 0.56, 0.3] });
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const r = 0.1 + t * 0.2;
        s.ball(0.038, { at: [dx * r, 0.47 - t * 0.14, dz * r], scale: [1, 1.35, 1], color: WHITE }, 0);
      }
      s.leaf([0, 0.02, 0], [dx * 0.3, 0.34, dz * 0.3 + 0.1], 0.07, { color: [0.3, 0.52, 0.26] });
    }
    return s;
  },
  /** A small flowering shrub. */
  shrub() {
    const s = new Shape();
    const stiff = 0.6;
    s.ball(0.42, { at: [0, 0.38, 0], scale: [1.1, 0.8, 1], color: [0.24, 0.44, 0.22], ink: stiff }, 1);
    s.ball(0.3, { at: [0.26, 0.56, 0.08], color: [0.32, 0.54, 0.24], ink: stiff }, 1);
    s.ball(0.28, { at: [-0.24, 0.5, -0.1], color: [0.28, 0.5, 0.22], ink: stiff }, 1);
    const random = rng(31);
    for (let i = 0; i < 12; i++) {
      const a = random() * TAU;
      const up = 0.3 + random() * 0.5;
      const r = 0.46 - Math.abs(up - 0.45) * 0.4;
      s.ball(0.05, { at: [Math.cos(a) * r, up + 0.08, Math.sin(a) * r], color: WHITE, ink: stiff }, 0);
    }
    return s;
  },
  /** A stump with moss on it and a shelf of fungus. */
  stump() {
    const s = new Shape();
    s.lathe([[0.36, 0], [0.27, 0.12], [0.24, 0.42], [0.25, 0.46]], 10, { color: BARK, ink: STIFF });
    s.cyl(0.24, 0.24, 0.02, 10, { at: [0, 0.465, 0], color: CUT, ink: STIFF });
    s.cyl(0.13, 0.13, 0.022, 10, { at: [0.02, 0.468, 0.01], color: [0.74, 0.58, 0.36], ink: STIFF });
    s.ball(0.2, { at: [-0.12, 0.44, 0.1], scale: [1, 0.3, 1], color: [0.36, 0.56, 0.22], ink: STIFF }, 1);
    s.ball(0.11, { at: [0.25, 0.26, 0.06], scale: [1, 0.3, 1], color: [0.9, 0.74, 0.5], ink: STIFF }, 1);
    s.ball(0.09, { at: [0.22, 0.16, -0.12], scale: [1, 0.3, 1], color: [0.86, 0.66, 0.44], ink: STIFF }, 1);
    for (let i = 0; i < 3; i++) s.leaf([0.1 - i * 0.2, 0, 0.3], [0.16 - i * 0.26, 0.3, 0.5], 0.1, { color: [0.3, 0.52, 0.22] });
    return s;
  },
};
/** How each kind of plant is tinted: a few colours it comes in. */
export const FLORA_TINTS = {
  fern: [[1, 1, 1]],
  spire: [[0.62, 0.45, 0.95], [0.95, 0.5, 0.75], [0.45, 0.55, 1.0], [1.0, 0.92, 0.95]],
  cup: [[1.0, 0.28, 0.2], [1.0, 0.8, 0.18], [1.0, 0.55, 0.2], [0.95, 0.92, 1.0]],
  umbel: [[1.0, 1.0, 0.96], [1.0, 0.95, 0.75], [1.0, 0.86, 0.9]],
  clover: [[1.0, 0.75, 0.9], [1.0, 1.0, 1.0]],
  daisy: [[1.0, 1.0, 0.98], [1.0, 0.82, 0.2], [0.98, 0.7, 0.85]],
  bell: [[0.5, 0.55, 1.0], [0.78, 0.6, 1.0], [1.0, 1.0, 1.0]],
  shrub: [[1.0, 0.96, 0.9], [1.0, 0.7, 0.8], [1.0, 0.9, 0.4]],
  stump: [[1, 1, 1]],
};
/** The tints the things you gather come in. */
export const NODE_TINTS = {
  flower: [[1.0, 0.55, 0.75], [1.0, 0.82, 0.3], [1.0, 1.0, 0.96], [0.72, 0.56, 1.0], [0.5, 0.66, 1.0], [1.0, 0.5, 0.36]],
  berries: [[0.5, 0.34, 0.95], [0.92, 0.22, 0.32], [0.36, 0.42, 0.95], [0.98, 0.7, 0.2]],
  mushroom: [[0.92, 0.3, 0.22], [0.96, 0.6, 0.2], [0.66, 0.44, 0.3], [0.72, 0.5, 0.92]],
};

// ---- spirits -----------------------------------------------------------------------------------------------------
// Inks: each part's number for the line. All below 0.23, none the same as its neighbour's.
const INK = { body: 0.05, face: 0.1, top: 0.14, limb: 0.17, extra: 0.2 };
const pale = (c, k = 0.5) => c.map((v) => Math.min(1, v * (1 - k) + k));
const deep = (c, k = 0.7) => c.map((v) => v * k);

/** A face: two dark eyes with a light in each, pink cheeks, a small mouth. At height y, on a front z from the middle. */
function face(s, y, z, spread = 0.09, k = 1, smile = true) {
  for (const side of [-1, 1]) {
    const x = side * spread;
    s.ball(0.04 * k, { at: [x, y, z], scale: [1, 1.3, 0.55], color: [0.12, 0.09, 0.12], shade: [0.08, 0.06, 0.1], ink: INK.face });
    s.ball(0.014 * k, { at: [x + 0.012 * k, y + 0.02 * k, z + 0.02 * k], color: [1, 1, 1], shade: [1, 1, 1], ink: INK.face }, 1);
    s.ball(0.034 * k, { at: [x * 1.75, y - 0.065 * k, z - 0.012], scale: [1, 0.6, 0.35], color: [1.0, 0.62, 0.62], shade: [0.95, 0.5, 0.55], ink: INK.body }, 1);
  }
  if (smile) s.ball(0.016 * k, { at: [0, y - 0.055 * k, z + 0.006], scale: [1.5, 0.7, 0.5], color: [0.45, 0.2, 0.22], shade: [0.4, 0.18, 0.22], ink: INK.face }, 1);
}
const hands = (s, x, y, z, r, color) => {
  for (const side of [-1, 1]) s.ball(r, { at: [side * x, y, z], scale: [0.9, 1.1, 0.9], color, ink: INK.limb });
};
const feet = (s, x, z, r, color) => {
  for (const side of [-1, 1]) s.ball(r, { at: [side * x, 0.03, z], scale: [1, 0.6, 1.3], color, ink: INK.limb });
};

/** The colours each kind comes in: [body, what it wears]. A spirit is one of its kind's three sorts. */
export const SPIRIT_LOOKS = {
  wood: [[[0.5, 0.76, 0.34], [0.26, 0.5, 0.18]], [[0.82, 0.7, 0.44], [0.5, 0.32, 0.18]], [[0.36, 0.64, 0.4], [0.98, 0.62, 0.7]]],
  stone: [[[0.7, 0.71, 0.74], [0.4, 0.6, 0.28]], [[0.84, 0.72, 0.54], [0.64, 0.5, 0.36]], [[0.46, 0.48, 0.58], [0.5, 0.95, 1.0]]],
  water: [[[0.48, 0.78, 0.98], [0.24, 0.52, 0.9]], [[0.42, 0.86, 0.82], [0.9, 1.0, 1.0]], [[0.68, 0.7, 1.0], [0.4, 0.7, 0.36]]],
  flower: [[[1.0, 0.9, 0.62], [1.0, 0.56, 0.72]], [[1.0, 0.86, 0.4], [1.0, 1.0, 0.96]], [[0.98, 0.8, 0.9], [0.66, 0.48, 0.96]]],
  wind: [[[0.94, 0.98, 1.0], [0.6, 0.84, 0.95]], [[0.84, 1.0, 0.92], [0.4, 0.8, 0.66]], [[1.0, 0.88, 0.9], [0.98, 0.62, 0.6]]],
  ember: [[[1.0, 0.56, 0.2], [1.0, 0.88, 0.36]], [[0.98, 0.36, 0.34], [1.0, 0.72, 0.4]], [[0.42, 0.66, 1.0], [0.8, 0.96, 1.0]]],
  mushroom: [[[0.98, 0.93, 0.82], [0.9, 0.3, 0.24]], [[0.94, 0.86, 0.7], [0.62, 0.4, 0.26]], [[0.95, 0.9, 0.96], [0.66, 0.46, 0.9]]],
  star: [[[1.0, 0.92, 0.5], [1.0, 0.98, 0.8]], [[0.72, 0.86, 1.0], [0.95, 0.98, 1.0]], [[1.0, 0.74, 0.86], [1.0, 0.92, 0.6]]],
};

/** A spirit of a kind, in one of its three sorts. It floats, so what feet it has only dangle. */
export function spiritShape(kind, sort = 0) {
  const s = new Shape();
  const [body, wear] = SPIRIT_LOOKS[kind][sort % 3];
  const belly = pale(body, 0.55);
  const B = { color: body, ink: INK.body };
  if (kind === 'wood') {
    // a sprout: a seed of a body with a leaf or an acorn's cup on its head
    s.drop(0.26, 0.62, 18, { at: [0, 0.02, 0], ...B });
    s.ball(0.17, { at: [0, 0.22, 0.12], scale: [1, 0.95, 0.6], color: belly, ink: INK.body });
    face(s, 0.34, 0.215);
    hands(s, 0.25, 0.22, 0.04, 0.06, body);
    feet(s, 0.1, 0.06, 0.06, deep(body));
    if (sort === 1) {
      s.lathe([[0.2, 0.46], [0.21, 0.5], [0.17, 0.6], [0.09, 0.67], [0.0, 0.69]], 16, { color: wear, ink: INK.top });
      s.cyl(0.02, 0.025, 0.1, 6, { at: [0.01, 0.72, 0], rot: [0, 0, -0.3], color: deep(wear), ink: INK.extra });
    } else {
      s.cyl(0.014, 0.02, 0.14, 6, { at: [0, 0.66, 0], color: deep(body, 0.6), ink: INK.top });
      s.leaf([0, 0.71, 0], [0.26, 0.88, 0.02], 0.16, { color: sort === 2 ? [0.5, 0.8, 0.36] : [0.48, 0.8, 0.26], ink: INK.top, steps: 5 }, [0, 0.4, 1]);
      s.leaf([0, 0.71, 0], [-0.19, 0.84, 0.02], 0.12, { color: [0.4, 0.72, 0.26], ink: INK.top, steps: 5 }, [0, 0.4, 1]);
      if (sort === 2) {
        for (let p = 0; p < 5; p++) s.leaf([0.02, 0.73, 0.06], [0.02 + Math.cos(p * 1.257) * 0.07, 0.73 + Math.sin(p * 1.257) * 0.07, 0.1], 0.06, { color: wear, ink: INK.extra }, [0, 0, 1]);
        s.ball(0.022, { at: [0.02, 0.73, 0.1], color: [1, 0.86, 0.3], ink: INK.extra }, 1);
      }
    }
  } else if (kind === 'stone') {
    // a boulder with a face, on two short legs
    s.ball(0.29, { at: [0, 0.3, 0], scale: [1.12, 0.86, 0.98], rot: [0.1, 0.3, 0.05], ...B }, 3);
    face(s, 0.33, 0.265, 0.1, 1.05);
    hands(s, 0.33, 0.24, 0.03, 0.065, deep(body, 0.85));
    for (const side of [-1, 1]) s.capsule(0.055, 0.05, { at: [side * 0.13, 0.05, 0.02], color: deep(body, 0.8), ink: INK.limb });
    if (sort === 0) {
      s.ball(0.24, { at: [0, 0.5, -0.02], scale: [1.05, 0.42, 0.95], color: wear, ink: INK.top });
      s.leaf([0.06, 0.6, 0], [0.2, 0.74, 0.02], 0.09, { color: [0.5, 0.74, 0.3], ink: INK.extra }, [0, 0.4, 1]);
    } else if (sort === 1) {
      s.ball(0.15, { at: [0.02, 0.6, 0], scale: [1, 0.6, 1], rot: [0, 1, 0.2], color: wear, ink: INK.top });
      s.ball(0.09, { at: [-0.02, 0.72, 0.01], scale: [1, 0.65, 1], color: pale(wear, 0.3), ink: INK.extra });
    } else {
      for (const [x, z, h, lean] of [[0, 0, 0.26, 0], [0.1, 0.02, 0.17, -0.5], [-0.09, -0.02, 0.15, 0.5]]) s.add(new THREE.OctahedronGeometry(1, 0), { at: [x, 0.56 + h / 2, z], rot: [0, 0.4, lean], scale: [0.055, h / 1.4, 0.055], color: wear, shade: [0.3, 0.6, 0.85], ink: INK.top });
    }
  } else if (kind === 'water') {
    // a drop of water, with fins for ears
    s.drop(0.255, 0.72, 18, { at: [0, 0.0, 0], ...B });
    s.ball(0.16, { at: [0, 0.2, 0.13], scale: [1, 0.9, 0.6], color: pale(body, 0.6), ink: INK.body });
    s.ball(0.05, { at: [-0.1, 0.44, 0.17], scale: [0.7, 1.2, 0.4], color: [1, 1, 1], shade: [0.9, 0.95, 1], ink: INK.body }, 1);
    face(s, 0.31, 0.225);
    for (const side of [-1, 1]) s.leaf([side * 0.2, 0.3, -0.02], [side * 0.42, 0.42, -0.1], 0.16, { color: wear, ink: INK.limb, steps: 5 }, [0, 0.2, 1]);
    if (sort === 1) for (const [x, y, r] of [[0.12, 0.78, 0.045], [0.2, 0.66, 0.03], [-0.14, 0.72, 0.035]]) s.ball(r, { at: [x, y, 0], color: wear, shade: pale(body, 0.5), ink: INK.top });
    if (sort === 2) {
      s.cyl(0.2, 0.2, 0.015, 14, { at: [0, 0.62, 0], rot: [0.12, 0, 0.1], color: wear, ink: INK.top });
      for (let p = 0; p < 5; p++) s.leaf([0.03, 0.64, 0], [0.03 + Math.cos(p * 1.257) * 0.07, 0.7, Math.sin(p * 1.257) * 0.07], 0.06, { color: [1, 0.8, 0.9], ink: INK.extra });
    }
  } else if (kind === 'flower') {
    // a flower with a face in the middle of it, on a bud of a body
    s.drop(0.15, 0.3, 14, { at: [0, 0.3, 0], rot: [Math.PI, 0, 0], color: [0.42, 0.68, 0.3], ink: INK.limb });
    s.ball(0.21, { at: [0, 0.48, 0], scale: [1, 0.95, 0.9], ...B }, 3);
    const petals = sort === 1 ? 12 : 8;
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * TAU;
      const r = sort === 1 ? 0.38 : 0.34;
      s.leaf([Math.cos(a) * 0.12, 0.48 + Math.sin(a) * 0.12, -0.03], [Math.cos(a) * r, 0.48 + Math.sin(a) * r, -0.07], sort === 1 ? 0.12 : 0.19, { color: wear, ink: INK.top, steps: 5 }, [0, 0, 1]);
    }
    face(s, 0.5, 0.185, 0.08, 0.95);
    for (const side of [-1, 1]) s.leaf([side * 0.08, 0.22, 0], [side * 0.3, 0.3, 0.04], 0.1, { color: [0.4, 0.7, 0.3], ink: INK.extra }, [0, 0.3, 1]);
  } else if (kind === 'wind') {
    // a small cloud with a curl of a tail
    const puffs = [[0, 0.32, 0, 0.24], [0.19, 0.28, -0.02, 0.17], [-0.2, 0.3, -0.03, 0.18], [0.08, 0.47, -0.04, 0.16], [-0.1, 0.46, -0.02, 0.15], [0, 0.2, -0.08, 0.17]];
    for (const [x, y, z, r] of puffs) s.ball(r, { at: [x, y, z], ...B }, 3);
    face(s, 0.33, 0.225, 0.085);
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const a = t * 4.2;
      s.ball(0.085 * (1 - t * 0.7), { at: [Math.cos(a) * 0.1 * (1 - t), 0.14 - t * 0.02 + Math.sin(a) * 0.08 * (1 - t), -0.2 - t * 0.26], color: i % 2 ? wear : body, ink: INK.limb });
    }
    if (sort === 1) s.torus(0.09, 0.022, { at: [0.2, 0.52, 0], rot: [0, 0, 0.5], color: wear, ink: INK.top }, 12);
    if (sort === 2) for (const side of [-1, 1]) s.leaf([side * 0.22, 0.34, -0.04], [side * 0.46, 0.5, -0.12], 0.14, { color: wear, ink: INK.extra }, [0, 0.2, 1]);
  } else if (kind === 'ember') {
    // a flame: a hot heart inside a tongue of fire
    s.drop(0.25, 0.8, 18, { at: [0, 0.0, 0], color: body, shade: deep(body, 0.85), ink: INK.body });
    s.drop(0.16, 0.5, 14, { at: [0, 0.06, 0.1], color: wear, shade: wear, ink: INK.body });
    face(s, 0.3, 0.235);
    for (const [x, y, lean, h] of [[0.2, 0.34, -0.55, 0.3], [-0.19, 0.3, 0.6, 0.26]]) s.drop(0.07, h, 10, { at: [x, y, -0.02], rot: [0, 0, lean], color: body, shade: deep(body, 0.85), ink: INK.limb });
    s.ball(0.03, { at: [0.12, 0.92, 0], color: wear, shade: wear, ink: INK.top }, 1);
    s.ball(0.02, { at: [-0.08, 1.0, 0.02], color: wear, shade: wear, ink: INK.top }, 1);
  } else if (kind === 'mushroom') {
    // a mushroom: a stalk with a face, under a cap far too big for it
    s.capsule(0.17, 0.16, { at: [0, 0.25, 0], scale: [1, 1, 0.95], ...B });
    face(s, 0.3, 0.155, 0.075, 0.95);
    hands(s, 0.19, 0.2, 0.03, 0.05, body);
    feet(s, 0.08, 0.05, 0.055, deep(body, 0.85));
    const wide = sort === 1 ? 0.36 : 0.42;
    s.lathe([[0.02, 0.43], [wide * 0.8, 0.42], [wide, 0.47], [wide * 0.96, 0.57], [wide * 0.72, 0.71], [wide * 0.36, 0.8], [0.0, 0.83]], 20, { color: wear, ink: INK.top });
    if (sort !== 1) {
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + sort;
        const r = wide * (0.3 + 0.38 * (i % 2));
        s.ball(0.05 - 0.012 * (i % 2), { at: [Math.cos(a) * r, 0.78 - (i % 2) * 0.12, Math.sin(a) * r], scale: [1, 0.45, 1], color: [1, 0.98, 0.9], shade: [0.82, 0.78, 0.82], ink: INK.extra }, 1);
      }
    } else s.ball(0.07, { at: [0.12, 0.76, 0.1], scale: [1, 0.4, 1], color: pale(wear, 0.4), ink: INK.extra }, 1);
  } else if (kind === 'star') {
    // a star with soft points, turning slowly
    s.ball(0.2, { at: [0, 0.4, 0], scale: [1, 1, 0.78], ...B }, 3);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU + Math.PI / 2;
      s.cone(0.14, 0.3, 12, { at: [Math.cos(a) * 0.26, 0.4 + Math.sin(a) * 0.26, 0], rot: [0, 0, a - Math.PI / 2], scale: [1, 1, 0.7], ...B });
    }
    face(s, 0.41, 0.15, 0.075, 0.95);
    if (sort === 1) s.torus(0.34, 0.016, { at: [0, 0.4, 0], rot: [1.25, 0, 0.3], color: wear, shade: wear, ink: INK.top }, 20);
    for (const [x, y, r] of [[0.36, 0.72, 0.035], [-0.4, 0.56, 0.025], [0.3, 0.1, 0.022]]) s.ball(r, { at: [x, y, 0.02], color: wear, shade: wear, ink: INK.extra }, 1);
  }
  return s;
}

// ---- animals -----------------------------------------------------------------------------------------------------
// Inks for the line: body 0.05, head 0.07, face 0.1, ears 0.14, legs 0.17, tail and trimmings 0.2.
const EYE = { color: [0.1, 0.08, 0.08], shade: [0.07, 0.06, 0.08], ink: 0.1 };
/** Two eyes with a light in each, x apart either side of the middle. */
const eyes = (s, x, y, z, r = 0.028) => {
  for (const side of [-1, 1]) {
    s.ball(r, { at: [side * x, y, z], scale: [0.8, 1.15, 0.7], ...EYE });
    s.ball(r * 0.34, { at: [side * x + r * 0.25, y + r * 0.4, z + r * 0.55], color: [1, 1, 1], shade: [1, 1, 1], ink: 0.1 }, 1);
  }
};
/** A leg: thicker at the top than at the foot, with a foot of its own colour. */
const leg = (s, top, foot, r, color, sock = color, hoof = null) => {
  const knee = [(top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2, (top[2] + foot[2]) / 2 + 0.02];
  stick(s, top, knee, r, r * 0.72, { color, ink: 0.17 }, 9);
  stick(s, knee, [foot[0], foot[1] + r * 0.5, foot[2]], r * 0.72, r * 0.6, { color: sock, ink: 0.17 }, 9);
  s.ball(r * 0.82, { at: [foot[0], foot[1] + r * 0.45, foot[2] + r * 0.3], scale: [1, 0.7, 1.35], color: hoof ?? sock, ink: 0.2 }, 1);
};

const animal = {
  rabbit() {
    const s = new Shape();
    const fur = [0.88, 0.78, 0.63];
    const white = [0.99, 0.97, 0.93];
    const pink = [0.98, 0.72, 0.72];
    s.ball(0.25, { at: [0, 0.27, -0.06], scale: [0.86, 0.88, 1.2], color: fur, ink: 0.05 }, 3);
    s.ball(0.17, { at: [0, 0.2, 0.08], scale: [0.8, 0.8, 0.9], color: white, ink: 0.05 });
    s.ball(0.165, { at: [0, 0.5, 0.2], scale: [1, 0.95, 1], color: fur, ink: 0.07 }, 3);
    for (const side of [-1, 1]) {
      // cheeks, long ears with pink inside them, big hind feet and small front paws
      s.ball(0.075, { at: [side * 0.085, 0.45, 0.3], color: white, ink: 0.07 });
      s.capsule(0.05, 0.26, { at: [side * 0.075, 0.82, 0.13], rot: [-0.22, 0, -side * 0.14], scale: [1, 1, 0.5], color: fur, ink: 0.14 });
      s.capsule(0.028, 0.2, { at: [side * 0.078, 0.82, 0.148], rot: [-0.22, 0, -side * 0.14], scale: [1, 1, 0.3], color: pink, ink: 0.14 });
      s.ball(0.085, { at: [side * 0.15, 0.06, 0.04], scale: [0.7, 0.55, 1.6], color: fur, ink: 0.17 });
      s.ball(0.05, { at: [side * 0.09, 0.05, 0.26], scale: [0.8, 0.7, 1.2], color: white, ink: 0.17 }, 1);
    }
    s.ball(0.09, { at: [0, 0.3, -0.36], color: white, ink: 0.2 });
    s.ball(0.026, { at: [0, 0.48, 0.365], scale: [1.2, 0.8, 0.8], color: [0.95, 0.55, 0.58], ink: 0.1 }, 1);
    eyes(s, 0.105, 0.54, 0.31, 0.03);
    return s;
  },
  squirrel() {
    const s = new Shape();
    const fur = [0.8, 0.47, 0.22];
    const belly = [0.98, 0.91, 0.78];
    s.ball(0.17, { at: [0, 0.25, 0], scale: [0.86, 1.2, 0.86], color: fur, ink: 0.05 }, 3);
    s.ball(0.115, { at: [0, 0.23, 0.085], scale: [0.8, 1.2, 0.6], color: belly, ink: 0.05 });
    s.ball(0.13, { at: [0, 0.52, 0.06], scale: [1, 0.92, 1], color: fur, ink: 0.07 }, 3);
    s.ball(0.07, { at: [0, 0.48, 0.15], scale: [1.1, 0.8, 0.8], color: belly, ink: 0.07 }, 1);
    for (const side of [-1, 1]) {
      s.cone(0.04, 0.11, 8, { at: [side * 0.075, 0.66, 0.03], rot: [0, 0, -side * 0.15], color: fur, ink: 0.14 });
      s.ball(0.045, { at: [side * 0.09, 0.3, 0.14], color: fur, ink: 0.17 }, 1);
      s.ball(0.06, { at: [side * 0.09, 0.04, 0.05], scale: [0.8, 0.6, 1.5], color: fur, ink: 0.17 }, 1);
    }
    // an acorn held in both paws
    s.ball(0.045, { at: [0, 0.3, 0.2], scale: [1, 1.15, 1], color: [0.72, 0.52, 0.26], ink: 0.2 }, 1);
    s.ball(0.047, { at: [0, 0.33, 0.2], scale: [1, 0.5, 1], color: [0.44, 0.3, 0.18], ink: 0.14 }, 1);
    // the tail: most of a squirrel, curling up behind and over
    const curl = [[0, 0.16, -0.2, 0.11], [0, 0.34, -0.3, 0.14], [0, 0.56, -0.32, 0.16], [0, 0.76, -0.24, 0.15], [0, 0.86, -0.1, 0.11]];
    curl.forEach(([x, y, z, r], i) => s.ball(r, { at: [x, y, z], scale: [0.85, 1, 0.9], color: i > 2 ? [0.9, 0.6, 0.3] : fur, ink: i % 2 ? 0.2 : 0.17 }));
    s.ball(0.02, { at: [0, 0.5, 0.2], color: [0.2, 0.12, 0.1], ink: 0.1 }, 1);
    eyes(s, 0.08, 0.56, 0.155, 0.026);
    return s;
  },
  deer() {
    const s = new Shape();
    const fur = [0.78, 0.54, 0.31];
    const white = [0.99, 0.95, 0.87];
    const dark = [0.3, 0.2, 0.15];
    // a long body carried level, deep in the chest
    s.capsule(0.27, 0.62, { at: [0, 0.98, -0.06], rot: [Math.PI / 2, 0, 0], scale: [0.86, 1, 1], color: fur, ink: 0.05 });
    s.ball(0.26, { at: [0, 0.99, 0.26], scale: [0.9, 1.06, 1], color: fur, ink: 0.05 }, 3);
    s.ball(0.22, { at: [0, 0.82, -0.02], scale: [0.7, 0.5, 2.0], color: white, ink: 0.05 });
    // the neck rising to a fine head
    stick(s, [0, 1.1, 0.36], [0, 1.62, 0.6], 0.16, 0.1, { color: fur, ink: 0.07 }, 12);
    s.ball(0.11, { at: [0, 1.22, 0.47], scale: [0.7, 1.4, 0.5], color: white, ink: 0.07 }, 1);
    s.ball(0.135, { at: [0, 1.7, 0.64], scale: [0.9, 0.95, 1.1], color: fur, ink: 0.14 }, 3);
    stick(s, [0, 1.67, 0.7], [0, 1.6, 0.9], 0.085, 0.055, { color: fur, ink: 0.14 }, 10);
    s.ball(0.058, { at: [0, 1.58, 0.9], color: white, ink: 0.14 }, 1);
    s.ball(0.03, { at: [0, 1.61, 0.945], scale: [1.2, 0.8, 0.8], color: [0.16, 0.11, 0.1], ink: 0.1 }, 1);
    for (const side of [-1, 1]) {
      s.leaf([side * 0.09, 1.78, 0.58], [side * 0.3, 1.9, 0.5], 0.13, { color: fur, ink: 0.17, steps: 4 }, [0, 0.3, 1]);
      // antlers: a beam with three tines
      const base = [side * 0.06, 1.82, 0.6];
      const mid = [side * 0.16, 2.06, 0.52];
      const tip = [side * 0.26, 2.3, 0.56];
      const horn = { color: [0.93, 0.87, 0.72], ink: 0.2 };
      stick(s, base, mid, 0.024, 0.02, horn, 6);
      stick(s, mid, tip, 0.02, 0.012, horn, 6);
      stick(s, mid, [side * 0.1, 2.2, 0.66], 0.016, 0.01, horn, 5);
      stick(s, [side * 0.21, 2.18, 0.54], [side * 0.36, 2.26, 0.46], 0.014, 0.009, horn, 5);
      leg(s, [side * 0.14, 0.92, 0.3], [side * 0.14, 0, 0.32], 0.07, fur, fur, dark);
      leg(s, [side * 0.15, 0.94, -0.42], [side * 0.15, 0, -0.46], 0.078, fur, fur, dark);
      for (let i = 0; i < 4; i++) s.ball(0.032, { at: [side * (0.215 + 0.01 * (i % 2)), 1.12 + 0.06 * (i % 2), -0.34 + i * 0.17], scale: [0.4, 1, 1], color: white, ink: 0.05 }, 1);
    }
    s.ball(0.075, { at: [0, 1.1, -0.62], scale: [0.8, 1, 0.7], color: white, ink: 0.2 }, 1);
    eyes(s, 0.105, 1.73, 0.72, 0.032);
    return s;
  },
  fox() {
    const s = new Shape();
    const fur = [0.96, 0.53, 0.2];
    const white = [0.99, 0.96, 0.9];
    const sock = [0.27, 0.19, 0.17];
    s.capsule(0.2, 0.42, { at: [0, 0.5, -0.06], rot: [Math.PI / 2, 0, 0], scale: [0.9, 1, 1], color: fur, ink: 0.05 });
    s.ball(0.17, { at: [0, 0.46, 0.2], scale: [0.8, 0.9, 0.9], color: white, ink: 0.05 });
    s.ball(0.19, { at: [0, 0.8, 0.36], scale: [1.08, 0.9, 0.95], color: fur, ink: 0.07 }, 3);
    // white cheeks, a pointed muzzle, tall ears tipped with dark
    for (const side of [-1, 1]) {
      s.ball(0.1, { at: [side * 0.12, 0.75, 0.44], scale: [1, 0.8, 0.8], color: white, ink: 0.07 }, 1);
      s.cone(0.085, 0.22, 6, { at: [side * 0.125, 1.02, 0.31], rot: [0, 0, -side * 0.22], scale: [1, 1, 0.6], color: fur, ink: 0.14 });
      s.cone(0.045, 0.1, 6, { at: [side * 0.138, 1.1, 0.31], rot: [0, 0, -side * 0.22], scale: [1, 1, 0.6], color: sock, ink: 0.2 });
      leg(s, [side * 0.11, 0.42, 0.18], [side * 0.11, 0, 0.2], 0.055, fur, sock);
      leg(s, [side * 0.12, 0.44, -0.28], [side * 0.12, 0, -0.3], 0.06, fur, sock);
    }
    stick(s, [0, 0.76, 0.48], [0, 0.72, 0.68], 0.09, 0.035, { color: white, ink: 0.07 }, 10);
    s.ball(0.032, { at: [0, 0.735, 0.7], color: [0.12, 0.09, 0.09], ink: 0.1 }, 1);
    // the brush: full in the middle, white at the tip
    s.drop(0.17, 0.62, 14, { at: [0, 0.5, -0.3], rot: [-1.9, 0, 0], color: fur, ink: 0.2 });
    s.ball(0.085, { at: [0, 0.72, -0.86], scale: [1, 1, 1.3], color: white, ink: 0.14 });
    eyes(s, 0.1, 0.85, 0.51, 0.028);
    return s;
  },
  duck() {
    const s = new Shape();
    const white = [0.99, 0.98, 0.93];
    const bill = [1.0, 0.68, 0.2];
    const green = [0.2, 0.52, 0.38];
    s.ball(0.24, { at: [0, 0.32, -0.02], scale: [0.86, 0.8, 1.25], color: white, ink: 0.05 }, 3);
    s.drop(0.13, 0.3, 12, { at: [0, 0.34, -0.26], rot: [-1.05, 0, 0], color: white, ink: 0.05 });
    stick(s, [0, 0.44, 0.14], [0, 0.72, 0.2], 0.09, 0.07, { color: white, ink: 0.07 }, 10);
    s.torus(0.073, 0.014, { at: [0, 0.62, 0.18], rot: [Math.PI / 2 - 0.2, 0, 0], color: [0.98, 0.95, 0.8], ink: 0.2 }, 12);
    s.ball(0.12, { at: [0, 0.78, 0.21], color: green, shade: [0.1, 0.28, 0.3], ink: 0.14 }, 3);
    s.ball(0.075, { at: [0, 0.745, 0.35], scale: [1, 0.42, 1.5], color: bill, ink: 0.17 });
    for (const side of [-1, 1]) {
      s.leaf([side * 0.16, 0.42, 0.12], [side * 0.2, 0.36, -0.32], 0.26, { color: [0.9, 0.9, 0.86], ink: 0.2, steps: 4 }, [side, 0.3, 0]);
      stick(s, [side * 0.08, 0.14, 0.02], [side * 0.08, 0.02, 0.03], 0.02, 0.018, { color: bill, ink: 0.17 }, 6);
      s.leaf([side * 0.08, 0.015, -0.02], [side * 0.09, 0.015, 0.16], 0.12, { color: bill, ink: 0.2 });
    }
    eyes(s, 0.078, 0.82, 0.29, 0.022);
    return s;
  },
};

const cache = new Map();
const once = (key, make) => {
  if (!cache.has(key)) {
    const geometry = make().build();
    geometry.userData.top = geometry.boundingBox.max.y;
    cache.set(key, geometry);
  }
  return cache.get(key);
};

/** The geometry of a building (or the basket, the sign, a marker). `userData.top` is how tall it stands. */
export const buildingGeometry = (type) => once(`b:${type}`, build[type]);
export const nodeGeometry = (type) => once(`n:${type}`, node[type]);
export const animalGeometry = (kind) => once(`a:${kind}`, animal[kind]);
export const spiritGeometry = (kind, sort = 0) => once(`s:${kind}:${sort % 3}`, () => spiritShape(kind, sort));
export const floraGeometry = (kind) => once(`f:${kind}`, flora[kind]);
export const FLORA_KINDS = Object.keys(flora);

/** A flame: a few leaning cones, pointed up. Drawn with a glow paint, and made to flicker by whoever owns it. */
export function flameGeometry() {
  return once('flame', () => {
    const s = new Shape();
    s.cone(0.2, 0.62, 12, { at: [0, 0.31, 0] });
    s.cone(0.12, 0.42, 12, { at: [0.11, 0.21, 0.05], rot: [0.1, 0, -0.3] });
    s.cone(0.11, 0.36, 12, { at: [-0.1, 0.18, -0.06], rot: [-0.1, 0, 0.32] });
    return s;
  });
}
