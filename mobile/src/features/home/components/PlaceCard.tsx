import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';

import type {PlaceSummary} from '../types';

type PlaceCardProps = PlaceSummary & {
  onPress: (placeId: string) => void;
};

export function PlaceCard({
  category,
  distance,
  image,
  name,
  onPress,
  placeId,
  status,
  tags,
}: PlaceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="w-[176px] overflow-hidden rounded-card border border-border bg-surface active:opacity-70"
      onPress={() => onPress(placeId)}>
      <Image
        accessibilityLabel={name}
        className="h-[112px] w-full"
        source={{uri: image}}
      />
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-caption font-medium text-brand-dark">{category}</Text>
          <Text
            className={`text-caption font-medium ${
              status === '오늘 휴관' ? 'text-danger' : 'text-success'
            }`}>
            {status}
          </Text>
        </View>
        <Text className="mt-2 text-body-sm font-semibold text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-1 text-caption text-ink-muted">{distance}</Text>
        <Text className="mt-2 text-caption text-ink-muted">{tags}</Text>
      </View>
    </Pressable>
  );
}
