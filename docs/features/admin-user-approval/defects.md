# 결함 · 요청 리포트: `admin-user-approval`

역할끼리 직접 고치지 않고 여기에 남긴다. 소유가 아닌 경로를 건드려야 할 때도 여기에 적는다.
해소된 항목은 지우지 않고 상태만 바꾼다 — 왜 그렇게 됐는지가 다음 사람에게 필요하다.
형식은 `.agents/templates/defect.md` 를 따른다. **`[MUST]` 위반만 결함으로 올린다.**

---

## 2026-09-09 · server-reviewer — `[MUST]` 결함 **없음**

서버 구현(워킹트리의 `server/` 변경분 전체)을 `docs/conventions/server.md`(S-32·S-33·S-34 포함) ·
`docs/conventions/common.md` · `contract.yaml` · `PRD.md`(AC 34) · `status.md` 결정 기록 ·
`docs/api/error-codes.md` 로 대조했고 **차단할 위반을 찾지 못했다 — 판정 PASS.**

- 이관할 결함이 없어 `DEF-*` 항목을 만들지 않았다. 이 문단이 "리뷰가 있었고 결함이 0건이었다"
  는 기록이다 (재작업 카운터는 그대로 0).
- 차단하지 않는 `[SHOULD]` 3건과 규칙 근거가 없는 참고 5건은
  `docs/features/admin-user-approval/review/server.md` 에 있다. **결함이 아니므로 여기 옮기지 않는다.**
- 리뷰어가 직접 실행한 게이트: `make lint-server` 통과 / `make test-server` 통과 /
  `make contract-check` 통과(ERR 0, admin 관련 warning·info 0건).

### 다른 역할에 넘기는 요청 (결함 아님)

| # | 무엇 | 받는 역할 | 상태 |
|---|---|---|---|
| R-1 | `errors[].code` 로 쓰이는 `RANGE`(`AdminUserService.java:313`)와 이미 쓰이고 있는 `ASSERT_TRUE`(`AuthService.java:169`)가 `docs/api/error-codes.md` 의 "검증 실패 세부 코드" 표에 없다. 표는 규칙("Bean Validation 제약 이름")의 예시라 위반으로 보지 않았으나, 표에 올려 두면 다음 리뷰에서 같은 판단을 반복하지 않는다 | tech-lead (`docs/api/` 소유) | 열림 |
| R-2 | S-31("외부 API 키는 `RequiredEnvironmentCheck` 에 등록")과 S-28·AC-29(`DISCORD_WEBHOOK_URL` 은 등록하지 않는다)가 문면상 충돌한다. 계약이 이미 판정해 두었으므로 구현은 옳다(절대 규칙 1). 다음 외부 API 에서 같은 질문이 반복되지 않도록 S-31 에 예외 한 줄을 넣기를 제안한다 | tech-lead / 다음 서버 구현자 (`docs/conventions/`) | 열림 |

---

## 2026-09-09 · server-tester — 결함 **없음**

`PRD.md` 의 AC 34개를 판정 기준으로 통합 테스트 **8클래스 · 75건**을 작성해 실행했고,
**구현이 계약·AC 와 어긋난 지점을 찾지 못했다 — 판정 PASS.** 판정표는
`status.md` 의 `서버 AC 판정표` 에 있다 (통과 29 / 해당없음(모바일) 3 / 미검증 2).

- 이관할 결함이 없어 `DEF-*` 항목을 만들지 않았다. 이 문단이 "테스트가 있었고 실패가 0건이었다"
  는 기록이다 (재작업 카운터는 그대로 0).
- 실행한 게이트: `make test-server-db` 통과(전체 150건 · 실패 0, 그중 admin 75건) /
  `make lint-server` 통과.
- `server/src/main` 은 건드리지 않았다. `auth` 쪽에서 바꾼 것은 `AuthApiTestBase` 를
  `public` 으로 연 것 하나뿐이다 — 관리자 테스트가 계정을 만드는 경로를 물려받기 위해서다.
  픽스처를 두 벌로 두면 두 테스트가 서로 다른 사실을 검증하게 된다.

