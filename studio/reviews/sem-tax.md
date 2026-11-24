# Review: 셈 세무회계 (`work/sem-tax/`)

**Verdict: Fix** (desktop is close to shippable; the phone layout has one blocking structural bug).

- The first screen is exactly the brief: a ledger, pine and paper, the numbers roll and a red 확인 seal lands on the total. At 1440 it reads as a careful tax office within a second, and the ledger grid, the folio counter, the `이하 여백` footer and the name seal are real craft.
- On phones every form-like block (calculator inputs, consultation form, its confirmation, FAQ, office info) is locked into the 226px 항목 column. Inputs are 202px wide, the confirmation breaks mid-word and the FAQ reads as one run-on paragraph.
- The two things a tax client checks first are not actually true yet: figures are not tabular (the font has no `tnum`, so the declaration does nothing) and several texts sit exactly on a rule line.

Severity counts: 🔴 1 · 🟠 5 · 🟡 12

Screenshots: `desktop-NN.jpg` / `phone-NN.jpg` are in `studio/.shots/review-sem-tax/sem-tax/`. Names like `p-form-done` are my own Playwright captures in `/tmp/claude-0/-home-user-Dongsup/91ec7568-002e-5f27-a892-53c86a0d89d0/scratchpad/rv-ts/sem/` (temporary).

## Findings

### 🔴 Blocking

1. **Phone (390px): forms, FAQ and office info are squeezed into the 항목 column and break** (`style.css:361` `.calc__inputs`, `:432` `.calc__note`, `:524` `.consult`, `:539` `.consult__done`, `:546-548` `.contact`, `:555-560` `.faq__btn`, `:570-571` `.faq__in`; screenshots `p-form-done`, `p-faq-2x`, `p-contact-2x`, `p-calc-2x`, `phone-10.jpg`, `phone-11.jpg`). Measured at 390px: revenue slider 202px, select 202px, name input 202px, FAQ question 226px, office-info value 132px, while the 금액 column beside them is empty.
   - Confirmation after submit: the text column is about 95px, so the title breaks inside a word (`신청서를 받았습니 / 다`) and the body is 11 lines of one or two words. This is the mandatory `컨셉 시안이라 실제로 접수되지는 않습니다` message.
   - FAQ: every question wraps to two 28px lines and fills its 56px row exactly, so five questions read as one bold paragraph; an opened answer continues with no gap either.
   - Office info: two-line values (`서울 OO구 / 가상로 12, 5층`, `평일 9시부터 / 6시`) also fill their rows, so six right-aligned lines run together and no longer pair with their labels.
   - Consent label wraps to three lines.

   Fix (phone only, under `@media (max-width: 899px)`); the two ledger columns stay for real 항목 | 금액 rows:
   ```css
   .calc__inputs, .calc__note, .consult { grid-column: 1 / -1; }
   .consult__done { grid-template-columns: 76px 1fr; }
   .seal--recv { width: 72px; height: 72px; }
   .faq__btn { grid-template-columns: minmax(0, 1fr) 44px; padding: 14px 0; }   /* 1 line = 56px row, 2 lines = 84px -> snap() rounds to 112 */
   .faq__btn > span:first-child { grid-column: 1; }
   .pm { grid-column: 2; }
   .faq__in { grid-template-columns: minmax(0, 1fr); }
   .faq__in p { padding-bottom: 28px; }
   .contact__row { grid-template-columns: 5.5em minmax(0, 1fr); }
   .contact dd { white-space: nowrap; }
   ```
   Add `.faq__btn` to the `SNAP` list in `main.js:23` so two-line questions land on 112px. Then re-check 390 and 360: confirmation title on one line, each FAQ question separated by a rule, each office-info value on one line.

### 🟠 Important

2. **Text sits exactly on rule lines in the services ledger** (`style.css:342` `.fee__u { margin-top: -14px }`, `:347` `.svc__io { padding-top: 14px; line-height: 28px }`; crop of `desktop-01.jpg`, also `p-work-2x`). The file header promises "writing never sits on a rule", but the fee units (`월, 부터`, `기장 고객`, `1회`, `규모에 따라`) are centred on the rule under the amount, and the second line of every two-line cell (`연동`, `계획`) is struck through by a rule, because 14px padding plus 28px lines puts line 2 at y = 56. Same on phones for the fee units.
   Fix: `.lrow--svc .svc__io { padding-top: 0; line-height: var(--row); }` (each line owns a row; rows are already 112px) and shorten the two wrapping strings so they fit one line at 1440 (`영수증 사진, 카드·통장 연동`, `경정청구 금액, 내년 절세 계획`). For the fee: `.fee__u { margin-top: 0; line-height: var(--row); }` so the unit sits centred in the second row, or move the unit before the number on the same line (`월 99,000부터`).

