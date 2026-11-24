// Hero drawing: an isometric line model of a house that is drafted, raised and furnished as the
// six chapters scroll past. main.js publishes chapter progress on window.IEUM; this module turns it
// into one timeline value t (0..1 load sequence, 1..7 the six chapters) and draws that state.
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { buildModel, ghostSegments, sunAt, PAL } from './model.js';

const root = document.documentElement;
const stage = document.getElementById('stage');
const canvas = stage && stage.querySelector('.stage__canvas');
const S = (window.IEUM = window.IEUM || { p: [0, 0, 0, 0, 0, 0] });
const SHOT = /[?&]shot=1/.test(location.search);
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqSmall = matchMedia('(max-width: 767px)');
const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
const DEG = Math.PI / 180;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

// ---------- timeline: each track is [initial, [t0, t1, value, ease], ...] ----------
const EASE = {
  lin: (x) => x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
};
const TR = {
  gridMinor: [0, [0.0, 0.8, 1, 'out']],
  gridMajor: [0, [0.05, 0.75, 1, 'out']],
  ghost: [0, [0.1, 0.9, 1, 'out']],
  ghostA: [1, [4.35, 4.95, 0, 'io']],
  found: [0, [0.12, 0.7, 1, 'out']],
  dims: [0, [0.45, 1.0, 1, 'out']],
  wall1: [0, [0.3, 0.9, 1, 'out']],
  wall1Rise: [0.001, [0.35, 1.0, 0.3, 'out'], [2.05, 2.85, 1, 'io']],
  lot: [0, [1.0, 1.5, 1, 'out']],
  road: [0, [1.05, 1.55, 1, 'out']],
  north: [0, [1.1, 1.6, 1, 'out']],
  person: [0, [1.35, 1.75, 1, 'out']],
  sunArc: [0, [1.05, 1.55, 1, 'out']],
  sunArcA: [1, [2.05, 2.5, 0.38, 'io'], [6.55, 7.0, 0.22, 'io']],
  sunA: [0, [1.1, 1.3, 1, 'out'], [6.75, 7.0, 0.75, 'io']],
  sunPos: [0.04, [1.15, 1.95, 0.5, 'io'], [6.0, 6.95, 0.92, 'io']],
  plan: [0, [2.0, 2.55, 1, 'out']],
  frames1: [0, [2.55, 2.95, 1, 'out']],
  stairs: [0, [3.0, 3.4, 1, 'out']],
  slab1: [0, [3.05, 3.4, 1, 'out']],
  slab1Y: [0.9, [3.05, 3.45, 0, 'out']],
  wall2: [0, [3.3, 3.7, 1, 'out']],
  wall2Rise: [0.001, [3.35, 3.85, 1, 'out']],
  frames2: [0, [3.7, 3.98, 1, 'out']],
  roofL: [0, [4.0, 4.4, 1, 'out']],
  roofLY: [5.5, [4.0, 4.55, 0, 'out']],
  roofR: [0, [4.12, 4.55, 1, 'out']],
  roofRY: [5.5, [4.12, 4.7, 0, 'out']],
  seams: [0, [4.5, 4.8, 1, 'out']],
  treeA: [0, [4.35, 4.95, 1, 'out']],
  treeB: [0, [4.5, 5.0, 1, 'out']],
  explodeU: [0, [5.0, 5.45, 2, 'io'], [6.0, 6.4, 0, 'io']],
  explodeR: [0, [5.0, 5.5, 4, 'io'], [6.0, 6.45, 0, 'io']],
  furn1: [0, [5.25, 5.7, 1, 'out']],
  furn2: [0, [5.35, 5.8, 1, 'out']],
  route: [0, [5.5, 5.95, 1, 'out']],
  routeA: [1, [6.1, 6.45, 0, 'io']],
  glass: [0, [6.3, 6.8, 0.5, 'out']],
  zoom: [1, [1.0, 1.55, 0.82, 'io'], [2.0, 2.6, 1, 'io'], [3.0, 3.6, 0.96, 'io'], [5.0, 5.5, 0.8, 'io'], [6.0, 6.5, 0.96, 'io']],
  camY: [1.5, [2.0, 2.8, 1.9, 'io'], [3.0, 3.8, 2.6, 'io'], [5.0, 5.5, 4.6, 'io'], [6.0, 6.5, 2.6, 'io']],
  az: [0, [6.0, 7.0, -45, 'io']],
};
function tr(k, t) {
  const a = TR[k];
  let v = a[0];
  for (let i = 1; i < a.length; i++) {
    const [t0, t1, to, e] = a[i];
    if (t <= t0) return v;
    if (t < t1) return v + (to - v) * EASE[e]((t - t0) / (t1 - t0));
    v = to;
  }
  return v;
}

