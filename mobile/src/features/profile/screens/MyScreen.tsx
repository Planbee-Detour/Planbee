import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import {ListCard, ListRow} from '../../../shared/ui/ListRow';
import {Button} from '../../../shared/ui/Button';
import {
  clearPreferredRegion,
  savePreferredRegion,
} from '../../../shared/location/location';

type MyScreenProps = {
  onRegionChange: (region: string | null) => void;
  /** 계정 설정(auth)으로 가는 유일한 진입점. AC-28·AC-35 의 전제다 */
  onAccountSettingsPress: () => void;
  onLoginPress: () => void;
  onSignupPress: () => void;
  onPersonalizationPress: () => void;
  isSignedIn: boolean;
  region: string | null;
};

export function MyScreen({region, onRegionChange, onAccountSettingsPress, onLoginPress, onSignupPress, onPersonalizationPress, isSignedIn}: MyScreenProps) {
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
        내 지역과 계정 상태를 관리하세요.
      </Text>
      {!isSignedIn ? (
        <View className="mt-6 rounded-card bg-brand-light p-4">
          <Text className="text-title font-semibold text-ink">로그인하고 더 편리하게 이용하세요</Text>
          <Text className="mt-1 text-body-sm text-ink-body">저장한 장소와 맞춤 추천을 여러 기기에서 이어볼 수 있어요.</Text>
          <View className="mt-4 gap-2"><Button label="로그인" onPress={onLoginPress} /><Button label="가입하기" onPress={onSignupPress} variant="secondary" /></View>
        </View>
      ) : null}
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

      <Text className="mb-2 mt-8 text-body-sm font-semibold text-ink">계정</Text>
      <ListCard>
        {isSignedIn ? <ListRow label="로그인 상태" value="로그인됨" /> : null}
        <ListRow label="맞춤 추천 설정" chevron onPress={onPersonalizationPress} />
        {isSignedIn ? <ListRow label="계정 설정" chevron onPress={onAccountSettingsPress} accessibilityHint="계정 정보, 약관, 로그아웃, 계정 삭제" testID="home-settings" /> : null}
      </ListCard>
    </ScrollView>
  );
}
