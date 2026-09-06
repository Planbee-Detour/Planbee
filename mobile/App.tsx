/**
 * 앱 진입점. 화면 구성은 `app/navigation/RootNavigator` 가 갖는다.
 */
import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';

import {AppProviders} from './src/app/providers';
import {configureSession} from './src/app/configureSession';
import {RootNavigator} from './src/app/navigation/RootNavigator';
import {COLOR} from './src/shared/ui/tokens';

function App() {
  // 401 갱신과 세션 만료 처리를 첫 요청 전에 연결한다 (M-14).
  useEffect(() => {
    configureSession();
  }, []);

  return (
    <AppProviders>
      {/* 배경은 Color/Neutral/Background. 안드로이드는 상태바 배경색을 직접 받는다 (M-20).
          `backgroundColor` 는 className 을 받지 않아 토큰 값을 읽어 넘긴다 (M-16) */}
      <StatusBar barStyle="dark-content" backgroundColor={COLOR.background} />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
