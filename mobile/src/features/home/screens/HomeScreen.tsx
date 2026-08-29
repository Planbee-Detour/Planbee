import React from 'react';
import {ScrollView, Text, View} from 'react-native';

import {AiActionCard} from '../components/AiActionCard';
import {HomeHeader} from '../components/HomeHeader';
import {NearbyPlaceSection} from '../components/NearbyPlaceSection';
import {QuickActionList} from '../components/QuickActionList';

type HomeScreenProps = {
  isResolvingRegion: boolean;
  onMorePlacesPress: () => void;
  onPlacePress: (placeId: string) => void;
  region: string | null;
};

export function HomeScreen({isResolvingRegion, onMorePlacesPress, onPlacePress, region}: HomeScreenProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-28 pt-2"
      showsVerticalScrollIndicator={false}>
      <HomeHeader isResolvingRegion={isResolvingRegion} region={region} />

      <View className="mt-6">
        <Text className="text-h2 font-semibold text-ink">지금 어떤 도움이 필요하세요?</Text>
        <Text className="mt-2 text-body-sm text-ink-muted">
          계획이 바뀌어도 괜찮아요.{`\n`}Planbee가 다음 계획을 찾아드릴게요.
        </Text>
      </View>

      <AiActionCard />

      <Text className="mt-6 text-title font-semibold text-ink">빠르게 도움받기</Text>
      <QuickActionList />

      <NearbyPlaceSection onMorePress={onMorePlacesPress} onPlacePress={onPlacePress} />
    </ScrollView>
  );
}
