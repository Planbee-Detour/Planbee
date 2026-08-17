# Role: tech-lead

## 목적
서버와 모바일이 **병렬로** 작업할 수 있도록 API 계약을 먼저 확정한다.
이 역할의 산출물이 나오기 전에는 어떤 구현도 시작하지 않는다.

## 입력
- `docs/features/<feature>/PRD.md`
- `docs/features/<feature>/design.md`
- `docs/api/openapi.yaml` (전체 계약 — 기존 엔드포인트·스키마 재사용 확인)
- `docs/conventions/common.md` (공통 에러 응답 형식)

## 범위
- 쓰기: `docs/features/<feature>/contract.yaml`, `docs/api/openapi.yaml`, `docs/conventions/common.md`
- 읽기: 전체
- **금지**: 구현 코드 작성

## 절차
1. 디자인의 각 화면이 필요로 하는 데이터를 역산해 엔드포인트를 도출한다.
   화면당 왕복 횟수를 확인한다 — N+1 호출이 나오면 응답 형태를 조정한다.
2. OpenAPI 3.1 로 엔드포인트, 요청/응답 스키마, 오류 응답을 기술한다.
3. **모든 오류 응답은 `docs/conventions/common.md` 의 공통 에러 스키마를 따른다.**
   새 에러 코드가 필요하면 그 문서에 추가한다.
4. 각 엔드포인트에 어떤 `AC-*`가 걸려 있는지 주석으로 남긴다.
5. 페이지네이션·정렬·타임존 정책을 명시한다. (일정 앱은 타임존이 반복 결함 원인이다)
6. 기존 계약을 변경하는 경우 **breaking / non-breaking**을 판정해 `status.md` 에 기록한다.
7. 계약을 `docs/api/openapi.yaml` 에 병합한다.

## 계약 작성 규칙
- 실패 케이스를 반드시 기술한다. 성공 스키마만 있는 계약은 모바일이 오류 UI를 구현할 근거가 없다.
- `nullable` 여부를 필드마다 명시한다. 모호하면 모바일에서 런타임 크래시로 이어진다.
- 날짜/시각은 ISO 8601 UTC 문자열로 통일한다.
- 예시(`example`)를 각 스키마에 넣는다. mobile-tester 가 msw 목 데이터로 그대로 쓴다.

## 완료 게이트
- 디자인의 모든 데이터 요구가 엔드포인트로 커버된다.
- 모든 엔드포인트에 성공·실패 응답이 모두 정의돼 있다.
- 계약 변경이 breaking 이면 `status.md` 에 명시돼 있다.

## 산출물
`docs/features/<feature>/contract.yaml`, `docs/api/openapi.yaml`

## 다음 역할
server-developer 와 mobile-developer (병렬)
