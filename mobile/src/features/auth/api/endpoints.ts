/**
 * auth API 호출. `shared/api/client.ts` 의 `request()` 만 쓴다 — `fetch` 를 직접 부르지 않는다 (M-8).
 *
 * 이 파일이 하는 <b>유일한 해석</b>은 "오류 응답에 실려 온 화면 데이터를 꺼내는 것" 이다.
 * 계정 상태 차단(403)과 로그인 잠금(429)은 RFC 9457 확장 필드로 화면 값을 함께 보내는데,
 * `ApiError` 는 표준 필드만 들고 있어 여기서 원본 본문을 한 번 더 본다.
 * 그 외의 판단(무슨 화면을 띄울지)은 전부 화면의 몫이다.
 */
import {apiClient, publicClient, request} from '../../../shared/api/client';
import {ApiError} from '../../../shared/api/problem';
import type {
  AccountStatusView,
  LoginLockInfo,
  LoginOutcome,
  SignupRequest,
  TokenPair,
  UserSummary,
} from '../types';

/** `docs/api/error-codes.md` 의 auth 코드. 분기는 항상 이 값으로 한다 (M-13). */
export const AUTH_ERROR = {
  emailAlreadyRegistered: 'AUTH_EMAIL_ALREADY_REGISTERED',
  signupRateLimited: 'AUTH_SIGNUP_RATE_LIMITED',
  invalidCredentials: 'AUTH_INVALID_CREDENTIALS',
  loginLocked: 'AUTH_LOGIN_LOCKED',
  accountPending: 'AUTH_ACCOUNT_PENDING',
  accountRejected: 'AUTH_ACCOUNT_REJECTED',
  accountSuspended: 'AUTH_ACCOUNT_SUSPENDED',
  refreshExpired: 'AUTH_REFRESH_TOKEN_EXPIRED',
  refreshInvalid: 'AUTH_REFRESH_TOKEN_INVALID',
  refreshReused: 'AUTH_REFRESH_TOKEN_REUSED',
  refreshRevoked: 'AUTH_REFRESH_TOKEN_REVOKED',
  passwordMismatch: 'AUTH_PASSWORD_MISMATCH',
} as const;

const ACCOUNT_BLOCKED_CODES: string[] = [
  AUTH_ERROR.accountPending,
  AUTH_ERROR.accountRejected,
  AUTH_ERROR.accountSuspended,
];

/**
 * 오류 본문의 확장 필드를 읽는다.
 *
 * `ApiError` 에 확장 필드까지 넣지 않은 이유: 그 필드는 auth 계약에만 있는 것이고,
 * 공용 오류 모델이 도메인 필드를 알기 시작하면 도메인이 늘 때마다 `shared/` 가 커진다.
 */
function extension<T>(error: ApiError, key: string): T | null {
  const body = error.raw as Record<string, unknown> | undefined;
  const value = body?.[key];
  return value === undefined || value === null ? null : (value as T);
}

export function isAccountBlocked(error: unknown): error is ApiError {
  return error instanceof ApiError && ACCOUNT_BLOCKED_CODES.includes(error.code);
}

export function accountStatusOf(error: ApiError): AccountStatusView | null {
  return extension<AccountStatusView>(error, 'account_status');
}

export function deletionTokenOf(error: ApiError): string | null {
  return extension<string>(error, 'deletion_token');
}

export function loginLockOf(error: ApiError): LoginLockInfo | null {
  const minutes = extension<number>(error, 'lock_remaining_minutes');
  if (typeof minutes !== 'number') {
    return null;
  }
  return {
    remainingMinutes: minutes,
    supportContactEmail: extension<string>(error, 'support_contact_email'),
  };
}

// ───────────────────────────────────────────────────────────────────
// 호출
// ───────────────────────────────────────────────────────────────────

/** 가입 신청 (AC-1). 응답 하나로 검토 중 화면이 완성된다 (AC-46). */
export async function signup(body: SignupRequest): Promise<AccountStatusView> {
  const result = await request(() =>
    apiClient.POST('/api/v1/auth/signup', {body}),
  );
  return result.account_status;
}

/**
 * 로그인 (AC-11 · AC-14 · AC-15 · AC-16).
 *
 * 상태 차단(403)을 <b>오류로 던지지 않고</b> 결과로 돌려준다 — 화면 입장에서는
 * 홈으로 갈지 상태 안내로 갈지가 갈릴 뿐 둘 다 정상 흐름이기 때문이다.
 * 자격 증명 실패·잠금·서버 오류만 던진다.
 */
export async function login(email: string, password: string): Promise<LoginOutcome> {
  try {
    const result = await request(() =>
      apiClient.POST('/api/v1/auth/login', {body: {email, password}}),
    );
    return {kind: 'session', tokens: result.token, user: result.user};
  } catch (error) {
    if (isAccountBlocked(error)) {
      const accountStatus = accountStatusOf(error);
      if (accountStatus) {
        return {kind: 'blocked', accountStatus, deletionToken: deletionTokenOf(error)};
      }
    }
    throw error;
  }
}

/**
 * 토큰 갱신 (AC-22 · AC-49). 실패 코드는 호출부가 배너로 갈라 쓴다 (design.md §4.3).
 *
 * 이 호출만 `apiClient` 가 아니라 `publicClient` 를 쓴다 — 갱신 요청 자신이 401 을 받았을 때
 * 다시 갱신을 부르지 않게 하기 위함이다 (defects.md D-T1). 사유는 `client.ts` 의 주석에 있다.
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  return request(() =>
    publicClient.POST('/api/v1/auth/token/refresh', {body: {refresh_token: refreshToken}}),
  );
}

/** 로그아웃 (AC-26). 서버 실패는 화면 동작에 영향을 주지 않는다 (AC-27) — 호출부가 삼킨다. */
export async function logout(refreshToken: string): Promise<void> {
  await request(() =>
    apiClient.POST('/api/v1/auth/logout', {body: {refresh_token: refreshToken}}),
  );
}

/** 설정 화면의 계정 카드 (design.md §8.2). */
export async function fetchMe(): Promise<UserSummary> {
  return request(() => apiClient.GET('/api/v1/auth/me'));
}

/**
 * 계정 삭제 (AC-29 · AC-31 · AC-50).
 *
 * @param deletionToken `REJECTED` 상태 화면에서 진입한 경우 로그인 응답이 준 삭제 전용 토큰.
 *                      로그인된 사용자는 넘기지 않는다 — 저장된 액세스 토큰이 자동으로 붙는다
 */
export async function deleteAccount(password: string, deletionToken?: string): Promise<void> {
  await request(() =>
    apiClient.DELETE('/api/v1/auth/me', {
      body: {password},
      headers: deletionToken ? {Authorization: `Bearer ${deletionToken}`} : undefined,
    }),
  );
}
