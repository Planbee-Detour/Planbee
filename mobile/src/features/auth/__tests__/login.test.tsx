/**
 * 로그인 화면의 인수조건 검증 (PRD US-2 / design.md §4).
 *
 * 판정 기준은 PRD 의 AC 이고 목 응답의 근거는 `docs/features/auth/contract.yaml` 의 example 이다.
 * 서버는 띄우지 않는다 — API 는 전부 msw 로 목킹한다 (절대 규칙 5 / M-11).
 */
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {clearTokens, loadTokens} from '../../../shared/api/session';
import {AccountStatusScreen} from '../screens/AccountStatusScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {useSession} from '../hooks/useSession';
import type {AuthRouteParams} from '../navigation';

const LOGIN = `${API_ORIGIN}/api/v1/auth/login`;

/** 계약 `LoginResponse` 200 의 example. */
const TOKEN_PAIR = {
  access_token: 'access-token-1',
  refresh_token: 'refresh-token-1',
  token_type: 'Bearer',
  expires_in: 1800,
};

/** 계약 `AccountBlockedProblem` 의 example 3종 (PENDING / REJECTED / SUSPENDED). */
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

const REJECTED_STATUS = {
  ...PENDING_STATUS,
  status: 'REJECTED' as const,
  title: '가입이 승인되지 않았어요',
  body: '신청 내용을 확인했지만 이번에는 승인되지 않았어요. 이 계정으로는 로그인할 수 없어요.',
  highlight: {
    title: '다시 검토받고 싶거나 정보를 지우고 싶다면',
    body: '가입할 때 쓴 이메일 주소와 함께 아래로 알려주시면 확인 후 도와드릴게요.',
  },
};

const SUSPENDED_STATUS = {
  ...PENDING_STATUS,
  status: 'SUSPENDED' as const,
  title: '이용이 정지된 계정이에요',
  body: '서비스 운영 정책에 따라 이 계정의 이용이 정지되었어요. 정지 중에는 로그인할 수 없어요.',
  highlight: {
    title: '정지에 이의가 있다면',
    body: '아래로 알려주시면 확인해 드릴게요. 자세한 기준은 이용약관 제8조에서 볼 수 있어요.',
  },
};

const Stack = createNativeStackNavigator<AuthRouteParams>();

/** RNTL 14 의 `render` 는 비동기다 (mobile.md 테스트 환경 메모). 반드시 await 한다. */
async function renderLogin() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

async function fillCredentials(email = 'name@example.com', password = 'planbee2026') {
  await fireEvent.changeText(screen.getByLabelText('이메일'), email);
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), password);
}

/**
 * 제출 핸들러는 응답이 아무리 빨라도 최소 노출 시간(`LoginScreen` 의 `MIN_SUBMIT_MS` = 400ms)을
 * 채운 뒤에야 배너·비밀번호·제출 상태를 갱신한다 (§4.6). `fireEvent` 는 핸들러가 돌려준
 * 프로미스를 기다리지 않으므로, 그 꼬리 갱신은 RNTL 이 열어 둔 `act` 창 밖에서 떨어진다.
 * 제출이 끝날 때까지를 한 `act` 창으로 묶어 `not wrapped in act(...)` 경고를 없앤다.
 */
const SUBMIT_SETTLE_MS = 450;

async function pressSubmit(name: string) {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', {name}));
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), SUBMIT_SETTLE_MS);
    });
  });
}

const pressLogin = () => pressSubmit('로그인');

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: false, notice: null, toast: null});
});

describe('정상 흐름', () => {
  test('AC11_APPROVED_계정은_로그인에_성공하고_세션이_열린다', async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json({token: TOKEN_PAIR, user: {email: 'name@example.com', role: 'USER', status: 'APPROVED'}})));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
    // 로그인 화면은 그대로 있고 홈으로의 전환은 RootNavigator 가 세션 상태로 판정한다.
    expect(screen.queryByTestId('login-error')).toBeNull();
  });

  test('AC18_발급받은_토큰은_Keychain에만_저장된다', async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json({token: TOKEN_PAIR, user: {email: 'name@example.com', role: 'USER', status: 'APPROVED'}})));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
    // Keychain 목은 `com.planbee.auth` 서비스에만 값을 넣는다. 다른 저장소를 쓰면 여기가 빈다.
    await expect(loadTokens()).resolves.toEqual({
      accessToken: TOKEN_PAIR.access_token,
      refreshToken: TOKEN_PAIR.refresh_token,
    });
  });

  test('AC21_입력이_하나도_없으면_제출되지_않고_승인제_안내가_보인다', async () => {
    let calls = 0;
    server.use(http.post(LOGIN, () => {
      calls += 1;
      return HttpResponse.json({token: TOKEN_PAIR, user: {email: 'a@b.com', role: 'USER', status: 'APPROVED'}});
    }));

    await renderLogin();

    expect(screen.getByText(/Planbee는 승인제로 운영돼요/)).toBeTruthy();
    expect(screen.getByRole('button', {name: '로그인'}).props.accessibilityState.disabled).toBe(true);

    await pressLogin();
    expect(calls).toBe(0);
  });

  test('AC21_필드를_비운_채_벗어나면_필드_오류가_표시된다', async () => {
    await renderLogin();

    await fireEvent(screen.getByLabelText('이메일'), 'blur');
    await fireEvent(screen.getByLabelText('비밀번호'), 'blur');

    expect(screen.getByText('이메일을 입력해 주세요')).toBeTruthy();
    expect(screen.getByText('비밀번호를 입력해 주세요')).toBeTruthy();
  });
});

