// What grows and lies about the valley for the taking: fallen branches under the trees, loose stones by the big
// ones, berry bushes, mushrooms in the shade, flowers and tall grass in the meadow, reeds and clay at the tarn.
// Each kind is one instanced mesh. A thing taken is gone for a while and then is there again.
import * as THREE from 'three';
import { COMMON } from '../lib/index.js';
import { fromValley, paint, pathDistance, TARN, tarnDistance } from '../valley/world.js';
import { nodeGeometry } from './models.js';

const TAU = Math.PI * 2;

/** label: what you do to it; gives: [item, least, most]; extra: [item, chance]; back: seconds until it is there again. */
export const NODE_KINDS = {
  branch: { name: '나뭇가지', label: '줍기', gives: ['wood', 1, 2], back: 240 },
  pebble: { name: '돌무더기', label: '줍기', gives: ['stone', 1, 2], back: 300 },
  bush: { name: '열매 덤불', label: '열매 따기', gives: ['berry', 2, 3], back: 200 },
  mushroom: { name: '버섯', label: '따기', gives: ['mushroom', 1, 2], back: 260 },
  flower: { name: '들꽃', label: '꺾기', gives: ['flower', 1, 2], back: 220 },
  reed: { name: '갈대', label: '베기', gives: ['fiber', 2, 3], back: 200 },
  tuft: { name: '억새', label: '베기', gives: ['fiber', 1, 2], back: 200 },
  clay: { name: '점토', label: '캐기', gives: ['clay', 1, 2], back: 300 },
  tree: { name: '나무', label: '흔들기', gives: ['wood', 1, 2], extra: ['berry', 0.3], back: 150 },
  rock: { name: '바위', label: '돌 캐기', gives: ['stone', 2, 2], back: 200 },
};

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

