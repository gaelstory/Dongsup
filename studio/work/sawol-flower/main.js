/* 꽃집 사월: the living garden, falling petals, workbench bouquet, seasonal calendar, subscription. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var F = window.Flora, A = window.SawolArt;
  if (!F || !A) return;
  var SHOT = /[?&]shot=1/.test(location.search);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) root.classList.add('is-reduced');
  var G = window.gsap, ST = window.ScrollTrigger, MOTION = !!G && !REDUCED && !SHOT;
  if (G && ST) G.registerPlugin(ST);

  function guard(fn) { try { fn(); } catch (e) { root.classList.add('no-motion'); } }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease3(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
  function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- one rAF loop for everything that draws ---------- */
  var tasks = [], rafId = 0, last = 0;
  function kick() { if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); } }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000), more = false;
    last = now;
    for (var i = 0; i < tasks.length; i++) if (tasks[i](dt, now)) more = true;
    rafId = more ? requestAnimationFrame(frame) : 0;
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  // Re-render a mounted SVG composition's heads at one bloom value.
  function mountHeads(svg, heads) {
    var setters = [];
    svg.querySelectorAll('[data-h]').forEach(function (g) { setters.push(F.mount(g, heads[+g.getAttribute('data-h')], 1)); });
    var all = function (b) { for (var i = 0; i < setters.length; i++) setters[i](b); };
    all.each = setters;
    return all;
  }
  function bloomIn(set, delayEach) {
    set.each.forEach(function (s, i) {
      var o = { b: 0.05 };
      G.to(o, { b: 1, duration: 0.9, delay: i * (delayEach || 0.05), ease: 'power2.out', onUpdate: function () { s(o.b); } });
    });
  }

  /* ---------- digit roller for prices ---------- */
  function Roller(el) {
    var cur = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0, timer = 0;
    return {
      el: el,
      set: function (v, anim) {
        if (v === cur) return;
        var s = fmt(v), prev = fmt(cur);
        cur = v;
        clearTimeout(timer);
        if (!anim) { el.textContent = s; return; }
        var html = '<span class="sr-only">' + s + '</span><span aria-hidden="true" style="display:inline-flex">', from = [], i;
        for (i = 0; i < s.length; i++) {
          var ch = s[i], pc = prev[prev.length - s.length + i];
          if (ch === ',') { html += '<span class="roll roll--sep">,</span>'; continue; }
          var fd = pc && pc !== ',' ? +pc : 0;
          from.push(fd);
          html += '<span class="roll"><span class="roll__strip" style="transform:translateY(' + (-fd * 10) + '%)" data-to="' + ch + '">';
          for (var d = 0; d < 10; d++) html += '<span>' + d + '</span>';
          html += '</span></span>';
        }
        el.innerHTML = html + '</span>';
        var strips = el.querySelectorAll('.roll__strip');
        void el.offsetWidth;
        for (i = 0; i < strips.length; i++) strips[i].style.transform = 'translateY(' + (-(+strips[i].getAttribute('data-to')) * 10) + '%)';
        timer = setTimeout(function () { el.textContent = s; }, 560);
      }
    };
  }

  /* ---------- header and navigation ---------- */
  function initNav() {
    var btn = document.querySelector('.nav__toggle'), list = document.getElementById('nav-list'), header = document.getElementById('site-header');
    function open() { return btn.getAttribute('aria-expanded') === 'true'; }
    function set(v) { btn.setAttribute('aria-expanded', String(v)); list.classList.toggle('is-open', v); }
    btn.addEventListener('click', function () { set(!open()); if (open()) { var a = list.querySelector('a'); if (a) a.focus(); } });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open()) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (open() && !e.target.closest('.nav')) set(false); });
    var ticking = false;
    var hero = document.querySelector('.hero'), wind = document.getElementById('wind-toggle');
    function onScroll() {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      if (wind) wind.classList.toggle('is-away', window.scrollY > hero.offsetHeight * 0.25);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* ---------- the garden ---------- */
  var garden = null;
  function initGarden() {
    var hero = document.querySelector('.hero'), cv = document.getElementById('garden');
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx || typeof Path2D === 'undefined') return;
    var seed = SHOT ? 20260424 : (Math.random() * 1e9) | 0, rnd = F.rng(seed ^ 0x5a5a5a);
    var OVER = 30, W = 0, H = 0, heroH = 0, dpr = 1, groundY = 0, band = 0, unit = 26, mobile = null, fade = null;
    var planted = null, flowers = [], grass = [[], []], clock = 0, wind = !REDUCED && !SHOT, visible = true, copy = [], chosen = null;
    var geo = { b: [0, 0], c: [0, 0], t: [0, 0] }, pt = [0, 0];
    var pointer = { px: 0, t: -1e9 };
    var GRASS = [['#2D6B45', '#3B7F53', '#4F9465'], ['#1F5C3A', '#3F8B57', '#6AAE76']];

    function makeLive(spec, o) {
      return {
        spec: spec, fx: spec.fx, z: spec.z, hrel: o.hrel, want: o.want || 0, init: !!o.init, born: o.born, dur: o.dur, g: o.g || 0,
        bend: 0, bv: 0, alpha: 1, dying: false, hx: 0, hy: 0,
        head: F.build(spec.kind, { r: unit * spec.size, hue: spec.hue, seed: spec.seed, calyx: true })
      };
    }
    function seedGarden() {
      var now = performance.now(), plan = F.gardenPlan(seed, mobile ? 7 : 14, !mobile), keep = flowers.filter(function (f) { return !f.init; });
      var r = F.rng(seed + 99);
      if (mobile) {
        // on phones two heads reach right up under the hint, so the garden meets the copy
        plan.filter(function (f) { return f.kind !== 'gyp'; }).sort(function (a, b) { return b.fh - a.fh; }).slice(0, 2).forEach(function (f) { f.fh = F.rr(r, 0.95, 1); });
      }
      flowers = plan.map(function (spec) {
        // five flowers arrive already 60% grown; the rest start within 0.35s so all finish by 2s
        var dur = F.rr(r, 1.45, 1.65), delay = spec.early ? 0 : F.rr(r, 0, 0.35);
        var g0 = spec.early ? 0.6 : 0, born = now + delay * 1000 - g0 * dur * 1000;
        return makeLive(spec, { init: true, hrel: 0, born: born, dur: dur * 1000, g: SHOT || REDUCED ? 1 : g0 });
      }).concat(keep);
      sortFlowers();
    }
    function sortFlowers() { flowers.sort(function (a, b) { return a.z - b.z; }); }
    function buildGrass() {
      grass = [[], []];
      var r = F.rng(seed + 7), n = Math.round(W / (mobile ? 3.2 : 3.6));
      for (var i = 0; i < n; i++) {
        var layer = r() < 0.55 ? 0 : 1;
        grass[layer].push({ x: r() * W, h: F.rr(r, mobile ? 10 : 14, mobile ? 30 : 46) * (layer ? 0.72 : 1), lean: F.rr(r, -0.4, 0.4), w: F.rr(r, 1.4, 3), c: (r() * 3) | 0, ph: r() * 6.28 });
      }
    }
    function measure() {
      var r = hero.getBoundingClientRect(), wasMobile = mobile;
      W = Math.round(r.width); heroH = Math.round(r.height); H = heroH + OVER;
      mobile = W < 640;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      groundY = H - 4;
      unit = mobile ? 20 : Math.max(24, Math.min(36, W * 0.0235));
      band = mobile ? 0.38 * heroH + 26 - unit * 1.5 : 0.6 * heroH - unit * 1.3;
      fade = ctx.createLinearGradient(0, H - 16, 0, H);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      if (wasMobile !== mobile) seedGarden();
      measureCopy();
      flowers.forEach(function (f) {
        f.head = F.build(f.spec.kind, { r: unit * f.spec.size, hue: f.spec.hue, seed: f.spec.seed, calyx: true });
        f.hrel = fit(f.fx * W, f.init ? f.spec.fh * band : f.want * heroH, f.head.r) / heroH;
      });
      buildGrass();
      buildFar();
    }
    // The text block (title, lead, button, hint, picker) in canvas coordinates. Heads never land on it.
    function measureCopy() {
      var cr = cv.getBoundingClientRect();
      copy = Array.prototype.map.call(hero.querySelectorAll('.hero__title, .hero__lead, .hero__cta, .hero__hint, .picker'), function (el) {
        var b = el.getBoundingClientRect();
        return { l: b.left - cr.left, r: b.right - cr.left, b: b.bottom - cr.top };
      });
    }
    // The tallest stem a flower at x may have so its head (radius hr) stays below the copy.
    function fit(x, want, hr) {
      var lim = want, m = hr * 1.6;
      for (var i = 0; i < copy.length; i++) {
        var c = copy[i];
        if (x > c.l - m && x < c.r + m) lim = Math.min(lim, groundY - c.b - 12 - hr * 1.45);
      }
      return Math.max(36, lim);
    }
    // A distant row of small flowers, painted once per resize, gives the meadow depth for free.
    var far = null;
    function buildFar() {
      far = far || document.createElement('canvas');
      far.width = cv.width; far.height = cv.height;
      var fx = far.getContext('2d'), r = F.rng(seed + 3), n = mobile ? 16 : 40, kinds = ['daisy', 'poppy', 'ranunculus', 'daisy', 'tulip', 'gyp'];
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (var i = 0; i < n; i++) {
        var x = (i + 0.5 + F.rr(r, -0.45, 0.45)) / n * W, h = F.rr(r, 16, mobile ? 64 : 96), y0 = groundY - 4 - r() * 10, lean = F.rr(r, -0.12, 0.12);
        var kind = kinds[(r() * kinds.length) | 0], hues = F.HUES[kind] || ['white'], hd = F.build(kind, { r: unit * F.rr(r, 0.3, 0.46), hue: hues[(r() * hues.length) | 0], seed: (r() * 1e9) | 0 });
        var tx = x + Math.sin(lean) * h, ty = y0 - Math.cos(lean) * h;
        fx.globalAlpha = 0.8;
        fx.beginPath(); fx.moveTo(x, y0); fx.quadraticCurveTo(x, y0 - h * 0.5, tx, ty);
        fx.lineWidth = 1.3; fx.strokeStyle = '#3A7D50'; fx.stroke();
        fx.save(); fx.translate(tx, ty); fx.rotate(lean + F.rr(r, -0.3, 0.3)); fx.scale(1, hd.front ? F.rr(r, 0.5, 0.85) : 1);
        F.drawHead(fx, hd, 1);
        fx.restore();
      }
    }

    function stemFill(g, w0, w1, s) {
      var N = 10, i, u, a, w;
      ctx.beginPath();
      for (i = 0; i <= N; i++) {
        u = s * i / N; F.qpt(g.b, g.c, g.t, u, pt); a = F.qang(g.b, g.c, g.t, u); w = (w0 + (w1 - w0) * u) / 2;
        if (i) ctx.lineTo(pt[0] - Math.cos(a) * w, pt[1] - Math.sin(a) * w); else ctx.moveTo(pt[0] - Math.cos(a) * w, pt[1] - Math.sin(a) * w);
      }
      for (i = N; i >= 0; i--) {
        u = s * i / N; F.qpt(g.b, g.c, g.t, u, pt); a = F.qang(g.b, g.c, g.t, u); w = (w0 + (w1 - w0) * u) / 2;
        ctx.lineTo(pt[0] + Math.cos(a) * w, pt[1] + Math.sin(a) * w);
      }
      ctx.closePath();
      ctx.fillStyle = '#1F5C3A';
      ctx.fill();
    }
    function drawFlower(f, t) {
      var sp = ease3(clamp01(f.g / 0.62)), hb = clamp01((f.g - 0.5) / 0.5);
      if (sp < 0.002 || f.alpha <= 0) return;
      var x = f.fx * W, gy = groundY - f.z * 10 - 2, h = f.hrel * heroH, sc = mobile ? 0.82 : 1;
      var sway = 0.044 * Math.sin(t + x * 0.01) + 0.009 * Math.sin(t * 2.3 + x * 0.023 + f.spec.phase);
      A.stemGeom(f.spec, x, gy, h, sway + f.bend, geo);
      ctx.globalAlpha = f.alpha;
      stemFill(geo, f.spec.w0 * sc, f.spec.w1 * sc, sp);
      var L = f.spec.leaves;
      for (var i = 0; i < L.length; i++) {
        var l = L[i];
        if (sp < l.t + 0.02) continue;
        var lp = clamp01((f.g - (0.12 + l.t * 0.62)) / 0.32);
        if (lp <= 0) continue;
        var e = ease3(lp), len = Math.max(12, Math.min(120, l.len * h)) * (0.25 + 0.75 * e) * sc;
        F.qpt(geo.b, geo.c, geo.t, l.t, pt);
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        ctx.rotate(F.qang(geo.b, geo.c, geo.t, l.t) + l.side * l.ang * (0.3 + 0.7 * e));
        ctx.scale(len * l.w * l.side, len);
        F.drawShape(ctx, l.s, 'leaf');
        ctx.lineWidth = 0.8 / len; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke(F.path2d('midrib'));
        ctx.restore();
      }
      F.qpt(geo.b, geo.c, geo.t, sp, pt);
      f.hx = pt[0]; f.hy = pt[1];
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(F.qang(geo.b, geo.c, geo.t, sp) + f.spec.nod * hb);
      if (hb < 0.2) {
        ctx.save();
        ctx.globalAlpha = f.alpha * (1 - hb / 0.2);
        var bs = 0.4 + 0.6 * sp;
        ctx.scale(unit * 0.2 * bs, unit * 0.42 * bs);
        F.drawShape(ctx, 'bud', 'bud');
        ctx.restore();
      }
      if (hb > 0) {
        var hs = 0.55 + 0.45 * ease3(hb), tilt = f.head.front ? f.spec.tilt + (1 - f.spec.tilt) * (1 - hb) * 0.6 : 1;
        ctx.scale(hs, hs * tilt);
        F.drawHead(ctx, f.head, hb);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawGrass(layer, t) {
      var list = grass[layer], cols = GRASS[layer];
      for (var c = 0; c < 3; c++) {
        ctx.beginPath();
        for (var i = 0; i < list.length; i++) {
          var g = list[i];
          if (g.c !== c) continue;
          var a = g.lean + 0.07 * Math.sin(t * 1.3 + g.x * 0.012 + g.ph), by = groundY + 3;
          var tx = g.x + Math.sin(a) * g.h, ty = by - Math.cos(a) * g.h, cx = g.x + Math.sin(g.lean * 0.5) * g.h * 0.55, cy = by - g.h * 0.55;
          ctx.moveTo(g.x - g.w, by);
          ctx.quadraticCurveTo(cx - g.w * 0.3, cy, tx, ty);
          ctx.quadraticCurveTo(cx + g.w * 0.3, cy, g.x + g.w, by);
          ctx.closePath();
        }
        ctx.fillStyle = cols[c];
        ctx.fill();
      }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawGrass(0, clock);
      if (far) ctx.drawImage(far, 0, 0, W, H);
      for (var i = 0; i < flowers.length; i++) drawFlower(flowers[i], clock);
      drawGrass(1, clock);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade;
      ctx.fillRect(0, H - 16, W, 16);
      ctx.globalCompositeOperation = 'source-over';
    }
    function update(dt, now) {
      var busy = false, i, f;
      for (i = flowers.length - 1; i >= 0; i--) {
        f = flowers[i];
        if (f.g < 1) { f.g = clamp01((now - f.born) / f.dur); busy = true; }
        if (f.bend || f.bv) {
          f.bv += (-55 * f.bend - 6.5 * f.bv) * dt;
          f.bend += f.bv * dt;
          if (f.bend > 0.21) { f.bend = 0.21; f.bv = Math.min(0, f.bv); }
          if (f.bend < -0.21) { f.bend = -0.21; f.bv = Math.max(0, f.bv); }
          if (Math.abs(f.bend) < 0.0005 && Math.abs(f.bv) < 0.005) { f.bend = 0; f.bv = 0; } else busy = true;
        }
        if (f.dying) { f.alpha -= dt / 0.7; busy = true; if (f.alpha <= 0) flowers.splice(i, 1); }
      }
      return busy;
    }
    tasks.push(function (dt, now) {
      if (!visible || document.hidden) return false;
      if (wind) clock += dt;
      var busy = update(dt, now);
      draw();
      return busy || wind;
    });

    function plantAt(x, y) {
      var kind = chosen || F.GARDEN[(rnd() * 5) | 0], spec = F.plant(kind, rnd, { fx: x / W, fh: 1, z: F.rr(rnd, 0.4, 1) });
      var want = Math.max(64, Math.min(heroH * (mobile ? 0.46 : 0.7), groundY - y - unit * 0.5));
      var f = makeLive(spec, { want: want / heroH, hrel: 0, born: performance.now(), dur: F.rr(rnd, 0.9, 1.6) / 0.62 * 1000, g: REDUCED ? 1 : 0 });
      f.hrel = fit(x, want, f.head.r) / heroH;
      if (planted) planted(kind);
      flowers.push(f);
      sortFlowers();
      var alive = flowers.filter(function (o) { return !o.dying && o.spec.kind !== 'gyp'; });
      while (alive.length > 40) { var old = alive.reduce(function (a, b) { return a.born <= b.born ? a : b; }); old.dying = true; alive.splice(alive.indexOf(old), 1); }
      if (REDUCED) { flowers = flowers.filter(function (o) { return !o.dying; }); draw(); } else kick();
    }
    function fromEvent(e) {
      var r = cv.getBoundingClientRect();
      plantAt(e.clientX - r.left, e.clientY - r.top);
    }
    function isUI(t) { return t.closest && t.closest('a, button, input, label, select, textarea'); }
    var touch = null;
    hero.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || isUI(e.target)) return;
      if (e.pointerType === 'touch') touch = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      else fromEvent(e);
    });
    hero.addEventListener('pointerup', function (e) {
      if (!touch || e.pointerType !== 'touch') return;
      if (Math.abs(e.clientX - touch.x) < 10 && Math.abs(e.clientY - touch.y) < 10 && e.timeStamp - touch.t < 600 && !isUI(e.target)) fromEvent(e);
      touch = null;
    });
    hero.addEventListener('pointercancel', function () { touch = null; });
    if (!REDUCED && !SHOT) {
      // A quick pass pushes the stems it crosses, in proportion to the distance travelled,
      // so a fast sweep lays the row over (up to 12°) and a slow one barely stirs it.
      hero.addEventListener('pointermove', function (e) {
        var now = e.timeStamp, dx = e.clientX - pointer.px, dt = Math.max(1, now - pointer.t), fresh = now - pointer.t < 100;
        pointer.px = e.clientX; pointer.t = now;
        if (!fresh || Math.abs(dx / dt) < 0.35) return;
        var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, push = (dx > 0 ? 1 : -1) * Math.min(Math.abs(dx), 80) / 80 * 2.2, hit = false;
        for (var i = 0; i < flowers.length; i++) {
          var f = flowers[i], d = Math.abs(x - f.fx * W);
          if (d < 130 && y > f.hy - unit * 1.6 && y < groundY) { f.bv += push * (1 - d / 130); hit = true; }
        }
        if (hit) kick();
      }, { passive: true });
    }
    document.getElementById('plant-hint').addEventListener('click', function () {
      var x = W * F.rr(rnd, 0.06, 0.94);
      plantAt(x, groundY - heroH * F.rr(rnd, 0.22, mobile ? 0.36 : 0.5));
    });
    var windBtn = document.getElementById('wind-toggle');
    windBtn.addEventListener('click', function () {
      wind = !wind;
      windBtn.setAttribute('aria-pressed', String(!wind));
      kick();
    });

    measure();
    draw();
    hero.classList.add('is-live');
    // the copy moves once the web fonts arrive and the entrance settles; re-fit the heads then
    function refit() { measure(); draw(); if (!SHOT) kick(); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    setTimeout(refit, 1300);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
    }
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var w = W, hh = heroH; measure(); if (w !== W || hh !== heroH) { draw(); kick(); } }, 150);
    });
    if (!REDUCED && !SHOT) kick();

    garden = {
      choose: function (kind, cursor) { chosen = kind; hero.style.cursor = cursor || ''; },
      onPlant: function (fn) { planted = fn; },
      inView: function () { return visible; },
      bottom: function () { return cv.getBoundingClientRect().bottom; },
      // A bloomed head somewhere on screen, in viewport coordinates, to shed a petal from.
      source: function () {
        var r = cv.getBoundingClientRect(), list = flowers.filter(function (f) { return f.g > 0.95 && f.spec.kind !== 'gyp'; });
        if (!list.length) return null;
        for (var k = 0; k < 6; k++) {
          var f = list[(rnd() * list.length) | 0], y = r.top + f.hy;
          var fill = f.head.petal[1];
          if (y > -20 && y < window.innerHeight) return { x: r.left + f.hx, y: y, shape: f.head.petal[0], fill: fill === 'white' || fill === 'cream' ? fill + 'S' : fill, size: f.head.r };
        }
        return null;
      }
    };
  }

  /* ---------- petals shaken loose by scrolling ---------- */
  function initPetals() {
    if (!garden || REDUCED || SHOT) return;
    var cv = document.getElementById('petals'), ctx = cv.getContext('2d'), list = [], W = 0, H = 0, dpr = 1, budget = 0, lastY = window.scrollY;
    function size() {
      W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    size();
    window.addEventListener('resize', size);
    window.addEventListener('scroll', function () {
      var y = window.scrollY, d = Math.abs(y - lastY);
      lastY = y;
      if (garden.inView() && d) { budget = Math.min(4, budget + d * 0.045); kick(); }
    }, { passive: true });
    var wasActive = false, perches = Array.prototype.slice.call(document.querySelectorAll('#today-title, .specimen:nth-child(-n+3) .tag'));
    function perch() {
      var landing = list.filter(function (q) { return q.target; }).length;
      if (landing >= 8 || Math.random() > 0.5) return null;
      return perches[(Math.random() * perches.length) | 0];
    }
    tasks.push(function (dt) {
      while (budget >= 1 && list.length < 20) {
        budget -= 1;
        var s = garden.source();
        if (!s) { budget = 0; break; }
        var k = Math.random;
        list.push({
          x: s.x + (k() - 0.5) * s.size, y: s.y + (k() - 0.5) * s.size * 0.6, vx: (k() - 0.5) * 40, vy: 10 + k() * 30, term: 60 + k() * 60,
          rot: k() * 6.28, vr: (k() - 0.5) * 5, flip: k() * 6.28, vf: 2 + k() * 3, ph: k() * 6.28, life: 0, max: 3 + k() * 1.8,
          len: s.size * (0.45 + k() * 0.25), shape: s.shape, fill: s.fill, target: perch(), tf: 0.12 + k() * 0.76, landed: false
        });
        var np = list[list.length - 1];
        if (np.target) np.max = 8;
      }
      if (list.length < 20) budget = Math.min(budget, 1.5);
      if (!list.length) {
        if (wasActive) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); wasActive = false; }
        return false;
      }
      wasActive = true;
      // once the garden is far behind, let the petals go quickly instead of trailing the reader
      var gone = garden.bottom() < -H * 0.5;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i];
        p.life += dt;
        if (p.target) {
          // a few petals drift toward the heading or a price tag and settle on its top edge
          var tr = p.target.getBoundingClientRect(), tx = tr.left + tr.width * p.tf, ty = tr.top + (p.target.tagName === 'H2' ? 8 : -1);
          if (p.landed) {
            p.x = tr.left + p.ox; p.y = ty - p.len * 0.12;
            p.rot += (p.rest - p.rot) * Math.min(1, dt * 6); p.flip += (0 - p.flip) * Math.min(1, dt * 6);
            if (tr.bottom < -30 || tr.top > H + 30) p.max = Math.min(p.max, p.life);
          } else if (p.y > ty + 40) { p.target = null; p.max = Math.min(p.max, p.life + 1.5); }
          else {
            p.x += (tx - p.x) * Math.min(1, dt * 0.9);
            if (p.y >= ty - p.len * 0.12 && Math.abs(p.x - tx) < 40) { p.landed = true; p.ox = p.x - tr.left; p.rest = (Math.random() - 0.5) * 1.2 + Math.PI / 2; p.flip = Math.round(p.flip / Math.PI) * Math.PI; p.max = p.life + 4; }
          }
          if (!p.landed && p.life > 6) p.max = Math.min(p.max, p.life + 0.8);
        }
        if (gone && !p.landed && p.max - p.life > 0.5) p.max = p.life + 0.5;
        if (!p.landed) {
          p.vy = Math.min(p.term, p.vy + 55 * dt);
          p.x += (p.vx + Math.sin(p.life * 2.2 + p.ph) * 34) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          p.flip += p.vf * dt;
        }
        if (p.life > p.max || p.y > H + 40) { list.splice(i, 1); continue; }
        var a = Math.min(1, p.life * 4) * Math.min(1, (p.max - p.life) / 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.len * (0.25 + 0.75 * Math.abs(Math.cos(p.flip))), p.len);
        ctx.translate(0, 0.5);
        F.drawShape(ctx, p.shape, p.fill);
        ctx.restore();
      }
      return true;
    });
  }

  /* ---------- today's flowers ---------- */
  function initSpecimens() {
    var sets = [];
    document.querySelectorAll('[data-spec]').forEach(function (svg) {
      var r = A.specimen(svg.getAttribute('data-spec'));
      svg.innerHTML = r.svg;
      sets.push(mountHeads(svg, r.heads));
    });
    if (!MOTION || !ST) return;
    sets.forEach(function (s) { s(0.05); });
    ST.create({ trigger: '.specimens', start: 'top 85%', once: true, onEnter: function () { sets.forEach(function (s, i) { s.each.forEach(function (one) { var o = { b: 0.05 }; G.to(o, { b: 1, duration: 0.9, delay: i * 0.08, ease: 'power2.out', onUpdate: function () { one(o.b); } }); }); }); } });
  }

  /* ---------- the workbench ---------- */
  var BASE = { S: 35000, M: 52000, L: 78000 }, EXTRA = { tulip: 3000, freesia: 2000, ranunculus: 4000, daisy: 0, poppy: 3000, gyp: 1000 }, SIZEK = { S: 1, M: 1.5, L: 2.2 };
  function priceOf(st) {
    var x = 0;
    st.kinds.forEach(function (k) { x += EXTRA[k]; });
    return BASE[st.size] + Math.round(x * SIZEK[st.size] / 1000) * 1000;
  }
  function initBench() {
    var form = document.getElementById('bench'), svg = document.getElementById('bouquet'), cap = document.getElementById('bench-caption');
    var count = document.getElementById('pick-count'), result = document.getElementById('bench-result'), card = document.getElementById('card-msg');
    var price = Roller(document.querySelector('#bench-price .price__num'));
    var order = [];
    form.querySelectorAll('input[name="flower"]').forEach(function (el) { if (el.checked) order.push(el.value); });
    document.querySelectorAll('[data-icon]').forEach(function (s) { if (!s.firstElementChild) s.innerHTML = A.icon(s.getAttribute('data-icon')).svg; });
    function state() { return { mood: form.elements.mood.value, size: form.elements.size.value, kinds: order.slice() }; }
    function sync() {
      form.querySelectorAll('.pick').forEach(function (p) { p.classList.toggle('is-on', p.querySelector('input').checked); });
      count.textContent = order.length === 3 ? '3가지 골랐어요' : order.length + '가지 골랐어요, ' + (3 - order.length) + '가지 더 고를 수 있어요';
    }
    var setter = null, touched = false, hintEl = document.getElementById('pick-hint'), submit = form.querySelector('[type="submit"]'), dy = 0;
    function render(anim) {
      var st = state(), out = A.bouquet(st);
      svg.innerHTML = out.svg;
      setter = mountHeads(svg, out.heads);
      dy = { S: -44, M: -16, L: 0 }[st.size];
      cap.textContent = st.kinds.length ? out.label : '꽃을 한 가지 이상 골라 주세요';
      price.set(priceOf(st), anim && !REDUCED);
      form.classList.toggle('is-empty', !st.kinds.length);
      submit.setAttribute('aria-disabled', String(!st.kinds.length));
      if (anim && MOTION) {
        G.fromTo(svg.querySelector('.bq'), { scale: 0.965 }, { scale: 1, duration: 0.6, ease: 'back.out(2.4)', svgOrigin: '280 ' + (600 + dy) });
        var o = { b: 0.45 };
        setter(0.45);
        G.to(o, { b: 1, duration: 0.7, ease: 'power2.out', onUpdate: function () { setter(o.b); } });
      }
    }
    form.addEventListener('change', function (e) {
      var el = e.target;
      touched = true;
      result.textContent = '';
      if (el.name === 'flower') {
        if (el.checked) {
          order.push(el.value);
          if (order.length > 3) { var out = order.shift(); form.querySelector('input[name="flower"][value="' + out + '"]').checked = false; }
        } else order = order.filter(function (v) { return v !== el.value; });
        sync();
      }
      if (el.name === 'card') return;
      render(true);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = state();
      if (!st.kinds.length) { result.textContent = '꽃을 한 가지 이상 골라 주세요. 세 가지까지 고를 수 있어요.'; return; }
      var msg = card.value.trim();
      result.textContent = '이대로 주문하면 ' + A.bouquet(st).label + (msg ? ', 카드에는 “' + msg + '”' : '') + ', ' + fmt(priceOf(st)) + '원입니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
    });
    sync();
    render(false);
    // The first time the workbench comes into view the bouquet is tied in front of you, once.
    if (MOTION && ST) {
      setter(0.05);
      var built = false;
      ST.create({ trigger: svg, start: 'top 80%', once: true, onEnter: function () {
        built = true;
        var q = function (c) { return svg.querySelector(c); }, neck = '280 ' + (494 + dy);
        G.timeline()
          .from(q('.bq-stems'), { y: -26, opacity: 0, duration: 0.32, ease: 'power3.out' })
          .from(q('.bq-back'), { scaleY: 0.45, opacity: 0, duration: 0.36, ease: 'power3.out', svgOrigin: neck }, 0.08)
          .from(q('.bq-leaves'), { opacity: 0, scale: 0.86, duration: 0.32, ease: 'power2.out', svgOrigin: '280 ' + (300 + dy) }, 0.18)
          .add(function () { bloomIn(setter, 0.03); }, 0.24)
          .from(q('.bq-front'), { scaleY: 0.5, opacity: 0, duration: 0.34, ease: 'power3.out', svgOrigin: '280 ' + (506 + dy) }, 0.42)
          .from(q('.bq-ribbon'), { scale: 0.5, opacity: 0, duration: 0.42, ease: 'back.out(2.2)', transformOrigin: '50% 30%' }, 0.62);
      } });
    }
    bench = {
      // flowers planted in the hero become the workbench's first pick, until the visitor chooses
      suggest: function (kinds) {
        if (touched || !kinds.length) return;
        order = kinds.slice(0, 3);
        form.querySelectorAll('input[name="flower"]').forEach(function (el) { el.checked = order.indexOf(el.value) >= 0; });
        sync();
        hintEl.textContent = '정원에 심은 꽃으로 골라 두었어요. 바꿔도 돼요.';
        var keep = setter;
        render(false);
        if (MOTION && !built) setter(0.05);
        void keep;
      }
    };
  }
  var bench = null;

  /* ---------- choose which flower to plant ---------- */
  function initPicker() {
    var opts = Array.prototype.slice.call(document.querySelectorAll('.picker__opt'));
    if (!garden) { var p = document.querySelector('.picker'); if (p) p.hidden = true; return; }
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches, cursors = {}, recent = [];
    function cursorFor(kind) {
      if (!fine) return '';
      if (cursors[kind]) return cursors[kind];
      var c = document.createElement('canvas'), x = c.getContext('2d'), h = F.build(kind, { r: 10, seed: 7 });
      c.width = c.height = 32;
      var at = { tulip: [16, 27], freesia: [7, 27] }[kind] || [16, 16];
      x.translate(at[0], at[1]);
      x.scale(1, h.front ? h.tilt : 1);
      F.drawHead(x, h, 1);
      return (cursors[kind] = 'url(' + c.toDataURL('image/png') + ') 16 16, crosshair');
    }
    opts.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true', kind = b.getAttribute('data-kind');
        opts.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b && on)); });
        garden.choose(on ? kind : null, on ? cursorFor(kind) : '');
      });
    });
    garden.onPlant(function (kind) {
      recent = [kind].concat(recent.filter(function (k) { return k !== kind; })).slice(0, 3);
      if (bench) bench.suggest(recent);
    });
  }

  /* ---------- seasonal calendar ---------- */
  var MONTH_INFO = [
    ['라넌큘러스, 아네모네', '추운 날 겹겹이 피는 꽃이 가장 예쁜 달이에요. 라넌큘러스가 제일 싱싱하고 값도 순해요.'],
    ['프리지아, 튤립', '졸업식 꽃다발의 달. 프리지아 향이 가게를 가득 채웁니다.'],
    ['튤립, 프리지아, 라넌큘러스', '봄꽃이 한꺼번에 들어와요. 고르는 재미가 가장 큰 달입니다.'],
    ['튤립, 양귀비', '가게 이름이 된 달. 튤립 종류가 가장 많고 양귀비가 들어오기 시작해요.'],
    ['작약, 은방울꽃', '작약은 이 달에만 짧게 들어와요. 미리 말씀해 주시면 챙겨 둘게요.'],
    ['수국, 데이지', '물을 많이 먹는 수국은 줄기를 사선으로 다시 잘라 주세요.'],
    ['해바라기, 수국', '더운 날엔 꽃이 빨리 열려요. 시원한 곳에 두면 오래 갑니다.'],
    ['해바라기, 백일홍', '백 일 동안 핀다는 백일홍. 여름 내내 색이 선명해요.'],
    ['다알리아, 코스모스', '다알리아의 꽃잎 무늬가 가장 또렷해지는 달이에요.'],
    ['코스모스, 국화', '바람에 흔들리는 코스모스는 낮은 화병에 짧게 꽂아 보세요.'],
    ['국화, 안개꽃', '작은 국화 여러 송이에 안개꽃을 섞으면 오래 두고 보기 좋아요.'],
    ['안개꽃, 아네모네', '말려 두기 좋은 안개꽃과 겨울 아네모네로 한 해를 마무리해요.']
  ];
  function initSeason() {
    var btns = Array.prototype.slice.call(document.querySelectorAll('.month')), sets = [], bloom = [], tw = [];
    var now = 3, sel = now, REST = 0.6;  // the shop's story is April (사월)
    var mdMonth = document.getElementById('md-month'), mdNow = document.getElementById('md-now'), mdNames = document.getElementById('md-names'), mdNote = document.getElementById('md-note');
    btns.forEach(function (b, i) {
      var r = A.month(i), svg = b.querySelector('svg');
      svg.innerHTML = r.svg;
      sets[i] = mountHeads(svg, r.heads);
      bloom[i] = i === sel ? 1 : REST;
      sets[i](bloom[i]);
      b.setAttribute('aria-label', (i + 1) + '월, ' + MONTH_INFO[i][0]);
    });
    function to(i, target, dur) {
      if (tw[i]) tw[i].kill();
      if (!MOTION) { bloom[i] = target; sets[i](target); return; }
      var o = { b: bloom[i] };
      tw[i] = G.to(o, { b: target, duration: dur, ease: target > o.b ? 'power2.out' : 'power2.inOut', onUpdate: function () { bloom[i] = o.b; sets[i](o.b); } });
    }
    function select(i) {
      var prev = sel;
      sel = i;
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      detail.setAttribute('aria-live', 'polite');
      text(i);
      to(i, 1, 0.7);
      if (prev !== i && !btns[prev].matches(':hover') && document.activeElement !== btns[prev]) to(prev, REST, 0.35);
    }
    var detail = document.getElementById('month-detail');
    function text(i) {
      mdMonth.textContent = (i + 1) + '월';
      mdNow.hidden = i !== now;
      mdNames.textContent = MONTH_INFO[i][0];
      mdNote.textContent = MONTH_INFO[i][1];
    }
    btns.forEach(function (b, i) {
      // hovering previews the month (quietly, without announcing); leaving restores the chosen one
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { to(i, 1, 0.7); detail.setAttribute('aria-live', 'off'); text(i); } });
      b.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (i !== sel && document.activeElement !== b) to(i, REST, 0.35);
        text(sel); detail.setAttribute('aria-live', 'polite');
      });
      b.addEventListener('focus', function () { to(i, 1, 0.7); });
      b.addEventListener('blur', function () { if (i !== sel && !b.matches(':hover')) to(i, REST, 0.35); });
      b.addEventListener('click', function () { select(i); });
    });
    select(sel);
  }

  /* ---------- subscription ---------- */
  function nextDates(step) {
    var d = SHOT ? new Date(2026, 3, 7) : new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (((2 - d.getDay()) + 7) % 7 || 7));
    var out = [];
    for (var i = 0; i < 3; i++) { out.push((d.getMonth() + 1) + '월 ' + d.getDate() + '일'); d.setDate(d.getDate() + step); }
    return out.join(', ') + ' (화요일)';
  }
  function initSub() {
    var form = document.getElementById('sub-form'), cyc = document.getElementById('cycle'), dates = document.getElementById('sub-dates'), result = document.getElementById('sub-result');
    var rollers = Array.prototype.map.call(form.querySelectorAll('.price__num'), Roller);
    function update(anim) {
      var c = form.elements.cycle.value;
      cyc.setAttribute('data-cycle', c);
      rollers.forEach(function (r) { r.set(+r.el.getAttribute(c === '2' ? 'data-two' : 'data-four'), anim); });
      dates.textContent = nextDates(c === '2' ? 14 : 28);
      form.querySelectorAll('.plan').forEach(function (p) { p.classList.toggle('is-on', p.querySelector('input').checked); });
    }
    form.addEventListener('change', function () { result.textContent = ''; update(!REDUCED); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var plan = form.elements.plan.value === 'jar' ? '식탁 한 병' : '거실 한 아름', c = form.elements.cycle.value;
      result.textContent = plan + ', ' + c + '주마다 받는 구독으로 신청하면 첫 꽃은 ' + nextDates(14).split(',')[0] + '에 도착해요. 컨셉 시안이라 실제로 접수되지는 않습니다.';
    });
    update(false);
    var sets = [];
    form.querySelectorAll('[data-vase]').forEach(function (svg) {
      var r = A.vase(svg.getAttribute('data-vase'));
      svg.innerHTML = r.svg;
      sets.push(mountHeads(svg, r.heads));
    });
    if (MOTION && ST) {
      sets.forEach(function (s) { s(0.05); });
      ST.create({ trigger: '.table', start: 'top 80%', once: true, onEnter: function () { sets.forEach(function (s) { bloomIn(s, 0.05); }); } });
    }
  }

  /* ---------- the hero's quiet entrance ---------- */
  function initEntrance() {
    if (!G) return;
    var mm = G.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, function (c) {
      if (c.conditions.reduce || SHOT) return;
      G.from(['.hero__title', '.hero__lead', '.hero__cta', '.hero__hint'], { y: 16, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.05, clearProps: 'transform,opacity' });
    });
  }

  function initMeadow() {
    var svg = document.getElementById('meadow');
    if (svg) svg.innerHTML = A.meadow(1440, 120).svg;
  }

  var defs = document.getElementById('flora-defs');
  if (defs && !defs.querySelector('defs')) defs.innerHTML = F.defs();
  guard(initNav);
  guard(initEntrance);
  guard(initGarden);
  guard(initPetals);
  guard(initSpecimens);
  guard(initBench);
  guard(initSeason);
  guard(initSub);
  guard(initPicker);
  guard(initMeadow);
  if (ST) {
    var refresh = function () { ST.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }
})();
