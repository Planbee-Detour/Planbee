/**
 * 시트 안 오류 배너 (design.md §6.7 · §6.8 · §7.6).
 *
 * <b>처리 실패를 토스트로 하지 않는다</b> (§3.2) — 토스트는 2초 뒤 사라져서 관리자가 방금 누른
 * 버튼이 왜 무효였는지 되짚을 수단이 없어진다. 시트 안에 남기면 그 항목의 이메일·시각과 함께 읽는다.
 *
 * "아직 처리되지 않았어요" 를 반드시 붙인다 (§6.7) — 실패한 건지 성공했는데 응답만 못 받은 건지
 * 모르는 상태가 가장 나쁘다.
 */
import React from 'react';

import {Banner} from '../../../shared/ui/Banner';
import {ACTION_ERROR, COMMON, USER_SHEET} from '../messages';
import type {ActionErrorKind} from './actionError';

const CONTENT: Record<
  Exclude<ActionErrorKind, 'forbidden'>,
  {title: string; body: string; tone: 'neutral' | 'danger'}
> = {
  network: {...ACTION_ERROR.network, tone: 'neutral'},
  server: {...ACTION_ERROR.server, tone: 'danger'},
  conflict: {...ACTION_ERROR.conflict, tone: 'danger'},
  selfSuspend: {title: USER_SHEET.selfErrorTitle, body: USER_SHEET.selfErrorBody, tone: 'danger'},
};

export function ActionErrorBanner({
  kind,
  onRetry,
}: {
  kind: Exclude<ActionErrorKind, 'forbidden'>;
  /** 재시도가 의미 있는 경우에만 준다 — 경합·자기 자신에는 붙이지 않는다 (§6.8 · §7.6) */
  onRetry?: () => void;
}) {
  const content = CONTENT[kind];

  return (
    <Banner
      title={content.title}
      detail={content.body}
      tone={content.tone}
      action={onRetry ? {label: COMMON.retry, onPress: onRetry} : undefined}
      testID="admin-action-error"
    />
  );
}
