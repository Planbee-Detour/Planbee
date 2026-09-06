import type {components} from '../../shared/api/schema';

export type NearbyPlace = components['schemas']['NearbyPlace'];
export type NearbyPlaceList = components['schemas']['NearbyPlaceList'];
export type NearbyPlacesState =
  | {status: 'loading'}
  | {status: 'success'; data: NearbyPlaceList}
  | {status: 'empty'}
  | {status: 'error'};
