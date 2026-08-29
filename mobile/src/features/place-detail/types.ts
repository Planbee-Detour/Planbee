import type {components} from '../../shared/api/schema';

export type PlaceDetail = components['schemas']['PlaceDetail'];
export type PlaceDetailState =
  | {status: 'loading'}
  | {status: 'success'; place: PlaceDetail}
  | {status: 'empty'}
  | {status: 'error'};
