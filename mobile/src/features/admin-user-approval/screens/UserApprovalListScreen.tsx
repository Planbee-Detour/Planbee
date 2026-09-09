/**
 * 가입 신청 관리 (design.md §5 — `Screen 18a`~`19b`).
 * 충족 AC: AC-3 · AC-5 · AC-6 · AC-7 · AC-8 · AC-9 · AC-19(도달 경로) · AC-20 · AC-33
 *
 * <b>한 화면 + 상단 세그먼트 2개</b> (결정 2). "검토 대기 N" / "처리 완료" 이고
 * 두 번째 라벨은 "처리됨" 이 아니다. 조작은 전부 행을 탭해 여는 상세 시트에서 한다 (결정 3).
 *
 * 4가지 상태를 <b>세그먼트마다 따로</b> 갖는다 (§3.6) — `검토 대기` 가 오류여도
 * `처리 완료` 는 정상일 수 있고, 세그먼트 컨트롤은 어떤 상태에서도 조작 가능하다.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View, type View as RNView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {A11yAnnouncement, focusAccessibility} from '../../../shared/lib/a11y';
import {ApiError, NETWORK_ERROR_CODE} from '../../../shared/api/problem';
import {Banner} from '../../../shared/ui/Banner';
import {SHEET_BACKDROP_A11Y, sheetGestureEnabled} from '../../../shared/ui/BottomSheet';
import {EmptyState} from '../../../shared/ui/EmptyState';
import {NavBar} from '../../../shared/ui/NavBar';
import {Segmented} from '../../../shared/ui/Segmented';
import {StatusBadge} from '../../../shared/ui/StatusBadge';
import {Toast} from '../../../shared/ui/Toast';
import {COLOR} from '../../../shared/ui/tokens';
import {UserListRow} from '../../../shared/ui/UserListRow';
import {ADMIN_ERROR} from '../api/endpoints';
import {ListFooter} from '../components/ListFooter';
import {ListSkeleton} from '../components/ListSkeleton';
import {PendingUserSheet} from '../components/PendingUserSheet';
import {ProcessedUserSheet} from '../components/ProcessedUserSheet';
import {formatDateTime, formatSpokenDateTime} from '../format';
import {
  ADMIN_QUERY_KEY,
  useAccountRefresh,
  usePendingUsers,
  useProcessedUsers,
  useTrimToFirstPage,
} from '../hooks/useUserApproval';
import {A11Y, COMMON, GLYPH, LIST, LIST_MESSAGES, REQUEST_SHEET} from '../messages';
import type {AdminRouteParams} from '../navigation';
import type {ApprovalSegment, OpenSheet, PendingUserItem, ProcessedUserItem} from '../types';

type Navigation = NativeStackNavigationProp<AdminRouteParams, 'UserApprovalList'>;

/** 마지막 항목이 화면에 들어오기 한 카드 앞에서 다음 페이지를 부른다 (§5.6). */
const END_REACHED_THRESHOLD = 0.2;

