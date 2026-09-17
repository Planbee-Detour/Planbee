/**
 * 설정 화면의 `관리자` 섹션 (design.md §4 — `Screen 17a` · `17b`). 충족 AC: AC-1 · AC-2 · AC-32
 *
 * <b>하단 탭바를 건드리지 않는다</b> (결정 1). 진입점은 마이 탭 → 설정 화면의 이 섹션 하나뿐이고
 * 위치는 `계정` 다음 · `약관·정책` 앞이다.
 *
 * <b>배선</b> (M-2): `SettingsScreen` 은 `features/auth/` 소유라 이 파일을 직접 import 하지
 * 않는다. 설정 화면은 "관리자 섹션 슬롯" 을 prop 으로 받고 `app/navigation/MainNavigator.tsx`
 * 가 그 자리에 이 컴포넌트를 넣는다 (design.md §4.7).
 *
 * <b>건수는 서버가 준 값 그대로다</b> (AC-32 / M-18). 앱이 목록 길이를 세지 않는다 —
 * 목록은 20건씩 끊어 오므로 세면 25건일 때 20이 표시된다.
 */
import React from 'react';
import {Text, View} from 'react-native';

import type {components} from '../../../shared/api/schema';
import {ListCard, ListRow} from '../../../shared/ui/ListRow';
import {ENTRY} from '../messages';

type UserSummary = components['schemas']['UserSummary'];

type Props = {
  /**
   * `GET /api/v1/auth/me` 의 결과. <b>조회 중이거나 실패했으면 `undefined`</b> 다.
   *
   * 그 두 경우에 섹션을 아예 렌더하지 않는 이유는 AC-2 다 (design.md §4.3) —
   * 스켈레톤을 그리면 `USER` 에게도 관리자 섹션이 한 프레임 보인다. "표시되지 않는다" 를
   * 요구하는 AC 에서는 깜빡임도 위반이다. `ADMIN` 에게는 조금 늦게 나타날 뿐이다.
   */
  account: UserSummary | undefined;
  onPress: () => void;
};

export function AdminSettingsSection({account, onPress}: Props) {
  if (account?.role !== 'ADMIN') {
    return null;
  }

  // `USER` 에게는 서버가 `null` 을 내린다 (계약). `ADMIN` 이어도 값이 오지 않으면 건수를 지어내지 않는다.
  const pending = account.pending_approval_count;
  const hasPending = typeof pending === 'number' && pending > 0;

  return (
    <View className="mt-8">
      <Text className="mb-2 text-caption text-ink-muted">{ENTRY.section}</Text>
      <ListCard>
        <ListRow
          label={ENTRY.row}
          // 0건이면 값 자리를 비우고 셰브런만 남긴다 — "0건" 을 쓰지 않는다 (design.md §4.4).
          // 행은 그대로 눌러서 들어갈 수 있다 (AC-6 의 빈 상태를 보러 갈 수 있어야 한다).
          value={hasPending ? ENTRY.count(pending) : undefined}
          valueLabel={hasPending ? ENTRY.countLabel(pending) : ENTRY.countLabelEmpty}
          chevron
          onPress={onPress}
          testID="settings-admin-approval"
        />
      </ListCard>
    </View>
  );
}
