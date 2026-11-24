// HAEON Systems hero: a night smart harbor seen from the air, built in Three.js r186 (core only).
// Colors are authored as sRGB hex and used as-is (color management off, linear output),
// so the canvas blends exactly into the CSS night-blue around it.
import * as THREE from '../../assets/vendor/three/three.module.min.js';

THREE.ColorManagement.enabled = false;

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const HEX = {
  night: 0x0a1430, deep: 0x060c1f, dusk: 0x3a2e6b, cyan: 0x5fd4ff, warm: 0xffc98a, cool: 0x9fd4ff,
};
const C = (h) => new THREE.Color(h);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Geometry builder: merges many boxes/meshes into one non-indexed geometry (one draw call).
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  quad(a, b, c, d, nr, cl, uv) {
    const vs = [a, b, c, a, c, d];
    const us = uv ? [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]] : null;
    for (let i = 0; i < 6; i++) {
      this.p.push(vs[i][0], vs[i][1], vs[i][2]);
      this.n.push(nr[0], nr[1], nr[2]);
      this.c.push(cl.r, cl.g, cl.b);
      if (us) this.u.push(us[i][0], us[i][1]); else this.u.push(0, 0);
    }
  }
  // Box from y0 upward, centered on cx/cz, rotated by o.ry around its vertical axis.
  // o.uv(face, faceWidth, y0, y1) -> 4 uv pairs; o.top colors the roof; o.skip lists faces to omit.
  box(cx, y0, cz, sx, sy, sz, cl, o = {}) {
    const hx = sx / 2, hz = sz / 2, y1 = y0 + sy;
    const ry = o.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry);
    const T = (v) => [cx + v[0] * cs + v[2] * sn, v[1], cz - v[0] * sn + v[2] * cs];
    const R = (v) => [v[0] * cs + v[2] * sn, v[1], -v[0] * sn + v[2] * cs];
    const F = [
      [[[hx, y0, hz], [hx, y0, -hz], [hx, y1, -hz], [hx, y1, hz]], [1, 0, 0], sz],
      [[[-hx, y0, -hz], [-hx, y0, hz], [-hx, y1, hz], [-hx, y1, -hz]], [-1, 0, 0], sz],
      [[[-hx, y0, hz], [hx, y0, hz], [hx, y1, hz], [-hx, y1, hz]], [0, 0, 1], sx],
      [[[hx, y0, -hz], [-hx, y0, -hz], [-hx, y1, -hz], [hx, y1, -hz]], [0, 0, -1], sx],
      [[[-hx, y1, hz], [hx, y1, hz], [hx, y1, -hz], [-hx, y1, -hz]], [0, 1, 0], sx],
    ];
    F.forEach((f, i) => {
      if (o.skip && o.skip.includes(i)) return;
      const uv = o.uv ? o.uv(i, f[2], y0, y1) : null;
      this.quad(T(f[0][0]), T(f[0][1]), T(f[0][2]), T(f[0][3]), R(f[1]), i === 4 && o.top ? o.top : cl, uv);
    });
  }
  geom(g, m, cl) {
    const src = g.index ? g.toNonIndexed() : g;
    const gg = src.clone(); gg.applyMatrix4(m);
    const P = gg.attributes.position.array, N = gg.attributes.normal.array, Uv = gg.attributes.uv ? gg.attributes.uv.array : null;
    for (let i = 0; i < P.length / 3; i++) {
      this.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      this.n.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
      this.c.push(cl.r, cl.g, cl.b);
      if (Uv) this.u.push(Uv[i * 2], Uv[i * 2 + 1]); else this.u.push(0, 0);
    }
    gg.dispose(); if (src !== g) src.dispose();
  }
  // Merge a geometry that already carries vertex colors.
  geom2(g, m) {
    const gg = g.clone(); gg.applyMatrix4(m);
    const P = gg.attributes.position.array, N = gg.attributes.normal.array, Cc = gg.attributes.color.array;
    for (let i = 0; i < P.length; i++) { this.p.push(P[i]); this.n.push(N[i]); this.c.push(Cc[i]); }
    for (let i = 0; i < P.length / 3; i++) this.u.push(0, 0);
    gg.dispose();
  }
  // Square-section beam between two points.
  beam(a, b, t, cl) {
    const d = new V3().subVectors(b, a); const len = d.length();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
    m.compose(new V3().addVectors(a, b).multiplyScalar(0.5), q, new V3(1, 1, 1));
    const g = new THREE.BoxGeometry(t, len, t); this.geom(g, m, cl); g.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// Collects line segments for the digital-twin wireframe (one LineSegments draw call).
class Edges {
  constructor() { this.p = []; }
  seg(a, b) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  box(cx, y0, cz, sx, sy, sz, ry = 0) {
    const hx = sx / 2, hz = sz / 2, y1 = y0 + sy, cs = Math.cos(ry), sn = Math.sin(ry);
    const T = (x, y, z) => [cx + x * cs + z * sn, y, cz - x * sn + z * cs];
    const b = [T(-hx, y0, -hz), T(hx, y0, -hz), T(hx, y0, hz), T(-hx, y0, hz)];
    const t = [T(-hx, y1, -hz), T(hx, y1, -hz), T(hx, y1, hz), T(-hx, y1, hz)];
    for (let i = 0; i < 4; i++) { this.seg(b[i], b[(i + 1) % 4]); this.seg(t[i], t[(i + 1) % 4]); this.seg(b[i], t[i]); }
  }
  geom(g, m, angle = 30) {
    const e = new THREE.EdgesGeometry(g, angle); e.applyMatrix4(m);
    const a = e.attributes.position.array; for (let i = 0; i < a.length; i++) this.p.push(a[i]); e.dispose();
  }
}

// Point lights rendered as additive glow sprites (one Points draw call per set).
class Lights {
  constructor() { this.p = []; this.c = []; this.s = []; this.a = []; this.k = []; }
  add(x, y, z, hex, size, alpha = 1, kind = 0) {
    const cl = typeof hex === 'number' ? C(hex) : hex;
    this.p.push(x, y, z); this.c.push(cl.r, cl.g, cl.b); this.s.push(size); this.a.push(alpha); this.k.push(kind);
  }
  build(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(this.s, 1));
    g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(this.a, 1));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.k, 1));
    const pts = new THREE.Points(g, material); pts.frustumCulled = false; return pts;
  }
}

// Arc-length lookup table for a curve: fast evenly spaced positions and tangents.
function makeLUT(curve, n) {
  const pts = curve.getSpacedPoints(n);
  const P = new Float32Array((n + 1) * 3), T = new Float32Array((n + 1) * 3);
  for (let i = 0; i <= n; i++) {
    P[i * 3] = pts[i].x; P[i * 3 + 1] = pts[i].y; P[i * 3 + 2] = pts[i].z;
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const t = new V3().subVectors(b, a).normalize();
    T[i * 3] = t.x; T[i * 3 + 1] = t.y; T[i * 3 + 2] = t.z;
  }
  return { n, P, T, length: curve.getLength(), closed: !!curve.closed };
}
function lutAt(L, u, out, tan) {
  u = L.closed ? ((u % 1) + 1) % 1 : clamp01(u);
  const f = u * L.n, i = Math.min(L.n - 1, Math.floor(f)), k = f - i;
  for (let j = 0; j < 3; j++) {
    out[j] = L.P[i * 3 + j] + (L.P[(i + 1) * 3 + j] - L.P[i * 3 + j]) * k;
    if (tan) tan[j] = L.T[i * 3 + j] + (L.T[(i + 1) * 3 + j] - L.T[i * 3 + j]) * k;
  }
}
class PolyCurve extends THREE.Curve {
  constructor(points, closed) { super(); this.pts = points; this.closed = closed; }
  getPoint(t, target = new V3()) {
    const n = this.closed ? this.pts.length : this.pts.length - 1;
    const f = (this.closed ? ((t % 1) + 1) % 1 : clamp01(t)) * n;
    const i = Math.min(n - 1, Math.floor(f)), k = f - i;
    const a = this.pts[i], b = this.pts[(i + 1) % this.pts.length];
    return target.copy(a).lerp(b, k);
  }
}

// ---------------------------------------------------------------------------------------------
// Canvas textures

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// Curtain-wall windows: per floor a mood (dark / mixed / busy), lit windows in runs.
// Overall about 55% off, 30% warm, 15% cool. Column 0 of every cell is mullion (black), used for roofs.
function windowTexture(seed) {
  const W = 256, H = 256, cw = 8, ch = 8;
  const [cv, g] = canvas(W, H);
  const r = rng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  for (let f = 0; f < H / ch; f++) {
    const m = r(); const pLit = m < 0.27 ? 0.06 : m < 0.72 ? 0.42 : 0.86;
    const floorWarm = r() < 0.67;
    let run = 0, lit = false, warm = floorWarm;
    for (let c = 0; c < W / cw; c++) {
      if (run <= 0) { run = 1 + Math.floor(r() * 5); lit = r() < pLit; warm = r() < 0.86 ? floorWarm : !floorWarm; }
      run--;
      const x = c * cw, y = f * ch;
      if (lit) {
        const b = 0.5 + r() * 0.5;
        const rgb = warm ? [255, 201, 138] : [159, 212, 255];
        const gr = g.createLinearGradient(0, y + 1, 0, y + ch - 2);
        gr.addColorStop(0, `rgb(${rgb.map((v) => Math.round(v * b * 0.78)).join(',')})`);
        gr.addColorStop(1, `rgb(${rgb.map((v) => Math.round(v * b)).join(',')})`);
        g.fillStyle = gr;
      } else {
        g.fillStyle = r() < 0.2 ? 'rgb(14,22,44)' : 'rgb(5,8,17)';
      }
      g.fillRect(x + 1, y + 1, cw - 2, ch - 3);
    }
  }
  return cv;
}

