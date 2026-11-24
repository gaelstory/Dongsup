# 검수: supmeong-stay (숲멍 스테이, M11)

검수일 2026-11-24 · 대상 `studio/work/supmeong-stay/` · 기준 PLAN.md 0, 3.0, M11, 4 + BUILD-CONTRACT.md

## Verdict: **Fix** (재작업 아님. 아래 🔴 2건과 🟠 상위 4건만 고치면 Ship)

- 스크롤이 하루를 흘려보내는 컨셉은 제대로 섰다. 06:00, 12:00, 18:30, 22:00 정위치 장면은 16종 중에서도 손꼽히게 아름답고(특히 노을과 별밤), 달력·핫스팟·키보드·reduced-motion·no-JS까지 구현 완성도가 높다.
- 문제는 "정위치 사이"와 "기준 폭 사이"다. 오후 4~5시 구간에서 글이 뿌연 흰 판 위에 뜨고 대비가 깨지며, 1000~1199px에서는 시계가 메뉴 글자 위에 겹친다. 스크림이 카드처럼 보이는 순간도 있다.
- 첫 화면은 고요하고 고급스럽지만 아직 "와" 하지는 않는다. 오두막이 작고, 새벽 숲이 한 톤 실루엣이라 평면적이다. 마지막 장면(창불빛)은 예약 바가 오두막을 가린다.

스크린샷 표기: `shots/` = `studio/.shots/review-supmeong-stay/supmeong-stay/`, `qa/` = 검수자가 직접 찍은 Playwright 캡처(`<scratchpad>/qa/sup/`, 임시).

---

## 🔴 Blocking

### 1. 1000~1199px에서 시계가 내비 글자와 겹친다 (320px에서는 브랜드명과 겹친다)
- 어디: `style.css:146-162`(헤더 안 시계 위치), `style.css:454-459`(내비는 1000px부터 표시), `style.css:481-499`(시계가 구석으로 내려가는 건 1200px부터). 캡처 `qa/w1024-hero.jpg`, `qa/w1024-sunset.jpg`, `qa/w320-hero.jpg`.
- 무엇: 1024×768에서 `포함 사항`과 `오전 6:00`이 같은 자리에 찍힌다(가로 태블릿, 작은 노트북 전 구간). 320px에서는 `숲멍 스테이`의 "이" 위에 "오전"이 얹힌다.
- 고칠 값:
  - `@media (min-width: 1000px) and (max-width: 1199px) { .clock { top: auto; right: var(--gx-r); bottom: calc(var(--bar-h) + 14px + env(safe-area-inset-bottom, 0px)); padding: 6px 14px; border-radius: 999px; background: rgba(13,24,40,.86); color: var(--snow); } }` (하단 바가 이 구간에서는 전체 폭이므로 바 위로 올린다). `main.js:259, 318`의 `innerWidth >= 1200` 분기도 같은 기준으로 맞출 것.
  - `@media (max-width: 359px) { .clock__ampm { display: none; } .brand__ko { font-size: 15px; } .clock { right: calc(var(--gx-r) + 78px); } }`

### 2. 오후 3시 30분~5시 36분 구간: 글자 대비 미달 + 스크림이 흰 판이 되어 오두막을 덮는다
- 어디: `main.js:200`(`dusk = h >= 17.6`), `style.css:18`(`--scrim: rgba(238,243,240,.56)`), `style.css:186-192`. 캡처 `qa/x-d-2.jpg`(16:05), `qa/x-p-2.jpg`(폰 16:10), `qa/x-p-3.jpg`(17:14).
- 무엇: 18:30 카드가 화면 아래에서 올라오는 동안 하늘은 이미 보랏빛으로 어두워지는데 글자는 아직 전나무색이다. 스크린샷 픽셀 측정(글자를 투명 처리한 배경 대비): 16:19 시점 본문 중앙값 **4.3:1**, 최저 **3.5:1**, 제목 최저 4.3:1. 브리프의 "모든 키프레임에서 본문 4.5:1"을 못 지킨다. 폰에서는 전체 폭 스크림이 우윳빛 띠가 되어 오두막과 숲을 통째로 지워 버린다(가장 못생긴 순간).
- 고칠 값:
  - `main.js:200` → `var dusk = h >= 16.2;` (하늘 휘도가 0.35 아래로 떨어지는 지점. 이때 어두운 스크림 `rgba(13,24,40,.56)` 위 눈색 글자는 5.5:1 이상 나온다.)
  - 낮 스크림도 가장자리에서 4.0~4.3까지 떨어진다(06:13, 10:24 측정). `--scrim` 알파 `.56 → .68`, 어두운 쪽 `.56 → .62`.
  - 전환이 툭 바뀌지 않게 `.hero, .day`의 `transition: color 500ms`는 유지하되, `.scrim::before`의 `transition`을 `background-color 500ms` → `700ms`로.
  - 수정 후 14:00~19:00을 15분 간격으로 다시 측정해 본문 4.5:1 이상을 확인할 것.

