import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {SituationCard} from '../components/SituationCard';
import {PlanBRecommendationScreen} from '../screens/PlanBRecommendationScreen';
import {ScheduleProgressScreen} from '../screens/ScheduleProgressScreen';

describe('Plan B 사용자 흐름', () => {
  test('AC-PB-18 확인 전에는 영향 가능성만 안내한다', async () => {
    const {getByText, queryByText} = await render(
      <SituationCard status="needs-confirmation" onPress={jest.fn()} />,
    );
    expect(getByText('날씨 변화가 예상돼요')).toBeTruthy();
    expect(getByText('남은 일정 확인하기  ›')).toBeTruthy();
    expect(queryByText('일정에 영향을 주는 변수가 있어요')).toBeNull();
  });

  test('AC-PB-19·20 남은 일정 선택을 모두 마치면 영향 확정으로 이동한다', async () => {
    const onConfirmed = jest.fn();
    const {getAllByText, getByRole} = await render(
      <ScheduleProgressScreen onBack={jest.fn()} onConfirmed={onConfirmed} />,
    );
    const confirm = getByRole('button', {name: '확인 완료'});
    expect(confirm.props.accessibilityState.disabled).toBe(true);
    for (const button of getAllByText('아직이에요')) await fireEvent.press(button);
    await fireEvent.press(getByRole('button', {name: '확인 완료'}));
    expect(onConfirmed).toHaveBeenCalledWith(true);
  });

  test('AC-PB-21 모두 완료했으면 변경할 일정이 없다고 안내한다', async () => {
    const {getAllByText, getByRole, getByText} = await render(
      <ScheduleProgressScreen onBack={jest.fn()} onConfirmed={jest.fn()} />,
    );
    for (const button of getAllByText('다녀왔어요')) await fireEvent.press(button);
    await fireEvent.press(getByRole('button', {name: '확인 완료'}));
    expect(getByText('오늘 야외 일정은 모두 완료했어요')).toBeTruthy();
  });

  test('AC-PB-12 로딩 후 장소 교체안과 코스안을 확인하고 적용한다', async () => {
    const onApplied = jest.fn();
    const {getAllByText, getByText, getByRole} = await render(
      <PlanBRecommendationScreen onBack={jest.fn()} onApplied={onApplied} />,
    );
    expect(getByText('Planbee가 새로운 계획을 찾고 있어요.')).toBeTruthy();
    await waitFor(() => expect(getByText('경복궁 일정을 바꿔야 해요')).toBeTruthy());
    await fireEvent.press(getByRole('button', {name: '코스로 다시 짜기'}));
    expect(getAllByText('남은 2시간을 다시 구성했어요')).toHaveLength(2);
    await fireEvent.press(getByRole('button', {name: '이 계획으로 변경'}));
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['empty' as const, '조건에 맞는 대체 계획을 찾지 못했어요'],
    ['error' as const, '대체 계획을 만들지 못했어요'],
  ])('AC-PB-13·14 %s 상태를 표시한다', async (initialState, message) => {
    const {getByText} = await render(
      <PlanBRecommendationScreen initialState={initialState} onBack={jest.fn()} onApplied={jest.fn()} />,
    );
    expect(getByText(message)).toBeTruthy();
  });
});
