/* 서리재 시안 · 페이지 동작(읽기용 원본). 사진 설정 PHOTOS는 ../main.js 맨 위에 있고, 이 파일은 그것을 읽기만 한다.
   고친 뒤에는 node src/build.mjs 로 ../main.js(PHOTOS 블록은 그대로 두고 아래만 교체), ../jacket.js, ../scenes.js 를 다시 만든다. */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var SHOT = /[?&]shot=1/.test(location.search);
  var mq = function (q) { return W.matchMedia(q).matches; };
  var RM = SHOT || mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var PHONE = function () { return W.innerWidth < 768; };
  var DPR = Math.min(W.devicePixelRatio || 1, PHONE() ? 1.5 : 2);
  var G = W.gsap, ok = !!(G && W.ScrollTrigger && W.Draggable && W.Flip);
  if (SHOT) H.classList.add('shot');
  try { if (ok) G.registerPlugin(W.ScrollTrigger, W.Draggable, W.InertiaPlugin, W.DrawSVGPlugin, W.Flip); } catch (e) { ok = false; }
  var MOTION = ok && !RM;
  if (!ok) H.classList.add('no-motion');
  var SR = W.SRJ || {}, canDraw = !!(SR.jacket && SR.scenes);

  /* ---------- 데이터 ---------- */
  var COL = {
    ember: { ko: '잔불', en: 'EMBER', hex: '#E2531C' }, basalt: { ko: '현무', en: 'BASALT', hex: '#1B1C1F' }, frost: { ko: '서리', en: 'FROST', hex: '#E3E6E4' },
    moss: { ko: '이끼', en: 'MOSS', hex: '#56614B' }, dawn: { ko: '새벽', en: 'DAWN', hex: '#3E5674' }
  };
  var FIT = {
    unisex: { ko: '공용', text: '어깨에 여유를 둔 일자 핏입니다. 안에 플리스를 겹쳐 입어도 팔이 끼지 않습니다.', model: '모델은 키 178cm, M을 입었습니다.',
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], rows: [[51, 65, 62], [53.5, 67, 63.5], [56, 69, 65], [58.5, 71, 66.5], [61, 73, 68], [63.5, 75, 69.5]] },
    women: { ko: '여성', text: '허리선을 2.8cm 들이고 소매를 1.5cm 줄였습니다. 크롭 재킷은 골반 위에서 끝납니다.', model: '모델은 키 168cm, S를 입었습니다.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'], rows: [[47, 60, 59], [49.5, 62, 60.5], [52, 64, 62], [54.5, 66, 63.5], [57, 68, 65]] }
  };
  var P = [
    { id: 'hanjum-hoody', name: '한줌 후디 다운', desc: '후드까지 솜털을 채운 기본형', fit: 'unisex', model: 'hoody', price: 398000, colors: ['ember', 'basalt', 'frost', 'dawn'], g: 248, fill: 92, rev: 128, tag: '신상품' },
    { id: 'hanjum-jacket', name: '한줌 다운 재킷', desc: '스탠드 칼라, 겹쳐 입기 좋은 두께', fit: 'unisex', model: 'jacket', price: 358000, colors: ['basalt', 'moss', 'dawn'], g: 226, fill: 84, rev: 86, tag: '신상품' },
    { id: 'hanjum-hoody-w', name: '한줌 후디 다운 우먼', desc: '허리선을 살린 여성 핏', fit: 'women', model: 'hoodyW', price: 398000, colors: ['ember', 'frost', 'dawn'], g: 214, fill: 80, rev: 97, tag: '신상품' },
    { id: 'hanjum-crop-w', name: '한줌 크롭 재킷 우먼', desc: '골반 위에서 끝나는 짧은 길이', fit: 'women', model: 'cropW', price: 338000, colors: ['frost', 'moss', 'basalt'], g: 188, fill: 68, rev: 54, tag: '신상품' },
    { id: 'hanjum-vest', name: '한줌 다운 베스트', desc: '팔이 자유로운 조끼, 163g', fit: 'unisex', model: 'vest', price: 238000, colors: ['basalt', 'moss', 'ember'], g: 163, fill: 58, rev: 41, tag: '재입고' }
  ];
  var PI = {}; P.forEach(function (p) { PI[p.id] = p; });
  var ADD = { gaiter: { name: '한줌 넥 게이터', o: '를', price: 29000 }, wash: { name: '다운 전용 세제 250ml', o: '를', price: 14000 }, sack: { name: '압축 수납 색', o: '을', price: 16000 } };
  var STOCK = { 'hanjum-hoody|ember|M': 3, 'hanjum-hoody|ember|L': 0, 'hanjum-crop-w|frost|S': 2, 'hanjum-vest|basalt|XXL': 0 };
  var stockOf = function (id, c, s) { var v = STOCK[id + '|' + c + '|' + s]; return v == null ? 99 : v; };
  var NF = new Intl.NumberFormat('ko-KR');
  var won = function (n) { return (n < 0 ? '-' : '') + NF.format(Math.abs(Math.round(n))) + '원'; };
  var josa = function (s, a, b) { return /^(M|L|XL|XXL)$/.test(s) ? a : b; };

  /* ---------- 상태(세션 저장, 막히면 메모리만) ---------- */
  var KEY = 'seorijae:v1';
  var state = { cart: [], wish: [], coupon: null, promoClosed: false, filter: 'all' };
  if (!SHOT) {
    try {
      var saved = JSON.parse(W.sessionStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (Array.isArray(saved.cart)) state.cart = saved.cart.filter(function (l) { return l && (PI[l.id] ? COL[l.color] && l.size : ADD[l.id]) && l.qty > 0; }).map(function (l) { return { id: l.id, color: l.color || null, size: l.size || null, qty: Math.min(5, l.qty | 0 || 1) }; });
        if (Array.isArray(saved.wish)) state.wish = saved.wish.filter(function (id) { return PI[id]; });
        state.coupon = saved.coupon === 'HANJUM7' ? 'HANJUM7' : null;
        state.promoClosed = !!saved.promoClosed;
        state.filter = /^(all|unisex|women)$/.test(saved.filter) ? saved.filter : 'all';
      }
    } catch (e) { /* 저장소가 막힌 환경: 메모리 상태로만 동작 */ }
  }
  function save() { if (SHOT) return; try { W.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ } }

  /* ---------- 사진 슬롯: ./photos/ 상대 경로만 허용. 비어 있으면 요청 0건. ---------- */
  var PHOTO_RE = /^\.\/photos\/[A-Za-z0-9_\-][A-Za-z0-9_\-./]*\.(jpe?g|png|webp|avif)$/i, BAD = {};
  function photo(v) {
    if (!v) return null;
    var o = typeof v === 'string' ? { src: v } : v;
    if (!o || typeof o.src !== 'string' || !PHOTO_RE.test(o.src) || o.src.indexOf('..') >= 0 || o.src.indexOf('//') >= 0 || BAD[o.src]) return null;
    return o;
  }
  function putPhoto(ph, o, alt, fallback) {
    var img = new Image(), cvs = $('canvas', ph);
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = o.alt || alt;
    if (o.focal) img.style.objectPosition = o.focal;
    if (cvs) cvs.setAttribute('aria-hidden', 'true');
    img.addEventListener('error', function () { BAD[o.src] = 1; img.remove(); ph.classList.remove('has-photo'); if (cvs) cvs.removeAttribute('aria-hidden'); fallback(); }, { once: true });
    img.addEventListener('load', function () { ph.classList.add('is-drawn'); }, { once: true });
    img.src = o.src; ph.appendChild(img); ph.classList.add('has-photo');
    return true;
  }

  /* ---------- 그리기 일정: 한 번 그리면 끝. 화면 1개 높이 전에 프레임당 1장. ---------- */
  // 인트로(0.9초)가 끝난 뒤부터 그린다: 연출 중에 무거운 그리기가 끼어들지 않게
  var Q = [], pumping = false, gate = SHOT || !MOTION;
  setTimeout(function () { gate = true; if (Q.length && !pumping) { pumping = true; idle(pump); } }, 1100);
  var idle = W.requestIdleCallback ? function (f) { W.requestIdleCallback(f, { timeout: 200 }); } : function (f) { setTimeout(f, 16); };
  function enqueue(f, front) { if (front) Q.unshift(f); else Q.push(f); if (!pumping && gate) { pumping = true; idle(pump); } }
  function pump() {
    var f = Q.shift();
    if (f) { try { f(); } catch (e) { /* 한 장 실패해도 나머지는 그린다 */ } }
    if (Q.length) W.requestAnimationFrame(function () { idle(pump); }); else pumping = false;
  }
  // 배치 크기(변형 전)로 잰다: 연출 중 scale이 걸려 있어도 흐리게 그리지 않게
  function fit(c, k) {
    var cw = c.offsetWidth, ch = c.offsetHeight;
    if (!cw) { var r = c.getBoundingClientRect(); cw = r.width; ch = r.height; }
    var w = Math.max(2, Math.round(cw * DPR * (k || 1))), h = Math.max(2, Math.round(ch * DPR * (k || 1)));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return cw > 0;
  }
  function near(el, fn, margin) {
    if (!('IntersectionObserver' in W)) { enqueue(fn); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); enqueue(fn); } }); }, { rootMargin: margin || '100% 0px' });
    io.observe(el);
  }
  // 장면은 그레인과 심도가 있는 사진이라 1.5배 밀도로 충분하다
  function scene(c, id, k) {
    if (!canDraw || !fit(c, (k || 1) * Math.min(1, 1.5 / DPR))) return;
    SR.scenes.render(c, id);
    c.parentNode.classList.add('is-drawn');
  }
  function jacketTo(c, o) {
    if (!canDraw || !fit(c)) return;
    SR.jacket.render(c, o);
    c.parentNode.classList.add('is-drawn');
  }

  /* ---------- 알림(토스트): 한 번에 하나, 3.2초. 열린 대화상자 안으로 옮겨 최상위 층에 보이게. ---------- */
  var toastEl = $('#toast'), toastT = $('[data-toast-text]'), toastA = $('[data-toast-act]'), toastTimer, toastAct, toastHold = false;
  function host() { var d = $$('dialog[open]').pop(); return d || D.body; }
  function toast(text, act, fn, ms) {
    clearTimeout(toastTimer);
    var h = host(); if (toastEl.parentNode !== h) h.appendChild(toastEl);
    toastT.textContent = text; toastAct = fn || null;
    toastA.hidden = !act; toastA.textContent = act || '';
    toastEl.hidden = false; toastEl.classList.add('is-hide');
    W.requestAnimationFrame(function () { W.requestAnimationFrame(function () { toastEl.classList.remove('is-hide'); }); });
    var life = ms || 3200;
    (function wait() { toastTimer = setTimeout(function () { if (toastHold) return wait(); hideToast(); }, life); })();
  }
  function hideToast() { toastEl.classList.add('is-hide'); setTimeout(function () { if (toastEl.classList.contains('is-hide')) toastEl.hidden = true; }, 230); }
  toastA.addEventListener('click', function () { var f = toastAct; hideToast(); if (f) f(); });
  ['pointerenter', 'focusin'].forEach(function (e) { toastEl.addEventListener(e, function () { toastHold = true; }); });
  ['pointerleave', 'focusout'].forEach(function (e) { toastEl.addEventListener(e, function () { toastHold = false; }); });

  /* ---------- 숫자 굴리기 ---------- */
  function roll(el, to) {
    var from = +(el.dataset.v || 0); el.dataset.v = to;
    if (!MOTION || from === to) { el.textContent = won(to); return; }
    var o = { v: from }; G.to(o, { v: to, duration: .3, ease: 'power2.out', onUpdate: function () { el.textContent = won(o.v); }, overwrite: true });
  }

  /* =====================================================================
     프로모 바
     ===================================================================== */
  var promo = $('#promo');
  function promoGot() { promo.classList.add('is-got'); var b = $('.promo__b', promo); b.removeAttribute('aria-hidden'); b.tabIndex = -1; $('.promo__a', promo).setAttribute('aria-hidden', 'true'); }
  if (state.promoClosed) { promo.classList.add('is-closed'); promo.hidden = true; }
  if (state.coupon) promoGot();
  $('[data-coupon]').addEventListener('click', function () {
    state.coupon = 'HANJUM7'; save(); promoGot(); $('.promo__b', promo).focus(); renderCart();
  });
  $('[data-promo-close]').addEventListener('click', function () {
    state.promoClosed = true; save(); promo.classList.add('is-closed');
    $('.logo').focus();
    setTimeout(function () { promo.hidden = true; refreshSoon(); }, RM ? 0 : 240);
  });

  /* =====================================================================
     헤더, 검색, 모바일 메뉴, 서브 탭
     ===================================================================== */
  var hdr = $('#hdr'), tabs = $('#tabs'), headerVisible = true;
  if ('IntersectionObserver' in W) {
    new IntersectionObserver(function (es) {
      headerVisible = es[0].isIntersecting;
      tabs.classList.toggle('is-stuck', !headerVisible);
      placeSearch();
    }, { threshold: 0 }).observe(hdr);
  }
  // 서브 탭 밑줄: 하나의 요소가 활성 탭으로 미끄러진다
  var tabEls = $$('.tab', tabs), tabBar = $('.tabs__bar', tabs), curTab = 'top';
  function setTab(k) {
    curTab = k;
    tabEls.forEach(function (t) { if (t.dataset.tab === k) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    var a = tabEls.filter(function (t) { return t.dataset.tab === k; })[0];
    tabBar.style.setProperty('--bx', a.offsetLeft + 'px'); tabBar.style.setProperty('--bw', a.offsetWidth + 'px');
  }
  setTab('top');
  var prog = $('.tabs__prog i');
  if (ok) {
    // 끝값('max')에 기대지 않는다: 들어올 때와 되돌아 나갈 때만 바꾼다
    W.ScrollTrigger.create({ trigger: '#products', start: 'top 40%', onEnter: function () { setTab('products'); }, onLeaveBack: function () { setTab('top'); } });
    W.ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { prog.style.setProperty('--p', s.progress.toFixed(4)); } });
  } else if ('IntersectionObserver' in W) {
    new IntersectionObserver(function (es) { setTab(es[0].boundingClientRect.top < innerHeight * .4 ? 'products' : 'top'); }, { rootMargin: '0px 0px -60% 0px' }).observe($('#products'));
  }

  // 검색
  var search = $('#search'), q = $('#q'), sBtn = $('[data-search-open]'), scrolledOnce = false, sTimer;
  function placeSearch() {
    if (search.hidden) return;
    var b = hdr.getBoundingClientRect().bottom;
    search.style.setProperty('--search-top', Math.max(48, Math.round(b)) + 'px');
  }
  W.addEventListener('scroll', function () { if (!search.hidden) W.requestAnimationFrame(placeSearch); }, { passive: true });
  function openSearch() { search.hidden = false; sBtn.setAttribute('aria-expanded', 'true'); scrolledOnce = false; placeSearch(); q.focus(); }
  function closeSearch(back) { search.hidden = true; sBtn.setAttribute('aria-expanded', 'false'); if (back !== false) sBtn.focus(); }
  sBtn.addEventListener('click', function () { if (search.hidden) openSearch(); else closeSearch(); });
  $('[data-search-close]').addEventListener('click', function () { closeSearch(); });
  search.addEventListener('submit', function (e) { e.preventDefault(); applySearch(true); });
  search.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeSearch(); } });
  q.addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(function () { applySearch(!scrolledOnce); }, 350); });

  // 모바일 메뉴(전체 화면 시트). dialog가 포커스 가두기와 Esc를 맡는다.
  var menu = $('#menu'), menuBtn = $('[data-menu-open]');
  menuBtn.addEventListener('click', function () { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); H.classList.add('dlg-open'); });
  menu.addEventListener('close', function () { menuBtn.setAttribute('aria-expanded', 'false'); H.classList.remove('dlg-open'); });
  $('[data-close]', menu).addEventListener('click', function () { menu.close(); });
  $$('[data-menu-link]', menu).forEach(function (a) { a.addEventListener('click', function () { menu.close(); }); });
  $$('[data-filter]').forEach(function (a) { a.addEventListener('click', function () { setFilter(a.dataset.filter); }); });

  /* =====================================================================
     5.1 모델 띠
     ===================================================================== */
  var strip = $('#strip'), track = $('.strip__track', strip), origPanels = $$('.panel', track), NP = origPanels.length;
  var countEl = $('[data-strip-count]'), countNum = $('.num', countEl), lineB = $('.ctl__line b'), playBtn = $('[data-strip="play"]');
  var sceneCanvases = {};
  function drawPanel(p, half) {
    var id = p.dataset.scene, list = sceneCanvases[id];
    if (!list) return;
    if (half) { scene(list[0], id, .5); return; }
    scene(list[0], id);
    list.slice(1).forEach(function (cc) { if (!fit(cc)) return; cc.getContext('2d').drawImage(list[0], 0, 0, cc.width, cc.height); cc.parentNode.classList.add('is-drawn'); });
  }
  function heroPhoto(p, i) {
    var o = photo(PHOTOS.heroModels[i]); if (!o) return false;
    var c = $('.panel__go', p), color = (c && c.dataset.color) || o.color || 'ember';
    $$('.ph', p.parentNode).filter(function (ph) { return ph.closest('.panel').dataset.i === String(i); }).forEach(function (ph, k) {
      putPhoto(ph, o, '한줌 다운을 입은 모델, ' + COL[color].ko + ' 색상', function () { drawPanel(p); });
      if (k) $('img', ph).alt = '';
    });
    return true;
  }

  var stripApi = (function () {
    var cur = 0, auto = !RM && !SHOT, hover = false, focusIn = false, onScreen = true, step = 0, pw = 0, base = 0, Wt = 0, panels = origPanels, offset = 0;
    var proxy, drag, prog, sets = [], inner = [], skewTo, intro = null;
    var carousel = MOTION && !SHOT;
    origPanels.forEach(function (p) { sceneCanvases[p.dataset.scene] = [$('canvas', p)]; });
    function label() { countNum.textContent = (cur + 1) + ' / ' + NP; }
    function liveMode() { countEl.setAttribute('aria-live', running() ? 'off' : 'polite'); }
    function running() { return auto && !hover && !focusIn && onScreen && !D.hidden; }
    function syncPlayBtn() {
      playBtn.setAttribute('aria-pressed', auto ? 'false' : 'true');
      playBtn.setAttribute('aria-label', auto ? '자동 넘김 멈춤' : '자동 넘김 재생');
      $('use', playBtn).setAttribute('href', auto ? '#i-pause' : '#i-play');
    }
    function measure() {
      var r = panels[0].getBoundingClientRect(), gap = parseFloat(getComputedStyle(strip).getPropertyValue('--gap')) || 8;
      pw = r.width; step = pw + gap; Wt = panels.length * step;
      base = PHONE() ? parseFloat(getComputedStyle(D.body).getPropertyValue('--gut')) || 20 : pw / 2 + gap;
    }
    function layout() {
      var vw = strip.clientWidth, wrap = G.utils.wrap(-step, Wt - step), par = (parseFloat(getComputedStyle(strip).getPropertyValue('--par')) || 14) / 100;
      for (var i = 0; i < panels.length; i++) {
        var x = wrap(i * step + base + offset), c = x + pw / 2 - vw / 2;
        sets[i](x);
        inner[i](G.utils.clamp(-1, 1, -c / (vw / 2 + pw / 2)) * par * pw / 2);
      }
    }
    function curFromOffset() { var c = ((Math.round(-offset / step) % NP) + NP) % NP; if (c !== cur || !countNum.textContent) { cur = c; label(); } }
    function goTo(i, dur, ease) {
      if (!carousel) {
        var t = origPanels[(i + NP) % NP];
        track.scrollTo({ left: t.offsetLeft - track.offsetLeft - (PHONE() ? 20 : (track.clientWidth - t.offsetWidth) / 2), behavior: RM ? 'auto' : 'smooth' });
        return;
      }
      var target = -i * step, diff = target - offset; diff = ((diff % Wt) + Wt * 1.5) % Wt - Wt / 2;
      var o = { x: offset };
      G.to(o, { x: offset + diff, duration: dur == null ? .6 : dur, ease: ease || 'power3.inOut', overwrite: true, onUpdate: function () { offset = o.x; G.set(proxy, { x: offset }); layout(); }, onComplete: function () { drag && drag.update(); curFromOffset(); } });
      cur = ((i % NP) + NP) % NP; label();
    }
    function next() { goTo(cur + 1, .9, 'power2.inOut'); }
    function updateAuto() {
      if (!prog) return;
      if (running()) prog.resume(); else prog.pause();
      liveMode();
    }
    if (carousel) {
      H.classList.add('carousel');
      // 앞뒤로 복제(aria-hidden + inert)하고 gsap.utils.wrap으로 x를 감는다
      origPanels.forEach(function (p) {
        var c = p.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.inert = true; c.classList.add('is-clone');
        $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
        var cv = $('canvas', c); cv.removeAttribute('role'); cv.removeAttribute('aria-label');
        track.appendChild(c); sceneCanvases[p.dataset.scene].push(cv);
      });
      panels = $$('.panel', track);
      sets = panels.map(function (p) { return G.quickSetter(p, 'x', 'px'); });
      inner = panels.map(function (p) { return G.quickSetter($('.ph', p), 'x', 'px'); });
      measure(); layout(); label();
      proxy = D.createElement('div');
      skewTo = G.quickTo(track, 'skewX', { duration: .4, ease: 'power3.out' });
      var last = 0;
      drag = W.Draggable.create(proxy, {
        type: 'x', trigger: strip, inertia: true, minDuration: .3, maxDuration: 1.2, minimumMovement: 10, dragClickables: false, allowContextMenu: true,
        onPress: function () { G.killTweensOf(proxy); strip.classList.add('is-grab'); last = this.x; },
        onRelease: function () { strip.classList.remove('is-grab'); },
        onDragStart: function () { auto = false; syncPlayBtn(); updateAuto(); },
        onDrag: function () { offset = this.x; skewTo(G.utils.clamp(-2, 2, (this.x - last) * .12)); last = this.x; layout(); curFromOffset(); },
        onThrowUpdate: function () { offset = this.x; skewTo(G.utils.clamp(-2, 2, (this.x - last) * .12)); last = this.x; layout(); curFromOffset(); },
        onThrowComplete: function () { skewTo(0); curFromOffset(); },
        onDragEnd: function () { skewTo(0); },
        snap: { x: function (v) { return Math.round(v / step) * step; } }
      })[0];
      prog = G.fromTo(lineB, { scaleX: 0 }, { scaleX: 1, duration: 4.5, ease: 'none', paused: true, onComplete: function () { next(); prog.restart(); updateAuto(); } });
      W.addEventListener('resize', debounce(function () { measure(); offset = -cur * step; G.set(proxy, { x: offset }); drag.update(); layout(); }, 150));
      // 로드 연출: 눌려 붙어 있던 패널이 0.9초에 펴지며 벌어진다(접힘 → 부풂)
      var vw = strip.clientWidth, vis = panels.map(function (p, i) { return { p: p, x: G.utils.wrap(-step, Wt - step)(i * step + base) }; })
        .filter(function (o) { return o.x + pw > 0 && o.x < vw; }).sort(function (a, b) { return a.x - b.x; });
      if (PHONE()) vis = vis.slice(0, 3);
      var slice = pw * .18 + 2;
      panels.forEach(function (p) { if (!vis.some(function (o) { return o.p === p; })) G.set(p, { autoAlpha: 0 }); });
      // 멈춘 채 만들고, 첫 그리기가 끝난 다음 프레임에 재생한다(동기 렌더로 첫 프레임을 건너뛰지 않게)
      var tl = intro = G.timeline({ paused: true, onComplete: function () { G.set(panels, { clearProps: 'clipPath,opacity,visibility' }); layout(); updateAuto(); } });
      vis.forEach(function (o, k) {
        var gx = vw / 2 + (k - (vis.length - 1) / 2) * slice - pw / 2;
        tl.fromTo(o.p, { x: gx, clipPath: 'inset(0% 41% 0% 41%)' }, { x: o.x, clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'power3.out' }, k * .04);
      });
      panels.forEach(function (p) { if (!vis.some(function (o) { return o.p === p; })) tl.set(p, { autoAlpha: 1 }, .9); });
    } else {
      // 가로 스냅 스크롤(모션 줄이기, GSAP 없음)
      var setCur = function () {
        var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
        origPanels.forEach(function (p, i) { var d = Math.abs(p.offsetLeft - track.offsetLeft + p.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
        cur = best; label();
      };
      track.addEventListener('scroll', debounce(setCur, 80), { passive: true });
      if (SHOT) {
        // 썸네일: h1이 왼쪽에서 두 번째, 왼쪽 끝에 h5가 반쯤. 복제 없이 순서만 바꿔 같은 정지 화면을 만든다.
        track.insertBefore(origPanels[NP - 1], origPanels[0]);
        track.style.paddingLeft = '0px'; track.style.scrollSnapType = 'none';
        track.scrollLeft = origPanels[0].getBoundingClientRect().width / 2;
      }
      label();
      var timer;
      prog = { resume: function () { if (!timer) timer = setInterval(function () { goTo(cur + 1); }, 4500); }, pause: function () { clearInterval(timer); timer = null; } };
    }
    syncPlayBtn(); liveMode();
    $('[data-strip="next"]').addEventListener('click', function () { auto = false; syncPlayBtn(); updateAuto(); goTo(cur + 1, RM ? .01 : .6); });
    $('[data-strip="prev"]').addEventListener('click', function () { auto = false; syncPlayBtn(); updateAuto(); goTo(cur - 1, RM ? .01 : .6); });
    playBtn.addEventListener('click', function () { auto = !auto; syncPlayBtn(); if (auto && prog.restart) prog.restart(); updateAuto(); });
    strip.addEventListener('keydown', function (e) {
      if (e.target !== strip) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); auto = false; syncPlayBtn(); updateAuto(); goTo(cur + 1, RM ? .01 : .5); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); auto = false; syncPlayBtn(); updateAuto(); goTo(cur - 1, RM ? .01 : .5); }
    });
    strip.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; updateAuto(); } });
    strip.addEventListener('pointerleave', function () { hover = false; updateAuto(); });
    strip.addEventListener('focusin', function () { focusIn = true; updateAuto(); });
    strip.addEventListener('focusout', function (e) { if (!strip.contains(e.relatedTarget)) { focusIn = false; updateAuto(); } });
    D.addEventListener('visibilitychange', updateAuto);
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; updateAuto(); }).observe(strip);
    return { start: function () { if (intro) { W.requestAnimationFrame(function () { intro.play(); if (logoIntro) logoIntro.play(); }); } else updateAuto(); } };
  })();

  // 패널 그리기: 처음 보이는 패널은 동기(1/2 해상도 → 다음 프레임에 원해상도), 나머지는 차례로
  (function () {
    var vw = W.innerWidth, first = [];
    origPanels.forEach(function (p, i) {
      if (heroPhoto(p, i)) return;
      var r = $('canvas', p).getBoundingClientRect(), clones = sceneCanvases[p.dataset.scene].slice(1);
      var visible = (r.right > 0 && r.left < vw) || clones.some(function (c) { var cr = c.getBoundingClientRect(); return cr.right > 0 && cr.left < vw; });
      if (visible) first.push(p); else enqueue(function () { drawPanel(p); });
    });
    first.forEach(function (p) { if (SHOT) drawPanel(p); else drawPanel(p, true); });
    if (SHOT) { H.classList.add('is-ready'); }
    else first.forEach(function (p) { enqueue(function () { drawPanel(p); }, true); });
  })();
  $$('.panel__go[data-qv]').forEach(function (b) { b.addEventListener('click', function () { openQV(b.dataset.qv, b.dataset.color, null); }); });

  /* 로고타입 2행: 1행의 너비에 양끝이 맞게 자간 조정 */
  function fitLogotypes() {
    $$('.logotype').forEach(function (lt) {
      // 자간 0.34em을 지키면서 2행의 양끝이 1행 너비에 맞도록 글자 크기를 푼다(인트로 중이어도 wdth 125 기준으로 잰다)
      var a = $('.logotype__1', lt), b = $('.logotype__2', lt), keep = a.style.cssText;
      a.style.fontVariationSettings = '"wdth" 125'; a.style.fontStretch = '125%';
      b.style.fontSize = ''; b.style.setProperty('--ls2', '.34em');
      var fs = parseFloat(getComputedStyle(b).fontSize);
      var wa = a.getBoundingClientRect().width - parseFloat(getComputedStyle(a).paddingRight), wb = b.getBoundingClientRect().width - .34 * fs;
      a.style.cssText = keep;
      if (wb > 0) b.style.fontSize = (fs * wa / wb).toFixed(2) + 'px';
    });
  }

  /* =====================================================================
     5.2 기능 도해
     ===================================================================== */
  var tech = $('#tech'), jk = $('#jkStage');
  function drawTech() {
    if (!canDraw) return;
    $$('.part', jk).forEach(function (pt, i) {
      enqueue(function () { jacketTo($('canvas', pt), { model: 'hoody', color: 'ember', view: 'front', pose: 'flat', parts: [pt.dataset.part], bg: 'none' }); if (i === 3) jk.classList.add('is-drawn'); }, i === 1);
    });
    var cuts = [$('.cut__s', jk), $('.cut__d', jk), $('.cut__l', jk)];
    cuts.forEach(function (c) { fit(c); });
    SR.jacket.renderWindow(cuts, 'ember');
    var pk = $('.co__pack'); if (fit(pk, 2)) SR.jacket.renderPack(pk, 'ember');
  }
  near(tech, drawTech, '150% 0px');
  var coItems = $$('.co__i'), marks = $$('.mk', jk);
  marks.forEach(function (m) {
    m.addEventListener('click', function () {
      var li = coItems[+m.dataset.mk];
      li.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
      li.classList.add('is-hi'); setTimeout(function () { li.classList.remove('is-hi'); }, 1200);
    });
  });
  function setMarkerA11y() {
    var desk = W.innerWidth >= 1024;
    marks.forEach(function (m) { if (desk) { m.tabIndex = -1; m.setAttribute('aria-hidden', 'true'); } else { m.removeAttribute('tabindex'); m.removeAttribute('aria-hidden'); } });
  }
  setMarkerA11y();
  W.addEventListener('resize', debounce(setMarkerA11y, 150));
  var countUp = function () {
    $$('[data-count]').forEach(function (b) {
      var t = b.dataset.count, parts = t.split('/');
      if (!MOTION) { b.textContent = t; return; }
      var o = { k: 0 };
      G.to(o, { k: 1, duration: .6, ease: 'power2.out', onUpdate: function () { b.textContent = parts.map(function (n) { return Math.round(+n * o.k); }).join('/'); } });
    });
  };
  if (!MOTION) jk.classList.add('is-open');

  /* =====================================================================
     5.3 큰 제품명
     ===================================================================== */
  var big = $('.big'), bigLine = $('.big__line'), bigWords = $$('.big__w'), bigRule = $('.big__rule'), capL = $('.big__l'), capR = $('.big__r');
  var VF = !!(W.CSS && CSS.supports && CSS.supports('font-variation-settings', '"wdth" 100'));
  function wdth(el, w, g) { el.style.fontVariationSettings = '"wdth" ' + w.toFixed(1) + ', "wght" ' + g.toFixed(0); el.style.fontStretch = w.toFixed(1) + '%'; }
  function fitBig() {
    var pad = parseFloat(getComputedStyle($('.big__clip')).paddingLeft) * 2, inner = big.clientWidth - pad, mob = PHONE();
    bigLine.style.fontSize = '100px'; bigLine.style.setProperty('--gap', '.28em');
    bigWords.forEach(function (w) { w.style.fontSize = ''; wdth(w, 125, 800); });
    if (!mob) {
      var sw = bigWords.reduce(function (s, w) { return s + w.getBoundingClientRect().width; }, 0) + 2 * 28;
      bigLine.style.fontSize = (100 * inner / sw * .995).toFixed(2) + 'px';
      big.style.removeProperty('--bh');
    } else {
      var hsum = 0;
      bigWords.forEach(function (w) { var fs = 100 * inner / w.getBoundingClientRect().width * .99; w.style.fontSize = fs.toFixed(2) + 'px'; hsum += fs * .86; });
      big.style.setProperty('--bh', Math.round(hsum + 96) + 'px');
    }
    applyBig(bigP);
  }
  var bigP = 1;
  function applyBig(p) {
    bigP = p;
    var mob = PHONE();
    bigWords.forEach(function (w, i) {
      var k = mob ? G ? G.utils.clamp(0, 1, (p - i * .12) / .76) : p : p, e = k;
      if (VF) wdth(w, 62 + 63 * e, 800 - 180 * e);
      else { w.style.transform = 'scaleX(' + (.55 + .45 * e) + ')'; w.style.transformOrigin = 'center'; }
    });
    if (!mob) bigLine.style.setProperty('--gap', (.02 + .26 * p).toFixed(3) + 'em');
    bigRule.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (p - .85) / .15)) + ')';
    capL.classList.toggle('is-on', p <= .3); capR.classList.toggle('is-on', p >= .7);
  }

  /* =====================================================================
     5.4 원통형 룩북
     ===================================================================== */
  var lookStage = $('#lookStage'), ring = $('#ring'), lcards = $$('.lcard', ring), NL = lcards.length, liveEl = $('[data-look-live]');
  (function () {
    var has3d = MOTION && W.CSS && CSS.supports('transform-style', 'preserve-3d');
    if (SHOT && W.CSS && CSS.supports('transform-style', 'preserve-3d') && ok) has3d = true;
    var drawn = {}, rot = 0, cur = 0, idleTw = null, idleOn = !SHOT && MOTION, idleStopped = SHOT || !MOTION, proxy, R = 0, shades = lcards.map(function (c) { return $('.lcard__shade', c); });
    var lookPlay = $('[data-look="play"]');
    function front() { return ((Math.round(-rot / 36) % NL) + NL) % NL; }
    function caption(i) {
      var c = lcards[i];
      $('.look__n', liveEl).textContent = '룩 ' + (i + 1) + ' / ' + NL;
      $('.look__t', liveEl).textContent = (i < 5 ? '공용 핏' : '여성 핏') + ', ' + COL[c.dataset.color].ko + ' 색상';
      $$('.look__side').forEach(function (b) { b.classList.toggle('is-on', (b.dataset.fitGo === '0') === (i < 5)); });
      $$('.seg2').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.fitGo === '0') === (i < 5))); });
    }
    var ringScale = 1;
    var pull = 1;
    function ringT() { ring.style.transform = 'translateZ(' + (-R * pull).toFixed(1) + 'px) rotateX(-4deg) rotateY(' + rot.toFixed(2) + 'deg) scale(' + ringScale + ')'; }
    function paint() {
      ringT();
      var f = front();
      for (var i = 0; i < NL; i++) {
        var d = ((i * 36 + rot) % 360 + 540) % 360 - 180;
        shades[i].style.opacity = Math.min(.6, Math.abs(d) / 150).toFixed(3);
      }
      if (f !== cur) { cur = f; caption(cur); upgrade(cur); }
    }
    function setRot(r) { rot = r; G.set(proxy, { x: rot / .28 }); paint(); }
    function stopIdle() { if (idleTw) { idleTw.kill(); idleTw = null; } liveEl.setAttribute('aria-live', 'polite'); }
    function userStop() { if (!idleStopped) { idleStopped = true; idleOn = false; stopIdle(); syncPlay(); } }
    function syncPlay() { lookPlay.setAttribute('aria-pressed', idleOn ? 'false' : 'true'); lookPlay.setAttribute('aria-label', idleOn ? '대기 회전 멈춤' : '대기 회전 재생'); $('use', lookPlay).setAttribute('href', idleOn ? '#i-pause' : '#i-play'); }
    var visible = false;
    function startIdle() {
      if (!idleOn || !visible || D.hidden || idleTw || !has3d) return;
      liveEl.setAttribute('aria-live', 'off');
      var o = { r: rot };
      idleTw = G.to(o, { r: rot - 360, duration: 60, ease: 'none', repeat: -1, onUpdate: function () { setRot(o.r); }, onRepeat: function () { o.r = rot; } });
    }
    function goTo(i, dur) {
      var target = -i * 36, diff = ((target - rot) % 360 + 540) % 360 - 180;
      if (!has3d) {
        var c = lcards[(i + NL) % NL];
        ring.scrollTo({ left: c.offsetLeft - (ring.clientWidth - c.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
        caption((i + NL) % NL); cur = (i + NL) % NL; return;
      }
      var o = { r: rot };
      G.to(o, { r: rot + diff, duration: RM ? .01 : dur || .5, ease: 'power3.inOut', overwrite: true, onUpdate: function () { setRot(o.r); } });
    }
    function interact() { userStop(); }
    if (has3d) {
      H.classList.add('has-3d');
      var layout = function () {
        var cw = lcards[0].getBoundingClientRect().width || 300;
        R = cw / 2 / Math.tan(Math.PI / 10) + 34; pull = W.innerWidth >= 1280 ? .82 : 1;
        lcards.forEach(function (c, i) { c.style.transform = 'rotateY(' + i * 36 + 'deg) translateZ(' + R.toFixed(1) + 'px)'; });
        ringT();
      };
      layout();
      proxy = D.createElement('div');
      W.Draggable.create(proxy, {
        type: 'x', trigger: lookStage, inertia: true, minimumMovement: 6, dragClickables: false,
        onPress: function () { interact(); lookStage.classList.add('is-grab'); },
        onRelease: function () { lookStage.classList.remove('is-grab'); },
        onDrag: function () { rot = this.x * .28; paint(); },
        onThrowUpdate: function () { rot = this.x * .28; paint(); },
        onClick: function (e) {
          var t = e.changedTouches ? e.changedTouches[0] : e, el = D.elementFromPoint(t.clientX, t.clientY), c = el && el.closest && el.closest('.lcard');
          if (c && +c.dataset.i === front()) openQV(c.dataset.p, c.dataset.color, null);
        },
        snap: { x: function (v) { return Math.round(v * .28 / 36) * 36 / .28; } }
      })[0];
      setRot(SHOT ? -8 : 0); caption(0);
      W.addEventListener('resize', debounce(function () { layout(); paint(); }, 150));
      if (!SHOT) {
        // 스크롤로 커서 밑에 들어온 경우가 아니라 실제로 포인터를 움직였을 때만 멈춘다
        lookStage.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) interact(); });
        var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) startIdle(); else stopIdle(); }, { threshold: .25 });
        io.observe(lookStage);
        D.addEventListener('visibilitychange', function () { if (D.hidden) stopIdle(); else startIdle(); });
        // 입장(한 번): 링이 -50°에서 제자리로
        W.ScrollTrigger.create({ trigger: lookStage, start: 'top 80%', once: true, onEnter: function () {
          var e = { k: 0 }, r0 = rot;
          G.to(e, { k: 1, duration: .9, ease: 'power3.out', onUpdate: function () { ringScale = (.92 + .08 * e.k).toFixed(4); rot = r0 - 50 * (1 - e.k); paint(); }, onComplete: function () { ringScale = 1; startIdle(); } });
        } });
      }
    } else {
      var setFromScroll = debounce(function () {
        var mid = ring.scrollLeft + ring.clientWidth / 2, best = 0, bd = 1e9;
        lcards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
        cur = best; caption(best);
      }, 80);
      ring.addEventListener('scroll', setFromScroll, { passive: true });
      caption(0);
    }
    syncPlay();
    lookStage.addEventListener('focusin', interact);
    lookStage.addEventListener('keydown', function (e) {
      if (e.target !== lookStage) return;
      var m = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: 5 }[e.key];
      if (m == null) return;
      e.preventDefault(); interact(); goTo(m, .5);
    });
    $('[data-look="next"]').addEventListener('click', function () { interact(); goTo(cur + 1, .5); });
    $('[data-look="prev"]').addEventListener('click', function () { interact(); goTo(cur - 1, .5); });
    $$('[data-fit-go]').forEach(function (b) { b.addEventListener('click', function () { interact(); goTo(+b.dataset.fitGo, .9); }); });
    lookPlay.addEventListener('click', function () {
      idleOn = !idleOn; idleStopped = !idleOn; syncPlay();
      if (idleOn) startIdle(); else { stopIdle(); goTo(front(), .4); }
    });
    $('[data-look-qv]').addEventListener('click', function () { var c = lcards[cur]; openQV(c.dataset.p, c.dataset.color, null); });
    // 카드 그림: 화면 근처에서 그린다. 휴대폰은 1/2 해상도로 먼저, 앞에 오면 원해상도로.
    function drawCard(i, full) {
      var c = lcards[i], cv = $('canvas', c), k = full || !PHONE() ? 1 : .5;
      if (drawn[i] >= k) return;
      var o = photo(PHOTOS.lookbook[i]);
      if (o) { drawn[i] = 1; putPhoto($('.ph', c), o, '룩 ' + (i + 1) + ', ' + (i < 5 ? '공용 핏' : '여성 핏') + ' ' + COL[c.dataset.color].ko, function () { drawn[i] = 0; drawCard(i, true); }); return; }
      drawn[i] = k; scene(cv, c.dataset.scene, k);
    }
    function upgrade(i) { if (!PHONE()) return; for (var d = -2; d <= 2; d++) { (function (j) { if ((drawn[j] || 0) < 1) enqueue(function () { drawCard(j, true); }); })(((i + d) % NL + NL) % NL); } }
    near(lookStage, function () { lcards.forEach(function (c, i) { enqueue(function () { drawCard(i, Math.abs(i - cur) <= 2 || Math.abs(i - cur) >= NL - 2); }); }); }, '120% 0px');
  })();

  // 아코디언: grid-template-rows 280ms. 퀵뷰 안에서는 한 번에 하나만.
  function accordion(root, single) {
    var btns = $$('.acc__btn', root);
    function set(b, open) { b.setAttribute('aria-expanded', String(open)); var pn = D.getElementById(b.getAttribute('aria-controls')); pn.classList.toggle('is-open', open); pn.inert = !open; }
    btns.forEach(function (b) {
      set(b, b.getAttribute('aria-expanded') === 'true');
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        if (single && open) btns.forEach(function (o) { if (o !== b) set(o, false); });
        set(b, open);
        if (!b.closest('dialog')) setTimeout(refreshSoon, 320);
      });
    });
    return set;
  }
  accordion($('.look .acc'), false);

  /* =====================================================================
     전면 컷
     ===================================================================== */
  var sceneSec = $('#scene'), sceneC = $('canvas', sceneSec);
  function drawFull() {
    var o = photo(PHOTOS.fullBleed);
    if (o) { putPhoto($('.ph', sceneSec), o, '한줌 다운을 입은 모델, 잔불 색상', drawFullCode); return; }
    drawFullCode();
  }
  function drawFullCode() {
    if (!canDraw) return;
    var sd = Math.min(DPR, 1.5), r = sceneC.getBoundingClientRect(), h = Math.round(r.height * sd), w = Math.round(h * 16 / 9);
    if (w < r.width * sd) { w = Math.round(r.width * sd); h = Math.round(w * 9 / 16); }
    if (w > 2400) { h = Math.round(h * 2400 / w); w = 2400; }
    sceneC.width = w; sceneC.height = h;
    SR.scenes.render(sceneC, 'full'); sceneC.parentNode.classList.add('is-drawn');
  }
  near(sceneSec, drawFull, '100% 0px');

  /* =====================================================================
     상품 카드
     ===================================================================== */
  var grid = $('#grid'), cards = $$('.pcard', grid), cardColor = {};
  function cardPhoto(id, color) { var a = PHOTOS.products && PHOTOS.products[id] && PHOTOS.products[id][color]; return Array.isArray(a) ? [photo(a[0]), photo(a[1])] : [null, null]; }
  function drawCard(card, fade) {
    var id = card.dataset.id, p = PI[id], color = cardColor[id], f = $('.pcard__front', card), b = $('.pcard__back', card), ph = $('.ph', card);
    f.setAttribute('aria-label', p.name + ' ' + COL[color].ko + ' 앞');
    $$('img', ph).forEach(function (i) { i.remove(); });
    var ph2 = cardPhoto(id, color);
    if (ph2[0]) { putPhoto(ph, ph2[0], p.name + ' ' + COL[color].ko + ' 앞', function () { drawCard(card); }); return; }
    if (!canDraw) return;
    // 숨겨진 카드(필터로 display:none)는 크기가 0이라 그릴 수 없다: 표시해 두고 다시 보일 때 그린다
    if (!f.offsetWidth) { card.dataset.pending = 1; return; }
    delete card.dataset.pending;
    if (fade && MOTION) {
      var snap = D.createElement('canvas'); snap.width = f.width; snap.height = f.height; snap.getContext('2d').drawImage(f, 0, 0);
      snap.className = 'pcard__snap'; snap.setAttribute('aria-hidden', 'true'); snap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1';
      ph.appendChild(snap); G.to(snap, { opacity: 0, duration: .18, ease: 'power1.out', delay: .02, onComplete: function () { snap.remove(); } });
    }
    jacketTo(f, { model: p.model, color: color, view: 'front', bg: 'studio' });
    b.classList.remove('is-ready');
    if (card.dataset.hov) enqueue(function () { drawBack(card); });
  }
  // 뒷모습은 마우스를 처음 올렸을 때 그린다(터치 기기는 쓰지 않으므로 그리지 않는다)
  function drawBack(card) {
    var id = card.dataset.id, b = $('.pcard__back', card), color = cardColor[id];
    if (!canDraw || !b.offsetWidth || (b.classList.contains('is-ready') && b.dataset.c === color)) return;
    jacketTo(b, { model: PI[id].model, color: color, view: 'back', bg: 'studio' }); b.dataset.c = color; b.classList.add('is-ready');
  }
  if (FINE) cards.forEach(function (card) { $('.pcard__media', card).addEventListener('pointerenter', function () { card.dataset.hov = 1; drawBack(card); }); });
  cards.forEach(function (card) {
    var id = card.dataset.id, p = PI[id];
    cardColor[id] = p.colors[0];
    $$('.dot', card).forEach(function (d) {
      d.addEventListener('click', function () {
        $$('.dot', card).forEach(function (o) { o.classList.toggle('is-on', o === d); o.setAttribute('aria-pressed', String(o === d)); });
        cardColor[id] = d.dataset.color; drawCard(card, true);
      });
    });
    $('.pcard__img', card).addEventListener('click', function () { openQV(id, cardColor[id], $('.pcard__img', card)); });
    $('[data-quick]', card).addEventListener('click', function () { openQV(id, cardColor[id], $('.pcard__img', card), true); });
  });
  near(grid, function () { cards.forEach(function (c) { enqueue(function () { drawCard(c); }); }); }, '120% 0px');

  // 필터(라디오 그룹). 남는 카드는 Flip으로 재배치 0.45초, 빠지는 카드는 0.18초 페이드.
  var segBtns = $$('.seg__b'), segBar = $('.seg__bar'), query = '';
  function segPaint() {
    var on = segBtns.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0];
    segBar.style.setProperty('--sx', on.offsetLeft + 12 + 'px'); segBar.style.setProperty('--sw', on.offsetWidth - 24 + 'px');
  }
  function matches(p) {
    if (query) {
      var hay = [p.name, FIT[p.fit].ko, p.fit === 'women' ? '여성 우먼 women' : '공용 남성 unisex', p.model].concat(p.colors.map(function (c) { return COL[c].ko + ' ' + COL[c].en; })).join(' ').toLowerCase();
      return query.toLowerCase().split(/\s+/).every(function (t) { return hay.indexOf(t) >= 0; });
    }
    return state.filter === 'all' || p.fit === state.filter;
  }
  function applyGrid() {
    var show = cards.filter(function (c) { return matches(PI[c.dataset.id]); });
    var note = $('[data-shop-note]'), msg = $('[data-shop-msg]');
    if (note.hidden === !!query) refreshSoon();
    if (query) {
      note.hidden = false;
      if (!show.length) { msg.textContent = '"' + query + '"에 맞는 상품이 없습니다. 한줌 라인 5종을 모두 보여 드릴게요.'; show = cards.slice(); }
      else msg.textContent = '"' + query + '" 검색 결과 ' + show.length + '개';
    } else note.hidden = true;
    var leaving = cards.filter(function (c) { return show.indexOf(c) < 0 && !c.classList.contains('is-out'); });
    var entering = cards.filter(function (c) { return show.indexOf(c) >= 0 && c.classList.contains('is-out'); });
    if (!leaving.length && !entering.length) return;
    function relayout() {
      var st = MOTION ? W.Flip.getState(cards) : null;
      cards.forEach(function (c) { c.classList.toggle('is-out', show.indexOf(c) < 0); });
      show.forEach(function (c) { if (c.dataset.pending) enqueue(function () { drawCard(c); }, true); });
      refreshSoon();
      if (st) W.Flip.from(st, { duration: .45, ease: 'power3.out', targets: cards, onEnter: function (els) { return G.fromTo(els, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .3, ease: 'power2.out' }); } });
    }
    if (MOTION && leaving.length) G.to(leaving, { opacity: 0, duration: .18, ease: 'power1.out', onComplete: function () { G.set(leaving, { clearProps: 'opacity' }); relayout(); } });
    else relayout();
  }
  function setFilter(f) {
    state.filter = f; save(); query = ''; q.value = '';
    segBtns.forEach(function (b) { var on = b.dataset.f === f; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    segPaint(); applyGrid();
  }
  segBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { setFilter(b.dataset.f); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return; e.preventDefault(); var n = segBtns[(i + d + segBtns.length) % segBtns.length]; setFilter(n.dataset.f); n.focus();
    });
  });
  function applySearch(scroll) {
    query = q.value.trim();
    // 색 이름으로 찾으면 맞은 카드를 그 색으로 바꿔 보여 준다
    var ql = query.toLowerCase();
    if (ql) cards.forEach(function (card) {
      var id = card.dataset.id, hit = PI[id].colors.filter(function (c) { return ql.indexOf(COL[c].ko) >= 0 || ql.indexOf(COL[c].en.toLowerCase()) >= 0; })[0];
      if (hit && hit !== cardColor[id]) { cardColor[id] = hit; $$('.dot', card).forEach(function (o) { var on = o.dataset.color === hit; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', String(on)); }); drawCard(card); }
    });
    segBtns.forEach(function (b) { var on = b.dataset.f === 'all'; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    if (query) state.filter = 'all';
    segPaint(); applyGrid();
    if (scroll && query) { scrolledOnce = true; var t = $('#products').getBoundingClientRect().top + W.scrollY - 48 - 64 - 8; W.scrollTo({ top: t, behavior: RM ? 'auto' : 'smooth' }); }
  }
  $('[data-search-clear]').addEventListener('click', function () { q.value = ''; query = ''; setFilter('all'); });
  setFilter(state.filter);

  /* =====================================================================
     찜(어디서 눌러도 같은 상품의 모든 하트가 동기화)
     ===================================================================== */
  function toggleWish(id, btn) {
    var i = state.wish.indexOf(id), on = i < 0;
    if (on) state.wish.push(id); else state.wish.splice(i, 1);
    save(); syncWish();
    if (on) {
      toast('찜한 상품에 담았습니다', '찜 보기', function () { openDrawer('wish'); });
      if (btn && MOTION) G.fromTo($('svg', btn), { scale: 1 }, { scale: 1.18, duration: .11, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }
  function syncWish() {
    $$('[data-wish]').forEach(function (b) {
      var id = b.dataset.wish; if (!id) return;
      var on = state.wish.indexOf(id) >= 0, p = PI[id];
      b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('heart--qv') || b.closest('.pcard')) b.setAttribute('aria-label', p.name + ' 찜하기');
    });
    var n = state.wish.length;
    $$('[data-wish-count]').forEach(function (c) { c.textContent = n; c.hidden = !n; });
    $$('[data-open="wish"]').forEach(function (b) { if (b.classList.contains('ibtn')) b.setAttribute('aria-label', '찜한 상품 ' + n + '개'); });
    $$('[data-wish-count2],[data-wish-count3]').forEach(function (c) { c.textContent = n; });
    renderWish();
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.heart[data-wish]'); if (b && b.dataset.wish) toggleWish(b.dataset.wish, b); });

  /* =====================================================================
     5.5 퀵뷰
     ===================================================================== */
  var qv = $('#qv'), qPanel = $('.qv__panel', qv), qMedia = $('.qv__media', qv), qInfo = $('.qv__info', qv), qBar = $('.qv__bar', qv), qX = $('.qv__x', qv);
  var qC = $('.qv__c', qv), qC2 = $('.qv__c--b', qv), Qs = { id: null, color: null, size: null, qty: 1, view: 'front', from: null, rec: null };
  var qf = function (k) { return $('[data-q="' + k + '"]', qv); };
  var lastOpener = null;
  var qAccSet = accordion($('.qv__acc', qv), true);
  function qOpts(lx) { var p = PI[Qs.id]; return { model: p.model, color: Qs.color, view: Qs.view, bg: 'studio', light: { x: lx == null ? .25 : lx } }; }
  function qDraw(fade) {
    var p = PI[Qs.id], ph2 = cardPhoto(Qs.id, Qs.color)[Qs.view === 'front' ? 0 : 1];
    qC.setAttribute('aria-label', p.name + ' ' + COL[Qs.color].ko + ' ' + (Qs.view === 'front' ? '앞' : '뒤'));
    $$('img', qv).forEach(function (i) { i.remove(); });
    if (ph2) { putPhoto($('.qv__img', qv), ph2, p.name + ' ' + COL[Qs.color].ko + ' ' + (Qs.view === 'front' ? '앞' : '뒤'), function () { qDraw(); }); return; }
    if (!canDraw || !fit(qC)) return;
    if (fade && qC.width) { fit(qC2); var x2 = qC2.getContext('2d'); x2.clearRect(0, 0, qC2.width, qC2.height); x2.drawImage(qC, 0, 0); qC2.style.opacity = 1; }
    SR.jacket.render(qC, qOpts());
    if (fade) {
      if (MOTION) {
        G.to(qC2, { opacity: 0, duration: .18, ease: 'power1.out' });
        // 광택이 한 번 쓸고 지나간다(광택 층만 다시 합성)
        var o = { lx: -.3 };
        G.to(o, { lx: .3, duration: .3, ease: 'power1.inOut', onUpdate: function () { SR.jacket.relight(qC, qOpts(), o.lx); }, onComplete: function () { SR.jacket.render(qC, qOpts()); } });
      } else { qC2.style.transition = 'opacity 150ms linear'; W.requestAnimationFrame(function () { qC2.style.opacity = 0; }); }
    }
  }
  function qSwatches() {
    var p = PI[Qs.id], box = qf('swatches');
    box.innerHTML = p.colors.map(function (c) {
      var on = c === Qs.color;
      return '<button type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" aria-label="' + COL[c].ko + ' ' + COL[c].en + '" data-c="' + c + '" style="--c:' + COL[c].hex + '"><i></i></button>';
    }).join('');
    qf('colorName').textContent = COL[Qs.color].ko + ' ' + COL[Qs.color].en;
  }
  function qSizes() {
    var p = PI[Qs.id], box = qf('sizes'), list = FIT[p.fit].sizes;
    box.innerHTML = list.map(function (s) {
      var st = stockOf(p.id, Qs.color, s), out = st === 0, on = Qs.size === s, rec = Qs.rec === s;
      return '<button class="chipz' + (rec ? ' has-rec' : '') + '" type="button" role="radio" aria-checked="' + on + '" tabindex="-1"' + (out ? ' aria-disabled="true"' : '') +
        ' aria-label="' + s + (out ? ', 품절' : st < 10 ? ', ' + st + '개 남음' : '') + (rec ? ', 추천' : '') + '" data-s="' + s + '">' + s + (rec ? '<span class="rec" aria-hidden="true">추천</span>' : '') + '</button>';
    }).join('');
    var chips = $$('.chipz', box), focusable = chips.filter(function (c) { return c.getAttribute('aria-checked') === 'true'; })[0] || chips[0];
    focusable.tabIndex = 0;
  }
  function qTable() {
    var f = FIT[PI[Qs.id].fit];
    qf('table').innerHTML = '<caption>' + f.ko + ' 핏 치수(cm)</caption><thead><tr><th scope="col">사이즈</th><th scope="col">가슴 단면</th><th scope="col">총장</th><th scope="col">소매 길이</th></tr></thead><tbody>' +
      f.sizes.map(function (s, i) { return '<tr><th scope="row">' + s + '</th><td>' + f.rows[i].join('</td><td>') + '</td></tr>'; }).join('') + '</tbody>';
  }
  function qMax() { return Qs.size ? Math.min(5, stockOf(Qs.id, Qs.color, Qs.size)) : 5; }
  function qStock(soldTried) {
    var el = qf('stock'), p = PI[Qs.id];
    el.className = 'qv__stock';
    if (soldTried) { el.classList.add('is-out'); el.innerHTML = '품절입니다 <button class="tbtn" type="button" data-restock>재입고 알림 받기</button>'; return; }
    if (!Qs.size) {
      var gone = FIT[p.fit].sizes.filter(function (s) { return stockOf(p.id, Qs.color, s) === 0; });
      el.textContent = '사이즈를 골라 주세요' + (gone.length ? '. 이 색상은 ' + gone.join(', ') + ' 품절입니다' : ''); return;
    }
    var st = stockOf(p.id, Qs.color, Qs.size);
    if (st < 10) { el.classList.add('is-low'); el.textContent = st + '개 남음'; }
    else el.textContent = '재고 있음, 오후 2시 전에 주문하면 오늘 보냅니다';
  }
  function qQty() {
    Qs.qty = Math.max(1, Math.min(qMax(), Qs.qty));
    qf('qty').textContent = Qs.qty; qf('sum').textContent = won(PI[Qs.id].price * Qs.qty);
    $('[data-d="-1"]', qv).disabled = Qs.qty <= 1; $('[data-d="1"]', qv).disabled = Qs.qty >= qMax();
  }
  function qFill() {
    var p = PI[Qs.id], f = FIT[p.fit];
    qf('tag').textContent = p.tag; qf('name').textContent = p.name; qf('desc').textContent = p.desc;
    qf('price').textContent = won(p.price); qf('rev').textContent = '리뷰 ' + p.rev;
    qf('fit').textContent = f.text; qf('model').textContent = f.model;
    qf('mat').textContent = '겉감 나일론 100% (7데니어 립스톱) / 안감 나일론 100% / 충전재 거위 솜털 90%, 깃털 10% / 필파워 850 / 충전량 ' + p.fill + 'g, 전체 ' + p.g + 'g (' + f.ko + ' M 기준)';
    $('.heart--qv', qv).dataset.wish = p.id;
    qf('err').hidden = true; qf('sizes').removeAttribute('aria-describedby');
    $('[data-find-out]', qv).textContent = ''; $('[data-find]', qv).reset();
    $('[data-sg]', qv).setAttribute('aria-expanded', 'false'); $('#sg').hidden = true;
    $$('.qv__acc .acc__btn', qv).forEach(function (b) { qAccSet(b, false); });
    $$('.qv__view button', qv).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === 'front')); });
    qSwatches(); qSizes(); qTable(); qStock(); qQty(); syncWish();
    $('[data-add]', qv).textContent = '장바구니 담기';
    qInfo.scrollTop = 0;
  }
  function openQV(id, color, fromEl, focusSize) {
    var p = PI[id]; if (!p) return;
    lastOpener = D.activeElement;
    Qs.id = id; Qs.color = p.colors.indexOf(color) >= 0 ? color : p.colors[0]; Qs.size = null; Qs.qty = 1; Qs.view = 'front'; Qs.rec = null; Qs.from = fromEl;
    qFill();
    qC2.style.opacity = 0;
    var flipState = null;
    if (MOTION && fromEl) { fromEl.setAttribute('data-flip-id', 'qv'); flipState = W.Flip.getState(fromEl); fromEl.setAttribute('data-flip-id', 'p-' + id); }
    qv.showModal(); H.classList.add('dlg-open');
    qDraw();
    if (MOTION) {
      var mob = PHONE(), rest = [qInfo, qBar, qX];
      G.set([qPanel, qMedia].concat(rest), { clearProps: 'all' });
      if (mob) {
        G.fromTo(qPanel, { yPercent: 100 }, { yPercent: 0, duration: .36, ease: 'power3.out' });
      } else if (flipState) {
        // 카드의 재킷이 그대로 커지며 시트의 자리로 날아간다
        G.fromTo(qPanel, { backgroundColor: 'rgba(255,255,255,0)', boxShadow: '0 32px 80px rgba(0,0,0,0)' }, { backgroundColor: 'rgba(255,255,255,1)', boxShadow: '0 32px 80px rgba(0,0,0,.45)', duration: .3, ease: 'power1.out', clearProps: 'backgroundColor,boxShadow' });
        W.Flip.from(flipState, { targets: qMedia, duration: .5, ease: 'power3.out', scale: true, absolute: false });
        G.fromTo(rest, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: .3, ease: 'power2.out', delay: .12, clearProps: 'opacity,transform' });
      } else {
        G.fromTo(qPanel, { scale: .96, opacity: 0 }, { scale: 1, opacity: 1, duration: .28, ease: 'power2.out', clearProps: 'transform,opacity' });
      }
    }
    var first = focusSize ? $('.chipz[tabindex="0"]', qv) : $('[data-close]', qv);
    (first || qX).focus();
  }
  var closing = false;
  function closeQV(then) {
    if (!qv.open || closing) return;
    var done = function () { closing = false; G && G.set([qPanel, qMedia, qInfo, qBar, qX], { clearProps: 'all' }); qv.close(); H.classList.remove('dlg-open'); if (lastOpener && lastOpener.focus && D.contains(lastOpener)) lastOpener.focus({ preventScroll: true }); if (then) then(); };
    if (!MOTION) return done();
    closing = true;
    var from = Qs.from, r = from && from.getBoundingClientRect(), inView = r && r.bottom > 0 && r.top < innerHeight;
    if (PHONE()) G.to(qPanel, { yPercent: 100, y: 0, duration: .24, ease: 'power2.in', onComplete: done });
    else if (from && inView) {
      G.to([qInfo, qBar, qX], { opacity: 0, duration: .12 });
      G.to(qPanel, { backgroundColor: 'rgba(255,255,255,0)', boxShadow: '0 32px 80px rgba(0,0,0,0)', duration: .2, delay: .08 });
      W.Flip.fit(qMedia, from, { duration: .32, ease: 'power3.inOut', scale: true, onComplete: done });
    } else G.to(qPanel, { scale: .98, opacity: 0, duration: .2, ease: 'power1.in', onComplete: done });
  }
  qv.addEventListener('cancel', function (e) { e.preventDefault(); closeQV(); });
  qv.addEventListener('click', function (e) { if (e.target === qv) closeQV(); });
  $('[data-close]', qv).addEventListener('click', function () { closeQV(); });
  qf('swatches').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) qSetColor(b.dataset.c); });
  qf('swatches').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); var cs = PI[Qs.id].colors, n = cs[(cs.indexOf(Qs.color) + d + cs.length) % cs.length]; qSetColor(n); $('[data-c="' + n + '"]', qv).focus();
  });
  function qSetColor(c) {
    if (c === Qs.color) return;
    // 스와치는 다시 만들지 않고 상태만 바꾼다(포커스와 화살표 키 이동이 끊기지 않게)
    Qs.color = c;
    $$('[data-c]', qv).forEach(function (b) { var on = b.dataset.c === c; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    qf('colorName').textContent = COL[c].ko + ' ' + COL[c].en;
    if (Qs.size && stockOf(Qs.id, c, Qs.size) === 0) Qs.size = null;
    qSizes(); qStock(); qQty(); qDraw(true);
  }
  qf('sizes').addEventListener('click', function (e) { var b = e.target.closest('.chipz'); if (b) qPickSize(b); });
  qf('sizes').addEventListener('keydown', function (e) {
    var chips = $$('.chipz', qv), i = chips.indexOf(D.activeElement);
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d || i < 0) return;
    e.preventDefault(); var n = chips[(i + d + chips.length) % chips.length];
    chips.forEach(function (c) { c.tabIndex = c === n ? 0 : -1; }); n.focus();
    if (n.getAttribute('aria-disabled') !== 'true') qPickSize(n, true);
  });
  function qPickSize(b, keep) {
    if (b.getAttribute('aria-disabled') === 'true') { qStock(true); return; }
    Qs.size = b.dataset.s; qf('err').hidden = true; qf('sizes').removeAttribute('aria-describedby');
    $$('.chipz', qv).forEach(function (c) { var on = c === b; c.setAttribute('aria-checked', String(on)); c.tabIndex = on ? 0 : -1; });
    qStock(); qQty(); if (!keep) b.focus();
  }
  $('[data-q="step"]', qv).addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (!b) return; Qs.qty += +b.dataset.d; qQty(); });
  qv.addEventListener('click', function (e) {
    if (e.target.closest('[data-restock]')) toast('컨셉 시안이라 알림이 실제로 가지는 않습니다.');
    var pk = e.target.closest('[data-pick-size]');
    if (pk) { var c = $('.chipz[data-s="' + pk.dataset.pickSize + '"]', qv); if (c) { c.click(); c.focus(); } pk.remove(); }
    if (e.target.closest('[data-go-guide]')) closeQV(function () { $('#guide').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); });
  });
  $('[data-sg]', qv).addEventListener('click', function () { var b = this, open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); $('#sg').hidden = !open; });
  $('[data-find]', qv).addEventListener('submit', function (e) {
    e.preventDefault();
    var h = parseFloat(this.h.value), w = parseFloat(this.w.value), out = $('[data-find-out]', qv), list = FIT[PI[Qs.id].fit].sizes;
    if (!(h >= 145 && h <= 200 && w >= 38 && w <= 120)) { out.textContent = '입력한 값으로는 추천이 어렵습니다. 치수표의 가슴 단면을 가진 옷과 비교해 보세요.'; Qs.rec = null; qSizes(); return; }
    var hi = h < 163 ? 0 : h < 170 ? 1 : h < 180 ? 2 : h < 186 ? 3 : h < 192 ? 4 : 5, wi = w < 54 ? 0 : w < 62 ? 1 : w < 73 ? 2 : w < 83 ? 3 : w < 93 ? 4 : 5;
    var i = Math.min(list.length - 1, Math.max(hi, wi)), s = list[i], s2 = list[i + 1];
    Qs.rec = s; qSizes();
    out.textContent = s + josa(s, '을', '를') + ' 추천합니다. ' + (s2 ? '안에 두껍게 겹쳐 입으면 ' + s2 + josa(s2, '이', '가') + ' 편합니다.' : '가장 큰 사이즈라, 두껍게 겹쳐 입을 때는 치수표의 가슴 단면을 확인해 주세요.');
    if (stockOf(Qs.id, Qs.color, s) === 0) out.textContent += ' 지금 색상은 ' + s + ' 품절입니다.';
    else if (Qs.size !== s) { var pick = D.createElement('button'); pick.type = 'button'; pick.className = 'tbtn tbtn--ink tbtn--u'; pick.dataset.pickSize = s; pick.textContent = s + (s === 'M' ? '으로' : '로') + ' 고르기'; out.appendChild(D.createTextNode(' ')); out.appendChild(pick); }
  });
  $$('.qv__view button', qv).forEach(function (b) { b.addEventListener('click', function () { qSetView(b.dataset.view); }); });
  function qSetView(v) {
    if (v === Qs.view) return; Qs.view = v;
    $$('.qv__view button', qv).forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.view === v)); });
    qDraw(true);
  }
  // 이미지 면에서 가로로 밀면 앞/뒤
  (function () {
    var sx = null;
    qMedia.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') sx = e.clientX; });
    qMedia.addEventListener('pointerup', function (e) { if (sx != null && Math.abs(e.clientX - sx) > 40) qSetView(Qs.view === 'front' ? 'back' : 'front'); sx = null; });
  })();
  // 포인터를 따라 광택이 움직인다(fine pointer, 30fps 제한)
  if (FINE && canDraw && !RM) {
    var lxT = null, lastT = 0, rafOn = false;
    qMedia.addEventListener('pointermove', function (e) {
      var r = qMedia.getBoundingClientRect(); lxT = G ? G.utils.clamp(-.6, .6, ((e.clientX - r.left) / r.width - .5) * 1.4) : 0;
      if (rafOn) return; rafOn = true;
      W.requestAnimationFrame(function tick(t) {
        if (t - lastT < 33) { W.requestAnimationFrame(tick); return; }
        lastT = t; rafOn = false;
        if (qv.open && Qs.id && !$('img', qv)) SR.jacket.relight(qC, qOpts(), lxT);
      });
    });
  }
  // 모바일 시트: 손잡이를 아래로 80px 이상 끌면 닫힘
  if (ok) {
    W.Draggable.create(qPanel, {
      type: 'y', trigger: $('.qv__grip', qv), bounds: { minY: 0, maxY: 2000 }, edgeResistance: .8,
      onDragEnd: function () { if (this.y > 80) closeQV(); else G.to(qPanel, { y: 0, duration: .3, ease: 'power3.out' }); }
    });
  }
  function needSize() {
    if (Qs.size) return true;
    var err = qf('err'); err.hidden = false; qf('sizes').setAttribute('aria-describedby', 'qv-err');
    var c = $('.chipz[tabindex="0"]', qv) || $('.chipz', qv); c.focus();
    return false;
  }
  var addBtn = $('[data-add]', qv), addTimer;
  addBtn.addEventListener('click', function () {
    if (!needSize()) return;
    var st = stockOf(Qs.id, Qs.color, Qs.size), got = addToCart({ id: Qs.id, color: Qs.color, size: Qs.size, qty: Qs.qty });
    if (!got) { toast(st <= 5 ? '남은 재고 ' + st + '개가 모두 장바구니에 있습니다' : '이 옵션은 한 번에 5개까지 담을 수 있고, 이미 5개가 장바구니에 있습니다', '장바구니 보기', function () { closeQV(function () { openDrawer('cart'); }); }); return; }
    flyToCart();
    addBtn.textContent = '담았습니다'; clearTimeout(addTimer); addTimer = setTimeout(function () { addBtn.textContent = '장바구니 담기'; }, 1600);
    toast(got < Qs.qty ? '남은 수량에 맞춰 ' + got + '개만 더 담았습니다' : '장바구니에 담았습니다', '장바구니 보기', function () { closeQV(function () { openDrawer('cart'); }); });
  });
  $('[data-buy]', qv).addEventListener('click', function () {
    if (!needSize()) return;
    var line = { id: Qs.id, color: Qs.color, size: Qs.size, qty: Qs.qty };
    closeQV(function () { openDrawer('cart', [line]); });
  });
  function flyToCart() {
    var target = headerVisible ? $('[data-cart-icon]') : $('[data-cart-icon-mini]');
    var badges = $$('[data-cart-count]');
    if (!MOTION) return;
    var r0 = qMedia.getBoundingClientRect(), r1 = target.getBoundingClientRect();
    var f = D.createElement('div'); f.className = 'fly'; f.setAttribute('aria-hidden', 'true');
    var c = D.createElement('canvas'); c.width = 96; c.height = 120; f.appendChild(c);
    if (canDraw) SR.jacket.render(c, { model: PI[Qs.id].model, color: Qs.color, view: 'front', bg: 'studio' });
    qv.appendChild(f);
    var x0 = r0.left + r0.width / 2 - 24, y0 = r0.top + r0.height / 2 - 30, x1 = r1.left + r1.width / 2 - 24, y1 = r1.top + r1.height / 2 - 30;
    G.set(f, { x: x0, y: y0 });
    G.to(f, { x: x1, duration: .5, ease: 'power1.in' });
    G.to(f, { keyframes: [{ y: Math.min(y0, y1) - 60, duration: .2, ease: 'power1.out' }, { y: y1, duration: .3, ease: 'power2.in' }], scale: .5 });
    G.to(f, { opacity: 0, duration: .1, delay: .45, onComplete: function () { f.remove(); G.fromTo(badges, { scale: 1 }, { scale: 1.25, duration: .11, yoyo: true, repeat: 1, ease: 'power2.out' }); } });
  }

  /* =====================================================================
     장바구니 서랍
     ===================================================================== */
  var dr = $('#drawer'), drPanel = $('.dr__panel', dr), drTabs = $$('.dr__tab', dr), paneCart = $('#pane-cart'), paneWish = $('#pane-wish'), orderView = $('[data-orderview]', dr);
  var drOpener = null, lastRemoved = null, thumbs = {};
  function priceOf(l) { return PI[l.id] ? PI[l.id].price : ADD[l.id].price; }
  function totals(lines) {
    var sub = lines.reduce(function (s, l) { return s + priceOf(l) * l.qty; }, 0);
    var ship = sub === 0 || sub >= 70000 ? 0 : 3500, disc = state.coupon && sub >= 100000 ? 7000 : 0;
    return { sub: sub, ship: ship, disc: disc, pay: sub + ship - disc };
  }
  function addToCart(l) {
    var m = state.cart.filter(function (o) { return o.id === l.id && o.color === l.color && o.size === l.size; })[0];
    var cap = PI[l.id] ? Math.min(5, stockOf(l.id, l.color, l.size)) : 5;
    var had = m ? m.qty : 0;
    if (m) m.qty = Math.min(cap, m.qty + l.qty); else state.cart.push({ id: l.id, color: l.color || null, size: l.size || null, qty: Math.min(cap, l.qty) });
    save(); renderCart();
    return (m ? m.qty : Math.min(cap, l.qty)) - had;
  }
  function thumb(id, color) {
    var p = PI[id];
    if (!p) {
      var svg = $('[data-addon="' + id + '"]').parentNode.querySelector('svg').cloneNode(true); return svg;
    }
    var c = D.createElement('canvas'); c.width = 128; c.height = 160; c.setAttribute('aria-hidden', 'true');
    var k = id + color;
    if (canDraw) { if (!thumbs[k]) { thumbs[k] = D.createElement('canvas'); thumbs[k].width = 128; thumbs[k].height = 160; SR.jacket.render(thumbs[k], { model: p.model, color: color, view: 'front', bg: 'studio' }); } c.getContext('2d').drawImage(thumbs[k], 0, 0); }
    return c;
  }
  function stepper(i, l) {
    var max = PI[l.id] ? Math.min(5, stockOf(l.id, l.color, l.size)) : 5;
    return '<div class="step"><button type="button" aria-label="수량 줄이기" data-qty="-1" data-i="' + i + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-minus"/></svg></button>' +
      '<output aria-live="polite">' + l.qty + '</output><button type="button" aria-label="수량 늘리기" data-qty="1" data-i="' + i + '"' + (l.qty >= max ? ' disabled' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-plus"/></svg></button></div>';
  }
  function lineName(l) { return PI[l.id] ? PI[l.id].name : ADD[l.id].name; }
  function lineOpt(l) { return PI[l.id] ? COL[l.color].ko + ' / ' + l.size : '기본'; }
  function renderCart(keepFocus) {
    var lines = state.cart, n = lines.reduce(function (s, l) { return s + l.qty; }, 0), t = totals(lines);
    $$('[data-cart-count]').forEach(function (c) { c.textContent = n; c.hidden = !n; });
    $$('[data-open="cart"]').forEach(function (b) { b.setAttribute('aria-label', '장바구니 ' + n + '개'); });
    $('[data-cart-count2]').textContent = n;
    var ul = $('[data-lines]', dr);
    var focusSel = keepFocus && D.activeElement && D.activeElement.dataset && D.activeElement.dataset.qty ? '[data-i="' + D.activeElement.dataset.i + '"][data-qty="' + D.activeElement.dataset.qty + '"]' : null;
    ul.innerHTML = '';
    lines.forEach(function (l, i) {
      var li = D.createElement('li'); li.className = 'line';
      li.innerHTML = '<div class="line__img"></div><div><div class="line__top"><div><p class="line__n">' + lineName(l) + '</p><p class="line__o">' + lineOpt(l) + '</p></div></div>' +
        '<div class="line__bot">' + stepper(i, l) + '<div class="line__acts"><span class="line__p" data-v="' + priceOf(l) * l.qty + '">' + won(priceOf(l) * l.qty) + '</span><button class="tbtn" type="button" data-del="' + i + '">삭제</button></div></div></div>';
      $('.line__img', li).appendChild(thumb(l.id, l.color));
      ul.appendChild(li);
    });
    if (focusSel) { var f = $(focusSel, ul); if (f && f.disabled) f = f.parentNode.querySelector('button:not([disabled])'); if (f) f.focus(); }
    var empty = !lines.length;
    $('[data-empty]', dr).hidden = !empty; $('[data-ship]', dr).hidden = empty; $('[data-tot]', dr).hidden = empty;
    if (empty) { var ep = $('.empty__pack', dr); if (canDraw && !ep.dataset.d) { ep.width = 304; ep.height = 176; SR.jacket.renderPack(ep, 'dawn'); ep.dataset.d = 1; } }
    // 진행 막대: 0~7만 원이 앞 40%, 7만~60만 원이 뒤 60%
    var sub = t.sub, fill = sub < 70000 ? sub / 70000 * .4 : .4 + Math.min(1, (sub - 70000) / 530000) * .6;
    $('[data-ship-fill]', dr).style.transform = 'scaleX(' + fill.toFixed(4) + ')';
    $$('[data-tick]', dr).forEach(function (k, i) { k.classList.toggle('is-on', i ? sub >= 600000 : sub >= 70000); });
    $('[data-ship-msg]', dr).innerHTML = sub < 70000 ? '<b>' + won(70000 - sub) + '</b>만 더 담으면 배송비가 무료입니다' : sub < 600000 ? '무료로 보내 드립니다. <b>' + won(600000 - sub) + '</b>을 더 담으면 압축 수납 색을 드립니다' : '무료 배송에 압축 수납 색까지 함께 보냅니다';
    roll($('[data-t="sub"]', dr), t.sub);
    var sEl = $('[data-t="ship"]', dr); if (t.ship) roll(sEl, t.ship); else { sEl.textContent = '무료'; sEl.dataset.v = 0; }
    var cRow = $('[data-t-coupon]', dr), cEl = $('[data-t="coupon"]', dr);
    cRow.hidden = !state.coupon;
    if (t.disc) { cEl.classList.remove('is-muted'); cEl.textContent = won(-t.disc); } else { cEl.classList.add('is-muted'); cEl.textContent = '10만 원 이상 구매 시 적용'; }
    roll($('[data-t="pay"]', dr), t.pay);
  }
  function renderWish() {
    var ul = $('[data-wishes]', dr); ul.innerHTML = '';
    state.wish.forEach(function (id) {
      var p = PI[id], li = D.createElement('li'); li.className = 'line';
      li.innerHTML = '<div class="line__img"></div><div><p class="line__n">' + p.name + '</p><p class="line__o">' + p.desc + '</p><div class="line__bot"><span class="line__p">' + won(p.price) + '</span><div class="line__acts"><button class="tbtn" type="button" data-pick="' + id + '">옵션 고르기</button>' +
        '<button class="heart" type="button" style="position:static" aria-pressed="true" aria-label="' + p.name + ' 찜하기" data-wish="' + id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-heart"/></svg></button></div></div></div>';
      $('.line__img', li).appendChild(thumb(id, p.colors[0]));
      ul.appendChild(li);
    });
    $('[data-wish-empty]', dr).hidden = !!state.wish.length;
  }
  dr.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (e.target === dr) return closeDrawer();
    if (!b) return;
    if (b.dataset.qty) {
      var i = +b.dataset.i, l = state.cart[i], d = +b.dataset.qty;
      if (d < 0 && l.qty <= 1) return removeLine(i);
      l.qty = Math.max(1, Math.min(5, l.qty + d)); save(); renderCart(true);
    } else if (b.dataset.del != null) removeLine(+b.dataset.del);
    else if (b.dataset.addon) { var ad = ADD[b.dataset.addon]; toast(addToCart({ id: b.dataset.addon, qty: 1 }) ? ad.name + ad.o + ' 담았습니다' : ad.name + ad.o + ' 이미 5개 담았습니다. 한 번에 5개까지 주문할 수 있습니다'); }
    else if (b.dataset.pick) { var id = b.dataset.pick; closeDrawer(function () { openQV(id, PI[id].colors[0], null); }); }
    else if (b.hasAttribute('data-order')) showOrder(state.cart);
    else if (b.hasAttribute('data-back-cart')) showCart();
    else if (b.hasAttribute('data-go-products')) closeDrawer(function () { $('#products').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); });
  });
  function removeLine(i) {
    lastRemoved = { line: state.cart[i], at: i };
    state.cart.splice(i, 1); save(); renderCart();
    var f = $('[data-qty="-1"]', dr) || $('[data-go-products]', dr) || $('[data-close]', dr); if (f) f.focus();
    toast('장바구니에서 뺐습니다', '되돌리기', function () { if (!lastRemoved) return; state.cart.splice(lastRemoved.at, 0, lastRemoved.line); lastRemoved = null; save(); renderCart(); }, 5000);
  }
  function setDrTab(k, focus) {
    drTabs.forEach(function (t) { var on = (t.id === 'tab-' + k); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    paneCart.hidden = k !== 'cart'; paneWish.hidden = k !== 'wish'; orderView.hidden = true;
  }
  drTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setDrTab(t.id.slice(4)); });
    t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setDrTab(drTabs[(i + 1) % 2].id.slice(4), true); } });
  });
  function slideView(show, hide, dir) {
    hide.hidden = true; show.hidden = false;
    if (MOTION) G.fromTo(show, { x: dir * 40, opacity: 0 }, { x: 0, opacity: 1, duration: .28, ease: 'power3.out', clearProps: 'transform,opacity' });
  }
  function showOrder(lines) {
    var t = totals(lines);
    $('[data-order-list]', dr).innerHTML = lines.map(function (l) { return '<li><span>' + lineName(l) + ' (' + lineOpt(l) + ') × ' + l.qty + '</span><span>' + won(priceOf(l) * l.qty) + '</span></li>'; }).join('');
    $('[data-order-tot]', dr).innerHTML = '<div><dt>상품 금액</dt><dd>' + won(t.sub) + '</dd></div><div><dt>배송비</dt><dd>' + (t.ship ? won(t.ship) : '무료') + '</dd></div>' +
      (state.coupon ? '<div><dt>쿠폰 할인</dt><dd' + (t.disc ? '>' + won(-t.disc) : ' class="is-muted">10만 원 이상 구매 시 적용') + '</dd></div>' : '') + '<div class="tot__pay"><dt>결제할 금액</dt><dd>' + won(t.pay) + '</dd></div>';
    slideView(orderView, paneCart, 1); paneWish.hidden = true;
    $('.order__h', dr).tabIndex = -1; $('.order__h', dr).focus();
  }
  function showCart() { setDrTab('cart'); slideView(paneCart, orderView, -1); var f = $('#tab-cart'); f.focus(); }
  function openDrawer(tab, buyNow) {
    if (qv.open) { return closeQV(function () { openDrawer(tab, buyNow); }); }
    if (menu.open) menu.close();
    drOpener = D.activeElement;
    renderCart(); renderWish(); setDrTab(tab || 'cart');
    dr.showModal(); H.classList.add('dlg-open');
    if (MOTION) G.fromTo(drPanel, { xPercent: 100 }, { xPercent: 0, duration: .34, ease: 'power3.out', clearProps: 'transform' });
    if (buyNow) showOrder(buyNow); else $('#tab-' + (tab || 'cart')).focus();
  }
  var drClosing = false;
  function closeDrawer(then) {
    if (!dr.open || drClosing) return;
    var done = function () { drClosing = false; dr.close(); H.classList.remove('dlg-open'); if (toastEl.parentNode === dr) D.body.appendChild(toastEl); if (then) then(); else if (drOpener && D.contains(drOpener)) drOpener.focus({ preventScroll: true }); };
    if (!MOTION) return done();
    drClosing = true; G.to(drPanel, { xPercent: 100, duration: .24, ease: 'power2.in', onComplete: function () { G.set(drPanel, { clearProps: 'transform' }); done(); } });
  }
  dr.addEventListener('cancel', function (e) { e.preventDefault(); closeDrawer(); });
  $('[data-close]', dr).addEventListener('click', function () { closeDrawer(); });
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b.dataset.open); }); });
  qv.addEventListener('close', function () { if (toastEl.parentNode === qv) D.body.appendChild(toastEl); });

  /* 푸터 정책 링크 */
  $$('[data-policy]').forEach(function (b) { b.addEventListener('click', function () { var m = $('[data-policy-msg]'); m.textContent = ''; setTimeout(function () { m.textContent = b.dataset.policy === 'biz' ? '컨셉 시안이라 공정거래위원회 사업자정보 조회로 연결되지 않습니다.' : '컨셉 시안이라 이 문서는 준비되어 있지 않습니다.'; }, 40); }); });

  // 높이가 바뀐 뒤 트리거 위치를 다시 잰다. 스크롤 중이면 끝날 때까지 미룬다(부드러운 스크롤을 끊지 않게).
  var lastScroll = 0, rTimer;
  W.addEventListener('scroll', function () { lastScroll = Date.now(); }, { passive: true });
  function refreshSoon() {
    if (!ok) return;
    clearTimeout(rTimer);
    rTimer = setTimeout(function wait() { if (Date.now() - lastScroll < 180) { rTimer = setTimeout(wait, 120); return; } W.ScrollTrigger.refresh(); }, 220);
  }
  function debounce(f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; }

  renderCart(); syncWish();

  /* =====================================================================
     모션(matchMedia 분기). 숨김 시작 상태는 여기서만 만든다.
     ===================================================================== */
  var logoIntro = null;
  var fontsReady = new Promise(function (res) { if (D.fonts && D.fonts.ready) D.fonts.ready.then(res); setTimeout(res, 800); });
  if (MOTION && !SHOT) {
    // 로고타입 1행: wdth 62 → 125 (0.9초)
    logoIntro = G.fromTo('.hero .logotype__1', { fontVariationSettings: '"wdth" 62', fontStretch: '62%' }, { fontVariationSettings: '"wdth" 125', fontStretch: '125%', duration: .9, ease: 'power3.out', paused: true, onComplete: function () { H.classList.add('intro-done'); } });
  }
  fontsReady.then(function () {
    fitLogotypes(); fitBig(); segPaint(); setTab(curTab);
    // 핀(도해) 아래 트리거가 핀 간격을 포함해 계산되도록 페이지 순서로 정렬한 뒤 다시 잰다
    if (ok) { W.ScrollTrigger.sort(); W.ScrollTrigger.refresh(); }
  });
  W.addEventListener('resize', debounce(function () { fitLogotypes(); fitBig(); segPaint(); setTab(curTab); }, 150));

  if (!ok) { applyBig(1); return; }
  var mm = G.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', desk: '(min-width: 1024px)', wide: '(min-width: 768px)' }, function (ctx) {
    var c = ctx.conditions;
    if (!c.motion || SHOT) { applyBig(1); jk.classList.add('is-open'); return; }
    /* 5.3 큰 글자 스크럽 */
    H.classList.add('big-anim');
    var bp = { p: 0 }; applyBig(0);
    G.to(bp, { p: 1, ease: 'none', scrollTrigger: { trigger: big, start: 'top 90%', end: 'top 40%', scrub: .5 }, onUpdate: function () { applyBig(bp.p); } });
    /* 전면 컷 6% 시차(데스크톱만) */
    if (c.wide) G.fromTo('.scene__media .ph', { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: '#scene', start: 'top bottom', end: 'bottom top', scrub: true } });
    /* 5.2 도해 */
    var parts = {}; $$('.part', jk).forEach(function (pt) { parts[pt.dataset.part] = pt; });
    var cos = $$('.lines__co path'), ends = $$('.lines__end circle'), sweeps = $$('.lines__sweep path'), split = $('.lines__split'), cut = $('.cut', jk);
    if (c.desk) {
      var labels = coItems, pdots = $$('.pdots i'), mk = marks.slice().sort(function (a, b) { return a.dataset.mk - b.dataset.mk; });
      var box = $('.stage__box'), sw = box.getBoundingClientRect().width || 1100;
      // 오른소매 마커의 이동량(설계 좌표 → 무대 viewBox): 평행 이동 64px = 80, 4° 회전 = -25.4
      var d3 = 80 - 25.4, len3 = (1130 - 1063) + 72.2 * Math.SQRT2 + (1220 - 1202.2), off3 = (d3 / len3 * 100).toFixed(2);
      G.set(cos, { drawSVG: '0% 0%' }); G.set(ends, { opacity: 0 }); G.set(labels, { opacity: 0, y: 8 }); G.set(mk, { opacity: 0, scale: .9 });
      G.set(sweeps, { drawSVG: '0% 0%', opacity: 1 }); G.set(split, { opacity: 0 }); G.set('.feats li', { opacity: 0, y: 8 }); G.set('.chips', { opacity: 0 });
      G.set(cut, { clipPath: 'inset(50% round 10%)' });
      var pk = $('.co__pack'), pr = pk.getBoundingClientRect(), br = box.getBoundingClientRect();
      var pkx = br.left + br.width * 681.6 / 1600 - (pr.left + pr.width / 2), pky = br.top + br.height * .572 - (pr.top + pr.height / 2);
      var lt = { lx: -.4 }, relit = function () { ['body', 'sleeveL', 'sleeveR', 'hood'].forEach(function (k) { var cv = $('canvas', parts[k]); if (cv.width > 2) SR.jacket.relight(cv, { model: 'hoody', color: 'ember', view: 'front', pose: 'flat', parts: [k], bg: 'none' }, lt.lx); }); };
      var dotOn = function (i) { pdots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); }); };
      var tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        trigger: tech, start: 'top 48px', end: '+=250%', pin: true, scrub: .6, anticipatePin: 1, refreshPriority: 1,
        onToggle: function (s) { tech.classList.toggle('is-pinned', s.isActive); },
        onUpdate: function (s) { var p = s.progress; dotOn(p < .24 ? 0 : p < .48 ? 1 : p < .6 ? 2 : p < .7 ? 3 : 4); }
      } });
      tl.to(lt, { lx: .4, duration: .08, onUpdate: function () { if (canDraw && jk.classList.contains('is-drawn')) relit(); } }, 0);
      var reveal = function (i, at, len) {
        tl.to(cos[i], { drawSVG: (i === 3 ? '0% 100%' : '0% 100%'), duration: len }, at)
          .to(mk[i], { opacity: 1, scale: 1, duration: .02 }, at)
          .to(ends[i], { opacity: 1, duration: .01 }, at + len)
          .to(labels[i], { opacity: 1, y: 0, duration: .04 }, at + len - .01);
      };
      // 빈 스크롤을 줄이려고 호출 1을 빛 훑기와 겹쳐 앞당긴다
      reveal(0, .04, .14);
      tl.fromTo(pk, { x: pkx, y: pky, scale: .4, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: .12, ease: 'power2.out' }, .1);
      reveal(1, .24, .1);
      sweeps.forEach(function (s, i) { tl.fromTo(s, { drawSVG: '0% 0%' }, { drawSVG: '0% 12%', duration: .02 }, .32 + i * .02).to(s, { drawSVG: '88% 100%', duration: .06 }, .34 + i * .02).to(s, { drawSVG: '100% 100%', duration: .02 }, .4 + i * .02); });
      // 벌어짐: 소매 ±64, ±4°, 후드 위로 52, 몸판 0.98. 나눈 패널 점선과 호출 3, 4.
      var k = sw / 1280;
      tl.to(parts.sleeveL, { x: -64 * k, rotation: -4, duration: .1, ease: 'power2.inOut' }, .48)
        .to(parts.sleeveR, { x: 64 * k, rotation: 4, duration: .1, ease: 'power2.inOut' }, .48)
        .to(parts.hood, { y: -52 * k, duration: .1, ease: 'power2.inOut' }, .48)
        .to(parts.body, { scale: .98, duration: .1, ease: 'power2.inOut' }, .48)
        .to(split, { opacity: .9, duration: .04 }, .54);
      reveal(2, .56, .07);
      tl.set(cos[3], { drawSVG: off3 + '% ' + off3 + '%', y: 6.3 }, .6);
      tl.to(cos[3], { drawSVG: off3 + '% 100%', duration: .07 }, .6).to(mk[3], { opacity: 1, scale: 1, duration: .02 }, .6).to(ends[3], { opacity: 1, y: 6.3, duration: .01 }, .67).to(labels[3], { opacity: 1, y: 0, duration: .04 }, .66);
      // 절개 창
      tl.to(cut, { clipPath: 'inset(0% round 10%)', duration: .06, ease: 'power2.out' }, .7)
        .to($('.cut__s', jk), { x: -12 * k, y: -12 * k, duration: .06 }, .72)
        .to($('.cut__l', jk), { x: 12 * k, y: 12 * k, duration: .06 }, .72)
        .to('.chips', { opacity: 1, duration: .04 }, .74)
        .call(countUp, null, .76);
      reveal(4, .74, .08);
      // 다시 모인다 + 아이콘 행
      tl.to([parts.sleeveL, parts.sleeveR, parts.hood, parts.body], { x: 0, y: 0, rotation: 0, scale: 1, duration: .08, ease: 'power2.inOut' }, .88)
        .to(split, { opacity: 0, duration: .04 }, .88)
        .to(cos[3], { drawSVG: '0% 100%', y: 0, duration: .08, ease: 'power2.inOut' }, .88).to(ends[3], { y: 0, duration: .08 }, .88)
        .to('.feats li', { opacity: 1, y: 0, duration: .03, stagger: .02 }, .9)
        .to({}, { duration: .02 }, .98);
      // 빛 훑기가 끝난 뒤에는 마우스 x가 빛의 방향이 된다(fine pointer, 30fps 제한)
      var stageEl = $('.stage'), ptrLx = 0, ptrRaf = 0, ptrLast = 0;
      var ptrTick = function (t) {
        if (t - ptrLast < 33) { ptrRaf = W.requestAnimationFrame(ptrTick); return; }
        ptrRaf = 0; ptrLast = t; lt.lx = ptrLx; relit();
      };
      var onPtr = function (e) {
        if (!canDraw || !jk.classList.contains('is-drawn') || !tl.scrollTrigger || tl.scrollTrigger.progress < .1 || !tech.classList.contains('is-pinned')) return;
        var r = stageEl.getBoundingClientRect(); ptrLx = Math.round(G.utils.clamp(-.6, .6, ((e.clientX - r.left) / r.width - .5) * 1.6) * 20) / 20;
        if (ptrLx !== lt.lx && !ptrRaf) ptrRaf = W.requestAnimationFrame(ptrTick);
      };
      if (FINE) stageEl.addEventListener('pointermove', onPtr);
      return function () { tech.classList.remove('is-pinned'); stageEl.removeEventListener('pointermove', onPtr); if (ptrRaf) W.cancelAnimationFrame(ptrRaf); };
    }
    // 모바일·태블릿: pin 없음. 목록 줄이 가운데 오면 그 마커가 잔불로, 나눈 패널은 한 번 벌어짐, 솜털 줄에서 절개 창.
    G.set($$('.mk__tail path', jk), { drawSVG: '0% 0%' });
    W.ScrollTrigger.create({ trigger: jk, start: 'top 70%', once: true, onEnter: function () { G.to($$('.mk__tail path', jk), { drawSVG: '0% 100%', duration: .5, stagger: .06, ease: 'power2.out' }); } });
    var did = {};
    coItems.forEach(function (li, i) {
      W.ScrollTrigger.create({ trigger: li, start: 'top 70%', end: 'bottom 70%',
        onToggle: function (s) {
          marks.forEach(function (m) { if (+m.dataset.mk === i) m.classList.toggle('is-on', s.isActive); });
          if (!s.isActive || did[i]) return;
          if (i === 2) { did[i] = 1; G.timeline().to(parts.sleeveL, { x: -16, rotation: -2, duration: .6, ease: 'power2.inOut' }, 0).to(parts.sleeveR, { x: 16, rotation: 2, duration: .6, ease: 'power2.inOut' }, 0).to(parts.hood, { y: -13, duration: .6, ease: 'power2.inOut' }, 0).to([parts.sleeveL, parts.sleeveR, parts.hood], { x: 0, y: 0, rotation: 0, duration: .6, ease: 'power2.inOut' }, 1.1); }
          if (i === 4) { did[i] = 1; G.fromTo(cut, { clipPath: 'inset(50% round 10%)' }, { clipPath: 'inset(0% round 10%)', duration: .6, ease: 'power2.out' }); }
          if (i === 4) countUp();
        } });
    });
    return function () { G.set($$('.mk__tail path', jk), { clearProps: 'all' }); };
  });
  W.ScrollTrigger.sort(); W.ScrollTrigger.refresh();
  stripApi.start();
})();
