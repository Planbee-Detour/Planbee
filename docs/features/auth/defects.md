# 결함 · 요청 리포트: `auth`

역할끼리 직접 고치지 않고 여기에 남긴다. 소유가 아닌 경로를 건드려야 할 때도 여기에 적는다.
해소된 항목은 지우지 않고 상태만 바꾼다 — 왜 그렇게 됐는지가 다음 사람에게 필요하다.

---

## D-1. `GlobalExceptionHandlerTest` 의 `@WebMvcTest` 범위를 좁혔다

- **올린 역할**: server-developer (2026-08-26)
- **받는 역할**: server-tester
- **상태**: **해소 (2026-08-27, server-tester 확인).** 범위 지정은 의도와 맞고, 슬라이스 테스트의
  대상 명시를 `server.md` **S-30 `[MUST]`** 로 승격했다. 판단 근거는 이 파일 말미의
  "server-tester 섹션" 참조.

### 무슨 일이

`auth` 컨트롤러가 생기면서 `GlobalExceptionHandlerTest` 3건이 전부 실패했다.
대상을 지정하지 않은 `@WebMvcTest` 는 애플리케이션의 **모든** 컨트롤러를 올리려 하는데,
`AuthController` 의 의존성(`AuthService`, `RefreshTokenService`)이 슬라이스 컨텍스트에 없어
`NoSuchBeanDefinitionException` 이 났다.

### 왜 직접 고쳤나

`server/src/test/` 는 server-tester 소유라 원칙적으로는 리포트만 남기는 게 맞다.
다만 server-developer 의 완료 게이트가 `make verify-server` 통과이고, 이건 **내 변경이 깨뜨린
기존 테스트**다. 리포트만 남기면 게이트가 빨간 채로 다음 역할에 넘어간다.

고친 범위는 한 줄이다 — `@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)`.
테스트가 보려는 것은 오류 응답의 **형식**이고 컨트롤러가 무엇이든 상관없으므로 의도는 그대로다.
오히려 도메인이 늘 때마다 이 테스트가 깨지는 구조를 없앴다.

### server-tester 가 확인할 것

- 이 범위 지정이 의도와 맞는지. 다른 슬라이스 테스트를 추가할 때도 **대상을 명시**하는 것을
  기본으로 삼을지 판단해서, 그렇다면 `server.md` 에 규칙으로 올려 달라.

---

## D-2. 통합 테스트와 계약 검증 (미실행 → 실행 후 결함 2건 수정)

- **올린 역할**: server-developer / mobile-developer (2026-08-26)
- **받는 역할**: 사람 (환경), 이후 server-tester
- **상태**: **해소 (2026-08-26).** Docker 기동 후 전부 실행했고 **실제로 결함 2건이 나왔다.**
  아래 "실행 결과" 참조. `make verify` 전체 통과 상태다.

### 무슨 일이

`make test-server-db` 와 `make contract-check` 는 Docker 데몬을 요구하는데 실행 환경에서
Docker 가 꺼져 있어 돌리지 못했다. 그래서 **아직 기계로 확인되지 않은 것**이 셋 있다.

1. **Flyway 마이그레이션과 엔티티 매핑의 일치** — `ddl-auto=validate` 라 어긋나면 서버가 아예 뜨지 않는다.
   `V2__create_auth.sql` 은 이번에 처음 만든 파일이고 아직 한 번도 적용된 적이 없다.
2. **구현 스펙과 계약의 대조**(`make contract-check`) — 특히 `oneOf` 를 걷어내고 타입 배열로
   바꾼 nullable 표현(계약 말미 "계약 표현의 제약" 참조)이 springdoc 출력과 실제로 같은지.
3. **서버가 기동되는지 자체** — 컴파일과 슬라이스 테스트는 통과했지만 컨텍스트 로딩은 미검증이다.

### 다음 사람이 할 것

Docker 를 켠 뒤 순서대로:

```
make db-up
make test-server-db
make contract-check      # contract-export 를 먼저 부른다
```

`contract-check` 가 실패하면 **계약이 아니라 구현을 고친다** (C-5). 다만 위 2번처럼
"계약이 springdoc 이 낼 수 없는 형태로 적힌" 경우라면 그건 계약 쪽 문제이므로
tech-lead 에게 돌려보낸다 — 판단 기준은 계약 말미의 그 절에 적어 두었다.

### 실행 결과 (2026-08-26)

미실행 상태로 넘겼다면 리뷰어가 아니라 **런타임에서** 발견됐을 것들이다.

#### (1) 스키마 검증 실패 — 서버가 아예 뜨지 않았다

```
Schema-validation: wrong column type encountered in column [token_hash] in table [refresh_tokens];
  found [bpchar (Types#CHAR)], but expecting [varchar(64) (Types#VARCHAR)]
```

`V2__create_auth.sql` 이 `CHAR(64)` 로 선언했는데 Hibernate 는 `String` 필드를 `varchar` 로
매핑한다. `ddl-auto=validate` 가 이를 불일치로 잡아 **컨텍스트 로딩 자체가 실패**했다.

- **조치**: `V2` 를 `VARCHAR(64)` 로 수정했다. 이 마이그레이션은 아직 어떤 DB 에도 적용된 적이
  없어(Testcontainers 는 매번 새로 만든다) 새 버전을 만들지 않고 직접 고쳤다 — S-14 의
  "적용된 마이그레이션은 수정하지 않는다" 에 해당하지 않는다.
  길이 제약은 `VARCHAR(64)` 로도 그대로 유지된다.

#### (2) 생성 스펙이 계약과 어긋났다 — 세 가지 원인

`make contract-check` 가 오류 20여 건을 냈다. **런타임 응답은 계약대로였고, 어긋난 것은
springdoc 이 생성하는 스펙이었다.** 그대로 뒀다면 게이트가 "구현이 계약을 어겼다" 고
거짓 보고하고, C-5 를 따르는 다음 사람이 멀쩡한 구현을 고치게 된다.

| 원인 | 증상 | 조치 |
|---|---|---|
| springdoc 이 **자기 ObjectMapper** 로 모델을 해석한다 | 응답은 `refresh_token` 인데 스펙은 `refreshToken` | `OpenApiConfig` 에 Spring 의 ObjectMapper 를 쓰는 `ModelResolver` 빈 등록 |
| 그 `ModelResolver` 를 **`openapi31(true)` 없이** 만들면 3.1 표현이 떨어진다 | nullable 타입 배열과 객체의 `type` 이 사라짐 | `.openapi31(true)` 추가 |
| `@Schema(nullable = true)` 는 **3.0 표기**라 3.1 스펙에 반영되지 않는다 | `signup_reason`·`version`·`applied_at`·`support_contact_email` 이 not-nullable 로 생성 | `@Schema(types = {"string", "null"})` 로 교체 |

함께 나온 두 건도 처리했다.

- **`AccountStatusView.status` 에 `APPROVED` 가 섞였다.** DTO 가 `UserStatus`(4종)를 그대로
  노출한 탓이다. 이 화면에 `APPROVED` 는 도달할 수 없으므로(세션을 받는다) 모바일이
  다루지 않아도 될 분기를 만들게 된다. → `BlockedAccountStatus`(3종) 를 새로 두어
  불변식을 런타임 예외가 아니라 **타입**으로 표현했다.
- **`refresh_token` 의 `minLength`** — 구현이 `@NotBlank` 로 더 엄격했다. 구현이 틀린 게
  아니라 계약이 덜 적은 경우라, 계약에 `minLength: 1` 을 더해 실제 동작을 기술하게 했다.

#### 남은 `info` 항목은 실패가 아니다

`contract-check` 가 "계약에만 있고 구현 스펙에는 없다" 로 보고하는 것은 **오류 응답
(400/401/403/409/429/500)** 이다. 이 응답들은 `@ApiResponse` 로 선언하지 않고
`GlobalExceptionHandler` 가 런타임에 만든다. 계약이 전부 기술하고 있으므로 모바일이
구현할 근거는 충분하고, 컨트롤러마다 30여 개의 애노테이션으로 계약을 복제하지 않기로 했다.
`scripts/contract-check.sh` 도 이를 정보로만 보고한다.

---

# mobile-reviewer 섹션 (2026-08-27)

`docs/features/auth/review/mobile-review.md` 의 **FAIL** 판정 근거다. 번호는 모바일 접두어
`D-M*` 를 쓴다 — server-reviewer 가 같은 파일에 동시에 쓰고 있어 충돌을 피하기 위함이다.
전부 `docs/conventions/mobile.md` 에 적힌 `[MUST]` 규칙 위반이고, 코드는 고치지 않았다.

### D-M1 [High] 토큰 경계 변환이 화면 코드에서 반복된다

- 상태: **해소 (2026-08-27, mobile-developer 재작업 1회차)**
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치:
  - `mobile/src/features/auth/screens/LoginScreen.tsx:84-87`
  - `mobile/src/features/auth/screens/SplashScreen.tsx:47`
  - (정본) `mobile/src/app/configureSession.ts:33`
- 근거: `conventions/mobile.md` **M-17** — "경계와 내부 모델의 변환은 한 곳에서만 한다.
  그 변환은 `app/configureSession.ts` **하나**에 있다. 화면이나 기능 코드가 같은 변환을
  다시 하지 않는다." (2026-08-26, 이번 작업에서 확정한 문장)
- 기대: 화면은 `TokenPair` 를 그대로 넘기고, `access_token` → `accessToken` 매핑은
  `app/configureSession.ts` 한 곳에만 존재한다.
