package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 정지가 진행 중인 세션에 반영되는 방식 (AC-22 · AC-23).
 *
 * <p><b>매 요청 상태 확인을 도입하지 않기로 확정됐다</b> (2026-09-07). 반영은
 * {@code POST /api/v1/auth/token/refresh} 가 갱신 시점에 상태를 재확인하는 기존 경로뿐이고,
 * 최대 지연은 액세스 토큰 수명(30분)이다. 그래서 여기서 고정하는 것은 두 가지다 —
 * <b>갱신은 막히되</b>(403 + {@code account_status}), <b>리프레시 토큰이 폐기되지는 않는다</b>.
 *
 * <p>폐기하면 갱신이 401 {@code AUTH_REFRESH_TOKEN_INVALID} 가 되어 앱이 "세션이 만료됐어요"
 * 배너를 띄우고, 사용자는 <b>정지된 사실을 알 수 없게 된다.</b> 폐기하지 않아야 403 +
 * {@code account_status}(SUSPENDED)로 정확한 안내가 뜬다. 이 결정이 되돌려지면 여기서 깨진다.
 */
@AdminApiTest
class AdminSuspendedSessionApiTest extends AdminApiTestBase {

	private static final String MEMBER_EMAIL = "member@example.com";

	@Test
	@DisplayName("AC-22·AC-23 정지된 계정의 갱신은 403 + account_status(SUSPENDED) 다")
	void AC23_정지되면_갱신이_403_이다() {
		long member = registerApproved(MEMBER_EMAIL);
		Response session = login(MEMBER_EMAIL, PASSWORD);
		session.then().statusCode(200);

		suspend(adminToken, member).then().statusCode(200);

		refresh(refreshToken(session)).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_SUSPENDED"))
				.body("account_status.status", equalTo("SUSPENDED"))
				.body("account_status.title", equalTo("이용이 정지된 계정이에요"))
				// 정지 사유를 받지 않기로 확정했으므로 auth 의 안내 문구가 그대로다 (2026-09-07 Q3).
				.body("account_status.support_contact_email", notNullValue());
	}

	@Test
	@DisplayName("AC-23 정지는 리프레시 토큰을 폐기하지 않는다 — 폐기하면 정지 사실을 알릴 수 없다")
	void AC23_정지는_리프레시_토큰을_폐기하지_않는다() {
		long member = registerApproved(MEMBER_EMAIL);
		Response session = login(MEMBER_EMAIL, PASSWORD);
		String refreshToken = refreshToken(session);

		suspend(adminToken, member).then().statusCode(200);

		assertThat(usableRefreshTokenCount(MEMBER_EMAIL))
				.as("정지가 토큰을 폐기하면 갱신이 401 이 되어 안내가 '세션 만료' 로 바뀐다")
				.isEqualTo(1);
		assertThat(refreshTokenRows(MEMBER_EMAIL))
				.singleElement()
				.satisfies(row -> {
					assertThat(row.get("revoked_at")).isNull();
					assertThat(row.get("revoke_reason")).isNull();
					assertThat(row.get("rotated_at")).isNull();
				});

		// 폐기되지 않았으므로 정지가 풀리면 같은 토큰으로 그대로 갱신된다.
		cancelSuspension(adminToken, member).then().statusCode(200);
		refresh(refreshToken).then().statusCode(200).body("access_token", notNullValue());
	}

	@Test
	@DisplayName("AC-23 매 요청 상태 확인은 도입되지 않았다 — 이미 발급된 액세스 토큰은 만료까지 살아 있다")
	void AC23_매_요청_상태_확인은_도입되지_않았다() {
		long member = registerApproved(MEMBER_EMAIL);
		String accessToken = accessToken(login(MEMBER_EMAIL, PASSWORD));

		suspend(adminToken, member).then().statusCode(200);

		// 즉시 차단하려면 모든 인증 요청에 DB 조회가 한 번씩 더 붙는다. 그 값을 치르지 않기로 했고,
		// 대신 지연의 상한이 액세스 토큰 수명(30분)이라는 사실을 여기에 못 박는다.
		getMe(accessToken).then().statusCode(200)
				.body("status", equalTo("SUSPENDED"));
	}

	@Test
	@DisplayName("AC-22 정지된 사용자는 다시 로그인해도 정지 화면을 본다 (삭제 토큰은 실리지 않는다)")
	void AC22_정지된_사용자는_로그인할_수_없다() {
		long member = registerApproved(MEMBER_EMAIL);
		suspend(adminToken, member).then().statusCode(200);

		Map<String, Object> body = login(MEMBER_EMAIL, PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_SUSPENDED"))
				.body("account_status.status", equalTo("SUSPENDED"))
				.extract().jsonPath().getMap("$");

		assertThat(body)
				.as("지우고 곧바로 재가입하면 정지가 무력화된다 — SUSPENDED 에는 삭제 토큰을 내리지 않는다")
				.doesNotContainKey("deletion_token");
	}

	@Test
	@DisplayName("AC-24 정지가 풀리면 다시 로그인할 수 있다")
	void AC24_정지가_풀리면_다시_로그인할_수_있다() {
		long member = registerApproved(MEMBER_EMAIL);
		suspend(adminToken, member).then().statusCode(200);
		login(MEMBER_EMAIL, PASSWORD).then().statusCode(403);

		cancelSuspension(adminToken, member).then().statusCode(200);

		login(MEMBER_EMAIL, PASSWORD).then().statusCode(200)
				.body("user.status", equalTo("APPROVED"));
	}
}
