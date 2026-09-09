/**
 * 사용자 상세 시트의 인수조건 검증 (PRD AC-19 · AC-20 · AC-21 · AC-24 · AC-25 / design.md §7).
 *
 * 액션은 §7.2 결정표대로 갈린다 — `APPROVED` → 이용 정지 / `SUSPENDED` → 정지 해제 /
 * `REJECTED` → 거절 취소 / <b>자기 자신이면 액션을 아예 렌더하지 않는다</b> (AC-25).
 *
 * 확인 다이얼로그의 <b>버튼 배치</b>(M-20 취소 우선)는 플랫폼 분기라 `platform*.test.tsx` 에서 본다.
 */

// 시간대는 `jest.config.js` 에서 `Asia/Seoul` 로 고정한다 — 표기 예시는 그 기준이다 (§3.3).

import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const PROCESSED = `${API_ORIGIN}/api/v1/admin/users/processed`;
const SUSPEND = `${API_ORIGIN}/api/v1/admin/users/7/suspend`;
const UNSUSPEND = `${API_ORIGIN}/api/v1/admin/users/7/suspend/cancel`;
const CANCEL_REJECT = `${API_ORIGIN}/api/v1/admin/users/9/reject/cancel`;

const approved = (overrides: Record<string, unknown> = {}) => ({
  user_id: 7,
  email: 'hana@example.com',
  status: 'APPROVED',
  status_label: '승인됨',
  processed_at: '2026-09-01T00:12:00Z',
  processed_at_prefix: '승인',
  approved_at: '2026-09-01T00:12:00Z',
  suspended_at: null,
  rejected_at: null,
  is_me: false,
  ...overrides,
});

const suspended = (overrides: Record<string, unknown> = {}) =>
  approved({
    status: 'SUSPENDED',
    status_label: '정지됨',
    processed_at: '2026-09-06T09:03:00Z',
    processed_at_prefix: '정지',
    suspended_at: '2026-09-06T09:03:00Z',
    ...overrides,
  });

const rejected = (overrides: Record<string, unknown> = {}) =>
  approved({
    user_id: 9,
    email: 'bora@example.com',
    status: 'REJECTED',
    status_label: '거절됨',
    processed_at: '2026-09-02T02:40:00Z',
    processed_at_prefix: '거절',
    approved_at: null,
    rejected_at: '2026-09-02T02:40:00Z',
    ...overrides,
  });

const Stack = createNativeStackNavigator<{UserApprovalList: undefined}>();

let pendingCount = 0;

async function renderList() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="UserApprovalList" component={UserApprovalListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

/** `처리 완료` 세그먼트에서 첫 행을 탭해 사용자 상세 시트를 연다 (§2.3 전이표). */
async function openUserSheet(email: string) {
  await renderList();
  await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));
  await screen.findByText(email, {}, {timeout: 3000});
  await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
  await screen.findByText('사용자', {}, {timeout: 3000});
}

