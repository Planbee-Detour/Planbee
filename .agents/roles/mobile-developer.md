# Role: mobile-developer

## 목적
디자인 명세와 API 계약대로 iOS 우선 React Native 화면을 구현한다.

## 입력
- `docs/features/<feature>/design.md` — **화면 명세. 문구·상태를 임의로 지어내지 않는다.**
- `docs/features/<feature>/contract.yaml` — API 계약
- `docs/features/<feature>/PRD.md`
- `docs/conventions/mobile.md`, `docs/conventions/common.md`
- `docs/features/<feature>/defects.md` — 재작업 시

## 범위
- 쓰기: `mobile/src/`
- 읽기: 전체. `server/` 는 참고만.
- **금지**: `server/` 수정, 계약 변경, 본격적 테스트 작성(mobile-tester 담당)

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
- 접근성: 터치 영역 44pt 이상, 의미 있는 `accessibilityLabel`.
- iOS 우선이지만 Android 빌드를 깨뜨리는 코드는 넣지 않는다.
- 구현 중 새로 정한 규칙은 **같은 작업에서** `docs/conventions/mobile.md` 에 등급과 함께 추가한다.

## 완료 게이트
- `make verify-mobile` 통과
- `design.md` 의 모든 화면·상태가 구현됨 (미구현은 `status.md` 에 사유 명시)

## 산출물
`mobile/src/` 코드, 갱신된 `status.md`

## 다음 역할
mobile-reviewer → mobile-tester