export function UserApprovalListScreen() {
  const navigation = useNavigation<Navigation>();
  /** 화면을 떠났다 돌아오면 초기화된다 — 이 화면에 들어오는 이유가 `검토 대기` 다 (§5.2) */
  const [segment, setSegment] = useState<ApprovalSegment>('pending');
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{seq: number; text: string} | null>(null);
  /** 처리 응답이 403 `ADMIN_FORBIDDEN` 이었던 경우 (§5.10) */
  const [forbiddenByAction, setForbiddenByAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const pending = usePendingUsers(segment === 'pending');
  const processed = useProcessedUsers(segment === 'processed');
  const trimToFirstPage = useTrimToFirstPage();
  const refreshAccount = useAccountRefresh();

  const active = segment === 'pending' ? pending : processed;
  const activeKey = segment === 'pending' ? ADMIN_QUERY_KEY.pending : ADMIN_QUERY_KEY.processed;
  // 빈 배열 리터럴을 그대로 두면 매 렌더마다 새 참조가 되어 아래 useEffect 가 계속 다시 돈다.
  const pages = useMemo(() => active.data?.pages ?? [], [active.data]);
  const lastPage = pages.length > 0 ? pages[pages.length - 1] : undefined;

  /**
   * 세그먼트 라벨의 숫자와 설정 화면의 건수는 <b>같은 서버 값</b>이다 (AC-32 / §4.5).
   * 두 목록 응답 모두 이 필드를 싣기 때문에 `처리 완료` 를 보는 동안에도 값이 살아 있다.
   */
  const pendingCount =
    lastPage?.pending_approval_count ??
    (segment === 'pending'
      ? processed.data?.pages[processed.data.pages.length - 1]?.pending_approval_count
      : pending.data?.pages[pending.data.pages.length - 1]?.pending_approval_count) ??
    0;

  const errorCode = active.error instanceof ApiError ? active.error.code : undefined;
  const forbidden = forbiddenByAction || errorCode === ADMIN_ERROR.forbidden;

  /** 권한 없음 상태에 들어가면 역할 정보를 다시 조회한다 — 설정에 진입점이 남아 있으면 안 된다 (§5.10) */
  useEffect(() => {
    if (forbidden) {
      refreshAccount();
    }
  }, [forbidden, refreshAccount]);

  /** 시트가 열려 있는 동안 iOS 화면 스와이프 백을 끈다 (§6.2). */
  useEffect(() => {
    navigation.setOptions({gestureEnabled: sheetGestureEnabled(sheet !== null)});
  }, [navigation, sheet]);

  const announce = useCallback((text: string) => {
    // 같은 문장을 다시 읽어야 할 때가 있어(연속 새로고침) 순번으로 요소를 새로 만든다.
    setAnnouncement(current => ({seq: (current?.seq ?? 0) + 1, text}));
  }, []);

  /** 다음 페이지를 불러온 뒤 "{N}건을 더 불러왔어요" (§3.5). N 은 응답 `items` 의 길이다 (D-4). */
  const pageCounts = useRef<Record<ApprovalSegment, number>>({pending: 0, processed: 0});
  useEffect(() => {
    const loaded = pages.length;
    const previous = pageCounts.current[segment];
    if (loaded > previous && previous > 0) {
      announce(A11Y.moreLoaded(pages[loaded - 1].items.length));
    }
    pageCounts.current[segment] = loaded;
  }, [announce, pages, segment]);

  /** 당겨서 새로고침 (AC-9 / §5.5). 첫 페이지부터 다시 가져오고 뒤 페이지는 버린다. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshFailed(false);
    trimToFirstPage(activeKey);
    pageCounts.current[segment] = 1;
    const result = await active.refetch();
    setRefreshing(false);
    if (result.isError) {
      // 목록을 오류 화면으로 대체하지 않는다 — 보고 있던 내용을 실패가 지우면 안 된다 (§5.5)
      setRefreshFailed(true);
      return;
    }
    announce(A11Y.refreshed);
  }, [active, activeKey, announce, segment, trimToFirstPage]);

  const loadNextPage = useCallback(() => {
    if (active.hasNextPage && !active.isFetchingNextPage && !active.isFetchNextPageError) {
      active.fetchNextPage();
    }
  }, [active]);

  /** 시트를 닫으면 <b>시트를 연 그 행</b>으로 포커스를 되돌린다 (§3.5). */
  const rowNodes = useRef(new Map<number, RNView | null>());
  const closeSheet = useCallback(() => {
    const openedId = sheet?.item.user_id;
    setSheet(null);
    if (openedId !== undefined) {
      focusAccessibility(rowNodes.current.get(openedId));
    }
  }, [sheet]);

  const completeSheet = useCallback((toastMessage: string) => {
    // 시트를 닫고 토스트를 2초 띄운다. 목록 갱신은 mutation 의 무효화가 한다 (§5.11 · §6.6)
    setSheet(null);
    setToast(toastMessage);
  }, []);

  const failByForbidden = useCallback(() => {
    setSheet(null);
    setForbiddenByAction(true);
  }, []);

  const renderPendingRow = useCallback(
    (item: PendingUserItem) => (
      <UserListRow
        ref={node => {
          rowNodes.current.set(item.user_id, node);
        }}
        email={item.email}
        // 서버가 완성해 내린 문자열을 그대로 렌더한다 — 앱에 `null` 검사도 기본값도 없다 (AC-33)
        body={item.signup_reason_text}
        meta={LIST_MESSAGES.requestedAt(formatDateTime(item.requested_at))}
        accessibilityLabel={A11Y.row([
          item.email,
          LIST_MESSAGES.requestedAt(formatSpokenDateTime(item.requested_at)),
          `${REQUEST_SHEET.fieldReason} ${item.signup_reason_text}`,
        ])}
        accessibilityHint={A11Y.rowHint}
        onPress={() => setSheet({kind: 'pending', item})}
        testID={`admin-pending-row-${item.user_id}`}
      />
    ),
    [],
  );

  const renderProcessedRow = useCallback(
    (item: ProcessedUserItem) => (
      <UserListRow
        ref={node => {
          rowNodes.current.set(item.user_id, node);
        }}
        email={item.email}
        // 배지 라벨도 시각 접두어도 서버 값이다. 앱은 톤과 시각 포맷팅만 맡는다 (§3.4 · §5.4)
        badge={<StatusBadge status={item.status} label={item.status_label} />}
        meta={LIST_MESSAGES.processedAt(
          item.processed_at_prefix,
          formatDateTime(item.processed_at),
        )}
        accessibilityLabel={A11Y.row([
          item.email,
          item.status_label,
          LIST_MESSAGES.processedAt(
            item.processed_at_prefix,
            formatSpokenDateTime(item.processed_at),
          ),
        ])}
        accessibilityHint={A11Y.rowHint}
        onPress={() => setSheet({kind: 'processed', item})}
        testID={`admin-processed-row-${item.user_id}`}
      />
    ),
    [],
  );

  const emptyText =
    segment === 'pending' ? LIST_MESSAGES.empty.pending : LIST_MESSAGES.empty.processed;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1" {...(sheet ? SHEET_BACKDROP_A11Y : {})}>
        <NavBar
          title={LIST.title}
          left={{label: '‹', accessibilityLabel: LIST.back, onPress: () => navigation.goBack()}}
        />

        {/* 세그먼트는 로딩·오류·권한 없음 어떤 상태에서도 조작 가능하다 (§3.6) */}
        <View className="px-5 pt-4">
          <Segmented
            options={[
              {value: 'pending', label: LIST.segmentPending(pendingCount)},
              {value: 'processed', label: LIST.segmentProcessed},
            ]}
            selected={segment}
            onSelect={setSegment}
            testID="admin-segment"
          />
        </View>

        {refreshFailed ? (
          <View className="px-5 pt-4">
            <Banner
              title={LIST_MESSAGES.refreshFailed.title}
              detail={LIST_MESSAGES.refreshFailed.body}
              tone="danger"
              action={{label: COMMON.retry, onPress: refresh}}
              testID="admin-refresh-failed"
            />
          </View>
        ) : null}

        {forbidden ? (
          <View className="flex-1 px-5">
            <EmptyState
            glyph={GLYPH.lock}
            title={LIST_MESSAGES.error.forbidden.title}
            body={LIST_MESSAGES.error.forbidden.body}
            // "다시 시도" 를 두지 않는다 — 다시 눌러도 같은 결과다 (§5.10)
            action={{
              label: LIST_MESSAGES.error.forbidden.action,
              onPress: () => navigation.goBack(),
              variant: 'primary',
            }}
              testID="admin-forbidden"
            />
          </View>
        ) : active.isPending ? (
          <View className="px-5 pt-4">
            <ListSkeleton accessibilityLabel={LIST_MESSAGES.more.loading} />
          </View>
        ) : active.isError ? (
          <View className="flex-1 px-5">
            <EmptyState
            glyph={errorCode === NETWORK_ERROR_CODE ? GLYPH.wifiOff : GLYPH.alertCircle}
            tone={errorCode === NETWORK_ERROR_CODE ? 'muted' : 'danger'}
            title={
              errorCode === NETWORK_ERROR_CODE
                ? LIST_MESSAGES.error.network.title
                : LIST_MESSAGES.error.server.title
            }
            body={
              errorCode === NETWORK_ERROR_CODE
                ? LIST_MESSAGES.error.network.body
                : LIST_MESSAGES.error.server.body
            }
            action={{
              label: COMMON.retry,
              loading: active.isFetching,
              loadingLabel: COMMON.retrying,
              // 그 세그먼트의 목록만 다시 불러온다. 화면을 리마운트하지 않는다 (AC-8 / §5.9)
              onPress: () => active.refetch(),
            }}
              testID="admin-list-error"
            />
          </View>
        ) : segment === 'pending' ? (
          <ApprovalList
            items={pending.data?.pages.flatMap(page => page.items) ?? []}
            renderRow={renderPendingRow}
            empty={emptyText}
            footer={{
              loading: pending.isFetchingNextPage,
              hasNext: Boolean(pending.hasNextPage),
              failed: pending.isFetchNextPageError,
              singlePage: pages.length <= 1 && !pending.hasNextPage,
              onRetry: () => pending.fetchNextPage(),
            }}
            onEndReached={loadNextPage}
            onRefresh={refresh}
            refreshing={refreshing}
            testID="admin-pending-list"
          />
        ) : (
          <ApprovalList
            items={processed.data?.pages.flatMap(page => page.items) ?? []}
            renderRow={renderProcessedRow}
            empty={emptyText}
            footer={{
              loading: processed.isFetchingNextPage,
              hasNext: Boolean(processed.hasNextPage),
              failed: processed.isFetchNextPageError,
              singlePage: pages.length <= 1 && !processed.hasNextPage,
              onRetry: () => processed.fetchNextPage(),
            }}
            onEndReached={loadNextPage}
            onRefresh={refresh}
            refreshing={refreshing}
            testID="admin-processed-list"
          />
        )}
      </View>

      {sheet?.kind === 'pending' ? (
        <PendingUserSheet
          item={sheet.item}
          onClose={closeSheet}
          onCompleted={completeSheet}
          onForbidden={failByForbidden}
        />
      ) : null}

      {sheet?.kind === 'processed' ? (
        <ProcessedUserSheet
          item={sheet.item}
          onClose={closeSheet}
          onCompleted={completeSheet}
          onForbidden={failByForbidden}
        />
      ) : null}

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
      {announcement ? (
        <A11yAnnouncement key={announcement.seq} message={announcement.text} />
      ) : null}
    </SafeAreaView>
  );
}

