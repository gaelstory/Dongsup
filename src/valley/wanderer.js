// The wanderer in the valley: Patch's starter man under a wide straw hat and a long blue cloak. The land is painted
// like a film's backgrounds, and he is drawn the way a film draws the people who walk in front of them: flat colour
// in two tones, light and shade, with a clean turn between them and an inked line round every part. The colour is
// here; the line is drawn by the frame's last pass (src/lib/frame.js), round whatever writes one of the small
// alphas below, which also tells the paint finish to leave him as he is.
import * as THREE from 'three';
import { Cloak } from '../figure/cloak.js';
import { loadMan } from '../figure/man.js';
import { COMMON } from '../lib/index.js';

const fragment = /* glsl */ `
${COMMON}
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uLit2;
uniform vec3 uShade2;
uniform float uSplit;
uniform vec2 uInk;
uniform float uInside;
in vec3 vWorld;
in vec3 vN;
in vec3 vBind;
in float vFold;
in vec2 vCloth;
uniform vec3 uTrim;
layout(location = 0) out vec4 outC;
void main() {
  vec3 N = normalize(vN);
  // (which side is seen is asked of the normal, not of the triangle: the hat and the cloth are wound as they come)
  bool back = dot(N, uCamPos - vWorld) < 0.0;
  if (back) N = -N;
  bool lower = vBind.y < uSplit;
  // in the light or out of it, and nothing between: a figure in a film is two tones
  // (the shade of trees and clouds, but not his own shadow on the ground, which he stands in the middle of)
  float open = smoothstep(0.35, 0.6, openAt(vWorld.xz));
  float lit = smoothstep(0.0, 0.035, dot(N, uSunDir) + 0.06) * open;
  // the inside of a cloak is always in its own shade
  if (back && uInside > 0.5) lit = 0.0;
  // The folds of hanging cloth, as they are drawn: a few wedges of deeper colour rising from the hem, and the
  // bottom of whatever fold the wind or his walking has really put in it.
  float deep = 0.0;
  if (uInside > 0.5) {
    float across = vCloth.x * 5.0 + 0.2 * sin(vCloth.x * 23.0);
    float wedge = abs(fract(across) - 0.5);
    float rise = smoothstep(0.28, 1.0, vCloth.y);
    deep = (1.0 - smoothstep(0.13 * rise, 0.13 * rise + 0.012, wedge)) * step(0.3, vCloth.y);
    deep = max(deep, smoothstep(0.011, 0.014, back ? -vFold : vFold));
  }
  vec3 litPaint = lower ? uLit2 : uLit;
  vec3 shadePaint = lower ? uShade2 : uShade;
  // a band of another colour along the hem
  if (uInside > 0.5 && !back && vCloth.y > 0.935) {
    litPaint = uTrim;
    shadePaint = uTrim * vec3(0.66, 0.6, 0.7);
  }
  vec3 sun = uSunColor * 0.42 + uSkyColor * 0.3;
  // (the shade's light is nearly without colour: a shade colour is mixed as it should look, as cel paint is)
  float grey = dot(uSkyColor, vec3(0.333));
  vec3 sky = mix(uSkyColor, vec3(grey), 0.8) * 1.15 + 0.2;
  // three tones in all: in the light, in the shade, and the deep of a fold
  vec3 col = mix(shadePaint * sky, litPaint * sun, lit * (1.0 - deep));
  col = mix(col, shadePaint * sky * vec3(0.64, 0.64, 0.8), deep * (1.0 - lit));
  outC = vec4(applyFog(col, vWorld), lower ? uInk.y : uInk.x);
}
`;

