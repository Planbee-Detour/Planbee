/**
 * 스택별 파라미터 목록. <b>기능이 선언한 화면을 여기서 조합한다</b> (M-2).
 *
 * 각 화면의 파라미터는 그 화면을 소유한 기능이 선언한다 (`features/auth/navigation.ts`).
 * `app/` 은 그것을 모아 스택 하나의 목록으로 만드는 일만 한다 — 의존 방향이
 * `app/` → `features/` 로 유지되고, 두 번째 기능이 화면을 더할 때 여기서
 * `AuthRouteParams & OtherRouteParams` 로 넓히면 된다.
 * (2026-08-27, defects.md D-M3)
 *
 * 기능 코드는 이 파일을 import 하지 않는다. 자기 기능의 `navigation.ts` 만 본다.
 */
import type {AuthRouteParams, MainRouteParams} from '../../features/auth/navigation';

export type AuthStackParamList = AuthRouteParams;

/**
 * 홈·주변장소·장소상세는 아직 자기 `navigation.ts` 를 두지 않아 여기 직접 적는다.
 * 그 기능들이 파라미터를 선언하면 auth 와 같은 방식으로 옮긴다 (2026-09-06 머지).
 */
export type MainStackParamList = MainRouteParams & {
  MainTabs: undefined;
  NearbyPlaces: undefined;
  PlaceDetail: {placeId: string};
};
