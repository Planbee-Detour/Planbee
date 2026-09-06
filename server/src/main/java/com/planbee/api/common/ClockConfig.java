package com.planbee.api.common;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 서비스가 시각을 직접 읽지 않고 주입받게 한다 (server.md S-8).
 * {@code ArchitectureTest.servicesMustNotReadTheClockDirectly} 가 이를 기계로 강제한다.
 *
 * <p>UTC 로 고정하는 이유: 저장·연산은 전부 UTC 이고(common.md C-2), 시스템 기본 시간대에
 * 의존하면 서버가 놓인 환경에 따라 잠금 시간이나 토큰 만료가 달라진다.
 */
@Configuration
public class ClockConfig {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}
}
