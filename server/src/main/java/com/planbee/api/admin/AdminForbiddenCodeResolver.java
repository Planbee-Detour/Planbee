package com.planbee.api.admin;

import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.planbee.api.common.error.ErrorCode;
import com.planbee.api.common.security.ForbiddenCodeResolver;
import com.planbee.api.common.security.TokenScope;

/**
 * 관리자 경로에서 나가는 403 의 코드를 {@code ADMIN_FORBIDDEN} 으로 갈라 준다 (AC-3).
 *
 * <p>역할 검사는 필터 체인({@code SecurityConfig})에서 이뤄지므로 이 실패는
 * {@code GlobalExceptionHandler} 를 타지 않는다. 그래서 코드를 정하는 일도 여기서 한다.
 *
 * <p><b>삭제 전용 토큰은 갈라 주지 않는다.</b> {@code scope: account:delete} 로 관리자 경로를
 * 부르면 그것은 역할 문제가 아니라 스코프 문제이고, 계약이 그 경우를 공통 {@code FORBIDDEN}
 * 으로 정해 두었다 (계약 {@code ForbiddenScope}). 앱의 처리도 다르다 — 이 코드에서는
 * 토큰 갱신을 재시도하지 않는다.
 */
@Component
public class AdminForbiddenCodeResolver implements ForbiddenCodeResolver {

	private static final String ADMIN_PATH_PREFIX = "/api/v1/admin/";

	@Override
	public Optional<ErrorCode> resolve(HttpServletRequest request, Authentication authentication) {
		if (!request.getRequestURI().startsWith(ADMIN_PATH_PREFIX)) {
			return Optional.empty();
		}
		if (!hasFullSessionScope(authentication)) {
			return Optional.empty();
		}
		return Optional.of(AdminErrorCode.FORBIDDEN);
	}

	private boolean hasFullSessionScope(Authentication authentication) {
		return authentication != null && authentication.getAuthorities().stream()
				.anyMatch(authority -> TokenScope.FULL.authority().equals(authority.getAuthority()));
	}
}