// Drawing names for the title block, one per chapter (0 = cover sheet).
const SHEETS = [
  ['A-00', '계획 개요'],
  ['A-01', '대지 분석도'],
  ['A-02', '1층 평면도'],
  ['A-03', '단면도'],
  ['A-04', '지붕 평면도'],
  ['A-05', '분해 조감도'],
  ['A-06', '완성 조감도'],
];

// Screen-space thick lines: one instanced quad per segment, so width is stable on every GPU.
// uDraw sweeps a pen along each segment (staggered by aO); the last bit behind the pen is tinted.
const VS = `
attribute vec3 aA; attribute vec3 aB; attribute float aO; attribute float aL;
uniform vec2 uRes; uniform float uWidth; uniform float uDraw; uniform float uSpread;
varying float vD; varying float vHead; varying float vDone; varying vec2 vXZ;
void main() {
  float t = position.x; float side = position.y;
  vec4 a = projectionMatrix * modelViewMatrix * vec4(aA, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(aB, 1.0);
  vec2 sa = a.xy / a.w * uRes * 0.5;
  vec2 sb = b.xy / b.w * uRes * 0.5;
  vec2 d = sb - sa; float len = length(d);
  vec2 dir = len > 0.0001 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 p = mix(a, b, t);
  vec2 off = nrm * side * uWidth * 0.5 + dir * (t * 2.0 - 1.0) * uWidth * 0.5;
  p.xy += off / (uRes * 0.5) * p.w;
  gl_Position = p;
  float local = clamp(uDraw * (1.0 + uSpread) - aO * uSpread, 0.0, 1.0);
  vHead = local * aL;
  vDone = step(0.999, local);
  vD = t * aL;
  vXZ = (modelMatrix * vec4(mix(aA, aB, t), 1.0)).xz;
}`;
const FS = `
uniform vec3 uColor; uniform vec3 uTip; uniform float uAlpha; uniform float uTipOn;
uniform float uDash; uniform vec2 uFade;
varying float vD; varying float vHead; varying float vDone; varying vec2 vXZ;
void main() {
  if (vHead <= 0.0001 || vD > vHead + 0.002) discard;
  if (uDash > 0.5) {
    if (uDash < 1.5) { if (mod(vD, 0.26) > 0.15) discard; }
    else { float m = mod(vD, 0.7); if (!(m < 0.42 || (m > 0.5 && m < 0.56))) discard; }
  }
  float a = uAlpha;
  if (uFade.y > 0.0) a *= 1.0 - smoothstep(uFade.x, uFade.y, length(vXZ));
  float tip = uTipOn * (1.0 - vDone) * (1.0 - smoothstep(0.05, 0.6, vHead - vD));
  gl_FragColor = vec4(mix(uColor, uTip, tip), a);
}`;

