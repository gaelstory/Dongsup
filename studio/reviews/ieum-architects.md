# 검수: ieum-architects (이음 건축사사무소)

## Verdict: **Fix** (Ship 직전. 🔴 1건과 🟠 6건만 고치면 고객에게 보여도 된다)

- **좋은 점:** 첫 화면이 한눈에 건축사사무소다. 청사진 위 "짓다 만 집" + 점선으로 비치는 완성형, 도면 표제란(A-00~A-06), 축척 막대, 구역 번호까지 도면 문법이 일관되고, 6장 스크롤이 데스크톱/폰 모두 끊김 없이 읽힌다. `?shot=1` 썸네일은 16종 중 상위권일 것.
- **발목 잡는 점:** 히어로 글자가 폰트 로딩을 기다리느라 1.2초 규칙을 넘긴다. 폰에서는 마지막 장 구도, 평수 슬라이더(평면이 화면 밖), "마우스를 올리면" 문구가 데스크톱 기준으로 남아 있다.
- **인상:** 서사 구간은 탁월, 서사 이후 섹션(과정, 설계비, 행 펼침)은 정확하지만 한 단계 평범하다. 주황 해가 2~6장 내내 떠 있으면서 CTA와 주목도를 다툰다.

report.json: console 0 / pageerror 0 / failed 0 / overflow 없음(1440, 1024, 768, 390, 320 확인).

---

## 🔴 Blocking

**1. 히어로 헤드라인/CTA가 로드 후 1.2초 안에 보이지 않는다** — `main.js:319-329`
`intro` 타임라인이 `paused`로 만들어지는 순간 `.from()`이 h1(마스크 밖 yPercent 108), 리드, CTA(opacity 0)를 숨기고, `document.fonts.ready` 또는 800ms 뒤에야 재생한다. 실측(1440, 150ms 간격 샘플): h1은 ~1.4초부터 올라오기 시작, 리드/CTA는 **~2.0~2.15초**에 완전히 보임. 폰트 캐시가 없는 첫 방문(고객이 처음 여는 상황)이 정확히 이 경로다. BUILD-CONTRACT "Above-the-fold … within about 1.2s", PLAN 4.3-4 위반.
Fix: 폰트 대기 제거하고 즉시 재생. CTA와 리드는 첫 페인트부터 보이게 두고(트윈 삭제 또는 `opacity`만 0.25s, delay 0), h1 마스크는 `duration 0.5, stagger 0.06, delay 0`, 주황 자 `duration 0.5 @0.1`. 총 길이 ≤ 0.7s. 폰트 스왑이 거슬리면 `setTimeout(go, 800)`을 `150`으로, fonts.ready 분기는 유지.

## 🟠 Important

**2. 폰에서 평수 슬라이더를 움직여도 평면이 화면 밖** — `style.css:482` `.estimate__grid`, 내 캡처 `p-est.jpg`
390px에서 슬라이더 아래로 결과 3종 + 주석 + CTA(약 520px)가 먼저 나오고 그 뒤에 평면 SVG가 온다. 이 섹션의 핵심 피드백("방 크기가 따라 변한다")을 드래그 중에 볼 수 없다.
Fix(<900px): `.estimate__copy{display:contents}` 후 순서 지정: 제목/리드(1) → `.range`(2) → `.estimate__plan`(3, `max-width:340px; margin:20px auto 0`) → `.estimate__result`(4) → 주석 → CTA. 슬라이더 thumb에서 평면 상단까지 120px 이내가 되게.

**3. 터치 화면에 "행에 마우스를 올리면 평면도가 그려지고"** — `index.html:160`
폰/태블릿에는 마우스도 떠 있는 틀도 없다(`.plan-float` display:none). 데스크톱 전용 안내가 그대로 노출.
Fix: 기본 문구를 `단독주택 다섯 채와 작은 가게 두 곳입니다. 이름을 누르면 평면도와 설명이 펼쳐집니다.`로 하고, 호버 안내는 `<span class="only-fine">행에 마우스를 올리면 평면도가 먼저 그려집니다.</span>`를 `@media (hover:hover) and (pointer:fine) and (min-width:900px)`에서만 표시.

