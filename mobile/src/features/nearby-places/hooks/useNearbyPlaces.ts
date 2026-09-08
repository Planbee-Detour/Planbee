/**
 * 주변 장소 조회. 서버 상태는 react-query 가 소유한다 (M-4).
 *
 * 좌표를 먼저 해결한 뒤(측위) 그 좌표로 목록을 조회한다. 측위 실패·조회 실패는 모두
 * `error`, 반경 안에 결과가 없으면 `empty` 다 (design.md 의 4가지 상태 / M-6).
 */
import {useCallback} from 'react';
import {useQuery} from '@tanstack/react-query';

import {getCurrentCoordinates} from '../../../shared/location/location';
import {fetchNearbyPlaces} from '../api/endpoints';
import type {NearbyPlacesState, PlaceCategory} from '../types';

async function loadNearbyPlaces(categories: PlaceCategory[]) {
  const coordinates = await getCurrentCoordinates();
  if (!coordinates) {
    throw new Error('LOCATION_UNAVAILABLE');
  }
  return fetchNearbyPlaces({...coordinates, categories});
}

export function useNearbyPlaces(categories: PlaceCategory[]) {
  const query = useQuery({
    queryKey: ['nearby-places', [...categories].sort()],
    queryFn: () => loadNearbyPlaces(categories),
  });

  const state: NearbyPlacesState = query.isPending
    ? {status: 'loading'}
    : query.isError
      ? {status: 'error'}
      : query.data.items.length === 0
        ? {status: 'empty'}
        : {status: 'success', data: query.data};

  const retry = useCallback(() => {
    query.refetch();
  }, [query]);

  return {retry, state};
}
