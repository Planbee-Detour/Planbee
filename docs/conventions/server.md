# 서버 코딩 규칙 (Java 21 / Spring Boot / PostgreSQL)

등급 정의는 `common.md` 참조. 규칙은 구현하면서 하나씩 추가한다.

**데이터베이스: PostgreSQL 17** (2026-08 확정). 로컬은 `make db-up`, 테스트는 Testcontainers.

---

## 구조

### S-1. 도메인별 패키지 구조 `[MUST]`

```
server/src/main/java/com/planbee/api/
├── <domain>/                    # 예: schedule, auth, health
│   ├── <Domain>Controller.java
│   ├── <Domain>Service.java
│   ├── <Domain>Repository.java
│   ├── <Domain>.java            # 엔티티
│   └── dto/                     # record
└── common/                      # 에러 처리, 설정, 공통 응답
```

루트 패키지는 `com.planbee.api` 다. 근거: 기능 단위 작업 시 변경 범위가 한 패키지로 모여
리뷰와 병렬 작업이 쉬움. (2026-08)

### S-2. 도메인 간 순환 의존 금지 `[LINT]`

- 도메인 패키지끼리 순환 참조하지 않는다. 공유가 필요하면 `common/` 으로 올린다.
- 강제: `ArchitectureTest.domainsAreFreeOfCycles`

## 레이어

### S-3. 레이어 의존 방향 `[LINT]`

- `Controller → Service → Repository`. 역방향과 건너뛰기(Controller → Repository) 금지.
- 강제: `ArchitectureTest` 의 controller/repository/service 규칙 3종

### S-4. 엔티티를 컨트롤러 밖으로 노출하지 않는다 `[MUST]`

- 요청/응답은 `dto/` 의 `record` 로만 주고받는다.
- 근거: 엔티티 변경이 API 계약을 무단으로 바꾸는 것을 막는다. (2026-08)

### S-5. 비즈니스 로직은 서비스에 둔다 `[MUST]`

- 컨트롤러는 입력 바인딩·검증·위임만 한다.

### S-6. 트랜잭션 경계는 서비스 `[MUST]`

- `@Transactional` 은 서비스 메서드에 붙인다. 읽기 전용에는 `readOnly = true`.

### S-15. 생성자 주입만 사용한다 `[LINT]`

- 필드에 `@Autowired` 를 붙이지 않는다.
- 강제: `ArchitectureTest.noFieldInjection`

## 영속성

### S-14. 스키마의 소유자는 Flyway `[MUST]`

- `spring.jpa.hibernate.ddl-auto=validate`. Hibernate 는 스키마를 만들지 않는다.
- 엔티티를 추가·변경하면 **같은 커밋에서** `src/main/resources/db/migration/V<n>__<설명>.sql` 을 추가한다.
- **이미 적용된 마이그레이션 파일은 수정하지 않는다.** 항상 새 버전을 추가한다.
  아직 어느 DB 에도 적용되지 않은 마이그레이션(같은 작업에서 방금 만든 것)은 예외다 —
  적용 이력이 없으므로 직접 고친다.
- **길이가 고정인 문자열도 `CHAR` 가 아니라 `VARCHAR` 를 쓴다.** Hibernate 는 `String` 필드를
  `varchar` 로 매핑하고 `validate` 가 `bpchar` 를 불일치로 잡아 **애플리케이션이 아예 뜨지 않는다.**
  길이 제약은 `VARCHAR(n)` 으로도 그대로 유지된다. (2026-08-26 확정, `auth` 의 `token_hash`)
- 근거: 마이그레이션 없이 엔티티만 바꾸면 애플리케이션이 기동되지 않으므로, 누락이 즉시 드러난다. (2026-08)

### S-16. `open-in-view` 는 false 를 유지한다 `[MUST]`

- 지연 로딩은 서비스의 트랜잭션 안에서 해결한다. 컨트롤러/직렬화 시점에 쿼리가 나가게 두지 않는다.

### S-23. 조회 방식 선택 기준 — Spring Data JPA 와 QueryDSL `[MUST]`

**QueryDSL 5.1.0** (Spring Boot BOM 관리 버전, `jakarta` classifier). 2026-08 도입.
`common.QuerydslConfig` 가 `JPAQueryFactory` 빈을 등록한다.

**어느 쪽을 쓰는가 — 판단 기준은 "조건이 실행 시점에 바뀌는가"다.**

