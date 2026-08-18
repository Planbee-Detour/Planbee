# Planbee

Planbee는 iOS를 우선 지원하는 React Native 앱과 Java Spring Boot API를 한 저장소에서 관리하는 프로젝트입니다.

## 기술 스택

- Mobile: React Native 0.86.0, React 19.2, TypeScript, iOS 우선
  - React Navigation 7, TanStack Query 5, zustand, react-hook-form + zod, NativeWind 4
- API: Java 21, Spring Boot 3.5.16, Gradle, JPA + Flyway + springdoc
- Database: PostgreSQL 17 (로컬은 Docker Compose, 테스트는 Testcontainers)

## 구조

```text
Planbee/
├── mobile/   # React Native 앱
└── server/   # Spring Boot REST API
```

## 사전 준비

- Node.js 22 (`nvm use`)
- JDK 21 이상
- Xcode 16 이상
- CocoaPods
- Docker (로컬 DB, 서버 통합 테스트)

## 시작하기

### 환경 변수 (최초 1회)

```bash
make env      # .env.example → .env, mobile/.env.example → mobile/.env
```

`.env` 는 git 에 커밋되지 않습니다. 정의와 로컬 기본값은 `.env.example` 에 있고,
실제 값은 `.env` 에만 둡니다. 자세한 정책은 [docs/conventions/common.md](docs/conventions/common.md) C-4 참조.

### API 서버

```bash
make db-up          # PostgreSQL 기동 (최초 1회 이후에도 재부팅 시 필요)
npm run server:start
```

- 상태 확인: `http://localhost:8080/api/v1/health`
- API 문서: `http://localhost:8080/swagger-ui.html`

### iOS 앱

첫 실행에만 의존성과 CocoaPods를 설치합니다.

```bash
nvm use
npm run mobile:install
cd mobile
bundle install
cd ios && bundle exec pod install && cd ../..
npm run mobile:ios
```

iOS 시뮬레이터에서는 `localhost:8080`으로 로컬 API에 연결합니다. 실제 iPhone에서는 `mobile/App.tsx`의 `API_BASE_URL`을 Mac의 같은 네트워크 IP로 변경해야 합니다.

## 검사

```bash
make verify        # 모바일 린트/타입/테스트 + 서버 린트/테스트/통합테스트
make help          # 사용 가능한 타깃
```

## 통합(E2E) 테스트

실제 앱과 실제 서버를 붙여 확인합니다. 자세한 내용은 [e2e/README.md](e2e/README.md).

```bash
make e2e-up      # PostgreSQL + API 컨테이너 기동 (시드 포함)
make e2e-app     # 시뮬레이터에 앱 설치
make test-e2e    # Maestro 플로우 실행
make e2e-down    # 정리
```

Maestro 설치: `curl -Ls https://get.maestro.mobile.dev | bash`

## 문서

| 문서 | 내용 |
|---|---|
| [HARNESS.md](HARNESS.md) | 하네스 구성 상세 — 무엇을 왜 그렇게 만들었는지 |
| [WORKFLOW.md](WORKFLOW.md) | 개발 워크플로우 — 어떤 순서와 명령으로 사용하는지 |

## 에이전트 하네스

역할 기반 개발 하네스를 갖추고 있습니다. Claude Code / Codex CLI / Gemini CLI 에서 동일하게 동작합니다.

```bash
./scripts/agent.sh product-manager "일정 생성 기능 PRD 작성"
AGENT_CLI=codex ./scripts/agent.sh server-reviewer "schedule 기능 리뷰"
```

- `AGENTS.md` — 공용 지침. **git 에 올라가는 지침 파일은 이것 하나뿐입니다**
- `make harness` — 각 CLI 가 읽는 로컬 파일 생성 (`CLAUDE.md`, `.claude/`, `.gemini/` — 전부 git 제외)
- `.agents/roles/` — 역할 정의 10종 (실제 자산)
- `docs/conventions/` — 코딩 규칙. 리뷰어는 여기 적힌 것만 지적합니다
- `docs/features/<기능>/` — PRD·디자인·계약·상태·결함이 모이는 핸드오프 디렉토리

Claude Code 에서는 `/feature <기능 설명>` 으로 파이프라인 전체를 실행할 수 있습니다.

## 다음 단계

도메인과 화면 요구사항이 정해지면 내비게이션, 환경별 API 설정, 인증, 상태 관리 및 데이터베이스를 순서대로 추가합니다.
