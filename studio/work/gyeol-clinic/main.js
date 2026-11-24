/* 결 피부과의원 · page behaviour (tabs, comparison sliders, hours, booking). Quiet by design. */
(function () {
  'use strict';

  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  var G = window.gsap;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function calm() { return SHOT || mqReduce.matches || !G; }
  function guard(fn) { try { fn(); } catch (err) { root.classList.add('no-motion'); } }

  if (G) G.registerPlugin.apply(G, [window.ScrollTrigger, window.DrawSVGPlugin].filter(Boolean));

  /* ---------- header ---------- */
  guard(function () {
    var header = $('.site-header');
    var ticking = false;
    function update() { ticking = false; header.classList.toggle('is-solid', window.scrollY > 24); }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });

  /* ---------- mobile menu ---------- */
  guard(function () {
    var btn = $('.menu-btn'), nav = $('#site-nav'), header = $('.site-header');
    var text = $('.menu-btn__text', btn);
    var mqDesk = window.matchMedia('(min-width: 1024px)');
    function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
    function setOpen(open, restore) {
      btn.setAttribute('aria-expanded', String(open));
      text.textContent = open ? '닫기' : '메뉴';
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      if (open) { var a = $('a', nav); if (a) a.focus(); }
      else if (restore) btn.focus();
    }
    btn.addEventListener('click', function () { setOpen(!isOpen(), true); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && isOpen()) setOpen(false, false); });
    document.addEventListener('click', function (e) { if (isOpen() && !e.target.closest('.site-header')) setOpen(false, true); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
      if (e.key !== 'Tab') return;
      var items = $$('a, button', header).filter(function (el) { return el.offsetParent !== null; });
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', function () { if (mqDesk.matches && isOpen()) setOpen(false, false); });
  });

  /* ---------- concern tabs: the selected colour is a clipped copy of the list ---------- */
  guard(function () {
    var list = $('.tabs__list[role="tablist"]');
    var lit = $('.tabs__list--lit');
    var scroller = $('.tabs__scroller');
    var tabs = $$('[role="tab"]', list);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var current = 0;

    function clipTo(i, animate) {
      // sub-pixel boxes, so no sliver of the neighbouring tab shows
      var lr = list.getBoundingClientRect(), tr = tabs[i].getBoundingClientRect();
      var left = Math.max(0, tr.left - lr.left + 0.5), right = Math.max(0, lr.right - tr.right + 0.5);
      if (!animate) lit.style.transition = 'none';
      lit.style.clipPath = 'inset(0 ' + right + 'px 0 ' + left + 'px round 999px)';
      if (!animate) { void lit.offsetWidth; lit.style.transition = ''; }
    }
    function select(i, focus, animate) {
      current = i;
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
      });
      clipTo(i, animate);
      if (focus) tabs[i].focus();
      var t = tabs[i];
      if (scroller.scrollWidth > scroller.clientWidth) {
        scroller.scrollTo({ left: Math.max(0, t.offsetLeft - 24), behavior: calm() ? 'auto' : 'smooth' });
      }
      if (animate && G) {
        G.fromTo(panels[i], { opacity: 0 }, { opacity: 1, duration: calm() ? 0.12 : 0.28, ease: 'power2.out', clearProps: 'opacity' });
      }
      document.dispatchEvent(new CustomEvent('gyeol:panel', { detail: panels[i] }));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { if (i !== current) select(i, false, true); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true, true); }
      });
    });
    function fade() { scroller.classList.toggle('has-more', scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4); }
    scroller.addEventListener('scroll', fade, { passive: true });
    select(0, false, false);
    fade();
    var reclip = function () { clipTo(current, false); fade(); };
    window.addEventListener('resize', reclip);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reclip);
  });

  /* ---------- before/after sliders ---------- */
  guard(function () {
    $$('.compare').forEach(function (fig) {
      var stage = $('.compare__stage', fig), afterEl = $('.compare__after', fig), handle = $('.compare__handle', fig);
      var pos = 50, width = 0, drag = null, pending = null, introTween = null, introduced = false;
      function measure() { width = stage.clientWidth; }
      function set(p) {
        pos = Math.max(0, Math.min(100, p));
        afterEl.style.clipPath = 'inset(0 0 0 ' + pos.toFixed(2) + '%)';
        handle.style.transform = 'translateX(' + ((pos / 100 - 0.5) * width).toFixed(1) + 'px)';
        var v = Math.round(pos);
        handle.setAttribute('aria-valuenow', String(v));
        handle.setAttribute('aria-valuetext', '치료 전 예시 ' + v + '퍼센트, 치료 후 예시 ' + (100 - v) + '퍼센트');
      }
      function fromEvent(e) {
        var r = stage.getBoundingClientRect();
        return ((e.clientX - r.left) / r.width) * 100;
      }
      function begin(e) {
        if (introTween) { introTween.kill(); introTween = null; }
        drag = e.pointerId;
        measure();
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('is-dragging');
        set(fromEvent(e));
      }
      stage.addEventListener('pointerdown', function (e) {
        if (e.button > 0 || drag !== null) return;
        // a finger on the circle may just be scrolling the page: wait for a sideways move (the handle starts at once)
        if (e.pointerType === 'touch' && !e.target.closest('.compare__handle')) {
          pending = { id: e.pointerId, x: e.clientX, y: e.clientY };
          return;
        }
        begin(e);
      });
      stage.addEventListener('pointermove', function (e) {
        if (pending && e.pointerId === pending.id) {
          var dx = e.clientX - pending.x, dy = e.clientY - pending.y;
          if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { pending = null; begin(e); }
          else if (Math.abs(dy) > 6) pending = null;
          return;
        }
        if (drag === e.pointerId) set(fromEvent(e));
      });
      function end(e) {
        if (pending && pending.id === e.pointerId) pending = null;
        if (drag !== e.pointerId) return;
        drag = null;
        stage.classList.toggle('is-dragging', false);
      }
      stage.addEventListener('pointerup', end);
      stage.addEventListener('pointercancel', end);
      handle.addEventListener('keydown', function (e) {
        var step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -10, PageUp: 10 }[e.key];
        if (step !== undefined) { e.preventDefault(); set(pos + step); }
        else if (e.key === 'Home') { e.preventDefault(); set(0); }
        else if (e.key === 'End') { e.preventDefault(); set(100); }
      });
      if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); set(pos); }).observe(stage);
      measure();
      set(50);
      // the first time a circle is seen, the divider glides from 30% to 50% so it reads as movable
      if ('IntersectionObserver' in window && G) {
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting || introduced) return;
          introduced = true;
          io.disconnect();
          if (calm() || drag !== null) return;
          var o = { p: 30 };
          set(30);
          introTween = G.to(o, { p: 50, duration: 0.6, delay: 0.15, ease: 'power2.out', onUpdate: function () { set(o.p); }, onComplete: function () { introTween = null; } });
        }, { threshold: 0.5 });
        io.observe(stage);
      }
    });
  });

  /* ---------- hours: today's row and whether the clinic is open right now (Seoul time) ---------- */
  var DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  var HOURS = { 1: [600, 1140], 2: [600, 1140], 3: [600, 1260], 4: [600, 1140], 5: [600, 1140], 6: [570, 840] };
  var LUNCH = [780, 840];
  function seoul() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday),
      min: (+o.hour % 24) * 60 + +o.minute,
      iso: o.year + '-' + o.month + '-' + o.day
    };
  }
  function clock(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    var label = (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + '시';
    return mm ? label + ' ' + mm + '분' : label;
  }
  function nextOpen(day) {
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7;
      if (HOURS[d]) return (i === 1 ? '내일 ' : DAYS[d] + ' ') + clock(HOURS[d][0]);
    }
    return '';
  }

  guard(function () {
    var status = $('[data-status]');
    var text = $('.status__text', status), label = $('.status__label', status);
    function update() {
      var now = seoul();
      $$('.hours tr').forEach(function (tr) {
        var today = +tr.dataset.day === now.day;
        tr.classList.toggle('is-today', today);
        if (today) tr.setAttribute('aria-current', 'date'); else tr.removeAttribute('aria-current');
        var mark = $('.today-mark', tr);
        if (today && !mark) {
          mark = document.createElement('span');
          mark.className = 'today-mark';
          mark.textContent = '오늘';
          $('th', tr).appendChild(mark);
        } else if (!today && mark) mark.remove();
      });
      var h = HOURS[now.day], m = now.min, head, msg, open = false;
      if (!h) { head = '오늘 휴진'; msg = '다음 진료는 ' + nextOpen(now.day) + '입니다.'; }
      else if (m < h[0]) { head = '진료 전'; msg = '오늘 ' + clock(h[0]) + '에 시작합니다.'; }
      else if (now.day !== 6 && m >= LUNCH[0] && m < LUNCH[1]) { head = '점심시간'; msg = '오후 2시에 다시 받습니다.'; }
      else if (m < h[1] - 30) { open = true; head = '지금 진료 중'; msg = '접수는 ' + clock(h[1] - 30) + '까지 받습니다.'; }
      else { head = '접수 마감'; msg = '다음 진료는 ' + nextOpen(now.day) + '입니다.'; }
      label.textContent = head;
      text.textContent = msg;
      status.classList.toggle('is-open', open);
      status.classList.toggle('is-closed', !open);
    }
    update();
    setInterval(update, 60000);
  });

  /* ---------- booking form ---------- */
  guard(function () {
    var form = $('#booking-form');
    var done = $('[data-done]'), doneText = $('[data-done-text]');
    var f = {
      name: $('#f-name'), phone: $('#f-phone'), concern: $('#f-concern'), date: $('#f-date'), agree: $('#f-agree')
    };
    var timeSet = $('.field--choice', form);
    var summary = $('[data-summary]', form), timeHelp = $('[data-time-help]', form);
    var tried = false;
    var today = seoul().iso;
    f.date.min = today;
    var HOLIDAYS = ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'];
    // the example date in the hint is a real, bookable day a week from now
    (function () {
      var p = today.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 7));
      while (d.getUTCDay() === 0 || HOLIDAYS.indexOf(d.toISOString().slice(5, 10)) >= 0) d.setUTCDate(d.getUTCDate() + 1);
      $('#h-date').textContent = '예: ' + d.toISOString().slice(0, 10) + '. 일요일과 공휴일은 쉽니다.';
    })();

    function weekday(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
    function time() { var r = $('input[name="time"]:checked', form); return r ? r.value : ''; }

    var checks = {
      name: function () { return f.name.value.trim().length >= 2 ? '' : '이름을 두 글자 이상 적어 주세요.'; },
      phone: function () {
        var d = f.phone.value.replace(/[^0-9]/g, '');
        return /^0\d{8,10}$/.test(d) ? '' : '연락처를 숫자로 적어 주세요. 예를 들면 010-1234-5678입니다.';
      },
      concern: function () { return f.concern.value ? '' : '고민을 하나 골라 주세요. 잘 모르겠다면 마지막 항목을 고르면 됩니다.'; },
      date: function () {
        var v = f.date.value;
        if (!v) return '원하는 날을 골라 주세요.';
        if (v < today) return '지난 날짜는 고를 수 없습니다.';
        if (weekday(v) === 0) return '일요일은 쉽니다. 다른 날을 골라 주세요.';
        if (HOLIDAYS.indexOf(v.slice(5)) >= 0) return '공휴일은 쉽니다. 다른 날을 골라 주세요.';
        return '';
      },
      time: function () {
        var t = time(), v = f.date.value;
        if (!t) return '시간대를 골라 주세요.';
        if (t === '저녁' && v && weekday(v) !== 3) return '저녁 진료는 수요일에만 합니다.';
        if (t !== '오전' && v && weekday(v) === 6) return '토요일은 오후 2시에 마치므로 오전만 예약할 수 있습니다.';
        return '';
      },
      agree: function () { return f.agree.checked ? '' : '동의해 주셔야 예약 연락을 드릴 수 있습니다.'; }
    };
    var errEl = { name: '#e-name', phone: '#e-phone', concern: '#e-concern', date: '#e-date', time: '#e-time', agree: '#e-agree' };
    function show(key, msg) {
      var el = $(errEl[key]);
      el.textContent = msg;
      el.hidden = !msg;
      if (key === 'time') timeSet.classList.toggle('is-invalid', !!msg);
      else f[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function validate(announce) {
      var first = null, count = 0;
      Object.keys(checks).forEach(function (k) {
        var msg = checks[k]();
        show(k, msg);
        if (msg) { count++; if (!first) first = k; }
      });
      if (announce || !count) summary.textContent = count ? '입력을 확인해 주세요. ' + count + '곳을 고쳐야 합니다.' : '';
      return first;
    }
    // times the chosen day does not offer are switched off before anyone picks them
    var radiosByValue = {};
    $$('input[name="time"]', form).forEach(function (r) { radiosByValue[r.value] = r; });
    function syncTimes() {
      var v = f.date.value, wd = v ? weekday(v) : -1;
      var noEvening = !!v && wd !== 3, noAfternoon = wd === 6;
      [['저녁', noEvening], ['오후', noAfternoon]].forEach(function (pair) {
        var r = radiosByValue[pair[0]];
        r.disabled = pair[1];
        if (pair[1] && r.checked) r.checked = false;
      });
      var note = wd === 6 ? '토요일은 오후 2시에 마치므로 오전만 예약할 수 있습니다.' : noEvening ? '저녁 진료는 수요일에만 합니다.' : '';
      timeHelp.textContent = note;
      timeHelp.hidden = !note;
    }
    f.date.addEventListener('change', syncTimes);
    f.date.addEventListener('input', syncTimes);
    form.addEventListener('input', function () { if (tried) validate(false); });
    form.addEventListener('change', function () { if (tried) validate(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      tried = true;
      var bad = validate(true);
      if (bad) {
        (bad === 'time' ? $('input[name="time"]', form) : f[bad]).focus();
        return;
      }
      var p = f.date.value.split('-');
      var when = (+p[1]) + '월 ' + (+p[2]) + '일 ' + DAYS[weekday(f.date.value)];
      doneText.textContent = f.name.value.trim() + '님, ' + when + ' ' + time() + ' 첫 진료 요청을 받았습니다. 하루 안에 ' +
        f.phone.value.trim() + '로 전화드려 정확한 시간을 맞추겠습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
    $('.done__again', done).addEventListener('click', function () {
      form.reset();
      tried = false;
      Object.keys(checks).forEach(function (k) { show(k, ''); });
      summary.textContent = '';
      syncTimes();
      done.hidden = true;
      form.hidden = false;
      f.name.focus();
    });
  });

  /* ---------- quiet scroll moments ---------- */
  if (!G || !window.ScrollTrigger) return;
  guard(function () {
    var mm = G.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (SHOT) return;
      var ST = window.ScrollTrigger;
      function moment(trigger, targets, from, to, start) {
        if (!trigger || !targets.length) return;
        if (trigger.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        G.set(targets, from);
        ST.create({ trigger: trigger, start: start || 'top 86%', once: true, onEnter: function () { G.to(targets, to); } });
      }
      // each principle settles into place as it is reached
      $$('.principle').forEach(function (el) {
        moment(el, [el], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' }, 'top 85%');
      });
      // the doctors' lens rings are drawn once
      if (window.DrawSVGPlugin) {
        $$('.doctor').forEach(function (el) {
          moment(el, $$('.monogram__ring, .monogram__glint', el), { drawSVG: '0%' },
            { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.15 }, 'top 80%');
        });
      }
      var refresh = function () { ST.refresh(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      window.addEventListener('load', refresh, { once: true });
    });
  });
})();
