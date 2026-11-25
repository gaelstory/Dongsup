/* 첫화면 스튜디오 homepage interactions.
   The HTML already reads and works without this file; everything here is an enhancement.
   Hidden start states are only ever created from script (gsap.from / fromTo), so a failure leaves content visible. */
(function () {
  'use strict';

  var C = window.STUDIO_CONFIG || {};
  var root = document.documentElement;
  var G = window.gsap;
  var hasG = !!G;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqTablet = window.matchMedia('(min-width: 768px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mqWide = window.matchMedia('(min-width: 1024px)');
  var EASE = 'cubic-bezier(.22, 1, .36, 1)';
  var reduced = function () { return mqReduce.matches; };
  var behavior = function () { return reduced() ? 'auto' : 'smooth'; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var onChange = function (mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else mq.addListener(fn); };

  if (hasG) {
    var plugins = ['ScrollTrigger', 'SplitText', 'ScrambleTextPlugin', 'Flip', 'Observer', 'DrawSVGPlugin']
      .map(function (n) { return window[n]; }).filter(Boolean);
    G.registerPlugin.apply(G, plugins);
  }
  var has = function (name) { return hasG && !!window[name]; };

  function run(name, fn) {
    try { fn(); } catch (err) { console.error('[studio] ' + name + ' failed', err); }
  }

  /* ---------- config and prices ---------- */

  function cfg(path) {
    return path.split('.').reduce(function (o, k) { return o != null ? o[k] : undefined; }, C);
  }

  var PRICE = {};

  function applyConfig() {
    $$('[data-config]').forEach(function (el) {
      var v = cfg(el.getAttribute('data-config'));
      if (typeof v === 'string' && v.trim()) el.textContent = v.trim();
    });
    var tel = String(C.phone || '').replace(/[^\d+]/g, '');
    if (tel) $$('[data-config-tel]').forEach(function (a) { a.setAttribute('href', 'tel:' + tel); });
    var kakao = typeof C.kakaoUrl === 'string' && /^https?:\/\//i.test(C.kakaoUrl.trim()) ? C.kakaoUrl.trim() : '';
    $$('[data-kakao]').forEach(function (a) {
      a.hidden = !kakao;
      if (kakao) a.setAttribute('href', kakao);
    });
    $$('[data-kakao-row]').forEach(function (r) { r.hidden = !kakao; });
    // copy that sends people to KakaoTalk only appears when there is a channel to go to
    if (kakao) $$('[data-kakao-swap]').forEach(function (e) { e.textContent = e.getAttribute('data-kakao-swap'); });
    root.classList.toggle('has-kakao', !!kakao);
    if (C.business && C.business.mailOrderNo) $$('[data-mailorder]').forEach(function (e) { e.hidden = false; });
    if (typeof C.FORM_PROCESSOR === 'string' && C.FORM_PROCESSOR.trim()) $$('[data-processor-row]').forEach(function (e) { e.hidden = false; });
    var owner = C.business && typeof C.business.owner === 'string' ? C.business.owner.trim() : '';
    if (C.oneMaker === true && owner && !isPlaceholder(owner)) $$('[data-maker-row]').forEach(function (e) { e.hidden = false; });
    warnPlaceholders();

    // prices live only in #pricing; anything else that needs one reads it from there
    $$('[data-price]').forEach(function (d) { PRICE[d.getAttribute('data-price')] = d.textContent.replace(/\s+/g, ' ').trim(); });
    $$('[data-price-ref]').forEach(function (s) {
      var t = PRICE[s.getAttribute('data-price-ref')];
      if (t) s.textContent = t;
    });
    if (PRICE.basic) $$('[data-price-line]').forEach(function (e) { e.hidden = false; });
  }

  function isPlaceholder(v) {
    return !v || /^\[.*\]$/.test(v) || /example\.(com|org|net)/i.test(v) || /^0\d{1,2}-0{3,4}-0{4}$/.test(v);
  }

  // a pre-launch check: anything still holding a placeholder is listed once in the console
  function warnPlaceholders() {
    var left = [];
    if (isPlaceholder(String(C.email || ''))) left.push('email');
    if (isPlaceholder(String(C.phone || ''))) left.push('phone');
    if (!kakaoUrl()) left.push('kakaoUrl');
    ['owner', 'regNo', 'address'].forEach(function (k) {
      if (!C.business || isPlaceholder(String(C.business[k] || ''))) left.push('business.' + k);
    });
    if (!String(C.FORM_ENDPOINT || '').trim()) left.push('FORM_ENDPOINT (비어 있으면 의뢰서를 메일/문자로 보내는 방식)');
    if (left.length) console.warn('[studio] config.js 자리표시자: ' + left.join(', '));
  }

  function kakaoUrl() {
    return typeof C.kakaoUrl === 'string' && /^https?:\/\//i.test(C.kakaoUrl.trim()) ? C.kakaoUrl.trim() : '';
  }

  /* ---------- header ---------- */

  function initHeader() {
    var header = $('[data-header]');
    var sentinel = $('[data-top-sentinel]');
    if (header && sentinel && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    }

    // the header turns ink while it sits over the pricing band or the footer
    if (header && has('ScrollTrigger')) {
      var over = 0;
      $$('.band').forEach(function (band) {
        window.ScrollTrigger.create({
          trigger: band,
          start: function () { return 'top ' + header.offsetHeight / 2 + 'px'; },
          end: function () { return 'bottom ' + header.offsetHeight / 2 + 'px'; },
          invalidateOnRefresh: true,
          onToggle: function (self) {
            over += self.isActive ? 1 : -1;
            header.classList.toggle('is-on-ink', over > 0);
          }
        });
      });
    }

    var btn = $('[data-menu-btn]');
    var menu = $('[data-menu]');
    if (!btn || !menu) return;
    btn.hidden = false;
    menu.inert = true;
    var isOpen = function () { return btn.getAttribute('aria-expanded') === 'true'; };
    var setOpen = function (open, returnFocus) {
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      header.classList.toggle('is-menu-open', open);
      menu.inert = !open;
      if (!open && returnFocus) btn.focus();
    };
    btn.addEventListener('click', function () { setOpen(!isOpen()); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) setOpen(false, true); });
    document.addEventListener('pointerdown', function (e) { if (isOpen() && !header.contains(e.target)) setOpen(false); });
    onChange(mqTablet, function () { if (mqTablet.matches) setOpen(false); });
  }

  /* ---------- segmented controls ---------- */
  // A clone of the track sits on top in ink and is clipped to the checked item, so the label colors
  // switch exactly where the pill is (no moment of white text on paper).

  function initSeg(seg) {
    var track = $('.seg__track', seg);
    if (!track || !window.CSS || !CSS.supports('clip-path', 'inset(0 0 0 0 round 4px)')) return;
    var glider = track.cloneNode(true);
    glider.classList.add('seg__glider');
    glider.setAttribute('aria-hidden', 'true');
    $$('input', glider).forEach(function (i) { i.remove(); });
    $$('label', glider).forEach(function (l) {
      var s = document.createElement('span');
      s.className = l.className;
      while (l.firstChild) s.appendChild(l.firstChild);
      l.replaceWith(s);
    });
    track.appendChild(glider);
    seg.classList.add('is-enhanced', 'no-anim');
    var inputs = $$('input', track);
    var scroller = $('.seg__scroller', seg);

    function update() {
      var checked = inputs.filter(function (i) { return i.checked; })[0];
      if (!checked) return;
      var item = checked.closest('.seg__item');
      var W = track.clientWidth, H = track.clientHeight;
      if (!W || !H) return;
      var l = item.offsetLeft, t = item.offsetTop;
      var r = W - l - item.offsetWidth, b = H - t - item.offsetHeight;
      glider.style.clipPath = 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round 999px)';
    }
    function reveal(item) {
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return;
      var x = item.offsetLeft + track.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
      scroller.scrollTo({ left: Math.max(0, x), behavior: behavior() });
    }
    inputs.forEach(function (i) {
      i.addEventListener('change', function () { update(); reveal(i.closest('.seg__item')); });
    });
    var quiet = function () {
      seg.classList.add('no-anim');
      update();
      requestAnimationFrame(function () { requestAnimationFrame(function () { seg.classList.remove('no-anim'); }); });
    };
    if (scroller) {
      // fade the edge that has more items behind it
      var edges = function () {
        var max = scroller.scrollWidth - scroller.clientWidth;
        scroller.classList.toggle('fade-r', max > 1 && scroller.scrollLeft < max - 1);
        scroller.classList.toggle('fade-l', max > 1 && scroller.scrollLeft > 1);
      };
      scroller.addEventListener('scroll', edges, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(edges).observe(scroller);
      edges();
    }
    if ('ResizeObserver' in window) new ResizeObserver(quiet).observe(track);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(quiet);
    quiet();
    seg._update = quiet;
  }

  /* ---------- thumbnails ---------- */
  // Thumbnails are generated later; until then (or if one fails) the designed poster underneath shows.

  function watchImg(img, onBroken, onOk) {
    if (!img) return;
    var broken = function () { img.hidden = true; if (onBroken) onBroken(); };
    if (img.complete) {
      if (img.naturalWidth === 0) broken(); else if (onOk) onOk();
      return;
    }
    img.addEventListener('error', broken, { once: true });
    if (onOk) img.addEventListener('load', onOk, { once: true });
  }

  /* ---------- blind stage (hero) ---------- */

  var POSTER_INNER = function (s) {
    return '<span class="poster__bar"><i class="poster__logo"></i><span class="poster__links"><i></i><i></i><i></i></span><i class="poster__pill"></i></span>' +
      '<span class="poster__center"><span class="poster__name">' + esc(s.name) + '</span><span class="poster__kind">' + esc(s.kind) + '</span><i class="poster__cta"></i></span>';
  };

  function paint(holder, s) {
    var p = holder.querySelector('.poster');
    if (!p) { p = document.createElement('span'); holder.insertBefore(p, holder.firstChild); }
    var ok = s.status === 'ok';
    p.className = 'poster' + (ok ? ' has-img' : '');
    p.setAttribute('data-poster', s.slug);
    p.style.backgroundImage = ok ? 'url("' + s.url + '")' : '';
    if (p._slug !== s.slug) { p.innerHTML = POSTER_INNER(s); p._slug = s.slug; }
  }

  function initStage() {
    var unit = $('[data-stage-unit]');
    if (!unit) return;
    var stage = $('[data-stage]', unit);
    var view = $('[data-stage-link]', stage);
    var base = $('[data-stage-base]', stage);
    var urlEl = $('[data-stage-url]', stage);
    var hl = $('[data-stage-hl]', stage);
    var idxEl = $('[data-stage-index]', stage);
    var toggle = $('[data-stage-toggle]', stage);
    var cap = $('[data-stage-caption]', unit);
    var nav = $('[data-stage-nav]', unit);

    var slides = $$('.card').map(function (c) {
      var slug = c.getAttribute('data-slug');
      return {
        slug: slug,
        name: c.getAttribute('data-name'),
        kind: c.getAttribute('data-kind'),
        href: 'work/' + slug + '/index.html',
        v: {}
      };
    });
    // Each slide keeps one record per image size: phones always take the 720px file, wider screens let the
    // browser pick from srcset by stage width and pixel density, and the file it chose (currentSrc) is painted.
    var STAGE_SIZES = 'min(1240px, calc(100vw - 96px))';
    var variant = function () { return mqTablet.matches ? 'wide' : 'phone'; };
    var rec = function (s) { var k = variant(); return s.v[k] || (s.v[k] = { status: 'unknown', src: '' }); };
    var look = function (s) { var r = rec(s); return { slug: s.slug, name: s.name, kind: s.kind, status: r.status, url: r.src }; };
    var L = slides.length;
    if (!L) return;
    var cur = 0;
    var baseImg = $('[data-stage-img]', base);
    watchImg(baseImg, function () { rec(slides[0]).status = 'broken'; }, function () {
      var r = rec(slides[0]);
      r.status = 'ok';
      r.src = baseImg.currentSrc || baseImg.src;
      if (built && cur === 0) built.fronts.forEach(function (f) { paint(f, look(slides[0])); });
    });

    nav.hidden = false;

    // Resolves with the image status, or 'timeout' after ms. The download keeps going after a timeout,
    // and if that slide is on screen by then its poster is swapped for the real screenshot.
    function ensure(s, ms) {
      var r = rec(s);
      if (r.status === 'ok' || r.status === 'broken') return Promise.resolve(r.status);
      if (!r.ready) {
        r.ready = new Promise(function (res) {
          var img = new Image();
          img.onload = function () {
            (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
              r.status = 'ok';
              r.src = img.currentSrc || img.src;
              res('ok');
              arrived(s);
            });
          };
          img.onerror = function () { r.status = 'broken'; res('broken'); };
          img.decoding = 'async';
          var base720 = 'assets/thumbs/' + s.slug + '-720.jpg', full = 'assets/thumbs/' + s.slug + '.jpg';
          if (variant() === 'phone') {
            img.src = base720;
          } else {
            img.sizes = STAGE_SIZES;
            img.srcset = base720 + ' 720w, ' + full + ' 1440w';
            img.src = full;
          }
        });
      }
      return Promise.race([r.ready, wait(ms || 1500).then(function () { return 'timeout'; })]);
    }
    function arrived(s) {
      if (slides[cur] !== s) return;
      if (built) built.fronts.forEach(function (f) { paint(f, look(s)); });
      else showOnBase(s, true);
    }

    /* caption, link, counter, address */
    function setMeta(s, i) {
      view.setAttribute('href', s.href);
      view.setAttribute('aria-label', s.name + ' 컨셉 시안 열어 보기');
      idxEl.textContent = String(i + 1).padStart(2, '0');
      cap.textContent = '';
      var strong = document.createElement('strong');
      strong.className = 'nb';
      strong.textContent = s.name;
      var kind = document.createElement('span');
      kind.className = 'nb';
      kind.textContent = s.kind;
      cap.append('지금 보이는 화면: ', strong, ', ', kind);
      var text = s.slug + '.kr';
      if (has('ScrambleTextPlugin') && !reduced()) {
        G.to(urlEl, { duration: 0.5, ease: 'none', overwrite: true, scrambleText: { text: text, chars: 'abcdefghijklmnopqrstuvwxyz-', speed: 0.9 } });
      } else {
        urlEl.textContent = text;
      }
    }

    /* slats */
    var built = null;
    function setSize() { stage.style.setProperty('--sh', view.clientHeight + 'px'); }
    if ('ResizeObserver' in window) new ResizeObserver(setSize).observe(view);
    setSize();

    function build(n) {
      var wrap = document.createElement('span');
      wrap.className = 'slats';
      wrap.setAttribute('aria-hidden', 'true');
      stage.style.setProperty('--n', n);
      var B = { wrap: wrap, n: n, slats: [], lifts: [], flips: [], fronts: [], backs: [], fShades: [], bShades: [], gloss: [] };
      for (var i = 0; i < n; i++) {
        var slat = document.createElement('span');
        slat.className = 'slat';
        slat.style.setProperty('--i', i);
        var lift = document.createElement('span');
        lift.className = 'slat__lift';
        var flip = document.createElement('span');
        flip.className = 'slat__flip';
        var front = document.createElement('span');
        front.className = 'face face--front';
        front.innerHTML = '<span class="face__tilt"></span><span class="face__gloss"></span><span class="face__shade"></span>';
        var back = document.createElement('span');
        back.className = 'face face--back';
        back.innerHTML = '<span class="face__tilt"></span><span class="face__shade"></span>';
        flip.append(front, back);
        lift.appendChild(flip);
        slat.appendChild(lift);
        wrap.appendChild(slat);
        B.slats.push(slat); B.lifts.push(lift); B.flips.push(flip); B.fronts.push(front); B.backs.push(back);
        B.fShades.push($('.face__shade', front)); B.bShades.push($('.face__shade', back)); B.gloss.push($('.face__gloss', front));
        paint(front, look(slides[cur]));
      }
      view.appendChild(wrap);
      stage.classList.add('is-built');
      return B;
    }
    function teardown() {
      if (!built) return;
      built.wrap.remove();
      built = null;
      stage.classList.remove('is-built');
      showOnBase(slides[cur]);
    }

    // reduced motion / no GSAP: a 150ms opacity cross-fade on the base layer
    function showOnBase(s, fade) {
      var layer = document.createElement('span');
      layer.className = 'stage__fade';
      paint(layer, look(s));
      base.appendChild(layer);
      var cleanup = function () {
        $$(':scope > :not(:last-child)', base).forEach(function (n) { n.remove(); });
      };
      if (fade && layer.animate) layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }).finished.then(cleanup, cleanup);
      else cleanup();
    }

    /* the flip */
    var tl = null, seq = 0, lastY = null, liftPaused = false;
    function pointerIndex(n) {
      if (lastY == null) return 0;
      var h = view.clientHeight / n;
      return Math.max(0, Math.min(n - 1, Math.floor(lastY / h)));
    }
    function go(dir, user) {
      var target = (cur + dir + L) % L;
      var token = ++seq;
      if (tl) tl.progress(1);
      killTimer();
      if (user) cap.setAttribute('aria-live', 'polite');
      // a click should answer quickly; autoplay can wait up to 2s more for the real screenshot
      ensure(slides[target], user ? 1200 : 3500).then(function () {
        if (token !== seq) return;
        flipTo(target, dir);
      });
    }
    function flipTo(target, dir) {
      var s = slides[target];
      setMeta(s, target);
      if (!built || !hasG) {
        showOnBase(s, true);
        cur = target;
        after();
        return;
      }
      var B = built;
      B.backs.forEach(function (b) { paint(b, look(s)); });
      var st = { each: 0.045, from: pointerIndex(B.n) };
      liftPaused = true;
      resetLift(true);
      if (hl) G.to(hl, { scaleX: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
      tl = G.timeline({
        onComplete: function () {
          B.fronts.forEach(function (f) { paint(f, look(s)); });
          G.set(B.flips, { rotationX: 0 });
          G.set(B.fShades.concat(B.bShades), { opacity: 0 });
          cur = target;
          tl = null;
          liftPaused = false;
          after();
        }
      });
      tl.to(B.flips, { rotationX: dir > 0 ? -180 : 180, duration: 0.7, ease: 'power3.inOut', stagger: st }, 0)
        .to(B.fShades, { opacity: 0.55, duration: 0.35, ease: 'power2.in', stagger: st }, 0)
        .fromTo(B.bShades, { opacity: 0.55 }, { opacity: 0, duration: 0.35, ease: 'power2.out', stagger: st, immediateRender: false }, 0.35);
    }
    function after() {
      startTimer();
      ensure(slides[(cur + 1) % L]);
    }

    /* autoplay: 4.2s per screen, shown as the highlighter filling behind the address */
    var reasons = new Set();
    var timer = null;
    function killTimer() { if (timer) { timer.kill(); timer = null; } }
    function startTimer() {
      killTimer();
      if (!hasG || reasons.has('reduce') || reasons.has('user')) {
        if (hl && hasG) G.to(hl, { scaleX: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
        syncLive();
        return;
      }
      G.set(hl, { scaleX: 0 });
      timer = G.to(hl, { scaleX: 1, duration: 4.2, ease: 'none', onComplete: function () { timer = null; go(1, false); } });
      if (reasons.size) timer.pause();
      syncLive();
    }
    function syncLive() { cap.setAttribute('aria-live', reasons.size === 0 && timer ? 'off' : 'polite'); }
    function pause(r) { reasons.add(r); if (timer) timer.pause(); syncLive(); }
    function resume(r) {
      reasons.delete(r);
      if (!reasons.size && timer) timer.resume();
      syncLive();
    }

    toggle.addEventListener('click', function () {
      if (reasons.has('user')) {
        reasons.delete('user');
        toggle.classList.remove('is-paused');
        toggle.setAttribute('aria-label', '자동 넘김 멈춤');
        if (!tl) startTimer();
      } else {
        reasons.add('user');
        toggle.classList.add('is-paused');
        toggle.setAttribute('aria-label', '자동 넘김 재생');
        killTimer();
        if (hl && hasG) G.to(hl, { scaleX: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
      }
      syncLive();
    });
    $('[data-stage-prev]', unit).addEventListener('click', function () { go(-1, true); });
    $('[data-stage-next]', unit).addEventListener('click', function () { go(1, true); });

    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pause('hover'); });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') resume('hover'); });
    unit.addEventListener('focusin', function (e) {
      var fv = false;
      try { fv = e.target.matches(':focus-visible'); } catch (err) { fv = true; }
      if (fv) pause('focus');
    });
    unit.addEventListener('focusout', function (e) { if (!unit.contains(e.relatedTarget)) resume('focus'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) resume('offscreen'); else pause('offscreen');
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause('hidden'); else resume('hidden');
    });

    /* lift: slats near the pointer tip toward you, like fingers parting a blind */
    var liftTo = [], glossTo = [], liftRaf = 0, py = 0, liftOn = false;
    function resetLift(fast) {
      liftTo.forEach(function (f) { f(0); });
      glossTo.forEach(function (f) { f(0); });
      if (fast && built) G.set(built.gloss, { opacity: 0 });
    }
    function liftFrame() {
      liftRaf = 0;
      if (!built || liftPaused || !liftOn) return;
      var rect = view.getBoundingClientRect();
      var n = built.n, h = rect.height / n, y = py - rect.top;
      for (var i = 0; i < n; i++) {
        var d = (y - (i + 0.5) * h) / h;
        var w = Math.exp(-(d * d) / 1.6);
        liftTo[i](-9 * w);
        glossTo[i](w);
      }
    }
    function onMove(e) {
      if (e.pointerType !== 'mouse') return;
      py = e.clientY;
      lastY = e.clientY - view.getBoundingClientRect().top;
      if (!liftRaf) liftRaf = requestAnimationFrame(liftFrame);
    }
    function onLeave() { resetLift(); }
    function onDown(e) { lastY = e.clientY - view.getBoundingClientRect().top; }
    view.addEventListener('pointerdown', onDown, { passive: true });

    /* touch: swipe sideways for previous/next, tap opens the mockup */
    var swipedAt = 0, swiped = false;
    view.addEventListener('click', function (e) { if (Date.now() - swipedAt < 600) e.preventDefault(); });

    /* motion modes */
    function setup() {
      var conditions = { reduce: reduced(), desk: mqTablet.matches, fine: mqFine.matches };
      var observer = null;
      if (conditions.reduce || !hasG) {
        reasons.add('reduce');
        toggle.hidden = true;
        killTimer();
        if (hl) hl.style.transform = 'scaleX(1)';
        return function () { reasons.delete('reduce'); };
      }
      toggle.hidden = false;
      built = build(conditions.desk ? 10 : 6);
      if (conditions.fine) {
        liftTo = built.lifts.map(function (s) { return G.quickTo(s, 'rotationX', { duration: 0.35, ease: 'power3' }); });
        glossTo = built.gloss.map(function (g) { return G.quickTo(g, 'opacity', { duration: 0.35, ease: 'power3' }); });
        liftOn = true;
        view.addEventListener('pointermove', onMove, { passive: true });
        view.addEventListener('pointerleave', onLeave);
      }
      if (!conditions.fine && has('Observer')) {
        observer = window.Observer.create({
          target: view,
          type: 'touch,pointer',
          lockAxis: true,
          tolerance: 40,
          onPress: function () { swiped = false; },
          onLeft: function () { if (!swiped) { swiped = true; swipedAt = Date.now(); go(1, true); } },
          onRight: function () { if (!swiped) { swiped = true; swipedAt = Date.now(); go(-1, true); } }
        });
      }
      var opening = null;
      var hero = $('#top');
      // The scroll-opened blinds (tilted, shaded slats at the top of the page) made the first screen's
      // preview read as broken stripes with a doubled headline, so the stage now starts open.
      // Set OPEN_ON_SCROLL to true to bring the effect back.
      var OPEN_ON_SCROLL = false;
      if (OPEN_ON_SCROLL && has('ScrollTrigger') && hero) {
        // a staggered fromTo inside a scrubbed timeline does not paint its start until the first scroll
        G.set(built.slats, { rotationX: -9 });
        opening = G.timeline({
          scrollTrigger: { trigger: hero, start: 0, end: function () { return hero.offsetHeight * 0.35; }, scrub: 0.4, invalidateOnRefresh: true }
        })
          .fromTo(built.slats, { rotationX: -9 }, { rotationX: 0, duration: 1, ease: 'none', stagger: 0.02 }, 0)
          .fromTo(stage, { '--open': 0 }, { '--open': 1, duration: 1, ease: 'none' }, 0);
      }
      startTimer();
      return function () {
        if (tl) tl.progress(1);
        killTimer();
        if (opening) { opening.scrollTrigger.kill(); opening.kill(); stage.style.removeProperty('--open'); }
        if (observer) observer.kill();
        view.removeEventListener('pointermove', onMove);
        view.removeEventListener('pointerleave', onLeave);
        liftOn = false;
        liftTo = []; glossTo = [];
        teardown();
      };
    }
    var cleanup = setup();
    var rebuild = function () { cleanup(); cleanup = setup(); };
    [mqReduce, mqTablet, mqFine].forEach(function (mq) { onChange(mq, rebuild); });
    ensure(slides[1]);
  }

  /* ---------- hero load sequence and scroll response ---------- */

  function initHero() {
    if (!hasG) return;
    var hero = $('#top');
    var title = $('[data-hero-title]');
    var copy = $('[data-hero-copy]');
    var unit = $('[data-stage-unit]');
    var mm = G.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      G.from(unit, { y: 40, opacity: 0.6, duration: 0.8, ease: 'power3.out' });
      var split = null, alive = true;
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fontsReady, wait(800)]).then(function () {
        if (!alive || !has('SplitText')) return;
        split = window.SplitText.create(title, { type: 'lines', linesClass: 'hl', mask: 'lines' });
        G.from(split.lines, {
          yPercent: 100, duration: 0.7, stagger: 0.08, ease: 'power3.out',
          onComplete: function () { if (split) { split.revert(); split = null; } }
        });
      });
      return function () { alive = false; if (split) { split.revert(); split = null; } };
    });
    if (!has('ScrollTrigger')) return;
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 768px)' }, function (ctx) {
      if (!ctx.conditions.ok) return;
      var t = G.timeline({
        scrollTrigger: { trigger: hero, start: 0, end: function () { return hero.offsetHeight * 0.35; }, scrub: 0.4, invalidateOnRefresh: true }
      });
      if (ctx.conditions.wide) t.fromTo(unit, { scale: 0.94 }, { scale: 1, ease: 'none' }, 0);
      t.to(copy, { y: -24, ease: 'none' }, 0);
    });
  }

  /* ---------- portfolio ---------- */

  var Form = {};

  function initPortfolio() {
    var grid = $('[data-grid]');
    if (!grid) return;
    var cards = $$('.card', grid);
    cards.forEach(function (c) { watchImg($('.thumb__img', c)); });

    var current = 'all', expanded = false;
    var moreWrap = $('[data-more]'), moreBtn = $('[data-more-btn]');
    var endBlock = $('[data-work-end]', grid);
    var shown = function (c) { return c.getClientRects().length > 0; };
    var matches = function (c, v) { return v === 'all' || c.getAttribute('data-category') === v; };

    function applyCollapse() {
      var collapse = !mqTablet.matches && current === 'all' && !expanded;
      grid.classList.toggle('is-collapsed', collapse);
      moreWrap.hidden = !collapse;
    }
    applyCollapse();
    onChange(mqTablet, function () { applyCollapse(); refresh(); });

    moreBtn.addEventListener('click', function () {
      var before = cards.filter(shown);
      expanded = true;
      applyCollapse();
      var added = cards.filter(function (c) { return shown(c) && before.indexOf(c) < 0; });
      if (added[0]) $('.card__thumb', added[0]).focus({ preventScroll: true });
      if (hasG && !reduced()) G.from(added, { opacity: 0, y: 12, duration: 0.4, ease: 'power3.out', stagger: 0.03, clearProps: 'opacity,transform' });
      refresh();
    });

    var phase1 = null, flipTl = null;
    function layout(v) {
      cards.forEach(function (c) { c.hidden = !matches(c, v); });
      grid.classList.toggle('is-stagger', v === 'all');
      applyCollapse();
    }
    function setFilter(v) {
      if (v === current) return;
      if (phase1) phase1.progress(1);
      if (flipTl) flipTl.progress(1);
      current = v;
      if (!has('Flip') || reduced()) { layout(v); refresh(); return; }
      var leaving = cards.filter(function (c) { return shown(c) && !matches(c, v); });
      var nextUp = cards.filter(function (c) { return matches(c, v); });
      var doLayout = function () {
        phase1 = null;
        var state = window.Flip.getState(endBlock ? nextUp.concat(endBlock) : nextUp);
        layout(v);
        G.set(leaving, { clearProps: 'opacity,transform' });
        flipTl = window.Flip.from(state, {
          duration: 0.5,
          ease: 'power2.inOut',
          onEnter: function (els) { return G.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.35, delay: 0.12, ease: 'power2.out' }); },
          onComplete: function () { flipTl = null; G.set(endBlock ? nextUp.concat(endBlock) : nextUp, { clearProps: 'opacity,transform' }); refresh(); }
        });
      };
      if (leaving.length) phase1 = G.to(leaving, { opacity: 0, scale: 0.96, duration: 0.2, ease: 'power1.out', onComplete: doLayout });
      else doLayout();
    }
    $$('input[name="workFilter"]').forEach(function (i) {
      i.addEventListener('change', function () { if (i.checked) setFilter(i.value); });
    });

    // "이 느낌으로 문의" fills the request form
    $$('[data-ask]', grid).forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!Form.pickWork) return;
        e.preventDefault();
        Form.pickWork(a.getAttribute('data-ask'));
      });
    });
    // the closing invitation opens the mockup picker in the form
    $$('[data-open-liked]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!Form.openLiked) return;
        e.preventDefault();
        Form.openLiked();
      });
    });

    // cursor label (mouse only)
    var label = $('[data-cursor]');
    if (!label || !hasG) return;
    var labelOn = false, inside = false, xTo, yTo;
    function hide() {
      if (!inside) return;
      inside = false;
      G.to(label, { autoAlpha: 0, scale: 0.9, duration: 0.18, ease: 'power2.out', overwrite: 'auto' });
    }
    function setupLabel() {
      labelOn = mqFine.matches && !reduced();
      if (!labelOn) { inside = true; hide(); return; }
      G.set(label, { scale: 0.9 });
      xTo = G.quickTo(label, 'x', { duration: 0.25, ease: 'power3' });
      yTo = G.quickTo(label, 'y', { duration: 0.25, ease: 'power3' });
    }
    setupLabel();
    onChange(mqFine, setupLabel);
    onChange(mqReduce, setupLabel);
    grid.addEventListener('pointermove', function (e) {
      if (!labelOn || e.pointerType !== 'mouse') return;
      var t = e.target.closest('.card__thumb');
      if (!t) { hide(); return; }
      if (!inside) {
        inside = true;
        G.set(label, { x: e.clientX, y: e.clientY });
        G.to(label, { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'power3.out', overwrite: 'auto' });
      }
      xTo(e.clientX);
      yTo(e.clientY);
    }, { passive: true });
    grid.addEventListener('pointerleave', hide);
    window.addEventListener('scroll', hide, { passive: true });
  }

  function refresh() {
    if (has('ScrollTrigger')) window.ScrollTrigger.refresh();
  }

  /* ---------- quiet scroll moments: portfolio title wipe, promise rules ---------- */

  function initReveals() {
    if (!has('ScrollTrigger')) return;
    var mm = G.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var t = $('[data-reveal-title]');
      if (t) {
        G.fromTo(t, { clipPath: 'inset(-40px 102% -20px -40px)' }, {
          clipPath: 'inset(-40px -40px -20px -40px)', duration: 0.8, ease: 'power3.out', clearProps: 'clipPath',
          scrollTrigger: { trigger: t, start: 'top 92%', once: true }
        });
      }
      $$('[data-promise]').forEach(function (row) {
        G.from($('.promise__rule', row), { scaleX: 0, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 70%', once: true } });
      });
    });
  }

  /* ---------- process frame ---------- */

  function initProcess() {
    var frame = $('[data-pframe]');
    var steps = $$('[data-step]');
    if (!frame || !steps.length || !has('ScrollTrigger')) return;
    var mm = G.matchMedia();
    mm.add({ desk: '(min-width: 1024px)', reduce: '(prefers-reduced-motion: reduce)' }, function (ctx) {
      var draw = ctx.conditions.desk && !ctx.conditions.reduce && has('DrawSVGPlugin');
      var strokes = function (n) {
        return $$('[data-layer="' + n + '"]', frame).reduce(function (a, g) { return a.concat($$('line, rect, path, circle', g)); }, []);
      };
      var fills = function (n) { return $$('[data-layer="' + n + '"] .pf-occ', frame); };
      var drawn = {};
      steps.forEach(function (s) { s.classList.remove('is-done'); });
      if (draw) {
        frame.classList.remove('is-open');
        for (var n = 1; n <= 5; n++) {
          G.set(strokes(n), { drawSVG: '0% 0%' });
          if (fills(n).length) G.set(fills(n), { fillOpacity: 0 });
        }
      }
      function reach(i) {
        steps.forEach(function (s, k) { s.classList.toggle('is-done', k < i); });
        if (!draw) return;
        var delay = 0;
        for (var n = 1; n <= Math.min(i, 5); n++) {
          if (drawn[n]) continue;
          drawn[n] = true;
          G.to(strokes(n), { drawSVG: '0% 100%', duration: 0.6, ease: 'power2.out', stagger: 0.04, delay: delay });
          if (fills(n).length) G.to(fills(n), { fillOpacity: 1, duration: 0.4, ease: 'power1.out', delay: delay });
          delay += 0.15;
        }
        if (i >= 6) frame.classList.add('is-open');
      }
      steps.forEach(function (s, k) {
        window.ScrollTrigger.create({
          trigger: s,
          start: 'top 55%',
          end: 'bottom 55%',
          onEnter: function () { reach(k + 1); },
          onEnterBack: function () { reach(k + 1); },
          onLeaveBack: function () { if (k === 0) reach(0); }
        });
      });
      return function () {
        frame.classList.add('is-open');
        steps.forEach(function (s) { s.classList.add('is-done'); });
      };
    });
  }

  /* ---------- pricing ---------- */

  function initPricing() {
    var wrap = $('[data-pkg-wrap]');
    var table = $('[data-pkg-table]');
    var tabs = $('[data-pkg-tabs]');
    if (!wrap || !table || !tabs) return;
    var cells = $$('[data-col]', table);
    var active = 'basic';
    var apply = function () { cells.forEach(function (c) { c.classList.toggle('is-off', c.getAttribute('data-col') !== active); }); };
    function setMode() {
      var mobile = !mqWide.matches;
      tabs.hidden = !mobile;
      wrap.classList.toggle('is-tabbed', mobile);
      if (mobile) apply(); else cells.forEach(function (c) { c.classList.remove('is-off'); });
    }
    $$('input[name="pkgTab"]', tabs).forEach(function (i) {
      i.addEventListener('change', function () {
        if (!i.checked) return;
        active = i.value;
        var h0 = wrap.offsetHeight;
        apply();
        var h1 = wrap.offsetHeight;
        if (!reduced() && wrap.animate) {
          wrap.style.overflow = 'hidden';
          wrap.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 200, easing: EASE }).finished
            .then(function () { wrap.style.overflow = ''; }, function () { wrap.style.overflow = ''; });
          table.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
        }
      });
    });
    setMode();
    onChange(mqWide, setMode);

    $$('[data-pick-package]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!Form.pickPackage) return;
        e.preventDefault();
        Form.pickPackage(a.getAttribute('data-pick-package'));
      });
    });
    initSamples(wrap, table);
  }

  // The "견본 시안" names show their mockup: a small preview above the link on desktop,
  // and two still thumbnails under the chosen package on phones and tablets.
  function initSamples(wrap, table) {
    var links = $$('.row-samples a', table);
    var slugOf = function (a) { var m = /work\/([^/]+)\//.exec(a.getAttribute('href') || ''); return m ? m[1] : ''; };
    var sample = function (slug, name) { return { slug: slug, name: name, kind: '', status: 'unknown' }; };
    var thumb = function (holder, slug, name) {
      paint(holder, sample(slug, name));
      var img = document.createElement('img');
      img.className = 'thumb__img';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.hidden = true; });
      img.sizes = '192px';
      img.srcset = 'assets/thumbs/' + slug + '-720.jpg 720w, assets/thumbs/' + slug + '.jpg 1440w';
      img.src = 'assets/thumbs/' + slug + '-720.jpg';
      holder.appendChild(img);
    };

    $$('.row-samples td', table).forEach(function (td) {
      var row = document.createElement('span');
      row.className = 'sample-thumbs';
      row.setAttribute('aria-hidden', 'true');
      $$('a', td).forEach(function (a) {
        var t = document.createElement('a');
        t.className = 'sample-thumb thumb';
        t.href = a.getAttribute('href');
        t.tabIndex = -1;
        thumb(t, slugOf(a), a.textContent);
        row.appendChild(t);
      });
      td.appendChild(row);
    });

    var peek = document.createElement('span');
    peek.className = 'peek';
    peek.setAttribute('aria-hidden', 'true');
    peek.innerHTML = '<span class="peek__thumb thumb"></span><span class="corners"><i></i><i></i><i></i><i></i></span>';
    wrap.appendChild(peek);
    var holder = $('.peek__thumb', peek);
    function show(a) {
      if (!mqWide.matches) return;
      var slug = slugOf(a);
      if (!slug) return;
      if (holder._slug !== slug) {
        holder.textContent = '';
        thumb(holder, slug, a.textContent);
        holder.querySelector('img').loading = 'eager';
        holder._slug = slug;
      }
      var wr = wrap.getBoundingClientRect(), r = a.getBoundingClientRect();
      peek.style.left = Math.round(r.left - wr.left) + 'px';
      peek.style.top = Math.round(r.top - wr.top - 14) + 'px';
      peek.classList.add('is-on');
    }
    function hide() { peek.classList.remove('is-on'); }
    links.forEach(function (a) {
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(a); });
      a.addEventListener('pointerleave', hide);
      a.addEventListener('focus', function () {
        var fv = true;
        try { fv = a.matches(':focus-visible'); } catch (err) { /* older browsers */ }
        if (fv) show(a);
      });
      a.addEventListener('blur', hide);
    });
  }

  /* ---------- faq ---------- */

  function wireDetails(d, body) {
    var sum = $(':scope > summary', d);
    if (!sum || !body) return;
    var anim = null;
    var settle = function () { anim = null; body.style.overflow = ''; };
    sum.addEventListener('click', function (e) {
      if (reduced() || !body.animate) return;
      e.preventDefault();
      if (anim) anim.finish();
      body.style.overflow = 'hidden';
      if (!d.open) {
        d.open = true;
        var h = body.scrollHeight;
        anim = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 280, easing: EASE });
        anim.onfinish = settle;
      } else {
        d.classList.add('is-closing');
        var h2 = body.offsetHeight;
        anim = body.animate([{ height: h2 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 200, easing: EASE });
        anim.onfinish = function () { d.open = false; d.classList.remove('is-closing'); settle(); };
      }
    });
  }

  function initFaq() {
    $$('.qa').forEach(function (d) { wireDetails(d, $('.qa__a', d)); });
    var more = $('[data-more-fields]');
    if (more) wireDetails(more, $('.fs--more', more));
  }

  /* ---------- request form ---------- */

  var PKG_NAMES = { basic: '기본형', plus: '기능형', corp: '기업형' };

  // Korean numbers as people actually write them: mobile 010, Seoul 02, area codes, 070, 050x safe numbers,
  // 15xx/16xx/18xx business numbers, and +82 / 82 prefixes (turned into the domestic 0 form).
  function phoneDigits(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('82') === 0) d = '0' + d.slice(2);
    if (d.indexOf('00') === 0) d = d.slice(1); // "+82 010 ..." written with the trunk zero kept
    var max = /^1[5-9]/.test(d) ? 8 : d.indexOf('02') === 0 ? 10 : d.indexOf('050') === 0 ? 12 : 11;
    return d.slice(0, max);
  }
  function phoneOk(d) {
    return /^1[5-9]\d{6}$/.test(d) || /^02\d{7,8}$/.test(d) || /^050\d{8,9}$/.test(d) || /^0[1-9]\d{8,9}$/.test(d);
  }
  function fmtPhone(d) {
    if (/^1[5-9]/.test(d)) return d.length <= 4 ? d : d.slice(0, 4) + '-' + d.slice(4, 8);
    if (d.indexOf('02') === 0) {
      if (d.length <= 2) return d;
      if (d.length <= 5) return d.slice(0, 2) + '-' + d.slice(2);
      if (d.length <= 9) return d.slice(0, 2) + '-' + d.slice(2, 5) + '-' + d.slice(5);
      return d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6, 10);
    }
    if (d.indexOf('050') === 0) {
      if (d.length <= 4) return d;
      if (d.length <= 7) return d.slice(0, 4) + '-' + d.slice(4);
      if (d.length <= 11) return d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7);
      return d.slice(0, 4) + '-' + d.slice(4, 8) + '-' + d.slice(8, 12);
    }
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + '-' + d.slice(3);
    if (d.length <= 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  }

  // Trim text so its URL-encoded form stays under max characters (long mailto/sms links break in some apps)
  function fitEncoded(text, max, tail) {
    if (encodeURIComponent(text).length <= max) return text;
    var budget = max - encodeURIComponent(tail).length;
    var lo = 0, hi = text.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      var cut = text.slice(0, mid);
      var c = cut.charCodeAt(cut.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) cut = cut.slice(0, -1);
      if (encodeURIComponent(cut).length <= budget) lo = mid; else hi = mid - 1;
    }
    var out = text.slice(0, lo);
    var last = out.charCodeAt(out.length - 1);
    if (last >= 0xD800 && last <= 0xDBFF) out = out.slice(0, -1);
    return out + tail;
  }

  // Korean particle: 전화로, 문자로, 이메일로, 카카오톡으로
  function withRo(word) {
    var ch = word.charCodeAt(word.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return word + '(으)로';
    var jong = (ch - 0xAC00) % 28;
    return word + (jong === 0 || jong === 8 ? '로' : '으로');
  }

  function initForm() {
    var form = $('[data-form]');
    if (!form) return;
    form.setAttribute('novalidate', '');
    var E = form.elements;
    var surface = $('[data-surface]');
    var result = $('[data-result]');
    var summary = $('[data-summary]');
    var picked = $('[data-picked]');
    var sendAlert = $('[data-send-alert]');
    var submitBtn = $('[data-submit]');
    var liked = $('[data-liked]');
    var likedCount = $('[data-liked-count]');
    var emailReq = $('[data-email-req]');
    var msg = E.message;
    var msgCount = $('[data-msg-count]');
    var KEY = 'first-screen-request-draft';
    var LABELS = { name: '성함 또는 상호', phone: '연락처', email: '이메일', industry: '업종', consent: '개인정보 수집·이용 동의' };
    var ORDER = ['name', 'phone', 'email', 'industry', 'consent'];
    var dirty = {};
    var consentAt = null;
    var sending = false;
    var summaryKeys = [];
    var more = $('[data-more-fields]');
    var note = $('[data-form-note]');
    var endpoint = function () { return String(C.FORM_ENDPOINT || '').trim(); };
    // the button says what it does: with no form service connected it completes a request to send yourself
    var SUBMIT_LABEL = endpoint() ? '의뢰서 보내기' : '의뢰서 완성하기';
    submitBtn.textContent = SUBMIT_LABEL;
    if (note) note.textContent = endpoint() ? '보내신 내용은 상담 목적으로만 사용합니다.'
      : '완성된 의뢰서를 메일이나 문자로 보내 주시는 방식입니다. 보내신 내용은 상담 목적으로만 사용합니다.';

    var digits = function (v) { return String(v || '').replace(/\D/g, ''); };
    var radio = function (n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
    var checked = function (n) { return $$('input[name="' + n + '"]:checked', form).map(function (i) { return i.value; }); };
    var replyBy = function () { return radio('replyBy') || '전화'; };

    var rules = {
      name: function () {
        var n = E.name.value.replace(/\s/g, '').length;
        return n >= 2 && n <= 40 ? '' : '성함이나 상호를 두 글자 이상 적어 주세요.';
      },
      phone: function () {
        return phoneOk(phoneDigits(E.phone.value)) ? '' : '연락 가능한 전화번호를 적어 주세요.';
      },
      email: function () {
        var v = E.email.value.trim();
        if (!v) return replyBy() === '이메일' ? '이메일로 답변을 원하시면 주소를 적어 주세요.' : '';
        return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) ? '' : '이메일 주소 형식을 확인해 주세요.';
      },
      industry: function () { return E.industry.value ? '' : '업종을 골라 주세요.'; },
      consent: function () { return E.consent.checked ? '' : '상담을 위해 개인정보 수집·이용 동의가 필요합니다.'; }
    };

    function setError(k, message) {
      var field = form.querySelector('[data-field="' + k + '"]');
      var c = E[k];
      var err = document.getElementById('f-' + k + '-err');
      var ids = (c.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== err.id; });
      if (message) {
        field.classList.add('is-invalid');
        c.setAttribute('aria-invalid', 'true');
        err.textContent = message;
        err.hidden = false;
        ids.push(err.id);
      } else {
        field.classList.remove('is-invalid');
        c.removeAttribute('aria-invalid');
        err.textContent = '';
        err.hidden = true;
        var at = summaryKeys.indexOf(k);
        if (at >= 0) { summaryKeys.splice(at, 1); renderSummary(false); }
      }
      if (ids.length) c.setAttribute('aria-describedby', ids.join(' ')); else c.removeAttribute('aria-describedby');
    }
    var isShowing = function (k) { return form.querySelector('[data-field="' + k + '"]').classList.contains('is-invalid'); };
    function check(k) { var m = rules[k](); setError(k, m); return m; }
    function recheckIfShowing(k) {
      if (!isShowing(k)) return;
      var m = rules[k]();
      if (!m) setError(k, '');
      else if (document.getElementById('f-' + k + '-err').textContent !== m) setError(k, m);
    }

    ['name', 'phone', 'email'].forEach(function (k) {
      E[k].addEventListener('input', function () { dirty[k] = true; recheckIfShowing(k); });
      E[k].addEventListener('blur', function () { if (dirty[k]) check(k); });
    });
    E.industry.addEventListener('change', function () { check('industry'); });
    E.consent.addEventListener('change', function () {
      consentAt = E.consent.checked ? new Date() : null;
      check('consent');
    });

    function syncEmailRequired() {
      var need = replyBy() === '이메일';
      emailReq.hidden = !need;
      if (need) E.email.setAttribute('aria-required', 'true'); else E.email.removeAttribute('aria-required');
    }
    $$('input[name="replyBy"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        syncEmailRequired();
        if (isShowing('email') || dirty.email) check('email');
      });
    });

    // phone: keep digits, add hyphens as they type, keep the caret where it was
    var lastDigits = phoneDigits(E.phone.value);
    E.phone.addEventListener('input', function (e) {
      var el = E.phone;
      if (/^\s*\+\d{0,2}\s*$/.test(el.value)) { recheckIfShowing('phone'); return; } // still typing "+82"
      var pos = el.selectionStart == null ? el.value.length : el.selectionStart;
      var d = phoneDigits(el.value);
      var before = phoneDigits(el.value.slice(0, pos)).length;
      if (e.inputType === 'deleteContentBackward' && d === lastDigits && before > 0) {
        d = d.slice(0, before - 1) + d.slice(before);
        before -= 1;
      }
      var f = fmtPhone(d);
      el.value = f;
      lastDigits = d;
      var count = 0, p = 0;
      while (p < f.length && count < before) { if (/\d/.test(f.charAt(p))) count++; p++; }
      try { el.setSelectionRange(p, p); } catch (err) { /* some input types refuse selection */ }
      recheckIfShowing('phone');
    });

    function autosize() {
      msg.style.height = 'auto';
      msg.style.height = Math.max(140, msg.scrollHeight + 2) + 'px';
    }
    msg.addEventListener('input', function () { msgCount.textContent = String(msg.value.length); autosize(); });

    var likedBoxes = $$('input[name="likedWorks"]', form);
    function updLiked() {
      var n = likedBoxes.filter(function (b) { return b.checked; }).length;
      likedCount.textContent = n ? n + '개 선택' : '';
    }
    likedBoxes.forEach(function (b) { b.addEventListener('change', updLiked); });

    /* draft kept for a reload, cleared once the request is received */
    var TEXT_FIELDS = ['name', 'phone', 'email', 'industry', 'budget', 'timeline', 'reference', 'message'];
    function save() {
      try {
        var d = { v: {}, r: {}, c: {} };
        TEXT_FIELDS.forEach(function (n) { d.v[n] = E[n].value; });
        ['replyBy', 'package', 'materials'].forEach(function (n) { d.r[n] = radio(n); });
        ['likedWorks', 'features'].forEach(function (n) { d.c[n] = checked(n); });
        window.sessionStorage.setItem(KEY, JSON.stringify(d));
      } catch (err) { /* storage can be unavailable */ }
    }
    function clearDraft() { try { window.sessionStorage.removeItem(KEY); } catch (err) { /* ignore */ } }
    function restore() {
      var d;
      try { d = JSON.parse(window.sessionStorage.getItem(KEY) || 'null'); } catch (err) { d = null; }
      if (!d) return;
      TEXT_FIELDS.forEach(function (n) {
        var v = d.v && d.v[n];
        if (typeof v !== 'string') return;
        if (E[n].tagName === 'SELECT') {
          if ($$('option', E[n]).some(function (o) { return o.value === v && !o.disabled; })) E[n].value = v;
        } else {
          E[n].value = v;
        }
      });
      Object.keys(d.r || {}).forEach(function (n) {
        $$('input[name="' + n + '"]', form).forEach(function (i) { if (i.value === d.r[n]) i.checked = true; });
      });
      Object.keys(d.c || {}).forEach(function (n) {
        var vals = d.c[n] || [];
        $$('input[name="' + n + '"]', form).forEach(function (i) { i.checked = vals.indexOf(i.value) >= 0; });
      });
      lastDigits = phoneDigits(E.phone.value);
    }
    var saveTimer = 0;
    var queueSave = function () { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };
    form.addEventListener('input', queueSave);
    form.addEventListener('change', queueSave);

    restore();
    syncEmailRequired();
    updLiked();
    msgCount.textContent = String(msg.value.length);
    if (msg.value) autosize();
    if ($$('input[name="likedWorks"]:checked', form).length) liked.open = true;
    // optional questions start folded, unless a restored draft already has answers in them
    var hasOptional = E.reference.value.trim() || msg.value.trim() ||
      $$('[data-more-fields] input:checked', form).length;
    if (more) more.open = !!hasOptional;
    $$('[data-seg]', form).forEach(function (s) { if (s._update) s._update(); });

    /* coming from a portfolio card or the price table */
    var pickedWorks = [], pickedPkg = '';
    function renderPicked() {
      var q = function (s) { return '"' + s + '"'; };
      var parts = [];
      if (pickedWorks.length) parts.push(pickedWorks.map(q).join(', ') + ' 느낌');
      if (pickedPkg) parts.push(q(pickedPkg) + ' 구성');
      picked.hidden = !parts.length;
      picked.textContent = parts.length ? parts.join(', ') + '을 선택하셨습니다.' : '';
    }
    likedBoxes.forEach(function (b) {
      b.addEventListener('change', function () {
        if (!b.checked && pickedWorks.indexOf(b.value) >= 0) { pickedWorks.splice(pickedWorks.indexOf(b.value), 1); renderPicked(); }
      });
    });
    $$('input[name="package"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        if (!pickedPkg || !r.checked) return;
        var key = r.getAttribute('data-key');
        pickedPkg = PKG_NAMES[key] || '';
        renderPicked();
      });
    });
    // two columns: show the section's content top; one column: jump past the contact block to the form
    function formTop() { return mqWide.matches ? $('#request .layout-12') : surface; }
    function goToForm(focusEl) {
      if (!result.hidden) backToForm(true);
      formTop().scrollIntoView({ behavior: behavior(), block: 'start' });
      if (focusEl) focusEl.focus({ preventScroll: true });
    }
    Form.pickWork = function (slug) {
      var box = likedBoxes.filter(function (b) { return b.getAttribute('data-slug') === slug; })[0];
      if (!box) return;
      box.checked = true;
      updLiked();
      if (more) more.open = true;
      liked.open = true;
      if (pickedWorks.indexOf(box.value) < 0) pickedWorks.push(box.value);
      renderPicked();
      goToForm(picked);
      save();
    };
    // the portfolio's closing invitation: open the mockup picker and go straight to it
    Form.openLiked = function () {
      if (!result.hidden) backToForm(true);
      if (more) more.open = true;
      liked.open = true;
      var field = form.querySelector('[data-field="likedWorks"]');
      field.scrollIntoView({ behavior: behavior(), block: 'start' });
      $('summary', liked).focus({ preventScroll: true });
    };
    Form.pickPackage = function (key) {
      var r = form.querySelector('input[name="package"][data-key="' + key + '"]');
      if (!r) return;
      r.checked = true;
      pickedPkg = PKG_NAMES[key] || r.value;
      renderPicked();
      goToForm(picked);
      save();
    };

    /* validation summary */
    function focusField(k) {
      var c = E[k];
      var field = c.closest('.field');
      field.scrollIntoView({ behavior: behavior(), block: 'center' });
      c.focus({ preventScroll: true });
    }
    function showSummary(errs) {
      summaryKeys = errs.slice();
      renderSummary(true);
    }
    // announce=true on submit; fixes update the list quietly so each keystroke is not read out
    function renderSummary(announce) {
      summary.textContent = '';
      if (!summaryKeys.length) { summary.hidden = true; return; }
      if (announce) summary.setAttribute('role', 'alert'); else summary.removeAttribute('role');
      var errs = summaryKeys;
      var p = document.createElement('p');
      p.className = 'form-summary__title';
      p.textContent = '확인이 필요한 항목이 ' + errs.length + '개 있습니다.';
      var ul = document.createElement('ul');
      errs.forEach(function (k) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + E[k].id;
        a.textContent = LABELS[k];
        a.addEventListener('click', function (ev) { ev.preventDefault(); focusField(k); });
        li.appendChild(a);
        ul.appendChild(li);
      });
      summary.hidden = false;
      summary.append(p, ul);
    }

    /* collect and compose */
    function collect() {
      var v = function (n) { return String(E[n] && E[n].value || '').trim(); };
      var now = new Date();
      return {
        name: v('name'),
        phone: fmtPhone(phoneDigits(v('phone'))),
        email: v('email'),
        replyBy: replyBy(),
        industry: v('industry'),
        package: radio('package'),
        budget: v('budget'),
        timeline: v('timeline'),
        likedWorks: checked('likedWorks'),
        reference: v('reference'),
        features: checked('features'),
        materials: radio('materials'),
        message: v('message'),
        consent: true,
        consentAt: (consentAt || now).toISOString(),
        submittedAt: now.toISOString(),
        page: window.location.href
      };
    }
    function stamp(iso) {
      var d = new Date(iso);
      var p = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    // compact drops unanswered lines, for mail and text-message bodies that have a length limit
    function compose(d, compact) {
      var or = function (x) { var s = Array.isArray(x) ? x.join(', ') : x; return s || '(미입력)'; };
      if (compact) {
        var line = function (label, x) { var s = Array.isArray(x) ? x.join(', ') : x; return s ? label + ': ' + s : null; };
        return [
          '[' + (C.name || '첫화면 스튜디오') + ' 제작 의뢰서]',
          line('성함/상호', d.name), line('연락처', d.phone), line('이메일', d.email), line('답변 방법', d.replyBy),
          line('업종', d.industry), line('필요한 구성', d.package), line('월 예산', d.budget), line('희망 오픈 시기', d.timeline),
          line('마음에 든 시안', d.likedWorks), line('참고 사이트', d.reference), line('필요한 기능', d.features),
          line('준비된 자료', d.materials), d.message ? '하고 싶은 이야기:\n' + d.message : null,
          '개인정보 수집·이용 동의: 동의함 (' + stamp(d.consentAt) + ')'
        ].filter(Boolean).join('\n');
      }
      return [
        '[' + (C.name || '첫화면 스튜디오') + ' 제작 의뢰서]',
        '성함/상호: ' + or(d.name),
        '연락처: ' + or(d.phone),
        '이메일: ' + or(d.email),
        '답변 방법: ' + or(d.replyBy),
        '업종: ' + or(d.industry),
        '필요한 구성: ' + or(d.package),
        '월 예산: ' + or(d.budget),
        '희망 오픈 시기: ' + or(d.timeline),
        '마음에 든 시안: ' + or(d.likedWorks),
        '참고 사이트: ' + or(d.reference),
        '필요한 기능: ' + or(d.features),
        '준비된 자료: ' + or(d.materials),
        '하고 싶은 이야기:',
        d.message || '(미입력)',
        '개인정보 수집·이용 동의: 동의함 (' + stamp(d.consentAt) + ')'
      ].join('\n');
    }

    /* copy helpers */
    function selectNode(el) {
      var r = document.createRange();
      r.selectNodeContents(el);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    function copyText(text, el) {
      var viaExec = function () {
        try {
          selectNode(el);
          if (document.execCommand && document.execCommand('copy')) { window.getSelection().removeAllRanges(); return true; }
        } catch (err) { /* fall through to manual copy */ }
        selectNode(el);
        return false;
      };
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, viaExec);
      }
      return Promise.resolve(viaExec());
    }
    function flash(btn, label) {
      var orig = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', orig);
      btn.textContent = label;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = orig; }, 1600);
    }

    /* result screens */
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function swap(show, hide, after) {
      var h0 = surface.offsetHeight;
      hide.hidden = true;
      show.hidden = false;
      var h1 = surface.offsetHeight;
      if (!reduced() && surface.animate) {
        surface.style.overflow = 'hidden';
        var a = surface.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 300, easing: EASE });
        var done = function () { surface.style.overflow = ''; };
        a.finished.then(done, done);
        show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 80, easing: 'ease-out', fill: 'backwards' });
      }
      if (after) after();
    }

    function showResult(type, data, text, failed) {
      var email = (C.email || 'hello@example.com').trim();
      var kakao = kakaoUrl();
      var where = kakao ? '이메일이나 카카오톡으로' : '이메일로';
      var promise = (C.replyPromise || '영업일 기준 24시간 안에');
      result.textContent = '';
      var title = el('h3', 'result__title', type === 'A' ? '의뢰서를 잘 받았습니다'
        : (failed ? '의뢰서를 직접 보내 주세요' : '의뢰서가 완성되었습니다. 아직 보내지지 않았습니다'));
      title.tabIndex = -1;
      var body = el('p', 'result__body', type === 'A'
        ? promise + ' ' + withRo(data.replyBy) + ' 연락드리겠습니다. 급하시면 아래 연락처로 바로 말씀해 주세요.'
        : '아래 버튼으로 메일 앱을 열거나, 의뢰서를 복사해 ' + where + ' 보내 주세요. 받는 대로 확인하고 ' + promise + ' 연락드립니다.');
      var box = el('div', 'result__box');
      var pre = el('pre', 'result__text', text);
      var corners = el('span', 'corners');
      corners.setAttribute('aria-hidden', 'true');
      corners.innerHTML = '<i></i><i></i><i></i><i></i>';
      box.append(pre, corners);
      result.append(title, body);

      var copyBtn = el('button', type === 'A' ? 'btn btn--primary' : 'btn btn--outline', type === 'A' ? '접수 내용 복사하기' : '의뢰서 복사하기');
      copyBtn.type = 'button';
      var hint = el('p', 'result__hint', '의뢰서가 선택되었습니다. 길게 눌러 복사해 주세요');
      hint.hidden = true;
      copyBtn.addEventListener('click', function () {
        copyText(text, pre).then(function (ok) {
          if (ok) { hint.hidden = true; flash(copyBtn, '복사했습니다'); } else { hint.hidden = false; }
        });
      });

      if (type === 'B') {
        // one-tap ways to actually send it; none of them can confirm delivery, so the copy never says "sent"
        var send = el('div', 'result__send');
        var lab = el('p', 'result__label', '보낼 곳');
        var row = el('div', 'result__email');
        var addr = el('span', 'result__address selectable', email);
        var addrBtn = el('button', 'mini-btn', '주소 복사');
        addrBtn.type = 'button';
        addrBtn.addEventListener('click', function () {
          copyText(email, addr).then(function (ok) { flash(addrBtn, ok ? '복사했습니다' : '주소를 길게 눌러 복사해 주세요'); });
        });
        row.append(addr, addrBtn);

        var short = compose(data, true);
        var actions = el('div', 'result__actions');
        var mail = el('a', 'btn btn--primary', '메일 앱으로 보내기');
        var subject = '제작 의뢰서 (' + (data.name || '') + ')';
        mail.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' +
          encodeURIComponent(fitEncoded(short.replace(/\n/g, '\r\n'), 1800, '\r\n\r\n(길어서 일부만 담겼습니다. 화면의 의뢰서를 복사해 붙여 넣어 주세요.)'));
        actions.appendChild(mail);
        var phoneNum = String(C.phone || '').replace(/[^\d+]/g, '');
        if (phoneNum && window.matchMedia('(pointer: coarse)').matches) {
          var sms = el('a', 'btn btn--outline', '문자로 보내기');
          sms.href = 'sms:' + phoneNum + '?&body=' + encodeURIComponent(fitEncoded(short, 1500, '\n(이하 생략)'));
          actions.appendChild(sms);
        }
        actions.append(copyBtn);
        var how = el('p', 'result__how', '메일이나 문자 앱에서 보내기까지 눌러야 전달됩니다. 앱이 열리지 않으면 의뢰서를 복사해 위 주소로 보내 주세요.');
        send.append(lab, row, actions, hint, how);
        if (kakao) {
          var k = el('a', 'btn btn--outline result__kakao', '카카오톡으로 상담하기');
          k.href = kakao;
          send.appendChild(k);
        }
        result.append(send, box);
        var edit = el('button', 'textbtn result__edit', '내용 고치기');
        edit.type = 'button';
        edit.addEventListener('click', function () { backToForm(); });
        result.appendChild(edit);
      } else {
        result.appendChild(box);
        var actionsA = el('div', 'result__actions');
        actionsA.append(copyBtn, hint);
        result.appendChild(actionsA);
        var contact = el('p', 'result__contact');
        var em = el('span', 'selectable', email);
        var ph = el('a', 'link', C.phone || '010-0000-0000');
        ph.href = 'tel:' + String(C.phone || '').replace(/[^\d+]/g, '');
        contact.append('이메일 ', em, ', 전화 ', ph);
        result.appendChild(contact);
      }

      swap(result, form, function () {
        title.focus({ preventScroll: true });
        formTop().scrollIntoView({ behavior: behavior(), block: 'start' });
        requestAnimationFrame(function () { box.classList.add('is-drawn'); });
      });
      if (type === 'A') clearDraft();
    }

    function backToForm(silent) {
      sendAlert.hidden = true;
      swap(form, result, function () {
        if (silent) return;
        formTop().scrollIntoView({ behavior: behavior(), block: 'start' });
        E.name.focus({ preventScroll: true });
      });
    }

    function setSending(on) {
      sending = on;
      submitBtn.disabled = on;
      submitBtn.setAttribute('aria-busy', String(on));
      submitBtn.textContent = on ? '보내는 중…' : SUBMIT_LABEL;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      sendAlert.hidden = true;
      var errs = ORDER.filter(function (k) { return check(k); });
      if (errs.length) {
        showSummary(errs);
        focusField(errs[0]);
        return;
      }
      summaryKeys = [];
      renderSummary(false);
      var data = collect();
      var text = compose(data);
      // honeypot filled: look done, send nothing
      if (E.company_site.value) { showResult('A', data, text); return; }
      var url = endpoint();
      if (!url) { showResult('B', data, text); return; }
      setSending(true);
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
      var asForm = String(C.FORM_ENDPOINT_FORMAT || 'json').toLowerCase() === 'form';
      var headers = { Accept: 'application/json' };
      var payload;
      if (asForm) {
        payload = new URLSearchParams();
        Object.keys(data).forEach(function (k) { payload.append(k, Array.isArray(data[k]) ? data[k].join(', ') : String(data[k])); });
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(data);
      }
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: payload,
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setSending(false);
        showResult('A', data, text);
      }).catch(function () {
        clearTimeout(t);
        setSending(false);
        sendAlert.textContent = '전송에 실패했습니다. 아래 버튼으로 메일 앱을 열거나, 의뢰서를 복사해 ' + (kakaoUrl() ? '이메일이나 카카오톡으로' : '이메일로') + ' 보내 주시면 바로 확인하겠습니다.';
        sendAlert.hidden = false;
        showResult('B', data, text, true);
      });
    });
    // a mockup can link here with ?work=<slug> to arrive with that design already picked
    try {
      var w = new URLSearchParams(window.location.search).get('work');
      if (w && likedBoxes.some(function (b) { return b.getAttribute('data-slug') === w; })) {
        window.addEventListener('load', function () { setTimeout(function () { Form.pickWork(w); }, 200); });
      }
    } catch (err) { /* URLSearchParams missing: skip */ }
  }

  /* ---------- privacy dialog ---------- */

  function initDialog() {
    var dlg = $('[data-privacy]');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var last = null;
    $$('[data-privacy-open]').forEach(function (b) {
      b.addEventListener('click', function () { last = b; dlg.showModal(); });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (last) last.focus(); });
  }

  /* ---------- floating CTA ---------- */

  function initFloat() {
    var bar = $('[data-float]');
    var heroCta = $('[data-hero-cta]');
    var req = $('#request');
    var footer = $('[data-footer]');
    var form = $('[data-form]');
    if (!bar || !heroCta || !('IntersectionObserver' in window)) return;
    var past = false, inReq = false, inFoot = false, typing = false;
    var fields = 'input, select, textarea';
    // One filled action on screen (Refactoring UI §2.8): while a section's own filled button is visible,
    // the bottom bar stays down and the header pill steps back to an outline.
    var ctaSeen = new Set();
    function update() {
      var desk = mqTablet.matches;
      var ctaInView = ctaSeen.size > 0;
      var show = past && !inReq && !ctaInView && !(desk && inFoot) && !(!desk && typing);
      bar.classList.toggle('is-shown', show);
      root.classList.toggle('float-on', show && !desk);
      root.classList.toggle('cta-in-view', ctaInView);
      root.classList.toggle('in-request', inReq);
    }
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var visible = en.isIntersecting && en.target.getClientRects().length > 0;
        if (visible) ctaSeen.add(en.target); else ctaSeen.delete(en.target);
      });
      update();
    }, { threshold: 0.6 });
    var watchCtas = function () {
      $$('main .btn--primary, main .btn--light, footer .btn--light').forEach(function (b) {
        if (!b._ctaWatched) { b._ctaWatched = true; ctaObserver.observe(b); }
      });
    };
    watchCtas();
    // buttons on the result screen are created later
    var resultBox = $('[data-result]');
    if (resultBox && 'MutationObserver' in window) new MutationObserver(watchCtas).observe(resultBox, { childList: true });
    new IntersectionObserver(function (en) {
      past = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
      update();
    }).observe(heroCta);
    // "#request covers at least about 30% of the screen": it touches the middle band of the viewport
    new IntersectionObserver(function (en) { inReq = en[0].isIntersecting; update(); }, { rootMargin: '-30% 0px -30% 0px' }).observe(req);
    if (footer) new IntersectionObserver(function (en) { inFoot = en[0].isIntersecting; update(); }).observe(footer);
    if (form) {
      form.addEventListener('focusin', function (e) { if (e.target.matches(fields)) { typing = true; update(); } });
      form.addEventListener('focusout', function () {
        setTimeout(function () {
          var a = document.activeElement;
          typing = !!a && form.contains(a) && a.matches(fields);
          update();
        }, 0);
      });
    }
    onChange(mqTablet, update);
  }

  /* ---------- boot ---------- */

  run('config', applyConfig);
  run('header', initHeader);
  $$('[data-seg]').forEach(function (s) { run('seg', function () { initSeg(s); }); });
  run('form', initForm);
  run('portfolio', initPortfolio);
  run('stage', initStage);
  run('hero', initHero);
  run('reveals', initReveals);
  run('process', initProcess);
  run('pricing', initPricing);
  run('faq', initFaq);
  run('dialog', initDialog);
  run('float', initFloat);

  if (has('ScrollTrigger') && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', refresh);
})();
