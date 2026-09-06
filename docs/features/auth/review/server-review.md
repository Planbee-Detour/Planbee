# 서버 코드 리뷰: `auth`

> **최신 판정: `PASS`** — 재리뷰(재작업 1회차 결과, 2026-08-27). 문서 맨 아래 **"재리뷰"** 절이 정본이다.
> 아래 1차 `FAIL` 판정과 결함 상세는 **이력으로 그대로 둔다** — 무엇이 왜 바뀌었는지가 다음 사람에게 필요하다.

---

## 1차 리뷰 (2026-08-27)

- **판정: `FAIL`**
- 리뷰어: server-reviewer
- 날짜: 2026-08-27
- 대상: 커밋되지 않은 `server/src/main/` 변경분 (`git status` 기준, 직전 커밋 `9563368`)
- 판정 근거: `docs/conventions/server.md`, `docs/conventions/common.md`, `docs/features/auth/contract.yaml`
  (절대 규칙 1·2). 문서에 없는 규칙은 지적하지 않았고, Spotless 가 잡는 항목은 다루지 않았다 (절대 규칙 3).

```
make lint-server   → BUILD SUCCESSFUL (Spotless 통과, 지적 대상 아님)
```

---

## 결론 요약

| # | 등급 | 규칙 | 내용 |
|---|---|---|---|
| D-3 | `[MUST]` High | S-17(리프레시 상세) · C-5 | 유예 창 **캐시 미스** 분기가 새 토큰 쌍을 발급한다 — 유효 리프레시 토큰이 늘고, 이후 유예 창 밖 재사용이 `REUSED` 가 아니라 `INVALID` 가 되어 전 기기 폐기(AC-24)가 발동하지 않는다 |
| D-4 | `[MUST]` High | S-5 · S-4 | 컨트롤러가 서비스 두 개를 콜백으로 엮고, 그 콜백의 타입 인자가 JPA 엔티티(`User`)다 |
| D-5 | `[MUST]` Medium | S-29 | `SignupRateLimiter` 에 "왜 DB 가 아닌지" 주석이 없다 |
| D-6 | `[MUST]` Low | S-19 | `refreshToken` 200 의 `@ApiResponse(description)` 이 계약과 다르다 (한 문장 누락) |

`[SHOULD]` 위반: 없음.

재작업은 D-3·D-4 두 건이 실질이고, D-5·D-6 은 각각 주석 한 단락 / 문장 한 줄이다.
전체 구조·명명·계약 정합성은 대부분 통과했다 — 아래 "통과 항목" 참조.

---

## 결함 상세

### D-3 `[MUST]` — 리프레시 유예 창의 캐시 미스 분기 (S-17 / C-5)

**위치**: `server/src/main/java/com/planbee/api/auth/RefreshTokenService.java:112-124`

```java
if (token.isRotated()) {
    if (!token.isWithinGraceWindow(now, graceWindow)) { ... REUSED ... }
    // 유예 창 안인데 캐시에 없다 (재기동 등).
    statusGuard.accept(token.user());
    token.revoke(now, RefreshToken.RevokeReason.LOGOUT);
    return cacheAndReturn(hash, issuePair(token.user(), now), now);   // ← 새 쌍
}
```

**규칙**

- `server.md` S-17: *"유예 창 안의 재시도에는 **같은 토큰 쌍을 다시** 돌려준다 — 매번 새로 발급하면
  재시도할 때마다 유효 토큰이 늘어난다."*
- `contract.yaml` (`POST /auth/token/refresh` description): *"매번 새 쌍을 발급하면 안 된다"*, AC-49.
- `common.md` C-5 / 절대 규칙 1: 구현이 계약과 다르면 **구현을 고친다.**

**무엇이 어긋나는가 — 두 가지 결과가 따라온다.**

1. **유효 리프레시 토큰이 늘어난다.** 토큰 A 를 회전하면 후속 토큰 B 가 이미 발급되어 살아 있다.
   그 뒤 캐시가 사라진 상태(재기동 · `GRACE_CACHE_SWEEP_THRESHOLD` 스윕 · 인스턴스 분리)에서
   유예 창 안에 A 가 다시 오면 이 분기가 **C 를 새로 발급**한다. 코드 주석은 "유효 토큰이 늘지 않도록
   이 행은 여기서 폐기한다" 고 하지만, 폐기되는 것은 이미 회전된 A 이고 **B 는 그대로 살아 있다.**
   결과적으로 B·C 두 개가 유효해져 S-17 이 막으려던 상태가 그대로 발생한다.
   B 는 이후 14일 동안 정상 회전되어 병렬 세션이 된다.
2. **유예 창 밖 재사용이 감지되지 않는다.** 이 분기를 탄 뒤 A 는 `revokedAt`(사유 `LOGOUT`)이 찍힌다.
   같은 A 가 유예 창 밖에서 다시 오면 3번 분기(재사용 판정)에 도달하기 전에 **2번 분기**
   (`token.isRevoked()` → `LOGOUT` → `REFRESH_TOKEN_INVALID`)에서 걸러진다.
   즉 유출된 토큰의 재사용인데도 `AUTH_REFRESH_TOKEN_REUSED` 가 나가지 않고
   **계정 전체 폐기(AC-24)가 실행되지 않는다.** 다른 기기는 `REVOKED` 대신 계속 정상 동작한다.
   계약의 401 표와 `error-codes.md` 가 약속한 동작이 이 경로에서만 조용히 달라진다.

