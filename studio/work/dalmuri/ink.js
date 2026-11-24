/* 달무리 히어로: 먹 번짐 도메인 워핑 fbm + 고리 SDF. three 없이 WebGL 하나, 전체 화면 쿼드 한 장. */
(function () {
  'use strict';
  var canvas = document.querySelector('.hero__ink');
  var hero = document.querySelector('.hero');
  var fallback = document.querySelector('.hero__fallback');
  var copy = document.querySelector('.hero__copy');
  var bar = document.querySelector('.bar');
  if (!canvas || !hero || !copy) return;

  var SHOT = /[?&]shot=1/.test(location.search);
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var R_OPEN = 0.32;

  var geom = { cx: 0, cy: 0, m: 1, w: 1, h: 1, small: false };

  function computeGeom() {
    var W = canvas.clientWidth || window.innerWidth;
    var H = window.innerHeight;
    var r = copy.getBoundingClientRect();
    var sy = window.scrollY || 0;
    var barH = bar ? bar.offsetHeight : 64;
    var desktop = window.innerWidth >= 1024;
    var cx, cy, m;
    if (desktop) {
      // 왼쪽 2/3의 가운데. 글 묶음과 겹치면 고리를 왼쪽으로 옮긴다.
      var avail = r.left - 40;
      m = Math.min(H, W);
      cx = W / 3;
      var reach = R_OPEN * 1.22 * m;
      if (cx + reach > avail) {
        cx = Math.max(avail / 2, 1);
        m = Math.min(m, cx / (R_OPEN * 1.22));
      }
      cy = (barH + H) / 2;
    } else {
      // 모바일: 위쪽 가운데, 헤드라인 바로 위
      m = Math.min(W / 1.12, H * 0.4);
      cx = W / 2;
      cy = (barH + (r.top + sy)) / 2 + 4;
    }
    geom.cx = cx; geom.cy = cy; geom.m = m; geom.w = W; geom.h = canvas.clientHeight || H;
    geom.small = !desktop || !mqFine.matches;
    if (fallback) {
      fallback.style.setProperty('--cx', cx.toFixed(1) + 'px');
      fallback.style.setProperty('--cy', cy.toFixed(1) + 'px');
      fallback.style.setProperty('--r', (R_OPEN * m).toFixed(1) + 'px');
    }
  }

  var gl = null;
  try {
    if (window.WebGLRenderingContext) {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    }
  } catch (e) { gl = null; }

  function giveUp() {
    canvas.style.display = 'none';
    if (fallback) fallback.style.visibility = '';
    computeGeom();
    window.addEventListener('resize', debounce(computeGeom, 150), { passive: true });
  }
  if (!gl) { giveUp(); return; }

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  function frag(oct) {
    return [
      'precision highp float;',
      '#define OCT ' + oct,
      'uniform vec2 uRes;uniform vec2 uC;uniform float uM;uniform float uT;uniform float uR;',
      'uniform float uOpen;uniform float uS;uniform vec2 uP;uniform vec2 uDrag;uniform float uAmt;',
      'const vec3 BLACK=vec3(.0471,.0471,.0549);const vec3 CHAR=vec3(.1176,.1176,.1333);',
      'const vec3 MOON=vec3(.9569,.9451,.9098);const vec3 BRASS=vec3(.7255,.5922,.3569);',
      'float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
      'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.;float a=.5;mat2 r=mat2(1.6,1.2,-1.2,1.6);',
      ' for(int i=0;i<OCT;i++){v+=a*noise(p);p=r*p+vec2(3.1,1.7);a*=.5;}return v;}',
      'void main(){',
      ' vec2 p=(gl_FragCoord.xy-uC)/uM;',
      // 포인터 근처의 좌표를 끌어 먹이 따라오게 한다
      ' vec2 dp=p-uP;float fall=exp(-dot(dp,dp)*8.);',
      ' p-=(uDrag+normalize(dp+1e-4)*.25)*.08*fall*uAmt;',
      ' float t=uT;',
      ' vec2 q=p*(1.75-.55*uS);',
      ' vec2 w=vec2(fbm(q+t*.03),fbm(q+vec2(5.2,1.3)-t*.03));',
      ' float ink=fbm(q+2.*w+t*.015);',
      ' float inkN=smoothstep(.3,.7,ink);',
      ' float bleed=ink-.5;',
      ' float d=length(p);',
      ' vec2 dir=p/max(d,1e-4);',
      ' float rr=d-uR+bleed*(.07+.45*uS);',
      // 붓 압력: 굵기가 먹을 따라 변한다
      ' float th=.014+.032*inkN+.12*uS;',
      ' float band=smoothstep(th,th*.3,abs(rr));',
      // 결을 따라 흐르는 마른 붓 자국 (각도 방향은 느리게, 반지름 방향은 빠르게)
      ' float br=noise(dir*2.6+vec2(rr*48.)+w*1.5)*.62+noise(dir*7.+vec2(rr*130.))*.38;',
      ' float dry=mix(.42,1.,smoothstep(.22,.62,br));',
      ' float spill=exp(-max(rr,0.)*20.)*smoothstep(-.004,.01,rr)*(.18+.5*inkN);',
      ' float glow=exp(-abs(rr)*7.5)*.16;',
      ' float ringA=max(band*dry,spill)+glow;',
      ' vec3 col=mix(BLACK,CHAR,inkN*.85);',
      ' col=mix(col,BLACK*.5,smoothstep(.55,.9,w.y)*.45);',
      ' float inside=smoothstep(.006,-.03,rr);',
      ' col=mix(col,MOON,.06*inside*uOpen*(.5+.5*inkN));',
      ' float outside=max(rr,0.);',
      ' col+=BRASS*exp(-outside*3.6)*(1.-inside)*(.25+.75*inkN)*.2*uOpen*(1.-.5*uS);',
      ' float ra=ringA*(.55+.45*inkN)*uOpen*(1.-.82*uS);',
      ' col=mix(col,MOON,clamp(ra,0.,1.));',
      ' vec2 uv=gl_FragCoord.xy/uRes;',
      ' col*=1.-.38*pow(length(uv-.5)*1.2,2.);',
      ' col+=(hash(gl_FragCoord.xy)-.5)/255.;',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');
  }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  var prog, buf, U = {};
  function build(oct) {
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, frag(oct));
    if (!vs || !fs) return false;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); return false; }
    if (prog) gl.deleteProgram(prog);
    prog = p;
    gl.useProgram(prog);
    ['uRes', 'uC', 'uM', 'uT', 'uR', 'uOpen', 'uS', 'uP', 'uDrag', 'uAmt'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    return true;
  }

  computeGeom();
  var octaves = geom.small ? 4 : 5;
  if (!build(octaves)) { giveUp(); return; }
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  if (fallback) fallback.style.visibility = 'hidden';

  var quality = 1;
  var scale = 1;
  function resize() {
    computeGeom();
    var dprCap = geom.small ? 1.25 : 1.5;
    scale = Math.min(window.devicePixelRatio || 1, dprCap) * quality;
    var bw = Math.max(1, Math.round(geom.w * scale));
    var bh = Math.max(1, Math.round(geom.h * scale));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    gl.viewport(0, 0, bw, bh);
    var want = geom.small ? 4 : 5;
    if (want !== octaves && build(want)) octaves = want;
  }
  resize();

  // 상태
  var start = performance.now();
  var last = start;
  var still = SHOT || mqReduce.matches;
  var sSmooth = 0;
  var pointer = { x: 0, y: 0, has: false, tx: 0, ty: 0 };
  var P = { x: 0.6, y: 0.1 }, Pprev = { x: 0.6, y: 0.1 }, drag = { x: 0, y: 0 }, amt = 0;
  var heroH = hero.offsetHeight;
  var running = false, raf = 0, onScreen = true, paused = false;
  var slowFrames = 0, frameCount = 0, lastDrop = 0;

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer.tx = e.clientX; pointer.ty = e.clientY; pointer.has = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { pointer.has = false; }, { passive: true });

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  function draw(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    var el = (now - start) / 1000;
    var R, open, t, s;
    if (still) {
      R = R_OPEN; open = 1; t = 8; s = 0;
    } else {
      // 로드 후 1.6초 동안 0에서 0.32까지 열린다 (1초 시점에 95%)
      var k = Math.min(1, el / 1.6);
      R = R_OPEN * easeOutCubic(k);
      open = easeOutCubic(Math.min(1, el / 0.9));
      t = 8 + el;
      var target = Math.min(1, Math.max(0, (window.scrollY || 0) / Math.max(1, heroH * 0.85)));
      sSmooth += (target - sSmooth) * (1 - Math.exp(-dt * 7));
      s = sSmooth;
      R += s * 0.55;
    }

    var ux, uy;
    if (geom.small || still) {
      // 포인터 대신 느린 자동 표류
      var tt = still ? 8 : t;
      ux = 0.36 * Math.sin(tt * 0.21) + 0.05;
      uy = 0.24 * Math.sin(tt * 0.13 + 1.2);
      amt = still ? 0.5 : 0.7;
    } else {
      if (pointer.has) {
        pointer.x = pointer.tx; pointer.y = pointer.ty;
        ux = (pointer.x - geom.cx) / geom.m;
        uy = (geom.cy - pointer.y) / geom.m;
        amt += (1 - amt) * (1 - Math.exp(-dt * 3));
      } else {
        ux = P.x; uy = P.y;
        amt += (0 - amt) * (1 - Math.exp(-dt * 1.5));
      }
    }
    var lerp = 1 - Math.exp(-dt * 6);
    P.x += (ux - P.x) * lerp; P.y += (uy - P.y) * lerp;
    if (dt > 0) {
      var vx = (P.x - Pprev.x) / dt * 0.35, vy = (P.y - Pprev.y) / dt * 0.35;
      var len = Math.hypot(vx, vy);
      if (len > 1) { vx /= len; vy /= len; }
      var dl = 1 - Math.exp(-dt * 4);
      drag.x += (vx - drag.x) * dl; drag.y += (vy - drag.y) * dl;
    }
    Pprev.x = P.x; Pprev.y = P.y;
    if (still) { drag.x = 0.5; drag.y = -0.2; }

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uC, geom.cx * scale, (geom.h - geom.cy) * scale);
    gl.uniform1f(U.uM, geom.m * scale);
    gl.uniform1f(U.uT, t);
    gl.uniform1f(U.uR, R);
    gl.uniform1f(U.uOpen, open);
    gl.uniform1f(U.uS, s);
    gl.uniform2f(U.uP, P.x, P.y);
    gl.uniform2f(U.uDrag, drag.x, drag.y);
    gl.uniform1f(U.uAmt, amt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 느린 기기에서는 해상도를 낮춘다
    frameCount++;
    if (!still && frameCount > 8) {
      if (dt > 0.034) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 12 && quality > 0.5 && now - lastDrop > 900) {
        quality = Math.max(0.5, quality - 0.17);
        lastDrop = now; slowFrames = 0;
        resize();
      }
    }
  }

  function loop(now) {
    raf = 0;
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function play() {
    if (still) { requestAnimationFrame(function (n) { last = n; draw(n); }); return; }
    if (running || paused || !onScreen || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  var io = new IntersectionObserver(function (entries) {
    onScreen = entries[0].isIntersecting;
    hero.classList.toggle('is-away', !onScreen);
    if (onScreen) play(); else stop();
  }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
  io.observe(hero);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else play();
  });

  var onResize = debounce(function () {
    heroH = hero.offsetHeight;
    resize();
    if (still) play();
  }, 150);
  window.addEventListener('resize', onResize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    stop();
    canvas.style.display = 'none';
    if (fallback) fallback.style.visibility = '';
  });

  mqReduce.addEventListener && mqReduce.addEventListener('change', function () {
    still = SHOT || mqReduce.matches;
    stop(); play();
  });

  window.dalmuriInk = {
    pause: function () { paused = true; stop(); },
    resume: function () { paused = false; play(); }
  };

  play();

  function debounce(fn, ms) {
    var id;
    return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }
})();
