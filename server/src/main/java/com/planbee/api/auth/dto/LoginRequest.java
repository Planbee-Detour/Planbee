package com.planbee.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 로그인 요청.
 *
 * <p><b>이메일 형식을 검증하지 않는다.</b> {@code @Email} 을 일부러 붙이지 않았다 —
 * 형식 오류를 400 으로 갈라내면 "형식이 맞는 미등록 이메일" 과 "형식이 틀린 이메일" 의 응답이
 * 달라지고, 그건 AC-13 이 막으려는 계정 존재 노출과 같은 종류다 (design.md §4.4).
 * 형식이 틀린 값도 그대로 받아 401 {@code AUTH_INVALID_CREDENTIALS} 를 낸다.
 *
 * <p>비밀번호도 정책 검증을 하지 않는다. 기존 비밀번호이므로 형식을 따지지 않고 대조만 한다.
 */
@Schema(type = "object", description = "로그인 요청")
public record LoginRequest(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "name@example.com")
		@NotBlank @Size(max = 255) String email,

		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "planbee2026")
		@NotBlank @Size(max = 72) String password) {
}
