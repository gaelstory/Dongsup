// The game under a thumb: on a phone or a tablet there is no keyboard and the mouse is a finger. The left of the
// screen is a stick that appears where the thumb comes down; anywhere else, dragging looks round and two fingers
// pinch the eye nearer or farther. The buttons at the lower right do what E, Space and Shift do.
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

/** Keeps a finger's later moves coming to the thing it first touched, wherever it goes. */
const capture = (target, e) => {
  try {
    target.setPointerCapture?.(e.pointerId);
  } catch {
    // (a pointer the browser no longer knows: nothing to keep)
  }
};

/** Whether this is a device held in the hand: asked for with ?touch, or one whose first pointer is a finger. */
export function isTouchDevice(params = new URLSearchParams(location.search)) {
  if (params.has('touch')) return params.get('touch') !== '0';
  return window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches);
}

/**
 * @param o.input the walker's Input (its `touch` and `mouse` are written to)
 * @param o.root the game's page (#game-ui)
 * @param o.on { act(down), frozen() }: the action button pressed or let go; whether the walker should stand still
 */
export function createTouch({ input, root, on }) {
  document.body.classList.add('touch');
  const pad = el('div');
  pad.id = 'touch-pad';
  const stick = el('div', 'stick', '<i></i>');
  pad.appendChild(stick);
  const buttons = el('div');
  buttons.id = 'touch-buttons';
  const act = el('button', 'act', '<span>✋</span>');
  const jump = el('button', 'jump', '⤒');
  const run = el('button', 'run', '🏃');
  buttons.append(run, jump, act);
  // (under the rest of the page, so the cards and their buttons are touched first)
  root.prepend(pad);
  root.appendChild(buttons);

  const RADIUS = 56;
  let move = null; // { id, x0, y0 }
  const looks = new Map(); // pointer id -> last { x, y }
  let pinch = 0;
  const release = () => {
    move = null;
    input.touch.active = false;
    input.touch.x = input.touch.y = 0;
    stick.classList.remove('on');
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(pad, e);
    if (on.frozen()) return;
    if (!move && e.clientX < window.innerWidth * 0.45) {
      move = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
      stick.style.left = `${e.clientX}px`;
      stick.style.top = `${e.clientY}px`;
      stick.firstChild.style.transform = '';
      stick.classList.add('on');
      input.touch.active = true;
      return;
    }
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch = 0;
  });
  pad.addEventListener('pointermove', (e) => {
    if (move?.id === e.pointerId) {
      let dx = e.clientX - move.x0;
      let dy = e.clientY - move.y0;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS) {
        dx *= RADIUS / d;
        dy *= RADIUS / d;
      }
      stick.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
      // (a small dead middle, then all the way out is a run; a little tilt is a slow, quiet walk)
      const k = Math.max(0, Math.min(1, (Math.min(d, RADIUS) / RADIUS - 0.12) / 0.88));
      input.touch.x = d > 0 ? (dx / d) * k : 0;
      input.touch.y = d > 0 ? (-dy / d) * k : 0;
      return;
    }
    const last = looks.get(e.pointerId);
    if (!last) return;
    if (looks.size >= 2) {
      // two fingers: the distance between them is how far off the eye is
      last.x = e.clientX;
      last.y = e.clientY;
      const [a, b] = [...looks.values()];
      const apart = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) input.mouse.wheel += (pinch - apart) * 0.03;
      pinch = apart;
      return;
    }
    if (!on.frozen()) {
      input.mouse.x += (e.clientX - last.x) * 2.4;
      input.mouse.y += (e.clientY - last.y) * 2.0;
    }
    last.x = e.clientX;
    last.y = e.clientY;
  });
  const up = (e) => {
    if (move?.id === e.pointerId) release();
    looks.delete(e.pointerId);
    pinch = 0;
  };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);
  pad.addEventListener('contextmenu', (e) => e.preventDefault());

  const hold = (button, down, upFn) => {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(button, e);
      button.classList.add('down');
      down();
    });
    const end = () => {
      button.classList.remove('down');
      upFn?.();
    };
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  hold(act, () => on.act(true), () => on.act(false));
  hold(jump, () => {
    input.touch.jump = true;
  });
  run.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.touch.sprint = !input.touch.sprint;
    run.classList.toggle('on', input.touch.sprint);
  });

  return {
    /** What the action button would do now: its picture and whether it can. */
    setAction(icon, enabled) {
      if (act.icon !== icon) {
        act.icon = icon;
        act.firstChild.textContent = icon;
      }
      act.classList.toggle('off', !enabled);
    },
    /** When the walker must stand still (a panel is open), the thumb's hold is let go. */
    update() {
      if (move && on.frozen()) release();
    },
  };
}
