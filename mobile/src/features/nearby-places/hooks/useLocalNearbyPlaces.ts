import {useCallback, useEffect, useState} from 'react';

import nearbyPlacesJson from '../fixtures/nearby-places.json';
import type {NearbyPlaceList, NearbyPlacesState} from '../types';

const fixture: NearbyPlaceList = nearbyPlacesJson;

export function useLocalNearbyPlaces() {
  const [state, setState] = useState<NearbyPlacesState>({status: 'loading'});
  const load = useCallback(() => {
    setState({status: 'loading'});
    Promise.resolve().then(() => setState(fixture.items.length ? {status: 'success', data: fixture} : {status: 'empty'}));
  }, []);
  useEffect(load, [load]);
  return {retry: load, state};
}
