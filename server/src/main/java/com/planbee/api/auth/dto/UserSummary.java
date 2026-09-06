package com.planbee.api.auth.dto;

import com.planbee.api.auth.UserRole;
import com.planbee.api.auth.UserStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 설정 화면의 "계정" 카드를 그리는 값 (design.md §8.2). */
@Schema(type = "object", description = "로그인한 계정의 요약 정보")
public record UserSummary(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email",
				example = "name@example.com") String email,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "USER") UserRole role,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "APPROVED") UserStatus status) {
}
