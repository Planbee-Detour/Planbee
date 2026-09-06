/**
 * 홈 — <b>`auth` 의 범위 밖</b>이다. 로그인 성공 후 도착할 곳이 있어야 하므로 최소 형태만 둔다.
 *
 * 실제 홈 화면(추천·일정)은 별도 기능이 맡는다. 여기서는 세션이 성립했다는 것과
 * 설정으로 가는 경로(AC-28 · AC-35 의 전제)만 보인다.
 */
import React from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {Button} from '../../../shared/ui/Button';
import type {MainRouteParams} from '../navigation';
import {LABELS} from '../messages';

type Navigation = NativeStackNavigationProp<MainRouteParams, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-5">
        <Text className="text-h1 text-ink">Planbee</Text>
        <Text className="mt-2 text-body text-ink-muted">{LABELS.tagline}</Text>

        <View className="mt-10">
          <Button
            label={LABELS.settings}
            variant="secondary"
            onPress={() => navigation.navigate('Settings')}
            testID="home-settings"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
