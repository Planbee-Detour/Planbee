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

## 스타일

### M-15. NativeWind 클래스를 쓴다 `[MUST]`

- 스타일은 `className` 으로 작성한다. (NativeWind v4 + Tailwind v3, 2026-08 확정)
- `StyleSheet` 은 클래스로 표현이 안 되는 경우에만 쓰고, 사유를 주석으로 남긴다.

### M-16. 색상 리터럴 금지 `[MUST]`

- 화면 코드에 `#RRGGBB` 를 직접 쓰지 않는다. `tailwind.config.js` 의 토큰 이름을 쓴다
  (`bg-cream`, `text-ink-muted`, `bg-brand`).
- **토큰의 단일 원본은 `tailwind.config.js`** 다. ux-designer 는 `design.md` 에서 같은 이름으로 지칭한다.
- 새 색이 필요하면 토큰을 먼저 추가하고 쓴다.

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
