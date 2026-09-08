package com.planbee.api.common;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * {@code @Cacheable} 을 켠다. 구현체는 Spring Boot 가 {@code spring.cache.type=caffeine} +
 * classpath 의 Caffeine 으로 자동 구성하고, 정책은 {@code spring.cache.caffeine.spec} 이 정한다.
 *
 * <p>현재 사용처: {@code place} 도메인이 TourAPI 응답을 캐시해 외부 쿼터를 아낀다.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
