import {useCallback, useEffect, useState} from 'react';

import placeDetailsJson from '../fixtures/place-details.json';
import type {PlaceDetail, PlaceDetailState} from '../types';

const placeDetails: PlaceDetail[] = placeDetailsJson;

export function useLocalPlaceDetail(placeId: string) {
  const [state, setState] = useState<PlaceDetailState>({status: 'loading'});

  const load = useCallback(() => {
    setState({status: 'loading'});
    Promise.resolve().then(() => {
      if (placeId === 'mock-error') {
        setState({status: 'error'});
        return;
      }
      const place = placeDetails.find(item => item.place_id === placeId);
      setState(place ? {status: 'success', place} : {status: 'empty'});
    });
  }, [placeId]);

  useEffect(load, [load]);

  return {retry: load, state};
}
