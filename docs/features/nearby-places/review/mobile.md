# 모바일 리뷰: nearby-places / place-detail

- 리뷰 역할: mobile-reviewer
- 대상: `mobile/src/features/nearby-places/**`, `mobile/src/features/place-detail/**`,
  `mobile/src/shared/location/location.ts` (PR #10, commit 28d746d)
- 판정: **PASS** (아래 `[MUST]` 1건은 리뷰 세션 중 mobile-developer 가 수정)
- 근거: `docs/conventions/mobile.md`, `docs/conventions/common.md`, `design.md`, `contract.yaml`

## `[MUST]` — defects.md 로 이관 (수정됨)

- **DEF-004** [Medium] — M-21. `NearbyPlacesScreen` 의 오류/비어있음 상태 버튼("다시 시도",
  "이전 화면으로")이 `shared/ui/Button`·`TextButton` 대신 raw `Pressable` 로 구현됨.
  이 둘은 pen Design System 의 `Button/Primary`·`Button/Secondary` 다. → `Button` 으로 교체.

## `[SHOULD]` — 제안 (차단 안 함)

- **빠른 필터 칩** — `shared/ui` 에 `Chip` 컴포넌트가 없다. `place-detail/design.md` §4 가
  `Chip/QuickAction` 을 참조하므로 pen DS 프레임에 칩이 있을 가능성이 크다. 있다면 M-21 상
  `shared/ui/Chip` 을 신설해 써야 한다 — **pen 확인이 필요하고 pencil MCP 가 이 세션에 없어**
  판정을 보류한다. → `defects.md` DEF-005 로 ux-designer 앞. 현재 raw 구현은 44pt·
  `accessibilityRole`·`accessibilityState` 를 충족한다.
- `useNearbyPlaces`/`usePlaceDetail` 의 `retry` 가 `useCallback([query])` 인데 `query` 객체는
  매 렌더 새 참조라 메모이제이션이 무효다. `[query.refetch]`(안정 참조)로. → 수정 반영.
- `useNearbyPlaces` 가 측위 실패에 `new Error('LOCATION_UNAVAILABLE')` 를 던진다 — `ApiError` 가
  아니라 provider 의 재시도 정책상 2회 재시도된다. 측위 실패는 재시도 대상이 아니다. → 수정 반영.
- `PlaceDetailScreen.StateScreen` 도 raw `Pressable` 을 쓴다(이 diff 밖, 기존). 같은 교체가
  필요하나 이번 재작업 범위에 넣지 않았다 — 별도 정리 항목.

## 규칙 준수 확인

| 항목 | 결과 |
|---|---|
| 기능 경계 (M-2·M-3) | PASS — `nearby-places`/`place-detail` 는 `shared/` 만 import. `shared/location` 은 기존 공용 모듈 |
| 상태 소유권 (M-4·M-5) | PASS — `state` 는 `query.*` 에서 매 렌더 파생, 저장 안 함. `mode`/`selectedCategories` 는 클라 UI 상태 |
| 명세 정합성 (M-6·M-7) | PASS — 4상태 모두 구현, 문구는 design.md 그대로. 필터 칩 6종 = design.md §2 개정본 |
| 오류 분기 (M-13) | PASS — `place-detail` 는 `code === 'PLACE_NOT_FOUND'` 로 빈 상태/오류를 가름. `shared/api` 가 파싱 |
| 타입 (M-8·M-9) | PASS — `any`/`as` 없음. `PlaceCategory` 는 생성 타입(`operations[...].category`)에서 도출 |
| 인증 (M-14) | PASS — 공개 엔드포인트라 `publicClient`(토큰 없음). 계약 `security: []` 와 일치 |
| 접근성 (M-10) | PASS — 칩·마커·버튼 44pt, 마커 레이블 "{장소명} 마커", 오류 제목 `accessibilityRole="header"` |
| 플랫폼 (M-19·M-20) | PASS — `getCurrentCoordinates` 는 크로스플랫폼 `Geolocation`. 권한 요청은 기존 `Platform.OS` 분기 재사용. 새 권한·SDK 없음 |
| 생성물 (M-22) | PASS — `schema.ts` 는 `make contract-types` 산출물. 손수정 없음 |

## 다음 역할

mobile-tester (msw 목킹, 4상태 × 2화면, AC-NP-7~10 / AC-PD-*).
