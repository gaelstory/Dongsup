/* 밑줄 국어논술학원: a red pen corrects the page as you read it. */
(function () {
  'use strict';
  var root = document.documentElement;
  var isShot = /[?&]shot=1/.test(location.search);
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  var motionOK = function () { return hasGsap && !reduceMQ.matches && !isShot; };

  /* ---------------- teacher notes keep a readable copy for screen readers ---------------- */
  $$('.note, .total__note').forEach(function (n) {
    var ink = $('.note__ink', n);
    if (!ink) return;
    var copy = document.createElement('span');
    copy.className = 'sr-only';
    copy.textContent = '선생님 메모: ' + ink.textContent;
    n.insertBefore(copy, ink);
    ink.setAttribute('aria-hidden', 'true');
    ink.setAttribute('data-text', ink.textContent);
  });

  /* ---------------- key sentences get a hand-drawn underline ---------------- */
  var inks = [];
  function drawKeyInk(ann) {
    var key = $('.key', ann);
    if (!key) return null;
    var svg = $('.key-ink', ann);
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'key-ink');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      ann.appendChild(svg);
    }
    var a = ann.getBoundingClientRect();
    // fixed pixel size: the box may grow later (a note being written below) and must not rescale the lines
    var W = Math.max(1, a.width).toFixed(1), H = Math.max(1, a.height).toFixed(1);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.width = W + 'px'; svg.style.height = H + 'px';
    var rects = Array.prototype.slice.call(key.getClientRects()).filter(function (r) { return r.width > 4; });
    var rnd = seeded(inks.length * 97 + rects.length * 13 + 5);
    var d = rects.map(function (r, i) {
      // starts a little early, wobbles, tilts, and overshoots the last letter like a quick pen stroke
      var last = i === rects.length - 1;
      var x1 = r.left - a.left - 4, x2 = r.right - a.left + 8 + (i * 3) % 5, y = r.bottom - a.top + 2;
      var tilt = i % 2 ? 2.2 : -1.8, pts = [[x1, y + 1]];
      for (var x = x1 + 22; x < x2 - 10; x += 22 + rnd() * 14) {
        var t = (x - x1) / (x2 - x1);
        pts.push([x, y + tilt * t + (rnd() - 0.35) * 6.8]);
      }
      pts.push([x2, y + tilt]);
      var path = smoothPath(pts);
      if (last) path += 'q6 -1 9 -6';
      return path;
    });
    var mains = $$('path:not(.pen--ghost)', svg), ghosts = $$('path.pen--ghost', svg);
    while (mains.length > d.length) svg.removeChild(mains.pop());
    while (ghosts.length > d.length) svg.removeChild(ghosts.pop());
    while (mains.length < d.length) { var p = document.createElementNS(NS, 'path'); svg.appendChild(p); mains.push(p); }
    while (ghosts.length < d.length) { var g = document.createElementNS(NS, 'path'); g.setAttribute('class', 'pen--ghost'); g.setAttribute('transform', 'translate(0.9 1)'); svg.appendChild(g); ghosts.push(g); }
    mains.forEach(function (p, i) { p.setAttribute('d', d[i]); ghosts[i].setAttribute('d', d[i]); });
    // ink runs twice along each line: main stroke and a thin, slightly offset second edge
    return mains.reduce(function (all, p, i) { all.push(p, ghosts[i]); return all; }, []);
  }
  function seeded(n) { return function () { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; }; }
  function smoothPath(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    return d + 'L' + pts[pts.length - 1][0].toFixed(1) + ' ' + pts[pts.length - 1][1].toFixed(1);
  }
  function initKeys() {
    $$('.ann').forEach(function (ann) {
      var paths = drawKeyInk(ann);
      if (paths) inks.push({ ann: ann, paths: paths, done: false });
    });
    root.classList.add('pen-ready');
    var t = 0;
    function remeasure() {
      inks.forEach(function (k) {
        k.paths = drawKeyInk(k.ann);
        if (hasGsap && window.DrawSVGPlugin) gsap.set(k.paths, { drawSVG: k.done || !k.armed ? '100%' : '0%' });
      });
    }
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(remeasure, 150); });
    // web fonts can land after the first measurement and move every line break
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { clearTimeout(t); t = setTimeout(remeasure, 60); });
    window.addEventListener('load', remeasure);
  }

  // a marker lands with a dot of extra ink and drags a thinner second edge: add both to every stroke once
  function inkUp(svgs) {
    svgs.forEach(function (svg) {
      $$('.pen', svg).forEach(function (p) {
        if (p.__inked) return;
        p.__inked = true;
        var g = p.cloneNode(false);
        g.removeAttribute('id');
        g.setAttribute('class', 'pen pen--ghost');
        g.setAttribute('transform', (p.getAttribute('transform') || '') + (svg.classList.contains('score') ? ' translate(2 1.5)' : ' translate(4 3)'));
        p.parentNode.insertBefore(g, p.nextSibling);
        p.__ghost = g;
        try {
          var pt = p.getPointAtLength(0), b = document.createElementNS(NS, 'circle');
          b.setAttribute('class', 'pen-blob'); b.setAttribute('cx', pt.x.toFixed(1)); b.setAttribute('cy', pt.y.toFixed(1));
          b.setAttribute('r', (parseFloat(getComputedStyle(p).strokeWidth) * 0.72 || 5).toFixed(1));
          if (p.getAttribute('transform')) b.setAttribute('transform', p.getAttribute('transform'));
          p.parentNode.insertBefore(b, p);
          p.__blob = b;
        } catch (e) { /* no geometry yet: no blob */ }
      });
    });
  }

  /* ---------------- correction toggle ---------------- */
  function initProof() {
    var proof = $('#proof'), sw = $('.switch', proof);
    if (!proof || !sw) return;
    root.classList.add('proof-ready');
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-pressed') !== 'true';
      sw.setAttribute('aria-pressed', String(on));
      proof.classList.toggle('is-on', on);
    });
  }

  /* ---------------- write one sentence onto 원고지 ---------------- */
  function initTry() {
    var input = $('#try-input'), cells = $$('.try__cell'), n = $('#try-n'), praise = $('#praise');
    if (!input || !cells.length) return;
    var wideMQ = window.matchMedia('(min-width: 640px)');
    var prev = '', timer = 0;
    var WORDS = ['좋은 시작이에요!', '잘 썼어요!', '문장이 또렷해요!', '끝까지 읽히는 문장이에요!'];
    function layout() {
      var cols = wideMQ.matches ? 20 : 10, text = input.value.replace(/\s+/g, ' ').slice(0, 60), out = [], col = 0;
      for (var i = 0; i < text.length && out.length < cells.length; i++) {
        var ch = text[i];
        // 원고지: a space never opens a new line
        if (ch === ' ' && col === 0 && out.length > 0) continue;
        out.push(ch === ' ' ? '' : ch);
        col = (col + 1) % cols;
      }
      cells.forEach(function (c, i) {
        var v = out[i] || '';
        if (c.textContent !== v) {
          c.textContent = v;
          c.classList.remove('is-new');
          if (v && i === out.length - 1 && text.length > prev.length && !reduceMQ.matches) { void c.offsetWidth; c.classList.add('is-new'); }
        }
      });
      n.textContent = String(input.value.length);
      prev = text;
      lastOut = out;
    }
    var grid = $('.try__grid'), ink = null, lastOut = [];
    function clearInk() { if (ink) ink.innerHTML = ''; }
    // the red pen actually marks what you wrote: a ring on the last word, a missing full stop, a place to breathe
    function markUp(v) {
      if (!grid) return [];
      if (!ink) { ink = document.createElementNS(NS, 'svg'); ink.setAttribute('class', 'try__ink'); ink.setAttribute('aria-hidden', 'true'); ink.setAttribute('focusable', 'false'); grid.appendChild(ink); }
      var W = grid.clientWidth, Hh = grid.clientHeight;
      ink.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh); ink.style.width = W + 'px'; ink.style.height = Hh + 'px';
      ink.innerHTML = '';
      var drawn = [], notes = [];
      function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); ink.appendChild(e); return e; }
      function box(i) { var c = cells[i]; return { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }; }
      var L = lastOut.length - 1;
      while (L >= 0 && !lastOut[L]) L--;
      if (L < 0) return drawn;
      var b = box(L), cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w * 0.62, ry = b.h * 0.6;
      drawn.push(el('path', { d: 'M' + (cx + rx * 0.7) + ' ' + (cy - ry * 0.8) + 'C' + (cx + rx * 1.2) + ' ' + (cy + ry * 0.4) + ' ' + (cx + rx * 0.2) + ' ' + (cy + ry * 1.15) + ' ' + (cx - rx * 0.6) + ' ' + (cy + ry * 0.7) + 'C' + (cx - rx * 1.1) + ' ' + (cy - ry * 0.9) + ' ' + (cx + rx * 0.1) + ' ' + (cy - ry * 1.05) + ' ' + (cx + rx * 0.9) + ' ' + (cy - ry * 0.4) }));
      if (!/[.?!…]$/.test(v) && L + 1 < cells.length) {
        var nb = box(L + 1);
        el('circle', { class: 'dot', cx: nb.x + nb.w * 0.32, cy: nb.y + nb.h * 0.74, r: 3.2 });
        drawn.push(el('path', { d: 'M' + (nb.x + nb.w * 0.32 + 9) + ' ' + (nb.y + nb.h * 0.74 - 7) + 'c4 8-3 15-10 14s-11-9-6-15 10-5 13-1' }));
        notes.push('마침표를 찍으면 문장이 끝까지 읽혀요.');
      }
      if (v.length > 20) {
        var mid = lastOut.length / 2, best = -1;
        lastOut.forEach(function (ch, i) { if (!ch && i > 2 && i < lastOut.length - 3 && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; });
        if (best > 0) {
          var sb = box(best), sx = sb.x + sb.w / 2, top = sb.y;
          drawn.push(el('path', { d: 'M' + (sx - 9) + ' ' + (top - 15) + 'L' + sx + ' ' + (top + 3) + 'L' + (sx + 10) + ' ' + (top - 17) }));
          notes.push('∨ 표시한 곳에서 한 번 쉬어 가면 더 잘 읽혀요.');
        }
      }
      return { drawn: drawn, notes: notes };
    }
    function praiseNow() {
      var v = input.value.trim();
      if (v.length < 2) { praise.textContent = ''; clearInk(); return; }
      var word = v.length < 10 ? WORDS[0] : v.length > 34 ? WORDS[3] : /[.다요]$/.test(v) ? WORDS[2] : WORDS[1];
      var m = markUp(v) || {};
      praise.innerHTML = '<svg viewBox="0 0 30 26" aria-hidden="true" focusable="false"><path d="M3 14l8 8L27 3"/></svg>' + word + (m.notes && m.notes.length ? ' <span class="praise__more">' + m.notes.join(' ') + '</span>' : '');
      if (motionOK() && window.DrawSVGPlugin) {
        var strokes = [$('path', praise)].concat(m.drawn || []);
        gsap.fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: 'power2.out', stagger: 0.22 });
        gsap.from(praise, { opacity: 0, x: -6, duration: 0.3, ease: 'power2.out' });
      }
    }
    input.addEventListener('input', function () {
      clearInk();
      layout();
      clearTimeout(timer);
      if (!input.value.trim()) praise.textContent = '';
      timer = setTimeout(praiseNow, 750);
    });
    wideMQ.addEventListener ? wideMQ.addEventListener('change', layout) : wideMQ.addListener(layout);
    layout();
  }

  /* ---------------- grade tabs with a sliding hand-drawn underline ---------------- */
  function initTabs() {
    var list = $('[role="tablist"]');
    if (!list) return;
    var tabs = $$('[role="tab"]', list), ink = $('.tabs__ink', list);
    function panelOf(t) { return document.getElementById(t.getAttribute('aria-controls')); }
    function place(t, instant) {
      if (!ink) return;
      if (instant) ink.style.transition = 'none';
      var x = t.offsetLeft + 8, y = t.offsetTop + t.offsetHeight - 6, w = Math.max(20, t.offsetWidth - 16);
      ink.style.transform = 'translate(' + x + 'px,' + (y - list.clientHeight + 16) + 'px) scaleX(' + (w / 100).toFixed(3) + ')';
      if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
    }
    function select(t, focus) {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute('aria-selected', String(on));
        o.tabIndex = on ? 0 : -1;
        panelOf(o).hidden = !on;
      });
      place(t);
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault();
        select(tabs[j], true);
      });
    });
    root.classList.add('tabs-ready');
    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(current);
    place(current, true);
    window.addEventListener('resize', function () { place(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0], true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0], true); });
  }

  /* ---------------- application form ---------------- */
  function initForm() {
    var form = $('#apply-form'), done = $('#form-done');
    if (!form) return;
    var F = { name: $('#f-name'), grade: $('#f-grade'), tel: $('#f-tel'), agree: $('#f-agree') };
    var rules = {
      name: function (v) { return v.trim().length >= 2 ? '' : '학생 이름을 두 글자 이상 적어 주세요.'; },
      grade: function (v) { return v ? '' : '학년을 골라 주세요.'; },
      tel: function (v) { return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.trim()) ? '' : '연락처를 010-0000-0000 형태로 적어 주세요.'; },
      agree: function (v, el) { return el.checked ? '' : '연락처를 받는 데 동의해 주셔야 신청할 수 있습니다.'; }
    };
    function check(k) {
      var el = F[k], msg = rules[k](el.value, el), err = document.getElementById('e-' + k);
      err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !msg;
    }
    Object.keys(F).forEach(function (k) {
      F[k].addEventListener(k === 'agree' || k === 'grade' ? 'change' : 'input', function () { if (F[k].hasAttribute('aria-invalid')) check(k); });
    });
    var submit = $('.form__submit', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submit && submit.getAttribute('aria-disabled') === 'true') { done.focus(); return; }
      var bad = Object.keys(F).filter(function (k) { return !check(k); });
      if (bad.length) { done.textContent = ''; F[bad[0]].focus(); return; }
      var now = new Date();
      done.innerHTML = '<span class="stamp" aria-hidden="true">접수<small>' + (now.getMonth() + 1) + '.' + now.getDate() + '</small></span><span></span>';
      done.lastChild.textContent = F.name.value.trim() + ' 학생(' + F.grade.value + ')의 레벨 테스트 신청서를 받았습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      if (submit) { submit.textContent = '신청서를 냈습니다'; submit.setAttribute('aria-disabled', 'true'); }
      done.focus();
      if (motionOK()) gsap.fromTo($('.stamp', done), { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power3.out' });
    });
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
      if (open) { var f = $('a', sheet); if (f) f.focus(); } else if (restore) btn.focus();
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
    window.addEventListener('resize', function () { if (innerWidth >= 1024 && !sheet.hidden) setOpen(false, false); });
  }
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1), t = id ? document.getElementById(id) : null;
      if (!t) return;
      e.preventDefault();
      var y = id === 'top' ? 0 : t.getBoundingClientRect().top + window.scrollY - (innerWidth >= 1024 ? 118 : 76);
      window.scrollTo({ top: y, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------------- the red pen (GSAP) ---------------- */
  var heroPlayed = false;
  function initPen() {
    if (!hasGsap) { root.classList.remove('intro'); return; }
    var plugins = [window.ScrollTrigger, window.DrawSVGPlugin, window.MotionPathPlugin, window.TextPlugin].filter(Boolean);
    gsap.registerPlugin.apply(gsap, plugins);
    if (!window.DrawSVGPlugin || !window.ScrollTrigger) { root.classList.remove('intro'); return; }
    var mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', desk: '(min-width: 768px)' }, function (ctx) {
      if (!ctx.conditions.motion || isShot) { root.classList.remove('intro'); return; }  // reduced motion and stills: every mark is already on the page
      var sfx = ctx.conditions.desk ? 'd' : 'm';
      var first = !heroPlayed;
      heroPlayed = true;
      var svg = $('.marks--' + sfx), nib = $('.nib', svg);
      var chars = $$('.ms__ch').sort(function (a, b) {
        var pa = a.style.getPropertyValue('--r') * 100 + +a.style.getPropertyValue('--c'), pb = b.style.getPropertyValue('--r') * 100 + +b.style.getPropertyValue('--c');
        return pa - pb;
      });
      var memo = $('.ms-memo__ink'), memoText = memo.textContent, label = $('.pen-label', svg);
      var shifted = $$('.ms__ch--shift');
      var fresh = root.classList.contains('intro');   // false if the 1.5s safety net already showed everything
      var tl = gsap.timeline({ delay: 0.05 });
      var at = fresh ? 0.42 : 0.1;
      if (fresh) {
        tl.from(chars, { opacity: 0, scale: 0.9, duration: 0.12, ease: 'power2.out', stagger: 0.03 }, 0);
        tl.set(shifted, { xPercent: -100 }, 0);      // the student wrote 읽는힘이 with no space
      }
      function stroke(id, dur, gap, withNib) {
        var p = document.getElementById(id + '-' + sfx);
        var targets = [p].concat(p.__ghost ? [p.__ghost] : []);
        tl.fromTo(targets, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'power1.inOut', immediateRender: true }, at);
        if (p.__blob) tl.fromTo(p.__blob, { opacity: 0 }, { opacity: 1, duration: 0.04, immediateRender: true }, at);
        if (withNib !== false && window.MotionPathPlugin && nib) {
          tl.to(nib, { duration: dur, ease: 'power1.inOut', motionPath: { path: p, align: p, alignOrigin: [0.02, 1] }, immediateRender: false }, at);
        }
        at += dur + (gap === undefined ? 0.02 : gap);
      }
      tl.set(nib, { opacity: 0.92 }, at - 0.02);
      stroke('hv', 0.14);                                                       // ∨: insert a space here
      if (label) tl.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.16, immediateRender: true }, at - 0.06);
      if (fresh) { tl.to(shifted, { xPercent: 0, duration: 0.16, ease: 'power2.out' }, at); at += 0.16; }
      stroke('hw', 0.28);
      stroke('hc', 0.3);
      stroke('ha', 0.2, 0);
      stroke('hh', 0.06);
      if (window.TextPlugin) tl.fromTo(memo, { text: { value: '' } }, { text: { value: memoText }, duration: 0.3, ease: 'none', immediateRender: true }, at - 0.02);
      stroke('hr1', 0.14);
      stroke('hr2', 0.1, 0);
      tl.to(nib, { opacity: 0, duration: 0.12, ease: 'power1.out' }, at);
      if (!first) tl.progress(1);
      root.classList.remove('intro');
    });
  }

  // scroll-driven marks are measured from text, so they start once the fonts are in
  function initScrollPen() {
    if (!hasGsap || !window.DrawSVGPlugin || !window.ScrollTrigger) return;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      if (isShot) return;

      // a running score in the sheet header: the hero earned 40, every underlined section adds 10
      var tally = $('#tally'), marked = 0;
      function addScore() {
        marked++;
        if (!tally) return;
        root.classList.add('tally-on');
        tally.textContent = String(Math.min(100, 40 + marked * 10));
        gsap.fromTo(tally, { opacity: 0, y: -6, rotation: -8 }, { opacity: 1, y: 0, rotation: -4, duration: 0.3, ease: 'power3.out' });
      }
      // each section: its key sentence is underlined once, then the margin note is written
      inks.forEach(function (k) {
        var note = $('.note .note__ink', k.ann);
        var text = note ? note.getAttribute('data-text') : '';
        k.armed = true;
        gsap.set(k.paths, { drawSVG: '0%' });
        if (note && window.TextPlugin) { note.textContent = ''; note.parentElement.classList.add('is-empty'); }
        ScrollTrigger.create({
          trigger: k.ann, start: 'top 78%', once: true,
          onEnter: function () {
            // measure again right before drawing: line breaks may have changed since load
            k.paths = drawKeyInk(k.ann);
            gsap.set(k.paths, { drawSVG: '0%' });
            if (note) note.parentElement.classList.remove('is-empty');
            var t2 = gsap.timeline({ onComplete: function () { k.done = true; addScore(); } });
            for (var i = 0; i < k.paths.length; i += 2) t2.to([k.paths[i], k.paths[i + 1]], { drawSVG: '100%', duration: 0.42, ease: 'power2.inOut' }, i * 0.15);
            if (note && window.TextPlugin) t2.to(note, { text: { value: text }, duration: Math.min(0.9, 0.06 * text.length + 0.2), ease: 'none' }, '-=0.1');
          }
        });
      });

      // the signature, then the final score at the bottom of the sheet
      var sign = $$('.sign__ink');
      if (sign.length) gsap.fromTo(sign, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power1.inOut', stagger: 0.2, scrollTrigger: { trigger: '.sign', start: 'top 85%', once: true } });
      var score = $$('.score .pen:not(.pen--ghost)'), totalNote = $('.total__note .note__ink'), totalText = totalNote ? totalNote.getAttribute('data-text') : '';
      if (score.length) {
        var both = function (p) { return [p].concat(p.__ghost ? [p.__ghost] : []); };
        var blobs = score.map(function (p) { return p.__blob; }).filter(Boolean);
        gsap.set(score.concat(score.map(function (p) { return p.__ghost; }).filter(Boolean)), { drawSVG: '0%' });
        gsap.set(blobs, { opacity: 0 });
        if (totalNote && window.TextPlugin) totalNote.textContent = '';
        var ts = gsap.timeline({ scrollTrigger: { trigger: '.total', start: 'top 88%', once: true } });
        var durs = [0.08, 0.16, 0.22, 0.22, 0.42, 0.16, 0.12], eases = ['power2.in', 'power2.in', 'power1.inOut', 'power1.inOut', 'power2.out', 'power2.out', 'power2.out'];
        score.forEach(function (p, i) {
          if (p.__blob) ts.set(p.__blob, { opacity: 1 });
          ts.to(both(p), { drawSVG: '100%', duration: durs[i] || 0.2, ease: eases[i] || 'power2.out' }, i === 1 ? '>-0.02' : '>0.03');
        });
        if (totalNote && window.TextPlugin) ts.to(totalNote, { text: { value: totalText }, duration: 0.8, ease: 'none' }, '-=0.1');
      }
      return function () {
        inks.forEach(function (k) { k.armed = false; k.done = true; });
        $$('.note__ink').forEach(function (n) { if (n.getAttribute('data-text')) n.textContent = n.getAttribute('data-text'); n.parentElement.classList.remove('is-empty'); });
      };
    });
  }

  function boot() {
    try { initMenu(); initAnchors(); } catch (e) { /* plain links still work */ }
    try { initProof(); } catch (e) { root.classList.remove('proof-ready'); }
    try { initTry(); } catch (e) { /* textarea still works */ }
    try { initTabs(); } catch (e) { root.classList.remove('tabs-ready'); $$('.panel').forEach(function (p) { p.hidden = false; }); }
    try { initForm(); } catch (e) { /* form stays visible */ }
    try { inkUp($$('.marks, .score')); } catch (e) { /* plain strokes are fine */ }
    try { initPen(); } catch (e) { root.classList.remove('intro'); root.classList.add('no-motion'); }
    var start = function () {
      try { initKeys(); } catch (e) { root.classList.remove('pen-ready'); }
      try { initScrollPen(); } catch (e) { root.classList.add('no-motion'); }
    };
    // underlines are measured from text, so wait for the fonts (or 800ms, whichever is first)
    var started = false, go = function () { if (!started) { started = true; start(); if (window.ScrollTrigger) ScrollTrigger.refresh(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
