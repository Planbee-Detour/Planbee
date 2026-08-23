# Planbee 하네스 구성 상세

이 문서는 **무엇을 왜 그렇게 만들었는지**를 설명합니다.
사용법은 [WORKFLOW.md](WORKFLOW.md), 미완료 항목은 [TODO.md](TODO.md)를 보세요.

---

## 1. 하네스란 무엇이고 왜 필요한가

Planbee는 AI 에이전트가 상당 부분의 코드를 작성하는 것을 전제로 합니다.
그때 생기는 문제는 "코드를 못 쓴다"가 아니라 아래 세 가지입니다.

| 문제 | 하네스의 대응 |
|---|---|
| 에이전트마다 판단 기준이 달라 결과가 흔들린다 | 판정 기준을 **문서와 명령으로 고정**한다 |
| 여러 작업이 같은 파일을 건드려 충돌한다 | **역할별 디렉토리 소유권**을 강제한다 |
| "다 됐습니다"라는 보고를 믿을 수 없다 | 완료 판정을 모델이 아니라 **`make` 타깃**이 한다 |

그래서 이 하네스는 프롬프트 모음이 아니라 **역할 정의 + 문서 규약 + 실행 가능한 검증 게이트**의 조합입니다.

### 설계 원칙 3가지

**① 하네스의 본체를 벤더 파일 밖에 둔다.**
역할 정의를 `.claude/agents/`에 직접 쓰면 그 순간 Claude 전용이 됩니다.
실제 내용은 벤더 중립 마크다운(`.agents/roles/`)에 두고, 각 도구 설정은 그것을 가리키는 얇은 어댑터로 만듭니다.

**② "서브에이전트"를 이식 단위로 삼지 않는다.**
네이티브 서브에이전트는 Claude Code에만 있습니다. 이식 가능한 단위는
**`역할 프롬프트 + 입력 계약 + 출력 계약 + 검증 명령`** 4종 세트입니다.

**③ 완료 판정은 셸 명령이 한다.**
`make verify`가 통과해야 끝입니다. 이것이 도구가 무엇이든 동일하게 동작하는 유일한 층이며,
사실상 이식성의 대부분을 차지합니다.

---

## 2. 전체 구조

```text
Planbee/
├── AGENTS.md                    ★ 단일 원본 지침 — 지침 파일은 이것 하나뿐
├── Makefile                     ★ 도구 중립 검증 게이트
├── docker-compose.yml              PostgreSQL + API 컨테이너
├── .env.example                    환경 변수 정의 (실제 값은 .env, 커밋 안 함)
│
├── .agents/                     ★ 벤더 중립 자산 (실제 내용)
│   ├── roles/                      역할 정의 10개
│   ├── templates/                  PRD / status / defect 양식
│   ├── commands/feature.md         파이프라인 정의
│   └── manifest.json               역할 메타데이터 (어댑터 생성용)
│
├── docs/
│   ├── api/openapi.yaml         ★ API 계약 (구현보다 먼저 확정)
│   ├── api/error-codes.md          에러 코드 카탈로그
│   ├── conventions/                코딩 규칙 (리뷰어의 유일한 판정 근거)
│   └── features/<기능>/            역할 간 핸드오프 디렉토리
│
├── scripts/
│   ├── setup-harness.sh            CLI 로컬 파일 생성기
│   ├── agent.sh                    CLI 디스패처 (claude/codex/gemini)
│   └── contract-check.sh           계약 준수 검사
│
├── e2e/flows/                      Maestro 통합 테스트
├── mobile/                         React Native 앱
└── server/                         Spring Boot API
```

### git 에 올라가지 않는 것 (`make harness` 생성물)

```text
CLAUDE.md  -> AGENTS.md          심볼릭 링크
GEMINI.md  -> AGENTS.md          심볼릭 링크
.claude/
├── agents/*.md                  역할 어댑터 10개 (manifest.json 에서 생성)
├── commands/feature.md          슬래시 커맨드
└── settings.json                권한 허용/거부 목록
.gemini/commands/*.toml          Gemini 커스텀 커맨드 11개
.codex/                          Codex CLI 가 만들 경우 대비
```

**벤더 파일을 git 에 두지 않는 이유**: CLI 가 하나 늘 때마다 저장소에 벤더 폴더가 쌓이고,
같은 내용이 여러 곳에 중복되어 어느 것이 원본인지 흐려집니다.
생성 가능한 것은 생성하고, git 에는 원본만 둡니다.

★ 표시가 실제 자산입니다.

---

## 3. 레이어 1 — 단일 원본 지침과 멀티 CLI 이식성

### AGENTS.md

프로젝트 전체 규칙이 담긴 단일 파일입니다. 담고 있는 것:

