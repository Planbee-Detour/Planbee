/**
 * 장소 상세 API 호출. `request()` 만 쓴다 (M-8). 공개 엔드포인트라 `publicClient`.
 */
import {publicClient, request} from '../../../shared/api/client';
import type {PlaceDetail} from '../types';

export async function fetchPlaceDetail(placeId: string): Promise<PlaceDetail> {
  return request(() =>
    publicClient.GET('/api/v1/places/{place_id}', {
      params: {path: {place_id: placeId}},
    }),
  );
}
