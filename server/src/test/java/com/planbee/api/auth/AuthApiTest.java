package com.planbee.api.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.planbee.api.support.PostgresTestContainer;
import com.planbee.api.support.TestClockConfig;

/**
 * auth API 통합 테스트. 실제 PostgreSQL(Testcontainers) + 실제 HTTP 요청으로 검증한다
 * (`AGENTS.md` 테스트 계층 규칙 / `server.md` S-9).
 *
 * <p><b>왜 슬라이스가 아니라 전체 컨텍스트인가.</b> 이 기능에서 가장 중요한 검증 두 가지가
 * 실행하지 않으면 드러나지 않는다 — ① 재사용 감지의 전 기기 폐기가 401 예외에 롤백되지 않고
 * <b>DB 에 남는지</b>(`defects.md` D-3, `server.md` S-17 의 `REQUIRES_NEW`),
 * ② 필터 체인에서 나는 401/403 의 응답 형식. 둘 다 실제 트랜잭션 경계와 실제 요청이 필요하다.
 *
 * <p>{@code support-contact-email} 을 채운 상태로 띄운다 — 이 값이 비어 있는 경우(AC-43·AC-44)는
 * {@code AuthSupportContactUnavailableApiTest} 가 별도 컨텍스트로 검증한다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "planbee.auth.support-contact-email=support@planbee.app")
@Import({ PostgresTestContainer.class, TestClockConfig.class })
@Tag("integration")
public @interface AuthApiTest {
}
