/**
 * 로그인 (design.md §4).
 * 충족 AC: AC-11 · AC-12 · AC-13 · AC-17 · AC-18 · AC-19 · AC-21 · AC-24 · AC-25 · AC-26
 *          · AC-31 · AC-41 ~ AC-45 · AC-47 · AC-48
 *
 * <b>이 화면에서는 형식 검증을 하지 않는다</b> (§4.4). 형식이 틀린 이메일도 그대로 서버에 보낸다 —
 * 앱이 "이 이메일은 형식이 틀렸으니 가입도 안 돼 있겠네" 를 추론해 다른 문구를 보여주면
 * 계정 존재 여부를 노출하는 것과 같은 결과가 된다.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ApiError} from '../../../shared/api/problem';
import {saveTokenPair} from '../../../shared/api/session';
import {Banner} from '../../../shared/ui/Banner';
import {Button} from '../../../shared/ui/Button';
import {TextField} from '../../../shared/ui/TextField';
import {Toast} from '../../../shared/ui/Toast';
import type {AuthRouteParams} from '../navigation';
import {AUTH_ERROR, login, loginLockOf} from '../api/endpoints';
import {ContactBlock} from '../components/ContactBlock';
import {useSession} from '../hooks/useSession';
import {CONTACT_SUBJECTS, FIELD_ERRORS, LABELS, MESSAGES} from '../messages';
import type {LoginLockInfo} from '../types';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'Login'>;

/** §4.6 의 배너 6종. 잠금(4번)은 전용 블록이라 따로 뺀다. */
type ErrorBanner =
  | {kind: 'credentials'}
  | {kind: 'locked'; lock: LoginLockInfo}
  | {kind: 'server'}
  | {kind: 'network'}
  | null;

/**
 * 응답이 아무리 빨라도 로딩을 이만큼은 유지한다 (§4.6).
 *
 * 자격 증명 오류 3종은 문구·아이콘·레이아웃뿐 아니라 <b>표시 시간</b>까지 같아야 한다.
 * 서버가 미등록 이메일에도 더미 해시 검증을 돌려 시간을 맞추지만(계약), 앱에서도
 * 최소 노출 시간을 두어 남은 차이를 덮는다.
 */
const MIN_SUBMIT_MS = 400;

export function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const signIn = useSession(state => state.signIn);
  const notice = useSession(state => state.notice);
  const consumeNotice = useSession(state => state.consumeNotice);
  const toast = useSession(state => state.toast);
  const consumeToast = useSession(state => state.consumeToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<ErrorBanner>(null);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.length > 0 && password.length > 0 && !submitting;

  /** 입력을 수정하기 시작하면 배너가 사라진다 (§4.6). 세션 배너도 같이 지운다 (§4.3). */
  const onEdit = useCallback(() => {
    setBanner(null);
    consumeNotice();
  }, [consumeNotice]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    const startedAt = Date.now();

    try {
      const outcome = await login(email, password);
      await holdLoading(startedAt);

      if (outcome.kind === 'session') {
        // 경계 → 저장 모델 변환은 `shared/api/session.ts` 한 곳에 있다 (M-17).
        await saveTokenPair(outcome.tokens);
        signIn(); // AC-11
        return;
      }

      // AC-14 · AC-15 · AC-16 — 오류가 아니라 머물러 읽는 목적지다. 스택을 교체한다.
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'AccountStatus',
            params: {
              accountStatus: outcome.accountStatus,
              deletionToken: outcome.deletionToken,
            },
          },
        ],
      });
    } catch (error) {
      await holdLoading(startedAt);
      setBanner(toBanner(error));
      // 자격 증명 오류에서만 비밀번호를 지운다. 서버·네트워크 오류는 다시 시도해야 하므로 남긴다 (§4.6).
      if (!isRetryable(error)) {
        setPassword('');
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, email, navigation, password, signIn]);

  useEffect(() => {
    // 로그인 화면에 도착하면 세션 배너를 한 번만 보여준다. 사용자가 입력을 시작하면 사라진다.
    return () => undefined;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        // iOS 는 padding, 안드로이드는 높이 조정이 기본 동작과 맞는다 (M-20).
        behavior={Platform.select({ios: 'padding', android: 'height', default: 'height'})}
        className="flex-1">
        <ScrollView
          contentContainerClassName="grow px-5 pb-10"
          keyboardShouldPersistTaps="handled">
          <View className="mt-10">
            <Text className="text-h1 text-ink">Planbee</Text>
            <Text className="mt-2 text-body text-ink-muted">{LABELS.tagline}</Text>
          </View>

          {notice ? (
            <View className="mt-8">
              <Banner
                title={
                  notice === 'revoked'
                    ? MESSAGES.session.revokedTitle
                    : MESSAGES.session.expiredTitle
                }
                detail={notice === 'expired' ? MESSAGES.session.expiredDetail : undefined}
                tone={notice === 'revoked' ? 'danger' : 'neutral'}
                onDismiss={consumeNotice}
                testID="session-banner"
              />
            </View>
          ) : null}

          {banner ? (
            <View className="mt-8">
              <ErrorBannerView banner={banner} onRetry={submit} />
            </View>
          ) : null}

          <View className="mt-8">
            <TextField
              label={LABELS.emailLabel}
              placeholder={LABELS.emailPlaceholder}
              value={email}
              onChangeText={value => {
                setEmail(value);
                onEdit();
              }}
              onBlur={() => setEmailTouched(true)}
              editable={!submitting}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              errorMessage={
                emailTouched && email.length === 0 ? FIELD_ERRORS.emailRequired : undefined
              }
            />
          </View>

          <View className="mt-4">
            <TextField
              ref={passwordRef}
              label={LABELS.passwordLabel}
              placeholder={LABELS.passwordPlaceholder}
              value={password}
              onChangeText={value => {
                setPassword(value);
                onEdit();
              }}
              onBlur={() => setPasswordTouched(true)}
              editable={!submitting}
              secureToggle
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={submit}
              errorMessage={
                passwordTouched && password.length === 0
                  ? FIELD_ERRORS.passwordRequired
                  : undefined
              }
            />
          </View>

          <View className="mt-6">
            <Button
              label={LABELS.login}
              loadingLabel={LABELS.loginBusy}
              loading={submitting}
              disabled={!canSubmit}
              onPress={submit}
              testID="login-submit"
            />
          </View>

          <View className="mt-5 flex-row items-center">
            <View className="h-[1px] flex-1 bg-border" />
            <Text className="mx-3 text-caption text-ink-muted">{LABELS.or}</Text>
            <View className="h-[1px] flex-1 bg-border" />
          </View>

          <View className="mt-5">
            <Button
              label={LABELS.goSignUp}
              variant="secondary"
              disabled={submitting}
              onPress={() => navigation.navigate('SignUp')}
            />
          </View>

          {/* 비어있음 상태 — 승인제 안내는 항상 보인다 (§4.8 / AC-21) */}
          <Text className="mt-4 text-center text-caption text-ink-muted">
            {LABELS.loginNotice}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast ? <Toast message={toast} onHide={consumeToast} /> : null}
    </SafeAreaView>
  );
}

