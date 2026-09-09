package com.planbee.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import com.planbee.api.common.security.JwtClaims;
import com.planbee.api.common.security.JwtProperties;
import com.planbee.api.common.security.TokenScope;

/**
 * 토큰을 만든다. 검증은 하지 않는다 — 검증은 oauth2-resource-server 의 몫이고
 * 커스텀 필터를 만들지 않는 것이 S-17 의 요지다.
 *
 * <p>클래스 이름이 {@code ...Service} 가 아닌 이유는 레이어(S-3)에 속하지 않는 협력자이기 때문이다.
 * 그래도 시각은 주입받는다 — 발급 시각을 테스트가 고정할 수 없으면 만료 동작을 검증할 수 없다.
 */
@Component
public class TokenIssuer {

	/** 리프레시 토큰의 엔트로피(바이트). 서버가 만든 난수이므로 추측 가능성이 없어야 한다. */
	private static final int REFRESH_TOKEN_BYTES = 32;

	private final JwtEncoder jwtEncoder;
	private final JwtProperties jwtProperties;
	private final SecureRandom random = new SecureRandom();

	public TokenIssuer(JwtEncoder jwtEncoder, JwtProperties jwtProperties) {
		this.jwtEncoder = jwtEncoder;
		this.jwtProperties = jwtProperties;
	}

	/**
	 * 액세스 토큰을 발급한다.
	 *
	 * <p>{@code scope} 클레임은 Spring Security 의 기본 변환기가 {@code SCOPE_<값>} 권한으로
	 * 바꿔 준다. 그래서 경로별 인가를 {@code SecurityConfig} 에서 선언으로 걸 수 있다.
	 *
	 * <p>{@code role} 클레임도 같은 방식으로 {@code ROLE_<값>} 권한이 되어 관리자 경로의
	 * 인가에 쓰인다 (admin-user-approval AC-3). 앱에 역할을 바꾸는 경로가 없으므로
	 * (auth PRD 제약) 토큰에 담아도 실제 역할과 갈라지지 않는다.
	 *
	 * @param scope {@link TokenScope#FULL} 이면 일반 세션,
	 *              {@link TokenScope#ACCOUNT_DELETE} 면 계정 삭제만 가능한 단기 토큰 (AC-50)
	 * @param role  {@link UserRole} 의 이름. {@code SecurityConfig} 가 권한으로 바꾼다
	 */
	public String issueAccessToken(Long userId, String email, UserRole role, TokenScope scope, Instant now,
			Duration ttl) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(String.valueOf(userId))
				.claim(JwtClaims.EMAIL, email)
				.claim(JwtClaims.ROLE, role.name())
				.claim("scope", scope.claimValue())
				.issuedAt(now)
				.expiresAt(now.plus(ttl))
				.build();

		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public Duration accessTokenTtl() {
		return jwtProperties.accessTokenTtl();
	}

	public Duration refreshTokenTtl() {
		return jwtProperties.refreshTokenTtl();
	}

	/**
	 * 리프레시 토큰 평문을 만든다. <b>이 값은 응답에 한 번 나가고 서버에는 남지 않는다</b> —
	 * 저장되는 것은 {@link #hash(String)} 의 결과뿐이다.
	 */
	public String generateRefreshToken() {
		byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
		random.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	/**
	 * 리프레시 토큰의 저장·조회용 해시.
	 *
	 * <p>비밀번호와 달리 bcrypt 를 쓰지 않는 이유: ① 값이 서버가 만든 128비트 난수라
	 * 사전 공격 대상이 아니고, ② 매 갱신마다 해시로 <b>조회</b>해야 하는데 bcrypt 는
	 * salt 때문에 결정론적이지 않아 인덱스를 걸 수 없다.
	 */
	public String hash(String rawToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException cause) {
			// SHA-256 은 모든 JRE 가 제공한다. 여기 오면 런타임이 깨진 것이다.
			throw new IllegalStateException("SHA-256 을 사용할 수 없습니다", cause);
		}
	}
}
