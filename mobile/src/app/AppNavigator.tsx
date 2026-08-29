import React from 'react';
import {Pressable, StatusBar, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator, type NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {HomeScreen} from '../features/home/screens/HomeScreen';
import {NearbyPlacesScreen} from '../features/nearby-places/screens/NearbyPlacesScreen';
import {PlaceDetailScreen} from '../features/place-detail/screens/PlaceDetailScreen';
import {MyScreen} from '../features/profile/screens/MyScreen';
import {usePreferredRegion} from './usePreferredRegion';

export type RootStackParamList = {MainTabs: undefined; NearbyPlaces: undefined; PlaceDetail: {placeId: string}};
type MainTabParamList = {Home: undefined; Explore: undefined; Saved: undefined; My: undefined};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const tabMeta: Record<keyof MainTabParamList, {icon: string; label: string}> = {
  Home: {icon: '⌂', label: '홈'}, Explore: {icon: '⌕', label: '탐색'},
  Saved: {icon: '▣', label: '저장'}, My: {icon: '♙', label: '마이'},
};

function AppTabBar({navigation, state}: BottomTabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
      <View className="mx-4 mb-3 h-[64px] flex-row items-center justify-around rounded-card border border-border bg-surface px-2 shadow-card">
        {state.routes.map((route, index) => {
          const meta = tabMeta[route.name as keyof MainTabParamList];
          const isActive = state.index === index;
          return (
            <Pressable key={route.key} accessibilityLabel={`${meta.label} 메뉴`} accessibilityRole="button"
              className={`min-h-11 min-w-14 items-center justify-center rounded-chip px-3 ${isActive ? 'bg-brand-light' : ''}`}
              onPress={() => navigation.navigate(route.name, route.params)}>
              <Text className={`text-title ${isActive ? 'text-ink' : 'text-ink-muted'}`}>{meta.icon}</Text>
              <Text className={`text-caption ${isActive ? 'text-ink' : 'text-ink-muted'}`}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function PlaceholderScreen({tab}: {tab: '탐색' | '저장'}) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8 pb-20">
      <Text className="text-display text-brand">{tab === '탐색' ? '⌕' : '▣'}</Text>
      <Text className="mt-4 text-h1 font-bold text-ink">{tab}</Text>
      <Text className="mt-2 text-center text-body-sm text-ink-muted">
        {tab === '탐색' ? '새로운 장소와 계획을 찾아보세요.' : '저장한 장소와 계획을 모아볼 수 있어요.'}
      </Text>
    </SafeAreaView>
  );
}

function MainTabsScreen({navigation}: NativeStackScreenProps<RootStackParamList, 'MainTabs'>) {
  const {isResolvingRegion, region, setRegion} = usePreferredRegion();
  const openPlace = (placeId: string) => navigation.push('PlaceDetail', {placeId});
  return (
    <Tab.Navigator screenOptions={{headerShown: false}} tabBar={AppTabBar}>
      <Tab.Screen name="Home">{() => <SafeAreaView className="flex-1 bg-background"><StatusBar barStyle="dark-content" /><HomeScreen isResolvingRegion={isResolvingRegion} onMorePlacesPress={() => navigation.push('NearbyPlaces')} onPlacePress={openPlace} region={region} /></SafeAreaView>}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <PlaceholderScreen tab="탐색" />}</Tab.Screen>
      <Tab.Screen name="Saved">{() => <PlaceholderScreen tab="저장" />}</Tab.Screen>
      <Tab.Screen name="My">{() => <SafeAreaView className="flex-1 bg-background"><MyScreen region={region} onRegionChange={setRegion} /></SafeAreaView>}</Tab.Screen>
    </Tab.Navigator>
  );
}

function PlaceDetailRoute({navigation, route}: NativeStackScreenProps<RootStackParamList, 'PlaceDetail'>) {
  return <PlaceDetailScreen onBack={navigation.goBack} placeId={route.params.placeId} />;
}

function NearbyPlacesRoute({navigation}: NativeStackScreenProps<RootStackParamList, 'NearbyPlaces'>) {
  return <NearbyPlacesScreen onBack={navigation.goBack} onPlacePress={placeId => navigation.push('PlaceDetail', {placeId})} />;
}

export function AppNavigator() {
  return <NavigationContainer><RootStack.Navigator screenOptions={{headerShown: false}}><RootStack.Screen component={MainTabsScreen} name="MainTabs" /><RootStack.Screen component={NearbyPlacesRoute} name="NearbyPlaces" /><RootStack.Screen component={PlaceDetailRoute} name="PlaceDetail" /></RootStack.Navigator></NavigationContainer>;
}
