package com.planbee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 토큰 갱신 (AC-20 · AC-22 ~ AC-25 · AC-26 · AC-49).
 *
 * <p>이 파일의 절반은 <b>유예 창</b>에 관한 것이다. 계약이 정한 판정 근거는 하나뿐이다 —
 * "서버가 직전 응답을 캐시하고 있는가". 캐시가 있으면 같은 쌍을 돌려주고(AC-49), 없으면
 * 유예 창 안이라도 재사용으로 처리한다(AC-23·24). 시각만으로 판정하면 이 구분이 무너진다.
 *
 * <p>폐기가 <b>DB 에 남았는지</b>까지 보는 이유: 폐기 UPDATE 와 401 예외가 같은 트랜잭션에
 * 있으면 예외가 폐기를 되돌려 응답만 맞고 다른 기기는 계속 갱신된다. 상태 코드만 보면
 * 그 결함을 잡지 못한다 (`defects.md` D-3, `server.md` S-17).
 */
@AuthApiTest
class AuthRefreshApiTest extends AuthApiTestBase {

	private static final String EMAIL = "session@example.com";
	private static final Duration GRACE_WINDOW = Duration.ofSeconds(10);
	private static final Duration REFRESH_TTL = Duration.ofDays(14);

	// ─────────────────────────────────────────────────────────────────
	// 정상 회전
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-20·AC-22 저장된 리프레시 토큰으로 갱신하면 새 토큰 쌍을 받는다")
	void AC22_갱신에_성공하면_새_토큰_쌍을_받는다() {
		String first = refreshToken(loginApproved(EMAIL));

		Response response = refresh(first);

		response.then().statusCode(200)
				.body("token_type", equalTo("Bearer"))
				.body("expires_in", equalTo(1800))
				.body("access_token", not(emptyString()));
		assertThat(response.jsonPath().getString("refresh_token"))
				.as("회전이므로 새 리프레시 토큰이 나와야 한다")
				.isNotEqualTo(first);

		List<Map<String, Object>> rows = refreshTokenRows(EMAIL);
		assertThat(rows).hasSize(2);
		assertThat(rows.get(0).get("rotated_at")).as("직전 토큰은 회전 표시가 찍힌다").isNotNull();
		assertThat(rows.get(1).get("rotated_at")).as("새 토큰은 아직 살아 있다").isNull();
	}

	@Test
	@DisplayName("AC-25 회전할 때마다 새 14일이 부여된다 (유휴 만료 · 절대 상한 없음)")
	void AC25_리프레시_수명은_회전마다_새로_부여된다() {
		String first = refreshToken(loginApproved(EMAIL));

		clock.advance(Duration.ofDays(13));
		String second = refresh(first).then().statusCode(200).extract().jsonPath().getString("refresh_token");

		// 절대 만료가 있었다면 로그인 후 26일째인 이 시점에 실패한다.
		clock.advance(Duration.ofDays(13));
		refresh(second).then().statusCode(200);
	}

	@Test
	@DisplayName("AC-25 마지막 사용에서 14일이 지나면 AUTH_REFRESH_TOKEN_EXPIRED 다")
	void AC25_유휴_14일이_지나면_401_EXPIRED_다() {
		String token = refreshToken(loginApproved(EMAIL));

		clock.advance(REFRESH_TTL.plusSeconds(1));

		refresh(token).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_EXPIRED"));
	}

	// ─────────────────────────────────────────────────────────────────
	// 유예 창 — 캐시가 있는 경우 (AC-49)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-49 유예 창 안 + 캐시 있음 → 직전과 동일한 토큰 쌍을 다시 받는다")
	void AC49_유예_창_안의_재시도는_같은_토큰_쌍을_돌려준다() {
		String first = refreshToken(loginApproved(EMAIL));
		Response rotated = refresh(first);
		rotated.then().statusCode(200);

		clock.advance(Duration.ofSeconds(5));
		Response replayed = refresh(first);

		replayed.then().statusCode(200);
		assertThat(replayed.jsonPath().getString("refresh_token"))
				.isEqualTo(rotated.jsonPath().getString("refresh_token"));
		assertThat(replayed.jsonPath().getString("access_token"))
				.isEqualTo(rotated.jsonPath().getString("access_token"));

		assertThat(refreshTokenRows(EMAIL))
				.as("재생 응답은 새 토큰을 만들지 않는다 — 만들면 재시도마다 유효 토큰이 늘어난다")
				.hasSize(2);
		assertThat(usableRefreshTokenCount(EMAIL)).isEqualTo(1);
	}

	@Test
	@DisplayName("AC-49 재생 응답이 유예 창을 연장하지 않는다 (만료는 최초 회전 시각 + 10초 고정)")
	void AC49_재생은_유예_창을_연장하지_않는다() {
		String first = refreshToken(loginApproved(EMAIL));
		refresh(first).then().statusCode(200);

		clock.advance(Duration.ofSeconds(8));
		refresh(first).then().statusCode(200);

		// 재생이 창을 연장했다면 이 시점(회전 후 11초)에도 200 이 나온다.
		clock.advance(Duration.ofSeconds(3));
		refresh(first).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REUSED"));
	}

