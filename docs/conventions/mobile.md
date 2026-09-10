# 모바일 코딩 규칙 (React Native / TypeScript)

등급 정의는 `common.md` 참조. 규칙은 구현하면서 하나씩 추가한다.

---

## 구조

### M-1. 기능별 디렉토리 구조 `[MUST]`

```
mobile/src/
├── features/<feature>/
│   ├── screens/      # 화면 컴포넌트
│   ├── components/   # 이 기능 전용 컴포넌트
│   ├── hooks/
│   ├── api/          # react-query 훅 + 요청/응답 스키마
│   └── types.ts
├── shared/
│   ├── ui/           # 디자인 시스템 컴포넌트
│   ├── hooks/
│   ├── lib/
│   ├── config/       # 환경 변수 (env.ts)
│   ├── test/         # msw 서버 등 테스트 공용
│   └── api/          # client.ts, problem.ts, session.ts, schema.ts(생성물)
└── app/              # navigation, providers
```

근거: 기능 단위 작업 시 열어야 할 디렉토리가 1개로 줄어 컨텍스트와 병렬 충돌이 감소. (2026-08)

### M-2. 기능 간 직접 import 금지 `[MUST]` → 도입 후 `[LINT]`

- `features/a` 가 `features/b` 를 import 하지 않는다. 조합이 필요하면 `app/` 레이어에서 한다.
- 의존 방향: `app/` → `features/` → `shared/`. 역방향 금지. **타입 전용 import 도 예외가 아니다.**
- **내비게이션 파라미터 목록은 기능이 선언하고 `app/` 이 조합한다.** (2026-08-27 확정, `auth` 재작업)
  화면 파라미터를 `app/navigation/types.ts` 에 두면 그 파라미터를 쓰는 화면 전부가 거꾸로 `app/` 을
  import 하게 된다. 기능은 `features/<feature>/navigation.ts` 에 자기 화면의 파라미터를 선언하고,
  `app/navigation/types.ts` 는 그것들을 모아 스택 목록(`AuthStackParamList` 등)을 만든다.
  화면은 자기 기능의 `navigation.ts` 만 본다. (defects.md D-M3)
- TODO: `eslint-plugin-boundaries` 도입 후 `[LINT]` 로 전환한다.

### M-3. shared 승격 기준 `[MUST]`

- **2개 이상의 기능이 실제로 사용할 때만** `shared/` 로 올린다.
- "나중에 쓸 것 같아서" 올리지 않는다. 기능별 구조의 유일한 실패 모드가 `shared/` 가 잡동사니가 되는 것이다.

## 상태

### M-4. 서버 상태는 react-query 가 소유한다 `[MUST]`

- 서버에서 받은 데이터를 zustand 등 클라이언트 상태에 **복사하지 않는다.**
- zustand 는 서버와 무관한 UI 상태(모달 열림, 필터 선택 등)만 담는다.
- 근거: 캐시 이중화로 인한 불일치 방지. (2026-08)

### M-5. 파생 가능한 값은 상태로 두지 않는다 `[SHOULD]`

- 기존 상태에서 계산 가능한 값은 렌더 시점에 계산한다.

### M-18. 서버 데이터를 앱에서 조합하지 않는다 `[MUST]`

`common.md` C-8 의 모바일 측 이행 방법이다.

- 한 화면 영역을 그리려고 **쿼리 훅을 2개 이상 호출해 결과를 합치지 않는다.**
  필요한 필드가 응답에 없으면 화면을 우회 구현하지 말고 `defects.md` 로 계약 변경을 요청한다.
- 표시값을 응답 필드로 **계산하지 않는다.** 거리, 소요시간, D-day, 진행률, 상태 문구는
  서버가 계산한 필드를 그대로 렌더한다. 없으면 계약에 요청한다.
- 허용: 로케일 날짜/시각 포맷팅(C-2), 숫자 표기, react-query 의 페이지 이어붙이기,
  서버와 무관한 UI 상태와의 결합(M-4).
- 근거: 조합을 앱에 두면 규칙 변경마다 앱 배포가 필요하고, 호출 수만큼 M-6 의 4가지 상태가
  곱해진다. (2026-08)

## 화면

### M-6. 4가지 상태를 모두 구현한다 `[MUST]`

- 모든 데이터 화면은 **로딩 / 정상 / 비어있음 / 오류** 를 구현한다.
- 비어있음과 오류 누락이 가장 흔한 결함이다.

