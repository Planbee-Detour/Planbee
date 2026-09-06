/**
 * 가입 신청 화면의 인수조건 검증 (PRD US-1 / design.md §5).
 *
 * 목 응답의 근거는 `contract.yaml` 의 `SignupResponse` 201 · 409 · 400 example 이다.
 * RNTL 14 의 `render` 와 `fireEvent` 는 <b>둘 다 비동기</b>라 반드시 await 한다.
 */
import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {AccountStatusScreen} from '../screens/AccountStatusScreen';
import {LegalDocumentScreen} from '../screens/LegalDocumentScreen';
import {SignUpScreen} from '../screens/SignUpScreen';
import {LEGAL_DOCUMENTS} from '../legal/documents.generated';
import type {AuthRouteParams} from '../navigation';

const SIGNUP = `${API_ORIGIN}/api/v1/auth/signup`;

/** 계약 201 example — 이 응답 하나로 검토 중 화면이 완성된다 (AC-46). */
const SIGNUP_RESPONSE = {
  account_status: {
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
  },
};

/** 약관 뷰어에만 있는 문장 — 뷰어가 실제로 열렸는지 가리는 데 쓴다 (design.md §6.3). */
const LEGAL_VIEWER_NOTE = '이 문서는 앱에 함께 담겨 있어 인터넷 연결 없이도 볼 수 있어요.';

const Stack = createNativeStackNavigator<AuthRouteParams>();

async function renderSignUp() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="SignUp">
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
        <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const checkbox = (name: RegExp) => screen.getByRole('checkbox', {name});

/** 필수 3건만 체크한다 — 선택 동의(마케팅)는 건드리지 않는다 (AC-7). */
async function checkRequiredConsents() {
  await fireEvent.press(checkbox(/이용약관에 동의합니다/));
  await fireEvent.press(checkbox(/개인정보 수집·이용에 동의합니다/));
  await fireEvent.press(checkbox(/만 14세 이상입니다/));
}

async function fillValidForm() {
  await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example.com');
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
  await checkRequiredConsents();
}

const submitButton = () => screen.getByRole('button', {name: '가입 신청하기'});
const pressSubmit = () => fireEvent.press(submitButton());
const isSubmitDisabled = () => submitButton().props.accessibilityState.disabled;

