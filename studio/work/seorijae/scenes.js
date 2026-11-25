/* 서리재 장면 렌더러 · window.SRJ.scenes
   얼굴은 그리지 않는다: 뒷모습, 옆뒷모습, 목 아래 크롭, 먼 실루엣뿐. 인물의 재킷은 재킷 렌더러(worn)를 그대로 합성한다.
   하늘 → 능선 4~6겹(먼 겹은 1/4 크기로 그려 확대해 흐리게) → 안개 띠 → 인물(림 라이트, 그림자) → 눈발 → 색 보정과 그레인. */
(function () {
  'use strict';
  var SRJ = window.SRJ = window.SRJ || {}, U = SRJ.util;
  var rng = U.rng, cv = U.cv, hex = U.hex, rgba = U.rgba, mix = U.mix;

  function vnoise(seed) {
    var r = rng(seed), t = new Float32Array(512);
    for (var i = 0; i < 512; i++) t[i] = r();
    return function (x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return t[i & 511] * (1 - u) + t[(i + 1) & 511] * u; };
  }
  function fbm(n, x, o) { var s = 0, a = .5, f = 1; for (var k = 0; k < o; k++) { s += a * n(x * f + k * 17.3); f *= 2.07; a *= .5; } return s; }

  /* 장면 목록: 시드, 하늘, 능선, 인물(구도와 재킷 색) 고정 */
  var DUSK = { snowL: '#F0B48E', snowS: '#3F4468', mist: '#C98A86', cast: '#D2B0BC' };
  var GREY = { snowL: '#F3F5F6', snowS: '#9AA6B2', mist: '#DCE1E4', cast: '#DCE2E6' };
  var DAWN = { snowL: '#D8E2F0', snowS: '#5A6C8E', mist: '#9FB0C8', cast: '#9FB2D2' };
  var SC = {
    h1: { seed: 11, sky: [[0, '#141C2B'], [.46, '#3A3550'], [.74, '#C9603C'], [.8, '#F0703A']], sun: [.3, .79, .55, '#FF9A5A', .6], pal: DUSK,
      L: [[.69, .1, 2, '#5A4A62', .78], [.73, .08, 3, '#43394F', .58], [.78, .07, 4, '#2E2A3C', .4, 'trees'], [.86, .09, 2.2, '#2B2B3B', .14, 'snow', [.68, .1, .3]], [.97, .05, 3, '#1E1F2A', 0, 'snow']],
      figs: [{ x: .68, on: 3, h: .5, kind: 'full', model: 'hoody', color: 'ember', pack: 1 }], flakes: 120, wind: .3, rim: '#FFA06A', rimDir: -1, fg: 'flake' },
    h2: { seed: 23, sky: [[0, '#8E99A3'], [.6, '#B3BCC3'], [1, '#C9D0D4']], pal: GREY,
      L: [[.6, .06, 2, '#A9B3BB', .8], [.66, .06, 3, '#98A3AC', .62, 'trees'], [.78, .05, 2, '#C3CBD0', .3, 'snow']],
      figs: [{ x: .46, on: 2, h: 1.42, kind: 'full', model: 'hoody', color: 'basalt', turn: .84, lift: .66 }], flakes: 300, wind: .9, rim: '#E6ECF0', rimDir: 1, fg: 'flake', flat: 1 },
    h3: { seed: 37, sky: [[0, '#1B2740'], [.55, '#33476A'], [1, '#6D82A4']], pal: DAWN, blurTrees: '#14203A',
      L: [], figs: [{ x: .5, kind: 'chest', model: 'cropW', color: 'frost' }], flakes: 40, wind: .2, rim: '#B9CBEA', rimDir: -1 },
    h4: { seed: 41, sky: [[0, '#BCC4C9'], [.7, '#C7CED2'], [1, '#D3D8DB']], pal: GREY,
      L: [[.62, .07, 2, '#AEB7BD', .7], [.7, .05, 3, '#9CA6AE', .5, 'trees'], [.8, .03, 2, '#D6DCDF', .2, 'snow']],
      figs: [{ x: .4, on: 2, h: .14, kind: 'full', model: 'jacket', color: 'moss', walk: 1, haze: .12 }, { x: .5, on: 2, h: .135, kind: 'full', model: 'hoody', color: 'ember', walk: 2, haze: .1, dy: -.006 }],
      flakes: 70, wind: .2, rim: '#F2F4F5', rimDir: 1, flat: 1, tracks: 1 },
    h5: { seed: 53, sky: [[0, '#2C3550'], [.45, '#7A6E7E'], [.72, '#D99A72'], [.86, '#FFD2A0']], sun: [.72, .7, .5, '#FFC48A', .75], pal: DUSK,
      L: [[.64, .08, 2, '#7A6A78', .8], [.72, .07, 3, '#5A4E5E', .65, 'trees']], figs: [{ kind: 'still', color: 'dawn' }], flakes: 30, wind: .2, rim: '#FFC890', rimDir: 1 },
    l1: { seed: 61, sky: [[0, '#1A2233'], [.5, '#4A3B52'], [.76, '#D46E46'], [.82, '#E8794A']], sun: [.22, .8, .5, '#FF9460', .55], pal: DUSK,
      L: [[.7, .1, 2.4, '#5E4C60', .75], [.75, .08, 3.2, '#44384E', .5, 'trees'], [.84, .08, 2, '#2D2C3C', .15, 'snow', [.55, .06, .3]], [.97, .04, 3, '#1F1F2A', 0, 'snow']],
      figs: [{ x: .55, on: 2, h: .52, kind: 'full', model: 'hoody', color: 'ember' }], flakes: 110, wind: .35, rim: '#FF9F68', rimDir: -1, fg: 'flake' },
    l2: { seed: 67, sky: [[0, '#9AA5AE'], [1, '#D5DADC']], pal: GREY,
      L: [[.62, .05, 2, '#B4BDC3', .8], [.7, .05, 3, '#A2ACB3', .6, 'trees'], [.8, .04, 2, '#CCD3D7', .3, 'snow']],
      figs: [{ x: .5, on: 2, h: 1.3, kind: 'full', model: 'hoody', color: 'basalt', turn: .82, lift: .62 }], flakes: 260, wind: .8, rim: '#EEF2F4', rimDir: 1, fg: 'flake', flat: 1 },
    l3: { seed: 71, sky: [[0, '#1C2840'], [.6, '#36496C'], [1, '#6A7FA0']], pal: DAWN, blurTrees: '#152038',
      L: [], figs: [{ kind: 'chest', model: 'jacket', color: 'dawn' }], flakes: 30, wind: .2, rim: '#AFC2E2', rimDir: 1 },
    l4: { seed: 79, sky: [[0, '#5E7FA2'], [.6, '#9DB4CB'], [1, '#D7E2EB']], sun: [.8, .05, .5, '#FFFFFF', .35], pal: { snowL: '#FFFFFF', snowS: '#9DB0C6', mist: '#E8EEF3' },
      L: [[.6, .07, 2, '#9EB2C6', .7], [.68, .06, 3, '#7F93A8', .45, 'trees'], [.8, .04, 2, '#EEF2F6', .1, 'snow']],
      figs: [{ x: .5, on: 2, h: 1.2, kind: 'full', model: 'vest', color: 'moss', lift: .6 }], flakes: 20, wind: .1, rim: '#FFFFFF', rimDir: 1 },
    l5: { seed: 83, city: 'glass', sky: [[0, '#0B1018'], [.6, '#141C2A'], [1, '#1E2635']],
      figs: [{ x: .5, h: .66, kind: 'full', model: 'jacket', color: 'basalt', ground: .93 }], flakes: 90, wind: .25, rim: '#FFC08A', rimDir: -1 },
    l6: { seed: 89, sky: [[0, '#22304A'], [.55, '#6A7C98'], [.86, '#C9B6B0']], sun: [.25, .82, .45, '#F3C6B0', .4], pal: DAWN,
      L: [[.66, .08, 2, '#7D8AA2', .75], [.72, .06, 3, '#5E6C86', .5, 'trees'], [.82, .04, 2, '#BFC9D8', .2, 'snow']],
      figs: [{ x: .54, on: 2, h: 1.28, kind: 'full', model: 'cropW', color: 'frost', turn: .82, lift: .6, hair: 1 }], flakes: 60, wind: .3, rim: '#F6D2C2', rimDir: -1 },
    l7: { seed: 97, sky: [[0, '#172030'], [.5, '#3E3550'], [.76, '#CF5F38'], [.82, '#E46A3A']], sun: [.7, .8, .5, '#FF9050', .55], pal: DUSK,
      L: [[.7, .09, 2.2, '#5A4860', .75], [.76, .08, 3, '#40364C', .5, 'trees'], [.85, .07, 2, '#2C2B3A', .12, 'snow', [.42, .05, .3]], [.97, .04, 3, '#1E1E29', 0, 'snow']],
      figs: [{ x: .44, on: 2, h: .52, kind: 'full', model: 'hoodyW', color: 'ember', women: 1 }], flakes: 100, wind: .3, rim: '#FF9A62', rimDir: 1, fg: 'flake' },
    l8: { seed: 101, sky: [[0, '#A3ADB5'], [1, '#DCE0E2']], pal: GREY, blurTrees: '#7E8A93',
      L: [], figs: [{ kind: 'chest', model: 'cropW', color: 'moss' }], flakes: 160, wind: .6, rim: '#F4F6F7', rimDir: -1 },
    l9: { seed: 107, sky: [[0, '#B8C0C6'], [.7, '#C4CBD0'], [1, '#CDD3D7']], pal: GREY,
      L: [[.6, .08, 2, '#A9B2B9', .75], [.7, .07, 2.4, '#97A1A9', .5], [.82, .06, 2, '#D2D8DC', .2, 'snow', [.5, .05, .35]]],
      figs: [{ x: .42, on: 2, h: .3, kind: 'full', model: 'hoodyW', color: 'frost', women: 1, haze: .18 }, { x: .56, on: 2, h: .31, kind: 'full', model: 'hoodyW', color: 'dawn', women: 1, haze: .18, walk: 1 }],
      flakes: 60, wind: .2, rim: '#F2F4F5', rimDir: 1, flat: 1 },
    l10: { seed: 113, city: 'stairs', sky: [[0, '#0A0F17'], [.6, '#131A27'], [1, '#1A2231']],
      figs: [{ x: .5, h: .6, kind: 'full', model: 'hoodyW', color: 'dawn', women: 1, step: 1, ground: .8 }], flakes: 140, wind: .3, rim: '#FFC892', rimDir: 1 },
    full: { seed: 131, sky: [[0, '#10151F'], [.5, '#2B2A3F'], [.68, '#5A3A44'], [.73, '#E8622C'], [.75, '#9A4A3A']], sun: [.62, .74, .4, '#F07A40', .5], pal: DUSK, wide: 1,
      L: [[.7, .08, 3, '#4A3C52', .75], [.74, .07, 4, '#34303F', .5, 'trees'], [.8, .1, 2.2, '#2A2A38', .2, 'snow', [.25, .12, .22]], [.9, .035, 1.2, '#14151C', 0, 'dark', 0, -.3]],
      figs: [{ x: .27, on: 2, h: .44, kind: 'full', model: 'hoody', color: 'ember', turn: .86 }], flakes: 160, wind: .35, rim: '#FF8C54', rimDir: 1, fg: 'flake' }
  };

  function css(id) {
    var s = SC[id]; if (!s) return '';
    return 'linear-gradient(180deg,' + s.sky.map(function (k) { return k[1] + ' ' + Math.round(k[0] * 100) + '%'; }).join(',') + ')';
  }

  /* ---------- 능선 ---------- */
  function ridgeFn(l, w, h, seed, wide) {
    var n = vnoise(seed), f = l[2] * (wide ? 1.6 : 1), pk = l[6];
    return function (px) {
      var u = px / w, v = fbm(n, u * f * 3, 4);
      var ridged = 1 - Math.abs(2 * v - .9);
      var y = l[0] - l[1] * (v * .6 + ridged * .55);
      if (pk) y -= pk[1] * Math.exp(-Math.pow((u - pk[0]) / pk[2], 2));
      if (l[7]) y += l[7] * (u - .5);
      return y * h;
    };
  }
  function drawLayer(x, l, Y, w, h, s, r, sc) {
    var horizon = hex(sc.sky[sc.sky.length - 1][1]), base = hex(l[3]), hz = l[4], kind = l[5];
    var top = mix(base, horizon, hz), bot = mix(mix(base, [0, 0, 0], .25), horizon, hz * .8);
    x.beginPath(); x.moveTo(0, h);
    for (var px = 0; px <= w + 4; px += Math.max(2, w / 220)) x.lineTo(px, Y(px));
    x.lineTo(w, h); x.closePath();
    var minY = l[0] * h - l[1] * h * 1.4, g = x.createLinearGradient(0, minY, 0, h);
    if (kind === 'snow') {
      var P = sc.pal, sl = hex(P.snowL), ss = hex(P.snowS);
      g.addColorStop(0, rgba(mix(sl, horizon, hz * .5))); g.addColorStop(.1, rgba(mix(mix(sl, ss, .35), horizon, hz * .5))); g.addColorStop(.42, rgba(mix(ss, base, .15))); g.addColorStop(1, rgba(mix(ss, base, .5)));
    } else { g.addColorStop(0, rgba(top)); g.addColorStop(1, rgba(bot)); }
    x.fillStyle = g; x.fill();
    if (kind === 'snow' || kind === 'dark') {
      // 햇빛 쪽은 밝게, 반대쪽은 청보라 그늘
      x.save(); x.clip();
      var sd = sc.rimDir || 1, sg = x.createLinearGradient(sd < 0 ? 0 : w, 0, sd < 0 ? w : 0, 0);
      sg.addColorStop(0, rgba(hex(sc.pal ? sc.pal.snowL : '#ffffff'), kind === 'dark' ? .05 : .22)); sg.addColorStop(.6, 'rgba(0,0,0,0)'); sg.addColorStop(1, rgba(hex(sc.pal ? sc.pal.snowS : '#000000'), .25));
      x.fillStyle = sg; x.fillRect(0, minY, w, h - minY);
      // 눈 덮인 사면의 결: 능선 법선 방향의 짧은 밝은 획 + 바람 결(사스트루기) + 드문 바위
      var n = kind === 'dark' ? 60 : 150, unit = h / 900;
      for (var i = 0; i < n; i++) {
        var ax = r() * w, ay = Y(ax), d = Math.pow(r(), 1.8) * (h - ay) * .7, yy = ay + 2 + d;
        var sl2 = (Y(ax + 6) - Y(ax - 6)) / 12, nx = -sl2, ny = 1, nl = Math.hypot(nx, ny), len = (3 + r() * 6) * unit * (1 + d / h * 2);
        x.strokeStyle = kind === 'dark' ? 'rgba(120,130,160,' + (.04 + r() * .05) + ')' : 'rgba(255,255,255,' + (.05 + r() * .12) + ')';
        x.lineWidth = Math.max(.6, unit * (.6 + r() * .8)); x.beginPath(); x.moveTo(ax, yy); x.lineTo(ax + nx / nl * len, yy + ny / nl * len); x.stroke();
      }
      for (i = 0; i < (kind === 'dark' ? 14 : 34); i++) {
        var sx0 = r() * w, sL = w * (.08 + r() * .3), dd = 4 * unit + Math.pow(r(), 1.4) * (h - Y(sx0)) * .8, wob = r() * 6;
        x.beginPath();
        for (var q = 0; q <= 1.001; q += .05) { var qx = sx0 + q * sL; x[q ? 'lineTo' : 'moveTo'](qx, Y(qx) + dd + Math.sin(q * 6 + wob) * 3 * unit); }
        x.strokeStyle = 'rgba(40,46,86,' + (.06 + r() * .08) + ')'; x.lineWidth = unit * (1 + r() * 1.6); x.stroke();
        x.save(); x.translate(0, 1.6 * unit); x.strokeStyle = 'rgba(255,255,255,' + (kind === 'dark' ? .03 : .08 + r() * .08) + ')'; x.lineWidth = unit; x.stroke(); x.restore();
      }
      for (i = 0; i < (kind === 'dark' ? 3 : 6); i++) {
        var rx = r() * w, ry = Y(rx) + 4 * unit + r() * (h - Y(rx)) * .35, rs = (3 + r() * 7) * unit * (1 + (ry / h - .7) * 2);
        x.fillStyle = 'rgba(24,22,30,' + (.35 + r() * .3) + ')';
        x.beginPath(); x.moveTo(rx - rs, ry + rs * .3); x.lineTo(rx - rs * .3, ry - rs * .5); x.lineTo(rx + rs * .4, ry - rs * .35); x.lineTo(rx + rs, ry + rs * .3); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(rx - rs * .4, ry - rs * .5, rs * .7, Math.max(1, rs * .14));
      }
      x.restore();
    }
    if (kind === 'trees') {
      // 침엽수 실루엣 띠: 작은 삼각 톱니 묶음
      var tc = rgba(mix(mix(base, [0, 0, 0], .35), horizon, hz * .7)), tu = h / 900;
      x.fillStyle = tc;
      for (var t = 0; t < 70; t++) {
        var tx = r() * w, cl = 2 + (r() * 6 | 0);
        for (var c = 0; c < cl; c++) {
          var cx = tx + c * (4 + r() * 6) * tu, cy = Y(cx) + (6 + r() * 26) * tu, th = (8 + r() * 18) * tu;
          x.beginPath(); x.moveTo(cx, cy - th); x.lineTo(cx + th * .28, cy); x.lineTo(cx - th * .28, cy); x.closePath(); x.fill();
        }
      }
    }
  }
  function mist(x, y, w, h, col, r, a) {
    for (var i = 0; i < 5; i++) {
      var cx = r() * w, rw = w * (.4 + r() * .5), rh = h * (.025 + r() * .045);
      x.save(); x.translate(cx, y + (r() - .5) * h * .04); x.scale(1, rh / rw);
      var g = x.createRadialGradient(0, 0, 0, 0, 0, rw); g.addColorStop(0, rgba(col, a * (.5 + r() * .5))); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(-rw, -rw, rw * 2, rw * 2); x.restore();
    }
  }

  /* ---------- 인물 (설계 좌표: 재킷 1000×1200 틀, 바닥 y=1850) ---------- */
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function cyl(x, x0, x1, y0, y1, c, k) {
    var g = x.createLinearGradient(x0, 0, x1, 0), d = rgba(mix(c, [0, 0, 0], .45)), m = rgba(c), l = rgba(mix(c, [255, 255, 255], k || .12));
    g.addColorStop(0, d); g.addColorStop(.35, m); g.addColorStop(.55, l); g.addColorStop(.8, m); g.addColorStop(1, d); return g;
  }
  function legs(x, f, r) {
    var pc = hex(f.women ? '#272A31' : '#24272D');
    [[0, -1], [1, 1]].forEach(function (s) {
      var side = s[0], m = s[1], cx = side ? 592 : 408, o = m * 16;
      x.save();
      if (f.walk && side === (f.walk === 1 ? 0 : 1)) { x.translate(cx, 1300); x.rotate(-m * .07); x.translate(-cx, -1300 + 30); }
      if (f.step && side) x.translate(0, -150);
      // 허벅지 → 무릎 → 종아리 → 발목에서 주름이 쌓이는 바짓단(A자로 살짝 벌린 자세)
      var p = new Path2D('M ' + (cx - 94) + ' 960 L ' + (cx + 90) + ' 960 C ' + (cx + 88) + ' 1120 ' + (cx + 74 + o) + ' 1300 ' + (cx + 66 + o) + ' 1390 C ' + (cx + 70 + o) + ' 1480 ' + (cx + 60 + o) + ' 1620 ' + (cx + 52 + o) + ' 1700 L ' + (cx + 60 + o) + ' 1770 L ' + (cx - 60 + o) + ' 1770 L ' + (cx - 52 + o) + ' 1700 C ' + (cx - 62 + o) + ' 1600 ' + (cx - 70 + o) + ' 1480 ' + (cx - 66 + o) + ' 1390 C ' + (cx - 76 + o) + ' 1280 ' + (cx - 92) + ' 1120 ' + (cx - 94) + ' 960 Z');
      x.fillStyle = cyl(x, cx - 96, cx + 92, 0, 0, pc, .14); x.fill(p);
      x.save(); x.clip(p);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(cx - 100, 1600, 200, 200);
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 5;
      for (var i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx - 52 + o * .5, 1370 + i * 22); x.quadraticCurveTo(cx + o * .5, 1352 + i * 22 + r() * 10, cx + 50 + o * .5, 1374 + i * 20); x.stroke(); }
      for (i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx - 56 + o, 1712 + i * 18); x.quadraticCurveTo(cx + o, 1700 + i * 18, cx + 56 + o, 1714 + i * 18); x.stroke(); }
      x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx + m * 30, 990); x.quadraticCurveTo(cx + m * 24 + o, 1400, cx + m * 18 + o, 1700); x.stroke(); x.restore();
      // 등산화 뒤축
      var bx = cx + o;
      var bt = new Path2D('M ' + (bx - 56) + ' 1748 Q ' + (bx - 66) + ' 1800 ' + (bx - 64) + ' 1832 L ' + (bx - 68) + ' 1848 Q ' + bx + ' 1862 ' + (bx + 68) + ' 1848 L ' + (bx + 64) + ' 1832 Q ' + (bx + 66) + ' 1800 ' + (bx + 56) + ' 1748 Q ' + bx + ' 1734 ' + (bx - 56) + ' 1748 Z');
      var bg = x.createLinearGradient(bx - 66, 0, bx + 66, 0); bg.addColorStop(0, '#1C1916'); bg.addColorStop(.45, '#4A4036'); bg.addColorStop(1, '#201C19');
      x.fillStyle = bg; x.fill(bt);
      x.fillStyle = '#5A5047'; x.beginPath(); x.moveTo(bx - 68, 1834); x.quadraticCurveTo(bx, 1846, bx + 68, 1834); x.lineTo(bx + 70, 1850); x.quadraticCurveTo(bx, 1866, bx - 70, 1850); x.fill();
      x.fillStyle = '#121110'; x.beginPath(); x.moveTo(bx - 70, 1850); x.quadraticCurveTo(bx, 1866, bx + 70, 1850); x.lineTo(bx + 68, 1858); x.quadraticCurveTo(bx, 1874, bx - 68, 1858); x.fill();
      x.fillStyle = '#E8561E'; x.fillRect(bx - 5, 1752, 10, 26);
      x.restore();
    });
  }
  function gloves(x, g, col) {
    ['sleeveL', 'sleeveR'].forEach(function (k) {
      var p = g.parts[k]; if (!p) return;
      var M = p.M, c = [26, 670], px = M[0] * c[0] + M[2] * c[1] + M[4], py = M[1] * c[0] + M[3] * c[1] + M[5];
      var gg = x.createRadialGradient(px - 14, py - 20, 4, px, py, 70); gg.addColorStop(0, col || '#3A3D42'); gg.addColorStop(1, '#141518');
      x.fillStyle = gg; x.beginPath(); x.ellipse(px, py + 8, 46, 66, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.ellipse(px - 12, py - 8, 14, 30, 0, 0, 7); x.fill();
    });
  }
  function backpack(x) {
    var c = hex('#2B2F35');
    x.strokeStyle = '#17191C'; x.lineWidth = 46; x.lineCap = 'round';
    [[392, 1], [608, -1]].forEach(function (s) { x.beginPath(); x.moveTo(s[0], 340); x.quadraticCurveTo(s[0] - s[1] * 10, 270, s[0] - s[1] * 34, 250); x.stroke(); });
    x.fillStyle = cyl(x, 356, 644, 0, 0, c, .16); rr(x, 356, 304, 288, 494, 72); x.fill();
    x.save(); rr(x, 356, 304, 288, 494, 72); x.clip();
    var vg = x.createLinearGradient(0, 300, 0, 800); vg.addColorStop(0, 'rgba(255,255,255,.06)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = vg; x.fillRect(350, 300, 300, 500);
    x.fillStyle = rgba(mix(c, [255, 255, 255], .07)); rr(x, 366, 286, 268, 120, 50); x.fill();
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(356, 404, 288, 8);
    x.fillStyle = '#15171A'; x.fillRect(356, 520, 288, 22); x.fillRect(356, 660, 288, 22);
    x.fillStyle = '#5C6168'; rr(x, 488, 516, 24, 30, 5); x.fill(); rr(x, 488, 656, 24, 30, 5); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 3; x.beginPath(); x.moveTo(380, 430); x.lineTo(380, 760); x.stroke();
    x.restore();
    x.strokeStyle = '#1F2125'; x.lineWidth = 8; x.beginPath(); x.moveTo(470, 292); x.quadraticCurveTo(500, 250, 530, 292); x.stroke();
  }
  function head(x, f) {
    // 뒷머리와 비니(얼굴 없음). 묶은 머리는 목덜미로 내려오는 꼬리.
    var hair = '#1C1714';
    x.fillStyle = hair; x.beginPath(); x.ellipse(500, 118, 90, 112, 0, 0, 7); x.fill();
    x.fillRect(452, 150, 96, 80);
    if (f.hair) {
      x.fillStyle = '#2A201B'; x.beginPath(); x.ellipse(500, 62, 92, 72, 0, Math.PI, 0); x.fill();
      x.beginPath(); x.moveTo(486, 120); x.quadraticCurveTo(470, 200, 494, 262); x.quadraticCurveTo(516, 266, 520, 240); x.quadraticCurveTo(530, 170, 514, 120); x.closePath(); x.fill();
      x.fillStyle = '#4A3A30'; x.beginPath(); x.ellipse(500, 124, 22, 14, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 3; for (var i = 0; i < 6; i++) { x.beginPath(); x.moveTo(440 + i * 22, 20); x.quadraticCurveTo(470 + i * 10, 80, 495 + i * 2, 120); x.stroke(); }
      return;
    }
    var bc = hex('#34373D');
    x.fillStyle = cyl(x, 406, 594, 0, 0, bc, .14); x.beginPath(); x.moveTo(408, 120); x.bezierCurveTo(404, -10, 596, -10, 592, 120); x.closePath(); x.fill();
    x.fillStyle = rgba(mix(bc, [255, 255, 255], .05)); rr(x, 404, 92, 192, 44, 18); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 3;
    for (var k = 414; k < 590; k += 9) { x.beginPath(); x.moveTo(k, 30 + Math.abs(500 - k) * .5); x.lineTo(k, 134); x.stroke(); }
  }
  function innerArms(x) {
    var c = hex('#3A3E44');
    [[300, 1], [700, -1]].forEach(function (s) {
      x.save(); x.translate(s[0], 262); x.rotate(s[1] * .1);
      x.fillStyle = cyl(x, -70, 60, 0, 0, c, .12); rr(x, -66, 0, 122, 640, 50); x.fill(); x.restore();
    });
  }

  function figure(f, k, sc) {
    var S = Math.max(.05, Math.round(k * 400) / 400), J = SRJ.jacket;
    var c = cv(1100 * S, 1960 * S), x = c.getContext('2d'), r = rng(sc.seed + 5);
    var arm = f.walk ? 10 : 7, g = J.build(f.model, 'back', 'worn', arm);
    x.setTransform(S, 0, 0, S, 50 * S, 60 * S);
    if (f.model === 'vest') { innerArms(x); }
    legs(x, f, r);
    gloves(x, g, f.model === 'vest' ? '#2F3237' : null);
    if (f.model === 'vest') {
      // 베스트 안의 플리스 소매 끝에 장갑
      [[300, 1], [700, -1]].forEach(function (s) { x.fillStyle = '#25282C'; x.beginPath(); x.ellipse(s[0] - s[1] * 70, 262 + 660, 46, 66, 0, 0, 7); x.fill(); });
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    var jl = J.layer({ model: f.model, color: f.color, view: 'back', pose: 'worn', armAngle: arm, light: { x: (sc.rimDir || 1) * .3 }, glossK: .5 }, S);
    x.drawImage(jl, Math.round(50 * S), Math.round(60 * S));
    x.setTransform(S, 0, 0, S, 50 * S, 60 * S);
    if (f.pack) backpack(x);
    if (!J.MODELS[f.model].hood) head(x, f);
    x.setTransform(1, 0, 0, 1, 0, 0);
    return { c: c, ax: 550 * S, ay: 1910 * S, S: S };
  }

  // 주변광: 장면의 빛 색을 인물에 곱해 배경과 같은 공기 안에 놓는다
  function cast(F, sc) {
    var c = sc.city ? '#A3AEC6' : sc.pal && sc.pal.cast; if (!c) return;
    var t = cv(F.width, F.height), tx = t.getContext('2d'); tx.fillStyle = c; tx.fillRect(0, 0, t.width, t.height);
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(F, 0, 0);
    var x = F.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .55; x.drawImage(t, 0, 0); x.restore();
  }
  // 림 라이트: 해 쪽 가장자리에 하늘 광색을 screen, 반대쪽은 multiply로 12% 어둡게
  function rim(F, col, dir, px) {
    var w = F.width, h = F.height, x = F.getContext('2d'), m = cv(w, h), mx = m.getContext('2d');
    mx.fillStyle = col; mx.fillRect(0, 0, w, h);
    mx.globalCompositeOperation = 'destination-in'; mx.drawImage(F, 0, 0);
    mx.globalCompositeOperation = 'destination-out'; mx.drawImage(F, -dir * px, px * .4);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
    var sg = x.createLinearGradient(0, 0, w, 0); sg.addColorStop(dir < 0 ? 1 : 0, 'rgba(0,0,0,.2)'); sg.addColorStop(.55, 'rgba(0,0,0,0)');
    x.fillStyle = sg; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = .9; x.drawImage(m, 0, 0); x.restore();
    return m;
  }

  /* ---------- 장면 유형별 특수 구도 ---------- */
  function chest(x, w, h, f, sc, r) {
    // 목 아래 크롭: 칼라 앞면에서 자르고, 어깨는 화면 밖으로 살짝 나가게(마네킹이 아니라 사람)
    var J = SRJ.jacket, k = h / 560, S = Math.round(k * 400) / 400, d = sc.rimDir || 1;
    var jl = J.layer({ model: f.model, color: f.color, view: 'front', pose: 'worn', armAngle: -3, sleeveLen: .84, light: { x: d * .35 }, glossK: .7 }, S);
    var F = cv(jl.width, jl.height), fx = F.getContext('2d'); fx.drawImage(jl, 0, 0); cast(F, sc);
    fx.globalCompositeOperation = 'source-atop';
    var vg = fx.createLinearGradient(0, 0, F.width, 0); vg.addColorStop(d > 0 ? 0 : 1, 'rgba(6,10,24,.38)'); vg.addColorStop(.6, 'rgba(6,10,24,0)');
    fx.fillStyle = vg; fx.fillRect(0, 0, F.width, F.height);
    var halo = rim(F, sc.rim, d, Math.max(2, w / 220));
    x.save(); x.translate(w / 2, h / 2); x.rotate(-.025 * d); x.translate(-w / 2, -h / 2);
    var ox = (w - jl.width) / 2, oy = -205 * S;
    x.globalAlpha = .6; x.globalCompositeOperation = 'screen'; x.drawImage(halo, ox + d * 2, oy);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.drawImage(F, ox, oy); x.restore();
  }
  function still(x, w, h, f, sc, r) {
    // 해 뜬 직후 역광. 바위 턱 위에 놓인 수납 주머니와 장갑 한 켤레, 배경은 크게 흐림
    var u = h / 1000, top = function (px) { var t = px / w; return h * (.7 - .05 * t + .012 * Math.sin(t * 9 + 1) + .008 * Math.sin(t * 23)); };
    var rock = new Path2D(); rock.moveTo(0, h); for (var px = 0; px <= w; px += 6) rock.lineTo(px, top(px)); rock.lineTo(w, h); rock.closePath();
    var rg = x.createLinearGradient(0, h * .64, 0, h); rg.addColorStop(0, '#8C7B72'); rg.addColorStop(.1, '#6A5D58'); rg.addColorStop(.32, '#3E3638'); rg.addColorStop(1, '#141316');
    x.fillStyle = rg; x.fill(rock);
    x.save(); x.clip(rock);
    // 화강암 결: 밝고 어두운 작은 점 + 갈라진 틈
    for (var i = 0; i < 1400; i++) { var a = r(); x.fillStyle = a < .5 ? 'rgba(255,236,214,' + (r() * .16) + ')' : 'rgba(0,0,0,' + (r() * .28) + ')'; var sz = (1 + r() * 2.5) * u; x.fillRect(r() * w, h * .66 + r() * h * .34, sz, sz * (.6 + r() * .6)); }
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.5 * u;
    for (i = 0; i < 7; i++) { var cx = r() * w, cy = h * (.76 + r() * .2); x.beginPath(); x.moveTo(cx, cy); for (var j = 0; j < 5; j++) { cx += (r() - .3) * 50 * u; cy += (r() - .5) * 18 * u; x.lineTo(cx, cy); } x.stroke(); }
    var fog = x.createLinearGradient(0, h * .66, 0, h * .8); fog.addColorStop(0, 'rgba(255,190,140,.16)'); fog.addColorStop(1, 'rgba(255,190,140,0)'); x.fillStyle = fog; x.fillRect(0, h * .6, w, h * .3);
    x.restore();
    // 윗면에 얹힌 눈 + 역광에 빛나는 가장자리
    x.beginPath(); for (px = 0; px <= w; px += 6) x.lineTo(px, top(px) - (3 + 3 * Math.sin(px / w * 13)) * u);
    for (px = w; px >= 0; px -= 6) x.lineTo(px, top(px) + (6 + 8 * Math.abs(Math.sin(px / w * 7))) * u);
    var sg = x.createLinearGradient(0, h * .64, 0, h * .74); sg.addColorStop(0, '#FFF1E2'); sg.addColorStop(1, '#8E8AA2'); x.fillStyle = sg; x.fill();
    x.beginPath(); for (px = 0; px <= w; px += 6) x.lineTo(px, top(px) - (3 + 3 * Math.sin(px / w * 13)) * u);
    x.strokeStyle = 'rgba(255,214,170,.9)'; x.lineWidth = 2.2 * u; x.stroke();
    // 수납 주머니: 접촉 그림자 → 주머니(림 라이트)
    var pk = SRJ.jacket.packLayer(f.color, Math.round(w * .6)), pw = pk.width, ph = pk.height, ppx = w * .1, base = top(ppx + pw * .5), ppy = base - ph * .9;
    var sh = cv(64, 16), shx = sh.getContext('2d'), sgr = shx.createRadialGradient(32, 8, 0, 32, 8, 30); sgr.addColorStop(0, 'rgba(8,6,14,.75)'); sgr.addColorStop(1, 'rgba(8,6,14,0)');
    shx.setTransform(1, 0, 0, .25, 0, 6); shx.fillStyle = sgr; shx.fillRect(0, 0, 64, 64);
    x.drawImage(sh, ppx - pw * .05, base - ph * .16, pw * 1.1, ph * .34);
    var F = cv(pw, ph); F.getContext('2d').drawImage(pk, 0, 0); var halo = rim(F, sc.rim, 1, Math.max(2, w / 200));
    x.save(); x.translate(ppx + pw / 2, ppy + ph / 2); x.rotate(-.05); x.translate(-pw / 2, -ph / 2);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = .7; x.drawImage(halo, 2, -1); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.drawImage(F, 0, 0); x.restore();
    // 장갑 한 켤레: 바위에 손바닥을 대고 누운 손 모양(손가락 넷, 엄지, 소맷부리), 낮은 시점이라 세로로 눌린다
    var glove = new Path2D('M -128 -40 L -60 -46 L -56 -58 C -40 -96 -6 -112 18 -100 C 30 -92 20 -74 4 -62 L 26 -54 L 96 -58 C 116 -58 118 -40 100 -38 L 34 -34 L 108 -28 C 128 -26 128 -6 108 -6 L 34 -6 L 106 2 C 124 4 122 24 104 24 L 32 20 L 92 32 C 108 36 104 54 88 52 L 20 44 L -60 46 L -128 40 Z');
    [[w * .74, .06, 1.02, '#2A2D32'], [w * .8, -.1, .98, '#34373C']].forEach(function (gp, gi) {
      var gy = top(gp[0]) - 4 * u, s = u * .9 * gp[2];
      x.save(); x.translate(gp[0], gy); x.rotate(gp[1]); x.scale(s, s * .42);
      x.fillStyle = 'rgba(8,6,14,.55)'; x.beginPath(); x.ellipse(0, 40, 140, 40, 0, 0, 7); x.fill();
      var gg = x.createLinearGradient(0, -110, 0, 56); gg.addColorStop(0, '#5C5F66'); gg.addColorStop(.35, gp[3]); gg.addColorStop(1, '#121316'); x.fillStyle = gg; x.fill(glove);
      x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-60, -46); x.lineTo(-60, 46); x.stroke();
      x.fillStyle = '#E8561E'; x.fillRect(-128, -14, 14, 28);
      x.strokeStyle = 'rgba(255,214,170,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-126, -40); x.lineTo(-60, -46); x.lineTo(-56, -58); x.bezierCurveTo(-40, -96, -6, -112, 18, -100); x.stroke();
      x.restore();
    });
    // 역광에 반짝이는 앞쪽 눈 결정(초점 밖)
    for (i = 0; i < 14; i++) { var bx = r() * w, by = h * (.82 + r() * .18), br = (6 + r() * 20) * u, bgg = x.createRadialGradient(bx, by, 0, bx, by, br); bgg.addColorStop(0, 'rgba(255,220,180,.4)'); bgg.addColorStop(.7, 'rgba(255,220,180,.18)'); bgg.addColorStop(1, 'rgba(255,220,180,0)'); x.fillStyle = bgg; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
  }
  function city(x, w, h, sc, r) {
    var u = h / 1000;
    // 흐린 가로등 불빛 원 5~7개(보케)
    var lights = sc.city === 'glass' ? 7 : 5;
    for (var i = 0; i < lights; i++) {
      var bx = r() * w, by = h * (.12 + r() * .45), br = (30 + r() * 70) * u, warm = r() < .7;
      var bg = x.createRadialGradient(bx, by, br * .1, bx, by, br);
      var c = warm ? '255,178,102' : '150,180,214';
      bg.addColorStop(0, 'rgba(' + c + ',.5)'); bg.addColorStop(.8, 'rgba(' + c + ',.34)'); bg.addColorStop(.95, 'rgba(' + c + ',.42)'); bg.addColorStop(1, 'rgba(' + c + ',0)');
      x.globalCompositeOperation = 'screen'; x.fillStyle = bg; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
      x.fillStyle = 'rgba(' + c + ',.08)'; x.fillRect(bx - br * .2, h * .9, br * .4, h * .1);
    }
    x.globalCompositeOperation = 'source-over';
    if (sc.city === 'glass') {
      // 정류장 유리벽: 세로 프레임 + 유리 반사
      var gy0 = h * .16, gy1 = h * .9;
      x.fillStyle = 'rgba(160,190,220,.05)'; x.fillRect(0, gy0, w, gy1 - gy0);
      for (var m = 0; m < 4; m++) {
        var mxp = w * (.08 + m * .29);
        x.fillStyle = '#07090D'; x.fillRect(mxp - 5 * u, gy0, 10 * u, gy1 - gy0);
        x.fillStyle = 'rgba(255,200,150,.25)'; x.fillRect(mxp + 4 * u, gy0, 1.5 * u, gy1 - gy0);
      }
      x.fillStyle = '#07090D'; x.fillRect(0, gy0 - 8 * u, w, 14 * u); x.fillRect(0, gy1 - 4 * u, w, 10 * u);
      x.save(); x.globalCompositeOperation = 'screen';
      for (m = 0; m < 3; m++) { var sg = x.createLinearGradient(0, 0, w, h); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(200,220,255,.05)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = sg; x.beginPath(); var ox = w * (.1 + m * .3); x.moveTo(ox, gy0); x.lineTo(ox + w * .08, gy0); x.lineTo(ox - w * .1, gy1); x.lineTo(ox - w * .18, gy1); x.fill(); }
      x.restore();
      var gr = x.createLinearGradient(0, gy1, 0, h); gr.addColorStop(0, '#1A1F28'); gr.addColorStop(1, '#0C0F14'); x.fillStyle = gr; x.fillRect(0, gy1 + 6 * u, w, h);
      x.fillStyle = 'rgba(230,236,242,.5)'; x.fillRect(0, gy1 + 6 * u, w, 3 * u);
    } else {
      // 눈 쌓인 계단: 위로 갈수록 좁아지는 단 + 난간
      var top = h * .3;
      for (var s = 0; s < 14; s++) {
        var t0 = Math.pow(s / 14, 1.5), t1 = Math.pow((s + 1) / 14, 1.5), y0 = top + (h - top) * t0, y1 = top + (h - top) * t1;
        var rg = x.createLinearGradient(0, y0, 0, y1); rg.addColorStop(0, '#B9C3CE'); rg.addColorStop(.1, '#6E7A8A'); rg.addColorStop(.18, '#1C222C'); rg.addColorStop(1, '#10141B');
        x.fillStyle = rg; x.fillRect(w * .08 - t0 * w * .1, y0, w * .84 + t0 * w * .2, y1 - y0 + 1);
        for (var q = 0; q < 8; q++) { x.fillStyle = 'rgba(255,255,255,' + r() * .2 + ')'; x.fillRect(r() * w, y0 + r() * (y1 - y0) * .2, 3 + r() * 20 * u, 1 + u); }
      }
      var wl = x.createLinearGradient(0, 0, w * .2, 0); wl.addColorStop(0, '#07090D'); wl.addColorStop(1, 'rgba(7,9,13,0)');
      x.fillStyle = wl; x.beginPath(); x.moveTo(0, top); x.lineTo(w * .1, top); x.lineTo(w * -.04, h); x.lineTo(0, h); x.fill();
      x.strokeStyle = '#05070A'; x.lineWidth = 7 * u; x.beginPath(); x.moveTo(w * .86, h * .22); x.lineTo(w * 1.02, h * .95); x.stroke();
      x.strokeStyle = 'rgba(255,200,150,.35)'; x.lineWidth = 1.5 * u; x.beginPath(); x.moveTo(w * .86 - 3 * u, h * .22); x.lineTo(w * 1.02 - 3 * u, h * .95); x.stroke();
      for (q = 0; q < 4; q++) { var yy = h * (.3 + q * .18); x.strokeStyle = '#05070A'; x.lineWidth = 5 * u; x.beginPath(); x.moveTo(w * (.88 + q * .035), yy); x.lineTo(w * (.88 + q * .035), yy + h * .12); x.stroke(); }
    }
  }

  /* ---------- 본 렌더 ---------- */
  function render(canvas, id) {
    var sc = SC[id]; if (!sc) return;
    var w = canvas.width, h = canvas.height, x = canvas.getContext('2d'), r = rng(sc.seed);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    // 1. 하늘 + 해/달 주변 광
    var g = x.createLinearGradient(0, 0, 0, h); sc.sky.forEach(function (k) { g.addColorStop(k[0], k[1]); }); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (sc.sun) {
      var s = sc.sun, rg = x.createRadialGradient(w * s[0], h * s[1], 0, w * s[0], h * s[1], Math.max(w, h) * s[2]);
      rg.addColorStop(0, rgba(hex(s[3]), s[4])); rg.addColorStop(.35, rgba(hex(s[3]), s[4] * .35)); rg.addColorStop(1, rgba(hex(s[3]), 0));
      x.globalCompositeOperation = 'screen'; x.fillStyle = rg; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    }
    var horizon = hex(sc.sky[sc.sky.length - 1][1]);
    // 2~3. 능선 겹(먼 겹은 1/4 크기 → 확대) + 안개 띠
    var Ls = sc.L || [], far = cv(w / 4, h / 4), fx = far.getContext('2d'), Ys = [];
    fx.drawImage(canvas, 0, 0, w / 4, h / 4);
    Ls.forEach(function (l, i) {
      var Y = ridgeFn(l, w, h, sc.seed * 7 + i * 31, sc.wide); Ys.push(Y);
      if (l[4] >= .45) {
        fx.save(); fx.scale(.25, .25); drawLayer(fx, l, Y, w, h, .25, r, sc); mist(fx, l[0] * h, w, h, sc.pal ? hex(sc.pal.mist) : horizon, r, .3); fx.restore();
      }
    });
    if (sc.blurTrees) {
      // 크게 흐린 침엽수 배경(얕은 심도)
      for (var t = 0; t < 22; t++) {
        var tx = r() * w / 4, ty = h / 4 * (.1 + r() * .5), th = h / 4 * (.5 + r() * .8);
        fx.fillStyle = rgba(mix(hex(sc.blurTrees), horizon, r() * .5)); fx.beginPath(); fx.moveTo(tx, ty - th * .3);
        for (var tt = 0; tt < 6; tt++) { fx.lineTo(tx + th * .05 * (tt + 1), ty + th * tt / 6); fx.lineTo(tx + th * .02 * (tt + 1), ty + th * (tt + .5) / 6); }
        fx.lineTo(tx + th * .3, ty + th); fx.lineTo(tx - th * .3, ty + th);
        for (tt = 5; tt >= 0; tt--) { fx.lineTo(tx - th * .02 * (tt + 1), ty + th * (tt + .5) / 6); fx.lineTo(tx - th * .05 * (tt + 1), ty + th * tt / 6); }
        fx.fill();
      }
      for (t = 0; t < 9; t++) { var lx2 = r() * w / 4, ly = r() * h / 4 * .7, lr = h / 4 * (.02 + r() * .04), lg = fx.createRadialGradient(lx2, ly, 0, lx2, ly, lr); lg.addColorStop(0, rgba(mix(horizon, [255, 255, 255], .5), .6)); lg.addColorStop(1, rgba(horizon, 0)); fx.fillStyle = lg; fx.fillRect(lx2 - lr, ly - lr, lr * 2, lr * 2); }
    }
    var tiny = cv(w / 10, h / 10); tiny.getContext('2d').drawImage(far, 0, 0, w / 10, h / 10);
    x.imageSmoothingQuality = 'high';
    x.drawImage(sc.blurTrees || sc.figs[0].kind === 'still' ? tiny : far, 0, 0, w, h);
    if (sc.city) { city(x, w, h, sc, r); }
    var figDone = {};
    function drawFigs(layerIdx) {
      (sc.figs || []).forEach(function (f, fi) {
        if (figDone[fi] || (f.on != null && f.on !== layerIdx) || (f.on == null && layerIdx !== -1)) return;
        figDone[fi] = 1;
        if (f.kind === 'chest') return chest(x, w, h, f, sc, r);
        if (f.kind === 'still') return still(x, w, h, f, sc, r);
        var feetX = w * f.x, feetY = f.on != null ? Ys[f.on](feetX) + h * .012 : h * (f.ground || .9);
        feetY += (f.dy || 0) * h;
        if (f.lift) feetY = h * (1 + f.lift);
        var px = (h * f.h) / 1890, F = figure(f, px, sc), sx = F.c.width, sy = F.c.height, turn = f.turn || 1;
        cast(F.c, sc);
        var halo = rim(F.c, sc.rim, sc.rimDir || 1, Math.max(1.5, px * 4));
        if (f.haze) { var hx = F.c.getContext('2d'); hx.globalCompositeOperation = 'source-atop'; hx.fillStyle = rgba(horizon, f.haze); hx.fillRect(0, 0, sx, sy); }
        var dx = feetX - F.ax * turn, dy = feetY - F.ay;
        // 발밑 그림자: 해 반대쪽으로 길게 눕는 청보라
        if (!sc.city && !f.lift) {
          var sd = -(sc.rimDir || 1), len = h * f.h * .9;
          x.save(); x.translate(feetX, feetY); x.transform(1, 0, sd * 1.3, .22, 0, 0);
          var shg = x.createLinearGradient(0, 0, 0, len); shg.addColorStop(0, 'rgba(48,52,96,.42)'); shg.addColorStop(1, 'rgba(48,52,96,0)');
          x.fillStyle = shg; x.beginPath(); x.ellipse(0, len / 2, h * f.h * .09, len / 2, 0, 0, 7); x.fill(); x.restore();
          // 눈이 패인 발자국
          for (var fp = 1; fp < 7; fp++) {
            var fy = feetY + fp * h * f.h * .05 * (1 + fp * .25), fxp = feetX + (fp % 2 ? -1 : 1) * h * f.h * .035 + sd * fp * 2, fs = h * f.h * .018 * (1 + fp * .3);
            if (fy > h) break;
            x.fillStyle = 'rgba(40,46,80,.28)'; x.beginPath(); x.ellipse(fxp, fy, fs * 1.2, fs * .45, 0, 0, 7); x.fill();
            x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(fxp - sd * fs * .3, fy + fs * .2, fs, fs * .2, 0, 0, 7); x.fill();
          }
        }
        x.save(); x.translate(dx, dy); x.scale(turn, 1);
        x.globalAlpha = .55; x.globalCompositeOperation = 'screen'; x.drawImage(halo, (sc.rimDir || 1) * 1.5, 0);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.drawImage(F.c, 0, 0); x.restore();
      });
    }
    Ls.forEach(function (l, i) {
      if (l[4] < .45) { drawLayer(x, l, Ys[i], w, h, 1, r, sc); if (i < Ls.length - 1) mist(x, l[0] * h, w, h, sc.pal ? hex(sc.pal.mist) : horizon, r, .18); }
      drawFigs(i);
    });
    drawFigs(-1);
    // 4. 전경 흐림: 화면을 스치는 크고 흐린 눈송이
    if (sc.fg) {
      for (var q = 0; q < 2; q++) {
        var qx = r() * w, qy = h * (.55 + r() * .4), qr = Math.max(w, h) * (.03 + r() * .03), qg = x.createRadialGradient(qx, qy, 0, qx, qy, qr);
        qg.addColorStop(0, 'rgba(255,255,255,.1)'); qg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = qg; x.fillRect(qx - qr, qy - qr, qr * 2, qr * 2);
      }
    }
    // 5. 눈발: 바람 방향으로 늘인 점, 큰 것일수록 흐리게
    var unit = Math.max(w, h) / 900, n = sc.flakes || 120, wind = sc.wind || .3;
    for (var i = 0; i < n; i++) {
      var size = (1 + Math.pow(r(), 3) * 4) * unit, fx2 = r() * w, fy2 = r() * h, st = (3 + r() * 6) * unit * wind * 1.4, a = .5 + r() * .45;
      x.save(); x.translate(fx2, fy2); x.rotate(.35 + wind * .6); x.scale(1 + st / size * .5, 1);
      var sg = x.createRadialGradient(0, 0, 0, 0, 0, size); sg.addColorStop(0, 'rgba(255,255,255,' + a * (size > 3 * unit ? .55 : 1) + ')'); sg.addColorStop(size > 3 * unit ? .2 : .55, 'rgba(255,255,255,' + a * .5 + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg; x.fillRect(-size, -size, size * 2, size * 2); x.restore();
    }
    // 6. 색 보정(그림자 청록, 밝은 곳 주황), 비네트, 그레인. "코드 그림"을 "사진"으로 바꾸는 단계.
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = .25; x.fillStyle = '#0E2A33'; x.fillRect(0, 0, w, h);
    var og = x.createLinearGradient(0, 0, 0, h * .5); og.addColorStop(0, 'rgba(255,138,74,.12)'); og.addColorStop(1, 'rgba(255,138,74,0)');
    x.globalAlpha = 1; x.fillStyle = og; x.fillRect(0, 0, w, h * .5);
    x.globalCompositeOperation = 'source-over';
    var vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = .08 * 1.8; x.fillStyle = x.createPattern(U.noise(), 'repeat'); x.fillRect(0, 0, w, h);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }

  SRJ.scenes = { render: render, css: css, SC: SC };
})();
