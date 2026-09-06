# `shared/ui` — 디자인 시스템 컴포넌트

`docs/design/planbee.pen` 의 `Screen 01 — Design System` 프레임을 코드로 옮긴 것이다.
값(색·타이포·간격)의 원본은 pen 이고, 코드 측 토큰은 `tailwind.tokens.js` 다 (mobile.md M-16).
`tailwind.config.js` 가 그 파일을 읽어 Tailwind 테마로 배선하고, `className` 을 받지 못하는
RN prop 은 `tokens.ts` 의 `COLOR` 로 같은 값을 읽는다.

**M-3(2개 이상 기능이 쓸 때만 shared 로 올린다)의 예외다.** 디자인 시스템은 정의상
기능에 속하지 않는다 — pen 의 Design System 프레임이 앱 전체의 공용 어휘이고,
이걸 첫 사용 기능(`features/auth/`) 안에 두면 두 번째 기능이 생기는 순간
"기능 A 에서 기능 B 로 import" 라는 M-2 위반이 강제된다.

기능 전용 조합(예: `auth` 의 동의 블록)은 여기 두지 않고 `features/<기능>/components/` 에 둔다.
