package com.planbee.api.admin.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 검토 대기 목록 한 페이지 (AC-5 · AC-6 · AC-7).
 *
 * <p>이 프로젝트의 <b>첫 목록 계약</b>이 정한 봉투 형태다 — {@code items} · {@code has_next} ·
 * {@code next_cursor} 에 그 화면이 필요로 하는 집계값을 더한다. 이후 기능이 이 형태를 따른다.
 *
 * @param items               {@code requested_at} 내림차순, 동률은 {@code user_id} 내림차순.
 *                            <b>빈 배열이 정상이다</b> (AC-6) — 오류가 아니다.
 *                            "몇 건을 더 불러왔는가" 는 이 배열의 길이이고 별도 필드를 두지 않는다
 * @param hasNext             다음 페이지가 있는가. 앱이 {@code items.length == page_size} 로
 *                            추측하지 않게 하기 위해 내린다 — 마지막 페이지가 정확히 20건이면
 *                            그 추측이 틀린다. {@code nextCursor} 의 존재 여부와 항상 일치한다
 * @param nextCursor          다음 페이지 커서. 마지막 페이지면 {@code null}
 * @param pendingApprovalCount 검토 대기 <b>전체</b> 건수 (AC-32). {@code items} 의 길이가 아니다
 */
@Schema(type = "object", description = "검토 대기 목록 한 페이지")
public record PendingUserPage(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PendingUserItem> items,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "true") boolean hasNext,
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				maxLength = 512) String nextCursor,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0",
				example = "25") int pendingApprovalCount) {
}
