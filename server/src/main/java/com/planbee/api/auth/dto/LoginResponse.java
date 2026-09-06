package com.planbee.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 로그인 성공. 계정 상태가 {@code APPROVED} 인 경우에만 반환된다 (AC-11). */
@Schema(type = "object", description = "로그인 성공 응답")
public record LoginResponse(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) TokenPair token,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UserSummary user) {
}
