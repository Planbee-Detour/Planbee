package com.planbee.api.common.error;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 서비스 계층에서 던지는 도메인 예외. 컨트롤러에서 try-catch 로 응답을 만들지 않는다. (server.md S-7)
 * {@link GlobalExceptionHandler} 가 RFC 9457 ProblemDetail 로 변환한다.
 *
 * <p><b>확장 필드와 헤더.</b> RFC 9457 은 표준 필드 외의 멤버를 허용하고, 이 프로젝트는 그중
 * {@code code} 와 {@code errors} 를 이미 쓰고 있다 (common.md C-1). 어떤 오류는 화면을 그리는 데
 * 필요한 값을 더 실어야 한다 — 예를 들어 계정 상태 안내 화면은 제목·본문·문의 주소가 오류 응답에
 * 함께 와야 성립하고(auth AC-46), 잠금 응답은 남은 시간이 있어야 한다(AC-17).
 * 그 값들을 {@link #withExtension} 으로 붙인다.
 *
 * <p>이 클래스가 확장 필드를 들고 있는 이유는 <b>공통 계층이 도메인을 알지 않게</b> 하기 위해서다.
 * 도메인마다 전용 예외 핸들러를 두면 {@code common} 이 각 도메인 패키지를 참조하게 되어
 * S-2 의 순환 의존 금지에 걸린다. 도메인은 값만 담고, 변환은 여전히 한 곳에서 한다.
 */
public class BusinessException extends RuntimeException {

	private final transient ErrorCode errorCode;
	private final transient Map<String, Object> extensions = new LinkedHashMap<>();
	private final transient Map<String, String> headers = new LinkedHashMap<>();

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

	/**
	 * ProblemDetail 에 추가할 확장 멤버. 이름은 <b>계약에 적힌 그대로</b> 넘긴다 —
	 * 이 값은 Map 키라 Jackson 의 snake_case 변환(S-21)을 타지 않는다.
	 */
	public BusinessException withExtension(String name, Object value) {
		extensions.put(name, value);
		return this;
	}

	/** 응답에 함께 내보낼 헤더. 429 의 {@code Retry-After} 가 이걸 쓴다 (common.md C-1). */
	public BusinessException withHeader(String name, String value) {
		headers.put(name, value);
		return this;
	}

	public Map<String, Object> extensions() {
		return Collections.unmodifiableMap(extensions);
	}

	public Map<String, String> headers() {
		return Collections.unmodifiableMap(headers);
	}
}
