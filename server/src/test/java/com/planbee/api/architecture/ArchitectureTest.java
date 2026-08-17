package com.planbee.api.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

/**
 * docs/conventions/server.md 의 구조 규칙을 기계로 강제한다.
 * 여기서 잡히는 항목은 `[LINT]` 등급이므로 server-reviewer 가 리뷰 리포트에 적지 않는다.
 */
@AnalyzeClasses(packages = "com.planbee.api", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	@ArchTest
	static final ArchRule controllersMustNotUseRepositoriesDirectly = noClasses()
			.that().haveSimpleNameEndingWith("Controller")
			.should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
			.because("S-3: Controller -> Service -> Repository 순서를 건너뛸 수 없다");

	@ArchTest
	static final ArchRule repositoriesMustNotDependOnUpperLayers = noClasses()
			.that().haveSimpleNameEndingWith("Repository")
			.should().dependOnClassesThat().haveSimpleNameEndingWith("Service")
			.orShould().dependOnClassesThat().haveSimpleNameEndingWith("Controller")
			.because("S-3: 레이어 의존 방향은 단방향이다");

	@ArchTest
	static final ArchRule servicesMustNotDependOnControllers = noClasses()
			.that().haveSimpleNameEndingWith("Service")
			.should().dependOnClassesThat().haveSimpleNameEndingWith("Controller")
			.because("S-3: 레이어 의존 방향은 단방향이다");

	@ArchTest
	static final ArchRule servicesMustNotReadTheClockDirectly = noClasses()
			.that().haveSimpleNameEndingWith("Service")
			.should().callMethod(Instant.class, "now")
			.orShould().callMethod(LocalDateTime.class, "now")
			.orShould().callMethod(LocalDate.class, "now")
			.because("S-8: 시각은 Clock 으로 주입받는다 (테스트 불가 코드 방지)");

	@ArchTest
	static final ArchRule noFieldInjection = noFields()
			.should().beAnnotatedWith(Autowired.class)
			.because("S-15: 생성자 주입만 사용한다");

	@ArchTest
	static final ArchRule domainsAreFreeOfCycles = SlicesRuleDefinition.slices()
			.matching("com.planbee.api.(*)..")
			.should().beFreeOfCycles()
			.because("S-2: 도메인 패키지 간 순환 의존을 만들지 않는다");
}
