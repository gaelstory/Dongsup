/* Flora: the one flower generator behind the hero canvas and every SVG on the page.
   Shapes are unit paths (base at 0,0, tip at 0,-1). A head is a list of parts that place
   those shapes; each part has its own bloom window, so petals open one by one. The same
   parts render to Canvas 2D (Path2D) or to SVG <use>, so every flower on the page matches. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, GOLD = Math.PI * (3 - Math.sqrt(5));

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(r, a, b) { return a + (b - a) * r(); }
  function num(v) { return Math.round(v * 1000) / 1000; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function shuffle(a, r) {
    for (var i = a.length - 1; i > 0; i--) { var j = (r() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- path helpers ---------- */
  var ARITY = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  function parse(s) {
    var tk = s.match(/[MLQCZ]|-?\d*\.?\d+/g), out = [], i = 0;
    while (i < tk.length) {
      var c = tk[i++], seg = [c];
      for (var j = 0; j < ARITY[c]; j++) seg.push(parseFloat(tk[i++]));
      out.push(seg);
    }
    return out;
  }
  function xf(cmds, tx, ty, rot, sx, sy) {
    var c = Math.cos(rot), s = Math.sin(rot);
    return cmds.map(function (seg) {
      var o = [seg[0]];
      for (var i = 1; i < seg.length; i += 2) {
        var x = seg[i] * sx, y = seg[i + 1] * sy;
        o.push(c * x - s * y + tx, s * x + c * y + ty);
      }
      return o;
    });
  }
  function circ(cx, cy, r) {
    var k = 0.5523 * r;
    return [['M', cx + r, cy], ['C', cx + r, cy + k, cx + k, cy + r, cx, cy + r], ['C', cx - k, cy + r, cx - r, cy + k, cx - r, cy],
      ['C', cx - r, cy - k, cx - k, cy - r, cx, cy - r], ['C', cx + k, cy - r, cx + r, cy - k, cx + r, cy], ['Z']];
  }
  function str(cmds) {
    var s = '';
    for (var i = 0; i < cmds.length; i++) {
      var g = cmds[i];
      s += g[0];
      for (var j = 1; j < g.length; j++) s += (j > 1 ? ' ' : '') + num(g[j]);
    }
    return s;
  }

  /* ---------- unit shapes ---------- */
  var SH = {};
  function def(name, s) { SH[name] = typeof s === 'string' ? parse(s) : s; }
  def('tulip', 'M0 0 C0.26 -0.02 0.42 -0.36 0.41 -0.64 C0.4 -0.86 0.2 -0.99 0 -1 C-0.2 -0.99 -0.4 -0.86 -0.41 -0.64 C-0.42 -0.36 -0.26 -0.02 0 0 Z');
  def('tulipTip', 'M0 0 C0.28 -0.04 0.43 -0.4 0.39 -0.68 C0.35 -0.88 0.14 -0.96 0.02 -1.04 C-0.16 -0.95 -0.37 -0.86 -0.4 -0.66 C-0.43 -0.38 -0.26 -0.03 0 0 Z');
  def('round', 'M0 0 C0.26 0 0.5 -0.32 0.5 -0.6 C0.5 -0.86 0.3 -1 0 -1 C-0.3 -1 -0.5 -0.86 -0.5 -0.6 C-0.5 -0.32 -0.26 0 0 0 Z');
  def('shell', 'M0 0 C0.18 -0.04 0.52 -0.3 0.52 -0.62 C0.52 -0.88 0.28 -1.02 0 -1 C-0.28 -1.02 -0.52 -0.88 -0.52 -0.62 C-0.52 -0.3 -0.18 -0.04 0 0 Z');
  def('strap', 'M-0.045 0 C-0.1 -0.22 -0.115 -0.72 -0.075 -0.94 Q0 -1.03 0.075 -0.94 C0.115 -0.72 0.1 -0.22 0.045 0 Z');
  def('strapN', 'M-0.045 0 C-0.1 -0.22 -0.115 -0.72 -0.08 -0.94 Q-0.05 -1 -0.025 -0.965 Q0 -0.93 0.025 -0.965 Q0.05 -1 0.08 -0.94 C0.115 -0.72 0.1 -0.22 0.045 0 Z');
  def('thin', 'M-0.025 0 C-0.06 -0.3 -0.07 -0.75 -0.045 -0.95 Q0 -1.02 0.045 -0.95 C0.07 -0.75 0.06 -0.3 0.025 0 Z');
  def('pointed', 'M0 0 C0.17 -0.08 0.24 -0.46 0.17 -0.74 C0.12 -0.9 0.05 -0.97 0 -1.03 C-0.05 -0.97 -0.12 -0.9 -0.17 -0.74 C-0.24 -0.46 -0.17 -0.08 0 0 Z');
  def('notch', 'M0 0 C0.16 -0.12 0.36 -0.56 0.38 -0.84 Q0.31 -1 0.19 -0.93 Q0.1 -1.03 0 -0.95 Q-0.1 -1.03 -0.19 -0.93 Q-0.31 -1 -0.38 -0.84 C-0.36 -0.56 -0.16 -0.12 0 0 Z');
  def('anem', 'M0 0 C0.24 -0.06 0.56 -0.34 0.54 -0.66 C0.52 -0.9 0.28 -1.02 0 -1 C-0.28 -1.02 -0.52 -0.9 -0.54 -0.66 C-0.56 -0.34 -0.24 -0.06 0 0 Z');
  def('bud', 'M0 0 C0.3 -0.16 0.3 -0.7 0 -1 C-0.3 -0.7 -0.3 -0.16 0 0 Z');
  def('tube', 'M-0.1 0 C-0.12 -0.34 -0.2 -0.6 -0.34 -0.86 Q0 -0.94 0.34 -0.86 C0.2 -0.6 0.12 -0.34 0.1 0 Z');
  def('lobe', 'M0 0 C0.3 -0.1 0.44 -0.56 0.3 -0.84 C0.2 -1.02 -0.2 -1.02 -0.3 -0.84 C-0.44 -0.56 -0.3 -0.1 0 0 Z');
  def('bell', 'M-0.14 0 C-0.42 -0.04 -0.5 -0.44 -0.48 -0.76 Q-0.46 -0.98 -0.3 -0.9 Q-0.16 -1.03 0 -0.92 Q0.16 -1.03 0.3 -0.9 Q0.46 -0.98 0.48 -0.76 C0.5 -0.44 0.42 -0.04 0.14 0 Z');
  def('leaf', 'M0 0 C0.2 -0.12 0.3 -0.5 0.18 -0.78 C0.12 -0.9 0.05 -0.97 0 -1 C-0.06 -0.9 -0.2 -0.72 -0.22 -0.45 C-0.24 -0.22 -0.14 -0.06 0 0 Z');
  def('leafBroad', 'M0 0 C0.24 -0.1 0.22 -0.6 0.07 -0.9 Q0.02 -0.98 -0.01 -1 C-0.09 -0.8 -0.22 -0.55 -0.21 -0.32 C-0.2 -0.14 -0.12 -0.03 0 0 Z');
  def('blade', 'M-0.04 0 C-0.06 -0.4 -0.04 -0.75 0.01 -1 C0.05 -0.7 0.06 -0.35 0.04 0 Z');
  def('midrib', 'M0 -0.02 Q0.03 -0.5 0 -0.94');
  def('vein3', 'M0 -0.05 Q0.02 -0.45 0 -0.8 M0 -0.05 Q0.12 -0.38 0.18 -0.66 M0 -0.05 Q-0.12 -0.38 -0.18 -0.66');
  def('crease', 'M0 -0.05 Q0.02 -0.5 0 -0.86 M0.02 -0.06 Q0.2 -0.45 0.36 -0.76 M-0.02 -0.06 Q-0.2 -0.45 -0.36 -0.76 M0.02 -0.08 Q0.34 -0.4 0.55 -0.6 M-0.02 -0.08 Q-0.34 -0.4 -0.55 -0.6');
  def('line', 'M0 0 L0 -1');
  def('arc', 'M0 0 Q0.12 -0.62 1 -0.7');
  def('hang', 'M0 0 Q0.4 -0.55 1 -0.3');
  def('disc', circ(0, 0, 1));

  (function () {
    var i, d, a, out, r;
    // poppy petals: a broad fan whose outer edge ripples
    for (var v = 0; v < 3; v++) {
      r = rng(911 + v * 17);
      var k = 5 + v % 2, cx = 0, cy = -0.56, rx = 0.66, ry = 0.44;
      out = [['M', 0, 0], ['C', -0.24, -0.06, -0.6, -0.3, -0.66, -0.56]];
      for (i = 1; i <= k; i++) {
        var f1 = Math.PI - i * Math.PI / k, fm = f1 + Math.PI / (2 * k), e = i === k ? 1 : rr(r, 0.95, 0.99), amp = rr(r, 1.07, 1.15);
        out.push(['Q', cx + rx * amp * Math.cos(fm), cy - ry * amp * Math.sin(fm), cx + rx * e * Math.cos(f1), cy - ry * e * Math.sin(f1)]);
      }
      out.push(['C', 0.6, -0.3, 0.24, -0.06, 0, 0], ['Z']);
      def('wavy' + v, out);
    }
    // peony petals: round petal with a ruffled top
    for (v = 0; v < 2; v++) {
      r = rng(431 + v * 29);
      out = [['M', 0, 0], ['C', -0.26, 0, -0.5, -0.32, -0.5, -0.6]];
      var kk = 4;
      for (i = 1; i <= kk; i++) {
        var g1 = Math.PI - i * Math.PI / kk, gm = g1 + Math.PI / (2 * kk), am = rr(r, 1.06, 1.14);
        out.push(['Q', 0.5 * am * Math.cos(gm), -0.6 - 0.4 * am * Math.sin(gm), 0.5 * Math.cos(g1), -0.6 - 0.4 * Math.sin(g1) * (i === kk ? 1 : 0.97)]);
      }
      out.push(['C', 0.5, -0.32, 0.26, 0, 0, 0], ['Z']);
      def('ruffle' + v, out);
    }
    // seed and floret textures packed on a golden spiral
    function dots(n, R, rad, seed) {
      var o = [], q = rng(seed);
      for (var j = 0; j < n; j++) { var dd = R * Math.sqrt((j + 0.5) / n), aa = j * GOLD; o = o.concat(circ(dd * Math.cos(aa), dd * Math.sin(aa), rad * rr(q, 0.8, 1.15))); }
      return o;
    }
    def('florets', dots(30, 0.8, 0.085, 7));
    def('seeds', dots(80, 0.92, 0.045, 9));
    out = []; r = rng(77);
    for (i = 0; i < 34; i++) { a = i / 34 * TAU + rr(r, -0.06, 0.06); d = rr(r, 0.72, 1); out = out.concat(circ(Math.cos(a) * d, Math.sin(a) * d, rr(r, 0.05, 0.08))); }
    def('stamens', out);
    out = [];
    for (i = 0; i < 8; i++) { a = i / 8 * TAU; out.push(['M', 0, 0], ['L', Math.sin(a) * 0.92, -Math.cos(a) * 0.92]); }
    def('rays', out);
    out = [];
    for (i = 0; i < 4; i++) out = out.concat(xf(SH.shell, 0, 0, i * Math.PI / 2 + Math.PI / 4, 0.98, 1));
    def('floret4', out);
    out = [];
    for (i = 0; i < 5; i++) out = out.concat(xf(SH.pointed, 0, 0, i * TAU / 5, 1.5, 1));
    def('calyx', out);
    out = [];
    for (i = 0; i < 5; i++) { a = i * TAU / 5; out = out.concat(circ(Math.sin(a) * 0.5, -Math.cos(a) * 0.5, 0.52)); }
    def('puff', out);
  })();

  /* ---------- paint ---------- */
  var FILL = {
    pink: ['l', [[0, '#DE3467'], [0.55, '#FF5A87'], [1, '#FFA9C1']]],
    pinkS: ['l', [[0, '#BF2757'], [0.6, '#EA4876'], [1, '#FF8CAB']]],
    coral: ['l', [[0, '#E5552C'], [0.55, '#FF8752'], [1, '#FFC09A']]],
    coralS: ['l', [[0, '#CC4622'], [0.6, '#F07240'], [1, '#FFA67C']]],
    yellow: ['l', [[0, '#EE9C0C'], [0.5, '#FFC42E'], [1, '#FFE494']]],
    yellowS: ['l', [[0, '#DA8A06'], [0.6, '#F8B31F'], [1, '#FFD465']]],
    white: ['l', [[0, '#E2E8F2'], [0.45, '#F8FAFD'], [1, '#FFFFFF']]],
    whiteS: ['l', [[0, '#CFD7E5'], [0.6, '#E8EDF5'], [1, '#F6F8FC']]],
    cream: ['l', [[0, '#F4C7AA'], [0.5, '#FFEADB'], [1, '#FFFBF7']]],
    creamS: ['l', [[0, '#E8B190'], [0.6, '#F9D8C2'], [1, '#FFEFE3']]],
    blush: ['l', [[0, '#FF6893'], [0.5, '#FFABC2'], [1, '#FFE8EF']]],
    blushS: ['l', [[0, '#EE527B'], [0.6, '#FF94B1'], [1, '#FFD5E1']]],
    sky: ['l', [[0, '#6C95E4'], [0.5, '#9DBEF5'], [1, '#E2EDFF']]],
    skyS: ['l', [[0, '#5982D2'], [0.6, '#8AAFEE'], [1, '#CDDFFB']]],
    leaf: ['l', [[0, '#1F5C3A'], [0.55, '#2C7347'], [1, '#46935F']]],
    leafL: ['l', [[0, '#2A6E46'], [1, '#6DAF7C']]],
    bud: ['l', [[0, '#4F8B4C'], [0.55, '#A9C66E'], [1, '#FFE085']]],
    calyx: ['l', [[0, '#1F5C3A'], [1, '#4E9262']]],
    cYellow: ['r', [[0, '#FFE88F'], [0.55, '#FFC42E'], [1, '#DC8A0B']]],
    cBrown: ['r', [[0, '#7A5230'], [0.6, '#4E3421'], [1, '#3B2A20']]],
    cGreen: ['r', [[0, '#DCE8B0'], [0.6, '#A2C07A'], [1, '#6E9253']]],
    cDark: ['r', [[0, '#55497A'], [0.6, '#30274A'], [1, '#1F1A30']]],
    cCream: ['r', [[0, '#FFF8DA'], [1, '#F1D7A2']]],
    dotOrange: '#B9661A', dotDark: '#33241C', blotch: '#3B2A20', gyp: '#FFFFFF'
  };
  var INK = {
    edge: 'rgba(59,42,32,0.16)', edgeW: 'rgba(59,42,32,0.13)', vein: 'rgba(255,255,255,0.42)', veinD: 'rgba(59,42,32,0.12)',
    stem: '#1F5C3A', stemL: '#3A7D50', gypE: 'rgba(110,90,100,0.32)', dark: 'rgba(43,30,26,0.78)', rim: 'rgba(130,70,15,0.35)'
  };

  function P(s, f, x, y, r, sx, sy, a, b, o) {
    var p = { s: s, f: f, x: x, y: y, r: r, r0: r, sx: sx, sy: sy, k0: 0.2, a: a, b: b, o: 1, st: null, lw: 0 };
    if (o) for (var k in o) p[k] = o[k];
    return p;
  }

  /* ---------- flower families ---------- */
  function rosette(r, hue, rnd, rings, o) {
    var parts = [], K = rings.length, base = rnd() * TAU;
    for (var k = 0; k < K; k++) {
      var g = rings[k], n = g[0], L = r * g[1], fl = hue + (g[3] || ''), ws = g[4] || 1;
      var off = o.step ? base + k * Math.PI / n : rnd() * TAU;
      var a = o.a0 + (K - 1 - k) / Math.max(1, K - 1) * o.spread;
      for (var i = 0; i < n; i++) {
        var th = off + i * TAU / n + (rnd() - 0.5) * (o.jit || 0.1), l = L * rr(rnd, 0.94, 1.06);
        var shp = Array.isArray(g[2]) ? g[2][(rnd() * g[2].length) | 0] : g[2];
        var da = (i / n) * 0.08;
        parts.push(P(shp, fl, 0, 0, th, l * ws, l, a + da, a + 0.42 + da, { k0: 0.25, r0: th + (o.spin || 0), st: o.edge || 'edge', lw: 0.6 }));
      }
    }
    return parts;
  }
  function radial(r, rnd, layers) {
    var parts = [];
    for (var li = 0; li < layers.length; li++) {
      var Ly = layers[li], n = Ly.n, off = Ly.off;
      for (var i = 0; i < n; i++) {
        var th = off + i * TAU / n + (rnd() - 0.5) * (Ly.jit || 0.08), jl = Ly.jl || 0.06, l = r * Ly.L * rr(rnd, 1 - jl, 1 + jl);
        var a = Ly.a + (i / n) * (Ly.sweep == null ? 0.4 : Ly.sweep), d = Ly.d || 0.35;
        var shp = Array.isArray(Ly.s) ? Ly.s[(rnd() * Ly.s.length) | 0] : Ly.s;
        parts.push(P(shp, Ly.f, 0, 0, th, l * Ly.w, l, a, a + d, { k0: Ly.k0 || 0.15, st: Ly.st || null, lw: Ly.lw || 0.5, o: Ly.o || 1 }));
        if (Ly.vein) parts.push(P(Ly.vein, null, 0, 0, th, l * Ly.w, l, a, a + d, { k0: Ly.k0 || 0.15, st: 'vein', lw: 0.5, o: 0.6 }));
      }
    }
    return parts;
  }
  function centre(parts, r, fill, size, tex, texFill, texO) {
    parts.push(P('disc', fill, 0, 0, 0, r * size, r * size, 0, 0.3, { k0: 0.5 }));
    if (tex) parts.push(P(tex, texFill, 0, 0, 0, r * size * 0.92, r * size * 0.92, 0.05, 0.35, { k0: 0.5, o: texO || 0.5 }));
  }

  var KINDS = {
    tulip: function (r, hue, rnd) {
      var L = r * 1.3, ra = 0.27 + (rnd() - 0.5) * 0.06, parts = [], ed = hue === 'white' || hue === 'cream' ? 'edgeW' : 'edge';
      parts.push(P('tulip', hue + 'S', 0, 0, (rnd() - 0.5) * 0.05, L * 0.86, L * 1.06, 0, 0.62, { k0: 0.3, st: ed, lw: 0.6 }));
      parts.push(P('midrib', null, 0, 0, 0, L * 0.86, L * 0.96, 0, 0.62, { k0: 0.3, st: 'vein', lw: 0.6, o: 0.45 }));
      parts.push(P('tulipTip', hue, -r * 0.1, r * 0.03, -ra, L * 0.8, L * 0.98, 0.12, 0.82, { r0: -0.04, k0: 0.3, st: ed, lw: 0.7 }));
      parts.push(P('midrib', null, -r * 0.1, r * 0.03, -ra, L * 0.8, L * 0.9, 0.12, 0.82, { r0: -0.04, k0: 0.3, st: 'vein', lw: 0.7, o: 0.7 }));
      parts.push(P('tulipTip', hue, r * 0.1, r * 0.03, ra, -L * 0.8, L * 0.98, 0.26, 1, { r0: 0.04, k0: 0.3, st: ed, lw: 0.7 }));
      parts.push(P('midrib', null, r * 0.1, r * 0.03, ra, -L * 0.8, L * 0.9, 0.26, 1, { r0: 0.04, k0: 0.3, st: 'vein', lw: 0.7, o: 0.7 }));
      return { parts: parts, tilt: 1, front: false, petal: ['tulip', hue] };
    },
    freesia: function (r, hue, rnd) {
      var dir = rnd() < 0.5 ? -1 : 1, AX = 2.1 * r, AY = 1.4 * r, parts = [], list = [], ed = hue === 'white' ? 'edgeW' : 'edge';
      parts.push(P('arc', null, 0, 0, 0, dir * AX, AY, 0, 0.3, { st: 'stem', lw: 1.5, k0: 0.4 }));
      var n = 6 + (rnd() < 0.5 ? 1 : 0), nOpen = n - 3 + (rnd() < 0.5 ? 0 : 1);
      for (var j = 0; j < n; j++) {
        var u = 0.26 + j * (0.74 / (n - 1)), m = 1 - u;
        var x = dir * (2 * m * u * 0.12 + u * u) * AX, y = (2 * m * u * -0.62 + u * u * -0.7) * AY;
        var phi = dir * (-0.18 + 0.75 * j / (n - 1)), sz = r * (0.72 - j * 0.07), grp = [];
        if (j < nOpen) {
          var a0 = 0.12 + j * 0.11, b0 = a0 + 0.42, ax = x + Math.sin(phi) * sz * 0.46, ay = y - Math.cos(phi) * sz * 0.46;
          grp.push(P('tube', hue + 'S', x, y, phi, sz * 0.46, sz * 0.56, a0, b0, { k0: 0.4 }));
          grp.push(P('lobe', hue + 'S', ax, ay, phi - 1, sz * 0.4, sz * 0.5, a0 + 0.05, b0 + 0.05, { k0: 0.3, r0: phi - 0.2, st: ed, lw: 0.5 }));
          grp.push(P('lobe', hue + 'S', ax, ay, phi + 1, -sz * 0.4, sz * 0.5, a0 + 0.05, b0 + 0.05, { k0: 0.3, r0: phi + 0.2, st: ed, lw: 0.5 }));
          grp.push(P('lobe', hue, ax, ay, phi - 0.34, sz * 0.4, sz * 0.56, a0 + 0.1, b0 + 0.1, { k0: 0.3, r0: phi - 0.1, st: ed, lw: 0.5 }));
          grp.push(P('lobe', hue, ax, ay, phi + 0.34, -sz * 0.4, sz * 0.56, a0 + 0.1, b0 + 0.1, { k0: 0.3, r0: phi + 0.1, st: ed, lw: 0.5 }));
          grp.push(P('midrib', null, ax, ay, phi - 0.34, sz * 0.36, sz * 0.5, a0 + 0.1, b0 + 0.1, { k0: 0.3, st: 'vein', lw: 0.5, o: 0.6 }));
        } else {
          grp.push(P('bud', 'bud', x, y, phi + dir * 0.3, sz * 0.36, sz * 0.82, 0.1 + j * 0.06, 0.5 + j * 0.06, { k0: 0.4 }));
        }
        list.unshift(grp);
      }
      for (j = 0; j < list.length; j++) parts = parts.concat(list[j]);
      return { parts: parts, tilt: 1, front: false, petal: ['lobe', hue] };
    },
    ranunculus: function (r, hue, rnd) {
      var parts = rosette(r, hue, rnd, [[12, 1, 'shell', '', 1], [10, 0.84, 'shell', '', 0.96], [9, 0.67, 'round', 'S', 0.92], [7, 0.5, 'round', 'S', 0.86], [5, 0.33, 'round', 'S', 0.8]],
        { a0: 0.04, spread: 0.5, spin: 0.9, jit: 0.12 });
      parts.push(P('disc', 'cGreen', 0, 0, 0, r * 0.09, r * 0.09, 0, 0.2, { k0: 0.6 }));
      return { parts: parts, tilt: 0.84, front: true, petal: ['shell', hue] };
    },
    peony: function (r, hue, rnd) {
      var parts = rosette(r, hue, rnd, [[13, 1, ['ruffle0', 'ruffle1'], '', 1.05], [11, 0.84, ['ruffle0', 'ruffle1'], '', 1], [10, 0.66, 'ruffle1', 'S', 0.95], [8, 0.48, 'round', 'S', 0.9], [6, 0.3, 'round', 'S', 0.85]],
        { a0: 0.04, spread: 0.5, spin: 0.5, jit: 0.3 });
      parts.push(P('disc', 'cCream', 0, 0, 0, r * 0.08, r * 0.08, 0, 0.2, { k0: 0.6 }));
      return { parts: parts, tilt: 0.86, front: true, petal: ['ruffle0', hue] };
    },
    dahlia: function (r, hue, rnd) {
      var parts = rosette(r, hue, rnd, [[16, 1, 'pointed', '', 1.7], [14, 0.86, 'pointed', '', 1.7], [12, 0.72, 'pointed', '', 1.7], [10, 0.57, 'pointed', 'S', 1.7], [8, 0.42, 'pointed', 'S', 1.75], [6, 0.27, 'pointed', 'S', 1.8]],
        { a0: 0.04, spread: 0.5, spin: 0.5, jit: 0.02, step: true });
      parts.push(P('disc', 'cYellow', 0, 0, 0, r * 0.06, r * 0.06, 0, 0.2, { k0: 0.6 }));
      return { parts: parts, tilt: 0.86, front: true, petal: ['pointed', hue] };
    },
    zinnia: function (r, hue, rnd) {
      var parts = rosette(r, hue, rnd, [[14, 1, 'round', '', 0.72], [12, 0.78, 'round', '', 0.72], [10, 0.56, 'round', 'S', 0.75]], { a0: 0.06, spread: 0.4, spin: 0.6, jit: 0.08 });
      centre(parts, r, 'cYellow', 0.17, 'florets', 'dotDark', 0.55);
      return { parts: parts, tilt: 0.86, front: true, petal: ['round', hue] };
    },
    daisy: function (r, hue, rnd) {
      var n = 18 + ((rnd() * 6) | 0), off = rnd() * TAU, h = hue || 'white';
      var parts = radial(r, rnd, [
        { n: n, L: 0.86, s: 'strap', f: h + 'S', w: 1.15, a: 0.18, off: off + Math.PI / n, st: 'edgeW', lw: 0.4 },
        { n: n, L: 0.96, s: ['strap', 'strap', 'strapN'], f: h, w: 1.1, a: 0.24, off: off, st: 'edgeW', lw: 0.4 }]);
      centre(parts, r, 'cYellow', 0.25, 'florets', 'dotOrange', 0.5);
      parts.push(P('disc', null, 0, 0, 0, r * 0.25, r * 0.25, 0, 0.3, { k0: 0.5, st: 'rim', lw: 0.6 }));
      return { parts: parts, tilt: 0.75, front: true, petal: ['strap', h] };
    },
    cosmos: function (r, hue, rnd) {
      var parts = radial(r, rnd, [{ n: 8, L: 1, s: 'notch', f: hue, w: 1, vein: 'vein3', a: 0.15, sweep: 0.45, off: rnd() * TAU, st: 'edgeW', lw: 0.4, jit: 0.12 }]);
      centre(parts, r, 'cYellow', 0.17, 'florets', 'dotOrange', 0.55);
      return { parts: parts, tilt: 0.8, front: true, petal: ['notch', hue] };
    },
    sunflower: function (r, hue, rnd) {
      var off = rnd() * TAU;
      var parts = radial(r, rnd, [
        { n: 22, L: 0.92, s: 'pointed', f: hue + 'S', w: 1.35, a: 0.2, off: off + Math.PI / 22 },
        { n: 22, L: 1, s: 'pointed', f: hue, w: 1.3, a: 0.26, off: off }]);
      centre(parts, r, 'cBrown', 0.42, 'seeds', 'dotOrange', 0.35);
      return { parts: parts, tilt: 0.82, front: true, petal: ['pointed', hue] };
    },
    chrysanthemum: function (r, hue, rnd) {
      var parts = radial(r, rnd, [
        { n: 30, L: 1, s: 'thin', f: hue + 'S', w: 1.5, a: 0.3, sweep: 0.3, off: rnd() * TAU },
        { n: 26, L: 0.8, s: 'thin', f: hue, w: 1.5, a: 0.2, sweep: 0.3, off: rnd() * TAU },
        { n: 20, L: 0.6, s: 'thin', f: hue, w: 1.6, a: 0.1, sweep: 0.3, off: rnd() * TAU },
        { n: 12, L: 0.38, s: 'thin', f: hue + 'S', w: 1.8, a: 0.02, sweep: 0.2, off: rnd() * TAU }]);
      parts.push(P('disc', 'cGreen', 0, 0, 0, r * 0.07, r * 0.07, 0, 0.2, { k0: 0.6 }));
      return { parts: parts, tilt: 0.84, front: true, petal: ['thin', hue] };
    },
    anemone: function (r, hue, rnd) {
      var off = rnd() * TAU;
      var parts = radial(r, rnd, [
        { n: 3, L: 1, s: 'anem', f: hue + 'S', w: 1, a: 0.1, sweep: 0.3, off: off, st: 'edgeW', lw: 0.5, vein: 'vein3' },
        { n: 3, L: 0.95, s: 'anem', f: hue, w: 1, a: 0.2, sweep: 0.3, off: off + Math.PI / 3, st: 'edgeW', lw: 0.5, vein: 'vein3' }]);
      parts.push(P('stamens', 'dotDark', 0, 0, 0, r * 0.38, r * 0.38, 0.2, 0.55, { k0: 0.5, o: 0.85 }));
      parts.push(P('disc', 'cDark', 0, 0, 0, r * 0.22, r * 0.22, 0, 0.3, { k0: 0.5 }));
      return { parts: parts, tilt: 0.8, front: true, petal: ['anem', hue] };
    },
    poppy: function (r, hue, rnd) {
      var parts = [], off = rnd() * TAU, L = r * 1.02, order = [0, 2, 1, 3], blot = hue === 'coral' || hue === 'pink';
      for (var q = 0; q < 4; q++) {
        var th = wrap(off + order[q] * TAU / 4 + (rnd() - 0.5) * 0.25), shade = q < 2;
        var a = 0.12 + q * 0.12, b = a + 0.5, s = 'wavy' + ((rnd() * 3) | 0), sc = L * (shade ? 0.96 : 1) * rr(rnd, 0.94, 1.06);
        var o = { k0: 0.28, r0: th * 0.3 };
        o.st = hue === 'white' ? 'edgeW' : 'edge'; o.lw = 0.6;
        parts.push(P(s, hue + (shade ? 'S' : ''), 0, 0, th, sc, sc, a, b, o));
        parts.push(P('crease', null, 0, 0, th, sc, sc, a, b, { k0: 0.28, r0: th * 0.3, st: 'vein', lw: 0.6, o: 0.55 }));
        if (blot) parts.push(P('bud', 'blotch', 0, 0, th, sc * 0.26, sc * 0.3, a, b, { k0: 0.28, r0: th * 0.3, o: 0.55 }));
      }
      parts.push(P('stamens', 'dotDark', 0, 0, 0, r * 0.34, r * 0.34, 0.25, 0.6, { k0: 0.5, o: 0.85 }));
      parts.push(P('disc', 'cGreen', 0, 0, 0, r * 0.17, r * 0.17, 0, 0.3, { k0: 0.6 }));
      parts.push(P('rays', null, 0, 0, rnd() * TAU, r * 0.15, r * 0.15, 0.1, 0.4, { st: 'dark', lw: 0.7, k0: 0.6, o: 0.7 }));
      return { parts: parts, tilt: 0.72, front: true, petal: ['wavy0', hue] };
    },
    hydrangea: function (r, hue, rnd) {
      var parts = [], N = 24;
      for (var i = N - 1; i >= 0; i--) {
        var d = r * 0.8 * Math.sqrt((i + 0.5) / N), a = i * GOLD, x = Math.cos(a) * d, y = Math.sin(a) * d, s = r * rr(rnd, 0.24, 0.3), at = 0.05 + (i / N) * 0.5;
        parts.push(P('floret4', i > N * 0.55 ? hue + 'S' : hue, x, y, rnd() * TAU, s, s, at, at + 0.4, { k0: 0.3, st: 'edgeW', lw: 0.5 }));
        parts.push(P('disc', 'cCream', x, y, 0, s * 0.13, s * 0.13, at + 0.2, at + 0.5, { k0: 0.5 }));
      }
      return { parts: parts, tilt: 0.92, front: true, petal: ['shell', hue] };
    },
    gyp: function (r, hue, rnd) {
      var parts = [], m = 5 + ((rnd() * 2) | 0);
      function cluster(cx, cy, a) {
        var k = 3 + ((rnd() * 4) | 0);
        for (var j = 0; j < k; j++) {
          var d = r * rr(rnd, 0.02, 0.13), t = rnd() * TAU, s = r * rr(rnd, 0.055, 0.085);
          parts.push(P('puff', 'gyp', cx + Math.cos(t) * d, cy + Math.sin(t) * d, rnd() * TAU, s, s, a + j * 0.03, a + j * 0.03 + 0.3, { k0: 0.4, st: 'gypE', lw: 0.45 }));
        }
      }
      for (var b = 0; b < m; b++) {
        var ang = -1 + 2 * (b + 0.5) / m + (rnd() - 0.5) * 0.3, len = r * rr(rnd, 0.6, 1.05), a = 0.02 + b * 0.06;
        parts.push(P('line', null, 0, 0, ang, 1, len, a, a + 0.35, { st: 'stemL', lw: 0.8, k0: 0.2 }));
        var ex = Math.sin(ang) * len, ey = -Math.cos(ang) * len;
        var tw = ang + (rnd() < 0.5 ? -1 : 1) * rr(rnd, 0.4, 0.7), tl = len * rr(rnd, 0.35, 0.5), mx = ex * 0.55, my = ey * 0.55;
        parts.push(P('line', null, mx, my, tw, 1, tl, a + 0.1, a + 0.4, { st: 'stemL', lw: 0.7, k0: 0.2 }));
        cluster(ex, ey, a + 0.25);
        cluster(mx + Math.sin(tw) * tl, my - Math.cos(tw) * tl, a + 0.3);
      }
      return { parts: parts, tilt: 1, front: false, petal: ['puff', 'gyp'] };
    },
    lily: function (r, hue, rnd) {
      var parts = [], dir = rnd() < 0.5 ? -1 : 1, AX = r * 1.9, AY = r * 1.1, n = 6;
      parts.push(P('hang', null, 0, 0, 0, dir * AX, AY, 0, 0.3, { st: 'stem', lw: 1.3, k0: 0.4 }));
      for (var j = 0; j < n; j++) {
        var u = 0.2 + j * 0.14, m = 1 - u, x = dir * (2 * m * u * 0.4 + u * u) * AX, y = (2 * m * u * -0.55 + u * u * -0.3) * AY;
        var sz = r * (0.4 - j * 0.035), pa = Math.PI + dir * 0.25, a = 0.15 + j * 0.1;
        var bx = x + Math.sin(pa) * sz * 0.7, by = y - Math.cos(pa) * sz * 0.7;
        parts.push(P('line', null, x, y, pa, 1, sz * 0.7, a, a + 0.3, { st: 'stem', lw: 0.8, k0: 0.3 }));
        if (j < n - 1) parts.push(P('bell', hue, bx, by, Math.PI + dir * 0.1, sz * 0.9, sz, a + 0.1, a + 0.5, { k0: 0.35, st: 'edgeW', lw: 0.5 }));
        else parts.push(P('disc', 'cCream', bx, by, 0, sz * 0.22, sz * 0.26, a + 0.1, a + 0.4, { k0: 0.4 }));
      }
      return { parts: parts, tilt: 1, front: false, petal: ['bell', hue] };
    }
  };
  var DEFAULT_HUE = { tulip: 'pink', freesia: 'yellow', ranunculus: 'coral', peony: 'blush', dahlia: 'coral', zinnia: 'pink', daisy: 'white', cosmos: 'blush', sunflower: 'yellow', chrysanthemum: 'yellow', anemone: 'white', poppy: 'coral', hydrangea: 'sky', gyp: 'white', lily: 'white' };

  function build(kind, opt) {
    opt = opt || {};
    var rnd = rng(opt.seed || 1), r = opt.r || 30, hue = opt.hue || DEFAULT_HUE[kind];
    var h = KINDS[kind](r, hue, rnd);
    h.kind = kind; h.r = r; h.hue = hue;
    if (opt.calyx && h.front) h.parts.unshift(P('calyx', 'calyx', 0, 0, rnd() * TAU, r * 0.36, r * 0.36, 0, 0.15, { k0: 0.6 }));
    return h;
  }

  /* ---------- rendering ---------- */
  var ST = { v: 0, k: 0, r: 0 };
  function partState(p, bloom) {
    var t = (bloom - p.a) / (p.b - p.a);
    if (t <= 0) { ST.v = 0; ST.k = p.k0; ST.r = p.r0; return ST; }
    if (t > 1) t = 1;
    var e = 1 - (1 - t) * (1 - t) * (1 - t);
    ST.v = t < 0.3 ? t / 0.3 : 1;
    ST.k = p.k0 + (1 - p.k0) * e;
    ST.r = p.r0 + (p.r - p.r0) * e;
    return ST;
  }

  var pathCache = {};
  function path2d(name) { return pathCache[name] || (pathCache[name] = new Path2D(str(SH[name]))); }
  function canvasFill(ctx, key) {
    var c = ctx.__flora || (ctx.__flora = {});
    if (c[key]) return c[key];
    var d = FILL[key];
    if (typeof d === 'string') return (c[key] = d);
    var g = d[0] === 'l' ? ctx.createLinearGradient(0, 0, 0, -1) : ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (var i = 0; i < d[1].length; i++) g.addColorStop(d[1][i][0], d[1][i][1]);
    return (c[key] = g);
  }
  // Draws a head around the current transform origin; the caller places and tilts it.
  function drawHead(ctx, head, bloom) {
    var parts = head.parts, base = ctx.globalAlpha;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      partState(p, bloom);
      if (!ST.v) continue;
      var sx = p.sx * ST.k, sy = p.sy * ST.k, pth = path2d(p.s);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ST.r);
      ctx.scale(sx, sy);
      ctx.globalAlpha = base * p.o * ST.v;
      if (p.f) { ctx.fillStyle = canvasFill(ctx, p.f); ctx.fill(pth); }
      if (p.st) { ctx.lineWidth = p.lw / Math.max(0.01, Math.sqrt(Math.abs(sx * sy))); ctx.strokeStyle = INK[p.st]; ctx.stroke(pth); }
      ctx.restore();
    }
  }
  function drawShape(ctx, name, fill) { ctx.fillStyle = canvasFill(ctx, fill); ctx.fill(path2d(name)); }

  function fillAttr(key) { var d = FILL[key]; return typeof d === 'string' ? d : 'url(#fl-f-' + key + ')'; }
  function attrs(p, bloom) {
    partState(p, bloom);
    var sx = p.sx * ST.k, sy = p.sy * ST.k;
    return {
      tf: 'translate(' + num(p.x) + ' ' + num(p.y) + ') rotate(' + num(ST.r * 57.29578) + ') scale(' + num(sx) + ' ' + num(sy) + ')',
      op: p.o * ST.v,
      lw: p.lw / Math.max(0.01, Math.sqrt(Math.abs(sx * sy)))
    };
  }
  function svgPart(p, bloom) {
    var a = attrs(p, bloom), s = '<use href="#fl-s-' + p.s + '" transform="' + a.tf + '" fill="' + (p.f ? fillAttr(p.f) : 'none') + '"';
    if (p.st) s += ' stroke="' + INK[p.st] + '" stroke-width="' + num(a.lw) + '"';
    if (a.op < 1) s += ' opacity="' + num(a.op) + '"';
    return s + '/>';
  }
  function svgHead(head, bloom) {
    var s = '';
    for (var i = 0; i < head.parts.length; i++) s += svgPart(head.parts[i], bloom == null ? 1 : bloom);
    return s;
  }
  // Puts a head into an SVG <g> and returns a setter that re-blooms it in place.
  function mount(g, head, bloom) {
    g.innerHTML = svgHead(head, bloom == null ? 1 : bloom);
    var els = g.children, parts = head.parts;
    return function set(b) {
      for (var i = 0; i < parts.length; i++) {
        var a = attrs(parts[i], b), el = els[i];
        el.setAttribute('transform', a.tf);
        el.setAttribute('opacity', num(a.op));
        if (parts[i].st) el.setAttribute('stroke-width', num(a.lw));
      }
    };
  }
  function defs() {
    var s = '', k, f;
    for (k in SH) s += '<path id="fl-s-' + k + '" d="' + str(SH[k]) + '"/>';
    for (f in FILL) {
      var d = FILL[f];
      if (typeof d === 'string') continue;
      s += d[0] === 'l' ? '<linearGradient id="fl-f-' + f + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-1">'
        : '<radialGradient id="fl-f-' + f + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">';
      for (var i = 0; i < d[1].length; i++) s += '<stop offset="' + d[1][i][0] + '" stop-color="' + d[1][i][1] + '"/>';
      s += d[0] === 'l' ? '</linearGradient>' : '</radialGradient>';
    }
    return '<defs>' + s + '</defs>';
  }

  /* ---------- stems and the garden plan ---------- */
  function qpt(b, c, t, u, out) {
    var m = 1 - u;
    out[0] = m * m * b[0] + 2 * m * u * c[0] + u * u * t[0];
    out[1] = m * m * b[1] + 2 * m * u * c[1] + u * u * t[1];
    return out;
  }
  function qang(b, c, t, u) {
    var dx = 2 * (1 - u) * (c[0] - b[0]) + 2 * u * (t[0] - c[0]), dy = 2 * (1 - u) * (c[1] - b[1]) + 2 * u * (t[1] - c[1]);
    return Math.atan2(dx, -dy);
  }
  // Tapered stem outline as an SVG path (used for the static fallback and the small SVG flowers).
  function stemPath(b, c, t, w0, w1, upto) {
    var N = 12, L = [], R = [], p = [0, 0], s = upto == null ? 1 : upto;
    for (var i = 0; i <= N; i++) {
      var u = s * i / N, a = qang(b, c, t, u), w = (w0 + (w1 - w0) * u) / 2;
      qpt(b, c, t, u, p);
      L.push([p[0] - Math.cos(a) * w, p[1] - Math.sin(a) * w]);
      R.push([p[0] + Math.cos(a) * w, p[1] + Math.sin(a) * w]);
    }
    var d = 'M' + num(L[0][0]) + ' ' + num(L[0][1]);
    for (i = 1; i <= N; i++) d += 'L' + num(L[i][0]) + ' ' + num(L[i][1]);
    for (i = N; i >= 0; i--) d += 'L' + num(R[i][0]) + ' ' + num(R[i][1]);
    return d + 'Z';
  }

  var GARDEN = ['tulip', 'freesia', 'ranunculus', 'daisy', 'poppy'];
  var HUES = { tulip: ['pink', 'pink', 'coral', 'yellow', 'white'], freesia: ['yellow', 'yellow', 'white', 'coral'], ranunculus: ['coral', 'pink', 'cream', 'coral', 'yellow'], daisy: ['white'], poppy: ['coral', 'pink', 'yellow', 'white', 'coral'] };
  var HEADK = { tulip: 0.9, freesia: 0.72, ranunculus: 1, daisy: 0.92, poppy: 1.12, gyp: 1.1 };
  function leavesFor(kind, r) {
    var L = [], side = r() < 0.5 ? -1 : 1, i, n;
    if (kind === 'tulip') {
      for (i = 0; i < 2; i++) { L.push({ t: rr(r, 0.02, 0.09), side: side, len: rr(r, 0.32, 0.46), ang: rr(r, 0.16, 0.3), s: 'leafBroad', w: 1 }); side = -side; }
    } else if (kind === 'freesia') {
      for (i = 0; i < 2; i++) { L.push({ t: rr(r, 0, 0.05), side: side, len: rr(r, 0.38, 0.58), ang: rr(r, 0.08, 0.22), s: 'blade', w: 1.2 }); side = -side; }
    } else if (kind === 'gyp') {
      L.push({ t: rr(r, 0.3, 0.5), side: side, len: rr(r, 0.12, 0.18), ang: rr(r, 0.5, 0.8), s: 'blade', w: 1.4 });
    } else {
      n = kind === 'daisy' ? 3 : kind === 'poppy' ? 2 : 1 + (r() < 0.5 ? 1 : 0);
      for (i = 0; i < n; i++) {
        L.push({ t: kind === 'poppy' ? rr(r, 0.04, 0.22) : rr(r, 0.14, 0.52), side: side, len: kind === 'poppy' ? rr(r, 0.14, 0.22) : rr(r, 0.1, 0.17), ang: rr(r, 0.45, 0.8), s: 'leaf', w: kind === 'daisy' ? 0.7 : 1 });
        side = -side;
      }
    }
    return L;
  }
  function plant(kind, r, o) {
    var hues = HUES[kind] || ['white'];
    return {
      kind: kind, hue: o.hue || hues[(r() * hues.length) | 0], fx: o.fx, fh: o.fh, z: o.z,
      lean: o.lean != null ? o.lean : rr(r, -0.1, 0.1), curve: rr(r, -0.1, 0.1),
      nod: kind === 'poppy' ? rr(r, 0.15, 0.45) * (r() < 0.5 ? -1 : 1) : kind === 'tulip' || kind === 'freesia' || kind === 'gyp' ? rr(r, -0.06, 0.06) : rr(r, -0.35, 0.35),
      tilt: kind === 'daisy' ? rr(r, 0.42, 0.8) : kind === 'poppy' ? rr(r, 0.55, 0.78) : kind === 'ranunculus' ? rr(r, 0.72, 0.9) : 1,
      size: (HEADK[kind] || 1) * rr(r, 0.88, 1.12) * (0.82 + 0.32 * o.z),
      w0: kind === 'poppy' || kind === 'freesia' || kind === 'gyp' ? rr(r, 1.8, 2.3) : rr(r, 2.4, 3.2),
      w1: kind === 'gyp' ? 1 : rr(r, 1.3, 1.8),
      phase: r() * TAU, seed: (r() * 1e9) | 0, leaves: leavesFor(kind, r)
    };
  }
  // A composition that looks good for any seed: stratified x, a valley in the middle so the
  // headline stays clear on wide screens, and all five garden kinds present.
  function gardenPlan(seed, count, valley) {
    var r = rng(seed), kinds = [], list = [], i;
    while (kinds.length < count) kinds = kinds.concat(shuffle(GARDEN.slice(), r));
    kinds.length = count;
    shuffle(kinds, r);
    for (i = 0; i < count; i++) {
      var fx = (i + 0.5 + rr(r, -0.36, 0.36)) / count, z = r(), d = Math.min(1, Math.abs(fx - 0.5) * 2.4);
      var env = valley ? 0.5 + 0.5 * d : 0.78 + 0.22 * d;
      var fh = env * rr(r, 0.66, 1) * (0.84 + 0.16 * z);
      list.push(plant(kinds[i], r, { fx: fx, fh: fh, z: z, lean: (fx - 0.5) * rr(r, 0.05, 0.22) + rr(r, -0.05, 0.05) }));
    }
    var fill = Math.max(2, Math.round(count / 3.5));
    for (i = 0; i < fill; i++) list.push(plant('gyp', r, { fx: (i + 0.5 + rr(r, -0.4, 0.4)) / fill, fh: rr(r, 0.22, 0.42), z: rr(r, 0.1, 0.6), hue: 'white' }));
    list.sort(function (a, b) { return a.z - b.z; });
    var idx = shuffle(list.map(function (f, j) { return j; }).filter(function (j) { return list[j].kind !== 'gyp'; }), r);
    for (i = 0; i < Math.min(5, idx.length); i++) list[idx[i]].early = true;
    return list;
  }

  root.Flora = {
    rng: rng, rr: rr, shuffle: shuffle, num: num, TAU: TAU, GOLD: GOLD,
    SH: SH, FILL: FILL, INK: INK, str: str,
    build: build, drawHead: drawHead, drawShape: drawShape, path2d: path2d, canvasFill: canvasFill,
    svgHead: svgHead, mount: mount, defs: defs,
    qpt: qpt, qang: qang, stemPath: stemPath, gardenPlan: gardenPlan, plant: plant, GARDEN: GARDEN, HUES: HUES
  };
})(typeof window !== 'undefined' ? window : globalThis);
