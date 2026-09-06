package com.planbee.api.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.core.jackson.ModelResolver;
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

	/**
	 * 스펙의 프로퍼티 이름을 <b>실제 응답과 같은 표기</b>로 생성한다. (common.md C-7 / server.md S-21)
	 *
	 * <p>springdoc 은 기본적으로 <b>자기 ObjectMapper</b> 로 모델을 해석한다. 그래서
	 * {@code spring.jackson.property-naming-strategy=SNAKE_CASE} 를 켜도 런타임 JSON 만
	 * {@code refresh_token} 이 되고 생성된 스펙은 {@code refreshToken} 으로 남는다.
	 *
	 * <p>그 상태로는 {@code make contract-check} 가 <b>구현이 계약을 어겼다고 보고한다</b> —
	 * 실제로는 응답이 계약대로인데도 그렇다. 게이트가 거짓 실패를 내면 다음 사람이
	 * 멀쩡한 구현을 고치게 되므로(C-5 가 "구현을 고친다" 라고 말하기 때문에), 여기서
	 * Spring 이 구성한 ObjectMapper 를 넘겨 두 표기를 한 곳에 묶는다.
	 */
	@Bean
	ModelResolver modelResolver(ObjectMapper objectMapper) {
		// openapi31(true) 를 빠뜨리면 3.1 전용 표현이 전부 떨어진다 —
		// nullable 의 타입 배열(`types = {"string", "null"}`)과 객체의 `type` 이 사라져
		// 계약과 대조되지 않는다. 이 계약은 3.1 이므로 반드시 켠다
		// (`springdoc.api-docs.version` 과 같은 값이어야 한다).
		return new ModelResolver(objectMapper).openapi31(true);
	}

	@Bean
	OpenAPI planbeeOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Planbee API")
						.version("0.2.0")
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
