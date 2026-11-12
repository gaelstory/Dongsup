// What the game's things look like, each built from a few plain solids with a paint apiece. Everything stands on
// y = 0 at its own middle and faces +z.
import * as THREE from 'three';
import { Shape } from './paint.js';

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
const log = (s, len, r, at, rot = [0, 0, 0], color = WOOD) => s.cyl(r, r, len, 7, { at, rot: [rot[0], rot[1], rot[2] + Math.PI / 2], color });

// ---- buildings ------------------------------------------------------------------------------------------------
const build = {
  campfire() {
    const s = new Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      s.ball(0.17 + 0.03 * (i % 3), { at: [Math.cos(a) * 0.52, 0.07, Math.sin(a) * 0.52], scale: [1, 0.7, 1], color: i % 2 ? STONE : STONE2 });
    }
    s.cyl(0.42, 0.45, 0.05, 10, { at: [0, 0.03, 0], color: [0.22, 0.2, 0.2] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      s.cyl(0.06, 0.07, 0.75, 6, { at: [Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16], rot: [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55], color: i % 2 ? BARK : WOOD });
    }
    return s;
  },
  tent() {
    const s = new Shape();
    const W = 1.2;
    const H = 1.75;
    const D = 1.5;
    s.box(2.2, 0.05, 2.8, { at: [0, 0.03, 0], color: [0.58, 0.43, 0.3] });
    s.quad([-W, 0, -D], [-W, 0, D], [0, H, D], [0, H, -D], { color: CANVAS });
    s.quad([W, 0, D], [W, 0, -D], [0, H, -D], [0, H, D], { color: CANVAS });
    s.tri([-W, 0, -D], [0, H, -D], [W, 0, -D], { color: CANVAS });
    // the flaps, drawn back from a dark doorway
    s.tri([-W, 0, D], [-0.38, 0, D], [0, H, D], { color: CANVAS });
    s.tri([0.38, 0, D], [W, 0, D], [0, H, D], { color: CANVAS });
    s.tri([-0.38, 0, D - 0.04], [0.38, 0, D - 0.04], [0, H, D - 0.04], { color: DARK, shade: DARK });
    // a band of red along the foot of each side
    const t = 0.2;
    for (const side of [-1, 1]) {
      const o = 0.012;
      const a = [side * (W + o * 0.82), o * 0.57, 0];
      const b = [side * (W * (1 - t) + o * 0.82), H * t + o * 0.57, 0];
      const corners = [[a[0], a[1], -D], [a[0], a[1], D], [b[0], b[1], D], [b[0], b[1], -D]];
      s.quad(...(side < 0 ? corners : corners.reverse()), { color: RED });
    }
    log(s, 3.3, 0.04, [0, H + 0.02, 0], [0, Math.PI / 2, 0], BARK);
    s.cyl(0.04, 0.04, H, 5, { at: [0, H / 2, D + 0.06], color: BARK });
    s.cyl(0.04, 0.04, H, 5, { at: [0, H / 2, -D - 0.06], color: BARK });
    return s;
  },
  bench() {
    const s = new Shape();
    s.cyl(0.24, 0.24, 1.6, 8, { at: [0, 0.42, 0], rot: [0, 0, Math.PI / 2], scale: [0.55, 1, 1], color: WOOD });
    s.box(1.58, 0.02, 0.4, { at: [0, 0.535, 0], color: CUT });
    for (const x of [-0.55, 0.55]) s.cyl(0.16, 0.18, 0.36, 7, { at: [x, 0.18, 0], color: BARK });
    return s;
  },
  table() {
    const s = new Shape();
    s.box(1.8, 0.08, 0.85, { at: [0, 0.78, 0], color: CUT });
    for (const x of [-0.75, 0.75]) for (const z of [-0.32, 0.32]) s.box(0.09, 0.76, 0.09, { at: [x, 0.38, z], color: WOOD });
    for (const z of [-0.78, 0.78]) {
      s.box(1.8, 0.07, 0.3, { at: [0, 0.45, z], color: WOOD });
      for (const x of [-0.7, 0.7]) s.box(0.08, 0.45, 0.22, { at: [x, 0.22, z], color: BARK });
    }
    return s;
  },
  lantern() {
    const s = new Shape();
    for (let i = 0; i < 4; i++) s.ball(0.12, { at: [Math.cos(i * 1.6) * 0.14, 0.05, Math.sin(i * 1.6) * 0.14], scale: [1, 0.6, 1], color: STONE });
    s.cyl(0.055, 0.07, 2.05, 6, { at: [0, 1.02, 0], color: BARK });
    s.box(0.55, 0.06, 0.06, { at: [0.22, 1.98, 0], color: BARK });
    s.box(0.03, 0.14, 0.03, { at: [0.42, 1.89, 0], color: DARK });
    s.box(0.2, 0.26, 0.2, { at: [0.42, 1.7, 0], color: LAMP, shade: [0.9, 0.62, 0.3], ink: 1 });
    s.cone(0.2, 0.14, 4, { at: [0.42, 1.89, 0], rot: [0, Math.PI / 4, 0], color: RED });
    s.box(0.24, 0.04, 0.24, { at: [0.42, 1.56, 0], color: BARK });
    return s;
  },
  fence() {
    const s = new Shape();
    for (const x of [-0.95, 0.95]) {
      s.box(0.11, 1.0, 0.11, { at: [x, 0.5, 0], color: WOOD });
      s.cone(0.09, 0.1, 4, { at: [x, 1.05, 0], rot: [0, Math.PI / 4, 0], color: WOOD });
    }
    s.box(2.0, 0.08, 0.05, { at: [0, 0.42, 0], color: CUT });
    s.box(2.0, 0.08, 0.05, { at: [0, 0.78, 0], color: CUT });
    return s;
  },
  path() {
    const s = new Shape();
    const spots = [[-0.28, -0.18, 0.3], [0.26, 0.02, 0.34], [-0.1, 0.34, 0.24]];
    spots.forEach(([x, z, r], i) => s.ball(r, { at: [x, 0.03, z], scale: [1, 0.2, 1], color: i % 2 ? STONE : [0.7, 0.68, 0.62] }));
    return s;
  },
  hut() {
    const s = new Shape();
    s.cyl(0.92, 1.0, 1.05, 12, { at: [0, 0.52, 0], color: [0.92, 0.86, 0.72] });
    s.cyl(1.04, 1.06, 0.14, 12, { at: [0, 0.02, 0], color: STONE });
    s.cone(1.5, 1.5, 12, { at: [0, 1.72, 0], color: THATCH });
    s.cone(1.62, 0.3, 12, { at: [0, 1.08, 0], color: [0.74, 0.58, 0.3] });
    s.ball(0.13, { at: [0, 2.5, 0], color: RED });
    // a round door, and a small window with a light in it
    s.box(0.46, 0.62, 0.1, { at: [0, 0.38, 0.95], color: BARK });
    s.cyl(0.23, 0.23, 0.1, 8, { at: [0, 0.69, 0.95], rot: [Math.PI / 2, 0, 0], color: BARK });
    s.ball(0.035, { at: [0.13, 0.4, 1.01], color: LAMP });
    s.cyl(0.14, 0.14, 0.08, 8, { at: [0.68, 0.68, 0.66], rot: [Math.PI / 2, 0, 0.8], color: LAMP, shade: [0.9, 0.62, 0.3], ink: 1 });
    // a leaf growing out of the top
    s.quad([0, 2.6, 0], [0.16, 2.78, 0.02], [0.3, 2.98, 0], [0.1, 2.84, -0.03], { color: LEAF });
    s.quad([0, 2.6, 0], [-0.12, 2.74, 0.02], [-0.22, 2.86, 0], [-0.06, 2.76, -0.03], { color: LEAF });
    return s;
  },
  flowerbed() {
    const s = new Shape();
    const random = rng(7);
    s.box(2.0, 0.12, 2.0, { at: [0, 0.05, 0], color: SOIL });
    for (const [x, z, w, d] of [[0, 1.02, 2.2, 0.14], [0, -1.02, 2.2, 0.14], [1.02, 0, 0.14, 2.2], [-1.02, 0, 0.14, 2.2]]) s.box(w, 0.2, d, { at: [x, 0.1, z], color: WOOD });
    const heads = [[1.0, 0.8, 0.25], [1.0, 0.55, 0.7], [0.98, 0.96, 0.9], [0.7, 0.5, 0.95], [0.98, 0.45, 0.3]];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = -0.72 + i * 0.48 + (random() - 0.5) * 0.2;
        const z = -0.72 + j * 0.48 + (random() - 0.5) * 0.2;
        const h = 0.42 + random() * 0.3;
        s.box(0.035, h, 0.035, { at: [x, 0.1 + h / 2, z], color: LEAF });
        s.ball(0.1, { at: [x, 0.14 + h, z], scale: [1, 0.7, 1], color: heads[(i * 3 + j) % heads.length] }, 0);
      }
    }
    return s;
  },
  garden() {
    const s = new Shape();
    const random = rng(11);
    s.box(2.6, 0.12, 2.6, { at: [0, 0.05, 0], color: SOIL });
    for (const x of [-0.65, 0.65]) {
      for (const z of [-0.65, 0.65]) {
        s.ball(0.46, { at: [x, 0.48, z], scale: [1, 0.85, 1], color: LEAF2 });
        s.ball(0.3, { at: [x + 0.2, 0.74, z - 0.1], color: LEAF });
        for (let i = 0; i < 6; i++) {
          const a = random() * TAU;
          const up = 0.3 + random() * 0.5;
          s.ball(0.065, { at: [x + Math.cos(a) * 0.42, up + 0.1, z + Math.sin(a) * 0.42], color: [0.45, 0.3, 0.86] }, 0);
        }
      }
    }
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) s.box(0.08, 0.7, 0.08, { at: [x, 0.35, z], color: WOOD });
    return s;
  },
  feeder() {
    const s = new Shape();
    s.cyl(0.06, 0.08, 1.1, 6, { at: [0, 0.55, 0], color: BARK });
    s.box(0.8, 0.06, 0.8, { at: [0, 1.12, 0], color: CUT });
    for (const [x, z, w, d] of [[0, 0.4, 0.8, 0.05], [0, -0.4, 0.8, 0.05], [0.4, 0, 0.05, 0.8], [-0.4, 0, 0.05, 0.8]]) s.box(w, 0.1, d, { at: [x, 1.18, z], color: WOOD });
    for (const [x, z] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) s.box(0.04, 0.5, 0.04, { at: [x, 1.4, z], color: WOOD });
    s.quad([-0.55, 1.62, -0.5], [-0.55, 1.62, 0.5], [0, 1.95, 0.5], [0, 1.95, -0.5], { color: RED });
    s.quad([0.55, 1.62, 0.5], [0.55, 1.62, -0.5], [0, 1.95, -0.5], [0, 1.95, 0.5], { color: RED });
    return s;
  },
  well() {
    const s = new Shape();
    s.add(new THREE.CylinderGeometry(0.85, 0.92, 0.8, 12, 1, true), { at: [0, 0.4, 0], color: STONE });
    s.add(new THREE.CylinderGeometry(0.68, 0.68, 0.8, 12, 1, true), { at: [0, 0.4, 0], color: STONE2, shade: [0.2, 0.22, 0.26] });
    s.add(new THREE.RingGeometry(0.66, 0.9, 12), { at: [0, 0.8, 0], rot: [-Math.PI / 2, 0, 0], color: [0.7, 0.69, 0.64] });
    s.cyl(0.68, 0.68, 0.02, 12, { at: [0, 0.5, 0], color: [0.3, 0.55, 0.75], shade: [0.12, 0.25, 0.45] });
    for (const x of [-0.82, 0.82]) s.box(0.1, 1.5, 0.1, { at: [x, 1.5, 0], color: WOOD });
    log(s, 1.7, 0.045, [0, 1.75, 0], [0, 0, 0], BARK);
    s.quad([-1.05, 2.15, -0.6], [-1.05, 2.15, 0.6], [1.05, 2.15, 0.6], [1.05, 2.15, -0.6], { at: [0, 0, 0], color: RED });
    s.quad([-1.05, 2.15, 0.6], [-1.05, 2.5, 0], [1.05, 2.5, 0], [1.05, 2.15, 0.6], { color: RED });
    s.quad([-1.05, 2.5, 0], [-1.05, 2.15, -0.6], [1.05, 2.15, -0.6], [1.05, 2.5, 0], { color: RED });
    s.box(0.02, 0.6, 0.02, { at: [0.15, 1.45, 0], color: DARK });
    s.cyl(0.13, 0.1, 0.2, 7, { at: [0.15, 1.08, 0], color: WOOD });
    return s;
  },
  cabin() {
    const s = new Shape();
    const X = 2.2;
    const Z = 1.8;
    const H = 2.4;
    s.box(2 * X + 0.25, 0.9, 2 * Z + 0.25, { at: [0, -0.3, 0], color: STONE2 });
    s.box(2 * X, H, 2 * Z, { at: [0, H / 2 + 0.1, 0], color: [0.62, 0.44, 0.27] });
    // the logs, as lines of darker wood standing a little proud
    for (let i = 0; i < 6; i++) s.box(2 * X + 0.08, 0.05, 2 * Z + 0.08, { at: [0, 0.32 + i * 0.4, 0], color: BARK });
    for (const x of [-X, X]) for (const z of [-Z, Z]) s.box(0.22, H, 0.22, { at: [x, H / 2 + 0.1, z], color: BARK });
    const E = H + 0.1;
    const R = E + 1.35;
    for (const x of [-X, X]) s.tri([x, E, -Z], [x, E, Z], [x, R, 0], { color: [0.66, 0.48, 0.3] });
    const O = X + 0.35;
    const eave = [Z + 0.4, E - 0.28];
    const roof = [0.74, 0.34, 0.25];
    s.quad([-O, eave[1], eave[0]], [O, eave[1], eave[0]], [O, R + 0.02, 0], [-O, R + 0.02, 0], { color: roof });
    s.quad([O, eave[1], -eave[0]], [-O, eave[1], -eave[0]], [-O, R + 0.02, 0], [O, R + 0.02, 0], { color: roof });
    log(s, 2 * O + 0.1, 0.07, [0, R + 0.04, 0], [0, 0, 0], BARK);
    // door, step, window with a light in it, chimney
    s.box(0.85, 1.65, 0.08, { at: [-0.7, 0.95, Z + 0.03], color: [0.42, 0.27, 0.17] });
    s.ball(0.045, { at: [-0.42, 0.95, Z + 0.09], color: LAMP });
    s.box(1.3, 0.16, 0.6, { at: [-0.7, 0.06, Z + 0.32], color: STONE });
    s.box(0.95, 0.8, 0.06, { at: [0.95, 1.45, Z + 0.02], color: LAMP, shade: [0.9, 0.62, 0.3], ink: 1 });
    s.box(1.05, 0.07, 0.1, { at: [0.95, 1.03, Z + 0.04], color: CUT });
    s.box(0.05, 0.8, 0.09, { at: [0.95, 1.45, Z + 0.04], color: CUT });
    s.box(0.95, 0.05, 0.09, { at: [0.95, 1.45, Z + 0.04], color: CUT });
    s.box(0.55, 1.7, 0.55, { at: [1.35, R - 0.35, -0.75], color: STONE });
    s.box(0.65, 0.12, 0.65, { at: [1.35, R + 0.52, -0.75], color: STONE2 });
    return s;
  },
  cairn() {
    const s = new Shape();
    const stack = [[0.72, 0.3], [0.58, 0.78], [0.45, 1.18], [0.34, 1.5], [0.24, 1.76]];
    stack.forEach(([r, y], i) => s.ball(r, { at: [(i % 2 ? 0.04 : -0.03) * i, y, (i % 3 ? -0.03 : 0.04) * i], scale: [1, 0.62, 1], rot: [0, i * 1.3, 0], color: i % 2 ? STONE : [0.7, 0.69, 0.65] }));
    s.ball(0.22, { at: [0, 2.16, 0], color: [1.0, 0.95, 0.62], shade: [1.0, 0.8, 0.45], ink: 1 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      s.ball(0.15, { at: [Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05], scale: [1, 0.6, 1], color: STONE2 });
    }
    return s;
  },
  /** What stands in the middle of your land from the first day: a signpost, and the basket the spirits fill. */
  basket() {
    const s = new Shape();
    s.cyl(0.42, 0.34, 0.5, 10, { at: [0, 0.25, 0], color: [0.8, 0.62, 0.36] });
    s.add(new THREE.TorusGeometry(0.42, 0.045, 5, 12), { at: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0], color: [0.66, 0.48, 0.28] });
    s.add(new THREE.TorusGeometry(0.37, 0.03, 5, 12), { at: [0, 0.25, 0], rot: [Math.PI / 2, 0, 0], color: [0.66, 0.48, 0.28] });
    s.cyl(0.38, 0.38, 0.02, 10, { at: [0, 0.44, 0], color: DARK, shade: DARK });
    return s;
  },
  sign() {
    const s = new Shape();
    s.box(0.1, 1.5, 0.1, { at: [0, 0.75, 0], color: BARK });
    s.box(0.95, 0.42, 0.07, { at: [0, 1.32, 0.04], color: CUT });
    s.cone(0.1, 0.12, 4, { at: [0, 1.56, 0], rot: [0, Math.PI / 4, 0], color: BARK });
    s.quad([-0.3, 1.32, 0.08], [-0.1, 1.24, 0.08], [0.02, 1.36, 0.08], [-0.16, 1.44, 0.08], { color: LEAF });
    s.ball(0.07, { at: [0.2, 1.33, 0.08], scale: [1, 1, 0.3], color: RED }, 0);
    return s;
  },
  /** A stake with a ribbon: the edge of your land. */
  marker() {
    const s = new Shape();
    s.box(0.07, 1.25, 0.07, { at: [0, 0.62, 0], color: CUT });
    s.quad([0.04, 1.22, 0], [0.34, 1.16, 0.02], [0.3, 1.0, 0], [0.04, 1.04, 0], { color: RED });
    return s;
  },
};