### M-7. 사용자 문구는 design.md 를 그대로 쓴다 `[MUST]`

- 개발자가 문구를 지어내지 않는다. 명세에 없으면 ux-designer 에게 요청한다.

## 타입

### M-8. API 타입은 계약에서 생성한다 `[MUST]`

- `make contract-types` 로 `docs/api/openapi.yaml` → `src/shared/api/schema.ts` 를 생성한다.
- **`schema.ts` 를 손으로 수정하지 않는다.** 필요한 변경은 계약에 요청한다(tech-lead).
- API 호출은 `shared/api/client.ts` 의 `apiClient` 와 `request()` 를 쓴다. `fetch` 를 직접 부르지 않는다.

### M-9. `any` 와 불필요한 단언 금지 `[MUST]` → 도입 후 `[LINT]`

- `any`, 근거 없는 `as` 를 쓰지 않는다. 불가피하면 사유 주석을 단다.

### M-17. API 경계 타입은 `snake_case` 를 그대로 쓴다 `[MUST]`

`common.md` C-7 의 모바일 측 이행 방법이다.

- 서버가 준 필드 이름을 **바꾸지 않는다.** `data.created_at` 을 그대로 읽는다.
  `camelCase` 로 되돌리는 매퍼·변환 함수·`camelcase-keys` 류 라이브러리를 도입하지 않는다.
- 요청 본문과 쿼리 파라미터도 `snake_case` 로 보낸다.
- 생성물인 `schema.ts` 가 기준이다 (M-8). 손으로 적은 인터페이스가 생성 타입과 다르면
  손으로 적은 쪽을 지운다.
- ESLint 의 `camelcase` 계열 규칙은 이 경계 타입에 적용하지 않는다. 규칙을 켤 때
  `properties: 'never'` 로 두어 객체 프로퍼티를 검사 대상에서 뺀다.
- 화면 내부에서만 쓰는 값(로컬 상태, props, 훅 반환)은 TypeScript 관례대로 `camelCase` 다.
  `shared/api/session.ts` 의 `Tokens { accessToken, refreshToken }` 은 Keychain 저장용 내부
  모델이므로 이대로 둔다.
- **경계와 내부 모델의 변환은 한 곳에서만 한다.** (2026-08-26 확정 / 2026-08-27 위치 정정, `auth` 구현)
  서버는 `access_token` / `refresh_token` 으로 주고 Keychain 은 `Tokens` 로 저장한다.
  그 변환은 `shared/api/session.ts` 의 `toTokens` **하나**에 있고, 저장은 그것을 감싼
  `saveTokenPair(pair)` 로 한다. 화면·기능·`app/` 어디서도 같은 변환을 다시 하지 않는다 —
  이건 M-17 이 금지하는 "매퍼 레이어" 가 아니라, 저장소 모델과 API 모델이
  서로 다른 두 계약이라서 생기는 <b>배선</b>이다. 새 저장 항목이 생기면 여기에 함께 둔다.
  - 처음에는 이 자리를 `app/configureSession.ts` 로 적었는데, 그러면 토큰을 저장하는 화면이
    `features/` → `app/` 을 import 하게 되어 **M-2(역방향 금지)와 충돌한다.** 저장 모델(`Tokens`)을
    정의한 모듈이 그 변환도 갖는 것이 두 규칙을 모두 만족한다.
    (2026-08-27, defects.md D-M1·D-M3)

## 스타일

### M-15. NativeWind 클래스를 쓴다 `[MUST]`

- 스타일은 `className` 으로 작성한다. (NativeWind v4 + Tailwind v3, 2026-08 확정)
- `StyleSheet` 은 클래스로 표현이 안 되는 경우에만 쓰고, 사유를 주석으로 남긴다.

### M-16. 색상 리터럴 금지 `[MUST]`

- 화면 코드에 `#RRGGBB` 를 직접 쓰지 않는다. `tailwind.config.js` 의 토큰 이름을 쓴다
  (`bg-cream`, `text-ink-muted`, `bg-brand`).
