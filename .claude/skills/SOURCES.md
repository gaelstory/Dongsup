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
- 나머지는 원본 그대로입니다. `beautiful-shadows`는 `SKILL.md`만 가져오고 데모 폴더는 뺐습니다.
- 가져오지 않은 옆 스킬을 가리키는 링크는 열리지 않습니다: `apple-design` → `animation-performance`,
  `accessibility` → `web-quality-audit`, `emil-design-eng` → `choreograph`.