| 상황 | 쓰는 것 |
|---|---|
| 단건·단순 조건 조회, 저장, 삭제 | Spring Data JPA 메서드 (`findByIdAndOwnerId`) |
| 조건이 고정된 짧은 조인 | `@Query` 또는 `@EntityGraph` |
| 조건이 **실행 시점에 달라지는** 조회 (필터·검색·정렬 조합) | QueryDSL |
| 다중 조인 + 페이징 | QueryDSL |
| 엔티티 전체가 아니라 **일부 컬럼만** 필요한 조회 | QueryDSL 프로젝션 |

- **메서드 이름으로 표현되는 조회에 QueryDSL 을 쓰지 않는다.** `findById` 를
  `queryFactory.selectFrom(...)` 으로 다시 쓰면 코드만 길어진다.
- **문자열을 이어붙여 JPQL 을 만들지 않는다.** 조건이 `if` 로 붙었다 떨어졌다 하면 QueryDSL 로 간다.
  동적 조건은 `BooleanExpression` 을 반환하는 private 메서드로 쪼개고 `where(...)` 에 나열한다.
  `where` 에 넘긴 인자가 `null` 이면 그 조건은 무시되므로, "값이 있을 때만 거는 조건"은
  `null` 을 반환하는 메서드로 표현한다. `BooleanBuilder` 에 `if` 를 쌓지 않는다.
- QueryDSL 코드는 **리포지토리 안에 둔다.** 서비스에서 `JPAQueryFactory` 를 직접 주입받지 않는다 (S-3).
  Spring Data 리포지토리와 함께 쓸 때는 `<Domain>RepositoryCustom` 인터페이스 +
  `<Domain>RepositoryImpl` 구현으로 붙인다 (이름 규칙을 지켜야 Spring Data 가 합쳐준다).

### S-24. Q타입은 생성물이다 — 커밋하지 않는다 `[LINT]`

- Q타입(`QSchedule` 등)은 `annotationProcessor` 가 컴파일할 때
  `server/build/generated/sources/annotationProcessor/java/main/` 에 만든다.
- 이 경로는 `server/.gitignore` 의 `build/` 로 이미 제외된다. **손으로 만들거나 수정하지 않는다.**
  엔티티를 고쳤는데 Q타입이 안 맞으면 `make test-server` 로 다시 컴파일하면 된다.
- **엔티티가 없으면 Q타입도 없다.** 새 엔티티를 추가하면 Flyway 마이그레이션도 같은 커밋에 넣는다 (S-14).
- 등급 근거: 커밋 대상이 아닌 것이 커밋되는 사고는 `.gitignore` 가 기계로 막는다 —
  리뷰어가 볼 필요가 없어 `[LINT]` 다.

### S-25. QueryDSL 조회는 N+1 을 만들지 않는다 `[MUST]`

- 연관을 함께 읽어야 하면 `join(...).fetchJoin()` 을 쓴다. 결과를 순회하며 게터로
  지연 로딩을 터뜨리지 않는다. (S-16 과 같은 이유 — `open-in-view=false` 라 밖에서는 아예 실패한다)
- **컬렉션 페치 조인과 페이징을 같이 쓰지 않는다.** Hibernate 가 전체를 메모리로 올린다.
  ID 만 페이징으로 뽑고 두 번째 쿼리에서 `in` 으로 채우거나, `@BatchSize` 를 쓴다.
- 페치 조인이 여러 컬렉션에 걸리면(`MultipleBagFetchException`) 쿼리를 나눈다.
- 등급 근거: "쿼리가 몇 번 나갔는가"는 실행해봐야 알 수 있어 정적 검사로 못 잡는다.
  server-tester 가 통합 테스트에서, 리뷰어가 페치 전략에서 막는다.

### S-26. 화면이 일부 필드만 쓰면 프로젝션 DTO 로 받는다 `[MUST]`

- `Projections.constructor(...)` 로 **전용 record 에 바로 담는다.** 엔티티를 통째로 읽어
  서비스에서 손으로 옮겨 담지 않는다.
- 프로젝션 대상은 `<domain>/dto/` 의 record 다. 응답 DTO 와 같은 것을 써도 되고,
  조회 전용 형태가 필요하면 따로 만든다. 어느 쪽이든 **엔티티는 리포지토리 밖으로 나가지 않는다** (S-4).
- `Tuple` 을 서비스나 컨트롤러로 반환하지 않는다. 필드 순서에 의존하는 코드가 되어
  컬럼이 하나 늘면 조용히 깨진다. 리포지토리 안에서 record 로 변환한다.
- S-22 의 화면 단위 조합은 대개 이 프로젝션으로 해결된다 — 여러 테이블의 필드를
  한 record 로 뽑아 한 번에 내린다.
- 등급 근거: "이 화면이 어떤 필드를 쓰는가"는 정적 검사 대상이 아니다. 리뷰어 판단 사항이다.

