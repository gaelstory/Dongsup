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
const log = (s, len, r, at, rot = [0, 0, 0], color = WOOD) => s.cyl(r, r, len, 12, { at, rot: [rot[0], rot[1], rot[2] + Math.PI / 2], color });

// ---- buildings ------------------------------------------------------------------------------------------------
const build = {
  campfire() {
    const s = new Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      s.ball(0.17 + 0.03 * (i % 3), { at: [Math.cos(a) * 0.52, 0.07, Math.sin(a) * 0.52], scale: [1, 0.7, 1], color: i % 2 ? STONE : STONE2 });
    }
    s.cyl(0.42, 0.45, 0.05, 12, { at: [0, 0.03, 0], color: [0.22, 0.2, 0.2] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      s.cyl(0.06, 0.07, 0.75, 12, { at: [Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16], rot: [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55], color: i % 2 ? BARK : WOOD });
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
    s.cyl(0.04, 0.04, H, 12, { at: [0, H / 2, D + 0.06], color: BARK });
    s.cyl(0.04, 0.04, H, 12, { at: [0, H / 2, -D - 0.06], color: BARK });
    return s;
  },
  bench() {
    const s = new Shape();
    s.cyl(0.24, 0.24, 1.6, 12, { at: [0, 0.42, 0], rot: [0, 0, Math.PI / 2], scale: [0.55, 1, 1], color: WOOD });
    s.box(1.58, 0.02, 0.4, { at: [0, 0.535, 0], color: CUT });
    for (const x of [-0.55, 0.55]) s.cyl(0.16, 0.18, 0.36, 12, { at: [x, 0.18, 0], color: BARK });
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
    s.cyl(0.055, 0.07, 2.05, 12, { at: [0, 1.02, 0], color: BARK });
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
    s.cyl(0.23, 0.23, 0.1, 12, { at: [0, 0.69, 0.95], rot: [Math.PI / 2, 0, 0], color: BARK });
    s.ball(0.035, { at: [0.13, 0.4, 1.01], color: LAMP });
    s.cyl(0.14, 0.14, 0.08, 12, { at: [0.68, 0.68, 0.66], rot: [Math.PI / 2, 0, 0.8], color: LAMP, shade: [0.9, 0.62, 0.3], ink: 1 });
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
        s.ball(0.1, { at: [x, 0.14 + h, z], scale: [1, 0.7, 1], color: heads[(i * 3 + j) % heads.length] }, 1);
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
          s.ball(0.065, { at: [x + Math.cos(a) * 0.42, up + 0.1, z + Math.sin(a) * 0.42], color: [0.45, 0.3, 0.86] }, 1);
        }
      }
    }
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) s.box(0.08, 0.7, 0.08, { at: [x, 0.35, z], color: WOOD });
    return s;
  },
  feeder() {
    const s = new Shape();
    s.cyl(0.06, 0.08, 1.1, 12, { at: [0, 0.55, 0], color: BARK });
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
    s.cyl(0.13, 0.1, 0.2, 12, { at: [0.15, 1.08, 0], color: WOOD });
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
    s.cyl(0.42, 0.34, 0.5, 12, { at: [0, 0.25, 0], color: [0.8, 0.62, 0.36] });
    s.add(new THREE.TorusGeometry(0.42, 0.045, 5, 12), { at: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0], color: [0.66, 0.48, 0.28] });
    s.add(new THREE.TorusGeometry(0.37, 0.03, 5, 12), { at: [0, 0.25, 0], rot: [Math.PI / 2, 0, 0], color: [0.66, 0.48, 0.28] });
    s.cyl(0.38, 0.38, 0.02, 12, { at: [0, 0.44, 0], color: DARK, shade: DARK });
    return s;
  },
  sign() {
    const s = new Shape();
    s.box(0.1, 1.5, 0.1, { at: [0, 0.75, 0], color: BARK });
    s.box(0.95, 0.42, 0.07, { at: [0, 1.32, 0.04], color: CUT });
    s.cone(0.1, 0.12, 4, { at: [0, 1.56, 0], rot: [0, Math.PI / 4, 0], color: BARK });
    s.quad([-0.3, 1.32, 0.08], [-0.1, 1.24, 0.08], [0.02, 1.36, 0.08], [-0.16, 1.44, 0.08], { color: LEAF });
    s.ball(0.07, { at: [0.2, 1.33, 0.08], scale: [1, 1, 0.3], color: RED }, 1);
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
    const c = [0.78, 0.76, 0.72];
    s.ball(0.3, { at: [0, 0.2, 0], scale: [1.1, 0.7, 1], rot: [0.2, 0.4, 0], color: c });
    s.ball(0.24, { at: [0.3, 0.16, 0.14], scale: [1, 0.7, 1.1], rot: [0, 1, 0.2], color: [0.7, 0.69, 0.68] });
    s.ball(0.2, { at: [-0.22, 0.14, 0.22], scale: [1, 0.7, 1], color: [0.72, 0.72, 0.72] });
    s.ball(0.2, { at: [0.06, 0.52, 0.04], scale: [1, 0.72, 1], rot: [0.1, 2, 0], color: c });
    s.ball(0.13, { at: [0.05, 0.74, 0.02], scale: [1, 0.75, 1], color: [0.84, 0.82, 0.78] });
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
    const c = [0.8, 0.52, 0.36];
    s.ball(0.45, { at: [0, 0.14, 0], scale: [1.1, 0.5, 1], color: c });
    s.ball(0.28, { at: [0.3, 0.2, 0.2], scale: [1, 0.6, 1], color: [0.72, 0.45, 0.31] });
    s.ball(0.2, { at: [-0.05, 0.36, -0.05], scale: [1, 0.6, 1], color: [0.86, 0.58, 0.42] });
    s.ball(0.12, { at: [-0.34, 0.12, 0.2], scale: [1, 0.6, 1], color: [0.76, 0.48, 0.34] });
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
    s.ball(0.03, { at: [0, 0.44, 0.355], color: [0.95, 0.6, 0.6], ink: 0.1 }, 1);
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
    s.ball(0.022, { at: [0, 0.49, 0.185], color: [0.2, 0.12, 0.1], ink: 0.1 }, 1);
    eyes(s, 0.075, 0.54, 0.15, 0.024);
    return s;
  },
  deer() {
    const s = new Shape();
    const fur = [0.76, 0.52, 0.3];
    const white = [0.98, 0.94, 0.86];
    s.ball(0.42, { at: [0, 0.98, -0.05], scale: [0.62, 0.68, 1.3], color: fur, ink: 0.05 }, 3);
    s.ball(0.3, { at: [0, 0.86, -0.05], scale: [0.55, 0.5, 1.15], color: white, ink: 0.05 }, 1);
    s.cyl(0.11, 0.15, 0.6, 12, { at: [0, 1.36, 0.46], rot: [0.5, 0, 0], color: fur, ink: 0.07 });
    s.ball(0.15, { at: [0, 1.66, 0.64], scale: [0.85, 0.9, 1.25], color: fur, ink: 0.14 }, 2);
    s.ball(0.08, { at: [0, 1.61, 0.82], color: white, ink: 0.14 }, 1);
    s.ball(0.035, { at: [0, 1.63, 0.895], color: [0.15, 0.1, 0.1], ink: 0.1 }, 1);
    for (const side of [-1, 1]) {
      s.ball(0.1, { at: [side * 0.16, 1.78, 0.56], scale: [0.5, 1.1, 0.3], rot: [0, 0, -side * 0.7], color: fur, ink: 0.17 }, 1);
      s.cyl(0.018, 0.026, 0.3, 12, { at: [side * 0.07, 1.92, 0.58], rot: [0, 0, -side * 0.3], color: [0.9, 0.84, 0.7], ink: 0.2 });
      s.cyl(0.014, 0.018, 0.16, 12, { at: [side * 0.15, 2.02, 0.58], rot: [0, 0, -side * 1.0], color: [0.9, 0.84, 0.7], ink: 0.2 });
      for (const z of [-0.42, 0.34]) {
        s.cyl(0.045, 0.035, 0.8, 12, { at: [side * 0.15, 0.4, z], color: fur, ink: 0.17 });
        s.ball(0.045, { at: [side * 0.15, 0.03, z + 0.01], scale: [1, 0.7, 1.2], color: [0.25, 0.18, 0.14], ink: 0.2 }, 1);
      }
      for (let i = 0; i < 3; i++) s.ball(0.035, { at: [side * (0.2 + 0.03 * (i % 2)), 1.14 + 0.05 * (i % 2), -0.3 + i * 0.22], scale: [0.4, 1, 1], color: white, ink: 0.05 }, 1);
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
    s.cone(0.1, 0.24, 12, { at: [0, 0.72, 0.58], rot: [Math.PI / 2, 0, 0], color: white, ink: 0.07 });
    s.ball(0.03, { at: [0, 0.73, 0.7], color: [0.12, 0.09, 0.09], ink: 0.1 }, 1);
    for (const side of [-1, 1]) {
      s.cone(0.075, 0.2, 4, { at: [side * 0.12, 1.0, 0.32], rot: [0, 0, -side * 0.2], color: fur, ink: 0.14 });
      for (const z of [-0.26, 0.2]) s.cyl(0.045, 0.04, 0.38, 12, { at: [side * 0.12, 0.19, z], color: sock, ink: 0.17 });
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
    s.cone(0.12, 0.22, 12, { at: [0, 0.42, -0.34], rot: [-1.0, 0, 0], color: white, ink: 0.05 });
    s.cyl(0.07, 0.09, 0.26, 12, { at: [0, 0.56, 0.16], rot: [0.25, 0, 0], color: white, ink: 0.07 });
    s.ball(0.12, { at: [0, 0.74, 0.2], color: [0.2, 0.5, 0.36], shade: [0.1, 0.28, 0.3], ink: 0.14 }, 2);
    s.ball(0.07, { at: [0, 0.71, 0.33], scale: [1, 0.45, 1.5], color: bill, ink: 0.17 }, 1);
    for (const side of [-1, 1]) {
      s.cyl(0.02, 0.02, 0.14, 12, { at: [side * 0.08, 0.07, 0.02], color: bill, ink: 0.17 });
      s.ball(0.05, { at: [side * 0.08, 0.015, 0.06], scale: [1, 0.3, 1.4], color: bill, ink: 0.2 }, 1);
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
