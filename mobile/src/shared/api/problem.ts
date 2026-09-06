/**
 * 서버 오류 응답(RFC 9457 problem+json) 파싱. (docs/conventions/common.md C-1)
 *
 * 화면 코드는 이 모듈이 만든 {@link ApiError} 만 다룬다. 원본 응답을 직접 해석하지 않는다.
 * 분기는 항상 `code` 로 한다. 문구(`detail`)는 바뀔 수 있고 코드는 계약이다. (mobile.md M-13)
 */

export type FieldErrorDetail = {
  field: string;
  code: string;
  message: string;
};

export type ProblemDetail = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  errors?: FieldErrorDetail[];
};

/** 서버가 카탈로그에 없는 코드를 보냈거나 응답을 해석하지 못했을 때. */
export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

/** 네트워크 자체가 실패해 응답을 받지 못했을 때. */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

const FALLBACK_MESSAGE = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
const NETWORK_MESSAGE = '네트워크에 연결할 수 없어요. 연결 상태를 확인해 주세요.';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldErrorDetail[];
  readonly instance?: string;
  /**
   * 파싱하지 않은 원본 본문.
   *
   * RFC 9457 은 표준 필드 외의 멤버를 허용하고, 어떤 오류는 화면을 그리는 데 필요한 값을
   * 그 자리에 싣는다 (예: auth 의 `account_status`, `lock_remaining_minutes`).
   * 그 필드들은 도메인 계약에만 있는 것이라 이 공용 모델이 이름을 알아서는 안 된다 —
   * 대신 원본을 그대로 남겨 두고, 꺼내는 일은 각 기능의 api 계층이 한다.
   */
  readonly raw?: unknown;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: FieldErrorDetail[];
    instance?: string;
    raw?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors ?? [];
    this.instance = params.instance;
    this.raw = params.raw;
  }

  /** 특정 필드의 검증 실패 문구. 폼 오류 표시에 사용한다. */
  messageForField(field: string): string | undefined {
    return this.fieldErrors.find(error => error.field === field)?.message;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function networkError(): ApiError {
  return new ApiError({
    status: 0,
    code: NETWORK_ERROR_CODE,
    message: NETWORK_MESSAGE,
  });
}

/**
 * 응답 본문을 ApiError 로 변환한다. 본문이 계약과 달라도 절대 예외를 던지지 않는다 —
 * 오류 처리 중에 앱이 죽으면 사용자는 아무 안내도 받지 못한다.
 */
export function toApiError(response: Pick<Response, 'status'>, body: unknown): ApiError {
  const problem = asProblem(body);

  return new ApiError({
    status: problem?.status ?? response.status,
    code: problem?.code ?? UNKNOWN_ERROR_CODE,
    message: problem?.detail?.trim() || FALLBACK_MESSAGE,
    fieldErrors: asFieldErrors(problem?.errors),
    instance: problem?.instance,
    raw: body,
  });
}

function asProblem(body: unknown): Partial<ProblemDetail> | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const candidate = body as Record<string, unknown>;
  return {
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    detail: typeof candidate.detail === 'string' ? candidate.detail : undefined,
    instance: typeof candidate.instance === 'string' ? candidate.instance : undefined,
    errors: Array.isArray(candidate.errors) ? candidate.errors : undefined,
  };
}

function asFieldErrors(errors: unknown): FieldErrorDetail[] {
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.flatMap(entry => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.field !== 'string') {
      return [];
    }
    return [
      {
        field: candidate.field,
        code: typeof candidate.code === 'string' ? candidate.code : UNKNOWN_ERROR_CODE,
        message: typeof candidate.message === 'string' ? candidate.message : FALLBACK_MESSAGE,
      },
    ];
  });
}
