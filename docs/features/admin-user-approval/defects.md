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
