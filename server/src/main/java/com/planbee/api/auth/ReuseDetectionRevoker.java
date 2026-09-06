package com.planbee.api.auth;

import java.time.Instant;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 리프레시 토큰 재사용이 감지됐을 때의 <b>전 기기 폐기</b>를 독립 트랜잭션에서 커밋한다 (AC-24).
 *
 * <p><b>왜 별도 빈인가.</b> 재사용을 감지한 요청은 401 {@code BusinessException} 을 던지고 끝나는데,
 * 예외는 트랜잭션을 되돌린다 — 같은 트랜잭션 안에서 폐기하면 <b>그 폐기까지 함께 사라진다.</b>
 * 2026-08-27 실측으로 확인했다: 401 {@code AUTH_REFRESH_TOKEN_REUSED} 를 낸 직후
 * {@code refresh_tokens.revoked_at} 이 전부 {@code null} 이었고, 다른 기기의 토큰이 그대로 갱신됐다.
 * 그래서 {@code REQUIRES_NEW} 로 <b>먼저 커밋한 뒤</b> 호출자가 예외를 던진다.
 *
 * <p>자기 호출(self-invocation)은 프록시를 타지 않아 전파 속성이 무시되므로
 * {@link RefreshTokenService} 안의 메서드로 두지 않고 빈을 분리했다.
 *
 * <p>이 시점의 호출 트랜잭션은 아직 아무것도 쓰지 않았으므로(재사용 판정이 회전보다 먼저 선다)
 * 같은 행을 두 트랜잭션이 동시에 잠그는 상황은 생기지 않는다.
 */
@Component
public class ReuseDetectionRevoker {

	private final RefreshTokenRepository refreshTokenRepository;

	public ReuseDetectionRevoker(RefreshTokenRepository refreshTokenRepository) {
		this.refreshTokenRepository = refreshTokenRepository;
	}

	/** 이 계정의 살아 있는 리프레시 토큰을 전부 {@code REUSE_DETECTED} 로 폐기한다. */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void revokeAll(Long userId, Instant now) {
		refreshTokenRepository.revokeAllByUserId(userId, now, RefreshToken.RevokeReason.REUSE_DETECTED);
	}
}
