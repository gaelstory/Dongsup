// HAEON Systems page behavior: header, menu, hero scene, scroll moments, console pager, form.
// Every piece of content is visible without this file; it only adds motion and interaction.

const root = document.documentElement;
const SHOT = /[?&]shot=1/.test(location.search);
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const isReduced = () => mqReduce.matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

/* ---------------------------------------------------------------- header */
const header = $('.site-header');
let headTick = false;
function syncHeader() {
  headTick = false;
  header.classList.toggle('is-scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', () => { if (!headTick) { headTick = true; requestAnimationFrame(syncHeader); } }, { passive: true });
syncHeader();

/* ---------------------------------------------------------------- mobile menu */
const menuBtn = $('.menu-btn');
const nav = $('#site-nav');
const menuLabel = menuBtn.querySelector('.sr-only');
function setMenu(open, focusFirst = true) {
  header.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuLabel.textContent = open ? '메뉴 닫기' : '메뉴 열기';
  if (open && focusFirst) requestAnimationFrame(() => nav.querySelector('a').focus());
}
const menuOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
menuBtn.addEventListener('click', () => setMenu(!menuOpen()));
nav.addEventListener('click', (e) => { if (e.target.closest('a') && menuOpen()) setMenu(false, false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen()) { setMenu(false, false); menuBtn.focus(); }
});
document.addEventListener('pointerdown', (e) => { if (menuOpen() && !header.contains(e.target)) setMenu(false, false); });
header.addEventListener('focusout', (e) => { if (menuOpen() && e.relatedTarget && !header.contains(e.relatedTarget)) setMenu(false, false); });
window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => { if (e.matches) setMenu(false, false); });

/* ---------------------------------------------------------------- hero scene */
const hero = $('.hero');
const visual = $('.hero-visual');
const twinBtn = $('.twin-toggle');
let scene = null;

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) { return false; }
}

twinBtn.addEventListener('click', () => {
  const on = twinBtn.getAttribute('aria-checked') !== 'true';
  twinBtn.setAttribute('aria-checked', String(on));
  root.classList.toggle('is-twin', on);
  if (scene) scene.setTwin(on);
});

function wireScene() {
  $$('.service-links a').forEach((a) => {
    const key = a.dataset.node;
    a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') scene.setFocus(key); });
    a.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && document.activeElement !== a) scene.setFocus(null); });
    a.addEventListener('focus', () => scene.setFocus(key));
    a.addEventListener('blur', () => scene.setFocus(null));
  });
  if (twinBtn.getAttribute('aria-checked') === 'true') scene.setTwin(true);
  // leaving the hero: the camera rises and leans forward
  const gsap = window.gsap;
  if (gsap && window.ScrollTrigger && !SHOT && !isReduced()) {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      onUpdate: () => scene.setScroll(proxy.p),
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }
}

if (hasWebGL2()) {
  // the illustrated fallback only shows if the 3D scene cannot start
  root.classList.add('webgl-pending');
  if (SHOT || isReduced()) root.classList.add('is-still');
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  import('./scene.js')
    .then(({ createHarbor }) => {
      visual.appendChild(canvas);
      scene = createHarbor(canvas, {
        mobile: window.innerWidth < 768,
        still: SHOT || isReduced(),
        onReady() {
          canvas.classList.add('is-ready');
          window.setTimeout(() => root.classList.add('has-webgl'), SHOT ? 0 : 650);
        },
      });
      wireScene();
    })
    .catch((err) => {
      canvas.remove();
      root.classList.remove('has-webgl', 'webgl-pending');
      console.warn('[haeon] 3D scene unavailable, the illustrated night view stays.', err);
    });
}

/* ---------------------------------------------------------------- operations console pager (narrow screens) */
const grid = $('#console-grid');
const pagerBtns = $$('.pager-btn');
pagerBtns.forEach((b) => b.addEventListener('click', () => {
  grid.scrollTo({ left: grid.clientWidth * Number(b.dataset.page), behavior: isReduced() ? 'auto' : 'smooth' });
}));
let pageTick = false;
grid.addEventListener('scroll', () => {
  if (pageTick) return; pageTick = true;
  requestAnimationFrame(() => {
    pageTick = false;
    const page = Math.round(grid.scrollLeft / Math.max(1, grid.clientWidth));
    pagerBtns.forEach((b, i) => { if (i === page) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  });
}, { passive: true });
pagerBtns.forEach((b, i) => { if (i) b.removeAttribute('aria-current'); });

/* ---------------------------------------------------------------- contact form */
const form = $('#lead-form');
const done = $('#form-done');
const checks = {
  company: (el) => el.value.trim().length > 0,
  name: (el) => el.value.trim().length > 0,
  phone: (el) => el.value.replace(/[^0-9]/g, '').length >= 9,
  type: (el) => el.value !== '',
  message: (el) => el.value.trim().length >= 10,
  agree: (el) => el.checked,
};
function validate(el) {
  const ok = checks[el.name] ? checks[el.name](el) : true;
  const err = document.getElementById('e-' + (el.name === 'message' ? 'msg' : el.name));
  if (err) err.hidden = ok;
  if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
  return ok;
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  Object.keys(checks).forEach((n) => { const el = form.elements[n]; if (!validate(el) && !first) first = el; });
  if (first) { first.focus(); return; }
  $('.done-company', done).textContent = form.elements.company.value.trim();
  form.hidden = true;
  done.hidden = false;
  done.focus();
});
form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target); });
form.addEventListener('change', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target); });
$('#form-reset').addEventListener('click', () => {
  form.reset();
  done.hidden = true;
  form.hidden = false;
  form.elements.company.focus();
});