const skinnedVertex = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
out vec3 vWorld;
out vec3 vN;
out vec3 vBind;
out float vFold;
out vec2 vCloth;
void main() {
  vFold = 0.0;
  vCloth = vec2(0.0);
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * objectNormal);
  vBind = position;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const plainVertex = /* glsl */ `
in float aFold;
out vec3 vWorld;
out vec3 vN;
out vec3 vBind;
out float vFold;
out vec2 vCloth;
void main() {
  vFold = aFold;
  vCloth = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vBind = vec3(0.0, 10.0, 0.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

// What he wears: [in the light, in the shade], as paint. The shade is a colour of its own, cooler and deeper, not
// the light one made darker.
export const CLOTHES = {
  CLOAK: [[0.14, 0.32, 0.64], [0.07, 0.13, 0.4]],
  HAT: [[0.95, 0.74, 0.34], [0.66, 0.46, 0.26]],
  SHIRT: [[0.92, 0.86, 0.72], [0.52, 0.52, 0.66]],
  TROUSERS: [[0.5, 0.33, 0.2], [0.27, 0.17, 0.14]],
  SKIN: [[0.95, 0.68, 0.5], [0.62, 0.36, 0.3]],
  BOOTS: [[0.3, 0.19, 0.12], [0.15, 0.09, 0.08]],
  HAIR: [[0.24, 0.15, 0.09], [0.11, 0.07, 0.07]],
  EYES: [[0.08, 0.06, 0.06], [0.06, 0.05, 0.06]],
};

// The alpha each part writes: its number for the line. Two parts with different numbers get a line between them;
// all of them are below anything else in the valley, so the line is only ever round him.
const INK = { CLOAK: 0.03, HAT: 0.06, HAIR: 0.09, BOOTS: 0.12, TROUSERS: 0.15, SHIRT: 0.18, SKIN: 0.21, EYES: 0.09 };

/**
 * @param field the valley's meadow: its uniforms are the light he stands in
 * @param onProgress 0 to 1 as his files arrive
 * @param clothes any of CLOTHES, to dress him otherwise
 */
export async function createWanderer(field, onProgress, clothes = {}) {
  const palette = { ...CLOTHES, ...clothes };
  const paint = (upper, { skinned = false, lower = upper, split = -10, inside = 0 } = {}) =>
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      side: THREE.DoubleSide,
      uniforms: {
        ...field.uniforms,
        uLit: { value: new THREE.Color(...palette[upper][0]) },
        uShade: { value: new THREE.Color(...palette[upper][1]) },
        uLit2: { value: new THREE.Color(...palette[lower][0]) },
        uShade2: { value: new THREE.Color(...palette[lower][1]) },
        uSplit: { value: split },
        uInk: { value: new THREE.Vector2(INK[upper], INK[lower]) },
        uInside: { value: inside },
        uTrim: { value: new THREE.Color(0.95, 0.78, 0.4) },
      },
      vertexShader: skinned ? skinnedVertex : plainVertex,
      fragmentShader: fragment,
    });

  const man = await loadMan({ base: './figure/', onProgress });
  for (const mesh of man.meshes) {
    const name = `${mesh.name} ${mesh.material?.name ?? ''}`;
    if (/eyebrow|eyelash/.test(name)) {
      mesh.visible = false;
      continue;
    }
    mesh.material = /casualsuit/.test(name)
      ? paint('SHIRT', { skinned: true, lower: 'TROUSERS', split: 0.98 })
      : /shoes/.test(name)
        ? paint('BOOTS', { skinned: true })
        : /short01/.test(name)
          ? paint('HAIR', { skinned: true })
          : /high-poly/.test(name)
            ? paint('EYES', { skinned: true })
            : paint('SKIN', { skinned: true });
    mesh.frustumCulled = false;
  }

  // the hat: a low crown and a wide brim, set on while he still stands in the pose he was made in
  man.object.updateMatrixWorld(true);
  const profile = [[0, 0.15], [0.05, 0.143], [0.095, 0.11], [0.118, 0.05], [0.125, 0.0], [0.21, -0.035], [0.3, -0.075], [0.37, -0.105]].map(([r, y]) => new THREE.Vector2(r, y));
  const hat = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), paint('HAT'));
  hat.position.set(0, 1.805, -0.012);
  hat.rotation.x = -0.1;
  man.object.add(hat);
  hat.updateMatrixWorld(true);
  man.bones.Head.attach(hat);

  // the cloak: cloth, moved by his walking and the valley's wind
  const cloak = new Cloak(man.bones);
  cloak.hat = hat;
  const { cols, rows } = cloak;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(cloak.p, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(cloak.normals, 3).setUsage(THREE.DynamicDrawUsage));
  const index = [];
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < cols; i++) {
      const k = i + j * cols;
      index.push(k, k + cols, k + 1, k + 1, k + cols, k + cols + 1);
    }
  }
  geometry.setIndex(index);
  // (where on the cloth: 0 to 1 round it, 0 at the collar to 1 at the hem)
  const where = new Float32Array(cols * rows * 2);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) where.set([i / (cols - 1), j / (rows - 1)], (i + j * cols) * 2);
  geometry.setAttribute('uv', new THREE.BufferAttribute(where, 2));
  // how deep in a fold each point of the cloth is: what a painter would shade
  const folds = new Float32Array(cols * rows);
  geometry.setAttribute('aFold', new THREE.BufferAttribute(folds, 1).setUsage(THREE.DynamicDrawUsage));
  const cloakMesh = new THREE.Mesh(geometry, paint('CLOAK', { inside: 1 }));
  cloakMesh.frustumCulled = false;

  const group = new THREE.Group();
  group.add(man.object, cloakMesh);
  return {
    man,
    hat,
    cloak,
    group,
    /** After he has moved: the cloth. `air(x, y, z, out)` is the wind there, `ground(x, z)` the land's height. */
    update(dt, air, ground) {
      cloak.update(dt, air, ground);
      // a fold's bottom is where the cloth to either side stands out from it, the way its outside faces
      const { p, normals } = cloak;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (i + j * cols) * 3;
          const l = (Math.max(i - 1, 0) + j * cols) * 3;
          const r = (Math.min(i + 1, cols - 1) + j * cols) * 3;
          folds[i + j * cols] = (p[l] + p[r] - 2 * p[k]) * normals[k] + (p[l + 1] + p[r + 1] - 2 * p[k + 1]) * normals[k + 1] + (p[l + 2] + p[r + 2] - 2 * p[k + 2]) * normals[k + 2];
        }
      }
      geometry.attributes.aFold.needsUpdate = true;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
    },
  };
}
