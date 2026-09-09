# 상태: nearby-places

- 기능 슬러그: `nearby-places`
- 시작일: 2026-08-29
- 현재 단계: `모바일 파이프라인 완료 (2026-09-08) — integration-tester 대기 (TOUR_API_KEY 필요)`

## 파이프라인

- [x] product-manager — PRD.md (2026-09-08 서버 조회 절 + AC-NP-7~10 추가)
- [x] ux-designer — design.md (2026-09-08 필터를 카테고리 그룹으로 개정, "운영 중" 제외)
- [x] ux-designer — planbee.pen
- [x] tech-lead — contract.yaml (**2026-09-08 재개정** — 데이터 소스 TourAPI 통일, `place_id = tour:<contentid>`, 파라미터 추가, `status_label`·`tags` nullable, `place` 오류 섹션. `openapi.yaml` 병합)
- [x] server-developer — `com.planbee.api.place` 1차 + 리뷰 지적 2건 수정 (PR #9)
- [x] server-reviewer — **PASS** (`review/server.md`). `[MUST]` 2건(DEF-001 거리순, DEF-002 좌표 없는 항목)은 리뷰 세션 중 수정·재확인. `[SHOULD]` 3건은 제안만
- [x] server-tester — **PASS.** `PlaceApiTest`(`@IntegrationTest` + WireMock) 13건 — AC-NP-7~10, size/category/sort 400, place-detail 성공/404/형식오류, 공개 접근. `make verify-server` 통과 (CI 그린)
- [x] mobile-developer — **재작업 완료 + 리뷰 지적 반영.** fixture 훅 → `useNearbyPlaces`/`usePlaceDetail`(react-query, `publicClient`). 측위(`getCurrentCoordinates`) → 조회. 필터 칩 6종 → `category` 다중 토글. DEF-004 수정(`shared/ui/Button`). 측위 쿼리 분리(재시도 안 함)
- [x] mobile-reviewer — **PASS** (`review/mobile.md`). `[MUST]` 1건(DEF-004 raw Pressable → `Button`) 세션 중 수정. `[SHOULD]` 4건 제안(DEF-005 `Chip` 는 ux-designer 앞)
- [x] mobile-tester — **PASS.** `nearby-places.test.tsx` 6건 + `place-detail.test.tsx` 5건 — 4상태 × 2화면, AC-NP-7~10, AC-NP-8 필터 재조회, AC-PD-2/3/4/5, iOS·Android 측위 경로(M-20). `make test-mobile` 15 스위트 158건 통과
- [ ] integration-tester — PASS / FAIL (`TOUR_API_KEY` 필요)

## 재작업 카운터

| 대상 | 횟수 |
|---|---|
| server-developer | 0 (server-reviewer 는 PASS. DEF-001·002 는 리뷰 세션 중 수정 — FAIL 루프 아님) |
| mobile-developer | 0 (mobile-reviewer 는 PASS. DEF-004 는 세션 중 수정. "재작업" 은 계약 재개정 반영이지 결함 루프가 아님) |

## 계약 변경

- **breaking change 여부: 없음.** 2026-09-08 개정·재개정 모두 미구현 계약을 바꾼 것이다
  (server 착수 전). 최종(0.3.0): 데이터 소스 TourAPI, `place_id = tour:<contentid>`,
  `status_label`·`tags` nullable, 조회 파라미터(`category`·`radius`·`size`·`sort`),
  `place` 오류 2종(`PLACE_NOT_FOUND` 404 · `PLACE_UPSTREAM_UNAVAILABLE` 500).
- 모바일 fixture 구현은 개정 전 스키마 기준이라 실제 조회 훅으로 교체하며 함께 맞춘다.

## 미해결 / 에스컬레이션

- 실제 지도 SDK·위치 권한·배포 신고는 후속 결정이다 (모바일 단계).
- TourAPI 매칭(이름+좌표 근접) 임계값은 server-developer 가 정하고 `conventions/server.md` 에 남긴다.

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-29 | product-manager | 목록 기본·지도 전환·마커/하단 카드 방식 확정 |
| 2026-08-29 | ux-designer | design.md 작성 완료 |
| 2026-08-29 | ux-designer | planbee.pen 정상 목록·지도·로딩·비어있음·오류 시각화 완료 |
| 2026-08-29 | tech-lead | 미래 주변 장소 조회 계약 확정 |
| 2026-08-29 | mobile-developer | 홈 더보기, 목록/목 지도 전환, 마커 선택, 상세 진입과 4상태 구현. `make verify-mobile` 통과 |
| 2026-09-08 | (사람 결정) | 4건 확정 — 소스 연결(`<source>:<id>`), 조회 범위(카테고리 그룹+거리순), 상위 N(`size` 15/45)·반경(`radius`), place 공개 유지. 데이터 소스 카카오+TourAPI 병행 |
| 2026-09-08 | product-manager | PRD 개정 — "서버 조회" 절, US-NP-2 + AC-NP-7~10, "운영 중" 필터 Out of scope 이동 |
| 2026-09-08 | tech-lead | **계약 재확정.** `contract.yaml` + `place-detail/contract.yaml` 개정, `openapi.yaml` 병합(info 0.4.0, `place` 태그), `error-codes.md` `place` 섹션 확장(`PLACE_UPSTREAM_UNAVAILABLE`). breaking 아님 |
| 2026-09-08 | tech-lead | **계약 재개정 — 데이터 소스 TourAPI 통일.** 카카오 로컬 REST 에 place_id 조회 엔드포인트가 없어 상세를 이을 수 없었다. 주변·상세 모두 TourAPI(KorService2), `place_id = tour:<contentid>`. `category` enum 을 contentTypeId 에 맞춰 개정(`leisure`/`shopping` 추가, `cafe` 제거). contract 0.3.0 |
| 2026-09-08 | server-developer | **1차 구현 (PR #9, CI 그린).** `com.planbee.api.place` — `TourApiClient`(RestClient·타임아웃·JsonNode 방어 파싱), `PlaceService`(유형별 조회·병합·거리순), `PlaceController`, DTO record 3종, `PlaceErrorCode`, `TourContentType`, `Distances`. Caffeine 캐시. `SecurityConfig` PUBLIC_PATHS 에 `/api/v1/places/**`. `.env.example`+`RequiredEnvironmentCheck`+compose 에 `TOUR_API_KEY`. `server.md` S-31 추가. `@WebMvcTest` 스모크 3건. `make verify-server` + `make contract-check` 통과 |
| 2026-09-08 | server-reviewer | **PASS.** `[MUST]` 2건 — DEF-001(다중 카테고리 병합이 거리순 아님), DEF-002(좌표 없는 항목 0.0 포함). 둘 다 리뷰 세션 중 server-developer 가 수정. `[SHOULD]` 3건 제안. `review/server.md` |
| 2026-09-08 | server-developer | 재작업 1회 — DEF-001·002 수정 (`PlaceService` 정렬·필터). `sort` 를 `nearby()` 인자로 통합 |
| 2026-09-08 | server-tester | **PASS.** `PlaceApiTest`(`@IntegrationTest` + `wiremock-standalone`) 13건 — AC-NP-7~10 · size/category/sort 400 · place-detail 성공/404/형식오류 · 공개 접근. `@BeforeEach` 에서 응답 캐시 비움(키 충돌). `make verify-server` + `contract-check` CI 그린 |
| 2026-09-08 | mobile-developer | **재작업.** `nearby-places`·`place-detail` fixture → 실제 조회(react-query + `publicClient`). `shared/location` 에 `getCurrentCoordinates` 추가. 필터 칩 → `category` 다중 토글. `place-detail` 404 → 빈 상태 분기(`code` 기준, M-13). fixture 4개 삭제. 스모크 2건. `make verify-mobile` 로컬 통과 |
| 2026-09-08 | mobile-developer | **재작업.** `nearby-places`·`place-detail` fixture → react-query 실제 조회(`publicClient`). `getCurrentCoordinates` 신설. 필터 칩 → `category` 다중. `place-detail` 404 → 빈 상태(`code`). fixture 4개 삭제 |
| 2026-09-08 | mobile-reviewer | **PASS.** `[MUST]` DEF-004(상태 버튼 raw Pressable → `shared/ui/Button`) 세션 중 수정. `[SHOULD]` 4건 — `Chip` 컴포넌트(DEF-005, ux-designer), `retry` useCallback 무효(→ 제거), 측위 재시도(→ 쿼리 분리), `PlaceDetailScreen.StateScreen` raw Pressable. `review/mobile.md` |
| 2026-09-08 | mobile-developer | 재작업 2회 — DEF-004 + 리뷰 SHOULD 3건 수정 (Button 교체, useCallback 제거, 측위 쿼리 분리·skipToken) |
| 2026-09-08 | mobile-tester | **PASS.** `nearby-places.test.tsx` 6 + `place-detail.test.tsx` 5 — 4상태 × 2화면, AC-NP-7~10, 필터 재조회, AC-PD-2/3/4/5, iOS/Android 측위(M-20). msw 목킹. mobile-developer 스모크 2건은 이 테스트로 대체·삭제. `make test-mobile` 15 스위트 158건 |
