package com.planbee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.planbee.api.support.PostgresTestContainer;
import com.planbee.api.support.TestClockConfig;

/**
 * 문의 주소 설정값이 <b>비어 있는</b> 서버 (AC-43 · AC-44).
 *
 * <p>이 상태는 오류가 아니라 <b>정상 동작</b>이다 — 문의 창구를 아직 정하지 못했다는 이유로
 * 서버가 뜨지 않거나 화면이 막히면 안 된다 (`server.md` S-28). 그래서 별도 컨텍스트를 띄워
 * "주소만 빠지고 나머지는 그대로" 를 확인한다.
 */
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "planbee.auth.support-contact-email=")
@Import({ PostgresTestContainer.class, TestClockConfig.class })
@Tag("integration")
class AuthSupportContactUnavailableApiTest extends AuthApiTestBase {

	private static final String EMAIL = "waiting@example.com";

	@Test
	@DisplayName("AC-43·AC-44 주소가 없어도 가입 응답은 정상이고 나머지 값은 그대로 온다")
	void AC43_주소가_없어도_가입_응답은_정상이다() {
		signup(signupBody(EMAIL)).then().statusCode(201)
				.body("account_status.title", equalTo("가입 신청을 검토하고 있어요"))
				.body("account_status.body", notNullValue())
				.body("account_status.highlight.title", notNullValue())
				.body("account_status.email", equalTo(EMAIL))
				.body("account_status.support_contact_email", nullValue());
	}

	@Test
	@DisplayName("AC-43·AC-44 주소가 없어도 상태 안내 403 은 화면을 그릴 값을 모두 담는다")
	void AC44_주소가_없어도_상태_화면이_성립한다() {
		registerUser(EMAIL);

		Map<String, Object> status = login(EMAIL, PASSWORD).then().statusCode(403)
				.body("code", equalTo("AUTH_ACCOUNT_PENDING"))
				.extract().jsonPath().getMap("account_status");

		assertThat(status)
				.as("주소만 비고 화면을 그리는 나머지 값은 전부 있어야 한다")
				.containsKey("support_contact_email")
				.containsEntry("support_contact_email", null);
		assertThat(status.get("title")).isNotNull();
		assertThat(status.get("body")).isNotNull();
		assertThat(status.get("highlight")).isNotNull();
		assertThat(status.get("applied_at")).isNotNull();
	}

	@Test
	@DisplayName("AC-41·AC-43 주소가 없어도 잠금 응답은 남은 시간을 그대로 담는다")
	void AC43_주소가_없어도_잠금_응답은_정상이다() {
		registerUser(EMAIL, UserStatus.APPROVED);
		for (int attempt = 0; attempt < 5; attempt++) {
			login(EMAIL, "wrongpass123");
		}

		login(EMAIL, PASSWORD).then().statusCode(429)
				.body("code", equalTo("AUTH_LOGIN_LOCKED"))
				.body("lock_remaining_minutes", equalTo(10))
				.body("support_contact_email", nullValue());
	}
}
