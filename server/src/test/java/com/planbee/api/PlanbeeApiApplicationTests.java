package com.planbee.api;

import org.junit.jupiter.api.Test;

import com.planbee.api.support.IntegrationTest;

/**
 * 전체 컨텍스트가 뜨는지 확인한다. DataSource 와 Flyway 마이그레이션까지 실제로 검증되므로
 * Docker 가 필요하다 (`make test-server-db`).
 */
@IntegrationTest
class PlanbeeApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
