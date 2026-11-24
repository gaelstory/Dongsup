/* 온기 베이커리: bread-pile physics, live bake timeline, stamp card */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var isShot = /[?&]shot=1/.test(location.search);
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motionOK = function () { return !reduceMQ.matches; };
  var hasGsap = typeof window.gsap !== 'undefined';

  function safely(fn, onFail) {
    try { fn(); } catch (err) {
      root.classList.add('no-motion');
      if (onFail) onFail(err);
    }
  }

  /* ---------------- mobile navigation ---------------- */
  function initNav() {
    var btn = document.querySelector('.menu-btn');
    var nav = document.getElementById('site-nav');
    var label = btn.querySelector('.menu-btn__label');
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var mq = window.matchMedia('(max-width: 959px)');
    var open = false;

    function setOpen(next, returnFocus) {
      open = next;
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? '닫기' : '메뉴';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) links[0].focus();
      else if (returnFocus) btn.focus();
    }
    btn.addEventListener('click', function () { setOpen(!open, true); });
    nav.addEventListener('click', function (e) {
      if (open && e.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
      if (e.key === 'Tab') {
        var items = [btn].concat(links);
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    var onChange = function () { if (!mq.matches && open) setOpen(false, false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  }

  /* ---------------- the bread pile (Canvas 2D, hand-rolled rigid circles) ---------------- */
  function initPile() {
    var hero = document.querySelector('.hero');
    var canvas = hero.querySelector('.pile');
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unavailable');
    var shakeBtn = hero.querySelector('.shake');
    var hint = hero.querySelector('.hero__hint');

    // Physics values from the brief.
    var G = 1800, REST = 0.35, DT = 1 / 120, ITER = 4, MU = 0.55;
    var DAMP = Math.sqrt(0.99); // 0.99 per 60fps frame, split over the two 1/120 substeps
    var ART = 0.92;             // sprite art fills 92% of its 200-unit box, so collisions match the drawing
    var WAKE_V = 140;
    var TAU = Math.PI * 2;

    var TYPES = ['cro', 'salt', 'loaf', 'donut', 'tart', 'bagel', 'anpan'];
    var BIAS = { cro: 1, loaf: 0.9, salt: 0.86, bagel: 0.78, donut: 0.74, anpan: 0.7, tart: 0.64 };

    var sheet = document.querySelector('svg.sprites');
    var ser = new XMLSerializer();
    var defsXML = ser.serializeToString(sheet.querySelector('defs'));
    var symXML = {};
    TYPES.forEach(function (t) {
      var sym = document.getElementById('b-' + t), s = '';
      for (var n = sym.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) s += ser.serializeToString(n);
      symXML[t] = s;
    });

    var W = 0, H = 0, dpr = 1, tier = '', plan = null;
    var bodies = [];
    var simTime = 0;
    var running = false, rafId = 0, lastT = 0, acc = 0;
    var visible = true;
    var staticMode = reduceMQ.matches;
    var grab = null, grabOff = { x: 0, y: 0 };
    var pointer = { x: 0, y: 0, px: 0, py: 0, inside: false, type: 'mouse', moved: false };
    var rand = Math.random;

    function mulberry(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* sprites: each bread SVG is rasterised once per size, with a 3px cocoa outline at that size */
    var cache = {};
    function sprite(type, r) {
      var css = (2 * r) / ART;
      var px = Math.ceil(css * dpr);
      var key = type + ':' + px;
      if (cache[key]) return cache[key];
      var ol = ((3 * 200) / css).toFixed(2);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="' + px + '" height="' + px +
        '" style="--ol:' + ol + 'px">' + defsXML + symXML[type] + '</svg>';
      var art = document.createElement('canvas');
      var shadow = document.createElement('canvas');
      art.width = art.height = shadow.width = shadow.height = px;
      var entry = { art: art, shadow: shadow, ready: null };
      entry.ready = new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          art.getContext('2d').drawImage(img, 0, 0, px, px);
          var s = shadow.getContext('2d');
          s.drawImage(art, 0, 0);
          s.globalCompositeOperation = 'source-in';
          s.fillStyle = '#45220F';
          s.fillRect(0, 0, px, px);
          resolve();
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      cache[key] = entry;
      return entry;
    }

    function measure() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, W < 600 ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (W < 600) {
        // Phones: the copy spans the width, so the pile is sized to the free band beneath it.
        var hr = hero.getBoundingClientRect(), last = null;
        [hint, hero.querySelector('.hero__actions'), hero.querySelector('.hero__sub')].some(function (el) {
          if (el && !el.hidden && el.getBoundingClientRect().height) { last = el; return true; }
          return false;
        });
        var band = Math.max(60, H - (last ? last.getBoundingClientRect().bottom - hr.top : H * 0.55) - 8);
        var rM = Math.max(18, Math.min(40, band * 0.32)), rm = Math.max(14, rM * 0.55), avg = (rM + rm) / 2;
        plan = { n: Math.max(4, Math.min(14, Math.round((W * band * 0.42) / (Math.PI * avg * avg)))), rMin: rm, rMax: rM };
        return 's' + plan.n + ':' + Math.round(rM);
      }
      // Count and size follow the hero's area, so short laptop screens get a lower pile.
      var area = W * H;
      var rMax = Math.max(40, Math.min(64, H * 0.071));
      plan = {
        n: Math.max(12, Math.min(area > 1.8e6 ? 32 : 26, Math.round(area / 50000))),
        rMin: rMax * 0.53, rMax: rMax
      };
      return (W < 1000 ? 'm' : 'l') + plan.n + ':' + Math.round(rMax);
    }

    // The words are solid: each headline line, the sticker and the copy block are static boxes.
    var boxes = [];
    var copy = {
      lines: Array.prototype.slice.call(hero.querySelectorAll('.hero__title .t1, .hero__title .t2, .hero__title .t3')),
      sticker: hero.querySelector('.first-batch'),
      block: [hero.querySelector('.hero__sub'), hero.querySelector('.hero__actions'), hint]
    };
    function measureBoxes() {
      boxes = [];
      if (tier.charAt(0) === 's') return; // phones: the pile stays below the copy on its own
      var cr = canvas.getBoundingClientRect(), pad = 10, range = document.createRange();
      function add(r) {
        if (!r || !r.width || !r.height) return;
        boxes.push({ l: r.left - cr.left - pad, t: r.top - cr.top - pad, r: r.right - cr.left + pad, b: r.bottom - cr.top + pad });
      }
      var rows = [];
      copy.lines.forEach(function (el) {
        range.selectNodeContents(el);
        Array.prototype.forEach.call(range.getClientRects(), function (r) {
          var row = rows.filter(function (q) { return Math.abs(q.top - r.top) < r.height * 0.5; })[0];
          if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); row.bottom = Math.max(row.bottom, r.bottom); }
          else rows.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: 1, height: r.height });
        });
      });
      rows.forEach(add);
      add(copy.sticker.getBoundingClientRect());
      var u = null;
      copy.block.forEach(function (el) {
        if (!el || el.hidden) return;
        var r;
        if (el.tagName === 'P') { range.selectNodeContents(el); r = range.getBoundingClientRect(); }
        else {
          // a flex row is as wide as the hero; only its buttons are solid
          r = null;
          Array.prototype.forEach.call(el.children, function (c) {
            if (c.hidden) return;
            var q = c.getBoundingClientRect();
            if (!q.width) return;
            r = r ? { left: Math.min(r.left, q.left), top: Math.min(r.top, q.top), right: Math.max(r.right, q.right), bottom: Math.max(r.bottom, q.bottom), width: 1 } : { left: q.left, top: q.top, right: q.right, bottom: q.bottom, width: 1 };
          });
        }
        if (!r || !r.width) return;
        u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
      if (u) { u.width = u.right - u.left; u.height = u.bottom - u.top; add(u); }
      // Bread that lands on top of a box slides toward the side with more room.
      boxes.forEach(function (bx) { bx.dir = bx.l > W - bx.r ? -1 : 1; });
    }
    function hitBox(b, bx, first, dt) {
      var cx = Math.max(bx.l, Math.min(b.x, bx.r)), cy = Math.max(bx.t, Math.min(b.y, bx.b));
      var dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
      if (d2 >= b.r * b.r) return;
      var nx, ny, pen;
      if (d2 > 1e-6) {
        var d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = b.r - d;
      } else {
        var m = Math.min(b.y - bx.t, bx.b - b.y, b.x - bx.l, bx.r - b.x);
        if (m === b.y - bx.t) { nx = 0; ny = -1; pen = m + b.r; }
        else if (m === bx.b - b.y) { nx = 0; ny = 1; pen = m + b.r; }
        else if (m === b.x - bx.l) { nx = -1; ny = 0; pen = m + b.r; }
        else { nx = 1; ny = 0; pen = m + b.r; }
      }
      b.x += nx * pen; b.y += ny * pen;
      b.touch = true;
      var vn = b.vx * nx + b.vy * ny;
      if (first && vn < 0) {
        var e = vn < -90 ? REST : 0;
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      }
      if (ny < -0.5 && first) {
        b.onCopy = true;
        b.vx += bx.dir * 2600 * dt;
        b.w += bx.dir * 2600 * dt / b.r;
      }
    }

    function spawnX(r) {
      var x;
      if (tier.charAt(0) === 's') x = r + rand() * (W - 2 * r);
      else {
        var heavy = tier.charAt(0) === 'l' ? 0.72 : 0.6;
        x = rand() < heavy ? W * (0.44 + rand() * 0.52) : W * (0.04 + rand() * 0.4);
      }
      return Math.min(W - r, Math.max(r, x));
    }

    function build() {
      var n = plan.n, rMin = plan.rMin, rMax = plan.rMax;
      var order = [];
      bodies = [];
      for (var i = 0; i < n; i++) {
        if (!order.length) order = TYPES.slice().sort(function () { return rand() - 0.5; });
        var type = order.pop();
        var k = Math.min(1, Math.max(0, BIAS[type] * 0.8 + rand() * 0.34 - 0.12));
        var r = Math.round(rMin + (rMax - rMin) * k);
        bodies.push({
          type: type, r: r, im: 1 / (r * r),
          x: 0, y: 0, vx: 0, vy: 0, a: rand() * TAU, w: 0,
          active: false, sleep: false, still: 0, touch: false, lift: 0,
          spawnAt: i < 12 ? i * 0.022 + rand() * 0.04 : 0.95 + (i - 12) * 0.09 + rand() * 0.05,
          spr: sprite(type, r)
        });
      }
      bodies.forEach(function (b) {
        b.x = spawnX(b.r);
        b.y = -b.r - rand() * 70;
        b.vx = (rand() - 0.5) * 140;
        b.vy = 520 + rand() * 260;
        b.w = (rand() - 0.5) * 7;
      });
      simTime = 0;
      return Promise.all(bodies.map(function (b) { return b.spr.ready; }));
    }

    function wakeAll() {
      for (var i = 0; i < bodies.length; i++) { bodies[i].sleep = false; bodies[i].still = 0; }
    }
    function putToSleep(b) { b.sleep = true; b.vx = b.vy = b.w = 0; b.still = 0; }

    function collide(A, B, first) {
      var dx = B.x - A.x, dy = B.y - A.y, rs = A.r + B.r, d2 = dx * dx + dy * dy;
      if (d2 >= rs * rs) return;
      var d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d, pen = rs - d;
      var rvx = B.vx - A.vx, rvy = B.vy - A.vy, vn = rvx * nx + rvy * ny;
      if ((A.sleep || B.sleep) && vn < -WAKE_V) {
        if (A.sleep) { A.sleep = false; A.still = 0; }
        if (B.sleep) { B.sleep = false; B.still = 0; }
      }
      var ia = A.sleep ? 0 : A.im, ib = B.sleep ? 0 : B.im;
      if (A === grab) ia *= 0.12;
      if (B === grab) ib *= 0.12;
      var sum = ia + ib;
      if (sum <= 0) return;
      A.touch = true; B.touch = true;
      var corr = (Math.max(pen - 0.25, 0) * 0.8) / sum;
      A.x -= nx * corr * ia; A.y -= ny * corr * ia;
      B.x += nx * corr * ib; B.y += ny * corr * ib;
      if (!first || vn >= 0) return;
      var e = vn < -90 ? REST : 0;
      var jn = (-(1 + e) * vn) / sum;
      A.vx -= jn * nx * ia; A.vy -= jn * ny * ia;
      B.vx += jn * nx * ib; B.vy += jn * ny * ib;
      // Friction at the contact turns sliding into spin, which is what makes them roll and tumble.
      var tx = -ny, ty = nx;
      var vt = (B.vx - A.vx) * tx + (B.vy - A.vy) * ty - (A.w * A.r + B.w * B.r);
      var jt = -vt / (3 * sum), lim = MU * jn;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      A.vx -= jt * tx * ia; A.vy -= jt * ty * ia;
      B.vx += jt * tx * ib; B.vy += jt * ty * ib;
      A.w -= (2 * jt * ia) / A.r;
      B.w -= (2 * jt * ib) / B.r;
    }

    function walls(b, first) {
      if (b.sleep) return;
      var r = b.r;
      if (b.y + r > H) {
        b.y = H - r;
        b.touch = true;
        if (first && b.vy > 0) {
          var before = b.vy;
          b.vy = before > 90 ? -before * REST : 0;
          var nImp = before - b.vy;
          var slip = b.vx - b.w * r;
          var dv = -slip / 3, lim = MU * nImp;
          if (dv > lim) dv = lim; else if (dv < -lim) dv = -lim;
          b.vx += dv;
          b.w -= (2 * dv) / r;
        }
      }
      if (b.x - r < 0) { b.x = r; if (b.vx < 0) b.vx = -b.vx * REST; }
      else if (b.x + r > W) { b.x = W - r; if (b.vx > 0) b.vx = -b.vx * REST; }
      for (var k = 0; k < boxes.length; k++) hitBox(b, boxes[k], first, DT);
    }

    function step(dt) {
      var n = bodies.length, i, j, b, c;
      for (i = 0; i < n; i++) {
        b = bodies[i];
        if (!b.active) {
          if (simTime < b.spawnAt) continue;
          b.active = true;
        }
        if (b.sleep) continue;
        if (b === grab) {
          // Spring the grabbed bread toward the pointer so it lags and swings a little.
          b.vx += ((pointer.x - grabOff.x - b.x) * 900 - b.vx * 46) * dt;
          b.vy += ((pointer.y - grabOff.y - b.y) * 900 - b.vy * 46) * dt;
          b.w *= 0.92;
        } else {
          b.vy += G * dt;
        }
        b.vx *= DAMP; b.vy *= DAMP; b.w *= 0.996;
        var sp = b.vx * b.vx + b.vy * b.vy;
        if (sp > 3400 * 3400) { var s = 3400 / Math.sqrt(sp); b.vx *= s; b.vy *= s; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
        b.touch = false;
        b.onCopy = false;
      }
      for (var it = 0; it < ITER; it++) {
        var first = it === 0;
        for (i = 0; i < n; i++) {
          b = bodies[i];
          if (!b.active) continue;
          for (j = i + 1; j < n; j++) {
            c = bodies[j];
            if (!c.active || (b.sleep && c.sleep)) continue;
            collide(b, c, first);
          }
        }
        for (i = 0; i < n; i++) if (bodies[i].active) walls(bodies[i], first);
      }
      for (i = 0; i < n; i++) {
        b = bodies[i];
        if (!b.active || b.sleep) continue;
        if (b.touch) { b.w *= 0.965; b.vx *= 0.994; }
        if (b !== grab && !b.onCopy && b.touch && b.vx * b.vx + b.vy * b.vy < 196 && Math.abs(b.w) < 0.3) {
          b.still += dt;
          if (b.still > 0.45) putToSleep(b);
        } else b.still = 0;
      }
      simTime += dt;
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (!b.active) continue;
        b.lift += ((b === grab ? 1 : 0) - b.lift) * 0.25;
        var s = (b.r / ART) * (1 + b.lift * 0.07);
        var cos = Math.cos(b.a) * dpr, sin = Math.sin(b.a) * dpr;
        var off = 4 + b.lift * 10;
        // hard sticker shadow: same silhouette, pushed down, flat cocoa
        ctx.globalAlpha = 0.24 + b.lift * 0.06;
        ctx.setTransform(cos, sin, -sin, cos, (b.x + off * 0.4) * dpr, (b.y + off) * dpr);
        ctx.drawImage(b.spr.shadow, -s, -s, 2 * s, 2 * s);
        ctx.globalAlpha = 1;
        ctx.setTransform(cos, sin, -sin, cos, b.x * dpr, b.y * dpr);
        ctx.drawImage(b.spr.art, -s, -s, 2 * s, 2 * s);
      }
    }

    function idle() {
      if (grab) return false;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (!b.active || !b.sleep || b.lift > 0.01) return false;
      }
      return !pointer.moved;
    }

    function pushByPointer(dt) {
      if (!pointer.moved) return;
      pointer.moved = false;
      if (!pointer.inside || grab || pointer.type !== 'mouse' || dt <= 0) return;
      var pvx = (pointer.x - pointer.px) / dt, pvy = (pointer.y - pointer.py) / dt;
      pointer.px = pointer.x; pointer.py = pointer.y;
      if (pvx * pvx + pvy * pvy < 60 * 60) return;
      var any = false;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (!b.active) continue;
        var dx = b.x - pointer.x, dy = b.y - pointer.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 120) continue;
        var f = 1 - d / 120;
        var kx = Math.max(-260, Math.min(260, pvx * 0.07)) * f + (dx / (d || 1)) * 70 * f;
        var ky = Math.max(-260, Math.min(260, pvy * 0.07)) * f + (dy / (d || 1)) * 50 * f - 40 * f;
        if (!any) { wakeAll(); any = true; }
        b.vx += kx; b.vy += ky;
        b.w += (kx / b.r) * 0.6;
      }
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      pushByPointer(dt);
      acc += dt;
      var steps = 0;
      while (acc >= DT && steps < 6) { step(DT); acc -= DT; steps++; }
      if (steps === 6) acc = 0;
      draw();
      if (idle()) { running = false; return; }
      rafId = requestAnimationFrame(frame);
    }
    function kick() {
      if (running || staticMode || !visible || document.hidden) return;
      running = true;
      lastT = performance.now();
      acc = 0;
      rafId = requestAnimationFrame(frame);
    }
    function halt() { running = false; cancelAnimationFrame(rafId); }

    // Settle the pile synchronously (reduced motion and ?shot=1): 600 fixed steps, then draw once.
    function settle(steps) {
      measureBoxes();
      var n = bodies.length;
      for (var i = 0; i < n; i++) {
        var b = bodies[i];
        // Keep the still pile clear of the headline column: most bread settles on the right.
        if (tier.charAt(0) !== 's') b.x = rand() < 0.82 ? W * (0.5 + rand() * 0.47) : W * (0.03 + rand() * 0.4);
        b.x = Math.min(W - b.r, Math.max(b.r, b.x));
        b.active = true; b.sleep = false; b.spawnAt = 0;
        b.y = H * 0.5 - i * (tier.charAt(0) === 's' ? 46 : 64) - b.r;
        // start clear of the words so nothing is born inside a box
        for (var q = 0; q < boxes.length; q++) {
          var bx = boxes[q];
          if (b.x + b.r > bx.l && b.x - b.r < bx.r && b.y + b.r > bx.t && b.y - b.r < bx.b) b.y = bx.t - b.r - 2;
        }
        b.vx = (rand() - 0.5) * 60; b.vy = 200; b.w = (rand() - 0.5) * 4;
      }
      simTime = 10;
      for (var s = 0; s < steps; s++) step(DT);
      for (var k = 0; k < n; k++) putToSleep(bodies[k]);
      draw();
    }

    function local(e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.type = e.pointerType || 'mouse';
    }
    function hit(x, y) {
      for (var i = bodies.length - 1; i >= 0; i--) {
        var b = bodies[i];
        if (!b.active) continue;
        var dx = x - b.x, dy = y - b.y;
        if (dx * dx + dy * dy < b.r * b.r * 0.95) return b;
      }
      return null;
    }
    function pop(x, y, strength, radius) {
      wakeAll();
      var R = radius || 190;
      var near = bodies.filter(function (b) { return b.active && Math.max(0, Math.hypot(b.x - x, b.y - y) - b.r) <= R; });
      if (!near.length) {
        // Tapped far from the pile: still bounce the five nearest pieces, a little softer.
        bodies.filter(function (b) { return b.active; })
          .sort(function (a, c) { return Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y); })
          .slice(0, 5).forEach(function (b) {
            b.vy -= (650 + 700 * 0.6) * strength * (0.8 + rand() * 0.4);
            b.vx += (rand() - 0.5) * 260;
            b.w += (rand() - 0.5) * 10;
          });
        kick();
        return;
      }
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (!b.active) continue;
        var dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy);
        var gap = Math.max(0, d - b.r);
        if (gap > R) continue;
        var f = 1 - gap / R;
        b.vy -= (650 + 700 * f) * strength * (0.8 + rand() * 0.4);
        b.vx += (dx / (d || 1)) * 420 * f * strength + (rand() - 0.5) * 140;
        b.w += (rand() - 0.5) * 16 * f;
      }
      kick();
    }
    function shakeAll() {
      if (staticMode) {
        rand = Math.random;
        bodies.forEach(function (b) { b.x = spawnX(b.r); });
        settle(600);
        return;
      }
      wakeAll();
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (!b.active) { b.active = true; b.y = -b.r; }
        b.vy = -(900 + rand() * 900) * Math.min(1, 0.55 + (b.y / H) * 0.6);
        b.vx = (rand() - 0.5) * 520;
        b.w = (rand() - 0.5) * 18;
      }
      kick();
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (staticMode) return;
      local(e);
      pointer.px = pointer.x; pointer.py = pointer.y;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        if (e.button !== 0) return;
        var b = hit(pointer.x, pointer.y);
        if (b) {
          e.preventDefault();
          grab = b;
          grabOff.x = (pointer.x - b.x) * 0.6;
          grabOff.y = (pointer.y - b.y) * 0.6;
          bodies.splice(bodies.indexOf(b), 1);
          bodies.push(b);
          wakeAll();
          canvas.classList.add('is-grabbing');
          try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
          kick();
        } else {
          pop(pointer.x, pointer.y, 0.75, 150);
        }
      } else {
        // Touch: no dragging, so the page still scrolls. A tap bounces the nearby bread instead.
        pop(pointer.x, pointer.y, 1, 210);
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (staticMode) return;
      local(e);
      pointer.inside = true;
      if (e.pointerType !== 'mouse') return;
      pointer.moved = true;
      if (!grab) canvas.classList.toggle('is-hot', !!hit(pointer.x, pointer.y));
      kick();
    }, { passive: true });
    function release() {
      if (!grab) return;
      grab = null;
      canvas.classList.remove('is-grabbing');
      kick();
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('pointerleave', function () { pointer.inside = false; canvas.classList.remove('is-hot'); });
    if (shakeBtn) shakeBtn.addEventListener('click', shakeAll);

    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) kick(); else halt();
    });
    io.observe(hero);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) halt(); else kick();
    });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var oldDpr = dpr, newTier = measure();
        if (newTier !== tier || oldDpr !== dpr) {
          tier = newTier;
          halt();
          measureBoxes();
          build().then(function () {
            if (staticMode || isShot) settle(600); else { draw(); kick(); }
          });
          return;
        }
        measureBoxes();
        for (var i = 0; i < bodies.length; i++) {
          var b = bodies[i];
          b.x = Math.min(W - b.r, Math.max(b.r, b.x));
          b.y = Math.min(H - b.r, b.y);
        }
        wakeAll();
        if (staticMode) settle(240); else { draw(); kick(); }
      }, 150);
    });

    var onReduce = function () {
      staticMode = reduceMQ.matches;
      if (staticMode) { halt(); settle(600); }
      if (hint) hint.hidden = staticMode;
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduce); else reduceMQ.addListener(onReduce);

    tier = measure();
    measureBoxes();
    // The copy settles after fonts load and the short entrance, so measure the boxes again then.
    var remeasure = function () {
      var before = JSON.stringify(boxes);
      measureBoxes();
      if (JSON.stringify(boxes) !== before) { wakeAll(); kick(); }
    };
    var fontsReady = new Promise(function (res) {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(res);
      setTimeout(res, 800);
    });
    fontsReady.then(function () { setTimeout(remeasure, 30); });
    setTimeout(remeasure, 750);
    if (isShot) rand = mulberry(36);
    build().then(function () {
      root.classList.add('pile-ready');
      if (shakeBtn) shakeBtn.hidden = false;
      if (hint) hint.hidden = staticMode;
      if (staticMode || isShot) {
        // the still pile is computed once, against the final text boxes
        return fontsReady.then(function () { settle(600); rand = Math.random; });
      }
      kick();
    }).catch(function () {
      root.classList.add('pile-failed');
    });
  }

  /* ---------------- bake timeline with a live "now" marker (Seoul time) ---------------- */
  function initRack() {
    var rack = document.querySelector('.rack');
    var marker = rack.querySelector('.rack__now');
    var label = marker.querySelector('.rack__now-label');
    var status = document.querySelector('.bake__now');
    var items = Array.prototype.slice.call(rack.querySelectorAll('.batch'));
    var wide = window.matchMedia('(min-width: 900px)');
    var batches = items.map(function (el) {
      return { el: el, min: +el.getAttribute('data-min'), name: el.querySelector('.batch__name').textContent, state: el.querySelector('.batch__state') };
    });
    var START = 420, END = 1020; // 07:00 to 17:00 on the rack

    function now() {
      var d = new Date(), h, m, wd;
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(d);
        parts.forEach(function (p) {
          if (p.type === 'hour') h = +p.value;
          else if (p.type === 'minute') m = +p.value;
          else if (p.type === 'weekday') wd = p.value;
        });
      } catch (_) { /* old engines: fall back to local time */ }
      if (h === undefined) { h = d.getHours(); m = d.getMinutes(); wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]; }
      return { min: (h % 24) * 60 + m, text: String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0'), monday: wd === 'Mon' };
    }
    function span(n) {
      var h = Math.floor(n / 60), m = n % 60;
      return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분';
    }

    function update() {
      var t = now();
      var next = null, i;
      for (i = 0; i < batches.length; i++) if (batches[i].min > t.min) { next = batches[i]; break; }
      var open = !t.monday && t.min >= 450 && t.min < 1200;
      batches.forEach(function (b) {
        var past = !t.monday && t.min >= b.min && t.min < 1200;
        var isNext = !t.monday && next === b && t.min < 1200;
        b.el.classList.toggle('is-past', past);
        b.el.classList.toggle('is-next', isNext);
        b.state.textContent = past ? (t.min - b.min < 30 ? '갓 나왔어요' : '나왔어요') : isNext ? span(b.min - t.min) + ' 뒤' : '';
      });
      var msg;
      if (t.monday) msg = '오늘은 월요일, 쉬는 날이에요. 화요일 아침 7시 반에 첫 판이 나와요.';
      else if (t.min >= 1200) msg = '지금은 ' + t.text + ', 오늘은 문을 닫았어요. 내일 아침 7시 반에 첫 판이 나와요.';
      else if (next && !open) msg = '지금은 ' + t.text + '. 첫 판까지 ' + span(next.min - t.min) + ' 남았어요.';
      else if (next) msg = '지금은 ' + t.text + '. 다음 판은 ' + next.name + ', ' + span(next.min - t.min) + ' 남았어요.';
      else msg = '지금은 ' + t.text + '. 오늘 굽기는 끝났어요. 남은 빵은 매장에서 확인해 주세요.';
      status.textContent = msg;

      // The rack only covers 07:00 to 17:00; outside that the sentence above says it all.
      if (t.monday || t.min < START || t.min > END) { marker.hidden = true; return; }
      marker.hidden = false;
      label.textContent = '지금 ' + t.text;
      if (wide.matches) {
        var p = Math.min(1, Math.max(0, (t.min - START) / (END - START)));
        marker.style.left = (p * 100).toFixed(2) + '%';
        marker.style.top = '';
        marker.classList.toggle('is-flip', p > 0.8);
      } else {
        var k = 0;
        for (i = 0; i < batches.length; i++) if (t.min >= batches[i].min) k = i + 1;
        var y;
        var list = rack.querySelector('.rack__list');
        var gap = parseFloat(getComputedStyle(list).rowGap) || 40;
        if (k === 0) y = items[0].offsetTop - gap / 2;
        else if (k === items.length) y = items[k - 1].offsetTop + items[k - 1].offsetHeight + gap / 2;
        else y = (items[k - 1].offsetTop + items[k - 1].offsetHeight + items[k].offsetTop) / 2;
        marker.style.top = Math.round(y) + 'px';
        marker.style.left = '';
      }
    }
    update();
    setInterval(update, 30000);
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(update, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  }

  /* ---------------- stamp card ---------------- */
  function initStamps() {
    var slots = Array.prototype.slice.call(document.querySelectorAll('.slot'));
    var coupon = document.querySelector('.coupon');
    var nEl = document.querySelector('.coupon__n');
    var status = document.querySelector('.stamp__status');
    var reset = document.querySelector('.stamp__reset');
    var reward = document.querySelector('.coupon__reward');
    var confetti = document.querySelector('.confetti');
    var count = 0;
    var COLORS = ['#FFD84D', '#E3002B', '#BDE8D3', '#FFF9EA', '#D98A3A'];
    var BREADS = ['cro', 'salt', 'loaf', 'donut', 'tart', 'bagel', 'anpan'];
    var ns = 'http://www.w3.org/2000/svg';

    function say() {
      nEl.textContent = count;
      reset.hidden = count === 0;
      if (count === 0) status.textContent = '아직 도장이 없어요. 칸을 눌러 찍어 보세요.';
      else if (count < 10) status.textContent = '도장 ' + count + '개. 한 잔까지 ' + (10 - count) + '개 남았어요. 잘못 찍었으면 한 번 더 누르세요.';
      else status.textContent = '열 칸을 다 채웠어요. 아메리카노 한 잔은 저희가 살게요.';
    }

    // The tenth stamp pays out in bread: little loaves and sprinkles burst from the cup slot.
    function burst() {
      if (!motionOK() || !hasGsap) return;
      confetti.textContent = '';
      var cup = slots[9];
      // the slot's offsetParent is the coupon itself
      confetti.style.left = (cup.offsetLeft + cup.offsetWidth / 2) + 'px';
      confetti.style.top = (cup.offsetTop + cup.offsetHeight / 2) + 'px';
      for (var i = 0; i < 46; i++) {
        var piece;
        if (i < 14) {
          piece = document.createElement('span');
          piece.className = 'crumb';
          piece.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><use href="#b-' + BREADS[i % BREADS.length] + '"/></svg>';
        } else {
          piece = document.createElement('i');
          piece.style.background = COLORS[i % COLORS.length];
          if (i % 3 === 0) { piece.style.width = '11px'; piece.style.height = '11px'; piece.style.borderRadius = '50%'; }
        }
        confetti.appendChild(piece);
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5, dist = 120 + Math.random() * 240;
        var tl = gsap.timeline({ onComplete: (function (p) { return function () { p.remove(); }; })(piece) });
        tl.fromTo(piece, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 0.9 }, {
          x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 0.8 - 60 - Math.random() * 60,
          rotation: (Math.random() - 0.5) * 540, scale: 1, duration: 0.55, ease: 'power3.out'
        }).to(piece, { y: '+=' + (260 + Math.random() * 180), rotation: '+=' + (Math.random() * 300), duration: 0.95, ease: 'power1.in' })
          .to(piece, { opacity: 0, duration: 0.3 }, '-=0.3');
      }
    }

    function stamp(slot) {
      slot.setAttribute('aria-pressed', 'true');
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'slot__ink');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS(ns, 'use');
      use.setAttribute('href', '#stamp-ink');
      svg.appendChild(use);
      slot.appendChild(svg);
      var rot = Math.random() * 16 - 8;
      if (motionOK() && hasGsap) {
        gsap.fromTo(svg, { scale: 1.3, rotation: rot, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: 'back.out(2.2)' });
      } else {
        svg.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
      }
      count++;
      say();
      if (count === 10) {
        reward.hidden = false;
        if (motionOK() && hasGsap) gsap.fromTo(reward, { scale: 1.15, rotation: -9, opacity: 0 }, { scale: 1, rotation: -2, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' });
        burst();
      }
    }
    // A second press lifts a mis-placed stamp.
    function lift(slot) {
      slot.setAttribute('aria-pressed', 'false');
      var ink = slot.querySelector('.slot__ink');
      if (ink) {
        if (motionOK() && hasGsap) gsap.to(ink, { opacity: 0, scale: 0.92, duration: 0.12, ease: 'power1.in', onComplete: function () { ink.remove(); } });
        else ink.remove();
      }
      count--;
      if (count < 10) reward.hidden = true;
      say();
    }
    slots.forEach(function (slot) {
      slot.addEventListener('click', function () {
        if (slot.getAttribute('aria-pressed') === 'true') lift(slot); else stamp(slot);
      });
    });
    reset.addEventListener('click', function () {
      slots.forEach(function (slot) {
        slot.setAttribute('aria-pressed', 'false');
        var ink = slot.querySelector('.slot__ink');
        if (ink) ink.remove();
      });
      reward.hidden = true;
      confetti.textContent = '';
      count = 0;
      say();
      slots[0].focus();
    });
    say();
  }

  /* ---------------- quiet scroll moments + menu wobble ---------------- */
  function initMotion() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.item'));
    function wobble(art) {
      if (!art || !motionOK() || !art.animate) return;
      art.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(0deg)' }],
        { duration: 300, easing: 'cubic-bezier(0.37, 0, 0.63, 1)' });
    }
    items.forEach(function (item) {
      var art = item.querySelector('.item__art');
      item.addEventListener('mouseenter', function () { if (fineMQ.matches) wobble(art); });
    });

    if (!hasGsap || typeof window.ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    var mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 900px)' }, function (c) {
      if (!c.conditions.motion) return;
      if (!isShot) {
        gsap.from('.hero__sub, .hero__actions, .hero__hint', { y: 14, opacity: 0, duration: 0.5, stagger: 0.07, delay: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' });
        gsap.from('.first-batch', { scale: 1.5, rotation: 34, opacity: 0, duration: 0.5, delay: 0.4, ease: 'back.out(2.4)', clearProps: 'opacity' });
      }
      gsap.from('.rack__line', {
        scaleX: c.conditions.wide ? 0 : 1, scaleY: c.conditions.wide ? 1 : 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '.rack', start: 'top 82%', once: true }
      });
      gsap.from('.batch__card', {
        y: 18, scale: 0.94, opacity: 0, duration: 0.5, stagger: 0.09, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.rack', start: 'top 82%', once: true }
      });
      gsap.set('.item', { y: 22, opacity: 0 });
      ScrollTrigger.batch('.item', {
        start: 'top 90%', once: true,
        onEnter: function (els) {
          gsap.to(els, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out' });
          // No hover on touch screens, so each loaf tilts once as its row arrives.
          if (!fineMQ.matches) els.forEach(function (el, k) { setTimeout(function () { wobble(el.querySelector('.item__art')); }, 380 + k * 70); });
        }
      });
      gsap.from('.recipe', {
        y: 56, rotation: -11, opacity: 0, duration: 0.7, ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '.story__grid', start: 'top 82%', once: true }
      });
      gsap.from('.coupon', {
        y: 40, rotation: 4, opacity: 0, duration: 0.6, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.stamp__grid', start: 'top 82%', once: true }
      });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  safely(initNav);
  safely(initPile, function () { root.classList.add('pile-failed'); });
  safely(initRack);
  safely(initStamps);
  safely(initMotion);
})();
