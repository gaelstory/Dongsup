/* 틈 TEUM — page behaviour. The WebGL bottle lives in scene.js and reads window.TEUM.state each frame. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var isShot = /[?&]shot=1/.test(location.search);
  if (isShot) root.classList.add('is-shot');

  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqWide = matchMedia('(min-width: 900px)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var PEARL = hex('#E8E6E2'), GRAPHITE = hex('#171717');
  var SCENTS = [
    { no: 'No.1', name: '무화과', line: '한낮, 반으로 가른 무화과', hex: '#7A4868', tint: 0.3,
      notes: ['무화과 잎, 베르가못', '무화과 과육, 코코넛 밀크', '시더우드, 머스크'] },
    { no: 'No.2', name: '유자', line: '겨울 부엌, 유자를 써는 손', hex: '#E8C23A', tint: 0.36,
      notes: ['유자 껍질, 생강', '유자 꽃, 덖은 녹차', '편백, 화이트 앰버'] },
    { no: 'No.3', name: '이끼', line: '비 갠 숲의 돌담', hex: '#5C7A4A', tint: 0.3,
      notes: ['젖은 흙, 갈바넘', '이끼, 제비꽃 잎', '베티버, 참나무 이끼'] },
    { no: 'No.4', name: '비', line: '창을 열어 둔 장마 첫날', hex: '#6C8EB4', tint: 0.32,
      notes: ['빗방울, 배 껍질', '젖은 면, 은방울꽃', '화이트 머스크, 마른 나무'] }
  ];
  SCENTS.forEach(function (s) {
    s.rgb = hex(s.hex);
    s.bg = mixc(PEARL, s.rgb, s.tint);
    // tone-on-tone ink for the big 틈 glyph behind the bottle: darker than the tint, far lighter than text
    s.ink = mixc(s.bg, mixc(s.rgb, GRAPHITE, 0.25), 0.55);
  });
  var PRICE = 128000;

  var TEUM = window.TEUM = window.TEUM || {};
  TEUM.scents = SCENTS;
  TEUM.isShot = isShot;
  TEUM.reduced = function () { return mqReduce.matches; };
  TEUM.wide = function () { return mqWide.matches; };
  TEUM.selected = 0;
  TEUM.spinPaused = false;

  var st = TEUM.state = {
    bg: PEARL.slice(), ink: GRAPHITE.slice(), liquid: SCENTS[0].rgb.slice(),
    x: 0, turns: 0, heroW: 1, labelIdx: 0, glyph: 1, spin: 0, sp: -1
  };
  var heroLiquid = SCENTS[0].rgb.slice(), heroLiquidShown = heroLiquid;
  var heroLabel = 0;
  var spinFrom = 0;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var stage = $('#stage'), header = $('#top'), hero = $('.hero');
  var panels = $$('.scent');
  var horizon = $('#poster-line');
  var announcer = $('#announcer');
  function announce(t) { announcer.textContent = ''; setTimeout(function () { announcer.textContent = t; }, 30); }

  /* ---------- stage: scroll position -> scent position ---------- */
  var anchors = [], refOffset = 0, stageBottom = 0, rawSp = -1, smSp = -1;
  function measure() {
    var vh = innerHeight, y = scrollY;
    refOffset = vh * (mqWide.matches ? 0.5 : 0.74);
    anchors = [refOffset];
    panels.forEach(function (p) {
      var t = mqWide.matches ? p : $('.scent__text', p);
      var r = t.getBoundingClientRect();
      anchors.push(r.top + y + r.height / 2);
    });
    var sr = stage.getBoundingClientRect();
    stageBottom = sr.bottom + y;
    readScroll();
    smSp = rawSp;
    wake();
  }
  function readScroll() {
    var line = scrollY + refOffset, a = anchors;
    if (!a.length) return;
    if (line <= a[0]) rawSp = -1;
    else if (line >= a[a.length - 1]) rawSp = a.length - 2;
    else {
      for (var i = 0; i < a.length - 1; i++) {
        if (line < a[i + 1]) { rawSp = i - 1 + (line - a[i]) / (a[i + 1] - a[i]); break; }
      }
    }
    var solid = scrollY > 8;
    header.classList.toggle('is-solid', solid);
    var past = scrollY + 60 > stageBottom;
    if (past !== header._past) {
      header._past = past;
      if (past) header.style.setProperty('--stage-bg', '#FAFAF8');
    }
  }

  function stateOf(k) {
    if (k < 0) return { bg: PEARL, ink: GRAPHITE, liquid: heroLiquidShown, x: 0, glyph: 1, label: heroLabel };
    return { bg: SCENTS[k].bg, ink: SCENTS[k].ink, liquid: SCENTS[k].rgb, x: k % 2 === 0 ? 1 : -1, glyph: 0, label: k };
  }

  var last = 0, running = false, settleFrames = 0;
  function frame(now) {
    var dt = Math.min(0.25, last ? (now - last) / 1000 : 0.016);
    last = now;
    var reduce = mqReduce.matches;
    smSp += (rawSp - smSp) * (reduce || isShot ? 1 : 1 - Math.exp(-dt * 7));
    if (Math.abs(rawSp - smSp) < 0.0004) smSp = rawSp;

    // hero liquid eases toward the picked scent
    var tgt = SCENTS[TEUM.selected].rgb, k = 1 - Math.exp(-dt * 4.2), moving = false;
    for (var c = 0; c < 3; c++) {
      var d = tgt[c] - heroLiquid[c];
      if (Math.abs(d) > 0.002) moving = true;
      heroLiquid[c] += reduce ? d : d * k;
    }
    heroLabel = st.spin - spinFrom < 0.5 && spinPending ? spinOld : TEUM.selected;
    var sc = spinPending ? Math.sin(Math.PI * clamp(st.spin - spinFrom, 0, 1)) * 0.62 : 0;
    heroLiquidShown = sc > 0 ? mixc(heroLiquid, [0.97, 0.96, 0.94], sc) : heroLiquid;

    var s = clamp(smSp, -1, 3);
    var i = Math.min(Math.floor(s), 2), f = s - i;
    var e = smooth(0.16, 0.84, f);
    var A = stateOf(i), B = stateOf(i + 1);
    st.sp = s;
    st.bg = mixc(A.bg, B.bg, e);
    st.ink = mixc(A.ink, B.ink, e);
    st.liquid = mixc(A.liquid, B.liquid, e);
    // mid-turn the liquid clears toward light, so one scent hands over to the next without passing through mud
    var clear = Math.sin(Math.PI * e) * (A.label === B.label ? 0 : 0.62);
    if (clear > 0) st.liquid = mixc(st.liquid, [0.97, 0.96, 0.94], clear);
    st.x = mqWide.matches && !reduce ? A.x + (B.x - A.x) * e : 0;
    st.glyph = A.glyph + (B.glyph - A.glyph) * e;
    st.turns = reduce ? 0 : (i + 1) + e;
    st.heroW = i < 0 ? 1 - e : 0;
    st.labelIdx = e < 0.5 ? A.label : B.label;
    st.pass = i < 0 ? e : 1;

    var bgc = css(st.bg);
    stage.style.setProperty('--stage-bg', bgc);
    stage.style.setProperty('--scent-hero', css(st.liquid));
    if (!header._past) header.style.setProperty('--stage-bg', bgc);
    if (horizon) horizon.style.opacity = String(clamp(1 - st.pass * 1.8, 0, 1));
    stage.style.setProperty('--poster-ink', css(st.ink));

    if (moving || smSp !== rawSp || spinPending) settleFrames = 0; else settleFrames++;
    if (settleFrames > 4) { running = false; last = 0; return; }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; settleFrames = 0; requestAnimationFrame(frame); } }
  TEUM.wake = wake;

  /* ---------- hero scent swatches ---------- */
  var swatches = $$('.swatch');
  var heroNow = $('#hero-now');
  var spinPending = false, spinOld = 0, spinTween = null;
  function select(idx, opts) {
    opts = opts || {};
    if (idx === TEUM.selected) return;
    spinOld = TEUM.selected;
    TEUM.selected = idx;
    swatches.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.scent === idx)); });
    heroNow.innerHTML = '<span class="num">' + SCENTS[idx].no + '</span> ' + SCENTS[idx].name + ' <span class="num">50 ml</span>';
    if (window.gsap && !mqReduce.matches && !isShot) {
      if (spinTween) spinTween.progress(1);
      spinFrom = Math.round(st.spin);
      spinPending = true;
      spinTween = gsap.to(st, { spin: spinFrom + 1, duration: 1.4, ease: 'power3.inOut', onUpdate: wake,
        onComplete: function () { spinPending = false; wake(); } });
    } else {
      spinPending = false;
    }
    wake();
    if (window.TEUM_SCENE && TEUM_SCENE.kick) TEUM_SCENE.kick();
  }
  TEUM.select = select;
  swatches.forEach(function (b) {
    b.addEventListener('click', function () { select(+b.dataset.scent); });
  });

  var spinBtn = $('#spin-toggle'), spinLabel = $('#spin-label');
  spinBtn.addEventListener('click', function () {
    TEUM.spinPaused = !TEUM.spinPaused;
    spinBtn.setAttribute('aria-pressed', String(TEUM.spinPaused));
    spinLabel.textContent = TEUM.spinPaused ? '병 회전 다시 돌리기' : '병 회전 멈추기';
  });
  if (mqReduce.matches) spinBtn.hidden = true;
  mqReduce.addEventListener('change', function () { spinBtn.hidden = mqReduce.matches; wake(); });

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menu-btn'), navList = $('#nav-list');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    navList.classList.toggle('is-open', open);
    $('.menu-btn .visually-hidden').textContent = open ? '메뉴 닫기' : '메뉴';
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  navList.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) {
    if (menuBtn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.top')) setMenu(false);
  });
  mqWide.addEventListener('change', function () { setMenu(false); });

  /* ---------- batch ledger: 300 bottles, 86 left ---------- */
  var grid = $('#batch-grid');
  var frag = document.createDocumentFragment();
  for (var b = 0; b < 300; b++) {
    var el = document.createElement('i');
    if (b >= 214) el.className = 'is-left';
    frag.appendChild(el);
  }
  grid.appendChild(frag);

  /* ---------- time slider ---------- */
  var tslider = $('#tslider'), track = $('#tslider-track'), thumb = $('#tslider-thumb');
  var tclock = $('#tclock');
  var tnotes = $$('.tnote');
  var rings = $$('.ring');
  var timeScent = 0, tp = 0;
  function fmt(m) {
    m = Math.round(m / 5) * 5;
    var h = Math.floor(m / 60), r = m % 60;
    if (!h) return m + '분';
    return h + '시간' + (r ? ' ' + r + '분' : '');
  }
  var phaseNames = ['처음 향', '한 시간 뒤 향', '잔향'];
  function renderTime() {
    var m = tp * tp * 360;
    var w0 = 1 - smooth(18, 50, m);
    var w1 = smooth(22, 62, m) * (1 - smooth(140, 210, m));
    var w2 = smooth(140, 215, m);
    var ws = [w0, w1, w2];
    tslider.style.setProperty('--t', tp.toFixed(4));
    tnotes.forEach(function (n, i) {
      n.style.opacity = (0.06 + ws[i] * 0.94).toFixed(3);
      n.style.transform = 'translateY(' + ((1 - ws[i]) * (i < phase(ws) ? -10 : 10)).toFixed(1) + 'px)';
      n.style.visibility = ws[i] < 0.02 ? 'hidden' : 'visible';
    });
    rings.forEach(function (r, i) {
      r.style.opacity = (0.12 + ws[i] * 0.8).toFixed(3);
      r.style.transform = 'scale(' + (0.86 + tp * 0.28 + i * 0.02).toFixed(3) + ')';
    });
    var ph = phase(ws);
    tclock.textContent = fmt(m);
    thumb.setAttribute('aria-valuenow', String(Math.round(m)));
    thumb.setAttribute('aria-valuetext', fmt(m) + ', ' + phaseNames[ph] + ' ' + SCENTS[timeScent].notes[ph]);
  }
  function phase(ws) { return ws[2] >= ws[1] && ws[2] >= ws[0] ? 2 : ws[1] >= ws[0] ? 1 : 0; }
  function setTp(v) { tp = clamp(v, 0, 1); renderTime(); }
  function pFromEvent(e) {
    var r = track.getBoundingClientRect();
    return (e.clientY - r.top - 22) / (r.height - 44);
  }
  var dragging = false;
  track.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true;
    track.setPointerCapture(e.pointerId);
    setTp(pFromEvent(e));
    thumb.focus({ preventScroll: true });
    e.preventDefault();
  });
  track.addEventListener('pointermove', function (e) { if (dragging) setTp(pFromEvent(e)); });
  track.addEventListener('pointerup', function () { dragging = false; });
  track.addEventListener('pointercancel', function () { dragging = false; });
  thumb.addEventListener('keydown', function (e) {
    var k = e.key, step = 0.03;
    if (k === 'ArrowDown' || k === 'ArrowRight') setTp(tp + step);
    else if (k === 'ArrowUp' || k === 'ArrowLeft') setTp(tp - step);
    else if (k === 'PageDown') setTp(tp + 0.15);
    else if (k === 'PageUp') setTp(tp - 0.15);
    else if (k === 'Home') setTp(0);
    else if (k === 'End') setTp(1);
    else return;
    e.preventDefault();
  });
  $$('[data-time-scent]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      timeScent = +btn.dataset.timeScent;
      $$('[data-time-scent]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === btn)); });
      $$('[data-note]').forEach(function (n, i) { n.textContent = SCENTS[timeScent].notes[i]; });
      $('.time').style.setProperty('--tc', SCENTS[timeScent].hex);
      renderTime();
    });
  });
  renderTime();

  /* ---------- cart ---------- */
  var cart = [0, 0, 0, 0];
  var countEl = $('#cart-count'), listEl = $('#cart-list'), totalEl = $('#cart-total'), emptyEl = $('#cart-empty');
  var orderBtn = $('#cart-order'), msgEl = $('#cart-msg');
  function won(n) { return n.toLocaleString('ko-KR'); }
  function bottleSvg(i) {
    return '<svg viewBox="0 0 140 240" aria-hidden="true" style="--liquid:' + SCENTS[i].hex + '"><use href="#bottle"/></svg>';
  }
  function renderCart() {
    var n = 0, sum = 0, html = '';
    cart.forEach(function (q, i) {
      if (!q) return;
      n += q; sum += q * PRICE;
      html += '<li>' + bottleSvg(i) +
        '<div><p class="sheet__item-name"><span class="num">' + SCENTS[i].no + '</span> ' + SCENTS[i].name + '</p>' +
        '<p class="sheet__item-price"><span class="num">' + won(PRICE * q) + '</span>원</p></div>' +
        '<div class="qty"><button type="button" data-dec="' + i + '" aria-label="' + SCENTS[i].name + ' 한 병 빼기">−</button>' +
        '<output aria-label="' + SCENTS[i].name + ' 수량">' + q + '</output>' +
        '<button type="button" data-inc="' + i + '" aria-label="' + SCENTS[i].name + ' 한 병 더하기">+</button></div></li>';
    });
    listEl.innerHTML = html;
    emptyEl.hidden = n > 0;
    orderBtn.disabled = n === 0;
    totalEl.textContent = won(sum);
    countEl.textContent = String(n);
    countEl.setAttribute('aria-label', '담긴 병 ' + n + '개');
    return n;
  }
  function bump() {
    if (window.gsap && !mqReduce.matches) {
      gsap.fromTo(countEl, { scale: 1.5 }, { scale: 1, duration: 0.75, ease: 'elastic.out(1.1, 0.42)', overwrite: true });
    }
  }
  function add(i, btn) {
    cart[i]++;
    renderCart();
    bump();
    announce(SCENTS[i].no + ' ' + SCENTS[i].name + '을 장바구니에 담았습니다. 모두 ' + cart.reduce(function (a, b) { return a + b; }, 0) + '병입니다.');
    if (btn) {
      var t = $('.add__t', btn) || btn;
      var orig = btn._orig || (btn._orig = t.textContent);
      btn.classList.add('is-added');
      swapText(t, '담았습니다');
      clearTimeout(btn._tm);
      btn._tm = setTimeout(function () { btn.classList.remove('is-added'); swapText(t, orig); }, 1800);
    }
  }
  function swapText(el, text) {
    if (window.gsap && !mqReduce.matches) {
      gsap.timeline()
        .to(el, { opacity: 0, filter: 'blur(3px)', y: -4, duration: 0.12, ease: 'power2.out' })
        .add(function () { el.textContent = text; })
        .fromTo(el, { opacity: 0, filter: 'blur(3px)', y: 4 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.22, ease: 'power3.out' });
    } else el.textContent = text;
  }
  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () { add(+btn.dataset.add, btn); });
  });
  listEl.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.inc) cart[+b.dataset.inc]++;
    if (b.dataset.dec) cart[+b.dataset.dec] = Math.max(0, cart[+b.dataset.dec] - 1);
    var keepIdx = b.dataset.inc || b.dataset.dec, keepType = b.dataset.inc ? 'inc' : 'dec';
    var n = renderCart();
    msgEl.textContent = '';
    var again = listEl.querySelector('[data-' + keepType + '="' + keepIdx + '"]');
    if (again) again.focus(); else if (n) listEl.querySelector('button').focus(); else panel.focus();
  });
  orderBtn.addEventListener('click', function () {
    msgEl.textContent = '주문 화면은 여기까지입니다. 컨셉 시안이라 실제로 접수되지는 않습니다.';
  });

  /* sheet dialog */
  var sheet = $('#cart'), panel = $('.sheet__panel', sheet), opener = null, closeTm;
  var outside = [header, $('#main'), $('.foot')];
  function openSheet() {
    opener = document.activeElement;
    clearTimeout(closeTm);
    sheet.hidden = false;
    sheet.classList.remove('is-closing');
    void sheet.offsetWidth;
    sheet.classList.add('is-open');
    outside.forEach(function (el) { el.inert = true; });
    if (TEUM.lenis) TEUM.lenis.stop();
    document.body.style.overflow = 'hidden';
    msgEl.textContent = '';
    setTimeout(function () { $('.sheet__close', sheet).focus(); }, 40);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    sheet.classList.add('is-closing');
    outside.forEach(function (el) { el.inert = false; });
    if (TEUM.lenis) TEUM.lenis.start();
    document.body.style.overflow = '';
    closeTm = setTimeout(function () { sheet.hidden = true; sheet.classList.remove('is-closing'); }, mqReduce.matches ? 170 : 300);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  $('#cart-open').addEventListener('click', openSheet);
  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  sheet.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', panel).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  renderCart();

  /* ---------- quiz ---------- */
  var quiz = $('#quiz'), qs = $$('.q', quiz), qStep = $('#quiz-step'), qPrev = $('#quiz-prev'), qNext = $('#quiz-next');
  var qErr = $('#quiz-error'), result = $('#quiz-result'), cur = 0;
  var finderBottle = $('.finder__bottle');
  function showQ(n) {
    cur = n;
    qs.forEach(function (q, i) { q.classList.toggle('is-current', i === n); });
    qStep.innerHTML = '<span class="num">' + (n + 1) + '</span> / <span class="num">3</span>';
    qPrev.disabled = n === 0;
    qNext.textContent = n === 2 ? '추천 받기' : '다음 질문';
    qErr.textContent = '';
  }
  function answer(n) { var c = $('input:checked', qs[n]); return c ? +c.value : -1; }
  quiz.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = answer(cur);
    if (a < 0) { qErr.textContent = '답을 하나 골라 주세요.'; $('input', qs[cur]).focus(); return; }
    if (cur < 2) {
      showQ(cur + 1);
      $('input', qs[cur]).focus();
      if (window.gsap && !mqReduce.matches) gsap.from(qs[cur], { opacity: 0, y: 10, duration: 0.36, ease: 'power3.out' });
      return;
    }
    var score = [0, 0, 0, 0];
    score[answer(0)] += 1; score[answer(1)] += 1; score[answer(2)] += 1.5;
    var best = score.indexOf(Math.max.apply(null, score));
    $('#result-name').innerHTML = '<span class="num">' + SCENTS[best].no + '</span>' + SCENTS[best].name;
    $('#result-line').textContent = SCENTS[best].line;
    $('#result-add').dataset.add = String(best);
    finderBottle.style.setProperty('--liquid', SCENTS[best].hex);
    finderBottle.classList.add('is-filled');
    $('#finder-cap').textContent = SCENTS[best].no + ' ' + SCENTS[best].name + '을 채웠습니다';
    quiz.classList.add('is-done');
    result.focus();
    if (window.gsap && !mqReduce.matches) {
      gsap.from(result.children, { opacity: 0, y: 14, filter: 'blur(4px)', duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
    select(best);
    announce('어울리는 향은 ' + SCENTS[best].no + ' ' + SCENTS[best].name + '입니다. 맨 위의 병에도 이 향을 담았습니다.');
  });
  qPrev.addEventListener('click', function () { if (cur > 0) { showQ(cur - 1); $('input', qs[cur]).focus(); } });
  $('#quiz-reset').addEventListener('click', function () {
    quiz.reset();
    quiz.classList.remove('is-done');
    finderBottle.style.removeProperty('--liquid');
    finderBottle.classList.remove('is-filled');
    $('#finder-cap').textContent = '아직 비어 있는 병';
    showQ(0);
    $('input', qs[0]).focus();
  });
  quiz.addEventListener('change', function () { qErr.textContent = ''; });
  showQ(0);

  /* ---------- scrolling, motion ---------- */
  addEventListener('scroll', function () { readScroll(); wake(); }, { passive: true });
  var rT;
  addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(measure, 150); });
  mqWide.addEventListener('change', measure);
  measure();
  addEventListener('load', measure);
  var fontsDone = false;
  function afterFonts() {
    if (fontsDone) return; fontsDone = true;
    measure();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts);
  setTimeout(afterFonts, 800);

  try {
    if (!window.gsap) throw new Error('gsap missing');
    gsap.registerPlugin(ScrollTrigger);

    // smooth wheel scrolling on desktop fine pointers only
    if (!isShot && mqFine.matches && mqWide.matches && !mqReduce.matches && window.Lenis) {
      var lenis = TEUM.lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      lenis.on('scroll', function () { ScrollTrigger.update(); readScroll(); wake(); });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        var target = id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.4 });
      });
    }

    var mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)', wide: '(min-width: 900px)' }, function (ctx) {
      var c = ctx.conditions;
      if (c.reduce || isShot) return;

      // first screen: the horizon draws out from under the bottle, copy rises; all done by ~1.1s
      var words = $('.hero__title');
      var parts = words.textContent.split(' ');
      words.setAttribute('aria-label', words.textContent);
      words.innerHTML = parts.map(function (w) { return '<span class="w" aria-hidden="true" style="display:inline-block">' + w + '</span>'; }).join(' ');
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      st.horizonDraw = 0;
      tl.to(st, { horizonDraw: 1, duration: 0.9, ease: 'power3.inOut', onUpdate: wake }, 0.05)
        .from(horizon, { scaleX: 0, svgOrigin: '300 337', duration: 0.9, ease: 'power3.inOut' }, 0.05)
        .from('.hero__title .w', { yPercent: 40, opacity: 0, filter: 'blur(6px)', duration: 0.6, stagger: 0.07 }, 0.15)
        .from('.hero__lede', { y: 10, opacity: 0, duration: 0.5 }, 0.42)
        .from('.hero__pick', { y: 8, opacity: 0, duration: 0.5 }, 0.5)
        .from('.cta-orb', { scale: 0.9, opacity: 0, duration: 0.55 }, 0.55);

      // the scent copy settles in as each bottle arrives
      panels.forEach(function (p) {
        var t = $('.scent__text', p);
        gsap.from(t.children, { y: 18, opacity: 0, duration: 0.7, stagger: 0.06,
          scrollTrigger: { trigger: t, start: 'top 82%', once: true } });
      });
      // the ledger fills in sale order, so 214 of 300 reads as something that happened
      gsap.from('#batch-grid i.is-left', { opacity: 0, scale: 0.9, duration: 0.4, stagger: { each: 0.012, from: 'end' }, ease: 'power2.out',
        scrollTrigger: { trigger: '#batch-grid', start: 'top 80%', once: true } });
      // bottles set down on the shelf line
      gsap.from('.shelf__bottle', { y: -28, opacity: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out',
        scrollTrigger: { trigger: '.shelf', start: 'top 80%', once: true } });
      return function () {
        words.innerHTML = words.getAttribute('aria-label'); words.removeAttribute('aria-label');
      };
    });
  } catch (err) {
    root.classList.add('no-motion');
  }
})();