- 기술 스택과 `make` 명령 목록
- **디렉토리 소유권 표** — 어떤 역할이 어디를 쓸 수 있는가
- **핸드오프 규약** — `docs/features/<기능>/` 구조
- **파이프라인** — 역할 실행 순서
- **절대 규칙 7개** — 계약 우선, 리뷰어의 판정 근거 제한, 재작업 루프 상한 등

### 3개 CLI 대응 — 파일은 생성하고 git 에는 두지 않는다

세 CLI 모두 루트의 마크다운을 자동으로 읽지만 파일명이 다릅니다.

| CLI | 읽는 파일 | git |
|---|---|---|
| Codex CLI | `AGENTS.md` | ✅ 원본 |
| Claude Code | `CLAUDE.md` | ❌ 심볼릭 링크 (생성물) |
| Gemini CLI | `GEMINI.md` | ❌ 심볼릭 링크 (생성물) |

import 문법이 도구마다 달라 심볼릭 링크가 가장 안전하지만, **링크를 커밋하면
저장소에 지침 파일이 3개로 보입니다.** 그래서 링크와 벤더 폴더는 `.gitignore` 로 빼고
`make harness` 가 로컬에 만들도록 했습니다.

```bash
make harness     # scripts/setup-harness.sh
```

한 번에 만들어지는 것:

```
CLAUDE.md -> AGENTS.md
GEMINI.md -> AGENTS.md
.claude/agents/*.md        (10개)
.claude/commands/feature.md
.claude/settings.json
.gemini/commands/*.toml    (11개)
```

새 팀원은 클론 후 `make install`(내부에서 `make harness` 실행) 한 번이면 동일한 환경이 됩니다.

### CLI별로 무엇이 필요한가

| 레이어 | Claude Code | Gemini CLI | Codex CLI |
|---|---|---|---|
| 프로젝트 지침 | `CLAUDE.md` (링크 생성) | `GEMINI.md` (링크 생성) | **`AGENTS.md` 직접 읽음 — 생성 불필요** |
| 역할 실행 | `.claude/agents/` (네이티브 서브에이전트) | `.gemini/commands/` | `scripts/agent.sh` |
| 슬래시 커맨드 | `.claude/commands/` (프로젝트) | `.gemini/commands/` (프로젝트) | `~/.codex/prompts/` (**전역만**) |
| 권한·샌드박스 | `.claude/settings.json` (프로젝트) | `.gemini/settings.json` | `~/.codex/config.toml` (**전역만**) |

**Codex는 프로젝트 단위로 둘 수 있는 게 가장 적습니다.** 지침(`AGENTS.md`)은 표준으로 읽어서
아무 작업이 필요 없지만, 커스텀 프롬프트와 권한 정책은 전역 설정이라 저장소에 담을 수 없습니다.

커스텀 프롬프트가 필요하면 별도 타깃으로 홈 디렉토리에 생성합니다.

```bash
make harness-codex     # ~/.codex/prompts/planbee-<역할>.md  10개
```

저장소 밖에 파일을 만들기 때문에 기본 `make harness` 에서는 제외했습니다.
전역 디렉토리라 다른 프로젝트와 섞이므로 `planbee-` 접두어를 붙이고 프로젝트 절대경로를 박아 넣습니다.
승인·샌드박스 정책은 `~/.codex/config.toml`에서 직접 설정해야 합니다.

### 어댑터 구조

`.claude/agents/mobile-reviewer.md` 전문:

```markdown
---
name: mobile-reviewer
description: 모바일 변경분이 코딩 규칙에 맞는지 판정한다. 코드는 수정하지 않고 결함만 보고.
tools: Read, Write, Edit, Bash, Grep, Glob
---

`.agents/roles/mobile-reviewer.md` 를 읽고 그 역할 정의를 그대로 따르세요.
```

내용이 전혀 없습니다. 이게 핵심입니다 — Codex나 Gemini 어댑터를 추가할 때
`.agents/roles/`는 한 글자도 고칠 필요가 없습니다.

이 파일들은 손으로 쓰지 않고 `.agents/manifest.json` 에서 생성합니다.

```json
{
  "name": "mobile-reviewer",
  "needsShell": true,
  "description": "모바일 변경분이 코딩 규칙에 맞는지 판정한다. ..."
}
```

`needsShell` 은 벤더 중립 개념입니다 — 생성기가 이걸 Claude 의 `tools` 목록으로 번역합니다.
CLI 를 추가할 때 manifest 는 그대로 두고 생성기에 출력 형식만 추가하면 됩니다.

역할별로 도구가 더 필요하면 `mcpTools` 에 적습니다. 기본 목록 뒤에 덧붙습니다.

```json
{
  "name": "ux-designer",
  "needsShell": false,
  "mcpTools": ["mcp__pencil__get_app_state", "mcp__pencil__execute"]
}
```

