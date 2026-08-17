# Planbee 개발 워크플로우

개발자가 **어떤 순서로, 어떤 명령으로** 하네스를 쓰는지 정리한 문서입니다.
구조와 설계 근거는 [HARNESS.md](HARNESS.md), 미완료 항목은 [TODO.md](TODO.md)를 보세요.

---

## 0. 최초 셋업 (한 번만)

```bash
# 1. 사전 준비 확인
node -v          # 22.x
java -version    # 21 이상
docker info      # 데몬 실행 중이어야 함
xcodebuild -version

# 2. 환경 변수 파일 생성
make env
#   .env.example      → .env
#   mobile/.env.example → mobile/.env
#   ※ 기존 파일은 덮어쓰지 않습니다

# 3. 의존성 설치 (npm + CocoaPods, 수 분 소요)
#    내부에서 make harness 도 실행됩니다 —
#    CLAUDE.md / .claude/ / .gemini/ 는 git 에 없고 여기서 로컬에 생성됩니다
make install

# 4. 동작 확인
make db-up
make verify
```

`make verify`가 통과하면 준비 완료입니다.

### Maestro (E2E 테스트용, 선택)

```bash
curl -Ls https://get.maestro.mobile.dev | bash
```

---

## 1. 매일 쓰는 명령어

```bash
make help              # 전체 타깃 목록

# 개발 중
make db-up             # 로컬 PostgreSQL 기동 (재부팅 후 매번)
npm run server:start   # API 서버 (http://localhost:8080)
npm run mobile:start   # Metro
npm run mobile:ios     # 시뮬레이터 실행

# 커밋 전
make verify            # 모든 게이트 (이게 통과해야 끝)
```

### 게이트를 나눠서 돌리기

```bash
make verify-mobile     # lint + typecheck + test
make verify-server     # lint + test + test-server-db
make contract-check    # 계약 준수

make lint-mobile       # ESLint만
make typecheck-mobile  # tsc만 (ESLint는 타입을 안 봅니다)
make test-mobile       # Jest만
make format-server     # Java 자동 정리
```

---

## 2. 기능 하나를 만드는 전체 흐름

### 파이프라인

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

**계약(tech-lead)이 끝나야 서버·모바일 두 갈래를 시작합니다.** 그 뒤로는 병렬입니다.

### 방법 A — Claude Code에서 한 번에

```
/feature 일정 생성 기능
```

`docs/features/<슬러그>/status.md`를 읽고 미완료 단계부터 이어서 진행합니다.
이미 진행 중인 기능이면 중단된 지점부터 재개됩니다.

### 방법 B — 역할을 하나씩 (CLI 무관)

```bash
./scripts/agent.sh product-manager "일정 생성 기능. 사용자가 제목/날짜로 일정을 만들 수 있어야 함"
./scripts/agent.sh ux-designer     "schedule-create 기능 화면 설계"
./scripts/agent.sh tech-lead       "schedule-create API 계약 확정"

# 계약이 나온 뒤 — 두 터미널에서 동시에 실행 가능
./scripts/agent.sh server-developer "schedule-create 구현"
./scripts/agent.sh mobile-developer "schedule-create 구현"

./scripts/agent.sh server-reviewer  "schedule-create 서버 리뷰"
./scripts/agent.sh mobile-reviewer  "schedule-create 모바일 리뷰"
./scripts/agent.sh server-tester    "schedule-create 서버 테스트"
./scripts/agent.sh mobile-tester    "schedule-create 모바일 테스트"

./scripts/agent.sh integration-tester "schedule-create 연동 확인"
```

### 다른 CLI로 실행

```bash
AGENT_CLI=codex  ./scripts/agent.sh server-reviewer "schedule-create 서버 리뷰"
AGENT_CLI=gemini ./scripts/agent.sh mobile-tester   "schedule-create 모바일 테스트"
```

역할 정의는 하나(`.agents/roles/`)이므로 어떤 CLI로 돌려도 같은 기준으로 동작합니다.

### 진행 상황 확인

```bash
cat docs/features/schedule-create/status.md    # 파이프라인 체크리스트
cat docs/features/schedule-create/defects.md   # 열린 결함
```

---

## 3. 각 단계에서 나오는 것

| 단계 | 산출물 | 확인할 것 |
|---|---|---|
| product-manager | `PRD.md` | 모든 AC가 "무엇을 관측하면 통과인가"를 명시하는가 |
| ux-designer | `design.md` | 화면마다 로딩/정상/비어있음/오류 4가지가 다 있는가 |
| tech-lead | `contract.yaml`, `docs/api/openapi.yaml` | 성공·실패 응답이 모두 있는가, nullable이 명시됐는가 |
| server-developer | `server/src/main/` | `make verify-server` |
| mobile-developer | `mobile/src/` | `make verify-mobile` |
| *-reviewer | `review/*.md` | 지적마다 규칙 번호가 인용됐는가 |
| *-tester | 테스트 코드 | 모든 AC가 통과/실패/해당없음으로 판정됐는가 |
| integration-tester | `e2e/flows/*.yaml` | 결함마다 원인(서버/모바일/계약)이 표시됐는가 |

