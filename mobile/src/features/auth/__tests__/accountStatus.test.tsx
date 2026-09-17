/**
 * 계정 상태 안내 화면의 인수조건 검증 (PRD US-2 · US-5 · US-7 / design.md §7).
 *
 * 이 화면의 핵심 규칙은 <b>앱이 문구를 만들지 않는다</b> 는 것이다 (C-8 / AC-46) —
 * 그래서 목 데이터의 문구를 계약 example 과 다르게 바꿔도 화면에 그대로 나와야 한다.
 *
 * 네트워크를 타지 않는 화면이다. 요청이 나가면 `onUnhandledRequest: 'error'` 가 잡는다.
 */
import React from 'react';
import {Alert, Linking} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';

import {AccountDeleteScreen} from '../screens/AccountDeleteScreen';
import {AccountStatusScreen} from '../screens/AccountStatusScreen';
import {LegalDocumentScreen} from '../screens/LegalDocumentScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {useSession} from '../hooks/useSession';
import type {AuthRouteParams} from '../navigation';
import type {AccountStatusView} from '../types';
import {createTestQueryClient} from '../../../shared/test/queryClient';

const CONTACT_UNAVAILABLE = '문의 창구를 준비하고 있어요. 조금 뒤에 다시 확인해 주세요.';

/** 계약 `AccountBlockedProblem` 의 example 3종. */
const PENDING: AccountStatusView = {
  status: 'PENDING',
  title: '가입 신청을 검토하고 있어요',
  body: '관리자가 신청 내용을 확인하고 있어요. 확인에는 시간이 조금 걸릴 수 있어요.',
  highlight: {
    title: '승인되면 다시 로그인해 주세요',
    body: '따로 알림을 보내드리지 않아요. 나중에 앱을 열어 다시 로그인하면 승인 여부를 확인할 수 있어요.',
  },
  email: 'name@example.com',
  applied_at: '2026-08-26T02:14:05Z',
  support_contact_email: 'support@planbee.app',
};

const REJECTED: AccountStatusView = {
  ...PENDING,
  status: 'REJECTED',
  title: '가입이 승인되지 않았어요',
  body: '신청 내용을 확인했지만 이번에는 승인되지 않았어요. 이 계정으로는 로그인할 수 없어요.',
  highlight: {
    title: '다시 검토받고 싶거나 정보를 지우고 싶다면',
    body: '가입할 때 쓴 이메일 주소와 함께 아래로 알려주시면 확인 후 도와드릴게요.',
  },
};

const SUSPENDED: AccountStatusView = {
  ...PENDING,
  status: 'SUSPENDED',
  title: '이용이 정지된 계정이에요',
  body: '서비스 운영 정책에 따라 이 계정의 이용이 정지되었어요. 정지 중에는 로그인할 수 없어요.',
  highlight: {
    title: '정지에 이의가 있다면',
    body: '아래로 알려주시면 확인해 드릴게요. 자세한 기준은 이용약관 제8조에서 볼 수 있어요.',
  },
};

const Stack = createNativeStackNavigator<AuthRouteParams>();

async function renderStatus(
  accountStatus: AccountStatusView,
  deletionToken: string | null = null,
) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="AccountStatus">
          <Stack.Screen
            name="AccountStatus"
            component={AccountStatusScreen}
            initialParams={{accountStatus, deletionToken}}
          />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AccountDelete" component={AccountDeleteScreen} />
          <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useSession.setState({isSignedIn: false, notice: null, toast: null});
  jest.restoreAllMocks();
});

