// The game played in the valley: gather what grows there, make friends of its spirits and animals, give the
// spirits work, and build a camp and a home on your land. This file is the rules and the day; what things are is
// in data.js, how they look in models.js, and each kind of thing has its own file beside this one.
import * as THREE from 'three';
import { SUNSET } from '../valley/sky.js';
import { createAnimals } from './animals.js';
import { createBuilder } from './build.js';
import { createFlora } from './flora.js';
import { createGlows } from './glow.js';
import { ANIMALS, BUILDINGS, DAY, GOALS, HOME, ITEM_ORDER, ITEMS, JOBS, SPIRIT_ORDER, SPIRITS } from './data.js';
import { createNodes, NODE_KINDS } from './nodes.js';
import { createPaints } from './paint.js';
import { createSpirits } from './spirits.js';
import { createTouch } from './touch.js';
import { createUI } from './ui.js';

const SAVE_KEY = 'spirit-valley-v1';
const RATE = (Math.min(DAY.to, SUNSET) - DAY.from) / DAY.seconds; // hours of the day to a second
const CAMP = ['campfire', 'tent', 'bench', 'table', 'lantern'];
const STARS = [3, 7, 12, 18, 26];

const fresh = () => ({ v: 1, day: 1, hour: DAY.from, inv: {}, buildings: [], spirits: [], wild: [], animals: {}, basket: {}, goals: [], met: [], slept: 0, gave: 0, tips: {} });

/** Short sounds, made here: a pick-up, a knock of building, a few rising notes when something good happens. */
function createChimes() {
  let ctx = null;
  const note = (freq, at, length, gain, type = 'sine') => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + at);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + at + length);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + at);
    o.stop(ctx.currentTime + at + length + 0.05);
  };
  const play = (notes) => {
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (ctx.state !== 'running') return;
      for (const n of notes) note(...n);
    } catch {
      // no sound is only no sound
    }
  };
  return {
    pick: () => play([[660, 0, 0.16, 0.07], [990, 0.06, 0.2, 0.06]]),
    knock: () => play([[170, 0, 0.09, 0.12, 'triangle'], [110, 0.01, 0.12, 0.1, 'triangle']]),
    no: () => play([[220, 0, 0.14, 0.06, 'triangle']]),
    good: () => play([[523, 0, 0.3, 0.07], [659, 0.1, 0.3, 0.07], [784, 0.2, 0.36, 0.07], [1047, 0.32, 0.5, 0.06]]),
    day: () => play([[392, 0, 0.5, 0.06], [523, 0.18, 0.5, 0.06], [659, 0.36, 0.7, 0.06]]),
  };
}

/**
 * @param o everything of the valley's the game touches: scene, camera, canvas, field, sky, trees, stones, physics,
 *   RAPIER, player ({ x, y, z }: where the walker is), reach (how far the walk goes), speed() (how fast the walker
 *   is going), setHour(hour, soft), standAt(x, z, yaw), bend (the walker pressing the grass), fresh (start a new
 *   game whatever is saved)
 */
