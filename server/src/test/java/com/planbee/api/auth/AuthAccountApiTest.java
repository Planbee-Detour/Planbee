package com.planbee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 내 계정 · 로그아웃 · 계정 삭제 (AC-26 · AC-29 ~ AC-32 · AC-35 의 조회분 · AC-50).
 *
 * <p>삭제는 <b>되돌릴 수 없다.</b> 그래서 서버 쪽 안전장치가 실제로 서 있는지가 핵심이다 —
 * 비밀번호 재확인(AC-29), 그리고 삭제 전용 토큰이 삭제 외에는 아무것도 못 한다는 것(AC-50).
 */
@AuthApiTest
class AuthAccountApiTest extends AuthApiTestBase {

	private static final String EMAIL = "owner@example.com";

	// ─────────────────────────────────────────────────────────────────
	// 조회 · 권한
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-35 로그인한 계정은 설정 화면의 계정 카드 값을 조회할 수 있다")
	void 내_계정을_조회한다() {
		String token = accessToken(loginApproved(EMAIL));

		getMe(token).then().statusCode(200)
				.body("email", equalTo(EMAIL))
				.body("role", equalTo("USER"))
				.body("status", equalTo("APPROVED"));
	}

	@Test
	@DisplayName("토큰이 없거나 무효하면 401 UNAUTHORIZED 다 (기본 정책은 거부)")
	void 인증_없는_계정_조회는_401_이다() {
		json().get("/api/v1/auth/me").then().statusCode(401)
				.body("code", equalTo("UNAUTHORIZED"));

		getMe("eyJhbGciOiJIUzI1NiJ9.not-a-real-token.signature").then().statusCode(401)
				.body("code", equalTo("UNAUTHORIZED"));
	}

	@Test
	@DisplayName("AC-22 액세스 토큰의 수명은 30분이고, 지나면 401 이다 (앱이 갱신에 들어가는 지점)")
	void 액세스_토큰은_30분_뒤_만료된다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		// 35분 전에 로그인한 것으로 만든다 — 토큰의 exp 가 이미 지난 상태가 된다.
		clock.rewind(Duration.ofMinutes(35));
		String expired = accessToken(login(EMAIL, PASSWORD));
		clock.resetToNow();

