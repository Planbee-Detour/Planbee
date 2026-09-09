package com.planbee.api.admin.notification;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.StringUtils;

/**
 * 관리자 알림용 Discord Incoming Webhook 설정. (US-5 / AC-26 ~ AC-32)
 *
 * <p><b>{@code webhookUrl} 이 비어 있는 것이 정상 동작이다</b> (AC-29). 값이 없으면 발송을
 * 건너뛰고 서버는 그대로 뜬다. 그래서 {@code RequiredEnvironmentCheck.REQUIRED} 에 넣지 않고
 * 설정에 빈 기본값을 둔다 — S-28 이 허용하는 예외다. {@code @NotBlank} 를 걸지 않는 것도 같은 이유다.
 *
 * <p>값 자체는 시크릿이다 (C-4). 환경 변수 {@code DISCORD_WEBHOOK_URL} 로만 주입하고
 * 설정 파일·문서·커밋 어디에도 적지 않는다. URL 안에 토큰이 들어 있어 아는 사람은 누구나
 * 그 채널에 글을 쓸 수 있다.
 */
@ConfigurationProperties(prefix = "planbee.admin.discord")
public record DiscordWebhookProperties(
		@DefaultValue("") String webhookUrl,
		@DefaultValue("2s") Duration connectTimeout,
		@DefaultValue("4s") Duration readTimeout) {

	/** 발송할 곳이 설정돼 있는가. 아니면 알림을 조용히 건너뛴다 (AC-29). */
	public boolean configured() {
		return StringUtils.hasText(webhookUrl);
	}
}
