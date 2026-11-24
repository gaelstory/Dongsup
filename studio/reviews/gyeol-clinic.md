# 검수: gyeol-clinic (결 피부과의원)

## Verdict: **Fix** (3 blockers; the hero surface needs a real re-tune, the rest is close)

- Below the hero this is a calm, credible clinic page: Diphylleia headlines, frost/white rhythm, circular motif, honest copy, a good hours card and a careful form. That part a dermatologist would accept.
- The hero, which is the thumbnail and the signature, does not read as skin. The "before" surface looks like stucco wallpaper on desktop and grey sandpaper on a phone, the frost blue of the brief is almost absent, and the lens rim and label cut through the headline in the still frame.
- Two functional bugs: the booking form stays on screen after success, and scrolling over a comparison circle on a phone changes the slider.

Paths are relative to `studio/work/gyeol-clinic/`. Screenshots: `studio/.shots/review-gyeol-clinic/gyeol-clinic/` plus my interaction shots (scratchpad `t/g-*.png`, described inline).

## Findings

### 🔴 Blocking

1. **Hero skin texture reads as rough plaster, not refined skin (desktop-00, phone-00, reduced-motion).** `index.html:25-29`: `baseFrequency 0.9`, `surfaceScale 2.2`, composite `k1 0.58 k2 0.44`. Every pixel is a sharp bump with a dark side, across the whole 1440x900, and at DPR 2 on phones the grain doubles in density and the cool end of the gradient multiplies into grey-mauve. A prospect's first impression is "textured wall". The brief's numbers are a starting point; the result has to look clinical and soft. Fix (keep the same technique, one raster):
   - Texture: `baseFrequency="0.55 0.62" numOctaves="2"`, then add `<feGaussianBlur in="n" stdDeviation="0.6"/>` before lighting; `surfaceScale="1.1"`, `elevation="62"`; composite `k1="0.34" k2="0.68" k4="0.02"` so shading is a tint, not a shadow.
   - Same bump size on every screen: give both hero `<svg class="skin__surface">` elements `viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"` and size the `<rect>` `width="1440" height="900"`, so the noise is defined in viewBox units and a 390px DPR 2 phone shows the same (scaled) grain as desktop instead of a denser one. Check the phone result by eye and, if it is now too soft, use a phone-only filter with `baseFrequency="0.8"`.
   - Colour: the brief is "살구에서 서리로". Change `#g-hero` stops to `#F5B59B 0`, `#F8D9CB .38`, `#F3EDEA .68`, `#F3F8FA 1` and run it top-right frost → bottom-left apricot so at least 40% of the first screen is frost/white. Today frost is only the top-right corner and the page thumbnail is salmon, which also clashes with the "서리 블루 라이트" positioning in the PLAN table.
   - The "after" layer (`:30-37`) then needs a clearer difference: keep `0.35`/`0.6`, raise specular to `specularConstant="0.9" specularExponent="22"`, drop the red-boosting matrix at `:36` (it turns the opened hero into a flat orange field, see scroll shot at 450px) and instead lighten: `values="1 0 0 0 0.03  0 1 0 0 0.03  0 0 1 0 0.04  0 0 0 1 0"`.
   Acceptance: at 390px DPR 2 and 1440px DPR 1 the before surface shows fine, low-contrast pores (no black specks), the lens interior is visibly smoother and dewier, and a stranger says "skin" not "wall".

2. **Booking success leaves the whole form on screen.** `style.css:710` `.form { display: grid }` overrides the `hidden` attribute set at `main.js:283` (`form.hidden = true`); computed display stays `grid`. After a valid submit the form, still filled and still submittable, sits above "예약 요청을 받았습니다" (my `g-form-done` shot). Fix: add `.form[hidden] { display: none; }` (same pattern already used for `.done[hidden]` at `:773`).

