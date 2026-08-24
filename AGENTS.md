# Planbee — 에이전트 공용 지침

이 파일은 Claude Code / Codex CLI / Gemini CLI 가 공통으로 읽는 **단일 원본**입니다.
**git 에 올라가는 지침 파일은 이 파일 하나뿐입니다.**
`CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/` 는 `make harness` 가 로컬에 만드는 생성물이며
모두 `.gitignore` 대상입니다. 그 파일들을 직접 편집하지 마세요 — 다음 생성 때 덮어써집니다.

## 프로젝트

- **Mobile**: React Native 0.86 / React 19.2 / TypeScript (`mobile/`)
  - **배포는 iOS 최우선, 구현은 안드로이드 병행** — 플랫폼 차이는 분기해 양쪽을 모두 구현한다
    (`docs/conventions/mobile.md` M-19·M-20). 배포 판단은 사람에게 묻는다(절대 규칙 8).
  - 내비게이션 React Navigation 7, 서버 상태 react-query 5, 클라 상태 zustand,
    폼 react-hook-form + zod, 스타일 NativeWind 4, 저장 MMKV/Keychain, 테스트 RNTL + msw
- **Server**: Java 21 / Spring Boot 3.5.16 / Gradle (`server/`), JPA + QueryDSL + Flyway + springdoc
  - 단순 조회는 Spring Data JPA, 동적 조건·다중 조인·프로젝션은 QueryDSL (`docs/conventions/server.md` S-23)
- **DB**: PostgreSQL 17. 로컬은 `make db-up`, 테스트는 Testcontainers. 스키마 소유자는 Flyway.
- **인증**: 이메일 + 비밀번호. 자체 발급 JWT(HS256), 검증은 oauth2-resource-server. 기본 정책은 거부.
- **오류 형식**: RFC 9457 ProblemDetail + `code` 확장. 모바일은 `code` 로만 분기한다.

## 명령어 — 항상 `make`를 쓴다

빌드 도구를 직접 호출하지 마세요. 역할 정의와 문서는 `make` 타깃만 참조합니다.

| 목적 | 명령 |
|---|---|
| 환경 변수 파일 생성 | `make env` |
| 전체 검증 | `make verify` |
| 모바일 린트/테스트 | `make lint-mobile` / `make test-mobile` |
| 서버 린트/자동정리 | `make lint-server` / `make format-server` |
| 서버 테스트 (Docker 불필요) | `make test-server` |
| 서버 통합 테스트 (Docker 필요) | `make test-server-db` |
| 로컬 DB 기동/정지 | `make db-up` / `make db-down` |
| 서버 실제 스펙 추출 | `make contract-export` |
| 계약 → 모바일 타입 생성 | `make contract-types` |
| 통합 환경 기동/정리 | `make e2e-up` / `make e2e-down` |
| 통합(E2E) 테스트 | `make e2e-app` (앱 설치) → `make test-e2e` |
| 통합 환경 로그 | `make logs` |
| 계약 검증 | `make contract-check` |
| 사용 가능한 타깃 | `make help` |

포트가 이미 사용 중이면 `API_PORT=18080 make e2e-up` 처럼 덮어쓴다.

## 환경 세팅 — 정본에서 생성한다

사람이 **"환경에 맞게 세팅해줘"** 라고 하면, *지금 실행 중인 자기 CLI 가 읽는 파일을
정본에서 생성하라*는 뜻입니다. 손으로 쓰지 마세요.

정본은 둘뿐이고 나머지는 전부 여기서 파생된 생성물입니다.

| 정본 (git 에 올라감) | 내용 |
|---|---|
| `AGENTS.md` | 프로젝트 공용 지침 — 이 파일 |
| `.agents/` | 역할 정의 `roles/`, 메타데이터 `manifest.json`, 커맨드 `commands/`, 템플릿 `templates/` |

생성기는 `scripts/setup-harness.sh` 하나이고, 진입점은 `make` 타깃입니다.

### 절차

