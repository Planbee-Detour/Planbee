/**
 * 관리자 API 호출. `shared/api/client.ts` 의 `request()` 만 쓴다 — `fetch` 를 직접 부르지 않는다 (M-8).
 *
 * 계약: `docs/features/admin-user-approval/contract.yaml` (엔드포인트 6개).
 * 오류 분기는 항상 `code` 로 한다 (M-13 / C-1) — 상태 코드나 문구로 갈라 쓰지 않는다.
 */
import {apiClient, request} from '../../../shared/api/client';
import type {
  PendingUserActionResult,
  PendingUserPage,
  ProcessedUserActionResult,
  ProcessedUserPage,
} from '../types';

/** `docs/api/error-codes.md` 의 admin 코드. 분기는 이 값으로만 한다 (M-13). */
export const ADMIN_ERROR = {
  /** 403 — 역할이 `ADMIN` 이 아님 (AC-3). 화면 전체가 권한 없음 블록이 된다 (design.md §5.10) */
  forbidden: 'ADMIN_FORBIDDEN',
  /** 403 — 자기 계정을 정지하려 함 (AC-25). 시트 안 배너 (design.md §7.6) */
  selfSuspendForbidden: 'ADMIN_SELF_SUSPEND_FORBIDDEN',
  /** 409 — 다른 기기가 먼저 상태를 바꿈 (AC-12). 상태 전이 5종이 같은 코드를 쓴다 */
  alreadyProcessed: 'ADMIN_USER_ALREADY_PROCESSED',
} as const;

/** 400 `VALIDATION_FAILED` 의 `errors[].field` (AC-16). 필드 오류 표시에 매핑한다 (M-13). */
export const REJECTION_REASON_FIELD = 'rejection_reason';

/**
 * 검토 대기 목록 (AC-5 · AC-6 · AC-7).
 *
 * `page_size` 를 보내지 않는다 — 기본값 20 이 화면이 쓰는 값이다 (계약 `parameters.PageSize`).
 * `cursor` 는 <b>직전 응답의 `next_cursor` 를 그대로</b> 되돌려 보낸다. 앱은 값을 해석하지 않는다.
 */
export async function fetchPendingUsers(cursor?: string): Promise<PendingUserPage> {
  return request(() =>
    apiClient.GET('/api/v1/admin/users/pending', {params: {query: {cursor}}}),
  );
}

/** 처리 완료 목록 — `APPROVED` · `SUSPENDED` · `REJECTED` 가 섞여 온다 (AC-19 · AC-20 · AC-24). */
export async function fetchProcessedUsers(cursor?: string): Promise<ProcessedUserPage> {
  return request(() =>
    apiClient.GET('/api/v1/admin/users/processed', {params: {query: {cursor}}}),
  );
}

/** 승인 `PENDING` → `APPROVED` (AC-10). 본문이 없다. */
export async function approveUser(userId: number): Promise<ProcessedUserActionResult> {
  return request(() =>
    apiClient.POST('/api/v1/admin/users/{user_id}/approve', {
      params: {path: {user_id: userId}},
    }),
  );
}

/**
 * 거절 `PENDING` → `REJECTED` (AC-15 · AC-16 · AC-17).
 *
 * 사유는 선택 입력이다 — 비어 있으면 `null` 로 보낸다. 빈 문자열도 정상 응답이지만,
 * "쓰지 않았다" 를 값으로 표현하는 쪽이 서버 저장값에 빈 문자열을 남기지 않는다.
 */
export async function rejectUser(
  userId: number,
  rejectionReason: string,
): Promise<ProcessedUserActionResult> {
  return request(() =>
    apiClient.POST('/api/v1/admin/users/{user_id}/reject', {
      params: {path: {user_id: userId}},
      body: {rejection_reason: rejectionReason.length > 0 ? rejectionReason : null},
    }),
  );
}

/** 거절 취소 `REJECTED` → `PENDING` (AC-19). 결과가 대기 항목이라 응답 스키마가 다르다. */
export async function cancelUserRejection(userId: number): Promise<PendingUserActionResult> {
  return request(() =>
    apiClient.POST('/api/v1/admin/users/{user_id}/reject/cancel', {
      params: {path: {user_id: userId}},
    }),
  );
}

/** 이용 정지 `APPROVED` → `SUSPENDED` (AC-21). 본문이 없다 — 정지 사유를 받지 않는다. */
export async function suspendUser(userId: number): Promise<ProcessedUserActionResult> {
  return request(() =>
    apiClient.POST('/api/v1/admin/users/{user_id}/suspend', {
      params: {path: {user_id: userId}},
    }),
  );
}

/** 정지 해제 `SUSPENDED` → `APPROVED` (AC-24). */
export async function cancelUserSuspension(userId: number): Promise<ProcessedUserActionResult> {
  return request(() =>
    apiClient.POST('/api/v1/admin/users/{user_id}/suspend/cancel', {
      params: {path: {user_id: userId}},
    }),
  );
}