describe('자격 증명 실패 — AC-12 · AC-13 · AC-31 은 한 코드 경로다', () => {
  /** 세 상황 모두 서버가 같은 `code` 로 응답한다 (계약 401). 앱은 구분하지 않는다. */
  const invalidCredentials = () =>
    HttpResponse.json(
      problemBody({status: 401, code: 'AUTH_INVALID_CREDENTIALS', detail: '이메일 또는 비밀번호를 확인해 주세요.'}),
      {status: 401},
    );

  test.each([
    ['AC12_등록된_이메일에_틀린_비밀번호', 'name@example.com'],
    ['AC13_등록되지_않은_이메일', 'nobody@example.com'],
    ['AC31_삭제된_계정의_이메일', 'deleted@example.com'],
  ])('%s_은_같은_문구를_보여준다', async (_name, email) => {
    server.use(http.post(LOGIN, invalidCredentials));

    await renderLogin();
    await fillCredentials(email, 'wrong-password');
    await pressLogin();

    const banner = await screen.findByTestId('login-error', {}, {timeout: 3000});
    expect(screen.getByText('이메일 또는 비밀번호를 확인해 주세요')).toBeTruthy();
    // 부연 문구를 붙이지 않는다 (§4.6 배너 1·2·3).
    expect(banner).toBeTruthy();
  });

  test('AC12_실패하면_이메일은_남고_비밀번호만_지워진다', async () => {
    server.use(http.post(LOGIN, invalidCredentials));

    await renderLogin();
    await fillCredentials('name@example.com', 'wrong-password');
    await pressLogin();

    await screen.findByText('이메일 또는 비밀번호를 확인해 주세요', {}, {timeout: 3000});
    expect(screen.getByLabelText('이메일').props.value).toBe('name@example.com');
    expect(screen.getByLabelText('비밀번호').props.value).toBe('');
  });

  test('AC12_입력을_수정하면_배너가_사라진다', async () => {
    server.use(http.post(LOGIN, invalidCredentials));

    await renderLogin();
    await fillCredentials();
    await pressLogin();
    await screen.findByTestId('login-error', {}, {timeout: 3000});

    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'another');

    expect(screen.queryByTestId('login-error')).toBeNull();
  });
});

