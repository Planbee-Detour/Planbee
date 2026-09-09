/**
 * 신청 상세 시트 (design.md §6 — `Screen 20a`~`20e`).
 * 충족 AC: AC-10 · AC-12 · AC-14 · AC-15 · AC-16 · AC-17 · AC-33 · AC-34
 *
 * 검토 대기 목록의 행을 탭하면 올라온다. <b>모든 조작이 여기 있다</b> (결정 3) —
 * 목록 행에는 승인·거절 버튼을 두지 않는다.
 *
 * 시트를 열 때 추가 조회를 하지 않는다 (C-8 / §6.9) — 목록 응답의 항목이 이 화면 전체다.
 */
import React, {useCallback, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';

import {useAccessibilityFocus} from '../../../shared/lib/a11y';
import {RequirementBadge} from '../../../shared/ui/Badge';
import {BottomSheet} from '../../../shared/ui/BottomSheet';
import {Button} from '../../../shared/ui/Button';
import {TextField} from '../../../shared/ui/TextField';
import {useApprovalActions} from '../hooks/useUserApproval';
import {formatDateTime} from '../format';
import {COMMON, REJECTION_REASON_MAX, REQUEST_SHEET} from '../messages';
import type {PendingUserItem} from '../types';
import {actionErrorKindOf, rejectionReasonErrorOf, type ActionErrorKind} from './actionError';
import {ActionErrorBanner} from './ActionErrorBanner';
import {SheetInfoBlock, SheetInfoRow} from './SheetInfoBlock';

type Props = {
  item: PendingUserItem;
  /** 스크림 탭 · 아래로 스와이프 · "닫기" (design.md §6.1) */
  onClose: () => void;
  /** 성공. 화면이 시트를 닫고 토스트를 띄운다 (§6.6) */
  onCompleted: (toastMessage: string) => void;
  /** 403 `ADMIN_FORBIDDEN`. 화면이 권한 없음 상태로 바뀐다 (§5.10 / AC-3) */
  onForbidden: () => void;
};

/** 시트 안의 단계 (§6.3 · §6.4). 새 시트를 겹쳐 띄우지 않고 같은 시트 안에서 교체한다. */
type Step = 'detail' | 'reject';

export function PendingUserSheet({item, onClose, onCompleted, onForbidden}: Props) {
  const {approve, refreshLists, reject} = useApprovalActions();
  const [step, setStep] = useState<Step>('detail');
  const [rejectionReason, setRejectionReason] = useState('');
  // `forbidden` 은 이 상태에 들어오지 않는다 — run() 이 이른 반환으로 화면(§5.10)에 넘긴다.
  // 타입에서 빼 두면 배너에 넘길 때 단언이 필요 없다 (M-9).
  const [errorKind, setErrorKind] = useState<Exclude<ActionErrorKind, 'forbidden'> | null>(null);
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  /** AC-12 — 배너를 띄우고 승인·거절 버튼을 제거한다 (§6.8) */
  const [conflict, setConflict] = useState(false);

  const processing = approve.isPending || reject.isPending;

  // 시트가 열리면 제목으로, 단계가 바뀌면 그 단계의 제목으로 포커스를 옮긴다 (§3.5).
  // 입력란으로 바로 보내지 않는다 — 사유는 선택 입력이라 무엇을 확인하는 단계인지 먼저 들어야 한다.
  const detailTitleRef = useAccessibilityFocus<React.ComponentRef<typeof Text>>(step === 'detail');
  const rejectTitleRef = useAccessibilityFocus<React.ComponentRef<typeof Text>>(step === 'reject');

  /** 관리자가 무엇이든 조작하기 시작하면 배너를 지운다 (§6.7). */
  const clearError = useCallback(() => {
    setErrorKind(null);
    setReasonError(undefined);
  }, []);

  const run = useCallback(
    async (action: 'approve' | 'reject') => {
      clearError();
      try {
        if (action === 'approve') {
          await approve.mutateAsync(item.user_id);
          onCompleted(REQUEST_SHEET.toastApproved);
          return;
        }
        await reject.mutateAsync({userId: item.user_id, rejectionReason});
        onCompleted(REQUEST_SHEET.toastRejected);
      } catch (error) {
        const kind = actionErrorKindOf(error);
        if (kind === 'forbidden') {
          onForbidden();
          return;
        }
        const fieldMessage = rejectionReasonErrorOf(error);
        if (fieldMessage) {
          setReasonError(fieldMessage);
          return;
        }
        if (kind === 'conflict') {
          // 배너가 뜨는 즉시 목록을 다시 불러온다 — "닫기" 를 누르는 시점에는 갱신이 끝나 있다 (§6.8)
          setConflict(true);
          refreshLists();
          return;
        }
        setErrorKind(kind);
      }
    },
    [approve, clearError, item.user_id, onCompleted, onForbidden, refreshLists, reject, rejectionReason],
  );

  /** 경합이 다른 오류보다 앞선다 — 액션이 사라지는 상태이기 때문이다 (§6.8) */
  const bannerKind: Exclude<ActionErrorKind, 'forbidden'> | null = conflict ? 'conflict' : errorKind;

  const banner = bannerKind ? (
    <View className="mt-5">
      <ActionErrorBanner
        kind={bannerKind}
        // "다시 시도" 는 직전과 같은 요청을 다시 보낸다. 거절이면 입력한 사유를 그대로 싣는다 (§6.7)
        onRetry={conflict ? undefined : () => run(step === 'reject' ? 'reject' : 'approve')}
      />
    </View>
  ) : null;

  /**
   * 경합 뒤의 액션 영역 (§6.8 / AC-12).
   *
   * <b>단계와 무관하게</b> "닫기" 하나가 된다 — 승인·거절도, 거절 단계의 "거절하기"·"뒤로" 도
   * 남겨 두면 다시 눌러 같은 409 를 받는다. 409 는 승인보다 거절에서 더 자주 나온다.
   * 정보 블록·대상 이메일은 남긴다 — 어떤 신청이었는지 확인할 수 있어야 한다.
   */
  const closeAction = (
    <View className="mt-6">
      <Button
        label={COMMON.close}
        onPress={onClose}
        variant="secondary"
        testID="admin-conflict-close"
      />
    </View>
  );

  return (
    <BottomSheet
      visible
      // 처리 중에는 닫을 수 없다 (§6.5) — 되돌릴 수 없는 처리 중에 떠나면 결과를 알 수 없다
      dismissible={!processing}
      onClose={onClose}
      // 안드로이드 백: 거절 단계에서는 기본 단계로 되돌린다 (§2.4). 입력한 사유는 유지한다
      onHardwareBack={step === 'reject' ? () => setStep('detail') : onClose}
      avoidKeyboard={step === 'reject'}
      accessibilityLabel={step === 'reject' ? REQUEST_SHEET.confirmTitle : REQUEST_SHEET.title}
      testID="admin-pending-sheet">
      <ScrollView keyboardShouldPersistTaps="handled">
        {step === 'detail' ? (
          <View className="pt-4">
            <Text accessibilityRole="header" ref={detailTitleRef} className="text-h2 font-bold text-ink">
              {REQUEST_SHEET.title}
            </Text>

            {banner}

            <View className="mt-5" />
            {/* 정보 블록은 경합 배너가 떠도 그대로 둔다 — 어떤 신청이었는지 확인할 수 있어야 한다 (§6.8) */}
            <SheetInfoBlock>
              <SheetInfoRow first label={REQUEST_SHEET.fieldEmail} selectable value={item.email} />
              {/* 가입 사유는 서버가 완성해 내린 문자열을 그대로 렌더한다. 시트에서는 말줄임하지 않는다 (AC-33 / §6.3) */}
              <SheetInfoRow label={REQUEST_SHEET.fieldReason} value={item.signup_reason_text} />
              <SheetInfoRow
                label={REQUEST_SHEET.fieldRequestedAt}
                value={formatDateTime(item.requested_at)}
              />
            </SheetInfoBlock>

            {conflict ? (
              closeAction
            ) : (
              <View className="mt-6">
                {/* 승인이 위, 거절이 아래 — 위험한 쪽이 엄지 기본 위치에서 멀어야 한다 (§6.3) */}
                <Button
                  label={REQUEST_SHEET.approve}
                  loading={approve.isPending}
                  loadingLabel={REQUEST_SHEET.approving}
                  disabled={processing}
                  onPress={() => run('approve')}
                  testID="admin-approve"
                />
                <View className="mt-3">
                  {/* 거절은 `Button/Danger` 가 아니다 — 되돌릴 수 있고(AC-19) 계정 삭제와 같은 무게가 아니다 (§6.3) */}
                  <Button
                    label={REQUEST_SHEET.reject}
                    disabled={processing}
                    onPress={() => {
                      clearError();
                      setStep('reject');
                    }}
                    variant="secondary"
                    testID="admin-reject-step"
                  />
                </View>
              </View>
            )}
          </View>
        ) : (
          <View className="pt-4">
            {/* 이 단계 자체가 AC-15 의 확인 단계다. 위에 시스템 다이얼로그를 또 띄우지 않는다 (§1.2 e) */}
            <Text accessibilityRole="header" ref={rejectTitleRef} className="text-h2 font-bold text-ink">
              {REQUEST_SHEET.confirmTitle}
            </Text>
            <Text className="mt-2 text-body-sm text-ink-body">{REQUEST_SHEET.confirmBody}</Text>

            {banner}

            <View className="mt-5" />
            {/* 대상 확인 블록 — 이메일만 다시 보여준다 (§6.4) */}
            <View className="rounded-[12px] bg-background p-3">
              <Text className="text-body text-ink">{item.email}</Text>
            </View>

            <View className="mt-5">
              <TextField
                label={REQUEST_SHEET.reasonLabel}
                labelBadge={<RequirementBadge required={false} />}
                placeholder={REQUEST_SHEET.reasonPlaceholder}
                helpText={REQUEST_SHEET.reasonHelp}
                errorMessage={reasonError}
                counter={{current: rejectionReason.length, max: REJECTION_REASON_MAX}}
                // 200자에서 201번째 글자를 막는다. 오류 문구를 띄우지 않는다 — 차단 자체가 피드백이다 (AC-16)
                maxLength={REJECTION_REASON_MAX}
                multiline
                numberOfLines={3}
                editable={!processing}
                onChangeText={value => {
                  clearError();
                  setRejectionReason(value);
                }}
                value={rejectionReason}
                textAlignVertical="top"
                testID="admin-rejection-reason"
              />
            </View>

            {conflict ? (
              closeAction
            ) : (
              <View className="mt-6">
                {/* 사유가 비어 있어도 활성이다 — 선택 입력이므로 버튼 활성 조건이 아니다 (AC-17) */}
                <Button
                  label={REQUEST_SHEET.rejectConfirm}
                  loading={reject.isPending}
                  loadingLabel={REQUEST_SHEET.rejecting}
                  disabled={processing}
                  onPress={() => run('reject')}
                  variant="danger"
                  testID="admin-reject-confirm"
                />
                <View className="mt-3">
                  {/* 뒤로: 기본 단계로 돌아간다. 입력한 사유는 유지한다 (§6.4) */}
                  <Button
                    label={REQUEST_SHEET.back}
                    disabled={processing}
                    onPress={() => setStep('detail')}
                    variant="secondary"
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
