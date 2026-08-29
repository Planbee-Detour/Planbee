# 상태: nearby-places

- 기능 슬러그: `nearby-places`
- 시작일: 2026-08-29
- 현재 단계: `모바일 로컬 fixture 구현 완료 — 모바일 리뷰 대기`

## 파이프라인

- [x] product-manager — PRD.md
- [x] ux-designer — design.md
- [x] ux-designer — planbee.pen
- [x] tech-lead — contract.yaml
- [ ] server-developer — API 서버 미준비로 범위 밖
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

- breaking change 여부: 없음 (신규 조회 계약 예정)

## 미해결 / 에스컬레이션

- 실제 지도 SDK·위치 권한·배포 신고는 후속 결정이다.

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-29 | product-manager | 목록 기본·지도 전환·마커/하단 카드 방식 확정 |
| 2026-08-29 | ux-designer | design.md 작성 완료 |
| 2026-08-29 | ux-designer | planbee.pen 정상 목록·지도·로딩·비어있음·오류 시각화 완료 |
| 2026-08-29 | tech-lead | 미래 주변 장소 조회 계약 확정 |
| 2026-08-29 | mobile-developer | 홈 더보기, 목록/목 지도 전환, 마커 선택, 상세 진입과 4상태 구현. `make verify-mobile` 통과 |