`docs/design/planbee.pen` 은 암호화 파일이라 `Read`/`Grep` 으로 열리지 않고 pencil MCP
도구로만 다룰 수 있습니다 (`docs/conventions/common.md` C-9). 그래서 pen 을 그리는
**ux-designer** 에게는 pencil 도구 4개를, pen 을 참고해 화면을 만드는
**mobile-developer** 에게는 읽기에 필요한 2개를 붙였습니다. pencil 에는 읽기 전용
도구가 따로 없어 `execute` 하나로 읽기와 쓰기를 겸하므로, mobile-developer 의
"pen 은 읽기 전용" 제약은 도구가 아니라 역할 문서가 강제합니다.

권한 설정(`.claude/settings.json`)도 같이 생성됩니다 — pencil 도구 4개는 `allow`,
`Read(./**/*.pen)` 은 `deny`. 암호화 파일을 일반 도구로 여는 사고를 기계로 막습니다.

**제약 — pencil MCP 는 에디터에 파일이 열려 있어야 동작합니다.** 서버가 VS Code
Pencil 확장이라 `.pen` 탭이 닫혀 있으면 `A file needs to be open in the editor` 로
실패합니다. 서브에이전트는 탭을 열 수 없으므로, pen 작업을 시킬 때는 사람이 먼저
`code docs/design/planbee.pen` 으로 열어 둬야 합니다. 그리고 편집 결과는 에디터
버퍼에만 남으므로 **`Cmd+S` 를 눌러야 디스크에 저장됩니다** — 저장 전에는 `git diff`
에 아무것도 안 잡힙니다.

### 디스패처

```bash
./scripts/agent.sh <역할> "<작업 지시>"
AGENT_CLI=codex ./scripts/agent.sh server-reviewer "schedule 기능 리뷰"
```

`AGENTS.md` + `.agents/roles/<역할>.md` + 작업 지시를 합쳐 선택한 CLI에 넘깁니다.
역할 10개 × CLI 3개 = 30가지 조합이 하나의 인터페이스로 정리됩니다.

---

## 4. 레이어 2 — 역할 10개

### 전체 목록

| 역할 | 판정 대상 | 쓰기 권한 | 완료 게이트 |
|---|---|---|---|
| `product-manager` | 요구사항 | `docs/features/*/PRD.md` | 모든 AC가 관측 가능한가 |
| `ux-designer` | 화면 명세 | `docs/features/*/design.md` | 모든 스토리에 화면 매핑 |
| `tech-lead` | API 계약 | `docs/api/`, `contract.yaml` | 모든 엔드포인트에 성공·실패 응답 |
| `server-developer` | 구현 | `server/src/main/` | `make verify-server` |
| `server-reviewer` | 코드 규칙 | `docs/features/*/review/` | 규칙 인용된 PASS/FAIL |
| `server-tester` | 동작 | `server/src/test/` | `make test-server(-db)` |
| `mobile-developer` | 구현 | `mobile/src/` | `make verify-mobile` |
| `mobile-reviewer` | 코드 규칙 | `docs/features/*/review/` | 규칙 인용된 PASS/FAIL |
| `mobile-tester` | 동작 | `mobile/__tests__/` | `make test-mobile` |
| `integration-tester` | 연동 | `e2e/` | `make test-e2e` |

### 리뷰어와 테스터를 나눈 이유

판정 기준이 다르기 때문입니다.

- **리뷰어**는 코드를 읽고 규칙 위반을 찾습니다. 앱을 띄울 필요가 없습니다.
- **테스터**는 실행 결과를 보고 인수조건 충족을 확인합니다. 코드 스타일에 관여하지 않습니다.

둘을 합치면 "코드가 예뻐 보이니 통과" 같은 판정이 나옵니다.

### 리뷰어의 판정 근거를 제한한 이유

> **리뷰어는 `docs/conventions/`에 적힌 것만 지적한다.**

이 규칙이 없으면 리뷰어가 매번 자기가 생각하는 베스트 프랙티스를 새로 지어내서,
같은 코드가 실행할 때마다 다른 지적을 받습니다. 규칙이 없다고 판단되면
지적 대신 `conventions.md`에 제안으로 추가하게 했습니다.

### 개발자와 리뷰어/테스터의 권한 분리

리뷰어와 테스터는 **구현 코드를 수정하지 않습니다.** 결함은 `defects.md`에 리포트로만 남기고,
고치는 것은 developer 역할입니다. 그러지 않으면 "자기가 짠 코드를 자기가 검사"하는 구조가 됩니다.

### 재작업 루프 상한

```
개발자 → 리뷰어(FAIL) → 개발자 → 리뷰어(FAIL) → 개발자 → [3회차] ESCALATE
```

대상별 2회까지입니다. 3회차에 접어들면 중단하고 `status.md`에 `ESCALATE`를 적은 뒤 사람에게 넘깁니다.
개발자↔테스터가 무한 핑퐁하며 토큰만 태우는 것이 다중 에이전트 하네스의 가장 흔한 실패 모드입니다.

