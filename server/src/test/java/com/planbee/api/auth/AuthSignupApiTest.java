package com.planbee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 가입 신청 (AC-1 · AC-2 · AC-4 · AC-6 ~ AC-9 · AC-46 · 가입 IP 레이트 리밋).
 *
 * <p>앱이 막는 검증(AC-3·AC-5·AC-6)을 <b>서버가 독립적으로 다시 강제하는지</b>가 이 파일의 절반이다.
 * 앱을 우회한 요청이 도달할 수 있으므로 앱 검증은 근거가 되지 않는다 (AC-4).
 */
@AuthApiTest
class AuthSignupApiTest extends AuthApiTestBase {

	private static final String EMAIL = "newcomer@example.com";

	// ─────────────────────────────────────────────────────────────────
	// 접수
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-1 가입을 신청하면 계정이 PENDING 으로 생성되고 검토 중 화면 값을 받는다")
	void AC1_가입_신청은_PENDING_계정을_만든다() {
		signup(signupBody(EMAIL)).then().statusCode(201)
				.body("account_status.status", equalTo("PENDING"))
				.body("account_status.title", equalTo("가입 신청을 검토하고 있어요"))
				.body("account_status.body", notNullValue())
				.body("account_status.highlight.title", equalTo("승인되면 다시 로그인해 주세요"))
				.body("account_status.email", equalTo(EMAIL))
				.body("account_status.applied_at", notNullValue())
				.body("account_status.support_contact_email", equalTo(SUPPORT_EMAIL));

		Map<String, Object> stored = jdbc.queryForMap("SELECT status, role FROM users WHERE email = ?", EMAIL);
		assertThat(stored.get("status")).as("요청이 상태를 정할 수 없다").isEqualTo("PENDING");
		assertThat(stored.get("role")).isEqualTo("USER");
	}

	@Test
	@DisplayName("AC-46 가입 201 과 로그인 차단 403 은 같은 상태 스키마·같은 값을 쓴다")
	void AC46_가입_응답과_차단_응답은_같은_상태_값을_쓴다() {
		Map<String, Object> fromSignup = signup(signupBody(EMAIL)).jsonPath().getMap("account_status");

		Map<String, Object> fromLogin = login(EMAIL, PASSWORD).jsonPath().getMap("account_status");

		assertThat(fromLogin)
				.as("두 화면이 같으므로 스키마도 값도 같아야 한다 — 상태 확인용 별도 왕복을 만들지 않는다")
				.isEqualTo(fromSignup);
	}

	@Test
	@DisplayName("AC-7 선택 동의(MARKETING)를 거부해도 가입이 접수된다")
	void AC7_선택_동의를_거부해도_접수된다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("consents", allConsents(true, true, false));