export function createGame(o) {
  const { scene, camera, canvas, field, sky, trees, stones, physics, RAPIER, player, reach } = o;
  const handheld = !!o.touch;
  /** A word for a key, or for what a thumb presses instead. */
  const key = (keyboard, thumb) => (handheld ? thumb : keyboard);
  let save = fresh();
  if (!o.fresh) {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
      if (stored?.v === 1) save = { ...fresh(), ...stored };
    } catch {
      // a save that can't be read is a new game
    }
  }
  const isNew = save.day === 1 && !save.buildings.length && !save.spirits.length && !Object.keys(save.inv).length;
  let dirty = false;
  let saveIn = 5;
  let storing = !o.fresh || o.keep;
  const store = () => {
    if (!storing) return;
    save.hour = hour;
    save.buildings = builder.serialize();
    save.spirits = spirits.list.filter((s) => s.friend).map((s) => ({ id: s.id, kind: s.kind, sort: s.sort, name: s.name, job: s.job }));
    save.wild = spirits.list.filter((s) => !s.friend).map((s) => ({ id: s.id, kind: s.kind, sort: s.sort, name: s.name, x: +s.home.x.toFixed(1), z: +s.home.z.toFixed(1) }));
    save.animals = Object.fromEntries(animals.list.map((a) => [a.kind, { hearts: a.hearts, fedDay: a.fedDay, met: a.met }]));
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // nowhere to keep it: the game goes on
    }
    dirty = false;
  };
  const touch = () => {
    dirty = true;
  };

  // ---- the things of the game -----------------------------------------------------------------------------------
  const paints = createPaints(field);
  const nodes = createNodes({ field, trees, stones, paints, reach });
  const builder = createBuilder({ field, paints, physics, RAPIER, trees, stones });
  const chimes = createChimes();
  const inv = save.inv;
  const have = (item) => inv[item] ?? 0;
  const afford = (cost) => Object.entries(cost).every(([item, n]) => have(item) >= n);
  const give = (items, from = '', quiet = false) => {
    for (const [item, n] of Object.entries(items)) inv[item] = have(item) + n;
    ui.setInventory(inv);
    if (!quiet) ui.gain(items, from);
    touch();
  };
  const spend = (cost) => {
    for (const [item, n] of Object.entries(cost)) inv[item] = have(item) - n;
    ui.setInventory(inv);
    touch();
  };
  const spirits = createSpirits({
    field,
    paints,
    nodes,
    basket: builder.basket,
    sites: () => builder.sites(),
    campfires: () => builder.done('campfire'),
    work: (site, seconds) => build(site, seconds, true),
    deposit(item, count) {
      save.basket[item] = (save.basket[item] ?? 0) + count;
      touch();
    },
  });
  const animals = createAnimals({ field, paints, reach });
  const flora = createFlora({ field, trees, paints, reach, density: o.density ?? 1 });
  const glows = createGlows(field);
  scene.add(nodes.group, flora.group, builder.group, spirits.group, animals.group, glows.mesh);
  /** Something has been built or taken down: the plants keep clear of it. */
  const tidy = () => flora.clearFor(builder.footprints());

  const friends = () => spirits.list.filter((s) => s.friend);
  const capacity = () => 3 + 2 * builder.done('hut').length + (builder.done('cabin').length ? 2 : 0);
  const campScore = () => builder.list.reduce((sum, b) => sum + (b.done ? BUILDINGS[b.type].camp : 0), 0);
  const stars = () => STARS.filter((n) => campScore() >= n).length;
  const tip = (id, html, big = false) => {
    if (save.tips[id]) return;
    save.tips[id] = 1;
    ui.toast(html, big, 6);
    touch();
  };
  const josa = (word, withFinal, without) => {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return word + (code >= 0 && code <= 11171 && code % 28 ? withFinal : without);
  };

  // ---- the page -------------------------------------------------------------------------------------------------
  let placing = null; // { type, rot } while something is being put down; { demolish: true } while taking down
  const view = {
    inv: () => inv,
    count: (type) => builder.list.filter((b) => b.type === type).length,
    stars,
    friends,
    capacity,
    day: () => save.day,
    doing(s) {
      if (s.state === 'follow') return '따라오는 중';
      if (s.job === 'rest') return '쉬는 중';
      if (s.job === 'build') return s.site ? `${BUILDINGS[s.site.type].name} 짓는 중` : '지을 것을 기다리는 중';
      return { out: '일하러 가는 중', work: '일하는 중', back: '돌아오는 중', idle: '채비하는 중' }[s.state] ?? '';
    },
    metSpirit: (kind) => save.met.includes(kind),
    animal: (kind) => animals.list.find((a) => a.kind === kind),
    goals: () => GOALS.map((g) => ({ ...g, done: save.goals.includes(g.id) })),
  };
  const ui = createUI(canvas, {
    build(type) {
      placing = { type, rot: 0 };
    },
    demolish() {
      placing = { demolish: true };
    },
    job(s, job) {
      spirits.setJob(s, job);
      touch();
      checkGoals();
    },
    menu(name) {
      if (asleep) return;
      if (ui.open === name) return void ui.close();
      placing = null;
      if (name === 'build') ui.openBuild(view);
      else if (name === 'spirits') ui.openSpirits(view);
      else if (name === 'journal') ui.openJournal(view);
      else ui.openHelp();
    },
    rotate() {
      if (placing && !placing.demolish) placing.rot = (placing.rot + Math.PI / 8) % (Math.PI * 2);
    },
    cancel() {
      placing = null;
    },
    qualityNow: () => o.quality,
    quality(name) {
      store();
      try {
        localStorage.setItem('spirit-valley-quality', name);
      } catch {
        // it will be asked for in the address instead
      }
      const url = new URL(location.href);
      url.searchParams.delete('quality');
      location.replace(url);
    },
    reset() {
      storing = false;
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // nothing was kept
      }
      location.reload();
    },
  }, handheld);

  // ---- a saved game, put back -----------------------------------------------------------------------------------
  for (const b of save.buildings) if (BUILDINGS[b.type]) builder.add(b);
  for (const s of save.spirits) if (SPIRITS[s.kind]) spirits.addFriend(s);
  for (const w of save.wild) if (SPIRITS[w.kind]) spirits.spawnWild(w.kind, { x: w.x, z: w.z }, w.name, w.id, w.sort);
  tidy();
  for (const a of animals.list) Object.assign(a, save.animals[a.kind] ?? {});
  let hour = Math.min(Math.max(save.hour, DAY.from), DAY.to);
  let dusk = 0;
  let asleep = false;
  let clock = 0;

  /** Wild spirits for the day: up to three, kinds you haven't met first. */
  function callSpirits() {
    const wild = spirits.list.filter((s) => !s.friend);
    if (!friends().length && !save.met.length && !wild.length) {
      // the first one waits where you can't miss it
      spirits.spawnWild('wood', spirits.firstPlace());
    }
    // (the fire's spirit comes only to a fire, and the star's only at dusk: see update)
    const kinds = SPIRIT_ORDER.filter((k) => k !== 'star' && (k !== 'ember' || builder.done('campfire').length));
    const unmet = kinds.filter((k) => !save.met.includes(k));
    for (let tries = 0; tries < 12 && spirits.list.filter((s) => !s.friend).length < 3; tries++) {
      const here = new Set(spirits.list.filter((s) => !s.friend).map((s) => s.kind));
      const pool = unmet.filter((k) => !here.has(k));
      const from = pool.length && Math.random() < 0.8 ? pool : kinds.filter((k) => !here.has(k));
      if (!from.length) break;
      spirits.spawnWild(from[Math.floor(Math.random() * from.length)]);
    }
  }
  /** Animals that are friends come to the feeder when there is something in it. */
  function callAnimals() {
    const feeder = builder.done('feeder').find((f) => (f.data.stock ?? 0) > 0);
    let guests = 0;
    for (const a of animals.list) {
      const comes = feeder && a.hearts >= 3 && guests < feeder.data.stock;
      animals.setHome(a, comes ? { x: feeder.x + 3, z: feeder.z + 2 } : null);
      if (comes) guests++;
    }
    if (feeder && guests) {
      feeder.data.stock = Math.max(0, feeder.data.stock - 1);
      ui.toast(`🐾 먹이터에 동물 친구 ${guests}마리가 놀러 왔어요`);
    }
  }
  if (!spirits.list.some((s) => !s.friend)) callSpirits();
  callAnimals();

  // ---- building -------------------------------------------------------------------------------------------------
  function build(site, seconds, bySpirit = false) {
    if (!builder.workOn(site, seconds)) return;
    const def = BUILDINGS[site.type];
    chimes.good();
    ui.toast(`🔨 ${josa(def.name, '이', '가')} 완성되었어요!${bySpirit ? ' (정령들이 지었어요)' : ''}`, true);
    if (site.type === 'cairn') ui.toast('✨ 빛의 돌탑이 골짜기를 밝힙니다. 정령들이 모두 기뻐해요!', true, 8);
    if (site.type === 'feeder') site.data.stock = 2;
    for (const s of friends()) s.joy = 1;
    touch();
    checkGoals();
    store();
  }

  const aim = new THREE.Vector3();
  const dir = new THREE.Vector3();
  /** Where on the ground the middle of the screen looks, kept within a few steps of the walker. */
  function aimPoint(least, most) {
    camera.getWorldPosition(aim);
    camera.getWorldDirection(dir);
    let hit = null;
    for (let t = 1; t < 40; t += 0.4) {
      const x = aim.x + dir.x * t;
      const z = aim.z + dir.z * t;
      if (aim.y + dir.y * t <= field.heightAt(x, z)) {
        hit = [x, z];
        break;
      }
    }
    if (!hit) {
      const flat = Math.hypot(dir.x, dir.z) || 1;
      hit = [player.x + (dir.x / flat) * most, player.z + (dir.z / flat) * most];
    }
    let dx = hit[0] - player.x;
    let dz = hit[1] - player.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.min(most, Math.max(least, d));
    dx *= want / d;
    dz *= want / d;
    return [Math.round((player.x + dx) * 4) / 4, Math.round((player.z + dz) * 4) / 4];
  }

  let placeAt = null;
  function updatePlacing() {
    if (!placing) {
      if (placeAt) {
        builder.showGhost(null);
        ui.hint(null);
        placeAt = null;
      }
      return;
    }
    if (placing.demolish) {
      const [x, z] = aimPoint(1, 9);
      const b = builder.nearest(x, z, 1.2);
      placeAt = { b };
      builder.showGhost(b?.type ?? null, b?.x, b?.z, b?.rot, false, true);
      ui.hint(b ? `<span class="why">${BUILDINGS[b.type].name} 철거</span>${key('<kbd>E</kbd> 또는 클릭', '✋ 버튼')} · 재료를 돌려받아요${key(' · <kbd>X</kbd> 그만하기', '')}` : `철거할 것을 화면 가운데에 두세요${key(' · <kbd>X</kbd> 그만하기', '')}`);
      return;
    }
    const def = BUILDINGS[placing.type];
    const [x, z] = aimPoint(def.r + 1.1, 11);
    let check = builder.canPlace(placing.type, x, z);
    if (check.ok && !afford(def.cost)) check = { ok: false, why: '재료가 모자라요' };
    placeAt = { x, z, ok: check.ok };
    builder.showGhost(placing.type, x, z, placing.rot, check.ok);
    ui.hint(`${check.ok ? '' : `<span class="why">${check.why}</span>`}<b>${def.name}</b> · ${key('<kbd>E</kbd> 또는 클릭으로 놓기 · <kbd>R</kbd> 돌리기 · <kbd>X</kbd> 취소', '화면 가운데에 놓여요 · ✋ 버튼으로 놓기')}`);
  }
  function confirmPlacing() {
    if (!placing || !placeAt) return;
    if (placing.demolish) {
      const b = placeAt.b;
      if (!b) return;
      builder.remove(b);
      tidy();
      give(BUILDINGS[b.type].cost, `${BUILDINGS[b.type].name} 철거 ·`);
      chimes.knock();
      store();
      return;
    }
    if (!placeAt.ok) {
      chimes.no();
      return;
    }
    const def = BUILDINGS[placing.type];
    spend(def.cost);
    builder.add({ type: placing.type, x: placeAt.x, z: placeAt.z, rot: placing.rot });
    tidy();
    chimes.knock();
    tip('site', `🔨 가까이 가서 ${key('<b>E</b>를', '✋ 버튼을')} 누르고 있으면 지어집니다. 정령에게 <b>건설 돕기</b>를 맡겨도 돼요.`);
    // (fences and stepping stones go down one after another; anything else is one at a time)
    if (!(placing.type === 'fence' || placing.type === 'path') || !afford(def.cost)) placing = null;
    store();
  }

  // ---- what E does ----------------------------------------------------------------------------------------------
  let target = null;
  function findTarget() {
    if (placing || asleep || ui.open) return null;
    const { x, z } = player;
    const s = spirits.nearest(x, z, 2.7);
    if (s) {
      if (s.friend) return { kind: 'friend', ref: s, text: `${s.name}에게 일 맡기기` };
      const [item, n] = SPIRITS[s.kind].gift;
      if (friends().length >= capacity()) return { kind: 'wild', ref: s, text: `${s.name} · 머물 곳이 없어요 (정령집을 지어 주세요)`, enabled: false };
      return { kind: 'wild', ref: s, text: `${s.name}에게 ${ITEMS[item].icon} ${ITEMS[item].name} ${n}개 선물하기${have(item) < n ? ` (${have(item)}/${n})` : ''}`, enabled: have(item) >= n };
    }
    const a = animals.nearest(x, z, 2.5);
    if (a && a.state !== 'flee') {
      const k = ANIMALS[a.kind];
      if (a.fedDay === save.day) return { kind: 'animal', ref: a, text: `${k.name} · 오늘은 배가 불러요`, enabled: false };
      return { kind: 'animal', ref: a, text: `${k.name}에게 ${ITEMS[k.likes].icon} ${ITEMS[k.likes].name} 주기${have(k.likes) ? '' : ' (없음)'}`, enabled: have(k.likes) > 0 };
    }
    const b = builder.nearest(x, z, 1.5);
    if (b && !b.done) return { kind: 'site', ref: b, text: `${BUILDINGS[b.type].name} 짓기 <small>(누르고 있기)</small>`, meter: b.work / BUILDINGS[b.type].work };
    if (Math.hypot(builder.basket.x - x, builder.basket.z - z) < 2.1) {
      const n = Object.values(save.basket).reduce((sum, v) => sum + v, 0);
      return { kind: 'basket', text: n ? `바구니에서 꺼내기 (${n}개)` : '바구니가 비어 있어요', enabled: n > 0 };
    }
    if (b) {
      if (b.type === 'tent') return { kind: 'tent', ref: b, text: '텐트에서 쉬기 (다음 날로)' };
      if (b.type === 'garden' || b.type === 'flowerbed') {
        const ripe = b.data.day !== save.day;
        return { kind: 'crop', ref: b, text: ripe ? `${b.type === 'garden' ? '열매' : '꽃'} 거두기` : `${BUILDINGS[b.type].name} · 내일 다시 열려요`, enabled: ripe };
      }
      if (b.type === 'feeder') {
        const stock = b.data.stock ?? 0;
        return { kind: 'feeder', ref: b, text: stock >= 3 ? '먹이터가 가득 찼어요' : `먹이터에 🫐 열매 놓기 (${stock}/3)`, enabled: stock < 3 && have('berry') > 0 };
      }
    }
    const n = nodes.nearest(x, z);
    if (n) return { kind: 'node', ref: n, text: `${NODE_KINDS[n.type].name} ${NODE_KINDS[n.type].label}` };
    return null;
  }

  function act() {
    if (placing) return void confirmPlacing();
    const t = target;
    if (!t) return;
    if (t.enabled === false) {
      chimes.no();
      if (t.kind === 'wild' && friends().length < capacity()) ui.toast(`💬 ${t.ref.name}: “${ITEMS[SPIRITS[t.ref.kind].gift[0]].name} ${SPIRITS[t.ref.kind].gift[1]}개를 가져다주면 친구가 될게!”`);
      return;
    }
    if (t.kind === 'node') {
      const n = t.ref;
      give(nodes.take(n));
      o.bend?.(n.x, n.z);
      chimes.pick();
      if (n.type === 'tree') tip('tree', '🌳 나무를 흔들면 가지가 떨어져요. 시간이 지나면 다시 흔들 수 있어요.');
    } else if (t.kind === 'wild') {
      const s = t.ref;
      const kind = SPIRITS[s.kind];
      spend({ [kind.gift[0]]: kind.gift[1] });
      spirits.befriend(s);
      const first = !save.met.includes(s.kind);
      if (first) save.met.push(s.kind);
      chimes.good();
      ui.toast(`✨ ${kind.name} <b>${s.name}</b>${josa(s.name, '과', '와').slice(s.name.length)} 친구가 되었어요!`, true, 6);
      ui.toast(`💬 ${s.name}: “${kind.says}”`, false, 7);
      if (first) give({ glow: 1 }, '처음 만난 정령의 선물 ·');
      tip('follow', `정령이 내 땅까지 따라옵니다. ${key('<b>Tab</b>을', '✨ 정령 버튼을')} 눌러 일을 맡겨 보세요.`);
      checkGoals();
      store();
    } else if (t.kind === 'friend') {
      ui.openSpirits(view, t.ref);
    } else if (t.kind === 'animal') {
      const a = t.ref;
      const k = ANIMALS[a.kind];
      spend({ [k.likes]: 1 });
      a.hearts = Math.min(3, a.hearts + 1);
      a.fedDay = save.day;
      a.met = true;
      a.glad = 1;
      save.gave++;
      chimes.pick();
      if (a.hearts >= 3) {
        chimes.good();
        ui.toast(`💛 ${josa(k.name, '과', '와')} 단짝이 되었어요! 먹이터에 열매를 두면 내 땅에 놀러 와요.`, true, 7);
        give({ glow: 1 }, `${k.name}의 선물 ·`);
      } else ui.toast(`${'♥'.repeat(a.hearts)}${'♡'.repeat(3 - a.hearts)} ${josa(k.name, '이', '가')} 맛있게 먹어요. 내일 또 만나요.`);
      checkGoals();
      store();
    } else if (t.kind === 'basket') {
      const got = save.basket;
      save.basket = {};
      give(got, '정령들이 모은 것 ·');
      chimes.pick();
    } else if (t.kind === 'tent') {
      sleep(t.ref);
    } else if (t.kind === 'crop') {
      t.ref.data.day = save.day;
      give(t.ref.type === 'garden' ? { berry: 3 } : { flower: 3 });
      chimes.pick();
    } else if (t.kind === 'feeder') {
      spend({ berry: 1 });
      t.ref.data.stock = (t.ref.data.stock ?? 0) + 1;
      ui.toast('🫐 먹이터에 열매를 놓았어요. 단짝 동물이 내일 아침 찾아옵니다.');
      chimes.pick();
    }
  }

  // ---- the day --------------------------------------------------------------------------------------------------
  const hourText = () => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 6) * 10;
    return `${h >= 19 ? '저녁' : h >= 13 ? '오후' : '낮'} ${h > 12 ? h - 12 : h}시${m ? ` ${m}분` : ''}`;
  };
  async function sleep(tent = null) {
    if (asleep) return;
    asleep = true;
    placing = null;
    ui.close(false);
    await ui.fade(true, tent ? '텐트에서 포근히 잠듭니다…' : '밤이 깊어 스르르 잠이 듭니다…');
    save.day++;
    save.slept++;
    hour = DAY.from;
    dusk = 0;
    o.setHour(hour, false);
    nodes.renew();
    spirits.clearWild();
    callSpirits();
    callAnimals();
    const bed = tent ?? builder.done('tent')[0];
    if (bed) o.standAt(bed.x + Math.sin(bed.rot) * 3, bed.z + Math.cos(bed.rot) * 3, bed.rot);
    else o.standAt(HOME.x, HOME.z, 0);
    if (tent || bed) save.sleptInTent = true;
    checkGoals();
    store();
    // (a moment in the dark, so the new morning is painted before it is seen)
    await new Promise((done) => setTimeout(done, 500));
    await ui.fade(false);
    asleep = false;
    chimes.day();
    ui.toast(`🌤️ ${save.day}일째 아침이 밝았어요. 골짜기에 새 재료가 돋아났어요.`, true);
    const waiting = Object.values(save.basket).reduce((sum, v) => sum + v, 0);
    if (waiting) ui.toast(`🧺 바구니에 정령들이 모은 재료가 ${waiting}개 있어요.`);
  }

  // ---- things to do ---------------------------------------------------------------------------------------------
  const goalMet = {
    gather: () => (have('wood') >= 3 && have('stone') >= 3) || builder.list.length > 0,
    campfire: () => builder.done('campfire').length > 0,
    spirit: () => friends().length > 0,
    job: () => friends().some((s) => s.job !== 'rest'),
    tent: () => builder.done('tent').length > 0 && !!save.sleptInTent,
    animal: () => save.gave > 0,
    camp: () => CAMP.every((type) => builder.done(type).length > 0),
    spirits3: () => friends().length >= 3,
    cabin: () => builder.done('cabin').length > 0,
    cairn: () => builder.done('cairn').length > 0,
  };
  function checkGoals() {
    for (const g of GOALS) {
      if (save.goals.includes(g.id) || !goalMet[g.id]()) continue;
      save.goals.push(g.id);
      ui.toast(`✔ ${g.text}`, true);
      if (g.id === 'camp') give({ glow: 1 }, '캠핑장 완성 선물 ·');
      touch();
    }
    ui.setGoal(GOALS.find((g) => !save.goals.includes(g.id))?.text ?? null);
  }

  // ---- keys -----------------------------------------------------------------------------------------------------
  const held = new Set();
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    held.add(e.code);
    if (asleep) return;
    if (e.code === 'Escape') {
      if (ui.open) ui.close();
      else if (placing) placing = null;
      return;
    }
    if (ui.open) {
      const same = { KeyB: 'build', Tab: 'spirits', KeyJ: 'journal', KeyH: 'help' }[e.code];
      if (same === ui.open) {
        e.preventDefault();
        ui.close();
      }
      return;
    }
    if (e.code === 'KeyE') act();
    else if (e.code === 'KeyB') {
      placing = null;
      ui.openBuild(view);
    } else if (e.code === 'Tab') {
      e.preventDefault();
      ui.openSpirits(view);
    } else if (e.code === 'KeyJ') ui.openJournal(view);
    else if (e.code === 'KeyH') ui.openHelp();
    else if (e.code === 'KeyR' && placing && !placing.demolish) placing.rot = (placing.rot + Math.PI / 8) % (Math.PI * 2);
    else if (e.code === 'KeyX' && placing) placing = null;
  });
  document.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && placing && document.pointerLockElement === canvas) confirmPlacing();
  });
  // (Esc with the mouse held by the page lets the mouse go and tells nobody else: that is a cancel too)
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && placing && !ui.open) placing = null;
  });
  window.addEventListener('pagehide', store);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) store();
  });

  // ---- what is said over heads ----------------------------------------------------------------------------------
  const p = new THREE.Vector3();
  const bubbleList = [];
  function bubble(key, x, y, z, html) {
    p.set(x, y, z).project(camera);
    if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return;
    bubbleList.push({ key, x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, html });
  }
  function updateBubbles() {
    bubbleList.length = 0;
    if (!asleep && !ui.open) {
      for (const s of spirits.list) {
        const d = Math.hypot(s.x - player.x, s.z - player.z);
        if (s.friend ? d > 7 : d > 26) continue;
        const y = s.mesh.position.y + 1.05;
        if (!s.friend) {
          const [item, n] = SPIRITS[s.kind].gift;
          bubble(`s${s.id}`, s.x, y, s.z, d < 12 ? `<b>${s.name}</b> ${ITEMS[item].icon}×${n}` : '✨');
        } else bubble(`s${s.id}`, s.x, y, s.z, `<b>${s.name}</b><small>${JOBS[s.job].icon}</small>`);
      }
      for (const a of animals.list) {
        const d = Math.hypot(a.x - player.x, a.z - player.z);
        if (d > 9 || a.state === 'flee') continue;
        const k = ANIMALS[a.kind];
        bubble(`a${a.kind}`, a.x, a.y + k.size * 1.25 + 0.45, a.z, `<span class="hearts">${'♥'.repeat(a.hearts)}${'♡'.repeat(3 - a.hearts)}</span>${d < 5 ? ` ${ITEMS[k.likes].icon}` : ''}`);
      }
      for (const b of builder.sites()) {
        if (Math.hypot(b.x - player.x, b.z - player.z) > 16) continue;
        bubble(`b${b.id}`, b.x, b.y + b.mesh.geometry.userData.top + 0.5, b.z, `🔨 ${Math.round((b.work / BUILDINGS[b.type].work) * 100)}%`);
      }
      const waiting = Object.values(save.basket).reduce((sum, v) => sum + v, 0);
      if (waiting && Math.hypot(builder.basket.x - player.x, builder.basket.z - player.z) < 30) bubble('basket', builder.basket.x, builder.basket.y + 1.1, builder.basket.z, `🧺 ${waiting}`);
    }
    ui.setBubbles(bubbleList);
  }

  const ICON = { node: '✋', wild: '🎁', friend: '💬', animal: '🍽️', site: '🔨', basket: '🧺', tent: '⛺', crop: '🧺', feeder: '🫐' };
  const thumbs = handheld
    ? createTouch({
        input: o.input,
        root: ui.root,
        on: {
          frozen: () => asleep || !!ui.open,
          act(down) {
            if (down) {
              held.add('KeyE');
              if (!asleep && !ui.open) act();
            } else held.delete('KeyE');
          },
        },
      })
    : null;
  ui.setInventory(inv);
  checkGoals();
  if (isNew && !o.quiet) {
    setTimeout(() => ui.toast(`🌿 골짜기에 오신 걸 환영해요. ${key('<b>H</b>를', '❔ 도움말을')} 누르면 조작법을 볼 수 있어요.`, true, 8), 600);
    setTimeout(() => ui.toast(`큰 나무 아래에서 누군가 기다리고 있어요. 반짝이는 것들을 ${key('<b>E</b>로', '✋ 버튼으로')} 모아 보세요.`, false, 9), 1800);
  }

  let slow = 0;
  let duskHeld = 0;
  let shadeHour = -1;
  const game = {
    ui,
    save,
    nodes,
    builder,
    spirits,
    animals,
    flora,
    tidy,
    paints,
    give,
    act,
    sleep,
    view,
    /** True while the walker should stand still and the mouse belongs to the page. */
    get frozen() {
      return asleep || !!ui.open;
    },
    get placing() {
      return placing;
    },
    set placing(v) {
      placing = v;
    },
    get hour() {
      return hour;
    },
    set hour(v) {
      hour = v;
    },
    confirmPlacing,
    /** After the meadow has been wiped (the warm-up treads it and then forgets): mow under the buildings again. */
    settle() {
      builder.mowAll();
      shadeHour = -1;
      o.setHour(hour, false);
    },
    update(dt) {
      clock += dt;
      // the day goes by; at sunset it waits a while for you to go to bed, and then puts you there
      if (!asleep) {
        if (hour < DAY.to) {
          hour = Math.min(DAY.to, hour + dt * RATE);
          o.setHour(hour, true);
          duskHeld = 0;
          if (hour >= DAY.to) ui.toast(builder.done('tent').length ? '🌇 해가 졌어요. 텐트에서 쉬면 새 아침이 와요.' : '🌇 해가 졌어요. 곧 잠이 쏟아질 거예요…', true, 7);
        } else {
          duskHeld += dt;
          if (duskHeld > 55 && !ui.open) sleep();
        }
      }
      dusk = Math.min(1, Math.max(0, (hour - 17.2) / 2.6));
      paints.setDusk(dusk);
      flora.update(dusk);
      // when the light begins to go, a star's spirit comes down near your land (if there is room for another)
      if (hour > 18.1 && save.starDay !== save.day && !asleep) {
        save.starDay = save.day;
        if (!spirits.list.some((s) => s.kind === 'star' && !s.friend) && spirits.spawnWild('star')) ui.toast('🌠 해 질 녘, 내 땅 근처 언덕에 별정령이 내려왔어요.', true, 7);
      }
      // the shade of what is built follows the sun
      const moved = Math.abs(hour - shadeHour) > 0.07;
      if (moved) shadeHour = hour;
      builder.shade(sky.sunDir, moved);

      nodes.update(dt);
      const speed = o.speed();
      spirits.update(dt, player, clock);
      const bolted = animals.update(dt, { x: player.x, z: player.z, speed });
      if (bolted) {
        if (!bolted.met) {
          bolted.met = true;
          touch();
        }
        tip('bolt', `🐾 ${josa(ANIMALS[bolted.kind].name, '이', '가')} 놀라 달아났어요. ${key('<b>Alt</b>를 누른 채', '스틱을 살짝만 밀어')} 살금살금 다가가 보세요.`);
      }
      builder.update(dt, clock, dusk, player);
      // the grass parts round the animals nearest the eye
      let slot = 1;
      for (const a of animals.list) {
        if (slot > 5) break;
        if (Math.hypot(a.x - player.x, a.z - player.z) > 40) continue;
        field.setPusher(slot++, a.x, a.y + 0.2, a.z, ANIMALS[a.kind].size * 0.3);
      }
      for (; slot <= 5; slot++) field.setPusher(slot, 0, 0, 0, 0);

      glows.begin();
      spirits.glow(glows, clock, dusk);
      builder.glow(glows, clock, dusk);
      glows.end();

      updatePlacing();
      target = findTarget();
      // building is done by keeping at it
      if (target?.kind === 'site' && held.has('KeyE') && !this.frozen) {
        build(target.ref, dt * 1.4);
        if (Math.floor(clock * 2.5) !== Math.floor((clock - dt) * 2.5)) chimes.knock();
      }
      ui.prompt(target?.text ?? null, { enabled: target?.enabled !== false, meter: target?.meter ?? null });
      ui.placing(!!placing);
      if (thumbs) {
        thumbs.update();
        if (placing) thumbs.setAction(placing.demolish ? '🧹' : '✔', placing.demolish ? !!placeAt?.b : !!placeAt?.ok);
        else thumbs.setAction(ICON[target?.kind] ?? '✋', !!target && target.enabled !== false);
      }
      updateBubbles();

      slow -= dt;
      if (slow <= 0) {
        slow = 0.5;
        ui.setDay(save.day, hourText(), (hour - DAY.from) / (DAY.to - DAY.from), stars());
        for (const a of animals.list) {
          if (!a.met && Math.hypot(a.x - player.x, a.z - player.z) < 12) {
            a.met = true;
            ui.toast(`📖 도감에 ${josa(ANIMALS[a.kind].name, '이', '가')} 기록되었어요.`);
            touch();
          }
        }
        if (Math.hypot(player.x - HOME.x, player.z - HOME.z) > HOME.r + 6) tip('away', '🧭 말뚝 밖은 골짜기예요. 멀리 갈수록 다른 재료와 정령, 동물을 만날 수 있어요.');
        checkGoals();
      }
      saveIn -= dt;
      if (saveIn <= 0) {
        saveIn = 5;
        if (dirty) store();
      }
    },
    store,
  };
  return game;
}

export { ITEM_ORDER };
