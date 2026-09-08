/**
 * 장소 상세 조회. 서버 상태는 react-query 가 소유한다 (M-4).
 *
 * `PLACE_NOT_FOUND`(404) 는 "찾을 수 없어요" 빈 상태, 그 외 오류는 오류 상태로 가른다
 * (design.md §3.3 / §3.4 / M-13). 분기는 `code` 로 한다.
 */
import {useCallback} from 'react';
import {useQuery} from '@tanstack/react-query';

import {isApiError} from '../../../shared/api/problem';
import {fetchPlaceDetail} from '../api/endpoints';
import type {PlaceDetailState} from '../types';

const PLACE_NOT_FOUND = 'PLACE_NOT_FOUND';

export function usePlaceDetail(placeId: string) {
  const query = useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: () => fetchPlaceDetail(placeId),
  });

  const notFound = isApiError(query.error) && query.error.code === PLACE_NOT_FOUND;

  const state: PlaceDetailState = query.isPending
    ? {status: 'loading'}
    : notFound
      ? {status: 'empty'}
      : query.isError
        ? {status: 'error'}
        : {status: 'success', place: query.data};

  const retry = useCallback(() => {
    query.refetch();
  }, [query]);

  return {retry, state};
}
