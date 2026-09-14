import React, {useEffect, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';

import {Button, TextButton} from '../../../shared/ui/Button';
import {NavBar} from '../../../shared/ui/NavBar';
import {LIVE_REGION_POLITE, useAnnounceForAccessibility} from '../../../shared/lib/a11y';
import fixtureJson from '../fixtures/plan-b.json';
import type {RecommendationOption, RecommendationType} from '../types';

type ScreenState = 'loading' | 'success' | 'empty' | 'error';
type Props = {onBack: () => void; onApplied: () => void; initialState?: ScreenState};
const options: RecommendationOption[] = fixtureJson.options.map(option => ({
  ...option,
  recommendation_type: option.recommendation_type === 'COURSE' ? 'COURSE' : 'PLACE',
}));

export function PlanBRecommendationScreen({onBack, onApplied, initialState = 'loading'}: Props) {
  const [state, setState] = useState<ScreenState>(initialState);
  const [type, setType] = useState<RecommendationType>('PLACE');
  const announcement = state === 'loading' ? 'Planbee가 새로운 계획을 찾고 있어요.' : null;
  useAnnounceForAccessibility(announcement);

  useEffect(() => {
    if (state !== 'loading') return;
    const timer = setTimeout(() => setState(options.length ? 'success' : 'empty'), 350);
    return () => clearTimeout(timer);
  }, [state]);

  const retry = () => setState('loading');
  if (state !== 'success') {
    const content = state === 'loading'
      ? ['✦', 'Planbee가 새로운 계획을 찾고 있어요.', '날씨, 운영 상태, 이동 시간과 취향을 함께 확인하고 있어요.']
      : state === 'empty'
        ? ['⌕', '조건에 맞는 대체 계획을 찾지 못했어요', '이동 범위나 방문 시간을 넓히면 다른 계획을 찾을 수 있어요.']
        : ['⌁', '대체 계획을 만들지 못했어요', '연결을 확인하고 다시 시도해 주세요.'];
    return (
      <View className="flex-1 bg-background">
        <NavBar title="대체 계획 찾기" left={{label: '‹', accessibilityLabel: '뒤로', onPress: onBack}} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-14 w-14 items-center justify-center rounded-button bg-brand-light"><Text className="text-h1 text-brand-dark">{content[0]}</Text></View>
          <Text {...LIVE_REGION_POLITE} className="mt-5 text-center text-h2 font-semibold text-ink">{content[1]}</Text>
          <Text className="mt-2 text-center text-body-sm text-ink-muted">{content[2]}</Text>
          {state === 'loading' ? (
            <View className="mt-6 w-full gap-2">{['영향받는 일정 확인', '방문 가능한 장소 찾기', '시간과 동선 검토', '추천 근거 정리'].map(label => <Text key={label} className="text-body-sm text-ink-body">◉  {label}</Text>)}</View>
          ) : (
            <View className="mt-6 w-full gap-2"><Button label={state === 'empty' ? '조건 완화해서 다시 찾기' : '다시 시도'} onPress={retry} /><Button label="이전 화면으로" onPress={onBack} variant="secondary" /></View>
          )}
        </View>
      </View>
    );
  }

  const option = options.find(item => item.recommendation_type === type) ?? options[0];
  return (
    <View className="flex-1 bg-background">
      <NavBar title="대체 계획 찾기" left={{label: '‹', accessibilityLabel: '뒤로', onPress: onBack}} />
      <ScrollView contentContainerClassName="px-5 pb-8">
        <Text className="mt-3 text-h2 font-semibold text-ink">{type === 'PLACE' ? fixtureJson.situation_title : option.title}</Text>
        <Text className="mt-1 text-caption font-semibold text-danger">{fixtureJson.event_labels.join(' · ')}</Text>
        {type === 'PLACE' ? <View className="mt-4 rounded-card border border-danger bg-surface p-4"><Text className="text-caption text-danger">기존 계획</Text><Text className="mt-1 text-title font-semibold text-ink">{fixtureJson.original_plan.time_label} {fixtureJson.original_plan.title}</Text><Text className="text-caption text-danger">{fixtureJson.original_plan.status_label}</Text></View> : null}
        <View className="mt-3 rounded-card bg-brand-light p-4">
          {option.items.map(item => <View key={`${item.time_label}-${item.title}`} className="mb-2"><Text className="text-title font-semibold text-ink">{item.time_label} {item.title}</Text><Text className="text-caption text-success">{item.status_label}</Text></View>)}
          {option.budget_label ? <Text className="mt-1 text-caption font-semibold text-brand-dark">{option.budget_label}</Text> : null}
        </View>
        <Text className="mt-4 text-title font-semibold text-ink">{option.title}</Text>
        <Text className="mt-1 text-body-sm text-ink-body">{option.summary}</Text>
        <View className="mt-4 gap-2">{option.evidence_labels.map(label => <Text key={label} className="text-body-sm text-ink-body">◉  {label}</Text>)}</View>
        {option.caution_label ? <View className="mt-4 rounded-card border border-border bg-cream p-4"><Text className="text-body-sm text-ink-body">ⓘ  {option.caution_label}</Text></View> : null}
        <View className="mt-4 gap-2"><Button label="이 계획으로 변경" onPress={onApplied} /><Button label={type === 'PLACE' ? '코스로 다시 짜기' : '장소 하나만 바꾸기'} onPress={() => setType(type === 'PLACE' ? 'COURSE' : 'PLACE')} variant="secondary" />{type === 'PLACE' ? <View className="items-center"><TextButton label="다른 장소 보기" onPress={retry} /></View> : null}</View>
      </ScrollView>
    </View>
  );
}
