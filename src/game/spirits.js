// The spirits. Wild ones wait about the valley, each in the kind of place its kind keeps to, and ask for a gift.
// One that has had its gift is a friend: it comes to your land, and does whatever work you give it, going out to
// the trees or the stones and bringing what it finds back to the basket.
import * as THREE from 'three';
import { fromValley, paint, pathDistance, TARN, tarnDistance, TREE } from '../valley/world.js';
import { HOME, ITEMS, JOBS, SPIRIT_NAMES, SPIRITS } from './data.js';
import { spiritGeometry } from './models.js';
import { Shape } from './paint.js';

const TAU = Math.PI * 2;
const HOVER = 0.62; // how far off the ground one floats: over the grass
const SPEED = 3.4;

/**
 * @param o.field, o.paints, o.nodes
 * @param o.sites () => building sites not yet finished: [{ x, z, r }]
 * @param o.work (site, seconds) a spirit has built for that long
 * @param o.deposit (item, count) a spirit has brought this to the basket
 * @param o.basket { x, z } where the basket stands
 * @param o.campfires () => [{ x, z }] the fires that burn on your land
 */
export function createSpirits({ field, paints, nodes, sites, work, deposit, basket, campfires }) {
  const group = new THREE.Group();
  const list = [];
  const material = paints.celOwn(1.18);
  const carried = {};
  const carryGeometry = (item) => {
    if (!carried[item]) carried[item] = new Shape().ball(0.11, { color: ITEMS[item].color }, 1).build();
    return carried[item];
  };
  let nextId = 1;

  // where each kind of work is done, nearest your land first
  const byHome = (type, n) =>
    nodes
      .of(type)
      .map((p) => ({ x: p.x, z: p.z, r: p.reach ?? 0.8, d: Math.hypot(p.x - HOME.x, p.z - HOME.z) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      // (not one much farther off than the nearest: a trip should be a short one)
      .filter((p, i, all) => p.d < all[0].d * 1.6 + 12);
  const spots = { wood: byHome('tree', 4), stone: byHome('rock', 4), forage: byHome('bush', 5), clay: byHome('clay', 3) };
  const meadowSpot = () => {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU;
      const d = 14 + Math.random() * 22;
      const x = HOME.x + Math.cos(a) * d;
      const z = HOME.z + Math.sin(a) * d;
      if (paint(x, z).growth > 0.9) return { x, z, r: 0.4 };
    }
    return { x: HOME.x + 16, z: HOME.z, r: 0.4 };
  };

  function make(kind, name, x, z, friend, job = 'rest', id = nextId) {
    nextId = Math.max(nextId, id + 1);
    const k = SPIRITS[kind];
    const mesh = new THREE.Mesh(spiritGeometry(kind, k.body, k.accent), material);
    mesh.frustumCulled = false;
    const load = new THREE.Mesh(carryGeometry('wood'), paints.prop);
    load.position.set(0, 0.98, 0);
    load.visible = false;
    mesh.add(load);
    group.add(mesh);
    const s = { id, kind, name, friend, job, x, z, y: field.heightAt(x, z), yaw: Math.random() * TAU, mesh, load, state: 'idle', timer: Math.random() * 2, goal: null, site: null, carry: null, phase: Math.random() * TAU, home: { x, z }, joy: 0, busy: 0 };
    list.push(s);
    return s;
  }

  /** A place of the kind a spirit of this kind keeps to, or null if there is none now. */
  function habitat(kind, taken) {
    const free = (x, z) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > 30) && tarnDistance(x, z) > 1.05;
    const pick = (points, gap) => {
      for (let i = 0; i < 40; i++) {
        const p = points[Math.floor(Math.random() * points.length)];
        if (!p) return null;
        const a = Math.random() * TAU;
        const x = p.x + Math.cos(a) * gap;
        const z = p.z + Math.sin(a) * gap;
        if (free(x, z)) return { x, z };
      }
      return null;
    };
    const away = (p) => {
      const d = Math.hypot(p.x - HOME.x, p.z - HOME.z);
      return d > 55 && d < 380;
    };
    switch (SPIRITS[kind].where) {
      case 'grove':
        return pick(nodes.of('tree').filter((p) => !p.great && away(p)), 3.5);
      case 'stones':
        return pick(nodes.of('rock').filter(away), 2.6);
      case 'flowers':
        return pick(nodes.of('flower').filter(away), 1.8);
      case 'tarn': {
        for (let i = 0; i < 60; i++) {
          const x = TARN.at[0] + (Math.random() - 0.5) * 130;
          const z = TARN.at[1] + (Math.random() - 0.5) * 130;
          const t = tarnDistance(x, z);
          if (t > 1.08 && t < 1.3 && free(x, z)) return { x, z };
        }
        return null;
      }
      case 'hill': {
        for (let i = 0; i < 60; i++) {
          const [x, z] = fromValley(-90 + Math.random() * 200, (Math.random() - 0.5) * 300);
          if (away({ x, z }) && pathDistance(x, z) > 4 && paint(x, z).growth > 0.9 && free(x, z)) return { x, z };
        }
        return null;
      }
      case 'campfire': {
        const fires = campfires();
        if (!fires.length) return null;
        const f = fires[Math.floor(Math.random() * fires.length)];
        const a = Math.random() * TAU;
        return { x: f.x + Math.cos(a) * 2.3, z: f.z + Math.sin(a) * 2.3 };
      }
      default:
        return null;
    }
  }

  const moveTo = (s, x, z, dt, speed = SPEED, stop = 0.25) => {
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.hypot(dx, dz);
    if (d <= stop) return true;
    const step = Math.min(d - stop * 0.5, speed * dt);
    s.x += (dx / d) * step;
    s.z += (dz / d) * step;
    const want = Math.atan2(dx, dz);
    s.yaw += Math.atan2(Math.sin(want - s.yaw), Math.cos(want - s.yaw)) * Math.min(1, dt * 8);
    s.moving = true;
    return false;
  };
  const face = (s, x, z, dt) => {
    const want = Math.atan2(x - s.x, z - s.z);
    s.yaw += Math.atan2(Math.sin(want - s.yaw), Math.cos(want - s.yaw)) * Math.min(1, dt * 6);
  };
  const stroll = (s, cx, cz, radius, dt) => {
    s.timer -= dt;
    if (!s.goal || s.timer <= 0) {
      const a = Math.random() * TAU;
      const d = Math.sqrt(Math.random()) * radius;
      s.goal = { x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d };
      s.timer = 3 + Math.random() * 5;
    }
    moveTo(s, s.goal.x, s.goal.z, dt, 1.1, 0.3);
  };

  function updateFriend(s, dt, player) {
    if (s.state === 'follow') {
      // it comes along behind you until you are home
      const d = Math.hypot(player.x - s.x, player.z - s.z);
      if (d > 2.6) moveTo(s, player.x, player.z, dt, Math.min(9, Math.max(SPEED, d * 1.3)), 2.2);
      else face(s, player.x, player.z, dt);
      if (Math.hypot(s.x - HOME.x, s.z - HOME.z) < HOME.r - 8) {
        s.state = 'idle';
        s.goal = null;
      }
      return;
    }
    const job = JOBS[s.job];
    if (s.job === 'rest' || !job) {
      const fires = campfires();
      const by = fires[s.id % Math.max(1, fires.length)] ?? basket;
      stroll(s, by.x, by.z, 5, dt);
      return;
    }
    if (s.job === 'build') {
      if (!s.site || s.site.done || s.site.gone) {
        const open = sites();
        s.site = open.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0] ?? null;
      }
      if (!s.site) {
        stroll(s, basket.x, basket.z, 6, dt);
        return;
      }
      if (moveTo(s, s.site.x, s.site.z, dt, SPEED, s.site.r + 0.7)) {
        face(s, s.site.x, s.site.z, dt);
        s.busy = 1;
        work(s.site, dt * (SPIRITS[s.kind].best === 'build' ? 2 : 1));
      }
      return;
    }
    // a gathering job: out to the place, work there, back to the basket with what was found
    if (s.state === 'idle') {
      const choice = spots[s.job];
      s.goal = choice?.length ? choice[Math.floor(Math.random() * choice.length)] : meadowSpot();
      s.state = 'out';
    }
    if (s.state === 'out') {
      if (moveTo(s, s.goal.x, s.goal.z, dt, SPEED, s.goal.r + 0.5)) {
        s.state = 'work';
        s.timer = job.time;
      }
    } else if (s.state === 'work') {
      face(s, s.goal.x, s.goal.z, dt);
      s.busy = 1;
      s.timer -= dt;
      if (s.timer <= 0) {
        const item = job.gives[Math.floor(Math.random() * job.gives.length)];
        s.carry = { item, count: SPIRITS[s.kind].best === s.job ? 2 : 1 };
        s.load.geometry = carryGeometry(item);
        s.load.visible = true;
        s.state = 'back';
      }
    } else if (s.state === 'back') {
      if (moveTo(s, basket.x, basket.z, dt, SPEED, 1.1)) {
        deposit(s.carry.item, s.carry.count, s);
        s.carry = null;
        s.load.visible = false;
        s.state = 'idle';
        s.joy = 1;
      }
    }
  }

  function updateWild(s, dt, player) {
    const d = Math.hypot(player.x - s.x, player.z - s.z);
    if (d < 9) face(s, player.x, player.z, dt);
    else stroll(s, s.home.x, s.home.z, 3.5, dt);
  }

  return {
    group,
    list,
    /** Puts a wild spirit in the valley. With no place given it finds one of its own kind of place; null if it can't. */
    spawnWild(kind, at = null, name = null, id = undefined) {
      const where = at ?? habitat(kind, list.filter((s) => !s.friend));
      if (!where) return null;
      const used = new Set(list.map((s) => s.name));
      const free = SPIRIT_NAMES.filter((n) => !used.has(n));
      return make(kind, name ?? free[Math.floor(Math.random() * free.length)] ?? '정령', where.x, where.z, false, 'rest', id);
    },
    /** A friend from a saved game, put down at home. */
    addFriend({ id, kind, name, job }) {
      const a = Math.random() * TAU;
      return make(kind, name, basket.x + Math.cos(a) * 3, basket.z + Math.sin(a) * 3, true, job, id);
    },
    /** The first spirit anyone meets waits under the great tree. */
    firstPlace: () => ({ x: TREE[0] - 5.5, z: TREE[1] + 4.5 }),
    befriend(s) {
      s.friend = true;
      s.job = 'rest';
      s.state = 'follow';
      s.joy = 1;
    },
    setJob(s, job) {
      s.job = job;
      s.site = null;
      s.goal = null;
      if (s.state !== 'follow' && s.state !== 'back') s.state = 'idle';
    },
    /** Takes the wild ones away (a new day brings others). */
    clearWild() {
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].friend) continue;
        group.remove(list[i].mesh);
        list.splice(i, 1);
      }
    },
    nearest(x, z, reach = 2.6) {
      let best = null;
      let bestD = reach;
      for (const s of list) {
        const d = Math.hypot(s.x - x, s.z - z);
        if (d < bestD) {
          best = s;
          bestD = d;
        }
      }
      return best;
    },
    update(dt, player, clock) {
      for (const s of list) {
        s.moving = false;
        s.busy = 0;
        if (s.friend) updateFriend(s, dt, player);
        else updateWild(s, dt, player);
        s.joy = Math.max(0, s.joy - dt * 0.8);
        s.y = field.heightAt(s.x, s.z);
        s.phase += dt * (s.moving ? 5 : 2.4);
        const bob = Math.sin(s.phase) * 0.07 + Math.abs(Math.sin(clock * 9 + s.id)) * 0.16 * s.busy + Math.abs(Math.sin(s.joy * 9)) * 0.35 * s.joy;
        s.mesh.position.set(s.x, s.y + HOVER + bob, s.z);
        // it leans into its going, and sways a little when it stays
        s.mesh.rotation.set(s.moving ? 0.22 : 0, s.yaw, Math.sin(s.phase * 0.5) * 0.06 + (s.busy ? Math.sin(clock * 9 + s.id) * 0.18 : 0));
        const squash = 1 + Math.sin(s.phase * 2) * 0.03;
        s.mesh.scale.set(1 / squash, squash, 1 / squash);
      }
    },
  };
}
