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

### admin

2026-09-07 등록 (tech-lead). 계약은 `docs/features/admin-user-approval/contract.yaml` /
`docs/api/openapi.yaml`. 구현: `com.planbee.api.admin.AdminErrorCode` (예정).

대상 경로는 `/api/v1/admin/**` 전부다.

#### 권한

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `ADMIN_FORBIDDEN` | 403 | 역할이 `ADMIN` 이 아님 (AC-3) | 목록 화면의 **권한 없음 블록** — "관리자만 볼 수 있어요" + "이 화면을 볼 수 있는 권한이 없어요." + `설정으로 돌아가기`(pop). **"다시 시도" 를 두지 않는다.** 이 상태에 들어가면 `GET /auth/me` 를 다시 조회해 설정 화면의 관리자 섹션 렌더 조건을 갱신한다 (design.md §5.10) |
| `ADMIN_SELF_SUSPEND_FORBIDDEN` | 403 | 관리자가 자기 계정을 정지하려 함 (AC-25) | 시트 안 배너 — "내 계정은 정지할 수 없어요" + "스스로를 정지할 수는 없어요." + `닫기`. 정상 경로에서는 도달하지 않는다(앱이 `is_me` 로 버튼을 렌더하지 않는다). **차단의 주체는 서버다** (design.md §7.6) |

**두 코드는 서로 구분 가능해야 한다** — 앱이 그리는 것이 화면 전체와 시트 안 배너로 다르다.

공통 `FORBIDDEN` 과도 갈라 쓴다. `FORBIDDEN` 은 `scope: account:delete` 토큰이
다른 엔드포인트를 호출한 경우이고(`auth` 계약) 일반 오류 문구로 처리한다.
호출한 엔드포인트가 무엇이었는지로 분기하면 분기 근거가 `code` 밖으로 나간다 (C-1).

> **서버 유의**: 역할 미달 403 은 필터 체인에서 나가 `@RestControllerAdvice` 를 타지 않는다.
> `common.security.SecurityProblemResponder`(S-7)가 `/api/v1/admin/**` 에 한해
> `ADMIN_FORBIDDEN` 을 내도록 갈라야 한다. 아무것도 하지 않으면 공통 `FORBIDDEN` 이 나간다.

#### 상태 전이

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `ADMIN_USER_ALREADY_PROCESSED` | 409 | 다른 기기가 먼저 상태를 바꿈 (AC-12) | **시트를 닫지 않는다.** 시트 안 배너 "이미 처리된 신청이에요" + "다른 기기에서 먼저 처리됐어요. 목록을 새로 고쳤어요." 로 바꾸고 액션 버튼을 제거한 뒤 `닫기` 만 남긴다. 배너가 뜨는 즉시 목록을 다시 불러온다 (design.md §6.8). **토스트로 하지 않는다** — 2초 뒤 사라지면 왜 무효였는지 되짚을 수단이 없어진다 |

상태 전이 다섯 엔드포인트(`approve` · `reject` · `reject/cancel` · `suspend` ·
`suspend/cancel`)가 **같은 코드 하나**를 쓴다. 각 엔드포인트의 전제 상태가 하나씩
정해져 있고, 그것과 다르면 원인이 무엇이든 "다른 기기가 먼저 바꿨다" 이기 때문이다.

#### 이 도메인이 **만들지 않은** 코드

| 상황 | 쓰는 코드 | 이유 |
|---|---|---|
| 미인증 호출 (AC-4) | 공통 `UNAUTHORIZED` | 이 기능에 전용 화면이 없다. `auth` 의 전역 세션 처리가 로그인 화면으로 보낸다 |
| 거절 사유 200자 초과 (AC-16) | 공통 `VALIDATION_FAILED` + `errors[].field = "rejection_reason"` | 일반적인 입력 검증이다. 도메인 코드를 만들 이유가 없다 |
| 대상 사용자 없음 | 공통 `NOT_FOUND` | 처리 중에 계정이 삭제된 경우다. **design.md 에 이 상황의 화면이 없어** 보강 전까지 일반 오류로 둔다 |
| 커서·페이지 크기 오류 | 공통 `MALFORMED_REQUEST` / `VALIDATION_FAILED` | 앱의 버그 신호다. 전용 화면을 두지 않는다 |
| **가입 사유가 비어 있음 (AC-33)** | **없음 — 오류가 아니다** | 정상 응답 200 이다. 서버가 `signup_reason_text` 에 "입력하지 않음" 을 채워 내린다 (C-8). 코드를 만들면 정상 흐름이 오류 경로로 샌다 |

### place

2026-09-08 등록 (tech-lead). 계약은 `docs/features/nearby-places/contract.yaml` ·
`docs/features/place-detail/contract.yaml` / `docs/api/openapi.yaml`.
구현: `com.planbee.api.place.PlaceErrorCode`.

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `PLACE_NOT_FOUND` | 404 | `place_id`(`tour:<contentid>`) 에 해당하는 장소가 없음 | 장소 상세 "찾을 수 없어요" 비어있음 상태 (AC-PD-3) |
| `PLACE_UPSTREAM_UNAVAILABLE` | 500 | 한국관광공사 TourAPI 조회 실패 — 상류 5xx · 타임아웃 · `resultCode` 오류 · 쿼터 초과 | 오류 화면 + "다시 시도" (AC-NP-6 / AC-PD-5) |

`500` 을 쓰는 이유: C-1 이 허용하는 상태 코드에 `502`/`503` 이 없다. 상류 장애도 결국
"서버가 지금 응답을 완성하지 못했다" 이므로 `500` + 전용 `code` 로 구분한다.

#### 이 도메인이 **만들지 않은** 코드

| 상황 | 쓰는 코드 | 이유 |
|---|---|---|
| `place_id` 형식 오류 (`tour:<contentid>` 아님) | 공통 `MALFORMED_REQUEST` | 앱의 버그 신호. 앱이 목록 응답의 `place_id` 를 그대로 보내면 일어나지 않는다 |
| 좌표·`radius`·`size` 범위 위반, `category` enum 밖 | 공통 `VALIDATION_FAILED` | 일반 입력 검증. 조용히 잘라내지 않는다 |
| 반경 안에 결과가 없음 | **없음 — 오류가 아니다** | 정상 응답 200 + `items: []`. 앱은 비어있음 상태를 그린다 (AC-NP-5) |
