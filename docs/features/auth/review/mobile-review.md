# 모바일 코드 리뷰: `auth`

> **최신 판정: PASS** (재작업 1회차 재리뷰, 2026-08-27 — 문서 하단 "재리뷰" 절).
> 아래 1차 판정(FAIL)은 이력으로 남긴다. 지우지 않는다.

## 1차 리뷰 (2026-08-27)

- **판정: FAIL** — `[MUST]` 위반 5건 (`D-M1` ~ `D-M5`, `defects.md`)
- 리뷰 역할: mobile-reviewer
- 날짜: 2026-08-27
- 대상: 커밋되지 않은 `mobile/` 변경분 (`git status` / `git diff` 기준, 직전 커밋 `9563368`)
- 판정 근거: `docs/conventions/mobile.md`, `docs/conventions/common.md` **에 적힌 것만** (절대 규칙 2).
  `make lint-mobile` 이 잡는 것은 이 문서에 쓰지 않는다 (절대 규칙 3).

---

## 0. 요약

구조·계약 정합성은 대체로 좋다. 계약 타입을 생성물에서만 가져오고(M-8), 오류를 `code` 로만
분기하며(M-13), 토큰을 Keychain 에만 두고 단일 비행 갱신을 지키고(M-14), 서버가 내린 문구를
앱이 조합하지 않는다(C-8 / M-18). 약관 번들 생성기와 `.gitignore`·`verify-mobile` 배선은
M-22 를 정확히 따른다.

막는 것은 **다섯 가지**이고 전부 기계가 잡지 못하는 것들이다. 그중 셋(`D-M1`·`D-M2`·`D-M3`)은
같은 성격이다 — **단일 원본이 있어야 할 값·타입·방향이 여러 곳으로 새어 나갔다.** 규칙이
막으려던 정확히 그 지점이다.

| # | 등급 | 규칙 | 무엇 |
|---|---|---|---|
| D-M1 | `[MUST]` | M-17 | 토큰 경계 변환(`access_token` → `accessToken`)이 화면 2곳에서 반복된다 |
| D-M2 | `[MUST]` | M-16 | 색상 리터럴 `#RRGGBB` 3곳 |
| D-M3 | `[MUST]` | M-2 | `features/` 가 `app/` 을 import 한다 (역방향, 8파일) |
| D-M4 | `[MUST]` | M-20 | 접근성 낭독이 안드로이드 전용 API 로만 구현됐다 (iOS 경로 없음) |
| D-M5 | `[MUST]` | M-7 | 가입 화면의 문구 배치가 `design.md` §5.2·§5.3 과 다르다 |

`[SHOULD]` 위반: 없음. 규칙 밖 관찰은 §4 에 참고로만 적었다 — **차단하지 않는다.**

`make lint-mobile` 통과(출력 없음). ESLint 가 잡은 항목은 0건이므로 절대 규칙 3 에 걸리는 지적도 없다.

---

## 1. 통과한 항목

읽은 파일: 신규 `features/auth/**`(16) · `shared/ui/**`(10+README) · `app/navigation/**`(2) ·
`app/configureSession.ts` · `scripts/bundle-legal.mjs`, 수정 `App.tsx` ·
`shared/api/{client,problem,schema}.ts` · `tailwind.config.js`. 전부 최소 1회 읽었다.