3. **Figures are not tabular; `tabular-nums` is a no-op with this font** (`style.css:263`, `:341` `.fee__n`, `:383`, `:459` `.month__dday`, `:487` `.due__dd`, `:549`). Measured in the page at 40px: Noto Serif KR `1` = 18.7px, `0` = 23.1px, and the widths are identical with `font-variant-numeric: tabular-nums`, `"tnum"` or `"hwid"` (the Google Fonts subset has none of them). Only the odometers are column-true because they use fixed 0.62em slots. So the 남은 날 column (`D-106` over `D-137` over `D-167`), fees, the revenue input and the phone number are proportional, and in `?shot=1`, reduced motion and no-JS the hero amounts are plain proportional text (amount widths 133/122/119px versus the slotted live version), so the thumbnail is not the ledger visitors see.
   Fix: one helper that wraps every digit in a fixed slot, used everywhere serif figures align: `function tab(el){ el.innerHTML = el.textContent.replace(/\d/g, '<span class="td">$&</span>'); }` with `.td { display: inline-block; width: 0.62em; text-align: center; }`, applied to `.fee__n` (numeric ones), `.month__dday`, `.due__dd`, `.contact dd a`. In `main.js:105` build the hero `Odo`s in the `still` branch too (no `zero()`, no animation, add `is-still`) so `?shot=1` and reduced motion match the live layout. For the `<input>` use `font-family: var(--sans)` (Gothic A1 digits are equal width: measured 22.6px for both).

4. **The calculator always promises 29 to 43% less tax, and the copy states it as fact** (`main.js:189-206`, `index.html:171`, `:215-221`). Measured per 업종 at the default revenue: 음식점 −32%, 카페 −35%, 소매 −43%, 미용 −31%, 프리랜서 −29%, 제조 −36%; at 10억 with 경비율 90% it shows 20,940,000 → 5,790,000 (−72%). The rows are labelled `점검 후 예상 세액` and `줄어드는 세금`, and the lede says `세금이 어떻게 바뀌는지 보여 드립니다`. A tax office cannot imply a guaranteed reduction; the single disclaimer line under the inputs (14px) does not offset a 23px green result. The bracket math itself is correct (checked against 6/15/24/35/38/40/42/45% with the right 누진공제, plus 10% 지방소득세; my own function matched every output).
   Fix: (a) wording: `점검 후 예상 세액` → `누락 경비를 찾았을 때 세액 (예시)`, `줄어드는 세금` → `줄어들 수 있는 세금`, lede → `빠진 경비와 공제가 있다면 세금이 얼마나 달라질 수 있는지 예시로 보여 드립니다.` (b) cap the model: `gap` 0.02 to 0.04 of revenue and `after = Math.max(after, now * 0.75)` so it never shows more than 25%. (c) move the note directly under the three result rows (`grid-column: 2 / -1` on desktop) and append `빠진 경비가 없으면 세액은 달라지지 않습니다.`

5. **Revenue slider: keyboard steps do nothing at the low end** (`main.js:216` rounds to 1,000,000 on a 1000-step log scale; `index.html:195`). From 3,000만 it takes 11 ArrowRight presses before the value changes to 3,100만; `aria-valuetext` repeats the same text meanwhile. Below about 2.8억 single steps are often silent.
   Fix: `max="350"` on `#c-rev` (about 1% per step), `sliderFromRev`/`revFromSlider` use 350, and round by magnitude: `var unit = r < 1e8 ? 1e5 : 1e6; return Math.round(r / unit) * unit;`. Verify: Home then ArrowRight shows `3,030만 원`.

