/**
 * `Button/Primary` · `Button/Secondary` · `Button/Danger` (planbee.pen Design System)
 */
import React from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';

import {COLOR} from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** 비활성. 눌러도 아무 일이 없고 대비도 낮춘다 */
  disabled?: boolean;
  /** 진행 중. 라벨을 `loadingLabel` 로 바꾸고 스피너를 붙인다 */
  loading?: boolean;
  loadingLabel?: string;
  /** 비활성 사유를 스크린리더에 알린다 (design.md §5.5) */
  accessibilityHint?: string;
  testID?: string;
};

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-ink',
  secondary: 'bg-surface border border-border',
  danger: 'bg-danger',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-on-dark',
  secondary: 'text-ink',
  danger: 'text-on-dark',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingLabel,
  accessibilityHint,
  testID,
}: Props) {
  const inactive = disabled || loading;
  const shownLabel = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled: inactive, busy: loading}}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      // 최소 높이 52 — 디자인이 지정한 값이자 M-10 의 44pt 를 넘긴다.
      className={[
        'min-h-[52px] flex-row items-center justify-center rounded-button px-4',
        disabled && !loading ? 'bg-border' : CONTAINER[variant],
      ].join(' ')}>
      {loading ? (
        <View className="mr-2">
          <ActivityIndicator
            size="small"
            // 스피너 색은 라벨 색과 같아야 하는데 RN 의 color prop 은 className 을 받지 않는다.
            // 리터럴 대신 토큰 값을 읽는다 (M-16).
            color={variant === 'secondary' ? COLOR.ink : COLOR.onDark}
          />
        </View>
      ) : null}
      <Text className={`text-title ${disabled && !loading ? 'text-ink-muted' : LABEL[variant]}`}>
        {shownLabel}
      </Text>
    </Pressable>
  );
}

/**
 * 본문 안에 놓이는 텍스트 버튼. 배너의 "다시 시도", 문의 행의 "문의하기" 등.
 * 시각적으로 가볍지만 터치 영역은 44pt 를 지킨다 (M-10).
 */
export function TextButton({
  label,
  onPress,
  tone = 'default',
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'muted' | 'danger';
  accessibilityHint?: string;
  testID?: string;
}) {
  const color =
    tone === 'danger' ? 'text-danger' : tone === 'muted' ? 'text-ink-muted' : 'text-ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      hitSlop={12}
      className="min-h-[44px] justify-center">
      <Text className={`text-body-sm font-semibold ${color}`}>{label}</Text>
    </Pressable>
  );
}
