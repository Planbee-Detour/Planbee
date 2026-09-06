package com.planbee.api.auth;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;

import com.planbee.api.support.MutableClock;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

/**
 * auth 테스트가 공유하는 준비 작업과 요청 헬퍼.
 *
 * <p><b>테스트 간 상태를 남기지 않는다.</b> 이 기능에는 DB 밖에도 상태가 셋 있다
 * (`server.md` S-29 — 로그인 실패 카운터 · 가입 IP 레이트 리밋 · 리프레시 유예 창 캐시).
 * DB 만 비우고 그것들을 두면 테스트 순서에 따라 결과가 달라진다 — 매번 함께 비운다.
 */
abstract class AuthApiTestBase {

	protected static final String PASSWORD = "planbee2026";
	protected static final String SUPPORT_EMAIL = "support@planbee.app";

	@LocalServerPort
	private int port;

	@Autowired
	protected MutableClock clock;

	@Autowired
	protected JdbcTemplate jdbc;

	@Autowired
	private RefreshTokenService refreshTokenService;

	@Autowired
	private LoginAttemptGuard loginAttemptGuard;

	@Autowired
	private SignupRateLimiter signupRateLimiter;

	/** 가입 레이트 리밋은 IP 로 센다. 의도적으로 한도를 넘기는 테스트 외에는 매 요청 다른 IP 를 쓴다. */
	private final AtomicInteger clientIpCounter = new AtomicInteger();

	@BeforeEach
	void resetEverything() {
		RestAssured.port = port;
		RestAssured.basePath = "";

		jdbc.execute("TRUNCATE TABLE refresh_tokens, user_consents, users RESTART IDENTITY CASCADE");

		clock.resetToNow();
		clearInMemoryState(refreshTokenService, "graceCache");
		clearInMemoryState(loginAttemptGuard, "attemptsByEmail");
		clearInMemoryState(signupRateLimiter, "windowsByClient");
	}

	/**
	 * <b>서버가 직전 응답을 기억하지 못하는 상태</b>를 만든다 — 재기동 · 캐시 정리 · 요청이 다른
	 * 인스턴스로 간 경우가 전부 여기 해당한다 (계약 {@code POST /token/refresh},
	 * `server.md` S-17). 이 상태에서의 동작이 이번 기능에서 가장 놓치기 쉬운 분기다.
	 */
	protected void forgetGraceWindowCache() {
		clearInMemoryState(refreshTokenService, "graceCache");
	}

	@SuppressWarnings("unchecked")
	private void clearInMemoryState(Object bean, String fieldName) {
		Object target = AopTestUtils.getTargetObject(bean);
		Map<Object, Object> state = (Map<Object, Object>) ReflectionTestUtils.getField(target, fieldName);
		if (state != null) {
			state.clear();
		}
	}

	// ─────────────────────────────────────────────────────────────────
	// 요청
	// ─────────────────────────────────────────────────────────────────

	protected RequestSpecification json() {
		return RestAssured.given().contentType(ContentType.JSON).accept(ContentType.JSON);
	}

	protected String nextClientIp() {
		return "203.0.113." + clientIpCounter.incrementAndGet();
	}

	protected Response signup(Map<String, Object> body) {
		return signup(body, nextClientIp());
	}

	protected Response signup(Map<String, Object> body, String clientIp) {
		return json().header("X-Forwarded-For", clientIp).body(body).post("/api/v1/auth/signup");
	}

	protected Response login(String email, String password) {
		return json().body(Map.of("email", email, "password", password)).post("/api/v1/auth/login");
	}

	protected Response refresh(String refreshToken) {
		return json().body(Map.of("refresh_token", refreshToken)).post("/api/v1/auth/token/refresh");
	}

	protected Response logout(String accessToken, String refreshToken) {
		return json().header("Authorization", "Bearer " + accessToken)
				.body(Map.of("refresh_token", refreshToken))
				.post("/api/v1/auth/logout");
	}

	protected Response getMe(String accessToken) {
		return json().header("Authorization", "Bearer " + accessToken).get("/api/v1/auth/me");
	}

