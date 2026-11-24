# 첫화면 스튜디오 홈페이지와 포트폴리오 16종

홈페이지 제작 스튜디오 **첫화면 스튜디오**의 홈페이지(`index.html`)와, 그 홈페이지의 포트폴리오에 들어가는
가상 고객사 목업 16개(`work/<이름>/`)입니다. 빌드 과정 없이 그대로 올리면 되는 정적 사이트입니다.

## 들어 있는 것

| 경로 | 내용 |
|---|---|
| `index.html`, `assets/css/studio.css`, `assets/js/studio.js` | 스튜디오 홈페이지 (포트폴리오, 진행 절차, 가격, FAQ, 제작 의뢰 폼) |
| `assets/js/config.js` | **사장님이 채울 값** (연락처, 사업자 정보, 폼 접수 주소) |
| `work/<이름>/index.html` | 포트폴리오 목업 16개 (아래 표) |
| `assets/thumbs/` | 목업 첫 화면 썸네일 (1440×900, 720px 버전) |
| `assets/vendor/` | GSAP 3.15, Lenis 1.3.27, Three.js r186 (외부 CDN 없이 동작하도록 사이트 안에 둠) |
| `assets/shared/concept-badge.js` | 목업마다 붙는 "컨셉 시안 · 첫화면 스튜디오" 배지 |
| `PLAN.md` | 기획서 (브랜드, 문구, 가격, 목업별 브리프) |
| `BUILD-CONTRACT.md` | 제작 기술 규칙 |
| `reviews/` | 페이지별 검수 기록 |
| `tools/shoot.mjs` | 스크린샷·오류 점검과 썸네일 생성 도구 |

### 포트폴리오 16종

| 주소 | 가상 고객사 | 업종 | 대표 효과 |
|---|---|---|---|
| `work/haeon-systems/` | 해온 시스템즈 | AI 스마트 항만 (대표작) | Three.js 야간 항만, 빛 궤도와 비콘 |
| `work/ieum-architects/` | 이음 건축사사무소 | 건축 | 스크롤하면 설계도 위에 집이 지어짐 |
| `work/ongi-bakery/` | 온기 베이커리 | 베이커리 | 잡아서 던지는 빵 더미 |
| `work/teum-perfume/` | 틈 TEUM | 향수 브랜드 | 빛을 굴절시키는 유리병 |
| `work/gyeol-clinic/` | 결 피부과의원 | 피부과 | 피부결을 보여주는 렌즈 |
| `work/padosori-fest/` | 파도소리 2027 | 음악 페스티벌 | 소리에 반응하는 파도 능선 |
| `work/dalmuri/` | 달무리 | 한식 다이닝 바 | 먹물 달무리 셰이더 |
| `work/ddak-saas/` | 딱정산 | 정산 SaaS | 거래 칩이 장부로 날아드는 데모 |
| `work/salon-miru/` | 살롱 미루 | 헤어살롱 | 빗질하는 머리카락 |
| `work/sawol-flower/` | 꽃집 사월 | 꽃집 | 누르면 자라는 꽃밭 |
| `work/sem-tax/` | 셈 세무회계 | 세무회계 | 숫자가 굴러가 확인 도장 |
| `work/supmeong-stay/` | 숲멍 스테이 | 숲속 스테이 | 스크롤로 흐르는 하루 |
| `work/kkoribyeol/` | 꼬리별 강아지 유치원 | 반려견 | 공을 물어오는 강아지들 |
| `work/film36/` | 서른여섯 사진관 | 사진관 | 현상되는 사진과 필름 릴 |
| `work/heavy-club/` | 헤비클럽 | PT·크로스핏 | 스크롤 속도로 늘어나는 글자 |
| `work/mitjul-academy/` | 밑줄 국어논술학원 | 학원 | 빨간 펜 첨삭 |

목업은 모두 가상 업체이고, 페이지마다 컨셉 시안 배지와 `noindex`가 붙어 있습니다. 목업 안의 가격·후기·인물은
연출용 가상 내용입니다.

## 내 컴퓨터에서 열어 보기

`file://`로 열면 3D 장면(ES 모듈)이 동작하지 않으니 간단한 서버로 엽니다.

