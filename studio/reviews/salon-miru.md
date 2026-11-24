# 검수: salon-miru (살롱 미루)

검수 책임자 리뷰. 대상 `studio/work/salon-miru/` (index.html, style.css, hair.js, main.js). 기준: PLAN.md M08 + 0/3.0/4장, BUILD-CONTRACT.md.

## Verdict: **Fix** (고치면 출고 가능. Rework 아님)

- 1440×900 첫 화면은 "헤어살롱"이 바로 읽히고, 빗질과 가르마 물리, 염색 전환, 4단계 예약까지 전부 실제로 동작한다. 콘솔 오류 0, 가로 넘침 0.
- 하지만 머릿결이 아직 "윤기 나는 머리채"가 아니라 "가는 선 다발"이다(특히 블랙은 바코드처럼 보인다). 그리고 1440×900을 벗어나면(1366/1280 노트북, 1024, 768, 390) 가닥이 가느다란 h1 위를 그대로 지나가서 간판 문구가 지저분해진다.
- 포커스 링 잘림 2곳, 320px 헤더 깨짐, 본문 15px 등 마감 문제가 남아 있다.

## Findings

### 🔴 Blocking

**B1. 1440×900 이외 화면에서 머릿결이 h1을 덮는다 (브리프: "글은 맑은 진주색 영역에")**
- 어디: `style.css:151-163, 218-225` (.hero-scrim, .hero-title), `hair.js:69-75` (밀도 분포). 스크린샷: 1366×768, 1280×720, 1024×768, 768×1024, 390×844(phone-00), 390에서 블랙 선택 시 최악.
- 무엇: Grandiflora One은 획이 1~2px이라 같은 굵기의 가닥이 겹치면 글자와 구분이 안 된다. 1440×900에서도 "번에"의 "에" 위로 가닥 3~4개가 지나간다. 1024/768에서는 "번에", "결"이 밀집 구간 안에 들어간다. 390에서는 h1 두 줄 전체가 가닥 끝과 겹치고, 블랙이면 글자가 거의 묻힌다. text-shadow 글로우로는 못 막는다.
- 고칠 값:
  1. 캔버스에서 글자 영역을 비운다. `main.js`에서 `.hero-copy`의 rect(캔버스 기준)를 `hair.setKeepOut({x, y, w, h})`로 넘기고, `hair.js draw()`에서 점 좌표가 keep-out 사각형(좌우 +32px, 위 +24px 여유) 안에 들어가면 그 가닥의 길이를 `keepOut.y - 24`에서 끊는다(빌드 시 `len[i] = Math.min(len[i], keepTop - 24 - rnd()*40)` 로 x 범위에 걸리는 가닥만 줄이면 프레임 비용 0).
  2. 데스크톱 밀도 시작점을 뷰포트 폭이 아니라 카피 오른쪽 끝 기준으로: `smooth(0.2, 0.7, u)` → `smooth(copyRight/W + 0.04, copyRight/W + 0.38, u)`, `shortF`도 같은 기준. 768~1199px에서는 `.hero-copy { max-width: 46vw }`, h1 `font-size: clamp(42px, 7vw, 104px)`.
  3. 모바일: `hairH = H * 0.52` → `Math.min(H * 0.52, h1Top - 28)` (h1 위에서 끝나게). `.hero-inner { padding-top: 50svh }` 유지.
  4. 스크림을 글자 뒤에서 불투명하게: 데스크톱 `radial-gradient(58% 92% at 0% 100%, rgba(251,246,244,1) 0%, rgba(251,246,244,.96) 55%, rgba(251,246,244,0) 80%)`.

### 🟠 Important