---

## 🟠 Important

### 3. 스크림이 "카드"로 보인다 (12:00, 18:30 데스크톱)
- 어디: `style.css:439-445`. 캡처 `shots/desktop-03.jpg`(세로 경계선이 x≈740에 보임), `shots/desktop-04.jpg`, `qa/d-moment-1830.jpg`(어두운 사각 판이 빛줄기를 자른다).
- 무엇: 선형 그라디언트 두 장을 교차시킨 마스크라 모서리가 둥근 직사각형으로 읽힌다. 브리프는 "카드 없음, 글 뒤에만 부드러운 국소 스크림".
- 고칠 값: 마스크를 타원 방사형으로 교체. `.scrim::before { inset: -110px -220px; -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 52%, rgba(0,0,0,.5) 74%, transparent 100%); mask-image: (동일); -webkit-mask-composite: initial; mask-composite: initial; }`. 폰(768 미만)은 현행 세로 페더를 유지하되 페더 길이 44px → 72px.

### 4. 예약 바가 오두막을 가린다. 마지막 장면에서는 절반이 가려진다
- 어디: `style.css:500-509`(바를 화면 가운데 아래 고정), `main.js:60`(`depthY` near 70, front 130), `main.js:320-326, 687`. 캡처 `qa/d-moment-2200.jpg`, `shots/desktop-13.jpg`(푸터 "오늘 밤에도 창에 불을 켜 두겠습니다" 장면에서 창불빛이 바 뒤로 들어감).
- 무엇: 1440에서 바는 x 390~1050, 오두막은 x 770~960. 스크롤이 진행될수록 near 층이 70px 내려와 오두막 문과 데크가 바 뒤로 숨는다. 이 사이트의 주인공이 가려진다.
- 고칠 값:
  - `@media (min-width: 1200px) { .book-bar { left: 250px; transform: none; width: min(470px, 34vw); } .book-bar.is-hidden { transform: translateY(140%); } .book-bar__summary { grid-auto-flow: row; gap: 0; } }` (배지 오른쪽에 붙는 작은 알약. 오두막 x 범위를 비운다.)
  - 푸터가 보이면 바를 숨긴다: `main.js:687` 옆에 `.site-footer`용 IntersectionObserver를 하나 더 두고 `updateBar()`의 조건에 `footerInView` 추가(푸터 안에 예약 링크가 이미 있다).
  - `main.js:60` `depthY: [0, 16, 38, 46, 70, 82, 130]` → `[0, 14, 30, 36, 44, 52, 96]` (오두막 하강량 70 → 44px).

### 5. 히어로 CTA의 포커스 링이 안 보인다
- 어디: `style.css:70`(`:focus-visible { outline: 2px solid currentColor }`), `.btn--primary`의 글자색이 눈색. 캡처 `qa/x-cta-focus.jpg`.
- 무엇: 링 색이 `rgb(246,248,247)`인데 뒤가 새벽 안개(`#DCE4E0` 계열)라 대비 약 1.2:1. 4.5의 "배경과 3:1" 위반.
- 고칠 값: `.btn--primary:focus-visible { outline: 2px solid var(--fir); outline-offset: 3px; box-shadow: 0 0 0 5px var(--snow); } html.is-dusk .btn--primary:focus-visible { outline-color: var(--lamp); box-shadow: 0 0 0 5px var(--night); }`

