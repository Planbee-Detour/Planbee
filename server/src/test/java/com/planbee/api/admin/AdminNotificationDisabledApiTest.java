package com.planbee.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.planbee.api.admin.notification.DiscordWebhookProperties;

/**
 * Discord Webhook URL 이 <b>설정되지 않은</b> 환경 (AC-29).
 *
 * <p><b>미설정이 정상 동작이다.</b> 값이 없으면 발송을 건너뛰고 서버는 그대로 뜬다.
 * {@code RequiredEnvironmentCheck.REQUIRED} 에 넣지 않았고 설정은 {@code ${DISCORD_WEBHOOK_URL:}}
 * 로 참조만 한다 (C-4 / S-28). 이 테스트 컨텍스트가 그 상태 그대로다 — 어디에서도 값을 주입하지 않는다.
 *
 * <p>실제 발송(AC-26 · AC-28)은 여기서 보지 않는다. 목킹한 발송은
 * {@code AdminDiscordNotificationApiTest} 가 보고, <b>운영 채널로의 실제 발송은 사람이
 * {@code DISCORD_WEBHOOK_URL} 을 채운 뒤 확인할 항목</b>이다 (status.md ASK 1).
 */
@AdminApiTest
class AdminNotificationDisabledApiTest extends AdminApiTestBase {

	@Autowired
	DiscordWebhookProperties discordWebhookProperties;

	@Test
	@DisplayName("AC-29 Webhook URL 이 없어도 서버는 기동해 있고 가입은 201 로 접수된다")
	void AC29_URL_이_없어도_가입은_정상_접수된다() {
		assertThat(discordWebhookProperties.configured())
				.as("이 컨텍스트는 URL 미설정 상태여야 한다 — 그것이 로컬의 기본값이다")
				.isFalse();

		signup(signupBody("applicant@example.com")).then().statusCode(201)
				.body("account_status.status", equalTo("PENDING"));
		signup(signupBody("second@example.com")).then().statusCode(201);

		// 발송을 건너뛰었을 뿐 가입 자체는 무엇도 달라지지 않는다.
		pending(adminToken).then().statusCode(200)
				.body("items.email", contains("second@example.com", "applicant@example.com"))
				.body("pending_approval_count", equalTo(2));
		getMe(adminToken).then().statusCode(200).body("pending_approval_count", equalTo(2));
	}

	@Test
	@DisplayName("AC-29 발송을 건너뛴 뒤에도 관리자 엔드포인트가 그대로 동작한다 — 죽지 않는다")
	void AC29_발송을_건너뛴_뒤에도_서버가_정상이다() {
		long applicant = registerPending("applicant@example.com");

		approve(adminToken, applicant).then().statusCode(200);

		json().get("/api/v1/health").then().statusCode(200);
		processed(adminToken).then().statusCode(200);
	}
}
