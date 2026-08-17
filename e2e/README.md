# E2E (통합) 테스트

**소유자**: integration-tester 역할 (`.agents/roles/integration-tester.md`)

실제 앱과 실제 서버를 연결해 검증한다. **아무것도 목킹하지 않는다.**

## 실행

```bash
make e2e-up      # PostgreSQL + API 컨테이너 기동, 시드 적용, 헬스 대기
make e2e-app     # 시뮬레이터에 앱 빌드/설치 (앱이 바뀐 경우에만)
make test-e2e    # Maestro 플로우 실행
make e2e-down    # 정리 (볼륨까지 삭제)
```

실패하면 `make logs` 로 서버 로그를 보고 **원인이 앱인지 서버인지 계약인지 판별**한다.
이 판별이 integration-tester 의 핵심 산출물이다. "실패했습니다"만 적지 않는다.

## 사전 준비

- Docker
- Maestro — `curl -Ls https://get.maestro.mobile.dev | bash`
- Xcode 시뮬레이터

## 다루는 것 / 다루지 않는 것

| 다룬다 | 다루지 않는다 |
|---|---|
| 핵심 해피패스 (기능당 1~3개) | 엣지케이스·경계값 → server-tester / mobile-tester |
| 계약 정합성 (실제 응답이 `docs/api/openapi.yaml` 과 일치하는가) | 화면 상태 전이 → mobile-tester |
| 왕복 일관성 (앱에서 만든 데이터가 재시작 후에도 남는가) | 비즈니스 로직 → server-tester |
| 인증 지속 (재시작 후 로그인 유지, 만료 처리) | 코드 규칙 → *-reviewer |

## 시드 데이터

`server/src/main/resources/db/seed/` 에 Flyway 마이그레이션으로 둔다 (V900 이상).
결정론적이어야 하며, 여기 있는 계정·데이터를 플로우가 그대로 참조한다. 바꾸면 플로우도 함께 고친다.