/** 시스템 확인 다이얼로그의 버튼을 라벨로 골라 누른다 (§7.3 · §7.5). */
async function pressAlertButton(label: string) {
  const calls = (Alert.alert as unknown as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as Array<{text: string; onPress?: () => void}>;
  const button = buttons.find(entry => entry.text === label);
  expect(button).toBeDefined();
  await button?.onPress?.();
}

const processedList = (items: unknown[]) =>
  HttpResponse.json({
    items,
    has_next: false,
    next_cursor: null,
    pending_approval_count: pendingCount,
  });

beforeEach(() => {
  pendingCount = 0;
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  server.use(
    http.get(PENDING, () =>
      HttpResponse.json({
        items: [],
        has_next: false,
        next_cursor: null,
        pending_approval_count: pendingCount,
      }),
    ),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('정보 블록 — design.md §7.1', () => {
  test('값이_없는_시각_행은_아예_렌더하지_않는다', async () => {
    server.use(http.get(PROCESSED, () => processedList([suspended()])));

    await openUserSheet('hana@example.com');

    expect(screen.getByText('이메일')).toBeTruthy();
    expect(screen.getByText('상태')).toBeTruthy();
    expect(screen.getByText('승인 시각')).toBeTruthy();
    expect(screen.getByText('정지 시각')).toBeTruthy();
    expect(screen.getByText('2026. 9. 6. 18:03')).toBeTruthy();
    // `rejected_at` 이 `null` 이므로 그 행은 없다 — 빈 값이나 "-" 를 두지 않는다 (§7.1).
    expect(screen.queryByText('거절 시각')).toBeNull();
  });

  test('처리자와_거절_사유는_시트에_그리지_않는다', async () => {
    // 2026-09-07 Q2 · Q3 확정 (§7.1.1 · §7.1.2). 계약도 그 필드를 내리지 않는다.
    server.use(http.get(PROCESSED, () => processedList([rejected()])));

    await openUserSheet('bora@example.com');

    expect(screen.getByText('거절 시각')).toBeTruthy();
    expect(screen.queryByText('승인 시각')).toBeNull();
    expect(screen.queryByText('거절 사유')).toBeNull();
    expect(screen.queryByText('처리자')).toBeNull();
  });
});

describe('이용 정지 — AC-21 (design.md §7.3)', () => {
  test('AC21_확인_다이얼로그를_거쳐_정지하면_배지가_정지됨으로_바뀐다', async () => {
    let done = false;
    server.use(
      http.get(PROCESSED, () => processedList([done ? suspended() : approved()])),
      http.post(SUSPEND, () => {
        done = true;
        return HttpResponse.json({pending_approval_count: 0, user: suspended()});
      }),
    );

    await openUserSheet('hana@example.com');

    await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));

    // 되돌릴 수 없거나 사용자에게 즉시 영향을 주는 처리에만 시스템 다이얼로그를 쓴다 (§3.2).
    expect(Alert.alert).toHaveBeenCalledWith(
      '이용을 정지할까요?',
      '정지하면 이 사용자는 로그인할 수 없어요. 나중에 정지를 해제할 수 있어요.',
      expect.any(Array),
    );

    await pressAlertButton('이용 정지');

    expect(await screen.findByText('이용을 정지했어요', {}, {timeout: 3000})).toBeTruthy();
    // 시트가 닫히고 그 행의 배지가 갱신된다 (§5.11).
    await waitFor(() => expect(screen.queryByText('사용자')).toBeNull());
    expect(await screen.findByText('정지됨', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('정지 2026. 9. 6. 18:03')).toBeTruthy();
  });

  test('AC21_다이얼로그에서_취소하면_아무_요청도_보내지_않는다', async () => {
    let posted = 0;
    server.use(
      http.get(PROCESSED, () => processedList([approved()])),
      http.post(SUSPEND, () => {
        posted += 1;
        return HttpResponse.json({pending_approval_count: 0, user: suspended()});
      }),
    );

    await openUserSheet('hana@example.com');
    await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));
    await pressAlertButton('취소');

    expect(posted).toBe(0);
    expect(screen.getByRole('button', {name: '이용 정지'})).toBeTruthy();
  });

  test('AC14_계열_정지에_실패하면_아직_처리되지_않았어요_배너가_뜬다', async () => {
    server.use(
      http.get(PROCESSED, () => processedList([approved()])),
      http.post(SUSPEND, () => HttpResponse.error()),
    );

    await openUserSheet('hana@example.com');
    await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));
    await pressAlertButton('이용 정지');

    expect(await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('아직 처리되지 않았어요. 연결 후 다시 시도해 주세요.')).toBeTruthy();
    // 시트는 열린 채 남고 액션도 그대로다 (§6.7).
    expect(screen.getByRole('button', {name: '이용 정지'})).toBeTruthy();
  });
});