	// ─────────────────────────────────────────────────────────────────
	// 유예 창 — 캐시가 없는 경우 (닫히는 쪽으로 실패한다)
	//
	// server-reviewer 가 "정적 리뷰로는 판정할 수 없다" 고 지목한 두 항목이 여기 있다.
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-23·AC-24 유예 창 안이라도 직전 응답이 사라졌으면 재사용이고, 폐기가 DB 에 남는다")
	void AC23_유예_창_안이라도_캐시가_없으면_재사용으로_처리된다() {
		String first = refreshToken(loginApproved(EMAIL));
		String second = refresh(first).then().statusCode(200).extract().jsonPath().getString("refresh_token");

		// 재기동 · 캐시 정리 · 다른 인스턴스. 시각은 그대로라 여전히 유예 창 "안" 이다.
		clock.advance(Duration.ofSeconds(3));
		forgetGraceWindowCache();

		refresh(first).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REUSED"));

		// 401 예외가 폐기 UPDATE 를 함께 되돌리면 여기가 깨진다 — 상태 코드만 봐서는 드러나지 않는다.
		assertThat(refreshTokenRows(EMAIL))
				.allSatisfy(row -> {
					assertThat(row.get("revoked_at")).as("계정의 모든 리프레시가 폐기되어야 한다").isNotNull();
					assertThat(row.get("revoke_reason")).isEqualTo("REUSE_DETECTED");
				});

		// 폐기가 실제로 커밋됐다면 다른 기기의 후속 토큰도 더 이상 갱신되지 않는다 (AC-24).
		refresh(second).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REVOKED"));
	}

	@Test
	@DisplayName("AC-24 재사용 401 경로에서 새 토큰이 발급되지 않는다 (유효 리프레시가 늘지 않는다)")
	void AC24_재사용_경로는_유효한_리프레시를_늘리지_않는다() {
		String first = refreshToken(loginApproved(EMAIL));
		refresh(first).then().statusCode(200);
		assertThat(usableRefreshTokenCount(EMAIL)).isEqualTo(1);

		forgetGraceWindowCache();
		refresh(first).then().statusCode(401);

		assertThat(refreshTokenRows(EMAIL))
				.as("이 경로에서 새 토큰 쌍을 발급하면 병렬 세션이 생긴다")
				.hasSize(2);
		assertThat(usableRefreshTokenCount(EMAIL))
				.as("전 기기 폐기 뒤에는 쓸 수 있는 리프레시가 하나도 없어야 한다")
				.isZero();
	}

	@Test
	@DisplayName("AC-23 유예 창 밖의 재사용은 401 AUTH_REFRESH_TOKEN_REUSED 다")
	void AC23_유예_창_밖의_재사용은_거부된다() {
		String first = refreshToken(loginApproved(EMAIL));
		refresh(first).then().statusCode(200);

		clock.advance(GRACE_WINDOW.plusSeconds(1));

		refresh(first).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REUSED"));
		assertThat(usableRefreshTokenCount(EMAIL)).isZero();
	}

	@Test
	@DisplayName("AC-24 재사용이 감지되면 같은 계정의 다른 기기도 거부된다")
	void AC24_재사용_감지는_다른_기기의_세션도_끊는다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		String deviceA = refreshToken(login(EMAIL, PASSWORD));
		String deviceB = refreshToken(login(EMAIL, PASSWORD));

		refresh(deviceA).then().statusCode(200);
		clock.advance(GRACE_WINDOW.plusSeconds(1));
		refresh(deviceA).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REUSED"));

		refresh(deviceB).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REVOKED"));
	}

	// ─────────────────────────────────────────────────────────────────
	// 판정 순서와 실패 케이스
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("재사용 판정이 계정 상태 확인보다 먼저 선다 — 정지 계정의 재사용도 403 이 아니라 401 이다")
	void 재사용_판정은_계정_상태보다_먼저_선다() {
		String first = refreshToken(loginApproved(EMAIL));
		refresh(first).then().statusCode(200);
		jdbc.update("UPDATE users SET status = ? WHERE email = ?", UserStatus.SUSPENDED.name(), EMAIL);

		clock.advance(GRACE_WINDOW.plusSeconds(1));

		refresh(first).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_REUSED"));
	}

	@Test
	@DisplayName("AC-16 갱신 시점에 정지된 계정은 403 과 account_status 를 받는다")
	void AC16_갱신_시점의_계정_상태가_반영된다() {
		String token = refreshToken(loginApproved(EMAIL));
		jdbc.update("UPDATE users SET status = ? WHERE email = ?", UserStatus.SUSPENDED.name(), EMAIL);

		refresh(token).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_SUSPENDED"))
				.body("account_status.status", equalTo("SUSPENDED"))
				.body("account_status.title", equalTo("이용이 정지된 계정이에요"));
	}

	@Test
	@DisplayName("알 수 없는 리프레시 토큰은 401 AUTH_REFRESH_TOKEN_INVALID 다")
	void 알_수_없는_토큰은_401_INVALID_다() {
		refresh("존재하지-않는-토큰").then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_INVALID"));
	}

	@Test
	@DisplayName("AC-26 로그아웃으로 폐기된 토큰은 401 AUTH_REFRESH_TOKEN_INVALID 다 (보안 배너가 아니다)")
	void AC26_로그아웃된_토큰은_401_INVALID_다() {
		Response loginResponse = loginApproved(EMAIL);
		logout(accessToken(loginResponse), refreshToken(loginResponse)).then().statusCode(204);

		refresh(refreshToken(loginResponse)).then().statusCode(401)
				.body("code", equalTo("AUTH_REFRESH_TOKEN_INVALID"));
	}

	@Test
	@DisplayName("refresh_token 이 비면 400 VALIDATION_FAILED 다")
	void 빈_리프레시_토큰은_400_이다() {
		json().body(Map.of("refresh_token", "")).post("/api/v1/auth/token/refresh")
				.then().statusCode(400)
				.body("code", equalTo("VALIDATION_FAILED"))
				.body("errors[0].field", equalTo("refresh_token"));
	}
}
