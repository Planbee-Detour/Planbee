/**
 * 오류 계약(common.md C-1)과 토큰 취급 규칙(mobile.md M-13, M-14)을 테스트로 고정한다.
 * 이 파일이 깨지면 앱의 오류 처리와 세션 관리가 통째로 흔들린다.
 */
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../test/mswServer';
import {apiClient, configureAuth, request} from '../client';
import {ApiError, UNKNOWN_ERROR_CODE} from '../problem';
import {clearTokens, loadTokens, saveTokens} from '../session';

const HEALTH = `${API_ORIGIN}/api/v1/health`;

const callHealth = () => request(() => apiClient.GET('/api/v1/health'));

beforeEach(async () => {
  await clearTokens();
  configureAuth({});
});

describe('오류 응답 해석', () => {
  it('problem+json 을 code 로 분기할 수 있는 ApiError 로 바꾼다', async () => {
    server.use(
      http.get(HEALTH, () =>
        HttpResponse.json(problemBody({status: 404, code: 'SCHEDULE_NOT_FOUND', detail: '일정을 찾을 수 없습니다.'}), {
          status: 404,
        }),
      ),
    );

    await expect(callHealth()).rejects.toMatchObject({
      code: 'SCHEDULE_NOT_FOUND',
      status: 404,
      message: '일정을 찾을 수 없습니다.',
    });
  });

  it('검증 실패는 필드별 문구를 제공한다', async () => {
    server.use(
      http.get(HEALTH, () =>
        HttpResponse.json(
          problemBody({
            status: 400,
            code: 'VALIDATION_FAILED',
            errors: [{field: 'title', code: 'NOT_BLANK', message: '제목을 입력하세요.'}],
          }),
          {status: 400},
        ),
      ),
    );

    const error = await callHealth().catch(caught => caught as ApiError);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).messageForField('title')).toBe('제목을 입력하세요.');
    expect((error as ApiError).messageForField('없는필드')).toBeUndefined();
  });

  it('계약과 다른 본문이 와도 예외를 던지지 않고 UNKNOWN_ERROR 로 처리한다', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.text('<html>gateway error</html>', {status: 502})));

    await expect(callHealth()).rejects.toMatchObject({code: UNKNOWN_ERROR_CODE, status: 502});
  });
});

describe('인증 토큰 취급', () => {
  it('저장된 액세스 토큰을 Authorization 헤더로 붙인다', async () => {
    await saveTokens({accessToken: 'access-1', refreshToken: 'refresh-1'});
    let seen: string | null = null;
    server.use(
      http.get(HEALTH, ({request: received}) => {
        seen = received.headers.get('Authorization');
        return HttpResponse.json({service: 'planbee-api', status: 'UP', timestamp: '2026-08-17T00:00:00Z'});
      }),
    );

    await callHealth();

    expect(seen).toBe('Bearer access-1');
  });

  it('401 이면 갱신 후 한 번만 재시도한다', async () => {
    await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});
    const refresh = jest.fn(async () => ({accessToken: 'access-2', refreshToken: 'refresh-2'}));
    configureAuth({refresh});

    let attempts = 0;
    server.use(
      http.get(HEALTH, ({request: received}) => {
        attempts += 1;
        if (received.headers.get('Authorization') !== 'Bearer access-2') {
          return HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401});
        }
        return HttpResponse.json({service: 'planbee-api', status: 'UP', timestamp: '2026-08-17T00:00:00Z'});
      }),
    );

    await expect(callHealth()).resolves.toMatchObject({status: 'UP'});
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);
    await expect(loadTokens()).resolves.toMatchObject({accessToken: 'access-2'});
  });

  it('동시에 401 을 받아도 갱신은 한 번만 일어난다', async () => {
    await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});
    const refresh = jest.fn(async () => ({accessToken: 'access-2', refreshToken: 'refresh-2'}));
    configureAuth({refresh});

    server.use(
      http.get(HEALTH, ({request: received}) =>
        received.headers.get('Authorization') === 'Bearer access-2'
          ? HttpResponse.json({service: 'planbee-api', status: 'UP', timestamp: '2026-08-17T00:00:00Z'})
          : HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401}),
      ),
    );

    await Promise.all([callHealth(), callHealth(), callHealth()]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('갱신에 실패하면 토큰을 지우고 세션 만료를 알린다', async () => {
    await saveTokens({accessToken: 'expired', refreshToken: 'refresh-1'});
    const onSessionExpired = jest.fn();
    configureAuth({
      refresh: async () => {
        throw new Error('refresh rejected');
      },
      onSessionExpired,
    });

    server.use(
      http.get(HEALTH, () => HttpResponse.json(problemBody({status: 401, code: 'UNAUTHORIZED'}), {status: 401})),
    );

    await expect(callHealth()).rejects.toMatchObject({code: 'UNAUTHORIZED'});
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    await expect(loadTokens()).resolves.toBeNull();
  });
});