- 실제: 두 화면이 `saveTokens({accessToken: x.access_token, refreshToken: x.refresh_token})` 로
  같은 변환을 각자 한다. 저장 모델이나 토큰 필드가 바뀌면 고칠 곳이 세 곳이 된다.
- 수정 방향(예시): `configureSession.ts` 에 `persistTokenPair(pair: TokenPair)` 처럼 변환을
  포함한 함수를 두고 화면은 그것만 부른다. 화면이 `shared/api/session.ts` 의 `saveTokens` 를
  직접 부르지 않게 하면 규칙이 구조로 지켜진다.

- **조치**: 변환 함수를 `mobile/src/shared/api/session.ts` 로 옮겼다 — `toTokens(pair)` 하나가
  `access_token`/`refresh_token` → `Tokens` 를 맡고, 저장은 그것을 감싼 `saveTokenPair(pair)` 다.
  `LoginScreen` · `SplashScreen` · `app/configureSession.ts` 셋 다 이제 필드를 풀어 쓰지 않는다.
  변환이 있는 곳은 `grep 'access_token'` 기준으로 `session.ts` 한 줄뿐이다.
- **왜 `app/configureSession.ts` 가 아닌가**: 리포트가 제시한 예시(`persistTokenPair` 를 거기 두고
  화면이 부른다)는 화면이 `features/` → `app/` 을 import 하게 만들어 **D-M3(M-2 역방향 금지)와
  정면으로 충돌한다.** 저장 모델(`Tokens`)을 정의한 모듈이 그 변환도 갖는 배치가 두 규칙을 모두
  만족한다. M-17 의 "한 곳" 이라는 요건은 그대로다.
- **규칙 갱신**: `conventions/mobile.md` M-17 의 위치 문장을 `shared/api/session.ts` 로 정정하고,
  왜 `app/` 이 아닌지를 근거와 함께 남겼다.

### D-M2 [High] 색상 리터럴 `#RRGGBB` 3곳

- 상태: **해소 (2026-08-27, mobile-developer 재작업 1회차)**
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치:
  - `mobile/src/shared/ui/Button.tsx:67` — `color={variant === 'secondary' ? '#171717' : '#FFFFFF'}`
  - `mobile/src/shared/ui/TextField.tsx:52` — `placeholderTextColor="#737373"`
  - `mobile/App.tsx:20` — `<StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />`
- 근거: `conventions/mobile.md` **M-16** — "화면 코드에 `#RRGGBB` 를 직접 쓰지 않는다.
  `tailwind.config.js` 의 토큰 이름을 쓴다." 예외 조항 없음. `common.md` **C-9** 도 같은 방향
  (값의 원본은 pen, `tailwind.config.js` 는 그 사본, 코드는 사본을 참조).
- 기대: 세 값이 전부 `tailwind.config.js` 의 토큰(`ink` `on-dark` `ink-muted` `background`)에서 온다.
- 실제: 값이 코드에 박혀 있다. 이번 변경에서 `tailwind.config.js` 를 pen 값으로 교정했는데
  이 세 곳은 그 교정을 따라오지 않는다 — 다음 토큰 변경 때 조용히 어긋난다.
- 참고: `color` / `placeholderTextColor` / `backgroundColor` 가 `className` 을 받지 못하는 것은
  사실이나(주석에 적힌 대로), 그건 "리터럴을 쓴다" 가 아니라 "토큰 값을 코드에서 읽어 온다" 로
  풀어야 한다. `tailwind.config.js` 의 `theme.extend.colors` 를 import 해 쓰거나, 그 값을
  한 모듈로 노출해 두면 원본이 하나로 유지된다.

- **조치**: 토큰 **값**을 `mobile/tailwind.tokens.js` 로 분리하고 `tailwind.config.js` 가 이를
  `require` 하도록 바꿨다. 앱 코드는 `src/shared/ui/tokens.ts` 의 `COLOR` 로 같은 파일을 읽는다.
  - `Button.tsx` — `color={variant === 'secondary' ? COLOR.ink : COLOR.onDark}`
  - `TextField.tsx` — `placeholderTextColor={COLOR.inkMuted}`
  - `App.tsx` — `<StatusBar backgroundColor={COLOR.background} />`
  `src/` 와 `App.tsx` 에 남은 `#RRGGBB` 는 0건이다.
- **왜 `tailwind.config.js` 를 직접 import 하지 않았나**: 그 파일은 최상단에서
  `require('nativewind/preset')` 을 한다 — 빌드 도구용 모듈이라 앱 번들에 넣으면 tailwindcss 의
  Node 전용 의존성이 딸려 와 Metro 번들이 깨진다. 그래서 의존성 없는 값 모듈을 하나 두고
  config 와 앱이 **같은 파일**을 읽게 했다. 값을 고칠 곳은 여전히 하나다.
- **규칙 갱신**: M-16 의 "코드 측 단일 원본" 을 `tailwind.tokens.js` 로 정정하고,
  "className 을 못 받는 prop 도 리터럴의 사유가 되지 않는다" 를 명시했다.

### D-M3 [High] `features/` 가 `app/` 을 import 한다 (의존 방향 역행)

- 상태: **해소 (2026-08-27, mobile-developer 재작업 1회차)**
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `mobile/src/features/auth/screens/` 8개 파일
  (`LoginScreen:22` · `SignUpScreen:19` · `SplashScreen:16` · `AccountStatusScreen:17` ·
  `AccountDeleteScreen:23` · `LegalDocumentScreen:17` · `SettingsScreen:19` · `HomeScreen:14`)
  — 전부 `import type {AuthStackParamList|MainStackParamList} from '.../app/navigation/types'`
- 근거: `conventions/mobile.md` **M-2** — "의존 방향: `app/` → `features/` → `shared/`. **역방향 금지.**"
  (예외 조항 없음. `eslint-plugin-boundaries` 미도입이라 현재는 리뷰어가 막는 `[MUST]` 다)
- 기대: `features/` 는 `shared/` 만 바라본다.
- 실제: `app/navigation/types.ts` 가 `features/auth/types` 를 import 하고, 화면 8개가 반대로
  `app/navigation/types` 를 import 해 두 계층이 서로를 가리킨다. `app/providers.tsx` 의
  주석("기능(features/)은 이 계층에 의존하지 않는다. (mobile.md M-2)")과도 어긋난다.
- 수정 방향(예시): 파라미터 목록 타입을 `features/auth/navigation.ts` 처럼 기능 안에 두고
  `app/navigation/types.ts` 가 그것을 **조합**한다. 그러면 화면은 자기 기능 안의 타입만 보고
  방향이 `app/ → features/` 로 유지된다.
- 참고: 타입 전용 import 라 런타임 의존은 없다. 다만 M-2 는 그 구분을 두지 않았고, 실제로
  두 번째 기능이 생기면 이 파일이 기능 간 결합 지점이 된다. 규칙에 예외를 두는 편이
  낫다고 판단되면 코드가 아니라 `mobile.md` M-2 를 먼저 고쳐야 한다.

- **조치**: 파라미터 목록을 `mobile/src/features/auth/navigation.ts` 로 옮겼다
  (`AuthRouteParams` · `MainRouteParams` · `LegalOrigin` · `AccountDeleteOrigin`).
  `app/navigation/types.ts` 는 그것을 조합해 `AuthStackParamList` / `MainStackParamList` 를 만든다.
  화면 8개는 이제 `import type {AuthRouteParams} from '../navigation'` 만 본다.
  `src/features/` 에서 `app/` 을 가리키는 import 는 0건이다 (타입 포함).
- **규칙 갱신**: M-2 에 "타입 전용 import 도 예외가 아니다" 와 "내비게이션 파라미터 목록은
  기능이 선언하고 `app/` 이 조합한다" 를 추가했다 — 두 번째 기능이 화면을 더할 때
  `AuthRouteParams & OtherRouteParams` 로 넓히면 된다.

### D-M4 [High] 접근성 낭독이 안드로이드 전용 API 로만 구현됐다

- 상태: **해소 (2026-08-27, mobile-developer 재작업 1회차)**
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치:
  - `mobile/src/shared/ui/Toast.tsx:21` — `accessibilityLiveRegion="polite"` (안드로이드 전용 prop)
  - `mobile/src/features/auth/screens/SplashScreen.tsx:152` — 같음
  - `mobile/src/shared/ui/Banner.tsx` — 낭독 처리가 양쪽 다 없다 (`accessibilityRole="alert"` 만)
  - `mobile/src/features/auth/messages.ts:181` — `a11ySplashAnnounce` 정의만 있고 미사용
- 근거: `conventions/mobile.md` **M-20** — "iOS 와 안드로이드 동작이 다르면 **양쪽 경로를 모두
  구현한다.** 한쪽에서만 되는 코드를 그대로 두지 않는다." / `design.md` §12 가 이 지점을
  플랫폼 분기로 명시(iOS `AccessibilityInfo.announceForAccessibility` / Android
  `accessibilityLiveRegion`), §2.5 가 "오류 배너가 나타나면 읽어준다", §3.5 가 스플래시 진입
  낭독을 요구.
- 기대: 배너 표시·토스트 표시·스플래시 진입에서 iOS 는 `announceForAccessibility`,
  안드로이드는 `accessibilityLiveRegion` 으로 각각 낭독된다. 분기를 넣었으면 양쪽을 테스트한다(M-20).
