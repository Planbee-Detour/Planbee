package com.planbee.api.common;

import java.util.List;
import java.util.stream.Stream;

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

	/** 프로필과 무관하게 항상 필요한 변수. 정의는 .env.example 참조. (common.md C-4) */
	private static final List<String> ALWAYS_REQUIRED = List.of(
			"JWT_SECRET",
			"TOUR_API_KEY");

	/** 로컬·기본·e2e 프로필이 읽는 DB 변수. */
	private static final List<String> LOCAL_DB = List.of(
			"DB_URL",
			"DB_USERNAME",
			"DB_PASSWORD");

	/**
	 * 배포(prod) 프로필이 읽는 DB 변수.
	 *
	 * <p>이름을 로컬과 갈라 두는 것이 이 설계의 핵심이다. 같은 이름을 쓰면 프로필을 잘못
	 * 지정한 실행이 배포 DB 에 조용히 붙는다 — Flyway 가 스키마 소유자이므로 그 사고는
	 * 마이그레이션 실행까지 간다.
	 */
	private static final List<String> PROD_DB = List.of(
			"PRD_DB_URL",
			"PRD_DB_USERNAME",
			"PRD_DB_PASSWORD");

	private static final String PROD_PROFILE = "prod";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		boolean prod = List.of(environment.getActiveProfiles()).contains(PROD_PROFILE);

		List<String> required = Stream
				.concat(ALWAYS_REQUIRED.stream(), (prod ? PROD_DB : LOCAL_DB).stream())
				.toList();

		List<String> missing = required.stream()
				.filter(name -> !StringUtils.hasText(environment.getProperty(name)))
				.toList();

		if (!missing.isEmpty()) {
			throw new IllegalStateException("""

					필수 환경 변수가 없습니다: %s

					  활성 프로필: %s
					  로컬 개발  : `make env` 로 .env 를 만들고 값을 채운 뒤 `npm run server:start` 로 실행하세요.
					  배포 환경  : 시크릿 저장소에서 주입하세요. prod 프로필은 DB_* 가 아니라 PRD_DB_* 를 읽습니다.
					  정의 목록  : .env.example (실제 값은 .env 에 두며 git 에 커밋하지 않습니다)
					""".formatted(String.join(", ", missing), prod ? PROD_PROFILE : "local/default"));
		}
	}

	@Override
	public int getOrder() {
		// 설정 파일(application.properties)까지 모두 로드된 뒤에 검사한다.
		return Ordered.LOWEST_PRECEDENCE;
	}
}
