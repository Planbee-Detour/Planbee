/**
 * 디자인 토큰의 **값**. `tailwind.config.js` 가 그대로 읽어 Tailwind 테마로 쓰고,
 * `className` 을 받지 못하는 RN prop 은 `src/shared/ui/tokens.ts` 를 통해 같은 값을 읽는다.
 * (mobile.md M-16 / common.md C-9)
 *
 * 값의 시각적 원본은 `docs/design/planbee.pen` 의 `Screen 01 — Design System` 이고
 * 이 파일은 그 사본이다. 둘이 어긋나면 pen 을 기준으로 여기를 고친다.
 *
 * **왜 `tailwind.config.js` 가 아니라 이 파일인가.**
 * `tailwind.config.js` 는 최상단에서 `nativewind/preset` 을 `require` 한다 — 빌드 도구용 모듈이라
 * 앱 번들에서 import 하면 tailwindcss 의 Node 전용 의존성까지 딸려 온다. 그래서 값만 담은
 * 의존성 없는 이 모듈을 두고 config 와 앱이 **같은 한 파일**을 읽게 했다.
 * 값을 고칠 곳은 여기 하나다. (2026-08-27, defects.md D-M2)
 *
 * 앱 코드에서 이 파일을 직접 import 하지 않는다 — `src/shared/ui/tokens.ts` 를 거친다.
 */

/** Screen 01 — Design System / Color */
const colors = {
  // Color/Brand
  brand: {
    DEFAULT: '#FFB020', // Color/Brand/Honey
    dark: '#E89100', // Color/Brand/HoneyDark
    light: '#FFF1CC', // Color/Brand/HoneyLight
  },
  // Color/Text — ink 는 Color/Brand/BeeBlack 과 같은 값이다
  ink: {
    DEFAULT: '#171717', // Color/Text/Primary
    body: '#333333', // Color/Text/Body
    muted: '#737373', // Color/Text/Secondary
  },
  'on-dark': '#FFFFFF', // Color/Text/OnDark
  // Color/Neutral
  background: '#FAFAF8',
  surface: '#FFFFFF',
  cream: '#FFF9EE', // Color/Neutral/CreamSurface
  border: '#E8E6E1',
  // Color/Semantic
  success: '#2E9B64',
  danger: '#D94A4A',
};

/** 타이포 스케일. 이름은 design.md 가 쓰는 것과 같다. */
const fontSize = {
  display: ['28px', {lineHeight: '34px', fontWeight: '700'}],
  h1: ['24px', {lineHeight: '30px', fontWeight: '700'}],
  h2: ['20px', {lineHeight: '26px', fontWeight: '600'}],
  title: ['17px', {lineHeight: '24px', fontWeight: '600'}],
  body: ['16px', {lineHeight: '24px', fontWeight: '400'}],
  'body-sm': ['14px', {lineHeight: '22px', fontWeight: '400'}],
  caption: ['12px', {lineHeight: '18px', fontWeight: '500'}],
};

const borderRadius = {
  card: '16px',
  button: '14px',
  input: '16px',
  chip: '999px',
};

module.exports = {colors, fontSize, borderRadius};
