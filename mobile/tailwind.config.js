/**
 * docs/design/planbee.pen의 Screen 01 — Design System을 코드로 옮긴 토큰 사본.
 * ux-designer 가 docs/features/<기능>/design.md 에서 참조하는 이름과 여기 이름을 일치시킨다.
 * 화면 코드에 색상 리터럴(#RRGGBB)을 직접 쓰지 않는다. (mobile.md M-15)
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        surface: '#FFFFFF',
        cream: '#FFF9EE',
        border: '#E8E6E1',
        ink: {
          DEFAULT: '#171717',
          body: '#333333',
          muted: '#737373',
          inverse: '#FFFFFF',
        },
        brand: {
          DEFAULT: '#FFB020',
          dark: '#E89100',
          light: '#FFF1CC',
          ink: '#171717',
        },
        success: '#2E9B64',
        danger: '#D94A4A',
      },
      fontFamily: {
        sans: ['Noto Sans KR'],
      },
      fontSize: {
        display: ['28px', {lineHeight: '36px'}],
        h1: ['24px', {lineHeight: '32px'}],
        h2: ['20px', {lineHeight: '28px'}],
        title: ['17px', {lineHeight: '24px'}],
        body: ['16px', {lineHeight: '24px'}],
        'body-sm': ['14px', {lineHeight: '20px'}],
        caption: ['12px', {lineHeight: '16px'}],
      },
      borderRadius: {
        card: '16px',
        button: '14px',
        input: '16px',
        chip: '999px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
