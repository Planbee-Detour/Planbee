package com.planbee.api.contract;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;

import com.planbee.api.support.IntegrationTest;

/**
 * 실행 중인 애플리케이션에서 OpenAPI 스펙을 추출해 build/openapi.json 에 기록한다.
 * `make contract-export` 가 이 테스트를 돌린다.
 *
 * 이 파일은 계약의 *원본이 아니다*. 원본은 tech-lead 가 작성하는 docs/api/openapi.yaml 이며,
 * 여기서 뽑은 결과는 구현이 계약을 벗어나지 않았는지 대조하는 용도로만 쓴다. (AGENTS.md 절대규칙 1)
 */
@IntegrationTest
class OpenApiExportTest {

	private static final Path OUTPUT = Path.of("build", "openapi.json");

	@Autowired
	private TestRestTemplate restTemplate;

	@Test
	void exportsOpenApiSpecification() throws IOException {
		String specification = restTemplate.getForObject("/v3/api-docs", String.class);

		assertThat(specification).as("springdoc 이 스펙을 노출해야 한다").contains("\"openapi\"");

		Files.createDirectories(OUTPUT.getParent());
		Files.writeString(OUTPUT, specification);
	}
}