3. **Still frame / thumbnail: lens rim and label cut through the headline and lede; hint text is in the shot.** With `--lx:68%; --ly:52%` (`style.css:257-258`) the 2px rim crosses "다" of 좋아집니다 and "전문의가", in `?shot=1`, reduced motion and the first second of the intro; the hint "포인터를 움직이면 렌즈가 따라갑니다" is also visible under `?shot=1`. When the pointer passes over the title, the label "정돈된 결" lands on top of the letters. Fix: (a) desktop home `--lx: 79%; --ly: 60%` (clear of the 1040px-wide title block; update `floatCenter()` amplitudes in `lens.js:63` to `ax: W*0.09, ay: H*0.1` so the drift never re-enters the text column), (b) `html.is-shot .hero__hint { display: none }`, (c) give `.hero__title, .hero__lede` `position: relative; z-index: 3` and put the rim above the after-surface but below the text, with the rim drawn at `rgba(10,74,87,.55)` where it would cross text, or simply hide `.lens__label` while the lens centre is inside the title block's bounding box.

### 🟠 Important

4. **Phone: scrolling over a comparison circle changes the slider.** `main.js:126-133` sets the position on `pointerdown` anywhere on the stage. A vertical swipe that starts on the circle scrolls the page (good, `touch-action: pan-y`) but first jumps the divider to the touch point (50 → 17 in my test). The circle is about 350px of a 390px screen, so this happens on almost every scroll. Fix: for `e.pointerType === 'touch'`, start a drag only from `.compare__handle` (it already has `touch-action: none`), or defer `set()` to the first `pointermove` whose `|dx| > |dy|` and `|dx| > 6`. Keep click-to-set for mouse.

5. **Phone hero: lens rests on top of its own hint, and the drag hint collides with the badge zone.** `lens.js:62` floats around `y = 76%` with r 92 (covers y 581 to 765) while `.hero__hint` sits at y 748 to 768 (`style.css:376`); phone-00 shows "끌어 보세요" struck through by the rim. Fix: phone float centre `y: H * 0.70`, `ay: H * 0.035`, and move the hint to `bottom: 64px; left: 20px; transform: none; text-align: left` with `max-width: 44vw`, or drop the hint and put a small grab affordance (two 2px arcs) on the rim itself.

6. **Hero composition is weak on phone and bottom-heavy on desktop.** At 390px the h1 is 40px (brief minimum) and starts at y 270 after 200px of empty texture; on desktop the bottom 230px is empty texture with a lone hint. Fix: phone `.hero__title { font-size: clamp(46px, 12.6vw, 56px) }` (two lines still fit: 7 and 5 glyphs), `.hero { place-items: start center }` with `.hero__inner { padding-top: calc(var(--header-h) + 14svh) }`; desktop shift the text block up by 4svh and place the lens low-right (finding 3) so it fills the empty corner.

7. **Principle headlines break in the wrong place.** `style.css:400-405`: "필요한 / 만큼만 권합니다" and "비용은 상담 / 전에 알려드립니다" (desktop-01/02, also phone). `text-wrap: balance` plus a too-narrow column splits 관형어 from its noun. Fix: hard phrase breaks in `index.html:189-197` with nowrap spans: `필요한 만큼만` / `권합니다`, `전문의가 처음부터` / `끝까지 봅니다`, `비용은 상담 전에` / `알려드립니다` (`<span style="white-space:nowrap">`), and widen `.principle--a .principle__title` to `1 / 9`. Also `.dot { vertical-align: 0.02em }` so the marker sits on the x-height, and hang it (`margin-left: -0.8em` at ≥1024px) so the two lines share a left edge.

