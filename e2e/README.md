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
- Xcode **정식 설치**(Command Line Tools 만으로는 `simctl` 이 없어 시뮬레이터를 못 띄운다) + iOS 시뮬레이터

## 다루는 것 / 다루지 않는 것

| 다룬다 | 다루지 않는다 |
|---|---|
| 핵심 해피패스 (기능당 1~3개) | 엣지케이스·경계값 → server-tester / mobile-tester |
| 계약 정합성 (실제 응답이 `docs/api/openapi.yaml` 과 일치하는가) | 화면 상태 전이 → mobile-tester |
| 왕복 일관성 (앱에서 만든 데이터가 재시작 후에도 남는가) | 비즈니스 로직 → server-tester |
| 인증 지속 (재시작 후 로그인 유지, 만료 처리) | 코드 규칙 → *-reviewer |

## 플로우

`maestro test e2e/flows` 는 이 디렉토리의 `.yaml` 을 **전부** 실행한다.
그래서 공유용 조각(하위 플로우)을 같은 폴더에 두지 않는다 — 독립 플로우로 한 번 더 돌아간다.

| 파일 | 무엇을 증명하는가 | 계약 |
|---|---|---|
| `app-launch.yaml` | 번들 → 네이티브 링크 → 첫 화면 | — |
| `auth-01-signup-pending.yaml` | 가입 신청 → 서버가 만든 안내 문구가 화면에 그대로 (AC-1·46) | `POST /auth/signup` |
| `auth-02-login-home.yaml` | 승인 계정 로그인 → 홈 → 설정의 계정 카드 (AC-11·35) | `POST /auth/login`, `GET /auth/me` |
| `auth-03-session-persistence.yaml` | 재시작 후 세션 유지, 로그아웃 후 재시작하면 유지되지 않음 (AC-20·22·26·27) | `POST /auth/token/refresh`, `POST /auth/logout` |

**각 플로우는 `clearKeychain` + `launchApp: clearState: true` 로 시작한다.**
토큰은 Keychain 에 있어 `clearState` 만으로는 지워지지 않는다
(`mobile/src/shared/api/session.ts`) — 앞 플로우의 세션을 물고 시작하면 순서에 따라 결과가 달라진다.

## 시드 데이터

`server/src/main/resources/db/seed/` 에 Flyway 마이그레이션으로 둔다 (V900 이상).
결정론적이어야 하며, 여기 있는 계정·데이터를 플로우가 그대로 참조한다. 바꾸면 플로우도 함께 고친다.

| 파일 | 내용 |
|---|---|
| `V900__e2e_seed.sql` | 자리표시자 (내용 없음) |
| `V901__e2e_seed_auth.sql` | `approved@e2e.planbee.test` / `planbee2026` — **APPROVED** 계정 + 동의 이력 3종 |

- **이미 적용된 시드 파일은 고치지 않는다.** 주석 한 줄만 바꿔도 Flyway 체크섬이 어긋나
  기동이 실패한다. 도메인이 늘면 `V902`, `V903` … 으로 파일을 이어 붙인다.
- **비밀번호는 해시로만 넣는다** (server.md S-17). 해시는 손으로 만들지 말고 기동한 서버의
  `POST /api/v1/auth/signup` 이 만든 값을 DB 에서 그대로 읽어 온다 — 그래야 인코더 접두사와
  강도가 실제 설정과 어긋나지 않는다.
- **PENDING 계정은 시드에 없다.** 가입 플로우가 매 실행 새 이메일로 직접 만든다.
  같은 이메일을 두 번 신청하면 409(AC-2)라서 고정 이메일로는 두 번째 실행부터 깨진다.

## 이 환경에서 미리 알아야 할 것

첫 실행에서 원인 판별에 시간을 쓰지 않도록, 실제로 확인한 사실만 적는다.

- **`SUPPORT_CONTACT_EMAIL` 은 e2e 컨테이너에 전달되지 않는다.** `docker-compose.yml` 의 `api`
  서비스가 이 변수를 넘기지 않아 응답의 `support_contact_email` 은 **항상 `null`** 이고,
  화면에는 대체 안내("문의 창구를 준비하고 있어요…")가 나온다. 정상 응답이다 (AC-43·44).
  그래서 플로우는 문의 주소 행을 단언하지 않는다 — 주소가 **있는** 경로는 이 환경에서 재현되지 않는다.
- **가입 신청은 동일 IP 시간당 10회로 제한된다.** 컨테이너 밖에서 오는 요청은 전부 도커 게이트웨이
  주소 하나로 묶이므로, 한 시간 안에 가입 플로우를 11번째 돌리면 429 `AUTH_SIGNUP_RATE_LIMITED` 가
  난다. 카운터는 프로세스 메모리라(server.md S-29) API 컨테이너를 다시 띄우면 초기화된다.
- **`appId` 는 iOS 번들 ID 다** (`org.reactjs.native.example.Planbee`).
  안드로이드의 `applicationId` 는 `com.planbee` 로 **다르다** — 지금 플로우를 안드로이드에서
  그대로 돌리면 앱을 찾지 못한다. 번들 ID 확정은 사람 판단 사항이라(절대규칙 8)
  임의로 맞추지 않았다. `docs/features/auth/status.md` 의 `ASK` 참조.
