package com.planbee.api.common;

import java.time.Clock;
import java.time.Duration;
import java.time.temporal.ChronoUnit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 서비스가 시각을 직접 읽지 않고 주입받게 한다 (server.md S-8).
 * {@code ArchitectureTest.servicesMustNotReadTheClockDirectly} 가 이를 기계로 강제한다.
 *
 * <p>UTC 로 고정하는 이유: 저장·연산은 전부 UTC 이고(common.md C-2), 시스템 기본 시간대에
 * 의존하면 서버가 놓인 환경에 따라 잠금 시간이나 토큰 만료가 달라진다.
 *
 * <p><b>마이크로초로 자르는 이유</b>: 시각 컬럼은 전부 {@code TIMESTAMP(6)}(마이크로초)다.
 * 응답에 담은 뒤 저장했다가 다시 읽으면 그 사이 정밀도가 깎여, 같은 순간을 가리키는 두 응답의
 * 문자열이 달라진다 (Linux 는 나노초까지 준다 — 가입 응답의 {@code applied_at} 과 이후 조회의
 * {@code applied_at} 이 어긋난다, auth AC-46). 시계를 컬럼 해상도에 맞추면 그 왕복이 무손실이다.
 */
@Configuration
public class ClockConfig {

	@Bean
	Clock clock() {
		return Clock.tick(Clock.systemUTC(), Duration.of(1, ChronoUnit.MICROS));
	}
}
