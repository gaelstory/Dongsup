/* Kkoribyeol hero playground: throw the tennis ball and the nearest dog fetches it.
   The ball is a Draggable button; on release its InertiaPlugin velocity seeds a small gravity/bounce sim.
   When it has rested for 0.6s the nearest dog hops over, picks it up and brings it back to the mat. */
(function () {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function create(hero, opts) {
    opts = opts || {};
    var gsap = window.gsap;
    var REDUCED = !!opts.reduced, SHOT = !!opts.shot;
    var pg = hero.querySelector('#playground');
    var ballEl = hero.querySelector('#ball');
    var ballSvg = ballEl.querySelector('.ball-svg');
    var mat = hero.querySelector('#mat');
    var hint = hero.querySelector('#ball-hint');
    var countEl = hero.querySelector('#fetch-n');
    var count = parseInt(countEl.textContent, 10) || 0;

    var W = 0, H = 0, groundY = 0, B = 52, minY = 70, maxX = 0, maxY = 0, matX = 0, speed = 600;
    var ball = { x: 0, y: 0, vx: 0, vy: 0, mode: 'rest', rest: 0, spin: 0, thrown: false };
    var ptr = { x: 0, y: 0, t: -1e9 };
    var excite = 0, lastInput = performance.now(), tilted = false;
    var fetching = null, matDog = null, carrier = null;
    var dogs = [];

    function visibleDogs() {
      return Array.prototype.slice.call(hero.querySelectorAll('.dog')).filter(function (el) {
        return getComputedStyle(el).display !== 'none';
      });
    }

    function readHomes() {
      // read the CSS (no-script) positions before switching to transform positioning
      hero.classList.remove('pg-js');
      var hr = hero.getBoundingClientRect();
      dogs.forEach(function (d) {
        var r = d.el.getBoundingClientRect();
        d.homeF = (r.left + r.width / 2 - hr.left) / hr.width;
      });
      var mr = mat.getBoundingClientRect();
      matX = mr.left + mr.width / 2 - hr.left;
      hero.classList.add('pg-js');
    }

    function setupDog(el) {
      var svg = el.querySelector('.dog-svg');
      var vb = svg.viewBox.baseVal;
      var m = el.dataset.mouth.split(' ').map(Number);
      var d = {
        el: el, flip: el.querySelector('.dog-flip'), hop: el.querySelector('.dog-hop'), svg: svg,
        vbW: vb.width, vbH: vb.height, mouth: m, face: 1, tilt: 0, boost: 0, sitting: false, busy: false,
        head: svg.querySelector('.d-head'), rear: svg.querySelector('.d-rear'), tail: svg.querySelector('.d-tail'),
        tongue: svg.querySelector('.d-tongue'), pupils: svg.querySelectorAll('.d-pupil'), eyes: svg.querySelectorAll('.d-eye'),
        ears: svg.querySelectorAll('.d-ear'), legs: svg.querySelectorAll('.d-leg'),
        nearBack: svg.querySelector('.d-near .d-leg'), runTweens: []
      };
      var ho = d.head.dataset.o.split(' ').map(Number);
      d.headC = [ho[0], ho[1] - 36];
      gsap.set(d.head, { svgOrigin: d.head.dataset.o });
      gsap.set(d.tail, { svgOrigin: d.tail.dataset.o });
      gsap.set(d.rear, { svgOrigin: d.rear.dataset.o });
      Array.prototype.forEach.call(d.ears, function (e) { gsap.set(e, { svgOrigin: e.dataset.o }); });
      Array.prototype.forEach.call(d.legs, function (l) { gsap.set(l, { svgOrigin: l.dataset.o }); });
      gsap.set(d.tongue, { svgOrigin: d.mouth[0] + ' ' + (d.mouth[1] - 8), scaleY: 0.4, opacity: 0 });
      d.rotTo = gsap.quickTo(d.head, 'rotation', { duration: 0.35, ease: 'power3' });
      d.pxTo = []; d.pyTo = [];
      Array.prototype.forEach.call(d.pupils, function (p) {
        d.pxTo.push(gsap.quickTo(p, 'x', { duration: 0.18, ease: 'power3' }));
        d.pyTo.push(gsap.quickTo(p, 'y', { duration: 0.18, ease: 'power3' }));
      });
      d.earTo = Array.prototype.map.call(d.ears, function (e) { return gsap.quickTo(e, 'rotation', { duration: 0.3, ease: 'power3' }); });
      gsap.set(d.tail, { rotation: -10 });
      d.wag = gsap.to(d.tail, { rotation: 24, duration: 0.17, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
      return d;
    }

    function size(d) { return { w: d.el.offsetWidth, h: d.el.offsetHeight }; }
    function scaleOf(d) { return d.el.offsetHeight / d.vbH; }
    function dogX(d) { return Number(gsap.getProperty(d.el, 'x')) || 0; }
    function cxOf(d) { return dogX(d) + d.el.offsetWidth / 2; }
    function mouthOffset(d, face) { return (d.mouth[0] * scaleOf(d) - d.el.offsetWidth / 2) * face; }
    function placeDog(d, cx) { gsap.set(d.el, { xPercent: 0, yPercent: 0, x: cx - d.el.offsetWidth / 2, y: groundY - d.el.offsetHeight }); }
    function setFace(d, f, instant) {
      if (d.face === f) return;
      d.face = f;
      if (instant) gsap.set(d.flip, { scaleX: f });
      else gsap.to(d.flip, { scaleX: f, duration: 0.14, ease: 'power2.out', overwrite: true });
    }

    function layout() {
      W = hero.clientWidth; H = hero.clientHeight;
      var gs = getComputedStyle(hero);
      var ground = parseFloat(gs.getPropertyValue('--ground')) || 60;
      groundY = H - ground;
      B = ballEl.offsetWidth;
      var header = document.querySelector('.header-inner');
      minY = header ? header.getBoundingClientRect().bottom + 8 : 70;
      maxX = W - B; maxY = groundY - B + 6;
      speed = clamp(W * 0.55, 300, 720);
    }

    function restOnMat() {
      ball.mode = 'rest'; ball.vx = ball.vy = 0; ball.thrown = false; ball.rest = 0;
      ball.x = clamp(matX - B / 2, 0, maxX); ball.y = maxY;
      applyBall();
    }
    function applyBall(sq) {
      gsap.set(ballEl, { x: ball.x, y: ball.y });
      gsap.set(ballSvg, { rotation: ball.spin });
    }

    function init() {
      dogs = visibleDogs().map(setupDog);
      layout();
      readHomes();
      dogs.forEach(function (d) {
        placeDog(d, d.homeF * W);
        setFace(d, d.homeF * W > matX ? -1 : 1, true);
      });
      restOnMat();
      if (drag) drag.applyBounds({ minX: 0, maxX: maxX, minY: minY, maxY: maxY });
    }

    /* ---------- ball ---------- */
    var drag = null, tracker = null, dragged = false;
    var G = 2400;
    function launch(vx, vy, byUser) {
      ball.vx = clamp(vx, -2600, 2600); ball.vy = clamp(vy, -2600, 2600);
      ball.mode = 'fly'; ball.rest = 0; ball.thrown = !!byUser;
      if (byUser) hideHint();
    }
    function throwRandom() {
      var dir = Math.random() < 0.5 ? -1 : 1;
      if (ball.x < W * 0.2) dir = 1; else if (ball.x > W * 0.8) dir = -1;
      ball.y = Math.min(ball.y, maxY);
      launch(dir * (420 + Math.random() * 520) * (W / 1200 + 0.3), -(900 + Math.random() * 500), true);
    }
    var squashT = null;
    function squash(power) {
      if (squashT) squashT.kill();
      squashT = gsap.fromTo(ballSvg, { scaleY: 1 - 0.22 * power, scaleX: 1 + 0.16 * power, transformOrigin: '50% 100%' },
        { scaleY: 1, scaleX: 1, duration: 0.32, ease: 'elastic.out(1, 0.45)' });
    }
    function hideHint() {
      if (hint && !hint.dataset.gone) { hint.dataset.gone = '1'; gsap.to(hint, { autoAlpha: 0, y: 6, duration: 0.25 }); }
    }

    function stepBall(dt) {
      if (ball.mode === 'fly') {
        ball.vy += G * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 0) { ball.x = 0; ball.vx = -ball.vx * 0.72; }
        else if (ball.x > maxX) { ball.x = maxX; ball.vx = -ball.vx * 0.72; }
        if (ball.y < minY) { ball.y = minY; ball.vy = -ball.vy * 0.5; }
        if (ball.y >= maxY) {
          ball.y = maxY;
          if (ball.vy > 260) { squash(Math.min(1, ball.vy / 1500)); ball.vy = -ball.vy * 0.52; ball.vx *= 0.8; }
          else {
            ball.vy = 0; ball.vx *= Math.pow(0.12, dt);
            if (Math.abs(ball.vx) < 14) { ball.vx = 0; ball.mode = 'rest'; ball.rest = 0; }
          }
        }
        ball.spin += (ball.vx * dt) / (B / 2) * 57.3;
        applyBall();
      } else if (ball.mode === 'carried' && carrier) {
        var d = carrier, s = scaleOf(d);
        var lx = d.mouth[0] * s; if (d.face < 0) lx = d.el.offsetWidth - lx;
        var hopY = Number(gsap.getProperty(d.hop, 'y')) || 0;
        ball.x = dogX(d) + lx - B / 2;
        ball.y = (Number(gsap.getProperty(d.el, 'y')) || 0) + d.mouth[1] * s + hopY - B * 0.38;
        applyBall();
      } else if (ball.mode === 'rest' && ball.thrown && !fetching) {
        ball.rest += dt;
        if (ball.rest >= 0.6) fetch();
      }
    }

    /* ---------- dogs ---------- */
    function startRun(d) {
      stopRun(d, true);
      var h = d.el.offsetHeight;
      d.runTweens.push(gsap.to(d.hop, { y: -h * 0.12, duration: 0.14, ease: 'sine.out', yoyo: true, repeat: -1 }));
      var legs = d.legs;
      for (var i = 0; i < legs.length; i++) {
        var front = i % 2 === 1;
        gsap.set(legs[i], { rotation: front ? -24 : 20 });
        d.runTweens.push(gsap.to(legs[i], { rotation: front ? 24 : -22, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i < 2 ? 0 : 0.07 }));
      }
      gsap.to(d.tongue, { opacity: 1, scaleY: 1, duration: 0.15 });
      d.boost = 1;
      if (d.sitting) unsit(d);
    }
    function stopRun(d, quick) {
      d.runTweens.forEach(function (t) { t.kill(); });
      d.runTweens = [];
      gsap.to(d.hop, { y: 0, duration: quick ? 0.05 : 0.12, ease: 'power2.out' });
      gsap.to(d.legs, { rotation: 0, duration: quick ? 0.05 : 0.12 });
    }
    function sit(d) {
      d.sitting = true;
      gsap.to(d.rear, { rotation: -8, duration: 0.22, ease: 'power2.out' });
      if (d.nearBack) gsap.to(d.nearBack, { scaleY: 0.72, duration: 0.22 });
    }
    function unsit(d) {
      d.sitting = false;
      gsap.to(d.rear, { rotation: 0, duration: 0.15 });
      if (d.nearBack) gsap.to(d.nearBack, { scaleY: 1, duration: 0.15 });
    }
    function run(d, targetCx, onDone, slow) {
      var from = cxOf(d), dist = targetCx - from;
      if (Math.abs(dist) > 2) setFace(d, dist > 0 ? 1 : -1);
      startRun(d);
      var dur = Math.max(0.32, Math.abs(dist) / (slow ? speed * 0.6 : speed));
      d.move = gsap.to(d.el, { x: targetCx - d.el.offsetWidth / 2, duration: dur, ease: 'power1.inOut',
        onComplete: function () { stopRun(d); d.move = null; if (onDone) onDone(); } });
    }
    function nearestDog(x) {
      var best = null, bd = Infinity;
      dogs.forEach(function (d) { var dd = Math.abs(cxOf(d) - x); if (dd < bd) { bd = dd; best = d; } });
      return best;
    }

    function fetch() {
      var bx = ball.x + B / 2;
      var d = nearestDog(bx);
      if (!d) return;
      fetching = d; d.busy = true;
      var dir = bx >= cxOf(d) ? 1 : -1;
      run(d, bx - mouthOffset(d, dir), function () {
        if (fetching !== d) return;
        // dip the head to grab the ball
        gsap.to(d, { tilt: 10, duration: 0.12, yoyo: true, repeat: 1 });
        ball.mode = 'carried'; carrier = d; ball.thrown = false;
        gsap.delayedCall(0.18, function () {
          if (fetching !== d) return;
          if (matDog && matDog !== d) goHome(matDog);
          run(d, matX, function () {
            if (fetching !== d) return;
            carrier = null;
            var f = d.face;
            ball.x = clamp(cxOf(d) + mouthOffset(d, f) - B / 2 + f * B * 0.35, 0, maxX);
            ball.y = maxY; ball.vx = ball.vy = 0; ball.mode = 'rest'; ball.rest = 0;
            applyBall(); squash(0.5);
            sit(d);
            matDog = d; fetching = null; d.busy = false;
            d.boost = 1;
            bump();
          });
        });
      });
    }
    function goHome(d) {
      d.busy = true;
      var home = d.homeF * W;
      run(d, home, function () {
        d.busy = false;
        setFace(d, home > matX ? -1 : 1);
      }, true);
      if (matDog === d) matDog = null;
    }
    function cancelFetch() {
      if (!fetching) return;
      var d = fetching; fetching = null; carrier = null;
      if (d.move) { d.move.kill(); d.move = null; }
      stopRun(d);
      gsap.delayedCall(0.25, function () { if (!d.busy || fetching !== d) goHome(d); });
    }
    function bump() {
      count += 1;
      countEl.textContent = String(count);
      if (!REDUCED) gsap.fromTo(countEl, { scale: 1.7, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
    }

    /* ---------- gaze, tails, ears, blinking ---------- */
    function look(d, tx, ty, instant) {
      var s = scaleOf(d);
      var hx = dogX(d) + (d.face > 0 ? d.headC[0] * s : d.el.offsetWidth - d.headC[0] * s);
      var hy = (Number(gsap.getProperty(d.el, 'y')) || 0) + d.headC[1] * s;
      var dx = (tx - hx) * d.face, dy = ty - hy;
      var dist = Math.hypot(dx, dy) || 1;
      var rot = clamp(dx / 40, -1, 1) * 11 + clamp(dy / 260, -1, 1) * 4 + d.tilt;
      var amt = Math.min(1, dist / 110) * 3.2;
      var px = dx / dist * amt, py = dy / dist * amt * 0.85;
      if (instant) {
        gsap.set(d.head, { rotation: rot });
        gsap.set(d.pupils, { x: px, y: py });
      } else {
        d.rotTo(clamp(rot, -15, 15));
        for (var i = 0; i < d.pxTo.length; i++) { d.pxTo[i](px); d.pyTo[i](py); }
      }
    }
    function lookAll(instant) {
      var useBall = ball.mode !== 'rest' || performance.now() - ptr.t > 1400;
      var tx = useBall ? ball.x + B / 2 : ptr.x, ty = useBall ? ball.y + B / 2 : ptr.y;
      dogs.forEach(function (d) {
        if (d === carrier) { d.rotTo(d.tilt); for (var i = 0; i < d.pxTo.length; i++) { d.pxTo[i](2.4); d.pyTo[i](0); } return; }
        look(d, tx, ty, instant);
      });
    }
    function moodTick(dt) {
      var sp = 0;
      if (ball.mode === 'fly') sp = Math.hypot(ball.vx, ball.vy);
      else if (ball.mode === 'drag' && window.InertiaPlugin) sp = Math.hypot(InertiaPlugin.getVelocity(ballEl, 'x') || 0, InertiaPlugin.getVelocity(ballEl, 'y') || 0);
      excite += (clamp(sp / 1300, 0, 1) - excite) * Math.min(1, dt * 6);
      dogs.forEach(function (d) {
        d.boost = Math.max(0, d.boost - dt * 0.6);
        if (d.runTweens.length) d.boost = 1;
        var e = Math.max(excite, d.boost);
        if (e > 0.06) {
          if (d.wag.paused()) d.wag.play();
          d.wag.timeScale(0.7 + e * 2.3);
        } else if (!d.wag.paused()) {
          d.wag.pause(); gsap.to(d.tail, { rotation: -10, duration: 0.3, ease: 'power2.out' });
        }
        for (var i = 0; i < d.earTo.length; i++) {
          var dir = d.ears[i].dataset.dir === '-1' ? -1 : 1;
          d.earTo[i](dir * e * 22);
        }
        if (!d.runTweens.length && e < 0.3 && Number(gsap.getProperty(d.tongue, 'opacity')) > 0.5) gsap.to(d.tongue, { opacity: 0, scaleY: 0.4, duration: 0.2 });
      });
    }
    function blinkLoop(d) {
      var wait = 2.4 + Math.random() * 3.6;
      d.blink = gsap.delayedCall(wait, function () {
        if (running) gsap.to(d.eyes, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' });
        blinkLoop(d);
      });
    }
    function idleTilt(now) {
      if (tilted || now - lastInput < 4000 || ball.mode !== 'rest' || fetching) return;
      tilted = true;
      var pool = dogs.filter(function (d) { return !d.busy; });
      var d = pool[Math.floor(Math.random() * pool.length)];
      if (d) gsap.to(d, { tilt: d.face > 0 ? 16 : -16, duration: 0.32, ease: 'power2.out', yoyo: true, repeat: 1, repeatDelay: 0.45 });
    }
    function touch() { lastInput = performance.now(); tilted = false; }

    /* ---------- main loop ---------- */
    var running = false;
    function tick(time, deltaTime) {
      // substep so the throw feels the same at 30fps as at 120fps
      var total = Math.min(deltaTime, 120) / 1000, n = Math.max(1, Math.ceil(total / 0.017)), dt = total / n;
      for (var i = 0; i < n; i++) stepBall(dt);
      dt = total;
      moodTick(dt);
      lookAll(false);
      idleTilt(performance.now());
    }
    function start() { if (running) return; running = true; gsap.ticker.add(tick); }
    function stop() { if (!running) return; running = false; gsap.ticker.remove(tick); }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.t = performance.now();
      touch();
    }, { passive: true });

    init();

    if (REDUCED || SHOT) {
      lookAll(true);
      // reduced motion: pressing the ball swaps to a new spot with a quick cross-fade, nothing travels
      ballEl.addEventListener('click', function () {
        if (SHOT) return;
        if (hint) hint.style.visibility = 'hidden';
        var d = dogs[Math.floor(Math.random() * dogs.length)];
        var nx = clamp(matX + (Math.random() - 0.5) * W * 0.3, d.el.offsetWidth, W - d.el.offsetWidth);
        gsap.to([ballEl, d.el], { opacity: 0, duration: 0.12, onComplete: function () {
          ball.x = clamp(nx - B / 2, 0, maxX); ball.y = maxY; applyBall();
          var f = nx > cxOf(d) ? 1 : -1; setFace(d, f, true);
          placeDog(d, nx - mouthOffset(d, f) - f * B * 0.4);
          lookAll(true);
          bump();
          gsap.to([ballEl, d.el], { opacity: 1, duration: 0.12 });
        } });
      });
      window.addEventListener('resize', debounce(function () { init(); lookAll(true); }), { passive: true });
      return { destroy: function () {} };
    }

    if (window.Draggable) {
      if (window.InertiaPlugin) tracker = InertiaPlugin.track(ballEl, 'x,y');
      drag = Draggable.create(ballEl, {
        type: 'x,y', bounds: { minX: 0, maxX: maxX, minY: minY, maxY: maxY }, edgeResistance: 0.6,
        minimumMovement: 4, zIndexBoost: false, allowContextMenu: true,
        onPress: function () {
          dragged = false;
          touch(); cancelFetch();
          if (carrier) carrier = null;
          ball.mode = 'drag';
          var cx = Number(gsap.getProperty(ballEl, 'x')), cy = Number(gsap.getProperty(ballEl, 'y'));
          ball.x = cx; ball.y = cy;
          if (matDog) { unsit(matDog); }
          ballEl.classList.add('is-dragging');
        },
        onDragStart: function () { dragged = true; },
        onDrag: function () { ball.x = this.x; ball.y = this.y; touch(); },
        onRelease: function () {
          ballEl.classList.remove('is-dragging');
          if (!dragged && ball.mode === 'drag') {
            // a tap without a drag: toss it
            ball.x = this.x; ball.y = this.y; throwRandom(); return;
          }
          var vx = window.InertiaPlugin ? InertiaPlugin.getVelocity(ballEl, 'x') : 0;
          var vy = window.InertiaPlugin ? InertiaPlugin.getVelocity(ballEl, 'y') : 0;
          ball.x = this.x; ball.y = this.y;
          launch(vx, vy, true);
        }
      })[0];
    }
    // keyboard: Enter or Space on the ball button throws it somewhere random
    ballEl.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      touch(); cancelFetch(); if (matDog) unsit(matDog);
      throwRandom();
    });

    var resize = debounce(function () {
      dogs.forEach(function (d) { if (d.move) d.move.kill(); stopRun(d, true); unsit(d); d.busy = false; });
      fetching = null; carrier = null; matDog = null;
      init();
    });
    window.addEventListener('resize', resize, { passive: true });

    // entrance: the dogs bounce up from the grass and the ball drops onto the mat, bouncing twice
    gsap.from(dogs.map(function (d) { return d.hop; }), { y: function (i, el) { return el.offsetHeight * 0.8; }, opacity: 0, duration: 0.55, ease: 'back.out(1.7)', stagger: 0.08 });
    ball.y = Math.max(minY, maxY - Math.min(380, H * 0.45)); ball.x = clamp(matX - B / 2, 0, maxX);
    applyBall();
    launch(0, 0, false);
    gsap.from(ballEl, { opacity: 0, duration: 0.15 });

    dogs.forEach(blinkLoop);
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) start(); else stop(); });
    io.observe(hero);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    start();

    return { destroy: function () { stop(); io.disconnect(); if (drag) drag.kill(); } };
  }

  function debounce(fn) { var t = 0; return function () { clearTimeout(t); t = setTimeout(fn, 150); }; }

  window.KkoriPlay = { create: create };
})();
