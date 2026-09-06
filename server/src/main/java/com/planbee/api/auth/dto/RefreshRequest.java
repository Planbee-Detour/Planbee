package com.planbee.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.media.Schema;

/** 토큰 갱신 · 로그아웃 요청. 둘 다 대상이 되는 리프레시 토큰 하나를 지목한다. */
@Schema(type = "object", description = "리프레시 토큰을 담은 요청")
public record RefreshRequest(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "8f2c1d9e-PLACEHOLDER-REFRESH-TOKEN")
		@NotBlank String refreshToken) {
}
