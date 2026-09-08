/**
 * 주변 장소 API 호출. `shared/api/client.ts` 의 `request()` 만 쓴다 — `fetch` 직접 호출 금지 (M-8).
 * 공개 엔드포인트라 `publicClient`(인증 헤더 없음) 를 쓴다 (계약 `security: []`).
 */
import {publicClient, request} from '../../../shared/api/client';
import type {Coordinates} from '../../../shared/location/location';
import type {NearbyPlaceList, PlaceCategory} from '../types';

/** `docs/api/error-codes.md` 의 place 코드. 분기는 이 값으로 한다 (M-13). */
export const PLACE_ERROR = {
  notFound: 'PLACE_NOT_FOUND',
  upstreamUnavailable: 'PLACE_UPSTREAM_UNAVAILABLE',
} as const;

export type NearbyPlacesQuery = Coordinates & {
  /** 비어 있으면 서버 기본값(attraction,culture)을 쓴다. */
  categories: PlaceCategory[];
};

export async function fetchNearbyPlaces(query: NearbyPlacesQuery): Promise<NearbyPlaceList> {
  return request(() =>
    publicClient.GET('/api/v1/places/nearby', {
      params: {
        query: {
          latitude: query.latitude,
          longitude: query.longitude,
          category: query.categories.length ? query.categories : undefined,
        },
      },
    }),
  );
}
