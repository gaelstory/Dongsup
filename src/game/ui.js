// The game's page: what you carry, the day, what the key would do, and the panels (building, spirits, the
// journal, the keys). Plain DOM over the canvas. It knows nothing of the game but what it is handed.
import './ui.css';
import { SPIRIT_LOOKS } from './models.js';
import { ANIMAL_ORDER, ANIMALS, BUILD_ORDER, BUILDINGS, ITEM_ORDER, ITEMS, JOB_ORDER, JOBS, SPIRIT_ORDER, SPIRITS } from './data.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const rgb = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})`;
const costChips = (cost, inv) =>
  Object.entries(cost)
    .map(([item, n]) => `<span class="chip${(inv[item] ?? 0) < n ? ' lack' : ''}"><em>${ITEMS[item].icon}</em>${ITEMS[item].name} <b>${n}</b></span>`)
    .join('');

/**
 * @param canvas the game's canvas (to give the mouse back to when a panel shuts)
 * @param on { build(type), demolish(), job(spirit, job), reset(), closed(), menu(name), rotate(), cancel(), quality(name) }
 * @param touch true on a phone or tablet: no keys are named, and there are buttons for what keys do
 */
export function createUI(canvas, on, touch = false) {
  const root = el('div');
  root.id = 'game-ui';
  root.innerHTML = `
    <div id="bubbles"></div>
    <div id="hud-day" class="card">
      <div class="when"><span class="day"></span><span class="hour"></span><span class="camp"></span></div>
      <div class="bar"><i></i></div>
      <div id="hud-goal"><b>할 일</b><span></span></div>
    </div>
    <div id="hud-inv"></div>
    <div id="toasts"></div>
    <div id="prompt" class="card"><kbd>E</kbd><span></span><div class="meter"><i></i></div></div>
    <div id="hint" class="card"></div>
    <div id="going" class="card"></div>
    <div id="place-buttons"><button data-place="rotate">↻ 돌리기</button><button data-place="cancel">✕ 취소</button></div>
    <div id="keys"><button data-menu="build"><kbd>B</kbd><em>🔨</em>짓기</button><button data-menu="spirits"><kbd>Tab</kbd><em>✨</em>정령</button><button data-menu="journal"><kbd>J</kbd><em>📖</em>도감</button><button data-menu="map"><kbd>M</kbd><em>🗺️</em>지도</button><button data-menu="help"><kbd>H</kbd><em>❔</em>도움말</button></div>
    <div id="panel"><div class="sheet"><header><h2></h2><span></span><button data-close>${touch ? '닫기' : '닫기 (Esc)'}</button></header><div class="body"></div></div></div>
    <div id="turn" class="card">📱 가로로 돌리면 더 넓게 보여요</div>
    <div id="fade"></div>`;
  document.body.appendChild(root);
  const $ = (sel) => root.querySelector(sel);
  const panel = $('#panel');
  const body = $('#panel .body');
  let open = null;
  let refresh = null;

  function show(name, title, sub, render) {
    open = name;
    refresh = () => {
      const top = body.scrollTop;
      $('#panel h2').textContent = title;
      $('#panel header span').textContent = typeof sub === 'function' ? sub() : sub;
      body.innerHTML = '';
      render(body);
      body.scrollTop = top;
    };
    refresh();
    panel.classList.add('on');
    document.body.classList.add('panel-open');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function close(relock = true) {
    if (!open) return;
    open = null;
    refresh = null;
    panel.classList.remove('on');
    document.body.classList.remove('panel-open');
    if (relock && !touch) canvas.requestPointerLock?.()?.catch?.(() => {});
    on.closed?.();
  }
  panel.addEventListener('pointerdown', (e) => {
    if (e.target === panel || e.target.closest('[data-close]')) close();
  });
  for (const b of root.querySelectorAll('[data-menu]')) b.addEventListener('click', () => on.menu(b.dataset.menu));
  for (const b of root.querySelectorAll('[data-place]')) b.addEventListener('click', () => on[b.dataset.place]());

  // ---- what you carry ----
  const chips = {};
  const invBox = $('#hud-inv');
  function setInventory(inv) {
    for (const item of ITEM_ORDER) {
      const n = inv[item] ?? 0;
      let chip = chips[item];
      if (!chip) {
        if (!n) continue;
        chip = chips[item] = el('span', 'chip', `<em>${ITEMS[item].icon}</em>${ITEMS[item].name} <b>0</b>`);
        chip.count = -1;
        // (kept in the order of ITEM_ORDER whatever order they were first found in)
        const after = ITEM_ORDER.slice(ITEM_ORDER.indexOf(item) + 1).map((i) => chips[i]).find(Boolean);
        invBox.insertBefore(chip, after ?? null);
      }
      if (chip.count !== n) {
        if (chip.count >= 0) {
          chip.classList.remove('bump');
          void chip.offsetWidth;
          chip.classList.add('bump');
        }
        chip.count = n;
        chip.querySelector('b').textContent = n;
      }
    }
    if (open && refresh) refresh();
  }

  // ---- messages ----
  const toasts = $('#toasts');
  function toast(html, big = false, seconds = 3.6) {
    const t = el('div', `toast card${big ? ' big' : ''}`, html);
    toasts.appendChild(t);
    while (toasts.children.length > 5) toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), seconds * 1000);
    setTimeout(() => t.remove(), seconds * 1000 + 600);
  }

  // ---- bubbles ----
  const bubbleBox = $('#bubbles');
  const bubbles = new Map();

  return {
    root,
    get open() {
      return open;
    },
    /** A panel of anyone's making: `render(into)` fills it. */
    openPanel: show,
    /** A line at the top while he runs somewhere by himself. null puts it away. */
    going(html) {
      const g = $('#going');
      g.classList.toggle('on', !!html);
      if (html && g.html !== html) {
        g.html = html;
        g.innerHTML = html;
      }
    },
    /** The buttons for turning and putting away what is being placed (for a thumb: a keyboard has R and X). */
    placing(onOrOff) {
      $('#place-buttons').classList.toggle('on', onOrOff && touch);
    },
    close,
    toast,
    setInventory,
    /** What you have just been given: "+2 나무". */
    gain(items, from = '') {
      const text = Object.entries(items)
        .filter(([, n]) => n > 0)
        .map(([item, n]) => `${ITEMS[item].icon} ${ITEMS[item].name} <b>+${n}</b>`)
        .join(' · ');
      if (text) toast(from ? `${from} ${text}` : text);
    },
    setDay(day, hourText, part, stars) {
      $('#hud-day .day').textContent = `${day}일째`;
      $('#hud-day .hour').textContent = hourText;
      $('#hud-day .bar i').style.width = `${Math.round(part * 100)}%`;
      $('#hud-day .camp').textContent = stars ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '';
    },
    setGoal(text) {
      $('#hud-goal').style.display = text ? '' : 'none';
      $('#hud-goal span').textContent = text ?? '';
    },
    /** What E would do now. null for nothing. `meter` 0 to 1 shows a bar (something being built). */
    prompt(text, { key = 'E', enabled = true, meter = null } = {}) {
      const p = $('#prompt');
      p.classList.toggle('on', !!text);
      if (!text) return;
      p.classList.toggle('off', !enabled);
      p.querySelector('kbd').textContent = key;
      p.querySelector('span').innerHTML = text;
      p.querySelector('.meter').style.display = meter === null ? 'none' : '';
      if (meter !== null) p.querySelector('.meter i').style.width = `${Math.round(meter * 100)}%`;
    },
    /** A line along the bottom while something is being placed. */
    hint(html) {
      const h = $('#hint');
      h.classList.toggle('on', !!html);
      if (html) h.innerHTML = html;
    },
    /** @param list [{ key, x, y, html }] in CSS pixels: what is said over whose head this frame */
    setBubbles(list) {
      const seen = new Set();
      for (const b of list) {
        seen.add(b.key);
        let node = bubbles.get(b.key);
        if (!node) {
          node = el('div', 'bubble');
          bubbleBox.appendChild(node);
          bubbles.set(b.key, node);
        }
        if (node.html !== b.html) {
          node.html = b.html;
          node.innerHTML = b.html;
        }
        node.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px) translate(-50%, -100%)`;
      }
      for (const [key, node] of bubbles) {
        if (seen.has(key)) continue;
        node.remove();
        bubbles.delete(key);
      }
    },
    /** The screen goes dark with a word on it, or comes back. Resolves when it has. */
    fade(onOrOff, text = '') {
      const f = $('#fade');
      if (onOrOff) f.textContent = text;
      f.classList.toggle('on', onOrOff);
      return new Promise((done) => setTimeout(done, 950));
    },

    // ---- panels ----
    openBuild(state) {
      show('build', '짓기', () => `캠핑장 ${'★'.repeat(state.stars())}${'☆'.repeat(5 - state.stars())} · 내 땅 안에 지을 수 있어요`, (into) => {
        const inv = state.inv();
        const grid = el('div', 'grid');
        for (const type of BUILD_ORDER) {
          const def = BUILDINGS[type];
          const can = Object.entries(def.cost).every(([item, n]) => (inv[item] ?? 0) >= n);
          const have = state.count(type);
          const b = el('button', 'item', `<h3>${def.name}${have ? `<small>${have}개 있음</small>` : ''}</h3><p>${def.desc}</p><div class="cost">${costChips(def.cost, inv)}</div>`);
          b.disabled = !can;
          b.addEventListener('click', () => {
            close();
            on.build(type);
          });
          grid.appendChild(b);
        }
        into.appendChild(grid);
        const foot = el('p', 'note');
        foot.style.margin = '14px 0 0';
        const down = el('button', 'warn', '철거하기');
        down.addEventListener('click', () => {
          close();
          on.demolish();
        });
        foot.append(down, ' 지은 것을 치우면 재료를 모두 돌려받아요.');
        into.appendChild(foot);
      });
    },
    openSpirits(state, focus = null) {
      show('spirits', '정령 친구들', () => `${state.friends().length} / ${state.capacity()} · 정령집을 지으면 더 머물 수 있어요`, (into) => {
        const friends = state.friends();
        if (!friends.length) {
          into.appendChild(el('p', 'note', '아직 친구가 된 정령이 없어요. 골짜기를 돌아다니다 보면 반짝이는 정령을 만날 수 있어요. 정령이 바라는 선물을 가져다주면 내 땅으로 따라와 일을 도와줍니다. 첫 정령은 큰 나무 아래에서 기다리고 있어요.'));
          return;
        }
        into.appendChild(el('p', 'note', '일을 맡기면 정령이 재료를 모아 내 땅의 바구니에 담아 둡니다. 노란 테두리는 그 정령이 특히 잘하는 일(두 배)이에요.'));
        for (const s of friends) {
          const kind = SPIRITS[s.kind];
          const row = el('div', 'row');
          row.appendChild(el('div', 'dot')).style.background = rgb(SPIRIT_LOOKS[s.kind][(s.sort ?? 0) % 3][0]);
          row.appendChild(el('div', 'who', `<b>${s.name}</b><small>${kind.name} · ${state.doing(s)}</small>`));
          const jobs = el('div', 'jobs');
          for (const job of JOB_ORDER) {
            const b = el('button', `${s.job === job ? 'on' : ''}${kind.best === job ? ' best' : ''}`, `${JOBS[job].icon} ${JOBS[job].name}`);
            b.addEventListener('click', () => {
              on.job(s, job);
              refresh?.();
            });
            jobs.appendChild(b);
          }
          row.appendChild(jobs);
          into.appendChild(row);
          if (focus === s) setTimeout(() => row.scrollIntoView({ block: 'center' }));
        }
      });
    },
    openJournal(state) {
      show('journal', '골짜기 도감', () => `${state.day()}일째`, (into) => {
        const cols = el('div', 'cols');
        cols.appendChild(el('h4', '', '정령'));
        for (const k of SPIRIT_ORDER) {
          const met = state.metSpirit(k);
          const kind = SPIRITS[k];
          const e = el('div', `entry${met ? '' : ' unknown'}`);
          e.appendChild(el('div', 'dot')).style.cssText = `width:30px;height:30px;border-radius:50%;flex:none;border:2px solid rgba(60,40,30,.5);background:${met ? rgb(kind.body) : '#cfc8b8'}`;
          e.appendChild(el('div', '', met ? `<b>${kind.name}</b><small>${ITEMS[kind.gift[0]].icon} ${ITEMS[kind.gift[0]].name} ${kind.gift[1]}개를 좋아해요 · ${JOBS[kind.best].name}을(를) 잘해요</small>` : `<b>???</b><small>${{ grove: '숲 그늘 어딘가에', stones: '바위 곁 어딘가에', tarn: '물가 어딘가에', flowers: '꽃이 핀 풀밭 어딘가에', hill: '바람 부는 언덕 어딘가에', campfire: '따뜻한 불가에', shade: '버섯이 돋는 그늘에', dusk: '해 질 녘 언덕에' }[kind.where]}</small>`));
          cols.appendChild(e);
        }
        cols.appendChild(el('h4', '', '동물'));
        for (const k of ANIMAL_ORDER) {
          const a = state.animal(k);
          const kind = ANIMALS[k];
          const e = el('div', `entry${a.met ? '' : ' unknown'}`);
          e.appendChild(el('div', '', a.met ? `<b>${kind.name} <span style="color:var(--berry)">${'♥'.repeat(a.hearts)}${'♡'.repeat(3 - a.hearts)}</span></b><small>${kind.says} ${ITEMS[kind.likes].icon} ${ITEMS[kind.likes].name}</small>` : '<b>???</b><small>아직 만나지 못했어요</small>'));
          cols.appendChild(e);
        }
        cols.appendChild(el('h4', '', '할 일'));
        for (const g of state.goals()) cols.appendChild(el('div', `entry${g.done ? ' done' : ''}`, `<div>${g.done ? '✔' : '·'} ${g.text}</div>`));
        into.appendChild(cols);
      });
    },
    openHelp(first = false) {
      show('help', first ? '정령의 골짜기에 오신 걸 환영해요' : '도움말', '', (into) => {
        into.appendChild(
          el(
            'p',
            'note',
            '언덕 위 깃발 말뚝으로 둘러싸인 곳이 <b>내 땅</b>이에요. 골짜기를 돌아다니며 반짝이는 재료를 모으고, 정령을 만나 친구가 되고, 내 땅에 캠핑장과 집을 지어 보세요. 정령에게 일을 맡기면 재료를 대신 모아 줍니다. 해가 지면 텐트에서 쉬고 새 아침을 맞아요.',
          ),
        );
        const keys = el('div', 'keys');
        const rows = touch
          ? [
              ['왼쪽 화면', '엄지를 대면 스틱이 나타나요. 살짝 밀면 살금살금(동물이 도망가지 않아요), 끝까지 밀면 달리기'],
              ['오른쪽 화면', '끌어서 둘러보기 · 두 손가락으로 벌리고 오므려 멀리/가까이'],
              ['✋ 버튼', '줍기 · 흔들기 · 선물하기 · 먹이 주기 · 짓기(누르고 있기) · 놓기'],
              ['⤒ / 🏃', '점프 / 전력 질주 켜고 끄기'],
              ['🔨 짓기', '고른 뒤 화면 가운데가 놓일 자리 — ↻ 돌리기, ✋ 놓기, ✕ 취소'],
              ['✨ 정령', '정령 친구들에게 일 맡기기'],
              ['📖 도감', '만난 정령과 동물, 할 일'],
              ['작은 지도', '오른쪽 위 지도를 누르면 큰 지도 — 베이스캠프를 누르면 달려갑니다'],
            ]
          : [
              ['W A S D', '걷기 · <b>Shift</b> 달리기 · <b>Alt</b> 살금살금 걷기 (동물이 도망가지 않아요)'],
              ['마우스', '둘러보기 · 휠로 멀리/가까이 · <b>V</b> 1인칭'],
              ['E', '줍기 · 흔들기 · 말 걸기 · 먹이 주기 · 짓기(누르고 있기)'],
              ['B', '짓기 메뉴 — 고른 뒤 <b>R</b> 회전, <b>클릭/E</b> 설치, <b>X</b> 취소'],
              ['Tab', '정령 친구들에게 일 맡기기'],
              ['J', '도감과 할 일'],
              ['M', '지도 — 베이스캠프를 누르면 달려갑니다 (오른쪽 위 작은 지도를 눌러도 돼요)'],
              ['Space', '점프'],
            ];
        for (const [k, text] of rows) keys.append(el('kbd', '', k), el('span', '', text));
        into.appendChild(keys);
        // how finely it is drawn: lighter for a slow machine or a hot phone
        const fine = el('p', 'note');
        fine.style.margin = '16px 0 0';
        fine.append('그래픽 품질 ');
        for (const [name, label] of [['low', '가볍게'], ['medium', '보통'], ['high', '곱게']]) {
          const b = el('button', on.qualityNow?.() === name ? 'on' : '', label);
          b.style.marginRight = '6px';
          b.addEventListener('click', () => on.quality(name));
          fine.appendChild(b);
        }
        fine.append(' (바꾸면 다시 불러옵니다)');
        into.appendChild(fine);
        const foot = el('p', 'note');
        foot.style.margin = '12px 0 0';
        const again = el('button', 'warn', '처음부터 다시 시작');
        again.addEventListener('click', () => {
          if (again.dataset.sure) on.reset();
          else {
            again.dataset.sure = 1;
            again.textContent = '정말 지울까요? 한 번 더 누르면 지워집니다';
          }
        });
        foot.append('게임은 이 브라우저에 자동으로 저장됩니다. ', again);
        into.appendChild(foot);
      });
    },
    refresh() {
      if (open && refresh) refresh();
    },
  };
}
