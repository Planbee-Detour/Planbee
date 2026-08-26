import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {createMMKV} from 'react-native-mmkv';

const storage = createMMKV({id: 'planbee-location'});
const REGION_KEY = 'preferred_region';
const geocoder = NativeModules.PlanbeeGeocoder as {reverseGeocode(latitude: number, longitude: number): Promise<string>} | undefined;

export function loadPreferredRegion(): string | null {
  return storage.getString(REGION_KEY) ?? null;
}

export function savePreferredRegion(region: string): void {
  storage.set(REGION_KEY, region.trim());
}

export function clearPreferredRegion(): void {
  storage.remove(REGION_KEY);
}

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return new Promise(resolve => {
    Geolocation.requestAuthorization(() => resolve(true), () => resolve(false));
  });
}

export async function resolveCurrentRegion(): Promise<string | null> {
  if (!(await requestLocationPermission())) {
    return null;
  }

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      async position => {
        if (!geocoder) {
          resolve(null);
          return;
        }
        try {
          resolve(await geocoder.reverseGeocode(position.coords.latitude, position.coords.longitude));
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      {enableHighAccuracy: false, maximumAge: 300000, timeout: 10000},
    );
  });
}