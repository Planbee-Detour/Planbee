/**
 * 타입 안전 API 클라이언트. 타입은 계약(docs/api/openapi.yaml)에서 생성된다. (mobile.md M-8)
 *
 * 인증 헤더 부착과 401 처리는 여기 한 곳에만 있다. 화면이나 기능 코드에서
 * Authorization 헤더를 직접 다루지 않는다. (mobile.md M-14)
 */
import createClient from 'openapi-fetch';

import {API_BASE_URL} from '../config/env';
import {ApiError, networkError, toApiError} from './problem';
import type {paths} from './schema';
import {clearTokens, loadTokens, saveTokens, type Tokens} from './session';

export type RefreshFn = (refreshToken: string) => Promise<Tokens>;

type AuthConfig = {
  refresh?: RefreshFn;
  onSessionExpired?: () => void;
};

// 인증 기능이 구현되면 앱 시작 시 configureAuth() 로 주입한다.
let authConfig: AuthConfig = {};

export function configureAuth(config: AuthConfig): void {
  authConfig = config;
}

/**
 * 갱신 요청을 하나로 합친다(단일 비행). 화면 여러 개가 동시에 401 을 받아도
 * 리프레시 토큰은 한 번만 사용된다 — 회전(rotation) 정책과 충돌하지 않기 위함이다.
 */
let refreshInFlight: Promise<Tokens | null> | null = null;

function refreshOnce(refreshToken: string): Promise<Tokens | null> {
  if (!authConfig.refresh) {
    return Promise.resolve(null);
  }
  if (!refreshInFlight) {
    const refresh = authConfig.refresh;
    refreshInFlight = refresh(refreshToken)
      .then(async tokens => {
        await saveTokens(tokens);
        return tokens;
      })
      .catch(async () => {
        await clearTokens();
        authConfig.onSessionExpired?.();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function withAuthorization(init: RequestInit | undefined, accessToken?: string): RequestInit {
  if (!accessToken) {
    return init ?? {};
  }
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return {...init, headers};
}

/**
 * 인증 헤더를 붙이고, 401 이면 **한 번만** 갱신 후 재시도한다.
 * 재시도에도 실패하면 그대로 401 을 돌려준다. 같은 요청을 무한 반복하지 않는다.
 */
export const authFetch: typeof fetch = async (input, init) => {
  const tokens = await loadTokens();
  const response = await fetch(input, withAuthorization(init, tokens?.accessToken));

  if (response.status !== 401 || !tokens?.refreshToken) {
    return response;
  }

  const renewed = await refreshOnce(tokens.refreshToken);
  if (!renewed) {
    return response;
  }
  return fetch(input, withAuthorization(init, renewed.accessToken));
};

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authFetch,
});

/**
 * openapi-fetch 의 {data, error} 결과를 풀어낸다. 실패면 ApiError 를 던진다.
 * react-query 는 던져진 오류를 그대로 error 상태로 넘겨주므로 화면에서 분기하기 쉽다.
 */
export async function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): Promise<T> {
  if (result.error !== undefined || !result.response.ok) {
    throw toApiError(result.response, result.error);
  }
  return result.data as T;
}

/** fetch 자체가 실패한 경우까지 ApiError 로 정규화한다. */
export async function request<T>(run: () => Promise<{data?: T; error?: unknown; response: Response}>): Promise<T> {
  try {
    return await unwrap(await run());
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw networkError();
  }
}