**기대**: 유예 창 안의 재시도는 언제나 **직전과 같은 토큰 쌍**을 반환하거나(캐시가 유일한 수단이면
캐시가 사라진 경우의 동작이 계약에 정의되어 있어야 한다), 최소한 재사용 판정이 폐기 판정보다
먼저 서서 AC-23·24 가 무력해지지 않아야 한다.

**참고 (리뷰어 판단이 아니라 사실 관계)**: 서버는 회전된 토큰의 **후속 평문**을 갖고 있지 않으므로
"항상 같은 쌍" 을 재기동 이후에도 보장하는 것은 지금 설계로는 불가능하다. 그렇다면 이 예외 상황의
동작은 **계약에 적혀야 한다** — 계약 변경은 tech-lead 만 하므로 (절대 규칙 1),
server-developer 는 구현을 계약에 맞추거나 `defects.md` 로 tech-lead 에게 보완을 요청한다.
리뷰어가 계약을 고칠 수는 없다.

---

### D-4 `[MUST]` — 컨트롤러가 두 서비스를 엮고 엔티티 타입이 컨트롤러에 드러난다 (S-5 / S-4)

**위치**: `server/src/main/java/com/planbee/api/auth/AuthController.java:77-79`

```java
public TokenPair refreshToken(@Valid @RequestBody RefreshRequest request) {
    return refreshTokenService.rotate(request.refreshToken(), authService::assertCanStillSignIn);
}
```

**규칙**

- S-5: *"컨트롤러는 입력 바인딩·검증·**위임만** 한다."*
- S-4: *"엔티티를 컨트롤러 밖으로 노출하지 않는다."*

**무엇이 어긋나는가**

- 이 메서드는 위임이 아니라 **조합**이다. "갱신 시점에 계정 상태를 다시 확인한다" 는 정책
  (계약의 `POST /token/refresh` 403 절, AC-14·15·16 의 갱신 경로 반영)이 컨트롤러의 인자 배선으로
  표현되어 있다. 이 배선을 빠뜨리면 정지·거절 계정이 30분마다 무한히 갱신되는데,
  그것을 막는 지점이 서비스가 아니라 컨트롤러다.
- `rotate` 의 두 번째 파라미터 타입은 `Consumer<User>` 이고 `User` 는 JPA 엔티티다
  (`AuthService.assertCanStillSignIn(User)` — `AuthService.java:214`). 컨트롤러 표현식의 타입에
  엔티티가 들어온다. 같은 패키지라 `import` 가 보이지 않을 뿐 경계는 이미 넘어와 있다.

**기대**: 갱신 흐름 전체를 서비스 한 곳에 두고 컨트롤러는 한 번 위임한다.
(예: `AuthService.refresh(String refreshToken)` 이 `RefreshTokenService` 와 상태 확인을 안에서 엮고,
컨트롤러는 `return authService.refresh(request.refreshToken());` 만 남긴다.
정확한 배치는 server-developer 판단이고, 리뷰 요건은 **컨트롤러에서 조합과 엔티티 타입이 사라지는 것**이다.)

---

### D-5 `[MUST]` — 프로세스 메모리 상태에 근거 주석이 없다 (S-29)

**위치**: `server/src/main/java/com/planbee/api/auth/SignupRateLimiter.java:12-26`

**규칙**: S-29 — *"이런 상태를 새로 만들면 **왜 DB 가 아닌지**를 코드 주석에 남긴다."*

`LoginAttemptGuard`(20-24행)와 `RefreshTokenService`(37-45행)는 이 요구를 지켰다 — 각각
"최대 10분짜리 임시 상태" 와 "평문이 담기므로 DB 에 넣으면 해시 저장의 의미가 사라진다" 를 적었고,
다중 인스턴스 시 옮겨야 한다는 문장까지 있다. `SignupRateLimiter` 의 클래스 주석은 **무엇을 막는지**만
설명하고 저장 위치의 근거가 없다. `windowsByClient` 필드에도 주석이 없다.

S-29 의 목적이 "인스턴스를 늘리는 시점에 무엇을 옮겨야 하는지 코드에서 찾을 수 있게 하는 것" 이므로,
셋 중 하나만 빠져도 그 목적이 깨진다. `status.md` 의 ASK 8 에는 세 항목이 모두 적혀 있어
그쪽 요건은 충족한다 — 빠진 것은 **코드 주석**이다.

**기대**: 왜 DB 가 아닌지(집계 창이 1시간짜리 휘발 상태이고 재기동 시 초기화되어도 정책이 무너지지 않는다는 등의
실제 이유)와 다중 인스턴스 전환 시 공유 저장소로 옮겨야 한다는 사실을 주석으로 남긴다.