## 시각

### S-8. 시각은 주입받는다 `[LINT]`

- 서비스에서 `Instant.now()` / `LocalDateTime.now()` / `LocalDate.now()` 를 직접 호출하지 않는다. `Clock` 을 주입한다.
- 강제: `ArchitectureTest.servicesMustNotReadTheClockDirectly`
- DB 저장·연산은 UTC 로 한다 (`hibernate.jdbc.time_zone=UTC`). `common.md` C-2 참조.

## 오류 처리

### S-7. 예외를 던지고 한 곳에서 변환한다 `[MUST]`

- 컨트롤러에서 try-catch 로 오류 응답을 만들지 않는다. `BusinessException` 을 던진다.
- `common.error.GlobalExceptionHandler` 가 RFC 9457 ProblemDetail 로 변환한다. (`common.md` C-1)
- 401/403 은 필터 체인에서 발생해 이 핸들러를 타지 않는다.
  `common.security.SecurityProblemResponder` 가 같은 형식을 유지한다. 두 경로 중 하나만 고치면 형식이 갈라진다.
- 도메인 고유 실패는 자기 패키지에 `ErrorCode` 구현 enum 을 만든다.
  예: `com.planbee.api.schedule.ScheduleErrorCode`

## 계약 준수

### S-20. 엔드포인트는 계약에 먼저 추가한다 `[LINT]`

- `docs/api/openapi.yaml` 에 없는 엔드포인트를 구현해 노출하면 `make contract-check` 가 실패한다.
- 계약 추가는 tech-lead 가 한다. 구현자가 계약을 고치지 않는다.

### S-19. 응답 DTO 는 스키마를 명시한다 `[MUST]`

생성된 스펙이 계약과 대조 가능하려면 구현이 자기 스펙을 정확히 기술해야 한다.
아래를 빠뜨리면 `contract-check` 가 무의미해진다.

- **`Map` 을 반환하지 않는다.** 응답은 항상 `record` 로 만든다 — Map 은 스키마가 생성되지 않는다.
- 필드마다 `@Schema(requiredMode = REQUIRED)` 로 필수 여부를 명시한다.
  누락하면 모든 필드가 선택으로 생성되어, 모바일이 불필요한 널 체크를 하거나 반대로 크래시가 난다.
- `@GetMapping(produces = APPLICATION_JSON_VALUE)` 로 콘텐츠 타입을 고정한다. 없으면 `*/*` 로 생성된다.
- `@Operation(operationId = ...)`, `@Tag(name = ...)`, `@ApiResponse(description = ...)` 를
  계약에 적힌 값과 동일하게 붙인다.
- 공개 엔드포인트에는 `@SecurityRequirements` 를 붙여 `SecurityConfig.PUBLIC_PATHS` 와 일치시킨다.
- **오류 응답은 `@ApiResponse` 로 복제하지 않는다.** 계약(`docs/api/openapi.yaml`)이 전부
  기술하고 있고, 컨트롤러마다 6~7개씩 다시 적으면 두 곳이 갈라진다.
  `contract-check` 는 이를 `info` 로만 보고한다 — 실패가 아니다. (2026-08-26 확정)
- **생성 스펙이 계약과 같은 표기·표현으로 나오게 하는 책임은 `common.OpenApiConfig` 에 있다.**
  (2026-08-26 확정, `auth` 구현에서 발견)
  - springdoc 은 기본적으로 **자기 ObjectMapper** 로 모델을 해석한다. 그래서
    `spring.jackson.property-naming-strategy=SNAKE_CASE` 를 켜도 **런타임 응답만**
    `snake_case` 가 되고 생성 스펙은 `camelCase` 로 남는다. Spring 의 ObjectMapper 를 쓰는
    `ModelResolver` 빈을 등록해 둘을 묶는다.
  - 그 `ModelResolver` 는 **`.openapi31(true)`** 여야 한다. 빠뜨리면 3.1 표현이 전부 떨어져
    nullable 타입 배열과 객체의 `type` 이 사라진다.
  - **`@Schema(nullable = true)` 는 3.0 표기라 3.1 스펙에 반영되지 않는다.**
    `@Schema(types = {"string", "null"})` 로 적는다.
  - 이 셋이 어긋나면 `contract-check` 가 **"구현이 계약을 어겼다" 고 거짓 보고**하고,
    C-5 를 따르는 다음 사람이 멀쩡한 구현을 고치게 된다.

### S-32. `@Parameter(schema = @Schema(...))` 에는 `type` 을 반드시 적는다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` 구현 중 `nearby-places` 의 기존 결함으로 발견)

