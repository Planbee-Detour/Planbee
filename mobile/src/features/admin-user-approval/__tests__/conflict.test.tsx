/**
 * 경합 — 이미 처리된 신청 (PRD AC-12 / design.md §6.8 / `error-codes.md` `ADMIN_USER_ALREADY_PROCESSED`).
 *
 * <b>mobile-reviewer 요청 R-M4 를 고정하는 파일이다.</b> 재작업 1회차의 회귀 지점이 정확히
 * 여기다 — 409 뒤에 액션을 "닫기" 하나로 바꾸는 처리가 처음에는 <b>기본 단계에만</b> 있었고,
 * 거절 사유 입력 단계에서는 "거절하기" 가 남아 다시 눌러 같은 409 를 받을 수 있었다.
 *
 * 그래서 세 가지를 함께 본다.
 *   ⑴ 기본 단계 ⑵ 거절 사유 입력 단계 ⑶ 안드로이드 하드웨어 백으로 ⑵ → ⑴ 로 되돌아간 뒤
 * 어느 경우에도 `승인` · `거절` · `거절하기` · `뒤로` 가 <b>JSX 에서 사라지고</b>
 * `닫기` 하나만 남는지 — 비활성이 아니라 제거다.
 */
import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const PROCESSED = `${API_ORIGIN}/api/v1/admin/users/processed`;
const APPROVE = `${API_ORIGIN}/api/v1/admin/users/42/approve`;
const REJECT = `${API_ORIGIN}/api/v1/admin/users/42/reject`;
const SUSPEND = `${API_ORIGIN}/api/v1/admin/users/7/suspend`;

const conflict = () =>
  HttpResponse.json(
    problemBody({
      status: 409,
      code: 'ADMIN_USER_ALREADY_PROCESSED',
      detail: '이미 처리된 신청이에요.',
    }),
    {status: 409},
  );

const PENDING_ITEM = {
  user_id: 42,
  email: 'name@example.com',
  signup_reason_text: '여행 중 일정이 자주 바뀌어서 써보고 싶어요.',
  requested_at: '2026-09-05T05:20:00Z',
  is_me: false,
};

const PROCESSED_ITEM = {
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
};

const Stack = createNativeStackNavigator<{UserApprovalList: undefined}>();

/** 목록 요청 수를 센다 — §6.8 은 "배너가 뜨는 즉시 목록을 다시 불러온다" 를 요구한다 (AC-12). */
let pendingRequests = 0;

