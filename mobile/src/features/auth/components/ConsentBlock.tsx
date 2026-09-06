/**
 * 가입 화면의 동의 블록 (design.md §5.4 / AC-6 · AC-7 · AC-8 · AC-33).
 *
 * 화면의 체크박스는 4개지만 <b>저장되는 형태는 두 종류로 갈린다</b>:
 * 동의 3종(`TERMS`·`PRIVACY`·`MARKETING`)은 동의 이력으로, 만 14세는 자기 확인으로 간다.
 * 사용자에게는 이 구분이 보이지 않아야 하므로 여기서는 그냥 체크박스 4개다 —
 * 갈리는 지점은 요청을 만드는 `SignUpScreen` 이다.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

import {RequirementBadge} from '../../../shared/ui/Badge';
import {Checkbox} from '../../../shared/ui/Checkbox';
import {LEGAL_DOCUMENTS, type LegalDocumentKey} from '../legal/documents.generated';
import {LABELS} from '../messages';

export type ConsentState = {
  terms: boolean;
  privacy: boolean;
  age: boolean;
  marketing: boolean;
};

export const EMPTY_CONSENTS: ConsentState = {
  terms: false,
  privacy: false,
  age: false,
  marketing: false,
};

/** 필수 3건이 모두 체크되었는가 (AC-6). 선택 동의와 가입 사유는 조건이 아니다 (AC-7). */
export function hasRequiredConsents(consents: ConsentState): boolean {
  return consents.terms && consents.privacy && consents.age;
}

type Props = {
  value: ConsentState;
  onChange: (next: ConsentState) => void;
  onViewDocument: (document: LegalDocumentKey) => void;
  disabled?: boolean;
};

export function ConsentBlock({value, onChange, onViewDocument, disabled = false}: Props) {
  const allChecked = value.terms && value.privacy && value.age && value.marketing;

  const toggleAll = () => {
    const next = !allChecked;
    onChange({terms: next, privacy: next, age: next, marketing: next});
  };

  const toggle = (key: keyof ConsentState) => () =>
    onChange({...value, [key]: !value[key]});

  return (
    <View>
      {/* 전체 동의 — 개별을 하나라도 해제하면 자동으로 풀린다 (파생값이라 별도 상태를 두지 않는다, M-5) */}
      <Checkbox
        checked={allChecked}
        onToggle={toggleAll}
        disabled={disabled}
        label={LABELS.consentAll}
        description={LABELS.consentAllDetail}
        testID="consent-all"
      />
      <View className="h-[1px] bg-border" />

      <ConsentRow
        checked={value.terms}
        onToggle={toggle('terms')}
        disabled={disabled}
        required
        label={LABELS.consentTerms}
        suffix={LEGAL_DOCUMENTS.terms.version}
        onView={() => onViewDocument('terms')}
        testID="consent-terms"
      />
      <ConsentRow
        checked={value.privacy}
        onToggle={toggle('privacy')}
        disabled={disabled}
        required
        label={LABELS.consentPrivacy}
        suffix={LEGAL_DOCUMENTS.privacy.version}
        onView={() => onViewDocument('privacy')}
        testID="consent-privacy"
      />
      <ConsentRow
        checked={value.age}
        onToggle={toggle('age')}
        disabled={disabled}
        required
        label={LABELS.consentAge}
        description={LABELS.consentAgeDetail}
        testID="consent-age"
      />

      {/* 필수 그룹과 선택 항목 사이 추가 여백 — 구분이 한눈에 보여야 한다 (§5.4) */}
      <View className="mt-2">
        <ConsentRow
          checked={value.marketing}
          onToggle={toggle('marketing')}
          disabled={disabled}
          required={false}
          label={LABELS.consentMarketing}
          // "보기" 가 없는 이유: 마케팅·알림 수신에 대응하는 문서가 아직 저장소에 없다 (§5.4).
          description={LABELS.consentMarketingDetail}
          testID="consent-marketing"
        />
      </View>

      <Text className="mt-3 text-caption text-ink-muted">{LABELS.consentFooter}</Text>
    </View>
  );
}

function ConsentRow({
  checked,
  onToggle,
  disabled,
  required,
  label,
  suffix,
  description,
  onView,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
  required: boolean;
  label: string;
  suffix?: string;
  description?: string;
  onView?: () => void;
  testID: string;
}) {
  return (
    <View className="flex-row items-center">
      <Checkbox
        checked={checked}
        onToggle={onToggle}
        disabled={disabled}
        label={label}
        suffix={suffix}
        description={description}
        badge={<RequirementBadge required={required} />}
        testID={testID}
      />
      {onView ? (
        // "보기" 탭은 체크 상태를 바꾸지 않는다 — 터치 영역을 체크박스와 분리해 둔다 (§5.4).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 보기`}
          onPress={onView}
          disabled={disabled}
          hitSlop={8}
          className="ml-2 min-h-[44px] min-w-[44px] flex-row items-center justify-end"
          testID={`${testID}-view`}>
          <Text className="text-body-sm text-ink-muted">{LABELS.consentView}</Text>
          <Text className="ml-1 text-body-sm text-ink-muted">›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