| 규칙 | 판정 | 근거 |
|---|---|---|
| **M-1** 기능별 디렉토리 | 통과 | `features/auth/{screens,components,hooks,api}` + `types.ts`. `legal/` 은 M-22 가 지정한 경로다 |
| **M-3 / M-21** shared 승격 | 통과 | `shared/ui` 10개가 전부 pen `Screen 01 — Design System` 의 컴포넌트(`Input/TextField`·`Input/Checkbox`·`Badge/Requirement`·`Feedback/Banner`·`Feedback/StatusIcon`·`Layout/NavBar`·`Layout/ListRow`·`Button/*`·`Feedback/Toast`·`Layout/ContactRow`)다. 기능 전용 조합(`ConsentBlock`·`ContactBlock`·`LegalMarkdown`)은 `features/auth/components/` 에 남았다 — M-21 이 그은 선("pen 의 Design System 프레임에 있는가")과 정확히 일치한다 |
| **M-4 / M-5** 상태 소유권 | 통과 | `useSession` 에 서버 데이터가 없다(`isSignedIn`·`notice`·`toast` 뿐). 계정 정보는 react-query(`['auth','me']`), 상태 안내 데이터는 내비 파라미터. `ConsentBlock` 의 "전체 동의" 는 파생값이라 상태를 두지 않았다(M-5) |
| **M-6** 4가지 상태 | 통과 | 로그인 §4.8 / 가입 §5.8 / 약관 §6.8 / 상태 §7.5 / 설정 §8.5 / 삭제 §9.7 모두 구현. 특히 설정의 "계정 조회 실패해도 약관·삭제는 눌린다"(AC-35·28)와 상태 화면의 "알 수 없는 상태 값"(M-13) 경로가 실제로 있다 |
| **M-8** 계약에서 타입 생성 | 통과 | `types.ts` 가 `components['schemas'][...]` 만 재export. `openapi-typescript docs/api/openapi.yaml` 재생성 결과와 `schema.ts` 가 **바이트 단위로 일치**함을 확인했다(손 수정 없음). `fetch` 직접 호출 0건 |
| **M-9** `any`·단언 | 통과 | `any` 0건. `as` 는 `endpoints.ts` 의 `extension<T>`(RFC 9457 확장 필드 파싱)와 `client.ts` 의 기존 코드뿐이고 둘 다 사유 주석이 있다 |
| **M-13** `code` 분기 | 통과 | `AUTH_ERROR` 상수 12종으로만 분기. `title`/`detail` 문자열이나 상태 코드로 분기하는 곳 없음. 카탈로그에 없는 코드는 일반 오류로 떨어진다(`toBanner` 의 기본 분기, `UnknownStatus`). 잠금 응답에서 `lock_remaining_minutes` 를 못 읽으면 값을 지어내지 않고 일반 오류로 내려간다 — 좋은 처리다 |
| **M-14** 토큰 취급 | 통과 | Keychain 전용(`session.ts`), 401 갱신 1회·단일 비행(`refreshInFlight`), 403 은 갱신 대상 아님, 토큰 로그 0건. **삭제 전용 토큰(AC-50)을 들고 온 요청은 갱신을 타지 않게 막은 처리**(`carriesOwnToken`)가 M-14 의 "무한 반복 금지" 취지와 맞다 |
| **M-15** NativeWind | 통과 | 스타일은 전부 `className`. `StyleSheet` 은 기존 `providers.tsx` 한 곳뿐이고 이번 변경분이 아니다 |
| **M-18 / C-8** 앱이 조합하지 않음 | 통과 | 상태 화면의 제목·본문·강조 카드는 `account_status` 문자열을 그대로 렌더한다. 잠금 남은 시간은 서버 값을 그대로 쓰고 앱이 카운트다운을 돌리지 않는다. 한 화면 영역에 쿼리 훅 2개를 합치는 곳 없음. 앱이 하는 계산은 `formatDate`(C-2 가 허용하는 로케일 표기) 하나다 |
| **M-19** iOS 우선·안드로이드 성립 | 통과 | iOS 전용 네이티브 모듈 최상단 import 0건. 새 의존성(아이콘·마크다운·클립보드)을 임의로 들이지 않고 사유를 주석에 남긴 판단은 M-19·절대 규칙 8 과 맞다 |
| **M-20** 플랫폼 분기 | **부분** | `KeyboardAvoidingView` 는 `ios`/`android`/`default` 를 모두 채웠고 `.ios/.android` 파일 분리도 없다. 다만 접근성 낭독은 → **D-M4** |
| **M-22** 생성물 | 통과 | `documents.generated.ts` 는 `.gitignore` 에 있고 실제로 추적되지 않는다(`git check-ignore` 확인). `verify-mobile: legal-bundle …` 로 재생성이 게이트 앞에 붙었다. 화면 코드에 `'v1.0'` 하드코딩 0건 — 버전은 `LEGAL_DOCUMENTS[*].version` 하나에서 화면(AC-36)·동의 이력(AC-8)이 함께 읽는다 |
| **C-1 / C-2 / C-7** | 통과 | `Retry-After` 헤더로 분기하지 않고 본문 `lock_remaining_minutes` 만 쓴다(C-1 개정분 준수). 시각은 표시 직전에만 로컬 변환(C-2). 요청·응답 필드는 `snake_case` 그대로(C-7 / M-17) |
| **계약 정합성** (절대 규칙 1) | 통과 | 6개 엔드포인트 전부 계약 경로·본문과 일치. `consents` 3종 전송(거부 포함), `age_over_14_confirmed` 분리 전송, `MARKETING.version = null`, `signup_reason` 미입력 시 `null`, 삭제 요청의 Bearer 단일화(`scope: account:delete` 는 헤더로) — 전부 `contract.yaml` 대로다. 계약에 없는 호출 0건 |

