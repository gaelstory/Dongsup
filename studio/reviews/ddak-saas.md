# Review: ddak-saas (딱정산) · M07

**Verdict: Fix** (not Rework: the product UI is credible and the Flip demo is the right idea, well executed. Two things break the pitch on common devices and must go first.)

- At 1440x900 the first screen does its job: one clear headline, one CTA, and a real-looking ledger that fills itself in 3.9s and lands on 1,284,300원. Every number on the page reconciles (rows, fees, VAT, 36,500원, 2.8%, calendar cells and month total), which is exactly what a finance buyer checks.
- The three-step sticky window, fee calculator, pricing table and FAQ are tidy, quiet and consistent. Forward and backward scrolling, replay, manual mode by mouse and keyboard, reduced motion and `?shot=1` all behave.
- What lets it down: on a 768 or 720px-high laptop the total the whole demo builds to is below the fold; on Android the calendar popover needs two taps; the phone pile hides the amounts; and several details (unsorted ledger in manual mode, hint text on the window edge, popover blocking its neighbours, a half-empty step 3) undercut the "trustworthy tool" impression.

Screenshots: `shots/…` = `studio/.shots/review-ddak-saas/ddak-saas/`; `qa/…` = my own Playwright run (scratchpad, not kept).

## Findings

### 🔴 Blocking

1. **Laptop heights: the settlement total is cut off the first screen.**
   Where: `style.css:121-133` (hero padding and title), `:196/:220` (row height), app markup `index.html:57-110`. Measured: `[data-total]` bottom edge is at y=892 for every desktop width; viewport 1366x768, 1280x720 and 1024x768 therefore show the table down to the 17:48 row and never show `입금 예정 1,284,300원` or `12/12건 정산` (`qa/vp-1366`, `qa/vp-1280`, `qa/vp-1024`). At 900px it clears by 8px.
   Why: the count-up total is the payoff of the signature effect and the brief puts the window "첫 화면 안으로". Most Korean office laptops are 768 to 864px high.
   Fix (do both):
   - Put the total where it cannot be cut: a summary strip in the ledger head, right of `오늘 정산` (`입금 예정` label + `[data-total]` at 22px/700 Space Grotesk + `n/12건`), and keep the footer row as the table's sum line.
   - Compress under short viewports: `@media (min-width: 1024px) and (max-height: 880px) { .hero { padding-top: 24px } .hero__title { font-size: clamp(40px, 4.4vw, 54px) } .hero__lead { margin-top: 10px } .hero__actions { margin-top: 18px } .hero__stage { margin-top: 24px } .ledger__table td { height: 25px } .c-chip .chip { height: 22px } }`. Target: app bottom ≤ viewport height − 16px at 1366x768.

2. **Phone (Android/Chrome): first tap on a calendar day does nothing.**
   Where: `main.js` `initCalendar`, the `focus` and `click` listeners (`d.addEventListener('focus', open)` then `click: if (openDay === d && !fine) close()`). Reproduced at 390px with touch: tap 1 → popover stays hidden; tap 2 → opens (`qa/ph-pop1`, log `tap1 hidden / tap2 open`).
   Why: the tap focuses the button (opens), then the click sees it already open and closes it. iOS Safari does not focus buttons on tap so it may escape there; Chrome on Android does.
   Fix: track how it was opened. In `pointerdown` set `wasOpen = (openDay === d)`; in `click`: `if (!fine && wasOpen) close(); else open(d);`. Remove the close-on-click path for the focus-opened case. Re-test: one tap opens, second tap on the same day closes, tap on another day switches.

### 🟠 Important

3. **Popover covers the days below it and swallows the hover.**
   Where: `style.css:385-388` (`.pop`), `main.js` `place()`. Hovering 11월 2일 opens a 248x185 card that covers 9, 10, 16, 17 (`qa/pop-first`); moving the mouse down to 9일 lands on the popover, so it stays on 2일 (my hover on the 8th cell still returned "11월 2일").
   Fix: `.pop { pointer-events: none }` (it has no interactive content) and place it beside the row instead of on top of the next two: prefer above the cell when there is room (`above > 8`), otherwise below; add an 8px caret. Keep the origin-aware transform (it works: origin x follows the cell, y flips to 100% for the last row).

4. **Phone pile: amounts are hidden behind neighbouring chips.**
   Where: `index.html:70-81` (`--px/--py` percentages), `style.css:181`; `shots/phone-00.jpg`, `qa/ph-app0`, `qa/ph-try0` ("카드 단말기 46,00", "158,00", "312,000", "474,8" cut by the right-hand column). At 1440 two pairs also collide ("158,000원" under "배달앱 A 56,500원", "474,800원" touching "배달앱 A 41,500원", `qa/try0`).
   Why: the amount is the content of a transaction chip; the brief's phone note asks for readable 14px chips.
   Fix: below 900px use a wrapped flow instead of absolute scatter: `.inbox__pile { display:flex; flex-wrap:wrap; gap:8px 6px } .inbox__pile .chip { position:static; rotate: var(--r) }` with rotation limited to ±2°. On desktop move the right column to `--px: 54%` (from 47-51%) and cap chip width so no pair overlaps more than its border; verify at 1024 where the pane is narrowest.