### 6. 폰 약도의 글자가 7~9px
- 어디: `index.html` 약도 SVG `<text>`들, `style.css:386`. 측정: `숲멍 스테이 9.3px`, `가상리 마을회관/개울 다리/흙길 10분/국도 25분 7.7px`, `홍천 나들목 방면 7.1px` (390px 기준). 캡처 `qa/p-map.jpg`.
- 고칠 값: `@media (max-width: 599px) { .map text { font-size: 22px; } .map .map__name { font-size: 26px; } }`(viewBox 640 기준, 렌더 12~14px). 라벨이 길과 겹치면 `홍천 나들목 방면`은 폰에서 숨기고 본문 1번 항목이 대신하게 한다.

### 7. 푸터(폰): 달이 헤드라인 마침표에 붙고, 내려오는 동안 글이 불 켜진 창 위를 지난다
- 어디: `main.js:174-177`(달 궤도), `style.css:389-396`. 캡처 `shots/phone-16.jpg`, `qa/p-end.jpg`(달이 "두겠습니다." 바로 옆, 달무리가 글자 뒤), `shots/phone-15.jpg`, `qa/p-end-minus420.jpg`(`숲멍 스테이 Supmeong Stay`가 노란 창 위).
- 고칠 값:
  - 세로 화면에서 23:00의 달 위치를 헤더 바로 아래 오른쪽 구석으로: `main.js:111`의 portrait `ry` 계수 `0.7 → 0.9`, 달 각도 식 `(h - 19.4) / 9.6` → `(h - 19.4) / 12` (23시에 x가 더 오른쪽, y가 더 위).
  - `@media (max-width: 767px) { .site-footer { padding-top: 24svh; } }`
  - `.footer__brand, .footer__contact, .footer__note`에 `text-shadow: 0 1px 12px rgba(13,24,40,.9)`.

### 8. 헤더가 장면 모드일 때 면 경계의 물결이 번져 지저분한 회색 얼룩이 된다
- 어디: `main.js:317`(헤더 모드 판정선이 y=36), `style.css:101-105`. 캡처 `shots/desktop-13.jpg` 상단, `shots/phone-16.jpg` 상단, `qa/p-anchor-houses.jpg` 상단.
- 무엇: 밝은 면의 물결 가장자리가 헤더 아래를 지나는 동안 헤더는 이미 반투명 "scene" 모드라, 흰 물결이 12px 블러에 뭉개져 더러워 보인다. 페이지 맨 끝에서도 남는다.
- 고칠 값: 판정선을 헤더 아랫변으로. `main.js:317` → `surfaceWatch(header, '-' + (hh - 1) + 'px 0px -' + Math.max(0, vh - hh) + 'px 0px')` (`hh` = 헤더 높이 60/72). 그리고 `.edge--bottom`이 헤더 밑에 있는 동안은 직전 모드를 유지(면의 `data-surface` 관찰 대상에 `.edge`를 포함).

### 9. 첫 화면이 아직 "와" 하지 않는다: 오두막이 작고 새벽 숲이 평면적이다
- 어디: `main.js:101-106`(`fit`), 풍경 SVG `index.html:72-102`. 캡처 `shots/desktop-00.jpg`, `qa/d-shot1.jpg`(썸네일이 될 장면).
- 무엇: 1440×900에서 오두막 높이 약 190px(화면의 21%)로 오른쪽 아래에 작게 놓였고, 왼쪽 위 1/4은 히어로 스크림이 만든 흰 얼룩이다. 나무는 줄마다 한 가지 색 실루엣이라 가까이 보면 클립아트 느낌이 난다(큰 앞나무 하나만 좋다). 노을과 밤은 층이 살아 있는데 썸네일이 되는 새벽이 가장 약하다.
- 고칠 값:
  - 확대: `fit()`의 `ar >= 1.6` 분기 `w = Math.min(1000 * ar, 2400)` → `Math.min(860 * ar, 2100)` (약 16% 확대, 오두막 높이 약 220px). 오두막이 CTA와 겹치지 않는지 1440/1920에서 확인.
  - 깊이: `.trees-back`을 2~3개 그룹으로 나눠 fill을 `#4D6B60 / #5F7C71 / #6F8A80`으로(먼 쪽일수록 안개색에 가깝게), 그룹별 불투명도 1 / .85 / .7.
  - 빛: 오두막 지붕 왼쪽 변에 1.5px 창불빛색 림라이트(`stroke: #F7D9B4; opacity: .5`, 06:00~07:30만), 창 아래 풀에 번지는 불빛 타원을 지금의 약 1.6배로.
  - 히어로 스크림은 3번의 방사형 마스크로 바꾸면 얼룩이 풀린다. `?shot=1`(06:20)에서 다시 캡처해 썸네일로 판단.