---

## 5. 레이어 3 — 핸드오프 규약

에이전트끼리 직접 대화하지 않습니다. 서브에이전트는 각자 독립 컨텍스트라
결과만 돌려주므로, **전달은 반드시 파일로** 이뤄집니다.

```text
docs/features/<기능>/   # 폴더 이름 = 기능 이름 (로그인 → docs/features/login/)
├── PRD.md          # product-manager  — 유저 스토리 + 인수조건(AC-1, AC-2...)
├── design.md       # ux-designer      — UI/UX 명세: 화면·상태·문구
├── contract.yaml   # tech-lead        — OpenAPI (구현보다 먼저)
├── status.md       # 전원             — 파이프라인 상태 머신
├── review/         # *-reviewer       — 리뷰 리포트
└── defects.md      # *-reviewer, *-tester — 결함 append
```

### status.md — 파이프라인 상태 머신

체크박스가 곧 "다음에 어떤 역할을 부를지"를 결정합니다.
오케스트레이션 로직을 프롬프트가 아니라 파일에서 읽을 수 있어 CLI 이식성도 올라갑니다.
재작업 카운터도 여기 있습니다.

### defects.md — 결함 리포트 형식

```markdown
### DEF-001 [High] 만료 토큰으로 무한 재시도
- 상태: 열림
- 보고자: mobile-tester      - 담당: mobile-developer
- 원인: 모바일                # integration-tester 만: 서버/모바일/계약/미판별
- 위치: mobile/src/shared/api/client.ts:42
- 근거: PRD.md AC-7 / conventions/mobile.md M-14
- 재현: 1. 만료된 토큰으로 앱 실행  2. 목록 진입
- 기대: 1회 갱신 후 실패하면 로그인 화면
- 실제: 동일 요청을 무한 반복
```

**근거 없는 결함은 접수되지 않습니다.** 반드시 `AC-*` 또는 규칙 번호를 인용해야 합니다.

`integration-tester`만 `원인:` 필드를 씁니다 — 실패가 앱 문제인지 서버 문제인지 계약 문제인지
판별하는 것이 그 역할의 핵심 산출물이기 때문입니다.

---

## 6. 레이어 4 — 검증 게이트 (Makefile)

### 왜 Makefile인가

역할 정의와 문서는 `npm run ...`이나 `./gradlew ...`가 아니라 **`make` 타깃만 참조**합니다.
빌드 도구가 바뀌어도 역할 파일 10개를 고칠 필요가 없습니다.
그리고 Claude/Codex/Gemini 어디서 실행하든 같은 명령입니다.

### 전체 타깃

| 타깃 | 하는 일 | Docker |
|---|---|---|
| `env` | `.env.example` → `.env` 복사 (덮어쓰지 않음) | |
| `install` | npm + CocoaPods 설치 | |
| `db-up` / `db-down` / `db-reset` | 로컬 PostgreSQL | 필요 |
| `lint-mobile` | ESLint | |
| `typecheck-mobile` | `tsc --noEmit` | |
| `test-mobile` | Jest + RNTL (API는 msw 목킹) | |
| `verify-mobile` | 위 3개 | |
| `lint-server` | Spotless | |
| `format-server` | Spotless 자동 정리 | |
| `test-server` | 슬라이스 테스트 + ArchUnit | |
| `test-server-db` | Testcontainers 통합 테스트 | 필요 |
| `verify-server` | 위 3개 | 필요 |
| `contract-export` | 실행 중인 서버에서 실제 OpenAPI 추출 | 필요 |
| `contract-check` | 계약 vs 구현 대조 | 필요 |
| `contract-types` | 계약 → 모바일 TypeScript 타입 생성 | |
| `e2e-up` / `e2e-down` | 통합 환경 기동/정리 | 필요 |
| `e2e-app` | 시뮬레이터에 앱 설치 | |
| `test-e2e` | Maestro 플로우 | 필요 |
| `logs` | 통합 환경 로그 | 필요 |
| **`verify`** | **verify-mobile + verify-server + contract-check** | 필요 |

### 미구성 게이트는 조용히 통과시키지 않는다

```makefile
define TODO
	@echo "✗ '$@' 는 아직 구성되지 않았습니다."; \
	echo "  $(1)"; \
	exit 1
endef
```

아직 안 만든 타깃은 `exit 1`로 실패합니다. 빈 타깃이 성공을 반환하면
"게이트를 통과했다"는 잘못된 신호가 되기 때문입니다.

### 현재 통과 상태

```
mobile   : 2 suites / 8 tests
server   : ArchUnit 6 + GlobalExceptionHandler 3 + HealthController 2 = 11
server(DB): contextLoads 1 + OpenApiExport 1 = 2
contract : ✓ 통과
```

---

## 7. 코딩 규칙 체계

### 3등급