1. `make env` — `.env.example` → `.env` 복사. **값은 채우지 않습니다**(절대 규칙 7).
   이미 있는 파일은 덮어쓰지 않습니다.
2. `make harness` — 자기 CLI 가 읽는 어댑터를 정본에서 생성.
3. Codex CLI 로 실행 중이라면 `make harness-codex` 도 실행합니다. 저장소 밖
   (`~/.codex/prompts/`)에 파일을 만들므로 **사람에게 먼저 확인**합니다.
4. 무엇이 생성됐는지, 사람이 직접 해야 할 일(`.env` 값 채우기, `~/.codex/config.toml`
   승인·샌드박스 설정 등)이 무엇인지 보고합니다.

### 지켜야 할 것

- **생성물을 직접 편집하지 않는다.** `CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/`,
  `.codex/` 는 다음 `make harness` 에서 덮어써집니다. 고칠 내용이 있으면 정본
  (`AGENTS.md`, `.agents/`)이나 생성기(`scripts/setup-harness.sh`)를 고치고 다시 생성합니다.
- **어댑터에 역할 내용을 복사하지 않는다.** 어댑터는 `.agents/roles/<역할>.md` 를 가리키는
  얇은 포인터입니다. 내용을 복제하는 순간 정본이 둘이 됩니다.
- **생성물은 git 에 올리지 않는다.** 새로 만드는 경로는 `.gitignore` 에 같이 추가합니다.
- **세팅을 이유로 시크릿을 만들지 않는다.** `.env` 는 열지도, 값을 채우지도 않습니다.

### 생성기가 아직 모르는 CLI 라면

지원 목록에 없는 CLI(또는 같은 CLI 의 새 기능)에 맞춰야 하면, 어댑터를 손으로 쓰지 말고
**생성기에 출력 분기를 추가한 뒤 다시 생성**합니다.

1. 그 CLI 가 무엇을 어디서 읽는지 확인한다 — 지침 파일명, 역할/서브에이전트 디렉토리,
   슬래시 커맨드 형식, 권한 설정 위치, 프로젝트 단위인지 전역인지.
2. `scripts/setup-harness.sh` 에 그 형식의 출력 분기를 추가한다. 입력은
   `.agents/manifest.json` 의 `name` / `description` / `needsShell` / `mcpTools` 이고,
   `needsShell` 같은 벤더 중립 개념을 그 CLI 의 표현(도구 목록·권한 등)으로 번역하는 것이
   생성기의 일입니다. **CLI 를 추가한다고 manifest 나 역할 문서를 고치지 않습니다.**
3. 새 생성 경로를 `.gitignore` 에 추가한다.
4. 저장소 밖(홈 디렉토리)에 파일을 만들어야 하는 CLI 는 기본 `make harness` 에 넣지 않고
   별도 타깃으로 분리한다 — `make harness-codex` 가 그 예다.
5. `HARNESS.md` 의 CLI 대응표와 `WORKFLOW.md` 를 **같은 커밋에서** 갱신한다.

## 기능 개발 요청 — "순서대로 진행해줘"

사람이 **"xxx 기능을 개발할 거야. 순서대로 진행해줘"** 라고 하면, 그 기능 하나를
**파이프라인 전체로 끝까지 진행하라**는 뜻입니다. (Claude Code 의 `/feature xxx` 와 같은 요청입니다.)
AI 에이전트를 처음 쓰는 사람은 이 한 문장만 줍니다 — 아래 단계를 알아서 순서대로 밟으세요.

| # | 단계 | 역할 | 산출물 |
|---|---|---|---|
| 1 | 요구 정리 (PRD) | product-manager | `docs/features/<기능>/PRD.md`, `status.md` |
| 2 | UI/UX 명세 | ux-designer | `docs/features/<기능>/design.md` |
| 3 | **UI/UX 시각화 (필수)** | ux-designer | `docs/design/planbee.pen` |
| 4 | API 계약 확정 | tech-lead | `docs/features/<기능>/contract.yaml` |
| 5 | 백엔드 | server-developer → server-reviewer → server-tester | `server/src/` + 서버 테스트 |
| 6 | 프론트(모바일) | mobile-developer → mobile-reviewer → mobile-tester | `mobile/src/` + 모바일 테스트 |
| 7 | 통합 테스트 | integration-tester | `e2e/flows/` |