6. **Number box accepts values it cannot use and never says so** (`main.js:264-275`). `2억` is read as 2원 (hint shows `0 원`, all three results 0); `5` or `1,000` likewise; `99999999999999` becomes `1000억 원` (no comma) and a 152억 tax. No message in any of these cases; only the empty field errors.
   Fix: parse `억`/`만` (`/(\d+(?:\.\d+)?)\s*억/`, `/(\d[\d,]*)\s*만/`), and when the result is under 10,000,000 or over 10,000,000,000 keep the previous results and show `연 매출은 1,000만 원에서 100억 원 사이로 넣어 주세요.` in `#c-rev-err` with `aria-invalid`. Use `toLocaleString` for the 억 part.

### 🟡 Polish

7. **Phone seal covers the first digit of the total** (`style.css:284-285` `right: 108px; top: 14px`; `p-hero-2x`). The ring crosses the `3,` of `3,420,000`. Fix: `right: 138px; top: 20px; width: 72px; height: 72px` so it overlaps the label side and the row below, not the figure.

8. **Desktop memo collides with the seal and paints a paper patch** (`style.css:297-298`, `:307`; `d-memo-hover-5`, `d-memo-hover-0`). Hovering 납부세액 shows `지방소득세까지 더한 금액입니다` with the seal's top edge over its last word; two-line memos fill the row and their `color-mix` background makes a lighter rectangle inside the hover band. Fix: shorten all six memos to one line of at most 16 characters (for example `지방소득세 포함 금액`, `배달앱 정산까지 한 줄로`), remove the `background` on `.memo`, and move the seal to `right: -52px; top: -30px`.

9. **Total's `원` pushes the most important figure off the column edge** (`index.html:117`; `d-hero-ledger-zoom`). `3,420,000 원` ends 20px left of the six amounts above it, although the header already says `금액(원)`. Fix: `.lrow--total .won { position: absolute; right: -2px; }` inside the cell padding, or drop the `원`.

10. **The example ledger does not visibly add up** (`index.html:74-118`). The concept line is "숫자가 맞아떨어지는 순간 도장", but 납부세액 4,870,000 and 아낀 세금 3,420,000 are not derivable from the rows above. Fix: add a row `점검 전 세액 8,290,000` above 납부세액 so `8,290,000 − 4,870,000 = 3,420,000` is checkable, and extend the note to `예시 장부입니다. 실제 세액은 사업장마다 다릅니다.`

11. **Half rows and a 4px drift break the 56px grid** (`style.css:275` `.ledger__note` 28px, `:512-513` `.people__role`). Hero and 상담 sections are N×56 + 28px tall, so the last row before each closing double rule is a half row; `대표 세무사 서윤재` measures 60px (the 22px serif `<strong>` inflates the line), so everything after it in 제 5 면 sits 4px low. Fix: `.ledger__note { line-height: var(--row); }`, `.people__role strong { line-height: 1; vertical-align: -1px; }`, and include `.contact` in the snap list. All other rows measured on-grid at 1440, 1024, 768 and 390 (also with FAQ and a month opened).

12. **Calendar: weekend deadlines and a marketing row** (`main.js:304`, `:310-315`). With the clock set to 2026-05-31 (a Sunday) the page shows 종합소득세 `오늘`; the real limit is Monday. The footnote explains it, but a tax office should compute it: in `nextDate`, `if (dt.getDay() === 6) dt.setDate(dt.getDate() + 2); else if (dt.getDay() === 0) dt.setDate(dt.getDate() + 1);` and print the shifted day. Also December's headline entry is `연말 절세 점검 상담` (the firm's own event) inside a table titled `놓치면 가산세가 붙는 날들`, and the row's `D-16` actually refers to 원천세. Fix: summary `원천세만 있는 달`, and show the consultation as a non-red note line inside the panel.

13. **Ruler dot is cut at month end** (`style.css:477`; crop of `desktop-04.jpg`). A deadline on the last day sits at `left: 100%`, half outside the grid border. Fix: `.ruler { margin: 0 var(--cell); }` (the first declaration at `:469` is overridden by `margin: 0` on `:470`).

14. **Phone memos are undiscoverable and unannounced** (`main.js:141-149`; `phone-00.jpg`). Nothing suggests rows can be tapped, the default 경비 누락분 memo is closed on phones, and rows toggle without `aria-expanded`. Fix: start with `.is-noted` open on phones (`is-open is-hot`), add a 13px line under the ledger `행을 누르면 메모가 보입니다`, and set `aria-expanded` on the row in the click handler.

