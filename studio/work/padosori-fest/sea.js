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

  var Sea = (function () {
    var hero = document.querySelector('.hero');
    var box = hero && hero.querySelector('.hero__sea');
    var canvas = box && box.querySelector('.hero__waves');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var still = SHOT || mqReduce.matches;
    var P = 96, N = 28, W = 0, H = 0, dpr = 1, sigma = 0.1;
    var xs = new Float32Array(P), ys = new Float32Array(P), env = new Float32Array(P);
    var audio = new Float32Array(28);
    var s = { time: 2.4, cx: 0.62, tx: 0.62, moved: -99, intro: 1, flat: 0, noteU: 0.62 };
    var swells = [];
    var inView = true, pageVisible = !document.hidden, raf = 0, last = 0;

    function size() {
      var r = box.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      var phone = W < 768;
      N = phone ? 14 : 28;
      sigma = phone ? 0.16 : 0.1;
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      for (var j = 0; j < P; j++) xs[j] = (j / (P - 1)) * W;
    }

    function swellAt(u, t, i) {
      var sum = 0;
      for (var q = 0; q < swells.length; q++) {
        var w = swells[q];
        var age = s.time - w.t0 - (1 - t) * 0.42; // the front line answers first, the horizon last
        if (age <= 0) continue;
        var width = 0.045 + age * 0.13;
        var d = u - w.u;
        sum += w.str * Math.exp(-age * 1.7) * Math.exp(-(d * d) / (2 * width * width)) * (0.75 + 0.25 * Math.sin(age * 11 - i * 0.6));
      }
      return sum;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var calm = 1 - s.flat;
      var sink = Math.pow(s.flat, 1.2);
      var bins = still ? null : Sound.read();
      var j, i, u, d;

      for (j = 0; j < P; j++) {
        u = j / (P - 1); d = u - s.cx;
        env[j] = Math.exp(-(d * d) / (2 * sigma * sigma)) * 0.85 + Math.exp(-(d * d) / (2 * 0.3 * 0.3)) * 0.15;
      }

      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      for (i = 0; i < N; i++) {
        var t = i / (N - 1);
        var depth = 0.28 + 0.72 * t;
        var base = H * (0.1 + 0.84 * Math.pow(t, 1.35));
        base += (H * 0.985 - base) * sink;
        var A = H * 0.44 * depth * calm;
        var band = 0;
        if (bins) {
          var b = bins[2 + Math.round((i / (N - 1)) * 40)] / 255;
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
            var dn = u - s.noteU;
            h += band * (0.3 + 0.9 * Math.exp(-(dn * dn) / 0.06)) * (0.35 + 0.65 * spike);
          }
          if (hasSwell) h += swellAt(u, t, i);
          ys[j] = base - A * h;
        }
        ctx.beginPath();
        ctx.moveTo(-4, ys[0]);
        for (j = 0; j < P; j++) ctx.lineTo(xs[j], ys[j]);
        ctx.lineTo(W + 4, ys[P - 1]);
        ctx.lineTo(W + 4, H + 4);
        ctx.lineTo(-4, H + 4);
        ctx.closePath();
        ctx.fillStyle = BLUE;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, ys[0]);
        for (j = 0; j < P; j++) ctx.lineTo(xs[j], ys[j]);
        ctx.lineTo(W + 4, ys[P - 1]);
        ctx.strokeStyle = i % 2 ? WHITE : PINK;
        ctx.stroke();
      }

      // the pink shore: the next colour field rising out of the sea
      var shoreBase = H * 0.985;
      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      for (j = 0; j < P; j++) {
        u = j / (P - 1);
        var r = Math.sin(u * 13 + s.time * 1.1) * 0.5 + Math.sin(u * 29 - s.time * 0.7) * 0.5;
        ys[j] = shoreBase - H * 0.035 * calm * (env[j] * 0.9 + 0.25 + 0.25 * r) * s.intro;
        ctx.lineTo(xs[j], ys[j]);
      }
      ctx.lineTo(W + 4, H + 4);
      ctx.closePath();
      ctx.fillStyle = PINK;
      ctx.fill();
    }

    function tick(now) {
      raf = 0;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) || 0.016;
      last = now;
      s.time += dt;
      var idle = s.time - s.moved > 3.2;
      var target = idle ? 0.58 + 0.14 * Math.sin(s.time * 0.23) : s.tx;
      s.cx += (target - s.cx) * (1 - Math.exp(-dt * (idle ? 1.1 : 5.5)));
      for (var q = swells.length - 1; q >= 0; q--) if (s.time - swells[q].t0 > 3.4) swells.splice(q, 1);
      draw();
      schedule();
    }

    function running() { return !still && inView && pageVisible; }
    function schedule() {
      if (!raf && running()) raf = requestAnimationFrame(tick);
    }
    function wake() { last = performance.now(); schedule(); }

    function render() {
      size();
      draw();
      hero.classList.add('is-live');
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { size(); draw(); }, 150);
    }

    try {
      render();
    } catch (e) {
      hero.classList.remove('is-live');
      return null;
    }

    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(box);
    else window.addEventListener('resize', onResize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) wake();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      if (pageVisible) wake();
    });
    var onReduce = function () {
      still = SHOT || mqReduce.matches;
      if (still) { s.intro = 1; s.flat = 0; s.cx = 0.62; draw(); } else wake();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);

    // pointer x drives the envelope; touch moves it too
    hero.addEventListener('pointermove', function (e) {
      if (still) return;
      s.tx = Math.min(1, Math.max(0, e.clientX / W));
      s.moved = s.time;
    }, { passive: true });

    function quantize(u) { return 4 + Math.round(Math.min(1, Math.max(0, (u - 0.1) / 0.8)) * 11); }

    hero.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      if (e.target.closest && e.target.closest('a, button, input, select, label')) return;
      var u = Math.min(1, Math.max(0, e.clientX / W));
      if (!still) { s.tx = u; s.moved = s.time; }
      var k = quantize(u);
      var played = Sound.play(k, 0, 1);
      api.swell(u, played ? 1 : 0.75);
    }, { passive: true });

    wake();

    var api = {
      swell: function (u, str) {
        if (still) return;
        if (swells.length > 10) swells.shift();
        swells.push({ u: u, t0: s.time, str: (str || 1) * 0.9 });
        s.noteU = u;
        wake();
      },
      // flat lines swell into waves; returned paused-friendly so the page timeline owns it
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
    // a lineup name was played: sing its note and send a swell to its place on the shore
    ping: function (k, visualOnly) {
      var played = visualOnly ? false : Sound.play(k, 0, 1);
      if (Sea) Sea.swell(noteU(k), played ? 1 : 0.7);
      return played;
    }
  };
})();
