/**
 * 스모크 — 렌더링 크래시가 없는지만 본다 (mobile-developer 범위).
 * AC 별 동작·오류 분기는 mobile-tester 가 맡는다.
 */
import React from 'react';
import {render} from '@testing-library/react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import Geolocation from '@react-native-community/geolocation';

import {NearbyPlacesScreen} from '../screens/NearbyPlacesScreen';
import {createTestQueryClient} from '../../../shared/test/queryClient';

function renderScreen() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NearbyPlacesScreen onBack={jest.fn()} onPlacePress={jest.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // 측위가 아직 끝나지 않은 순간을 본다. 공용 목(`mobile/__mocks__`)의 기본값은 즉시 성공이라
  // 덮어쓰지 않으면 렌더 직후 조회로 넘어가고, msw 핸들러가 없어 오류 상태가 된다.
  // 어느 쪽이 먼저인지는 실행 속도에 달려 있어 그대로 두면 간헐적으로 깨진다 (CI 에서 실제로 깨졌다).
  jest.mocked(Geolocation.getCurrentPosition).mockImplementation(() => {});
});

test('주변 장소 화면이 로딩 상태로 뜬다 (측위 대기)', async () => {
  // 측위가 응답하지 않는 동안 화면은 로딩 상태로 머문다. 네트워크로 나가지 않는다.
  const {getByLabelText} = await renderScreen();
  expect(getByLabelText('주변 장소를 불러오는 중')).toBeTruthy();
});
