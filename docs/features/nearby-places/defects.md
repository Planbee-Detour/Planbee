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

### DEF-004 [Medium] 상태 화면 버튼이 shared/ui/Button 을 쓰지 않는다
- 상태: 해결 (2026-09-08, mobile-developer)
- 보고자: mobile-reviewer
- 담당: mobile-developer
- 위치: `mobile/src/features/nearby-places/screens/NearbyPlacesScreen.tsx` (오류·비어있음 상태)
- 근거: `conventions/mobile.md` M-21 (pen Design System 컴포넌트는 shared/ui). `Button/Primary`·`Button/Secondary` 가 이미 `shared/ui/Button.tsx` 에 있다
- 실제: "다시 시도"·"이전 화면으로" 를 raw `Pressable` + `Text` 로 구현
- 수정: `shared/ui/Button` 의 `Button`(primary/secondary)·`TextButton` 으로 교체

---

### DEF-005 [Low] 빠른 필터 칩에 shared/ui/Chip 컴포넌트가 필요한지 확인
- 상태: 열림
- 보고자: mobile-reviewer
- 담당: ux-designer
- 위치: `mobile/src/features/nearby-places/screens/NearbyPlacesScreen.tsx` (`CATEGORY_FILTERS` 렌더)
- 근거: `conventions/mobile.md` M-21. `place-detail/design.md` §4 가 `Chip/QuickAction` 을 참조
- 요청: pen `Screen 01 — Design System` 에 필터/카테고리 칩 컴포넌트가 있는지 확인.
  있으면 `shared/ui/Chip` 을 코드로 옮기고 mobile-developer 가 raw 구현을 교체한다.
  없으면 이 항목을 닫고 raw 구현을 유지한다 (현재 접근성·터치영역은 충족)
