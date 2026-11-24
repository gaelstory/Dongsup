# Review: sawol-flower (꽃집 사월) · M09

**Verdict: Fix** (close to Ship. Nothing is broken on load; the defects appear once a visitor actually uses the signature interaction.)

- The first screen is the best flower work in the set: the tulips, ranunculus, poppies and freesia are delicate, botanically recognisable and never childish, the Yeon Sung headline sits well on the morning sky, and it is unmistakably a neighbourhood flower shop at 1440, 1366x768, 1280x720, 1024 and 390.
- Below the hero the page keeps the quality: specimen tags, the cutting-mat workbench with a bouquet that really recomposes, vases, petals shaken loose by scrolling. Every control works with mouse, touch and keyboard, report.json is clean, no overflow down to 320.
- What lets it down: a planted flower can sit on top of the headline, lead and hint (worst on phone), the "fast pointer bends the stems" effect is close to invisible, and a few smaller things (calendar strip too faint at rest, footer meadow cruder than the hero, the page says November in an April shop).

Screenshots: `shots/…` = `studio/.shots/review-sawol-flower/sawol-flower/`; `qa/…` = my own Playwright run (scratchpad, not kept).

## Findings

### 🔴 Blocking

None.

### 🟠 Important

1. **Planted flowers cover the copy.**
   Where: `main.js:291-300` (`plantAt`), `style.css:146` (canvas `z-index:1` above `.hero__inner`). Seen in `qa/plant-done` (1440: a pink ranunculus and a tulip sit on "고른 제철 꽃" after clicking on the headline) and `qa/ph-plant` (390: stems run through the lead, through "아무 데나 눌러" and a poppy head covers "꽃시장에서").
   What: the brief's 70% height cap puts the head at y≈270 on a 900px hero, exactly on the lead line; on phone the brief wants the garden at 38% but taps grow to 70%. The first thing a visitor does ("아무 데나 눌러") damages the headline block.
   Fix: keep stems free to cross, but never let a head land in the copy. In `plantAt`, read `copy = document.querySelector('.hero__inner').getBoundingClientRect()` (title top to hint bottom, cached on resize) and, when `x` is within `copy.left - unit*1.5 … copy.right + unit*1.5` of the text block, clamp `h` to `groundY - (copyBottom + unit*1.6)` (minimum 64). On `mobile` use a hard cap of `heroH * 0.46` for every tap. Additionally put the copy above the canvas for safety: `.hero__inner { position: relative; z-index: 2; pointer-events: none } .hero__inner a, .hero__inner button { pointer-events: auto }` (clicks on text still reach `.hero` and plant).

