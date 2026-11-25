/* 헤비클럽: 폭 맞춤 세 줄, 스크롤 속도 키네틱 타입, 마키, 원판이 끼워지는 반복 카운터, 시간표, 길게 눌러 신청. */
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
      G.set('.strip, .line__kin, .kin', { clearProps: 'transform,opacity,visibility' });
      G.set('.ch', { yPercent: 0 });
      $('.hero').classList.remove('is-dropping');
    } catch (e) { /* 정적 상태로 둔다 */ }
  }

  /* ---------------- 세 줄 맞춤 ---------------- */
  // 좁은 화면: 폭에 맞춘 뒤 세로로 늘려 높이를 채운다.
  // 넓은 화면: 높이에 맞춘 글자를 가로로 늘려(최대 2.1배) 폭을 채우고, 글자 사이는 좁게 둔다.
  // 그래도 모자라면(낮고 넓은 화면) 글자를 키우고 히어로가 화면보다 길어진다.
  var fitState = { fs: 0, scaleY: 1, lineH: 0, wide: false };
  var measureCanvas = document.createElement('canvas');
  function setSX(el, sx) {
    if (G) G.set(el, { scaleX: sx, transformOrigin: '0% 50%' });
    else { el.style.transformOrigin = '0 50%'; el.style.transform = 'scaleX(' + sx + ')'; }
  }
  function fitLines() {
    var linesEl = $('.lines');
    if (!linesEl) return;
    var cs = getComputedStyle(linesEl);
    var W = linesEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var barH = $('.bar').offsetHeight;
    var stripH = $('.strip').offsetHeight;
    var H = Math.max(window.innerHeight, 520) - barH - stripH - parseFloat(cs.paddingTop);
    var lineH0 = H / 3;
    var ctx = measureCanvas.getContext('2d');
    ctx.font = '100px "Black Han Sans"';
    var lines = $$('.line', linesEl);
    var maxW = 0, aA = 0, aD = 0, fA = 0.88, fD = 0.22;
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
    var fsW = W / (maxW * 1.04);
    var fsH = lineH0 / gh;
    var fs, lineH, scaleY = 1, wide;
    if (fsW <= fsH) {
      wide = false; fs = fsW; lineH = lineH0; scaleY = lineH / (gh * fs);
    } else {
      wide = true;
      var fsMin = W / (2.1 * maxW + 2 * 0.12 * gh);
      fs = Math.max(fsH, fsMin, 150 / gh);
      lineH = gh * fs;
    }
    var glyphTop = ((1 - (fA + fD)) / 2 + fA - aA) * fs;
    linesEl.style.fontSize = fs.toFixed(2) + 'px';
    linesEl.style.setProperty('--lh', lineH.toFixed(2) + 'px');
    linesEl.classList.add('is-fit');
    $$('.line__fit', linesEl).forEach(function (f) {
      f.style.transform = 'translateY(' + (-glyphTop * scaleY).toFixed(2) + 'px) scaleY(' + scaleY.toFixed(4) + ')';
    });
    lines.forEach(function (ln) {
      var chs = $$('.ch', ln);
      chs.forEach(function (c) { c.style.marginRight = ''; setSX(c, 1); });
      if (!wide) return;
      var widths = chs.map(function (c) { return c.offsetWidth; });
      var sum = widths.reduce(function (a, b) { return a + b; }, 0);
      var gap = 0.08 * lineH;
      var sx = Math.max(1, Math.min(2.1, (W - gap * (chs.length - 1)) / sum));
      chs.forEach(function (c, i) {
        c.style.marginRight = ((sx - 1) * widths[i]).toFixed(2) + 'px';
        setSX(c, sx);
      });
    });
    fitState.fs = fs; fitState.scaleY = scaleY; fitState.lineH = lineH; fitState.wide = wide;
    placeBarbell();
  }

  var barbellRest = 0;
  function placeBarbell() {
    var parts = $$('.barbell'), line2 = $('.line--2');
    if (!parts.length || !line2) return;
    var chs = $$('.ch', line2);
    var lr = line2.getBoundingClientRect();
    var a = chs[1].getBoundingClientRect(), b = chs[2].getBoundingClientRect();
    var lineH = fitState.lineH;
    // 왼쪽 원판 묶음(가로 16.9%)은 마지막 글자 앞 틈에, 오른쪽 봉 끝은 화면 안쪽 24px에
    var x1 = (a.right + b.left) / 2 - lr.left;
    var sleeveEnd = (window.innerWidth - 24) - lr.left;
    var w = (sleeveEnd - x1) / 0.831;
    var h = w / 5, rest;
    if (h < lineH * 0.4) {
      // 좁은 화면: 마지막 글자 위에 걸치고 오른쪽은 화면 밖으로
      h = lineH * 0.56; w = h * 5;
      rest = (b.left - lr.left) + b.width * 0.18 - w * 0.17;
    } else {
      if (h > lineH * 0.8) { h = lineH * 0.8; w = h * 5; }
      rest = sleeveEnd - w;
    }
    barbellRest = rest;
    parts.forEach(function (p) { p.style.height = h.toFixed(1) + 'px'; });
    if (!G) { parts.forEach(function (p) { p.style.transform = 'translate(' + rest.toFixed(1) + 'px, -50%)'; }); return; }
    if (!parts[0].dataset.moving) G.set(parts, { x: rest, yPercent: -50 });
  }

  /* ---------------- 인트로 + 속도 ---------------- */
  function initMotion() {
    var plugins = [window.ScrollTrigger, window.CustomEase].filter(Boolean);
    G.registerPlugin.apply(G, plugins);
    var ST = window.ScrollTrigger;
    var hero = $('.hero');
    var bb = $$('.barbell');
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
    bb.forEach(function (p) { p.dataset.moving = '1'; });
    var tl = G.timeline({ paused: true });
    tl.from('.ch', { yPercent: -120, duration: 0.62, ease: plate, stagger: 0.03 }, 0)
      .from('.strip', { yPercent: 100, duration: 0.55, ease: 'power3.out' }, 0.1)
      .to('.lines', { y: 7, duration: 0.07, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.69)
      .add(function () { hero.classList.remove('is-dropping'); }, 0.87);
    G.set(bb, { x: -4000 });
    fontGate.then(function () {
      safe(fitLines);
      tl.play();
      G.fromTo(bb, { x: -bb[0].getBoundingClientRect().width - 60 }, {
        x: barbellRest, duration: 1.0, ease: 'power4.out', delay: 0.57,
        onComplete: function () { bb.forEach(function (p) { delete p.dataset.moving; }); }
      });
    });
    return function () {
      tl.kill(); hero.classList.remove('is-dropping');
      bb.forEach(function (p) { delete p.dataset.moving; });
      G.set(bb, { x: barbellRest });
    };
  }

  // 빨리 내릴수록 글자가 늘어나고 기운다. 천천히 읽을 때는 꼼짝하지 않는다.
  function velocity(maxS) {
    var hero = $$('.line__kin'), heads = $$('.kin');
    var els = hero.concat(heads);
    var sy = els.map(function (el) { return G.quickTo(el, 'scaleY', { duration: 0.4, ease: 'power3.out' }); });
    var sk = els.map(function (el) { return G.quickTo(el, 'skewX', { duration: 0.4, ease: 'power3.out' }); });
    var idle = 0;
    function settle() { els.forEach(function (el, i) { sy[i](1); sk[i](0); }); }
    var st = window.ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var v = self.getVelocity();
        var n = G.utils.clamp(0, 1, (Math.abs(v) - 300) / 2100) * (v < 0 ? -1 : 1);
        var s = 1 + Math.abs(n) * (maxS - 1);
        els.forEach(function (el, i) {
          sy[i](s);
          sk[i](-n * (i < hero.length ? 8 : 5));
        });
        clearTimeout(idle);
        idle = setTimeout(settle, 90);
      }
    });
    return function () { clearTimeout(idle); st.kill(); };
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

  /* ---------------- 반복 카운터: 배지 옆, 5회마다 원판 한 쌍 ---------------- */
  function initReps() {
    var box = $('#reps'), num = $('#reps-num'), done = $('.reps__done'), msgEl = $('.reps__msg');
    if (!box) return;
    var lastY = window.scrollY, total = 0, reps = 0, finished = false, ticking = false;
    var tuckApply = false, tuckFocus = false;
    function sync() {
      box.classList.toggle('is-hidden', window.scrollY < 120 && reps === 0);
      box.classList.toggle('is-tucked', tuckApply || tuckFocus);
    }
    // 컨셉 배지 오른쪽에 붙인다 (배지 폭은 글꼴에 따라 다르다)
    function dock() {
      var badge = $('.concept-badge');
      if (badge && badge.offsetWidth) {
        var r = badge.getBoundingClientRect();
        var left = Math.round(r.right + 8);
        root.style.setProperty('--reps-left', left + 'px');
      }
    }
    window.addEventListener('load', dock);
    setTimeout(dock, 300);
    window.addEventListener('resize', dock, { passive: true });
    // 신청 칸이 보이거나 입력 중이면 비켜 준다
    var apply = $('#apply');
    if (apply && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { tuckApply = en[0].isIntersecting; sync(); }).observe(apply);
    }
    document.addEventListener('focusin', function (e) { tuckFocus = !!(e.target.closest && e.target.closest('input, textarea, select')); sync(); });
    document.addEventListener('focusout', function () { tuckFocus = false; sync(); });

    function update() {
      ticking = false;
      var y = window.scrollY;
      total += Math.abs(y - lastY);
      lastY = y;
      var r = Math.floor(total / 600);
      if (r !== reps) {
        reps = r;
        num.textContent = reps;
        var loaded = Math.min(4, Math.floor(reps / 5));
        $$('.reps__p', box).forEach(function (p) { p.classList.toggle('is-on', +p.getAttribute('data-i') <= loaded); });
        if (G && !reduceMQ.matches) G.fromTo(num, { scaleY: 1.45 }, { scaleY: 1, duration: 0.4, ease: 'back.out(3)', overwrite: true });
        if (reps >= 20 && !finished) {
          finished = true;
          var line = '오늘 운동 끝. 이제 진짜 하러 오세요.';
          done.textContent = line;
          msgEl.textContent = line;
          box.classList.add('is-done');
          if (G && !reduceMQ.matches) G.from(msgEl, { xPercent: -8, opacity: 0, duration: 0.35, ease: 'power3.out' });
          setTimeout(function () { msgEl.textContent = ''; done.textContent = ''; box.classList.remove('is-done'); }, 7000);
        }
      }
      sync();
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    sync();
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
  var WEEKDAY = [
    ['06:30', ['cf', 'bc', 'cf', 'bc', 'cf', null, null]],
    ['07:30', ['wt', 'cf', 'wt', 'cf', 'wt', null, null]],
    ['12:10', ['bc', 'wt', 'bc', 'wt', 'bc', null, null]],
    ['19:00', ['cf', 'cf', 'cf', 'cf', 'cf', null, null]],
    ['20:10', ['wt', 'bc', 'wt', 'bc', 'tw', null, null]],
    ['21:20', ['bc', 'cf', 'bc', 'cf', null, null, null]]
  ];
  var WEEKEND = [
    ['10:00', [null, null, null, null, null, 'tw', 'og']],
    ['11:30', [null, null, null, null, null, 'wt', 'bc']]
  ];
  var ROWS = WEEKDAY.concat(WEEKEND);

  function cellHTML(kind, d, time) {
    var k = KIND[kind];
    var cls = 'cell cell--' + (k.cls || kind);
    var base = DAYL[d] + ' ' + time + ' ' + k.name;
    return '<button class="' + cls + '" type="button" tabindex="-1" aria-pressed="false" data-coach="' + k.coach + '" data-base="' + base + '" aria-label="' + base + '. 눌러서 코치 보기">' +
      '<span class="cell__in" aria-hidden="true">' +
      '<span class="cell__face cell__face--front"><span class="cell__name">' + k.name + '</span><span class="cell__sub">' + k.sub + '</span></span>' +
      '<span class="cell__face cell__face--back"><span class="cell__name">코치</span><b>' + k.coach + '</b><span class="cell__sub">' + time + ' ' + k.name + '</span></span>' +
      '</span></button>';
  }
  function emptyCell() { return '<span class="tt__empty"><span class="sr-only">수업 없음, 자유 이용</span></span>'; }

  function initSchedule() {
    var app = $('#sched-app');
    if (!app) return;
    var today = (new Date().getDay() + 6) % 7;
    function rowsHTML(rows) {
      return rows.map(function (r) {
        return '<tr><th scope="row">' + r[0] + '</th>' + r[1].map(function (k, d) {
          return '<td' + (d === today ? ' class="is-today"' : '') + '>' + (k ? cellHTML(k, d, r[0]) : emptyCell()) + '</td>';
        }).join('') + '</tr>';
      }).join('');
    }
    var t = '<div class="sched__wide"><table class="tt" role="grid" aria-label="이번 주 수업 시간표. 방향키로 칸을 옮기고 Enter로 코치를 봅니다."><thead><tr><th scope="col"><span class="sr-only">시간</span></th>';
    DAYS.forEach(function (d, i) {
      t += '<th scope="col" abbr="' + DAYL[i] + '"' + (i === today ? ' class="is-today"' : '') + '>' + d + (i === today ? '<small>오늘</small>' : '') + '</th>';
    });
    t += '</tr></thead><tbody>' + rowsHTML(WEEKDAY) + '</tbody>';
    t += '<tbody class="tt__weekend"><tr><th scope="colgroup" colspan="8">주말 수업</th></tr>' + rowsHTML(WEEKEND) + '</tbody></table>';
    t += '<p class="tt-legend"><span><i class="is-cf"></i>크로스핏</span><span><i class="is-wt"></i>웨이트 입문</span><span><i class="is-bc"></i>바디 서킷</span><span class="tt-legend__free"><i></i>수업 없는 시간은 자유 이용</span></p></div>';
    var n = '<div class="sched__narrow"><div class="days" role="tablist" aria-label="요일">';
    DAYS.forEach(function (d, i) {
      n += '<button type="button" role="tab" id="day-tab-' + i + '" aria-controls="day-panel" aria-selected="' + (i === today) + '" tabindex="' + (i === today ? 0 : -1) + '"' + (i === today ? ' class="is-today"' : '') + ' aria-label="' + DAYL[i] + (i === today ? ', 오늘' : '') + '">' + d + '</button>';
    });
    n += '</div><div class="daypanel" id="day-panel" role="tabpanel" aria-labelledby="day-tab-' + today + '"></div></div>';
    app.innerHTML = t + n;

    // 넓은 표: 칸 하나만 Tab에 걸리고 방향키로 움직인다
    var grid = [];
    $$('.sched__wide tbody tr', app).forEach(function (tr) {
      var cells = $$('td', tr);
      if (!cells.length) return;
      grid.push(cells.map(function (td) { return $('.cell', td); }));
    });
    var start = null;
    for (var r = 0; r < grid.length && !start; r++) if (grid[r][today]) start = grid[r][today];
    if (!start) for (r = 0; r < grid.length && !start; r++) start = grid[r].filter(Boolean)[0] || null;
    if (start) start.tabIndex = 0;
    function rove(to) {
      if (!to) return;
      $$('.sched__wide .cell', app).forEach(function (c) { c.tabIndex = -1; });
      to.tabIndex = 0; to.focus();
    }
    function find(r0, c0, dr, dc) {
      var r = r0 + dr, c = c0 + dc;
      while (r >= 0 && r < grid.length && c >= 0 && c < 7) {
        if (grid[r][c]) return grid[r][c];
        r += dr; c += dc;
      }
      return null;
    }
    $('.sched__wide', app).addEventListener('keydown', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell) return;
      var rr = -1, cc = -1;
      grid.forEach(function (row, i) { var j = row.indexOf(cell); if (j > -1) { rr = i; cc = j; } });
      var to = null;
      switch (e.key) {
        case 'ArrowRight': to = find(rr, cc, 0, 1); break;
        case 'ArrowLeft': to = find(rr, cc, 0, -1); break;
        case 'ArrowDown': to = find(rr, cc, 1, 0); break;
        case 'ArrowUp': to = find(rr, cc, -1, 0); break;
        case 'Home': to = grid[rr].filter(Boolean)[0]; break;
        case 'End': to = grid[rr].filter(Boolean).slice(-1)[0]; break;
        default: return;
      }
      e.preventDefault();
      rove(to);
    });

    var panel = $('#day-panel', app);
    function showDay(d) {
      var items = ROWS.filter(function (r) { return r[1][d]; });
      if (!items.length) { panel.innerHTML = '<p class="daylist__none">이날은 수업이 없습니다. 24시간 자유 이용은 그대로입니다.</p>'; return; }
      panel.innerHTML = '<ul class="daylist">' + items.map(function (r) {
        return '<li><span class="daylist__time">' + r[0] + '</span>' + cellHTML(r[1][d], d, r[0]) + '</li>';
      }).join('') + '</ul>';
      var cells = $$('.cell', panel);
      cells[0].tabIndex = 0;
      panel.setAttribute('aria-labelledby', 'day-tab-' + d);
    }
    panel.addEventListener('keydown', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell) return;
      var cells = $$('.cell', panel), i = cells.indexOf(cell), j = i;
      if (e.key === 'ArrowDown') j = Math.min(cells.length - 1, i + 1);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = cells.length - 1;
      else return;
      e.preventDefault();
      cells.forEach(function (c) { c.tabIndex = -1; });
      cells[j].tabIndex = 0; cells[j].focus();
    });
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
      if (c.closest('.sched__wide')) { $$('.sched__wide .cell', app).forEach(function (x) { x.tabIndex = -1; }); c.tabIndex = 0; }
      var on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      c.setAttribute('aria-label', c.dataset.base + (on ? ', 코치 ' + c.dataset.coach : '. 눌러서 코치 보기'));
    });
  }

  /* ---------------- 신청 폼 ---------------- */
  function initForm() {
    var form = $('#form'), hold = $('#hold'), msg = $('#form-msg'), hint = $('#hold-hint');
    if (!form) return;
    var fill = $('.hold__fill', hold);
    var labels = $$('.hold__label', hold);
    var zero = $('.apply__zero-num');
    var nameIn = $('#f-name'), telIn = $('#f-tel');
    var HINT = hint.textContent, LABEL = '꾹 눌러 체험 신청 (3초)';
    var hintT = 0;

    $$('.prog__row').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="program"][value="' + a.dataset.program + '"]');
        if (r) r.checked = true;
      });
    });

    function setLabel(t) { labels.forEach(function (l) { l.textContent = t; }); }
    function setErr(input, text) {
      var el = document.getElementById(input.getAttribute('aria-describedby'));
      el.textContent = text;
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    [nameIn, telIn].forEach(function (i) { i.addEventListener('input', function () { setErr(i, ''); }); });
    function check() {
      var ok = true;
      if (!nameIn.value.trim()) { setErr(nameIn, '이름을 적어 주세요.'); ok = false; }
      if (telIn.value.replace(/\D/g, '').length < 9) { setErr(telIn, '연락처를 숫자로 9자리 이상 적어 주세요. 예: 010-0000-0000'); ok = false; }
      if (!ok) {
        msg.className = 'form__msg is-error';
        msg.textContent = '이름과 연락처를 먼저 적어 주세요.';
      }
      return ok;
    }
    function firstInvalid() { return nameIn.getAttribute('aria-invalid') ? nameIn : telIn; }
    function success() {
      var prog = (form.querySelector('input[name="program"]:checked') || {}).value || '크로스핏';
      var slot = (form.querySelector('input[name="slot"]:checked') || {}).value || '저녁';
      msg.className = 'form__msg';
      msg.innerHTML = '';
      var s = document.createElement('strong');
      s.textContent = nameIn.value.trim() + '님, ' + prog + ' 체험 신청을 받았습니다.';
      msg.appendChild(s);
      msg.appendChild(document.createTextNode(' ' + slot + ' 시간대로 코치가 하루 안에 전화드립니다. 컨셉 시안이라 실제로 접수되지는 않습니다.'));
      var r = msg.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 60 || r.top < 80) msg.scrollIntoView({ block: 'center', behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (check()) { success(); markDone(); } else firstInvalid().focus();
    });

    // 길게 누르기: 3초 동안 차오르고, 숫자가 3, 2, 1로 줄어든다. 일찍 떼면 200ms에 되돌아간다.
    var p = 0, raf = 0, state = 'idle', last = 0, from = 0, relStart = 0, shown = 3;
    var lift = !!zero;
    function paint() {
      fill.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)';
      if (lift && !reduceMQ.matches) zero.style.transform = 'translateY(' + (-24 * p).toFixed(1) + 'px) scaleY(' + (1 + 0.15 * p).toFixed(3) + ')';
    }
    function step(now) {
      raf = 0;
      if (state === 'press') {
        p = Math.min(1, p + (now - last) / 3000);
        last = now;
        var left = Math.max(1, Math.ceil(3 - p * 3));
        if (left !== shown) { shown = left; setLabel('꾹 눌러 체험 신청 (' + left + '초)'); }
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
      if (state === 'done' || state === 'press') return false;
      if (!check()) return false;
      msg.textContent = ''; msg.className = 'form__msg';
      state = 'press'; shown = 3;
      last = performance.now();
      hold.classList.add('is-pressing');
      if (!raf) raf = requestAnimationFrame(step);
      return true;
    }
    function release() {
      hold.classList.remove('is-pressing');
      if (state !== 'press') return;
      state = 'release'; from = p; relStart = performance.now();
      setLabel(LABEL); shown = 3;
      hint.textContent = '조금만 더. 3초 동안 누르고 계세요.';
      clearTimeout(hintT);
      hintT = setTimeout(function () { hint.textContent = HINT; }, 2000);
      if (!raf) raf = requestAnimationFrame(step);
    }
    function markDone() {
      var fromHold = state === 'press';
      state = 'done';
      p = 1;
      fill.style.clipPath = 'inset(0 0 0 0)';
      hold.classList.remove('is-pressing');
      hold.classList.add('is-done');
      hold.setAttribute('aria-disabled', 'true');
      setLabel('신청 완료');
      clearTimeout(hintT); hint.textContent = '신청을 받았습니다. 내용을 고치면 다시 신청할 수 있습니다.';
      if (zero) zero.style.transform = '';
      if (fromHold && lift && G && !reduceMQ.matches) {
        // 들어 올린 0원을 내려놓는다: 원판처럼 쿵
        G.fromTo(zero, { y: -24, scaleY: 1.15, transformOrigin: '0% 100%' }, { y: 0, scaleY: 1, duration: 0.55, ease: 'bounce.out', clearProps: 'transform' });
        G.fromTo('.apply__inner', { y: 0 }, { y: 6, duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.out', delay: 0.32 });
      }
    }
    function finish() { success(); markDone(); }
    function reset() {
      if (state !== 'done') return;
      state = 'idle'; p = 0; paint();
      hold.classList.remove('is-done');
      hold.removeAttribute('aria-disabled');
      setLabel(LABEL);
      hint.textContent = HINT;
      if (zero) zero.style.transform = '';
    }
    form.addEventListener('input', reset);
    form.addEventListener('change', reset);

    hold.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (!start()) {
        if (state !== 'done') {
          e.preventDefault();
          var f = firstInvalid();
          requestAnimationFrame(function () { f.focus(); });
        }
        return;
      }
      try { hold.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { hold.addEventListener(t, release); });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    hold.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;
      if (!start() && state !== 'done') firstInvalid().focus();
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
      // 초점을 먼저 옮기고, 움직임은 투명도와 위치만 쓴다
      $('a', sheet).focus();
      if (G && !reduceMQ.matches) G.from($$('.sheet__list li', sheet), { yPercent: -30, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power3.out' });
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
    var pcs = getComputedStyle(w.parentElement);
    var avail = w.parentElement.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight);
    var fs = parseFloat(getComputedStyle(w).fontSize);
    w.style.fontSize = Math.min(fs * (avail / w.offsetWidth) * 0.995, 400).toFixed(2) + 'px';
  }

  // §2.8 한 화면 한 주 버튼: 히어로 띠의 버튼이나 신청 칸이 보이는 동안 헤더 버튼은 채우지 않는다
  function initBarCta() {
    var bar = $('#bar'), strip = $('.strip'), apply = $('#apply');
    if (!bar || !strip || !('IntersectionObserver' in window)) { if (bar) bar.classList.add('is-past-hero'); return; }
    var stripOn = true, applyOn = false;
    function sync() { bar.classList.toggle('is-past-hero', !stripOn && !applyOn); }
    new IntersectionObserver(function (en) { stripOn = en[0].isIntersecting; sync(); }).observe(strip);
    if (apply) new IntersectionObserver(function (en) { applyOn = en[0].isIntersecting; sync(); }).observe(apply);
  }

  /* ---------------- 시작 ---------------- */
  safe(initBarCta);
  safe(initSheet);
  safe(initSchedule);
  safe(initForm);
  safe(initReps);
  safe(fitLines);
  if (G) safe(initMotion); else root.classList.add('no-motion');

  Promise.race([fontGate, new Promise(function (r) { setTimeout(r, 800); })]).then(function () {
    safe(fitLines);
    safe(fitWord);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { safe(fitLines); safe(fitWord); });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { safe(fitLines); safe(fitWord); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 150);
  }, { passive: true });
})();
