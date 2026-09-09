# 서버 리뷰: admin-user-approval

- 리뷰 역할: server-reviewer
- 날짜: 2026-09-09
- 판정: **PASS**
- 대상: 워킹트리의 `server/` 변경분 전체 (커밋 전)
  - 신규 `com.planbee.api.admin` 패키지 22파일
  - 신규 `auth/PendingApprovalCounter`, `auth/SignupCompletedEvent`,
    `common/AsyncConfig`, `common/security/ForbiddenCodeResolver`, `common/security/JwtClaims`
  - 수정 `auth/AuthService` · `auth/RefreshTokenService` · `auth/TokenIssuer` · `auth/User` ·
    `auth/UserRepository` · `auth/dto/UserSummary` · `common/security/SecurityConfig` ·
    `common/security/SecurityProblemResponder` · `place/PlaceController` · `application.properties`
  - 신규 `db/migration/V3__create_admin_user_approval.sql`, `db/seed/V902__e2e_seed_admin.sql`
- 근거 문서: `docs/conventions/server.md`(S-32·S-33·S-34 포함) · `docs/conventions/common.md` ·
  `docs/features/admin-user-approval/contract.yaml` · `PRD.md`(AC 34) · `status.md` 결정 기록 ·
  `docs/api/error-codes.md`
- **`mobile/` 변경분은 이 리뷰의 대상이 아니다** (동시 작업 중). 읽지도 판정하지도 않았다.

## 판정 요약

**`[MUST]` 위반 0건 — PASS.** 계약이 못 박은 항목(커서 페이지네이션 · 오류 코드 3개 ·
`pending_approval_count` 단일 계산 · 처리자 미노출 · 정지의 세션 처리 · `snake_case`)을
하나씩 대조했고 전부 일치했다. 아래 `[SHOULD]` 3건은 차단하지 않는다.

리뷰어가 직접 실행한 게이트 (절대 규칙 6):

| 게이트 | 결과 |
|---|---|
| `make lint-server` | 통과 (Spotless) |
| `make test-server` | 통과 (슬라이스 + ArchUnit — `domainsAreFreeOfCycles` 포함) |
| `make contract-check` | **통과** (ERR 0. admin 관련 warning/info 0건, 남은 info 는 기존 `place` 항목) |

린터·ArchUnit 이 잡는 항목(`[LINT]`)은 이 리포트에 쓰지 않았다 (절대 규칙 3).

## 사람 판단이 필요하다고 넘어온 설계 판단 3건 — 판정

### 1. 액세스 토큰의 `role` 클레임 + `JwtAuthenticationConverter` → **규칙 위반 아님**

`SecurityConfig.java:106·122-131`, `TokenIssuer.java:59-67`, `common/security/JwtClaims.java`

S-17 의 해당 문장은 이것이다.

> **토큰 검증**: `oauth2-resource-server` 에 맡긴다. **커스텀 JWT 필터를 직접 만들지 않는다.**
> 근거: 커스텀 인증 필터는 보안 결함이 가장 자주 발생하는 지점이다.

금지 대상은 **필터**이고, 그 근거는 "검증 로직을 직접 짜면 결함이 난다" 이다.
이번 변경은 필터를 만들지 않는다 — `BearerTokenAuthenticationFilter` 와
`NimbusJwtDecoder` 가 그대로 서명·`exp`·`nbf` 를 검증하고, 바뀐 것은 **검증이 끝난 뒤
클레임을 권한 이름으로 옮기는 변환기** 하나다. 즉 S-17 이 막으려던 지점(검증)에 손대지 않았다.

같은 S-17 의 마지막 불릿이 이미 같은 패턴을 명시적으로 허용하고 있다는 점이 결정적이다.

> **스코프**: … Spring 의 기본 변환기가 `SCOPE_<값>` 권한으로 바꿔 주므로 경로별 인가를
> `SecurityConfig` 에서 선언으로 건다.

