import {useEffect} from 'react';

import {clearTokens, loadTokens, saveTokenPair} from '../../../shared/api/session';
import {refreshTokens} from '../api/endpoints';
import {useSession} from './useSession';

/** 홈을 가리지 않고 저장된 세션만 복원한다 (AC-51·58). */
export function useBackgroundSessionRestore() {
  const signIn = useSession(state => state.signIn);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const tokens = await loadTokens();
      if (!tokens) return;
      try {
        const renewed = await refreshTokens(tokens.refreshToken);
        if (!active) return;
        await saveTokenPair(renewed);
        signIn();
      } catch {
        if (active) await clearTokens();
      }
    };
    restore();
    return () => { active = false; };
  }, [signIn]);
}
