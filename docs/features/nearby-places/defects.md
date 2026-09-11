# 결함 리포트: nearby-places / place-detail

`.agents/templates/defect.md` 형식. append only. 해결 시 삭제하지 말고 `상태: 해결` 로 바꾼다.

---

### DEF-001 [High] 다중 카테고리 병합 결과가 거리순이 아니다
- 상태: 해결 (2026-09-08, server-developer)
- 보고자: server-reviewer
- 담당: server-developer
- 위치: `server/src/main/java/com/planbee/api/place/PlaceService.java` — `nearby()` / `sortDistance()`
- 근거: `PRD.md` AC-NP-7 ("거리순"), `contract.yaml` `sort=distance`, `conventions/server.md` 판정 항목 "명명"
- 재현:
  1. `GET /api/v1/places/nearby?latitude=..&longitude=..` (기본 카테고리 = attraction,culture)
  2. TourAPI 가 유형별로 거리순 결과를 주지만 서버가 둘을 이어 붙임
- 기대: 병합 후 전체가 거리순
- 실제: `sortDistance` 가 거리 유무만 판정(0 / `MAX_VALUE`) → 유형 내 순서만 유지, 유형 경계에서 거리 역전
- 수정: `Comparator.comparing(TourPlace::distanceMeters, nullsLast(naturalOrder()))` 로 정렬 후 `limit(size)` → 매핑

---

### DEF-002 [Medium] 좌표 없는 장소가 목록에 0.0 좌표로 포함된다
- 상태: 해결 (2026-09-08, server-developer)
- 보고자: server-reviewer
- 담당: server-developer
- 위치: `server/src/main/java/com/planbee/api/place/PlaceService.java` — `toNearbyPlace()`
- 근거: `contract.yaml` `NearbyPlace.latitude/longitude` required(비-null), `PRD.md` "주변" 의미
- 재현: TourAPI 응답에 `mapx`/`mapy` 가 빈 항목이 섞이면
- 기대: 그 항목을 목록에서 제외
- 실제: `latitude/longitude` 에 `0.0` 을 채워 응답에 포함 → 지도 (0,0) 마커
- 수정: `nearby()` 스트림에서 좌표 없는 `TourPlace` 를 `filter` 로 제거

---

### DEF-003 [Low] 위치 권한 거부 시 화면이 "연결을 확인" 오류를 보여준다
- 상태: 열림
- 보고자: mobile-developer
- 담당: ux-designer
- 위치: `mobile/src/features/nearby-places/screens/NearbyPlacesScreen.tsx` (오류 상태)
- 근거: `design.md` §3 에 위치 권한 거부·측위 실패 상태가 없다. PRD Out of scope 는
  "위치 권한 **추가**" 를 뺐을 뿐, 권한이 이미 거부된 경우의 화면은 필요하다
- 현재 처리: 측위 실패(`getCurrentCoordinates() === null`)를 일반 오류 상태로 보낸다 —
  문구가 "연결을 확인하고 다시 시도해 주세요" 라 원인(권한)과 맞지 않는다
- 요청: 측위 실패 전용 안내(예: "위치 권한을 허용하면 주변 장소를 볼 수 있어요" + 설정 열기)
  가 필요한지, 아니면 현 오류 상태로 충분한지 판단. 전용 화면이면 `design.md` §3 에 추가

---

### DEF-004 [High] 스모크 테스트가 간헐적으로 깨진다 — 측위 목이 즉시 성공한다
- 상태: 닫힘 (2026-09-10 수정)
- 보고자: (CI 실패 추적)
- 담당: mobile-developer
- 위치: `mobile/src/features/nearby-places/__tests__/screen.smoke.test.tsx`,
  `mobile/__mocks__/@react-native-community/geolocation.ts`

**증상** — `verify-mobile` 잡이 같은 코드에서 붙었다 떨어졌다 한다.
4개 런 중 2개에서만 이 테스트가 실패했다 (트리는 전부 동일).

| 런 | 이벤트 | 커밋 | 이 테스트 |
|---|---|---|---|
| 34366043800 | pull_request | `9a965ee` | **실패** |
| 34366055582 | push(develop) | `70e7f3a` | 통과 |
| 34408260122 | pull_request | `8459cc9` | 통과 |
| 34408335385 | push(develop) | `37b2754` | **실패** |

**오류 원문**

