package com.planbee.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.planbee.api.auth.dto.TokenPair;
import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.security.TokenScope;

/**
 * 리프레시 토큰의 발급 · 회전 · 폐기 (AC-22 ~ AC-26, AC-49).
 *
 * <p>핵심은 <b>회전의 유예 창</b>이다. 회전은 "직전 토큰을 즉시 무효화" 하는데,
 * 네트워크 타임아웃이나 앱 강제 종료로 <b>응답을 못 받은 정상 사용자</b>가 같은 토큰으로
 * 다시 시도하는 일이 실제로 일어난다. 유예 창이 없으면 그것만으로 재사용 공격으로 오인되어
 * 모든 기기에서 로그아웃된다 — 그래서 회전 직후 10초 안의 재시도는
 * <b>같은 토큰 쌍을 그대로 돌려준다</b> (AC-49).
 *
 * <p><b>유예 창의 유일한 근거는 {@link #graceCache} 다 — best-effort 다</b>
 * (2026-08-27 확정, 계약 {@code POST /api/v1/auth/token/refresh}).
 * 서버는 회전된 토큰의 <b>후속 평문</b>을 보관하지 않으므로 직전 응답이 사라지면
 * "같은 쌍" 을 다시 만들어 낼 수단이 없다. 그때는 <b>닫히는 쪽으로 실패한다</b> —
 * 유예 창 안이든 밖이든 똑같이 재사용으로 보고 계정의 모든 리프레시를 폐기한다 (AC-23·24).
 * 판정 근거를 엔티티의 {@code rotatedAt} 과 캐시 둘로 나누지 않는 것이 요점이다.
 */
@Service
public class RefreshTokenService {

	/** 캐시가 무한히 자라지 않게 하는 상한. 넘으면 만료분부터 쓸어낸다. */
	private static final int GRACE_CACHE_SWEEP_THRESHOLD = 1024;

	private final RefreshTokenRepository refreshTokenRepository;
	private final ReuseDetectionRevoker reuseDetectionRevoker;
	private final TokenIssuer tokenIssuer;
	private final Duration graceWindow;
	private final Clock clock;

	/**
	 * 유예 창 재발급용 캐시 — 직전 토큰의 해시 → 그때 발급한 토큰 쌍.
	 *
	 * <p><b>DB 가 아니라 메모리에 둔다.</b> 여기 담기는 것은 리프레시 토큰 <b>평문</b>이라
	 * DB 에 넣으면 해시 저장(S-17)의 의미가 사라진다. 수명이 10초뿐이라 영속화할 가치도 없다.
	 * 재기동으로 사라지면 그 10초 안의 재시도는 <b>재사용으로 처리된다</b> — 정상 사용자가
	 * 전 기기에서 로그아웃되는 드문 손해를 감수하고, 탈취 토큰에 새 세션을 내주지 않는 쪽을 택했다.
	 *
	 * <p>서버를 여러 대로 늘리면 이 캐시를 공유해야 한다 (S-29). 공유하지 않으면 요청이 다른
	 * 인스턴스로 가는 순간 위와 같은 이유로 정상 사용자가 전 기기에서 로그아웃된다 —
	 * status.md 의 배포 전 확인 항목에 적어 두었다.
	 */
	private final Map<String, CachedPair> graceCache = new ConcurrentHashMap<>();

	public RefreshTokenService(
			RefreshTokenRepository refreshTokenRepository,
			ReuseDetectionRevoker reuseDetectionRevoker,
			TokenIssuer tokenIssuer,
			AuthProperties authProperties,
			Clock clock) {
		this.refreshTokenRepository = refreshTokenRepository;
		this.reuseDetectionRevoker = reuseDetectionRevoker;
		this.tokenIssuer = tokenIssuer;
		this.graceWindow = authProperties.refreshGraceWindow();
		this.clock = clock;
	}

	/** 로그인 성공 시 새 세션을 연다. */
	@Transactional
	public TokenPair issuePair(User user) {
		return issuePair(user, clock.instant());
	}

	private TokenPair issuePair(User user, Instant now) {
		String refreshToken = tokenIssuer.generateRefreshToken();
		refreshTokenRepository.save(RefreshToken.issue(
				user,
				tokenIssuer.hash(refreshToken),
				now,
				now.plus(tokenIssuer.refreshTokenTtl())));

		String accessToken = tokenIssuer.issueAccessToken(
				user.id(), user.email(), user.role(), TokenScope.FULL, now, tokenIssuer.accessTokenTtl());

		return new TokenPair(
				accessToken,
				refreshToken,
				TokenPair.BEARER,
				tokenIssuer.accessTokenTtl().toSeconds());
	}

