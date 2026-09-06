/** `Layout/NavBar` (planbee.pen Design System). */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  title: string;
  /** 좌측 버튼. 없으면 되돌아갈 곳이 없는 화면이다 (예: 계정 상태 안내) */
  left?: {label: string; accessibilityLabel: string; onPress: () => void};
  /** 스크롤이 최상단이 아닐 때 하단 구분선을 보인다 (design.md §6.3) */
  showDivider?: boolean;
};

export function NavBar({title, left, showDivider = false}: Props) {
  return (
    <View className={`bg-background ${showDivider ? 'border-b border-border' : ''}`}>
      <View className="min-h-[52px] flex-row items-center px-5">
        {left ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={left.accessibilityLabel}
            onPress={left.onPress}
            hitSlop={12}
            className="min-h-[44px] min-w-[44px] justify-center">
            <Text className="text-body text-ink">{left.label}</Text>
          </Pressable>
        ) : (
          <View className="min-w-[44px]" />
        )}

        <Text
          accessibilityRole="header"
          className="flex-1 text-center text-title text-ink"
          numberOfLines={1}>
          {title}
        </Text>

        {/* 우측은 비어 있어도 자리를 잡아야 타이틀이 가운데로 온다 */}
        <View className="min-w-[44px]" />
      </View>
    </View>
  );
}