- **코드에서 토큰의 단일 원본은 `mobile/tailwind.tokens.js`** 다. `tailwind.config.js` 는 이 파일을
  `require` 해 Tailwind 테마로 배선하기만 한다. ux-designer 는 `design.md` 에서 같은 이름으로 지칭한다.
  - 값을 config 에서 분리한 이유: `tailwind.config.js` 는 최상단에서 `nativewind/preset` 을
    `require` 하는 **빌드 도구용** 모듈이라 앱 번들에서 import 할 수 없다(tailwindcss 의 Node 전용
    의존성이 딸려 온다). 값만 담은 의존성 없는 모듈을 두어 config 와 앱이 같은 파일을 읽게 한다.
    (2026-08-27 확정, `auth` 재작업 / defects.md D-M2)
- 토큰 **값**의 시각적 원본은 `docs/design/planbee.pen` 의 `Screen 01 — Design System` 이다 (common.md C-9).
  `tailwind.tokens.js` 는 그 값을 코드로 옮긴 사본이다. 둘이 어긋나면 pen 을 기준으로 코드를 고친다.
- **`className` 을 받지 못하는 RN prop 도 리터럴을 쓰지 않는다.** `ActivityIndicator` 의 `color`,
  `TextInput` 의 `placeholderTextColor`, `StatusBar` 의 `backgroundColor` 등은 색 값을 직접 받는데,
  그럴 때는 `src/shared/ui/tokens.ts` 의 `COLOR` 를 통해 **토큰 값을 읽어 온다.**
  "이 prop 은 클래스를 못 받으니 어쩔 수 없다" 는 리터럴의 사유가 되지 않는다.
- 새 색이 필요하면 pen 의 Design System 에 있는지 먼저 확인하고, 있으면 그 값으로 토큰을 추가해 쓴다.
  pen 에 없는 값은 임의로 만들지 말고 `defects.md` 로 ux-designer 에게 요청한다.

### M-25. CSS 변수를 만드는 유틸리티는 조건부로 <b>붙였다 뗐다</b> 하지 않는다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` 재작업 — 세그먼트 전환 시 화면 백지 결함)

- 대상은 Tailwind 가 `--tw-*` 변수로 컴파일하는 유틸리티다:
  `shadow-*` · `ring-*` · `blur-*` / `drop-shadow-*` 등 필터 · `scale-*` / `rotate-*` /
  `translate-*` / `skew-*` 등 트랜스폼 · `from-*` / `via-*` / `to-*` 그라디언트.
- 이런 클래스를 **한쪽 분기에만** 넣으면 안 된다. 반대 분기에도 같은 계열의 기본값
  (`shadow-none`, `scale-100`, `rotate-0` …)을 함께 준다.

  ```tsx
  // 안 됨 — 선택될 때 CSS 변수가 처음 생긴다
  active ? 'bg-surface shadow-segment' : ''
  // 됨 — 두 상태 모두 --tw-shadow 를 선언한다. 모양은 같다
  active ? 'bg-surface shadow-segment' : 'shadow-none'
  ```

- **이유.** 첫 렌더에 CSS 변수가 없던 컴포넌트에 변수가 뒤늦게 생기면 NativeWind 는 그것을
  "업그레이드"(`VariableContext.Provider` 로 감싸기)로 보고 개발 빌드에서 경고를 찍는다.
  그 경고는 `JSON.stringify` 로 props 전체를 훑는데(`react-native-css-interop`
  `render-component` 의 `printUpgradeWarning`), 그 과정에서 React Navigation 의
  `NavigationStateContext` 기본값에 있는 **던지는 getter** 를 건드린다. 결과는 경고가 아니라
  <b>렌더 오류</b>이고, 화면 전체가 백지가 된다. 오류 문구가
  `Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?`
  라서 내비게이션 배선 문제로 보이지만 **원인은 스타일 문자열**이다. 배선을 아무리 뒤져도 나오지 않는다.
- 값이 정말 동적이어야 하면 클래스를 갈아 끼우지 말고 `className` 을 받지 못하는 prop 처럼
  `COLOR`/`StyleSheet` 로 내려보내고 사유를 주석에 남긴다 (M-15).

## 플랫폼

### M-19. iOS 배포가 우선, 구현은 안드로이드도 성립해야 한다 `[MUST]`

- **배포 우선순위는 iOS 다.** App Store 심사·서명·권한·개인정보 처리방침·최소 지원 버전·빌드 설정이
  요구하는 제약이 있으면 그것을 먼저 만족시킨다. 안드로이드 편의를 위해 iOS 제약을 깨지 않는다.
