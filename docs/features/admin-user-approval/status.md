# 상태: admin-user-approval

- 기능 슬러그: `admin-user-approval`
- 시작일: 2026-08-23
- 현재 단계: `서버 트랙 종료 (2026-09-09) / 모바일 재작업 2회차 진행 중 — 긴급 렌더 크래시 DEF-C01 수정 완료(2026-09-09), DEF-T01 미착수`

## 선행 조건

`auth` 가 정의하는 계정 상태(`PENDING`/`APPROVED`/`REJECTED`/`SUSPENDED`)와
역할(`USER`/`ADMIN`) 위에서 동작한다. `auth` 의 contract.yaml 이 확정된 뒤 시작한다.

**충족됨 (2026-08-26).** `auth` 계약이 확정되어 상태·역할 enum 과 오류 형식이 고정되었다
(`docs/features/auth/contract.yaml` — `AccountStatusView.status`, `UserSummary.role`).

계약 확정으로 이 기능에 함께 정해진 것:

- **PRD 열린 질문 4(정지의 세션 반영 시점)** — `POST /api/v1/auth/token/refresh` 가 갱신 시점에
  계정 상태를 다시 확인해 `APPROVED` 가 아니면 403 + `account_status` 를 낸다. 따라서 정지는
  **액세스 토큰 수명(30분) 안에** 반영된다. "최대 30분 지연 허용" 이 계약으로 확정된 셈이다.
  → **2026-09-07 종결.** 매 요청 상태 확인을 도입하지 않고 현행을 유지한다. 정지가 리프레시
  토큰을 폐기하지도 않는다. 근거는 `결정 기록` 표와
  `contract.yaml` 의 `POST /api/v1/admin/users/{user_id}/suspend` 설명에 있다.
- **PRD 열린 질문 5(오류 코드)** — 관리자 엔드포인트의 코드는 이 기능의 계약에서 등록한다.
  `docs/api/error-codes.md` 의 auth 섹션과 같은 형식을 따른다.
  → **2026-09-07 종결.** `admin` 섹션에 신규 3개 등록. `결정 기록` 표 참조.
- **`SUSPENDED` 정지 사유 표시** — 내리기로 정하면 `auth` 계약 변경 없이 서버가
  `AccountStatusView.body` 문구만 바꾸면 된다. 앱은 문구를 조합하지 않기 때문이다 (C-8).
- **`SUSPENDED` 는 앱 안 계정 삭제 경로가 없다** — `auth` 는 `REJECTED` 에만 삭제 토큰을 내린다.
  ~~ASK 2 의 "관리자가 앱 안에서 계정을 지울 수단" 은 여전히 이 기능의 몫이다.~~
  → **2026-09-07 종결.** 이 기능은 앱 안 삭제 수단을 만들지 않는다. 파기 요청은 `auth` AC-38 의
  문의 연락처로 받아 DB 에서 직접 처리한다 (`결정 기록` 표).

## 파이프라인

- [x] product-manager — PRD.md
- [x] ux-designer — **완료 (2026-09-07).** 1단계 `design.md` ✅ / 2단계 `docs/design/planbee.pen` ✅
  - `design.md` — 화면 18개(`Screen 17a`~`Screen 21d`) 정의, 문구 확정, AC 대조표 작성.
    **열린 질문 3건은 모두 답을 받아 반영했다 — 명세를 막는 미확정 항목 없음**
  - `planbee.pen` — 아트보드 **18개** + Design System 섹션 `Section — Admin List & Sheet` 추가.
    **신규 컴포넌트 5개 / 신규 색 토큰 0개.** 기존 70개 프레임은 수정·이동하지 않았다.
    시각화 중 **번호 충돌을 발견해 `Screen 16` → `Screen 17` 로 전체를 +1 이동**했다
    (`Screen 16a`~`16e` 를 `nearby-places` 가 이미 쓰고 있었다 — `design.md` §2.1 주석).
- [x] tech-lead — **완료 (2026-09-07).** `contract.yaml` 확정 + `docs/api/openapi.yaml` 병합
      + `docs/api/error-codes.md` `admin` 섹션 등록 + `.env.example` 에 `DISCORD_WEBHOOK_URL` 정의 추가
  - 엔드포인트 **6개** — 목록 2 / 상태 전이 4 + 기존 `GET /api/v1/auth/me` 확장 1
  - 오류 코드 **3개 신규** (`ADMIN_FORBIDDEN` · `ADMIN_SELF_SUSPEND_FORBIDDEN` ·
    `ADMIN_USER_ALREADY_PROCESSED`) + 공통 코드 재사용 4건
  - **PRD 열린 질문 4·5 종결** (아래 `결정 기록`)
  - AC 34개 전부 계약·구현·앱·`auth` 중 하나에 배정 — 미커버 0
  - ⚠ `make contract-check` **미실행** — 아래 `미해결 / 에스컬레이션` ASK 6 참조
- [x] server-developer — **완료 (2026-09-09).** 엔드포인트 6개 + `GET /api/v1/auth/me` 확장 1 구현
  - 새 패키지 `com.planbee.api.admin` — 컨트롤러 1 / 서비스 1 / QueryDSL 리포지토리 1 / 커서 1 /
    에러 코드 3 / 처리 기록 엔티티 1 / DTO 11 / Discord 알림 3
  - Flyway `V3__create_admin_user_approval.sql` — `users` 에 상태 전이 시각 4 + `rejection_reason`,
    커서용 부분 인덱스 2, `admin_action_logs` 신설 (AC-13)
  - 인가는 경로 선언으로 — `/api/v1/admin/**` 에 `SCOPE_full` + `ROLE_ADMIN` (AC-3).
    필터 체인 403 의 코드는 `ForbiddenCodeResolver` 확장점으로 갈랐다 (`ADMIN_FORBIDDEN`)
  - `make lint-server` / `make test-server` / `make contract-check` **모두 통과** (아래 `기록`)
  - `docs/conventions/server.md` 에 S-32 · S-33 · S-34 추가, "미확정 — 인가 모델" 종결
- [x] server-reviewer — **PASS (2026-09-09).** `[MUST]` 위반 0건 — `defects.md` 로 이관할 결함 없음
  - 판단이 넘어온 설계 3건 전부 **규칙 위반 아님**으로 판정 — ① `role` 클레임 + `JwtAuthenticationConverter`
    (S-17 이 금지하는 것은 검증을 대체하는 **필터**이고, 스코프 불릿이 같은 패턴을 이미 허용한다) ·
    ② `processed_at` 컬럼 저장(계약은 응답 필드만 규정. 쓰는 지점이 `User` 의 전이 5개로 모여 있음을 확인) ·
    ③ `ForbiddenCodeResolver`(S-27 과 같은 해법, 의존 방향 `admin → common`)
  - 리뷰어 실행 게이트: `make lint-server` / `make test-server` / `make contract-check` **모두 통과**
  - `[SHOULD]` 3건 + 규칙 근거 없는 참고 5건은 `review/server.md`, 타 역할 요청 2건은 `defects.md`
  - 리포트: `docs/features/admin-user-approval/review/server.md`
- [x] server-tester — **PASS (2026-09-09).** 통합 테스트 8클래스 · **75건** 추가, 실패 0
  - AC 34개 판정: **통과 29 / 해당없음(모바일) 3(AC-8·9·14) / 미검증 2(AC-26·AC-28)** —
    아래 `서버 AC 판정표` 에 각 판정의 근거 테스트 이름이 붙어 있다
  - **AC-26·AC-28 은 `DISCORD_WEBHOOK_URL` 미발급으로 미검증** (ASK 1. 아래 `미해결` 참조)
  - 실행 게이트: `make test-server-db` 통과(전체 150건, 실패 0) / `make lint-server` 통과
  - `defects.md` 에 올릴 결함 **0건** — 구현이 계약·AC 와 어긋난 지점을 찾지 못했다
  - server-reviewer 가 넘긴 `processed_at` 불변식을 `assertProcessedAtInvariant()` 로 고정했다
- [x] mobile-developer — **완료 (2026-09-09).** `design.md` 화면 18개 전부 구현 (미구현 화면 0, 연출 2건은 아래 사유)
  - 진입점은 설정의 `관리자` 섹션 하나 — **하단 탭바를 건드리지 않았다** (결정 1). 조합은
    `app/navigation/MainNavigator.tsx` 가 하고 `SettingsScreen` 은 슬롯만 받는다 (M-2 / design.md §4.7)
  - 신규 DS 컴포넌트 5개를 `shared/ui` 에 구현하고 **pen 정의(`M4j8Ky`·`ZcirU`·`CfaaR`·`B8FM7g`·`WJqGp`)와
    대조해 치수·굵기·간격을 맞췄다.** 신규 색 토큰 0개
  - 게이트: `make lint-mobile` / `make test-mobile` / `make verify-mobile` **통과**
  - `NOT_FOUND`(D-1)는 명세가 없어 M-13 일반 오류로 두었다 — 화면을 지어내지 않았다
  - **미구현 2건(사유 명시)** — ① §5.11 의 항목 제거 애니메이션(200ms 페이드아웃 + 높이 축소):
    처리 결과는 서버 재조회로 반영되고 `FlatList` 의 제거 시점을 앱이 쥐고 있지 않다. `reanimated`
    미도입 상태에서 `LayoutAnimation` 으로 흉내내면 안드로이드 실험 플래그가 필요해 M-19 를 건드린다.
    기능·문구·상태 전이에는 영향이 없다. ② §6.6 의 "처리 후 그 자리의 다음 행으로 포커스":
    시트를 **취소로** 닫을 때는 연 행으로 되돌리도록 구현했고, 처리 성공 뒤에는 행이 사라져
    "다음 행" 을 특정할 근거가 목록 갱신 전에는 없다. 완료 사실은 토스트가 낭독한다
