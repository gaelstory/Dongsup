# Review: 온기 베이커리 (`work/ongi-bakery/`)

**Verdict: Fix** (close to Ship; nothing is broken at 1440×900 / 390×844 on first load, but several states a client will hit in the first minute are not finished).

- The first screen is striking and unmistakably a bakery: the Bagel Fat One headline, the cherry `첫 판 07:30` sticker and the textured bread sprites are well above clip-art level, and the physics feels good (grab, throw, 와르르 all work).
- The weak spots are everything *after* the first settle: bread comes to rest behind the hint/sub copy, the pile swallows the copy on short laptops (1024×768), and the "지금" marker on the timeline collides with labels and is clipped late in the day.
- Lower sections (stamp card, recipe note, menu rows) are polished and on-brief; the map and the three different left edges on desktop are the least finished details.

Severity counts: 🔴 0 · 🟠 7 · 🟡 9

## Findings

### 🟠 Important

1. **Bread rests on top of the copy after any interaction** (`main.js:145` spawnX, `:367` settle, `:420` shakeAll; screenshots `o-d-shake-done`, `o-d-shake-spam-done`, `o-p-shake`). After 와르르 or a throw the pile spreads across the full width and bread settles behind `빵을 잡아서 던져 보세요.` and beside the CTA; 17px thin Gowun Dodum over a brown bagel is unreadable (cocoa on crust ≈ 2:1). The initial drop avoids this only by luck of `spawnX`.
   Fix: add a static collider for the copy block. Measure `.hero__in`'s children once (`hero__sub` top → `hero__hint` bottom, left 0 → right edge of the widest line + 24px) and treat it as an axis-aligned box in `walls()` (push bodies out along the shortest axis, same restitution 0.35). Simpler alternative: give `.hero__hint` and `.hero__sub` a sticker backing (`background: var(--butter); box-shadow: 0 0 0 6px var(--butter); border-radius: 8px`) so text always wins. Do one of them; the collider is the better one because bread then visibly piles *around* the words.

2. **1024×768 (and any hero shorter than ~800px at ≥1000px wide): the pile buries the sub copy, CTA row and hint** (`main.js:156-158`; screenshot `o-w1024-hero`). Tier `l` starts at 1000px and always spawns 26 bodies of r 34–64, regardless of hero height. At 1024×768 the pile reaches y≈540 and sits behind `식기 전에 오세요.`.
   Fix: derive count and radius from area, not width only: `var area = W * H; n = clamp(round(area / 50000), 12, 26); rMax = clamp(H * 0.071, 40, 64); rMin = rMax * 0.53`. Target: pile top never above 62% of hero height (assert it in `settle()` by checking the highest sleeping body).

3. **"지금" marker collides and gets clipped** (`style.css:296,353`, `main.js:585-593`; screenshots `o-time-0850-d`, `o-time-1640-t`, `o-time-2130-d`).
   - The label always hangs to the right (`left: 18px`). From ~16:10 it runs past the rack; at 900–1100px widths it is cut by the viewport (`지금 1…` at 960px, scrollWidth 1015 > 960).
   - After 17:00 and before 07:00 the marker is clamped to the ends, so at 21:30 a red `지금 21:30` sits on the 17:00 tick, which is simply wrong.
   - The label covers hour ticks and batch dots (at 08:50 it hides `09` and the 09:00 dot).
   Fix: (a) flip when `p > 0.8`: add class `is-flip` → `left: auto; right: 18px`. (b) Hide the marker when `t.min < 420 || t.min > 1020` (the status sentence already says it). (c) Move the label off the line: `top: calc(50% - 44px); transform: translate(-50%, -100%); left: 0` (above the red needle, like a flag), and clamp its x so it stays inside the rack.

4. **Hour labels are struck through by the stems** (`style.css:329-336`; `desktop-01.jpg`: `09`, `14`, and `08` under the marker). The even-row stems (`top: 50%; height: 60px`) run straight through the tick labels at 09 and 14.
   Fix: hide the tick label where a batch sits on the hour below the line (`.rack__hours i:nth-child(3), i:nth-child(8) { visibility: hidden }`), or put all hour labels on a milk pill (`background: var(--milk); padding: 0 4px; z-index: 1`) above the stems.

5. **Three different left edges on desktop** (`style.css:88-93` header, `:246-248` hero, `:53-58` `.wrap`). At 1440px the logo starts at x=58, the h1 at x=64 and every section below at x=138 (wrap 1280 + 4vw). Scrolling from hero to `빵 나오는 시간` the text column jumps 74px to the right. It reads as two templates glued together.
   Fix: put header and hero copy on the same container as the sections: `.site-head__in, .hero__in { max-width: 1280px }` and delete the `min-width: 1200px` override. The canvas stays full-bleed.

6. **Touch: tapping where the hint tells you to does nothing in the upper half** (`main.js:399-415`, `:453`). `pop()` only affects bodies within 210px of the tap; on a 390×844 phone the pile lives below y≈570, so a tap on the headline or copy (where the thumb lands after reading `화면을 톡 치면 빵이 튀어 올라요.`) has no effect. Also `pop` fires on `pointerdown`, so every scroll that starts on the hero kicks the pile (acceptable, but then the tap must always work).
   Fix: if no body is within the radius, apply the impulse to the 5 nearest bodies with `f = 0.6`. Keep the 210px falloff otherwise.

