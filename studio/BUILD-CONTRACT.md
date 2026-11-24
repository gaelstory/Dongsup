# Build contract (technical rules for every page)

PLAN.md says *what* to build. This file says *how*, and it wins on anything technical.
Every page must also be publishable later as a Claude Artifact, which is why some rules look strict.

## Files

- Studio homepage: `studio/index.html`, styles in `studio/assets/css/`, scripts in `studio/assets/js/`,
  contact placeholders and `FORM_ENDPOINT` in `studio/assets/js/config.js`.
- Mockup: `studio/work/<slug>/index.html`. Inline CSS/JS or files inside the same folder. Never edit another
  group's folder, `studio/assets/vendor/`, `studio/assets/shared/` or `studio/tools/`.
- Every page is a complete document: `<!doctype html>`, `<html lang="ko">`, `<meta charset="utf-8">`,
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`,
  a `<title>` that is the brand name (2-4 words, no " - tagline"), a `<meta name="description">`.
- Do not commit. The orchestrator commits.

## Libraries (local only; every external script/CDN is blocked here and in the artifact)

```html
<script src="../../assets/vendor/gsap/gsap.min.js"></script>
<script src="../../assets/vendor/gsap/ScrollTrigger.min.js"></script>   <!-- and any of: SplitText, Flip, Observer,
     ScrambleTextPlugin, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, CustomEase, TextPlugin, ScrollToPlugin,
     Draggable, InertiaPlugin, ScrollSmoother, EasePack (all .min.js in that folder) -->
<script src="../../assets/vendor/lenis/lenis.min.js"></script>          <!-- copy the rules of lenis/lenis.css inline -->
<script type="module">
  import * as THREE from '../../assets/vendor/three/three.module.min.js';   // Three.js r186, core only
</script>
```
(From `studio/index.html` the prefix is `assets/vendor/...`.) Three.js addons are not vendored: write your own
shaders/post effects. If you truly need an addon, copy it from
`/tmp/claude-0/-home-user-Dongsup/91ec7568-002e-5f27-a892-53c86a0d89d0/scratchpad/vendor-pkgs/three-0.186.1/package/examples/jsm/`
into `studio/assets/vendor/three/addons/` and map the bare `three` import with an inline
`<script type="importmap">{"imports":{"three":"<relative path>/three.module.min.js"}}</script>`.

- Fonts: Google Fonts `<link>` only (`https://fonts.googleapis.com/css2?...&display=swap` with preconnects to
  fonts.googleapis.com and fonts.gstatic.com). Always give a real fallback stack.
- No external images, video, iframes, fetch/XHR to other hosts, analytics or embeds. All imagery is made in code
  (inline SVG, CSS, Canvas 2D, WebGL) or saved as local files in your folder (SVG you write).
- No `alert()`, `confirm()`, `prompt()`, `window.open`, `window.print`, `<a download>`. Forms handle `submit` in
  script with `preventDefault()` and show an in-page result. `mailto:`/`tel:` links may exist as a convenience, but
  always also show the address/number as text. Hash links only as plain `#name`.

## Shared concept badge (mockups only)

Put `<script src="../../assets/shared/concept-badge.js" defer></script>` before `</body>`. It draws a small fixed pill
at the bottom-left linking back to the studio portfolio. Do not build your own; keep the bottom-left ~56px corner
free of your own fixed UI.

## Layout and theme

- Mobile-first. Must be flawless at 390px and 1440px (also check 768px mentally). The page body never scrolls
  sideways: watch 100vw widths, marquees, rotated/positioned decorations (clip them inside an `overflow:hidden`
  or `overflow:clip` wrapper).
- Side gutter on the outer wrapper(s): `padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));`
  (bands that span the full width put it on their inner wrapper).
- Each mockup commits to its own look. A single deliberate theme is fine: then set `body` background, every color
  explicitly and `color-scheme` on `:root`. Define colors as custom properties on `:root`.
- Use `min-height: 100svh` (not `100vh`) for full-screen heroes; heroes must not hide the fact that content follows.

## Motion safety

- Wrap motion in `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch (static, or opacity-only).
  CSS animations need a `@media (prefers-reduced-motion: reduce)` override too.
- Content is visible at rest: if GSAP fails to load, JS errors or motion is reduced, every word is readable.
  Gate "start hidden" states behind a class the script adds (`document.documentElement.classList.add('js')`) and
  set them from JS, never in plain CSS.
- Above-the-fold content finishes its entrance within about 1.2s of load. Scroll reveals use `once: true`,
  short distances and durations (≤ 0.9s); never leave text invisible waiting for a scroll it may never get.
- Respond to pointer-down instantly; hover effects only under `@media (hover: hover) and (pointer: fine)`.
- Custom cursors: only on fine pointers, never hide the real cursor on touch, keep it under 30ms latency.

## Performance

- WebGL/canvas loops: `Math.min(devicePixelRatio, 2)` (1.5 on phones), pause on `visibilitychange` and when the
  canvas is offscreen (IntersectionObserver), reduce counts on small screens, dispose on teardown.
- Provide a non-WebGL fallback (CSS/SVG still image) when `WebGLRenderingContext` is unavailable.
- Animate `transform`, `opacity`, `clip-path`, `filter` (sparingly). No layout-thrashing scroll handlers;
  use ScrollTrigger or IntersectionObserver.
- Keep each page's own code reasonable (aim < 250KB excluding vendor files).

## Accessibility

- One `<h1>`, ordered headings, landmarks (`header`, `nav`, `main`, `footer`), `<button>` for actions and `<a>` for
  navigation, visible `:focus-visible` rings, accessible names on icon buttons, `aria-hidden="true"` on decorative
  canvases/SVG, labels on every form control, WCAG AA contrast for text, tap targets ≥ 44px on touch.
- Mobile navigation: a real menu button with `aria-expanded`, focusable items, Escape closes.

## Copy

- Korean, natural and specific to the fictional business. No lorem ipsum, no em-dashes (—) in generated copy,
  no "elevate/seamless" filler. Fictional brands only: never a real company's name, logo or copy.
- Mockups may show fictional prices, menus, testimonials. The studio homepage must not show invented stats,
  client counts, awards, ratings or testimonials.

## Check your own work before reporting done

```bash
cd /home/user/Dongsup
node studio/tools/shoot.mjs --out studio/.shots/<slug> work/<slug>/index.html    # or: index.html for the homepage
```
It writes desktop (1440x900) and phone (390x844) screenshots taken while scrolling, a reduced-motion shot and
`report.json` (console errors, page errors, failed requests, horizontal overflow with the widest elements).
Read report.json and look at the screenshots (Read tool on the .jpg files): at least the load shot, 3+ desktop
scroll shots, 3+ phone shots and the reduced-motion shot. Fix every error, failed request, overflow, clipped or
colliding text, unreadable contrast and empty-looking section. Re-run until clean (2-4 rounds is normal).
Headless Chromium renders WebGL with SwiftShader, so it is slow; that is fine.

## Definition of done

- report.json: 0 console errors, 0 page errors, 0 failed requests, no overflow on desktop or phone.
- Matches its PLAN.md brief (palette, fonts, sections, signature effect) at a level a paying client would be
  proud of. The signature effect is clearly visible in the first screen.
- Works with reduced motion; readable with JS disabled except for the WebGL/canvas visuals.
- Your final reply: the files you created, what the signature effect does, anything you could not finish.
