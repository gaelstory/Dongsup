// How the game's own things are drawn so they belong in the valley: buildings and what lies on the ground as paint
// (a soft turn from light to shade, a brush's unevenness, the valley's light), spirits and animals as cel (flat
// colour and an inked line, like the wanderer), plants as paint that leans with the wind, and light as light. A
// Shape gathers rounded solids into one mesh, each part with its own colour.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COMMON } from '../lib/index.js';

/** The colour a paint goes in the shade: cooler and deeper, not just darker. */
export const shadeOf = ([r, g, b]) => [r * 0.5 + 0.02, g * 0.5 + 0.03, b * 0.58 + 0.06];

/**
 * Light laid over the picture: adds its colour and leaves alpha alone, since the frame reads alpha as what a thing
 * is (painted or not, inked or not), never as how much of it shows.
 */
export const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};

const m4 = new THREE.Matrix4();
const n3 = new THREE.Matrix3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const v3 = new THREE.Vector3();

export class Shape {
  constructor() {
    this.position = [];
    this.normal = [];
    this.lit = [];
    this.shade = [];
    this.ink = [];
  }

  /**
   * Adds a geometry. o.at where, o.rot how it is turned (radians, XYZ), o.scale, o.color its paint in the light,
   * o.shade its paint out of it (worked out if not given), o.ink its number for the inked line (cel things), or
   * 1 for a part that gives light (props), or how stiff it stands in the wind (plants: 0 moves freely).
   */
  add(geometry, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color = [1, 1, 1], shade = null, ink = 0 } = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
    m4.compose(v3.set(...at), quat.setFromEuler(euler.set(...rot)), new THREE.Vector3(...s));
    n3.getNormalMatrix(m4);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const dark = shade ?? shadeOf(color);
    for (let i = 0; i < p.count; i++) {
      v3.fromBufferAttribute(p, i).applyMatrix4(m4);
      this.position.push(v3.x, v3.y, v3.z);
      v3.fromBufferAttribute(n, i).applyMatrix3(n3).normalize();
      this.normal.push(v3.x, v3.y, v3.z);
      this.lit.push(...color);
      this.shade.push(...dark);
      this.ink.push(ink);
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
    return this;
  }

  /** A box with its edges rounded off (`round` metres; a tenth of its least side if not given). */
  box(w, h, d, o = {}) {
    const round = o.round ?? Math.min(0.045, Math.min(w, h, d) * 0.14);
    if (round <= 0.004) return this.add(new THREE.BoxGeometry(w, h, d), o);
    return this.add(new RoundedBoxGeometry(w, h, d, 2, Math.min(round, Math.min(w, h, d) * 0.49)), o);
  }

  /** A cylinder standing on its end: radius at the top, at the bottom, height, sides. */
  cyl(top, bottom, h, sides = 12, o = {}) {
    return this.add(new THREE.CylinderGeometry(top, bottom, h, sides), o);
  }