```bash
cd studio
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 공개하기 전에 꼭 할 일

### 1. `assets/js/config.js` 채우기 (★ 표시)
- `email`, `phone`, `kakaoUrl`(카카오톡 채널 주소, 비우면 카카오톡 버튼과 문구가 숨겨짐)
- `business.owner`, `regNo`, `address`, `mailOrderNo`(통신판매업 신고번호, 있으면)
- `oneMaker`: 사장님이 직접 다 만들면 `true` (대표 이름이 채워져야 "한 사람이 맡습니다" 문구가 나옴)
- JavaScript를 끈 방문자용으로 `index.html` 안에도 같은 값이 기본값으로 적혀 있습니다. 함께 바꿔 주세요.

### 2. 의뢰 폼 접수 연결 (`FORM_ENDPOINT`)
지금은 비어 있어서, 방문자가 의뢰서를 완성하면 **메일 앱/문자로 보내기와 복사** 화면이 나옵니다.
자동 접수를 원하면 `config.js` 주석의 한국어 안내대로 둘 중 하나를 연결하세요.
- **Formspree**: 가입 후 받은 주소를 `FORM_ENDPOINT`에, `FORM_ENDPOINT_FORMAT: 'json'`
- **Google Apps Script**(구글 시트로 받기): 웹 앱 주소를 `FORM_ENDPOINT`에, `FORM_ENDPOINT_FORMAT: 'form'`
- 외부 서비스를 쓰면 `FORM_PROCESSOR`에 서비스 이름을 적어 주세요(개인정보 처리 위탁 고지에 표시됩니다).

### 3. 사장님이 지킬 수 있는지 확인할 약속 문구
페이지에 아래 내용이 적혀 있습니다. 실제로 지킬 수 있는 내용으로 고쳐 주세요.
1. 영업일 기준 24시간 안에 회신 (평일 10:00~19:00 기준)
2. 세금계산서·현금영수증 발행, 부가세 별도 (일반과세자여야 함)
3. 계약서 작성 후 계약금, 작업 시작 전 전액 환불, 첫 시안 이후 비율 환불 (FAQ 9)
4. 제작 기간: 자료를 받은 날부터 영업일 7 / 15 / 25일, 진행 절차의 단계별 기간, 첫 통화 20분
5. 오픈 후 30일 무상 오류 수정, 수정 2 / 3 / 4회
6. "상담부터 제작까지 한 사람이 맡습니다" (`oneMaker`가 true일 때만 표시)
7. "지금 보고 계신 이 페이지도 같은 방식으로 직접 만들었습니다"
8. 상담과 견적 무료, 견적 후 진행하지 않아도 됨
9. 도메인·호스팅을 고객 명의로, 소스 전부 이전, 네이버·구글 등록
10. `#pricing` 안의 모든 가격 (패키지, 옵션, 유지보수, 결제 비율). **가격은 이 섹션에서만 고치면 됩니다.**
11. 문의 정보 1년 보관

### 4. 공유 미리보기
도메인이 생기면 `index.html` `<head>`의 주석 처리된 `og:url`, `og:image`를 풀고, 1200×630 이미지를 넣어 주세요.

## 올리는 방법 (택1)

`studio` 폴더 전체를 올리면 됩니다. 단 `tools/`, `reviews/`, `PLAN.md`, `BUILD-CONTRACT.md`, `README.md`,
`.shots/`는 공개하지 않아도 됩니다.
- **Netlify / Cloudflare Pages**: 새 사이트를 만들고 `studio` 폴더를 끌어다 놓거나, 저장소를 연결해 배포 폴더를 `studio`로 지정
- **GitHub Pages**: 이 저장소의 Pages는 이미 게임(`dist/`)을 올리고 있으니, 스튜디오용 저장소를 따로 만들어 `studio` 안의
  파일을 맨 위에 두는 방법을 권합니다.

## 썸네일 다시 만들기

목업을 고친 뒤에는 썸네일을 다시 만들어 주세요(Node.js와 Playwright 필요).

```bash
node studio/tools/shoot.mjs --thumbs                 # assets/thumbs/<이름>.jpg (1440×900)
cd studio/assets/thumbs && for f in *.jpg; do case $f in *-720.jpg) continue;; esac; \
  ffmpeg -v error -y -i "$f" -vf scale=720:-2 -q:v 4 "${f%.jpg}-720.jpg"; done
```

페이지 점검(오류, 가로 스크롤, 데스크톱·모바일 스크린샷): `node studio/tools/shoot.mjs work/<이름>/index.html`

## 알아 두실 점
- 모든 점검은 헤드리스 크롬(소프트웨어 WebGL)에서 했습니다. 실제 아이폰 사파리와 실제 기기의 프레임 속도는 확인하지
  못했습니다. 공개 전에 휴대폰으로 한 번씩 열어 보세요.
- `결 피부과의원` 목업의 제목 "피부는 결대로 좋아집니다"는 실제 의료광고 심의에서는 통과하지 못할 수 있습니다(목업이라 유지).
- 라이브러리 라이선스: GSAP(무료 표준 라이선스), Lenis(MIT), Three.js(MIT). 글꼴은 모두 Google Fonts.
