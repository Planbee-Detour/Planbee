package com.planbee.api.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * 실제 DB가 필요한 테스트에 붙인다. Docker 가 필요하므로 기본 `test` 태스크에서 제외되고
 * `integrationTest` 태스크(= `make test-server-db`)로만 실행된다.
 *
 * 화면 동작이나 앱↔서버 연동은 여기서 다루지 않는다. (AGENTS.md 테스트 계층 규칙)
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(PostgresTestContainer.class)
@Tag("integration")
public @interface IntegrationTest {
}
