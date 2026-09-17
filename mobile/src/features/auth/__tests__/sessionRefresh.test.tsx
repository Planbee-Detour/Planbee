/**
 * 무음 토큰 갱신의 인수조건 검증 (PRD US-3 / design.md §2.6).
 * AC-22 · AC-24 · AC-25.
 *
 * 액세스 토큰이 만료된 상태에서 인증이 필요한 API 를 부르면, 앱은 사용자에게 아무것도 묻지 않고
 * 한 번 갱신한 뒤 원래 요청을 재시도한다. 이 배선은 `app/configureSession.ts` 에 있고
 * 화면에서 보이는 결과(로그인 화면이 나타나지 않는 것)로 검증한다.
 */
import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {configureAuth} from '../../../shared/api/client';
import {clearTokens, loadTokens, saveTokens} from '../../../shared/api/session';
import {configureSession} from '../../../app/configureSession';
import {SettingsScreen} from '../screens/SettingsScreen';
import {useSession} from '../hooks/useSession';
import type {MainRouteParams} from '../navigation';

const ME = `${API_ORIGIN}/api/v1/auth/me`;
const REFRESH = `${API_ORIGIN}/api/v1/auth/token/refresh`;

const RENEWED = {
  access_token: 'access-2',
  refresh_token: 'refresh-2',
  token_type: 'Bearer',
  expires_in: 1800,
};

const Stack = createNativeStackNavigator<MainRouteParams>();

async function renderSettings() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Settings">
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: true, notice: null, toast: null});
  configureSession();
});

afterEach(() => {
  // 다른 테스트 파일이 갱신 배선을 물려받지 않도록 되돌린다.
  configureAuth({});
});

test('AC22_액세스_토큰이_만료되면_조용히_갱신하고_원래_요청을_재시도한다', async () => {
  await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});
  let refreshCalls = 0;
  let meAttempts = 0;

  server.use(
    http.get(ME, ({request}) => {
      meAttempts += 1;
      if (request.headers.get('Authorization') !== `Bearer ${RENEWED.access_token}`) {
        return HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401});
      }
      return HttpResponse.json({email: 'name@example.com', role: 'USER', status: 'APPROVED'});
    }),
    http.post(REFRESH, () => {
      refreshCalls += 1;
      return HttpResponse.json(RENEWED);
    }),
  );

  await renderSettings();

  // 원래 요청이 성공한 결과가 화면에 나타난다.
  expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
  expect(refreshCalls).toBe(1);
  expect(meAttempts).toBe(2);
  // 사용자에게 로그인 화면도 오류도 보이지 않는다.
  expect(useSession.getState().isSignedIn).toBe(true);
  expect(screen.queryByText('불러오지 못했어요')).toBeNull();
  // 회전된 토큰이 저장된다.
  await expect(loadTokens()).resolves.toEqual({
    accessToken: RENEWED.access_token,
    refreshToken: RENEWED.refresh_token,
  });
});


/**
 * <b>아래 세 개는 결함 `D-T1` 의 회귀 테스트다 (해소됨 — 2026-08-27).</b>
 *
 * 갱신 요청 자체가 401 을 받으면 `authFetch` 가 그 응답을 보고 <b>다시</b> 갱신을 시도했고,
 * 이미 진행 중인 갱신 프라미스(`refreshInFlight`)를 기다리게 되어 그 프라미스가 영원히 끝나지
 * 않았다. 결과적으로 세션이 끝나지 않고(로그인 화면으로 가지 않고) 화면이 로딩에 머물렀다.
 *
 * 갱신 요청만 `publicClient`(= `authFetch` 를 타지 않는 경로)로 보내 재귀를 없앴다.
 */
test('AC25_갱신이_만료로_거부되면_만료_사유로_세션을_끝낸다', async () => {
  await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});

  server.use(
    http.get(ME, () => HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401})),
    http.post(REFRESH, () =>
      HttpResponse.json(problemBody({status: 401, code: 'AUTH_REFRESH_TOKEN_EXPIRED'}), {status: 401}),
    ),
  );

  await renderSettings();

  await waitFor(() => expect(useSession.getState().isSignedIn).toBe(false), {timeout: 3000});
  expect(useSession.getState().notice).toBe('expired');
  await expect(loadTokens()).resolves.toBeNull();
});

test('AC24_갱신이_재사용으로_거부되면_보안_사유로_세션을_끝낸다', async () => {
  await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});

  server.use(
    http.get(ME, () => HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401})),
    http.post(REFRESH, () =>
      HttpResponse.json(problemBody({status: 401, code: 'AUTH_REFRESH_TOKEN_REUSED'}), {status: 401}),
    ),
  );

  await renderSettings();

  await waitFor(() => expect(useSession.getState().isSignedIn).toBe(false), {timeout: 3000});
  // 만료 배너가 아니라 보안 배너로 갈린다 (design.md §4.3).
  expect(useSession.getState().notice).toBe('revoked');
  await expect(loadTokens()).resolves.toBeNull();
});

test('AC24_다른_기기에서_폐기된_경우도_보안_사유다', async () => {
  await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});

  server.use(
    http.get(ME, () => HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401})),
    http.post(REFRESH, () =>
      HttpResponse.json(problemBody({status: 401, code: 'AUTH_REFRESH_TOKEN_REVOKED'}), {status: 401}),
    ),
  );

  await renderSettings();

  await waitFor(() => expect(useSession.getState().notice).toBe('revoked'), {timeout: 3000});
});

// ("갱신은 한 번만 시도한다" 의 일반 검증은 `shared/api/__tests__/client.test.ts` 에 이미 있다.)
