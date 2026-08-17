package com.planbee.api.health;

import java.time.Instant;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "health")
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

	@Operation(operationId = "getHealth", summary = "서비스 상태 확인")
	@ApiResponse(responseCode = "200", description = "정상")
	@SecurityRequirements // 인증 없이 접근 가능한 경로임을 스펙에 명시한다 (SecurityConfig.PUBLIC_PATHS 와 일치)
	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
	public HealthResponse health() {
		return new HealthResponse("planbee-api", "UP", Instant.now());
	}
}
