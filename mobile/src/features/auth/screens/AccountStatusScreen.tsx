/**
 * 계정 상태 안내 (design.md §7) — 한 컴포넌트의 세 변형.
 * 충족 AC: AC-1 · AC-14 · AC-15 · AC-16 · AC-38 ~ AC-40 · AC-42 ~ AC-46 · AC-50
 *
 * <b>제목·본문·강조 카드 본문은 서버 응답의 문자열을 그대로 렌더한다</b> (C-8 / M-18).
 * 앱이 상태 코드로 switch 해서 문구를 만들지 않는다. 앱이 상태로 결정하는 것은
 * 아이콘·색·버튼 구성뿐이다 — 표현 계층이다.
 */
import React, {useCallback} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {Button, TextButton} from '../../../shared/ui/Button';
import {StatusIcon, type StatusIconTone} from '../../../shared/ui/StatusIcon';
import type {AuthRouteParams} from '../navigation';
import {ContactBlock} from '../components/ContactBlock';
import {useAndroidBackHandler} from '../hooks/useAndroidBackHandler';
import {CONTACT, CONTACT_SUBJECTS, LABELS, MESSAGES} from '../messages';
import type {AccountStatus} from '../types';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'AccountStatus'>;
type Route = RouteProp<AuthRouteParams, 'AccountStatus'>;

/** 상태별 표현 계층. 세 변형이 아이콘 모양·색·보조 액션에서 모두 갈려야 한다 (§7). */
const PRESENTATION: Record<
  AccountStatus,
  {tone: StatusIconTone; glyph: string; subject: string; contactOn: 'screen' | 'card'}
> = {
  PENDING: {tone: 'brand', glyph: '⧗', subject: CONTACT_SUBJECTS.pending, contactOn: 'screen'},
  REJECTED: {tone: 'neutral', glyph: '⊘', subject: CONTACT_SUBJECTS.rejected, contactOn: 'card'},
  SUSPENDED: {tone: 'danger', glyph: '⛒', subject: CONTACT_SUBJECTS.suspended, contactOn: 'card'},
};

