/**
 * 스크린리더 낭독의 <b>안드로이드 경로</b> 검증 (`defects.md` D-M4 / M-20).
 *
 * 안드로이드(TalkBack)는 `accessibilityLiveRegion="polite"` 가 붙은 뷰를 시스템이 스스로 읽는다.
 * 그래서 앱이 `announceForAccessibility` 를 <b>부르면 안 된다</b> — 같은 문장을 두 번 읽는다.
 *
 * Jest 프리셋의 기본 플랫폼이 `ios` 라 이 파일에서만 `Platform` 을 목킹한다.
 * 파일을 나눈 이유: `shared/lib/a11y` 가 <b>모듈 로드 시점</b>에 `Platform.select` 로 경로를
 * 고정하므로, 한 파일 안에서 OS 를 바꿔도 이미 정해진 경로가 바뀌지 않는다.
 *
 * 파일명에 `.android.` 를 쓰지 않은 이유도 같다 — 그 이름이면 haste 가 이 파일을
 * <b>아예 로드하지 않는다</b> (mobile.md M-20 근거).
 */
import React from 'react';

/** 실제 Platform 을 프로토타입으로 두고 `OS` / `select` 만 안드로이드로 바꾼다. */
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/Platform');
  const real = actual.default ?? actual;
  return {
    __esModule: true,
    default: Object.assign(Object.create(real), {
      OS: 'android',
      select: (spec: Record<string, unknown>) =>
        'android' in spec ? spec.android : 'native' in spec ? spec.native : spec.default,
    }),
  };
});

import {AccessibilityInfo, Platform} from 'react-native';
import {render, screen} from '@testing-library/react-native';

import {A11yAnnouncement} from '../../../shared/lib/a11y';
import {Banner} from '../../../shared/ui/Banner';
import {Toast} from '../../../shared/ui/Toast';
import {LABELS} from '../messages';

let announce: jest.SpyInstance;

beforeEach(() => {
  announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  announce.mockRestore();
});

test('이 파일은 안드로이드 경로를 탄다', () => {
  expect(Platform.OS).toBe('android');
  expect(Platform.select({ios: 'i', android: 'a', default: 'd'})).toBe('a');
});

test('D-M4_안드로이드_는_라이브_리전으로_읽고_announceForAccessibility_를_부르지_않는다', async () => {
  await render(<A11yAnnouncement message={LABELS.a11ySplashAnnounce} />);

  expect(announce).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Planbee 를 준비하고 있어요').props.accessibilityLiveRegion).toBe(
    'polite',
  );
});

test('D-M4_안드로이드_오류_배너는_라이브_리전만_쓴다', async () => {
  await render(
    <Banner title="연결을 확인해 주세요" detail="입력한 내용은 그대로 있어요." testID="banner" />,
  );

  expect(announce).not.toHaveBeenCalled();
  expect(screen.getByTestId('banner').props.accessibilityLiveRegion).toBe('polite');
  expect(screen.getByTestId('banner').props.accessibilityRole).toBe('alert');
});

test('D-M4_안드로이드_토스트도_라이브_리전만_쓴다', async () => {
  await render(<Toast message="로그아웃했어요" onHide={() => undefined} />);

  expect(announce).not.toHaveBeenCalled();
  // 토스트는 보이는 문장 자체가 라이브 리전 안에 있다 (배너의 라이브 리전은 위 테스트가 본다).
  expect(screen.getByText('로그아웃했어요')).toBeTruthy();
});