### 10. 폰 하단 바의 문구가 잘린다
- 어디: `main.js:508-513`, `style.css:421-423`. 측정: 날짜 선택 후 `#bar-dates` 내용 239px / 영역 198px → `12월 3일(목)부터 12월 5일(토)…`. 320px에서는 기본 문구도 `요금이 바로 계산됩…`. 캡처 `qa/p-bar-with-range.jpg`, `qa/w320-hero.jpg`.
- 고칠 값: 600px 미만에서는 짧은 형식 사용. 날짜 줄 `12.3(목) ~ 12.5(토), 2명`, 가격 줄 `2박 560,000원`. 기본 상태는 `날짜를 고르면` / `요금이 나옵니다`.

---

## 🟡 Polish

### 11. 폰: 달력이 화면에 있는데도 바가 남고, 올라간 배지가 날짜 칸을 덮는다
- `main.js:687` rootMargin `-35% 0px -35% 0px` → `-12% 0px -12% 0px`. 바가 숨은 동안 `html.bar-off .concept-badge { bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }`. 캡처 `shots/phone-11.jpg`, `qa/p-cal-range.jpg`(12월 20~23일 줄이 배지 밑).

### 12. 핫스팟 툴팁에 꼬리가 없고, 폰에서는 그림 전체를 덮는다
- `style.css:269-288`. 꼬리 추가: `.tip::after { content: ''; position: absolute; left: var(--ax, 50%); bottom: -6px; width: 12px; height: 12px; background: var(--fir); transform: rotate(45deg); }`(`is-below`는 top). 600px 미만에서는 툴팁을 그림 아래 고정 설명 줄로(`position: static; transform: none; width: 100%; margin-top: 12px`), 선택된 핫스팟만 표시. 캡처 `qa/p-spot-0.jpg`~`p-spot-5.jpg`.

### 13. 달력 안내문이 두 줄이 되면 달력이 한 줄 밀린다
- `style.css:307` `.cal__hint { min-height: 3em; }` (가장 긴 문구 "사이에 예약된 밤이 있어…" 기준). 캡처 `qa/d-cal-across.jpg`.

### 14. 지난 날짜와 예약 마감 날짜가 거의 같아 보인다
- `style.css:335` 사선 `height: 1px; background: rgba(246,248,247,.45)` → `height: 1.5px; background: rgba(246,248,247,.8)`. 달력 아래 범례 한 줄 추가(`사선: 예약 마감`, `동그라미: 오늘`). 달력 아래 190px 빈 띠(`shots/desktop-10.jpg`)도 범례가 채운다.

### 15. 별이 푸터 헤드라인 글자 사이에 찍혀 문장부호처럼 보인다
- `shots/desktop-12.jpg`("오늘·밤에도"). `.footer__line { text-shadow: 0 0 6px #0D1828, 0 0 22px #0D1828; }` 또는 `placeStars()`에서 큰 별(`big`)은 `x > vb.x + vb.w * 0.5`에만.

### 16. 정오의 해가 글 덩어리 뒤에 걸린다
- `shots/phone-03.jpg`(해가 "계곡에 발을 담급니다" 제목 뒤), `shots/desktop-04.jpg`(스크림 속에서 얼룩처럼 보임). 세로 화면 `ry` 계수를 7번과 함께 `0.9`로 올리면 정오의 해가 헤더 바로 아래로 올라가 글과 떨어진다. 데스크톱은 `moment--left`의 12:00 카드와 해가 반대편이 되도록 호의 `rx` 계수 `0.4 → 0.46`.

### 17. 폰의 전화·메일 링크 터치 높이 16~17px
- 오시는 길 `033-000-0000`(113×17), 푸터 전화(106×16), 메일(174×16). `.contact a, .footer__contact a { display: inline-block; padding: 13px 0; margin: -13px 0; }`

### 18. `49㎡`, `23㎡` 글리프가 본문보다 훨씬 작게 나온다
- `shots/desktop-06.jpg`, `desktop-07.jpg`. `49m<sup>2</sup>`로 바꾸고 `sup { font-size: .62em; }`.

