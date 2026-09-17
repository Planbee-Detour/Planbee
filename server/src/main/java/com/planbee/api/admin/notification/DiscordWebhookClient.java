package com.planbee.api.admin.notification;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Discord Incoming Webhook 발송. (S-31 — 외부 HTTP 클라이언트는 도메인 패키지 안에 둔다)
 *
 * <p><b>실패해도 예외를 밖으로 내지 않는다.</b> 이 발송은 가입 트랜잭션이 커밋된 뒤에 일어나고
 * (AC-27 · AC-30) 실패가 가입 결과를 바꿔서는 안 된다. 실패는 경고 로그로만 남기고
 * <b>재시도는 1회까지</b> 한다 (AC-28) — 더 하면 Discord 의 레이트 리밋에 걸린다.
 *
 * <p>보낼 곳이 설정돼 있지 않으면 아무 일도 하지 않는다 (AC-29).
 */
@Component
public class DiscordWebhookClient {

	private static final Logger log = LoggerFactory.getLogger(DiscordWebhookClient.class);

	/** 원본 시도 + 재시도 1회. */
	private static final int MAX_ATTEMPTS = 2;

	private final DiscordWebhookProperties properties;
	private final RestClient restClient;

	public DiscordWebhookClient(DiscordWebhookProperties properties) {
		this.properties = properties;

		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(properties.connectTimeout());
		factory.setReadTimeout(properties.readTimeout());
		this.restClient = RestClient.builder().requestFactory(factory).build();
	}

	/**
	 * 메시지를 보낸다.
	 *
	 * @param content 보낼 문장. <b>개인정보를 담지 않는다</b> (AC-26 · AC-31) —
	 *                이메일·가입 사유·식별자·토큰 어느 것도 넣지 않는다. 그렇게 정한 이유는
	 *                국외 이전(「개인정보 보호법」 제28조의8) 회피이며, 개인정보를 실으면
	 *                가입 화면에 동의 항목이 하나 더 필요해진다. 이 제약을 지키는 책임은
	 *                <b>호출부</b>에 있다 — 이 클래스는 받은 문자열을 그대로 보낸다
	 */
	public void send(String content) {
		if (!properties.configured()) {
			log.debug("Discord Webhook URL 이 설정되지 않아 관리자 알림을 건너뜁니다 (정상 동작)");
			return;
		}

		for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				restClient.post()
						.uri(properties.webhookUrl())
						.contentType(MediaType.APPLICATION_JSON)
						.body(Map.of("content", content))
						.retrieve()
						.toBodilessEntity();
				return;
			}
			catch (RestClientException cause) {
				// URL 자체가 시크릿이므로 로그에 남기지 않는다 (C-4).
				log.warn("관리자 Discord 알림 발송 실패 ({}/{})", attempt, MAX_ATTEMPTS, cause);
			}
		}
	}
}