`role` → `ROLE_*` 는 `scope` → `SCOPE_*` 와 같은 층위의 일이고, 구현도 기본 변환기
(`JwtGrantedAuthoritiesConverter`)를 **대체하지 않고 그 결과에 더한다**
(`SecurityConfig.java:124-130`). `SCOPE_full` 판정은 그대로 살아 있다.

부수 확인:

- 역할이 없는 토큰(변경 이전 발급분)은 `ROLE_*` 없이 통과 → 관리자 경로에서 403.
  **닫히는 쪽으로 실패한다.** 열리는 쪽 실패 경로는 없다.
- 토큰 발급 지점은 두 곳뿐이고(`RefreshTokenService.java:86`, `AuthService.java:320`)
  둘 다 DB 에서 읽은 `user.role()` 을 싣는다. 갱신 때마다 다시 읽으므로 역할 변경의
  최대 지연은 액세스 토큰 수명(30분)이고, 이는 S-34 가 명시적으로 허용한 지연이다.
- 삭제 전용 토큰(`ACCOUNT_DELETE`)도 `role` 을 갖게 되지만 관리자 경로는
  `allOf(SCOPE_full, ROLE_ADMIN)`(`SecurityConfig.java:100-102`)이라 스코프에서 먼저 걸린다.
  계약 `ForbiddenScope`(공통 `FORBIDDEN`)와 일치한다.

**S-34 를 같은 변경에서 규칙으로 남긴 것도 맞다** — "구현 중 결정이 나면 같은 커밋에서
규칙을 추가한다"(AGENTS.md 코딩 규칙) 그대로이고, server.md 의 "미확정 — 인가 모델" 을 닫았다.

### 2. `processed_at` 을 파생 대신 컬럼으로 저장 → **규칙 위반 아님** (상태와 어긋나는 경로 없음 확인)

`V3__create_admin_user_approval.sql:17-26·34-36`, `User.java:151-205`

계약은 `processed_at` 을 **응답 필드**로 정의했을 뿐 저장 방식을 지시하지 않는다
(`ProcessedUserItem.processed_at`). 저장 형태는 구현의 자유이고, 이를 금지하는 규칙은
conventions 에 없다. 오히려 S-33 이 요구하는 "인덱스는 `(정렬 키 DESC, id DESC)`" 는
`COALESCE` 식으로는 부분 인덱스가 지저분해지므로 컬럼 고정이 규칙에 더 잘 맞는다
(`V3:48-49` 의 부분 인덱스 2개).

**"상태와 어긋날 수 있는 경로가 없는가" 를 실제로 훑었다.**

- `users.status` 를 바꾸는 코드는 `User.java` 안의 6곳뿐이다 (`grep this.status`).
  가입(`:111`, `PENDING` — `processed_at` 은 `null` 이 정상)과 상태 전이 5개다.
- 전이 5개는 전부 `touchProcessed(now)`(`:202-205`)를 지나거나
  (`approve:157` · `reject:167` · `suspend:188` · `cancelSuspension:199`),
  대기로 되돌아가는 `cancelRejection:176-182` 이 `processedAt = null` 로 명시적으로 지운다.
- 계약이 요구한 불변식 "`processed_at` 은 언제나 같은 상태의 시각 필드와 값이 같다" 도 성립한다.
  `suspend` 가 `approvedAt` 을 보존하고(계약: `SUSPENDED` 에서 `approved_at` 은 값이 있다),
  `cancelSuspension` 이 `approvedAt` 을 갱신하고 `suspendedAt` 을 비운다 (D-2 · AC-24 일치).
- 기존 행 보정도 있다 (`V3:34-36`). 보정이 없으면 정렬 키가 `NULL` 인 행이 생겨
  `ORDER BY processed_at DESC` 에서 맨 앞으로 튀어나온다 — 놓치지 않았다.
- 서비스는 응답 직전 `userRepository.flush()` 로 건수를 맞춘다
  (`AdminUserService.java:220-223·161`). AC-32 의 "처리 직후의 건수" 가 한 건 어긋나는 사고를 막는다.