	protected Response deleteMe(String accessToken, String password) {
		return json().header("Authorization", "Bearer " + accessToken)
				.body(Map.of("password", password))
				.delete("/api/v1/auth/me");
	}

	// ─────────────────────────────────────────────────────────────────
	// 요청 본문
	// ─────────────────────────────────────────────────────────────────

	protected static Map<String, Object> signupBody(String email) {
		return signupBody(email, PASSWORD);
	}

	protected static Map<String, Object> signupBody(String email, String password) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("email", email);
		body.put("password", password);
		body.put("signup_reason", "주간 계획을 자주 바꾸는 편이라 대안을 추천받고 싶어요.");
		body.put("consents", allConsents(true, true, true));
		body.put("age_over_14_confirmed", true);
		return body;
	}

	protected static List<Map<String, Object>> allConsents(boolean terms, boolean privacy, boolean marketing) {
		List<Map<String, Object>> consents = new ArrayList<>();
		consents.add(consent("TERMS", terms, "v1.0"));
		consents.add(consent("PRIVACY", privacy, "v1.0"));
		// MARKETING 은 대응 문서가 없어 버전이 비어 있다 (PRD 제약 / 계약 ConsentInput.version).
		consents.add(consent("MARKETING", marketing, null));
		return consents;
	}

	protected static Map<String, Object> consent(String type, boolean agreed, String version) {
		Map<String, Object> consent = new LinkedHashMap<>();
		consent.put("type", type);
		consent.put("agreed", agreed);
		consent.put("version", version);
		return consent;
	}

	// ─────────────────────────────────────────────────────────────────
	// 계정 만들기 — 상태 전이는 admin-user-approval 소유라 여기서는 DB 로 직접 세운다
	// ─────────────────────────────────────────────────────────────────

	/** 가입 신청만 한 상태({@code PENDING}). */
	protected void registerUser(String email) {
		signup(signupBody(email)).then().statusCode(201);
	}

	/**
	 * 가입 후 상태를 옮긴다. 승인·거절·정지는 {@code admin-user-approval} 의 기능이고 auth 에는
	 * 그 경로가 없으므로, 상태에 따른 분기를 검증하려면 DB 를 직접 세우는 수밖에 없다.
	 */
	protected void registerUser(String email, UserStatus status) {
		registerUser(email);
		jdbc.update("UPDATE users SET status = ? WHERE email = ?", status.name(), email);
	}

	protected Response loginApproved(String email) {
		registerUser(email, UserStatus.APPROVED);
		Response response = login(email, PASSWORD);
		response.then().statusCode(200);
		return response;
	}

	protected static String accessToken(Response loginResponse) {
		return loginResponse.jsonPath().getString("token.access_token");
	}

	protected static String refreshToken(Response loginResponse) {
		return loginResponse.jsonPath().getString("token.refresh_token");
	}

	// ─────────────────────────────────────────────────────────────────
	// 저장 결과 확인 (관측 가능한 결과만 본다 — S-11)
	// ─────────────────────────────────────────────────────────────────

	protected List<Map<String, Object>> refreshTokenRows(String email) {
		return jdbc.queryForList("""
				SELECT rt.id, rt.rotated_at, rt.revoked_at, rt.revoke_reason, rt.expires_at
				FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
				WHERE u.email = ? ORDER BY rt.id
				""", email);
	}

	/**
	 * 아직 갱신에 쓸 수 있는 리프레시 토큰의 수. 회전됐거나 폐기된 행은 세지 않는다.
	 *
	 * <p>재사용 감지 경로에서 이 값이 늘어나면 병렬 세션이 생긴 것이다 (계약 401 절).
	 */
	protected int usableRefreshTokenCount(String email) {
		Integer count = jdbc.queryForObject("""
				SELECT count(*) FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
				WHERE u.email = ? AND rt.rotated_at IS NULL AND rt.revoked_at IS NULL
				""", Integer.class, email);
		return count == null ? 0 : count;
	}

	protected int userCount(String email) {
		Integer count = jdbc.queryForObject(
				"SELECT count(*) FROM users WHERE email = ?", Integer.class, email);
		return count == null ? 0 : count;
	}
}