- 실제: iOS VoiceOver 에서는 오류 배너·토스트·스플래시 안내가 아무것도 읽히지 않는다.
  **배포 우선순위가 iOS 인데(M-19) 빠진 쪽이 iOS 다.**

- **조치**: `mobile/src/shared/lib/a11y.tsx` 에 양쪽 경로를 함께 두었다.
  - `LIVE_REGION_POLITE` — 안드로이드 경로(`accessibilityLiveRegion="polite"`)
  - `useAnnounceForAccessibility(message)` — iOS 경로(`AccessibilityInfo.announceForAccessibility`).
    `Platform.select` 의 `default` 를 채워 안드로이드에서는 중복 낭독을 피해 아무것도 하지 않는다.
  - `A11yAnnouncement` — 보이는 요소 없이 문장만 읽어야 할 때(스플래시 진입 §3.5)
- 적용: `Toast.tsx`(§4.3) · `Banner.tsx`(§2.5 — 낭독이 아예 없던 곳) ·
  `SplashScreen.tsx`(§3.5 진입 안내). 미사용이던 `messages.ts` 의 `a11ySplashAnnounce` 가
  이 진입 안내 문구로 쓰이면서 정리됐다.
- `RestoringIndicator` 의 `accessibilityLiveRegion` 은 **뺐다.** 진입 안내가 같은 자리를 이미
  읽고, 남겨 두면 안드로이드에서만 한 번 더 읽혀 두 플랫폼 동작이 다시 갈린다.
  `accessibilityLabel="불러오는 중"`(§3.5)은 그대로다.
- 화면 코드에 `accessibilityLiveRegion` 을 직접 적은 곳은 0건이 됐다.
- **규칙 갱신**: M-20 에 "스크린리더 낭독은 `shared/lib/a11y` 를 쓴다" 를 추가했다.
- **mobile-tester 에게**: M-20 은 양쪽 분기를 테스트하라고 한다. `Platform.OS` 를 목킹해
  iOS 에서 `announceForAccessibility` 가 불리고 안드로이드에서는 불리지 않는 것을 함께 봐 달라.

### D-M5 [High] 가입 화면의 문구가 명세와 다른 자리에 놓였다

- 상태: **해소 (2026-08-27, mobile-developer 재작업 1회차)**
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `mobile/src/features/auth/screens/SignUpScreen.tsx:155`, `:231-251`
- 근거: `conventions/mobile.md` **M-7** — "사용자 문구는 `design.md` 를 그대로 쓴다" /
  `design.md` §5.2(화면 골격) · §5.3(가입 사유 필드) · §2.5(입력란 `accessibilityLabel` = 라벨 텍스트)
- 기대:
  1. `NavBar` 타이틀 "가입 신청", 본문 첫 줄에 H1 "Planbee 가입 신청".
  2. 가입 사유 필드의 라벨은 "가입 사유"(+ 우측 "선택" 배지), 플레이스홀더는
     "어떤 상황에서 Planbee를 쓰고 싶은지 알려주세요.".
- 실제:
  1. `NavBar` 타이틀이 "Planbee 가입 신청" 이고 H1 은 화면에 없다.
  2. `TextField` 에 `label={LABELS.reasonPlaceholder}` 를 넘겨 **플레이스홀더 문장이 라벨로**
     렌더된다. 화면에는 "가입 사유 / 선택" 줄 아래에 같은 문장이 라벨과 플레이스홀더로 두 번
     나오고, 입력란의 `accessibilityLabel` 도 이 문장이 된다(§2.5 위반).
- 참고(비차단): 같은 줄의 "선택" 이 `shared/ui/Badge` 의 `RequirementBadge` 가 아니라 평범한
  `Text` 다. §5.3 은 "배지" 라고 적었으니 이 결함을 고칠 때 함께 보면 된다.

- **조치**:
  1. `NavBar` 타이틀을 `LABELS.signUpNavTitle`("가입 신청")로 바꾸고, 본문 첫 줄에 H1
     `LABELS.signUpTitle`("Planbee 가입 신청")을 `accessibilityRole="header"` 로 추가했다 (§5.2).
     두 문장 모두 §11.4 "가입" 행에 있던 것이고 새로 지어내지 않았다.
     간격도 §5.2 대로 H1 `mt-6`(24) · 리드 `mt-2`(8) · 다음 블록 `mt-7`(28) 로 맞췄다.
  2. 가입 사유 필드에 `label={LABELS.reasonLabel}`("가입 사유")를 넘기고 플레이스홀더는
     `placeholder` 로만 쓴다. 화면이 따로 그리던 라벨 줄은 지웠다 — 입력란의
     `accessibilityLabel` 이 이제 "가입 사유" 다 (§2.5).
- **참고 항목도 함께 처리**: "선택" 을 평범한 `Text` 대신 `shared/ui/Badge` 의
  `RequirementBadge required={false}` 로 바꿨다 (§5.3 "배지"). 이를 위해 `TextField` 에
  `labelBadge?: ReactNode` 슬롯을 추가했고, `label` prop 에는 "플레이스홀더 문장을 넘기지 않는다" 를
  주석으로 못박았다.

---

## mobile-reviewer 가 **결함으로 올리지 않은** 것 (기록용)

절대 규칙 2 에 따라 `conventions` 에 근거가 없어 지적하지 않았고, 새 규칙으로 승격할 만큼
반복되는 문제도 아니라고 판단해 `mobile.md` 에 규칙을 추가하지도 않았다. 목록과 사유는
`review/mobile-review.md` §4 에 있다. 그중 하나만 여기 남긴다 — **다른 역할의 판단이 필요하기 때문이다.**

### D-M6 [Low] `design.md` §7.5 의 "주소 복사" 가 구현되지 않았다

- 상태: 열림 (요청 — 차단하지 않음)
- 보고자: mobile-reviewer
- 담당: ux-designer / 사람
- 위치: `mobile/src/features/auth/hooks/useContact.ts:35-40`, `messages.ts:73`(`CONTACT.copy` 미사용)
- 근거: `design.md` §7.5 · §11.2.1 — 메일 앱이 없는 기기의 다이얼로그에 버튼 "주소 복사" / "확인"
- 기대: 두 버튼이 있거나, 없앤다는 결정이 문서에 남는다.
- 실제: "확인" 만 있다. 클립보드 네이티브 의존성을 임의로 들이지 않은 판단 자체는
  `mobile.md` **M-19**(안드로이드 대체 경로 없는 기능은 도입 전 리포트) · 절대 규칙 8 과 맞지만,
  그 결정이 코드 주석에만 있고 `status.md` 의 `ASK` 나 이 파일에 올라오지 않았다.
  주소 텍스트가 `selectable` 이라 최후 수단은 남아 있다(§7.5 의 의도는 유지).
- 요청: ① 이 생략을 명세에 반영할지, ② 클립보드 의존성을 들일지 사람이 판단해 달라.

- **mobile-developer 의 결정 (2026-08-27, 재작업 1회차)**: **이번 재작업에서 고치지 않는다.**
  - 이 항목은 `[MUST]` 위반이 아니라 요청이고, 재작업 대상은 차단 결함 `D-M1`~`D-M5` 다.
  - 남은 선택지가 둘 다 **mobile-developer 의 권한 밖**이다. ①은 `design.md` 수정이라
    ux-designer 소유이고, ②는 새 네이티브 의존성(`@react-native-clipboard/clipboard`) 도입이라
    M-19 와 절대 규칙 8 이 사람 판단으로 지정했다. 어느 쪽도 코드로 먼저 정할 수 없다.
  - 리뷰어 지적대로 **판단 근거가 코드 주석에만 있던 문제는 이 항목으로 해소한다** —
    결정과 사유가 이제 `defects.md` 에 있다. 코드는 그대로 두고,
    `useContact.ts` 의 주석에서 이 항목(`defects.md` D-M6)을 가리키게 했다.
  - 그때까지의 대체 경로는 유지된다: 주소 텍스트가 `selectable` 이라 사용자가 직접 복사할 수 있고,
    §7.5 의 의도(막다른 길을 만들지 않는다)는 깨지지 않는다.

---

## D-3. 리프레시 유예 창의 캐시 미스 분기가 새 토큰 쌍을 발급한다

- **심각도**: High (`[MUST]` 위반 + AC 미충족)
- **올린 역할**: server-reviewer (2026-08-27)
- **받는 역할**: server-developer (필요 시 tech-lead)
- **상태**: **해소 (2026-08-27, server-developer 재작업 1회차).** 아래 "조치" 참조.
  원래 상태: **열림 — 계약 확정됨 (tech-lead, 2026-08-27).** 아래 "계약에서의 결론" 절이
  구현 지침이다. 계약(`contract.yaml` / `openapi.yaml` / `error-codes.md`)은 이미 갱신했다.
- **위치**: `server/src/main/java/com/planbee/api/auth/RefreshTokenService.java:112-124`
- **근거**: `server.md` S-17(리프레시 토큰 — 유예 창), `common.md` C-5, 절대 규칙 1,
  `contract.yaml` `POST /api/v1/auth/token/refresh`, PRD AC-49 · AC-23 · AC-24

### 무슨 일이

`rotate` 의 3번 분기 중 "유예 창 안인데 캐시에 없다" 경로가 **새 토큰 쌍을 발급**한다.

