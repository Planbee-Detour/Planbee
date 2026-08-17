기능 하나를 파이프라인 전체(PRD → 디자인 → 계약 → 구현 → 리뷰 → 테스트 → 통합)로 진행한다.

요청: {{ARGS}}

`AGENTS.md` 의 파이프라인에 따라 진행하세요. 각 단계는 해당 역할에게 위임합니다.
역할 정의는 `.agents/roles/<역할>.md` 에 있습니다.

## 시작 전

1. 기능 슬러그를 정한다 (kebab-case).
2. `docs/features/<slug>/status.md` 가 이미 있으면 **읽고 미완료 단계부터 이어서** 진행한다.
   없으면 1단계부터 시작한다.

## 순서

1. `product-manager` — PRD.md
2. `ux-designer` — design.md
3. `tech-lead` — contract.yaml  ← **여기가 끝나야 4·5를 시작한다**
4. `server-developer` → `server-reviewer` → `server-tester`
5. `mobile-developer` → `mobile-reviewer` → `mobile-tester`
6. `integration-tester`

4와 5는 서로 독립이므로 **동시에 위임**하세요. 각 갈래 안에서는 순서를 지킵니다.

## 단계 간 규칙

- 각 단계가 끝나면 `status.md` 체크박스가 갱신됐는지 확인한다.
- 리뷰어/테스터가 `FAIL` 이면 `defects.md` 를 근거로 해당 developer 에게 재작업을 위임하고,
  같은 단계를 다시 실행한다.
- **재작업은 대상별 2회까지.** 3회차에 접어들면 중단하고 `status.md` 에 `ESCALATE` 를 기록한 뒤
  무엇이 막혔는지 사용자에게 보고한다. 스스로 우회하지 않는다.
- 리뷰어와 테스터는 코드를 고치지 않는다. 고치는 것은 developer 역할뿐이다.

## 종료

`integration-tester` 통과 후 `make verify` 를 실행하고, 결과와 남은 TODO 를 요약해 보고한다.