---

## 2. `[MUST]` 위반 — 재작업 대상

상세와 수정 방향은 `defects.md` `D-M1` ~ `D-M5` 에 있다. 여기서는 판정 근거만 짧게 적는다.

### D-M1 · M-17 — 경계 변환이 세 곳에 있다

M-17 이 이번 작업에서 새로 확정한 문장은 **"그 변환은 `app/configureSession.ts` 하나에 있다.
화면이나 기능 코드가 같은 변환을 다시 하지 않는다"** 다. 규칙을 추가한 커밋의 코드가
그 규칙을 어긴 상태다.

- `app/configureSession.ts:33` — 정본 (맞다)
- `features/auth/screens/LoginScreen.tsx:84-87` — 같은 변환 반복
- `features/auth/screens/SplashScreen.tsx:47` — 같은 변환 반복

토큰 쌍에 필드가 하나 늘거나 저장 모델이 바뀌면 고쳐야 할 곳이 세 곳이 된다.

### D-M2 · M-16 — 색상 리터럴 3곳

M-16 은 예외를 두지 않았다("화면 코드에 `#RRGGBB` 를 직접 쓰지 않는다"). `tailwind.config.js`
를 pen 값으로 교정한 것이 이번 변경분의 성과인데, 아래 세 값은 그 교정을 따라오지 않는다 —
다음에 토큰이 바뀌면 조용히 어긋난다.

- `shared/ui/Button.tsx:67` — `'#171717' : '#FFFFFF'` (스피너)
- `shared/ui/TextField.tsx:52` — `placeholderTextColor="#737373"`
- `App.tsx:20` — `<StatusBar backgroundColor="#FAFAF8" />`

`color`·`placeholderTextColor`·`backgroundColor` 가 `className` 을 받지 못한다는 사정은
주석에 적힌 대로 사실이지만, 그건 "리터럴을 쓸 수밖에 없다" 가 아니라 "토큰 값을 코드에서
읽어 와야 한다" 는 뜻이다.

### D-M3 · M-2 — 의존 방향이 뒤집혔다

M-2 는 `app/ → features/ → shared/` 를 못 박고 **역방향 금지**라고만 적었다. 예외(타입 전용
import 등)를 두지 않았다. `features/auth/screens/*` 8개가 전부
`import type {AuthStackParamList} from '../../../app/navigation/types'` 를 한다.
`app/navigation/types.ts` 는 반대로 `features/auth/types` 를 import 하므로 두 계층이 서로를
가리킨다. `providers.tsx` 주석("기능(features/)은 이 계층에 의존하지 않는다. (mobile.md M-2)")과도
어긋난다.

### D-M4 · M-20 — 접근성 낭독에 iOS 경로가 없다

`design.md` §12 는 이 지점을 명시적으로 플랫폼 분기로 지정했다
(iOS `AccessibilityInfo.announceForAccessibility` / Android `accessibilityLiveRegion`).
구현에는 안드로이드 전용 API 만 있다 — M-20 의 "한쪽에서만 되는 코드를 그대로 두지 않는다" 위반.

