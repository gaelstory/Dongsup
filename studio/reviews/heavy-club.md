# Review: heavy-club (헤비클럽) · M14

**Verdict: Fix** (the poster language is right and every interaction works; the desktop first screen and the fixed counter need real fixes before this is shown)

- At 390 and 768 the first screen is exactly the brief: three slabs of Black Han Sans edge to edge, red middle line, barbell, red strip with the offer. It looks like a gym.
- At 1440×900, which is the portfolio thumbnail, the same three lines fall apart into a 3×3 grid of isolated syllables with 354px holes, and the eye reads down the columns.
- Scroll-velocity stretch feels heavy and deliberate (not glitchy), hold-to-apply, timetable flip and phone tabs all work; the fixed rep counter sits on top of headings, icons, the legend and form fields all the way down the page.

`shots/…` = `studio/.shots/review-heavy-club/heavy-club/`; `qa/…` = my own Playwright captures (scratchpad, not kept).

## Findings

### 🔴 Blocking

1. **Desktop hero reads as columns, not as three commands.**
   Where: `style.css:189` (`.line__kin { justify-content: space-between }`), `main.js` `fitLines()`; `shots/desktop-load-0.5s.jpg`, `shots/desktop-00.jpg`, worse at 1440×600 and 1920×1080.
   Measured at 1440×900: glyph width 212 to 217px, gap between glyphs 354px, gap between lines about 0. Proximity groups the syllables vertically, so it reads 들버한 / 어텨번 / 라라더. This is the thumbnail.
   Fix: fill the width with the letters, not with air. In `fitLines()` compute a horizontal stretch per line: `sx = min(2.1, W / (lineTextWidth × fs × 1.04))` and apply `scaleX(sx)` on each `.ch` (transform-origin 50% 50%) with the leftover distributed as gap, capped at `gap ≤ 0.12 × glyph height`. At 1440×900 that is about `scaleX(1.95)` with 30px gaps: wide slab type, which also suits "글자가 늘어난다". If 1.95 looks too wide, the alternative is to let the hero be taller than the viewport on wide screens (font-size from width: `fs = W / (3.05 × 1.04)`, about 440px lines, strip stays pinned at the bottom of the first 100svh). Keep phone and tablet as they are (gaps 7 to 8px there, correct).

2. **Rep counter covers content, including form fields on phones.**
   Where: `style.css:577-591` (`.reps` fixed at left 16px, above the badge). `shots/desktop-01.jpg` (over the 1:1 PT icon), `shots/desktop-02.jpg` and `qa/d-fast-2.jpg` (over the first glyph of "옆에서 세어 주는 사람"), `qa/d-tt-flipped.jpg` (over the "크로스핏" legend item), `shots/phone-10.jpg` (over the 가격 text), `shots/phone-11.jpg` (over the 연락처 input and its placeholder), `shots/phone-02.jpg`.
   What: the content gutter is 16px on phones and 43px on desktop, and the counter is 115×42 at the same left edge, so it is always on top of something; with the badge under it the two stack into a 90px tall block of chrome.
   Fix: (a) dock it as one unit with the badge instead of stacking: same height (36px), placed to the right of the badge (`left: calc(16px + 205px + 8px)`, `bottom: calc(16px + env(safe-area-inset-bottom))`) on widths ≥ 480px; on phones keep it above the badge but shrink to the number only (`스크롤` label hidden, about 56×32). (b) Hide it (`transform: translateY(8px); opacity: 0`, 160ms) while `#apply` intersects the viewport and whenever an input has focus. (c) Add `padding-bottom: 96px` to the last section on phones so the 02 phone number and form message never sit under the chrome.

### 🟠 Important

3. **Resting barbell strikes through "라".**
   Where: `main.js` `placeBarbell()`; `shots/desktop-00.jpg`, `shots/reduced-motion.jpg`, `qa/d-shot1.jpg`, `shots/phone-00.jpg`.
   What: the black bar runs through the middle of the last red syllable like a deletion mark, and on desktop only one plate stack is on screen, so the object reads as a slider handle. The brief wants it "걸친" on the right end.
   Fix: put the bar behind the type and the plates in front: split the SVG into `.barbell__bar` (z-index below `.line--2`) and `.barbell__plates` (above), or simply set the whole barbell `z-index: 1` under `.line--2` (currently above) and add a 6px concrete stroke around the plates. Rest position: left plate stack centred in the gap before the last glyph, right sleeve ending 24px inside the viewport so both collars are visible.

