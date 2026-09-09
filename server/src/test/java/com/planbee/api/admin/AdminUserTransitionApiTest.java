package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.LongFunction;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 상태 전이 5종 — 승인 · 거절 · 거절 취소 · 정지 · 정지 해제
 * (AC-10 ~ AC-13, AC-15 ~ AC-17, AC-19, AC-21, AC-24, AC-25, AC-34).
 *
 * <p><b>각 전이의 전제 상태는 하나씩이고, 그것과 다르면 다섯이 같은 코드 하나를 쓴다</b>
 * ({@code ADMIN_USER_ALREADY_PROCESSED}, AC-12). 다섯 중 하나라도 다른 코드를 내면 앱의
 * 시트 안 배너 분기가 그 엔드포인트에서만 조용히 어긋난다 — 그래서 다섯을 한 테스트에서 함께 본다.
 *
 * <p><b>{@code processed_at} 불변식을 전이마다 다시 확인한다.</b> 이 값은 세 시각 컬럼에서
 * 파생되지 않고 따로 저장되므로, 전이 하나가 갱신을 빠뜨리면 목록의 정렬 키가 조용히 어긋난다
 * (review/server.md 참고 3 — V901 이 실제로 밟은 함정).
 */
@AdminApiTest
class AdminUserTransitionApiTest extends AdminApiTestBase {

	private static final long UNKNOWN_USER_ID = 999_999L;

