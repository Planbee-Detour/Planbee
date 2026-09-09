package com.planbee.api.common.security;

import java.util.ArrayList;
import java.util.Collection;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

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
	/** {@code hasRole} 이 붙이는 접두어. {@code ROLE_ADMIN} 권한이 있어야 통과한다. */
	private static final String ROLE_AUTHORITY_PREFIX = "ROLE_";

	/** 관리자 역할 이름. auth 의 {@code UserRole.ADMIN} 과 같은 문자열이어야 한다 (S-2 로 참조하지 않는다). */
	private static final String ADMIN_ROLE = "ADMIN";

	private static final String[] PUBLIC_PATHS = {
			"/api/v1/health",
			"/api/v1/auth/signup",
			"/api/v1/auth/login",
			"/api/v1/auth/token/refresh",
			// 주변 장소·장소 상세는 로그인 전에도 볼 수 있다 (nearby-places/place-detail 계약: security: []).
			"/api/v1/places/**",
			"/actuator/health",
			"/actuator/info",
			"/v3/api-docs/**",
			"/swagger-ui/**",
			"/swagger-ui.html"
	};

	/** 계정 삭제만 이 경로를 삭제 전용 토큰으로도 부를 수 있다 (auth AC-50). */
	private static final String ACCOUNT_PATH = "/api/v1/auth/me";

	/**
	 * 관리자 전용 경로 (admin-user-approval AC-3).
	 *
	 * <p>기본 정책이 거부라 아무것도 하지 않아도 <b>인증</b>은 걸리지만 <b>역할</b>은 걸리지 않는다.
	 * 그래서 여기서 따로 건다. 경로 단위로 거는 이유는 방어선이 컨트롤러보다 앞에 있어야
	 * 하기 때문이다 — 나중에 이 경로에 엔드포인트가 하나 더 늘 때 서비스에서 역할 확인을
	 * 빠뜨려도 여기서 막힌다.
	 */
	private static final String ADMIN_PATHS = "/api/v1/admin/**";

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
						// 관리자 경로는 일반 세션 <b>이면서</b> 역할이 ADMIN 이어야 한다.
						// 둘을 allOf 로 묶는 이유는 삭제 전용 토큰이 역할 검사보다 먼저 걸려야
						// 코드가 ADMIN_FORBIDDEN 이 아니라 FORBIDDEN 으로 나가기 때문이다
						// (계약 ForbiddenScope — 판정은 AdminForbiddenCodeResolver 가 한다).
						.requestMatchers(ADMIN_PATHS).access(AuthorizationManagers.allOf(
								AuthorityAuthorizationManager.hasAuthority(TokenScope.FULL.authority()),
								AuthorityAuthorizationManager.hasRole(ADMIN_ROLE)))
						// 그 밖의 모든 인증 경로는 일반 세션만 허용한다. 삭제 전용 토큰으로 여기 오면 403 이다.
						.anyRequest().hasAuthority(TokenScope.FULL.authority()))
				.oauth2ResourceServer(resourceServer -> resourceServer
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
						.authenticationEntryPoint(problemResponder))
				.exceptionHandling(handling -> handling
						.authenticationEntryPoint(problemResponder)
						.accessDeniedHandler(problemResponder))
				.build();
	}

	/**
	 * JWT → 권한 변환. 기본 변환기가 만드는 {@code SCOPE_*} 에 <b>{@code ROLE_*} 를 더한다.</b>
	 *
	 * <p>커스텀 인증 <i>필터</i>를 만드는 것과는 다르다 (S-17) — 검증은 여전히
	 * oauth2-resource-server 가 하고, 여기서는 검증된 클레임을 권한 이름으로 옮길 뿐이다.
	 * 역할이 없는 토큰(예: 이 변경 이전에 발급된 토큰)은 {@code ROLE_*} 없이 통과하므로
	 * 관리자 경로에서 403 이 된다 — 닫히는 쪽으로 실패한다.
	 */
	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(jwt -> {
			Collection<GrantedAuthority> authorities = new ArrayList<>(scopes.convert(jwt));
			String role = jwt.getClaimAsString(JwtClaims.ROLE);
			if (StringUtils.hasText(role)) {
				authorities.add(new SimpleGrantedAuthority(ROLE_AUTHORITY_PREFIX + role));
			}
			return authorities;
		});
		return converter;
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