쿼리 파라미터의 제약(`minimum`/`maximum`/`enum`/`default`)을 애노테이션으로 적을 때
`type` 을 비워 두면 **springdoc 이 자동 추론한 타입을 애노테이션의 빈 스키마로 덮어쓴다.**
결과는 두 가지로 나타난다.

- `int` 파라미터가 `{"type": "string"}` 으로 생성된다.
- `@RequestParam(defaultValue = ...)` 도, `@Schema(defaultValue = ...)` 도 `default` 로 실리지 않는다.

런타임 동작은 멀쩡한데 **스펙만 어긋나** `make contract-check` 가
`request-parameter-default-value-removed`(ERR)로 실패한다. C-5 를 따르는 다음 사람이
멀쩡한 구현을 고치게 되므로 발견 즉시 막는다.

```java
// 잘못됨 — type: string 으로 나가고 default 가 사라진다
@Parameter(schema = @Schema(minimum = "1", maximum = "50", defaultValue = "20"))

// 올바름
@Parameter(schema = @Schema(type = "integer", minimum = "1", maximum = "50", defaultValue = "20"))
```

- 제약을 적을 필요가 없으면 **`schema` 자체를 쓰지 않는다.** `@Parameter(description = ...)` 만
  붙이면 타입·`format`·`default` 가 전부 자동으로 맞는다.
- 다만 자동 추론은 `format` 까지 붙인다(`int` → `format: int32`). 계약이 `format` 을 적지
  않았다면 `type` 을 명시하는 쪽이 계약과 정확히 같은 스키마를 만든다.
- 등급 근거: `contract-check` 가 잡기는 하지만 그때 나오는 메시지("default value was removed")가
  원인을 가리키지 않는다. 리뷰어가 애노테이션에서 바로 막는 편이 싸다.

### S-33. 목록은 커서 페이지네이션으로 만든다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` — 이 저장소의 첫 목록 구현)

계약이 정한 봉투는 `{ items, has_next, next_cursor }` + 그 화면이 필요로 하는 집계값이다.
서버 구현이 지켜야 할 것은 아래 넷이다.

- **오프셋을 쓰지 않는다.** 목록이 보면서 줄어들면(승인 한 건마다 앞이 빠진다)
  `offset` 은 이미 밀려난 위치를 가리켜 항목을 조용히 건너뛴다.
- **정렬 키와 동률 깨기 키를 함께 커서에 담는다.** 동률 깨기(보통 PK 내림차순)가 없으면
  같은 초에 들어온 두 행의 순서가 요청마다 달라져 항목이 새거나 겹친다.
  조건은 `키 < 커서키 OR (키 = 커서키 AND id < 커서id)` 한 식으로 붙인다.
- **`has_next` 는 세지 말고 한 건 더 읽어서 판단한다** (`limit = page_size + 1`).
  전체 개수를 세는 쿼리를 따로 내지 않고, `items.length == page_size` 로 추측하지도 않는다 —
  마지막 페이지가 정확히 `page_size` 면 그 추측이 틀린다.
- **커서는 불투명 문자열이다.** 인코딩 형식을 계약에 적지 않으며, 해석할 수 없는 값은
  400 으로 실패한다. 빈 목록이나 첫 페이지로 눙치면 무한 스크롤이 같은 항목을 반복해 그린다.
- 인덱스는 `(정렬 키 DESC, id DESC)` 로, 목록이 배타적 집합이면 부분 인덱스(`WHERE`)로 만든다.
- 등급 근거: 어겨도 첫 페이지는 멀쩡해 보인다. 두 번째 페이지에서야 드러나므로 리뷰어가 막는다.

### S-18. 새 에러 코드는 카탈로그에 등록한다 `[MUST]`

- 코드를 추가하면 **같은 커밋에서** `docs/api/error-codes.md` 에 등록한다.
- 카탈로그에 없는 코드를 응답에 쓰는 것은 계약 위반이다.
- 이미 배포된 코드 문자열은 바꾸지 않는다. 앱이 그 값으로 분기한다.

### S-21. 직렬화 경계에서만 `snake_case` 로 바꾼다 `[MUST]`

`common.md` C-7 의 서버 측 이행 방법이다.

- **Java 식별자는 `camelCase` 를 유지한다.** record 필드명을 `created_at` 으로 적지 않는다.
- 표기 변환은 **전역 설정 한 곳**에서 한다:
  `spring.jackson.property-naming-strategy=SNAKE_CASE`.
  DTO 마다 `@JsonProperty` 를 손으로 붙이지 않는다 — 빠뜨리면 응답에 두 표기가 섞인다.
  (2026-08-26 `auth` 구현에서 추가 완료)