- 그러나 **구조는 iOS 전용으로 굳히지 않는다.** iOS 에만 있는 API·네이티브 모듈·동작을 전제로
  공용 코드를 짜지 않는다. 안드로이드 대체 경로가 없는 기능은 도입하기 전에 `defects.md` 로 올린다.
- iOS 전용 네이티브 모듈을 모듈 최상단에서 무조건 import 하지 않는다 — 안드로이드에서는 로드 시점에 죽는다.
  필요하면 M-20 의 분기 안에서 지연 로드한다.
- **배포에 영향을 주는 결정은 개발자(에이전트)가 정하지 않는다.** 번들 ID·팀·서명 방식,
  최소 iOS 버전 상향, 새 권한(위치·알림·사진 등) 추가와 사용 목적 문자열, 심사에 영향을 주는
  서드파티 SDK 도입, 앱 이름·아이콘·스크린샷, 데이터 수집 항목 신고 — 전부 사람에게 묻는다.
  (`AGENTS.md` 절대 규칙 8)
- 근거: 어떤 API 가 안드로이드에서 다르게 동작하는지는 정적 분석으로 판정할 수 없어 린터가 잡지 못한다.
  리뷰어가 본다. (2026-08)

### M-20. 플랫폼 차이는 `Platform` 인라인 분기로 처리한다 `[MUST]`

- iOS 와 안드로이드 동작이 다르면 **양쪽 경로를 모두 구현한다.** 한쪽에서만 되는 코드를 그대로 두지 않는다.
- **이 저장소의 표준은 `Platform.OS` / `Platform.select` 인라인 분기다.**
  `.ios.tsx` / `.android.tsx` 파일 분리는 화면·모듈 전체가 갈라질 때만 쓰고, 쓸 때는 사유를
  파일 상단 주석에 남긴다.
  - 근거: Jest 프리셋이 `haste.defaultPlatform: 'ios'` 라서 `.android.*` 파일은 테스트에서
    **아예 로드되지 않는다.** 파일을 나누면 안드로이드 구현이 M-11·M-12 검증 밖으로 빠지고
    두 파일이 조용히 어긋난다. 인라인 분기는 한 파일에서 두 경로를 함께 테스트할 수 있다. (2026-08)
- `Platform.select` 에는 **`android` 또는 `default` 키를 반드시 채운다.** `ios` 만 주면
  안드로이드에서 `undefined` 가 그대로 흘러간다.
- 자주 갈리는 지점: 그림자(iOS `shadow*` ↔ 안드로이드 `elevation`), `KeyboardAvoidingView` 의
  `behavior`, 상태바·safe area, 햅틱, 권한 요청 흐름, 안드로이드 하드웨어 뒤로가기.
- **스크린리더 낭독은 `shared/lib/a11y` 를 쓴다.** (2026-08-27 확정, `auth` 재작업)
  iOS 는 `AccessibilityInfo.announceForAccessibility` 를 직접 불러야 읽고, 안드로이드는
  `accessibilityLiveRegion="polite"` 가 붙은 뷰를 시스템이 스스로 읽는다 — 한쪽만 쓰면 반대쪽에서
  아무것도 읽히지 않는다. 뷰에 `LIVE_REGION_POLITE` 를 펼치고 같은 문장으로
  `useAnnounceForAccessibility` 를 부른다. 보이는 요소 없이 읽기만 할 때는 `A11yAnnouncement`.
  화면 코드에 `accessibilityLiveRegion` 을 직접 적지 않는다. (defects.md D-M4)
- 분기를 넣었으면 **양쪽 분기를 테스트한다.** `Platform.OS` 를 목킹해 안드로이드 경로도 검증한다(M-11).
- 근거: iOS 에서만 확인한 코드는 안드로이드 대응 시점에 다시 쓰게 된다. (2026-08)

## 접근성

### M-10. 터치 영역과 레이블 `[MUST]`

- 터치 대상 최소 44×44pt.
- 아이콘 전용 버튼에는 `accessibilityLabel` 을 붙인다.

## 오류 처리와 인증

### M-13. 오류는 `code` 로 분기한다 `[MUST]`

- 서버 오류 응답은 RFC 9457 `application/problem+json` 이다. (`common.md` C-1)
- **`title`/`detail` 문자열이나 HTTP 상태로 분기하지 않는다.** `code` 필드로만 분기한다.
  문구는 바뀔 수 있고 코드는 계약이다.
