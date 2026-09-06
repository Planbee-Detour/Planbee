/** `Layout/ListRow` (planbee.pen Design System) — 설정 화면의 카드 안 행. */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  label: string;
  /** 우측에 표시할 값 */
  value?: string;
  /** 눌러서 이동하는 행이면 준다. 없으면 값 표시 전용 행이다 */
  onPress?: () => void;
  /** 이동 행의 › 표시 */
  chevron?: boolean;
  tone?: 'default' | 'danger';
  accessibilityHint?: string;
  /** 값 자리에 넣을 커스텀 노드 (스켈레톤, "다시 시도" 등) */
  valueSlot?: React.ReactNode;
  testID?: string;
};

export function ListRow({
  label,
  value,
  onPress,
  chevron = false,
  tone = 'default',
  accessibilityHint,
  valueSlot,
  testID,
}: Props) {
  const labelColor = tone === 'danger' ? 'text-danger' : 'text-ink';

  const content = (
    <View className="min-h-[56px] flex-row items-center px-4">
      <Text className={`flex-1 text-body ${labelColor}`}>{label}</Text>
      {valueSlot ??
        (value ? <Text className="ml-3 text-body-sm text-ink-muted">{value}</Text> : null)}
      {chevron ? (
        <Text className={`ml-2 text-body ${tone === 'danger' ? 'text-danger' : 'text-ink-muted'}`}>
          ›
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    // 값 표시 전용 행은 버튼으로 읽히면 안 된다 (design.md §8.6).
    return (
      <View accessibilityRole="text" accessibilityLabel={value ? `${label}, ${value}` : label} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}>
      {content}
    </Pressable>
  );
}

/** 카드 안 행 사이의 구분선. 좌측 16 들여쓰기 (design.md §8.2). */
export function ListDivider() {
  return <View className="ml-4 h-[1px] bg-border" />;
}

/** 행들을 감싸는 카드. */
export function ListCard({children}: React.PropsWithChildren) {
  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface">{children}</View>
  );
}