- `shared/ui/Toast.tsx:21`, `features/auth/screens/SplashScreen.tsx:152` — `accessibilityLiveRegion` 만
- `shared/ui/Banner.tsx` — §2.5 가 요구한 낭독이 양쪽 다 없다 (`accessibilityRole="alert"` 만)
- `messages.ts:181` `a11ySplashAnnounce` 는 정의만 되고 어디서도 쓰이지 않는다 (§3.5 미구현)

### D-M5 · M-7 — 가입 화면 문구가 명세와 다르게 놓였다

M-7 은 "사용자 문구는 `design.md` 를 그대로 쓴다" 이다. 문자열 자체는 `messages.ts` 에
정확히 옮겨졌는데 **놓인 자리**가 §5.2·§5.3 과 다르다.

- `SignUpScreen.tsx:238` — 가입 사유 `TextField` 의 `label` 로 **플레이스홀더 문장**을 넘겼다.
  화면에 "어떤 상황에서 Planbee를 쓰고 싶은지 알려주세요." 가 라벨과 플레이스홀더로 두 번 나오고,
  §5.3 이 지정한 라벨("가입 사유")은 그 위에 따로 그려진 별개의 텍스트다. 입력란의
  `accessibilityLabel` 도 라벨이 아니라 이 문장이 된다(§2.5 는 "입력란 라벨 = 라벨 텍스트").
- `SignUpScreen.tsx:155` — `NavBar` 타이틀이 §5.2 의 "가입 신청" 이 아니라 "Planbee 가입 신청" 이고,
  §5.2 가 본문 첫 줄에 둔 H1 "Planbee 가입 신청" 은 화면에 없다.

---

## 3. 계약·명세 대조에서 확인한 것 (위반 아님)

- 로그인 오류 1·2·3(틀린 비밀번호 / 미등록 / 삭제된 계정)이 **하나의 코드 경로**(`kind: 'credentials'`)로
  처리되고, 최소 노출 시간 400ms 까지 둔 것은 §4.6 의 요구와 맞다.
- 잠금 배너에서 입력·버튼을 비활성화하지 않은 것(§4.7 설계 의도 4), 잠금·자격 증명 오류에서만
  비밀번호를 지우고 서버·네트워크 오류에서는 유지한 것(§4.6) 모두 명세대로다.
- `REJECTED` 에만 "계정 삭제" 보조 링크가 뜨고 `SUSPENDED` 에는 없다 (AC-50 / §7.3.2 / 계약).
- 문의 주소가 `null` 일 때 오류·재시도·로딩 어느 것도 만들지 않고 대체 안내 한 줄로만 바뀐다
  (AC-43·44). 대체 문구가 `CONTACT.unavailable` 한 곳에서만 나와 네 화면이 글자까지 같다.
- 약관 뷰어는 네트워크를 타지 않고 로딩·재시도 UI 가 없다 (AC-37 / §6.8).

---

## 4. 규칙 밖 관찰 — 지적 아님, 차단하지 않음

절대 규칙 2 에 따라 **판정에 넣지 않는다.** 새 규칙으로 승격할 만큼 반복되는 문제로 보이지
않아 `docs/conventions/mobile.md` 에 규칙을 추가하지도 않았다. 다음 작업자가 참고만 하면 된다.

1. `LoginScreen.tsx:117-120` — 본문이 `return () => undefined;` 뿐인 `useEffect`. 아무 일도 하지 않는다.
2. `SignUpScreen.tsx:57` — `dirty` 판정에 `consents !== EMPTY_CONSENTS` (참조 비교). 체크했다가
   전부 해제해도 새 객체라 `dirty` 가 `true` 로 남아 §5.7 이탈 확인이 뜬다.
3. `AccountDeleteScreen.tsx:153` — 서버·네트워크 오류 배너의 "다시 시도" 가 비워진 비밀번호로
   `confirmDelete` 를 다시 부른다. §9.7 이 "비밀번호는 비운다" 와 "다시 시도" 를 함께 요구해
   명세 자체가 모호한 지점이다.