**4. 폰 마지막 장(A-06) 구도가 무너진다** — `scene.js:73-77`(zoom/az/el/camX), shoot `phone-04/05.jpg`, 내 캡처 `s-p-09.jpg`
45° 돌아간 뒤 집이 스테이지 오른쪽 위에 작게 몰리고, 대지 점선이 왼쪽에서 잘리며, 하단 1/3이 비어 "완성" 장면이 가장 약하다. 4장(A-04)에서는 왼쪽 나무가 화면 가장자리에 잘린다(`phone-03.jpg`, `s-p-05.jpg`).
Fix: `mqSmall`일 때 6장 종점값을 따로 둔다: `camX -1.1 → -0.2`, `zoom 0.88 → 1.02`, `az -45 → -32`, `camY 3.0 → 2.4`. 나무 A는 x를 집 쪽으로 0.8 당기거나 작은 화면의 `REQ_W`를 +1.6 키워 양쪽 12px 여백 확보.

**5. 주황 해가 2~6장 내내 떠서 CTA와 싸우고 지붕 끝에 붙는다** — `scene.js:270-274`(sun 0.42 구 + 궤도 링), `desktop-04.jpg`, `?shot=1` 캡처 `d-shot1.jpg`
1장의 주인공이어야 할 해가 이후에도 불투명 주황 원(지름 약 50px, 링 때문에 "원자 아이콘"처럼 보임)으로 남아, 화면의 주황이 CTA 2개 + 해로 3곳이 된다. 4장과 썸네일에서는 처마 끝과 겹쳐 지붕 실루엣을 가린다.
Fix: t ≥ 2.0에서 `sunMat.opacity 1 → 0`(0.4 구간), 링만 alpha 0.45로 남기고 스케일 0.65. 4장/shot 상태의 해 위치를 호를 따라 12° 뒤로 옮겨 지붕과 40px 이상 띄운다. 6장에서 창이 켜질 때는 해 링도 0으로.

**6. 스크롤 길이가 브리프 상한 초과** — `style.css:212-216`
서사 구간 실측: 데스크톱 5,490px = **610svh**(브리프 500, 상한 600), 폰 3,984px = **472svh**(브리프 380, 상한 400). 폰에서 6장을 다 넘기려면 화면 4.7장을 밀어야 해서 5장 이후가 늘어진다.
Fix: `.chapter{min-height:46svh}`(폰: 100 + 6×46 = 376svh), `@media(min-width:900px){.chapter{min-height:68svh}}`(100 + 6×68 = 508svh). 바꾼 뒤 `main.js:337-338`의 진행 구간이 다음 장과 겹치지 않는지 `window.IEUM.p`로 재확인.

**7. 왼쪽 기준선이 서사 구간과 나머지 섹션에서 64px 어긋난다** — `style.css:72` `.wrap{max-width:1312px}` vs `:104` `.site-header__in`, `:191` `.hero__in`
1440에서 로고, h1, 장 제목은 x=58, `지은 집들` 이하 모든 섹션과 푸터는 x=122. 스크롤로 넘어가는 순간 제목 열이 옆으로 튄다(`desktop-07.jpg`).
Fix: `.wrap{max-width:none}`로 헤더와 같은 거터(`--pl/--pr`)를 쓰고, 본문 폭은 내부 요소 `max-width`(이미 `.sec-head 46rem` 등)로 제한. 표는 `max-width:1320px`.

## 🟡 Polish

**8. Orbit 쉼표가 아래로 떨어져 보인다** — `style.css:52-53, 521, 586`; `desktop-10.jpg`의 `방 3개, 욕실 2개`, `d-form-ok-page.jpg`의 `김이음님, 단독주택…`, `desktop-11.jpg` h2 `있다면,`
Orbit의 쉼표 글리프 + `word-spacing:-0.22em` 조합으로 쉼표가 아래첨자처럼 뜬다. Fix: 문장형 텍스트(`.estimate__result dd`, `.form__result b`)는 `font-family:var(--f-body); font-weight:400; word-spacing:normal`. Orbit은 제목과 치수 숫자에만. h2 `땅이 있다면,`은 쉼표 뒤 줄바꿈을 `<br>`로 고정하고 그 줄만 `word-spacing:-0.1em`.

**9. 포인터를 모서리로 가져가면 점선 지붕이 헤더 밑으로 잘린다** — `scene.js:476`, 내 캡처 `d-ptr-b.jpg`
±18°/±6°는 브리프 값이니 유지하고 여백으로 해결: `REQ_H`를 8% 키우거나 히어로 구간(t<1) zoom에 0.94를 곱한다.

