package com.planbee.api.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * {@code @Scheduled} 주기 작업을 켠다. 규칙은 {@code server.md} S-35.
 *
 * <p>현재 작업: {@code auth.RejectedAccountPurgeService} (거절 계정 보유 기간 경과 시 파기).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
