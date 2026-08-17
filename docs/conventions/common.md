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