		getMe(expired).then().statusCode(401).body("code", equalTo("UNAUTHORIZED"));
		getMe(accessToken(login(EMAIL, PASSWORD))).then().statusCode(200);
	}

	// ─────────────────────────────────────────────────────────────────
	// 로그아웃 (AC-26)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-26 로그아웃은 그 기기의 리프레시 토큰만 폐기한다")
	void AC26_로그아웃은_다른_기기를_건드리지_않는다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		Response deviceA = login(EMAIL, PASSWORD);
		Response deviceB = login(EMAIL, PASSWORD);

		logout(accessToken(deviceA), refreshToken(deviceA)).then().statusCode(204);

		refresh(refreshToken(deviceA)).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_INVALID"));
		refresh(refreshToken(deviceB)).then().statusCode(200);
	}

	@Test
	@DisplayName("AC-26 로그아웃은 멱등이다 — 알 수 없는 토큰이 와도 204 다 (유효 여부를 알려주지 않는다)")
	void AC26_로그아웃은_멱등이다() {
		Response session = loginApproved(EMAIL);

		logout(accessToken(session), refreshToken(session)).then().statusCode(204);
		logout(accessToken(session), refreshToken(session)).then().statusCode(204);
		logout(accessToken(session), "존재하지-않는-토큰").then().statusCode(204);
	}

	@Test
	@DisplayName("로그아웃에는 인증이 필요하다")
	void 인증_없는_로그아웃은_401_이다() {
		json().body(Map.of("refresh_token", "아무값")).post("/api/v1/auth/logout")
				.then().statusCode(401).body("code", equalTo("UNAUTHORIZED"));
	}

	// ─────────────────────────────────────────────────────────────────
	// 계정 삭제 (AC-29 ~ AC-32)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-29 비밀번호를 빼먹으면 400 이고 삭제되지 않는다")
	void AC29_비밀번호가_없으면_삭제되지_않는다() {
		String token = accessToken(loginApproved(EMAIL));

		json().header("Authorization", "Bearer " + token)
				.body(Map.of("password", ""))
				.delete("/api/v1/auth/me")
				.then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));

		assertThat(userCount(EMAIL)).isEqualTo(1);
	}

	@Test
	@DisplayName("AC-29 비밀번호가 틀리면 401 AUTH_PASSWORD_MISMATCH 이고 삭제되지 않는다")
	void AC29_비밀번호가_틀리면_삭제되지_않는다() {
		String token = accessToken(loginApproved(EMAIL));

		deleteMe(token, "wrongpass123").then().statusCode(401)
				.body("code", equalTo("AUTH_PASSWORD_MISMATCH"));

		assertThat(userCount(EMAIL)).isEqualTo(1);
	}

	@Test
	@DisplayName("AC-31·AC-32 삭제하면 즉시 파기되고, 이후 로그인은 미등록 계정과 같은 응답이며 재가입이 된다")
	void AC31_삭제는_즉시_파기다() {
		Response session = loginApproved(EMAIL);

		deleteMe(accessToken(session), PASSWORD).then().statusCode(204);

		assertThat(userCount(EMAIL)).isZero();
		assertThat(refreshTokenRows(EMAIL)).as("리프레시 토큰도 함께 사라진다").isEmpty();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_consents", Integer.class))
				.as("동의 이력도 유예 없이 파기한다 (개인정보보호법 제21조)")
				.isZero();

		Response afterDelete = login(EMAIL, PASSWORD);
		Response unknownEmail = login("nobody@example.com", PASSWORD);
		afterDelete.then().statusCode(401).body("code", equalTo("AUTH_INVALID_CREDENTIALS"));
		assertThat(afterDelete.jsonPath().getMap("$"))
				.as("삭제된 계정은 미등록 계정과 구분되지 않아야 한다 (AC-31)")
				.isEqualTo(unknownEmail.jsonPath().getMap("$"));

		// AC-32 — 같은 이메일로 다시 신청할 수 있다.
		signup(signupBody(EMAIL)).then().statusCode(201);
	}

	// ─────────────────────────────────────────────────────────────────
	// 삭제 전용 토큰 (AC-50)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-50 REJECTED 로그인 403 에 실린 삭제 토큰으로 계정을 지울 수 있다")
	void AC50_거절된_계정은_삭제_토큰으로_스스로_지울_수_있다() {
		registerUser(EMAIL, UserStatus.REJECTED);
		String deletionToken = login(EMAIL, PASSWORD).jsonPath().getString("deletion_token");

		deleteMe(deletionToken, PASSWORD).then().statusCode(204);

		assertThat(userCount(EMAIL)).isZero();
		login(EMAIL, PASSWORD).then().statusCode(401)
				.body("code", equalTo("AUTH_INVALID_CREDENTIALS"));
	}

	@Test
	@DisplayName("AC-50 삭제 토큰은 삭제 외에는 아무것도 못 한다 — 다른 엔드포인트는 403 FORBIDDEN")
	void AC50_삭제_토큰은_다른_엔드포인트에서_403_이다() {
		registerUser(EMAIL, UserStatus.REJECTED);
		String deletionToken = login(EMAIL, PASSWORD).jsonPath().getString("deletion_token");

		getMe(deletionToken).then().statusCode(403).body("code", equalTo("FORBIDDEN"));
		logout(deletionToken, "아무값").then().statusCode(403).body("code", equalTo("FORBIDDEN"));
	}

	@Test
	@DisplayName("AC-50 삭제 토큰도 비밀번호 재확인을 건너뛰지 못한다")
	void AC50_삭제_토큰에도_비밀번호_재확인이_필요하다() {
		registerUser(EMAIL, UserStatus.REJECTED);
		String deletionToken = login(EMAIL, PASSWORD).jsonPath().getString("deletion_token");

		deleteMe(deletionToken, "wrongpass123").then().statusCode(401)
				.body("code", equalTo("AUTH_PASSWORD_MISMATCH"));
		assertThat(userCount(EMAIL)).isEqualTo(1);
	}

	@Test
	@DisplayName("AC-50 삭제 토큰의 수명은 10분이고, 지나면 더 이상 삭제에 쓸 수 없다")
	void AC50_삭제_토큰은_10분_뒤_만료된다() {
		registerUser(EMAIL, UserStatus.REJECTED);

		clock.rewind(Duration.ofMinutes(15));
		String expired = login(EMAIL, PASSWORD).jsonPath().getString("deletion_token");
		clock.resetToNow();

		deleteMe(expired, PASSWORD).then().statusCode(401).body("code", equalTo("UNAUTHORIZED"));
		assertThat(userCount(EMAIL)).isEqualTo(1);
	}

	@Test
	@DisplayName("AC-28·AC-50 일반 세션 토큰과 삭제 전용 토큰이 같은 엔드포인트에 모두 도달한다")
	void AC50_두_종류의_토큰이_모두_삭제에_쓰인다() {
		// ① 설정 화면 경로 — 일반 액세스 토큰
		Response session = loginApproved(EMAIL);
		deleteMe(accessToken(session), PASSWORD).then().statusCode(204);

		// ② 상태 화면 경로 — 삭제 전용 토큰
		String rejected = "rejected@example.com";
		registerUser(rejected, UserStatus.REJECTED);
		String deletionToken = login(rejected, PASSWORD).jsonPath().getString("deletion_token");
		deleteMe(deletionToken, PASSWORD).then().statusCode(204);

		assertThat(userCount(EMAIL)).isZero();
		assertThat(userCount(rejected)).isZero();
	}
}
