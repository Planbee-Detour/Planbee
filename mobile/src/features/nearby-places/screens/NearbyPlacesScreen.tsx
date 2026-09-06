import React, {useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useLocalNearbyPlaces} from '../hooks/useLocalNearbyPlaces';
import type {NearbyPlace} from '../types';
const filters = ['거리순', '운영 중', '실내', '카페'];

type Props = {onBack: () => void; onPlacePress: (placeId: string) => void};

function PlaceRow({onPress, place}: {onPress: () => void; place: NearbyPlace}) {
  return (
    <Pressable accessibilityRole="button" className="flex-row gap-3 rounded-card border border-border bg-surface p-3 active:opacity-70" onPress={onPress}>
      {place.image_url ? <Image accessibilityLabel={place.name} className="h-24 w-24 rounded-card" source={{uri: place.image_url}} /> : null}
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between"><Text className="text-caption font-semibold text-brand-dark">{place.category}</Text><Text className={place.status_label.includes('휴관') ? 'text-caption text-danger' : 'text-caption text-success'}>{place.status_label}</Text></View>
        <Text className="mt-1 text-title font-semibold text-ink">{place.name}</Text>
        <Text className="mt-1 text-caption text-ink-muted">{place.distance_label}</Text>
        <Text className="mt-2 text-caption text-ink-muted">{place.tags.join('  ')}</Text>
      </View>
    </Pressable>
  );
}

function MapView({onPlacePress, places}: {onPlacePress: (placeId: string) => void; places: NearbyPlace[]}) {
  const [selectedId, setSelectedId] = useState(places[0]?.place_id);
  const selected = places.find(place => place.place_id === selectedId) ?? places[0];
  const positions = ['left-12 top-20', 'right-16 top-40', 'left-36 top-64'];
  return (
    <View className="relative flex-1 overflow-hidden border-t border-border bg-surface">
      {places.map((place, index) => {
        const active = place.place_id === selectedId;
        return <Pressable key={place.place_id} accessibilityLabel={`${place.name} 마커`} accessibilityRole="button" className={`absolute ${positions[index]} items-center justify-center rounded-chip border border-brand-dark ${active ? 'h-12 w-12 bg-brand' : 'h-10 w-10 bg-surface'}`} onPress={() => setSelectedId(place.place_id)}><Text className="text-title text-ink">⌖</Text></Pressable>;
      })}
      {selected ? <View className="absolute bottom-5 left-5 right-5"><PlaceRow onPress={() => onPlacePress(selected.place_id)} place={selected} /></View> : null}
    </View>
  );
}

export function NearbyPlacesScreen({onBack, onPlacePress}: Props) {
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const {retry, state} = useLocalNearbyPlaces();
  if (state.status === 'loading') return <SafeAreaView accessibilityLabel="주변 장소를 불러오는 중" className="flex-1 bg-background"><View className="flex-row items-center gap-3 px-5 py-2"><Pressable accessibilityLabel="뒤로" onPress={onBack} className="h-11 w-11 items-center justify-center rounded-chip border border-border bg-surface"><Text className="text-h2">‹</Text></Pressable><Text className="text-title font-semibold text-ink">주변 장소</Text></View><View className="gap-3 p-5">{[1,2,3].map(item => <View key={item} className="h-28 rounded-card bg-border" />)}</View></SafeAreaView>;
  if (state.status === 'empty' || state.status === 'error') { const error = state.status === 'error'; return <SafeAreaView className="flex-1 items-center justify-center bg-background px-8"><Text className="text-h2 font-semibold text-ink">{error ? '주변 장소를 불러오지 못했어요' : '주변에서 추천할 장소를 찾지 못했어요'}</Text><Text className="mt-2 text-center text-body-sm text-ink-muted">{error ? '연결을 확인하고 다시 시도해 주세요.' : '지역을 바꾸거나 잠시 후 다시 확인해 주세요.'}</Text>{error ? <Pressable onPress={retry} className="mt-6 min-h-[52px] w-60 items-center justify-center rounded-button bg-ink"><Text className="text-ink-inverse">다시 시도</Text></Pressable> : null}<Pressable onPress={onBack} className="mt-3 min-h-[52px] w-60 items-center justify-center rounded-button border border-border bg-surface"><Text className="text-ink">이전 화면으로</Text></Pressable></SafeAreaView>; }
  const nearbyPlaces = state.data;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 py-2"><Pressable accessibilityLabel="뒤로" accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-chip border border-border bg-surface" onPress={onBack}><Text className="text-h2 text-ink">‹</Text></Pressable><Text className="text-title font-semibold text-ink">주변 장소</Text></View>
      <View className="gap-3 px-5 pb-4"><Text className="text-body-sm text-ink-muted">현재 위치에서 가까운 장소를 모았어요.</Text><View className="h-11 flex-row rounded-button bg-surface p-1"><Pressable className={`flex-1 items-center justify-center rounded-button ${mode === 'list' ? 'bg-brand-light' : ''}`} onPress={() => setMode('list')}><Text className="text-body-sm font-semibold text-ink">목록</Text></Pressable><Pressable className={`flex-1 items-center justify-center rounded-button ${mode === 'map' ? 'bg-brand-light' : ''}`} onPress={() => setMode('map')}><Text className="text-body-sm font-semibold text-ink">지도</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">{filters.map(filter => <Pressable key={filter} className="min-h-11 justify-center rounded-chip border border-border bg-surface px-3"><Text className="text-caption text-ink-muted">{filter}</Text></Pressable>)}</ScrollView></View>
      {mode === 'list' ? <ScrollView contentContainerClassName="gap-3 px-5 pb-6">{nearbyPlaces.items.map(place => <PlaceRow key={place.place_id} onPress={() => onPlacePress(place.place_id)} place={place} />)}</ScrollView> : <MapView onPlacePress={onPlacePress} places={nearbyPlaces.items} />}
    </SafeAreaView>
  );
}