| 등급 | 강제 주체 | 리뷰어 행동 |
|---|---|---|
| `[LINT]` | ESLint / ArchUnit / Spotless / contract-check | **언급 금지** (기계가 이미 막음) |
| `[MUST]` | 리뷰어 | FAIL 처리 |
| `[SHOULD]` | 리뷰어 | 제안만, 차단하지 않음 |

새 규칙을 만들 때는 **"이거 린터로 강제 가능한가?"를 먼저 묻고**, 가능하면 `[LINT]`로 내립니다.
기계가 잡을 수 있는 것을 LLM에게 시키면 느리고 일관성도 없습니다.

리뷰어에게 남는 것은 기계가 못 잡는 것 — 명명의 적절성, 추상화 수준, 중복, PRD 의도와의 정합성뿐입니다.

### 규칙은 코드를 쓰면서 늘린다

코드가 없는 상태에서 규칙을 다 쓰면 안 지켜지는 문서가 됩니다.
구조적 결정(되돌리는 비용이 큰 것)만 먼저 정하고, 나머지는 구현하면서 추가합니다.
**구현 중 결정이 나면 같은 커밋에서 규칙을 추가**하는 것이 원칙입니다.

### 현재 규칙 목록

**`docs/conventions/common.md`** — C-1 에러 응답 스키마, C-2 날짜·시각(UTC),
C-3 커밋, C-4 환경 변수/시크릿, C-5 계약이 명세다

**`docs/conventions/mobile.md`** — M-1 기능별 구조, M-2 기능 간 import 금지,
M-3 shared 승격 기준, M-4 서버 상태는 react-query 소유, M-6 4가지 화면 상태,
M-8 API 타입은 계약에서 생성, M-13 오류는 `code`로 분기, M-14 토큰 취급,
M-15 NativeWind, M-16 색상 리터럴 금지 (외 6개)

**`docs/conventions/server.md`** — S-1 도메인별 패키지, S-3 레이어 방향,
S-4 엔티티 노출 금지, S-7 예외 한 곳에서 변환, S-8 Clock 주입, S-14 Flyway가 스키마 소유,
S-17 인증 정책, S-19 응답 스키마 명시, S-20 엔드포인트는 계약에 먼저 (외 10개)

---

## 8. 계약 우선 설계

### 왜 계약이 먼저인가

처음에는 springdoc으로 **코드에서** OpenAPI를 생성하려 했지만 순서가 반대였습니다.
서버 구현이 끝나야 계약이 나오니 모바일이 기다려야 하고, 통합 테스터는 검증 기준이 없습니다.

그래서 **tech-lead가 `docs/api/openapi.yaml`을 손으로 먼저 확정**합니다.
그 순간부터:

- 서버와 모바일이 **병렬 진행**
- 모바일은 계약의 `example`로 msw 목 생성
- 통합 테스터는 계약을 기준으로 시나리오 작성
- springdoc은 생성기가 아니라 **"구현이 계약과 어긋났는지 검증하는 도구"**로 역할 전환

### 체인

```
docs/api/openapi.yaml  (원본, tech-lead 소유)
      │
      ├── make contract-types ──→ mobile/src/shared/api/schema.ts ──→ 타입 안전 클라이언트
      │
      └── make contract-check ──→ 서버 구현이 계약을 지켰는지 검사
                                     ↑
                            make contract-export
                       (실행 중인 서버에서 실제 스펙 추출)
```

### contract-check가 잡는 것

| 실패 조건 | 예 |
|---|---|
| 구현이 계약을 어긴 파괴적 변경 | 응답에서 필수 필드 제거, 타입 축소 |
| 계약에 없는 엔드포인트 노출 | 문서화되지 않은 API = 계약 드리프트 |

실패가 아닌 것: 계약에만 있고 아직 구현 안 된 것(진행 중일 수 있음), `servers`·설명 문구 차이.

도구는 **oasdiff를 Docker로** 실행합니다 — 전역 설치가 필요 없습니다.

> **주의**: `oasdiff breaking`은 파괴적 변경을 찾아도 기본 exit 0을 반환합니다.
> `--fail-on ERR`이 없으면 오류를 출력하면서 게이트는 통과하는 최악의 형태가 됩니다.
> 이 부분은 고의로 스펙을 망가뜨려 실패를 확인했습니다.

### 구현이 지켜야 할 것 (S-19)

계약과 대조 가능하려면 구현이 자기 스펙을 정확히 기술해야 합니다.

- `Map`을 반환하지 않는다 → `record`로 (Map은 스키마가 생성되지 않음)
- `@Schema(requiredMode = REQUIRED)`로 필수 여부 명시
- `produces = APPLICATION_JSON_VALUE` (없으면 `*/*`로 생성)
- `@Operation(operationId)`, `@Tag`, `@ApiResponse`를 계약과 동일하게
- 공개 엔드포인트에 `@SecurityRequirements`