// ---- what you gather --------------------------------------------------------------------------------------------
const node = {
  branch() {
    // a few cut sticks lying across one another, and a forked one standing among them so it shows over the grass
    const s = new Shape();
    const pale = [0.74, 0.54, 0.32];
    const dark = [0.52, 0.36, 0.22];
    log(s, 0.95, 0.06, [0, 0.1, 0], [0, 0.2, 0], pale);
    log(s, 0.85, 0.055, [0.05, 0.19, 0.06], [0, 1.3, 0.1], dark);
    log(s, 0.8, 0.05, [-0.05, 0.28, -0.02], [0, 2.3, -0.08], pale);
    s.cyl(0.03, 0.045, 0.9, 5, { at: [0.1, 0.6, 0], rot: [0.12, 0, -0.22], color: dark });
    s.cyl(0.02, 0.028, 0.42, 5, { at: [0.33, 1.08, 0.06], rot: [0.2, 0, -0.95], color: dark });
    s.cyl(0.02, 0.028, 0.36, 5, { at: [0.14, 1.18, -0.06], rot: [-0.3, 0, 0.35], color: dark });
    s.quad([0.5, 1.2, 0.08], [0.62, 1.3, 0.1], [0.56, 1.44, 0.1], [0.44, 1.32, 0.08], { color: [0.82, 0.66, 0.24] });
    return s;
  },
  pebble() {
    const s = new Shape();
    const c = [0.76, 0.74, 0.7];
    s.ball(0.3, { at: [0, 0.2, 0], scale: [1.1, 0.7, 1], color: c });
    s.ball(0.24, { at: [0.3, 0.16, 0.14], scale: [1, 0.7, 1.1], color: [0.68, 0.67, 0.66] });
    s.ball(0.2, { at: [-0.22, 0.14, 0.22], scale: [1, 0.7, 1], color: [0.7, 0.7, 0.7] });
    s.ball(0.2, { at: [0.06, 0.52, 0.04], scale: [1, 0.72, 1], color: c });
    s.ball(0.13, { at: [0.05, 0.74, 0.02], scale: [1, 0.75, 1], color: [0.82, 0.8, 0.76] });
    return s;
  },
  bush() {
    const s = new Shape();
    s.ball(0.55, { at: [0, 0.5, 0], scale: [1, 0.85, 1], color: LEAF2 });
    s.ball(0.42, { at: [0.36, 0.72, 0.1], color: LEAF });
    s.ball(0.4, { at: [-0.34, 0.66, -0.12], color: [0.26, 0.47, 0.2] });
    s.ball(0.3, { at: [0.02, 1.0, 0.02], color: LEAF });
    return s;
  },
  berries() {
    const s = new Shape();
    const random = rng(5);
    for (let i = 0; i < 11; i++) {
      const a = random() * TAU;
      const up = 0.35 + random() * 0.75;
      const r = 0.6 - Math.abs(up - 0.6) * 0.4;
      s.ball(0.075, { at: [Math.cos(a) * r, up, Math.sin(a) * r], color: [0.5, 0.32, 0.92], shade: [0.26, 0.14, 0.6] }, 0);
    }
    return s;
  },
  mushroom() {
    const s = new Shape();
    const cap = [0.9, 0.3, 0.2];
    const one = (x, z, k) => {
      s.cyl(0.07 * k, 0.1 * k, 0.6 * k, 7, { at: [x, 0.3 * k, z], color: [0.95, 0.9, 0.78] });
      s.ball(0.3 * k, { at: [x, 0.6 * k, z], scale: [1, 0.6, 1], color: cap, shade: [0.55, 0.14, 0.2] });
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + k;
        s.ball(0.045 * k, { at: [x + Math.cos(a) * 0.17 * k, 0.6 * k + 0.13 * k, z + Math.sin(a) * 0.17 * k], color: [1, 0.97, 0.9] }, 0);
      }
    };
    one(0, 0, 1.3);
    one(0.34, 0.16, 0.8);
    return s;
  },
  flower() {
    const s = new Shape();
    const heads = [[1.0, 0.55, 0.72], [1.0, 0.82, 0.3], [0.98, 0.96, 0.92], [1.0, 0.55, 0.72], [0.75, 0.55, 0.98]];
    heads.forEach((c, i) => {
      const a = i * 1.9;
      const x = Math.cos(a) * (i ? 0.2 : 0);
      const z = Math.sin(a) * (i ? 0.2 : 0);
      const h = 0.85 + (i % 3) * 0.14;
      s.box(0.035, h, 0.035, { at: [x, h / 2, z], rot: [z * 0.3, 0, -x * 0.3], color: LEAF });
      for (let p = 0; p < 5; p++) {
        const b = (p / 5) * TAU;
        s.ball(0.075, { at: [x * 1.15 + Math.cos(b) * 0.09, h + 0.02, z * 1.15 + Math.sin(b) * 0.09], scale: [1, 0.5, 1], color: c }, 0);
      }
      s.ball(0.06, { at: [x * 1.15, h + 0.05, z * 1.15], color: [1.0, 0.85, 0.3] }, 0);
    });
    return s;
  },
  reed() {
    const s = new Shape();
    const random = rng(9);
    for (let i = 0; i < 7; i++) {
      const x = (random() - 0.5) * 0.5;
      const z = (random() - 0.5) * 0.5;
      const h = 1.3 + random() * 0.6;
      const lean = [(random() - 0.5) * 0.24, 0, (random() - 0.5) * 0.24];
      s.box(0.04, h, 0.04, { at: [x, h / 2, z], rot: lean, color: [0.55, 0.66, 0.3] });
      if (i < 4) s.cyl(0.06, 0.06, 0.3, 6, { at: [x - lean[2] * h * 0.5, h + 0.02, z + lean[0] * h * 0.5], color: [0.5, 0.32, 0.2] });
    }
    return s;
  },
  tuft() {
    const s = new Shape();
    const random = rng(13);
    for (let i = 0; i < 6; i++) {
      const a = random() * TAU;
      const lean = 0.12 + random() * 0.2;
      const h = 1.2 + random() * 0.4;
      const rot = [Math.sin(a) * lean, 0, -Math.cos(a) * lean];
      const top = [Math.cos(a) * lean * h, h * 0.98, Math.sin(a) * lean * h];
      s.box(0.03, h, 0.03, { at: [top[0] / 2, h / 2, top[2] / 2], rot, color: [0.72, 0.7, 0.36] });
      s.cone(0.085, 0.5, 5, { at: [top[0] * 1.12, top[1] + 0.2, top[2] * 1.12], rot, color: [0.97, 0.93, 0.78], shade: [0.72, 0.68, 0.7] });
    }
    return s;
  },
  clay() {
    const s = new Shape();
    const c = [0.78, 0.5, 0.35];
    s.ball(0.45, { at: [0, 0.14, 0], scale: [1.1, 0.5, 1], color: c });
    s.ball(0.28, { at: [0.3, 0.2, 0.2], scale: [1, 0.6, 1], color: [0.7, 0.43, 0.3] });
    s.ball(0.2, { at: [-0.05, 0.36, -0.05], scale: [1, 0.6, 1], color: [0.84, 0.56, 0.4] });
    return s;
  },
};

