/**
 * 첫 진입 로딩 — 카드 스켈레톤 3개 (design.md §5.7 — `Screen 18b`).
 *
 * 각 스켈레톤은 실제 카드와 같은 최소 높이(72)를 갖는다. 펄스는 `Animated` opacity 루프
 * 하나로 만든다 — reanimated 는 아직 도입하지 않았다 (`mobile.md` 미확정).
 * "동작 줄이기" 가 켜져 있으면 정지 상태로 둔다.
 */
import React, {useEffect, useRef} from 'react';
import {Animated, View} from 'react-native';

import {useReduceMotion} from '../hooks/useReduceMotion';

const CARD_COUNT = 3;
const PULSE_MS = 700;

export function ListSkeleton({accessibilityLabel}: {accessibilityLabel: string}) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.4, duration: PULSE_MS, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 1, duration: PULSE_MS, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      {Array.from({length: CARD_COUNT}).map((_unused, index) => (
        <Animated.View
          key={index}
          style={{opacity}}
          className="mb-3 min-h-[72px] rounded-card border border-border bg-surface p-4">
          {/* 이메일 200×16 / 사유 2줄 14 / 시각 140×12 (design.md §5.7) */}
          <View className="h-4 w-[200px] rounded-[4px] bg-border" />
          <View className="mt-2 h-[14px] w-full rounded-[4px] bg-border" />
          <View className="mt-1 h-[14px] w-4/5 rounded-[4px] bg-border" />
          <View className="mt-2 h-3 w-[140px] rounded-[4px] bg-border" />
        </Animated.View>
      ))}
    </View>
  );
}