4. `SettingsScreen.tsx:28` — `APP_VERSION = '1.0.0'` 하드코딩. 사유 주석이 있고 배포 설정 영역이라
   지금 단계에서는 합리적이다.
5. `design.md` §7.5 · §11.2.1 의 **"주소 복사"** 가 구현되지 않았고 `CONTACT.copy` 가 미사용으로
   남아 있다. 클립보드 의존성을 임의로 들이지 않은 판단 자체는 M-19·절대 규칙 8 과 맞지만,
   그 결정이 코드 주석에만 있다. `defects.md` 나 `status.md` 의 `ASK` 로 올려 두면 ux-designer·사람이
   판단할 수 있다.
6. `__tests__/screens.smoke.test.tsx` 의 `getByTestId` 사용. M-12(사용자 관점 쿼리)는 문서상
   "테스트 (mobile-tester)" 절에 속해 이 스모크 테스트를 겨냥한 규칙으로 읽지 않았다.
   mobile-tester 가 AC 테스트를 쓸 때는 M-12 가 그대로 적용된다.
7. `SignUpScreen.tsx:234` 의 "선택" 이 `shared/ui/Badge` 의 `RequirementBadge` 가 아니라 평범한
   `Text` 다. §5.3 은 "배지" 라고 적었다. D-M5 를 고칠 때 함께 보면 좋다.

---

## 5. 다음 단계

1. mobile-developer 가 `D-M1` ~ `D-M5` 를 수정한다 (재작업 1회차 — 상한 2회, 절대 규칙 4).
2. `make verify-mobile` 로 게이트를 다시 통과시킨다 (절대 규칙 6).
3. 재리뷰 후 PASS 면 mobile-tester 로 넘어간다.

---

# 재리뷰 — 재작업 1회차 결과 (2026-08-27)

- **판정: PASS** — `D-M1` ~ `D-M5` 전건 해소. 새로 발견한 `[MUST]` 위반 **0건**.
- 리뷰 역할: mobile-reviewer (2회차 판정, 절대 규칙 4 의 상한 안)
- 대상: 재작업 후의 커밋되지 않은 `mobile/` 변경분 + `docs/conventions/mobile.md` 갱신분
- 판정 근거: `docs/conventions/mobile.md`, `docs/conventions/common.md` **에 적힌 것만** (절대 규칙 2).
  린터가 잡는 것은 쓰지 않는다 (절대 규칙 3).
- 게이트(절대 규칙 6): `make verify-mobile` 통과 — 린트 0건 · `tsc --noEmit` 0건 · 테스트 12건 통과.
  위 이전 판정은 **지우지 않았다.** 아래는 그 판정에 대한 재확인이다.

## R1. 핵심 판단 — `D-M1` 의 수정 위치 변경은 **타당하다**

개발자는 변환을 리포트 예시(`app/configureSession.ts`)가 아니라
`shared/api/session.ts` 의 `toTokens` / `saveTokenPair` 에 두고, M-17 의 위치 문장을 정정했다.
**규칙을 고쳐 위반을 없앤 것이 아니라, 두 `[MUST]` 가 실제로 충돌해서 한쪽을 정정한 경우로 인정한다.**
근거는 셋이다.

**① 충돌이 실재한다.** 리포트 예시대로 `persistTokenPair` 를 `app/configureSession.ts` 에 두면
토큰을 저장하는 화면(`LoginScreen` · `SplashScreen`, 둘 다 `features/`)이
`import {persistTokenPair} from '../../../app/configureSession'` 를 해야 한다. 타입도 아닌
**런타임 import** 이고, M-2 가 "의존 방향: `app/` → `features/` → `shared/`. 역방향 금지" 로
명시적으로 막은 그것이다. 즉 이전 M-17 의 문장은 **D-M3 가 지적한 위반이 남아 있는 코드에서만
성립하는 문장**이었다 — 두 결함을 동시에 고치면 반드시 하나가 깨진다. 리뷰어가 낸 예시가 틀렸다.

