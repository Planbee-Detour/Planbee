/**
 * 스모크 — 렌더링 크래시가 없는지만 본다 (mobile-developer 범위).
 * AC 별 동작·오류 분기는 mobile-tester 가 맡는다.
 */
import React from 'react';
import {render} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {NearbyPlacesScreen} from '../screens/NearbyPlacesScreen';

function renderScreen() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>
      <NearbyPlacesScreen onBack={jest.fn()} onPlacePress={jest.fn()} />
    </QueryClientProvider>,
  );
}

test('주변 장소 화면이 로딩 상태로 뜬다 (측위 대기)', async () => {
  // 측위(@react-native-community/geolocation)는 jest.setup 에서 자동 목이라 응답하지 않는다 —
  // 화면은 로딩 상태로 머문다. 네트워크로 나가지 않는다.
  const {getByLabelText} = await renderScreen();
  expect(getByLabelText('주변 장소를 불러오는 중')).toBeTruthy();
});
