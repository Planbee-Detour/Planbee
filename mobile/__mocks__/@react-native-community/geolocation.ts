/**
 * `@react-native-community/geolocation` 수동 목 — `jest.setup.ts` 의 `jest.mock()` 이 이 파일을 쓴다.
 *
 * 기본값은 <b>즉시 성공</b>이다. 그래서 이 목을 그대로 둔 화면은 렌더 직후 바로 조회로 넘어간다 —
 * msw 핸들러를 등록하지 않으면 `onUnhandledRequest: 'error'` 에 걸려 오류 상태가 된다 (M-11).
 * 측위가 끝나지 않는 동안(로딩)을 보려는 테스트는 `getCurrentPosition` 이 콜백하지 않도록
 * 덮어써야 한다. 덮어쓸 수 있게 `jest.fn()` 으로 둔다.
 */
type Position = {coords: {latitude: number; longitude: number}};

const Geolocation = {
  requestAuthorization: jest.fn((success: () => void) => success()),
  getCurrentPosition: jest.fn((success: (position: Position) => void) =>
    success({coords: {latitude: 37.4563, longitude: 126.8956}}),
  ),
};

export default Geolocation;
