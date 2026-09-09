package com.planbee.api.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * {@code @Async} 를 켠다. 실행기는 Spring Boot 가 자동 구성하는
 * {@code applicationTaskExecutor} 를 그대로 쓴다.
 *
 * <p>지금 쓰는 곳은 관리자 Discord 알림 하나다 (admin-user-approval AC-27 · AC-28). 요청 스레드에서
 * 외부 HTTP 를 부르면 Discord 가 느릴 때 가입 응답이 그만큼 늦어지고, 실패가 응답에 섞인다.
 *
 * <p><b>비동기로 옮긴 작업은 요청의 트랜잭션·보안 컨텍스트를 물려받지 않는다.</b> 다른 스레드에서
 * 도는 코드는 필요한 것을 스스로 열어야 한다 — 여기 붙는 작업을 늘릴 때 확인할 점이다.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