남는 위험은 **애플리케이션 밖에서 상태만 바꾸는 SQL**(시드·수기 처리)이다. 실제로 V901 이
그 함정을 한 번 밟았고 V902 로 메웠다. 규칙 근거가 없어 지적하지 않는다 — 아래 `참고` 3 참조.

### 3. `common/security/ForbiddenCodeResolver` 확장점 신설 → **규칙 위반 아님. 오히려 규칙이 요구하는 방향**

`ForbiddenCodeResolver.java`, `SecurityProblemResponder.java:40-72`, `AdminForbiddenCodeResolver.java`

`SecurityProblemResponder`(`common`)가 `AdminErrorCode`(`admin`)를 직접 import 하면
`common → admin` 이 생겨 S-2 의 순환 의존에 걸린다는 설명은 정확하다. 그리고 이 해법은
**S-27 이 이미 확립한 것과 같은 형태**다.

> **도메인별 예외 핸들러를 만들지 않는다.** `common` 이 각 도메인 패키지를 참조하게 되어
> S-2 의 순환 의존에 걸린다. 도메인은 값만 담고 변환은 여전히 한 곳에서 한다. (S-27)

`common` 은 인터페이스만 알고, 구현 빈(`AdminForbiddenCodeResolver`)은 도메인이 등록한다 —
의존 방향이 `admin → common` 한쪽이다. `make test-server` 의 ArchUnit 이 이를 확인했다.
S-34 마지막 불릿이 같은 내용을 규칙으로 남겼다.

세부 확인:

- 아무도 판단하지 않으면 공통 `FORBIDDEN` 으로 떨어진다 (`SecurityProblemResponder.java:64-70`).
  기존 동작이 바뀌지 않는다.
- `AdminForbiddenCodeResolver:35-38` 이 `SCOPE_full` 을 확인한 뒤에만 `ADMIN_FORBIDDEN` 을 낸다.
  삭제 전용 토큰은 공통 `FORBIDDEN` 으로 남는다 — 계약 `ForbiddenScope` 와 error-codes.md 의
  "공통 `FORBIDDEN` 과도 갈라 쓴다" 를 정확히 따랐다.
- 미인증 요청은 `AccessDeniedHandler` 가 아니라 `AuthenticationEntryPoint` 로 가므로
  401 `UNAUTHORIZED` 다 (AC-4). 이 경로는 건드리지 않았다.

## 계약 대조 (status.md `결정 기록` 이 못 박은 항목)

