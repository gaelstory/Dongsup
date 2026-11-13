// What makes the meadow more than grass: ferns under the trees, drifts of spires and poppies and daisies in the
// open, clover by the paths, bells near the water, a stump here and there. None of it is for taking; it is there to
// walk through. Each kind is drawn as instanced meshes, a few to a part of the valley so what is behind you is not
// drawn, and each plant leans with the wind and has its own tint. Over the flowers there are butterflies by day,
// and fireflies when the light goes.
import * as THREE from 'three';
import { COMMON } from '../lib/index.js';
import { paint, pathDistance, tarnDistance } from '../valley/world.js';
import { HOME } from './data.js';
import { FLORA_TINTS, floraGeometry } from './models.js';
import { ADDITIVE } from './paint.js';

const TAU = Math.PI * 2;
const TILES = 4;

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

const wingVertex = /* glsl */ `
${COMMON}
in vec4 aHome;  // where it keeps to, and its own number
in vec3 aTint;
uniform float uDay;
out vec3 vCol;
out vec3 vWorld;
out float vShow;
void main() {
  float id = aHome.w;
  float t = uTime * (0.35 + 0.25 * fract(id * 7.3)) + id * 40.0;
  // it wanders round its flowers, never the same way twice
  vec2 off = vec2(sin(t) + 0.6 * sin(t * 2.3 + id), cos(t * 0.8) + 0.6 * cos(t * 1.9 + id * 3.0)) * 1.6;
  vec2 ahead = vec2(cos(t) + 1.38 * cos(t * 2.3 + id), -0.8 * sin(t * 0.8) - 1.14 * sin(t * 1.9 + id * 3.0));
  vec2 xz = aHome.xz + off;
  float y = groundAt(xz) + 0.75 + 0.45 * sin(t * 1.7 + id * 5.0) + 0.12 * sin(uTime * 9.0 + id);
  vec2 fwd = normalize(ahead + vec2(1e-4));
  vec2 side = vec2(-fwd.y, fwd.x);
  // two wings, hinged along the body, beating
  float beat = 0.25 + 0.95 * abs(sin(uTime * (11.0 + 5.0 * fract(id * 3.1)) + id * 9.0));
  float w = position.x;
  vec3 world = vec3(xz.x, y, xz.y);
  world.xz += fwd * position.z * 0.11 + side * w * 0.12 * cos(beat);
  world.y += abs(w) * 0.12 * sin(beat);
  float dist = distance(world, uCamPos);
  vShow = uDay * (1.0 - smoothstep(38.0, 52.0, dist));
  vCol = aTint * mix(0.75, 1.0, abs(w));
  vWorld = world;
  gl_Position = vShow > 0.01 ? projectionMatrix * viewMatrix * vec4(world, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;
const wingFragment = /* glsl */ `
${COMMON}
in vec3 vCol;
in vec3 vWorld;
in float vShow;
layout(location = 0) out vec4 outC;
void main() {
  vec3 col = vCol * (uSunColor * 0.34 * openAt(vWorld.xz) + uSkyColor * 0.5);
  outC = vec4(applyFog(col, vWorld), 0.5);
}
`;
const flyVertex = /* glsl */ `
${COMMON}
in vec4 aHome;
uniform float uDusk;
out vec2 vQ;
out float vShow;
void main() {
  float id = aHome.w;
  float t = uTime * (0.12 + 0.1 * fract(id * 5.7)) + id * 30.0;
  vec2 xz = aHome.xz + vec2(sin(t * 1.3 + id) + sin(t * 0.7), cos(t + id * 2.0) + cos(t * 0.6 + 1.0)) * 2.2;
  float y = groundAt(xz) + 0.5 + aHome.y + 0.5 * sin(t * 2.1 + id * 7.0);
  vec3 at = vec3(xz.x, y, xz.y);
  float dist = distance(at, uCamPos);
  // each has its own slow blink
  float blink = smoothstep(0.1, 0.9, sin(uTime * (0.8 + fract(id * 9.1)) + id * 50.0) * 0.5 + 0.5);
  vShow = uDusk * blink * (1.0 - smoothstep(45.0, 70.0, dist));
  float size = max(0.16, dist * 0.011);
  vec3 cr = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = at + (cr * position.x + cu * position.y) * size;
  vQ = position.xy * 2.0;
  gl_Position = vShow > 0.01 ? projectionMatrix * viewMatrix * vec4(world, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;
const flyFragment = /* glsl */ `
precision highp float;
in vec2 vQ;
in float vShow;
layout(location = 0) out vec4 outC;
void main() {
  float d2 = dot(vQ, vQ);
  if (d2 > 1.0) discard;
  float glow = (1.0 - d2) * (1.0 - d2) * 0.5 + exp(-d2 * 30.0) * 2.4;
  outC = vec4(vec3(1.6, 1.9, 0.6) * glow * vShow, 0.0);
}
`;

/**
 * @param o.field, o.trees, o.paints; o.reach how far the walk goes; o.density 0 to 1, how much of it to plant
 */
export function createFlora({ field, trees, paints, reach, density = 1 }) {
  const random = rng(4242);
  const plants = []; // { kind, x, z, y, turn, scale, tint }
  const ok = (x, z) => Math.hypot(x, z) < reach + 30 && tarnDistance(x, z) > 1.02 && pathDistance(x, z) > 1.3 && paint(x, z).growth > 0.8;
  const put = (kind, x, z, tint, scale = 0.8 + random() * 0.5) => {
    if (!ok(x, z)) return;
    plants.push({ kind, x, z, y: field.heightAt(x, z), turn: random() * TAU, scale, tint: tint ?? FLORA_TINTS[kind][Math.floor(random() * FLORA_TINTS[kind].length)] });
  };
  const drifts = []; // where the flowers are thick: butterflies and fireflies keep to these
  const drift = (kind, cx, cz, n, spread) => {
    const tints = FLORA_TINTS[kind];
    const main = tints[Math.floor(random() * tints.length)];
    for (let i = 0; i < n; i++) {
      const a = random() * TAU;
      const d = spread * Math.sqrt(random());
      // (one colour to a drift, with a stray or two)
      put(kind, cx + Math.cos(a) * d, cz + Math.sin(a) * d, random() < 0.82 ? main : null);
    }
    if (kind !== 'fern' && kind !== 'clover' && kind !== 'stump') drifts.push([cx, cz]);
  };

  // under and beside the trees: ferns, a stump now and then, bells in the shade
  for (const [tx, tz, kind, scale] of trees.trees) {
    if (kind > 3 || Math.hypot(tx, tz) > reach + 20) continue;
    const n = Math.round((kind === 0 ? 9 : 2 + random() * 2.5) * density);
    for (let i = 0; i < n; i++) {
      const a = random() * TAU;
      const d = (kind === 0 ? 2.5 + random() * 8 : 1.3 + random() * 3.4) * Math.min(1.5, scale);
      put('fern', tx + Math.cos(a) * d, tz + Math.sin(a) * d, null, 0.8 + random() * 0.7);
    }
    if (random() < 0.1 * density) put('stump', tx + (random() - 0.5) * 9, tz + (random() - 0.5) * 9, null, 0.9 + random() * 0.4);
    if (random() < 0.3 * density) drift('bell', tx + (random() - 0.5) * 7, tz + (random() - 0.5) * 7, 4 + Math.floor(random() * 4), 2.2);
  }
  // the open meadow: drifts of one kind, thicker towards the hill you live on
  const kinds = ['spire', 'spire', 'cup', 'cup', 'daisy', 'daisy', 'umbel', 'clover', 'clover', 'shrub', 'bell'];
  const count = Math.round(150 * density);
  for (let i = 0; i < count; i++) {
    const a = random() * TAU;
    const d = (reach + 10) * random() ** 0.75;
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    if (!ok(cx, cz)) continue;
    const kind = kinds[Math.floor(random() * kinds.length)];
    const n = kind === 'shrub' ? 1 + Math.floor(random() * 3) : kind === 'clover' ? 5 + Math.floor(random() * 6) : 5 + Math.floor(random() * 10);
    drift(kind, cx, cz, n, kind === 'shrub' ? 3 : 2.5 + random() * 4.5);
  }
  // along the footpaths: clover and daisies at the edge of the worn earth
  for (let i = 0; i < Math.round(420 * density); i++) {
    const a = random() * TAU;
    const d = reach * Math.sqrt(random());
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const p = pathDistance(x, z);
    if (p > 1.5 && p < 3.2) put(random() < 0.6 ? 'clover' : 'daisy', x, z);
  }

  // ---- drawing: each kind, a few meshes to a part of the valley ------------------------------------------------
  const group = new THREE.Group();
  const span = 2 * (reach + 40);
  const tileOf = (x, z) => Math.min(TILES - 1, Math.max(0, Math.floor(((x + span / 2) / span) * TILES))) + TILES * Math.min(TILES - 1, Math.max(0, Math.floor(((z + span / 2) / span) * TILES)));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  const set = (p, shown) => {
    const s = shown ? p.scale : 0;
    matrix.compose(new THREE.Vector3(p.x, p.y - 0.02, p.z), q.setFromAxisAngle(UP, p.turn), new THREE.Vector3(s, s, s));
    p.mesh.setMatrixAt(p.index, matrix);
    p.mesh.instanceMatrix.needsUpdate = true;
  };
  const buckets = new Map();
  for (const p of plants) {
    const key = `${p.kind}:${tileOf(p.x, p.z)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  for (const [key, mine] of buckets) {
    const kind = key.split(':')[0];
    const geometry = floraGeometry(kind).clone();
    const tints = new Float32Array(mine.length * 3);
    mine.forEach((p, i) => tints.set(p.tint, i * 3));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
    const mesh = new THREE.InstancedMesh(geometry, paints.plantTinted, mine.length);
    mine.forEach((p, i) => {
      p.mesh = mesh;
      p.index = i;
      p.shown = true;
      set(p, true);
    });
    mesh.computeBoundingSphere();
    mesh.boundingSphere.radius += 2;
    group.add(mesh);
  }
  const atHome = plants.filter((p) => Math.hypot(p.x - HOME.x, p.z - HOME.z) < HOME.r + 2);

  // ---- butterflies and fireflies -------------------------------------------------------------------------------
  const quad = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
  const uniforms = { ...field.uniforms, uDay: { value: 1 }, uDusk: { value: 0 } };
  {
    const n = Math.min(drifts.length, Math.round(70 * density));
    const geometry = new THREE.InstancedBufferGeometry();
    // two wings: x is across (the hinge is at 0), z is along the body
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, -1, 0, -0.8, -1, 0, 0.7, 0, 0, -0.5, -1, 0, 0.7, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.7, 1, 0, -0.8, 0, 0, -0.5, 0, 0, 0.5, 1, 0, 0.7], 3));
    const home = new Float32Array(n * 4);
    const tint = new Float32Array(n * 3);
    const colours = [[1.0, 1.0, 0.95], [1.0, 0.85, 0.3], [0.55, 0.7, 1.0], [1.0, 0.6, 0.25], [1.0, 0.7, 0.85]];
    for (let i = 0; i < n; i++) {
      const [x, z] = drifts[Math.floor(random() * drifts.length)];
      home.set([x, 0, z, random()], i * 4);
      tint.set(colours[Math.floor(random() * colours.length)], i * 3);
    }
    geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(home, 4));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    geometry.instanceCount = n;
    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms, vertexShader: wingVertex, fragmentShader: wingFragment }));
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  {
    const n = Math.round(260 * density);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(quad, 3));
    const home = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      // most over the flowers, a good many about your own land
      const [x, z] = i % 4 === 0 ? [HOME.x + (random() - 0.5) * HOME.r * 1.6, HOME.z + (random() - 0.5) * HOME.r * 1.6] : drifts[Math.floor(random() * drifts.length)] ?? [0, 0];
      home.set([x + (random() - 0.5) * 8, random() * 1.2, z + (random() - 0.5) * 8, random()], i * 4);
    }
    geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(home, 4));
    geometry.instanceCount = n;
    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms, vertexShader: flyVertex, fragmentShader: flyFragment, ...ADDITIVE }));
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    group.add(mesh);
  }

  return {
    group,
    count: plants.length,
    /** Where things have been built there are no plants: `footprints` is [{ x, z, r }] of everything standing on your land. */
    clearFor(footprints) {
      for (const p of atHome) {
        const shown = !footprints.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < f.r + 0.25);
        if (shown === p.shown) continue;
        p.shown = shown;
        set(p, shown);
      }
    },
    /** @param dusk 0 by day to 1 when the light has gone */
    update(dusk) {
      uniforms.uDay.value = 1 - Math.min(1, dusk * 1.6);
      uniforms.uDusk.value = Math.max(0, dusk * 1.5 - 0.5);
    },
  };
}
