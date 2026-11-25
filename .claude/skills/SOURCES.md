# 저장해 둔 UI 스킬

AI로 만든 화면이 서로 비슷해 보이지 않게, 홈페이지를 만들 때 쓰려고 모아 둔 스킬입니다.
이 저장소에서 Claude Code를 열면 자동으로 불러옵니다. 다른 프로젝트에서 쓰려면 원하는 폴더를
그 프로젝트의 `.claude/skills/`나 개인 스킬 폴더(`~/.claude/skills/`)에 복사하면 됩니다.

| 스킬 | 언제 쓰나 | 가져온 곳 | 커밋 | 라이선스 |
|---|---|---|---|---|
| `frontend-design` | 전체 UI 방향과 완성도. 흔한 "AI 티" 나는 기본값 피하기 | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `e4bb5d9` | Apache-2.0 (`LICENSE.txt`) |
| `apple-design` | Apple식 모션: 스프링, 제스처, 끊김 없는 전환, 반투명 재질, 타이포 | [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/main/skills/apple-design) | `64eb3de` | MIT © Emil Kowalski |
| `beautiful-shadows` | 카드·패널·모달의 층진 그림자 (Tailwind 클래스) | [MengTo/Skills](https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/beautiful-shadows) | `05043c3` | MIT © Meng To |
| `accessibility` | 접근성 점검과 수정 (WCAG 2.2) | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/tree/main/skills/accessibility) | `afa8da9` | MIT © Addy Osmani |
| `design-review` | 출시 전 디자인 점검: 심각도 순으로 문제와 고칠 값 | [Superfuture/design-review](https://github.com/Superfuture/design-review) | `d4d2609` | MIT © Joey Primiani |
| `emil-design-eng` | 디테일·모션: 애니메이션 여부·속도·이징 판단, 눌림/호버, 팝오버 기준점 | [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng) | `64eb3de` | MIT © Emil Kowalski |
| `shadcn` | shadcn/ui로 UI 구현 (컴포넌트 추가·조합·스타일·프리셋) | [shadcn-ui/ui](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn) | `055aa6b` | MIT © shadcn |
| `adapt` | 반응형: 화면 크기·입력 방식별로 다시 설계 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (`reference/adapt.md`) | `b49177d` | Apache-2.0 (`LICENSE`) |
| `better-interface` | UI 종합 개선: 아래 7개 분야를 돌며 한 장짜리 순위 보고서 | [jakubkrehel/skills](https://github.com/jakubkrehel/skills/tree/main/skills/better-interface) | `672ae44` | MIT © Jakub Krehel |
| `better-accessibility` · `better-layout` · `better-writing` · `better-typography` · `better-colors` · `better-ui` · `better-motion` | `better-interface`가 불러 쓰는 분야별 스킬 (각각 단독으로도 사용 가능) | [jakubkrehel/skills](https://github.com/jakubkrehel/skills/tree/main/skills) | `672ae44` | MIT © Jakub Krehel |
| `interaction-design` | 인터랙션: 마이크로 인터랙션, 로딩 상태, 전환, 제스처 | [wshobson/agents](https://github.com/wshobson/agents/tree/main/plugins/ui-design/skills/interaction-design) | `c96b5f6` | MIT © Seth Hobson |
| `gemini-frontend-design` | 첫 화면·글꼴 2종·본문 3단계·뻔한 색과 장식 요소 금지 등 웹 디자인 규칙과 출시 전 체크리스트 | [google-gemini/demolab](https://github.com/google-gemini/demolab/tree/main/skills/gemini-frontend-design) | `cd0c1f8` | Apache-2.0 (`LICENSE`) |
| `magic-ui` | Magic UI 애니메이션 컴포넌트 고르기·설치(`@magicui/*`)·섹션 레시피 | [magicuidesign/magicui](https://github.com/magicuidesign/magicui/tree/main/skills/magic-ui) | `d13c610` | MIT © Magic UI |

| `gsap-core` · `gsap-timeline` · `gsap-scrolltrigger` · `gsap-plugins` · `gsap-performance` · `gsap-utils` | GSAP 애니메이션 공식 가이드 (기본 API, 타임라인, 스크롤 연동, 플러그인, 성능, 유틸) | [greensock/gsap-skills](https://github.com/greensock/gsap-skills/tree/main/skills) | `aed9cfd` | MIT © GreenSock |

| `refactoring-ui` | 디자인 규칙집(151개)과 진단: 화면이 어떤 규칙을 어겼는지 P0/P1/P2로 짚고, 토큰·테일윈드로 연결 | [edisonmbli/refactoring-ui-skill](https://github.com/edisonmbli/refactoring-ui-skill/tree/main/skills/refactoring-ui) | `6a69966` | MIT © Edison Li (`LICENSE`, `ATTRIBUTION.md`) |
| `impeccable` | 디자인 마감 종합 스킬: 비평(critique)·점검(audit)·다듬기(polish)·타이포·레이아웃·모션·반응형 등 명령 모음 | [Sunwoo-choi-1/selling-product-page-skill](https://github.com/Sunwoo-choi-1/selling-product-page-skill/tree/main/impeccable) (원작: [pbakaus/impeccable](https://github.com/pbakaus/impeccable)) | `fe950ff` | Apache-2.0 (`LICENSE`, `NOTICE.md`) |

`impeccable`은 원작자 저장소(`pbakaus/impeccable`, 엔진 0.1.27)의 스킬과 내용이 같습니다(Windows용 `impeccable.cmd`의
줄바꿈만 다름). `NOTICE.md`는 원작 저장소에서 가져왔습니다.

**`impeccable`을 부르기 전에 알아둘 것** (원작자가 설계한 동작이며, 점검해서 확인한 내용):
- 스킬을 부르면 맨 먼저 `scripts/impeccable context`를 실행합니다. 이 스크립트는 GitHub 릴리스
  (`pbakaus/impeccable`)에서 운영체제별 엔진 실행 파일을 `~/.impeccable/`에 내려받아(SHA-256 체크섬 검증) 돌립니다.
  엔진은 내용을 들여다볼 수 없는 바이너리이고, 스킬은 그 출력을 지시로 따릅니다. 이 실행을 거절하면 스킬은
  마크다운 문서만 읽는 방식으로 넘어갑니다.
- 비평(critique)·점검(audit) 결과를 Impeccable 계정에 저장하는 기능이 있고, `init`은 `npx impeccable login`
  가입 안내를 첫 줄에 띄우라고 합니다. 새 화면 생성 흐름에는 사용 기록(telemetry) 전송이 있고, 이미지 생성 API 키가
  있으면 페이지 캡처를 외부 이미지 API로 보냅니다.
- `/impeccable hooks on`(또는 `update`, `doctor --fix`)은 `.claude/settings.local.json` 등에 훅을 써넣어, 이후 UI 파일을
  고칠 때마다 엔진이 자동으로 돌게 합니다. `live`는 프로젝트 HTML에 스크립트를 넣고 로컬 서버를 띄웁니다.
- 이 저장소의 홈페이지·목업 작업에서는 스킬을 부르지 않고 `reference/`의 마크다운(비평 기준, 다듬기 체크리스트 등)만
  참고했습니다. 앞서 만든 `adapt` 스킬은 이 스킬의 `reference/adapt.md`를 꺼낸 것이라, 이제 같은 내용을 `/impeccable adapt`로도
쓸 수 있습니다.

같은 저장소의 `selling-product-page`(상세페이지 제작 스킬)는 라이선스 표기가 없어서 이 공개 저장소에는 넣지 않았습니다.
쓰려면 작성자 안내대로 각자의 개인 스킬 폴더(`~/.claude/skills/`)에 설치하세요.

`gemini-frontend-design`은 Gemini 모델에 맞춰 다듬은 실험 버전이고, 저장소에 "구글이 공식 지원하는 제품이
아님"이라고 적혀 있습니다. `frontend-design`과 하는 일이 겹치므로 둘 다 불러와질 수 있습니다.

Flowbite와 Tailwind CSS는 공식 저장소에 에이전트 스킬이 없어서 넣지 않았습니다.

## 원본에서 바꾼 것

- **`design-review`**: 원본의 `0. Usage ping`(리뷰할 때마다 외부 서버로 사용 기록 전송)과
  `5. Pro mode`(유료 키가 있으면 리뷰 대상 코드를 외부 서버로 보내는 단계)를 뺐습니다.
  원본 README도 사용 기록을 끄려면 그 단계를 지우라고 안내합니다. 키 등록용 `activate` 명령도
  가져오지 않았습니다. 나머지 내용과 `checklist.md`는 원본 그대로입니다.
- **`shadcn`**: 원본은 스킬이 열리는 순간 `npx shadcn@latest info --json`을 자동으로 실행하고
  (`!` 명령 주입), `npx`·`pnpm dlx`·`bunx`로 shadcn CLI를 돌리는 모든 명령을 권한 확인 없이 허용합니다
  (`allowed-tools`). 둘 다 뺐습니다. 대신 shadcn 프로젝트(`components.json`이 있는 곳)에서 먼저
  `info --json`을 실행하라는 문장으로 바꿨으므로, CLI 명령은 평소처럼 권한 확인을 거칩니다.
  OpenAI용 카드(`agents/openai.yml`), 그 아이콘, 평가용 `evals/`는 가져오지 않았습니다.
- **`adapt`**: Impeccable은 스킬 하나(`impeccable`) 안에 명령 수십 개와 실행 스크립트(브라우저 자동화 등
  2MB 이상)를 묶어 둔 구조라, 반응형 부분인 `reference/adapt.md`만 꺼내 독립 스킬로 만들었습니다.
  앞에 `name`/`description` 머리말을 붙였고(설명문은 원본 `command-metadata.json`의 것), 두 문장을 바꿨습니다:
  네이티브(iOS/Android) 버전으로 넘기는 문장 → "웹 전용" 안내, 마무리를 `/impeccable polish`로 넘기는 문장 →
  `design-review`/`better-interface`로 점검. 나머지 본문은 원본 그대로입니다.
- **`better-*`**: 원본 그대로이며 OpenAI용 카드(`agents/openai.yaml`)만 뺐습니다. `better-interface`는
  혼자서는 동작하지 않고 7개 분야 스킬을 불러 쓰므로 함께 넣었습니다. 브랜치·PR 단위 리뷰를 맡는
  `interface-review`는 가져오지 않았습니다(요청하면 `better-interface`가 그 스킬을 쓰라고 안내합니다).
- 나머지(`gemini-frontend-design`, `magic-ui` 포함)는 원본 그대로입니다. `beautiful-shadows`는 `SKILL.md`만 가져오고 데모 폴더는 뺐습니다.
- **`refactoring-ui`**: 원본 그대로입니다(`skills/refactoring-ui` 폴더 + 저장소의 `LICENSE`, `ATTRIBUTION.md`).
  책 *Refactoring UI*(Adam Wathan, Steve Schoger)의 원칙을 작성자가 자기 말로 옮긴 비공식 스킬이며, 책 본문과
  그림은 들어 있지 않다고 밝힙니다. `scripts/`의 파이썬 3개는 팔레트·대비·토큰 계산만 하고 외부 통신이 없습니다.
- **`gsap-*`**: 원본 그대로입니다. 정적 HTML에는 필요 없는 `gsap-react`, `gsap-frameworks`는 가져오지 않았습니다.
  GSAP를 기본 선택지로 추천하라는 문구가 들어 있습니다(제작사 스킬이라서). `gsap-scrolltrigger` 235행 예제의
  `Max.max`는 원본의 오타(`Math.max`)입니다.
- 가져오지 않은 옆 스킬을 가리키는 링크는 열리지 않습니다: `apple-design` → `animation-performance`,
  `accessibility` → `web-quality-audit`, `emil-design-eng` → `choreograph`, `gsap-*` → `gsap-react`.
