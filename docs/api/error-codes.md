# 에러 코드 카탈로그

`common.md` C-1 의 `code` 확장 필드에 들어가는 값의 전체 목록이다.

- **소유자**: tech-lead. 새 코드는 계약(`docs/api/openapi.yaml`)과 함께 여기에 등록한다.
- **여기에 없는 코드를 응답에 쓰면 계약 위반**이다. server-reviewer 는 이를 `[MUST]` 위반으로 처리한다.
- 모바일은 이 표에 있는 코드로만 분기한다. 표에 없는 코드를 받으면 일반 오류 문구로 처리한다.
- **이미 배포된 코드 문자열은 바꾸지 않는다.** 앱이 그 값으로 분기하고 있다.

## 공통 (도메인 접두어 없음)

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | 입력 검증 실패. `errors` 확장 포함 | 필드별 오류 문구 표시 |
| `MALFORMED_REQUEST` | 400 | 요청 본문/파라미터 형식 오류 | 일반 오류 문구 (버그 신호) |
| `UNAUTHORIZED` | 401 | 인증 필요 또는 토큰 무효/만료 | 토큰 갱신 1회 시도 후 실패 시 로그인 화면 |
| `FORBIDDEN` | 403 | 권한 없음 | 일반 오류 문구. 갱신 재시도 금지 |
| `NOT_FOUND` | 404 | 리소스 없음 | 빈 상태 또는 이전 화면 복귀 |
| `METHOD_NOT_ALLOWED` | 405 | 지원하지 않는 메서드 | 일반 오류 문구 (버그 신호) |
| `CONFLICT` | 409 | 중복 생성·동시 수정 충돌 | 재조회 후 안내 |
| `TOO_MANY_REQUESTS` | 429 | 요청 빈도 초과 (도메인 전용 코드가 없는 경우) | 일반 오류 문구 + 재시도 버튼 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 | 일반 오류 문구 + 재시도 버튼 |

`429` 응답에는 `Retry-After` 헤더(초)를 함께 낸다 (`common.md` C-1).
**모바일은 이 헤더로 분기하지 않는다** — 화면에 쓸 값은 본문 필드로 따로 온다.

구현: `com.planbee.api.common.error.CommonErrorCode`

## 검증 실패 세부 코드 (`errors[].code`)

Bean Validation 제약 이름을 `UPPER_SNAKE_CASE` 로 변환한 값이다. 예: `@NotBlank` → `NOT_BLANK`.

| code | 의미 |
|---|---|
| `NOT_BLANK` | 필수 입력 누락 |
| `NOT_NULL` | 필수 값 누락 |
| `SIZE` | 길이 범위 위반 |
| `EMAIL` | 이메일 형식 아님 |
| `PATTERN` | 형식 불일치 |

## 도메인 코드

도메인이 추가되면 여기에 섹션을 만든다. 각 도메인은 자기 패키지에
`ErrorCode` 를 구현한 enum 을 두고, 그 enum 과 이 표를 함께 갱신한다.

### auth

2026-08-26 등록 (tech-lead). 계약은 `docs/features/auth/contract.yaml` / `docs/api/openapi.yaml`.
구현: `com.planbee.api.auth.AuthErrorCode`.

#### 가입

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `AUTH_EMAIL_ALREADY_REGISTERED` | 409 | 이미 가입 신청된 이메일 (AC-2) | 이메일 필드 오류 "이미 가입 신청된 이메일입니다" + 해당 필드로 스크롤·포커스. 입력값은 전부 유지 |
| `AUTH_SIGNUP_RATE_LIMITED` | 429 | 가입 IP 레이트 리밋 초과 (동일 IP 시간당 10회) | 전용 화면 없음 — 일반 오류 문구 + 재시도 버튼 |

