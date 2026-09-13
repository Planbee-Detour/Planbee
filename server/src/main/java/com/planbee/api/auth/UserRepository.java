package com.planbee.api.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 조회가 전부 <b>단건·고정 조건</b>이라 Spring Data 메서드로 충분하다 —
 * 실행 시점에 조건이 달라지는 곳이 없으므로 QueryDSL 을 쓰지 않는다 (S-23).
 */
public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/**
	 * 상태별 계정 수. 검토 대기 건수({@code PENDING})가 <b>화면 네 곳과 Discord 알림에서
	 * 같은 값</b>이어야 하므로(admin AC-32) 계산은 이 메서드 하나뿐이다 —
	 * 호출은 {@code PendingApprovalCounter} 를 거친다.
	 */
	long countByStatus(UserStatus status);

	/**
	 * 동의 이력까지 한 번에 읽는다. {@code open-in-view=false} 라서 트랜잭션 밖에서
	 * 지연 로딩을 터뜨리면 그냥 실패한다 (S-16 / S-25).
	 */
	@EntityGraph(attributePaths = "consents")
	Optional<User> findWithConsentsById(Long id);

	/**
	 * 거절 시각이 {@code cutoff} 보다 이전인 {@code REJECTED} 계정을 지운다 (개인정보 처리방침 3항).
	 *
	 * <p>벌크 삭제라 JPA 의 연관 삭제(cascade)를 타지 않는다. 동의 이력과 리프레시 토큰은
	 * <b>DB 의 {@code ON DELETE CASCADE}</b>(V2)가 함께 지운다 — 그래서 남는 행이 없다.
	 * 거절 취소는 {@code rejected_at} 을 비우므로 되돌린 계정은 대상이 되지 않는다.
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("delete from User u where u.status = com.planbee.api.auth.UserStatus.REJECTED "
			+ "and u.rejectedAt < :cutoff")
	int deleteRejectedBefore(@Param("cutoff") Instant cutoff);
}
