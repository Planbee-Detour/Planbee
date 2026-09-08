/**
 * 주변 장소 조회. 서버 상태는 react-query 가 소유한다 (M-4).
 *
 * 측위와 목록 조회를 두 쿼리로 나눈다 — 측위 실패는 재시도 대상이 아니고(권한 거부는
 * 다시 물어도 같다), 목록 조회 실패(5xx)는 provider 의 재시도 정책을 타야 하기 때문이다.
 * 화면은 loading / 정상 / empty(반경 안에 결과 없음) / error(측위·조회 실패) 로만 본다 (M-6).
 */
import {skipToken, useQuery} from '@tanstack/react-query';

import {getCurrentCoordinates} from '../../../shared/location/location';
import {fetchNearbyPlaces} from '../api/endpoints';
import type {NearbyPlacesState, PlaceCategory} from '../types';

export function useNearbyPlaces(categories: PlaceCategory[]) {
  const sorted = [...categories].sort();

  const coordinates = useQuery({
    queryKey: ['current-coordinates'],
    queryFn: getCurrentCoordinates,
    // 권한 거부·측위 실패를 다시 물어도 결과는 같다.
    retry: false,
    staleTime: 60_000,
  });

  const coords = coordinates.data ?? null;

  const places = useQuery({
    queryKey: ['nearby-places', sorted, coords],
    queryFn: coords ? () => fetchNearbyPlaces({...coords, categories: sorted}) : skipToken,
  });

  const retry = () => {
    coordinates.refetch();
    places.refetch();
  };

  let state: NearbyPlacesState;
  if (coordinates.isError || (coords == null && !coordinates.isPending)) {
    state = {status: 'error'};
  } else if (coordinates.isPending || places.isPending) {
    state = {status: 'loading'};
  } else if (places.isError) {
    state = {status: 'error'};
  } else if (!places.data || places.data.items.length === 0) {
    state = {status: 'empty'};
  } else {
    state = {status: 'success', data: places.data};
  }

  return {retry, state};
}