- 사용자에게 보여줄 문구는 `detail` 을 쓴다. `title` 은 영문 상태 문구이므로 노출하지 않는다.
- 검증 실패(`VALIDATION_FAILED`)는 `errors[]` 를 필드별 오류 표시에 매핑한다.
- 카탈로그(`docs/api/error-codes.md`)에 없는 `code` 를 받으면 일반 오류 문구로 처리한다. 앱이 죽지 않아야 한다.
- 오류 파싱은 `shared/api` 한 곳에서 하고, 화면은 파싱된 결과만 다룬다.

### M-14. 인증 토큰 취급 `[MUST]`

- **액세스·리프레시 토큰은 `react-native-keychain` 에만 저장한다.** MMKV/AsyncStorage 금지.
- `UNAUTHORIZED` 를 받으면 **토큰 갱신을 1회만** 시도하고, 실패하면 로그인 화면으로 보낸다.
  동일 요청을 무한 반복하지 않는다.
- 갱신 요청이 동시에 여러 개 발생하면 하나로 합친다(단일 비행). 그러지 않으면 리프레시 토큰 회전과 충돌한다.
- `FORBIDDEN` 은 갱신 대상이 아니다. 재시도하지 않는다.
- 토큰을 로그에 남기지 않는다.

### M-21. 디자인 시스템 컴포넌트는 `shared/ui` 에 둔다 `[MUST]`

M-3(2개 이상 기능이 쓸 때만 `shared/` 로 올린다)의 **명시적 예외**다. (2026-08-26 확정, `auth` 구현)

- `docs/design/planbee.pen` 의 `Screen 01 — Design System` 프레임에 있는 컴포넌트는
  기능이 하나뿐일 때도 `shared/ui/` 에 둔다.
- **기능 전용 조합은 올리지 않는다.** 예: `auth` 의 동의 블록·문의 블록은
  `features/auth/components/` 에 있고, 그 안에서 쓰는 `Input/Checkbox`·`Layout/ContactRow` 만
  `shared/ui` 다. 판단 기준은 "pen 의 Design System 프레임에 있는가" 하나다.
- **근거**: 디자인 시스템은 정의상 기능에 속하지 않는다 — pen 의 그 프레임이 앱 전체의 공용
  어휘다. 첫 사용 기능 안에 두면 두 번째 기능이 생기는 순간 "기능 A 에서 기능 B 로 import" 라는
  M-2 위반이 강제되고, 그때 옮기는 비용이 지금 올려 두는 비용보다 크다.
  M-3 이 막으려는 것은 "나중에 쓸 것 같아서" 올리는 추측인데, 여기서는 pen 이 근거다.

### M-22. 생성물은 원본에서 만들고 손으로 고치지 않는다 `[MUST]`

(2026-08-26 확정, `auth` 구현)

| 생성물 | 원본 | 명령 |
|---|---|---|
| `src/shared/api/schema.ts` | `docs/api/openapi.yaml` | `make contract-types` |
| `src/features/auth/legal/documents.generated.ts` | `docs/legal/*.md` | `make legal-bundle` |

- 약관 본문은 **앱 번들에 있어야 한다** — AC-37 이 오프라인 열람을 요구하기 때문이다.
  그렇다고 md 를 손으로 옮기면 원본과 사본이 갈라지고, 그 순간 화면에 뜨는 약관과
  실제로 동의를 받은 약관이 달라진다. 복사는 사람이 아니라 생성기가 한다.
- 버전·시행일도 같은 생성물에서 읽는다. 화면 표시(AC-36)·동의 이력 저장(AC-8)·문서가
  **한 값**을 공유해야 한다. 화면 코드에 `'v1.0'` 을 적지 않는다.
- `documents.generated.ts` 는 커밋하지 않는다(`.gitignore`). `make verify-mobile` 이 먼저 생성한다.

### M-23. 다른 기능의 화면에 끼워 넣는 블록은 **슬롯 + `app/` 조합**으로 만든다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` 구현)

- 기능 A 의 화면에 기능 B 의 블록이 들어가야 하면, **A 는 `renderXxx` 슬롯 prop 만 받고**
  실제 컴포넌트는 `app/navigation/*` 이 넣는다. A 가 B 를 import 하면 M-2 위반이다.
- 슬롯에는 **A 가 이미 조회한 응답을 그대로 넘긴다.** B 가 같은 화면 영역을 위해 자기 쿼리를
  또 부르면 한 영역에 호출이 2회가 되어 C-8 / M-18 위반이다.