4. **37 Tab stops to cross the timetable.**
   Where: `main.js` `cellHTML()`/`initSchedule()`. Tab order goes program rows → 37 cells → form.
   Fix: roving tabindex on the table (`tabindex="0"` on one cell, arrows move by row/column, Home/End per row), same pattern already used for the phone day tabs. Also add a skip target: `시간표 건너뛰기` link before the table, visible on focus.

5. **Hold button gives no "done" state and no progress cue for the first second.**
   Where: `style.css:539`, `main.js` `finish()`; `qa/d-hold-done.jpg`, `qa/m-hold-done.jpg`.
   What: after 3s the button is white and still says "꾹 눌러 체험 신청 (3초)". On phones the success message lands under the fold and under the counter. A user who lets go at 2.5s gets a snap-back and no explanation.
   Fix: on finish set both labels to `신청 완료`, `aria-disabled="true"`, and scroll `#form-msg` into view (`block: 'center'`). While pressing, replace "(3초)" with a countdown `3 → 2 → 1` (text swap each second, no animation needed). On early release show `조금만 더. 3초 동안 누르고 계세요.` in `#hold-hint` for 2s.

6. **Hold with empty fields: focus does not go to the invalid field on pointer.**
   Where: `main.js` `start()` → `validate()`; verified: after pointer press, `document.activeElement` is the hold button, not `#f-name` (the mousedown default focus wins).
   Fix: in the `pointerdown` handler call `e.preventDefault()` when `validate()` fails, then focus the field in a `requestAnimationFrame`.

7. **Mobile menu: focus never enters the sheet.**
   Where: `main.js:457` (`$('a', sheet).focus()` runs after `G.from(... autoAlpha: 0)` has set `visibility:hidden`, so the focus call is a no-op; verified `activeElement` stays on the 닫기 button).
   Fix: focus first, then start the tween; or animate `opacity` + `yPercent` only (no `autoAlpha`).

8. **Program-row hover block is wider than the rules it sits between.**
   Where: `style.css:311-316` (`margin: 0 -24px`); `qa/d-prog-hover.jpg`.
   What: the black inversion overhangs the 4px rules by 24px each side, so the corners look misregistered rather than intentional.
   Fix: either stay inside the rules (`margin: 0; padding-inline: 16px` always, so text does not shift) or bleed fully to the viewport edges (`margin-inline: calc(-1 * var(--gut))`). Pick the full bleed: it is the stronger poster move.

9. **Short and wide viewports.** At 1440×600 the glyphs shrink to about 120px with 500px gaps (`qa/v-1440x600.jpg`); finding 1's fix must be checked at 1440×600, 1920×1080 and 1024×768. Set a floor: `lineH ≥ 150px`, letting the hero exceed 100svh below that.

### 🟡 Polish

10. **Fast-scroll skew pushes headings into the gutter** (`qa/d-fast-1.jpg`): at −8° a 120px h2 moves its top edge about 17px left of the rule line. Use `transform-origin: 0 100%` for `.kin` h2s so the baseline corner stays on the grid, or cap h2 skew at 5° and keep 8° for the hero.
11. **Stretch threshold**: `v / 2400` means a normal wheel notch already gives 1.07 (measured). Add a dead zone so slow reading is perfectly still: `n = clamp((|v| − 300) / 2100, 0, 1)`.
12. **Counter label**: "스크롤 12 회" at 12px (`style.css:592`) is the smallest text on the page and not what the brief shows (`12회`). Drop the label, keep `12회` at 22px; put "스크롤" in an `sr-only` span if needed (the count is `aria-hidden` anyway).
13. **Timetable back face** (`qa/d-tt-flipped.jpg`): flipped cells show "코치 서하린 / 06:30" top-left in 15px; the reveal is the reward, so set the coach name in Black Han Sans 22px, vertically centred.
14. **Weekday 10:00 and 11:30 rows are entirely hatched for five columns** (`shots/desktop-05.jpg`): it reads as "closed" in the middle of the table. Group weekend-only rows under a thin "주말" divider row, or label the hatched cells `오픈 짐` (24시간 자유 이용 is a selling point).
15. **Footer wordmark and success message use red as text** (`style.css:552`, `.foot__word`): contrast is fine on black (5.9:1) but the brief's rule is "레드는 면으로만". Make the wordmark concrete on black with a red 4px rule above it, and the success `<strong>` chalk on a red block.
16. **Error state uses a dashed white border** (`qa/d-form-err.jpg`): dashed lines are the only non-solid stroke on the page. Use a solid 4px chalk border plus the `!` text you already have.
17. **`바로 신청하기`** is 103×48 with a thin underline next to a 280px slab; fine as the plain path, but give it `min-height: 56px; padding: 0 16px; border: 4px solid var(--iron)` on phones where it sits alone on its own row (`shots/phone-11.jpg`).
18. **Landscape phone (844×390)**: the badge sits on the third line's first glyph (`qa/v-844x390.jpg`). Add `padding-bottom` so the hero's red strip, not the type, is under the badge, or cap the hero at `max(100svh, 520px)` with the strip visible.

