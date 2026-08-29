import {useEffect, useState} from 'react';

import {
  loadPreferredRegion,
  resolveCurrentRegion,
  savePreferredRegion,
} from '../shared/location/location';

export function usePreferredRegion() {
  const [region, setRegion] = useState<string | null>(null);
  const [isResolvingRegion, setIsResolvingRegion] = useState(true);

  useEffect(() => {
    const preferredRegion = loadPreferredRegion();
    if (preferredRegion) {
      setRegion(preferredRegion);
      setIsResolvingRegion(false);
      return;
    }

    resolveCurrentRegion().then(currentRegion => {
      if (currentRegion) {
        savePreferredRegion(currentRegion);
        setRegion(currentRegion);
      }
      setIsResolvingRegion(false);
    });
  }, []);

  return {isResolvingRegion, region, setRegion};
}
