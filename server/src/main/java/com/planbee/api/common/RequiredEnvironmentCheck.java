package com.planbee.api.common;

import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

/**
 * 필수 환경 변수가 없으면 기동 직전에 명확한 메시지와 함께 멈춘다.
 *
 * <p>이게 없으면 미해석 플레이스홀더가 그대로 흘러가 {@code 'url' must start with "jdbc"} 같은
 * 원인을 알 수 없는 오류로 나타난다. 실패 자체보다 실패 메시지가 문제였다.
 *
 * <p>등록: {@code META-INF/spring.factories}
 * (EnvironmentPostProcessor 는 자동 구성과 달리 {@code .imports} 파일이 아니라 spring.factories 로 로드된다)
 */
public class RequiredEnvironmentCheck implements EnvironmentPostProcessor, Ordered {

	/** 값은 반드시 환경 변수로 주입한다. 정의는 .env.example 참조. (common.md C-4) */
	private static final List<String> REQUIRED = List.of(
			"DB_URL",
			"DB_USERNAME",
			"DB_PASSWORD",
			"JWT_SECRET");

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		List<String> missing = REQUIRED.stream()
				.filter(name -> !StringUtils.hasText(environment.getProperty(name)))
				.toList();

		if (!missing.isEmpty()) {
			throw new IllegalStateException("""

					필수 환경 변수가 없습니다: %s

					  로컬 개발  : `make env` 로 .env 를 만들고 값을 채운 뒤 `npm run server:start` 로 실행하세요.
					  배포 환경  : 시크릿 저장소에서 주입하세요.
					  정의 목록  : .env.example (실제 값은 .env 에 두며 git 에 커밋하지 않습니다)
					""".formatted(String.join(", ", missing)));
		}
	}

	@Override
	public int getOrder() {
		// 설정 파일(application.properties)까지 모두 로드된 뒤에 검사한다.
		return Ordered.LOWEST_PRECEDENCE;
	}
}
