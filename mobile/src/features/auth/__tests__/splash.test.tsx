/**
 * 스플래시 / 세션 복원의 인수조건 검증 (PRD US-3 / design.md §3).
 * AC-20 · AC-21 · AC-23 · AC-24 · AC-25 + §3.4 네트워크 오류.
 *
 * 갱신 거부 4종(`EXPIRED` / `INVALID` / `REUSED` / `REVOKED`)에서 만료 배너와 보안 배너가
 * 갈리는 것이 이 파일의 핵심이다 — 사용자에게 보이는 문장이 달라야 한다 (§4.3).
 */
import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {clearTokens, loadTokens, saveTokens} from '../../../shared/api/session';
import {AccountStatusScreen} from '../screens/AccountStatusScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SplashScreen} from '../screens/SplashScreen';
import {useSession} from '../hooks/useSession';
import type {AuthRouteParams} from '../navigation';

const REFRESH = `${API_ORIGIN}/api/v1/auth/token/refresh`;

const RENEWED = {
  access_token: 'access-token-2',
  refresh_token: 'refresh-token-2',
  token_type: 'Bearer',
  expires_in: 1800,
};

const PENDING_STATUS = {
  status: 'PENDING' as const,
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

const LOGIN_MARKER = /Planbee는 승인제로 운영돼요/;

const Stack = createNativeStackNavigator<AuthRouteParams>();

async function renderSplash() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: false, notice: null, toast: null});
});

describe('세션 복원 — AC-20 · AC-21', () => {
  test('AC20_유효한_리프레시가_있으면_로그인_화면을_거치지_않는다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => HttpResponse.json(RENEWED)));

    await renderSplash();

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
    // 로그인 화면은 한 번도 나타나지 않는다.
    expect(screen.queryByText(LOGIN_MARKER)).toBeNull();
    // 회전된 새 토큰이 저장된다.
    await expect(loadTokens()).resolves.toEqual({
      accessToken: RENEWED.access_token,
      refreshToken: RENEWED.refresh_token,
    });
  });

  test('AC21_저장된_토큰이_없으면_배너_없이_로그인_화면이_뜬다', async () => {
    // 요청이 나가면 msw 의 onUnhandledRequest:error 가 잡는다 — 갱신을 시도하지 않는 것이 옳다.
    await renderSplash();

    expect(await screen.findByText(LOGIN_MARKER, {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByTestId('session-banner')).toBeNull();
    expect(useSession.getState().isSignedIn).toBe(false);
  });

  test('복원_중에는_로딩_표시가_보인다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, async () => {
      await new Promise<void>(resolve => {setTimeout(resolve, 150);});
      return HttpResponse.json(RENEWED);
    }));

    await renderSplash();

    expect(screen.getByLabelText('불러오는 중')).toBeTruthy();
    // 진입 안내를 스크린리더에 한 번 읽어준다 (§3.5).
    expect(screen.getByLabelText('Planbee 를 준비하고 있어요')).toBeTruthy();

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
  });
});

