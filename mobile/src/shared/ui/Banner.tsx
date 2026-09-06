/**
 * `Feedback/Banner` (planbee.pen Design System).
 *
 * design.md §2.4 의 오류 표현 3단계 중 "화면 배너" 다. 폼 위에 나타나고,
 * 사용자가 입력을 수정하기 시작하면 사라진다 (사라지는 판단은 화면이 한다).
 */
import React, {type PropsWithChildren} from 'react';
import {Pressable, Text, View} from 'react-native';

import {LIVE_REGION_POLITE, useAnnounceForAccessibility} from '../lib/a11y';
import {TextButton} from './Button';

export type BannerTone = 'neutral' | 'danger';

type Props = PropsWithChildren<{
  title: string;
  detail?: string;
  tone?: BannerTone;
  /** 우측 텍스트 버튼 (예: "다시 시도") */
  action?: {label: string; onPress: () => void};
  /** 닫기(×) — 세션 배너에만 붙는다 (design.md §4.3) */
  onDismiss?: () => void;
  testID?: string;
}>;

export function Banner({
  title,
  detail,
  tone = 'neutral',
  action,
  onDismiss,
  children,
  testID,
}: Props) {
  /**
   * "오류 배너가 나타나면 읽어준다" (design.md §2.5). 안드로이드는 라이브 리전이,
   * iOS 는 이 훅이 담당한다 (M-20 / §12). 문장은 배너에 이미 있는 것을 이어 붙일 뿐이고
   * 새 문구를 만들지 않는다 (M-7).
   */
  useAnnounceForAccessibility(detail ? `${title}. ${detail}` : title);

  return (
    <View
      accessibilityRole="alert"
      {...LIVE_REGION_POLITE}
      testID={testID}
      className={[
        'rounded-card border bg-cream p-4',
        tone === 'danger' ? 'border-danger' : 'border-border',
      ].join(' ')}>
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text className={`text-title ${tone === 'danger' ? 'text-ink' : 'text-ink'}`}>
            {title}
          </Text>
          {detail ? <Text className="mt-2 text-body-sm text-ink-body">{detail}</Text> : null}
        </View>

        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="안내 닫기"
            onPress={onDismiss}
            hitSlop={12}
            className="ml-2 min-h-[44px] min-w-[44px] items-center justify-center">
            <Text className="text-body text-ink-muted">✕</Text>
          </Pressable>
        ) : null}
      </View>

      {children}

      {action ? (
        <View className="mt-2 flex-row justify-end">
          <TextButton label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}