const sparkVertex = /* glsl */ `
${COMMON}
in vec4 aAt;
in float aOn;
out vec2 vQ;
out float vShow;
void main() {
  vec3 at = aAt.xyz;
  at.y += 0.12 * sin(uTime * 1.7 + aAt.w * 40.0);
  float dist = distance(at, uCamPos);
  float size = max(0.2, dist * 0.014);
  vec3 cr = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = at + (cr * position.x + cu * position.y) * size;
  vQ = position.xy * 2.0;
  float twinkle = 0.55 + 0.45 * sin(uTime * 3.1 + aAt.w * 90.0);
  vShow = aOn * twinkle * (1.0 - smoothstep(38.0, 60.0, dist)) * smoothstep(1.5, 4.0, dist);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
const sparkFragment = /* glsl */ `
precision highp float;
in vec2 vQ;
in float vShow;
layout(location = 0) out vec4 outC;
void main() {
  // a four-pointed glint
  vec2 q = abs(vQ);
  float star = max(0.0, 1.0 - (q.x + q.y) - 3.2 * q.x * q.y * 4.0);
  float core = smoothstep(0.0, 0.5, star);
  if (core * vShow < 0.12) discard;
  outC = vec4(vec3(4.2, 3.8, 2.4) * core * vShow, 0.5);
}
`;

/**
 * @param o.field the meadow; o.trees what createTrees gave; o.stones what createStones gave; o.paints from paint.js;
 *   o.reach how far from the middle the walk goes
 */
export function createNodes({ field, trees, stones, paints, reach }) {
  const random = rng(9001);
  const list = [];
  const inWalk = (x, z) => Math.hypot(x, z) < reach - 8;
  const far = (x, z, type, gap) => {
    for (const n of list) if ((type === null || n.type === type) && Math.hypot(n.x - x, n.z - z) < gap) return false;
    return true;
  };
  const put = (type, x, z, extra = {}) => {
    if (!inWalk(x, z)) return null;
    const n = { type, x, z, y: field.heightAt(x, z), ready: true, timer: 0, turn: random() * TAU, scale: 0.85 + random() * 0.35, index: -1, ...extra };
    list.push(n);
    return n;
  };
  const dry = (x, z) => tarnDistance(x, z) > 1.12 && pathDistance(x, z) > 1.6;

  // the trees themselves, and what lies under them
  const nearTrees = trees.trees.filter(([x, z, kind]) => kind <= 3 && inWalk(x, z));
  for (const [tx, tz, kind, scale] of nearTrees) {
    put('tree', tx, tz, { great: kind === 0, reach: (kind === 0 ? 1.9 : 1.1) * scale + 1.2 });
    const lying = kind === 0 ? 6 : random() < 0.75 ? 1 + (random() < 0.3 ? 1 : 0) : 0;
    for (let i = 0; i < lying; i++) {
      const a = random() * TAU;
      const d = (kind === 0 ? 4 + random() * 8 : 2.2 + random() * 4) * Math.min(1.6, scale);
      const [x, z] = [tx + Math.cos(a) * d, tz + Math.sin(a) * d];
      if (dry(x, z) && far(x, z, null, 1.6)) put('branch', x, z);
    }
    if (random() < (kind === 0 ? 1 : 0.4)) {
      const a = random() * TAU;
      const d = (1.8 + random() * 2.2) * Math.min(1.5, scale);
      const [x, z] = [tx + Math.cos(a) * d, tz + Math.sin(a) * d];
      if (dry(x, z) && far(x, z, null, 1.4)) put('mushroom', x, z);
    }
    // a berry bush at the edge of a wood, here and there
    if (kind !== 0 && random() < 0.22) {
      const a = random() * TAU;
      const d = 5 + random() * 4;
      const [x, z] = [tx + Math.cos(a) * d, tz + Math.sin(a) * d];
      if (dry(x, z) && far(x, z, null, 2.4) && far(x, z, 'bush', 16)) put('bush', x, z);
    }
  }
  // the big stones, and loose ones beside them
  for (const [sx, sz, gap] of stones.solid) {
    if (!inWalk(sx, sz)) continue;
    put('rock', sx, sz, { reach: gap + 1.3 });
    if (random() < 0.75) {
      const a = random() * TAU;
      const d = gap + 0.9 + random() * 1.6;
      const [x, z] = [sx + Math.cos(a) * d, sz + Math.sin(a) * d];
      if (dry(x, z) && far(x, z, null, 1.5)) put('pebble', x, z);
    }
  }
  // by the low bushes: berries
  for (const [bx, bz, kind] of trees.trees) {
    if (kind < 7 || !inWalk(bx, bz) || random() < 0.4) continue;
    const a = random() * TAU;
    const [x, z] = [bx + Math.cos(a) * 2.3, bz + Math.sin(a) * 2.3];
    if (dry(x, z) && far(x, z, null, 2.2) && far(x, z, 'bush', 16)) put('bush', x, z);
  }
  // the open meadow: flowers where the meadow flowers, tall plumed grass anywhere it is lush
  for (let tries = 0, flowers = 0, tufts = 0; tries < 9000 && (flowers < 80 || tufts < 70); tries++) {
    const a = random() * TAU;
    const d = Math.sqrt(random()) * (reach - 12);
    const [x, z] = [Math.cos(a) * d, Math.sin(a) * d];
    if (!dry(x, z)) continue;
    const p = paint(x, z);
    if (p.growth < 0.95) continue;
    if (flowers < 80 && p.flowers > 0.7 && far(x, z, null, 3) && far(x, z, 'flower', 11)) {
      put('flower', x, z);
      flowers++;
    } else if (tufts < 70 && p.flowers < 0.5 && far(x, z, null, 3) && far(x, z, 'tuft', 20)) {
      put('tuft', x, z);
      tufts++;
    }
  }
  // the tarn: reeds along its shore, clay on its bare bank
  for (let tries = 0, reeds = 0, clays = 0; tries < 5000 && (reeds < 40 || clays < 20); tries++) {
    const x = TARN.at[0] + (random() - 0.5) * 150;
    const z = TARN.at[1] + (random() - 0.5) * 150;
    const t = tarnDistance(x, z);
    if (reeds < 40 && t > 0.97 && t < 1.3 && pathDistance(x, z) > 2 && far(x, z, null, 2.2)) {
      put('reed', x, z);
      reeds++;
    } else if (clays < 20 && t > 0.865 && t < 0.95 && far(x, z, null, 3.5)) {
      put('clay', x, z);
      clays++;
    }
  }
  // and clay where the ground is wet, away from the water
  for (let tries = 0, clays = 0; tries < 4000 && clays < 16; tries++) {
    const a = random() * TAU;
    const d = 30 + Math.sqrt(random()) * (reach - 50);
    const [x, z] = [Math.cos(a) * d, Math.sin(a) * d];
    if (!dry(x, z) || paint(x, z).wet < 0.5 || !far(x, z, null, 3) || !far(x, z, 'clay', 25)) continue;
    put('clay', x, z);
    clays++;
  }
  // near the start there is always a little of everything to begin with
  const starter = [['branch', 9, 2], ['branch', 12, -6], ['pebble', 13, 9], ['pebble', 5, -11], ['bush', 17, 13], ['flower', 21, -5], ['tuft', 8, 16], ['mushroom', 4, -17], ['tuft', -6, 6], ['flower', -3, -8], ['clay', 30, 52], ['clay', -34, 26], ['bush', -30, -12], ['pebble', -16, 34]];
  for (const [type, u, v] of starter) {
    const [x, z] = fromValley(u, v);
    if (far(x, z, null, 1.5)) put(type, x, z);
  }

  // ---- drawing -------------------------------------------------------------------------------------------------
  const group = new THREE.Group();
  const meshes = {};
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  const place = (mesh, n, shown) => {
    const s = shown ? n.scale : 0;
    matrix.compose(new THREE.Vector3(n.x, n.y - 0.02, n.z), q.setFromAxisAngle(UP, n.turn), new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(n.index, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  };
  for (const type of ['branch', 'pebble', 'bush', 'mushroom', 'flower', 'reed', 'tuft', 'clay']) {
    const mine = list.filter((n) => n.type === type);
    if (!mine.length) continue;
    const mesh = new THREE.InstancedMesh(nodeGeometry(type), paints.prop, mine.length);
    mesh.frustumCulled = false;
    meshes[type] = mesh;
    mine.forEach((n, i) => {
      n.index = i;
      place(mesh, n, true);
    });
    group.add(mesh);
    if (type === 'bush') {
      // (the bush stays when its berries are picked)
      const berries = new THREE.InstancedMesh(nodeGeometry('berries'), paints.prop, mine.length);
      berries.frustumCulled = false;
      meshes.berries = berries;
      mine.forEach((n) => place(berries, n, true));
      group.add(berries);
    }
  }

  // a glint over each thing that can be picked up, so it is found in the long grass
  const HEIGHT = { branch: 1.7, pebble: 1.2, bush: 1.55, mushroom: 1.3, flower: 1.5, reed: 2.2, tuft: 2.0, clay: 0.9 };
  const glinting = list.filter((n) => HEIGHT[n.type]);
  const sparkGeometry = new THREE.InstancedBufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  const at = new Float32Array(glinting.length * 4);
  const on = new Float32Array(glinting.length).fill(1);
  glinting.forEach((n, i) => {
    n.glint = i;
    at.set([n.x, n.y + HEIGHT[n.type] * n.scale, n.z, random()], i * 4);
  });
  sparkGeometry.setAttribute('aAt', new THREE.InstancedBufferAttribute(at, 4));
  const onAttribute = new THREE.InstancedBufferAttribute(on, 1).setUsage(THREE.DynamicDrawUsage);
  sparkGeometry.setAttribute('aOn', onAttribute);
  sparkGeometry.instanceCount = glinting.length;
  const sparks = new THREE.Mesh(sparkGeometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: field.uniforms, vertexShader: sparkVertex, fragmentShader: sparkFragment }));
  sparks.frustumCulled = false;
  group.add(sparks);

  const show = (n, shown) => {
    n.ready = shown;
    if (n.type === 'bush') place(meshes.berries, n, shown);
    else if (meshes[n.type]) place(meshes[n.type], n, shown);
    if (n.glint !== undefined) {
      on[n.glint] = shown ? 1 : 0;
      onAttribute.needsUpdate = true;
    }
  };
  const waiting = new Set();

  return {
    group,
    list,
    kinds: NODE_KINDS,
    /** The nearest thing that can be taken within `reach` metres of (x, z), or null. */
    nearest(x, z, reach = 2.1) {
      let best = null;
      let bestD = 1e9;
      for (const n of list) {
        if (!n.ready) continue;
        const dx = n.x - x;
        const dz = n.z - z;
        if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue;
        // (a tree or a rock is reached from its side; what lies on the ground comes first when both are near)
        const limit = n.reach ?? reach;
        const d = Math.hypot(dx, dz);
        const score = d / limit + (n.reach ? 0.6 : 0);
        if (d < limit && score < bestD) {
          best = n;
          bestD = score;
        }
      }
      return best;
    },
    /** Takes it: it is gone for a while. Returns what it gave, as { item: count }. */
    take(n, luck = Math.random) {
      const kind = NODE_KINDS[n.type];
      const [item, least, most] = kind.gives;
      const got = { [item]: least + Math.floor(luck() * (most - least + 1)) + (n.great ? 1 : 0) };
      if (kind.extra && (n.great || luck() < kind.extra[1])) got[kind.extra[0]] = (got[kind.extra[0]] ?? 0) + 1;
      show(n, false);
      n.timer = kind.back;
      waiting.add(n);
      return got;
    },
    update(dt) {
      for (const n of waiting) {
        n.timer -= dt;
        if (n.timer <= 0) {
          show(n, true);
          waiting.delete(n);
        }
      }
    },
    /** A new day: everything has grown back. */
    renew() {
      for (const n of waiting) show(n, true);
      waiting.clear();
    },
    /** Places of a kind, for those who need to know where the woods and stones are: [{x, z}]. */
    of: (type) => list.filter((n) => n.type === type),
  };
}