---

### D-6 `[MUST]` — 생성 스펙의 응답 설명이 계약과 다르다 (S-19)

**위치**: `server/src/main/java/com/planbee/api/auth/AuthController.java:73`

**규칙**: S-19 — *"`@Operation(operationId = ...)`, `@Tag(name = ...)`, `@ApiResponse(description = ...)` 를
계약에 적힌 값과 동일하게 붙인다."*

`server/build/openapi.json` 과 `contract.yaml` 을 대조하면 **`refreshToken` 200 하나**가 다르다.

```
계약 : 갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
       유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).
구현 : 갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
```

나머지 5개 오퍼레이션의 `summary` · `operationId` · `description` 은 계약과 글자까지 일치한다.
`scripts/contract-check.sh` 는 설명 문구 차이를 실패로 보지 않으므로 **게이트가 잡아주지 않는다** —
그래서 리뷰에서 막는다. 하필 빠진 문장이 D-3 이 어긋난 바로 그 동작(AC-49)이라 더욱 남아 있어야 한다.

---

## 통과 항목 (근거와 함께 확인한 것)

### 구조 · 레이어

- **S-1** 도메인 패키지 구조 — `auth/` 안에 컨트롤러·서비스·리포지토리·엔티티·`dto/` 가 모여 있다.
  `AccountStatusMessages` · `LoginAttemptGuard` · `SignupRateLimiter` · `TokenIssuer` 는
  S-1 이 열거한 네 종류에 속하지 않지만 S-1 의 목록은 예시이고, 이름이 실제 하는 일을 그대로 나타낸다.
- **S-3** 레이어 방향 — 컨트롤러가 리포지토리를 직접 부르지 않는다. `TokenIssuer` 가 `...Service` 가
  아닌 이유도 주석에 남아 있다.
- **S-2** 도메인 간 결합 — `auth` → `common` 단방향이다. 스코프 문자열을 `common.security.TokenScope`
  로 올려 `SecurityConfig` 가 `auth` 를 참조하지 않게 한 것은 S-2·S-17 이 요구한 그대로다.
- **S-4** 엔티티 노출 — 요청/응답은 전부 `dto/` 의 record 다. (예외는 D-4)
- **S-15** 생성자 주입 — 전부 생성자. `@Autowired` 없음.

### 트랜잭션 · 영속성

- **S-6** 트랜잭션 경계 — `@Transactional` 이 서비스에만 있고, `getMe` 만 `readOnly = true` 다.
  쓰기가 있는 `signup` · `login`(리프레시 저장) · `logout` · `deleteAccount` · `issuePair` · `rotate` ·
  `revoke` 는 읽기 전용이 아니다. 올바르다.
- **S-14** Flyway 소유 — `V2__create_auth.sql` 이 같은 변경에 들어 있고, `ddl-auto=validate` 유지.
  **`token_hash` 가 `VARCHAR(64)`** 이고 그 이유(`bpchar` 불일치로 기동 실패)가 주석에 있다 —
  S-14 에 새로 추가된 `VARCHAR` 항목을 정확히 따랐다. 아직 적용된 적 없는 마이그레이션을 직접 고친
  판단도 S-14 의 예외 조항 그대로다.
- **S-16 / S-25** 지연 로딩 — `open-in-view=false` 유지. `findByTokenHashWithUser` 가 `join fetch`,
  `findWithConsentsById` 가 `@EntityGraph` 다. 컬렉션 페치 + 페이징 조합 없음.
- **S-23** 조회 방식 — 전부 단건·고정 조건이라 Spring Data 메서드로 충분하다. QueryDSL 을
  쓰지 않은 판단과 그 근거가 `UserRepository` 주석에 있다. **S-23 이 금지한 "메서드 이름으로
  표현되는 조회를 QueryDSL 로 다시 쓰기" 를 하지 않았다.**
- **S-26** 프로젝션 — 화면이 쓰는 필드가 엔티티 전체와 사실상 같아(`UserSummary` 3필드) 별도
  프로젝션이 필요한 지점이 없다.

### 오류 처리

- **S-7 / C-1** — 컨트롤러에 try-catch 가 없고 모든 실패가 `BusinessException` → `GlobalExceptionHandler`
  한 경로로 모인다. 401/403 은 `SecurityProblemResponder` 가 같은 형식을 유지한다
  (`accessDeniedHandler` 도 등록되어 있어 `ForbiddenScope` 응답이 ProblemDetail 로 나간다).
- **S-27** 확장 필드 — `account_status` · `deletion_token` · `deletion_token_expires_in` ·
  `lock_remaining_minutes` · `support_contact_email` · `errors` 를 전부 `withExtension` 으로 싣고,
  `Retry-After` 는 `withHeader` 다. **이름을 계약 그대로의 `snake_case` 상수로 선언**해
  Map 키가 변환을 타지 않는다는 사실을 정확히 반영했다 (`AuthService.java:41-48`).
  도메인 전용 예외 핸들러를 만들지 않아 S-2 도 함께 지켰다.
