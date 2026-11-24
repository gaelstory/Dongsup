// Page behaviour for 이음 건축사사무소. The WebGL drawing lives in scene.js; this file publishes
// chapter scroll progress for it on window.IEUM.p and runs everything else on the page.
(function () {
  'use strict';
  var root = document.documentElement;
  var S = (window.IEUM = window.IEUM || { p: [0, 0, 0, 0, 0, 0] });
  var SHOT = root.classList.contains('is-shot');
  var gsap = window.gsap;
  var hasGsap = !!(gsap && window.ScrollTrigger);
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return mqReduce.matches || SHOT; };

  // ---------------- mobile menu ----------------
  function initMenu() {
    var header = document.querySelector('.site-header');
    var btn = header.querySelector('.nav__toggle');
    var label = btn.querySelector('[data-label]');
    var panel = document.getElementById('nav-panel');
    function set(open, focusBack) {
      if (open) header.setAttribute('data-open', '');
      else header.removeAttribute('data-open');
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? '메뉴 닫기' : '메뉴 열기';
      if (!open && focusBack) btn.focus();
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.hasAttribute('data-open')) set(false, true);
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('pointerdown', function (e) {
      if (header.hasAttribute('data-open') && !header.contains(e.target)) set(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function () { set(false); });
  }

  // ---------------- plan drawing helper (DrawSVG) ----------------
  function drawPlan(svg, delay) {
    if (!svg || !hasGsap || !window.DrawSVGPlugin || reduced()) return;
    var lines = svg.querySelectorAll('path:not(.pl-dash)');
    var soft = svg.querySelectorAll('.pl-dash, text');
    gsap.killTweensOf(lines);
    gsap.killTweensOf(soft);
    gsap.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out', stagger: { each: 0.018 }, delay: delay || 0 });
    gsap.fromTo(soft, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', delay: (delay || 0) + 0.35 });
  }

  var refreshSoon = (function () {
    var t = 0;
    return function () {
      if (!hasGsap) return;
      clearTimeout(t);
      t = setTimeout(function () { window.ScrollTrigger.refresh(); }, 340);
    };
  })();

  // ---------------- project table ----------------
  function initProjects() {
    var table = document.querySelector('.ptable');
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var hidePreview = null;
    var rows = Array.prototype.slice.call(table.querySelectorAll('.prow'));
    function set(btn, detail, open) {
      btn.setAttribute('aria-expanded', String(open));
      detail.classList.toggle('is-open', open);
    }
    rows.forEach(function (row) {
      var btn = row.querySelector('.prow__btn');
      var detail = document.getElementById(btn.getAttribute('aria-controls'));
      set(btn, detail, false);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        set(btn, detail, open);
        if (open) drawPlan(detail.querySelector('.plan'), 0.08);
        if (open && hidePreview) hidePreview();
        refreshSoon();
      });
      // the whole row is a tap target on touch screens
      row.addEventListener('click', function (e) {
        if (!e.target.closest('.prow__btn')) btn.click();
      });
    });

    // floating plan preview that follows the cursor on desktop
    var float = document.querySelector('.plan-float');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
    if (!float || !hasGsap) return;
    var holder = float.querySelector('.plan-float__svg');
    var nameEl = float.querySelector('[data-float-name]');
    var xTo = gsap.quickTo(float, 'x', { duration: 0.4, ease: 'power3' });
    var yTo = gsap.quickTo(float, 'y', { duration: 0.4, ease: 'power3' });
    var current = -1, shown = false;
    function place(e, instant) {
      var w = float.offsetWidth || 300, h = float.offsetHeight || 260;
      var x = e.clientX + 32;
      if (x + w > window.innerWidth - 16) x = e.clientX - w - 32;
      var y = Math.min(Math.max(e.clientY - h * 0.55, 76), window.innerHeight - h - 16);
      if (instant) gsap.set(float, { x: x, y: y });
      xTo(x); yTo(y);
    }
    function show(i, e) {
      if (i !== current) {
        current = i;
        var src = rows[i].nextElementSibling.querySelector('.plan');
        holder.innerHTML = '';
        holder.appendChild(src.cloneNode(true));
        nameEl.textContent = rows[i].querySelector('.prow__btn span').textContent;
        drawPlan(holder.querySelector('.plan'));
      }
      if (!shown) {
        shown = true;
        place(e, true);
        gsap.fromTo(float, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
      }
    }
    function hide() {
      if (!shown) return;
      shown = false;
      gsap.to(float, { autoAlpha: 0, scale: 0.98, duration: 0.14, ease: 'power1.out', overwrite: 'auto' });
    }
    rows.forEach(function (row, i) {
      row.addEventListener('pointerenter', function (e) {
        // an expanded row already shows its plan, so skip the floating copy
        if (!fine.matches || e.pointerType !== 'mouse') return;
        if (row.querySelector('.prow__btn').getAttribute('aria-expanded') === 'true') hide();
        else show(i, e);
      });
    });
    hidePreview = hide;
    table.querySelectorAll('.pdetail').forEach(function (d) { d.addEventListener('pointerenter', hide); });
    tbody.addEventListener('pointermove', function (e) { if (shown) place(e); }, { passive: true });
    tbody.addEventListener('pointerleave', hide);
    window.addEventListener('scroll', function () { if (shown) hide(); }, { passive: true });
  }

  // ---------------- 평수 estimator ----------------
  var KEYS = ['kitchen', 'living', 'bath0', 'bath1', 'bath2', 'bed0', 'bed1', 'bed2', 'bed3', 'bed4'];
  function planFor(py) {
    var m2 = py * 3.3058;
    var Wm = Math.sqrt(m2 * 1.45), Dm = m2 / Wm, k = 19;
    var W = Wm * k, D = Dm * k;
    var x0 = 52 + (338 - W) / 2, y0 = 48 + (242 - D) / 2;
    var nBed = py < 27 ? 2 : py < 38 ? 3 : py < 50 ? 4 : 5;
    var nBath = py < 27 ? 1 : py < 50 ? 2 : 3;
    var pubW = W * 0.56, privW = W - pubW, topH = D * 0.42;
    var bathW = Math.min(2.4 * k, pubW * 0.32);
    var R = {};
    R.kitchen = { x: x0, y: y0, w: pubW - bathW, h: topH, t: '주방' };
    R.living = { x: x0, y: y0 + topH, w: pubW, h: D - topH, t: '거실' };
    for (var b = 0; b < 3; b++) {
      R['bath' + b] = b < nBath
        ? { x: x0 + pubW - bathW, y: y0 + (topH / nBath) * b, w: bathW, h: topH / nBath, t: '욕실', wet: true }
        : { x: x0 + pubW - bathW, y: y0 + topH, w: bathW, h: 0, t: '욕실', wet: true, off: true };
    }
    var cols = nBed >= 4 ? 2 : 1, rowsN = Math.ceil(nBed / cols);
    for (var i = 0; i < 5; i++) {
      if (i >= nBed) { R['bed' + i] = { x: x0 + pubW, y: y0 + D, w: privW, h: 0, t: '방', off: true }; continue; }
      var c = cols === 2 ? i % 2 : 0, r = cols === 2 ? Math.floor(i / 2) : i;
      var span = cols === 2 && i === nBed - 1 && nBed % 2 === 1;
      var cw = privW / cols;
      R['bed' + i] = { x: x0 + pubW + c * cw, y: y0 + (D / rowsN) * r, w: span ? privW : cw, h: D / rowsN, t: i === 0 ? '안방' : '방' };
    }
    return { py: py, m2: m2, Wm: Wm, Dm: Dm, x0: x0, y0: y0, W: W, D: D, nBed: nBed, nBath: nBath, R: R };
  }
  // Door, windows and entry mark on the south (bottom) wall, in the same drawing language as the
  // project plans: a gap in the wall, a door leaf with its swing, double lines for glazing.
  function planDecor(P) {
    var k = 19, yb = P.y0 + P.D, r = 0.9 * k, f = function (n) { return n.toFixed(1); };
    var hx = P.x0 + P.W * 0.56 * 0.7;
    var w1 = [P.x0 + P.W * 0.07, P.x0 + P.W * 0.56 * 0.5];
    var w2 = [P.x0 + P.W * 0.56 + P.W * 0.44 * 0.22, P.x0 + P.W * 0.56 + P.W * 0.44 * 0.78];
    var gap = 'M' + f(hx) + ' ' + f(yb) + 'H' + f(hx + r) +
      'M' + f(w1[0]) + ' ' + f(yb) + 'H' + f(w1[1]) + 'M' + f(w2[0]) + ' ' + f(yb) + 'H' + f(w2[1]);
    var win = '';
    [w1, w2].forEach(function (w) {
      win += 'M' + f(w[0]) + ' ' + f(yb - 2.5) + 'H' + f(w[1]) + 'M' + f(w[0]) + ' ' + f(yb + 2.5) + 'H' + f(w[1]) +
        'M' + f(w[0]) + ' ' + f(yb - 2.5) + 'v5M' + f(w[1]) + ' ' + f(yb - 2.5) + 'v5';
    });
    var door = 'M' + f(hx) + ' ' + f(yb) + 'V' + f(yb - r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(hx + r) + ' ' + f(yb);
    return { gap: gap, win: win, door: door, ex: hx + r / 2, ey: yb + 15 };
  }
  function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function initEstimate() {
    var input = document.getElementById('pyeong');
    if (!input) return;
    var svg = document.querySelector('.eplan');
    var roomsG = svg.querySelector('.eplan__rooms');
    var outer = svg.querySelector('.eplan__outer');
    var dimW = svg.querySelector('[data-dim="w"]'), dimH = svg.querySelector('[data-dim="h"]');
    var dtW = svg.querySelector('[data-dimtext="w"]'), dtH = svg.querySelector('[data-dimtext="h"]');
    var pyEl = document.querySelector('[data-py]'), m2El = document.querySelector('[data-m2]');
    var feeEl = document.querySelector('[data-fee]'), perEl = document.querySelector('[data-period]');
    var roomsEl = document.querySelector('[data-rooms]'), capEl = document.querySelector('[data-cap]');
    var NS = 'http://www.w3.org/2000/svg';
    var decor = svg.querySelector('.eplan__decor');
    var dGap = svg.querySelector('[data-decor="gap"]'), dWin = svg.querySelector('[data-decor="win"]');
    var dDoor = svg.querySelector('[data-decor="door"]'), dEntry = svg.querySelector('[data-decor="entry"]');
    var mqTiny = window.matchMedia('(max-width: 480px)');
    var decorT = 0;
    function placeDecor(P) {
      var d = planDecor(P);
      dGap.setAttribute('d', d.gap); dWin.setAttribute('d', d.win); dDoor.setAttribute('d', d.door);
      dEntry.setAttribute('x', d.ex.toFixed(1)); dEntry.setAttribute('y', d.ey.toFixed(1));
    }
    var els = {};
    KEYS.forEach(function (key) {
      var g = roomsG.querySelector('[data-k="' + key + '"]');
      if (!g) {
        g = document.createElementNS(NS, 'g');
        g.setAttribute('data-k', key);
        var r = document.createElementNS(NS, 'rect');
        var t = document.createElementNS(NS, 'text');
        g.appendChild(r); g.appendChild(t);
        roomsG.appendChild(g);
      }
      els[key] = { g: g, r: g.querySelector('rect'), t: g.querySelector('text') };
    });
    function render(py, animate) {
      var P = planFor(py);
      var dur = animate && hasGsap && !reduced() ? 0.3 : 0;
      KEYS.forEach(function (key) {
        var room = P.R[key], el = els[key];
        el.r.setAttribute('class', 'eplan__room' + (room.wet ? ' eplan__room--wet' : ''));
        el.t.setAttribute('class', 'eplan__label' + (room.wet ? ' eplan__label--sm' : ''));
        el.t.textContent = room.t;
        // label only where it fits: font size in SVG units times character count, plus a little air
        var fs = (mqTiny.matches ? 16 : 14) - (room.wet ? 2 : 0);
        var fits = !room.off && room.w > room.t.length * fs + 6 && room.h > fs + 8;
        var attrs = { x: room.x, y: room.y, width: Math.max(0, room.w), height: Math.max(0, room.h) };
        var ta = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
        if (dur) {
          gsap.to(el.r, { attr: attrs, duration: dur, ease: 'power3.out', overwrite: true });
          gsap.to(el.t, { attr: ta, duration: dur, ease: 'power3.out', overwrite: true });
        } else {
          for (var a in attrs) el.r.setAttribute(a, attrs[a].toFixed ? attrs[a].toFixed(1) : attrs[a]);
          el.t.setAttribute('x', ta.x.toFixed(1)); el.t.setAttribute('y', ta.y.toFixed(1));
        }
        el.r.style.opacity = room.off ? '0' : '1';
        el.t.style.opacity = fits ? '1' : '0';
      });
      // the openings jump to their new places, so they step aside while the walls are moving
      clearTimeout(decorT);
      if (dur) {
        decor.style.opacity = '0';
        decorT = setTimeout(function () { placeDecor(P); decor.style.opacity = '1'; }, 320);
      } else {
        placeDecor(P);
        decor.style.opacity = '1';
      }
      var o = { x: P.x0, y: P.y0, width: P.W, height: P.D };
      if (dur) gsap.to(outer, { attr: o, duration: dur, ease: 'power3.out', overwrite: true });
      else for (var a in o) outer.setAttribute(a, o[a].toFixed(1));
      var yW = P.y0 - 20, xH = P.x0 - 20;
      var dW = 'M' + P.x0.toFixed(1) + ' ' + yW.toFixed(1) + 'H' + (P.x0 + P.W).toFixed(1) +
        'M' + P.x0.toFixed(1) + ' ' + (yW - 6).toFixed(1) + 'v12M' + (P.x0 + P.W).toFixed(1) + ' ' + (yW - 6).toFixed(1) + 'v12';
      var dH = 'M' + xH.toFixed(1) + ' ' + P.y0.toFixed(1) + 'V' + (P.y0 + P.D).toFixed(1) +
        'M' + (xH - 6).toFixed(1) + ' ' + P.y0.toFixed(1) + 'h12M' + (xH - 6).toFixed(1) + ' ' + (P.y0 + P.D).toFixed(1) + 'h12';
      dimW.setAttribute('d', dW);
      dimH.setAttribute('d', dH);
      dtW.setAttribute('x', (P.x0 + P.W / 2).toFixed(1)); dtW.setAttribute('y', (yW - 13).toFixed(1));
      dtW.textContent = fmt(Math.round(P.Wm * 10) * 100);
      var hx = xH - 13, hy = P.y0 + P.D / 2;
      dtH.setAttribute('x', hx.toFixed(1)); dtH.setAttribute('y', hy.toFixed(1));
      dtH.setAttribute('transform', 'rotate(-90 ' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ')');
      dtH.textContent = fmt(Math.round(P.Dm * 10) * 100);

      var rate = 42 - (py - 20) * 0.2;
      var lo = Math.round((py * rate) / 10) * 10, hi = Math.round((py * (rate + 10)) / 10) * 10;
      var months = Math.round((3 + ((py - 20) / 40) * 3) * 2) / 2;
      var m2 = P.m2.toFixed(1);
      pyEl.textContent = py;
      m2El.textContent = m2 + '㎡';
      feeEl.textContent = fmt(lo) + '만~' + fmt(hi) + '만 원';
      perEl.textContent = '약 ' + (months % 1 ? months.toFixed(1) : months) + '개월';
      roomsEl.textContent = '방 ' + P.nBed + '개, 욕실 ' + P.nBath + '개';
      capEl.textContent = py + '평 단층 기준 평면 예시. 거실, 주방, 방 ' + P.nBed + '개, 욕실 ' + P.nBath + '개';
      input.setAttribute('aria-valuetext', py + '평, 약 ' + m2 + '제곱미터');
      input.style.setProperty('--p', ((py - 20) / 40) * 100 + '%');
    }
    render(Number(input.value) || 32, false);
    input.addEventListener('input', function () { render(Number(input.value), true); });

    var prefill = document.querySelector('[data-prefill]');
    if (prefill) prefill.addEventListener('click', function () {
      var msg = document.getElementById('f-msg');
      if (msg && !msg.value.trim()) msg.value = '연면적 ' + input.value + '평 정도를 생각하고 있어요. ';
    });
  }

  // ---------------- consultation form ----------------
  function initForm() {
    var form = document.getElementById('consult');
    if (!form) return;
    var result = form.querySelector('.form__result');
    var submit = form.querySelector('button[type="submit"]');
    function formatTel(v) {
      var d = v.replace(/\D/g, '');
      if (/^02/.test(d)) return d.length > 9 ? d.replace(/^(02)(\d{4})(\d{4})$/, '$1-$2-$3') : d.replace(/^(02)(\d{3})(\d{4})$/, '$1-$2-$3');
      if (d.length === 11) return d.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
      if (d.length === 10) return d.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
      return v.trim();
    }
    var fields = {
      name: { el: form.querySelector('#f-name'), err: form.querySelector('#f-name-err'), check: function (v) { return v.trim() ? '' : '이름을 적어 주세요.'; } },
      tel: { el: form.querySelector('#f-tel'), err: form.querySelector('#f-tel-err'), check: function (v) {
        if (!v.trim()) return '연락받을 전화번호를 적어 주세요.';
        return v.replace(/\D/g, '').length < 9 ? '전화번호 자릿수를 확인해 주세요. 예: 010-0000-0000' : '';
      } },
    };
    function validate(key) {
      var f = fields[key], msg = f.check(f.el.value);
      f.err.textContent = msg;
      if (msg) f.el.setAttribute('aria-invalid', 'true'); else f.el.removeAttribute('aria-invalid');
      return !msg;
    }
    Object.keys(fields).forEach(function (key) {
      fields[key].el.addEventListener('input', function () {
        if (fields[key].el.hasAttribute('aria-invalid')) validate(key);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var okName = validate('name'), okTel = validate('tel');
      if (!okName || !okTel) {
        (okName ? fields.tel.el : fields.name.el).focus();
        result.textContent = '';
        return;
      }
      if (submit.getAttribute('aria-disabled') === 'true') return;
      var kind = form.querySelector('input[name="kind"]:checked');
      result.textContent = '';
      var b = document.createElement('b');
      b.textContent = fields.name.el.value.trim() + '님, ' + (kind ? kind.value : '설계') + ' 상담 신청 내용을 확인했습니다.';
      result.appendChild(b);
      result.appendChild(document.createTextNode('컨셉 시안이라 실제로 접수되지는 않습니다. 실제 사무소라면 하루 안에 ' + formatTel(fields.tel.el.value) + '로 연락드립니다.'));
      result.tabIndex = -1;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      submit.setAttribute('aria-disabled', 'true');
      setTimeout(function () { submit.removeAttribute('aria-disabled'); }, 2000);
    });
  }

  // ---------------- motion ----------------
  function initMotion() {
    gsap.registerPlugin(window.ScrollTrigger);
    if (window.DrawSVGPlugin) gsap.registerPlugin(window.DrawSVGPlugin);
    var ST = window.ScrollTrigger;
    var story = document.querySelector('.story');
    var chapters = gsap.utils.toArray('.chapter');
    var mm = gsap.matchMedia();
    var introPlayed = false;

    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
      desktop: '(min-width: 900px)',
    }, function (ctx) {
      var c = ctx.conditions;
      if (c.reduce || SHOT) {
        S.p.fill(1);
        return;
      }
      var desk = c.desktop;

      // Load sequence for the headline: under 0.7s, starting at once. The lead and the CTA are
      // never hidden, so the first screen is complete well inside 1.2s.
      if (!introPlayed) {
        introPlayed = true;
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from('.hl > span', { yPercent: 108, duration: 0.5, stagger: 0.06 }, 0)
          .from('.hero__rule-line', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.5, ease: 'power2.inOut' }, 0.1)
          .from('.hero__rule-tick', { opacity: 0, duration: 0.2 }, 0.1)
          .from('.hero__hint', { opacity: 0, duration: 0.3 }, 0.3);
      }

      // Chapter progress drives the drawing; each chapter builds while its text rises into view.
      story.classList.add('story-live');
      chapters.forEach(function (ch, i) {
        ST.create({
          trigger: ch,
          start: desk ? 'top 92%' : 'top 100%',
          end: desk ? 'top 34%' : 'top 60%',
          onUpdate: function (self) { S.p[i] = self.progress; },
          onRefresh: function (self) { S.p[i] = self.progress; },
        });
        ST.create({
          trigger: ch,
          start: desk ? 'top 72%' : 'top 90%',
          end: desk ? 'bottom 72%' : 'bottom 90%',
          toggleClass: 'is-active',
        });
      });

      // Project rows settle in once, top to bottom.
      gsap.from('.prow', {
        opacity: 0, y: 14, duration: 0.5, ease: 'power3.out', stagger: 0.05,
        scrollTrigger: { trigger: '.ptable', start: 'top 82%', once: true },
      });

      // Process: the dimension chain is drawn segment by segment, each step lighting up after its line.
      var steps = gsap.utils.toArray('.step');
      var ptl = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 80%', once: true } });
      steps.forEach(function (s, i) {
        var at = i * 0.15;
        ptl.from(s.querySelector('.step__line'), desk ? { scaleX: 0, duration: 0.45, ease: 'power2.inOut' } : { scaleY: 0, duration: 0.45, ease: 'power2.inOut' }, at)
          .from(s.querySelectorAll('.step__dur, .step__no, .step__title, .step__body'), { opacity: 0, y: 8, duration: 0.45, stagger: 0.04 }, at + 0.14);
      });

      // Estimate: the plan outline is drafted once when the section arrives.
      if (window.DrawSVGPlugin) {
        gsap.from('.eplan__outer, .eplan__dim', {
          drawSVG: '0%', duration: 0.8, ease: 'power2.inOut', stagger: 0.1,
          scrollTrigger: { trigger: '.eplan', start: 'top 80%', once: true },
        });
      }

      return function () {
        story.classList.remove('story-live');
        chapters.forEach(function (ch) { ch.classList.remove('is-active'); });
      };
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
  }

  function safe(fn) {
    try { fn(); } catch (err) { root.classList.add('no-motion'); if (window.console) console.warn(err); }
  }
  // The static HTML names the finished drawing (that is what the no-JS fallback shows); with motion on,
  // the live drawing starts from the cover sheet.
  if (!mqReduce.matches && !SHOT) safe(function () {
    var no = document.querySelector('[data-sheet-no]'), name = document.querySelector('[data-sheet-name]');
    if (no) no.textContent = 'A-00';
    if (name) name.textContent = '계획 개요';
    document.querySelectorAll('.titleblock__ticks i').forEach(function (el) { el.classList.remove('is-on'); });
  });
  safe(initMenu);
  safe(initProjects);
  safe(initEstimate);
  safe(initForm);
  if (hasGsap) safe(initMotion);
  else S.p = [1, 1, 1, 1, 1, 1];
})();