/** §4.6 배너 1·2·3 / 5 / 6 과 §4.7 잠금 배너. */
function ErrorBannerView({banner, onRetry}: {banner: NonNullable<ErrorBanner>; onRetry: () => void}) {
  if (banner.kind === 'locked') {
    return (
      <Banner title={MESSAGES.login.lockedTitle} detail={MESSAGES.login.lockedDetail} tone="danger" testID="login-locked">
        {/* 남은 시간은 서버가 내려준 값을 그대로 렌더한다. 앱은 카운트다운을 돌리지 않는다 (M-18) */}
        <Text className="mt-4 text-title text-danger">
          {MESSAGES.login.lockedRemaining(banner.lock.remainingMinutes)}
        </Text>
        <Text className="mt-4 text-body-sm text-ink-body">{MESSAGES.login.lockedHelp}</Text>
        <View className="mt-4">
          <ContactBlock
            email={banner.lock.supportContactEmail}
            subject={CONTACT_SUBJECTS.loginLocked}
            on="card"
          />
        </View>
      </Banner>
    );
  }

  if (banner.kind === 'credentials') {
    // 1·2·3 은 하나의 코드 경로다. 여기서 갈라지면 계정 존재가 새어 나간다 (§4.6).
    return <Banner title={MESSAGES.login.credentials} tone="danger" testID="login-error" />;
  }

  return (
    <Banner
      title={banner.kind === 'server' ? MESSAGES.error.server : MESSAGES.error.network}
      tone={banner.kind === 'server' ? 'danger' : 'neutral'}
      action={{label: LABELS.retry, onPress: onRetry}}
      testID="login-error"
    />
  );
}

function toBanner(error: unknown): ErrorBanner {
  if (!(error instanceof ApiError)) {
    return {kind: 'network'};
  }
  if (error.code === AUTH_ERROR.loginLocked) {
    const lock = loginLockOf(error);
    // 남은 시간을 못 읽으면 잠금 배너를 그릴 수 없다. 앱이 값을 지어내지 않고 일반 오류로 떨어진다 (M-13).
    return lock ? {kind: 'locked', lock} : {kind: 'server'};
  }
  if (error.code === AUTH_ERROR.invalidCredentials) {
    return {kind: 'credentials'};
  }
  if (error.status === 0) {
    return {kind: 'network'};
  }
  return {kind: 'server'};
}

/** 서버·네트워크 오류는 같은 입력으로 다시 보낼 수 있다 — 비밀번호를 지우지 않는다. */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return true;
  }
  return error.status === 0 || error.status >= 500;
}

async function holdLoading(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= MIN_SUBMIT_MS) {
    return;
  }
  await new Promise<void>(resolve => {
    setTimeout(resolve, MIN_SUBMIT_MS - elapsed);
  });
}
