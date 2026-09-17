# 모바일 리뷰: `admin-user-approval` — **FAIL**

- 리뷰 일자: 2026-09-09
- 리뷰 대상: 워킹트리의 `mobile/` 변경분 전체 (수정 7파일 + 신규 23파일)
  - 신규 기능 `mobile/src/features/admin-user-approval/` 17파일
  - 신규 DS 컴포넌트 `shared/ui/` 5개 (`Segmented` · `StatusBadge` · `UserListRow` · `EmptyState` · `BottomSheet`)
  - 신규 `shared/api/queryKeys.ts`
  - 수정 `app/navigation/{MainNavigator,types}.tsx` · `features/auth/screens/SettingsScreen.tsx` ·
    `shared/lib/a11y.tsx` · `shared/ui/ListRow.tsx` · `shared/ui/tokens.ts` · `tailwind.tokens.js`
- **대상 밖**: `server/`(다른 역할이 작업 중), `mobile/ios/Podfile.lock`(빌드 산출물)
- 판정 근거: `docs/conventions/mobile.md`(M-23·M-24 포함) · `docs/conventions/common.md` ·
  `design.md` · `contract.yaml` · `status.md` 결정 기록 · `docs/api/error-codes.md`(admin)

## 판정

**FAIL — `[MUST]` 위반 2건.** 둘 다 수정 범위가 작다(각각 한 분기 · 네 줄).
재작업 카운터는 이 리뷰로 **mobile-developer 1회**가 된다 (상한 2회).

리뷰어가 직접 실행한 게이트:

| 게이트 | 결과 |
|---|---|
| `make lint-mobile` | 통과 (ESLint 지적 0) |
| `npx tsc --noEmit` | 통과 |

**ESLint 가 잡은 것은 이 리포트에 쓰지 않았다** (절대 규칙 3). 아래 지적은 전부
린터가 판정할 수 없는 항목이다.

---

## `[MUST]` 결함

### 1. 거절 사유 입력 단계에서 §6.8 "이미 처리됨" 상태가 절반만 구현됐다