- **무엇을 그릴지(또는 그리지 않을지)는 B 가 정한다.** A 는 그 판단(역할·권한 등)에 관여하지 않는다.
  예: `SettingsScreen(renderExtraSection)` ← `MainNavigator` ← `AdminSettingsSection`
  (`admin-user-approval` design.md §4.7).
- 근거: 화면 소유자와 블록 소유자가 다를 때 import 방향을 뒤집지 않고도 조합할 수 있는 유일한 자리가
  `app/` 이다. 슬롯이 없으면 A 의 화면 코드에 B 의 도메인 판단이 스며든다.

### M-24. 기능 경계를 넘는 쿼리 키는 `shared/api/queryKeys.ts` 에 둔다 `[MUST]`

(2026-09-09 확정, `admin-user-approval` 구현)

- 대부분의 쿼리 키는 그 기능 안에 둔다. **다른 기능이 무효화해야 하는 키만** 여기로 올린다.
  예: `ACCOUNT_QUERY_KEY`(`GET /auth/me`) — 관리자가 신청을 처리하면 그 응답의
  `pending_approval_count` 가 바뀌므로 `admin-user-approval` 이 무효화해야 한다.
- 키 문자열을 양쪽에 복사하지 않는다. 한쪽만 바뀌면 무효화가 조용히 안 걸린다.
  그렇다고 다른 기능의 모듈을 import 하면 M-2 위반이다.
- **무효화만 한다.** 다른 기능의 캐시 데이터를 직접 읽거나 `setQueryData` 로 쓰지 않는다 —
  그건 두 기능이 같은 응답 모델을 공유하는 것이고, 필요하면 그 값을 넘겨 주는 쪽(M-23)으로 푼다.

## 테스트 (mobile-tester)

### M-11. API 는 msw 로 목킹한다 `[MUST]`

- 모바일 테스트는 서버를 띄우지 않는다. 목 데이터는 `contract.yaml` 의 `example` 을 근거로 만든다.

### M-12. 사용자 관점으로 쿼리한다 `[MUST]`

- `getByText` / `getByRole` 우선. `testID` 는 다른 방법이 없을 때만.
- 스냅샷 테스트를 쓰지 않는다. 무엇이 깨졌는지 알려주지 않아 재작업 루프가 늘어난다.

---

## 테스트 환경 메모

- **RNTL 14 의 `render` 는 비동기다.** React 19 의 `act` 정렬로 `Promise<RenderResult>` 를
  돌려주므로 반드시 `await` 한다. 잊으면 `getByText is not a function` 또는
  `` `render` function has not been called `` 로 나타나는데, 두 메시지 모두 원인을 가리키지 않는다.
  ```tsx
  const {getByText} = await render(<Screen />);
  ```
- **`fireEvent` 도 비동기다.** 같은 이유로 `fireEvent.press` / `fireEvent.changeText` /
  `fireEvent(el, 'blur')` 가 전부 `Promise` 를 돌려준다. `await` 하지 않으면 상태 갱신이
  반영되기 <b>전에</b> 다음 줄이 실행되어 "버튼이 계속 비활성" 같은 엉뚱한 실패로 나타난다.
  콘솔에는 원인과 무관해 보이는 `overlapping act() calls` 만 찍힌다. (2026-08-27, `auth` 테스트)
  ```tsx
  await fireEvent.changeText(getByLabelText('이메일'), 'name@example.com');
  await fireEvent.press(getByRole('button', {name: '로그인'}));
  ```
- **한 테스트 안에서 `render` 를 두 번 부르지 않는다.** `unmount()` 를 끼워도 `screen` 이
  두 번째 트리를 가리키지 못해 그 테스트와 <b>뒤따르는 테스트까지</b> 깨진다.
  변형이 여러 개면 `test.each` 로 테스트를 나눈다. (2026-08-27, `auth` 테스트)
- **Keychain 상태 초기화는 `shared/api/session` 의 `clearTokens()` 로 한다.**
  `jest.requireMock('react-native-keychain')` 으로 얻은 목의 리셋 함수는 앱이 쓰는 모듈
  인스턴스에 닿지 않아 <b>조용히 아무것도 지우지 않는다.</b> (2026-08-27, `auth` 테스트)
- msw 는 RN 에서 `msw/node` 가 export 조건에 막힌다. **`msw/native` 를 쓴다.**
  (`src/shared/test/mswServer.ts` 참조)
