import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import type {PlaceDetail} from '../types';
import {useLocalPlaceDetail} from '../hooks/useLocalPlaceDetail';

type PlaceDetailScreenProps = {
  onBack: () => void;
  placeId: string;
};

function HeaderButton({icon, label, onPress}: {icon: string; label: string; onPress?: () => void}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center rounded-chip bg-surface/90 active:opacity-70"
      onPress={onPress}>
      <Text className="text-h2 text-ink">{icon}</Text>
    </Pressable>
  );
}

function StateScreen({
  body,
  icon,
  onBack,
  onRetry,
  title,
}: {
  body: string;
  icon: string;
  onBack: () => void;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-1">
        <HeaderButton icon="‹" label="뒤로" onPress={onBack} />
      </View>
      <View className="flex-1 items-center justify-center px-8 pb-20">
        <View className="h-16 w-16 items-center justify-center rounded-chip border border-border bg-surface">
          <Text className="text-display text-brand-dark">{icon}</Text>
        </View>
        <Text accessibilityRole="header" className="mt-5 text-center text-h2 font-semibold text-ink">
          {title}
        </Text>
        <Text className="mt-2 text-center text-body-sm text-ink-muted">{body}</Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            className="mt-6 min-h-[52px] w-60 items-center justify-center rounded-button bg-ink active:opacity-70"
            onPress={onRetry}>
            <Text className="text-body font-semibold text-ink-inverse">다시 시도</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          className={`${onRetry ? 'mt-3 border border-border bg-surface' : 'mt-6 bg-ink'} min-h-[52px] w-60 items-center justify-center rounded-button active:opacity-70`}
          onPress={onBack}>
          <Text className={`text-body font-semibold ${onRetry ? 'text-ink' : 'text-ink-inverse'}`}>
            이전 화면으로
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function LoadingScreen({onBack}: {onBack: () => void}) {
  return (
    <SafeAreaView accessibilityLabel="장소 정보를 불러오는 중" className="flex-1 bg-background">
      <View className="h-[300px] bg-border px-5 pt-1">
        <HeaderButton icon="‹" label="뒤로" onPress={onBack} />
      </View>
      <View className="gap-4 p-5">
        <View className="h-3 w-24 rounded-chip bg-border" />
        <View className="h-7 w-full rounded-lg bg-border" />
        <View className="h-7 w-2/3 rounded-lg bg-border" />
        <View className="h-20 rounded-card bg-border" />
        <View className="h-28 rounded-card bg-border" />
        <ActivityIndicator />
      </View>
    </SafeAreaView>
  );
}

function InfoRow({icon, value}: {icon: string; value: string}) {
  return (
    <View className="flex-row items-start gap-2">
      <Text className="w-5 text-body-sm text-ink-muted">{icon}</Text>
      <Text className="flex-1 text-body-sm text-ink-body">{value}</Text>
    </View>
  );
}

function PlaceContent({onBack, place}: {onBack: () => void; place: PlaceDetail}) {
  const hasLocation = place.latitude != null && place.longitude != null;

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>
        <View className="h-[300px] bg-border">
          {place.image_url ? (
            <Image accessibilityLabel={place.name} className="h-full w-full" source={{uri: place.image_url}} />
          ) : (
            <View className="h-full items-center justify-center">
              <Text className="text-h1 text-ink-muted">▧</Text>
              <Text className="mt-2 text-body-sm text-ink-muted">등록된 사진이 없어요</Text>
            </View>
          )}
          <SafeAreaView className="absolute left-0 right-0 top-0 flex-row justify-between px-5 pt-1">
            <HeaderButton icon="‹" label="뒤로" onPress={onBack} />
            <HeaderButton icon="♧" label="북마크" />
          </SafeAreaView>
        </View>

        <View className="gap-5 p-5">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-caption font-semibold text-brand-dark">{place.category}</Text>
              <Text className={`text-caption font-medium ${place.status_label.includes('휴관') ? 'text-danger' : 'text-success'}`}>
                {place.status_label}
              </Text>
            </View>
            <Text className="text-h1 font-bold text-ink">{place.name}</Text>
          </View>

          {place.address || place.opening_hours || place.distance_label ? (
            <View className="gap-2">
              {place.address ? <InfoRow icon="⌖" value={place.address} /> : null}
              {place.opening_hours ? <InfoRow icon="◷" value={place.opening_hours} /> : null}
              {place.distance_label ? <InfoRow icon="♟" value={place.distance_label} /> : null}
            </View>
          ) : null}

          {place.tags.length ? (
            <View className="flex-row flex-wrap gap-2">
              {place.tags.map(tag => (
                <View key={tag} className="rounded-chip bg-cream px-3 py-2">
                  <Text className="text-caption text-ink-muted">{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {place.description ? <Text className="text-body-sm leading-6 text-ink-body">{place.description}</Text> : null}

          {place.recommendation_reason ? (
            <View className="rounded-card bg-brand-light p-4">
              <Text className="text-body-sm font-semibold text-brand-dark">✦  Planbee 추천 이유</Text>
              <Text className="mt-2 text-body-sm leading-5 text-ink-body">{place.recommendation_reason}</Text>
            </View>
          ) : null}

          {hasLocation ? (
            <View className="gap-2">
              <Text className="text-title font-semibold text-ink">위치</Text>
              <View
                accessibilityLabel={`${place.name} 위치`}
                className="h-[140px] items-center justify-center rounded-card border border-border bg-surface">
                <View className="h-10 w-10 items-center justify-center rounded-chip bg-brand">
                  <Text className="text-title text-ink">⌖</Text>
                </View>
              </View>
            </View>
          ) : null}

          <Text className="text-caption text-ink-muted">{place.source_label}</Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-border bg-surface px-5 pt-3">
        <Pressable accessibilityRole="button" className="min-h-[52px] flex-1 items-center justify-center rounded-button border border-border bg-surface">
          <Text className="text-caption font-semibold text-ink">✦ Planbee에게 물어보기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" className="min-h-[52px] flex-1 items-center justify-center rounded-button bg-ink">
          <Text className="text-body-sm font-semibold text-ink-inverse">여기로 가기</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

export function PlaceDetailScreen({onBack, placeId}: PlaceDetailScreenProps) {
  const {retry, state} = useLocalPlaceDetail(placeId);

  if (state.status === 'loading') return <LoadingScreen onBack={onBack} />;
  if (state.status === 'empty') {
    return <StateScreen body="장소가 삭제되었거나 현재 공개되지 않았어요." icon="⌖" onBack={onBack} title="장소 정보를 찾을 수 없어요" />;
  }
  if (state.status === 'error') {
    return <StateScreen body="연결을 확인하고 다시 시도해 주세요." icon="⌁" onBack={onBack} onRetry={retry} title="장소 정보를 불러오지 못했어요" />;
  }
  return <PlaceContent onBack={onBack} place={state.place} />;
}
