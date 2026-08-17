/**
 * 디자인 토큰의 단일 원본.
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
        cream: '#FFF9ED',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#24211B',
          soft: '#403B32',
          muted: '#655E52',
        },
        brand: {
          DEFAULT: '#F2B134',
          dark: '#A06A00',
          ink: '#2A2111',
        },
        success: '#32A36A',
        danger: '#D7654D',
      },
    },
  },
  plugins: [],
};
