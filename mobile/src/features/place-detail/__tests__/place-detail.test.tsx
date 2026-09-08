/**
 * mobile-tester — PlaceDetailScreen 이 인수조건대로 동작하는지 본다.
 * API 는 msw 로 목킹한다 (M-11). 판정 기준은 place-detail/PRD.md 의 AC-PD-* 다.
 */
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {PlaceDetailScreen} from '../screens/PlaceDetailScreen';

const DETAIL_URL = `${API_ORIGIN}/api/v1/places/:placeId`;

const fullDetail = {
  place_id: 'tour:126508',
  category: '관광지',
  status_label: null,
  name: '경복궁',
  image_url: 'https://tong.visitkorea.or.kr/img.jpg',
  address: '서울 종로구 사직로 161',
  opening_hours: '09:00~18:00',
  distance_label: null,
  tags: ['#관광지'],
  description: '조선의 법궁',
  recommendation_reason: null,
  latitude: 37.5796,
  longitude: 126.977,
  source_label: '한국관광공사 제공',
};

function renderScreen(placeId = 'tour:126508') {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
  return render(
    <QueryClientProvider client={client}>
      <PlaceDetailScreen onBack={jest.fn()} placeId={placeId} />
    </QueryClientProvider>,
  );
}

test('AC-PD-2 상세를 한 응답으로 표시한다', async () => {
  server.use(http.get(DETAIL_URL, () => HttpResponse.json(fullDetail)));

  await renderScreen();

  expect(await screen.findByText('경복궁')).toBeTruthy();
  expect(screen.getByText('조선의 법궁')).toBeTruthy();
  expect(screen.getByText('09:00~18:00')).toBeTruthy();
  expect(screen.getByText('한국관광공사 제공')).toBeTruthy();
});

test('AC-PD-3 없는 선택 필드는 해당 영역을 숨긴다', async () => {
  server.use(
    http.get(DETAIL_URL, () =>
      HttpResponse.json({
        ...fullDetail,
        image_url: null,
        opening_hours: null,
        tags: null,
        description: null,
        recommendation_reason: null,
      }),
    ),
  );

  await renderScreen();

  expect(await screen.findByText('경복궁')).toBeTruthy();
  expect(screen.queryByText('09:00~18:00')).toBeNull();
  expect(screen.queryByText('#관광지')).toBeNull();
  expect(screen.getByText('등록된 사진이 없어요')).toBeTruthy();
});

test('AC-PD-3·4 없는 장소는 "찾을 수 없어요" 안내를 보여준다', async () => {
  server.use(
    http.get(DETAIL_URL, () =>
      HttpResponse.json(problemBody({status: 404, code: 'PLACE_NOT_FOUND'}), {status: 404}),
    ),
  );

  await renderScreen('tour:0');

  expect(await screen.findByText('장소 정보를 찾을 수 없어요')).toBeTruthy();
});

test('AC-PD-5 조회 오류에서 다시 시도하면 재조회한다', async () => {
  let calls = 0;
  server.use(
    http.get(DETAIL_URL, () => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json(problemBody({status: 500, code: 'PLACE_UPSTREAM_UNAVAILABLE'}), {status: 500})
        : HttpResponse.json(fullDetail);
    }),
  );

  await renderScreen();

  expect(await screen.findByText('장소 정보를 불러오지 못했어요')).toBeTruthy();
  fireEvent.press(screen.getByText('다시 시도'));
  expect(await screen.findByText('경복궁')).toBeTruthy();
});

test('AC-PD-4 로딩 상태를 먼저 보여준다', async () => {
  server.use(http.get(DETAIL_URL, async () => HttpResponse.json(fullDetail)));

  await renderScreen();

  expect(screen.getByLabelText('장소 정보를 불러오는 중')).toBeTruthy();
  await screen.findByText('경복궁');
});
