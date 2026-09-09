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
  /**
   * 낭독에서 값 자리에 읽을 문자열. 보이는 값과 읽는 값이 다를 때만 준다.
   *
   * 예: 관리자 진입 행은 화면에 "3건" 만 보이지만 낭독은 "가입 신청 관리, 검토 대기 3건" 이다
   * (`admin-user-approval` design.md §4.6). 값이 비어 있는 0건 행도 낭독에서는
   * "검토 대기 없음" 을 말해야 한다 — 시각적으로는 비움이 정보지만 낭독에서 침묵은 정보가 아니다.
   */
  valueLabel?: string;
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
  valueLabel,
  testID,
}: Props) {
  const labelColor = tone === 'danger' ? 'text-danger' : 'text-ink';
  const spokenValue = valueLabel ?? value;

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
      <View accessibilityRole="text" accessibilityLabel={spokenValue ? `${label}, ${spokenValue}` : label} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spokenValue ? `${label}, ${spokenValue}` : label}
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