```java
// 유예 창 안인데 캐시에 없다 (재기동 등). ...
statusGuard.accept(token.user());
token.revoke(now, RefreshToken.RevokeReason.LOGOUT);
return cacheAndReturn(hash, issuePair(token.user(), now), now);
```

S-17 과 계약이 **금지한 동작**이다.

- S-17: "유예 창 안의 재시도에는 **같은 토큰 쌍을 다시** 돌려준다 — 매번 새로 발급하면
  재시도할 때마다 유효 토큰이 늘어난다."
- 계약: "직전 응답을 캐시해 두는 방식이 된다. **매번 새 쌍을 발급하면 안 된다.**"
- AC-49: "직전에 발급한 것과 **같은** 토큰 쌍을 다시 받는다."

### 결과 1 — 유효 리프레시 토큰이 늘어난다

1. 토큰 A 로 갱신 → A 회전(`rotatedAt`), 후속 토큰 **B 발급(유효)**, 캐시[hash(A)] = B 쌍
2. 캐시 소실 (재기동 / `GRACE_CACHE_SWEEP_THRESHOLD` 스윕 / 인스턴스 분리)
3. 유예 창(10초) 안에 A 가 다시 옴 → 이 분기 → **C 발급(유효)**, A 만 폐기

이 시점에 **B 와 C 가 동시에 유효**하다. 코드 주석은 "유효 토큰이 늘지 않도록 이 행은 여기서
폐기한다" 고 하지만 폐기되는 것은 이미 회전된 A 이고 B 는 손대지 않는다.
B 는 이후 14일 동안 정상 회전되어 병렬 세션이 된다.

### 결과 2 — 유예 창 밖 재사용이 감지되지 않는다 (AC-23 · AC-24 미충족)

위 3번을 거치면 A 에 `revokedAt`(사유 `LOGOUT`)이 찍힌다. 같은 A 가 유예 창 **밖**에서 다시 오면
재사용 판정(3번 분기)에 닿기 전에 **2번 분기**에서 걸린다.

```java
if (token.isRevoked()) {
    throw new BusinessException(token.revokeReason() == REUSE_DETECTED
            ? REFRESH_TOKEN_REVOKED : REFRESH_TOKEN_INVALID);   // ← LOGOUT 이므로 INVALID
}
```

- 기대: `AUTH_REFRESH_TOKEN_REUSED` + 해당 계정 **모든** 리프레시 폐기 → 다른 기기는 `REVOKED`
- 실제: `AUTH_REFRESH_TOKEN_INVALID` (만료 배너) + **전 기기 폐기가 실행되지 않음**

유출된 토큰이 재사용됐는데도 다른 기기 세션이 그대로 살아 있고, 앱은 보안 배너 대신 만료 배너를 띄운다.

### 재현

1. 로그인해서 리프레시 토큰 A 를 받는다
2. A 로 `POST /api/v1/auth/token/refresh` → B 를 받는다
3. 서버를 재기동한다 (유예 창 캐시가 사라진다)
4. 재기동 후 **10초 안에** A 로 다시 갱신한다 → 200 인데 **B 가 아닌 C** 가 온다 (AC-49 위반)
5. 10초를 넘긴 뒤 A 로 또 갱신한다
   - 기대: 401 `AUTH_REFRESH_TOKEN_REUSED`, 이후 B 로 갱신하면 401 `AUTH_REFRESH_TOKEN_REVOKED`
   - 실제: 401 `AUTH_REFRESH_TOKEN_INVALID`, B 는 계속 정상 갱신됨

### 고칠 방향 (판단은 server-developer / tech-lead)

서버는 회전된 토큰의 **후속 평문**을 갖고 있지 않으므로 "재기동 뒤에도 항상 같은 쌍" 은 지금 설계로
불가능하다. 둘 중 하나여야 한다.

- 구현을 계약에 맞춘다 — 캐시가 없으면 유예 창 안이라도 재사용 규칙(또는 최소한 재사용 판정이
  폐기 판정보다 먼저 서는 순서)을 적용해 AC-23·24 가 무력해지지 않게 한다.
- 이 예외 상황의 동작을 **계약에 정의**한다. 계약 변경은 tech-lead 만 한다 (절대 규칙 1) —
  구현자가 계약 없이 임의 동작을 넣지 않는다.

어느 쪽이든 D-6(누락된 계약 문장)과 함께 처리하면 두 문서가 갈라지지 않는다.

### 계약에서의 결론 (tech-lead, 2026-08-27)

**결정 — 닫히는 쪽으로 실패한다. 직전 응답이 없으면 유예 창 안이라도 재사용이다.**

계약에 반영한 위치는 넷이다. 구현은 이 문서가 아니라 계약을 정본으로 본다.

| 파일 | 위치 |
|---|---|
| `docs/features/auth/contract.yaml` | `POST /api/v1/auth/token/refresh` 의 `description`(문단 신설) · `200` 설명 · `401` 표의 `REUSED` 행 · 말미 AC 대조표 23·49 |
| `docs/api/openapi.yaml` | 같은 내용 병합 (두 파일의 auth 부분은 항상 같다) |
| `docs/api/error-codes.md` | 세션 절의 `AUTH_REFRESH_TOKEN_REUSED` 행 + 그 아래 단서 |

**신설 오류 코드 없음. 신설 스키마 없음. 200 응답 형태 불변.** 앱이 이 경우를 구분할
방법이 없고(같은 401), 구분해도 할 일이 같다(보안 배너 + 재로그인). 모바일은 변경 없다.

#### server-developer 가 구현할 것 (`RefreshTokenService.rotate` 3번 분기)

1. `token.isRotated()` 인데 1번 분기(캐시 재생)에서 걸리지 않았다면 — **유예 창 안·밖을
   가리지 않고 동일하게** 처리한다: `revokeAllByUserId(token.user().id(), now, REUSE_DETECTED)`
   후 `throw new BusinessException(AuthErrorCode.REFRESH_TOKEN_REUSED)`.
2. 결과적으로 3번 분기의 `isWithinGraceWindow` 검사는 **없어진다.** 유예 창 판정의 유일한
   근거는 캐시 조회(1번 분기)이고, 캐시 엔트리의 만료 시각이 곧 유예 창이다. 판정 근거가
   둘(엔티티의 `rotatedAt` + 캐시)로 갈라져 있던 것이 이번 결함의 뿌리다.
3. 이 경로에서 **`statusGuard` 를 부르지 않는다.** 재사용 판정이 계정 상태 확인보다 먼저
   선다(계약에 명시). 정지·거절 계정이 재사용을 일으켜도 403 이 아니라 401 `REUSED` 다.
4. 이 경로에서 **`token.revoke(now, LOGOUT)` 을 찍지 않는다.** 위 "결과 2" 의 직접 원인이다.
   `revokeAllByUserId` 가 `REUSE_DETECTED` 로 전부 폐기하므로 별도 폐기가 필요 없다.
5. **1번 분기(캐시 적중)는 그대로 둔다.** 10초 안에는 몇 번을 재시도하든 같은 쌍을 돌려주고,
   재생 응답이 유예 창을 **연장하지 않는다**(만료 시각은 최초 회전 시각 + 10초 고정).
   지금 구현이 이미 그렇다.
6. 캐시 스윕이 **아직 만료되지 않은** 엔트리를 지우면 안 된다. 현재
   `cacheAndReturn` 의 `removeIf(!now.isBefore(expiresAt))` 는 만료분만 지우므로 유지한다.
   상한 초과 시 살아 있는 엔트리를 버리는 방식(LRU 등)으로 바꾸지 않는다 — 그러면 정상
   사용자가 전 기기 로그아웃되는 빈도가 캐시 크기에 좌우된다.
7. 로그아웃(`revoke`) 시 `graceCache.remove(hash)` 는 그대로 유지한다.
8. `AuthController` 의 200 `@ApiResponse(description)` 은 D-6 의 갱신된 기대값(아래)과
   글자까지 같아야 한다 (S-19).

#### server-tester 가 확인할 것

- 유예 창 **안 + 캐시 있음** → 200, `refresh_token` 이 직전 응답과 **같은 값** (AC-49)
- 유예 창 **안 + 캐시 없음**(캐시를 비우거나 다른 인스턴스를 흉내 낸 상태) → 401 `AUTH_REFRESH_TOKEN_REUSED`,
  그리고 **그 계정의 모든 리프레시가 폐기**되어 후속 토큰 B 로 갱신하면 401 `AUTH_REFRESH_TOKEN_REVOKED` (AC-24)
- 유예 창 **밖** → 기존과 동일하게 401 `REUSED` + 전 기기 폐기
- 위 두 401 경로에서 **새 토큰 쌍이 발급되지 않았음**(저장된 유효 리프레시 수가 늘지 않음)

#### 왜 이 쪽인가

- **유예 창의 목적**은 네트워크 타임아웃으로 정상 사용자가 전 기기 로그아웃되는 것을 막는
  완화책이지, 재사용 탐지를 약화시키는 장치가 아니다 (`status.md` 결정 기록 2026-08-25).
- **드문 예외다.** 단일 인스턴스에서 이 경로에 닿으려면 "회전 응답을 받지 못한 사용자" 와
  "그 10초 안의 서버 재기동" 이 겹쳐야 한다. 흔한 경로(같은 프로세스, 10초 안)는 지금도
  계약대로 동작하고 이번 변경의 영향을 받지 않는다.
