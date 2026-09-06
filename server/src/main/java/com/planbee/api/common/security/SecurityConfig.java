package com.planbee.api.common.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * 인증 방식: 이메일 + 비밀번호로 자체 발급한 JWT. (2026-08 확정, server.md S-17)
 *
 * <p>토큰 <b>검증</b>은 직접 필터를 만들지 않고 oauth2-resource-server 에 맡긴다.
 * 커스텀 JWT 필터는 보안 결함이 가장 자주 발생하는 지점이라, 표준 구현을 쓰는 편이 안전하다.
 *
 * <p>기본 정책은 <b>거부</b>다. 공개해야 하는 경로만 {@link #PUBLIC_PATHS} 에 명시적으로 추가한다.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

	/**
	 * 인증 없이 열어야 하는 경로.
	 *
	 * <p>auth 를 {@code /api/v1/auth/**} 로 통째로 열지 않는다 — 그러면 로그아웃·계정 조회·
	 * <b>계정 삭제</b>까지 무인증으로 열린다. 세션이 없어야만 부를 수 있는 셋만 공개한다.
	 */
	private static final String[] PUBLIC_PATHS = {
			"/api/v1/health",
			"/api/v1/auth/signup",
			"/api/v1/auth/login",
			"/api/v1/auth/token/refresh",
			"/actuator/health",
			"/actuator/info",
			"/v3/api-docs/**",
			"/swagger-ui/**",
			"/swagger-ui.html"
	};

	/** 계정 삭제만 이 경로를 삭제 전용 토큰으로도 부를 수 있다 (auth AC-50). */
	private static final String ACCOUNT_PATH = "/api/v1/auth/me";

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityProblemResponder problemResponder)
			throws Exception {

		return http
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(requests -> requests
						.requestMatchers(PUBLIC_PATHS).permitAll()
						// 삭제 전용 토큰이 통하는 <b>유일한</b> 지점.
						.requestMatchers(HttpMethod.DELETE, ACCOUNT_PATH)
						.hasAnyAuthority(TokenScope.FULL.authority(), TokenScope.ACCOUNT_DELETE.authority())
						// 그 밖의 모든 인증 경로는 일반 세션만 허용한다. 삭제 전용 토큰으로 여기 오면 403 이다.
						.anyRequest().hasAuthority(TokenScope.FULL.authority()))
				.oauth2ResourceServer(resourceServer -> resourceServer
						.jwt(Customizer.withDefaults())
						.authenticationEntryPoint(problemResponder))
				.exceptionHandling(handling -> handling
						.authenticationEntryPoint(problemResponder)
						.accessDeniedHandler(problemResponder))
				.build();
	}

	/** 비밀번호는 반드시 해시로 저장한다. 알고리즘 교체가 가능하도록 위임 인코더를 쓴다. */
	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	JwtDecoder jwtDecoder(JwtProperties properties) {
		return NimbusJwtDecoder.withSecretKey(properties.secretKey())
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
	}

	@Bean
	JwtEncoder jwtEncoder(JwtProperties properties) {
		return new NimbusJwtEncoder(new ImmutableSecret<>(properties.secretKey()));
	}
}