describe('갱신 거부 — AC-23 · AC-24 · AC-25', () => {
  const rejected = (code: string) =>
    HttpResponse.json(problemBody({status: 401, code}), {status: 401});

  test.each([
    ['AC25_EXPIRED', 'AUTH_REFRESH_TOKEN_EXPIRED'],
    ['AC23_INVALID', 'AUTH_REFRESH_TOKEN_INVALID'],
  ])('%s_는_만료_배너와_함께_로그인_화면으로_보낸다', async (_name, code) => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => rejected(code)));

    await renderSplash();

    expect(await screen.findByText('다시 로그인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('오랫동안 앱을 열지 않아 자동으로 로그아웃됐어요.')).toBeTruthy();
    // 보안 배너 문구는 나오지 않는다.
    expect(
      screen.queryByText('보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요.'),
    ).toBeNull();
    await expect(loadTokens()).resolves.toBeNull();
  });

  test.each([
    ['AC24_REUSED', 'AUTH_REFRESH_TOKEN_REUSED'],
    ['AC24_REVOKED', 'AUTH_REFRESH_TOKEN_REVOKED'],
  ])('%s_는_보안_배너와_함께_로그인_화면으로_보낸다', async (_name, code) => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => rejected(code)));

    await renderSplash();

    expect(
      await screen.findByText(
        '보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요.',
        {},
        {timeout: 3000},
      ),
    ).toBeTruthy();
    // 만료 배너의 부연을 붙이지 않는다 — 원인이 다르다 (§4.3).
    expect(screen.queryByText('오랫동안 앱을 열지 않아 자동으로 로그아웃됐어요.')).toBeNull();
    await expect(loadTokens()).resolves.toBeNull();
  });

  test('AC24_다른_기기에서_거부된_경우에도_저장된_토큰을_지운다', async () => {
    // 재사용이 감지된 계정의 다른 기기는 REVOKED 를 받는다 (계약 401 표).
    await saveTokens({accessToken: 'old-access', refreshToken: 'other-device-token'});
    server.use(http.post(REFRESH, () => rejected('AUTH_REFRESH_TOKEN_REVOKED')));

    await renderSplash();

    await screen.findByText(LOGIN_MARKER, {}, {timeout: 3000});
    await expect(loadTokens()).resolves.toBeNull();
    expect(useSession.getState().isSignedIn).toBe(false);
  });

  test('알_수_없는_거부_코드는_만료로_취급하고_앱이_죽지_않는다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => rejected('AUTH_REFRESH_TOKEN_SOMETHING_NEW')));

    await renderSplash();

    expect(await screen.findByText('다시 로그인해 주세요', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('갱신 중 계정 상태가 바뀐 경우', () => {
  test('403_계정_차단은_로그아웃이_아니라_상태_안내로_보낸다', async () => {
    // 승인 취소·정지가 액세스 토큰 수명 안에 반영되는 경로다 (계약 /token/refresh 403).
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () =>
      HttpResponse.json(
        {...problemBody({status: 403, code: 'AUTH_ACCOUNT_PENDING'}), account_status: PENDING_STATUS},
        {status: 403},
      ),
    ));

    await renderSplash();

    expect(await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000})).toBeTruthy();
    await expect(loadTokens()).resolves.toBeNull();
    expect(screen.queryByText(LOGIN_MARKER)).toBeNull();
  });
});

describe('네트워크 오류 — §3.4', () => {
  test('연결이_끊기면_스플래시에_머물고_토큰을_지우지_않는다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => HttpResponse.error()));

    await renderSplash();

    expect(await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('네트워크에 연결되면 이어서 진행할게요.')).toBeTruthy();
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
    expect(screen.getByRole('button', {name: '로그인 화면으로'})).toBeTruthy();
    // 연결이 불안정하다는 이유로 로그아웃시키지 않는다.
    await expect(loadTokens()).resolves.toEqual({
      accessToken: 'old-access',
      refreshToken: 'refresh-token-1',
    });
    expect(screen.queryByText(LOGIN_MARKER)).toBeNull();
  });

  test('다시_시도가_성공하면_세션이_복원된다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    let attempt = 0;
    server.use(http.post(REFRESH, () => {
      attempt += 1;
      return attempt === 1 ? HttpResponse.error() : HttpResponse.json(RENEWED);
    }));

    const {getByRole} = await renderSplash();
    await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000});

    await fireEvent.press(getByRole('button', {name: '다시 시도'}));

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
    expect(attempt).toBe(2);
  });

  test('로그인_화면으로_를_누르면_토큰을_지우지_않고_이동한다', async () => {
    await saveTokens({accessToken: 'old-access', refreshToken: 'refresh-token-1'});
    server.use(http.post(REFRESH, () => HttpResponse.error()));

    await renderSplash();
    await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '로그인 화면으로'}));

    expect(await screen.findByText(LOGIN_MARKER, {}, {timeout: 3000})).toBeTruthy();
    // 다른 계정으로 들어가려는 경우다 — 기존 토큰은 그대로 둔다 (§3.4).
    await expect(loadTokens()).resolves.toEqual({
      accessToken: 'old-access',
      refreshToken: 'refresh-token-1',
    });
  });
});
