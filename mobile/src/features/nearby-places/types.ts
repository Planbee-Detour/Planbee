import type {components, operations} from '../../shared/api/schema';

export type NearbyPlace = components['schemas']['NearbyPlace'];
export type NearbyPlaceList = components['schemas']['NearbyPlaceList'];

/** 계약 `getNearbyPlaces` 의 `category` enum. 필터 칩이 이 값을 조회 파라미터로 넘긴다. */
export type PlaceCategory = NonNullable<
  operations['getNearbyPlaces']['parameters']['query']['category']
>[number];

export type NearbyPlacesState =
  | {status: 'loading'}
  | {status: 'success'; data: NearbyPlaceList}
  | {status: 'empty'}
  | {status: 'error'};
