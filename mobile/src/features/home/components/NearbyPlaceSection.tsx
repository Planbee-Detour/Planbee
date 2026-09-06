import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';

import type {PlaceSummary} from '../types';
import {PlaceCard} from './PlaceCard';

const nearbyPlaces: PlaceSummary[] = [
  {
    placeId: 'gyeongbokgung',
    image: 'https://images.unsplash.com/photo-1786157986916-523f3b64be2a?auto=format&fit=crop&w=600&q=80',
    category: '역사·문화',
    status: '운영중',
    name: '경복궁',
    distance: '850m · 도보 12분',
    tags: '#역사  #사진명소',
  },
  {
    placeId: 'ikseon-dong',
    image: 'https://images.unsplash.com/photo-1707925547023-eeb1eaa1005d?auto=format&fit=crop&w=600&q=80',
    category: '거리·골목',
    status: '운영중',
    name: '익선동 한옥거리',
    distance: '1.1km · 도보 15분',
    tags: '#카페  #산책',
  },
  {
    placeId: 'seoul-craft-museum',
    image: 'https://images.unsplash.com/photo-1605822107205-16a8b116ffc7?auto=format&fit=crop&w=600&q=80',
    category: '실내·전시',
    status: '오늘 휴관',
    name: '서울공예박물관',
    distance: '600m · 도보 8분',
    tags: '#실내  #전시',
  },
];

export function NearbyPlaceSection({onMorePress, onPlacePress}: {onMorePress: () => void; onPlacePress: (placeId: string) => void}) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-title font-semibold text-ink">지금 주변에는</Text>
        <Pressable accessibilityRole="button" className="min-h-11 justify-center px-1" onPress={onMorePress}>
          <Text className="text-caption text-ink-muted">더보기 ›</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pr-5 pt-2">
        {nearbyPlaces.map(place => (
          <PlaceCard key={place.placeId} {...place} onPress={onPlacePress} />
        ))}
      </ScrollView>
    </View>
  );
}
