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
- 의존 방향: `app/` → `features/` → `shared/`. 역방향 금지.
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
  모델이므로 이대로 둔다. — TODO: 토큰 갱신 엔드포인트가 계약에 추가되면 **응답 본문은
  `access_token` / `refresh_token`** 이어야 한다. `client.ts` 의 `RefreshFn` 이 응답을 그대로
  `Tokens` 로 받고 있으므로, 그 시점에 경계와 내부 모델을 분리한다.

## 스타일

### M-15. NativeWind 클래스를 쓴다 `[MUST]`

- 스타일은 `className` 으로 작성한다. (NativeWind v4 + Tailwind v3, 2026-08 확정)
- `StyleSheet` 은 클래스로 표현이 안 되는 경우에만 쓰고, 사유를 주석으로 남긴다.

### M-16. 색상 리터럴 금지 `[MUST]`

- 화면 코드에 `#RRGGBB` 를 직접 쓰지 않는다. `tailwind.config.js` 의 토큰 이름을 쓴다
  (`bg-cream`, `text-ink-muted`, `bg-brand`).
- **코드에서 토큰의 단일 원본은 `tailwind.config.js`** 다. ux-designer 는 `design.md` 에서 같은 이름으로 지칭한다.
- 토큰 **값**의 시각적 원본은 `docs/design/planbee.pen` 의 `Screen 01 — Design System` 이다 (common.md C-9).
  `tailwind.config.js` 는 그 값을 코드로 옮긴 사본이다. 둘이 어긋나면 pen 을 기준으로 코드를 고친다.
- 새 색이 필요하면 pen 의 Design System 에 있는지 먼저 확인하고, 있으면 그 값으로 토큰을 추가해 쓴다.
  pen 에 없는 값은 임의로 만들지 말고 `defects.md` 로 ux-designer 에게 요청한다.

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

## 테스트 (mobile-tester)

### M-11. API 는 msw 로 목킹한다 `[MUST]`

- 모바일 테스트는 서버를 띄우지 않는다. 목 데이터는 `contract.yaml` 의 `example` 을 근거로 만든다.

### M-12. 사용자 관점으로 쿼리한다 `[MUST]`

- `getByText` / `getByRole` 우선. `testID` 는 다른 방법이 없을 때만.
- 스냅샷 테스트를 쓰지 않는다. 무엇이 깨졌는지 알려주지 않아 재작업 루프가 늘어난다.

---

## 테스트 환경 메모

- msw 는 RN 에서 `msw/node` 가 export 조건에 막힌다. **`msw/native` 를 쓴다.**
  (`src/shared/test/mswServer.ts` 참조)
- 핸들러에 없는 요청은 오류로 처리한다(`onUnhandledRequest: 'error'`). 테스트가 실제 네트워크를 타면 안 된다.
- 네이티브 모듈 목은 `mobile/__mocks__/` 에 둔다 (Keychain, Config). 새 네이티브 모듈을 쓰면 목도 함께 추가한다.

## 미확정

- **애니메이션**: `react-native-reanimated` 는 아직 도입하지 않았다.
  (`react-native-worklets` 는 gesture-handler 요구사항으로 이미 설치됨 — reanimated 추가 시 바로 가능)
- **react-native-config 의 iOS 빌드 설정**: `.env` 를 실제로 읽으려면 Xcode 빌드 페이즈 추가가 필요하다.
  현재는 기본값(`http://localhost:8080`)으로 동작한다.
