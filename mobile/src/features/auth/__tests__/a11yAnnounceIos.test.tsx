/**
 * 스크린리더 낭독의 <b>iOS 경로</b> 검증 (`defects.md` D-M4 / M-20 / design.md §12 · §2.5 · §3.5).
 *
 * iOS(VoiceOver)는 `AccessibilityInfo.announceForAccessibility` 를 <b>직접 불러야</b> 읽는다.
 * 안드로이드 경로는 `a11yAnnounceAndroid.test.tsx` 가 본다 —
 * `shared/lib/a11y` 가 모듈 로드 시점에 `Platform.select` 로 경로를 정하므로
 * 한 파일에서 두 플랫폼을 모두 볼 수 없어 파일을 나눴다.
 */
import React from 'react';
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

test('테스트의 기본 플랫폼은 iOS 다', () => {
  // Jest 프리셋의 haste.defaultPlatform 이 ios 라 이 파일 전체가 iOS 경로를 탄다 (M-20).
  expect(Platform.OS).toBe('ios');
});

test('D-M4_iOS_는_진입_안내를_announceForAccessibility_로_읽는다', async () => {
  await render(<A11yAnnouncement message={LABELS.a11ySplashAnnounce} />);

  expect(announce).toHaveBeenCalledWith('Planbee 를 준비하고 있어요');
  // 안드로이드 경로(라이브 리전)도 같은 뷰에 함께 붙어 있다 — iOS 에서는 무시되는 prop 이다.
  expect(screen.getByLabelText('Planbee 를 준비하고 있어요').props.accessibilityLiveRegion).toBe(
    'polite',
  );
});

test('D-M4_iOS_는_오류_배너가_뜨면_제목과_부연을_이어서_읽는다', async () => {
  await render(<Banner title="연결을 확인해 주세요" detail="입력한 내용은 그대로 있어요." />);

  expect(announce).toHaveBeenCalledWith('연결을 확인해 주세요. 입력한 내용은 그대로 있어요.');
});

test('D-M4_iOS_는_토스트도_읽는다', async () => {
  await render(<Toast message="로그아웃했어요" onHide={() => undefined} />);

  expect(announce).toHaveBeenCalledWith('로그아웃했어요');
});
