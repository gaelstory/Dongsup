/* 서리재 재킷 렌더러 · window.SRJ.jacket
   설계 좌표 1000×1200. 부위별 Path2D(SVG path 문자열) → 회색조 명암 지도 → 박음선 지도 → 광택 층 → 색 합성.
   명암·박음선·광택·부속 층은 (모델, 앞뒤, 자세, 크기)마다 한 번만 만들고, 색을 바꿀 때는 합성만 다시 한다. */
(function () {
  'use strict';
  var SRJ = window.SRJ = window.SRJ || {};

  /* ---------- 공용 도구 (scenes.js도 쓴다) ---------- */
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function cv(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  var NOISE;
  function noise() {
    if (NOISE) return NOISE;
    var c = cv(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(11);
    for (var i = 0; i < d.data.length; i += 4) { var v = 96 + r() * 64 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    return (NOISE = c);
  }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(a, al) { return 'rgba(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + (al == null ? 1 : al) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function gray(v, a) { v = v | 0; return a == null ? 'rgb(' + v + ',' + v + ',' + v + ')' : 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; }
  function mul(A, B) {
    return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
      A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  }
  function setT(x, M) { x.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]); }
  function app(M, p) { return [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]]; }
  function rot(deg, px, py) { var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, px, py]; }
  var MIRROR = [-1, 0, 0, 1, 1000, 0];
  SRJ.util = { rng: rng, cv: cv, noise: noise, hex: hex, rgba: rgba, mix: mix, gray: gray };

  /* ---------- 색과 모델 ---------- */
  var COLORS = {
    ember: { hex: '#E2531C', gloss: .55, seam: .50, sheen: .03, tint: '#7A1E08', ko: '잔불', en: 'EMBER', edge: .32, emb: '#F3E9E2' },
    basalt: { hex: '#1B1C1F', gloss: .85, seam: .70, sheen: .2, tint: '#000000', ko: '현무', en: 'BASALT', edge: .45, emb: '#AEB4BA' },
    frost: { hex: '#E3E6E4', gloss: .30, seam: .38, sheen: 0, tint: '#8C96A0', ko: '서리', en: 'FROST', edge: .52, emb: '#2A2E33' },
    moss: { hex: '#56614B', gloss: .40, seam: .55, sheen: .07, tint: '#1F2618', ko: '이끼', en: 'MOSS', edge: .34, emb: '#E3E6E4' },
    dawn: { hex: '#3E5674', gloss: .60, seam: .60, sheen: .09, tint: '#131E30', ko: '새벽', en: 'DAWN', edge: .34, emb: '#E3E6E4' }
  };
  var MODELS = {
    hoody: { hood: 1, sleeves: 1, crop: 0, women: 0 },
    jacket: { hood: 0, sleeves: 1, crop: 0, women: 0 },
    hoodyW: { hood: 1, sleeves: 1, crop: 0, women: 1 },
    cropW: { hood: 0, sleeves: 1, crop: 1, women: 1 },
    vest: { hood: 0, sleeves: 0, crop: 0, women: 0 }
  };

  /* ---------- 튜브(배플) 명암 띠: 위 12% 박음선 그늘 → 25~40% 하이라이트 → 아래 8% 가장 어두움 ---------- */
  var STRIP;
  function strip() {
    if (STRIP) return STRIP;
    var c = cv(1, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    [[0, 112], [.05, 150], [.12, 198], [.22, 238], [.32, 252], [.44, 246], [.62, 224], [.8, 186], [.92, 138], [1, 112]]
      .forEach(function (s) { g.addColorStop(s[0], gray(s[1])); });
    x.fillStyle = g; x.fillRect(0, 0, 1, 256);
    return (STRIP = c);
  }

  /* ---------- 기하 ---------- */
  function arc(y0, sag, a, b) { return function (x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return y0 + sag * Math.sin(Math.PI * t); }; }
  function sideX(m, y) {
    // 옆선의 x(왼쪽). 여성 핏은 허리선(690)에서 28 들어갔다가 밑단에서 다시 나온다.
    if (!m.women) return 250 - (y - 478) * 0.0085;
    if (y < 690) { var t = (y - 478) / 212; return 250 + 28 * (1 - Math.cos(Math.PI * t)) / 2; }
    var u = (y - 690) / 290; u = u > 1 ? 1 : u; return 278 - 32 * (1 - Math.cos(Math.PI * u)) / 2;
  }

  function build(key, view, pose, arm, sleeveLen) {
    var m = MODELS[key], back = view === 'back';
    var H = m.crop ? 890 : 1000, B = H - 34, Wn = m.women;
    var g = { m: m, key: key, H: H, B: B, back: back, pose: pose, parts: {} };
    // 몸판 윤곽
    var side = Wn ? 'C 250 560 278 610 278 690 C 278 770 246 ' + (B - 60) + ' 246 ' + B : 'C 250 600 247 800 246 ' + B;
    var sideR = Wn ? 'C 722 ' + (B - 60) + ' 722 770 722 690 C 722 610 750 560 750 478' : 'C 753 800 750 600 750 478';
    var neck = back ? 'Q 500 226 418 214 Z' : 'Q 560 250 500 256 Q 440 250 418 214 Z';
    var armL = m.sleeves ? 'C 292 340 262 420 250 478 ' : 'C 312 330 300 440 256 486 ';
    var armR = m.sleeves ? 'C 738 420 708 340 700 262 ' : 'C 700 440 688 330 700 262 ';
    var bodyD = 'M 418 214 Q 360 232 300 262 ' + armL + side + ' L 248 ' + H + ' Q 500 ' + (H + 12) + ' 752 ' + H + ' L 754 ' + B + ' ' +
      sideR + ' ' + armR + 'Q 640 232 582 214 ' + neck;
    var rows = [], seams = [], vseams = [], NR = m.crop ? 7 : 9, rh = (B - 330) / NR, sagT = [22, 21, 20, 16, 14, 12, 10, 9, 8, 8];
    var pan = back ? [[246, 754]] : [[246, 487], [513, 754]];
    // 어깨 요크(0.7배 촘촘한 칸)
    var ys = [{ y: 180, s: 0 }, { y: 284, s: 6 }];
    for (var k = 0; k <= NR; k++) ys.push({ y: 330 + k * rh, s: k === NR ? 0 : sagT[k] * (back ? 1.15 : 1) });
    pan.forEach(function (p) {
      var a = p[0], b = p[1];
      for (var i = 0; i < ys.length - 1; i++) {
        var lo = ys[i + 1].y > 478 ? (a < 500 ? 300 : a) : a, hi = ys[i + 1].y > 478 ? (b > 500 ? 700 : b) : b;
        var aa = ys[i].y > 478 ? lo : a, bb = ys[i].y > 478 ? hi : b;
        rows.push({ x0: a - 4, x1: b + 4, top: arc(ys[i].y, ys[i].s, aa, bb), bot: arc(ys[i + 1].y, ys[i + 1].s, lo, hi) });
        if (i + 1 < ys.length - 1) seams.push({ x0: lo, x1: hi, f: arc(ys[i + 1].y, ys[i + 1].s, lo, hi), chest: i >= 1 && i <= 3 });
      }
    });
    // 옆구리 패널(나눈 패널): 0.7배 칸, 직선
    var sideRows = [], sh = rh * 0.7;
    for (var y = 478; y < B - 2; y += sh) {
      var y2 = Math.min(B, y + sh);
      [0, 1].forEach(function (r) {
        var a = r ? 700 : 240, b = r ? 760 : 300;
        sideRows.push({ x0: a, x1: b, top: arc(y, 0, a, b), bot: arc(y2, 0, a, b) });
        if (y2 < B) seams.push({ x0: r ? 700 : sideX(m, y2), x1: r ? 1000 - sideX(m, y2) : 300, f: arc(y2, 0, 0, 1) });
      });
    }
    vseams.push([[300, 478], [300 + (Wn ? 18 : 0), 690], [298, B]], [[700, 478], [700 - (Wn ? 18 : 0), 690], [702, B]]);
    var hemRow = { x0: 240, x1: 760, top: arc(B, 12, 248, 752), bot: arc(H, 12, 248, 752), pleat: 1 };
    var body = { d: bodyD, M: [1, 0, 0, 1, 0, 0], rows: rows, sideRows: sideRows, seams: seams, vseams: vseams, band: hemRow,
      bbox: [240, 200, 760, H + 14], vol: 1, wr: [] };
    // 허리 사선 주름
    body.wr.push([[302, 640], [344, 722]], [[316, 700], [352, 770]], [[698, 640], [656, 722]], [[684, 700], [648, 770]], [[420, 860], [470, 920]], [[580, 860], [530, 920]]);
    g.parts.body = body;

    // 소매: 어깨점을 축으로 armAngle만큼 회전(좌우 2° 차이로 기계적 대칭을 깬다)
    if (m.sleeves) {
      var L = 640 * (sleeveLen || 1), C = L - 42;
      var sd = 'M 0 0 Q 70 60 96 205 C 106 330 98 ' + (C - 128) + ' 90 ' + C + ' L 88 ' + L + ' Q 26 ' + (L + 6) + ' -36 ' + L +
        ' L -40 ' + C + ' C -46 ' + (C - 128) + ' -60 280 -56 84 Q -36 14 0 0 Z';
      var srows = [], sseams = [], v0 = 95, sr = (C - v0) / 8;
      srows.push({ x0: -70, x1: 120, top: arc(-30, 0, -60, 100), bot: arc(v0, 10, -58, 100) });
      for (var j = 0; j < 8; j++) {
        srows.push({ x0: -70, x1: 120, top: arc(v0 + j * sr, 10, -58, 100), bot: arc(v0 + (j + 1) * sr, j === 7 ? 4 : 10, -58, 100) });
        if (j) sseams.push({ x0: -50, x1: 100, f: arc(v0 + j * sr, 10, -58, 100) });
      }
      sseams.unshift({ x0: -52, x1: 98, f: arc(v0, 10, -58, 100) });
      var band = { x0: -50, x1: 100, top: arc(C, 4, -40, 90), bot: arc(L, 4, -36, 88), pleat: 1 };
      [['sleeveL', 1], ['sleeveR', -1]].forEach(function (s) {
        var ang = arm + (s[1] > 0 ? 0 : 2);
        var M = rot(ang, 300, 262);
        if (s[1] < 0) M = mul(MIRROR, M);
        g.parts[s[0]] = { d: sd, M: M, rows: srows, seams: sseams, vseams: [], band: band, bbox: [-64, -30, 112, L + 8], vol: 1, mir: s[1] < 0,
          wr: [[[60, 300], [96, 372]], [[40, 330], [84, 392]], [[-20, 520], [30, 560]]] };
      });
    }
    // 후드 또는 스탠드 칼라 + 뒷목 안감(앞에서 보이는 고스트 마네킹 컷)
    if (m.hood) {
      if (back) {
        g.parts.hood = { d: 'M 396 262 C 350 220 338 104 420 58 Q 500 20 580 58 C 662 104 650 220 604 262 Q 500 290 396 262 Z', M: [1, 0, 0, 1, 0, 0],
          rows: [0, 1, 2, 3].map(function (i) { return { x0: 330, x1: 670, top: arc(i ? 40 + i * 58 : -40, i ? -12 : 0, 350, 650), bot: arc(98 + i * 58, i === 3 ? 20 : -12, 350, 650) }; }),
          seams: [1, 2, 3].map(function (i) { return { x0: 350, x1: 650, f: arc(40 + i * 58, -12, 350, 650) }; }), vseams: [[[500, 26], [500, 280]]], bbox: [330, 20, 670, 290], vol: 1, wr: [] };
      } else {
        g.inner = { d: 'M 440 236 C 418 200 416 118 452 92 Q 500 64 548 92 C 584 118 582 200 560 236 Q 500 252 440 236 Z', tape: [446, 214, 554, 224], loop: [500, 206] };
        g.parts.hood = { d: 'M 402 252 C 352 214 340 104 420 60 Q 500 22 580 60 C 660 104 648 214 598 252 Q 500 270 402 252 Z', M: [1, 0, 0, 1, 0, 0],
          rows: [0, 1, 2, 3].map(function (i) { return { x0: 330, x1: 670, top: arc(i ? 40 + i * 56 : -40, i ? -14 : 0, 352, 648), bot: arc(96 + i * 56, -14, 352, 648) }; }),
          seams: [1, 2, 3].map(function (i) { return { x0: 352, x1: 648, f: arc(40 + i * 56, -14, 352, 648) }; }), vseams: [], bbox: [330, 20, 670, 272], vol: 1, wr: [], rim: 1 };
      }
    } else {
      if (back) {
        g.parts.collar = { d: 'M 410 162 Q 500 146 590 162 L 594 222 Q 500 240 406 222 Z', M: [1, 0, 0, 1, 0, 0],
          rows: [{ x0: 400, x1: 600, top: arc(150, 0, 410, 590), bot: arc(224, 16, 406, 594) }], seams: [{ x0: 408, x1: 592, f: arc(192, 10, 408, 592) }], vseams: [], bbox: [400, 146, 600, 240], vol: 1, wr: [] };
      } else {
        g.inner = { d: 'M 412 170 Q 500 132 588 170 Q 500 196 412 170 Z', tape: [452, 156, 548, 163], loop: [500, 150] };
        g.parts.collar = { d: 'M 412 170 Q 500 196 588 170 L 590 214 Q 545 252 500 258 Q 455 252 410 214 Z', M: [1, 0, 0, 1, 0, 0],
          rows: [{ x0: 400, x1: 600, top: arc(166, 17, 412, 588), bot: arc(206, 26, 410, 590) }, { x0: 400, x1: 600, top: arc(206, 26, 410, 590), bot: arc(214, 44, 410, 590) }],
          seams: [{ x0: 412, x1: 588, f: arc(206, 26, 410, 590) }], vseams: [], bbox: [400, 132, 600, 260], vol: 1, wr: [] };
      }
    }
    g.zipTop = m.hood ? 238 : 184;
    var pk = m.crop ? -64 : 0;
    g.pockets = back ? [] : [[[370, 626 + pk], [334, 754 + pk]], [[630, 626 + pk], [666, 754 + pk]]];
    g.order = (m.hood && !back ? ['hood', 'body'] : ['body']).concat(m.sleeves ? ['sleeveL', 'sleeveR'] : []).concat(m.hood ? (back ? ['hood'] : []) : ['collar']);
    g.order.forEach(function (k) { var p = g.parts[k]; p.path = new Path2D(p.d); });
    if (g.inner) g.inner.path = new Path2D(g.inner.d);
    return g;
  }

  /* ---------- 층 만들기 ---------- */
  function partPath(p) { return p.path; }

  function drawRows(x, base, rows, step) {
    var S = strip();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      for (var a = r.x0; a < r.x1; a += step) {
        var y0 = r.top(a), y1 = r.top(a + step), h = r.bot(a) - y0;
        if (h <= 0) continue;
        setT(x, mul(base, [step + 0.8, y1 - y0, 0, h, a, y0]));
        x.drawImage(S, 0, 0, 1, 256, 0, 0, 1, 1);
      }
    }
  }
  function strokeSeam(x, s, step) {
    x.beginPath();
    for (var a = s.x0; a <= s.x1 + 0.1; a += step) { var y = s.f(a); if (a === s.x0) x.moveTo(a, y); else x.lineTo(a, y); }
  }
  function poly(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); }

  // 박음선마다 9~14 간격의 짧은 당김 주름(어두운 획 + 2 떨어진 밝은 획). 시드 고정.
  function wrinkles(p, seed, mult) {
    if (p.wrk && p.wrk.m === mult) return p.wrk;
    var r = rng(seed), dark = [new Path2D(), new Path2D(), new Path2D()], light = [new Path2D(), new Path2D()];
    p.seams.forEach(function (s) {
      for (var a = s.x0 + 4; a < s.x1 - 4; a += (9 + r() * 5) / mult) {
        var y = s.f(a), len = 10 + r() * 16, dir = r() < 0.62 ? 1 : -1, ang = (r() - 0.5) * 0.5, b = r() * 3 | 0;
        var dx = Math.sin(ang) * len, dy = Math.cos(ang) * len * dir;
        dark[b].moveTo(a, y); dark[b].lineTo(a + dx, y + dy);
        var L = light[r() < 0.5 ? 0 : 1]; L.moveTo(a + 2, y + dir * 2); L.lineTo(a + 2 + dx * 0.8, y + dy * 0.8);
      }
    });
    return (p.wrk = { m: mult, dark: dark, light: light });
  }

  function layers(key, view, pose, arm, S, parts, sleeveLen) {
    var g = build(key, view, pose, arm, sleeveLen);
    var W = Math.round(1000 * S), Hh = Math.round(1200 * S);
    var shade = cv(W, Hh), seamL = cv(W, Hh), mask = cv(W, Hh), acc = cv(W, Hh);
    var sx = shade.getContext('2d'), mx = seamL.getContext('2d'), kx = mask.getContext('2d'), ax = acc.getContext('2d');
    var SM = [S, 0, 0, S, 0, 0], lw = 1 / S, step = Math.max(5, 7 / S * 0.5);
    var want = parts && parts !== 'all' ? parts : null;
    var order = g.order.filter(function (k) { return !want || want.indexOf(k) >= 0 || (k === 'collar' && want.indexOf('body') >= 0); });
    var drawInner = !want || want.indexOf(g.m.hood ? 'hood' : 'body') >= 0;
    // 뒷목 안감: 기본색보다 35% 어둡게. 후드면 후드 겉감 위(얼굴 자리), 칼라면 몸판 앞에 먼저.
    function inner() {
      if (!g.inner || !drawInner) return;
      setT(sx, SM); sx.globalCompositeOperation = 'source-over'; sx.fillStyle = gray(150); sx.fill(g.inner.path);
      sx.save(); sx.clip(g.inner.path);
      var ig = sx.createLinearGradient(0, 70, 0, 250); ig.addColorStop(0, gray(70)); ig.addColorStop(1, gray(165));
      sx.fillStyle = ig; sx.globalCompositeOperation = 'multiply'; sx.fillRect(380, 60, 240, 200); sx.restore();
      if (g.m.hood) {
        // 후드 테두리 바인딩(안감 위에 반, 겉감 위에 반)
        sx.globalCompositeOperation = 'source-over'; setT(sx, SM);
        sx.strokeStyle = gray(222); sx.lineWidth = 16; sx.stroke(g.inner.path);
        sx.strokeStyle = gray(150, .8); sx.lineWidth = 2; sx.save(); sx.translate(0, 5); sx.stroke(g.inner.path); sx.restore();
      }
      setT(mx, SM); mx.fillStyle = '#fff'; mx.fill(g.inner.path);
      setT(kx, SM); kx.fillStyle = '#fff'; kx.fill(g.inner.path);
    }
    if (!g.m.hood) inner();
    order.forEach(function (k, idx) {
      if (idx && order[idx - 1] === 'hood' && g.m.hood && !g.back) inner();
      var p = g.parts[k], M = mul(SM, p.M), bb = p.bbox;
      // 명암 지도
      sx.save(); setT(sx, M); sx.clip(p.path);
      sx.globalCompositeOperation = 'source-over'; sx.fillStyle = gray(128); sx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
      drawRows(sx, M, p.rows, step);
      if (p.sideRows) drawRows(sx, M, p.sideRows, step);
      if (p.band) drawRows(sx, M, [p.band], step);
      setT(sx, M);
      // 박음선 바로 아래 1px 밝은 선
      sx.strokeStyle = gray(255, .5); sx.lineWidth = lw;
      p.seams.forEach(function (s) { sx.save(); sx.translate(0, 1.6 * lw); strokeSeam(sx, s, 6); sx.stroke(); sx.restore(); });
      // 잔주름
      var w = wrinkles(p, 40 + idx * 7 + (g.back ? 3 : 0), 1);
      sx.lineCap = 'round';
      [.08, .14, .21].forEach(function (al, i) { sx.strokeStyle = gray(30, al); sx.lineWidth = 1.2 * lw; sx.stroke(w.dark[i]); });
      [.16, .24].forEach(function (al, i) { sx.strokeStyle = gray(255, al); sx.lineWidth = lw; sx.stroke(w.light[i]); });
      // 팔꿈치 안쪽과 허리의 긴 사선 주름
      p.wr.forEach(function (q) {
        [[14, .05], [8, .06], [3, .09]].forEach(function (t) { sx.strokeStyle = gray(20, t[1]); sx.lineWidth = t[0]; poly(sx, q); sx.stroke(); });
        sx.strokeStyle = gray(255, .1); sx.lineWidth = 3; sx.save(); sx.translate(6, -3); poly(sx, q); sx.stroke(); sx.restore();
      });
      // 탄성 바인딩 세로 주름(6px 간격)
      if (p.band) {
        var bd = p.band, gap = 6 * lw;
        for (var a = bd.x0; a < bd.x1; a += gap) {
          var t0 = bd.top(a), t1 = bd.bot(a);
          sx.strokeStyle = gray(40, .16 + (a * 7 % 5) * .02); sx.lineWidth = lw; sx.beginPath(); sx.moveTo(a, t0 + 2); sx.lineTo(a + 1, t1 - 1); sx.stroke();
          sx.strokeStyle = gray(255, .12); sx.beginPath(); sx.moveTo(a + gap * .45, t0 + 2); sx.lineTo(a + gap * .45 + 1, t1 - 1); sx.stroke();
        }
      }
      if (k === 'body' && !g.back) {
        // 지퍼 덧단
        var pg = sx.createLinearGradient(486, 0, 514, 0); pg.addColorStop(0, gray(150)); pg.addColorStop(.5, gray(236)); pg.addColorStop(1, gray(160));
        sx.fillStyle = pg; sx.fillRect(487, 180, 26, g.H + 20 - 180);
      }
      // 몸의 볼륨: 가로 원통 음영(좌우 14%가 어둡고 빛 쪽으로 치우친 곳이 밝다) + 위에서 오는 빛
      sx.globalCompositeOperation = 'multiply';
      var c = .5 + .16 * (p.mir ? -1 : 1) * LX, vg = sx.createLinearGradient(bb[0], 0, bb[2], 0);
      vg.addColorStop(0, gray(118)); vg.addColorStop(.14, gray(206)); vg.addColorStop(c, gray(255)); vg.addColorStop(.86, gray(206)); vg.addColorStop(1, gray(112));
      sx.fillStyle = vg; sx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
      var hg = sx.createLinearGradient(0, bb[1], 0, bb[3]); hg.addColorStop(0, gray(255)); hg.addColorStop(1, gray(222));
      sx.fillStyle = hg; sx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
      // 접촉 그림자(겨드랑이, 소매 아래 몸판, 칼라 아래)
      if (k === 'body') {
        setT(sx, SM);
        ['sleeveL', 'sleeveR'].forEach(function (q) {
          var sp = g.parts[q]; if (!sp) return;
          sx.save(); setT(sx, mul(SM, sp.M));
          for (var i = 4; i >= 0; i--) { sx.strokeStyle = gray(0, .07); sx.lineWidth = 10 + i * 12; sx.stroke(sp.path); }
          sx.restore();
        });
        setT(sx, SM);
        var rg = sx.createRadialGradient(500, 262, 10, 500, 262, 130); rg.addColorStop(0, gray(0, .35)); rg.addColorStop(1, gray(0, 0));
        sx.save(); sx.translate(0, 262); sx.scale(1, .38); sx.translate(0, -262); sx.fillStyle = rg; sx.fillRect(360, 100, 280, 330); sx.restore();
      }
      if (k === 'sleeveL' || k === 'sleeveR') {
        var ag = sx.createRadialGradient(96, 210, 4, 96, 210, 70); ag.addColorStop(0, gray(0, .35)); ag.addColorStop(1, gray(0, 0));
        setT(sx, M); sx.fillStyle = ag; sx.fillRect(20, 130, 160, 160);
      }
      sx.restore();

      // 박음선 지도(흰 바탕 + 어두운 박음선). 색마다 다른 세기로 곱한다.
      mx.save(); setT(mx, M); mx.clip(p.path); mx.fillStyle = '#fff'; mx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
      mx.lineCap = 'round';
      [[12, 190], [6, 120], [1.5 * lw, 26]].forEach(function (t) {
        mx.strokeStyle = gray(t[1]); mx.lineWidth = t[0];
        p.seams.forEach(function (s) { strokeSeam(mx, s, 6); mx.stroke(); });
        p.vseams.forEach(function (v) { poly(mx, v); mx.stroke(); });
        if (p.band) { strokeSeam(mx, { x0: p.band.x0, x1: p.band.x1, f: p.band.top }, 6); mx.stroke(); }
        if (k === 'body' && !g.back) { [487, 513].forEach(function (xx) { mx.beginPath(); mx.moveTo(xx, 180); mx.lineTo(xx, g.H + 20); mx.stroke(); }); }
      });
      if (k === 'body' && g.back) { mx.lineWidth = 6; mx.strokeStyle = gray(130); mx.beginPath(); mx.moveTo(300, 270); mx.quadraticCurveTo(500, 352, 700, 270); mx.stroke(); mx.lineWidth = 1.5 * lw; mx.strokeStyle = gray(30); mx.stroke(); }
      mx.restore();
      // 실루엣 마스크
      setT(kx, M); kx.fillStyle = '#fff'; kx.fill(p.path);
    });
    if (order[order.length - 1] === 'hood' && g.m.hood && !g.back) inner();
    // 원단 결: 6px 립스톱 격자 + 노이즈 타일. 실루엣으로 자른다.
    sx.setTransform(1, 0, 0, 1, 0, 0);
    var gp = cv(6, 6), gx = gp.getContext('2d'); gx.fillStyle = 'rgba(0,0,0,' + Math.min(.06, .03 / S) + ')'; gx.fillRect(0, 0, 6, .5); gx.fillRect(0, 0, .5, 6);
    sx.globalCompositeOperation = 'source-over'; sx.fillStyle = sx.createPattern(gp, 'repeat'); sx.globalAlpha = .55; sx.fillRect(0, 0, W, Hh);
    sx.globalCompositeOperation = 'overlay'; sx.globalAlpha = .06 * 1.6; sx.fillStyle = sx.createPattern(noise(), 'repeat'); sx.fillRect(0, 0, W, Hh);
    sx.globalAlpha = 1; sx.globalCompositeOperation = 'destination-in'; sx.drawImage(mask, 0, 0);
    sx.globalCompositeOperation = 'source-over';

    // 부속: 지퍼, 주머니 지퍼, 뒷목 테이프와 고리, 뒤판 조임 끈과 전사 로고
    setT(ax, SM); ax.lineCap = 'round';
    var showBody = order.indexOf('body') >= 0;
    if (showBody && !g.back) {
      ax.fillStyle = '#25272B'; ax.fillRect(495.5, g.zipTop, 9, g.H + 6 - g.zipTop);
      ax.fillStyle = '#5B6067';
      for (var yy = g.zipTop + 3, n = 0; yy < g.H; yy += 6 / S * .5 + 2.4, n++) ax.fillRect(n % 2 ? 500.4 : 497.2, yy, 2.4, 2.2);
      var py = g.zipTop + 8, mg = ax.createLinearGradient(492, py, 508, py + 30); mg.addColorStop(0, '#A9B0B8'); mg.addColorStop(.5, '#5D636B'); mg.addColorStop(1, '#2E3237');
      ax.fillStyle = mg; rr(ax, 492, py, 16, 30, 4); ax.fill();
      ax.fillStyle = 'rgba(255,255,255,.85)'; ax.beginPath(); ax.arc(497, py + 6, 1.6, 0, 7); ax.fill();
      ax.strokeStyle = '#E8561E'; ax.lineWidth = 5; rr(ax, 495, py + 28, 10, 40, 5); ax.stroke();
      g.pockets.forEach(function (q) {
        ax.strokeStyle = 'rgba(0,0,0,.22)'; ax.lineWidth = 9; poly(ax, [[q[0][0] + 3, q[0][1] + 3], [q[1][0] + 3, q[1][1] + 3]]); ax.stroke();
        ax.strokeStyle = '#26282C'; ax.lineWidth = 4; poly(ax, q); ax.stroke();
        ax.strokeStyle = 'rgba(255,255,255,.18)'; ax.lineWidth = 1; poly(ax, [[q[0][0] - 3, q[0][1]], [q[1][0] - 3, q[1][1]]]); ax.stroke();
        var pm = ax.createLinearGradient(q[0][0] - 5, q[0][1], q[0][0] + 5, q[0][1] + 14); pm.addColorStop(0, '#A9B0B8'); pm.addColorStop(1, '#3A3E44');
        ax.fillStyle = pm; rr(ax, q[0][0] - 5, q[0][1] - 2, 10, 16, 3); ax.fill();
      });
    }
    if (g.inner && drawInner) {
      var t = g.inner.tape; ax.save(); ax.clip(g.inner.path);
      ax.fillStyle = '#E8561E'; ax.fillRect(t[0], t[1], t[2] - t[0], t[3] - t[1]);
      ax.strokeStyle = 'rgba(0,0,0,.45)'; ax.lineWidth = 3.2; ax.beginPath(); ax.moveTo(g.inner.loop[0] - 9, g.inner.loop[1] + 9);
      ax.quadraticCurveTo(g.inner.loop[0], g.inner.loop[1] - 18, g.inner.loop[0] + 9, g.inner.loop[1] + 9); ax.stroke(); ax.restore();
    }
    if (showBody && g.back) {
      [[262, g.H - 4], [738, g.H - 4]].forEach(function (q) {
        ax.strokeStyle = '#2A2C30'; ax.lineWidth = 3; ax.beginPath(); ax.moveTo(q[0], q[1] - 6); ax.quadraticCurveTo(q[0] + 4, q[1] + 26, q[0] - 2, q[1] + 34); ax.stroke();
        ax.fillStyle = '#34373C'; rr(ax, q[0] - 7, q[1] + 22, 14, 20, 4); ax.fill(); ax.fillStyle = 'rgba(255,255,255,.3)'; ax.fillRect(q[0] - 4, q[1] + 25, 2, 12);
      });
    }
    return { g: g, W: W, H: Hh, S: S, shade: shade, seam: seamL, mask: mask, acc: acc, order: order, matte: {}, gl: {} };
  }
  var LX = 0.25;
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // 광택 층: 칸마다 가장 밝은 띠 위에 1~3조각. 가로 위치는 light.x를 따라간다. 화면에서는 이 층만 다시 합성한다.
  function gloss(L, lx, col) {
    var k = lx.toFixed(2) + col;
    if (L.gl[k]) return L.gl[k];
    var g = L.g, c = L.gl[k] = cv(L.W, L.H), x = c.getContext('2d'), SM = [L.S, 0, 0, L.S, 0, 0], C = COLORS[col];
    var long = col === 'basalt' ? 1.5 : col === 'frost' ? .8 : 1;
    L.order.forEach(function (key, idx) {
      var p = g.parts[key], M = mul(SM, p.M), r = rng(90 + idx * 13), bb = p.bbox, mid = (bb[0] + bb[2]) / 2, half = (bb[2] - bb[0]) / 2;
      x.save(); setT(x, M); x.globalCompositeOperation = 'destination-out'; x.fill(p.path); x.clip(p.path); x.globalCompositeOperation = 'lighter';
      var target = mid + (p.mir ? -lx : lx) * half * .62, u = 1 / L.S;
      x.lineCap = 'round';
      p.rows.concat(p.sideRows || []).forEach(function (row) {
        var n = 1 + (r() * 2.6 | 0), hp = .26 + r() * .08;
        for (var i = 0; i < n; i++) {
          var cx = target + (r() - .5) * half * 1.15, len = (40 + r() * 120) * long * u * .5, ht = (4 + r() * 5) * u * .5;
          var a0 = Math.max(row.x0 + 6, cx - len / 2), a1 = Math.min(row.x1 - 6, cx + len / 2);
          if (a1 - a0 < 12) continue;
          var near = 1 - Math.min(1, Math.abs(cx - target) / (half * .95)), a = (.3 + .7 * near) * (.6 + r() * .4);
          // 박음선 곡선을 따라 휘는 반사 띠. 양끝이 사라지는 그라디언트, 세로는 겹친 획으로 부드럽게.
          x.beginPath();
          for (var t = a0; t <= a1; t += 5) { var yy = row.top(t) + (row.bot(t) - row.top(t)) * hp; if (t === a0) x.moveTo(t, yy); else x.lineTo(t, yy); }
          var gr = x.createLinearGradient(a0, 0, a1, 0);
          gr.addColorStop(0, gray(255, 0)); gr.addColorStop(.3 + r() * .1, gray(255, a)); gr.addColorStop(.65 + r() * .1, gray(255, a * .8)); gr.addColorStop(1, gray(255, 0));
          x.strokeStyle = gr;
          [[2.6, .16], [1.5, .3], [.7, .55], [.3, .7]].forEach(function (s) { x.globalAlpha = s[1]; x.lineWidth = ht * s[0]; x.stroke(); });
          x.globalAlpha = 1;
        }
      });
      x.restore();
      if (key === 'hood' && g.inner) { setT(x, SM); x.globalCompositeOperation = 'destination-out'; x.fill(g.inner.path); x.globalCompositeOperation = 'source-over'; }
    });
    return c;
  }

  function matte(L, col) {
    if (L.matte[col]) return L.matte[col];
    var C = COLORS[col], c = L.matte[col] = cv(L.W, L.H), x = c.getContext('2d');
    x.fillStyle = C.hex; x.fillRect(0, 0, L.W, L.H);
    x.globalCompositeOperation = 'multiply'; x.drawImage(L.shade, 0, 0);
    x.globalAlpha = C.seam; x.drawImage(L.seam, 0, 0); x.globalAlpha = 1;
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = .4; x.fillStyle = C.tint; x.fillRect(0, 0, L.W, L.H); x.globalAlpha = 1;
    // 나일론의 은은한 광: 어두운 색일수록 명암 지도를 한 번 더 screen해 칸의 볼록함이 읽히게 한다
    if (C.sheen) {
      x.globalCompositeOperation = 'screen'; x.globalAlpha = C.sheen; x.drawImage(L.shade, 0, 0);
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = C.seam * .6; x.drawImage(L.seam, 0, 0); x.globalAlpha = 1;
    }
    x.globalCompositeOperation = 'destination-in'; x.drawImage(L.mask, 0, 0);
    return c;
  }

  // 색 합성(8ms 이내): 무광 바탕 → 광택 screen → 가장자리 안쪽 선 → 부속
  function compose(L, col, lx, out, gk) {
    var C = COLORS[col], x = out.getContext('2d'), S = L.S, g = L.g;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, out.width, out.height);
    x.drawImage(matte(L, col), 0, 0);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = C.gloss * (gk || 1); x.drawImage(gloss(L, lx, col), 0, 0); x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    L.order.forEach(function (k) {
      var p = g.parts[k]; x.save(); setT(x, mul([S, 0, 0, S, 0, 0], p.M)); x.clip(p.path);
      x.strokeStyle = 'rgba(8,9,10,' + C.edge + ')'; x.lineWidth = 1.5 / S; x.stroke(p.path); x.restore();
    });
    x.drawImage(L.acc, 0, 0);
    // 왼쪽 가슴 V선 심벌 자수 / 뒷목 아래 워드마크 전사
    setT(x, [S, 0, 0, S, 0, 0]);
    if (L.order.indexOf('body') >= 0) {
      x.strokeStyle = C.emb; x.fillStyle = C.emb; x.lineWidth = 3.2; x.lineJoin = 'round';
      if (!g.back) {
        x.beginPath(); x.moveTo(590, 318); x.lineTo(606, 318); x.lineTo(614, 330); x.lineTo(622, 318); x.lineTo(638, 318); x.stroke();
        x.beginPath(); x.arc(614, 324, 2.6, 0, 7); x.fill();
      } else {
        x.font = '700 15px Archivo, "Helvetica Neue", Arial, sans-serif'; x.textAlign = 'center'; x.globalAlpha = .82;
        try { x.letterSpacing = '2px'; } catch (e) { /* 미지원 브라우저 */ }
        x.fillText('SEORIJAE', 500, 312); x.globalAlpha = 1;
      }
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    return out;
  }

  /* ---------- 캐시(상한 40장, 오래된 것부터 버림) ---------- */
  var CACHE = new Map();
  function cacheGet(k, make) {
    if (CACHE.has(k)) { var v = CACHE.get(k); CACHE.delete(k); CACHE.set(k, v); return v; }
    v = make(); CACHE.set(k, v);
    while (CACHE.size > 40) CACHE.delete(CACHE.keys().next().value);
    return v;
  }
  function getLayers(o, S) {
    var arm = o.armAngle != null ? o.armAngle : o.pose === 'worn' ? 8 : 18;
    var k = [o.model, o.view || 'front', o.pose || 'flat', arm, S.toFixed(3), o.parts && o.parts !== 'all' ? o.parts.join('+') : 'all', o.sleeveLen || 1].join('|');
    return cacheGet(k, function () { return layers(o.model, o.view || 'front', o.pose || 'flat', arm, S, o.parts, o.sleeveLen); });
  }

  /* 투명 바탕 재킷 한 장(설계 좌표 전체 1000×1200을 S배). 장면 렌더러가 합성할 때 쓴다. */
  function layer(o, S) {
    var L = getLayers(o, S), col = o.color || 'ember', lx = o.light ? o.light.x : LX;
    return cacheGet('c|' + L.W + '|' + o.model + o.view + o.pose + (o.armAngle || '') + (o.parts || '') + col + lx.toFixed(2) + (o.sleeveLen || 1) + '|' + (o.glossK || 1), function () { return compose(L, col, lx, cv(L.W, L.H), o.glossK); });
  }

  function visualTop(o) { return MODELS[o.model].hood ? 30 : 134; }
  function visualBot(o) { return (MODELS[o.model].crop ? 890 : 1000) + 16; }

  function studio(x, w, h, jx, jy, jw, hemY) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ECEEF0'); g.addColorStop(1, '#D9DDE0');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var rg = x.createRadialGradient(w * .55, h * .38, 0, w * .55, h * .38, Math.max(w, h) * .62);
    rg.addColorStop(0, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h);
    // 밑단 아래 타원 그림자 2겹: 작게 그린 뒤 확대하는 방식의 블러
    var s = cv(64, 24), sxx = s.getContext('2d');
    var e1 = sxx.createRadialGradient(32, 12, 0, 32, 12, 30); e1.addColorStop(0, 'rgba(40,46,52,.34)'); e1.addColorStop(1, 'rgba(40,46,52,0)');
    sxx.setTransform(1, 0, 0, .36, 0, 7.7); sxx.fillStyle = e1; sxx.fillRect(0, 0, 64, 64);
    x.drawImage(s, jx + jw * .02, hemY - jw * .05, jw * .96, jw * .2);
    var s2 = cv(32, 12), s2x = s2.getContext('2d'), e2 = s2x.createRadialGradient(16, 6, 0, 16, 6, 15);
    e2.addColorStop(0, 'rgba(20,24,28,.4)'); e2.addColorStop(1, 'rgba(20,24,28,0)'); s2x.setTransform(1, 0, 0, .3, 0, 4.2); s2x.fillStyle = e2; s2x.fillRect(0, 0, 32, 40);
    x.drawImage(s2, jx + jw * .18, hemY - jw * .012, jw * .64, jw * .06);
  }

  // 재킷 윤곽을 1/10로 줄였다 키운 옅은 그림자(스튜디오 조명 아래 떠 있는 느낌)
  function soft(x, img, ox, oy) {
    var w = Math.max(8, img.width / 10 | 0), h = Math.max(8, img.height / 10 | 0), c = cv(w, h), q = c.getContext('2d');
    q.drawImage(img, 0, 0, w, h); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#2A3038'; q.fillRect(0, 0, w, h);
    x.save(); x.globalAlpha = .2; x.imageSmoothingQuality = 'high'; x.drawImage(c, ox + img.width * .01, oy + img.height * .018, img.width, img.height); x.restore();
  }

  /* SRJ.jacket.render(canvas, opts) */
  function render(canvas, o) {
    o = o || {};
    var w = canvas.width, h = canvas.height, x = canvas.getContext('2d'), S, ox, oy;
    if (o.bg === 'studio') {
      var top = visualTop(o), bot = visualBot(o), vh = bot - top;
      S = Math.min(h * .78 / vh, w * .9 / 880);
      ox = (w - 1000 * S) / 2; oy = (h - vh * S) / 2 - top * S - h * .025;
    } else {
      S = Math.min(w / 1000, h / 1200) * (o.scale || 1); ox = (w - 1000 * S) / 2; oy = (h - 1200 * S) / 2;
    }
    S = Math.round(S * 400) / 400;
    var img = layer(o, S);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (o.bg === 'studio') { studio(x, w, h, ox + 120 * S, oy, 760 * S, oy + (visualBot(o) - 8) * S); soft(x, img, ox, oy); }
    else x.clearRect(0, 0, w, h);
    x.drawImage(img, Math.round(ox), Math.round(oy));
    return { S: S, ox: ox, oy: oy };
  }

  /* 광택만 다시 합성(색 바꾸기의 광택 훑기, 퀵뷰 포인터 추적) */
  function relight(canvas, o, lx) {
    var w = canvas.width, h = canvas.height, top = visualTop(o), vh = visualBot(o) - top;
    var S = o.bg === 'studio' ? Math.min(h * .78 / vh, w * .9 / 880) : Math.min(w / 1000, h / 1200) * (o.scale || 1);
    S = Math.round(S * 400) / 400;
    var L = getLayers(o, S), tmp = relight.t || (relight.t = {});
    var key = L.W + 'x' + L.H, c = tmp[key] || (tmp[key] = cv(L.W, L.H));
    compose(L, o.color, lx, c);
    var ox = o.bg === 'studio' ? (w - 1000 * S) / 2 : (w - 1000 * S) / 2, oy = o.bg === 'studio' ? (h - vh * S) / 2 - top * S - h * .025 : (h - 1200 * S) / 2;
    var x = canvas.getContext('2d');
    if (o.bg === 'studio') { studio(x, w, h, ox + 120 * S, oy, 760 * S, oy + (visualBot(o) - 8) * S); soft(x, c, ox, oy); } else x.clearRect(0, 0, w, h);
    x.drawImage(c, Math.round(ox), Math.round(oy));
  }

  /* 수납 주머니(스터프 색) 190:110. 같은 채색 파이프라인, 잔주름 3배, 조임 끈 쪽으로 모이는 방사형 주름. */
  var PACKS = {};
  function packLayer(col, W) {
    var k = col + W;
    if (PACKS[k]) return PACKS[k];
    var Hh = Math.round(W * 110 / 190), S = W / 760, C = COLORS[col];
    var shade = cv(W, Hh), x = shade.getContext('2d'), SM = [S, 0, 0, S, 0, 0];
    var d = new Path2D('M 120 74 C 60 74 40 140 40 220 C 40 300 60 366 120 366 L 600 362 C 650 360 676 300 712 238 Q 720 220 712 202 C 676 140 650 80 600 78 Z');
    setT(x, SM); x.save(); x.clip(d);
    var vg = x.createLinearGradient(0, 74, 0, 366);
    [[0, 120], [.12, 200], [.28, 252], [.42, 238], [.7, 186], [.9, 120], [1, 90]].forEach(function (s) { vg.addColorStop(s[0], gray(s[1])); });
    x.fillStyle = vg; x.fillRect(0, 0, 760, 440);
    x.globalCompositeOperation = 'multiply';
    var hg = x.createLinearGradient(40, 0, 720, 0); hg.addColorStop(0, gray(150)); hg.addColorStop(.12, gray(236)); hg.addColorStop(.55, gray(255)); hg.addColorStop(.9, gray(200)); hg.addColorStop(1, gray(150));
    x.fillStyle = hg; x.fillRect(0, 0, 760, 440);
    x.globalCompositeOperation = 'source-over';
    var r = rng(5); x.lineCap = 'round';
    for (var i = 0; i < 520; i++) {
      var px = 60 + r() * 600, py = 84 + r() * 272, ln = 10 + r() * 22, an = (r() - .5) * 1.4 + (r() < .5 ? 0 : Math.PI / 2) * .3;
      x.strokeStyle = gray(25, .1 + r() * .18); x.lineWidth = 1.4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(an) * ln, py + Math.sin(an) * ln); x.stroke();
      x.strokeStyle = gray(255, .16); x.lineWidth = 1; x.beginPath(); x.moveTo(px + 2, py + 2); x.lineTo(px + 2 + Math.cos(an) * ln * .8, py + 2 + Math.sin(an) * ln * .8); x.stroke();
    }
    for (i = 0; i < 16; i++) {
      var a = Math.PI + (i / 15 - .5) * 2.2, len = 90 + r() * 140, ex = 712 + Math.cos(a) * len, ey = 220 + Math.sin(a) * len * .9;
      [[16, .08], [7, .12], [2.4, .2]].forEach(function (t) { x.strokeStyle = gray(10, t[1]); x.lineWidth = t[0]; x.beginPath(); x.moveTo(708, 220); x.quadraticCurveTo((708 + ex) / 2, (220 + ey) / 2 + (r() - .5) * 30, ex, ey); x.stroke(); });
      x.strokeStyle = gray(255, .14); x.lineWidth = 2; x.beginPath(); x.moveTo(704, 214); x.lineTo(ex + 6, ey - 6); x.stroke();
    }
    x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (i = 0; i < 9; i++) {
      var gx0 = 90 + r() * 470, gl0 = 50 + r() * 120, gy = 138 + r() * 34, ga = (.35 + r() * .5) * C.gloss;
      var lg = x.createLinearGradient(gx0, 0, gx0 + gl0, 0); lg.addColorStop(0, gray(255, 0)); lg.addColorStop(.4, gray(255, ga)); lg.addColorStop(1, gray(255, 0));
      x.strokeStyle = lg; x.beginPath(); x.moveTo(gx0, gy + 6); x.quadraticCurveTo(gx0 + gl0 / 2, gy - 6, gx0 + gl0, gy + 4);
      [[16, .14], [9, .3], [4, .55]].forEach(function (t) { x.globalAlpha = t[1]; x.lineWidth = t[0]; x.stroke(); }); x.globalAlpha = 1;
    }
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = .1; x.fillStyle = x.createPattern(noise(), 'repeat'); x.fillRect(0, 0, 760, 440); x.globalAlpha = 1;
    x.restore();
    var out = cv(W, Hh), o = out.getContext('2d');
    o.fillStyle = C.hex; o.fillRect(0, 0, W, Hh); o.globalCompositeOperation = 'multiply'; o.drawImage(shade, 0, 0);
    o.globalCompositeOperation = 'soft-light'; o.globalAlpha = .5; o.fillStyle = C.tint; o.fillRect(0, 0, W, Hh); o.globalAlpha = 1;
    o.globalCompositeOperation = 'destination-in'; setT(o, SM); o.fillStyle = '#000'; o.fill(d);
    o.globalCompositeOperation = 'source-over';
    o.strokeStyle = 'rgba(0,0,0,' + C.edge + ')'; o.lineWidth = 1.5 / S; o.save(); o.clip(d); o.stroke(d); o.restore();
    // 조임 끈, 끈 조절 고리, 반대쪽 손잡이 고리
    o.lineCap = 'round'; o.strokeStyle = '#2B2D31'; o.lineWidth = 6;
    o.beginPath(); o.moveTo(712, 220); o.bezierCurveTo(750, 196, 756, 262, 726, 256); o.stroke();
    o.fillStyle = '#3A3D42'; rr(o, 716, 230, 22, 30, 7); o.fill(); o.fillStyle = 'rgba(255,255,255,.35)'; o.fillRect(721, 235, 3, 18);
    o.strokeStyle = '#E8561E'; o.lineWidth = 8; o.beginPath(); o.moveTo(46, 196); o.quadraticCurveTo(4, 220, 46, 244); o.stroke();
    return (PACKS[k] = out);
  }
  function renderPack(canvas, col) {
    var w = canvas.width, h = canvas.height, pw = Math.min(w, h * 190 / 110), img = packLayer(col || 'dawn', Math.round(pw));
    var x = canvas.getContext('2d'); x.clearRect(0, 0, w, h); x.drawImage(img, (w - img.width) / 2, (h - img.height) / 2);
    return img;
  }

  /* 도해용 좌표: 설계 좌표의 호출 시작점과 박음선 SVG 경로 */
  function points(key) {
    var g = build(key, 'front', 'flat', 18), body = g.parts.body;
    var chest = body.seams.filter(function (s) { return s.chest && s.x0 > 500; }).slice(0, 3).map(function (s) {
      var d = ''; for (var a = s.x0; a <= s.x1; a += 12) d += (d ? ' L ' : 'M ') + a.toFixed(1) + ' ' + s.f(a).toFixed(1); return d;
    });
    var sr = g.parts.sleeveR.M;
    return {
      pocket: [352, 690], chest: [600, body.seams.filter(function (s) { return s.chest && s.x0 > 500; })[0].f(600)], yoke: [356, 300],
      shell: app(sr, [34, 470]), window: [392, g.B - 75], chestPaths: chest,
      yokePath: 'M 330 284 Q 420 300 487 292 M 513 292 Q 580 300 670 284', sidePath: 'M 300 478 L 300 ' + g.B + ' M 700 478 L 700 ' + g.B,
      pivotL: [300, 262], pivotR: [700, 262]
    };
  }

  /* 절개 창: 겉감(확대된 립스톱) / 솜털 클러스터 60~80개와 물방울 / 안감 */
  function renderWindow(canvases, col) {
    var C = COLORS[col || 'ember'], base = hex(C.hex);
    canvases.forEach(function (c, i) {
      var w = c.width, h = c.height, x = c.getContext('2d'), r = rng(300 + i);
      x.clearRect(0, 0, w, h);
      if (i === 0) {
        var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, rgba(mix(base, [255, 255, 255], .12))); g.addColorStop(1, rgba(mix(base, [0, 0, 0], .32)));
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = Math.max(1, w / 140);
        for (var a = 0; a < w + h; a += w / 9) { x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h); x.stroke(); x.beginPath(); x.moveTo(0, a); x.lineTo(w, a); x.stroke(); }
        x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = Math.max(1, w / 300);
        for (a = w / 18; a < w + h; a += w / 9) { x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h); x.stroke(); }
        x.globalCompositeOperation = 'overlay'; x.globalAlpha = .12; x.fillStyle = x.createPattern(noise(), 'repeat'); x.fillRect(0, 0, w, h); x.globalAlpha = 1;
      } else if (i === 1) {
        var bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#DCDEDA'); bg.addColorStop(1, '#B9BDB8'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
        for (var n = 0; n < 72; n++) {
          var cx = r() * w, cy = r() * h, R = w * (.06 + r() * .07), k = 12 + (r() * 7 | 0);
          for (var j = 0; j < k; j++) {
            var an = j / k * 6.283 + r() * .4, rr2 = R * (.6 + r() * .5), bend = (r() - .5) * R * .7;
            x.strokeStyle = 'rgba(' + (238 + r() * 17 | 0) + ',' + (238 + r() * 14 | 0) + ',' + (230 + r() * 16 | 0) + ',' + (.45 + r() * .4) + ')';
            x.lineWidth = Math.max(.6, w / 520); x.beginPath(); x.moveTo(cx, cy);
            x.quadraticCurveTo(cx + Math.cos(an) * rr2 * .5 - Math.sin(an) * bend, cy + Math.sin(an) * rr2 * .5 + Math.cos(an) * bend, cx + Math.cos(an) * rr2, cy + Math.sin(an) * rr2); x.stroke();
          }
          x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(cx, cy, w / 200 + 1, 0, 7); x.fill();
        }
        for (n = 0; n < 4; n++) {
          var dx = w * (.12 + r() * .76), dy = h * (.12 + r() * .76), dr = w * (.018 + r() * .014);
          var dg = x.createRadialGradient(dx - dr * .35, dy - dr * .4, 0, dx, dy, dr);
          dg.addColorStop(0, 'rgba(255,255,255,.95)'); dg.addColorStop(.35, 'rgba(210,222,232,.55)'); dg.addColorStop(.9, 'rgba(90,106,120,.5)'); dg.addColorStop(1, 'rgba(60,70,80,0)');
          x.fillStyle = dg; x.beginPath(); x.ellipse(dx, dy, dr, dr * .9, 0, 0, 7); x.fill();
        }
      } else {
        var lg = x.createLinearGradient(0, 0, w, h); lg.addColorStop(0, '#3A3E43'); lg.addColorStop(1, '#202326'); x.fillStyle = lg; x.fillRect(0, 0, w, h);
        x.globalCompositeOperation = 'overlay'; x.globalAlpha = .1; x.fillStyle = x.createPattern(noise(), 'repeat'); x.fillRect(0, 0, w, h); x.globalAlpha = 1;
      }
      x.globalCompositeOperation = 'source-over';
    });
  }

  SRJ.jacket = { render: render, relight: relight, layer: layer, renderPack: renderPack, packLayer: packLayer, points: points, renderWindow: renderWindow,
    COLORS: COLORS, MODELS: MODELS, build: build };
})();
