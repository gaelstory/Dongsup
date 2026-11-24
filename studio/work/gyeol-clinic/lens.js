/* 결 피부과의원 · the lens.
   Two SVG-filter skin surfaces are rasterised once; only the circular clip of the smooth "after"
   surface and the lens rim move. Pointer follows with gsap.quickTo, idle drifts on a slow
   Lissajous curve, and the first 60% of the hero's scroll opens the lens to the whole surface. */
(function () {
  'use strict';

  var SHOT = /[?&]shot=1/.test(location.search);
  var G = window.gsap;
  var hero = document.querySelector('.hero');
  var after = hero && hero.querySelector('.skin__after');
  var lens = hero && hero.querySelector('.lens');
  if (!after || !lens) return;

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqCoarse = window.matchMedia('(pointer: coarse)');
  var HOME_X = 0.68, HOME_Y = 0.52; // must match --lx / --ly in style.css

  var W = 0, H = 0, R0 = 140;
  var st = { x: 0, y: 0, e: 0 };
  var mode = 'intro';           // intro, follow, float, drag
  var lastInput = -1e9;
  var floatT = 0;
  var ticking = false, inView = true, pageVisible = !document.hidden;
  var xTo = null, yTo = null, introTween = null, openTween = null;
  var drag = null;
  var lastKey = '';

  function still() { return SHOT || mqReduce.matches || !G; }

  function measure() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    R0 = W >= 768 ? 140 : 92;
  }

  function render() {
    var R = R0;
    if (st.e > 0) {
      var far = Math.hypot(Math.max(st.x, W - st.x), Math.max(st.y, H - st.y)) * 1.04;
      var k = st.e * st.e * (3 - 2 * st.e);
      R = R0 + (Math.max(far, R0) - R0) * k;
    }
    var key = st.x.toFixed(1) + ',' + st.y.toFixed(1) + ',' + R.toFixed(1);
    if (key === lastKey) return;
    lastKey = key;
    after.style.clipPath = 'circle(' + R.toFixed(1) + 'px at ' + st.x.toFixed(1) + 'px ' + st.y.toFixed(1) + 'px)';
    // the rim is laid out at its CSS home; move it from there
    var dx = st.x - W * HOME_X, dy = st.y - H * HOME_Y;
    lens.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + (R / R0).toFixed(4) + ')';
    // the rim dissolves as the lens grows past the screen, so its thickening border is never seen
    var fade = st.e <= 0.06 ? 1 : Math.max(0, 1 - (st.e - 0.06) / 0.3);
    lens.style.opacity = fade.toFixed(3);
  }

  function floatCenter() {
    return mqCoarse.matches || W < 768
      ? { x: W * 0.56, y: H * 0.6, ax: W * 0.2, ay: H * 0.1 }
      : { x: W * HOME_X, y: H * HOME_Y, ax: W * 0.15, ay: H * 0.13 };
  }

  function startFloat() {
    if (mode === 'float') return;
    if (G) G.killTweensOf(st, 'x,y');
    mode = 'float';
    floatT = 0;
  }

  function tick(time, deltaMs) {
    var dt = Math.min(0.05, (deltaMs || 16) / 1000);
    if (mode === 'float') {
      floatT += dt;
      var c = floatCenter();
      var tx = c.x + c.ax * Math.sin(floatT * 0.33);
      var ty = c.y + c.ay * Math.sin(floatT * 0.47);
      var a = 1 - Math.exp(-dt / 1.1);
      st.x += (tx - st.x) * a;
      st.y += (ty - st.y) * a;
    } else if (mode === 'follow' && performance.now() - lastInput > 2200) {
      startFloat();
    }
    render();
  }

  function syncTicker() {
    var want = !still() && inView && pageVisible;
    if (want && !ticking) { G.ticker.add(tick); ticking = true; }
    else if (!want && ticking) { G.ticker.remove(tick); ticking = false; }
  }

  function placeStill() {
    measure();
    st.x = W * HOME_X;
    st.y = H * HOME_Y;
    st.e = 0;
    lastKey = '';
    render();
  }

  function local(e) {
    var r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function init() {
    measure();
    if (still()) { placeStill(); return; }

    st.x = -R0 * 1.4;
    st.y = H * HOME_Y;
    render();
    xTo = G.quickTo(st, 'x', { duration: 0.35, ease: 'power3' });
    yTo = G.quickTo(st, 'y', { duration: 0.35, ease: 'power3' });

    // slide in from the left to the right of centre, then drift
    introTween = G.to(st, {
      x: W * HOME_X,
      duration: 1,
      ease: 'power3.out',
      onComplete: function () { introTween = null; if (mode === 'intro') startFloat(); }
    });

    // fine pointers: the lens follows
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || drag || still()) return;
      if (introTween) { introTween.kill(); introTween = null; }
      var p = local(e);
      if (mode === 'float' || mode === 'intro') G.killTweensOf(st, 'x,y');
      mode = 'follow';
      lastInput = performance.now();
      xTo(p.x);
      yTo(p.y);
    }, { passive: true });

    // touch: drift on its own, move only when the lens itself is held
    lens.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || still()) return;
      if (introTween) { introTween.kill(); introTween = null; }
      G.killTweensOf(st, 'x,y');
      var p = local(e);
      drag = { id: e.pointerId, ox: st.x - p.x, oy: st.y - p.y };
      mode = 'drag';
      lens.setPointerCapture(e.pointerId);
      lens.style.cursor = 'grabbing';
    });
    lens.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = local(e);
      st.x = Math.min(W, Math.max(0, p.x + drag.ox));
      st.y = Math.min(H, Math.max(0, p.y + drag.oy));
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      lens.style.cursor = '';
      mode = 'follow';
      lastInput = performance.now();
    }
    lens.addEventListener('pointerup', endDrag);
    lens.addEventListener('pointercancel', endDrag);

    // scroll: the lens opens until the whole surface is the smooth one
    if (window.ScrollTrigger) {
      openTween = G.to(st, {
        e: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: function () { return '+=' + Math.round(hero.offsetHeight * 0.6); },
          scrub: 0.4,
          invalidateOnRefresh: true
        }
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        syncTicker();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      syncTicker();
    });
    syncTicker();
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var oldW = W || 1, oldH = H || 1;
      measure();
      if (still()) { placeStill(); return; }
      st.x *= W / oldW;
      st.y *= H / oldH;
      lastKey = '';
      render();
    }, 150);
  });

  function onReduceChange() {
    if (still()) {
      if (G) G.killTweensOf(st);
      if (openTween && openTween.scrollTrigger) openTween.scrollTrigger.disable();
      if (G && ticking) { G.ticker.remove(tick); ticking = false; }
      placeStill();
    }
  }
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);

  try {
    if (G && window.ScrollTrigger) G.registerPlugin(window.ScrollTrigger);
    init();
  } catch (err) {
    // leave the CSS still frame (lens right of centre) in place
    after.style.clipPath = '';
    lens.style.transform = '';
    lens.style.opacity = '';
  }
})();