**10. 설계비 평면이 "방 나누기 다이어그램"처럼 읽힌다** — `main.js:139-165`, `d-slider-20/26.jpg`
문, 창, 현관이 없고, 20~26평에서는 욕실 칸이 라벨 없이 색만 칠해져 있다. Fix: 라벨 표시 조건 `room.w > 40` → `> 30`(욕실은 12px로), 거실 아래 벽에 현관 문 호(마커색 1px, 반지름 0.9m×k)와 `입구` 라벨, 남쪽 벽에 창 표시 2~3개(트레이싱색 이중선). 프로젝트 평면 SVG와 같은 문법이 된다.

**11. 폰에서 펼친 평면의 글자가 본문보다 크고 설비와 겹친다** — `style.css:377, 405`, 내 캡처 `p-row-open.jpg`
`연희동 세 식구 집`은 viewBox 폭 140에 12 단위 글자라 화면에서 약 26px. `욕실`이 변기 원, 문 호와 겹친다. Fix: `@media(max-width:767px){.pdetail__plan{max-width:240px}}` + 좁은 평면(viewBox 폭 < 160)의 `.pl-t`를 8 단위로, `욕실` 라벨 y를 설비 위쪽으로 10 단위 이동.

**12. 폰에서 설계비 평면 글자 13px 미만** — `style.css:531, 533`
390px에서 방 이름 12.3px, 치수 11.4px(브리프: 라벨 13px 이상). Fix: `@media(max-width:480px){.eplan__label{font-size:16px}.eplan__dimtext{font-size:15px}}`.

**13. 전화/이메일 링크 터치 높이 28px** — `style.css:544`
Fix: `.contact__info a{display:inline-flex;align-items:center;min-height:44px}` + `li{padding:1px 0;align-items:center}`.

**14. 768~899px에서 설계 과정이 왼쪽 절반만 쓰고 오른쪽이 빈다** — `style.css:451`, 내 캡처 `vp-768-steps.jpg`; 같은 폭 히어로도 오른쪽이 비어 있음
Fix: 가로 5열 전환점을 `900px → 720px`로 내리거나, 그 구간만 `.steps{grid-template-columns:1fr 1fr; column-gap:32px}`.

**15. 데스크톱 행 펼침이 허전하다** — `style.css:385-387`, `d-row-open.jpg`
300px 평면 옆에 두 줄 설명뿐이고 오른쪽 600px가 빈다(메타는 ≥768에서 숨김). Fix: 설명 아래에 Orbit 14px 사양 3줄(`대지 412㎡ / 지상 2층 / 경골목구조` 식의 가상 값)을 `dl`로 추가하고, 본문은 17px로.

**16. 제출 성공 후 마무리** — `main.js:284-289`
결과 상자가 버튼 아래에 생기는데 포커스/스크롤 이동이 없고, 폰에서는 컨셉 배지 높이와 겹치는 위치다. 버튼은 그대로라 연타 가능. Fix: `result.tabIndex=-1; result.focus({preventScroll:true}); result.scrollIntoView({block:'center'})`, 버튼 문구는 유지하되 `aria-disabled`로 2초 잠금. 연락처는 `010-1234-5678` 형태로 포맷해 되읽기.

**17. WebGL 실패 화면의 표제란 불일치** — `index.html` titleblock, 내 캡처 `d-nogl.jpg`
대체 SVG는 완성된 집인데 표제란은 `계획 개요 / A-00`, 진행 눈금 0칸. Fix: `gl-fail`일 때 `완성 조감도 / A-06`, 눈금 6칸 on.

**18. 데스크톱 장 설명 열의 하단 55%가 계속 비어 있다** — `style.css:222`, `desktop-03~06.jpg`
장 텍스트가 26svh에 붙고 아래는 빈 모눈. 의도된 여백으로 보기엔 넓다. Fix: `top:26svh → 34svh`로 내려 스테이지의 집 중심 높이와 맞추고, 각 장 `chapter__note` 아래에 그 장의 결과물 한 줄(`산출물: 대지 분석도 1장, 일조 다이어그램`)을 트레이싱색 14px로 추가.

---

