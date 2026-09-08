<!-- 하네스 파이프라인으로 진행한 작업이면 아래를 채운다. 그렇지 않은 변경(문서·설정 등)은 해당 없는 항목을 지운다. -->

## 무엇을 / 왜

<!-- 한두 문장. 관련 기능 슬러그가 있으면 명시: docs/features/<slug>/ -->

## 검증

- [ ] `make verify` 로컬 통과 (verify-mobile + verify-server + contract-check)
- [ ] CI `verify` 워크플로우 그린

## 파이프라인 (기능 작업일 때 — `docs/features/<slug>/status.md` 기준)

- [ ] product-manager — PRD.md
- [ ] ux-designer — design.md + `docs/design/planbee.pen`
- [ ] tech-lead — contract.yaml + `docs/api/openapi.yaml` 병합
- [ ] server-developer → server-reviewer(PASS) → server-tester(PASS)
- [ ] mobile-developer → mobile-reviewer(PASS) → mobile-tester(PASS)
- [ ] integration-tester(PASS)

## 계약 변경

- [ ] 계약 변경 없음
- [ ] 계약 변경 있음 — breaking / non-breaking 판정을 `status.md` 에 기록함
- [ ] 새 에러 코드를 `docs/api/error-codes.md` 에 등록함
- [ ] 새 환경 변수를 `.env.example` + `RequiredEnvironmentCheck` 에 등록함 (필수인 경우)

## 남은 TODO / 에스컬레이션

<!-- ESCALATE 가 있으면 무엇이 막혔는지 -->
