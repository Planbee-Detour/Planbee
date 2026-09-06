/**
 * 약관 전문 뷰어의 인수조건 검증 (PRD US-6 / design.md §6).
 * AC-33 · AC-34 · AC-35 · AC-36 · AC-37.
 *
 * <b>이 화면은 네트워크를 타지 않는다</b> (AC-37). msw 에 핸들러를 하나도 등록하지 않으므로,
 * 요청이 나가면 `onUnhandledRequest: 'error'` 가 이 파일을 실패시킨다 — 그게 AC-37 의 검증이다.
 */
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {LegalDocumentScreen} from '../screens/LegalDocumentScreen';
import {SignUpScreen} from '../screens/SignUpScreen';
import {LEGAL_DOCUMENTS, type LegalDocumentKey} from '../legal/documents.generated';
import type {AuthRouteParams, LegalOrigin} from '../navigation';

const Stack = createNativeStackNavigator<AuthRouteParams>();

async function renderViewer(document: LegalDocumentKey | 'unknown', origin: LegalOrigin) {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="LegalDocument">
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          initialParams={{document: document as LegalDocumentKey, origin}}
        />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('본문과 버전 — AC-36 · AC-37', () => {
  test.each([
    ['terms' as const],
    ['privacy' as const],
  ])('AC37_%s_는_네트워크_없이_번들된_본문으로_열린다', async key => {
    await renderViewer(key, 'settings');

    // 로딩 스피너도 재시도 버튼도 없다 (§6.8).
    expect(screen.queryByLabelText('불러오는 중')).toBeNull();
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull();
    expect(
      screen.getByText('이 문서는 앱에 함께 담겨 있어 인터넷 연결 없이도 볼 수 있어요.'),
    ).toBeTruthy();
    // 본문이 실제로 들어 있다.
    expect(LEGAL_DOCUMENTS[key].body.length).toBeGreaterThan(200);
  });

  test('AC36_상단에_버전과_시행일이_표시된다', async () => {
    await renderViewer('terms', 'settings');

    // 버전은 번들 문서에서 읽은 값이다 — AC-8 이 저장하는 버전과 같은 출처다 (M-22).
    expect(screen.getByText(LEGAL_DOCUMENTS.terms.version)).toBeTruthy();

    const effectiveDate = LEGAL_DOCUMENTS.terms.effectiveDate;
    const pending = !effectiveDate || effectiveDate.includes('{{');
    if (pending) {
      // 아직 사람이 정하지 못한 값이다 (status.md ASK 1). 머리말에 자리표시자를 그대로 내보내지 않는다 (§6.4).
      expect(screen.getByText('시행일 준비 중')).toBeTruthy();
      expect(screen.queryByText(`시행일 ${effectiveDate}`)).toBeNull();
    } else {
      expect(screen.getByText(`시행일 ${effectiveDate}`)).toBeTruthy();
    }
  });

  test('AC36_버전과_시행일은_한_번에_읽히도록_묶여_있다', async () => {
    await renderViewer('privacy', 'settings');

    expect(screen.getByLabelText(/^버전 1\.0, 시행일/)).toBeTruthy();
  });
});

describe('개인정보 처리방침 요약 — AC-34', () => {
  test('AC34_수집항목_이용목적_보유기간_거부권리_네_가지가_모두_보인다', async () => {
    await renderViewer('privacy', 'settings');

    expect(screen.getByText('꼭 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('수집 항목')).toBeTruthy();
    expect(screen.getByText('이용 목적')).toBeTruthy();
    expect(screen.getByText('보유 기간')).toBeTruthy();
    expect(screen.getByText('동의를 거부할 권리와 불이익')).toBeTruthy();
    // 거부의 결과까지 함께 적혀 있어야 한다 (AC-34).
    expect(screen.getByText(/필수 항목에 동의하지 않으면 회원 가입과 서비스 이용이 불가능합니다/)).toBeTruthy();
  });

  test('AC34_요약_카드는_이용약관에는_붙지_않는다', async () => {
    await renderViewer('terms', 'settings');

    expect(screen.queryByText('꼭 확인해 주세요')).toBeNull();
  });
});

describe('진입 출처에 따른 하단 액션 — §6.7', () => {
  test('AC33_가입_화면에서_들어오면_동의하고_닫기가_있다', async () => {
    await renderViewer('terms', 'signup');

    expect(screen.getByRole('button', {name: '동의하고 닫기'})).toBeTruthy();
  });

  test.each([['settings' as const], ['status' as const]])(
    '%s_에서_들어오면_동의하고_닫기가_없다',
    async origin => {
      await renderViewer('privacy', origin);

      expect(screen.queryByRole('button', {name: '동의하고 닫기'})).toBeNull();
      expect(screen.getByRole('button', {name: '닫기'})).toBeTruthy();
    },
  );
});

describe('오류 — §6.8', () => {
  test('번들_자산을_읽지_못하면_안내만_보여주고_재시도를_두지_않는다', async () => {
    await renderViewer('unknown', 'settings');

    expect(screen.getByText('문서를 여는 데 문제가 생겼어요')).toBeTruthy();
    expect(screen.getByText('앱을 다시 시작하거나 최신 버전으로 업데이트해 주세요.')).toBeTruthy();
    // 다시 눌러도 같은 결과라 재시도 버튼을 두지 않는다.
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull();
    expect(screen.getAllByRole('button', {name: '닫기'}).length).toBeGreaterThan(0);
  });
});

describe('닫기', () => {
  test('닫으면_이전_화면으로_돌아간다', async () => {
    await renderViewer('terms', 'signup');

    await fireEvent.press(screen.getByRole('button', {name: '동의하고 닫기'}));

    expect(await screen.findByText('Planbee 가입 신청', {}, {timeout: 3000})).toBeTruthy();
  });
});
