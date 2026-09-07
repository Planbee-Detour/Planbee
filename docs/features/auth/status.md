# 상태: auth

- 기능 슬러그: `auth`
- 시작일: 2026-08-23
- 현재 단계: `2026-09-07 7단계(통합 테스트) 완료 — make test-e2e 4/4 통과. 파이프라인 1~7단계가 전부 끝났다. 남은 것은 머지 커밋 → push → develop 으로 PR (사람 판단), 그리고 ASK 10(iOS 번들 ID 확정)`
  - 모바일 재작업 루프는 **1회로 종료**됐다 (`D-M1`~`D-M5` 전건 해소, 신규 `[MUST]` 0건).
    상한 2회 안이라 `ESCALATE` 대상이 아니다.
  - 서버 재작업 루프도 **1회로 종료**됐다 (`D-3`~`D-6` 전건 해소, 신규 `[MUST]` 0건).
    상한 2회 안이라 `ESCALATE` 대상이 아니다.
  - D-3 이 요구한 **계약 보완은 끝났다 (tech-lead, 2026-08-27, non-breaking)** — server-developer 가
    `defects.md` D-3 의 "계약에서의 결론" 절 그대로 구현했다 (2026-08-27). 계약 대기로 막히는 것은 없다.
  - 서버 재작업 1회차에서 **D-3 이 지시한 수정만으로는 AC-24 가 성립하지 않는다**는 것이
    실행 중 드러났다 — 폐기 UPDATE 가 401 예외에 함께 롤백되고 있었다. 별도 트랜잭션으로
    분리해 고쳤고(`ReuseDetectionRevoker`), 근거를 `server.md` S-17 에 규칙으로 올렸다.
    자세한 실행 결과는 `defects.md` D-3 의 "조치" 절에 있다.

## 이어받기 (2026-08-26 중단 지점)

**여기서 멈췄다.** 4~6단계(계약·서버·모바일)가 끝났고 `make verify` 가 전체 통과하는 상태다.
다음은 **server-reviewer / mobile-reviewer** 이며 둘은 서로 독립이라 동시에 진행한다.

### 커밋되지 않았다

작업 전체가 `develop` 브랜치에 **커밋되지 않은 채** 남아 있다 (변경 36개).
직전 커밋은 `9563368 Merge pull request #2`.

| 갈래 | 내용 |
|---|---|
| 신규 | `docs/features/auth/contract.yaml`, `defects.md` |
| 신규 (서버) | `server/.../auth/` 패키지 전체, `common/ClockConfig.java`, `common/security/TokenScope.java`, `db/migration/V2__create_auth.sql` |
| 신규 (모바일) | `mobile/src/features/auth/`, `mobile/src/shared/ui/`, `mobile/src/app/navigation/`, `app/configureSession.ts`, `mobile/scripts/bundle-legal.mjs` |
| 수정 (계약·문서) | `docs/api/openapi.yaml`, `error-codes.md`, `conventions/{common,server,mobile}.md`, 세 기능의 `status.md` |
| 수정 (서버 공통) | `BusinessException`, `CommonErrorCode`, `GlobalExceptionHandler`, `SecurityConfig`, `OpenApiConfig`, `HealthResponse`, `application.properties`, `PlanbeeApiApplication` |
| 수정 (모바일 공통) | `App.tsx`, `shared/api/{client,problem,schema}.ts`, `tailwind.config.js` |
| 수정 (테스트) | `GlobalExceptionHandlerTest` — 슬라이스 범위 한 줄 (`defects.md` D-1) |
| 수정 (인프라) | `Makefile`(`legal-bundle` 타깃 추가), `.gitignore` |

`docs/design/planbee.pen` 의 수정분은 **이번 작업이 아니라 2026-08-25 pen 재시각화**의 결과이며
그때부터 커밋되지 않은 상태였다.

### 재개할 때 먼저 할 것

```
make verify            # 통과해야 정상. legal-bundle 을 먼저 부른다
```

생성물 두 개는 취급이 다르다 — 헷갈리면 `mobile.md` M-22 를 본다.

- `mobile/src/shared/api/schema.ts` — **커밋한다** (계약 변경이 diff 로 드러나야 한다)
- `mobile/src/features/auth/legal/documents.generated.ts` — **커밋하지 않는다**
  (원본이 `docs/legal/*.md` 라 사본까지 두면 갈라진다)

### 다음 역할의 입력

| 역할 | 볼 것 |
|---|---|
| server-reviewer | `server/src/main/` 변경분, `docs/conventions/server.md`(S-27·28·29 신설), `contract.yaml` |
| mobile-reviewer | `mobile/src/` 변경분, `docs/conventions/mobile.md`(M-21·22 신설), `design.md` |

두 리뷰어 모두 **`docs/conventions/` 에 적힌 것만** 지적한다 (절대 규칙 2).
`defects.md` 의 D-1(테스트 슬라이스 범위)은 server-tester 가 확인해 줄 항목으로 열려 있다.

### 이번 작업에서 conventions 에 추가된 규칙

리뷰어가 새로 적용할 근거이므로 함께 읽는다.

| 문서 | 규칙 |
|---|---|
| `common.md` | C-1 에 `429` + `Retry-After`, C-4 에 "비어 있는 것이 정상인 설정" 예외 |
| `server.md` | S-27(오류 확장 필드) · S-28(빈 기본값 예외) · S-29(프로세스 메모리 상태), S-14 에 `VARCHAR` 항목, S-19 에 오류 응답 미복제·springdoc 스펙 생성, S-21 에 숫자 경계 예외, S-17 에 리프레시·스코프 상세 |
| `mobile.md` | M-21(디자인 시스템은 `shared/ui`) · M-22(생성물), M-17 의 경계 변환, 테스트 메모에 RNTL 14 의 비동기 `render` |

---

## 이어받기 (2026-08-27 종료 지점) — *지난 기록. 최신은 아래 2026-09-02 절이다*

**세션이 사람 사정으로 중단됐다.** 아래 한 가지만 확인하면 auth 는 6단계까지 끝난다.

> **2026-09-02 갱신:** 이 게이트를 실행했고 **실패했다.** 아래 `2026-09-02` 절을 본다.
> 이 절의 "통과하면 mobile-tester 를 PASS 로" 는 더 이상 다음 행동이 아니다.

### 반드시 먼저 할 것

```
make verify-mobile
```

**이 게이트는 마지막 수정 뒤 실행되지 않았다.** `D-T1` 수정(`mobile/src/shared/api/client.ts`,
26줄 추가)과 `sessionRefresh.test.tsx` 의 `test.failing` → `test` 되돌리기는 **디스크에 반영돼 있고**,
`test.failing` 잔여 0건까지 확인했다. 다만 그 상태로 게이트를 돌리지 못했다 —
실행 중 사람이 중단했다. 통과하면 mobile-tester 를 `PASS` 로 바꾸고, 실패하면 그 실패만 고친다.

참고: 기록 표의 `make verify` 전체 통과(exit 0)는 **D-T1 수정 이전** 시점이다. 근거로 쓰지 마라.

### 오늘 끝난 것

| 단계 | 결과 |
|---|---|
| server-reviewer | 1차 FAIL(`D-3`~`D-6`) → 재작업 1회 → **재리뷰 PASS** |
| server-tester | **PASS** — 통합 테스트 61건 신설(총 63건), 실패 0 |
| mobile-reviewer | 1차 FAIL(`D-M1`~`D-M5`) → 재작업 1회 → **재리뷰 PASS** |
| mobile-tester | AC 검증 테스트 신설(13 스위트 147건 통과) · 차단 결함 `D-T1` 발견 |
| mobile-developer | `D-T1` 수정 (재작업 2회차 = 상한) — **게이트 미확인** |
| integration-tester | 플로우 4개 + 시드 `V901` 작성. **실행 보류**(ASK 9) |
| tech-lead | D-3 계약 보완 (유예 창 캐시 소실 시 닫히는 쪽으로 실패, non-breaking) |

### 재작업 상한 주의

**모바일은 2회차를 썼다 (상한 2회).** `make verify-mobile` 이 실패하거나 mobile-tester 가
다시 FAIL 을 내면 **3회차가 되므로 `ESCALATE` 를 적고 사람에게 넘긴다** (절대 규칙 4).

### 커밋되지 않았다

작업 전체가 `develop` 에 커밋되지 않은 채로 있다. 사람이 커밋을 요청한 적이 없어 하지 않았다.
`mobile/src/features/auth/legal/documents.generated.ts` 는 커밋하지 않는다 (M-22).

---

## 이어받기 (2026-09-02) — 여기부터 읽는다

`make verify-mobile` 을 드디어 실행했고, 실패한 뒤 고쳐서 **통과시켰다.**

| | 결과 |
|---|---|
| 1차 실행 | **FAIL** — 2 스위트 13건 실패 (147건 중 134건 통과) |
| 사람 판단 | 재작업 3회차 진입을 **승인**했다 (절대 규칙 4, 2026-09-02) |
| 수정 | `client.ts` 한 줄 — 아래 "원인" 절 |
| 재실행 | **`make verify-mobile` exit 0 — 13 스위트 147건 전건 통과** |

**모바일 갈래는 이것으로 끝났다.** mobile-tester 는 `PASS` 다.

### 실패한 것

| 스위트 | 실패 |
|---|---|
| `src/features/auth/__tests__/splash.test.tsx` | 10건 (AC-20·21·23·24·25 + §3.4 재시도) |
| `src/features/auth/__tests__/sessionRefresh.test.tsx` | 3건 (AC-22 · AC-24 2건) |

실패한 13건은 **전부 리프레시 경로**다. 그 밖의 11 스위트 134건은 모두 통과한다.

### 원인 — `D-T1` 수정이 만든 회귀 (해소됨)

`D-T1` 수정은 갱신 재귀를 끊기 위해 `client.ts` 에 `publicClient` 를 새로 만들고
`endpoints.ts:121` 의 갱신 요청을 그쪽으로 보냈다. 구조는 옳다. 문제는 **테스트에서 msw 가
그 요청을 가로채지 못한다**는 것이다.

- `openapi-fetch@0.17.0` 은 `dist/index.cjs:16` 에서 `fetch: baseFetch = globalThis.fetch` 로
  기본값을 잡는다. 구조분해 기본값이라 **`createClient()` 호출 시점에 한 번** 평가된다.
- `publicClient` 는 `fetch` 옵션을 넘기지 않으므로, `client.ts` 모듈이 로드되는 순간의
  `globalThis.fetch` 를 **값으로** 붙잡는다.
- Jest 는 테스트 모듈을 먼저 로드하고 `jest.setup.ts` 의 `beforeAll` → `server.listen()` 을
  나중에 실행한다. msw 가 `globalThis.fetch` 를 교체하기 **전**에 원본이 캡처된다.
- 그 결과 갱신 요청만 msw 를 우회해 실제 네트워크로 나가 실패하고, `SplashScreen` 은
  이를 네트워크 오류로 보아 `networkError` 로 간다 — 그래서 배너 분기 테스트가 전부 깨진다.
