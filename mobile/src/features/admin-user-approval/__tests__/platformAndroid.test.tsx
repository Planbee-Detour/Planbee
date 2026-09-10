/**
 * 플랫폼 분기의 <b>안드로이드 경로</b> (design.md §2.4 · §6.2 · §10 / `mobile.md` M-19 · M-20).
 *
 * mobile-reviewer 요청 R-M3 — jest 의 기본 플랫폼이 `ios` 라 그냥 두면 안드로이드 경로가
 * 한 번도 실행되지 않는다. 이 파일만 `Platform` 을 목킹한다
 * (`auth` 의 `a11yAnnounceAndroid.test.tsx` 선례).
 *
 * | # | 분기 | Android |
 * |---|---|---|
 * | 1 | 시트의 `KeyboardAvoidingView behavior` | `height` |
 * | 2 | 시트가 열린 동안의 화면 스와이프 백 | 해당 없음 — `default` 를 채워 `true` |
 * | 3 | 확인 다이얼로그 버튼 배열 | 취소가 첫 자리 (<b>배열 순서가 곧 배치</b>) |
 * | 4 | 하드웨어 백 (§2.4) | 기본 단계 → 닫힘 / 거절 단계 → 기본 단계 / 처리 중 → 아무 일 없음 |
 */
import React from 'react';

/** 실제 Platform 을 프로토타입으로 두고 `OS` / `select` 만 안드로이드로 바꾼다. */
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/Platform');
  const real = actual.default ?? actual;
  return {
    __esModule: true,
    default: Object.assign(Object.create(real), {
      OS: 'android',
      select: (spec: Record<string, unknown>) =>
        'android' in spec ? spec.android : 'native' in spec ? spec.native : spec.default,
    }),
  };
});

import {Alert, Platform, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {BottomSheet, sheetGestureEnabled} from '../../../shared/ui/BottomSheet';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const PROCESSED = `${API_ORIGIN}/api/v1/admin/users/processed`;
const APPROVE = `${API_ORIGIN}/api/v1/admin/users/42/approve`;

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

async function renderList() {
  const queryClient = createTestQueryClient();
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

function usePendingOnly() {
  server.use(
    http.get(PENDING, () =>
      HttpResponse.json({
        items: [PENDING_ITEM],
        has_next: false,
        next_cursor: null,
        pending_approval_count: 1,
      }),
    ),
  );
}

async function openPendingSheet() {
  await renderList();
  await screen.findByText('name@example.com', {}, {timeout: 3000});
  await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
  await screen.findByText('가입 신청', {}, {timeout: 3000});
}

/** 안드로이드 하드웨어 백 = `Modal.onRequestClose` (design.md §2.4). */
async function pressHardwareBack() {
  await fireEvent(screen.getByTestId('admin-pending-sheet'), 'requestClose');
}

test('이 파일은 안드로이드 경로를 탄다', () => {
  expect(Platform.OS).toBe('android');
  expect(Platform.select({ios: 'i', android: 'a', default: 'd'})).toBe('a');
});

test('M20_시트의_키보드_회피는_안드로이드에서_height_다', async () => {
  const select = jest.spyOn(Platform, 'select');

  await render(
    <SafeAreaProvider
      initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 24, left: 0, right: 0, bottom: 0}}}>
      <BottomSheet visible avoidKeyboard accessibilityLabel="가입 신청" onClose={() => undefined}>
        <Text>내용</Text>
      </BottomSheet>
    </SafeAreaProvider>,
  );

  const spec = select.mock.calls
    .map(call => call[0] as Record<string, unknown>)
    .find(candidate => candidate.ios === 'padding');
  expect(spec).toBeDefined();
  // iOS 값이 그대로 새어 나오지 않는다 — `default` 를 채웠기 때문이다 (M-20).
  expect(Platform.select(spec ?? {})).toBe('height');
  select.mockRestore();
});

