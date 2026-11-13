// Soft light in the air: the shine round a spirit, the warmth round a fire or a lantern at dusk. Each is a round
// glow that always faces the eye and adds its colour to the picture. They are set afresh every frame by whoever
// owns them: begin(), add() for each, end().
import * as THREE from 'three';
import { COMMON } from '../lib/index.js';
import { ADDITIVE } from './paint.js';

const vertex = /* glsl */ `
${COMMON}
in vec4 aAt;   // where, and how big across (metres)
in vec4 aCol;  // colour, and how tight its heart is (0 a soft haze, 1 a spark)
out vec2 vQ;
out vec4 vCol;
void main() {
  vec3 cr = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // (a haze hangs a little behind the thing that glows, so the thing itself is still clearly seen in the middle of
  // its light; a spark is itself the thing, and comes a little forward)
  vec3 at = aAt.xyz + normalize(uCamPos - aAt.xyz) * (aCol.a > 0.5 ? 0.1 : -min(0.45, aAt.w * 0.3));
  vec3 world = at + (cr * position.x + cu * position.y) * aAt.w;
  vQ = position.xy * 2.0;
  float dist = distance(at, uCamPos);
  vCol = vec4(aCol.rgb * (1.0 - smoothstep(90.0, 140.0, dist)), aCol.a);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
const fragment = /* glsl */ `
precision highp float;
in vec2 vQ;
in vec4 vCol;
layout(location = 0) out vec4 outC;
void main() {
  float d2 = dot(vQ, vQ);
  if (d2 > 1.0) discard;
  float soft = (1.0 - d2) * (1.0 - d2);
  float heart = exp(-d2 * 26.0);
  outC = vec4(vCol.rgb * (soft * (1.0 - 0.6 * vCol.a) + heart * vCol.a * 2.0), 0.0);
}
`;

export function createGlows(field, max = 320) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  const at = new Float32Array(max * 4);
  const col = new Float32Array(max * 4);
  const atAttribute = new THREE.InstancedBufferAttribute(at, 4).setUsage(THREE.DynamicDrawUsage);
  const colAttribute = new THREE.InstancedBufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aAt', atAttribute);
  geometry.setAttribute('aCol', colAttribute);
  geometry.instanceCount = 0;
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: field.uniforms, vertexShader: vertex, fragmentShader: fragment, ...ADDITIVE }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  let n = 0;
  return {
    mesh,
    begin() {
      n = 0;
    },
    /** A glow at (x, y, z), `size` metres across, of a colour times `power`; `spark` 0 for a haze, 1 for a point. */
    add(x, y, z, size, color, power = 1, spark = 0) {
      if (n >= max || power <= 0.002) return;
      at.set([x, y, z, size], n * 4);
      col.set([color[0] * power, color[1] * power, color[2] * power, spark], n * 4);
      n++;
    },
    end() {
      geometry.instanceCount = n;
      atAttribute.needsUpdate = true;
      colAttribute.needsUpdate = true;
    },
  };
}