## More wow (ranked)

1. **The barbell gets loaded by scrolling.** Tie plate count to the rep counter: every 5 reps a plate slides onto the hero/footer barbell (or a small barbell docked in the header next to the logo), 20 reps = full bar and the "오늘 운동 끝" line. It turns the counter from chrome into the story of the page, and gives a reason to remove the floating box (finding 2).
2. **Stretch with mass, not just scale.** On deceleration add one overshoot: when velocity drops below 300 after a fast scroll, `scaleY` goes 1.35 → 0.96 → 1 (CustomEase, 420ms total) and the 4px rules under each h2 thicken to 8px for the same 420ms. Reads as a plate hitting the floor. Skip under reduced motion.
3. **Hold-to-apply as a lift.** While holding, the "0원" numeral next to the form is pushed up by the fill (translateY 0 → −24px, scaleY 1 → 1.15, tied to the same progress value) and drops with the release ease when let go; completes with the plate-drop shake you already have on the hero. Uses existing progress `p`, no new loop.

## Verified, and how

- `node studio/tools/shoot.mjs`: 0 console errors, 0 page errors, 0 failed requests, no overflow at 1440 and 390; viewed the load shot, all 10 desktop, all 12 phone and the reduced-motion shot.
- Own Playwright run (SwiftShader, local server): intro frames at 150 to 1300ms (type and CTA in place by the first frame, barbell at rest by about 700ms); slow wheel (scaleY 1.075, skew −1.7°), fast wheel with mid-scroll screenshots (1.31 to 1.33, −7.5°), reverse (skew +4.7°), settle back to exactly 1/0 within about 0.5s; phone emulation maxes at scaleY 1.20, skew −8° (wheel input; the stretch code path is shared). Marquee: rows move in opposite directions, timeScale 7.9 during fast scroll, sign flips to −1 after scrolling up, pause button (48×48) stops both rows and they stay stopped while scrolling. Rep counter reaches 20, shows the line once, clears after 7s. Program row → `#apply` with the matching radio preselected. Hold: blocked with empty fields, 50% at 1.5s, back to 0 within 300ms on release, completes at 3s; keyboard Enter (early release resets) and Space (completes); touch hold completes on phone; `바로 신청하기` validates and submits; success text contains the required disclaimer. Timetable flip by click, hover and Enter with updated `aria-label`; today's column (화) marked. Phone: menu open, Escape, link jump; day tabs (50×56) and flip in the list. Tab through the whole page: 54 stops, 4px ring visible on every one. `?shot=1`, reduced motion (no distortion, counter still counts, pause button hidden), JS disabled (all text and a static barbell visible), widths 320, 768, 1024, 1920, 1440×600, 844×390 without horizontal overflow. Automated contrast pass: only the hero red line is under 4.5:1 (2.78:1, the brief's stated exception).
- Read all of `main.js` and the CSS for every component cited.

## Not verified

- Real touch-scroll velocity on a device (CDP touch gestures did not scroll in this headless setup, so phone stretch was driven by wheel events); iOS long-press behaviour on the hold button (text-selection/callout); real 60fps under fast scroll; screen-reader output; 200% zoom. One mid-scroll phone capture showed the fixed header displaced, which I treated as a headless screenshot artefact and did not report.
