/**
 * 스모크 — <b>렌더링 크래시가 없는지만</b> 본다 (mobile-developer 역할 범위).
 *
 * 인수조건 검증(AC 별 동작, 오류 분기, 페이지네이션, 시트 흐름)은 mobile-tester 가 맡는다.
 * 여기서 그것까지 하면 두 역할의 테스트가 겹치고, 실패했을 때 누가 고칠지가 흐려진다.
 */
import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {AdminSettingsSection} from '../components/AdminSettingsSection';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';
import type {AdminRouteParams} from '../navigation';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;

const Stack = createNativeStackNavigator<AdminRouteParams>();

function renderList() {
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

test('가입 신청 관리 화면이 목록과 함께 뜬다', async () => {
  server.use(
    http.get(PENDING, () =>
      HttpResponse.json({
        items: [
          {
            user_id: 42,
            email: 'name@example.com',
            signup_reason_text: '여행 중 일정이 자주 바뀌어서 써보고 싶어요.',
            requested_at: '2026-09-05T05:20:00Z',
            is_me: false,
          },
        ],
        has_next: false,
        next_cursor: null,
        pending_approval_count: 3,
      }),
    ),
  );

  const {getByText} = await renderList();

  await waitFor(() => expect(getByText('name@example.com')).toBeTruthy());
  expect(getByText('검토 대기 3')).toBeTruthy();
  expect(getByText('처리 완료')).toBeTruthy();
});

test('설정의 관리자 섹션은 ADMIN 에게만 렌더된다', async () => {
  const {getByText, queryByText, rerender} = await render(
    <AdminSettingsSection
      account={{email: 'admin@example.com', role: 'ADMIN', status: 'APPROVED', pending_approval_count: 3}}
      onPress={jest.fn()}
    />,
  );
  expect(getByText('가입 신청 관리')).toBeTruthy();
  expect(getByText('3건')).toBeTruthy();

  await rerender(
    <AdminSettingsSection
      account={{email: 'name@example.com', role: 'USER', status: 'APPROVED', pending_approval_count: null}}
      onPress={jest.fn()}
    />,
  );
  expect(queryByText('가입 신청 관리')).toBeNull();
});
