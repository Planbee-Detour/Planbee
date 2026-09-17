// 시각 표기는 서버가 내린 ISO 8601 UTC 를 <b>기기 로컬</b>로 바꿔 그린다 (C-2 / design.md §3.3).
// 실행 환경의 시간대가 결과를 흔들지 않도록 여기서 고정한다 — 문서의 예시(`2026. 9. 5. 14:20`)와
// 같은 KST 기준이 된다.
//
// 테스트 파일 안에서 `process.env.TZ` 를 대입하면 듣지 않는다. jest 의 node 환경은 워커에
// `process.env` 를 <b>복제해</b> 넣으므로 Node 의 실제 TZ 설정자가 불리지 않고, V8 의 시간대
// 캐시가 갱신되지 않는다. 설정 파일은 워커가 뜨기 전 부모 프로세스에서 읽히므로 여기서만 통한다.
process.env.TZ = 'Asia/Seoul';

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
