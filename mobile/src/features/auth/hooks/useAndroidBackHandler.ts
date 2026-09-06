/**
 * 안드로이드 하드웨어 뒤로가기를 화면별로 다르게 처리한다 (design.md §1.3 / M-19 · M-20).
 *
 * `BackHandler` 는 안드로이드에서만 이벤트를 내지만, iOS 에서도 안전하게 no-op 이 되도록
 * 한 파일에서 양쪽 경로를 함께 둔다 — `.android.ts` 로 파일을 나누면 Jest 프리셋이
 * 안드로이드 파일을 아예 로드하지 않아 검증 밖으로 빠진다 (M-20).
 *
 * @param onBack `true` 를 돌려주면 기본 동작(화면 pop / 앱 백그라운드)을 막는다
 */
import {useCallback} from 'react';
import {BackHandler} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

export function useAndroidBackHandler(onBack: () => boolean) {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [onBack]),
  );
}
