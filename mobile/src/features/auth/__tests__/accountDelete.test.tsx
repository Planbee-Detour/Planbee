/**
 * 계정 삭제 확인 화면의 인수조건 검증 (PRD US-5 / design.md §9).
 * AC-29 · AC-30 · AC-31 · AC-32 · AC-50.
 *
 * 되돌릴 수 없는 행동이라 <b>비밀번호 재확인(AC-29)과 경고 문구(AC-30)가 유일한 안전장치다.</b>
 * 그래서 "요청이 나가지 않는 것" 을 확인하는 테스트가 여기서는 본질이다.
 */
import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {clearTokens, loadTokens, saveTokens} from '../../../shared/api/session';
import {AccountDeleteScreen} from '../screens/AccountDeleteScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {useSession} from '../hooks/useSession';
import type {AccountDeleteOrigin, MainRouteParams} from '../navigation';

const ME = `${API_ORIGIN}/api/v1/auth/me`;

const Stack = createNativeStackNavigator<MainRouteParams & {Login: undefined}>();

async function renderDelete(params: {deletionToken?: string; origin: AccountDeleteOrigin}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="AccountDelete">
          <Stack.Screen name="AccountDelete" component={AccountDeleteScreen} initialParams={params} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const deleteButton = () => screen.getByRole('button', {name: '계정 삭제'});

async function pressAlertButton(alert: jest.SpyInstance, label: string) {
  const buttons = alert.mock.calls[0][2] as Array<{text: string; onPress?: () => void}>;
  await buttons.find(entry => entry.text === label)?.onPress?.();
}

/** 비밀번호를 넣고 삭제 → 확인 다이얼로그의 "삭제" 까지 누른다. */
async function confirmDelete(password = 'planbee2026') {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), password);
  await fireEvent.press(deleteButton());
  await pressAlertButton(alert, '삭제');
  return alert;
}

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: true, notice: null, toast: null});
  jest.restoreAllMocks();
});

