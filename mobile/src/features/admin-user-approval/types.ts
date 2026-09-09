/**
 * `admin-user-approval` 이 다루는 타입.
 *
 * <b>API 경계 타입은 생성물(`shared/api/schema.ts`)에서 가져온다</b> (M-8 / M-17).
 * 손으로 다시 정의하지 않는다 — 계약과 어긋나는 순간 조용히 깨진다.
 * 필드 이름은 서버가 준 `snake_case` 를 그대로 쓴다.
 */
import type {components} from '../../shared/api/schema';

export type PendingUserItem = components['schemas']['PendingUserItem'];
export type ProcessedUserItem = components['schemas']['ProcessedUserItem'];
export type PendingUserPage = components['schemas']['PendingUserPage'];
export type ProcessedUserPage = components['schemas']['ProcessedUserPage'];
export type ProcessedUserActionResult = components['schemas']['ProcessedUserActionResult'];
export type PendingUserActionResult = components['schemas']['PendingUserActionResult'];

/** 목록 화면의 세그먼트 (design.md §5.2). 서버와 무관한 UI 상태다 (M-4). */
export type ApprovalSegment = 'pending' | 'processed';

/**
 * 열려 있는 상세 시트. 목록 응답의 항목을 그대로 들고 있다 —
 * 시트를 열 때 추가 조회를 하지 않는다 (C-8 / design.md §6.9).
 */
export type OpenSheet =
  | {kind: 'pending'; item: PendingUserItem}
  | {kind: 'processed'; item: ProcessedUserItem};