### 결함은 아니지만 다음 사람이 알아야 할 것

| # | 무엇 | 받는 역할 | 상태 |
|---|---|---|---|
| N-1 | **AC-26 · AC-28 은 이 계층에서 검증할 수 없다.** 실제 Discord 채널 발송과 그 실패 로그가 대상인데, 외부 연동은 목킹한다는 계층 규칙(절대 규칙 5)에 걸린다. `AdminDiscordNotificationApiTest` 가 WireMock 으로 **보내려는 내용**만 고정했다(AC-27·30·31·32). 실제 발송 확인은 `DISCORD_WEBHOOK_URL` 이 발급된 뒤 사람이 `make webhook-check` 로 한다 | 사람 (ASK 1) | 열림 |
| N-2 | **테스트가 실제 Discord 채널로 발송하던 배선 결함은 이미 고쳐졌다** (커밋 `8837042`). `Makefile` 이 `.env` 의 모든 키를 export 하는데 `server/build.gradle` 의 테스트 환경 주입 목록에 `DISCORD_WEBHOOK_URL` 이 없어, 사람이 채운 진짜 URL 이 테스트 JVM 까지 흘러갔다. 지금은 모든 `Test` 태스크에서 빈 값으로 고정한다. **그 줄을 지우거나 우회하지 않는다** — 지우면 다음 테스트 실행이 다시 운영 채널로 나간다 | 서버 작업자 전원 | 조치됨 |
| N-3 | 커밋 `ffae960` 의 DB 환경 변수 프로필 분리(`PRD_DB_*` ↔ `DB_*`)는 **테스트 컨텍스트를 깨지 않았다.** 테스트는 프로필을 활성화하지 않아 `RequiredEnvironmentCheck` 가 `DB_*` 를 요구하고, 그 값은 `build.gradle` 이 주입한 뒤 Testcontainers 가 런타임에 덮어쓴다. 통합 테스트 150건 전부 통과로 확인했다 | (정보 공유) | 확인됨 |

---

## 2026-09-09 · mobile-reviewer — `[MUST]` 결함 **2건** (판정 FAIL)

워킹트리의 `mobile/` 변경분 전체(신규 23파일 + 수정 7파일)를 `docs/conventions/mobile.md`
(M-23·M-24 포함) · `docs/conventions/common.md` · `design.md` · `contract.yaml` ·
`status.md` 결정 기록 · `docs/api/error-codes.md`(admin)로 대조했다.
리뷰어가 실행한 게이트: `make lint-mobile` 통과 / `npx tsc --noEmit` 통과.
차단하지 않는 제안 4건과 다른 역할에 넘기는 요청 3건은
`docs/features/admin-user-approval/review/mobile.md` 에 있다 — **결함이 아니므로 여기 옮기지 않는다.**

### DEF-M01 [High] 거절 사유 입력 단계에서 §6.8 "이미 처리됨" 상태가 절반만 구현됐다
- 상태: **해결 확인 (2026-09-09, mobile-reviewer 재리뷰 PASS)** — 조치는 아래 `조치` 절,
  검증 근거는 `review/mobile.md` 의 `재리뷰` 절
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `mobile/src/features/admin-user-approval/components/PendingUserSheet.tsx:170-231`
  (액션 영역 `209-229`)
- 근거: `conventions/mobile.md` M-6(오류 상태 구현 — 이 시트의 오류 상태는 `design.md` §6.9 가
  §6.7·§6.8 둘로 정의한다) / `design.md` §6.8 "승인·거절 버튼을 제거한다. 남겨 두면 다시 눌러
  같은 오류를 받는다" / PRD AC-12
- 재현:
  1. `검토 대기` 목록에서 행을 탭해 신청 상세 시트를 연다
  2. "거절" 을 눌러 거절 사유 입력 단계로 들어간다
  3. 그 사이 다른 기기가 같은 신청을 처리한 상태에서 "거절하기" 를 누른다
     (409 `ADMIN_USER_ALREADY_PROCESSED`)