- `apiClient` 는 `fetch: authFetch` 를 명시했고 `authFetch` 는 **호출 시점에** `fetch` 를
  참조하므로 영향이 없다. 통과/실패가 정확히 이 경계로 갈린다.

### 고친 방법 (한 줄, 프로덕션 동작 불변) — **반영 완료**

`client.ts` 의 `publicClient` 에 호출 시점 참조 래퍼를 넘겼다.

```ts
export const publicClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
});
```

`authFetch` 가 이미 같은 방식이므로 새 규칙이 아니다. 실기기 동작은 달라지지 않는다
(원본 fetch 를 늦게 참조할 뿐이다). **테스트 코드는 손대지 않았다** — 깨진 쪽은 구현이었다.

### 재작업 3회차였다 — 사람이 승인했다

절대 규칙 4의 상한(2회)을 mobile-developer 가 이미 썼으므로 `ESCALATE` 를 적고 멈춘 뒤
사람에게 넘겼고, **사람이 수정 진행을 승인했다** (2026-09-02). 원인·수정이 한 줄로 확정돼
있었고 재실행이 전건 통과로 끝나 추가 왕복은 없었다.

### 통합(E2E) — 환경이 갖춰졌다. `ASK` 9 의 환경 항목은 해소

2026-09-02 에 전부 설치·전환됐다.

| 항목 | 상태 |
|---|---|
| Xcode | ✅ **26.6** 정식. `xcode-select` 가 `/Applications/Xcode.app/Contents/Developer` 를 가리킨다 |
| iOS 시뮬레이터 런타임 | ✅ **iOS 26.5** (`xcodebuild -downloadPlatform iOS`, 8.52 GB). iPhone 17 Pro 등 사용 가능 |
| Maestro | ✅ **2.10.0** (`~/.maestro/bin` — PATH 에 자동으로 잡히지 않으므로 `export PATH="$PATH:$HOME/.maestro/bin"` 가 필요하다) |
| Docker 데몬 | ✅ 기동 |
| `make e2e-up` | ✅ API 준비됨 — `http://localhost:8080`, 실제 PostgreSQL + 시드 `V901` |
| `make e2e-app` | ✅ 시뮬레이터에 설치 완료 |

**추가로 알아낸 것 두 가지.** 다음 사람이 같은 데서 막히지 않도록 적어 둔다.

1. **Debug 빌드라 Metro 번들러가 필요하다.** `make e2e-app` 은 빌드·설치까지만 하고
   앱 실행에서 실패하는데(`did not return a process handle`), `mobile` 에서 `npm start` 로
   Metro 를 띄워 두면 Maestro 의 `launchApp` 이 정상 동작한다. `e2e/README.md` 에 이 항목이 없었다.
2. **번들 ID 불일치는 애초에 없었다.** 플로우의 `appId`
   (`org.reactjs.native.example.Planbee`)는 실제 iOS 번들 ID 와 **일치한다** —
   `project.pbxproj` 의 `org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)` 가 그것이다.
   `com.planbee` 는 안드로이드 `applicationId` 이고 둘은 원래 다른 값이다.
   따라서 E2E 실행을 막는 문제가 아니었다. 정식 번들 ID 확정은 배포 시점 판단으로 남는다 (절대 규칙 8).

### 실제 실행 결과 (2026-09-02)

| 플로우 | 결과 |
|---|---|
| `auth-01-signup-pending` | **PASS** |
| `auth-02-login-home` | **미완** — 로그인 자체는 성공, `home-settings` 단언에서 멈춤 |
| `auth-03-session-persistence` | 미실행 |
| `app-launch` | 미실행 |

`auth-01` 을 통과시키기까지 플로우를 여러 번 고쳐야 했는데, **고친 것은 전부 플로우이고 앱·서버·계약은
한 줄도 건드리지 않았다.** 걸린 함정 4가지(Maestro 2.x 문법 변경, 키보드가 탭을 막음, iOS 암호 제안
시트가 입력을 가로챔, iOS 암호 저장 다이얼로그가 접근성 트리를 가림)는 `defects.md` D-E2 에 정리했다.

### 여기서 멈춘 이유

**홈 화면이 아직 자리표시자다** (사람 확인, 2026-09-02). `auth-02` 와 `auth-03` 은 둘 다 로그인 후
홈(`home-settings`)을 거쳐 가므로, 홈이 실제로 만들어진 뒤에 다시 보는 것이 맞다.
지금 셀렉터를 홈 자리표시자에 맞춰 고정해 두면 홈이 생기는 순간 다시 고쳐야 한다.

### 이어받을 때

Metro(`npm start`)와 `make e2e-up` 이 떠 있어야 한다. Maestro 는 PATH 에 자동으로 잡히지 않으므로
`export PATH="$PATH:$HOME/.maestro/bin"` 를 먼저 한다. 개별 플로우는
`maestro test e2e/flows/<파일>.yaml` 로 돌리는 편이 전체 실행보다 피드백이 빠르다.

---

## 이어받기 (2026-09-06) — develop 머지

`auth` 작업 전체를 커밋해 `feat/ariel/auth` 에 올리고, 그 위에서 원격 `develop` 을 흡수했다.
develop 쪽에서 다른 갈래 둘(`feat/main-screen` · `feat/detail-screen`)이 먼저 머지돼 6커밋 앞서 있었다.

| | 내용 |
|---|---|
| 커밋 | `f5466be feat: auth 기능 구현 — 계약·서버·모바일·E2E 플로우` (126 files, +15735/-217) |
| push | `9840824..f5466be feat/ariel/auth` (fast-forward) |
| 백업 | 낡은 `57a4cad`(내용이 이미 대체됨)는 `backup/ariel-auth-57a4cad` 에 남겨 뒀다 |
| 머지 | `git merge origin/develop` — 충돌 5개 파일 |

### 충돌 해결

| 파일 | 해결 |
|---|---|
| `docs/api/error-codes.md` | 양쪽 다 살렸다. auth 코드 12개 + develop 의 `### place`. develop 쪽 auth `TODO` 줄은 버렸다(이미 등록됨) |
| `docs/api/openapi.yaml` | 양쪽 다 살렸다. `schemas:` 아래에 장소 스키마 3개 + 기존 공통 오류 |
| `mobile/src/shared/api/schema.ts` | 생성물이라 `make contract-types` 로 재생성했다 |
| `mobile/tailwind.config.js` | auth 쪽 구조(값은 `tailwind.tokens.js`, D-M2) 채택. develop 이 쓰던 `ink-inverse`(화면 4곳)·`shadow-card`(탭바)·`fontFamily`·`brand.ink` 를 값 파일에 보강했다. `fontSize` 는 pen 기준인 auth 값을 유지했다 (M-16) |
| `mobile/App.tsx` | 아래 내비게이터 통합 참조 |
| `docs/design/planbee.pen` | **자동 머지됐다(충돌 없음).** 암호화 파일이 라인 단위로 합쳐진 것이라 **pencil 로 열어 확인이 필요하다** — 아래 남은 일 참조 |

### 내비게이터 통합 (사람 결정, 2026-09-06)

두 내비게이터가 정면으로 만났다 — auth 의 `RootNavigator`(세션 분기)와 develop 의
`AppNavigator`(하단 탭 4개 + 장소 스택). **세션 분기를 바깥에 두고 그 안쪽을 실제 탭 구조로 채웠다.**

```
App.tsx
 └ AppProviders
    └ RootNavigator              (auth 소유 — 세션 분기)
       ├ AuthNavigator           스플래시·로그인·가입·상태·삭제·약관
       └ MainNavigator           ← develop 의 AppNavigator 를 흡수
          ├ MainTabs (홈·탐색·저장·마이)
          ├ NearbyPlaces / PlaceDetail
          └ Settings / AccountDelete / LegalDocument   (auth 소유)
```

- `app/AppNavigator.tsx` → `app/navigation/MainNavigator.tsx` 로 옮기고 `NavigationContainer` 를 벗겼다.
  컨테이너는 `RootNavigator` 하나뿐이다.
- **자리표시자였던 `features/auth/screens/HomeScreen.tsx` 를 지웠다.** 실제 홈은
  `features/home/screens/HomeScreen.tsx` 다. `MainRouteParams` 에서도 `Home` 을 뺐다.
- **계정 설정 진입점은 마이 탭 안의 항목**으로 정했다 (사람 결정). `MyScreen` 에 `계정 설정`
  행을 더하고 `home-settings` testID 를 그 행이 물려받았다 — AC-28·AC-35 의 전제가 유지된다.
- 장소 화면들의 라우트 파라미터는 아직 `app/navigation/types.ts` 에 직접 있다.
  그 기능들이 `navigation.ts` 를 두면 auth 와 같은 방식으로 옮긴다 (M-2).
- E2E 두 플로우를 새 경로에 맞췄다 — 홈 도착 판정은 탭바(`tab-My`, 탭 버튼에 testID 신설),
  설정으로 갈 때 마이 탭을 먼저 누른다. `auth-02` · `auth-03` 둘 다 해당된다.

### 통과한 게이트

| 게이트 | 결과 |
|---|---|
| `make verify-mobile` | **exit 0** — 13 스위트 147건 전건 통과 (lint · typecheck · test) |
| `make lint-server` | BUILD SUCCESSFUL |
| `make test-server` | exit 0 |
| `make test-server-db` | BUILD SUCCESSFUL (Testcontainers 실제 PostgreSQL) |
| `make contract-check` | 통과 — 단, **스크립트를 먼저 고쳐야 했다.** 아래 참조 |
| `make verify` | **exit 0** (2026-09-06, 종료 코드 직접 확인) |

### 남은 일

1. ~~Docker 를 켜고 `make verify`~~ — **해소 (2026-09-06). `make verify` exit 0.**
   예상대로 `contract-check` 가 먼저 실패했다. `oasdiff` 가 `/api/v1/places/nearby` 와
   `/api/v1/places/{place_id}` 를 `api-path-removed-without-deprecation`(ERR) 로 잡았다.

   **원인은 이번 머지가 아니다.** develop 은 `server/` 를 한 줄도 바꾸지 않은 채 그 두 경로를
   계약에만 올렸다(모바일이 fixtures 로 그린다) — develop 자체가 갖고 있던 상태다.
   그 2건만 뺀 계약으로 다시 돌려 **auth 6개 엔드포인트는 계약과 완전히 일치**하고 실패 원인이
   places 뿐임을 확인했다.

   **조치 (사람 결정):** `scripts/contract-check.sh` 를 주석의 원래 의도대로 고쳤다.
   스크립트 상단은 처음부터 "계약에만 있고 아직 구현되지 않은 것 → 정보로만 보고" 라고
   적혀 있었으나 실제 동작이 달랐다. oasdiff 플래그에 기대지 않고, 계약에서 미구현 경로를 뺀
   사본으로 1단계를 검사하고 뺀 목록을 2단계에서 출력한다. 반대 방향(계약에 없는 엔드포인트
   노출)과 진짜 파괴적 변경(필드 삭제·타입 축소·응답 제거)은 그대로 실패한다.
   게이트 정책이 바뀌었으므로 `docs/conventions/common.md` **C-5 에 규칙으로 남겼다.**
