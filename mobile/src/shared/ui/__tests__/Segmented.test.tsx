/**
 * `Control/Segmented` 회귀 스모크. 본격적인 AC 검증은 mobile-tester 가 한다 (M-11 · M-12).
 *
 * <b>이 파일이 존재하는 이유</b> (2026-09-09, `admin-user-approval` 결함):
 * 비선택 칸에 그림자 유틸리티가 없어서 "처리 완료" 를 누르는 순간 화면이 백지가 됐다.
 * 원인은 이 컴포넌트가 아니라 스타일 문자열이었다 — 아래 `describe` 주석 참조.
 * 그래서 여기서는 <b>className 문자열 자체</b>를 검사한다. 렌더 결과만 보면 통과해 버린다.
 */
import React from 'react';
import {render} from '@testing-library/react-native';

import {Segmented} from '../Segmented';

const OPTIONS = [
  {value: 'pending' as const, label: '검토 대기 1'},
  {value: 'processed' as const, label: '처리 완료'},
];

describe('Segmented', () => {
  test('선택 여부가 접근성 상태로 드러난다', async () => {
    const {getByRole} = await render(
      <Segmented onSelect={() => {}} options={OPTIONS} selected="pending" />,
    );

    expect(getByRole('tab', {name: '검토 대기 1'}).props.accessibilityState.selected).toBe(true);
    expect(getByRole('tab', {name: '처리 완료'}).props.accessibilityState.selected).toBe(false);
  });

  /**
   * 그림자 유틸리티(`shadow-*`)는 Tailwind 가 CSS 변수(`--tw-shadow`)로 컴파일한다.
   * 첫 렌더에 변수가 없던 컴포넌트에 변수가 뒤늦게 생기면 NativeWind 는 그것을
   * "업그레이드" 로 보고 경고를 찍는데, 그 경고가 props 를 JSON 으로 훑다가
   * 내비게이션 컨텍스트의 throwing getter 를 건드려 화면 전체가 렌더 오류로 죽었다.
   *
   * 그래서 비선택 칸도 <b>반드시</b> 같은 계열의 유틸리티를 들고 있어야 한다 (M-25).
   */
  test('비선택 칸도 그림자 유틸리티를 갖는다 — 선택 시 CSS 변수가 새로 생기면 안 된다', async () => {
    const {getByRole} = await render(
      <Segmented onSelect={() => {}} options={OPTIONS} selected="pending" />,
    );

    expect(getByRole('tab', {name: '검토 대기 1'}).props.className).toMatch(/(^|\s)shadow-/);
    expect(getByRole('tab', {name: '처리 완료'}).props.className).toMatch(/(^|\s)shadow-/);
  });
});