- **보안 기제는 닫히는 쪽으로 실패한다.** 서버가 "이 요청은 정상 재시도" 라고 증명할 수단을
  잃은 상태에서 새 세션을 발급하면, 탈취된 토큰에도 똑같이 발급된다. 판별할 수 없는 상태를
  사용자에게 유리한 쪽으로 해석하는 것은 공격자에게도 유리한 쪽으로 해석하는 것과 같다.
- **S-29 / `status.md` ASK 8 과 모순되지 않는다.** ASK 8 은 이미 "다중 인스턴스에서는 유예 창
  캐시가 공유되지 않아 재사용으로 오인되어 정상 사용자가 전 기기에서 로그아웃된다" 를 그
  상태의 결과로 적어 두었다. 이번 결정은 그 서술을 계약으로 승격한 것이고, 다중 인스턴스
  전환 전에 공유 저장소가 필요하다는 결론을 더 단단하게 만든다(느슨해지는 방향이 아니다).

**기각한 대안** — "캐시 미스는 401 `INVALID` 로 거부하되 원본 토큰은 폐기하지 않는다."
그 기기만 로그아웃되어 사용자 피해는 작지만, 탈취 토큰의 재사용이 조용히 넘어간다
(공격자가 토큰을 얻지는 못해도 AC-24 의 방아쇠가 당겨지지 않는다). 또 같은 입력에 대한
판정이 "서버가 기억하느냐" 에 따라 세 갈래(200 / 401 `INVALID` / 401 `REUSED`)로 나뉘어
모바일이 근거 없이 상태를 추론하게 된다.

#### AC 와의 관계

- **AC-49 는 직전 응답이 서버에 남아 있는 경우로 한정된다.** 이 예외는 AC-23·AC-24 의
  재사용 규칙을 그대로 따른다. 계약의 AC 대조표에 그렇게 적었다.
- PRD 의 AC-49 문구에는 이 한정이 없다 → **D-7 로 product-manager 에게 리포트**했다.
  PRD 수정 여부와 무관하게 **구현·테스트는 이 계약대로 진행한다** (절대 규칙 1).

### 조치 (server-developer, 2026-08-27 — 재작업 1회차)

`RefreshTokenService.rotate` 의 3번 분기를 계약의 "구현할 것" 8항 그대로 고쳤다.

```java
// 3. 이미 회전된 토큰이 다시 왔는데 1번에서 재생되지 않았다 = 재사용이다.
if (token.isRotated()) {
    reuseDetectionRevoker.revokeAll(token.user().id(), now);
    throw new BusinessException(AuthErrorCode.REFRESH_TOKEN_REUSED);
}
```

- `isWithinGraceWindow` 검사·`statusGuard.accept`·`token.revoke(now, LOGOUT)`·새 쌍 발급을
  **모두 제거**했다. 유예 창 판정의 유일한 근거는 1번 분기의 응답 캐시다.
- 근거가 둘로 갈라지지 않도록 **엔티티의 `RefreshToken.isWithinGraceWindow` 도 삭제**했다
  (호출부가 이 한 곳뿐이었다). 남겨 두면 다음 사람이 같은 판정을 다시 만들어 낸다.
- 캐시 적중 경로(1번)와 스윕(`removeIf` 로 만료분만 제거), 로그아웃 시 `graceCache.remove(hash)`
  는 지시대로 손대지 않았다.

#### 여기서 하나가 더 나왔다 — 폐기가 롤백되고 있었다

지시대로 고친 뒤 **실제 서버에 요청을 보내 확인**했더니 401 `REUSED` 는 나오는데
**전 기기 폐기가 DB 에 남지 않았다.**

```
== 유예 창 밖 A 재시도 -> 401 AUTH_REFRESH_TOKEN_REUSED
 id | rotated | revoked | revoke_reason
----+---------+---------+---------------
  2 | t       | f       |               ← 폐기가 사라졌다
  3 | f       | f       |
== 후속 토큰 B 로 갱신 -> 200 (갱신됨)      ← AC-24 미충족
```

원인은 유예 창과 무관한 **트랜잭션 문제**다. `revokeAllByUserId` 는 벌크 UPDATE 지만
같은 트랜잭션 안에서 곧바로 `BusinessException` 을 던지므로 **그 예외가 UPDATE 까지 되돌린다.**
이 코드는 이번 재작업 이전부터 "유예 창 밖 재사용" 경로에 그대로 있었고(리뷰가 통과시킨
분기다), 실행해 보지 않으면 드러나지 않는다 — D-3 의 결론이 이 경로 하나로 모이면서
AC-24 전체가 이 버그에 걸리게 되어 함께 고쳤다.

- **조치**: `ReuseDetectionRevoker`(신규, `@Transactional(propagation = REQUIRES_NEW)`)가
  폐기를 **독립 트랜잭션에서 먼저 커밋**하고 그다음 401 을 던진다. 자기 호출은 프록시를
  타지 않아 전파 속성이 무시되므로 별도 빈으로 뒀다.
- 재사용 판정은 회전보다 앞에 서므로 호출 트랜잭션은 이 시점에 아무것도 쓰지 않았다 —
  같은 행을 두 트랜잭션이 잡는 상황은 생기지 않는다.
- **규칙으로 올렸다**: `docs/conventions/server.md` S-17 에
  "전 기기 폐기는 별도 트랜잭션에서 커밋한다" 를 근거와 함께 추가했다.
  "실패 응답을 내면서 무언가를 반드시 남겨야 하는" 모든 경우에 해당하는 함정이다.

#### 실행해서 확인한 것 (`make e2e-up` 으로 띄운 실제 서버 + PostgreSQL)

| 시나리오 | 결과 |
|---|---|
| 유예 창 안 + 캐시 있음 | 200, `refresh_token` 이 직전 응답과 **같은 값** (AC-49) |
| 유예 창 밖 재사용 | 401 `AUTH_REFRESH_TOKEN_REUSED`, 그 계정 리프레시 2행 모두 `REUSE_DETECTED` 로 폐기 |
| 그 뒤 후속 토큰 B | 401 `AUTH_REFRESH_TOKEN_REVOKED` (AC-24) |
| 유예 창 안 + **캐시 없음** (서버 재기동) | 401 `AUTH_REFRESH_TOKEN_REUSED`, 이어서 B 도 401 `REVOKED`, 남은 유효 리프레시 **0개** |
| 정지 계정의 갱신 | 403 `AUTH_ACCOUNT_SUSPENDED` + `account_status.status = SUSPENDED` (D-4 재배치 뒤에도 유지) |

server-tester 가 확인할 항목은 계약의 체크리스트 그대로이고, 위 표가 그 예상 결과다.
"캐시 없음" 은 재기동 말고도 `graceCache` 를 비우거나 다른 인스턴스를 흉내 내는 방식으로 만들 수 있다.

---

## D-4. 컨트롤러가 두 서비스를 콜백으로 엮고 엔티티 타입이 컨트롤러에 드러난다

- **심각도**: High (`[MUST]` 위반)
- **올린 역할**: server-reviewer (2026-08-27)
- **받는 역할**: server-developer
- **상태**: **해소 (2026-08-27, server-developer 재작업 1회차)**
- **위치**: `server/src/main/java/com/planbee/api/auth/AuthController.java:77-79`
  (관련: `AuthService.java:214`, `RefreshTokenService.java:91`)
- **근거**: `server.md` S-5, S-4

### 무슨 일이

```java
public TokenPair refreshToken(@Valid @RequestBody RefreshRequest request) {
    return refreshTokenService.rotate(request.refreshToken(), authService::assertCanStillSignIn);
}
```

- **S-5 위반** — 컨트롤러가 "입력 바인딩·검증·위임" 을 넘어 **두 서비스를 조합**한다.
  "갱신 시점에 계정 상태를 다시 확인한다"(계약 403 절 / AC-14·15·16 의 갱신 반영)는 정책이
  컨트롤러의 인자 배선으로만 표현되어 있다. 이 인자를 빠뜨리면 정지·거절 계정이 30분마다
  무한히 갱신되는데, 그것을 막는 지점이 서비스 밖에 있다.
- **S-4 위반** — `rotate` 의 두 번째 파라미터는 `Consumer<User>` 이고 `User` 는 JPA 엔티티다.
  컨트롤러 표현식의 타입 인자로 엔티티가 들어온다. 같은 패키지라 `import` 문이 보이지 않을 뿐이다.

### 기대

갱신 흐름 전체를 서비스에 두고 컨트롤러는 한 번만 위임한다.
예를 들어 `AuthService.refresh(String refreshToken)` 이 `RefreshTokenService` 호출과 상태 확인을
안에서 엮고, 컨트롤러는 `return authService.refresh(request.refreshToken());` 만 남긴다.
정확한 배치는 구현자 판단이고, 요건은 **컨트롤러에서 조합과 엔티티 타입이 사라지는 것**이다.

### 조치 (server-developer, 2026-08-27 — 재작업 1회차)

갱신 흐름을 `AuthService.refresh(String)` 로 내렸다.

```java
// AuthController
public TokenPair refreshToken(@Valid @RequestBody RefreshRequest request) {
    return authService.refresh(request.refreshToken());
}
```

- 조합(`rotate` + 계정 상태 확인)은 `AuthService.refresh` 안에 있고, `assertCanStillSignIn` 은
  **private 으로 좁혔다** — 서비스 밖에서 이 정책을 배선할 방법이 없어진다.
- `Consumer<User>` 표현식이 컨트롤러에서 사라져 **엔티티 타입이 컨트롤러에 드러나지 않는다** (S-4).
  콜백 자체는 두 서비스 사이에만 남는다.
