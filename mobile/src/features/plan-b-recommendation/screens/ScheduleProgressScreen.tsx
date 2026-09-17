import React, {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';

import {Button, TextButton} from '../../../shared/ui/Button';
import {NavBar} from '../../../shared/ui/NavBar';
import fixtureJson from '../fixtures/plan-b.json';
import type {ScheduleItem, ScheduleProgress} from '../types';
import {ProgressConfirmationRow} from '../components/ProgressConfirmationRow';

const schedules: ScheduleItem[] = fixtureJson.schedules;

type Props = {onBack: () => void; onConfirmed: (hasRemaining: boolean) => void};

export function ScheduleProgressScreen({onBack, onConfirmed}: Props) {
  const [progress, setProgress] = useState<Record<string, ScheduleProgress>>({});
  const [allDone, setAllDone] = useState(false);
  const complete = schedules.every(item => progress[item.schedule_id]);

  if (allDone) {
    return (
      <View className="flex-1 bg-background">
        <NavBar title="일정 진행 확인" left={{label: '‹', accessibilityLabel: '뒤로', onPress: onBack}} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-h2 font-semibold text-ink">오늘 야외 일정은 모두 완료했어요</Text>
          <Text className="mt-2 text-center text-body-sm text-ink-muted">비 예보로 변경할 일정은 없어요.</Text>
          <View className="mt-6 w-full"><Button label="홈으로" onPress={() => onConfirmed(false)} /></View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <NavBar title="일정 진행 확인" left={{label: '‹', accessibilityLabel: '뒤로', onPress: onBack}} />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <View>
          <Text className="text-h1 font-bold text-ink">아직 남은 야외 일정이 있나요?</Text>
          <Text className="mt-2 text-body-sm text-ink-muted">완료한 일정은 Plan B 추천에서 제외할게요.</Text>
        </View>
        <View className="flex-row items-center rounded-input bg-cream px-3 py-2.5">
          <Text className="text-caption font-semibold text-ink-body">▣  야외 일정 2개 · 완료 여부 확인 필요</Text>
        </View>
        {schedules.map(item => (
          <ProgressConfirmationRow key={item.schedule_id} item={item} value={progress[item.schedule_id]}
            onChange={value => setProgress(current => ({...current, [item.schedule_id]: value}))} />
        ))}
        <Button disabled={!complete} label="확인 완료" onPress={() => {
          const hasRemaining = Object.values(progress).some(value => value === 'PLANNED');
          if (hasRemaining) onConfirmed(true); else setAllDone(true);
        }} />
        <View className="items-center"><TextButton label="나중에 확인" onPress={onBack} /></View>
      </ScrollView>
    </View>
  );
}