test('M20_안드로이드에는_화면_스와이프_백이_없어_default_값을_쓴다', () => {
  // 값이 무시되는 플랫폼이라도 키를 비워 두지 않는다 (M-20).
  expect(sheetGestureEnabled(true)).toBe(true);
  expect(sheetGestureEnabled(false)).toBe(true);
});

test('M20_확인_다이얼로그는_취소를_배열_첫_자리에_둔다', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
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
  );

  await renderList();
  await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));
  await screen.findByText('hana@example.com', {}, {timeout: 3000});
  await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
  await screen.findByText('사용자', {}, {timeout: 3000});

  await fireEvent.press(screen.getByRole('button', {name: '이용 정지'}));

  const buttons = alert.mock.calls[0][2] as Array<{text: string; style?: string}>;
  // 안드로이드는 배열 순서가 곧 배치다 — 취소가 첫 자리여야 왼쪽/아래에 놓인다 (§6.2 / M-20).
  expect(buttons.map(button => button.text)).toEqual(['취소', '이용 정지']);
  expect(buttons[0].style).toBe('cancel');
  alert.mockRestore();
});

describe('하드웨어 백 — design.md §2.4', () => {
  test('기본_단계에서_백을_누르면_시트만_닫히고_화면은_남는다', async () => {
    usePendingOnly();

    await openPendingSheet();

    await pressHardwareBack();

    await waitFor(() => expect(screen.queryByText('가입 신청')).toBeNull());
    expect(screen.getByText('가입 신청 관리')).toBeTruthy();
    expect(screen.getByText('name@example.com')).toBeTruthy();
  });

  test('거절_사유_입력_단계에서_백을_누르면_기본_단계로_되돌아가고_입력한_사유는_남는다', async () => {
    usePendingOnly();

    await openPendingSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await screen.findByText('이 신청을 거절할까요?', {}, {timeout: 3000});
    await fireEvent.changeText(screen.getByLabelText('거절 사유'), '중복 신청으로 보여요.');

    await pressHardwareBack();

    // 200자를 쓰다가 백 한 번에 사라지면 안 된다 (§2.4).
    expect(await screen.findByText('가입 신청', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('이 신청을 거절할까요?')).toBeNull();

    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    expect(screen.getByLabelText('거절 사유').props.value).toBe('중복 신청으로 보여요.');
  });

  /**
   * §2.4 는 "처리 중 백은 이벤트를 소비하고 아무 일도 하지 않는다" 를 요구한다.
   *
   * <b>RNTL 로는 그 중간 상태를 그대로 볼 수 없다</b> — `fireEvent` 가 감싸는 `act` 가
   * 진행 중인 요청까지 끝내 버려서, 백을 누른 시점에는 이미 처리가 끝나 있다.
   * 그래서 여기서는 <b>결과</b>로 확인한다 — 백을 눌러도 처리가 취소되지 않고, 요청이 한 번만
   * 나가며(중복 요청 없음), 완료 안내가 뜬다. 시트가 닫히지 않는 것 자체는
   * `pendingSheet.test.tsx` 의 스크림 경로가 고정한다 (그쪽은 비활성이라 이벤트가 나가지 않는다).
   */
  test('처리_중에_하드웨어_백을_눌러도_처리가_중단되거나_중복_요청되지_않는다', async () => {
    usePendingOnly();
    let posted = 0;
    server.use(
      http.post(APPROVE, async () => {
        posted += 1;
        await new Promise<void>(resolve => {
          setTimeout(resolve, 300);
        });
        return HttpResponse.json({
          pending_approval_count: 0,
          user: {...PROCESSED_ITEM, user_id: 42, email: 'name@example.com'},
        });
      }),
    );

    await openPendingSheet();
    await fireEvent.press(screen.getByRole('button', {name: '승인'}));
    expect(screen.getByRole('button', {name: '승인 중…'})).toBeTruthy();

    await pressHardwareBack();

    expect(await screen.findByText('승인했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(posted).toBe(1);
  });
});
