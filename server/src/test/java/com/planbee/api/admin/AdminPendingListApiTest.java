package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import io.restassured.response.Response;

/**
 * 검토 대기 목록 {@code GET /api/v1/admin/users/pending} (AC-5 · AC-6 · AC-7 · AC-33).
 *
 * <p>여기서 가장 비싸게 틀릴 수 있는 것은 <b>커서 페이지네이션</b>이다. 정렬 키가 같은 두 행을
 * 동률 깨기 없이 훑으면 항목이 조용히 <b>새거나 겹친다</b> — 그것도 늘 그러지 않고 실행마다
 * 다르게 그런다. 그래서 같은 시각을 가진 행을 <b>일부러 만들어</b> 페이지 경계를 그 위에 올린다.
 */
@AdminApiTest
class AdminPendingListApiTest extends AdminApiTestBase {

	@Test
	@DisplayName("AC-5 대기 신청 3건이 신청 시각 최신순으로 오고 각 항목에 이메일·가입 사유·신청 시각이 있다")
	void AC5_대기_목록은_신청_시각_최신순이다() {
		registerPending("first@example.com");
		clock.advance(Duration.ofMinutes(1));
		registerPending("second@example.com");
		clock.advance(Duration.ofMinutes(1));
		registerPending("third@example.com");

		Response response = pending(adminToken);

		response.then().statusCode(200)
				.body("items", hasSize(3))
				.body("items.email", contains("third@example.com", "second@example.com", "first@example.com"))
				.body("items[0].user_id", notNullValue())
				.body("items[0].signup_reason_text",
						equalTo("주간 계획을 자주 바꾸는 편이라 대안을 추천받고 싶어요."))
				.body("items[0].requested_at", notNullValue())
				.body("items[0].is_me", equalTo(false))
				.body("has_next", equalTo(false))
				.body("next_cursor", nullValue())
				.body("pending_approval_count", equalTo(3));
	}

	@Test
	@DisplayName("AC-6 대기 신청이 0건이면 오류가 아니라 빈 배열의 200 이다")
	void AC6_빈_목록은_정상_응답이다() {
		pending(adminToken).then().statusCode(200)
				.body("items", hasSize(0))
				.body("has_next", equalTo(false))
				.body("next_cursor", nullValue())
				.body("pending_approval_count", equalTo(0));
	}

	@Test
	@DisplayName("AC-33 가입 사유를 쓰지 않은 신청도 정상 응답이고 사유 자리에 '입력하지 않음' 이 온다")
	void AC33_가입_사유가_없으면_서버가_대체_문구를_채운다() {
		registerPendingWithoutReason("no-reason@example.com");
		clock.advance(Duration.ofMinutes(1));
		registerPending("with-reason@example.com");

		pending(adminToken).then().statusCode(200)
				.body("items", hasSize(2))
				.body("items[1].email", equalTo("no-reason@example.com"))
				// 대체 문구는 서버가 완성해서 내린다 (C-8). 앱에 null 검사가 없어야 한다.
				.body("items[1].signup_reason_text", equalTo("입력하지 않음"))
				// 이메일과 신청 시각은 다른 항목과 똑같이 보인다 — 여기서 빠지면 AC-33 이 깨진다.
				.body("items[1].requested_at", notNullValue())
				.body("items[1].user_id", notNullValue());
	}

	// ─────────────────────────────────────────────────────────────────
	// 커서 페이지네이션 (AC-7)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-7 25건이면 기본 20건이 먼저 오고 커서로 나머지 5건을 불러온다 — 중복도 누락도 없다")
	void AC7_기본_페이지는_20건이고_커서로_나머지를_불러온다() {
		List<String> emails = registerPendingSeries(25);

		Response firstPage = pending(adminToken);
		firstPage.then().statusCode(200)
				.body("items", hasSize(20))
				.body("has_next", equalTo(true))
				.body("next_cursor", notNullValue())
				// 목록은 20건씩 끊어 오지만 건수는 전체다 (계약 pending_approval_count).
				.body("pending_approval_count", equalTo(25));

		Response secondPage = pending(adminToken, Map.of("cursor", nextCursor(firstPage)));
		secondPage.then().statusCode(200)
				.body("items", hasSize(5))
				.body("has_next", equalTo(false))
				.body("next_cursor", nullValue())
				.body("pending_approval_count", equalTo(25));

		List<String> walked = new ArrayList<>(emailsOf(firstPage));
		walked.addAll(emailsOf(secondPage));
		assertThat(walked).as("두 페이지를 이어 붙이면 신청 시각 역순 전체와 같아야 한다")
				.containsExactlyElementsOf(emails.reversed());
	}

	@Test
	@DisplayName("AC-7 마지막 페이지가 정확히 page_size 로 끝나도 has_next 는 false 다")
	void AC7_마지막_페이지가_꽉_차도_has_next_는_false_다() {
		registerPendingSeries(4);

		Response firstPage = pending(adminToken, Map.of("page_size", 2));
		firstPage.then().statusCode(200).body("items", hasSize(2)).body("has_next", equalTo(true));

		// items.length == page_size 로 추측하면 여기서 틀린다 (계약 has_next).
		pending(adminToken, Map.of("page_size", 2, "cursor", nextCursor(firstPage)))
				.then().statusCode(200)
				.body("items", hasSize(2))
				.body("has_next", equalTo(false))
				.body("next_cursor", nullValue());
	}

