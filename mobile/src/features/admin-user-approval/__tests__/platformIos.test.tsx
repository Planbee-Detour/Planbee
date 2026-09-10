/**
 * 플랫폼 분기의 <b>iOS 경로</b> (design.md §6.2 · §10 / `mobile.md` M-19 · M-20).
 *
 * mobile-reviewer 요청 R-M3 — 이번 변경의 `Platform` 분기는 넷이고, 그 양쪽을 모두 테스트한다.
 * jest 의 기본 플랫폼이 `ios` 라 이 파일이 iOS 경로를, `platformAndroid.test.tsx` 가
 * 안드로이드 경로를 맡는다. 한 파일에서 OS 를 바꾸지 않는 이유는 모듈 로드 시점에 고정되는
 * 분기가 있기 때문이다 (`auth` 의 `a11yAnnounceIos/Android.test.tsx` 선례).
 *
 * | # | 분기 | iOS |
 * |---|---|---|
 * | 1 | 시트의 `KeyboardAvoidingView behavior` | `padding` |
 * | 2 | 시트가 열린 동안의 화면 스와이프 백 | 끈다 |
 * | 3 | 확인 다이얼로그 버튼 배열 | 취소가 첫 자리 (시스템이 왼쪽에 놓는다) |
 * | 4 | 당겨서 새로고침 | 두 플랫폼에서 같은 경로로 동작한다 |
 *
 * 4번의 색 prop(`tintColor` ↔ `colors`)은 <b>코드에 분기가 없다</b> — 화면이 세 prop 을 모두
 * 넘기고 각 플랫폼이 자기 것만 본다. 게다가 RNTL 14 는 `UNSAFE_getByType` 을 없앴고
 * jest 의 `ScrollView` 는 `refreshControl` 을 호스트 트리에 그리지 않아 그 값을 읽을 수단이 없다.
 * 그래서 이 분기는 <b>동작</b>(당기면 다시 불러온다)으로 양쪽을 확인한다.
 */
import React from 'react';
import {Alert, Platform, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {fireEvent, render, screen} from '@testing-library/react-native';
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

test('이 파일은 iOS 경로를 탄다', () => {
  expect(Platform.OS).toBe('ios');
});

test('M20_시트의_키보드_회피는_iOS_에서_padding_이고_default_키가_채워져_있다', async () => {
  // `KeyboardAvoidingView` 의 `behavior` 는 화면에 보이는 결과가 없고, RNTL 14 는 타입으로
  // 컴포넌트를 찾는 `UNSAFE_*` 쿼리를 없앴다. 그래서 분기 자체(`Platform.select` 의 spec)를 본다 —
  // M-20 이 요구하는 것도 "`android` 또는 `default` 키를 채웠는가" 와 "양쪽 경로가 다른가" 다.
  const select = jest.spyOn(Platform, 'select');

  await render(
    <SafeAreaProvider
      initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 47, left: 0, right: 0, bottom: 34}}}>
      <BottomSheet visible avoidKeyboard accessibilityLabel="가입 신청" onClose={() => undefined}>
        <Text>내용</Text>
      </BottomSheet>
    </SafeAreaProvider>,
  );

  const spec = select.mock.calls
    .map(call => call[0] as Record<string, unknown>)
    .find(candidate => candidate.ios === 'padding');
  expect(spec).toBeDefined();
  // 반대쪽 키를 비워 두지 않는다 (M-20).
  expect('android' in (spec ?? {}) || 'default' in (spec ?? {})).toBe(true);
  expect(Platform.select(spec ?? {})).toBe('padding');
  select.mockRestore();
});

test('M20_시트가_열려_있으면_iOS_화면_스와이프_백을_끈다', () => {
  expect(sheetGestureEnabled(true)).toBe(false);
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
  // iOS 는 `style: 'cancel'` 을 시스템이 왼쪽에 놓는다. 배열 첫 자리에 두면 두 플랫폼이 같아진다.
  expect(buttons.map(button => button.text)).toEqual(['취소', '이용 정지']);
  expect(buttons[0].style).toBe('cancel');
  expect(buttons[1].style).toBe('destructive');
  alert.mockRestore();
});

test('M20_iOS_에서_당겨서_새로고침이_동작한다', async () => {
  let requests = 0;
  server.use(
    http.get(PENDING, () => {
      requests += 1;
      return HttpResponse.json({
        items: [],
        has_next: false,
        next_cursor: null,
        pending_approval_count: 0,
      });
    }),
  );

  await renderList();
  await screen.findByText('검토할 신청이 없어요', {}, {timeout: 3000});

  await fireEvent(screen.getByTestId('admin-pending-list'), 'refresh');

  expect(requests).toBe(2);
  // 색 prop(`tintColor` / `colors`)은 분기가 아니라 <b>둘 다 넘기는</b> 코드라 읽을 수단이 없다.
  // 위 파일 주석 참조 — 동작으로 확인한다.
});
