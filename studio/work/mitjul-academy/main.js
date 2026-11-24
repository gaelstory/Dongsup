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
    var d = rects.map(function (r, i) {
      var x1 = r.left - a.left - 2, x2 = r.right - a.left + 3, y = r.bottom - a.top - 1, len = x2 - x1;
      var w = i % 2 ? -1.6 : 1.6;
      return 'M' + x1.toFixed(1) + ' ' + (y + 0.6).toFixed(1) + 'C' + (x1 + len * 0.3).toFixed(1) + ' ' + (y + w).toFixed(1) + ' ' + (x1 + len * 0.65).toFixed(1) + ' ' + (y - w).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + (y - 0.4).toFixed(1);
    });
    var paths = $$('path', svg);
    while (paths.length > d.length) svg.removeChild(paths.pop());
    while (paths.length < d.length) { var p = document.createElementNS(NS, 'path'); svg.appendChild(p); paths.push(p); }
    paths.forEach(function (p, i) { p.setAttribute('d', d[i]); });
    return paths;
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
    }
    function praiseNow() {
      var v = input.value.trim();
      if (v.length < 2) { praise.textContent = ''; return; }
      var word = v.length < 10 ? WORDS[0] : v.length > 34 ? WORDS[3] : /[.다요]$/.test(v) ? WORDS[2] : WORDS[1];
      praise.innerHTML = '<svg viewBox="0 0 30 26" aria-hidden="true" focusable="false"><path d="M3 14l8 8L27 3"/></svg>' + word;
      if (motionOK() && window.DrawSVGPlugin) {
        gsap.fromTo($('path', praise), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' });
        gsap.from(praise, { opacity: 0, x: -6, duration: 0.3, ease: 'power2.out' });
      }
    }
    input.addEventListener('input', function () {
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
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = Object.keys(F).filter(function (k) { return !check(k); });
      if (bad.length) { done.textContent = ''; F[bad[0]].focus(); return; }
      done.innerHTML = '<span class="stamp" aria-hidden="true">접수</span><span></span>';
      done.lastChild.textContent = F.name.value.trim() + ' 학생(' + F.grade.value + ')의 레벨 테스트 신청서를 받았습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      done.focus();
      if (motionOK()) gsap.from($('.stamp', done), { scale: 1.3, opacity: 0, rotation: -24, duration: 0.35, ease: 'back.out(2)' });
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
      var y = id === 'top' ? 0 : t.getBoundingClientRect().top + window.scrollY - 76;
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
      var memo = $('.ms-memo__ink'), memoText = memo.textContent;
      var tl = gsap.timeline({ delay: 0.05 });
      if (!first) tl.progress(1);
      tl.from(chars, { opacity: 0, scale: 0.9, duration: 0.14, ease: 'power2.out', stagger: 0.035 }, 0);
      var at = 0.5;
      function stroke(id, dur, gap) {
        var p = document.getElementById(id + '-' + sfx);
        tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'power1.inOut', immediateRender: true }, at);
        if (window.MotionPathPlugin && nib) {
          tl.to(nib, { duration: dur, ease: 'power1.inOut', motionPath: { path: p, align: p, alignOrigin: [0, 1] }, immediateRender: false }, at);
        }
        at += dur + (gap || 0.04);
      }
      tl.set(nib, { opacity: 1 }, 0.48);
      stroke('hw', 0.36);
      stroke('hc', 0.38);
      stroke('hv', 0.16);
      stroke('ha', 0.26, 0);
      stroke('hh', 0.08);
      if (window.TextPlugin) tl.fromTo(memo, { text: { value: '' } }, { text: { value: memoText }, duration: 0.36, ease: 'none', immediateRender: true }, at);
      tl.to(nib, { opacity: 0, duration: 0.24, ease: 'power1.out' }, at + 0.06);
      if (!first) tl.progress(1);
      root.classList.remove('intro');
    });
  }

  // scroll-driven marks are measured from text, so they start once the fonts are in
  function initScrollPen() {
    if (!hasGsap || !window.DrawSVGPlugin || !window.ScrollTrigger) return;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      if (isShot) return;

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
            var t2 = gsap.timeline({ onComplete: function () { k.done = true; } });
            t2.to(k.paths, { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut', stagger: 0.32 });
            if (note && window.TextPlugin) t2.to(note, { text: { value: text }, duration: Math.min(0.9, 0.06 * text.length + 0.2), ease: 'none' }, '-=0.1');
          }
        });
      });

      // the signature, then the final score at the bottom of the sheet
      var sign = $$('.sign__ink');
      if (sign.length) gsap.fromTo(sign, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power1.inOut', stagger: 0.2, scrollTrigger: { trigger: '.sign', start: 'top 85%', once: true } });
      var score = $$('.pen--score'), totalNote = $('.total__note .note__ink'), totalText = totalNote ? totalNote.getAttribute('data-text') : '';
      if (score.length) {
        gsap.set(score, { drawSVG: '0%' });
        if (totalNote && window.TextPlugin) totalNote.textContent = '';
        var ts = gsap.timeline({ scrollTrigger: { trigger: '.total', start: 'top 88%', once: true } });
        ts.to(score[0], { drawSVG: '100%', duration: 0.2, ease: 'power2.in' })
          .to(score[1], { drawSVG: '100%', duration: 0.26, ease: 'power1.inOut' })
          .to(score[2], { drawSVG: '100%', duration: 0.26, ease: 'power1.inOut' })
          .to(score[3], { drawSVG: '100%', duration: 0.42, ease: 'power2.out' })
          .to(score[4], { drawSVG: '100%', duration: 0.18, ease: 'power2.out' });
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
