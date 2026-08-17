package com.planbee.api.common.error;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 모든 오류 응답을 RFC 9457 ProblemDetail 로 통일한다. (common.md C-1)
 *
 * <p>표준 필드(type/title/status/detail/instance)에 두 가지 확장을 더한다.
 * <ul>
 *   <li>{@code code} — 모바일이 분기하는 기계용 식별자. 모든 오류 응답에 항상 존재한다.</li>
 *   <li>{@code errors} — 검증 실패 시에만. 필드별 실패 내역.</li>
 * </ul>
 *
 * <p>인증/인가 실패는 필터 체인에서 발생해 이 핸들러를 타지 않는다.
 * 같은 형식을 유지하는 책임은 {@code common.security.SecurityProblemResponder} 에 있다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	static final String CODE_PROPERTY = "code";
	static final String ERRORS_PROPERTY = "errors";

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessException.class)
	public ProblemDetail handleBusinessException(BusinessException exception) {
		ErrorCode errorCode = exception.errorCode();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(errorCode.status(), exception.getMessage());
		problem.setProperty(CODE_PROPERTY, errorCode.code());
		return problem;
	}

	@ExceptionHandler(Exception.class)
	public ProblemDetail handleUnexpectedException(Exception exception) {
		log.error("처리되지 않은 예외", exception);
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.INTERNAL_SERVER_ERROR, CommonErrorCode.INTERNAL_ERROR.defaultMessage());
		problem.setProperty(CODE_PROPERTY, CommonErrorCode.INTERNAL_ERROR.code());
		return problem;
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(
			MethodArgumentNotValidException exception,
			HttpHeaders headers,
			HttpStatusCode status,
			WebRequest request) {

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST, CommonErrorCode.VALIDATION_FAILED.defaultMessage());
		problem.setProperty(CODE_PROPERTY, CommonErrorCode.VALIDATION_FAILED.code());
		problem.setProperty(ERRORS_PROPERTY, toFieldErrors(exception));

		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
	}

	/**
	 * Spring 이 직접 처리하는 예외(요청 본문 파싱 실패, 지원하지 않는 메서드 등)에도
	 * {@code code} 를 채워 넣어, 모바일이 모든 오류를 같은 방식으로 다룰 수 있게 한다.
	 */
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(
			Exception exception,
			Object body,
			HttpHeaders headers,
			HttpStatusCode statusCode,
			WebRequest request) {

		ResponseEntity<Object> response = super.handleExceptionInternal(exception, body, headers, statusCode, request);

		if (response != null && response.getBody() instanceof ProblemDetail problem) {
			Map<String, Object> properties = problem.getProperties();
			if (properties == null || !properties.containsKey(CODE_PROPERTY)) {
				problem.setProperty(CODE_PROPERTY, CommonErrorCode.fromStatus(statusCode.value()).code());
			}
		}
		return response;
	}

	private List<FieldErrorDetail> toFieldErrors(MethodArgumentNotValidException exception) {
		return exception.getBindingResult().getFieldErrors().stream()
				.map(error -> new FieldErrorDetail(
						error.getField(),
						toConstraintCode(error),
						error.getDefaultMessage()))
				.toList();
	}

	/** Bean Validation 의 제약 이름을 코드 규약(UPPER_SNAKE_CASE)으로 바꾼다. 예: NotBlank -> NOT_BLANK */
	private String toConstraintCode(FieldError error) {
		String constraint = error.getCode();
		if (constraint == null) {
			return CommonErrorCode.VALIDATION_FAILED.code();
		}
		return constraint.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toUpperCase(Locale.ROOT);
	}
}
