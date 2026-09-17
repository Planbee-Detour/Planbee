package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;

import com.planbee.api.auth.AuthApiTestBase;

import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

/**
 * admin-user-approval 테스트가 공유하는 준비 작업과 요청 헬퍼.
 *
 * <p>계정을 만드는 경로는 {@link AuthApiTestBase} 것을 그대로 쓴다 — 관리자 기능이 다루는
 * 대상이 결국 {@code auth} 가 만든 계정이고, 픽스처를 두 벌로 두면 두 테스트가 서로 다른
 * 사실을 검증하게 된다. 여기서는 <b>역할이 {@code ADMIN} 인 계정</b>과 관리자 엔드포인트
 * 호출만 더한다.
 *
 * <p><b>상태는 되도록 API 로 만든다.</b> SQL 로 {@code status} 만 바꾸면 {@code processed_at}
 * 이 {@code NULL} 로 남아 처리 완료 목록의 정렬 키가 어긋난다 (V901 이 실제로 밟았고 V902 가
 * 메운 함정 — review/server.md 참고 3). 그래서 승인·거절·정지 상태는 승인/거절/정지
 * 엔드포인트를 실제로 불러서 만들고, SQL 을 쓰는 곳은 <b>역할 부여 하나뿐</b>이다.
 * 그 하나도 시각 컬럼을 함께 채워 불변식을 깨지 않는다.
 */
public abstract class AdminApiTestBase extends AuthApiTestBase {

	protected static final String ADMIN_EMAIL = "admin@planbee.app";

	/** 관리자 계정이 승인된 시점. 다른 계정보다 확실히 과거여야 목록 정렬이 헷갈리지 않는다. */
	private static final Duration ADMIN_APPROVED_AGO = Duration.ofDays(30);

	protected String adminToken;
	protected long adminUserId;

	@BeforeEach
	void prepareAdmin() {
		// 상위 클래스의 TRUNCATE 가 지우지 못하는 표. 처리 기록은 계정과 함께 지워지지 않는다
		// (V3 — users 로의 외래키를 걸지 않았다).
		jdbc.execute("TRUNCATE TABLE admin_action_logs RESTART IDENTITY");

		adminUserId = registerAdmin(ADMIN_EMAIL);
		adminToken = accessToken(login(ADMIN_EMAIL, PASSWORD));
	}

	// ─────────────────────────────────────────────────────────────────
	// 계정 만들기
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 역할이 {@code ADMIN} 인 승인된 계정. 앱에는 역할을 바꾸는 경로가 없고(PRD Out of scope)
	 * 초기 관리자는 시드로 만들기로 확정돼 있으므로, 테스트도 DB 로 역할을 준다.
	 *
	 * <p>승인 시각과 {@code processed_at} 을 함께 채운다 — 상태만 바꾸면 처리 완료 목록에서
	 * 정렬 키가 {@code NULL} 인 행이 되어 첫 페이지 맨 앞으로 튀어나온다.
	 */
	protected long registerAdmin(String email) {
		registerUser(email);
		Instant approvedAt = clock.instant().minus(ADMIN_APPROVED_AGO);
		jdbc.update("""
				UPDATE users
				SET role = 'ADMIN', status = 'APPROVED',
				    approved_at = ?, processed_at = ?, updated_at = ?
				WHERE email = ?
				""", timestamp(approvedAt), timestamp(approvedAt), timestamp(approvedAt), email);
		return userIdOf(email);
	}

	/** 가입 신청만 한 계정({@code PENDING})을 만들고 식별자를 돌려준다. */
	protected long registerPending(String email) {
		registerUser(email);
		return userIdOf(email);
	}

	/**
	 * <b>가입 사유를 쓰지 않은</b> 신청 (AC-33 · AC-34). 가입 사유는 선택 항목이라
	 * 목록의 모든 항목에 값이 있다고 가정할 수 없다.
	 */
	protected long registerPendingWithoutReason(String email) {
		Map<String, Object> body = signupBody(email);
		body.remove("signup_reason");
		signup(body).then().statusCode(201);
		return userIdOf(email);
	}

	/** 승인까지 끝난 계정. 상태 전이는 실제 엔드포인트를 거친다. */
	protected long registerApproved(String email) {
		long userId = registerPending(email);
		approve(adminToken, userId).then().statusCode(200);
		return userId;
	}

	protected long registerRejected(String email, String reason) {
		long userId = registerPending(email);
		reject(adminToken, userId, reason).then().statusCode(200);
		return userId;
	}

	protected long registerSuspended(String email) {
		long userId = registerApproved(email);
		suspend(adminToken, userId).then().statusCode(200);
		return userId;
	}

	/**
	 * 역할이 {@code USER} 인 승인 계정으로 로그인해 액세스 토큰을 얻는다.
	 *
	 * <p>{@code AuthApiTestBase.loginApproved} 를 쓰지 않는 이유는 그쪽이 {@code status} 만
	 * SQL 로 바꾸기 때문이다 — {@code processed_at} 이 {@code NULL} 로 남아 처리 완료 목록의
	 * 정렬 키가 깨진다. 관리자 테스트에서는 승인도 실제 엔드포인트로 한다.
	 */
	protected String memberToken(String email) {
		registerApproved(email);
		return accessToken(login(email, PASSWORD));
	}

