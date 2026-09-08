# 상태: place-detail

- 기능 슬러그: `place-detail`
- 시작일: 2026-08-29
- 현재 단계: `계약 재확정 (2026-09-08) — nearby-places 와 함께 server-developer 착수`

## 파이프라인

- [x] product-manager — PRD.md
- [x] ux-designer — design.md
- [x] ux-designer — planbee.pen
- [x] tech-lead — contract.yaml (**2026-09-08 개정** — `place_id` = `<source>:<id>`, `status_label`·`tags` nullable, `400`/`500` 응답 추가. `nearby-places` 와 같은 PR 로 진행)
- [ ] server-developer — `com.planbee.api.place` (`nearby-places` 와 같은 패키지)
- [ ] server-reviewer — PASS / FAIL
- [ ] server-tester — PASS / FAIL
- [x] mobile-developer
- [ ] mobile-reviewer — PASS / FAIL
- [ ] mobile-tester — PASS / FAIL
- [ ] integration-tester — PASS / FAIL

## 재작업 카운터

| 대상 | 횟수 |
|---|---|
| server-developer | 0 |
| mobile-developer | 0 |

## 계약 변경

- **breaking change 여부: 없음** (구현 착수 전). 2026-09-08 개정 — `place_id` 형식 확정
  (`<source>:<id>`), `status_label`·`tags` required → nullable, `400`(형식 오류)·
  `500`(`PLACE_UPSTREAM_UNAVAILABLE`) 응답 추가. `source_label` 은 유지(required).

## 미해결 / 에스컬레이션

- 지도·북마크·길찾기·AI CTA 동작은 후속 작업이다.
- `kakao:*` id 를 TourAPI 로 매칭하는 임계값은 server-developer 가 정한다.

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-29 | product-manager | 사용자 결정 1.B·2.A·3.A·4.A 반영 |
| 2026-08-29 | tech-lead | 미래 장소 상세 조회 계약 확정 |
| 2026-08-29 | mobile-developer | Root Stack·Bottom Tabs 구성, 홈 카드 진입, 로컬 JSON 기반 상세 4상태 구현. `make verify-mobile` 통과 |
| 2026-09-08 | tech-lead | 계약 재확정 — `nearby-places` 개정과 한 묶음. `openapi.yaml` 병합, `PlaceDetail` 스키마 완화. breaking 아님 |
