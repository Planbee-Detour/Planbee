# 공통 코딩 규칙

## 이 문서의 사용법

- 리뷰어는 **여기 적힌 것만** 지적한다. 없는 규칙은 지적 대신 이 문서에 제안으로 추가한다.
- 규칙에는 등급을 붙인다.

| 등급 | 강제 주체 | 리뷰어 행동 |
|---|---|---|
| `[LINT]` | ESLint / ArchUnit / Spotless | **언급 금지** (기계가 이미 막음) |
| `[MUST]` | 리뷰어 | FAIL 처리 |
| `[SHOULD]` | 리뷰어 | 제안만, 차단하지 않음 |

- 새 규칙을 추가할 때는 근거와 날짜를 함께 적는다. 규칙은 구현하면서 하나씩 늘린다.
- 새 규칙이 린터로 강제 가능한지 먼저 검토한다. 가능하면 `[LINT]` 로 내리고 리뷰어 부담을 줄인다.

---

## C-1. API 에러 응답 스키마 `[MUST]`

**RFC 9457 Problem Details** 를 사용한다. `Content-Type: application/problem+json`. (2026-08 확정)

표준 필드에 두 가지 확장을 더한다.

| 필드 | 필수 | 설명 |
|---|---|---|
| `type` | ✓ | 기본값 `about:blank` |
| `title` | ✓ | HTTP 상태 문구 (영문). **사용자에게 보여주지 않는다** |
| `status` | ✓ | HTTP 상태 코드 |
| `detail` | ✓ | **사용자에게 보여줄 한국어 문구** |
| `instance` | | 요청 경로 |
| `code` | ✓ | **확장. 모바일이 분기하는 기계용 식별자.** 모든 오류 응답에 항상 존재한다 |
| `errors` | | **확장. 검증 실패 시에만.** `[{ field, code, message }]` |

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

```json
{
  "type": "about:blank", "title": "Bad Request", "status": 400,
  "detail": "입력값을 확인해 주세요.",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "title", "code": "NOT_BLANK", "message": "제목을 입력하세요." }
  ]
}
```

**규칙**

- 모바일은 `title` 이나 `detail` 문자열이 아니라 **`code` 로 분기한다.** 문구는 바뀔 수 있고 코드는 계약이다.
- `code` 명명: `UPPER_SNAKE_CASE`. 도메인 고유 코드에는 도메인 접두어를 붙인다 (`SCHEDULE_NOT_FOUND`).
  공통 코드는 접두어 없이 쓴다 (`VALIDATION_FAILED`, `UNAUTHORIZED`).
- **새 코드를 추가하면 `docs/api/error-codes.md` 에 반드시 등록한다.** 카탈로그에 없는 코드는 계약 위반이다.
- `detail` 에 스택트레이스·SQL·내부 식별자를 담지 않는다.
- 사용하는 HTTP 상태는 `400 / 401 / 403 / 404 / 405 / 409 / 500` 로 제한한다. 그 외가 필요하면 tech-lead 와 합의한다.
- 401/403 은 필터 체인에서 발생해 `@RestControllerAdvice` 를 타지 않는다. 형식 유지 책임은
  `common.security.SecurityProblemResponder` 에 있다. (server.md S-7)

구현: `server/src/main/java/com/planbee/api/common/error/`

## C-2. 날짜·시각 `[MUST]`

- API 상의 모든 시각은 **ISO 8601 UTC 문자열**로 주고받는다.
- 타임존 변환은 표시 직전에만 한다. 서버는 UTC로만 저장·연산한다.
- 근거: 일정 기능에서 타임존은 반복 결함 원인. (2026-08)

## C-3. 커밋 메시지 `[SHOULD]`

- 형식: `<type>: <한국어 요약>` (type: feat, fix, refactor, test, docs, chore)
- 구현 중 새 규칙을 정했다면 **같은 커밋에서** conventions 문서를 갱신한다.

## C-4. 환경 변수와 시크릿 `[MUST]`

**원칙: git 에는 변수의 *정의*만 두고, 실제 값은 커밋하지 않는다.**

| 파일 | git | 내용 |
|---|---|---|
| `.env.example` | 커밋함 | 변수 정의 + **로컬에서 그대로 동작하는** 값 |
| `.env` | 커밋 안 함 | 실제 값. `make env` 로 생성 |
| `mobile/.env.example` | 커밋함 | 모바일 변수 정의 (react-native-config 가 `mobile/` 의 `.env` 만 인식) |
| `mobile/.env` | 커밋 안 함 | 실제 값 |

### 규칙

- **설정 파일에 값을 직접 쓰지 않는다.** `application.properties`, `docker-compose.yml` 은
  `${VAR}` 참조만 한다. 기본값(fallback)도 두지 않는다.