- 컨트롤러가 더 이상 쓰지 않는 `RefreshTokenService` 의존성을 제거했다. 이제 이 컨트롤러가
  아는 서비스는 하나뿐이고, 왜 그런지를 필드 주석에 남겼다.
- 실제 서버에서 정지 계정의 갱신이 403 `AUTH_ACCOUNT_SUSPENDED` + `account_status` 를
  그대로 내는 것을 확인했다 (위 D-3 조치의 표 마지막 행).

---

## D-5. `SignupRateLimiter` 에 "왜 DB 가 아닌지" 주석이 없다

- **심각도**: Medium (`[MUST]` 위반)
- **올린 역할**: server-reviewer (2026-08-27)
- **받는 역할**: server-developer
- **상태**: **해소 (2026-08-27, server-developer 재작업 1회차)**
- **위치**: `server/src/main/java/com/planbee/api/auth/SignupRateLimiter.java:12-26`
- **근거**: `server.md` S-29

### 무슨 일이

S-29 는 "이런 상태를 새로 만들면 **왜 DB 가 아닌지**를 코드 주석에 남긴다" 고 한다.
프로세스 메모리 상태 셋 중 둘은 지켰다.

| 클래스 | 근거 주석 |
|---|---|
| `LoginAttemptGuard` (20-24행) | 있음 — "최대 10분짜리 임시 상태", 다중 인스턴스 이전 필요까지 |
| `RefreshTokenService.graceCache` (37-45행) | 있음 — "평문이 담겨 DB 에 넣으면 해시 저장의 의미가 사라진다" |
| `SignupRateLimiter` | **없음** — 무엇을 막는지만 있고 저장 위치의 근거가 없다. `windowsByClient` 필드에도 주석 없음 |

S-29 의 목적은 인스턴스를 늘리는 시점에 옮겨야 할 상태를 **코드에서** 찾을 수 있게 하는 것이라,
셋 중 하나만 빠져도 목적이 깨진다. (`status.md` ASK 8 에는 셋 다 적혀 있어 그쪽 요건은 충족했다.)

### 기대

왜 DB 가 아닌지(1시간짜리 휘발 집계이고 재기동 시 초기화되어도 정책이 무너지지 않는다는 등 실제 이유)와
다중 인스턴스 전환 시 공유 저장소로 옮겨야 한다는 사실을 클래스/필드 주석에 남긴다.

### 조치 (server-developer, 2026-08-27 — 재작업 1회차)

`SignupRateLimiter` 클래스 주석에 저장 위치의 근거를, `windowsByClient` 필드에 한 줄 참조를 넣었다.
다른 두 상태와 같은 수준으로 ① 왜 DB 가 아닌지 ② 재기동 시 무엇이 최악인지
③ 다중 인스턴스 전환 시 옮겨야 한다는 사실을 적었다.

- 왜 DB 가 아닌가: 집계 창이 1시간짜리 휘발 상태라 요청마다 쓰기를 발생시킬 가치가 없고
  (감사 대상이 아니다), 재기동으로 초기화돼도 정책이 무너지지 않는다. 최악은 "재기동 직후
  그 IP 가 한도만큼 다시 시도할 수 있는 것" 인데, 막으려는 대상이 **대량 자동 열거**라
  재기동을 노려 창을 초기화하는 방식으로는 그 규모가 나오지 않는다.
- 다중 인스턴스에서 옮기지 않으면 한도가 인스턴스 수만큼 느슨해진다는 것도 함께 적었다.

이로써 프로세스 메모리 상태 셋(`LoginAttemptGuard` · `graceCache` · `windowsByClient`)이
모두 S-29 의 주석 요건을 갖췄다.

---

## D-6. `refreshToken` 200 의 응답 설명이 계약과 다르다

- **심각도**: Low (`[MUST]` 위반, 한 줄)
- **올린 역할**: server-reviewer (2026-08-27)
- **받는 역할**: server-developer
- **상태**: **해소 (2026-08-27, server-developer 재작업 1회차)**
- **위치**: `server/src/main/java/com/planbee/api/auth/AuthController.java:73`
- **근거**: `server.md` S-19

### 무슨 일이

S-19 는 `@ApiResponse(description = ...)` 를 계약과 **동일하게** 붙이라고 한다.
`server/build/openapi.json` 과 `contract.yaml` 을 대조하면 이 하나만 다르다.

```
계약 : 갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
       유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).
구현 : 갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
```

나머지 5개 오퍼레이션의 `summary` · `operationId` · `description` 은 글자까지 일치한다.
`scripts/contract-check.sh` 는 설명 문구 차이를 실패로 보지 않으므로 게이트가 잡아주지 않는다.
누락된 문장이 하필 D-3 이 어긋난 그 동작(AC-49)이라 더욱 남아 있어야 한다.

### 기대

계약의 두 줄을 그대로 옮긴다. D-3 의 결론으로 계약 문구가 바뀌면 **그 최종 문구**와 일치시킨다.

### 기대값 갱신 (tech-lead, 2026-08-27)

D-3 의 결론으로 계약의 200 설명이 **세 줄로 늘었다.** 최종 문구는 아래와 같고,
`@ApiResponse(description = ...)` 은 이것과 글자까지 같아야 한다 (S-19).

```
갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).
서버가 직전 응답을 기억하지 못하면 200 이 아니라 401 `AUTH_REFRESH_TOKEN_REUSED` 다.
```

(계약 YAML 의 블록 스칼라이므로 줄바꿈은 개행 문자다. 나머지 5개 오퍼레이션의 설명은
이번 변경으로 바뀌지 않았다 — 손대지 않는다.)

### 조치 (server-developer, 2026-08-27 — 재작업 1회차)

`@ApiResponse(description = ...)` 을 텍스트 블록으로 바꿔 갱신된 계약 3줄을 그대로 옮겼다.
`make contract-check` 산출물(`server/build/openapi.json`)과 `contract.yaml` 의 해당 문자열을
**바이트 단위로 대조**해 일치를 확인했다.

```
'갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).\n유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).\n서버가 직전 응답을 기억하지 못하면 200 이 아니라 401 `AUTH_REFRESH_TOKEN_REUSED` 다.\n'
MATCH: True
```

YAML 블록 스칼라(`|`)의 후행 개행까지 같다. 나머지 5개 오퍼레이션의 설명은 손대지 않았다.

---

## D-7. PRD 의 AC-49 문구가 예외 상황을 포함하지 않는다

- **심각도**: Low (문서 정합 — 구현을 막지 않는다)
- **올린 역할**: tech-lead (2026-08-27)
- **받는 역할**: product-manager
- **상태**: **열림 (요청 — 차단하지 않음)**
- **위치**: `docs/features/auth/PRD.md` AC-49, 제약 절의 "리프레시 회전에는 10초의 유예 창을 둔다"
- **근거**: 이 문서 D-3 의 "계약에서의 결론", `contract.yaml` `POST /api/v1/auth/token/refresh`

### 무슨 일이

AC-49 는 조건 없이 *"10초 안에 같은 토큰으로 재시도하면 **항상** 같은 토큰 쌍을 다시 받는다"*
로 읽힌다. 그런데 서버는 회전된 토큰의 **후속 평문**을 보관하지 않으므로, 직전 응답이
사라진 상태(재기동 등)에서는 같은 쌍을 만들어 낼 수단 자체가 없다. 즉 AC-49 는 현재 설계로
**무조건 참이 될 수 없는 문장**이다. 계약은 이 예외를 "닫히는 쪽으로 실패 — 재사용으로
처리(AC-23·24)" 로 확정했다.

### 요청

AC-49 에 한정 어구를 넣을지 판단해 달라. tech-lead 권장안은 다음 한 줄 추가다.

> …다시 받는다 (AC-24 의 전 기기 폐기가 일어나지 않는다). **단 이 보장은 서버가 직전
> 응답을 기억하고 있는 동안에만 성립하며, 재기동 등으로 사라진 경우에는 AC-23·AC-24 를
> 따른다.**

제약 절의 유예 창 항목에도 같은 단서를 붙이면 PRD 안에서 서로 어긋나지 않는다.

**AC 번호를 새로 만들 필요는 없다고 본다** — 예외의 동작이 이미 AC-23·24 로 기술돼 있고,
번호를 늘리면 같은 규칙이 두 곳에서 관리된다. 다만 그 판단은 product-manager 몫이다.

### 이 항목이 막지 않는 것

계약이 이미 확정됐으므로 server-developer 의 D-3 구현과 server-tester 의 검증은
**이 리포트의 처리와 무관하게 진행한다** (절대 규칙 1 — 정본은 계약이다).

---

# server-tester 섹션 (2026-08-27)

판정 근거는 `docs/features/auth/status.md` 기록 표에 요약돼 있다. 번호는 서버 접두어 **`D-S*`**
를 쓴다 — mobile-tester 가 같은 파일에 `D-T*` 를 쓰고 있어 충돌을 피하기 위함이다.

**차단 결함 0건이다.** server-reviewer 가 "정적 리뷰로는 판정할 수 없다" 고 지목한 두 항목을
포함해 검증 대상이 전부 통과했다. 아래 `D-S1` 은 차단하지 않는 문서 정합 요청이다.

## D-1 에 대한 판정 — `@WebMvcTest` 범위 지정 (server-tester, 2026-08-27)