- **숫자 경계는 예외다.** Jackson 의 `SnakeCaseStrategy` 는 글자와 숫자 사이에 밑줄을 넣지 않아
  `ageOver14Confirmed` 를 `age_over14_confirmed` 로 만든다. 계약이 정한 이름이 이와 다르면
  **그 필드에만** `@JsonProperty` 로 이름을 명시한다 — 전략을 바꾸거나 DTO 전체에 붙이지 않는다.
  검증 실패의 `errors[].field` 도 같은 이름으로 나가야 하므로,
  `GlobalExceptionHandler` 가 `@JsonProperty` 를 먼저 보고 없을 때만 SNAKE_CASE 를 적용한다.
  (2026-08-26 확정)
- 쿼리 파라미터·경로 변수도 대상이다. `@RequestParam("page_size") int pageSize` 처럼
  **바인딩 이름을 명시**한다. 이름을 생략하면 `pageSize` 로 노출된다.
- 생성되는 스펙(`make contract-export`)의 프로퍼티 이름이 계약과 다르면 구현을 고친다. (C-5)

### S-22. 응답은 화면 단위로 조합해서 내린다 `[MUST]`

`common.md` C-8 의 서버 측 이행 방법이다.

- 모바일이 두 번 호출해서 합쳐야 하는 응답을 만들지 않는다. 조합은 서비스의
  트랜잭션 안에서 끝낸다 (S-6, S-16).
- 표시용 파생값(거리, 소요시간, D-day, 상태 문구)은 서버가 계산해 응답 필드로 넣는다.
  계산에 현재 시각이 필요하면 `Clock` 을 주입받는다 (S-8).
- 조합 때문에 N+1 쿼리가 생기지 않게 한다. 페치 조인이나 단일 조회 쿼리로 해결한다.

### S-27. 오류 응답의 도메인 확장 필드는 예외에 실어 보낸다 `[MUST]`

(2026-08-26 확정, `auth` 구현)

RFC 9457 은 표준 필드 외의 멤버를 허용하고, 어떤 오류는 **화면을 그리는 데 필요한 값**을
그 자리에 실어야 한다 (`auth` 의 `account_status`, `lock_remaining_minutes`).

- 그 값은 `BusinessException.withExtension(name, value)` 로 붙인다. 헤더가 필요하면
  `withHeader(name, value)` 를 쓴다 (429 의 `Retry-After`).
- **확장 필드 이름은 계약에 적힌 그대로 넘긴다.** Map 키라 Jackson 의 snake_case 변환(S-21)을
  타지 않는다 — `accountStatus` 로 넘기면 그대로 나간다.
- **도메인별 예외 핸들러를 만들지 않는다.** `common` 이 각 도메인 패키지를 참조하게 되어
  S-2 의 순환 의존에 걸린다. 도메인은 값만 담고 변환은 여전히 한 곳에서 한다.

### S-28. 값이 없는 것이 정상인 설정만 기본값을 둔다 `[MUST]`

`common.md` C-4 는 "설정 파일에 기본값(fallback)을 두지 않는다" 고 한다 — 값이 없으면
즉시 실패해야 운영에서 개발용 키로 조용히 뜨는 사고가 없기 때문이다. (2026-08-26 확정)

**예외는 "비어 있는 것이 정상 동작인 설정" 하나다.**

- 예: `planbee.auth.support-contact-email=${SUPPORT_CONTACT_EMAIL:}` —
  문의 주소는 없으면 응답에 `null` 이 나가고 앱이 대체 안내로 바꾼다 (`auth` AC-43·AC-44).
  이걸 필수로 걸면 문의 창구를 아직 못 정한 상태에서 서버가 아예 뜨지 않는다.
- 예외를 쓸 때는 **계약에서 그 필드가 nullable 이어야 하고**, 설정 파일에 그 사실을
  주석으로 남긴다. 둘 중 하나라도 없으면 그냥 누락된 설정과 구분되지 않는다.
- `RequiredEnvironmentCheck.REQUIRED` 에 넣지 않는다.

### S-29. 프로세스 메모리에 두는 상태는 단일 인스턴스를 전제로 한다 `[MUST]`

(2026-08-26 확정, `auth` 구현)

`auth` 의 로그인 실패 카운터·가입 레이트 리밋·리프레시 유예 창 캐시는 프로세스 메모리에 있다.
각각 이유가 있다 — 잠금은 최대 10분짜리 임시 상태이고(PRD 가 "TTL 캐시" 로 지정),
유예 창 캐시에는 리프레시 토큰 **평문**이 담겨 DB 에 넣으면 해시 저장(S-17)의 의미가 사라진다.

