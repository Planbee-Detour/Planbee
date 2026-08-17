package com.planbee.api.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * 구현이 만들어내는 스펙을 계약(docs/api/openapi.yaml)과 같은 형태로 맞춘다.
 * 여기가 어긋나면 `make contract-check` 가 실패한다 — 그게 이 설정의 목적이다.
 */
@Configuration
public class OpenApiConfig {

	static final String BEARER_SCHEME = "bearerAuth";

	@Bean
	OpenAPI planbeeOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Planbee API")
						.version("0.1.0")
						.description("Planbee 서비스 API"))
				.components(new Components()
						.addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")))
				// 기본은 인증 필요. 공개 엔드포인트는 @SecurityRequirements 로 예외를 명시한다.
				.addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
	}
}
