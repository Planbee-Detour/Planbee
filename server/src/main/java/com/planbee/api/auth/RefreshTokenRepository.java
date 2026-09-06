package com.planbee.api.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	/**
	 * 해시로 찾는다. 평문은 저장하지 않으므로 이게 유일한 조회 경로다.
	 * 사용자까지 함께 읽는 이유는 {@code open-in-view=false} 이기 때문이다 (S-16).
	 */
	@Query("select rt from RefreshToken rt join fetch rt.user where rt.tokenHash = :tokenHash")
	Optional<RefreshToken> findByTokenHashWithUser(@Param("tokenHash") String tokenHash);

	/**
	 * 재사용이 감지되면 그 계정의 <b>모든</b> 리프레시 토큰을 폐기한다 (AC-24).
	 * 한 기기에서 토큰이 유출됐다는 신호이므로 다른 기기도 함께 끊는 것이 맞다.
	 *
	 * <p>벌크 갱신이라 영속성 컨텍스트를 건너뛴다 — 호출한 트랜잭션 안에서 같은 엔티티를
	 * 다시 읽지 않도록 {@code clearAutomatically} 를 켠다.
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("update RefreshToken rt set rt.revokedAt = :now, rt.revokeReason = :reason "
			+ "where rt.user.id = :userId and rt.revokedAt is null")
	int revokeAllByUserId(
			@Param("userId") Long userId,
			@Param("now") Instant now,
			@Param("reason") RefreshToken.RevokeReason reason);
}