---

## 9. 에러 계약 (RFC 9457)

모든 오류 응답은 `application/problem+json`입니다.

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "일정을 찾을 수 없습니다.",
  "instance": "/api/v1/schedules/42",
  "code": "SCHEDULE_NOT_FOUND"
}
```

표준 필드에 두 가지 확장을 더했습니다.

- **`code`** — 모바일이 분기하는 기계용 식별자. **모든 오류 응답에 항상 존재**
- **`errors`** — 검증 실패 시에만. `[{field, code, message}]`

### 왜 `code`를 추가했나

모바일은 `title`·`detail` 문자열이나 HTTP 상태가 아니라 `code`로 분기합니다.
문구는 바뀔 수 있고 코드는 계약이기 때문입니다.

`docs/api/error-codes.md`가 코드 카탈로그이며, **카탈로그에 없는 코드를 응답에 쓰면 계약 위반**입니다.

### 서버 구현

```
common/error/
├── ErrorCode.java              인터페이스 — 도메인마다 enum으로 구현
├── CommonErrorCode.java        공통 코드 8개
├── BusinessException.java      서비스가 던지는 예외
├── FieldErrorDetail.java       errors 확장 항목
└── GlobalExceptionHandler.java ProblemDetail로 변환
```

`handleExceptionInternal`을 오버라이드해서 **Spring이 자체 처리하는 예외**
(본문 파싱 실패, 405 등)에도 `code`를 채웁니다.
이게 없으면 일부 오류만 `code`가 비어 모바일이 두 가지 방식으로 오류를 다뤄야 합니다.

> **놓치기 쉬운 지점**: 401/403은 **필터 체인에서 발생해 `@RestControllerAdvice`를 타지 않습니다.**
> 그대로 두면 인증 오류만 형식이 달라집니다. `common/security/SecurityProblemResponder`가
> 동일한 problem+json을 씁니다.

### 모바일 구현

`mobile/src/shared/api/problem.ts`가 파싱을 담당합니다.
**본문이 계약과 달라도 절대 예외를 던지지 않습니다** — 오류 처리 중에 앱이 죽으면
사용자는 아무 안내도 받지 못합니다. 해석 불가한 응답은 `UNKNOWN_ERROR`로 처리합니다.

---

## 10. 인증

**이메일 + 비밀번호 / 자체 발급 JWT(HS256)**, 검증은 `oauth2-resource-server`.

### 왜 커스텀 JWT 필터를 안 만들었나

커스텀 인증 필터는 보안 결함이 가장 자주 발생하는 지점입니다.
발급은 자체적으로 하되 **검증은 표준 필터 체인에 맡기는** 편이,
특히 에이전트가 코드를 쓰는 환경에서 안전합니다.

### 기본 정책은 거부

```java
.authorizeHttpRequests(requests -> requests
    .requestMatchers(PUBLIC_PATHS).permitAll()
    .anyRequest().authenticated())
```

새 엔드포인트를 만들고 아무것도 하지 않으면 **인증이 필요한 상태**가 됩니다.
공개는 `SecurityConfig.PUBLIC_PATHS`에 명시적으로만 추가합니다.

### 모바일 쪽 규칙 (M-14)

- 토큰은 **Keychain에만** (MMKV/AsyncStorage 금지)
- `UNAUTHORIZED` 수신 시 **갱신 1회만** 시도, 실패하면 로그인 화면
- 갱신 요청이 동시에 여러 개 발생하면 **하나로 합친다(단일 비행)**
  — 그러지 않으면 리프레시 토큰 회전 정책과 충돌합니다
- `FORBIDDEN`은 갱신 대상이 아님

이 규칙들은 `client.ts`에 구현되어 있고 msw 테스트로 고정돼 있습니다.

---

## 11. 환경 변수와 시크릿

### 원칙

**git에는 변수의 *정의*만 두고, 실제 값은 커밋하지 않는다.**

| 파일 | git | 내용 |
|---|---|---|
| `.env.example` | 커밋 | 정의 + 로컬에서 그대로 동작하는 값 |
| `.env` | 무시 | 실제 값 (`make env`로 생성) |
| `mobile/.env.example` | 커밋 | 모바일 변수 정의 |
| `mobile/.env` | 무시 | 실제 값 |

모바일이 별도인 이유는 `react-native-config`가 `mobile/` 디렉토리의 `.env`만 인식하기 때문입니다.

### 기본값(fallback)을 두지 않는 이유

```properties
# 나쁜 예 (초기 구현)
planbee.security.jwt.secret=${JWT_SECRET:local-development-only-secret}