15. **Phone headings are double-spaced** (`style.css:195`, `:208`). 27px and 31px type on a 56px line makes two-line titles (`맡기시면 이렇게 / 정리됩니다`) read as two separate rows. Fix: `.h2 { font-size: 30px }`, `.hero__title { font-size: 36px; letter-spacing: -0.045em }` on phones so the glyphs fill the row; keep the 56px line.

16. **320px overflows by 8px** and office-info rows leave the grid (`w320-full`). Fix: the nowrap in finding 1 needs `font-size: 14px` under 360px, and `.field__hint { white-space: normal }`.

17. **Small tap targets and semantics.** Phone link in office info is 26px tall and the footer one 14px (`style.css:549`, `index.html:368`): give both `display: inline-flex; min-height: 44px; align-items: center`. `#cal` has `role="list"` but contains a non-item `<p class="cal__foot">` and header row; `.hero__ledger` has `role="table"` with a `<p>` child; five FAQ panels are each `role="region"`. Fix: move the footnote and the note outside the list/table elements, drop `role="region"` from the FAQ panels.

18. **No-JS values disagree** (`index.html:202-204`). Static markup says 경비율 62% with results computed for 69%. Fix: `value="69"` and `69%`. Also `.people__cap` wraps to an orphan `도장` on phones: `white-space: nowrap; font-size: 12px` or shorten to `직접 찍는 도장`.

## More wow (ranked by impact)

1. **Let the sum visibly reconcile before the seal.** After the rows land, tick each amount with a small 인주 check mark going down the column (60ms apart, DrawSVG or `clip-path`), draw the subtraction line, then the double underline and the seal. With the extra `점검 전 세액` row (finding 10) the stamp becomes the consequence of numbers matching, which is the brief's concept sentence. Cost: 7 tiny SVG checks and 0.4s inside the existing 2.5s budget.
2. **Give the calculator a result worth looking at.** Make `줄어들 수 있는 세금` a full-width total row: serif 900 at 40px across columns 3 and 4, gold double underline redrawn (scaleX 0→1, 200ms) each time the value settles, bars spanning two columns with the difference hatched in 인주 red. Today the key figure is 23px in a corner of an otherwise empty grid.
3. **Carry the balance between pages.** Real ledgers end a page with `차면 이월` and start the next with `전면에서 이월`. Put those two small serif labels on the last and first rule of each section (right column, 13px, ink-2) next to the folio number. It costs twelve lines of markup and makes the "one book" idea land while scrolling.

## Verified, and how

- `shoot.mjs` run: 0 console errors, 0 page errors, 0 failed requests, no overflow at 1440 or 390; looked at every desktop and phone scroll shot, the 0.5s load shot and the reduced-motion shot.
- Roll and seal timing sampled per frame in the page: digits start 0.47s and finish 1.84s after DOMContentLoaded, rows land in order every ~150ms, underline at 1.89s, seal 2.14 to 2.26s. Sequence and feel are right; `?shot=1` shows the finished state immediately with the badge hidden; reduced motion shows the seal from the start.
- Memo notes: hover each row, Tab focus (focus ring visible, memo shown), tap on phone (row grows to 112px).
- Grid snapping measured for every row-like element against its section origin at 1440, 1024, 768, 390, 320 and 1920, before and after opening FAQ items and a month.
- Calculator: keyboard on both sliders (Home/End/arrows/PageUp), all six 업종, number box with empty, letters, `2억`, `1.5e8`, negative, 30억 and 14-digit input; outputs compared with my own implementation of the 2026 종합소득세 brackets.
- Calendar with the clock mocked to 7 dates (including Jan 25, May 31, Dec 31, Feb 28): `오늘`, `지남`, year roll-over and the flipped today label all behave; single-open accordion, Enter toggles, `aria-expanded` correct.
- FAQ (mouse, Space key, `inert` on closed panels), form (empty, bad phone, valid; focus moves to the first invalid field, errors linked with `aria-describedby`, confirmation receives focus and is announced).
- Full Tab pass on desktop: 45 stops, every one shows a 2px pine outline (range thumbs get their own ring); phone menu opens, Esc closes, link tap closes; no-JS render at 1440 and 390; external requests are Google Fonts only.

## Not verified

- Real-device touch dragging of the range thumbs and iOS Safari rendering of the `mix-blend-mode` seals with the SVG filter (headless Chromium only).
- Screen-reader output (roles and names were read from the DOM, not listened to).
- Firefox (`::-moz-range-*` styles exist but were not run).
