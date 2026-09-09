/**
 * 목록 푸터 — 다음 페이지 상태를 말한다 (design.md §5.6 — `Screen 18e`). 충족 AC: AC-7
 *
 * | 상황 | 푸터 |
 * |---|---|
 * | 로딩 중 | 스피너 + "불러오는 중" |
 * | 마지막 페이지까지 다 불러옴 | "모두 확인했어요" |
 * | 로드 실패 | "더 불러오지 못했어요" + "다시 시도" (<b>이미 불러온 항목은 그대로 남는다</b>) |
 * | 한 페이지로 끝남 | 푸터 없음 — 애초에 더 있을 거라 기대하지 않은 상태다 |
 *
 * 실패해도 자동으로 재시도하지 않는다. 관리자가 누를 때만 다시 시도한다.
 */
import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';

import {TextButton} from '../../../shared/ui/Button';
import {COLOR} from '../../../shared/ui/tokens';
import {COMMON, LIST_MESSAGES} from '../messages';

type Props = {
  /** 지금 다음 페이지를 불러오는 중인가 */
  loading: boolean;
  /** 다음 페이지가 남아 있는가 (`has_next`) */
  hasNext: boolean;
  /** 직전 추가 로드가 실패했는가 */
  failed: boolean;
  /** 한 페이지로 끝났는가 — 그때는 "모두 확인했어요" 를 띄우지 않는다 */
  singlePage: boolean;
  onRetry: () => void;
};

export function ListFooter({loading, hasNext, failed, singlePage, onRetry}: Props) {
  if (loading) {
    return (
      <View className="flex-row items-center justify-center py-6" accessible>
        <ActivityIndicator size="small" color={COLOR.inkMuted} />
        <Text accessibilityLabel={LIST_MESSAGES.more.loading} className="ml-2 text-caption text-ink-muted">
          {LIST_MESSAGES.more.loading}
        </Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View className="items-center py-6">
        <Text className="text-caption text-ink-muted">{LIST_MESSAGES.more.failed}</Text>
        <TextButton label={COMMON.retry} onPress={onRetry} />
      </View>
    );
  }

  if (hasNext || singlePage) {
    return null;
  }

  return (
    <View className="items-center py-6">
      <Text className="text-caption text-ink-muted">{LIST_MESSAGES.more.end}</Text>
    </View>
  );
}