```
● 주변 장소 화면이 로딩 상태로 뜬다 (측위 대기)
  Unable to find an element with accessibility label: 주변 장소를 불러오는 중
  (렌더된 것은 "주변 장소를 불러오지 못했어요" 오류 화면)

console.error [MSW] Error: intercepted a request without a matching request handler:
  • GET http://localhost:8080/api/v1/places/nearby?latitude=37.4563&longitude=126.8956
```

**원인** — 테스트의 전제가 사실이 아니었다. 주석은 "측위는 자동 목이라 응답하지 않는다"
라고 적었지만, `mobile/__mocks__/@react-native-community/geolocation.ts` 는 **수동 목**이고
`getCurrentPosition` 이 `37.4563, 126.8956` 으로 **즉시 성공**한다. 그래서 화면은 렌더 직후
조회로 넘어가고, msw 핸들러가 없어 `onUnhandledRequest: 'error'` 에 걸려 오류 상태가 된다.
`getByLabelText` 가 그 전환보다 먼저 실행되면 통과, 나중이면 실패 — 실행 속도에 달린 레이스다.

**확인한 사실** (프로브 테스트로 관측)

- 기본 목 그대로 두고 200ms 뒤 확인 → 오류 상태 (`error=true`). 요청이 실제로 나간다.
- `getCurrentPosition` 을 콜백하지 않도록 덮어쓰고 200ms 뒤 확인 → 로딩 유지
  (`loading=true`, `error=false`). 전환 자체가 없어져 결정적이다.

**수정**

- 수동 목의 두 함수를 `jest.fn()` 으로 바꿔 테스트가 덮어쓸 수 있게 했다.
  기본값(즉시 성공)은 그대로 두고, 왜 그런지 파일 주석에 남겼다.
- 스모크 테스트가 `beforeEach` 에서 `getCurrentPosition` 을 응답하지 않도록 덮어쓴다.
  이제 주석대로 "측위 대기 중 로딩" 을 보고, 네트워크로 나가지 않는다 (M-11).

**남은 것 (이 결함 범위 밖)**

- `nearby-places` 에는 이 스모크 하나뿐이라 성공·비어있음·오류 경로가 테스트로 고정돼 있지
  않다. mobile-tester 층의 공백이다.
- ~~`jest` 가 테스트 종료 후 바로 빠져나오지 못한다.~~ **원인 확인·수정 완료(2026-09-10).**
  테스트가 만드는 `QueryClient` 의 `gcTime` 기본값이 300초라 gc 타이머가 이벤트 루프를 잡고
  있었다. `queries` 와 `mutations` **양쪽** 을 0으로 둬야 하고, 하나만 0으로 두면 증상이 그대로다
  (queries 만 0 → 326초, 양쪽 0 → 29초). `shared/test/queryClient.ts` 의
  `createTestQueryClient()` 로 통일했다. 전체 게이트 329초 → 35초. `mobile.md` 테스트 환경 메모 참조.

---

### DEF-006 [Medium] 상태 화면 버튼이 shared/ui/Button 을 쓰지 않는다
- 상태: 해결 (2026-09-08, mobile-developer)
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `mobile/src/features/nearby-places/screens/NearbyPlacesScreen.tsx` (오류·비어있음 상태)
- 근거: `conventions/mobile.md` M-21 (pen Design System 컴포넌트는 shared/ui). `Button/Primary`·`Button/Secondary` 가 이미 `shared/ui/Button.tsx` 에 있다
- 실제: "다시 시도"·"이전 화면으로" 를 raw `Pressable` + `Text` 로 구현
- 수정: `shared/ui/Button` 의 `Button`(primary/secondary)·`TextButton` 으로 교체

---

### DEF-007 [Low] 빠른 필터 칩에 shared/ui/Chip 컴포넌트가 필요한지 확인
- 상태: 열림
- 보고자: mobile-reviewer
- 담당: ux-designer
- 위치: `mobile/src/features/nearby-places/screens/NearbyPlacesScreen.tsx` (`CATEGORY_FILTERS` 렌더)
- 근거: `conventions/mobile.md` M-21. `place-detail/design.md` §4 가 `Chip/QuickAction` 을 참조
- 요청: pen `Screen 01 — Design System` 에 필터/카테고리 칩 컴포넌트가 있는지 확인.
  있으면 `shared/ui/Chip` 을 코드로 옮기고 mobile-developer 가 raw 구현을 교체한다.
  없으면 이 항목을 닫고 raw 구현을 유지한다 (현재 접근성·터치영역은 충족)