- [x] mobile-reviewer — **PASS (2026-09-09, 재리뷰).** 1차 FAIL 의 `[MUST]` 결함 2건이
  재작업 1회차에서 **모두 해소됐고 회귀 없음.** 새 `[MUST]` 0건 → 다음은 mobile-tester
  - DEF-M01 **해소** — `closeAction`(`PendingUserSheet.tsx:117-126`)이 기본 단계(`160`)와
    거절 사유 입력 단계(`228`) **두 분기 모두**에 걸렸다. 경합 뒤 `거절하기`·`뒤로` 는 비활성이
    아니라 제거된다. `run()` 재호출 경로 전수 확인 — 버튼(제거)·배너 "다시 시도"(`undefined`)·
    안드로이드 백(되돌아간 기본 단계도 `closeAction`)로 **같은 409 로 갈 길이 없다.**
    §6.8 이 남기라고 한 정보 블록·대상 이메일·입력한 사유는 남아 있다
  - DEF-M02 **해소** — 단언 2곳 실제 삭제(상태 타입 `Exclude<…,'forbidden'>` 로 좁힘,
    배너 인자는 `bannerKind` **타입 주석**이지 단언이 아니다). 남긴 2곳
    (`useUserApproval.ts:50-53·63-64`)에 "왜 불가피한지 + `(M-9)`" 주석 — `a11y.tsx:56` 선례 형식.
    기능 디렉토리 전수 grep 결과 남은 단언은 그 두 줄뿐(`as const`·import 별칭은 대상 아님), `any` 0건
  - **회귀 없음** — 재작업이 건드린 파일은 3개뿐이고(`PendingUserSheet`·`ProcessedUserSheet`·
    `useUserApproval`) 나머지는 무수정이다. `code` 기반 분기 · 403 → §5.10 · §9 문구 ·
    4가지 상태 × 세그먼트 · M-24 · 플랫폼 분기를 다시 읽어 확인했다.
    **1차의 "결함 아님" 4건도 되돌리지 않았다**(근거 파일 `actionError.ts`·`StatusBadge.tsx`·
    `UserApprovalListScreen.tsx` 무수정)
  - 리뷰어 실행 게이트: `make lint-mobile` **통과**(exit 0) / `npx tsc --noEmit` **통과**(exit 0) /
    회귀 확인용 `make test-mobile` **통과**(16 suites · 151 tests · 실패 0)
  - mobile-tester 에게 넘긴 요청 R-M4(경합 상태를 **두 단계 모두** 테스트로 고정) 추가. 1차의
    R-M1·R-M2·R-M3 은 그대로 열려 있고, 결함이 아니므로 PASS 를 막지 않는다
  - **재작업 카운터는 1 그대로**다 (PASS 이므로 올리지 않는다)
  - 아래는 **1차 리뷰(FAIL, 2026-09-09) 의 기록**이다 — 지우지 않고 남긴다
  - DEF-M01 `PendingUserSheet` 의 **거절 사유 입력 단계에서 §6.8 "이미 처리됨" 상태가 절반만** 구현됐다
    (배너는 뜨지만 "거절하기" 가 활성으로 남아 다시 누르면 같은 409). 409 는 승인보다 거절에서
    더 자주 나오므로 결함이 있는 쪽이 주 경로다 (M-6 / design.md §6.8 / AC-12)
  - DEF-M02 사유 주석 없는 타입 단언 4곳 (M-9). 2곳은 상태 타입을 좁히면 단언이 사라지고,
    2곳(react-query `initialPageParam`)은 사유 주석을 달면 된다
  - 넘어온 판단 4건은 **전부 규칙 위반 아님** — ① 403 `ADMIN_FORBIDDEN` → §5.10 권한 없음 화면은
    design.md §2.3·§5.10 · `contract.yaml` 403 표 · `error-codes.md` 가 모두 지정한 처리다
    (§6.7 일반 배너였다면 그쪽이 위반) · ② `NOT_FOUND`(D-1)를 M-13 일반 오류로 둔 것은 계약과
    카탈로그가 명시한 처리이고 화면을 지어냈다면 M-7 위반이었다 · ③ 미구현 연출 2건은 **근거 규칙이
    없어 `[MUST]`·`[SHOULD]` 어느 쪽도 아니다**(절대 규칙 2). reanimated 미도입은 M-19·절대 규칙 8
    상 옳은 판단 · ④ 배지 패딩은 C-9·M-16 이 "어긋나면 pen 기준" 이라 pen(`[3,10]`)이 맞다 —
    md 정정은 ux-designer 몫으로 요청(R-M1)
  - 계약·명세 대조 전항 일치 — 탭바 미변경 · `ADMIN` 조건 렌더(로딩·실패에도 미렌더) · 섹션 위치 ·
    "처리 완료"(“처리됨” 0건) · 행에 버튼 없음 · `pending_approval_count` 를 세지도 ±1 하지도 않음 ·
    설정 한 영역에 호출 1회(슬롯) · 오류 분기가 `code` 로만 · 커서 불투명 + `has_next` 근거 ·
    "입력하지 않음" 문자열 0건 · `snake_case` 경계 타입(생성물) · §9 문구 전수 일치 · 4가지 상태 ·
    M-2/M-21/M-23/M-24 · `Platform.select` 양쪽 키
  - 리뷰어 실행 게이트: `make lint-mobile` 통과 / `npx tsc --noEmit` 통과
  - 리포트: `docs/features/admin-user-approval/review/mobile.md`
