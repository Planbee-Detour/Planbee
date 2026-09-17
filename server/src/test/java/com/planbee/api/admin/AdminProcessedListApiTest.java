package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 처리 완료 목록 {@code GET /api/v1/admin/users/processed} (AC-19 · AC-20 · AC-21 · AC-24 · AC-25).
 *
 * <p><b>세 상태가 한 목록에 섞인다</b> — {@code APPROVED} · {@code SUSPENDED} · {@code REJECTED}.
 * 상태별 목록으로 쪼개지 않기로 확정됐고(2026-09-07 Q1), 앱이 배지와 접두어를 만들지 않으므로
 * ({@code status_label} · {@code processed_at_prefix}) 그 한국어까지 서버가 내리는지 함께 본다 (C-8).
 *
 * <p>관리자 자기 계정도 숨기지 않는다 — 숨기면 관리자가 자기 상태를 확인할 수 없다. 대신
 * {@code is_me} 가 실려 앱이 액션 버튼을 렌더하지 않는다 (AC-25).
 */
@AdminApiTest
class AdminProcessedListApiTest extends AdminApiTestBase {

	@Test
	@DisplayName("AC-20 처리 완료 목록은 처리 시각 최신순이고 세 상태가 함께 온다")
	void AC20_처리_완료_목록은_처리_시각_최신순이다() {
		long approved = registerApproved("approved@example.com");
		clock.advance(Duration.ofMinutes(1));
		long rejected = registerRejected("rejected@example.com", "신청 내용만으로는 확인이 어려웠어요.");
		clock.advance(Duration.ofMinutes(1));
		long suspended = registerSuspended("suspended@example.com");

		Response response = processed(adminToken);

		response.then().statusCode(200)
				// 관리자 자신(30일 전 승인)이 맨 뒤에 함께 온다 — 숨기지 않는다.
				.body("items", hasSize(4))
				.body("items.user_id", contains(
						(int) suspended, (int) rejected, (int) approved, (int) adminUserId))
				.body("items.status", contains("SUSPENDED", "REJECTED", "APPROVED", "APPROVED"))
				// 배지 라벨과 시각 접두어는 서버가 완성해서 내린다 (C-8 / design.md §9.7).
				.body("items.status_label", contains("정지됨", "거절됨", "승인됨", "승인됨"))
				.body("items.processed_at_prefix", contains("정지", "거절", "승인", "승인"))
				.body("items.is_me", contains(false, false, false, true))
				.body("has_next", equalTo(false))
				.body("next_cursor", nullValue())
				// 이 목록의 건수가 아니라 검토 대기 건수다 (계약 ProcessedUserPage).
				.body("pending_approval_count", equalTo(0));

		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("AC-20·AC-24 각 상태에서 값이 있는 시각 필드와 null 인 시각 필드가 계약대로다")
	void AC20_상태별_시각_필드가_계약대로다() {
		registerApproved("approved@example.com");
		clock.advance(Duration.ofMinutes(1));
		registerRejected("rejected@example.com", null);
		clock.advance(Duration.ofMinutes(1));
		registerSuspended("suspended@example.com");

		Response response = processed(adminToken);
		Map<String, Map<String, Object>> byEmail = byEmail(response);

		Map<String, Object> approvedItem = byEmail.get("approved@example.com");
		assertThat(approvedItem.get("approved_at")).isNotNull();
		assertThat(approvedItem.get("suspended_at")).isNull();
		assertThat(approvedItem.get("rejected_at")).isNull();
		assertThat(approvedItem.get("processed_at"))
				.as("APPROVED 의 processed_at 은 approved_at 과 같다 (계약 표)")
				.isEqualTo(approvedItem.get("approved_at"));

		Map<String, Object> rejectedItem = byEmail.get("rejected@example.com");
		assertThat(rejectedItem.get("rejected_at")).isNotNull();
		assertThat(rejectedItem.get("approved_at"))
				.as("거절은 PENDING 에서만 일어나므로 승인된 적이 없다")
				.isNull();
		assertThat(rejectedItem.get("suspended_at")).isNull();
		assertThat(rejectedItem.get("processed_at")).isEqualTo(rejectedItem.get("rejected_at"));

		Map<String, Object> suspendedItem = byEmail.get("suspended@example.com");
		assertThat(suspendedItem.get("suspended_at")).isNotNull();
		assertThat(suspendedItem.get("approved_at"))
				.as("정지는 승인 시각을 보존한다 — 시트가 '승인 시각' 행을 그린다")
				.isNotNull();
		assertThat(suspendedItem.get("rejected_at")).isNull();
		assertThat(suspendedItem.get("processed_at")).isEqualTo(suspendedItem.get("suspended_at"));
	}

	@Test
	@DisplayName("거절 사유는 어떤 응답에도 실리지 않는다 — 저장만 한다")
	void 거절_사유는_응답에_실리지_않는다() {
		registerRejected("rejected@example.com", "여기 적은 문장이 응답에 새어 나오면 안 된다");

		String body = processed(adminToken).then().statusCode(200).extract().asString();

		assertThat(body).doesNotContain("rejection_reason");
		assertThat(body).doesNotContain("여기 적은 문장이 응답에 새어 나오면 안 된다");
		// 처리자(관리자) 정보도 담지 않는다 (2026-09-07 Q2).
		assertThat(body).doesNotContain("actor");
	}

	@Test
	@DisplayName("AC-6 처리한 신청이 없으면 빈 배열의 200 이다 (관리자 자신만 남는다)")
	void 처리_완료가_비어_있어도_정상_응답이다() {
		processed(adminToken).then().statusCode(200)
				.body("items", hasSize(1))
				.body("items[0].email", equalTo(ADMIN_EMAIL))
				.body("items[0].is_me", equalTo(true))
				.body("has_next", equalTo(false));
	}

	// ─────────────────────────────────────────────────────────────────
	// 커서 페이지네이션
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-7 처리 시각이 같으면 user_id 내림차순으로 깨고, 한 건씩 훑어도 새거나 겹치지 않는다")
	void 처리_완료_목록의_동률은_user_id_내림차순으로_깬다() {
		// 시계를 움직이지 않고 세 건을 승인한다 — processed_at 이 마이크로초까지 같다.
		long first = registerApproved("tie-a@example.com");
		long second = registerApproved("tie-b@example.com");
		long third = registerApproved("tie-c@example.com");
		assertThat(sameProcessedAt(first, second, third)).as("동률 상황이 실제로 만들어졌는지").isTrue();

		processed(adminToken).then().statusCode(200)
				.body("items.user_id", contains(
						(int) third, (int) second, (int) first, (int) adminUserId));

		assertThat(walkAllProcessed(1))
				.as("한 건씩 훑어도 순서와 개수가 그대로여야 한다")
				.containsExactly("tie-c@example.com", "tie-b@example.com", "tie-a@example.com", ADMIN_EMAIL);
	}

	@Test
	@DisplayName("AC-7 처리 완료 목록도 커서로 끝까지 훑을 수 있고 마지막 페이지의 has_next 는 false 다")
	void 처리_완료_목록도_커서로_순회한다() {
		List<String> emails = new ArrayList<>();
		for (int index = 1; index <= 5; index++) {
			String email = "member%02d@example.com".formatted(index);
			registerApproved(email);
			emails.add(email);
			clock.advance(Duration.ofMinutes(1));
		}

		List<String> expected = new ArrayList<>(emails.reversed());
		expected.add(ADMIN_EMAIL);

		assertThat(walkAllProcessed(2))
				.as("2건씩 훑어도 전체가 처리 시각 역순으로 한 번씩만 나와야 한다")
				.containsExactlyElementsOf(expected);
	}

	@Test
	@DisplayName("AC-7 처리 완료 목록도 page_size 범위 밖은 400, 깨진 커서는 400 이다")
	void 처리_완료_목록의_페이지_파라미터_오류() {
		processed(adminToken, Map.of("page_size", 0)).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("page_size"));
		processed(adminToken, Map.of("page_size", 51)).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"));
		processed(adminToken, Map.of("cursor", "bm90LWpzb24")).then().statusCode(400)
				.body("code", equalTo("MALFORMED_REQUEST"));
	}

