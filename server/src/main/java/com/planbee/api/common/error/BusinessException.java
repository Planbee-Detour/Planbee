package com.planbee.api.common.error;

/**
 * 서비스 계층에서 던지는 도메인 예외. 컨트롤러에서 try-catch 로 응답을 만들지 않는다. (server.md S-7)
 * {@link GlobalExceptionHandler} 가 RFC 9457 ProblemDetail 로 변환한다.
 */
public class BusinessException extends RuntimeException {

	private final transient ErrorCode errorCode;

	public BusinessException(ErrorCode errorCode) {
		this(errorCode, errorCode.defaultMessage());
	}

	public BusinessException(ErrorCode errorCode, String message) {
		super(message);
		this.errorCode = errorCode;
	}

	public ErrorCode errorCode() {
		return errorCode;
	}
}