describe('안전장치 — AC-29 · AC-30', () => {
  test('AC30_진입하면_되돌릴_수_없다는_경고가_먼저_보인다', async () => {
    await renderDelete({origin: 'settings'});

    expect(screen.getByText(/삭제하면 되돌릴 수 없습니다/)).toBeTruthy();
    expect(screen.getByText('계정을 삭제하면 아래 정보가 즉시 지워져요.')).toBeTruthy();
    expect(screen.getByText('· 약관 동의 이력')).toBeTruthy();
    expect(screen.getByText('지운 정보는 복구할 수 없어요.')).toBeTruthy();
  });

  test('AC29_비밀번호가_비어_있으면_삭제_요청이_나가지_않는다', async () => {
    let calls = 0;
    server.use(http.delete(ME, () => {
      calls += 1;
      return new HttpResponse(null, {status: 204});
    }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderDelete({origin: 'settings'});

    expect(deleteButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(deleteButton());

    expect(alert).not.toHaveBeenCalled();
    expect(calls).toBe(0);
    expect(useSession.getState().isSignedIn).toBe(true);
  });

  test('AC29_비밀번호를_넣어도_확인_다이얼로그_전에는_요청이_나가지_않는다', async () => {
    let calls = 0;
    server.use(http.delete(ME, () => {
      calls += 1;
      return new HttpResponse(null, {status: 204});
    }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderDelete({origin: 'settings'});
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
    await fireEvent.press(deleteButton());

    // 다이얼로그가 떴을 뿐 아직 요청은 없다 (§9.5).
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('정말 삭제할까요?');
    expect(alert.mock.calls[0][1]).toBe('삭제하면 되돌릴 수 없습니다');
    expect(calls).toBe(0);

    // 취소하면 그대로 남는다.
    await pressAlertButton(alert, '취소');
    expect(calls).toBe(0);
  });

  test('AC32_같은_이메일로_재신청할_수_있다는_안내가_있다', async () => {
    await renderDelete({origin: 'settings'});

    expect(screen.getByText(/같은 이메일로 다시 가입을 신청할 수는 있어요/)).toBeTruthy();
  });
});

describe('삭제 실행 — AC-31 · AC-50', () => {
  test('AC31_로그인된_사용자는_저장된_액세스_토큰으로_삭제하고_로그인_화면으로_나간다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    let authorization: string | null = null;
    let body: unknown = null;
    server.use(http.delete(ME, async ({request}) => {
      authorization = request.headers.get('Authorization');
      body = await request.json();
      return new HttpResponse(null, {status: 204});
    }));

    await renderDelete({origin: 'settings'});
    await confirmDelete();

    expect(await screen.findByText(/Planbee는 승인제로 운영돼요/, {}, {timeout: 3000})).toBeTruthy();
    expect(authorization).toBe('Bearer access-1');
    expect(body).toEqual({password: 'planbee2026'});
    // 기기의 토큰이 지워지고 완료 토스트가 뜬다 (§9.6).
    await expect(loadTokens()).resolves.toBeNull();
    expect(useSession.getState().isSignedIn).toBe(false);
    expect(screen.getByText('계정이 삭제되었어요')).toBeTruthy();
  });

  test('AC50_REJECTED_경로는_삭제_전용_토큰을_그_요청에만_붙인다', async () => {
    // 세션이 없는 경로다 — 저장된 토큰이 없어도 삭제가 성립해야 한다.
    let authorization: string | null = null;
    server.use(http.delete(ME, ({request}) => {
      authorization = request.headers.get('Authorization');
      return new HttpResponse(null, {status: 204});
    }));

    await renderDelete({origin: 'status', deletionToken: 'deletion-token-1'});
    await confirmDelete();

    expect(await screen.findByText(/Planbee는 승인제로 운영돼요/, {}, {timeout: 3000})).toBeTruthy();
    expect(authorization).toBe('Bearer deletion-token-1');
  });

  // 두 진입 경로의 화면은 완전히 같다 (§9.1) — 달라지는 것은 붙는 토큰뿐이다.
  test.each([
    ['status', {origin: 'status' as const, deletionToken: 'deletion-token-1'}],
    ['settings', {origin: 'settings' as const}],
  ])('AC50_%s_에서_들어와도_같은_화면이다', async (_name, params) => {
    await renderDelete(params);

    expect(screen.getByText(/삭제하면 되돌릴 수 없습니다/)).toBeTruthy();
    expect(screen.getByText('계속하려면 비밀번호를 입력해 주세요')).toBeTruthy();
    expect(screen.getByRole('button', {name: '취소'})).toBeTruthy();
  });
});

describe('오류 — §9.7', () => {
  test('비밀번호가_틀리면_필드_오류로_알리고_삭제하지_않는다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    server.use(http.delete(ME, () =>
      HttpResponse.json(
        problemBody({status: 401, code: 'AUTH_PASSWORD_MISMATCH', detail: '비밀번호를 확인해 주세요.'}),
        {status: 401},
      ),
    ));

    await renderDelete({origin: 'settings'});
    await confirmDelete('wrong-password');

    expect(await screen.findByText('비밀번호를 확인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    // 화면은 그대로고 세션도 살아 있다.
    expect(screen.getByText('계속하려면 비밀번호를 입력해 주세요')).toBeTruthy();
    expect(useSession.getState().isSignedIn).toBe(true);
    await expect(loadTokens()).resolves.not.toBeNull();
    // 다시 입력을 요구한다 (§9.4).
    expect(screen.getByLabelText('비밀번호').props.value).toBe('');
  });

  test('네트워크가_끊기면_계정은_삭제되지_않았다고_분명히_말한다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    server.use(http.delete(ME, () => HttpResponse.error()));

    await renderDelete({origin: 'settings'});
    await confirmDelete();

    await screen.findByTestId('delete-error', {}, {timeout: 3000});
    expect(screen.getByText('연결을 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('계정은 삭제되지 않았어요. 연결 후 다시 시도해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
    expect(useSession.getState().isSignedIn).toBe(true);
  });

  test('서버_500도_계정은_삭제되지_않았다고_말한다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    server.use(http.delete(ME, () =>
      HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
    ));

    await renderDelete({origin: 'settings'});
    await confirmDelete();

    await screen.findByTestId('delete-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
    expect(screen.getByText('계정은 삭제되지 않았어요.')).toBeTruthy();
    // 비밀번호는 비워 재입력을 요구한다 (§9.7).
    expect(screen.getByLabelText('비밀번호').props.value).toBe('');
  });

  test('실패_뒤_다시_시도는_확인_다이얼로그를_한_번_더_거친다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    let attempt = 0;
    server.use(http.delete(ME, () => {
      attempt += 1;
      return attempt === 1
        ? HttpResponse.error()
        : new HttpResponse(null, {status: 204});
    }));

    await renderDelete({origin: 'settings'});
    const alert = await confirmDelete();
    await screen.findByTestId('delete-error', {}, {timeout: 3000});

    alert.mockClear();
    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('정말 삭제할까요?');
  });
});