describe('제출 조건 — AC-3 · AC-5 · AC-6 · AC-7', () => {
  test('AC6_필수_동의가_하나라도_빠지면_제출_버튼이_비활성이다', async () => {
    let calls = 0;
    server.use(http.post(SIGNUP, () => {
      calls += 1;
      return HttpResponse.json(SIGNUP_RESPONSE, {status: 201});
    }));

    await renderSignUp();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example.com');
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
    await fireEvent.press(checkbox(/이용약관에 동의합니다/));
    await fireEvent.press(checkbox(/개인정보 수집·이용에 동의합니다/));
    // 만 14세 확인만 빠졌다.

    expect(isSubmitDisabled()).toBe(true);
    await pressSubmit();
    expect(calls).toBe(0);

    await fireEvent.press(checkbox(/만 14세 이상입니다/));
    expect(isSubmitDisabled()).toBe(false);
  });

  test('AC7_선택_동의를_체크하지_않아도_제출할_수_있다', async () => {
    await renderSignUp();
    await fillValidForm();

    expect(checkbox(/마케팅·알림 수신에 동의합니다/).props.accessibilityState.checked).toBe(false);
    expect(isSubmitDisabled()).toBe(false);
  });

  test('AC3_비밀번호가_정책에_맞지_않으면_비활성이고_정책_문구가_보인다', async () => {
    await renderSignUp();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example.com');
    await checkRequiredConsents();

    // 8자 이상이지만 숫자가 없다.
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbeeplan');
    await fireEvent(screen.getByLabelText('비밀번호'), 'blur');

    expect(isSubmitDisabled()).toBe(true);
    // 도움말과 오류가 같은 문장이다 (§5.3) — 입력란과 함께 읽히는 자리에 있어야 한다.
    expect(screen.getByText('영문과 숫자를 포함해 8자 이상')).toBeTruthy();
    expect(screen.getByLabelText('비밀번호').props.accessibilityHint).toBe(
      '영문과 숫자를 포함해 8자 이상',
    );
    expect(submitButton().props.accessibilityHint).toBe('비밀번호 조건을 확인해 주세요');
  });

  test('AC3_숫자만_있고_영문이_없어도_비활성이다', async () => {
    await renderSignUp();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example.com');
    await checkRequiredConsents();
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), '20260827');

    expect(isSubmitDisabled()).toBe(true);
  });

  test('AC3_8자_미만이면_비활성이다', async () => {
    await renderSignUp();
    await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example.com');
    await checkRequiredConsents();
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'plan123');

    expect(isSubmitDisabled()).toBe(true);
  });

  test('AC5_이메일_형식이_틀리면_비활성이고_형식_오류_문구가_뜬다', async () => {
    await renderSignUp();
    await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'planbee2026');
    await checkRequiredConsents();

    await fireEvent.changeText(screen.getByLabelText('이메일'), 'name@example');
    await fireEvent(screen.getByLabelText('이메일'), 'blur');

    expect(screen.getByText('이메일 형식이 올바르지 않아요')).toBeTruthy();
    expect(isSubmitDisabled()).toBe(true);
    expect(submitButton().props.accessibilityHint).toBe('이메일 형식을 확인해 주세요');
  });

  test('AC5_비어있는_이메일에서_벗어나면_필수_문구가_뜬다', async () => {
    await renderSignUp();

    await fireEvent(screen.getByLabelText('이메일'), 'blur');

    expect(screen.getByText('이메일을 입력해 주세요')).toBeTruthy();
  });

  test('진입_직후에는_오류_문구를_하나도_보여주지_않는다', async () => {
    // §5.8 비어있음 — 아직 blur 전이다.
    await renderSignUp();

    expect(screen.queryByText('이메일을 입력해 주세요')).toBeNull();
    expect(screen.queryByText('이메일 형식이 올바르지 않아요')).toBeNull();
    expect(isSubmitDisabled()).toBe(true);
  });

  test('전체_동의를_누르면_선택_항목까지_모두_체크된다', async () => {
    await renderSignUp();

    await fireEvent.press(screen.getByRole('checkbox', {name: '전체 동의'}));

    expect(checkbox(/이용약관에 동의합니다/).props.accessibilityState.checked).toBe(true);
    expect(checkbox(/마케팅·알림 수신에 동의합니다/).props.accessibilityState.checked).toBe(true);

    // 개별 하나를 해제하면 전체 동의도 풀린다 (§5.4).
    await fireEvent.press(checkbox(/만 14세 이상입니다/));
    expect(screen.getByRole('checkbox', {name: '전체 동의'}).props.accessibilityState.checked).toBe(false);
  });
});

describe('가입 사유 — AC-9', () => {
  test('AC9_100자를_넘겨_입력해도_100자에서_막히고_카운터가_100_100_을_유지한다', async () => {
    await renderSignUp();
    const reason = screen.getByLabelText('가입 사유');

    await fireEvent.changeText(reason, 'ㄱ'.repeat(100));
    expect(screen.getByText('100/100')).toBeTruthy();

    // 한 글자를 더 넣어도 반영되지 않는다.
    await fireEvent.changeText(reason, `${'ㄱ'.repeat(100)}ㄴ`);

    expect(screen.getByText('100/100')).toBeTruthy();
    expect(screen.getByLabelText('가입 사유').props.value).toHaveLength(100);
    // 오류 문구를 띄우지 않는다 — 차단 자체가 피드백이다 (§5.3).
    expect(screen.queryByTestId('signup-error')).toBeNull();
  });

  test('AC9_가입_사유는_제출_조건이_아니다', async () => {
    await renderSignUp();
    await fillValidForm();

    expect(screen.getByLabelText('가입 사유').props.value).toBe('');
    expect(isSubmitDisabled()).toBe(false);
  });
});

