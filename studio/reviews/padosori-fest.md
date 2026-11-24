# 검수: padosori-fest (파도소리 뮤직 페스티벌 2027)

## Verdict: **Fix** (not shippable to prospects until the 2 blockers are closed; no rework needed)

- The first screen is a real poster: ultramarine field, extruded Gasoek headline, yellow sun, tilted date slab, ridgeline sea. It reads "beach music festival" in one second and is the strongest thumbnail candidate of the set. Desktop 1440 is close to client-proud.
- The concept promise ("라인업을 누르면 소리가 나고 파도가 출렁인다") is only half delivered: the note plays, but the wave lives in the hero and is off-screen while you are in the lineup, and the readout that explains the act scrolls away too.
- Phone has one real bug (ticket tear widens the page) and a few unfinished states (stale readout, clipped timetable times, Gasoek used too small).

Paths below are relative to `studio/work/padosori-fest/`. Screenshots: `studio/.shots/review-padosori-fest/padosori-fest/` (shoot.mjs) and my interaction shots in the scratchpad `t/p-*.png` (not kept in the repo; described inline).

## Findings

### 🔴 Blocking

1. **Choosing a ticket at 390px makes the page wider than the screen.** `style.css:743` (`.ticket-radio:checked + .ticket .ticket__stub { transform: translate(18px, 8px) rotate(13deg) }`). After tapping 1일권 on a 390px touch viewport, `document.documentElement.scrollWidth` goes 390 → 429 and the mobile layout viewport grows to 427px (`innerWidth` 427): the whole page shrinks/shifts, the header menu button is pushed half off the right edge, and the torn stub is cut by the screen edge with its label wrapping to "입장권 고른 / 표". shoot.mjs did not catch it because it never selects a ticket. Fix: (a) `.ticket-list { overflow-x: clip; padding-right: 14px; }` (or `.tickets { overflow-x: clip }`), and (b) under `@media (max-width: 767.98px)` use a smaller tear `transform: translate(4px, 6px) rotate(7deg)` with `transform-origin: 0 100%` so the stub stays inside the 20px gutter; (c) `.ticket__stubtop { white-space: nowrap; font-size: 12px }` on phones. Re-check `scrollWidth === innerWidth === 390` after selecting each of the 3 tickets, and at 320px.

2. **The wave does not answer the lineup, which is the whole concept.** `sea.js:271-276` pauses the canvas when the hero leaves the viewport and `PADO.ping()` (`sea.js:338`) sends the swell to that hidden canvas. In `#lineup` the hero bottom is at about -486px, so hovering/tapping a name produces a colour wipe and a note but **no visible wave**; the copy at `index.html:82` ("파도가 그 음을 따라 칩니다") is then untrue on screen. Fix: add one small second ridgeline that is visible while the lineup is on screen, e.g. a `position: sticky; bottom: 0; height: 96px` (phone 64px) canvas strip at the bottom of `.lineup` (6 lines desktop / 4 phone, black and white strokes on pink, fill `#FF2E88`), driven by the same `swells[]`/`noteU` and analyser data, paused by its own IntersectionObserver. Reuse the `draw()` loop with a parameter object instead of duplicating it. This is still "one big effect": it is the same sea.

### 🟠 Important

3. **Readout scrolls out of view exactly when it is needed.** `style.css:428-434` `.lineup__readout` sits above the tiers; at 1440x900 once the headliner name is in view the readout is above the fold (my hover shot shows only names), so the description, stage/time and the note chip are never seen while hovering. Fix: `.lineup__readout { position: sticky; top: calc(var(--header-h) + 8px); z-index: 2; background: var(--pink); padding: 10px 0; }` (keep `min-height`), or move it below the tiers on desktop and keep it sticky at the top on phones.

4. **Readout shows the previous day's act after switching the date tab.** `main.js:202-207`: the tab callback wipes the highlight but leaves `nowEl`/`descEl`. After hovering 해파리 클럽 (14일) and clicking 8.15, the readout still says "해파리 클럽 미 E4 … 14일 토요일" above the 15일 lineup. Fix: in that callback reset to the initial strings (`이름을 눌러 보세요` / the default description).