describe('정지 해제 — AC-24 (design.md §7.4)', () => {
  test('AC24_확인_다이얼로그_없이_바로_처리되고_배지가_승인됨으로_돌아간다', async () => {
    let done = false;
    server.use(
      http.get(PROCESSED, () => processedList([done ? approved() : suspended()])),
      http.post(UNSUSPEND, () => {
        done = true;
        return HttpResponse.json({pending_approval_count: 0, user: approved()});
      }),
    );

    await openUserSheet('hana@example.com');

    await fireEvent.press(screen.getByRole('button', {name: '정지 해제'}));

    // 해제는 사용자에게 이익이 되는 방향이라 확인을 두지 않는다 (§7.4).
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(await screen.findByText('정지를 해제했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(await screen.findByText('승인됨', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('거절 취소 — AC-19 (design.md §7.5)', () => {
  test('AC19_확인_다이얼로그를_거쳐_되돌리면_검토_대기_목록에_다시_나타난다', async () => {
    let done = false;
    server.use(
      http.get(PROCESSED, () => processedList(done ? [] : [rejected()])),
      http.get(PENDING, () =>
        HttpResponse.json({
          items: done
            ? [
                {
                  user_id: 9,
                  email: 'bora@example.com',
                  signup_reason_text: '입력하지 않음',
                  // 거절 취소로 돌아온 항목도 원래 신청 시각을 유지한다 (§7.5 / 계약).
                  requested_at: '2026-09-01T00:30:00Z',
                  is_me: false,
                },
              ]
            : [],
          has_next: false,
          next_cursor: null,
          pending_approval_count: pendingCount,
        }),
      ),
      http.post(CANCEL_REJECT, () => {
        done = true;
        pendingCount = 1;
        return HttpResponse.json({
          pending_approval_count: 1,
          user: {
            user_id: 9,
            email: 'bora@example.com',
            signup_reason_text: '입력하지 않음',
            requested_at: '2026-09-01T00:30:00Z',
            is_me: false,
          },
        });
      }),
    );

    await openUserSheet('bora@example.com');

    await fireEvent.press(screen.getByRole('button', {name: '거절 취소'}));

    expect(Alert.alert).toHaveBeenCalledWith(
      '거절을 취소할까요?',
      '이 신청이 다시 검토 대기 목록으로 돌아가요.',
      expect.any(Array),
    );

    await pressAlertButton('거절 취소');

    expect(await screen.findByText('검토 대기로 되돌렸어요', {}, {timeout: 3000})).toBeTruthy();
    // 대기 건수는 서버 값으로 갱신된다 — 앱이 +1 하지 않는다 (AC-32 / §5.11).
    expect(await screen.findByText('검토 대기 1', {}, {timeout: 3000})).toBeTruthy();

    // 되돌아간 항목은 검토 대기 목록에 있다 (AC-19).
    await fireEvent.press(screen.getByRole('tab', {name: '검토 대기 1'}));
    expect(await screen.findByText('bora@example.com', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('신청 2026. 9. 1. 09:30')).toBeTruthy();
  });
});

describe('자기 자신 — AC-25 (design.md §7.6)', () => {
  test('AC25_내_계정이면_정지_동작이_아예_제공되지_않는다', async () => {
    server.use(http.get(PROCESSED, () => processedList([approved({is_me: true})])));

    await openUserSheet('hana@example.com');

    // 비활성 버튼도 두지 않는다 — 회색 버튼은 "언젠가 될 수도 있는 것" 으로 읽힌다 (§7.6).
    expect(screen.queryByRole('button', {name: '이용 정지'})).toBeNull();
    expect(screen.getByText('내 계정이에요. 스스로 정지할 수 없어요.')).toBeTruthy();
    // 정보 블록은 다른 사용자와 완전히 같게 보여준다.
    expect(screen.getByText('hana@example.com')).toBeTruthy();
    expect(screen.getByText('승인 시각')).toBeTruthy();
  });

  test('AC25_서버가_자기_자신_정지를_거부하면_배너와_닫기만_남는다', async () => {
    // 앱이 버튼을 숨기는 것은 편의이고 차단의 주체는 서버다 (§7.6 / `error-codes.md`).
    server.use(
      http.get(PROCESSED, () => processedList([approved()])),
      http.post(SUSPEND, () =>
        HttpResponse.json(
          problemBody({status: 403, code: 'ADMIN_SELF_SUSPEND_FORBIDDEN'}),
          {status: 403},
        ),
      ),
    );

    await openUserSheet('hana@example.com');
    await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));
    await pressAlertButton('이용 정지');

    expect(await screen.findByText('내 계정은 정지할 수 없어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('스스로를 정지할 수는 없어요.')).toBeTruthy();
    expect(screen.queryByRole('button', {name: '이용 정지'})).toBeNull();
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull();
    expect(screen.getByRole('button', {name: '닫기'})).toBeTruthy();
    // 권한 없음 화면(§5.10)으로 가지 않는다 — 두 403 은 `code` 로 갈린다 (C-1 / M-13).
    expect(screen.queryByText('관리자만 볼 수 있어요')).toBeNull();
  });
});