// ---- spirits -----------------------------------------------------------------------------------------------------
// Inks: each part's number for the line. All below 0.23, none the same as its neighbour's.
const INK = { body: 0.05, face: 0.1, top: 0.14, limb: 0.17, extra: 0.2 };

/** A spirit: a round body with two dark eyes, and on its head whatever its kind wears. It floats, so it has no legs. */
export function spiritShape(kind, body, accent) {
  const s = new Shape();
  const light = body.map((c) => Math.min(1, c * 0.5 + 0.55));
  s.ball(0.27, { at: [0, 0.3, 0], scale: [1, 1.08, 0.95], color: body, ink: INK.body }, 3);
  s.ball(0.17, { at: [0, 0.22, 0.13], scale: [1, 0.9, 0.6], color: light, ink: INK.body }, 1);
  for (const x of [-0.095, 0.095]) {
    s.ball(0.042, { at: [x, 0.37, 0.235], scale: [1, 1.25, 0.6], color: [0.1, 0.08, 0.1], shade: [0.07, 0.06, 0.09], ink: INK.face }, 1);
    s.ball(0.014, { at: [x + 0.012, 0.39, 0.262], color: [1, 1, 1], shade: [1, 1, 1], ink: INK.face }, 0);
    s.ball(0.035, { at: [x * 1.75, 0.3, 0.215], scale: [1, 0.6, 0.4], color: [1.0, 0.6, 0.6], ink: INK.body }, 0);
  }
  for (const x of [-0.26, 0.26]) s.ball(0.07, { at: [x, 0.26, 0.04], color: body, ink: INK.limb }, 1);
  if (kind === 'wood') {
    s.cyl(0.015, 0.02, 0.16, 5, { at: [0, 0.66, 0], color: accent, ink: INK.top });
    s.quad([0, 0.72, 0], [0.13, 0.8, 0.03], [0.26, 0.9, 0], [0.1, 0.86, -0.03], { color: [0.45, 0.78, 0.25], ink: INK.top });
    s.quad([0, 0.72, 0], [-0.1, 0.8, 0.03], [-0.2, 0.84, 0], [-0.07, 0.83, -0.03], { color: [0.45, 0.78, 0.25], ink: INK.top });
  } else if (kind === 'stone') {
    s.ball(0.2, { at: [0, 0.6, -0.01], scale: [1, 0.5, 1], color: accent, ink: INK.top }, 1);
    s.ball(0.1, { at: [0.04, 0.72, 0], scale: [1, 0.6, 1], color: [0.56, 0.58, 0.62], ink: INK.extra }, 1);
  } else if (kind === 'water') {
    s.cone(0.16, 0.36, 10, { at: [0, 0.7, 0], color: body, ink: INK.body });
    s.ball(0.05, { at: [0.2, 0.74, 0], color: [0.8, 0.95, 1.0], ink: INK.top }, 1);
  } else if (kind === 'flower') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      s.ball(0.085, { at: [Math.cos(a) * 0.13, 0.64, Math.sin(a) * 0.13], scale: [1, 0.5, 1], color: [1.0, 0.75, 0.85], ink: INK.top }, 1);
    }
    s.ball(0.07, { at: [0, 0.67, 0], color: accent, ink: INK.extra }, 1);
  } else if (kind === 'wind') {
    s.cone(0.09, 0.3, 6, { at: [0.04, 0.7, -0.04], rot: [-0.5, 0, -0.4], color: accent, ink: INK.top });
    for (const x of [-1, 1]) s.cone(0.07, 0.28, 5, { at: [x * 0.32, 0.36, -0.08], rot: [0.3, 0, -x * 1.9], color: [0.95, 1, 1], ink: INK.extra });
  } else if (kind === 'ember') {
    s.cone(0.13, 0.36, 7, { at: [0, 0.7, 0], color: [1.0, 0.8, 0.25], shade: [1.0, 0.5, 0.15], ink: INK.top });
    s.cone(0.07, 0.2, 6, { at: [0.11, 0.62, 0.02], rot: [0, 0, -0.5], color: [1.0, 0.9, 0.4], shade: [1.0, 0.6, 0.2], ink: INK.top });
  }
  return s;
}

