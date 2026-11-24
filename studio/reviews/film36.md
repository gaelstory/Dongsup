# Review: 서른여섯 사진관 (`work/film36/`)

**Verdict: Fix** (one blocking phone bug; desktop is nearly shippable).

- The hero is the best first screen of the two: the print developing under the safelight is beautiful, on-brief and clearly a film studio; the silhouettes with rim light and grain read as photographs, not clip art. Loupe + grease-pencil circles are a real delight.
- On phones the hand-off from hero to reel is broken at the most natural resting position: a half-faded copy of the print stays over the reel, blocks the swipe and re-develops the hero when tapped.
- The reel itself undersells the concept: the strip is black on black (perforations invisible), frames use 40% of the viewport height, the counter never reaches 12, and the last section's sign illustration looks unfinished.

Severity counts: 🔴 1 · 🟠 7 · 🟡 9

Screenshot names like `f2-p-0.5` refer to my Playwright captures in `/tmp/claude-0/-home-user-Dongsup/91ec7568-002e-5f27-a892-53c86a0d89d0/scratchpad/pw/out/` (temporary); `desktop-NN.jpg` / `phone-NN.jpg` are in `studio/.shots/review-film36/film36/`.

## Findings

### 🔴 Blocking

1. **Phone: ghost print sits on the reel, blocks swiping and hijacks taps** (`main.js:257` `endScroll = tDoc.y - innerHeight * 0.3`, `:278` fade at 0.83–0.95, `:132` print click; screenshots `f2-p-0.5`, `f-p-reel-0`, `f-p-reel-end`). The flight only finishes when frame 1 has scrolled up to 30% of the viewport. With the reel vertically centred (scrollY ≈ 880 on 390×844, i.e. where people stop to look at it) the timeline is parked mid-fade: `.print-fly` is at opacity 0.46, still `pointer-events: auto`, lying over frame 1. Measured: a horizontal swipe there leaves `scrollLeft` at 0 (the print is outside the scroller, so it eats the pan); a tap advances the hero photo `1/3 → 2/3` and swaps the reel's first frame; after scrolling the reel sideways the ghost stays put and double-exposes whatever frame is under it (veil over `첫 출근 전에`). Works only once the user scrolls ~70px further.
   Fix: (a) finish the flight when frame 1 reaches the viewport centre: `endScroll = tDoc.y + th / 2 - window.innerHeight * 0.55`. (b) Never leave it half faded: replace the scrubbed `autoAlpha` tween with a toggle at progress ≥ 0.9 (`onUpdate: p >= 0.9 ? gsap.set(fly, {autoAlpha: 0}) : gsap.set(fly, {autoAlpha: 1})`, or a 120ms non-scrubbed tween). (c) `pointer-events: none` on `.print` as soon as `scrollY > 40` (toggle a class in the same ScrollTrigger). (d) Hide frame 1's own picture until the print lands (see finding 5) so there is never a double image.

### 🟠 Important

2. **The film strip does not read as film** (`style.css:10` `--strip: #0C0A09`, `:230-236`; crop of `desktop-02.jpg`). Perforations are `#070707` holes on a `#0C0A09` strip on a `#070707` page: a 1.03:1 difference, invisible. Without sprocket holes the "reel" is a row of pictures with small orange captions; the brief's film-base colour `#D98A2B` is used only for 13px text.
   Fix: make the base visibly film: `--strip: #2B1708` (film-base at ~20%), holes stay `#070707`, and add the classic orange cast along the rebate: `.frame__cell { background: linear-gradient(#3A1F0B, #2B1708 14%, #2B1708 86%, #3A1F0B) }`. Raise hole size to 16×11px at 30px pitch and edge print to 14px/opacity 1. Check holes line up with frame pitch.

3. **Reel wastes the pinned screen** (`style.css:262` `--ih: clamp(220px, 40vh, 400px)`; `desktop-02.jpg`…`desktop-12.jpg`). At 1440×900 the frames are 360px tall between ~180px of empty black above the heading and ~200px below the captions; the signature section shows mostly nothing. At 1920×1080 the frames look small.
   Fix: `--ih: clamp(260px, 54vh, 620px)`; reduce `.reel__pin` padding to `72px 0 40px`; keep the heading row at its current size. Frame pitch grows, so re-check pin length (finding 8).