**I1. 머릿결이 "윤기 나는 머리"가 아니라 선 다발로 읽힌다. 블랙은 바코드/스크래치처럼 보인다**
- 어디: `hair.js:126-166` (LW, ALPHA, draw). 스크린샷: `qa/s1.jpg`(4색 비교), phone 블랙.
- 무엇: 900개 1px 선 사이로 진주색 배경이 그대로 비쳐 볼륨이 없다. 층이 3개뿐이고 모두 같은 굵기/같은 위상이라 덩어리(뭉침)가 없다. 하이라이트 띠가 가닥 좌표 s=0.31 고정이라 "빛이 머리를 가로지르는 띠"로 안 보인다. 블랙(#0F0D0E)은 배경과 대비가 너무 커서 선 하나하나가 튄다.
- 고칠 값:
  1. 가닥 아래에 **머리채 바탕면**을 먼저 칠한다: 밀집 구간의 외곽선(가닥 30개 간격으로 샘플한 끝점들을 이은 path)을 `ctx.fill()` with 세로 그라디언트(root→tip 색, alpha 0.55→0.18), `ctx.filter` 없이 가장자리는 가닥이 덮는다. 블랙/초코에서 배경 비침이 사라진다.
  2. 뒤층 굵기 올리기: `LW = [2.2, 1, 1.5]`, `ALPHA = [0.28, 0.8, 0.92]` (뒤층은 굵고 흐리게 = 깊이).
  3. 뭉침: 가닥을 12~16개씩 묶어 묶음마다 `ph1`, `sweep`에 공통 오프셋(±0.25rad, ±10px)을 주고 끝으로 갈수록 묶음 중심으로 15% 수렴시킨다(`x += (clumpX - x) * 0.15 * s*s`).
  4. 윤기 띠: 하이라이트 위치를 `s` 고정이 아니라 화면 y 기준(예: `y = hairH*0.30 + 14*sin(x*0.004)`)의 가로 띠로, 폭 0.075→0.11, 하이라이트 가닥 비율 6%→10%. 블랙은 sheen 색을 `#8C8791`(차가운 회색) 쪽으로, alpha 0.92→0.8.
  5. 끝단: 모든 가닥이 같은 높이(±10%)에서 일자로 끊긴다. `len`에 `0.84 + rnd()*0.2` → `0.78 + rnd()*rnd()*0.3`, 끝 15% 구간은 `globalAlpha`가 0으로 떨어지는 그라디언트 stop 추가(끝이 가늘어 보이게).

**I2. 가격 탭 포커스 링이 잘린다**
- 어디: `style.css:315` `.tabs { overflow-x: auto }`. 스크린샷 `qa/s2.jpg` 5번(커트 탭 오른쪽에 세로선만 보임).
- 무엇: 탭에 키보드 포커스가 가면 outline의 위/왼쪽/아래가 overflow에 잘려 세로선 하나만 남는다. 4.5 "포커스가 항상 보인다" 위반.
- 고칠 값: `.tab:focus-visible { outline-offset: -4px; border-radius: 6px; }` 또는 `.tabs { padding: 4px 4px 0; margin: -4px -4px 0; }`.

**I3. 디자이너 릴 포커스 링이 카드 내용을 가로지른다**
- 어디: `style.css:270-272` (.reel outline, `.reel-js .reel { overflow: visible }`). 스크린샷 `qa/s2.jpg` 3번(릴 끝까지 넘긴 상태에서 "강하진" 이름 위로 세로선).
- 무엇: 링은 #reel 상자에 그려지는데 트랙은 transform으로 상자 밖(왼쪽 거터)까지 나가므로, 넘긴 뒤에는 링의 왼쪽 변이 카드 글자를 자른다.
- 고칠 값: `.reel:focus-visible { outline: none; }` + `.reel:focus-visible + .reel-progress { box-shadow: 0 0 0 2px var(--wine); height: 3px; }` 식으로 진행 막대를 포커스 표시로 쓰거나, 링을 `.reel-wrap`의 `::after`(inset: -8px -100vw -8px -8px 금지, `inset: -8px; border: 2px solid var(--wine); border-radius: 12px; pointer-events:none`)에 그리고 `.reel-wrap { overflow: clip; overflow-clip-margin: 12px }`로 카드도 그 안에서 잘리게 한다.

**I4. 320px에서 헤더가 깨진다**
- 어디: `.site-header` / `.brand` / `.menu-btn`. 스크린샷 `qa/salon-w320.png`.
- 무엇: "살롱 미루"가 두 줄, "Salon MIRU"가 두 줄, 메뉴 버튼의 "메뉴"가 세로로 한 글자씩 꺾인다. 4.6 "320px에서도 깨지지 않게" 위반.
- 고칠 값: `.brand, .menu-btn { white-space: nowrap; flex: none; }`, `@media (max-width: 359px) { .brand-en { display: none; } .menu-btn-label { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); } .menu-btn { width: 44px; padding: 0; justify-content: center; } }`.

**I5. 모바일에서 빗질 안내 알약이 시그니처(머릿결) 한가운데 위쪽을 가린다**
- 어디: `style.css:184-191` (.comb-hint: `top: calc(var(--header-h) + 16px)`). 스크린샷 phone-00, `qa/s4.jpg`.
- 무엇: 390px 첫 화면에서 가장 먼저 보이는 것이 머릿결이 아니라 그 위에 얹힌 반투명 알약(295×50)이다. 뿌리 쪽 가장 진한 부분을 덮는다.
- 고칠 값: 모바일에서는 알약을 없애고 스와치 줄 아래 한 줄 글로 내린다: `@media (max-width: 767px) { .comb-hint { position: static; margin-top: 14px; padding: 0; background: none; border: 0; backdrop-filter: none; } }` (멈춤 버튼은 스와치 줄 오른쪽 끝으로). 첫 터치 이동이 감지되면 문구를 `opacity: 0`(200ms).

**I6. 작은 높이/모바일에서 스와치가 컨셉 배지에 가려지거나 접힌다**
- 어디: `.hero-inner` 하단 패딩(`style.css:155, 221`). 스크린샷 `qa/v-salon-miru-1280x720.png`(배지가 스와치 줄 왼쪽 2개를 덮음), `390x667`(스와치가 화면 밖 + 배지 밑).
- 무엇: BUILD-CONTRACT "왼쪽 아래 60px 모서리를 비워 둘 것". 1280×720에서 `clamp(72px, 9vh, 112px)`가 72px라 스와치 하단(y=689)과 배지 상단(y≈668)이 겹친다. 390×844에서도 스와치 하단과 배지 간격이 8px뿐.
- 고칠 값: `.hero-inner { padding-bottom: max(96px, calc(72px + env(safe-area-inset-bottom))) }` (모든 폭), 데스크톱 `clamp(96px, 11vh, 120px)`. `@media (max-height: 760px) and (min-width: 768px) { .hero-title { font-size: clamp(56px, 10.5vh, 88px); } .hero-inner { padding-top: calc(var(--header-h) + 64px); } }`. 모바일은 `padding-top: 50svh` → `min(50svh, 380px)`로 667px 높이에서도 스와치가 첫 화면에 들어오게.

**I7. 본문이 15px/300 굵기로 너무 가늘고 작다**
- 어디: `.menu-desc`, `figcaption`, `.summary dt`, `.swatches-legend`, `.nav a` (15px), `.field-error`, `.menu-dur`, `.comb-hint` (14px), `.chip small` (12px), `.brand-en` (13px). 측정값은 Playwright computed style.
- 무엇: PLAN 4.6 "본문 16px 이상". Sunflower 300은 획이 가늘어 15px 회색(#5B4D51)이면 대비 수치(6:1)는 통과해도 실제로는 흐릿하다. 요일 12px는 읽기 어렵다.
- 고칠 값: 본문/설명 16px, weight 300 → 본문 설명류는 그대로 300이되 16px 이상, 14~15px 라벨류는 15→16px/500. `.chip small { font-size: 13px; }`, `.brand-en { font-size: 14px; }`.

**I8. h1과 보조 문구 간격이 붙어 있다**
- 어디: `style.css:165` `.hero-sub { margin-top: 18px }`. 스크린샷 desktop-load.
- 무엇: 104px 제목 바로 밑 18px에 19px 본문이 붙어 "달라지는 결"의 받침과 한 덩어리로 보인다. 제목이 숨 쉴 자리가 없다.
- 고칠 값: 데스크톱 `.hero-sub { margin-top: 32px }`, 모바일 22px. CTA 위 간격은 현행(약 36px) 유지, 스와치 라벨 위 40px.

### 🟡 Polish

**P1. 지도 라벨이 핀과 붙는다** `index.html:458-459`. "살롱 미루" 글자가 핀 후광(r=34, cx=300) 가장자리 x=334 바로 옆 x=330에서 시작해 겹친다. `x="330"` → `x="346"` (두 줄 모두), 또는 `.map-pin-halo` r 34→26.

**P2. 예약 1단계 디자이너 카드의 아치 썸네일이 잘린 조각으로 보인다** `style.css:392` 부근 `.pick-designer`. 64×70px 아치 안에 240×300 선화가 확대돼 얼굴 윤곽+머리 일부만 보인다(단발인지 웨이브인지 구분 불가). 썸네일을 88×110px로 키우고 `viewBox`를 `40 60 160 200`으로 크롭해 머리 실루엣 전체가 들어오게. 카드가 234×152로 커서 여백은 충분하다.

**P3. 가격 섹션 왼쪽 열 아래가 비어 보인다** `desktop-04.jpg`. 제목+설명+토글 아래로 300px이 빈다. 왼쪽 열을 `position: sticky; top: calc(var(--header-h) + 32px)`로 하거나, 탭별 한 줄 메모(예: 컬러 탭이면 "탈색 이력이 있으면 상담 때 꼭 알려 주세요.")를 왼쪽 열 하단에 넣는다.

**P4. 릴이 데스크톱에서 341px만 움직인다** `main.js:461-472`. 1440px에서 카드 4.3장이 이미 보여 "가로 드래그 릴"의 손맛이 한 번 스냅이면 끝난다. 카드 폭을 `clamp(260px, 24vw, 340px)`로 키워 3.2장만 보이게 하면 드래그 거리 약 700px, 선화도 커진다.

**P5. 멈춤 버튼 상태 표현** `main.js:381-386`. 누르면 `aria-pressed=true`가 되지만 `aria-label`은 계속 "머릿결 움직임 멈추기"이고 아이콘도 ‖ 그대로다. 눌린 상태에서 아이콘을 ▶ 모양으로 바꾸고 라벨을 "머릿결 움직임 다시 재생"으로(이 경우 aria-pressed는 빼고 라벨만 토글). 크기 40×40 → 44×44.

**P6. 빗질 후 가닥이 꺾인 채 남는 순간** `hair.js:186-189, 203`. 가로로 빠르게 쓸면 가닥 끝이 갈고리처럼 꺾여 카피 쪽으로 튀어나온다(`qa/salon-d-comb-h.png` x 700~760, y 600~670). 점별 속도 상한 `vx = clamp(vx, -48, 48)` → ±28, 전파 계수 0.045 → 0.07로 올려 위아래 점이 더 같이 움직이게, offX 상한 150 → 90.

**P7. 전화 링크 터치 높이 17px** (오시는 길, 푸터). `a[href^="tel"] { display: inline-block; padding: 12px 0; }`.

**P8. 단계 표시의 완료 색** 완료 단계 막대가 올리브 골드, 현재 단계가 와인인데 둘 다 1px~2px 선이라 "완료"가 약하다. 완료 단계 숫자 앞에 체크(✓ SVG 12px)를 넣거나 막대 두께 2px → 3px.

**P9. 예약 2단계는 16개 메뉴 중 6개만 고를 수 있다** `index.html:337-347`. "다른 시술은 4단계 요청 사항에 적어 주세요"는 실제 살롱 폼이라면 어색하다. 가격표와 같은 4탭 구조의 칩(커트/펌/컬러/클리닉 → 해당 메뉴)으로 16개 전부 노출하거나, 최소 탭당 대표 2개 + "기타(상담 후 결정)" 칩.

**P10. JS 없는 상태의 대체 머릿결이 성기다** `index.html:83-88`. SVG 대체 화면의 가닥 수가 적어 캔버스가 뜨는 순간(0.1~0.3초) 밀도가 확 바뀐다. 대체 SVG에 바탕 그라디언트 면(I1의 머리채 바탕과 같은 모양)을 넣어 전환 차이를 줄인다.

## More wow (효과 큰 순)

1. **머리채 바탕면 + 뭉침 + 가로 윤기 띠** (I1의 1, 3, 4). 지금 화면에서 "고급" 인상을 가장 크게 올리는 단일 작업. 빗이 지나갈 때 윤기 띠가 가르마를 따라 휘면 그 자체가 시그니처가 된다.
2. **염색이 빗을 따라 번진다**: 스와치를 고른 뒤 0.8초 전체 보간 대신, 뿌리→끝 염색 전선(이미 `front`로 구현됨)에 x 방향 지연(`front - 0.25 * xn`)을 줘서 오른쪽에서 왼쪽으로 물들어 오게. 코드 3줄.
3. **디자이너 카드와 히어로 연결**: 릴에서 디자이너 카드에 포커스/호버하면 그 디자이너의 대표 컬러로 선화 머리색이 0.3초 바뀌고, "이 디자이너로 예약" 링크가 예약 1단계를 미리 선택해 스크롤. 예약 전환 동선이 한 번에 이어진다.

## 확인한 것과 방법

- `node studio/tools/shoot.mjs --out studio/.shots/review-salon-miru ...`: 콘솔/페이지 오류 0, 실패 요청 0, 가로 넘침 0(1440, 390). 로드/스크롤 데스크톱 9장, 폰 11장, reduced-motion 1장 전부 확인.
- 자체 Playwright 스크립트(스크래치패드 `qa/salon.js`, `salon2.js`, `k2.js`; python http.server): 마우스 가로/세로 빗질과 복귀(1.9초 뒤 원상), 스와치 4종(라벨 갱신, 44×44), 멈춤 버튼(캔버스 픽셀 비교로 정지 확인), 스크롤 걷힘, 릴 드래그 스냅/화살표 키/끝에서 버튼 비활성, 탭 클릭과 화살표 순환, 행 호버 소요 시간, 소요 시간 토글, 예약 4단계(단계별 오류 문구, 날짜에 따른 마감 시간, 요약, 이름/전화 검증, 완료 문구에 "컨셉 시안이라 실제로 접수되지는 않습니다", 처음부터 다시), 모바일 메뉴(열림 시 첫 링크 포커스, Esc, 링크 탭 후 닫힘), 터치 가로 쓸기(스크롤 0 유지)와 세로 쓸기(정상 스크롤), 폰 릴 터치 드래그 스냅, Tab 25스톱 전부 outline 2px 확인, `?shot=1`(로즈 골드, 안내 알약/배지 숨김), JS 끔, 320/768/1024/1280×720/1366×768/1440×800/1920 첫 화면.
- 코드 통독: hair.js 전체, main.js 전체, style.css 히어로/릴/탭/예약 부분. rAF 1개, IO/visibilitychange 정지, dpr 상한(모바일 1.5), 프레임당 할당은 그라디언트 3개뿐(허용 범위).

## 확인하지 못한 것

- 실제 기기 fps(헤드리스 SwiftShader라 체감 성능 판단 불가). 900가닥×14점 + 프레임당 그라디언트 3개는 중급 폰에서 30fps 경계일 수 있으니 실기 확인 필요.
- iOS Safari의 `touch-action: pan-y` + 포인터 이벤트 조합(가로 쓸기 중 pointercancel 발생 여부), 사파리의 `overflow: clip` 동작.
- 스크린리더 실제 낭독(aria 속성만 확인).
- 200% 확대.