2. ~~`docs/design/planbee.pen` 확인~~ — **해소 (2026-09-06).** 자동 머지 결과가 온전하다.
   JSON 파싱이 통과하고(version 2.17) 최상위 프레임 70개에 auth 아트보드(`Screen 06a`~`15a`)와
   develop 의 홈·상세·Nearby(`Screen 02`·`03`·`04a`~`04d`·`05`·`16a`~`16e`)가 **둘 다 살아 있다.**
   줄 수도 정확히 양쪽 추가분의 합이다(18702 + 30 + 1663 = 20395).
   **참고**: `.pen` 은 지금 암호화 파일이 아니라 pretty-printed JSON 이다 — 그래서 3-way 머지가
   깨끗하게 됐다. `AGENTS.md` 의 "암호화 파일이라 `Read`/`Grep` 으로 열리지 않는다" 는 서술과
   실제가 다르다. 편집은 계속 pencil MCP 로만 하되, 이 서술은 사람이 확인할 필요가 있다.
3. ~~E2E 재실행~~ — **해소 (2026-09-07). `make test-e2e` 4/4 통과.**

   ```
   [Passed] 인증 지속 (재시작) → 로그아웃 (47s)
   [Passed] 앱 기동 확인 (4s)
   [Passed] 로그인 → 홈 (36s)
   [Passed] 가입 신청 → 검토 중 안내 (41s)

   4/4 Flows Passed in 2m 7s
   ```

   전제였던 것들: Metro 실행 · `make e2e-up` · `export PATH="$PATH:$HOME/.maestro/bin"`.
   develop 머지 뒤 `pod install` 이 안 돼 있어 앱 빌드가 실패했고,
   `mobile/ios` 에서 `bundle install && bundle exec pod install` 로 풀었다
   (`Podfile.lock` 변경분이 워킹 트리에 남는다 — 커밋 여부는 사람 판단).

   **첫 실행은 4개 중 3개가 실패했다. 셋 다 앱·서버·계약의 결함이 아니라 플로우 문제였다.**
   실패 시점의 스크린샷·접근성 트리로 확인한 것: 가입은 서버까지 접수돼 **서버가 내려준 문구와
   이메일**이 화면에 있었고, 로그인은 성공해 **홈이 완전히 렌더**됐으며, 설정 화면에는 서버가
   내려준 `approved@e2e.planbee.test` 가 있었다. 막힌 것은 전부 Maestro 가 요소에 닿는 방법이다.

   | 플로우 | 실패 원인 | 고친 방법 |
   |---|---|---|
   | `auth-01` | **RN LogBox 알림 배너**가 `status-go-login` 버튼의 중심을 덮어 탭이 먹혔다 (개발 빌드에서만 뜨는 RN 개발 도구다 — 앱 Toast 가 아니다) | 배너가 있을 때만 닫기(X)를 좌표로 눌러 치운다 (`runFlow: when:`) |
   | `auth-02` | iOS **"암호를 저장하겠습니까?"** 다이얼로그가 떠 있어 그 아래 홈이 접근성 트리에서 사라졌다. 매번 뜨지는 않는다 | `retry` 안에서 `tapOn: text: '지금 안 함'` + `optional: true` |
   | `auth-03` | 로그아웃 알럿에서 `index: 1` 이 **알럿 뒤 설정 행**을 눌렀다. Maestro 의 `index` 는 계층 순서가 아니라 화면 y 위치 순서다 | index 를 버리고 `rightOf: text: '취소'` 로 알럿 구조를 짚는다 |

   근거·실측값·검증 방법은 `defects.md` **D-E2 "후속 (2026-09-07)"** 절에 있다.
   `e2e/` 밖의 파일은 고치지 않았다. 플로우 수정 ↔ 재실행 **1회**로 종료(상한 2회 안).
   고친 뒤 `make test-e2e` 를 **연속 3회** 돌려 3회 모두 4/4 였다(19:47 · 19:54 · 20:49).
   한 번은 실제로 LogBox 배너가 떠서 새로 넣은 방어 블록이 동작하는 것까지 로그로 확인했다.
4. 머지 커밋 → push → `develop` 으로 PR.

## 파이프라인

- [x] product-manager — PRD.md
- [x] ux-designer — design.md ✅ / `docs/design/planbee.pen` ✅ (2026-08-25 변경분 반영 완료)
- [x] tech-lead — contract.yaml ✅ (2026-08-26) `docs/features/auth/contract.yaml` + `docs/api/openapi.yaml` 병합 완료
- [x] server-developer ✅ (2026-08-26) 엔드포인트 6개 · 엔티티 3개 · Flyway `V2__create_auth.sql`
- [x] server-reviewer — 1차 **FAIL** (2026-08-27) 결함 `D-3`~`D-6` (`[MUST]` 4건) → 재작업 1회차 →
      재리뷰 **PASS** (2026-08-27) `review/server-review.md` "재리뷰" 절 · 전건 해소, 신규 `[MUST]` 0건
- [x] server-tester — **PASS** (2026-08-27) 통합 테스트 61건 신설 (`server/src/test/.../auth/`) ·
      차단 결함 0건 · `D-1` 판단 완료(→ `server.md` S-30) · 비차단 요청 `D-S1` 1건
- [x] mobile-developer ✅ (2026-08-26) 화면 8개(디자인 7 + 홈 자리) · DS 컴포넌트 10개 · 약관 번들 생성기 ·
      (2026-09-02) `D-T1` 수정이 낸 회귀를 사람 승인 후 `client.ts` 한 줄로 해소 → **`make verify-mobile` exit 0**
- [x] mobile-reviewer — 1차 **FAIL** (2026-08-27) 결함 `D-M1`~`D-M5` (`[MUST]` 5건) → 재작업 1회차 →
      재리뷰 **PASS** (2026-08-27) `review/mobile-review.md` "재리뷰" 절 · 전건 해소, 신규 `[MUST]` 0건
- [x] mobile-tester — **PASS** (2026-09-02) 2026-08-27 에 `D-T1`(갱신 401 시 앱이 멈춤)로 FAIL → mobile-developer 재작업 2회차 → 그 수정이 낸 회귀까지 3회차로 해소 → **`make verify-mobile` exit 0, 13 스위트 147건 전건 통과**
- [x] integration-tester — **PASS (2026-09-07). `make test-e2e` 4/4 통과.**
      `앱 기동 확인` (4s) · `가입 신청 → 검토 중 안내` (41s) · `로그인 → 홈` (36s) ·
      `인증 지속 (재시작) → 로그아웃` (47s). 검증 축 3가지 모두 커버됐다 —
      **왕복 일관성**(가입한 이메일이 서버를 거쳐 안내 화면에 그대로 · 설정 화면의 계정 카드가
      `GET /auth/me` 응답), **계약 정합성**(안내 문구·이메일·상태가 전부 서버 응답이고 앱에
      하드코딩이 없다), **인증 지속**(앱 재시작 후 세션 유지 → 로그아웃 → 재시작해도 유지 안 됨).
      첫 실행은 3개가 실패했으나 **셋 다 앱·서버·계약이 아니라 Maestro 셀렉터/시스템 UI 문제**였고
      플로우에서 흡수했다 (`defects.md` D-E2 "후속 (2026-09-07)"). **앱·서버로 돌릴 신규 결함 0건.**
      비차단 요청 1건만 `D-E1` 에 덧붙였다 — 로그아웃 확인 알럿의 버튼을 문구가 아니라
      `testID` 로 짚을 수 있게 해 달라는 것. 재작업 루프 **1회**로 종료.

## 재작업 카운터

루프 상한은 2회. 3회차에 접어들면 `ESCALATE` 를 적고 사람에게 넘긴다.

| 대상 | 횟수 |
|---|---|
| server-developer | 1 — **종료** (2026-08-27 server-reviewer FAIL `D-3`~`D-6` → 재작업 1회차 → 재리뷰 **PASS**. 2회차 없음) |
| mobile-developer | 3 — **종료** (1회차: 2026-08-27 mobile-reviewer FAIL `D-M1`~`D-M5` → 재리뷰 PASS. 2회차: mobile-tester 차단 결함 `D-T1`. 3회차: 그 수정이 낸 회귀 — **상한 초과라 `ESCALATE` 후 사람이 승인**, 2026-09-02. 게이트 exit 0 으로 종료) |

## 계약 변경

- breaking change 여부: **없음.** 기존 계약에 있던 것은 `/api/v1/health` 하나뿐이고 손대지 않았다.
  auth 엔드포인트 6개와 스키마 13개는 전부 신설이다.
- `docs/conventions/common.md` **C-1 개정** — 허용 HTTP 상태에 `429` 추가, `Retry-After` 규칙 신설.
  기존 코드에 영향 없음(추가만). `recommendation-quota` 의 열린 질문 1도 이 결정으로 해소된다.
- `docs/api/error-codes.md` — 공통에 `TOO_MANY_REQUESTS`, auth 도메인 코드 **12개** 등록.
- **2026-08-27 `POST /auth/token/refresh` 보완 — non-breaking.** 유예 창의 직전 응답이 사라진
  경우의 동작을 계약에 **추가로 기술**했을 뿐, 스키마·오퍼레이션·오류 코드는 하나도 늘거나
  줄지 않았다(신설 코드 0). 200 응답 형태 불변이라 **모바일 재생성(`make contract-types`) 결과도
  바뀌지 않는다.** 서버는 `RefreshTokenService` 의 캐시 미스 분기와 `AuthController` 의
  200 `@ApiResponse` 문구를 계약에 맞춰야 한다 (`defects.md` D-3 · D-6).

## 미해결 / 에스컬레이션

`ASK` — 사람 판단이 필요한 항목. **배포 전 반드시** 해결되어야 한다 (절대 규칙 8).
화면 설계와 구현은 이 항목들 없이 진행할 수 있다 — 막는 것은 배포뿐이다.

