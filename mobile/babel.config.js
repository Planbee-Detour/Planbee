module.exports = {
  presets: [
    ['module:@react-native/babel-preset', {jsxImportSource: 'nativewind'}],
    'nativewind/babel',
  ],
  // worklets 플러그인은 반드시 마지막에 온다.
  // (react-native-gesture-handler 3.x 가 worklets 를 요구한다)
  plugins: ['react-native-worklets/plugin'],
};
