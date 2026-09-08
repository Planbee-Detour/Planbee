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

export type Coordinates = {latitude: number; longitude: number};

/**
 * 현재 위치의 원좌표. 주변 장소 조회처럼 지역명이 아니라 좌표가 필요할 때 쓴다.
 * 권한 거부·측위 실패면 `null` — 호출부가 오류 상태로 처리한다.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  if (!(await requestLocationPermission())) {
    return null;
  }

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => resolve({latitude: position.coords.latitude, longitude: position.coords.longitude}),
      () => resolve(null),
      {enableHighAccuracy: false, maximumAge: 300000, timeout: 10000},
    );
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