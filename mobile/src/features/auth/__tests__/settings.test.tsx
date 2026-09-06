/**
 * 설정 화면의 인수조건 검증 (PRD US-4 · US-5 · US-6 / design.md §8).
 * AC-26 · AC-27 · AC-28 · AC-35.
 *
 * 계정 조회가 실패해도 약관·정책(AC-35)과 계정 삭제(AC-28)는 항상 눌려야 한다 —
 * 둘 다 심사 요건이라 조회 실패에 묶이면 안 된다 (§8.5).
 */
import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {clearTokens, loadTokens, saveTokens} from '../../../shared/api/session';
import {AccountDeleteScreen} from '../screens/AccountDeleteScreen';
import {LegalDocumentScreen} from '../screens/LegalDocumentScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {useSession} from '../hooks/useSession';
import {LEGAL_DOCUMENTS} from '../legal/documents.generated';
import type {MainRouteParams} from '../navigation';

const ME = `${API_ORIGIN}/api/v1/auth/me`;
const LOGOUT = `${API_ORIGIN}/api/v1/auth/logout`;
const LEGAL_VIEWER_NOTE = '이 문서는 앱에 함께 담겨 있어 인터넷 연결 없이도 볼 수 있어요.';

const meOk = () =>
  http.get(ME, () => HttpResponse.json({email: 'name@example.com', role: 'USER', status: 'APPROVED'}));

const Stack = createNativeStackNavigator<MainRouteParams>();

async function renderSettings() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Settings">
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AccountDelete" component={AccountDeleteScreen} />
          <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

/** 시스템 다이얼로그의 파괴적 버튼을 누른다 (§8.4 · §9.5). */
async function pressAlertButton(alert: jest.SpyInstance, label: string) {
  const buttons = alert.mock.calls[0][2] as Array<{text: string; onPress?: () => void}>;
  const button = buttons.find(entry => entry.text === label);
  expect(button).toBeDefined();
  await button?.onPress?.();
}

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: true, notice: null, toast: null});
  jest.restoreAllMocks();
});

describe('계정 카드의 세 상태 — §8.5', () => {
  test('조회_중에는_값_자리에_스켈레톤이_보인다', async () => {
    server.use(http.get(ME, async () => {
      await new Promise<void>(resolve => {setTimeout(resolve, 150);});
      return HttpResponse.json({email: 'name@example.com', role: 'USER', status: 'APPROVED'});
    }));

    await renderSettings();

    expect(screen.getByLabelText('불러오는 중')).toBeTruthy();
    expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
  });

  test('조회에_성공하면_이메일이_보인다', async () => {
    server.use(meOk());

    await renderSettings();

    expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
  });

  test('조회에_실패하면_그_행만_오류로_바뀐다', async () => {
    server.use(http.get(ME, () =>
      HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
    ));

    await renderSettings();

    expect(await screen.findByText('불러오지 못했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
    // 화면 전체가 오류 화면으로 바뀌지 않는다.
    expect(screen.getByText('설정')).toBeTruthy();
  });

  test('다시_시도를_누르면_재조회한다', async () => {
    let attempt = 0;
    server.use(http.get(ME, () => {
      attempt += 1;
      return attempt === 1
        ? HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500})
        : HttpResponse.json({email: 'name@example.com', role: 'USER', status: 'APPROVED'});
    }));

    await renderSettings();
    await screen.findByText('불러오지 못했어요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('약관·정책과 계정 삭제 진입점 — AC-28 · AC-35', () => {
  test('AC35_이용약관과_개인정보_처리방침_항목이_버전과_함께_보인다', async () => {
    server.use(meOk());

    await renderSettings();

    expect(
      screen.getByRole('button', {name: `${LEGAL_DOCUMENTS.terms.title}, ${LEGAL_DOCUMENTS.terms.version}`}),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {name: `${LEGAL_DOCUMENTS.privacy.title}, ${LEGAL_DOCUMENTS.privacy.version}`}),
    ).toBeTruthy();
  });

  test('AC35_이용약관_항목을_누르면_전문이_열린다', async () => {
    server.use(meOk());

    await renderSettings();
    await fireEvent.press(
      screen.getByRole('button', {name: `${LEGAL_DOCUMENTS.terms.title}, ${LEGAL_DOCUMENTS.terms.version}`}),
    );

    expect(await screen.findByText(LEGAL_VIEWER_NOTE, {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC28_계정_삭제_진입점이_보이고_삭제_화면으로_간다', async () => {
    server.use(meOk());

    await renderSettings();

    const entry = screen.getByRole('button', {name: '계정 삭제'});
    expect(entry.props.accessibilityHint).toBe(
      '계정을 삭제하는 화면으로 이동합니다. 삭제하면 되돌릴 수 없습니다.',
    );

    await fireEvent.press(entry);

    expect(await screen.findByText('계속하려면 비밀번호를 입력해 주세요', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC28_AC35_계정_조회가_실패해도_두_진입점은_그대로_동작한다', async () => {
    server.use(http.get(ME, () =>
      HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
    ));

    await renderSettings();
    await screen.findByText('불러오지 못했어요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '계정 삭제'}));

    expect(await screen.findByText('계속하려면 비밀번호를 입력해 주세요', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('로그아웃 — AC-26 · AC-27', () => {
  test('AC26_확인을_거쳐_로그아웃하면_이_기기의_리프레시_토큰을_폐기한다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    let sent: unknown = null;
    server.use(meOk(), http.post(LOGOUT, async ({request}) => {
      sent = await request.json();
      return new HttpResponse(null, {status: 204});
    }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderSettings();
    await fireEvent.press(screen.getByRole('button', {name: '로그아웃'}));

    // 확인 없이는 로그아웃되지 않는다 (§8.4).
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('로그아웃할까요?');
    expect(useSession.getState().isSignedIn).toBe(true);

    await pressAlertButton(alert, '로그아웃');

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(false), {timeout: 3000});
    expect(sent).toEqual({refresh_token: 'refresh-1'});
    await expect(loadTokens()).resolves.toBeNull();
    expect(useSession.getState().toast).toBe('로그아웃했어요');
  });

  test('AC26_취소하면_아무것도_일어나지_않는다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    server.use(meOk());
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderSettings();
    await fireEvent.press(screen.getByRole('button', {name: '로그아웃'}));
    await pressAlertButton(alert, '취소');

    expect(useSession.getState().isSignedIn).toBe(true);
    await expect(loadTokens()).resolves.not.toBeNull();
  });

  test('AC27_서버가_응답하지_않아도_기기_토큰을_지우고_같은_화면_동작을_한다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    server.use(meOk(), http.post(LOGOUT, () => HttpResponse.error()));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderSettings();
    await fireEvent.press(screen.getByRole('button', {name: '로그아웃'}));
    await pressAlertButton(alert, '로그아웃');

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(false), {timeout: 3000});
    await expect(loadTokens()).resolves.toBeNull();
    // 실패를 사용자에게 알리지 않는다 — 이 기기에서는 실제로 로그아웃됐다.
    expect(useSession.getState().toast).toBe('로그아웃했어요');
  });
});