- **4번(계약)이 끝나야 5·6을 시작합니다.** 5와 6은 서로 독립이라 동시에 진행합니다.
- 각 단계가 끝나면 `status.md` 를 갱신합니다. 중간에 끊겼다 다시 요청받으면
  `status.md` 를 읽고 **미완료 단계부터 이어서** 합니다.
- 단계를 건너뛰지 않습니다. "간단한 기능이니 PRD 는 생략" 같은 판단을 스스로 하지 않습니다.
- 리뷰어/테스터가 `FAIL` 이면 `defects.md` 를 근거로 재작업합니다. 상한은 2회이고,
  3회차에 접어들면 `ESCALATE` 를 적고 사람에게 넘깁니다 (절대 규칙 4).
- 끝나면 `make verify` 결과와 남은 항목을 요약해 보고합니다.

### 1·2단계는 소크라테스식으로 묻는다

**PRD(1단계)와 UI/UX 명세(2단계)에서는 모호한 부분을 스스로 판단해 메우지 않습니다.**
처음 요구는 한 문장으로 오고 빠진 것이 많습니다. 그 빈칸을 에이전트가 추측으로 채우면
그 추측이 계약·구현·테스트까지 그대로 굳어져, 다 만든 뒤에야 어긋난 것이 드러납니다.

- 모르는 것은 **묻고, 답을 받은 뒤에** 문서에 적습니다. 추측한 값을 확정처럼 쓰지 않습니다.
- **닫힌 질문**으로 묻습니다 — "어떻게 할까요?" 가 아니라
  "A / B / C 중 어느 쪽인가요? (권장: B — 이유)" 처럼 선택지와 권장안을 함께 냅니다.
  처음 쓰는 사람이 곧바로 고를 수 있어야 합니다.
- 한 번에 **3~5개씩 묶어서** 묻습니다. 한 문항씩 왕복하며 시간을 끌지 않습니다.
- 사람이 "알아서 해줘" 라고 하면 그때는 정하되, **무엇을 어떻게 가정했는지**
  PRD 의 `제약` / `열린 질문` 에 남깁니다. 조용히 정하지 않습니다.
- 물어야 할 것: 대상 사용자와 성공 기준, 범위 밖(Out of scope), 입력 검증 규칙과 실제 문구,
  빈 상태·오류 상황의 처리, 권한, 기존 화면과의 관계, 데이터 보존·타임존 같은 제약.
- 4단계 이후(계약·구현·테스트)에서 모호함이 드러나면 임의로 해석하지 말고
  1·2단계 문서를 고친 뒤 다시 내려옵니다.

### UI/UX 는 md 를 쓴 뒤 **반드시** pen 으로 시각화한다

`design.md` 작성으로 UI/UX 단계를 끝내지 않습니다. **md 확정 → `docs/design/planbee.pen`
시각화까지가 한 단계**이며, pen 이 없으면 그 단계는 미완료입니다. 순서는 바꾸지 않습니다
(md 없이 pen 부터 그리지 않음). 색·타이포·간격·컴포넌트는 `Screen 01 — Design System`
프레임의 토큰과 컴포넌트를 먼저 확인해 재사용합니다.

pencil MCP 는 에디터에 `.pen` 파일이 열려 있어야 동작합니다. 열려 있지 않아 실패하면
사람에게 `code docs/design/planbee.pen` 으로 열어 달라고 요청하고 기다리세요 —
pen 단계를 건너뛰고 계약·구현으로 넘어가지 않습니다.

## 디렉토리 소유권 — 위반 금지

