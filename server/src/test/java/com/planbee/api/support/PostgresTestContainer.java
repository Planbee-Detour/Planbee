package com.planbee.api.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 실제 PostgreSQL 컨테이너를 띄운다. 인메모리 DB로 대체하지 않는다. (server.md S-9)
 * 이미지 태그는 docker-compose.yml 의 운영/로컬 이미지와 동일하게 유지한다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestContainer {

	@Bean
	@ServiceConnection
	PostgreSQLContainer<?> postgresContainer() {
		return new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));
	}
}