- [x] mobile-tester — **FAIL (2026-09-09).** `[MUST]` 결함 **1건** (`DEF-T01`) → mobile-developer 재작업 2회차
  - 테스트 **8스위트 · 72건** 추가 (`mobile/src/features/admin-user-approval/__tests__/`).
    API 는 전부 msw 목킹, 서버 미기동 (절대 규칙 5 / M-11)
  - **앱 화면 책임 AC 22개 중 21개 통과 / 1개 실패** — 아래 `모바일 AC 판정표` 참조
  - `DEF-T01` — **이미 받아 둔 목록이 있는데도 뒤이은 요청이 실패하면 화면 전체가 오류 블록으로
    바뀐다.** react-query 무한 쿼리는 데이터가 있어도 추가 요청 실패 시 상태를 `error` 로 만드는데,
    화면이 `active.isError` 하나로 본문을 §5.9 블록으로 갈아 끼운다. 그래서 ⑴ 다음 페이지 로드
    실패(AC-7 / §5.6 "이미 불러온 항목은 그대로 남는다")와 ⑵ 새로고침 실패(AC-9 / §5.5 "기존 목록을
    유지")가 둘 다 깨지고, §5.6 의 실패 푸터는 **도달 불가능한 죽은 코드**다.
    증거는 `pendingList.test.tsx` 의 `test.failing` 2건 — 고치면 통과로 바뀐다
  - **R-M3 · R-M4 완료** — R-M4(경합을 기본 단계·거절 단계·안드로이드 백 세 곳 모두 고정)는
    `conflict.test.tsx` 5건, R-M3(M-20 양쪽 분기)은 `platformIos/platformAndroid.test.tsx` 12건
  - 게이트: `make lint-mobile` 통과(exit 0) / `npm --prefix mobile run typecheck` 통과(exit 0) /
    `make test-mobile` 통과(exit 0 — 24 suites · 223 tests · 실패 0)
  - 리포트: `docs/features/admin-user-approval/defects.md` (2026-09-09 mobile-tester 절)
- [ ] mobile-developer 재작업 2회차 — **진행 중**
  - [x] `DEF-C01` (긴급, 사람이 실기기에서 재현) — `처리 완료` 세그먼트 전환 시 화면 백지.
    원인은 내비게이션 배선이 아니라 **조건부 `shadow-segment` 가 만든 CSS 변수의 뒤늦은 등장**이다
    (NativeWind 업그레이드 경고 → `JSON.stringify` 가 내비게이션 컨텍스트의 던지는 getter 를
    건드림). `shared/ui/Segmented.tsx` 의 비선택 칸에 `shadow-none` 을 주어 해소.
    규칙 `M-25` 등록 + 회귀 테스트 `shared/ui/__tests__/Segmented.test.tsx`.
    자세한 내용은 `결정 기록` 표 참조
  - [ ] `DEF-T01` — **미착수.** 이번 크래시 수정과 범위를 섞지 않았다
- [ ] integration-tester — PASS / FAIL

## 서버 AC 판정표 (server-tester, 2026-09-09)

판정 기준은 `PRD.md` 의 AC 34개다. 구현 코드를 보고 기준을 만들지 않았다.
근거는 전부 `server/src/test/java/com/planbee/api/admin/` 의 테스트 이름이다
(클래스 접두어 생략 — `Pending`=`AdminPendingListApiTest`, `Processed`=`AdminProcessedListApiTest`,
`Transition`=`AdminUserTransitionApiTest`, `Auth`=`AdminAuthorizationApiTest`,
`Count`=`AdminPendingCountApiTest`, `Session`=`AdminSuspendedSessionApiTest`,
`Discord`=`AdminDiscordNotificationApiTest`, `Disabled`=`AdminNotificationDisabledApiTest`).

| AC | 판정 | 근거 |
|---|---|---|
| AC-1 | 통과 | `Count.AC1_ADMIN_에게는_대기_건수를_정수로_내린다` — 진입점을 **그리는** 것은 모바일, 건수를 내리는 것이 서버 몫 |
| AC-2 | 통과 | `Count.AC2_USER_에게는_null_이다` · `Auth.AC2_USER_에게는_대기_건수를_내리지_않는다` |
| AC-3 | 통과 | `Auth.AC3_USER_토큰은_관리자_API_에서_403_이다`(관리자 경로 7개 전부) · `Auth.AC3_ADMIN_토큰은_통과한다` · `Auth.삭제_전용_토큰은_공통_FORBIDDEN_이다` |
| AC-4 | 통과 | `Auth.AC4_미인증_요청은_401_이다`(7개 전부) · `Auth.AC4_무효한_토큰은_401_이다` |
| AC-5 | 통과 | `Pending.AC5_대기_목록은_신청_시각_최신순이다` |
| AC-6 | 통과 | `Pending.AC6_빈_목록은_정상_응답이다` · `Processed.처리_완료가_비어_있어도_정상_응답이다` (빈 상태 **문구**는 모바일) |
| AC-7 | 통과 | `Pending` 커서 6건(`AC7_기본_페이지는_20건이고_커서로_나머지를_불러온다` · `AC7_마지막_페이지가_꽉_차도_has_next_는_false_다` · `AC7_동률은_user_id_내림차순으로_깬다` · `AC7_page_size_경계값은_통과한다` · `AC7_page_size_범위_밖은_400_이다` · `AC7_깨진_커서는_400_이다` · `AC7_너무_긴_커서는_400_이다` · `AC7_보면서_줄어들어도_항목을_건너뛰지_않는다`) + `Processed` 3건 |
| AC-8 | 해당없음(모바일) | 500 응답의 오류 안내·재시도 버튼은 화면 동작 |
| AC-9 | 해당없음(모바일) | 당겨서 새로고침은 화면 동작 |
| AC-10 | 통과 | `Transition.AC10_승인하면_대기_목록에서_사라진다` |
| AC-11 | 통과 | `Transition.AC11_승인된_사용자는_로그인할_수_있다` |
| AC-12 | 통과 | `Transition.AC12_전이_5종이_같은_409_코드를_쓴다` — 5종이 **같은 코드 하나** |
| AC-13 | 통과 | `Transition.AC13_처리_기록이_남는다` (응답에는 싣지 않음 — `Processed.거절_사유는_응답에_실리지_않는다`) |
| AC-14 | 해당없음(모바일) | 네트워크 끊김 시의 낙관적 갱신 여부는 화면 동작 |
| AC-15 | 통과 | `Transition.AC15_거절하면_대기_목록에서_사라진다` (확인 단계는 모바일) |
| AC-16 | 통과 | `Transition.AC16_거절_사유는_200자가_경계다` — 200자 200 / 201자 400 + `errors[].field="rejection_reason"`. 입력란 자체를 막는 것은 모바일 |
| AC-17 | 통과 | `Transition.AC17_거절_사유는_선택이다` — 본문 생략 · `null` · 공백 셋 다 200 |
| AC-18 | 통과 | `Transition.AC15_거절하면_대기_목록에서_사라진다` 안의 로그인 403 `AUTH_ACCOUNT_REJECTED` |
| AC-19 | 통과 | `Transition.AC19_거절_취소는_원래_자리로_되돌린다` · `Processed.AC19_거절_취소한_계정은_처리_완료_목록에서_사라진다` |
| AC-20 | 통과 | `Processed.AC20_처리_완료_목록은_처리_시각_최신순이다`(세 상태 동거) · `Processed.AC20_상태별_시각_필드가_계약대로다` |
| AC-21 | 통과 | `Transition.AC21_정지는_상태만_바꾸고_건수를_바꾸지_않는다` |
| AC-22 | 통과 | `Session.AC22_정지된_사용자는_로그인할_수_없다` (삭제 토큰이 실리지 않는 것까지) |
| AC-23 | 통과 | `Session.AC23_정지되면_갱신이_403_이다` · `Session.AC23_정지는_리프레시_토큰을_폐기하지_않는다` · `Session.AC23_매_요청_상태_확인은_도입되지_않았다` |
| AC-24 | 통과 | `Session.AC24_정지가_풀리면_다시_로그인할_수_있다` · `Transition.D2_정지_해제는_승인_시각을_갱신한다` |
| AC-25 | 통과 | `Transition.AC25_자기_자신은_정지할_수_없다` (403 `ADMIN_SELF_SUSPEND_FORBIDDEN`, 상태 불변) |
| AC-26 | **미검증** | 실제 Discord 채널 발송. `DISCORD_WEBHOOK_URL` 미발급(ASK 1)이고 **외부 연동 목킹 규칙상 이 계층에서 검증하지 않는다.** 사람이 `make webhook-check` 로 확인 |
| AC-27 | 통과 | `Discord.AC27_발송이_실패해도_가입은_접수된다` (WireMock 500 → 가입 201, 재시도 1회) |
| AC-28 | **미검증** | 경고 수준 **로그**의 실물 관측. 재시도 1회까지라는 동작은 위 테스트가 고정했으나 로그 확인은 사람 몫(`make logs`) |
| AC-29 | 통과 | `Disabled.AC29_URL_이_없어도_가입은_정상_접수된다` · `Disabled.AC29_발송을_건너뛴_뒤에도_서버가_정상이다` |
| AC-30 | 통과 | `Discord.AC30_실패한_가입은_알리지_않는다` (중복 409 · 검증 400 은 알림 0건) |
| AC-31 | 통과 | `Discord.AC31_알림에_개인정보가_없다` (이메일 · 사유 · `@` · `token` 부재를 문자열 단위로) |
| AC-32 | 통과 | `Count` 5건(다섯 곳을 한 시점에 모아 비교 · 승인 후 감소 · 거절 취소 후 증가 · 정지는 불변 · `items` 길이가 아님) · `Discord.AC32_알림_건수는_화면_건수와_같다` |
| AC-33 | 통과 | `Pending.AC33_가입_사유가_없으면_서버가_대체_문구를_채운다` |
| AC-34 | 통과 | `Transition.AC34_가입_사유가_없어도_동일하게_처리된다` |

계약·리뷰에서 넘어온 항목도 함께 고정했다 (AC 번호가 없는 것들).

| 항목 | 판정 | 근거 |
|---|---|---|
| D-2 정지 해제가 승인 시각을 갱신 | 통과 | `Transition.D2_정지_해제는_승인_시각을_갱신한다` |
| D-3 거절 취소가 거절 사유를 비움 | 통과 | `Transition.D3_거절_취소는_거절_사유를_비운다` |
| `processed_at` 불변식 (server-reviewer 이관) | 통과 | `Transition.전이_5종을_거쳐도_processed_at_불변식이_유지된다` + 모든 전이 테스트가 `assertProcessedAtInvariant()` 호출 |
| 대상 없음 404 (전이 5종) | 통과 | `Transition.없는_대상은_404_다` |
| 거절 사유·처리자가 응답에 새지 않음 | 통과 | `Processed.거절_사유는_응답에_실리지_않는다` |

## 모바일 AC 판정표 (mobile-tester, 2026-09-09)

판정 기준은 `PRD.md` 의 AC 34개이고, **앱 화면이 책임지는 22개**는 `design.md` §11 대조표를 따랐다.
구현 코드를 보고 기준을 만들지 않았다. 근거는 전부
`mobile/src/features/admin-user-approval/__tests__/` 의 테스트 이름이다
(파일 접두어 — `Entry`=`entry`, `PList`=`pendingList`, `DList`=`processedList`,
`PSheet`=`pendingSheet`, `DSheet`=`processedSheet`, `Conf`=`conflict`,
`PlatI`=`platformIos`, `PlatA`=`platformAndroid`).

| AC | 판정 | 근거 |
|---|---|---|
| AC-1 | 통과 | `Entry.AC1_ADMIN_이면_관리자_섹션과_대기_건수가_보인다` · `Entry.AC1_행을_누르면_가입_신청_관리_화면으로_이동한다` |
| AC-2 | 통과 | `Entry.AC2_USER_에게는_관리자_섹션이_아예_없다` · `Entry.AC2_역할을_조회하는_동안에도_섹션이_보이지_않는다`(깜빡임 없음) · `Entry.AC2_역할_조회에_실패하면_섹션이_없고_설정_화면의_나머지는_동작한다` |
| AC-3 | 통과 (앱 표현) | `PList.AC3_403_ADMIN_FORBIDDEN_이면_…_다시_시도가_없다` · `DList.AC3_403_…_권한_없음_화면이_된다` · `PSheet.AC3_승인에서_403_…_시트가_닫히고_권한_없음_화면이_된다`. **차단 자체는 서버** |
| AC-4 | 해당없음 (auth) | 이 기능에 전용 화면이 없다 (`auth` 전역 세션 처리 — design.md §11) |
| AC-5 | 통과 | `PList.AC5_대기_3건이_서버가_준_순서대로_이메일_가입사유_신청시각과_함께_보인다` |
| AC-6 | 통과 | `PList.AC6_대기가_0건이면_검토할_신청이_없어요_가_보인다` |
| AC-7 | **실패** | `PList.AC7_목록_끝에_닿으면_next_cursor_를_그대로_보내_다음_페이지를_불러온다`(통과) · `PList.AC7_has_next_가_거짓이면_끝에_닿아도_더_부르지_않는다`(통과) · **`PList.AC7_다음_페이지_로드에_실패하면_…`(`test.failing` — `DEF-T01`)** |
| AC-8 | 통과 | `PList.AC8_서버_500_이면_…_다시_시도가_보인다` · `PList.AC8_네트워크가_끊기면_연결을_확인해_주세요_가_보인다` · `DList` 동형 2건 |
| AC-9 | **부분 실패** | `PList.AC9_당기면_첫_페이지부터_다시_불러와_최신_목록으로_갱신된다`(통과) · `PList.AC9_빈_상태에서도_당겨서_새로고침이_동작한다`(통과) · `PList.AC9_새로고침에_실패하면_…_배너가_뜬다`(통과) · **`PList.AC9_새로고침에_실패해도_보고_있던_목록은_남는다`(`test.failing` — `DEF-T01`)** |
| AC-10 | 통과 | `PSheet.AC10_승인하면_시트가_닫히고_토스트가_뜨며_항목이_대기_목록에서_사라진다` |
| AC-11 | 해당없음 (auth) | 승인된 사용자의 로그인 결과 — 이 기능에 화면 없음 |
| AC-12 | 통과 | `Conf` 5건 — 기본 단계 · 거절 사유 입력 단계 · 안드로이드 백 복귀 · 닫기 · `ProcessedUserSheet`. 모두 액션이 **제거**되고 `닫기` 하나만 남으며 즉시 목록을 다시 부른다 (R-M4) |
| AC-13 | 해당없음 (서버) | 처리 기록은 화면에 노출하지 않는다 (Q2). `DSheet.처리자와_거절_사유는_시트에_그리지_않는다` 가 "노출하지 않음" 쪽만 확인 |
| AC-14 | 통과 | `PSheet.AC14_네트워크가_끊기면_아직_처리되지_않았어요_배너가_뜨고_항목은_목록에_남는다` · `PSheet.AC14_서버_500_이면_…_다시_시도로_같은_요청을_다시_보낸다` · `DSheet.AC14_계열_정지에_실패하면_…` |
| AC-15 | 통과 | `PSheet.AC15_거절은_확인_단계를_한_번_거친_뒤_목록에서_사라진다` · `PSheet.AC15_뒤로를_누르면_기본_단계로_돌아가고_입력한_사유는_유지된다` |
| AC-16 | 통과 | `PSheet.AC16_200자에서_한_글자를_더_입력하면_반영되지_않고_카운터는_200_200_을_유지한다`(`userEvent` 가 `maxLength` 를 플랫폼과 같게 지킨다) · `PSheet.AC16_서버가_rejection_reason_검증_오류를_주면_입력_필드_오류로_보인다` |
| AC-17 | 통과 | `PSheet.AC17_사유를_비워도_거절하기는_활성이고_정상_처리된다` (요청 본문이 `{rejection_reason: null}`) |
| AC-18 | 해당없음 (auth) | 거절된 사용자가 보는 화면 |
| AC-19 | 통과 | `DSheet.AC19_확인_다이얼로그를_거쳐_되돌리면_검토_대기_목록에_다시_나타난다` (대기 건수도 서버 값으로 갱신) |
| AC-20 | 통과 | `DList.AC20_이메일과_처리_시각이_서버가_준_순서대로_보인다` · `DList.세_상태가_한_목록에_상태_배지와_함께_섞여_보인다` |
| AC-21 | 통과 | `DSheet.AC21_확인_다이얼로그를_거쳐_정지하면_배지가_정지됨으로_바뀐다` · `DSheet.AC21_다이얼로그에서_취소하면_아무_요청도_보내지_않는다` |
| AC-22 · AC-23 | 해당없음 (auth) | 정지된 사용자 쪽 화면·세션 처리 |
| AC-24 | 통과 | `DSheet.AC24_확인_다이얼로그_없이_바로_처리되고_배지가_승인됨으로_돌아간다` |
| AC-25 | 통과 | `DSheet.AC25_내_계정이면_정지_동작이_아예_제공되지_않는다`(비활성이 아니라 미렌더) · `DSheet.AC25_서버가_자기_자신_정지를_거부하면_배너와_닫기만_남는다` |
| AC-26 ~ AC-31 | 해당없음 (서버) | Discord 알림 — 앱 화면과 접점이 없다 |
| AC-32 | 통과 (앱 측) | `Entry.AC32_건수는_서버가_내린_정수를_그대로_쓴다` · `Entry.대기_0건이면_값_자리를_비우고…` · `PList.세그먼트_라벨의_숫자는_서버가_준_대기_건수다` — 앱이 세지도 ±1 하지도 않는다 |
| AC-33 | 통과 | `PList.AC33_가입_사유가_없는_신청도_서버가_내린_문자열_그대로_같은_모양으로_보인다` |
| AC-34 | 통과 | `PSheet.AC34_가입_사유가_없는_신청도_같은_경로로_승인된다` |

**앱 화면 책임 22개 중 — 통과 21 / 실패 1 (AC-7, AC-9 가 같은 원인 `DEF-T01`).**
나머지 12개는 서버·`auth` 책임이라 이 계층의 판정 대상이 아니다.

네 가지 상태(로딩 · 정상 · 비어있음 · 오류)는 **세그먼트마다 따로** 덮었다 —
`검토 대기` 는 `pendingList.test.tsx`, `처리 완료` 는 `processedList.test.tsx`,
시트 쪽은 `pendingSheet`(§6.9) · `processedSheet`(§7.7) · `conflict`(§6.8).

## 재작업 카운터

루프 상한은 2회. 3회차에 접어들면 `ESCALATE` 를 적고 사람에게 넘긴다.

| 대상 | 횟수 |
|---|---|
| server-developer | 0 |
| mobile-developer | **2** (① 2026-09-09 mobile-reviewer FAIL — DEF-M01·DEF-M02, 재리뷰 PASS 로 종결 / ② 2026-09-09 mobile-tester FAIL — DEF-T01). **다음 왕복은 3회차라 `ESCALATE` 다** (절대 규칙 4) |

## 계약 변경

**breaking change 여부: 없음.** (2026-09-07 tech-lead 판정)

| 변경 | 성격 | 판정 근거 |
|---|---|---|
| `/api/v1/admin/**` 엔드포인트 6개 신설 | **추가** | 기존 경로·스키마를 건드리지 않는다. 구현이 아직 없으므로 `make contract-check` 는 "계약에만 있고 미구현" 으로 **정보 보고**만 해야 한다 (C-5) |
| `UserSummary.pending_approval_count` 추가 | **추가 (non-breaking)** | `auth` 소유 스키마에 **선택·nullable 필드 하나**를 더한 것이다. `required` 에 넣지 않았고 기존 필드의 타입·필수 여부를 바꾸지 않았다. 기존 클라이언트는 이 필드를 읽지 않으므로 깨지지 않는다. 새 엔드포인트를 만들지 않은 이유는 C-8 이다 — 설정 화면 한 영역에 호출이 2회가 되면 위반 (design.md §13-1) |
| `docs/features/auth/contract.yaml` 동기화 | **추가** | 두 파일의 `auth` 부분은 항상 같아야 한다는 규약(auth 계약 머리말)에 따라 같은 필드를 반영했다. `auth` 의 동작은 바뀌지 않는다 |
| `auth` 의 다른 스키마 (`AccountStatusView` 등) | **변경 없음** | 정지 사유를 받지 않기로 확정했으므로(2026-09-07 Q3) `SUSPENDED` 안내에 내릴 새 값이 없다. AC-23 도 새 메커니즘을 도입하지 않아 `POST /api/v1/auth/token/refresh` 계약이 그대로다 |

### 이후 기능이 따르는 선례

이 기능이 이 저장소의 **첫 목록 계약**이다 (`auth` 에는 목록이 없고 `place` 는 페이지네이션이 없다).
아래 형태를 이후 기능이 따른다 — `docs/api/openapi.yaml` 의 `components.parameters` 와
`PendingUserPage` 주석에 근거를 적어 두었다.

- 요청: `?page_size=<1..50, 기본 20>&cursor=<불투명 문자열>`
- 응답 봉투: `{ items, has_next, next_cursor }` (+ 그 화면이 필요로 하는 집계값)
- **커서 방식이다.** 오프셋을 쓰지 않는 이유는 이 목록이 **보면서 줄어들기** 때문이다 —
  승인 한 건마다 앞이 빠지므로 `offset=20` 이 이미 밀려난 위치를 가리켜 항목을 조용히 건너뛴다.
- 정렬 키와 동률 깨기 키(`user_id` 내림차순)를 **계약이 못 박는다.** 정렬 파라미터를 두지 않는다.

## 미해결 / 에스컬레이션

`ASK` — 사람 판단이 필요한 항목.

| # | 질문 | 막는 대상 |
|---|---|---|
| 1 | Discord 채널 Webhook URL 을 누가 발급해 `.env` 에 넣는가 (채널 설정 → 연동 → 웹후크). 값은 시크릿이라 문서·커밋에 적지 않는다 | AC-26 실행 검증 |
| 2 | ~~관리자가 앱 안에서 계정을 지울 수단이 필요한가~~ → **종결 (2026-09-07).** 앱 안 삭제 수단을 만들지 않고 DB 직접 처리로 간다. 아래 `결정 기록` 표 참조 | — (닫힘) |
| 3 | ~~거절된(`REJECTED`) 사용자를 관리자가 어디서 보는가~~ → **종결 (2026-09-07).** 권장안 B 채택, 라벨은 **"처리 완료"**. 아래 `결정 기록` 표 참조 | — (닫힘) |
| 4 | ~~처리 기록(누가 언제)을 사용자 상세 시트에 보여줄 것인가~~ → **종결 (2026-09-07).** 권장안 A 채택 — 표시하지 않는다 | — (닫힘) |
| 5 | ~~정지에 사유를 남길 것인가~~ → **종결 (2026-09-07).** 권장안 A 채택 — 받지 않는다. **`auth` design.md §14 항목 6 도 함께 닫혔다** | — (닫힘) |
| 6 | ~~**`make contract-check` 를 아직 실행하지 못했다**~~ → **종결 (2026-09-09, server-developer).** 실행 결과 계약 자체는 문제 없었고 ERR 0건이다. 다만 두 가지가 예상과 달랐다 — ① `UserSummary` 의 선택 필드는 ERR 이 아니라 **warning 2건**(`response-optional-property-removed`, `/auth/me` 와 로그인 응답)으로 잡혔고 구현 완료로 사라졌다. ② 이 기능과 무관한 `nearby-places` 의 기존 결함으로 게이트가 **RED 였다**(`request-parameter-default-value-removed` 3건). 계약이 아니라 구현을 고쳐 해소했다 (아래 `기록` 2026-09-09) | — (닫힘) |

**열린 ASK 는 1번 하나다** — Discord Webhook URL 발급 (AC-26 실행 검증 단계에서 필요).
서버 구현은 값이 없어도 정상 기동하고 발송만 건너뛴다 (AC-29, 실측 확인). 값이 채워지기 전에는
AC-26·AC-28 의 "실제로 발송된다 / 실패가 경고 로그로 남는다" 를 관측할 수 없다.
**구현·리뷰·테스트를 막는 미확정 설계 항목은 없다.**

**AC-26 · AC-28 은 server-tester 단계에서도 미검증으로 남는다 (2026-09-09).** 통합 테스트는
외부 연동을 목킹한다는 계층 규칙(절대 규칙 5)을 지켜야 하므로, 실제 Discord 채널로 나가는
경로를 테스트에 두지 않는다. 대신 그 자리에 WireMock 을 끼워 **서버가 보내려는 내용**만
고정했다 (`AdminDiscordNotificationApiTest` — AC-27·AC-30·AC-31·AC-32). 따라서 다음 둘은
여전히 사람이 확인할 항목이다.

| 미검증 | 무엇을 확인해야 하나 | 누가 |
|---|---|---|
| AC-26 | `.env` 에 실제 Webhook URL 을 넣은 뒤 가입 1건을 접수해 **운영 Discord 채널에 메시지가 도착**하는지 (`make webhook-check`) | 사람 (ASK 1 이후) |
| AC-28 | 그 환경에서 Webhook 이 오류를 낼 때 **경고 수준 로그**가 남는지 (`make logs`) | 사람 (ASK 1 이후) |

**테스트 JVM 은 이 값을 절대 보지 않는다.** `Makefile` 이 `.env` 의 모든 키를 export 하므로
`server/build.gradle` 의 모든 `Test` 태스크에서 `DISCORD_WEBHOOK_URL` 을 **빈 값으로 고정**한다
(커밋 `8837042`). 그 줄이 없으면 사람이 채운 진짜 URL 이 테스트로 흘러가 실제 채널에 대량
발송된다 — 실제로 한 번 일어났다. **그 줄을 지우거나 우회하지 않는다.**

`tech-lead` 로 넘어왔던 PRD 열린 질문 4·5 는 **2026-09-07 에 둘 다 종결됐다** (아래 `결정 기록`).
`design.md` §13 의 8개 항목은 전부 계약에 반영됐다.

### `design.md` · `PRD.md` 보강 요청 (tech-lead → ux-designer / product-manager)

계약을 쓰는 동안 상위 문서가 답하지 않는 지점을 발견했다. **계약이 임의로 화면을 정하지 않았고**,
아래는 문서 소유자에게 넘기는 요청이다 (절대 규칙 1 — 어긋나면 구현이 아니라 상위 문서를 고친다).

| # | 무엇 | 계약의 현재 처리 | 요청 대상 |
|---|---|---|---|
| D-1 | **처리 도중 대상 계정이 삭제된 경우의 화면이 없다.** `auth` 의 계정 삭제는 즉시 파기라 실제로 일어날 수 있다. "이미 처리됨"(AC-12)과는 사실이 다르므로 §6.8 배너를 재사용하도록 계약이 정하지 않았다 | 404 `NOT_FOUND`. 보강 전까지 앱은 M-13 의 일반 오류 처리 | ux-designer (`design.md` §6 오류 절) |
| D-2 | **정지 해제가 "승인 시각" 을 갱신하는지 명시가 없다.** §5.4 의 "`APPROVED` 항목만 놓고 보면 마지막 처리 시각이 곧 승인 시각" 에서 도출했으나 §7.1·§7.4 에 직접 쓰여 있지 않다 | **갱신한다**로 확정 (`POST /suspend/cancel` 설명). 갱신하지 않으면 목록 행과 시트가 서로 다른 날짜를 말한다 | ux-designer (`design.md` §7.4 에 한 줄) |
| D-3 | **거절 취소 시 저장된 거절 사유를 어떻게 하는지 언급이 없다.** 화면에 안 그리므로 명세에 나올 이유가 없었다 | **비운다**로 확정. 남기면 다음 거절 때 그 값이 어느 결정에 붙은 것인지 알 수 없다 | (계약이 확정 — 정보 공유) |
| D-4 | §3.5 의 announce "{서버가 준 추가 건수}건을 더 불러왔어요" 가 **전용 필드를 요구하는 것처럼 읽힌다** | 그 값은 **응답 `items` 배열의 길이**다. 별도 필드를 두지 않았다 — 배열과 그 길이를 나눠 담으면 어긋날 수 있는 값만 하나 는다. 길이를 세는 것은 C-8 이 금지하는 파생값 계산이 아니라 응답 자체를 읽는 것이다 | ux-designer (`design.md` §3.5 표현 정정, 경미) |

## 결정 기록

| 항목 | 결정 | 날짜 |
|---|---|---|
| 관리자 화면 위치 | 별도 웹 어드민 없이 앱 내 관리자 전용 화면 | 2026-08-23 |
| 관리자 알림 수단 | **Discord** Incoming Webhook (메일 인프라 없음) | 2026-08-23 |
| 알림 페이로드 | **개인정보를 일절 담지 않는다.** 대기 건수 + 관리자 화면 안내 문구만(AC-26·AC-31). 이유는 Discord(미국)로의 국외 이전(「개인정보 보호법」 제28조의8) 회피 — 개인정보를 실으면 가입 화면에 별도 동의 항목이 하나 더 필요해진다. 대가로 알림만으로는 신청자를 알 수 없으며, 관리자는 앱의 관리자 화면에서 확인한다(AC-1 → AC-5) | 2026-08-23 |
| 가입 사유가 빈 신청의 표시 | 가입 사유 자리에 **"입력하지 않음"** 표시, 나머지 항목은 동일(AC-33·AC-34). 가입 사유는 `auth` 에서 **선택 항목**으로 확정 | 2026-08-23 |
| 관리자 계정 이메일의 성격 | `auth` AC-38~42 에 따라 앱 안 문의 연락처로 노출된다. 개인 계정이 아니라 대외 문의용 주소로 만든다 | 2026-08-23 |
| **관리자 화면 진입점** (AC-1·AC-2) | **하단 탭바를 건드리지 않는다.** 마이 탭 → 설정 화면에 **`관리자` 섹션**을 추가하고 역할이 `ADMIN` 일 때만 렌더한다. 행은 "가입 신청 관리", 우측에 대기 건수. 섹션 위치는 **`계정` 다음 · `약관·정책` 앞** (ux-designer 판단 — `design.md` §1.2 a) | 2026-09-07 |
| **목록 구조** (AC-5·AC-20) | **한 화면 + 상단 세그먼트 2개.** "검토 대기 N" / "승인됨" 으로 전환한다. 화면 제목은 "가입 신청 관리" | 2026-09-07 |
| **조작 위치** (AC-10·AC-15·AC-21) | 목록 행을 탭하면 **상세 바텀시트**가 올라오고 거기에 승인/거절(또는 정지/해제) 버튼을 둔다. **목록 행에는 버튼을 노출하지 않는다.** 거절 사유 200자 입력(AC-16)과 확인 단계(AC-15)도 이 시트 흐름 안에 있다 | 2026-09-07 |
| **관리자의 계정 삭제 수단** (ASK 2 종결) | **이번 범위 밖.** 관리자가 앱 안에서 계정을 지우는 수단을 만들지 않는다. 파기 요청은 `auth` AC-38 의 문의 연락처로 받아 **DB 에서 직접 처리**한다. ASK 2 를 이 결정으로 닫는다 | 2026-09-07 |
| **거절된 사용자의 열람 자리** (ASK 3 종결 / AC-19) | 세그먼트는 **2개 유지**하고 두 번째 라벨을 "승인됨" → **"처리 완료"** 로 개정한다. **"처리됨" 이 아니라 "처리 완료" 로 표기한다.** 그 목록에 `APPROVED` · `SUSPENDED` · `REJECTED` 를 상태 배지와 함께 담고, 거기서 `Screen 21d`(거절됨 시트)로 들어가 AC-19(거절 취소)를 완성한다. 근거: 두 번째 목록에 `SUSPENDED` 가 들어가는 순간 이미 "승인됨" 이 내용보다 좁은 이름이 되므로, 라벨 개정이 불일치를 늘리는 게 아니라 해소한다 | 2026-09-07 |
| **처리 기록의 화면 노출** (ASK 4 종결 / AC-13) | **노출하지 않는다.** 기록은 서버에 남기되 사용자 상세 시트에 처리자·처리 시각을 그리지 않는다. **따라서 계약에 처리자 필드를 요구할 이유가 없다.** 관리자가 여러 명이 되면 그때 다시 연다 | 2026-09-07 |
| **정지 사유** (ASK 5 종결 / AC-21) | **받지 않는다.** 정지는 확인 다이얼로그 한 단계만 거친다. 정지된 사용자는 `auth` 가 이미 정한 "이용이 정지된 계정이에요" 화면과 문의 연락처를 본다(AC-22 / `auth` AC-38·AC-39). **이 결정이 `auth` design.md §14 항목 6(`SUSPENDED` 정지 사유·기간 표시)도 닫았다** — `auth §7.4` 와 `AccountStatusView` 는 변경 없음 | 2026-09-07 |
| **정지의 세션 반영 시점** (PRD 열린 질문 4 종결 / AC-23) | **현행 유지 — 매 요청 상태 확인을 도입하지 않는다.** 정지는 `POST /api/v1/auth/token/refresh` 가 갱신 시점에 계정 상태를 재확인하는 기존 경로로 반영되고, **최대 지연은 액세스 토큰 수명인 30분**이다. 근거 셋 — ① 매 요청 확인은 모든 인증 요청에 DB 조회를 1회 더하고 `oauth2-resource-server` 의 무상태 검증을 상태 검증으로 바꿔 "커스텀 인증 필터를 만들지 않는다"(S-17)를 되돌리게 된다. ② 30분 지연의 피해 범위는 "이미 로그인된 기기가 30분 더 조회한다" 이고 즉시성이 필요한 자산(결제·개인정보 대량 열람)이 아직 없다. ③ 더 빨리 끊어야 하면 **액세스 토큰 수명을 줄이는 것이 먼저다** — 코드 변경 없이 `expires_in` 만 바뀐다. **정지가 리프레시 토큰을 폐기하지도 않는다** — 폐기하면 갱신이 401 `AUTH_REFRESH_TOKEN_INVALID` 가 되어 "세션이 만료됐어요" 배너가 뜨고 사용자가 정지 사실을 알 수 없게 된다. 폐기하지 않아야 403 + `account_status`(SUSPENDED) 로 정확한 안내가 나간다. **`auth` 계약 변경 없음 — breaking 아님.** 근거는 `POST /api/v1/admin/users/{user_id}/suspend` 설명에 남겼다 | 2026-09-07 |
| **오류 코드** (PRD 열린 질문 5 종결) | **신규 3개만 만든다.** `ADMIN_FORBIDDEN`(403, AC-3) · `ADMIN_SELF_SUSPEND_FORBIDDEN`(403, AC-25) · `ADMIN_USER_ALREADY_PROCESSED`(409, AC-12). 나머지는 공통 코드를 쓴다 — 미인증은 `UNAUTHORIZED`(AC-4), 거절 사유 200자 초과는 `VALIDATION_FAILED` + `errors[].field="rejection_reason"`(AC-16), 대상 없음은 `NOT_FOUND`, 커서·페이지 크기 오류는 `MALFORMED_REQUEST`/`VALIDATION_FAILED`. **AC-33(가입 사유 없음)에는 코드를 만들지 않았다 — 오류가 아니라 정상 응답이다.** `ADMIN_FORBIDDEN` 을 공통 `FORBIDDEN` 과 갈라 쓰는 이유는 앱이 그리는 것이 화면 전체(§5.10)와 일반 오류 문구로 다르기 때문이다 — 호출한 엔드포인트가 무엇이었는지로 분기하면 분기 근거가 `code` 밖으로 나간다(C-1). AC-12 의 409 는 **상태 전이 5종이 같은 코드 하나**를 쓴다(design.md §13-4). 전부 `docs/api/error-codes.md` 의 `admin` 섹션에 등록했다 | 2026-09-07 |
| **목록 페이지네이션 방식** (AC-7) | **커서 방식.** `?page_size=<1..50, 기본 20>&cursor=<불투명>` → `{ items, has_next, next_cursor }`. 오프셋을 쓰지 않는 이유는 이 목록이 **보면서 줄어들기** 때문이다 — 승인 한 건마다 앞이 빠져 `offset=20` 이 항목을 조용히 건너뛴다. 정렬 키(`검토 대기` = `requested_at` / `처리 완료` = `processed_at`)와 동률 깨기(`user_id` 내림차순)를 계약이 못 박고 정렬 파라미터를 두지 않는다. **이 저장소의 첫 목록 계약이라 이후 기능의 선례가 된다** | 2026-09-07 |
| **대기 건수를 어디에 싣는가** (AC-1·AC-32) | 필드 이름 하나로 통일 — **`pending_approval_count`**. 네 곳에 실린다: `GET /auth/me`(`ADMIN` 에게만 정수, `USER` 에게는 `null`) · 두 목록 응답 · 상태 전이 응답. **새 엔드포인트를 만들지 않았다** — 설정 화면 한 영역에 호출이 2회가 되면 C-8 위반이다(design.md §13-1). Discord 알림도 같은 서버 계산을 써야 AC-32 가 성립한다 | 2026-09-07 |

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-23 | product-manager | PRD.md 작성 완료 (US 5개 / AC 30개). ASK 2건 |
| 2026-08-23 | product-manager | 사람 결정 반영 — 알림 채널 Discord 확정. ASK 2건 잔여 |
| 2026-08-23 | (사람 결정) | 2건 확정 — Discord 알림에서 개인정보 제거(건수만), 가입 사유는 선택 항목 |
| 2026-08-23 | product-manager | 사람 결정 반영 — AC-5 문구 정정, AC-26 을 건수 알림으로 교체, 제약 4줄 개정·추가(알림 페이로드 / 알림만으로 신청자 불명 / 가입 사유 선택 / 관리자 이메일 노출). US-6 신설과 **AC-31~34 추가 (총 34개).** 기존 번호는 재사용·이동 없이 뒤에 이어 붙였다. ASK 1 유지, ASK 2 일부 해소. `auth` PRD 열린 질문 번호 오참조(4 → 2) 정정 |
| 2026-09-07 | (사람 결정) | 4건 확정 — 진입점(설정의 `관리자` 섹션), 목록 구조(한 화면 + 세그먼트 2개), 조작 위치(상세 바텀시트), 계정 삭제 범위 밖(ASK 2 종결) |
| 2026-09-07 | ux-designer | **`design.md` 작성 완료.** 화면 18개 정의(`Screen 16a`~`Screen 20d`, 기존 `Screen 01`~`15` 와 충돌 없음), 문구 전량 확정(§9), AC 34개 대조표 작성 — 앱 화면 충족 21 / 서버·`auth` 책임 12 / 조건부 1(AC-19). 신규 컴포넌트 6개·**신규 색 토큰 0개.** 새 열린 질문 3건을 ASK 3·4·5 로 등록. **`planbee.pen` 시각화는 pencil MCP 연결 실패로 미착수 — ux-designer 단계 미완료** |
| 2026-09-07 | (사람 결정) | 열린 질문 3건 답변 — Q1 권장안 B 채택하되 라벨은 **"처리 완료"**(“처리됨” 아님), Q2 권장안 A(처리 기록 미노출), Q3 권장안 A(정지 사유 없음) |
| 2026-09-07 | ux-designer | **답변 3건 반영 완료.** 세그먼트 라벨 개정에 딸린 곳을 전부 훑었다 — §1.1·§1.2·§2.1 아트보드명(`Screen 18a`·`18b`)·§2.3 전이표·§3.5 a11y·§3.6·§5.2·§5.4·§5.8 빈 상태 문구·§5.11·§5.12·§7 전반·§9 문구 키·§11·§13·§15. **AC 커버 재계산: 앱 화면 충족 22 / 서버·`auth` 책임 12 / 조건부 0 — 미커버 0.** §12 를 "열린 질문 없음 + 결정 근거 기록" 으로 교체. ASK 3·4·5 종결. **`docs/features/auth/design.md` §14 항목 6 을 해소로 이동**(정지 사유 미도입 → `auth §7.4` 변경 없음), §14 항목 5 에 "이 기능에서 해소되지 않음" 을 명시. **pen 시각화는 여전히 미착수 — ux-designer 단계 미완료 유지** |
| 2026-09-07 | ux-designer | **`planbee.pen` 시각화 완료 — UI/UX 단계 종료.** 아트보드 18개(`Screen 17a`~`21d`) + Design System `Section — Admin List & Sheet`(`cQPEw`) 추가. **신규 컴포넌트 5개**(`Control/Segmented` `M4j8Ky` · `Badge/Status` `ZcirU` · `Card/UserListRow` `CfaaR` · `Feedback/EmptyState` `B8FM7g` · `Layout/BottomSheet` `WJqGp`), **신규 색 토큰 0개.** 초안이 6개로 셌던 `Button/Secondary` danger 변형은 기존 인스턴스 오버라이드로 충분해 제외. **번호 충돌 발견 — `Screen 16a`~`16e` 를 `nearby-places` 가 이미 쓰고 있어 전체를 +1 이동**(16→17, 17→18, 18→19, 19→20, 20→21). 기존 70개 프레임은 수정·이동 없음. 18개 전부 레이아웃 검증 통과(clipping 0) |
| 2026-09-07 | tech-lead | **계약 확정 — 4단계 종료.** `contract.yaml` 작성 + `docs/api/openapi.yaml` 병합 + `docs/api/error-codes.md` `admin` 섹션 등록 + `docs/features/auth/contract.yaml` 동기화 + `.env.example` 에 `DISCORD_WEBHOOK_URL` **정의만** 추가(C-4 — 값은 쓰지 않았다). 엔드포인트 **6개**(목록 2 / 상태 전이 4) + `GET /api/v1/auth/me` 확장 1(선택 필드 `pending_approval_count`). **PRD 열린 질문 4·5 종결** — 정지의 세션 반영은 현행 유지(최대 30분, `auth` 계약 변경 없음), 오류 코드는 신규 3개. **breaking 없음.** AC 34개 전부 배정, 미커버 0. 커서 페이지네이션 규약을 이 저장소의 첫 선례로 확정. `design.md` 보강 요청 4건을 D-1~D-4 로 남겼다. **`make contract-check` 는 실행하지 못했다 — ASK 6** |
| 2026-09-09 | server-developer | **서버 구현 완료 — 5단계(백엔드 구현) 종료.** `contract.yaml` 의 엔드포인트 **7개(관리자 6 + `GET /auth/me` 확장)** 전부 구현, 미구현 0. 계약에 없는 엔드포인트 노출 0. **선행 작업**으로 `nearby-places` 의 기존 결함을 고쳐 게이트를 초록으로 되돌렸다 — `PlaceController` 의 `@Parameter(schema = @Schema(...))` 가 `type` 을 비워 두는 바람에 springdoc 이 `radius`·`size`·`sort` 를 `type: string` 으로 내보내고 `default` 를 떨어뜨리고 있었다(런타임은 정상, 스펙만 어긋남). 계약이 아니라 구현을 고쳤고 규칙 **S-32** 로 남겼다. **게이트 실행 결과** — `make lint-server` 통과 / `make test-server` 통과 / `make contract-check` **통과**(파괴적 변경 0, 미구현 0, 미문서화 0). `pending_approval_count` 경고 2건은 구현으로 사라졌다. **로컬 스모크 확인**(임시 DB + `bootRun`, 계약 문서에 없는 값은 만들지 않음): 목록 2·상태 전이 5·커서 페이지네이션·403/404/409/400 분기·정지 후 `refresh` 403 `AUTH_ACCOUNT_SUSPENDED`·삭제 전용 토큰의 공통 `FORBIDDEN`·`DISCORD_WEBHOOK_URL` 미설정 시 발송 생략 + 가입 201 유지까지 전부 기대대로. **규칙 3건 추가** — S-32(springdoc 파라미터 스키마) · S-33(커서 페이지네이션) · S-34(역할 기반 인가), 그리고 server.md 의 "미확정 — 인가 모델" 을 닫았다. **ASK 6 종결** |
| 2026-09-09 | server-reviewer | **PASS — `[MUST]` 위반 0건.** 워킹트리 `server/` 변경분 전체(신규 `admin` 패키지 22파일 + `auth`/`common` 신규 5 + 수정 10 + 마이그레이션·시드 2)를 conventions·계약·AC·`error-codes.md` 로 대조했다. **넘어온 설계 판단 3건 전부 규칙 위반 아님** — ① 액세스 토큰 `role` 클레임: S-17 이 금지하는 것은 **검증을 대체하는 커스텀 필터**이고 이번 변경은 검증(oauth2-resource-server)을 그대로 두고 기본 변환기 결과에 `ROLE_*` 를 **더할** 뿐이다. S-17 의 스코프 불릿이 `SCOPE_*` 로 같은 패턴을 이미 허용한다. 역할 없는 토큰은 403 으로 **닫히는 쪽 실패**, 발급 지점 2곳 모두 DB 의 `user.role()` 사용. ② `processed_at` 컬럼 저장: 계약은 응답 필드만 규정하고 저장 형태는 자유. `status` 를 바꾸는 코드가 `User` 안 6곳(가입 + 전이 5)뿐이고 전이 5개가 전부 `touchProcessed`/`processedAt=null` 을 지나므로 상태와 갈라질 경로가 없다. 기존 행 보정(`V3:34-36`)도 있다. ③ `ForbiddenCodeResolver`: S-27 과 같은 해법이고 의존 방향이 `admin → common` 한쪽 — ArchUnit 확인. **계약 대조 전항 일치** — 커서 페이지네이션(오프셋 0·동률 `user_id` DESC·`limit+1`·불투명 커서 400) · 신규 오류 코드 3개뿐(전이 5종이 `requireStatus` 한 곳에서 공유) · 거절 사유 200자 `SIZE`+`rejection_reason` · 거절 취소가 사유를 비움(D-3) · 정지 해제가 승인 시각 갱신(D-2) · 처리자 미노출(ASK 4) · 리프레시 미폐기 및 매 요청 상태 확인 미도입 · `pending_approval_count` 가 `PendingApprovalCounter` 한 곳 계산(C-8/AC-32) · `snake_case` 전수 확인 · `${DISCORD_WEBHOOK_URL:}` 참조만(C-4/S-28). **리뷰어 실행 게이트**: `make lint-server` 통과 / `make test-server` 통과 / `make contract-check` **통과**(ERR 0, admin 관련 warning·info 0건). `[SHOULD]` 3건(`errors[].code=RANGE` 미등록 · Discord 발송의 `RestClientException` 한정 catch · 재시도 간격 없음)과 규칙 근거 없는 참고 5건은 `review/server.md`. `defects.md` 를 새로 만들고 결함 0건 + 타 역할 요청 2건(R-1 카탈로그, R-2 S-31↔S-28 문면 충돌)을 기록했다. **재작업 카운터 0 유지** |
| 2026-09-09 | mobile-developer | **모바일 구현 완료 — 6단계(프론트) 종료.** `design.md` 의 화면 18개(`Screen 17a`~`21d`)와 4가지 상태를 전부 구현했다. 신규 DS 컴포넌트 5개(`shared/ui` 의 `Segmented`·`StatusBadge`·`UserListRow`·`EmptyState`·`BottomSheet`) + 기능 코드 `features/admin-user-approval/`(api·hooks·components·screens·messages·format). **문구는 §9 표에서만 가져왔고 서버가 내리는 문자열(가입 사유 대체 문구·상태 배지 라벨·시각 접두어·대기 건수)은 앱 코드에 없다** — "입력하지 않음" 은 어디에도 나타나지 않는다 (C-8 / M-18). 진입점은 설정의 `관리자` 섹션뿐이고 하단 탭바는 손대지 않았다(결정 1). `SettingsScreen`(auth 소유)은 슬롯 prop 만 받고 조합은 `app/navigation/MainNavigator.tsx` 가 한다(M-2 / §4.7). 목록은 커서 페이지네이션(`useInfiniteQuery`, `has_next` 근거)이고 대기 건수는 서버 값 그대로다(±1 금지). 처리 후에는 두 목록과 `GET /auth/me` 를 무효화해 재조회한다(§5.11 / AC-32). 오류는 `code` 로만 분기 — `ADMIN_FORBIDDEN` → §5.10 권한 없음 블록 + 역할 재조회, `ADMIN_USER_ALREADY_PROCESSED` → §6.8 시트 안 배너 + 목록 재조회, `ADMIN_SELF_SUSPEND_FORBIDDEN` → §7.6 배너, `VALIDATION_FAILED`+`rejection_reason` → 필드 오류. **`NOT_FOUND`(D-1)는 명세가 없어 M-13 일반 오류로 두고 화면을 지어내지 않았다.** **pen 대조 실시** — `Screen 01` 과 `Section — Admin List & Sheet`(`cQPEw`)의 정의를 읽어 세그먼트(테두리 1 · 선택 칸 라운드 9 · 칸 간격 4 · 라벨 600/500) · 상태 배지(패딩 `[3,10]` · Caption 600) · 카드(자식 간격 8 균일) · EmptyState(패딩 `[40,0]`) · 시트 제목(H2 700)을 pen 값으로 고쳤다. **신규 색 토큰 0개** — 세그먼트 그림자만 pen 의 effect 값으로 `boxShadow.segment` 를 추가했다(M-16 이 허용하는 "pen 에 있는 값으로 토큰 추가"). **게이트 실행 결과** — `make lint-mobile` 통과 / `make test-mobile` 통과(16 suites · 151 tests) / `make verify-mobile` 통과. 스모크 2건만 추가했고 AC 검증은 mobile-tester 몫으로 남겼다. **`design.md` 와 pen 의 불일치 1건 발견** — 상태 배지 패딩(md §3.4 `[2,8]` ↔ pen `[3,10]`). C-9 에 따라 pen 을 따랐고 md 정정은 ux-designer 몫이다 |
| 2026-09-09 | server-tester | **PASS — 서버 트랙 종료.** 통합 테스트 **8클래스 · 75건** 추가(`server/src/test/java/com/planbee/api/admin/`), 실패 0. 계정을 만드는 경로는 `auth` 의 `AuthApiTestBase` 를 물려받아 한 벌로 유지했다(그 클래스를 `public` 으로만 바꿨다 — 픽스처가 두 벌이면 두 테스트가 서로 다른 사실을 검증한다). **상태는 SQL 이 아니라 실제 엔드포인트로 만든다** — `status` 만 바꾸면 `processed_at` 이 `NULL` 로 남아 처리 완료 목록의 정렬 키가 조용히 깨진다(V901 이 실제로 밟은 함정). **AC 판정: 서버 책임 22개 통과 / 앱 전용 6개(AC-8·9·14 및 AC-1·2·16 의 화면 부분) 해당없음(모바일) / AC-26·AC-28 미검증.** 덮은 것 — 커서 페이지네이션 실순회(1·2건씩 끝까지, 중복·누락 0)와 `page_size` 경계(1·50 통과 / 0·51·-1 → 400) · **동률 깨기**(같은 마이크로초 행 3건을 일부러 만들어 `user_id` DESC 확인, 한 건씩 훑어 경계를 세 번 넘김) · 깨진 커서 4종 → 400 `MALFORMED_REQUEST` · 목록을 보는 중 앞이 처리돼도 건너뛰지 않음 · 처리 완료 목록에 `APPROVED`·`SUSPENDED`·`REJECTED` 가 라벨·접두어와 함께 옴 · 거절 사유가 어떤 응답에도 새지 않음 · 전이 5종의 409 가 **같은 코드 하나**(`ADMIN_USER_ALREADY_PROCESSED`)이고 5종 모두 대상 없음 404 · 자기 정지 403 `ADMIN_SELF_SUSPEND_FORBIDDEN` · 거절 사유 200자 통과 / 201자 400 + `errors[].field="rejection_reason"` · D-3(거절 취소가 사유를 비움) · D-2(정지 해제가 승인 시각 갱신) · 인가 3분기를 **관리자 경로 7개 전부**에 대해(`USER` → `ADMIN_FORBIDDEN` / 삭제 전용 토큰 → 공통 `FORBIDDEN` / 미인증·깨진 토큰 → `UNAUTHORIZED`) · `pending_approval_count` 를 **다섯 곳에서 한 시점에 모아 비교**(AC-32) · 정지 후 `refresh` 403 + `account_status`(SUSPENDED)이고 **리프레시 토큰은 폐기되지 않음** · AC-33·34(가입 사유 없는 신청) · AC-29(Webhook 미설정에서 가입 201, 서버 정상). **server-reviewer 가 넘긴 `processed_at` 불변식**을 `assertProcessedAtInvariant()` 한 줄로 만들어 전이마다 호출했다 — 다섯 상태 조합이 어긋나면 즉시 실패한다. **Discord 는 WireMock 으로만 본다**(AC-27·30·31·32). 실제 발송(AC-26·AC-28)은 계층 규칙상 여기서 검증하지 않으며 사람이 `make webhook-check` 로 확인한다 — `미해결` 절 참조. **게이트 실행 결과** — `make test-server-db` 통과(전체 150건·실패 0, 그중 admin 75건) / `make lint-server` 통과(`--rerun-tasks` 로 재실행 확인). **`defects.md` 에 올릴 결함 0건** — 구현이 계약·AC 와 어긋난 지점을 찾지 못했다. 재작업 카운터 0 유지. `server/src/main` 은 건드리지 않았다 |
| 2026-09-09 | mobile-reviewer | **FAIL — `[MUST]` 결함 2건.** 워킹트리 `mobile/` 변경분 전체(신규 23파일 — 기능 17 + `shared/ui` 5 + `shared/api/queryKeys.ts` — 와 수정 7파일)를 conventions(M-23·M-24 포함)·`design.md`·`contract.yaml`·`status.md` 결정 기록·`error-codes.md`(admin)로 대조했다. **DEF-M01** — `PendingUserSheet` 의 거절 사유 입력 단계에서 §6.8 "이미 처리됨" 이 절반만 구현됐다. `conflict` 로 액션을 "닫기" 하나로 바꾸는 처리가 기본 단계 분기에만 있어, 거절 단계에서는 배너가 떠도 "거절하기" 가 활성으로 남고 다시 누르면 같은 409 를 받는다 — §6.8 이 "남겨 두면 다시 눌러 같은 오류를 받는다" 며 금지한 그 동작이고, **409 는 승인보다 거절에서 더 자주 나오므로 결함이 있는 쪽이 주 경로다**(M-6 / AC-12). `ProcessedUserSheet` 의 `blocked` 가 같은 요구를 이미 올바르게 구현했다. **DEF-M02** — 사유 주석 없는 타입 단언 4곳(M-9). `errorKind as Exclude<…>` 2곳은 이른 반환으로 이미 걸러지므로 상태 타입을 좁히면 단언이 사라지고, `initialPageParam` 2곳은 불가피하므로 `a11y.tsx:56` 선례대로 사유 주석을 달면 된다. **넘어온 판단 4건은 전부 규칙 위반 아님** — ① 403 `ADMIN_FORBIDDEN` → §5.10 권한 없음 화면(design.md §2.3·§5.10, contract 403 표, error-codes.md 가 모두 그렇게 지정. §6.7 배너였다면 그쪽이 위반) · ② `NOT_FOUND`(D-1) M-13 일반 오류(계약·카탈로그 명시. 화면을 지어냈다면 M-7 위반) · ③ 미구현 연출 2건은 **근거 규칙이 없어 등급을 매기지 않는다**(절대 규칙 2) — reanimated 미도입은 M-19·절대 규칙 8 상 옳고, 완료 낭독은 `Toast` 가 대신한다 · ④ 배지 패딩은 C-9·M-16 상 pen(`[3,10]`)이 기준. **계약·명세 대조 전항 일치** — 탭바 미변경 · `role==='ADMIN'` 일 때만 렌더(로딩·실패에도 미렌더로 AC-2 깜빡임 없음) · 섹션 위치(계정 다음·약관 앞) · "처리 완료"(“처리됨” 코드 0건) · 목록 행에 버튼 없음 · 대기 건수를 세지도 ±1 하지도 않고 재조회 · 설정 한 영역 호출 1회(슬롯으로 응답 전달) · 오류 분기가 `code` 로만(엔드포인트·상태·문구 분기 0) · 커서 불투명 + `has_next` 근거 · **"입력하지 않음" 문자열 앱 코드 0건** · 경계 타입은 생성물 `schema.ts` 만 사용 · §9 문구 전수 일치 · 4가지 상태 × 세그먼트 독립 · M-2/M-21/M-23/M-24 · `Platform.select` 양쪽 키. **리뷰어 실행 게이트**: `make lint-mobile` 통과 / `npx tsc --noEmit` 통과(ESLint 가 잡는 항목은 리포트에 쓰지 않았다 — 절대 규칙 3). `[SHOULD]`·참고 4건과 타 역할 요청 3건(R-M1 md 패딩 정정 · R-M2 §5.11·§6.6 연출 명세 정리 · R-M3 M-20 양쪽 분기 테스트)은 `review/mobile.md`. **재작업 카운터 mobile-developer 0 → 1** |
| 2026-09-09 | mobile-developer | **재작업 1회차 완료 — DEF-M01·DEF-M02 조치.** 리뷰어가 지적한 두 결함만 고쳤고 문구·계약·화면 구성은 건드리지 않았다(`review/mobile.md` 의 권고). **DEF-M01** — `PendingUserSheet` 의 경합(`conflict`) 액션 영역을 `closeAction` 하나로 뽑아 **기본 단계와 거절 사유 입력 단계 두 분기 모두**에 걸었다. 이제 409 `ADMIN_USER_ALREADY_PROCESSED` 뒤에는 단계와 무관하게 `Button/Secondary "닫기"` 하나만 남고 "거절하기"·"뒤로" 가 사라진다(§6.8 / AC-12). 정보 블록·대상 이메일·입력한 거절 사유는 그대로 둔다 — 어떤 신청이었는지 확인할 수 있어야 한다. `ProcessedUserSheet.tsx` 의 `blocked` 와 같은 형태다. 재리뷰·테스트용으로 닫기 버튼에 `testID="admin-conflict-close"` 를 달았다. **DEF-M02** — 단언 4곳 중 **2곳은 삭제**했다. `errorKind` 상태 타입을 `useState<Exclude<ActionErrorKind, 'forbidden'> | null>` 로 좁히자(`PendingUserSheet`·`ProcessedUserSheet`) `run()` 의 이른 반환이 `forbidden` 을 이미 걸러 주므로 `setErrorKind(kind)` 가 단언 없이 통과하고, 배너에 넘기는 값도 `bannerKind` 지역 변수로 뽑아 `as` 없이 타입이 맞는다. 나머지 **2곳(`useUserApproval.ts` 의 `initialPageParam`)은 react-query 의 `pageParam` 추론을 넓히는 관용구라 불가피**하므로 M-9 가 요구하는 사유 주석을 `shared/lib/a11y.tsx:56` 선례 형식으로 달았다. `mobile/src` 밖은 손대지 않았다(`server/`·`.pen` 무수정). **게이트 실행 결과** — `npx tsc --noEmit` 통과(타입 좁히기가 실제로 컴파일됨) / `make lint-mobile` 통과 / `make test-mobile` 통과(16 suites · 151 tests · 실패 0). **재작업 카운터는 mobile-reviewer 가 이미 1로 올려 두었으므로 그대로 둔다.** 넘겨받은 판단 4건(403→§5.10 · `NOT_FOUND`→M-13 · 미구현 연출 2건 · 배지 패딩 pen 채택)은 리뷰어가 "결함 아님" 으로 확인해 되돌리지 않았다 |
| 2026-09-09 | mobile-reviewer | **PASS — 재리뷰(재작업 1회차 검증). 6단계 모바일 코드 규칙 종료.** 재작업이 건드린 3파일(`PendingUserSheet.tsx`·`ProcessedUserSheet.tsx`·`useUserApproval.ts`)을 읽고 **DEF-M01·DEF-M02 의 해소를 코드로 확인**했다. **DEF-M01** — 경합 액션이 `closeAction` 하나로 뽑혀 기본 단계(`160`)와 거절 사유 입력 단계(`228`) **두 분기 모두**에서 쓰인다. 경합 뒤 `거절하기`·`뒤로` 는 비활성이 아니라 **JSX 에서 제거**되고, `run()` 을 다시 부를 수 있는 경로 셋(액션 버튼 · 배너 "다시 시도" `onRetry={conflict ? undefined : …}` · 안드로이드 백 `setStep('detail')`)을 전수 확인해 **같은 409 로 되돌아갈 길이 없음**을 확인했다 — 백으로 돌아간 기본 단계도 `conflict` 가 참이라 `closeAction` 만 그린다. §6.8 이 남기라고 한 정보 블록·대상 이메일·입력한 거절 사유는 남아 있다(§6.8 / M-6 / AC-12). **DEF-M02** — 단언 2곳이 실제로 사라졌다(상태 타입 `useState<Exclude<ActionErrorKind,'forbidden'> \| null>`; 배너 인자 `bannerKind` 는 **타입 주석**이지 단언이 아니라 검사를 우회하지 않는다). 남긴 2곳(`useUserApproval.ts:50-53·63-64`)에는 "왜 불가피한지 + `(M-9)` 인용" 주석이 붙어 `a11y.tsx:56` 선례와 같은 형식이다. **기능 디렉토리 전수 grep — 남은 단언은 그 두 줄뿐**이고 나머지는 `as const`(const 단언)·import 별칭이라 M-9 대상이 아니며 `any` 0건. 신규 `shared/ui` 5개와 `queryKeys.ts` 도 함께 확인. **회귀 없음** — 수정 파일이 3개뿐임을 파일 시각으로 확인했고, `code` 기반 분기(`actionError.ts` 무수정) · 403 → §5.10(두 시트의 이른 반환 + 화면 무수정) · §9 문구(`messages.ts` 무수정, 새 문구 0건 — `COMMON.close` 재사용) · 4가지 상태 × 세그먼트 · M-24 쿼리 키 · `Alert` 취소 우선 배치(M-20)를 다시 읽었다. **1차의 "결함 아님" 4건도 되돌리지 않았다**(403→§5.10 · `NOT_FOUND`→M-13 · 미구현 연출 2건 · 배지 패딩 pen `[3,10]`). **리뷰어 실행 게이트**: `make lint-mobile` 통과(exit 0) / `npx tsc --noEmit` 통과(exit 0) / 회귀 확인용 `make test-mobile` 통과(16 suites · 151 tests · 실패 0). **새 `[MUST]` 0건** — 1차에서 지적하지 않은 것을 새로 들고 나오지 않았다(절대 규칙 2·3). mobile-tester 요청 R-M4(경합 상태를 **두 단계 모두** 테스트로 고정 — 이번 회귀 지점) 추가, R-M1·R-M2·R-M3 은 열린 채 유지. **재작업 카운터 mobile-developer 1 유지**(PASS 이므로 올리지 않는다 — 상한 2회). 다음은 mobile-tester |
| 2026-09-09 | mobile-tester | **FAIL — `[MUST]` 결함 1건(`DEF-T01`).** `PRD.md` 의 AC 34개 중 **앱 화면 책임 22개**(design.md §11)를 기준으로 테스트 **8스위트 · 72건**을 추가해 실행했다(`mobile/src/features/admin-user-approval/__tests__/`). API 는 전부 msw 목킹이고 서버를 띄우지 않았다(절대 규칙 5 / M-11). 목 응답은 `contract.yaml` 의 example 을 근거로 만들었다. **판정: 통과 21 / 실패 1** — 위 `모바일 AC 판정표` 참조. **DEF-T01** — 목록을 이미 받아 놓고도 **뒤이은 요청이 실패하면 본문 전체가 §5.9 오류 블록으로 바뀐다.** react-query 무한 쿼리는 데이터가 있어도 `fetchNextPage`·새로고침 `refetch` 가 실패하면 상태를 `error` 로 만드는데, 화면이 `active.isError` 하나로 본문을 고르기 때문이다. 그래서 ⑴ 다음 페이지 로드 실패에서 §5.6 이 요구한 "이미 불러온 항목은 그대로 남는다" 가 깨지고 실패 푸터(`ListFooter` 의 `failed` 분기)는 **도달 불가능한 죽은 코드**이며(AC-7), ⑵ 새로고침 실패에서 §5.5 의 "기존 목록을 유지" 가 깨져 배너와 전체 오류가 동시에 뜬다(AC-9). 코드만 읽으면 `isFetchNextPageError` 와 `refreshFailed` 가 있어 구현된 것처럼 보이고 **실행해야 드러난다** — 제안은 전체 오류 블록의 조건을 `pages.length === 0` 으로 좁히는 것이다(판단은 개발자 몫). 증거로 `pendingList.test.tsx` 에 `test.failing` 2건을 남겼고, 고치면 통과로 바뀌므로 그때 `test` 로 되돌리는 것까지가 완료 조건이다(`auth` D-T1 선례). **덮은 것** — 진입점 3상태(ADMIN/USER/로딩·실패, AC-2 깜빡임 없음) · 세그먼트 2개 × 네 상태(로딩·정상·빈·오류)를 **세그먼트마다 독립으로**(§3.6) · 커서 페이지네이션(`next_cursor` 를 해석 없이 그대로 되돌려 보냄, `has_next` 가 거짓이면 더 부르지 않음) · 당겨서 새로고침(첫 페이지부터 · 빈 상태에서도) · 권한 없음 화면과 pop · 행 탭 → 시트(행에 버튼 없음) · 승인/거절 2단계/거절 사유 200자 경계(`userEvent` 로 `maxLength` 를 플랫폼과 같게)/사유 없이 거절(`{rejection_reason: null}`)/서버 필드 오류 · 정지·해제·거절 취소와 확인 다이얼로그 · 자기 계정 미제공(AC-25) · 오류 분기가 **`code` 로만**(`ADMIN_FORBIDDEN` → §5.10 / 409 → §6.8 / `ADMIN_SELF_SUSPEND_FORBIDDEN` → §7.6 / 그 외 → M-13 일반) · 가입 사유 빈 값의 서버 문자열 그대로 렌더(AC-33·34) · §9 문구 일치. **R-M4 완료**(`conflict.test.tsx` 5건 — 기본 단계·거절 사유 입력 단계·안드로이드 백 복귀 세 곳 모두에서 액션이 **제거**되고 `닫기` 하나만 남는지, 배너에 "다시 시도" 가 없는지, 즉시 재조회하는지). **R-M3 완료**(`platformIos` 5건 · `platformAndroid` 7건 — 키보드 회피 `padding`↔`height` 와 `default` 키 채움 · 시트 열림 시 스와이프 백 · `Alert` 취소 우선 배치 양쪽 · 하드웨어 백 3가지). **게이트 실행 결과** — `make lint-mobile` 통과(exit 0) / `npm --prefix mobile run typecheck` 통과(exit 0) / `make test-mobile` 통과(exit 0 — 24 suites · 223 tests · 실패 0. 기존 16·151 에서 +8 스위트 +72건, 기존 테스트 회귀 0). `mobile/src` 구현 코드는 건드리지 않았고 새로 만든 것은 `__tests__` 8파일뿐이다. 테스트 도구의 한계 3건(N-1 `RefreshControl` 색 prop · N-2 처리 중 하드웨어 백의 중간 상태 · N-3 스크림이 jest 에서 숨은 요소)은 `defects.md` 에 근거와 대안을 적었다. **재작업 카운터 mobile-developer 1 → 2 — 다음 왕복은 3회차라 `ESCALATE` 다** |
| 2026-09-09 | mobile-developer | **긴급 렌더 크래시 `DEF-C01` 수정 (재작업 2회차, 범위 한정).** 사람이 실기기에서 재현한 결함 — `가입 신청 관리` 에서 **`처리 완료` 세그먼트를 누르는 순간 화면 전체가 백지**가 되고 `Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?` 가 뜬다. **원인은 내비게이션 배선이 아니라 스타일 문자열이었다.** `shared/ui/Segmented.tsx` 가 선택 칸에만 `shadow-segment` 를 붙였는데, Tailwind 는 그림자 유틸리티를 CSS 변수(`--tw-shadow`)로 컴파일한다. 첫 렌더에 변수가 없던 `처리 완료` 칸에 선택 시 변수가 처음 생기자 NativeWind 가 이를 "업그레이드"로 보고 개발 빌드 경고(`react-native-css-interop` `render-component.js` 의 `printUpgradeWarning`)를 찍었고, 그 경고가 `JSON.stringify` 로 props 를 훑다가 React Navigation `NavigationStateContext` 기본값의 **던지는 getter**(`get getKey(){throw}`)를 건드려 경고가 **렌더 오류**로 바뀌었다. 그래서 오류 문구는 내비게이션을 가리키는데 화면 등록·컨테이너·패키지 중복에는 아무 문제가 없었다. `state.canUpgradeWarn` 이 첫 렌더에는 `false` 라서 **화면 진입은 멀쩡하고 세그먼트를 바꿀 때만** 죽는 것도 이 경로로 설명된다. **조치** — 비선택 칸에 `shadow-none` 을 준다(같은 변수를 투명값으로 미리 선언). 시각 결과는 동일하고 화면 구성·문구·계약·계약 타입은 건드리지 않았다. 수정 파일은 `mobile/src/shared/ui/Segmented.tsx` 한 개. **같은 함정을 `docs/conventions/mobile.md` 에 `M-25`(CSS 변수를 만드는 유틸리티를 조건부로 붙였다 뗐다 하지 않는다) `[MUST]` 로 등록**했고 `mobile/src` 전수 grep 결과 이 패턴을 쓰는 다른 곳은 없다. **회귀 테스트** — `mobile/src/shared/ui/__tests__/Segmented.test.tsx` 2건(스모크 + 비선택 칸의 그림자 유틸리티 고정). 고치기 전 상태로 되돌려 **실제로 실패하는 것까지 확인**했다. 본격 AC 검증은 mobile-tester 몫으로 남겼다. **실기기 확인(iPhone 17 시뮬레이터 · Maestro)** — 로그인 → 마이 → 설정 → 가입 신청 관리 진입(목록 1건 정상) → `처리 완료` 전환(4건 · 배지·처리 시각 정상) → 세그먼트 왕복 3회 → 행 탭으로 시트 열림까지 스크린샷으로 확인, `javascript` 카테고리 로그에 error/warn 0건. **게이트 실행 결과** — `make lint-mobile` 통과 / `npx tsc --noEmit` 통과 / `make test-mobile` 통과(25 suites · 225 tests · 실패 0). **`DEF-T01` 은 이번 작업 범위가 아니라 그대로 열려 있다** — 그 수정은 §5.9 오류 블록의 표시 조건을 바꾸는 화면 구성 변경이라 이번 크래시 수정과 섞지 않았다. **재작업 카운터는 2 그대로 둔다**(이 결함으로 새로 올리지 않았다) |
