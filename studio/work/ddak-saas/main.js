/* 딱정산: the product demonstrates itself. Chips are real elements that Flip from pile to row to calendar. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var SHOT = /[?&]shot=1/.test(location.search);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, Flip = window.Flip, ST = window.ScrollTrigger;
  var CAN = !!(G && Flip);
  if (G) G.registerPlugin.apply(G, [Flip, ST].filter(Boolean));
  var MOTION = CAN && !REDUCED && !SHOT;

  // the same twelve transactions everywhere on the page (deposits add up to 1,284,300원)
  var ROWS = [
    { t: '09:14', ch: 'card', amt: 46000, fee: 510, vat: 0, dep: 45490 }, { t: '10:32', ch: 'pay', amt: 23500, fee: 470, vat: 50, dep: 22980 },
    { t: '11:18', ch: 'a', amt: 32000, fee: 3140, vat: 310, dep: 28550 }, { t: '11:46', ch: 'b', amt: 27500, fee: 2140, vat: 210, dep: 25150 },
    { t: '12:09', ch: 'card', amt: 158000, fee: 1740, vat: 0, dep: 156260 }, { t: '12:37', ch: 'a', amt: 41500, fee: 4070, vat: 410, dep: 37020 },
    { t: '13:05', ch: 'pay', amt: 64000, fee: 1280, vat: 130, dep: 62590 }, { t: '14:22', ch: 'b', amt: 38000, fee: 2960, vat: 300, dep: 34740 },
    { t: '17:48', ch: 'a', amt: 56500, fee: 5540, vat: 550, dep: 50410 }, { t: '18:30', ch: 'card', amt: 312000, fee: 3430, vat: 0, dep: 308570 },
    { t: '19:12', ch: 'b', amt: 47000, fee: 3670, vat: 370, dep: 42960 }, { t: '20:05', ch: 'card', amt: 474800, fee: 5220, vat: 0, dep: 469580 }
  ];
  var CHN = { a: '배달앱 A', b: '배달앱 B', card: '카드 단말기', pay: '간편결제' };

  function won(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function guard(fn) { try { fn(); } catch (e) { root.classList.add('no-motion'); } }
  var PH = '<span class="ph" aria-hidden="true"></span>';

  /* ---------- digit roller ---------- */
  function Roller(el) {
    var cur = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0, timer = 0;
    return {
      el: el,
      set: function (v, anim) {
        v = Math.round(v);
        if (v === cur) return;
        var s = won(v), prev = won(cur), html = '<span class="sr-only">' + s + '</span><span aria-hidden="true" style="display:inline-flex">', i;
        cur = v;
        clearTimeout(timer);
        if (!anim) { el.textContent = s; return; }
        for (i = 0; i < s.length; i++) {
          var ch = s[i], pc = prev[prev.length - s.length + i];
          if (ch === ',') { html += '<span class="roll">,</span>'; continue; }
          var fd = pc && pc !== ',' ? +pc : 0;
          html += '<span class="roll"><span class="roll__strip" style="transform:translateY(' + (-fd * 10) + '%)" data-to="' + ch + '">';
          for (var d = 0; d < 10; d++) html += '<span>' + d + '</span>';
          html += '</span></span>';
        }
        el.innerHTML = html + '</span>';
        void el.offsetWidth;
        el.querySelectorAll('.roll__strip').forEach(function (st) { st.style.transform = 'translateY(' + (-(+st.getAttribute('data-to')) * 10) + '%)'; });
        timer = setTimeout(function () { el.textContent = s; }, 480);
      }
    };
  }

  /* ---------- header ---------- */
  function initNav() {
    var btn = document.querySelector('.nav__toggle'), panel = document.getElementById('nav-panel'), header = document.getElementById('site-header');
    function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
    function set(v) { btn.setAttribute('aria-expanded', String(v)); panel.classList.toggle('is-open', v); }
    btn.addEventListener('click', function () { set(!isOpen()); if (isOpen()) panel.querySelector('a').focus(); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (isOpen() && !e.target.closest('.nav')) set(false); });
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; header.classList.toggle('is-scrolled', window.scrollY > 8); });
    }, { passive: true });
  }

  /* ---------- hero: chips fly into today's settlement ---------- */
  function initHero() {
    var app = document.getElementById('hero-app'), pile = app.querySelector('[data-pile]');
    var chips = Array.prototype.slice.call(pile.querySelectorAll('.chip'));
    var rows = Array.prototype.slice.call(app.querySelectorAll('[data-rows] tr'));
    var totalEl = app.querySelector('[data-total]'), prog = app.querySelector('[data-progress]'), count = app.querySelector('[data-count]');
    var hint = app.querySelector('[data-hint]'), live = app.querySelector('[data-live]'), replayBtn = app.querySelector('[data-act="replay"]');
    var filled = 0, sum = 0, tl = null, shown = { v: 0 }, totTween = null, flights = [];

    function setTotal(v, anim) {
      if (totTween) totTween.kill();
      if (!anim) { shown.v = v; totalEl.textContent = won(v); return; }
      totTween = G.to(shown, { v: v, duration: 0.42, ease: 'power2.out', onUpdate: function () { totalEl.textContent = won(shown.v); } });
    }
    function status() {
      prog.textContent = filled + '/12건 정산';
      count.textContent = (12 - filled) + '건';
      app.classList.toggle('is-clear', filled === 12);
    }
    function fillRow(row, d, anim) {
      var c = row.cells;
      c[0].textContent = d.t; c[2].textContent = won(d.fee); c[3].textContent = d.vat ? won(d.vat) : '면세'; c[4].textContent = won(d.dep);
      row.classList.remove('is-empty');
      if (anim) G.from([c[0], c[2], c[3], c[4]], { opacity: 0, y: 4, duration: 0.26, stagger: 0.04, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    function done() {
      live.textContent = '정산 완료. 12건, 입금 예정 1,284,300원';
      if (app.getAttribute('data-mode') === 'manual') hint.textContent = '딱 맞췄어요. 12건 모두 정산했어요.';
    }
    function place(chip, anim) {
      if (chip.parentNode !== pile || filled >= rows.length) return;
      var row = rows[filled], d = ROWS[+chip.getAttribute('data-i')], cell = row.cells[1], slot = cell.querySelector('.slot');
      var next = chips.filter(function (c) { return c !== chip && c.parentNode === pile; })[0];
      var hadFocus = document.activeElement === chip;
      filled++; sum += d.dep;
      chip.setAttribute('tabindex', '-1');
      if (!anim) {
        if (slot) slot.remove();
        cell.appendChild(chip);
        fillRow(row, d, false); setTotal(sum, false); status();
      } else {
        var state = Flip.getState(chip);
        cell.appendChild(chip);
        flights.push(Flip.from(state, {
          duration: 0.45, ease: 'power3.out', absolute: true, zIndex: 30,
          onComplete: function () {
            if (slot) slot.remove();
            G.timeline().to(chip, { scale: 1.04, duration: 0.09, ease: 'power2.out' }).to(chip, { scale: 1, duration: 0.2, ease: 'power2.inOut', clearProps: 'transform' });
            chip.classList.remove('is-flash'); void chip.offsetWidth; chip.classList.add('is-flash');
            fillRow(row, d, true); setTotal(sum, true); status();
          }
        }));
      }
      if (hadFocus) (next || replayBtn).focus();
      if (filled === rows.length) setTimeout(done, anim ? 500 : 0);
    }
    function reset(anim) {
      if (tl) { tl.kill(); tl = null; }
      flights.forEach(function (f) { f.progress(1); });
      flights = [];
      if (G) G.killTweensOf(chips);
      var placed = chips.filter(function (c) { return c.parentNode !== pile; });
      var state = anim && placed.length ? Flip.getState(placed) : null;
      rows.forEach(function (r) {
        var c = r.cells;
        c[0].innerHTML = PH; c[2].innerHTML = PH; c[3].innerHTML = PH; c[4].innerHTML = PH;
        if (!c[1].querySelector('.slot')) c[1].insertAdjacentHTML('afterbegin', '<span class="slot" aria-hidden="true"></span>');
        r.classList.add('is-empty');
      });
      chips.forEach(function (c) { c.removeAttribute('tabindex'); G && G.set(c, { clearProps: 'transform' }); pile.appendChild(c); });
      filled = 0; sum = 0; setTotal(0, false); status(); live.textContent = '';
      if (state) Flip.from(state, { duration: 0.42, ease: 'power3.inOut', absolute: true, zIndex: 30, stagger: 0.012 });
    }
    function auto(delay) {
      if (tl) tl.kill();
      tl = G.timeline({ delay: delay });
      chips.forEach(function (c, i) { tl.call(function () { place(c, true); }, null, i * 0.26); });
    }
    pile.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) place(chip, MOTION);
    });
    app.querySelector('[data-act="replay"]').addEventListener('click', function () {
      app.setAttribute('data-mode', 'auto'); hint.textContent = '';
      if (!MOTION) { reset(false); chips.forEach(function (c) { place(c, false); }); return; }
      reset(true); auto(0.5);
    });
    app.querySelector('[data-act="try"]').addEventListener('click', function () {
      app.setAttribute('data-mode', 'manual');
      reset(MOTION);
      hint.textContent = '칩을 눌러 표에 넣어 보세요. 키보드로는 Tab과 Enter를 쓰면 돼요.';
    });

    if (SHOT) { chips.slice(0, 6).forEach(function (c) { place(c, false); }); return; }
    if (!MOTION) { chips.forEach(function (c) { place(c, false); }); return; }
    // phones: the table sits below the pile, so start when it can be seen
    if (window.innerWidth < 900 && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); auto(0.2); } }, { threshold: 0.2 });
      io.observe(app.querySelector('.ledger__table'));
    } else auto(0.3);
  }

  /* ---------- the three-step demo window ---------- */
  function Stage(el, start) {
    var chips = Array.prototype.slice.call(el.querySelectorAll('.chip')).sort(function (a, b) { return a.getAttribute('data-i') - b.getAttribute('data-i'); });
    var trays = {}, tokens = {}, step = 1, flight = null;
    el.querySelectorAll('[data-group]').forEach(function (g) { trays[g.getAttribute('data-group')] = g.querySelector('.tray__chips'); });
    el.querySelectorAll('.mc__tokens').forEach(function (t) { tokens[t.getAttribute('data-dep')] = t; });
    var cells = Array.prototype.map.call(el.querySelectorAll('.ledger__table--stage tbody tr'), function (r) { return r.cells[0]; });
    var switches = Array.prototype.slice.call(el.querySelectorAll('[data-conn]')), countEl = el.querySelector('.sx-main .pane-count');
    var fees = Array.prototype.slice.call(el.querySelectorAll('.ledger__table--stage td[data-v]'));

    function home(c, n) { var ch = c.getAttribute('data-ch'); return n <= 1 ? trays[ch] : n === 2 ? cells[+c.getAttribute('data-i')] : tokens[ch]; }
    function layers(n) {
      el.querySelectorAll('.sx-layer').forEach(function (l) { l.classList.toggle('is-on', +l.getAttribute('data-layer') === n); });
      el.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.toggle('is-on', +t.getAttribute('data-tab') === n); });
      el.classList.toggle('is-match', n === 2);
      el.setAttribute('data-step', String(n));
    }
    function setConn(ch, on) {
      switches.forEach(function (s) { if (s.getAttribute('data-conn') === ch) s.setAttribute('aria-checked', String(on)); });
      chips.forEach(function (c) { if (c.getAttribute('data-ch') === ch) c.classList.toggle('is-out', !on); });
      var n = chips.filter(function (c) { return !c.classList.contains('is-out'); }).length;
      if (countEl) countEl.textContent = n + '건';
    }
    function allOn() { ['a', 'b', 'card', 'pay'].forEach(function (ch) { setConn(ch, true); }); }
    function countFees(anim) {
      fees.forEach(function (td) {
        var v = +td.getAttribute('data-v');
        if (!v) return;
        if (!anim) { td.textContent = won(v); return; }
        var o = { v: 0 };
        G.to(o, { v: v, duration: 0.7, ease: 'power2.out', delay: 0.15, onUpdate: function () { td.textContent = won(o.v); } });
      });
    }
    function go(n, anim) {
      if (n === step) return;
      var prev = step;
      step = n;
      if (n === 0) { layers(1); chips.forEach(function (c) { trays[c.getAttribute('data-ch')].appendChild(c); }); ['a', 'b', 'card', 'pay'].forEach(function (ch) { setConn(ch, false); }); return; }
      if (prev === 0 && n === 1) {
        layers(1);
        if (!anim) { allOn(); return; }
        ['a', 'b', 'card', 'pay'].forEach(function (ch, k) {
          G.delayedCall(0.15 + k * 0.32, function () {
            setConn(ch, true);
            var mine = chips.filter(function (c) { return c.getAttribute('data-ch') === ch; });
            G.from(mine, { opacity: 0, y: -8, scale: 0.94, duration: 0.32, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
          });
        });
        return;
      }
      if (flight) { flight.progress(1); flight = null; }
      allOn();
      var state = anim ? Flip.getState(chips) : null;
      chips.forEach(function (c) { home(c, n).appendChild(c); });
      layers(n);
      if (n === 2) countFees(anim);
      if (state) flight = Flip.from(state, { duration: 0.62, ease: 'power3.inOut', absolute: true, zIndex: 20, stagger: { each: 0.022, from: n === 3 ? 'start' : 'end' } });
    }
    switches.forEach(function (s) {
      s.addEventListener('click', function () {
        var on = s.getAttribute('aria-checked') !== 'true', ch = s.getAttribute('data-conn');
        setConn(ch, on);
        if (on && MOTION) G.from(chips.filter(function (c) { return c.getAttribute('data-ch') === ch; }), { opacity: 0, y: -6, duration: 0.26, stagger: 0.05, ease: 'power3.out', clearProps: 'all' });
      });
    });
    // place everything for the starting step without animation
    if (start === 0) go(0, false);
    else if (start > 1) { step = 1; go(start, false); }
    return { go: go, get step() { return step; } };
  }

  function initSteps() {
    var section = document.querySelector('.steps'), original = section.querySelector('[data-stage]');
    var slots = Array.prototype.slice.call(section.querySelectorAll('[data-slot]')), frame = section.querySelector('[data-frame]');
    var items = Array.prototype.slice.call(section.querySelectorAll('.step'));
    if (!CAN || !ST) { Stage(original, 1); return; }
    var pristine = original.cloneNode(true);
    original.remove();
    function stacked() {
      var made = [1, 2, 3].map(function (n) {
        var el = pristine.cloneNode(true);
        el.classList.add('is-stacked');
        slots[n - 1].appendChild(el);
        var stage = Stage(el, MOTION ? n - 1 : n);
        if (MOTION) ST.create({ trigger: el, start: 'top 72%', once: true, onEnter: function () { stage.go(n, true); } });
        return el;
      });
      return function () { made.forEach(function (m) { m.remove(); }); };
    }
    function sticky() {
      var el = pristine.cloneNode(true);
      section.classList.add('is-sticky');
      frame.appendChild(el);
      var stage = Stage(el, 0);
      items.forEach(function (it, i) {
        ST.create({
          trigger: it, start: 'top 58%', end: 'bottom 58%',
          onToggle: function (self) {
            if (!self.isActive) return;
            items.forEach(function (o) { o.classList.toggle('is-active', o === it); });
            stage.go(i + 1, true);
          }
        });
      });
      return function () { section.classList.remove('is-sticky'); el.remove(); items.forEach(function (o) { o.classList.remove('is-active'); }); };
    }
    var mm = G.matchMedia();
    mm.add({ desk: '(min-width: 1024px)', mob: '(max-width: 1023.98px)', reduce: '(prefers-reduced-motion: reduce)' }, function (c) {
      return c.conditions.desk && !c.conditions.reduce && !SHOT ? sticky() : stacked();
    });
  }

  /* ---------- deposit calendar popover ---------- */
  function initCalendar() {
    var card = document.querySelector('.month-card'), pop = document.getElementById('cal-pop');
    var rowsEl = pop.querySelector('[data-pop-rows]'), titleEl = document.getElementById('cal-pop-title'), totalEl = pop.querySelector('[data-pop-total]');
    var days = Array.prototype.slice.call(card.querySelectorAll('button.day')), openDay = null, closeT = 0;
    var ORDER = ['card', 'pay', 'b', 'a'];
    function fill(day) {
      var dep = {}, sum = 0, done = day.classList.contains('day--done');
      day.getAttribute('data-dep').split(';').forEach(function (p) { var kv = p.split(':'); dep[kv[0]] = +kv[1]; });
      titleEl.innerHTML = '<span>11월 ' + day.getAttribute('data-day') + '일 ' + day.getAttribute('data-wd') + '요일</span><span class="state ' + (done ? 'state--done">입금 완료' : 'state--soon">입금 예정') + '</span>';
      rowsEl.innerHTML = ORDER.filter(function (k) { return dep[k]; }).map(function (k) { sum += dep[k]; return '<li><span class="dot dot--' + k + '" aria-hidden="true"></span>' + CHN[k] + '<strong>' + won(dep[k]) + '원</strong></li>'; }).join('');
      totalEl.textContent = won(sum) + '원';
    }
    function place(day) {
      var cr = card.getBoundingClientRect(), dr = day.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      var cx = dr.left - cr.left + dr.width / 2, left = Math.max(8, Math.min(cr.width - pw - 8, cx - pw / 2));
      var below = dr.bottom - cr.top + 8, above = dr.top - cr.top - ph - 8, up = below + ph > cr.height + 24 && above > -24;
      pop.style.left = left + 'px';
      pop.style.top = (up ? above : below) + 'px';
      pop.style.setProperty('--ox', (cx - left) + 'px');
      pop.style.setProperty('--oy', up ? '100%' : '0%');
    }
    function open(day) {
      clearTimeout(closeT);
      if (openDay === day) return;
      if (openDay) openDay.setAttribute('aria-expanded', 'false');
      openDay = day;
      day.setAttribute('aria-expanded', 'true');
      fill(day);
      pop.hidden = false;
      pop.classList.remove('is-closing');
      pop.style.animation = 'none'; void pop.offsetWidth; pop.style.animation = '';
      place(day);
    }
    function close(now) {
      if (!openDay) return;
      openDay.setAttribute('aria-expanded', 'false');
      openDay = null;
      if (now) { pop.hidden = true; return; }
      pop.classList.add('is-closing');
      closeT = setTimeout(function () { if (!openDay) { pop.hidden = true; pop.classList.remove('is-closing'); } }, 120);
    }
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    days.forEach(function (d) {
      if (fine) d.addEventListener('pointerenter', function () { open(d); });
      d.addEventListener('focus', function () { open(d); });
      d.addEventListener('click', function () { if (openDay === d && !fine) close(); else open(d); });
    });
    if (fine) card.addEventListener('pointerleave', function () { closeT = setTimeout(function () { close(); }, 140); });
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDay) { var d = openDay; close(true); d.focus(); close(true); } });
    document.addEventListener('pointerdown', function (e) { if (openDay && !card.contains(e.target)) close(); });
    window.addEventListener('resize', function () { if (openDay) place(openDay); });
  }

  /* ---------- fee calculator ---------- */
  var CALC = [
    { k: 'a', name: '배달앱 A', rate: 0.098 * 1.1 }, { k: 'b', name: '배달앱 B', rate: 0.078 * 1.1 },
    { k: 'card', name: '카드 단말기', rate: 0.011 }, { k: 'pay', name: '간편결제', rate: 0.02 * 1.1 }
  ];
  var CCOL = { a: '#FF6B57', b: '#2F8CFF', card: '#F2A20C', pay: '#12B886' };
  function initCalc() {
    var form = document.getElementById('calc'), sales = document.getElementById('calc-sales'), share = document.getElementById('calc-share');
    var so = document.getElementById('calc-sales-out'), sh = document.getElementById('calc-share-out'), bar = form.querySelector('[data-calc-bar]');
    var legend = form.querySelector('[data-calc-legend]'), rate = form.querySelector('[data-calc-rate]'), total = Roller(form.querySelector('[data-calc-total]'));
    var NS = 'http://www.w3.org/2000/svg', rects = {};
    CALC.forEach(function (c) { var r = document.createElementNS(NS, 'rect'); r.setAttribute('y', '0'); r.setAttribute('height', '28'); r.setAttribute('fill', CCOL[c.k]); bar.appendChild(r); rects[c.k] = r; });
    legend.innerHTML = CALC.map(function (c) { return '<li><span class="dot dot--' + c.k + '" aria-hidden="true"></span><span>' + c.name + '</span><span class="amt" data-amt="' + c.k + '"></span><span class="pct" data-pct="' + c.k + '"></span></li>'; }).join('');
    function fill(input) { input.style.setProperty('--p', ((input.value - input.min) / (input.max - input.min) * 100) + '%'); }
    function update(anim) {
      var S = +sales.value * 10000, d = S * +share.value / 100, rest = S - d;
      var base = { a: d * 0.6, b: d * 0.4, card: rest * 0.78, pay: rest * 0.22 }, fee = {}, tot = 0;
      CALC.forEach(function (c) { fee[c.k] = Math.round(base[c.k] * c.rate / 100) * 100; tot += fee[c.k]; });
      so.textContent = won(+sales.value) + '만 원';
      sh.textContent = share.value + '%';
      fill(sales); fill(share);
      sales.setAttribute('aria-valuetext', won(+sales.value) + '만 원');
      share.setAttribute('aria-valuetext', share.value + '퍼센트');
      var x = 0, gap = 2, live = CALC.filter(function (c) { return fee[c.k] > 0; }), avail = 600 - gap * Math.max(0, live.length - 1);
      CALC.forEach(function (c) {
        var w = tot ? fee[c.k] / tot * avail : 0;
        if (anim && MOTION) G.to(rects[c.k], { attr: { x: x, width: w }, duration: 0.32, ease: 'power3.out', overwrite: true });
        else { rects[c.k].setAttribute('x', x); rects[c.k].setAttribute('width', w); }
        if (w > 0) x += w + gap;
        legend.querySelector('[data-amt="' + c.k + '"]').textContent = won(fee[c.k]) + '원';
        legend.querySelector('[data-pct="' + c.k + '"]').textContent = tot ? Math.round(fee[c.k] / tot * 100) + '%' : '0%';
      });
      total.set(tot, anim && MOTION);
      rate.textContent = '매출의 ' + (S ? (tot / S * 100).toFixed(1) : '0.0') + '%';
    }
    var t = 0;
    form.addEventListener('input', function () { update(false); clearTimeout(t); });
    form.addEventListener('change', function () { update(true); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    update(false);
  }

  /* ---------- small controls ---------- */
  function initShare() {
    var sw = document.querySelector('[data-switch]'), next = document.querySelector('[data-share-next]');
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      next.textContent = on ? '다음 자동 전송: 12월 5일 오전 9시' : '자동 전송을 껐어요. 필요할 때 직접 보낼 수 있어요.';
    });
  }
  function initPricing() {
    var box = document.querySelector('.billing'), opts = Array.prototype.slice.call(box.querySelectorAll('[data-bill]'));
    var nums = Array.prototype.map.call(document.querySelectorAll('.pt-num'), Roller), pers = document.querySelectorAll('[data-per]');
    function set(bill, focus) {
      box.setAttribute('data-billing', bill);
      opts.forEach(function (o) { var on = o.getAttribute('data-bill') === bill; o.setAttribute('aria-checked', String(on)); o.tabIndex = on ? 0 : -1; if (on && focus) o.focus(); });
      nums.forEach(function (r) { r.set(+r.el.getAttribute(bill === 'year' ? 'data-year' : 'data-month'), MOTION); });
      pers.forEach(function (p) {
        var m = +p.parentNode.querySelector('.pt-num').getAttribute('data-year');
        p.textContent = bill === 'year' ? '매달, 연 ' + won(m * 12) + '원 한 번 결제' : '매달';
      });
    }
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { set(o.getAttribute('data-bill')); });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); set(opts[(i + 1) % 2].getAttribute('data-bill'), true); }
      });
    });
    opts[1].tabIndex = -1;
    var table = document.querySelector('.price-table');
    document.querySelectorAll('[data-plan-tab]').forEach(function (b, i, all) {
      b.addEventListener('click', function () {
        table.setAttribute('data-plan', b.getAttribute('data-plan-tab'));
        all.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
  }
  function initFaq() {
    document.querySelectorAll('.qa__q').forEach(function (q) {
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') !== 'true';
        q.setAttribute('aria-expanded', String(open));
        q.closest('.qa').classList.toggle('is-open', open);
      });
    });
  }
  function initSignup() {
    var form = document.getElementById('signup'), msg = document.getElementById('su-error'), shop = form.elements.shop, phone = form.elements.phone;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var digits = phone.value.replace(/\D/g, ''), bad = [];
      shop.setAttribute('aria-invalid', String(!shop.value.trim()));
      phone.setAttribute('aria-invalid', String(digits.length < 9));
      if (!shop.value.trim()) bad.push('가게 이름을 적어 주세요');
      if (digits.length < 9) bad.push('휴대폰 번호를 숫자로 적어 주세요');
      msg.classList.toggle('is-ok', !bad.length);
      if (bad.length) { msg.textContent = bad.join('. ') + '.'; (shop.value.trim() ? phone : shop).focus(); return; }
      msg.textContent = shop.value.trim() + ' 사장님, 첫 정산표를 준비할게요. 컨셉 시안이라 실제로 접수되지는 않습니다.';
    });
  }

  /* ---------- a few meaningful entrances ---------- */
  function initEntrances() {
    if (!G) return;
    var mm = G.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, function () {
      if (SHOT) return;
      G.from(['.hero__title', '.hero__lead', '.hero__actions'], { y: 14, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' });
      if (!ST) return;
      ['.month-card', '.calc', '.share__card', '.flow'].forEach(function (sel) {
        G.from(sel, { y: 28, duration: 0.7, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: sel, start: 'top 88%', once: true } });
      });
      G.from('.share__reply', { y: 14, opacity: 0, duration: 0.5, delay: 0.35, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.share', start: 'top 80%', once: true } });
    });
  }

  guard(initNav);
  guard(initEntrances);
  guard(initHero);
  guard(initSteps);
  guard(initCalendar);
  guard(initCalc);
  guard(initShare);
  guard(initPricing);
  guard(initFaq);
  guard(initSignup);
  if (ST) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
  }
})();
