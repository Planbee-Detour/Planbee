package com.planbee.api.admin.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 처리 완료 목록 한 페이지 (AC-19 · AC-20 · AC-21 · AC-24).
 *
 * @param items               {@code processed_at} 내림차순, 동률은 {@code user_id} 내림차순.
 *                            세 상태가 섞여 있다. <b>빈 배열이 정상이다</b>
 * @param pendingApprovalCount <b>이 목록의 건수가 아니라 검토 대기 건수다.</b>
 *                            처리 완료를 보는 동안에도 화면 위쪽의 "검토 대기 N" 라벨이
 *                            살아 있어야 하기 때문이다 (design.md §5.2)
 */
@Schema(type = "object", description = "처리 완료 목록 한 페이지")
public record ProcessedUserPage(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<ProcessedUserItem> items,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "false") boolean hasNext,
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				maxLength = 512) String nextCursor,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0",
				example = "3") int pendingApprovalCount) {
}
