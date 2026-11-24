/* 숲멍 스테이: the page scroll is one day, 06:00 to 23:00. */
(function () {
  'use strict';
  var root = document.documentElement;
  var isShot = /[?&]shot=1/.test(location.search);
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------- palette keyframes (06:00, 12:00, 18:30, 20:00, 23:00) ---------------- */
  var KEYS = ['skyTop', 'skyMid', 'skyLow', 'skyHor', 'hazeT', 'hazeB', 'farT', 'farB', 'midT', 'midB', 'nearT', 'nearB',
    'treeB', 'treeF', 'ground', 'roof', 'face', 'glass', 'sun', 'sunGlow', 'horizon'];
  var KF = [
    { h: 6, c: ['#9FB4B8', '#C4D2D0', '#DCE4E0', '#F0DCC8', '#C3CFCB', '#D6DFDB', '#A3B6AF', '#C2CFCA', '#7F978E', '#A5B6AF', '#5A7A6E', '#6E897F',
      '#4D6B60', '#2E4B41', '#1B3A32', '#2A3D37', '#6F6052', '#3A4D4A', '#FFF3E0', '#F7D9B4', '#F6CFA8'], glowA: 0.85, horA: 0.6 },
    { h: 12, c: ['#5E97B4', '#93BDCE', '#C8DEE2', '#E2EEEA', '#A8C2C5', '#BDD2D2', '#84A7A1', '#A6C0BC', '#5D8977', '#7EA18F', '#43705B', '#58836E',
      '#39604F', '#224337', '#1B3A32', '#263A33', '#8A735B', '#8DB3BE', '#FFFBF0', '#FFF5D6', '#FFFFFF'], glowA: 0.55, horA: 0.25 },
    { h: 18.5, c: ['#33456A', '#8C6E8C', '#E2926A', '#F3C46B', '#A27B88', '#C8917E', '#7A6378', '#9D797D', '#53475D', '#6D5967', '#373544', '#494251',
      '#2D2C3A', '#1E1F28', '#16171E', '#1C1D26', '#4A3A34', '#3A3540', '#FFC27A', '#F7A25E', '#F3A15F'], glowA: 0.8, horA: 0.85 },
    { h: 20, c: ['#15213C', '#253659', '#4D5777', '#9A7486', '#3D4765', '#4D5775', '#2E3954', '#3A4461', '#212B42', '#2A344F', '#172032', '#1D273A',
      '#131B2B', '#0D131F', '#0A101A', '#0E141F', '#29262F', '#222634', '#FF9F5A', '#E07A50', '#B5707A'], glowA: 0, horA: 0.4 },
    { h: 23, c: ['#0D1828', '#112038', '#192C47', '#233957', '#1C2A43', '#21314C', '#17243A', '#1C2A42', '#121D30', '#162237', '#0E1727', '#111B2D',
      '#0C1422', '#080F1A', '#060C15', '#090F19', '#1E1D25', '#1A1E2A', '#FF9F5A', '#E07A50', '#2E4A6E'], glowA: 0, horA: 0.3 }
  ];
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  KF.forEach(function (k) { k.rgb = k.c.map(hexRgb); });
  var LAMP = hexRgb('#F3C46B');
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  // the palette at an hour, written into a reused object (no per-frame allocation of arrays)
  var pal = { rgb: KEYS.map(function () { return [0, 0, 0]; }), glowA: 0, horA: 0 };
  function palette(h) {
    var i = 0;
    while (i < KF.length - 2 && h > KF[i + 1].h) i++;
    var a = KF[i], b = KF[i + 1], t = clamp((h - a.h) / (b.h - a.h), 0, 1);
    for (var k = 0; k < KEYS.length; k++) {
      var x = a.rgb[k], y = b.rgb[k], o = pal.rgb[k];
      o[0] = x[0] + (y[0] - x[0]) * t; o[1] = x[1] + (y[1] - x[1]) * t; o[2] = x[2] + (y[2] - x[2]) * t;
    }
    pal.glowA = lerp(a.glowA, b.glowA, t);
    pal.horA = lerp(a.horA, b.horA, t);
    return pal;
  }
  function css(rgb) { return 'rgb(' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')'; }

  /* ---------------- scene ---------------- */
  var scene = $('.scene');
  var S = null;
  function initScene() {
    if (!scene) return;
    var L = function (c) { return $('.layer--' + c, scene); };
    S = {
      layers: ['sky', 'far', 'mid', 'vfog', 'vfog2', 'near', 'fog', 'front'].map(L),
      depthY: [0, 14, 30, 36, 36, 44, 52, 96],
      depthX: [0, 2, 4, 5, 5, 8, 9, 12],
      driftX: [0, 0, 0, -1, 1, 0, 0, 0],
      skyStops: $$('#g-sky stop'),
      grad: $('#g-sky'),
      grads: [$$('#g-haze stop'), $$('#g-far stop'), $$('#g-mid stop'), $$('#g-near stop')],
      treeB: $('.trees-back', scene), treeF: $('.trees-front', scene), ground: $('.ground', scene),
      tb1: $('.tb1', scene), tb2: $('.tb2', scene), mistrow: $('.mistrow', scene),
      roof: $$('.c-roof, .c-frame', scene), face: $$('.c-face', scene),
      gTop: [$('.c-glass--top', scene)], gDoor: [$('.c-glass--door', scene)], gStar: [$('.c-glass--star', scene)],
      rimR: $('.c-rim--r', scene), rimL: $('.c-rim--l', scene), meteorG: $('.meteor-g', scene), meteor: $('.meteor', scene),
      lamp: $('.c-lamp', scene), glow: $('.c-glow', scene), spill: $('.c-spill', scene), smoke: $('.smoke', scene),
      rays: $('.rays', scene), smokePath: $('.smoke-path', scene), puffEls: $$('.smoke circle', scene),
      sun: $('.sun', scene), sunDisc: $('.sun-disc', scene), sunGlow: $('.sun-glow', scene), horizon: $('.horizon', scene),
      moon: $('.moon', scene), stars: $('.stars', scene), milky: $('.milky', scene),
      bandL: $('.band--l', scene), bandR: $('.band--r', scene),
      horStops: $$('#g-horizon stop'), glowStops: $$('#g-sunglow stop'),
      vb: { x: 0, y: 0, w: 1600, h: 1000 }, arc: null, last: {}
    };
    buildStars();
    fit();
  }

  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var STAR_N = 120, starEls = [];
  function buildStars() {
    var ns = 'http://www.w3.org/2000/svg', frag = document.createDocumentFragment();
    for (var i = 0; i < STAR_N; i++) { var c = document.createElementNS(ns, 'circle'); frag.appendChild(c); starEls.push(c); }
    S.stars.appendChild(frag);
  }
  function placeStars() {
    var r = rng(1729), vb = S.vb, scale = S.layers[0].clientHeight / vb.h, top = vb.y + 12, bottom = 600;
    for (var i = 0; i < STAR_N; i++) {
      var y = top + (bottom - top) * Math.pow(r(), 1.35);
      var x = vb.x + vb.w * r();
      var big = r() > 0.93;
      var px = big ? 1.7 + r() * 0.8 : 0.55 + r() * 1.05;
      var c = starEls[i];
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', (px / scale).toFixed(2));
      c.setAttribute('opacity', (big ? 1 : 0.45 + r() * 0.5).toFixed(2));
    }
    var mx = vb.x + vb.w * 0.3, my = vb.y + (600 - vb.y) * 0.46;
    S.milky.setAttribute('transform', 'translate(' + mx.toFixed(0) + ' ' + my.toFixed(0) + ') rotate(-32) scale(' + (vb.w / 1500).toFixed(2) + ' ' + (1 / Math.max(scale, 0.5)).toFixed(2) + ')');
  }
  function fit() {
    var el = S.layers[0], W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight, ar = W / H, w, h, x, y;
    if (ar >= 1) {
      h = 840; w = h * ar;
      if (w > 2100) { w = 2100; h = w / ar; }
      x = 960 - (ar >= 1.5 ? 0.62 : 0.68) * w; y = 1000 - h;
    } else { w = Math.min(1200, Math.max(700, W * 1.5)); h = w / ar; x = 960 - w / 2; y = 1150 - h; }  // portrait: lift the cabin clear of the booking bar
    S.vb = { x: x, y: y, w: w, h: h };
    var str = x.toFixed(1) + ' ' + y.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1);
    S.layers.forEach(function (l) { l.setAttribute('viewBox', str); });
    S.grad.setAttribute('y1', y.toFixed(0)); S.grad.setAttribute('y2', '690');
    var hy = 640;
    S.arc = { cx: x + w / 2, hy: hy, rx: w * (ar < 1 ? 0.44 : 0.46), ry: (hy - y) * (ar < 1 ? 0.85 : 0.74) };
    S.px = W / w;
    if (S.meteorG) S.meteorG.setAttribute('transform', 'translate(' + (x + w * 0.8).toFixed(0) + ' ' + (y + (560 - y) * 0.22).toFixed(0) + ') scale(' + Math.max(0.7, w / 1500).toFixed(2) + ')');
    S.horizon.setAttribute('rx', (w * 0.72).toFixed(0));
    S.horizon.setAttribute('ry', ((690 - y) * 0.5).toFixed(0));
    placeStars();
    S.last = {};
  }

  function setAttr(el, name, val) { if (el && el.__v !== val) { el.setAttribute(name, val); el.__v = val; } }
  function setFill(list, val) { for (var i = 0; i < list.length; i++) { var e = list[i]; if (e.__f !== val) { e.setAttribute(e.classList.contains('c-frame') ? 'stroke' : 'fill', val); e.__f = val; } } }

  // chimney smoke: puffs drift up the guide path as the page (the day) moves on
  var lastPhase = -1, smokeLen = 0;
  function puffs(phase) {
    if (!S.smokePath || Math.abs(phase - lastPhase) < 0.0005) return;
    lastPhase = phase;
    if (!smokeLen) smokeLen = S.smokePath.getTotalLength();
    var n = S.puffEls.length;
    for (var i = 0; i < n; i++) {
      var t = (i / n + phase) % 1, pt = S.smokePath.getPointAtLength(t * smokeLen), c = S.puffEls[i];
      c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1));
      c.setAttribute('r', (6 + t * 30).toFixed(1));
      c.setAttribute('opacity', (0.55 * Math.pow(1 - t, 1.3) * smooth(0, 0.08, t)).toFixed(3));
    }
  }
  var fx = { bands: 1, bandX: 0 };  // intro fog, tweened by GSAP
  function render(h, p, px) {
    if (!S) return;
    var P = palette(h), c = P.rgb;
    for (var i = 0; i < 4; i++) setAttr(S.skyStops[i], 'stop-color', css(c[i]));
    for (var g = 0; g < 4; g++) { setAttr(S.grads[g][0], 'stop-color', css(c[4 + g * 2])); setAttr(S.grads[g][1], 'stop-color', css(c[5 + g * 2])); }
    setAttr(S.treeB, 'fill', css(c[12])); setAttr(S.treeF, 'fill', css(c[13])); setAttr(S.ground, 'fill', css(c[14]));
    // the back rows fade toward the valley haze: three depth tones
    setAttr(S.tb1, 'fill', mix(c[12], c[2], 0.24)); setAttr(S.tb2, 'fill', mix(c[12], c[2], 0.46));
    setAttr(S.mistrow, 'opacity', (Math.max(1 - smooth(6.6, 9, h), smooth(20.5, 22.8, h) * 0.22) * 0.9).toFixed(3));
    setFill(S.roof, css(c[15])); setFill(S.face, css(c[16]));
    // windows come on one at a time: loft 17:30, door 18:10, deck lamp 18:40, star house 19:30 (and a dawn lamp in the loft)
    var dawn = (1 - smooth(6.2, 7.4, h)) * 0.5;
    var wTop = Math.max(dawn, smooth(17.3, 17.8, h)), wDoor = smooth(17.9, 18.4, h), wLamp = smooth(18.5, 18.9, h), wStar = smooth(19.2, 19.7, h);
    setFill(S.gTop, mix(c[17], LAMP, wTop)); setFill(S.gDoor, mix(c[17], LAMP, wDoor)); setFill(S.gStar, mix(c[17], LAMP, wStar));
    setAttr(S.lamp, 'opacity', wLamp.toFixed(3));
    setAttr(S.glow, 'opacity', ((wTop + wDoor) * 0.5 * (0.45 + 0.55 * smooth(18, 20.5, h))).toFixed(3));
    var spill = Math.max(dawn * 0.7, wTop * 0.25 + wDoor * 0.35 + wLamp * 0.2 + wStar * 0.2);
    setAttr(S.spill, 'opacity', spill.toFixed(3));
    setAttr(S.spill, 'rx', (170 + 150 * spill).toFixed(0));
    // rim light on the sunny side of the roof: right edge at dawn, left edge at sunset
    setAttr(S.rimR, 'opacity', ((1 - smooth(6.6, 7.8, h)) * 0.6).toFixed(3));
    setAttr(S.rimL, 'opacity', (smooth(17.4, 18.2, h) * (1 - smooth(18.9, 19.6, h)) * 0.55).toFixed(3));
    var smokeA = h < 9 ? lerp(0.5, 0.22, smooth(7, 9, h)) : h < 17.5 ? 0.22 : lerp(0.22, 0.7, smooth(17.5, 18.8, h));
    setAttr(S.smoke, 'opacity', smokeA.toFixed(3));
    puffs(((window.scrollY || 0) * 0.0011 + h * 0.4) % 1);

    // sun and moon on one arc
    // morning and evening halves of the arc run at different speeds so the sun clears the ridges at dawn and sunset
    var A = S.arc, ts = h < 12.5 ? (h - 3) / 9.5 * Math.PI / 2 : Math.PI / 2 + (h - 12.5) / 8.1 * Math.PI / 2;
    var sx = A.cx + A.rx * Math.cos(ts), sy = A.hy - A.ry * Math.sin(ts);
    setAttr(S.sun, 'transform', 'translate(' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ')');
    setAttr(S.sunDisc, 'fill', css(c[18]));
    setAttr(S.sunGlow, 'opacity', (P.glowA * (1 - smooth(19.6, 20.4, h))).toFixed(3));
    setAttr(S.sun, 'opacity', (1 - smooth(19.8, 20.5, h)).toFixed(3));
    // god rays at dawn and at sunset, aimed at the valley floor
    var rayA = Math.max((1 - smooth(6.8, 8.8, h)) * 0.85, smooth(17.2, 18.3, h) * (1 - smooth(18.9, 19.7, h)) * 0.7);
    if (S.rays) {
      var ro = rayA.toFixed(3);
      if (S.rays.__o !== ro) { S.rays.style.opacity = ro; S.rays.__o = ro; }
      if (rayA > 0.01) {
        // the ray sheet is a static, pre-blurred layer: only its transform follows the sun
        var lay = S.layers[0], sc = lay.clientWidth / S.vb.w, left = lay.offsetLeft || 0;
        var spx = left + (sx - S.vb.x) * sc, spy = (sy - S.vb.y) * sc, k = Math.max(0.55, sc * 1.15);
        var rt = 'translate3d(' + (spx - 1400).toFixed(1) + 'px,' + (spy - 400).toFixed(1) + 'px,0) scale(' + (sx > A.cx ? k : -k).toFixed(3) + ',' + k.toFixed(3) + ')';
        if (S.rays.__t !== rt) { S.rays.style.transform = rt; S.rays.__t = rt; }
      }
    }
    var tm = (h - 19.4) / 12 * Math.PI;
    var mx = A.cx + A.rx * Math.cos(tm), my = A.hy - A.ry * Math.sin(tm);
    setAttr(S.moon, 'transform', 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')');
    setAttr(S.moon, 'opacity', smooth(19.4, 20.4, h).toFixed(3));
    var hx = clamp(sx, S.vb.x + S.vb.w * 0.15, S.vb.x + S.vb.w * 0.85);
    if (h > 19.5) hx = lerp(hx, S.vb.x + S.vb.w * 0.5, smooth(19.5, 21, h));
    setAttr(S.horizon, 'cx', hx.toFixed(0));
    setAttr(S.horizon, 'fill-opacity', '1');
    var hc = css(c[20]), gc = css(c[19]);
    setAttr(S.horStops[0], 'stop-color', hc); setAttr(S.horStops[1], 'stop-color', hc);
    for (var gs = 0; gs < S.glowStops.length; gs++) setAttr(S.glowStops[gs], 'stop-color', gc);
    setAttr(S.horizon, 'opacity', P.horA.toFixed(3));
    setAttr(S.stars, 'opacity', smooth(19.4, 21.6, h).toFixed(3));
    setAttr(S.milky, 'opacity', smooth(21.2, 23, h).toFixed(3));

    // valley mist: thick at dawn, a thin moonlit band late at night
    var vfog = Math.max(1 - smooth(6.4, 9.6, h), smooth(20, 22.8, h) * 0.14);
    var vf = vfog.toFixed(3);
    if (S.layers[3].__o !== vf) { S.layers[3].style.opacity = vf; S.layers[4].style.opacity = vf; S.layers[3].__o = vf; }
    S.layers[6].style.opacity = (fx.bands * (1 - smooth(6.6, 8.4, h))).toFixed(3);

    // the two valley-fog sheets slide apart while the morning burns the mist off
    var drift = smooth(6, 8.6, h) * 120 * (S.px || 1);
    var vh = (S.layers[0].clientHeight || innerHeight) / 900 * (S.vb.w < 1000 ? 0.55 : 1);
    for (var l = 0; l < S.layers.length; l++) {
      var ty = S.depthY[l] * p * vh, tx = -S.depthX[l] * px + S.driftX[l] * drift;
      var tr = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
      if (S.layers[l].__t !== tr) { S.layers[l].style.transform = tr; S.layers[l].__t = tr; }
    }
    // dark scrim + snow text from the moment the sky's luminance drops below ~0.35
    var dusk = h >= 16.2;
    if (dusk !== root.classList.contains('is-dusk')) root.classList.toggle('is-dusk', dusk);
    clockTo(h);
  }

  /* ---------------- clock ---------------- */
  var clk = { ampm: $('.clock__ampm'), time: $('.clock__time'), run: $('.clock__run'), dot: $('.clock__dot'), last: -1 };
  var ARC_L = Math.PI * 28;
  if (clk.run) { clk.run.style.strokeDasharray = ARC_L.toFixed(2); }
  function clockTo(h) {
    var min = Math.round(h * 60);
    if (min === clk.last) return;
    clk.last = min;
    var hh = Math.floor(min / 60) % 24, mm = min % 60;
    if (clk.ampm) clk.ampm.textContent = hh < 12 ? '오전' : '오후';
    if (clk.time) clk.time.textContent = (hh % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm;
    var q = clamp((h - 6) / 17, 0, 1), a = q * Math.PI;
    if (clk.run) clk.run.style.strokeDashoffset = (ARC_L * (1 - q)).toFixed(2);
    if (clk.dot) { clk.dot.setAttribute('cx', (32 - 28 * Math.cos(a)).toFixed(2)); clk.dot.setAttribute('cy', (31 - 28 * Math.sin(a)).toFixed(2)); }
  }

  /* ---------------- scroll → hour ---------------- */
  var surfaces = $('.surfaces');
  var anchors = [[0, 6], [1, 23]], sceneEnd = 1;
  var state = { tH: isShot ? 6.333 : 6, h: isShot ? 6.333 : 6, tP: 0, p: 0, tX: 0, x: 0, dirty: true, motion: false };
  function pageY(el) { return el.getBoundingClientRect().top + (window.scrollY || 0); }
  function measure() {
    var vh = innerHeight, max = Math.max(1, document.scrollingElement.scrollHeight - vh);
    var a = [[0, isShot ? 6.333 : 6]];
    $$('.moment').forEach(function (m) {
      var col = m.firstElementChild;
      a.push([pageY(col) + col.offsetHeight / 2 - vh / 2, parseFloat(m.getAttribute('data-hour'))]);
    });
    sceneEnd = surfaces ? Math.max(1, pageY(surfaces)) : max;
    a.push([sceneEnd, 22.5]);
    a.push([max, 23]);
    anchors = a.filter(function (p, i) { return i === 0 || p[0] > a[i - 1][0] + 1; });
    if (S) fit();
    onScroll();
  }
  function hourAt(y) {
    if (y <= anchors[0][0]) return anchors[0][1];
    for (var i = 1; i < anchors.length; i++) {
      var a = anchors[i - 1], b = anchors[i];
      if (y <= b[0]) return lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0]));
    }
    return anchors[anchors.length - 1][1];
  }
  function onScroll() {
    var y = window.scrollY || 0;
    root.classList.toggle('is-scrolled', y > 8);
    if (state.motion) {
      state.tH = hourAt(y);
      state.tP = clamp(y / sceneEnd, 0, 1);
    }
    state.dirty = true;
    updateBar();
    if (clockEl && surfaces) {
      var chip = false;
      if (innerWidth >= 1200) {
        var r = surfaces.getBoundingClientRect(), vh = innerHeight;
        chip = r.top - 60 < vh - 20 && r.bottom + 60 > vh - 120;
      }
      if (chip !== clockEl.classList.contains('is-chip')) clockEl.classList.toggle('is-chip', chip);
    }
  }

  // one loop for everything; it only touches the DOM when a value moved
  var lastT = 0;
  function frame(now) {
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;
    var k = state.motion ? 1 - Math.exp(-dt * 5.5) : 1;
    var moved = false;
    ['h', 'p', 'x'].forEach(function (n) {
      var t = state['t' + n.toUpperCase()], v = state[n];
      if (Math.abs(t - v) > 0.0004) { state[n] = v + (t - v) * k; moved = true; }
      else if (v !== t) { state[n] = t; moved = true; }
    });
    if (moved || state.dirty || fx.dirty) { render(state.h, state.p, state.x); state.dirty = false; fx.dirty = false; }
  }
  function startLoop() {
    if (hasGsap) gsap.ticker.add(function () { frame(performance.now()); });
    else { var loop = function (t) { frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }

  // reduced motion: the time of day steps from section to section instead of flowing
  function steppedTime() {
    var marks = [$('.hero'), $('.day__intro')].concat($$('.moment'), [surfaces, $('.site-footer')]).filter(Boolean);
    var hours = new Map();
    marks.forEach(function (m) {
      var hv = m.getAttribute('data-hour');
      hours.set(m, hv ? parseFloat(hv) : 6);
    });
    if (isShot) hours.set(marks[0], 6.333);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !state.motion) { state.tH = state.h = hours.get(e.target); state.dirty = true; }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    marks.forEach(function (m) { io.observe(m); });
  }

  /* ---------------- header, clock and bar modes ---------------- */
  var header = $('.site-header'), clockEl = $('.clock'), bar = $('#book-bar');
  var watchers = [];
  function surfaceWatch(target, margin) {
    // several surfaces can sit on the line at once (a section ending, a ridge edge starting): an opaque surface wins over the scene
    var on = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      var mode = 'scene';
      on.forEach(function (el) { var m = el.getAttribute('data-surface'); if (m !== 'scene') mode = m; });
      if (on.size) target.setAttribute('data-mode', mode);
    }, { rootMargin: margin });
    $$('[data-surface]').forEach(function (s) { io.observe(s); });
    watchers.push(io);
  }
  // a 1px line under the header (and, on wide screens, behind the corner clock) decides their colours
  function watchModes() {
    watchers.forEach(function (w) { w.disconnect(); }); watchers = [];
    var vh = innerHeight;
    var hh = innerWidth >= 768 ? 72 : 60, line = '-' + (hh - 1) + 'px 0px -' + Math.max(0, vh - hh) + 'px 0px';
    if (header) surfaceWatch(header, line);
    if (clockEl) surfaceWatch(clockEl, line);
  }
  var bookingInView = false, footerInView = false, heroEl = $('.hero');
  function updateBar() {
    if (!bar) return;
    var desktop = innerWidth >= 1200;
    var inHero = desktop && (window.scrollY || 0) < (heroEl ? heroEl.offsetHeight * 0.55 : 400);
    var off = inHero || bookingInView || footerInView;
    if (off !== bar.classList.contains('is-hidden')) bar.classList.toggle('is-hidden', off);
    if (off !== root.classList.contains('bar-off')) root.classList.toggle('bar-off', off);
  }

  /* ---------------- mobile menu ---------------- */
  function initMenu() {
    var btn = $('.menu-btn'), sheet = $('#menu-sheet'), label = $('.menu-btn__label');
    if (!btn || !sheet) return;
    function setOpen(open, restore) {
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? '닫기' : '메뉴';
      sheet.hidden = !open;
      root.classList.toggle('menu-open', open);
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
      if (open) { var f = $('a', sheet); if (f) f.focus(); }
      else if (restore) btn.focus();
    }
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true', true); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false, false); });
    document.addEventListener('keydown', function (e) {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); }
      if (e.key === 'Tab') {
        var items = [btn].concat($$('a', sheet)), i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (innerWidth >= 1000 && !sheet.hidden) setOpen(false, false); });
  }

  /* ---------------- in-page links ---------------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1), t = id ? document.getElementById(id) : null;
      if (!t) return;
      e.preventDefault();
      var off = id === 'top' ? 0 : -64;
      if (window.__lenis) window.__lenis.scrollTo(id === 'top' ? 0 : t, { offset: off, duration: 1.6 });
      else window.scrollTo({ top: id === 'top' ? 0 : pageY(t) + off, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------------- hotspots ---------------- */
  function initSpots() {
    var spots = $$('.spot'), warm = false, openT = 0, coolT = 0;
    function place(spot, tip) {
      var fig = spot.parentElement, fw = fig.clientWidth, tw = tip.offsetWidth, cx = spot.offsetLeft + 22, cy = spot.offsetTop + 22;
      var left = clamp(cx, tw / 2 + 4, fw - tw / 2 - 4);
      tip.style.left = left + 'px';
      tip.style.setProperty('--ax', clamp(cx - (left - tw / 2), 16, tw - 16) + 'px');
      tip.style.setProperty('--y', cy + 'px');
      tip.classList.toggle('is-below', cy < tip.offsetHeight + 44);
    }
    function show(spot, instant) {
      clearTimeout(openT); clearTimeout(coolT);
      spots.forEach(function (s) { if (s !== spot) hide(s, true); });
      var tip = spot.nextElementSibling;
      place(spot, tip);
      tip.classList.toggle('is-instant', !!instant);
      tip.classList.add('is-on'); spot.classList.add('is-on');
      warm = true;
    }
    function hide(spot, quiet) {
      var tip = spot.nextElementSibling;
      if (!spot.classList.contains('is-on')) return;
      tip.classList.remove('is-on', 'is-instant'); spot.classList.remove('is-on');
      if (!quiet) { clearTimeout(coolT); coolT = setTimeout(function () { warm = false; }, 900); }
    }
    spots.forEach(function (spot) {
      spot.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(openT);
        if (warm) show(spot, true); else openT = setTimeout(function () { show(spot, false); }, 360);
      });
      spot.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { clearTimeout(openT); hide(spot); } });
      spot.addEventListener('focus', function () { if (spot.matches(':focus-visible')) show(spot, warm); });
      spot.addEventListener('blur', function () { hide(spot); });
      spot.addEventListener('click', function () { spot.classList.contains('is-on') && !fineMQ.matches ? hide(spot) : show(spot, true); });
    });
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.spot')) spots.forEach(function (s) { hide(s, true); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') spots.forEach(function (s) { hide(s); }); });
  }

  /* ---------------- calendar + booking ---------------- */
  function initBooking() {
    var cal = $('#cal'), form = $('#booking-form');
    if (!cal || !form) return;
    var DOW = ['일', '월', '화', '수', '목', '금', '토'], DOWL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var BASE = 280000, EXTRA = 30000, MAXN = 14;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    var last = new Date(today.getFullYear(), today.getMonth() + 12, 0);
    var st = { view: new Date(first), inD: null, outD: null, hover: null, focus: null, guests: 2 };
    var DAY = 864e5;
    function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function same(a, b) { return a && b && a.getTime() === b.getTime(); }
    function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function hash(d) { var n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); return ((n * 2654435761) >>> 0) % 100; }
    function booked(d) { return hash(d) < 13 || hash(add(d, -1)) < 13; }
    function past(d) { return d < today; }
    function off(d) { return past(d) || booked(d); }
    function label(d) { return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + DOWL[d.getDay()]; }
    function short(d) { return (d.getMonth() + 1) + '월 ' + d.getDate() + '일(' + DOW[d.getDay()] + ')'; }
    function nights() { return st.inD && st.outD ? Math.round((st.outD - st.inD) / DAY) : 0; }
    function price() { return nights() * (BASE + Math.max(0, st.guests - 2) * EXTRA); }
    function won(n) { return n.toLocaleString('ko-KR') + '원'; }
    function clearRun(a, b) { for (var d = new Date(a); d < b; d = add(d, 1)) if (booked(d)) return false; return true; }

    cal.innerHTML =
      '<div class="cal__bar"><p class="cal__hint" id="cal-hint" aria-live="polite">들어오는 날을 눌러 주세요.</p>' +
      '<div class="cal__navs"><button type="button" class="cal__nav" data-dir="-1" aria-label="이전 달 보기"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="cal__nav" data-dir="1" aria-label="다음 달 보기"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>' +
      '<div class="cal__months"></div>' +
      '<p class="cal__legend"><span class="cal__lg"><span class="cal__key cal__key--off" aria-hidden="true">17</span>사선은 예약 마감</span> <span class="cal__lg"><span class="cal__key cal__key--today" aria-hidden="true">24</span>동그라미는 오늘</span> <span class="cal__lg"><span class="cal__key cal__key--sel" aria-hidden="true">5</span>노란 칸은 고른 날</span></p>';
    var monthsEl = $('.cal__months', cal), hint = $('#cal-hint'), navs = $$('.cal__nav', cal);
    var status = $('#book-status');

    function monthHTML(m, idx) {
      var y = m.getFullYear(), mo = m.getMonth(), days = new Date(y, mo + 1, 0).getDate(), lead = new Date(y, mo, 1).getDay();
      var id = 'cal-m' + idx, h = '<div class="cal__month"><h3 class="cal__title" id="' + id + '">' + y + '년 ' + (mo + 1) + '월</h3>';
      h += '<table role="grid" aria-labelledby="' + id + '"><thead><tr>';
      for (var i = 0; i < 7; i++) h += '<th scope="col"><abbr title="' + DOWL[i] + '">' + DOW[i] + '</abbr></th>';
      h += '</tr></thead><tbody><tr>';
      for (var e = 0; e < lead; e++) h += '<td role="presentation"></td>';
      for (var d = 1; d <= days; d++) {
        var dt = new Date(y, mo, d), col = (lead + d - 1) % 7;
        if (col === 0 && d > 1) h += '</tr><tr>';
        var cls = 'day-btn' + (booked(dt) && !past(dt) ? ' is-booked' : '') + (same(dt, today) ? ' is-today' : '');
        var extra = past(dt) ? ', 지난 날짜' : booked(dt) ? ', 예약 마감' : '';
        h += '<td role="gridcell" aria-selected="false"><button type="button" class="' + cls + '" data-key="' + key(dt) + '" tabindex="-1" aria-label="' + label(dt) + extra + '"' + (off(dt) ? ' aria-disabled="true"' : '') + '>' + d + '</button></td>';
      }
      var trail = (7 - ((lead + days) % 7)) % 7;
      for (var t = 0; t < trail; t++) h += '<td role="presentation"></td>';
      return h + '</tr></tbody></table></div>';
    }
    var btnByKey = {};
    function render() {
      var m2 = new Date(st.view.getFullYear(), st.view.getMonth() + 1, 1);
      monthsEl.innerHTML = monthHTML(st.view, 0) + monthHTML(m2, 1);
      btnByKey = {};
      $$('.day-btn', monthsEl).forEach(function (b) { btnByKey[b.getAttribute('data-key')] = b; });
      navs[0].disabled = st.view <= first;
      navs[1].disabled = m2 >= new Date(last.getFullYear(), last.getMonth(), 1);
      paint();
    }
    function inView(d) { var a = st.view, b = new Date(a.getFullYear(), a.getMonth() + 2, 0); return d >= a && d <= b; }
    function firstOpen() {
      var a = new Date(Math.max(st.view, today));
      for (var i = 0; i < 62; i++) { var d = add(a, i); if (!off(d) && inView(d)) return d; }
      return a;
    }
    function paint() {
      if (!st.focus || !inView(st.focus)) st.focus = firstOpen();
      var end = st.outD || (st.inD && st.hover && st.hover > st.inD && clearRun(st.inD, st.hover) ? st.hover : null);
      Object.keys(btnByKey).forEach(function (k) {
        var b = btnByKey[k], p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), td = b.parentElement;
        var isIn = same(d, st.inD), isOut = same(d, st.outD) || (!st.outD && same(d, end));
        var inRange = st.inD && end && d > st.inD && d < end;
        b.classList.toggle('is-sel', isIn || isOut);
        td.classList.toggle('is-start', !!isIn);
        td.classList.toggle('has-end', !!(isIn && end));
        td.classList.toggle('is-end', !!isOut);
        td.classList.toggle('is-range', !!inRange);
        td.setAttribute('aria-selected', String(!!(isIn || same(d, st.outD) || (st.outD && inRange))));
        var base = b.getAttribute('aria-label').replace(/, (들어오는 날|나가는 날)$/, '');
        b.setAttribute('aria-label', base + (isIn ? ', 들어오는 날' : same(d, st.outD) ? ', 나가는 날' : ''));
        b.tabIndex = same(d, st.focus) ? 0 : -1;
      });
      summary();
    }
    function summary() {
      var n = nights();
      $('#sum-in').textContent = st.inD ? short(st.inD) : '고르기 전';
      $('#sum-out').textContent = st.outD ? short(st.outD) : '고르기 전';
      $('#sum-nights').textContent = n ? n + '박' : st.inD ? '나가는 날을 고르면' : '날짜를 고르면';
      $('#sum-price').textContent = n ? won(price()) : '요금이 바로 나옵니다';
      $('#guests-value').textContent = st.guests + '명';
      $$('.guests__btn').forEach(function (b) {
        var s = +b.getAttribute('data-step');
        b.setAttribute('aria-disabled', String((s < 0 && st.guests <= 1) || (s > 0 && st.guests >= 4)));
      });
      var bd = $('#bar-dates'), bp = $('#bar-price'), narrow = innerWidth < 600;
      var tiny = function (d) { return (d.getMonth() + 1) + '.' + d.getDate() + '(' + DOW[d.getDay()] + ')'; };
      if (bd && bp) {
        if (n) { bd.textContent = narrow ? tiny(st.inD) + '~' + tiny(st.outD) + ', ' + st.guests + '명' : short(st.inD) + '부터 ' + short(st.outD) + '까지, ' + st.guests + '명'; bp.textContent = n + '박 ' + won(price()); }
        else if (st.inD) { bd.textContent = (narrow ? tiny(st.inD) : short(st.inD)) + ' 입실'; bp.textContent = narrow ? '나가는 날을 골라요' : '나가는 날을 골라 주세요'; }
        else { bd.textContent = '날짜를 고르면'; bp.textContent = '요금이 나옵니다'; }
      }
    }
    function pick(d) {
      status.textContent = ''; status.className = 'book__status';
      if (off(d)) { hint.textContent = past(d) ? '지난 날짜는 고를 수 없습니다.' : label(d) + '은 이미 다른 팀이 머무는 날입니다.'; return; }
      if (!st.inD || st.outD || d <= st.inD) {
        st.inD = d; st.outD = null;
        hint.textContent = '들어오는 날 ' + short(d) + '. 이제 나가는 날을 눌러 주세요.';
      } else if (!clearRun(st.inD, d)) {
        st.inD = d; st.outD = null;
        hint.textContent = '사이에 예약된 밤이 있어 ' + short(d) + '을 새 들어오는 날로 잡았습니다. 나가는 날을 눌러 주세요.';
      } else if ((d - st.inD) / DAY > MAXN) {
        hint.textContent = '한 번에 최대 ' + MAXN + '박까지 머물 수 있습니다.';
        return;
      } else {
        st.outD = d;
        hint.textContent = short(st.inD) + '부터 ' + short(d) + '까지 ' + nights() + '박, 합계 ' + won(price()) + '입니다.';
      }
      st.focus = d;
      paint();
    }
    monthsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.day-btn'); if (!b) return;
      var p = b.getAttribute('data-key').split('-');
      pick(new Date(+p[0], +p[1] - 1, +p[2]));
      var nb = btnByKey[b.getAttribute('data-key')]; if (nb) nb.focus();
    });
    function hoverAt(b) {
      if (!b || !st.inD || st.outD) return;
      var p = b.getAttribute('data-key').split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
      if (!same(d, st.hover)) { st.hover = d; paint(); }
    }
    monthsEl.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse') hoverAt(e.target.closest('.day-btn')); });
    monthsEl.addEventListener('focusin', function (e) { hoverAt(e.target.closest('.day-btn')); });
    monthsEl.addEventListener('keydown', function (e) {
      var b = e.target.closest('.day-btn'); if (!b) return;
      var p = b.getAttribute('data-key').split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), n = null;
      switch (e.key) {
        case 'ArrowRight': n = add(d, 1); break;
        case 'ArrowLeft': n = add(d, -1); break;
        case 'ArrowDown': n = add(d, 7); break;
        case 'ArrowUp': n = add(d, -7); break;
        case 'Home': n = add(d, -d.getDay()); break;
        case 'End': n = add(d, 6 - d.getDay()); break;
        case 'PageDown': n = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)); break;
        case 'PageUp': n = new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)); break;
        default: return;
      }
      e.preventDefault();
      if (n < first) n = new Date(first);
      if (n > last) n = new Date(last);
      st.focus = n;
      if (!inView(n)) {
        var nv = n < st.view ? new Date(n.getFullYear(), n.getMonth(), 1) : new Date(n.getFullYear(), n.getMonth() - 1, 1);
        if (nv < first) nv = new Date(first);
        st.view = nv; render();
      } else paint();
      var nb = btnByKey[key(n)]; if (nb) nb.focus();
    });
    navs.forEach(function (nav) {
      nav.addEventListener('click', function () {
        var dir = +nav.getAttribute('data-dir');
        st.view = new Date(st.view.getFullYear(), st.view.getMonth() + dir, 1);
        st.focus = null; render();
      });
    });
    $$('.guests__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        st.guests = clamp(st.guests + +b.getAttribute('data-step'), 1, 4);
        summary();
        if (nights()) hint.textContent = st.guests + '명, ' + nights() + '박 합계 ' + won(price()) + '입니다.';
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!nights()) {
        status.className = 'book__status is-error';
        status.textContent = st.inD ? '나가는 날을 먼저 골라 주세요.' : '들어오는 날과 나가는 날을 먼저 골라 주세요.';
        var fb = btnByKey[key(st.focus || firstOpen())]; if (fb) fb.focus();
        return;
      }
      status.className = 'book__status is-ok';
      status.textContent = short(st.inD) + '부터 ' + nights() + '박, ' + st.guests + '명, ' + won(price()) + '으로 예약 요청을 남겼습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
    });
    render();
  }

  /* ---------------- motion (GSAP) ---------------- */
  function initMotion() {
    if (!hasGsap) { state.motion = !reduceMQ.matches; return; }
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    if (window.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);
    var mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)', fine: '(hover: hover) and (pointer: fine)' }, function (ctx) {
      var c = ctx.conditions;
      if (c.reduce) {
        state.motion = false; state.tP = state.p = 0; state.tX = state.x = 0; state.dirty = true;
        fx.bands = 0.7; fx.dirty = true;
        if (S) { S.bandL.setAttribute('transform', 'translate(-340 0)'); S.bandR.setAttribute('transform', 'translate(340 0)'); }
        return;
      }
      state.motion = true;
      onScroll();
      state.h = state.tH; state.p = state.tP;

      // Lenis only for desktop fine pointers
      var lenis = null, rafFn = null;
      if (c.fine && window.Lenis && !isShot) {
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        window.__lenis = lenis;
        if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
        rafFn = function (t) { lenis.raf(t * 1000); };
        gsap.ticker.add(rafFn);
        gsap.ticker.lagSmoothing(0);
      }

      // pointer drift, ±12px on the nearest layer
      var onMove = null;
      if (c.fine) {
        onMove = function (e) { state.tX = (e.clientX / innerWidth - 0.5) * 2; };
        window.addEventListener('pointermove', onMove, { passive: true });
      }

      // load: two fog bands part to the sides within a second
      if (S) {
        if (isShot || window.scrollY > 40) {
          gsap.set(S.bandL, { x: -340 }); gsap.set(S.bandR, { x: 340 }); fx.bands = 0.7; fx.dirty = true;
        } else {
          var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onUpdate: function () { fx.dirty = true; } });
          tl.fromTo(S.bandL, { x: 0 }, { x: -340, duration: 1 }, 0)
            .fromTo(S.bandR, { x: 0 }, { x: 340, duration: 1 }, 0)
            .fromTo(fx, { bands: 1 }, { bands: 0.7, duration: 1 }, 0);
          gsap.from('.hero__title .line', { y: 14, opacity: 0.82, duration: 0.9, ease: 'power3.out', stagger: 0.08 });
          gsap.from('.hero__lead, .hero__cta, .hero__cue', { y: 10, opacity: 0.4, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.12 });
        }
      }

      if (window.ScrollTrigger) {
        // the hour numerals open like a curtain of light
        $$('.moment').forEach(function (m) {
          var time = $('.moment__time', m), rest = $$('.moment__title, .moment p:not(.moment__time)', m);
          gsap.timeline({ scrollTrigger: { trigger: m.firstElementChild, start: 'top 82%', once: true } })
            .fromTo(time, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out' })
            .from(rest, { y: 12, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.15);
        });
        // drawings switch their lights on
        $$('.house__plan').forEach(function (f) {
          gsap.fromTo($$('.plan__warm, .plan__fire', f), { opacity: 0.25 }, { opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.05, scrollTrigger: { trigger: f, start: 'top 70%', once: true } });
        });
        // the route draws itself, then the dirt road
        var line = $('.route-line'), dirt = $('.route-mask');
        if (line && dirt && window.DrawSVGPlugin) {
          gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 72%', once: true } })
            .from(line, { drawSVG: 0, duration: 0.9, ease: 'power2.inOut' })
            .from(dirt, { drawSVG: 0, duration: 0.7, ease: 'power2.out' }, '-=0.1');
        }
        // one shooting star while "별을 셉니다" crosses the middle of the screen
        var lastMoment = $$('.moment').pop();
        if (S && S.meteor && lastMoment && window.DrawSVGPlugin) {
          gsap.timeline({ scrollTrigger: { trigger: lastMoment.firstElementChild, start: 'top 62%', once: true }, delay: 0.25 })
            .set(S.meteor, { opacity: 1 })
            .fromTo(S.meteor, { drawSVG: '0% 0%' }, { drawSVG: '60% 100%', duration: 0.55, ease: 'power1.in' })
            .to(S.meteor, { drawSVG: '100% 100%', opacity: 0, duration: 0.25, ease: 'power1.out' });
        }
      }

      return function () {
        if (onMove) window.removeEventListener('pointermove', onMove);
        if (lenis) { gsap.ticker.remove(rafFn); lenis.destroy(); window.__lenis = null; }
      };
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    try { initScene(); } catch (err) { root.classList.add('no-scene'); S = null; }
    try { initMenu(); initAnchors(); initSpots(); } catch (err) { /* page stays usable as plain HTML */ }
    try { initBooking(); } catch (err) { /* fallback text stays in place */ }
    try {
      watchModes();
      var booking = $('#booking');
      if (booking) new IntersectionObserver(function (en) { bookingInView = en[0].isIntersecting; updateBar(); }, { rootMargin: '-12% 0px -12% 0px' }).observe(booking);
      var foot = $('.site-footer');
      if (foot) new IntersectionObserver(function (en) { footerInView = en[0].isIntersecting; updateBar(); }, { rootMargin: '0px 0px -12% 0px' }).observe(foot);
    } catch (err) { /* header keeps its default look */ }
    try { initMotion(); } catch (err) { root.classList.add('no-motion'); state.motion = false; }
    try { steppedTime(); } catch (err) { /* stays at dawn */ }
    window.addEventListener('scroll', onScroll, { passive: true });
    var rT = 0;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { measure(); watchModes(); }, 150); });
    measure();
    if (!state.motion) state.h = state.tH;
    startLoop();
    var fontsDone = false, afterFonts = function () {
      if (fontsDone) return; fontsDone = true;
      measure();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts);
    setTimeout(afterFonts, 800);
    window.addEventListener('load', function () { measure(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
