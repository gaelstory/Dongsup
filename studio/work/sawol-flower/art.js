/* Page compositions built from Flora: bouquet, vases, specimens, calendar cells, the garden.
   Pure functions that return SVG markup, so the same art is pre-rendered into the HTML (no-JS)
   and rebuilt live in the browser. Each returns { svg, heads } so heads can re-bloom in place. */
(function (root) {
  'use strict';
  var F = root.Flora, n = F.num, TAU = F.TAU;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // One head inside nested groups: placement, optional mirror, tilt, and the bloomable parts.
  function headGroup(head, x, y, rot, flip, tilt, idx) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(rot * 57.29578) + ')' + (flip ? ' scale(-1 1)' : '') + '">' +
      '<g transform="scale(1 ' + n(tilt) + ')"><g data-h="' + idx + '">' + F.svgHead(head, 1) + '</g></g></g>';
  }
  function leafUse(x, y, rot, len, w, fill, flip, shape) {
    return '<use href="#fl-s-' + (shape || 'leaf') + '" fill="url(#fl-f-' + fill + ')" transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(rot * 57.29578) + ') scale(' + n(len * w * (flip ? -1 : 1)) + ' ' + n(len) + ')"/>' +
      '<use href="#fl-s-midrib" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="' + n(0.8 / len) + '" transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(rot * 57.29578) + ') scale(' + n(len * w * (flip ? -1 : 1)) + ' ' + n(len) + ')"/>';
  }
  function stem(b, c, t, w0, w1, fill) { return '<path d="' + F.stemPath(b, c, t, w0, w1) + '" fill="' + (fill || '#1F5C3A') + '"/>'; }

  /* ---------- bouquet on the workbench ---------- */
  var MOOD = {
    bright: { name: '화사한', paper: ['#FFD3DF', '#FFE6ED', '#FFC0D1', '#F7A9BE'], ribbon: ['#FF5A87', '#D63A68'], leaves: 6, leaf: 'leaf',
      hues: { tulip: 'pink', freesia: 'yellow', ranunculus: 'coral', daisy: 'white', poppy: 'coral', gyp: 'white' } },
    calm: { name: '차분한', paper: ['#D7C6B4', '#E8DCCE', '#CAB59F', '#B9A189'], ribbon: ['#FFFFFF', '#E3D9CE'], leaves: 7, leaf: 'leaf',
      hues: { tulip: 'white', freesia: 'white', ranunculus: 'cream', daisy: 'white', poppy: 'white', gyp: 'white' } },
    fresh: { name: '싱그러운', paper: ['#CFE1FF', '#E7F1FF', '#B7D1FA', '#9DBDF0'], ribbon: ['#1F5C3A', '#154329'], leaves: 12, leaf: 'leafL',
      hues: { tulip: 'yellow', freesia: 'yellow', ranunculus: 'yellow', daisy: 'white', poppy: 'yellow', gyp: 'white' } }
  };
  var SIZE = { S: { n: 9, rx: 112, r: 39 }, M: { n: 14, rx: 140, r: 42 }, L: { n: 20, rx: 166, r: 44 } };
  var KMUL = { tulip: 0.98, freesia: 1.1, ranunculus: 1.05, daisy: 0.95, poppy: 1.06, gyp: 1.5 };
  var EDGE = { freesia: 1, gyp: 1 };

  function bouquet(state, uid) {
    var u = uid || '';
    var m = MOOD[state.mood], sz = SIZE[state.size], kinds = state.kinds.slice(0, 3);
    var r = F.rng(hash(state.mood + state.size + kinds.join('')));
    var neck = [280, 474], s = sz.rx / 128;
    function P(x, y) { return n(neck[0] + (x - neck[0]) * s) + ' ' + n(neck[1] + (y - neck[1]) * s); }
    var D = [neck[0], neck[1] + (262 - neck[1]) * s], rx = sz.rx * 1.06, ry = sz.rx * 0.86, N = sz.n, i;

    // how many of each kind; edge-loving kinds (freesia, baby's breath) go to the rim
    var counts = {}, K = kinds.length, c1 = K === 1 ? N : K === 2 ? Math.round(N * 0.58) : Math.round(N * 0.42), c2 = K === 2 ? N - c1 : Math.round(N * 0.33);
    kinds.forEach(function (k, j) { counts[k] = j === 0 ? c1 : j === 1 ? c2 : N - c1 - c2; });
    if (!K) N = 0;
    var slots = [], off = r() * TAU;
    for (i = 0; i < N; i++) {
      var rho = Math.sqrt((i + 0.5) / N), th = i * F.GOLD + off;
      var x = D[0] + rho * rx * 0.84 * Math.cos(th), y = D[1] + rho * ry * 0.84 * Math.sin(th) - (1 - rho * rho) * ry * 0.22;
      slots.push({ x: x, y: y, rho: rho });
    }
    if (kinds.indexOf('gyp') >= 0) {
      for (i = 0; i < 3; i++) { var a = -1.25 + i * 1.25 + (r() - 0.5) * 0.4; slots.push({ x: D[0] + Math.sin(a) * rx * 0.98, y: D[1] - Math.cos(a) * ry * 0.95, rho: 1.05 }); }
      counts.gyp += 3;
    }
    var pool = [];
    kinds.forEach(function (k) { for (var j = 0; j < counts[k]; j++) pool.push(k); });
    var edgeK = pool.filter(function (k) { return EDGE[k]; }), restK = F.shuffle(pool.filter(function (k) { return !EDGE[k]; }), r);
    var byRho = slots.slice().sort(function (a, b) { return b.rho - a.rho; });
    var placed = [];
    byRho.forEach(function (sl, j) { placed.push({ sl: sl, k: j < edgeK.length ? edgeK[j] : restK[j - edgeK.length] }); });

    var heads = [], hs = [];
    placed.forEach(function (p) {
      var k = p.k, sl = p.sl, hr = sz.r * KMUL[k] * F.rr(r, 0.92, 1.08) * (1.06 - 0.16 * Math.min(1, sl.rho));
      var head = F.build(k, { r: hr, hue: m.hues[k], seed: (r() * 1e9) | 0 });
      var out = Math.atan2(sl.x - D[0], -(sl.y - D[1] + ry * 0.7)), rot, flip = false, tilt = 1;
      if (k === 'freesia') { rot = out * 0.7; flip = head.dir !== (sl.x < D[0] ? -1 : 1); }
      else if (k === 'gyp') rot = out * 0.85;
      else if (k === 'tulip') rot = (sl.x - D[0]) / rx * 0.55 + F.rr(r, -0.1, 0.1);
      else { rot = (sl.x - D[0]) / rx * 0.35 + F.rr(r, -0.2, 0.2); tilt = F.rr(r, 0.86, 1); }
      hs.push({ head: head, x: sl.x, y: sl.y + (k === 'tulip' ? hr * 0.5 : 0), rot: rot, flip: flip, tilt: tilt, back: !!EDGE[k] });
    });
    hs.sort(function (a, b) { return (a.back === b.back) ? a.y - b.y : (a.back ? -1 : 1); });

    var svg = '<defs><linearGradient id="bq-back' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + m.paper[1] + '"/><stop offset="1" stop-color="' + m.paper[3] + '"/></linearGradient>' +
      '<linearGradient id="bq-fl' + u + '" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="' + m.paper[3] + '"/><stop offset="0.55" stop-color="' + m.paper[0] + '"/><stop offset="1" stop-color="' + m.paper[1] + '"/></linearGradient>' +
      '<linearGradient id="bq-fr' + u + '" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + m.paper[3] + '"/><stop offset="0.6" stop-color="' + m.paper[2] + '"/><stop offset="1" stop-color="' + m.paper[0] + '"/></linearGradient></defs>';
    svg += '<ellipse cx="282" cy="606" rx="' + n(150 * s) + '" ry="13" fill="rgba(8,32,18,0.38)"/>';
    svg += '<g class="bq">';
    for (i = 0; i < 7; i++) {
      var x0 = 271 + i * 3, x1 = 256 + i * 7.6 + (r() - 0.5) * 4, y1 = 588 + (r() - 0.5) * 14;
      svg += '<path d="M' + n(x0) + ' 470 L' + n(x1) + ' ' + n(y1) + '" stroke="' + (i % 2 ? '#2D7048' : '#24603D') + '" stroke-width="4.2" stroke-linecap="round" fill="none"/>' +
        '<path d="M' + n(x1 - 2) + ' ' + n(y1 + 1) + ' L' + n(x1 + 2) + ' ' + n(y1 - 1) + '" stroke="#A9C98F" stroke-width="2" stroke-linecap="round"/>';
    }
    svg += '<path d="M' + P(268, 494) + ' L' + P(104, 262) + ' Q' + P(98, 214) + ' ' + P(152, 196) + ' Q' + P(210, 152) + ' ' + P(280, 166) + ' Q' + P(350, 152) + ' ' + P(408, 196) +
      ' Q' + P(462, 214) + ' ' + P(456, 262) + ' L' + P(292, 494) + ' Z" fill="url(#bq-back' + u + ')"/>';
    svg += '<path d="M' + P(280, 488) + ' L' + P(152, 196) + ' M' + P(280, 488) + ' L' + P(408, 196) + '" stroke="rgba(255,255,255,0.45)" stroke-width="1.4" fill="none"/>';
    var nl = m.leaves;
    for (i = 0; i < nl; i++) {
      var la = -2.15 + 4.3 * (i + 0.5) / nl + (r() - 0.5) * 0.3, len = F.rr(r, 58, 88) * Math.sqrt(s);
      svg += leafUse(D[0] + Math.sin(la) * rx * 0.8, D[1] - Math.cos(la) * ry * 0.82, la, len, 1, i % 3 === 2 ? 'leafL' : m.leaf, i % 2);
    }
    // greenery tucked between the heads so gaps read as foliage, not paper
    if (N) for (i = 0; i < Math.round(N * 0.9); i++) {
      var fr = Math.sqrt(F.rr(r, 0.1, 0.85)), fa = r() * TAU, fl = F.rr(r, 34, 56);
      svg += leafUse(D[0] + Math.cos(fa) * rx * 0.8 * fr, D[1] + Math.sin(fa) * ry * 0.8 * fr + 20, fa + Math.PI / 2 + F.rr(r, -0.6, 0.6), fl, 1.15, i % 2 ? m.leaf : 'leafL', i % 2);
    }
    hs.forEach(function (h, j) { svg += headGroup(h.head, h.x, h.y, h.rot, h.flip, h.tilt, j); heads.push(h.head); });
    svg += '<path d="M' + P(296, 506) + ' L' + P(104, 342) + ' Q' + P(192, 376) + ' ' + P(308, 388) + ' Z" fill="url(#bq-fl' + u + ')"/>';
    svg += '<path d="M' + P(264, 506) + ' L' + P(456, 342) + ' Q' + P(368, 376) + ' ' + P(252, 388) + ' Z" fill="url(#bq-fr' + u + ')"/>';
    svg += '<path d="M' + P(104, 342) + ' Q' + P(192, 376) + ' ' + P(308, 388) + ' M' + P(456, 342) + ' Q' + P(368, 376) + ' ' + P(252, 388) + '" stroke="rgba(255,255,255,0.6)" stroke-width="1.6" fill="none"/>';
    var rb = m.ribbon;
    svg += '<g transform="translate(280 480)">' +
      '<path d="M-6 6 C-16 40 -28 70 -46 96 L-32 100 C-18 76 -6 48 4 8 Z" fill="' + rb[1] + '"/>' +
      '<path d="M6 6 C20 38 34 66 54 90 L42 98 C24 74 12 48 -2 8 Z" fill="' + rb[0] + '"/>' +
      '<path d="M0 0 C-30 -34 -66 -26 -62 0 C-58 24 -26 18 0 0 Z" fill="' + rb[0] + '"/>' +
      '<path d="M0 0 C30 -34 66 -26 62 0 C58 24 26 18 0 0 Z" fill="' + rb[1] + '"/>' +
      '<path d="M-4 -2 C-22 -18 -44 -16 -46 -2" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/>' +
      '<rect x="-11" y="-10" width="22" height="20" rx="7" fill="' + rb[0] + '" stroke="' + rb[1] + '" stroke-width="1.5"/></g>';
    svg += '</g>';
    var names = kinds.map(function (k) { return KNAME[k]; });
    return { svg: svg, heads: heads, label: m.name + ' ' + state.size + ' 꽃다발: ' + names.join(', ') };
  }
  var KNAME = { tulip: '튤립', freesia: '프리지아', ranunculus: '라넌큘러스', daisy: '데이지', poppy: '양귀비', gyp: '안개꽃' };

  /* ---------- vases on the subscription table ---------- */
  function vase(kind) {
    var r = F.rng(kind === 'jar' ? 3301 : 7717), heads = [], svg = '', i;
    var set = kind === 'jar'
      ? { c: [120, 148], rx: 64, ry: 40, list: [['chrysanthemum', 'yellow', 33], ['gyp', 'white', 40], ['ranunculus', 'cream', 34], ['chrysanthemum', 'white', 30], ['gyp', 'white', 36], ['ranunculus', 'cream', 29]], neck: [96, 144], base: 286 }
      : { c: [120, 98], rx: 92, ry: 58, list: [['chrysanthemum', 'white', 33], ['ranunculus', 'coral', 35], ['gyp', 'white', 42], ['anemone', 'white', 32], ['chrysanthemum', 'yellow', 30], ['gyp', 'white', 38], ['ranunculus', 'coral', 31], ['chrysanthemum', 'white', 29], ['anemone', 'blush', 30], ['gyp', 'white', 36], ['chrysanthemum', 'yellow', 28], ['ranunculus', 'cream', 30]], neck: [92, 148], base: 286 };
    var N = set.list.length, pos = [];
    svg += '<ellipse cx="120" cy="288" rx="' + (kind === 'jar' ? 58 : 66) + '" ry="7" fill="rgba(59,42,32,0.12)"/>';
    for (i = 0; i < N; i++) {
      var rho = Math.sqrt((i + 0.5) / N), th = i * F.GOLD + 0.6;
      pos.push([set.c[0] + rho * set.rx * Math.cos(th), set.c[1] + rho * set.ry * Math.sin(th) - (1 - rho * rho) * set.ry * 0.4, rho]);
    }
    for (i = 0; i < N; i++) {
      var p = pos[i];
      svg += '<path d="M' + n(p[0]) + ' ' + n(p[1]) + ' Q' + n(120 + (p[0] - 120) * 0.5) + ' ' + n((p[1] + 240) / 2) + ' ' + n(120 + (p[0] - 120) * 0.2) + ' 280" stroke="#2A6A43" stroke-width="2.2" fill="none" opacity="0.85"/>';
    }
    if (kind === 'jar') {
      svg += '<path d="M84 196 Q78 200 78 214 L78 274 Q78 286 92 286 L148 286 Q162 286 162 274 L162 214 Q162 200 156 196 Z" fill="rgba(221,235,255,0.62)" stroke="rgba(31,92,58,0.28)" stroke-width="1.5"/>' +
        '<path d="M80 236 L160 236 L160 274 Q160 284 148 284 L92 284 Q80 284 80 274 Z" fill="rgba(140,180,240,0.28)"/>' +
        '<path d="M88 206 Q85 240 88 272" stroke="rgba(255,255,255,0.8)" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<rect x="80" y="190" width="80" height="9" rx="4.5" fill="rgba(221,235,255,0.85)" stroke="rgba(31,92,58,0.28)" stroke-width="1.5"/>';
    } else {
      svg += '<path d="M96 148 Q66 170 68 216 Q70 262 98 286 L142 286 Q170 262 172 216 Q174 170 144 148 Z" fill="rgba(221,235,255,0.62)" stroke="rgba(31,92,58,0.28)" stroke-width="1.5"/>' +
        '<path d="M70 226 Q71 262 98 284 L142 284 Q169 262 170 226 Z" fill="rgba(140,180,240,0.28)"/>' +
        '<path d="M82 176 Q72 212 82 256" stroke="rgba(255,255,255,0.8)" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<rect x="90" y="142" width="60" height="9" rx="4.5" fill="rgba(221,235,255,0.85)" stroke="rgba(31,92,58,0.28)" stroke-width="1.5"/>';
    }
    var order = pos.map(function (p, j) { return j; }).sort(function (a, b) { return pos[a][1] - pos[b][1]; });
    order.forEach(function (j) {
      var it = set.list[j], p = pos[j], head = F.build(it[0], { r: it[2], hue: it[1], seed: (r() * 1e9) | 0 });
      var rot = (p[0] - 120) / set.rx * 0.5 + F.rr(r, -0.15, 0.15);
      svg += headGroup(head, p[0], p[1], rot, false, head.front ? F.rr(r, 0.82, 0.95) : 1, heads.length);
      heads.push(head);
    });
    return { svg: svg, heads: heads };
  }

  /* ---------- today's flowers ---------- */
  var SPEC = {
    tulip: { hue: 'pink', r: 52, tip: [100, 132] }, freesia: { hue: 'yellow', r: 54, tip: [54, 150], dir: 1 },
    ranunculus: { hue: 'coral', r: 52, tip: [100, 104] }, daisy: { hue: 'white', r: 54, tip: [100, 104] },
    poppy: { hue: 'coral', r: 52, tip: [100, 104] }, gyp: { hue: 'white', r: 84, tip: [100, 160] }
  };
  function specimen(kind) {
    var sp = SPEC[kind], head = F.build(kind, { r: sp.r, hue: sp.hue, seed: hash(kind) % 100000 + 11 });
    var t = sp.tip, svg = '<circle cx="100" cy="104" r="78" fill="#EAF2FF"/>';
    svg += stem([100, 252], [t[0] + (100 - t[0]) * 0.2 - 6, (252 + t[1]) / 2], t, kind === 'gyp' ? 2.2 : 3.4, kind === 'gyp' ? 1.2 : 2.2);
    svg += kind === 'tulip' ? leafUse(99, 232, -0.32, 78, 0.8, 'leaf', 1, 'leafBroad') : leafUse(99, 214, -0.75, 34, 1, 'leaf', 1);
    svg += headGroup(head, t[0], t[1], 0, sp.dir ? head.dir !== sp.dir : false, head.front ? 0.92 : 1, 0);
    return { svg: svg, heads: [head] };
  }
  function icon(kind) {
    var sp = SPEC[kind], k = kind === 'gyp' ? 0.46 : kind === 'freesia' ? 0.4 : 0.36, head = F.build(kind, { r: sp.r * k, hue: sp.hue, seed: hash(kind) % 100000 + 11 });
    var pos = { tulip: [0, 13], freesia: [-14, 13], gyp: [0, 15] }[kind] || [0, 0];
    return { svg: headGroup(head, pos[0], pos[1], 0, kind === 'freesia' ? head.dir !== 1 : false, head.front ? 0.92 : 1, 0), heads: [head] };
  }

  /* ---------- seasonal calendar ---------- */
  var MONTHS = [
    [['ranunculus', 'coral'], ['anemone', 'white']], [['freesia', 'yellow'], ['tulip', 'pink']], [['tulip', 'coral'], ['freesia', 'white'], ['ranunculus', 'pink']],
    [['tulip', 'pink'], ['poppy', 'coral']], [['peony', 'blush'], ['lily', 'white']], [['hydrangea', 'sky'], ['daisy', 'white']],
    [['sunflower', 'yellow'], ['hydrangea', 'sky']], [['sunflower', 'yellow'], ['zinnia', 'pink']], [['dahlia', 'coral'], ['cosmos', 'blush']],
    [['cosmos', 'white'], ['chrysanthemum', 'yellow']], [['chrysanthemum', 'yellow'], ['gyp', 'white']], [['gyp', 'white'], ['anemone', 'blush']]
  ];
  var RACEME = { freesia: 1, lily: 1 };
  function month(mi) {
    var list = MONTHS[mi], r = F.rng(500 + mi * 31), svg = '', heads = [];
    var spots = list.length === 2 ? [[30, 44, 21], [62, 64, 18]] : [[21, 60, 16], [46, 38, 18], [71, 64, 16]];
    list.forEach(function (it, j) {
      var sp = spots[j], kind = it[0], hr = sp[2] * (kind === 'gyp' ? 1.3 : RACEME[kind] ? 0.9 : kind === 'tulip' ? 0.95 : 1);
      var head = F.build(kind, { r: hr, hue: it[1], seed: (r() * 1e9) | 0 });
      var tx = sp[0], ty = sp[1] + (kind === 'tulip' ? hr * 0.9 : kind === 'gyp' ? hr * 0.7 : RACEME[kind] ? hr * 0.9 : 0);
      if (RACEME[kind]) tx = sp[0] < 45 ? sp[0] - 12 : sp[0] - 6;
      var bx = 30 + j * 26 + (r() - 0.5) * 6;
      svg += stem([bx, 112], [(bx + tx) / 2 + (r() - 0.5) * 6, (112 + ty) / 2], [tx, ty], 2, 1.2);
      if (r() < 0.7) svg += leafUse(bx + (tx - bx) * 0.25, 112 - (112 - ty) * 0.25, (j % 2 ? 0.7 : -0.7), 16, 0.9, 'leaf', j % 2);
      svg += headGroup(head, tx, ty, (tx - 45) / 45 * 0.25, RACEME[kind] ? head.dir !== 1 : false, head.front ? 0.9 : 1, j);
      heads.push(head);
    });
    return { svg: svg, heads: heads };
  }

  /* ---------- garden geometry, shared by the canvas and the static fallback ---------- */
  // Fills g with base, control and tip for a stem given its current total bend angle.
  function stemGeom(f, x, groundY, h, swing, g) {
    var a = f.lean + swing, b = f.lean + swing * 0.35;
    g.b[0] = x; g.b[1] = groundY;
    g.t[0] = x + Math.sin(a) * h; g.t[1] = groundY - Math.cos(a) * h;
    g.c[0] = x + Math.sin(b) * h * 0.55 + Math.cos(b) * f.curve * h; g.c[1] = groundY - Math.cos(b) * h * 0.55 + Math.sin(b) * f.curve * h;
    return g;
  }
  function headSize(f, unit) { return unit * f.size; }
  function gardenSVG(plan, W, H, groundY, band, unit) {
    var svg = '', g = { b: [0, 0], c: [0, 0], t: [0, 0] }, p = [0, 0];
    plan.forEach(function (f) {
      var x = f.fx * W, h = f.fh * band, gy = groundY - f.z * 10;
      stemGeom(f, x, gy, h, 0, g);
      var hr = headSize(f, unit), head = F.build(f.kind, { r: hr, hue: f.hue, seed: f.seed, calyx: true });
      svg += stem(g.b, g.c, g.t, f.w0, f.w1);
      f.leaves.forEach(function (l) {
        F.qpt(g.b, g.c, g.t, l.t, p);
        var ang = F.qang(g.b, g.c, g.t, l.t) + l.side * l.ang, len = Math.max(14, Math.min(120, l.len * h));
        svg += '<use href="#fl-s-' + l.s + '" fill="url(#fl-f-leaf)" transform="translate(' + n(p[0]) + ' ' + n(p[1]) + ') rotate(' + n(ang * 57.29578) + ') scale(' + n(len * l.w * l.side) + ' ' + n(len) + ')"/>';
      });
      var ta = F.qang(g.b, g.c, g.t, 1) + f.nod;
      svg += '<g transform="translate(' + n(g.t[0]) + ' ' + n(g.t[1]) + ') rotate(' + n(ta * 57.29578) + ') scale(1 ' + n(head.front ? f.tilt : 1) + ')">' + F.svgHead(head, 1) + '</g>';
    });
    return svg;
  }

  /* ---------- the little meadow growing out of the footer soil ---------- */
  function meadow(W, H) {
    var r = F.rng(2604), svg = '', cnt = Math.round(W / 46), kinds = [['daisy', 'white'], ['gyp', 'white'], ['ranunculus', 'cream'], ['daisy', 'white'], ['tulip', 'pink'], ['poppy', 'coral'], ['gyp', 'white'], ['freesia', 'yellow']], d = '';
    for (var g = 0; g < W / 3; g++) {
      var gx = r() * W, gh = F.rr(r, 8, 26), ga = F.rr(r, -0.4, 0.4), gw = F.rr(r, 1, 2.2);
      d += 'M' + n(gx - gw) + ' ' + H + 'Q' + n(gx) + ' ' + n(H - gh * 0.6) + ' ' + n(gx + Math.sin(ga) * gh) + ' ' + n(H - Math.cos(ga) * gh) + 'Q' + n(gx) + ' ' + n(H - gh * 0.6) + ' ' + n(gx + gw) + ' ' + H + 'Z';
    }
    for (var i = 0; i < cnt; i++) {
      var x = (i + 0.5 + F.rr(r, -0.4, 0.4)) / cnt * W, h = F.rr(r, 26, H - 26), it = kinds[(r() * kinds.length) | 0];
      var head = F.build(it[0], { r: F.rr(r, 9, 14) * (it[0] === 'gyp' ? 1.4 : 1), hue: it[1], seed: (r() * 1e9) | 0 }), lean = F.rr(r, -0.12, 0.12);
      var tx = x + Math.sin(lean) * h, ty = H - Math.cos(lean) * h;
      svg += stem([x, H], [x + Math.sin(lean) * h * 0.3, H - h * 0.5], [tx, ty], 1.8, 1.1, '#2E6E46');
      svg += headGroup(head, tx, ty, lean + F.rr(r, -0.25, 0.25), false, head.front ? F.rr(r, 0.6, 0.9) : 1, i);
    }
    return { svg: svg + '<path d="' + d + '" fill="#2E6E46"/>' };
  }

  root.SawolArt = { meadow: meadow, MOOD: MOOD, SIZE: SIZE, KNAME: KNAME, MONTHS: MONTHS, bouquet: bouquet, vase: vase, specimen: specimen, icon: icon, month: month, stemGeom: stemGeom, gardenSVG: gardenSVG, hash: hash };
})(typeof window !== 'undefined' ? window : globalThis);
