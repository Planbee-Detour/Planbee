/**
 * 계정 삭제 확인 (design.md §9). 충족 AC: AC-29 · AC-30 · AC-31 · AC-32 · AC-50
 *
 * 즉시 파기이고 유예가 없다. <b>비밀번호 재확인(AC-29)과 경고 문구(AC-30)가 유일한 안전장치다.</b>
 * 그래서 이 화면은 경고를 맨 위에 두고, 무엇이 지워지는지 항목으로 나열하고,
 * 삭제 버튼을 비밀번호 입력 전까지 활성화하지 않으며, 마지막에 확인 다이얼로그를 한 번 더 둔다.
 *
 * 진입 경로는 둘인데 <b>화면은 완전히 같다</b> (§9.1) — 달라지는 것은 취소·완료 시 돌아갈 곳뿐이다.
 */
import React, {useCallback, useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ApiError} from '../../../shared/api/problem';
import {clearTokens} from '../../../shared/api/session';
import {Banner} from '../../../shared/ui/Banner';
import {Button} from '../../../shared/ui/Button';
import {NavBar} from '../../../shared/ui/NavBar';
import {TextField} from '../../../shared/ui/TextField';
import type {AuthRouteParams} from '../navigation';
import {AUTH_ERROR, deleteAccount} from '../api/endpoints';
import {useAndroidBackHandler} from '../hooks/useAndroidBackHandler';
import {useSession} from '../hooks/useSession';
import {FIELD_ERRORS, LABELS, MESSAGES} from '../messages';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'AccountDelete'>;
type Route = RouteProp<AuthRouteParams, 'AccountDelete'>;

type DeleteBanner = 'network' | 'server' | null;

export function AccountDeleteScreen() {
  const navigation = useNavigation<Navigation>();
  const {deletionToken} = useRoute<Route>().params;
  const signOut = useSession(state => state.signOut);
  const queryClient = useQueryClient();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<DeleteBanner>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = password.length > 0 && !deleting;

  const goBack = useCallback(() => {
    if (deleting) {
      return;
    }
    // 비밀번호를 입력했으면 필드를 비우고 나간다 (§1.3).
    setPassword('');
    navigation.goBack();
  }, [deleting, navigation]);

  // 삭제 중에는 뒤로가기를 막는다 — 중복 요청과 중간 이탈을 방지한다 (§9.7).
  useAndroidBackHandler(
    useCallback(() => {
      if (deleting) {
        return true;
      }
      goBack();
      return true;
    }, [deleting, goBack]),
  );

  const performDelete = useCallback(async () => {
    setDeleting(true);
    setBanner(null);
    setPasswordError(null);

    try {
      await deleteAccount(password, deletionToken);

      await clearTokens();
      queryClient.clear();
      // 완료 → 로그인 화면으로 스택 교체 + 토스트 (§9.6). 두 진입 경로가 같은 지점으로 나간다.
      signOut(null, LABELS.deleteDone);
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    } catch (error) {
      if (error instanceof ApiError && error.code === AUTH_ERROR.passwordMismatch) {
        // 필드를 비우고 포커스를 유지한다 (§9.4).
        setPassword('');
        setPasswordError(FIELD_ERRORS.passwordMismatch);
      } else if (error instanceof ApiError && error.status > 0) {
        setPassword('');
        setBanner('server');
      } else {
        setPassword('');
        setBanner('network');
      }
    } finally {
      setDeleting(false);
    }
  }, [deletionToken, navigation, password, queryClient, signOut]);

  /** 요청 전에 시스템 다이얼로그를 한 번 더 띄운다 (§9.5). "취소" 가 기본 포커스다. */
  const confirmDelete = useCallback(() => {
    Alert.alert(LABELS.deleteConfirmTitle, LABELS.deleteWarningTitle, [
      {text: LABELS.cancel, style: 'cancel'},
      {text: LABELS.deleteConfirm, style: 'destructive', onPress: performDelete},
    ]);
  }, [performDelete]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar
        title={LABELS.deleteAccount}
        left={{label: '‹', accessibilityLabel: '뒤로', onPress: goBack}}
      />

      <KeyboardAvoidingView
        behavior={Platform.select({ios: 'padding', android: 'height', default: 'height'})}
        className="flex-1">
        <ScrollView contentContainerClassName="grow px-5 pb-10" keyboardShouldPersistTaps="handled">
          {/* 경고는 화면 맨 위다. 스크롤해야 보이면 안전장치가 아니다 (§9.2) */}
          <View
            accessible
            accessibilityLabel={LABELS.deleteWarningTitle}
            className="mt-6 rounded-card border border-danger bg-surface p-5">
            <Text accessibilityRole="header" className="text-title text-danger">
              ⚠ {LABELS.deleteWarningTitle}
            </Text>
            <Text className="mt-3 text-body-sm text-ink-body">{LABELS.deleteWarningLead}</Text>

            <View
              accessibilityRole="list"
              accessibilityLabel={`지워지는 정보 ${LABELS.deleteWarningItems.length}개`}
              className="mt-3">
              {LABELS.deleteWarningItems.map(item => (
                <Text key={item} className="mb-2 text-body-sm text-ink-body">
                  · {item}
                </Text>
              ))}
            </View>

            <Text className="mt-1 text-body-sm text-ink-body">{LABELS.deleteWarningTail}</Text>
          </View>

          {/* AC-32 가 보장하는 사실을 미리 알려 불필요한 망설임을 줄인다 (§9.3) */}
          <Text className="mt-5 text-body-sm text-ink-muted">{LABELS.deleteRejoinNote}</Text>

          {banner ? (
            <View className="mt-5">
              <Banner
                title={banner === 'network' ? MESSAGES.error.network : MESSAGES.error.server}
                detail={
                  banner === 'network'
                    ? MESSAGES.delete.networkDetail
                    : MESSAGES.delete.serverDetail
                }
                tone={banner === 'network' ? 'neutral' : 'danger'}
                action={{label: LABELS.retry, onPress: confirmDelete}}
                testID="delete-error"
              />
            </View>
          ) : null}

          <Text className="mt-8 text-title text-ink">{LABELS.deletePasswordPrompt}</Text>
          <View className="mt-3">
            <TextField
              label={LABELS.passwordLabel}
              placeholder={LABELS.deletePasswordPlaceholder}
              helpText={LABELS.deletePasswordHelp}
              value={password}
              onChangeText={value => {
                setPassword(value);
                setPasswordError(null);
              }}
              editable={!deleting}
              secureToggle
              autoCapitalize="none"
              autoComplete="password"
              errorMessage={passwordError ?? undefined}
              testID="delete-password"
            />
          </View>

          <View className="mt-7">
            <Button
              label={LABELS.deleteAccount}
              loadingLabel={LABELS.deleteBusy}
              loading={deleting}
              // 비밀번호가 비어 있으면 요청이 전송조차 되지 않는다 — AC-29 를 앱에서도 보장한다.
              disabled={!canDelete}
              variant="danger"
              onPress={confirmDelete}
              testID="delete-submit"
            />
          </View>

          {/* 취소를 삭제 아래에 두되 시각 위계를 낮춘다. 간격 12 로 오탭을 막는다 (§9.3) */}
          <View className="mt-3">
            <Button
              label={LABELS.cancel}
              variant="secondary"
              disabled={deleting}
              onPress={goBack}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