| 경로 | 쓰기 권한 |
|---|---|
| `mobile/` | mobile-developer, mobile-tester(`mobile/__tests__`만) |
| `server/` | server-developer, server-tester(`server/src/test`만) |
| `e2e/` | integration-tester |
| `docs/api/` | tech-lead |
| `docs/product/`, `docs/features/*/PRD.md` | product-manager |
| `docs/design/`, `docs/features/*/design.md` | ux-designer |
| `docs/review/`, `docs/features/*/review/` | mobile-reviewer, server-reviewer |
| `docs/conventions/` | 모든 역할 (규칙 확정 시 추가) |

자기 소유가 아닌 경로는 **읽기만** 합니다. 다른 역할의 코드를 고쳐야 한다면 결함 리포트로 남기세요.

## 핸드오프 규약

에이전트끼리 직접 대화하지 않습니다. 모든 전달은 파일로 이뤄집니다.

```
docs/features/<feature>/   # <feature> = 기능 이름 (kebab-case). 로그인 기능이면 docs/features/login/
├── PRD.md          # product-manager
├── design.md       # ux-designer 1단계 — UI/UX 명세 (화면의 동작·구성, 마크다운)
├── contract.yaml   # tech-lead (OpenAPI, 구현보다 먼저 확정)
├── status.md       # 파이프라인 상태 — 작업 시작 전 반드시 읽고, 끝나면 갱신
├── review/         # *-reviewer
└── defects.md      # *-reviewer, *-tester 가 append

docs/design/planbee.pen   # ux-designer 2단계 — design.md 를 시각화한 디자인 파일 (시각적 원본)
```

**기능별 폴더가 그 기능의 단일 작업 공간입니다.** product-manager 가 PRD 를 쓸 때
기능 이름으로 폴더를 먼저 만들고(예: 로그인 → `docs/features/login/`),
그 기능의 산출물(PRD·UI/UX 명세·계약·상태·리뷰·결함)은 전부 그 폴더 안에 둡니다.
UI/UX 명세 문서는 `design.md` **하나**입니다 — 같은 역할의 문서를 더 쪼개지 않습니다.

ux-designer 는 **`design.md` 명세를 먼저 완료한 뒤** 그 내용을 `planbee.pen` 으로 시각화합니다.
md 없이 pen 부터 그리지 않습니다.
**pen 시각화까지 끝나야 UI/UX 단계가 완료입니다** — md 만 쓰고 다음 단계로 넘기지 않습니다.

디자인을 구성할 때 기본으로 참고하는 파일은 **`docs/design/planbee.pen`** 입니다.
색·타이포·간격·컴포넌트의 시각적 원본이며, `Screen 01 — Design System` 프레임에 정의된
토큰과 컴포넌트를 먼저 확인해 재사용합니다. 거기 없는 값을 즉석에서 만들지 않습니다.
브랜드·디자인 시스템의 서술적 기준은 `docs/design/planbee-design-prompt.md` 에 있습니다.
`.pen` 은 암호화 파일이라 `Read`/`Grep` 으로 열리지 않습니다 — pencil MCP 도구로만 다룹니다.

작업을 시작하기 전에 `status.md`를 읽고, 끝낸 뒤 해당 체크박스를 갱신하세요.

## 파이프라인

```
product-manager → ux-designer → tech-lead(계약 확정)
                                    ├──────────────┬─────────────┐
                          server-developer   mobile-developer    │
                                 ↓                 ↓             │
                          server-reviewer   mobile-reviewer   (코드 규칙)
                                 ↓                 ↓             │
                          server-tester     mobile-tester    (동작 검증)
                                 └─────────────────┴─────────────┘
                                                ↓
                                       integration-tester
```

역할 정의는 `.agents/roles/<role>.md`에 있습니다. 이 파일들이 실제 자산이고,
`.claude/agents/`, `.gemini/commands/` 는 `.agents/manifest.json` 을 바탕으로 생성된
얇은 어댑터이며 git 에 올라가지 않습니다. 역할 내용을 고칠 때는 `.agents/roles/` 를 고치고
`make harness` 로 다시 생성합니다.

## 절대 규칙

