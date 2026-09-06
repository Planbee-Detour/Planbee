package com.planbee.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 가입 신청 접수 (AC-1). <b>토큰은 발급하지 않는다</b> — 계정이 {@code PENDING} 이라 세션이
 * 성립하지 않는다. 앱은 이 응답만으로 검토 중 화면을 완성하고 별도 조회를 하지 않는다 (AC-46).
 */
@Schema(type = "object", description = "가입 신청 접수 응답")
public record SignupResponse(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) AccountStatusView accountStatus) {
}