- **C-1 의 429** — 잠금·가입 레이트 리밋 모두 `Retry-After`(초, `max(1, ...)`)를 함께 낸다.
  화면이 쓰는 값은 본문 `lock_remaining_minutes`(올림·최소 1분, `LoginAttemptGuard.toRemainingMinutes`)로
  분리되어 있다 — C-1 이 새로 적은 "헤더로 분기하지 않는다" 를 그대로 따랐다.
- **S-18** — `AuthErrorCode` 12종이 `docs/api/error-codes.md` 에 전부 등록되어 있다 (문자열 대조 확인).
- **CommonErrorCode.TOO_MANY_REQUESTS** 추가와 `fromStatus(429)` 매핑도 일관된다.

### 계약 정합성 (C-5 / C-7 / C-8)

`server/build/openapi.json`(직전 `make contract-export` 산출물)과 `contract.yaml` 을 기계 대조했다.

- 공유 스키마 **11개 전부** 프로퍼티 이름과 `required` 목록이 일치한다 — 차이 0건.
- `applied_at` · `support_contact_email` · `signup_reason` · `version` · `deletion_token` 의
  nullable 이 `type: [T, "null"]` 로 나온다. `@Schema(types = {...})` + `ModelResolver(...).openapi31(true)`
  조합이 S-19 의 새 항목대로다.
- 오류 응답을 `@ApiResponse` 로 복제하지 않은 것도 S-19 의 확정 사항 그대로다
  (`contract-check` 의 `info` 는 실패가 아니다).
- **S-21** — Java 식별자는 전부 `camelCase` 이고 변환은 `spring.jackson.property-naming-strategy`
  한 곳에서만 한다. `age_over_14_confirmed` 만 `@JsonProperty` 로 예외 처리했고 —
  **S-21 의 숫자 경계 예외를 정확히, 그 필드에만 적용했다.** `GlobalExceptionHandler.toJsonFieldName`
  이 `@JsonProperty` 를 먼저 보고 없을 때만 SNAKE_CASE 를 적용하는 것도 S-21 이 요구한 그대로다.
- **C-8 / S-22** — `AccountStatusView` 하나로 상태 화면이 완성되고, 문구·문의 주소·올림한 남은 분이
  전부 서버 계산이다. 상태 조회 전용 왕복이 없다.

### 인증 / 인가 (S-17)

- 비밀번호는 위임 인코더로만 저장, 리프레시는 SHA-256 해시 저장 + 회전, 폐기 사유(`LOGOUT` /
  `REUSE_DETECTED`) 저장까지 S-17 의 리프레시 상세를 따랐다. (유예 창 관련 예외는 D-3)
- **`PUBLIC_PATHS` 를 계약이 지시한 대로 셋으로 좁혔다** — 계약 머리말의
  "server-developer 가 반드시 처리할 것" 을 이행했다. 기본 정책은 여전히 거부다.
- 스코프 인가를 `SecurityConfig` 의 선언으로 걸고 커스텀 JWT 필터를 만들지 않았다.
  `DELETE /api/v1/auth/me` 만 `account:delete` 를 허용하고 나머지는 `full` 만 통과한다 —
  계약의 "이 엔드포인트 외에는 모두 403" 과 일치한다.
- 시크릿은 `${JWT_SECRET}` 참조뿐이고 설정 파일에 값이 없다 (C-4).

### 설정 (S-28 / C-4)

`planbee.auth.support-contact-email=${SUPPORT_CONTACT_EMAIL:}` — S-28 이 요구한 세 조건을 모두 갖췄다.
① 계약에서 해당 필드가 nullable, ② 설정 파일에 그 사실이 주석으로 있음,
③ `RequiredEnvironmentCheck.REQUIRED` 에 넣지 않음. `supportContactEmailOrNull()` 이 빈 문자열을
`null` 로 바꿔 내리는 것도 AC-43·44 와 맞다.

### 시각 (S-8 / C-2)

`ClockConfig` 가 `Clock.systemUTC()` 를 등록하고 서비스·가드·발급기가 전부 주입받는다.
`UserConsent.record` 가 동의 시각을 요청이 아니라 서버 `Clock` 으로 찍는 것도 맞다.

---

## 규칙에 없어 지적하지 않은 것

절대 규칙 2 에 따라 아래는 **결함으로 올리지 않았다.** 규칙으로 만들 만한지 판단이 필요하면
`docs/conventions/server.md` 에 제안으로 올라가야 하는데, 지금은 그럴 만큼 반복되는 문제로 보이지 않아
규칙 추가도 하지 않았다.

- `UserRepository.findWithConsentsById` 는 어디에서도 호출되지 않는다 (`server/src` 전체 grep 0건).
  `auth` 는 동의 이력을 읽어 내려주는 화면이 없고, 소비처는 `admin-user-approval` 이 될 것이다.
  "사용되지 않는 공개 메서드" 를 다루는 규칙이 `server.md` 에 없다.