1. **계약이 먼저다.** `contract.yaml`이 확정되기 전에는 서버/모바일 구현을 시작하지 않습니다.
   구현이 계약과 어긋나면 계약이 아니라 구현을 고칩니다. 계약 변경은 tech-lead만 합니다.
   `make contract-check` 가 이를 기계로 검사합니다 — 계약을 어기거나
   계약에 없는 엔드포인트를 노출하면 실패합니다.
2. **리뷰어는 `docs/conventions/`에 적힌 것만 지적한다.** 문서에 없는 규칙을 즉석에서 만들지 않습니다.
   새 규칙이 필요하다고 판단되면 지적 대신 `docs/conventions/`에 제안으로 추가하세요.
3. **린터가 잡는 것은 리뷰어가 언급하지 않는다.** (`LINT` 등급 규칙)
4. **재작업 루프는 2회까지.** 개발자 ↔ 리뷰어/테스터 왕복이 3회차에 접어들면
   중단하고 `status.md`에 `ESCALATE` 를 적은 뒤 사람에게 넘깁니다.
5. **테스트 계층을 침범하지 않는다.**
   - `mobile-tester`: API는 msw로 목킹. 서버를 띄우지 않는다.
   - `server-tester`: 실제 DB(Testcontainers). 외부 연동은 목킹.
   - `integration-tester`: 아무것도 목킹하지 않음. 해피패스와 계약 위반만. 엣지케이스는 위 두 층 담당.
6. **완료 판정은 모델이 아니라 `make` 타깃이 한다.** "통과했다"고 쓰기 전에 실제로 실행하세요.
7. **시크릿을 읽거나 만들지 않는다.** `.env`는 열지 말고 `.env.example`만 참조합니다.
   설정 파일(`application.properties`, `docker-compose.yml`)에 값을 직접 쓰지 않고 `${VAR}` 로만 참조합니다.
   새 환경 변수가 필요하면 `.env.example` 에 정의를 추가하세요. (`docs/conventions/common.md` C-4)
8. **배포에 관한 판단은 사람에게 묻는다.** 이 앱은 **iOS 배포가 최우선**입니다.
   번들 ID·팀·서명 방식, 최소 iOS 버전 상향, 새 권한(위치·알림·사진 등) 추가와 그 사용 목적 문자열,
   심사에 영향을 주는 서드파티 SDK 도입, 앱 이름·아이콘·스크린샷, 데이터 수집 항목 신고 —
   이런 결정은 에이전트가 임의로 하지 않습니다. 작업을 멈추고 `status.md` 에 `ASK` 와 질문을 적은 뒤
   사람에게 넘깁니다. 구현 자체는 안드로이드에서도 성립하도록 만듭니다
   (`docs/conventions/mobile.md` M-19·M-20).
9. **모호하면 묻는다 — 특히 PRD·UI/UX 단계에서.** 요구가 불명확한 부분을 추측으로 확정하지 않습니다.
   선택지와 권장안을 붙인 닫힌 질문으로 사람에게 묻고, 답을 받은 뒤 문서에 적습니다.
   사람이 판단을 위임하면 정하되 가정한 내용을 문서에 남깁니다.
   (위 "기능 개발 요청 — 순서대로 진행해줘" 참조)

## 코딩 규칙

- `docs/conventions/common.md` — 공통 (에러 응답, 커밋, API 필드 명명, 데이터 조합 위치)
- `docs/conventions/mobile.md`
- `docs/conventions/server.md`

API 경계의 두 축은 계약과 함께 확정합니다:
**필드 이름은 `snake_case`**(C-7 / S-21 / M-17), **데이터 조합은 백엔드**(C-8 / S-22 / M-18).

규칙은 파일을 만들면서 하나씩 추가합니다. 구현 중 결정이 나면 **같은 커밋에서** 규칙을 추가하세요.
각 규칙에는 등급을 붙입니다: `[LINT]` 기계 강제 / `[MUST]` 리뷰어 차단 / `[SHOULD]` 제안만.

## 문서 언어

모든 산출 문서와 커밋 메시지는 한국어로 작성합니다. 코드 식별자는 영어입니다.