---

## 4. 결함이 나왔을 때

리뷰어나 테스터가 `FAIL`을 내면 `defects.md`에 결함이 쌓입니다.

```bash
# 결함을 근거로 재작업
./scripts/agent.sh server-developer "defects.md 의 DEF-003 수정"

# 같은 단계를 다시 실행
./scripts/agent.sh server-reviewer "schedule-create 서버 재리뷰"
```

**재작업은 대상별 2회까지입니다.** 3회차에 접어들면 `status.md`에 `ESCALATE`를 적고 멈춘 뒤,
사람이 판단합니다. 무한 핑퐁을 막기 위한 장치입니다.

리뷰어·테스터는 구현 코드를 고치지 않습니다. 고치는 것은 developer 역할뿐입니다.

---

## 5. 통합(E2E) 테스트 실행

```bash
make e2e-up      # PostgreSQL + API 컨테이너 기동, 시드 적용, 헬스 대기
make e2e-app     # 시뮬레이터에 앱 빌드/설치 (앱이 바뀐 경우에만)
make test-e2e    # Maestro 플로우 실행
make e2e-down    # 정리 (볼륨까지 삭제 — 다음 실행의 결정론성 보장)
```

실패하면:

```bash
make logs        # 서버 로그 — 원인이 앱인지 서버인지 판별
```

### 포트가 이미 사용 중일 때

```bash
API_PORT=18080 make e2e-up
```

또는 `.env`에서 `API_PORT` / `DB_PORT`를 바꿉니다.

---

## 6. 계약(API)을 바꿀 때

**계약은 tech-lead만 수정합니다.** 다른 역할은 `defects.md`로 요청합니다.

```bash
# 1. tech-lead가 docs/api/openapi.yaml 수정

# 2. 모바일 타입 재생성
make contract-types

# 3. 서버 구현 후 계약 준수 확인
make contract-check
```

`contract-check`가 실패하는 경우:

| 메시지 | 뜻 | 조치 |
|---|---|---|
| `구현이 계약을 어겼습니다` | 응답에서 필수 필드 제거 등 | **구현을 고칩니다** (계약이 아니라) |
| `계약에 없는 엔드포인트가 구현돼 있습니다` | 문서화되지 않은 API | 계약에 먼저 추가 |

새 엔드포인트를 만들 때 서버가 지켜야 할 것:

```java
@Tag(name = "schedule")
@Operation(operationId = "createSchedule", summary = "일정 생성")
@ApiResponse(responseCode = "201", description = "생성됨")
@PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public ScheduleResponse create(...) { ... }
```

응답은 반드시 `record`로, 필드마다 `@Schema(requiredMode = REQUIRED)`를 붙입니다.
`Map`을 반환하면 스키마가 생성되지 않아 `contract-check`가 무의미해집니다.

---

## 6-1. 역할이나 하네스 파일을 수정할 때

**git 에 올라가는 것은 벤더 중립 원본뿐입니다.**

| 고칠 것 | 위치 | 반영 방법 |
|---|---|---|
| 역할 정의 내용 | `.agents/roles/<역할>.md` | 즉시 반영 (어댑터가 이 파일을 읽음) |
| 역할 설명·툴 권한 | `.agents/manifest.json` | `make harness` |
| 파이프라인 순서 | `.agents/commands/feature.md` | `make harness` |
| Claude 권한 목록 | `scripts/setup-harness.sh` | `make harness` |
| 프로젝트 공통 규칙 | `AGENTS.md` | 즉시 반영 |

**`CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/` 는 직접 고치지 마세요.**
`make harness` 를 다시 실행하면 덮어써집니다. 이 파일들은 git 에 올라가지 않습니다.

```bash
make harness        # 언제든 지우고 다시 만들어도 됩니다
```

Codex CLI 를 쓴다면 슬래시 커맨드는 홈 디렉토리에 만듭니다 (Codex 는 전역 프롬프트만 지원).

```bash
make harness-codex  # ~/.codex/prompts/planbee-<역할>.md
```

지침(`AGENTS.md`)은 Codex 가 직접 읽으므로 별도 작업이 필요 없고,
승인·샌드박스 정책은 `~/.codex/config.toml` 에서 직접 설정해야 합니다.

## 7. 코딩 규칙을 추가할 때

규칙은 코드를 쓰면서 하나씩 늘립니다. **구현 중 결정이 나면 같은 커밋에서** 추가하세요.

```markdown
### M-17. 리스트는 FlatList 를 쓴다 `[MUST]`

- ScrollView + map 조합을 쓰지 않는다.
- 근거: 항목이 늘면 렌더 비용이 선형으로 증가한다. (2026-08, 일정 목록 구현 중 결정)
```