- `AuthController.clientKey(...)` 의 `X-Forwarded-For` 파싱. 레이트 리밋 **정책**이 아니라
  `HttpServletRequest` 에서 값을 꺼내는 일이라 S-5 의 "입력 바인딩" 으로 읽었다 —
  서비스가 볼 수 없는 값을 컨트롤러가 꺼내 넘기는 형태라 D-4 와 성격이 다르다.
- `OpenApiConfig` 주석의 "`springdoc.api-docs.version` 과 같은 값이어야 한다" 는 서술은 실제로
  그 프로퍼티가 어디에도 설정돼 있지 않다는 점에서 사실과 다르지만(생성 스펙은 springdoc 기본값으로
  이미 3.1.0 이다), 주석 정확성을 다루는 규칙은 없다.
- `deleteAccount` 가 폐기 사유로 `LOGOUT` 을 쓰는 것. 계정이 즉시 파기되어 행 자체가
  cascade 로 사라지므로 관측 가능한 차이가 없다.

---

## 다음 역할

`FAIL` — server-developer 가 D-3 ~ D-6 을 처리한 뒤 다시 리뷰한다 (재작업 1회차, 상한 2회).
D-3 은 계약 보완이 필요할 수 있으며, 그 판단은 tech-lead 몫이다 (절대 규칙 1).

---
---

# 재리뷰 (재작업 1회차 결과) — 2026-08-27

- **판정: `PASS`**
- 리뷰어: server-reviewer
- 대상: server-developer 가 재작업 1회차에서 고친 파일 **6개**
  (`AuthController` · `AuthService` · `RefreshToken` · `RefreshTokenService` ·
  **신규** `ReuseDetectionRevoker` · `SignupRateLimiter`).
  `find server/src -newermt 2026-08-27` 로 확인했고, 그 외 서버 파일은 1차 리뷰 이후 바뀌지 않았다.
- 판정 근거: `docs/conventions/server.md`(S-17 갱신분 포함) · `docs/conventions/common.md` ·
  `docs/features/auth/contract.yaml`(tech-lead 갱신분). 문서에 없는 규칙은 지적하지 않았고
  (절대 규칙 2), Spotless 가 잡는 항목은 다루지 않았다 (절대 규칙 3).
- **신규 결함 0건.** `defects.md` 에 추가한 항목 없다.

## 게이트 — 직접 실행했다 (절대 규칙 6)

개발자 보고를 믿지 않고 이 리뷰에서 다시 돌렸다. Docker 는 켜져 있었다.

```
make verify-server   → BUILD SUCCESSFUL  (spotlessCheck · test(ArchUnit 6종 포함) · integrationTest)
make contract-check  → ✓ contract-check 통과  (남은 것은 info 뿐 — 오류 응답 미복제 / expires_in format 구체화)
```

`contract-check` 는 `contract-export` 를 먼저 부르므로 **지금 소스로 생성된**
`server/build/openapi.json` 을 대조한 결과다. 그 산출물로 계약 정합성도 직접 확인했다(아래 D-6).

---

## D-3 ~ D-6 해소 확인

| # | 상태 | 코드 근거 |
|---|---|---|
| D-3 | **해소** | `RefreshTokenService.java:129-133` — 계약의 "구현할 것" 8항과 1:1 대조 (아래 표) |
| D-4 | **해소** | `AuthController.java:84-86`(한 번 위임) · `AuthService.java:224-234`(조합 + private 가드) |
| D-5 | **해소** | `SignupRateLimiter.java:21-28`(클래스 주석) · `:35`(필드 주석) |
| D-6 | **해소** | 생성 스펙의 200 `description` 이 계약 블록 스칼라와 **문자열 동일** |

### D-3 — 계약의 "구현할 것" 8항 대조

`defects.md` D-3 "계약에서의 결론 → server-developer 가 구현할 것" 을 항목별로 확인했다.

| 항 | 지시 | 구현 | 확인 |
|---|---|---|---|
| 1 | 회전됐는데 캐시 재생에 안 걸리면 유예 창 안·밖 구분 없이 `revokeAllByUserId(REUSE_DETECTED)` + `REFRESH_TOKEN_REUSED` | `RefreshTokenService.java:129-133` | ✅ |
| 2 | 3번 분기의 `isWithinGraceWindow` 검사 제거 | 분기에 없음. **엔티티 메서드 자체가 삭제**됨 | ✅ |
| 3 | 이 경로에서 `statusGuard` 를 부르지 않는다 (재사용 판정이 계정 상태보다 먼저) | `statusGuard.accept` 는 5번 분기(`:141`) 한 곳뿐이고 3번 분기(`:129`)보다 **뒤**에 있다 | ✅ |
| 4 | 이 경로에서 `token.revoke(now, LOGOUT)` 을 찍지 않는다 | `LOGOUT` 폐기는 `revoke()`(로그아웃, `:156`)와 `deleteAccount`(계정 삭제) 두 곳뿐 | ✅ |
| 5 | 캐시 적중 경로는 그대로. 재생이 유예 창을 연장하지 않는다 | `replayWithinGraceWindow` 는 `expiresAt` 을 손대지 않고 캐시된 쌍만 반환 (`:160-170`) | ✅ |
| 6 | 스윕은 만료분만 제거. LRU 로 바꾸지 않는다 | `removeIf(entry -> !now.isBefore(entry.expiresAt()))` 유지 (`:174`) | ✅ |
| 7 | 로그아웃 시 `graceCache.remove(hash)` 유지 | `:157` 그대로 | ✅ |
| 8 | 200 `@ApiResponse(description)` 을 갱신된 계약 문구와 일치 | 아래 D-6 | ✅ |

