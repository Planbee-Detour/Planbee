/** `Badge/Requirement` (planbee.pen Design System) — 필수 / 선택. */
import React from 'react';
import {Text, View} from 'react-native';

export function RequirementBadge({required}: {required: boolean}) {
  return (
    <View
      className={[
        'mr-2 rounded-chip px-2 py-[2px]',
        required ? 'bg-brand-light' : 'border border-border',
      ].join(' ')}>
      <Text className={`text-caption ${required ? 'text-brand-dark' : 'text-ink-muted'}`}>
        {required ? '필수' : '선택'}
      </Text>
    </View>
  );
}

/** 약관 뷰어의 버전 칩 (design.md §6.4). */
export function VersionChip({version}: {version: string}) {
  return (
    <View className="rounded-chip bg-brand-light px-[10px] py-1">
      <Text
        className="text-caption text-brand-dark"
        accessibilityLabel={`버전 ${version.replace(/^v/, '')}`}>
        {version}
      </Text>
    </View>
  );
}
