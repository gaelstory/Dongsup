# Review: dalmuri (달무리) · M06

**Verdict: Fix** (not Rework: the concept, hero and booking flow are sound; two visible defects must go before a client sees it)

- The first screen is the strongest thing here: the ring reads as ink and moonlight, the vertical Song Myung headline is well set, and it is clearly a quiet, expensive Korean dining bar at 1440 and at 390.
- Below the hero the page keeps its restraint, the pinned plate and the moon calendar both work end to end with mouse and keyboard, and copy is specific and natural.
- What lets it down: page text slides visibly under the transparent header on every section, the calendar's brightness says "closed" on days that are open, and the hero exit is a black curtain rather than ink dissolving.

Screenshots referenced as `shots/…` are in `studio/.shots/review-dalmuri/dalmuri/`; `qa/…` are from my own Playwright run (scratchpad, not kept).

## Findings

### 🔴 Blocking

1. **Text collides with the header on every section (desktop and phone).**
   Where: `style.css:133-139` (`.bar::before`), `style.css:340-345` (sticky `.sec__head`). Seen in `shots/desktop-08.jpg` (계절/에 따르는 behind 예약·차례), `shots/desktop-10.jpg`, `shots/phone-14.jpg` (address row printed through 예약/차례), `shots/phone-10.jpg`.
   What: the scrim is a gradient that is only opaque for its top 55% and then capped at `opacity:.94`, so the big vertical h2s (which are sticky right under the bar) and body text stay legible behind the nav labels as they scroll out.
   Fix: make the bar band fully opaque and move the fade below it: `.bar::before { inset: 0 0 -28px 0; background: linear-gradient(var(--black) 0, var(--black) calc(100% - 28px), rgba(12,12,14,0)); }` and `.bar.is-solid::before { opacity: 1; }`. Keep it at opacity 0 over the hero (current `start: 40` toggle) but also fade the hero copy out before it reaches the bar: scrub `.hero__copy` to `autoAlpha: 0` between scrollY 0.35×heroH and 0.6×heroH (the h1 currently ghosts behind 차례 in `qa/d-heroscroll-250.jpg`).

2. **Calendar: brightness contradicts availability.**
   Where: `style.css:591-604`, `main.js` `moonSVG()`/`render()`; `shots/desktop-09.jpg`, `shots/phone-10.jpg`.
   What: the section intro says "밝은 달이 뜬 날이 예약할 수 있는 날입니다" and the legend shows a bright dot for open days, but around the new moon (Dec 8 to 12) open days are drawn as dark discs that look the same as the closed Mondays (7, 14). Only the number colour differs. A client will read a third of the month as closed.
   Fix: separate the two encodings. Phase stays in the lit shape; availability becomes a ring + number: open days get `.m-base { stroke: var(--moon); stroke-opacity: .9; stroke-width: 1.2; fill: #2A2925 }` and `cal__num` in `--moon`; off days get no stroke, `opacity: .35` on the whole `.cal__moon` and number `#6E6A62`. Change the legend swatch for "예약할 수 있는 날" to a ringed disc, and rewrite the intro to match: `테두리가 밝은 날이 예약할 수 있는 날입니다. 보름 무렵은 일찍 찹니다.`

### 🟠 Important

3. **Hero exit reads as a black slab sliding up, not ink dissolving.**
   Where: `style.css:234-237` (`.hero::after` 22svh gradient), `ink.js:205` (`R += s * 0.45`), `qa/d-heroscroll-250.jpg`, `-500.jpg`.
   What: the ring is cut by a straight horizontal edge about 200px tall while still fairly crisp, and the darker header band cuts it at the top too.
   Fix: let the shader do the dissolve before the cut arrives: reach `s = 1` at `scrollY = 0.55 × heroH` (currently 0.85), raise the bleed term to `bleed*(.07+.75*uS)` and thickness to `+.2*uS`, and make the bottom fade `height: 45svh` with an eased gradient (`rgba(12,12,14,0) 0, rgba(12,12,14,.55) 55%, var(--black) 100%`).

