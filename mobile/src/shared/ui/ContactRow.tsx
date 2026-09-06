/**
 * `Layout/ContactRow` (planbee.pen Design System) — 문의 주소 행 (design.md §2.7.2).
 *
 * 주소를 <b>문장 안에 넣지 않고 자기 줄에 둔다.</b> 값이 없을 때 그 줄만 통째로 바꿔 끼울 수 있고,
 * 사용자가 주소를 눈으로 찾기도 쉽다.
 *
 * 행 배경은 놓이는 자리에 따라 뒤집는다 — 행이 배경에서 떠 보여야 하기 때문이다.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  /** 서버가 내려준 주소. 앱이 가공하지 않는다 — 도메인만 자르거나 마스킹하지 않는다 (§2.7.1) */
  email: string;
  onContact: () => void;
  /** `surface` 카드 안에 놓이면 `background`, 화면 배경 위에 놓이면 `surface` */
  on: 'screen' | 'card';
  actionLabel: string;
};

export function ContactRow({email, onContact, on, actionLabel}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      // 주소를 한 글자씩 읽지 않도록 원문 그대로 넘긴다 (§2.7.2).
      accessibilityLabel={`문의 이메일 주소, ${email}`}
      accessibilityHint={actionLabel}
      onPress={onContact}
      className={[
        'min-h-[44px] flex-row items-center rounded-[12px] border border-border px-3',
        on === 'card' ? 'bg-background' : 'bg-surface',
      ].join(' ')}>
      <Text className="mr-2 text-body-sm text-ink-muted">✉</Text>
      {/* 메일 앱이 없는 기기의 최후 수단으로 선택·복사가 되어야 한다 (§7.5) */}
      <Text selectable className="flex-1 text-body-sm font-semibold text-ink">
        {email}
      </Text>
      <View className="ml-2">
        <Text className="text-body-sm font-semibold text-ink">{actionLabel} ›</Text>
      </View>
    </Pressable>
  );
}
