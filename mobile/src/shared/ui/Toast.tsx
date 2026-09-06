/**
 * `Feedback/Toast` (planbee.pen Design System).
 *
 * 2초 후 자동으로 사라진다. 배너와 동시에 뜨지 않는다 (design.md §4.3) —
 * 그 조율은 이 컴포넌트가 아니라 화면이 한다.
 */
import React, {useEffect} from 'react';
import {Text, View} from 'react-native';

import {LIVE_REGION_POLITE, useAnnounceForAccessibility} from '../lib/a11y';

const VISIBLE_MS = 2000;

export function Toast({message, onHide}: {message: string; onHide: () => void}) {
  useEffect(() => {
    const timer = setTimeout(onHide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  // 안드로이드는 아래 라이브 리전이, iOS 는 이 훅이 읽는다 (M-20 / design.md §12).
  useAnnounceForAccessibility(message);

  return (
    <View
      accessibilityRole="alert"
      {...LIVE_REGION_POLITE}
      pointerEvents="none"
      className="absolute inset-x-5 bottom-10 items-center">
      <View className="rounded-card bg-ink px-4 py-3">
        <Text className="text-body-sm text-on-dark">{message}</Text>
      </View>
    </View>
  );
}