## More wow (영향 큰 순)

1. **6장에서 종이가 밤이 된다.** `삶이 들어옵니다` 진행도에 맞춰 스테이지 배경을 청사진 `#1740B0` → 심청 `#0A1C55`로 보간하고(스테이지 위 `::after` 심청 레이어 opacity 0→0.85), 창 면 주황을 0.5 → 0.8로, 창 아래 바닥에 주황 6% 사다리꼴 빛을 깐다. 이어지는 `지은 집들`이 심청 배경이라 섹션 전환도 자연스럽게 이어진다. 2~3시간.
2. **설계 과정 치수선을 실제 기간 비례로.** 지금은 5칸이 같은 길이인데 라벨은 기간이다. `grid-template-columns: 1.2fr 2fr 2.4fr 4.4fr 2fr`(1.5주/7주/9주/26주/1년은 압축 표기)로 바꾸고 스크롤 scrub(0.4)으로 왼쪽에서 오른쪽으로 그리면 "치수선이 곧 일정표"라는 건축가다운 한 방이 된다. 1~2시간.
3. **제도용 십자 커서 + 좌표 읽기.** fine pointer에서 스테이지 위에 얇은 십자선(분필 30%)을 띄우고 표제란에 `X 4,250 Y 3,100`을 Orbit으로 실시간 표시(대지 평면으로 역투영, 100mm 단위 스냅). 도면을 "만지는" 느낌. 2시간.

---

## 확인한 것 / 방법

- `node studio/tools/shoot.mjs --out studio/.shots/review-ieum-architects work/ieum-architects/index.html` → report.json 정상, 데스크톱 14장, 폰 14장, reduced-motion 1장 전부 열람.
- 코드: `index.html`, `style.css`, `main.js` 전체, `scene.js`는 전환표/카메라/리사이즈/루프 관리 부분.
- 자체 Playwright(SwiftShader, `python3 -m http.server`로 서빙):
  - 히어로 입장 타이밍 150ms 간격 샘플(→ 1번).
  - 서사 스크롤 데스크톱 10지점, 폰 10지점 캡처 + `window.IEUM.p`, 도면번호, active 장 로그(장 전환과 표제란 동기 정상).
  - 포인터 시차(모서리 2곳), 표 행 호버(떠 있는 평면 DrawSVG 250ms/950ms), 행 클릭 펼침/복수 펼침, 폰 탭 펼침.
  - 슬라이더 20/26/38/50/60 값별 캡처, 마우스 드래그(→36), 키보드 ←→/Home/End, `aria-valuetext` 갱신, CTA 프리필(`연면적 20평…`) 정상.
  - 과정 타임라인 300ms/완료 시점(데스크톱 가로, 폰/768 세로).
  - 폼: 빈 제출(오류 2건 + 첫 필드 포커스), 자릿수 오류, 성공 문구(`컨셉 시안이라 실제로 접수되지는 않습니다.` 포함, `role=status`).
  - 폰 메뉴: 열기, Esc 닫기 + 버튼 포커스 복귀, 링크 탭 후 닫힘과 앵커 오프셋(67px).
  - Tab 40회: 순서 논리적, 모든 정지점에 2px 포커스 링(밝은 섹션은 파랑), 건너뛰기 링크 동작.
  - `?shot=1`(4장 끝 상태, 배지 숨김), WebGL 차단(`gl-fail` + SVG 대체), JS 끔(전 내용 + 대체 그림 표시), 1024/768/320 뷰포트 넘침 없음.
- 문구: 엠대시/화살표 0건, 헤드라인, CTA, 푸터 고지, noindex, 가상 연락처 브리프와 일치. 폰트 2패밀리 4굵기.

## 확인하지 못한 것

- 실제 GPU에서의 프레임률과 드로콜 수(헤드리스 SwiftShader라 무의미), 중급 안드로이드 발열.
- iOS Safari 실기기의 `svh` sticky 동작, 주소창 접힘 시 스테이지 높이 변화, 실제 터치 드래그로 슬라이더 조작.
- 스크린리더 낭독(구조와 속성만 확인), 200% 확대.
- 16번의 "결과 상자가 화면 밖" 여부는 직접 스크롤해 확인했기 때문에 자동 노출 여부는 미검증. 고칠 때 390px에서 제출 직후 화면을 확인할 것.
