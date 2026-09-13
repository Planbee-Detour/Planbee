package com.planbee.api.auth;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 거절된 계정을 보유 기간이 지나면 파기한다 (개인정보 처리방침 3항 · 9항, 2026-09-13 사람 결정).
 *
 * <p>기간 동안은 남겨 둔다 — 거절된 사용자가 로그인해 상태 안내를 보고(AC-15) 앱에서 직접
 * 삭제할 수 있어야 하며(AC-50), 관리자가 거절을 취소할 수 있어야 한다(admin AC-19).
 *
 * <p><b>인스턴스가 여러 대여도 안전하다.</b> 같은 조건의 삭제를 두 번 실행해도 결과가 같으므로
 * 분산 락을 두지 않는다 (S-29 의 "공유 저장소로 옮길 상태" 목록에 들어가지 않는다).
 */
@Service
public class RejectedAccountPurgeService {

	private static final Logger log = LoggerFactory.getLogger(RejectedAccountPurgeService.class);

	private final UserRepository userRepository;
	private final AuthProperties properties;
	private final Clock clock;

	public RejectedAccountPurgeService(UserRepository userRepository, AuthProperties properties, Clock clock) {
		this.userRepository = userRepository;
		this.properties = properties;
		this.clock = clock;
	}

	/**
	 * 매일 새벽 4시(KST)에 돈다. 파기 시점이 최대 하루 늦어질 수 있으나 처리방침은
	 * "30일이 지나면" 이라 어긋나지 않는다.
	 *
	 * @return 파기한 계정 수 (스케줄러는 반환값을 쓰지 않는다 — 테스트가 쓴다)
	 */
	@Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
	@Transactional
	public int purgeExpired() {
		Instant cutoff = clock.instant().minus(properties.rejectedAccountRetention());
		int purged = userRepository.deleteRejectedBefore(cutoff);
		if (purged > 0) {
			// 식별자·이메일은 남기지 않는다 — 파기한 정보를 로그로 되살리지 않기 위해서다.
			log.info("보유 기간이 지난 거절 계정 {}건을 파기했다", purged);
		}
		return purged;
	}
}