7. **320px: header and tilted cards break** (`style.css:96-104`, `:396-410`; screenshot `o-w320-hero`, overflow 26px). Logo wraps to two lines, `메뉴` wraps vertically inside the pill, the rotated `.recipe` and `.map` stick out past the viewport, menu name and price wrap onto separate lines.
   Fix: `.logo__word, .menu-btn__label { white-space: nowrap }`; `@media (max-width: 359px) { .logo__word { font-size: 20px } .menu-btn__label { display: none } .menu-btn { padding: 0 14px } .recipe { transform: rotate(-1.2deg); margin: 0 6px } .map { transform: none } }`.

### 🟡 Polish

8. **Map is the weakest illustration** (`index.html:419-470`; `desktop-06.jpg`, `phone-08.jpg`). `꽃집` sits on the block outline, the storefront overlaps two blocks, and at 390px the Gowun labels render at ~14px (`font-size="22"` in a 560 viewBox scaled to 350px) which is below the page's own 17px floor.
   Fix: move `꽃집` to `x=318 y=300` inside its block, raise all map label `font-size` to 28 (≈17.5px on phone), give labels a `paint-order: stroke; stroke: #FFF9EA; stroke-width: 6` halo.

9. **Timeline cards do not share a top edge** (`style.css:281`; `desktop-01.jpg`: 07:30 card top 349px vs 11:00 card 354px). The state chip makes `.batch__time` 5px taller only on cards that have one.
   Fix: `.batch__time { min-height: 32px }`.

10. **Valance under the hero reads as missing scallops** (`style.css:256-259`). Alternating butter/milk scallops against a milk section: the milk ones are outline-only and look like a rendering gap, especially behind the concept badge.
    Fix: alternate butter and cherry (`%23E3002B`) instead of butter and milk; it also previews the cherry band.

11. **Empty middle on wide/tall screens** (`o-w1920-hero`): at 1920×1080 the copy block is capped (158px h1, 1440 container) and the pile is ~20% of the height, leaving a large blank yellow field.
    Fix: h1 clamp upper bound 158 → 190px (`clamp(60px, 11vw, 190px)`), and let finding 2's area formula raise `n` to 32 above 1.8M px².

12. **Stamp card: no undo, and stamped slots stay in the tab order** (`main.js:629-650`). A mis-tap can only be fixed with `다시 모으기`. Fine for a toy, but pressed buttons that do nothing are 10 dead tab stops.
    Fix: let a second click lift the stamp (`aria-pressed="false"`, ink fades 120ms) or set `tabindex="-1"` on stamped slots.

13. **Disabled `다시 모으기` looks broken rather than disabled** (`style.css:76`; `desktop-05.jpg`): 45% opacity on mint turns it grey-green with a grey shadow, the only desaturated thing on the page.
    Fix: hide it until the first stamp (`hidden` toggled in `say()`), which also removes a useless control from the empty state.

14. **Red body text is at the limit** (`style.css:393`, `:416`): milk on cherry and `--cherry-deep` on milk are both ≈4.6:1 with a very thin face at 17–19px. Passes AA on paper, reads faint (see `desktop-04.jpg` story paragraphs).
    Fix: story text 19px → 20px and `font-weight: 700` is not available, so darken the band instead: story background `#D40028` gives 5.2:1; recipe note colour `#A3001E`.

15. **Menu wobble has no touch/keyboard equivalent and re-fires on every re-entry** (`main.js:685-693`). Minor, but on phones the menu rows are completely static.
    Fix: run the same 300ms wobble once when each row scrolls into view on touch devices (stagger 70ms, already have the ScrollTrigger batch).

16. **`식빵·소금빵`** (`index.html:251`) uses a middle dot the copy rules reserve for the badge. Fix: `식빵과 소금빵`.

## More wow (ranked)

1. **Bread piles around the words** (finding 1's collider, taken further): make each headline glyph row a static platform so the first few buns land *on* `구웠습니다` and roll off. One static box per text line is enough; it turns the headline into part of the physics instead of something the canvas hides behind.
2. **Timeline drives the pile**: when `빵 나오는 시간` has a batch within 10 minutes (or on clicking a batch card), drop three sprites of that bread into the hero/section header with a small `갓 나왔어요` sticker. It links the two best ideas on the page.
3. **Tenth stamp pays out in bread**: instead of generic confetti rectangles, burst 12 tiny bread sprites (reuse the cached 22px rasters) from the cup slot.

## Verified / not verified

Verified by running `shoot.mjs` (0 console errors, 0 failed requests, no overflow at 1440/390) and my own Playwright run over http: mouse grab + flick (canvas gets `is-hot`/`is-grabbing`, bread follows with spring lag and flies on release), hover push, 와르르 (single, keyboard Enter, and 6 rapid clicks: always settles), timeline at 06:00 / 08:50 / 13:55 / 16:40 / 19:30 / 21:30 / Monday at 1440, 960 and 390px via a fixed clock, menu hover wobble, stamp card to 10 (ink, counter, status, reward, confetti cleans up, reset returns focus), phone touch context (tap pops, vertical swipe from the pile still scrolls 385px, mobile menu opens, focus moves in, Esc closes, link closes and unlocks scroll), Tab order (22 stops, 3px cocoa ring everywhere, butter ring in the footer), `?shot=1` (badge hidden, two loads byte-identical), reduced motion, JS disabled (nav inline, fallback sprites), 320 / 768 / 1024 / 1920 widths.
Not verified: real-device frame rate and battery (headless SwiftShader only), iOS Safari rubber-band behaviour over the canvas, screen-reader output, behaviour with the Google Fonts request blocked.
