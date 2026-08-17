/**
 * @format
 */

// NativeWind 스타일시트 진입점. 앱 엔트리에서 한 번만 불러온다.
import './global.css';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
