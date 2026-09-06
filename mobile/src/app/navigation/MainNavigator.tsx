/**
 * 세션이 있을 때의 스택. 하단 탭(홈·탐색·저장·마이) 위에 장소 화면과
 * `auth` 가 소유한 계정 화면(설정·계정 삭제·약관)이 함께 얹힌다.
 *
 * `NavigationContainer` 는 여기 없다 — 컨테이너는 `RootNavigator` 하나뿐이고
 * 이 스택은 세션이 성립했을 때만 마운트된다 (auth design.md §1.1).
 */
import React from 'react';
import {Pressable, StatusBar, Text, View} from 'react-native';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator, type NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AccountDeleteScreen} from '../../features/auth/screens/AccountDeleteScreen';
import {LegalDocumentScreen} from '../../features/auth/screens/LegalDocumentScreen';
import {SettingsScreen} from '../../features/auth/screens/SettingsScreen';
import {HomeScreen} from '../../features/home/screens/HomeScreen';
import {NearbyPlacesScreen} from '../../features/nearby-places/screens/NearbyPlacesScreen';
import {PlaceDetailScreen} from '../../features/place-detail/screens/PlaceDetailScreen';
import {MyScreen} from '../../features/profile/screens/MyScreen';
import {usePreferredRegion} from '../usePreferredRegion';
import type {MainStackParamList} from './types';

type MainTabParamList = {Home: undefined; Explore: undefined; Saved: undefined; My: undefined};

const MainStack = createNativeStackNavigator<MainStackParamList>();
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
              onPress={() => navigation.navigate(route.name, route.params)}
              testID={`tab-${route.name}`}>
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

function MainTabsScreen({navigation}: NativeStackScreenProps<MainStackParamList, 'MainTabs'>) {
  const {isResolvingRegion, region, setRegion} = usePreferredRegion();
  const openPlace = (placeId: string) => navigation.push('PlaceDetail', {placeId});
  return (
    <Tab.Navigator screenOptions={{headerShown: false}} tabBar={AppTabBar}>
      <Tab.Screen name="Home">{() => <SafeAreaView className="flex-1 bg-background"><StatusBar barStyle="dark-content" /><HomeScreen isResolvingRegion={isResolvingRegion} onMorePlacesPress={() => navigation.push('NearbyPlaces')} onPlacePress={openPlace} region={region} /></SafeAreaView>}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <PlaceholderScreen tab="탐색" />}</Tab.Screen>
      <Tab.Screen name="Saved">{() => <PlaceholderScreen tab="저장" />}</Tab.Screen>
      {/* 마이 탭이 계정 설정으로 가는 유일한 진입점이다 — AC-28(계정 삭제)·AC-35(약관)의 전제 */}
      <Tab.Screen name="My">{() => <SafeAreaView className="flex-1 bg-background"><MyScreen region={region} onRegionChange={setRegion} onAccountSettingsPress={() => navigation.push('Settings')} /></SafeAreaView>}</Tab.Screen>
    </Tab.Navigator>
  );
}

function PlaceDetailRoute({navigation, route}: NativeStackScreenProps<MainStackParamList, 'PlaceDetail'>) {
  return <PlaceDetailScreen onBack={navigation.goBack} placeId={route.params.placeId} />;
}

function NearbyPlacesRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'NearbyPlaces'>) {
  return <NearbyPlacesScreen onBack={navigation.goBack} onPlacePress={placeId => navigation.push('PlaceDetail', {placeId})} />;
}

export function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{headerShown: false}}>
      <MainStack.Screen component={MainTabsScreen} name="MainTabs" />
      <MainStack.Screen component={NearbyPlacesRoute} name="NearbyPlaces" />
      <MainStack.Screen component={PlaceDetailRoute} name="PlaceDetail" />
      {/* auth 소유 화면. 파라미터는 features/auth/navigation.ts 가 선언한다 (M-2) */}
      <MainStack.Screen component={SettingsScreen} name="Settings" />
      <MainStack.Screen component={AccountDeleteScreen} name="AccountDelete" />
      <MainStack.Screen component={LegalDocumentScreen} name="LegalDocument" options={{presentation: 'modal'}} />
    </MainStack.Navigator>
  );
}