- 기대: 단계와 무관하게 액션 영역이 `Button/Secondary "닫기"` 하나로 교체된다.
  정보 블록·대상 이메일은 남는다 (§6.8)
- 실제: "이미 처리된 신청이에요" 배너만 뜨고 "거절하기"·"뒤로" 가 활성인 채로 남아,
  다시 누르면 같은 409 를 받는다. `conflict` 분기가 기본 단계(`138-143`)에만 있다
- 참고: `ProcessedUserSheet.tsx:115` 의 `blocked` 가 같은 요구를 올바르게 구현했다.
  **409 는 승인보다 거절에서 더 자주 나오므로 결함이 있는 쪽이 주 경로다**

### DEF-M02 [High] 사유 주석 없는 타입 단언 4곳
- 상태: **해결 확인 (2026-09-09, mobile-reviewer 재리뷰 PASS)** — 조치는 아래 `조치` 절,
  검증 근거는 `review/mobile.md` 의 `재리뷰` 절
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `components/PendingUserSheet.tsx:99` · `components/ProcessedUserSheet.tsx:103` ·
  `hooks/useUserApproval.ts:50` · `hooks/useUserApproval.ts:60`
  (모두 `mobile/src/features/admin-user-approval/` 아래)
- 근거: `conventions/mobile.md` M-9 — "`any`, 근거 없는 `as` 를 쓰지 않는다.
  불가피하면 사유 주석을 단다"
- 기대:
  - `errorKind as Exclude<ActionErrorKind, 'forbidden'>` 2곳은 **단언 자체가 불필요하다.**
    `run()` 이 `kind === 'forbidden'` 을 이른 반환으로 이미 걸러내므로, 상태 타입을
    `useState<Exclude<ActionErrorKind, 'forbidden'> | null>` 로 좁히면 TypeScript 가
    narrowing 으로 통과시킨다 → `as` 삭제
  - `initialPageParam: undefined as string | undefined` 2곳은 react-query 의 `pageParam`
    추론을 넓히는 관용구라 불가피하다 → **사유 주석**을 단다
    (같은 저장소 `shared/lib/a11y.tsx:56-57` 이 그 형식의 선례다)
- 실제: 네 곳 모두 단언만 있고 사유 주석이 없다

---

## 2026-09-09 · mobile-developer — 재작업 1회차 조치 (DEF-M01 · DEF-M02)

기존 항목은 지우지 않고 상태만 바꿨다. 아래는 무엇을 어떻게 고쳤는지의 기록이다.
**두 결함 외에는 아무것도 바꾸지 않았다** — 리뷰어가 나머지를 전부 통과로 판정했고
"다른 곳을 함께 바꾸지 않기를 권한다" 고 적었다 (`review/mobile.md`).

### DEF-M01 조치 — 경합 액션 교체를 두 단계 모두에 건다

- 파일: `mobile/src/features/admin-user-approval/components/PendingUserSheet.tsx`
- 경합 뒤의 액션 영역을 `closeAction` 이라는 하나의 값으로 뽑고, **기본 단계(`step === 'detail'`)와
  거절 사유 입력 단계(`step === 'reject'`) 두 분기 모두**에서 `conflict ? closeAction : (…)` 로 쓴다.
- 이제 409 `ADMIN_USER_ALREADY_PROCESSED` 뒤에는 단계와 무관하게 액션이
  `Button/Secondary "닫기"` 하나뿐이다. 거절 단계의 `거절하기`·`뒤로` 가 사라지므로
  같은 409 를 다시 받을 경로가 없다 (§6.8 / AC-12).
- **남긴 것**: 정보 블록·대상 이메일·입력한 거절 사유. §6.8 이 "어떤 신청이었는지 확인할 수 있어야 한다"
  고 요구한다. 배너에 "다시 시도" 를 붙이지 않는 처리도 그대로다.
