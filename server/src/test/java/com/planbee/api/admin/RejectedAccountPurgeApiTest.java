package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.planbee.api.auth.RejectedAccountPurgeService;

/**
 * 거절 계정의 보유 기간 경과 파기 (개인정보 처리방침 3항 · 9항).
 *
 * <p>파기 작업은 {@code auth} 에 있지만 테스트는 여기에 둔다 — 거절 상태를 SQL 이 아니라
 * <b>실제 거절 엔드포인트</b>로 만들어야 {@code rejected_at} 이 채워지고, 그 헬퍼가
 * {@link AdminApiTestBase} 에 있다. 스케줄러를 기다리지 않고 작업 메서드를 직접 부른다.
 */
@AdminApiTest
class RejectedAccountPurgeApiTest extends AdminApiTestBase {

	private static final Duration RETENTION = Duration.ofDays(30);

	@Autowired
	private RejectedAccountPurgeService purgeService;

	@Test
	@DisplayName("거절 후 30일이 지나면 계정과 동의 이력이 파기되고, 같은 이메일로 다시 가입할 수 있다")
	void 거절_후_보유_기간이_지나면_파기된다() {
		long rejected = registerRejected("rejected@example.com", "사유");

		clock.advance(RETENTION.plusSeconds(1));

		assertThat(purgeService.purgeExpired()).isEqualTo(1);
		assertThat(countRows("users", "id", rejected)).isZero();
		assertThat(countRows("user_consents", "user_id", rejected)).isZero();

		// 삭제된 계정과 같은 응답이다 (auth AC-31)
		login("rejected@example.com", PASSWORD).then()
				.statusCode(401)
				.body("code", equalTo("AUTH_INVALID_CREDENTIALS"));
		// 같은 이메일로 재가입이 접수된다 (auth AC-32)
		signup(signupBody("rejected@example.com")).then().statusCode(201);
	}

	@Test
	@DisplayName("보유 기간 안의 거절 계정은 남아 있어 로그인하면 거절 안내를 받는다")
	void 보유_기간_안의_거절_계정은_남는다() {
		long rejected = registerRejected("rejected@example.com", null);

		clock.advance(RETENTION.minusDays(1));

		assertThat(purgeService.purgeExpired()).isZero();
		assertThat(countRows("users", "id", rejected)).isEqualTo(1);
		login("rejected@example.com", PASSWORD).then()
				.statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_REJECTED"));
	}

	@Test
	@DisplayName("거절이 아닌 계정과 거절이 취소된 계정은 기간이 지나도 파기하지 않는다")
	void 거절_외_상태는_파기하지_않는다() {
		registerPending("pending@example.com");
		registerApproved("approved@example.com");
		registerSuspended("suspended@example.com");
		long cancelled = registerRejected("cancelled@example.com", null);
		cancelRejection(adminToken, cancelled).then().statusCode(200);
		Long before = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);

		clock.advance(RETENTION.multipliedBy(2));

		assertThat(purgeService.purgeExpired()).isZero();
		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isEqualTo(before);
	}

	private long countRows(String table, String column, long userId) {
		Long count = jdbc.queryForObject(
				"SELECT COUNT(*) FROM " + table + " WHERE " + column + " = ?", Long.class, userId);
		return count == null ? 0 : count;
	}
}