// ---- animals -----------------------------------------------------------------------------------------------------
const EYE = { color: [0.1, 0.08, 0.08], shade: [0.07, 0.06, 0.08], ink: 0.1 };
const eyes = (s, x, y, z, r = 0.028) => {
  for (const side of [-1, 1]) s.ball(r, { at: [side * x, y, z], ...EYE }, 1);
};

const animal = {
  rabbit() {
    const s = new Shape();
    const fur = [0.86, 0.76, 0.62];
    const white = [0.98, 0.96, 0.92];
    s.ball(0.24, { at: [0, 0.26, -0.04], scale: [0.85, 0.85, 1.2], color: fur, ink: 0.05 }, 3);
    s.ball(0.16, { at: [0, 0.46, 0.2], color: fur, ink: 0.07 }, 3);
    for (const side of [-1, 1]) {
      s.ball(0.15, { at: [side * 0.07, 0.74, 0.14], scale: [0.32, 1.25, 0.22], rot: [-0.2, 0, -side * 0.12], color: fur, ink: 0.14 }, 1);
      s.ball(0.07, { at: [side * 0.11, 0.06, 0.16], scale: [0.7, 0.6, 1.3], color: white, ink: 0.17 }, 1);
    }
    s.ball(0.085, { at: [0, 0.3, -0.33], color: white, ink: 0.2 }, 1);
    s.ball(0.03, { at: [0, 0.44, 0.355], color: [0.95, 0.6, 0.6], ink: 0.1 }, 0);
    eyes(s, 0.1, 0.5, 0.31);
    return s;
  },
  squirrel() {
    const s = new Shape();
    const fur = [0.78, 0.46, 0.22];
    const belly = [0.97, 0.9, 0.76];
    s.ball(0.17, { at: [0, 0.24, 0], scale: [0.85, 1.2, 0.85], color: fur, ink: 0.05 }, 3);
    s.ball(0.11, { at: [0, 0.22, 0.09], scale: [0.8, 1.2, 0.6], color: belly, ink: 0.05 }, 1);
    s.ball(0.125, { at: [0, 0.5, 0.06], color: fur, ink: 0.07 }, 3);
    for (const side of [-1, 1]) s.cone(0.04, 0.1, 4, { at: [side * 0.07, 0.63, 0.03], color: fur, ink: 0.14 });
    // the tail: most of a squirrel
    s.ball(0.15, { at: [0, 0.3, -0.24], scale: [0.8, 1.3, 0.8], color: fur, ink: 0.17 }, 2);
    s.ball(0.17, { at: [0, 0.58, -0.3], scale: [0.85, 1.1, 0.85], color: [0.86, 0.56, 0.28], ink: 0.2 }, 2);
    s.ball(0.022, { at: [0, 0.49, 0.185], color: [0.2, 0.12, 0.1], ink: 0.1 }, 0);
    eyes(s, 0.075, 0.54, 0.15, 0.024);
    return s;
  },
  deer() {
    const s = new Shape();
    const fur = [0.76, 0.52, 0.3];
    const white = [0.98, 0.94, 0.86];
    s.ball(0.42, { at: [0, 0.98, -0.05], scale: [0.62, 0.68, 1.3], color: fur, ink: 0.05 }, 3);
    s.ball(0.3, { at: [0, 0.86, -0.05], scale: [0.55, 0.5, 1.15], color: white, ink: 0.05 }, 1);
    s.cyl(0.11, 0.15, 0.6, 7, { at: [0, 1.36, 0.46], rot: [0.5, 0, 0], color: fur, ink: 0.07 });
    s.ball(0.15, { at: [0, 1.66, 0.64], scale: [0.85, 0.9, 1.25], color: fur, ink: 0.14 }, 2);
    s.ball(0.08, { at: [0, 1.61, 0.82], color: white, ink: 0.14 }, 1);
    s.ball(0.035, { at: [0, 1.63, 0.895], color: [0.15, 0.1, 0.1], ink: 0.1 }, 0);
    for (const side of [-1, 1]) {
      s.ball(0.1, { at: [side * 0.16, 1.78, 0.56], scale: [0.5, 1.1, 0.3], rot: [0, 0, -side * 0.7], color: fur, ink: 0.17 }, 1);
      s.cyl(0.018, 0.026, 0.3, 5, { at: [side * 0.07, 1.92, 0.58], rot: [0, 0, -side * 0.3], color: [0.9, 0.84, 0.7], ink: 0.2 });
      s.cyl(0.014, 0.018, 0.16, 5, { at: [side * 0.15, 2.02, 0.58], rot: [0, 0, -side * 1.0], color: [0.9, 0.84, 0.7], ink: 0.2 });
      for (const z of [-0.42, 0.34]) {
        s.cyl(0.045, 0.035, 0.8, 6, { at: [side * 0.15, 0.4, z], color: fur, ink: 0.17 });
        s.ball(0.045, { at: [side * 0.15, 0.03, z + 0.01], scale: [1, 0.7, 1.2], color: [0.25, 0.18, 0.14], ink: 0.2 }, 0);
      }
      for (let i = 0; i < 3; i++) s.ball(0.035, { at: [side * (0.2 + 0.03 * (i % 2)), 1.14 + 0.05 * (i % 2), -0.3 + i * 0.22], scale: [0.4, 1, 1], color: white, ink: 0.05 }, 0);
    }
    s.ball(0.07, { at: [0, 1.08, -0.6], color: white, ink: 0.2 }, 1);
    eyes(s, 0.115, 1.7, 0.72, 0.03);
    return s;
  },
  fox() {
    const s = new Shape();
    const fur = [0.95, 0.52, 0.2];
    const white = [0.99, 0.95, 0.88];
    const sock = [0.25, 0.17, 0.15];
    s.ball(0.27, { at: [0, 0.5, -0.05], scale: [0.72, 0.75, 1.35], color: fur, ink: 0.05 }, 3);
    s.ball(0.17, { at: [0, 0.44, 0.2], scale: [0.7, 0.8, 0.9], color: white, ink: 0.05 }, 1);
    s.ball(0.19, { at: [0, 0.78, 0.36], scale: [1.05, 0.9, 0.95], color: fur, ink: 0.07 }, 3);
    s.cone(0.1, 0.24, 6, { at: [0, 0.72, 0.58], rot: [Math.PI / 2, 0, 0], color: white, ink: 0.07 });
    s.ball(0.03, { at: [0, 0.73, 0.7], color: [0.12, 0.09, 0.09], ink: 0.1 }, 0);
    for (const side of [-1, 1]) {
      s.cone(0.075, 0.2, 4, { at: [side * 0.12, 1.0, 0.32], rot: [0, 0, -side * 0.2], color: fur, ink: 0.14 });
      for (const z of [-0.26, 0.2]) s.cyl(0.045, 0.04, 0.38, 6, { at: [side * 0.12, 0.19, z], color: sock, ink: 0.17 });
    }
    s.ball(0.17, { at: [0, 0.56, -0.52], scale: [0.75, 0.75, 1.7], rot: [-0.5, 0, 0], color: fur, ink: 0.2 }, 2);
    s.ball(0.11, { at: [0, 0.74, -0.76], color: white, ink: 0.14 }, 1);
    eyes(s, 0.1, 0.83, 0.5, 0.027);
    return s;
  },
  duck() {
    const s = new Shape();
    const white = [0.98, 0.97, 0.92];
    const bill = [1.0, 0.66, 0.2];
    s.ball(0.24, { at: [0, 0.32, -0.02], scale: [0.85, 0.78, 1.25], color: white, ink: 0.05 }, 3);
    s.cone(0.12, 0.22, 6, { at: [0, 0.42, -0.34], rot: [-1.0, 0, 0], color: white, ink: 0.05 });
    s.cyl(0.07, 0.09, 0.26, 7, { at: [0, 0.56, 0.16], rot: [0.25, 0, 0], color: white, ink: 0.07 });
    s.ball(0.12, { at: [0, 0.74, 0.2], color: [0.2, 0.5, 0.36], shade: [0.1, 0.28, 0.3], ink: 0.14 }, 2);
    s.ball(0.07, { at: [0, 0.71, 0.33], scale: [1, 0.45, 1.5], color: bill, ink: 0.17 }, 1);
    for (const side of [-1, 1]) {
      s.cyl(0.02, 0.02, 0.14, 5, { at: [side * 0.08, 0.07, 0.02], color: bill, ink: 0.17 });
      s.ball(0.05, { at: [side * 0.08, 0.015, 0.06], scale: [1, 0.3, 1.4], color: bill, ink: 0.2 }, 0);
      s.ball(0.15, { at: [side * 0.19, 0.35, -0.04], scale: [0.3, 0.6, 1.1], color: [0.9, 0.9, 0.86], ink: 0.2 }, 1);
    }
    eyes(s, 0.075, 0.78, 0.28, 0.022);
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
export const spiritGeometry = (kind, body, accent) => once(`s:${kind}`, () => spiritShape(kind, body, accent));

/** A flame: a few leaning cones, pointed up. Drawn with a glow paint, and made to flicker by whoever owns it. */
export function flameGeometry() {
  return once('flame', () => {
    const s = new Shape();
    s.cone(0.2, 0.62, 7, { at: [0, 0.31, 0] });
    s.cone(0.12, 0.42, 6, { at: [0.11, 0.21, 0.05], rot: [0.1, 0, -0.3] });
    s.cone(0.11, 0.36, 6, { at: [-0.1, 0.18, -0.06], rot: [-0.1, 0, 0.32] });
    return s;
  });
}