- 핸들러에 없는 요청은 오류로 처리한다(`onUnhandledRequest: 'error'`). 테스트가 실제 네트워크를 타면 안 된다.
- 네이티브 모듈 목은 `mobile/__mocks__/` 에 둔다 (Keychain, Config). 새 네이티브 모듈을 쓰면 목도 함께 추가한다.
- **react-query 를 쓰는 테스트는 `shared/test/queryClient.ts` 의 `createTestQueryClient()` 로 만든다.**
  직접 `new QueryClient(...)` 를 쓰면 `gcTime` 기본값 300초짜리 gc 타이머가 남아, 테스트가 끝나도
  이벤트 루프가 살아 있다. jest 가 `Jest did not exit one second after the test run has completed` 를
  찍고 <b>5분을 더 기다린 뒤</b> 종료한다 — CI 에서 런마다 5분씩 낭비했다.
  `queries` 뿐 아니라 **`mutations` 의 `gcTime` 도 함께 0** 이어야 한다. 하나만 0으로 두면 증상이 그대로다.
  (2026-09-10. 전체 게이트 329초 → 35초) 앱의 실제 설정은 `app/providers.tsx` 이고 여기 값을 옮기지 않는다.
- **목킹한 `Alert` 의 `onPress` 를 직접 부를 때는 `await act(async () => …)` 로 감싼다.**
  `Alert` 은 렌더된 컴포넌트가 아니라 네이티브 모듈이라 화면 트리에 버튼 노드가 없다 —
  `fireEvent` 로 누를 대상이 없어 테스트가 핸들러를 직접 부르게 되는데, 그러면 어떤 `act` 창에도
  들어가지 않아 `not wrapped in act(...)` 가 난다. M-12(사용자 관점 쿼리)의 예외가 아니라
  그 규칙이 다루지 않는 영역이다. (2026-09-10, `settings`·`accountDelete`·`processedSheet`·`conflict`)
- **`await` 뒤에 상태를 갱신하는 제출 핸들러는 제출이 끝날 때까지를 한 `act` 창으로 묶는다.**
  `fireEvent` 는 핸들러가 돌려준 프로미스를 기다리지 않으므로, `await` 뒤의 꼬리 갱신
  (`setSubmitting(false)` 같은)이 `act` 창 밖에서 떨어진다. `LoginScreen` 은 최소 노출 시간
  400ms 를 채운 뒤 갱신하므로 `login.test.tsx` 의 `pressSubmit` 처럼 그만큼을 `act` 안에서
  기다린다. (2026-09-10. 경고 107건 → 9건)
- **react-query 의 `notifyManager` 를 동기 스케줄러로 바꾸지 않는다.** 남은 경고 몇 건을
  없애려고 `notifyManager.setScheduler(cb => cb())` 를 넣으면 알림이 즉시 떨어져
  <b>"승인 중…" 같은 처리 중 상태가 아예 관찰되지 않는다.</b> 그 중간 상태를 검증하는
  인수조건 테스트가 깨진다. 실측으로 배제했다. (2026-09-10, `pendingSheet`·`platformAndroid`)
- **네이티브 목의 기본 동작을 주석으로 단정하지 말고 파일을 열어 확인한다.**
  `__mocks__/@react-native-community/geolocation.ts` 는 좌표로 <b>즉시 성공</b>하는데 테스트는
  "응답하지 않는다" 고 가정했다. 화면이 곧바로 조회로 넘어가 msw 핸들러가 없어 오류 상태가 됐고,
  단언이 그 전환보다 먼저 도느냐 뒤에 도느냐로 결과가 갈려 CI 에서 간헐적으로 깨졌다.
  중간 상태를 단언하려면 목을 그 테스트에서 **명시적으로 덮어써** 전환 자체를 없앤다.
  (2026-09-10, `nearby-places` 스모크. `defects.md` DEF-004)

## 미확정

- **애니메이션**: `react-native-reanimated` 는 아직 도입하지 않았다.
  (`react-native-worklets` 는 gesture-handler 요구사항으로 이미 설치됨 — reanimated 추가 시 바로 가능)
- **react-native-config 의 iOS 빌드 설정**: `.env` 를 실제로 읽으려면 Xcode 빌드 페이즈 추가가 필요하다.
  현재는 기본값(`http://localhost:8080`)으로 동작한다.