- 형태는 `ProcessedUserSheet.tsx` 의 `blocked` 와 같게 맞췄다 — 두 시트가 같은 요구를 같은 모양으로 푼다.
- 재리뷰·테스트가 잡을 수 있도록 닫기 버튼에 `testID="admin-conflict-close"` 를 달았다.

### DEF-M02 조치 — 2곳은 단언 삭제, 2곳은 사유 주석

| 위치 | 조치 |
|---|---|
| `components/PendingUserSheet.tsx` · `components/ProcessedUserSheet.tsx` | **단언 삭제.** 상태 타입을 `useState<Exclude<ActionErrorKind, 'forbidden'> \| null>` 로 좁혔다. `run()` 이 `kind === 'forbidden'` 을 이른 반환으로 걸러 주므로 `setErrorKind(kind)` 가 단언 없이 통과한다. 배너에 넘기는 값은 `bannerKind` 지역 변수(`conflict ? 'conflict' : errorKind`)로 뽑아 `as` 없이 타입이 맞는다 |
| `hooks/useUserApproval.ts` 2곳 | **사유 주석.** `initialPageParam: undefined as string \| undefined` 는 react-query 가 `pageParam` 을 `undefined` 로만 추론해 `getNextPageParam` 의 커서 문자열과 어긋나는 것을 막는 관용구다. 넓힐 다른 수단이 없어 남기고, `shared/lib/a11y.tsx:56` 선례 형식으로 M-9 를 인용한 주석을 달았다 |

기능 디렉토리에 남은 `as` 는 이 두 줄뿐이다 (`grep` 확인).

### 실행한 게이트

| 게이트 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 — 타입 좁히기가 실제로 컴파일된다 |
| `make lint-mobile` | 통과 |
| `make test-mobile` | 통과 (16 suites · 151 tests · 실패 0) |

`mobile/src` 밖은 손대지 않았다 — `server/` 무수정, `docs/design/planbee.pen` 무수정.
재작업 카운터는 mobile-reviewer 가 이미 1로 올려 두어 그대로 둔다.

---

## 2026-09-09 · mobile-reviewer — 재리뷰 (재작업 1회차 검증) · **판정 PASS**

`DEF-M01` · `DEF-M02` 의 해소를 **코드로 직접 확인했다.** 새로 올릴 `[MUST]` 결함은 없다.
검증 상세는 `docs/features/admin-user-approval/review/mobile.md` 의 `재리뷰` 절에 있다.

| 결함 | 판정 | 확인한 것 |
|---|---|---|
| DEF-M01 | **해소** | `PendingUserSheet.tsx` 의 `closeAction`(`117-126`)이 **기본 단계(`160`)와 거절 사유 입력 단계(`228`) 두 분기 모두**에서 `conflict ? closeAction : (…)` 로 쓰인다. 경합 뒤 거절 단계의 `거절하기`·`뒤로` 는 비활성이 아니라 **JSX 에서 제거**된다. `run()` 재호출 경로를 전수 확인했다 — 액션 버튼(제거) · 배너 "다시 시도"(`onRetry` 가 `undefined`) · 안드로이드 백(`setStep('detail')` 로 가도 그쪽 역시 `closeAction`)로 **같은 409 로 돌아갈 길이 없다.** §6.8 이 남기라고 한 정보 블록·대상 이메일·입력한 사유는 남아 있다 |
| DEF-M02 | **해소** | 단언 2곳이 실제로 사라졌다 — 상태 타입이 `useState<Exclude<ActionErrorKind, 'forbidden'> \| null>`(`PendingUserSheet.tsx:45` · `ProcessedUserSheet.tsx:39`)이고 배너 인자는 `bannerKind` **타입 주석**(단언 아님)이다. `npx tsc --noEmit` 통과가 이 좁히기를 컴파일러가 인정함을 보인다. 남긴 2곳(`useUserApproval.ts:50-53·63-64`)에는 "왜 불가피한지 + `(M-9)` 인용" 주석이 붙어 `a11y.tsx:56` 선례와 같은 형식이다. **기능 디렉토리 전수 grep — 남은 단언은 그 두 줄뿐이고 나머지는 전부 `as const`·import 별칭. `any` 0건** |

