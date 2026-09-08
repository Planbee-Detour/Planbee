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
