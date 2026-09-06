/**
 * 스플래시 / 세션 복원 (design.md §3). 충족 AC: AC-20 · AC-21 · AC-23 · AC-24 · AC-25
 *
 * 네 가지 상태 중 이 화면이 갖는 것은 <b>로딩</b>과 <b>오류(네트워크)</b> 다.
 * "정상" 과 "비어있음" 은 즉시 다음 화면으로 전환되므로 머무는 화면이 없다 (§3.3).
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ApiError} from '../../../shared/api/problem';
import {clearTokens, loadTokens, saveTokenPair} from '../../../shared/api/session';
import {A11yAnnouncement} from '../../../shared/lib/a11y';
import {Button, TextButton} from '../../../shared/ui/Button';
import type {AuthRouteParams} from '../navigation';
import {AUTH_ERROR, accountStatusOf, deletionTokenOf, isAccountBlocked, refreshTokens} from '../api/endpoints';
import {useAndroidBackHandler} from '../hooks/useAndroidBackHandler';
import {useSession} from '../hooks/useSession';
import {LABELS, MESSAGES} from '../messages';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'Splash'>;

/** 세션 복원의 결말. 화면은 이 값에 따라 스택을 교체한다. */
type Phase = 'restoring' | 'networkError';

const PULSE_MS = 1200;

export function SplashScreen() {
  const navigation = useNavigation<Navigation>();
  const signIn = useSession(state => state.signIn);
  const signOut = useSession(state => state.signOut);
  const [phase, setPhase] = useState<Phase>('restoring');

  const restore = useCallback(async () => {
    setPhase('restoring');
    const tokens = await loadTokens();

    // 비어있음 — 저장된 토큰이 없다 (AC-21). 배너 없이 로그인 화면으로.
    if (!tokens) {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
      return;
    }

    try {
      const renewed = await refreshTokens(tokens.refreshToken);
      // 경계 → 저장 모델 변환은 `shared/api/session.ts` 한 곳에 있다 (M-17).
      await saveTokenPair(renewed);
      signIn(); // AC-20 — 로그인 화면을 거치지 않고 홈으로
    } catch (error) {
      // 갱신이 거부됐는데 계정 상태 때문이라면 로그아웃이 아니라 상태 안내로 간다.
      // 승인 취소·정지가 액세스 토큰 수명 안에 반영되는 경로다 (계약: /token/refresh 403).
      if (isAccountBlocked(error)) {
        const accountStatus = accountStatusOf(error);
        if (accountStatus) {
          await clearTokens();
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'AccountStatus',
                params: {accountStatus, deletionToken: deletionTokenOf(error)},
              },
            ],
          });
          return;
        }
      }

      if (error instanceof ApiError && error.status > 0) {
        // 오류 A — 갱신 거부. 저장된 토큰을 지우고 사유에 맞는 배너와 함께 로그인 화면으로.
        await clearTokens();
        const revoked =
          error.code === AUTH_ERROR.refreshReused || error.code === AUTH_ERROR.refreshRevoked;
        signOut(revoked ? 'revoked' : 'expired'); // AC-23 · AC-24 · AC-25
        navigation.reset({index: 0, routes: [{name: 'Login'}]});
        return;
      }

      // 오류 B — 네트워크. <b>저장된 토큰을 지우지 않는다</b> (§3.4).
      // 연결이 불안정하다는 이유로 사용자를 로그아웃시키지 않는다.
      setPhase('networkError');
    }
  }, [navigation, signIn, signOut]);

  useEffect(() => {
    restore();
  }, [restore]);

  // 되돌아갈 곳이 없다. 안드로이드 뒤로가기를 소비한다 (§1.3).
  useAndroidBackHandler(useCallback(() => true, []));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-5">
        {/* 진입 시 한 번 읽는다 (§3.5). 안드로이드는 라이브 리전, iOS 는 announceForAccessibility (M-20) */}
        <A11yAnnouncement message={LABELS.a11ySplashAnnounce} />
        <BrandMark />
        <Text className="mt-4 text-h1 text-ink">Planbee</Text>
        <Text className="mt-2 text-center text-body-sm text-ink-muted">
          {`${LABELS.tagline}\n${LABELS.splashTagline2}`}
        </Text>

        <View className="mt-8 w-full items-center">
          {phase === 'restoring' ? <RestoringIndicator /> : <NetworkErrorBlock onRetry={restore} navigation={navigation} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** `AI/Identity` 육각형 마크. 새 애니메이션 라이브러리를 들이지 않는다 (§3.2). */
function BrandMark() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-brand">
      <Text className="text-h2 text-ink">⬡</Text>
    </View>
  );
}

function RestoringIndicator() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // "동작 줄이기" 가 켜져 있으면 정지 상태로 표시한다 (§3.5).
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.4, duration: PULSE_MS / 2, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 1, duration: PULSE_MS / 2, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={{opacity}}
      accessibilityRole="progressbar"
      // 낭독은 화면 진입 안내(A11yAnnouncement)가 담당한다. 여기까지 라이브 리전을 두면
      // 안드로이드에서만 한 번 더 읽혀 두 플랫폼 동작이 갈린다 (M-20).
      accessibilityLabel={LABELS.loading}>
      <Text className="text-h2 text-brand-dark">⬡</Text>
    </Animated.View>
  );
}

/** §3.4 — 오류 B. 로딩 인디케이터 자리를 이 블록이 대신한다. */
function NetworkErrorBlock({
  onRetry,
  navigation,
}: {
  onRetry: () => void;
  navigation: Navigation;
}) {
  return (
    <View className="w-full items-center">
      <Text className="text-body-sm text-ink-muted">⚠</Text>
      <Text className="mt-3 text-title text-ink">{MESSAGES.error.network}</Text>
      <Text className="mt-1 text-body-sm text-ink-muted">{MESSAGES.splash.networkDetail}</Text>

      <View className="mt-6 w-full">
        <Button label={LABELS.retry} onPress={onRetry} />
      </View>
      <View className="mt-3">
        {/* 토큰을 <b>지우지 않은 채</b> 이동한다 — 다른 계정으로 들어가려는 경우다 (§3.4) */}
        <TextButton
          label={LABELS.goLoginScreen}
          tone="muted"
          onPress={() => navigation.reset({index: 0, routes: [{name: 'Login'}]})}
        />
      </View>
    </View>
  );
}
