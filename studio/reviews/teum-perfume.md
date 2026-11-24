# Review: 틈 TEUM (`work/teum-perfume/`)

**Verdict: Fix** (one blocking issue in the signature effect; everything around it is solid).

- Composition, type and restraint are right for a niche perfume house: the giant `틈`, the thin horizon, the weight-200 serif and the four tinted scent screens on desktop (`유자`, `비` settled states) are genuinely beautiful and could be shown today.
- The bottle itself, the one thing this page sells, does not read as glass in the hero: it is a matte, evenly tinted cylinder with three hard black bars (on 유자 it looks like a bee). There is no visible liquid level, no clear glass wall or heel, no bright edge. Since the hero is also the portfolio thumbnail, this has to be fixed first.
- On phones the `틈` behind the bottle shrinks to four stubs that look like wings, and two fixed-element collisions hide the CTA (short phones) and the order message (cart).

Severity counts: 🔴 1 · 🟠 6 · 🟡 9

Screenshots: `desktop-NN.jpg` / `phone-NN.jpg` are in `studio/.shots/review-teum-perfume/teum-perfume/`. Names like `d-hero-2x` are my own Playwright captures in `/tmp/claude-0/-home-user-Dongsup/91ec7568-002e-5f27-a892-53c86a0d89d0/scratchpad/rv-ts/teum/` (temporary). WebGL was judged on SwiftShader after waiting 3 to 9 seconds per state.

## Findings

### 🔴 Blocking

1. **Hero bottle reads as opaque striped plastic, not refracting glass** (`scene.js:170-178` materials, `:191-192` render order, `:310-313` tint; `desktop-00.jpg`, `d-hero-2x` at DPR 2, `d-swatch-1` for 유자). What is on screen: one flat mauve from heel to shoulder, no meniscus, no air gap above the liquid, no clear base, soft grey streaks instead of highlights, and the refracted glyph as three pure-black horizontal bars.
   Cause: the liquid mesh is drawn first and then completely covered by the glass mesh. Three's transmission pass only captures opaque objects, so the glass never "sees" the liquid; it paints its own refraction of the background over it, tinted by `glassMat.attenuationColor` (scent colour mixed 58%). The liquid mesh contributes nothing visible, so the bottle has one uniform skin.
   Fix (I ran this through a patched copy of `scene.js` served by Playwright, no page edits; result `exp-glass.png` shows a clear shoulder, a visible liquid line, a thick clear heel and bright rims, with no console errors):
   - Glass first, clear and thin, not writing depth: `glass.renderOrder = 1; glassMat.depthWrite = false; glassMat.thickness = 0.3; glassMat.attenuationDistance = 6;` and in the loop `glassMat.attenuationColor.copy(tmpA).lerp(WHITE, 0.9)` (was 0.42).
   - Liquid second, carrying the colour: `liquid.renderOrder = 2; liquidMat.side = THREE.FrontSide; liquidMat.envMapIntensity = 0.6; liquidMat.attenuationDistance = 0.7` (my test used 1.15 and came out too pale; go deeper).
   - Because the liquid now covers the glass highlights over the body, add a reflection-only shell on top: `new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.0 }))` with `renderOrder = 5`. (2.2 in my test blew the shoulder out to white; 1.0 is the starting point.)
   - Label `renderOrder = 4` so it sits under the shell reflections.
   Acceptance: in the 1440×900 `?shot=1` frame you can point at (a) the liquid surface line about 20% below the shoulder, (b) clear glass above it with the `틈` stroke visibly displaced, (c) a clear heel under the liquid, (d) at least one crisp white vertical highlight.

### 🟠 Important

2. **Refracted glyph is three hard black bars** (`main.js:100` hero ink = graphite, `scene.js:112` flat ink shader; `d-hero-2x`, `d-ptr-*`, `d-swatch-1`). A straight cylinder only keeps horizontal strokes, at full black, with ruler-straight edges, so it reads as printed stripes; with the yellow liquid the association is a wasp. In the scent screens, where the ink is tone-on-tone, the same refraction looks good.
   Fix after finding 1: (a) the deeper liquid attenuation will tint the bars; check they land near `mix(scent, #171717, 0.6)`, not `#000`. (b) Give the body a slight belly so the bars bow: in the lathe profile use radius 0.60 at y = 0.12 and y = 1.28 and 0.635 at y = 0.7 (three more points with a quadratic between), which bends the lines 3 to 4px at desktop size. (c) Lower the glyph so only two strokes cross the liquid and none runs behind the label: `gh` 0.6 → 0.66 and `hz` offset +0.02 on desktop.

