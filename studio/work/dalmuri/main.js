/* 달무리: 모션, 코스 접시, 달의 위상 예약 달력, 차례. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  if (SHOT) root.classList.add('is-shot');
  var G = window.gsap;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lenis = null;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function safe(fn) {
    try { fn(); } catch (err) { window.__dalmuriErr = (window.__dalmuriErr || []).concat(String(err && err.stack || err)); root.classList.add("no-motion"); unhide(); }
  }
  // 무엇이든 실패하면 숨겨진 채 남은 글이 없도록 되돌린다
  function unhide() {
    if (!G) return;
    try {
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      G.globalTimeline.getChildren(true, true, false).forEach(function (t) { t.progress(1); });
      G.set('[data-reveal], .sec__title > span, .hero__col, .hero__aside > *, .plan__line, .plan__seat, .plan__labels', { clearProps: 'opacity,transform,clipPath,visibility,strokeDasharray,strokeDashoffset' });
    } catch (e) { /* 정적 상태로 둔다 */ }
  }


  /* ---------------- 모션 ---------------- */
  function initMotion() {
    var plugins = [window.ScrollTrigger, window.SplitText, window.MorphSVGPlugin, window.DrawSVGPlugin].filter(Boolean);
    G.registerPlugin.apply(G, plugins);
    var ST = window.ScrollTrigger;
    var bar = $('#bar');

    // 데스크톱 고운 포인터에서만 부드러운 스크롤
    if (window.Lenis && !SHOT && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMQ.matches) {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (time) { lenis.raf(time * 1000); });
      G.ticker.lagSmoothing(0);
    }

    ST.create({
      start: 40, end: 'max',
      onToggle: function (self) { bar.classList.toggle('is-solid', self.isActive); }
    });

    var mm = G.matchMedia();
    // 고정(pin) 구간을 아래쪽 트리거보다 먼저 만든다
    coursePin(mm);
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)'
    }, function (ctx) {
      if (ctx.conditions.reduce) return;
      if (!SHOT) heroIntro();
      sectionReveals();
    });

    var fontsReady = Promise.race([
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      new Promise(function (r) { setTimeout(r, 800); })
    ]);
    fontsReady.then(function () {
      safe(function () { courseSplit(mm); });
      ST.refresh();
    });
  }

  function heroIntro() {
    var tl = G.timeline({ defaults: { ease: 'power3.out' } });
    // 붓이 내려 쓰듯 세로줄을 위에서 아래로 연다
    tl.fromTo('.hero__col', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, stagger: 0.22, ease: 'power2.inOut' }, 0.1)
      .from('.hero__aside > *', { autoAlpha: 0, y: 12, duration: 0.6, stagger: 0.08 }, 0.45)
      .from('.hero__cue', { autoAlpha: 0, duration: 0.6 }, 0.9);
  }

  function sectionReveals() {
    $$('.sec__head').forEach(function (head) {
      var cols = $$('.sec__title > span', head);
      G.fromTo(cols, { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, stagger: 0.18, ease: 'power2.inOut',
        scrollTrigger: { trigger: head, start: 'top 82%', once: true }
      });
    });
    G.from('.philo__text > *', {
      autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '.philo__text', start: 'top 78%', once: true }
    });
    G.from('.philo__rules > div', {
      autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '.philo__rules', start: 'top 82%', once: true }
    });
    if (window.DrawSVGPlugin) {
      var tl = G.timeline({ scrollTrigger: { trigger: '.space__plan', start: 'top 75%', once: true } });
      tl.from('.plan__line', { drawSVG: 0, duration: 0.85, stagger: 0.05, ease: 'power2.inOut' })
        .from('.plan__seat', { autoAlpha: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.035, ease: 'power2.out' }, 0.45)
        .from('.plan__labels', { autoAlpha: 0, duration: 0.5 }, 0.9);
    }
  }

  /* ---------------- 코스 접시 ---------------- */
  var course = null;

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function smooth(pts) {
    var n = pts.length, f = function (v) { return v.toFixed(1); };
    var d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ',' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f(p2[0] - (p3[0] - p1[0]) / 6) + ',' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ',' + f(p2[1]);
    }
    return d + 'Z';
  }
  function blob(cx, cy, rx, ry, rot, wob, seed) {
    var r = rng(seed), pts = [], n = 14, c = Math.cos(rot), s = Math.sin(rot);
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, k = 1 + (r() - 0.5) * wob;
      var x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return smooth(pts);
  }
  // 호를 따라 굵기가 변하는 붓질 띠: 초승달, 말린 새우, 국그릇 테두리
  function band(cx, cy, rm, h, a0, a1, prof, seed) {
    var r = rng(seed), out = [], inn = [], n = 9;
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180, w = h * prof(t) * (1 + (r() - 0.5) * 0.12);
      out.push([cx + Math.cos(a) * (rm + w), cy + Math.sin(a) * (rm + w)]);
      inn.unshift([cx + Math.cos(a) * (rm - w), cy + Math.sin(a) * (rm - w)]);
    }
    return smooth(out.concat(inn));
  }
  function stroke(x0, x1, y, lift, h0, seed) {
    var r = rng(seed), top = [], bot = [], n = 10;
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t, yy = y - Math.sin(Math.PI * t) * lift + (t - 0.5) * 18;
      var w = h0 * Math.pow(Math.sin(Math.PI * (0.06 + t * 0.9)), 0.55) * (1.15 - 0.5 * t) * (1 + (r() - 0.5) * 0.15);
      top.push([x, yy - w]);
      bot.unshift([x, yy + w * 0.8]);
    }
    return smooth(top.concat(bot));
  }
  var taper = function (t) { return Math.pow(Math.sin(Math.PI * t), 0.72); };
  var shrimp = function (t) { return Math.pow(Math.sin(Math.PI * (0.04 + t * 0.94)), 0.6) * (1.2 - 0.55 * t); };
  var rim = function (t) { return Math.min(1, Math.sin(Math.PI * t) * 5); };

  var FORMS = {
    dot: { rot: 0, a: [blob(200, 202, 78, 72, 0.2, 0.08, 3), '#D9D1BE'], b: [blob(244, 176, 13, 10, 0.6, 0.2, 9), '#B9975B'], c: [blob(172, 230, 9, 8, 0, 0.2, 5), '#B9975B'] },
    crescent: { rot: -8, a: [band(200, 208, 86, 24, 140, 400, taper, 7), '#E9E3D5'], b: [blob(206, 204, 12, 11, 0, 0.2, 12), '#C9A85E'], c: [blob(232, 228, 7, 7, 0, 0.2, 4), '#C9A85E'] },
    three: { rot: 6, a: [blob(158, 184, 60, 28, -0.55, 0.16, 21), '#9C7A4A'], b: [blob(252, 172, 46, 25, 0.45, 0.16, 22), '#8A6A3E'], c: [blob(214, 258, 54, 22, -0.08, 0.16, 23), '#A88654'] },
    curl: { rot: 18, a: [band(204, 200, 58, 30, -70, 205, shrimp, 31), '#D8B48C'], b: [blob(252, 252, 18, 9, 0.5, 0.2, 32), '#E9E3D5'], c: [blob(150, 146, 14, 7, -0.6, 0.2, 33), '#E9E3D5'] },
    ring: { rot: -30, a: [band(200, 200, 90, 15, -80, 255, rim, 41), '#CFC6B0'], b: [blob(200, 200, 34, 32, 0, 0.12, 42), '#E9E3D5'], c: [blob(222, 186, 8, 6, 0.3, 0.2, 43), '#8A9A6A'] },
    stroke: { rot: -4, a: [stroke(84, 318, 214, 26, 40, 51), '#6B4E33'], b: [blob(150, 140, 12, 9, 0.2, 0.25, 52), '#E9E3D5'], c: [blob(286, 266, 14, 10, 0.4, 0.25, 53), '#B9975B'] },
    mound: { rot: 0, a: [blob(200, 206, 92, 82, 0.1, 0.1, 61), '#ECE6D8'], b: [blob(236, 176, 16, 13, 0.5, 0.18, 62), '#C9A85E'], c: [blob(166, 226, 20, 16, -0.3, 0.18, 63), '#7A5532'] },
    drop: { rot: 12, a: [blob(204, 196, 62, 56, 0.4, 0.14, 71), '#C98A4B'], b: [blob(266, 250, 8, 7, 0, 0.2, 72), '#E9E3D5'], c: [blob(144, 158, 6, 5, 0, 0.2, 73), '#E9E3D5'] },
    cup: { rot: 0, a: [band(168, 210, 66, 14, -90, 262, rim, 81), '#8A6A3E'], b: [blob(290, 164, 30, 27, 0.4, 0.3, 82), '#9C6B33'], c: [blob(300, 252, 11, 9, 0.2, 0.2, 83), '#C9A85E'] }
  };

  function initCourse() {
    var items = $$('.course__item');
    if (!items.length) return;
    var paths = { a: $('.plate__a'), b: $('.plate__b'), c: $('.plate__c') };
    var food = $('.plate__food');
    var cap = {
      box: $('.course__caption'),
      ord: $('.course__cap-ord'), name: $('.course__cap-name'),
      desc: $('.course__cap-desc'), sool: $('.course__cap-sool')
    };
    var first = FORMS[items[0].dataset.form];
    ['a', 'b', 'c'].forEach(function (k) { paths[k].setAttribute('d', first[k][0]); paths[k].setAttribute('fill', first[k][1]); });

    items.forEach(function (li, i) {
      var btn = $('.course__pick', li);
      var ord = $('.course__ord', li).textContent.trim();
      var name = $('.course__name', li).textContent.trim();
      btn.setAttribute('aria-label', ord + ' 접시, ' + name);
      btn.addEventListener('click', function () {
        if (course.onPick) course.onPick(i); else setActive(i);
      });
    });

    var active = 0;
    function setActive(i, instant) {
      if (i === active && !instant) return;
      active = i;
      var li = items[i];
      items.forEach(function (it, j) { $('.course__pick', it).setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      var form = FORMS[li.dataset.form] || FORMS.dot;
      cap.ord.textContent = $('.course__ord', li).textContent.trim() + ' 접시';
      cap.name.textContent = $('.course__name', li).textContent.trim();
      cap.desc.textContent = $('.course__desc', li).textContent.trim();
      var sool = li.dataset.sool || '';
      cap.sool.classList.toggle('is-empty', !sool);
      cap.sool.innerHTML = '함께 내는 술 <span></span>';
      $('span', cap.sool).textContent = sool;

      var calm = !G || !window.MorphSVGPlugin || reduceMQ.matches || instant;
      if (calm) {
        ['a', 'b', 'c'].forEach(function (k) { paths[k].setAttribute('d', form[k][0]); paths[k].style.fill = form[k][1]; });
        if (G) G.set(food, { rotation: form.rot, svgOrigin: '200 200' });
        return;
      }
      ['a', 'b', 'c'].forEach(function (k, n) {
        G.to(paths[k], { morphSVG: { shape: form[k][0], type: 'rotational' }, fill: form[k][1], duration: 0.95, delay: n * 0.05, ease: 'power3.inOut', overwrite: 'auto' });
      });
      G.to(food, { rotation: form.rot, svgOrigin: '200 200', duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' });
      G.fromTo(cap.box.children, { autoAlpha: 0.15, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out', overwrite: 'auto' });
    }
    course = { items: items, setActive: setActive, onPick: null, get active() { return active; } };
  }

  function coursePin(mm) {
    if (!course) return;
    var ST = window.ScrollTrigger;
    var items = course.items;
    mm.add({
      pinDesk: '(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)',
      flat: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var c = ctx.conditions;
      if (c.pinDesk) {
        var st = ST.create({
          trigger: '.course__pin', pin: true, start: 'top top',
          end: function () { return '+=' + Math.round(window.innerHeight * 3.2); },
          anticipatePin: 1,
          onUpdate: function (self) { course.setActive(Math.min(items.length - 1, Math.floor(self.progress * items.length * 0.999))); }
        });
        course.onPick = function (i) {
          var y = st.start + (st.end - st.start) * ((i + 0.5) / items.length);
          if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
        };
      } else if (c.flat) {
        items.forEach(function (li, i) {
          ST.create({
            trigger: li, start: 'top 58%', end: 'bottom 58%',
            onToggle: function (self) { if (self.isActive) course.setActive(i); }
          });
        });
      }
      return function () { course.onPick = null; };
    });
  }

  function courseSplit(mm) {
    if (!course || !window.SplitText) return;
    var items = course.items;
    mm.add({
      desk: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
      mob: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var desk = ctx.conditions.desk;
      // 코스 이름: 글자 단위 세로 마스크 리빌
      var splits = items.map(function (li) {
        return window.SplitText.create($('.course__name', li), { type: 'chars', mask: 'chars', aria: 'hidden', tag: 'span' });
      });
      var tl = G.timeline({ scrollTrigger: { trigger: '.course__menu', start: 'top 72%', once: true } });
      splits.forEach(function (sp, i) {
        tl.from(sp.chars, { yPercent: desk ? -110 : 110, duration: 0.7, stagger: 0.045, ease: 'power3.out' }, i * 0.07);
      });
    });
  }

  /* ---------------- 차례 ---------------- */
  function initToc() {
    var btn = $('.bar__menu'), toc = $('#toc'), close = $('.toc__close'), label = $('.bar__menu-label');
    if (!btn || !toc) return;
    var open = false, anim = null;
    function focusables() { return [btn].concat($$('a, button', toc)); }
    function origin() {
      var r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: Math.hypot(Math.max(r.left, window.innerWidth - r.left), window.innerHeight) * 1.1 };
    }
    function show() {
      if (open) return;
      open = true;
      toc.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      label.textContent = '닫기';
      if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
      if (window.dalmuriInk) window.dalmuriInk.pause();
      if (G && !reduceMQ.matches) {
        var o = origin();
        if (anim) anim.kill();
        anim = G.fromTo(toc, { clipPath: 'circle(0px at ' + o.x + 'px ' + o.y + 'px)' }, { clipPath: 'circle(' + o.R + 'px at ' + o.x + 'px ' + o.y + 'px)', duration: 0.6, ease: 'power3.out', clearProps: 'clipPath' });
        G.from($$('.toc__list li', toc), { autoAlpha: 0, y: -10, duration: 0.45, stagger: 0.04, delay: 0.12, ease: 'power2.out' });
      }
      var first = $('.toc__list a', toc);
      if (first) first.focus({ preventScroll: true });
    }
    function hide(returnFocus) {
      if (!open) return;
      open = false;
      btn.setAttribute('aria-expanded', 'false');
      label.textContent = '차례';
      if (lenis) lenis.start(); else root.style.overflow = '';
      if (window.dalmuriInk) window.dalmuriInk.resume();
      var done = function () { toc.hidden = true; };
      if (G && !reduceMQ.matches) {
        var o = origin();
        if (anim) anim.kill();
        anim = G.to(toc, { clipPath: 'circle(0px at ' + o.x + 'px ' + o.y + 'px)', duration: 0.32, ease: 'power2.in', onComplete: function () { done(); G.set(toc, { clearProps: 'clipPath' }); } });
      } else done();
      if (returnFocus !== false) btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', function () { if (open) hide(); else show(); });
    close.addEventListener('click', function () { hide(); });
    $$('.toc__list a', toc).forEach(function (a) { a.addEventListener('click', function () { hide(false); }); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
      if (e.key === 'Tab') {
        var f = focusables(), i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        else if (i === -1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------------- 같은 페이지 이동 ---------------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.getElementById(id.slice(1));
      if (!el) return;
      var keyboard = e.detail === 0;
      if (lenis) {
        e.preventDefault();
        lenis.scrollTo(el, { offset: 0, duration: 1.4 });
        if (history.replaceState) history.replaceState(null, '', id);
      }
      if (keyboard) {
        var h = el.querySelector('h1, h2') || el;
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
        setTimeout(function () { h.focus({ preventScroll: !!lenis }); }, lenis ? 900 : 0);
      }
    });
  }

  /* ---------------- 달의 위상 달력 ---------------- */
  function initCalendar() {
    var cal = $('#cal'), wrap = $('.cal__grid-wrap', cal), monthEl = $('#cal-month');
    var navs = $$('.cal__nav', cal);
    var form = $('#book');
    if (!cal || !form) return;
    var SYN = 29.530588853, REF = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
    var WD = ['일', '월', '화', '수', '목', '금', '토'];
    var WDL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var PARTY = ['', '한 분', '두 분', '세 분', '네 분'];

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var maxMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    var view = new Date(minMonth);
    // 이번 달에 남은 날이 적으면 다음 달부터 보여 준다
    (function () {
      var left = 0, last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      for (var d = today.getDate() + 1; d <= last; d++) {
        var t = new Date(today.getFullYear(), today.getMonth(), d);
        if (t.getDay() !== 1) left++;
      }
      if (left < 6) view = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    })();
    var selected = null;
    var focusDate = null;

    function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function age(d) {
      var days = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12) / 864e5;
      return ((days - REF) % SYN + SYN) % SYN;
    }
    function phaseName(a) {
      if (a < 1.85 || a >= 27.68) return '';
      if (a < 5.54) return '초승달';
      if (a < 9.23) return '상현달';
      if (a < 12.92) return '차오르는 달';
      if (a < 16.61) return '보름달';
      if (a < 20.3) return '기우는 달';
      if (a < 23.99) return '하현달';
      return '그믐달';
    }
    function moonPath(a, r) {
      var ang = a / SYN * Math.PI * 2, k = Math.cos(ang), rx = Math.abs(k) * r;
      var waxing = a < SYN / 2;
      var outer = waxing ? 1 : 0;
      var term = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
      return 'M0,' + (-r) + 'A' + r + ',' + r + ' 0 0 ' + outer + ' 0,' + r + 'A' + rx.toFixed(2) + ',' + r + ' 0 0 ' + term + ' 0,' + (-r) + 'Z';
    }
    function hashInt(n) {
      n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4);
      n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15);
      return (n >>> 0) / 4294967296;
    }
    var cache = {};
    function info(d) {
      var k = key(d);
      if (cache[k]) return cache[k];
      var a = age(d), wd = d.getDay();
      var res = { age: a, off: false, full: false, seats: { '18:00': 0, '20:30': 0 } };
      if (d <= today || wd === 1) { res.off = true; return (cache[k] = res); }
      var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      var nearFull = Math.abs(a - SYN / 2) < 1.6;
      ['18:00', '20:30'].forEach(function (slot, s) {
        var v = Math.floor(hashInt(seed * 7 + s * 131) * 7);
        if (wd === 5 || wd === 6) v = Math.max(0, v - 2);
        if (nearFull && hashInt(seed + s * 17) < 0.8) v = 0;
        res.seats[slot] = v;
      });
      res.full = res.seats['18:00'] === 0 && res.seats['20:30'] === 0;
      return (cache[k] = res);
    }
    function label(d) {
      return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WDL[d.getDay()];
    }
    function moonSVG(a) {
      return '<svg class="cal__moon" viewBox="0 0 26 26" aria-hidden="true">' +
        '<circle class="m-halo" cx="13" cy="13" r="12.6"/>' +
        '<circle class="m-base" cx="13" cy="13" r="9"/>' +
        '<path class="m-lit" transform="translate(13 13)" d="' + moonPath(a, 9) + '"/></svg>';
    }

    function render(focusIt) {
      var y = view.getFullYear(), m = view.getMonth();
      monthEl.textContent = y + '년 ' + (m + 1) + '월';
      navs[0].disabled = view <= minMonth;
      navs[1].disabled = view >= maxMonth;
      var first = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      if (!focusDate || focusDate.getMonth() !== m || focusDate.getFullYear() !== y) {
        focusDate = null;
        if (selected && selected.getMonth() === m && selected.getFullYear() === y) focusDate = selected;
        for (var dd = 1; !focusDate && dd <= days; dd++) {
          var t = new Date(y, m, dd);
          var inf = info(t);
          if (!inf.off && !inf.full) focusDate = t;
        }
        if (!focusDate) focusDate = new Date(y, m, 1);
      }
      var html = '<table class="cal__grid" role="grid" aria-labelledby="cal-month"><thead><tr>';
      WD.forEach(function (w, i) { html += '<th scope="col" abbr="' + WDL[i] + '">' + w + '</th>'; });
      html += '</tr></thead><tbody><tr>';
      for (var i = 0; i < first; i++) html += '<td role="presentation"></td>';
      for (var d = 1; d <= days; d++) {
        var date = new Date(y, m, d), inf2 = info(date);
        var cls = inf2.off ? 'is-off' : inf2.full ? 'is-full' : 'is-open';
        if (+date === +today) cls += ' is-today';
        var isSel = selected && +selected === +date;
        var isFocus = +focusDate === +date;
        var state = inf2.off ? (date.getDay() === 1 && date > today ? '쉬는 날' : '예약할 수 없는 날') : inf2.full ? '마감' : '남은 자리 ' + (inf2.seats['18:00'] + inf2.seats['20:30']);
        var ph = phaseName(inf2.age);
        html += '<td role="gridcell" aria-selected="' + (isSel ? 'true' : 'false') + '">' +
          '<button class="cal__day ' + cls + '" type="button" tabindex="' + (isFocus ? 0 : -1) + '" data-d="' + d + '"' +
          ((inf2.off || inf2.full) ? ' aria-disabled="true"' : '') +
          ' aria-label="' + label(date) + ', ' + state + (ph ? ', ' + ph : '') + '">' +
          moonSVG(inf2.age) + '<span class="cal__num" aria-hidden="true">' + d + '</span></button></td>';
        if ((first + d) % 7 === 0 && d !== days) html += '</tr><tr>';
      }
      var tail = (7 - (first + days) % 7) % 7;
      for (var j = 0; j < tail; j++) html += '<td role="presentation"></td>';
      html += '</tr></tbody></table>';
      wrap.innerHTML = html;
      if (focusIt) {
        var b = $('.cal__day[tabindex="0"]', wrap);
        if (b) b.focus();
      }
    }

    function moveFocus(target) {
      var tm = new Date(target.getFullYear(), target.getMonth(), 1);
      if (tm < minMonth || tm > maxMonth) return;
      focusDate = target;
      if (tm.getMonth() !== view.getMonth() || tm.getFullYear() !== view.getFullYear()) {
        view = tm;
      }
      render(true);
    }

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('.cal__day');
      if (!b) return;
      var d = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
      focusDate = d;
      if (b.getAttribute('aria-disabled') === 'true') { render(true); return; }
      choose(d);
      render(true);
    });
    wrap.addEventListener('keydown', function (e) {
      var b = e.target.closest('.cal__day');
      if (!b) return;
      var d = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
      var t = null;
      switch (e.key) {
        case 'ArrowRight': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); break;
        case 'ArrowLeft': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); break;
        case 'ArrowDown': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7); break;
        case 'ArrowUp': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7); break;
        case 'Home': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); break;
        case 'End': t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - d.getDay())); break;
        case 'PageUp': t = new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)); break;
        case 'PageDown': t = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)); break;
        default: return;
      }
      e.preventDefault();
      moveFocus(t);
    });
    navs.forEach(function (n) {
      n.addEventListener('click', function () {
        var dir = +n.dataset.dir;
        var nv = new Date(view.getFullYear(), view.getMonth() + dir, 1);
        if (nv < minMonth || nv > maxMonth) return;
        view = nv; focusDate = null;
        render(false);
      });
    });

    // 단계별 예약
    var dateOut = $('#book-date');
    var steps = {
      time: $('[data-step="time"]', form), party: $('[data-step="party"]', form), confirm: $('[data-step="confirm"]', form)
    };
    var msg = $('#book-msg');
    function radios(name) { return $$('input[name="' + name + '"]', form); }
    function checked(name) { var r = $('input[name="' + name + '"]:checked', form); return r ? r.value : ''; }

    function choose(d) {
      selected = d;
      var inf = info(d);
      var ph = phaseName(inf.age);
      dateOut.classList.remove('is-empty');
      dateOut.innerHTML = '';
      dateOut.appendChild(document.createTextNode(label(d)));
      var small = document.createElement('small');
      small.textContent = ph ? ph + '이 뜨는 밤' : '달이 숨는 밤';
      dateOut.appendChild(small);
      steps.time.disabled = false;
      radios('time').forEach(function (r) {
        var n = inf.seats[r.value];
        var sub = $('[data-seat="' + r.value + '"]', form);
        r.disabled = n === 0;
        if (n === 0 && r.checked) r.checked = false;
        sub.textContent = n === 0 ? '마감' : '남은 자리 ' + n;
        sub.classList.toggle('is-full', n === 0);
      });
      syncParty();
      msg.textContent = ''; msg.className = 'book__msg';
    }
    function syncParty() {
      var time = checked('time');
      steps.party.disabled = !time;
      var left = time && selected ? info(selected).seats[time] : 0;
      radios('party').forEach(function (r) {
        r.disabled = +r.value > left;
        if (r.disabled && r.checked) r.checked = false;
      });
      steps.confirm.disabled = !(time && checked('party'));
    }
    form.addEventListener('change', function (e) {
      if (e.target.name === 'time' || e.target.name === 'party') syncParty();
    });

    var nameIn = $('#b-name'), telIn = $('#b-tel');
    function setErr(input, text) {
      var el = document.getElementById(input.getAttribute('aria-describedby'));
      el.textContent = text;
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    [nameIn, telIn].forEach(function (i) { i.addEventListener('input', function () { setErr(i, ''); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'book__msg';
      var time = checked('time'), party = checked('party');
      if (!selected) return fail('먼저 달력에서 날짜를 골라 주세요.', $('.cal__day[tabindex="0"]', wrap));
      if (!time) return fail('시간을 골라 주세요. 18:00와 20:30 중 하나입니다.', $('input[name="time"]:not(:disabled)', form));
      if (!party) return fail('오실 인원을 골라 주세요.', $('input[name="party"]:not(:disabled)', form));
      var ok = true;
      if (!nameIn.value.trim()) { setErr(nameIn, '예약하시는 분의 성함을 적어 주세요.'); ok = false; }
      var digits = telIn.value.replace(/\D/g, '');
      if (digits.length < 9) { setErr(telIn, '연락처를 숫자로 9자리 이상 적어 주세요. 예: 010-0000-0000'); ok = false; }
      if (!ok) { (nameIn.getAttribute('aria-invalid') ? nameIn : telIn).focus(); return; }
      msg.classList.add('is-done');
      msg.innerHTML = '';
      var strong = document.createElement('strong');
      strong.textContent = label(selected) + ' ' + time + ', ' + PARTY[+party];
      msg.appendChild(strong);
      msg.appendChild(document.createTextNode(' 자리를 맡아 두었습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.'));
    });
    function fail(text, focusEl) {
      msg.classList.add('is-error');
      msg.textContent = text;
      if (focusEl) focusEl.focus();
    }

    render(false);
  }
  /* ---------------- 시작 ---------------- */
  safe(initToc);
  safe(initCourse);
  safe(initCalendar);
  safe(initAnchors);
  if (G) safe(initMotion); else root.classList.add('no-motion');
})();