  /** A cone with its point rounded off. */
  cone(r, h, sides = 12, o = {}) {
    const profile = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      // straight sides, easing over into a small dome at the top
      const y = t * h;
      const taper = 1 - t;
      profile.push(new THREE.Vector2(Math.max(0.0001, r * (taper * 0.86 + 0.14 * Math.sqrt(Math.max(0, 1 - t * t)))), y - h / 2));
    }
    profile.push(new THREE.Vector2(0.0001, h / 2));
    const g = new THREE.LatheGeometry(profile, sides);
    g.computeVertexNormals();
    return this.add(g, o);
  }

  ball(r, o = {}, detail = 2) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), o);
  }

  /** A drop: round below, drawn up to a soft point. r its widest, h its whole height; it stands on y = 0. */
  drop(r, h, sides = 16, o = {}) {
    const rings = o.rings ?? 14;
    const profile = [new THREE.Vector2(0.0001, 0)];
    for (let i = 1; i <= rings; i++) {
      const t = i / rings;
      const y = t * h;
      // round as a ball below its widest, then a long ease to the tip
      const under = 1 - Math.min(1, t / 0.42);
      const belly = Math.sqrt(Math.max(0, 1 - under * under));
      const neck = t < 0.42 ? 1 : 0.5 + 0.5 * Math.cos(Math.min(1, (t - 0.42) / 0.58) * Math.PI);
      profile.push(new THREE.Vector2(Math.max(0.0001, r * belly * neck), y));
    }
    const g = new THREE.LatheGeometry(profile, sides);
    g.computeVertexNormals();
    return this.add(g, o);
  }

  /** A pill standing up: radius, and the length of its straight middle. */
  capsule(r, length, o = {}) {
    return this.add(new THREE.CapsuleGeometry(r, length, 5, 12), o);
  }

  /** Turned on a lathe: [[radius, y], ...] from the bottom up. */
  lathe(points, sides = 16, o = {}) {
    const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), sides);
    g.computeVertexNormals();
    return this.add(g, o);
  }

  torus(r, tube, o = {}, sides = 16) {
    return this.add(new THREE.TorusGeometry(r, tube, 8, sides), o);
  }

  /** A flat four-sided piece between four corners (given round it), seen from both sides. */
  quad(a, b, c, d, o = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    g.computeVertexNormals();
    return this.add(g, o);
  }

  tri(a, b, c, o = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    g.computeVertexNormals();
    return this.add(g, o);
  }

  /**
   * A leaf or a petal: a pointed oval lying in the plane it is given, cupped a little so it catches the light.
   * `from` its foot, `to` its tip, `width` across its middle, `up` roughly which way its face looks.
   */
  leaf(from, to, width, o = {}, up = [0, 1, 0]) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const along = b.clone().sub(a);
    const face = new THREE.Vector3(...up).normalize();
    const side = along.clone().cross(face);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    side.normalize().multiplyScalar(width / 2);
    // its outline: narrow at the foot, widest before the middle, a rounded tip; its edges a little lower than its rib
    const STEPS = o.steps ?? 3;
    const rib = [];
    const left = [];
    const right = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const w = Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - 0.25 * t) + (i === STEPS ? 0 : 0.06);
      const p = a.clone().addScaledVector(along, t);
      rib.push(p);
      left.push(p.clone().addScaledVector(side, w).addScaledVector(face, -width * 0.16 * w));
      right.push(p.clone().addScaledVector(side, -w).addScaledVector(face, -width * 0.16 * w));
    }
    const pos = [];
    const tri = (p, q, r) => pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    for (let i = 0; i < STEPS; i++) {
      tri(rib[i], left[i], left[i + 1]);
      tri(rib[i], left[i + 1], rib[i + 1]);
      tri(rib[i], rib[i + 1], right[i + 1]);
      tri(rib[i], right[i + 1], right[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // (smooth across the leaf: one normal to a place, whichever triangle it belongs to)
    const merged = new THREE.BufferGeometry();
    const index = [];
    const unique = [];
    const seen = new Map();
    for (let i = 0; i < pos.length; i += 3) {
      const key = `${pos[i].toFixed(4)},${pos[i + 1].toFixed(4)},${pos[i + 2].toFixed(4)}`;
      if (!seen.has(key)) {
        seen.set(key, unique.length / 3);
        unique.push(pos[i], pos[i + 1], pos[i + 2]);
      }
      index.push(seen.get(key));
    }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(unique, 3));
    merged.setIndex(index);
    merged.computeVertexNormals();
    g.dispose();
    return this.add(merged, o);
  }

  /** Everything added so far, as one geometry. */
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(this.lit, 3));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shade, 3));
    g.setAttribute('aInk', new THREE.Float32BufferAttribute(this.ink, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

// One vertex shader for all three paints. A plant (SWAY) leans with the gusts, more the higher up it is; each
// instance may be tinted (TINT), so a drift of flowers is not one flower many times.
const vertex = /* glsl */ `
${COMMON}
in vec3 aLit;
in vec3 aShade;
in float aInk;
#ifdef TINT
in vec3 aTint;
#endif
out vec3 vWorld;
out vec3 vN;
out vec3 vLit;
out vec3 vShade;
out float vUp;
flat out float vInk;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 w = m * vec4(position, 1.0);
  vec3 n = normalize(mat3(m) * normal);
  #ifdef SWAY
  {
    vec2 root = m[3].xz;
    float gust = gustAt(root);
    float h = max(position.y, 0.0) * (1.0 - aInk);
    float phase = uTime * (1.3 + 0.5 * fract(root.x * 0.37)) + root.x * 0.9 + root.y * 1.3;
    float lean = (0.035 + 0.11 * gust) * uWind.z * 0.22;
    vec2 push = uWind.xy * lean * h * h + vec2(sin(phase), cos(phase * 0.83)) * (0.012 + 0.03 * gust) * h;
    w.xz += push;
    w.y -= dot(push, push) * 0.6;
  }
  #endif
  vWorld = w.xyz;
  vN = n;
  vLit = aLit;
  vShade = aShade;
  #ifdef TINT
  // (only what was painted white takes the tint: the petals, not the stem)
  float white = smoothstep(0.55, 0.9, min(aLit.r, min(aLit.g, aLit.b)));
  vLit = mix(vLit, aLit * aTint, white);
  vShade = mix(vShade, aShade * mix(aTint, vec3(1.0), 0.25), white);
  #endif
  vUp = position.y;
  vInk = aInk;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

// Paint: for what stands still. The turn from light to shade is a soft one with a brush's wobble in it, the foot
// of a thing is darker where it meets the ground, and what faces the sky takes a little of the sky in its shade.
// uBuilt is how much of it is finished, from the ground up (the rest is drawn as a pale under-drawing of itself);
// uGhost draws all of it in uTint, for a thing not yet put down.
const propFragment = /* glsl */ `
${COMMON}
uniform float uBuilt;
uniform float uTop;
uniform float uGhost;
uniform vec3 uTint;
uniform float uGlow;
in vec3 vWorld;
in vec3 vN;
in vec3 vLit;
in vec3 vShade;
in float vUp;
flat in float vInk;
layout(location = 0) out vec4 outC;
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float open = openAt(vWorld.xz);
  // broad strokes of unevenness, the same from every side
  float n1 = texture(tNoise, vWorld.xz * 0.23 + vWorld.y * 0.31).r;
  float n2 = texture(tNoise, vWorld.zy * 0.71 + vWorld.x * 0.43).g;
  float ndl = dot(N, uSunDir);
  float lit = smoothstep(-0.12, 0.3, ndl + (n1 - 0.5) * 0.2) * smoothstep(0.4, 0.75, open);
  // (the shade's light is the sky's with most of its blue taken out: wood in shade should still be wood)
  vec3 sky = mix(uSkyColor, vec3(dot(uSkyColor, vec3(0.333))), 0.6) * 1.3 + 0.06;
  vec3 col = mix(vShade * sky, vLit * (uSunColor * 0.36 + uSkyColor * 0.4), lit);
  #ifdef SWAY
  // a leaf lets light through: its shade is never as deep as a wall's
  col = mix(col, vLit * (uSunColor * 0.2 + uSkyColor * 0.34), 0.22 * (1.0 - lit) * open);
  #else
  // where it looks at the sun squarely it is a touch fuller, and where it looks at the sky its shade is lifted
  col += vLit * uSunColor * 0.05 * smoothstep(0.55, 0.95, ndl) * lit;
  col += vShade * uSkyColor * 0.22 * max(N.y, 0.0) * (1.0 - lit);
  // it stands on the ground: its foot is deeper, and a little of the grass's green comes up it
  float foot = 1.0 - smoothstep(0.0, 0.42, vWorld.y - groundAt(vWorld.xz));
  col = mix(col, col * vec3(0.6, 0.74, 0.58), foot * 0.5);
  #endif
  col *= 0.93 + 0.14 * n2;
  // a part marked to glow (a lantern's pane, an ember) gives its own light, more as the day goes
  #ifndef SWAY
  col += vLit * vInk * uGlow * 2.6;
  #endif
  float sketch = uGhost > 0.5 ? 1.0 : smoothstep(-0.04, 0.04, vUp - uBuilt * uTop);
  if (sketch > 0.0) {
    // an under-drawing: pale, flat, with a pencil's hatching across it
    float tone = dot(col, vec3(0.3, 0.5, 0.2));
    float hatch = smoothstep(0.35, 0.65, abs(fract((vWorld.x + vWorld.y * 1.7 + vWorld.z) * 3.2) - 0.5) * 2.0);
    vec3 drawn = uTint * (0.5 + 0.5 * tone) * (0.86 + 0.14 * hatch);
    col = mix(col, drawn, sketch * (uGhost > 0.5 ? 0.92 : 0.82));
  }
  outC = vec4(applyFog(col, vWorld), 1.0);
}
`;

// Cel: for what is alive. Two tones with a clean turn, a little light round the edge so it sits softly in the
// picture, and each part writes its number into alpha for the line.
const celFragment = /* glsl */ `
${COMMON}
uniform float uBright;
uniform float uRim;
in vec3 vWorld;
in vec3 vN;
in vec3 vLit;
in vec3 vShade;
in float vUp;
flat in float vInk;
layout(location = 0) out vec4 outC;
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float open = smoothstep(0.35, 0.6, openAt(vWorld.xz));
  float lit = smoothstep(-0.02, 0.07, dot(N, uSunDir) + 0.1) * open;
  vec3 sun = uSunColor * 0.42 + uSkyColor * 0.3;
  float grey = dot(uSkyColor, vec3(0.333));
  vec3 sky = mix(uSkyColor, vec3(grey), 0.8) * 1.15 + 0.2;
  vec3 col = mix(vShade * sky, vLit * sun, lit) * uBright;
  vec3 V = normalize(uCamPos - vWorld);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  col += (vLit * 0.5 + 0.5) * (uSkyColor * 0.5 + uSunColor * 0.12) * rim * uRim;
  outC = vec4(applyFog(col, vWorld), vInk);
}
`;

// Light itself: a flame, an ember. Bright enough to bloom, and left alone by the paint finish.
const glowFragment = /* glsl */ `
${COMMON}
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uPower;
in vec3 vWorld;
in float vUp;
layout(location = 0) out vec4 outC;
void main() {
  vec3 col = mix(uColor, uColor2, clamp(vUp, 0.0, 1.0)) * uPower;
  outC = vec4(applyFog(col, vWorld), 0.5);
}
`;

/** The materials, made once for a field (they take its light). */
export function createPaints(field) {
  const make = (fragmentShader, uniforms, defines = {}) =>
    new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms: { ...field.uniforms, ...uniforms }, vertexShader: vertex, fragmentShader, defines });
  const propUniforms = () => ({ uBuilt: { value: 1 }, uTop: { value: 1000 }, uGhost: { value: 0 }, uTint: { value: new THREE.Color(0.4, 1, 0.5) }, uGlow: { value: 0 } });
  const prop = make(propFragment, propUniforms());
  const plant = make(propFragment, propUniforms(), { SWAY: 1 });
  const plantTinted = make(propFragment, propUniforms(), { SWAY: 1, TINT: 1 });
  const cel = make(celFragment, { uBright: { value: 1 }, uRim: { value: 0.35 } });
  const lights = [];
  return {
    /** For anything that stands still and is whole. Shared. */
    prop,
    /** For what grows: it leans with the wind. `plantTinted` takes a colour for each instance (aTint). */
    plant,
    plantTinted,
    /** A paint of its own for one thing, so it can be half built, or a ghost, or glow. */
    propOwn() {
      const m = make(propFragment, propUniforms());
      lights.push(m);
      return m;
    },
    /** For animals. Shared. */
    cel,
    /** A cel paint of its own, for one that should shine a little (a spirit). */
    celOwn(bright = 1, rim = 0.6) {
      return make(celFragment, { uBright: { value: bright }, uRim: { value: rim } });
    },
    /** Light: one colour at its foot, another at its top. */
    glow(color, color2 = color, power = 2) {
      return make(glowFragment, { uColor: { value: new THREE.Color(...color) }, uColor2: { value: new THREE.Color(...color2) }, uPower: { value: power } });
    },
    /** How much the glowing parts of things glow now: 0 at noon, 1 at dusk. */
    setDusk(dusk) {
      const g = 0.25 + 0.75 * dusk;
      prop.uniforms.uGlow.value = g;
      for (const m of lights) m.uniforms.uGlow.value = g;
    },
    forget(material) {
      const i = lights.indexOf(material);
      if (i >= 0) lights.splice(i, 1);
      material.dispose();
    },
  };
}