- 이런 상태를 새로 만들면 **왜 DB 가 아닌지**를 코드 주석에 남긴다.
- **인스턴스를 2대 이상으로 늘리는 시점에 전부 공유 저장소로 옮겨야 한다.**
  그 목록을 기능의 `status.md` 배포 전 확인 항목에 적는다. 옮기지 않으면
  잠금이 인스턴스 수만큼 느슨해지고, 유예 창은 요청이 다른 인스턴스로 가는 순간
  재사용으로 오인되어 정상 사용자가 전 기기에서 로그아웃된다.

### S-31. 외부 HTTP API 호출 `[MUST]`

(2026-09-08 확정, `place` 도메인 — 한국관광공사 TourAPI)

- **클라이언트는 도메인 패키지 안에 둔다** (`com.planbee.api.place.tour.TourApiClient`).
  `common` 에 범용 HTTP 클라이언트를 만들지 않는다 — 외부 API 마다 인증 방식·오류 표현·
  응답 기벽이 달라 공통화하면 각 도메인이 그 추상화를 우회하게 된다.
- **타임아웃을 반드시 건다** (connect·read). 값은 `@ConfigurationProperties` 로 빼고 설정에 둔다.
  타임아웃 없는 외부 호출은 스레드 풀을 잠가 서버 전체를 멈춘다.
- **상류의 실패는 도메인 예외 하나로 바꿔 던진다.** HTTP 5xx·타임아웃·바디 없음·
  그 API 고유의 오류 표현(TourAPI 의 `resultCode`)을 전부 같은 코드로 (`PLACE_UPSTREAM_UNAVAILABLE`).
  서비스·컨트롤러는 원인을 구분하지 않는다 (S-7). 상태 코드는 `500` — C-1 이 502/503 을 허용하지 않는다.
- **응답이 기대 형태가 아닐 수 있다고 가정한다.** TourAPI 는 결과가 없을 때 `items` 를 객체가
  아니라 빈 문자열로 준다. 레코드로 바로 역직렬화하지 말고 `JsonNode` 로 방어적으로 읽거나
  관대한 매퍼를 쓴다.
- **키는 환경변수, `RequiredEnvironmentCheck` 에 등록** (C-4). 서비스 키가 인코딩/디코딩 두 형태로
  발급되면 어느 쪽을 넣어야 하는지 `@ConfigurationProperties` javadoc 과 `.env.example` 에 적는다.
- **외부 쿼터가 있으면 캐시한다.** 좌표·필터 조합을 키로 TTL 캐시 (`spring.cache` + Caffeine).
- 재시도·서킷브레이커는 필요해지면 추가한다 — 첫 구현에서는 타임아웃 + 도메인 예외로 충분하다.
  추가할 때 이 규칙을 갱신한다.

## 인증 / 인가

### S-17. 이메일 + 비밀번호, 자체 발급 JWT `[MUST]`

2026-08 확정. 소셜 로그인은 범위 밖이며, 도입 시 이 항목을 갱신한다.

- **비밀번호**: `PasswordEncoder`(위임 인코더, 기본 bcrypt)로만 저장한다. 평문·역산 가능한 형태 금지.
- **토큰 발급**: 자체 발급. 대칭키 HS256 (`planbee.security.jwt.secret`).
  외부 서비스가 토큰을 검증해야 하는 시점이 오면 RSA 키쌍으로 바꾼다.
- **토큰 검증**: `oauth2-resource-server` 에 맡긴다. **커스텀 JWT 필터를 직접 만들지 않는다.**
  근거: 커스텀 인증 필터는 보안 결함이 가장 자주 발생하는 지점이다. (2026-08)
- **수명**: 액세스 30분, 리프레시 14일. `application.properties` 에서 조정한다.
- **기본 정책은 거부**다. 공개 경로는 `SecurityConfig.PUBLIC_PATHS` 에만 명시적으로 추가한다.
  새 엔드포인트를 만들 때 아무것도 안 하면 인증이 필요한 상태가 된다 — 이게 의도된 기본값이다.
