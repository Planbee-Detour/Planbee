import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  status: 'needs-confirmation' | 'confirmed' | 'applied';
  onPress?: () => void;
};

export function SituationCard({status, onPress}: Props) {
  if (status === 'applied') {
    return (
      <View accessibilityRole="summary" className="mt-5 rounded-card border border-success bg-surface p-4">
        <Text className="text-caption font-semibold text-success">Plan B 적용 완료</Text>
        <Text className="mt-1 text-title font-semibold text-ink">Plan B로 일정을 변경했어요</Text>
        <Text className="mt-1 text-body-sm text-ink-body">오후 2시 일정이 국립현대미술관 서울로 바뀌었어요.</Text>
      </View>
    );
  }

  const needsConfirmation = status === 'needs-confirmation';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={needsConfirmation ? '남은 일정 확인하기' : '대체 계획 확인하기'}
      className="mt-5 min-h-[132px] rounded-card bg-brand-light p-4 active:opacity-70"
      onPress={onPress}>
      <Text className="text-caption font-semibold text-brand-dark">
        {needsConfirmation ? '날씨 변화가 예상돼요' : '일정에 영향을 주는 변수가 있어요'}
      </Text>
      <Text className="mt-1 text-title font-semibold text-ink">
        {needsConfirmation ? '20분 뒤 비가 올 예정이에요' : '20분 뒤 비가 오고, 경복궁은 오늘 휴궁이에요'}
      </Text>
      <Text className="mt-1 text-body-sm text-ink-body">
        {needsConfirmation ? '오늘 계획한 야외 일정 중 아직 남은 일정이 있나요?' : '오후 2시 경복궁 일정의 대체 계획을 준비할 수 있어요.'}
      </Text>
      <Text className="mt-2 text-body-sm font-semibold text-ink">
        {needsConfirmation ? '남은 일정 확인하기  ›' : '대체 계획 확인하기  ›'}
      </Text>
    </Pressable>
  );
}
