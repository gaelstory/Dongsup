/* 헤비클럽: 폭 맞춤 세 줄, 스크롤 속도 키네틱 타입, 마키, 반복 카운터, 시간표, 길게 눌러 신청. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SHOT = /[?&]shot=1/.test(location.search);
  if (SHOT) root.classList.add('is-shot');
  var G = window.gsap;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function safe(fn) {
    try { fn(); } catch (err) { root.classList.add('no-motion'); unhide(); }
  }
  function unhide() {
    if (!G) return;
    try {
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      G.globalTimeline.getChildren(true, true, false).forEach(function (t) { t.progress(1); });
      G.set('.ch, .strip, .line__kin, .kin', { clearProps: 'transform,opacity,visibility' });
      $('.hero').classList.remove('is-dropping');
    } catch (e) { /* 정적 상태로 둔다 */ }
  }

  /* ---------------- 세 줄 폭 맞춤 ---------------- */
  var fitState = { fs: 0, scale: 1, lineH: 0, ready: false };
  var measureCanvas = document.createElement('canvas');
  function fitLines() {
    var linesEl = $('.lines');
    if (!linesEl) return;
    var cs = getComputedStyle(linesEl);
    var W = linesEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var H = linesEl.clientHeight - parseFloat(cs.paddingTop);
    var lineH = H / 3;
    var ctx = measureCanvas.getContext('2d');
    ctx.font = '100px "Black Han Sans"';
    var lines = $$('.line', linesEl);
    var maxW = 0, aA = 0, aD = 0, fA = 0, fD = 0;
    lines.forEach(function (ln) {
      var t = $$('.ch', ln).map(function (c) { return c.textContent; }).join('');
      var m = ctx.measureText(t);
      maxW = Math.max(maxW, m.width / 100);
      aA = Math.max(aA, (m.actualBoundingBoxAscent || 80) / 100);
      aD = Math.max(aD, (m.actualBoundingBoxDescent || 8) / 100);
      fA = (m.fontBoundingBoxAscent || 88) / 100;
      fD = (m.fontBoundingBoxDescent || 22) / 100;
    });
    var gh = aA + aD;
    var fsH = lineH / gh;
    var fsW = W / (maxW * 1.04);
    var fs = Math.min(fsH, fsW);
    var scale = Math.max(1, lineH / (gh * fs));
    // 줄 상자(line-height 1) 안에서 글자 윗면을 0에 맞춘다
    var glyphTop = ((1 - (fA + fD)) / 2 + fA - aA) * fs;
    linesEl.style.fontSize = fs.toFixed(2) + 'px';
    $$('.line__fit', linesEl).forEach(function (f) {
      f.style.transform = 'translateY(' + (-glyphTop * scale).toFixed(2) + 'px) scaleY(' + scale.toFixed(4) + ')';
    });
    fitState.fs = fs; fitState.scale = scale; fitState.lineH = lineH; fitState.ready = true;
    placeBarbell();
  }

  var barbellRest = 0;
  function placeBarbell() {
    var bb = $('.barbell'), line2 = $('.line--2');
    if (!bb || !line2) return;
    var chs = $$('.ch', line2);
    var lr = line2.getBoundingClientRect();
    var a = chs[1].getBoundingClientRect(), b = chs[2].getBoundingClientRect();
    // 글자 사이가 좁으면(모바일, 태블릿) 바벨을 줄여 마지막 글자 위에 걸친다
    var tight = (b.left - a.right) < fitState.lineH * 0.6;
    var h = fitState.lineH * (tight ? 0.56 : 0.78);
    bb.style.height = h.toFixed(1) + 'px';
    var w = h * 5;
    var gap = (a.right + b.left) / 2 - lr.left;
    // 넓을 때는 왼쪽 원판 묶음(가로 0.12~0.22)이 마지막 두 글자 사이에 오도록
    barbellRest = tight ? (b.left - lr.left) + (b.width * 0.18) - w * 0.17 : gap - w * 0.169;
    if (!G) { bb.style.transform = 'translate(' + barbellRest.toFixed(1) + 'px, -50%)'; return; }
    if (!bb.dataset.moving) G.set(bb, { x: barbellRest, yPercent: -50 });
  }

  /* ---------------- 인트로 + 속도 ---------------- */
  function initMotion() {
    var plugins = [window.ScrollTrigger, window.CustomEase].filter(Boolean);
    G.registerPlugin.apply(G, plugins);
    var ST = window.ScrollTrigger;
    var hero = $('.hero');
    var bb = $('.barbell');
    G.set(bb, { x: barbellRest, yPercent: -50 });

    var mm = G.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
      small: '(max-width: 767px)'
    }, function (ctx) {
      var c = ctx.conditions;
      if (c.reduce) return;
      if (!SHOT) intro(hero, bb);
      if (!SHOT) velocity(c.small ? 1.2 : 1.35);
    });
    marquee(mm);
    ST.refresh();
  }

  // 글꼴이 준비되면(최대 0.5초) 원판처럼 떨어뜨린다
  var fontGate = Promise.race([
    document.fonts && document.fonts.load ? document.fonts.load('100px "Black Han Sans"', '들어라버텨한번더') : Promise.resolve(),
    new Promise(function (r) { setTimeout(r, 500); })
  ]);
  function intro(hero, bb) {
    var plate = window.CustomEase ? window.CustomEase.create('plate', 'M0,0 C0.3,0 0.5,1.1 0.6,1.1 0.7,1.1 0.8,0.97 1,1') : 'power3.out';
    hero.classList.add('is-dropping');
    bb.dataset.moving = '1';
    var tl = G.timeline({ paused: true });
    tl.from('.ch', { yPercent: -120, duration: 0.62, ease: plate, stagger: 0.03 }, 0)
      .from('.strip', { yPercent: 100, duration: 0.55, ease: 'power3.out' }, 0.1)
      .to('.lines', { y: 7, duration: 0.07, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.69)
      .add(function () { hero.classList.remove('is-dropping'); }, 0.87);
    G.set(bb, { x: -4000 });
    fontGate.then(function () {
      safe(fitLines);
      tl.play();
      G.fromTo(bb, { x: -bb.getBoundingClientRect().width - 60 }, {
        x: barbellRest, duration: 1.0, ease: 'power4.out', delay: 0.57,
        onComplete: function () { delete bb.dataset.moving; }
      });
    });
    return function () { tl.kill(); hero.classList.remove('is-dropping'); delete bb.dataset.moving; G.set(bb, { x: barbellRest }); };
  }

  // 빨리 내릴수록 글자가 늘어나고 기운다
  function velocity(maxS) {
    var els = $$('.line__kin').concat($$('.kin'));
    var sy = els.map(function (el) { return G.quickTo(el, 'scaleY', { duration: 0.4, ease: 'power3.out' }); });
    var sk = els.map(function (el) { return G.quickTo(el, 'skewX', { duration: 0.4, ease: 'power3.out' }); });
    var idle = 0;
    function settle() { els.forEach(function (el, i) { sy[i](1); sk[i](0); }); }
    window.ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var v = self.getVelocity();
        var n = G.utils.clamp(-1, 1, v / 2400);
        var s = 1 + Math.abs(n) * (maxS - 1);
        var k = -n * 8;
        els.forEach(function (el, i) { sy[i](s); sk[i](k); });
        clearTimeout(idle);
        idle = setTimeout(settle, 90);
      }
    });
    return function () { clearTimeout(idle); };
  }

  /* ---------------- 마키 ---------------- */
  var marqState = { userPaused: false, tweens: [], visible: true };
  function marquee(mm) {
    var rows = $$('.marq__row');
    var btn = $('.marq__pause');
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, function (ctx) {
      if (!ctx.conditions.motion || SHOT) { btn.hidden = true; return; }
      btn.hidden = false;
      var tweens = rows.map(function (row) {
        var track = $('.marq__track', row);
        var set = $('.marq__set', track);
        $$('.marq__set', track).slice(1).forEach(function (n) { n.remove(); });
        var setW = set.offsetWidth;
        var need = Math.ceil((window.innerWidth * 2) / setW) + 1;
        for (var i = 0; i < need; i++) {
          var cl = set.cloneNode(true);
          cl.setAttribute('aria-hidden', 'true');
          track.appendChild(cl);
        }
        var dir = +row.dataset.dir;
        var tw = G.fromTo(track, { x: dir < 0 ? 0 : -setW }, { x: dir < 0 ? -setW : 0, duration: setW / 80, ease: 'none', repeat: -1 });
        tw.totalTime(tw.duration() * 400);
        return tw;
      });
      marqState.tweens = tweens;
      var scrollDir = 1, idle = 0;
      var st = window.ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: function (self) {
          scrollDir = self.direction;
          var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 7);
          G.to(tweens, { timeScale: scrollDir * boost, duration: 0.25, overwrite: true });
          clearTimeout(idle);
          idle = setTimeout(function () { G.to(tweens, { timeScale: scrollDir, duration: 0.6, overwrite: true }); }, 120);
        }
      });
      var io = new IntersectionObserver(function (en) {
        marqState.visible = en[0].isIntersecting;
        syncMarq();
      });
      io.observe($('.marq'));
      syncMarq();
      return function () { io.disconnect(); clearTimeout(idle); st.kill(); marqState.tweens = []; };
    });
    btn.addEventListener('click', function () {
      marqState.userPaused = !marqState.userPaused;
      btn.setAttribute('aria-pressed', marqState.userPaused ? 'true' : 'false');
      $('.marq__pause-text', btn).textContent = marqState.userPaused ? '흐르는 글 다시 움직이기' : '흐르는 글 멈추기';
      syncMarq();
    });
  }
  function syncMarq() {
    var run = marqState.visible && !marqState.userPaused && !document.hidden;
    marqState.tweens.forEach(function (t) { if (run) t.resume(); else t.pause(); });
  }
  document.addEventListener('visibilitychange', syncMarq);

  /* ---------------- 반복 카운터 ---------------- */
  function initReps() {
    var box = $('#reps'), num = $('#reps-num'), done = $('.reps__done', box);
    if (!box) return;
    var lastY = window.scrollY, total = 0, reps = 0, finished = false, ticking = false, hideT = 0;
    box.classList.toggle('is-hidden', lastY < 120);
    function update() {
      ticking = false;
      var y = window.scrollY;
      total += Math.abs(y - lastY);
      lastY = y;
      box.classList.toggle('is-hidden', y < 120 && reps === 0);
      var r = Math.floor(total / 600);
      if (r === reps) return;
      reps = r;
      num.textContent = reps;
      if (G && !reduceMQ.matches) G.fromTo(num, { scaleY: 1.45 }, { scaleY: 1, duration: 0.4, ease: 'back.out(3)', overwrite: true });
      if (reps >= 20 && !finished) {
        finished = true;
        done.textContent = '오늘 운동 끝. 이제 진짜 하러 오세요.';
        if (G && !reduceMQ.matches) G.from(done, { yPercent: 40, autoAlpha: 0, duration: 0.4, ease: 'power3.out' });
        hideT = setTimeout(function () { done.textContent = ''; }, 7000);
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------------- 시간표 ---------------- */
  var DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  var DAYL = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  var KIND = {
    cf: { name: '크로스핏', coach: '강도윤', sub: '60분, 정원 12명' },
    tw: { name: '팀 와드', coach: '강도윤', sub: '2인 1조, 75분', cls: 'cf' },
    wt: { name: '웨이트 입문', coach: '마준혁', sub: '50분, 정원 4명' },
    bc: { name: '바디 서킷', coach: '서하린', sub: '45분, 정원 10명' },
    og: { name: '오픈 짐', coach: '마준혁', sub: '자유 운동, 당번 코치', cls: 'bc' }
  };
  var ROWS = [
    ['06:30', ['cf', 'bc', 'cf', 'bc', 'cf', null, null]],
    ['07:30', ['wt', 'cf', 'wt', 'cf', 'wt', null, null]],
    ['10:00', [null, null, null, null, null, 'tw', 'og']],
    ['11:30', [null, null, null, null, null, 'wt', 'bc']],
    ['12:10', ['bc', 'wt', 'bc', 'wt', 'bc', null, null]],
    ['19:00', ['cf', 'cf', 'cf', 'cf', 'cf', null, null]],
    ['20:10', ['wt', 'bc', 'wt', 'bc', 'tw', null, null]],
    ['21:20', ['bc', 'cf', 'bc', 'cf', null, null, null]]
  ];

  function cellHTML(kind, d, time) {
    var k = KIND[kind];
    var cls = 'cell cell--' + (k.cls || kind);
    var label = DAYL[d] + ' ' + time + ' ' + k.name + '. 눌러서 코치 보기';
    return '<button class="' + cls + '" type="button" aria-pressed="false" data-coach="' + k.coach + '" data-base="' + DAYL[d] + ' ' + time + ' ' + k.name + '" aria-label="' + label + '">' +
      '<span class="cell__in" aria-hidden="true">' +
      '<span class="cell__face cell__face--front"><span class="cell__name">' + k.name + '</span><span class="cell__sub">' + k.sub + '</span></span>' +
      '<span class="cell__face cell__face--back"><span class="cell__name">코치 <b>' + k.coach + '</b></span><span class="cell__sub">' + time + '</span></span>' +
      '</span></button>';
  }

  function initSchedule() {
    var app = $('#sched-app');
    if (!app) return;
    var today = (new Date().getDay() + 6) % 7;
    // 넓은 화면: 표
    var t = '<div class="sched__wide"><table class="tt"><caption class="sr-only">이번 주 수업 시간표. 칸을 누르면 코치 이름이 보입니다.</caption><thead><tr><th scope="col"><span class="sr-only">시간</span></th>';
    DAYS.forEach(function (d, i) {
      t += '<th scope="col" abbr="' + DAYL[i] + '"' + (i === today ? ' class="is-today"' : '') + '>' + d + (i === today ? '<small>오늘</small>' : '') + '</th>';
    });
    t += '</tr></thead><tbody>';
    ROWS.forEach(function (r) {
      t += '<tr><th scope="row">' + r[0] + '</th>';
      r[1].forEach(function (k, d) {
        t += '<td' + (d === today ? ' class="is-today"' : '') + '>' + (k ? cellHTML(k, d, r[0]) : '<span class="tt__empty"><span class="sr-only">수업 없음</span></span>') + '</td>';
      });
      t += '</tr>';
    });
    t += '</tbody></table>';
    t += '<p class="tt-legend"><span><i style="background:#000"></i>크로스핏</span><span><i style="background:#FF3B0F"></i>웨이트 입문</span><span><i style="background:#2B2B2B"></i>바디 서킷</span></p></div>';
    // 좁은 화면: 요일 탭
    var n = '<div class="sched__narrow"><div class="days" role="tablist" aria-label="요일">';
    DAYS.forEach(function (d, i) {
      n += '<button type="button" role="tab" id="day-tab-' + i + '" aria-controls="day-panel" aria-selected="' + (i === today) + '" tabindex="' + (i === today ? 0 : -1) + '"' + (i === today ? ' class="is-today"' : '') + ' aria-label="' + DAYL[i] + (i === today ? ', 오늘' : '') + '">' + d + '</button>';
    });
    n += '</div><div class="daypanel" id="day-panel" role="tabpanel" aria-labelledby="day-tab-' + today + '"></div></div>';
    app.innerHTML = t + n;

    var panel = $('#day-panel', app);
    function showDay(d) {
      var items = ROWS.filter(function (r) { return r[1][d]; });
      if (!items.length) { panel.innerHTML = '<p class="daylist__none">이날은 수업이 없습니다.</p>'; return; }
      panel.innerHTML = '<ul class="daylist">' + items.map(function (r) {
        return '<li><span class="daylist__time">' + r[0] + '</span>' + cellHTML(r[1][d], d, r[0]) + '</li>';
      }).join('') + '</ul>';
      panel.setAttribute('aria-labelledby', 'day-tab-' + d);
    }
    var tabs = $$('[role="tab"]', app);
    function selectTab(i, focus) {
      tabs.forEach(function (tb, j) {
        tb.setAttribute('aria-selected', j === i ? 'true' : 'false');
        tb.tabIndex = j === i ? 0 : -1;
      });
      showDay(i);
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (tb, i) {
      tb.addEventListener('click', function () { selectTab(i); });
      tb.addEventListener('keydown', function (e) {
        var k = e.key, j = i;
        if (k === 'ArrowRight') j = (i + 1) % 7; else if (k === 'ArrowLeft') j = (i + 6) % 7;
        else if (k === 'Home') j = 0; else if (k === 'End') j = 6; else return;
        e.preventDefault(); selectTab(j, true);
      });
    });
    showDay(today);

    app.addEventListener('click', function (e) {
      var c = e.target.closest('.cell');
      if (!c) return;
      var on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      c.setAttribute('aria-label', c.dataset.base + (on ? ', 코치 ' + c.dataset.coach : '. 눌러서 코치 보기'));
    });
  }

  /* ---------------- 신청 폼 ---------------- */
  function initForm() {
    var form = $('#form'), hold = $('#hold'), msg = $('#form-msg');
    if (!form) return;
    var fill = $('.hold__fill', hold);
    var nameIn = $('#f-name'), telIn = $('#f-tel');

    $$('.prog__row').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="program"][value="' + a.dataset.program + '"]');
        if (r) r.checked = true;
      });
    });

    function setErr(input, text) {
      var el = document.getElementById(input.getAttribute('aria-describedby'));
      el.textContent = text;
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    [nameIn, telIn].forEach(function (i) { i.addEventListener('input', function () { setErr(i, ''); }); });
    function validate() {
      var ok = true;
      if (!nameIn.value.trim()) { setErr(nameIn, '이름을 적어 주세요.'); ok = false; }
      if (telIn.value.replace(/\D/g, '').length < 9) { setErr(telIn, '연락처를 숫자로 9자리 이상 적어 주세요. 예: 010-0000-0000'); ok = false; }
      if (!ok) {
        (nameIn.getAttribute('aria-invalid') ? nameIn : telIn).focus();
        msg.className = 'form__msg is-error';
        msg.textContent = '이름과 연락처를 먼저 적어 주세요.';
      }
      return ok;
    }
    function success() {
      var prog = (form.querySelector('input[name="program"]:checked') || {}).value || '크로스핏';
      var slot = (form.querySelector('input[name="slot"]:checked') || {}).value || '저녁';
      msg.className = 'form__msg';
      msg.innerHTML = '';
      var s = document.createElement('strong');
      s.textContent = nameIn.value.trim() + '님, ' + prog + ' 체험 신청을 받았습니다.';
      msg.appendChild(s);
      msg.appendChild(document.createTextNode(' ' + slot + ' 시간대로 코치가 하루 안에 전화드립니다. 컨셉 시안이라 실제로 접수되지는 않습니다.'));
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (validate()) success();
    });

    // 길게 누르기: 3초 동안 왼쪽에서 차오르고, 일찍 떼면 200ms에 되돌아간다
    var p = 0, raf = 0, state = 'idle', last = 0, from = 0, relStart = 0;
    function paint() { fill.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)'; }
    function step(now) {
      raf = 0;
      if (state === 'press') {
        p = Math.min(1, p + (now - last) / 3000);
        last = now;
        paint();
        if (p >= 1) { finish(); return; }
      } else if (state === 'release') {
        var k = Math.min(1, (now - relStart) / 200);
        var e = 1 - Math.pow(1 - k, 3);
        p = from * (1 - e);
        paint();
        if (k >= 1) { state = 'idle'; p = 0; paint(); return; }
      } else return;
      raf = requestAnimationFrame(step);
    }
    function start() {
      if (state === 'done') { reset(); }
      if (state === 'press') return;
      if (!validate()) return;
      msg.textContent = ''; msg.className = 'form__msg';
      state = 'press';
      last = performance.now();
      hold.classList.add('is-pressing');
      if (!raf) raf = requestAnimationFrame(step);
    }
    function release() {
      hold.classList.remove('is-pressing');
      if (state !== 'press') return;
      state = 'release'; from = p; relStart = performance.now();
      if (!raf) raf = requestAnimationFrame(step);
    }
    function finish() {
      state = 'done';
      hold.classList.remove('is-pressing');
      hold.classList.add('is-done');
      success();
    }
    function reset() { state = 'idle'; p = 0; paint(); hold.classList.remove('is-done'); }

    hold.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      try { hold.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      start();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { hold.addEventListener(t, release); });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    hold.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (!e.repeat) start();
    });
    hold.addEventListener('keyup', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      release();
    });
    hold.addEventListener('blur', release);
    hold.addEventListener('click', function (e) { e.preventDefault(); });
  }

  /* ---------------- 모바일 메뉴 ---------------- */
  function initSheet() {
    var btn = $('.nav__menu'), sheet = $('#sheet');
    if (!btn || !sheet) return;
    var open = false;
    function show() {
      open = true; sheet.hidden = false;
      btn.setAttribute('aria-expanded', 'true'); btn.textContent = '닫기';
      root.style.overflow = 'hidden';
      if (G && !reduceMQ.matches) G.from($$('.sheet__list li', sheet), { yPercent: -30, autoAlpha: 0, duration: 0.35, stagger: 0.04, ease: 'power3.out' });
      $('a', sheet).focus();
    }
    function hide(ret) {
      open = false; sheet.hidden = true;
      btn.setAttribute('aria-expanded', 'false'); btn.textContent = '메뉴';
      root.style.overflow = '';
      if (ret !== false) btn.focus();
    }
    btn.addEventListener('click', function () { if (open) hide(); else show(); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { hide(false); }); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
      if (e.key === 'Tab') {
        var f = [btn].concat($$('a', sheet)), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        else if (i === -1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches && open) hide(false); });
  }

  // 푸터 워드마크를 폭에 꼭 맞춘다
  function fitWord() {
    var w = $('.foot__word');
    if (!w) return;
    w.style.fontSize = '';
    var avail = w.parentElement.clientWidth - parseFloat(getComputedStyle(w.parentElement).paddingLeft) - parseFloat(getComputedStyle(w.parentElement).paddingRight);
    var fs = parseFloat(getComputedStyle(w).fontSize);
    var ratio = avail / w.offsetWidth;
    w.style.fontSize = Math.min(fs * ratio * 0.995, 400).toFixed(2) + 'px';
  }

  /* ---------------- 시작 ---------------- */
  safe(initSheet);
  safe(initSchedule);
  safe(initForm);
  safe(initReps);
  safe(fitLines);
  if (G) safe(initMotion); else root.classList.add('no-motion');

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('100px "Black Han Sans"', '들어라버텨한번더') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 800); })]).then(function () {
    safe(fitLines);
    safe(fitWord);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { safe(fitLines); });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { safe(fitLines); safe(fitWord); }, 150);
  }, { passive: true });
})();
