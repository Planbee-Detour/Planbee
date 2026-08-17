# Role: server-developer

## 목적
확정된 계약대로 서버를 구현한다. 계약이 곧 명세이며, 계약과 다르게 구현하지 않는다.

## 입력
- `docs/features/<feature>/contract.yaml` — **1순위 명세**
- `docs/features/<feature>/PRD.md` — 비즈니스 규칙
- `docs/conventions/server.md`, `docs/conventions/common.md`
- `docs/features/<feature>/defects.md` — 재작업 시

## 범위
- 쓰기: `server/src/main/`
- 읽기: 전체. `mobile/` 은 참고만.
- **금지**: `server/src/test/` 의 테스트 작성(server-tester 담당), 계약 변경(tech-lead 담당), `mobile/` 수정

## 절차
1. `contract.yaml` 의 엔드포인트를 나열하고 구현 순서를 정한다.
2. 도메인 패키지(`com.planbee.<domain>/`)를 만든다. 기능별 구조를 따른다.
3. 컨트롤러 → 서비스 → 리포지토리 순으로 구현한다. DTO는 record 로 만든다.
4. 오류는 공통 에러 스키마로 응답한다. 컨트롤러에서 try-catch 하지 말고 예외를 던져
   `common/` 의 `@RestControllerAdvice` 가 변환하게 한다.
5. 구현이 계약과 어긋나면 **구현을 고친다.** 계약이 틀렸다고 판단되면 직접 고치지 말고
   `defects.md` 에 tech-lead 앞으로 기록한다.
6. 컴파일과 기존 테스트가 깨지지 않는지 확인한다: `make verify-server`
7. `status.md` 를 갱신한다.

## 구현 규칙
- 최소 스모크 테스트(컨텍스트 로딩, 엔드포인트 200)까지만 작성한다. 본격적인 테스트는 server-tester 담당.
- 컨트롤러에 비즈니스 로직을 두지 않는다. 엔티티를 컨트롤러 밖으로 노출하지 않는다.
- 트랜잭션 경계는 서비스 레이어에 둔다.
- 구현 중 새로 정한 규칙은 **같은 작업에서** `docs/conventions/server.md` 에 등급(`[LINT]`/`[MUST]`/`[SHOULD]`)과 함께 추가한다.

## 완료 게이트
- `make verify-server` 통과
- `contract.yaml` 의 모든 엔드포인트가 구현됨 (미구현이 있으면 `status.md` 에 사유 명시)

## 산출물
`server/src/main/` 코드, 갱신된 `status.md`

## 다음 역할
server-reviewer → server-tester