| # | 질문 | 막는 대상 |
|---|---|---|
| 1 | 약관 문서의 `{{ }}` 미확정 값 — 운영자명, 개인정보 보호책임자 성명·연락처, 시행일, 공고일, 거절 계정 보유 기간. *(2026-08-25 단순화)* **연락처는 이제 `SUPPORT_CONTACT_EMAIL` 설정값 하나로 수렴한다** — 처리방침 11항, 이용약관 제8조 2항, 앱 화면 3종과 잠금 배너가 모두 이 값을 쓴다. 관리자 계정 이메일과는 무관해졌다. 문의 전용 주소(`support@` 등) 하나를 정하면 이 칸이 함께 채워진다 | 배포 |
| 2 | 약관 본문의 **공개 URL** — 같은 내용을 웹에 게시하고 그 주소를 App Store Connect / Google Play Console 에 입력해야 한다. GitHub Pages 등 수단 미정 | 배포 |
| 3 | 두 법무 문서는 **법률 전문가 검토를 받지 않은 초안**이다. 배포 전 검토 필요 | 배포 |
| ~~9~~ | ~~통합(E2E) 테스트를 실행할 환경이 이 머신에 없다~~ → **해소 (2026-09-07).** Xcode 정식판 + iOS 26.5 시뮬레이터(iPhone 17 Pro) + Maestro 2.10.0 이 갖춰졌고, `make e2e-up` → `make e2e-app` → `make test-e2e` 를 실제로 돌려 **4/4 통과**했다. 첫 실행에서 조정될 수 있다고 적어 둔 셀렉터는 실측으로 확정했다(`defects.md` D-E1 후속 · D-E2 후속). **남아 있던 번들 ID 질문은 아래 10번으로 분리했다.** | — |
| 10 | **iOS 번들 ID 를 확정해야 한다** (2026-08-27 제기, 2026-09-07 분리, integration-tester). 지금 앱은 RN 템플릿 기본값 `org.reactjs.native.example.Planbee` 이고 안드로이드 `applicationId` 는 `com.planbee` 로 **서로 다르다.** `e2e/flows/*.yaml` 의 `appId` 는 iOS 값에 맞춰져 있어 **같은 플로우를 안드로이드에서 그대로 돌리면 앱을 찾지 못한다.** 번들 ID·팀·서명은 에이전트가 정하지 않는다(절대 규칙 8). 확정되면 iOS 프로젝트와 `e2e/flows` 의 `appId` 를 함께 바꾸고, 플랫폼별로 `appId` 를 갈라야 하면 그때 방식을 정한다 | 배포 · 안드로이드 E2E |
| 8 | **서버 인스턴스를 2대 이상으로 늘릴 때 옮겨야 하는 상태가 셋 있다** (2026-08-26 추가, `server.md` S-29). ① 로그인 실패 카운터 ② 가입 IP 레이트 리밋 ③ 리프레시 회전 유예 창 캐시. 전부 프로세스 메모리에 있고 각각 이유가 있다(잠금은 10분짜리 임시 상태라 PRD 가 TTL 캐시로 지정했고, 유예 창 캐시에는 리프레시 토큰 **평문**이 담겨 DB 에 넣으면 해시 저장의 의미가 사라진다). 단일 인스턴스로 운영하는 동안은 문제가 없다. 늘리는 순간 ①②는 인스턴스 수만큼 느슨해지고 ③은 요청이 다른 인스턴스로 가면 재사용으로 오인되어 **정상 사용자가 전 기기에서 로그아웃**된다. **(2026-08-27 보강)** ③의 그 동작이 이제 계약에 명시됐다 — 직전 응답을 서버가 기억하지 못하면 유예 창 안이라도 `AUTH_REFRESH_TOKEN_REUSED` + 전 기기 폐기다(아래 결정 기록, `defects.md` D-3). 단일 인스턴스에서는 재기동 직후 10초라는 드문 창에만 닿지만, **다중 인스턴스에서는 상시 발생**한다. 유예 창 캐시의 공유 저장소 이전은 다중 인스턴스 전환의 **선행 조건**이다 | 다중 인스턴스 배포 |
| ~~7~~ | ~~하네스 deny 규칙이 프로젝트 정책과 어긋난다~~ → **해소 (2026-08-25).** 생성기(`scripts/setup-harness.sh`)의 `Read(./.env.*)` 를 실제 시크릿 변형만 열거하도록 좁히고 `make harness` 로 재생성했다. `.env.example` 은 읽히고 `.env` 는 계속 차단된다. 아래는 원래 내용: **하네스 deny 규칙이 프로젝트 정책과 어긋난다.** `.claude/settings.json` 의 `Read(./.env.*)` 가 `.env.example` 읽기까지 막는데, `AGENTS.md` 절대 규칙 7 은 "`.env.example` **만** 참조" 하라고 지시한다. 에이전트가 기존 변수 정의를 확인할 수 없어 중복 추가·형식 오류 위험이 있다. 생성물이 아니라 **생성기**(`scripts/setup-harness.sh`)를 고치고 `make harness` 로 재생성해야 한다 — 예: `Read(./.env)` 와 `Read(./.env.local*)` 로 좁히기. 권한을 넓히는 변경이라 사람 승인 필요 | 에이전트 작업 효율 |

### 해소된 ASK

| # | 질문 | 결과 |
|---|---|---|
| 4 | 처리방침 5항(처리 위탁) — Discord 알림에 이메일이 실리면 국외 이전(「개인정보 보호법」 제28조의8)에 해당 | **해소 (2026-08-23).** 알림 페이로드에서 개인정보를 전부 뺐다 — 건수만 보낸다(`admin-user-approval` AC-26·AC-31). 위탁·국외 이전이 성립하지 않아 처리방침 5항이 확정됐고, 가입 화면에 별도 동의 항목을 늘리지 않는다 |
| 5 | `{{문의 이메일}}` 이 없으면 거절·정지·잠금 사용자에게 출구가 없다 | **해소 (2026-08-23), 출처 변경 (2026-08-25).** 서버가 응답에 담아 내려준다는 결론은 그대로이고, **값의 출처가 `ADMIN` 계정 이메일 → 서버 설정값 `SUPPORT_CONTACT_EMAIL` 로 바뀌었다.** 앱 쪽 요건(AC-38~45)은 변경 없음. 아래 결정 기록 참조 |
| 6 | `.env.example` 에 `SUPPORT_CONTACT_EMAIL` 정의 추가 | **해소 (2026-08-25).** 값 없이 정의만 추가했다(절대 규칙 7). 하네스가 생성한 deny 규칙 `Read(./.env.*)` 이 `.env.example` **읽기**를 막고 있어 내용 확인은 못 했지만, 쓰기는 막히지 않아 추가에 성공했다. 중복 없이 한 줄로 들어간 것을 확인했다. deny 규칙 자체는 아래 별도 항목 참조 |
| — | 거절 계정에 앱 내 삭제 경로가 없다 (5.1.1(v)) | **해소 (2026-08-25).** `REJECTED` 상태 안내 화면에 "계정 삭제" 를 추가했다 — AC-50, `design.md` §7.3.2. `SUSPENDED` 는 정지 회피 우려로 제외하고 문의 경로를 유지한다 |

### `tech-lead` 로 넘어갔던 항목 — **8건 전부 해소 (2026-08-26)**

`design.md` §14.1 의 8개 묶음과 PRD 열린 질문 3(오류 코드)이 계약으로 확정되었다.

| # | 항목 | 계약에서의 결론 |
|---|---|---|
| 1 | 상태 안내 화면의 재사용 스키마 (AC-46) | `AccountStatusView` 하나. `SignupResponse` 와 `AccountBlockedProblem` 이 함께 참조한다. 상태 조회 전용 GET 은 만들지 않았다 |
| 2 | 오류 코드의 구분과 동일성 | auth 코드 **12개** 등록. 상태 3종은 구분(`AUTH_ACCOUNT_PENDING`/`REJECTED`/`SUSPENDED`), 자격 증명은 하나(`AUTH_INVALID_CREDENTIALS`), 잠금은 계정 존재와 무관하게 하나(`AUTH_LOGIN_LOCKED`) |
| 3 | 잠금 응답 | **429 + `Retry-After`(실제 초)** 확정 — C-1 의 허용 상태 코드에 429 를 추가했다. 화면이 쓰는 값은 본문의 `lock_remaining_minutes`(올림·최소 1분)이고 앱은 헤더를 쓰지 않는다 |
| 4 | 문의 이메일 | `support_contact_email`. `AccountStatusView` 와 `LoginLockedProblem` 에 각각. **단수 문자열, nullable, 없어도 정상 응답**(AC-43·44) |
| 5 | 토큰 수명과 회전 | 액세스 30분 / 리프레시 14일 유휴 만료. 유예 창 10초 안의 재사용은 **200 + 직전과 같은 토큰 쌍**, 유예 밖만 `AUTH_REFRESH_TOKEN_REUSED` → 전 기기 폐기 → 다른 기기는 `AUTH_REFRESH_TOKEN_REVOKED` |
| 6 | 동의 이력 구조 | `consents: [{type, agreed, version}]` 3종 고정. `version` nullable(`MARKETING`). 만 14세는 `age_over_14_confirmed` 로 분리 |
| 7 | 계정 삭제 인증 (AC-50) | **삭제 전용 스코프 토큰.** `REJECTED` 로그인 403 에 `scope: account:delete` 인 10분짜리 토큰을 동봉하고, `DELETE /api/v1/auth/me` 는 항상 Bearer 하나로 인증한다. 자격 증명을 받는 두 번째 공개 엔드포인트를 만들지 않는다 (사람 결정 2026-08-26) |
| 8 | 가입 레이트 리밋 | **동일 IP 시간당 10회**, 초과 시 429 `AUTH_SIGNUP_RATE_LIMITED` + `Retry-After` |

PRD 열린 질문 **2(초기 관리자 계정 생성 경로)는 여전히 열려 있다.** 다만 `auth` 를 막지 않는다 —
문의 창구가 설정값으로 분리되어 관리자 계정 없이도 모든 화면이 성립한다.
`admin-user-approval` 의 선행 조건으로 넘긴다.

### `product-manager` 로 돌려보낼 항목 — 4건 중 1건 해소, 3건 잔여

- (3) 오프라인 세션 복원 AC 부재 — **잔여.** *전이표 불일치는 해소, AC 승격은 미결.*
  계약과 무관하다 (앱 단독 동작)
- (4) AC-13 의 응답 시간 동일성 — **해소 (2026-08-26, tech-lead).** 미등록 이메일에도
  **더미 bcrypt 해시 검증을 한 번 돌린다.** 계약의 로그인 처리 순서 3번에 명시했다.
  이걸 하지 않으면 잠기지 않은 등록 계정만 bcrypt 를 돌아 응답 시간으로 계정 존재가 드러난다
- (5) 마케팅 동의 문서 부재 — **잔여.** 저장 형태는 계약이 확정했고(`version` nullable),
  문서 부재는 그대로다. 실제 발송을 시작하는 시점에 다룬다
- (6) `SUSPENDED` 사유 표시 여부 — **잔여.** 계약은 `AccountStatusView.body` 에 서버가 완성한
  문구를 담으므로, 사유를 내리기로 결정되면 **계약 변경 없이** 문구만 바뀐다

## 결정 기록