2. **Fast-pointer bend is nearly invisible, and gets weaker the faster you move.**
   Where: `main.js:260-271`. `qa/bend-a` vs `qa/bend-b` (1240px sweep through the stems): no readable difference.
   What: the impulse is added per animation frame while the pointer is within 110px, so a fast sweep spends 1-2 frames near each flower (peak bend about 3-5°, never the brief's 12°), and a slow one gets more. The brief asks for the opposite.
   Fix: apply the impulse per pointer event, by distance travelled: in the `pointermove` handler, for each flower with `|x - f.fx*W| < 130` and pointer between head and ground: `f.bv += sign(dx) * Math.min(Math.abs(dx), 80) / 80 * 2.2 * (1 - dist/130)` (only when `|vx| > 0.35 px/ms`). Keep spring `-55/-6.5` and the ±0.21 clamp. Target: one quick sweep visibly lays the row over about 10° and it springs back in ~0.6s.

3. **Phone: hint sits 120px above the garden, with dead sky between.**
   Where: `style.css:187-189`; `shots/phone-00.jpg` (hint at y≈466, first flower head at y≈600).
   What: brief says "힌트 문구는 꽃밭 바로 위". As built, the hint reads as part of the CTA stack and the lower sky is empty.
   Fix: `padding-bottom: calc(max(620px, 100svh - 44px) * 0.38 - 8px)` so the hint's bottom edge sits 12-16px above the tallest allowed head, and raise the seeded phone flowers' `fh` range so at least two heads reach 34-38% of the hero.

4. **The page is an April shop showing November.**
   Where: `main.js:521` (`new Date().getMonth()`), `index.html:202-208`; `shots/desktop-05.jpg` ("11월 이번 달 국화, 안개꽃") right after a section selling tulips, freesia and poppies as "오늘 들어온 꽃", and vases labelled 국화.
   What: a client reads "오늘 튤립 40송이" and then "이번 달은 국화". The mockup contradicts itself depending on the day it is opened.
   Fix: pin the calendar to April for the mockup: `var now = 3` always (this is also the `?shot=1` value), and render `aria-pressed="true"` on 4월 in the HTML. Keep the subscription dates dynamic.

5. **Seasonal strip is too faint at rest.**
   Where: `main.js:521` (`REST = 0.34`), `style.css` `.month__art`; `qa/cal-m*` and `shots/desktop-05.jpg`.
   What: eleven of twelve months show 20-30px specks on 100px columns; 5월 (은방울꽃, white on pale blue) and 12월 (grey gypsophila) nearly vanish. The section looks sparse until hovered, and touch users never hover.
   Fix: `REST = 0.6`; month art height 112 → 132px on ≥900px; give white heads in this section the `whiteS`/`creamS` shaded fills (already used for petals at `main.js:361`) or a `stroke: rgba(59,42,32,.22)` hairline; selected month keeps bloom 1 plus the white card.

6. **Footer meadow is visibly cruder than everything above it.**
   Where: `art.js:227-241`, `style.css:433`; `shots/desktop-08.jpg`, `shots/phone-12.jpg`.
   What: single-colour grass in clumps with bare gaps, and the blade bases print as a flat green bar on top of the soil (the SVG overlaps the footer by 6px: `top:-104px; height:110px`). After the hero's layered grass this is the last image the client sees.
   Fix: `top: -110px`; blades `W/1.4` instead of `W/3`, heights 10-34, three greens (`#2D6B45`, `#3B7F53`, `#4F9465`) in two layers like the hero; add one leaf per stem; draw a 10px soil-coloured wavy path along the bottom so the grass grows out of the soil instead of sitting on it.

7. **`?shot=1` is not a still frame.**
   Where: `main.js:98` (`wind = !REDUCED`) and `:349`. Two screenshots 1.5s apart under `?shot=1` differ (wind sway keeps running; the pause button is also shown).
   Fix: `wind = !REDUCED && !SHOT`; do not `kick()` in shot mode; `html.is-shot .hero__wind { display: none }`.

### 🟡 Polish

8. **"싱그럽게" turns every flower the same yellow.** `qa/bench-rdp`: ranunculus, poppy and tulip all render yellow, so three chosen kinds read as one. In `art.js` `MOOD.fresh`, vary by kind: tulip white, freesia yellow, ranunculus cream, poppy yellow, daisy white. Same check for `calm` (all white: give ranunculus cream and poppy the pale coral).
9. **White flowers vanish at the bottom of the hero.** White daisies and cream ranunculus over the white fade (`shots/desktop-00.jpg` lower third) lose their outline. End the sky gradient at `#EEF5FF` instead of `#FFFFFF` for the last 20%, or stroke white petals with `rgba(31,92,58,.18)`.
10. **Empty bouquet still shows a price.** With no flowers picked the stage shows wrap and greenery, caption "꽃을 한 가지 이상 골라 주세요" and "35,000원" next to an active order button (`qa/bench-none`). Dim the total to 50% opacity and set the button `aria-disabled="true"` with the outline style until one flower is picked.
11. **320px: "라넌큘러 / 스" breaks, card placeholder is clipped.** `qa/320-bench`. `.pick span { font-size: 14px; letter-spacing: -0.02em; white-space: nowrap }` below 360px, and shorten the placeholder to `예: 늘 고마워요`.
12. **Small type on phone.** `.chip--size small` 12.5px, `.tag__mean span` 13.5px, `.site-footer__note` 13.5px in Nanum Myeongjo (a thin serif). Raise all three to 14px minimum.
13. **Phone tel link is a 16px-tall target.** `.contact a` measures 98x16. `display:inline-flex; min-height:44px; align-items:center`.
14. **Wind button slides under the header while scrolling out** (`qa/petals1`, top right). Fade it with the hero: `opacity` 1→0 between scrollY 0 and 0.25×heroH, or `position:absolute` is fine but add `z-index` below the header (it currently peeks through the blurred bar).
15. **Hover does not preview the month text.** Hovering blooms the art but the detail card stays on the selected month, so "달에 손을 올리거나" delivers less than a click. On `pointerenter` (mouse) update `#md-month/#md-names/#md-note` too and restore the selected month on `pointerleave`.
16. **Bench stage is top-heavy with size S.** The bouquet occupies the lower 55% and the upper mat is empty (`qa/bench-S`). Scale `.bq` by 1.15 for S, or centre vertically by translating S up 40 units in the 560x640 viewBox.
17. **Subscription result uses a 2-week first date even for 4주.** Fine, but the copy says "첫 꽃은 12월 1일" while the vases stay labelled 국화 in aria-label regardless of plan month. Low priority once finding 4 pins the season.

## More wow (ranked by impact)

1. **Pick what you plant.** A row of five tiny flower heads under the hint (radio group, same icons as the workbench); the cursor becomes that flower's bud and a click plants that kind. It turns a random effect into "I made this garden", and it ties the hero to the bouquet builder (pre-select the last three planted kinds in the workbench).
2. **Petals that land.** Let 6-8 of the scroll petals settle on the top edge of the first specimen tags and on the "오늘 들어온 꽃" heading baseline (stop at a y read from the DOM, fade after 4s). Cheap with the existing petal loop, and it sells "꽃밭이 다음 섹션 경계를 넘는다".
3. **The bouquet is tied in front of you.** On the first scroll into the workbench, play the build once: stems drop in, the wrap folds from two triangles, the ribbon draws its bow last (0.9s total, once). At present heads only bloom in place.

## Verified, and how

- `shoot.mjs`: report.json 0 console errors, 0 page errors, 0 failed requests, no overflow desktop/phone; looked at every desktop shot (00-08, load), every phone shot (00-12) and the reduced-motion shot.
- Own Playwright run (Chromium, SwiftShader): 4 random seeds at 1440x900; 9 clicks including on the h1, lead, hint area and edges; fast horizontal sweep with before/after crops; 45 hint-button plants (40 cap holds, oldest fade); pause button (two frames 700ms apart are byte-identical, `aria-pressed` toggles); wheel scrolling for petals; workbench mood x3, size S/M/L (41,000 / 61,000 / 91,000원 correct against the formula), 4th and 6th flower (first-chosen drops, count text updates), zero flowers, card text, submit messages; calendar hover, click, Tab/Enter, five months; subscription 2주/4주 roll (26,000→29,000, 44,000→48,000), plan select, submit.
- Phone 390x844 with touch: six taps (near copy, in garden, at edges), hint button, menu open/Escape/link tap, calendar tap, workbench; 320x640; 1366x768, 1280x720, 1024x768, 768x1024, 1920x1080 hero plus workbench and specimens at 1024/768.
- Keyboard: 42 Tab stops walked, computed outline on each (2px solid, green on light, freesia yellow on the mat and footer); radio arrow keys and checkbox Space work.
- `?shot=1` (badge hidden, fixed seed, but not static, see 7), `prefers-reduced-motion` (full garden, instant planting, wind button hidden), JS disabled (SVG fallback garden and all text present).

## Could not verify

- Real frame rate on a mid-range phone (headless SwiftShader only); with 40 flowers plus 20 petals the canvas redraws everything each frame while wind is on.
- Real iOS Safari touch behaviour (tap vs scroll threshold) and the custom SVG cursor on Windows/Safari.
- Font rendering with Google Fonts blocked (fallback stack is declared; not exercised).