**② M-17 의 요건 자체는 하나도 완화되지 않았다.** 바뀐 것은 "어느 파일" 뿐이고
"변환은 **한 곳**에만 있다 / 화면·기능·`app/` 어디서도 다시 하지 않는다" 는 그대로다.
실제로도 그렇다 — `access_token` / `refresh_token` 을 푸는 코드는 저장소 전체에서
`src/shared/api/session.ts:26` 한 줄이고(`grep` 확인), `configureSession.ts` 조차 `toTokens` 의
호출자로 내려왔다. 화면은 `saveTokenPair(pair)` 만 부른다.

**③ 규칙 갱신의 방향이 "빠져나가기" 의 반대다.** `D-M1` + `D-M3` 를 한 번에 없애는 가장 쉬운 길은
M-2 에 "타입 전용 import 는 예외" 를 붙여 `D-M3` 를 통째로 지우는 것이었다. 개발자는 정반대로
M-2 에 **"타입 전용 import 도 예외가 아니다"** 를 명시해 규칙을 좁히고 코드를 옮겼다.
규칙 완화로 위반을 지운 흔적이 없다.

또한 새 위치가 자의적이지 않다. `Tokens` 타입과 `saveTokens` / `loadTokens` 가 이미 그 파일에 있고,
M-17 이 예전부터 "`session.ts` 의 `Tokens` 는 Keychain 저장용 내부 모델이므로 이대로 둔다" 로
그 모듈을 저장 모델의 소유자로 지목해 왔다. 저장 모델을 정의한 모듈이 그 모델로 들어오는 변환을
갖는 배치는 M-2(방향)·M-17(단일 지점)·M-3(모든 계층이 합법적으로 의존 가능) 셋을 동시에 만족하는
유일하게 단순한 해다. **반려 근거 없음.**

> 부수 확인: `shared/` → `features/` 또는 `shared/` → `app/` import 도 0건이다. 방향이 한쪽으로만 흐른다.

## R2. `D-M2` ~ `D-M5` 해소 확인 (코드로 확인한 것만)

| # | 규칙 | 확인 방법 | 결과 |
|---|---|---|---|
| D-M1 | M-17 | `grep 'access_token\|refresh_token'` (생성물 `schema.ts` 제외) | 변환 **1곳**(`session.ts:26`). 나머지 2건은 요청 본문 필드명으로 계약 그대로 보내는 자리다 |
| D-M2 | M-16 | `grep -E '#[0-9A-Fa-f]{3,8}'` on `src/` + `App.tsx` | **0건**. `rgba()`/`hsl()` 도 0건. `Button`(`COLOR.ink`/`COLOR.onDark`) · `TextField`(`COLOR.inkMuted`) · `App.tsx`(`COLOR.background`) 셋 다 토큰 값을 읽는다 |
| D-M3 | M-2 | `grep "app/" src/features` | import **0건**(주석 4줄만 매칭). 화면 8개가 전부 `import type {AuthRouteParams\|MainRouteParams} from '../navigation'`. `app/navigation/types.ts` 는 그것을 조합만 한다 |
| D-M4 | M-20 | `shared/lib/a11y.tsx` + 적용처 3곳 | iOS `announceForAccessibility` · Android `LIVE_REGION_POLITE` 양쪽 존재. `Platform.select` 의 `default` 채움. 화면 코드의 `accessibilityLiveRegion` 직접 사용 **0건**. `Banner`(§2.5) · `Toast`(§4.3) · `SplashScreen` 진입(§3.5, 미사용이던 `a11ySplashAnnounce` 사용) 적용 |
| D-M5 | M-7 | `design.md` §5.2 · §5.3 · §11.4 대조 | NavBar `"가입 신청"` / 본문 H1 `"Planbee 가입 신청"`(`accessibilityRole="header"`) 로 분리, 간격도 §5.2 의 24 · 8 · 28(`mt-6`·`mt-2`·`mt-7`). 가입 사유 필드는 `label="가입 사유"` + `labelBadge=<RequirementBadge required={false}/>`, 안내 문장은 `placeholder` 로만 — 입력란 `accessibilityLabel` 이 §2.5 대로 라벨 텍스트가 됐다. 문구는 전부 `messages.ts` 의 기존 상수이고 새로 지어낸 문장이 없다 |

