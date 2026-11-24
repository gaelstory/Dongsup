/* Salon MIRU hero: a head of hair drawn on Canvas 2D that the pointer combs through.
   Each strand is a 14-point polyline hanging from the top edge with a slow two-sine S wave. Strands are
   grouped into clumps that converge towards the tips, sit on a soft under-mass, and catch a wavy sheen band.
   The comb adds per-point spring offsets that travel down the strand and settle back over ~1.2s.
   A keep-out box (the hero copy) is never crossed: strands that would reach it end above it. */
(function () {
  'use strict';

  var PALETTES = {
    ash: { name: '애쉬 브라운', root: '#6B5A4E', tip: '#B9A999', sheen: [246, 238, 228], alpha: 1 },
    choco: { name: '초코', root: '#2E1B14', tip: '#6A4632', sheen: [214, 170, 136], alpha: 1 },
    rose: { name: '로즈 골드', root: '#7A3B46', tip: '#E3A9A0', sheen: [255, 236, 230], alpha: 1 },
    black: { name: '블랙', root: '#0F0D0E', tip: '#3A3436', sheen: [140, 135, 145], alpha: 0.86 }
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

  var P = 14, SEG = P - 1, TIP = SEG - 2;
  var STOPS = [0, 0.08, 0.16, 0.22, 0.27, 0.31, 0.35, 0.4, 0.48, 0.6, 0.74, 0.88, 1];
  var NB = 8; // x buckets: each has its own gradient so the sheen can wave and the dye can travel sideways

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var reduced = !!opts.reduced, shot = !!opts.shot;
    var W = 0, H = 0, dpr = 1, hairH = 0, mobile = false, N = 0;
    var keep = null; // {x0, y0, x1, y1} in canvas px
    var rootX, len, ph1, ph2, amp, sweep, layerOf, bucketOf, clumpOf;
    var offX, offY, velX, velY, curX, curY;
    var lists = [];        // lists[layer][bucket] = strand indices
    var clumps = [];       // arrays of strand indices
    var clumpMass = [];    // whether a clump is dense enough to get an under-mass stroke
    var massX = new Float32Array(1), massY = new Float32Array(1);
    var raf = 0, running = false, inView = true, pageVisible = !document.hidden, paused = false;
    var time = 0, lastTs = 0, physicsActive = false;
    var growStart = 0, grow = (reduced || shot) ? 1 : 0.3, growing = !(reduced || shot);
    var lift = 0, liftTarget = 0;
    var ptr = { x: 0, y: 0, px: 0, py: 0, moved: false, touch: false, has: false };

    var key = opts.color && PALETTES[opts.color] ? opts.color : 'rose';
    var pal = PALETTES[key];
    var fromRoot = hex(pal.root), fromTip = hex(pal.tip);
    var toRoot = fromRoot.slice(), toTip = fromTip.slice();
    var sheenCol = pal.sheen.slice(), alphaMul = pal.alpha;
    var front = 3, frontStart = 0, frontDur = 1000, dyeing = false;
    var tmp = [0, 0, 0];
    var gradCache = null, gradKey = '';

    function alloc(n) {
      rootX = new Float32Array(n); len = new Float32Array(n); ph1 = new Float32Array(n); ph2 = new Float32Array(n);
      amp = new Float32Array(n); sweep = new Float32Array(n); layerOf = new Uint8Array(n); bucketOf = new Uint8Array(n);
      clumpOf = new Uint16Array(n);
      offX = new Float32Array(n * P); offY = new Float32Array(n * P); velX = new Float32Array(n * P); velY = new Float32Array(n * P);
      curX = new Float32Array(n * P); curY = new Float32Array(n * P);
    }

    function build() {
      var rnd = rng(20260521);
      var target = mobile ? 360 : 900;
      alloc(target);
      var i = 0, guard = 0;
      while (i < target && guard++ < target * 40) {
        var u = rnd() * 1.08 - 0.03;
        // dense on the right, thinning out towards the clear pearl corner on the left
        var w = mobile ? 0.3 + 0.7 * smooth(-0.05, 0.8, u) : 0.03 + 0.97 * smooth(0.2, 0.7, u);
        if (rnd() > w) continue;
        var xn = clamp(u, 0, 1);
        rootX[i] = u * W;
        var shortF = mobile ? 1 : 0.4 + 0.6 * smooth(0.18, 0.66, xn);
        len[i] = hairH * (0.8 + rnd() * rnd() * 0.3) * shortF;
        sweep[i] = (mobile ? 0.05 : 0.15) * W * (1 - xn) * (0.5 + rnd() * 0.8);
        ph1[i] = u * 5.4 + rnd() * 0.45;
        ph2[i] = u * 9.5 + rnd() * 1.3;
        amp[i] = 0.7 + rnd() * 0.6;
        var r = rnd();
        layerOf[i] = r < 0.1 ? 2 : r < 0.46 ? 0 : 1;
        i++;
      }
      N = i;
      // clumps: neighbours by root position, 12 to 16 strands each, sharing a phase and sweep nudge
      var order = []; for (var k = 0; k < N; k++) order.push(k);
      order.sort(function (a, b) { return rootX[a] - rootX[b]; });
      clumps = []; clumpMass = [];
      var p = 0;
      while (p < N) {
        var size = 12 + Math.floor(rnd() * 5), members = order.slice(p, p + size);
        var cph = (rnd() - 0.5) * 0.5, csw = (rnd() - 0.5) * 20;
        members.forEach(function (m) { ph1[m] += cph; sweep[m] += csw; clumpOf[m] = clumps.length; });
        var span = rootX[members[members.length - 1]] - rootX[members[0]];
        clumps.push(members);
        p += size;
      }
      applyKeep(rnd);
      // short (kept-out) or sparse clumps get no under-mass, it would read as a smudge
      clumps.forEach(function (members) {
        var span = rootX[members[members.length - 1]] - rootX[members[0]], ml = 0;
        members.forEach(function (m) { ml += len[m]; });
        clumpMass.push(span < (mobile ? 70 : 110) && ml / members.length > hairH * 0.45);
      });
      massX = new Float32Array(clumps.length * P); massY = new Float32Array(clumps.length * P);
      // buckets by root x for the per-bucket gradients
      lists = [[], [], []];
      for (var L = 0; L < 3; L++) for (var b = 0; b < NB; b++) lists[L].push([]);
      for (var j = 0; j < N; j++) {
        var bb = clamp(Math.floor(clamp(rootX[j] / W, 0, 0.9999) * NB), 0, NB - 1);
        bucketOf[j] = bb;
        lists[layerOf[j]][bb].push(j);
      }
      gradKey = '';
    }

    // strands whose resting path would pass through the copy end above it, with a ragged edge
    function applyKeep(rnd) {
      if (!keep) return;
      var top = keep.y0 - 24, ampK = mobile ? 0.7 * 1.12 : 1.12;
      for (var i = 0; i < N; i++) {
        var L = len[i], hit = false;
        for (var j = 1; j < P; j++) {
          var s = j / SEG, y = -8 + s * L;
          if (y < top) continue;
          // the wave phase drifts while breathing, so test the whole swing, not one moment
          var env = s * (0.3 + 0.7 * s);
          var xc = rootX[i] + sweep[i] * s * s, swing = 40 * amp[i] * env * ampK + 12;
          if (xc + swing > keep.x0 - 32 && xc - swing < keep.x1 + 32) { hit = true; break; }
        }
        if (hit) len[i] = Math.max(24, Math.min(L, top - rnd() * 44 + 8));
      }
    }

    function layout() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width; H = r.height; mobile = W < 768;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      hairH = mobile ? (keep ? Math.min(H * 0.56, keep.y0 + 8) : H * 0.52) : H * 1.02;
      build();
      draw();
    }

    function colorAt(s, fr, out) {
      var m = clamp((fr - s) / 0.24 + 0.5, 0, 1); m = m * m * (3 - 2 * m);
      for (var k = 0; k < 3; k++) {
        var a = fromRoot[k] + (fromTip[k] - fromRoot[k]) * s;
        var b = toRoot[k] + (toTip[k] - toRoot[k]) * s;
        out[k] = a + (b - a) * m;
      }
      return out;
    }
    function rgba(c, light, sheen, dark, alpha) {
      var r = c[0], g = c[1], b = c[2];
      if (dark) { r *= dark; g *= dark; b *= dark; }
      if (light > 0) { r += (255 - r) * light; g += (255 - g) * light; b += (248 - b) * light; }
      if (sheen > 0) { r += (sheenCol[0] - r) * sheen; g += (sheenCol[1] - g) * sheen; b += (sheenCol[2] - b) * sheen; }
      return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + alpha.toFixed(3) + ')';
    }
    function bandCenter(b, gradY) {
      var cx = (b + 0.5) / NB * W;
      return clamp(0.3 + (14 * Math.sin(cx * 0.004)) / Math.max(gradY, 1), 0.15, 0.5);
    }
    function frontFor(b) { return front - 0.3 * (1 - (b + 0.5) / NB); }
    function makeGrad(gradY, b, light, sheenAmt, dark) {
      var gr = ctx.createLinearGradient(0, 0, 0, gradY);
      var c = b < 0 ? 0.3 : bandCenter(b, gradY), fr = b < 0 ? front : frontFor(b);
      for (var i = 0; i < STOPS.length; i++) {
        var s = STOPS[i];
        var sh = Math.exp(-Math.pow((s - c) / 0.085, 2)) * sheenAmt;
        gr.addColorStop(s, rgba(colorAt(s, fr, tmp), light * s, sh, dark, 1));
      }
      return gr;
    }
    function makeMassGrad(gradY) {
      var gr = ctx.createLinearGradient(0, 0, 0, gradY);
      var al = [0.46, 0.44, 0.38, 0.24, 0.1, 0];
      var ss = [0, 0.16, 0.3, 0.42, 0.52, 0.62];
      var boost = key === 'black' ? 1.35 / alphaMul : 1;
      for (var i = 0; i < ss.length; i++) gr.addColorStop(ss[i], rgba(colorAt(ss[i], front, tmp), 0, 0, 0.92, Math.min(1, al[i] * alphaMul * boost)));
      return gr;
    }
    function gradients(gradY) {
      var k = (gradY | 0) + ':' + (dyeing ? front.toFixed(3) : 'x') + ':' + key;
      if (gradCache && k === gradKey) return gradCache;
      var g = { layer: [[], [], []], mass: makeMassGrad(gradY), tip: [] };
      for (var b = 0; b < NB; b++) {
        g.layer[0].push(makeGrad(gradY, b, 0, 0.1, 0.72));
        g.layer[1].push(makeGrad(gradY, b, 0, 0.3, 0));
        g.layer[2].push(makeGrad(gradY, b, 0.08, 0.46, 0));
      }
      g.tip = [makeGrad(gradY, -1, 0, 0, 0.72), makeGrad(gradY, -1, 0.04, 0, 0), makeGrad(gradY, -1, 0.2, 0, 0)];
      gradCache = g; gradKey = k;
      return g;
    }

    var LW = [2.2, 1, 1.4], ALPHA = [0.28, 0.8, 0.82];

    function compute() {
      var g = grow * (1 - lift * 0.92);
      var t = time;
      var breath = 1 + 0.12 * Math.sin(t * 0.42);
      var A1 = (mobile ? 21 : 30) * breath, A2 = mobile ? 7 : 10;
      var w1 = t * 0.3, w2 = t * 0.19, i, j, k;
      for (i = 0; i < N; i++) {
        var base = i * P, ln = len[i] * g, rx = rootX[i], a = amp[i] * (layerOf[i] === 0 ? 0.65 : 1), sw = sweep[i];
        var p1 = ph1[i] + w1 + (layerOf[i] === 0 ? 0.9 : 0), p2 = ph2[i] - w2;
        for (j = 0; j < P; j++) {
          var s = j / SEG; k = base + j;
          var env = s * (0.3 + 0.7 * s);
          curX[k] = rx + (A1 * Math.sin(s * 4.3 + p1) + A2 * Math.sin(s * 9.4 + p2)) * a * env + sw * s * s + offX[k];
          curY[k] = -8 + s * ln + offY[k];
        }
      }
      // clumping: strands drift towards their clump's centre line, more so towards the tips
      for (var c = 0; c < clumps.length; c++) {
        var mem = clumps[c], n = mem.length;
        for (j = 1; j < P; j++) {
          var sx = 0, sy = 0;
          for (var q = 0; q < n; q++) { k = mem[q] * P + j; sx += curX[k]; sy += curY[k]; }
          var mx = sx / n, f = 0.24 * (j / SEG) * (j / SEG);
          for (q = 0; q < n; q++) { k = mem[q] * P + j; curX[k] += (mx - curX[k]) * f; }
        }
      }
      // the comb can push strands sideways; they slide along the copy's edge instead of crossing it
      if (keep && physicsActive) {
        var edge = keep.x1 + 18, top = keep.y0 - 20, left = keep.x0 - 40;
        for (k = 0; k < N * P; k++) {
          if (curY[k] > top && curX[k] < edge && curX[k] > left) curX[k] = edge;
        }
      }
    }

    function strandPath(i, from, to) {
      var base = i * P;
      if (from === 0) ctx.moveTo(curX[base], curY[base]);
      else ctx.moveTo((curX[base + from - 1] + curX[base + from]) * 0.5, (curY[base + from - 1] + curY[base + from]) * 0.5);
      for (var q = Math.max(1, from); q < to; q++) {
        var k = base + q;
        ctx.quadraticCurveTo(curX[k], curY[k], (curX[k] + curX[k + 1]) * 0.5, (curY[k] + curY[k + 1]) * 0.5);
      }
      if (to === SEG) ctx.lineTo(curX[base + SEG], curY[base + SEG]);
    }

    function draw() {
      if (!W) return;
      compute();
      var g = grow * (1 - lift * 0.92);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var gradY = hairH * 1.08 * g + 1;
      var gr = gradients(gradY);
      var fade = 1 - lift * 0.5;

      // under-mass: a soft wide stroke along each dense clump; it fades out by 62% of the length so the tips stay airy
      var MW = mobile ? 11 : 19;
      for (var c = 0; c < clumps.length; c++) {
        if (!clumpMass[c]) continue;
        var mem = clumps[c], n = mem.length;
        for (var j = 0; j <= TIP; j++) {
          var sx = 0, sy = 0;
          for (var q = 0; q < n; q++) { var kk = mem[q] * P + j; sx += curX[kk]; sy += curY[kk]; }
          massX[c * P + j] = sx / n; massY[c * P + j] = sy / n;
        }
      }
      ctx.strokeStyle = gr.mass;
      ctx.lineWidth = MW;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      for (c = 0; c < clumps.length; c++) {
        if (!clumpMass[c]) continue;
        var o = c * P;
        ctx.moveTo(massX[o], massY[o]);
        for (j = 1; j < TIP; j++) ctx.quadraticCurveTo(massX[o + j], massY[o + j], (massX[o + j] + massX[o + j + 1]) * 0.5, (massY[o + j] + massY[o + j + 1]) * 0.5);
      }
      ctx.stroke();

      for (var L = 0; L < 3; L++) {
        var lw = mobile && L === 0 ? 1.8 : LW[L];
        ctx.lineWidth = lw;
        ctx.globalAlpha = ALPHA[L] * alphaMul * fade;
        for (var b = 0; b < NB; b++) {
          var list = lists[L][b];
          if (!list.length) continue;
          ctx.beginPath();
          for (var m = 0; m < list.length; m++) strandPath(list[m], 0, TIP);
          ctx.strokeStyle = gr.layer[L][b];
          ctx.stroke();
        }
        // tips: thinner and fainter, so every strand tapers instead of ending in a blunt line
        ctx.beginPath();
        for (b = 0; b < NB; b++) { var l2 = lists[L][b]; for (m = 0; m < l2.length; m++) strandPath(l2[m], TIP, SEG); }
        ctx.lineWidth = lw * 0.62;
        ctx.globalAlpha = ALPHA[L] * alphaMul * fade * 0.5;
        ctx.strokeStyle = gr.tip[L];
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
      vx = clamp(vx, -28, 28); vy = clamp(vy, -28, 28);
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
          if ((up > 0 && up > o) || (up < 0 && up < o)) v += (up - o) * 0.07;
          v += -o * 0.0052;
          v *= 0.89;
          o += v;
          if (o > 90) { o = 90; v = 0; } else if (o < -90) { o = -90; v = 0; }
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
        front = -0.25 + q * 1.9;
        if (q >= 1) { dyeing = false; front = 3; fromRoot = toRoot.slice(); fromTip = toTip.slice(); gradKey = ''; }
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
    function onResize() { clearTimeout(rt); rt = setTimeout(function () { if (opts.getKeepOut) keep = opts.getKeepOut(); layout(); }, 150); }
    window.addEventListener('resize', onResize, { passive: true });

    if (opts.getKeepOut) keep = opts.getKeepOut();
    layout();
    kick();

    return {
      palettes: PALETTES,
      setColor: function (k, instant) {
        if (!PALETTES[k]) return;
        var p = PALETTES[k];
        var nr = hex(p.root), nt = hex(p.tip);
        key = k; sheenCol = p.sheen.slice(); alphaMul = p.alpha;
        if (instant || reduced) {
          fromRoot = nr; fromTip = nt; toRoot = nr.slice(); toTip = nt.slice(); front = 3; dyeing = false; gradKey = '';
          draw(); return;
        }
        if (dyeing) { fromRoot = colorAt(0, front, [0, 0, 0]); fromTip = colorAt(1, front, [0, 0, 0]); }
        toRoot = nr; toTip = nt; front = -0.25; frontStart = performance.now(); dyeing = true;
        kick();
      },
      setKeepOut: function (k) { keep = k; layout(); },
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