- **회귀 없음.** 재작업이 건드린 파일은 3개뿐이고(`PendingUserSheet` · `ProcessedUserSheet` ·
  `useUserApproval`), 1차 통과 항목의 근거 파일 대부분은 수정되지 않았다.
  `code` 기반 분기 · 403 → §5.10 · §9 문구 · 4가지 상태 × 세그먼트 · M-24 쿼리 키 ·
  플랫폼 분기를 다시 읽어 확인했다.
- **1차의 "결함 아님" 4건도 되돌리지 않았다** — 403 → §5.10 / `NOT_FOUND` → M-13 일반 오류 /
  미구현 연출 2건 / 배지 패딩 pen(`[3,10]`) 채택. 근거 파일(`actionError.ts` · `StatusBadge.tsx` ·
  `UserApprovalListScreen.tsx`)이 전부 무수정이다.
- 리뷰어가 직접 실행한 게이트: `make lint-mobile` **통과**(exit 0) / `npx tsc --noEmit` **통과**(exit 0) /
  회귀 확인용 `make test-mobile` **통과**(16 suites · 151 tests · 실패 0).
- **재작업 카운터는 mobile-developer 1 그대로다** (PASS 이므로 올리지 않는다. 상한 2회).
- `mobile/` 은 읽기만 했다 — 리뷰어는 코드를 고치지 않는다.

### 다른 역할에 넘기는 요청 (결함 아님)

| # | 무엇 | 받는 역할 | 상태 |
|---|---|---|---|
| R-M4 | **§6.8 경합 상태가 두 단계 모두에서 액션을 없애는지**를 테스트로 고정해 주세요. 이번 재작업의 회귀 지점이 정확히 여기라, 기본 단계만 검증하면 1차 결함이 되살아나도 잡히지 않습니다. msw 로 409 `ADMIN_USER_ALREADY_PROCESSED` 를 내리고 ⑴ 기본 단계 ⑵ 거절 사유 입력 단계에서 각각 액션이 `닫기` 하나만 남는지, ⑶ 안드로이드 백으로 기본 단계에 돌아가도 액션이 살아나지 않는지 | mobile-tester | 열림 |

1차 리포트의 R-M1(md 배지 패딩 정정) · R-M2(§5.11·§6.6 연출 명세 정리) · R-M3(M-20 양쪽 분기 테스트)은
**그대로 열려 있다.** 셋 다 결함이 아니라 요청이므로 이번 PASS 판정을 막지 않는다.

---

## 2026-09-09 · mobile-tester — `[MUST]` 결함 **1건** (판정 FAIL)

`PRD.md` 의 AC 34개 중 **앱 화면 책임 22개**(design.md §11 대조표 기준)를 판정 기준으로
모바일 테스트 **8스위트 · 72건**을 추가해 실행했다. API 는 전부 msw 목킹이고 서버를 띄우지 않았다
(절대 규칙 5 / M-11). 목 응답은 `contract.yaml` 의 example 을 근거로 만들었다.

- 실행한 게이트: `make lint-mobile` **통과**(exit 0) / `npm --prefix mobile run typecheck` **통과**(exit 0) /
  `make test-mobile` **통과**(exit 0 — 24 suites · 223 tests · 실패 0).
  기존 16 suites · 151 tests 에서 **+8 suites · +72 tests**. 기존 테스트 회귀 0건.
- `mobile/src` 구현 코드는 건드리지 않았다. 새로 만든 것은 `mobile/src/features/admin-user-approval/__tests__/` 8파일뿐이다.
- **판정 FAIL** — 아래 `DEF-T01` 하나 때문이다. 나머지 21개 AC 는 전부 통과했다.
  판정표는 `status.md` 의 `모바일 AC 판정표` 에 있다.
- 재작업 카운터: mobile-developer **1 → 2** (상한 2회. 다음 왕복은 3회차라 `ESCALATE` 다 — 절대 규칙 4).