4. **Pointer interaction with the halo is close to invisible.**
   Where: `ink.js:85` (`*.08*fall*uAmt`). `qa/d-pointer.jpg` after a 360px drag across the ring is indistinguishable from the idle frame.
   What: a visitor will not discover the signature interaction. The brief's 0.08 is honoured but the falloff (`exp(-d²·8)`) confines it to a small spot.
   Fix: widen and add a trace: falloff `exp(-dot(dp,dp)*4.5)`, displacement `0.11`, and add `col += MOON * 0.05 * fall * uAmt * inkN` so a faint wet sheen follows the cursor. Keep the lerp at 6/s so it stays slow.

5. **Phone: sticky plate bar lets list text show through under it.**
   Where: `style.css:390-406`; `shots/phone-04.jpg`, `shots/phone-05.jpg` (half a line of description visible between the plate caption and the next row).
   What: the 28px fade under the sticky stage shows clipped half-lines.
   Fix: give the stage a hairline instead of a fade: remove `.course__stage::after` gradient, add `border-bottom: 1px solid var(--line-soft)` and `box-shadow: 0 12px 16px -8px var(--black)`.

6. **Disabled booking steps are near-invisible while the submit button is at full strength.**
   Where: `style.css:620` (`.book__step:disabled { opacity:.42 }`) combined with `:649` (`.5`), `shots/desktop-09.jpg`, `qa/d-kb-full-focus.jpg`.
   What: 18:00 / 20:30 and the party sizes render at about 21% effective opacity (roughly 1.5:1), so before a date is picked nobody can see what the steps are; the only bright element is a submit button that will just return an error.
   Fix: `.book__step:disabled { opacity: .6 }`, drop the extra `.5` on options inside a disabled fieldset (`.book__step:disabled .opt__face { opacity: 1 }`), and render the submit button as outline (`.btn` without `--solid`) until `time && party` are chosen, then switch to solid.

7. **Full or closed day gives no feedback when chosen.**
   Where: `main.js:491`. Enter/tap on 12월 25일 (마감) does nothing visible and announces nothing (verified with keyboard and touch).
   Fix: in that branch set `#book-msg` to `12월 25일은 마감되었습니다. 테두리가 밝은 날을 골라 주세요.` (class `is-error`), and play a 160ms `x: ±3` nudge on the moon (skip under reduced motion).

8. **Vertical h2 column breaks leave one-syllable orphans.**
   Where: `index.html` h2 spans; `shots/desktop-08.jpg` ("열두 자리의 / 바"), `shots/desktop-07.jpg` ("잔에 따르는 / 계절" is fine).
   Fix: break by sense, not by particle: `<span>열두</span> <span>자리의 바</span>`. Check the same rule on "자리를 / 맡아 두겠습니다" (first column is 3 glyphs, second 7; set `<span>자리를 맡아</span> <span>두겠습니다</span>`).

9. **Hero copy vs calendar range.**
   Where: `index.html:70` ("가을 차림은 12월 20일까지 냅니다."), calendar offers 12월 22일 to 1월.
   What: a guest booking 12월 26일 is told nothing about which menu they get.
   Fix: after picking a date past 12/20, the date line reads `겨울 차림을 냅니다` (small, `--dim`); or change the note to `겨울 차림은 12월 22일부터 냅니다.`

### 🟡 Polish

