package com.planbee.api.common.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * 자체 발급 JWT 설정. 단일 서비스이므로 대칭키(HS256)를 쓴다.
 * 외부 서비스가 토큰을 검증해야 하는 시점이 오면 RSA 키쌍으로 바꾼다. (server.md S-17)
 *
 * @param secret          HS256 서명 키. 최소 32바이트. 운영에서는 반드시 JWT_SECRET 환경변수로 주입한다.
 * @param accessTokenTtl  액세스 토큰 수명. 짧게 유지하고 갱신은 리프레시 토큰으로 한다.
 * @param refreshTokenTtl 리프레시 토큰 수명.
 */
@Validated
@ConfigurationProperties(prefix = "planbee.security.jwt")
public record JwtProperties(
		@NotBlank @Size(min = 32, message = "HS256 서명 키는 최소 32바이트여야 합니다.") String secret,
		@DefaultValue("30m") Duration accessTokenTtl,
		@DefaultValue("14d") Duration refreshTokenTtl) {

	public SecretKey secretKey() {
		return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}
}
