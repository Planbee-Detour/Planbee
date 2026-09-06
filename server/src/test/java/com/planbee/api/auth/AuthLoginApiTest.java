package com.planbee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.restassured.response.Response;

/**
 * 로그인 (AC-11 ~ AC-17, AC-38 ~ AC-42, AC-45, AC-47, AC-48, AC-50 의 토큰 발급분).
 *
 * <p>이 엔드포인트의 규칙은 "무엇을 구분하고 무엇을 구분하지 않는가" 다.
 * 자격 증명 실패는 계정이 있든 없든 <b>글자 하나 다르지 않아야 하고</b>(AC-12·13),
 * 잠금 응답도 마찬가지다(AC-47). 반대로 계정 상태 3종은 또렷하게 갈려야 한다(AC-14·15·16).
 * 그래서 여기서는 코드뿐 아니라 <b>응답 본문 전체가 같은지</b>를 본다.
 */
@AuthApiTest
class AuthLoginApiTest extends AuthApiTestBase {

	private static final String EMAIL = "member@example.com";
	private static final Duration LOCK_DURATION = Duration.ofMinutes(10);
	private static final int MAX_ATTEMPTS = 5;

	// ─────────────────────────────────────────────────────────────────
	// 성공과 자격 증명 실패
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-11 APPROVED 계정은 로그인에 성공하고 토큰과 계정 요약을 받는다")
	void AC11_승인된_계정은_로그인에_성공한다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		login(EMAIL, PASSWORD).then().statusCode(200)
				.body("token.token_type", equalTo("Bearer"))
				.body("token.expires_in", equalTo(1800))
				.body("token.access_token", notNullValue())
				.body("token.refresh_token", notNullValue())
				.body("user.email", equalTo(EMAIL))
				.body("user.role", equalTo("USER"))
				.body("user.status", equalTo("APPROVED"));
	}

	@Test
	@DisplayName("AC-12·AC-13 틀린 비밀번호와 미등록 이메일의 응답은 완전히 같다")
	void AC13_미등록_이메일과_틀린_비밀번호는_구분되지_않는다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		Response wrongPassword = login(EMAIL, "wrongpass123");
		Response unknownEmail = login("nobody@example.com", PASSWORD);

		wrongPassword.then().statusCode(401).body("code", equalTo("AUTH_INVALID_CREDENTIALS"));
		unknownEmail.then().statusCode(401);
		assertThat(unknownEmail.jsonPath().getMap("$"))
				.as("계정 존재 여부가 응답으로 새어 나가면 안 된다 (AC-13)")
				.isEqualTo(wrongPassword.jsonPath().getMap("$"));
	}

	@Test
	@DisplayName("AC-13 미등록 이메일에도 비밀번호 검증을 한 번 돌린다 (응답 시간으로 계정 존재가 드러나지 않게)")
	void AC13_미등록_이메일에도_더미_해시로_검증을_돌린다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		// 첫 요청은 JIT·커넥션 준비가 섞여 있어 버린다.
		login("warmup@example.com", "wrongpass123").then().statusCode(401);
		login(EMAIL, "wrongpass123").then().statusCode(401);

		// 실패 횟수가 잠금 임계값(5)에 닿지 않도록 등록 계정은 2회만 재고, 미등록은 매번 다른 키를 쓴다.
		long registered = Math.min(
				elapsedMillis(() -> login(EMAIL, "wrongpass123")),
				elapsedMillis(() -> login(EMAIL, "wrongpass123")));
		long unknown = Math.min(
				elapsedMillis(() -> login("nobody1@example.com", "wrongpass123")),
				elapsedMillis(() -> login("nobody2@example.com", "wrongpass123")));

		// 더미 해시를 돌리지 않으면 미등록 쪽은 bcrypt 한 번(수십 ms)을 통째로 건너뛴다.
		// 부하에 흔들리지 않도록 최솟값끼리, 그것도 절반이라는 넉넉한 기준으로만 비교한다.
		assertThat(unknown)
				.as("미등록 이메일만 즉시 응답하면 AC-13 이 무너진다 (등록=%dms, 미등록=%dms)", registered, unknown)
				.isGreaterThanOrEqualTo(registered / 2);
	}

	@Test
	@DisplayName("이메일은 대소문자·앞뒤 공백을 정규화해 대조한다")
	void 이메일은_정규화되어_대조된다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		login("  MEMBER@Example.COM  ", PASSWORD).then().statusCode(200);
	}

	@Test
	@DisplayName("email 이나 password 가 비면 400 이다 (형식 검증은 하지 않는다)")
	void 빈_입력은_400_이고_형식_오류는_401_이다() {
		json().body(Map.of("email", "", "password", PASSWORD)).post("/api/v1/auth/login")
				.then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));

		// 형식이 틀린 이메일을 400 으로 갈라내면 미등록 계정과 응답이 달라진다 (AC-13).
		login("형식이-아닌-값", PASSWORD).then().statusCode(401)
				.body("code", equalTo("AUTH_INVALID_CREDENTIALS"));
	}

	// ─────────────────────────────────────────────────────────────────
	// 계정 상태 3종 (AC-14 · AC-15 · AC-16) + 문의 주소 (AC-38 ~ AC-42, AC-45)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-14·AC-40 PENDING 계정은 403 과 검토 중 화면 값을 받는다")
	void AC14_PENDING_계정은_403_이다() {
		registerUser(EMAIL);

		login(EMAIL, PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_PENDING"))
				.body("account_status.status", equalTo("PENDING"))
				.body("account_status.title", equalTo("가입 신청을 검토하고 있어요"))
				.body("account_status.highlight.title", equalTo("승인되면 다시 로그인해 주세요"))
				.body("account_status.email", equalTo(EMAIL))
				.body("account_status.applied_at", notNullValue())
				.body("account_status.support_contact_email", equalTo(SUPPORT_EMAIL))
				.body("deletion_token", nullValue());
	}

	@Test
	@DisplayName("AC-15·AC-38·AC-50 REJECTED 계정은 403 과 함께 삭제 전용 토큰을 받는다")
	void AC15_REJECTED_계정은_삭제_토큰을_함께_받는다() {
		registerUser(EMAIL, UserStatus.REJECTED);

		login(EMAIL, PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_REJECTED"))
				.body("account_status.status", equalTo("REJECTED"))
				.body("account_status.title", equalTo("가입이 승인되지 않았어요"))
				.body("account_status.support_contact_email", equalTo(SUPPORT_EMAIL))
				.body("deletion_token", notNullValue())
				.body("deletion_token_expires_in", equalTo(600));
	}

	@Test
	@DisplayName("AC-16·AC-39 SUSPENDED 계정은 403 이고 삭제 토큰이 실리지 않는다 (정지 회피 차단)")
	void AC16_SUSPENDED_계정에는_삭제_토큰이_없다() {
		registerUser(EMAIL, UserStatus.SUSPENDED);

		login(EMAIL, PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_SUSPENDED"))
				.body("account_status.status", equalTo("SUSPENDED"))
				.body("account_status.title", equalTo("이용이 정지된 계정이에요"))
				.body("account_status.support_contact_email", equalTo(SUPPORT_EMAIL))
				.body("deletion_token", nullValue());
	}

	@Test
	@DisplayName("AC-42·AC-45 문의 주소는 서버 설정값이고 단수 문자열 하나다")
	void AC45_문의_주소는_단수_문자열이다() {
		registerUser(EMAIL);

		Object contact = login(EMAIL, PASSWORD).jsonPath().get("account_status.support_contact_email");

		assertThat(contact).isInstanceOf(String.class).isEqualTo(SUPPORT_EMAIL);
	}

	// ─────────────────────────────────────────────────────────────────
	// 로그인 실패 잠금 (AC-17 · AC-41 · AC-47 · AC-48)
	// ─────────────────────────────────────────────────────────────────

	@Test
	@DisplayName("AC-17·AC-41 10분 안에 5회 실패하면 올바른 비밀번호로도 429 이고 남은 시간과 문의 주소가 온다")
	void AC17_5회_실패하면_10분간_잠긴다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		failLogin(EMAIL, MAX_ATTEMPTS);

		Response response = login(EMAIL, PASSWORD);

		response.then().statusCode(429)
				.header("Retry-After", equalTo(String.valueOf(LOCK_DURATION.toSeconds())))
				.body("code", equalTo("AUTH_LOGIN_LOCKED"))
				.body("lock_remaining_minutes", equalTo(10))
				.body("support_contact_email", equalTo(SUPPORT_EMAIL));
	}

	@Test
	@DisplayName("AC-47 미등록 이메일도 같은 규칙으로 잠기고 응답이 완전히 같다")
	void AC47_미등록_이메일도_같은_잠금_응답을_받는다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		failLogin(EMAIL, MAX_ATTEMPTS);
		Response registered = login(EMAIL, PASSWORD);

		String unknownEmail = "nobody@example.com";
		failLogin(unknownEmail, MAX_ATTEMPTS);
		Response unknown = login(unknownEmail, PASSWORD);

		registered.then().statusCode(429);
		unknown.then().statusCode(429);
		assertThat(unknown.jsonPath().getMap("$"))
				.as("잠금 여부로 계정 존재를 구분할 수 없어야 한다 (AC-47)")
				.isEqualTo(registered.jsonPath().getMap("$"));
	}

	@Test
	@DisplayName("AC-48 잠금 중의 재시도는 잠금을 연장하지 않고 남은 시간만 줄어든다")
	void AC48_잠금_중_재시도는_잠금을_연장하지_않는다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		failLogin(EMAIL, MAX_ATTEMPTS);

		// 잠긴 뒤 더 틀려 본다. 카운터에 들어가면 잠금이 뒤로 밀린다.
		failLogin(EMAIL, 3);
		clock.advance(Duration.ofMinutes(5));

		login(EMAIL, PASSWORD).then().statusCode(429)
				.body("lock_remaining_minutes", equalTo(5));
	}

	@Test
	@DisplayName("AC-17 잠금이 풀리면 다시 로그인할 수 있다")
	void AC17_잠금은_시간이_지나면_풀린다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		failLogin(EMAIL, MAX_ATTEMPTS);

		clock.advance(LOCK_DURATION);

		login(EMAIL, PASSWORD).then().statusCode(200);
	}

	@Test
	@DisplayName("남은 잠금 시간은 올림하고 최소 1분을 보장한다 (Retry-After 는 올림하지 않은 실제 초)")
	void 남은_잠금_시간은_올림하고_최소_1분이다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		failLogin(EMAIL, MAX_ATTEMPTS);

		clock.advance(LOCK_DURATION.minusSeconds(30));

		login(EMAIL, PASSWORD).then().statusCode(429)
				.body("lock_remaining_minutes", equalTo(1))
				.header("Retry-After", equalTo("30"));
	}

	@Test
	@DisplayName("로그인에 성공하면 실패 카운터가 초기화된다")
	void 로그인_성공은_실패_카운터를_초기화한다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		failLogin(EMAIL, MAX_ATTEMPTS - 1);
		login(EMAIL, PASSWORD).then().statusCode(200);
		failLogin(EMAIL, MAX_ATTEMPTS - 1);

		login(EMAIL, PASSWORD).then().statusCode(200);
	}

	@Test
	@DisplayName("실패가 10분 창을 벗어나면 이어서 세지 않는다 (연속 5회의 '연속' 을 창이 정의한다)")
	void 창을_벗어난_실패는_누적되지_않는다() {
		registerUser(EMAIL, UserStatus.APPROVED);

		failLogin(EMAIL, MAX_ATTEMPTS - 1);
		clock.advance(Duration.ofMinutes(11));
		failLogin(EMAIL, MAX_ATTEMPTS - 1);

		login(EMAIL, PASSWORD).then().statusCode(200);
	}

	// ─────────────────────────────────────────────────────────────────

	private void failLogin(String email, int times) {
		for (int attempt = 0; attempt < times; attempt++) {
			login(email, "wrongpass123");
		}
	}

	private long elapsedMillis(Runnable action) {
		long startedAt = System.nanoTime();
		action.run();
		return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
	}
}