- **등급**: `[MUST]`
- **근거 규칙**: `mobile.md` M-6 (모든 데이터 화면은 로딩/정상/비어있음/**오류**를 구현한다) —
  이 시트의 오류 상태는 `design.md` §6.9 가 **§6.7 처리 실패 + §6.8 이미 처리됨** 둘로 정의한다.
  해당 AC 는 **AC-12**.
- **위치**: `mobile/src/features/admin-user-approval/components/PendingUserSheet.tsx:170-231`
  (특히 액션 영역 `209-229`)

`conflict` 가 참일 때 액션 영역을 `닫기` 하나로 교체하는 처리가 **기본 단계(`step === 'detail'`)
분기에만** 있다 (`138-143`). 거절 사유 입력 단계(`step === 'reject'`)에서는 배너만 뜨고
`거절하기` · `뒤로` 버튼이 그대로 남아 활성 상태다.

```tsx
// 138-143 (detail 단계) — 여기에는 있다
{conflict ? (
  <View className="mt-6"><Button label={COMMON.close} onPress={onClose} variant="secondary" /></View>
) : ( ...승인/거절... )}

// 209-229 (reject 단계) — conflict 를 보지 않는다
<Button label={REQUEST_SHEET.rejectConfirm} ... onPress={() => run('reject')} />
```

**왜 문제인가.** 409 `ADMIN_USER_ALREADY_PROCESSED` 는 승인보다 **거절에서 더 자주 나온다** —
거절은 반드시 이 단계를 거치기 때문이다. 즉 결함이 있는 쪽이 이 코드의 주 경로다.
`design.md` §6.8 은 이 상황을 이렇게 못 박았다.

> **승인·거절 버튼을 제거한다.** 남겨 두면 다시 눌러 같은 오류를 받는다.

지금 코드에서는 관리자가 "이미 처리된 신청이에요" 배너를 본 뒤에도 `거절하기` 를 다시 누를 수 있고,
누르면 같은 409 를 받아 `setConflict(true)` + `refreshLists()` 가 반복된다.
개발자가 detail 분기에 남긴 주석(`139`)이 이 요구를 정확히 인용하고 있어, 요구를 몰랐던 것이 아니라
**두 번째 분기로 옮기지 않은 것**으로 보인다.

- **기대**: `conflict` 가 참이면 단계와 무관하게 액션 영역이 `Button/Secondary "닫기"` 하나가 된다
  (§6.8). 정보 블록·대상 이메일은 그대로 둔다 — 어떤 신청이었는지 확인할 수 있어야 한다.
  배너에 "다시 시도" 를 붙이지 않는 현재 처리(`101`)는 맞다.
- **참고**: `ProcessedUserSheet.tsx:115` 의 `blocked` 는 같은 요구를 올바르게 구현했다.
  같은 형태를 이 시트에도 두면 된다.

### 2. 사유 주석 없는 타입 단언 4곳

- **등급**: `[MUST]`
- **근거 규칙**: `mobile.md` M-9 (`any`, **근거 없는 `as` 를 쓰지 않는다. 불가피하면 사유 주석을 단다**)
- **위치**
  - `components/PendingUserSheet.tsx:99`
  - `components/ProcessedUserSheet.tsx:103`
  - `hooks/useUserApproval.ts:50`
  - `hooks/useUserApproval.ts:60`

```tsx
kind={conflict ? 'conflict' : (errorKind as Exclude<ActionErrorKind, 'forbidden'>)}
initialPageParam: undefined as string | undefined,
```

두 종류가 성격이 다르므로 처리도 다르다.

- **앞의 둘은 단언 자체가 불필요하다.** `run()` 안에서 `if (kind === 'forbidden') { onForbidden(); return; }`
  로 이미 걸러내므로(`PendingUserSheet.tsx:74-77`), 상태 타입을
  `useState<Exclude<ActionErrorKind, 'forbidden'> | null>` 로 좁히면 TypeScript 가 이른 반환으로
  `kind` 를 알아서 좁혀 준다. `as` 가 사라진다. M-9 의 "불가피하면" 에 해당하지 않으므로
  주석으로 넘길 수 있는 항목이 아니다.
- **뒤의 둘은 불가피하다** (react-query 의 `pageParam` 추론을 넓히는 관용구). 그렇다면 M-9 가
  요구하는 **사유 주석**이 있어야 한다. 같은 저장소의 `shared/lib/a11y.tsx:56-57` 이 정확히
  그 형태로 M-9 를 인용해 주석을 달아 두었다 — 그 기준을 여기에도 맞추면 된다.

---

## mobile-developer 가 넘긴 4개 지점 — 판정

### ① 403 `ADMIN_FORBIDDEN` 을 §5.10 권한 없음 화면으로 보낸 것 — **맞다. 결함 아님**

명세가 그렇게 지정하고 있고, 오히려 §6.7 일반 배너로 처리했다면 그쪽이 위반이다.

| 문서 | 문장 |
|---|---|
| `design.md` §2.3 전이표 | "UserApprovalList / 403 수신 → 화면에 머물며 §5.10 권한 없음 상태 — AC-3" |
| `design.md` §5.10 | "역할이 바뀐 뒤 화면이 남아 있는 등의 이유로 **서버가 403 을 낸 경우**" — 목록 조회로 한정하지 않는다 |
| `contract.yaml` `POST /suspend` 403 표 | `ADMIN_FORBIDDEN` → **권한 없음 화면 (design.md §5.10)** / `ADMIN_SELF_SUSPEND_FORBIDDEN` → 시트 안 배너 |
| `error-codes.md` admin | `ADMIN_FORBIDDEN` 의 모바일 처리 = "목록 화면의 **권한 없음 블록**" |

구현(`actionError.ts:36` → `UserApprovalListScreen.tsx:85·153-156`)은 **엔드포인트가 아니라 `code`**
로 갈랐다. 계약이 "호출한 엔드포인트가 무엇이었는지로 분기하면 분기 근거가 `code` 밖으로 나간다(C-1)"
고 적은 것과 정확히 같은 방향이다. `§5.10` 진입 시 `ACCOUNT_QUERY_KEY` 를 무효화해 설정의 진입점을
갱신하는 처리(`UserApprovalListScreen.tsx:88-92`)까지 §5.10 마지막 줄을 지켰다.
시트를 닫는 것은 명세에 명시가 없지만, §5.10 이 **화면 전체 상태**이므로 그 위에 시트를 남기는
편이 명세와 어긋난다.

### ② `NOT_FOUND`(D-1)를 M-13 일반 오류로 떨어뜨린 것 — **맞다. 결함 아님**

화면을 지어내지 않은 것이 옳다. 세 문서가 같은 처리를 지정한다.

- `contract.yaml` `responses.AdminUserNotFound`: "design.md 에 이 상황의 화면이 정의돼 있지 않다 …
  **보강 전까지 앱은 M-13 의 일반 오류 처리로 둔다**"
- `error-codes.md` admin "이 도메인이 만들지 않은 코드" 표: "**보강 전까지 일반 오류로 둔다**"
- `status.md` 문서 보강 요청 D-1 (열림, 담당 ux-designer)

`actionError.ts:40-42` 의 `default: 'server'` 가 그 처리다. 카탈로그에 없는 코드도 같은 자리로
떨어져 앱이 죽지 않는다 (M-13 마지막 불릿). **D-1 이 닫히기 전에 앱이 화면을 만들었다면 그쪽이
M-7 위반**이었을 것이다.

### ③ 미구현 연출 2건 — **`[MUST]` 아니다. `[SHOULD]` 도 아니다 (근거 규칙 없음). 차단하지 않는다**

`docs/conventions/` 에 애니메이션·포커스 이동을 요구하는 규칙이 없다. 절대 규칙 2 에 따라
지적하지 않고 아래 사실만 남긴다.

| 미구현 | 판정 근거 |
|---|---|
| §5.11 항목 제거 애니메이션 (200ms 페이드 + 높이 축소) | `mobile.md` "미확정 — 애니메이션: `react-native-reanimated` 는 아직 도입하지 않았다" 가 **문서에 남아 있는 상태**다. `design.md` §6.1 도 "새 애니메이션 라이브러리를 도입하지 않고 성립해야 한다" 고 적었고, 라이브러리 도입은 절대 규칙 8·M-19 상 사람에게 물어야 하는 결정이다. **도입하지 않은 판단이 규칙에 맞다.** 기능·문구·상태 전이에 영향이 없음을 코드로 확인했다 (처리 결과는 `refreshLists()` 재조회로 반영) |
| §6.6-5 "처리 후 그 자리의 다음 행으로 포커스" | 접근성 규칙은 M-10(터치 영역·레이블)과 M-20(낭독은 `shared/lib/a11y`)뿐이고 **포커스 이동 요구는 규칙에 없다.** 취소로 닫을 때 연 행으로 되돌리는 처리는 구현돼 있고(`UserApprovalListScreen.tsx:137-145`), 완료 사실은 `Toast` 가 `useAnnounceForAccessibility` 로 낭독한다(`shared/ui/Toast.tsx:22`) — §3.5 의 완료 announce 는 충족된다 |

두 건 모두 `design.md` 에는 있으나 규칙에는 없다. 남겨 둘 값어치가 있다고 보아
**아래 "다른 역할에 넘기는 요청" 에 기록**했다 (reanimated 도입 판단은 사람 몫).

### ④ 상태 배지 패딩을 pen(`[3,10]`)으로 따른 것 — **맞다. 결함 아님. md 정정은 ux-designer 몫**

`common.md` C-9 와 `mobile.md` M-16 이 같은 문장으로 이 상황을 이미 판정해 두었다.

> 코드 쪽 토큰 정의는 pen 의 값을 코드로 옮긴 것이다. **둘이 어긋나면 pen 을 기준으로 코드를 고친다.**

`StatusBadge.tsx:35-36` 이 pen `ZcirU` 값을 그대로 옮겼고 주석에 근거를 남겼다. 올바르다.
`design.md` §3.4 의 `[2, 8]` 은 **문서 쪽이 낡은 것**이므로 결함이 아니라 요청으로 넘긴다
(`docs/design/`·`design.md` 는 ux-designer 소유 — 디렉토리 소유권).
같은 판단으로 `tailwind.tokens.js` 의 `boxShadow.segment` 추가도 M-16 이 허용하는
"pen 에 있는 값으로 토큰 추가" 에 해당한다 — **신규 색 토큰 0개**를 확인했다.

---

## 계약·명세 대조 — 확인 결과 (위반 없음)

| 확인 항목 | 결과 | 근거 위치 |
|---|---|---|
| 하단 탭바 미변경 | ✅ `MainNavigator` 의 `MainTabs` 구성이 그대로다. 새 화면은 `MainStack` 에 push 되는 스택 화면 (결정 1 / §2.2) | `MainNavigator.tsx:115-122`, `navigation.ts:12-14` |
| `관리자` 섹션이 `role === 'ADMIN'` 일 때만 렌더 | ✅ 조회 중·실패(`account === undefined`)와 `USER` 는 `null` 반환 — 스켈레톤도 없다 (AC-2 / §4.3) | `AdminSettingsSection.tsx:36-38`, `SettingsScreen.tsx:94` (`me.isSuccess ? me.data : undefined`) |
| 섹션 위치 = `계정` 다음 · `약관·정책` 앞 | ✅ 슬롯 호출이 계정 `ListCard` 바로 뒤, `sectionLegal` 헤더 앞 (§1.2 a) | `SettingsScreen.tsx:88-96` |
| 세그먼트 라벨 "검토 대기 N" / **"처리 완료"** | ✅ "처리됨" 은 코드 어디에도 없다(`grep` 확인). 0이면 숫자를 붙이지 않는다 (§5.2) | `messages.ts:33-38` |
| 화면 제목 "가입 신청 관리" | ✅ | `messages.ts:33`, `UserApprovalListScreen.tsx:216-219` |
| 목록 행에 액션 버튼 없음 · 조작은 시트에서만 | ✅ `UserListRow` 는 `onPress` 하나뿐이고 버튼 슬롯이 없다 (결정 3) | `UserListRow.tsx:15-30` |
| `pending_approval_count` 를 세거나 계산하지 않음 | ✅ 설정 행·세그먼트 라벨 모두 서버 필드를 그대로 렌더. 처리 후에도 ±1 하지 않고 **재조회**한다 (C-8 / M-18 / AC-32) | `AdminSettingsSection.tsx:41-53`, `UserApprovalListScreen.tsx:77-82`, `useUserApproval.ts:111-117` |
| 설정 화면 한 영역에 호출 2회 없음 | ✅ 관리자 섹션은 `GET /auth/me` 응답을 슬롯으로 **넘겨받기만** 한다. 자기 쿼리를 부르지 않는다 (C-8 / M-23) | `SettingsScreen.tsx:38-45`, `MainNavigator.tsx:90-100` |
| 오류 분기가 `code` 로만 | ✅ 목록·시트 모두 `ApiError.code` 로만 갈랐다. HTTP 상태·`detail` 문자열·엔드포인트로 분기하는 코드가 없다 (C-1 / M-13) | `actionError.ts:27-43`, `UserApprovalListScreen.tsx:84-85·268-279` |
| 커서를 해석하지 않음 · `has_next` 가 다음 페이지 근거 | ✅ `next_cursor` 를 그대로 되돌려 보내고 `has_next` 가 거짓이면 커서를 버린다. 문자열을 파싱·가공하는 코드 없음 | `useUserApproval.ts:38-40`, `endpoints.ts:34-45` |
| 가입 사유 빈 값 처리 | ✅ **`"입력하지 않음"` 문자열이 앱 코드 어디에도 없다**(전수 `grep`). `signup_reason_text` 를 `null` 검사·삼항 없이 그대로 렌더 (AC-33 / §9.7) | `UserApprovalListScreen.tsx:166`, `PendingUserSheet.tsx:131` |
| 서버가 내리는 문자열을 앱이 만들지 않음 | ✅ 상태 배지 라벨(`status_label`)·시각 접두어(`processed_at_prefix`)를 인자로 받고, 앱은 톤과 시각 포맷팅만 한다 (§3.4 / §5.4 / C-8) | `StatusBadge.tsx:31-37`, `messages.ts:45-49` |
| API 필드 `snake_case` | ✅ 경계 타입은 전부 생성물 `schema.ts` 에서 가져오고(M-8) 요청 본문도 `rejection_reason` 그대로. 변환 매퍼 없음 (C-7 / M-17) | `types.ts:8-15`, `endpoints.ts:69` |
| 문구가 §9 와 일치 | ✅ §9.1~§9.6 의 키를 한 줄씩 대조했다. **불일치·창작 문구 0건.** 서버가 내리는 문구는 `messages.ts` 에 없다 (M-7) | `messages.ts` 전체 |
| 4가지 상태 (세그먼트별 독립) | ✅ 로딩(스켈레톤 3) / 정상 / 비어있음(세그먼트별 문구) / 오류(서버·네트워크·권한없음·새로고침 실패·페이지 실패). 세그먼트 컨트롤은 어떤 상태에서도 조작 가능 (M-6 / §3.6) | `UserApprovalListScreen.tsx:221-324` |
| 기능 경계 (M-2 / M-23) | ✅ `SettingsScreen`(auth 소유)은 `renderExtraSection` 슬롯만 받고, 조합은 `app/navigation/MainNavigator.tsx` 가 한다. `features/auth ↔ features/admin-user-approval` 직접 import 0건 | `SettingsScreen.tsx:33-45`, `MainNavigator.tsx:83-101` |
| 쿼리 키 (M-24) | ✅ `ACCOUNT_QUERY_KEY` 를 `shared/api/queryKeys.ts` 한 곳에 두고 양쪽이 같은 상수를 쓴다. 관리자 기능은 **무효화만** 하고 `setQueryData` 로 auth 캐시를 쓰지 않는다 | `queryKeys.ts:16`, `useUserApproval.ts:90-117` |
| `shared/ui` 승격 (M-21) | ✅ 올린 5개가 전부 pen `Section — Admin List & Sheet` 의 컴포넌트다. 기능 전용 조합(설정 섹션·시트 본문·푸터·스켈레톤)은 `features/.../components/` 에 남겼다 (§8.5) | `shared/ui/*.tsx` 5개, `features/.../components/` 7파일 |
| 상태 소유권 (M-4) | ✅ 서버 응답을 zustand 로 복사하지 않는다. `useState<OpenSheet>` 가 항목 스냅샷을 들지만 **§6.8 이 "목록을 다시 불러온 뒤에도 정보 블록은 그대로 둔다" 를 요구**하므로 캐시에서 파생하면 오히려 명세가 깨진다. 스냅샷은 시트를 닫으면 버려지고 어디에도 되쓰이지 않는다 — 캐시 이중화가 아니다 | `types.ts:24-26`, `UserApprovalListScreen.tsx:54` |
| 플랫폼 (M-19 / M-20) | ✅ `Platform.select` 2곳 모두 `default` 를 채웠다. `Alert` 버튼 배열은 취소를 첫 자리에 두어 양쪽 배치를 맞췄고, `RefreshControl` 은 iOS `tintColor` 와 Android `colors`·`progressBackgroundColor` 를 함께 넘긴다. 스크린리더 격리도 iOS·Android prop 을 함께 펼친다. **iOS 전용 네이티브 모듈·새 SDK 도입 0건**, 새 권한 0건 (절대 규칙 8 대상 없음) | `BottomSheet.tsx:126-128·173-184`, `ProcessedUserSheet.tsx:76-97`, `UserApprovalListScreen.tsx:420-429` |
| 낭독 (M-20 a11y 불릿) | ✅ 화면 코드에 `accessibilityLiveRegion` 을 직접 적은 곳이 없다. 전부 `shared/lib/a11y` 의 `A11yAnnouncement` / `Banner` / `Toast` 를 거친다 | `UserApprovalListScreen.tsx:99-113·346-348` |
| 터치 영역 (M-10) | ✅ 세그먼트 각 칸 `min-h-[44px]`, 목록 카드 `min-h-[72px]`, 설정 행 56. 아이콘 전용 버튼(스크림)에 `accessibilityLabel` 있음 | `Segmented.tsx:47`, `UserListRow.tsx:50`, `BottomSheet.tsx:132-138` |
| 생성물 수정 (M-8 / M-22) | ✅ `shared/api/schema.ts` 를 손대지 않았다. `fetch` 직접 호출 0건 — 전부 `request()` + `apiClient` | `endpoints.ts:7-45` |

---

## `[SHOULD]` · 규칙 근거 없는 참고 (차단하지 않는다)

| # | 무엇 | 등급 |
|---|---|---|
| S-1 | `BottomSheet.tsx:131` 의 스크림이 `bg-black/40` 이다. 값은 pen(`#00000066` = rgba(0,0,0,0.4))·§6.1 과 **일치**하고 M-16 이 금지하는 `#RRGGBB` 리터럴도 아니지만, `black` 은 `tailwind.tokens.js` 의 토큰이 아니라 Tailwind 기본 팔레트다. 같은 변경에서 그림자는 토큰(`boxShadow.segment`)으로 올렸으므로 스크림도 토큰(`colors.scrim` 등)으로 두면 기준이 한 곳으로 모인다. **M-16 의 문면을 어기지는 않아 지적이 아니라 제안이다** | 제안 (규칙 근거 없음) |
| S-2 | `UserApprovalListScreen.tsx:116-129` 의 새로고침은 재조회 **전에** 2·3페이지를 버린다(`trimToFirstPage`). §5.5 가 "이미 불러온 2·3페이지는 버린다" 를 요구하므로 맞지만, 그 새로고침이 **실패**하면 같은 절의 "기존 목록을 유지" 가 1페이지까지만 지켜진다. 두 문장이 서로 밀어내는 지점이라 구현 선택으로 본다 — 필요하면 §5.5 에 실패 시 동작을 한 줄 보태는 편이 낫다 | 참고 (ux-designer) |
| S-3 | `ListFooter` 의 `singlePage` 판정이 `pages.length <= 1 && !hasNextPage` 다. §5.6 은 "한 페이지로 끝남(**20건 미만**)" 이라고 건수로 적어, 첫 페이지가 정확히 20건이고 `has_next: false` 인 경우 두 문서 해석이 갈린다(푸터 없음 vs "모두 확인했어요"). 어느 쪽도 명세를 어기지 않는다 | 참고 |
| S-4 | `rowNodes`(`UserApprovalListScreen.tsx:138`)에 `user_id` 키가 계속 쌓인다. 화면이 pop 되면 함께 사라지므로 누수는 아니다 | 참고 |

---

## 다른 역할에 넘기는 요청 (결함 아님)

| # | 무엇 | 받는 역할 |
|---|---|---|
| R-M1 | **`design.md` §3.4 의 상태 배지 패딩 `[2, 8]` 을 pen `ZcirU` 의 `[3, 10]` 으로 정정**해 주세요. C-9·M-16 이 "어긋나면 pen 기준" 이라 구현은 pen 을 따랐고, 지금 문서만 낡은 상태다 | ux-designer |
| R-M2 | **`design.md` §5.11 의 항목 제거 애니메이션과 §6.6-5 의 "다음 행 포커스" 가 현재 구현에 없다.** 규칙 근거가 없어 결함으로 올리지 않았지만, 명세에 남아 있으면 다음 사람이 같은 판단을 다시 해야 한다. ⑴ 명세에서 조건부(“reanimated 도입 시”)로 완화하거나 ⑵ reanimated 도입 여부를 사람에게 물어 결정한 뒤 반영 — 둘 중 하나로 닫아 주세요 (절대 규칙 8: 심사 영향 SDK 판단은 사람) | ux-designer / 사람 |
| R-M3 | **M-20 의 "분기를 넣었으면 양쪽 분기를 테스트한다" 는 아직 채워지지 않았다.** 이번 변경의 플랫폼 분기는 4곳이다 — `BottomSheet` 의 `KeyboardAvoidingView behavior`(`126-128`), `sheetGestureEnabled`(`179-184`), `Alert` 버튼 배열(`ProcessedUserSheet.tsx:83-97`), `RefreshControl` 색 prop(`UserApprovalListScreen.tsx:420-429`). 개발자가 스모크 2건만 두고 AC 검증을 다음 단계로 넘겼으므로 **개발자 결함으로 잡지 않았다.** `auth` 의 `a11yAnnounceIos/Android.test.tsx` 선례대로 `Platform.OS` 를 목킹해 안드로이드 경로를 검증해 주세요 | mobile-tester |

---

## 재작업 후 확인 항목 (재리뷰 체크리스트)

1. `PendingUserSheet` 의 거절 단계에서 `conflict` 가 참이면 액션이 `닫기` 하나가 되는가 (결함 1).
2. `errorKind` 단언 2곳이 사라졌는가 / `initialPageParam` 2곳에 M-9 사유 주석이 붙었는가 (결함 2).
3. `make lint-mobile` · `make test-mobile` 재통과.

두 결함 모두 문구·계약·화면 구성에 손댈 필요가 없다. **다른 곳을 함께 바꾸지 않기를 권한다** —
이 리뷰에서 나머지는 전부 통과했다.

---

# 재리뷰 (재작업 1회차 검증): `admin-user-approval` — **PASS**

- 재리뷰 일자: 2026-09-09
- 재리뷰 대상: mobile-developer 가 재작업 1회차에서 고친 **3파일**
  - `components/PendingUserSheet.tsx` · `components/ProcessedUserSheet.tsx` · `hooks/useUserApproval.ts`
  - 나머지 기능 파일·`shared/ui` 5개·수정 7파일은 **재작업 뒤에도 변경되지 않았다**
    (파일 수정 시각 확인 — 위 3파일만 22:11~22:12, 나머지는 1차 리뷰 시점 그대로)
- 판정 근거: 1차와 같다 — `docs/conventions/mobile.md` · `docs/conventions/common.md` ·
  `design.md` · `contract.yaml` · `docs/api/error-codes.md`

## 판정

**PASS — `[MUST]` 위반 0건.** `DEF-M01` · `DEF-M02` 둘 다 해소를 확인했고,
새로 발생한 `[MUST]` 결함은 없다. 다음은 mobile-tester.

재작업 카운터는 **mobile-developer 1 그대로**다 (PASS 이므로 올리지 않는다).

리뷰어가 직접 실행한 게이트:

| 게이트 | 결과 |
|---|---|
| `make lint-mobile` | **통과** (exit 0, ESLint 지적 0) |
| `npx tsc --noEmit` | **통과** (exit 0) |
| `make test-mobile` (회귀 확인용) | **통과** (16 suites · 151 tests · 실패 0) |

---

## DEF-M01 — **해소 확인**

근거 규칙: `mobile.md` M-6 / `design.md` §6.8 / AC-12.

경합 뒤의 액션 영역이 `closeAction`(`PendingUserSheet.tsx:117-126`) 하나로 뽑혔고,
**두 분기 모두**에서 쓰인다.

| 단계 | 위치 | 확인 |
|---|---|---|
| 기본 (`step === 'detail'`) | `160-187` | `conflict ? closeAction : (승인/거절)` — 1차와 동일하게 정상 |
| 거절 사유 입력 (`step === 'reject'`) | `228-252` | `conflict ? closeAction : (거절하기/뒤로)` — **1차 결함이 사라졌다** |

`conflict === true` 일 때 거절 단계에서 `거절하기`(`admin-reject-confirm`)와 `뒤로` 는
JSX 트리에 아예 들어가지 않는다. 비활성화가 아니라 **제거**이므로 §6.8 의
"승인·거절 버튼을 제거한다. 남겨 두면 다시 눌러 같은 오류를 받는다" 를 문면대로 만족한다.

**같은 409 로 돌아가는 잔여 경로가 없는지 전수 확인했다.** `run()` 을 부를 수 있는 지점은 셋뿐이다.

1. 액션 버튼 → 위와 같이 두 분기 모두에서 제거됨.
2. 배너의 "다시 시도" → `onRetry={conflict ? undefined : …}` (`105`). 경합에는 붙지 않는다.
3. 안드로이드 하드웨어 백 → `onHardwareBack` 이 거절 단계에서 `setStep('detail')` 로 되돌리지만
   (`135`), 되돌아간 기본 단계도 `conflict` 가 참이라 `closeAction` 만 그린다 (`160`).
   **단계를 오가도 액션이 되살아나지 않는다.**

§6.8 이 남기라고 한 것도 남아 있다.

- 기본 단계: 정보 블록(이메일·가입 사유·신청 시각) `150-158` — `conflict` 와 무관하게 렌더된다.
  주석(`149`)이 그 이유를 명시한다.
- 거절 단계: 대상 이메일 블록(`201-203`)과 입력한 거절 사유(`206-225`)가 남는다.
  §6.8 의 "어떤 신청이었는지 확인할 수 있어야 한다" 를 이 단계의 구성으로 이행한 것이며,
  §6.8 이 열거한 "정보 블록" 은 `Screen 20e`(기본 단계)의 구성이므로 어긋나지 않는다.
- 배너에 "다시 시도" 를 붙이지 않는 처리(`105`)와 즉시 재조회(`87-88`)도 그대로다.

`ProcessedUserSheet.tsx:117` 의 `blocked` 와 같은 모양으로 맞춘 것도 확인했다 —
두 시트가 같은 요구를 같은 형태로 푼다.

`testID="admin-conflict-close"`(`123`) 추가는 규칙 위반이 아니다. M-12 는 **테스트가 무엇으로
쿼리하는지**에 관한 규칙이고, 이 기능의 다른 버튼(`admin-approve`·`admin-reject-confirm` 등)도
이미 같은 방식으로 `testID` 를 노출한다.

## DEF-M02 — **해소 확인**

근거 규칙: `mobile.md` M-9.

**단언 2곳은 실제로 사라졌다.**

- `PendingUserSheet.tsx:45` · `ProcessedUserSheet.tsx:39`
  → `useState<Exclude<ActionErrorKind, 'forbidden'> | null>(null)` 로 좁혔고,
  바로 위에 왜 `forbidden` 이 이 상태에 들어오지 않는지(`run()` 의 이른 반환) 주석이 있다.
- 두 파일의 `setErrorKind(kind)`(`91` / `72`)가 `as` 없이 통과한다 —
  `forbidden`(`76` / `63`)과 `conflict`(`85` / `67`)를 이른 반환으로 걸러낸 뒤이기 때문이다.
  `npx tsc --noEmit` 통과가 이 좁히기가 **컴파일러가 실제로 인정하는 것**임을 보인다.
- 배너로 넘기는 값은 `const bannerKind: Exclude<ActionErrorKind, 'forbidden'> | null =
  conflict ? 'conflict' : errorKind;`(`98` / `102`)로 뽑혔다. 명시적 타입 주석이지 단언이 아니다 —
  **컴파일러 검사를 우회하지 않으므로 M-9 의 대상이 아니다.**

**남긴 2곳은 M-9 가 요구하는 형태의 사유 주석이 붙었다.**

| 위치 | 주석 | 판정 |
|---|---|---|
| `useUserApproval.ts:50-53` | "초기값을 그냥 `undefined` 로 두면 react-query 가 `pageParam` 타입을 `undefined` 로 못 박아 getNextPageParam 이 돌려주는 커서 문자열과 어긋난다. 타입을 넓히는 수단이 이 단언뿐이라 남긴다 (M-9)" | 무엇이 문제이고 왜 다른 수단이 없는지 + 규칙 번호 인용 → **M-9 충족** |
| `useUserApproval.ts:63-64` | "위 usePendingUsers 와 같은 이유의 단언이다 — 초기 커서 타입을 넓힐 다른 수단이 없다 (M-9)" | 같은 사유를 참조 + 규칙 번호 인용 → **M-9 충족** |

선례로 지목한 `shared/lib/a11y.tsx:56-57` 과 같은 형식이다 (사유 + `(M-9)` 인용).

**기능 디렉토리 전수 grep 결과** — `mobile/src/features/admin-user-approval/` 에 남은 타입 단언은
위 두 줄뿐이다. 그 밖에 걸린 것은 전부 M-9 대상이 아니다.

- `messages.ts` 9곳 · `endpoints.ts:23` · `useUserApproval.ts:30-31` → `as const`
  (const 단언. 리터럴 타입을 **좁히는** 것이라 검사를 우회하지 않는다)
- `UserApprovalListScreen.tsx:12` → `import {… type View as RNView}` (import 별칭)
- `any` · `<any>` **0건.**

신규 `shared/ui` 5개와 `shared/api/queryKeys.ts` 도 함께 grep 했다 —
`as const` 2곳 외에 단언 0건.

---

## 회귀 확인 — 깨진 것 없음

재작업이 건드린 파일은 3개뿐이고, 1차에서 통과로 판정한 항목의 근거 파일 대부분이
**아예 수정되지 않았다.** 그래도 아래는 코드를 다시 읽어 직접 확인했다.

| 1차 통과 항목 | 재확인 결과 | 근거 |
|---|---|---|
| 오류 분기가 `code` 로만 (C-1 / M-13) | ✅ `actionError.ts` **무수정**. 두 시트 모두 `actionErrorKindOf(error)` 결과로만 갈린다. HTTP 상태·`detail`·엔드포인트 분기 0건 | `PendingUserSheet.tsx:75`, `ProcessedUserSheet.tsx:62` |
| 403 → §5.10 경로 (AC-3) | ✅ 두 시트의 `kind === 'forbidden' → onForbidden()` 이른 반환이 그대로다. 화면 쪽 `failByForbidden` → `forbidden` 상태 → 권한 없음 블록 + `ACCOUNT_QUERY_KEY` 재조회도 **무수정** | `PendingUserSheet.tsx:76-79`, `ProcessedUserSheet.tsx:63-66`, `UserApprovalListScreen.tsx:85·89·153-155·246-258` |
| `selfSuspend` → §7.6 배너 + 닫기 | ✅ `blocked = conflict || errorKind === 'selfSuspend'` 유지. 배너 `onRetry` 도 두 경우 모두 `undefined` | `ProcessedUserSheet.tsx:109-117` |
| 문구 (§9 / M-7) | ✅ `messages.ts` **무수정**. 재작업이 추가한 유일한 표시 문자열은 기존 `COMMON.close` 재사용이다 — 새 문구 0건 | `PendingUserSheet.tsx:120` |
| 4가지 상태 × 세그먼트 독립 (M-6) | ✅ `UserApprovalListScreen.tsx` · `ListSkeleton` · `EmptyState` · `ListFooter` **전부 무수정** | 파일 수정 시각 |
| 서버 데이터 조합 금지 (C-8 / M-18) | ✅ `useUserApproval.ts` 의 `refreshLists`(두 목록 + `ACCOUNT_QUERY_KEY` 무효화)와 `nextCursorOf`(`has_next` 근거) 로직이 그대로다. 추가된 것은 주석 2블록뿐 | `useUserApproval.ts:38-40·115-121` |
| 쿼리 키 경계 (M-24) | ✅ `ACCOUNT_QUERY_KEY` 를 `shared/api/queryKeys.ts` 에서 import 해 **무효화만** 한다. `setQueryData` 로 auth 캐시를 쓰지 않는다 (`useTrimToFirstPage` 의 `setQueryData` 는 자기 기능 키 대상) | `useUserApproval.ts:17·98·119` |
| 플랫폼 분기 (M-19 / M-20) | ✅ `Alert` 버튼 배열의 취소 우선 배치와 그 사유 주석이 그대로다. `BottomSheet` · `RefreshControl` 은 무수정. 새 네이티브 모듈·권한 0건 | `ProcessedUserSheet.tsx:78-97` |
| 상태 소유권 (M-4 / M-5) | ✅ 서버 응답을 zustand 로 복사하지 않는다. 새로 생긴 `bannerKind` · `closeAction` 은 **렌더 시점 파생값**이라 상태를 늘리지 않았다 (M-5 방향) | `PendingUserSheet.tsx:98·117` |

### 1차에서 "결함 아님" 으로 판정한 4건 — **되돌리지 않았다**

| 판정 | 재확인 |
|---|---|
| ① 403 `ADMIN_FORBIDDEN` → §5.10 | 유지. `actionError.ts:36` · 화면 코드 무수정 |
| ② `NOT_FOUND`(D-1) → M-13 일반 오류 | 유지. `actionError.ts:40-42` 의 `default: 'server'` 그대로, 화면을 지어내지 않았다 |
| ③ 미구현 연출 2건 (§5.11 애니메이션 · §6.6-5 포커스) | 유지. reanimated 미도입, `package.json` 변경 없음 |
| ④ 배지 패딩 pen(`[3,10]`) 채택 | 유지. `StatusBadge.tsx` 무수정 (`px-[10px] py-[3px]` + pen `ZcirU` 근거 주석) |

---

## mobile-tester 에게 넘기는 것 (결함 아님)

1차 리포트의 R-M1 · R-M2 · R-M3 은 **그대로 열려 있다.** 여기에 한 건을 더한다.

| # | 무엇 | 받는 역할 |
|---|---|---|
| R-M4 | **§6.8 경합 상태가 두 단계 모두에서 액션을 없애는지**를 테스트로 고정해 주세요. 이번 재작업의 회귀 지점이 정확히 여기다 — 기본 단계만 검증하면 1차 결함이 되살아나도 잡히지 않는다. msw 로 409 `ADMIN_USER_ALREADY_PROCESSED` 를 내리고 ⑴ 기본 단계 ⑵ 거절 사유 입력 단계 각각에서 `거절하기`·`뒤로`·`승인` 이 사라지고 `닫기`(`testID="admin-conflict-close"`)만 남는지, ⑶ 안드로이드 백으로 기본 단계에 돌아가도 액션이 살아나지 않는지를 봐 주세요. 쿼리는 M-12 대로 라벨 우선이고 `testID` 는 보조로 씁니다 | mobile-tester |

1차의 `[SHOULD]`·참고 4건(S-1~S-4)은 재작업이 건드리지 않은 영역이라 그대로 유효하다.
차단하지 않는다.
