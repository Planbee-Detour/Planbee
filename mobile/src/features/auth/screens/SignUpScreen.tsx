/**
 * 가입 신청 (design.md §5).
 * 충족 AC: AC-1 ~ AC-10 · AC-32 · AC-33 · AC-46
 *
 * AC-10 이 요구하는 "입력한 값이 그대로 남는다" 에는 <b>비밀번호와 체크박스가 포함된다</b>.
 * 그래서 오류 처리 중 폼 상태를 초기화하지 않고, 화면을 리마운트하는 처리도 쓰지 않는다 (§5.6).
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ApiError} from '../../../shared/api/problem';
import {RequirementBadge} from '../../../shared/ui/Badge';
import {Banner} from '../../../shared/ui/Banner';
import {Button, TextButton} from '../../../shared/ui/Button';
import {NavBar} from '../../../shared/ui/NavBar';
import {TextField} from '../../../shared/ui/TextField';
import type {AuthRouteParams} from '../navigation';
import {AUTH_ERROR, signup} from '../api/endpoints';
import {ConsentBlock, EMPTY_CONSENTS, hasRequiredConsents, type ConsentState} from '../components/ConsentBlock';
import {useAndroidBackHandler} from '../hooks/useAndroidBackHandler';
import {LEGAL_DOCUMENTS, type LegalDocumentKey} from '../legal/documents.generated';
import {FIELD_ERRORS, LABELS, MESSAGES, SUBMIT_HINTS} from '../messages';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'SignUp'>;
type Route = RouteProp<AuthRouteParams, 'SignUp'>;

const REASON_MAX = 100;
/** AC-3 — 영문과 숫자를 포함해 8자 이상. 서버도 같은 정책을 독립적으로 강제한다 (AC-4) */
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
/** AC-5 — `local@domain` 형식인지만 본다. 서버가 최종 판정한다 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormBanner = 'network' | 'server' | null;

export function SignUpScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [consents, setConsents] = useState<ConsentState>(EMPTY_CONSENTS);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [banner, setBanner] = useState<FormBanner>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const emailValid = EMAIL_FORMAT.test(email);
  const passwordValid = PASSWORD_POLICY.test(password);
  const consentsValid = hasRequiredConsents(consents);
  const canSubmit = emailValid && passwordValid && consentsValid && !submitting;
  const dirty = email.length > 0 || password.length > 0 || reason.length > 0 || consents !== EMPTY_CONSENTS;

  /** 비활성 사유가 여러 개여도 위에서부터 첫 번째 하나만 읽는다 (§5.5). */
  const submitHint = useMemo(() => {
    if (!emailValid) {
      return SUBMIT_HINTS.email;
    }
    if (!passwordValid) {
      return SUBMIT_HINTS.password;
    }
    if (!consentsValid) {
      return SUBMIT_HINTS.consent;
    }
    return undefined;
  }, [consentsValid, emailValid, passwordValid]);

  const confirmLeave = useCallback(() => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(LABELS.leaveTitle, LABELS.leaveBody, [
      {text: LABELS.leaveCancel, style: 'cancel'},
      {text: LABELS.leaveConfirm, style: 'destructive', onPress: () => navigation.goBack()},
    ]);
  }, [dirty, navigation]);

  // 안드로이드 하드웨어 백도 같은 확인을 거친다 (§1.3).
  useAndroidBackHandler(
    useCallback(() => {
      confirmLeave();
      return true;
    }, [confirmLeave]),
  );

  const openDocument = useCallback(
    (document: LegalDocumentKey) =>
      navigation.navigate('LegalDocument', {document, origin: 'signup'}),
    [navigation],
  );

  /**
   * 약관 뷰어의 "동의하고 닫기" 로 돌아오면 그 항목을 체크한다 (§6.7).
   * 적용한 즉시 파라미터를 비운다 — 남겨 두면 화면이 다시 그려질 때 또 적용되어,
   * 사용자가 직접 해제한 동의가 되살아난다.
   *
   * NavBar 의 ✕ 로 닫으면 이 파라미터가 오지 않으므로 체크 상태가 그대로 유지된다.
   */
  const agreedDocument = route.params?.agreedDocument;
  useEffect(() => {
    if (!agreedDocument) {
      return;
    }
    setConsents(current => ({...current, [agreedDocument]: true}));
    navigation.setParams({agreedDocument: undefined});
  }, [agreedDocument, navigation]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setBanner(null);
    setEmailServerError(null);
    setPasswordServerError(null);

    try {
      const accountStatus = await signup({
        email,
        password,
        // 선택 항목이라 비어 있으면 보내지 않는다 (AC-7 / PRD 제약).
        signup_reason: reason.trim().length > 0 ? reason.trim() : null,
        // 3종을 모두 보낸다 — 거부한 항목도 "거부함" 으로 남아야 증빙이 된다 (AC-8).
        consents: [
          {type: 'TERMS', agreed: consents.terms, version: LEGAL_DOCUMENTS.terms.version},
          {type: 'PRIVACY', agreed: consents.privacy, version: LEGAL_DOCUMENTS.privacy.version},
          // 대응 문서가 없어 버전이 비어 있다 (design.md §5.4).
          {type: 'MARKETING', agreed: consents.marketing, version: null},
        ],
        // 만 14세는 동의가 아니라 자기 확인이다 — 동의 이력과 분리해서 보낸다.
        age_over_14_confirmed: consents.age,
      });

      // AC-1 — 스택 교체. 뒤로가기로 폼에 돌아가지 않는다.
      navigation.reset({
        index: 0,
        routes: [{name: 'AccountStatus', params: {accountStatus, deletionToken: null}}],
      });
    } catch (error) {
      applyError(error, {setEmailServerError, setPasswordServerError, setBanner});
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, consents, email, navigation, password, reason]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar
        title={LABELS.signUpNavTitle}
        left={{label: '‹', accessibilityLabel: '뒤로', onPress: confirmLeave}}
      />
      <KeyboardAvoidingView
        behavior={Platform.select({ios: 'padding', android: 'height', default: 'height'})}
        className="flex-1">
        <ScrollView contentContainerClassName="grow px-5 pb-10" keyboardShouldPersistTaps="handled">
          {/* §5.2 — NavBar 타이틀("가입 신청")과 본문 H1("Planbee 가입 신청")은 다른 문장이다 */}
          <Text accessibilityRole="header" className="mt-6 text-h1 text-ink">
            {LABELS.signUpTitle}
          </Text>
          <Text className="mt-2 text-body-sm text-ink-muted">{LABELS.signUpLead}</Text>

          {banner ? (
            <View className="mt-7">
              <Banner
                title={banner === 'network' ? MESSAGES.error.network : MESSAGES.error.server}
                detail={banner === 'network' ? MESSAGES.signup.networkDetail : undefined}
                tone={banner === 'network' ? 'neutral' : 'danger'}
                action={{label: LABELS.retry, onPress: submit}}
                testID="signup-error"
              />
            </View>
          ) : null}

          <View className="mt-7">
            <TextField
              label={LABELS.emailLabel}
              placeholder={LABELS.emailPlaceholder}
              helpText={LABELS.emailHelp}
              value={email}
              onChangeText={value => {
                setEmail(value);
                setEmailServerError(null);
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
                emailServerError ??
                // blur 전에는 오류를 하나도 표시하지 않는다 (§5.8 비어있음).
                (emailTouched && !emailValid
                  ? email.length === 0
                    ? FIELD_ERRORS.emailRequired
                    : FIELD_ERRORS.emailFormat
                  : undefined)
              }
              testID="signup-email"
            />
          </View>

          <View className="mt-4">
            <TextField
              ref={passwordRef}
              label={LABELS.passwordLabel}
              placeholder={LABELS.passwordPlaceholder}
              helpText={FIELD_ERRORS.passwordPolicy}
              value={password}
              onChangeText={value => {
                setPassword(value);
                setPasswordServerError(null);
              }}
              onBlur={() => setPasswordTouched(true)}
              editable={!submitting}
              secureToggle
              autoCapitalize="none"
              autoComplete="new-password"
              errorMessage={
                passwordServerError ??
                (passwordTouched && !passwordValid ? FIELD_ERRORS.passwordPolicy : undefined)
              }
              testID="signup-password"
            />
          </View>

          <View className="mt-4">
            {/* §5.3 — 라벨은 "가입 사유" + 우측 "선택" 배지, 플레이스홀더는 안내 문장이다.
                플레이스홀더를 라벨로 넘기면 입력란의 accessibilityLabel 까지 그 문장이 된다 (§2.5) */}
            <TextField
              label={LABELS.reasonLabel}
              labelBadge={<RequirementBadge required={false} />}
              placeholder={LABELS.reasonPlaceholder}
              helpText={LABELS.reasonHelp}
              value={reason}
              // AC-9 — 100자에서 입력 자체가 막힌다. 서버도 같은 상한을 강제한다.
              onChangeText={value => setReason(value.slice(0, REASON_MAX))}
              maxLength={REASON_MAX}
              editable={!submitting}
              multiline
              counter={{current: reason.length, max: REASON_MAX}}
              testID="signup-reason"
            />
          </View>

          <View className="mt-8">
            <ConsentBlock
              value={consents}
              onChange={setConsents}
              onViewDocument={openDocument}
              disabled={submitting}
            />
          </View>

          <View className="mt-8">
            <Button
              label={LABELS.signUpSubmit}
              loadingLabel={LABELS.signUpBusy}
              loading={submitting}
              disabled={!canSubmit}
              accessibilityHint={submitHint}
              onPress={submit}
              testID="signup-submit"
            />
          </View>

          <View className="mt-4 flex-row items-center justify-center">
            <Text className="text-caption text-ink-muted">{LABELS.alreadyMember}</Text>
            <View className="ml-2">
              <TextButton label={LABELS.login} onPress={confirmLeave} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** §5.6 — 상황별 표현. 어느 경우에도 입력값은 유지한다 (AC-10). */
function applyError(
  error: unknown,
  setters: {
    setEmailServerError: (value: string | null) => void;
    setPasswordServerError: (value: string | null) => void;
    setBanner: (value: FormBanner) => void;
  },
): void {
  if (!(error instanceof ApiError)) {
    setters.setBanner('network');
    return;
  }
  if (error.code === AUTH_ERROR.emailAlreadyRegistered) {
    setters.setEmailServerError(FIELD_ERRORS.emailDuplicated); // AC-2
    return;
  }
  if (error.fieldErrors.length > 0) {
    // AC-4 — 서버 errors[] 를 필드별로 매핑한다. 필드 이름은 계약이 정한 snake_case 다 (M-17).
    setters.setEmailServerError(error.messageForField('email') ?? null);
    setters.setPasswordServerError(error.messageForField('password') ?? null);
    if (!error.messageForField('email') && !error.messageForField('password')) {
      setters.setBanner('server');
    }
    return;
  }
  setters.setBanner(error.status === 0 ? 'network' : 'server');
}