export function AccountStatusScreen() {
  const navigation = useNavigation<Navigation>();
  const {accountStatus, deletionToken} = useRoute<Route>().params;

  const goLogin = useCallback(
    () => navigation.reset({index: 0, routes: [{name: 'Login'}]}),
    [navigation],
  );

  // 뒤로가기는 "로그인 화면으로" 와 같은 동작이다 (§1.3).
  useAndroidBackHandler(
    useCallback(() => {
      goLogin();
      return true;
    }, [goLogin]),
  );

  const presentation = PRESENTATION[accountStatus.status];

  // 비어있음 ② — 카탈로그에 없는 상태 값. 앱이 죽지 않고 일반 안내로 처리한다 (§7.5 / M-13).
  if (!presentation) {
    return (
      <UnknownStatus onGoLogin={goLogin} />
    );
  }

  const isPending = accountStatus.status === 'PENDING';
  const isRejected = accountStatus.status === 'REJECTED';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow px-5 pb-6">
        <View className="mt-12 items-center">
          <StatusIcon tone={presentation.tone} glyph={presentation.glyph} />
          <Text
            accessibilityRole="header"
            className="mt-6 text-center text-h1 text-ink">
            {accountStatus.title}
          </Text>
          <Text className="mt-3 text-center text-body text-ink-body">{accountStatus.body}</Text>
        </View>

        {/* 강조 카드 — PENDING 은 행동 지시(AC-14 필수), 나머지는 문의/이의 제기 카드 */}
        <View className="mt-7">
          <View
            accessible
            accessibilityLabel={`${accountStatus.highlight.title}. ${accountStatus.highlight.body}`}
            className={[
              'rounded-card p-5',
              isPending ? 'border border-brand bg-cream' : 'border border-border bg-surface',
            ].join(' ')}>
            <Text className="text-title text-ink">{accountStatus.highlight.title}</Text>
            <Text className="mt-2 text-body-sm text-ink-body">{accountStatus.highlight.body}</Text>

            {/* REJECTED · SUSPENDED 는 카드 안에 주소 행 + Button/Secondary (§7.3.1 · §7.4.1) */}
            {!isPending ? (
              <View className="mt-4">
                <ContactBlock
                  email={accountStatus.support_contact_email}
                  subject={presentation.subject}
                  on="card"
                  withSecondaryButton={Boolean(accountStatus.support_contact_email)}
                />
              </View>
            ) : null}
          </View>
        </View>

        {/* 정보 행 — PENDING 만 (§7.2) */}
        {isPending ? (
          <View className="mt-6 rounded-card bg-surface p-5">
            <InfoRow label={LABELS.statusAppliedEmail} value={accountStatus.email} />
            {accountStatus.applied_at ? (
              <View className="mt-3">
                <InfoRow
                  label={LABELS.statusAppliedAt}
                  // 표시 직전에만 로컬 시간대로 바꾼다 (C-2). 그 외의 가공은 하지 않는다.
                  value={formatDate(accountStatus.applied_at)}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 문의 줄 — PENDING 만, 강조 카드보다 한 단계 낮은 위계 (§7.2.2) */}
        {isPending ? (
          <View className="mt-4 items-center">
            <Text className="text-center text-caption text-ink-muted">{CONTACT.pendingLead}</Text>
            <View className="mt-2 w-full">
              <ContactBlock
                email={accountStatus.support_contact_email}
                subject={presentation.subject}
                on="screen"
              />
            </View>
          </View>
        ) : null}

        <View className="grow" />

        <View className="mt-8">
          <Button label={LABELS.goLoginScreen} onPress={goLogin} testID="status-go-login" />
        </View>

        {/* 보조 링크 — 변형마다 다르다 (§7.3 · §7.4) */}
        {isRejected ? (
          <View className="mt-3 flex-row items-center justify-center">
            <TextButton
              label={LABELS.viewPrivacy}
              tone="muted"
              onPress={() =>
                navigation.navigate('LegalDocument', {document: 'privacy', origin: 'status'})
              }
            />
            <Text className="mx-2 text-caption text-border">·</Text>
            {/* AC-50 — 문의에 기대지 않는 출구. 주 행동보다 무겁게 보이면 안 되므로 텍스트 버튼이다 */}
            <TextButton
              label={LABELS.deleteAccount}
              tone="danger"
              accessibilityHint={LABELS.a11yDeleteHint}
              onPress={() =>
                navigation.navigate('AccountDelete', {
                  deletionToken: deletionToken ?? undefined,
                  origin: 'status',
                })
              }
              testID="status-delete-account"
            />
          </View>
        ) : null}

        {accountStatus.status === 'SUSPENDED' ? (
          <View className="mt-3 items-center">
            <TextButton
              label={LABELS.viewTerms}
              tone="muted"
              onPress={() =>
                navigation.navigate('LegalDocument', {document: 'terms', origin: 'status'})
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View accessibilityRole="text" accessibilityLabel={`${label}, ${value}`} className="flex-row">
      <Text className="text-body-sm text-ink-muted">{label}</Text>
      <Text className="ml-auto text-body-sm text-ink">{value}</Text>
    </View>
  );
}

function UnknownStatus({onGoLogin}: {onGoLogin: () => void}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-5">
        <StatusIcon tone="neutral" glyph="?" />
        <Text accessibilityRole="header" className="mt-6 text-center text-h1 text-ink">
          {MESSAGES.status.unknownTitle}
        </Text>
        <Text className="mt-3 text-center text-body text-ink-body">
          {MESSAGES.status.unknownDetail}
        </Text>
        <View className="mt-8 w-full">
          <Button label={LABELS.goLoginScreen} onPress={onGoLogin} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/** `YYYY. M. D.` (design.md §7.2). 서버는 UTC 로 주고 표시 직전에만 로컬로 바꾼다 (C-2). */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}
