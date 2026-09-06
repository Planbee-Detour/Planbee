import React from 'react';
import {Pressable, Text, View} from 'react-native';

const quickActions = [
  {icon: '⌖', label: '근처 추천'},
  {icon: '◷', label: '남는 시간'},
  {icon: '⇄', label: '일정 변경'},
  {icon: '♧', label: '코스 추천'},
];

export function QuickActionList() {
  return (
    <View className="mt-3 flex-row gap-2">
      {quickActions.map(({icon, label}) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          className="min-h-[72px] flex-1 items-center justify-center rounded-card border border-border bg-surface active:opacity-70">
          <Text className="text-h2 text-brand">{icon}</Text>
          <Text className="mt-1 text-caption text-ink-muted">{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