function glowSpriteTexture() {
  const [cv, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return cv;
}

// ---------------------------------------------------------------------------------------------
// Layout (world units; y up; the camera looks from the south-west toward the north-east)

const LAND_Y = 0.6;
const LAND = [
  [-6, 19], [-6, -19], [-3.5, -24.5], [2, -27.5], [18, -30], [40, -31], [70, -33], [96, -33],
  [96, 30], [40, 30], [12, 28.5], [2, 26], [-3.5, 23.5],
];
const PIERS = [
  { z: 11.5, x1: -25, w: 2.6 },
  { z: -1.5, x1: -25, w: 2.6 },
  { z: -14, x1: -17, w: 2.2 },
];
const TOWERS = [
  { x: 14, z: -10, w: 4.6, d: 4.6, h: 10.2, top: { w: 3.3, d: 3.3, h: 5.2 }, crown: HEX.cyan, seed: 11 }, // tallest, 2-tier
  { x: 7.5, z: -3.5, w: 3.5, d: 3.0, h: 11.2, crown: null, seed: 23 },
  { x: 20.5, z: -2.5, w: 3.8, d: 3.8, h: 9.4, crown: HEX.warm, seed: 37, round: true },
  { x: 21.5, z: -16, w: 4.0, d: 3.2, h: 12.6, crown: HEX.cool, seed: 41 },
  { x: 8, z: -17.5, w: 3.2, d: 3.2, h: 7.2, crown: null, seed: 53 },
];
// Low-rise offices (with windows) and warehouses (solid).
const OFFICES = [
  [28, -24, 5, 3.4, 4.2], [33, -12, 4, 6, 3.6], [29, -4.5, 3.6, 3.2, 5.2], [37, 4, 6, 3.6, 2.8],
  [42, -21, 4.4, 4, 6.4], [49, -9, 5, 4, 4.6], [47, 3, 3.6, 5, 3.4], [56, -24, 6, 4, 5.4],
  [58, -10, 4, 6, 3.2], [64, -18, 5, 3.6, 4.4], [12.5, -25.5, 6, 2.6, 3], [3.5, -9.5, 2.8, 3.4, 4.4],
  [68, -4, 4.4, 4.4, 6], [74, -26, 6, 4, 3.6], [76, -12, 4, 5, 4.8],
];
const WAREHOUSES = [[40, 14, 9, 5, 2.2], [52, 13, 8, 6, 2.6], [64, 9, 7, 5, 2.4], [74, 4, 8, 5, 2.2], [55, 24, 10, 3.4, 1.8]];
const TERMINAL = { x0: 1.5, x1: 31.5, z: 16, w: 8 };
const CONTROL = { x: -3.4, z: -6.2 };
const PARKS = [
  [24, 6, 34, 10], [3, -27, 10, -22], [26, -19, 33, -14], [44, -3, 54, 0.5], [8, 20.5, 30, 23.5], [36, -30, 52, -27],
  [60, 14, 70, 18], [-4.5, 20, 3, 24],
];
const ROAD_PTS = [
  // waterfront boulevard: terminal forecourt, along the yard, up to the bridge head
  [[44, 25.5], [24, 25], [7, 23.5], [1.4, 18], [0.6, 6], [0.6, -8], [2.4, -19], [7, -25], [16, -27.6], [30, -29.6]],
  // avenue through the tower district toward the east
  [[0.6, 6], [10, 5.8], [24, 3.5], [36, -1], [50, -4.5], [70, -7], [96, -8]],
];
const BRIDGE_PTS = [[30, LAND_Y, -29.6], [28.6, 1.8, -36], [28, 4.0, -44], [31, 5.0, -51.5], [37.5, 4.3, -58.5], [43.5, 2.4, -63.5], [48, 1.0, -67.5], [51, LAND_Y, -72]];
const MAINLAND = [[24, -70], [34, -66], [56, -66], [90, -70], [140, -76], [230, -86], [420, -110], [1400, -300], [1400, -1600], [700, -1600], [230, -360], [120, -210], [62, -118], [36, -92], [26, -80]];

const CAMS = {
  desk: { pos: [-59, 29, 65.5], tgt: [-3, 5, -16.6], fov: 32 },
  mob: { pos: [-70, 90, 100], tgt: [12, 21, -12], fov: 50, hfov: 25 },
};

// Layout is shared with the build-time generator of the illustrated (no-WebGL) fallback.
export const LAYOUT = { LAND_Y, LAND, PIERS, TOWERS, OFFICES, WAREHOUSES, TERMINAL, CONTROL, PARKS, ROAD_PTS, BRIDGE_PTS, MAINLAND, CAMS };

// ---------------------------------------------------------------------------------------------

export function createHarbor(canvasEl, opts = {}) {
  const mobile = !!opts.mobile;
  const still = !!opts.still; // reduced motion or ?shot=1: compose one frame at t = 12s
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(HEX.night, 1);
  const maxDpr = mobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const FOG = 0.006;
  scene.fog = new THREE.FogExp2(HEX.night, FOG);
  const camera = new THREE.PerspectiveCamera(32, 1, 2, 4000);

  const U = {
    time: { value: 0 }, scale: { value: 800 }, fogD: { value: FOG }, twin: { value: 0 },
    camPos: { value: new V3() }, reveal: { value: still ? 1 : 0 }, dim: { value: 1 },
  };

  const tex = (cv, o = {}) => {
    const t = keep(new THREE.CanvasTexture(cv));
    t.wrapS = t.wrapT = o.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.anisotropy = aniso; t.needsUpdate = true; return t;
  };
  const glowTex = tex(glowSpriteTexture());

  const counts = {
    trees: mobile ? 100 : 220, containers: mobile ? 80 : 160, perCurve: mobile ? [3, 4, 5] : [6, 8, 10], seaLayers: mobile ? 1 : 2,
  };

  // ---- lights in the scene graph (moonlight + sky hemisphere)
  scene.add(new THREE.HemisphereLight(0x2a3a7a, HEX.deep, 2.4));
  const moon = new THREE.DirectionalLight(0x8fa8ff, 1.5); moon.position.set(-30, 40, 20); scene.add(moon);
  const moonFill = new THREE.DirectionalLight(0x6a5aa8, 0.5); moonFill.position.set(40, 20, -60); scene.add(moonFill);
  const flood = [[0, 7, 4, 0xffcf9a, 90, 26], [-15, 7, 5, 0xffd6a8, 60, 22], [14, 5, -9, 0x8fc8ff, 45, 18], [16, 5, 22, 0xffc58a, 60, 22]];
  for (const [x, y, z, c, i, d] of flood) { const pl = new THREE.PointLight(c, i, d, 2); pl.position.set(x, y, z); scene.add(pl); }

  // ---- shared materials
  const propsMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.25 }));
  const glowMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const winTex = tex(windowTexture(7), { wrap: true });
  const towerMat = keep(new THREE.MeshStandardMaterial({ color: 0x0e1b40, roughness: 0.55, metalness: 0.3, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1 }));
  const skyRefl = { value: 1 };
  towerMat.onBeforeCompile = (sh) => {
    sh.uniforms.uRefl = skyRefl;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    // A faint dusk-sky reflection that grows with height: glass reads as glass, not as black boxes.
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uRefl;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.rgb += uRefl * (vec3(0.020,0.030,0.070) * smoothstep(0.0, 16.0, vWP.y) + vec3(0.03,0.025,0.06) * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0));');
  };

  const site = new THREE.Group(); scene.add(site);
  const props = new Builder(), glows = new Builder(), buildings = new Builder(), edges = new Edges(), lines = [];
  const lights = new Lights(), halos = new Lights();
  const reflections = []; // [x, z, color, length, width, strength]
  const r = rng(20261124);

  // ---------------------------------------------------------------- land
  const shape = new THREE.Shape();
  const rounded = (pts, rad) => {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const a = new THREE.Vector2(p0[0] - p1[0], -(p0[1] - p1[1])).normalize();
      const b = new THREE.Vector2(p2[0] - p1[0], -(p2[1] - p1[1])).normalize();
      const s = new THREE.Vector2(p1[0] + a.x * rad, -p1[1] + a.y * rad);
      const e = new THREE.Vector2(p1[0] + b.x * rad, -p1[1] + b.y * rad);
      if (i === 0) shape.moveTo(s.x, s.y); else shape.lineTo(s.x, s.y);
      shape.quadraticCurveTo(p1[0], -p1[1], e.x, e.y);
    }
    shape.closePath();
  };
  rounded(LAND, 1.4);
  const landGeo = keep(new THREE.ExtrudeGeometry(shape, { depth: LAND_Y, bevelEnabled: false, curveSegments: 6 }));
  landGeo.rotateX(-Math.PI / 2);

  // land surface texture, baked lighting: yards, plazas, parks, parking, light pools, glowing quay edge
  const LB = { x0: -8, x1: 98, z0: -35, z1: 32 };
  const LW = 1024, LH = Math.round(1024 * (LB.z1 - LB.z0) / (LB.x1 - LB.x0));
  const [lcv, lg] = canvas(LW, LH);
  const px = (x) => (x - LB.x0) / (LB.x1 - LB.x0) * LW, pz = (z) => (z - LB.z0) / (LB.z1 - LB.z0) * LH;
  const ps = (s) => s / (LB.x1 - LB.x0) * LW;
  lg.fillStyle = '#0d1937'; lg.fillRect(0, 0, LW, LH);
  const rectW = (x0, z0, x1, z1, fill) => { lg.fillStyle = fill; lg.fillRect(px(x0), pz(z0), ps(x1 - x0), ps(z1 - z0)); };
  // container yard apron with lane grid
  rectW(-5.5, -13, 6.5, 19, '#0f1b3d');
  lg.strokeStyle = 'rgba(120,150,210,0.10)'; lg.lineWidth = 1;
  for (let x = -5; x < 6.5; x += 1.2) { lg.beginPath(); lg.moveTo(px(x), pz(-13)); lg.lineTo(px(x), pz(19)); lg.stroke(); }
  for (let z = -13; z < 19; z += 3.2) { lg.beginPath(); lg.moveTo(px(-5.5), pz(z)); lg.lineTo(px(6.5), pz(z)); lg.stroke(); }
  // tower plaza
  rectW(4, -21, 25, 1.5, '#101d42');
  lg.strokeStyle = 'rgba(160,190,240,0.07)';
  for (let x = 4; x < 25; x += 1.5) { lg.beginPath(); lg.moveTo(px(x), pz(-21)); lg.lineTo(px(x), pz(1.5)); lg.stroke(); }
  // terminal forecourt and parking
  rectW(0, 20.5, 36, 27.5, '#0e1a3b');
  lg.strokeStyle = 'rgba(160,190,240,0.12)';
  for (let x = 32; x < 46; x += 0.8) { lg.beginPath(); lg.moveTo(px(x), pz(17)); lg.lineTo(px(x), pz(19.5)); lg.stroke(); lg.beginPath(); lg.moveTo(px(x), pz(21)); lg.lineTo(px(x), pz(23.5)); lg.stroke(); }
  // parks
  for (const p of PARKS) rectW(p[0], p[1], p[2], p[3], '#0a1a27');
  // light pools: warm yard floods, cool plaza
  const pool = (x, z, rad, rgb, a) => {
    const gr = lg.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), ps(rad));
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    lg.fillStyle = gr; lg.fillRect(px(x) - ps(rad), pz(z) - ps(rad), ps(rad * 2), ps(rad * 2));
  };
  for (let z = -11; z < 19; z += 5.5) pool(0.5, z, 5.2, '255,214,170', 0.26);
  for (let z = -10; z < 19; z += 7) pool(-5, z, 3.2, '255,214,170', 0.18);
  for (let i = 0; i < 9; i++) pool(6 + i * 2.4, -20 + (i % 3) * 9, 3.2, '159,212,255', 0.07);
  for (let x = 3; x < 32; x += 4) pool(x, 21.5, 3, '255,201,138', 0.14);
  for (let i = 0; i < 26; i++) pool(26 + r() * 66, -30 + r() * 56, 2 + r() * 2.5, r() < 0.7 ? '255,201,138' : '159,212,255', 0.05 + r() * 0.07);
  // quay edge glow along the coastline
  lg.save(); lg.beginPath();
  LAND.forEach((p, i) => (i ? lg.lineTo(px(p[0]), pz(p[1])) : lg.moveTo(px(p[0]), pz(p[1]))));
  lg.closePath(); lg.strokeStyle = 'rgba(255,214,170,0.55)'; lg.lineWidth = 2.2; lg.stroke();
  lg.strokeStyle = 'rgba(255,201,138,0.12)'; lg.lineWidth = 9; lg.stroke(); lg.restore();
  const landTex = tex(lcv);
  // ExtrudeGeometry top uv = (x, -z); map onto the canvas (v=1 at z0, top row)
  landTex.repeat.set(1 / (LB.x1 - LB.x0), 1 / (LB.z1 - LB.z0));
  landTex.offset.set(-LB.x0 / (LB.x1 - LB.x0), (LB.z1) / (LB.z1 - LB.z0));
  const landTop = keep(new THREE.MeshBasicMaterial({ map: landTex }));
  const landSide = keep(new THREE.MeshBasicMaterial({ color: 0x0b1530 }));
  const land = new THREE.Mesh(landGeo, [landTop, landSide]); site.add(land);

  // mainland (far shore): flat, almost invisible except for its lights
  const ms = new THREE.Shape(MAINLAND.map((p) => new THREE.Vector2(p[0], -p[1])));
  const mGeo = keep(new THREE.ShapeGeometry(ms)); mGeo.rotateX(-Math.PI / 2); mGeo.translate(0, 0.35, 0);
  const mainland = new THREE.Mesh(mGeo, keep(new THREE.MeshBasicMaterial({ color: 0x0c1636 }))); site.add(mainland);
  // mainland city lights: denser near the coast, thinning inland, only where there is land
  const inMain = (x, z) => {
    let inside = false;
    for (let i = 0, j = MAINLAND.length - 1; i < MAINLAND.length; j = i++) {
      const [xi, zi] = MAINLAND[i], [xj, zj] = MAINLAND[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const coastZ = (x) => {
    const c = MAINLAND.slice(0, 7);
    for (let i = 0; i < c.length - 1; i++) if (x >= c[i][0] && x <= c[i + 1][0]) return c[i][1] + (c[i + 1][1] - c[i][1]) * (x - c[i][0]) / (c[i + 1][0] - c[i][0]);
    return c[c.length - 1][1];
  };
  for (let i = 0, placed = 0; i < 2400 && placed < (mobile ? 160 : 340); i++) {
    const x = 26 + Math.pow(r(), 1.15) * 380, z = coastZ(x) - 1.5 - Math.pow(r(), 1.7) * 140;
    if (!inMain(x, z)) continue;
    const warm = r() < 0.72; placed++;
    lights.add(x, 0.6, z, warm ? 0xffd2a0 : 0xa9d8ff, 0.2 + r() * 0.25, 0.45 + r() * 0.45);
  }
  for (let x = 27; x < 300; x += 2.2 + r() * 2) lights.add(x, 0.7, coastZ(x) - 1.2, 0xffd9ae, 0.26, 0.8);

  // high-mast floodlights over the yard
  for (let z = -10; z < 19; z += 7) {
    props.box(-5.2, LAND_Y, z, 0.12, 4.2, 0.12, C(0x5a6a98));
    for (const dx of [-0.25, 0.25]) lights.add(-5.2 + dx, LAND_Y + 4.25, z, 0xfff1dc, 0.16, 1);
    halos.add(-5.2, LAND_Y + 4.2, z, 0xffe2bc, 3.4, 0.2);
  }
  for (let z = -8; z < 18; z += 6.5) {
    props.box(3.6, LAND_Y, z, 0.12, 3.8, 0.12, C(0x5a6a98));
    lights.add(3.6, LAND_Y + 3.85, z, 0xfff1dc, 0.15, 1);
    halos.add(3.6, LAND_Y + 3.8, z, 0xffe2bc, 3, 0.16);
  }
  // ---------------------------------------------------------------- piers, cranes, containers
  const pierCol = C(0x17224a), pierTop = C(0x1b2a55);
  for (const p of PIERS) {
    const len = -6 - p.x1, cx = (-6 + p.x1) / 2;
    props.box(cx, -0.4, p.z, len, LAND_Y + 0.4 - 0.05, p.w, pierCol, { top: pierTop });
    edges.box(cx, 0, p.z, len, LAND_Y, p.w);
    for (let x = -7; x > p.x1; x -= 1.6) {
      lights.add(x, LAND_Y + 0.25, p.z - p.w / 2 + 0.12, 0xffd8a8, 0.13, 0.75);
      lights.add(x, LAND_Y + 0.25, p.z + p.w / 2 - 0.12, 0xffd8a8, 0.13, 0.75);
    }
    // a lit lamp at the pier head
    halos.add(p.x1 + 0.4, 1.8, p.z, HEX.warm, 2.4, 0.22);
    lights.add(p.x1 + 0.4, 1.8, p.z, 0xfff0dc, 0.22, 1);
    reflections.push([p.x1 + 0.4, p.z, C(HEX.warm), 7, 0.55, 0.5]);
    for (let x = -9; x > p.x1 + 2; x -= 5) reflections.push([x, p.z - p.w / 2 - 0.2, C(0xffd8a8), 3.5, 0.35, 0.28]);
  }

  // ship-to-shore gantry crane, built once and placed four times
  const craneB = new Builder(), craneE = new Edges();
  {
    const cc = C(0x6a7cae), dark = C(0x3a4878);
    const L = [[-1.15, -1.0], [1.15, -1.0], [-1.15, 1.0], [1.15, 1.0]];
    for (const [x, z] of L) craneB.box(x, 0, z, 0.2, 4.6, 0.2, cc);
    craneB.box(-1.15, 4.4, 0, 0.26, 0.3, 2.3, cc); craneB.box(1.15, 4.4, 0, 0.26, 0.3, 2.3, cc);
    craneB.box(0, 4.4, -1.0, 2.6, 0.3, 0.26, cc); craneB.box(0, 4.4, 1.0, 2.6, 0.3, 0.26, cc);
    craneB.box(0, 1.6, -1.0, 2.4, 0.16, 0.16, dark); craneB.box(0, 1.6, 1.0, 2.4, 0.16, 0.16, dark);
    // boom over the water (local +z) and back-reach
    craneB.box(-0.42, 4.95, 2.4, 0.22, 0.34, 11.5, cc); craneB.box(0.42, 4.95, 2.4, 0.22, 0.34, 11.5, cc);
    for (let z = -3; z < 8; z += 1.4) craneB.box(0, 4.95, z, 0.9, 0.08, 0.08, dark);
    craneB.box(0, 5.3, -2.4, 1.3, 0.9, 1.6, C(0x8a96bc));
    craneB.box(0, 4.55, 4.2, 0.9, 0.4, 0.8, dark);
    craneB.box(0, 3.0, 4.2, 1.2, 0.18, 0.5, C(0x6b5a48));
    // A-frame apex and stays
    const apexA = new V3(0, 8.0, -0.6);
    craneB.beam(new V3(-1.15, 4.6, -1.0), apexA, 0.16, cc); craneB.beam(new V3(1.15, 4.6, -1.0), apexA, 0.16, cc);
    craneB.beam(new V3(-1.15, 4.6, 1.0), apexA, 0.12, cc); craneB.beam(new V3(1.15, 4.6, 1.0), apexA, 0.12, cc);
    craneB.beam(apexA, new V3(0, 5.15, 8.0), 0.08, cc); craneB.beam(apexA, new V3(0, 5.15, -3.2), 0.08, cc);
  }
  const craneGeo = craneB.build();
  craneE.geom(craneGeo, new THREE.Matrix4(), 35);
  const CRANES = [
    { x: -11, z: 11.5, ry: Math.PI }, { x: -18.5, z: 11.5, ry: Math.PI },
    { x: -13.5, z: -1.5, ry: 0 }, { x: -20.5, z: -1.5, ry: 0 },
  ];
  for (const k of CRANES) {
    const m = new THREE.Matrix4().compose(new V3(k.x, LAND_Y, k.z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), k.ry), new V3(1, 1, 1));
    props.geom2(craneGeo, m);
    const sgn = Math.cos(k.ry) > 0 ? 1 : -1;
    lights.add(k.x, LAND_Y + 8.1, k.z - 0.6 * sgn, 0xffe4c4, 0.18, 1);
    lights.add(k.x, LAND_Y + 5.2, k.z + 8 * sgn, 0xffe4c4, 0.16, 0.9);
    lights.add(k.x - 0.4, LAND_Y + 4.7, k.z + 4.2 * sgn, 0xfff2e0, 0.2, 1);
    halos.add(k.x, LAND_Y + 4.6, k.z + 4.2 * sgn, 0xffe2b8, 3.2, 0.16);
    const v = new V3();
    for (let i = 0; i < craneE.p.length; i += 3) { v.set(craneE.p[i], craneE.p[i + 1], craneE.p[i + 2]).applyMatrix4(m); edges.p.push(v.x, v.y, v.z); }
  }
  craneGeo.dispose();

  // containers (InstancedMesh)
  const contGeo = keep(new THREE.BoxGeometry(1, 1, 1)); contGeo.translate(0, 0.5, 0);
  const [ccv, cg] = canvas(32, 32);
  cg.fillStyle = '#c8c8c8'; cg.fillRect(0, 0, 32, 32);
  for (let x = 0; x < 32; x += 3) { cg.fillStyle = 'rgba(0,0,0,0.28)'; cg.fillRect(x, 0, 1, 32); }
  cg.strokeStyle = 'rgba(0,0,0,0.5)'; cg.lineWidth = 2; cg.strokeRect(1, 1, 30, 30);
  const contMat = keep(new THREE.MeshStandardMaterial({ map: tex(ccv), roughness: 0.8, metalness: 0.15 }));
  const containers = new THREE.InstancedMesh(contGeo, contMat, counts.containers);
  const CONT_COLORS = [C(0x2c4a8c), C(0x24707c), C(0x94503c), C(0x3a5ca0), C(0x34808a)];
  let ci = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new V3(), pv = new V3();
  const placeContainer = (x, y, z, ry, colr) => {
    if (ci >= counts.containers) return false;
    q.setFromAxisAngle(new V3(0, 1, 0), ry); sv.set(0.5, 0.52, 2.4); pv.set(x, y, z);
    m4.compose(pv, q, sv); containers.setMatrixAt(ci, m4); containers.setColorAt(ci, colr);
    edges.box(x, y, z, 0.5, 0.52, 2.4, ry);
    ci++; return true;
  };
  // ship deck load first (fixed count), then the yard
  const shipDeck = [];
  {
    const yardStacks = [];
    for (let bx = -4.8; bx < 5.8; bx += 0.62) {
      if (Math.abs(bx - 0.6) < 1.35) continue; // drive lane (the waterfront road)
      for (let bz = -11; bz < 18; bz += 2.75) {
        if (Math.abs(bz - 5.5) < 1.2) continue;
        if (Math.hypot(bx - CONTROL.x, bz - CONTROL.z) < 2.9) continue; // control tower plot
        yardStacks.push([bx, bz]);
      }
    }
    // shuffle deterministically
    for (let i = yardStacks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [yardStacks[i], yardStacks[j]] = [yardStacks[j], yardStacks[i]]; }
    const deckCount = mobile ? 18 : 34;
    for (let i = 0; i < deckCount; i++) shipDeck.push(i);
    let need = counts.containers - deckCount;
    for (const [bx, bz] of yardStacks) {
      if (need <= 0) break;
      const h = 1 + Math.floor(r() * 3.2);
      const colr = CONT_COLORS[Math.floor(r() * CONT_COLORS.length)];
      for (let k = 0; k < h && need > 0; k++, need--) placeContainer(bx, LAND_Y + k * 0.53, bz, 0, colr);
    }
  }

  // ---------------------------------------------------------------- ships
  function hullGeometry(L, B, H) {
    const s = new THREE.Shape();
    s.moveTo(0, -B / 2); s.lineTo(L * 0.74, -B / 2);
    s.quadraticCurveTo(L * 0.96, -B * 0.42, L, 0);
    s.quadraticCurveTo(L * 0.96, B * 0.42, L * 0.74, B / 2);
    s.lineTo(0, B / 2); s.quadraticCurveTo(-0.25, B * 0.25, -0.25, 0); s.quadraticCurveTo(-0.25, -B * 0.25, 0, -B / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.translate(0, -0.35, 0);
    return g;
  }
  // Ship A: container ship moored on the north side of pier 1, bow toward the sea
  function shipInto(b, e, gl, o) {
    const { x, z, ry, L, B, kind } = o;
    const m = new THREE.Matrix4().compose(new V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(1, 1, 1));
    const H = 1.15;
    const hull = hullGeometry(L, B, H);
    b.geom(hull, m, C(kind === 'ferry' ? 0x3c4a74 : 0x1a2442)); e.geom(hull, m, 40); hull.dispose();
    const local = new Builder(), lg2 = new Builder();
    const deckY = H - 0.35;
    if (kind === 'container') {
      local.box(L * 0.1, deckY, 0, 1.6, 2.4, B * 0.86, C(0xb9c2d8), { top: C(0x8a94b0) });
      local.box(L * 0.1, deckY + 2.4, 0, 1.0, 0.5, B * 0.5, C(0x6a7698));
      lg2.box(L * 0.1 + 0.81, deckY + 1.5, 0, 0.02, 0.28, B * 0.8, C(0xffd9a6));
      lg2.box(L * 0.1 + 0.81, deckY + 0.9, 0, 0.02, 0.22, B * 0.8, C(0xc7955f));
    } else if (kind === 'tanker') {
      local.box(L * 0.1, deckY, 0, 1.8, 2.0, B * 0.84, C(0xaeb6cc), { top: C(0x7f89a6) });
      lg2.box(L * 0.1 + 0.91, deckY + 1.3, 0, 0.02, 0.26, B * 0.76, C(0xffd4a0));
      local.box(L * 0.55, deckY, 0, L * 0.7, 0.16, 0.3, C(0x5a6688));
      for (let i = 0; i < 4; i++) local.box(L * (0.3 + i * 0.15), deckY, 0, 0.9, 0.35, 0.9, C(0x4a5679));
    } else if (kind === 'ferry') {
      local.box(L * 0.42, deckY, 0, L * 0.66, 0.85, B * 0.86, C(0xd7deea), { top: C(0xaab4cc) });
      local.box(L * 0.38, deckY + 0.85, 0, L * 0.46, 0.7, B * 0.7, C(0xd7deea), { top: C(0xaab4cc) });
      local.box(L * 0.3, deckY + 1.55, 0, 0.5, 0.6, 0.5, C(0x8a94b0));
      for (const s of [-1, 1]) {
        lg2.box(L * 0.42, deckY + 0.36, s * (B * 0.43 + 0.01), L * 0.62, 0.18, 0.02, C(0xffe1b6));
        lg2.box(L * 0.38, deckY + 1.15, s * (B * 0.35 + 0.01), L * 0.42, 0.16, 0.02, C(0xffd29a));
      }
    } else {
      local.box(L * 0.12, deckY, 0, 1.2, 1.4, B * 0.8, C(0x8f9ab6));
      lg2.box(L * 0.12 + 0.61, deckY + 1.0, 0, 0.02, 0.2, B * 0.7, C(0xffd4a0));
    }
    const lgeo = local.build(); b.geom2(lgeo, m); e.geom(lgeo, m, 40); lgeo.dispose();
    const ggeo = lg2.build(); gl.geom2(ggeo, m); ggeo.dispose();
    return m;
  }
  const shipA = { x: -8.2, z: 8.7, ry: Math.PI, L: 15, B: 2.7, kind: 'container' };
  const shipB = { x: -9, z: 1.3, ry: Math.PI, L: 13, B: 2.5, kind: 'tanker' };
  const shipD = { x: 70, z: -190, ry: Math.PI * 0.82, L: 12, B: 2.2, kind: 'cargo' };
  const mA = shipInto(props, edges, glows, shipA);
  shipInto(props, edges, glows, shipB);
  shipInto(props, edges, glows, shipD);
  // deck containers on ship A
  {
    let k = 0; const total = shipDeck.length;
    for (let bay = 0; bay < 6 && k < total; bay++) {
      for (let row = 0; row < 3 && k < total; row++) {
        const tiers = 1 + ((bay + row) % 2);
        for (let tier = 0; tier < tiers && k < total; tier++, k++) {
          const lx = 2.2 + bay * 1.95, lz = (row - 1) * 0.62;
          const v = new V3(lx, 0.8 + tier * 0.53, lz).applyMatrix4(mA);
          placeContainer(v.x, v.y, v.z, Math.PI / 2 + shipA.ry, CONT_COLORS[(bay * 3 + row + tier) % CONT_COLORS.length]);
        }
      }
    }
  }
  containers.count = ci;
  containers.instanceMatrix.needsUpdate = true; if (containers.instanceColor) containers.instanceColor.needsUpdate = true;
  site.add(containers);
  // ship lights
  const shipLights = (o, list) => {
    const m = new THREE.Matrix4().compose(new V3(o.x, 0, o.z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), o.ry), new V3(1, 1, 1));
    for (const [lx, ly, lz, c, s, a] of list) {
      const v = new V3(lx, ly, lz).applyMatrix4(m);
      lights.add(v.x, v.y, v.z, c, s * 0.4, a);
      if (ly < 3.5) reflections.push([v.x, v.z, C(c), 4 + s * 4, 0.4, 0.3 * a]);
    }
  };
  halos.add(-15, 3.2, 8.7, 0xffe2bc, 4, 0.14); halos.add(-15.5, 3, 1.3, 0xffe2bc, 4, 0.12);
  shipLights(shipA, [[shipA.L * 0.3, 2.6, 0, 0xfff0dc, 0.4, 0.9], [shipA.L * 0.62, 2.6, 0, 0xfff0dc, 0.4, 0.9], [shipA.L - 0.3, 1.3, 0, 0xffffff, 0.4, 1], [1.2, 3.6, 0, 0xffffff, 0.45, 1], [shipA.L * 0.5, 1.0, 1.3, 0xffd8a8, 0.32, 0.8], [shipA.L * 0.75, 1.0, -1.3, 0xffd8a8, 0.32, 0.8]]);
  shipLights(shipB, [[shipB.L - 0.3, 1.3, 0, 0xffffff, 0.4, 1], [1.4, 3.2, 0, 0xffffff, 0.45, 1], [shipB.L * 0.5, 1.2, 0, 0xffd8a8, 0.3, 0.8]]);
  shipLights(shipD, [[shipD.L - 0.3, 1.2, 0, 0xffffff, 1.4, 1], [1, 2.4, 0, 0xffe0b8, 1.6, 1], [shipD.L * 0.5, 1.0, 0, 0xffd8a8, 1.2, 0.7]]);
  reflections.push([shipD.x, shipD.z, C(0xffe0b8), 30, 2.2, 0.5]);

  // ---------------------------------------------------------------- control tower (통합 관제)
  {
    const { x, z } = CONTROL; const b = LAND_Y;
    const sh = new THREE.CylinderGeometry(0.55, 0.85, 11, 16); sh.translate(0, b + 5.5, 0);
    const m = new THREE.Matrix4().makeTranslation(x, 0, z);
    props.geom(sh, m, C(0x34447a)); edges.geom(sh, m, 40); sh.dispose();
    const flare = new THREE.CylinderGeometry(1.5, 0.6, 1.0, 8); flare.translate(0, b + 11.4, 0);
    props.geom(flare, m, C(0x2c3a6a)); edges.geom(flare, m, 20); flare.dispose();
    const cab = new THREE.CylinderGeometry(2.05, 1.5, 1.55, 8, 1, true); cab.translate(0, b + 12.65, 0);
    glows.geom(cab, m, C(0x8fd8ff)); edges.geom(cab, m, 20); cab.dispose();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      const bot = new V3(x + Math.sin(a) * 1.5, b + 11.88, z + Math.cos(a) * 1.5), topP = new V3(x + Math.sin(a) * 2.07, b + 13.44, z + Math.cos(a) * 2.07);
      props.beam(bot, topP, 0.09, C(0x1a2448));
    }
    glows.geom((() => { const g = new THREE.CylinderGeometry(1.62, 1.62, 0.1, 8, 1, true); g.translate(0, b + 12.05, 0); return g; })(), m, C(0x2a5a7a));
    const roof = new THREE.CylinderGeometry(2.25, 2.1, 0.32, 8); roof.translate(0, b + 13.55, 0);
    props.geom(roof, m, C(0x22305c)); roof.dispose();
    const ant = new THREE.CylinderGeometry(0.05, 0.08, 1.8, 6); ant.translate(0, b + 14.6, 0);
    props.geom(ant, m, C(0x8090b8)); ant.dispose();
    // base building
    props.box(x - 0.3, b, z, 3.0, 1.5, 3.4, C(0x1d2a55), { top: C(0x24335f) });
    edges.box(x - 0.3, b, z, 3.0, 1.5, 3.4);
    glows.box(x - 0.3, b + 0.55, z + 1.71, 2.4, 0.28, 0.02, C(0xffcf96));
    reflections.push([x - 3.1, z, C(HEX.cyan), 12, 0.9, 0.55]);
  }

  // ---------------------------------------------------------------- towers and offices
  const CW = 0.42, FH = 0.4; // window column width, floor height (world units)
  const winUV = (seedU, seedV) => (face, w, y0, y1) => {
    if (face === 4) { const u0 = 0.5 / 256, v0 = 0.5 / 256; return [[u0, v0], [u0, v0], [u0, v0], [u0, v0]]; }
    const u0 = seedU + face * 7.3, u1 = u0 + w / CW / 32; // texture = 32 columns
    const v0 = seedV + y0 / FH / 32, v1 = seedV + y1 / FH / 32;
    return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  };
  const wuv = winUV;
  const TOWER_TOPS = [];
  TOWERS.forEach((t, i) => {
    const su = (t.seed * 0.137) % 1, sv2 = (t.seed * 0.291) % 1;
    const base = LAND_Y;
    // podium with a warm lobby band
    buildings.box(t.x, base, t.z, t.w + 1.2, 0.9, t.d + 1.2, C(0xffffff), { uv: wuv(su + 0.31, sv2 + 0.4) });
    glows.box(t.x, base + 0.15, t.z, t.w + 1.22, 0.32, t.d + 1.22, C(0xffc58a), { skip: [4] });
    if (t.round) {
      const rad = t.w / 2, hh = t.h - 0.9;
      const cyl = new THREE.CylinderGeometry(rad, rad, hh, 28, 1, true); cyl.translate(0, hh / 2, 0);
      // window uvs in world scale: u around the circumference, v by floor
      const uvA = cyl.attributes.uv.array, pA = cyl.attributes.position.array;
      for (let k = 0; k < uvA.length / 2; k++) { uvA[k * 2] = su + uvA[k * 2] * (TAU * rad) / CW / 32; uvA[k * 2 + 1] = sv2 + pA[k * 3 + 1] / FH / 32; }
      const cm = new THREE.Matrix4().makeTranslation(t.x, base + 0.9, t.z);
      buildings.geom(cyl, cm, C(0xffffff)); edges.geom(cyl, cm, 20); cyl.dispose();
      const cap = new THREE.CircleGeometry(rad, 28); cap.rotateX(-Math.PI / 2); cap.translate(t.x, base + t.h, t.z);
      const capUv = cap.attributes.uv.array; for (let k = 0; k < capUv.length; k++) capUv[k] = 0.5 / 256;
      buildings.geom(cap, new THREE.Matrix4(), C(0xffffff)); cap.dispose();
      edges.box(t.x, base, t.z, t.w + 1.2, 0.9, t.d + 1.2);
    } else {
      buildings.box(t.x, base + 0.9, t.z, t.w, t.h - 0.9, t.d, C(0xffffff), { uv: wuv(su, sv2) });
      edges.box(t.x, base, t.z, t.w + 1.2, 0.9, t.d + 1.2); edges.box(t.x, base + 0.9, t.z, t.w, t.h - 0.9, t.d);
    }
    let top = base + t.h, tw = t.w, td = t.d;
    if (t.top) {
      buildings.box(t.x, top, t.z, t.top.w, t.top.h, t.top.d, C(0xffffff), { uv: wuv(su + 0.5, sv2 + 0.25) });
      edges.box(t.x, top, t.z, t.top.w, t.top.h, t.top.d);
      // setback terrace lights
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) lights.add(t.x + dx * (t.w / 2 - 0.2), top + 0.15, t.z + dz * (t.d / 2 - 0.2), 0xfff0dc, 0.13, 0.9);
      top += t.top.h; tw = t.top.w; td = t.top.d;
    }
    // roof plant boxes
    props.box(t.x - tw * 0.18, top, t.z + td * 0.1, tw * 0.4, 0.45, td * 0.35, C(0x1a2650));
    props.box(t.x + tw * 0.22, top, t.z - td * 0.15, tw * 0.25, 0.3, td * 0.3, C(0x1a2650));
    if (t.crown && t.round) {
      const ring = new THREE.CylinderGeometry(tw / 2 + 0.03, tw / 2 + 0.03, 0.12, 28, 1, true); ring.translate(t.x, top - 0.18, t.z);
      glows.geom(ring, new THREE.Matrix4(), C(t.crown)); ring.dispose();
    } else if (t.crown) glows.box(t.x, top - 0.18, t.z, tw + 0.04, 0.12, td + 0.04, C(t.crown), { skip: [4] });
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) lights.add(t.x + dx * (tw / 2 - 0.12), top + 0.1, t.z + dz * (td / 2 - 0.12), i === 0 ? 0xffffff : 0xffe6c8, 0.13, 0.85);
    TOWER_TOPS.push(new V3(t.x, top, t.z));
  });
  // tallest tower mast
  {
    const t = TOWER_TOPS[0];
    const mast = new THREE.CylinderGeometry(0.06, 0.1, 1.6, 6); mast.translate(t.x, t.y + 0.8, t.z);
    props.geom(mast, new THREE.Matrix4(), C(0x8a9abf)); mast.dispose();
  }
  OFFICES.forEach((o, i) => {
    const [x, z, w, d, h] = o;
    buildings.box(x, LAND_Y, z, w, h, d, C(0xffffff), { uv: wuv((i * 0.173) % 1, (i * 0.37) % 1) });
    edges.box(x, LAND_Y, z, w, h, d);
    props.box(x + w * 0.1, LAND_Y + h, z, w * 0.3, 0.3, d * 0.3, C(0x18234b));
    if (i % 3 === 0) lights.add(x + w / 2 - 0.1, LAND_Y + h + 0.1, z + d / 2 - 0.1, 0xffe6c8, 0.12, 0.8);
  });
  // far shore skyline: low and mid-rise blocks along the coast, fogged into the night
  {
    const sr = rng(808);
    for (let i = 0, n = 0; i < 400 && n < (mobile ? 22 : 40); i++) {
      const x = 36 + sr() * 150, z = coastZ(x) - 3 - sr() * 26;
      if (!inMain(x - 3, z) || !inMain(x + 3, z - 3)) continue;
      const w = 2.5 + sr() * 3.5, d = 2.5 + sr() * 3.5, h = 2.5 + Math.pow(sr(), 2.2) * 12;
      buildings.box(x, 0.35, z, w, h, d, C(0xffffff), { uv: wuv(sr(), sr()) });
      if (sr() < 0.35) lights.add(x, 0.4 + h, z, 0xffe6c8, 0.22, 0.8);
      n++;
    }
  }
  WAREHOUSES.forEach((o) => {
    const [x, z, w, d, h] = o;
    props.box(x, LAND_Y, z, w, h, d, C(0x1c2850), { top: C(0x2a3a68) });
    edges.box(x, LAND_Y, z, w, h, d);
    glows.box(x, LAND_Y + 0.25, z + d / 2 + 0.01, w * 0.7, 0.35, 0.02, C(0xc99a6a));
    for (let k = 0; k < 3; k++) lights.add(x - w / 2 + (k + 0.5) * w / 3, LAND_Y + h - 0.2, z + d / 2 + 0.05, 0xffd4a0, 0.12, 0.8);
  });

  // ---------------------------------------------------------------- terminal (에너지 최적화)
  let TERMINAL_NODE, hallMat, roofMat;
  {
    const { x0, x1, z, w } = TERMINAL; const L = x1 - x0, cx = (x0 + x1) / 2; const b = LAND_Y;
    // glass hall lit from inside
    const [tcv, tg] = canvas(512, 64);
    const grd = tg.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, '#6b4a2c'); grd.addColorStop(0.55, '#e0a768'); grd.addColorStop(1, '#ffd29c');
    tg.fillStyle = grd; tg.fillRect(0, 0, 512, 64);
    const tr = rng(99);
    for (let x = 0; x < 512; x += 16) {
      tg.fillStyle = 'rgba(10,14,30,0.75)'; tg.fillRect(x, 0, 2, 64);
      if (tr() < 0.25) { tg.fillStyle = 'rgba(8,12,26,0.55)'; tg.fillRect(x + 2, 0, 14, 64); }
    }
    tg.fillStyle = 'rgba(10,14,30,0.8)'; tg.fillRect(0, 28, 512, 3);
    const termTex = tex(tcv); termTex.wrapS = THREE.RepeatWrapping;
    hallMat = keep(new THREE.MeshBasicMaterial({ map: termTex, color: 0xffffff }));
    const hallG = new Builder();
    hallG.box(cx, b, z, L, 2.1, w - 0.8, C(0xffffff), {
      uv: (face, fw) => [[0, 0], [fw / 8, 0], [fw / 8, 1], [0, 1]], skip: [4],
    });
    const hall = new THREE.Mesh(keep(hallG.build()), hallMat); site.add(hall);
    edges.box(cx, b, z, L, 2.1, w - 0.8);
    // arched roof: half cylinder flattened
    const [rcv, rg] = canvas(512, 128);
    rg.fillStyle = '#3c4c82'; rg.fillRect(0, 0, 512, 128);
    for (let y = 0; y < 128; y += 8) { rg.fillStyle = 'rgba(10,16,40,0.35)'; rg.fillRect(0, y, 512, 2); }
    for (let x = 0; x < 512; x += 32) { rg.fillStyle = 'rgba(10,16,40,0.5)'; rg.fillRect(x, 0, 3, 128); }
    rg.fillStyle = '#9fd4ff'; rg.fillRect(248, 0, 16, 128);
    const roofTex = tex(rcv);
    const [recv, reg] = canvas(512, 128);
    reg.fillStyle = '#000'; reg.fillRect(0, 0, 512, 128);
    reg.fillStyle = 'rgba(159,212,255,0.45)'; reg.fillRect(250, 0, 12, 128);
    for (let y = 2; y < 128; y += 8) { reg.fillStyle = 'rgba(190,230,255,0.9)'; reg.fillRect(251, y, 10, 4); }
    for (const x of [96, 416]) { reg.fillStyle = 'rgba(255,201,138,0.35)'; reg.fillRect(x, 0, 3, 128); }
    const roofEm = tex(recv);
    roofMat = keep(new THREE.MeshStandardMaterial({ map: roofTex, emissive: 0xffffff, emissiveMap: roofEm, emissiveIntensity: 0.9, roughness: 0.45, metalness: 0.45 }));
    const rad = w / 2 + 0.3;
    const roofGeo = keep(new THREE.CylinderGeometry(rad, rad, L + 1.2, 48, 1, true, 0, Math.PI));
    roofGeo.rotateZ(Math.PI / 2); // axis along x, arch over +y
    roofGeo.scale(1, 0.36, 1);
    roofGeo.translate(cx, b + 2.1, z);
    const roof = new THREE.Mesh(roofGeo, roofMat); site.add(roof);
    const rTmp = new THREE.CylinderGeometry(rad, rad, L + 1.2, 12, 1, true, 0, Math.PI);
    rTmp.rotateZ(Math.PI / 2); rTmp.scale(1, 0.36, 1); rTmp.translate(cx, b + 2.1, z);
    edges.geom(rTmp, new THREE.Matrix4(), 10); rTmp.dispose();
    // warm light bands along both roof edges
    glows.box(cx, b + 2.02, z + rad - 0.04, L + 1.2, 0.14, 0.1, C(0xffd29c));
    glows.box(cx, b + 2.02, z - rad + 0.04, L + 1.2, 0.14, 0.1, C(0xffd29c));
    // canopy columns at the forecourt
    for (let x = x0 + 1; x < x1; x += 3) props.box(x, b, z + rad + 0.2, 0.14, 2.1, 0.14, C(0x2a3866));
    TERMINAL_NODE = new V3(cx, b + 2.1 + rad * 0.36 + 0.05, z);
  }

  // ---------------------------------------------------------------- roads, bridge, street lights
  const roadCurves = ROAD_PTS.map((pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new V3(x, LAND_Y + 0.025, z)), false, 'centripetal'));
  const bridgeCurve = new THREE.CatmullRomCurve3(BRIDGE_PTS.map(([x, y, z]) => new V3(x, y + 0.025, z)), false, 'centripetal');
  const allRoads = [...roadCurves, bridgeCurve];
  const roadLUT = allRoads.map((c) => makeLUT(c, 400));
  {
    const [rcv2, rg2] = canvas(64, 64);
    rg2.fillStyle = '#111c3c'; rg2.fillRect(0, 0, 64, 64);
    rg2.fillStyle = 'rgba(190,205,240,0.35)'; rg2.fillRect(0, 2, 64, 2); rg2.fillRect(0, 60, 64, 2);
    rg2.fillStyle = 'rgba(255,214,160,0.45)'; rg2.fillRect(0, 31, 26, 2);
    const rtex = tex(rcv2, { wrap: true });
    const P = [], UV = [], idx = [];
    let base = 0;
    allRoads.forEach((curve, ci2) => {
      const L = roadLUT[ci2]; const half = ci2 === 2 ? 0.95 : 1.05;
      const v = [0, 0, 0], t = [0, 0, 0];
      for (let i = 0; i <= L.n; i++) {
        lutAt(L, i / L.n, v, t);
        const sx = -t[2], sz = t[0]; const sl = Math.hypot(sx, sz) || 1;
        P.push(v[0] + sx / sl * half, v[1], v[2] + sz / sl * half, v[0] - sx / sl * half, v[1], v[2] - sz / sl * half);
        const u = (i / L.n) * L.length / 3;
        UV.push(u, 0, u, 1);
        if (i < L.n) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      base += (L.n + 1) * 2;
    });
    const rg3 = keep(new THREE.BufferGeometry());
    rg3.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); rg3.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); rg3.setIndex(idx);
    const roads = new THREE.Mesh(rg3, keep(new THREE.MeshBasicMaterial({ map: rtex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    site.add(roads);
    // street lights both sides
    roadLUT.forEach((L, k) => {
      const step = k === 2 ? 2.4 : 2.6; const n = Math.floor(L.length / step);
      const v = [0, 0, 0], t = [0, 0, 0];
      for (let i = 0; i <= n; i++) {
        lutAt(L, i / n, v, t);
        const sx = -t[2], sz = t[0], sl = Math.hypot(sx, sz) || 1;
        const off = k === 2 ? 1.05 : 1.35;
        for (const s of [-1, 1]) {
          if (k !== 2 && (i + (s > 0 ? 0 : 1)) % 2) continue;
          const x = v[0] + sx / sl * off * s, z = v[2] + sz / sl * off * s;
          const cl = k === 2 ? 0xd8f0ff : 0xffd9a8;
          lights.add(x, v[1] + (k === 2 ? 0.35 : 0.55), z, cl, k === 2 ? 0.15 : 0.12, 0.9);
          if (k === 2 && v[1] > 1 && i % 2 === 0) reflections.push([x, z, C(cl), 5 + v[1], 0.4, 0.32]);
        }
      }
    });
    // bridge deck skirt, piers and pylon
    const bl = roadLUT[2]; const v = [0, 0, 0], t = [0, 0, 0], v2 = [0, 0, 0];
    for (let i = 0; i < bl.n; i += 2) {
      lutAt(bl, i / bl.n, v); lutAt(bl, (i + 2) / bl.n, v2, t);
      const sx = -t[2], sz = t[0], sl = Math.hypot(sx, sz) || 1;
      for (const s of [-1, 1]) {
        const ox = sx / sl * 0.95 * s, oz = sz / sl * 0.95 * s;
        const A = [v[0] + ox, v[1] - 0.45, v[2] + oz], B = [v2[0] + ox, v2[1] - 0.45, v2[2] + oz], Cq = [v2[0] + ox, v2[1], v2[2] + oz], D = [v[0] + ox, v[1], v[2] + oz];
        const nn = [sx / sl * s, 0, sz / sl * s];
        props.quad(A, B, Cq, D, nn, C(0x1d2a58)); props.quad(B, A, D, Cq, nn, C(0x1d2a58));
        // parapet light line: the bridge reads as one clean lit curve at night
        const ex = ox * 1.03, ez = oz * 1.03;
        const E0 = [v[0] + ex, v[1] + 0.02, v[2] + ez], E1 = [v2[0] + ex, v2[1] + 0.02, v2[2] + ez], E2 = [v2[0] + ex, v2[1] + 0.16, v2[2] + ez], E3 = [v[0] + ex, v[1] + 0.16, v[2] + ez];
        glows.quad(E0, E1, E2, E3, nn, C(0xbfe6ff)); glows.quad(E1, E0, E3, E2, nn, C(0xbfe6ff));
      }
    }
    for (let i = 1; i < 12; i++) {
      lutAt(bl, i / 12, v);
      if (v[1] < 1.2) continue;
      props.box(v[0], -0.3, v[2], 0.5, v[1] - 0.15, 0.5, C(0x223062));
      edges.box(v[0], 0, v[2], 0.5, v[1] - 0.45, 0.5);
    }
  }
  // bridge apex + pylon (node: 고가 곡선로 정점)
  let BRIDGE_NODE;
  {
    const bl = roadLUT[2]; let best = 0, by = -1; const v = [0, 0, 0];
    for (let i = 0; i <= bl.n; i++) { lutAt(bl, i / bl.n, v); if (v[1] > by) { by = v[1]; best = i; } }
    lutAt(bl, best / bl.n, v); const t = [0, 0, 0]; lutAt(bl, best / bl.n, v, t);
    const sx = -t[2], sz = t[0], sl = Math.hypot(sx, sz) || 1;
    const top = new V3(v[0], v[1] + 6.2, v[2]);
    for (const s of [-1, 1]) {
      const foot = new V3(v[0] + sx / sl * 1.25 * s, v[1] - 0.4, v[2] + sz / sl * 1.25 * s);
      props.beam(foot, top, 0.32, C(0x5a6a98));
      edges.seg(foot.toArray(), top.toArray());
    }
    // stay cables
    for (let k = 1; k <= 5; k++) {
      for (const dir of [-1, 1]) {
        const p = [0, 0, 0]; lutAt(bl, best / bl.n + dir * k * 0.028, p);
        lines.push(top.x, top.y - 0.3, top.z, p[0], p[1] + 0.1, p[2]);
      }
    }
    BRIDGE_NODE = top.clone().add(new V3(0, 0.35, 0));
  }

  // ---------------------------------------------------------------- trees
  {
    const tg2 = keep(new THREE.IcosahedronGeometry(0.36, 1)); tg2.translate(0, 0.34, 0);
    const tm = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, flatShading: true }));
    const trees = new THREE.InstancedMesh(tg2, tm, counts.trees);
    const spots = [];
    for (const p of PARKS) {
      const area = (p[2] - p[0]) * (p[3] - p[1]);
      const n = Math.round(area / 2.2);
      for (let i = 0; i < n; i++) spots.push([p[0] + 0.4 + r() * (p[2] - p[0] - 0.8), p[1] + 0.4 + r() * (p[3] - p[1] - 0.8)]);
    }
    roadLUT.slice(0, 2).forEach((L) => {
      const v = [0, 0, 0], t = [0, 0, 0];
      for (let u = 0.04; u < 0.98; u += 0.018) {
        lutAt(L, u, v, t); const sx = -t[2], sz = t[0], sl = Math.hypot(sx, sz) || 1;
        for (const s of [-1, 1]) spots.push([v[0] + sx / sl * 1.9 * s, v[2] + sz / sl * 1.9 * s]);
      }
    });
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const tc = new THREE.Color();
    let n = 0;
    for (const [x, z] of spots) {
      if (n >= counts.trees) break;
      if (x < -5.4) continue;
      if (x > -5.6 && x < 6.6 && z > -13.2 && z < 19.2) continue; // yard
      if (z > 11.6 && z < 20.6 && x > TERMINAL.x0 - 0.5 && x < TERMINAL.x1 + 0.5) continue;
      const s = 0.7 + r() * 0.65;
      m4.compose(new V3(x, LAND_Y, z), q.setFromAxisAngle(new V3(0, 1, 0), r() * TAU), new V3(s, s * (0.8 + r() * 0.4), s));
      trees.setMatrixAt(n, m4); tc.setHSL(0.44 + r() * 0.1, 0.38, 0.07 + r() * 0.05); trees.setColorAt(n, tc); n++;
    }
    trees.count = n; trees.instanceMatrix.needsUpdate = true; if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
    site.add(trees);
  }

  // ---------------------------------------------------------------- merge static meshes
  const propsGeo = keep(props.build());
  site.add(new THREE.Mesh(propsGeo, propsMat));
  const glowMesh = new THREE.Mesh(keep(glows.build()), glowMat); site.add(glowMesh);
  const buildMesh = new THREE.Mesh(keep(buildings.build()), towerMat); site.add(buildMesh);
  if (lines.length) {
    const lg4 = keep(new THREE.BufferGeometry()); lg4.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    site.add(new THREE.LineSegments(lg4, keep(new THREE.LineBasicMaterial({ color: 0x6a7cb0, transparent: true, opacity: 0.55 }))));
  }

  // ---------------------------------------------------------------- moving ferry
  const ferry = new THREE.Group(); scene.add(ferry);
  const FERRY_PATH = { a: new V3(84, 0, -42), b: new V3(-50, 0, -62), period: 300 };
  {
    const fb = new Builder(), fg = new Builder(), fe = new Edges();
    const o = { x: 0, z: 0, ry: 0, L: 9, B: 2.1, kind: 'ferry' };
    shipInto(fb, fe, fg, o);
    ferry.add(new THREE.Mesh(keep(fb.build()), propsMat));
    ferry.add(new THREE.Mesh(keep(fg.build()), glowMat));
    const fl = new Lights();
    fl.add(8.8, 1.3, 0, 0xffffff, 0.4, 1); fl.add(2.5, 3.2, 0, 0xffffff, 0.4, 1); fl.add(4.5, 1.6, 1.0, 0xffe1b6, 0.3, 0.9); fl.add(4.5, 1.6, -1.0, 0xffe1b6, 0.3, 0.9);
    ferry.userData.lights = fl;
    // wake: soft V of foam behind the stern
    const [wcv, wg] = canvas(128, 64);
    const wgr = wg.createLinearGradient(0, 0, 128, 0); wgr.addColorStop(0, 'rgba(200,225,255,0)'); wgr.addColorStop(1, 'rgba(200,225,255,0.55)');
    wg.fillStyle = wgr; wg.beginPath(); wg.moveTo(128, 26); wg.lineTo(0, 0); wg.lineTo(0, 10); wg.lineTo(128, 32); wg.lineTo(0, 54); wg.lineTo(0, 64); wg.lineTo(128, 38); wg.closePath(); wg.fill();
    const wake = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 6)), keep(new THREE.MeshBasicMaterial({ map: tex(wcv), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
    wake.rotation.x = -Math.PI / 2; wake.position.set(-7, 0.05, 0); ferry.add(wake);
    ferry.userData.edges = fe;
  }
  const ferryDir = new V3().subVectors(FERRY_PATH.b, FERRY_PATH.a).normalize();
  ferry.rotation.y = -Math.atan2(ferryDir.z, ferryDir.x);

  // ---------------------------------------------------------------- point lights material (static + ferry)
  const lightMat = keep(new THREE.ShaderMaterial({
    uniforms: { uScale: U.scale, uFog: U.fogD, uDim: U.dim, uTex: { value: glowTex } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale, uFog, uDim; varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        float s = aSize * uScale / d;
        vA = aAlpha * exp(-pow(uFog * 0.55 * d, 2.0)) * uDim * clamp(s / 1.4, 0.35, 1.0);
        gl_PointSize = clamp(s, 1.4, 7.0) * 4.0;
        vC = aColor;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying vec3 vC; varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;
        float core = smoothstep(0.27, 0.12, r);
        float halo = exp(-r * r * 9.0) * 0.38 + exp(-r * r * 3.0) * 0.06;
        float a = (core + halo) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.55) * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const haloMat = keep(new THREE.ShaderMaterial({
    uniforms: { uScale: U.scale, uFog: U.fogD, uDim: U.dim, uTex: { value: glowTex } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale, uFog, uDim; varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = min(aSize * uScale / d, 900.0);
        vA = aAlpha * exp(-pow(uFog * 0.5 * d, 2.0)) * uDim;
        vC = aColor;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying vec3 vC; varying float vA;
      void main(){
        float g = texture2D(uTex, gl_PointCoord).a; g = g * g;
        gl_FragColor = vec4(vC * g * vA, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  ferry.add(ferry.userData.lights.build(lightMat));

  // ---------------------------------------------------------------- orbits (the signature)
  const SITE_C = new V3(10, 0, -3);
  const NODES = [
    new V3(CONTROL.x, LAND_Y + 15.6, CONTROL.z), // 0 통합 관제: control tower beacon
    TERMINAL_NODE,                               // 1 에너지 최적화: terminal roof
    TOWER_TOPS[0].clone().add(new V3(0, 1.7, 0)),// 2 디지털 트윈: tallest tower
    new V3(PIERS[1].x1 + 0.6, LAND_Y + 0.35, PIERS[1].z), // 3 안전 모니터링: pier 2 head
    BRIDGE_NODE,                                 // 4 bridge apex
  ];
  const NODE_KEYS = { control: 0, energy: 1, twin: 2, safety: 3 };
  for (const nd of NODES) {
    halos.add(nd.x, nd.y, nd.z, HEX.cyan, 5.5, 0.32);
    lights.add(nd.x, nd.y, nd.z, 0xe8fbff, 0.3, 1);
  }
  reflections.push([NODES[3].x - 0.6, NODES[3].z, C(HEX.cyan), 9, 0.7, 0.6]);

  const ellipse = (cx, cy, cz, a, b, tiltDeg, yawDeg, n = 320) => {
    const pts = []; const tilt = THREE.MathUtils.degToRad(tiltDeg), yaw = THREE.MathUtils.degToRad(yawDeg);
    const qT = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), tilt);
    const qY = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const p = new V3(Math.cos(th) * a, 0, Math.sin(th) * b).applyQuaternion(qT).applyQuaternion(qY);
      pts.push(p.add(new V3(cx, cy, cz)));
    }
    return new PolyCurve(pts, true);
  };
  const arc = (A, B, lift) => {
    const pts = []; const d = A.distanceTo(B); const h = lift ?? d * 0.2 + 2;
    for (let i = 0; i <= 6; i++) { const s = i / 6; pts.push(new V3().lerpVectors(A, B, s).add(new V3(0, 4 * h * s * (1 - s), 0))); }
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  };
  const CURVES = [
    { c: ellipse(SITE_C.x, 4.5, SITE_C.z, 34, 21, 12, 18), speed: 1 / 26, links: [] },
    { c: ellipse(SITE_C.x + 2, 7, SITE_C.z - 1, 26, 17, -20, -30), speed: 1 / 20, links: [] },
    { c: ellipse(SITE_C.x + 3, 9, SITE_C.z - 2, 18, 13, 28, 52), speed: 1 / 14, links: [] },
    { c: arc(NODES[2], NODES[1]), speed: 1 / 16, links: [2, 1] },
    { c: arc(NODES[0], NODES[2]), speed: 1 / 18, links: [0, 2] },
    { c: arc(NODES[0], NODES[3], 4), speed: 1 / 15, links: [0, 3] },
    { c: arc(NODES[0], NODES[4], 3.5), speed: 1 / 17, links: [0, 4] },
  ];
  const NC = CURVES.length;
  const curveI = new Float32Array(NC).fill(1), curveIT = new Float32Array(NC).fill(1);
  const uCurveI = { value: curveI };
  {
    const P = [], N = [], UVs = [], INFO = [], IDX = [];
    let base = 0;
    CURVES.forEach((cv, k) => {
      for (const layer of [0, 1]) {
        const closed = !!cv.c.closed;
        const seg = closed ? 360 : 140;
        const g = new THREE.TubeGeometry(cv.c, seg, layer ? 0.16 : 0.035, layer ? 8 : 5, closed);
        const p = g.attributes.position.array, nn = g.attributes.normal.array, uv = g.attributes.uv.array, id = g.index.array;
        for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(nn[i]); }
        for (let i = 0; i < uv.length; i += 2) { UVs.push(uv[i], uv[i + 1]); INFO.push(k, layer); }
        for (let i = 0; i < id.length; i++) IDX.push(id[i] + base);
        base += p.length / 3; g.dispose();
      }
      cv.lut = makeLUT(cv.c, 600);
    });
    const og = keep(new THREE.BufferGeometry());
    og.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    og.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    og.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
    og.setAttribute('aInfo', new THREE.Float32BufferAttribute(INFO, 2));
    og.setIndex(IDX);
    const om = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uReveal: U.reveal, uCurveI: uCurveI, uFog: U.fogD, uColor: { value: C(HEX.cyan) }, uTwin: U.twin },
      vertexShader: `
        attribute vec2 aInfo; varying float vU, vLayer, vFog; varying float vCurve; varying vec3 vN, vV;
        uniform float uFog;
        void main(){
          vU = uv.x; vCurve = aInfo.x; vLayer = aInfo.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          vFog = exp(-pow(uFog * 0.45 * -mv.z, 2.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime, uReveal, uTwin; uniform float uCurveI[${NC}]; uniform vec3 uColor;
        varying float vU, vLayer, vFog; varying float vCurve; varying vec3 vN, vV;
        void main(){
          int ci = int(vCurve + 0.5);
          float rv = clamp(uReveal * 1.18 - vCurve * 0.025, 0.0, 1.0);
          if (vU > rv) discard;
          float ph = vCurve * 1.7;
          float wave = 0.5 + 0.5 * sin(vU * 6.2831 * (vCurve < 2.5 ? 2.0 : 1.0) + ph + uTime * 0.07);
          float vary = 0.25 + 0.75 * smoothstep(0.05, 0.95, wave);
          float facing = abs(dot(vN, vV));
          float a = vLayer < 0.5 ? 0.9 * (0.45 + 0.55 * facing) : 0.10 * facing * facing;
          a *= vary * uCurveI[ci] * vFog * (1.0 + uTwin * 0.25);
          float head = (1.0 - step(0.999, uReveal)) * smoothstep(0.05, 0.0, rv - vU);
          vec3 c = mix(uColor, vec3(1.0), head * 0.7 + (vLayer < 0.5 ? 0.12 : 0.0));
          gl_FragColor = vec4(c * (a + head * 0.6), 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const orbits = new THREE.Mesh(og, om); orbits.renderOrder = 5; site.add(orbits);
  }

  // particles on curves: bright head + 4 trailing points
  const TAIL = [[0, 0.5, 1], [0.004, 0.34, 0.55], [0.008, 0.26, 0.36], [0.012, 0.2, 0.22], [0.016, 0.15, 0.12]];
  const parts = [];
  CURVES.forEach((cv, k) => {
    const n = k < 3 ? counts.perCurve[2 - k] : counts.perCurve[0];
    for (let i = 0; i < n; i++) parts.push({ k, off: (i + r() * 0.35) / n, spd: cv.speed * (0.9 + r() * 0.2) });
  });
  const PN = parts.length * TAIL.length;
  const partPos = new Float32Array(PN * 3), partSize = new Float32Array(PN), partAlpha = new Float32Array(PN);
  const partGeo = keep(new THREE.BufferGeometry());
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3).setUsage(THREE.DynamicDrawUsage));
  partGeo.setAttribute('aSize', new THREE.BufferAttribute(partSize, 1));
  partGeo.setAttribute('aAlpha', new THREE.BufferAttribute(partAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const partMat = keep(new THREE.ShaderMaterial({
    uniforms: { uScale: U.scale, uColor: { value: C(HEX.cyan) }, uTex: { value: glowTex } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float s = aSize * uScale / -mv.z;
        gl_PointSize = max(s, 1.5) * 3.0;
        vA = aAlpha * clamp(s / 1.5, 0.3, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform sampler2D uTex; varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(0.26, 0.04, r);
        float halo = exp(-r * r * 7.0);
        vec3 c = mix(uColor, vec3(1.0), core);
        float a = (core * 0.95 + halo * 0.5) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(c * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const particles = new THREE.Points(partGeo, partMat); particles.frustumCulled = false; particles.renderOrder = 6; site.add(particles);

  // beacon rings: 5 nodes x 3 rings, expanding 1 -> 7 and fading 0.55 -> 0 every 3.6s
  const nodePhase = new Float32Array(5), nodeSpeed = new Float32Array(5).fill(1), nodeSpeedT = new Float32Array(5).fill(1);
  const uNodePhase = { value: nodePhase }, uRingA = { value: still ? 1 : 0 };
  {
    const quad = new THREE.PlaneGeometry(2, 2);
    const g = keep(new THREE.InstancedBufferGeometry());
    g.index = quad.index; g.setAttribute('position', quad.attributes.position);
    const data = new Float32Array(15 * 2);
    for (let i = 0; i < 15; i++) { data[i * 2] = Math.floor(i / 3); data[i * 2 + 1] = i % 3; }
    g.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 2)); g.instanceCount = 15;
    const rm = keep(new THREE.ShaderMaterial({
      uniforms: { uNodes: { value: NODES }, uPhase: uNodePhase, uColor: { value: C(HEX.cyan) }, uA: uRingA, uFog: U.fogD, uCurveI: uCurveI },
      vertexShader: `
        attribute vec2 aData; uniform vec3 uNodes[5]; uniform float uPhase[5]; uniform float uFog;
        varying vec2 vL; varying float vP, vFog; varying float vNode;
        const float RMAX = 4.4;
        void main(){
          int ni = int(aData.x + 0.5);
          float raw = uPhase[ni] - aData.y / 3.0;
          float p = fract(raw);
          vP = raw < 0.0 ? 1.0 : p; vL = position.xy; vNode = aData.x;
          vec3 wp = uNodes[ni] + vec3(position.x, 0.0, position.y) * RMAX;
          vec4 mv = viewMatrix * modelMatrix * vec4(wp, 1.0);
          vFog = exp(-pow(uFog * 0.45 * -mv.z, 2.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uA; varying vec2 vL; varying float vP, vFog, vNode;
        const float RMAX = 4.4;
        void main(){
          float r = length(vL) * RMAX;
          float rad = 0.6 * mix(1.0, 7.0, 1.0 - pow(1.0 - vP, 1.6));
          float w = 0.045 + 0.05 * vP;
          float ring = smoothstep(w, 0.0, abs(r - rad));
          float soft = smoothstep(w * 7.0, 0.0, abs(r - rad)) * 0.28;
          float fade = 0.55 * pow(1.0 - vP, 1.15) * smoothstep(0.0, 0.06, vP);
          float a = (ring + soft) * fade * uA * vFog;
          if (a < 0.002) discard;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), ring * 0.35) * a, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    const rings = new THREE.Mesh(g, rm); rings.frustumCulled = false; rings.renderOrder = 4; site.add(rings);
    quad.dispose();
  }

  // ---------------------------------------------------------------- road light trails (CPU ribbons)
  const TRAILS = 30, TSEG = 6;
  const trails = [];
  for (let i = 0; i < TRAILS; i++) {
    const road = i % 3; const dir = i % 2 ? 1 : -1;
    trails.push({ road, dir, off: r(), spd: 1 / (8 + r() * 4) * (road === 1 ? 0.75 : 1) });
  }
  const trailPos = new Float32Array(TRAILS * TSEG * 2 * 3), trailCol = new Float32Array(TRAILS * TSEG * 2 * 4);
  const trailIdx = [];
  for (let i = 0; i < TRAILS; i++) for (let s = 0; s < TSEG - 1; s++) { const a = (i * TSEG + s) * 2; trailIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const trailGeo = keep(new THREE.BufferGeometry());
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 4).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setIndex(trailIdx);
  const trailMat = keep(new THREE.ShaderMaterial({
    uniforms: { uFog: U.fogD, uDim: U.dim },
    vertexShader: `attribute vec4 color; varying vec4 vC; uniform float uFog;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vC = color; vC.a *= exp(-pow(uFog*0.5*-mv.z,2.0)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec4 vC; uniform float uDim; void main(){ gl_FragColor = vec4(vC.rgb * vC.a * uDim, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  const trailMesh = new THREE.Mesh(trailGeo, trailMat); trailMesh.frustumCulled = false; site.add(trailMesh);
  const TW = C(0xfff0d8), TC = C(0xbfefff);

  // ---------------------------------------------------------------- sea
  // light pool texture: city light spilled on the water around the complex
  const PR = { x: -70, z: -110, w: 200, h: 170 };
  const [pcv, pg] = canvas(256, 256);
  pg.fillStyle = '#000'; pg.fillRect(0, 0, 256, 256);
  const pxp = (x) => (x - PR.x) / PR.w * 256, pzp = (z) => (z - PR.z) / PR.h * 256;
  const blob = (x, z, rad, rgb, a) => {
    const gr = pg.createRadialGradient(pxp(x), pzp(z), 0, pxp(x), pzp(z), rad / PR.w * 256);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    pg.fillStyle = gr; pg.fillRect(0, 0, 256, 256);
  };
  blob(-8, 0, 22, '255,190,120', 0.16); blob(-10, 12, 14, '255,190,120', 0.14); blob(-9, -6, 12, '95,212,255', 0.13);
  blob(16, 34, 26, '255,190,120', 0.2); blob(-24, -1, 8, '95,212,255', 0.16); blob(12, -38, 18, '200,230,255', 0.1);
  blob(24, -60, 16, '200,230,255', 0.08); blob(60, -72, 40, '255,200,150', 0.08);
  for (const p of PIERS) blob(p.x1 + 2, p.z, 6, '255,200,150', 0.12);
  const poolTex = tex(pcv);
  const seaMat = keep(new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.time, uCam: U.camPos, uFog: U.fogD, uTwin: U.twin,
      uBase: { value: C(HEX.deep) }, uFogC: { value: C(HEX.night) }, uHorizon: { value: C(HEX.dusk) }, uCyan: { value: C(HEX.cyan) },
      uPool: { value: poolTex }, uPoolRect: { value: new THREE.Vector4(PR.x, PR.z, PR.w, PR.h) }, uLayers: { value: counts.seaLayers }, uLand: { value: 0 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime, uFog, uLayers, uTwin, uLand; uniform vec3 uCam, uBase, uFogC, uHorizon, uCyan; uniform sampler2D uPool; uniform vec4 uPoolRect;
      varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 V = uCam - vW; float dist = length(V); vec3 v = V / dist;
        vec2 p = vW.xz;
        float n1 = sin(p.x*0.09 + p.y*0.06 + uTime*0.13) + sin(p.x*0.045 - p.y*0.11 - uTime*0.09) + 0.5*sin(p.x*0.21 + uTime*0.2);
        float s1 = sin(dot(p, vec2(0.62, -0.78)) * 2.2 + n1 * 1.6 + uTime * 0.5);
        float s2 = sin(dot(p, vec2(0.78, 0.62)) * 0.42 + n1 * 1.3 - uTime * 0.21);
        float m1 = s1 * (0.5 + 0.5 * s2);
        float aa = clamp(fwidth(m1) * 2.0, 0.0, 1.0);
        float streak = smoothstep(0.62, 0.98, m1) * (1.0 - aa);
        if (uLayers > 1.5) {
          float s3 = sin(dot(p, vec2(0.45, -0.89)) * 3.1 - n1 * 1.4 - uTime * 0.37) * (0.5 + 0.5 * sin(dot(p, vec2(0.89, 0.45)) * 0.33 + uTime * 0.17));
          streak += 0.6 * smoothstep(0.7, 0.98, s3) * (1.0 - clamp(fwidth(s3) * 2.0, 0.0, 1.0));
        }
        float sFade = smoothstep(40.0, 85.0, dist) * (1.0 - smoothstep(150.0, 320.0, dist));
        vec3 col = uBase + uCyan * 0.08 * streak * sFade * (1.0 - uLand);
        float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 5.0);
        col = mix(col, uHorizon * 0.75, fres * 0.32 * (1.0 - uLand));
        vec2 puv = (p - uPoolRect.xy) / uPoolRect.zw;
        vec3 pool = texture2D(uPool, puv).rgb * step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
        col += pool * (0.7 + 0.3 * sin(n1 * 2.6 + uTime * 0.6) + streak * 0.8) * (1.0 - uLand);
        // digital twin: measured grid on the water
        vec2 gp = abs(fract(p / 4.0) - 0.5); float gl = smoothstep(0.03 + fwidth(p.x)*0.25, 0.0, min(gp.x, gp.y));
        col += uCyan * gl * 0.12 * uTwin * (1.0 - smoothstep(30.0, 140.0, dist));
        float f = 1.0 - exp(-pow(uFog * dist, 2.0));
        vec3 fogC = mix(uFogC, uHorizon, 0.06 + 0.22 * fres);
        col = mix(col, fogC, f);
        col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  const sea = new THREE.Mesh(keep(new THREE.PlaneGeometry(5000, 5000)), seaMat);
  // the far shore shares the water's haze so both melt into the same horizon
  const landHaze = keep(seaMat.clone());
  landHaze.uniforms = { ...seaMat.uniforms, uLand: { value: 1 }, uBase: { value: C(0x0c1636) }, uTwin: { value: 0 } };
  mainland.material = landHaze;
  sea.rotation.x = -Math.PI / 2; sea.renderOrder = -5; scene.add(sea);

  // reflection streaks under lights (instanced quads stretched toward the viewer)
  {
    const n = reflections.length;
    const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
    const g = keep(new THREE.InstancedBufferGeometry()); g.index = quad.index;
    g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
    const a1 = new Float32Array(n * 4), a2 = new Float32Array(n * 4);
    reflections.forEach((rf, i) => {
      a1.set([rf[0], rf[1], rf[3], rf[4]], i * 4);
      a2.set([rf[2].r, rf[2].g, rf[2].b, rf[5] || 0.25], i * 4);
    });
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(a1, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(a2, 4));
    g.instanceCount = n;
    const rm = keep(new THREE.ShaderMaterial({
      uniforms: { uCam: U.camPos, uTime: U.time, uFog: U.fogD, uDim: U.dim },
      vertexShader: `
        attribute vec4 aA; attribute vec4 aB; uniform vec3 uCam; uniform float uTime, uFog;
        varying vec2 vUv; varying vec4 vB; varying float vFog;
        void main(){
          vec2 base = aA.xy; vec2 toCam = normalize(uCam.xz - base); vec2 side = vec2(-toCam.y, toCam.x);
          float wob = sin(position.y * 9.0 + uTime * 1.3 + base.x) * 0.18;
          vec2 xz = base + toCam * position.y * aA.z + side * (position.x * aA.w * (0.6 + position.y * 0.8) + wob * position.y * aA.w);
          vec4 mv = viewMatrix * vec4(xz.x, 0.03, xz.y, 1.0);
          vFog = exp(-pow(uFog * 0.6 * -mv.z, 2.0));
          vUv = vec2(position.x + 0.5, position.y); vB = aB;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime, uDim; varying vec2 vUv; varying vec4 vB; varying float vFog;
        void main(){
          float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float a = pow(across, 2.0) * pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.08, vUv.y);
          a *= 0.55 + 0.45 * sin(vUv.y * 38.0 - uTime * 2.2 + vB.r * 10.0);
          a *= vB.a * vFog * uDim;
          if (a < 0.002) discard;
          gl_FragColor = vec4(vB.rgb * a, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    const refl = new THREE.Mesh(g, rm); refl.frustumCulled = false; refl.renderOrder = -4; scene.add(refl);
    quad.dispose();
  }

  // static lights + halos (after reflections so the arrays are complete)
  site.add(lights.build(lightMat));
  const haloPts = halos.build(haloMat); haloPts.renderOrder = 3; site.add(haloPts);

  // soft light haze over the complex (additive, no depth): the city glows into the night air
  const hazes = [];
  for (const [x, y, z, sx, sy, hex, op] of [[20, 7, -10, 110, 36, 0x4a5cb0, 0.2], [8, 3, 12, 70, 20, 0xffb47a, 0.07], [-8, 2, -2, 40, 14, 0x5fd4ff, 0.05]]) {
    const sm = keep(new THREE.SpriteMaterial({ map: glowTex, color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
    const sp = new THREE.Sprite(sm); sp.position.set(x, y, z); sp.scale.set(sx, sy, 1); sp.renderOrder = 8; site.add(sp);
    hazes.push([sm, op]);
  }

  // ---------------------------------------------------------------- twin wireframe + ground grid
  const edgeGeo = keep(new THREE.BufferGeometry()); edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges.p, 3));
  const edgeMat = keep(new THREE.LineBasicMaterial({ color: HEX.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat); edgeLines.visible = false; edgeLines.renderOrder = 7; site.add(edgeLines);
  const ferryEdgeGeo = keep(new THREE.BufferGeometry()); ferryEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ferry.userData.edges.p, 3));
  const ferryEdges = new THREE.LineSegments(ferryEdgeGeo, edgeMat); ferryEdges.visible = false; ferry.add(ferryEdges);
  const gridMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTwin: U.twin, uColor: { value: C(HEX.cyan) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTwin; uniform vec3 uColor; varying vec3 vW;
      void main(){
        vec2 p = vW.xz; vec2 g1 = abs(fract(p / 2.0) - 0.5) * 2.0; vec2 g2 = abs(fract(p / 10.0) - 0.5) * 2.0;
        vec2 fw = fwidth(p);
        float l1 = 1.0 - smoothstep(0.0, fw.x * 1.2, min(g1.x * 1.0, g1.y) );
        float m = min(g1.x, g1.y); float a1 = smoothstep(fw.x * 1.5 / 2.0 + 0.02, 0.0, m);
        float m2 = min(g2.x, g2.y); float a2 = smoothstep(fw.x * 1.5 / 10.0 + 0.012, 0.0, m2);
        float fade = 1.0 - smoothstep(30.0, 70.0, length(p - vec2(18.0, -2.0)));
        float a = (a1 * 0.22 + a2 * 0.5) * fade * uTwin;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const grid = new THREE.Mesh(keep(new THREE.PlaneGeometry(150, 150)), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.set(18, LAND_Y + 0.06, -2); grid.visible = false; grid.renderOrder = 2; site.add(grid);

  // ---------------------------------------------------------------- sky, stars, mountains
  const skyU = {
    uZenith: { value: C(HEX.deep) }, uBand: { value: C(HEX.dusk) }, uWarm: { value: C(0xd98a7a) },
    uSeaFar: { value: C(HEX.night).lerp(C(HEX.dusk), 0.28) }, uGlow: { value: new THREE.Vector2(0.9, -0.43).normalize() },
  };
  const skyMat = keep(new THREE.ShaderMaterial({
    uniforms: skyU, depthWrite: false, side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uZenith, uBand, uWarm, uSeaFar; uniform vec2 uGlow; varying vec3 vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vD); float el = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec2 dh = normalize(d.xz + 1e-5); float side = clamp(dot(dh, uGlow) * 0.5 + 0.5, 0.0, 1.0);
        float band = exp(-max(el, 0.0) / mix(1.7, 3.8, side * side));
        vec3 col = mix(uZenith, uBand * 1.12, band * mix(0.7, 1.0, side));
        col += uWarm * 0.16 * exp(-max(el, 0.0) / 0.7) * pow(side, 2.5);
        col = mix(uSeaFar, col, smoothstep(-0.25, 0.12, el));
        col += (hash(gl_FragCoord.xy) - 0.5) / 200.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(1600, 48, 24)), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  {
    const sp = [], sc = [];
    const sr = rng(60);
    for (let i = 0; i < 60; i++) {
      const az = THREE.MathUtils.degToRad(-50 + (sr() - 0.5) * 100), el = THREE.MathUtils.degToRad(1.4 + Math.pow(sr(), 2.0) * 12);
      sp.push(Math.cos(az) * Math.cos(el) * 1500, Math.sin(el) * 1500, Math.sin(az) * Math.cos(el) * 1500);
      const b = 0.35 + sr() * 0.6; sc.push(0.75 * b, 0.85 * b, b);
    }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const stars = new THREE.Points(g, keep(new THREE.PointsMaterial({ size: mobile ? 1.6 : 1.8, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.85, depthWrite: false })));
    stars.renderOrder = -9; stars.frustumCulled = false; sky.add(stars);
  }
  {
    // two ridgelines on large arcs around the viewpoint; the farther one is lighter (aerial perspective)
    const mb = new Builder();
    const layer = (R, hFn, top, bot, az0, az1, n) => {
      for (let i = 0; i < n; i++) {
        const a0 = THREE.MathUtils.degToRad(az0 + (az1 - az0) * i / n), a1 = THREE.MathUtils.degToRad(az0 + (az1 - az0) * (i + 1) / n);
        const h0 = hFn(i / n), h1 = hFn((i + 1) / n);
        const P = (a, y) => [-46 + Math.cos(a) * R, y, 58 + Math.sin(a) * R];
        const nr = [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)];
        const bb = [P(a0, -60), P(a1, -60), P(a1, h1), P(a0, h0)];
        // gradient: build two quads (lower haze to mid, mid to ridge)
        const mid0 = -2, mid1 = -2;
        mb.quad(P(a0, -60), P(a1, -60), P(a1, mid1), P(a0, mid0), nr, bot);
        const i0 = mb.c.length; mb.quad(P(a0, mid0), P(a1, mid1), P(a1, h1), P(a0, h0), nr, top);
        // bottom two vertices of the upper quad take the haze color
        const cA = mb.c; for (const k of [0, 1, 3]) { cA[i0 + k * 3] = bot.r; cA[i0 + k * 3 + 1] = bot.g; cA[i0 + k * 3 + 2] = bot.b; }
      }
    };
    const ridge = (seed, amp, base, sharp) => {
      const rr = rng(seed); const ph = [rr() * 9, rr() * 9, rr() * 9, rr() * 9];
      return (t, envelope) => {
        const x = t * 10;
        let h = Math.sin(x * 1.1 + ph[0]) * 0.5 + Math.sin(x * 2.3 + ph[1]) * 0.28 + Math.sin(x * 5.1 + ph[2]) * 0.14
          + (Math.abs(Math.sin(x * 9.7 + ph[3])) - 0.5) * 0.1 * sharp + Math.sin(x * 23.0 + ph[0] * 2.0) * 0.035 + Math.sin(x * 41.0 + ph[1]) * 0.018;
        return base + amp * (0.55 + 0.45 * h);
      };
    };
    const back = ridge(5, 56, 16, 1), front = ridge(9, 38, 6, 1.4);
    const env = (t, lo, hi) => smooth(lo, hi, t);
    // azimuth -100..20 degrees covers the view; left part (-100..-72) stays low so the open sea shows
    layer(1250, (t) => back(t) * (0.3 + 0.7 * env(t, 0.1, 0.45)) + 10, C(0x2a2a5e), C(0x3b3272), -100, 20, 360);
    layer(980, (t) => front(t) * (0.15 + 0.85 * env(t, 0.22, 0.55)) + 4, C(0x161b42), C(0x2b2864), -100, 20, 400);
    const mg = keep(mb.build());
    const mtn = new THREE.Mesh(mg, keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
    mtn.renderOrder = -8; scene.add(mtn);
  }

  // ---------------------------------------------------------------- camera rig
  const rig = {
    pos: new V3(), tgt: new V3(), fov: 32,
    pointer: new THREE.Vector2(), pointerS: new THREE.Vector2(),
    scroll: 0, focus: -1, focusAmt: 0, focusNode: new V3(), twin: 0, twinT: 0,
  };
  // portrait heroes (phones, upright tablets) put the text on top and frame the complex below it
  const isMobileView = () => window.innerWidth < 768 || canvasEl.clientWidth < canvasEl.clientHeight * 0.95;
  function applyCamBase() {
    const cfg = isMobileView() ? CAMS.mob : CAMS.desk;
    rig.hfov = cfg.hfov || 26;
    rig.pos.fromArray(cfg.pos); rig.tgt.fromArray(cfg.tgt); rig.fov = cfg.fov;
  }
  applyCamBase();
  const tgtV = new V3(), tmpV = new V3(), tmpV2 = new V3(), fwdV = new V3(), rightV = new V3(), upV = new V3();
  function placeCamera(t) {
    const mob = isMobileView();
    const drift = still ? 0 : Math.sin((t / 40) * TAU);
    const amp = mob ? 1.5 : 1;
    // orbit about target: azimuth +/-2deg, height +/-0.6
    tmpV.subVectors(rig.pos, rig.tgt);
    tmpV.applyAxisAngle(new V3(0, 1, 0), THREE.MathUtils.degToRad(2 * amp) * drift);
    const pos = tmpV2.copy(rig.tgt).add(tmpV); pos.y += 0.6 * amp * Math.cos((t / 40) * TAU) * (still ? 0 : 1);
    const tgt = tgtV.copy(rig.tgt);
    // focus on a node: move a little closer and turn toward it (stays within ~15% of the framing)
    if (rig.focusAmt > 0.0001) {
      const f = rig.focusAmt;
      pos.lerp(tmpV.copy(rig.focusNode), 0.1 * f);
      tgt.lerp(rig.focusNode, 0.2 * f);
    }
    // scroll: rise 8 units and lean forward
    const s = rig.scroll;
    fwdV.subVectors(tgt, pos).setY(0).normalize();
    pos.y += 8 * s; tgt.addScaledVector(fwdV, 6 * s); tgt.y -= 2.5 * s;
    // pointer parallax (desktop only)
    if (!mob && !still) {
      fwdV.subVectors(tgt, pos).normalize();
      rightV.crossVectors(fwdV, new V3(0, 1, 0)).normalize(); upV.crossVectors(rightV, fwdV).normalize();
      pos.addScaledVector(rightV, rig.pointerS.x * 1.4).addScaledVector(upV, -rig.pointerS.y * 1.4 * 0.6);
    }
    camera.position.copy(pos); camera.lookAt(tgt);
    U.camPos.value.copy(pos);
    sky.position.copy(pos);
  }

  let W = 1, H = 1;
  function resize() {
    const rect = canvasEl.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(W, H, false);
    applyCamBase();
    const aspect = W / H;
    // keep the horizontal framing on narrower screens
    let fov = rig.fov;
    if (isMobileView()) {
      // phones: keep a fixed horizontal field of view whatever the hero height is
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(rig.hfov / 2)) / aspect));
    } else if (aspect < 1.6) {
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 1.6 / aspect));
    }
    camera.fov = Math.min(fov, 75); camera.aspect = aspect; camera.updateProjectionMatrix();
    const dbH = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    U.scale.value = dbH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }

  // ---------------------------------------------------------------- per-frame update
  const pv3 = [0, 0, 0], tv3 = [0, 0, 0], camLocal = new V3();
  const ferryL = new V3();
  function update(t, dt) {
    U.time.value = t;
    const k = 1 - Math.exp(-dt / 0.38);
    rig.focusAmt += ((rig.focus >= 0 ? 1 : 0) - rig.focusAmt) * k;
    rig.pointerS.lerp(rig.pointer, 1 - Math.pow(0.95, dt * 60));
    for (let i = 0; i < NC; i++) curveI[i] += (curveIT[i] - curveI[i]) * k;
    for (let i = 0; i < 5; i++) {
      nodeSpeed[i] += (nodeSpeedT[i] - nodeSpeed[i]) * k;
      nodePhase[i] += (dt / 3.6) * nodeSpeed[i];
    }
    // twin blend
    rig.twin += (rig.twinT - rig.twin) * (still ? 1 : 1 - Math.exp(-dt / 0.22));
    const tw = rig.twin; U.twin.value = tw;
    towerMat.emissiveIntensity = 1 - tw * 0.9; towerMat.color.setRGB(0.055 * (1 - tw * 0.5), 0.106 * (1 - tw * 0.5), 0.25 * (1 - tw * 0.4));
    skyRefl.value = 1 - tw;
    roofMat.emissiveIntensity = 0.9 * (1 - tw * 0.7);
    glowMat.color.setScalar(1 - tw * 0.75);
    propsMat.color.setScalar(1 - tw * 0.55);
    contMat.color.setScalar(1 - tw * 0.6);
    hallMat.color.setScalar(1 - tw * 0.8);
    landTop.color.setScalar(1 - tw * 0.45);
    U.dim.value = 1 - tw * 0.55;
    for (const [sm, op] of hazes) sm.opacity = op * (1 - tw * 0.6);
    edgeMat.opacity = tw * 0.85; edgeLines.visible = tw > 0.01; ferryEdges.visible = edgeLines.visible; grid.visible = tw > 0.01;

    placeCamera(t);

    // ferry
    const fp = ((t + 70) / FERRY_PATH.period) % 1;
    ferryL.lerpVectors(FERRY_PATH.a, FERRY_PATH.b, fp);
    ferry.position.copy(ferryL); ferry.position.y = Math.sin(t * 0.8) * 0.03;
    const fvis = smooth(0, 0.06, fp) * (1 - smooth(0.94, 1, fp));
    ferry.visible = fvis > 0.02; ferry.scale.setScalar(0.85 + 0.15 * fvis);

    // particles along the orbits, hidden where the line is not drawn yet
    let pi = 0;
    const reveal = U.reveal.value;
    for (const p of parts) {
      const cv = CURVES[p.k];
      const head = p.off + t * p.spd;
      const lim = clamp01(reveal * 1.18 - p.k * 0.025);
      for (let j = 0; j < TAIL.length; j++) {
        const u = head - TAIL[j][0] * (cv.c.closed ? 1 : 1.8);
        const uu = cv.c.closed ? ((u % 1) + 1) % 1 : ((u % 1) + 1) % 1;
        lutAt(cv.lut, uu, pv3);
        partPos[pi * 3] = pv3[0]; partPos[pi * 3 + 1] = pv3[1]; partPos[pi * 3 + 2] = pv3[2];
        partSize[pi] = TAIL[j][1];
        let a = TAIL[j][2] * curveI[p.k];
        if (uu > lim) a = 0;
        if (!cv.c.closed) a *= smooth(0, 0.05, uu) * (1 - smooth(0.95, 1, uu));
        partAlpha[pi] = a;
        pi++;
      }
    }
    partGeo.attributes.position.needsUpdate = true; partGeo.attributes.aAlpha.needsUpdate = true; partGeo.attributes.aSize.needsUpdate = true;

    // road light trails: camera-facing ribbons, warm one way and pale cyan the other
    camLocal.copy(camera.position);
    let vi = 0;
    for (const tr of trails) {
      const L = roadLUT[tr.road];
      const head = ((tr.off + t * tr.spd * tr.dir) % 1 + 1) % 1;
      const col = tr.dir > 0 ? TW : TC;
      for (let s = 0; s < TSEG; s++) {
        const f = s / (TSEG - 1); // 0 tail .. 1 head
        const u = head - tr.dir * 0.015 * (1 - f);
        lutAt(L, u, pv3, tv3);
        const lane = 0.36 * tr.dir;
        const sx = -tv3[2], sz = tv3[0], sl = Math.hypot(sx, sz) || 1;
        const x = pv3[0] + sx / sl * lane, y = pv3[1] + 0.08, z = pv3[2] + sz / sl * lane;
        // ribbon width perpendicular to tangent and view
        const vx = camLocal.x - x, vy = camLocal.y - y, vz = camLocal.z - z;
        let wx = tv3[1] * vz - tv3[2] * vy, wy = tv3[2] * vx - tv3[0] * vz, wz = tv3[0] * vy - tv3[1] * vx;
        const wl = Math.hypot(wx, wy, wz) || 1; const w = 0.12 * (0.3 + 0.7 * f);
        wx = wx / wl * w; wy = wy / wl * w; wz = wz / wl * w;
        const o = vi * 3;
        trailPos[o] = x + wx; trailPos[o + 1] = y + wy; trailPos[o + 2] = z + wz;
        trailPos[o + 3] = x - wx; trailPos[o + 4] = y - wy; trailPos[o + 5] = z - wz;
        const edgeFade = smooth(0, 0.04, u) * (1 - smooth(0.96, 1, u));
        const a = Math.pow(f, 1.3) * 1.25 * edgeFade;
        for (let q2 = 0; q2 < 2; q2++) { const c4 = (vi + q2) * 4; trailCol[c4] = col.r; trailCol[c4 + 1] = col.g; trailCol[c4 + 2] = col.b; trailCol[c4 + 3] = a; }
        vi += 2;
      }
    }
    trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- loop control
  let running = false, raf = 0, last = 0, time = 0, firstFrame = false, inView = true, pageVisible = !document.hidden;
  let introStart = -1;
  const INTRO_DELAY = 0.35, INTRO_DRAW = 1.2;
  function renderOnce(t) {
    update(t, 1 / 60);
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; opts.onReady && opts.onReady(); }
  }
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    time += dt;
    if (introStart < 0 && firstFrame) introStart = now;
    if (introStart >= 0 && uRingA.value < 1) {
      const it = (now - introStart) / 1000 - INTRO_DELAY;
      U.reveal.value = clamp01(it / INTRO_DRAW);
      uRingA.value = clamp01((it - INTRO_DRAW) / 0.3);
      if (it < INTRO_DRAW) for (let i = 0; i < 5; i++) nodePhase[i] = -i * 0.09;
    }
    update(time, dt);
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; opts.onReady && opts.onReady(); }
  }
  function start() {
    if (still || running || !inView || !pageVisible) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const io = new IntersectionObserver((es) => { inView = es[0].isIntersecting; inView ? start() : stop(); }, { threshold: 0 });
  io.observe(canvasEl);
  const onVis = () => { pageVisible = !document.hidden; pageVisible ? start() : stop(); };
  document.addEventListener('visibilitychange', onVis);
  let rz = 0;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { resize(); if (still) renderStill(); }, 150); };
  window.addEventListener('resize', onResize);
  const onPointer = (e) => { rig.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1); };
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !still) window.addEventListener('pointermove', onPointer, { passive: true });

  function renderStill() {
    U.reveal.value = 1; uRingA.value = 1;
    // a composed frame at t = 12s: rings mid-size, particles at fixed points
    for (let i = 0; i < 5; i++) nodePhase[i] = (12 / 3.6) + i * 0.17;
    rig.focusAmt = rig.focus >= 0 ? 1 : 0;
    for (let i = 0; i < NC; i++) curveI[i] = curveIT[i];
    nodeSpeed.set(nodeSpeedT);
    const ph = Array.from(nodePhase);
    update(12, 0);
    nodePhase.set(ph);
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; opts.onReady && opts.onReady(); }
  }

  resize();
  if (still) renderStill(); else start();

  // ---------------------------------------------------------------- public API
  return {
    setFocus(key) {
      const idx = key in NODE_KEYS ? NODE_KEYS[key] : -1;
      rig.focus = idx;
      if (idx >= 0) rig.focusNode.copy(NODES[idx]);
      for (let i = 0; i < NC; i++) curveIT[i] = idx < 0 ? 1 : (CURVES[i].links.includes(idx) ? 1.45 : 0.4);
      for (let i = 0; i < 5; i++) nodeSpeedT[i] = i === idx ? 2.4 : 1;
      if (still) renderStill();
    },
    setTwin(on) { rig.twinT = on ? 1 : 0; if (still) { rig.twin = rig.twinT; renderStill(); } },
    setScroll(p) { rig.scroll = p; if (still) renderStill(); },
    resize,
    dispose() {
      stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onPointer);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
    info: () => renderer.info,
  };
}
