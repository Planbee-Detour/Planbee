/**
 * `Feedback/EmptyState` (planbee.pen Design System — `Section — Admin List & Sheet`).
 *
 * 아이콘 32 + 제목 + 부연 + 선택적 버튼, 세로 중앙 정렬
 * (`admin-user-approval` design.md §5.8 · §5.9 · §5.10 · §8.3).
 * 빈 상태와 목록 오류가 같은 골격을 6번 쓰고 문구·아이콘·버튼만 갈린다.
 *
 * `Feedback/StatusIcon`(72×72 원형)을 쓰지 않는다 (design.md §8.2) — 그것은 계정 상태를
 * 사용자에게 크게 알리는 장치이고, 목록의 빈 상태·오류에는 32px 아이콘이 맞다.
 *
 * 아이콘은 글리프로 표현한다 — 새 아이콘 라이브러리는 심사에 영향을 주는 결정이라
 * 사람에게 물어야 한다 (M-19 / 절대 규칙 8). `Feedback/StatusIcon` 과 같은 방식이다.
 */
import React from 'react';
import {Text, View} from 'react-native';

import {Button, type ButtonVariant} from './Button';

export type EmptyStateTone = 'muted' | 'danger';

export function EmptyState({
  glyph,
  tone = 'muted',
  title,
  body,
  action,
  testID,
}: {
  glyph: string;
  tone?: EmptyStateTone;
  title: string;
  body: string;
  action?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    loadingLabel?: string;
    /** §5.9 재시도는 `Button/Secondary`, §5.10 "설정으로 돌아가기" 는 `Button/Primary` 다 */
    variant?: ButtonVariant;
  };
  testID?: string;
}) {
  return (
    // pen `B8FM7g`: 패딩 [40, 0] · 세로 중앙 · 아이콘 32 → 12 → 제목 → 4 → 부연 → 20 → 버튼
    <View className="flex-1 items-center justify-center py-10" testID={testID}>
      <Text
        // 제목이 같은 정보를 주므로 아이콘은 낭독하지 않는다 (`StatusIcon` 과 같은 판단)
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={`text-h1 ${tone === 'danger' ? 'text-danger' : 'text-ink-muted'}`}>
        {glyph}
      </Text>

      <Text accessibilityRole="header" className="mt-3 text-title text-ink">
        {title}
      </Text>
      <Text className="mt-1 text-center text-body-sm text-ink-muted">{body}</Text>

      {action ? (
        <View className="mt-5">
          <Button
            label={action.label}
            loading={action.loading}
            loadingLabel={action.loadingLabel}
            onPress={action.onPress}
            variant={action.variant ?? 'secondary'}
          />
        </View>
      ) : null}
    </View>
  );
}