분기 순서도 계약대로다 — **1 캐시 재생 → 2 폐기됨 → 3 재사용 → 4 유휴 만료 → 5 계정 상태 → 회전**.
계약이 명시한 "재사용 판정이 계정 상태 확인보다 먼저 선다" 가 코드의 물리적 순서로 성립한다.

### `RefreshToken.isWithinGraceWindow` 삭제의 영향

`server/src` 전체에서 잔여 참조 **0건**(grep). 남은 언급은 `defects.md` · `status.md` ·
이 리뷰 문서의 **이력 서술**뿐이고 코드 참조가 아니다. 필드 `rotatedAt` 자체는
`isRotated()` 로만 읽히고, 엔티티 주석(`RefreshToken.java:26-27`)이 "유예 창 판정은 이 필드가
아니라 응답 캐시가 한다" 를 남겨 두어 **판정 근거가 둘로 갈라질 여지를 코드에서 닫았다**.
S-17 에 새로 들어간 "엔티티의 `rotatedAt` 으로 유예 창을 다시 판정하지 않는다" 와 일치한다.

### D-4 — 재배치 후 계층 규칙 (S-4 · S-5)

- 컨트롤러는 `return authService.refresh(request.refreshToken());` 한 줄이다. **조합이 사라졌다.**
- 컨트롤러 시그니처·표현식 어디에도 엔티티 타입이 없다. `Consumer<User>` 는
  `AuthService` ↔ `RefreshTokenService` **서비스 사이에만** 남았다 — S-4 가 막는 것은
  엔티티가 컨트롤러 밖으로 나가는 것이므로 이 배치는 규칙 안이다.
- `assertCanStillSignIn` 이 private 이 되어 서비스 밖에서 이 정책을 배선할 방법 자체가 없어졌다.
- 쓰지 않게 된 `RefreshTokenService` 의존성이 컨트롤러에서 제거됐고, 왜 서비스가 하나뿐인지가
  필드 주석(`AuthController.java:45-50`)에 남았다.
- **트랜잭션 경계는 여전히 서비스**다 (S-6). `AuthService.refresh` 는 `@Transactional`(쓰기)이고
  `rotate` 가 그 트랜잭션에 합류한다. 읽기 전용은 `getMe` 하나 그대로다.
- **정지 계정의 403 경로는 유지된다.** `rotate` 5번 분기 → `assertCanStillSignIn` →
  `accountBlockedException` → `account_status` 확장 필드까지 경로가 그대로다. 이 시점에는
  아직 `markRotated` 전이라 영속성 컨텍스트가 더티하지 않아 403 예외의 롤백이
  버리는 것도 없다.

### D-6 — 생성 스펙과 계약의 문자열 대조

`server/build/openapi.json`(이번 `make contract-check` 산출물)에서 직접 뽑았다.

```
'갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).\n유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).\n서버가 직전 응답을 기억하지 못하면 200 이 아니라 401 `AUTH_REFRESH_TOKEN_REUSED` 다.\n'
```

계약 `contract.yaml` 의 블록 스칼라(`|`, 246-249행)와 **후행 개행까지 동일**하다.
나머지 5개 오퍼레이션의 `summary` · `operationId` · `description` 도 다시 대조해 차이 0건이고,
`security: []` 가 붙은 것은 계약과 같은 세 개(`signup` · `login` · `refreshToken`)뿐이다 (S-19).

---

## 리포트에 없던 수정 — `ReuseDetectionRevoker` 판정

**결론: 타당하다. 되돌리거나 다시 손댈 이유가 없다.**

개발자는 D-3 을 계약대로 고친 뒤 실제 서버에 요청을 보내, 401 `REUSED` 는 나오는데
`refresh_tokens.revoked_at` 이 전부 `null` 로 남는 것을 확인했다. 원인은 유예 창과 무관하다 —
`revokeAllByUserId`(벌크 UPDATE) 직후 던지는 `BusinessException` 이 **같은 트랜잭션을
롤백시키면서 그 UPDATE 까지 되돌린다.** 조치는 `ReuseDetectionRevoker`(신규,
`@Transactional(propagation = REQUIRES_NEW)`)가 폐기를 독립 트랜잭션에서 **먼저 커밋**하고
그다음 호출자가 401 을 던지는 것이다.

**리뷰 범위 안인가 — 그렇다.** 리뷰어 리포트에 없던 수정이지만 규칙 밖의 자유 변경이 아니다.
S-17 은 *"재사용이 감지되면 해당 계정의 모든 리프레시 토큰을 폐기한다"* 를 `[MUST]` 로 요구하는데,
고치기 전 코드는 그 폐기가 **응답 후 DB 에 남지 않았다** — 즉 S-17 이 이미 충족되지 않은 상태였다.
1차 리뷰가 이 분기를 "통과" 로 적은 것은 정적 판독의 한계였고(트랜잭션 롤백은 실행해야 드러난다),
이번 수정은 **규칙 위반을 실제로 되돌린 수정**이다.