- **상태 갱신**: **확인 완료. 범위 지정은 의도와 맞다. 규칙으로 승격했다 (`server.md` S-30).**
- 받은 질문: "이 범위 지정이 의도와 맞는지. 다른 슬라이스 테스트에서도 대상 명시를 기본으로
  삼을지 판단해서, 그렇다면 `server.md` 에 규칙으로 올려 달라."

### 판단

**맞다. 되돌리지 않는다.**

`GlobalExceptionHandlerTest` 가 보는 것은 `common.md` C-1 이 정한 **오류 응답의 형식**이고,
그 형식은 어느 컨트롤러가 예외를 던졌는지와 무관하다. 실제로 이 테스트는 자기 파일 안의
`TestController` 하나로 세 가지(비즈니스 예외 · 검증 실패 · 본문 파싱 실패)를 모두 만들어 낸다.
그러므로 대상을 그 컨트롤러로 좁히는 것은 **검증 범위를 줄인 것이 아니라, 검증과 무관한
의존성을 들이지 않은 것**이다.

되돌렸을 때 무슨 일이 생기는지가 판단의 근거다. 대상을 비우면 슬라이스가 애플리케이션의 모든
컨트롤러를 올리려 하고, `auth` 가 생긴 지금은 `AuthService` 를 목으로 채워야 통과한다. 그러면
이 테스트가 **자기와 상관없는 도메인의 의존성 목록**을 들고 다니게 되고, 세 번째 도메인이
생기면 또 깨진다. 깨질 때마다 목을 하나씩 더하는 방향은 원인을 지우지 않는다.

`HealthControllerTest` 는 처음부터 `@WebMvcTest(HealthController.class)` 로 대상을 적고 있었다 —
이 저장소의 슬라이스 테스트가 원래 그 형태였고, D-1 의 수정은 예외를 만든 것이 아니라
**빠져 있던 한 곳을 나머지에 맞춘 것**이다.

### 규칙으로 올린 것 — `server.md` S-30 `[MUST]`

"슬라이스 테스트는 대상을 명시한다". 등급을 `[MUST]` 로 둔 이유는 **어겨도 그 시점에는
초록이기 때문**이다. 대가는 다음 도메인을 만드는 사람이 치르고, 그때는 원인이 자기 변경처럼
보인다. 컴파일러도 Spotless 도 ArchUnit 도 이걸 잡지 못하므로 리뷰어가 막는 수밖에 없다.

규칙에는 판단만이 아니라 **어떻게 고치는지**도 적었다 — ① 목으로 메우지 말고 범위를 좁힌다,
② 공통 관심사는 테스트 안의 최소 컨트롤러를 대상으로 삼는다, ③ 좁힐 수 없으면 슬라이스가
아니라 `@IntegrationTest` 다(S-9).

### server-developer 가 `server/src/test/` 를 고친 것에 대해

이번 건은 **문제 삼지 않는다.** 자기 변경이 깨뜨린 기존 테스트였고, 고친 범위가 한 줄이며,
리포트(D-1)를 남겨 판단을 넘겼다. 리포트 없이 조용히 고쳤다면 다른 이야기가 된다.

---

## D-S1 [Low] 앞뒤 공백이 붙은 이메일은 가입에서 400 인데, 계약은 "공백을 제거해 저장" 이라고 적었다

- **심각도**: Low (문서·구현 정합 — 차단하지 않는다. AC 미충족 아님)
- **올린 역할**: server-tester (2026-08-27)
- **받는 역할**: server-developer (판단이 계약 쪽이면 tech-lead)
- **상태**: **열림 (요청 — 차단하지 않음)**
- **위치**: `server/src/main/java/com/planbee/api/auth/dto/SignupRequest.java` 의 `@Email`,
  `server/src/main/java/com/planbee/api/auth/User.java:normalizeEmail`
- **근거**: `contract.yaml` `SignupRequest.email` 의 description —
  *"서버가 **소문자화하고 앞뒤 공백을 제거해** 저장·비교한다. 같은 정규화가 로그인 실패
  카운터의 키에도 쓰인다 (AC-47)."*

### 무슨 일이

`POST /api/v1/auth/signup` 에 `"  Name@Example.com  "` 을 보내면 **400** 이다.
`@Email` 검증이 정규화보다 먼저 돌고, Bean Validation 의 `@Email` 은 앞뒤 공백을 형식 위반으로
본다. 즉 `normalizeEmail` 의 `strip()` 은 **가입 경로에서는 도달할 수 없는 코드**다.

반면 로그인은 `@Email` 을 일부러 붙이지 않았으므로(AC-13) 같은 값이 정규화되어 통과한다.
같은 문자열이 가입에서는 400, 로그인에서는 정상 대조되는 **비대칭**이 남는다.

### 왜 차단하지 않는가

- **AC 를 어기지 않는다.** 이메일 형식 검증은 AC-5 가 앱에 맡긴 일이고, 앱은 공백을 붙여
  보내지 않는다. 서버의 400 은 `errors[].field = "email"` 로 계약의 400 형식 그대로 나간다.
- 대소문자 정규화(중복 가입 우회 방지, AC-2)와 로그인 카운터 키의 정규화(AC-47)는
  **정상 동작한다** — 테스트로 확인했다
  (`AuthSignupApiTest.이메일은_정규화되어_저장된다`, `AuthLoginApiTest.이메일은_정규화되어_대조된다`).
- 실패 방향이 안전하다. 받아서 고쳐 저장하는 쪽이 아니라 거부하는 쪽이다.

### 요청

둘 중 하나를 골라 달라. **테스트는 어느 쪽도 미리 고정하지 않았다** —
`AuthSignupApiTest` 는 대소문자 정규화만 검증하고 공백 입력은 판정하지 않는다.

1. **구현을 계약에 맞춘다** — 정규화를 검증보다 앞에 세워(`@JsonDeserialize` 컨버터 등)
   `"  a@b.com  "` 을 201 로 받는다. 계약 문장이 그대로 참이 된다.
2. **계약 문장을 좁힌다** — "소문자화해 저장·비교한다. 앞뒤 공백이 있는 값은 형식 오류로
   거부한다" 로 고친다. 계약 변경이므로 tech-lead 가 한다 (절대 규칙 1).

server-tester 권장은 **2번**이다. 앱이 공백을 보내지 않고(AC-5), 받아서 고쳐 주는 동작을
늘리면 "무엇을 정규화하고 무엇을 거부하는가" 의 경계가 넓어진다. 다만 그 판단은 계약 소유자 몫이다.

---

## D-T1 [High] 갱신 요청 자체가 401 을 받으면 앱이 그 자리에서 멈춘다

- 올린 역할: mobile-tester (2026-08-27)
- 받는 역할: mobile-developer
- 상태: **열림 (차단)**
- 위치: `mobile/src/shared/api/client.ts` — `authFetch` (75~92행) 와 `refreshOnce` (34~55행)
- 근거: PRD **AC-23 · AC-24 · AC-25** / `design.md` §2.6 · §3.3 오류 A · §4.3
- 증거: `mobile/src/features/auth/__tests__/sessionRefresh.test.tsx` 의 `test.failing` 3건

### 무슨 일이

`POST /auth/token/refresh` 도 `apiClient` 를 거치므로 **`authFetch` 를 탄다.** 그런데
`authFetch` 는 응답이 401 이고 저장된 리프레시 토큰이 있으면 갱신을 시도한다 — 갱신 요청
자신의 401 응답에도 똑같이 반응한다.

```
authFetch(POST /token/refresh)
  → 401
  → refreshOnce(...)            // refreshInFlight 가 이미 있으므로 그 프라미스를 그대로 반환
  → await refreshInFlight       // 그 프라미스는 지금 이 요청이 끝나기를 기다리고 있다
```

`refreshInFlight` 는 자기 자신을 기다리게 되어 **영원히 settle 되지 않는다.** 그 결과
`clearTokens()` 도 `onSessionExpired()` 도 불리지 않는다.

### 기대 / 실제

| | 기대 (AC-23·24·25) | 실제 |
|---|---|---|
| 저장된 토큰 | 지워진다 | 남는다 |
| 세션 | 끝나고 로그인 화면 | 끝나지 않는다 |
| 배너 | 만료 / 보안으로 갈린다 | 뜨지 않는다 |
| 화면 | 로그인 화면 | 그 자리에서 로딩 유지 |

### 왜 기존 테스트에 안 걸렸나 — 여기가 중요하다

`SplashScreen` 단독 테스트(`splash.test.tsx`)는 **통과한다.** 그 파일이
`configureSession()` 을 부르지 않아 `authConfig.refresh` 가 비어 있고, 그러면
`refreshOnce` 가 즉시 `null` 을 돌려주기 때문이다.

**실제 앱은 `App.tsx` 가 시작하자마자 `configureSession()` 을 부른다.** 즉 이 결함은
운영 빌드에서만 나타나며, **콜드 스타트의 세션 만료(AC-25)라는 가장 흔한 경로**가 여기 해당한다.
사용자에게는 "스플래시에서 영영 넘어가지 않는 앱" 으로 보인다.

### 제안 (판단은 mobile-developer 몫)

`authFetch` 가 **갱신 요청 자신은 갱신 대상으로 보지 않게** 한다. 예: 갱신 호출에만 붙는
표식(전용 헤더나 `apiClient` 를 거치지 않는 별도 fetch)을 두고 `authFetch` 가 그 요청의 401 에는
재귀하지 않는다. `refreshOnce` 안에서 자기 재진입을 막는 방법도 있다.