	@Test
	@DisplayName("AC-5·AC-7 신청 시각이 같으면 user_id 내림차순으로 깨고, 그 경계를 커서가 넘어가도 새지 않는다")
	void AC7_동률은_user_id_내림차순으로_깬다() {
		// 시계를 움직이지 않고 세 건을 만든다 — created_at 이 마이크로초까지 같다.
		long first = registerPending("tie-a@example.com");
		long second = registerPending("tie-b@example.com");
		long third = registerPending("tie-c@example.com");
		assertThat(sameRequestedAt(first, second, third)).as("동률 상황이 실제로 만들어졌는지").isTrue();

		pending(adminToken).then().statusCode(200)
				.body("items.user_id", contains((int) third, (int) second, (int) first));

		// 한 건씩 훑으며 경계를 세 번 넘는다. 동률 깨기가 없으면 여기서 항목이 겹치거나 샌다.
		assertThat(walkAllPending(1))
				.as("한 건씩 훑어도 순서와 개수가 그대로여야 한다")
				.containsExactly("tie-c@example.com", "tie-b@example.com", "tie-a@example.com");
	}

	@ParameterizedTest
	@ValueSource(ints = { 1, 50 })
	@DisplayName("AC-7 page_size 는 1..50 이 유효 범위다 — 경계값도 200 이다")
	void AC7_page_size_경계값은_통과한다(int pageSize) {
		registerPendingSeries(2);

		pending(adminToken, Map.of("page_size", pageSize)).then().statusCode(200);
	}

	@ParameterizedTest
	@ValueSource(ints = { 0, 51, -1 })
	@DisplayName("AC-7 page_size 가 범위를 벗어나면 400 VALIDATION_FAILED 다 — 조용히 잘라내지 않는다")
	void AC7_page_size_범위_밖은_400_이다(int pageSize) {
		pending(adminToken, Map.of("page_size", pageSize)).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("page_size"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "not-base64!!", "bm90LWpzb24", "eyJ0IjoiYWJjIiwiaSI6MX0" })
	@DisplayName("AC-7 해석할 수 없는 커서는 400 MALFORMED_REQUEST 다 — 첫 페이지로 눙치지 않는다")
	void AC7_깨진_커서는_400_이다(String cursor) {
		registerPendingSeries(2);

		pending(adminToken, Map.of("cursor", cursor)).then().statusCode(400)
				.body("code", equalTo("MALFORMED_REQUEST"));
	}

	@Test
	@DisplayName("AC-7 계약 상한(512자)을 넘는 커서도 400 이다")
	void AC7_너무_긴_커서는_400_이다() {
		String tooLong = Base64.getUrlEncoder().withoutPadding()
				.encodeToString("x".repeat(600).getBytes(StandardCharsets.UTF_8));

		pending(adminToken, Map.of("cursor", tooLong)).then().statusCode(400)
				.body("code", equalTo("MALFORMED_REQUEST"));
	}

	@Test
	@DisplayName("AC-7 다음 페이지를 불러오는 사이 앞 항목이 처리돼도 남은 항목을 건너뛰지 않는다")
	void AC7_보면서_줄어들어도_항목을_건너뛰지_않는다() {
		List<String> emails = registerPendingSeries(6);

		Response firstPage = pending(adminToken, Map.of("page_size", 2));
		String cursor = nextCursor(firstPage);

		// 첫 페이지의 두 건을 처리한다 — 오프셋 방식이었다면 여기서 두 건이 조용히 밀린다.
		emailsOf(firstPage).forEach(email -> approve(adminToken, userIdOf(email)).then().statusCode(200));

		Response secondPage = pending(adminToken, Map.of("page_size", 2, "cursor", cursor));
		assertThat(emailsOf(secondPage))
				.as("커서는 위치가 아니라 값이라 앞이 빠져도 같은 자리를 가리킨다")
				.containsExactly(emails.get(3), emails.get(2));
	}

	// ─────────────────────────────────────────────────────────────────
	// 헬퍼
	// ─────────────────────────────────────────────────────────────────

	/** 신청 시각이 1분씩 벌어진 대기 신청 {@code count} 건. 돌려주는 순서는 신청 순서다. */
	private List<String> registerPendingSeries(int count) {
		List<String> emails = new ArrayList<>();
		for (int index = 1; index <= count; index++) {
			String email = "applicant%02d@example.com".formatted(index);
			registerPending(email);
			emails.add(email);
			clock.advance(Duration.ofMinutes(1));
		}
		return emails;
	}

	/** 커서를 따라 끝까지 훑는다. 같은 항목이 두 번 나오면 즉시 실패한다. */
	private List<String> walkAllPending(int pageSize) {
		List<String> walked = new ArrayList<>();
		Set<String> seen = new LinkedHashSet<>();
		String cursor = null;
		for (int page = 0; page < 50; page++) {
			Response response = cursor == null
					? pending(adminToken, Map.of("page_size", pageSize))
					: pending(adminToken, Map.of("page_size", pageSize, "cursor", cursor));
			response.then().statusCode(200);
			for (String email : emailsOf(response)) {
				assertThat(seen.add(email)).as("같은 항목이 두 페이지에 걸쳐 나왔다: %s", email).isTrue();
				walked.add(email);
			}
			if (!response.jsonPath().getBoolean("has_next")) {
				return walked;
			}
			cursor = nextCursor(response);
		}
		throw new IllegalStateException("커서 순회가 끝나지 않았다 — has_next 가 계속 true 다");
	}

	private boolean sameRequestedAt(long... userIds) {
		List<Object> values = new ArrayList<>();
		for (long userId : userIds) {
			values.add(userRow(userId).get("created_at"));
		}
		return values.stream().distinct().count() == 1;
	}

	private static List<String> emailsOf(Response response) {
		return response.jsonPath().getList("items.email", String.class);
	}

	private static String nextCursor(Response response) {
		return response.jsonPath().getString("next_cursor");
	}
}