규칙에 비추어 확인한 것:

1. **트랜잭션 경계 (S-6)** — `@Transactional` 이 컨트롤러나 리포지토리로 새지 않았다.
   `ReuseDetectionRevoker` 는 서비스가 호출하고 리포지토리를 부르는 **서비스 계층의 협력자**이며,
   S-17 이 이번에 그 배치를 이름까지 지목해 명시했다. S-6 의 취지(경계는 서비스 계층)는 유지된다.
2. **별도 빈으로 둔 판단** — 옳다. Spring 의 선언적 트랜잭션은 프록시로 동작하므로
   같은 빈 안에서 자기 메서드를 부르면 `REQUIRES_NEW` 가 **조용히 무시된다.** 대안인 자기 주입이나
   `AopContext.currentProxy()` 는 같은 결과를 더 알아보기 어렵게 만든다. 클래스 주석(`:18-19`)이
   이 이유를 남겨 두어, 다음 사람이 "메서드 하나인데 왜 빈을 나눴나" 하고 합치는 것을 막는다.
3. **잠금 충돌 없음** — 재사용 판정(3번 분기)은 `markRotated`(5번 분기)보다 앞이라 호출
   트랜잭션은 그 시점에 **아무것도 쓰지 않았다.** 같은 행을 두 트랜잭션이 잡는 상황이 생기지 않는다.
   주석의 설명과 코드의 실제 순서가 일치하는 것을 확인했다.
4. **영속성 부작용 없음** — `@Modifying(clearAutomatically, flushAutomatically)` 는
   `REQUIRES_NEW` 가 새로 연 컨텍스트에 적용된다. 호출 트랜잭션이 들고 있던 `RefreshToken` 은
   더티가 아니고 곧바로 롤백되므로 스테일 엔티티가 반영될 경로가 없다.
5. **범위가 최소다** — 같은 `revokeAllByUserId` 를 쓰는 `AuthService.deleteAccount` 는
   **성공 응답 경로**라 롤백 문제가 없고, 실제로 손대지 않았다. 필요한 곳 하나만 바꿨다.
6. **S-8** — 시각을 직접 읽지 않고 `Instant now` 를 인자로 받는다.

---

## S-17 에 추가된 세 항목 — 규칙으로 타당한가

`docs/conventions/` 는 모든 역할이 쓸 수 있고, `AGENTS.md` 는 *"구현 중 결정이 나면 같은
커밋에서 규칙을 추가"* 하라고 지시한다. 추가 자체는 절차상 정당하다. 내용은 아래와 같이 판단한다.

| 추가 항목 | 판정 | 근거 |
|---|---|---|
| ① 유예 창은 best-effort — 판정 근거는 "직전 응답을 캐시했는가" 하나 | **타당** | tech-lead 가 확정한 계약의 서버 측 이행 규칙이다. 계약 문장을 옮겨 적은 중복이 아니라, **다음 사람이 `rotatedAt` 으로 유예 창을 다시 판정해 같은 결함을 되살리는 것**을 막는 서술이 붙어 있다 — 이번 D-3 의 뿌리가 정확히 그것이었다 |
| ② 재사용 판정이 계정 상태 확인보다 먼저 선다 | **타당** | 계약 `POST /token/refresh` 233-234행에 명시된 사항이고, 코드로는 분기 순서 하나로만 표현되어 정적으로 놓치기 쉽다. 규칙으로 못 박는 편이 맞다 |
| ③ 전 기기 폐기는 별도 트랜잭션에서 커밋한다 | **타당** | 계약에서 파생된 것이 아니라 **실측으로 드러난 함정**이다. 증상(폐기가 사라진다) · 원인(예외가 트랜잭션을 되돌린다) · 해법(`REQUIRES_NEW`) · **왜 다른 빈이어야 하는지**(자기 호출은 프록시를 안 탄다)까지 적혀 있어, 규칙만 읽고도 재현·회피가 가능하다. 등급이 `[MUST]`(S-17 상속)인 것도 적절하다 — 어기면 AC-24 가 조용히 무력해지고 테스트 없이는 드러나지 않는다 |

세 항목 모두 S-17 의 하위 불릿이라 별도 등급 표기가 없는데, 기존 하위 항목들과 같은 형식이고
S-17 자체가 `[MUST]` 이므로 등급이 모호해지지 않는다.

**`[SHOULD]` 제안 (차단하지 않음)** — ③ 의 마지막 문장은
*"같은 함정은 '실패 응답을 내면서 무언가를 반드시 남겨야 하는' 모든 경우에 해당한다"* 로
일반화하는데, 그 문장이 **인증 절의 S-17 안에** 있다. auth 밖에서 같은 상황(실패 응답 + 감사 로그
남기기 등)을 만나는 사람은 여기까지 오지 않는다. **두 번째 사례가 나오는 시점에** 오류 처리 절의
독립 규칙으로 승격하기를 제안한다. 지금 옮기라고 요구하지 않는다 — 사례가 하나뿐인 규칙을
일반 절로 올리면 근거가 옅어진다. 이번 판정에는 영향이 없다.