| 항목 | 결과 | 확인한 곳 |
|---|---|---|
| 커서 페이지네이션 · 오프셋 금지 | PASS | `UserCursor`(불투명 Base64, 깨지면 400 `MALFORMED_REQUEST`) / `AdminUserRepository:83-89` 이 `키 < 커서키 OR (키 = 커서키 AND id < 커서id)` 한 식. `offset` 없음 |
| `page_size` 1..50 기본 20 · `cursor` | PASS | `AdminController:69-73·84-88` + `AdminUserService:310-317`. 범위 밖은 400 (잘라내지 않음). 생성 스펙 `{"type":"integer","default":20,"maximum":50,"minimum":1}` — S-32 를 지켰다 |
| 봉투 `{items, has_next, next_cursor}` + 집계값 | PASS | `PendingUserPage` · `ProcessedUserPage`. `has_next` 는 `limit = pageSize + 1` 로 판정 (`AdminUserService:81-83·98-100`) — 세는 쿼리 없음 (S-33) |
| 정렬 키 `pending`=`requested_at` / `processed`=`processed_at`, 동률 `user_id` DESC | PASS | `AdminUserRepository:51·70`. 정렬 파라미터 없음 |
| 신규 오류 코드 **3개만** | PASS | `AdminErrorCode` 3개(`ADMIN_FORBIDDEN` 403 · `ADMIN_SELF_SUSPEND_FORBIDDEN` 403 · `ADMIN_USER_ALREADY_PROCESSED` 409). 전이 5종이 `requireStatus`(`:300-304`) 한 곳에서 같은 코드를 던진다. 나머지는 공통 코드 재사용 — 계약에 없는 코드 신설 0 |
| 거절 사유 200자 초과 → `VALIDATION_FAILED` + `field="rejection_reason"` | PASS | `RejectUserRequest:23` `@Size(max=200)` → `GlobalExceptionHandler` 가 `SIZE` + `rejection_reason`(S-21 의 표기 변환) 으로 낸다. 문구도 계약 예시와 동일 |
| 거절 취소 시 `rejection_reason` 을 비운다 (D-3) | PASS | `User.java:176-182` (`rejectedAt`·`rejectionReason`·`processedAt` 모두 `null`, `createdAt` 불변) |
| 정지 해제가 승인 시각을 갱신 (D-2) | PASS | `User.java:195-200` |
| 처리자·처리 시각을 응답에 싣지 않음 (ASK 4) | PASS | `AdminActionLog` 는 저장 전용, `AdminActionLogRepository` 에 조회 메서드 없음. `ProcessedUserItem` 에 처리자 필드 없음 |
| 정지가 리프레시 토큰을 폐기하지 않음 | PASS | `AdminUserService.suspend:178-191` 에 토큰 조작 없음. `RefreshTokenService` 변경은 `role` 인자 하나뿐 |
| 매 요청 상태 확인 미도입 | PASS | `SecurityConfig` 에 DB 조회 없음. 반영은 기존 `refresh` 경로 그대로 (최대 30분) |
| `pending_approval_count` 단일 계산 (C-8 / AC-32) | PASS | `PendingApprovalCounter.countPending()` 하나. `/auth/me`·로그인(`AuthService.toSummary`)·목록 2·상태 전이 2·Discord 알림이 전부 이 메서드를 부른다. 쿼리는 `UserRepository.countByStatus` 하나 |
| `ADMIN` 에게만 건수, `USER` 는 `null` | PASS | `AuthService.toSummary` 삼항 + 생성 스펙 `pending_approval_count: {"type":["integer","null"]}`, `required` 에 없음 |
| API 필드 `snake_case` (C-7 / S-21) | PASS | 생성 스펙의 admin 스키마 프로퍼티 전수 확인 — 전부 `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`. `@RequestParam(name="page_size")` · `@PathVariable("user_id")` 로 바인딩 이름 명시 |
| 시크릿 (C-4 / S-28) | PASS | `application.properties:68` 이 `${DISCORD_WEBHOOK_URL:}` 참조만. 값은 `.env.example` 에 정의만(빈 값), `RequiredEnvironmentCheck.REQUIRED` 에 없음. 미설정이 정상 동작임을 설정 파일 주석에 남겼다 — S-28 이 요구하는 두 조건(계약이 그 사실을 못 박음 + 주석)을 계약 말미 'Discord Webhook' 3항이 충족 |
| 단순 조회 JPA / 동적·프로젝션 QueryDSL (S-23) | PASS | 커서 조건이 요청마다 붙었다 떨어지므로 QueryDSL, `BooleanExpression` 이 `null` 반환으로 조건 생략(`BooleanBuilder`+`if` 아님). 단건은 `UserRepository.findById`, 건수는 `countByStatus` |
| 엔티티 노출 (S-4) · 레이어 (S-3·S-5·S-6) | PASS | 응답은 전부 `dto/` record. 컨트롤러는 바인딩·위임만, `@Transactional` 은 서비스에, 목록은 `readOnly = true` |
| 조회 프로젝션 (S-26) | PASS | `PendingUserRow` · `ProcessedUserRow` 로 필요한 컬럼만. `Tuple` 반환 없음. 한국어 문구·`is_me` 는 조회가 아니라 서비스에서 붙인다 (SQL 에 한국어 리터럴이 들어가지 않는다) |
| Flyway 소유 (S-14) | PASS | 엔티티 변경과 같은 변경분에 `V3`. 기존 마이그레이션 수정 없음. `rejection_reason` 은 `VARCHAR(200)` (`CHAR` 아님) |
| 계약에 없는 엔드포인트 노출 (S-20 / C-5) | PASS | `make contract-check` 통과. 노출 경로 7개가 계약과 1:1 |

