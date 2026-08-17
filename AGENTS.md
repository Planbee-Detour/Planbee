# Planbee — 에이전트 공용 지침

이 파일은 Claude Code / Codex CLI / Gemini CLI 가 공통으로 읽는 **단일 원본**입니다.
**git 에 올라가는 지침 파일은 이 파일 하나뿐입니다.**
`CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/` 는 `make harness` 가 로컬에 만드는 생성물이며
모두 `.gitignore` 대상입니다. 그 파일들을 직접 편집하지 마세요 — 다음 생성 때 덮어써집니다.

## 프로젝트

- **Mobile**: React Native 0.86 / React 19.2 / TypeScript, iOS 우선 (`mobile/`)
  - 내비게이션 React Navigation 7, 서버 상태 react-query 5, 클라 상태 zustand,
    폼 react-hook-form + zod, 스타일 NativeWind 4, 저장 MMKV/Keychain, 테스트 RNTL + msw
- **Server**: Java 21 / Spring Boot 3.5.16 / Gradle (`server/`), JPA + Flyway + springdoc
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
docs/features/<feature>/
├── PRD.md          # product-manager
├── design.md       # ux-designer
├── contract.yaml   # tech-lead (OpenAPI, 구현보다 먼저 확정)
├── status.md       # 파이프라인 상태 — 작업 시작 전 반드시 읽고, 끝나면 갱신
├── review/         # *-reviewer
└── defects.md      # *-reviewer, *-tester 가 append
```

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

## 코딩 규칙

- `docs/conventions/common.md` — 공통 (에러 응답, 커밋, 네이밍)
- `docs/conventions/mobile.md`
- `docs/conventions/server.md`

규칙은 파일을 만들면서 하나씩 추가합니다. 구현 중 결정이 나면 **같은 커밋에서** 규칙을 추가하세요.
각 규칙에는 등급을 붙입니다: `[LINT]` 기계 강제 / `[MUST]` 리뷰어 차단 / `[SHOULD]` 제안만.

## 문서 언어

모든 산출 문서와 커밋 메시지는 한국어로 작성합니다. 코드 식별자는 영어입니다.
