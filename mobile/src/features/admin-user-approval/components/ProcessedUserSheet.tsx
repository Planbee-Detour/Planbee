/**
 * 사용자 상세 시트 (design.md §7 — `Screen 21a`~`21d`).
 * 충족 AC: AC-19 · AC-20 · AC-21 · AC-24 · AC-25
 *
 * `처리 완료` 목록의 행을 탭하면 올라온다. 담기는 상태는 `APPROVED` · `SUSPENDED` · `REJECTED`
 * 셋 전부이고 액션은 §7.2 의 결정표대로 갈린다.
 *
 * <b>처리자·처리 시각·거절 사유를 그리지 않는다</b> (§7.1.1 · §7.1.2 / 2026-09-07 Q2).
 * 계약도 그 필드를 내리지 않는다.
 */
import React, {useCallback, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';

import {useAccessibilityFocus} from '../../../shared/lib/a11y';
import {BottomSheet} from '../../../shared/ui/BottomSheet';
import {Button} from '../../../shared/ui/Button';
import {StatusBadge} from '../../../shared/ui/StatusBadge';
import {useApprovalActions} from '../hooks/useUserApproval';
import {formatDateTime} from '../format';
import {COMMON, USER_SHEET} from '../messages';
import type {ProcessedUserItem} from '../types';
import {actionErrorKindOf, type ActionErrorKind} from './actionError';
import {ActionErrorBanner} from './ActionErrorBanner';
import {SheetInfoBlock, SheetInfoRow} from './SheetInfoBlock';

type Props = {
  item: ProcessedUserItem;
  onClose: () => void;
  onCompleted: (toastMessage: string) => void;
  onForbidden: () => void;
};

type Action = 'suspend' | 'cancelSuspend' | 'cancelReject';

export function ProcessedUserSheet({item, onClose, onCompleted, onForbidden}: Props) {
  const {cancelReject, cancelSuspend, refreshLists, suspend} = useApprovalActions();
  // `forbidden` 은 이 상태에 들어오지 않는다 — run() 이 이른 반환으로 화면(§5.10)에 넘긴다.
  // 타입에서 빼 두면 배너에 넘길 때 단언이 필요 없다 (M-9).
  const [errorKind, setErrorKind] = useState<Exclude<ActionErrorKind, 'forbidden'> | null>(null);
  const [conflict, setConflict] = useState(false);
  const titleRef = useAccessibilityFocus<React.ComponentRef<typeof Text>>(true);

  const processing = suspend.isPending || cancelSuspend.isPending || cancelReject.isPending;

  const run = useCallback(
    async (action: Action) => {
      setErrorKind(null);
      try {
        if (action === 'suspend') {
          await suspend.mutateAsync(item.user_id);
          onCompleted(USER_SHEET.toastSuspended);
          return;
        }
        if (action === 'cancelSuspend') {
          await cancelSuspend.mutateAsync(item.user_id);
          onCompleted(USER_SHEET.toastUnsuspended);
          return;
        }
        await cancelReject.mutateAsync(item.user_id);
        onCompleted(USER_SHEET.toastRejectCanceled);
      } catch (error) {
        const kind = actionErrorKindOf(error);
        if (kind === 'forbidden') {
          onForbidden();
          return;
        }
        if (kind === 'conflict') {
          setConflict(true);
          refreshLists();
          return;
        }
        setErrorKind(kind);
      }
    },
    [cancelReject, cancelSuspend, item.user_id, onCompleted, onForbidden, refreshLists, suspend],
  );

  /**
   * 확인 다이얼로그 (§7.3 · §7.5).
   *
   * iOS 는 `style: 'cancel'` 버튼을 시스템이 왼쪽에 놓고, 안드로이드는 <b>배열 순서가 곧 배치</b>다.
   * 그래서 두 플랫폼 모두에서 취소가 왼쪽/아래에 오도록 취소를 배열 첫 자리에 둔다
   * (design.md §6.2 / M-20). `destructive` 는 iOS 에서만 표현되고 안드로이드에서는 무시된다.
   */
  const confirm = useCallback(
    (title: string, body: string, confirmLabel: string, destructive: boolean, action: Action) => {
      Alert.alert(title, body, [
        {text: USER_SHEET.cancel, style: 'cancel'},
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => {
            run(action);
          },
        },
      ]);
    },
    [run],
  );

  /** 경합이 다른 오류보다 앞선다 — 액션이 사라지는 상태이기 때문이다 (§6.8) */
  const bannerKind: Exclude<ActionErrorKind, 'forbidden'> | null = conflict ? 'conflict' : errorKind;

  const banner = bannerKind ? (
    <View className="mt-5">
      <ActionErrorBanner
        kind={bannerKind}
        // 경합·자기 자신 거부에는 "다시 시도" 를 붙이지 않는다 — 다시 눌러도 같은 결과다 (§6.8 · §7.6)
        onRetry={
          conflict || errorKind === 'selfSuspend' ? undefined : () => run(actionOf(item))
        }
      />
    </View>
  ) : null;

  // 경합·자기 자신 거부 뒤에는 액션 버튼을 두지 않고 "닫기" 만 남긴다 (§6.8 · §7.6)
  const blocked = conflict || errorKind === 'selfSuspend';

  return (
    <BottomSheet
      visible
      dismissible={!processing}
      onClose={onClose}
      accessibilityLabel={USER_SHEET.title}
      testID="admin-processed-sheet">
      <ScrollView>
        <View className="pt-4">
          <Text accessibilityRole="header" ref={titleRef} className="text-h2 font-bold text-ink">
            {USER_SHEET.title}
          </Text>

          {banner}

          <View className="mt-5" />
          <SheetInfoBlock>
            <SheetInfoRow first label={USER_SHEET.fieldEmail} selectable value={item.email} />
            <SheetInfoRow
              label={USER_SHEET.fieldStatus}
              // 배지 라벨은 서버 값이다. 앱은 톤만 상태로 정한다 (§3.4 / C-8)
              valueSlot={<StatusBadge status={item.status} label={item.status_label} />}
            />
            {/* 값이 없는 항목은 행 자체를 렌더하지 않는다 — 빈 값이나 "-" 를 두지 않는다 (§7.1) */}
            {item.approved_at ? (
              <SheetInfoRow
                label={USER_SHEET.fieldApprovedAt}
                value={formatDateTime(item.approved_at)}
              />
            ) : null}
            {item.suspended_at ? (
              <SheetInfoRow
                label={USER_SHEET.fieldSuspendedAt}
                value={formatDateTime(item.suspended_at)}
              />
            ) : null}
            {item.rejected_at ? (
              <SheetInfoRow
                label={USER_SHEET.fieldRejectedAt}
                value={formatDateTime(item.rejected_at)}
              />
            ) : null}
          </SheetInfoBlock>

          <View className="mt-6">
            {blocked ? (
              <Button label={COMMON.close} onPress={onClose} variant="secondary" />
            ) : (
              <SheetAction
                item={item}
                processing={processing}
                suspending={suspend.isPending}
                unsuspending={cancelSuspend.isPending}
                cancelingReject={cancelReject.isPending}
                onConfirm={confirm}
                onRun={run}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

/** §7.2 액션 결정표. 자기 자신이면 <b>액션을 아예 렌더하지 않는다</b> (AC-25). */
function SheetAction({
  item,
  processing,
  suspending,
  unsuspending,
  cancelingReject,
  onConfirm,
  onRun,
}: {
  item: ProcessedUserItem;
  processing: boolean;
  suspending: boolean;
  unsuspending: boolean;
  cancelingReject: boolean;
  onConfirm: (
    title: string,
    body: string,
    confirmLabel: string,
    destructive: boolean,
    action: Action,
  ) => void;
  onRun: (action: Action) => void;
}) {
  if (item.is_me) {
    // 비활성 버튼을 두지 않는다 — 회색 버튼은 "언젠가 될 수도 있는 것" 으로 읽힌다 (§7.6)
    return (
      <Text className="text-center text-caption text-ink-muted">{USER_SHEET.selfNotice}</Text>
    );
  }

  if (item.status === 'APPROVED') {
    return (
      <Button
        label={USER_SHEET.suspend}
        loading={suspending}
        loadingLabel={USER_SHEET.suspending}
        disabled={processing}
        onPress={() =>
          onConfirm(
            USER_SHEET.suspendConfirmTitle,
            USER_SHEET.suspendConfirmBody,
            USER_SHEET.suspend,
            true,
            'suspend',
          )
        }
        variant="danger"
        testID="admin-suspend"
      />
    );
  }

  if (item.status === 'SUSPENDED') {
    return (
      <Button
        // 확인 다이얼로그를 두지 않는다 — 해제는 사용자에게 이익이 되는 방향이다 (§7.4)
        label={USER_SHEET.unsuspend}
        loading={unsuspending}
        loadingLabel={USER_SHEET.unsuspending}
        disabled={processing}
        onPress={() => onRun('cancelSuspend')}
        testID="admin-unsuspend"
      />
    );
  }

  return (
    <Button
      label={USER_SHEET.cancelReject}
      loading={cancelingReject}
      loadingLabel={USER_SHEET.cancelingReject}
      disabled={processing}
      onPress={() =>
        onConfirm(
          USER_SHEET.cancelRejectConfirmTitle,
          USER_SHEET.cancelRejectConfirmBody,
          USER_SHEET.cancelReject,
          // 되돌리는 행동이지 파괴적인 행동이 아니다 (§7.5)
          false,
          'cancelReject',
        )
      }
      variant="secondary"
      testID="admin-cancel-reject"
    />
  );
}

/** 그 상태에서 가능한 유일한 액션. "다시 시도" 가 직전과 같은 요청을 보내기 위한 것이다 (§6.7). */
function actionOf(item: ProcessedUserItem): Action {
  if (item.status === 'APPROVED') {
    return 'suspend';
  }
  return item.status === 'SUSPENDED' ? 'cancelSuspend' : 'cancelReject';
}
