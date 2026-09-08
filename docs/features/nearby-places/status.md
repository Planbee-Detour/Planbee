# 상태: nearby-places

- 기능 슬러그: `nearby-places`
- 시작일: 2026-08-29
- 현재 단계: `계약 재확정 (2026-09-08) — server-developer 착수 가능`

## 파이프라인

- [x] product-manager — PRD.md (2026-09-08 서버 조회 절 + AC-NP-7~10 추가)
- [x] ux-designer — design.md (2026-09-08 필터를 카테고리 그룹으로 개정, "운영 중" 제외)
- [x] ux-designer — planbee.pen
- [x] tech-lead — contract.yaml (**2026-09-08 개정** — 카카오+TourAPI, 파라미터 추가, `status_label`·`tags` nullable, `place` 오류 섹션. `openapi.yaml` 병합)
- [ ] server-developer — `com.planbee.api.place` (카카오 로컬 + TourAPI 클라이언트, 랭킹, 캐시, resilience4j)
- [ ] server-reviewer — PASS / FAIL
- [ ] server-tester — PASS / FAIL
- [x] mobile-developer — 로컬 fixture 구현 완료. **개정 계약으로 실제 조회 훅 교체 필요 (재작업)**
- [ ] mobile-reviewer — PASS / FAIL
- [ ] mobile-tester — PASS / FAIL
- [ ] integration-tester — PASS / FAIL

## 재작업 카운터

| 대상 | 횟수 |
|---|---|
| server-developer | 0 |
| mobile-developer | 0 |

## 계약 변경

- **breaking change 여부: 없음.** 2026-09-08 개정은 미구현 계약을 바꾼 것이다
  (nearby-places·place-detail 모두 서버 착수 전). `status_label`·`tags` 를 required →
  nullable 로 완화, 조회 파라미터(`category`·`radius`·`size`·`sort`) 추가, `place` 오류
  응답 2종(`PLACE_NOT_FOUND` 404 · `PLACE_UPSTREAM_UNAVAILABLE` 500) 신설.
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
| 2026-09-08 | tech-lead | **계약 재확정.** `contract.yaml` + `place-detail/contract.yaml` 개정, `openapi.yaml` 병합(info 0.4.0, `place` 태그), `error-codes.md` `place` 섹션 확장(`PLACE_UPSTREAM_UNAVAILABLE`). breaking 아님. `make contract-check` 는 다음 세션(server-developer 착수 후)에 실행 |
