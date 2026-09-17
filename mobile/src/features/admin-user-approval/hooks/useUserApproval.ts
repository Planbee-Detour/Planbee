/**
 * 관리자 목록·상태 전이의 서버 상태. <b>react-query 가 소유한다</b> (M-4) —
 * 응답을 zustand 등에 복사하지 않는다.
 *
 * 커서 페이지네이션은 `useInfiniteQuery` 가 이어붙인다 (C-8 이 허용하는 조합).
 * 대기 건수는 <b>서버가 준 `pending_approval_count` 를 그대로</b> 쓴다 — 앱이 ±1 하지 않는다
 * (M-18 / AC-32 / design.md §5.11).
 */
import {useCallback} from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {ACCOUNT_QUERY_KEY} from '../../../shared/api/queryKeys';
import {
  approveUser,
  cancelUserRejection,
  cancelUserSuspension,
  fetchPendingUsers,
  fetchProcessedUsers,
  rejectUser,
  suspendUser,
} from '../api/endpoints';
import type {PendingUserPage, ProcessedUserPage} from '../types';

export const ADMIN_QUERY_KEY = {
  pending: ['admin', 'users', 'pending'] as const,
  processed: ['admin', 'users', 'processed'] as const,
};

/**
 * 다음 페이지 커서. `has_next` 가 근거이고 `items.length` 로 추측하지 않는다 —
 * 마지막 페이지가 정확히 20건이면 그 추측이 틀린다 (계약 `PendingUserPage.has_next`).
 */
function nextCursorOf(page: PendingUserPage | ProcessedUserPage): string | undefined {
  return page.has_next ? (page.next_cursor ?? undefined) : undefined;
}

/**
 * @param enabled 지금 보고 있는 세그먼트일 때만 참. 세그먼트를 바꾸면 <b>다른 목록</b>이고
 *                한쪽의 실패가 다른 쪽을 가리지 않는다 (design.md §3.6).
 */
export function usePendingUsers(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ADMIN_QUERY_KEY.pending,
    queryFn: ({pageParam}) => fetchPendingUsers(pageParam),
    // 첫 페이지는 커서 없이 부른다. 초기값을 그냥 `undefined` 로 두면 react-query 가 `pageParam`
    // 타입을 `undefined` 로 못 박아 getNextPageParam 이 돌려주는 커서 문자열과 어긋난다.
    // 타입을 넓히는 수단이 이 단언뿐이라 남긴다 (M-9).
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursorOf,
    enabled,
  });
}

export function useProcessedUsers(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ADMIN_QUERY_KEY.processed,
    queryFn: ({pageParam}) => fetchProcessedUsers(pageParam),
    // 위 usePendingUsers 와 같은 이유의 단언이다 — 초기 커서 타입을 넓힐 다른 수단이 없다 (M-9).
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursorOf,
    enabled,
  });
}

/**
 * 새로고침이 첫 페이지부터 다시 가져오도록 이미 불러온 2·3페이지를 버린다 (design.md §5.5).
 *
 * 최신순 목록에서 앞이 바뀌면 뒤 페이지의 경계가 어긋난다 — 커서가 가리키던 자리가
 * 이미 밀려나 있기 때문이다. 그래서 재조회 전에 페이지를 하나로 자른다.
 */
export function useTrimToFirstPage() {
  const queryClient = useQueryClient();

  return useCallback(
    (queryKey: readonly unknown[]) => {
      queryClient.setQueryData<InfiniteData<PendingUserPage | ProcessedUserPage, string | undefined>>(
        queryKey,
        current =>
          current && current.pages.length > 1
            ? {pages: current.pages.slice(0, 1), pageParams: current.pageParams.slice(0, 1)}
            : current,
      );
    },
    [queryClient],
  );
}

/** 권한 없음 화면에 들어가면 역할 정보를 다시 조회한다 (design.md §5.10 / AC-3). */
export function useAccountRefresh() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({queryKey: ACCOUNT_QUERY_KEY});
  }, [queryClient]);
}

/**
 * 상태 전이 5종 (AC-10 · AC-15 · AC-19 · AC-21 · AC-24).
 *
 * 성공하면 <b>두 목록과 계정 정보를 다시 불러온다</b> (design.md §5.11). 낙관적 제거를 하지 않는
 * 이유는 AC-14 다 — 실패 시 항목이 목록에 남아야 하는데, 미리 지웠다 되살리면 순서가 흔들린다.
 * 건수도 앱이 빼고 더하지 않고 재조회한 서버 값을 반영한다 (M-18).
 *
 * 계정 정보(`GET /auth/me`)까지 무효화하는 이유: 설정 화면의 `관리자` 행에 같은
 * `pending_approval_count` 가 실려 있다 (design.md §4.5 / §5.11).
 */
export function useApprovalActions() {
  const queryClient = useQueryClient();

  const refreshLists = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ADMIN_QUERY_KEY.pending}),
      queryClient.invalidateQueries({queryKey: ADMIN_QUERY_KEY.processed}),
      queryClient.invalidateQueries({queryKey: ACCOUNT_QUERY_KEY}),
    ]);
  }, [queryClient]);

  const approve = useMutation({
    mutationFn: (userId: number) => approveUser(userId),
    onSuccess: refreshLists,
  });

  const reject = useMutation({
    mutationFn: (input: {userId: number; rejectionReason: string}) =>
      rejectUser(input.userId, input.rejectionReason),
    onSuccess: refreshLists,
  });

  const cancelReject = useMutation({
    mutationFn: (userId: number) => cancelUserRejection(userId),
    onSuccess: refreshLists,
  });

  const suspend = useMutation({
    mutationFn: (userId: number) => suspendUser(userId),
    onSuccess: refreshLists,
  });

  const cancelSuspend = useMutation({
    mutationFn: (userId: number) => cancelUserSuspension(userId),
    onSuccess: refreshLists,
  });

  return {approve, cancelReject, cancelSuspend, refreshLists, reject, suspend};
}
