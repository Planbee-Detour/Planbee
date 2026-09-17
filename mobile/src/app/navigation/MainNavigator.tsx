/** 홈을 첫 화면으로 두고, 로그인 화면은 필요한 순간에 스택 위로 올린다. */
import React from 'react';
import {Alert, Pressable, StatusBar, Text, View} from 'react-native';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator, type NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AdminSettingsSection} from '../../features/admin-user-approval/components/AdminSettingsSection';
import {UserApprovalListScreen} from '../../features/admin-user-approval/screens/UserApprovalListScreen';
import {AccountDeleteScreen} from '../../features/auth/screens/AccountDeleteScreen';
import {AccountStatusScreen} from '../../features/auth/screens/AccountStatusScreen';
import {LegalDocumentScreen} from '../../features/auth/screens/LegalDocumentScreen';
import {LoginScreen} from '../../features/auth/screens/LoginScreen';
import {SettingsScreen} from '../../features/auth/screens/SettingsScreen';
import {SignUpScreen} from '../../features/auth/screens/SignUpScreen';
import {useBackgroundSessionRestore} from '../../features/auth/hooks/useBackgroundSessionRestore';
import {useSession} from '../../features/auth/hooks/useSession';
import {HomeScreen} from '../../features/home/screens/HomeScreen';
import {NearbyPlacesScreen} from '../../features/nearby-places/screens/NearbyPlacesScreen';
import {PlaceDetailScreen} from '../../features/place-detail/screens/PlaceDetailScreen';
import {SituationCard} from '../../features/plan-b-recommendation/components/SituationCard';
import {PlanBRecommendationScreen} from '../../features/plan-b-recommendation/screens/PlanBRecommendationScreen';
import {ScheduleProgressScreen} from '../../features/plan-b-recommendation/screens/ScheduleProgressScreen';
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

function PlaceholderScreen({tab, onProtectedPress}: {tab: '탐색' | '저장'; onProtectedPress?: () => void}) {
  return (
    <Pressable accessibilityRole={onProtectedPress ? 'button' : undefined} onPress={onProtectedPress} className="flex-1">
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8 pb-20">
      <Text className="text-display text-brand">{tab === '탐색' ? '⌕' : '▣'}</Text>
      <Text className="mt-4 text-h1 font-bold text-ink">{tab}</Text>
      <Text className="mt-2 text-center text-body-sm text-ink-muted">
        {tab === '탐색' ? '새로운 장소와 계획을 찾아보세요.' : '저장한 장소와 계획을 모아볼 수 있어요.'}
      </Text>
    </SafeAreaView>
    </Pressable>
  );
}

function MainTabsScreen({navigation, route}: NativeStackScreenProps<MainStackParamList, 'MainTabs'>) {
  const {isResolvingRegion, region, setRegion} = usePreferredRegion();
  const isSignedIn = useSession(state => state.isSignedIn);
  const planBState = route.params?.planBState ?? 'needs-confirmation';
  const openPlace = (placeId: string) => navigation.push('PlaceDetail', {placeId});
  const requestLogin = () => Alert.alert('로그인이 필요한 기능이에요', '로그인하시겠어요?', [
    {text: '아니요', style: 'cancel'},
    {text: '예', onPress: () => navigation.push('Login')},
  ]);
  const protectedAction = () => { if (!isSignedIn) requestLogin(); };
  return (
    <Tab.Navigator screenOptions={{headerShown: false}} tabBar={AppTabBar}>
      <Tab.Screen name="Home">{() => <SafeAreaView className="flex-1 bg-background"><StatusBar barStyle="dark-content" /><HomeScreen isResolvingRegion={isResolvingRegion} onAiHelpPress={protectedAction} onMorePlacesPress={() => navigation.push('NearbyPlaces')} onPlacePress={openPlace} region={region} situationSlot={planBState === 'no-impact' ? null : <SituationCard status={planBState} onPress={planBState === 'needs-confirmation' ? () => navigation.push('PlanBProgress') : planBState === 'confirmed' ? () => navigation.push('PlanBRecommendation') : undefined} />} /></SafeAreaView>}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <PlaceholderScreen tab="탐색" />}</Tab.Screen>
      <Tab.Screen name="Saved">{() => <PlaceholderScreen tab="저장" onProtectedPress={isSignedIn ? undefined : requestLogin} />}</Tab.Screen>
      {/* 마이 탭이 계정 설정으로 가는 유일한 진입점이다 — AC-28(계정 삭제)·AC-35(약관)의 전제 */}
      <Tab.Screen name="My">{() => <SafeAreaView className="flex-1 bg-background"><MyScreen isSignedIn={isSignedIn} region={region} onRegionChange={setRegion} onLoginPress={() => navigation.push('Login')} onSignupPress={() => navigation.push('SignUp')} onPersonalizationPress={protectedAction} onAccountSettingsPress={() => navigation.push('Settings')} /></SafeAreaView>}</Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * 설정 화면 + `관리자` 섹션 (`admin-user-approval` design.md §4.7).
 *
 * 두 기능을 <b>여기서 조합한다</b> — `SettingsScreen`(auth 소유)이 관리자 기능을 직접
 * import 하면 M-2(기능 간 직접 import 금지) 위반이다. 설정 화면은 슬롯만 알고,
 * 섹션을 그릴지 말지는 관리자 기능의 컴포넌트가 역할(`role`)로 판단한다 (AC-1 · AC-2).
 */
function SettingsRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'Settings'>) {
  return (
    <SettingsScreen
      onSignedOut={() => navigation.navigate('MainTabs')}
      renderExtraSection={account => (
        <AdminSettingsSection
          account={account}
          onPress={() => navigation.push('UserApprovalList')}
        />
      )}
    />
  );
}

function LoginRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'Login'>) {
  const finishLogin = () => navigation.canGoBack()
    ? navigation.goBack()
    : navigation.navigate('MainTabs');
  return <LoginScreen onSignedIn={finishLogin} onBack={finishLogin} />;
}

function PlanBProgressRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'PlanBProgress'>) {
  return <ScheduleProgressScreen onBack={navigation.goBack} onConfirmed={hasRemaining => navigation.navigate('MainTabs', {planBState: hasRemaining ? 'confirmed' : 'no-impact'})} />;
}

function PlanBRecommendationRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'PlanBRecommendation'>) {
  return <PlanBRecommendationScreen onBack={navigation.goBack} onApplied={() => navigation.navigate('MainTabs', {planBState: 'applied'})} />;
}

function PlaceDetailRoute({navigation, route}: NativeStackScreenProps<MainStackParamList, 'PlaceDetail'>) {
  return <PlaceDetailScreen onBack={navigation.goBack} placeId={route.params.placeId} />;
}

function NearbyPlacesRoute({navigation}: NativeStackScreenProps<MainStackParamList, 'NearbyPlaces'>) {
  return <NearbyPlacesScreen onBack={navigation.goBack} onPlacePress={placeId => navigation.push('PlaceDetail', {placeId})} />;
}

export function MainNavigator() {
  useBackgroundSessionRestore();
  return (
    <MainStack.Navigator screenOptions={{headerShown: false}}>
      <MainStack.Screen component={MainTabsScreen} name="MainTabs" />
      <MainStack.Screen component={NearbyPlacesRoute} name="NearbyPlaces" />
      <MainStack.Screen component={PlaceDetailRoute} name="PlaceDetail" />
      <MainStack.Screen component={PlanBProgressRoute} name="PlanBProgress" />
      <MainStack.Screen component={PlanBRecommendationRoute} name="PlanBRecommendation" />
      <MainStack.Screen component={LoginRoute} name="Login" />
      <MainStack.Screen component={SignUpScreen} name="SignUp" />
      <MainStack.Screen component={AccountStatusScreen} name="AccountStatus" />
      {/* auth 소유 화면. 파라미터는 features/auth/navigation.ts 가 선언한다 (M-2) */}
      <MainStack.Screen component={SettingsRoute} name="Settings" />
      {/* admin-user-approval 소유 화면. 하단 탭바는 건드리지 않는다 (그 기능 design.md 결정 1) */}
      <MainStack.Screen component={UserApprovalListScreen} name="UserApprovalList" />
      <MainStack.Screen component={AccountDeleteScreen} name="AccountDelete" />
      <MainStack.Screen component={LegalDocumentScreen} name="LegalDocument" options={{presentation: 'modal'}} />
    </MainStack.Navigator>
  );
}
