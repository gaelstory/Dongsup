/* Salon MIRU hero: a curtain of hair strands drawn on Canvas 2D that the pointer combs through.
   Each strand is a 14-point polyline hanging from the top edge. Its rest shape is a slow two-sine S wave;
   the comb adds per-point spring offsets that travel down the strand and settle back over ~1.2s. */
(function () {
  'use strict';

  var PALETTES = {
    ash: { name: '애쉬 브라운', root: '#6B5A4E', tip: '#B9A999' },
    choco: { name: '초코', root: '#2E1B14', tip: '#6A4632' },
    rose: { name: '로즈 골드', root: '#7A3B46', tip: '#E3A9A0' },
    black: { name: '블랙', root: '#0F0D0E', tip: '#3A3436' }
  };

  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var P = 14, SEG = P - 1;
  // gradient sample positions along the strand (root 0 to tip 1)
  var STOPS = [0, 0.1, 0.2, 0.27, 0.33, 0.4, 0.52, 0.66, 0.82, 1];

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var reduced = !!opts.reduced, shot = !!opts.shot;
    var W = 0, H = 0, dpr = 1, hairH = 0, mobile = false, N = 0;
    var rootX, len, ph1, ph2, amp, sweep, layerOf;
    var offX, offY, velX, velY, curX, curY;
    var layers = [[], [], []];
    var raf = 0, running = false, inView = true, pageVisible = !document.hidden, paused = false;
    var time = 0, lastTs = 0, physicsActive = false;
    var growStart = 0, grow = (reduced || shot) ? 1 : 0.3, growing = !(reduced || shot);
    var lift = 0, liftTarget = 0;
    var ptr = { x: 0, y: 0, px: 0, py: 0, moved: false, touch: false };

    // colour state: "from" pair, "to" pair and the dye front that flows from root to tip
    var key = opts.color && PALETTES[opts.color] ? opts.color : 'rose';
    var fromRoot = hex(PALETTES[key].root), fromTip = hex(PALETTES[key].tip);
    var toRoot = fromRoot.slice(), toTip = fromTip.slice();
    var front = 2, frontStart = 0, frontDur = 800, dyeing = false;
    var tmp = [0, 0, 0];

    function alloc(n) {
      rootX = new Float32Array(n); len = new Float32Array(n); ph1 = new Float32Array(n); ph2 = new Float32Array(n);
      amp = new Float32Array(n); sweep = new Float32Array(n); layerOf = new Uint8Array(n);
      offX = new Float32Array(n * P); offY = new Float32Array(n * P); velX = new Float32Array(n * P); velY = new Float32Array(n * P);
      curX = new Float32Array(n * P); curY = new Float32Array(n * P);
    }

    function build() {
      var rnd = rng(20260521);
      var target = mobile ? 360 : 900;
      alloc(target);
      layers = [[], [], []];
      var i = 0, guard = 0;
      while (i < target && guard++ < target * 40) {
        var u = rnd() * 1.08 - 0.03;
        // dense on the right 65%, thinning out towards the clear pearl corner on the left
        var w = mobile ? 0.3 + 0.7 * smooth(-0.05, 0.8, u) : 0.03 + 0.97 * smooth(0.2, 0.7, u);
        if (rnd() > w) continue;
        var xn = clamp(u, 0, 1);
        rootX[i] = u * W;
        var shortF = mobile ? 1 : 0.36 + 0.64 * smooth(0.18, 0.66, xn);
        len[i] = hairH * (0.84 + rnd() * 0.2) * shortF;
        sweep[i] = (mobile ? 0.05 : 0.15) * W * (1 - xn) * (0.5 + rnd() * 0.8);
        ph1[i] = u * 5.4 + rnd() * 0.45;
        ph2[i] = u * 9.5 + rnd() * 1.3;
        amp[i] = 0.7 + rnd() * 0.6;
        var r = rnd();
        var L = r < 0.06 ? 2 : r < 0.44 ? 0 : 1;
        layerOf[i] = L; layers[L].push(i);
        i++;
      }
      N = i;
    }

    function layout() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var newMobile = r.width < 768;
      var changedW = Math.abs(r.width - W) > 1 || newMobile !== mobile;
      W = r.width; H = r.height; mobile = newMobile;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var newHairH = mobile ? H * 0.52 : H * 1.02;
      if (changedW || Math.abs(newHairH - hairH) > 40 || !N) { hairH = newHairH; build(); }
      draw();
    }

    function colorAt(s, out) {
      var m = clamp((front - s) / 0.22 + 0.5, 0, 1); m = m * m * (3 - 2 * m);
      for (var k = 0; k < 3; k++) {
        var a = fromRoot[k] + (fromTip[k] - fromRoot[k]) * s;
        var b = toRoot[k] + (toTip[k] - toRoot[k]) * s;
        out[k] = a + (b - a) * m;
      }
      return out;
    }
    function rgb(c, light, sheen, dark) {
      var r = c[0], g = c[1], b = c[2];
      if (dark) { r *= dark; g *= dark; b *= dark; }
      var l = light + sheen;
      if (l > 0) { r += (255 - r) * l; g += (255 - g) * l; b += (248 - b) * l; }
      return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    }
    function gradient(y1, light, sheenAmt, dark) {
      var gr = ctx.createLinearGradient(0, 0, 0, y1);
      for (var i = 0; i < STOPS.length; i++) {
        var s = STOPS[i];
        var sh = Math.exp(-Math.pow((s - 0.31) / 0.075, 2)) * sheenAmt;
        gr.addColorStop(s, rgb(colorAt(s, tmp), light * s, sh, dark));
      }
      return gr;
    }

    var LW = [1, 1, 1.5], ALPHA = [0.42, 0.8, 0.92];

    function draw() {
      if (!W) return;
      var g = grow * (1 - lift * 0.92);
      var t = time;
      var breath = 1 + 0.12 * Math.sin(t * 0.42);
      var A1 = (mobile ? 21 : 30) * breath, A2 = mobile ? 7 : 10;
      var K1 = 4.3, K2 = 9.4;
      var w1 = t * 0.3, w2 = t * 0.19;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var gradY = hairH * 1.04 * g + 1;
      var grads = [gradient(gradY, 0, 0.08, 0.78), gradient(gradY, 0, 0.22, 0), gradient(gradY, 0.18, 0.55, 0)];
      for (var L = 0; L < 3; L++) {
        var list = layers[L], depth = L === 0 ? 0.65 : 1, shift = L === 0 ? 0.9 : 0;
        ctx.beginPath();
        for (var n = 0; n < list.length; n++) {
          var i = list[n], base = i * P;
          var ln = len[i] * g, rx = rootX[i], a = amp[i] * depth, sw = sweep[i];
          var p1 = ph1[i] + w1 + shift, p2 = ph2[i] - w2;
          for (var j = 0; j < P; j++) {
            var s = j / SEG, k = base + j;
            var env = s * (0.3 + 0.7 * s);
            curX[k] = rx + (A1 * Math.sin(s * K1 + p1) + A2 * Math.sin(s * K2 + p2)) * a * env + sw * s * s + offX[k];
            curY[k] = -8 + s * ln + offY[k];
          }
          ctx.moveTo(curX[base], curY[base]);
          for (var q = 1; q < SEG; q++) {
            var k2 = base + q;
            ctx.quadraticCurveTo(curX[k2], curY[k2], (curX[k2] + curX[k2 + 1]) * 0.5, (curY[k2] + curY[k2 + 1]) * 0.5);
          }
          ctx.lineTo(curX[base + SEG], curY[base + SEG]);
        }
        ctx.lineWidth = LW[L];
        ctx.globalAlpha = ALPHA[L] * (1 - lift * 0.5);
        ctx.strokeStyle = grads[L];
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    var R = 140;
    function comb() {
      if (!ptr.moved) return;
      ptr.moved = false;
      var vx = ptr.x - ptr.px, vy = ptr.touch ? 0 : ptr.y - ptr.py;
      ptr.px = ptr.x; ptr.py = ptr.y;
      var sp = Math.abs(vx) + Math.abs(vy);
      if (sp < 0.6 || sp > 600) return;
      vx = clamp(vx, -48, 48); vy = clamp(vy, -48, 48);
      var R2 = R * R, px = ptr.x, py = ptr.y, avy = Math.abs(vy);
      for (var i = 0; i < N; i++) {
        var base = i * P;
        for (var j = 1; j < P; j++) {
          var k = base + j, dx = curX[k] - px, dy = curY[k] - py, d2 = dx * dx + dy * dy;
          if (d2 > R2) continue;
          var f = 1 - Math.sqrt(d2) / R; f = f * f * (3 - 2 * f);
          // drag along the comb's direction, and part the strands sideways when it moves down through them
          var tx = vx * 0.9 + (dx >= 0 ? 1 : -1) * avy * 0.62 * (0.4 + 0.6 * (1 - Math.abs(dx) / R));
          velX[k] += (tx - velX[k]) * f * 0.26;
          velY[k] += (vy * 0.2 - velY[k]) * f * 0.2;
        }
      }
      physicsActive = true;
    }

    function physics() {
      if (!physicsActive) return;
      var energy = 0;
      for (var i = 0; i < N; i++) {
        var base = i * P;
        for (var j = 1; j < P; j++) {
          var k = base + j, o = offX[k], up = offX[k - 1];
          var v = velX[k];
          // a displaced point drags the points below it along, so a push travels down the strand
          if ((up > 0 && up > o) || (up < 0 && up < o)) v += (up - o) * 0.045;
          v += -o * 0.0052;
          v *= 0.89;
          o += v;
          if (o > 150) { o = 150; v = 0; } else if (o < -150) { o = -150; v = 0; }
          offX[k] = o; velX[k] = v;
          var oy = offY[k], vy2 = (velY[k] - oy * 0.02) * 0.86;
          oy += vy2; offY[k] = oy; velY[k] = vy2;
          energy += (o < 0 ? -o : o) + (v < 0 ? -v : v) + (oy < 0 ? -oy : oy);
        }
      }
      if (energy < N * 0.02) {
        physicsActive = false;
        offX.fill(0); offY.fill(0); velX.fill(0); velY.fill(0);
      }
    }

    function frame(ts) {
      raf = 0;
      if (!running) return;
      var dt = lastTs ? Math.min(ts - lastTs, 50) : 16.7;
      lastTs = ts;
      if (!paused && !reduced) time += dt / 1000;
      if (growing) {
        if (!growStart) growStart = ts;
        var p = clamp((ts - growStart) / 900, 0, 1);
        grow = 0.3 + 0.7 * (1 - Math.pow(1 - p, 3));
        if (p >= 1) growing = false;
      }
      lift += (liftTarget - lift) * 0.14;
      if (Math.abs(liftTarget - lift) < 0.0005) lift = liftTarget;
      if (dyeing) {
        var q = clamp((ts - frontStart) / frontDur, 0, 1);
        q = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        front = -0.25 + q * 1.6;
        if (q >= 1) { dyeing = false; front = 2; fromRoot = toRoot.slice(); fromTip = toTip.slice(); }
      }
      comb();
      // physics steps are tuned per 60fps frame; run as many as the elapsed time needs so the
      // parting returns in ~1.2s even when frames are dropped
      var steps = Math.min(4, Math.max(1, Math.round(dt / 16.67)));
      for (var st = 0; st < steps; st++) physics();
      draw();
      if (needsLoop()) raf = requestAnimationFrame(frame);
      else running = false;
    }

    function needsLoop() {
      if (!inView || !pageVisible) return false;
      if (reduced || shot) return dyeing;
      return !paused || physicsActive || growing || dyeing || lift !== liftTarget;
    }
    function kick() {
      if (running || !needsLoop()) return;
      running = true; lastTs = 0;
      raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      if (reduced || shot) return;
      var r = canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (!ptr.has) { ptr.px = x; ptr.py = y; ptr.has = true; }
      ptr.x = x; ptr.y = y; ptr.moved = true; ptr.touch = e.pointerType !== 'mouse' && e.pointerType !== 'pen';
      kick();
    }
    function onLeave() { ptr.has = false; }

    var host = opts.host || canvas;
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', function (e) { ptr.has = false; onMove(e); }, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    host.addEventListener('pointercancel', onLeave, { passive: true });

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) kick();
    }, { threshold: 0 }) : null;
    if (io) io.observe(canvas);
    function onVis() { pageVisible = !document.hidden; if (pageVisible) kick(); }
    document.addEventListener('visibilitychange', onVis);

    var rt = 0;
    function onResize() { clearTimeout(rt); rt = setTimeout(layout, 150); }
    window.addEventListener('resize', onResize, { passive: true });

    layout();
    kick();

    return {
      palettes: PALETTES,
      setColor: function (k, instant) {
        if (!PALETTES[k]) return;
        var nr = hex(PALETTES[k].root), nt = hex(PALETTES[k].tip);
        if (instant || reduced) {
          // reduced motion: swap at once, no flowing dye
          fromRoot = nr; fromTip = nt; toRoot = nr.slice(); toTip = nt.slice(); front = 2; dyeing = false;
          draw(); return;
        }
        if (dyeing) {
          // start the new dye from what is on screen now (sampled at mid-length)
          fromRoot = colorAt(0, [0, 0, 0]); fromTip = colorAt(1, [0, 0, 0]);
        }
        toRoot = nr; toTip = nt; front = -0.25; frontStart = performance.now(); dyeing = true;
        kick();
      },
      setLift: function (v) { if (reduced || shot) return; liftTarget = clamp(v, 0, 1); kick(); },
      setPaused: function (v) { paused = !!v; if (!paused) kick(); },
      refresh: layout,
      destroy: function () {
        running = false; if (raf) cancelAnimationFrame(raf);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', onResize);
        host.removeEventListener('pointermove', onMove);
      }
    };
  }

  window.MiruHair = { create: create, palettes: PALETTES };
})();
