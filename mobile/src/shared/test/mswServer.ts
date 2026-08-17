/**
 * 테스트용 API 목 서버. 목 응답은 계약(docs/api/openapi.yaml)의 example 을 근거로 만든다.
 * 기본 핸들러는 두지 않는다 — 각 테스트가 필요한 응답을 명시하게 해서
 * "무엇을 가정한 테스트인지"가 테스트 파일 안에서 드러나게 한다.
 */
// React Native 환경에서는 msw/node 가 export 조건에 막힌다. RN 전용 진입점을 쓴다.
import {setupServer} from 'msw/native';

export const server = setupServer();

export const API_ORIGIN = 'http://localhost:8080';

/** 계약의 Problem 스키마와 같은 형태의 오류 본문을 만든다. */
export function problemBody(params: {
  status: number;
  code: string;
  detail?: string;
  errors?: Array<{field: string; code: string; message: string}>;
}) {
  return {
    type: 'about:blank',
    title: 'Error',
    status: params.status,
    detail: params.detail ?? '오류가 발생했습니다.',
    code: params.code,
    ...(params.errors ? {errors: params.errors} : {}),
  };
}