---

## 새로 생긴 위반이 있는지 — 파일별 확인

| 파일 | 확인 결과 |
|---|---|
| `AuthController` | S-5 위임만 · S-4 엔티티 없음 · S-19 계약과 문자열 일치 · `@SecurityRequirements` 세 곳이 `PUBLIC_PATHS` 와 일치 (변경 없음) |
| `AuthService` | S-6 쓰기 트랜잭션(`refresh`), 읽기 전용은 `getMe` 하나 유지 · S-8 `Clock` · 오류는 전부 `BusinessException`(S-7) · 확장 필드 이름 상수 그대로(S-27) |
| `RefreshTokenService` | S-6 · S-8 · S-29(캐시 주석에 왜 DB 가 아닌지 + 다중 인스턴스 이전) 유지. 3번 분기 주석이 "왜 새 쌍을 발급하면 안 되는지" 까지 남겨 규칙과 코드가 같은 이야기를 한다 |
| `ReuseDetectionRevoker` | 위 판정 절 참조. S-2(같은 도메인 패키지, 순환 없음) · S-3(ArchUnit 통과) · S-8 · S-15(생성자 주입) |
| `RefreshToken` | 엔티티는 그대로 리포지토리/서비스 안에만 있다 (S-4). 삭제된 메서드의 잔여 참조 0건 |
| `SignupRateLimiter` | S-29 의 세 요건(왜 DB 가 아닌지 · 재기동 시 최악 · 다중 인스턴스 이전)을 다른 두 상태와 같은 수준으로 갖췄다. `status.md` ASK 8 과도 어긋나지 않는다 |

계약 정합성(C-5 · C-7 · C-8)은 `contract-check` 통과와 위 문자열 대조로 확인했다.
`snake_case` 경계(S-21)·확장 필드(S-27)·설정(S-28)은 이번 변경이 건드리지 않았다.

---

## 확인했지만 결함이 아닌 것 (근거를 남긴다)

절대 규칙 2 에 따라 **결함으로 올리지 않았다.** 규칙에 없거나, 확인해 보니 문제가 아니었다.

- **전 기기 폐기 후에도 유예 창 캐시는 10초간 같은 쌍을 재생한다.** 계정이 폐기된 직후
  10초 안에 직전 토큰이 오면 1번 분기가 200 을 낸다. 다만 그 응답은 **회전 시점에 이미 발급된
  쌍을 그대로 돌려주는 것**이라 새 토큰이 만들어지지 않는다 — 액세스 토큰의 만료 시각도
  그때 기준이라 노출 창이 늘지 않고, 리프레시 토큰은 DB 에서 이미 폐기되어 다음 갱신이 실패한다.
  계약이 "1번 분기는 그대로 둔다" 를 명시했고, 실질 노출이 커지지 않으므로 지적하지 않는다.
- **`rotate` 의 `java.util.function.Consumer<User>` 완전수식 표기** — import 하지 않고 인라인으로
  적었다. import 표기에 관한 규칙이 `server.md` 에 없다. Spotless 도 통과한다.
- **ArchUnit 규칙이 이름 접미사로 대상을 고른다.** `ReuseDetectionRevoker` 는
  `TokenIssuer` · `LoginAttemptGuard` · `SignupRateLimiter` 와 마찬가지로 `*Service` / `*Controller` /
  `*Repository` 가 아니라 S-3 · S-8 의 LINT 그물 밖에 있다. 이번 건은 **손으로 확인해 위반이 없다.**
  "서비스 계층 협력자의 이름 규칙" 은 지금 규칙에 없고, 하나의 사례로 규칙을 만들 근거가 약해
  추가하지 않았다.
- **`RefreshToken.tokenHash()` · `id()` 가 호출되지 않는다.** 1차 리뷰에서 다룬
  "사용되지 않는 공개 메서드" 와 같은 범주이고 관련 규칙이 없다.

---

## 다음 역할

`PASS` — **server-tester**. 재작업 루프는 **1회로 종료**됐다(상한 2회, `ESCALATE` 대상 아님).

server-tester 가 확인할 것은 `defects.md` D-3 의 "server-tester 가 확인할 것" 체크리스트 그대로이며,
특히 아래 두 가지는 **정적 리뷰로는 판정할 수 없어** 테스트 층에서 막아야 한다.

- 유예 창 안 + **캐시 없음** → 401 `AUTH_REFRESH_TOKEN_REUSED` 이고, 그 뒤 후속 토큰 B 도
  401 `AUTH_REFRESH_TOKEN_REVOKED` 인지 (AC-24 가 **DB 에 남았는지**까지 — 이번 롤백 결함이
  바로 이 지점이었다)
- 401 재사용 경로에서 **유효 리프레시 수가 늘지 않았는지**
