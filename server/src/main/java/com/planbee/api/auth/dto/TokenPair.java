package com.planbee.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 발급된 토큰 한 쌍.
 *
 * @param accessToken  HS256 자체 발급 JWT. 수명 30분
 * @param refreshToken 서버는 이 값을 <b>해시해서</b> 저장한다. 앱은 Keychain/Keystore 에만 둔다 (AC-18)
 * @param tokenType    항상 {@code "Bearer"}
 * @param expiresIn    액세스 토큰의 수명(초)
 */
@Schema(type = "object", description = "액세스 · 리프레시 토큰 쌍")
public record TokenPair(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				example = "eyJhbGciOiJIUzI1NiJ9.PLACEHOLDER.SIGNATURE") String accessToken,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				example = "8f2c1d9e-PLACEHOLDER-REFRESH-TOKEN") String refreshToken,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Bearer") String tokenType,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "1800") long expiresIn) {

	public static final String BEARER = "Bearer";
}
