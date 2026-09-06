jest.mock('@react-native-community/geolocation');
jest.mock('react-native-mmkv');
/**
 * 모바일 테스트 공통 설정.
 *
 * API 는 반드시 msw 로 목킹하고 서버를 띄우지 않는다. (mobile.md M-11)
 * 핸들러에 없는 요청은 오류로 처리해, 테스트가 모르는 사이에 실제 네트워크를 타지 않도록 한다.
 */
// 네이티브 제스처 모듈은 테스트 환경에 없으므로 공식 목을 등록한다.
import 'react-native-gesture-handler/jestSetup';

import {server} from './src/shared/test/mswServer';

beforeAll(() => {
  server.listen({onUnhandledRequest: 'error'});
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