function hash(i) {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function init() {
  const small = mqSmall.matches;
  let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
  const model = buildModel(THREE, { small });

  const nodes = {};
  for (const [name, g] of Object.entries(model.groups)) {
    const o = new THREE.Object3D();
    o.position.set(g.x || 0, g.y || 0, g.z || 0);
    nodes[name] = o;
  }
  for (const [name, g] of Object.entries(model.groups)) (g.parent ? nodes[g.parent] : scene).add(nodes[name]);

  const resU = { value: new THREE.Vector2(1, 1) };
  const tipU = { value: new THREE.Vector3(...PAL.marker) };
  const disposables = [];
  const widthUniforms = [];

  function lineGeometry(segs, order, over) {
    const n = segs.length / 6;
    const A = new Float32Array(n * 3), B = new Float32Array(n * 3), O = new Float32Array(n), L = new Float32Array(n), K = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let ax = segs[i * 6], ay = segs[i * 6 + 1], az = segs[i * 6 + 2], bx = segs[i * 6 + 3], by = segs[i * 6 + 4], bz = segs[i * 6 + 5];
      // draw upward for height-ordered parts, so verticals grow from the floor
      if (order === 'y' && ay > by) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; [az, bz] = [bz, az]; }
      let dx = bx - ax, dy = by - ay, dz = bz - az;
      let len = Math.hypot(dx, dy, dz) || 1e-4;
      if (over) {
        // drafting overshoot: lines run a little past the corners, as when drawn by hand
        const e = Math.min(over, len * 0.12) / len;
        ax -= dx * e; ay -= dy * e; az -= dz * e; bx += dx * e; by += dy * e; bz += dz * e;
        len = Math.hypot(bx - ax, by - ay, bz - az);
      }
      A.set([ax, ay, az], i * 3);
      B.set([bx, by, bz], i * 3);
      L[i] = len;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      K[i] = order === 'y' ? Math.min(ay, by) + hash(i) * 0.6 : order === 'x' ? -mx + hash(i) * 0.3 : i;
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { lo = Math.min(lo, K[i]); hi = Math.max(hi, K[i]); }
    for (let i = 0; i < n; i++) O[i] = hi > lo ? (K[i] - lo) / (hi - lo) : 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
    g.setIndex([0, 2, 1, 2, 3, 1]);
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 3));
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 3));
    g.setAttribute('aO', new THREE.InstancedBufferAttribute(O, 1));
    g.setAttribute('aL', new THREE.InstancedBufferAttribute(L, 1));
    g.instanceCount = n;
    disposables.push(g);
    return g;
  }

  function lineMaterial(st, drawU, hidden) {
    const w = { value: (hidden ? 1 : st.width) * dpr, css: hidden ? 1 : st.width };
    widthUniforms.push(w);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uRes: resU, uTip: tipU, uDraw: drawU, uWidth: w,
        uSpread: { value: st.spread || 0 },
        uColor: { value: new THREE.Vector3(...PAL[hidden ? 'tracing' : st.color]) },
        uAlpha: { value: 0 },
        uTipOn: { value: !hidden && st.tip ? 1 : 0 },
        uDash: { value: hidden ? 1 : st.dash || 0 },
        uFade: { value: new THREE.Vector2(...(st.fade || [0, 0])) },
      },
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthWrite: false,
      depthTest: st.depth !== false,
      depthFunc: hidden ? THREE.GreaterDepth : THREE.LessEqualDepth,
    });
    disposables.push(m);
    return m;
  }

  const P = {};
  function addPart(st) {
    const drawU = { value: 0 };
    const geo = lineGeometry(st.segs, st.order, st.over);
    const vis = new THREE.Mesh(geo, lineMaterial(st, drawU, false));
    vis.frustumCulled = false;
    vis.renderOrder = st.depth === false ? 5 : 1;
    nodes[st.group].add(vis);
    let hid = null, face = null;
    if (st.hidden) {
      hid = new THREE.Mesh(geo, lineMaterial(st, drawU, true));
      hid.frustumCulled = false;
      hid.renderOrder = 2;
      nodes[st.group].add(hid);
    }
    if (st.faces) {
      const fm = new THREE.MeshBasicMaterial({ color: 0xf2f5fc, transparent: true, opacity: 0, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
      face = new THREE.Mesh(st.faces, fm);
      face.renderOrder = 0;
      face.visible = false;
      nodes[st.group].add(face);
      disposables.push(st.faces, fm);
    }
    P[st.id] = { st, drawU, vis, hid, face };
  }
  for (const st of model.parts) addPart(st);
  addPart({ id: 'ghost', group: 'ghost', segs: ghostSegments(model), color: 'tracing', alpha: 0.34, width: 1, order: 'y', spread: 1.5, tip: false, dash: 1, depth: false });

  const glass = {};
  for (const gl of model.glass) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(gl.pos, 3));
    const m = new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 3;
    nodes[gl.group].add(mesh);
    glass[gl.id] = mesh;
    disposables.push(g, m);
  }
  const sunGeo = new THREE.SphereGeometry(0.42, 20, 14);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.renderOrder = 4;
  nodes.sunBody.add(sun);
  disposables.push(sunGeo, sunMat);

  function setPart(id, draw, alphaMul = 1) {
    const p = P[id];
    if (!p) return;
    p.drawU.value = draw;
    const a = p.st.alpha * alphaMul;
    const on = draw > 0.0005 && a > 0.001;
    p.vis.visible = on;
    p.vis.material.uniforms.uAlpha.value = a;
    if (p.hid) { p.hid.visible = on; p.hid.material.uniforms.uAlpha.value = a * 0.32; }
    if (p.face) {
      p.face.visible = draw > 0.85 && a > 0.001;
      p.face.material.opacity = 0.06 * Math.min(1, (draw - 0.85) / 0.15) * alphaMul;
    }
  }

  // ---------- labels projected from 3D anchors ----------
  const labelLayer = stage.querySelector('.stage__labels');
  const LABELS = [
    ['w9', 0.7, 99], ['d7', 0.8, 99], ['living', 2.45, 99], ['bedroom', 3.75, 99],
    ['person', 1.55, 99], ['sunApex', 1.45, 2.4], ['route', 5.72, 6.2], ['roof', 4.6, 5.05],
  ].map(([key, from, to]) => {
    const el = labelLayer && labelLayer.querySelector(`[data-tag="${key}"]`);
    const a = model.anchors[key];
    if (!el || !a) return null;
    const o = new THREE.Object3D();
    o.position.set(...a.p);
    nodes[a.group].add(o);
    return { el, o, from, to, on: null };
  }).filter(Boolean);
  const tmp = new THREE.Vector3();

  // ---------- HUD: title block and scale bar ----------
  const sheetNo = stage.querySelector('[data-sheet-no]');
  const sheetName = stage.querySelector('[data-sheet-name]');
  const sheetTicks = stage.querySelectorAll('.titleblock__ticks i');
  const scaleBar = stage.querySelector('.scalebar__bar');
  const scaleMarks = stage.querySelectorAll('.scalebar__mark');
  let sheetIdx = -1;

  let W = 1, H = 1, headerPx = 0;
  const REQ_W = 17, REQ_H = 16;
  let halfH = 8;

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const hdr = document.querySelector('.site-header');
    headerPx = hdr ? Math.min(hdr.getBoundingClientRect().height, H * 0.2) : 0;
    const ndpr = Math.min(window.devicePixelRatio || 1, mqSmall.matches ? 1.5 : 2);
    if (ndpr !== dpr) {
      dpr = ndpr;
      renderer.setPixelRatio(dpr);
      for (const w of widthUniforms) w.value = w.css * dpr;
    }
    renderer.setSize(W, H, false);
    const v = renderer.getDrawingBufferSize(new THREE.Vector2());
    resU.value.copy(v);
    const aspect = W / H;
    halfH = Math.max(REQ_H / 2, REQ_W / 2 / aspect);
    // push the drawing below the fixed header that overlaps the top of the stage
    const s = headerPx / H;
    camera.top = halfH * (1 + s);
    camera.bottom = -halfH * (1 - s);
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    dirty = true;
  }

  const target = new THREE.Vector3();
  function placeCamera(zoom, ty, azDeg, elDeg) {
    const az = azDeg * DEG, el = elDeg * DEG, D = 80;
    target.set(0.2, ty, 0.4);
    camera.position.set(target.x + D * Math.cos(el) * Math.sin(az), target.y + D * Math.sin(el), target.z + D * Math.cos(el) * Math.cos(az));
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }

  let curZoom = 1;
  function apply(t) {
    setPart('gridMinor', tr('gridMinor', t));
    setPart('gridMajor', tr('gridMajor', t));
    setPart('ghost', tr('ghost', t), tr('ghostA', t));
    setPart('found', tr('found', t));
    setPart('dims', tr('dims', t));
    setPart('wall1', tr('wall1', t));
    nodes.wall1.scale.y = Math.max(0.001, tr('wall1Rise', t));
    setPart('lot', tr('lot', t));
    setPart('road', tr('road', t));
    setPart('north', tr('north', t));
    setPart('person', tr('person', t));
    setPart('sunArc', tr('sunArc', t), tr('sunArcA', t));
    const sa = tr('sunA', t);
    setPart('sunRing', sa > 0.001 ? 1 : 0, sa);
    sunMat.opacity = sa;
    sun.visible = sa > 0.001;
    nodes.sunBody.position.fromArray(sunAt(tr('sunPos', t)));
    setPart('plan', tr('plan', t));
    setPart('frames1', tr('frames1', t));
    setPart('stairs', tr('stairs', t));
    setPart('slab1', tr('slab1', t));
    nodes.slab1.position.y = tr('slab1Y', t);
    setPart('wall2', tr('wall2', t));
    nodes.wall2.scale.y = Math.max(0.001, tr('wall2Rise', t));
    setPart('frames2', tr('frames2', t));
    setPart('roofL', tr('roofL', t));
    nodes.roofL.position.y = tr('roofLY', t);
    setPart('roofR', tr('roofR', t));
    nodes.roofR.position.y = tr('roofRY', t);
    setPart('seams', tr('seams', t));
    for (const id of ['treeA', 'treeB']) {
      const v = tr(id, t);
      setPart(id, v);
      nodes[id].scale.set(1, Math.max(0.001, 0.55 + 0.45 * EASE.out(v)), 1);
    }
    nodes.upper.position.y = tr('explodeU', t);
    nodes.roof.position.y = tr('explodeR', t);
    setPart('furn1', tr('furn1', t));
    setPart('furn2', tr('furn2', t));
    setPart('route', tr('route', t), tr('routeA', t));
    const gv = tr('glass', t);
    for (const k in glass) { glass[k].material.opacity = gv; glass[k].visible = gv > 0.001; }
    curZoom = tr('zoom', t);
    placeCamera(curZoom, tr('camY', t), 45 + tr('az', t) + ptr.az, 35.264 + ptr.el);

    const idx = Math.max(0, Math.min(6, Math.ceil(t - 1.35)));
    if (idx !== sheetIdx && sheetNo && sheetName) {
      sheetIdx = idx;
      sheetNo.textContent = SHEETS[idx][0];
      sheetName.textContent = SHEETS[idx][1];
      sheetTicks.forEach((el, i) => el.classList.toggle('is-on', i < idx));
      const tb = stage.querySelector('.titleblock');
      if (tb && mode === 'live') { tb.classList.remove('is-swap'); void tb.offsetWidth; tb.classList.add('is-swap'); }
    }
    for (const l of LABELS) {
      const on = t >= l.from && t < l.to;
      if (on !== l.on) { l.on = on; l.el.classList.toggle('is-on', on); }
    }
  }

  function placeLabels() {
    scene.updateMatrixWorld();
    for (const l of LABELS) {
      if (!l.on) continue;
      l.o.getWorldPosition(tmp).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
    if (scaleBar) {
      // an isometric metre along a plan axis projects to sqrt(2/3) of a screen unit
      const ppm = (0.8165 * H * curZoom) / (camera.top - camera.bottom);
      scaleBar.style.transform = `scaleX(${(ppm * 5) / 100})`;
      scaleMarks.forEach((m) => { m.style.transform = `translateX(${(ppm * Number(m.dataset.m)).toFixed(1)}px)`; });
    }
  }

  // ---------- state, pointer, loop ----------
  let mode = SHOT ? 'shot' : mqReduce.matches ? 'static' : 'live';
  let tCur = mode === 'shot' ? 5 : mode === 'static' ? 7 : 0;
  let introStart = null;
  let dirty = true;
  const ptr = { az: 0, el: 0, tx: 0, ty: 0 };
  const usePointer = () => mode === 'live' && mqFine.matches;
  window.addEventListener('pointermove', (e) => {
    if (!usePointer() || e.pointerType !== 'mouse') return;
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  mqReduce.addEventListener('change', () => {
    if (SHOT) return;
    mode = mqReduce.matches ? 'static' : 'live';
    if (mode === 'static') { tCur = 7; ptr.tx = ptr.ty = ptr.az = ptr.el = 0; }
    dirty = true;
    wake();
  });

  let raf = 0, last = 0, visible = true, inView = true, rendered = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    let changed = dirty;
    if (mode === 'live') {
      if (introStart === null) introStart = now;
      const sum = S.p.reduce((a, b) => a + b, 0);
      const intro = Math.min(1, (now - introStart) / 1150);
      if (sum <= 0.002 && intro < 1 && tCur <= 1) {
        if (intro !== tCur) { tCur = intro; changed = true; }
      } else {
        const goal = sum > 0.002 ? 1 + sum : 1;
        const d = goal - tCur;
        if (Math.abs(d) > 0.0005) { tCur += d * (1 - Math.exp(-dt * 5.5)); changed = true; }
        else if (d !== 0) { tCur = goal; changed = true; }
      }
      const k = 1 - Math.exp(-dt * 4);
      const taz = usePointer() ? ptr.tx * 18 : 0, tel = usePointer() ? -ptr.ty * 6 : 0;
      if (Math.abs(taz - ptr.az) > 0.01 || Math.abs(tel - ptr.el) > 0.01) {
        ptr.az += (taz - ptr.az) * k;
        ptr.el += (tel - ptr.el) * k;
        changed = true;
      }
    }
    if (!changed) return;
    dirty = false;
    apply(tCur);
    renderer.render(scene, camera);
    placeLabels();
    if (!rendered) {
      rendered = true;
      root.classList.add('gl-ready');
      S.glReady = true;
    }
  }
  function wake() {
    if (raf || !visible || !inView) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function sleep() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  S.wake = wake;

  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
    if (visible) wake(); else sleep();
  });
  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView) { dirty = true; wake(); } else sleep();
  }).observe(stage);

  let rt = 0;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); wake(); }, rendered ? 150 : 0);
  }).observe(stage);
  resize();
  wake();

  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    sleep();
    for (const d of disposables) d.dispose && d.dispose();
    renderer.dispose();
  });
}

try {
  if (!stage || !canvas || !webglAvailable()) throw new Error('webgl unavailable');
  init();
} catch (err) {
  root.classList.add('gl-fail');
}
