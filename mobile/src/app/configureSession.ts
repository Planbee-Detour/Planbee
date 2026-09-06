/**
 * 전역 세션 처리 배선 (design.md §2.6 / M-14).
 *
 * `shared/api/client.ts` 는 <b>인증 규칙</b>만 알고 auth 도메인은 모르는 상태로 둔다 (M-2) —
 * 여기서 두 계층을 이어 붙인다. `app/` 이 기능을 조합하는 유일한 자리다.
 *
 * <b>경계와 내부 모델의 변환은 여기 있지 않다</b> (M-17). 그 배선은 저장 모델을 정의한
 * `shared/api/session.ts` 의 `toTokens` 하나이고, 이 파일도 그것을 부르는 호출자일 뿐이다 —
 * 여기 두면 토큰을 저장하는 화면이 `features/` → `app/` 을 import 하게 되어 M-2 와 충돌한다.
 */
import {configureAuth} from '../shared/api/client';
import {toTokens} from '../shared/api/session';
import {ApiError} from '../shared/api/problem';
import {AUTH_ERROR, refreshTokens} from '../features/auth/api/endpoints';
import {useSession} from '../features/auth/hooks/useSession';
import type {SessionNotice} from '../features/auth/types';

/**
 * 갱신 실패 사유를 담아 둔다.
 *
 * `client.ts` 의 `onSessionExpired` 는 인자를 받지 않는다 — 공용 계층이 도메인 오류 코드를
 * 알아야 할 이유가 없기 때문이다. 대신 갱신을 실제로 호출하는 여기서 사유를 기록하고,
 * 로그아웃 시점에 그 값을 꺼내 쓴다. 배너가 "다시 로그인해 주세요"(만료)인지
 * "모든 기기에서 로그아웃했어요"(보안)인지가 여기서 갈린다 (design.md §4.3).
 */
let lastRefreshNotice: SessionNotice = 'expired';

export function configureSession(): void {
  configureAuth({
    refresh: async refreshToken => {
      try {
        const pair = await refreshTokens(refreshToken);
        lastRefreshNotice = 'expired';
        return toTokens(pair);
      } catch (error) {
        lastRefreshNotice =
          error instanceof ApiError &&
          (error.code === AUTH_ERROR.refreshReused || error.code === AUTH_ERROR.refreshRevoked)
            ? 'revoked' // AC-24
            : 'expired'; // AC-23 · AC-25
        throw error;
      }
    },
    onSessionExpired: () => {
      useSession.getState().signOut(lastRefreshNotice);
    },
  });
}
