package com.planbee.api.common.error;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

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

import com.fasterxml.jackson.annotation.JsonProperty;

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
	public ResponseEntity<ProblemDetail> handleBusinessException(BusinessException exception) {
		ErrorCode errorCode = exception.errorCode();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(errorCode.status(), exception.getMessage());
		problem.setProperty(CODE_PROPERTY, errorCode.code());
		// 화면을 그리는 데 필요한 추가 값 (예: auth 의 account_status, lock_remaining_minutes).
		exception.extensions().forEach(problem::setProperty);

		HttpHeaders responseHeaders = new HttpHeaders();
		exception.headers().forEach(responseHeaders::add);

		return ResponseEntity.status(errorCode.status()).headers(responseHeaders).body(problem);
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
		Object target = exception.getBindingResult().getTarget();
		return exception.getBindingResult().getFieldErrors().stream()
				.map(error -> new FieldErrorDetail(
						toJsonFieldName(target, error.getField()),
						toConstraintCode(error),
						error.getDefaultMessage()))
				.toList();
	}

	/**
	 * 검증 실패가 가리키는 필드 이름을 <b>응답 본문과 같은 표기</b>로 바꾼다 (common.md C-7).
	 *
	 * <p>Bean Validation 이 주는 이름은 Java 프로퍼티명({@code signupReason})이라,
	 * 그대로 내보내면 같은 응답 안에서 {@code errors[].field} 만 camelCase 로 튄다.
	 * 모바일은 이 값으로 어느 입력란에 오류를 붙일지 정하므로 (design.md §5.6) 표기가 갈리면
	 * 매핑이 조용히 실패한다.
	 *
	 * <p>변환은 두 단계다. 먼저 대상 타입에 {@code @JsonProperty} 로 이름이 <b>명시</b>돼 있으면
	 * 그 값을 그대로 쓴다 — Jackson 의 기본 전략이 글자와 숫자 사이에 밑줄을 넣지 않아
	 * 계약의 이름과 어긋나는 필드가 있고({@code age_over_14_confirmed}), 그 예외를 여기서도
	 * 똑같이 따라가야 한다. 명시가 없으면 Jackson 의 SNAKE_CASE 와 같은 규칙을 적용한다.
	 */
	private String toJsonFieldName(Object target, String path) {
		int boundary = path.indexOf('.');
		String head = boundary < 0 ? path : path.substring(0, boundary);
		String tail = boundary < 0 ? "" : path.substring(boundary);

		// consents[0] 처럼 인덱스가 붙은 세그먼트는 이름 부분만 떼어 변환한다.
		int index = head.indexOf('[');
		String name = index < 0 ? head : head.substring(0, index);
		String suffix = index < 0 ? "" : head.substring(index);

		String resolved = explicitJsonName(target, name).orElseGet(() -> toSnakeCase(name));
		return resolved + suffix + tail;
	}

	private Optional<String> explicitJsonName(Object target, String property) {
		if (target == null) {
			return Optional.empty();
		}
		try {
			JsonProperty annotation = target.getClass()
					.getDeclaredField(property)
					.getAnnotation(JsonProperty.class);
			return annotation == null || annotation.value().isEmpty()
					? Optional.empty()
					: Optional.of(annotation.value());
		}
		catch (NoSuchFieldException ignored) {
			return Optional.empty();
		}
	}

	/** Jackson 의 {@code SnakeCaseStrategy} 와 같은 규칙. 글자 사이의 대문자 경계에서만 끊는다. */
	private String toSnakeCase(String name) {
		return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
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
