package com.planbee.api.common;

import jakarta.persistence.EntityManager;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.querydsl.jpa.impl.JPAQueryFactory;

/**
 * QueryDSL 진입점. 타입 안전한 동적 쿼리를 작성할 때 이 팩토리를 주입받는다. (server.md S-23)
 *
 * <p>단순 조회는 Spring Data JPA 메서드로 충분하다. 동적 조건, 다중 조인, 프로젝션처럼
 * 메서드 이름이나 {@code @Query} 로 표현하기 어려운 조회에만 쓴다.
 *
 * <p>주입받는 {@link EntityManager} 는 Spring 이 제공하는 공유 프록시이므로,
 * 실제 영속성 컨텍스트는 호출 시점의 트랜잭션(서비스 경계, S-6)에 바인딩된다.
 * 따라서 이 빈은 싱글턴이어도 안전하다.
 */
@Configuration
public class QuerydslConfig {

	@Bean
	JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
		return new JPAQueryFactory(entityManager);
	}
}