	// ─────────────────────────────────────────────────────────────────
	// 승인 (AC-10 · AC-11 · AC-34)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-10 승인하면 대기 목록에서 사라지고 처리 완료 목록에 승인됨으로 나타난다")
	void AC10_승인하면_대기_목록에서_사라진다() {
		long applicant = registerPending("applicant@example.com");
		registerPending("other@example.com");

		approve(adminToken, applicant).then().statusCode(200)
				.body("pending_approval_count", equalTo(1))
				.body("user.user_id", equalTo((int) applicant))
				.body("user.email", equalTo("applicant@example.com"))
				.body("user.status", equalTo("APPROVED"))
				.body("user.status_label", equalTo("승인됨"))
				.body("user.processed_at_prefix", equalTo("승인"))
				.body("user.approved_at", notNullValue())
				.body("user.suspended_at", nullValue())
				.body("user.rejected_at", nullValue())
				.body("user.is_me", equalTo(false));

		pending(adminToken).then().body("items.email", contains("other@example.com"));
		processed(adminToken).then().body("items.email",
				contains("applicant@example.com", ADMIN_EMAIL));
		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("AC-11 승인된 사용자는 곧바로 로그인에 성공한다")
	void AC11_승인된_사용자는_로그인할_수_있다() {
		long applicant = registerPending("applicant@example.com");
		login("applicant@example.com", PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_PENDING"));

		approve(adminToken, applicant).then().statusCode(200);

		login("applicant@example.com", PASSWORD).then().statusCode(200)
				.body("token.access_token", notNullValue())
				.body("user.status", equalTo("APPROVED"));
	}

	@Test
	@DisplayName("AC-34 가입 사유가 없는 신청도 승인·거절 경로가 같다")
	void AC34_가입_사유가_없어도_동일하게_처리된다() {
		long noReason = registerPendingWithoutReason("no-reason@example.com");
		long alsoNoReason = registerPendingWithoutReason("no-reason-2@example.com");

		approve(adminToken, noReason).then().statusCode(200)
				.body("user.status", equalTo("APPROVED"));
		reject(adminToken, alsoNoReason, null).then().statusCode(200)
				.body("user.status", equalTo("REJECTED"));

		assertProcessedAtInvariant();
	}

	// ─────────────────────────────────────────────────────────────────
	// 거절 (AC-15 ~ AC-18)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-15·AC-18 거절하면 대기 목록에서 사라지고 그 사용자는 거절 화면을 본다")
	void AC15_거절하면_대기_목록에서_사라진다() {
		long applicant = registerPending("applicant@example.com");

		reject(adminToken, applicant, "신청 내용만으로는 확인이 어려웠어요.").then().statusCode(200)
				.body("pending_approval_count", equalTo(0))
				.body("user.status", equalTo("REJECTED"))
				.body("user.status_label", equalTo("거절됨"))
				.body("user.processed_at_prefix", equalTo("거절"))
				.body("user.rejected_at", notNullValue())
				.body("user.approved_at", nullValue());

		pending(adminToken).then().body("items", hasSize(0));
		login("applicant@example.com", PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_REJECTED"));
		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("AC-17 거절 사유는 선택이다 — 본문 생략 · null · 빈 문자열이 모두 200 이다")
	void AC17_거절_사유는_선택이다() {
		long noBody = registerPending("no-body@example.com");
		long nullReason = registerPending("null-reason@example.com");
		long blankReason = registerPending("blank-reason@example.com");

		rejectWithoutBody(adminToken, noBody).then().statusCode(200)
				.body("user.status", equalTo("REJECTED"));
		reject(adminToken, nullReason, null).then().statusCode(200)
				.body("user.status", equalTo("REJECTED"));
		reject(adminToken, blankReason, "   ").then().statusCode(200)
				.body("user.status", equalTo("REJECTED"));

		// 빈 값은 저장하지 않는다 — 나중에 "사유가 있었는가" 를 되짚을 때 공백과 없음이 갈리면 곤란하다.
		assertThat(userRow(noBody).get("rejection_reason")).isNull();
		assertThat(userRow(nullReason).get("rejection_reason")).isNull();
		assertThat(userRow(blankReason).get("rejection_reason")).isNull();
	}

	@Test
	@DisplayName("AC-16 거절 사유는 200자까지 통과하고 201자는 400 VALIDATION_FAILED 다")
	void AC16_거절_사유는_200자가_경계다() {
		long exactly200 = registerPending("boundary-ok@example.com");
		long over200 = registerPending("boundary-fail@example.com");

		reject(adminToken, exactly200, "가".repeat(200)).then().statusCode(200)
				.body("user.status", equalTo("REJECTED"));

		reject(adminToken, over200, "가".repeat(201)).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("rejection_reason"))
				.body("errors[0].code", equalTo("SIZE"))
				.body("errors[0].message", equalTo("200자까지 쓸 수 있어요"));

		// 거절이 일어나지 않았다 — 검증에 걸린 요청은 아무것도 바꾸지 않는다.
		assertThat(userRow(over200).get("status")).isEqualTo("PENDING");
		assertThat(userRow(exactly200).get("rejection_reason")).isEqualTo("가".repeat(200));
	}

	// ─────────────────────────────────────────────────────────────────
	// 거절 취소 (AC-19)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-19 거절을 취소하면 대기로 돌아가고 신청 시각은 그대로다")
	void AC19_거절_취소는_원래_자리로_되돌린다() {
		long applicant = registerPending("applicant@example.com");
		Instant requestedAt = instantOf(userRow(applicant).get("created_at"));

		reject(adminToken, applicant, "사유").then().statusCode(200);
		clock.advance(Duration.ofHours(3));

		cancelRejection(adminToken, applicant).then().statusCode(200)
				// 결과 상태가 PENDING 이라 응답이 PendingUserItem 이다 (계약 PendingUserActionResult).
				.body("pending_approval_count", equalTo(1))
				.body("user.user_id", equalTo((int) applicant))
				.body("user.signup_reason_text", notNullValue())
				.body("user.status", nullValue())
				.body("user.requested_at", notNullValue());

		Map<String, Object> row = userRow(applicant);
		assertThat(row.get("status")).isEqualTo("PENDING");
		assertThat(instantOf(row.get("created_at")))
				.as("거절 취소 시각으로 정렬되지 않는다 — 원래 신청 시각 그대로다 (design.md §7.5)")
				.isEqualTo(requestedAt);
		assertThat(row.get("processed_at")).isNull();
		assertThat(row.get("rejected_at")).isNull();
		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("D-3 거절을 취소하면 저장된 거절 사유를 비운다 — 다음 거절에 예전 사유가 남지 않는다")
	void D3_거절_취소는_거절_사유를_비운다() {
		long applicant = registerPending("applicant@example.com");
		reject(adminToken, applicant, "첫 번째 거절의 사유").then().statusCode(200);
		assertThat(userRow(applicant).get("rejection_reason")).isEqualTo("첫 번째 거절의 사유");

		cancelRejection(adminToken, applicant).then().statusCode(200);

		assertThat(userRow(applicant).get("rejection_reason"))
				.as("남겨 두면 다음 거절 때 그 값이 어느 결정에 붙은 것인지 알 수 없다")
				.isNull();

		// 사유 없이 다시 거절해도 예전 문장이 되살아나지 않는다.
		rejectWithoutBody(adminToken, applicant).then().statusCode(200);
		assertThat(userRow(applicant).get("rejection_reason")).isNull();
	}

	// ─────────────────────────────────────────────────────────────────
	// 정지 · 정지 해제 (AC-21 · AC-24 · AC-25)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-21 정지하면 상태가 SUSPENDED 가 되고 승인 시각은 보존된다 — 대기 건수는 변하지 않는다")
	void AC21_정지는_상태만_바꾸고_건수를_바꾸지_않는다() {
		long member = registerApproved("member@example.com");
		registerPending("waiting@example.com");
		Instant approvedAt = instantOf(userRow(member).get("approved_at"));
		clock.advance(Duration.ofHours(2));

		suspend(adminToken, member).then().statusCode(200)
				.body("pending_approval_count", equalTo(1))
				.body("user.status", equalTo("SUSPENDED"))
				.body("user.status_label", equalTo("정지됨"))
				.body("user.processed_at_prefix", equalTo("정지"))
				.body("user.suspended_at", notNullValue())
				.body("user.approved_at", notNullValue())
				.body("user.rejected_at", nullValue());

		Map<String, Object> row = userRow(member);
		assertThat(instantOf(row.get("approved_at")))
				.as("정지는 승인 시각을 건드리지 않는다")
				.isEqualTo(approvedAt);
		assertThat(instantOf(row.get("processed_at"))).isEqualTo(instantOf(row.get("suspended_at")));
		login("member@example.com", PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_SUSPENDED"));
		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("D-2·AC-24 정지를 해제하면 승인으로 돌아가고 승인 시각이 해제 시각으로 갱신된다")
	void D2_정지_해제는_승인_시각을_갱신한다() {
		long member = registerApproved("member@example.com");
		Instant firstApprovedAt = instantOf(userRow(member).get("approved_at"));
		clock.advance(Duration.ofHours(2));
		suspend(adminToken, member).then().statusCode(200);
		clock.advance(Duration.ofHours(2));

		cancelSuspension(adminToken, member).then().statusCode(200)
				.body("user.status", equalTo("APPROVED"))
				.body("user.status_label", equalTo("승인됨"))
				.body("user.processed_at_prefix", equalTo("승인"))
				.body("user.suspended_at", nullValue());

		Map<String, Object> row = userRow(member);
		assertThat(instantOf(row.get("approved_at")))
				.as("갱신하지 않으면 목록 행과 상세 시트가 서로 다른 날짜를 말한다 (design.md §5.4)")
				.isAfter(firstApprovedAt)
				.isEqualTo(instantOf(row.get("processed_at")));
		assertThat(row.get("suspended_at")).isNull();
		login("member@example.com", PASSWORD).then().statusCode(200);
		assertProcessedAtInvariant();
	}

	@Test
	@DisplayName("AC-25 관리자가 자기 계정을 정지하려 하면 403 ADMIN_SELF_SUSPEND_FORBIDDEN 이다")
	void AC25_자기_자신은_정지할_수_없다() {
		suspend(adminToken, adminUserId).then().statusCode(403)
				.body("code", equalTo("ADMIN_SELF_SUSPEND_FORBIDDEN"))
				.body("detail", equalTo("내 계정은 정지할 수 없어요."));

		// 앱이 버튼을 숨기는 것은 편의일 뿐이고 차단은 서버가 한다 — 상태가 바뀌지 않았다.
		assertThat(userRow(adminUserId).get("status")).isEqualTo("APPROVED");
		processed(adminToken).then().body("items[0].is_me", equalTo(true));
	}

	// ─────────────────────────────────────────────────────────────────
	// 실패 케이스 — 전제 상태 위반과 대상 없음
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-12 전이 5종 모두 전제 상태가 아니면 같은 409 ADMIN_USER_ALREADY_PROCESSED 다")
	void AC12_전이_5종이_같은_409_코드를_쓴다() {
		long approved = registerApproved("approved@example.com");
		long stillPending = registerPending("pending@example.com");

		Map<String, Response> conflicts = new LinkedHashMap<>();
		// approve · reject 의 전제는 PENDING 이다.
		conflicts.put("approve", approve(adminToken, approved));
		conflicts.put("reject", reject(adminToken, approved, null));
		// reject/cancel 의 전제는 REJECTED 다.
		conflicts.put("reject/cancel", cancelRejection(adminToken, stillPending));
		// suspend 의 전제는 APPROVED 다.
		conflicts.put("suspend", suspend(adminToken, stillPending));
		// suspend/cancel 의 전제는 SUSPENDED 다.
		conflicts.put("suspend/cancel", cancelSuspension(adminToken, approved));

		conflicts.forEach((endpoint, response) -> response.then()
				.statusCode(409)
				.body("code", equalTo("ADMIN_USER_ALREADY_PROCESSED"))
				.body("detail", equalTo("이미 처리된 신청이에요."))
				.body("status", equalTo(409)));

		assertThat(conflicts).as("전이 5종을 모두 확인했는지").hasSize(5);
		// 실패한 요청이 상태를 바꾸지 않았다.
		assertThat(userRow(approved).get("status")).isEqualTo("APPROVED");
		assertThat(userRow(stillPending).get("status")).isEqualTo("PENDING");
	}

	@Test
	@DisplayName("전이 5종 모두 대상이 없으면 404 NOT_FOUND 다 — 409 로 뭉뚱그리지 않는다")
	void 없는_대상은_404_다() {
		Map<String, LongFunction<Response>> transitions = transitions();

		transitions.forEach((endpoint, call) -> call.apply(UNKNOWN_USER_ID).then()
				.statusCode(404)
				.body("code", equalTo("NOT_FOUND"))
				.body("detail", equalTo("대상을 찾을 수 없어요.")));

		assertThat(transitions).as("전이 5종을 모두 확인했는지").hasSize(5);
	}

	// ─────────────────────────────────────────────────────────────────
	// 처리 기록 (AC-13) · processed_at 불변식
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-13 처리할 때마다 누가·언제·무엇을 했는지 기록이 남는다 (응답에는 싣지 않는다)")
	void AC13_처리_기록이_남는다() {
		long member = registerPending("member@example.com");

		approve(adminToken, member).then().statusCode(200);
		clock.advance(Duration.ofMinutes(1));
		suspend(adminToken, member).then().statusCode(200);
		clock.advance(Duration.ofMinutes(1));
		cancelSuspension(adminToken, member).then().statusCode(200);

		assertThat(actionLogs(member))
				.extracting(row -> row.get("action"))
				.containsExactly("APPROVE", "SUSPEND", "CANCEL_SUSPENSION");
		assertThat(actionLogs(member))
				.allSatisfy(row -> {
					assertThat(row.get("actor_user_id")).isEqualTo(adminUserId);
					assertThat(row.get("created_at")).isNotNull();
				});
	}

	@Test
	@DisplayName("전이 5종을 모두 거쳐도 processed_at 이 그 상태의 시각 필드와 어긋나지 않는다")
	void 전이_5종을_거쳐도_processed_at_불변식이_유지된다() {
		long member = registerPending("member@example.com");

		assertThat(userRow(member).get("processed_at")).as("PENDING 은 아직 처리되지 않았다").isNull();

		approve(adminToken, member).then().statusCode(200);
		assertProcessedAtEquals(member, "approved_at");

		clock.advance(Duration.ofMinutes(1));
		suspend(adminToken, member).then().statusCode(200);
		assertProcessedAtEquals(member, "suspended_at");

		clock.advance(Duration.ofMinutes(1));
		cancelSuspension(adminToken, member).then().statusCode(200);
		assertProcessedAtEquals(member, "approved_at");

		// 대기로 되돌린 뒤 거절 — 남은 두 전이도 같은 규칙을 지키는지 본다.
		long other = registerPending("other@example.com");
		clock.advance(Duration.ofMinutes(1));
		reject(adminToken, other, "사유").then().statusCode(200);
		assertProcessedAtEquals(other, "rejected_at");

		clock.advance(Duration.ofMinutes(1));
		cancelRejection(adminToken, other).then().statusCode(200);
		assertThat(userRow(other).get("processed_at"))
				.as("대기 상태에는 처리 시각이 존재하지 않는다")
				.isNull();

		assertProcessedAtInvariant();
	}

	// ─────────────────────────────────────────────────────────────────
	// 헬퍼
	// ─────────────────────────────────────────────────────────────────

	/** 계약이 정의한 상태 전이 5종. 대상 식별자만 받아 호출한다. */
	private Map<String, LongFunction<Response>> transitions() {
		Map<String, LongFunction<Response>> transitions = new LinkedHashMap<>();
		transitions.put("approve", userId -> approve(adminToken, userId));
		transitions.put("reject", userId -> reject(adminToken, userId, null));
		transitions.put("reject/cancel", userId -> cancelRejection(adminToken, userId));
		transitions.put("suspend", userId -> suspend(adminToken, userId));
		transitions.put("suspend/cancel", userId -> cancelSuspension(adminToken, userId));
		return transitions;
	}

	private void assertProcessedAtEquals(long userId, String column) {
		Map<String, Object> row = userRow(userId);
		assertThat(row.get("processed_at"))
				.as("%s 상태의 processed_at 은 %s 와 같아야 한다", row.get("status"), column)
				.isEqualTo(row.get(column))
				.isNotNull();
		assertProcessedAtInvariant();
	}
}