describe('접수 — AC-1 · AC-8 · AC-46', () => {
  test('AC1_제출에_성공하면_검토_중_화면으로_이동한다', async () => {
    server.use(http.post(SIGNUP, () => HttpResponse.json(SIGNUP_RESPONSE, {status: 201})));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    expect(await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC46_검토_중_화면은_가입_응답_하나로_완성된다', async () => {
    // 추가 조회가 있으면 msw 의 onUnhandledRequest:error 가 이 테스트를 깨뜨린다.
    server.use(http.post(SIGNUP, () => HttpResponse.json(SIGNUP_RESPONSE, {status: 201})));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000});
    // 제목 · 본문 · 행동 지시 · 신청 이메일 · 신청일 · 문의 주소가 모두 응답에서 온다.
    expect(screen.getByText(SIGNUP_RESPONSE.account_status.body)).toBeTruthy();
    expect(screen.getByText('승인되면 다시 로그인해 주세요')).toBeTruthy();
    expect(screen.getByText('name@example.com')).toBeTruthy();
    // 신청일은 UTC 응답을 표시 직전에만 로컬로 바꾼 `YYYY. M. D.` 다 (C-2 / §7.2).
    // 실행 환경의 시간대에 따라 날짜가 하루 달라질 수 있으므로 형식으로 검증한다.
    expect(screen.getByLabelText(/^신청일, \d{4}\. \d{1,2}\. \d{1,2}\.$/)).toBeTruthy();
    expect(screen.getByText('support@planbee.app')).toBeTruthy();
  });

  test('AC8_동의_3종은_거부한_항목까지_버전과_함께_보내고_만14세는_따로_보낸다', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(http.post(SIGNUP, async ({request}) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(SIGNUP_RESPONSE, {status: 201});
    }));

    await renderSignUp();
    await fillValidForm();
    await fireEvent.changeText(screen.getByLabelText('가입 사유'), '  주간 계획을 자주 바꿔요.  ');
    await pressSubmit();

    await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000});

    expect(body).toMatchObject({
      email: 'name@example.com',
      password: 'planbee2026',
      signup_reason: '주간 계획을 자주 바꿔요.',
      // 만 14세는 동의 이력이 아니라 자기 확인이다.
      age_over_14_confirmed: true,
      consents: [
        {type: 'TERMS', agreed: true, version: LEGAL_DOCUMENTS.terms.version},
        {type: 'PRIVACY', agreed: true, version: LEGAL_DOCUMENTS.privacy.version},
        // 체크하지 않은 마케팅도 "거부함" 으로 남는다. 대응 문서가 없어 버전은 비어 있다.
        {type: 'MARKETING', agreed: false, version: null},
      ],
    });
    // 동의 이력에 만 14세 항목이 섞여 들어가지 않는다.
    expect((body as unknown as {consents: unknown[]}).consents).toHaveLength(3);
  });

  test('AC7_가입_사유가_비면_null_로_보낸다', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(http.post(SIGNUP, async ({request}) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(SIGNUP_RESPONSE, {status: 201});
    }));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000});
    expect(body).toMatchObject({signup_reason: null});
  });
});

