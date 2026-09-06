/**
 * `Input/Checkbox` (planbee.pen Design System).
 *
 * 체크박스와 그 옆의 "보기" 링크는 터치 영역이 겹치면 안 된다 (design.md §5.4) —
 * "보기" 를 누르려다 동의가 체크되면 동의를 받은 적 없는 항목이 체크된 것으로 저장된다.
 * 그래서 이 컴포넌트는 <b>행 전체</b>를 받지 않고 체크 영역만 담당하고,
 * 우측 슬롯은 형제로 배치한다.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
  /** 라벨 뒤에 붙는 부가 표기 (예: 약관 버전 "v1.0") */
  suffix?: string;
  /** 라벨 아래 한 줄 부연 */
  description?: string;
  /** 라벨 앞에 붙는 [필수]/[선택] 배지 */
  badge?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export function Checkbox({
  checked,
  onToggle,
  label,
  suffix,
  description,
  badge,
  disabled = false,
  testID,
}: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{checked, disabled}}
      accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={onToggle}
      testID={testID}
      className="min-h-[56px] flex-1 flex-row items-center py-2">
      <View
        className={[
          'h-[22px] w-[22px] items-center justify-center rounded-[6px] border',
          checked ? 'bg-brand border-brand' : 'bg-surface border-border',
        ].join(' ')}>
        {checked ? <Text className="text-caption text-ink">✓</Text> : null}
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row flex-wrap items-center">
          {badge}
          {/* 라벨은 줄여 쓰거나 말줄임하지 않는다 — 동의 대상이 잘려서는 안 된다 (§5.4) */}
          <Text className="text-body text-ink">{label}</Text>
          {suffix ? <Text className="ml-2 text-caption text-ink-muted">{suffix}</Text> : null}
        </View>
        {description ? (
          <Text className="mt-1 text-caption text-ink-muted">{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
