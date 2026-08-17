package com.planbee.api.common.error;

import org.springframework.http.HttpStatus;

/**
 * 도메인에 속하지 않는 공통 에러 코드.
 * 도메인 고유의 실패는 각 도메인 패키지의 enum 에 정의한다.
 */
public enum CommonErrorCode implements ErrorCode {

	VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요."),
	MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다."),
	UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
	FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
	NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
	METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
	CONFLICT(HttpStatus.CONFLICT, "이미 처리되었거나 충돌하는 요청입니다."),
	INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다.");

	private final HttpStatus status;
	private final String defaultMessage;

	CommonErrorCode(HttpStatus status, String defaultMessage) {
		this.status = status;
		this.defaultMessage = defaultMessage;
	}

	/** Spring 이 자체적으로 처리한 예외에 코드를 채워 넣기 위한 상태 -> 코드 매핑. */
	static CommonErrorCode fromStatus(int statusCode) {
		return switch (statusCode) {
			case 400 -> MALFORMED_REQUEST;
			case 401 -> UNAUTHORIZED;
			case 403 -> FORBIDDEN;
			case 404 -> NOT_FOUND;
			case 405 -> METHOD_NOT_ALLOWED;
			case 409 -> CONFLICT;
			default -> INTERNAL_ERROR;
		};
	}

	@Override
	public String code() {
		return name();
	}

	@Override
	public HttpStatus status() {
		return status;
	}

	@Override
	public String defaultMessage() {
		return defaultMessage;
	}
}
