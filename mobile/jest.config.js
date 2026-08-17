module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // RN 프리셋의 transform 은 .mjs 를 다루지 않는다. msw 의존성 일부가 .mjs 로만 배포되므로 추가한다.
  transform: {
    '^.+\\.(js|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
  // RN 생태계와 msw 계열 패키지는 ESM 으로 배포되므로 변환 대상에 포함해야 한다.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation' +
      '|nativewind|react-native-css-interop|react-native-.*|@tanstack' +
      '|msw|@mswjs|@open-draft|rettime|until-async|outvariant|strict-event-emitter|headers-polyfill' +
      '|@bundled-es-modules|is-node-process|graphql|path-to-regexp|tough-cookie|statuses)/)',
  ],
};
