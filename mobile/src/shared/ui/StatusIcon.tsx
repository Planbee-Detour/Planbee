/**
 * `Feedback/StatusIcon` (planbee.pen Design System) — 계정 상태 안내 화면의 72×72 원형 아이콘.
 *
 * <b>`accessibilityLabel` 을 붙이지 않는다</b> (design.md §7.6) — 바로 아래 제목이 같은 정보를
 * 주므로 스크린리더가 같은 말을 두 번 하게 된다.
 *
 * 아이콘 라이브러리를 새로 들이지 않고 글리프로 표현한다. 새 의존성은 배포 심사에 영향을 주는
 * 결정이라 사람에게 물어야 한다 (M-19 / 절대 규칙 8).
 */
import React from 'react';
import {Text, View} from 'react-native';

export type StatusIconTone = 'brand' | 'neutral' | 'danger';

const CONTAINER: Record<StatusIconTone, string> = {
  brand: 'bg-brand-light',
  neutral: 'bg-surface border border-border',
  danger: 'bg-surface border border-danger',
};

const GLYPH: Record<StatusIconTone, string> = {
  brand: 'text-brand-dark',
  neutral: 'text-ink-muted',
  danger: 'text-danger',
};

export function StatusIcon({tone, glyph}: {tone: StatusIconTone; glyph: string}) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={`h-[72px] w-[72px] items-center justify-center rounded-full ${CONTAINER[tone]}`}>
      <Text className={`text-h1 ${GLYPH[tone]}`}>{glyph}</Text>
    </View>
  );
}