### DEF-T01 [High] 목록을 이미 받아 놓고도 **뒤이은 요청이 실패하면 화면 전체가 오류 블록으로 바뀐다**

- 올린 역할: mobile-tester (2026-09-09)
- 받는 역할: mobile-developer
- 상태: **열림 (차단)**
- 위치: `mobile/src/features/admin-user-approval/screens/UserApprovalListScreen.tsx:265-289`
  (본문 영역을 고르는 `active.isError` 분기)
- 근거: PRD **AC-7 · AC-9** / `design.md` §5.5 · §5.6 · §5.12
- 증거: `mobile/src/features/admin-user-approval/__tests__/pendingList.test.tsx` 의 `test.failing` 2건
  - `AC7_다음_페이지_로드에_실패하면_이미_불러온_항목은_남고_다시_시도로_이어붙인다`
  - `AC9_새로고침에_실패해도_보고_있던_목록은_남는다`

#### 무슨 일이

화면은 본문을 `권한없음 → isPending → isError → 목록` 순으로 고른다. 그런데 react-query 5 의
무한 쿼리는 **이미 받아 둔 데이터가 있어도** 뒤이은 요청(`fetchNextPage`, 새로고침 `refetch`)이
실패하면 쿼리 상태를 `error` 로 만든다(데이터는 그대로 남긴다). 그래서 `active.isError` 하나로
본문을 §5.9 오류 블록으로 갈아 끼우면 **첫 로드 실패가 아닌 경우까지 목록이 통째로 사라진다.**

| 상황 | `design.md` 가 요구하는 것 | 실제 |
|---|---|---|
| 다음 페이지 로드 실패 (AC-7 / §5.6) | **"이미 불러온 항목은 그대로 남는다"** + 푸터 "더 불러오지 못했어요" + "다시 시도" | 목록 전체가 사라지고 "명단을 불러오지 못했어요" 화면. **§5.6 의 실패 푸터에는 도달할 수 없다** — `ListFooter.tsx:44` 의 `failed` 분기가 사실상 죽은 코드다 |
| 당겨서 새로고침 실패 (AC-9 / §5.5) | **"기존 목록을 유지"** 하고 상단 배너만 — "목록을 오류 화면으로 대체하지 않는다. 이미 보고 있던 내용을 실패가 지우면 안 된다" | 배너는 뜨지만 목록이 사라지고 그 자리를 오류 블록이 덮는다. 배너와 전체 오류가 **동시에** 뜨고 "잠시 후 다시 시도해 주세요." 가 화면에 두 번 나온다 |

관리자에게는 이렇게 보인다 — 20건을 훑다가 스크롤 끝에서 네트워크가 한 번 흔들리면
**보고 있던 목록이 사라진다.** 되돌리려면 "다시 시도" 로 첫 페이지부터 다시 받아야 하고,
그때 스크롤 위치도 잃는다. AC-14 가 "실패해도 항목은 남는다" 를 요구한 것과 같은 성격의 요구가
목록 쪽(§5.5 · §5.6)에서 깨진 것이다.

#### 왜 리뷰에서 안 걸렸나

코드만 읽으면 `isFetchNextPageError` 를 푸터에 넘기고 `refreshFailed` 배너도 따로 두고 있어
**구현된 것처럼 보인다.** 두 처리가 실제로는 그 위의 `isError` 분기에 가려 화면에 나타나지
못한다는 사실은 실행해야 드러난다. 1차 리뷰의 `S-2`(새로고침 실패 시 유지 범위)가 같은 자리를
스치고 지나갔지만, 원인은 페이지 트리밍이 아니라 이 분기다.

#### 제안 (판단은 mobile-developer 몫)

전체 오류 블록의 조건을 **"받아 둔 데이터가 없을 때"** 로 좁힌다 — 예: `active.isError && pages.length === 0`.
그러면 첫 로드 실패는 지금처럼 §5.9 블록으로, 추가 페이지 실패는 §5.6 푸터로, 새로고침 실패는
§5.5 배너로 각각 제자리를 찾는다. 문구·계약·컴포넌트를 바꿀 필요는 없다.

