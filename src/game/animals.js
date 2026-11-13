// The animals of the valley. Each keeps to its own part of it. Run at one and it bolts; come up slowly, or stand
// still, and it lets you near enough to hold out something it likes. One that has eaten from your hand three times
// is a friend, and comes to the feeder on your land when there is something in it.
import * as THREE from 'three';
import { fromValley, tarnDistance } from '../valley/world.js';
import { ANIMAL_ORDER, ANIMALS } from './data.js';
import { animalGeometry } from './models.js';

const TAU = Math.PI * 2;

export function createAnimals({ field, paints, reach }) {
  const group = new THREE.Group();
  const list = [];
  for (const kind of ANIMAL_ORDER) {
    const k = ANIMALS[kind];
    const [hx, hz] = fromValley(...k.where);
    const mesh = new THREE.Mesh(animalGeometry(kind), paints.cel);
    mesh.frustumCulled = false;
    group.add(mesh);
    list.push({ kind, name: k.name, x: hx, z: hz, y: 0, yaw: Math.random() * TAU, home: { x: hx, z: hz }, wild: { x: hx, z: hz }, mesh, state: 'idle', timer: 1 + Math.random() * 3, goal: null, phase: 0, hearts: 0, fedDay: 0, met: false, pace: 0, glad: 0 });
  }
  const ok = (x, z) => tarnDistance(x, z) > 1.05 && Math.hypot(x, z) < reach - 6;

  return {
    group,
    list,
    nearest(x, z, r = 2.6) {
      let best = null;
      let bestD = r;
      for (const a of list) {
        const d = Math.hypot(a.x - x, a.z - z) - ANIMALS[a.kind].size * 0.3;
        if (d < bestD) {
          best = a;
          bestD = d;
        }
      }
      return best;
    },
    /** Where each lives today: at its own place, or by the feeder if it is a friend and has been asked. */
    setHome(a, at) {
      a.home = at ? { x: at.x, z: at.z } : { ...a.wild };
      a.x = a.home.x + (Math.random() - 0.5) * 4;
      a.z = a.home.z + (Math.random() - 0.5) * 4;
      a.state = 'idle';
      a.goal = null;
    },
    /**
     * @param player { x, z, speed }
     * @returns the animal that has just bolted from the player, if one has (so the game can say why)
     */
    update(dt, player) {
      let bolted = null;
      for (const a of list) {
        const k = ANIMALS[a.kind];
        const dx = a.x - player.x;
        const dz = a.z - player.z;
        const d = Math.hypot(dx, dz);
        const tame = a.hearts >= 2;
        // startled by someone coming fast
        if (a.state !== 'flee' && !tame && d < 7.5 && player.speed > 2.7) {
          a.state = 'flee';
          a.timer = 2.2 + Math.random();
          bolted = a;
        }
        a.pace = 0;
        if (a.state === 'flee') {
          a.timer -= dt;
          let fx = d > 0.01 ? dx / d : 1;
          let fz = d > 0.01 ? dz / d : 0;
          // (not into the water, and not for ever: it turns for home when it has gone far enough)
          const fromHome = Math.hypot(a.x - a.home.x, a.z - a.home.z);
          if (fromHome > k.roam * 2.2) {
            fx = (a.home.x - a.x) / fromHome;
            fz = (a.home.z - a.z) / fromHome;
          }
          const nx = a.x + fx * k.speed * dt;
          const nz = a.z + fz * k.speed * dt;
          if (ok(nx, nz)) {
            a.x = nx;
            a.z = nz;
          }
          a.yaw = Math.atan2(fx, fz);
          a.pace = 1;
          if (a.timer <= 0 && d > 11) a.state = 'idle';
        } else if (d < 3.2) {
          // someone is close and calm: it watches them
          const want = Math.atan2(-dx, -dz);
          a.yaw += Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)) * Math.min(1, dt * 5);
          a.state = 'idle';
          a.timer = Math.max(a.timer, 1);
        } else if (a.state === 'idle') {
          a.timer -= dt;
          if (a.timer <= 0) {
            for (let i = 0; i < 8; i++) {
              const ang = Math.random() * TAU;
              const r = Math.sqrt(Math.random()) * k.roam;
              const gx = a.home.x + Math.cos(ang) * r;
              const gz = a.home.z + Math.sin(ang) * r;
              if (ok(gx, gz)) {
                a.goal = { x: gx, z: gz };
                a.state = 'walk';
                break;
              }
            }
            a.timer = 2 + Math.random() * 5;
          }
        } else if (a.state === 'walk') {
          const gx = a.goal.x - a.x;
          const gz = a.goal.z - a.z;
          const gd = Math.hypot(gx, gz);
          if (gd < 0.4) a.state = 'idle';
          else {
            const speed = k.speed * 0.34;
            a.x += (gx / gd) * speed * dt;
            a.z += (gz / gd) * speed * dt;
            const want = Math.atan2(gx, gz);
            a.yaw += Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)) * Math.min(1, dt * 6);
            a.pace = 0.4;
          }
        }
        a.glad = Math.max(0, a.glad - dt * 0.7);
        a.y = field.heightAt(a.x, a.z);
        a.phase += dt * (4 + a.pace * 9);
        // it goes in hops: higher the faster, and a few on the spot when it is pleased
        const hop = Math.abs(Math.sin(a.phase)) * k.size * (0.05 + 0.3 * a.pace) * (a.pace > 0 ? 1 : 0) + Math.abs(Math.sin(a.glad * 10)) * 0.3 * a.glad;
        a.mesh.position.set(a.x, a.y + hop, a.z);
        a.mesh.rotation.set(a.pace > 0 ? -Math.cos(a.phase) * 0.12 * a.pace : Math.sin(a.phase * 0.25) * 0.02, a.yaw, 0);
      }
      return bolted;
    },
  };
}