### 19. 성능 냄새(헤드리스라 실측 못 함)
- 전체 화면 고정 SVG 7장 모두 `will-change: transform`(`style.css:84`) + 나무 `<use>` 수백 개 + 헤더와 바의 `backdrop-filter`. 움직이지 않는 sky 층(`depthY 0, depthX 0`)은 `will-change` 제외, 바의 `backdrop-filter: blur(10px)`(`style.css:505`)는 배경이 90% 불투명이라 효과가 거의 없으니 삭제. 중급 안드로이드 실기에서 스크롤 fps 확인 필요.

---

## More wow (효과 큰 순)

1. **창이 하나씩 켜지는 저녁.** 17:40 다락 창 → 18:10 아래 창 → 18:40 데크 등 → 19:30 별동 등불 순으로 켜고, 켜질 때마다 풀밭 위 불빛 타원이 한 단계 넓어진다. 지금은 한 번에 켜진다. `lit` 값을 요소별 `smooth()` 4개로 나누면 끝.
2. **새벽 안개가 스크롤에 실제로 "걷힌다".** 06:00~08:30 동안 계곡 안개 띠 2장을 서로 반대 방향으로 가로 이동(±120px)시키고 나무 줄 사이에 얇은 안개 1장을 더 끼운다. 썸네일(06:20)의 깊이가 바로 달라진다.
3. **22:00 카드의 "별을 셉니다"에 맞춰 별똥별 한 줄.** 카드가 화면 중앙을 지날 때 한 번만(DrawSVG 0.6초, 이미 로드한 플러그인). reduced-motion에서는 생략.

---

## 확인한 것과 방법

`shoot.mjs` 결과(`report.json`: 콘솔 0, 페이지 오류 0, 실패 요청 0, 가로 넘침 없음)와 데스크톱 15장, 폰 18장, reduced-motion 1장을 전부 직접 봤다. 그 위에 자체 Playwright 스크립트(Chromium, swiftshader)로 다음을 실행하고 캡처를 확인했다.

- 하루 스크롤: 카드 4장을 화면 중앙에 맞췄을 때 구석 시계가 `6:15 / 12:00 / 6:30 / 10:00`으로 카드 시각과 일치. 새벽, 정오, 노을, 저녁, 밤 캡처 확인.
- 대비: 260px 간격 18지점에서 글자를 투명 처리한 스크린샷의 픽셀로 배경 대비 계산(2번 근거). 14:00~17:15 추가 캡처.
- 포인터 시차: 좌/우 끝에서 앞 층 ±11.3px, 층별 비례 확인(브리프 ±12px).
- 핫스팟: 첫 호버 360ms 지연, 두 번째는 60ms 안에 표시(지연 없음), 키보드 포커스 표시, Esc 닫힘, 폰 탭 열기/닫기 모두 동작.
- 달력: 2박 선택 `560,000원`, 4명 `680,000원`, 마감일 클릭 안내, 마감일을 끼운 범위는 새 체크인으로 재설정, 방향키/Home/End/PageUp/PageDown/Enter/Space, 달 넘김, 빈 제출 오류, 제출 확인 문구(`컨셉 시안이라 실제로 접수되지는 않습니다.` 포함).
- 390px: 바(779~844)와 배지(732~768) 겹침 없음, 메뉴 열기/Esc/포커스 복귀, 앵커 이동 후 제목이 헤더 아래에 놓임(데스크톱 h2 상단 290~304px, 폰 152px).
- Tab 순회 48회: 순서 논리적, 가려지는 요소 없음. 5번만 링이 안 보임.
- `?shot=1`: 06:20, 안개 걷힌 상태, 배지 숨김. reduced-motion: 시차 0, 섹션 단위 시간 전환. JS 끔: 모든 글과 풍경, 달력 대체 문구 보임. 320/768/1024/1920 폭: 가로 넘침 없음(1024와 320은 1번의 겹침).

## 확인하지 못한 것

- 실제 기기 fps와 Lenis 체감(헤드리스 swiftshader는 느려서 판단 불가), iOS Safari의 `100lvh`와 주소창 접힘 시 고정 층 떨림, safe-area가 있는 실기에서의 바·배지 위치.
- 웹폰트는 이 환경에서 Google Fonts가 실제로 내려왔는지 보장할 수 없어, 줄바꿈 판단은 캡처 기준이다.
- 스크린리더 실제 낭독(역할과 이름, `aria-live`는 코드로만 확인).
