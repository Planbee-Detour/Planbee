package com.planbee.api.admin;

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
 * admin-user-approval 통합 테스트. 실제 PostgreSQL(Testcontainers) + 실제 HTTP 요청으로 검증한다
 * (`AGENTS.md` 테스트 계층 규칙 / `server.md` S-9).
 *
 * <p><b>왜 슬라이스가 아니라 전체 컨텍스트인가.</b> 이 기능의 판정 절반이 컨트롤러 밖에 있다 —
 * 역할 인가(`ROLE_ADMIN`)와 그 403 의 코드는 <b>필터 체인</b>에서 나가고
 * ({@code SecurityConfig} · {@code AdminForbiddenCodeResolver}), 커서 페이지네이션의 정렬과
 * 동률 깨기는 <b>실제 DB 의 정렬</b>이며, 상태와 {@code processed_at} 의 불변식은 실제
 * 트랜잭션이 커밋된 뒤에야 관측된다. 셋 다 목킹하면 사라진다.
 *
 * <p><b>설정은 {@code AuthApiTest} 와 같은 값으로 둔다.</b> 스프링 테스트 컨텍스트 캐시의 키는
 * 애노테이션이 아니라 병합된 설정(프로퍼티 · 임포트 · 웹 환경)이라, 같게 두면 auth 통합
 * 테스트와 컨텍스트를 공유해 컨테이너를 한 번만 띄운다.
 *
 * <p><b>Discord Webhook URL 은 여기서 설정하지 않는다.</b> 미설정이 정상 동작이고(AC-29)
 * 발송 경로는 {@code AdminDiscordNotificationApiTest} 가 WireMock 으로 따로 본다.
 * 이 컨텍스트에서 실제 외부로 나가는 요청은 없다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "planbee.auth.support-contact-email=support@planbee.app")
@Import({ PostgresTestContainer.class, TestClockConfig.class })
@Tag("integration")
public @interface AdminApiTest {
}