10. **차례 overlay columns start at different heights** (`style.css:200`, `qa/d-toc.jpg`): the small labels have 2 to 4 glyphs so the big titles start at four different y positions. Give `.toc__ord` a fixed block size: `block-size: 4.6em` so every title starts on one line.
11. **Hero at 1024×768: ring is cut by the left viewport edge** (`qa/v-1024x768-hero.jpg`, `ink.js` `computeGeom`). Clamp so the outer glow stays inside: `cx = Math.max(cx, R_OPEN*1.22*m + 24)` and reduce `m` first.
12. **Phone hero: 150px of dead black under the headline and no cue that content follows** (`shots/phone-00.jpg`, `style.css:245`). Show `.hero__cue` on phones too (it is `display:none` below 1024px) at `bottom: 72px` so it clears the badge, or lower the copy block by 4svh.
13. **Header blocks clicks across its full width** (`style.css:127`): the transparent 80px band intercepts pointer events over content. `.bar { pointer-events: none } .bar a, .bar button { pointer-events: auto }`.
14. **After a successful booking, nothing changes but the message** (`qa/d-kb-done.jpg`): focus stays in 연락처 and the form can be re-sent. Move focus to `#book-msg` (`tabindex="-1"`), change the button label to `예약 내용 고치기`, and scroll the message into view on phones.
15. **Phone: after tapping a date the time step is 585px below** (measured). Scroll `#book` to `block: 'start'` with a 72px offset after a date is picked on widths under 1024px.
16. **Error colour**: `.field__err` uses `#E9A693` (a second persimmon) while the brief limits 홍시 to the 마감 marks. Use `--hanji` text with a leading `!` and a brass 1px underline on the field instead.
17. **Plate caption cross-fade dips to 15% opacity mid-change** (`main.js` `setActive`, `qa/d-pin-click-mid.jpg`): during a fast scrub the title flickers grey. Start from `autoAlpha: .5`, 300ms.
18. **1440×640 (short laptops) drops the pin**, so the plate scrolls off while the list is read (`qa/v-1440x640-course.jpg`). Lower the pin threshold to `min-height: 600px` and size the plate with `min(100%, 52svh)`.

## More wow (ranked)

1. **The halo answers the calendar.** When a date is chosen, the hero shader is offscreen, but the booking column can carry a small (160px) second canvas or a CSS/SVG moon that takes that night's phase and blooms its ring once (600ms). The phrase "상현달이 뜨는 밤" then has a picture. Biggest payoff for the signature idea, small code (reuse `moonPath`).
2. **Ink follows the course.** On each plate change, drop a single ink bloom behind the plate (one SVG circle with the existing `#brush` filter, scale .9→1, opacity .35→0, 900ms). It ties the pinned section back to the hero material without a second loop.
3. **Slow drift on the first screen for touch users** is already there but subtle; add a one-time "breath" at 2.0s after load (R 0.32→0.335→0.32 over 2.4s, once) so the still thumbnail moment and the first second on a phone feel alive.

## Verified, and how

- `node studio/tools/shoot.mjs`: 0 console errors, 0 page errors, 0 failed requests, no overflow at 1440 and 390; viewed load, all 12 desktop, all 15 phone and the reduced-motion shot.
- Own Playwright run (SwiftShader, local `python3 -m http.server`): pointer drag over the ring; scroll-out in 250px steps; pin range (3.2 viewports, within the 600vh limit) with wheel scrub (courses advance 1→9), click jump (여섯째 → scrollY 3590, correct plate) and keyboard Enter on a course (focus kept, correct plate); liquor hover and keyboard focus (rows are focusable, first row shown by default); floor plan draw; full booking by keyboard only (arrows, Enter/Space, radio groups, validation errors linked by `aria-describedby`, success message with the required disclaimer); month navigation limits; 차례 overlay open/close, focus trap, Escape returns focus, link jump lands on the pin start; Tab order through the page with a visible 2px brass ring on every stop; phone: menu, sticky plate, tap on course, calendar and form with touch, 16px inputs, 50×60 day targets; `?shot=1` (ring fully open at 0.6s, badge hidden); reduced motion at 390; WebGL-disabled fallback (CSS ring appears); JS disabled (all text readable); widths 320, 768, 1024, 1920 and 1440×640 without overflow.
- Read all of `ink.js`, `main.js`, the HTML structure and the CSS for every section cited.

## Not verified

- Real GPU frame rate and the adaptive-resolution drop (SwiftShader only); real iOS Safari behaviour of the `100lvh` fixed canvas with the collapsing toolbar; Lenis feel with a real trackpad; screen-reader output (checked attributes only); 200% zoom.