/* ---------------------------------------------------------------- scroll moments (GSAP) */
const gsap = window.gsap;
if (gsap && window.ScrollTrigger) {
  try {
    const plugins = [window.ScrollTrigger, window.DrawSVGPlugin, window.MotionPathPlugin].filter(Boolean);
    gsap.registerPlugin(...plugins);
    const canDraw = !!window.DrawSVGPlugin, canPath = !!window.MotionPathPlugin;

    const orbitDot = (svg, still) => {
      const path = svg.querySelector('.orbit'), dot = svg.querySelector('.orbit-dot');
      if (!path || !dot || !canPath) return null;
      const tw = gsap.to(dot, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, duration: 11, ease: 'none', repeat: -1, paused: true });
      tw.progress(still ? 0.18 : 0.02);
      return tw;
    };

    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 900px)' }, (ctx) => {
      const { motion, wide } = ctx.conditions;
      const still = !motion || SHOT;

      // pipeline geometry for the vertical (narrow) layout
      const vSvg = $('.pipe-v'), vPath = $('#pipe-path-v');
      if (!wide && vSvg) {
        const h = Math.max(100, Math.round(vSvg.getBoundingClientRect().height));
        vSvg.setAttribute('viewBox', `0 0 40 ${h}`);
        vPath.setAttribute('d', `M20 0 V ${h}`);
      }
      const pipeSvg = wide ? $('.pipe-h') : vSvg;
      const pipePath = wide ? $('#pipe-path-h') : vPath;
      const pipeDots = $$('.pipe-dots circle', pipeSvg);

      // orbit dots on the case maps and dots flowing through the pipeline
      const caseLoops = $$('.case-map svg').map((svg) => orbitDot(svg, still)).filter(Boolean);
      let pipeLoops = [];
      if (canPath && pipePath) {
        pipeLoops = pipeDots.map((dot, i) => {
          const tw = gsap.to(dot, {
            motionPath: { path: pipePath, align: pipePath, alignOrigin: [0.5, 0.5] },
            duration: wide ? 9 : 7, ease: 'none', repeat: -1, paused: true,
            onUpdate() { const p = this.progress(); dot.style.opacity = String(Math.min(1, Math.sin(p * Math.PI) * 3)); },
          });
          tw.progress(i / pipeDots.length);
          return tw;
        });
      }

      if (still) return; // reduced motion and ?shot=1: everything shown at rest, dots parked along their paths

      const playWhileVisible = (trigger, tweens) => ScrollTrigger.create({
        trigger, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
      });
      $$('.case').forEach((c, i) => { if (caseLoops[i]) playWhileVisible(c, [caseLoops[i]]); });
      if (pipeLoops.length) playWhileVisible('.pipeline', pipeLoops);

      // 1. solution diagrams draw themselves as each row arrives
      $$('.sol-row').forEach((row) => {
        const lines = $$('.sol-art .draw:not(.dash)', row);
        const extra = $$('.sol-art .node, .sol-art .dash', row);
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        if (canDraw) tl.from(lines, { drawSVG: 0, duration: 0.8, ease: 'power2.out', stagger: 0.04 });
        tl.from(extra, { opacity: 0, duration: 0.3, ease: 'power1.out' }, canDraw ? '-=0.35' : 0);
      });

      // 2. case maps: the site plan is traced, then the numbers settle in
      $$('.case').forEach((c) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 78%', once: true } });
        if (canDraw) tl.from($$('.case-map .draw:not(.dash)', c), { drawSVG: 0, duration: 0.85, ease: 'power2.inOut', stagger: 0.025 });
        tl.from($$('.case-map .node, .case-map .orbit-dot, .case-map .dash, .case-map .ship', c), { opacity: 0, duration: 0.3 }, '-=0.3');
        tl.from($('.case-stat', c), { opacity: 0, y: 12, duration: 0.55, ease: 'power3.out' }, 0.15);
      });

      // 3. the console boots: panels, bars, the forecast curve
      const boot = gsap.timeline({ scrollTrigger: { trigger: '.console', start: 'top 78%', once: true } });
      boot.from('.console .panel', { opacity: 0, y: 10, duration: 0.5, ease: 'power3.out', stagger: 0.07 })
        .from('.bar > span', { clipPath: 'inset(0 100% 0 0)', duration: 0.7, ease: 'power3.out', stagger: 0.05 }, 0.15)
        .from('.ship-table tbody tr, .alerts li', { opacity: 0, duration: 0.35, stagger: 0.04 }, 0.2);
      if (canDraw) boot.from('.curve-plan', { drawSVG: 0, duration: 0.85, ease: 'power2.out' }, 0.2);

      return () => { caseLoops.concat(pipeLoops).forEach((t) => t.kill()); };
    });

    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(refresh);
    window.addEventListener('load', refresh, { once: true });
  } catch (err) {
    root.classList.add('no-motion');
    console.warn('[haeon] motion disabled', err);
  }
}
