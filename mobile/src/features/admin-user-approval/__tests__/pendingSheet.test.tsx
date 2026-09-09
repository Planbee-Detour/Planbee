/**
 * 신청 상세 시트의 인수조건 검증
 * (PRD AC-10 · AC-14 · AC-15 · AC-16 · AC-17 · AC-34 / design.md §6).
 *
 * 조작은 <b>전부 이 시트 안에서</b> 한다 (결정 3) — 목록 행에는 버튼이 없다.
 * 경합(AC-12)은 회귀 지점이라 `conflict.test.tsx` 에서 따로 본다.
 */

// 시간대는 `jest.config.js` 에서 `Asia/Seoul` 로 고정한다 — 표기 예시는 그 기준이다 (§3.3).

import React from 'react';
import {fireEvent, render, screen, userEvent, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';
import {Text} from 'react-native';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const APPROVE = `${API_ORIGIN}/api/v1/admin/users/42/approve`;
const REJECT = `${API_ORIGIN}/api/v1/admin/users/42/reject`;

const ITEM = {
  user_id: 42,
  email: 'name@example.com',
  signup_reason_text: '여행 중 일정이 자주 바뀌어서 써보고 싶어요.',
  requested_at: '2026-09-05T05:20:00Z',
  is_me: false,
};

/** 처리 전에는 1건, 처리 뒤에는 빈 목록을 내린다 — §5.11 의 "항목 제거" 를 서버 재조회로 확인한다. */
function pendingHandler(state: {processed: boolean}) {
  return http.get(PENDING, () =>
    HttpResponse.json({
      items: state.processed ? [] : [ITEM],
      has_next: false,
      next_cursor: null,
      pending_approval_count: state.processed ? 0 : 1,
    }),
  );
}

/** `ProcessedUserActionResult` — contract.yaml 의 example 형태. */
const actionResult = (pendingCount: number) => ({
  pending_approval_count: pendingCount,
  user: {
    user_id: 42,
    email: 'name@example.com',
    status: 'APPROVED',
    status_label: '승인됨',
    processed_at: '2026-09-09T00:00:00Z',
    processed_at_prefix: '승인',
    approved_at: '2026-09-09T00:00:00Z',
    suspended_at: null,
    rejected_at: null,
    is_me: false,
  },
});

const Stack = createNativeStackNavigator<{Settings: undefined; UserApprovalList: undefined}>();

function SettingsStub() {
  return <Text>설정 화면</Text>;
}

async function renderList() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        initialState={{routes: [{name: 'Settings'}, {name: 'UserApprovalList'}]}}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Settings" component={SettingsStub} />
          <Stack.Screen name="UserApprovalList" component={UserApprovalListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

/**
 * 스크림(시트 밖 배경)을 누른다 — 시트를 닫는 세 경로 중 하나다 (§6.1).
 *
 * `includeHiddenElements` 를 켜는 이유: 스크림은 `Animated` opacity 로 0 → 1 이 되는데
 * `useNativeDriver: true` 라 jest 환경에서는 JS 쪽 값이 0에 머문다. RNTL 은 `opacity: 0` 인
 * 요소를 접근성에서 숨은 것으로 보고 기본 쿼리에서 제외한다 — 실기기에서는 보이는 요소다.
 */
async function pressScrim() {
  await fireEvent.press(screen.getByLabelText('닫기', {includeHiddenElements: true}));
}

/** 목록에서 행을 탭해 시트를 연다 (결정 3 / §2.3 전이표). */
async function openSheet() {
  await renderList();
  await screen.findByText('name@example.com', {}, {timeout: 3000});
  await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);
  await screen.findByText('가입 신청', {}, {timeout: 3000});
}

describe('시트 열기 — design.md §6.3 (결정 3)', () => {
  test('목록_행에는_버튼이_없고_행을_탭해야_조작할_수_있다', async () => {
    server.use(pendingHandler({processed: false}));

    await renderList();
    await screen.findByText('name@example.com', {}, {timeout: 3000});

    // 목록에는 승인·거절 버튼이 없다.
    expect(screen.queryByRole('button', {name: '승인'})).toBeNull();
    expect(screen.queryByRole('button', {name: '거절'})).toBeNull();

    await fireEvent.press(screen.getAllByHintText('두 번 눌러 상세를 엽니다')[0]);

    expect(await screen.findByText('가입 신청', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByRole('button', {name: '승인'})).toBeTruthy();
    expect(screen.getByRole('button', {name: '거절'})).toBeTruthy();
  });

  test('시트는_목록_응답의_값만으로_그려진다', async () => {
    // 시트를 열 때 추가 조회를 하지 않는다 (C-8 / §6.9). 요청이 하나도 늘지 않는지 센다.
    let requests = 0;
    server.use(
      http.get(PENDING, () => {
        requests += 1;
        return HttpResponse.json({
          items: [ITEM],
          has_next: false,
          next_cursor: null,
          pending_approval_count: 1,
        });
      }),
    );

    await openSheet();

    expect(requests).toBe(1);
    expect(screen.getByText('이메일')).toBeTruthy();
    expect(screen.getByText('가입 사유')).toBeTruthy();
    expect(screen.getByText('신청 시각')).toBeTruthy();
    expect(screen.getByText('2026. 9. 5. 14:20')).toBeTruthy();
  });
});

describe('승인 — AC-10 · AC-14 (design.md §6.5 · §6.6 · §6.7)', () => {
  test('AC10_승인하면_시트가_닫히고_토스트가_뜨며_항목이_대기_목록에서_사라진다', async () => {
    const state = {processed: false};
    server.use(
      pendingHandler(state),
      http.post(APPROVE, () => {
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();

    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(await screen.findByText('승인했어요', {}, {timeout: 3000})).toBeTruthy();
    // 목록은 서버 재조회로 갱신된다 — 앱이 낙관적으로 지우지 않는다 (§6.5 · §5.11).
    await waitFor(() => expect(screen.queryByText('name@example.com')).toBeNull());
    expect(screen.getByText('검토할 신청이 없어요')).toBeTruthy();
    // 건수도 서버 값으로 갱신된다 — 앱이 ±1 하지 않는다 (AC-32).
    expect(screen.getByText('검토 대기')).toBeTruthy();
  });

  test('처리_중에는_라벨이_승인_중_으로_바뀌고_시트를_닫을_수_없다', async () => {
    // 처리 중 상태를 볼 시간을 벌기 위해 응답을 늦춘다. 끝나지 않는 응답으로 고정하는 방법은
    // 쓸 수 없다 — RNTL 의 `act` 가 진행 중인 요청이 끝날 때까지 반환하지 않는다.
    server.use(
      pendingHandler({processed: false}),
      http.post(APPROVE, async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, 300);
        });
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(screen.getByRole('button', {name: '승인 중…'})).toBeTruthy();
    // 스크림을 눌러도 닫히지 않는다 (§6.5) — 되돌릴 수 없는 처리 중에 떠나면 결과를 알 수 없다.
    await pressScrim();
    expect(screen.getByText('가입 신청')).toBeTruthy();
    expect(screen.getByRole('button', {name: '승인 중…'})).toBeTruthy();

    expect(await screen.findByText('승인했어요', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC14_네트워크가_끊기면_아직_처리되지_않았어요_배너가_뜨고_항목은_목록에_남는다', async () => {
    server.use(pendingHandler({processed: false}), http.post(APPROVE, () => HttpResponse.error()));

    await openSheet();

    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(await screen.findByTestId('admin-action-error', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('연결을 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('아직 처리되지 않았어요. 연결 후 다시 시도해 주세요.')).toBeTruthy();
    // 시트는 열린 채로 남고 승인 버튼도 다시 활성이다 (§6.7).
    expect(screen.getByRole('button', {name: '승인'})).toBeTruthy();
    // 토스트로 대체하지 않는다 (§3.2).
    expect(screen.queryByText('승인했어요')).toBeNull();

    // 실패 뒤에는 다시 닫을 수 있고, 항목은 대기 목록에 그대로 있다 (AC-14 의 핵심 요건).
    await pressScrim();
    expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC14_서버_500_이면_아직_처리되지_않았어요_와_다시_시도로_같은_요청을_다시_보낸다', async () => {
    const state = {processed: false};
    let attempt = 0;
    server.use(
      pendingHandler(state),
      http.post(APPROVE, () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500});
        }
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(await screen.findByText('잠시 후 다시 시도해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('아직 처리되지 않았어요.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('승인했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(attempt).toBe(2);
  });

  test('AC3_승인에서_403_ADMIN_FORBIDDEN_이_오면_시트가_닫히고_권한_없음_화면이_된다', async () => {
    server.use(
      pendingHandler({processed: false}),
      http.post(APPROVE, () =>
        HttpResponse.json(problemBody({status: 403, code: 'ADMIN_FORBIDDEN'}), {status: 403}),
      ),
    );

    await openSheet();

    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    // 분기는 `code` 로만 한다 (M-13 / C-1). §6.7 배너가 아니라 화면 전체가 §5.10 이 된다.
    expect(await screen.findByText('관리자만 볼 수 있어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('가입 신청')).toBeNull();
  });

  test('AC34_가입_사유가_없는_신청도_같은_경로로_승인된다', async () => {
    const state = {processed: false};
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json({
          items: state.processed ? [] : [{...ITEM, signup_reason_text: '입력하지 않음'}],
          has_next: false,
          next_cursor: null,
          pending_approval_count: state.processed ? 0 : 1,
        }),
      ),
      http.post(APPROVE, () => {
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();

    // 시트에서도 서버가 내린 문자열이 그대로, 다른 항목과 같은 자리에 있다 (AC-33 / §6.3).
    expect(screen.getAllByText('입력하지 않음').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('button', {name: '승인'}));

    expect(await screen.findByText('승인했어요', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('거절 — AC-15 · AC-17 (design.md §6.4)', () => {
  test('AC15_거절은_확인_단계를_한_번_거친_뒤_목록에서_사라진다', async () => {
    const state = {processed: false};
    server.use(
      pendingHandler(state),
      http.post(REJECT, () => {
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();

    await fireEvent.press(screen.getByRole('button', {name: '거절'}));

    // 이 단계 자체가 AC-15 의 확인 단계다 — 위에 시스템 다이얼로그를 또 띄우지 않는다 (§1.2 e).
    expect(await screen.findByText('이 신청을 거절할까요?', {}, {timeout: 3000})).toBeTruthy();
    expect(
      screen.getByText('거절하면 이 사용자는 로그인할 수 없어요. 나중에 거절을 취소할 수 있어요.'),
    ).toBeTruthy();
    expect(screen.getByText('거절 사유')).toBeTruthy();
    expect(screen.getByText('선택')).toBeTruthy();
    expect(screen.getByText('관리자만 볼 수 있어요. 200자까지 쓸 수 있어요.')).toBeTruthy();
    expect(screen.getByText('0/200')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: '거절하기'}));

    expect(await screen.findByText('거절했어요', {}, {timeout: 3000})).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('name@example.com')).toBeNull());
    expect(screen.getByText('검토할 신청이 없어요')).toBeTruthy();
  });

  test('AC17_사유를_비워도_거절하기는_활성이고_정상_처리된다', async () => {
    const state = {processed: false};
    let body: unknown;
    server.use(
      pendingHandler(state),
      http.post(REJECT, async ({request}) => {
        body = await request.json();
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));

    const confirm = screen.getByRole('button', {name: '거절하기'});
    // 선택 입력이므로 버튼 활성 조건이 아니다 (AC-17 / §6.4).
    expect(confirm.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(confirm);

    expect(await screen.findByText('거절했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(body).toEqual({rejection_reason: null});
  });

  test('AC15_뒤로를_누르면_기본_단계로_돌아가고_입력한_사유는_유지된다', async () => {
    server.use(pendingHandler({processed: false}));

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await fireEvent.changeText(screen.getByLabelText('거절 사유'), '신청 내용이 서비스 목적과 달라요.');
    expect(screen.getByText('19/200')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: '뒤로'}));

    expect(await screen.findByText('가입 신청', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByRole('button', {name: '승인'})).toBeTruthy();

    // 다시 "거절" 을 누르면 쓰던 내용이 그대로 있다 (§6.4).
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    expect(screen.getByLabelText('거절 사유').props.value).toBe('신청 내용이 서비스 목적과 달라요.');
    expect(screen.getByText('19/200')).toBeTruthy();
  });

  test('거절_사유를_적으면_그대로_요청에_실린다', async () => {
    const state = {processed: false};
    let body: unknown;
    server.use(
      pendingHandler(state),
      http.post(REJECT, async ({request}) => {
        body = await request.json();
        state.processed = true;
        return HttpResponse.json(actionResult(0));
      }),
    );

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await fireEvent.changeText(screen.getByLabelText('거절 사유'), '신청 내용만으로는 확인이 어려웠어요.');
    await fireEvent.press(screen.getByRole('button', {name: '거절하기'}));

    await screen.findByText('거절했어요', {}, {timeout: 3000});
    expect(body).toEqual({rejection_reason: '신청 내용만으로는 확인이 어려웠어요.'});
  });
});

describe('거절 사유 200자 — AC-16 (design.md §6.4)', () => {
  test('AC16_200자에서_한_글자를_더_입력하면_반영되지_않고_카운터는_200_200_을_유지한다', async () => {
    server.use(pendingHandler({processed: false}));
    const user = userEvent.setup();

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));

    const field = screen.getByLabelText('거절 사유');
    await fireEvent.changeText(field, 'ㄱ'.repeat(199));
    expect(screen.getByText('199/200')).toBeTruthy();

    // 실제 입력으로 두 글자를 더 친다. 200자에서 막히는 것은 `maxLength` 가 한다 —
    // `userEvent.type` 은 그 제약을 플랫폼과 같게 지킨다 (`fireEvent.changeText` 는 우회한다).
    await user.type(field, 'ㄴㄷ', {skipPress: true, skipBlur: true});

    expect(screen.getByText('200/200')).toBeTruthy();
    expect(String(screen.getByLabelText('거절 사유').props.value)).toHaveLength(200);
    // 오류 문구를 띄우지 않는다 — 차단 자체가 피드백이다 (§6.4).
    expect(screen.queryByTestId('admin-action-error')).toBeNull();
  });

  test('AC16_서버가_rejection_reason_검증_오류를_주면_입력_필드_오류로_보인다', async () => {
    server.use(
      pendingHandler({processed: false}),
      http.post(REJECT, () =>
        HttpResponse.json(
          problemBody({
            status: 400,
            code: 'VALIDATION_FAILED',
            errors: [
              {field: 'rejection_reason', code: 'SIZE', message: '거절 사유는 200자까지 쓸 수 있어요'},
            ],
          }),
          {status: 400},
        ),
      ),
    );

    await openSheet();
    await fireEvent.press(screen.getByRole('button', {name: '거절'}));
    await fireEvent.changeText(screen.getByLabelText('거절 사유'), '사유');

    await fireEvent.press(screen.getByRole('button', {name: '거절하기'}));

    // 필드 오류는 배너가 아니라 입력란 아래에 붙는다 (M-13 / auth §2.4 의 3단계 중 필드 오류).
    expect(
      await screen.findByText('거절 사유는 200자까지 쓸 수 있어요', {}, {timeout: 3000}),
    ).toBeTruthy();
    expect(screen.queryByTestId('admin-action-error')).toBeNull();
    // 거절 단계에 그대로 머문다.
    expect(screen.getByRole('button', {name: '거절하기'})).toBeTruthy();
  });
});