		signup(body).then().statusCode(201);
	}

	@Test
	@DisplayName("AC-8 동의 3종이 항목별로 저장되고, 만 14세 확인은 동의 이력이 아니라 사용자 레코드에 남는다")
	void AC8_동의_이력이_항목별로_저장된다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("consents", allConsents(true, true, false));
		signup(body).then().statusCode(201);

		List<Map<String, Object>> consents = jdbc.queryForList("""
				SELECT c.consent_type, c.agreed, c.document_version, c.agreed_at
				FROM user_consents c JOIN users u ON u.id = c.user_id
				WHERE u.email = ? ORDER BY c.consent_type
				""", EMAIL);

		assertThat(consents).hasSize(3);
		assertThat(consents).extracting(row -> row.get("consent_type"))
				.containsExactlyInAnyOrder("TERMS", "PRIVACY", "MARKETING");
		assertThat(consents).allSatisfy(row ->
				assertThat(row.get("agreed_at")).as("동의 시각은 서버가 찍는다").isNotNull());

		Map<String, Object> marketing = consents.stream()
				.filter(row -> "MARKETING".equals(row.get("consent_type")))
				.findFirst()
				.orElseThrow();
		assertThat(marketing.get("agreed"))
				.as("거부도 이력으로 남아야 '받은 적 없음' 과 구분된다")
				.isEqualTo(false);
		assertThat(marketing.get("document_version"))
				.as("MARKETING 은 대응 문서가 없어 버전이 비어 있다")
				.isNull();

		assertThat(jdbc.queryForObject(
				"SELECT age_over_14_confirmed_at FROM users WHERE email = ?", java.sql.Timestamp.class, EMAIL))
				.as("만 14세 확인은 동의가 아니라 자기 확인이라 사용자 레코드에 남는다")
				.isNotNull();
	}

	@Test
	@DisplayName("가입 사유는 선택 항목이다 — 비어 있어도 접수된다")
	void 가입_사유가_없어도_접수된다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("signup_reason", null);

		signup(body).then().statusCode(201);
		assertThat(jdbc.queryForObject("SELECT signup_reason FROM users WHERE email = ?", String.class, EMAIL))
				.isNull();
	}

	@Test
	@DisplayName("이메일은 소문자로 정규화해 저장한다 — 대소문자만 바꾼 중복 가입을 막는다 (AC-2 우회 방지)")
	void 이메일은_정규화되어_저장된다() {
		Map<String, Object> body = signupBody("NewComer@Example.COM");

		signup(body).then().statusCode(201)
				.body("account_status.email", equalTo(EMAIL));
		assertThat(userCount(EMAIL)).isEqualTo(1);

		// 앞뒤 공백이 붙은 이메일의 처리는 이 테스트가 판정하지 않는다 — defects.md D-S1 참조.
	}

	// ─────────────────────────────────────────────────────────────────
	// 거절 (S-10 — 실패 케이스)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-2 이미 가입 신청된 이메일은 409 다 (대소문자만 다른 이메일도 같다)")
	void AC2_중복_이메일은_409_다() {
		signup(signupBody(EMAIL)).then().statusCode(201);

		signup(signupBody(EMAIL)).then().statusCode(409)
				.body("code", equalTo("AUTH_EMAIL_ALREADY_REGISTERED"));
		signup(signupBody("NEWCOMER@EXAMPLE.COM")).then().statusCode(409)
				.body("code", equalTo("AUTH_EMAIL_ALREADY_REGISTERED"));
	}

	@Test
	@DisplayName("AC-4 비밀번호 정책을 서버가 독립적으로 강제한다 (password 필드를 지목)")
	void AC4_비밀번호_정책은_서버가_강제한다() {
		assertPasswordRejected("plan26");
		assertPasswordRejected("planbeeplan");
		assertPasswordRejected("20260826");
	}

	@Test
	@DisplayName("AC-6 필수 동의를 거부하면 400 이고 consents 를 지목한다")
	void AC6_필수_동의를_거부하면_400_이다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("consents", allConsents(true, false, true));

		signup(body).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("consents"));
		assertThat(userCount(EMAIL)).isZero();
	}

	@Test
	@DisplayName("AC-6 동의 항목이 3종 모두 오지 않으면 400 이다")
	void AC6_동의_3종이_다_오지_않으면_400_이다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("consents", List.of(consent("TERMS", true, "v1.0"), consent("PRIVACY", true, "v1.0")));

		signup(body).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("consents"));
	}

	@Test
	@DisplayName("AC-6 만 14세 확인이 false 면 400 이고 age_over_14_confirmed 를 지목한다")
	void AC6_만14세_확인이_없으면_400_이다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("age_over_14_confirmed", false);

		signup(body).then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("age_over_14_confirmed"));
	}

	@Test
	@DisplayName("AC-9 가입 사유가 100자를 넘으면 400 이고 signup_reason 을 지목한다")
	void AC9_가입_사유_100자_초과는_400_이다() {
		Map<String, Object> body = signupBody(EMAIL);
		body.put("signup_reason", "가".repeat(101));

		signup(body).then().statusCode(400)
				.body("errors[0].field", equalTo("signup_reason"));

		body.put("signup_reason", "가".repeat(100));
		signup(body).then().statusCode(201);
	}

	@Test
	@DisplayName("이메일 형식이 아니면 400 이고 email 을 지목한다 (가입은 로그인과 달리 형식을 검증한다)")
	void 이메일_형식_오류는_400_이다() {
		signup(signupBody("형식이-아닌-값")).then().statusCode(400)
				.body("errors[0].field", equalTo("email"));
	}

	// ─────────────────────────────────────────────────────────────────
	// IP 레이트 리밋 — AC-2 가 인수한 계정 열거를 대량 자동화로부터 막는 장치
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("같은 IP 에서 시간당 10회를 넘기면 429 AUTH_SIGNUP_RATE_LIMITED 다")
	void 가입_레이트_리밋은_IP_기준_시간당_10회다() {
		String clientIp = "198.51.100.7";
		for (int attempt = 1; attempt <= 10; attempt++) {
			signup(signupBody("bulk" + attempt + "@example.com"), clientIp).then().statusCode(201);
		}

		signup(signupBody("bulk11@example.com"), clientIp).then().statusCode(429)
				.body("code", equalTo("AUTH_SIGNUP_RATE_LIMITED"))
				.header("Retry-After", equalTo("3600"));

		// 다른 IP 는 영향을 받지 않는다 — 사람이 손으로 가입하는 흐름에는 닿지 않는 값이다.
		signup(signupBody("someone-else@example.com"), "198.51.100.8").then().statusCode(201);
	}

	// ─────────────────────────────────────────────────────────────────

	private void assertPasswordRejected(String password) {
		Response response = signup(signupBody(EMAIL, password));

		response.then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("password"));
		assertThat(userCount(EMAIL)).isZero();
	}
}
