package com.planbee.api.common.security;

import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;

import com.planbee.api.common.error.ErrorCode;

/**
 * 필터 체인에서 나가는 403 의 {@code code} 를 도메인이 갈라 쓰기 위한 확장점.
 *
 * <p>인가 실패는 {@code SecurityProblemResponder} 가 응답을 만들고, 기본값은 공통
 * {@code FORBIDDEN} 이다. 그런데 어떤 403 은 앱이 그리는 화면이 달라 코드가 갈려야 한다 —
 * 관리자 경로의 역할 미달은 "권한 없음 화면"({@code ADMIN_FORBIDDEN})이고 공통
 * {@code FORBIDDEN} 은 일반 오류 문구다 (C-1 — 분기 근거는 {@code code} 안에 있어야 한다).
 *
 * <p>이 인터페이스가 없으면 공통 계층이 도메인의 에러 enum 을 참조하게 되어 S-2 의
 * 순환 의존에 걸린다. 도메인이 구현체를 빈으로 등록하면 의존 방향이 도메인 → 공통 한쪽이 된다.
 * (S-27 이 오류 확장 필드에 쓰는 것과 같은 해법이다)
 */
public interface ForbiddenCodeResolver {

	/**
	 * 이 요청의 403 에 쓸 코드. 판단하지 않으면 {@link Optional#empty()} 를 돌려주고,
	 * 그러면 공통 {@code FORBIDDEN} 이 나간다.
	 *
	 * @param authentication 인가에 실패한 주체. 인증 자체가 없으면 {@code null} 일 수 있다
	 */
	Optional<ErrorCode> resolve(HttpServletRequest request, Authentication authentication);
}
