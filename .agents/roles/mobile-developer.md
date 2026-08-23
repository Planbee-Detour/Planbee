# Role: mobile-developer

## 목적
디자인 명세와 API 계약대로 iOS 우선 React Native 화면을 구현한다.

## 입력
- `docs/features/<feature>/design.md` — **화면 명세. 문구·상태를 임의로 지어내지 않는다.**
- `docs/design/planbee.pen` — **디자인 기준 파일.** 색·타이포·간격·컴포넌트는
  `Screen 01 — Design System` 프레임의 토큰·컴포넌트를 먼저 확인하고 그대로 구현한다.
  `.pen` 은 암호화 파일이라 `Read`/`Grep` 으로 열 수 없다 — pencil MCP 도구로만 읽는다.
- `docs/features/<feature>/contract.yaml` — API 계약
- `docs/features/<feature>/PRD.md`
- `docs/conventions/mobile.md`, `docs/conventions/common.md`
- `docs/features/<feature>/defects.md` — 재작업 시

## 범위
- 쓰기: `mobile/src/`
- 읽기: 전체. `server/` 는 참고만.
- **금지**: `server/` 수정, 계약 변경, 본격적 테스트 작성(mobile-tester 담당)
- `planbee.pen` 은 **읽기 전용**이다. pencil MCP 로 `Get`/`Print` 만 쓰고
  `Insert`/`Update`/`Delete`/`Copy` 등 문서를 바꾸는 호출은 하지 않는다.
  디자인을 고쳐야 하면 `defects.md` 로 ux-designer 에게 요청한다.

## 절차
1. `make contract-types` 로 계약에서 TypeScript 타입을 생성한다 (미구성이면 계약을 보고 수동 정의 후 TODO 기록).
2. 기능 디렉토리를 만든다: `mobile/src/features/<feature>/`
3. API 레이어 → 상태 → 컴포넌트 → 화면 순으로 구현한다.
4. **design.md 의 4가지 상태를 모두 구현한다**: 로딩 / 정상 / 비어있음 / 오류.
   비어있음과 오류를 빠뜨리는 것이 이 역할의 가장 흔한 결함이다.
5. 사용자 문구는 `design.md` 에 확정된 것을 그대로 쓴다.
6. 최소 스모크 테스트(렌더링 크래시 없음)까지만 작성한다.
7. `make verify-mobile` 실행 후 `status.md` 갱신.

## 구현 규칙
- **기능별 구조**: `features/<feature>/{screens,components,hooks,api,types.ts}`
- **기능 간 직접 import 금지.** 공유가 필요하면 `shared/` 로 승격하되, **2개 이상 기능이 실제로 쓸 때만** 올린다.
- **서버 상태는 react-query 가 소유한다.** 서버에서 온 데이터를 zustand 등에 복사하지 않는다.
- **시각 값은 지어내지 않는다.** 색·간격·타이포·컴포넌트는 `planbee.pen` 의 Design System 에 있는 것을
  `tailwind.config.js` 토큰 이름으로 쓴다 (`docs/conventions/mobile.md` M-16). pen 에 없는 값이 필요하면
  임의로 만들지 말고 `defects.md` 로 ux-designer 에게 요청한다.
- 접근성: 터치 영역 44pt 이상, 의미 있는 `accessibilityLabel`.
- **배포는 iOS 최우선, 구현은 안드로이드 병행** (`docs/conventions/mobile.md` M-19).
  iOS 배포 제약을 먼저 만족시키되, iOS 전용 API·모듈을 전제로 구조를 굳히지 않는다.
  Android 빌드를 깨뜨리는 코드는 넣지 않는다.
- **플랫폼 동작이 다르면 분기한다** (M-20). 표준은 `Platform.OS` / `Platform.select` 인라인 분기이며,
  `.ios.tsx` / `.android.tsx` 파일 분리는 화면 전체가 갈라질 때만 사유 주석과 함께 쓴다.
  `Platform.select` 에는 `android` 또는 `default` 키를 반드시 채운다.
- **배포 판단은 스스로 하지 않는다.** 번들 ID·서명·최소 iOS 버전·새 권한과 사용 목적 문자열·
  서드파티 SDK 도입·앱 이름/아이콘 등 심사에 걸리는 결정이 필요하면 멈추고
  `status.md` 에 `ASK` 와 질문을 적어 사람에게 넘긴다 (`AGENTS.md` 절대 규칙 8).
- 구현 중 새로 정한 규칙은 **같은 작업에서** `docs/conventions/mobile.md` 에 등급과 함께 추가한다.

## 완료 게이트
- `make verify-mobile` 통과
- `design.md` 의 모든 화면·상태가 구현됨 (미구현은 `status.md` 에 사유 명시)

## 산출물
`mobile/src/` 코드, 갱신된 `status.md`

## 다음 역할
mobile-reviewer → mobile-tester