`PlaceController` 변경은 이 기능 밖이지만 **계약 게이트를 초록으로 되돌리기 위한 선행 수정**이고
(계약이 아니라 구현을 고쳤다 — C-5), 같은 변경에서 S-32 로 규칙화했다. 적절하다.

## `[MUST]` 위반

**없음.** `defects.md` 에 이관할 항목이 없다.

## `[SHOULD]` — 제안 (차단하지 않음)

- **S-1. `errors[].code = "RANGE"` 가 카탈로그에 없다.** — `AdminUserService.java:313-315`
  근거: S-18 / `docs/api/error-codes.md` "검증 실패 세부 코드(`errors[].code`)" 표.
  그 표에 있는 값은 `NOT_BLANK` `NOT_NULL` `SIZE` `EMAIL` `PATTERN` 다섯이고 `RANGE` 는 없다.
  **`[MUST]` 로 올리지 않은 이유**: 그 표는 닫힌 목록이 아니라 규칙("Bean Validation 제약 이름을
  `UPPER_SNAKE_CASE` 로 변환한 값")의 예시이고, `RANGE` 는 Hibernate Validator 의 `@Range` 와
  같은 이름이라 규칙 자체는 지킨다. 같은 형태의 선례도 이미 있다 — `auth` 가 손으로 만드는
  `ASSERT_TRUE`(`AuthService.java:168-170`)도 표에 없고 리뷰를 통과했다.
  제안: 카탈로그 소유자는 tech-lead 이므로 `RANGE`(그리고 이미 쓰이는 `ASSERT_TRUE`)를 표에
  올려 달라고 요청하는 편이 좋다. 앱이 `errors[].code` 로 분기하게 되는 날 근거가 생긴다.
- **S-2. Discord 발송 실패 처리에서 `RestClientException` 만 잡는다.** — `DiscordWebhookClient.java:57-71`
  근거: S-31("상류의 실패는 … 전부 같은 방식으로 다룬다" 의 취지) — 다만 이 도메인은 계약이
  "실패를 삼키고 경고 로그" 로 정했으므로 예외를 던지지 않는 것 자체는 규칙 위반이 아니다.
  잘못된 형식의 URL 이 주입되면 `IllegalArgumentException` 이 `catch` 를 빠져나가 비동기
  스레드로 올라간다. 가입 201 은 이미 커밋·응답된 뒤라 AC-27 은 깨지지 않지만, 로그 문구가
  "발송 실패" 가 아니라 처리되지 않은 예외로 남아 AC-28 의 관측이 흐려진다.
  제안: `catch (RuntimeException)` 으로 넓히거나 `properties.configured()` 에서 URL 형식을 함께 본다.
- **S-3. 재시도에 간격이 없다.** — `DiscordWebhookClient.java:57`
  근거 규칙 없음(S-31 은 재시도를 "필요해지면 추가" 로 유예). 1회 재시도가 즉시 붙어
  상류가 순간적으로 죽어 있을 때 두 번 다 같은 이유로 실패한다. 지금 규모에서는 무해하다.

## 참고 — 규칙 근거가 없어 지적하지 않은 것 (다음 역할이 알아야 할 사실)

1. **S-31 과 S-28 이 서로 다른 것을 요구하는 지점이 있다.** S-31 은 외부 API 키를
   "환경변수 + `RequiredEnvironmentCheck` 에 등록" 하라 하고, S-28·계약·AC-29 는
   `DISCORD_WEBHOOK_URL` 을 REQUIRED 에 **넣지 말라**고 한다. 계약이 이 충돌을 명시적으로
   판정해 두었으므로(계약 말미 'Discord Webhook' 3항) 구현은 계약을 따른 것이 맞다
   (절대 규칙 1). 다음에 외부 API 가 하나 더 붙을 때 같은 질문이 반복되지 않도록
   **S-31 에 한 줄 예외 표기를 넣는 것**을 tech-lead / 다음 구현자에게 제안한다.
   리뷰어가 임의로 규칙을 고치지 않고 여기 남긴다.
2. **`PendingApprovalCounter` 가 `auth` 패키지에 있다.** 쓰는 쪽은 admin 이지만 세는 대상이
   auth 소유 테이블이고 `UserSummary` 를 만드는 것도 auth 다. 의존 방향은 `admin → auth`
   한쪽이라 S-2 에 걸리지 않는다(ArchUnit 확인). `common` 승격은 지금 이득이 없다.
3. **`processed_at` 은 애플리케이션 밖에서 상태만 바꾸면 조용히 어긋난다.** `V3:34-36` 과
   `V902:17-20` 이 그 보정이다. 이후 시드·수기 SQL 이 `status` 를 바꿀 때 같은 값을 채우지
   않으면 처리 완료 목록의 정렬 키가 `NULL` 이 되어 **첫 페이지 맨 앞에 튀어나온다.**
   server-tester 가 "`status <> 'PENDING'` 인데 `processed_at IS NULL` 인 행이 없다" 를
   한 줄 검증으로 두면 싸게 막힌다. (DB `CHECK` 제약을 강제하는 규칙은 없다)
4. **`AdminUserRepository` 가 `RepositoryCustom`/`RepositoryImpl` 쌍이 아니다.** S-23 의 그 규약은
   "Spring Data 리포지토리와 **함께 쓸 때**" 의 조건절이고, 여기서 대상 엔티티(`User`)의
   Spring Data 리포지토리는 auth 소유다. 그것에 fragment 를 붙이면 auth 가 admin 조회를
   들고 있게 된다. 독립 QueryDSL 리포지토리가 맞는 선택이다.
5. **E2E 시드의 비밀번호 해시 재사용(C-4)은 위반이 아니다.** `V902` 는 `V901` 이 이미 저장소에
   둔 테스트 전용 고정 자격 증명의 **해시**를 그대로 옮겼을 뿐이고, 새 시크릿을 만들지 않았다.
   C-4 가 금지하는 것은 실제 키·토큰·비밀번호이고 이 값은 `e2e` 프로필에서만 적용되는
   일회용 컨테이너 데이터다(`application-e2e.properties`). 손으로 새 해시를 만들면 인코더
   정책과 어긋날 위험만 는다 — 재사용이 더 나은 판단이다.
   다만 이번에 **`ADMIN` 역할 계정**이 그 고정 비밀번호로 생겼다는 사실은 기억할 값이 있다.
   `e2e` 프로필을 공용 환경에 켜지 않는다는 전제가 깨지면 그때는 문제가 된다 —
   배포 전 확인 항목으로 남길 만하다(규칙 근거는 없다).

## 다음 역할

**server-tester.** 특히 아래를 우선 확인하기를 권한다 (S-10 실패 케이스 포함).

- 커서 경계: 정확히 `page_size` 로 끝나는 마지막 페이지에서 `has_next=false`,
  동시각 두 행에서 항목이 새거나 겹치지 않는지 (S-33).
- 인가: `USER` 토큰 → 403 `ADMIN_FORBIDDEN`, 삭제 전용 토큰 → 403 `FORBIDDEN`,
  미인증 → 401 `UNAUTHORIZED` (세 코드가 갈리는지).
- 전이 5종의 409 `ADMIN_USER_ALREADY_PROCESSED`, 자기 정지 403, 대상 없음 404.
- `pending_approval_count` 가 `/auth/me`·목록 2·전이 응답에서 같은 값인지 (AC-32).
- 정지 후 `refresh` 가 403 + `account_status=SUSPENDED`(폐기 아님)인지 (AC-22·AC-23).
- `processed_at` 불변식: 각 상태의 시각 필드와 값이 같고, `PENDING` 은 `NULL` 인지.