고치면 `sessionRefresh.test.tsx` 의 `test.failing` 3건이 **실패로 바뀐다** — 그때
`test.failing` 을 `test` 로 되돌리면 된다. 되돌리는 것까지가 이 결함의 완료 조건이다.

---

## D-T2 [Low] 잠금 응답(429)에서도 비밀번호를 지운다

- 올린 역할: mobile-tester (2026-08-27)
- 받는 역할: mobile-developer / ux-designer
- 상태: **열림 (차단하지 않음)**
- 위치: `mobile/src/features/auth/screens/LoginScreen.tsx` — `isRetryable` (297~302행)
- 근거: `design.md` §4.7 설계 의도 4 — "입력란과 버튼을 비활성화하지 않는다. 잠금이 이미
  풀렸을 수 있으므로 사용자가 **다시 눌러 확인**할 수 있어야 한다"

### 무슨 일이

`isRetryable` 은 `status === 0 || status >= 500` 만 재시도 가능으로 본다. 잠금은 429 라
자격 증명 오류와 같은 취급을 받아 **비밀번호가 지워진다.** 그러면 제출 버튼이 다시 비활성이 되어
(§4.5 "두 필드 중 하나라도 비었을 때") 사용자는 잠금이 풀렸는지 확인하려고 비밀번호를 매번
다시 쳐야 한다.

화면이 막히는 것은 아니라서 **AC-44 를 어기지는 않는다.** §4.6 표의 4번 행(잠금)이
비밀번호 처리에 대해 아무 말도 하지 않아 명세로 판정할 수 없어 결함이 아닌 **요청**으로 남긴다.

### 요청

§4.6 이 잠금 행의 비밀번호 처리를 명시해 달라. 5·6번 행(서버·네트워크)처럼 **유지**하는 쪽이
§4.7 설계 의도 4 와 맞아 보이지만, 판단은 ux-designer 몫이다.
현재 동작은 `login.test.tsx` 의 `AC44_문의_주소가_없어도_잠금_안내와_폼은_그대로_동작한다` 가
"이메일은 유지 · 비밀번호 재입력 후 즉시 재시도 가능" 으로 고정해 두었다.

---

## D-E1 [Low] 로그인 화면의 입력란에 `testID` 가 없어 E2E 셀렉터가 불안정하다

- 올린 역할: integration-tester (2026-08-27)
- 받는 역할: mobile-developer
- 상태: **열림 (차단하지 않음)**
- 위치: `mobile/src/features/auth/screens/LoginScreen.tsx` — 이메일·비밀번호 `TextField` 두 곳
- 비교 대상: 같은 저장소의 `SignUpScreen.tsx` 는 세 입력란 모두 `testID` 를 갖는다
  (`signup-email` · `signup-password` · `signup-reason`)

### 무슨 일이

로그인 화면에는 `login-submit` · `session-banner` · `login-error` · `login-locked` 에만
`testID` 가 있고 **입력란 두 개에는 없다.** 그래서 Maestro 플로우가 입력란을 이렇게 잡는다.

| 입력란 | 지금 쓰는 셀렉터 | 왜 이렇게 됐나 |
|---|---|---|
| 이메일 | 플레이스홀더 `name@example.com` | 라벨 "이메일" 은 `Text` 라 눌러도 포커스가 가지 않는다 |
| 비밀번호 | `text: '비밀번호', index: 1` | 라벨 `Text` 와 입력란의 `accessibilityLabel` 이 **같은 문자열**이라 순서로 가를 수밖에 없다 |

둘 다 화면 문구·요소 순서에 묶인 셀렉터다. 문구가 바뀌거나(플레이스홀더는 `design.md` §11 의
확정 문구다) 레이아웃에 요소가 하나 끼면 **기능이 멀쩡한데 E2E 만 깨진다.** 그때 실패 메시지는
"요소를 찾지 못했다" 라서 원인이 앱인지 서버인지 계약인지 판별하는 데 시간이 든다 —
이 계층이 가장 피해야 하는 실패 모양이다.

### 요청

`TextField` 에 `testID="login-email"` / `testID="login-password"` 를 붙여 달라.
가입 화면과 같은 규칙이면 되고, 화면 동작·문구·접근성에는 영향이 없다.

붙으면 `e2e/flows/auth-02-login-home.yaml` 과 `auth-03-session-persistence.yaml` 의
해당 4줄을 `id:` 셀렉터로 바꾼다. 그 전까지는 위 셀렉터로 둔다 —
**이 항목은 파이프라인을 막지 않는다.**

### 이 항목이 막지 않는 것

지금 셀렉터로도 플로우는 성립한다. 다만 `index: 1` 이 실제로 입력란을 가리키는지는
**아직 기계로 확인되지 않았다** — 이 머신에 Maestro·시뮬레이터가 없어
`make test-e2e` 를 돌리지 못했다 (`status.md` 의 `ASK` 9). 첫 실행에서 순서가 다르면
플로우 주석에 적어 둔 대로 index 를 뒤집으면 된다.

## D-E2 [Medium] iOS E2E 에서 Maestro 가 앱에 닿지 못하는 함정 4가지

- 올린 역할: integration-tester (2026-09-02)
- 받는 역할: integration-tester (플로우에서 흡수 완료) / 참고: mobile-developer
- 상태: **해소 (플로우 쪽에서 흡수).** 앱을 고칠 항목은 없다
- 환경: Xcode 26.6 · iOS 26.5 시뮬레이터(iPhone 17 Pro) · Maestro 2.10.0

`auth-01-signup-pending` 이 계속 실패했는데, 원인이 앱도 서버도 계약도 아니었다.
전부 **Maestro 가 앱 요소에 닿지 못하는** 문제였고 네 가지가 겹쳐 있었다. 같은 함정을 다음 사람이
다시 밟지 않도록 남긴다. 넷 다 플로우 주석에도 근거를 적어 두었다.

| # | 증상 | 원인 | 대응 |
|---|---|---|---|
| 1 | `assertVisible` 이 `Unknown Property: timeout` 으로 **파싱 실패** | Maestro 2.x 에서 `assertVisible` 의 `timeout` 이 제거됨 | `extendedWaitUntil` + `visible:` 로 교체 |
| 2 | 탭이 `COMPLETED` 인데 체크박스가 켜지지 않음 | 키보드가 화면 하단을 덮어 탭이 키보드에 막힘. `hideKeyboard` 는 iOS 26.5 에서 "Couldn't hide the keyboard" 로 실패 | 빈 영역(본문 H1)을 눌러 포커스를 푼다 |
| 3 | 비밀번호에 11자를 넣었는데 **1자만** 들어가 "8자 이상" 오류로 제출이 막힘 | 비밀번호 칸을 탭하면 iOS 가 **"강력한 암호를 사용하겠습니까?"** 시트를 띄우고 그것이 입력을 가로챈다. 앱이 `newPassword` 를 지정했기 때문이고 **실제 사용자에게도 뜨는 정상 동작이다** | 시트를 좌표로 닫는다 (아래 참조) |
| 4 | 제출 뒤 안내 화면의 문구가 전혀 안 보임 | 제출 직후 iOS **"암호를 저장하겠습니까?"** 다이얼로그가 뜨고, 열려 있는 동안 그 아래 앱 화면이 접근성 트리에서 통째로 사라진다 (`maestro hierarchy` 가 상태바만 돌려준다) | "지금 안 함" 을 좌표로 누르고 전환을 기다린다 |

### 시스템 UI 는 좌표로 누를 수밖에 없다

3·4 의 시트와 다이얼로그는 **앱 hierarchy 에 나타나지 않아** id·text 로 잡을 수 없다.
`xcrun simctl spawn booted defaults write com.apple.Preferences AutoFillPasswords -bool NO` 로
꺼 보려 했으나 값은 바뀌어도 시트는 계속 떴다. 그래서 화면 비율 좌표로 누른다
(`'91%,58%'` = 암호 제안 시트의 X, `'31%,61%'` = 저장 다이얼로그의 "지금 안 함").
비율이라 기기 크기가 달라져도 따라가지만, **iOS 버전이 올라가 시트 레이아웃이 바뀌면 다시 맞춰야 한다.**

### 접근성 트리에서 합쳐지는 문구가 있다

`AccountStatusScreen.tsx:82` 는 강조 카드에 `accessibilityLabel={제목. 본문}` 을 주어
카드를 **한 덩어리로** 읽어준다. 접근성상 옳은 설계다. 다만 Maestro 의 text 매칭은 부분 일치가
아니라 **정규식 전체 일치**라서 제목만으로는 잡히지 않는다. 플로우에서 `.*제목.*` 으로 연다.
앱을 고칠 일이 아니다.

### 남은 관찰 — 로그인 직후 `home-settings`

`auth-02` 에서 로그인은 **실제로 성공한다** (설정 화면에 서버가 내려준 `approved@e2e.planbee.test`
가 그려지는 것까지 확인했다). 그런데 로그인 직후 `extendedWaitUntil` 로 15초를 기다려도
`home-settings` 를 찾지 못하고, 같은 요소를 **단독 플로우로 확인하면 즉시 찾아진다.**
화면 전환 직후 접근성 트리 갱신이 늦는 것으로 보이나 확정하지 못했다.
홈은 아직 자리표시자 화면이므로(사람 확인, 2026-09-02) 홈이 실제로 만들어진 뒤 다시 본다.