#### 로그인

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | 자격 증명 불일치 (AC-12·13·31) | `login.credentials` 배너. **세 상황(틀린 비밀번호 / 미등록 / 삭제된 계정)을 분기하지 않는다** — 하나의 코드 경로로 처리 |
| `AUTH_LOGIN_LOCKED` | 429 | 로그인 시도 초과로 잠김 (AC-17·41·47·48) | `login.locked.*` 잠금 배너. 남은 시간은 `lock_remaining_minutes` 를 **그대로** 렌더한다. 앱이 카운트다운을 계산하지 않는다 |
| `AUTH_ACCOUNT_PENDING` | 403 | 계정이 `PENDING` (AC-14) | 상태 안내 화면 — `account_status` 의 문구를 그대로 렌더 |
| `AUTH_ACCOUNT_REJECTED` | 403 | 계정이 `REJECTED` (AC-15) | 상태 안내 화면 + "계정 삭제" 보조 링크 (AC-50). `deletion_token` 을 메모리에 보관해 삭제 요청에 쓴다 |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | 계정이 `SUSPENDED` (AC-16) | 상태 안내 화면. 삭제 경로 없음 |

**`AUTH_ACCOUNT_*` 세 코드는 서로 구분 가능해야 한다** (아이콘·색·버튼 구성이 다르다).
반면 화면 **문구는 앱이 코드로 만들지 않는다** — `account_status` 에 담겨 온다 (C-8).
카탈로그에 없는 상태 코드가 오면 "계정 상태를 확인해 주세요" 일반 화면으로 처리한다.

#### 세션

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `AUTH_REFRESH_TOKEN_EXPIRED` | 401 | 마지막 사용 후 14일 경과 (AC-25) | 토큰 삭제 → 로그인 화면 + `session.expired` 배너 |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | 알 수 없는 토큰·서명 오류·로그아웃으로 폐기됨 (AC-23) | 토큰 삭제 → 로그인 화면 + `session.expired` 배너 |
| `AUTH_REFRESH_TOKEN_REUSED` | 401 | 유예 창(10초) 밖 재사용 감지, **또는** 유예 창 안이지만 서버가 직전 응답을 기억하지 못함 — **이 요청이 전 기기 폐기의 방아쇠** (AC-23·24) | 토큰 삭제 → 로그인 화면 + `session.revoked` 보안 배너 |
| `AUTH_REFRESH_TOKEN_REVOKED` | 401 | 재사용 감지로 이미 폐기된 계정의 토큰 (다른 기기) (AC-24) | 토큰 삭제 → 로그인 화면 + `session.revoked` 보안 배너 |

네 코드 모두에서 **갱신을 재시도하지 않는다.** 유예 창 안의 재사용은 오류가 아니라
같은 토큰 쌍을 돌려주는 200 이다 (AC-49) — 앱에는 아무것도 보이지 않는다.

**단, 유예 창은 서버가 직전 응답을 기억하는 동안에만 성립한다** (2026-08-27 확정,
`docs/features/auth/defects.md` D-3). 재기동 등으로 직전 응답이 사라지면 유예 창 안이라도
`AUTH_REFRESH_TOKEN_REUSED` 가 나가고 전 기기 폐기가 실행된다 — 닫히는 쪽으로 실패한다.
**이를 위한 신규 코드는 만들지 않았다.** 앱이 두 경우를 구분할 방법이 없고, 구분해도
할 일이 같다(보안 배너 + 재로그인). 모바일 처리는 위 표 그대로다.

#### 계정 삭제

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `AUTH_PASSWORD_MISMATCH` | 401 | 삭제 확인 비밀번호 불일치 (AC-29) | **토큰 갱신을 시도하지 않는다.** 비밀번호 필드 아래 "비밀번호를 확인해 주세요" 표시, 필드를 비우고 포커스 유지 |

> `AUTH_PASSWORD_MISMATCH` 는 401 이지만 세션 문제가 아니다. 401 을 상태 코드로 일괄
> 가로채는 인터셉터가 있으면 이 코드를 **먼저 예외 처리**해야 한다 (C-1: 분기는 `code` 로 한다).