5. **Manual mode builds an unsorted ledger.**
   Where: `main.js` `place()` (`var row = rows[filled]`). Clicking 11:46 then 14:22 then 09:14 produces a 정산표 in that order with the 시각 column out of sequence (`qa/try2`, `qa/try-done`).
   Why: a settlement table that is not in time order looks wrong to anyone who keeps books.
   Fix: each chip owns its row: `var row = rows[+chip.getAttribute('data-i')]`; status and total stay as they are. The pile empties in any order while the table fills like a real ledger, which also makes the "딱" snap more satisfying. (Auto mode already goes in index order, so nothing changes there.)

6. **Manual-mode hint is printed on the window's bottom border.**
   Where: `style.css:189` (`.inbox__hint`), `index.html:84`; `qa/step-f0` crop: "칩을 눌러 표에 넣어 보세요. 키보드로는 Tab과 Enter를 쓰면 돼요." sits with its descenders on the card edge, and looks underlined.
   Fix: take it out of the pile's flow bottom: `.inbox { display:flex; flex-direction:column } .inbox__pile { flex:1 } .inbox__hint { margin-top:12px; padding:8px 10px; border-radius:8px; background:#fff; border:1px solid var(--line) }` and keep `padding-bottom:16px` on `.inbox`. Shorten the copy on fine pointers to `칩을 눌러 표에 넣어 보세요.` and show the keyboard half only after a `keydown` Tab.

7. **Step 3 `받기`: the calendar half of the window is 60% empty.**
   Where: `index.html:145` (mini-cal, two weeks), `style.css:318`; `qa/step-f7` crop: two rows of cells, then blank white to the bottom of the pane while the left column runs four cards deep.
   Why: this is the destination of the Flip; it should look like the fullest state, not the emptiest.
   Fix: make cells taller and add content rather than weeks: `.mc { min-height: 112px }`, tokens 9px high with the count label (`4건`) left of the sum, and under the grid a one-line summary bar (`이번 주 입금 1,065,470원 · 다음 주 218,830원` written without the middle dot: two spans left/right). Alternatively add a third week row (12/7-12/13) marked as empty future days.

8. **21 consecutive Tab stops in the deposit calendar.**
   Where: `index.html` `.month-card button.day` (all in tab order). Tab walk: stops 15-35 are days.
   Fix: roving tabindex: only the focused/today cell has `tabindex="0"`, others `-1`; ArrowLeft/Right move one day, ArrowUp/Down one week (skip non-button days), Home/End first/last of week. Give the grid `role="grid"` semantics or keep buttons and add `aria-label="11월 6일 금요일, 입금 완료 1,077,520원"`.

9. **Annual price caption reads wrong.**
   Where: `main.js` `initPricing` (`'매달, 연 ' + won(m*12) + '원 한 번 결제'`), `index.html:294,300`; `qa/price-year`: "15,800원 / 매달, 연 189,600원 한 번 결제".
   What: "매달" and "한 번 결제" contradict each other in one line.
   Fix: `한 달 기준` under the number, and a second line `1년 189,600원을 한 번에 결제`. For the free plan keep `언제까지나`.

10. **Bad Korean line break in the security heading.**
    Where: `index.html:323`, `style.css:503`; `shots/desktop-09.jpg`: "가게 계정은 읽기 / 전용으로만 연결합니다" splits the term 읽기 전용.
    Fix: `가게 계정은 <span class="nb">읽기 전용으로만</span> 연결합니다` with `.nb { white-space: nowrap }`, or set `max-width: 11em` so it breaks after "계정은".

### 🟡 Polish