3. **Phone: `틈` is reduced to stubs** (`scene.js:269-272`: `gh = 0.5`, `maxW = Vw * 0.84`; `phone-00.jpg`, `p-hero-2x`). At 390×844 the glyph is about 215px wide behind a 145px bottle and cap, so only four stroke ends stick out; nobody can read the character, and the brief's depth overlap is gone. Same in the four tinted scent screens (`sheet-ps`).
   Fix for `W <= H`: `gh = 0.8`, `maxW = Vw * 1.04` (let it bleed 2% off both edges), and keep the horizon where it is. The top bar of ㅌ must clear the cap by at least 20px and the lower ㅁ must be visible left and right of the bottle. Reduce ink strength on phones to 0.85 so the larger glyph does not overpower the 30px headline.

4. **Phone pinned section: the bottle finishes changing after the scent name has gone under the stage** (`main.js:67` `refOffset = vh * 0.74`, `:70-72` anchor = centre of the text block; `p-s2-s2`, `p-s2-s3`). At the scroll position where state reaches exactly 이끼 or 비, the top half of the big name is already hidden under the stage fade; when the name is fully readable the bottle is still the pale in-between colour.
   Fix: on phones anchor to the heading, not the block centre: `anchors.push(r.top + y + (mqWide.matches ? r.height / 2 : 56))` and `refOffset = vh * (mqWide.matches ? 0.5 : 0.66)`. Check: when `No.3 이끼` first sits fully below the stage, liquid, background and label are already green.

5. **Phone cart: the concept badge covers the order message** (`style.css:565` panel padding-bottom 24px, `:590` `.sheet__msg`; `p-cart`). The badge (16 to 221px from the left, 36px tall, 16px from the bottom) sits exactly where `주문 화면은 여기까지입니다. 컨셉 시안이라 실제로 접수되지는 않습니다.` appears under 주문하기.
   Fix: `@media (max-width: 899px) { .sheet__panel { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); } }`, or move `.sheet__msg` above the button.

6. **Short phones: the badge covers the main CTA** (`style.css:199-203`, `:237-240`; `x-w320` at 320×640). The CTA pill starts 261px below the stage; at 375×667 that is y ≈ 608 to 656, the badge occupies 615 to 651 across the left 221px. Fix: `@media (max-width: 899px) and (max-height: 760px) { .cta-orb { justify-self: end; padding: 0 28px; min-height: 48px; } .hero__base { gap: 14px; padding-bottom: 64px; } }` (a right-aligned compact pill clears the badge), and verify at 375×667 and 360×640.

7. **Left edges do not line up on desktop** (`style.css:23` `--gutter: max(20px, …)`, `:100-101`, `:288-292`, `:306-307` max-width 1440 versus `.wrap` 1320 at `:75-81`). At 1440 the wordmark, h1 and scent copy start at x = 20 while every later section starts at x = 80; the hero text hugs the screen edge, which is cheap for a brand built on 여백. Fix: desktop `--gutter: clamp(24px, 4vw, 64px)` (PLAN 4.6) and one shared `max-width: 1320px` + auto margins for `.top__inner`, `.hero__base`, `.scent` and `.wrap`.

### 🟡 Polish

8. **Label is grey and its small print is illegible** (`scene.js:198-230`; `d-hero-2x`). The vellum renders about `#BDB9B6` against a `#E8E6E2` page, darker than the background, and `eau de parfum 50 ml` is 28px on a 768px canvas, about 3px on screen. Fix: `labelMat` with `emissive: 0xffffff, emissiveMap: labelTex, emissiveIntensity: 0.8, envMapIntensity: 0.3`; small print 38px, or drop it.

9. **Mid-transition liquid turns beige for a long stretch** (`main.js:132` clear 0.62, `:125` smooth 0.16 to 0.84; `d-s-s0-mid`, `phone-02.jpg`). Between scents the bottle spends about 40% of the scroll as a milky tan product that is none of the four. Fix: `clear` 0.62 → 0.3 and `smooth(0.3, 0.7, f)`.

10. **`시간이 지나면`: phases overlap as unreadable double text, rings feel unfinished** (`main.js:223-225`; `d-time-12`, `d-time-end`). Around 35 to 50 minutes two notes sit on top of each other at partial opacity and the slider can rest there. The three hairline rings read as a placeholder, sit under the chips on desktop and are cut by the section edge at 6시간. Fix: sequential fade `w0 = 1 - smooth(18, 32, m); w1 = smooth(34, 48, m) * (1 - smooth(150, 175, m)); w2 = smooth(180, 205, m)`; move the rings right of the note text (`.tnotes` second column, 220px) and cap their scale at 1.0, or remove them.

11. **Stage exit guillotines the bottle** (`style.css:339` `.story` z-index 4; `desktop-05.jpg`, `d-s2-exit`). The white section slides over the pinned stage and cuts the bottle at mid-body. Fix: fade the canvas over the last 35svh of the stage (`opacity` from scroll progress in `frame()`), or let the bottle translate up 12% as it leaves.

12. **Pointer tilt lifts the bottle off its shadow** (`scene.js:182-186`; `d-ptr-left`, `d-ptr-right`). The pivot is at mid-height (y = 1.1), so the base swings sideways while the shadow stays put. Fix: pivot at the base (`tilt.position.y = 0; spin.position.y = 0`) and offset the shadow by `px * 0.05`.

