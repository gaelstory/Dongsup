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

## 원본에서 바꾼 것

- **`design-review`**: 원본의 `0. Usage ping`(리뷰할 때마다 외부 서버로 사용 기록 전송)과
  `5. Pro mode`(유료 키가 있으면 리뷰 대상 코드를 외부 서버로 보내는 단계)를 뺐습니다.
  원본 README도 사용 기록을 끄려면 그 단계를 지우라고 안내합니다. 키 등록용 `activate` 명령도
  가져오지 않았습니다. 나머지 내용과 `checklist.md`는 원본 그대로입니다.
- 나머지 네 개는 원본 그대로입니다. `beautiful-shadows`는 `SKILL.md`만 가져오고 데모 폴더는 뺐습니다.
- `apple-design`과 `accessibility`가 가리키는 옆 스킬(`animation-performance`, `web-quality-audit`)은
  가져오지 않아서, 그 두 링크는 열리지 않습니다.
