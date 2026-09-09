/**
 * `Card/UserListRow` (planbee.pen Design System — `Section — Admin List & Sheet`).
 *
 * 관리자 목록의 카드 한 장 (`admin-user-approval` design.md §5.3 · §5.4 · §8.3).
 *
 * <b>카드 전체가 하나의 터치 대상이자 하나의 접근성 요소다</b> (design.md §3.5) —
 * 이메일·사유·시각을 각각 읽으면 20개 항목에서 60번 스와이프하게 된다.
 * 그래서 낭독 문장은 호출부가 한 덩어리로 만들어 `accessibilityLabel` 로 넘긴다.
 *
 * <b>행에 액션 버튼을 두지 않는다</b> (design.md 결정 3). 승인·거절은 상세 시트에서만 한다.
 */
import React, {forwardRef, type ReactNode} from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  email: string;
  /** 이메일 오른쪽에 붙는 상태 배지. `처리 완료` 목록에만 있다 (design.md §5.4) */
  badge?: ReactNode;
  /**
   * 본문 2줄 슬롯. `검토 대기` 목록의 가입 사유가 들어간다 —
   * <b>서버가 완성해서 내린 문자열을 그대로</b> 넘긴다 (design.md §5.3 / AC-33).
   */
  body?: string;
  /** 시각 줄. "신청 2026. 9. 5. 14:20" 처럼 접두어까지 완성해 넘긴다 */
  meta: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  testID?: string;
};

/**
 * `ref` 를 내보내는 이유: 시트를 닫으면 <b>시트를 연 그 행으로</b> 스크린리더 포커스를
 * 되돌려야 한다 (design.md §3.5). 목록 맨 위로 튀면 20건을 다시 훑게 된다.
 */
export const UserListRow = forwardRef<View, Props>(function UserListRowBase(
  {email, badge, body, meta, accessibilityLabel, accessibilityHint, onPress, testID},
  ref,
) {
  return (
    <Pressable
      ref={ref}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      // 최소 높이 72 / 패딩 16. 눌린 상태는 배경으로 알린다 — 셰브런을 두지 않는다 (design.md §5.3)
      className="min-h-[72px] rounded-card border border-border bg-surface p-4 active:bg-background">
      <View className="flex-row items-center">
        {/* 이메일이 길면 이메일을 말줄임하고 배지는 제자리를 지킨다 (design.md §5.4) */}
        <Text className="flex-1 text-title text-ink" numberOfLines={1}>
          {email}
        </Text>
        {badge ? <View className="ml-2">{badge}</View> : null}
      </View>

      {body ? (
        <Text className="mt-2 text-body-sm text-ink-body" numberOfLines={2}>
          {body}
        </Text>
      ) : null}

      {/* pen `CfaaR`: 카드 패딩 16, 자식 간격은 8 로 균일하다 */}
      <Text className="mt-2 text-caption text-ink-muted">{meta}</Text>
    </Pressable>
  );
});
