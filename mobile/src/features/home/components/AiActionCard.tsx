import React from 'react';
import {Pressable, Text, View} from 'react-native';

export function AiActionCard() {
  return (
    <Pressable
      accessibilityRole="button"
      className="mt-5 min-h-[104px] flex-row items-center rounded-card bg-brand-light p-4 active:opacity-70">
      <View className="h-10 w-10 items-center justify-center rounded-button bg-surface">
        <Text className="text-title text-brand">✦</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-caption font-medium text-brand-dark">
          Planbee AI에게 물어보기
        </Text>
        <Text className="mt-1 text-title font-semibold text-ink">
          지금 상황을 알려주세요
        </Text>
        <Text className="mt-1 text-caption text-ink-body">
          현재 위치와 시간을 바탕으로 새로운 계획을 추천해드릴게요.
        </Text>
      </View>
      <Text className="px-1 text-h1 text-ink">›</Text>
    </Pressable>
  );
}
