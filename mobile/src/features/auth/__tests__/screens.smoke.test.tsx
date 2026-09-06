/**
 * 스모크 테스트 — <b>렌더링 크래시가 없는지만</b> 본다 (mobile-developer 역할 범위).
 *
 * 인수조건 검증(AC 별 동작, msw 목 응답, 오류 분기)은 mobile-tester 가 맡는다.
 * 여기서 그것까지 하면 두 역할의 테스트가 겹치고, 실패했을 때 누가 고칠지가 흐려진다.
 */
import React from 'react';
import {render} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';

import {AccountStatusScreen} from '../screens/AccountStatusScreen';
import {LegalDocumentScreen} from '../screens/LegalDocumentScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SignUpScreen} from '../screens/SignUpScreen';

const accountStatus = {
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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({navigate: jest.fn(), reset: jest.fn(), goBack: jest.fn(), setParams: jest.fn()}),
    useRoute: () => ({params: mockRouteParams}),
  };
});

let mockRouteParams: Record<string, unknown> = {};

/**
 * RNTL 14 의 `render` 는 <b>비동기</b>다 (React 19 의 act 정렬). 결과를 await 하지 않으면
 * Promise 가 그대로 돌아와 쿼리 함수가 없다는 오류가 난다.
 */
function renderScreen(ui: React.ReactElement) {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}

describe('auth 화면 렌더링', () => {
  beforeEach(() => {
    mockRouteParams = {};
  });

  test('로그인 화면이 뜬다', async () => {
    const {getByText, getByTestId} = await renderScreen(<LoginScreen />);
    expect(getByText('Planbee')).toBeTruthy();
    expect(getByTestId('login-submit')).toBeTruthy();
  });

  test('가입 신청 화면이 뜨고 필수·선택 동의가 모두 보인다', async () => {
    const {getByTestId} = await renderScreen(<SignUpScreen />);
    expect(getByTestId('consent-terms')).toBeTruthy();
    expect(getByTestId('consent-privacy')).toBeTruthy();
    expect(getByTestId('consent-age')).toBeTruthy();
    expect(getByTestId('consent-marketing')).toBeTruthy();
  });

  test('계정 상태 안내는 서버가 내린 문구를 그대로 렌더한다', async () => {
    mockRouteParams = {accountStatus, deletionToken: null};
    const {getByText} = await renderScreen(<AccountStatusScreen />);
    // 앱이 상태 코드로 문구를 만들지 않는다는 것이 이 화면의 핵심 규칙이다 (C-8).
    expect(getByText(accountStatus.title)).toBeTruthy();
    expect(getByText(accountStatus.highlight.title)).toBeTruthy();
  });

  test('약관 뷰어가 번들된 본문으로 뜬다 (네트워크 없음)', async () => {
    mockRouteParams = {document: 'terms', origin: 'settings'};
    const {getByText} = await renderScreen(<LegalDocumentScreen />);
    expect(getByText('v1.0')).toBeTruthy();
  });
});
