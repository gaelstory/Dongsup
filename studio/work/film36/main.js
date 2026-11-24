/* 서른여섯 사진관: developing tray, the reel, the contact sheet */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var isShot = /[?&]shot=1/.test(location.search);
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motion = function () { return !reduceMQ.matches; };
  var G = window.gsap;
  var hasST = !!(G && window.ScrollTrigger);
  var hasFlip = !!(G && window.Flip);
  var hasDraw = !!(G && window.DrawSVGPlugin);
  if (G) G.registerPlugin.apply(G, [window.ScrollTrigger, window.Flip, window.DrawSVGPlugin].filter(Boolean));

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function safely(fn) { try { fn(); } catch (err) { root.classList.add('no-motion'); } }

  var PHOTOS = [
    { id: 'window', title: '창가의 두 사람', alt: '창가에 나란히 서서 머리를 맞댄 두 사람의 실루엣 사진' },
    { id: 'veil', title: '면사포', alt: '창빛을 받아 빛나는 면사포를 쓴 신부의 뒷모습 사진' },
    { id: 'family', title: '세 식구', alt: '부모 사이에 선 아이, 세 식구의 실루엣 사진' }
  ];

  /* ---------------- navigation ---------------- */
  function initNav() {
    var btn = $('.menu-btn'), nav = $('#site-nav'), label = $('.menu-btn__label', btn);
    var links = $$('a', nav), open = false;
    var mq = window.matchMedia('(max-width: 1023px)');
    function set(next, back) {
      open = next;
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? '닫기' : '메뉴';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) links[0].focus(); else if (back) btn.focus();
    }
    btn.addEventListener('click', function () { set(!open, true); });
    nav.addEventListener('click', function (e) { if (open && e.target.closest('a')) set(false, false); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); set(false, true); return; }
      if (e.key === 'Tab') {
        var items = [btn].concat(links), i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    var onMq = function () { if (!mq.matches && open) set(false, false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* ---------------- reel: put the hero's photo in the first frame ---------------- */
  var reel = {
    frames: [],
    placeFirst: function (sceneId) {
      var first = this.frames[0];
      if (!first || first.getAttribute('data-scene') === sceneId) return;
      var other = this.frames.filter(function (f) { return f.getAttribute('data-scene') === sceneId; })[0];
      if (!other) return;
      // Swap picture and caption, keep the edge numbers where they are.
      var a = { svg: $('.frame__img', first).innerHTML, cap: $('figcaption', first).innerHTML, sc: first.getAttribute('data-scene') };
      $('.frame__img', first).innerHTML = $('.frame__img', other).innerHTML;
      $('figcaption', first).innerHTML = $('figcaption', other).innerHTML;
      first.setAttribute('data-scene', sceneId);
      $('.frame__img', other).innerHTML = a.svg;
      $('figcaption', other).innerHTML = a.cap;
      other.setAttribute('data-scene', a.sc);
    }
  };
  reel.frames = $$('.frame');

  /* ---------------- hero: develop the print ---------------- */
  var hero = {};
  function initHero() {
    var section = $('.hero');
    var print = $('.print'), tilt = $('.print-tilt'), svg = $('.print__svg'), use = $('use', svg);
    var title = $('.print__title'), no = $('.print__no'), live = $('.hero__live');
    var nextBtn = $('.next-photo'), nIdx = $('.next-photo__n i');
    var glint = $('.print__glint');
    var idx = 0, swapping = false, devTween = null;
    hero.print = print;

    var START = 'contrast(0.4) brightness(1.6) blur(0px)';
    var DONE = 'contrast(1) brightness(1) blur(0px)';

    function setPhoto(i) {
      var p = PHOTOS[i];
      use.setAttribute('href', '#sc-' + p.id);
      svg.setAttribute('aria-label', p.alt);
      title.textContent = p.title;
      no.textContent = '36–0' + (i + 1);
      nIdx.textContent = String(i + 1);
      reel.placeFirst(p.id);
    }
    function develop(duration) {
      if (devTween) devTween.kill();
      if (!G || !motion() || isShot) {
        if (G) G.set(svg, { opacity: 1, filter: DONE });
        return;
      }
      svg.style.willChange = 'filter, opacity';
      // sine.inOut puts the picture at 50% exactly halfway (1.2s of 2.4s)
      devTween = G.fromTo(svg, { opacity: 0, filter: START }, {
        opacity: 1, filter: DONE, duration: duration, ease: 'sine.inOut',
        onComplete: function () { svg.style.willChange = ''; }
      });
    }
    function next() {
      if (swapping) return;
      idx = (idx + 1) % PHOTOS.length;
      live.textContent = (idx + 1) + '번째 사진, ' + PHOTOS[idx].title + '을 현상합니다.';
      if (!G || !motion() || isShot) {
        if (G && motion()) {
          G.to(svg, { opacity: 0, duration: 0.12, onComplete: function () { setPhoto(idx); G.to(svg, { opacity: 1, duration: 0.15 }); } });
        } else setPhoto(idx);
        return;
      }
      swapping = true;
      if (devTween) devTween.kill();
      // Blur hides the swap; the paper dips into the bath and comes back up.
      var tl = G.timeline();
      tl.to(svg, { opacity: 0, filter: 'contrast(0.4) brightness(1.6) blur(4px)', duration: 0.34, ease: 'power2.in' })
        .to(tilt, { y: 8, scale: 0.985, duration: 0.34, ease: 'power2.inOut' }, 0)
        .add(function () { setPhoto(idx); swapping = false; develop(2.0); })
        .to(tilt, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
    }
    hero.next = next;
    nextBtn.addEventListener('click', next);
    print.addEventListener('click', next);

    develop(2.4);

    // Rock the tray with the pointer: the paper sways ±1.5° and the wet highlight follows.
    if (G && fineMQ.matches && motion() && !isShot) {
      var rot = G.quickTo(print, 'rotation', { duration: 0.9, ease: 'power3' });
      var mx = G.quickTo(print, 'x', { duration: 1.1, ease: 'power3' });
      var my = G.quickTo(print, 'y', { duration: 1.1, ease: 'power3' });
      var gx = G.quickTo(glint, 'xPercent', { duration: 0.7, ease: 'power3' });
      var gy = G.quickTo(glint, 'yPercent', { duration: 0.7, ease: 'power3' });
      var ticking = false, cx = 0, cy = 0;
      section.addEventListener('pointermove', function (e) {
        cx = e.clientX; cy = e.clientY;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          if (window.scrollY > 40) return;
          var nx = cx / window.innerWidth * 2 - 1, ny = cy / window.innerHeight * 2 - 1;
          rot(nx * 1.5); mx(nx * 12); my(ny * 7 - 4);
          var r = print.getBoundingClientRect();
          gx(((cx - r.left) / r.width) * 143); gy(((cy - r.top) / r.height) * 100);
        });
      }, { passive: true });
      section.addEventListener('pointerleave', function () { rot(0); mx(0); my(0); });
      window.addEventListener('scroll', function () { if (window.scrollY > 40) { rot(0); mx(0); my(0); } }, { passive: true });
    }

    // Stop the ambient water and safelight when the tray is off screen.
    var io = new IntersectionObserver(function (en) { section.classList.toggle('is-off', !en[0].isIntersecting); });
    io.observe(section);
    document.addEventListener('visibilitychange', function () { section.classList.toggle('is-off', document.hidden); });
  }

  /* ---------------- scroll: paper lifts and drops into the reel's first frame ---------------- */
  function docPos(el) {
    var x = 0, y = 0;
    while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }
  function posWithin(el, ancestor) {
    var x = 0, y = 0;
    while (el && el !== ancestor) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }

  function initScroll() {
    if (!hasST) return;
    var mm = G.matchMedia();
    var fly = $('.print-fly'), tilt = $('.print-tilt'), print = $('.print'), pic = $('.print__pic');
    var section = $('.reel'), pin = $('.reel__pin'), scroller = $('.reel__scroller'), track = $('.reel__track');
    var countN = $('.reel__n');
    var frames = reel.frames;

    function setCount(i) {
      var s = String(i + 1).padStart(2, '0');
      if (countN.textContent !== s) countN.textContent = s;
    }

    mm.add({
      wide: '(min-width: 900px)',
      motion: '(prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var wide = ctx.conditions.wide;
      if (!ctx.conditions.motion) {
        frames.forEach(function (f) { f.classList.add('is-dev'); });
        return;
      }

      /* the reel */
      var mainTween = null;
      if (wide) {
        scroller.classList.add('is-pinned');
        // pinned, the strip moves with the page scroll, so it is no longer its own scroll stop
        scroller.removeAttribute('tabindex');
        var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth + 2 * parseFloat(getComputedStyle(scroller).paddingLeft)); };
        mainTween = G.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: {
            trigger: pin, pin: true, start: 'top top', end: function () { return '+=' + dist(); },
            scrub: 0.4, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (st) {
              var x = st.progress * dist() + window.innerWidth / 2 - parseFloat(getComputedStyle(scroller).paddingLeft);
              var best = 0, bd = Infinity;
              for (var i = 0; i < frames.length; i++) {
                var c = frames[i].offsetLeft + frames[i].offsetWidth / 2, d = Math.abs(c - x);
                if (d < bd) { bd = d; best = i; }
              }
              setCount(best);
            }
          }
        });
        frames.forEach(function (f, i) {
          if (i === 0) { f.classList.add('is-dev'); return; }
          ScrollTrigger.create({
            trigger: f, containerAnimation: mainTween, start: 'left 68%',
            onEnter: function () { f.classList.add('is-dev'); }
          });
        });
      } else {
        frames[0].classList.add('is-dev');
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-dev'); setCount(frames.indexOf(en.target)); }
          });
        }, { root: scroller, threshold: 0.6 });
        frames.forEach(function (f) { io.observe(f); });
      }

      /* the paper's flight into frame one */
      var geo = { dx: 0, dy: 0, k: 1, end: 1 };
      function measure() {
        var target = $('.frame__img', frames[0]);
        var picPos = docPos(pic), flyPos = docPos(fly);
        var pw = pic.offsetWidth, ph = pic.offsetHeight, tw = target.offsetWidth, th = target.offsetHeight;
        var tDoc, endScroll;
        if (wide) {
          var inPin = posWithin(target, pin);
          var sectionTop = docPos(section).y;
          endScroll = sectionTop;
          tDoc = { x: inPin.x + docPos(section).x, y: sectionTop + inPin.y };
        } else {
          tDoc = docPos(target);
          tDoc.x -= scroller.scrollLeft;
          endScroll = tDoc.y - window.innerHeight * 0.3;
        }
        geo.k = tw / pw;
        geo.dx = (tDoc.x + tw / 2) - (picPos.x + pw / 2);
        geo.dy = (tDoc.y + th / 2) - (picPos.y + ph / 2);
        geo.end = Math.max(endScroll, 200);
        // scale around the picture's centre so it lands frame on frame
        G.set(fly, { transformOrigin: (picPos.x - flyPos.x + pw / 2) + 'px ' + (picPos.y - flyPos.y + ph / 2) + 'px' });
      }
      measure();
      var flight = G.timeline({
        scrollTrigger: {
          trigger: document.body, start: 0, end: function () { return geo.end; },
          scrub: 0.35, invalidateOnRefresh: true, onRefreshInit: measure
        }
      });
      flight
        .to(tilt, { rotation: 0, scale: 1.035, duration: 0.22, ease: 'power2.out' }, 0)
        .to(print, { boxShadow: '0 60px 90px -10px rgba(0,0,0,.85)', duration: 0.22 }, 0)
        .to(fly, { x: function () { return geo.dx; }, y: function () { return geo.dy; }, scale: function () { return geo.k; }, duration: 0.78, ease: 'power2.inOut' }, 0.1)
        .to(tilt, { scale: 1, duration: 0.3, ease: 'power1.inOut' }, 0.62)
        .to(fly, { autoAlpha: 0, duration: 0.12, ease: 'none' }, 0.83);

      return function () {
        scroller.classList.remove('is-pinned');
        scroller.setAttribute('tabindex', '0');
        G.set([fly, tilt, track], { clearProps: 'transform,opacity,visibility' });
      };
    });

    /* a few quiet entrances */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      G.from('.plan', { y: 26, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger: '.plans__list', start: 'top 85%', once: true } });
      G.from('.step', { y: 22, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 85%', once: true } });
      G.from('.sheet', { y: 46, rotation: -2.2, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.sheet-wrap', start: 'top 85%', once: true } });
    });

    var refresh = function () { ScrollTrigger.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }

  /* ---------------- contact sheet: loupe, grease pencil, touch viewer ---------------- */
  function initSheet() {
    var sheet = $('.sheet'), body = $('.sheet__body'), loupe = $('.loupe'), inner = $('.loupe__inner');
    var cuts = $$('.cut', body), count = $('.select__count');
    var picked = [];
    var K = 2.2, R = 115;

    if (hasDraw) {
      root.classList.add('draw');
      G.set($$('.cut__mark path', body), { drawSVG: '0% 0%' });
    }
    var clone = body.cloneNode(true);
    $$('button', clone).forEach(function (b) { b.setAttribute('tabindex', '-1'); b.removeAttribute('aria-label'); b.removeAttribute('aria-pressed'); });
    inner.appendChild(clone);
    loupe.setAttribute('inert', '');
    var cloneCuts = $$('.cut', clone);

    function say() {
      var n = picked.length;
      if (!n) count.textContent = '아직 고른 컷이 없어요.';
      else count.innerHTML = '고른 컷 <span class="num">' + n + '</span>장. 커플 필름은 열 장까지 인화해 드려요.';
    }
    function mark(i, on) {
      var paths = [$('.cut__mark path', cuts[i]), $('.cut__mark path', cloneCuts[i])];
      cloneCuts[i].classList.toggle('is-picked', on);
      if (hasDraw) {
        G.killTweensOf(paths);
        if (!motion()) G.set(paths, { drawSVG: on ? '0% 100%' : '0% 0%' });
        else if (on) G.fromTo(paths, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.5, ease: 'power2.out' });
        else G.to(paths, { drawSVG: '100% 100%', duration: 0.22, ease: 'power1.in' });
      }
    }
    function toggle(i) {
      var on = cuts[i].getAttribute('aria-pressed') !== 'true';
      cuts[i].setAttribute('aria-pressed', String(on));
      var at = picked.indexOf(i);
      if (on && at < 0) picked.push(i);
      if (!on && at >= 0) picked.splice(at, 1);
      mark(i, on);
      say();
      return on;
    }

    /* touch: tap opens a big view that grows out of the thumbnail (Flip.fit) */
    var viewer = $('.viewer'), fig = $('.viewer__fig'), vUse = $('.viewer__svg use'), vTitle = $('.viewer__title .num');
    var vPick = $('.viewer__pick'), vClose = $('.viewer__close'), current = -1, lastType = '';
    function openViewer(i) {
      current = i;
      var c = cuts[i];
      vUse.setAttribute('href', '#sc-' + c.getAttribute('data-scene'));
      var tr = c.getAttribute('data-tr');
      if (tr) vUse.setAttribute('transform', tr); else vUse.removeAttribute('transform');
      vTitle.textContent = c.getAttribute('data-n');
      var on = c.getAttribute('aria-pressed') === 'true';
      vPick.setAttribute('aria-pressed', String(on));
      vPick.textContent = on ? '셀렉 빼기' : '이 컷 셀렉하기';
      viewer.hidden = false;
      document.body.style.overflow = 'hidden';
      if (hasFlip && motion()) {
        G.set(fig, { clearProps: 'transform' });
        Flip.fit(fig, c, { scale: true });
        G.to(fig, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.45, ease: 'power3.out' });
        G.fromTo('.viewer__scrim', { opacity: 0 }, { opacity: 1, duration: 0.3 });
        G.fromTo('.viewer__title, .viewer__actions', { opacity: 0 }, { opacity: 1, duration: 0.25, delay: 0.2 });
      }
      vPick.focus();
    }
    function closeViewer() {
      if (viewer.hidden) return;
      var c = cuts[current];
      var done = function () { viewer.hidden = true; document.body.style.overflow = ''; G && G.set(fig, { clearProps: 'transform' }); c.focus(); };
      if (hasFlip && motion()) {
        G.to('.viewer__title, .viewer__actions', { opacity: 0, duration: 0.12 });
        G.to('.viewer__scrim', { opacity: 0, duration: 0.3 });
        Flip.fit(fig, c, { scale: true, duration: 0.32, ease: 'power2.in', onComplete: done });
      } else done();
    }
    vPick.addEventListener('click', function () {
      var on = toggle(current);
      vPick.setAttribute('aria-pressed', String(on));
      vPick.textContent = on ? '셀렉 빼기' : '이 컷 셀렉하기';
    });
    vClose.addEventListener('click', closeViewer);
    $('.viewer__scrim').addEventListener('click', closeViewer);
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      if (e.key === 'Tab') {
        var items = [vPick, vClose], i = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
      }
    });

    cuts.forEach(function (c, i) {
      c.addEventListener('pointerdown', function (e) { lastType = e.pointerType; });
      c.addEventListener('click', function () {
        if (lastType === 'touch' && !fineMQ.matches) openViewer(i);
        else toggle(i);
        lastType = '';
      });
    });

    /* fine pointer: the cursor becomes a 2.2x loupe */
    if (fineMQ.matches) {
      var sx = 0, sy = 0, lx = -1, ly = -1, raf = 0, active = false;
      function place() {
        raf = 0;
        var r = sheet.getBoundingClientRect();
        sx = lx - r.left; sy = ly - r.top;
        var bx = body.offsetLeft, by = body.offsetTop;
        loupe.style.transform = 'translate3d(' + (sx - R) + 'px,' + (sy - R) + 'px,0)';
        inner.style.transform = 'translate3d(' + (R - (sx - bx) * K) + 'px,' + (R - (sy - by) * K) + 'px,0) scale(' + K + ')';
      }
      function sizeClone() { clone.style.width = body.offsetWidth + 'px'; }
      sizeClone();
      window.addEventListener('resize', sizeClone);
      sheet.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        active = true; sizeClone();
        sheet.classList.add('is-loupe'); loupe.classList.add('is-on');
      });
      sheet.addEventListener('pointermove', function (e) {
        if (!active) return;
        lx = e.clientX; ly = e.clientY;
        if (!raf) raf = requestAnimationFrame(place);
      }, { passive: true });
      sheet.addEventListener('pointerleave', function () {
        active = false;
        sheet.classList.remove('is-loupe'); loupe.classList.remove('is-on');
      });
      window.addEventListener('scroll', function () { if (active && !raf) raf = requestAnimationFrame(place); }, { passive: true });
    }
    say();
  }

  /* ---------------- booking form ---------------- */
  function initForm() {
    var form = $('.form'), done = $('.form__done');
    var name = $('#f-name'), tel = $('#f-tel'), plan = $('#f-plan'), date = $('#f-date');
    var today = new Date();
    date.min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    $$('.plan').forEach(function (a) {
      a.addEventListener('click', function () { plan.value = a.getAttribute('data-plan'); });
    });
    function check(input, ok) {
      var err = document.getElementById(input.getAttribute('aria-describedby'));
      input.setAttribute('aria-invalid', String(!ok));
      err.hidden = ok;
      return ok;
    }
    [name, tel, date].forEach(function (el) {
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
    });
    function validate(el) {
      if (el === name) return check(name, name.value.trim().length > 0);
      if (el === tel) return check(tel, tel.value.replace(/\D/g, '').length >= 9);
      return check(date, !!date.value);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [name, tel, date].filter(function (el) { return !validate(el); });
      if (bad.length) { bad[0].focus(); return; }
      var d = date.value.split('-');
      var planName = plan.options[plan.selectedIndex].text.split(',')[0];
      done.textContent = name.value.trim() + '님, ' + (+d[1]) + '월 ' + (+d[2]) + '일 ' + planName + ' 촬영 예약 요청을 받았어요. 컨셉 시안이라 실제로 접수되지는 않습니다.';
      done.hidden = false;
      form.classList.add('is-done');
      done.focus();
    });
  }

  safely(initNav);
  safely(initHero);
  safely(initScroll);
  safely(initSheet);
  safely(initForm);
})();