- **시크릿**: 운영에서는 `JWT_SECRET` 환경변수로 주입한다. 저장소의 기본값은 로컬 전용이다.
- **리프레시 토큰**: 저장 시 해시하고, 사용 시 회전(rotation)한다. 재사용이 감지되면 해당 계정의
  모든 리프레시 토큰을 폐기한다. (2026-08-26 `auth` 에서 적용 — `RefreshTokenService`)
  - 해시는 **SHA-256** 이다. 비밀번호와 달리 bcrypt 를 쓰지 않는 이유: 값이 서버가 만든
    난수라 사전 공격 대상이 아니고, 매 갱신마다 해시로 **조회**해야 하는데 bcrypt 는
    salt 때문에 결정론적이지 않아 인덱스를 걸 수 없다.
  - 회전에는 **유예 창**을 둔다. 없으면 네트워크 타임아웃만으로 정상 사용자가 전 기기에서
    로그아웃된다. 유예 창 안의 재시도에는 **같은 토큰 쌍을 다시** 돌려준다 —
    매번 새로 발급하면 재시도할 때마다 유효 토큰이 늘어난다.
  - **유예 창은 best-effort 이고, 판정 근거는 "직전 응답을 캐시했는가" 하나뿐이다.**
    (2026-08-27 확정 — `auth` defects.md D-3, 계약 `POST /api/v1/auth/token/refresh`)
    서버는 회전된 토큰의 후속 평문을 갖고 있지 않으므로 캐시가 없으면 같은 쌍을 만들어 낼
    수단이 없다(재기동·캐시 정리·다른 인스턴스). 그때는 **닫히는 쪽으로 실패한다** —
    유예 창 안이라도 재사용으로 보고 계정의 모든 리프레시를 폐기한다.
    이 경로에서 **새 토큰 쌍을 발급하거나 원본 토큰만 로그아웃으로 폐기하지 않는다**:
    전자는 유효 토큰을 늘리고, 후자는 이후의 진짜 재사용이 `REUSED` 대신 `INVALID` 로
    걸러지게 만들어 전 기기 폐기를 무력화한다.
    엔티티의 `rotatedAt` 으로 유예 창을 다시 판정하지 않는다 — 근거가 둘로 갈라지는 순간
    두 판정이 어긋난다.
  - **재사용 판정은 계정 상태 확인보다 먼저 선다.** 재사용으로 걸린 요청은 계정 상태와
    무관하게 401 이다 (403 이 아니다).
  - **전 기기 폐기는 별도 트랜잭션에서 커밋한다** (2026-08-27 확정, 실측으로 확인).
    재사용을 감지한 요청은 401 예외로 끝나는데 예외는 트랜잭션을 되돌린다 — 같은 트랜잭션
    안에서 폐기하면 그 폐기까지 함께 사라져 **다른 기기가 계속 갱신된다.**
    `REQUIRES_NEW` 로 먼저 커밋한 뒤 예외를 던진다. 자기 호출은 프록시를 타지 않아
    전파 속성이 무시되므로 그 메서드는 **다른 빈**에 있어야 한다
    (`auth` 의 `ReuseDetectionRevoker`).
    같은 함정은 "실패 응답을 내면서 무언가를 반드시 남겨야 하는" 모든 경우에 해당한다.
  - **폐기 사유를 함께 저장한다.** 로그아웃으로 폐기된 것과 재사용 감지로 폐기된 것은
    앱이 띄우는 안내가 다르다 (`auth` AC-24 의 보안 배너).
- **스코프**: 액세스 토큰의 `scope` 클레임은 `common.security.TokenScope` 가 소유한다.
  Spring 의 기본 변환기가 `SCOPE_<값>` 권한으로 바꿔 주므로 경로별 인가를 `SecurityConfig`
  에서 선언으로 건다. 세션 전체를 주지 않고 **한 가지 동작만 허용해야 하는 토큰**이 필요하면
  새 스코프를 여기 추가한다 (`auth` 의 `account:delete` 가 그 예다).

### S-34. 역할 기반 인가는 경로에 선언으로 건다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` — 아래 "미확정" 의 인가 모델 항목을 닫는다)

역할(`UserRole`)이 필요한 기능이 생겼다. 소유자 검사만으로는 부족한 경우다.

- **역할은 액세스 토큰의 `role` 클레임에 담고**(`common.security.JwtClaims.ROLE`),
  `SecurityConfig` 의 `JwtAuthenticationConverter` 가 `ROLE_<값>` 권한으로 바꾼다.
  커스텀 인증 **필터**를 만드는 것과 다르다 — 검증은 여전히 oauth2-resource-server 가 한다 (S-17).
- **검사는 경로 단위로 `SecurityConfig` 에 선언한다.** 서비스 안에서 역할을 확인하지 않는다.
  방어선이 컨트롤러보다 앞에 있어야 그 경로에 엔드포인트가 하나 늘 때 검사를 빠뜨려도 막힌다.
  스코프와 역할을 함께 요구할 때는 `AuthorizationManagers.allOf(...)` 로 묶는다.
- **매 요청 DB 로 역할을 다시 읽지 않는다.** 무상태 검증을 상태 검증으로 바꾸게 되고 (S-17),
  앱에 역할을 바꾸는 경로가 없어 토큰 수명(30분) 안의 지연이 문제가 되지 않는다.
  역할 변경을 즉시 반영해야 하는 요구가 생기면 이 항목을 다시 연다.
