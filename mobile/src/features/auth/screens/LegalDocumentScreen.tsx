/**
 * 약관 전문 뷰어 (design.md §6). 충족 AC: AC-33 · AC-34 · AC-35 · AC-36 · AC-37
 *
 * <b>네트워크를 타지 않는다.</b> 본문은 빌드에 포함된 자산이다 (AC-37).
 * 그래서 이 화면에는 로딩 스피너도, 재시도 버튼도, 오프라인 배너도 없다 —
 * 비행기 모드에서 열어도 정상 화면과 완전히 같다.
 */
import React, {useState} from 'react';
import {ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {VersionChip} from '../../../shared/ui/Badge';
import {Button} from '../../../shared/ui/Button';
import {NavBar} from '../../../shared/ui/NavBar';
import type {AuthRouteParams} from '../navigation';
import {LegalMarkdown} from '../components/LegalMarkdown';
import {LEGAL_DOCUMENTS} from '../legal/documents.generated';
import {LABELS, MESSAGES} from '../messages';

type Navigation = NativeStackNavigationProp<AuthRouteParams, 'LegalDocument'>;
type Route = RouteProp<AuthRouteParams, 'LegalDocument'>;

/**
 * AC-34 가 요구하는 네 가지. 긴 본문에 흩어져 있으면 "표시되었다" 고 보기 어려워
 * 본문 위에 요약 카드로 둔다 (§6.5). 내용은 처리방침에서 그대로 가져온 것이고 새로 쓴 문장이 아니다.
 */
const PRIVACY_SUMMARY = [
  {
    title: '수집 항목',
    body: '이메일 주소, 비밀번호(암호화 저장), 가입 사유, 동의 이력, 접속 일시, 로그인 실패 횟수',
  },
  {title: '이용 목적', body: '회원 식별과 인증, 가입 승인 심사, 서비스 제공, 부정 이용 방지'},
  {title: '보유 기간', body: '회원 탈퇴 시 지체 없이 파기합니다. 별도의 유예 기간을 두지 않습니다.'},
  {
    title: '동의를 거부할 권리와 불이익',
    body: '동의를 거부할 수 있습니다. 다만 필수 항목에 동의하지 않으면 회원 가입과 서비스 이용이 불가능합니다. 선택 항목은 거부해도 이용에 제한이 없습니다.',
  },
] as const;

export function LegalDocumentScreen() {
  const navigation = useNavigation<Navigation>();
  const {document: documentKey, origin} = useRoute<Route>().params;
  const [scrolled, setScrolled] = useState(false);

  const document = LEGAL_DOCUMENTS[documentKey];

  // 오류 — 번들 자산을 읽지 못한 경우(빌드 사고). 재시도 버튼을 두지 않는다: 다시 눌러도 같은 결과다 (§6.8).
  if (!document) {
    return <AssetError onClose={() => navigation.goBack()} />;
  }

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setScrolled(event.nativeEvent.contentOffset.y > 0);

  /** `{{시행일}}` 이 아직 비어 있는 동안에는 "시행일 준비 중" 으로 표시한다 (§6.4). */
  const effectiveDate = document.effectiveDate;
  const effectiveDateLabel =
    !effectiveDate || effectiveDate.includes('{{')
      ? LABELS.legalEffectiveDatePending
      : LABELS.legalEffectiveDate(effectiveDate);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar
        title={document.title}
        left={{label: '✕', accessibilityLabel: LABELS.close, onPress: () => navigation.goBack()}}
        showDivider={scrolled}
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="px-5 pb-10">
        <Text accessibilityRole="header" className="mt-5 text-h1 text-ink">
          {document.title}
        </Text>

        <View
          accessible
          accessibilityLabel={`버전 ${document.version.replace(/^v/, '')}, ${effectiveDateLabel}`}
          className="mt-2 flex-row items-center">
          <VersionChip version={document.version} />
          <Text className="ml-2 text-caption text-ink-muted">{effectiveDateLabel}</Text>
        </View>

        {documentKey === 'privacy' ? (
          <View className="mt-5">
            <Text className="text-title text-ink">{LABELS.legalSummaryTitle}</Text>
            <View className="mt-3 rounded-card border border-border bg-cream p-4">
              {PRIVACY_SUMMARY.map((row, index) => (
                <View key={row.title} className={index === 0 ? '' : 'mt-4'}>
                  <Text className="text-title text-ink">{row.title}</Text>
                  <Text className="mt-1 text-body-sm text-ink-body">{row.body}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-2 text-caption text-ink-muted">{LABELS.legalSummaryFooter}</Text>
          </View>
        ) : null}

        <View className="my-5 h-[1px] bg-border" />

        <LegalMarkdown source={document.body} />

        <Text className="mt-10 text-center text-caption text-ink-muted">
          {LABELS.legalOfflineNote}
        </Text>
      </ScrollView>

      {/* 하단 액션 바 — 가입 화면에서 진입한 경우에만 (§6.7) */}
      {origin === 'signup' ? (
        <View className="border-t border-border bg-surface px-5 py-3">
          <Button
            label={LABELS.legalAgreeAndClose}
            onPress={() => navigation.navigate('SignUp', {agreedDocument: documentKey})}
            testID="legal-agree-close"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function AssetError({onClose}: {onClose: () => void}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar title="" left={{label: '✕', accessibilityLabel: LABELS.close, onPress: onClose}} />
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-h2 text-danger">⚠</Text>
        <Text accessibilityRole="header" className="mt-4 text-center text-title text-ink">
          {MESSAGES.legal.assetErrorTitle}
        </Text>
        <Text className="mt-2 text-center text-body-sm text-ink-muted">
          {MESSAGES.legal.assetErrorDetail}
        </Text>
        <View className="mt-8 w-full">
          <Button label={LABELS.close} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </SafeAreaView>
  );
}