| 항목 | 결정 | 날짜 |
|---|---|---|
| 이메일 인증 단계 | 두지 않음. 관리자 승인 게이트로 대체 | 2026-08-23 |
| 사용자 알림 수단 | 없음. 다시 로그인할 때 상태를 안내 | 2026-08-23 |
| 비밀번호 재설정 | 범위 밖. 메일 발송 수단이 없음 | 2026-08-23 |
| 계정 삭제 시 파기 시점 | **즉시 파기.** 유예 기간 없음 | 2026-08-23 |
| 약관 본문 관리 | 원본은 `docs/legal/` 마크다운. 앱에 번들(오프라인 열람) + 같은 내용을 웹에 게시(스토어 필수 URL). 앱 내 화면과 공개 URL 은 둘 다 필수 | 2026-08-23 |
| 약관 본문 작성 | 저장소 안에서 초안 작성 — `docs/legal/terms.md` v1.0, `docs/legal/privacy-policy.md` v1.0 | 2026-08-23 |
| 로그인 실패 잠금 | **5회 / 10분 창 / 10분 잠금** 확정 | 2026-08-23 |
| 만 14세 미만 차단 | **자기신고 체크박스** 확정. 법정대리인 동의 절차는 만들지 않는다 | 2026-08-23 |
| 디자인 토큰 원본 불일치 | `mobile/tailwind.config.js` 의 색값이 `planbee.pen` 의 `Screen 01 — Design System` 과 다르다. `mobile.md` M-16 에 따라 **pen 이 기준**이므로 코드 쪽을 맞춘다. 대상 값은 `design.md` §2.1 표. mobile-developer 가 `auth` 구현 전에 반영 | 2026-08-23 |
| 오류 표현의 색 | 연한 빨강 배경 토큰을 새로 만들지 않고 `surface` + `danger` 1px 테두리로 표현. 신규 색 토큰 0건 | 2026-08-23 |
| 가입 사유의 필수 여부 | **선택 항목 확정.** AC-1·AC-6 의 제출 조건(이메일·비밀번호·필수 동의 3건)은 그대로 두고, PRD 제약 절에 "비어 있어도 접수된다" 를 명시. `docs/legal/privacy-policy.md` 1항도 선택 항목 표로 정리되어 일치 확인 | 2026-08-23 |
| Discord 알림의 개인정보 | **알림에서 개인정보를 뺀다.** 건수만 발송 — 국외 이전(제28조의8)을 성립시키지 않아 가입 동의 항목을 늘리지 않기 위함. 상세 AC 는 `admin-user-approval` AC-26·AC-31 | 2026-08-23 |
| 앱 안 문의 연락처 | ~~**서버가 `ADMIN` 계정 이메일을 응답에 담아 내려준다.**~~ **2026-08-25 결정으로 대체됨** (아래) | 2026-08-23 |
| **앱 안 문의 연락처 (대체)** | **서버 설정값 `SUPPORT_CONTACT_EMAIL` 을 응답에 담아 내려준다.** C-8 이 요구하는 것은 "앱이 하드코딩하지 않는다" 뿐이고 설정값도 이를 똑같이 만족한다. `ADMIN` 계정 이메일을 쓰면 ① 문의 창구가 관리자 계정 존재 여부에 묶이고, ② 담당자가 바뀌면 대외 연락처가 바뀌며, ③ 잠금 응답(AC-41)은 **비밀번호를 틀린 누구에게나** 가므로 직원 개인 이메일이 사실상 공개된다. AC-43·AC-45 문구 수정, 열린 질문 2 축소 | 2026-08-25 |
| 리프레시 14일의 성격 | **유휴 만료(sliding).** 회전할 때마다 새 14일, 절대 만료 상한 없음. AC-25 의 기준점을 "마지막 로그인" → "마지막 사용" 으로 수정. 절대 만료를 두면 매일 쓰는 사용자도 2주마다 재로그인해야 한다 | 2026-08-25 |
| 리프레시 회전 유예 창 | **10초.** 유예 창 안의 직전 토큰 재사용은 재사용으로 보지 않고 같은 토큰 쌍을 재발급(AC-49). 유예 밖 재사용만 AC-23 거부 + AC-24 전 기기 폐기. 유예가 없으면 네트워크 타임아웃만으로 정상 사용자가 전 기기 로그아웃된다 | 2026-08-25 |
| 로그인 실패 카운터의 키 | **계정이 아니라 입력된 이메일 문자열.** 미등록 이메일도 같은 잠금 응답(AC-47). 계정 단위로만 세면 잠금 응답 여부로 계정 존재가 새어 나가 AC-13 이 무력화된다 | 2026-08-25 |
| 잠금 중 재시도의 처리 | **잠금 확인을 비밀번호 검증보다 먼저.** 그 시도는 카운트하지 않아 잠금이 연장되지 않는다(AC-48). bcrypt 연산 절약과 응답 시간 누출 방지도 함께 얻는다. 남은 시간은 **올림·최소 1분** | 2026-08-25 |
| 동의 이력의 구조 | 동의 3종(`TERMS`·`PRIVACY`·`MARKETING`)만 이력에 남기고 **약관 버전은 nullable**. **만 14세는 동의가 아닌 자기 확인**이라 사용자 레코드의 확인 시각 필드로 분리. 처리방침 1항에 별도 항목으로 명시 | 2026-08-25 |
| 가입 화면의 계정 열거 | **인수된 위험.** 메일 발송 인프라가 없어 "안내 메일로 분기" 라는 유일한 대안이 성립하지 않는다. AC-2 는 유지하고 가입 엔드포인트 IP 레이트 리밋으로 대량 열거만 막는다. 이 비대칭을 로그인 쪽 보호를 약화시키는 근거로 쓰지 않는다 | 2026-08-25 |
| 거절 계정의 앱 내 삭제 | **`REJECTED` 상태 화면에 "계정 삭제" 추가**(AC-50). 5.1.1(v) 는 앱 안에서 삭제를 **개시**할 것을 요구하는데 거절 계정은 설정 화면에 도달하지 못한다. 비밀번호는 이미 맞은 상태이므로 §9 흐름을 재사용. **`SUSPENDED` 는 제외** — 즉시 파기 + AC-32 와 겹치면 정지를 무력화할 수 있다 | 2026-08-25 |
| 가입 응답의 구조 | 가입 201 응답과 로그인 차단 응답이 **같은 상태 스키마 하나**를 공유(AC-46). 같은 화면을 그리는 데이터가 엔드포인트마다 따로 정의되면 "앱이 문구를 조합하지 않는다"(C-8)가 두 곳에서 관리된다 | 2026-08-25 |
| 잠금·레이트 리밋의 상태 코드 | **429 + `Retry-After`.** `common.md` C-1 의 허용 목록에 429 를 추가했다. 403(권한 없음)도 400(요청이 잘못됨)도 아닌 "지금은 말고 나중에" 이고 그 의미를 가진 표준 코드가 429 다. 403 으로 우회하면 `recommendation-quota`(일일 한도 초과)에서 같은 질문을 다시 하게 된다. 앱은 헤더가 아니라 본문 `lock_remaining_minutes` 로 화면을 그린다 | 2026-08-26 |
| `REJECTED` 계정 삭제의 인증 (AC-50) | **삭제 전용 스코프 토큰.** 로그인 403(`AUTH_ACCOUNT_REJECTED`) 응답에 `scope: account:delete` 인 10분짜리 액세스 토큰을 동봉한다. `DELETE /api/v1/auth/me` 는 일반 세션이든 이 토큰이든 **항상 Bearer 하나**로 인증되고, 스코프만 다르다. 대안(이메일+비밀번호를 받는 공개 삭제 엔드포인트)은 자격 증명을 검증하는 두 번째 공개 표면을 만들어 로그인과 똑같은 잠금·열거 방어를 중복 구현하게 만든다. 리프레시 토큰을 주지 않으므로 세션이 되지 않는다 | 2026-08-26 |
| 미등록 이메일의 응답 시간 (`design.md` §14 항목 4) | **더미 bcrypt 검증을 돌린다.** 계정이 없어도 고정 더미 해시로 검증을 한 번 수행한 뒤 401 을 낸다. 잠긴 계정의 시간차는 AC-48(잠금 선확인)로 이미 사라졌지만, **잠기지 않은** 등록 계정만 bcrypt 를 돌면 응답 시간으로 계정 존재가 드러나 AC-13 이 무력해진다 | 2026-08-26 |
| 가입 레이트 리밋 임계값 | **동일 IP 시간당 10회.** 사람이 손으로 가입하는 흐름에는 닿지 않고 대량 자동 열거만 막는 값이다. AC-2 의 이메일 중복 노출은 인수된 위험이고 이 리밋은 그 완화책이다 | 2026-08-26 |
| 로그인 이메일의 형식 검증 | **하지 않는다.** `LoginRequest.email` 에 `format: email` 을 붙이지 않았다. 형식 오류를 400 으로 갈라내면 "형식이 맞는 미등록 이메일" 과 "형식이 틀린 이메일" 의 응답이 달라지고, 그건 AC-13 이 막으려는 정보 누출과 같은 종류다. 형식이 틀린 값도 그대로 받아 401 을 낸다 | 2026-08-26 |
| 리프레시 거부 코드의 분해 | **4종으로 나눈다** — `EXPIRED` / `INVALID` / `REUSED` / `REVOKED`. `design.md` §4.3 이 만료 배너와 보안 배너를 구분하는데, 재사용 감지로 **폐기당한 다른 기기**(AC-24)가 `INVALID` 를 받으면 만료 배너가 떠서 AC-24 가 요구한 보안 배너가 나오지 않는다. 그래서 `REVOKED` 를 따로 둔다 | 2026-08-26 |
| 비밀번호 상한 72자 | bcrypt 는 73바이트째부터 무시한다. 상한이 없으면 "72자까지만 실제로 검사되는" 비밀번호가 생겨 사용자가 아는 정책과 실제 검증이 어긋난다 | 2026-08-26 |
| **유예 창의 직전 응답이 사라진 경우** | **닫히는 쪽으로 실패한다 — 유예 창 안이라도 재사용으로 처리한다.** 401 `AUTH_REFRESH_TOKEN_REUSED` + 그 계정의 모든 리프레시 폐기(AC-23·24). **새 토큰 쌍을 발급하지 않고, 전용 오류 코드도 만들지 않는다.** 서버는 회전된 토큰의 후속 평문을 보관하지 않으므로 "항상 같은 쌍" 은 현 설계로 불가능하다. 새 쌍을 발급하면 ① 이미 살아 있는 후속 토큰과 함께 유효 리프레시가 늘어 병렬 세션이 되고 ② 직전 토큰에 로그아웃 폐기가 찍혀 이후의 진짜 재사용이 `INVALID` 로 걸러져 AC-24 가 무력해진다. 유예 창은 네트워크 타임아웃 완화책이지 재사용 탐지를 약화시키는 장치가 아니다(2026-08-25 결정). **AC-49 는 직전 응답이 남아 있는 경우로 한정**되고 예외는 AC-23·24 를 따른다 — PRD 문구 보완은 `defects.md` D-7 로 product-manager 에게 넘겼다. 상세 근거와 구현 지침은 `defects.md` D-3 "계약에서의 결론" | 2026-08-27 |

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-23 | product-manager | PRD.md 작성 완료 (US 6개 / AC 34개). ASK 4건 |
| 2026-08-23 | product-manager | 사람 결정 반영 — 즉시 파기 확정, 약관 본문 구조 확정. AC-35~37 추가 (총 37개). ASK 3건 잔여 |
| 2026-08-23 | (사람 결정) | 잠금 5/10/10 확정, 만 14세 체크박스 유지 확정, 법무 문서 초안 작성 승인 |
| 2026-08-23 | (문서) | `docs/legal/terms.md` · `docs/legal/privacy-policy.md` v1.0 초안 작성. PRD 열린 질문 2·3 해소 |
| 2026-08-23 | ux-designer | 1단계 `design.md` 작성 완료 — 화면 9종(스플래시·로그인·가입 신청·약관 뷰어·계정 상태 3종·설정·계정 삭제), AC-1~37 전부 매핑(미커버 0), 사용자 문구 전건 확정. PRD 로 돌려보낼 항목 6건, ASK 5 신설 |
| 2026-08-23 | ux-designer | 2단계 `docs/design/planbee.pen` 시각화 완료 — `Screen 01 — Design System` 에 신규 컴포넌트 2개 섹션(9개 컴포넌트) 추가, `Screen 06a`~`14e` 아트보드 31개 생성. 신규 색 토큰 없음 |
| 2026-08-23 | (사람 결정) | 3건 확정 — 가입 사유 선택 항목, Discord 알림에서 개인정보 제거, 문의 연락처는 서버가 `ADMIN` 계정 이메일 제공 |
| 2026-08-23 | product-manager | 사람 결정 3건 반영 — 제약 2줄 추가(가입 사유 선택 / 문의 연락처 출처), US-7 신설과 **AC-38~45 추가 (총 45개).** 기존 번호는 재사용·이동 없이 뒤에 이어 붙였다. ASK 4·5 해소 → 잔여 ASK 3건. `design.md` §14 항목 1·2 해소, 잔여 4건. ux-designer 로 돌려보낼 항목 3건(§7.2 `PENDING` 문의 경로 추가 포함) |
| 2026-08-25 | (검토) | `PRD.md`·`design.md`·법무 문서 교차 검토 — 계약 착수를 막는 모호함 6건, 문서 간 사실 어긋남 3건, 사람 판단 4건 발견 |
| 2026-08-25 | (사람 결정) | 검토 13건 전부 권장안대로 확정. 문의 연락처 출처 변경(`ADMIN` 계정 → 설정값) 포함 |
| 2026-08-25 | product-manager | **AC-46~50 추가 (총 50개)**, AC-23·24·25·43·45 문구 수정. 기존 번호는 재사용·이동 없이 각 US 표 끝에 이어 붙였다. 제약 절에 9개 항목 추가(슬라이딩 만료, 유예 창, 카운터 키, 잠금 선확인, 반올림, 문의 연락처 출처, 동의 이력 구조, 가입 열거 인수, 거절 계정 삭제). 열린 질문 2 축소, 해소된 질문 10행 추가 |
| 2026-08-25 | ux-designer | `design.md` 갱신 — §1.1·§1.2·§1.3 에 `REJECTED` 삭제 경로, §2.6 에 유예 창, §2.7.1 문의 주소 출처 변경, §4.7 "약 10분" 제거 및 AC-48 근거 추가, §5.3 낡은 각주 정정(B-1), §5.4 동의 이력을 3종+자기확인으로 재작성, **§7.3.2 계정 삭제 경로 신설**, §9.1 진입 2경로, §11.2·§11.4 문구 갱신, §13 대조표 **50개 중 미커버 0**, §14.1 을 8개 묶음으로 전면 재작성. **pen 재시각화는 미완 — pencil MCP 미연결** (§15 경고 블록) |
| 2026-08-25 | (문서) | `docs/legal/privacy-policy.md` 1항에 "만 14세 이상 확인" 항목 분리, 11항 연락처에 문의 전용 주소 명시 |
| 2026-08-25 | (환경) | `.env.example` 에 `SUPPORT_CONTACT_EMAIL` 정의 추가(값 없음, 전용 섹션·주석 포함). 이를 막던 하네스 deny 규칙 `Read(./.env.*)` 을 **생성기에서** 수정하고 `make harness` 재생성 — `.env.example` 읽기 허용, `.env` 는 계속 차단 확인 |
| 2026-08-25 | ux-designer | **pen 재시각화 완료** — `Screen 07d` 잠금 문구에서 "약 10분" 제거, `Screen 12b` 에 `Secondary Links` 행 신설("개인정보 처리방침 보기 · **계정 삭제**", AC-50). `Screen 14a·14b` 는 NavBar 가 진입 경로와 무관해 **변경 없음으로 확정**. 아트보드 32개 유지, 신규 컴포넌트·색 토큰 0건. 스크린샷으로 레이아웃 검증 |
| 2026-08-23 | ux-designer | AC-38~45 반영 — `design.md` 에 §2.7 공용 문의 블록 신설(출처·표시·부재 처리), `{{문의 이메일}}` 자리표시자 전량 제거하고 서버 제공 값으로 정정(§4.7·§7.3.1·§7.4.1·§11), §7.2.2 `PENDING` 문의 줄 추가(강조 카드보다 낮은 위계 — AC-14 의 주 행동 지시 유지), AC-43 대체 문구 `contact.unavailable` 확정, §13 대조표 AC-45 까지 확장(**45개 중 미커버 0**), §14 항목 1·2 해소 표기(잔여 4건), §14.1 에 문의 이메일 필드 요구 3항 추가. pen — `Layout/ContactRow` 컴포넌트 신설(DS 에 주소 있음/없음 2상태), `Screen 07d`·`12a`·`12b`·`12c` 갱신, `Screen 15a`(AC-43 대체 안내 대표 화면) 추가 → 아트보드 32개. 기존 번호 유지, 신규 색 토큰 0건 |
| 2026-08-26 | (사람 결정) | 2건 확정 — `REJECTED` 계정 삭제는 **삭제 전용 스코프 토큰**, 잠금 응답은 **429 + `Retry-After`**(C-1 개정 동반) |
| 2026-08-26 | tech-lead | **`contract.yaml` 확정 및 `docs/api/openapi.yaml` 병합 완료.** 엔드포인트 6개(`POST /auth/signup` · `POST /auth/login` · `POST /auth/token/refresh` · `POST /auth/logout` · `GET /auth/me` · `DELETE /auth/me`), 스키마 15개, 공용 응답 6개. **AC 50개 중 계약 미커버 0** (대조표는 `contract.yaml` 말미). `error-codes.md` 에 auth 코드 12개 + 공통 `TOO_MANY_REQUESTS` 등록, `common.md` C-1 개정(429·`Retry-After`). `design.md` §14.1 의 8건 전부 해소, §14 항목 4 해소. **모든 오퍼레이션에 성공·실패 응답 존재**, `$ref` 21건 전부 해결, C-7(snake_case) 위반 0 을 기계로 확인 |
| 2026-08-26 | server-developer | **`server/src/main/` 구현 완료.** `auth` 패키지 신설 — 엔드포인트 6개, 엔티티 3개(`User`·`UserConsent`·`RefreshToken`), Flyway `V2__create_auth.sql`, `AuthErrorCode` 12종. `common/` 확장 3건: `BusinessException` 에 ProblemDetail 확장 필드·헤더(S-27), `CommonErrorCode.TOO_MANY_REQUESTS`, `ClockConfig`. **`SecurityConfig.PUBLIC_PATHS` 를 계약대로 좁혔다** — `/api/v1/auth/**` 통짜 공개를 signup·login·token/refresh 셋으로 줄이고, `DELETE /auth/me` 만 삭제 전용 스코프를 허용. `make verify-server` 통과(`test-server-db` 제외 — D-2). 규칙 4건 추가: S-27·S-28·S-29, S-21 숫자 경계 예외 |
| 2026-08-26 | mobile-developer | **`mobile/src/` 구현 완료.** **`tailwind.config.js` 를 pen 값으로 교정**(2026-08-23 결정 이행 — 색 13개 + 타이포·라운드 토큰). `shared/ui` 에 Design System 컴포넌트 10개, `features/auth` 에 화면 8개·컴포넌트 3개·훅 3개. **약관 본문 번들 생성기 신설**(`make legal-bundle`) — `docs/legal/*.md` 가 원본이고 사본은 커밋하지 않는다(AC-37). `shared/api` 확장 2건: `ApiError.raw`(RFC 9457 확장 필드 읽기), 호출부가 붙인 `Authorization` 보존(삭제 전용 토큰). `make verify-mobile` 통과 — 스모크 4건 포함 12건. 규칙 2건 추가: M-21·M-22, M-17 의 경계 변환 TODO 해소 |
| 2026-08-26 | (환경) | Docker 미기동으로 `test-server-db`·`contract-check` 를 일시 보류 — `defects.md` D-2 |
| 2026-08-26 | server-developer | **D-2 해소 — 미뤘던 검증에서 결함 2건 발견·수정.** ① `V2` 의 `token_hash CHAR(64)` 가 Hibernate 의 `varchar` 매핑과 어긋나 **서버가 기동되지 않았다** → `VARCHAR(64)` 로 수정(미적용 마이그레이션이라 새 버전을 만들지 않았다). ② springdoc 생성 스펙이 계약과 어긋났다 — 런타임 응답은 계약대로였고 스펙만 camelCase·비-3.1 표기였다. `OpenApiConfig` 에 `ModelResolver(objectMapper).openapi31(true)` 등록, nullable 을 `@Schema(types = {"string","null"})` 로 교체. 함께 `AccountStatusView.status` 를 `BlockedAccountStatus`(3종)로 좁혀 `APPROVED` 누출을 막고, 계약에 `refresh_token.minLength: 1` 을 더했다 |
| 2026-08-26 | (검증) | **`make verify` 전체 통과** — 모바일 린트·타입·테스트 12건, 서버 Spotless·ArchUnit·단위, **통합 테스트(Testcontainers)**, **`contract-check`**. 남은 `info` 는 오류 응답을 `@ApiResponse` 로 복제하지 않기로 한 결정이며 실패가 아니다 (D-2 말미) |
| 2026-08-27 | mobile-reviewer | **FAIL — `[MUST]` 5건.** `review/mobile-review.md` 작성, `defects.md` 에 `D-M1`~`D-M5`(+요청 `D-M6`) append. M-17(토큰 경계 변환이 화면 2곳에서 반복) · M-16(색상 리터럴 3곳) · M-2(`features/` → `app/` 역방향 import 8파일) · M-20(접근성 낭독이 안드로이드 전용, iOS 경로 없음) · M-7(가입 화면 문구 배치가 §5.2·§5.3 과 다름). 통과 확인: M-8(생성 `schema.ts` 와 계약 재생성 결과 일치) · M-21 · M-22 · M-13 · M-14 · M-18/C-8 · 계약 6개 엔드포인트 정합. `make lint-mobile` 통과라 ESLint 항목은 리포트에 없다(절대 규칙 3). 규칙에 없는 관찰 7건은 지적하지 않고 리포트 §4 에 참고로만 남겼다(절대 규칙 2) |
| 2026-08-27 | server-reviewer | **FAIL — `[MUST]` 4건.** `review/server-review.md` 작성, `defects.md` 에 `D-3`~`D-6` append. **D-3(High)** S-17·C-5 — 리프레시 유예 창의 **캐시 미스 분기**가 새 토큰 쌍을 발급해 유효 리프레시가 늘고(B·C 동시 유효), 그 뒤 유예 창 밖 재사용이 `REUSED` 가 아닌 `INVALID` 로 걸러져 **AC-24 의 전 기기 폐기가 발동하지 않는다.** 계약 보완이 필요할 수 있어 tech-lead 판단이 걸린다. **D-4(High)** S-5·S-4 — 컨트롤러가 `refreshTokenService.rotate(..., authService::assertCanStillSignIn)` 로 두 서비스를 조합하고 콜백 타입 인자가 엔티티 `User` 다. **D-5(Medium)** S-29 — `SignupRateLimiter` 에 "왜 DB 가 아닌지" 주석 없음(다른 둘은 있음). **D-6(Low)** S-19 — `refreshToken` 200 설명이 계약보다 한 문장 짧다(`contract-check` 는 설명 차이를 잡지 않는다). 통과 확인: S-1·2·3·4·6·7·8·14(`VARCHAR`)·15·16·17(`PUBLIC_PATHS` 축소·스코프 인가)·18·19·21(숫자 경계 예외)·22·23·25·27·28, C-1(429·`Retry-After`)·C-4·C-5·C-7·C-8. `server/build/openapi.json` 과 `contract.yaml` 을 기계 대조해 **스키마 11개의 프로퍼티·required 차이 0건** 확인. `make lint-server` 통과라 Spotless 항목은 리포트에 없다(절대 규칙 3). 규칙에 없는 관찰 4건은 리포트 말미에 참고로만 남겼다(절대 규칙 2) |
| 2026-08-27 | tech-lead | **D-3 의 미정의 예외를 계약으로 확정 (non-breaking).** 유예 창의 직전 응답이 사라진 상태에서 유예 창 안의 재시도가 오면 **재사용으로 처리한다** — 401 `AUTH_REFRESH_TOKEN_REUSED` + 전 기기 폐기(AC-23·24), 새 토큰 쌍 발급 금지. `contract.yaml` 과 `docs/api/openapi.yaml` 의 `POST /auth/token/refresh` 에 문단 신설 + 200 설명 한 줄 추가 + 401 표의 `REUSED` 행 확장 + AC 대조표 23·49 주석, `error-codes.md` 세션 절에 같은 단서. **신설 오류 코드·스키마 0건, 모바일 영향 없음**(200 응답 형태 불변 → `schema.ts` 재생성 결과 동일). `defects.md` D-3 에 "계약에서의 결론"(구현 지침 8항 + server-tester 확인 4항 + 기각한 대안) 추가, **D-6 의 기대 문구를 최종 3줄로 갱신**, **D-7 신설**(PRD AC-49 에 한정 어구 필요 — product-manager 앞). ASK 8 보강 — 유예 창 캐시의 공유 저장소 이전은 다중 인스턴스 전환의 **선행 조건**이다 |
| 2026-08-27 | mobile-developer | **재작업 1회차 — `D-M1`~`D-M5` 전건 수정, `make verify-mobile` 통과** (린트·타입·테스트 12건). **D-M1** 토큰 경계 변환을 `shared/api/session.ts` 의 `toTokens`/`saveTokenPair` 한 곳으로 모았다 — 리포트의 예시(`app/configureSession.ts` 에 두기)는 D-M3 와 충돌해서 저장 모델을 정의한 모듈로 옮겼고, M-17 의 위치 문장을 그에 맞게 정정했다. **D-M2** 토큰 **값**을 `mobile/tailwind.tokens.js` 로 분리하고 `tailwind.config.js` 가 이를 `require` 한다. 앱은 `shared/ui/tokens.ts` 의 `COLOR` 로 같은 파일을 읽는다 — `#RRGGBB` 0건. **D-M3** 파라미터 목록을 `features/auth/navigation.ts` 로 옮기고 `app/navigation/types.ts` 가 조합한다 — `features/` → `app/` import 0건. **D-M4** `shared/lib/a11y.tsx` 에 iOS(`announceForAccessibility`) · 안드로이드(`LIVE_REGION_POLITE`) 양쪽 경로를 두고 배너·토스트·스플래시 진입에 적용, 미사용이던 `a11ySplashAnnounce` 를 §3.5 진입 안내로 사용. **D-M5** NavBar "가입 신청" / 본문 H1 "Planbee 가입 신청" 으로 분리하고, 가입 사유 필드의 라벨을 "가입 사유"(+`RequirementBadge`)로 바로잡아 `accessibilityLabel` 이 플레이스홀더 문장이 되던 문제를 없앴다(`TextField` 에 `labelBadge` 슬롯 추가). 규칙 갱신 4건: M-2(타입 전용 import 도 예외 아님 + 내비 파라미터 소유), M-16(단일 원본 위치 + className 못 받는 prop), M-17(변환 위치 정정), M-20(낭독은 `shared/lib/a11y`). **D-M6 은 고치지 않았다** — 선택지 둘 다 ux-designer/사람 권한이라 결정과 사유를 `defects.md` D-M6 에 남겼다(리뷰어가 지적한 "근거가 주석에만 있다" 는 이로써 해소) |
| 2026-08-27 | mobile-reviewer | **재리뷰 PASS — 재작업 1회차 결과.** `review/mobile-review.md` 에 "재리뷰" 절 추가(1차 FAIL 판정은 이력으로 보존), `defects.md` 신규 결함 **0건**(`D-M7` 없음). `D-M1`~`D-M5` 전건 해소를 코드로 확인 — 토큰 경계 변환 1곳(`shared/api/session.ts:26`) · `#RRGGBB` 0건 · `features/` → `app/` import 0건(타입 포함) · 낭독은 `shared/lib/a11y` 로 iOS·Android 양쪽 경로 · 가입 화면 문구가 §5.2·§5.3·§2.5 와 일치. **핵심 판단: `D-M1` 을 `app/configureSession.ts` 가 아니라 `shared/api/session.ts` 로 옮긴 것은 타당하다** — 리포트 예시대로 하면 화면이 `features/` → `app/` 을 런타임 import 하게 되어 M-2 와 정면 충돌하고, 이전 M-17 문장은 D-M3 위반이 남아 있어야만 성립하는 문장이었다. "변환은 한 곳" 요건은 그대로이고, 개발자가 M-2 에 **"타입 전용 import 도 예외가 아니다"** 를 더해 규칙을 오히려 좁혔다(완화로 위반을 지운 흔적 없음). 규칙 갱신 4건(M-2·M-16·M-17·M-20) 전부 강화 또는 위치 정정으로 판정. 재작업으로 생긴 신규 파일 5건(`tailwind.tokens.js`·`shared/ui/tokens.ts`·`shared/lib/a11y.tsx`·`features/auth/navigation.ts`·`TextField.labelBadge`)도 M-1·M-2·M-3·M-9·M-16·M-19·M-20·M-21 위반 없음 — `tokens.ts`·`a11y.tsx` 는 소비자가 `shared/ui` 와 `App.tsx` 라 M-3 대상이 아니고 기능에 두면 오히려 M-2 역방향이 강제된다. `D-M6`(비차단)은 결정·사유가 `defects.md` 에 기록돼 원 지적("근거가 주석에만 있다")이 해소됐고 ux-designer/사람 앞으로 열린 채 유지 — 차단하지 않는다. 게이트: `make verify-mobile` 통과(린트 0 · `tsc` 0 · 테스트 12건). 규칙 밖 관찰 4건은 리포트 §R6 에 참고로만 남겼다(절대 규칙 2). **다음 역할: mobile-tester** — M-20 이 요구하는 `Platform.OS` 목킹 양방향 낭독 검증을 포함해 달라 |
| 2026-08-27 | server-developer | **재작업 1회차 — `D-3`~`D-6` 전건 수정.** **D-3** `rotate` 3번 분기를 계약 확정대로 고쳤다 — `isWithinGraceWindow` 검사·`statusGuard`·`revoke(LOGOUT)`·새 쌍 발급을 모두 없애고 **회전된 토큰이 캐시 재생에 걸리지 않으면 곧바로 전 기기 폐기 + 401 `AUTH_REFRESH_TOKEN_REUSED`** 다. 유예 창 판정 근거가 둘로 갈라지지 않도록 엔티티의 `RefreshToken.isWithinGraceWindow` 도 삭제했다. **여기서 결함이 하나 더 나왔다** — 지시대로 고친 뒤 실제 서버로 확인하니 401 은 나오는데 폐기가 DB 에 남지 않았다. `revokeAllByUserId` 직후 던지는 `BusinessException` 이 **같은 트랜잭션의 벌크 UPDATE 까지 롤백**하고 있었다(재작업 이전부터 '유예 창 밖 재사용' 경로에 있던 버그다). `ReuseDetectionRevoker`(`REQUIRES_NEW`)로 폐기를 먼저 커밋하게 바꿔 AC-24 가 실제로 성립한다. **D-4** 갱신 조합을 `AuthService.refresh(String)` 로 내리고 `assertCanStillSignIn` 을 private 으로 좁혔다 — 컨트롤러는 한 번 위임하고 `Consumer<User>` 가 사라졌으며 쓰지 않게 된 `RefreshTokenService` 의존성도 제거했다. **D-5** `SignupRateLimiter` 에 왜 DB 가 아닌지(1시간짜리 휘발 집계)와 다중 인스턴스 이전 필요를 클래스·필드 주석으로 남겼다 — 프로세스 메모리 상태 셋이 모두 S-29 요건을 갖췄다. **D-6** 200 설명을 텍스트 블록으로 계약 3줄과 **바이트 단위 일치**시켰다(생성 스펙과 대조 확인). 게이트: `make verify-server` 통과 · `make db-up && make test-server-db` 통과 · `make contract-check` **통과**. 추가로 `make e2e-up` 으로 띄운 실제 서버에서 유예 창 안(캐시 적중/미스)·유예 창 밖·정지 계정 갱신 5개 시나리오를 직접 호출해 확인했다(결과 표는 `defects.md` D-3). 규칙 갱신: `server.md` S-17 에 ①유예 창은 best-effort 이고 판정 근거는 캐시 하나 ②재사용 판정이 계정 상태 확인보다 먼저 ③전 기기 폐기는 별도 트랜잭션에서 커밋 — 세 항목 추가. **리뷰어가 '규칙에 없어 지적하지 않은' 4건은 손대지 않았다** |
| 2026-08-27 | server-reviewer | **재리뷰 PASS — 재작업 1회차 결과.** `review/server-review.md` 에 "재리뷰" 절 추가(1차 FAIL 판정은 이력으로 보존), `defects.md` 신규 결함 **0건**. `D-3`~`D-6` 전건 해소를 코드로 확인 — **D-3** 은 계약의 "구현할 것" **8항을 1:1 대조**해 전부 일치(재사용 폐기+401 단일 분기 / `isWithinGraceWindow` 제거 / `statusGuard`·`LOGOUT` 폐기·새 쌍 발급 없음 / 캐시 적중·스윕·로그아웃 `remove` 불변), 분기 순서가 **재사용 판정 → 계정 상태** 로 서는 것까지 확인했다. `RefreshToken.isWithinGraceWindow` 잔여 참조 **0건**(코드), 남은 언급은 문서의 이력 서술뿐이다. **D-4** 재배치 후에도 S-4·S-5·S-6 이 지켜지고 정지 계정 403(`account_status` 포함) 경로가 유지된다. **D-6** 생성 스펙의 200 `description` 이 계약 블록 스칼라와 **후행 개행까지 동일**함을 산출물에서 직접 확인. **리포트에 없던 `ReuseDetectionRevoker` 추가는 타당하다고 판정** — 고치기 전 코드는 폐기가 롤백되어 S-17 의 "재사용 감지 시 전 리프레시 폐기"가 **실제로는 충족되지 않은 상태**였고, 자기 호출이 프록시를 타지 않아 별도 빈에 둔 것도 옳다. 트랜잭션 경계는 여전히 서비스 계층이며(S-6 취지 유지), 판정 시점에 호출 트랜잭션이 아무것도 쓰지 않아 잠금 충돌도 없다. 성공 경로인 `deleteAccount` 는 손대지 않은 최소 범위다. **S-17 추가 3항목도 전부 타당** — ①②는 계약의 서버 측 이행, ③은 실측 근거·원인·해법·왜 다른 빈인지까지 갖춰 `[MUST]` 로 적절하다. 다만 ③의 일반화 문장이 인증 절 안에 있어 auth 밖에서는 찾기 어렵다 → **두 번째 사례가 나오면 오류 처리 절의 독립 규칙으로 승격**을 `[SHOULD]` 제안(차단 아님). 게이트는 보고를 믿지 않고 **직접 실행**했다: `make verify-server` 통과(Spotless·ArchUnit 포함 단위·Testcontainers 통합) · `make contract-check` **통과**(남은 것은 `info` 뿐). 새로 생긴 `[MUST]` 위반 없음 → **다음은 server-tester** |
| 2026-08-27 | server-tester | **PASS.** auth 통합 테스트 **61건** 신설(Testcontainers + 실제 HTTP): `AuthSignupApiTest` 14 · `AuthLoginApiTest` 16 · `AuthRefreshApiTest` 14 · `AuthAccountApiTest` 14(+`AuthSupportContactUnavailableApiTest` 3, 문의 주소가 빈 별도 컨텍스트). 지원 클래스는 `support/MutableClock` · `support/TestClockConfig`(시각 주입 — 잠금 10분·유예 창 10초·유휴 14일·삭제 토큰 10분을 기다리지 않고 검증). **server-reviewer 가 지목한 필수 2건 통과** — ① 유예 창 안 + 캐시 없음 → 401 `AUTH_REFRESH_TOKEN_REUSED` 이고 **폐기가 DB 에 남아**(전 행 `revoke_reason=REUSE_DETECTED`) 후속 토큰 B 가 401 `AUTH_REFRESH_TOKEN_REVOKED`, ② 그 401 경로에서 행이 늘지 않고 유효 리프레시가 **0개**. `ReuseDetectionRevoker` 의 `REQUIRES_NEW` 가 실제로 커밋된다는 뜻이다. 서버 담당 AC **34건 통과 / 0건 실패**, 나머지 16건은 앱 담당이거나 미커버로 명시(아래 결함 리포트). 결함: 차단 **0건**, 비차단 `D-S1`(앞뒤 공백 이메일이 가입에서 400 — 계약 문장과 어긋남, 구현/계약 중 어느 쪽을 고칠지 요청). **`D-1` 판단: `@WebMvcTest(controllers = ...)` 범위 지정은 의도와 맞다 — 되돌리지 않고 `server.md` **S-30 `[MUST]`**(슬라이스 테스트는 대상을 명시한다)로 승격했다.** 게이트: `make verify-server` 통과(Spotless · `test` 11건 · `integrationTest` 63건), `make test-server-db` 통과. **다음 역할: integration-tester** (모바일 갈래의 mobile-tester 와 독립) |
| 2026-08-27 | integration-tester | **플로우 작성 완료 · 실행 보류(사람 결정).** `e2e/flows/` — `app-launch.yaml`(옛 `health.yaml`. 앱에서 사라진 셀렉터 `다시 확인`·`서버 연결됨` 을 쓰고 있어 반드시 실패하던 상태였다), `auth-01-signup-pending.yaml`(가입 → 서버가 완성한 안내 문구 그대로 렌더 · AC-1·46), `auth-02-login-home.yaml`(승인 계정 로그인 → 홈 → 설정의 `GET /auth/me` · AC-11·35), `auth-03-session-persistence.yaml`(**재시작 후 세션 유지** → 로그아웃 → 재시작해도 유지 안 됨 · AC-20·22·26·27). 시드 `V901__e2e_seed_auth.sql` 신설 — APPROVED 계정 1개(해시는 실제 서버의 `/auth/signup` 이 만든 값) + 동의 이력 3종. V900 은 체크섬 때문에 손대지 않았다. **앱 실행은 못 했지만 서버 왕복은 기계로 확인했다** — `make e2e-up` 후 `curl` 로 시드 적용(Flyway V901 성공)·로그인 200·`/auth/me` 200·`/token/refresh` 200(회전 확인)·`/logout` 204·폐기 후 갱신 401 `AUTH_REFRESH_TOKEN_INVALID`·가입 201(PENDING 문구가 플로우 단언과 일치)까지 확인 후 `make e2e-down` 으로 정리. 결함 `D-E1`(비차단, 로그인 입력란 `testID` 요청). `make test-e2e` 미실행이라 **PASS 를 적지 않았다**(절대 규칙 6) — `ASK` 9 |
| 2026-08-27 | mobile-tester | **FAIL — 차단 결함 1건.** AC 검증 테스트 **136건** 신설(파일 9개). 로그인 27 · 가입 25 · 상태 안내 24 · 계정 삭제 12 · 설정 11 · 약관 뷰어 11 · 스플래시 13 · 무음 갱신 4 · 낭독 8. `D-M4` 요청대로 **양방향 낭독을 검증**했다 — `a11yAnnounceIos`/`a11yAnnounceAndroid` 두 파일로 나눠(`shared/lib/a11y` 가 로드 시점에 경로를 고정하므로 한 파일로는 불가) iOS 는 `announceForAccessibility` 호출, 안드로이드는 **호출 없음 + 라이브 리전** 확인. 잠금은 `Retry-After` 헤더와 본문을 어긋나게 목킹해 **앱이 본문 `lock_remaining_minutes` 만 쓰는 것**을 고정했다. **결함 `D-T1` [High · 차단]** — 갱신 요청 자체가 401 을 받으면 `authFetch` 가 그 응답에 또 갱신을 걸어 `refreshInFlight` 가 자기를 기다리며 **영원히 끝나지 않는다.** 토큰이 지워지지 않고 세션도 끝나지 않아 AC-23·24·25 가 운영 빌드에서 깨진다(스플래시 단독 테스트는 `configureSession()` 을 부르지 않아 통과했다 — 실제 앱은 `App.tsx` 가 부른다). 증거는 `sessionRefresh.test.tsx` 의 `test.failing` 3건이며 고치면 실패로 바뀐다. `D-T2` [Low · 비차단] 잠금 429 에서도 비밀번호를 지우는 동작은 §4.6 이 침묵해 판정 불가 → ux-designer 요청. **못 덮은 AC**: AC-8(저장된 이력) · AC-18 의 Android Keystore 실기기 · AC-23·AC-49 의 유예 창 · AC-31·AC-32 의 실제 재가입 — 전부 server-tester / integration-tester 담당이다. `mobile.md` 테스트 메모 3줄 추가(`fireEvent` 도 비동기 · 한 테스트에서 `render` 2회 금지 · Keychain 초기화는 `clearTokens`). 게이트: `make verify-mobile` 통과(린트 0 · `tsc` 0 · 테스트 **148건**) |
| 2026-09-06 | (머지) | `auth` 전체를 `f5466be` 로 커밋해 `feat/ariel/auth` 에 push. 원격 `develop`(6커밋 앞섬) 흡수 — 충돌 5개 해결, 내비게이터 통합(세션 분기 바깥 / 실제 탭 구조 안쪽), 자리표시자 홈 제거, 계정 설정 진입점을 마이 탭으로 확정(사람 결정). `make verify-mobile` exit 0 · `lint-server` · `test-server` 통과. Docker 게이트 2종과 pen 확인은 미완 |
| 2026-09-06 | (게이트) | `make verify` **exit 0**. `contract-check` 가 develop 이 계약에만 올린 `/api/v1/places/*` 2건 때문에 먼저 실패했고, 원인이 이번 머지와 무관함을 확인한 뒤 `scripts/contract-check.sh` 를 주석의 원래 의도대로 고쳤다(미구현 경로는 정보, 계약에 없는 노출은 실패). 근거를 `common.md` C-5 에 규칙으로 추가 |
| 2026-09-07 | integration-tester | **PASS — `make test-e2e` 4/4 통과.** `앱 기동 확인`(4s) · `가입 신청 → 검토 중 안내`(41s) · `로그인 → 홈`(36s) · `인증 지속 (재시작) → 로그아웃`(47s). 검증 축 3가지 모두 커버 — 왕복 일관성(가입한 이메일이 서버를 거쳐 안내 화면에 그대로, 설정 화면 계정 카드는 `GET /auth/me` 응답), 계약 정합성(안내 문구·이메일·상태가 전부 서버 응답이고 앱에 하드코딩 없음), 인증 지속(재시작 후 세션 유지 → 로그아웃 → 재시작해도 유지 안 됨). **첫 실행은 3개 실패했고 셋 다 앱·서버·계약이 아니라 Maestro 가 요소에 닿는 방법의 문제였다** — ① RN LogBox 알림 배너가 `status-go-login` 버튼 중심을 덮어 탭이 먹힘(개발 빌드 전용 RN 도구다. 앱 Toast 로 오해하기 쉬움), ② iOS "암호를 저장하겠습니까?" 다이얼로그가 그 아래 홈을 접근성 트리에서 지움(매번 뜨지는 않음), ③ 로그아웃 알럿에서 `index: 1` 이 알럿 뒤 설정 행을 누름(Maestro 의 `index` 는 계층 순서가 아니라 화면 y 위치 순서). 셋 다 `e2e/` 안에서만 흡수했다 — `runFlow: when:` 으로 배너를 있을 때만 닫고, `optional: true` 로 다이얼로그를 있을 때만 닫고, index 대신 `rightOf: text: '취소'` 로 알럿 구조를 짚는다. 좌표는 실패 스크린샷의 픽셀을 읽어 확정했고, LogBox 닫기 경로는 디버거로 경고를 주입해 배너를 띄운 뒤 실제로 검증했다. **앱·서버로 돌릴 신규 결함 0건**, 비차단 요청 1건(`D-E1` 후속 — 로그아웃 알럿 버튼용 `testID`). 관찰 1건: 배너를 띄우는 JS 경고는 "Sending `onAnimatedValueUpdate` with no listeners registered." 하나뿐이고 스플래시 펄스 애니메이션에서 나오는 RN 자체의 알려진 경고다(정보성). 재작업 루프 1회로 종료. 기록: `defects.md` D-E2 "후속 (2026-09-07)" |
| 2026-09-07 | (연계 결정) | `admin-user-approval` 에서 **이용 정지 시 사유를 받지 않기로 확정**(사람 결정)되어, `design.md` §14 의 미해소 항목 6(`SUSPENDED` 정지 사유·기간 표시)이 해소됐다. 내릴 값 자체가 존재하지 않으므로 §7.4 현행 유지 · `AccountStatusView` 변경 없음 · `auth` 측 화면·계약 변경 없음. 반영은 `design.md` §14 에 되어 있다 |