	/**
	 * 회전. 실패 사유마다 앱이 띄우는 배너가 다르므로 코드를 구분해서 던진다.
	 *
	 * @param statusGuard 계정이 아직 로그인 가능한 상태인지 확인하는 콜백.
	 *                    정지·거절이 <b>액세스 토큰 수명(30분) 안에</b> 반영되는 지점이 여기다
	 */
	@Transactional
	public TokenPair rotate(String rawRefreshToken, java.util.function.Consumer<User> statusGuard) {
		Instant now = clock.instant();
		String hash = tokenIssuer.hash(rawRefreshToken);

		// 1. 유예 창 안의 재시도인가 — 같은 쌍을 그대로 돌려준다 (AC-49).
		Optional<TokenPair> replayed = replayWithinGraceWindow(hash, now);
		if (replayed.isPresent()) {
			return replayed.get();
		}

		RefreshToken token = refreshTokenRepository.findByTokenHashWithUser(hash)
				.orElseThrow(() -> new BusinessException(AuthErrorCode.REFRESH_TOKEN_INVALID));

		// 2. 이미 폐기된 토큰. 사유에 따라 앱이 띄우는 배너가 갈린다.
		if (token.isRevoked()) {
			throw new BusinessException(token.revokeReason() == RefreshToken.RevokeReason.REUSE_DETECTED
					? AuthErrorCode.REFRESH_TOKEN_REVOKED
					: AuthErrorCode.REFRESH_TOKEN_INVALID);
		}

		// 3. 이미 회전된 토큰이 다시 왔는데 1번에서 재생되지 않았다 = 재사용이다.
		//    유예 창 안이었다면 1번에서 이미 돌아갔다 — 여기까지 왔다는 것은 서버가 직전 응답을
		//    기억하지 못한다는 뜻이고, 그러면 "정상 재시도" 임을 증명할 수단이 없다.
		//    닫히는 쪽으로 실패한다: 유예 창 안·밖을 가리지 않고 계정의 모든 리프레시를 폐기한다 (AC-23·24).
		//    여기서 새 쌍을 발급하거나 이 행만 LOGOUT 으로 폐기하면 안 된다 —
		//    전자는 유효 토큰을 늘리고, 후자는 이후의 진짜 재사용을 INVALID 로 만들어 AC-24 를 무력화한다.
		if (token.isRotated()) {
			// 폐기는 별도 트랜잭션에서 커밋한다 — 아래 예외가 이 트랜잭션을 되돌리기 때문이다.
			reuseDetectionRevoker.revokeAll(token.user().id(), now);
			throw new BusinessException(AuthErrorCode.REFRESH_TOKEN_REUSED);
		}

		// 4. 유휴 만료 (AC-25). 마지막 사용에서 14일이 지났다.
		if (token.isExpired(now)) {
			throw new BusinessException(AuthErrorCode.REFRESH_TOKEN_EXPIRED);
		}

		// 5. 계정 상태 확인 → 정상 회전.
		statusGuard.accept(token.user());
		token.markRotated(now);
		return cacheAndReturn(hash, issuePair(token.user(), now), now);
	}

	/**
	 * 그 기기의 토큰 하나만 폐기한다 (AC-26). <b>멱등이다</b> — 이미 폐기됐거나 알 수 없는
	 * 토큰이 와도 조용히 성공한다. 토큰의 유효 여부를 응답으로 알려줄 이유가 없다.
	 */
	@Transactional
	public void revoke(Long userId, String rawRefreshToken) {
		Instant now = clock.instant();
		String hash = tokenIssuer.hash(rawRefreshToken);
		refreshTokenRepository.findByTokenHashWithUser(hash)
				.filter(token -> token.user().id().equals(userId))
				.ifPresent(token -> token.revoke(now, RefreshToken.RevokeReason.LOGOUT));
		graceCache.remove(hash);
	}

	private Optional<TokenPair> replayWithinGraceWindow(String hash, Instant now) {
		CachedPair cached = graceCache.get(hash);
		if (cached == null) {
			return Optional.empty();
		}
		if (!now.isBefore(cached.expiresAt())) {
			graceCache.remove(hash);
			return Optional.empty();
		}
		return Optional.of(cached.pair());
	}

	private TokenPair cacheAndReturn(String previousHash, TokenPair pair, Instant now) {
		if (graceCache.size() > GRACE_CACHE_SWEEP_THRESHOLD) {
			graceCache.values().removeIf(entry -> !now.isBefore(entry.expiresAt()));
		}
		graceCache.put(previousHash, new CachedPair(pair, now.plus(graceWindow)));
		return pair;
	}

	private record CachedPair(TokenPair pair, Instant expiresAt) {
	}
}
