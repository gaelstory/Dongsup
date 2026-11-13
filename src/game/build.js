// What you build on your land. A thing put down is a site first, drawn as a sketch of itself that fills in from
// the ground as it is worked on, by you or by spirits; finished, it stands there until you take it down. Each
// mows the meadow under it and can't be walked through.
import * as THREE from 'three';
import { pathDistance } from '../valley/world.js';
import { BUILDINGS, HOME } from './data.js';
import { buildingGeometry, flameGeometry } from './models.js';

const UP = new THREE.Vector3(0, 1, 0);

export function createBuilder({ field, paints, physics, RAPIER, trees, stones }) {
  const group = new THREE.Group();
  const list = [];
  let nextId = 1;
  const flamePaint = paints.glow([2.6, 0.7, 0.12], [2.8, 2.0, 0.5], 1.5);

  // ---- the meadow under a building ---------------------------------------------------------------------------
  const state = field.state;
  const footprint = (b) => {
    const def = BUILDINGS[b.type] ?? { r: 1.2, solid: 0.5 };
    if (Array.isArray(def.solid)) {
      const [hx, , hz] = def.solid;
      const along = hx > hz ? [Math.cos(b.rot), -Math.sin(b.rot)] : [Math.sin(b.rot), Math.cos(b.rot)];
      const long = Math.max(hx, hz);
      const short = Math.min(hx, hz);
      const reach = Math.max(0, long - short);
      return { ax: b.x - along[0] * reach, az: b.z - along[1] * reach, bx: b.x + along[0] * reach, bz: b.z + along[1] * reach, width: 2 * short + 0.7 };
    }
    return { ax: b.x, az: b.z, bx: b.x, bz: b.z, width: 2 * def.r * (def.solid === null ? 0.95 : 0.8) + 0.3 };
  };
  const mow = (b) => {
    const f = footprint(b);
    state.cutLine(f.ax, f.az, f.bx, f.bz, f.width, 0.03, 0.03);
    state.cutEvents.length = 0;
  };
  /** Lets the grass stand again where something stood. */
  const regrow = (b) => {
    const f = footprint(b);
    const { N, cell, data } = state;
    const r = f.width / 2 + Math.hypot(f.bx - f.ax, f.bz - f.az) / 2 + 0.3;
    const cx = ((f.ax + f.bx) / 2 - state.minX) / cell;
    const cz = ((f.az + f.bz) / 2 - state.minZ) / cell;
    const i0 = Math.max(2, Math.floor(cx - r / cell));
    const i1 = Math.min(N - 3, Math.ceil(cx + r / cell));
    const j0 = Math.max(2, Math.floor(cz - r / cell));
    const j1 = Math.min(N - 3, Math.ceil(cz + r / cell));
    if (i0 > i1 || j0 > j1) return;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) data[(i + j * N) * 4 + 2] = 255;
    state.dirty.add(i0, j0, i1, j1);
    // (and whatever else stands in that square is mown again)
    for (const other of list) if (other !== b && Math.hypot(other.x - b.x, other.z - b.z) < r + 6) mow(other);
    for (const fixed of fixtures) mow(fixed);
  };

  // ---- the shade of what is built, on the meadow ----------------------------------------------------------------
  // Kept in the spare channel of the meadow's state map (255 is no shade), which the grass and the ground read. A
  // building's shade is a soft shape lying away from the sun, as long as the hour makes it.
  let shaded = [];
  let shadeStale = true;
  function castShade(sunDir) {
    const { N, cell, data } = state;
    for (const [i0, j0, i1, j1] of shaded) {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) data[(i + j * N) * 4 + 3] = 255;
      state.dirty.add(i0, j0, i1, j1);
    }
    shaded = [];
    shadeStale = false;
    const flat = Math.hypot(sunDir.x, sunDir.z) || 1e-3;
    const ax = -sunDir.x / flat;
    const az = -sunDir.z / flat;
    const slope = flat / Math.max(sunDir.y, 0.1);
    for (const b of [...fixtures, ...list]) {
      const def = BUILDINGS[b.type];
      const top = buildingGeometry(b.type).userData.top * (b.fixed || b.done ? 1 : Math.max(0.15, b.work / def.work));
      if (top < 0.25) continue;
      const solid = def?.solid;
      const wide = b.fixed ? 0.45 : Array.isArray(solid) ? Math.hypot(solid[0], solid[2]) * 0.72 : Math.max(def.r * 0.62, 0.3);
      const long = Math.min(15, top * slope * 0.8);
      const reach = wide + 0.6;
      const i0 = Math.max(2, Math.floor((Math.min(b.x, b.x + ax * long) - reach - state.minX) / cell));
      const i1 = Math.min(N - 3, Math.ceil((Math.max(b.x, b.x + ax * long) + reach - state.minX) / cell));
      const j0 = Math.max(2, Math.floor((Math.min(b.z, b.z + az * long) - reach - state.minZ) / cell));
      const j1 = Math.min(N - 3, Math.ceil((Math.max(b.z, b.z + az * long) + reach - state.minZ) / cell));
      if (i0 > i1 || j0 > j1) continue;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const dx = state.minX + (i + 0.5) * cell - b.x;
          const dz = state.minZ + (j + 0.5) * cell - b.z;
          const t = Math.min(long, Math.max(0, dx * ax + dz * az));
          const d = Math.hypot(dx - ax * t, dz - az * t);
          // narrower and fainter towards its far end, soft all round
          const k = long > 0 ? t / long : 0;
          const r = wide * (1 - 0.25 * k);
          const s = (1 - Math.min(1, Math.max(0, (d - r * 0.55) / (r * 0.6 + 0.35)))) * (1 - 0.55 * k * k);
          if (s <= 0) continue;
          const v = Math.round(255 * (1 - s * s * (3 - 2 * s)));
          const at = (i + j * N) * 4 + 3;
          if (v < data[at]) data[at] = v;
        }
      }
      state.dirty.add(i0, j0, i1, j1);
      shaded.push([i0, j0, i1, j1]);
    }
  }

  // ---- what stands there from the first day: the basket, a signpost, the stakes round the edge -----------------
  const basket = { type: 'basket', x: HOME.x + 2.2, z: HOME.z + 1.2, rot: 0.5, fixed: true };
  const sign = { type: 'sign', x: HOME.x + 3.6, z: HOME.z + 0.2, rot: 0.9, fixed: true };
  const fixtures = [basket, sign];
  for (const f of fixtures) {
    f.y = field.heightAt(f.x, f.z);
    const mesh = new THREE.Mesh(buildingGeometry(f.type), paints.prop);
    mesh.position.set(f.x, f.y, f.z);
    mesh.rotation.y = f.rot;
    group.add(mesh);
    physics.createCollider(RAPIER.ColliderDesc.cylinder(0.6, f.type === 'basket' ? 0.45 : 0.1).setTranslation(f.x, f.y + 0.6, f.z));
  }
  {
    const n = 30;
    const stakes = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = HOME.x + Math.cos(a) * HOME.r;
      const z = HOME.z + Math.sin(a) * HOME.r;
      if (pathDistance(x, z) < 2.2) continue;
      stakes.push([x, z, a]);
    }
    const mesh = new THREE.InstancedMesh(buildingGeometry('marker'), paints.prop, stakes.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    stakes.forEach(([x, z, a], i) => {
      m.compose(new THREE.Vector3(x, field.heightAt(x, z), z), q.setFromAxisAngle(UP, -a), new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- the ghost: what you are about to put down ----------------------------------------------------------------
  const ghostPaint = paints.propOwn();
  ghostPaint.uniforms.uGhost.value = 1;
  const ghost = new THREE.Mesh(buildingGeometry('campfire'), ghostPaint);
  ghost.visible = false;
  ghost.frustumCulled = false;
  group.add(ghost);

  const solidOf = (type) => BUILDINGS[type].solid;
  function collide(b) {
    const solid = solidOf(b.type);
    if (!solid) return null;
    if (Array.isArray(solid)) {
      const [hx, hy, hz] = solid;
      return physics.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, hy, hz)
          .setTranslation(b.x, b.y + hy, b.z)
          .setRotation({ x: 0, y: Math.sin(b.rot / 2), z: 0, w: Math.cos(b.rot / 2) }),
      );
    }
    return physics.createCollider(RAPIER.ColliderDesc.cylinder(1, solid).setTranslation(b.x, b.y + 1, b.z));
  }

  function finish(b) {
    b.done = true;
    b.work = BUILDINGS[b.type].work;
    if (b.material !== paints.prop && b.type !== 'cairn') {
      paints.forget(b.material);
      b.material = b.mesh.material = paints.prop;
    } else if (b.material !== paints.prop) b.material.uniforms.uBuilt.value = 1;
    if (b.type === 'campfire' && !b.flame) {
      b.flame = new THREE.Mesh(flameGeometry(), flamePaint);
      b.flame.position.set(0, 0.14, 0);
      b.mesh.add(b.flame);
    }
  }

  const api = {
    group,
    list,
    basket,
    /** Puts a building down. `saved` is one from a saved game: { id, type, x, z, rot, work, done, data }. */
    add({ id = nextId, type, x, z, rot = 0, work = 0, done = false, data = {} }) {
      nextId = Math.max(nextId, id + 1);
      const geometry = buildingGeometry(type);
      const material = paints.propOwn();
      material.uniforms.uTop.value = geometry.userData.top;
      material.uniforms.uTint.value.setRGB(1.0, 0.92, 0.7);
      const mesh = new THREE.Mesh(geometry, material);
      const b = { id, type, x, z, y: field.heightAt(x, z), rot, work, done: false, data, mesh, material, r: BUILDINGS[type].r, flame: null, gone: false };
      mesh.position.set(b.x, b.y, b.z);
      mesh.rotation.y = rot;
      mesh.frustumCulled = false;
      group.add(mesh);
      b.collider = collide(b);
      mow(b);
      list.push(b);
      shadeStale = true;
      material.uniforms.uBuilt.value = work / BUILDINGS[type].work;
      if (done) finish(b);
      return b;
    },
    /** Takes a building away. */
    remove(b) {
      const i = list.indexOf(b);
      if (i < 0) return;
      list.splice(i, 1);
      b.gone = true;
      group.remove(b.mesh);
      if (b.material !== paints.prop) paints.forget(b.material);
      if (b.collider) physics.removeCollider(b.collider, false);
      regrow(b);
      shadeStale = true;
    },
    /** Some building done on a site, in seconds of one pair of hands. True if that finished it. */
    workOn(b, seconds) {
      if (b.done || b.gone) return false;
      b.work = Math.min(BUILDINGS[b.type].work, b.work + seconds);
      b.material.uniforms.uBuilt.value = b.work / BUILDINGS[b.type].work;
      if (b.work < BUILDINGS[b.type].work) return false;
      finish(b);
      shadeStale = true;
      return true;
    },
    sites: () => list.filter((b) => !b.done),
    done: (type) => list.filter((b) => b.done && b.type === type),
    /** Whether a building of this type may go at (x, z): { ok } or { ok: false, why }. */
    canPlace(type, x, z) {
      const def = BUILDINGS[type];
      if (Math.hypot(x - HOME.x, z - HOME.z) + def.r > HOME.r) return { ok: false, why: '내 땅 밖이에요' };
      if (type !== 'path' && pathDistance(x, z) < def.r * 0.6 + 1.0) return { ok: false, why: '길을 막으면 안 돼요' };
      for (const [tx, tz, kind, scale] of trees.trees) {
        if (kind > 3 && kind < 7) continue;
        const gap = kind === 0 ? 1.6 : kind > 3 ? 1.0 * scale : 0.7 * scale;
        if (Math.hypot(tx - x, tz - z) < gap + def.r * 0.8) return { ok: false, why: kind > 3 ? '덤불이 있어요' : '나무가 있어요' };
      }
      for (const [sx, sz, gap] of stones.solid) if (Math.hypot(sx - x, sz - z) < gap + def.r * 0.8) return { ok: false, why: '바위가 있어요' };
      for (const f of fixtures) if (Math.hypot(f.x - x, f.z - z) < def.r * 0.8 + 0.7) return { ok: false, why: '자리가 좁아요' };
      for (const b of list) {
        const gap = type === 'path' || b.type === 'path' ? 0.5 : (def.r + b.r) * 0.82;
        if (Math.hypot(b.x - x, b.z - z) < gap) return { ok: false, why: '다른 것과 너무 가까워요' };
      }
      // the ground under it must be nearly level
      const e = def.r * 0.75;
      const hs = [field.heightAt(x - e, z - e), field.heightAt(x + e, z - e), field.heightAt(x - e, z + e), field.heightAt(x + e, z + e)];
      if (Math.max(...hs) - Math.min(...hs) > 0.3 + def.r * 0.28) return { ok: false, why: '너무 가파른 곳이에요' };
      return { ok: true };
    },
    /** Shows what would be built at (x, z), green if it may be and red if not. `type` null puts the ghost away. */
    showGhost(type, x = 0, z = 0, rot = 0, ok = true, over = false) {
      ghost.visible = !!type;
      if (!type) return;
      ghost.geometry = buildingGeometry(type);
      ghost.position.set(x, field.heightAt(x, z), z);
      ghost.rotation.y = rot;
      // (laid over a thing that stands there, it is a shade bigger, so it is the one seen)
      ghost.scale.setScalar(over ? 1.035 : 1);
      ghostPaint.uniforms.uTint.value.setRGB(...(ok ? [0.62, 0.95, 0.66] : [1.0, 0.52, 0.46]));
    },
    /** The building nearest (x, z) within reach of its edge, or null. */
    nearest(x, z, reach = 1.5) {
      let best = null;
      let bestD = 1e9;
      for (const b of list) {
        const d = Math.hypot(b.x - x, b.z - z) - b.r * 0.8;
        if (d < reach && d < bestD) {
          best = b;
          bestD = d;
        }
      }
      return best;
    },
    /** After anything has wiped the meadow's memory: mows under everything again. */
    mowAll() {
      for (const f of fixtures) mow(f);
      for (const b of list) mow(b);
      shaded = [];
      shadeStale = true;
    },
    /** Where things stand, for whoever must keep clear of them: [{ x, z, r }]. */
    footprints: () => [...fixtures.map((f) => ({ x: f.x, z: f.z, r: 0.7 })), ...list.map((b) => ({ x: b.x, z: b.z, r: Array.isArray(BUILDINGS[b.type].solid) ? Math.hypot(BUILDINGS[b.type].solid[0], BUILDINGS[b.type].solid[2]) : b.r * 0.9 }))],
    /** Lays the shade of everything built for this sun, if the sun has moved or something has changed. */
    shade(sunDir, moved) {
      if (shadeStale || moved) castShade(sunDir);
    },
    /** Light in the air round what burns and shines: more as the day goes. */
    glow(glows, clock, dusk) {
      for (const b of list) {
        if (!b.done) continue;
        if (b.type === 'campfire') glows.add(b.x, b.y + 0.55, b.z, 3.2 + 0.25 * Math.sin(clock * 9 + b.id), [1.0, 0.5, 0.16], 0.16 + 0.5 * dusk);
        else if (b.type === 'lantern') glows.add(b.x + Math.cos(b.rot) * 0.3, b.y + 1.87, b.z - Math.sin(b.rot) * 0.3, 1.9, [1.0, 0.72, 0.36], 0.75 * dusk);
        else if (b.type === 'cairn') glows.add(b.x, b.y + 2.16, b.z, 2.6 + 0.2 * Math.sin(clock * 2 + b.id), [1.0, 0.92, 0.55], 0.25 + 0.6 * dusk);
        else if (b.type === 'hut') glows.add(b.x + Math.cos(b.rot) * 0.72 + Math.sin(b.rot) * 0.72, b.y + 0.74, b.z - Math.sin(b.rot) * 0.72 + Math.cos(b.rot) * 0.72, 1.1, [1.0, 0.75, 0.4], 0.5 * dusk);
        else if (b.type === 'cabin') glows.add(b.x + Math.cos(b.rot) * 1.0 + Math.sin(b.rot) * 1.95, b.y + 1.62, b.z - Math.sin(b.rot) * 1.0 + Math.cos(b.rot) * 1.95, 2.4, [1.0, 0.74, 0.4], 0.55 * dusk);
      }
    },
    /** @param near { x, z }: the fire nearest there lights the grass round it */
    update(dt, clock, dusk, near) {
      let fire = null;
      let fireD = 60;
      for (const b of list) {
        if (!b.flame) continue;
        const f = 0.85 + 0.15 * Math.sin(clock * 11 + b.id) + 0.1 * Math.sin(clock * 23.7 + b.id * 3);
        b.flame.scale.set(0.9 + 0.25 * dusk + 0.08 * Math.sin(clock * 17 + b.id), f * (1 + 0.35 * dusk), 0.9 + 0.25 * dusk);
        b.flame.rotation.y = clock * 1.3;
        const d = Math.hypot(b.x - near.x, b.z - near.z);
        if (d < fireD) {
          fire = b;
          fireD = d;
        }
      }
      if (fire) field.setLamp(fire.x, fire.y + 0.5, fire.z, (0.25 + 1.1 * dusk) * (0.9 + 0.1 * Math.sin(clock * 13)));
      else field.setLamp(0, 0, 0, 0);
    },
    serialize: () => list.map((b) => ({ id: b.id, type: b.type, x: +b.x.toFixed(2), z: +b.z.toFixed(2), rot: +b.rot.toFixed(3), work: +b.work.toFixed(1), done: b.done, data: b.data })),
  };
  return api;
}
