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
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 | 일반 오류 문구 + 재시도 버튼 |

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

(TODO — 인증 기능 구현 시 등록. 예상: `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`,
`AUTH_REFRESH_TOKEN_REUSED`, `AUTH_EMAIL_ALREADY_REGISTERED`)

### place

| code | status | 의미 | 모바일 처리 |
|---|---|---|---|
| `PLACE_NOT_FOUND` | 404 | 관광지가 없거나 공개되지 않음 | 장소 상세 찾을 수 없음 상태 |
