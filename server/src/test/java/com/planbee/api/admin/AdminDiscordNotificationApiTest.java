package com.planbee.api.admin;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.equalTo;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import com.github.tomakehurst.wiremock.verification.LoggedRequest;
import com.planbee.api.auth.AuthApiTestBase;
import com.planbee.api.support.PostgresTestContainer;
import com.planbee.api.support.TestClockConfig;

/**
 * 관리자 Discord 알림 (US-5). <b>외부 연동은 목킹한다</b> — 실제 Discord 채널로 쏘지 않는다
 * (`AGENTS.md` 테스트 계층 / server-tester).
 *
 * <p>여기서 검증하는 것은 <b>서버가 무엇을 보내려 하는가</b>다.
 *
 * <ul>
 *   <li>AC-31 — 페이로드에 개인정보가 하나도 없다. 이 결정은 국외 이전(「개인정보 보호법」
 *       제28조의8) 회피가 근거라, 이메일 한 줄이 새는 순간 가입 화면에 동의 항목이 하나 더
 *       필요해진다. 그래서 "없다" 를 문자열 단위로 확인한다.</li>
 *   <li>AC-32 — 알림의 건수가 화면의 {@code pending_approval_count} 와 같은 계산이다.</li>
 *   <li>AC-27 — 발송이 실패해도 가입은 201 이다. 발송은 커밋 이후 비동기라 응답에 섞이지 않는다.</li>
 *   <li>AC-30 — 커밋되지 않은 가입은 알리지 않는다.</li>
 * </ul>
 *
 * <p><b>운영 채널로의 실제 발송(AC-26 · AC-28)은 이 테스트의 범위가 아니다.</b>
 * {@code DISCORD_WEBHOOK_URL} 이 아직 발급되지 않았고(status.md ASK 1), 값이 채워진 뒤
 * 사람이 확인할 항목이다. 여기서는 그 자리에 WireMock 을 끼워 <b>보내려는 내용</b>만 본다.
 */
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "planbee.auth.support-contact-email=support@planbee.app")
@Import({ PostgresTestContainer.class, TestClockConfig.class })
@Tag("integration")
class AdminDiscordNotificationApiTest extends AuthApiTestBase {

	private static final String WEBHOOK_PATH = "/webhooks/planbee-test";

	/** 비동기 발송이라 응답을 기다린 시점에 아직 도착하지 않았을 수 있다. */
	private static final Duration DELIVERY_TIMEOUT = Duration.ofSeconds(5);

	@RegisterExtension
	static final WireMockExtension DISCORD = WireMockExtension.newInstance()
			.options(wireMockConfig().dynamicPort())
			.build();

	@DynamicPropertySource
	static void discordWebhookUrl(DynamicPropertyRegistry registry) {
		registry.add("planbee.admin.discord.webhook-url", () -> DISCORD.baseUrl() + WEBHOOK_PATH);
	}

	@BeforeEach
	void resetWebhook() {
		DISCORD.resetAll();
		DISCORD.stubFor(post(urlPathEqualTo(WEBHOOK_PATH)).willReturn(aResponse().withStatus(204)));
	}

	@Test
	@DisplayName("AC-31 알림 페이로드에 이메일·가입 사유·식별자·토큰이 하나도 없다")
	void AC31_알림에_개인정보가_없다() {
		String email = "applicant@example.com";
		String reason = "여행 중 일정이 자주 바뀌어서 써보고 싶어요";
		signup(signupBodyWithReason(email, reason)).then().statusCode(201);

		String payload = awaitDelivered(1).get(0).getBodyAsString();

		assertThat(payload).doesNotContain(email);
		assertThat(payload).doesNotContain("applicant");
		assertThat(payload).doesNotContain(reason);
		assertThat(payload).doesNotContain("@");
		assertThat(payload).doesNotContain("token");
		// 담는 것은 건수와 관리자 화면으로 유도하는 문구뿐이다.
		assertThat(payload).contains("검토 대기 1건");
		assertThat(payload).contains("관리자");
	}

	@Test
	@DisplayName("AC-32 알림의 건수는 화면의 pending_approval_count 와 같은 계산이다")
	void AC32_알림_건수는_화면_건수와_같다() {
		signup(signupBody("first@example.com")).then().statusCode(201);
		awaitDelivered(1);
		signup(signupBody("second@example.com")).then().statusCode(201);
		awaitDelivered(2);
		signup(signupBody("third@example.com")).then().statusCode(201);

		List<String> payloads = awaitDelivered(3).stream().map(LoggedRequest::getBodyAsString).toList();

		// 세 번의 발송이 각각 그 시점의 대기 건수를 말한다. 비동기라 도착 순서는 보장되지 않으므로
		// 순서가 아니라 "1·2·3 이 한 번씩" 을 본다.
		assertThat(payloads)
				.as("알림이 자기 쿼리를 따로 가지면 이 값이 화면과 갈린다")
				.anyMatch(payload -> payload.contains("검토 대기 1건"))
				.anyMatch(payload -> payload.contains("검토 대기 2건"))
				.anyMatch(payload -> payload.contains("검토 대기 3건"));
	}

	@Test
	@DisplayName("AC-27·AC-28 Webhook 이 오류를 내도 가입은 201 이고, 재시도는 1회까지다")
	void AC27_발송이_실패해도_가입은_접수된다() {
		DISCORD.resetAll();
		DISCORD.stubFor(post(urlPathEqualTo(WEBHOOK_PATH)).willReturn(aResponse().withStatus(500)));

		signup(signupBody("applicant@example.com")).then().statusCode(201)
				.body("account_status.status", equalTo("PENDING"));

		// 원본 시도 + 재시도 1회. 더 하면 Discord 의 레이트 리밋에 걸린다 (PRD 제약).
		awaitDelivered(2);
		assertThat(userCount("applicant@example.com"))
				.as("발송 실패가 가입 결과를 바꾸지 않는다")
				.isEqualTo(1);
	}

	@Test
	@DisplayName("AC-30 접수되지 않은 가입은 알리지 않는다 — 커밋된 신청만 알린다")
	void AC30_실패한_가입은_알리지_않는다() {
		signup(signupBody("applicant@example.com")).then().statusCode(201);
		awaitDelivered(1);

		// 같은 이메일로 다시 신청하면 계정이 만들어지지 않는다.
		signup(signupBody("applicant@example.com")).then().statusCode(409);
		// 검증에 걸린 신청도 마찬가지다.
		signup(signupBody("bad-email", PASSWORD)).then().statusCode(400);

		assertThat(deliveries())
				.as("커밋되지 않은 신청은 알림을 만들지 않는다")
				.hasSize(1);
	}

	// ─────────────────────────────────────────────────────────────────
	// 헬퍼
	// ─────────────────────────────────────────────────────────────────

	private List<LoggedRequest> awaitDelivered(int expected) {
		await().atMost(DELIVERY_TIMEOUT)
				.untilAsserted(() -> assertThat(deliveries()).hasSize(expected));
		return deliveries();
	}

	private List<LoggedRequest> deliveries() {
		return DISCORD.findAll(postRequestedFor(urlPathEqualTo(WEBHOOK_PATH)));
	}

	private static Map<String, Object> signupBodyWithReason(String email, String reason) {
		Map<String, Object> body = signupBody(email);
		body.put("signup_reason", reason);
		return body;
	}
}