`D-M5` 의 비차단 참고 항목("선택" 이 `Text` 였다)도 함께 처리돼 `shared/ui/Badge` 의
`RequirementBadge` 를 쓴다 (§5.3 "배지").

## R3. 재작업으로 **새로 생긴** 위반 — 없음

신규·변경 파일을 규칙별로 다시 봤다.

| 대상 | 검토한 규칙 | 판정 |
|---|---|---|
| `mobile/tailwind.tokens.js` | M-16 | 통과. 값 13색 + 타이포·라운드가 그대로 옮겨졌고 `tailwind.config.js` 는 `require` 배선만 한다. 값의 원본이 여전히 **한 파일**이다. pen 을 기준으로 삼는다는 서술(C-9)도 유지 |
| `src/shared/ui/tokens.ts` | M-3 · M-16 | 통과. `COLOR` 4개는 `tailwind.tokens.js` 에서 읽고 리터럴이 없다. **M-3(2개 기능 이상) 위반이 아니다** — 소비자가 `shared/ui/Button`·`TextField` 와 `App.tsx` 이고 기능이 아니다. 기능 안에 두면 `shared/` → `features/` 역방향이 강제된다(M-2). 게다가 갱신된 M-16 이 이 경로를 직접 지정한다 |
| `src/shared/lib/a11y.tsx` | M-3 · M-19 · M-20 | 통과. 같은 이유로 M-3 대상이 아니다(`shared/ui/Banner`·`Toast` 가 쓴다). iOS 전용 모듈을 최상단에서 무조건 import 하지 않고 RN 코어 `AccessibilityInfo` 만 쓴다(M-19). `Platform.select` 에 `default` 가 있다(M-20). 새 의존성 0개 — 절대 규칙 8 대상 아님 |
| `src/features/auth/navigation.ts` | M-1 · M-2 | 통과. 갱신된 M-2 가 `features/<feature>/navigation.ts` 를 지정한 자리다. `app/` 을 참조하지 않고 `./types` · `./legal/documents.generated` 만 본다 |
| `TextField` 의 `labelBadge` 슬롯 | M-21 · M-9 | 통과. 타입이 `ReactNode` 라 auth 전용 개념이 `shared/ui` 로 새지 않았고, 실제로 들어가는 배지도 pen Design System 의 `Badge/Requirement` 다. `label` prop 주석에 "플레이스홀더 문장을 넘기지 않는다" 가 못박혀 §2.5 회귀를 구조로 막는다 |
| `RestoringIndicator` 의 라이브 리전 제거 | M-20 · design.md §3.5 | 통과. §3.5 가 요구한 두 가지(진입 문장 낭독 / 인디케이터 `accessibilityLabel="불러오는 중"`)가 모두 남아 있고, 안드로이드에서만 두 번 읽히던 비대칭이 사라졌다 |
| `App.tsx` · `configureSession.ts` · `Button` · `Banner` · `Toast` · 화면 8개 | M-4·M-6·M-8·M-9·M-13·M-14·M-15·M-18 | 회귀 없음. `any` 0건, `fetch` 직접 호출 0건, `schema.ts` 손수정 없음, 서버 데이터 복사 없음, 4가지 상태 구현 유지 |

`Platform.select` 4곳 모두 `android` 또는 `default` 가 채워져 있고, `.ios.*` / `.android.*` 로
나눈 파일은 0건이다 (M-20).

## R4. `docs/conventions/mobile.md` 갱신 4건의 타당성

리뷰어가 **규칙 갱신 자체**를 판정 대상으로 본 결과다. 네 건 모두 **완화가 아니라 구체화 또는 강화**다.

