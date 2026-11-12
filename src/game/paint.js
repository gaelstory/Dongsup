// How the game's own things are drawn so they belong in the valley: buildings and what lies on the ground as paint
// (two tones, a narrow turn between them, taking the valley's light), spirits and animals as cel (flat colour and
// an inked line, like the wanderer). A Shape gathers boxes, balls and cones into one mesh, each part with its own
// colour.
import * as THREE from 'three';
import { COMMON } from '../lib/index.js';

/** The colour a paint goes in the shade: cooler and deeper, not just darker. */
export const shadeOf = ([r, g, b]) => [r * 0.5 + 0.02, g * 0.5 + 0.03, b * 0.58 + 0.06];

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
   * o.shade its paint out of it (worked out if not given), o.ink its number for the inked line (cel things only).
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

  box(w, h, d, o) {
    return this.add(new THREE.BoxGeometry(w, h, d), o);
  }

  /** A cylinder standing on its end: radius at the top, at the bottom, height, sides. */
  cyl(top, bottom, h, sides = 8, o = {}) {
    return this.add(new THREE.CylinderGeometry(top, bottom, h, sides), o);
  }

  cone(r, h, sides = 8, o = {}) {
    return this.add(new THREE.ConeGeometry(r, h, sides), o);
  }

  ball(r, o = {}, detail = 1) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), o);
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

const vertex = /* glsl */ `
${COMMON}
in vec3 aLit;
in vec3 aShade;
in float aInk;
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
  vWorld = w.xyz;
  vN = normalize(mat3(m) * normal);
  vLit = aLit;
  vShade = aShade;
  vUp = position.y;
  vInk = aInk;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

// Paint: for what stands still. uBuilt is how much of it is finished, from the ground up (the rest is drawn as a
// sketch of itself); uGhost draws all of it that way, in uTint, for a thing not yet put down.
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
  float lit = smoothstep(0.0, 0.12, dot(N, uSunDir) + 0.05) * smoothstep(0.4, 0.75, open);
  // (the shade's light is the sky's with most of its blue taken out: wood in shade should still be wood)
  vec3 sky = mix(uSkyColor, vec3(dot(uSkyColor, vec3(0.333))), 0.6) * 1.3 + 0.06;
  vec3 col = mix(vShade * sky, vLit * (uSunColor * 0.36 + uSkyColor * 0.4), lit);
  // a part marked to glow (a lantern's pane, an ember) gives its own light, more as the day goes
  col += vLit * vInk * uGlow * 2.6;
  float a = 1.0;
  bool sketch = uGhost > 0.5 || vUp > uBuilt * uTop;
  if (sketch) {
    ivec2 px = ivec2(gl_FragCoord.xy) / 2;
    if (((px.x + px.y) & 1) == 0) discard;
    float tone = dot(col, vec3(0.3, 0.5, 0.2));
    col = mix(col, uTint * (0.35 + tone), uGhost > 0.5 ? 0.75 : 0.55);
    a = 0.5;
  }
  outC = vec4(applyFog(col, vWorld), a);
}
`;

// Cel: for what is alive. Two tones and nothing between, and each part writes its number into alpha for the line.
const celFragment = /* glsl */ `
${COMMON}
uniform float uBright;
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
  float lit = smoothstep(0.0, 0.035, dot(N, uSunDir) + 0.1) * open;
  vec3 sun = uSunColor * 0.42 + uSkyColor * 0.3;
  float grey = dot(uSkyColor, vec3(0.333));
  vec3 sky = mix(uSkyColor, vec3(grey), 0.8) * 1.15 + 0.2;
  vec3 col = mix(vShade * sky, vLit * sun, lit) * uBright;
  outC = vec4(applyFog(col, vWorld), vInk);
}
`;

// Light itself: a flame, a spark, a spirit's glimmer. Bright enough to bloom, and left alone by the paint finish.
const glowVertex = /* glsl */ `
${COMMON}
out vec3 vWorld;
out float vUp;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 w = m * vec4(position, 1.0);
  vWorld = w.xyz;
  vUp = position.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
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
  const make = (fragmentShader, uniforms, extra = {}) =>
    new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms: { ...field.uniforms, ...uniforms }, vertexShader: vertex, fragmentShader, ...extra });
  const propUniforms = () => ({ uBuilt: { value: 1 }, uTop: { value: 1000 }, uGhost: { value: 0 }, uTint: { value: new THREE.Color(0.4, 1, 0.5) }, uGlow: { value: 0 } });
  const prop = make(propFragment, propUniforms());
  const cel = make(celFragment, { uBright: { value: 1 } });
  const lights = [];
  return {
    /** For anything that stands still and is whole. Shared. */
    prop,
    /** A paint of its own for one thing, so it can be half built, or a ghost, or glow. */
    propOwn() {
      const m = make(propFragment, propUniforms());
      lights.push(m);
      return m;
    },
    /** For spirits and animals. Shared. */
    cel,
    /** A cel paint of its own, for one that should shine a little (a spirit). */
    celOwn(bright = 1) {
      return make(celFragment, { uBright: { value: bright } });
    },
    /** Light: one colour at its foot, another at its top. */
    glow(color, color2 = color, power = 2) {
      return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        side: THREE.DoubleSide,
        uniforms: { ...field.uniforms, uColor: { value: new THREE.Color(...color) }, uColor2: { value: new THREE.Color(...color2) }, uPower: { value: power } },
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
      });
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
