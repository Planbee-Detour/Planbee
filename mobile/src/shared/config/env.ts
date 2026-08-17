/**
 * 환경 설정. 값을 코드에 하드코딩하지 않는다.
 *
 * iOS 시뮬레이터는 localhost 로 Mac 의 서버에 접근할 수 있지만,
 * 실기기에서는 `.env` 의 API_BASE_URL 을 Mac 의 네트워크 IP 로 바꿔야 한다.
 */
import Config from 'react-native-config';

export const API_BASE_URL = Config.API_BASE_URL ?? 'http://localhost:8080';