4. **Counter never reaches `12 / 36` on desktop** (`main.js:211-222`). The counter picks the frame nearest the viewport centre, but the track stops when frame 12's right edge meets the viewport edge, so the centre is still on frame 11 (verified: `11 / 36` from scrollY 6200 to the end of the pin; `desktop-12.jpg` shows frame 12 developed under an `11` counter). The brief's own example is `12 / 36`.
   Fix: let the strip travel until the last frame is centred: add `padding-right: calc(50vw - var(--fw) / 2)` to `.reel__scroller.is-pinned .reel__track` (and the same on the left so frame 1 starts centred under the landing print), or compute the index as `Math.round(st.progress * (frames.length - 1))`.

5. **Hand-off shows the same photo twice** (`main.js:262-278`; `f-d-hand-750`, phone `f-p-hand-3/4`). Frame 1 is already developed with the hero's picture while the print is still flying toward it, so for ~300px of scroll there are two identical images stacked, and on desktop the print also passes over the `지난 롤` lead text. The Flip illusion ("this sheet becomes that frame") is lost.
   Fix: keep `.frame:first-child .frame__img svg` at `opacity: 0` (empty black frame) until flight progress ≥ 0.9, then swap in the same call that hides the print. On desktop start the x-move 0.1 later so the print clears the heading row before it descends.

6. **1024×768: the hero does not fit** (`style.css:171,194,205`; screenshot `f-w1024-hero`). h1 wraps to three lines (`선명해지는 / 사진`), the third line and the CTA row fall below the fold and under the concept badge.
   Fix: at `min-width: 900px` set `.hero__title { font-size: clamp(44px, 5.6vw, 88px) }` and `.hero__copy { grid-template-columns: minmax(0, 1.4fr) minmax(300px, 400px) }`; print width term `calc((100svh - 390px) * 1.3)` → `calc((100svh - 430px) * 1.3)` below 800px height. Verify the CTA bottom ≤ viewport − 60px at 1024×768 and 1366×768.

7. **The "tray" is not there** (`style.css:144-145`; `desktop-00.jpg`). The brief has the paper floating in a developing tray. What renders is a full-bleed red haze with curtain-like diagonal streaks and a 10px `#050404` inset line around the whole hero, which reads as a screenshot border, not a tray rim.
   Fix: draw an actual tray behind the print: an inset rounded rectangle about 1.5× the print (`inset: 14% 18% 30%`, `border-radius: 18px`, `box-shadow: inset 0 0 0 2px rgba(241,238,230,.10), inset 0 18px 40px rgba(0,0,0,.6), 0 1px 0 rgba(255,120,120,.12)`), confine the two wave layers to it (`overflow: hidden`), and remove the 10px inset border. The liquid then has an edge and the print has something to float in.

8. **Contact sheet is 12 pictures pasted three times** (`index.html:431-436`, `data-tr` only scales 1.1× / 1.22×; `desktop-13.jpg`). A real 밀착 인화 shows consecutive, slightly different frames; identical triplets look like a placeholder and make "pick your favourite" pointless.
   Fix: give each of the three a visible variation, cheap ones are enough: horizontal flip on one (`scale(-1,1)`), a ±4–6% exposure shift (`filter: brightness(.82)` / `1.12`), a 12–20px pan, and one deliberately weak frame per row (slightly blurred or half-blinked lightleak). Vary them per row, not in the same order.

### 🟡 Polish

9. **Sign illustration at `오시는 길` looks unfinished** (`index.html:488-501`; crop `f-sign`). A red plate and a black rectangle with a dot floating in a large empty column; the "door" is cropped at the top and has no frame, steps or wall. It is the only clip-art moment on the page.
   Fix: draw the scene the copy describes: stair treads descending left to right (5 lines), a door with a frame and a bell button to its right, the red lamp *above the door* casting a radial glow on the wall and the top step. Same viewBox, ~15 more primitives.

10. **Pin length exceeds the plan's limit** (PLAN 4.3-6: desktop ≤ 600vh). Measured pin spacer 6391px at 900px height ≈ 610vh; with finding 3's larger frames it grows further.
    Fix: cap travel: `end: () => '+=' + Math.min(dist(), innerHeight * 5)` (the tween still maps to full distance), which also makes the reel feel less slow.

11. **36 tab stops with no way past** (`index.html:431`; Tab log: 36 consecutive `.cut` buttons). Keyboard users must tab through every cut to reach the form.
    Fix: roving tabindex (one stop, arrow keys move by 1 / by 6 per row, Space toggles) and keep the visible red ring.

