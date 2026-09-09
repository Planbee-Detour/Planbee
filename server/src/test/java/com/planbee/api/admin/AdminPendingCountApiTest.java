package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 검토 대기 건수 {@code pending_approval_count} (AC-1 · AC-2 · AC-32).
 *
 * <p>이 값은 <b>네 곳에 실린다</b> — {@code GET /auth/me} 와 로그인 응답, 목록 2개, 상태 전이 응답.
 * AC-32 가 요구하는 것은 그 값들이 서로 같다는 것이고, 보장 방법은 "같은 계산을 쓴다" 다.
 * 그래서 여기서는 각각을 따로 검증하지 않고 <b>한 시점에 다섯을 모아 같은 값인지</b> 본다 —
 * 어느 하나가 자기 쿼리를 갖게 되면 그 순간 드러난다.
 *
 * <p>앱은 이 값을 그대로 렌더한다. 목록 항목 수를 세지 않고 화면에서 ±1 하지도 않는다 (M-18).
 * 그래서 <b>목록이 끊겨 오는 상황</b>(25건 중 20건)에서 값이 25 인지도 함께 고정한다.
 */
@AdminApiTest
class AdminPendingCountApiTest extends AdminApiTestBase {

	@Test
	@DisplayName("AC-1 ADMIN 에게는 정수로 내린다 — /auth/me 와 로그인 응답 둘 다")
	void AC1_ADMIN_에게는_대기_건수를_정수로_내린다() {
		registerPending("first@example.com");
		registerPending("second@example.com");

		getMe(adminToken).then().statusCode(200)
				.body("role", equalTo("ADMIN"))
				.body("pending_approval_count", equalTo(2));

		login(ADMIN_EMAIL, PASSWORD).then().statusCode(200)
				.body("user.role", equalTo("ADMIN"))
				.body("user.pending_approval_count", equalTo(2));
	}

	@Test
	@DisplayName("AC-2 USER 에게는 null 이다 — /auth/me 와 로그인 응답 둘 다")
	void AC2_USER_에게는_null_이다() {
		registerPending("first@example.com");
		String token = memberToken("member@example.com");

		getMe(token).then().statusCode(200)
				.body("role", equalTo("USER"))
				.body("pending_approval_count", nullValue());

		login("member@example.com", PASSWORD).then().statusCode(200)
				.body("user.role", equalTo("USER"))
				.body("user.pending_approval_count", nullValue());
	}

	@Test
	@DisplayName("AC-32 다섯 곳(/auth/me · 로그인 · 목록 2 · 상태 전이)의 건수가 서로 같다")
	void AC32_건수를_싣는_모든_곳이_같은_값을_말한다() {
		registerPending("first@example.com");
		registerPending("second@example.com");
		registerPending("third@example.com");

		assertAllAgree(3);
	}

	@Test
	@DisplayName("AC-32 승인 한 건 뒤 값이 줄고, 그 뒤에도 다섯 곳이 여전히 같다")
	void AC32_승인하면_건수가_줄고_모든_곳이_따라간다() {
		long first = registerPending("first@example.com");
		registerPending("second@example.com");
		registerPending("third@example.com");

		approve(adminToken, first).then().statusCode(200)
				// 앱이 화면에서 ±1 하지 않도록 처리 직후의 건수를 서버가 내린다.
				.body("pending_approval_count", equalTo(2));

		assertAllAgree(2);
	}

	@Test
	@DisplayName("AC-32 거절 취소로 대기가 늘면 그 값도 서버가 내린다 — 앱이 더하지 않는다")
	void AC32_거절_취소는_건수를_되돌린다() {
		long applicant = registerPending("applicant@example.com");
		reject(adminToken, applicant, null).then().statusCode(200)
				.body("pending_approval_count", equalTo(0));

		cancelRejection(adminToken, applicant).then().statusCode(200)
				.body("pending_approval_count", equalTo(1));

		assertAllAgree(1);
	}

	@Test
	@DisplayName("AC-32 정지·정지 해제는 대기 건수를 바꾸지 않는다 (그래도 응답에는 담는다)")
	void AC32_정지는_대기_건수를_바꾸지_않는다() {
		long member = registerApproved("member@example.com");
		registerPending("waiting@example.com");

		suspend(adminToken, member).then().statusCode(200)
				.body("pending_approval_count", equalTo(1));
		cancelSuspension(adminToken, member).then().statusCode(200)
				.body("pending_approval_count", equalTo(1));

		assertAllAgree(1);
	}

	@Test
	@DisplayName("AC-32 목록이 20건씩 끊겨 와도 건수는 전체 25 다 — items 를 세면 틀린다")
	void AC32_건수는_items_의_길이가_아니다() {
		for (int index = 1; index <= 25; index++) {
			registerPending("applicant%02d@example.com".formatted(index));
		}

		Response page = pending(adminToken);
		page.then().statusCode(200).body("pending_approval_count", equalTo(25));
		assertThat(page.jsonPath().getList("items")).hasSize(20);

		assertAllAgree(25);
	}

	/**
	 * 건수를 싣는 다섯 응답을 한 시점에 모아 같은 값인지 본다.
	 *
	 * <p>상태 전이 응답도 포함해야 하는데 전이는 상태를 바꾸므로, 대기 건수를 바꾸지 않는
	 * 전이(정지 → 정지 해제)를 골라 값을 읽고 원래대로 되돌린다.
	 */
	private void assertAllAgree(int expected) {
		String member = "agreement-probe@example.com";
		long probe = registerApproved(member);

		Map<String, Integer> counts = new LinkedHashMap<>();
		counts.put("GET /auth/me", getMe(adminToken).jsonPath().getInt("pending_approval_count"));
		counts.put("POST /auth/login",
				login(ADMIN_EMAIL, PASSWORD).jsonPath().getInt("user.pending_approval_count"));
		counts.put("GET /admin/users/pending",
				pending(adminToken).jsonPath().getInt("pending_approval_count"));
		counts.put("GET /admin/users/processed",
				processed(adminToken).jsonPath().getInt("pending_approval_count"));
		counts.put("POST /admin/users/{id}/suspend",
				suspend(adminToken, probe).jsonPath().getInt("pending_approval_count"));

		cancelSuspension(adminToken, probe).then().statusCode(200);

		assertThat(counts).as("건수를 싣는 다섯 곳을 모두 확인했는지").hasSize(5);
		assertThat(counts)
				.as("건수를 싣는 모든 곳이 같은 서버 계산을 써야 한다 (AC-32)")
				.allSatisfy((where, count) -> assertThat(count).as(where).isEqualTo(expected));
	}
}
