import React from 'react';
import {Pressable, Text, View} from 'react-native';

type HomeHeaderProps = {
  isResolvingRegion: boolean;
  region: string | null;
};

export function HomeHeader({isResolvingRegion, region}: HomeHeaderProps) {
  const locationLabel = isResolvingRegion
    ? '지역 확인 중'
    : region ?? '지역을 설정해 주세요';

  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-title font-semibold text-ink">Planbee</Text>
        <Text className="mt-1 text-caption text-ink-muted">● {locationLabel}⌄</Text>
      </View>
      <Pressable
        accessibilityLabel="알림"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-chip border border-border bg-surface active:opacity-70">
        <Text className="text-h2 text-ink">♧</Text>
      </Pressable>
    </View>
  );
}
