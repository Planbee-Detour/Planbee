package com.planbee.api.admin;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.planbee.api.admin.dto.PendingUserRow;
import com.planbee.api.admin.dto.ProcessedUserRow;
import com.planbee.api.auth.QUser;
import com.planbee.api.auth.UserStatus;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.DateTimePath;
import com.querydsl.core.types.dsl.NumberPath;
import com.querydsl.jpa.impl.JPAQueryFactory;

/**
 * 관리자 목록 조회. <b>커서 조건이 요청마다 붙었다 떨어졌다 하므로 QueryDSL 이다</b> (S-23) —
 * 첫 페이지에는 조건이 없고 다음 페이지부터 (정렬 키, 식별자) 비교가 붙는다.
 * 메서드 이름으로 표현되는 조회가 아니고, 화면이 쓰는 컬럼만 프로젝션으로 받는다 (S-26).
 *
 * <p>단건 조회는 여기 두지 않는다 — auth 의 {@code UserRepository.findById} 로 충분하다.
 * 단순 조회를 QueryDSL 로 다시 쓰지 않는다 (S-23).
 *
 * <p><b>{@code limit} 은 호출부가 "페이지 크기 + 1" 로 넘긴다.</b> 한 건 더 읽어 보는 것이
 * {@code has_next} 를 아는 가장 싼 방법이다 — 전체 개수를 세는 쿼리를 한 번 더 내지 않는다.
 */
@Repository
public class AdminUserRepository {

	private static final QUser USER = QUser.user;

	private final JPAQueryFactory queryFactory;

	public AdminUserRepository(JPAQueryFactory queryFactory) {
		this.queryFactory = queryFactory;
	}

	/**
	 * 검토 대기 목록. 정렬은 {@code created_at}(= 신청 시각) 내림차순이고 동률은 식별자
	 * 내림차순으로 깬다. 동률 깨기가 없으면 같은 초에 들어온 두 신청의 순서가 요청마다 달라져
	 * 커서가 항목을 건너뛰거나 중복시킨다.
	 */
	public List<PendingUserRow> findPendingPage(UserCursor cursor, int limit) {
		return queryFactory
				.select(Projections.constructor(PendingUserRow.class,
						USER.id, USER.email, USER.signupReason, USER.createdAt))
				.from(USER)
				.where(USER.status.eq(UserStatus.PENDING), after(USER.createdAt, USER.id, cursor))
				.orderBy(USER.createdAt.desc(), USER.id.desc())
				.limit(limit)
				.fetch();
	}

	/**
	 * 처리 완료 목록. {@code APPROVED} · {@code SUSPENDED} · {@code REJECTED} 가 한 목록에
	 * 섞이므로 상태로 거르지 않고 <b>"대기가 아닌 것"</b> 으로 뽑는다. 상태 필터 파라미터도 두지
	 * 않는다 — 화면이 세 상태를 한 번에 보여준다.
	 *
	 * <p>관리자 자기 계정도 숨기지 않는다. 숨기면 관리자가 자기 상태를 확인할 수 없다.
	 */
	public List<ProcessedUserRow> findProcessedPage(UserCursor cursor, int limit) {
		return queryFactory
				.select(Projections.constructor(ProcessedUserRow.class,
						USER.id, USER.email, USER.status, USER.processedAt,
						USER.approvedAt, USER.suspendedAt, USER.rejectedAt))
				.from(USER)
				.where(USER.status.ne(UserStatus.PENDING), after(USER.processedAt, USER.id, cursor))
				.orderBy(USER.processedAt.desc(), USER.id.desc())
				.limit(limit)
				.fetch();
	}

	/**
	 * 커서 이후의 항목 조건. 첫 페이지는 커서가 없으므로 {@code null} 을 돌려준다 —
	 * {@code where} 는 {@code null} 인자를 무시하므로 {@code BooleanBuilder} 에 {@code if} 를
	 * 쌓지 않는다 (S-23).
	 *
	 * <p>정렬이 (키 DESC, id DESC) 이므로 "이후" 는 키가 더 작거나, 키가 같고 식별자가 더 작은
	 * 항목이다. 두 조건을 한 식으로 붙여야 경계에서 항목이 새거나 겹치지 않는다.
	 */
	private BooleanExpression after(DateTimePath<Instant> sortKey, NumberPath<Long> id, UserCursor cursor) {
		if (cursor == null) {
			return null;
		}
		return sortKey.lt(cursor.sortKey())
				.or(sortKey.eq(cursor.sortKey()).and(id.lt(cursor.userId())));
	}
}
