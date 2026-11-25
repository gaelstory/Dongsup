# Desktop (1x screen) legibility pass

## The problem the owner saw
On an ordinary computer monitor (1x pixel density), small body text set in thin faces looks faint and broken:
in 꽃집 사월, Nanum Myeongjo 400 at 16px in `--soil-soft` loses its hairlines, so "받지" reads like "반지".
On phones (3x density) the same text is crisp, and the owner likes the phones as they are.
Contrast ratios pass, so the Refactoring UI audit could not catch this: the colour is fine, the strokes are not.

## What was tested (꽃집 사월 `.info p`, rendered at 1x)
| Variant | Result |
|---|---|
| A. current: 16px, `--soil-soft` | faint, hairlines break |
| B. `--soil` + 17px | better, still thin |
| **C. B + `-webkit-text-stroke: .3px currentColor`** | **solid and still clearly a serif. Chosen.** |
| D. B + stroke .45px | heavier than needed |
| E. B + weight 700 | too heavy, loses the face's character |

## The rule for every page
1. **Scope: low-density screens only.** Put every change inside
   `@media (max-resolution: 1.49dppx), (-webkit-max-device-pixel-ratio: 1.49) { … }`
   so phones and retina screens render exactly as now. Add it as one block at the end of the page's `style.css`,
   commented `/* 1x screens: thin text legibility (studio/reviews/DESKTOP-LEGIBILITY.md) */`.
2. **Thin text faces at body sizes** (≤ 20px: Nanum Myeongjo, Gowun Batang, Noto Serif KR 400, Gowun Dodum, Gaegu,
   Sunflower, any 400 serif or handwriting face, and light-on-dark text of any face at 400):
   `-webkit-text-stroke: .3px currentColor` (light text on dark backgrounds: start at .25px).
   Set it on the elements that carry body/secondary text (or on `body` and reset to `0` on display/heading fonts,
   bold weights ≥ 700, icon fonts, and anything inside `<svg>`/canvas overlays). Never stroke display faces.
3. **Secondary text in those faces:** on 1x screens use a darker secondary (or the primary text colour) so small
   thin text reaches about 7:1 (normal sans text 4.5:1 is fine). Keep the token system: add a token, e.g.
   `--soil-soft-1x`, or redefine the existing secondary token inside the media query.
4. **Size:** thin serif/handwriting body text below 17px goes to 17px at ≥ 900px wide, if the layout holds.
5. **Sans pages** (IBM Plex Sans KR, Noto Sans KR, Gothic A1 at 400+ on light backgrounds) usually need nothing.
   Check them anyway; small grey or light-on-dark text at 400 may need step 2 or 3.

## How to verify
- `node studio/tools/shoot.mjs --out studio/.shots/<slug> work/<slug>/index.html` (desktop shots are 1x).
- Crop and enlarge text-heavy areas to judge strokes, e.g.
  `ffmpeg -v error -y -i desktop-05.jpg -vf "crop=900:300:0:400,scale=iw*2:-1:flags=neighbor" crop.png`
  then Read the PNG. Compare before/after on at least three text-heavy sections, at 1440 and 1280.
- Phone shots (3x in your own Playwright script with `deviceScaleFactor: 3`) must look the same as before.
- report.json stays clean (0 errors, no overflow).
