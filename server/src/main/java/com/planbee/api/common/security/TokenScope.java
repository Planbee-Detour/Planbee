package com.planbee.api.common.security;

/**
 * 액세스 토큰의 스코프. JWT 의 {@code scope} 클레임에 담기고, Spring Security 의 기본 변환기가
 * {@code SCOPE_<값>} 권한으로 바꿔 준다 — 그래서 별도 필터를 만들지 않는다 (S-17).
 *
 * <p>공통 계층에 두는 이유: {@code SecurityConfig} 가 경로별 권한을 걸 때와
 * 도메인이 토큰을 발급할 때가 <b>같은 문자열</b>을 써야 하는데, 설정이 도메인 패키지를
 * 참조하면 S-2 의 순환 의존에 걸린다.
 */
public enum TokenScope {

	/** 일반 세션. 인증이 필요한 모든 엔드포인트를 쓸 수 있다. */
	FULL("full"),

	/**
	 * 계정 삭제만 할 수 있는 단기 토큰 (auth AC-50).
	 *
	 * <p>거절된 계정은 로그인이 막혀 설정 화면에 도달할 수 없지만, 비밀번호는 이미 맞힌 상태다 —
	 * 자격 증명이 아니라 계정 상태 때문에 막힌 것이다. 그래서 삭제를 개시할 자격은 증명되어 있다.
	 * 이 스코프로는 {@code DELETE /api/v1/auth/me} 외에는 전부 403 이고, 리프레시 토큰이
	 * 함께 나가지 않으므로 세션이 되지 않는다.
	 */
	ACCOUNT_DELETE("account:delete");

	/** Spring Security 의 {@code JwtGrantedAuthoritiesConverter} 기본 접두어. */
	public static final String AUTHORITY_PREFIX = "SCOPE_";

	private final String claimValue;

	TokenScope(String claimValue) {
		this.claimValue = claimValue;
	}

	/** JWT {@code scope} 클레임에 들어가는 값. */
	public String claimValue() {
		return claimValue;
	}

	/** {@code hasAuthority(...)} 에 넘기는 권한 문자열. */
	public String authority() {
		return AUTHORITY_PREFIX + claimValue;
	}
}
