/* 파도소리 2027 · page behaviour. Everything here enhances markup that already reads fine without it. */
(function () {
  'use strict';

  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  var G = window.gsap;
  var PADO = window.PADO || { sound: null, sea: null, ping: function () { return false; }, noteName: function () { return ''; } };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function calm() { return SHOT || mqReduce.matches || !G; }
  function guard(fn) {
    try { fn(); } catch (err) { root.classList.add('no-motion'); }
  }

  if (G) {
    var plugins = [window.ScrollTrigger, window.SplitText, window.Draggable, window.InertiaPlugin, window.DrawSVGPlugin].filter(Boolean);
    G.registerPlugin.apply(G, plugins);
  }

  /* ---------- header ---------- */
  guard(function () {
    var header = $('.site-header');
    var ticking = false;
    function update() {
      ticking = false;
      header.classList.toggle('is-solid', window.scrollY > 24);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });

  /* ---------- mobile menu ---------- */
  guard(function () {
    var btn = $('.menu-btn'), nav = $('#site-nav'), header = $('.site-header');
    var mqDesk = window.matchMedia('(min-width: 1024px)');
    function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
    function setOpen(open, restoreFocus) {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      if (open) {
        var first = $('a', nav);
        if (first) first.focus();
      } else if (restoreFocus) {
        btn.focus();
      }
    }
    btn.addEventListener('click', function () { setOpen(!isOpen(), true); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && isOpen()) setOpen(false, false); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
      if (e.key !== 'Tab') return;
      var items = $$('a, button', header).filter(function (el) { return el.offsetParent !== null; });
      var first = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
    var onDesk = function () { if (mqDesk.matches && isOpen()) setOpen(false, false); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onDesk);
  });

  /* ---------- sound toggle ---------- */
  var soundBtn = $('.sound');
  // turns sound on or off from any control; returns whether sound is now on
  var setSound = function () { return false; };
  guard(function () {
    if (!PADO.sound) { soundBtn.hidden = true; return; }
    var label = $('.sound__label', soundBtn);
    var bars = $$('.sound__bar', soundBtn);
    var raf = 0, quietSince = 0;
    function meterLoop(now) {
      raf = 0;
      if (!PADO.sound.isOn()) { bars.forEach(function (b) { b.style.transform = ''; }); return; }
      var bins = PADO.sound.read();
      if (bins) {
        var peak = 0;
        for (var i = 0; i < bars.length; i++) peak = Math.max(peak, bins[3 + i * 6]);
        if (peak < 8) {
          // silence: settle back on the static icon instead of a row of dots
          if (!quietSince) quietSince = now;
          if (now - quietSince > 600) bars.forEach(function (b) { b.style.transform = ''; });
        } else {
          quietSince = 0;
          for (var j = 0; j < bars.length; j++) {
            bars[j].style.transform = 'scaleY(' + (0.45 + (bins[3 + j * 6] / 255) * 0.75).toFixed(3) + ')';
          }
        }
      }
      raf = requestAnimationFrame(meterLoop);
    }
    setSound = function (want, chime) {
      var ok = PADO.sound.setOn(want);
      if (want && !ok) {
        label.textContent = '소리를 낼 수 없는 브라우저입니다';
        return false;
      }
      soundBtn.setAttribute('aria-pressed', String(want));
      label.textContent = want ? '소리 끄기' : '소리 켜기';
      if (want) {
        if (chime) {
          // a short rising chime so the visitor hears that it worked
          [5, 7, 9, 10, 12].forEach(function (k, i) { PADO.sound.play(k, i * 0.085, 0.8); });
          if (PADO.sea) PADO.sea.swell(0.62, 1);
        }
        if (!raf && !mqReduce.matches) raf = requestAnimationFrame(meterLoop);
      }
      document.dispatchEvent(new CustomEvent('pado:sound', { detail: want }));
      return want;
    };
    soundBtn.addEventListener('click', function () {
      setSound(soundBtn.getAttribute('aria-pressed') !== 'true', true);
    });
  });

  /* ---------- tabs (lineup and timetable share the pattern) ---------- */
  function makeTabs(list, onChange) {
    var tabs = $$('[role="tab"]', list);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function select(index, focus, silent) {
      tabs.forEach(function (t, i) {
        var on = i === index;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
      if (!silent && onChange) onChange(index, panels[index]);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });
    select(0, false, true);
    return { select: select, panels: panels };
  }

  /* ---------- lineup ---------- */
  guard(function () {
    var section = $('#lineup');
    var nowEl = $('.lineup__now', section), descEl = $('.lineup__desc', section);
    var defaultNow = nowEl.innerHTML, defaultDesc = descEl.textContent;
    var lit = null;
    var hinted = false;

    function wipeIn(btn) {
      var wash = $('.act__wash', btn);
      if (lit && lit !== btn) wipeOut(lit);
      lit = btn;
      if (!G) { btn.classList.add('is-lit'); return; }
      G.killTweensOf(wash);
      if (calm()) { G.set(wash, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }); return; }
      G.fromTo(wash, { clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.24, ease: 'power3.out' });
    }
    function wipeOut(btn) {
      var wash = $('.act__wash', btn);
      if (lit === btn) lit = null;
      if (!G) { btn.classList.remove('is-lit'); return; }
      G.killTweensOf(wash);
      if (calm()) { G.to(wash, { opacity: 0, duration: 0.12, onComplete: function () { G.set(wash, { clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 }); } }); return; }
      G.to(wash, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.2, ease: 'power2.out' });
    }
    function describe(btn) {
      var k = +btn.dataset.k;
      nowEl.innerHTML = '';
      var strong = document.createElement('strong');
      strong.textContent = $('.act__name', btn).textContent;
      var note = document.createElement('span');
      note.className = 'note';
      note.textContent = PADO.noteName(k);
      nowEl.appendChild(strong);
      nowEl.appendChild(note);
      descEl.textContent = btn.dataset.desc + ' ' + btn.dataset.meta + '.';
    }
    function resetReadout() {
      nowEl.innerHTML = defaultNow;
      descEl.textContent = defaultDesc;
    }
    // where the name sits on screen, so the shore swell starts right under it
    function shoreX(btn) {
      var r = btn.getBoundingClientRect();
      return Math.min(1, Math.max(0, (r.left + r.width / 2) / (document.documentElement.clientWidth || 1)));
    }

    var lastPing = new WeakMap();
    function sing(btn, visualAlways) {
      var t = performance.now();
      if (t - (lastPing.get(btn) || 0) < 140) return;
      lastPing.set(btn, t);
      var k = +btn.dataset.k;
      var on = PADO.sound && PADO.sound.isOn();
      if (on) PADO.ping(k, false, shoreX(btn));
      else if (visualAlways) PADO.ping(k, true, shoreX(btn));
    }

    $$('.act', section).forEach(function (btn) {
      btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        wipeIn(btn); describe(btn); sing(btn, false);
      });
      btn.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (document.activeElement !== btn) wipeOut(btn);
      });
      btn.addEventListener('focus', function () { wipeIn(btn); describe(btn); });
      btn.addEventListener('blur', function () { wipeOut(btn); });
      btn.addEventListener('click', function () {
        wipeIn(btn); describe(btn);
        lastPing.delete(btn);
        sing(btn, true);
        if (!hinted && PADO.sound && !PADO.sound.isOn()) {
          hinted = true;
          descEl.textContent += ' 소리가 꺼져 있습니다. 위의 “소리 켜기”를 눌러 보세요.';
        }
      });
    });

    // play the night: the day's ten notes in set order while the names light in turn
    var listen = $('.listen', section), listenLabel = $('.listen__label', listen);
    var timers = [];
    function stopListen() {
      timers.forEach(clearTimeout);
      timers = [];
      listen.classList.remove('is-playing');
      listenLabel.textContent = '이날 무대 순서대로 듣기';
    }
    function startListen() {
      var panel = $('.lineup__panel:not([hidden])', section);
      if (!panel) return;
      if (!(PADO.sound && PADO.sound.isOn()) && !setSound(true, false)) return;
      var acts = $$('.act', panel).sort(function (a, b) { return +a.dataset.start - +b.dataset.start; });
      listen.classList.add('is-playing');
      listenLabel.textContent = '그만 듣기';
      acts.forEach(function (btn, n) {
        timers.push(setTimeout(function () {
          wipeIn(btn); describe(btn);
          PADO.ping(+btn.dataset.k, false, shoreX(btn));
        }, n * 720));
      });
      timers.push(setTimeout(function () {
        if (lit) wipeOut(lit);
        stopListen();
      }, acts.length * 720 + 700));
    }
    if (PADO.sound) {
      listen.hidden = false;
      listen.addEventListener('click', function () {
        if (listen.classList.contains('is-playing')) { stopListen(); if (lit) wipeOut(lit); resetReadout(); }
        else startListen();
      });
      document.addEventListener('pado:sound', function (e) { if (!e.detail && timers.length) { stopListen(); resetReadout(); } });
    }

    makeTabs($('.daytabs', section), function (i, panel) {
      if (timers.length) stopListen();
      if (lit) wipeOut(lit);
      resetReadout();
      if (calm()) return;
      G.fromTo($$('.act', panel), { yPercent: 40, rotation: function (n) { return [-5, 4, -3, 6][n % 4]; }, opacity: 0 },
        { yPercent: 0, rotation: 0, opacity: 1, duration: 0.42, ease: 'expo.out', stagger: 0.022, overwrite: true, clearProps: 'transform,opacity' });
    });
  });

  /* ---------- timetable ---------- */
  guard(function () {
    var section = $('#timetable');
    var tt = $('.tt', section), vp = $('.tt__viewport', section), track = $('.tt__track', section);
    var nowLine = $('.tt__now', section), nowLabel = $('.tt__nowlabel', section);
    function px(name) { return parseFloat(getComputedStyle(tt).getPropertyValue(name)) || 0; }
    function hourW() { return px('--hour'); }

    var FEST = ['2027-08-14', '2027-08-15', '2027-08-16'];
    function seoulNow() {
      var o = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { h: +o.hour % 24, m: +o.minute, date: o.year + '-' + o.month + '-' + o.day };
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var festDay = -1;
    function placeNow() {
      var n = seoulNow();
      festDay = FEST.indexOf(n.date);
      var mins = (n.h - 14) * 60 + n.m;
      var clock = pad(n.h) + ':' + pad(n.m);
      var inside = mins >= 0 && mins <= 600;
      track.style.setProperty('--now', String(Math.max(0, Math.min(600, mins))));
      if (festDay >= 0) nowLabel.textContent = inside ? '지금 ' + clock : '지금 ' + clock + ', 첫 무대 전';
      else nowLabel.textContent = '지금 ' + clock + (inside ? ' (축제 날이라면)' : ' (축제 날이라면 첫 무대 전)');
      nowLine.hidden = false;
      // only a festival day lights the set that is actually on stage, and only on that day's board
      $$('.tt__day', section).forEach(function (day) {
        var today = +day.dataset.day === festDay;
        $$('.tt__set', day).forEach(function (el) {
          el.classList.toggle('is-now', today && inside && mins >= +el.dataset.start && mins < +el.dataset.end);
        });
      });
      return inside ? mins : 0;
    }
    var nowMins = placeNow();
    setInterval(placeNow, 60000);

    // the board always rests on a whole hour, so no time is cut under the stage column
    function hourAt(x) { return Math.round(x / hourW()); }
    function goHour(h, smooth) {
      var max = vp.scrollWidth - vp.clientWidth;
      vp.scrollTo({ left: Math.max(0, Math.min(max, h * hourW())), behavior: smooth && !calm() ? 'smooth' : 'auto' });
    }
    function scrollToMinute(m, smooth) {
      var label = px('--label');
      goHour(hourAt(m * (hourW() / 60) - (vp.clientWidth - label) * 0.4), smooth);
    }
    // before the festival the board opens at 14:00; on a festival day it opens around now
    scrollToMinute(festDay >= 0 ? nowMins : 0, false);

    function step(dir) { goHour(hourAt(vp.scrollLeft) + dir, true); }
    $$('.tt-arrow', section).forEach(function (b) {
      b.addEventListener('click', function () { step(+b.dataset.dir); });
    });
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'Home') { e.preventDefault(); vp.scrollTo({ left: 0 }); }
      else if (e.key === 'End') { e.preventDefault(); vp.scrollTo({ left: vp.scrollWidth }); }
    });

    // mouse users drag the board with momentum; touch keeps native scrolling, which already has it
    if (G && window.Draggable && mqFine.matches) {
      window.Draggable.create(vp, {
        type: 'scrollLeft',
        inertia: !!window.InertiaPlugin,
        edgeResistance: 0.85,
        throwResistance: 2400,
        maxDuration: 1.2,
        cursor: 'grab',
        activeCursor: 'grabbing',
        allowContextMenu: true,
        onThrowComplete: function () { goHour(hourAt(vp.scrollLeft), true); },
        onDragEnd: function () { if (!window.InertiaPlugin) goHour(hourAt(vp.scrollLeft), true); }
      });
    }

    var ttTabs = makeTabs($('.daytabs', section), function (i, panel) {
      if (calm()) return;
      G.fromTo($$('.tt__set', panel), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: 'power3.out', stagger: 0.015, overwrite: true, clearProps: 'transform,opacity' });
    });
    if (festDay > 0) ttTabs.select(festDay, false, true);
  });

  /* ---------- tickets ---------- */
  guard(function () {
    var form = $('#order');
    var radios = $$('.ticket-radio', form);
    var empty = $('[data-empty]', form), body = $('[data-body]', form);
    var nameEl = $('.summary__name', form), totalEl = $('[data-total]', form), dayField = $('[data-day-field]', form);
    var qtyEl = $('#qty'), daySel = $('#o-day'), result = $('[data-result]', form);
    var qty = 1;

    function won(n) { return n.toLocaleString('ko-KR') + '원'; }
    function current() { return radios.filter(function (r) { return r.checked; })[0] || null; }
    function render(animate) {
      var r = current();
      result.textContent = '';
      result.className = 'summary__result';
      if (!r) { empty.hidden = false; body.hidden = true; return; }
      empty.hidden = true;
      body.hidden = false;
      nameEl.textContent = r.dataset.name;
      dayField.hidden = r.value !== 'day';
      qtyEl.textContent = String(qty);
      totalEl.textContent = won(+r.dataset.price * qty);
      if (animate && !calm()) G.fromTo(body, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
    var slot = $('[data-stub]', form);
    function holdStub(r) {
      var label = form.querySelector('label[for="' + r.id + '"]');
      var stub = label && $('.ticket__stub', label);
      if (!stub || !slot) return;
      var paper = getComputedStyle(label).getPropertyValue('--paper');
      var ink = getComputedStyle(label).getPropertyValue('--ink');
      slot.style.setProperty('--paper', paper);
      slot.style.setProperty('--ink', ink);
      $('.summary__stubno', slot).textContent = $('.ticket__stubno', stub).textContent;
      var to = slot.getBoundingClientRect();
      var from = stub.getBoundingClientRect();
      var onScreen = to.top > 0 && to.bottom < window.innerHeight && from.bottom > 0 && from.top < window.innerHeight;
      slot.hidden = false;
      if (calm() || !onScreen) return;
      // a copy of the stub flies from the ticket into the order card (transform only)
      to = slot.getBoundingClientRect();
      var fly = stub.cloneNode(true);
      fly.classList.add('ticket__stub--fly');
      fly.style.cssText = 'position:fixed;left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height +
        'px;margin:0;z-index:60;pointer-events:none;transition:none;--paper:' + paper + ';--ink:' + ink + ';background:' + paper + ';color:' + ink + ';transform-origin:0 0;';
      document.body.appendChild(fly);
      G.set(slot, { opacity: 0 });
      G.to(fly, {
        x: to.left - from.left,
        y: to.top - from.top,
        scaleX: to.width / from.width,
        scaleY: to.height / from.height,
        rotation: 0,
        duration: 0.42,
        delay: 0.18,
        ease: 'power3.inOut',
        onComplete: function () { fly.remove(); G.set(slot, { opacity: 1 }); }
      });
    }
    radios.forEach(function (r) { r.addEventListener('change', function () { render(true); holdStub(r); }); });
    $$('.qty__btn', form).forEach(function (b) {
      b.addEventListener('click', function () {
        qty = Math.min(4, Math.max(1, qty + +b.dataset.step));
        render(false);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = current();
      if (!r) {
        result.className = 'summary__result is-err';
        result.textContent = '먼저 위에서 표를 하나 골라 주세요.';
        // the radios are visually hidden, so bring the tickets themselves into view
        var firstTicket = form.querySelector('label[for="' + radios[0].id + '"]');
        if (firstTicket) firstTicket.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
        radios[0].focus({ preventScroll: true });
        return;
      }
      var what = r.dataset.name + (r.value === 'day' ? '(' + daySel.value + ')' : '') + ' ' + qty + '장, 합계 ' + won(+r.dataset.price * qty);
      result.className = 'summary__result is-ok';
      result.textContent = what + ' 예매 요청을 받았습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
    });
    render(false);
  });

  /* ---------- countdown to the gates opening (14:00 KST, 14 Aug 2027) ---------- */
  guard(function () {
    var big = $('[data-countdown-big]'), text = $('[data-countdown-text]');
    var OPEN = Date.UTC(2027, 7, 14, 5, 0, 0);   // 14:00 in Seoul
    var CLOSE = Date.UTC(2027, 7, 16, 15, 0, 0); // midnight after the last night
    function seoulDay(ms) { return Math.floor((ms + 9 * 3600000) / 86400000); }
    function update() {
      var now = Date.now();
      if (now < OPEN) {
        var days = seoulDay(OPEN) - seoulDay(now);
        big.textContent = days > 0 ? 'D-' + days : 'D-DAY';
        text.textContent = days > 0
          ? '개막까지 ' + days + '일 남았습니다. 2027년 8월 14일 토요일 오후 2시에 문을 엽니다.'
          : '오늘 오후 2시에 문을 엽니다. 손목밴드 교환은 낮 12시부터입니다.';
      } else if (now < CLOSE) {
        big.textContent = '지금 축제 중';
        text.textContent = '죽도해변에서 공연이 열리고 있습니다. 현장 판매는 입구 매표소에서 합니다.';
      } else {
        big.textContent = '다음 여름';
        text.textContent = '2027년 축제는 끝났습니다. 내년 일정은 소식 받기로 가장 먼저 알려 드립니다.';
      }
    }
    update();
    setInterval(update, 60000);
  });

  /* ---------- motion: hero entrance, scroll moments ---------- */
  if (!G) return;

  guard(function () {
    var mm = G.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, function (c) {
      if (c.conditions.reduce || SHOT) return;
      var ST = window.ScrollTrigger;

      // hero: letters thrown in, the sun climbs, the flat sea swells into waves
      var title = $('.hero__title');
      var chars = null, split = null;
      if (window.SplitText) {
        split = window.SplitText.create(title, { type: 'chars', charsClass: 'hero__char', tag: 'span' });
        chars = split.chars;
      }
      var hide = chars || [title];

      var tl = G.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      tl.fromTo(hide, { yPercent: -70, rotation: function (i) { return [-16, 9, -7, 14, 0, -11, 8, -5, 12][i % 9]; }, scale: 1.2, opacity: 0 },
        { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.62, stagger: 0.02 }, 0)
        .fromTo('.hero__copy > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.46, ease: 'power3.out', stagger: 0.06, clearProps: 'transform' }, 0.2)
        .fromTo('.hero__dates', { rotation: -16, scale: 1.1, opacity: 0 }, { rotation: function () { return window.innerWidth >= 768 ? -6 : -4; }, scale: 1, opacity: 1, duration: 0.55, clearProps: 'transform' }, 0.3)
        .fromTo('.hero__sun', { y: 40 }, { y: 0, duration: 0.8, ease: 'power2.out', clearProps: 'transform' }, 0);
      if (PADO.sea && PADO.sea.introTween) tl.add(PADO.sea.introTween(0.8), 0);

      var started = false;
      function go() {
        if (started) return;
        started = true;
        tl.play(0);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
      setTimeout(go, 280);

      if (ST) {
        // the sea calms and settles into the edge of the next colour field
        ST.create({
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          onUpdate: function (self) { if (PADO.sea) PADO.sea.setFlat(self.progress); }
        });

        // a scroll moment only pre-hides things that start below the fold, so nothing flashes
        // and nothing already on screen waits for a scroll
        var moment = function (triggerSel, targets, from, to, start) {
          var el = $(triggerSel);
          if (!el || !targets.length) return;
          if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
          G.set(targets, from);
          ST.create({ trigger: el, start: start || 'top 88%', once: true, onEnter: function () { G.to(targets, to); } });
        };

        // lineup names arrive like a poster being pasted up
        moment('.lineup__panels', $$('.lineup__panel:not([hidden]) .act'),
          { yPercent: 45, rotation: function (n) { return [-6, 4, -3, 7][n % 4]; }, opacity: 0 },
          { yPercent: 0, rotation: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.03, clearProps: 'transform,opacity' });

        // tickets get tossed onto the table
        moment('.ticket-list', $$('.ticket'),
          { y: 60, rotation: function (i) { return [-7, 6, -5][i % 3]; }, opacity: 0 },
          { y: 0, rotation: function (i, el) { return parseFloat(el.style.getPropertyValue('--tilt')) || 0; }, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.09, clearProps: 'transform,opacity' });

        // the shuttle line draws itself along the coast
        if (window.DrawSVGPlugin) {
          moment('.map', $$('.map__route'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 'top 75%');
          moment('.map', $$('.map__stop'), { scale: 0.6, opacity: 0, transformOrigin: '50% 50%' },
            { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.16, delay: 0.15, clearProps: 'opacity' }, 'top 75%');
        }

        // the footer sign slides up into place
        moment('.site-footer', $$('.footer__giant'), { yPercent: 28 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform' }, 'top 92%');

        var refresh = function () { ST.refresh(); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        window.addEventListener('load', refresh, { once: true });
      }

      return function () { if (split) split.revert(); };
    });
  });
})();