12. **Selection has no limit or consequence** (`main.js:316-320`). At 12 picks the line still says `고른 컷 12장. 커플 필름은 열 장까지 인화해 드려요.`
    Fix: from 11 on: `열 장을 넘겼어요. N장을 빼거나, 가족 상품(열다섯 장)으로 바꿔 보세요.`; optionally colour the 11th+ circles in grease-pencil white.

13. **Date accepts the past and closed days** (`main.js:455`). `min` is set but the custom validator only checks non-empty; `2020-01-01` produced a success message `1월 1일 가족 촬영 예약 요청을 받았어요`.
    Fix: `ok = !!date.value && date.value >= date.min && new Date(date.value).getDay() !== 1`, with messages `지난 날짜는 고를 수 없어요.` / `월요일은 쉬는 날이에요.`

14. **Wrong particle in the live region** (`main.js:114`): `세 식구을 현상합니다`. Fix: pick 을/를 by final consonant, or rephrase `사진 「세 식구」 현상 중`.

15. **Concept badge touches the headline** (`style.css:204`; `desktop-00.jpg`: h1 baseline at 840px, badge at 848–884px, both starting at x≈58). BUILD-CONTRACT asks to keep the bottom-left ~60px clear.
    Fix: `.hero { padding-bottom: 84px }` at ≥900px (same as the 76px already used on phones).

16. **Header/hero and sections use different left edges** (`style.css:86-91`, `:188-192` vs `.wrap` 1320): hero copy starts at x=58, every section at x=118 on 1440px. Same issue as the bakery page.
    Fix: give `.site-head__in` and `.hero__copy` `max-width: 1320px`.

17. **320px header wraps** (`f-w320-hero`): `Studio 36` and `메뉴` break onto two lines. Fix: `white-space: nowrap` on `.mark__en, .menu-btn__label`; hide `.mark__ko` below 360px.

## Performance smells (not measurable headless; check on a mid-range phone)

- 50 `<use>` instances of scenes that each run the `f-photo` feTurbulence filter, plus 36 more in the loupe clone (`main.js:310`). Build the loupe clone lazily on first `pointerenter` and consider rasterising each scene once to a canvas/`<image>` for the 36 thumbnails.
- `@keyframes develop` animates a 6-function CSS `filter` for 1.7s on a filtered SVG (`style.css:252-258`); on phones several frames can be mid-animation while swiping. Promote with `will-change: filter` only while `.is-dev` is animating and drop `hue-rotate`/`saturate` from the animated part.
- Two 160%-sized `mix-blend-mode: screen` wave layers animate forever in the hero; they pause off-screen (good), but verify GPU cost on iOS.

## More wow (ranked)

1. **Real negative → positive in the reel**: with the orange film base from finding 2, undeveloped frames become proper orange-masked negatives on the strip and the centred one flips to a warm print. Add a thin light-table glow (`radial-gradient` paper at 6%) behind the centred frame so the eye knows where "now" is.
2. **Scroll velocity agitates the tray**: map ScrollTrigger velocity / pointer speed to the wave layers' translate (clamped ±2%) and the print's bob, so the developer visibly sloshes when the user moves and stills when they wait, which is the headline's point (`기다린 만큼`).
3. **Picked cuts fill the booking**: show the grease-pencilled cut numbers as a small strip above the form (`고른 컷 7, 16, 22`) and in the success message. It connects the toy to the conversion.

## Verified / not verified

Verified with `shoot.mjs` (0 console/page errors, 0 failed requests, no overflow) and my own Playwright run over http: develop timing (visible at 250ms, ~50% at 1.2s, done by 2.8s), pointer rocking (print rotates ≈1.3°, glint follows), print click and `다음 사진 현상하기` (3 photos cycle, 4 rapid clicks end in a consistent state, reel frame 1 swaps to match), desktop hand-off at 7 scroll positions, pinned reel to the end and back to top (print restored), plan row hover fill + click preselects the form, loupe (2.2×, follows, edge behaviour), grease-pencil draw/undraw and counter, keyboard focus on plan rows and cuts (Enter selects), form (empty → 3 inline errors + focus on name, bad phone, success message with the required disclaimer), phone touch context (tap print, hand-off in 5 touch steps, reel swipe at 6 vertical positions, tap-to-enlarge viewer open/pick/close with focus return, mobile menu, form errors), `?shot=1`, reduced motion (static developed print, all frames developed, no pin), JS disabled, 320 / 768 / 1024×768 / 1366×768 / 1920 widths.
Not verified: frame rate on real phones (see smells), iOS momentum/snap feel in the reel, screen-reader announcements, behaviour if Google Fonts is blocked, the native date picker in a Korean locale.
