/* 셈 세무회계: page behaviour. Loaded at the end of <body> (not deferred) so the hero
   odometers are in place before the first paint and nothing flashes from final to zero. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var isShot = /[?&]shot=1/.test(location.search);
  if (isShot) root.classList.add('is-shot');
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqWide = matchMedia('(min-width: 900px)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var hasGsap = !!window.gsap;
  var still = isShot || mqReduce.matches || !hasGsap;
  var ROW = 56;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function won(n) { return Math.round(n).toLocaleString('ko-KR'); }
  var announcer = $('#announcer');
  function announce(t) { announcer.textContent = ''; setTimeout(function () { announcer.textContent = t; }, 40); }

  /* ---------- keep every block on the 56px rows ---------- */
  var SNAP = '.grid > .sec__head, .grid > .hero__copy, .grid > .people__text, .grid > .people__seal, .svc__desc, .lrow--svc, .calc__inputs .field, .calc__inputs, .crow, .calc__note, .calc__out, .consult .field, .consult__done, .consult, .contact, .faq__btn, .faq__in > p, .month__body, .ledger__note, .cal__foot, .foot__main';
  function snap() {
    $$(SNAP).forEach(function (el) { el.style.minHeight = ''; });
    // innermost first, so a container is measured after its children have been rounded up
    $$(SNAP).reverse().forEach(function (el) {
      var h = el.getBoundingClientRect().height;
      if (h > 0) el.style.minHeight = Math.ceil((h - 0.5) / ROW) * ROW + 'px';
    });
  }

  // Noto Serif KR has no tabular figures: wrap each digit in a 0.62em slot so columns line up
  function tab(el) {
    if (!el || el.querySelector('.td')) return;
    el.innerHTML = el.innerHTML.replace(/(^|>)([^<]*)/g, function (m, a, txt) {
      return a + txt.replace(/\d/g, '<span class="td">$&</span>');
    });
  }
  function tabStr(str) { return String(str).replace(/\d/g, '<span class="td">$&</span>'); }

  /* ---------- odometer ---------- */
  function Odo(el, opts) {
    opts = opts || {};
    this.el = el;
    this.cycles = opts.cycles || 0;
    this.value = null;
    var text = el.textContent.trim();
    this.sr = document.createElement('span');
    this.sr.className = 'sr';
    this.box = document.createElement('span');
    this.box.className = 'odo';
    this.box.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.appendChild(this.sr);
    el.appendChild(this.box);
    this.slots = [];
    this.render(text, false);
  }
  Odo.prototype.build = function (str) {
    this.box.textContent = '';
    this.slots = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str[i], d = document.createElement('span');
      if (/\d/.test(ch)) {
        d.className = 'odo__d';
        var strip = document.createElement('span');
        strip.className = 'odo__s';
        // units spin most, like a real counter wheel
        var fromRight = 0;
        for (var j = i + 1; j < str.length; j++) if (/\d/.test(str[j])) fromRight++;
        var c = this.cycles ? Math.max(1, this.cycles - Math.floor(fromRight / 3)) : 0;
        var n = c * 10 + 10, html = '';
        for (var k = 0; k < n; k++) html += '<span>' + (k % 10) + '</span>';
        strip.innerHTML = html;
        d.appendChild(strip);
        this.slots.push({ strip: strip, n: n, c: c, cur: 0 });
      } else {
        d.className = 'odo__d odo__d--sep';
        d.textContent = ch;
      }
      this.box.appendChild(d);
    }
    this.shape = str.replace(/\d/g, '0');
  };
  // to: digits string like "182,400,000"; animate: {duration, delay, ease} or false
  Odo.prototype.render = function (str, anim) {
    this.sr.textContent = str;
    if (this.shape !== str.replace(/\d/g, '0')) this.build(str);
    var digits = str.replace(/\D/g, '');
    var self = this;
    this.slots.forEach(function (s, i) {
      var target = +digits[i];
      var idx = s.c ? s.c * 10 + target : target;
      var y = -100 * idx / s.n;
      if (anim && window.gsap) {
        gsap.to(s.strip, { yPercent: y, duration: anim.duration, delay: anim.delay || 0, ease: anim.ease || 'power3.out', overwrite: true });
      } else if (window.gsap) {
        gsap.set(s.strip, { yPercent: y });
      } else {
        s.strip.style.transform = 'translateY(' + y + '%)';
      }
      s.cur = idx;
    });
    this.value = str;
  };
  Odo.prototype.zero = function () {
    this.slots.forEach(function (s) { if (window.gsap) gsap.set(s.strip, { yPercent: 0 }); });
  };

  /* ---------- hero: rolling ledger, double underline, seal ---------- */
  var heroRows = $$('.hero__ledger .lrow:not(.lrow--head)');
  var totalRow = $('#total-row'), seal = $('#seal'), dbl = $('.dbl');
  var noted = $('.hero__ledger .lrow.is-noted');
  var wasLine = $('.was__line');
  if (still) {
    heroRows.forEach(function (row) { var o = new Odo($('.amt', row), { cycles: 3 }); o.box.classList.add('is-still'); });
  } else {
    noted.classList.add('is-quiet');
    var odos = heroRows.map(function (row) { return new Odo($('.amt', row), { cycles: 3 }); });
    odos.forEach(function (o) { o.zero(); });
    gsap.set(seal, { opacity: 0, scale: 1.6, rotation: -4 });
    gsap.set(dbl, { scaleX: 0 });
    gsap.set(wasLine, { scaleX: 0 });
    var start = function () {
      // rows land one after another from 0.3s; the total lands at 2.2s
      odos.forEach(function (o, i) {
        o.render(o.value, { duration: 1.0, delay: 0.3 + i * 0.15, ease: 'power3.out' });
      });
      // the old tax is struck through in red just before the new one lands, so the total visibly reconciles
      gsap.to(wasLine, { scaleX: 1, duration: 0.22, ease: 'power2.inOut', delay: 1.75 });
      var tl = gsap.timeline({ delay: 2.2 });
      tl.to(dbl, { scaleX: 1, duration: 0.2, ease: 'power2.inOut' })
        .to(seal, { opacity: 1, scale: 1, rotation: -12, duration: 0.2, ease: 'power4.in' }, 0.2)
        .to(totalRow, { keyframes: [{ x: 2, duration: 0.04 }, { x: -2, duration: 0.05 }, { x: 1, duration: 0.05 }, { x: 0, duration: 0.06 }] }, 0.4)
        .add(function () { odos.forEach(function (o) { o.box.classList.add('is-still'); }); noted.classList.remove('is-quiet'); }, 0.6);
    };
    // the roll starts at a fixed 0.3s after load so it is the first thing seen, fonts or not
    start();
  }

  // memos in the margin: hover or focus a row (desktop), tap a row (touch)
  heroRows.forEach(function (row) {
    if (row === totalRow || row.classList.contains('lrow--fix')) return;
    if (!mqWide.matches) row.setAttribute('aria-expanded', 'false');
    row.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      row.classList.add('is-hot');
      if (noted && row !== noted) noted.classList.add('is-quiet');
    });
    row.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      row.classList.remove('is-hot');
      if (noted) noted.classList.remove('is-quiet');
    });
    row.addEventListener('focus', function () { if (noted && row !== noted) noted.classList.add('is-quiet'); });
    row.addEventListener('blur', function () { if (noted) noted.classList.remove('is-quiet'); });
    row.addEventListener('click', function (e) {
      if (mqWide.matches && e.pointerType === 'mouse') return;
      var open = !row.classList.contains('is-open');
      heroRows.forEach(function (r) { r.classList.remove('is-open', 'is-hot'); if (r !== totalRow && !r.classList.contains('lrow--fix')) r.setAttribute('aria-expanded', 'false'); });
      if (open) row.classList.add('is-open', 'is-hot');
      row.setAttribute('aria-expanded', String(open));
    });
    row.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !mqWide.matches) { e.preventDefault(); row.click(); }
    });
  });

  /* ---------- folio: 제 N 면 ---------- */
  var folioN = $('#folio-n');
  var folioStrip;
  (function () {
    folioStrip = document.createElement('span');
    folioStrip.className = 'folio__strip';
    folioStrip.innerHTML = '<span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>';
    folioN.textContent = '';
    folioN.appendChild(folioStrip);
  })();
  var folio = 1;
  function setFolio(n) {
    if (n === folio) return;
    folio = n;
    var y = -100 * (n - 1) / 6;
    if (window.gsap && !mqReduce.matches) gsap.to(folioStrip, { yPercent: y, duration: 0.45, ease: 'power3.out', overwrite: true });
    else folioStrip.style.transform = 'translateY(' + y + '%)';
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menu-btn'), navList = $('#nav-list');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    navList.classList.toggle('is-open', open);
    $('.menu-btn__t').textContent = open ? '닫기' : '메뉴';
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

  /* ---------- calculator ---------- */
  var BIZ = {
    food: { ratio: 72, gap: 0.03 }, cafe: { ratio: 69, gap: 0.035 }, retail: { ratio: 80, gap: 0.02 },
    beauty: { ratio: 58, gap: 0.04 }, free: { ratio: 38, gap: 0.04 }, make: { ratio: 76, gap: 0.025 }
  };
  var BRACKETS = [[14e6, 0.06, 0], [50e6, 0.15, 1.26e6], [88e6, 0.24, 5.76e6], [150e6, 0.35, 15.44e6],
    [300e6, 0.38, 19.94e6], [500e6, 0.40, 25.94e6], [1e9, 0.42, 35.94e6], [Infinity, 0.45, 65.94e6]];
  function incomeTax(base) {
    if (base <= 0) return 0;
    for (var i = 0; i < BRACKETS.length; i++) if (base <= BRACKETS[i][0]) return base * BRACKETS[i][1] - BRACKETS[i][2];
    return 0;
  }
  function estimate(rev, ratio, gap) {
    var now = incomeTax(rev * (1 - ratio) - 1.5e6) * 1.1;
    var r2 = Math.min(0.95, ratio + gap);
    var after = incomeTax(rev * (1 - r2) - 1.5e6 - Math.min(5e6, rev * 0.03)) * 1.1;
    // an example, not a promise: never show more than a quarter off
    after = Math.max(after, now * 0.75);
    now = Math.round(now / 1e4) * 1e4; after = Math.round(after / 1e4) * 1e4;
    return { now: now, after: Math.min(now, after) };
  }
  function koreanAmount(n) {
    n = Math.round(n / 1e4) * 1e4;
    var eok = Math.floor(n / 1e8), man = Math.round((n % 1e8) / 1e4);
    var s = '';
    if (eok) s += eok.toLocaleString('ko-KR') + '억';
    if (man) s += (s ? ' ' : '') + man.toLocaleString('ko-KR') + '만';
    return (s || '0') + ' 원';
  }
  var MIN = 3e7, MAX = 1e9, STEPS = 350;
  // about 1% per step; rounded to 10만 below 1억 and 100만 above, so every arrow press changes the value
  function revFromSlider(v) {
    var r = MIN * Math.pow(MAX / MIN, v / STEPS), unit = r < 1e8 ? 1e5 : 1e6;
    return Math.round(r / unit) * unit;
  }
  function sliderFromRev(r) { return Math.round(STEPS * Math.log(Math.min(MAX, Math.max(MIN, r)) / MIN) / Math.log(MAX / MIN)); }
  // reads 182400000, 182,400,000, 1억 8240만, 1.5억, 5천만, 8,240만 원
  var UNITS = { '억': 1e8, '천만': 1e7, '백만': 1e6, '만': 1e4, '천': 1e3 };
  function parseKRW(str) {
    var t = String(str).replace(/[\s,원]/g, '');
    if (!t) return NaN;
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    var re = /(\d+(?:\.\d+)?)(억|천만|백만|만|천)/g, m, total = 0, used = '';
    while ((m = re.exec(t))) { total += parseFloat(m[1]) * UNITS[m[2]]; used += m[0]; }
    var rest = t.replace(re, '');
    if (rest && !/^\d+$/.test(rest)) return NaN;
    if (!used) return NaN;
    return total + (rest ? parseFloat(rest) : 0);
  }

  var cBiz = $('#c-biz'), cRev = $('#c-rev'), cRevNum = $('#c-rev-num'), cRevWords = $('#c-rev-words'), cRevErr = $('#c-rev-err');
  var cRatio = $('#c-ratio'), cRatioOut = $('#c-ratio-out');
  var barNow = $('#bar-now'), barAfter = $('#bar-after'), barGap = $('#bar-gap'), diffLine = $('#diff-line');
  var settleT;
  var oNow = new Odo($('#out-now')), oAfter = new Odo($('#out-after')), oDiff = new Odo($('#out-diff'));
  [oNow, oAfter, oDiff].forEach(function (o) { o.box.classList.add('is-still'); });
  var revenue = 182400000;

  function paintRange(input) {
    var p = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty('--p', p + '%');
  }
  function compute(anim) {
    var ratio = +cRatio.value / 100;
    var res = estimate(revenue, ratio, BIZ[cBiz.value].gap);
    var a = anim && !mqReduce.matches ? { duration: 0.55, ease: 'power3.out' } : false;
    oNow.render(won(res.now), a);
    oAfter.render(won(res.after), a);
    oDiff.render(won(res.now - res.after), a);
    var max = Math.max(res.now, 1);
    var wNow = res.now > 0 ? 100 : 0.2, wAfter = Math.max(0.2, (res.after / max) * 100);
    // the after bar is solid; the part that might be saved is hatched in seal red up to the current tax
    if (window.gsap && a) {
      gsap.to(barNow, { attr: { width: wNow }, duration: 0.5, ease: 'power3.out', overwrite: true });
      gsap.to(barAfter, { attr: { width: wAfter }, duration: 0.5, ease: 'power3.out', overwrite: true });
      gsap.to(barGap, { attr: { x: wAfter, width: Math.max(0, wNow - wAfter) }, duration: 0.5, ease: 'power3.out', overwrite: true });
    } else {
      barNow.setAttribute('width', wNow); barAfter.setAttribute('width', wAfter);
      barGap.setAttribute('x', wAfter); barGap.setAttribute('width', Math.max(0, wNow - wAfter));
    }
    // the gold double rule is drawn again once the figure settles
    if (window.gsap && a) {
      clearTimeout(settleT);
      gsap.set(diffLine, { scaleX: 0 });
      settleT = setTimeout(function () { gsap.to(diffLine, { scaleX: 1, duration: 0.2, ease: 'power2.inOut' }); }, 600);
    }
    cRatioOut.textContent = cRatio.value + '%';
    cRatio.setAttribute('aria-valuetext', cRatio.value + '%');
  }
  function setRevenue(r, from) {
    revenue = r;
    cRevWords.textContent = koreanAmount(r);
    cRev.setAttribute('aria-valuetext', koreanAmount(r));
    if (from !== 'slider') cRev.value = sliderFromRev(r);
    if (from !== 'num') cRevNum.value = won(r);
    paintRange(cRev);
  }
  cRev.addEventListener('input', function () {
    setRevenue(revFromSlider(+cRev.value), 'slider');
    cRevErr.textContent = ''; cRevNum.removeAttribute('aria-invalid');
    compute(true);
  });
  function revError(msg) {
    cRevErr.textContent = msg;
    if (msg) cRevNum.setAttribute('aria-invalid', 'true'); else cRevNum.removeAttribute('aria-invalid');
    snap();
  }
  cRevNum.addEventListener('input', function () {
    var r = Math.round(parseKRW(cRevNum.value));
    if (!r || isNaN(r)) { revError('연 매출을 숫자로 넣어 주세요. 예: 182,400,000 또는 1억 8천만'); return; }
    // out of range: keep the last result and say why
    if (r < 1e7 || r > 1e10) { revError('연 매출은 1,000만 원에서 100억 원 사이로 넣어 주세요.'); return; }
    if (cRevErr.textContent) revError('');
    setRevenue(r, 'num');
    compute(true);
  });
  cRevNum.addEventListener('blur', function () { if (revenue) cRevNum.value = won(revenue); });
  cRevNum.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); cRevNum.value = won(revenue); } });
  cRatio.addEventListener('input', function () { paintRange(cRatio); compute(true); });
  cBiz.addEventListener('change', function () {
    cRatio.value = BIZ[cBiz.value].ratio;
    paintRange(cRatio);
    compute(true);
  });
  $('#calc-form').addEventListener('submit', function (e) { e.preventDefault(); });
  cRatio.value = BIZ[cBiz.value].ratio;
  paintRange(cRatio);
  setRevenue(revenue);
  compute(false);

  /* ---------- tax calendar ---------- */
  var MONTHLY = { d: 10, t: '원천세 신고, 납부', who: '직원을 둔 사업자', fine: '늦으면 원천징수 납부지연 가산세, 최대 10%' };
  var CAL = [
    [{ d: 25, t: '부가가치세 확정신고 (2기)', who: '개인, 법인 사업자', fine: '무신고 가산세 20%, 납부지연 가산세 하루 0.022%' }],
    [{ d: 10, t: '사업장현황신고', who: '면세 개인사업자', fine: '수입금액 미신고분의 0.5% 가산세' }],
    [{ d: 31, t: '법인세 신고, 납부', who: '12월 결산 법인', fine: '무신고 가산세 20%, 납부지연 가산세 하루 0.022%' }],
    [{ d: 25, t: '부가가치세 예정신고', who: '법인 사업자', fine: '무신고 가산세 20%' }],
    [{ d: 31, t: '종합소득세 신고, 납부', who: '개인사업자, 프리랜서', fine: '무신고 가산세 20%, 납부지연 가산세 하루 0.022%' }],
    [{ d: 30, t: '성실신고 대상 종합소득세', who: '성실신고 확인 대상 사업자', fine: '확인서 미제출 시 산출세액의 5% 가산세' }],
    [{ d: 25, t: '부가가치세 확정신고 (1기)', who: '개인, 법인 사업자', fine: '무신고 가산세 20%, 납부지연 가산세 하루 0.022%' }],
    [{ d: 31, t: '법인세 중간예납', who: '법인', fine: '납부지연 가산세 하루 0.022%' }],
    [],
    [{ d: 25, t: '부가가치세 예정신고', who: '법인 사업자', fine: '무신고 가산세 20%' }],
    [{ d: 30, t: '종합소득세 중간예납', who: '개인사업자', fine: '고지서 금액 미납 시 납부지연 가산세' }],
    []
  ];
  var NOTES = { 11: '셈 기장 고객은 12월 중순에 연말 절세 점검을 따로 해 드립니다. 올해 안에 써야 공제되는 항목을 챙깁니다.' };
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var tY = today.getFullYear(), tM = today.getMonth(), tD = today.getDate();
  function dueList(m) { return [MONTHLY].concat(CAL[m]).sort(function (a, b) { return a.d - b.d; }); }
  // a deadline on a Saturday or Sunday moves to the next Monday (public holidays are not modelled)
  function shift(dt) {
    var wd = dt.getDay();
    if (wd === 6) dt.setDate(dt.getDate() + 2); else if (wd === 0) dt.setDate(dt.getDate() + 1);
    return dt;
  }
  function nextDate(m, d) {
    var dt = shift(new Date(tY, m, d));
    if (dt < today) dt = shift(new Date(tY + 1, m, d));
    return dt;
  }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dday(dt) { return Math.round((dt - today) / 86400000); }
  function ddText(n) { return n === 0 ? '오늘' : 'D-' + n; }
  var calEl = $('#cal');
  var html = '';
  for (var m = 0; m < 12; m++) {
    var items = dueList(m);
    var majors = items.filter(function (x) { return x !== MONTHLY; });
    var sum = majors.length ? majors.map(function (x) { return x.t; }).join(', ') : '원천세만 있는 달';
    var dates = items.map(function (x) { return x.d + '일'; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ');
    var who = majors.length ? majors[0].who : MONTHLY.who;
    // nearest upcoming deadline in this month (this year if still ahead, otherwise next year)
    var near = null;
    items.forEach(function (x) { var dt = nextDate(m, x.d); if (!near || dt < near) near = dt; });
    var n = dday(near);
    var isNow = m === tM;
    var dim = new Date(tY, m + 1, 0).getDate();
    var ruler = '<div class="ruler" aria-hidden="true"><span class="ruler__line"></span>';
    for (var d = 1; d <= dim; d++) {
      var left = ((d - 1) / (dim - 1)) * 100;
      var wd = new Date(tY, m, d).getDay();
      if (d === 1 || (d % 5 === 0 && dim - d > 2) || d === dim) ruler += '<span class="ruler__lab' + (d === 1 ? ' is-first' : d === dim ? ' is-last' : '') + '" style="left:' + left + '%">' + d + '</span>';
      ruler += '<span class="ruler__tick' + (wd === 0 || wd === 6 ? ' ruler__tick--w' : '') + '" style="left:' + left + '%"></span>';
    }
    items.forEach(function (x) { if (!x.firm) ruler += '<span class="ruler__due" style="left:' + ((x.d - 1) / (dim - 1)) * 100 + '%"></span>'; });
    if (isNow) ruler += '<span class="ruler__today' + (tD > dim * 0.8 ? ' is-flip' : '') + '" style="left:' + ((tD - 1) / (dim - 1)) * 100 + '%"><span>오늘 ' + tD + '일</span></span>';
    ruler += '</div>';
    var list = '<ul class="dues">' + items.map(function (x) {
      var nd = nextDate(m, x.d);
      var moved = nd.getDate() !== x.d || nd.getMonth() !== m;
      // in the open month, a deadline already behind us this year reads 지남
      var past = isNow && shift(new Date(tY, m, x.d)) < today;
      var dd = dday(nd);
      var shiftNote = moved ? '<span class="due__shift">주말이라 ' + (nd.getMonth() + 1) + '월 ' + nd.getDate() + '일(' + WD[nd.getDay()] + ')까지. </span>' : '';
      return '<li class="due"><span class="due__d' + (past ? ' is-past' : '') + '">' + tabStr(x.d) + '일</span>' +
        '<span class="due__t">' + x.t + '</span><span class="due__who">' + x.who + '</span>' +
        '<span class="due__fine">' + shiftNote + x.fine + '</span><span class="due__dd">' + (past ? '지남' : tabStr(ddText(dd))) + '</span></li>';
    }).join('') + '</ul>' + (NOTES[m] ? '<p class="month__note">' + NOTES[m] + '</p>' : '');
    html += '<div class="month' + (isNow ? ' is-now is-open' : '') + '" role="listitem">' +
      '<button type="button" class="month__btn" aria-expanded="' + isNow + '" aria-controls="mp-' + m + '">' +
      '<span class="month__name"><span class="month__m">' + (m + 1) + '월</span><span class="month__sum">' + sum + '</span></span>' +
      '<span class="month__dates">' + dates + '</span><span class="month__who">' + who + '</span>' +
      '<span class="month__dday"><span class="visually-hidden">가장 가까운 기한까지 </span>' + tabStr(ddText(n)) + '</span></button>' +
      '<div class="month__panel" id="mp-' + m + '"><div class="month__in"><div class="month__body">' + ruler + list + '</div></div></div></div>';
  }
  calEl.insertAdjacentHTML('beforeend', html);
  // the footnote sits after the list, not inside it
  calEl.insertAdjacentHTML('afterend', '<p class="cal__foot">주말 기한은 다음 월요일로 옮겨 셌고, 공휴일은 따로 반영하지 않았습니다. 남은 날은 오늘을 기준으로 셉니다.</p>');
  $$('.month', calEl).forEach(function (mo) {
    var btn = $('.month__btn', mo), panel = $('.month__panel', mo);
    panel.inert = !mo.classList.contains('is-open');
    btn.addEventListener('click', function () {
      var open = !mo.classList.contains('is-open');
      $$('.month.is-open', calEl).forEach(function (o) {
        if (o === mo) return;
        o.classList.remove('is-open'); $('.month__btn', o).setAttribute('aria-expanded', 'false'); $('.month__panel', o).inert = true;
      });
      mo.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 320);
    });
  });

  $$('.fee__n').forEach(tab);

  /* ---------- FAQ ---------- */
  $$('.faq__btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    panel.inert = true;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      panel.inert = !open;
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 320);
    });
  });

  /* ---------- consultation form ---------- */
  var form = $('#consult-form'), done = $('#consult-done');
  function fieldError(input, errEl, msg) {
    errEl.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#f-name'), tel = $('#f-tel'), agree = $('#f-agree');
    var ok1 = fieldError(name, $('#f-name-err'), name.value.trim() ? '' : '성함을 적어 주세요.');
    var digits = tel.value.replace(/\D/g, '');
    var ok2 = fieldError(tel, $('#f-tel-err'), digits.length >= 9 && digits.length <= 11 ? '' : '연락받으실 번호를 숫자로 적어 주세요. 예: 010-0000-0000');
    var ok3 = fieldError(agree, $('#f-agree-err'), agree.checked ? '' : '연락을 드리려면 동의가 필요합니다.');
    snap();
    if (!(ok1 && ok2 && ok3)) {
      (!ok1 ? name : !ok2 ? tel : agree).focus();
      return;
    }
    done.hidden = false;
    $('.consult__submit', form).hidden = true;
    snap();
    done.focus();
    var s = $('.seal--recv', done);
    if (window.gsap && !mqReduce.matches) {
      gsap.fromTo(s, { scale: 1.5, opacity: 0, rotation: -2 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.22, ease: 'power4.in' });
      gsap.from($$('p', done), { opacity: 0, y: 6, duration: 0.4, stagger: 0.08, delay: 0.25, ease: 'power3.out' });
    }
    announce('무료 세무 진단 신청서를 받았습니다. 컨셉 시안이라 실제로 접수되지는 않습니다.');
  });
  ['#f-name', '#f-tel', '#f-agree'].forEach(function (sel) {
    $(sel).addEventListener('input', function () {
      var el = $(sel);
      if (el.getAttribute('aria-invalid') === 'true') { el.removeAttribute('aria-invalid'); $(sel + '-err').textContent = ''; snap(); }
    });
  });

  /* ---------- layout passes ---------- */
  snap();
  var rT;
  addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { snap(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 150); });
  // rows are measured again whenever webfonts finish loading: a late font changes line wraps and so row heights
  function afterFonts() {
    snap();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(afterFonts);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', afterFonts);
  }
  setTimeout(afterFonts, 800);
  addEventListener('load', function () { snap(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  try {
    if (!window.gsap) throw new Error('gsap missing');
    gsap.registerPlugin(ScrollTrigger);
    $$('[data-folio]').forEach(function (sec) {
      var n = +sec.dataset.folio;
      ScrollTrigger.create({ trigger: sec, start: 'top 40%', end: 'bottom 40%',
        onToggle: function (self) { if (self.isActive) setFolio(n); } });
    });
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (isShot) return;
      // three quiet moments: services rows are entered, the calculator bars, the name seal
      gsap.from('.lrow--svc', { opacity: 0, x: -10, duration: 0.5, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '#work .ledger', start: 'top 80%', once: true } });
      gsap.from('.seal--name', { opacity: 0, scale: 1.35, rotation: -6, duration: 0.24, ease: 'power4.in',
        scrollTrigger: { trigger: '.people__seal', start: 'top 75%', once: true } });
      gsap.from('#calc .crow', { opacity: 0, y: 8, duration: 0.45, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '#calc .calc__out', start: 'top 85%', once: true } });
    });
  } catch (err) {
    root.classList.add('no-motion');
  }
})();