11. **Fake tabs look clickable.** `정산 / 입금 달력 / 리포트` and the `연남점 ⌄` store picker in the hero window are spans (`index.html:60`) styled exactly like tabs. Either make `입금 달력` scroll to `#calendar` and `리포트` to `#report` (real `<a>`), or drop the chevron and lower inactive tabs to `color: var(--fog); opacity:.7; cursor: default`.
12. **Switch tap target 46x28 on phone** (`style.css:439`). Add `.switch::after { content:""; position:absolute; inset:-8px }`.
13. **Type below 12px on phone.** Calendar short sums 10.5px (21 cells), mini-cal numbers 11.5px, file badges 10.5px. Raise `.day__sum .short` to 12px (drop the dot row on <360px to make room) and `.mc__n` to 12px.
14. **Replay while flying.** Second click on `다시 정산하기` mid-run snaps all in-flight chips to their rows for one frame before flying back (`qa/replay-mid`). In `reset`, kill flights with `f.kill()` and Flip from the chips' current on-screen state (`Flip.getState` before reparenting already does this once the forced `progress(1)` is removed).
15. **Total count-up finishes 0.4s after the last chip** and at 3.9s total it is at the brief's 4s limit on a fast machine. Tighten the stagger to 0.22s (`i * 0.22`) so the whole run ends near 3.5s.
16. **Hero completion state appears only at the end.** The lime check and "새 매출을 모두 정산했어요" are good; fade the dotted background to 40% at the same moment so the left pane reads as "done", not "empty", in a thumbnail taken late.
17. **Feature headings sit alone in tall columns.** `입금 달력` and `세무사와 공유` have a 46px h2 and three lines of text beside a 600px card (`shots/desktop-04.jpg`, `-06.jpg`). Add two proof lines under each (same check-list style as the steps) so the text column carries 40% of the card height.
18. **No-JS state shows 0원.** With scripts off, the hero window shows 12 chips and an empty table with `입금 예정 0원`. Render the first six rows filled in HTML (the `?shot=1` state) and let JS reset to empty before the auto run.
19. **`go()` assumes GSAP.** `main.js` Stage `go()` calls `G.set(...)` unguarded; if `gsap.min.js` fails but the page loads, step changes on phone throw inside `guard` and add `no-motion`. `if (G) G.set(...)`.

## More wow (ranked by impact)

1. **The "딱" moment.** When the 12th chip lands: all twelve rows flash their violet ring in a 20ms top-to-bottom cascade, the total gets the lime chip background (`#B4F03A`, ink text) for 600ms and a small `딱` stamp (Space Grotesk-weight Korean, rotated −6°) pops at scale 0.9→1 next to it. This gives the brand name a visible meaning in the first four seconds. One-shot, skipped under reduced motion.
2. **Chips arrive from the calculator.** Tie the fee calculator to the hero model: as the sliders move, 12 mini chips in a strip above the stacked bar re-sort into channel groups with Flip (same chip component, 20px high). It reuses the signature effect in a second place, which is what makes a product page feel like one system.
3. **Drag as well as click in `직접 해보기`.** Draggable is vendored: let a chip be dragged toward the table and snap into its own row with the same 1.04 pulse (click and Enter stay as the accessible path). On a sales call this is the thing the prospect will play with.

## Verified, and how

- `shoot.mjs`: report.json 0 console errors, 0 page errors, 0 failed requests, no overflow desktop/phone; looked at all desktop shots (00-11, load), all phone shots and the reduced-motion shot.
- Hero demo (1440x900): polled `[data-progress]`/`[data-total]` every 100ms from load: 12/12 and 1,284,300 reached at 3.95s; sum of the 입금액 column = 1,284,300; `다시 정산하기` once and twice mid-flight (ends correct, pile empty); `직접 해보기` with two mouse clicks out of order, then ten chips by Space/Enter (focus moves to the next chip, then to `다시 정산하기`; live region announces completion); rapid clicks.
- Three steps (desktop, CSS sticky + ScrollTrigger toggles): scrolled forward in 260px increments and backward in 420px increments with screenshots at each stop: 1→2→3 and 3→2→1 both correct, a 4200px fling in 0.6s ends in a clean state; channel switch toggles chips and count (`9건`).
- Fee calculator: keyboard arrows, Home/End on both sliders, mouse drag; totals match the formula at 3,000/3,500/10,000만 and 0/30/40/100%; bar segments and percentages update. Calendar: hover first/right-edge/last-row cells (position and transform-origin logged), focus, Escape, cell sums equal `data-dep`, month total equals the sum of all cells. Pricing switch by click and arrow keys (19,000→15,800, 49,000→40,800), phone plan picker x3, FAQ open/close by click and Enter, signup empty/invalid/valid.
- Phone 390x844 with touch: menu open/Escape, auto demo start on scroll, manual mode taps, each step window before/after its trigger, calendar taps (bug 2), calculator, pricing, signup. Also 320x640, 768x1024, 1024x768, 1280x720, 1366x768, 1920x1080.
- Keyboard: 57 Tab stops walked with computed outlines (2px violet on light, lime on the violet band and footer; none missing). `?shot=1`: 6 chips left, 6 rows, 315,450원, static across 1.5s, badge hidden. Reduced motion: completed state on load, try/replay switch instantly. JS disabled: all text visible.

## Could not verify

- Real iOS Safari behaviour for finding 2 (Safari does not focus buttons on tap, so it probably opens on the first tap there; Android Chrome matches my emulation).
- Flip smoothness on a real mid-range phone (headless SwiftShader only), and 200% browser zoom.
- Screen-reader output of the live region and the price roller (markup checked: `sr-only` value plus `aria-hidden` digit strips; not listened to).