- **기본값을 두지 않는 이유**: 값이 없으면 즉시 실패해야 한다. 기본값이 있으면
  운영에서 개발용 키로 조용히 뜨는 사고가 난다. 실패는 세 지점에서 걸린다.
  - `make` — `.env` 없으면 중단
  - `docker compose` — `${VAR:?메시지}` 로 중단
  - Spring — `RequiredEnvironmentCheck` 가 누락된 변수 이름을 알려주고 중단
- **테스트는 `.env` 에 의존하지 않는다.** 테스트 전용 값은 `server/build.gradle` 의
  `tasks.withType(Test)` 에서 주입한다. 그 값은 다른 곳에서 재사용하지 않는다.
- 새 변수를 추가하면 **같은 커밋에서** `.env.example` 과 `RequiredEnvironmentCheck.REQUIRED`(필수인 경우)에 등록한다.
- 코드·문서·테스트·커밋 메시지에 실제 키, 토큰, 비밀번호를 넣지 않는다.
- `.env.example` 의 값은 로컬 전용이다. 운영/스테이징 값은 어떤 경우에도 여기 적지 않는다.

### 시크릿으로 취급하는 것

| 변수 | 비고 |
|---|---|
| `JWT_SECRET` | 유출 시 임의 토큰 위조 가능. 운영에서는 `openssl rand -base64 48` 로 새로 생성 |
| `DB_PASSWORD` | |
| `DB_USERNAME`, `DB_URL` | 시크릿은 아니지만 환경마다 다르므로 같이 관리 |

`mobile/android/app/build.gradle` 의 디버그 키스토어 비밀번호(`android`)는 React Native 기본값이며
공개된 값이다. 릴리스 서명 키를 추가할 때는 반드시 이 정책을 따른다.

## C-5. 계약이 명세다 `[MUST]`

- 구현이 `docs/api/openapi.yaml` 과 다르면 **구현을 고친다.**
- 계약 변경은 tech-lead 만 한다. 다른 역할은 `defects.md` 로 요청한다.

## C-6. 디자인 산출 순서 `[MUST]`

- 디자인은 **명세(md) → 시각화(pen)** 순으로 낸다.
  `docs/features/<feature>/design.md` 로 화면의 동작·구성을 먼저 확정하고,
  그 뒤에 `docs/design/planbee.pen` 으로 시각화한다. md 없이 pen 부터 그리지 않는다.
- pen 에만 있고 md 에는 없는 화면·문구는 규칙 위반이다. 시각화 중 명세 결함을 찾으면
  `design.md` 를 먼저 고친다.
- 근거: 구현자와 계약이 참조하는 원본은 md 다. pen 이 앞서면 확정되지 않은 화면이 구현에 흘러든다. (2026-08)

## C-7. API 필드 이름은 `snake_case` `[MUST]` → 검사 추가 후 `[LINT]`

**모바일과 서버가 주고받는 모든 이름은 `snake_case` 다.** (2026-08 확정)

| 대상 | 규칙 | 예 |
|---|---|---|
| 요청 본문 JSON 프로퍼티 | `snake_case` | `refresh_token` |
| 응답 본문 JSON 프로퍼티 | `snake_case` | `created_at`, `total_count` |
| 쿼리 파라미터 | `snake_case` | `?page_size=20&start_at=...` |
| 경로 변수 | `snake_case` | `/schedules/{schedule_id}` |

**판정 기준은 계약이다.** `docs/api/openapi.yaml` 과 `docs/features/<feature>/contract.yaml` 에 적힌
스키마 프로퍼티·파라미터 이름이 `^[a-z][a-z0-9]*(_[a-z0-9]+)*$` 를 만족하면 통과, 아니면 위반이다.
계약이 이 규칙을 어기고 있으면 **구현이 아니라 계약을 고친다** (tech-lead). C-5 와 같은 방향이다.

**경계 안쪽의 식별자는 각 언어의 관례를 유지한다.**

- 서버 Java: 필드·메서드·변수는 `camelCase`. 직렬화되는 지점에서만 `snake_case` 로 바꾼다. (server.md S-21)
- 모바일 TypeScript: **API 경계 타입은 `snake_case` 를 그대로 쓴다.** camelCase 로 되돌리는
  변환 레이어를 만들지 않는다. (mobile.md M-17)
- DB 컬럼명은 이 규칙의 대상이 아니다. (PostgreSQL 관례상 이미 `snake_case` 다)

**예외**

- RFC 9457 표준 필드(`type`, `title`, `status`, `detail`, `instance`)는 스펙이 정한 이름을 따른다. (C-1)
- 표준·외부 명세가 이름을 고정하는 헤더·파라미터(`Authorization`, OAuth2 의 `grant_type` 등)는 그 명세를 따른다.

