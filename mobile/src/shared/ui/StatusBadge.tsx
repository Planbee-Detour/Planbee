/**
 * `Badge/Status` (planbee.pen Design System — `Section — Admin List & Sheet`).
 *
 * 계정 상태 배지 4종 (`admin-user-approval` design.md §3.4).
 *
 * <b>라벨 문자열은 서버가 내린다</b> (C-8 / M-18). 앱은 상태 코드로 한국어를 고르지 않고
 * <b>톤(색·테두리)만</b> 정한다. 그래서 `label` 을 prop 으로 받는다.
 *
 * 연한 배경색(`success` 의 10% 틴트 같은 것)을 만들지 않는다 — 테두리 + 텍스트로 표현해
 * <b>신규 색 토큰이 0개</b>가 되게 한다 (design.md §3.4 · §8.4).
 */
import React from 'react';
import {Text, View} from 'react-native';

export type AccountStatusTone = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

const CONTAINER: Record<AccountStatusTone, string> = {
  PENDING: 'bg-brand-light',
  APPROVED: 'bg-surface border border-success',
  SUSPENDED: 'bg-surface border border-danger',
  REJECTED: 'bg-surface border border-border',
};

const LABEL: Record<AccountStatusTone, string> = {
  PENDING: 'text-brand-dark',
  APPROVED: 'text-success',
  SUSPENDED: 'text-danger',
  REJECTED: 'text-ink-muted',
};

export function StatusBadge({status, label}: {status: AccountStatusTone; label: string}) {
  return (
    <View
      // 색만으로 구분하지 않는다 — 배지는 항상 라벨 텍스트를 동반한다 (design.md §3.4)
      // pen `ZcirU`: 라운드 `$Radius/Chip` / 패딩 [3, 10] / 라벨 Caption 600
      className={`min-h-[20px] justify-center rounded-chip px-[10px] py-[3px] ${CONTAINER[status]}`}>
      <Text className={`text-caption font-semibold ${LABEL[status]}`}>{label}</Text>
    </View>
  );
}