5. **Timetable on phone clips times under the sticky stage column so they read as wrong times.** `style.css:587-600` sticky label + free scroll: at 390px the board opens at an arbitrary offset and shows ":00", "1:00 ~ 21:50", "~ 21:40" (shots phone-02/03, my `p-m-tt`). Fix: `.tt__viewport { scroll-snap-type: x proximity; scroll-padding-left: var(--label); }`, `.tt__hours li, .tt__set { scroll-snap-align: start; }`, and make `scrollToMinute()` (`main.js:236`) and `step()` land on whole-hour positions (`Math.round(x / hourW()) * hourW()`). On phones reduce `--label` to 76px so two full hours are visible.

6. **"지금" line is misleading for an event 262 days away, and uses device time while the countdown uses Seoul time.** `main.js:219-232`. Right now the board shows "지금 22:48" and paints 파랑주의보/모래알 오케스트라/여름방학 as playing (black) on all three days at once; the first thing a visitor sees on the timetable is the last hour with two empty rows. Fix: keep the line (brief asks for it) but (a) compute hours/minutes in `Asia/Seoul` like the countdown, (b) only add `.is-now` to the day tab that equals today's date during 8.14 to 8.16, otherwise label it `지금 22:48 (축제 날이라면)` and do not blacken any set, (c) before the festival open the board at 14:00 (`scrollToMinute(0)`), not at the now line.

7. **Gasoek One is used below its legible size.** At 1x it smears: `.lineup__now strong` 22px (`style.css:435`), footer brand line ("파도소리 뮤직 페스티벌 2027", about 20px), `.qty__value` 24px, summary title "주문 내용" (about 28px), ticket stub number 21 to 34px, map label "동해". Fix: nothing in `--font-display` under 32px; switch those to `900 1em var(--font-body)` (Gothic A1 900) with `letter-spacing: -0.01em`, or raise them to ≥32px (readout name to `clamp(28px, 3vw, 40px)`).

8. **Phone hero does not do what the brief asks ("h1은 2줄로 화면 폭을 꽉 채운다").** `style.css:342,348`: at 390px "파도소리" is about 300px and "2027" about 335px wide inside a 350px column, leaving a visible ragged right edge. Fix: size by container so both lines reach the right gutter: `.hero__title { font-size: 24.6vw }` and `.hero__line--year { font-size: 1.27em }` (tune until both lines measure 350±4px at 390 and 280±4px at 320), keep `letter-spacing: -0.02em`.

9. **Sound-on icon looks broken.** `main.js:85` scales bars to 0.25 when silent, so the pressed button reads "ı..." / "...." like a loading ellipsis (all my sound-on shots). Fix: floor at `0.45 + v * 0.75`, and when no note is sounding ease back to the static heights (set `transform: ''` after 600ms of silence).

10. **Ticket stub numbers imply dates that are wrong for the product.** `index.html` stubs print `0814` (1일권), `0815` (3일권), `0816` (캠핑). A 3-day pass stamped 0815 and a camping pass stamped 0816 read as single-day tickets. Fix: `1DAY` / `3DAY` / `CAMP`, or serials `A-001` / `B-003` / `C-001`.

11. **Order summary: no confirmation is announced and the price logic has no guard on 1일권 + date.** `index.html` `[data-result]` has no live region; `main.js:311-318` only swaps text. Fix: `role="status" aria-live="polite"` on `[data-result]`; when the error case fires, also scroll the ticket list into view (`radios[0].focus()` jumps the page on phone with no visible reason: the radio is visually hidden, so add `scrollIntoView({block:'center'})` on its label).

### 🟡 Polish

12. **Lede/hint "label strips" over the sea look like text-selection boxes.** `style.css:352-359` gives each wrapped line its own blue box with ragged right ends while wave lines butt into them (desktop-00, pointer-left shot). Fix: one solid plate instead of per-line clones: remove the span background and give `.hero__copy` `background: var(--blue); padding: 14px 18px 18px 0; box-shadow: -100vw 0 0 var(--blue);` or simply stop the canvas fill from starting above `y = copy bottom` on the left 40%.

13. **Hero bottom-left collision on small phones.** At 320x640 the date slab, the sun and the hint overlap each other and the slab touches the concept badge (`p-320b`). Fix: under `max-width: 359.98px` set `.hero__dates { bottom: 76px; }` and `.hero__sun { right: 4vw; --d: 96px }`; at 390 lift the slab to `bottom: 72px` so it never sits behind the badge.

