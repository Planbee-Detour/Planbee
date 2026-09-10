/**
 * 스모크 — 렌더링 크래시가 없는지만 본다 (mobile-developer 범위).
 * AC 별 동작·오류 분기는 mobile-tester 가 맡는다.
 */
import React from 'react';
import {render} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import {QueryClientProvider} from '@tanstack/react-query';

import {API_ORIGIN, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {PlaceDetailScreen} from '../screens/PlaceDetailScreen';

function renderScreen() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PlaceDetailScreen onBack={jest.fn()} placeId="tour:126508" />
    </QueryClientProvider>,
  );
}

test('장소 상세 화면이 정상 응답을 렌더한다', async () => {
  server.use(
    http.get(`${API_ORIGIN}/api/v1/places/:placeId`, () =>
      HttpResponse.json({
        place_id: 'tour:126508',
        category: '관광지',
        status_label: null,
        name: '경복궁',
        image_url: null,
        address: '서울 종로구 사직로 161',
        opening_hours: '09:00~18:00',
        distance_label: null,
        tags: null,
        description: '조선의 법궁',
        recommendation_reason: null,
        latitude: 37.5796,
        longitude: 126.977,
        source_label: '한국관광공사 제공',
      }),
    ),
  );

  const {findByText} = await renderScreen();
  expect(await findByText('경복궁')).toBeTruthy();
  expect(await findByText('한국관광공사 제공')).toBeTruthy();
});