고치면 위 `test.failing` 2건이 **통과로 바뀌면서 실패한다** — 그때 `test.failing` 을 `test` 로
되돌리는 것까지가 이 결함의 완료 조건이다 (`auth` `defects.md` D-T1 과 같은 방식).

### 결함은 아니지만 다음 사람이 알아야 할 것

| # | 무엇 | 상태 |
|---|---|---|
| N-1 | **`RefreshControl` 의 색 prop 은 테스트로 읽을 수 없다.** RNTL 14 가 `UNSAFE_getByType` 을 없앴고, jest 의 `ScrollView` 는 `refreshControl` 을 호스트 트리에 그리지 않는다. 게다가 그 자리는 애초에 분기가 아니다 — 화면이 `tintColor`·`colors`·`progressBackgroundColor` 를 **함께** 넘기고 각 플랫폼이 자기 것만 본다. 그래서 R-M3 의 이 항목은 **동작**(당기면 다시 불러온다)으로 양쪽 플랫폼에서 확인했다 | 확인됨 |
| N-2 | **"처리 중에는 하드웨어 백이 아무 일도 하지 않는다"(§2.4)의 중간 상태는 RNTL 로 관찰할 수 없다.** `fireEvent` 가 감싸는 `act` 가 진행 중인 msw 요청까지 끝내 버려서, 백을 누른 시점에는 이미 처리가 끝나 있다. 대신 ⑴ 결과(처리가 취소되지 않고 요청이 한 번만 나간다)를 안드로이드 파일에서, ⑵ "처리 중 시트가 닫히지 않는다" 를 스크림 경로(`pendingSheet.test.tsx`)에서 고정했다 — 스크림은 처리 중 비활성이라 이벤트 자체가 나가지 않는다 | 확인됨 |
| N-3 | 시트의 **스크림은 jest 에서 접근성상 "숨은 요소"** 다. `Animated` opacity 를 `useNativeDriver: true` 로 올려 JS 쪽 값이 0에 머물고, RNTL 은 `opacity: 0` 인 요소를 기본 쿼리에서 제외한다. 실기기에서는 보이는 요소이므로 테스트에서만 `includeHiddenElements` 로 집는다 | 확인됨 |
| N-4 | 시각 표기를 검증하는 4개 파일은 `process.env.TZ = 'Asia/Seoul'` 로 **시간대를 고정**한다. 앱이 UTC → 로컬로 바꿔 그리므로(§3.3) 고정하지 않으면 CI 의 시간대에 따라 결과가 흔들린다. `@types/node` 가 없어 `declare const process` 를 파일마다 최소한으로 선언했다 | 확인됨 |
| N-5 | 테스트 파일은 `mobile/src/features/admin-user-approval/__tests__/` 에 두었다 — 역할 정의가 허용하는 두 위치 중 하나이고(`.agents/roles/mobile-tester.md`), `auth`·`nearby-places` 를 포함한 저장소의 기존 기능 테스트 13스위트가 전부 그 자리에 있다. `mobile/__tests__/` 에는 앱 전체 스모크(`App.test.tsx`)만 있다 | 확인됨 |

### mobile-reviewer 가 넘긴 요청 — 처리 결과

| # | 요청 | 결과 |
|---|---|---|
| R-M3 | M-20 양쪽 분기 테스트 | **완료.** `platformIos.test.tsx`(5건) · `platformAndroid.test.tsx`(7건). 키보드 회피 `padding`↔`height`, 시트 열림 시 스와이프 백(iOS 끔 / 안드로이드 `default`), `Alert` 취소 우선 배치(양쪽), 하드웨어 백 3가지(§2.4)를 덮었다. `RefreshControl` 색 prop 은 N-1 참조 |
| R-M4 | §6.8 경합을 **두 단계 모두** 고정 | **완료.** `conflict.test.tsx` 5건 — ⑴ 기본 단계 ⑵ 거절 사유 입력 단계 ⑶ 안드로이드 백으로 되돌아간 기본 단계에서 각각 `승인`·`거절`·`거절하기`·`뒤로` 가 **JSX 에서 사라지고** `닫기`(`admin-conflict-close`) 하나만 남는지, 배너에 "다시 시도" 가 붙지 않는지, 즉시 목록을 다시 부르는지. `ProcessedUserSheet` 의 409 도 같은 형태로 확인했다 |
| R-M1 · R-M2 | md 배지 패딩 정정 · 연출 명세 정리 | **이 단계의 대상이 아니다** (ux-designer / 사람). 그대로 열려 있다 |