	protected long userIdOf(String email) {
		Long id = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
		assertThat(id).as("계정이 만들어져 있어야 한다: %s", email).isNotNull();
		return id;
	}

	// ─────────────────────────────────────────────────────────────────
	// 요청
	// ─────────────────────────────────────────────────────────────────

	protected RequestSpecification asAdmin(String token) {
		return token == null ? json() : json().header("Authorization", "Bearer " + token);
	}

	protected Response pending(String token) {
		return asAdmin(token).get("/api/v1/admin/users/pending");
	}

	protected Response pending(String token, Map<String, Object> query) {
		RequestSpecification request = asAdmin(token);
		query.forEach(request::queryParam);
		return request.get("/api/v1/admin/users/pending");
	}

	protected Response processed(String token) {
		return asAdmin(token).get("/api/v1/admin/users/processed");
	}

	protected Response processed(String token, Map<String, Object> query) {
		RequestSpecification request = asAdmin(token);
		query.forEach(request::queryParam);
		return request.get("/api/v1/admin/users/processed");
	}

	protected Response approve(String token, long userId) {
		return asAdmin(token).post("/api/v1/admin/users/{user_id}/approve", userId);
	}

	/** 사유를 담아 거절한다. {@code null} 을 주면 {@code "rejection_reason": null} 로 보낸다. */
	protected Response reject(String token, long userId, String reason) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("rejection_reason", reason);
		return asAdmin(token).body(body).post("/api/v1/admin/users/{user_id}/reject", userId);
	}

	/** <b>본문 자체가 없는</b> 거절 (AC-17). 사유를 남기지 않는 거절이 정상 흐름이다. */
	protected Response rejectWithoutBody(String token, long userId) {
		return asAdmin(token).post("/api/v1/admin/users/{user_id}/reject", userId);
	}

	protected Response cancelRejection(String token, long userId) {
		return asAdmin(token).post("/api/v1/admin/users/{user_id}/reject/cancel", userId);
	}

	protected Response suspend(String token, long userId) {
		return asAdmin(token).post("/api/v1/admin/users/{user_id}/suspend", userId);
	}

	protected Response cancelSuspension(String token, long userId) {
		return asAdmin(token).post("/api/v1/admin/users/{user_id}/suspend/cancel", userId);
	}

	// ─────────────────────────────────────────────────────────────────
	// 저장 결과 확인 (관측 가능한 결과만 본다 — S-11)
	// ─────────────────────────────────────────────────────────────────

	protected Map<String, Object> userRow(long userId) {
		return jdbc.queryForMap("""
				SELECT id, email, status, role, created_at, approved_at, suspended_at,
				       rejected_at, processed_at, rejection_reason
				FROM users WHERE id = ?
				""", userId);
	}

	protected List<Map<String, Object>> actionLogs(long targetUserId) {
		return jdbc.queryForList("""
				SELECT actor_user_id, target_user_id, action, created_at
				FROM admin_action_logs WHERE target_user_id = ? ORDER BY id
				""", targetUserId);
	}

	/**
	 * <b>상태와 {@code processed_at} 이 어긋난 행이 없는지</b> 확인한다.
	 *
	 * <p>{@code processed_at} 은 세 시각 컬럼에서 파생되지 않고 따로 저장된다. 그래서
	 * 애플리케이션 밖에서 {@code status} 만 바꾸면 조용히 어긋나고, 그때 처리 완료 목록의
	 * 정렬 키가 {@code NULL} 이 되어 <b>첫 페이지 맨 앞으로 튀어나온다</b>. 계약이
	 * "{@code processed_at} 은 언제나 같은 상태의 시각 필드와 값이 같다" 고 못 박았으므로
	 * (계약 {@code ProcessedUserItem.processed_at}) 그 불변식을 한 줄로 고정한다.
	 */
	protected void assertProcessedAtInvariant() {
		assertThat(jdbc.queryForList("""
				SELECT id, status, processed_at, approved_at, suspended_at, rejected_at FROM users
				WHERE (status = 'PENDING'   AND processed_at IS NOT NULL)
				   OR (status <> 'PENDING'  AND processed_at IS NULL)
				   OR (status = 'APPROVED'  AND processed_at IS DISTINCT FROM approved_at)
				   OR (status = 'SUSPENDED' AND processed_at IS DISTINCT FROM suspended_at)
				   OR (status = 'REJECTED'  AND processed_at IS DISTINCT FROM rejected_at)
				"""))
				.as("상태와 processed_at 이 어긋난 행이 있으면 처리 완료 목록의 정렬이 조용히 깨진다")
				.isEmpty();
	}

	/** {@code TIMESTAMP(6)} 컬럼에 직접 쓸 값. 저장은 UTC 다 (hibernate.jdbc.time_zone=UTC). */
	protected static LocalDateTime timestamp(Instant instant) {
		return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
	}

	protected static Instant instantOf(Object timestampColumn) {
		return ((Timestamp) timestampColumn).toLocalDateTime().toInstant(ZoneOffset.UTC);
	}
}