# 현재
planbee.security.jwt.secret=${JWT_SECRET}
```

기본값이 있으면 운영에서 변수 주입을 깜빡해도 **개발용 키로 조용히 뜹니다.**
가장 위험한 실패 방식입니다. 지금은 세 지점에서 막힙니다.

```
1. make           → ✗ .env 가 없습니다. 'make env' 로 만든 뒤 값을 채우세요.
2. docker compose → required variable DB_PASSWORD is missing a value: ...
3. Spring         → 필수 환경 변수가 없습니다: DB_URL, DB_USERNAME, ...
```

3번은 `RequiredEnvironmentCheck`(EnvironmentPostProcessor)입니다.
이게 없으면 미해석 플레이스홀더가 흘러가서 `'url' must start with "jdbc"` 같은
원인을 알 수 없는 오류가 납니다 — 실패 자체보다 **실패 메시지**가 문제였습니다.

> 참고: `EnvironmentPostProcessor`는 자동 구성과 달리 `.imports`가 아니라
> `META-INF/spring.factories`로 등록해야 동작합니다.

### 테스트는 `.env`에 의존하지 않는다

`server/build.gradle`의 `tasks.withType(Test)`에서 테스트 전용 값을 주입합니다.
`.env`가 없어도 `make verify`가 돌고, CI에서도 시크릿 없이 테스트할 수 있습니다.

### .gitignore

기존 `.gitignore`에 이미 필요한 규칙이 있어 **수정하지 않았습니다.**

```
.env          ← 무시
.env.*        ← 무시
!.env.example ← 예외 (커밋됨)
```

패턴에 `/`가 없으면 모든 깊이에 적용되므로 `mobile/.env`도 걸립니다.
`mobile/.gitignore`의 `/vendor/bundle/`이 28MB 젬 디렉토리를 이미 막고 있습니다.

---

## 12. 테스트 3층

테스터를 셋으로 나누면 **같은 것을 세 번 테스트하는 낭비**가 반드시 발생합니다.
소유권을 이렇게 잘랐습니다.

| | 대상 | 의존성 | 도구 |
|---|---|---|---|
| **server-tester** | API 계약, 비즈니스 로직, 영속성, 권한, 경계값 | 실제 DB(Testcontainers), 외부는 목 | JUnit + MockMvc |
| **mobile-tester** | 화면 렌더링, 상태 전이, 폼 검증, 오류 UI | **API는 msw 목킹, 서버 안 띄움** | RNTL + msw |
| **integration-tester** | 실제 앱 ↔ 실제 서버 | **아무것도 목킹 안 함** | Maestro + docker compose |

### 지켜야 할 두 규칙

1. **mobile-tester는 서버를 절대 띄우지 않는다**
2. **integration-tester는 해피패스와 계약 위반만 다룬다** — 엣지케이스는 아래 두 층에

E2E에 엣지케이스를 넣기 시작하면 느리고 깨지기 쉬운 테스트가 쌓여 하네스 전체가 신뢰를 잃습니다.

### 서버 테스트를 두 태스크로 나눈 이유

| 태스크 | Docker | 내용 |
|---|---|---|
| `make test-server` | 불필요 | `@WebMvcTest` 슬라이스 + ArchUnit |
| `make test-server-db` | 필요 | `@IntegrationTest` (실제 PostgreSQL) |

전체가 Docker를 요구하면 피드백 루프가 느려지고, 슬라이스만 있으면 스키마 오류를 놓칩니다.
`@IntegrationTest` 합성 애노테이션 하나만 붙이면 `@ServiceConnection`으로 컨테이너가 자동 연결됩니다.

---

## 13. 기술 스택

### 서버 (Java 21 / Spring Boot 3.5.16)

| 용도 | 라이브러리 |
|---|---|
| 영속성 | Spring Data JPA + PostgreSQL 17 |
| 동적 쿼리 | QueryDSL 5.1.0 (`jakarta` classifier, 버전은 Spring Boot BOM 관리) |
| 마이그레이션 | Flyway (`ddl-auto=validate` — 스키마 소유자는 Flyway) |
| API 문서 | springdoc-openapi 2.8.6 |
| 보안 | Spring Security + oauth2-resource-server |
| 구조 검증 | ArchUnit 1.4.1 |
| 포맷 | Spotless 7.0.4 |
| 테스트 | JUnit 5, Testcontainers, RestAssured, JaCoCo |

#### QueryDSL 을 넣은 이유와 주의점

동적 조건(필터·검색·정렬 조합)을 JPQL 문자열로 이어붙이면 컴파일이 잡아주지 못하고,
엔티티 필드명이 바뀌어도 런타임에야 터집니다. QueryDSL 은 그걸 컴파일 오류로 만듭니다.
선택 기준은 `docs/conventions/server.md` S-23 에 있습니다 — **단순 조회까지 QueryDSL 로
쓰는 것은 규칙 위반**입니다.

- **`jakarta` classifier 가 필수**입니다. Spring Boot 3.x 는 Jakarta EE 9+ 라
  classifier 없는 아티팩트는 `javax.persistence` 를 참조해 컴파일되지 않습니다.
- **버전은 고정하지 않았습니다.** Spring Boot BOM 이 `querydsl-bom` 을 import 하므로
  3.5.16 기준 5.1.0 이 자동으로 잡힙니다. 부트를 올릴 때 함께 올라갑니다.
- **Q타입은 생성물입니다.** `annotationProcessor` 가
  `server/build/generated/sources/annotationProcessor/java/main/` 에 만들고,
  Gradle 이 이 경로를 main 소스셋에 자동 등록하며 `clean` 이 `build/` 째로 지웁니다.
  별도 `sourceSets` 설정을 넣지 않은 이유입니다. `build/` 는 이미 `.gitignore` 대상이라
  커밋될 일이 없습니다. (server.md S-24)
- **엔티티가 하나도 없으면 Q타입도 생성되지 않습니다.** 현재 저장소 상태가 그렇습니다 —
  첫 엔티티가 들어오는 커밋에서 처음으로 Q타입이 생깁니다.

### 모바일 (React Native 0.86 / React 19.2)

| 용도 | 라이브러리 |
|---|---|
| 내비게이션 | React Navigation 7 + screens + gesture-handler |
| 서버 상태 | TanStack Query 5 (4xx 재시도 안 함) |
| 클라이언트 상태 | zustand 5 |
| 폼/검증 | react-hook-form 7 + zod 3 |
| 스타일 | NativeWind 4 + Tailwind 3 |
| 저장 | MMKV 4 (+nitro), Keychain 10 |
| 계약 | openapi-fetch + openapi-typescript |
| 테스트 | RNTL 14, msw 2 |

### 스타일에 NativeWind를 고른 이유

`react-native-unistyles` v3와 비교했을 때:

- unistyles는 nitro-modules, edge-to-edge, reanimated를 모두 요구해 설정 표면이 큼
- **에이전트가 Tailwind 클래스를 훨씬 안정적으로 작성**함

교체 가능한 선택입니다.

### 도입 중 막힌 지점 3개

1. **`msw/node`가 RN에서 안 됨** — msw의 exports에 `"react-native": null`이 걸려 있음.
   `msw/native`를 써야 함
2. **RN jest 프리셋이 `.mjs`를 변환하지 않음** — msw 의존성 일부가 ESM 전용이라
   `transform`에 `mjs` 추가 필요
3. **gesture-handler 3.x가 `RNWorklets`를 요구** — `react-native-worklets` +
   babel 플러그인 추가. 덕분에 reanimated는 나중에 바로 붙일 수 있음

---

## 14. 설계 판단 요약

| 판단 | 근거 |
|---|---|
| 역할 정의를 `.agents/`에 두고 어댑터는 얇게 | 벤더 종속 회피. CLI 추가 시 본체 수정 불필요 |
| 완료 판정을 `make`에 위임 | 모델의 "다 됐습니다"를 믿을 수 없음 |
| 리뷰어와 테스터 분리 | 판정 기준(코드 vs 실행 결과)이 다름 |
| 리뷰어는 문서화된 규칙만 지적 | 실행할 때마다 다른 지적이 나오는 것 방지 |
| 재작업 루프 2회 상한 | 무한 핑퐁이 가장 흔한 실패 모드 |
| 계약을 손으로 먼저 작성 | 서버·모바일 병렬화, 통합 테스트 기준 확보 |
| 테스트 3층 경계 명시 | 같은 것을 세 번 테스트하는 낭비 방지 |
| 서버 테스트를 Docker 유무로 분리 | 피드백 루프 속도 vs 스키마 검증 |
| 환경 변수 기본값 제거 | 운영에서 개발 키로 조용히 뜨는 사고 방지 |
| 훅을 Claude settings가 아닌 git 훅으로 | 어느 CLI로 작업하든 동일하게 적용 |
| 전체 Java 포매터 미도입 | JDK 21 호환 이슈 + 기존 코드 전면 재포맷 회피 |
| 미구성 게이트는 `exit 1` | 빈 타깃의 성공이 잘못된 신호가 됨 |

---

## 15. 검증된 것과 안 된 것

### 실행으로 확인한 것

- `make verify` 전체 통과 (모바일 8 + 서버 11 + 서버DB 2 + contract-check)
- Metro 번들링 성공 (7.5MB, NativeWind 파이프라인 포함)
- `pod install` 85개 pod 설치
- 컨테이너 환경에서 health / 401 problem+json / Flyway V1+V900 / OpenAPI 3.1
- contract-check의 **두 실패 조건을 고의 주입으로 검증**
- 환경 변수 누락 시 3개 지점 모두 차단

### 확인하지 못한 것

- **Xcode 실제 빌드와 시뮬레이터 실행**
- `make test-e2e` (Maestro 미설치)
- 파이프라인 전체를 실제 기능으로 통과시킨 사례 0건

자세한 내용은 [TODO.md](TODO.md).
