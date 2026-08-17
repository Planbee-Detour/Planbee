# 결함 리포트 형식

`docs/features/<feature>/defects.md` 에 아래 형식으로 **append** 한다. 기존 항목을 지우지 않는다.
해결되면 항목을 삭제하지 말고 `상태: 해결` 로 바꾼다 — 재작업 카운터의 근거가 된다.

```markdown
### DEF-001 [High] 만료 토큰으로 무한 재시도
- 상태: 열림
- 보고자: mobile-tester
- 담당: mobile-developer
- 원인: 모바일          # integration-tester 만 사용: 서버 / 모바일 / 계약 / 미판별
- 위치: mobile/src/shared/api/client.ts:42
- 근거: PRD.md AC-7 / conventions/mobile.md M-12
- 재현:
  1. 만료된 토큰으로 앱 실행
  2. 일정 목록 진입
- 기대: 1회 갱신 시도 후 실패하면 로그인 화면으로 이동
- 실제: 동일 요청을 무한 반복
- 로그: (있으면 첨부)
```

## 심각도

| 등급 | 기준 |
|---|---|
| `Critical` | 기능이 동작하지 않거나 데이터가 손실됨 |
| `High` | 인수조건 미충족, `[MUST]` 규칙 위반 |
| `Medium` | 일부 조건에서만 발생, 우회 가능 |
| `Low` | `[SHOULD]` 제안, 개선 여지 |

## 규칙

- **근거 없는 결함은 쓰지 않는다.** 반드시 `AC-*` 또는 `conventions` 규칙 번호를 인용한다.
- 재현 절차 없는 동작 결함은 접수되지 않는다.
- 리뷰어·테스터는 결함만 쓰고 **코드를 고치지 않는다.**