**등급 근거**: 기계로 검사 가능한 형태(정규식 대조)지만 현재 `make contract-check` 는
계약과 구현의 **차이**만 본다 — 양쪽이 똑같이 `createdAt` 이면 통과한다. 규칙 자체를 검사하려면
`scripts/contract-check.sh` 의 계약 파싱 단계에서 `components.schemas.*.properties` 키와
`paths.*.*.parameters[].name` 을 위 정규식으로 대조하는 검사를 추가해야 한다. 그 검사가 들어가면
`[LINT]` 로 내린다. 그전까지는 tech-lead 가 계약 리뷰에서, 각 리뷰어가 구현 리뷰에서 `[MUST]` 로 막는다.

**근거**: 경계 표기가 한쪽으로 고정되지 않으면 `createdAt` / `created_at` 이 같은 값에 섞여
모바일에 매핑 레이어가 생기고, 그 레이어가 계약에서 생성한 타입(M-8)과 어긋난다.
어느 쪽으로 통일하든 비용은 같으므로 한쪽으로 못 박는다. (2026-08)

## C-8. 데이터 조합은 백엔드가 한다 `[MUST]`

**화면이 필요로 하는 데이터는 서버가 한 번의 응답으로 완성해서 내려준다.** (2026-08 확정)

**금지**

- 모바일이 여러 엔드포인트를 호출해 결과를 합쳐 한 화면을 만드는 것.
  화면에 필요한 필드가 여러 리소스에 흩어져 있다면, 그 화면을 위한 응답을 계약에 추가한다.
- 모바일이 응답 필드로 표시값을 **계산**하는 것. 거리, 소요시간, D-day, 진행률, 남은 개수,
  상태 문구(`"3일 남음"`, `"진행 중"`) 같은 파생값은 **서버가 계산해서 응답에 포함한다.**
- 모바일이 두 응답을 id 로 이어붙이는(join) 것. 조인은 DB 가 한다.

**허용**

- 순수 표현 포맷팅: 로케일 날짜/시각 표기(C-2 의 UTC → 로컬 변환), 숫자 천단위 구분, 문자열 자르기.
- 서버 상태와 무관한 클라이언트 상태와의 결합: 선택 여부, 펼침 상태, 필터 UI. (mobile.md M-4)
- 무한 스크롤 페이지 이어붙이기 등 react-query 가 제공하는 페이지네이션 조합.

**판정**: 한 화면의 한 영역을 그리는 데 서버 호출이 2번 이상 필요하면 설계 결함으로 본다.
모바일 리뷰어는 이를 발견하면 모바일 코드를 지적하는 대신 `defects.md` 로 계약 변경을 요청한다.

**등급 근거**: 호출 횟수와 계산 위치는 정적 검사로 판정할 수 없다. 화면 단위 설계 판단이므로
리뷰어가 막는 `[MUST]` 로 둔다.

**근거**: 조합을 프론트에 두면 (1) 같은 규칙이 iOS/Android/서버에 중복 구현되고,
(2) 규칙이 바뀔 때 앱 배포를 기다려야 하며, (3) 네트워크 왕복이 늘어 화면 로딩 상태(M-6)가
호출 수만큼 복잡해진다. 서버는 한 트랜잭션에서 조합할 수 있다. (2026-08)

## C-9. 디자인 기준 파일은 `docs/design/planbee.pen` `[MUST]`

- 디자인을 구성하거나 모바일 UI 를 구현할 때 기본으로 참고하는 파일은 **`docs/design/planbee.pen`** 이다.
  색상·타이포그래피·간격·컴포넌트의 **시각적 원본(source of truth)** 이다.
- 화면을 새로 디자인하기 전에 `Screen 01 — Design System` 프레임에 정의된 토큰과 컴포넌트를
  먼저 확인하고, **거기 있는 것을 재사용한다. 없는 값을 새로 만들지 않는다.**
  신규가 꼭 필요하면 Design System 프레임에 먼저 추가하고 쓴다 (추가는 ux-designer 만).
- 브랜드·디자인 시스템의 **서술적** 기준은 `docs/design/planbee-design-prompt.md` 에 있다.
  값의 판정은 pen, 원칙·톤의 판정은 이 md 다.
- `.pen` 은 암호화 파일이라 `Read`/`Grep` 같은 일반 파일 도구로 열 수 없다.
  **pencil MCP 도구로만 읽고 쓴다.** 일반 도구로 열면 파일이 깨진다.
- 코드 쪽 토큰 정의(`tailwind.config.js`, mobile.md M-16)는 pen 의 값을 코드로 옮긴 것이다.
  둘이 어긋나면 pen 을 기준으로 코드를 고친다.
- 근거: 시각 값이 pen·md·코드 세 곳에 흩어지면 화면마다 색과 간격이 조금씩 달라진다.
  값의 원본을 pen 하나로 고정하고 나머지는 그 사본으로 둔다. (2026-08)
