# 상태: recommendation-quota

- 기능 슬러그: `recommendation-quota`
- 시작일: 2026-08-23
- 현재 단계: `PRD 작성 완료 — BLOCKED (선행 조건 미충족)`

## 선행 조건 — 아직 충족되지 않음

| 선행 조건 | 상태 |
|---|---|
| `auth` 로그인 (계정 단위 집계의 전제) | 미착수 |
| **추천 요청 엔드포인트** (한도를 얹을 대상) | **존재하지 않음** |

추천 기능 자체가 아직 없으므로 이 기능은 붙일 곳이 없다. 진행 순서는
`auth` → `admin-user-approval` → 추천 기능 → 이 기능이다.

## 파이프라인

- [x] product-manager — PRD.md
- [ ] ux-designer — design.md
- [ ] tech-lead — contract.yaml  ← **이게 끝나야 아래 두 갈래를 시작한다**
- [ ] server-developer
- [ ] server-reviewer — PASS / FAIL
- [ ] server-tester — PASS / FAIL
- [ ] mobile-developer
- [ ] mobile-reviewer — PASS / FAIL
- [ ] mobile-tester — PASS / FAIL
- [ ] integration-tester — PASS / FAIL

## 재작업 카운터

루프 상한은 2회. 3회차에 접어들면 `ESCALATE` 를 적고 사람에게 넘긴다.

| 대상 | 횟수 |
|---|---|
| server-developer | 0 |
| mobile-developer | 0 |

## 계약 변경

- breaking change 여부: **있음 가능성** — 한도 초과 응답에 `429` 를 쓰려면
  `docs/conventions/common.md` C-1 의 허용 상태 코드 목록을 개정해야 한다 (미해결 1번).

## 미해결 / 에스컬레이션

`ASK` — 없음. 사람 판단이 필요한 항목은 모두 해소되었다.

**착수를 막는 것은 선행 조건이다** — 추천 요청 엔드포인트가 존재하지 않는다 (위 선행 조건 절 참조).

`tech-lead` 로 넘길 항목 — PRD 열린 질문 1(C-1 에 429 를 추가할지, 403 + 전용 코드로 갈지), 4(오류 코드).
`ux-designer` 로 넘길 항목 — PRD 열린 질문 2(한도 초과 화면이 막다른 길이 되지 않게 하는 방법).

## 결정 기록

| 항목 | 결정 | 날짜 |
|---|---|---|
| 한도 | 10회 / 일 / 계정. 관리자는 제한 없음 | 2026-08-23 |
| 집계 단위 | 계정 (기기·IP 아님 — 우회 가능) | 2026-08-23 |
| 속도 제한 라이브러리 | 도입하지 않음. 일일 고정 한도는 DB 카운터로 충분 | 2026-08-23 |
| "하루" 기준 시간대 | **`Asia/Seoul` 자정 고정.** 국내 대상 앱이므로 기기 시간대를 따르지 않는다 | 2026-08-23 |

## 기록

| 날짜 | 역할 | 결과 |
|---|---|---|
| 2026-08-23 | product-manager | PRD.md 작성 완료 (US 5개 / AC 19개). BLOCKED — 추천 엔드포인트 부재. ASK 1건 |
| 2026-08-23 | product-manager | 사람 결정 반영 — KST 고정 확정. ASK 0건. 여전히 선행 조건으로 BLOCKED |