14. **Footer giant word crosses its own rule.** In desktop-08/09 the 파 stem pokes through the horizontal rule and the word is clipped at 리 with nothing balancing it. If intentional, commit: let all four glyphs bleed by the same amount (`.footer__giant { margin-bottom: -0.12em }`) and move the rule above the word; otherwise set `line-height: 0.8; padding-bottom: 0.06em` so the baseline sits on the rule.

15. **Empty yellow below the timetable and black below the map.** About 130px of bare field after `.tt-note` and after the map caption (desktop-04, desktop-07) while the top paddings are tighter. Fix: bottom padding of `.timetable` and the route section to `clamp(64px, 7vw, 104px)`.

16. **Tap targets.** `02-000-0000` and `hello@padosori.example` in the 안내 footer line are 17px tall. Fix: `display: inline-block; padding: 12px 0;` (keeps the line height with `margin: -12px 0`).

17. **Hover wipe is also the only selected state for keyboard/touch.** After a tap on phone the lit name stays black until another is tapped, which is good, but the tap on a name with sound off gives a swell nobody can see (see 2) and no hint that sound is off. Fix: when `!PADO.sound.isOn()` on first tap, append `소리가 꺼져 있습니다. 위의 "소리 켜기"를 눌러 보세요.` to the readout once.

18. **Map semantics.** The pine-island marker labelled "솔밭 무대" sits in the sea while 파도 무대 and 모래 무대 are not on the map at all. Add the two missing stage markers (small squares in pink/white on the yellow beach line) so the map matches the three-stage timetable.

## More wow (ranked)

1. **Lineup shore**: the sticky mini-sea from finding 2, but let each name's swell start under that name's x position and travel along the strip; with sound on, the strip is the visualiser. This is the feature people will record and share.
2. **Play the night**: a small `▶ 14일 듣기` button next to the day tabs that plays the day's ten notes in set order as an 8-second arpeggio while the names light in sequence (reuses `Sound.play(k, delay)` and `wipeIn`). Honour reduced motion by lighting without the stagger.
3. **Ticket stub lands in the order panel**: after the tear, a copy of the stub (same colour, number) flies into the 주문 내용 card header with `Flip`-style FLIP (transform only, 420ms), so the summary visibly "holds" the stub.

## Verified, and how

- shoot.mjs run: 0 console errors, 0 page errors, 0 failed requests, no overflow reported at 1440/390 (but see finding 1). Viewed load shot, all 10 desktop, all 11 phone and the reduced-motion shot.
- Own Playwright run (Chromium/SwiftShader, 1440x900, 390x844 touch, 320, 768):
  - Pointer over the wave moves the envelope (left/right shots); click with sound off swells visually; **no AudioContext exists before the sound button is pressed** (constructor wrapped and counted: 0 after load, 0 after a wave click, 1 after pressing 소리 켜기, state `running`, `aria-pressed="true"`, label 소리 끄기).
  - Lineup: 10/10/10 acts, tabs by click and arrow keys (wraps), hover wipe, readout text, keyboard focus lights the name.
  - Timetable: arrows step one hour, mouse drag with inertia, ArrowLeft/Right/Home/End on the focused board, day tabs.
  - Tickets: empty submit shows the inline error, tear animation on each ticket, date select only for 1일권, quantity clamps 1 to 4, totals correct (4 x 268,000 = 1,072,000원), confirmation contains the required "컨셉 시안이라 실제로 접수되지는 않습니다."
  - Countdown: D-262, matches 2027-08-14 KST from today.
  - Map route draws on scroll; FAQ opens by click and Enter.
  - Tab through the whole page: 40 stops, every one has a visible ring (sun on blue/black, black on pink/yellow, blue on white), order is logical, skip link works.
  - Mobile menu: opens, focus moves to first link, Escape closes and returns focus, link tap closes and scrolls to the section under the header.
  - `?shot=1`: still frame with envelope right of centre, badge hidden.
  - Reduced motion: static wave, sound toggle still works, ticket state changes without the long motion.
- Contrast (computed): white on ultramarine 8.7:1, black on pink 6.0:1, black on yellow >14:1, sun on ultramarine 6.2:1. White on pink (3.5:1) is not used for small text. Pink strokes on blue are decorative.

## Could not verify

- Actual audio output and timbre (headless, no speakers); analyser-driven wave height with real sound.
- Real-device frame rate of the 28-line canvas and iOS Safari audio unlock behaviour.
- Google Fonts fallback rendering if Gasoek One fails to load.