describe('오류 — AC-2 · AC-4 · AC-10', () => {
  test('AC2_중복_이메일은_필드_오류로_뜨고_화면이_이동하지_않는다', async () => {
    server.use(http.post(SIGNUP, () =>
      HttpResponse.json(
        problemBody({status: 409, code: 'AUTH_EMAIL_ALREADY_REGISTERED', detail: '이미 가입 신청된 이메일입니다.'}),
        {status: 409},
      ),
    ));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    expect(await screen.findByText('이미 가입 신청된 이메일입니다', {}, {timeout: 3000})).toBeTruthy();
    // 화면은 그대로다.
    expect(screen.getByText('Planbee 가입 신청')).toBeTruthy();
    // 다른 입력값은 유지된다 (§5.3).
    expect(screen.getByLabelText('비밀번호').props.value).toBe('planbee2026');
    expect(checkbox(/이용약관에 동의합니다/).props.accessibilityState.checked).toBe(true);
  });

  test('AC2_이메일을_고치면_중복_오류가_사라진다', async () => {
    server.use(http.post(SIGNUP, () =>
      HttpResponse.json(problemBody({status: 409, code: 'AUTH_EMAIL_ALREADY_REGISTERED'}), {status: 409}),
    ));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();
    await screen.findByText('이미 가입 신청된 이메일입니다', {}, {timeout: 3000});

    await fireEvent.changeText(screen.getByLabelText('이메일'), 'other@example.com');

    expect(screen.queryByText('이미 가입 신청된 이메일입니다')).toBeNull();
  });

  test('AC4_서버가_지목한_필드_오류를_그_필드_아래에_표시한다', async () => {
    server.use(http.post(SIGNUP, () =>
      HttpResponse.json(
        problemBody({
          status: 400,
          code: 'VALIDATION_FAILED',
          errors: [{field: 'password', code: 'PATTERN', message: '영문과 숫자를 포함해 8자 이상'}],
        }),
        {status: 400},
      ),
    ));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    await waitFor(
      () =>
        expect(screen.getByLabelText('비밀번호').props.accessibilityHint).toBe(
          '영문과 숫자를 포함해 8자 이상',
        ),
      {timeout: 3000},
    );
    // 화면은 이동하지 않고 입력값도 유지된다.
    expect(screen.getByText('Planbee 가입 신청')).toBeTruthy();
    expect(screen.getByLabelText('이메일').props.value).toBe('name@example.com');
  });

  test('AC4_어느_필드도_지목하지_않은_검증_실패는_배너로_처리한다', async () => {
    server.use(http.post(SIGNUP, () =>
      HttpResponse.json(
        problemBody({
          status: 400,
          code: 'VALIDATION_FAILED',
          errors: [{field: 'consents', code: 'INVALID', message: '동의 항목을 확인해 주세요.'}],
        }),
        {status: 400},
      ),
    ));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    await screen.findByTestId('signup-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
  });

  test('AC10_네트워크가_끊기면_안내가_뜨고_입력값이_전부_남는다', async () => {
    server.use(http.post(SIGNUP, () => HttpResponse.error()));

    await renderSignUp();
    await fillValidForm();
    await fireEvent.changeText(screen.getByLabelText('가입 사유'), '계획을 자주 바꿔요');
    await pressSubmit();

    await screen.findByTestId('signup-error', {}, {timeout: 3000});
    expect(screen.getByText('연결을 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('입력한 내용은 그대로 있어요. 연결 후 다시 신청해 주세요.')).toBeTruthy();

    // 비밀번호와 체크 상태까지 그대로다 (§5.6).
    expect(screen.getByLabelText('이메일').props.value).toBe('name@example.com');
    expect(screen.getByLabelText('비밀번호').props.value).toBe('planbee2026');
    expect(screen.getByLabelText('가입 사유').props.value).toBe('계획을 자주 바꿔요');
    expect(checkbox(/이용약관에 동의합니다/).props.accessibilityState.checked).toBe(true);
    expect(checkbox(/개인정보 수집·이용에 동의합니다/).props.accessibilityState.checked).toBe(true);
    expect(checkbox(/만 14세 이상입니다/).props.accessibilityState.checked).toBe(true);
  });

  test('AC10_다시_시도를_누르면_같은_입력으로_재전송된다', async () => {
    let attempt = 0;
    server.use(http.post(SIGNUP, () => {
      attempt += 1;
      return attempt === 1
        ? HttpResponse.error()
        : HttpResponse.json(SIGNUP_RESPONSE, {status: 201});
    }));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();
    await screen.findByTestId('signup-error', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('가입 신청을 검토하고 있어요', {}, {timeout: 3000})).toBeTruthy();
    expect(attempt).toBe(2);
  });

  test('AC19계열_서버_500은_배너로_처리하고_입력값을_유지한다', async () => {
    server.use(http.post(SIGNUP, () =>
      HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
    ));

    await renderSignUp();
    await fillValidForm();
    await pressSubmit();

    await screen.findByTestId('signup-error', {}, {timeout: 3000});
    expect(screen.getByText('잠시 후 다시 시도해 주세요')).toBeTruthy();
    expect(screen.getByLabelText('비밀번호').props.value).toBe('planbee2026');
  });
});

describe('약관 열람 — AC-33', () => {
  test('AC33_이용약관_보기를_누르면_전문_화면이_열린다', async () => {
    await renderSignUp();

    await fireEvent.press(screen.getByRole('button', {name: '이용약관에 동의합니다 보기'}));

    expect(await screen.findByText(LEGAL_VIEWER_NOTE, {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getAllByText(LEGAL_DOCUMENTS.terms.title).length).toBeGreaterThan(0);
    expect(screen.getByText(LEGAL_DOCUMENTS.terms.version)).toBeTruthy();
  });

  test('AC33_보기_탭은_체크_상태를_바꾸지_않는다', async () => {
    await renderSignUp();

    await fireEvent.press(screen.getByRole('button', {name: '개인정보 수집·이용에 동의합니다 보기'}));
    await screen.findByText(LEGAL_VIEWER_NOTE, {}, {timeout: 3000});

    // 뷰어의 ✕ 로 닫으면 체크 상태는 그대로다 (§6.7).
    await fireEvent.press(screen.getByRole('button', {name: '닫기'}));

    await waitFor(() =>
      expect(checkbox(/개인정보 수집·이용에 동의합니다/).props.accessibilityState.checked).toBe(false),
    );
  });

  test('AC33_동의하고_닫기로_돌아오면_그_항목이_체크된다', async () => {
    await renderSignUp();

    await fireEvent.press(screen.getByRole('button', {name: '이용약관에 동의합니다 보기'}));
    await screen.findByText(LEGAL_VIEWER_NOTE, {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '동의하고 닫기'}));

    await waitFor(() =>
      expect(checkbox(/이용약관에 동의합니다/).props.accessibilityState.checked).toBe(true),
    );
  });
});