/**
 * 두 세그먼트가 같은 골격을 쓴다 — 목록·빈 상태·푸터·당겨서 새로고침이 같고 행만 다르다.
 * 상태를 세그먼트마다 따로 갖는 것(§3.6)은 호출부가 각자의 쿼리에서 값을 넘겨 지킨다.
 */
function ApprovalList<T extends {user_id: number}>({
  items,
  renderRow,
  empty,
  footer,
  onEndReached,
  onRefresh,
  refreshing,
  testID,
}: {
  items: T[];
  renderRow: (item: T) => React.ReactElement;
  empty: {title: string; body: string};
  footer: {
    loading: boolean;
    hasNext: boolean;
    failed: boolean;
    singlePage: boolean;
    onRetry: () => void;
  };
  onEndReached: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  testID: string;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={item => String(item.user_id)}
      renderItem={({item}) => renderRow(item)}
      ItemSeparatorComponent={ListGap}
      // 빈 화면도 당길 수 있어야 한다 — `grow` 가 없으면 스크롤이 없어 당겨지지 않는다 (AC-9 / §5.8)
      contentContainerClassName="grow px-5 pt-4 pb-10"
      ListEmptyComponent={
        <EmptyState glyph={GLYPH.inbox} title={empty.title} body={empty.body} />
      }
      ListFooterComponent={
        <ListFooter
          loading={footer.loading}
          hasNext={footer.hasNext}
          failed={footer.failed}
          singlePage={footer.singlePage}
          onRetry={footer.onRetry}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      refreshControl={<ListRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
      testID={testID}
    />
  );
}

/** 카드 사이 간격 12 (§5.3). */
function ListGap() {
  return <View className="h-3" />;
}

/**
 * 당겨서 새로고침 (§10). 색 prop 은 `className` 을 받지 않으므로 토큰 값을 읽어 온다 (M-16).
 * iOS 는 `tintColor`, 안드로이드는 `colors` · `progressBackgroundColor` 를 본다 —
 * 서로의 prop 을 무시하므로 양쪽을 함께 넘긴다 (M-20).
 */
function ListRefreshControl({refreshing, onRefresh}: {refreshing: boolean; onRefresh: () => void}) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLOR.inkMuted}
      colors={[COLOR.brand]}
      progressBackgroundColor={COLOR.surface}
    />
  );
}