describe('로그인 잠금 — AC-17 · AC-41 · AC-43 · AC-44 · AC-47 · AC-48', () => {
  const locked = (minutes: number, supportEmail: string | null, retryAfterSeconds = 540) =>
    HttpResponse.json(
      {
        ...problemBody({status: 429, code: 'AUTH_LOGIN_LOCKED', detail: '로그인을 잠시 제한했어요.'}),
        lock_remaining_minutes: minutes,
        support_contact_email: supportEmail,
      },
      {status: 429, headers: {'Retry-After': String(retryAfterSeconds)}},
    );

  test('AC17_잠금_응답의_본문값을_그대로_남은_시간으로_보여준다', async () => {
    // Retry-After(초)와 본문의 분이 서로 다른 잠금을 가리켜도 앱은 <b>본문</b>만 쓴다.
    // 헤더(60초=1분)를 읽었다면 "약 1분" 이 나온다.
    server.use(http.post(LOGIN, () => locked(9, 'support@planbee.app', 60)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-locked', {}, {timeout: 3000});
    expect(screen.getByText('로그인을 잠시 제한했어요')).toBeTruthy();
    expect(screen.getByText('남은 시간 약 9분')).toBeTruthy();
    expect(screen.queryByText('남은 시간 약 1분')).toBeNull();
  });

  test('AC41_잠금_안내에_서버가_내려준_문의_주소가_함께_보인다', async () => {
    server.use(http.post(LOGIN, () => locked(9, 'support@planbee.app')));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-locked', {}, {timeout: 3000});
    expect(screen.getByText('support@planbee.app')).toBeTruthy();
    expect(screen.getByLabelText('문의 이메일 주소, support@planbee.app')).toBeTruthy();
  });

  test('AC43_문의_주소가_없으면_대체_안내로_바뀐다', async () => {
    server.use(http.post(LOGIN, () => locked(9, null)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-locked', {}, {timeout: 3000});
    expect(
      screen.getByText('문의 창구를 준비하고 있어요. 조금 뒤에 다시 확인해 주세요.'),
    ).toBeTruthy();
    expect(screen.queryByText('문의하기')).toBeNull();
  });

  test('AC44_문의_주소가_없어도_잠금_안내와_폼은_그대로_동작한다', async () => {
    server.use(http.post(LOGIN, () => locked(9, null)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-locked', {}, {timeout: 3000});
    // 제목 · 남은 시간이 그대로 있고 (오류 화면으로 대체되지 않는다)
    expect(screen.getByText('로그인을 잠시 제한했어요')).toBeTruthy();
    expect(screen.getByText('남은 시간 약 9분')).toBeTruthy();
    // 입력란이 잠금 때문에 비활성화되지 않는다 (§4.7 설계 의도 4).
    expect(screen.getByLabelText('이메일').props.editable).not.toBe(false);
    expect(screen.getByLabelText('비밀번호').props.editable).not.toBe(false);
    // 이메일은 그대로 남아 있다 (§4.6 "어떤 경우에도 입력한 이메일은 지우지 않는다").
    expect(screen.getByLabelText('이메일').props.value).toBe('name@example.com');
    // 비밀번호를 다시 넣으면 곧바로 재시도할 수 있다.
    // (앱이 잠금 응답에서도 비밀번호를 지우는 점은 defects.md D-T1 참조 — 차단 아님)
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
    expect(screen.getByRole('button', {name: '로그인'}).props.accessibilityState.disabled).toBe(false);
  });

  test('AC48_잠금_중_다시_시도하면_남은_시간이_갱신되고_폼이_막히지_않는다', async () => {
    let attempt = 0;
    server.use(http.post(LOGIN, () => {
      attempt += 1;
      return locked(attempt === 1 ? 9 : 8, 'support@planbee.app');
    }));

    await renderLogin();
    await fillCredentials();
    await pressLogin();
    await screen.findByText('남은 시간 약 9분', {}, {timeout: 3000});

    // 잠금 중에도 다시 누를 수 있어야 한다 — 이미 풀렸을 수 있기 때문이다.
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
    await pressLogin();

    await screen.findByText('남은 시간 약 8분', {}, {timeout: 3000});
    expect(screen.queryByText('남은 시간 약 9분')).toBeNull();
    expect(attempt).toBe(2);
  });

  test('AC47_미등록_이메일도_같은_잠금_화면을_받는다', async () => {
    server.use(http.post(LOGIN, () => locked(9, 'support@planbee.app')));

    await renderLogin();
    await fillCredentials('nobody@example.com', 'whatever');
    await pressLogin();

    await screen.findByTestId('login-locked', {}, {timeout: 3000});
    expect(screen.getByText('남은 시간 약 9분')).toBeTruthy();
  });

  test('AC17_남은_시간을_읽지_못하면_값을_지어내지_않고_일반_오류로_떨어진다', async () => {
    // `lock_remaining_minutes` 가 없는 잠금 응답. 앱이 "약 0분" 같은 값을 만들면 안 된다 (M-13).
    server.use(http.post(LOGIN, () =>
      HttpResponse.json(problemBody({status: 429, code: 'AUTH_LOGIN_LOCKED'}), {status: 429}),
    ));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
    expect(screen.queryByTestId('login-locked')).toBeNull();
  });
});

describe('서버·네트워크 오류 — AC-19', () => {
  test('AC19_서버_500이면_안내와_재시도_버튼이_보이고_비밀번호는_남는다', async () => {
    server.use(http.post(LOGIN, () =>
      HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
    ));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
    // 재시도해야 하므로 비밀번호를 지우지 않는다 (§4.6).
    expect(screen.getByLabelText('비밀번호').props.value).toBe('planbee2026');
  });

  test('AC19_재시도_버튼은_같은_입력으로_요청을_다시_보낸다', async () => {
    let attempt = 0;
    server.use(http.post(LOGIN, () => {
      attempt += 1;
      if (attempt === 1) {
        return HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500});
      }
      return HttpResponse.json({token: TOKEN_PAIR, user: {email: 'name@example.com', role: 'USER', status: 'APPROVED'}});
    }));

    await renderLogin();
    await fillCredentials();
    await pressLogin();
    await screen.findByTestId('login-error', {}, {timeout: 3000});

    await pressSubmit('다시 시도');

    await waitFor(() => expect(useSession.getState().isSignedIn).toBe(true), {timeout: 3000});
    expect(attempt).toBe(2);
  });

  test('AC10계열_네트워크가_끊기면_연결_안내와_재시도가_보인다', async () => {
    server.use(http.post(LOGIN, () => HttpResponse.error()));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-error', {}, {timeout: 3000});
    expect(screen.getByText('연결을 확인해 주세요')).toBeTruthy();
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
    expect(screen.getByLabelText('비밀번호').props.value).toBe('planbee2026');
  });
});

describe('계정 상태 차단 — AC-14 · AC-15 · AC-16', () => {
  const blocked = (code: string, accountStatus: object, extra: object = {}) =>
    HttpResponse.json(
      {...problemBody({status: 403, code}), account_status: accountStatus, ...extra},
      {status: 403},
    );

  test('AC14_PENDING_이면_검토_중_화면으로_간다', async () => {
    server.use(http.post(LOGIN, () => blocked('AUTH_ACCOUNT_PENDING', PENDING_STATUS)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    expect(await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000})).toBeTruthy();
    // AC-14 가 필수로 요구하는 행동 지시가 함께 있어야 한다.
    expect(screen.getByText('승인되면 다시 로그인해 주세요')).toBeTruthy();
    // 홈으로 가지 않는다.
    expect(useSession.getState().isSignedIn).toBe(false);
  });

  test('AC15_REJECTED_이면_승인_안_됨_화면으로_간다', async () => {
    server.use(http.post(LOGIN, () =>
      blocked('AUTH_ACCOUNT_REJECTED', REJECTED_STATUS, {
        deletion_token: 'deletion-token-1',
        deletion_token_expires_in: 600,
      }),
    ));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    expect(await screen.findByText('가입이 승인되지 않았어요', {}, {timeout: 3000})).toBeTruthy();
    // AC-50 — 거절 계정에는 앱 안 삭제 경로가 있다.
    expect(screen.getByTestId('status-delete-account')).toBeTruthy();
  });

  test('AC16_SUSPENDED_이면_이용_정지_화면으로_가고_삭제_경로는_없다', async () => {
    server.use(http.post(LOGIN, () => blocked('AUTH_ACCOUNT_SUSPENDED', SUSPENDED_STATUS)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    expect(await screen.findByText('이용이 정지된 계정이에요', {}, {timeout: 3000})).toBeTruthy();
    // 정지 회피 차단 — SUSPENDED 에는 삭제 경로를 열지 않는다 (PRD 제약).
    expect(screen.queryByTestId('status-delete-account')).toBeNull();
  });

  test('AC14_차단_화면에서_로그인_화면으로_돌아올_수_있다', async () => {
    server.use(http.post(LOGIN, () => blocked('AUTH_ACCOUNT_PENDING', PENDING_STATUS)));

    await renderLogin();
    await fillCredentials();
    await pressLogin();
    await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '로그인 화면으로'}));

    expect(await screen.findByText(/Planbee는 승인제로 운영돼요/, {}, {timeout: 3000})).toBeTruthy();
  });

  test('카탈로그에_없는_상태_코드가_와도_앱이_죽지_않는다', async () => {
    // M-13 — 알 수 없는 `code` 는 자격 증명 오류로 떨어지지 않고 그대로 오류 배너다.
    server.use(http.post(LOGIN, () =>
      HttpResponse.json(problemBody({status: 403, code: 'AUTH_ACCOUNT_HIBERNATED'}), {status: 403}),
    ));

    await renderLogin();
    await fillCredentials();
    await pressLogin();

    await screen.findByTestId('login-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
  });
});

describe('세션 배너 — AC-24 · AC-25', () => {
  test('AC25_유휴_만료로_끝난_세션은_만료_배너를_보여준다', async () => {
    useSession.setState({notice: 'expired'});

    await renderLogin();

    expect(screen.getByText('다시 로그인해 주세요')).toBeTruthy();
    expect(screen.getByText('오랫동안 앱을 열지 않아 자동으로 로그아웃됐어요.')).toBeTruthy();
  });

  test('AC24_재사용_감지로_끝난_세션은_보안_배너를_보여준다', async () => {
    useSession.setState({notice: 'revoked'});

    await renderLogin();

    expect(
      screen.getByText('보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요.'),
    ).toBeTruthy();
    // 만료 배너의 부연은 보안 배너에 붙지 않는다 (§4.3).
    expect(screen.queryByText('오랫동안 앱을 열지 않아 자동으로 로그아웃됐어요.')).toBeNull();
  });

  test('AC25_입력을_시작하면_세션_배너가_사라진다', async () => {
    useSession.setState({notice: 'expired'});

    await renderLogin();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'n');

    expect(screen.queryByTestId('session-banner')).toBeNull();
  });
});