13. **Environment is re-baked while scrolling** (`scene.js:79-88`, `:315-316`). `PMREMGenerator.fromEquirectangular` runs up to six times a second during every colour transition; on a mid-range phone that is the likeliest source of dropped frames. Fix: bake the four scent environments once after first paint and switch at the midpoint of the turn (hidden by the clear phase), or keep one neutral environment and tint only through attenuation.

14. **Phone bottle is soft** (`scene.js:29` `transmissionResolutionScale 0.6`; `p-hero-2x`, `crop-pyuzu`). The refracted bands are visibly blurred next to the sharp cap. Try 0.8 at DPR ≥ 2 after finding 1 and measure; keep 0.6 only if frame time demands it.

15. **Small copy and semantics.** `main.js:420` writes `No.3이끼` with no space (screen readers read it joined; line `:350` in HTML has the space). `index.html:89` puts `aria-label` on a `<span>`; move the count text into the button's accessible name instead. `index.html:252` uses `aria-labelledby` on a plain `<div>`: make it a `<section>`. Footer phone and mail links are 21px tall on phones (`style.css:551`): `display: inline-flex; min-height: 44px; align-items: center`.

16. **Quiz result leaves the page lopsided** (`d-quiz-result`). After the answer the right column holds four short lines in a 420px-tall area. Fix: `.result__name` up to `clamp(64px, 9vw, 120px)` on desktop and show the three notes of the chosen scent under the line, so the result is worth the three questions.

## More wow (ranked by impact)

1. **Let `틈` actually pass behind the glass.** The brief says the character "지나가는" behind the bottle; in the hero it stands still, so the lens effect is only discovered with the mouse. Drift the glyph plane ±5% of viewport width on a 14s sine while the hero is idle (stop with the pause button and under reduced motion). With the fixed glass, the strokes will visibly bend and jump at the bottle edges, which is the single most convincing proof of refraction.
2. **A tinted light pool on the floor.** Replace the grey contact shadow's centre with an additive plane: scent colour radial plus two bright streaks, opacity 0.35, shifted opposite to the highlight when the pointer moves. Coloured liquid throws coloured light; it is one more quad and makes the bottle sit in the room.
3. **Make 담기 physical.** On click, drop that shelf bottle's liquid level to 0.85 and refill over 600ms (the `--fill` transition already exists in the symbol) while a 6px dot of the scent colour travels to the cart count before the spring bump. Small, on-brand, and it ties the SVG shelf to the 3D hero.

## Verified, and how

- `shoot.mjs` run: 0 console errors, 0 page errors, 0 failed requests, no overflow at 1440 or 390; looked at every desktop and phone scroll shot, both load shots and the reduced-motion shot (bottle still at the rest angle, content visible).
- Pointer tilt and highlight travel (pointer left, right, top), all four swatches by mouse and keyboard, rapid swatch changes, pause (two frames 2.5s apart are byte-identical; resume differs).
- Pinned 네 가지 향: desktop at 12 scroll positions and phone at 22, settled states re-shot after 7s. Desktop settled states are correct (label text switches, bottle alternates sides, background and glyph tint follow).
- Hours slider: arrows, PageDown, Home/End, mouse drag past both ends, click on track, chip change; `aria-valuetext` reads time, phase and notes.
- Quiz: empty submit shows `답을 하나 골라 주세요.` and focuses the first option, Enter advances, back keeps answers, result fills the side bottle and changes the hero bottle; 담기 changes to 담았습니다 for 1.8s, count and live announcement update.
- Cart sheet: focus lands on close, Tab and Shift+Tab stay inside for 12 presses, quantity buttons keep focus, order shows the concept message, Esc and scrim close it and focus returns to the cart button.
- Full Tab pass: 30 stops in a sensible order, every one with a 2px outline. Phone menu: opens, Esc closes, link tap closes. `?shot=1`: fig, static frame (two shots 2s apart identical), badge hidden. Also looked at 1920, 1366×700, 1024×768, 768×1024 and 320×640. External requests are Google Fonts only.

## Not verified

- Real GPU appearance and frame rate. SwiftShader is slow and slightly different in filtering; the glass verdict is about structure (no liquid line, uniform tint), which does not depend on the rasteriser, but highlight strength should be tuned on a real GPU.
- One phone capture 4s after tapping 유자 still showed the `No.1 무화과` label on the yellow bottle (`crop-pyuzu`). It was probably a late software frame, since desktop labels switch correctly; please confirm on a device that the label text changes at the half turn.
- Scrollbar shift when the cart opens on Windows (`body { overflow: hidden }`, `main.js:367`); headless Chromium has overlay scrollbars. If it shifts, add `scrollbar-gutter: stable` to `html`.
- Lenis wheel feel, touch dragging of the vertical slider on a real phone, screen-reader output.
