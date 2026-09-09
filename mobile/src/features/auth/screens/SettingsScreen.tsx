/**
 * 설정 (design.md §8). 충족 AC: AC-26 · AC-27 · AC-28 · AC-35
 *
 * <b>관리자 섹션 슬롯</b>: `admin-user-approval` 이 이 화면에 섹션 하나를 더한다
 * (그 기능 design.md §4). 이 화면은 그 기능을 import 하지 않는다 — 슬롯을 prop 으로 받고
 * 조합은 `app/navigation/MainNavigator.tsx` 가 한다 (M-2 / 그 기능 design.md §4.7).
 * 슬롯에는 이 화면이 이미 조회한 계정 응답을 그대로 넘긴다. 같은 화면 영역을 위해
 * 호출을 더 만들지 않기 위해서다 (C-8 / M-18).
 *
 * 계정 정보 조회가 실패해도 <b>다른 섹션은 정상 동작해야 한다</b> (§8.5).
 * 특히 약관·정책(AC-35)과 계정 삭제(AC-28)는 심사 요건이라 조회 실패와 무관하게 항상 눌려야 한다 —
 * 그래서 화면 전체를 오류 화면으로 대체하지 않는다.
 */
import React, {useCallback, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ACCOUNT_QUERY_KEY} from '../../../shared/api/queryKeys';
import {clearTokens, loadTokens} from '../../../shared/api/session';
import {TextButton} from '../../../shared/ui/Button';
import {ListCard, ListDivider, ListRow} from '../../../shared/ui/ListRow';
import {NavBar} from '../../../shared/ui/NavBar';
import type {MainRouteParams} from '../navigation';
import {fetchMe, logout} from '../api/endpoints';
import {useSession} from '../hooks/useSession';
import {LEGAL_DOCUMENTS} from '../legal/documents.generated';
import {LABELS} from '../messages';
import type {UserSummary} from '../types';

type Navigation = NativeStackNavigationProp<MainRouteParams, 'Settings'>;

export type SettingsScreenProps = {
  /**
   * `계정` 섹션 다음, `약관·정책` 앞에 들어가는 슬롯.
   *
   * 조회 중이거나 실패했으면 `account` 가 `undefined` 다 — 슬롯이 그때 무엇을 그릴지
   * (또는 그리지 않을지) 정한다. 이 화면은 그 판단에 관여하지 않는다.
   */
  renderExtraSection?: (account: UserSummary | undefined) => React.ReactNode;
};

/** 앱 버전. 실제 값은 네이티브 빌드 설정에서 오지만 그 연결은 배포 설정 영역이다 (M-19). */
const APP_VERSION = '1.0.0';

export function SettingsScreen({renderExtraSection}: SettingsScreenProps = {}) {
  const navigation = useNavigation<Navigation>();
  const signOut = useSession(state => state.signOut);
  const [loggingOut, setLoggingOut] = useState(false);

  const me = useQuery({queryKey: ACCOUNT_QUERY_KEY, queryFn: fetchMe});

  /**
   * 로그아웃 (AC-26 · AC-27).
   *
   * <b>서버 응답을 기다리지 않는다.</b> 기기의 토큰을 먼저 지우고 화면을 옮긴다 —
   * 서버가 응답하지 않아도 화면 동작과 문구가 완전히 같아야 하고(AC-27),
   * 이 기기에서는 실제로 로그아웃되었으므로 사용자에게 알릴 실패가 없다.
   */
  const performLogout = useCallback(async () => {
    setLoggingOut(true);
    const tokens = await loadTokens();
    if (tokens) {
      // 실패를 삼킨다. 서버 측 토큰은 늦어도 14일 뒤 유휴 만료된다.
      logout(tokens.refreshToken).catch(() => undefined);
    }
    await clearTokens();
    signOut(null, LABELS.logoutDone);
    setLoggingOut(false);
  }, [signOut]);

  const confirmLogout = useCallback(() => {
    Alert.alert(LABELS.logoutConfirmTitle, LABELS.logoutConfirmBody, [
      {text: LABELS.cancel, style: 'cancel'},
      {text: LABELS.logout, style: 'destructive', onPress: performLogout},
    ]);
  }, [performLogout]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar
        title={LABELS.settings}
        left={{label: '‹', accessibilityLabel: '뒤로', onPress: () => navigation.goBack()}}
      />

      <ScrollView contentContainerClassName="px-5 pb-10">
        <SectionHeader title={LABELS.sectionAccount} className="mt-6" />
        <ListCard>
          <ListRow label={LABELS.emailLabel} valueSlot={<AccountValue query={me} />} />
        </ListCard>

        {renderExtraSection?.(me.isSuccess ? me.data : undefined)}

        <SectionHeader title={LABELS.sectionLegal} className="mt-8" />
        <ListCard>
          <ListRow
            label={LEGAL_DOCUMENTS.terms.title}
            value={LEGAL_DOCUMENTS.terms.version}
            chevron
            onPress={() =>
              navigation.navigate('LegalDocument', {document: 'terms', origin: 'settings'})
            }
          />
          <ListDivider />
          <ListRow
            label={LEGAL_DOCUMENTS.privacy.title}
            value={LEGAL_DOCUMENTS.privacy.version}
            chevron
            onPress={() =>
              navigation.navigate('LegalDocument', {document: 'privacy', origin: 'settings'})
            }
          />
        </ListCard>

        <SectionHeader title={LABELS.sectionApp} className="mt-8" />
        <ListCard>
          <ListRow label={LABELS.appVersion} value={APP_VERSION} />
        </ListCard>

        <View className="mt-8">
          <ListCard>
            {/* 로그아웃은 danger 가 아니다 — 되돌릴 수 있는 행동이다 (§8.3) */}
            <ListRow
              label={LABELS.logout}
              onPress={loggingOut ? undefined : confirmLogout}
              valueSlot={
                loggingOut ? <Text className="text-caption text-ink-muted">…</Text> : undefined
              }
              testID="settings-logout"
            />
          </ListCard>
        </View>

        <View className="mt-3">
          {/* 계정 삭제는 별도 카드로 분리한다. 다른 항목과 같은 카드에 넣지 않는다 (§8.3) */}
          <ListCard>
            <ListRow
              label={LABELS.deleteAccount}
              tone="danger"
              chevron
              accessibilityHint={LABELS.a11yDeleteHint}
              onPress={() => navigation.navigate('AccountDelete', {origin: 'settings'})}
              testID="settings-delete-account"
            />
          </ListCard>
        </View>

        <Text className="mt-3 text-caption text-ink-muted">{LABELS.deleteAccountNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 계정 카드의 값 자리 — 로딩(스켈레톤) / 정상 / 오류 세 상태 (§8.5). */
function AccountValue({query}: {query: ReturnType<typeof useQuery<{email: string}>>}) {
  if (query.isPending) {
    return <View className="h-4 w-[140px] rounded-[4px] bg-border" accessibilityLabel={LABELS.loading} />;
  }
  if (query.isError) {
    return (
      <View className="flex-row items-center">
        <Text className="text-body-sm text-ink-muted">{LABELS.loadFailed}</Text>
        <View className="ml-3">
          <TextButton label={LABELS.retry} onPress={() => query.refetch()} />
        </View>
      </View>
    );
  }
  return <Text className="text-body-sm text-ink-muted">{query.data?.email}</Text>;
}

function SectionHeader({title, className}: {title: string; className?: string}) {
  return (
    <Text className={`mb-2 text-caption text-ink-muted ${className ?? ''}`}>{title}</Text>
  );
}
