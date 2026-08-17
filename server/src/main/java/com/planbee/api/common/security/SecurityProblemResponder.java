package com.planbee.api.common.security;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planbee.api.common.error.CommonErrorCode;

/**
 * 인증/인가 실패는 필터 체인에서 발생하므로 {@code GlobalExceptionHandler} 를 타지 않는다.
 * 이 클래스가 같은 RFC 9457 형식을 유지해, 모바일이 401/403 도 다른 오류와 동일하게 다룰 수 있게 한다.
 */
@Component
public class SecurityProblemResponder implements AuthenticationEntryPoint, AccessDeniedHandler {

	private static final String CODE_PROPERTY = "code";

	private final ObjectMapper objectMapper;

	public SecurityProblemResponder(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void commence(
			HttpServletRequest request,
			HttpServletResponse response,
			AuthenticationException authenticationException) throws IOException {
		write(request, response, CommonErrorCode.UNAUTHORIZED);
	}

	@Override
	public void handle(
			HttpServletRequest request,
			HttpServletResponse response,
			AccessDeniedException accessDeniedException) throws IOException {
		write(request, response, CommonErrorCode.FORBIDDEN);
	}

	private void write(HttpServletRequest request, HttpServletResponse response, CommonErrorCode errorCode)
			throws IOException {

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(errorCode.status(), errorCode.defaultMessage());
		problem.setInstance(URI.create(request.getRequestURI()));
		problem.setProperty(CODE_PROPERTY, errorCode.code());

		response.setStatus(errorCode.status().value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		objectMapper.writeValue(response.getOutputStream(), problem);
	}
}
