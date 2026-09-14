/**
 * mobile-tester — NearbyPlacesScreen 이 인수조건대로 동작하는지 본다.
 * API 는 msw 로 목킹한다 (M-11). 목 데이터의 근거는 nearby-places/contract.yaml 의 스키마다.
 *
 * 판정 기준은 PRD.md 의 AC-NP-* 다.
 */
import React from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import Geolocation from '@react-native-community/geolocation';
import {http, HttpResponse} from 'msw';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {NearbyPlacesScreen} from '../screens/NearbyPlacesScreen';

// 기본 목(mobile/__mocks__)은 항상 측위 성공이다. 권한 거부를 검증하려면 제어 가능한 jest.fn 이 필요하다.
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    requestAuthorization: jest.fn((onSuccess: () => void) => onSuccess()),
    getCurrentPosition: jest.fn((onSuccess: (p: unknown) => void) =>
      onSuccess({coords: {latitude: 37.5, longitude: 127.0}}),
    ),
  },
}));

const geolocation = Geolocation as unknown as {
  requestAuthorization: jest.Mock;
  getCurrentPosition: jest.Mock;
};

const NEARBY_URL = `${API_ORIGIN}/api/v1/places/nearby`;

function grantLocation(coords = {latitude: 37.5, longitude: 127.0}) {
  geolocation.requestAuthorization.mockImplementation((onSuccess: () => void) => onSuccess());
  geolocation.getCurrentPosition.mockImplementation((onSuccess: (p: unknown) => void) => onSuccess({coords}));
}

function denyLocation() {
  geolocation.requestAuthorization.mockImplementation((_ok: () => void, onError: () => void) => onError());
}

function place(overrides: Record<string, unknown>) {
  return {
    place_id: 'tour:1',
    category: '관광지',
    status_label: null,
    name: '경복궁',
    image_url: null,
    distance_label: '300m · 도보 4분',
    tags: null,
    latitude: 37.5,
    longitude: 127.0,
    ...overrides,
  };
}

function renderScreen() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
  return render(
    <QueryClientProvider client={client}>
      <NearbyPlacesScreen onBack={jest.fn()} onPlacePress={jest.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

test('AC-NP-7·9 주변 장소가 거리순으로, 서버가 만든 거리 문구와 함께 표시된다', async () => {
  grantLocation();
  server.use(
    http.get(NEARBY_URL, () =>
      HttpResponse.json({
        items: [
          place({place_id: 'tour:2', name: '가까운 곳', distance_label: '300m · 도보 4분'}),
          place({place_id: 'tour:1', name: '먼 곳', distance_label: '1.8km · 도보 24분'}),
        ],
      }),
    ),
  );

  await renderScreen();

  expect(await screen.findByText('가까운 곳')).toBeTruthy();
  expect(screen.getByText('먼 곳')).toBeTruthy();
  // 거리 문구는 앱이 만들지 않는다 — 서버가 준 값을 그대로 렌더한다 (C-8).
  expect(screen.getByText('300m · 도보 4분')).toBeTruthy();
});

test('AC-NP-10 반경 안에 결과가 없으면 안내 문구와 이전 화면 버튼을 보여준다', async () => {
  grantLocation();
  server.use(http.get(NEARBY_URL, () => HttpResponse.json({items: []})));

  await renderScreen();

  expect(await screen.findByText('주변에서 추천할 장소를 찾지 못했어요')).toBeTruthy();
  expect(screen.getByText('이전 화면으로')).toBeTruthy();
});

test('AC-NP-10 조회가 실패하면 오류 안내와 다시 시도 버튼을 보여준다', async () => {
  grantLocation();
  server.use(
    http.get(NEARBY_URL, () =>
      HttpResponse.json(problemBody({status: 500, code: 'PLACE_UPSTREAM_UNAVAILABLE'}), {status: 500}),
    ),
  );

  await renderScreen();

  expect(await screen.findByText('주변 장소를 불러오지 못했어요')).toBeTruthy();
  expect(screen.getByText('다시 시도')).toBeTruthy();
});

test('측위에 실패하면 오류 상태를 보여준다 (권한 거부)', async () => {
  denyLocation();

  await renderScreen();

  expect(await screen.findByText('주변 장소를 불러오지 못했어요')).toBeTruthy();
});

test('AC-NP-8 카테고리 필터를 누르면 그 유형으로 다시 조회한다', async () => {
  grantLocation();
  const seen: string[] = [];
  server.use(
    http.get(NEARBY_URL, ({request}) => {
      seen.push(new URL(request.url).searchParams.getAll('category').join(','));
      return HttpResponse.json({items: [place({})]});
    }),
  );

  await renderScreen();
  await screen.findByText('경복궁');

  fireEvent.press(screen.getByText('음식점'));
  await screen.findByText('경복궁');

  expect(seen[0]).toBe(''); // 처음엔 필터 없음 → 서버 기본값
  expect(seen).toContain('restaurant');
});

test('안드로이드 경로에서도 측위·조회가 성립한다 (M-20)', async () => {
  Platform.OS = 'android';
  const androidRequest = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  geolocation.getCurrentPosition.mockImplementation((onSuccess: (p: unknown) => void) =>
    onSuccess({coords: {latitude: 37.5, longitude: 127.0}}),
  );
  server.use(http.get(NEARBY_URL, () => HttpResponse.json({items: [place({})]})));

  try {
    await renderScreen();
    expect(await screen.findByText('경복궁')).toBeTruthy();
    expect(androidRequest).toHaveBeenCalled();
  } finally {
    Platform.OS = 'ios';
    androidRequest.mockRestore();
  }
});
