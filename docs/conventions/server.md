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
  — TODO: 현재 `application.properties` 에 이 설정이 없다. Jackson 기본값은 Java 필드명을
  그대로 노출하므로, 두 단어 이상 필드를 가진 **첫 DTO 를 만드는 커밋에서** 추가한다.
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
  모든 리프레시 토큰을 폐기한다. — TODO: 인증 기능 구현 시 적용

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

---

## 미확정

- **소셜 로그인**(Apple/Google) 도입 여부 — 현재 범위 밖
- **인가 모델**: 역할(Role) 기반이 필요한지 — 개인용 앱이면 소유자 검사로 충분할 수 있음
