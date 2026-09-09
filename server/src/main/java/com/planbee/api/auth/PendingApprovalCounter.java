package com.planbee.api.auth;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 검토 대기(`PENDING`) 신청 건수를 세는 <b>단 하나의 지점</b>. (admin-user-approval AC-32)
 *
 * <p>이 값은 서로 다른 네 곳에 실린다 — {@code GET /api/v1/auth/me} 와 로그인 응답의
 * {@code pending_approval_count}, 관리자 목록 두 개, 상태 전이 응답. 여기에 Discord 알림의
 * 건수까지 더하면 다섯이다. 세는 곳이 둘로 갈라지는 순간 "알림의 숫자와 화면의 숫자가 같다"
 * (AC-32)가 코드로 보장되지 않고 사람의 기억에 남는다. 그래서 계산을 여기 모은다.
 *
 * <p>auth 패키지에 두는 이유: 세는 대상이 auth 소유의 {@code users} 테이블이고,
 * {@code UserSummary} 를 만드는 것도 auth 다. admin 이 이 클래스를 쓰지만 그 반대는 없어
 * 의존 방향이 admin → auth 한쪽이다 (S-2).
 */
@Component
public class PendingApprovalCounter {

	private final UserRepository userRepository;

	public PendingApprovalCounter(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	/**
	 * 검토 대기 건수. 목록의 {@code items} 길이가 아니라 <b>전체</b> 건수다 —
	 * 목록은 페이지 크기만큼 끊어 오므로 세면 틀린다.
	 */
	@Transactional(readOnly = true)
	public int countPending() {
		return Math.toIntExact(userRepository.countByStatus(UserStatus.PENDING));
	}
}
