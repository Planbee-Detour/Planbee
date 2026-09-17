package com.planbee.api.admin;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import com.planbee.api.auth.UserStatus;

import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

/**
 * 관리자 엔드포인트의 인가 (AC-3 · AC-4).
 *
 * <p>이 기능의 차단은 <b>서버가 한다.</b> 앱이 진입점을 숨기는 것(AC-2)은 편의일 뿐이고,
 * 앱 쪽 숨김만으로 통과 판정하지 않는다 (PRD 제약). 그래서 일곱 경로 전부를 같은 표로 훑는다 —
 * 엔드포인트가 하나 늘 때 인가를 빠뜨리면 여기서 걸려야 한다.
 *
 * <p><b>세 코드가 갈리는지</b>가 판정의 핵심이다. 앱이 그리는 화면이 서로 다르기 때문이다
 * (C-1 — 분기는 {@code code} 로 한다).
 *
 * <table>
 *   <tr><td>역할이 {@code ADMIN} 이 아님</td><td>403 {@code ADMIN_FORBIDDEN}</td></tr>
 *   <tr><td>{@code scope: account:delete} 토큰</td><td>403 {@code FORBIDDEN}</td></tr>
 *   <tr><td>토큰 없음 · 무효</td><td>401 {@code UNAUTHORIZED}</td></tr>
 * </table>
 */
@AdminApiTest
class AdminAuthorizationApiTest extends AdminApiTestBase {

	private static final String MEMBER_EMAIL = "member@example.com";

	/** 계약이 정의한 관리자 엔드포인트 전부. 하나라도 빠지면 그 경로가 열려 있어도 모른다. */
	static List<AdminEndpoint> adminEndpoints() {
		return List.of(
				new AdminEndpoint("GET", "/api/v1/admin/users/pending"),
				new AdminEndpoint("GET", "/api/v1/admin/users/processed"),
				new AdminEndpoint("POST", "/api/v1/admin/users/1/approve"),
				new AdminEndpoint("POST", "/api/v1/admin/users/1/reject"),
				new AdminEndpoint("POST", "/api/v1/admin/users/1/reject/cancel"),
				new AdminEndpoint("POST", "/api/v1/admin/users/1/suspend"),
				new AdminEndpoint("POST", "/api/v1/admin/users/1/suspend/cancel"));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("adminEndpoints")
	@DisplayName("AC-3 USER 역할의 토큰으로 관리자 API 를 부르면 403 ADMIN_FORBIDDEN 이다")
	void AC3_USER_토큰은_관리자_API_에서_403_이다(AdminEndpoint endpoint) {
		String token = memberToken(MEMBER_EMAIL);

		endpoint.call(json().header("Authorization", "Bearer " + token))
				.then().statusCode(403)
				.body("code", equalTo("ADMIN_FORBIDDEN"))
				.body("detail", equalTo("관리자만 사용할 수 있어요."))
				.body("status", equalTo(403));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("adminEndpoints")
	@DisplayName("AC-4 토큰 없이 관리자 API 를 부르면 401 UNAUTHORIZED 다")
	void AC4_미인증_요청은_401_이다(AdminEndpoint endpoint) {
		endpoint.call(json()).then().statusCode(401).body("code", equalTo("UNAUTHORIZED"));
	}

	@Test
	@DisplayName("AC-4 형식이 깨진 토큰도 401 UNAUTHORIZED 다 — 403 으로 새지 않는다")
	void AC4_무효한_토큰은_401_이다() {
		pending("not-a-jwt").then().statusCode(401).body("code", equalTo("UNAUTHORIZED"));
	}

	@Test
	@DisplayName("AC-3 ADMIN 토큰은 통과한다 — 위 403 이 인가 때문이지 다른 이유가 아님을 고정한다")
	void AC3_ADMIN_토큰은_통과한다() {
		pending(adminToken).then().statusCode(200);
		processed(adminToken).then().statusCode(200);
	}

	/**
	 * 삭제 전용 토큰은 <b>역할 검사보다 먼저</b> 스코프에서 걸린다 (계약 {@code ForbiddenScope}).
	 * 역할이 {@code ADMIN} 인 계정으로 확인해야 "역할이 있어도 스코프가 먼저" 임이 드러난다 —
	 * 역할이 {@code USER} 인 계정으로는 어느 쪽이 먼저 걸렸는지 구분되지 않는다.
	 *
	 * <p>앱의 처리가 다르기 때문에 코드가 갈려야 한다 — {@code FORBIDDEN} 에서는 토큰 갱신을
	 * 재시도하지 않고, {@code ADMIN_FORBIDDEN} 에서는 권한 없음 화면을 그린다.
	 */
	@Test
	@DisplayName("AC-3 삭제 전용 토큰(scope: account:delete)은 공통 FORBIDDEN 이다 — ADMIN_FORBIDDEN 이 아니다")
	void 삭제_전용_토큰은_공통_FORBIDDEN_이다() {
		String rejectedAdmin = "rejected-admin@planbee.app";
		registerAdmin(rejectedAdmin);
		markRejected(rejectedAdmin);

		Response blocked = login(rejectedAdmin, PASSWORD);
		blocked.then().statusCode(403).body("code", equalTo("AUTH_ACCOUNT_REJECTED"));
		String deletionToken = blocked.jsonPath().getString("deletion_token");

		pending(deletionToken).then().statusCode(403).body("code", equalTo("FORBIDDEN"));
		suspend(deletionToken, adminUserId).then().statusCode(403).body("code", equalTo("FORBIDDEN"));
	}

	@Test
	@DisplayName("AC-2 USER 에게는 pending_approval_count 가 null 이다 — 값 자체가 새지 않는다")
	void AC2_USER_에게는_대기_건수를_내리지_않는다() {
		registerPending("applicant@example.com");
		String token = memberToken(MEMBER_EMAIL);

		getMe(token).then().statusCode(200)
				.body("role", equalTo("USER"))
				.body("pending_approval_count", nullValue());
	}

	/** {@code REJECTED} 로 옮기되 시각 컬럼을 함께 맞춘다 — 상태만 바꾸면 불변식이 깨진다. */
	private void markRejected(String email) {
		Instant at = clock.instant();
		jdbc.update("""
				UPDATE users
				SET status = ?, rejected_at = ?, processed_at = ?, approved_at = NULL, updated_at = ?
				WHERE email = ?
				""", UserStatus.REJECTED.name(), timestamp(at), timestamp(at), timestamp(at), email);
		assertProcessedAtInvariant();
	}

	/** 인가 표의 한 줄. {@code toString} 이 파라미터 이름으로 그대로 쓰인다. */
	record AdminEndpoint(String method, String path) {

		Response call(RequestSpecification request) {
			return "GET".equals(method) ? request.get(path) : request.post(path);
		}

		@Override
		public String toString() {
			return method + " " + path;
		}
	}
}