### DEF-T01 재현 절차와 확인 범위 (절대 규칙 4 — 2회차 보고 형식)

재작업 2회차에 해당하므로 같은 검증을 다시 돌리지 않고 원인까지 짚어 넘긴다.

**재현 절차 (둘 다 msw 만 쓴다. 서버 불필요)**

1. `GET /api/v1/admin/users/pending` 이 `has_next: true` · `next_cursor: "C1"` 로 1페이지를 내린다.
2. 목록 끝에 닿아 다음 페이지를 부른다 (`fireEvent(list, 'endReached')`).
3. 그 두 번째 요청만 500 `INTERNAL_ERROR` 를 낸다.
4. → **1페이지 항목이 사라지고** "명단을 불러오지 못했어요" 블록이 본문을 덮는다.
   푸터 "더 불러오지 못했어요" 는 나타나지 않는다.

같은 방식으로 3단계를 "당겨서 새로고침(`fireEvent(list, 'refresh')`)" 으로 바꾸면
"새로 고치지 못했어요" 배너 **와 함께** 같은 오류 블록이 뜨고 목록이 사라진다.

**오류 원문** — 화면에 뜨는 것은 오류 문구가 아니라 정상 렌더다. 콘솔 예외도 없다.
관측된 상태는 아래 네 값이다 (재현 시 화면 쿼리 결과).

| 상황 | `명단을 불러오지 못했어요` | `새로 고치지 못했어요` | `더 불러오지 못했어요` | 1페이지 항목 |
|---|---|---|---|---|
| 새로고침 실패 | 있음 | 있음 | 없음 | **없음** |
| 다음 페이지 실패 | 있음 | 없음 | 없음 | **없음** |

**확인한 사실**

- 원인은 `UserApprovalListScreen.tsx` 의 본문 선택 분기 하나다 — `active.isError` 가 참이면
  `pages` 에 데이터가 있어도 §5.9 블록을 그린다.
- react-query 5 의 무한 쿼리는 **데이터를 유지한 채 상태만 `error`** 로 만든다. 그래서
  `isFetchNextPageError`(푸터)와 `refreshFailed`(배너)는 값이 맞게 계산되지만 화면에
  도달하지 못한다. 두 표시 코드 자체는 정상이다.
- `ListFooter` · `Banner` · `EmptyState` · `useUserApproval` 은 이 증상과 무관하다 —
  분기 순서만 바뀌면 그대로 동작한다.
- 첫 로드 실패(AC-8)는 정상이다. 그때는 `pages` 가 비어 있어 같은 분기가 옳게 동작한다.

**확인하지 못한 것 (다음 사람이 판단할 것)**

- 고칠 조건을 `pages.length === 0` 으로 할지, `active.isError && !active.data` 로 할지,
  아니면 `isRefetchError`·`isFetchNextPageError` 를 빼서 만든 별도 파생값으로 할지는
  **정하지 않았다.** 셋 다 이 증상을 없애지만 화면 소유자의 선택이다.
- `처리 완료` 세그먼트에서도 같은 원인이 성립하는지는 **테스트로 고정하지 않았다.**
  코드가 두 세그먼트를 같은 분기로 그리므로 같을 것으로 보지만, 관측한 것은 `검토 대기` 쪽뿐이다.
- 실기기에서의 스크롤 위치 보존 여부는 이 계층에서 볼 수 없다 (integration-tester 몫).
