/**
 * 처리 실패의 화면 분기 (design.md §6.7 · §6.8 · §7.6).
 *
 * <b>분기는 `code` 로만 한다</b> (M-13 / C-1). HTTP 상태나 문구로 갈라 쓰지 않고,
 * 어떤 엔드포인트를 불렀는지로도 갈라 쓰지 않는다 — 그러면 분기 근거가 `code` 밖으로 나간다.
 *
 * 카탈로그에 없는 코드와 `NOT_FOUND` 는 <b>일반 오류</b>(`server`)로 떨어진다.
 * `NOT_FOUND`(처리 도중 대상 계정이 삭제된 경우)의 전용 화면은 design.md 에 아직 없다 —
 * 계약이 그 사실을 명시했고(`responses.AdminUserNotFound`), 보강 전까지 M-13 의 일반 오류로 둔다.
 * 여기서 화면을 지어내지 않는다 (`status.md` 문서 보강 요청 D-1).
 */
import {ApiError, NETWORK_ERROR_CODE} from '../../../shared/api/problem';
import {ADMIN_ERROR, REJECTION_REASON_FIELD} from '../api/endpoints';

export type ActionErrorKind =
  /** 연결 실패 — "아직 처리되지 않았어요. 연결 후 다시 시도해 주세요." + 다시 시도 (§6.7) */
  | 'network'
  /** 서버·그 밖의 오류 — "아직 처리되지 않았어요." + 다시 시도 (§6.7) */
  | 'server'
  /** 이미 처리된 신청 (AC-12) — 액션 버튼을 없애고 "닫기" 만 남긴다 (§6.8) */
  | 'conflict'
  /** 자기 자신 정지 시도 (AC-25) — 배너 + "닫기" (§7.6) */
  | 'selfSuspend'
  /** 관리자 권한 없음 (AC-3) — 시트를 닫고 화면이 권한 없음 상태가 된다 (§5.10) */
  | 'forbidden';

export function actionErrorKindOf(error: unknown): ActionErrorKind {
  if (!(error instanceof ApiError)) {
    return 'server';
  }
  switch (error.code) {
    case ADMIN_ERROR.alreadyProcessed:
      return 'conflict';
    case ADMIN_ERROR.selfSuspendForbidden:
      return 'selfSuspend';
    case ADMIN_ERROR.forbidden:
      return 'forbidden';
    case NETWORK_ERROR_CODE:
      return 'network';
    default:
      return 'server';
  }
}

/**
 * 거절 사유 필드 오류 (AC-16). 400 `VALIDATION_FAILED` 의 `errors[]` 를 필드 오류로 매핑한다 (M-13).
 *
 * 앱이 `maxLength=200` 으로 201번째 글자를 막으므로 정상 경로에서는 나오지 않지만,
 * 서버가 같은 제약을 독립적으로 강제하므로 응답을 받을 수 있다.
 */
export function rejectionReasonErrorOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.messageForField(REJECTION_REASON_FIELD) : undefined;
}
