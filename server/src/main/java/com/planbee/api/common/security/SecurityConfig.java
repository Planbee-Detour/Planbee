package com.planbee.api.common.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

	private static final String[] PUBLIC_PATHS = {
			"/api/v1/health",
			"/api/v1/auth/**",
			"/actuator/health",
			"/actuator/info",
			"/v3/api-docs/**",
			"/swagger-ui/**",
			"/swagger-ui.html"
	};

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityProblemResponder problemResponder)
			throws Exception {

		return http
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(requests -> requests
						.requestMatchers(PUBLIC_PATHS).permitAll()
						.anyRequest().authenticated())
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
