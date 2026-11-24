/* Salon MIRU page script. Every block is optional: if one fails, the content it touches stays readable. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var REDUCED = mqReduce.matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function safe(name, fn) {
    try { fn(); } catch (err) {
      root.classList.add('no-motion');
      if (window.console) console.warn('[salon-miru] ' + name + ' skipped:', err);
    }
  }

  if (hasGsap) {
    var plugins = [window.ScrollTrigger, window.Draggable, window.InertiaPlugin, window.DrawSVGPlugin].filter(Boolean);
    gsap.registerPlugin.apply(gsap, plugins);
  }

  /* header: mobile menu */
  safe('menu', function () {
    var btn = $('.menu-btn'), menu = $('#mobile-menu');
    if (!btn || !menu) return;
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      $('.menu-btn-label', btn).textContent = open ? '닫기' : '메뉴';
    }
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      set(open);
      if (open) { var first = $('a', menu); if (first) first.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) set(false); });
  });

  /* hero: hair canvas, swatches, comb cursor */
  var hair = null;
  safe('hair', function () {
    var hero = $('.hero'), canvas = $('#hair-canvas');
    if (!hero || !canvas || !window.MiruHair) return;
    var checked = $('input[name="hair-color"]:checked');
    var copy = $('.hero-copy');
    // the hair never crosses the copy: its box (in canvas coordinates) is a keep-out zone
    function keepOut() {
      if (!copy) return null;
      var c = canvas.getBoundingClientRect(), r = copy.getBoundingClientRect();
      return { x0: r.left - c.left, y0: r.top - c.top, x1: r.right - c.left, y1: r.bottom - c.top };
    }
    hair = window.MiruHair.create(canvas, { reduced: REDUCED, shot: SHOT, host: hero, getKeepOut: keepOut, color: SHOT ? 'rose' : (checked ? checked.value : 'rose') });
    if (hair && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { hair.setKeepOut(keepOut()); });
    if (!hair) return;
    hero.classList.add('has-canvas');
    if (REDUCED || SHOT) hero.classList.add('no-comb');
    if (REDUCED) hero.classList.add('no-hair');

    var toggle = $('#motion-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      var on = toggle.dataset.paused !== 'true';
      toggle.dataset.paused = String(on);
      toggle.setAttribute('aria-label', on ? '머릿결 움직임 다시 재생' : '머릿결 움직임 멈추기');
      hair.setPaused(on);
    });
    // on touch the hint line fades once the first sideways sweep has happened
    var hint = $('.comb-hint');
    if (hint) hero.addEventListener('pointermove', function onFirst(e) {
      if (e.pointerType === 'mouse') return;
      hint.classList.add('is-used');
      hero.removeEventListener('pointermove', onFirst);
    }, { passive: true });

    if (hasGsap && window.ScrollTrigger && !REDUCED && !SHOT) {
      ScrollTrigger.create({
        trigger: hero, start: 'top top', end: 'bottom top',
        onUpdate: function (st) { hair.setLift(st.progress); }
      });
    }

    // comb cursor follows the pointer directly in the event (no easing on position, so no lag)
    var comb = $('#comb-cursor');
    if (comb && FINE && !REDUCED && !SHOT) {
      hero.classList.add('comb-ready');
      var lastX = 0, rot = 0, shown = false;
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var over = e.target.closest('.hero-copy, a, button, label');
        if (over) { if (shown) { comb.classList.remove('is-on'); shown = false; } return; }
        var vx = e.clientX - lastX; lastX = e.clientX;
        rot += (Math.max(-16, Math.min(16, vx * 0.9)) - rot) * 0.25;
        comb.style.transform = 'translate3d(' + (e.clientX - 66) + 'px,' + (e.clientY - 12) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
        if (!shown) { comb.classList.add('is-on'); shown = true; }
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { comb.classList.remove('is-on'); shown = false; });
    }
  });

  safe('swatches', function () {
    var hero = $('.hero'), name = $('#swatch-name');
    $$('input[name="hair-color"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        var p = window.MiruHair && window.MiruHair.palettes[input.value];
        if (!p) return;
        if (name) name.textContent = p.name;
        if (hero) { hero.style.setProperty('--hair-root', p.root); hero.style.setProperty('--hair-tip', p.tip); }
        if (hair) hair.setColor(input.value, REDUCED);
      });
    });
  });

  /* hero entrance: quick, finished within ~1.1s */
  safe('intro', function () {
    if (!hasGsap || SHOT) return;
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-title .line', { y: 26, opacity: 0, duration: 0.75, stagger: 0.09 }, 0.05)
        .from('.hero-sub', { y: 14, opacity: 0, duration: 0.6 }, 0.28)
        .from('.hero-actions, .swatches', { y: 12, opacity: 0, duration: 0.55, stagger: 0.08 }, 0.4)
        .from('.comb-hint', { opacity: 0, duration: 0.5 }, 0.6);
    });
  });

  /* about: the hour dial draws itself once */
  safe('dial', function () {
    var arcs = $$('.dial-arc');
    if (!hasGsap || !window.DrawSVGPlugin || !window.ScrollTrigger || SHOT || !arcs.length) return;
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '.dial', start: 'top 82%', once: true } });
      tl.from(arcs, { drawSVG: '0%', duration: 0.7, stagger: 0.18, ease: 'power2.inOut' })
        .from('.dial-label', { opacity: 0, duration: 0.4, stagger: 0.12 }, 0.3);
    });
  });

  /* designers: draggable reel with inertia and snapping */
  safe('reel', function () {
    var reel = $('#reel'), track = $('#reel-track'), bar = $('#reel-bar');
    var prev = $('#reel-prev'), next = $('#reel-next');
    if (!reel || !track) return;
    var items = $$('.designer', track);
    var sways = $$('.sway', track);
    var snaps = [0], minX = 0, x = 0, drag = null;

    function measure() {
      var vw = reel.clientWidth, tw = track.scrollWidth;
      minX = Math.min(0, vw - tw);
      snaps = [];
      items.forEach(function (it) {
        var s = Math.max(minX, -it.offsetLeft);
        if (!snaps.length || Math.abs(snaps[snaps.length - 1] - s) > 2) snaps.push(s);
      });
      if (drag) { drag.applyBounds({ minX: minX, maxX: 0 }); }
      setX(Math.max(minX, Math.min(0, x)));
      update();
    }
    function getX() { return hasGsap ? Number(gsap.getProperty(track, 'x')) || 0 : 0; }
    function setX(v) { x = v; if (hasGsap) gsap.set(track, { x: v }); }
    function nearest(v) {
      var best = 0;
      for (var i = 1; i < snaps.length; i++) if (Math.abs(snaps[i] - v) < Math.abs(snaps[best] - v)) best = i;
      return best;
    }
    function update() {
      x = getX();
      var p = minX ? x / minX : 0;
      var vis = Math.min(1, reel.clientWidth / track.scrollWidth);
      if (bar) bar.style.transform = 'scaleX(' + (vis + (1 - vis) * Math.max(0, Math.min(1, p))).toFixed(4) + ')';
      var i = nearest(x);
      if (prev) prev.disabled = x >= -1;
      if (next) next.disabled = x <= minX + 1;
      items.forEach(function (it, n) { it.setAttribute('aria-hidden', String(isOff(it))); });
      return i;
    }
    function isOff(it) {
      var l = it.offsetLeft + x, r = l + it.offsetWidth;
      return r < 8 || l > reel.clientWidth - 8;
    }
    // hair in the drawings swings with the reel's speed, then settles
    var skew = 0, lastX = 0, swaying = false;
    function swayTick() {
      var cx = getX(), v = cx - lastX; lastX = cx;
      var target = Math.max(-7, Math.min(7, -v * 0.32));
      skew += (target - skew) * 0.16;
      if (Math.abs(skew) < 0.02 && Math.abs(v) < 0.05 && !(drag && (drag.isDragging || drag.isThrowing))) {
        skew = 0; gsap.ticker.remove(swayTick); swaying = false;
      }
      var t = 'skewX(' + skew.toFixed(2) + 'deg)';
      for (var i = 0; i < sways.length; i++) sways[i].style.transform = t;
      update();
    }
    function startSway() {
      if (REDUCED || swaying || !hasGsap) return;
      lastX = getX(); swaying = true; gsap.ticker.add(swayTick);
    }
    function go(i) {
      i = Math.max(0, Math.min(snaps.length - 1, i));
      if (!hasGsap) return;
      gsap.to(track, { x: snaps[i], duration: REDUCED ? 0 : 0.6, ease: 'power3.out', overwrite: true, onUpdate: update, onComplete: function () { update(); if (drag) drag.update(); } });
      startSway();
    }
    if (hasGsap && window.Draggable) {
      root.classList.add('reel-js');
      drag = Draggable.create(track, {
        type: 'x', inertia: !!window.InertiaPlugin && !REDUCED, edgeResistance: 0.88, dragClickables: true,
        bounds: { minX: minX, maxX: 0 }, allowNativeTouchScrolling: true, zIndexBoost: false,
        snap: { x: function (v) { return snaps[nearest(v)]; } },
        onPress: function () { gsap.killTweensOf(track); },
        onDragStart: function () { reel.classList.add('is-dragging'); startSway(); },
        onDrag: update, onThrowUpdate: update,
        onRelease: function () {
          reel.classList.remove('is-dragging');
          if (!this.tween) go(nearest(this.x));
        },
        onThrowComplete: update
      })[0];
    }
    reel.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      go(nearest(getX()) + (e.key === 'ArrowRight' ? 1 : -1));
    });
    if (prev) prev.addEventListener('click', function () { go(nearest(getX()) - 1); });
    if (next) next.addEventListener('click', function () { go(nearest(getX()) + 1); });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 150); }, { passive: true });
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    if (hasGsap && window.ScrollTrigger && !SHOT) {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
        gsap.from(items, { x: 48, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out',
          scrollTrigger: { trigger: reel, start: 'top 85%', once: true } });
      });
    }
  });

  /* price tabs with a travelling ink line */
  safe('tabs', function () {
    var list = $('#price-tabs'), ink = $('#tab-ink');
    if (!list) return;
    var tabs = $$('[role="tab"]', list);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var note = $('#tab-note');
    var NOTES = ['앞머리만 다듬는 날은 예약 없이 들르셔도 괜찮아요.', '펌 날은 머리를 감고 오지 않으셔도 돼요. 시술 전 샴푸가 들어 있습니다.',
      '탈색이나 셀프 염색 이력이 있으면 상담 때 꼭 알려 주세요.', '클리닉만 받으셔도 한 디자이너가 처음부터 끝까지 맡습니다.'];
    function moveInk(tab, instant) {
      if (!ink) return;
      if (instant) ink.style.transition = 'none';
      ink.style.width = '100px';
      ink.style.transform = 'translateX(' + tab.offsetLeft + 'px) scaleX(' + (tab.offsetWidth / 100).toFixed(4) + ')';
      if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
    }
    function select(i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
      });
      moveInk(tabs[i]);
      if (note) note.textContent = NOTES[i] || '';
      if (focus) tabs[i].focus();
      if (hasGsap && !REDUCED) gsap.fromTo($$('.menu-row', panels[i]), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power2.out', overwrite: true });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    panels.forEach(function (p, n) { p.hidden = n !== 0; });
    root.classList.add('tabs-js');
    moveInk(tabs[0], true);
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { moveInk(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0], true); }, 150); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInk(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0], true); });

    var dur = $('#dur-toggle'), wrap = $('#tab-panels');
    if (dur && wrap) dur.addEventListener('click', function () {
      var on = dur.getAttribute('aria-pressed') !== 'true';
      dur.setAttribute('aria-pressed', String(on));
      wrap.classList.toggle('show-dur', on);
    });
  });

  /* booking: four real steps, height eases between them */
  safe('booking', function () {
    var form = $('#book-form');
    if (!form) return;
    var viewport = $('#book-viewport'), panels = $$('.book-panel', form), items = $$('.book-step-item', form);
    var back = $('#book-back'), next = $('#book-next'), submit = $('#book-submit'), nav = $('#book-nav');
    var done = $('#book-done'), status = $('#step-status');
    var NAMES = ['디자이너', '시술', '날짜와 시간', '확인'];
    var step = 1;

    // dates: the next six open days (Mondays closed), with a few hours already taken
    var dateRow = $('#date-row'), timeRow = $('#time-row');
    var HOURS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    var WD = ['일', '월', '화', '수', '목', '금', '토'];
    if (dateRow) {
      var html = '', d = new Date(), n = 0;
      for (var k = 1; n < 6 && k < 14; k++) {
        var day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
        if (day.getDay() === 1) continue;
        var label = (day.getMonth() + 1) + '월 ' + day.getDate() + '일 ' + WD[day.getDay()] + '요일';
        html += '<label class="chip"><input type="radio" name="date" value="' + label + '" data-seed="' + (day.getDate() * 7 + day.getMonth()) + '"><span>' +
          (day.getMonth() + 1) + '.' + day.getDate() + '<small>' + WD[day.getDay()] + '</small></span></label>';
        n++;
      }
      dateRow.innerHTML = html;
    }
    function renderTimes(seed) {
      if (!timeRow) return;
      var prevVal = (form.elements.time && form.elements.time.value) || '';
      timeRow.innerHTML = HOURS.map(function (h, i) {
        var taken = seed != null && ((seed + i * 3) % 5 === 0 || (seed + i) % 7 === 0);
        return '<label class="chip"><input type="radio" name="time" value="' + h + '"' + (taken ? ' disabled' : '') + (h === prevVal && !taken ? ' checked' : '') + '><span>' + h + (taken ? '<small>마감</small>' : '') + '</span></label>';
      }).join('');
    }
    form.addEventListener('change', function (e) {
      if (e.target.name === 'date') renderTimes(Number(e.target.dataset.seed));
      var err = $('#err-' + step); if (err) err.textContent = '';
    });

    function val(name) { var el = form.elements[name]; return el ? (el.value || '') : ''; }
    function checkStep(s) {
      if (s === 1 && !val('designer')) return '디자이너를 한 분 골라 주세요.';
      if (s === 2 && !val('service')) return '받으실 시술을 골라 주세요.';
      if (s === 3 && !val('date')) return '날짜를 골라 주세요.';
      if (s === 3 && !val('time')) return '시간을 골라 주세요.';
      return '';
    }
    function paint() {
      items.forEach(function (it, i) {
        var n = i + 1;
        it.classList.toggle('is-current', n === step);
        it.classList.toggle('is-done', n < step);
        if (n === step) it.setAttribute('aria-current', 'step'); else it.removeAttribute('aria-current');
      });
      back.hidden = step === 1;
      next.hidden = step === 4;
      submit.hidden = step !== 4;
      if (step === 4) {
        $('[data-sum="designer"]').textContent = val('designer') || '고르지 않음';
        $('[data-sum="service"]').textContent = val('service') || '고르지 않음';
        $('[data-sum="when"]').textContent = (val('date') + ' ' + val('time')).trim() || '고르지 않음';
      }
    }
    function show(nextStep, dir) {
      var from = viewport.offsetHeight;
      panels.forEach(function (p) { p.classList.toggle('is-active', Number(p.dataset.panel) === nextStep); });
      step = nextStep;
      paint();
      var to = viewport.offsetHeight;
      var panel = panels[step - 1];
      if (hasGsap && !REDUCED) {
        gsap.fromTo(viewport, { height: from }, { height: to, duration: 0.32, ease: 'power3.out', clearProps: 'height', overwrite: true });
        gsap.fromTo(panel, { opacity: 0, x: 18 * dir }, { opacity: 1, x: 0, duration: 0.32, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
      if (status) status.textContent = step + '단계, ' + NAMES[step - 1];
      panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
      var top = form.getBoundingClientRect().top;
      if (top < 80) window.scrollTo({ top: window.scrollY + top - 96, behavior: REDUCED ? 'auto' : 'smooth' });
    }
    next.addEventListener('click', function () {
      var msg = checkStep(step);
      if (msg) { $('#err-' + step).textContent = msg; return; }
      show(step + 1, 1);
    });
    back.addEventListener('click', function () { if (step > 1) show(step - 1, -1); });

    function fieldError(input, msg) {
      var e = document.getElementById(input.getAttribute('aria-describedby'));
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (e) e.textContent = msg;
      return !msg;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (step !== 4) { next.click(); return; }
      var nameI = $('#f-name'), phoneI = $('#f-phone');
      var okName = fieldError(nameI, nameI.value.trim() ? '' : '예약하실 분의 이름을 적어 주세요.');
      var digits = phoneI.value.replace(/\D/g, '');
      var okPhone = fieldError(phoneI, /^01\d{8,9}$/.test(digits) ? '' : '010으로 시작하는 휴대폰 번호를 적어 주세요.');
      if (!okName) { nameI.focus(); return; }
      if (!okPhone) { phoneI.focus(); return; }
      for (var s = 1; s <= 3; s++) { var m = checkStep(s); if (m) { show(s, -1); $('#err-' + s).textContent = m; return; } }
      var from = viewport.offsetHeight;
      panels.forEach(function (p) { p.classList.remove('is-active'); });
      nav.hidden = true;
      $('#done-title').textContent = nameI.value.trim() + '님의 예약 요청서가 준비됐어요';
      $('#done-text').textContent = val('designer') + ', ' + val('service') + ', ' + val('date') + ' ' + val('time') +
        '. 실제 살롱이라면 디자이너가 30분 안에 문자로 확정해 드립니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      done.hidden = false;
      items.forEach(function (it) { it.classList.remove('is-current'); it.classList.add('is-done'); it.removeAttribute('aria-current'); });
      if (hasGsap && !REDUCED) {
        gsap.fromTo(viewport, { height: from }, { height: viewport.offsetHeight, duration: 0.32, ease: 'power3.out', clearProps: 'height' });
        gsap.from(done, { opacity: 0, y: 10, duration: 0.4, ease: 'power3.out' });
        gsap.from('.done-mark path', { drawSVG: '0%', duration: 0.5, delay: 0.1, ease: 'power2.out' });
      }
      done.focus({ preventScroll: true });
      var ft = form.getBoundingClientRect().top;
      if (ft < 80) window.scrollTo({ top: window.scrollY + ft - 96, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    $('#book-reset').addEventListener('click', function () {
      form.reset();
      renderTimes(null);
      $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
      $$('[aria-invalid]', form).forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
      done.hidden = true; nav.hidden = false;
      show(1, -1);
    });

    // step 2: category chips filter the full menu
    var svcTabs = $$('.svc-tab', form), svcGroups = $$('.svc-group', form);
    function showCat(cat) {
      svcTabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === cat)); });
      svcGroups.forEach(function (g) { g.hidden = g.dataset.cat !== cat; });
    }
    svcTabs.forEach(function (b) {
      b.addEventListener('click', function () {
        var from = viewport.offsetHeight;
        showCat(b.dataset.cat);
        if (hasGsap && !REDUCED) gsap.fromTo(viewport, { height: from }, { height: viewport.offsetHeight, duration: 0.24, ease: 'power3.out', clearProps: 'height', overwrite: true });
      });
    });
    if (svcTabs.length) { root.classList.add('svc-js'); showCat('cut'); }

    // "이 디자이너로 예약" in the reel preselects the designer here
    $$('.designer-book').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="designer"][value="' + a.dataset.designer + '"]');
        if (!r) return;
        r.checked = true;
        if (!done.hidden) $('#book-reset').click();
        var err = $('#err-1'); if (err) err.textContent = '';
        if (step !== 1) show(1, -1);
      });
    });

    // with script running, show one step at a time
    root.classList.add('book-js');
    renderTimes(null);
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === '1'); });
    paint();
  });

  if (hasGsap && window.ScrollTrigger) {
    var refresh = function () { ScrollTrigger.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }
})();
