/**
 * `AI/BeeLoader` 스모크 (`docs/design/bee-loader.md`). 로딩 화면 자체의 검증은 쓰는 화면의 테스트가 한다.
 *
 * 움직임은 픽셀로 볼 수 없으므로 <b>반복 애니메이션이 돌고 있는가</b>로 판정한다 —
 * `Animated.loop` 를 가로채 시작·정지 호출을 센다.
 */
import React from 'react';
import {AccessibilityInfo, Animated} from 'react-native';
import {act, render, screen} from '@testing-library/react-native';

import {BeeLoader} from '../BeeLoader';

type LoopHandle = {start: jest.Mock; stop: jest.Mock; reset: jest.Mock};

let loops: LoopHandle[];

beforeEach(() => {
  loops = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const handle = {start: jest.fn(), stop: jest.fn(), reset: jest.fn()};
    loops.push(handle);
    return handle as unknown as Animated.CompositeAnimation;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** 시작됐고 아직 멈추지 않은 루프 */
function runningLoops() {
  return loops.filter(loop => loop.start.mock.calls.length > 0 && loop.stop.mock.calls.length === 0);
}

async function renderLoader(element: React.ReactElement, {reduceMotion = false} = {}) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  const result = await render(element);
  // 동작 줄이기 설정은 비동기로 읽힌다 — 그 결과가 반영된 뒤를 본다
  await act(async () => {});
  return result;
}

describe('BeeLoader', () => {
  test('진행 표시 역할과 기본 이름으로 읽힌다', async () => {
    await renderLoader(<BeeLoader />);

    expect(screen.getByRole('progressbar', {name: '불러오는 중'})).toBeTruthy();
  });

  test('쓰는 화면이 준 이름으로 읽힌다', async () => {
    await renderLoader(<BeeLoader accessibilityLabel="추천을 찾고 있어요" />);

    expect(screen.getByRole('progressbar', {name: '추천을 찾고 있어요'})).toBeTruthy();
  });

  test('size 가 상자 크기가 된다', async () => {
    await renderLoader(<BeeLoader size={120} testID="loader" />);

    expect(screen.getByTestId('loader').props.style).toEqual({width: 120, height: 120});
  });

  test.each(['float', 'orbit'] as const)('%s 는 날갯짓과 이동 두 루프를 돌린다', async variant => {
    await renderLoader(<BeeLoader variant={variant} />);

    expect(runningLoops()).toHaveLength(2);
  });

  test.each(['float', 'orbit'] as const)('동작 줄이기가 켜져 있으면 %s 도 움직이지 않는다', async variant => {
    await renderLoader(<BeeLoader variant={variant} />, {reduceMotion: true});

    expect(runningLoops()).toHaveLength(0);
  });

  test('화면에서 사라지면 루프를 멈춘다', async () => {
    const {unmount} = await renderLoader(<BeeLoader />);

    await act(async () => {
      unmount();
    });

    expect(runningLoops()).toHaveLength(0);
  });
});