추가 전에 **"이거 린터로 강제 가능한가?"**를 먼저 물으세요.

| 등급 | 언제 | 결과 |
|---|---|---|
| `[LINT]` | ESLint/ArchUnit/Spotless로 막을 수 있을 때 | 리뷰어가 언급하지 않음 |
| `[MUST]` | 기계로 못 잡지만 어기면 안 될 때 | 리뷰어가 FAIL |
| `[SHOULD]` | 권장 사항 | 제안만, 차단 안 함 |

리뷰어는 **`docs/conventions/`에 적힌 것만** 지적합니다. 문서에 없으면 지적 대신 제안으로 추가합니다.

---

## 8. 환경 변수를 추가할 때

```bash
# 1. .env.example 에 정의 + 로컬 동작값 추가
echo "SLACK_WEBHOOK_URL=http://localhost:9999/hook" >> .env.example

# 2. 본인 .env 에도 추가 (커밋되지 않음)
echo "SLACK_WEBHOOK_URL=..." >> .env

# 3. 필수 변수라면 RequiredEnvironmentCheck.REQUIRED 에 등록
#    server/src/main/java/com/planbee/api/common/RequiredEnvironmentCheck.java

# 4. 설정 파일에서는 ${VAR} 로만 참조 — 기본값을 두지 않습니다
#    application.properties:  planbee.slack.webhook=${SLACK_WEBHOOK_URL}
```

**설정 파일에 실제 값을 적지 마세요.** 기본값을 두면 운영에서 개발용 값으로 조용히 뜹니다.

운영 키 생성:

```bash
openssl rand -base64 48
```

---

## 9. 자주 막히는 곳

### `✗ .env 가 없습니다`

```bash
make env
```

### `✗ Docker 데몬이 실행 중이 아닙니다`

Docker Desktop을 켜세요. 다음 타깃들이 Docker를 요구합니다:
`db-up`, `test-server-db`, `contract-export`, `contract-check`, `e2e-up`, `verify`

### `필수 환경 변수가 없습니다: DB_URL, ...`

`.env`에 값이 비어 있습니다. `.env.example`을 참고해 채우세요.

### `ports are not available: ... 8080`

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN    # 누가 쓰는지 확인
API_PORT=18080 make e2e-up          # 다른 포트로
```

### 모바일 테스트에서 `Cannot find module 'msw/node'`

`msw/node`는 React Native에서 export 조건에 막힙니다. **`msw/native`**를 쓰세요.
(`mobile/src/shared/test/mswServer.ts` 참조)

### 모바일 테스트에서 `Cannot use import statement outside a module`

ESM 전용 패키지가 변환 대상에서 빠진 것입니다.
`mobile/jest.config.js`의 `transformIgnorePatterns` 예외 목록에 패키지 이름을 추가하세요.

### 네이티브 모듈 추가 후 테스트가 깨질 때

`mobile/__mocks__/`에 목을 추가하세요 (Keychain, Config가 이미 있습니다).
공식 jest 셋업을 제공하는 패키지라면 `mobile/jest.setup.ts`에서 import 합니다.

### `pod install` 실패

피어 의존성 누락일 가능성이 큽니다. 오류 메시지의 `Unable to find a specification for X`에서
X에 해당하는 npm 패키지를 설치한 뒤 다시 실행하세요.

### 서버 코드 스타일 검사 실패

```bash
make format-server    # 자동 정리
```

---

## 10. 커밋 전 체크리스트

- [ ] `make verify` 통과
- [ ] 새로 정한 규칙을 `docs/conventions/`에 추가했는가
- [ ] 새 에러 코드를 `docs/api/error-codes.md`에 등록했는가
- [ ] 새 환경 변수를 `.env.example`에 추가했는가
- [ ] 엔티티를 바꿨다면 Flyway 마이그레이션을 같은 커밋에 넣었는가
- [ ] `.env`, 키, 토큰이 diff에 없는가
- [ ] `status.md`를 갱신했는가

커밋 메시지 형식: `<type>: <한국어 요약>` (feat, fix, refactor, test, docs, chore)

---

## 11. 명령어 요약표

| 상황 | 명령 |
|---|---|
| 처음 클론했을 때 | `make env && make install` |
| 하네스 로컬 파일 재생성 | `make harness` |
| Codex 슬래시 커맨드 생성 | `make harness-codex` |
| 개발 시작 | `make db-up && npm run server:start` |
| 커밋 전 | `make verify` |
| 기능 만들기 | `/feature <설명>` 또는 `./scripts/agent.sh <역할> "<지시>"` |
| 계약 바꾼 뒤 | `make contract-types && make contract-check` |
| 연동 확인 | `make e2e-up && make e2e-app && make test-e2e` |
| 환경 정리 | `make e2e-down` |
| 뭐가 있는지 모를 때 | `make help` |
