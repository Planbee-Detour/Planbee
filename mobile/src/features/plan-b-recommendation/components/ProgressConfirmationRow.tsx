import React from 'react';
import {Pressable, Text, View} from 'react-native';

import type {ScheduleItem, ScheduleProgress} from '../types';

type Props = {item: ScheduleItem; value?: ScheduleProgress; onChange: (value: ScheduleProgress) => void};

export function ProgressConfirmationRow({item, value, onChange}: Props) {
  return (
    <View className="rounded-card border border-border bg-surface p-4">
      <Text className="text-title font-semibold text-ink">{item.place_name}</Text>
      <Text className="mt-1 text-caption text-ink-muted">{item.time_label}</Text>
      <View className="mt-3 flex-row gap-2">
        {([['COMPLETED', '다녀왔어요'], ['PLANNED', '아직이에요']] as const).map(([next, label]) => (
          <Pressable key={next} accessibilityRole="button" accessibilityState={{selected: value === next}}
            className={`min-h-11 flex-1 items-center justify-center rounded-button border ${value === next ? 'border-brand bg-brand-light' : 'border-border bg-surface'}`}
            onPress={() => onChange(next)}>
            <Text className="text-body-sm font-semibold text-ink">{value === next ? '✓ ' : ''}{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