- **필터 체인에서 나가는 403 의 `code` 를 갈라야 하면 `ForbiddenCodeResolver` 를 구현한다.**
  이 실패는 `GlobalExceptionHandler` 를 타지 않으므로 도메인이 코드를 정할 자리가 필요하다.
  공통 계층이 도메인 에러 enum 을 직접 참조하면 S-2 의 순환 의존에 걸린다 (S-27 과 같은 해법).
- 등급 근거: 빠뜨려도 인증은 걸려서 "그럴듯하게" 동작한다. 역할만 통과하는 사고는
  테스트가 없으면 드러나지 않아 리뷰어가 막는다.

## 포매팅

### S-13. Spotless 관리 항목 `[LINT]`

- 사용하지 않는 import 제거, import 순서, 후행 공백, 파일 끝 개행.
- 자동 정리: `make format-server`
- 전체 코드 포매터(google-java-format 등)는 아직 도입하지 않았다. 기존 스타일(탭 들여쓰기)을 따른다.

## 테스트 (server-tester)

### S-9. 실제 DB로 테스트한다 `[MUST]`

- DB가 필요한 테스트에는 `@IntegrationTest` 를 붙인다 (Testcontainers + PostgreSQL). 인메모리 DB로 대체하지 않는다.
- DB가 필요 없는 테스트는 `@WebMvcTest` 등 슬라이스로 작성한다.
- 실행 분리: `make test-server` (Docker 불필요) / `make test-server-db` (Docker 필요)
- 근거: 전체 테스트가 Docker를 요구하면 피드백 루프가 느려지고, 슬라이스만 있으면 스키마 오류를 놓친다. (2026-08)

### S-10. 실패 케이스를 포함한다 `[MUST]`

- 잘못된 입력, 권한 없음, 없는 리소스, 중복 생성을 각각 검증한다.
- 해피패스만 있는 테스트는 완료로 인정하지 않는다.

### S-11. 관측 가능한 결과를 검증한다 `[MUST]`

- 서비스가 어떤 메서드를 몇 번 불렀는지가 아니라, **응답과 저장 결과**를 검증한다.

### S-12. 테스트 이름에 AC를 명시한다 `[SHOULD]`

- 예: `AC3_만료된_토큰으로_호출하면_401을_반환한다`
- **테스트 메서드명은 예외적으로 한국어를 허용한다.** (그 외 코드 식별자는 영어)

### S-30. 슬라이스 테스트는 대상을 명시한다 `[MUST]`

(2026-08-27 확정, `auth` 의 `defects.md` D-1 에서 확인)

- `@WebMvcTest` 에 **대상 컨트롤러를 반드시 적는다** — `@WebMvcTest(HealthController.class)`.
  대상을 비우면 애플리케이션의 **모든** 컨트롤러를 올리려 하므로, 도메인이 하나 늘 때마다
  무관한 슬라이스 테스트가 `NoSuchBeanDefinitionException` 으로 깨진다.
  실제로 `auth` 컨트롤러가 생기면서 `GlobalExceptionHandlerTest` 3건이 그렇게 깨졌다.
- **깨진 것을 목(mock)으로 메우지 않는다.** 새 도메인의 서비스를 목으로 채워 넣으면 그
  테스트가 자기와 상관없는 도메인의 의존성 목록을 들고 다니게 되고, 다음 도메인에서 또 깨진다.
  고칠 곳은 목이 아니라 **범위**다.
- 공통 관심사(오류 응답 형식·필터 체인 등)를 보는 테스트는 **테스트 안에 둔 최소 컨트롤러**를
  대상으로 삼는다. 그러면 검증 대상이 도메인과 무관해진다
  (`GlobalExceptionHandlerTest.TestController`).
- 같은 이유로 `@DataJpaTest` 등 다른 슬라이스도 대상을 좁힌다. 범위를 좁힐 수 없으면
  슬라이스가 아니라 `@IntegrationTest` 로 간다 (S-9).
- 등급 근거: 컴파일이나 린터가 잡지 못하고, 어겨도 **그 시점에는 초록**이라 다음 도메인을
  만드는 사람이 대신 밟는다. 리뷰어가 막아야 한다.

---

## 미확정

- **소셜 로그인**(Apple/Google) 도입 여부 — 현재 범위 밖
- ~~**인가 모델**: 역할(Role) 기반이 필요한지~~ → **확정 (2026-09-09).**
  `admin-user-approval` 이 관리자 전용 경로를 도입하면서 역할 기반 인가를 쓴다. S-34 참조.