async function renderList() {
  pendingRequests = 0;
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

function usePendingHandlers() {
  server.use(
    http.get(PENDING, () => {
      pendingRequests += 1;
      return HttpResponse.json({
        items: [PENDING_ITEM],
        has_next: false,
        next_cursor: null,
        pending_approval_count: 1,
      });
    }),
  );
}

async function openPendingSheet() {
  await renderList();
  await screen.findByText('name@example.com', {}, {timeout: 3000});
  await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
  await screen.findByText('가입 신청', {}, {timeout: 3000});
}

/** 경합 상태에서 남아 있어야 하는 것과 사라져야 하는 것 (§6.8). */
function expectOnlyCloseAction() {
  expect(screen.getByTestId('admin-conflict-close')).toBeTruthy();
  expect(screen.queryByRole('button', {name: '승인'})).toBeNull();
  expect(screen.queryByRole('button', {name: '거절'})).toBeNull();
  expect(screen.queryByRole('button', {name: '거절하기'})).toBeNull();
  expect(screen.queryByRole('button', {name: '뒤로'})).toBeNull();
  // 배너에 "다시 시도" 를 붙이지 않는다 — 다시 눌러도 같은 결과다 (§6.8).
  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull();
}

describe('신청 상세 시트 — AC-12 (design.md §6.8)', () => {
  test('AC12_기본_단계에서_409_면_승인_거절이_사라지고_닫기만_남는다', async () => {
    usePendingHandlers();
    server.use(http.post(APPROVE, conflict));

    await openPendingSheet();
    const requestsBeforeAction = pendingRequests;

    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(await screen.findByText('이미 처리된 신청이에요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('다른 기기에서 먼저 처리됐어요. 목록을 새로 고쳤어요.')).toBeTruthy();
    expectOnlyCloseAction();

    // 토스트로 하지 않는다 (§3.2) — 2초 뒤 사라지면 왜 무효였는지 되짚을 수단이 없어진다.
    expect(screen.queryByText('승인했어요')).toBeNull();

    // 정보 블록은 그대로 둔다 — 어떤 신청이었는지 확인할 수 있어야 한다 (§6.8).
    expect(screen.getByText('name@example.com')).toBeTruthy();
    expect(screen.getByText('여행 중 일정이 자주 바뀌어서 써보고 싶어요.')).toBeTruthy();
    expect(screen.getByText('신청 시각')).toBeTruthy();

    // 배너가 뜨는 즉시 목록을 다시 불러온다 — "닫기" 를 누르는 시점에는 갱신이 끝나 있다.
    await waitFor(() => expect(pendingRequests).toBeGreaterThan(requestsBeforeAction));
  });

  test('AC12_거절_사유_입력_단계에서_409_면_거절하기와_뒤로가_사라지고_닫기만_남는다', async () => {
    usePendingHandlers();
    server.use(http.post(REJECT, conflict));

    await openPendingSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await screen.findByText('이 신청을 거절할까요?', {}, {timeout: 3000});
    await fireEvent.changeText(screen.getByLabelText('거절 사유'), '중복 신청으로 보여요.');

    await fireEvent.press(screen.getByRole('button', {name: '거절하기'}));

    expect(await screen.findByText('이미 처리된 신청이에요', {}, {timeout: 3000})).toBeTruthy();
    // R-M4 의 핵심 — 이 단계에서도 액션이 "닫기" 하나여야 한다 (재작업 1회차의 회귀 지점).
    expectOnlyCloseAction();

    // 이 단계에서 남기라고 한 것: 대상 이메일과 입력한 사유 (§6.8).
    expect(screen.getByText('name@example.com')).toBeTruthy();
    expect(screen.getByLabelText('거절 사유').props.value).toBe('중복 신청으로 보여요.');
  });

  test('AC12_경합_뒤_안드로이드_백으로_기본_단계로_돌아가도_액션이_되살아나지_않는다', async () => {
    usePendingHandlers();
    server.use(http.post(REJECT, conflict));

    await openPendingSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await screen.findByText('이 신청을 거절할까요?', {}, {timeout: 3000});
    await fireEvent.press(screen.getByRole('button', {name: '거절하기'}));
    await screen.findByText('이미 처리된 신청이에요', {}, {timeout: 3000});

    // 안드로이드 하드웨어 백 = `Modal.onRequestClose` (§2.4 / M-20).
    // 거절 사유 입력 단계에서는 시트를 닫지 않고 기본 단계로 되돌린다.
    await fireEvent(screen.getByTestId('admin-pending-sheet'), 'requestClose');

    expect(await screen.findByText('가입 신청', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('이 신청을 거절할까요?')).toBeNull();
    // 되돌아간 기본 단계에서도 액션은 "닫기" 하나뿐이다 — 같은 409 로 갈 길이 없다.
    expectOnlyCloseAction();
    expect(screen.getByText('이미 처리된 신청이에요')).toBeTruthy();
  });

  test('AC12_닫기를_누르면_시트가_닫히고_갱신된_목록으로_돌아온다', async () => {
    usePendingHandlers();
    server.use(http.post(APPROVE, conflict));

    await openPendingSheet();
    await fireEvent.press(screen.getByRole('button', {name: '승인'}));
    await screen.findByText('이미 처리된 신청이에요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByTestId('admin-conflict-close'));

    await waitFor(() => expect(screen.queryByText('이미 처리된 신청이에요')).toBeNull());
    expect(screen.getByText('가입 신청 관리')).toBeTruthy();
    expect(screen.getByText('name@example.com')).toBeTruthy();
  });
});

describe('사용자 상세 시트 — AC-12 (design.md §6.8 을 §7 에 그대로 적용)', () => {
  test('AC12_정지에서_409_면_이용_정지가_사라지고_닫기만_남는다', async () => {
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json({items: [], has_next: false, next_cursor: null, pending_approval_count: 0}),
      ),
      http.get(PROCESSED, () =>
        HttpResponse.json({
          items: [PROCESSED_ITEM],
          has_next: false,
          next_cursor: null,
          pending_approval_count: 0,
        }),
      ),
      http.post(SUSPEND, conflict),
    );

    await renderList();
    await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));
    await screen.findByText('hana@example.com', {}, {timeout: 3000});
    await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
    await screen.findByText('사용자', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));
    // 확인 다이얼로그의 파괴적 버튼을 누른 것과 같게 만든다 (§7.3 — Alert 는 별도 파일에서 본다).
    await pressAlertConfirm('이용 정지');

    expect(await screen.findByText('이미 처리된 신청이에요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByRole('button', {name: '이용 정지'})).toBeNull();
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull();
    expect(screen.getByRole('button', {name: '닫기'})).toBeTruthy();
  });
});

/** `Alert.alert` 의 버튼 배열에서 라벨로 골라 누른다. */
async function pressAlertConfirm(label: string) {
  const {Alert} = require('react-native');
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as Array<{text: string; onPress?: () => void}>;
  const button = buttons.find(entry => entry.text === label);
  expect(button).toBeDefined();
  await button?.onPress?.();
}

beforeEach(() => {
  jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