describe('세 변형 — AC-14 · AC-15 · AC-16', () => {
  test('AC14_PENDING_은_검토_중_문구와_행동_지시_카드를_보여준다', async () => {
    await renderStatus(PENDING);

    expect(screen.getByText(PENDING.title)).toBeTruthy();
    expect(screen.getByText(PENDING.body)).toBeTruthy();
    // AC-14 의 필수 요건 — 알림을 보내지 않으므로 "다시 로그인" 지시가 반드시 있어야 한다.
    expect(screen.getByText(PENDING.highlight.title)).toBeTruthy();
    expect(screen.getByText(PENDING.highlight.body)).toBeTruthy();
    // 신청 정보 행은 PENDING 에만 있다 (§7.2).
    expect(screen.getByLabelText('신청한 이메일, name@example.com')).toBeTruthy();
    expect(screen.getByLabelText(/^신청일, \d{4}\. \d{1,2}\. \d{1,2}\.$/)).toBeTruthy();
  });

  test('AC15_REJECTED_은_승인_안_됨_문구와_삭제_경로를_함께_보여준다', async () => {
    await renderStatus(REJECTED, 'deletion-token-1');

    expect(screen.getByText(REJECTED.title)).toBeTruthy();
    expect(screen.getByText(REJECTED.body)).toBeTruthy();
    expect(screen.getByText(REJECTED.highlight.title)).toBeTruthy();
    // AC-50 — 문의에 기대지 않는 출구.
    expect(screen.getByRole('button', {name: '계정 삭제'})).toBeTruthy();
    // 신청 정보 행은 PENDING 전용이다.
    expect(screen.queryByLabelText(/^신청한 이메일/)).toBeNull();
  });

  test('AC16_SUSPENDED_은_정지_문구를_보여주고_삭제_경로가_없다', async () => {
    await renderStatus(SUSPENDED);

    expect(screen.getByText(SUSPENDED.title)).toBeTruthy();
    expect(screen.getByText(SUSPENDED.highlight.title)).toBeTruthy();
    // 정지 회피를 막기 위해 앱 안 삭제 경로를 열지 않는다 (PRD 제약).
    expect(screen.queryByRole('button', {name: '계정 삭제'})).toBeNull();
    expect(screen.getByRole('button', {name: '이용약관 보기'})).toBeTruthy();
  });

  test('앱이_상태값으로_문구를_만들지_않는다', async () => {
    // 서버가 다른 문구를 내리면 화면도 그 문구를 그대로 보여준다 (C-8 / M-18).
    await renderStatus({
      ...PENDING,
      title: '검토가 조금 더 걸리고 있어요',
      body: '다음 주 화요일까지 안내드릴게요.',
    });

    expect(screen.getByText('검토가 조금 더 걸리고 있어요')).toBeTruthy();
    expect(screen.getByText('다음 주 화요일까지 안내드릴게요.')).toBeTruthy();
    expect(screen.queryByText(PENDING.title)).toBeNull();
  });

  test('신청일이_없으면_그_행을_그리지_않는다', async () => {
    await renderStatus({...PENDING, applied_at: null});

    expect(screen.getByLabelText('신청한 이메일, name@example.com')).toBeTruthy();
    expect(screen.queryByLabelText(/^신청일/)).toBeNull();
  });

  test('카탈로그에_없는_상태값이_와도_일반_안내로_처리한다', async () => {
    // M-13 — 앱이 죽지 않고 로그인 화면으로 나갈 수 있어야 한다 (§7.5 비어있음 ②).
    await renderStatus({...PENDING, status: 'HIBERNATED' as AccountStatusView['status']});

    expect(screen.getByText('계정 상태를 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', {name: '로그인 화면으로'})).toBeTruthy();
  });

  test('로그인_화면으로_돌아갈_수_있다', async () => {
    await renderStatus(SUSPENDED);

    await fireEvent.press(screen.getByRole('button', {name: '로그인 화면으로'}));

    expect(await screen.findByText(/Planbee는 승인제로 운영돼요/, {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('문의 주소 — AC-38 · AC-39 · AC-40 · AC-42 · AC-45', () => {
  test.each([
    ['AC40_PENDING', PENDING],
    ['AC38_REJECTED', REJECTED],
    ['AC39_SUSPENDED', SUSPENDED],
  ])('%s_화면에_서버가_내려준_문의_주소가_보인다', async (_name, status) => {
    await renderStatus(status);

    expect(screen.getByText('support@planbee.app')).toBeTruthy();
    expect(screen.getByLabelText('문의 이메일 주소, support@planbee.app')).toBeTruthy();
  });

  test('AC42_주소는_하드코딩이_아니라_응답값이다', async () => {
    // 계약 example 과 다른 주소를 내려도 그 값이 그대로 화면에 나와야 한다.
    await renderStatus({...REJECTED, support_contact_email: 'help@planbee.test'});

    expect(screen.getByText('help@planbee.test')).toBeTruthy();
    expect(screen.queryByText('support@planbee.app')).toBeNull();
  });

  test('AC45_주소는_단수_하나만_렌더된다', async () => {
    await renderStatus(REJECTED);

    // 주소 행이 여러 개 나열되지 않는다.
    expect(screen.getAllByLabelText(/^문의 이메일 주소, /)).toHaveLength(1);
  });

  test('AC38_문의하기를_누르면_그_화면의_제목으로_메일_작성기를_연다', async () => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    await renderStatus(REJECTED);
    await fireEvent.press(screen.getByLabelText('문의 이메일 주소, support@planbee.app'));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(canOpen).toHaveBeenCalled();
    expect(open.mock.calls[0][0]).toBe(
      `mailto:support@planbee.app?subject=${encodeURIComponent('[Planbee] 가입 문의')}`,
    );
  });

  test('메일_앱이_없으면_막다른_길_대신_주소를_안내한다', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderStatus(SUSPENDED);
    await fireEvent.press(screen.getByLabelText('문의 이메일 주소, support@planbee.app'));

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls[0][0]).toBe('메일 앱을 열 수 없어요');
    expect(alert.mock.calls[0][1]).toContain('support@planbee.app');
  });
});

describe('문의 주소가 없을 때 — AC-43 · AC-44', () => {
  test.each([
    ['PENDING', PENDING],
    ['REJECTED', REJECTED],
    ['SUSPENDED', SUSPENDED],
  ])('AC43_%s_에서_주소와_문의하기_대신_대체_안내가_뜬다', async (_name, status) => {
    await renderStatus({...status, support_contact_email: null});

    expect(screen.getByText(CONTACT_UNAVAILABLE)).toBeTruthy();
    expect(screen.queryByText('support@planbee.app')).toBeNull();
    expect(screen.queryByLabelText(/^문의 이메일 주소/)).toBeNull();
    expect(screen.queryByRole('button', {name: '문의하기'})).toBeNull();
  });

  // 세 화면의 대체 문구가 "글자 하나 다르지 않다" 는 것은 바로 위 세 테스트가
  // 같은 리터럴(CONTACT_UNAVAILABLE)로 각각 검증한다.

  test.each([
    ['PENDING', PENDING],
    ['REJECTED', REJECTED],
    ['SUSPENDED', SUSPENDED],
  ])('AC44_%s_에서_주소가_없어도_화면의_나머지는_정상이다', async (_name, status) => {
    await renderStatus({...status, support_contact_email: null});

    // 제목 · 본문 · 강조 카드가 그대로다.
    expect(screen.getByText(status.title)).toBeTruthy();
    expect(screen.getByText(status.body)).toBeTruthy();
    expect(screen.getByText(status.highlight.title)).toBeTruthy();
    // 주 버튼이 살아 있고 오류 화면으로 대체되지 않는다.
    const primary = screen.getByRole('button', {name: '로그인 화면으로'});
    expect(primary.props.accessibilityState.disabled).toBe(false);
  });

  test('AC44_주소가_없어도_로그인_화면으로_나갈_수_있다', async () => {
    await renderStatus({...REJECTED, support_contact_email: null});

    await fireEvent.press(screen.getByRole('button', {name: '로그인 화면으로'}));

    expect(await screen.findByText(/Planbee는 승인제로 운영돼요/, {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('REJECTED 의 계정 삭제 경로 — AC-50', () => {
  test('AC50_계정_삭제를_고르면_삭제_확인_화면이_열린다', async () => {
    await renderStatus(REJECTED, 'deletion-token-1');

    await fireEvent.press(screen.getByRole('button', {name: '계정 삭제'}));

    // AC-30 의 경고 문구가 있는 삭제 확인 화면이다.
    expect(await screen.findByText('계속하려면 비밀번호를 입력해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText(/삭제하면 되돌릴 수 없습니다/)).toBeTruthy();
  });

  test('AC50_삭제_링크에는_되돌릴_수_없다는_힌트가_붙는다', async () => {
    await renderStatus(REJECTED, 'deletion-token-1');

    expect(screen.getByRole('button', {name: '계정 삭제'}).props.accessibilityHint).toBe(
      '계정을 삭제하는 화면으로 이동합니다. 삭제하면 되돌릴 수 없습니다.',
    );
  });

  test('AC15_REJECTED_에서_개인정보_처리방침도_열_수_있다', async () => {
    await renderStatus(REJECTED, 'deletion-token-1');

    await fireEvent.press(screen.getByRole('button', {name: '개인정보 처리방침 보기'}));

    expect(
      await screen.findByText('이 문서는 앱에 함께 담겨 있어 인터넷 연결 없이도 볼 수 있어요.', {}, {timeout: 3000}),
    ).toBeTruthy();
  });
});
