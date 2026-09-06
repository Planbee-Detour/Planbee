/**
 * 디자인 토큰의 코드 측 단일 원본. (mobile.md M-16)
 *
 * 값 자체는 `tailwind.tokens.js` 에 있고 이 파일은 그것을 Tailwind 테마로 배선하기만 한다 —
 * `className` 을 받지 못하는 RN prop(`color`·`placeholderTextColor`·`backgroundColor`)이
 * 같은 값을 읽어야 하는데, 이 파일은 `nativewind/preset` 을 require 해서 앱 번들에 넣을 수 없다.
 * (2026-08-27, defects.md D-M2)
 *
 * 값의 시각적 원본은 `docs/design/planbee.pen` 의 `Screen 01 — Design System` 이고
 * `tailwind.tokens.js` 는 그 사본이다 (common.md C-9). 둘이 어긋나면 pen 을 기준으로 코드를 고친다.
 * ux-designer 가 `design.md` 에서 쓰는 이름과 토큰 이름을 일치시킨다.
 *
 * 화면 코드에 색상 리터럴(#RRGGBB)이나 즉석 수치를 쓰지 않는다.
 *
 * 2026-08-26 — auth 구현에 앞서 pen 값으로 교정했다. 이전 값(#F2B134 계열)은 pen 과 달랐고,
 * `auth` status.md 의 결정 기록이 "mobile-developer 가 auth 구현 전에 반영" 으로 지정했다.
 * 대상 값은 `docs/features/auth/design.md` §2.1 표다.
 *
 * @type {import('tailwindcss').Config}
 */
const {colors, fontSize, borderRadius} = require('./tailwind.tokens');

module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {colors, fontSize, borderRadius},
  },
  plugins: [],
};
