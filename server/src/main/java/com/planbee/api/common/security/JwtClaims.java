package com.planbee.api.common.security;

/**
 * 액세스 토큰에 담는 커스텀 클레임 이름.
 *
 * <p>{@code TokenScope} 와 같은 이유로 공통 계층에 둔다 — 토큰을 <b>발급</b>하는 도메인과
 * 권한을 <b>거는</b> 설정이 같은 문자열을 써야 하는데, 설정이 도메인 패키지를 참조하면
 * S-2 의 순환 의존에 걸린다.
 */
public final class JwtClaims {

	/** 계정 이메일. 표시용이 아니라 로그·디버깅용이다. */
	public static final String EMAIL = "email";

	/**
	 * 사용자 역할 (`USER` / `ADMIN`).
	 *
	 * <p>{@code SecurityConfig} 가 {@code ROLE_<값>} 권한으로 바꿔 관리자 경로에 건다.
	 * 역할을 토큰에 담는 대신 매 요청 DB 를 조회하지 않는 이유는 S-17 이다 —
	 * 무상태 검증(oauth2-resource-server)을 상태 검증으로 바꾸지 않는다. 앱에 역할을 바꾸는
	 * 경로가 없으므로(auth PRD 제약) 토큰 수명(30분) 안의 지연이 문제가 되지 않는다.
	 */
	public static final String ROLE = "role";

	private JwtClaims() {
	}
}