| 규칙 | 변경 | 판정 |
|---|---|---|
| M-2 | "타입 전용 import 도 예외가 아니다" + 내비 파라미터 소유 위치 | **타당(강화).** 예외를 만들지 않고 좁혔다. 두 번째 기능이 생겼을 때의 확장 방법(`AuthRouteParams & OtherRouteParams`)까지 적혀 있어 다음 작업자가 같은 결정을 반복하지 않는다 |
| M-16 | 코드 측 단일 원본을 `tailwind.tokens.js` 로 이동 + "className 못 받는 prop 도 리터럴 금지" | **타당(강화).** 위치만 옮겼고 "단일 원본" 요건은 유지. 오히려 리뷰가 지적한 논점(`color`·`placeholderTextColor`·`backgroundColor`)을 규칙 문장으로 못박아 다음에는 리뷰 없이도 걸린다. 분리 사유(빌드 도구용 모듈이라 번들 불가)가 근거와 함께 남았다 |
| M-17 | 변환 위치를 `app/configureSession.ts` → `shared/api/session.ts` 로 정정 | **타당(정정).** 근거는 §R1. "한 곳" 요건 불변, 왜 `app/` 이 아닌지가 M-2 와 함께 기록됐다 |
| M-20 | "스크린리더 낭독은 `shared/lib/a11y` 를 쓴다" | **타당(강화).** 양쪽 경로를 개별 화면이 다시 짜지 않게 만들어 D-M4 유형의 재발을 구조로 막는다 |

## R5. `D-M6` (비차단) 의 처리 — 적절하다

고치지 않기로 한 결정과 그 사유가 `defects.md` D-M6 에 남았고, 상태는 **열림(요청)** 그대로다.
원래 지적의 핵심은 "구현을 빠뜨렸다" 가 아니라 **"판단 근거가 코드 주석에만 있다"** 였고,
그 부분이 해소됐다. 선택지 둘(① `design.md` 수정 = ux-designer 소유 / ② 클립보드 네이티브
의존성 도입 = M-19·절대 규칙 8 이 사람 판단으로 지정) 모두 mobile-developer 권한 밖이라는 판단도
맞다. 대체 경로(주소 `selectable`)가 남아 §7.5 의 의도가 깨지지 않는 것도 확인했다.
**차단하지 않는다.**

## R6. 규칙 밖 관찰 — 지적 아님, 차단하지 않음 (절대 규칙 2)

1. 이전 리포트 §4 의 1·2번(빈 `useEffect`, `consents !== EMPTY_CONSENTS` 참조 비교)은 그대로 남아 있다.
   이번에도 `conventions` 에 근거가 없어 지적하지 않는다.
2. `common.md` **C-9** 본문이 아직 코드 측 토큰 정의를 `tailwind.config.js` 로 적고 있다.
   방향(pen 이 기준)은 그대로고 C-9 가 M-16 을 가리키고 있어 판정에 영향은 없지만,
   다음에 `common.md` 를 손대는 역할이 `tailwind.tokens.js` 로 문구를 맞추면 좋다.
   `common.md` 는 server-reviewer 와 공유하는 파일이라 이번 리뷰에서는 건드리지 않았다.
3. iOS 에서 `accessibilityRole="alert"` 와 `announceForAccessibility` 가 겹쳐 같은 문장이 두 번
   읽힐 여지가 있다. 정적으로는 판정할 수 없고 규칙에도 근거가 없다 — 실기기 확인 사항으로만 남긴다.
4. `RequirementBadge` 가 자체 `mr-2` 를 갖고 있어 `TextField` 의 `ml-2` 와 겹친다. 시각적 취향 문제다.

## R7. 다음 단계

1. **mobile-tester** 로 넘어간다 (PASS).
2. M-20 이 "분기를 넣었으면 양쪽 분기를 테스트한다" 를 요구한다 —
   `Platform.OS` 를 목킹해 **iOS 에서 `announceForAccessibility` 가 불리고 안드로이드에서는
   불리지 않는 것**을 함께 검증해 달라 (`defects.md` D-M4 의 개발자 메모와 같은 요청이다).
3. `D-M6` 은 ux-designer / 사람 앞으로 열려 있다. 모바일 구현을 막지 않는다.
