import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import {
  clearPreferredRegion,
  savePreferredRegion,
} from '../../../shared/location/location';

type MyScreenProps = {
  onRegionChange: (region: string | null) => void;
  region: string | null;
};

export function MyScreen({region, onRegionChange}: MyScreenProps) {
  const [draftRegion, setDraftRegion] = useState(region ?? '');

  useEffect(() => {
    setDraftRegion(region ?? '');
  }, [region]);

  const handleSave = () => {
    const nextRegion = draftRegion.trim();
    if (!nextRegion) {
      clearPreferredRegion();
      onRegionChange(null);
      return;
    }
    savePreferredRegion(nextRegion);
    onRegionChange(nextRegion);
  };

  const handleClear = () => {
    clearPreferredRegion();
    setDraftRegion('');
    onRegionChange(null);
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-5 pb-28">
      <Text className="mt-3 text-h1 font-bold text-ink">마이</Text>
      <Text className="mt-2 text-body-sm text-ink-muted">
        주변 장소를 확인할 기준 지역을 설정하세요.
      </Text>
      <View className="mt-8">
        <Text className="mb-2 text-body-sm font-semibold text-ink">내 지역</Text>
        <TextInput
          accessibilityLabel="내 지역"
          className="min-h-[52px] rounded-input border border-border bg-surface px-4 text-body-sm text-ink"
          onChangeText={setDraftRegion}
          placeholder="예: 금천구 가산동"
          value={draftRegion}
        />
        <Pressable
          accessibilityRole="button"
          className="mt-3 min-h-[52px] items-center justify-center rounded-button bg-ink active:opacity-70"
          onPress={handleSave}>
          <Text className="text-body-sm font-semibold text-ink-inverse">지역 저장</Text>
        </Pressable>
        {region ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-11 items-center justify-center"
            onPress={handleClear}>
            <Text className="text-caption text-danger">설정 지역 삭제</Text>
          </Pressable>
        ) : null}
      </View>
      <View className="mt-5 rounded-card bg-cream p-4">
        <Text className="text-body-sm font-semibold text-ink">현재 위치 사용</Text>
        <Text className="mt-2 text-caption text-ink-body">
          설정 지역이 없으면 위치 권한을 요청하고 현재 지역을 자동으로 설정합니다.
        </Text>
        <ActivityIndicator className="mt-3 self-start" />
      </View>
    </ScrollView>
  );
}
