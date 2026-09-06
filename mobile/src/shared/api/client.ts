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
  const headers = new Headers(init?.headers);
  // 호출부가 직접 붙인 헤더가 있으면 그대로 둔다. 저장된 세션이 아니라 그 요청에만 쓰는
  // 토큰으로 불러야 하는 경우가 있다 — auth 의 삭제 전용 토큰(AC-50)이 그렇다.
  if (headers.has('Authorization')) {
    return {...init, headers};
  }
  if (!accessToken) {
    return init ?? {};
  }
  headers.set('Authorization', `Bearer ${accessToken}`);
  return {...init, headers};
}

/**
 * 인증 헤더를 붙이고, 401 이면 **한 번만** 갱신 후 재시도한다.
 * 재시도에도 실패하면 그대로 401 을 돌려준다. 같은 요청을 무한 반복하지 않는다.
 */
export const authFetch: typeof fetch = async (input, init) => {
  const tokens = await loadTokens();
  const requestInit = withAuthorization(init, tokens?.accessToken);
  const response = await fetch(input, requestInit);

  // 401 이라고 무조건 갱신하지 않는다. 요청이 자기 토큰을 들고 온 경우(삭제 전용 토큰)에는
  // 저장된 세션으로 재시도해봐야 의미가 없고, 비밀번호 불일치처럼 세션과 무관한 401 도 있다 (M-14).
  const carriesOwnToken = new Headers(init?.headers).has('Authorization');
  if (response.status !== 401 || !tokens?.refreshToken || carriesOwnToken) {
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
 * 저장된 세션을 쓰지 않는 요청용 클라이언트. `authFetch` 를 타지 않으므로 401 을 받아도
 * 갱신을 시도하지 않는다.
 *
 * <b>갱신 요청(`POST /auth/token/refresh`) 자신이 여기를 쓴다</b> (defects.md D-T1).
 * 갱신을 `apiClient` 로 보내면 그 요청의 401 이 다시 갱신을 부르고, 그 갱신은 이미 진행 중인
 * `refreshInFlight`(= 지금 이 요청)를 기다리게 되어 영원히 끝나지 않는다. 재귀를 조건으로
 * 막는 대신 경로를 분리해 구조적으로 생기지 않게 한다.
 * 이 엔드포인트는 서버에서도 인증이 필요 없다(permitAll) — 액세스 토큰을 붙일 이유가 없다.
 */
export const publicClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  // fetch 를 넘기지 않으면 openapi-fetch 가 `createClient` 호출 시점의 `globalThis.fetch` 를
  // 값으로 붙잡는다. 이 모듈은 테스트 프레임워크가 fetch 를 교체하기 전에 로드되므로,
  // 그러면 이 클라이언트만 목킹을 우회해 실제 네트워크로 나간다. `authFetch` 와 마찬가지로
  // 호출 시점에 참조하도록 감싼다.
  fetch: (...args) => fetch(...args),
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