	@Test
	@DisplayName("AC-19 거절 취소로 대기로 돌아간 계정은 처리 완료 목록에서 사라진다")
	void AC19_거절_취소한_계정은_처리_완료_목록에서_사라진다() {
		long rejected = registerRejected("rejected@example.com", "사유");
		processed(adminToken).then().body("items.email", contains("rejected@example.com", ADMIN_EMAIL));

		cancelRejection(adminToken, rejected).then().statusCode(200);

		processed(adminToken).then().statusCode(200)
				.body("items", hasSize(1))
				.body("items[0].email", equalTo(ADMIN_EMAIL));
		pending(adminToken).then().statusCode(200)
				.body("items.email", contains("rejected@example.com"))
				.body("items[0].requested_at", notNullValue());
	}

	// ─────────────────────────────────────────────────────────────────
	// 헬퍼
	// ─────────────────────────────────────────────────────────────────

	private List<String> walkAllProcessed(int pageSize) {
		List<String> walked = new ArrayList<>();
		Set<String> seen = new LinkedHashSet<>();
		String cursor = null;
		for (int page = 0; page < 50; page++) {
			Response response = cursor == null
					? processed(adminToken, Map.of("page_size", pageSize))
					: processed(adminToken, Map.of("page_size", pageSize, "cursor", cursor));
			response.then().statusCode(200);
			for (String email : response.jsonPath().getList("items.email", String.class)) {
				assertThat(seen.add(email)).as("같은 항목이 두 페이지에 걸쳐 나왔다: %s", email).isTrue();
				walked.add(email);
			}
			if (!response.jsonPath().getBoolean("has_next")) {
				return walked;
			}
			cursor = response.jsonPath().getString("next_cursor");
		}
		throw new IllegalStateException("커서 순회가 끝나지 않았다 — has_next 가 계속 true 다");
	}

	private boolean sameProcessedAt(long... userIds) {
		List<Object> values = new ArrayList<>();
		for (long userId : userIds) {
			values.add(userRow(userId).get("processed_at"));
		}
		return values.stream().distinct().count() == 1;
	}

	/** 항목을 이메일로 찾을 수 있게 바꾼다. 순서 검증은 위 테스트가 따로 한다. */
	private static Map<String, Map<String, Object>> byEmail(Response response) {
		List<Map<String, Object>> items = response.jsonPath().getList("items");
		Map<String, Map<String, Object>> byEmail = new LinkedHashMap<>();
		items.forEach(item -> byEmail.put((String) item.get("email"), item));
		return byEmail;
	}
}
