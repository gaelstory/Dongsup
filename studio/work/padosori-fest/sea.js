/* 파도소리 2027 · the sea is the speaker.
   A Canvas 2D ridgeline (28 lines, 14 on phones) whose amplitude follows the pointer, plus a tiny
   WebAudio synth. Sound only starts after the visitor presses the sound button. */
(function () {
  'use strict';

  var SHOT = /[?&]shot=1/.test(location.search);
  var PENTA = [0, 2, 4, 7, 9];
  var SOLFA = ['도', '레', '미', '솔', '라'];
  var LETTER = ['C', 'D', 'E', 'G', 'A'];
  var BLUE = '#2622E3', PINK = '#FF2E88', WHITE = '#FFFFFF';

  function midiOf(k) { return 48 + PENTA[k % 5] + 12 * Math.floor(k / 5); }
  function noteName(k) { return SOLFA[k % 5] + ' ' + LETTER[k % 5] + (3 + Math.floor(k / 5)); }
  // where a pitch lives on the shore: low notes on the left, high notes on the right
  function noteU(k) { return 0.1 + 0.8 * Math.min(1, Math.max(0, (k - 4) / 11)); }

  /* ---------------- sound ---------------- */
  var Sound = (function () {
    var ctx = null, master = null, analyser = null, bins = null, send = null, on = false;
    var live = 0;

    function build() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { return false; }
      master = ctx.createGain();
      master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 4;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      bins = new Uint8Array(analyser.frequencyBinCount);
      // a short slap-back echo, like sound bouncing off the water
      var delay = ctx.createDelay(1);
      delay.delayTime.value = 0.27;
      var fb = ctx.createGain(); fb.gain.value = 0.3;
      var tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1700;
      send = ctx.createGain(); send.gain.value = 0.24;
      send.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(master);
      master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
      return true;
    }

    function setOn(v) {
      if (v && !ctx && !build()) return false;
      on = !!v;
      if (!ctx) return on;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      if (on) {
        if (ctx.state !== 'running') ctx.resume();
        master.gain.linearRampToValueAtTime(0.15, t + 0.06);
      } else {
        master.gain.linearRampToValueAtTime(0, t + 0.12);
        setTimeout(function () { if (!on && ctx && ctx.state === 'running') ctx.suspend(); }, 400);
      }
      return on;
    }

    function play(k, delaySec, vel) {
      if (!on || !ctx) return false;
      if (live > 14) return true; // keep a frantic hover from stacking dozens of voices
      var t = ctx.currentTime + (delaySec || 0) + 0.005;
      var f = 440 * Math.pow(2, (midiOf(k) - 69) / 12);
      var peak = 0.5 * (vel || 1), sustain = peak * 0.36;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(Math.min(f * 8, 7000), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.8, 600), t + 0.55);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);      // attack
      g.gain.setTargetAtTime(sustain, t + 0.012, 0.07);     // decay to sustain
      g.gain.setTargetAtTime(0.0001, t + 0.34, 0.2);        // release
      lp.connect(g); g.connect(master); g.connect(send);
      var stopAt = t + 1.7;
      [-7, 7].forEach(function (cents, i) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(lp);
        o.start(t);
        o.stop(stopAt);
        if (i === 0) o.onended = function () { live--; g.disconnect(); lp.disconnect(); };
      });
      live++;
      return true;
    }

    function read() {
      if (!on || !analyser) return null;
      analyser.getByteFrequencyData(bins);
      return bins;
    }

    return { setOn: setOn, play: play, read: read, isOn: function () { return on; } };
  })();

  /* ---------------- sea ---------------- */
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x) {
    var i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f), a = hash(i);
    return a + (hash(i + 1) - a) * s;
  }

  // One sea, two surfaces: the hero ridgeline and a low shore strip that follows the lineup.
  // Both read the same time, swells and analyser data, so a name played in the lineup is seen in the strip.
  var Sea = (function () {
    var hero = document.querySelector('.hero');
    var heroBox = hero && hero.querySelector('.hero__sea');
    var heroCanvas = heroBox && heroBox.querySelector('.hero__waves');
    if (!heroCanvas || !heroCanvas.getContext || !heroCanvas.getContext('2d')) return null;
    var shoreBox = document.querySelector('.shore');
    var shoreCanvas = shoreBox && shoreBox.querySelector('canvas');

    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var still = SHOT || mqReduce.matches;
    var P = 96;
    var s = { time: 2.4, cx: 0.62, tx: 0.62, moved: -99, intro: 1, flat: 0, noteU: 0.62, shoreU: 0.5 };
    var swells = [];
    var pageVisible = !document.hidden, raf = 0, last = 0;
    var BLACK = '#000000';

    function Surface(kind, box, canvas) {
      this.kind = kind;
      this.box = box;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.xs = new Float32Array(P);
      this.ys = new Float32Array(P);
      this.env = new Float32Array(P);
      this.audio = new Float32Array(32);
      this.inView = kind === 'hero';
      this.W = 0; this.H = 0; this.dpr = 1;
    }
    Surface.prototype.size = function () {
      var r = this.box.getBoundingClientRect();
      this.W = Math.max(1, Math.round(r.width));
      this.H = Math.max(1, Math.round(r.height));
      var phone = this.W < 768;
      if (this.kind === 'hero') {
        this.c = { lines: phone ? 14 : 28, top: 0.1, span: 0.84, pow: 1.35, amp: 0.44, depthMin: 0.28, sigma: phone ? 0.16 : 0.1,
          envGain: 1, fill: BLUE, strokes: [PINK, WHITE], key: 'u', centre: 'cx', note: 'noteU', flat: true, shore: true };
      } else {
        this.c = { lines: phone ? 4 : 6, top: 0.46, span: 0.48, pow: 1, amp: 0.46, depthMin: 0.55, sigma: 0.08,
          envGain: 0.3, fill: PINK, strokes: [BLACK, WHITE], key: 'us', centre: 'shoreU', note: 'shoreU', flat: false, shore: false };
      }
      this.dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      this.canvas.width = Math.round(this.W * this.dpr);
      this.canvas.height = Math.round(this.H * this.dpr);
      for (var j = 0; j < P; j++) this.xs[j] = (j / (P - 1)) * this.W;
    };

    function swellAt(u, t, i, key, travel) {
      var sum = 0;
      for (var q = 0; q < swells.length; q++) {
        var w = swells[q];
        var age = s.time - w.t0 - (1 - t) * 0.42; // the front line answers first, the back line last
        if (age <= 0) continue;
        var amp = w.str * Math.exp(-age * 1.7);
        var c = w[key];
        if (travel) {
          // along the shore the swell runs out both ways from the name that was played
          var spread = 0.32 * age, width = 0.035 + age * 0.04;
          var d0 = u - c, d1 = u - (c + spread), d2 = u - (c - spread);
          sum += amp * (Math.exp(-(d0 * d0) / (2 * 0.04 * 0.04)) * Math.exp(-age * 2.5) +
            0.8 * Math.exp(-(d1 * d1) / (2 * width * width)) + 0.8 * Math.exp(-(d2 * d2) / (2 * width * width)));
        } else {
          var wd = 0.045 + age * 0.13, d = u - c;
          sum += amp * Math.exp(-(d * d) / (2 * wd * wd)) * (0.75 + 0.25 * Math.sin(age * 11 - i * 0.6));
        }
      }
      return sum;
    }

    Surface.prototype.draw = function (bins) {
      var c = this.c, ctx = this.ctx, W = this.W, H = this.H, xs = this.xs, ys = this.ys, env = this.env, audio = this.audio;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var calm = c.flat ? 1 - s.flat : 1;
      var sink = c.flat ? Math.pow(s.flat, 1.2) : 0;
      var centre = s[c.centre], noteAt = s[c.note], travel = this.kind === 'shore';
      var j, i, u, d, N = c.lines;
      for (j = 0; j < P; j++) {
        u = j / (P - 1); d = u - centre;
        env[j] = (Math.exp(-(d * d) / (2 * c.sigma * c.sigma)) * 0.85 + Math.exp(-(d * d) / (2 * 0.3 * 0.3)) * 0.15) * c.envGain;
      }
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      for (i = 0; i < N; i++) {
        var t = N > 1 ? i / (N - 1) : 1;
        var depth = c.depthMin + (1 - c.depthMin) * t;
        var base = H * (c.top + c.span * Math.pow(t, c.pow));
        base += (H * 0.985 - base) * sink;
        var A = H * c.amp * depth * calm;
        var band = 0;
        if (bins) {
          var b = bins[2 + Math.round(t * 40)] / 255;
          audio[i] += (b * b - audio[i]) * 0.4;
          band = audio[i];
        } else if (audio[i] > 0.001) {
          audio[i] *= 0.9; band = audio[i];
        }
        var hasSwell = swells.length > 0;
        for (j = 0; j < P; j++) {
          u = j / (P - 1);
          var n = vnoise(u * 18 + i * 31.7 + s.time * 0.9) * 0.6 + vnoise(u * 41 + i * 13.1 - s.time * 1.6) * 0.4;
          var spike = Math.pow(n, 1.6);
          var roll = 0.05 * (Math.sin(u * 9.4 + s.time * 0.8 + i * 0.55) * 0.6 + Math.sin(u * 21 - s.time * 1.3 + i * 1.1) * 0.4);
          var h = (env[j] * (0.22 + 0.78 * spike) + roll) * s.intro;
          if (band > 0.001) {
            var dn = u - noteAt;
            h += band * (0.3 + 0.9 * Math.exp(-(dn * dn) / 0.06)) * (0.35 + 0.65 * spike);
          }
          if (hasSwell) h += swellAt(u, t, i, c.key, travel) * (travel ? 0.55 + 0.45 * spike : 1);
          ys[j] = base - A * h;
        }
        ctx.beginPath();
        ctx.moveTo(-4, ys[0]);
        for (j = 0; j < P; j++) ctx.lineTo(xs[j], ys[j]);
        ctx.lineTo(W + 4, ys[P - 1]);
        ctx.lineTo(W + 4, H + 4);
        ctx.lineTo(-4, H + 4);
        ctx.closePath();
        ctx.fillStyle = c.fill;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, ys[0]);
        for (j = 0; j < P; j++) ctx.lineTo(xs[j], ys[j]);
        ctx.lineTo(W + 4, ys[P - 1]);
        ctx.strokeStyle = c.strokes[i % 2];
        ctx.stroke();
      }
      if (!c.shore) return;
      // the pink shore: the next colour field rising out of the sea
      var shoreBase = H * 0.985;
      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      for (j = 0; j < P; j++) {
        u = j / (P - 1);
        var r = Math.sin(u * 13 + s.time * 1.1) * 0.5 + Math.sin(u * 29 - s.time * 0.7) * 0.5;
        ctx.lineTo(xs[j], shoreBase - H * 0.035 * calm * (env[j] * 0.9 + 0.25 + 0.25 * r) * s.intro);
      }
      ctx.lineTo(W + 4, H + 4);
      ctx.closePath();
      ctx.fillStyle = PINK;
      ctx.fill();
    };

    var heroSurf = new Surface('hero', heroBox, heroCanvas);
    var shoreSurf = null;
    if (shoreCanvas && shoreCanvas.getContext && shoreCanvas.getContext('2d')) shoreSurf = new Surface('shore', shoreBox, shoreCanvas);
    var surfaces = shoreSurf ? [heroSurf, shoreSurf] : [heroSurf];

    function drawAll(force) {
      var bins = still ? null : Sound.read();
      for (var k = 0; k < surfaces.length; k++) if (force || surfaces[k].inView) surfaces[k].draw(bins);
    }

    function tick(now) {
      raf = 0;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) || 0.016;
      last = now;
      s.time += dt;
      var idle = s.time - s.moved > 3.2;
      var target = idle ? 0.58 + 0.14 * Math.sin(s.time * 0.23) : s.tx;
      s.cx += (target - s.cx) * (1 - Math.exp(-dt * (idle ? 1.1 : 5.5)));
      for (var q = swells.length - 1; q >= 0; q--) if (s.time - swells[q].t0 > 3.6) swells.splice(q, 1);
      drawAll(false);
      schedule();
    }

    function anyInView() { for (var k = 0; k < surfaces.length; k++) if (surfaces[k].inView) return true; return false; }
    function running() { return !still && pageVisible && anyInView(); }
    function schedule() { if (!raf && running()) raf = requestAnimationFrame(tick); }
    function wake() { last = performance.now(); schedule(); }

    try {
      surfaces.forEach(function (sf) { sf.size(); });
      drawAll(true);
      hero.classList.add('is-live');
      if (shoreSurf) shoreBox.classList.add('is-live');
    } catch (e) {
      hero.classList.remove('is-live');
      return null;
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { surfaces.forEach(function (sf) { sf.size(); }); drawAll(true); }, 150);
    }
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(onResize);
      surfaces.forEach(function (sf) { ro.observe(sf.box); });
    } else window.addEventListener('resize', onResize);

    if ('IntersectionObserver' in window) {
      surfaces.forEach(function (sf) {
        new IntersectionObserver(function (entries) {
          sf.inView = entries[0].isIntersecting;
          if (sf.inView) wake();
        }).observe(sf.kind === 'hero' ? hero : sf.box);
      });
    } else surfaces.forEach(function (sf) { sf.inView = true; });
    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      if (pageVisible) wake();
    });
    var onReduce = function () {
      still = SHOT || mqReduce.matches;
      if (still) { s.intro = 1; s.flat = 0; s.cx = 0.62; swells.length = 0; drawAll(true); } else wake();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);

    // pointer x drives the hero envelope; touch moves it too
    hero.addEventListener('pointermove', function (e) {
      if (still) return;
      s.tx = Math.min(1, Math.max(0, e.clientX / heroSurf.W));
      s.moved = s.time;
    }, { passive: true });

    function quantize(u) { return 4 + Math.round(Math.min(1, Math.max(0, (u - 0.1) / 0.8)) * 11); }

    hero.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      if (e.target.closest && e.target.closest('a, button, input, select, label')) return;
      var u = Math.min(1, Math.max(0, e.clientX / heroSurf.W));
      if (!still) { s.tx = u; s.moved = s.time; }
      var played = Sound.play(quantize(u), 0, 1);
      api.swell(u, played ? 1 : 0.75, u);
    }, { passive: true });

    wake();

    var api = {
      // u: place on the hero sea (by pitch or pointer), us: place on the shore strip (under the name)
      swell: function (u, str, us) {
        if (still) return;
        if (swells.length > 10) swells.shift();
        var along = typeof us === 'number' ? us : u;
        swells.push({ u: u, us: along, t0: s.time, str: (str || 1) * 0.9 });
        s.noteU = u;
        s.shoreU = along;
        wake();
      },
      // flat lines swell into waves; the page timeline owns the tween
      introTween: function (dur) {
        if (still || !window.gsap) return null;
        return window.gsap.fromTo(s, { intro: 0 }, { intro: 1, duration: dur || 0.8, ease: 'power2.out', onUpdate: wake });
      },
      setFlat: function (p) {
        if (still) return;
        s.flat = Math.min(1, Math.max(0, p));
        wake();
      },
      kick: function () { wake(); },
      isStill: function () { return still; }
    };
    return api;
  })();

  window.PADO = {
    sound: Sound,
    sea: Sea,
    noteName: noteName,
    noteU: noteU,
    // a lineup name was played: sing its note, swell the hero at the note's pitch and the shore under the name
    ping: function (k, visualOnly, us) {
      var played = visualOnly ? false : Sound.play(k, 0, 1);
      if (Sea) Sea.swell(noteU(k), played ? 1 : 0.7, us);
      return played;
    }
  };
})();
