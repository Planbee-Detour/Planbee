package com.planbee.api.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * 운영의 {@code ClockConfig.clock()}({@code Clock.systemUTC()}) 대신 테스트가 움직일 수 있는
 * 시계를 주입한다.
 *
 * <p>빈을 덮어쓰지 않고 {@code @Primary} 로 우선순위만 올린다 — Spring Boot 는 기본적으로
 * 빈 정의 덮어쓰기를 막는데, 그 설정을 테스트에서 켜면 이름이 겹치는 다른 빈까지 조용히
 * 바뀔 수 있다. {@link MutableClock} 이 {@code Clock} 이므로 서비스는 이 빈을 주입받고,
 * 테스트는 같은 인스턴스를 {@code MutableClock} 타입으로 받아 시각을 움직인다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestClockConfig {

	@Bean
	@Primary
	MutableClock mutableClock() {
		return MutableClock.startingNow();
	}
}
