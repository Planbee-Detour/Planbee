package com.planbee.api.health;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 응답은 반드시 타입이 있는 record 로 반환한다. Map 을 그대로 돌려주면
 * springdoc 이 스키마를 생성하지 못해 계약 검증(`make contract-check`)이 무의미해진다. (server.md S-4)
 *
 * <p>필드의 필수 여부를 명시한다. 이게 없으면 생성 스펙에서 모든 필드가 선택이 되어
 * 모바일이 불필요한 널 체크를 하거나, 반대로 널을 못 다뤄 크래시가 난다. (server.md S-19)
 */
public record HealthResponse(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "planbee-api") String service,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "UP") String status,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant timestamp) {
}
