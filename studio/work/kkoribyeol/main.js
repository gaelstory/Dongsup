/* Kkoribyeol page script. Each block fails on its own; the content it enhances stays readable. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function safe(name, fn) {
    try { fn(); } catch (err) {
      root.classList.add('no-motion');
      if (window.console) console.warn('[kkoribyeol] ' + name + ' skipped:', err);
    }
  }
  if (hasGsap) {
    gsap.registerPlugin.apply(gsap, [window.ScrollTrigger, window.Draggable, window.InertiaPlugin, window.MotionPathPlugin].filter(Boolean));
  }

  safe('menu', function () {
    var btn = $('.menu-btn'), menu = $('#mobile-menu');
    if (!btn || !menu) return;
    var label = $('.visually-hidden', btn);
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      label.textContent = open ? '메뉴 닫기' : '메뉴 열기';
    }
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      set(open);
      if (open) $('a', menu).focus();
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (m) { if (m.matches) set(false); });
  });

  /* hero: the playground with the ball and the dogs */
  safe('playground', function () {
    var hero = $('.hero');
    if (!hasGsap || !hero || !window.KkoriPlay) return;
    var start = function () { window.KkoriPlay.create(hero, { reduced: REDUCED, shot: SHOT }); };
    // dog sizes depend on CSS only, so there is no need to wait for fonts
    start();
  });

  safe('intro', function () {
    if (!hasGsap || SHOT || REDUCED) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero-title .line', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08 }, 0)
      .from('.hero-sub', { y: 14, opacity: 0, duration: 0.5 }, 0.18)
      .from('.hero-copy .btn', { y: 12, opacity: 0, duration: 0.45 }, 0.28)
      .from('.fetch-count', { y: -10, opacity: 0, duration: 0.45 }, 0.5);
  });

  /* promises pop in once, like stickers being pressed on */
  safe('promises', function () {
    if (!hasGsap || !window.ScrollTrigger || SHOT || REDUCED) return;
    $$('.blob').forEach(function (b, i) {
      gsap.from(b, { y: 36, scale: 0.94, opacity: 0, duration: 0.6, ease: 'back.out(1.6)', delay: i * 0.08,
        scrollTrigger: { trigger: '.promises', start: 'top 82%', once: true } });
      gsap.from($('.sticker', b), { scale: 0.8, rotation: i % 2 ? 18 : -18, duration: 0.6, ease: 'back.out(2.2)', delay: 0.18 + i * 0.08,
        scrollTrigger: { trigger: '.promises', start: 'top 82%', once: true } });
    });
  });

  /* the day: a trail through the six stops, with paw prints stamped along it as you scroll */
  safe('day', function () {
    var track = $('#day-track'), svg = $('#day-path-svg'), path = $('#day-path'), pawsG = $('#day-paws');
    if (!track || !svg || !path) return;
    var st = null;
    function build() {
      var tr = track.getBoundingClientRect();
      var pts = $$('.stop-dot', track).map(function (d) {
        var r = d.getBoundingClientRect();
        return [r.left + r.width / 2 - tr.left, r.top + r.height / 2 - tr.top];
      });
      if (pts.length < 2) return;
      svg.setAttribute('viewBox', '0 0 ' + tr.width + ' ' + tr.height);
      // smooth curve through the stops (Catmull-Rom as cubic Beziers), with a little extra swing
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var k = 0.22;
        var c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
        var c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
        var sw = (i % 2 ? -1 : 1) * Math.min(60, tr.width * 0.06);
        d += ' C' + (c1[0] + sw).toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + (c2[0] + sw).toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      path.setAttribute('d', d);
      pawsG.innerHTML = '';
      if (!window.MotionPathPlugin) return;
      var raw = MotionPathPlugin.getRawPath(path);
      MotionPathPlugin.cacheRawPathMeasurements(raw);
      var len = path.getTotalLength();
      var step = tr.width < 700 ? 30 : 36, n = Math.floor(len / step), size = tr.width < 700 ? 15 : 18;
      var clear = tr.width < 700 ? 36 : 44;
      var ns = 'http://www.w3.org/2000/svg', frag = document.createDocumentFragment();
      for (var j = 1; j < n; j++) {
        var pos = MotionPathPlugin.getPositionOnPath(raw, j / n, true);
        // leave the stop badges clean
        if (pts.some(function (q) { return Math.hypot(q[0] - pos.x, q[1] - pos.y) < clear; })) continue;
        var side = j % 2 ? 1 : -1, a = pos.angle * Math.PI / 180;
        var ox = -Math.sin(a) * 7 * side, oy = Math.cos(a) * 7 * side;
        var g = document.createElementNS(ns, 'g');
        g.setAttribute('transform', 'translate(' + (pos.x + ox).toFixed(1) + ' ' + (pos.y + oy).toFixed(1) + ') rotate(' + (pos.angle + 90).toFixed(1) + ')');
        var u = document.createElementNS(ns, 'use');
        u.setAttribute('href', '#i-paw');
        u.setAttribute('x', String(-size / 2)); u.setAttribute('y', String(-size / 2));
        u.setAttribute('width', String(size)); u.setAttribute('height', String(size));
        u.setAttribute('class', 'paw');
        g.appendChild(u); frag.appendChild(g);
      }
      pawsG.appendChild(frag);
      animate();
    }
    function animate() {
      if (st) { st.kill(); st = null; }
      var paws = $$('.paw', pawsG);
      if (!hasGsap || !window.ScrollTrigger || REDUCED || SHOT || !paws.length) return;
      var tl = gsap.timeline({ paused: true });
      tl.fromTo(paws, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 0.85, scale: 1, duration: 0.12, stagger: 0.1, ease: 'back.out(3)' });
      st = ScrollTrigger.create({ trigger: track, start: 'top 75%', end: 'bottom 70%', scrub: 0.4, animation: tl });
    }
    var rt = 0, lastW = 0;
    function onResize() { clearTimeout(rt); rt = setTimeout(function () { if (Math.abs(track.offsetWidth - lastW) > 2) { lastW = track.offsetWidth; build(); ScrollTrigger && ScrollTrigger.refresh(); } }, 150); }
    lastW = track.offsetWidth;
    build();
    window.addEventListener('resize', onResize, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  });

  /* diary: dates are today and the two evenings before */
  safe('diary-dates', function () {
    var WD = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var now = new Date();
    $$('.page-date[data-ago]').forEach(function (el) {
      var ago = Number(el.dataset.ago), d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
      el.textContent = (ago === 0 ? '오늘, ' : ago === 1 ? '어제, ' : '') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WD[d.getDay()];
    });
  });

  /* diary: swipe pages inside the phone */
  safe('diary', function () {
    var vp = $('#pages'), track = $('#pages-track'), prev = $('#page-prev'), next = $('#page-next'), label = $('#page-label');
    var dots = $$('#phone-dots i');
    if (!vp || !track || !hasGsap || !window.Draggable) return;
    var pages = $$('.page', track), idx = 0, w = 0, drag;
    root.classList.add('pages-js');
    function measure() { w = vp.clientWidth; go(idx, true); if (drag) drag.applyBounds({ minX: -(pages.length - 1) * w, maxX: 0 }); }
    function paint() {
      label.textContent = (idx + 1) + ' / ' + pages.length;
      dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
      prev.disabled = idx === 0; next.disabled = idx === pages.length - 1;
      pages.forEach(function (p, i) { p.setAttribute('aria-hidden', String(i !== idx)); });
    }
    function go(i, instant) {
      idx = Math.max(0, Math.min(pages.length - 1, i));
      gsap.to(track, { x: -idx * w, duration: instant || REDUCED ? 0 : 0.45, ease: 'power3.out', overwrite: true });
      paint();
    }
    drag = Draggable.create(track, {
      type: 'x', inertia: !!window.InertiaPlugin && !REDUCED, edgeResistance: 0.8, allowNativeTouchScrolling: true, zIndexBoost: false,
      bounds: { minX: -(pages.length - 1) * w, maxX: 0 },
      snap: function (v) { return Math.round(v / w) * w; },
      onDragStart: function () { vp.classList.add('is-dragging'); },
      onThrowComplete: function () { idx = Math.round(-this.x / w); paint(); },
      onRelease: function () {
        vp.classList.remove('is-dragging');
        if (!this.tween) { go(Math.round(-this.x / w)); }
        else { idx = Math.round(-this.endX / w); paint(); }
      }
    })[0];
    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx + 1); });
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 150); }, { passive: true });
    measure();
  });

  /* price: plan toggle + weight slider */
  safe('price', function () {
    var range = $('#weight'), out = $('#weight-out'), cls = $('#quote-class'), unit = $('#quote-unit'), num = $('#quote-num'), extra = $('#quote-extra');
    if (!range) return;
    var TABLE = {
      daycare: [33000, 38000, 43000], hotel: [45000, 52000, 59000], pass: [600000, 680000, 760000]
    };
    var CLASSES = [['콩반', '5kg 미만'], ['별반', '5~10kg'], ['달반', '10~15kg']];
    var shown = { v: 38000 };
    var scaleRead = document.getElementById('scale-read'), sdogs = Array.prototype.slice.call(document.querySelectorAll('.sdog'));
    function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
    function update() {
      var kg = parseFloat(range.value);
      var plan = (document.querySelector('input[name="plan"]:checked') || {}).value || 'daycare';
      var c = kg < 5 ? 0 : kg < 10 ? 1 : 2;
      var kgText = (kg % 1 ? kg.toFixed(1) : String(kg)) + 'kg';
      out.textContent = kgText;
      if (scaleRead) scaleRead.textContent = kgText;
      sdogs.forEach(function (el) {
        var on = Number(el.getAttribute('data-c')) === c;
        if (on && !el.classList.contains('on') && hasGsap && !REDUCED && sdogs.some(function (x) { return x.classList.contains('on'); })) {
          gsap.timeline()
            .fromTo(el, { y: -22 }, { y: 0, duration: 0.32, ease: 'power2.in' })
            .fromTo(el, { scaleY: 0.86, scaleX: 1.06, transformOrigin: '50% 100%' }, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'back.out(3)' })
            .fromTo(scaleRead, { rotation: -5, transformOrigin: '50% 50%' }, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.35)' }, '<');
        }
        el.classList.toggle('on', on);
      });
      range.setAttribute('aria-valuetext', kgText.replace('kg', '킬로그램') + ', ' + CLASSES[c][0]);
      range.style.setProperty('--p', ((kg - 1) / 14 * 100).toFixed(1) + '%');
      cls.innerHTML = CLASSES[c][0] + ' <span>' + CLASSES[c][1] + '</span>';
      unit.textContent = plan === 'hotel' ? '1박' : '하루';
      var price = TABLE[plan][c];
      extra.textContent = plan === 'hotel'
        ? '유치원 놀이 시간이 들어 있어요. 3박부터는 1박에 5,000원씩 빼 드려요.'
        : '한 달 20회권 ' + fmt(TABLE.pass[c]) + '원, 한 번에 ' + fmt(TABLE.pass[c] / 20) + '원 꼴이에요.';
      if (hasGsap && !REDUCED && shown.v !== price) {
        gsap.to(shown, { v: price, duration: 0.4, ease: 'power2.out', overwrite: true, onUpdate: function () { num.textContent = fmt(Math.round(shown.v / 100) * 100); } });
      } else { shown.v = price; num.textContent = fmt(price); }
    }
    range.addEventListener('input', update);
    $$('input[name="plan"]').forEach(function (r) { r.addEventListener('change', update); });
    update();
  });

  /* consultation form: handled in the page, nothing is sent */
  safe('apply', function () {
    var form = $('#apply-form');
    if (!form) return;
    var fields = $('#apply-fields'), done = $('#apply-done');
    function err(input, id, msg) {
      var e = document.getElementById(id);
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (e) e.textContent = msg;
      return !msg;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var owner = $('#a-owner'), phone = $('#a-phone'), dog = $('#a-dog');
      var size = form.querySelector('input[name="size"]:checked');
      var ok1 = err(owner, 'e-owner', owner.value.trim() ? '' : '보호자 이름을 적어 주세요.');
      var ok2 = err(phone, 'e-phone', /^01\d{8,9}$/.test(phone.value.replace(/\D/g, '')) ? '' : '010으로 시작하는 휴대폰 번호를 적어 주세요.');
      var ok3 = err(dog, 'e-dog', dog.value.trim() ? '' : '강아지 이름을 적어 주세요.');
      var ok4 = err(null, 'e-size', size ? '' : '몸무게 구간을 골라 주세요.');
      if (!(ok1 && ok2 && ok3 && ok4)) {
        var first = !ok1 ? owner : !ok2 ? phone : !ok3 ? dog : form.querySelector('input[name="size"]');
        first.focus();
        return;
      }
      $('#done-title').textContent = dog.value.trim() + ' 보호자님, 상담 신청서가 준비됐어요';
      $('#done-text').textContent = size.value + '에서 함께 놀 친구들이 기다리고 있어요. 실제 유치원이라면 오늘 안에 전화를 드립니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      fields.hidden = true; done.hidden = false;
      if (hasGsap && !REDUCED) {
        gsap.from(done, { opacity: 0, y: 12, duration: 0.4, ease: 'power3.out' });
        gsap.from('.done-dog', { y: 30, scale: 0.9, duration: 0.6, ease: 'back.out(2)' });
      }
      done.focus({ preventScroll: true });
      var top = form.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 100, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    $('#apply-reset').addEventListener('click', function () {
      form.reset();
      $$('[aria-invalid]', form).forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
      $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
      done.hidden = true; fields.hidden = false;
      $('#a-owner').focus();
    });
  });

  safe('joinsteps', function () {
    if (!hasGsap || !window.ScrollTrigger || SHOT || REDUCED) return;
    gsap.from('.step-num', { scale: 0.6, rotation: -20, duration: 0.55, ease: 'back.out(2.4)', stagger: 0.12,
      scrollTrigger: { trigger: '.steps', start: 'top 85%', once: true } });
  });

  if (hasGsap && window.ScrollTrigger) {
    var refresh = function () { ScrollTrigger.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }
})();
