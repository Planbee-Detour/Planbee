package com.planbee.api.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 조회가 전부 <b>단건·고정 조건</b>이라 Spring Data 메서드로 충분하다 —
 * 실행 시점에 조건이 달라지는 곳이 없으므로 QueryDSL 을 쓰지 않는다 (S-23).
 */
public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/**
	 * 동의 이력까지 한 번에 읽는다. {@code open-in-view=false} 라서 트랜잭션 밖에서
	 * 지연 로딩을 터뜨리면 그냥 실패한다 (S-16 / S-25).
	 */
	@EntityGraph(attributePaths = "consents")
	Optional<User> findWithConsentsById(Long id);
}