8. **Medical-advertising risk in the comparison module and price table (의료법 제56조 관점).** (a) Tags "관리 전 / 관리 후" (`index.html:230-231` and x3) present a before/after result; "관리" is also an aesthetics-shop word, not a medical one. (b) No side-effect or individual-variation notice anywhere near procedures or prices. (c) Flat claims: "회복은 3일에서 5일입니다" (`:385`), "시술 후 바로 화장할 수 있습니다" (`:390`). Fix: tags → `치료 전 예시` / `치료 후 예시`; caption (`:234`) → `실제 사진이 아닌 설명용 그래픽입니다. 치료 결과와 기간은 사람마다 다릅니다.`; add one line under the price table: `시술 뒤 붉어짐, 부기, 색소 침착 같은 부작용이 생길 수 있고 결과는 개인에 따라 다릅니다. 진료 때 자세히 설명드립니다.`; soften to `회복에 보통 3일에서 5일쯤 걸립니다`, `대부분 시술 당일 화장할 수 있습니다`. Update `aria-valuetext` in `main.js:120` to match the new tag words. (The h1 "피부는 결대로 좋아집니다" comes from the brief; flag to the planner that a real clinic's 심의 would likely question it.)

9. **"피부 표면" illustrations: pore and scar "before" halves are muddy and a little unpleasant.** `#f-pore-b` (`index.html:94-102`) renders as brown reptile leather; `#f-scar-b` has near-black shadow pools. Fix: pore: `surfaceScale="1.3"`, pits blur `stdDeviation="1.6"`, composite `k1="0.5" k2="0.52"`, gradient `#g-pore` lighter (`#F6D3C2 → #F7E4DA`); scar: `surfaceScale="2.2"`, `k1="0.5" k2="0.52"`. Target: the darkest pixel of any "before" half no darker than `#B98F7E`. Redness: reduce vein dots (`:119` alpha `7 -4.55` → `5 -3.6`) so it reads as flush, not rash.

10. **Mobile menu panel is see-through and does not lock the page.** `style.css:213` `rgba(243,248,250,.97)` + blur: the hero headline ghosts through behind "오시는 길" (my `g-m-menu` shot), and the page scrolls behind the open panel. Fix: `background: var(--frost)` (opaque), add `.menu-open body { overflow: hidden }`, and a scrim under the panel (`.menu-open main::before { content:""; position: fixed; inset: 0; background: rgba(16,38,44,.28); z-index: 40 }`) that closes on tap.

11. **Form validation gaps against the page's own rules.** `main.js:236-250`: public holidays pass (2026-12-25 오전 accepted although the hours table says "일요일과 공휴일 쉽니다"); errors are not announced (no live region; only the first invalid field gets focus). Fix: add a small fixed-date holiday list (1/1, 3/1, 5/5, 6/6, 8/15, 10/3, 10/9, 12/25) → `공휴일은 쉽니다. 다른 날을 골라 주세요.`; give each `.field__error` `role="alert"` or add one `aria-live="polite"` summary (`입력을 확인해 주세요. 6곳이 비어 있습니다.`) above the submit button; disable the 저녁 chip (`aria-disabled`, 50% opacity + note) when the chosen date is not a Wednesday instead of only erroring after the fact.

### 🟡 Polish

12. **Lens label is weak.** 14px text hanging off the rim with a 22px tick (`style.css:307-322`); on the busy surface it disappears, and after the re-tune it is the only caption of the signature. Fix: pill like the phone variant on all sizes (`background: rgba(255,255,255,.9); padding: 6px 12px; border-radius: 999px; font-size: 14px`), anchored at `left: 72%; top: 92%`, plus a matching `지금 결` micro-label fixed at the hero's lower-left on the before surface so the before/after idea is legible without interaction.

13. **Scroll expansion leaves a wedge of the rough surface.** At 450px scroll (50% of a 900px hero) a grey triangle of "before" is still visible at the bottom-left (`g-scroll-450`). Fix: end the scrub at 45% (`lens.js:180` `* 0.45`) or multiply `far` by 1.12.

14. **Doctors and fees sections have large dead areas at 1440.** `.doctor { max-width: 940px }` leaves 400px empty beside each doctor, and the fees left column is empty below the intro (desktop-04 to 06). Fix: add a third line of real content per doctor in the right gap (진료 요일: `월 수 금 토` as four small rings echoing the lens) and make `.fees__head` `position: sticky; top: calc(var(--header-h) + 32px)`.

15. **Tabs on phone give no cue that they scroll.** The pill container is cut flat at the right edge ("홍" half visible, phone-02). Fix: right-edge fade `mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent)` on `.tabs__scroller` while not scrolled to the end, and `scroll-padding-inline: 24px`.

16. **Hours status wording and styling.** "접수 마감. 다음 진료는 …부터입니다" / "지금 진료 중, 접수는 …까지" mix noun phrases and sentences; the closed dot is apricot, the same colour as the brand accent. Fix: `지금 진료 중입니다. 접수는 오후 6시 30분까지 받습니다` / `오늘 접수는 마감했습니다. 다음 진료는 내일 오전 10시입니다`; open = filled deep dot, closed = hollow ring (shape, not only colour).

17. **Small things.** `tel:` link is 25px tall (`style.css:690`; add `display:inline-flex; min-height:44px; align-items:center`). Placeholder `#61777F` on frost is 4.4:1 (use `#566C74`). `.price__cost` uses three `!important` (`:614`): raise specificity instead. Footer repeats the h1 as a tagline with no period while every other sentence has one. Date input shows a native `mm/dd/yyyy` mask on non-Korean browsers: add a helper `예: 2026-12-02` under the label.

18. **Motion budget is very quiet, slightly under the brief.** Only principles fade and monogram rings draw. Allowed and on-brand: let the comparison divider ease from 30% to 50% once (600ms, `power2.out`) the first time each panel is shown, so visitors learn it moves. Skip under reduced motion.

## More wow (ranked)

1. **The lens as the page's cursor of truth**: after the hero, reuse the same rim as a small 72px ring that settles (no follow, just placement on scroll) on each section's key object: the comparison handle, the doctor monogram, the map pin. One element, three resting places, all transform-only. It turns "원(렌즈) 모티프를 반복" into a narrative instead of decoration.
2. **Real depth inside the lens**: besides the smoother surface, offset the after-layer by `(pointer - lensCentre) * 0.04` (transform only) and add a 1px inner refraction ring, so moving the lens feels like glass over skin. Costs nothing in filter time because both rasters are static.
3. **"오늘의 결" time-aware hero tint**: tie the gradient's frost share to Seoul time already computed for the hours card (morning cooler, evening warmer, 3 presets, set once on load). It supports "관찰" and makes the thumbnail and the live page feel alive without motion.

## Verified, and how

- shoot.mjs: 0 console errors, 0 page errors, 0 failed requests, no overflow at 1440/390. Viewed the load shot, all 10 desktop, all 13 phone and the reduced-motion shot.
- Own Playwright run (Chromium/SwiftShader; 1440x900 mouse; 390x844 touch via CDP touch events; 320; 768):
  - Lens: intro reaches home by 1.2s, idle Lissajous drift confirmed by position samples at 4s and 8s, mouse follow lands exactly on the pointer, CTA stays clickable under the lens (`elementFromPoint` is the button).
  - Scroll growth: radius 140 → 364 → 789 → 1283px over the first 540px, rim fades to 0 by 300px.
  - Phone: dragging the lens moves it (259,662 → 139,422) with `scrollY` staying 0; swiping on the headline scrolls the page (285px). Lens does not trap scrolling elsewhere.
  - Tabs: click and arrow keys, clip-path highlight slides, panels swap; four surfaces viewed.
  - Slider: mouse drag to 20% and 90%, keyboard ArrowLeft x3 (75/25), Home, End, focus ring on the knob, `aria-valuetext` updates.
  - Hours: page uses Seoul time correctly (machine clock was Tue 22:47 UTC, page showed 수요일 오늘 and "진료 전입니다. 오늘 오전 10시에 시작합니다").
  - Fee table on phone: stacked rows, price right-aligned, no sideways scroll.
  - Form: empty submit gives 6 specific errors and focuses 이름; Thursday + 저녁 → "저녁 진료는 수요일에만 합니다."; Sunday → "일요일은 쉽니다…"; Saturday + 오후/저녁 blocked; Wednesday + 저녁 succeeds with the required "컨셉 시안이라 실제로 접수되지는 않습니다." (but see blocker 2).
  - Tab through: 26 stops in logical order, visible focus on every control (deep ring on light, apricot on the dark booking band, box-shadow ring on inputs), skip link present.
  - Mobile menu: `aria-expanded`, focus to first link, Escape closes.
  - `?shot=1`: lens at 68%/52%, badge hidden (hint still visible, blocker 3).
  - 320px and 768px: no horizontal overflow.
- Contrast (computed): ink on apricot 9.0:1, deep on frost 9.2:1, ink-soft on frost 7.3:1, error on white 5.9:1, control border 3.5:1.
- Only Diphylleia 400 and Noto Sans KR 400/500 load (700 is requested in the font URL but unused: drop it from the `<link>`).

## Could not verify

- How the SVG filters rasterise on real iOS Safari / low-end Android (cost of full-screen `feTurbulence` + lighting at DPR 3, and whether `clip-path` moves stay on the compositor). Headless SwiftShader showed no errors but says nothing about frame rate.
- Screen-reader announcement quality (tested attributes, not speech).
- Whether the copy would pass an actual 의료광고 심의; finding 8 is a risk reading, not legal advice.
